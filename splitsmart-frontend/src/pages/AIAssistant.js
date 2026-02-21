import React, { useState, useRef, useEffect, useCallback } from 'react';
import { groupAPI, expenseAPI } from '../services/api';
import toast from 'react-hot-toast';

// ─── OCR: parse text from receipt image via Tesseract (loaded from CDN) ───────
function loadTesseract() {
  return new Promise((resolve) => {
    if (window.Tesseract) { resolve(window.Tesseract); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = () => resolve(window.Tesseract);
    document.head.appendChild(s);
  });
}

// Parse OCR text → extract items + amounts
function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  let total = 0;

  const amountRe = /(?:rs\.?|₹|inr)?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i;

  lines.forEach(line => {
    const m = line.match(amountRe);
    if (!m) return;
    const amount = parseFloat(m[1].replace(',',''));
    if (isNaN(amount) || amount <= 0 || amount > 99999) return;
    const name = line.replace(m[0],'').replace(/[^\w\s]/g,'').trim();
    if (name.length < 2) return;
    const lower = name.toLowerCase();
    // skip totals/tax lines
    if (['total','subtotal','tax','gst','cgst','sgst','discount','tip','service'].some(k => lower.includes(k))) {
      if (lower.includes('total') || lower.includes('subtotal')) total = Math.max(total, amount);
      return;
    }
    items.push({ name, amount });
  });

  // fallback: if no items, just grab the biggest number as total
  if (items.length === 0) {
    const nums = [...text.matchAll(/(\d{2,6}(?:\.\d{1,2})?)/g)]
      .map(m => parseFloat(m[1]))
      .filter(n => n > 10 && n < 100000);
    if (nums.length) total = Math.max(...nums);
  }

  return { items, total: total || items.reduce((s,i)=>s+i.amount,0) };
}

// ─── Voice: speech recognition ────────────────────────────────────────────────
function getVoiceRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

// Parse voice command → action
function parseVoiceCommand(transcript) {
  const t = transcript.toLowerCase();

  // "add expense [amount] for [description] in [group]"
  const addRe = /add (?:expense|bill|payment)(?:\s+of)?\s+(?:rs\.?|₹)?(\d+(?:\.\d{1,2})?)\s+(?:for|on)?\s+(.+?)(?:\s+in\s+(.+))?$/i;
  const m = t.match(addRe);
  if (m) return { action:'add_expense', amount:parseFloat(m[1]), description:m[2].trim(), group:m[3]?.trim() };

  // "show groups" / "open groups"
  if (/(show|open|go to) groups?/.test(t)) return { action:'navigate', page:'/groups' };
  if (/(show|open|go to) (settlements?|payments?)/.test(t)) return { action:'navigate', page:'/settlements' };
  if (/(show|open|go to) dashboard/.test(t)) return { action:'navigate', page:'/dashboard' };

  // "how much do I owe"
  if (/(how much|amount|balance|owe)/.test(t)) return { action:'balance_query' };

  return { action:'unknown', transcript };
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AIAssistant() {
  const [mode, setMode]             = useState('home'); // home | ocr | voice | insights
  const [groups, setGroups]         = useState([]);

  // OCR state
  const [ocrImage, setOcrImage]     = useState(null);
  const [ocrImageURL, setOcrImgURL] = useState(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrProgress, setOcrProg]   = useState(0);
  const [ocrResult, setOcrResult]   = useState(null);
  const [ocrExpForm, setOcrExpForm] = useState({ groupId:'', splitType:'EQUAL' });
  const cameraRef   = useRef(null);
  const fileRef     = useRef(null);
  const streamRef   = useRef(null);
  const [cameraOn, setCameraOn]     = useState(false);

  // Voice state
  const [voiceListening, setVoiceListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [voiceResult, setVoiceResult]       = useState(null);
  const [voiceHistory, setVoiceHistory]     = useState([]);
  const recognitionRef = useRef(null);

  // Insights state
  const [insights, setInsights]     = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    groupAPI.getAll().then(d => setGroups(Array.isArray(d) ? d : [])).catch(()=>{});
    return () => stopCamera();
  }, []);

  // ── OCR ──────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ facingMode:'environment' } });
      streamRef.current = stream;
      if (cameraRef.current) cameraRef.current.srcObject = stream;
      setCameraOn(true);
    } catch {
      toast.error('Camera access denied. Please allow camera or upload an image.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    setCameraOn(false);
  };

  const capturePhoto = () => {
    if (!cameraRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width  = cameraRef.current.videoWidth;
    canvas.height = cameraRef.current.videoHeight;
    canvas.getContext('2d').drawImage(cameraRef.current, 0, 0);
    canvas.toBlob(blob => {
      setOcrImage(blob);
      setOcrImgURL(URL.createObjectURL(blob));
      stopCamera();
      runOCR(blob);
    }, 'image/jpeg', 0.9);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setOcrImage(file);
    setOcrImgURL(URL.createObjectURL(file));
    runOCR(file);
  };

  const runOCR = async (imgBlob) => {
    setOcrLoading(true);
    setOcrResult(null);
    setOcrProg(0);
    try {
      const Tesseract = await loadTesseract();
      const { data: { text } } = await Tesseract.recognize(imgBlob, 'eng', {
        logger: m => { if (m.status === 'recognizing text') setOcrProg(Math.round(m.progress*100)); }
      });
      const parsed = parseReceiptText(text);
      setOcrResult({ text, ...parsed });
    } catch (err) {
      toast.error('OCR failed. Try a clearer image.');
      console.error(err);
    } finally { setOcrLoading(false); }
  };

  const submitOCRExpense = async () => {
    if (!ocrResult || !ocrExpForm.groupId) { toast.error('Select a group'); return; }
    try {
      const groupMembers = await groupAPI.getMembers(ocrExpForm.groupId);
      await expenseAPI.create({
        description: ocrResult.items.length > 0
          ? ocrResult.items.map(i=>i.name).join(', ').slice(0,100)
          : 'Receipt expense',
        amount: ocrResult.total,
        groupId: parseInt(ocrExpForm.groupId),
        splitType: ocrExpForm.splitType,
        category: 'FOOD',
        participantIds: (Array.isArray(groupMembers) ? groupMembers : []).map(m=>m.id),
      });
      toast.success(`₹${ocrResult.total} expense added! 🎉`);
      setOcrResult(null);
      setOcrImgURL(null);
      setMode('home');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add expense');
    }
  };

  // ── Voice ─────────────────────────────────────────────────────────────────
  const startVoice = useCallback(() => {
    const SR = getVoiceRecognition();
    if (!SR) { toast.error('Voice recognition not supported in this browser. Use Chrome.'); return; }
    const recognition = new SR();
    recognition.lang           = 'en-IN';
    recognition.interimResults = true;
    recognition.continuous     = false;

    recognition.onstart  = () => { setVoiceListening(true); setVoiceTranscript(''); setVoiceResult(null); };
    recognition.onend    = () => setVoiceListening(false);
    recognition.onerror  = (e) => { toast.error('Voice error: ' + e.error); setVoiceListening(false); };

    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(r => r[0].transcript).join('');
      setVoiceTranscript(transcript);

      if (event.results[event.results.length-1].isFinal) {
        const parsed = parseVoiceCommand(transcript);
        setVoiceResult(parsed);
        setVoiceHistory(h => [{ transcript, parsed, time: new Date() }, ...h.slice(0,9)]);
        handleVoiceAction(parsed);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [groups]);

  const stopVoice = () => {
    recognitionRef.current?.stop();
    setVoiceListening(false);
  };

  const handleVoiceAction = async (parsed) => {
    if (parsed.action === 'add_expense') {
      // Find group by name if specified
      let groupId = groups[0]?.id;
      if (parsed.group && groups.length > 0) {
        const match = groups.find(g => g.name.toLowerCase().includes(parsed.group.toLowerCase()));
        if (match) groupId = match.id;
      }
      if (!groupId) { toast.error('No group found. Create a group first.'); return; }
      try {
        const members = await groupAPI.getMembers(groupId);
        await expenseAPI.create({
          description: parsed.description,
          amount: parsed.amount,
          groupId,
          splitType: 'EQUAL',
          category: 'GENERAL',
          participantIds: (Array.isArray(members)?members:[]).map(m=>m.id),
        });
        toast.success(`✓ Added ₹${parsed.amount} for "${parsed.description}"`);
      } catch { toast.error('Failed to add expense'); }
    } else if (parsed.action === 'navigate') {
      window.location.href = parsed.page;
    }
  };

  // ── AI Insights ───────────────────────────────────────────────────────────
  const loadInsights = async () => {
    setInsightsLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/ai/insights', {
        headers:{ Authorization:`Bearer ${localStorage.getItem('token')}` }
      });
      const json = await res.json();
      const data = json.data || json;
      setInsights(Array.isArray(data) ? data : mockInsights);
    } catch { setInsights(mockInsights); }
    finally { setInsightsLoading(false); }
  };

  useEffect(() => { if (mode === 'insights') loadInsights(); }, [mode]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>✦ AI Assistant</h1>
          <p style={S.subtitle}>Scan receipts, add expenses by voice, get smart insights</p>
        </div>
      </div>

      {/* Mode Selector */}
      <div style={S.modeGrid}>
        {MODES.map(m => (
          <button key={m.id} style={{...S.modeCard, ...(mode===m.id ? S.modeActive:{})}}
            onClick={() => { setMode(m.id); if(m.id!=='ocr') stopCamera(); }}>
            <div style={{...S.modeEmoji, ...(mode===m.id?{filter:'drop-shadow(0 0 8px var(--accent))'}:{})}}>{m.emoji}</div>
            <div style={S.modeLabel}>{m.label}</div>
            <div style={S.modeSub}>{m.sub}</div>
          </button>
        ))}
      </div>

      {/* ── HOME ── */}
      {mode === 'home' && (
        <div style={S.homeCards}>
          <div className="card" style={S.featureCard}>
            <div style={S.featureTop}>📷 <span style={S.featureTitle}>OCR Receipt Scanner</span></div>
            <p style={S.featureDesc}>Point your camera at any receipt or upload a photo. AI reads all items and amounts automatically.</p>
            <button className="btn btn-primary" onClick={() => setMode('ocr')}>Start Scanning →</button>
          </div>
          <div className="card" style={S.featureCard}>
            <div style={S.featureTop}>🎙️ <span style={S.featureTitle}>Voice Commands</span></div>
            <p style={S.featureDesc}>Say "Add expense ₹500 for dinner" and it's done instantly. Hands-free expense tracking.</p>
            <button className="btn btn-primary" onClick={() => setMode('voice')}>Try Voice →</button>
          </div>
          <div className="card" style={S.featureCard}>
            <div style={S.featureTop}>✦ <span style={S.featureTitle}>AI Spending Insights</span></div>
            <p style={S.featureDesc}>Smart analysis of your spending patterns, alerts, savings tips powered by AI.</p>
            <button className="btn btn-primary" onClick={() => setMode('insights')}>View Insights →</button>
          </div>
        </div>
      )}

      {/* ── OCR MODE ── */}
      {mode === 'ocr' && (
        <div style={S.ocrLayout}>
          <div className="card" style={S.ocrLeft}>
            <h3 style={S.cardTitle}>📷 Receipt Scanner</h3>
            <p style={S.cardSub}>Camera or upload — AI extracts all items & total</p>

            {!cameraOn && !ocrImageURL && (
              <div style={S.ocrActions}>
                <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'14px'}}
                  onClick={startCamera}>
                  📷 Open Camera
                </button>
                <div style={S.orDivider}>or</div>
                <button className="btn btn-ghost" style={{width:'100%', justifyContent:'center'}}
                  onClick={() => fileRef.current?.click()}>
                  🖼️ Upload Image
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFileUpload} />
              </div>
            )}

            {/* Live Camera */}
            {cameraOn && (
              <div style={S.cameraWrap}>
                <video ref={cameraRef} autoPlay playsInline muted style={S.cameraVideo} />
                <div style={S.cameraOverlay}>
                  <div style={S.scanFrame} />
                  <p style={S.scanHint}>Align receipt within the frame</p>
                </div>
                <div style={S.cameraBtns}>
                  <button className="btn btn-ghost" onClick={stopCamera}>✕ Cancel</button>
                  <button className="btn btn-primary" style={{padding:'12px 32px'}} onClick={capturePhoto}>
                    ● Capture
                  </button>
                </div>
              </div>
            )}

            {/* Preview */}
            {ocrImageURL && (
              <div style={{position:'relative'}}>
                <img src={ocrImageURL} alt="Receipt" style={S.previewImg} />
                <button style={S.retakeBtn} onClick={() => { setOcrImgURL(null); setOcrResult(null); }}>
                  ✕ Retake
                </button>
              </div>
            )}

            {/* OCR Progress */}
            {ocrLoading && (
              <div style={S.progressWrap}>
                <div style={S.progressLabel}>🔍 Reading receipt... {ocrProgress}%</div>
                <div style={S.progressBar}>
                  <div style={{...S.progressFill, width:`${ocrProgress}%`}} />
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div className="card" style={S.ocrRight}>
            <h3 style={S.cardTitle}>📋 Extracted Items</h3>
            {!ocrResult && !ocrLoading && (
              <div style={S.ocrEmpty}>
                <div style={{fontSize:40, marginBottom:12}}>🧾</div>
                <p style={{color:'var(--text-muted)', fontSize:14}}>Scan or upload a receipt to extract items</p>
              </div>
            )}
            {ocrLoading && (
              <div style={S.ocrEmpty}>
                <div style={{fontSize:32, animation:'pulse 1s infinite'}}>⚙️</div>
                <p style={{color:'var(--text-muted)', fontSize:14, marginTop:12}}>AI is reading your receipt...</p>
              </div>
            )}
            {ocrResult && !ocrLoading && (
              <div style={{display:'flex', flexDirection:'column', gap:16}}>
                {ocrResult.items.length > 0 ? (
                  <>
                    <div style={S.itemsList}>
                      {ocrResult.items.map((item, i) => (
                        <div key={i} style={S.itemRow}>
                          <span style={{color:'var(--text-secondary)'}}>{item.name}</span>
                          <span style={{fontWeight:600, color:'var(--text-primary)'}}>₹{item.amount.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                    <div style={S.totalRow}>
                      <span style={{fontWeight:700, color:'var(--text-primary)'}}>Total</span>
                      <span style={{fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'var(--accent-bright)'}}>
                        ₹{ocrResult.total.toLocaleString()}
                      </span>
                    </div>
                  </>
                ) : (
                  <div style={{...S.ocrEmpty, minHeight:'auto'}}>
                    <p style={{color:'var(--text-muted)', fontSize:14}}>
                      Could not extract line items. Total detected: <b style={{color:'var(--accent-bright)'}}>₹{ocrResult.total}</b>
                    </p>
                  </div>
                )}

                <div style={S.divider} />
                <h4 style={{fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:4}}>Add to Group</h4>
                <div className="input-group">
                  <label>Select Group *</label>
                  <select className="input" value={ocrExpForm.groupId}
                    onChange={e => setOcrExpForm({...ocrExpForm, groupId:e.target.value})}>
                    <option value="">-- Choose group --</option>
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label>Split Type</label>
                  <select className="input" value={ocrExpForm.splitType}
                    onChange={e => setOcrExpForm({...ocrExpForm, splitType:e.target.value})}>
                    <option value="EQUAL">EQUAL</option>
                    <option value="CUSTOM">CUSTOM</option>
                    <option value="PERCENTAGE">PERCENTAGE</option>
                  </select>
                </div>
                <button className="btn btn-primary" style={{width:'100%', justifyContent:'center', padding:'13px'}}
                  onClick={submitOCRExpense}>
                  ✓ Add ₹{ocrResult.total} to Group
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── VOICE MODE ── */}
      {mode === 'voice' && (
        <div style={S.voiceLayout}>
          <div className="card" style={S.voiceCard}>
            <h3 style={S.cardTitle}>🎙️ Voice Commands</h3>
            <p style={S.cardSub}>Speak naturally — AI understands Indian English</p>

            {/* Mic Button */}
            <div style={S.micWrap}>
              <div style={{position:'relative', display:'inline-block'}}>
                {voiceListening && <>
                  <div style={{...S.ripple, animationDelay:'0s'}} />
                  <div style={{...S.ripple, animationDelay:'0.4s'}} />
                </>}
                <button style={{...S.micBtn, ...(voiceListening ? S.micBtnActive:{})}}
                  onClick={voiceListening ? stopVoice : startVoice}>
                  🎙️
                </button>
              </div>
              <p style={S.micStatus}>
                {voiceListening ? '🔴 Listening...' : 'Tap to speak'}
              </p>
              {voiceTranscript && (
                <div style={S.transcript}>"{voiceTranscript}"</div>
              )}
              {voiceResult && voiceResult.action !== 'unknown' && (
                <div style={S.voiceAction}>
                  <div style={S.voiceActionLabel}>✓ Action detected</div>
                  <div style={{fontSize:14, color:'var(--text-secondary)'}}>
                    {voiceResult.action === 'add_expense' &&
                      `Adding ₹${voiceResult.amount} for "${voiceResult.description}"`}
                    {voiceResult.action === 'navigate' && `Navigating to ${voiceResult.page}`}
                    {voiceResult.action === 'balance_query' && 'Checking your balance...'}
                  </div>
                </div>
              )}
              {voiceResult && voiceResult.action === 'unknown' && (
                <div style={{...S.voiceAction, borderColor:'var(--warning)'}}>
                  <div style={{...S.voiceActionLabel, color:'var(--warning)'}}>⚠ Command not understood</div>
                  <div style={{fontSize:13, color:'var(--text-muted)'}}>Try: "Add expense 500 for lunch"</div>
                </div>
              )}
            </div>

            {/* Examples */}
            <div style={S.examplesWrap}>
              <div style={S.examplesTitle}>Try saying:</div>
              {VOICE_EXAMPLES.map((ex, i) => (
                <div key={i} style={S.exampleChip} onClick={() => {
                  setVoiceTranscript(ex);
                  const parsed = parseVoiceCommand(ex);
                  setVoiceResult(parsed);
                  handleVoiceAction(parsed);
                }}>
                  "{ex}"
                </div>
              ))}
            </div>
          </div>

          {/* History */}
          <div className="card" style={S.historyCard}>
            <h3 style={S.cardTitle}>History</h3>
            {voiceHistory.length === 0 ? (
              <div style={S.ocrEmpty}><p style={{color:'var(--text-muted)', fontSize:13}}>No commands yet</p></div>
            ) : voiceHistory.map((h, i) => (
              <div key={i} style={S.historyRow}>
                <div style={{fontSize:13, color:'var(--text-secondary)', marginBottom:2}}>"{h.transcript}"</div>
                <div style={{fontSize:12, color: h.parsed.action==='unknown'?'var(--warning)':'var(--success)'}}>
                  {h.parsed.action === 'add_expense' ? `✓ Added ₹${h.parsed.amount} for "${h.parsed.description}"` :
                   h.parsed.action === 'navigate'    ? `✓ Navigate ${h.parsed.page}` :
                   h.parsed.action === 'unknown'     ? '⚠ Not understood' : `✓ ${h.parsed.action}`}
                </div>
                <div style={{fontSize:11, color:'var(--text-muted)'}}>{h.time.toLocaleTimeString('en-IN')}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── INSIGHTS MODE ── */}
      {mode === 'insights' && (
        <div>
          {insightsLoading ? (
            <div style={S.insightsGrid}>
              {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{height:160, borderRadius:16}} />)}
            </div>
          ) : (
            <div style={S.insightsGrid}>
              {insights.map((ins, i) => (
                <div key={i} className="card" style={{...S.insightCard, borderLeft:`3px solid ${INSIGHT_COLOR[ins.insightType]||'var(--accent)'}`}}>
                  <div style={{fontSize:28, marginBottom:10}}>{INSIGHT_ICON[ins.insightType] || '✦'}</div>
                  <div style={{fontSize:11, fontWeight:700, color: INSIGHT_COLOR[ins.insightType]||'var(--accent)', marginBottom:6, letterSpacing:'0.5px'}}>
                    {ins.insightType || 'INSIGHT'}
                  </div>
                  <p style={{fontSize:14, color:'var(--text-secondary)', lineHeight:1.6}}>{ins.message}</p>
                  {ins.actionable && (
                    <div style={S.insightAction}>{ins.actionable}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Constants ───────────────────────────────────────────────────────────────
const MODES = [
  { id:'home',     emoji:'🏠', label:'Home',       sub:'Overview' },
  { id:'ocr',      emoji:'📷', label:'Scan Receipt', sub:'Camera & OCR' },
  { id:'voice',    emoji:'🎙️', label:'Voice',       sub:'Speak to add' },
  { id:'insights', emoji:'✦',  label:'AI Insights', sub:'Smart analysis' },
];

const VOICE_EXAMPLES = [
  'Add expense 500 for dinner',
  'Add expense 1200 for hotel in Goa Trip',
  'Show groups',
  'Show settlements',
];

const INSIGHT_ICON  = { SPENDING_ALERT:'📊', PAYMENT_DELAY:'⚡', SAVINGS_TIP:'💡', BUDGET_INSIGHT:'🎯', PATTERN:'📈', ACHIEVEMENT:'🏆' };
const INSIGHT_COLOR = { SPENDING_ALERT:'var(--warning)', PAYMENT_DELAY:'var(--danger)', SAVINGS_TIP:'var(--success)', BUDGET_INSIGHT:'var(--accent)', PATTERN:'var(--accent-bright)', ACHIEVEMENT:'#ffb347' };

const mockInsights = [
  { insightType:'SPENDING_ALERT', message:'Your food expenses are 32% higher than last month. Consider cooking at home more often.' },
  { insightType:'SAVINGS_TIP', message:'Split the Netflix subscription equally to save ₹150/month per person.' },
  { insightType:'BUDGET_INSIGHT', message:'You\'ve settled 3 debts this month. You\'re on track!' },
  { insightType:'ACHIEVEMENT', message:'Zero debt streak: 0 days. Settle all dues to start your streak! 🔥' },
];

// ─── Styles ──────────────────────────────────────────────────────────────────
const S = {
  page:        { padding:32, maxWidth:1100, animation:'fadeUp 0.4s ease' },
  header:      { marginBottom:28 },
  title:       { fontFamily:'var(--font-display)', fontWeight:800, fontSize:30, color:'var(--text-primary)', marginBottom:4 },
  subtitle:    { color:'var(--text-muted)', fontSize:14 },
  modeGrid:    { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:32 },
  modeCard:    { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:16, padding:'18px 14px', cursor:'pointer', textAlign:'center', transition:'all 0.2s' },
  modeActive:  { background:'var(--accent-dim)', borderColor:'var(--accent)', boxShadow:'0 0 20px rgba(108,99,255,0.15)' },
  modeEmoji:   { fontSize:28, marginBottom:8 },
  modeLabel:   { fontWeight:600, fontSize:14, color:'var(--text-primary)', marginBottom:2 },
  modeSub:     { fontSize:11, color:'var(--text-muted)' },
  homeCards:   { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 },
  featureCard: { padding:24, display:'flex', flexDirection:'column', gap:14 },
  featureTop:  { display:'flex', alignItems:'center', gap:8, fontSize:18 },
  featureTitle:{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--text-primary)' },
  featureDesc: { fontSize:13, color:'var(--text-muted)', lineHeight:1.6, flex:1 },
  ocrLayout:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:24 },
  ocrLeft:     { padding:24, display:'flex', flexDirection:'column', gap:16 },
  ocrRight:    { padding:24, display:'flex', flexDirection:'column', gap:14 },
  cardTitle:   { fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, color:'var(--text-primary)', marginBottom:4 },
  cardSub:     { fontSize:12, color:'var(--text-muted)', marginBottom:12 },
  ocrActions:  { display:'flex', flexDirection:'column', gap:10 },
  orDivider:   { textAlign:'center', color:'var(--text-muted)', fontSize:12, padding:'4px 0' },
  cameraWrap:  { position:'relative', borderRadius:16, overflow:'hidden', background:'#000' },
  cameraVideo: { width:'100%', borderRadius:12, display:'block' },
  cameraOverlay:{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 },
  scanFrame:   { width:200, height:140, border:'2px solid var(--accent)', borderRadius:8, boxShadow:'0 0 0 9999px rgba(0,0,0,0.4)' },
  scanHint:    { color:'white', fontSize:12, background:'rgba(0,0,0,0.5)', padding:'4px 12px', borderRadius:20 },
  cameraBtns:  { display:'flex', gap:10, justifyContent:'center', padding:'12px' },
  previewImg:  { width:'100%', borderRadius:12, objectFit:'cover', maxHeight:300 },
  retakeBtn:   { position:'absolute', top:10, right:10, background:'rgba(0,0,0,0.7)', border:'none', color:'white', borderRadius:20, padding:'6px 12px', cursor:'pointer', fontSize:12 },
  progressWrap:{ display:'flex', flexDirection:'column', gap:8 },
  progressLabel:{ fontSize:13, color:'var(--text-secondary)' },
  progressBar: { height:6, background:'var(--bg-secondary)', borderRadius:3, overflow:'hidden' },
  progressFill:{ height:'100%', background:'linear-gradient(90deg, var(--accent), var(--success))', borderRadius:3, transition:'width 0.3s' },
  ocrEmpty:    { display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:200, textAlign:'center' },
  itemsList:   { display:'flex', flexDirection:'column', gap:8 },
  itemRow:     { display:'flex', justifyContent:'space-between', fontSize:14, padding:'8px 0', borderBottom:'1px solid var(--border)' },
  totalRow:    { display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0' },
  divider:     { height:1, background:'var(--border)' },
  voiceLayout: { display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:24 },
  voiceCard:   { padding:28, display:'flex', flexDirection:'column', gap:16 },
  historyCard: { padding:24, display:'flex', flexDirection:'column', gap:10 },
  micWrap:     { display:'flex', flexDirection:'column', alignItems:'center', gap:16, padding:'20px 0' },
  micBtn:      { width:90, height:90, borderRadius:'50%', background:'var(--bg-secondary)', border:'2px solid var(--border)', fontSize:36, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', transition:'all 0.2s', position:'relative', zIndex:2 },
  micBtnActive:{ background:'var(--accent-dim)', borderColor:'var(--accent)', boxShadow:'0 0 30px rgba(108,99,255,0.4)', transform:'scale(1.05)' },
  ripple:      { position:'absolute', width:90, height:90, borderRadius:'50%', border:'2px solid var(--accent)', opacity:0.7, animation:'ripple 1.5s ease-out infinite' },
  micStatus:   { fontSize:14, color:'var(--text-muted)' },
  transcript:  { fontSize:15, color:'var(--text-secondary)', fontStyle:'italic', textAlign:'center', maxWidth:360, padding:'10px 16px', background:'var(--bg-secondary)', borderRadius:12 },
  voiceAction: { border:'1px solid var(--success)', borderRadius:10, padding:'12px 16px', width:'100%' },
  voiceActionLabel:{ fontSize:12, fontWeight:700, color:'var(--success)', marginBottom:4 },
  examplesWrap:{ display:'flex', flexDirection:'column', gap:8, width:'100%' },
  examplesTitle:{ fontSize:12, color:'var(--text-muted)', fontWeight:600 },
  exampleChip: { padding:'10px 14px', background:'var(--bg-secondary)', border:'1px solid var(--border)', borderRadius:8, fontSize:13, color:'var(--text-secondary)', cursor:'pointer', transition:'all 0.15s', fontStyle:'italic' },
  historyRow:  { padding:'10px 0', borderBottom:'1px solid var(--border)', display:'flex', flexDirection:'column', gap:2 },
  insightsGrid:{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:20 },
  insightCard: { padding:24 },
  insightAction:{ marginTop:10, fontSize:12, color:'var(--accent-bright)', fontWeight:600 },
};

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { groupAPI, expenseAPI, aiAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

// ── Load Tesseract OCR from CDN ──────────────────────────────────────────────
function loadTesseract() {
  return new Promise((resolve) => {
    if (window.Tesseract) { resolve(window.Tesseract); return; }
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
    s.onload = () => resolve(window.Tesseract);
    document.head.appendChild(s);
  });
}

// ── Parse OCR text → items + total ──────────────────────────────────────────
function parseReceiptText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  const items = [];
  let total = 0;
  const amountRe = /(?:rs\.?|₹|inr)?\s*(\d{1,6}(?:[.,]\d{1,2})?)/i;
  lines.forEach(line => {
    const m = line.match(amountRe);
    if (!m) return;
    const amount = parseFloat(m[1].replace(',', ''));
    if (isNaN(amount) || amount <= 0 || amount > 99999) return;
    const name = line.replace(m[0], '').replace(/[^\w\s]/g, '').trim();
    if (name.length < 2) return;
    const lower = name.toLowerCase();
    if (['total','subtotal','tax','gst','cgst','sgst','discount','tip','service'].some(k => lower.includes(k))) {
      if (lower.includes('total') || lower.includes('subtotal')) total = Math.max(total, amount);
      return;
    }
    items.push({ name, amount });
  });
  if (items.length === 0) {
    const nums = [...text.matchAll(/(\d{2,6}(?:\.\d{1,2})?)/g)]
      .map(m => parseFloat(m[1])).filter(n => n > 10 && n < 100000);
    if (nums.length) total = Math.max(...nums);
  }
  return { items, total: total || items.reduce((s, i) => s + i.amount, 0) };
}

// ── Parse voice command ──────────────────────────────────────────────────────
function parseVoiceCommand(transcript) {
  const t = transcript.toLowerCase();
  const addRe = /add (?:expense|bill|payment)(?:\s+of)?\s+(?:rs\.?|₹)?(\d+(?:\.\d{1,2})?)\s+(?:for|on)?\s+(.+?)(?:\s+in\s+(.+))?$/i;
  const m = t.match(addRe);
  if (m) return { action: 'add_expense', amount: parseFloat(m[1]), description: m[2].trim(), group: m[3]?.trim() };
  if (/(show|open|go to) groups?/.test(t))               return { action: 'navigate', page: '/groups' };
  if (/(show|open|go to) (settlements?|payments?)/.test(t)) return { action: 'navigate', page: '/settlements' };
  if (/(show|open|go to) dashboard/.test(t))             return { action: 'navigate', page: '/dashboard' };
  if (/(how much|amount|balance|owe)/.test(t))           return { action: 'balance_query' };
  return { action: 'unknown', transcript };
}

const INSIGHT_META = {
  HEAVY_SPENDING: { icon: '📈', color: '#ff6b6b', label: 'High Spending'  },
  PAYMENT_DELAY:  { icon: '⏰', color: '#ffd93d', label: 'Payment Delay'  },
  MONTHLY_TREND:  { icon: '📊', color: '#6c63ff', label: 'Monthly Trend'  },
  COST_SAVING:    { icon: '💡', color: '#00d4aa', label: 'Saving Tip'     },
  GENERAL:        { icon: '✦',  color: '#9b93ff', label: 'Insight'        },
};

const SMART_TIPS = [
  { icon: '🎯', title: 'Split equally for simple bills',   desc: 'Use Equal split for restaurant bills, movie tickets or shared rides where everyone benefits the same.' },
  { icon: '📸', title: 'Add expenses immediately',          desc: 'Add the expense right after paying so you don\'t forget. It takes 10 seconds!' },
  { icon: '💰', title: 'Settle weekly',                     desc: 'Settle up every week instead of letting debts pile up. Smaller amounts are easier to manage.' },
  { icon: '🔔', title: 'Set your UPI ID',                   desc: 'Set your UPI ID in Profile so others can pay you directly via GPay or PhonePe without asking.' },
  { icon: '📊', title: 'Use the right split type',          desc: 'Custom split for unequal bills, Percentage for tip sharing, Individual items for grocery splits.' },
  { icon: '⭐', title: 'Earn reward points',                desc: 'Pay your settlements quickly to earn reward points and build your zero-debt streak!' },
];

// ── MODE CARDS ───────────────────────────────────────────────────────────────
const MODES = [
  { id: 'ocr',      emoji: '📸', label: 'Scan Receipt',  sub: 'Camera or upload' },
  { id: 'voice',    emoji: '🎤', label: 'Voice Command', sub: 'Speak to add expense' },
  { id: 'insights', emoji: '✦',  label: 'AI Insights',   sub: 'Spending analysis' },
  { id: 'tips',     emoji: '💡', label: 'Smart Tips',    sub: 'Best practices' },
];

// ── MAIN ─────────────────────────────────────────────────────────────────────
export default function AIAssistant() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode]     = useState('home');
  const [groups, setGroups] = useState([]);

  // OCR state
  const [ocrImage, setOcrImage]         = useState(null);
  const [ocrLoading, setOcrLoading]     = useState(false);
  const [ocrResult, setOcrResult]       = useState(null);
  const [ocrProgress, setOcrProgress]   = useState(0);
  const [showCamera, setShowCamera]     = useState(false);
  const [stream, setStream]             = useState(null);
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const fileRef   = useRef(null);

  // Expense form from OCR/voice
  const [expForm, setExpForm] = useState({ description:'', amount:'', groupId:'', splitType:'EQUAL' });
  const [saving, setSaving]   = useState(false);

  // Voice state
  const [listening, setListening]   = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceResult, setVoiceResult] = useState(null);
  const recognizerRef = useRef(null);

  // AI insights state
  const [insights, setInsights]       = useState([]);
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [analyzing, setAnalyzing]     = useState(false);

  useEffect(() => {
    groupAPI.getAll().then(g => setGroups(Array.isArray(g) ? g : []));
  }, []);

  useEffect(() => {
    if (mode === 'insights') loadInsights();
    if (mode !== 'ocr' && stream) stopCamera();
  }, [mode]);

  // ── OCR ────────────────────────────────────────────────────────────────────
  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      setStream(s);
      setShowCamera(true);
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = s; }, 100);
    } catch { toast.error('Camera access denied. Use file upload instead.'); }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
    setShowCamera(false);
  };

  const capturePhoto = () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width  = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(blob => {
      const url = URL.createObjectURL(blob);
      setOcrImage(url);
      runOCR(blob);
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setOcrImage(url);
    runOCR(file);
  };

  const runOCR = async (imageSource) => {
    setOcrLoading(true);
    setOcrResult(null);
    setOcrProgress(0);
    try {
      const Tesseract = await loadTesseract();
      const result = await Tesseract.recognize(imageSource, 'eng', {
        logger: m => { if (m.status === 'recognizing text') setOcrProgress(Math.round(m.progress * 100)); }
      });
      const parsed = parseReceiptText(result.data.text);
      setOcrResult({ raw: result.data.text, ...parsed });
      setExpForm(f => ({
        ...f,
        description: parsed.items[0]?.name || 'Receipt expense',
        amount: parsed.total > 0 ? String(parsed.total) : '',
      }));
      toast.success(`Found ${parsed.items.length} items, total ₹${parsed.total}`);
    } catch (err) {
      toast.error('OCR failed — try a clearer image');
    } finally { setOcrLoading(false); }
  };

  // ── VOICE ──────────────────────────────────────────────────────────────────
  const startListening = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error('Voice not supported in this browser. Use Chrome.'); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'en-IN';
    rec.continuous = false;
    rec.interimResults = true;
    rec.onstart = () => setListening(true);
    rec.onresult = (e) => {
      const t = Array.from(e.results).map(r => r[0].transcript).join('');
      setTranscript(t);
    };
    rec.onend = () => {
      setListening(false);
      if (transcript) {
        const cmd = parseVoiceCommand(transcript);
        setVoiceResult(cmd);
        handleVoiceCommand(cmd);
      }
    };
    rec.onerror = () => { setListening(false); toast.error('Voice recognition failed'); };
    recognizerRef.current = rec;
    rec.start();
    setTranscript('');
    setVoiceResult(null);
  };

  const stopListening = () => recognizerRef.current?.stop();

  const handleVoiceCommand = useCallback((cmd) => {
    if (cmd.action === 'navigate') { navigate(cmd.page); return; }
    if (cmd.action === 'add_expense') {
      const matchedGroup = groups.find(g => g.name?.toLowerCase().includes(cmd.group?.toLowerCase() || ''));
      setExpForm({
        description: cmd.description,
        amount: String(cmd.amount),
        groupId: matchedGroup?.id || '',
        splitType: 'EQUAL',
      });
      toast.success(`Got it! ₹${cmd.amount} for "${cmd.description}". Fill group & save.`);
    }
    if (cmd.action === 'balance_query') {
      toast('Redirecting to Settlements...', { icon: '💰' });
      setTimeout(() => navigate('/settlements'), 1200);
    }
  }, [groups, navigate]);

  // ── SAVE EXPENSE ────────────────────────────────────────────────────────────
  const saveExpense = async () => {
    if (!expForm.description.trim()) { toast.error('Enter a description'); return; }
    if (!expForm.amount || Number(expForm.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (!expForm.groupId) { toast.error('Select a group'); return; }
    setSaving(true);
    try {
      const members = await groupAPI.getMembers(expForm.groupId);
      await expenseAPI.create({
        groupId:      Number(expForm.groupId),
        description:  expForm.description.trim(),
        amount:       Number(expForm.amount),
        splitType:    expForm.splitType,
        participantIds: members.map(m => m.id),
      });
      toast.success('Expense added! 🎉');
      setExpForm({ description: '', amount: '', groupId: '', splitType: 'EQUAL' });
      setOcrResult(null);
      setOcrImage(null);
      setTranscript('');
      setVoiceResult(null);
      setMode('home');
    } catch { toast.error('Failed to add expense'); }
    finally { setSaving(false); }
  };

  // ── AI INSIGHTS ─────────────────────────────────────────────────────────────
  const loadInsights = async () => {
    setInsightsLoading(true);
    const data = await aiAPI.getInsights();
    setInsights(Array.isArray(data) ? data : []);
    setInsightsLoading(false);
  };

  const runAnalysis = async () => {
    setAnalyzing(true);
    toast.loading('Running AI analysis...', { id: 'ai' });
    try {
      await aiAPI.triggerAnalyze();
      toast.success('Analysis complete!', { id: 'ai' });
      await loadInsights();
    } catch { toast.error('Analysis failed', { id: 'ai' }); }
    finally { setAnalyzing(false); }
  };

  const markInsightRead = async (id) => {
    await aiAPI.markRead(id);
    setInsights(prev => prev.map(i => i.id === id ? { ...i, isRead: true } : i));
  };

  const unreadCount = insights.filter(i => !i.isRead).length;

  // ── EXPENSE FORM (shared between OCR and Voice) ────────────────────────────
  const ExpenseForm = () => (
    <div style={S.expForm}>
      <div style={S.expFormTitle}>📝 Add Expense</div>
      <div className="input-group">
        <label>Description</label>
        <input className="input" value={expForm.description}
          onChange={e => setExpForm(f => ({ ...f, description: e.target.value }))}
          placeholder="What was this for?" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap: 12 }}>
        <div className="input-group">
          <label>Amount (₹)</label>
          <input className="input" type="number" value={expForm.amount}
            onChange={e => setExpForm(f => ({ ...f, amount: e.target.value }))}
            placeholder="0.00" />
        </div>
        <div className="input-group">
          <label>Split Type</label>
          <select className="input" value={expForm.splitType}
            onChange={e => setExpForm(f => ({ ...f, splitType: e.target.value }))}>
            <option value="EQUAL">Equal</option>
            <option value="PERCENTAGE">Percentage</option>
            <option value="CUSTOM">Custom</option>
          </select>
        </div>
      </div>
      <div className="input-group">
        <label>Group</label>
        <select className="input" value={expForm.groupId}
          onChange={e => setExpForm(f => ({ ...f, groupId: e.target.value }))}>
          <option value="">— Select group —</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>
      <div style={{ display:'flex', gap: 10 }}>
        <button className="btn btn-ghost" onClick={() => { setMode('home'); setOcrResult(null); setOcrImage(null); setTranscript(''); }}>
          Cancel
        </button>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveExpense} disabled={saving}>
          {saving ? 'Saving...' : '+ Add Expense'}
        </button>
      </div>
    </div>
  );

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return (
    <div style={S.page}>
      <div style={S.header}>
        <div>
          <h1 style={S.title}>✦ AI Assistant</h1>
          <p style={S.sub}>Scan receipts · Voice commands · Smart insights</p>
        </div>
        {mode !== 'home' && (
          <button className="btn btn-ghost" onClick={() => { setMode('home'); stopCamera(); }}>← Back</button>
        )}
      </div>

      {/* ── HOME: mode selector ── */}
      {mode === 'home' && (
        <div style={S.modeGrid}>
          {MODES.map(m => (
            <button key={m.id} style={S.modeCard} onClick={() => setMode(m.id)}>
              <div style={S.modeEmoji}>{m.emoji}</div>
              <div style={S.modeLabel}>{m.label}</div>
              <div style={S.modeSub}>{m.sub}</div>
              {m.id === 'insights' && unreadCount > 0 && (
                <span style={S.modeBadge}>{unreadCount} new</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* ── OCR MODE ── */}
      {mode === 'ocr' && (
        <div style={S.section}>
          <h2 style={S.secTitle}>📸 Scan Receipt</h2>

          {/* Camera view */}
          {showCamera && (
            <div style={S.cameraBox}>
              <video ref={videoRef} autoPlay playsInline style={S.video} />
              <canvas ref={canvasRef} style={{ display:'none' }} />
              <div style={S.cameraControls}>
                <button style={S.captureBtn} onClick={capturePhoto}>📷 Capture</button>
                <button className="btn btn-ghost" onClick={stopCamera}>Cancel</button>
              </div>
            </div>
          )}

          {/* Image preview */}
          {ocrImage && !showCamera && (
            <div style={S.previewBox}>
              <img src={ocrImage} alt="receipt" style={S.previewImg} />
            </div>
          )}

          {/* Buttons */}
          {!showCamera && !ocrLoading && (
            <div style={S.uploadBtns}>
              <button className="btn btn-primary" onClick={startCamera}>📷 Use Camera</button>
              <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>📁 Upload Image</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileUpload} />
            </div>
          )}

          {/* OCR Progress */}
          {ocrLoading && (
            <div style={S.progressBox}>
              <div style={S.progressLabel}>Reading receipt... {ocrProgress}%</div>
              <div style={S.progressTrack}>
                <div style={{ ...S.progressBar, width: `${ocrProgress}%` }} />
              </div>
            </div>
          )}

          {/* OCR Results */}
          {ocrResult && !ocrLoading && (
            <div style={S.ocrResult}>
              <div style={S.ocrResultTitle}>✅ Receipt scanned!</div>
              {ocrResult.items.length > 0 && (
                <div style={S.ocrItems}>
                  {ocrResult.items.map((item, i) => (
                    <div key={i} style={S.ocrItem}>
                      <span>{item.name}</span>
                      <span style={{ fontWeight: 700, color: 'var(--accent-bright)' }}>₹{item.amount}</span>
                    </div>
                  ))}
                  <div style={{ ...S.ocrItem, borderTop: '1px solid var(--border)', paddingTop: 8, marginTop: 4 }}>
                    <span style={{ fontWeight: 700 }}>Total</span>
                    <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: 18 }}>₹{ocrResult.total}</span>
                  </div>
                </div>
              )}
              <ExpenseForm />
            </div>
          )}

          {!ocrResult && !ocrLoading && !showCamera && (
            <div style={S.hint}>
              <span style={{ fontSize: 40 }}>📄</span>
              <p style={{ color: 'var(--text-muted)', fontSize: 14, textAlign: 'center' }}>
                Take a photo of any bill or receipt.<br />The AI will extract items and total automatically.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── VOICE MODE ── */}
      {mode === 'voice' && (
        <div style={S.section}>
          <h2 style={S.secTitle}>🎤 Voice Command</h2>

          <div style={S.voiceCenter}>
            {/* Mic button */}
            <button style={{ ...S.micBtn, ...(listening ? S.micActive : {}) }}
              onClick={listening ? stopListening : startListening}>
              <span style={{ fontSize: 48 }}>{listening ? '⏹' : '🎤'}</span>
              <span style={{ fontSize: 14, fontWeight: 600, marginTop: 8 }}>
                {listening ? 'Tap to stop' : 'Tap to speak'}
              </span>
              {listening && <div style={S.ripple} />}
            </button>

            {/* Transcript */}
            {transcript && (
              <div style={S.transcript}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>You said:</div>
                <div style={{ fontSize: 16, color: 'var(--text-primary)', fontStyle: 'italic' }}>"{transcript}"</div>
              </div>
            )}

            {/* Voice result */}
            {voiceResult && voiceResult.action !== 'unknown' && (
              <div style={S.voiceResultBox}>
                <div style={{ fontSize: 13, color: 'var(--success)', fontWeight: 700, marginBottom: 8 }}>✅ Command understood!</div>
                {voiceResult.action === 'add_expense' && <ExpenseForm />}
              </div>
            )}

            {voiceResult?.action === 'unknown' && (
              <div style={S.voiceResultBox}>
                <div style={{ color: 'var(--warning)', fontSize: 13, marginBottom: 8 }}>⚠ Couldn't understand. Try:</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.8 }}>
                  • "Add expense 500 for dinner in Goa Trip"<br />
                  • "Show groups"<br />
                  • "Show settlements"<br />
                  • "How much do I owe"
                </div>
              </div>
            )}

            {!transcript && !listening && (
              <div style={S.voiceHints}>
                <div style={S.voiceHintTitle}>Try saying:</div>
                {[
                  '"Add expense 500 for dinner in Goa Trip"',
                  '"Show groups"',
                  '"How much do I owe"',
                ].map((h, i) => (
                  <div key={i} style={S.voiceHintItem}>{h}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── AI INSIGHTS MODE ── */}
      {mode === 'insights' && (
        <div style={S.section}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
            <h2 style={{ ...S.secTitle, marginBottom: 0 }}>✦ AI Insights</h2>
            <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing}
              style={{ fontSize: 13, padding:'8px 16px' }}>
              {analyzing ? '⏳ Analyzing...' : '⚡ Run Analysis'}
            </button>
          </div>

          {insightsLoading ? (
            <div style={S.insightGrid}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 130, borderRadius: 14 }} />)}
            </div>
          ) : insights.length === 0 ? (
            <div style={S.emptyInsights}>
              <div style={{ fontSize: 52, marginBottom: 12 }}>🤖</div>
              <h3 style={S.emptyTitle}>No insights yet</h3>
              <p style={{ color:'var(--text-muted)', fontSize:14, marginBottom: 20, textAlign:'center', maxWidth: 320 }}>
                Click Run Analysis to generate personalised spending insights based on your expense history.
              </p>
              <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? '⏳ Analyzing...' : '⚡ Generate My Insights'}
              </button>
            </div>
          ) : (
            <div style={S.insightGrid}>
              {insights.map((ins, i) => {
                const meta = INSIGHT_META[ins.insightType] || INSIGHT_META.GENERAL;
                return (
                  <div key={ins.id || i} className="card"
                    style={{ ...S.insightCard, borderLeft: `3px solid ${meta.color}`, ...(!ins.isRead ? S.insightUnread : {}) }}
                    onClick={() => !ins.isRead && markInsightRead(ins.id)}>
                    <div style={S.insightTop}>
                      <div style={{ ...S.insightIcon, background: meta.color + '22', color: meta.color }}>{meta.icon}</div>
                      <div>
                        <div style={{ display:'flex', alignItems:'center', gap: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform:'uppercase' }}>{meta.label}</span>
                          {!ins.isRead && <span style={S.newTag}>NEW</span>}
                        </div>
                        <div style={S.insightMsg}>{ins.message}</div>
                      </div>
                    </div>
                    {ins.createdAt && (
                      <div style={S.insightTime}>
                        {new Date(ins.createdAt).toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                        {!ins.isRead && <span style={{ color:'var(--text-muted)', marginLeft: 6 }}>· tap to dismiss</span>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── TIPS MODE ── */}
      {mode === 'tips' && (
        <div style={S.section}>
          <h2 style={S.secTitle}>💡 Smart Tips</h2>
          <div style={S.insightGrid}>
            {SMART_TIPS.map((tip, i) => (
              <div key={i} className="card" style={{ padding: 22 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{tip.icon}</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 15, color:'var(--text-primary)', marginBottom: 8 }}>{tip.title}</div>
                <div style={{ fontSize: 13, color:'var(--text-muted)', lineHeight: 1.6 }}>{tip.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const S = {
  page:         { padding: 32, maxWidth: 1100, animation: 'fadeUp 0.4s ease' },
  header:       { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom: 28 },
  title:        { fontFamily:'var(--font-display)', fontWeight: 800, fontSize: 30, color:'var(--text-primary)', marginBottom: 4 },
  sub:          { color:'var(--text-muted)', fontSize: 14 },
  modeGrid:     { display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap: 16 },
  modeCard:     { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius: 16, padding: 24, cursor:'pointer', textAlign:'center', position:'relative', transition:'all 0.2s', fontFamily:'var(--font-body)' },
  modeEmoji:    { fontSize: 40, marginBottom: 12 },
  modeLabel:    { fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 16, color:'var(--text-primary)', marginBottom: 4 },
  modeSub:      { fontSize: 12, color:'var(--text-muted)' },
  modeBadge:    { position:'absolute', top: 12, right: 12, background:'var(--danger)', color:'white', fontSize: 10, fontWeight: 700, borderRadius: 10, padding:'2px 8px' },
  section:      { maxWidth: 680 },
  secTitle:     { fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 20, color:'var(--text-primary)', marginBottom: 20 },
  // OCR
  cameraBox:    { background:'#000', borderRadius: 16, overflow:'hidden', marginBottom: 16, position:'relative' },
  video:        { width:'100%', maxHeight: 360, display:'block' },
  cameraControls:{ display:'flex', gap: 12, justifyContent:'center', padding: 16, background:'rgba(0,0,0,0.7)' },
  captureBtn:   { background:'white', color:'#111', border:'none', borderRadius: 12, padding:'12px 28px', fontWeight: 700, cursor:'pointer', fontSize: 16 },
  previewBox:   { borderRadius: 16, overflow:'hidden', marginBottom: 16, maxHeight: 300, textAlign:'center' },
  previewImg:   { maxWidth:'100%', maxHeight: 300, objectFit:'contain', borderRadius: 12 },
  uploadBtns:   { display:'flex', gap: 12, marginBottom: 20 },
  progressBox:  { marginBottom: 20 },
  progressLabel:{ fontSize: 13, color:'var(--text-secondary)', marginBottom: 8 },
  progressTrack:{ height: 6, background:'var(--bg-secondary)', borderRadius: 6, overflow:'hidden' },
  progressBar:  { height:'100%', background:'linear-gradient(90deg, var(--accent), var(--success))', borderRadius: 6, transition:'width 0.3s' },
  ocrResult:    { background:'var(--bg-secondary)', borderRadius: 14, padding: 20, marginBottom: 16 },
  ocrResultTitle:{ fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 16, color:'var(--success)', marginBottom: 12 },
  ocrItems:     { marginBottom: 16 },
  ocrItem:      { display:'flex', justifyContent:'space-between', padding:'6px 0', fontSize: 13, color:'var(--text-secondary)', borderBottom:'1px solid var(--border)' },
  hint:         { display:'flex', flexDirection:'column', alignItems:'center', gap: 12, padding:'40px 20px' },
  // Voice
  voiceCenter:  { display:'flex', flexDirection:'column', alignItems:'center', gap: 24 },
  micBtn:       { width: 140, height: 140, borderRadius:'50%', background:'var(--bg-secondary)', border:'3px solid var(--border)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', position:'relative', transition:'all 0.2s', fontFamily:'var(--font-body)' },
  micActive:    { background:'rgba(255,107,107,0.15)', borderColor:'var(--danger)', boxShadow:'0 0 0 12px rgba(255,107,107,0.1)' },
  ripple:       { position:'absolute', inset:-8, borderRadius:'50%', border:'2px solid var(--danger)', animation:'pulse 1.2s infinite', pointerEvents:'none' },
  transcript:   { background:'var(--bg-secondary)', borderRadius: 12, padding:'14px 18px', width:'100%', maxWidth: 480, textAlign:'center' },
  voiceResultBox:{ background:'var(--bg-secondary)', borderRadius: 12, padding: 20, width:'100%', maxWidth: 480 },
  voiceHints:   { width:'100%', maxWidth: 400 },
  voiceHintTitle:{ fontSize: 13, fontWeight: 600, color:'var(--text-secondary)', marginBottom: 10 },
  voiceHintItem: { fontSize: 13, color:'var(--text-muted)', fontStyle:'italic', padding:'5px 10px', background:'var(--bg-secondary)', borderRadius: 8, marginBottom: 6 },
  // Expense form
  expForm:      { background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius: 14, padding: 20, display:'flex', flexDirection:'column', gap: 14, marginTop: 12 },
  expFormTitle: { fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 15, color:'var(--text-primary)' },
  // Insights
  insightGrid:  { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap: 16},
  insightCard:  { padding: 18, cursor:'pointer', transition:'transform 0.15s' },
  insightUnread:{ background:'rgba(108,99,255,0.06)' },
  insightTop:   { display:'flex', gap: 12, marginBottom: 10 },
  insightIcon:  { width: 42, height: 42, borderRadius: 12, display:'flex', alignItems:'center', justifyContent:'center', fontSize: 20, flexShrink: 0 },
  insightMsg:   { fontSize: 13, color:'var(--text-primary)', lineHeight: 1.5, marginTop: 4 },
  insightTime:  { fontSize: 11, color:'var(--text-muted)' },
  newTag:       { background:'var(--danger)', color:'white', fontSize: 9, fontWeight: 800, borderRadius: 4, padding:'1px 5px' },
  emptyInsights:{ display:'flex', flexDirection:'column', alignItems:'center', padding:'50px 0' },
  emptyTitle:   { fontFamily:'var(--font-display)', fontWeight: 700, fontSize: 20, color:'var(--text-primary)', marginBottom: 8 },
};
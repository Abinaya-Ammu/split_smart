package com.splitsmart.splitsmart_backend.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    // required=false means Spring will NOT crash if mail is misconfigured
    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.username:noreply@splitsmart.app}")
    private String fromEmail;

    private boolean canSendMail() {
        return mailSender != null
            && fromEmail != null
            && !fromEmail.contains("your_email")
            && !fromEmail.contains("placeholder");
    }

    @Async
    public void sendPasswordResetEmail(String toEmail, String name, String token) {
        if (!canSendMail()) {
            log.info("[EMAIL SKIPPED] Password reset token for {}: {}", toEmail, token);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);
            msg.setTo(toEmail);
            msg.setSubject("SplitSmart - Reset Your Password");
            msg.setText("Hi " + name + ",\n\nYour reset token: " + token + "\n\nValid for 1 hour.");
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Email send failed: {}", e.getMessage());
        }
    }

    @Async
    public void sendPaymentReminder(String toEmail, String fromName, String amount) {
        if (!canSendMail()) {
            log.info("[EMAIL SKIPPED] Reminder to {} from {}: ₹{}", toEmail, fromName, amount);
            return;
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(fromEmail);
            msg.setTo(toEmail);
            msg.setSubject("SplitSmart - Payment Reminder");
            msg.setText(fromName + " reminded you to pay ₹" + amount + " on SplitSmart.");
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Reminder email failed: {}", e.getMessage());
        }
    }
}

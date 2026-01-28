const express = require('express');
const router = express.Router();
const { sendEmail } = require('../services/emailService');

// Handle contact form submission
router.post('/', async (req, res) => {
    try {
        const { name, email, subject, message, role } = req.body;

        if (!email || !message) {
            return res.status(400).json({ success: false, error: 'Email and message are required' });
        }

        // Email to Admin
        const adminEmail = process.env.EMAIL_USER || process.env.SMTP_USER || 'admin@example.com'; // Send to the platform admin
        if (!process.env.EMAIL_USER && !process.env.SMTP_USER) {
            console.warn('⚠️ EMAIL_USER not set. Using dummy email for simulation.');
        }

        const emailSubject = `[Contact Form] ${subject || 'New Message'} - ${name || 'User'}`;
        const emailText = `
New Contact Message

From: ${name || 'Anonymous'} (${email})
Role: ${role || 'Visitor'}
Subject: ${subject || 'No Subject'}

Message:
${message}
        `.trim();

        const emailHtml = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; padding: 20px;">
    <h2 style="color: #4f46e5;">New Contact Message</h2>
    <div style="background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <p><strong>From:</strong> ${name || 'Anonymous'} (<a href="mailto:${email}">${email}</a>)</p>
        <p><strong>Role:</strong> ${role || 'Visitor'}</p>
        <p><strong>Subject:</strong> ${subject || 'No Subject'}</p>
    </div>
    <div style="background: #fff; padding: 15px; border-left: 4px solid #4f46e5;">
        <p style="white-space: pre-wrap;">${message}</p>
    </div>
    <p style="font-size: 12px; color: #666; margin-top: 20px;">
        Sent via AI Hiring Platform Contact Form
    </p>
</div>
        `.trim();

        const result = await sendEmail({
            to: adminEmail,
            subject: emailSubject,
            text: emailText,
            html: emailHtml
        });

        if (result.success) {
            // Optional: Send auto-reply to user
            await sendEmail({
                to: email,
                subject: 'We received your message - AI Hiring Platform',
                text: `Hi ${name || 'there'},\n\nThanks for reaching out! We've received your message and will get back to you shortly.\n\nBest regards,\nThe AI Hiring Platform Team`,
                html: `
<div style="font-family: Arial, sans-serif; padding: 20px;">
    <h2>Thanks for contacting us!</h2>
    <p>Hi ${name || 'there'},</p>
    <p>We've received your message regarding "<strong>${subject || 'your inquiry'}</strong>".</p>
    <p>Our team will review it and get back to you shortly.</p>
    <br>
    <p>Best regards,<br>The AI Hiring Platform Team</p>
</div>
                `.trim()
            });

            res.json({ success: true, message: 'Message sent successfully' });
        } else if (result.message === 'Email not configured') {
            // Dev/Demo mode: Email not configured, but treat as success for UI
            console.log('✅ Contact form submitted successfully (Simulation Mode)');
            res.json({
                success: true,
                message: 'Message received (Demo Mode: Email configuration missing, so no actual email was sent)'
            });
        } else {
            throw new Error(result.error || 'Failed to send email');
        }
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

module.exports = router;

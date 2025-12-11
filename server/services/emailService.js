/**
 * Email Service
 * Handles sending email notifications for the platform
 * Uses Nodemailer with configurable transport
 */

const nodemailer = require('nodemailer');

// Email configuration from environment variables
const emailConfig = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
        user: process.env.EMAIL_USER || '',
        pass: process.env.EMAIL_PASSWORD || ''
    }
};

// Create transporter (lazy initialization)
let transporter = null;

function getTransporter() {
    if (!transporter && emailConfig.auth.user && emailConfig.auth.pass) {
        transporter = nodemailer.createTransport(emailConfig);
    }
    return transporter;
}

/**
 * Send an email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content (optional)
 */
async function sendEmail({ to, subject, text, html }) {
    const transport = getTransporter();

    if (!transport) {
        console.log(`📧 [EMAIL NOT CONFIGURED] Would send to: ${to}`);
        console.log(`   Subject: ${subject}`);
        return { success: false, message: 'Email not configured' };
    }

    try {
        const result = await transport.sendMail({
            from: process.env.EMAIL_FROM || '"AI Hiring Platform" <noreply@aihiring.com>',
            to,
            subject,
            text,
            html: html || text
        });

        console.log(`📧 Email sent to: ${to}`);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Email send error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Send interview reminder email
 */
async function sendInterviewReminderEmail(user) {
    const subject = '🎯 Complete Your Platform Interview - AI Hiring Platform';

    const text = `
Hi ${user.profile?.name || 'there'},

You haven't completed your platform interview yet!

To apply for jobs on our platform, you need to pass the platform interview first. It only takes about 15-20 minutes and helps us match you with the right opportunities.

Complete your interview now: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/onboarding/jobseeker?step=interview

Why complete the interview?
✅ Unlock job applications
✅ Get matched with relevant positions
✅ Show employers your skills

Best regards,
The AI Hiring Platform Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px 10px 0 0; text-align: center; }
        .content { background: #f9fafb; padding: 30px; }
        .cta-button { display: inline-block; background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
        .benefits { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .benefit { padding: 10px 0; border-bottom: 1px solid #eee; }
        .benefit:last-child { border-bottom: none; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 Complete Your Platform Interview</h1>
        </div>
        <div class="content">
            <p>Hi ${user.profile?.name || 'there'},</p>
            <p>You haven't completed your platform interview yet!</p>
            <p>To apply for jobs on our platform, you need to pass the platform interview first. It only takes about <strong>15-20 minutes</strong> and helps us match you with the right opportunities.</p>
            
            <center>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/onboarding/jobseeker?step=interview" class="cta-button">
                    Complete Interview Now →
                </a>
            </center>
            
            <div class="benefits">
                <h3>Why complete the interview?</h3>
                <div class="benefit">✅ <strong>Unlock job applications</strong> - Start applying to positions</div>
                <div class="benefit">✅ <strong>Get matched</strong> - AI matches you with relevant jobs</div>
                <div class="benefit">✅ <strong>Stand out</strong> - Show employers your verified skills</div>
            </div>
            
            <p>Best regards,<br>The AI Hiring Platform Team</p>
        </div>
        <div class="footer">
            <p>This email was sent because you signed up for AI Hiring Platform.</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    return sendEmail({
        to: user.email,
        subject,
        text,
        html
    });
}

/**
 * Send failed interview retry reminder
 */
async function sendRetryReminderEmail(user) {
    const retryDate = new Date(user.platformInterview?.retryAfter);
    const canRetryNow = Date.now() >= retryDate.getTime();

    const subject = canRetryNow
        ? '🔄 You Can Now Retry Your Platform Interview!'
        : '📚 Prepare for Your Interview Retry';

    const text = canRetryNow
        ? `
Hi ${user.profile?.name || 'there'},

Great news! You can now retry your platform interview.

Your previous score was ${user.platformInterview?.score || 'below passing'}. Take this opportunity to showcase your skills!

Retry now: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/onboarding/jobseeker?step=interview

Tips for success:
- Take your time with each question
- Provide detailed, specific examples
- Review common interview questions beforehand

Good luck!
The AI Hiring Platform Team
        `.trim()
        : `
Hi ${user.profile?.name || 'there'},

Your interview retry will be available on ${retryDate.toLocaleDateString()}.

Use this time to:
- Review your previous interview areas
- Practice with mock interviews
- Brush up on your technical skills

Retry available: ${retryDate.toLocaleDateString()}

Best regards,
The AI Hiring Platform Team
        `.trim();

    return sendEmail({
        to: user.email,
        subject,
        text
    });
}

module.exports = {
    sendEmail,
    sendInterviewReminderEmail,
    sendRetryReminderEmail,
    getTransporter
};

/**
 * Email Service
 * Handles sending email notifications for the platform
 * Uses Resend HTTP API (no SMTP ports needed)
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send an email via Resend
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content (optional)
 */
async function sendEmail({ to, subject, text, html }) {
    const fromAddress = process.env.RESEND_FROM || 'Froscel <onboarding@resend.dev>';

    try {
        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: [to],
            subject,
            text,
            html: html || text
        });

        if (error) {
            console.error(`[Resend] Error sending to ${to}:`, error);
            return { success: false, error: error.message };
        }

        console.log(`[Resend] Email sent to: ${to}, id: ${data?.id}`);
        return { success: true, messageId: data?.id };
    } catch (error) {
        console.error('[Resend] Send error:', error);
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

Complete your interview now: ${process.env.FRONTEND_URL || 'https://www.froscel.com'}/onboarding/jobseeker?step=interview

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
                <a href="${process.env.FRONTEND_URL || 'https://www.froscel.com'}/onboarding/jobseeker?step=interview" class="cta-button">
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

Retry now: ${process.env.FRONTEND_URL || 'https://www.froscel.com'}/onboarding/jobseeker?step=interview

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

/**
 * Send video interview invitation email
 */
async function sendVideoInterviewInvitation({ candidateEmail, candidateName, recruiterName, jobTitle, scheduledAt, duration, roomCode, roomLink }) {
    const dateStr = new Date(scheduledAt).toLocaleString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
        year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short'
    });

    const subject = `📹 Video Interview Scheduled — ${jobTitle}`;

    const text = `
Hi ${candidateName || 'there'},

You have a video interview scheduled!

Position: ${jobTitle}
Date & Time: ${dateStr}
Duration: ${duration} minutes
Interviewer: ${recruiterName || 'Recruiter'}

Join your interview here: ${process.env.FRONTEND_URL || 'https://www.froscel.com'}${roomLink || `/interview-room/${roomCode}`}

Room Code: ${roomCode}

Tips:
- Test your camera and microphone beforehand
- Find a quiet, well-lit space
- Have a stable internet connection
- Be ready 5 minutes early

Good luck!
The Froscel Team
    `.trim();

    const html = `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; }
        .header { background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 32px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 8px 0 0; opacity: 0.9; }
        .content { background: #f9fafb; padding: 32px; }
        .detail-card { background: white; border-radius: 10px; padding: 20px; margin: 16px 0; border: 1px solid #e5e7eb; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #f3f4f6; }
        .detail-row:last-child { border-bottom: none; }
        .detail-label { font-weight: 600; color: #6b7280; }
        .detail-value { color: #111827; font-weight: 500; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; padding: 16px 40px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; }
        .room-code { background: #f3f4f6; border-radius: 8px; padding: 12px 20px; font-family: monospace; font-size: 18px; font-weight: 700; letter-spacing: 2px; color: #6366f1; display: inline-block; }
        .tips { background: white; border-radius: 10px; padding: 20px; border-left: 4px solid #10b981; }
        .tip { padding: 6px 0; }
        .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📹 Video Interview Scheduled</h1>
            <p>Froscel Interview Room™</p>
        </div>
        <div class="content">
            <p>Hi <strong>${candidateName || 'there'}</strong>,</p>
            <p>Great news! Your video interview has been scheduled.</p>

            <div class="detail-card">
                <div class="detail-row">
                    <span class="detail-label">Position</span>
                    <span class="detail-value">${jobTitle}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Date & Time</span>
                    <span class="detail-value">${dateStr}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Duration</span>
                    <span class="detail-value">${duration} minutes</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Interviewer</span>
                    <span class="detail-value">${recruiterName || 'Recruiter'}</span>
                </div>
            </div>

            <center style="margin: 24px 0;">
                <a href="${process.env.FRONTEND_URL || 'https://www.froscel.com'}${roomLink || `/interview-room/${roomCode}`}" class="cta-button">
                    Join Interview →
                </a>
                <br/><br/>
                <span>Room Code: </span>
                <span class="room-code">${roomCode}</span>
            </center>

            <div class="tips">
                <h3 style="margin-top: 0;">🎯 Tips for Success</h3>
                <div class="tip">✅ Test your camera and microphone beforehand</div>
                <div class="tip">✅ Find a quiet, well-lit space</div>
                <div class="tip">✅ Have a stable internet connection</div>
                <div class="tip">✅ Be ready 5 minutes early</div>
            </div>

            <p style="margin-top: 24px;">Best of luck!<br/>The Froscel Team</p>
        </div>
        <div class="footer">
            <p>This email was sent by Froscel AI Hiring Platform.</p>
        </div>
    </div>
</body>
</html>
    `.trim();

    return sendEmail({ to: candidateEmail, subject, text, html });
}

/**
 * Send Welcome Email
 */
async function sendWelcomeEmail(user) {
    const subject = 'Welcome to AI Hiring Platform - Froscel! 🎉';
    const loginLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/auth?source=email_campaign&type=welcome`;
    const text = `Hi ${user.profile?.name || 'there'},\n\nWelcome to Froscel! We're excited to have you on board. You can now login and explore opportunities.\n\nLogin here: ${loginLink}\n\nBest,\nThe Froscel Team`;
    
    return sendEmail({
        to: user.email,
        subject,
        text,
        html: `<div style="font-family:Arial; padding: 20px;">
                <h1 style="color:#6366f1;">Welcome to Froscel! 🎉</h1>
                <p>Hi ${user.profile?.name || 'there'},</p>
                <p>We're thrilled to have you join our AI Hiring Platform. Setup your profile to unleash the true power of AI in hiring!</p>
                <a href="${loginLink}" style="display:inline-block; padding:10px 20px; background:#6366f1; color:white; text-decoration:none; border-radius:5px;">Get Started</a>
               </div>`
    });
}

/**
 * Send Incomplete Profile Email
 */
async function sendIncompleteProfileEmail(user) {
    const subject = 'Complete your profile to stand out! 🌟';
    const profileLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?redirect=%2Fjobseeker%2Fprofile%3Fedit%3Dtrue`;
    const text = `Hi ${user.profile?.name || 'there'},\n\nDid you know candidates with complete profiles receive 3x more recruiters reachout? Complete your profile today to stand out.\n\nComplete Profile: ${profileLink}\n\nBest,\nThe Froscel Team`;
    
    return sendEmail({
        to: user.email,
        subject,
        text,
        html: `<div style="font-family:Arial; padding: 20px;">
                <h1 style="color:#6366f1;">Stand out from the crowd 🌟</h1>
                <p>Hi ${user.profile?.name || 'there'},</p>
                <p>Did you know candidates with complete profiles receive 3x more recruiter interest? Take just 2 minutes to fill in your missing details and boost your visibility!</p>
                <a href="${profileLink}" style="display:inline-block; padding:10px 20px; background:#6366f1; color:white; text-decoration:none; border-radius:5px;">Complete Profile</a>
               </div>`
    });
}

/**
 * Send Half-Baked Interview Reminder
 */
async function sendHalfBakedInterviewEmail(user, roleName) {
    const subject = `Incomplete Interview for ${roleName || 'your recent application'} ⚠️`;
    const interviewLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?source=email_campaign&type=half_baked_interview`;
    const text = `Hi ${user.profile?.name || 'there'},\n\nYou started an interview for ${roleName || 'a role'} but didn't complete it. Finish it before the deadline!\n\nResume Interview: ${interviewLink}\n\nBest,\nThe Froscel Team`;
    
    return sendEmail({
        to: user.email,
        subject,
        text,
        html: `<div style="font-family:Arial; padding: 20px;">
                <h2 style="color:#eab308;">You left your interview half-way!</h2>
                <p>Hi ${user.profile?.name || 'there'},</p>
                <p>We noticed you haven't completed your interview for <strong>${roleName || 'your recent application'}</strong>. To be considered for the selection process, you must complete the interview!</p>
                <a href="${interviewLink}" style="display:inline-block; padding:10px 20px; background:#eab308; color:white; text-decoration:none; border-radius:5px;">Resume Interview</a>
               </div>`
    });
}

/**
 * Send Inactive User Email
 */
async function sendInactiveUserEmail(user) {
    const subject = 'We miss you at Froscel 🚀';
    const homeLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/login?source=email_campaign&type=inactive_user`;
    const text = `Hi ${user.profile?.name || 'there'},\n\nWe haven't seen you around lately! Explore new AI-matched jobs on your dashboard.\n\nExplore Jobs: ${homeLink}\n\nBest,\nThe Froscel Team`;
    
    return sendEmail({
        to: user.email,
        subject,
        text,
        html: `<div style="font-family:Arial; padding: 20px;">
                <h1 style="color:#6366f1;">New Opportunities Await 🚀</h1>
                <p>Hi ${user.profile?.name || 'there'},</p>
                <p>We haven't seen you around recently! Your personalized AI-matched jobs are waiting for you.</p>
                <a href="${homeLink}" style="display:inline-block; padding:10px 20px; background:#6366f1; color:white; text-decoration:none; border-radius:5px;">Explore Jobs</a>
               </div>`
    });
}

module.exports = {
    sendEmail,
    sendInterviewReminderEmail,
    sendRetryReminderEmail,
    sendVideoInterviewInvitation,
    sendWelcomeEmail,
    sendIncompleteProfileEmail,
    sendHalfBakedInterviewEmail,
    sendInactiveUserEmail
};

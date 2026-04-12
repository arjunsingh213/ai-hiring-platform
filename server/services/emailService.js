/**
 * Email Service
 * Handles sending email notifications for the platform
 * Uses Resend HTTP API (no SMTP ports needed)
 */

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.froscel.com';

/**
 * Shared branded email footer (Froscel style)
 */
function getEmailFooter() {
    return `
        <div style="margin-top: 32px; padding: 24px 0 0; border-top: 1px solid rgba(255,255,255,0.1);">
            <p style="margin: 0 0 16px; color: #e2e8f0; font-weight: 600;">Best regards,<br/>Froscel Team</p>
        </div>

        <!-- Social Icons -->
        <div style="text-align: center; padding: 24px 0 12px;">
            <a href="https://www.froscel.com" style="display:inline-block; margin: 0 8px; text-decoration:none;">
                <img src="https://cdn-icons-png.flaticon.com/24/2111/2111463.png" alt="Website" width="24" height="24" style="opacity:0.7;" />
            </a>
            <a href="https://www.linkedin.com/company/froscel" style="display:inline-block; margin: 0 8px; text-decoration:none;">
                <img src="https://cdn-icons-png.flaticon.com/24/3536/3536505.png" alt="LinkedIn" width="24" height="24" style="opacity:0.7;" />
            </a>
            <a href="https://www.facebook.com/froscel" style="display:inline-block; margin: 0 8px; text-decoration:none;">
                <img src="https://cdn-icons-png.flaticon.com/24/733/733547.png" alt="Facebook" width="24" height="24" style="opacity:0.7;" />
            </a>
        </div>

        <!-- Divider -->
        <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.08); margin: 12px 0;" />

        <!-- Legal Footer -->
        <div style="text-align: center; padding: 16px 0; color: #64748b; font-size: 12px;">
            <p style="margin: 0 0 12px;">This is an automatically generated email, please do not reply.</p>
            <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                    <td style="padding: 0 16px; color: #64748b; font-size: 12px;">© Froscel</td>
                    <td style="padding: 0 16px;"><a href="${FRONTEND_URL}/privacy" style="color: #94a3b8; text-decoration: none; font-size: 12px;">Privacy Notice</a></td>
                    <td style="padding: 0 16px;"><a href="${FRONTEND_URL}/terms" style="color: #94a3b8; text-decoration: none; font-size: 12px;">User Agreement</a></td>
                </tr>
            </table>
        </div>
    `;
}

/**
 * Common email wrapper (dark theme matching the Froscel brand)
 */
function wrapEmail(headerHtml, bodyHtml) {
    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #e2e8f0; margin: 0; padding: 0; background: #0f172a; }
        .container { max-width: 600px; margin: 0 auto; background: #1e293b; border-radius: 12px; overflow: hidden; }
        .header { background: linear-gradient(135deg, #3b82f6, #6366f1); color: white; padding: 32px; text-align: center; }
        .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
        .header p { margin: 8px 0 0; opacity: 0.9; font-size: 14px; }
        .content { padding: 32px; color: #e2e8f0; }
        .content p { margin: 0 0 16px; }
        .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6, #6366f1); color: white !important; padding: 14px 36px; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 16px; }
        .info-card { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; padding: 20px; margin: 16px 0; }
        .benefit { padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #cbd5e1; }
        .benefit:last-child { border-bottom: none; }
        a { color: #60a5fa; }
    </style>
</head>
<body>
    <div style="padding: 20px; background: #0f172a;">
    <div class="container">
        ${headerHtml}
        <div class="content">
            ${bodyHtml}
            ${getEmailFooter()}
        </div>
    </div>
    </div>
</body>
</html>
    `.trim();
}

/**
 * Send an email via Resend
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text content
 * @param {string} options.html - HTML content (optional)
 */
async function sendEmail({ to, subject, text, html }) {
    // Randomize sender persona for a personal inbox feel (e.g. "Sara from Froscel")
    const senderNames = ['Sara from Froscel', 'Michael from Froscel'];
    const senderName = senderNames[Math.floor(Math.random() * senderNames.length)];
    const fromEmail = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    const fromAddress = process.env.RESEND_FROM || `${senderName} <${fromEmail}>`;

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
    const subject = '🎯 Complete Your Platform Interview - Froscel';

    const text = `
Hi ${user.profile?.name || 'there'},

You haven't completed your platform interview yet!

To apply for jobs on our platform, you need to pass the platform interview first. It only takes about 15-20 minutes and helps us match you with the right opportunities.

Complete your interview now: ${FRONTEND_URL}/onboarding/jobseeker?step=interview

Why complete the interview?
✅ Unlock job applications
✅ Get matched with relevant positions
✅ Show employers your skills

Best regards,
Froscel Team
    `.trim();

    const html = wrapEmail(
        `<div class="header"><h1>🎯 Complete Your Platform Interview</h1></div>`,
        `
            <p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
            <p>You haven't completed your platform interview yet!</p>
            <p>To apply for jobs on our platform, you need to pass the platform interview first. It only takes about <strong>15-20 minutes</strong> and helps us match you with the right opportunities.</p>
            
            <center style="margin: 24px 0;">
                <a href="${FRONTEND_URL}/onboarding/jobseeker?step=interview" class="cta-button">
                    Complete Interview Now →
                </a>
            </center>
            
            <div class="info-card">
                <h3 style="margin-top: 0; color: #f8fafc;">Why complete the interview?</h3>
                <div class="benefit">✅ <strong>Unlock job applications</strong> — Start applying to positions</div>
                <div class="benefit">✅ <strong>Get matched</strong> — AI matches you with relevant jobs</div>
                <div class="benefit">✅ <strong>Stand out</strong> — Show employers your verified skills</div>
            </div>
        `
    );

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

Retry now: ${FRONTEND_URL}/onboarding/jobseeker?step=interview

Tips for success:
- Take your time with each question
- Provide detailed, specific examples
- Review common interview questions beforehand

Good luck!
Froscel Team
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
Froscel Team
        `.trim();

    const html = canRetryNow
        ? wrapEmail(
            `<div class="header"><h1>🔄 You Can Retry Your Interview!</h1></div>`,
            `
                <p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
                <p>Great news! You can now retry your platform interview.</p>
                <p>Your previous score was <strong>${user.platformInterview?.score || 'below passing'}</strong>. Take this opportunity to showcase your skills!</p>
                <center style="margin: 24px 0;">
                    <a href="${FRONTEND_URL}/onboarding/jobseeker?step=interview" class="cta-button">Retry Interview Now →</a>
                </center>
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f8fafc;">🎯 Tips for Success</h3>
                    <div class="benefit">✅ Take your time with each question</div>
                    <div class="benefit">✅ Provide detailed, specific examples</div>
                    <div class="benefit">✅ Review common interview questions beforehand</div>
                </div>
            `
        )
        : wrapEmail(
            `<div class="header"><h1>📚 Prepare for Your Retry</h1></div>`,
            `
                <p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
                <p>Your interview retry will be available on <strong>${retryDate.toLocaleDateString()}</strong>.</p>
                <div class="info-card">
                    <h3 style="margin-top: 0; color: #f8fafc;">Use this time to prepare:</h3>
                    <div class="benefit">📖 Review your previous interview areas</div>
                    <div class="benefit">🎤 Practice with mock interviews</div>
                    <div class="benefit">💻 Brush up on your technical skills</div>
                </div>
            `
        );

    return sendEmail({
        to: user.email,
        subject,
        text,
        html
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

Join your interview here: ${FRONTEND_URL}${roomLink || `/interview-room/${roomCode}`}

Room Code: ${roomCode}

Tips:
- Test your camera and microphone beforehand
- Find a quiet, well-lit space
- Have a stable internet connection
- Be ready 5 minutes early

Best regards,
Froscel Team
    `.trim();

    const html = wrapEmail(
        `<div class="header">
            <h1>📹 Video Interview Scheduled</h1>
            <p>Froscel Interview Room™</p>
        </div>`,
        `
            <p>Hi <strong>${candidateName || 'there'}</strong>,</p>
            <p>Great news! Your video interview has been scheduled.</p>

            <div class="info-card">
                <table width="100%" cellpadding="0" cellspacing="0">
                    <tr><td style="padding:10px 0; color:#94a3b8; font-weight:600;">Position</td><td style="padding:10px 0; color:#f8fafc; text-align:right;">${jobTitle}</td></tr>
                    <tr><td style="padding:10px 0; border-top:1px solid rgba(255,255,255,0.05); color:#94a3b8; font-weight:600;">Date & Time</td><td style="padding:10px 0; border-top:1px solid rgba(255,255,255,0.05); color:#f8fafc; text-align:right;">${dateStr}</td></tr>
                    <tr><td style="padding:10px 0; border-top:1px solid rgba(255,255,255,0.05); color:#94a3b8; font-weight:600;">Duration</td><td style="padding:10px 0; border-top:1px solid rgba(255,255,255,0.05); color:#f8fafc; text-align:right;">${duration} minutes</td></tr>
                    <tr><td style="padding:10px 0; border-top:1px solid rgba(255,255,255,0.05); color:#94a3b8; font-weight:600;">Interviewer</td><td style="padding:10px 0; border-top:1px solid rgba(255,255,255,0.05); color:#f8fafc; text-align:right;">${recruiterName || 'Recruiter'}</td></tr>
                </table>
            </div>

            <center style="margin: 24px 0;">
                <a href="${FRONTEND_URL}${roomLink || `/interview-room/${roomCode}`}" class="cta-button">
                    Join Interview →
                </a>
                <br/><br/>
                <span style="color:#94a3b8;">Room Code: </span>
                <span style="background:rgba(255,255,255,0.05); border-radius:8px; padding:8px 16px; font-family:monospace; font-size:18px; font-weight:700; letter-spacing:2px; color:#60a5fa;">${roomCode}</span>
            </center>

            <div class="info-card" style="border-left: 4px solid #10b981;">
                <h3 style="margin-top: 0; color: #f8fafc;">🎯 Tips for Success</h3>
                <div class="benefit">✅ Test your camera and microphone beforehand</div>
                <div class="benefit">✅ Find a quiet, well-lit space</div>
                <div class="benefit">✅ Have a stable internet connection</div>
                <div class="benefit">✅ Be ready 5 minutes early</div>
            </div>
        `
    );

    return sendEmail({ to: candidateEmail, subject, text, html });
}

/**
 * Send Welcome Email
 */
async function sendWelcomeEmail(user) {
    const subject = 'Welcome to Froscel! 🎉';
    const loginLink = `${FRONTEND_URL}/auth?source=email_campaign&type=welcome`;
    const text = `Hi ${user.profile?.name || 'there'},\n\nWelcome to Froscel! We're excited to have you on board. You can now login and explore opportunities.\n\nLogin here: ${loginLink}\n\nBest regards,\nFroscel Team`;
    
    const html = wrapEmail(
        `<div class="header"><h1>Welcome to Froscel! 🎉</h1></div>`,
        `
            <p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
            <p>We're thrilled to have you join Froscel. Set up your profile to unleash the true power of AI in hiring!</p>
            <center style="margin: 24px 0;">
                <a href="${loginLink}" class="cta-button">Get Started →</a>
            </center>
        `
    );

    return sendEmail({ to: user.email, subject, text, html });
}

/**
 * Send Incomplete Profile Email
 */
async function sendIncompleteProfileEmail(user) {
    const subject = 'Complete your profile to stand out! 🌟';
    const profileLink = `${FRONTEND_URL}/login?redirect=%2Fjobseeker%2Fprofile%3Fedit%3Dtrue`;
    const text = `Hi ${user.profile?.name || 'there'},\n\nDid you know candidates with complete profiles receive 3x more recruiter reachout? Complete your profile today to stand out.\n\nComplete Profile: ${profileLink}\n\nBest regards,\nFroscel Team`;
    
    const html = wrapEmail(
        `<div class="header"><h1>Stand Out From the Crowd 🌟</h1></div>`,
        `
            <p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
            <p>Did you know candidates with complete profiles receive <strong>3x more recruiter interest</strong>? Take just 2 minutes to fill in your missing details and boost your visibility!</p>
            <center style="margin: 24px 0;">
                <a href="${profileLink}" class="cta-button">Complete Profile →</a>
            </center>
        `
    );

    return sendEmail({ to: user.email, subject, text, html });
}

/**
 * Send Half-Baked Interview Reminder
 */
async function sendHalfBakedInterviewEmail(user, roleName) {
    const subject = `Incomplete Interview for ${roleName || 'your recent application'} ⚠️`;
    const interviewLink = `${FRONTEND_URL}/login?source=email_campaign&type=half_baked_interview`;
    const text = `Hi ${user.profile?.name || 'there'},\n\nYou started an interview for ${roleName || 'a role'} but didn't complete it. Finish it before the deadline!\n\nResume Interview: ${interviewLink}\n\nBest regards,\nFroscel Team`;
    
    const html = wrapEmail(
        `<div class="header" style="background: linear-gradient(135deg, #eab308, #f59e0b);"><h1>⚠️ Incomplete Interview</h1></div>`,
        `
            <p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
            <p>We noticed you haven't completed your interview for <strong>${roleName || 'your recent application'}</strong>. To be considered for the selection process, you must complete the interview!</p>
            <center style="margin: 24px 0;">
                <a href="${interviewLink}" class="cta-button" style="background: linear-gradient(135deg, #eab308, #f59e0b);">Resume Interview →</a>
            </center>
        `
    );

    return sendEmail({ to: user.email, subject, text, html });
}

/**
 * Send Inactive User Email
 */
async function sendInactiveUserEmail(user) {
    const subject = 'We miss you at Froscel 🚀';
    const homeLink = `${FRONTEND_URL}/login?source=email_campaign&type=inactive_user`;
    const text = `Hi ${user.profile?.name || 'there'},\n\nWe haven't seen you around lately! Explore new AI-matched jobs on your dashboard.\n\nExplore Jobs: ${homeLink}\n\nBest regards,\nFroscel Team`;
    
    const html = wrapEmail(
        `<div class="header"><h1>New Opportunities Await 🚀</h1></div>`,
        `
            <p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
            <p>We haven't seen you around recently! Your personalized AI-matched jobs are waiting for you.</p>
            <center style="margin: 24px 0;">
                <a href="${homeLink}" class="cta-button">Explore Jobs →</a>
            </center>
        `
    );

    return sendEmail({ to: user.email, subject, text, html });
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

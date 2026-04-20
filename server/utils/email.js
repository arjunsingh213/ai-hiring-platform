const { Resend } = require('resend');
const { wrapEmail } = require('../services/emailService');

const resend = new Resend(process.env.RESEND_API_KEY);

const escapeHtml = (unsafe) => {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
};

const sendEmail = async (options) => {
    const fromAddress = process.env.RESEND_FROM || 'Froscel <onboarding@resend.dev>';

    try {
        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: [options.email],
            subject: options.subject,
            html: options.html
        });

        if (error) {
            console.error(`[Resend] Error sending to ${options.email}:`, error);
            throw new Error(error.message || 'Resend email failed');
        }

        console.log(`[Resend] Email sent to ${options.email}, id: ${data?.id}`);
        return data;
    } catch (err) {
        console.error(`[Resend] Failed to send email to ${options.email}:`, err.message);
        throw err;
    }
};

const sendVerificationEmail = async (user, token) => {
    const verificationUrl = `${process.env.CLIENT_URL || 'https://www.froscel.com'}/verify-email/${token}`;

    const message = wrapEmail(
        `<div class="header"><h1>Welcome to AI Hiring Platform!</h1></div>`,
        `<p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
         <p>Thank you for signing up. Please verify your email address to activate your account.</p>
         <center style="margin: 24px 0;">
             <a href="${verificationUrl}" class="cta-button">Verify Email Address</a>
         </center>
         <p>Or click the link below:</p>
         <p><a href="${verificationUrl}">${verificationUrl}</a></p>
         <p>This link will expire in 24 hours.</p>`
    );

    try {
        if (process.env.NODE_ENV !== 'production') {
            console.log('=================================================');
            console.log(`VERIFICATION LINK FOR ${user.email}:`);
            console.log(verificationUrl);
            console.log('=================================================');
        }

        await sendEmail({
            email: user.email,
            subject: 'Verify your email address - AI Hiring Platform',
            html: message
        });
        console.log(`[Resend] Verification email sent to ${user.email}`);
    } catch (error) {
        console.error(`[Resend] FAILED to send verification email to ${user.email}:`, error.message);
    }
};

const sendPasswordResetOTP = async (user, otp) => {
    const message = wrapEmail(
        `<div class="header"><h1>Password Reset Request</h1></div>`,
        `<p>Hi <strong>${user.profile?.name || 'there'}</strong>,</p>
         <p>You requested to reset your password. Use the OTP code below to continue:</p>
         <div style="margin: 32px 0; text-align: center;">
             <div style="display: inline-block; background: rgba(255,255,255,0.1); color: #f8fafc; padding: 20px 40px; border-radius: 12px; font-size: 32px; font-weight: bold; border: 1px solid rgba(255,255,255,0.2); letter-spacing: 8px;">
                 ${otp}
             </div>
         </div>
         <p style="color: #cbd5e1; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
         <p style="color: #cbd5e1; font-size: 14px;">If you didn't request this, please ignore this email.</p>`
    );

    try {
        if (process.env.NODE_ENV !== 'production') {
            console.log('=================================================');
            console.log(`PASSWORD RESET OTP FOR ${user.email}: ${otp}`);
            console.log('=================================================');
        }

        await sendEmail({
            email: user.email,
            subject: 'Password Reset OTP - AI Hiring Platform',
            html: message
        });
        console.log(`Password reset OTP sent to ${user.email}`);
        return true;
    } catch (error) {
        console.error('Error sending password reset OTP:', error);
        throw error;
    }
};

const sendWorkEmailOTP = async (user, email, otp) => {
    const message = wrapEmail(
        `<div class="header"><h1>Verify Your Work Email</h1></div>`,
        `<p>Hi <strong>${user.profile?.name || 'Recruiter'}</strong>,</p>
         <p>To verify your employment at <strong>${user.recruiterProfile?.companyName || 'your company'}</strong>, please use the OTP code below:</p>
         <div style="margin: 32px 0; text-align: center;">
             <div style="display: inline-block; background: rgba(255,255,255,0.1); color: #f8fafc; padding: 16px 32px; border-radius: 8px; font-size: 28px; font-weight: bold; border: 1px solid rgba(255,255,255,0.2); letter-spacing: 4px;">
                 ${otp}
             </div>
         </div>
         <p style="color: #cbd5e1; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>`
    );

    try {
        if (process.env.NODE_ENV !== 'production') {
            console.log('=================================================');
            console.log(`WORK EMAIL OTP FOR ${email}: ${otp}`);
            console.log('=================================================');
        }

        await sendEmail({
            email: email,
            subject: 'Verify Work Email - AI Hiring Platform',
            html: message
        });
        console.log(`Work email OTP sent to ${email}`);
        return true;
    } catch (error) {
        console.error('Error sending work email OTP:', error);
        throw error;
    }
};

const sendJobInvitationEmail = async (user, job) => {
    const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://www.froscel.com';
    const jobLink = `${frontendUrl}/jobs/${job._id}`;

    const message = wrapEmail(
        `<div class="header">
            <h1>Hiring Opportunity</h1>
            <p>Froscel</p>
        </div>`,
        `<p>Dear <strong>${user.profile?.name || 'Candidate'}</strong>,</p>
         <p>Greetings From <strong>Froscel</strong>!</p>
         <p>Based on your exceptional talent profile and skills, we are pleased to share an exciting new career opportunity directly from our platform for the position of <strong>${job.title}</strong> at <strong>${job.company?.name || 'Our Partner Company'}</strong>.</p>
         
         <div class="info-card">
             <h3 style="margin-top: 0; color: #f8fafc;">📌 Position Details</h3>
             <table width="100%" cellpadding="0" cellspacing="0">
                 ${job.company?.name ? `<tr><td style="padding:6px 0; color:#94a3b8; font-weight:600;">Company</td><td style="padding:6px 0; color:#f8fafc; text-align:right;">${job.company.name}</td></tr>` : ''}
                 <tr><td style="padding:6px 0; border-top:1px solid rgba(255,255,255,0.05); color:#94a3b8; font-weight:600;">Role</td><td style="padding:6px 0; border-top:1px solid rgba(255,255,255,0.05); color:#f8fafc; text-align:right;">${job.title}</td></tr>
                 ${job.jobDetails?.type || job.jobDetails?.remote || job.jobDetails?.location ? `<tr><td style="padding:6px 0; border-top:1px solid rgba(255,255,255,0.05); color:#94a3b8; font-weight:600;">Mode</td><td style="padding:6px 0; border-top:1px solid rgba(255,255,255,0.05); color:#f8fafc; text-align:right;">${job.jobDetails?.remote ? 'Remote' : (job.jobDetails?.type || '')} ${job.jobDetails?.location ? `(${job.jobDetails.location})` : ''}</td></tr>` : ''}
                 ${job.jobDetails?.salary?.min !== undefined ? `<tr><td style="padding:6px 0; border-top:1px solid rgba(255,255,255,0.05); color:#94a3b8; font-weight:600;">Salary</td><td style="padding:6px 0; border-top:1px solid rgba(255,255,255,0.05); color:#f8fafc; text-align:right;">${job.jobDetails.salary.min} - ${job.jobDetails.salary.max || ''} ${job.jobDetails.salary.currency || 'INR'} / ${job.jobDetails.salary.period || 'yearly'}</td></tr>` : ''}
             </table>
         </div>
         
         <h3 style="color: #f8fafc; font-size: 18px; margin-bottom: 10px;">📝 Job Description</h3>
         <p style="white-space: pre-wrap; font-size: 14px; color: #cbd5e1;">${escapeHtml(job.description) || 'Log in to view the full job description.'}</p>
         
         <center style="margin: 32px 0;">
             <a href="${jobLink}" class="cta-button">Apply Now →</a>
         </center>
         
         <p style="text-align: center; color: #94a3b8; font-size: 14px;">
             <em>We believe your skill set strongly aligns with this role. Interested candidates are encouraged to apply at the earliest!</em>
         </p>`
    );

    try {
        await sendEmail({
            email: user.email,
            subject: "Invitation to Apply: " + job.title + " at " + (job.company && job.company.name ? job.company.name : "Froscel"),
            html: message
        });
        console.log("Job invitation email sent to " + user.email + " for job " + job._id);
        return true;
    } catch (error) {
        console.error('Error sending job invitation email:', error);
        throw error;
    }
};

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetOTP,
    sendWorkEmailOTP,
    sendJobInvitationEmail
};

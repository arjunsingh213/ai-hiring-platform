const nodemailer = require('nodemailer');

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
    // Create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com', // Default to Gmail for now
        port: process.env.SMTP_PORT || 587,
        secure: false, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });

    // Define email options
    const mailOptions = {
        from: process.env.SMTP_FROM || '"AI Hiring Platform" <noreply@aihiring.com>',
        to: options.email,
        subject: options.subject,
        html: options.html
    };

    // Send email
    await transporter.sendMail(mailOptions);
};

const sendVerificationEmail = async (user, token) => {
    const verificationUrl = `${process.env.CLIENT_URL || 'https://www.froscel.com'}/verify-email/${token}`;

    const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366F1;">Welcome to AI Hiring Platform!</h2>
            <p>Hi ${user.profile?.name || 'there'},</p>
            <p>Thank you for signing up. Please verify your email address to activate your account.</p>
            <div style="margin: 30px 0;">
                <a href="${verificationUrl}" style="background-color: #6366F1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Verify Email Address</a>
            </div>
            <p>Or click the link below:</p>
            <p><a href="${verificationUrl}">${verificationUrl}</a></p>
            <p>This link will expire in 24 hours.</p>
            <p>Best regards,<br>The AI Hiring Platform Team</p>
        </div>
    `;

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
        console.log(`Verification email sent to ${user.email}`);
    } catch (error) {
        console.error('Error sending verification email:', error);
        // Don't throw error to prevent blocking signup flow, but log it
        // In production, you might want to handle this more robustly
    }
};

const sendPasswordResetOTP = async (user, otp) => {
    const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366F1; margin-bottom: 24px;">Password Reset Request</h2>
            <p>Hi ${user.profile?.name || 'there'},</p>
            <p>You requested to reset your password. Use the OTP code below to continue:</p>
            <div style="margin: 32px 0; text-align: center;">
                <div style="display: inline-block; background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; padding: 20px 40px; border-radius: 12px; font-size: 32px; font-weight: bold; letter-spacing: 8px;">
                    ${otp}
                </div>
            </div>
            <p style="color: #64748B; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
            <p style="color: #64748B; font-size: 14px;">If you didn't request this, please ignore this email.</p>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">Best regards,<br/>The AI Hiring Platform Team</p>
        </div>
    `;

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
    const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #6366F1; margin-bottom: 24px;">Verify Your Work Email</h2>
            <p>Hi ${user.profile?.name || 'Recruiter'},</p>
            <p>To verify your employment at <strong>${user.recruiterProfile?.companyName || 'your company'}</strong>, please use the OTP code below:</p>
            <div style="margin: 32px 0; text-align: center;">
                <div style="display: inline-block; background: #EFF6FF; color: #1E40AF; padding: 16px 32px; border-radius: 8px; font-size: 28px; font-weight: bold; border: 1px solid #DBEAFE; letter-spacing: 4px;">
                    ${otp}
                </div>
            </div>
            <p style="color: #64748B; font-size: 14px;">This code will expire in <strong>10 minutes</strong>.</p>
            <hr style="border: none; border-top: 1px solid #E2E8F0; margin: 24px 0;" />
            <p style="color: #94A3B8; font-size: 12px;">Best regards,<br/>The AI Hiring Platform Team</p>
        </div>
    `;

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
    // Generate an absolute link to view the specific job on the frontend
    const frontendUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL || 'https://www.froscel.com';
    const jobLink = `${frontendUrl}/jobs/${job._id}`;

    const message = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; background-color: #ffffff;">
            
            <!-- Header Banner -->
            <div style="background-color: #0f172a; padding: 30px; text-align: center; border-bottom: 4px solid #6366F1;">
                <h1 style="color: #6366F1; margin: 0; font-size: 28px; text-transform: uppercase; letter-spacing: 2px;">Froscel</h1>
                <h2 style="color: #ffffff; margin: 10px 0 0 0; font-size: 22px;">Hiring Opportunity</h2>
            </div>
            
            <!-- Body Content -->
            <div style="padding: 30px;">
                <p style="font-size: 16px; color: #333333; margin-top: 0;">Dear <strong>${user.profile?.name || 'Candidate'}</strong>,</p>
                
                <p style="font-size: 16px; color: #333333;">Greetings From <strong>Froscel</strong>!</p>
                
                <p style="font-size: 15px; color: #4b5563; line-height: 1.6;">
                    Based on your exceptional talent profile and skills, we are pleased to share an exciting new career opportunity directly from our platform for the position of <strong>${job.title}</strong> at <strong>${job.company?.name || 'Our Partner Company'}</strong>.
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">
                
                <h3 style="color: #111827; font-size: 18px; margin-bottom: 15px;">📌 Position Details</h3>
                <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 15px; color: #374151;">
                    ${job.company?.name ? `
                    <tr>
                        <td style="padding: 6px 0; width: 100px;"><strong>Company:</strong></td>
                        <td style="padding: 6px 0;">${job.company.name}</td>
                    </tr>
                    ` : ''}
                    <tr>
                        <td style="padding: 6px 0; width: 100px;"><strong>Role:</strong></td>
                        <td style="padding: 6px 0;">${job.title}</td>
                    </tr>
                    ${job.jobDetails?.type || job.jobDetails?.remote || job.jobDetails?.location ? `
                    <tr>
                        <td style="padding: 6px 0;"><strong>Mode:</strong></td>
                        <td style="padding: 6px 0;">${job.jobDetails?.remote ? 'Remote' : (job.jobDetails?.type || '')} ${job.jobDetails?.location ? `(${job.jobDetails.location})` : ''}</td>
                    </tr>
                    ` : ''}
                    ${job.jobDetails?.salary?.min !== undefined ? `
                    <tr>
                        <td style="padding: 6px 0;"><strong>Salary:</strong></td>
                        <td style="padding: 6px 0;">${job.jobDetails.salary.min} - ${job.jobDetails.salary.max || ''} ${job.jobDetails.salary.currency || 'INR'} / ${job.jobDetails.salary.period || 'yearly'}</td>
                    </tr>
                    ` : ''}
                </table>
                
                <h3 style="color: #111827; font-size: 18px; margin-bottom: 10px;">📝 Job Description</h3>
                <p style="font-size: 14px; color: #4b5563; line-height: 1.5; margin-bottom: 25px; white-space: pre-wrap;">${escapeHtml(job.description) || 'Log in to view the full job description.'}</p>
                
                <div style="text-align: center; margin: 35px 0;">
                    <a href="${jobLink}" style="display: inline-block; background-color: #6366F1; color: #ffffff; text-decoration: none; padding: 14px 30px; font-size: 16px; font-weight: bold; border-radius: 6px; text-transform: uppercase; letter-spacing: 1px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.2);">
                        Apply Now
                    </a>
                </div>
                
                <p style="font-size: 14px; color: #4b5563; line-height: 1.5; text-align: center;">
                    <em>We believe your skill set strongly aligns with this role. Interested candidates are encouraged to apply at the earliest!</em>
                </p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <div style="font-size: 14px; color: #6b7280; line-height: 1.5;">
                    <p style="margin: 0;">Best Regards,</p>
                    <p style="margin: 5px 0 0 0; font-weight: bold; color: #374151;">Team Froscel</p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f8fafc; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
                <p style="font-size: 12px; color: #94a3b8; margin: 0;">
                    You are receiving this email because you registered on the Froscel platform.
                </p>
            </div>
        </div>
    `;

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

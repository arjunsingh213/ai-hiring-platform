const nodemailer = require('nodemailer');

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
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email/${token}`;

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
        console.log('=================================================');
        console.log(`VERIFICATION LINK FOR ${user.email}:`);
        console.log(verificationUrl);
        console.log('=================================================');

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
        console.log('=================================================');
        console.log(`PASSWORD RESET OTP FOR ${user.email}: ${otp}`);
        console.log('=================================================');

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

module.exports = {
    sendEmail,
    sendVerificationEmail,
    sendPasswordResetOTP
};

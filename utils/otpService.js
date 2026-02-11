import nodemailer from 'nodemailer';
import { OtpCode } from '../models/index.js';

// Configure transporter
// Use environment variables for credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // Built-in service
  auth: {
    user: process.env.EMAIL_USER, // Your gmail address
    pass: process.env.EMAIL_PASS, // Your App Password
  }
});

// Debug credentials (safely)
console.log("-----------------------------------------");
console.log("OTP Service: Initializing Nodemailer");
console.log("- EMAIL_USER:", process.env.EMAIL_USER ? `Set (${process.env.EMAIL_USER})` : "MISSING");
console.log("- EMAIL_PASS:", process.env.EMAIL_PASS ? "Set (Hidden)" : "MISSING");
console.log("-----------------------------------------");

/**
 * Generate a 4-digit numeric OTP
 */
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

/**
 * Send OTP to email
 */
export const sendOTP = async (email) => {
    // 1. Generate OTP
    const code = generateOTP();
    const expiresAt = new Date(Date.now() + 3 * 60 * 1000); // 3 minutes expiry

    // 2. Save to DB (replace existing for this email)
    try {
        await OtpCode.destroy({ where: { email } });
        
        await OtpCode.create({
            email,
            code,
            expires_at: expiresAt.toISOString()
        });
    } catch (dbError) {
        console.error('Database Error in sendOTP:', dbError);
        // Helps user debug if table is missing
        throw new Error('Database error: Failed to save OTP. Run migration 11_create_otp_codes.sql');
    }

    // 3. Send Email
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Your Snookhead Verification Code',
        text: `Your verification code is: ${code}. It expires in 3 minutes.`,
        html: `<div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Welcome to Snookhead!</h2>
                <p>Please use the following code to verify your email address:</p>
                <h1 style="color: #F08626; letter-spacing: 5px;">${code}</h1>
                <p>This code will expire in 3 minutes.</p>
               </div>`
    };

    try {
        await transporter.sendMail(mailOptions);
        return true;
    } catch (emailError) {
        console.error('Email Error in sendOTP:', emailError);
        // Helps user debug if credentials are bad
        throw new Error('Email error: Failed to send email. Check EMAIL_USER/PASS or App Password.');
    }
};

/**
 * Verify OTP
 */
export const verifyOTP = async (email, code) => {
    try {
        const record = await OtpCode.findOne({ 
            where: { 
                email, 
                code 
            } 
        });

        if (!record) {
            return { valid: false, message: 'Invalid code' };
        }

        if (new Date() > new Date(record.expires_at)) {
            // Delete expired
            await OtpCode.destroy({ where: { id: record.id } });
            return { valid: false, message: 'Code expired' };
        }

        // Valid - delete strictly after use is handled by caller or here?
        // Let's keep it here to ensure one-time use
        await OtpCode.destroy({ where: { id: record.id } });

        return { valid: true };
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return { valid: false, message: 'Verification failed' };
    }
};

import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Sends a welcome email to a new member with their ID and QR code.
 * @param {Object} customer - The customer object from the database.
 * @param {Object} walletInfo - The wallet information including qrid and qrPayload.
 * @returns {Promise<Object>} Status of the email delivery.
 */
export const sendWelcomeEmail = async (customer, walletInfo) => {
  try {
    const { email, name, externalid } = customer;
    const { qrid, qrPayload } = walletInfo;

    if (!email) {
      console.log(`[EmailService] Skipping email for member ${name} - no email provided.`);
      return { success: false, error: 'No email provided' };
    }

    console.log(`[EmailService] Preparing welcome email for ${email}...`);

    // Generate QR Code as Buffer for embedding
    // The qrPayload is the same data scanned by the scanner app
    const qrBuffer = await QRCode.toBuffer(qrPayload || qrid);

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Snookhead" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Welcome to Snookhead - Your Membership Details',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: auto; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #F08626; text-align: center;">Welcome to Snookhead!</h2>
          <p>Hello <strong>${name}</strong>,</p>
          <p>Thank you for joining our club. Your membership has been successfully created and your wallet is now active.</p>
          
          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #F08626;">
            <p style="margin: 5px 0;"><strong>Member ID:</strong> ${externalid || 'Generated on first visit'}</p>
            <p style="margin: 5px 0;"><strong>Digital Card ID:</strong> ${qrid}</p>
          </div>

          <p style="text-align: center;">Your digital membership QR code is below. You can scan this at the reception for bookings and transactions:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <img src="cid:membershipqrcode" alt="Membership QR Code" style="width: 200px; height: 200px; border: 2px solid #ddd; padding: 10px; border-radius: 10px;"/>
          </div>

          <p>Please keep this email safe. You can show this QR code whenever you visit us.</p>
          
          <p style="margin-top: 30px;">Best Regards,<br><strong>Snookhead Team</strong></p>

          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="font-size: 11px; color: #999; text-align: center;">This is an automated system message. Please do not reply directly to this email.</p>
        </div>
      `,
      attachments: [
        {
          filename: 'membership-qr.png',
          content: qrBuffer,
          cid: 'membershipqrcode' // Matches img src="cid:membershipqrcode"
        }
      ]
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [EmailService] Welcome email sent to ${email}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('❌ [EmailService] Failed to send welcome email:', error);
    // We catch it here so the main flow can continue
    return { success: false, error: error.message };
  }
};

import "dotenv/config";
import nodemailer from "nodemailer";

async function testEmail() {
  console.log("-----------------------------------------");
  console.log("Email Test Script");
  
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  
  console.log("EMAIL_USER:", user ? `"${user}"` : "MISSING");
  console.log("EMAIL_PASS:", pass ? `"${pass.substring(0, 2)}...${pass.substring(pass.length - 2)}"` : "MISSING");
  console.log("EMAIL_PASS Length:", pass ? pass.length : 0);

  if (!user ||!pass) {
    console.error("❌ Credentials missing!");
    return;
  }

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    debug: true, // Enable nodemailer debug logs
    logger: true // Enable nodemailer logger
  });

  try {
    console.log("Attempting to verify connection...");
    await transporter.verify();
    
    console.log("✅ Connection verified successfully!");
    console.log("Attempting to send test email...");
    
    const info = await transporter.sendMail({
      from: user,
      to: user, // Send back to self
      subject: "Test Email from Script",
      text: "If you receive this, the email configuration is correct."
    });
    
    console.log("✅ Email sent successfully!");
    console.log("Message ID: %s", info.messageId);
  } catch (err) {
    console.error("❌ Failed:", err.message);
    if (err.code === 'EAUTH') {
        console.error("👉 Likely cause: Invalid App Password or Username.");
    }
  }
}

testEmail();

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Email configuration
const createTransporter = async () => {
  // For development, use specific Ethereal Email account
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode: Using specific Ethereal Email account');
    try {
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: 'tom67@ethereal.email',
          pass: '3YbheDeJ29HYbyRhbH',
        },
      });
    } catch (error) {
      console.error('Failed to create Ethereal transporter:', error);
      return null;
    }
  }
  
  // For production, use configured email service
  if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    console.log('Using configured email service:', process.env.EMAIL_HOST);
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT || 587,
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      tls: {
        rejectUnauthorized: false, // Allow self-signed certificates
      },
    });
  }
  
  // Fallback to Gmail
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'your-email@gmail.com',
      pass: process.env.EMAIL_PASS || 'your-app-password',
    },
  });
};

export const sendStudentInvitation = async (studentEmail, studentName, accessCode, tempPassword) => {
  try {
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('=== EMAIL SENDING FAILED - NO TRANSPORTER ===');
      console.log('TO:', studentEmail);
      console.log('Student Name:', studentName);
      console.log('Email:', studentEmail);
      console.log('Password:', tempPassword);
      console.log('Access Code:', accessCode);
      console.log('Portal URL:', process.env.CLIENT_URL || 'http://localhost:5173/student');
      console.log('========================================');
      return { success: false, error: 'No email transporter available' };
    }
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'YAHODA LIVING <admin@yahoda.com>',
      to: studentEmail,
      subject: 'Welcome to YAHODA LIVING - Your Student Portal Access',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">YAHODA LIVING</h1>
            <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0;">Your Home Away From Home</p>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Welcome, ${studentName}!</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Your student portal account has been created successfully. You can now access your dashboard to view your rent details, payment history, and make online payments.
            </p>
            
            <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #333; margin-top: 0; font-size: 16px;">Your Login Credentials:</h3>
              <p style="color: #666; margin: 10px 0;">
                <strong>Email:</strong> ${studentEmail}<br>
                <strong>Password:</strong> ${tempPassword}<br>
                <strong>Access Code:</strong> ${accessCode}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${clientUrl}/student" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Access Student Portal
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
              Please change your password after your first login for security purposes.<br>
              If you have any questions, please contact the admin.
            </p>
          </div>
        </div>
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
    // If using Ethereal, provide preview URL
    if (process.env.NODE_ENV === 'development' && nodemailer.getTestMessageUrl) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl?.(info) };
  } catch (error) {
    console.error('Email sending failed:', error);
    // Fallback to console logging
    console.log('=== EMAIL FALLBACK - CONSOLE LOGGING ===');
    console.log('TO:', studentEmail);
    console.log('Student Name:', studentName);
    console.log('Portal URL:', process.env.CLIENT_URL || 'http://localhost:5173/student');
    console.log('========================================');
    return { success: false, error: error.message };
  }
};

export const sendPaymentConfirmation = async (studentEmail, studentName, amount, paymentMode, receiptNumber) => {
  try {
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('Payment email: No transporter available');
      return { success: false, error: 'No email transporter available' };
    }
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'YAHODA LIVING <admin@yahoda.com>',
      to: studentEmail,
      subject: `Payment Confirmation - ₹${amount} Received`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Payment Received</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Thank you, ${studentName}!</h2>
            
            <p style="color: #666; line-height: 1.6;">
              We have received your payment of <strong>₹${amount}</strong> via ${paymentMode}.
            </p>
            
            <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px;">
              <p style="color: #666; margin: 10px 0;">
                <strong>Receipt Number:</strong> ${receiptNumber}<br>
                <strong>Amount:</strong> ₹${amount}<br>
                <strong>Payment Mode:</strong> ${paymentMode}<br>
                <strong>Date:</strong> ${new Date().toLocaleDateString()}
              </p>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
              You can view your payment history in your student portal.
            </p>
          </div>
        </div>
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Payment confirmation email sent:', info.messageId);
    
    if (process.env.NODE_ENV === 'development' && nodemailer.getTestMessageUrl) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl?.(info) };
  } catch (error) {
    console.error('Payment email sending failed:', error);
    return { success: false, error: error.message };
  }
};

export const sendPaymentReminder = async (studentEmail, studentName, amount, dueDate) => {
  try {
    const transporter = await createTransporter();
    
    if (!transporter) {
      console.log('Reminder email: No transporter available');
      return { success: false, error: 'No email transporter available' };
    }
    
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'YAHODA LIVING <admin@yahoda.com>',
      to: studentEmail,
      subject: 'Payment Reminder - YAHODA LIVING',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 28px;">Payment Reminder</h1>
          </div>
          
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Hello, ${studentName}!</h2>
            
            <p style="color: #666; line-height: 1.6;">
              This is a friendly reminder that you have an upcoming payment due.
            </p>
            
            <div style="background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 4px;">
              <p style="color: #666; margin: 10px 0;">
                <strong>Amount Due:</strong> ₹${amount}<br>
                <strong>Due Date:</strong> ${new Date(dueDate).toLocaleDateString()}
              </p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${clientUrl}/student" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                Make Payment Now
              </a>
            </div>
            
            <p style="color: #999; font-size: 12px; text-align: center; margin-top: 30px;">
              If you have already made this payment, please disregard this notice.
            </p>
          </div>
        </div>
      `,
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Payment reminder email sent:', info.messageId);
    
    if (process.env.NODE_ENV === 'development' && nodemailer.getTestMessageUrl) {
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    }
    
    return { success: true, messageId: info.messageId, previewUrl: nodemailer.getTestMessageUrl?.(info) };
  } catch (error) {
    console.error('Reminder email sending failed:', error);
    return { success: false, error: error.message };
  }
};

export const testEmailConfig = async () => {
  try {
    const transporter = await createTransporter();
    if (!transporter) {
      return false;
    }
    await transporter.verify();
    console.log('Email configuration is valid');
    return true;
  } catch (error) {
    console.error('Email configuration error:', error);
    return false;
  }
};

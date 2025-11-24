const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { Resend } = require('resend');
const sgMail = require('@sendgrid/mail');
const User = require('../models/User');

// Temporary storage for verification codes (in production, use Redis or database)
const verificationCodes = new Map();

// Email configuration - support SendGrid, Resend, and SMTP
let emailService;
let transporter;

if (process.env.SENDGRID_API_KEY) {
  // Use SendGrid for production (100 emails/day free)
  emailService = 'sendgrid';
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  console.log('✅ Using SendGrid email service');
  
  transporter = {
    sendMail: async (options) => {
      try {
        console.log(`📧 Sending email via SendGrid to: ${options.to}`);
        const msg = {
          to: options.to,
          from: process.env.FROM_EMAIL || 'noreply@yourdomain.com',
          subject: options.subject,
          html: options.html,
        };
        const result = await sgMail.send(msg);
        console.log(`✅ SendGrid response:`, result[0].statusCode);
        return { success: true, result };
      } catch (error) {
        console.error(`❌ SendGrid error:`, error.response?.body || error);
        throw error;
      }
    }
  };
} else if (process.env.RESEND_API_KEY) {
  // Use Resend for production (works on Render free tier)
  emailService = 'resend';
  const resend = new Resend(process.env.RESEND_API_KEY);
  console.log('✅ Using Resend email service');
  
  // Create a compatible interface
  transporter = {
    sendMail: async (options) => {
      try {
        console.log(`📧 Sending email via Resend to: ${options.to}`);
        const data = await resend.emails.send({
          from: process.env.FROM_EMAIL || 'QBox <onboarding@resend.dev>',
          to: [options.to],
          subject: options.subject,
          html: options.html,
        });
        console.log(`✅ Resend response:`, data);
        return { success: true, data };
      } catch (error) {
        console.error(`❌ Resend error:`, error);
        throw error;
      }
    }
  };
} else if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
  // Use SMTP for local development
  emailService = 'smtp';
  transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  
  // Verify email configuration on startup
  transporter.verify((error, success) => {
    if (error) {
      console.log('⚠️ Email configuration error:', error.message);
    } else {
      console.log('✅ SMTP email server is ready');
    }
  });
} else {
  console.log('⚠️ No email service configured');
}

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @route   POST /api/auth/send-verification
// @desc    Send verification code to email
// @access  Public
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email address' 
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with expiry (5 minutes)
    verificationCodes.set(email, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
    });

    // Send email
    let emailSent = false;
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL || `"QBox Team" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'QBox - Email Verification Code',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6; 
                  color: #1a1a1a;
                  margin: 0;
                  padding: 0;
                  background-color: #f5f5f5;
                }
                .container { 
                  max-width: 600px; 
                  margin: 40px auto; 
                  background: white;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
                }
                .header { 
                  background: #6C63FF;
                  color: white; 
                  padding: 40px 30px;
                  text-align: center;
                }
                .brand {
                  font-size: 32px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  letter-spacing: 2px;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 600;
                }
                .content { 
                  padding: 40px 30px;
                  background: white;
                }
                .content h2 {
                  color: #1a1a1a;
                  font-size: 24px;
                  margin-top: 0;
                  margin-bottom: 20px;
                }
                .code-box { 
                  background: #f8f9ff;
                  border: 2px solid #6C63FF;
                  border-radius: 8px;
                  padding: 30px;
                  text-align: center;
                  margin: 30px 0;
                }
                .code { 
                  font-size: 36px;
                  font-weight: bold;
                  color: #6C63FF;
                  letter-spacing: 8px;
                  font-family: 'Courier New', monospace;
                }
                .info-text {
                  color: #666;
                  font-size: 14px;
                  line-height: 1.8;
                  margin: 15px 0;
                }
                .expiry-notice {
                  background: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .expiry-notice strong {
                  color: #856404;
                }
                .footer { 
                  text-align: center;
                  padding: 30px;
                  background: #f8f9fa;
                  color: #666;
                  font-size: 12px;
                  border-top: 1px solid #e9ecef;
                }
                .footer p {
                  margin: 5px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="brand">QBOX</div>
                  <p style="margin: 0; font-size: 14px; opacity: 0.9;">Interactive Q&A Platform</p>
                </div>
                <div class="content">
                  <h2>Welcome to QBox!</h2>
                  <p class="info-text">Thank you for signing up. To complete your registration, please use the verification code below:</p>
                  
                  <div class="code-box">
                    <div class="code">${code}</div>
                  </div>
                  
                  <div class="expiry-notice">
                    <strong>⏰ Important:</strong> This code will expire in 5 minutes.
                  </div>
                  
                  <p class="info-text">If you didn't request this code, please ignore this email and your account will remain secure.</p>
                </div>
                <div class="footer">
                  <p><strong>QBox</strong> - Interactive Q&A Platform</p>
                  <p>This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        emailSent = true;
        console.log(`Verification code sent to ${email}`);
      } catch (emailError) {
        console.error('Email send error:', emailError.message);
        // Continue even if email fails - code will be shown in development
      }
    }

    res.status(200).json({
      success: true,
      message: emailSent ? 'Verification code sent to email' : 'Verification code generated',
      code: process.env.NODE_ENV !== 'production' || !emailSent ? code : undefined, // Show code if email wasn't sent
      emailSent
    });
  } catch (error) {
    console.error('Send Verification Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error sending verification code',
      error: error.message 
    });
  }
});

// @route   POST /api/auth/verify-code
// @desc    Verify the code sent to email
// @access  Public
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and verification code' 
      });
    }

    const stored = verificationCodes.get(email);
    
    if (!stored) {
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code not found or expired' 
      });
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'Verification code has expired' 
      });
    }

    if (stored.code !== code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid verification code' 
      });
    }

    // Code is valid, remove it
    verificationCodes.delete(email);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    console.error('Verify Code Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error verifying code',
      error: error.message 
    });
  }
});

// @route   POST /api/auth/signup
// @desc    Register a new lecturer/admin
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide name, email and password' 
      });
    }

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ 
        success: false, 
        message: 'User already exists with this email' 
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role: role || 'lecturer'
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Signup Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during signup',
      error: error.message 
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login lecturer/admin
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }

    // Check if user exists (include password for comparison)
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isPasswordMatch = await user.comparePassword(password);
    if (!isPasswordMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid credentials' 
      });
    }

    // Generate token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during login',
      error: error.message 
    });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send password reset code
// @access  Public
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide an email' 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'No account found with this email' 
      });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store code with 10 minute expiration
    verificationCodes.set(email, {
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
      type: 'password-reset'
    });

    // Send email
    let emailSent = false;
    if (transporter) {
      try {
        await transporter.sendMail({
          from: process.env.FROM_EMAIL || `QBox <${process.env.EMAIL_USER}>`,
          to: email,
          subject: 'QBox - Password Reset Code',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  line-height: 1.6;
                  margin: 0;
                  padding: 0;
                  background-color: #f5f5f5;
                }
                .container { 
                  max-width: 600px;
                  margin: 0 auto;
                  background: white;
                }
                .header { 
                  background: #6C63FF;
                  color: white; 
                  padding: 40px 30px;
                  text-align: center;
                }
                .brand {
                  font-size: 32px;
                  font-weight: bold;
                  margin-bottom: 10px;
                  letter-spacing: 2px;
                }
                .header h1 {
                  margin: 0;
                  font-size: 28px;
                  font-weight: 600;
                }
                .content { 
                  padding: 40px 30px;
                  color: #333;
                }
                .content h2 {
                  color: #6C63FF;
                  margin-top: 0;
                }
                .info-text {
                  margin: 15px 0;
                  color: #666;
                }
                .code-box {
                  background: #f8f9fa;
                  border: 2px dashed #6C63FF;
                  border-radius: 8px;
                  padding: 20px;
                  text-align: center;
                  margin: 30px 0;
                }
                .code {
                  font-size: 36px;
                  font-weight: bold;
                  letter-spacing: 8px;
                  color: #6C63FF;
                  font-family: 'Courier New', monospace;
                }
                .expiry-notice {
                  background: #fff3cd;
                  border-left: 4px solid #ffc107;
                  padding: 15px;
                  margin: 20px 0;
                  border-radius: 4px;
                }
                .expiry-notice strong {
                  color: #856404;
                }
                .footer { 
                  text-align: center;
                  padding: 30px;
                  background: #f8f9fa;
                  color: #666;
                  font-size: 12px;
                  border-top: 1px solid #e9ecef;
                }
                .footer p {
                  margin: 5px 0;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="brand">QBOX</div>
                  <p style="margin: 0; font-size: 14px; opacity: 0.9;">Interactive Q&A Platform</p>
                </div>
                <div class="content">
                  <h2>Password Reset Request</h2>
                  <p class="info-text">You requested to reset your password. Use the code below to reset your password:</p>
                  
                  <div class="code-box">
                    <div class="code">${code}</div>
                  </div>
                  
                  <div class="expiry-notice">
                    <strong>⏰ Important:</strong> This code will expire in 10 minutes.
                  </div>
                  
                  <p class="info-text">If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
                </div>
                <div class="footer">
                  <p><strong>QBox</strong> - Interactive Q&A Platform</p>
                  <p>This is an automated message. Please do not reply to this email.</p>
                </div>
              </div>
            </body>
            </html>
          `
        });
        emailSent = true;
        console.log(`Password reset code sent to ${email}`);
      } catch (emailError) {
        console.error('Email send error:', emailError.message);
      }
    }

    res.status(200).json({
      success: true,
      message: emailSent ? 'Password reset code sent to email' : 'Password reset code generated',
      emailSent
    });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error sending password reset code',
      error: error.message 
    });
  }
});

// @route   POST /api/auth/reset-password
// @desc    Reset password with code
// @access  Public
router.post('/reset-password', async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;

    if (!email || !code || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email, code, and new password' 
      });
    }

    // Verify code
    const stored = verificationCodes.get(email);
    
    if (!stored || stored.type !== 'password-reset') {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid or expired reset code' 
      });
    }

    if (Date.now() > stored.expiresAt) {
      verificationCodes.delete(email);
      return res.status(400).json({ 
        success: false, 
        message: 'Reset code has expired' 
      });
    }

    if (stored.code !== code) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid reset code' 
      });
    }

    // Find user and update password
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    // Set new password
    user.password = newPassword;
    await user.save();

    // Remove used code
    verificationCodes.delete(email);

    // Generate new token
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'Password reset successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Reset Password Error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error resetting password',
      error: error.message 
    });
  }
});

module.exports = router;

require('dotenv').config();
const prisma = require('../utils/prisma');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const sendOTP = async (req, res) => {
  try {
    const { name, email } = req.body;
    console.log('Step 1 - Received:', name, email);

    if (!name || !email) {
      return res.status(400).json({
        error: 'Name and email required'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Please enter a valid email address'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      console.log('Email already exists:', email);
      return res.status(409).json({
        error: 'This email is already registered. Please login instead.'
      });
    }

    console.log('Step 2 - Generating OTP...');
    const otp = Math.floor(
      100000 + Math.random() * 900000
    ).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    console.log('Step 3 - OTP generated:', otp);

    console.log('Step 4 - Saving OTP to database...');
    try {
      await prisma.oTP.deleteMany({ where: { email } });
      await prisma.oTP.create({
        data: { email, otp, expiresAt, used: false }
      });
      console.log('Step 4 - OTP saved!');
    } catch (dbErr) {
      console.error('DB Error:', dbErr.message);
      return res.status(500).json({
        error: 'Database error: ' + dbErr.message
      });
    }

    console.log('Step 5 - Sending email to:', email);
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'PaperPilot - Verification Code',
        html: `
          <div style="font-family:Arial,sans-serif;
                      max-width:400px;margin:0 auto;
                      padding:24px;">
            <h2 style="color:#10b981;">PaperPilot</h2>
            <p>Hello ${name},</p>
            <p>Your verification code is:</p>
            <div style="font-size:32px;font-weight:bold;
                        color:#10b981;letter-spacing:8px;
                        text-align:center;padding:16px;
                        background:#ecfdf5;
                        border-radius:8px;margin:16px 0;">
              ${otp}
            </div>
            <p>This code expires in 10 minutes.</p>
          </div>
        `
      });
      console.log('Step 5 - Email sent to:', email);
    } catch (emailErr) {
      console.error('Email Error:', emailErr.message);
      return res.status(500).json({
        error: 'Email failed: ' + emailErr.message
      });
    }

    console.log('Step 6 - All done!');
    return res.status(200).json({
      success: true,
      message: 'Verification code sent to ' + email
    });

  } catch (error) {
    console.error('sendOTP crashed:', error.message);
    console.error(error.stack);
    return res.status(500).json({
      error: error.message
    });
  }
};

const verifyOTPAndRegister = async (req, res) => {
  try {
    const { name, email, otp, password } = req.body;
    console.log('Verify OTP - Email:', email, 'OTP:', otp);

    if (!name || !email || !otp || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters'
      });
    }

    const otpString = otp.toString().trim();
    console.log('Looking for OTP:', otpString, 'email:', email);

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email: email,
        otp: otpString,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    console.log('OTP record found:', otpRecord ? 'YES' : 'NO');

    if (!otpRecord) {
      const expiredRecord = await prisma.oTP.findFirst({
        where: { email, otp: otpString }
      });
      if (expiredRecord && expiredRecord.used) {
        return res.status(400).json({
          error: 'This code has already been used.'
        });
      }
      if (expiredRecord && expiredRecord.expiresAt < new Date()) {
        return res.status(400).json({
          error: 'Code has expired. Please request a new one.'
        });
      }
      return res.status(400).json({
        error: 'Invalid code. Please check and try again.'
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    if (existingUser) {
      return res.status(409).json({
        error: 'Email already registered. Please login.'
      });
    }

    await prisma.oTP.update({
      where: { id: otpRecord.id },
      data: { used: true }
    });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        authProvider: 'local'
      }
    });
    console.log('User created:', user.id);

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });

  } catch (error) {
    console.error('=== verifyOTPAndRegister ERROR ===', error.message);
    console.error(error.stack);
    return res.status(500).json({
      error: 'Registration failed: ' + error.message
    });
  }
};

const verifyOTPOnly = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log('=== VERIFY OTP ONLY ===');
    console.log('Email:', email, 'OTP:', otp);

    if (!email || !otp) {
      return res.status(400).json({
        error: 'Email and OTP required'
      });
    }

    const otpString = otp.toString().trim();
    console.log('Looking for OTP:', otpString);

    const otpRecord = await prisma.oTP.findFirst({
      where: {
        email: email,
        otp: otpString,
        used: false,
        expiresAt: { gt: new Date() }
      }
    });

    console.log('OTP found:', otpRecord ? 'YES' : 'NO');

    if (!otpRecord) {
      return res.status(400).json({
        error: 'Invalid or expired code. Please request a new one.'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'OTP verified'
    });

  } catch (error) {
    console.error('verifyOTPOnly error:', error.message);
    return res.status(500).json({
      error: 'Verification failed: ' + error.message
    });
  }
};

module.exports = {
  sendOTP,
  verifyOTPOnly,
  verifyOTPAndRegister
};

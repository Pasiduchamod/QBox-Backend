const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// Initialize Google OAuth client
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

console.log('✅ Google OAuth client initialized');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d'
  });
};

// @route   POST /api/auth/google
// @desc    Login/signup with Google
// @access  Public
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({ 
        success: false, 
        message: 'Google ID token is required' 
      });
    }

    // Verify Google token
    let ticket;
    try {
      ticket = await googleClient.verifyIdToken({
        idToken,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
    } catch (error) {
      console.error('❌ Google token verification failed:', error.message);
      return res.status(401).json({ 
        success: false, 
        message: 'Invalid Google token' 
      });
    }

    const payload = ticket.getPayload();
    const { email, name, sub: googleId } = payload;

    // Check if user exists
    let user = await User.findOne({ email });

    if (user) {
      // Existing user - update Google ID if not set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // Create new user
      user = await User.create({
        fullName: name,
        email,
        googleId,
        password: `google_${googleId}_${Date.now()}`, // Random password (not used)
        role: 'student' // Default role
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
          fullName: user.fullName,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('❌ Google auth error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error during Google authentication' 
    });
  }
});

// @route   POST /api/auth/signup
// @desc    Register a new user (fallback - Google Sign-In preferred)
// @access  Public
router.post('/signup', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    // Validation
    if (!fullName || !email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide full name, email and password' 
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
      fullName,
      email,
      password,
      role: role || 'student'
    });

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
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
// @desc    Login user (fallback - Google Sign-In preferred)
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

    // Find user
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
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role
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

module.exports = router;

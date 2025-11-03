const express = require('express');
const passport = require('passport');
const { protect } = require('../middleware/auth');
const { sendTokenResponse } = require('../utils/jwt');
const User = require('../models/User');

const router = express.Router();

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Public
router.get('/me', async (req, res) => {
  try {
    // Check for token in header
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      // Return a default user for public access
      return res.status(200).json({
        success: true,
        data: {
          _id: 'public-user',
          name: 'Public User',
          email: 'public@example.com',
          role: 'user'
        }
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        // Return default user if token is invalid
        return res.status(200).json({
          success: true,
          data: {
            _id: 'public-user',
            name: 'Public User',
            email: 'public@example.com',
            role: 'user'
          }
        });
      }

      res.status(200).json({
        success: true,
        data: user
      });
    } catch (tokenError) {
      // Return default user if token verification fails
      res.status(200).json({
        success: true,
        data: {
          _id: 'public-user',
          name: 'Public User',
          email: 'public@example.com',
          role: 'user'
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Update user details
// @route   PUT /api/auth/updatedetails
// @access  Private
router.put('/updatedetails', protect, async (req, res) => {
  try {
    const fieldsToUpdate = {
      name: req.body.name,
      email: req.body.email
    };

    const user = await User.findByIdAndUpdate(req.user._id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Update password
// @route   PUT /api/auth/updatepassword
// @access  Private
router.put('/updatepassword', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('+password');

    // Check current password
    if (!(await user.comparePassword(req.body.currentPassword))) {
      return res.status(401).json({
        success: false,
        message: 'Password is incorrect'
      });
    }

    user.password = req.body.newPassword;
    await user.save();

    sendTokenResponse(user, 200, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Logout user / clear cookie
// @route   GET /api/auth/logout
// @access  Private
router.get('/logout', (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Delete user account
// @route   DELETE /api/auth/deleteaccount
// @access  Private
router.delete('/deleteaccount', protect, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);

    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000),
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home
    sendTokenResponse(req.user, 200, res);
  }
);

// Google Calendar OAuth routes
router.get('/google/calendar',
  passport.authenticate('google-calendar', {
    scope: ['https://www.googleapis.com/auth/calendar.readonly', 'https://www.googleapis.com/auth/calendar.events'],
    accessType: 'offline',
    prompt: 'consent'
  })
);

router.get('/google/calendar/callback',
  passport.authenticate('google-calendar', { failureRedirect: '/preferences' }),
  async (req, res) => {
    try {
      // Store the tokens in user preferences or separate integration model
      const user = req.user;
      const tokens = req.authInfo;

      // Update user with Google Calendar tokens
      await User.findByIdAndUpdate(user._id, {
        googleCalendarTokens: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expiry_date: tokens.expiry_date
        },
        googleCalendarIntegrated: true,
        lastGoogleCalendarSync: new Date()
      });

      // Redirect back to preferences page
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/preferences?tab=integrations&calendar=connected`);
    } catch (error) {
      console.error('Google Calendar OAuth callback error:', error);
      res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/preferences?tab=integrations&calendar=error`);
    }
  }
);

module.exports = router;
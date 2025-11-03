const express = require('express');
const { protect } = require('../middleware/auth');
const OpenAI = require('openai');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const User = require('../models/User');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Helper function to get Google Calendar client
const getGoogleCalendarClient = (tokens) => {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/calendar/callback`
  );

  oauth2Client.setCredentials({
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expiry_date: tokens.expiry_date
  });

  return google.calendar({ version: 'v3', auth: oauth2Client });
};

// @desc    Invoke LLM
// @route   POST /api/integrations/llm
// @access  Private
router.post('/llm', async (req, res) => {
  try {
    const { prompt, model = 'gpt-3.5-turbo', maxTokens = 1000 } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    const completion = await openai.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.7
    });

    const response = completion.choices[0].message.content;

    res.status(200).json({
      success: true,
      data: {
        response,
        usage: completion.usage
      }
    });
  } catch (error) {
    console.error('OpenAI API error:', error);
    res.status(500).json({
      success: false,
      message: 'LLM service error',
      error: error.message
    });
  }
});

// @desc    Send email
// @route   POST /api/integrations/email
// @access  Private
router.post('/email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        message: 'To, subject, and text/html are required'
      });
    }

    // Create transporter
    const transporter = nodemailer.createTransporter({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Send email
    const info = await transporter.sendMail({
      from: `"Timelit" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      text,
      html
    });

    res.status(200).json({
      success: true,
      data: {
        messageId: info.messageId
      }
    });
  } catch (error) {
    console.error('Email service error:', error);
    res.status(500).json({
      success: false,
      message: 'Email service error',
      error: error.message
    });
  }
});

// @desc    Generate image (placeholder - would need DALL-E or similar)
// @route   POST /api/integrations/image
// @access  Private
router.post('/image', async (req, res) => {
  try {
    const { prompt, size = '1024x1024' } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size,
      quality: 'standard',
      n: 1
    });

    res.status(200).json({
      success: true,
      data: {
        url: response.data[0].url
      }
    });
  } catch (error) {
    console.error('Image generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Image generation error',
      error: error.message
    });
  }
});

// @desc    Upload file (placeholder - would need cloud storage)
// @route   POST /api/integrations/upload
// @access  Private
router.post('/upload', (req, res) => {
  // This would require multer setup and cloud storage integration
  // For now, return a placeholder response
  res.status(200).json({
    success: true,
    message: 'File upload functionality would be implemented here',
    data: {
      url: 'https://example.com/uploaded-file'
    }
  });
});

// @desc    Create file signed URL (placeholder)
// @route   POST /api/integrations/signed-url
// @access  Private
router.post('/signed-url', (req, res) => {
  // This would create signed URLs for secure file access
  res.status(200).json({
    success: true,
    message: 'Signed URL functionality would be implemented here',
    data: {
      signedUrl: 'https://example.com/signed-file-url'
    }
  });
});

// @desc    Extract data from uploaded file (placeholder)
// @route   POST /api/integrations/extract-data
// @access  Private
router.post('/extract-data', async (req, res) => {
  try {
    const { fileUrl, extractionType } = req.body;

    // This would use AI to extract data from files
    // For now, return a placeholder response
    const mockData = {
      text: 'Extracted text content would appear here',
      metadata: {
        pages: 1,
        format: 'pdf'
      }
    };

    res.status(200).json({
      success: true,
      data: mockData
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Data extraction error',
      error: error.message
    });
  }
});

// @desc    Disconnect Google Calendar
// @route   POST /api/integrations/google-calendar/disconnect
// @access  Private
router.post('/google-calendar/disconnect', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.user._id, {
      googleCalendarTokens: null,
      googleCalendarIntegrated: false,
      googleCalendarSyncEnabled: false,
      lastGoogleCalendarSync: null
    });

    res.status(200).json({
      success: true,
      message: 'Google Calendar disconnected successfully'
    });
  } catch (error) {
    console.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google Calendar',
      error: error.message
    });
  }
});

// @desc    Sync Google Calendar
// @route   POST /api/integrations/google-calendar/sync
// @access  Private
router.post('/google-calendar/sync', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.googleCalendarTokens) {
      return res.status(400).json({
        success: false,
        message: 'Google Calendar not connected'
      });
    }

    const calendar = getGoogleCalendarClient(user.googleCalendarTokens);

    // Get upcoming events from Google Calendar
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });

    // Update last sync time
    await User.findByIdAndUpdate(req.user._id, {
      lastGoogleCalendarSync: new Date()
    });

    res.status(200).json({
      success: true,
      data: {
        events: response.data.items,
        syncedAt: new Date()
      }
    });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync Google Calendar',
      error: error.message
    });
  }
});

// @desc    Get Google Calendar events
// @route   GET /api/integrations/google-calendar/events
// @access  Private
router.get('/google-calendar/events', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.googleCalendarTokens) {
      return res.status(400).json({
        success: false,
        message: 'Google Calendar not connected'
      });
    }

    const calendar = getGoogleCalendarClient(user.googleCalendarTokens);
    const { timeMin, timeMax, maxResults = 250 } = req.query;

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin || new Date().toISOString(),
      timeMax,
      maxResults: parseInt(maxResults),
      singleEvents: true,
      orderBy: 'startTime'
    });

    res.status(200).json({
      success: true,
      data: response.data.items
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Google Calendar events',
      error: error.message
    });
  }
});

// @desc    Create event in Google Calendar
// @route   POST /api/integrations/google-calendar/events
// @access  Private
router.post('/google-calendar/events', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.googleCalendarTokens) {
      return res.status(400).json({
        success: false,
        message: 'Google Calendar not connected'
      });
    }

    const calendar = getGoogleCalendarClient(user.googleCalendarTokens);
    const { summary, description, start, end, location } = req.body;

    const event = {
      summary,
      description,
      start: {
        dateTime: start,
        timeZone: 'UTC'
      },
      end: {
        dateTime: end,
        timeZone: 'UTC'
      },
      location
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event
    });

    res.status(201).json({
      success: true,
      data: response.data
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Google Calendar event',
      error: error.message
    });
  }
});

module.exports = router;
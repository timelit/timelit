const express = require('express');
const { protect } = require('../middleware/auth');
const OpenAI = require('openai');
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

router.use(protect);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

router.post('/llm', async (req, res) => {
  try {
    const { prompt, model = 'gpt-3.5-turbo', maxTokens = 1000 } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Prompt is required'
      });
    }

    const mockResponse = `Mock LLM response for prompt: "${prompt}". This is a demo response since OpenAI API key is not configured.`;

    res.status(200).json({
      success: true,
      data: {
        response: mockResponse,
        usage: { prompt_tokens: prompt.length, completion_tokens: mockResponse.length, total_tokens: prompt.length + mockResponse.length }
      }
    });
  } catch (error) {
    logger.error('LLM API error:', error);
    res.status(500).json({
      success: false,
      message: 'LLM service failed'
    });
  }
});

router.post('/email', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;

    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({
        success: false,
        message: 'To, subject, and text/html are required'
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: process.env.EMAIL_PORT == 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

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
    logger.error('Email service error:', error);
    res.status(500).json({
      success: false,
      message: 'Email service failed'
    });
  }
});

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
    logger.error('Image generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Image generation failed'
    });
  }
});

router.post('/upload', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'File upload functionality not yet implemented',
    data: {
      url: 'https://example.com/uploaded-file'
    }
  });
});

router.post('/signed-url', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Signed URL functionality not yet implemented',
    data: {
      signedUrl: 'https://example.com/signed-file-url'
    }
  });
});

router.post('/extract-data', async (req, res) => {
  try {
    const { fileUrl, extractionType } = req.body;

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
    logger.error('Data extraction error:', error);
    res.status(500).json({
      success: false,
      message: 'Data extraction failed'
    });
  }
});

router.post('/google-calendar/disconnect', async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
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
    logger.error('Disconnect error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disconnect Google Calendar'
    });
  }
});

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

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime'
    });

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
    logger.error('Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to sync Google Calendar'
    });
  }
});

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
    logger.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get Google Calendar events'
    });
  }
});

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
    logger.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create Google Calendar event'
    });
  }
});

module.exports = router;

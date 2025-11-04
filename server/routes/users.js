const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const MoodEntry = require('../models/MoodEntry');
const PomodoroSession = require('../models/PomodoroSession');

const router = express.Router();

// All routes are now public for demo purposes
// router.use(protect);

// @desc    Get user preferences
// @route   GET /api/users/preferences
// @access  Private
router.get('/preferences', (req, res) => {
  // For demo purposes, return default preferences without database lookup
  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
router.put('/preferences', async (req, res) => {
  try {
    let user;
    if (req.user) {
      user = await User.findByIdAndUpdate(
        req.user._id,
        { preferences: req.body },
        { new: true, runValidators: true }
      );
    } else {
      // For demo purposes, just return the preferences without database update
      res.status(200).json({
        success: true,
        data: req.body
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: user.preferences
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Mood tracking routes

// @desc    Get mood entries
// @route   GET /api/users/mood
// @access  Private
router.get('/mood', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let query = {};
    if (req.user) {
      query.createdBy = req.user._id;
    }

    if (startDate && endDate) {
      query.date = {
        $gte: startDate,
        $lte: endDate
      };
    }

    const entries = await MoodEntry.find(query).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: entries.length,
      data: entries
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create or update mood entry
// @route   POST /api/users/mood
// @access  Private
router.post('/mood', async (req, res) => {
  try {
    const { date, rating, note, factors } = req.body;

    let query = { date };
    if (req.user) {
      query.createdBy = req.user._id;
    }

    const existingEntry = await MoodEntry.findOne(query);

    let entry;
    if (existingEntry) {
      entry = await MoodEntry.findByIdAndUpdate(
        existingEntry._id,
        { rating, note, factors },
        { new: true, runValidators: true }
      );
    } else {
      const entryData = {
        date,
        rating,
        note,
        factors
      };

      if (req.user) {
        entryData.createdBy = req.user._id;
      } else {
        entryData.createdBy = new mongoose.Types.ObjectId();
      }

      entry = await MoodEntry.create(entryData);
    }

    res.status(200).json({
      success: true,
      data: entry
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Pomodoro routes

// @desc    Get pomodoro sessions
// @route   GET /api/users/pomodoro
// @access  Private
router.get('/pomodoro', async (req, res) => {
  try {
    const { date } = req.query;

    let query = {};
    if (req.user) {
      query.createdBy = req.user._id;
    }

    if (date) {
      query.date = date;
    }

    const sessions = await PomodoroSession.find(query).sort({ date: -1 });

    res.status(200).json({
      success: true,
      count: sessions.length,
      data: sessions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Update pomodoro session
// @route   PUT /api/users/pomodoro/:date
// @access  Private
router.put('/pomodoro/:date', async (req, res) => {
  try {
    const { cyclesCompleted, totalFocusTime, totalBreakTime, sessions } = req.body;

    let query = { date: req.params.date };
    if (req.user) {
      query.createdBy = req.user._id;
    }

    let session = await PomodoroSession.findOne(query);

    if (session) {
      session.cyclesCompleted = cyclesCompleted;
      session.totalFocusTime = totalFocusTime;
      session.totalBreakTime = totalBreakTime;
      session.sessions = sessions;
      await session.save();
    } else {
      const sessionData = {
        date: req.params.date,
        cyclesCompleted,
        totalFocusTime,
        totalBreakTime,
        sessions
      };

      if (req.user) {
        sessionData.createdBy = req.user._id;
      } else {
        sessionData.createdBy = new mongoose.Types.ObjectId();
      }

      session = await PomodoroSession.create(sessionData);
    }

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;
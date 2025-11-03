const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const MoodEntry = require('../models/MoodEntry');
const PomodoroSession = require('../models/PomodoroSession');

const router = express.Router();

// All routes require authentication
router.use(protect);

// @desc    Get user preferences
// @route   GET /api/users/preferences
// @access  Private
router.get('/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

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

// @desc    Update user preferences
// @route   PUT /api/users/preferences
// @access  Private
router.put('/preferences', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { preferences: req.body },
      { new: true, runValidators: true }
    );

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

    let query = { createdBy: req.user._id };

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

    const existingEntry = await MoodEntry.findOne({
      createdBy: req.user._id,
      date
    });

    let entry;
    if (existingEntry) {
      entry = await MoodEntry.findByIdAndUpdate(
        existingEntry._id,
        { rating, note, factors },
        { new: true, runValidators: true }
      );
    } else {
      entry = await MoodEntry.create({
        date,
        rating,
        note,
        factors,
        createdBy: req.user._id
      });
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

    let query = { createdBy: req.user._id };

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

    let session = await PomodoroSession.findOne({
      createdBy: req.user._id,
      date: req.params.date
    });

    if (session) {
      session.cyclesCompleted = cyclesCompleted;
      session.totalFocusTime = totalFocusTime;
      session.totalBreakTime = totalBreakTime;
      session.sessions = sessions;
      await session.save();
    } else {
      session = await PomodoroSession.create({
        date: req.params.date,
        cyclesCompleted,
        totalFocusTime,
        totalBreakTime,
        sessions,
        createdBy: req.user._id
      });
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
const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const MoodEntry = require('../models/MoodEntry');
const PomodoroSession = require('../models/PomodoroSession');
const logger = require('../utils/logger');

const router = express.Router();

router.use(protect);

router.get('/preferences', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.status(200).json({
      success: true,
      data: user.preferences || {}
    });
  } catch (error) {
    logger.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get preferences'
    });
  }
});

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
    logger.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences'
    });
  }
});

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
    logger.error('Get mood entries error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mood entries'
    });
  }
});

router.post('/mood', async (req, res) => {
  try {
    const { date, rating, note, factors } = req.body;

    let query = { date, createdBy: req.user._id };

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
        factors,
        createdBy: req.user._id
      };

      entry = await MoodEntry.create(entryData);
    }

    res.status(200).json({
      success: true,
      data: entry
    });
  } catch (error) {
    logger.error('Create/update mood entry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save mood entry'
    });
  }
});

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
    logger.error('Get pomodoro sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch pomodoro sessions'
    });
  }
});

router.put('/pomodoro/:date', async (req, res) => {
  try {
    const { cyclesCompleted, totalFocusTime, totalBreakTime, sessions } = req.body;

    let query = { date: req.params.date, createdBy: req.user._id };

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
        sessions,
        createdBy: req.user._id
      };

      session = await PomodoroSession.create(sessionData);
    }

    res.status(200).json({
      success: true,
      data: session
    });
  } catch (error) {
    logger.error('Update pomodoro session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update pomodoro session'
    });
  }
});

module.exports = router;

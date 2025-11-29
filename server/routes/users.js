const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const logger = require('../utils/logger');

const router = express.Router();

router.use(protect);

router.get('/preferences', async (req, res) => {
  try {
    // Handle anonymous users - return default preferences
    if (!req.user._id || req.user._id === 'anonymous') {
      return res.status(200).json({
        success: true,
        data: {
          default_task_status: 'todo',
          default_task_priority: 'medium',
          auto_schedule_tasks_into_calendar: false,
          task_notes: '',
          event_categories: [
            {name: "work", color: "#3b82f6"},
            {name: "personal", color: "#8b5cf6"},
            {name: "meeting", color: "#ec4899"},
            {name: "appointment", color: "#10b981"},
            {name: "reminder", color: "#f59e0b"},
            {name: "travel", color: "#6366f1"},
            {name: "social", color: "#ef4444"}
          ]
        }
      });
    }

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


module.exports = router;

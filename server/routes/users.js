const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
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


module.exports = router;

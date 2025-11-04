const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Event = require('../models/Event');

const router = express.Router();

// All routes are now public for demo purposes
// router.use(protect);

// @desc    Get all events
// @route   GET /api/events
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { start, end, category } = req.query;

    let query = {};
    if (req.user) {
      query.createdBy = req.user._id;
    } else {
      // For demo purposes, allow public access but don't filter by createdBy
      // This allows the frontend to work without authentication
    }

    // Filter by date range
    if (start && end) {
      query.startTime = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    const events = await Event.find(query).sort({ startTime: 1 });

    res.status(200).json({
      success: true,
      count: events.length,
      data: events
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user) {
      query.createdBy = req.user._id;
    }

    const event = await Event.findOne(query);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create new event
// @route   POST /api/events
// @access  Private
router.post('/', async (req, res) => {
  try {
    const eventData = {
      ...req.body
    };

    if (req.user) {
      eventData.createdBy = req.user._id;
    } else {
      // For demo purposes, create a dummy ObjectId
      eventData.createdBy = new mongoose.Types.ObjectId();
    }

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user) {
      query.createdBy = req.user._id;
    }

    const event = await Event.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    );

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      data: event
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user) {
      query.createdBy = req.user._id;
    }

    const event = await Event.findOneAndDelete(query);

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

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

// @desc    Bulk create events
// @route   POST /api/events/bulk
// @access  Private
router.post('/bulk', async (req, res) => {
  try {
    const { events } = req.body;

    if (!Array.isArray(events)) {
      return res.status(400).json({
        success: false,
        message: 'Events must be an array'
      });
    }

    const eventsWithUser = events.map(event => ({
      ...event,
      createdBy: req.user ? req.user._id : new mongoose.Types.ObjectId()
    }));

    const createdEvents = await Event.insertMany(eventsWithUser);

    res.status(201).json({
      success: true,
      count: createdEvents.length,
      data: createdEvents
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
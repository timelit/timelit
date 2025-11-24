const express = require('express');
const { protect } = require('../middleware/auth');
const Event = require('../models/Event');
const logger = require('../utils/logger');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { start, end, category } = req.query;

    let query = { createdBy: req.user._id };

    if (start && end) {
      query.startTime = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    }

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
    logger.error('Get events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch events'
    });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

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
    logger.error('Get event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch event'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const eventData = {
      ...req.body,
      createdBy: req.user._id
    };

    const event = await Event.create(eventData);

    res.status(201).json({
      success: true,
      data: event
    });
  } catch (error) {
    logger.error('Create event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create event'
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const event = await Event.findOneAndUpdate(
      { _id: req.params.id, createdBy: req.user._id },
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
    logger.error('Update event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update event'
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const event = await Event.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    logger.error('Delete event error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete event'
    });
  }
});

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
      createdBy: req.user._id
    }));

    const createdEvents = await Event.insertMany(eventsWithUser);

    res.status(201).json({
      success: true,
      count: createdEvents.length,
      data: createdEvents
    });
  } catch (error) {
    logger.error('Bulk create events error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create events'
    });
  }
});

module.exports = router;

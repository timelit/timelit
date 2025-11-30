const express = require('express');
const { protect } = require('../middleware/auth');
const SchedulingTask = require('../models/SchedulingTask');
const SchedulingResource = require('../models/SchedulingResource');
const SchedulingConstraint = require('../models/SchedulingConstraint');
const Schedule = require('../models/Schedule');
const AdvancedScheduler = require('../utils/Scheduler');
const logger = require('../utils/logger');

const router = express.Router();

router.use(protect);

// Task Management
router.get('/tasks', async (req, res) => {
  try {
    const { status, priority, resourceId } = req.query;
    let query = { createdBy: req.user._id };

    if (req.user._id === 'anonymous') {
      query = {};
    }

    if (status) query.status = status;
    if (priority) query.priority = { $gte: parseInt(priority) };
    if (resourceId) {
      query.$or = [
        { requiredResources: resourceId },
        { optionalResources: resourceId }
      ];
    }

    const tasks = await SchedulingTask.find(query)
      .populate('requiredResources', 'name type')
      .populate('optionalResources', 'name type')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    logger.error('Get scheduling tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduling tasks'
    });
  }
});

router.post('/tasks', async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user._id !== 'anonymous' ? req.user._id : null
    };

    const task = await SchedulingTask.create(taskData);

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Create scheduling task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scheduling task'
    });
  }
});

router.put('/tasks/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    const task = await SchedulingTask.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    ).populate('requiredResources', 'name type')
     .populate('optionalResources', 'name type');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Scheduling task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Update scheduling task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update scheduling task'
    });
  }
});

router.delete('/tasks/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    const task = await SchedulingTask.findOneAndDelete(query);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Scheduling task not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Scheduling task deleted successfully'
    });
  } catch (error) {
    logger.error('Delete scheduling task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete scheduling task'
    });
  }
});

// Resource Management
router.get('/resources', async (req, res) => {
  try {
    const { type, available } = req.query;
    let query = { createdBy: req.user._id };

    if (req.user._id === 'anonymous') {
      query = {};
    }

    if (type) query.type = type;
    if (available === 'true') query.isActive = true;

    const resources = await SchedulingResource.find(query)
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: resources.length,
      data: resources
    });
  } catch (error) {
    logger.error('Get scheduling resources error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduling resources'
    });
  }
});

router.post('/resources', async (req, res) => {
  try {
    const resourceData = {
      ...req.body,
      createdBy: req.user._id !== 'anonymous' ? req.user._id : null
    };

    const resource = await SchedulingResource.create(resourceData);

    res.status(201).json({
      success: true,
      data: resource
    });
  } catch (error) {
    logger.error('Create scheduling resource error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scheduling resource'
    });
  }
});

// Constraint Management
router.get('/constraints', async (req, res) => {
  try {
    const { type, category } = req.query;
    let query = { createdBy: req.user._id };

    if (req.user._id === 'anonymous') {
      query = {};
    }

    if (type) query.type = type;
    if (category) query.category = category;

    const constraints = await SchedulingConstraint.find(query)
      .sort({ priority: -1, name: 1 });

    res.status(200).json({
      success: true,
      count: constraints.length,
      data: constraints
    });
  } catch (error) {
    logger.error('Get scheduling constraints error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch scheduling constraints'
    });
  }
});

router.post('/constraints', async (req, res) => {
  try {
    const constraintData = {
      ...req.body,
      createdBy: req.user._id !== 'anonymous' ? req.user._id : null
    };

    const constraint = await SchedulingConstraint.create(constraintData);

    res.status(201).json({
      success: true,
      data: constraint
    });
  } catch (error) {
    logger.error('Create scheduling constraint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create scheduling constraint'
    });
  }
});

// Schedule Generation
router.post('/generate-schedule', async (req, res) => {
  try {
    const {
      taskIds,
      resourceIds,
      constraintIds,
      timeRange,
      options = {}
    } = req.body;

    if (!taskIds || !timeRange || !timeRange.start || !timeRange.end) {
      return res.status(400).json({
        success: false,
        message: 'Task IDs and time range are required'
      });
    }

    // Fetch tasks
    let taskQuery = { _id: { $in: taskIds } };
    if (req.user._id !== 'anonymous') {
      taskQuery.createdBy = req.user._id;
    }
    const tasks = await SchedulingTask.find(taskQuery);

    // Fetch resources
    let resourceQuery = resourceIds ? { _id: { $in: resourceIds } } : {};
    if (req.user._id !== 'anonymous') {
      resourceQuery.createdBy = req.user._id;
    }
    const resources = await SchedulingResource.find(resourceQuery);

    // Fetch constraints
    let constraintQuery = constraintIds ? { _id: { $in: constraintIds } } : {};
    if (req.user._id !== 'anonymous') {
      constraintQuery.createdBy = req.user._id;
    }
    const constraints = await SchedulingConstraint.find(constraintQuery);

    // Generate schedule
    const scheduler = new AdvancedScheduler(options);
    const scheduleData = await scheduler.generateSchedule(
      tasks,
      resources,
      constraints,
      timeRange
    );

    // Save schedule to database
    const schedule = await Schedule.create({
      ...scheduleData,
      createdBy: req.user._id !== 'anonymous' ? req.user._id : null
    });

    res.status(201).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    logger.error('Generate schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate schedule'
    });
  }
});

// Get Schedules
router.get('/schedules', async (req, res) => {
  try {
    const { status, limit = 50 } = req.query;
    let query = { createdBy: req.user._id };

    if (req.user._id === 'anonymous') {
      query = {};
    }

    if (status) query.status = status;

    const schedules = await Schedule.find(query)
      .populate('constraints.hard', 'name type category')
      .populate('constraints.soft', 'name type category')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.status(200).json({
      success: true,
      count: schedules.length,
      data: schedules
    });
  } catch (error) {
    logger.error('Get schedules error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedules'
    });
  }
});

router.get('/schedules/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    const schedule = await Schedule.findOne(query)
      .populate('slots.taskId', 'title description priority')
      .populate('slots.resourceIds', 'name type')
      .populate('constraints.hard', 'name type category')
      .populate('constraints.soft', 'name type category');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    logger.error('Get schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch schedule'
    });
  }
});

// Update Schedule Status
router.put('/schedules/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['draft', 'scheduled', 'executing', 'completed', 'cancelled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    let query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    const schedule = await Schedule.findOneAndUpdate(
      query,
      { status },
      { new: true }
    );

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (error) {
    logger.error('Update schedule status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update schedule status'
    });
  }
});

// Get Available Slots
router.post('/available-slots', async (req, res) => {
  try {
    const { resourceIds, duration, constraints, timeRange, count = 10 } = req.body;

    if (!resourceIds || !duration || !timeRange) {
      return res.status(400).json({
        success: false,
        message: 'Resource IDs, duration, and time range are required'
      });
    }

    // Fetch resources
    let resourceQuery = { _id: { $in: resourceIds } };
    if (req.user._id !== 'anonymous') {
      resourceQuery.createdBy = req.user._id;
    }
    const resources = await SchedulingResource.find(resourceQuery);

    // Fetch constraints
    let constraintQuery = constraints ? { _id: { $in: constraints } } : {};
    if (req.user._id !== 'anonymous') {
      constraintQuery.createdBy = req.user._id;
    }
    const constraintDocs = await SchedulingConstraint.find(constraintQuery);

    // Generate available slots
    const scheduler = new AdvancedScheduler();
    const availableSlots = await scheduler.findAvailableSlots(
      resources,
      duration,
      constraintDocs,
      timeRange,
      count
    );

    res.status(200).json({
      success: true,
      count: availableSlots.length,
      data: availableSlots
    });
  } catch (error) {
    logger.error('Get available slots error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to find available slots'
    });
  }
});

// Schedule Optimization
router.post('/schedules/:id/optimize', async (req, res) => {
  try {
    const { optimizationGoals } = req.body;

    let query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    const schedule = await Schedule.findOne(query)
      .populate('slots.taskId')
      .populate('slots.resourceIds');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    // Apply optimization
    const scheduler = new AdvancedScheduler();
    const optimizedSchedule = await scheduler.optimizeSchedule(schedule, optimizationGoals);

    // Update schedule in database
    const updatedSchedule = await Schedule.findByIdAndUpdate(
      req.params.id,
      {
        slots: optimizedSchedule.slots,
        optimizationScore: optimizedSchedule.optimizationScore,
        metadata: {
          ...schedule.metadata,
          ...optimizedSchedule.metadata
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      data: updatedSchedule
    });
  } catch (error) {
    logger.error('Optimize schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to optimize schedule'
    });
  }
});

// Schedule Validation
router.post('/schedules/:id/validate', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    const schedule = await Schedule.findOne(query)
      .populate('slots.taskId')
      .populate('slots.resourceIds')
      .populate('constraints.hard')
      .populate('constraints.soft');

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const scheduler = new AdvancedScheduler();
    const validationReport = await scheduler.validateSchedule(schedule);

    res.status(200).json({
      success: true,
      data: validationReport
    });
  } catch (error) {
    logger.error('Validate schedule error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to validate schedule'
    });
  }
});

// Get Schedule Metrics
router.get('/schedules/:id/metrics', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    const schedule = await Schedule.findOne(query);

    if (!schedule) {
      return res.status(404).json({
        success: false,
        message: 'Schedule not found'
      });
    }

    const scheduler = new AdvancedScheduler();
    const metrics = scheduler.getScheduleMetrics(schedule);

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    logger.error('Get schedule metrics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get schedule metrics'
    });
  }
});

module.exports = router;
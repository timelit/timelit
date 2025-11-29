const express = require('express');
const { protect } = require('../middleware/auth');
const Task = require('../models/Task');
const TaskList = require('../models/TaskList');
const logger = require('../utils/logger');

const router = express.Router();

router.use(protect);

router.get('/', async (req, res) => {
  try {
    const { completed, category, listId, dueDate } = req.query;

    // Handle anonymous users - allow access to all tasks or filter by anonymous
    let query = {};
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    if (completed !== undefined) {
      query.status = completed === 'true' ? 'done' : 'todo';
    }

    if (category) {
      query.category = category;
    }

    if (listId) {
      query.listId = listId;
    }

    if (dueDate) {
      query.due_date = { $lte: new Date(dueDate) };
    }

    const tasks = await Task.find(query)
      .populate('list_id', 'name color')
      .sort({ created_date: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    logger.error('Get tasks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tasks'
    });
  }
});

router.get('/lists', async (req, res) => {
  try {
    let query = {};
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }
    const lists = await TaskList.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: lists.length,
      data: lists
    });
  } catch (error) {
    logger.error('Get task lists error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task lists'
    });
  }
});

router.get('/:id([0-9a-fA-F]{24})', async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    const task = await Task.findOne(query).populate('list_id', 'name color');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Get task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch task'
    });
  }
});

router.post('/', async (req, res) => {
  try {
    const taskData = {
      ...req.body,
      createdBy: req.user._id !== 'anonymous' ? req.user._id : null
    };

    const task = await Task.create(taskData);

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Create task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task'
    });
  }
});

router.put('/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }
    
    const task = await Task.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    ).populate('list_id', 'name color');

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error('Update task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task'
    });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }
    
    const task = await Task.findOneAndDelete(query);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    logger.error('Delete task error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task'
    });
  }
});

router.post('/lists', async (req, res) => {
  try {
    const listData = {
      ...req.body,
      createdBy: req.user._id !== 'anonymous' ? req.user._id : null
    };

    const list = await TaskList.create(listData);

    res.status(201).json({
      success: true,
      data: list
    });
  } catch (error) {
    logger.error('Create task list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task list'
    });
  }
});

router.put('/lists/:id', async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    const list = await TaskList.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    );

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'Task list not found'
      });
    }

    res.status(200).json({
      success: true,
      data: list
    });
  } catch (error) {
    logger.error('Update task list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task list'
    });
  }
});

router.delete('/lists/:id', async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user._id !== 'anonymous') {
      query.createdBy = req.user._id;
    }

    const list = await TaskList.findOneAndDelete(query);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'Task list not found'
      });
    }

    await Task.updateMany(
      { list_id: req.params.id },
      { $unset: { list_id: 1 } }
    );

    res.status(200).json({
      success: true,
      message: 'Task list deleted successfully'
    });
  } catch (error) {
    logger.error('Delete task list error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task list'
    });
  }
});

module.exports = router;

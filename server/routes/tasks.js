const express = require('express');
const mongoose = require('mongoose');
const { protect } = require('../middleware/auth');
const Task = require('../models/Task');
const TaskList = require('../models/TaskList');

const router = express.Router();

// All routes are now public for demo purposes
// router.use(protect);

// @desc    Get all tasks
// @route   GET /api/tasks
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { completed, category, listId, dueDate } = req.query;

    let query = {};
    if (req.user) {
      query.createdBy = req.user._id;
    }

    // Filter by completion status
    if (completed !== undefined) {
      query.completed = completed === 'true';
    }

    // Filter by category
    if (category) {
      query.category = category;
    }

    // Filter by list
    if (listId) {
      query.listId = listId;
    }

    // Filter by due date
    if (dueDate) {
      query.dueDate = { $lte: new Date(dueDate) };
    }

    const tasks = await Task.find(query)
      .populate('listId', 'name color')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user) {
      query.createdBy = req.user._id;
    }

    const task = await Task.findOne(query).populate('listId', 'name color');

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
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
router.post('/', async (req, res) => {
  try {
    const taskData = {
      ...req.body
    };

    if (req.user) {
      taskData.createdBy = req.user._id;
    } else {
      taskData.createdBy = new mongoose.Types.ObjectId();
    }

    const task = await Task.create(taskData);

    res.status(201).json({
      success: true,
      data: task
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
router.put('/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user) {
      query.createdBy = req.user._id;
    }

    const task = await Task.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    ).populate('listId', 'name color');

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
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user) {
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

// Task Lists routes

// @desc    Get all task lists
// @route   GET /api/tasks/lists
// @access  Private
router.get('/lists', async (req, res) => {
  try {
    let query = {};
    if (req.user) {
      query.createdBy = req.user._id;
    }

    const lists = await TaskList.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: lists.length,
      data: lists
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Create new task list
// @route   POST /api/tasks/lists
// @access  Private
router.post('/lists', async (req, res) => {
  try {
    const listData = {
      ...req.body
    };

    if (req.user) {
      listData.createdBy = req.user._id;
    } else {
      listData.createdBy = new mongoose.Types.ObjectId();
    }

    const list = await TaskList.create(listData);

    res.status(201).json({
      success: true,
      data: list
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Update task list
// @route   PUT /api/tasks/lists/:id
// @access  Private
router.put('/lists/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user) {
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
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// @desc    Delete task list
// @route   DELETE /api/tasks/lists/:id
// @access  Private
router.delete('/lists/:id', async (req, res) => {
  try {
    let query = { _id: req.params.id };
    if (req.user) {
      query.createdBy = req.user._id;
    }

    const list = await TaskList.findOneAndDelete(query);

    if (!list) {
      return res.status(404).json({
        success: false,
        message: 'Task list not found'
      });
    }

    // Remove listId from all tasks in this list
    await Task.updateMany(
      { listId: req.params.id },
      { $unset: { listId: 1 } }
    );

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

module.exports = router;
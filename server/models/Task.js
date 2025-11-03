const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  dueDate: Date,
  estimatedDuration: {
    type: Number, // in minutes
    min: 0
  },
  actualDuration: {
    type: Number, // in minutes
    min: 0
  },
  category: {
    type: String,
    enum: ['work', 'personal', 'health', 'learning', 'other'],
    default: 'other'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  listId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskList'
  },
  parentTask: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  subtasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  recurring: {
    type: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly']
      },
      interval: {
        type: Number,
        default: 1
      },
      endDate: Date
    }
  },
  reminders: [{
    type: {
      type: String,
      enum: ['email', 'notification'],
      default: 'notification'
    },
    minutes: {
      type: Number,
      default: 15
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

// Update updatedAt on save
taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.completed && !this.completedAt) {
    this.completedAt = Date.now();
  }
  next();
});

// Index for efficient queries
taskSchema.index({ createdBy: 1, completed: 1 });
taskSchema.index({ createdBy: 1, dueDate: 1 });
taskSchema.index({ createdBy: 1, category: 1 });
taskSchema.index({ listId: 1 });

module.exports = mongoose.model('Task', taskSchema);
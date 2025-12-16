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
  status: {
    type: String,
    enum: ['todo', 'done', 'wont_do'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  due_date: Date,
  duration: {
    type: Number, // in minutes
    min: 0
  },
  category: {
    type: String,
    enum: ['work', 'personal', 'health', 'learning', 'other'],
    default: 'other'
  },
  tag_ids: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tag'
  }],
  list_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'TaskList'
  },
  parent_task_id: {
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
    required: false // Allow null for demo purposes
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  created_date: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  is_pinned: {
    type: Boolean,
    default: false
  },
  color: String,
  scheduled_start_time: Date,
  auto_scheduled: {
    type: Boolean,
    default: false
  },
  ai_suggested: {
    type: Boolean,
    default: false
  },
  order: Number
});

// Update updatedAt on save
taskSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  if (this.status === 'done' && !this.completedAt) {
    this.completedAt = Date.now();
  }
  next();
});

// Index for efficient queries
taskSchema.index({ createdBy: 1, status: 1 });
taskSchema.index({ createdBy: 1, due_date: 1 });
taskSchema.index({ createdBy: 1, category: 1 });
taskSchema.index({ list_id: 1 });

module.exports = mongoose.model('Task', taskSchema);
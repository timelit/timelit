const mongoose = require('mongoose');

const pomodoroSessionSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD format
    required: true
  },
  cyclesCompleted: {
    type: Number,
    default: 0,
    min: 0
  },
  totalFocusTime: {
    type: Number, // in minutes
    default: 0,
    min: 0
  },
  totalBreakTime: {
    type: Number, // in minutes
    default: 0,
    min: 0
  },
  sessions: [{
    startTime: {
      type: Date,
      required: true
    },
    endTime: Date,
    type: {
      type: String,
      enum: ['focus', 'short_break', 'long_break'],
      required: true
    },
    duration: {
      type: Number, // in minutes
      required: true
    },
    completed: {
      type: Boolean,
      default: false
    },
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update updatedAt on save
pomodoroSessionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
pomodoroSessionSchema.index({ createdBy: 1, date: 1 });

module.exports = mongoose.model('PomodoroSession', pomodoroSessionSchema);
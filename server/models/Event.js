const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  allDay: {
    type: Boolean,
    default: false
  },
  location: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    enum: ['work', 'personal', 'health', 'learning', 'other'],
    default: 'other'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  color: {
    type: String,
    default: '#3b82f6'
  },
  recurrence: {
    type: {
      frequency: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'yearly']
      },
      interval: {
        type: Number,
        default: 1
      },
      endDate: Date,
      count: Number
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
  attendees: [{
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    name: String,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'tentative'],
      default: 'pending'
    }
  }],
  googleEventId: String,
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
eventSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
eventSchema.index({ createdBy: 1, startTime: 1 });
eventSchema.index({ createdBy: 1, category: 1 });

module.exports = mongoose.model('Event', eventSchema);
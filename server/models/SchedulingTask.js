const mongoose = require('mongoose');

const SchedulingTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  duration: {
    type: Number, // minutes
    required: true,
    min: 1
  },
  durationFlexibility: {
    min: {
      type: Number,
      min: 1
    },
    max: {
      type: Number,
      min: 1
    },
    preferred: {
      type: Number,
      min: 1
    }
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  deadline: Date,
  earliestStart: Date,
  latestEnd: Date,
  preferredTimeWindows: [{
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    },
    weight: {
      type: Number,
      min: 0,
      max: 1,
      default: 0.5
    }
  }],
  requiredResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchedulingResource'
  }],
  optionalResources: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchedulingResource'
  }],
  dependencies: [{
    taskId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchedulingTask',
      required: true
    },
    type: {
      type: String,
      enum: ['before', 'after', 'simultaneous'],
      required: true
    }
  }],
  recurrence: {
    pattern: String, // 'daily', 'weekly', 'monthly'
    frequency: Number,
    endDate: Date
  },
  tags: [String],
  customAttributes: mongoose.Schema.Types.Mixed,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'completed', 'cancelled'],
    default: 'pending'
  }
}, {
  timestamps: true
});

// Indexes for performance
SchedulingTaskSchema.index({ createdBy: 1, status: 1 });
SchedulingTaskSchema.index({ deadline: 1 });
SchedulingTaskSchema.index({ priority: -1 });

module.exports = mongoose.model('SchedulingTask', SchedulingTaskSchema);
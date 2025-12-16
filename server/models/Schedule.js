const mongoose = require('mongoose');

const ScheduledSlotSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchedulingTask',
    required: true
  },
  resourceIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchedulingResource'
  }],
  start: {
    type: Date,
    required: true
  },
  end: {
    type: Date,
    required: true
  },
  actualDuration: {
    type: Number, // minutes
    required: true
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1.0
  },
  constraintViolations: [{
    type: {
      type: String,
      required: true
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    description: {
      type: String,
      required: true
    }
  }],
  optimizationScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 1.0
  }
});

const ScheduleSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  slots: [ScheduledSlotSchema],
  unscheduledTasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SchedulingTask'
  }],
  optimizationScore: {
    type: Number,
    min: 0,
    max: 1,
    default: 0
  },
  constraints: {
    hard: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchedulingConstraint'
    }],
    soft: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchedulingConstraint'
    }]
  },
  metadata: {
    generatedAt: {
      type: Date,
      default: Date.now
    },
    algorithm: {
      type: String,
      default: 'greedy'
    },
    computationTime: {
      type: Number, // milliseconds
      default: 0
    },
    iterationsPerformed: {
      type: Number,
      default: 0
    },
    version: {
      type: String,
      default: '1.0'
    }
  },
  status: {
    type: String,
    enum: ['draft', 'scheduled', 'executing', 'completed', 'cancelled'],
    default: 'draft'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for performance
ScheduleSchema.index({ createdBy: 1, status: 1 });
ScheduleSchema.index({ startDate: 1, endDate: 1 });
ScheduleSchema.index({ 'slots.start': 1, 'slots.end': 1 });

// Virtual for total scheduled tasks
ScheduleSchema.virtual('totalScheduledTasks').get(function() {
  return this.slots.length;
});

// Virtual for schedule utilization
ScheduleSchema.virtual('utilization').get(function() {
  if (this.slots.length === 0) return 0;

  const totalDuration = this.slots.reduce((sum, slot) => sum + slot.actualDuration, 0);
  const totalAvailableTime = (this.endDate - this.startDate) / (1000 * 60); // minutes

  return totalDuration / totalAvailableTime;
});

module.exports = mongoose.model('Schedule', ScheduleSchema);
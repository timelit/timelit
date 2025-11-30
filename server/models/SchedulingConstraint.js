const mongoose = require('mongoose');

const SchedulingConstraintSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['hard', 'soft'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'temporal', 'capacity', 'dependency', 'business_rules',
      'time_preferences', 'resource_optimization', 'personal_preferences',
      'business_optimization'
    ],
    required: true
  },
  priority: {
    type: Number,
    min: 1,
    max: 10,
    default: 5
  },
  weight: {
    type: Number,
    min: 0,
    max: 1,
    default: 1.0 // For soft constraints
  },
  parameters: mongoose.Schema.Types.Mixed, // Flexible parameters for different constraint types
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Example constraint parameters:
// Temporal constraints:
// { type: 'no_overlap', resources: ['resourceId1', 'resourceId2'] }
// { type: 'buffer_time', duration: 15 } // minutes
// { type: 'business_hours', start: '09:00', end: '17:00' }

// Capacity constraints:
// { type: 'max_concurrent', resourceId: 'resourceId', maxCount: 3 }

// Dependency constraints:
// { type: 'predecessor', taskId: 'taskId', predecessorId: 'predecessorId' }

// Business rules:
// { type: 'max_consecutive_hours', maxHours: 4 }
// { type: 'mandatory_break', duration: 30 } // minutes

// Indexes
SchedulingConstraintSchema.index({ createdBy: 1, type: 1, category: 1 });

module.exports = mongoose.model('SchedulingConstraint', SchedulingConstraintSchema);
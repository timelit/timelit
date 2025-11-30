const mongoose = require('mongoose');

const SchedulingResourceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['person', 'room', 'equipment', 'virtual'],
    required: true
  },
  capacity: {
    type: Number,
    min: 1,
    default: 1
  },
  availability: [{
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6 // 0 = Sunday, 6 = Saturday
    },
    start: {
      type: String, // HH:MM format
      required: true
    },
    end: {
      type: String, // HH:MM format
      required: true
    }
  }],
  unavailableSlots: [{
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    },
    reason: String
  }],
  location: {
    latitude: Number,
    longitude: Number,
    address: String
  },
  costPerHour: {
    type: Number,
    min: 0
  },
  skills: [String],
  attributes: mongoose.Schema.Types.Mixed,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
SchedulingResourceSchema.index({ createdBy: 1, type: 1 });
SchedulingResourceSchema.index({ 'location': '2dsphere' }); // For geospatial queries

module.exports = mongoose.model('SchedulingResource', SchedulingResourceSchema);
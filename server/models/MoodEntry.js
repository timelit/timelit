const mongoose = require('mongoose');

const moodEntrySchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD format
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 10
  },
  note: {
    type: String,
    trim: true
  },
  factors: [{
    type: String,
    enum: ['work', 'sleep', 'exercise', 'social', 'food', 'weather', 'health', 'stress', 'other'],
    trim: true,
    lowercase: true
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
moodEntrySchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Index for efficient queries
moodEntrySchema.index({ createdBy: 1, date: 1 });

module.exports = mongoose.model('MoodEntry', moodEntrySchema);
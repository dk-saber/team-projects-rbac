const mongoose = require('mongoose');

/**
 * Project
 * Main entity for project tracking.
 */
const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'in_progress', 'on_hold', 'completed', 'cancelled'],
    default: 'draft'
  },
  startDate: {
    type: Date
  },
  endDate: {
    type: Date
  },
  direction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Direction',
    default: null
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    default: null
  },
  // // Project creator (automatically populated from `req.user`)
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Members assigned to the project
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Project', projectSchema);

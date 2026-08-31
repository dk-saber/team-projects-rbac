const mongoose = require('mongoose');

/**
 * Department
 * Extensible collection (Dep1, Dep2, Dep3, ...).
 * Optionally linked to a Directorate for a future
 * organizational hierarchy (optional, not required).
 */
const departmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  label: {
    type: String,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  direction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Direction',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Department', departmentSchema);

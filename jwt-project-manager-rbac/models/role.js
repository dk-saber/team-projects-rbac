const mongoose = require('mongoose');

/**
 * Role
 * Extensible collection: roles can be added or disabled
 * without modifying the code (Admin, Dev, Test, Ops, DevOps, ...).
*/
const roleSchema = new mongoose.Schema({
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
// Logical permissions associated with the role (used by the RBAC middleware
// for fine-grained access control, e.g. 'project:create', 'project:delete', 'user:manage')
  permissions: {
    type: [String],
    default: []
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Role', roleSchema);

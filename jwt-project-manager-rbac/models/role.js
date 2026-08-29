const mongoose = require('mongoose');

/**
 * Role
 * Collection évolutive : on peut ajouter/désactiver un rôle
 * sans toucher au code (Admin, Dev, Test, Ops, Devops, ...).
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
  // Permissions logiques rattachées au rôle (utilisées par le middleware RBAC
  // pour des contrôles fins, ex: 'project:create', 'project:delete', 'user:manage')
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

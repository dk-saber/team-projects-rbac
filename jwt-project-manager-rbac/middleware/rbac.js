/**
 * RBAC (Role-Based Access Control) middleware.
 *
 * These middleware functions rely on `req.user`, which is populated by the
 * `auth` middleware (see `middleware/auth.js`) and contains at least:
 *   { id, username, role, permissions, direction, department }
 *
 * The role and permissions are embedded in the access token at login time
 * (see `utils/tokens.js` -> `signAccessToken`), so no database access is
 * required for standard authorization checks.
 */

/**
 * authorizeRoles('Admin', 'DevOps')
 * Allows only users whose role is included in the specified list.
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Access denied: insufficient role.'
      });
    }

    next();
  };
}

/**
 * authorizePermissions('project:create', 'project:delete')
 * Grants access if the user has AT LEAST ONE of the specified permissions.
 * Permissions are defined at the Role level (see `models/role.js`)
 * and embedded in the token at login time.
 */
function authorizePermissions(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authenticated.' });
    }

    const userPermissions = req.user.permissions || [];

    const hasWildcard = userPermissions.includes('*');

    const hasPermission = hasWildcard || requiredPermissions.some((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({
        message: 'Access denied: insufficient permission.'
      });
    }

    next();
  };
}

module.exports = {
  authorizeRoles,
  authorizePermissions
};

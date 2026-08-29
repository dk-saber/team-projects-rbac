/**
 * Middlewares RBAC (Role-Based Access Control).
 *
 * Ces middlewares s'appuient sur req.user, injecté par le middleware `auth`
 * (voir middleware/auth.js), qui contient au minimum :
 *   { id, username, role, permissions, direction, department }
 *
 * Le rôle et les permissions sont embarqués dans l'access token au moment
 * du login (voir utils/tokens.js -> signAccessToken), donc aucun accès
 * base de données n'est nécessaire pour un contrôle d'accès classique.
 */

/**
 * authorizeRoles('Admin', 'Devops')
 * Autorise uniquement les utilisateurs dont le rôle fait partie de la liste.
 */
function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: 'Accès refusé : rôle insuffisant'
      });
    }

    next();
  };
}

/**
 * authorizePermissions('project:create', 'project:delete')
 * Autorise si l'utilisateur possède AU MOINS UNE des permissions listées.
 * Les permissions sont définies au niveau du Role (voir models/role.js)
 * et embarquées dans le token à la connexion.
 */
function authorizePermissions(...requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }

    const userPermissions = req.user.permissions || [];

    const hasWildcard = userPermissions.includes('*');

    const hasPermission = hasWildcard || requiredPermissions.some((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasPermission) {
      return res.status(403).json({
        message: 'Accès refusé : permission insuffisante'
      });
    }

    next();
  };
}

module.exports = {
  authorizeRoles,
  authorizePermissions
};

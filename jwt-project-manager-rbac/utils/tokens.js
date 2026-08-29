const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/refreshToken');
const PasswordResetToken = require('../models/passwordResetToken');

const ACCESS_TTL = process.env.JWT_EXPIRES_IN || '15m';

const REFRESH_TTL_SEC =
  Number(process.env.REFRESH_TOKEN_TTL_SEC) || 604800; 

// Durée de vie très courte pour les jetons de reset password : 15 minutes
const PASSWORD_RESET_TTL_SEC =
  Number(process.env.PASSWORD_RESET_TTL_SEC) || 15 * 60;

function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
}

function createJti() {
  return crypto
    .randomBytes(16)
    .toString('hex');
}

/**
 * Construit le payload RBAC de l'access token.
 * `user` doit être populate() sur role / direction / department
 * (voir routes/auth.js) pour que les noms et permissions soient disponibles.
 */
function signAccessToken(user) {

  const payload = {
    id: user._id.toString(),
    username: user.username,
    role: user.role?.name || user.role,
    permissions: user.role?.permissions || [],
    direction: user.direction?.name || user.direction,
    department: user.department?.name || user.department
  };

  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    {
      expiresIn: ACCESS_TTL
    }
  );
}

function signRefreshToken(user, jti) {

  const payload = {
    id: user._id.toString(),
    jti
  };

  return jwt.sign(
    payload,
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: REFRESH_TTL_SEC
    }
  );
}

async function persistRefreshToken({
  user,
  refreshToken,
  jti,
  ip,
  userAgent
}) {

  const tokenHash = hashToken(refreshToken);

  const expiresAt = new Date(
    Date.now() + REFRESH_TTL_SEC * 1000
  );

  await RefreshToken.create({
    user: user._id,
    tokenHash,
    jti,
    expiresAt,
    ip,
    userAgent
  });
}

function setRefreshCookie(res, refreshToken) {

  const isProd =
    process.env.NODE_ENV === 'production';

  res.cookie(
    'refresh_token',
    refreshToken,
    {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      path: '/api/auth/refresh',
      maxAge: REFRESH_TTL_SEC * 1000
    }
  );
}

async function rotateRefreshToken(
  oldDoc,
  user,
  req,
  res
) {

  oldDoc.revokedAt = new Date();

  const newJti = createJti();

  oldDoc.replacedBy = newJti;

  await oldDoc.save();

  const newAccessToken =
    signAccessToken(user);

  const newRefreshToken =
    signRefreshToken(user, newJti);

  await persistRefreshToken({
    user,
    refreshToken: newRefreshToken,
    jti: newJti,
    ip: req.ip,
    userAgent:
      req.headers['user-agent'] || ''
  });

  setRefreshCookie(
    res,
    newRefreshToken
  );

  return {
    accessToken: newAccessToken
  };
}

/**
 * Génère un jeton de réinitialisation de mot de passe (aléatoire, opaque),
 * le persiste sous forme hashée en base avec une expiration de 15 min,
 * et retourne le jeton EN CLAIR (à insérer dans le lien envoyé par e-mail).
 * Le jeton en clair n'est jamais stocké : seule sa version hashée l'est.
 */
async function createPasswordResetToken({ user, ip, userAgent }) {

  // Jeton aléatoire cryptographiquement sûr, imprévisible (contrairement à un UUID)
  const rawToken = crypto.randomBytes(32).toString('hex');

  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TTL_SEC * 1000
  );

  // On invalide tout jeton de reset encore actif pour cet utilisateur :
  // un seul jeton valide à la fois.
  await PasswordResetToken.deleteMany({
    user: user._id,
    usedAt: null
  });

  await PasswordResetToken.create({
    user: user._id,
    tokenHash,
    expiresAt,
    ip,
    userAgent
  });

  return rawToken;
}

/**
 * Vérifie un jeton de reset password reçu en clair :
 * - existe en base (via son hash)
 * - non expiré
 * - non déjà utilisé (usage unique)
 * Retourne le document si valide, sinon null.
 */
async function verifyPasswordResetToken(rawToken) {

  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }

  const tokenHash = hashToken(rawToken);

  const doc = await PasswordResetToken.findOne({ tokenHash }).populate('user');

  if (!doc) return null;
  if (doc.usedAt) return null;
  if (doc.expiresAt < new Date()) return null;

  return doc;
}

module.exports = {
  hashToken,
  createJti,
  signAccessToken,
  signRefreshToken,
  persistRefreshToken,
  setRefreshCookie,
  rotateRefreshToken,
  createPasswordResetToken,
  verifyPasswordResetToken
};

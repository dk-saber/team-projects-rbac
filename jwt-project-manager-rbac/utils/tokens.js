const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/refreshToken');
const PasswordResetToken = require('../models/passwordResetToken');

const ACCESS_TTL = process.env.JWT_EXPIRES_IN || '15m';

const REFRESH_TTL_SEC =
  Number(process.env.REFRESH_TOKEN_TTL_SEC) || 604800; 

// Very short lifetime for password reset tokens: 15 minutes.
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
 * Builds the RBAC payload for the access token.
 * `user` must be populated (`populate()`) with role / direction / department
 * (see `routes/auth.js`) so that names and permissions are available.
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
 * Generates a password reset token (random and opaque),
 * stores its hashed version in the database with a 15-minute expiration,
 * and returns the PLAINTEXT token (to be included in the reset link sent by email).
 * The plaintext token is never stored; only its hashed version is persisted.
 */
async function createPasswordResetToken({ user, ip, userAgent }) {

  // Cryptographically secure random token, unpredictable (unlike a UUID).
  const rawToken = crypto.randomBytes(32).toString('hex');

  const tokenHash = hashToken(rawToken);

  const expiresAt = new Date(
    Date.now() + PASSWORD_RESET_TTL_SEC * 1000
  );

  // Invalidate any still-active password reset token for this user:
  // only one valid token is allowed at a time.
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
 * Verifies a plaintext password reset token:
 * - exists in the database (via its hash)
 * - has not expired
 * - has not already been used (single-use token)
 * Returns the document if valid, otherwise null.
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

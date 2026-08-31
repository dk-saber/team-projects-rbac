const rateLimit = require('express-rate-limit');

/**
 * Limits password reset requests per IP:
 * prevents email spam and brute-force user enumeration attacks.
 * 5 requests per 15 minutes per IP, aligned with the token lifetime.
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many password reset requests. Please try again later.'
  }
});

/**
 * Limits new password submission attempts per IP:
 * slows down brute-force attacks against the token itself (32 random bytes,
 * making it already virtually impossible to guess, but this adds an extra layer of protection).
 */
const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many password reset requests. Please try again later.'
  }
});

/**
 * Limits login attempts per IP:
 * protects against brute-force attacks targeting the passwords
 * of existing user accounts.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many password reset requests. Please try again later.'
  }
});

module.exports = {
  forgotPasswordLimiter,
  resetPasswordLimiter,
  loginLimiter
};

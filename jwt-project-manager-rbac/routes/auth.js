const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const Role = require('../models/role');
const Direction = require('../models/direction');
const Department = require('../models/department');
const RefreshToken = require('../models/refreshToken');
const PasswordResetToken = require('../models/passwordResetToken');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { hashToken, rotateRefreshToken } = require('../utils/tokens');
const {
  forgotPasswordLimiter,
  resetPasswordLimiter,
  loginLimiter
} = require('../middleware/rateLimiters');

const {
  createJti,
  signAccessToken,
  signRefreshToken,
  persistRefreshToken,
  setRefreshCookie,
  createPasswordResetToken,
  verifyPasswordResetToken
} = require('../utils/tokens');

const router = express.Router();

/**
 * REGISTER
 */
router.post('/register', async (req, res) => {
  try {
    const {
      name,
      lastname,
      username,
      email,
      password,
      direction, // `_id` returned by GET /api/meta/directions
      department // `_id` returned by GET /api/meta/departments
    } = req.body;

    if (!direction || !department) {
      return res.status(400).json({
        message: 'Direction and department are required.'
      });
    }

    const existingEmail = await User.findOne({ email });

    if (existingEmail) {
      return res.status(400).json({
        message: 'Email already exists'
      });
    }

    const existingUsername = await User.findOne({ username });

    if (existingUsername) {
      return res.status(400).json({
        message: 'Username already exists'
      });
    }

// Security: the role is NEVER taken from the public request body
// (otherwise anyone could promote themselves to "Admin").
// A default role is assigned at registration time; afterwards,
// an Admin can change it via PUT /api/admin/users/:id/role.
    const defaultRoleName = process.env.DEFAULT_REGISTRATION_ROLE || 'Dev';

    const [roleDoc, directionDoc, departmentDoc] = await Promise.all([
      Role.findOne({ name: defaultRoleName, isActive: true }),
      Direction.findOne({ _id: direction, isActive: true }),
      Department.findOne({ _id: department, isActive: true })
    ]);

    if (!roleDoc) {
      return res.status(500).json({
        message: `Default role "${defaultRoleName}" not found or inactive. Run the seed script or check DEFAULT_REGISTRATION_ROLE.`
      });
    }
    if (!directionDoc) {
      return res.status(400).json({ message: 'Invalid or inactive direction.' });
    }
    if (!departmentDoc) {
      return res.status(400).json({ message: 'Invalid or inactive department.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      lastname,
      username,
      email,
      password: hashedPassword,
      direction: directionDoc._id,
      department: departmentDoc._id,
      role: roleDoc._id
    });

    await newUser.save();

    res.status(201).json({
      message: 'User created successfully'
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});

/**
 * LOGIN
 */
router.post('/login', loginLimiter, async (req, res) => {
  try {

    const { email, password } = req.body;

    const user = await User.findOne({ email })
      .populate('role', 'name label permissions isActive')
      .populate('direction', 'name label isActive')
      .populate('department', 'name label isActive');

    if (!user) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: 'This account has been deactivated. Please contact an administrator.'
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return res.status(400).json({
        message: 'Invalid credentials'
      });
    }

    // Création Access Token
    const accessToken = signAccessToken(user);

    // Création du JTI
    const jti = createJti();

    // Création Refresh Token
    const refreshToken = signRefreshToken(
      user,
      jti
    );

    // Sauvegarde en base
    await persistRefreshToken({
      user,
      refreshToken,
      jti,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });

    // Cookie HttpOnly
    setRefreshCookie(
      res,
      refreshToken
    );

    // Retour du Access Token
    res.status(200).json({
      accessToken,
      user: {
        id: user._id,
        name: user.name,
        lastname: user.lastname,
        username: user.username,
        email: user.email,
        direction: user.direction && { id: user.direction._id, name: user.direction.name, label: user.direction.label },
        department: user.department && { id: user.department._id, name: user.department.name, label: user.department.label },
        role: user.role && { id: user.role._id, name: user.role.name, label: user.role.label, permissions: user.role.permissions }
      }
    });

  } catch (err) {

    console.error(err);

    res.status(500).json({
      message: 'Server error'
    });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (!token) return res.status(401).json({ message: 'No refresh token' });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid or expired refresh token' });
    }

    const tokenHash = hashToken(token);
    const doc = await RefreshToken.findOne({ tokenHash, jti: decoded.jti })
      .populate({
        path: 'user',
        populate: [
          { path: 'role', select: 'name label permissions isActive' },
          { path: 'direction', select: 'name label isActive' },
          { path: 'department', select: 'name label isActive' }
        ]
      });

    if (!doc) {
      return res.status(401).json({ message: 'Refresh token not recognized' });
    }
    if (doc.revokedAt) {
      return res.status(401).json({ message: 'Refresh token revoked' });
    }
    if (doc.expiresAt < new Date()) {
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    const result = await rotateRefreshToken(doc, doc.user, req, res);
    return res.json({ accessToken: result.accessToken });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});


router.post('/logout', async (req, res) => {
  try {
    const token = req.cookies?.refresh_token;
    if (token) {
      const tokenHash = hashToken(token);
      const doc = await RefreshToken.findOne({ tokenHash });
      if (doc && !doc.revokedAt) {
        doc.revokedAt = new Date();
        await doc.save();
      }
    }
    res.clearCookie('refresh_token', { path: '/api/auth/refresh' });
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * FORGOT PASSWORD
 * Generates a single-use token (valid for 15 minutes) and sends it by email.
 * Always returns the same response, whether the email exists or not,
 * to prevent account enumeration.
 */
router.post('/forgot-password', forgotPasswordLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const genericResponse = {
      message: 'If an account exists for this email address, a password reset link has been sent.'
    };

    const user = await User.findOne({ email });

    if (!user) {
      // Same response as if the user existed, to prevent email enumeration.
      return res.status(200).json(genericResponse);
    }

    const rawToken = await createPasswordResetToken({
      user,
      ip: req.ip,
      userAgent: req.headers['user-agent'] || ''
    });

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password?token=${rawToken}`;

    try {
      await sendPasswordResetEmail({ to: user.email, resetUrl });
    } catch (mailErr) {
      // On log l'erreur d'envoi mais on ne la révèle pas au client
      console.error('Error sending password reset email:', mailErr);
    }

    return res.status(200).json(genericResponse);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * RESET PASSWORD
 * Verifies the token (hash validation, 15-minute expiration, single use),
 * updates the password, and invalidates both the token and any active refresh tokens.
 */
router.post('/reset-password', resetPasswordLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: 'Password must be at least 8 characters long.'
      });
    }

    const doc = await verifyPasswordResetToken(token);

    if (!doc) {
      return res.status(400).json({
        message: 'Invalid or expired password reset link.'
      });
    }

    const user = doc.user;

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    // Single-use token: mark the token as used.
    doc.usedAt = new Date();
    await doc.save();

    // For security reasons, invalidate all other active password reset tokens.
    await PasswordResetToken.deleteMany({
      user: user._id,
      _id: { $ne: doc._id }
    });

    // Also revoke all active sessions (refresh tokens),
    // in case the password has been compromised.
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { $set: { revokedAt: new Date() } }
    );

    return res.status(200).json({ message: 'Your password has been reset successfully.' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
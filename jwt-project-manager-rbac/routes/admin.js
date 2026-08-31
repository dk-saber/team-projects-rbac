const express = require('express');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const Role = require('../models/role');
const Direction = require('../models/direction');
const Department = require('../models/department');
const User = require('../models/user');
const RefreshToken = require('../models/refreshToken');

const router = express.Router();

// All routes below require the user to be authenticated and to have the Admin role.
router.use(auth, authorizeRoles('Admin'));

const USER_POPULATE = [
  { path: 'role', select: 'name label permissions' },
  { path: 'direction', select: 'name label' },
  { path: 'department', select: 'name label' }
];

/* ----------------------------- USERS ------------------------------ */

router.get('/users', async (req, res) => {
  try {
    const users = await User.find()
      .select('-password')
      .populate(USER_POPULATE)
      .sort('username');
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate(USER_POPULATE);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
    res.json({ user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * USER CREATION from the admin console.
 * Unlike `/api/auth/register` (public), an Admin can directly choose
 * the user's role, directorate, and department here.
 */
router.post('/users', async (req, res) => {
  try {
    const { name, lastname, username, email, password, direction, department, role, isActive } = req.body;

    if (!name || !lastname || !username || !email || !password || !direction || !department || !role) {
      return res.status(400).json({
        message: 'name, lastname, username, email, password, direction, department et role sont requis'
      });
    }

    const [existingEmail, existingUsername] = await Promise.all([
      User.findOne({ email }),
      User.findOne({ username })
    ]);
    if (existingEmail) return res.status(400).json({ message: 'Email already exists' });
    if (existingUsername) return res.status(400).json({ message: 'Username already exists' });

    const [roleDoc, directionDoc, departmentDoc] = await Promise.all([
      Role.findOne({ _id: role, isActive: true }),
      Direction.findOne({ _id: direction, isActive: true }),
      Department.findOne({ _id: department, isActive: true })
    ]);
    if (!roleDoc) return res.status(400).json({ message: 'Invalid or inactive role.' });
    if (!directionDoc) return res.status(400).json({ message: 'Invalid or inactive Direction.' });
    if (!departmentDoc) return res.status(400).json({ message: 'Invalid or inactive Department.' });

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      lastname,
      username,
      email,
      password: hashedPassword,
      direction: directionDoc._id,
      department: departmentDoc._id,
      role: roleDoc._id,
      isActive: isActive !== undefined ? !!isActive : true
    });

    const populated = await user.populate(USER_POPULATE);
    const { password: _pw, ...userSafe } = populated.toObject();

    res.status(201).json({ message: 'User created', user: userSafe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * USER UPDATE (general information only, excluding password and role).
 * Role changes remain on their dedicated route (PUT /users/:id/role)
 * to maintain an explicit audit trail for this sensitive action.
 */
router.put('/users/:id', async (req, res) => {
  try {
    const { name, lastname, username, email, direction, department, isActive } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (lastname !== undefined) update.lastname = lastname;
    if (isActive !== undefined) update.isActive = !!isActive;

    if (username !== undefined) {
      const existing = await User.findOne({ username, _id: { $ne: req.params.id } });
      if (existing) return res.status(400).json({ message: 'Username already exists' });
      update.username = username;
    }

    if (email !== undefined) {
      const existing = await User.findOne({ email, _id: { $ne: req.params.id } });
      if (existing) return res.status(400).json({ message: 'Email already exists' });
      update.email = email;
    }

    if (direction !== undefined) {
      const directionDoc = await Direction.findOne({ _id: direction, isActive: true });
      if (!directionDoc) return res.status(400).json({ message: 'Invalid or inactive Direction.' });
      update.direction = directionDoc._id;
    }

    if (department !== undefined) {
      const departmentDoc = await Department.findOne({ _id: department, isActive: true });
      if (!departmentDoc) return res.status(400).json({ message: 'Invalid or inactive Department.' });
      update.department = departmentDoc._id;
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    })
      .select('-password')
      .populate(USER_POPULATE);

    if (!user) return res.status(404).json({ message: 'User not found.' });

    res.json({ message: 'User updated successfully.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * USER DELETION.
 * Soft delete is used by default (`isActive: false`) to preserve historical data
 * (created projects, team memberships, etc.) while preventing the user from logging in.
 * A DELETE request with `?hard=true` permanently removes the document.
 */
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'You cannot delete your own account.' });
    }

    if (req.query.hard === 'true') {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ message: 'User not found.' });
      await RefreshToken.deleteMany({ user: user._id });
      return res.json({ message: 'User permanently deleted.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password').populate(USER_POPULATE);

    if (!user) return res.status(404).json({ message: 'User not found.' });

// Revokes the user's active sessions so that deactivation takes effect immediately.
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { revokedAt: new Date() }
    );

    res.json({ message: 'User deactivated.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Changes a user's role.
 * This is the ONLY way to modify an account's role
 * (public registration always assigns a default role).
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ message: 'The "role" field (ID) is required.' });
    }

    const roleDoc = await Role.findOne({ _id: role, isActive: true });
    if (!roleDoc) {
      return res.status(400).json({ message: 'Invalid or inactive role.' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: roleDoc._id },
      { new: true }
    )
      .select('-password')
      .populate(USER_POPULATE);

    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Note: tokens already issued for this user will retain the previous
    // role until they expire or are refreshed (the role is embedded in the JWT).
    // For immediate effect, the user's active refresh tokens should also be
    // revoked (RefreshToken.updateMany) to force them to sign in again.
    res.json({ message: 'Role updated successfully.', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/* ----------------------------- ROLES ----------------------------- */

router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.find().sort('name');
    res.json({ roles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/roles', async (req, res) => {
  try {
    const { name, label, description, permissions } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'The "name" field is required.' });
    }
    const role = await Role.create({ name, label, description, permissions });
    res.status(201).json({ role });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'This role already exists.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/roles/:id', async (req, res) => {
  try {
    const { label, description, permissions, isActive } = req.body;
    const role = await Role.findByIdAndUpdate(
      req.params.id,
      { label, description, permissions, isActive },
      { new: true, runValidators: true }
    );
    if (!role) return res.status(404).json({ message: 'Role not found.' });
    res.json({ role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/roles/:id', async (req, res) => {
// Deactivate instead of deleting: prevents breaking existing user accounts.
  const role = await Role.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!role) return res.status(404).json({ message: 'Role not found.' });
  res.json({ message: 'Role deactivated.', role });
});

/* --------------------------- DIRECTIONS --------------------------- */

router.get('/directions', async (req, res) => {
  try {
    const directions = await Direction.find().sort('name');
    res.json({ directions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/directions', async (req, res) => {
  try {
    const { name, label, description } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'The "name" field is required.' });
    }
    const direction = await Direction.create({ name, label, description });
    res.status(201).json({ direction });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'This directorate already exists.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/directions/:id', async (req, res) => {
  try {
    const { label, description, isActive } = req.body;
    const direction = await Direction.findByIdAndUpdate(
      req.params.id,
      { label, description, isActive },
      { new: true, runValidators: true }
    );
    if (!direction) return res.status(404).json({ message: 'Direction not found.' });
    res.json({ direction });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/directions/:id', async (req, res) => {
  const direction = await Direction.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!direction) return res.status(404).json({ message: 'Direction not found.' });
  res.json({ message: 'Direction deactivated', direction });
});

/* -------------------------- DEPARTMENTS -------------------------- */

router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find().populate('direction', 'name label').sort('name');
    res.json({ departments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/departments', async (req, res) => {
  try {
    const { name, label, description, direction } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'The "name" field is required.' });
    }
    const department = await Department.create({ name, label, description, direction: direction || null });
    res.status(201).json({ department });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'This department already exists.' });
    }
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/departments/:id', async (req, res) => {
  try {
    const { label, description, direction, isActive } = req.body;
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      { label, description, direction, isActive },
      { new: true, runValidators: true }
    );
    if (!department) return res.status(404).json({ message: 'Department not found.' });
    res.json({ department });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/departments/:id', async (req, res) => {
  const department = await Department.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!department) return res.status(404).json({ message: 'Department not found.' });
  res.json({ message: 'Department deactivated.', department });
});

module.exports = router;

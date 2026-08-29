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

// Toutes les routes ci-dessous nécessitent d'être connecté ET d'avoir le rôle Admin.
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
 * CRÉATION d'un utilisateur depuis la console admin.
 * Contrairement à /api/auth/register (public), un Admin peut ici choisir
 * directement le rôle, la direction et le département de l'utilisateur.
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
    if (!roleDoc) return res.status(400).json({ message: 'Rôle invalide ou inactif' });
    if (!directionDoc) return res.status(400).json({ message: 'Direction invalide ou inactive' });
    if (!departmentDoc) return res.status(400).json({ message: 'Département invalide ou inactif' });

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

    res.status(201).json({ message: 'Utilisateur créé', user: userSafe });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * MODIFICATION d'un utilisateur (infos générales, hors mot de passe et rôle).
 * Le changement de rôle reste sur sa route dédiée (PUT /users/:id/role)
 * pour garder une trace explicite de cette action sensible.
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
      if (!directionDoc) return res.status(400).json({ message: 'Direction invalide ou inactive' });
      update.direction = directionDoc._id;
    }

    if (department !== undefined) {
      const departmentDoc = await Department.findOne({ _id: department, isActive: true });
      if (!departmentDoc) return res.status(400).json({ message: 'Département invalide ou inactif' });
      update.department = departmentDoc._id;
    }

    const user = await User.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    })
      .select('-password')
      .populate(USER_POPULATE);

    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    res.json({ message: 'Utilisateur mis à jour', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * SUPPRESSION d'un utilisateur.
 * Soft delete par défaut (isActive: false) pour préserver l'historique
 * (projets créés, appartenance à des équipes, etc.) et bloquer sa connexion.
 * Un DELETE avec ?hard=true supprime réellement le document.
 */
router.delete('/users/:id', async (req, res) => {
  try {
    if (req.user.id === req.params.id) {
      return res.status(400).json({ message: 'Vous ne pouvez pas supprimer votre propre compte' });
    }

    if (req.query.hard === 'true') {
      const user = await User.findByIdAndDelete(req.params.id);
      if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });
      await RefreshToken.deleteMany({ user: user._id });
      return res.json({ message: 'Utilisateur supprimé définitivement' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    ).select('-password').populate(USER_POPULATE);

    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable' });

    // Révoque ses sessions actives pour que la désactivation soit immédiate.
    await RefreshToken.updateMany(
      { user: user._id, revokedAt: null },
      { revokedAt: new Date() }
    );

    res.json({ message: 'Utilisateur désactivé', user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * Changement de rôle d'un utilisateur.
 * C'est la SEULE façon de faire évoluer le rôle d'un compte
 * (l'inscription publique impose toujours un rôle par défaut).
 */
router.put('/users/:id/role', async (req, res) => {
  try {
    const { role } = req.body;
    if (!role) {
      return res.status(400).json({ message: 'Le champ "role" (id) est requis' });
    }

    const roleDoc = await Role.findOne({ _id: role, isActive: true });
    if (!roleDoc) {
      return res.status(400).json({ message: 'Rôle invalide ou inactif' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role: roleDoc._id },
      { new: true }
    )
      .select('-password')
      .populate(USER_POPULATE);

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur introuvable' });
    }

    // Remarque : les tokens déjà émis pour cet utilisateur gardent l'ancien
    // rôle jusqu'à expiration/refresh (le rôle est embarqué dans le JWT).
    // Pour une prise d'effet immédiate, il faudrait aussi révoquer ses
    // refresh tokens actifs (RefreshToken.updateMany) afin de le forcer
    // à se reconnecter.
    res.json({ message: 'Rôle mis à jour', user });
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
      return res.status(400).json({ message: 'Le champ "name" est requis' });
    }
    const role = await Role.create({ name, label, description, permissions });
    res.status(201).json({ role });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Ce rôle existe déjà' });
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
    if (!role) return res.status(404).json({ message: 'Rôle introuvable' });
    res.json({ role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/roles/:id', async (req, res) => {
  // Désactivation plutôt que suppression : évite de casser les comptes existants.
  const role = await Role.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!role) return res.status(404).json({ message: 'Rôle introuvable' });
  res.json({ message: 'Rôle désactivé', role });
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
      return res.status(400).json({ message: 'Le champ "name" est requis' });
    }
    const direction = await Direction.create({ name, label, description });
    res.status(201).json({ direction });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Cette direction existe déjà' });
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
    if (!direction) return res.status(404).json({ message: 'Direction introuvable' });
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
  if (!direction) return res.status(404).json({ message: 'Direction introuvable' });
  res.json({ message: 'Direction désactivée', direction });
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
      return res.status(400).json({ message: 'Le champ "name" est requis' });
    }
    const department = await Department.create({ name, label, description, direction: direction || null });
    res.status(201).json({ department });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: 'Ce département existe déjà' });
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
    if (!department) return res.status(404).json({ message: 'Département introuvable' });
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
  if (!department) return res.status(404).json({ message: 'Département introuvable' });
  res.json({ message: 'Département désactivé', department });
});

module.exports = router;

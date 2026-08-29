const express = require('express');
const Role = require('../models/role');
const Direction = require('../models/direction');
const Department = require('../models/department');

const router = express.Router();

/**
 * Ces routes sont volontairement PUBLIQUES (pas de middleware `auth`) :
 * le frontend en a besoin pour peupler les listes déroulantes
 * (rôle / direction / département) au moment de la création de compte,
 * avant que l'utilisateur ne soit authentifié.
 *
 * Seuls les éléments actifs (isActive: true) sont renvoyés.
 */

router.get('/roles', async (req, res) => {
  try {
    const roles = await Role.find({ isActive: true })
      .select('name label description')
      .sort('name');
    res.json({ roles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/directions', async (req, res) => {
  try {
    const directions = await Direction.find({ isActive: true })
      .select('name label description')
      .sort('name');
    res.json({ directions });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/departments', async (req, res) => {
  try {
    const departments = await Department.find({ isActive: true })
      .select('name label description direction')
      .populate('direction', 'name label')
      .sort('name');
    res.json({ departments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

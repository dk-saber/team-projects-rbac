const express = require('express');
const Role = require('../models/role');
const Direction = require('../models/direction');
const Department = require('../models/department');

const router = express.Router();

/**
 * These routes are intentionally PUBLIC (no `auth` middleware):
 * the frontend needs them to populate dropdown lists
 * (role / direction / department) during account creation,
 * before the user is authenticated.
 *
 * Only active items (`isActive: true`) are returned.
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

const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { authorizePermissions } = require('../middleware/rbac');
const Project = require('../models/project');

const router = express.Router();

// All project routes require authentication.
router.use(auth);

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * LIST of projects.
 * Accessible to any authenticated user (read access).
 */
router.get('/', async (req, res) => {
  try {
    const projects = await Project.find({ isArchived: false })
      .populate('direction', 'name label')
      .populate('department', 'name label')
      .populate('createdBy', 'username name lastname')
      .populate('members', 'username name lastname')
      .sort('-createdAt');

    res.json({ projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PROJECT DETAILS.
 */
router.get('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid project ID.' });
    }

    const project = await Project.findOne({ _id: req.params.id, isArchived: false })
      .populate('direction', 'name label')
      .populate('department', 'name label')
      .populate('createdBy', 'username name lastname')
      .populate('members', 'username name lastname');

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * PROJECT CREATION.
 * Restricted to roles that have the 'project:create' permission
 * (by default: Admin and DevOps — see `scripts/seed.js`).
 */
router.post(
  '/',
  authorizePermissions('project:create'),
  async (req, res) => {
    try {
      const { name, description, status, startDate, endDate, direction, department, members } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Project name is required.' });
      }

      const project = await Project.create({
        name,
        description,
        status,
        startDate,
        endDate,
        direction: direction || null,
        department: department || null,
        members: Array.isArray(members) ? members : [],
        createdBy: req.user.id
      });

      const populated = await project.populate([
        { path: 'direction', select: 'name label' },
        { path: 'department', select: 'name label' },
        { path: 'createdBy', select: 'username name lastname' },
        { path: 'members', select: 'username name lastname' }
      ]);

      res.status(201).json({ message: 'Projet créé', project: populated });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * PROJECT UPDATE.
 * Restricted to roles that have the 'project:update' permission
 * (by default: Admin, DevOps, and Dev — see `scripts/seed.js`).
 */

router.put(
  '/:id',
  authorizePermissions('project:update'),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'The provided project ID is invalid.' });
      }

      const {
        name,
        description,
        status,
        startDate,
        endDate,
        direction,
        department,
        members
      } = req.body;

      const update = {};
      if (name !== undefined) update.name = name;
      if (description !== undefined) update.description = description;
      if (status !== undefined) update.status = status;
      if (startDate !== undefined) update.startDate = startDate;
      if (endDate !== undefined) update.endDate = endDate;
      if (direction !== undefined) update.direction = direction || null;
      if (department !== undefined) update.department = department || null;
      if (members !== undefined) update.members = Array.isArray(members) ? members : [];

      const project = await Project.findOneAndUpdate(
        { _id: req.params.id, isArchived: false },
        update,
        { new: true, runValidators: true }
      )
        .populate('direction', 'name label')
        .populate('department', 'name label')
        .populate('createdBy', 'username name lastname')
        .populate('members', 'username name lastname');

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      res.json({ message: 'Project updated successfully.', project });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * PROJECT DELETION.
 * Restricted to roles that have the 'project:delete' permission
 * (by default: Admin — see `scripts/seed.js`).
 * Projects are archived (soft delete) rather than permanently deleted
 * in order to preserve historical records.
 */
router.delete(
  '/:id',
  authorizePermissions('project:delete'),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Invalid project ID' });
      }

      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { isArchived: true },
        { new: true }
      );

      if (!project) {
        return res.status(404).json({ message: 'Project not found.' });
      }

      res.json({ message: 'Project deleted (archived).' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

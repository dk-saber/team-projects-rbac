const express = require('express');
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const { authorizePermissions } = require('../middleware/rbac');
const Project = require('../models/project');

const router = express.Router();

// Toutes les routes projets nécessitent d'être authentifié.
router.use(auth);

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * LISTE des projets.
 * Accessible à tout utilisateur connecté (lecture).
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
 * DÉTAIL d'un projet.
 */
router.get('/:id', async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant de projet invalide' });
    }

    const project = await Project.findOne({ _id: req.params.id, isArchived: false })
      .populate('direction', 'name label')
      .populate('department', 'name label')
      .populate('createdBy', 'username name lastname')
      .populate('members', 'username name lastname');

    if (!project) {
      return res.status(404).json({ message: 'Projet introuvable' });
    }

    res.json({ project });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * CRÉATION d'un projet.
 * Réservé aux rôles disposant de la permission 'project:create'
 * (par défaut : Admin, Devops — voir scripts/seed.js).
 */
router.post(
  '/',
  authorizePermissions('project:create'),
  async (req, res) => {
    try {
      const { name, description, status, startDate, endDate, direction, department, members } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Le nom du projet est requis' });
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
 * MODIFICATION d'un projet.
 * Réservé aux rôles disposant de la permission 'project:update'
 * (par défaut : Admin, Devops, Dev — voir scripts/seed.js).
 */
router.put(
  '/:id',
  authorizePermissions('project:update'),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Identifiant de projet invalide' });
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
        return res.status(404).json({ message: 'Projet introuvable' });
      }

      res.json({ message: 'Projet mis à jour', project });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

/**
 * SUPPRESSION d'un projet.
 * Réservé aux rôles disposant de la permission 'project:delete'
 * (par défaut : Admin — voir scripts/seed.js).
 * On archive (soft delete) plutôt que de supprimer réellement,
 * afin de conserver l'historique.
 */
router.delete(
  '/:id',
  authorizePermissions('project:delete'),
  async (req, res) => {
    try {
      if (!isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: 'Identifiant de projet invalide' });
      }

      const project = await Project.findByIdAndUpdate(
        req.params.id,
        { isArchived: true },
        { new: true }
      );

      if (!project) {
        return res.status(404).json({ message: 'Projet introuvable' });
      }

      res.json({ message: 'Projet supprimé (archivé)' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;

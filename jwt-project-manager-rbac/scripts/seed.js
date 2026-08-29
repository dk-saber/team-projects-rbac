/**
 * Script de seed : initialise les collections Role / Direction / Department
 * avec les valeurs de base, et crée un compte Admin si aucun n'existe.
 *
 * Usage : npm run seed
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Role = require('../models/role');
const Direction = require('../models/direction');
const Department = require('../models/department');
const User = require('../models/user');

const ROLES = [
  { name: 'Admin', label: 'Administrateur', permissions: ['*'] },
  { name: 'Dev', label: 'Développeur', permissions: ['project:read', 'project:update'] },
  { name: 'Test', label: 'Testeur', permissions: ['project:read'] },
  { name: 'Ops', label: 'Opérations', permissions: ['project:read'] },
  { name: 'Devops', label: 'DevOps', permissions: ['project:read', 'project:create', 'project:update', 'project:delete', 'project:deploy'] }
];

const DIRECTIONS = ['Dir1', 'Dir2', 'Dir3'];
const DEPARTMENTS = ['Dep1', 'Dep2', 'Dep3'];

async function upsertRole(r) {
  return Role.findOneAndUpdate(
    { name: r.name },
    { $setOnInsert: r },
    { upsert: true, new: true }
  );
}

async function upsertDirection(name) {
  return Direction.findOneAndUpdate(
    { name },
    { $setOnInsert: { name, label: name } },
    { upsert: true, new: true }
  );
}

async function upsertDepartment(name) {
  return Department.findOneAndUpdate(
    { name },
    { $setOnInsert: { name, label: name } },
    { upsert: true, new: true }
  );
}

async function run() {
  await connectDB();

  console.log('Seeding roles...');
  const roleDocs = {};
  for (const r of ROLES) {
    roleDocs[r.name] = await upsertRole(r);
  }

  console.log('Seeding directions...');
  const directionDocs = {};
  for (const name of DIRECTIONS) {
    directionDocs[name] = await upsertDirection(name);
  }

  console.log('Seeding departments...');
  const departmentDocs = {};
  for (const name of DEPARTMENTS) {
    departmentDocs[name] = await upsertDepartment(name);
  }

  // Crée un compte Admin par défaut s'il n'en existe aucun.
  const adminExists = await User.findOne({ role: roleDocs['Admin']._id });
  if (!adminExists) {
    const defaultPassword = process.env.SEED_ADMIN_PASSWORD || 'ChangeMe123!';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await User.create({
      name: 'Super',
      lastname: 'Admin',
      username: 'admin',
      email: process.env.SEED_ADMIN_EMAIL || 'admin@example.com',
      password: hashedPassword,
      role: roleDocs['Admin']._id,
      direction: directionDocs['Dir1']._id,
      department: departmentDocs['Dep1']._id
    });

    console.log(
      `Compte Admin créé -> email: ${process.env.SEED_ADMIN_EMAIL || 'admin@example.com'} / mot de passe: ${defaultPassword}`
    );
    console.log('⚠️  Pensez à changer ce mot de passe immédiatement.');
  } else {
    console.log('Un compte Admin existe déjà, aucun compte créé.');
  }

  console.log('Seed terminé.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('Erreur pendant le seed :', err);
  process.exit(1);
});

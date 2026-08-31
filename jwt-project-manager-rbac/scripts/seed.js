/**
 * Seed script: initializes the Role, Directorate, and Department collections
 * with their default values, and creates an Admin account if none exists.
 *
 * Usage: npm run seed
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
  { name: 'Admin', label: 'Administrator', permissions: ['*'] },
  { name: 'Dev', label: 'Développer', permissions: ['project:read', 'project:update'] },
  { name: 'Test', label: 'Tester', permissions: ['project:read'] },
  { name: 'Ops', label: 'Operations', permissions: ['project:read'] },
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

  // Creates a default Admin account if none exists.
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
      `Admin account created -> email: ${process.env.SEED_ADMIN_EMAIL || 'admin@example.com'} / password: ${defaultPassword}`
    );
    console.log('Make sure to change this password immediately..');
  } else {
    console.log('An Admin account already exists, so no new account was created..');
  }

  console.log('Seed completed.');
  await mongoose.disconnect();
  process.exit(0);
}

run().catch((err) => {
  console.error('An error occurred during the seed process :', err);
  process.exit(1);
});

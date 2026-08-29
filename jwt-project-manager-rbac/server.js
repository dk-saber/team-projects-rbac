require('dotenv').config();
const express = require('express');
const cors = require('cors'); 
const connectDB = require('./config/db');
const app = express();

// Nécessaire derrière un reverse proxy (nginx, load balancer, Heroku, etc.)
// pour que req.ip reflète la vraie IP du client et non celle du proxy.
// Sans ça, express-rate-limit limiterait tout le monde comme une seule IP.
// "1" = on fait confiance au premier proxy en amont (cas le plus courant).
// Ajuster si plusieurs proxies sont chaînés (voir doc Express "trust proxy").
app.set('trust proxy', 1);
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profile');
const metaRoutes = require('./routes/meta');
const adminRoutes = require('./routes/admin');
const projectRoutes = require('./routes/project');
const cookieParser = require('cookie-parser');



// CORS_ORIGIN accepts one or more origins separated by commas,
// useful when the frontend is not served at http://localhost:3000
// (e.g., remote environments like Killercoda, staging, etc.)
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const allowAnyOrigin = allowedOrigins.includes('*');

app.use(cors({
  origin: (origin, callback) => {
    // Allows requests without an Origin header (e.g., curl, health checks)
    if (!origin || allowAnyOrigin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} non autorisée par CORS`));
  },
  credentials: true
}));

app.use(express.json());
app.use(cookieParser());                    // <-- to be moved BEFORE the roads
connectDB();
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/meta', metaRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/projects', projectRoutes);


app.get('/', (req, res) => {
  res.send('JWT Auth API running');
});

// Utilisé par les sondes liveness/readiness (Kubernetes, load balancers, etc.).
// Volontairement minimal : pas de dépendance DB pour rester rapide et fiable.
app.get('/healthz', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

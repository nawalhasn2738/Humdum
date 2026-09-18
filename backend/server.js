require('dotenv').config();

const express = require('express');
const cors = require('cors');
const pool = require('./db');
const { authenticate } = require('./middleware/auth');
const authRoutes = require('./routes/auth.routes');
const listingRoutes = require('./routes/listing.routes');
const complianceRoutes = require('./routes/compliance.routes');
const auditLogRoutes = require('./routes/audit-log.routes');
const messageRoutes = require('./routes/message.routes');
const adminRoutes = require('./routes/admin.routes');
const familyRoutes = require('./routes/family.routes');
const tenancyRoutes = require('./routes/tenancy.routes');
const uploadRoutes = require('./routes/upload.routes');
const { closeRedis } = require('./config/redis');
const { closeComplianceQueue } = require('./queues/compliance.queue');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_ORIGIN,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/listings', complianceRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/family-profiles', familyRoutes);
app.use('/api/tenancies', tenancyRoutes);
app.use('/api/uploads', uploadRoutes);

app.get('/', (req, res) => {
  res.send('Humdum Backend is running live!');
});

app.get('/test-db', async (req, res) => {
  try {
    const result = await pool.query('SELECT NOW() AS current_time');
    res.json({ currentTime: result.rows[0].current_time });
  } catch (error) {
    console.error('Database connection test failed:', error.message);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.get('/api/protected', authenticate, (req, res) => {
  res.json({
    message: 'You have access to this protected route.',
    user: req.user,
  });
});

app.use((error, req, res, next) => {
  if (error && String(error.message).includes('not allowed by CORS')) {
    return res.status(403).json({ error: 'Origin is not allowed by CORS.' });
  }

  return next(error);
});

const server = app.listen(PORT, () => {
  console.log(`Humdum Backend is running on port ${PORT}`);
});

let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received; shutting down gracefully.`);

  server.close(async (error) => {
    const results = await Promise.allSettled([
      closeComplianceQueue(),
      closeRedis(),
      pool.end(),
    ]);

    for (const result of results) {
      if (result.status === 'rejected') {
        console.error('Shutdown cleanup failed:', result.reason);
      }
    }

    process.exit(error ? 1 : 0);
  });
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));









require('dotenv').config();
const { validateSupabaseEnvironment } = require('./services/supabase');
validateSupabaseEnvironment();
const pool = require('./db');
const { createApp } = require('./app');
const { closeRedis } = require('./config/redis');
const { closeComplianceQueue } = require('./queues/compliance.queue');

const PORT = process.env.PORT || 5000;
const server = createApp().listen(PORT, () => console.log(`Humdum Backend is running on port ${PORT}`));
let shuttingDown = false;
function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received; shutting down gracefully.`);
  server.close(async (error) => {
    const results = await Promise.allSettled([closeComplianceQueue(), closeRedis(), pool.end()]);
    for (const result of results) if (result.status === 'rejected') console.error('Shutdown cleanup failed:', result.reason);
    process.exit(error ? 1 : 0);
  });
}
process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

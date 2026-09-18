require('dotenv').config();

const { Worker } = require('bullmq');
const { getBullConnection } = require('../config/bullmq');
const { QUEUE_NAME } = require('../queues/compliance.queue');

const connection = getBullConnection({ worker: true });

if (!connection) {
  console.error('REDIS_URL is required to start the compliance worker.');
  process.exit(1);
}

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    if (job.name !== 'compliance-audit-notification') {
      throw new Error(`Unsupported job type: ${job.name}`);
    }

    const { listingId, auditId, action, actorId } = job.data;

    // Replace this with the selected email, SMS, or push provider integration.
    console.log(
      `Processed compliance notification for listing ${listingId}, audit ${auditId}, action ${action}, actor ${actorId}.`
    );

    return { processedAt: new Date().toISOString() };
  },
  {
    connection,
    concurrency: Number(process.env.COMPLIANCE_WORKER_CONCURRENCY || 5),
  }
);

worker.on('completed', (job) => {
  console.log(`Compliance job ${job.id} completed.`);
});
worker.on('failed', (job, error) => {
  console.error(`Compliance job ${job?.id || 'unknown'} failed:`, error.message);
});
worker.on('error', (error) => {
  console.error('Compliance worker error:', error.message);
});

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  console.log(`${signal} received; closing compliance worker.`);
  await worker.close();
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

console.log(`Compliance worker listening on queue ${QUEUE_NAME}.`);

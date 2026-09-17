const { Queue } = require('bullmq');
const { getBullConnection } = require('../config/bullmq');

const QUEUE_NAME = 'compliance-notifications';
let queue;
let warnedMissingUrl = false;

function getComplianceQueue() {
  const connection = getBullConnection();

  if (!connection) {
    if (!warnedMissingUrl) {
      console.warn('REDIS_URL is not configured; background jobs are disabled.');
      warnedMissingUrl = true;
    }
    return null;
  }

  if (!queue) {
    queue = new Queue(QUEUE_NAME, {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 3600, count: 1000 },
        removeOnFail: { age: 86400, count: 1000 },
      },
    });
    queue.on('error', (error) => {
      console.error('Compliance queue error:', error.message);
    });
  }

  return queue;
}

async function enqueueComplianceNotification(data) {
  const complianceQueue = getComplianceQueue();

  if (!complianceQueue) {
    return null;
  }

  return complianceQueue.add('compliance-audit-notification', data, {
    jobId: `audit-${data.auditId}-${data.action}-${Date.now()}`,
  });
}

async function closeComplianceQueue() {
  if (queue) {
    await queue.close();
  }
}

module.exports = {
  QUEUE_NAME,
  closeComplianceQueue,
  enqueueComplianceNotification,
};




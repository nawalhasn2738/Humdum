function getBullConnection({ worker = false } = {}) {
  if (!process.env.REDIS_URL) {
    return null;
  }

  const url = new URL(process.env.REDIS_URL);
  const database = Number(url.pathname.replace('/', '') || 0);

  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: database,
    tls: url.protocol === 'rediss:' ? {} : undefined,
    maxRetriesPerRequest: worker ? null : 1,
    enableReadyCheck: true,
  };
}

module.exports = { getBullConnection };

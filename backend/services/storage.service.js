const { createClient } = require('@supabase/supabase-js');

let storageClient;
let bucketPromise;

function getStorageConfig() {
  const url = process.env.SUPABASE_URL;
  const secretKey =
    process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET;

  if (!url || !secretKey || !bucket) {
    throw new Error(
      'SUPABASE_URL, SUPABASE_STORAGE_BUCKET, and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required.'
    );
  }

  return { url, secretKey, bucket };
}

function getStorageClient() {
  if (!storageClient) {
    const { url, secretKey } = getStorageConfig();
    storageClient = createClient(url, secretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }

  return storageClient;
}

async function ensurePrivateBucket() {
  if (!bucketPromise) {
    bucketPromise = (async () => {
      const { bucket } = getStorageConfig();
      const client = getStorageClient();
      const { data, error } = await client.storage.getBucket(bucket);

      if (data && !error) {
        if (data.public) {
          throw new Error(`Storage bucket ${bucket} must be private.`);
        }
        return bucket;
      }

      const maxBytes = Number(process.env.MAX_UPLOAD_BYTES || 10 * 1024 * 1024);
      const createResult = await client.storage.createBucket(bucket, {
        public: false,
        fileSizeLimit: maxBytes,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
      });

      if (createResult.error && Number(createResult.error.statusCode) !== 409) {
        throw createResult.error;
      }

      return bucket;
    })().catch((error) => {
      bucketPromise = null;
      throw error;
    });
  }

  return bucketPromise;
}

module.exports = { ensurePrivateBucket, getStorageClient, getStorageConfig };


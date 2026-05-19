import { list, del, BlobServiceRateLimited } from '@vercel/blob';
import { setTimeout } from 'node:timers/promises';

async function deleteAllBlobs() {
  let cursor;
  let totalDeleted = 0;
  const BATCH_SIZE = 100;
  const DELAY_MS = 1000;

  do {
    const listResult = await list({ cursor, limit: BATCH_SIZE });

    if (listResult.blobs.length > 0) {
      const batchUrls = listResult.blobs.map((blob) => blob.url);
      let retries = 0;
      const maxRetries = 3;

      while (retries <= maxRetries) {
        try {
          await del(batchUrls);
          totalDeleted += listResult.blobs.length;
          console.log(`Deleted ${listResult.blobs.length} blobs (${totalDeleted} total)`);
          break;
        } catch (error) {
          retries++;
          if (retries > maxRetries) { console.error('Failed after max retries:', error); throw error; }
          let backoffDelay = 2 ** retries * 1000;
          if (error instanceof BlobServiceRateLimited) backoffDelay = error.retryAfter * 1000;
          console.warn(`Retry ${retries}/${maxRetries} after ${backoffDelay}ms`);
          await setTimeout(backoffDelay);
        }
        await setTimeout(DELAY_MS);
      }
    }

    cursor = listResult.cursor;
  } while (cursor);

  console.log(`Done. Total deleted: ${totalDeleted}`);
}

deleteAllBlobs().catch(console.error);

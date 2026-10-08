import withAuth from '@/lib/auth/auth';
import emailDB from '@/lib/db/email';
import { success, failure } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

async function archiveHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return failure(res, 'Method not allowed', 405);
  const ids: unknown = req.body;
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 99 ||
      ids.some(id => typeof id !== 'number' || !Number.isSafeInteger(id) || id < 1)) {
    return failure(res, 'Provide 1 to 99 positive integer email IDs', 400);
  }
  try {
    await emailDB.archive(ids);
    return success(res, null);
  } catch (error) {
    console.error('Failed to archive emails:', error);
    return failure(res, 'Failed to archive emails', 500);
  }
}

export default withAuth(archiveHandler);

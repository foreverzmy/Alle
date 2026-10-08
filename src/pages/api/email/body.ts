import withAuth from '@/lib/auth/auth';
import emailDB from '@/lib/db/email';
import { success, failure } from '@/types';
import type { NextApiRequest, NextApiResponse } from 'next';

async function bodyHandler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return failure(res, 'Method not allowed', 405);
  const id = typeof req.query.id === 'string' ? Number(req.query.id) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) return failure(res, 'id must be a positive integer', 400);

  res.setHeader('Cache-Control', 'private, no-store');
  try {
    const body = await emailDB.getBody(id);
    if (!body) return failure(res, 'Email not found', 404);
    return success(res, body);
  } catch (e) {
    console.error('Failed to fetch email body:', e);
    return failure(res, 'Failed to fetch email body', 500);
  }
}

export default withAuth(bodyHandler);

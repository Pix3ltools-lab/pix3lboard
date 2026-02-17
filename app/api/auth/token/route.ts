import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/lib/auth/auth';
import { TokenRequestSchema } from '@/lib/validation/apiSchemas';
import {
  checkRateLimit,
  recordFailedAttempt,
  clearFailedAttempts,
} from '@/lib/auth/validation';
import logger from '../../../../lib/logger'

export const dynamic = 'force-dynamic';

/**
 * @swagger
 * /api/auth/token:
 *   post:
 *     summary: Exchange credentials for a Bearer token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: JWT token returned
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                 expires_in:
 *                   type: string
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     name:
 *                       type: string
 *       400:
 *         description: Invalid request body
 *       401:
 *         description: Invalid credentials
 *       429:
 *         description: Too many failed attempts
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = TokenRequestSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', issues: validation.error.issues },
        { status: 400 }
      );
    }

    const { email, password } = validation.data;
    const normalizedEmail = email.toLowerCase();

    // Check rate limiting
    const rateLimit = await checkRateLimit(normalizedEmail, 'api-token');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: rateLimit.error },
        {
          status: 429,
          headers: rateLimit.retryAfter ? { 'Retry-After': String(rateLimit.retryAfter) } : {},
        }
      );
    }

    const result = await login(normalizedEmail, password);

    if ('error' in result) {
      await recordFailedAttempt(normalizedEmail, 'api-token');
      return NextResponse.json({ error: result.error }, { status: 401 });
    }

    // Clear failed attempts on success
    await clearFailedAttempts(normalizedEmail, 'api-token');

    return NextResponse.json({
      token: result.token,
      expires_in: '7d',
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Token endpoint error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

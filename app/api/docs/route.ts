import { NextResponse } from 'next/server';
import { getApiDocs } from '@/lib/swagger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/docs - Serves the OpenAPI JSON spec
 */
export async function GET() {
  const spec = getApiDocs();
  return NextResponse.json(spec);
}

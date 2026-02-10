import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/apiAuth';
import { NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const result = await requireAuth(request, 'viewer');
  if (result instanceof NextResponse) return result;
  return NextResponse.json({ user: result.user });
}

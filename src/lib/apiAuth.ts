import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export type UserRole = 'viewer' | 'sampler' | 'admin';

const roleHierarchy: Record<UserRole, number> = {
  viewer: 1,
  sampler: 2,
  admin: 3,
};

/**
 * Validate the session cookie and return the user, or a 401/403 response.
 * Usage:
 *   const result = await requireAuth(request, 'admin');
 *   if (result instanceof NextResponse) return result;
 *   const { user } = result;
 */
export async function requireAuth(
  request: NextRequest,
  requiredRole: UserRole = 'viewer'
): Promise<{ user: { id: string; email: string; role: UserRole } } | NextResponse> {
  const sessionToken = request.cookies.get('session')?.value;

  if (!sessionToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Look up the session token in the DB
  const { data: session, error } = await supabaseAdmin
    .from('sessions')
    .select('user_id, expires_at, users(id, email, role, is_active)')
    .eq('token', sessionToken)
    .single();

  if (error || !session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (new Date(session.expires_at) < new Date()) {
    // Clean up expired session
    await supabaseAdmin.from('sessions').delete().eq('token', sessionToken);
    return NextResponse.json({ error: 'Session expired' }, { status: 401 });
  }

  const userData = (Array.isArray(session.users) ? session.users[0] : session.users) as unknown as { id: string; email: string; role: UserRole; is_active: boolean } | null;

  if (!userData || !userData.is_active) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (roleHierarchy[userData.role] < roleHierarchy[requiredRole]) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  return { user: { id: userData.id, email: userData.email, role: userData.role } };
}

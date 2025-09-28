import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getDatabaseUserId } from '@/utils/auth-helpers';
import { requireInternalAccess } from '@/utils/internal-guard';

export async function GET(request: NextRequest) {
  const guard = await requireInternalAccess(request);
  if (!guard.ok) return guard.res;
  try {
    const authUser = await getAuthenticatedUser(request);
    
    if (!authUser) {
      return NextResponse.json({
        authenticated: false,
        message: 'No valid authentication found'
      });
    }

    const dbUserId = await getDatabaseUserId(authUser);

    return NextResponse.json({
      authenticated: true,
      authSource: authUser.source,
      userId: authUser.userId,
      userEmail: authUser.userEmail,
      databaseUserId: dbUserId
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Authentication test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Bearer token required' },
        { status: 401 }
      );
    }

    const currentToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify user is authenticated via Supabase
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // For Sprint 9 implementation, we'll generate a new token
    // In production, this would validate the existing token and refresh it properly
    const newToken = `token_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Store the new token (in production, use proper token management)
    globalThis.deviceTokens = globalThis.deviceTokens || new Map();
    globalThis.deviceTokens.set(newToken, {
      token: newToken,
      userId: user.id,
      userEmail: user.email,
      expiresAt,
      refreshedAt: new Date().toISOString(),
      previousToken: currentToken,
    });

    console.log(`[Device Refresh] Refreshed token for user ${user.email}`);

    return NextResponse.json({
      token: newToken,
      expiresAt,
    });
  } catch (error) {
    console.error('[Device Refresh] Error:', error);
    return NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
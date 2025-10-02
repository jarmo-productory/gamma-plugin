import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { withCors, handleOPTIONS } from '@/utils/cors';

// Declare Node.js runtime for secure operations
export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return handleOPTIONS(request);
}

export async function POST(request: NextRequest) {
  try {
    // Extract Bearer token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return withCors(NextResponse.json(
        { error: 'Bearer token required' },
        { status: 401 }
      ), request);
    }

    const currentToken = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Use regular Supabase client - RPC handles validation internally
    const supabase = await createClient();
    
    // Call secure token rotation RPC
    const { data, error } = await supabase.rpc('rotate_device_token', {
      input_token: currentToken
    });

    if (error) {
      // Handle specific error cases for proper HTTP responses
      if (error.message === 'TOKEN_INVALID') {
        return withCors(NextResponse.json(
          { error: 'Invalid or expired token' },
          { status: 401 }
        ), request);
      }

      console.error('[Device Refresh] RPC error:', error);
      return withCors(NextResponse.json(
        { error: 'Token refresh failed' },
        { status: 500 }
      ), request);
    }

    if (!data || data.length === 0) {
      return withCors(NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      ), request);
    }

    const rotationResult = data[0];

    console.log(`[Device Refresh] SECURE: Token rotated for device ${rotationResult.device_id}, user ${rotationResult.user_id}`);

    return withCors(NextResponse.json({
      token: rotationResult.token,
      expiresAt: rotationResult.expires_at
    }), request);
  } catch (error) {
    console.error('[Device Refresh] Error:', error);
    return withCors(NextResponse.json(
      { error: 'Failed to refresh token' },
      { status: 500 }
    ), request);
  }
}
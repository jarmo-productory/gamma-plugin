import { NextRequest, NextResponse } from 'next/server';
import { validateToken } from '@/utils/tokenStore';

export async function GET(request: NextRequest) {
  try {
    // Get the device token from Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization header required' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix
    
    // Validate token format (should match the format from exchange endpoint)
    if (!token.startsWith('token_')) {
      return NextResponse.json(
        { error: 'Invalid token format' },
        { status: 401 }
      );
    }

    // SPRINT 16 FIX: Use database-based token validation
    const tokenData = await validateToken(token);
    if (!tokenData) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    const userInfo = {
      id: tokenData.userId,
      email: tokenData.userEmail,
      linkedAt: tokenData.issuedAt,
      lastSeen: tokenData.lastUsed
    };

    console.log(`[User Profile] Retrieved profile for user: ${userInfo.email}`);

    return NextResponse.json({
      user: {
        id: userInfo.id,
        email: userInfo.email,
        name: userInfo.email.split('@')[0], // Use email prefix as name for now
        linkedAt: userInfo.linkedAt,
        lastSeen: userInfo.lastSeen
      }
    });
  } catch (error) {
    console.error('[User Profile] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}
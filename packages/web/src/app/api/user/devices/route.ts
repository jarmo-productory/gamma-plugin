import { NextRequest, NextResponse } from 'next/server';
import { getTokenStoreStatus } from '@/utils/tokenStore';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get user ID from Supabase authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Get all tokens from in-memory storage and filter by user
    globalThis.deviceTokens = globalThis.deviceTokens || new Map();
    const userDevices = [];
    
    for (const [token, tokenData] of globalThis.deviceTokens.entries()) {
      if (tokenData.userId === userId) {
        userDevices.push({
          deviceId: tokenData.deviceId,
          deviceName: tokenData.deviceName || `Chrome Extension (${tokenData.deviceId.slice(0, 8)}...)`,
          connectedAt: tokenData.issuedAt,
          lastUsed: tokenData.lastUsed,
          expiresAt: tokenData.expiresAt,
          token: tokenData.token,
          isActive: new Date(tokenData.expiresAt) > new Date()
        });
      }
    }

    console.log(`[User Devices] Retrieved ${userDevices.length} devices for user: ${userId}`);

    return NextResponse.json({
      devices: userDevices,
      totalDevices: userDevices.length,
      activeDevices: userDevices.filter(d => d.isActive).length
    });
  } catch (error) {
    console.error('[User Devices] Error fetching devices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch connected devices' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Get user ID from Supabase authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required for revocation' },
        { status: 400 }
      );
    }

    // Revoke the device token from in-memory storage
    globalThis.deviceTokens = globalThis.deviceTokens || new Map();
    const tokenData = globalThis.deviceTokens.get(token);

    if (!tokenData || tokenData.userId !== userId) {
      return NextResponse.json(
        { error: 'Token not found or access denied' },
        { status: 404 }
      );
    }

    globalThis.deviceTokens.delete(token);
    console.log(`[User Devices] Revoked device token for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Device access revoked successfully'
    });
  } catch (error) {
    console.error('[User Devices] Error revoking device:', error);
    return NextResponse.json(
      { error: 'Failed to revoke device access' },
      { status: 500 }
    );
  }
}
import { NextRequest, NextResponse } from 'next/server';
import { getUserDeviceTokens, revokeDeviceToken } from '@/utils/secureTokenStore';
import { createClient } from '@/utils/supabase/server';

// Declare Node.js runtime for secure operations
export const runtime = 'nodejs';

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

    // SPRINT 19 SECURITY: Use secure RPC to get user devices (no direct table access)
    const userDevices = await getUserDeviceTokens(userId);
    
    // Map to expected API format (remove token field for security)
    const deviceList = userDevices.map(device => ({
      deviceId: device.deviceId,
      deviceName: device.deviceName,
      connectedAt: device.issuedAt,
      lastUsed: device.lastUsed,
      expiresAt: device.expiresAt,
      // Security: Never return token or hash in device listing
      isActive: device.isActive
    }));

    console.log(`[User Devices] SECURE: Retrieved ${deviceList.length} devices via RPC for user: ${userId}`);

    return NextResponse.json({
      devices: deviceList,
      totalDevices: deviceList.length,
      activeDevices: deviceList.filter(d => d.isActive).length
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
    const { deviceId } = body;

    if (!deviceId) {
      return NextResponse.json(
        { error: 'Device ID is required for revocation' },
        { status: 400 }
      );
    }

    // SPRINT 19 SECURITY: Use secure RPC for token revocation
    const success = await revokeDeviceToken(userId, deviceId);

    if (!success) {
      return NextResponse.json(
        { error: 'Device not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`[User Devices] SECURE: Revoked device ${deviceId} for user: ${userId}`);

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
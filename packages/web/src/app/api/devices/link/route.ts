import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: 'Code is required' },
        { status: 400 }
      );
    }

    // Verify user is authenticated
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if device registration exists
    global.deviceRegistrations = global.deviceRegistrations || new Map();
    const deviceInfo = global.deviceRegistrations.get(code);

    if (!deviceInfo) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > new Date(deviceInfo.expiresAt)) {
      global.deviceRegistrations.delete(code);
      return NextResponse.json(
        { error: 'Code expired' },
        { status: 404 }
      );
    }

    // Link the device to the user
    deviceInfo.linked = true;
    deviceInfo.userId = user.id;
    deviceInfo.userEmail = user.email;
    
    global.deviceRegistrations.set(code, deviceInfo);

    console.log(`[Device Link] Linked device ${deviceInfo.deviceId} to user ${user.email}`);

    return NextResponse.json({
      success: true,
      deviceId: deviceInfo.deviceId,
      message: 'Device linked successfully'
    });
  } catch (error) {
    console.error('[Device Link] Error:', error);
    return NextResponse.json(
      { error: 'Failed to link device' },
      { status: 500 }
    );
  }
}
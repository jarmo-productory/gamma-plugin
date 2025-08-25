import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { deviceId, code } = body;

    if (!deviceId || !code) {
      return NextResponse.json(
        { error: 'deviceId and code are required' },
        { status: 400 }
      );
    }

    // Check if device registration exists
    globalThis.deviceRegistrations = globalThis.deviceRegistrations || new Map();
    const deviceInfo = globalThis.deviceRegistrations.get(code);

    if (!deviceInfo) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 404 }
      );
    }

    // Check if expired
    if (new Date() > new Date(deviceInfo.expiresAt)) {
      globalThis.deviceRegistrations.delete(code);
      return NextResponse.json(
        { error: 'Code expired' },
        { status: 404 }
      );
    }

    // Check if device matches
    if (deviceInfo.deviceId !== deviceId) {
      return NextResponse.json(
        { error: 'Invalid device ID' },
        { status: 400 }
      );
    }

    // Check if device has been linked
    if (!deviceInfo.linked) {
      return NextResponse.json(
        { error: 'Device not linked yet' },
        { status: 425 } // Too Early
      );
    }

    // Generate a simple JWT-like token (in production, use proper JWT)
    const token = `token_${deviceId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    console.log(`[Device Exchange] Successful exchange for device: ${deviceId}`);

    // Clean up the registration
    globalThis.deviceRegistrations.delete(code);

    return NextResponse.json({
      token,
      expiresAt: tokenExpiresAt,
    });
  } catch (error) {
    console.error('[Device Exchange] Error:', error);
    return NextResponse.json(
      { error: 'Failed to exchange token' },
      { status: 500 }
    );
  }
}
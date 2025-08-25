import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Generate a unique device ID and pairing code
    const deviceId = `device_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const code = Math.random().toString(36).substring(2, 15).toUpperCase();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 minutes

    // In a full implementation, we'd store this in a database
    // For Sprint 9, we'll use in-memory storage
    const deviceInfo = {
      deviceId,
      code,
      expiresAt,
      linked: false,
    };

    // Store temporarily (in production, use Redis or database)
    globalThis.deviceRegistrations = globalThis.deviceRegistrations || new Map();
    globalThis.deviceRegistrations.set(code, deviceInfo);

    console.log(`[Device Register] Created device: ${deviceId} with code: ${code}`);

    return NextResponse.json({
      deviceId,
      code,
      expiresAt,
    });
  } catch (error) {
    console.error('[Device Register] Error:', error);
    return NextResponse.json(
      { error: 'Failed to register device' },
      { status: 500 }
    );
  }
}
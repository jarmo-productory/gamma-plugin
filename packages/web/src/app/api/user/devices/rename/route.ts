import { NextRequest, NextResponse } from 'next/server';
import { renameDevice } from '@/utils/secureTokenStore';
import { createClient } from '@/utils/supabase/server';

// Declare Node.js runtime for secure operations
export const runtime = 'nodejs';

export async function PATCH(request: NextRequest) {
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
    const { deviceId, newName } = body;

    if (!deviceId || !newName) {
      return NextResponse.json(
        { error: 'Device ID and new name are required' },
        { status: 400 }
      );
    }

    // Validate new name
    const trimmedName = newName.trim();
    if (trimmedName.length === 0) {
      return NextResponse.json(
        { error: 'Device name cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedName.length > 100) {
      return NextResponse.json(
        { error: 'Device name cannot exceed 100 characters' },
        { status: 400 }
      );
    }

    // SPRINT 27: Use secure RPC for device renaming
    const success = await renameDevice(userId, deviceId, trimmedName);

    if (!success) {
      return NextResponse.json(
        { error: 'Device not found or access denied' },
        { status: 404 }
      );
    }

    console.log(`[Device Rename] SECURE: Renamed device ${deviceId} to "${trimmedName}" for user: ${userId}`);

    return NextResponse.json({
      success: true,
      message: 'Device renamed successfully',
      deviceId,
      newName: trimmedName
    });
  } catch (error) {
    console.error('[Device Rename] Error renaming device:', error);
    return NextResponse.json(
      { error: 'Failed to rename device' },
      { status: 500 }
    );
  }
}
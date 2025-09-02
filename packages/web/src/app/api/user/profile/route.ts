import { NextRequest, NextResponse } from 'next/server';
import { validateSecureToken } from '@/utils/secureTokenStore';
import { createClient } from '@/utils/supabase/server';
import { ensureUserRecord } from '@/utils/user';

// Declare Node.js runtime for secure operations
export const runtime = 'nodejs';

// Handle device token authentication (for Chrome extension)
async function handleDeviceTokenAuth(request: NextRequest) {
  // Get the device token from Authorization header
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Authorization header required' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7); // Remove "Bearer " prefix
  
  // Note: New secure tokens are opaque (no prefix required)

  // SPRINT 19 SECURITY: Use secure token validation with hashing
  const tokenData = await validateSecureToken(token);
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

  console.log(`[User Profile] SECURE: Retrieved profile via hashed token for user: ${userInfo.email}`);
  
  return NextResponse.json({
    user: {
      id: userInfo.id,
      email: userInfo.email,
      name: userInfo.email.split('@')[0], // Use email prefix as name for now
      linkedAt: userInfo.linkedAt,
      lastSeen: userInfo.lastSeen
    }
  });
}

// Handle web session authentication (for web dashboard)
async function handleWebAuth(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Ensure user row exists and return unified DTO including preferences
    const appUser = await ensureUserRecord(supabase, { id: user.id, email: user.email || null })

    return NextResponse.json({
      user: {
        id: appUser.id,
        email: appUser.email || user.email,
        name: appUser.name || (user.email?.split('@')[0] ?? 'User'),
        created_at: appUser.created_at,
        email_notifications: appUser.email_notifications ?? true,
        marketing_notifications: appUser.marketing_notifications ?? false,
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

export async function GET(request: NextRequest) {
  try {
    // Check if this is a device token request (Chrome extension)
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // Try device token validation first
      const deviceResult = await handleDeviceTokenAuth(request);
      // If device token validation succeeds, return it
      if (deviceResult.status === 200) {
        return deviceResult;
      }
    }
    
    // Fallback to web session authentication
    return handleWebAuth(request);
  } catch (error) {
    console.error('[User Profile] Error:', error);
    return NextResponse.json(
      { error: 'Failed to get user profile' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name } = body;

    // Validate name input
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { error: 'Name is required and must be a string' },
        { status: 400 }
      );
    }

    if (name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Name cannot be empty' },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return NextResponse.json(
        { error: 'Name must be 255 characters or less' },
        { status: 400 }
      );
    }

    // Ensure user exists first to avoid brittle PGRST116 handling
    const appUser = await ensureUserRecord(supabase, { id: user.id, email: user.email || null })

    // Update name using maybeSingle to avoid 500 on no-row
    const { data, error: updateError } = await supabase
      .from('users')
      .update({ name: name.trim() })
      .eq('auth_id', user.id)
      .select('id, auth_id, email, name, created_at, email_notifications, marketing_notifications')
      .maybeSingle();

    if (updateError || !data) {
      const e: any = updateError;
      console.error('[User Profile] Update error:', {
        message: e?.message,
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
      });
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500 }
      );
    }

    console.log(`[User Profile] Updated name for user: ${user.id}`);

    return NextResponse.json({
      success: true,
      user: {
        id: data.id,
        email: data.email || appUser.email,
        name: data.name,
        created_at: data.created_at,
        email_notifications: data.email_notifications ?? appUser.email_notifications ?? true,
        marketing_notifications: data.marketing_notifications ?? appUser.marketing_notifications ?? false,
      }
    });
  } catch (error) {
    const e: any = error;
    console.error('[User Profile] Error updating profile:', {
      message: e?.message,
      code: e?.code,
      details: e?.details,
      hint: e?.hint,
    });
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    );
  }
}

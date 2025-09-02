import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { ensureUserRecord } from '@/utils/user';

// Declare Node.js runtime for secure operations
export const runtime = 'nodejs';

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
    const { email_notifications, marketing_notifications } = body;

    // Validate input
    if (email_notifications !== undefined && typeof email_notifications !== 'boolean') {
      return NextResponse.json(
        { error: 'email_notifications must be a boolean' },
        { status: 400 }
      );
    }

    if (marketing_notifications !== undefined && typeof marketing_notifications !== 'boolean') {
      return NextResponse.json(
        { error: 'marketing_notifications must be a boolean' },
        { status: 400 }
      );
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {};
    if (email_notifications !== undefined) {
      updateData.email_notifications = email_notifications;
    }
    if (marketing_notifications !== undefined) {
      updateData.marketing_notifications = marketing_notifications;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'No notification preferences provided' },
        { status: 400 }
      );
    }

    // Ensure user exists, then update preferences
    await ensureUserRecord(supabase, { id: user.id, email: user.email || null })

    const { data, error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('auth_id', user.id)
      .select('email_notifications, marketing_notifications')
      .maybeSingle();

    if (updateError || !data) {
      const e: any = updateError;
      console.error('[User Notifications] Update error:', {
        message: e?.message,
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
      });
      return NextResponse.json(
        { error: 'Failed to update notification preferences' },
        { status: 500 }
      );
    }

    console.log(`[User Notifications] Updated preferences for user: ${user.id}`, updateData);

    return NextResponse.json({
      success: true,
      preferences: {
        email_notifications: data.email_notifications,
        marketing_notifications: data.marketing_notifications
      }
    });
  } catch (error) {
    console.error('[User Notifications] Error updating preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Ensure user exists, then fetch preferences
    await ensureUserRecord(supabase, { id: user.id, email: user.email || null })

    const { data, error: dbError } = await supabase
      .from('users')
      .select('email_notifications, marketing_notifications')
      .eq('auth_id', user.id)
      .maybeSingle();

    if (dbError || !data) {
      const e: any = dbError;
      console.error('[User Notifications] Database error:', {
        message: e?.message,
        code: e?.code,
        details: e?.details,
        hint: e?.hint,
      });
      return NextResponse.json(
        { error: 'Failed to get notification preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      preferences: {
        email_notifications: data.email_notifications ?? true,
        marketing_notifications: data.marketing_notifications ?? false
      }
    });
  } catch (error) {
    console.error('[User Notifications] Error getting preferences:', error);
    return NextResponse.json(
      { error: 'Failed to get notification preferences' },
      { status: 500 }
    );
  }
}

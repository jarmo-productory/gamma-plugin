import { createClient } from '@supabase/supabase-js';
import { log } from './_utils';

interface UserCreationResult {
  success: boolean;
  userId: string | null;
  error?: string;
  created?: boolean;
}

/**
 * Production-safe user creation utility
 * Ensures a user record exists for the given Clerk ID
 * Handles race conditions and graceful fallbacks
 */
export async function ensureUserExists(
  clerkId: string, 
  event: { headers: Record<string, unknown>; httpMethod: string }, 
  clerkSession?: Record<string, unknown>
): Promise<UserCreationResult> {
  try {
    const supabaseUrl = process.env.SUPABASE_URL as string;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
    
    if (!supabaseUrl || !supabaseKey) {
      return { success: false, userId: null, error: 'supabase_env_missing' };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // First, try to get existing user
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, name')
      .eq('clerk_id', clerkId)
      .single();

    if (existingUser?.id) {
      // User already exists - check if we need to update with real Clerk data
      const hasRealData = existingUser.email && !existingUser.email.endsWith('@unknown.clerk');
      const hasRealName = existingUser.name && existingUser.name !== 'Gamma User';
      
      // If we have real Clerk session data but user has fallback data, update them
      if (clerkSession?.email && (!hasRealData || !hasRealName)) {
        const updatedPayload = {
          email: clerkSession.email,
          name: clerkSession.first_name 
            ? `${clerkSession.first_name} ${clerkSession.last_name || ''}`.trim()
            : clerkSession.username || existingUser.name, // Keep existing name if no real name available
        };
        
        const { error: updateError } = await supabase
          .from('users')
          .update(updatedPayload)
          .eq('id', existingUser.id);
          
        if (updateError) {
          log(event, 'user_profile_update_failed', { 
            userId: existingUser.id, 
            clerkId, 
            error: updateError.message 
          });
        } else {
          log(event, 'user_profile_updated_with_real_data', { 
            userId: existingUser.id, 
            clerkId,
            oldEmail: existingUser.email,
            newEmail: clerkSession.email,
            oldName: existingUser.name,
            newName: updatedPayload.name
          });
        }
      }
      
      return { success: true, userId: existingUser.id, created: false };
    }

    // User doesn't exist - need to create
    // Extract user info from Clerk session or use defaults
    const userPayload = {
      clerk_id: clerkId,
      email: clerkSession?.email || `${clerkId}@unknown.clerk`,
      name: clerkSession?.first_name 
        ? `${clerkSession.first_name} ${clerkSession.last_name || ''}`.trim()
        : clerkSession?.username || 'Gamma User',
    };

    // Production-safe upsert with conflict resolution
    const { data: createdUser, error: createError } = await supabase
      .from('users')
      .upsert(userPayload, { 
        onConflict: 'clerk_id',
        ignoreDuplicates: false 
      })
      .select('id')
      .single();

    if (createError) {
      // Handle specific constraint violations gracefully
      if (createError.code === '23505') { // Unique constraint violation
        // Race condition - another request created the user
        // Try to fetch the user created by the other request
        const { data: raceUser } = await supabase
          .from('users')
          .select('id')
          .eq('clerk_id', clerkId)
          .single();
        
        if (raceUser?.id) {
          log(event, 'user_creation_race_condition_resolved', { clerkId, userId: raceUser.id });
          return { success: true, userId: raceUser.id, created: false };
        }
      }
      
      log(event, 'user_creation_failed', { clerkId, error: createError.message });
      return { success: false, userId: null, error: createError.message };
    }

    if (createdUser?.id) {
      log(event, 'user_created_successfully', { 
        clerkId, 
        userId: createdUser.id,
        email: userPayload.email,
        name: userPayload.name
      });
      return { success: true, userId: createdUser.id, created: true };
    }

    return { success: false, userId: null, error: 'user_creation_no_result' };

  } catch (error: any) {
    log(event, 'user_creation_error', { 
      clerkId, 
      error: error?.message,
      stack: error?.stack
    });
    return { 
      success: false, 
      userId: null, 
      error: (error instanceof Error) ? error.message : 'unknown_error' 
    };
  }
}

/**
 * Production-safe user lookup for presentation APIs
 * Attempts to find user by Clerk ID with production-safe fallback for missing users
 * Users should normally be created during device linking process
 */
export async function getUserIdFromClerk(
  clerkId: string,
  event: { headers: Record<string, unknown>; httpMethod: string }
): Promise<{ userId: string | null; error?: string; created?: boolean }> {
  const supabaseUrl = process.env.SUPABASE_URL as string;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // First, get the user's internal ID from their device userId (Clerk ID)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('clerk_id', clerkId)
    .single();

  if (userData?.id) {
    // User exists - return their ID
    return { userId: userData.id, created: false };
  }

  // User not found - this shouldn't happen in normal flow as users are created during device linking
  log(event, 'user_not_found_in_presentation_api', { 
    clerkId, 
    error: userError?.message,
    note: 'User should have been created during device linking'
  });

  // Production-safe fallback: attempt to create user with minimal info
  // This handles edge cases where device linking may have failed to create user
  const fallbackResult = await ensureUserExists(clerkId, event, {
    user_id: clerkId,
    // Minimal fallback data since we don't have full Clerk session in presentation APIs
    email: `${clerkId}@unknown.clerk`,
    first_name: 'User',
    last_name: '',
  });

  if (!fallbackResult.success) {
    // Final fallback for local development only
    if (process.env.NETLIFY_LOCAL === 'true') {
      log(event, 'using_local_dev_fallback_user_creation', { clerkId });
      
      const upsertPayload = {
        clerk_id: clerkId,
        email: `${clerkId}@example.local`,
        name: 'Local Dev User',
      };
      
      const { data: createdUser, error: createErr } = await supabase
        .from('users')
        .upsert(upsertPayload, { onConflict: 'clerk_id' })
        .select('id')
        .single();
        
      if (!createErr && createdUser?.id) {
        log(event, 'local_dev_user_created_as_fallback', { clerkId, userId: createdUser.id });
        return { userId: createdUser.id, created: true };
      }
    }
    
    return { 
      userId: null, 
      error: 'user_not_found_and_creation_failed',
    };
  }

  // User was successfully created via production-safe method
  log(event, 'user_created_via_fallback_in_presentation_api', { 
    clerkId, 
    userId: fallbackResult.userId,
    created: fallbackResult.created 
  });

  return { 
    userId: fallbackResult.userId, 
    created: fallbackResult.created || false 
  };
}


import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createClerkClient } from '@clerk/nextjs/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Initialize Clerk client
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!
});

export async function POST(request: NextRequest) {
  try {
    // Get Authorization header (the actual data sent)
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'No token provided'
      }, { status: 401 });
    }
    
    // Try to parse request body if it exists (but handle empty body)
    try {
      await request.json();
    } catch {
      // Empty body is fine for this endpoint
    }
    
    
    // Initialize Supabase client with service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse JWT token to get Clerk user data
    let clerkUserId = null;
    let clerkEmail = null;
    let clerkName = null;
    if (token) {
      try {
        // Decode JWT (in production, verify signature properly)
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
          // Development only: log JWT payload structure (production: remove sensitive data)
          if (process.env.NODE_ENV === 'development') {
            console.log('[Bootstrap] JWT payload keys:', Object.keys(payload));
          }
          
          clerkUserId = payload.sub || payload.userId;
          
          // Fetch user details from Clerk API using the user ID
          if (clerkUserId) {
            try {
              const clerkUser = await clerkClient.users.getUser(clerkUserId);
              clerkEmail = clerkUser.emailAddresses[0]?.emailAddress;
              clerkName = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || clerkUser.username;
              
              // Development only: log user fetch success
              if (process.env.NODE_ENV === 'development') {
                console.log('[Bootstrap] User fetched from Clerk successfully');
              }
            } catch (error) {
              console.error('[Bootstrap] Failed to fetch user from Clerk:', error);
              // Continue with null values
            }
          }
          
          // Development only: confirm data preparation
          if (process.env.NODE_ENV === 'development') {
            console.log('[Bootstrap] Clerk data prepared for database');
          }
        }
      } catch {
        // Development only: log parsing errors
        if (process.env.NODE_ENV === 'development') {
          console.log('[Bootstrap] Token parsing failed');
        }
      }
    }
    
    // Use Clerk ID or fallback to test UUID
    const _userId = clerkUserId || '123e4567-e89b-12d3-a456-426614174000';
    
    // Try to find user by clerk_id first
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('clerk_id', clerkUserId)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Database fetch error:', fetchError);
      return NextResponse.json({
        success: false,
        error: 'Database error'
      }, { status: 500 });
    }
    
    let user;
    
    if (!existingUser) {
      // Create new user if doesn't exist
      // Generate a proper UUID for the database ID
      const dbUserId = crypto.randomUUID();
      
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: dbUserId,
          email: clerkEmail || `user_${Date.now()}@example.com`,
          name: clerkName || clerkEmail || 'New User',
          clerk_id: clerkUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('Database insert error:', insertError);
        return NextResponse.json({
          success: false,
          error: 'Failed to create user'
        }, { status: 500 });
      }
      
      user = newUser;
    } else {
      // Update existing user with real Clerk data if we have it
      if (clerkEmail && existingUser.email.includes('@example.com')) {
        // Development only: log user email update
        if (process.env.NODE_ENV === 'development') {
          console.log('[Bootstrap] Updating user with verified email');
        }
        
        const { data: updatedUser, error: updateError } = await supabase
          .from('users')
          .update({
            email: clerkEmail,
            name: clerkName || clerkEmail || existingUser.name,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id)
          .select()
          .single();
          
        if (updateError) {
          console.error('Database update error:', updateError);
          user = existingUser; // Use existing user if update fails
        } else {
          user = updatedUser;
        }
      } else {
        user = existingUser;
      }
    }
    
    const responseUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      clerkId: user.clerk_id
    };
    
    return NextResponse.json({
      success: true,
      user: responseUser,
      message: 'Bootstrap successful from database',
      timestamp: new Date().toISOString()
    }, { status: 200 });
    
  } catch (error) {
    console.error('[Auth Bootstrap] Error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Bootstrap failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(_request: NextRequest) {
  // Handle GET requests for bootstrap endpoint
  return NextResponse.json({
    success: true,
    message: 'Auth bootstrap endpoint is active',
    timestamp: new Date().toISOString()
  }, { status: 200 });
}
import { NextResponse } from 'next/server';
import { getTokenStoreStatus, cleanupExpiredTokens } from '@/utils/tokenStore';

export async function GET() {
  try {
    const status = getTokenStoreStatus();
    const cleanedCount = cleanupExpiredTokens();
    
    return NextResponse.json({
      success: true,
      tokenStore: status,
      cleanupPerformed: cleanedCount > 0,
      cleanedTokens: cleanedCount,
      timestamp: new Date().toISOString(),
      storage: 'database' // Indicate we're using database storage now
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to get token store status',
      details: error.message
    }, { status: 500 });
  }
}
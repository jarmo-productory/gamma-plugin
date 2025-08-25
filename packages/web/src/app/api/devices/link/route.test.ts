import { NextRequest } from 'next/server';
import { POST } from './route';
import { createClient } from '@/utils/supabase/server';

// Mock Supabase
jest.mock('@/utils/supabase/server', () => ({
  createClient: jest.fn()
}));

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockGlobal = global as any;

describe('/api/devices/link', () => {
  let mockSupabase: any;

  beforeEach(() => {
    // Clear global storage
    mockGlobal.deviceRegistrations = new Map();
    
    // Mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      }
    };
    mockCreateClient.mockResolvedValue(mockSupabase);
    
    jest.clearAllMocks();
  });

  afterEach(() => {
    delete mockGlobal.deviceRegistrations;
  });

  it('should link device successfully for authenticated user', async () => {
    // Setup: Mock authenticated user
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { 
        user: { 
          id: 'user123', 
          email: 'test@example.com' 
        } 
      },
      error: null
    });

    // Setup: Create an unlinked device registration
    const deviceInfo = {
      deviceId: 'device_123_abc',
      code: 'TESTCODE123',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      linked: false
    };
    mockGlobal.deviceRegistrations = new Map();
    mockGlobal.deviceRegistrations.set(deviceInfo.code, deviceInfo);

    const request = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: deviceInfo.code }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      success: true,
      deviceId: deviceInfo.deviceId,
      message: 'Device linked successfully'
    });

    // Check that device was marked as linked
    const updatedDevice = mockGlobal.deviceRegistrations.get(deviceInfo.code);
    expect(updatedDevice.linked).toBe(true);
    expect(updatedDevice.userId).toBe('user123');
    expect(updatedDevice.userEmail).toBe('test@example.com');
  });

  it('should return 400 for missing code', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    const request = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toHaveProperty('error', 'Code is required');
  });

  it('should return 401 for unauthenticated request', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    const request = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: 'TESTCODE123' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('error', 'Authentication required');
  });

  it('should return 401 for authentication error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token expired' }
    });

    const request = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: 'TESTCODE123' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toHaveProperty('error', 'Authentication required');
  });

  it('should return 404 for invalid code', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    const request = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: 'INVALID_CODE' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error', 'Invalid or expired code');
  });

  it('should return 404 and cleanup for expired code', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    // Setup: Create an expired device registration
    const deviceInfo = {
      deviceId: 'device_123_abc',
      code: 'EXPIRED_CODE',
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
      linked: false
    };
    mockGlobal.deviceRegistrations = new Map();
    mockGlobal.deviceRegistrations.set(deviceInfo.code, deviceInfo);

    const request = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: deviceInfo.code }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toHaveProperty('error', 'Code expired');
    expect(mockGlobal.deviceRegistrations.has(deviceInfo.code)).toBe(false);
  });

  it('should handle already linked device', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    // Setup: Create an already linked device registration
    const deviceInfo = {
      deviceId: 'device_123_abc',
      code: 'TESTCODE123',
      expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      linked: true,
      userId: 'other_user'
    };
    mockGlobal.deviceRegistrations = new Map();
    mockGlobal.deviceRegistrations.set(deviceInfo.code, deviceInfo);

    const request = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: deviceInfo.code }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    // Should still succeed (overwrite previous link)
    expect(response.status).toBe(200);
    expect(data).toHaveProperty('success', true);
    
    // Check that device is now linked to the new user
    const updatedDevice = mockGlobal.deviceRegistrations.get(deviceInfo.code);
    expect(updatedDevice.userId).toBe('user123');
  });

  it('should handle JSON parsing errors', async () => {
    const request = {
      json: jest.fn().mockRejectedValue(new Error('Invalid JSON'))
    } as any;

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to link device');
  });

  it('should handle Supabase client creation errors', async () => {
    mockCreateClient.mockRejectedValue(new Error('Supabase connection failed'));

    const request = new NextRequest('http://localhost:3000/api/devices/link', {
      method: 'POST',
      body: JSON.stringify({ code: 'TESTCODE123' }),
      headers: { 'Content-Type': 'application/json' }
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data).toHaveProperty('error', 'Failed to link device');
  });
});
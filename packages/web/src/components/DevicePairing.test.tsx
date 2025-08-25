import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import DevicePairing from './DevicePairing';

// Mock Next.js navigation hooks
jest.mock('next/navigation', () => ({
  useSearchParams: jest.fn(),
  useRouter: jest.fn()
}));

// Mock Supabase client
jest.mock('@/utils/supabase/client', () => ({
  createClient: jest.fn()
}));

// Mock fetch
global.fetch = jest.fn();

const mockUseSearchParams = useSearchParams as jest.MockedFunction<typeof useSearchParams>;
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe('DevicePairing Component', () => {
  let mockRouter: any;
  let mockSupabase: any;
  let mockSearchParams: any;

  beforeEach(() => {
    mockRouter = {
      replace: jest.fn(),
      push: jest.fn()
    };
    mockUseRouter.mockReturnValue(mockRouter);

    mockSupabase = {
      auth: {
        getUser: jest.fn()
      }
    };
    mockCreateClient.mockReturnValue(mockSupabase);

    mockSearchParams = {
      get: jest.fn()
    };
    mockUseSearchParams.mockReturnValue(mockSearchParams);

    jest.clearAllMocks();
  });

  it('should render nothing when no pairing code or wrong source', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return null;
      if (key === 'source') return null;
      return null;
    });

    const { container } = render(<DevicePairing />);
    expect(container.firstChild).toBeNull();
  });

  it('should render nothing when source is not extension', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return 'TEST123';
      if (key === 'source') return 'website';
      return null;
    });

    const { container } = render(<DevicePairing />);
    expect(container.firstChild).toBeNull();
  });

  it('should display pairing UI when valid code and source provided', () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return 'TEST123';
      if (key === 'source') return 'extension';
      return null;
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    render(<DevicePairing />);
    
    expect(screen.getByText('🔗 Device Pairing')).toBeInTheDocument();
    expect(screen.getByText(/Pairing code:.*TEST123/)).toBeInTheDocument();
  });

  it('should automatically attempt pairing when code and user present', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return 'TEST123';
      if (key === 'source') return 'extension';
      return null;
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        deviceId: 'device123',
        message: 'Device linked successfully'
      })
    } as Response);

    render(<DevicePairing />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/devices/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: 'TEST123' })
      });
    });
  });

  it('should show success message after successful pairing', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return 'TEST123';
      if (key === 'source') return 'extension';
      return null;
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        deviceId: 'device123',
        message: 'Device linked successfully'
      })
    } as Response);

    render(<DevicePairing />);

    await waitFor(() => {
      expect(screen.getByText('✅ Device Pairing')).toBeInTheDocument();
      expect(screen.getByText(/Device linked successfully/)).toBeInTheDocument();
    });
  });

  it('should redirect to dashboard after successful pairing', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return 'TEST123';
      if (key === 'source') return 'extension';
      return null;
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        deviceId: 'device123',
        message: 'Device linked successfully'
      })
    } as Response);

    jest.useFakeTimers();
    render(<DevicePairing />);

    await waitFor(() => {
      expect(mockRouter.replace).toHaveBeenCalledWith('/');
    });

    // Fast forward time to trigger dashboard redirect
    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
    });

    jest.useRealTimers();
  });

  it('should show error message for unauthenticated user', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return 'TEST123';
      if (key === 'source') return 'extension';
      return null;
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      json: async () => ({
        error: 'Authentication required'
      })
    } as Response);

    render(<DevicePairing />);

    // Trigger manual retry
    const linkButton = screen.getByText('Link Device');
    fireEvent.click(linkButton);

    await waitFor(() => {
      expect(screen.getByText('Please sign in first to link your device.')).toBeInTheDocument();
    });
  });

  it('should handle 404 errors (invalid/expired code)', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return 'EXPIRED123';
      if (key === 'source') return 'extension';
      return null;
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: 'Invalid or expired code'
      })
    } as Response);

    render(<DevicePairing />);

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired pairing code. Please try again from your extension.')).toBeInTheDocument();
    });
  });

  it('should handle network errors gracefully', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return 'TEST123';
      if (key === 'source') return 'extension';
      return null;
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<DevicePairing />);

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });
  });

  it('should allow manual retry after failure', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return 'TEST123';
      if (key === 'source') return 'extension';
      return null;
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    // First call fails, second succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          deviceId: 'device123'
        })
      } as Response);

    render(<DevicePairing />);

    // Wait for initial failure
    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByText('Link Device');
    fireEvent.click(retryButton);

    // Should succeed on retry
    await waitFor(() => {
      expect(screen.getByText('✅ Device Pairing')).toBeInTheDocument();
    });
  });

  it('should show loading state during pairing', async () => {
    mockSearchParams.get.mockImplementation((key: string) => {
      if (key === 'code') return 'TEST123';
      if (key === 'source') return 'extension';
      return null;
    });

    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user123', email: 'test@example.com' } },
      error: null
    });

    // Mock a slow response
    mockFetch.mockImplementation(() => 
      new Promise(resolve => {
        setTimeout(() => resolve({
          ok: true,
          json: async () => ({ success: true, deviceId: 'device123' })
        } as Response), 100);
      })
    );

    render(<DevicePairing />);

    // Should show loading spinner
    expect(screen.getByText('Linking your device...')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner

    await waitFor(() => {
      expect(screen.getByText('✅ Device Pairing')).toBeInTheDocument();
    }, { timeout: 200 });
  });
});
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useSearchParams, useRouter } from 'next/navigation';
import DevicePairing from '../components/DevicePairing';

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useSearchParams: vi.fn(),
  useRouter: vi.fn(),
}));

// Mock Supabase client
vi.mock('@/utils/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
    },
  })),
}));

const mockPush = vi.fn();
const mockReplace = vi.fn();

describe('DevicePairing Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    (useRouter as any).mockReturnValue({
      push: mockPush,
      replace: mockReplace,
    });

    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should not render when no pairing code provided', () => {
    (useSearchParams as any).mockReturnValue(new URLSearchParams());

    const { container } = render(<DevicePairing />);
    expect(container.firstChild).toBeNull();
  });

  it('should not render when source is not extension', () => {
    (useSearchParams as any).mockReturnValue(
      new URLSearchParams('code=TEST123&source=web')
    );

    const { container } = render(<DevicePairing />);
    expect(container.firstChild).toBeNull();
  });

  it('should render pairing interface with valid code and source', () => {
    (useSearchParams as any).mockReturnValue(
      new URLSearchParams('code=TEST123&source=extension')
    );

    render(<DevicePairing />);

    expect(screen.getByText('🔗 Device Pairing')).toBeInTheDocument();
    expect(screen.getByText('TEST123')).toBeInTheDocument();
    expect(screen.getByText('Link Device')).toBeInTheDocument();
  });

  it('should show authentication required when user not logged in', async () => {
    (useSearchParams as any).mockReturnValue(
      new URLSearchParams('code=TEST123&source=extension')
    );

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };

    vi.mocked(require('@/utils/supabase/client').createClient).mockReturnValue(mockSupabase);

    render(<DevicePairing />);

    // Wait for useEffect to complete
    await waitFor(() => {
      expect(screen.getByText('Please sign in first to link your device')).toBeInTheDocument();
    });
  });

  it('should handle successful device linking', async () => {
    (useSearchParams as any).mockReturnValue(
      new URLSearchParams('code=TEST123&source=extension')
    );

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    };

    vi.mocked(require('@/utils/supabase/client').createClient).mockReturnValue(mockSupabase);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        deviceId: 'device-123',
        message: 'Device linked successfully',
      }),
    });

    render(<DevicePairing />);

    // Wait for automatic linking to complete
    await waitFor(() => {
      expect(screen.getByText('✅ Device Pairing')).toBeInTheDocument();
      expect(screen.getByText(/Device linked successfully/)).toBeInTheDocument();
    });

    // Verify redirect behavior
    expect(mockReplace).toHaveBeenCalledWith('/');
    
    // Wait for auto-redirect
    await new Promise(resolve => setTimeout(resolve, 3100));
    expect(mockPush).toHaveBeenCalledWith('/dashboard');
  });

  it('should handle API errors gracefully', async () => {
    (useSearchParams as any).mockReturnValue(
      new URLSearchParams('code=TEST123&source=extension')
    );

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    };

    vi.mocked(require('@/utils/supabase/client').createClient).mockReturnValue(mockSupabase);

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({
        error: 'Invalid or expired code',
      }),
    });

    render(<DevicePairing />);

    await waitFor(() => {
      expect(screen.getByText('Invalid or expired pairing code. Please try again from your extension.')).toBeInTheDocument();
    });
  });

  it('should allow manual retry on failure', async () => {
    (useSearchParams as any).mockReturnValue(
      new URLSearchParams('code=TEST123&source=extension')
    );

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: null,
        }),
      },
    };

    vi.mocked(require('@/utils/supabase/client').createClient).mockReturnValue(mockSupabase);

    render(<DevicePairing />);

    await waitFor(() => {
      expect(screen.getByText('Please sign in first to link your device')).toBeInTheDocument();
    });

    // Click manual retry
    const retryButton = screen.getByText('Link Device');
    fireEvent.click(retryButton);

    expect(screen.getByText('Linking your device...')).toBeInTheDocument();
  });

  it('should handle network errors', async () => {
    (useSearchParams as any).mockReturnValue(
      new URLSearchParams('code=TEST123&source=extension')
    );

    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
    };

    vi.mocked(require('@/utils/supabase/client').createClient).mockReturnValue(mockSupabase);

    (global.fetch as any).mockRejectedValueOnce(new Error('Network error'));

    render(<DevicePairing />);

    await waitFor(() => {
      expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    });
  });
});
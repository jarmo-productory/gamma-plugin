import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Navigation } from '../Navigation';

// Mock useAuth hook from Clerk
const mockUseAuth = vi.fn();
vi.mock('@clerk/nextjs', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock window.location
Object.defineProperty(window, 'location', {
  value: { href: '', reload: vi.fn() },
  writable: true,
});

describe('Navigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.removeItem.mockClear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders the logo and brand name', () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
    });

    render(<Navigation />);
    
    expect(screen.getByText('GT')).toBeInTheDocument();
    expect(screen.getByText('Gamma Timetable')).toBeInTheDocument();
  });

  it('shows sign in button when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
    });

    render(<Navigation />);
    
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    expect(signInButton).toBeInTheDocument();
    expect(signInButton).toHaveClass('bg-blue-600');
  });

  it('shows user menu when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: 'user123',
    });

    render(<Navigation />);
    
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    expect(signOutButton).toBeInTheDocument();
    expect(signOutButton).toHaveClass('bg-white');
  });

  it('handles sign in button click', () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
    });

    render(<Navigation />);
    
    const signInButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(signInButton);
    
    expect(window.location.href).toBe('/sign-in');
  });

  it('handles sign out button click', () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      userId: 'user123',
    });

    render(<Navigation />);
    
    const signOutButton = screen.getByRole('button', { name: /sign out/i });
    fireEvent.click(signOutButton);
    
    // Check that localStorage keys are cleared
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('clerk_session_token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('device_token');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user_id');
    expect(window.location.reload).toHaveBeenCalled();
  });

  it('handles useAuth hook errors gracefully', () => {
    mockUseAuth.mockImplementation(() => {
      throw new Error('useAuth error');
    });

    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    render(<Navigation />);
    
    // Should still render the component with fallback state
    expect(screen.getByText('GT')).toBeInTheDocument();
    expect(screen.getByText('Gamma Timetable')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalledWith('[Nav] Using fallback auth state (placeholder keys)');
    
    consoleSpy.mockRestore();
  });

  it('applies custom className prop', () => {
    mockUseAuth.mockReturnValue({
      isLoaded: true,
      isSignedIn: false,
      userId: null,
    });

    const { container } = render(<Navigation className="custom-nav-class" />);
    
    const nav = container.querySelector('nav');
    expect(nav).toHaveClass('custom-nav-class');
  });
});
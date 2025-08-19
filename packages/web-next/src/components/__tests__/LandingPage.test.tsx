import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LandingPage } from '../LandingPage';

describe('LandingPage', () => {
  it('renders the main heading', () => {
    const mockOnGetStarted = vi.fn();
    render(<LandingPage onGetStarted={mockOnGetStarted} />);
    
    expect(screen.getByText('Transform Presentations into Timetables')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    const mockOnGetStarted = vi.fn();
    render(<LandingPage onGetStarted={mockOnGetStarted} />);
    
    expect(screen.getByText('Automatically extract and organize your Gamma presentation content')).toBeInTheDocument();
  });

  it('renders the Get Started button', () => {
    const mockOnGetStarted = vi.fn();
    render(<LandingPage onGetStarted={mockOnGetStarted} />);
    
    const button = screen.getByRole('button', { name: 'Get Started' });
    expect(button).toBeInTheDocument();
  });

  it('calls onGetStarted when the button is clicked', () => {
    const mockOnGetStarted = vi.fn();
    render(<LandingPage onGetStarted={mockOnGetStarted} />);
    
    const button = screen.getByRole('button', { name: 'Get Started' });
    fireEvent.click(button);
    
    expect(mockOnGetStarted).toHaveBeenCalledTimes(1);
  });

  it('has proper styling classes', () => {
    const mockOnGetStarted = vi.fn();
    render(<LandingPage onGetStarted={mockOnGetStarted} />);
    
    const container = screen.getByText('Transform Presentations into Timetables').closest('div');
    expect(container).toHaveClass('text-center', 'max-w-[600px]', 'mx-auto');
  });
});
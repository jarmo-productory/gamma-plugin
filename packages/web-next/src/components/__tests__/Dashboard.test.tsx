import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Dashboard } from '../Dashboard';

describe('Dashboard', () => {
  it('renders the main heading', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Your Presentations')).toBeInTheDocument();
  });

  it('renders the description text', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Manage your Gamma presentations and timetables')).toBeInTheDocument();
  });

  it('renders the empty state heading', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('No presentations yet')).toBeInTheDocument();
  });

  it('renders the empty state description', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('Install the Chrome extension and visit a Gamma presentation to get started')).toBeInTheDocument();
  });

  it('renders the presentation icon', () => {
    render(<Dashboard />);
    
    expect(screen.getByText('📊')).toBeInTheDocument();
  });

  it('has proper styling structure', () => {
    render(<Dashboard />);
    
    const heading = screen.getByText('Your Presentations');
    expect(heading).toHaveClass('text-3xl', 'font-bold', 'text-gray-900', 'mb-2');
    
    const description = screen.getByText('Manage your Gamma presentations and timetables');
    expect(description).toHaveClass('text-base', 'text-gray-600', 'mb-8');
  });
});
/**
 * Extension Authentication Wrapper
 * 
 * Platform-specific wrapper for shared authentication module.
 * This file re-exports the shared auth with extension-specific configuration.
 */

// Re-export everything from shared auth module
export * from '@shared/auth';

// Extension-specific auth configuration could go here if needed
// For now, we just use the shared implementation directly
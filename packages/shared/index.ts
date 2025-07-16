/**
 * Shared components and types for the Gamma Timetable Extension
 * This package contains code that can be used by both the extension and web dashboard
 */

// Export types from subdirectories
export * from './types/index';
export * from './storage/index';
export * from './auth/index';
export * from './config/index';

// Version info
export const SHARED_VERSION = '0.0.5';

// Placeholder exports for future development
export const initializeShared = () => {
  console.log('Shared package initialized');
}; 
import { expect } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// TypeScript declaration for jest-dom matchers
declare module 'vitest' {
  interface Assertion<T> extends jest.Matchers<T> {}
  interface AsymmetricMatchersContaining extends jest.Matchers<any> {}
}
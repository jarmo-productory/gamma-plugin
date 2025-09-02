// Test secure token generation
const { generateSecureToken } = require('./src/utils/secureTokenStore.ts');

console.log('Testing secure token generation...');

try {
  const token = generateSecureToken();
  console.log('✅ Generated secure token:', token);
  console.log('✅ Token length:', token.length, 'chars');
  console.log('✅ Token format valid:', /^[A-Za-z0-9_-]+$/.test(token));
  console.log('✅ Entropy estimate:', token.length * Math.log2(64), 'bits');
  
  // Test multiple generations for uniqueness
  const tokens = new Set();
  for (let i = 0; i < 100; i++) {
    tokens.add(generateSecureToken());
  }
  console.log('✅ Generated 100 unique tokens:', tokens.size === 100);
  
} catch (error) {
  console.error('❌ Token generation failed:', error);
}
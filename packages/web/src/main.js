/**
 * Placeholder entry point for the Gamma Timetable Web Dashboard
 * This will be replaced with a proper Next.js application in Sprint 2
 */

console.log('Gamma Timetable Web Dashboard - Coming Soon');

// Simple placeholder functionality
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    const statusDiv = document.createElement('div');
    statusDiv.style.cssText = 'padding: 20px; background: #f0f0f0; margin: 20px; border-radius: 8px;';
    statusDiv.innerHTML = `
      <h2>Development Status</h2>
      <ul>
        <li>✅ Sprint 0: Foundation (In Progress)</li>
        <li>🔄 Sprint 1: Authentication & Dashboard Shell</li>
        <li>⏳ Sprint 2: Manual Sync & Data Management</li>
        <li>⏳ Sprint 3: Auto-Sync & Offline Support</li>
      </ul>
    `;
    app.appendChild(statusDiv);
  }
}); 
/**
 * Simplified Dashboard V2 - With Working Logout
 * 
 * Fixes the broken authentication UX with clear states and persistent logout button.
 */

// Helper to create elements
function h(tag, props = {}, children = []) {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([k, v]) => {
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v);
  });
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (typeof c === 'string') el.appendChild(document.createTextNode(c));
    else if (c) el.appendChild(c);
  });
  return el;
}

// Simple auth state manager (will be replaced with unified auth)
class SimpleAuthManager {
  constructor() {
    this.state = this.loadState();
  }
  
  loadState() {
    return {
      isAuthenticated: !!(localStorage.getItem('clerk_session_token') || 
                          localStorage.getItem('clerk_jwt_token') ||
                          localStorage.getItem('device_token')),
      deviceId: localStorage.getItem('device_id'),
      pairingCode: new URLSearchParams(window.location.search).get('code'),
      userEmail: localStorage.getItem('user_email') || 'test@example.com'
    };
  }
  
  isLoggedIn() {
    return this.state.isAuthenticated;
  }
  
  logout() {
    // Clear ALL auth-related storage
    const authKeys = [
      'clerk_session_token',
      'clerk_jwt_token', 
      'device_token',
      'device_id',
      'pairing_code',
      'user_email',
      'gamma_auth_state'
    ];
    
    authKeys.forEach(key => localStorage.removeItem(key));
    
    // Redirect to clean dashboard
    window.location.href = window.location.origin;
  }
  
  login() {
    // For now, just set a mock token
    localStorage.setItem('clerk_session_token', 'dev-session-token');
    localStorage.setItem('user_email', 'test@example.com');
    window.location.reload();
  }
}

// Render the dashboard
function renderDashboard(container) {
  const auth = new SimpleAuthManager();
  const isLoggedIn = auth.isLoggedIn();
  
  container.innerHTML = '';
  
  const dashboard = h('div', { 
    style: { 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    } 
  }, [
    h('div', { 
      style: { 
        background: 'white', 
        padding: '40px', 
        borderRadius: '20px', 
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        maxWidth: '500px',
        width: '100%'
      } 
    }, [
      // Header
      h('div', { style: { textAlign: 'center', marginBottom: '30px' } }, [
        h('div', { style: { fontSize: '48px', marginBottom: '10px' } }, '📊'),
        h('h1', { style: { fontSize: '28px', color: '#2d3748', margin: '0' } }, 'Gamma Timetable'),
        h('p', { style: { fontSize: '16px', color: '#718096', marginTop: '8px' } }, 
          'Transform your presentations into timetables')
      ]),
      
      // Auth Status
      h('div', { 
        style: { 
          background: isLoggedIn ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${isLoggedIn ? '#86efac' : '#fca5a5'}`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px'
        } 
      }, [
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
          h('span', { style: { fontSize: '20px' } }, isLoggedIn ? '✅' : '🔒'),
          h('div', {}, [
            h('div', { style: { fontWeight: '600', color: '#1f2937' } }, 
              isLoggedIn ? 'Authenticated' : 'Not Logged In'),
            isLoggedIn && h('div', { style: { fontSize: '14px', color: '#6b7280', marginTop: '4px' } }, 
              `Logged in as: ${auth.state.userEmail}`)
          ])
        ])
      ]),
      
      // Main Action Buttons
      h('div', { style: { marginBottom: '30px' } }, [
        isLoggedIn ? 
          // Logged in: Show logout button prominently
          h('div', { style: { display: 'grid', gap: '12px' } }, [
            h('button', { 
              onclick: () => auth.logout(),
              style: { 
                background: '#ef4444', 
                color: 'white', 
                border: 'none', 
                padding: '14px 24px', 
                borderRadius: '8px', 
                fontSize: '16px', 
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              } 
            }, '🚪 Logout'),
            
            h('button', { 
              onclick: () => {
                auth.logout();
                setTimeout(() => auth.login(), 100);
              },
              style: { 
                background: '#3b82f6', 
                color: 'white', 
                border: 'none', 
                padding: '14px 24px', 
                borderRadius: '8px', 
                fontSize: '16px', 
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s'
              } 
            }, '🔄 Switch User (Test)')
          ]) :
          // Not logged in: Show login button
          h('button', { 
            onclick: () => auth.login(),
            style: { 
              background: '#10b981', 
              color: 'white', 
              border: 'none', 
              padding: '14px 24px', 
              borderRadius: '8px', 
              fontSize: '16px', 
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s'
            } 
          }, '🔐 Login')
      ]),
      
      // Features
      h('div', { style: { borderTop: '1px solid #e5e7eb', paddingTop: '20px' } }, [
        h('h3', { style: { fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#4b5563' } }, 
          'Features'),
        h('div', { style: { display: 'grid', gap: '10px' } }, [
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
            h('span', { style: { color: '#10b981' } }, '✓'),
            h('span', { style: { fontSize: '14px', color: '#6b7280' } }, 
              'Chrome extension for Gamma.app')
          ]),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
            h('span', { style: { color: '#10b981' } }, '✓'),
            h('span', { style: { fontSize: '14px', color: '#6b7280' } }, 
              'Cross-device synchronization')
          ]),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
            h('span', { style: { color: '#10b981' } }, '✓'),
            h('span', { style: { fontSize: '14px', color: '#6b7280' } }, 
              'Export to Excel & PDF')
          ])
        ])
      ]),
      
      // Developer Tools
      h('div', { 
        style: { 
          borderTop: '1px solid #e5e7eb', 
          marginTop: '30px', 
          paddingTop: '20px' 
        } 
      }, [
        h('h3', { style: { fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#9ca3af' } }, 
          '🛠️ Developer Tools'),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
          h('button', { 
            onclick: () => {
              auth.logout();
              alert('All auth data cleared! Page will reload.');
              window.location.reload();
            },
            style: { 
              background: '#f3f4f6', 
              color: '#4b5563', 
              border: '1px solid #d1d5db', 
              padding: '6px 12px', 
              borderRadius: '6px', 
              fontSize: '12px',
              cursor: 'pointer'
            } 
          }, 'Clear All Storage'),
          
          h('button', { 
            onclick: () => {
              console.log('Current auth state:', {
                localStorage: Object.keys(localStorage).reduce((acc, key) => {
                  if (key.includes('clerk') || key.includes('device') || 
                      key.includes('token') || key.includes('gamma')) {
                    acc[key] = localStorage.getItem(key);
                  }
                  return acc;
                }, {})
              });
              alert('Check console for auth state');
            },
            style: { 
              background: '#f3f4f6', 
              color: '#4b5563', 
              border: '1px solid #d1d5db', 
              padding: '6px 12px', 
              borderRadius: '6px', 
              fontSize: '12px',
              cursor: 'pointer'
            } 
          }, 'Debug Auth State')
        ])
      ])
    ])
  ]);
  
  container.appendChild(dashboard);
}

// Initialize on page load
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    if (app) {
      renderDashboard(app);
    }
  });
}

// Export for use in main.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderDashboard };
}
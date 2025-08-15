/**
 * Production Dashboard - Clean, Professional, Real
 */

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

function extractClerkDomain(publishableKey) {
  if (!publishableKey) return null;
  try {
    if (publishableKey.startsWith('pk_test_')) {
      const encoded = publishableKey.replace('pk_test_', '');
      const decoded = window.atob(encoded);
      if (decoded.includes('.clerk.accounts.dev')) {
        const match = decoded.match(/([a-z0-9-]+)\.clerk\.accounts\.dev/);
        if (match) return `${match[1]}.accounts.dev`;
      }
    } else if (publishableKey.startsWith('pk_live_')) {
      const encoded = publishableKey.replace('pk_live_', '');
      const decoded = window.atob(encoded);
      const match = decoded.match(/([a-z0-9-]+)\.clerk\.accounts\.com/);
      if (match) return `${match[1]}.accounts.com`;
    }
  } catch (error) {
    console.warn('[Auth] Could not extract Clerk domain:', error);
  }
  return null;
}

function buildClerkSignInUrl(returnUrl) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkDomain = extractClerkDomain(publishableKey);
  
  if (clerkDomain) {
    return `https://${clerkDomain}/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`;
  }
  
  return null;
}

async function getCurrentUser() {
  // Check for authenticated user via stored tokens
  const clerkToken = localStorage.getItem('clerk_jwt_token');
  const sessionToken = localStorage.getItem('clerk_session_token');
  
  if (clerkToken || sessionToken) {
    // Try to get user info from API
    try {
      const response = await fetch('/api/user/me', {
        headers: {
          'Authorization': `Bearer ${clerkToken || sessionToken}`
        }
      });
      
      if (response.ok) {
        const user = await response.json();
        return user;
      }
    } catch (error) {
      console.error('[Auth] Failed to fetch user:', error);
    }
    
    // Fallback to stored data
    return {
      email: localStorage.getItem('user_email') || null,
      name: localStorage.getItem('user_name') || null
    };
  }
  
  return null;
}

async function logout() {
  // Clear all auth tokens
  const authKeys = [
    'clerk_session_token',
    'clerk_jwt_token',
    'device_token',
    'device_id',
    'pairing_code',
    'user_email',
    'user_name',
    'gamma_auth_state'
  ];
  
  authKeys.forEach(key => localStorage.removeItem(key));
  
  // Redirect to Clerk logout if available
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkDomain = extractClerkDomain(publishableKey);
  
  if (clerkDomain) {
    window.location.href = `https://${clerkDomain}/sign-out?redirect_url=${encodeURIComponent(window.location.origin)}`;
  } else {
    window.location.href = window.location.origin;
  }
}

async function renderProductionDashboard(container) {
  const user = await getCurrentUser();
  const isAuthenticated = !!user;
  const pairingCode = new URLSearchParams(window.location.search).get('code');
  
  container.innerHTML = '';
  
  // Handle pairing flow
  if (pairingCode && !isAuthenticated) {
    // Redirect to Clerk sign-in with pairing code preserved
    const signInUrl = buildClerkSignInUrl(window.location.href);
    if (signInUrl) {
      window.location.href = signInUrl;
      return;
    }
  }
  
  // Main dashboard
  const dashboard = h('div', { 
    style: { 
      minHeight: '100vh',
      background: '#f9fafb',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    } 
  }, [
    // Navigation bar
    h('nav', { 
      style: { 
        background: 'white',
        borderBottom: '1px solid #e5e7eb',
        padding: '16px 0'
      } 
    }, [
      h('div', { 
        style: { 
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        } 
      }, [
        // Logo and brand
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
          h('img', { 
            src: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjgiIGhlaWdodD0iMjQiIHg9IjQiIHk9IjQiIGZpbGw9IiMxMGI5ODEiLz4KPHJlY3Qgd2lkdGg9IjgiIGhlaWdodD0iMTYiIHg9IjEyIiB5PSI4IiBmaWxsPSIjZWY0NDQ0Ii8+Cjxyh2N0IHdpZHRoPSI4IiBoZWlnaHQ9IjIwIiB4PSIyMCIgeT0iNiIgZmlsbD0iIzNiODJmNiIvPgo8L3N2Zz4=',
            alt: 'Gamma Timetable',
            style: { width: '32px', height: '32px' }
          }),
          h('span', { 
            style: { 
              fontSize: '20px',
              fontWeight: '600',
              color: '#111827'
            } 
          }, 'Gamma Timetable')
        ]),
        
        // User menu
        isAuthenticated ? 
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '16px' } }, [
            h('span', { style: { fontSize: '14px', color: '#6b7280' } }, 
              user.email || user.name || 'User'),
            h('button', { 
              onclick: logout,
              style: { 
                background: 'white',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.15s'
              },
              onmouseover: (e) => {
                e.target.style.background = '#f3f4f6';
                e.target.style.borderColor = '#9ca3af';
              },
              onmouseout: (e) => {
                e.target.style.background = 'white';
                e.target.style.borderColor = '#d1d5db';
              }
            }, 'Sign Out')
          ]) :
          h('button', { 
            onclick: () => {
              const signInUrl = buildClerkSignInUrl(window.location.origin);
              if (signInUrl) {
                window.location.href = signInUrl;
              }
            },
            style: { 
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '8px 20px',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.15s'
            },
            onmouseover: (e) => e.target.style.background = '#2563eb',
            onmouseout: (e) => e.target.style.background = '#3b82f6'
          }, 'Sign In')
      ])
    ]),
    
    // Main content
    h('main', { 
      style: { 
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '48px 24px'
      } 
    }, [
      isAuthenticated ? 
        // Authenticated view - Dashboard
        h('div', {}, [
          h('h1', { 
            style: { 
              fontSize: '32px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '8px'
            } 
          }, 'Your Presentations'),
          
          h('p', { 
            style: { 
              fontSize: '16px',
              color: '#6b7280',
              marginBottom: '32px'
            } 
          }, 'Manage your Gamma presentations and timetables'),
          
          // Presentation grid (placeholder for now)
          h('div', { 
            style: { 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '24px',
              marginTop: '32px'
            } 
          }, [
            // Empty state
            h('div', { 
              style: { 
                gridColumn: '1 / -1',
                textAlign: 'center',
                padding: '64px 32px',
                background: 'white',
                borderRadius: '8px',
                border: '1px solid #e5e7eb'
              } 
            }, [
              h('svg', { 
                style: { 
                  width: '64px',
                  height: '64px',
                  margin: '0 auto 16px',
                  opacity: '0.4'
                },
                viewBox: '0 0 24 24',
                fill: 'none',
                stroke: 'currentColor',
                strokeWidth: '1.5'
              }, [
                h('path', { 
                  d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                })
              ]),
              h('h3', { 
                style: { 
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '8px'
                } 
              }, 'No presentations yet'),
              h('p', { 
                style: { 
                  fontSize: '14px',
                  color: '#6b7280',
                  maxWidth: '400px',
                  margin: '0 auto'
                } 
              }, 'Install the Chrome extension and visit a Gamma presentation to get started')
            ])
          ])
        ]) :
        // Not authenticated - Landing page
        h('div', { style: { textAlign: 'center', maxWidth: '600px', margin: '0 auto' } }, [
          h('h1', { 
            style: { 
              fontSize: '48px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '16px',
              lineHeight: '1.1'
            } 
          }, 'Transform Gamma Presentations into Timetables'),
          
          h('p', { 
            style: { 
              fontSize: '20px',
              color: '#6b7280',
              marginBottom: '32px',
              lineHeight: '1.5'
            } 
          }, 'Automatically extract and organize your presentation content with our Chrome extension'),
          
          h('button', { 
            onclick: () => {
              const signInUrl = buildClerkSignInUrl(window.location.origin);
              if (signInUrl) {
                window.location.href = signInUrl;
              }
            },
            style: { 
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              padding: '12px 32px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s',
              marginBottom: '48px'
            },
            onmouseover: (e) => e.target.style.background = '#2563eb',
            onmouseout: (e) => e.target.style.background = '#3b82f6'
          }, 'Get Started'),
          
          // Features
          h('div', { 
            style: { 
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '32px',
              marginTop: '64px'
            } 
          }, [
            h('div', {}, [
              h('div', { 
                style: { 
                  width: '48px',
                  height: '48px',
                  background: '#dbeafe',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                } 
              }, [
                h('span', { style: { fontSize: '24px' } }, '🎯')
              ]),
              h('h3', { 
                style: { 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '8px'
                } 
              }, 'Chrome Extension'),
              h('p', { 
                style: { 
                  fontSize: '14px',
                  color: '#6b7280'
                } 
              }, 'Works directly on gamma.app')
            ]),
            
            h('div', {}, [
              h('div', { 
                style: { 
                  width: '48px',
                  height: '48px',
                  background: '#dcfce7',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                } 
              }, [
                h('span', { style: { fontSize: '24px' } }, '☁️')
              ]),
              h('h3', { 
                style: { 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '8px'
                } 
              }, 'Cloud Sync'),
              h('p', { 
                style: { 
                  fontSize: '14px',
                  color: '#6b7280'
                } 
              }, 'Access from any device')
            ]),
            
            h('div', {}, [
              h('div', { 
                style: { 
                  width: '48px',
                  height: '48px',
                  background: '#fef3c7',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                } 
              }, [
                h('span', { style: { fontSize: '24px' } }, '📊')
              ]),
              h('h3', { 
                style: { 
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#111827',
                  marginBottom: '8px'
                } 
              }, 'Export Options'),
              h('p', { 
                style: { 
                  fontSize: '14px',
                  color: '#6b7280'
                } 
              }, 'Excel, PDF, and more')
            ])
          ])
        ])
    ])
  ]);
  
  container.appendChild(dashboard);
  
  // Handle pairing flow if authenticated with code
  if (pairingCode && isAuthenticated) {
    // Auto-link device
    try {
      const response = await fetch('/api/devices/link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('clerk_jwt_token') || localStorage.getItem('clerk_session_token')}`
        },
        body: JSON.stringify({ code: pairingCode })
      });
      
      if (response.ok) {
        // Success - clear code from URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('[Pairing] Failed to link device:', error);
    }
  }
}

// Export for use
window.renderProductionDashboard = renderProductionDashboard;
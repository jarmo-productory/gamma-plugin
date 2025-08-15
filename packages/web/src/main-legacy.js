/**
 * Production Gamma Timetable Dashboard
 * Clean, professional interface with Clerk JavaScript SDK authentication
 */

// Helper function to create DOM elements
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

// Global Clerk instance
let clerkInstance = null;

// Initialize Clerk SDK
async function initializeClerk() {
  if (clerkInstance) return clerkInstance;
  
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.warn('[Auth] No Clerk publishable key found');
    return null;
  }
  
  try {
    // Import Clerk SDK
    const { Clerk } = await import('https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js');
    
    clerkInstance = new Clerk(publishableKey);
    await clerkInstance.load();
    
    console.log('[Auth] Clerk SDK initialized successfully');
    return clerkInstance;
  } catch (error) {
    console.error('[Auth] Failed to initialize Clerk SDK:', error);
    return null;
  }
}

// Get current user with Clerk SDK integration
async function getCurrentUser() {
  const clerk = await initializeClerk();
  if (!clerk) return null;
  
  // Check if user is signed in with Clerk
  if (clerk.user) {
    const clerkUser = clerk.user;
    const sessionToken = await clerk.session?.getToken();
    
    // Store the session token for API calls
    if (sessionToken) {
      localStorage.setItem('clerk_session_token', sessionToken);
    }
  
  // Check stored tokens
  const clerkToken = localStorage.getItem('clerk_jwt_token');
  const sessionToken = localStorage.getItem('clerk_session_token');
  
  // If we have a JWT in URL, bootstrap user from database
  if (clerkJwtFromUrl) {
    localStorage.setItem('clerk_jwt_token', clerkJwtFromUrl);
    
    try {
      console.log('[Auth] Bootstrapping user from database...');
      const response = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clerkJwtFromUrl}`
        }
      });
      
      if (response.ok) {
        const { user } = await response.json();
        
        // Store real database user info
        localStorage.setItem('user_id', user.id);
        localStorage.setItem('user_email', user.email);
        localStorage.setItem('user_name', user.name || '');
        localStorage.setItem('user_clerk_id', user.clerkId);
        
        console.log('[Auth] User bootstrapped from database:', user);
        
        // Clean URL
        const cleanUrl = new URL(window.location);
        cleanUrl.searchParams.delete('__clerk_db_jwt');
        window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          clerkId: user.clerkId,
          source: 'database'
        };
      } else {
        const errorText = await response.text();
        console.error('[Auth] User bootstrap failed:', response.status, errorText);
      }
    } catch (error) {
      console.error('[Auth] User bootstrap error:', error);
    }
  }
  
  // Check if we have stored user data from previous bootstrap
  const storedUserId = localStorage.getItem('user_id');
  const storedEmail = localStorage.getItem('user_email');
  const storedName = localStorage.getItem('user_name');
  
  if (storedUserId && storedEmail && (clerkToken || sessionToken)) {
    return {
      id: storedUserId,
      email: storedEmail,
      name: storedName,
      clerkId: localStorage.getItem('user_clerk_id'),
      source: 'stored'
    };
  }
  
  return null;
}

async function logout() {
  const authKeys = [
    'clerk_session_token', 'clerk_jwt_token', 'device_token', 
    'device_id', 'pairing_code', 'user_email', 'user_name', 
    'user_id', 'user_clerk_id', 'gamma_auth_state'  // Added database user fields
  ];
  
  authKeys.forEach(key => localStorage.removeItem(key));
  
  // Just redirect to our dashboard - don't use Clerk sign-out
  window.location.href = window.location.origin;
}

async function renderProductionDashboard(container) {
  const user = await getCurrentUser();
  const isAuthenticated = !!user;
  const pairingCode = new URLSearchParams(window.location.search).get('code');
  
  container.innerHTML = '';
  
  // Handle pairing flow - redirect to Clerk if needed
  if (pairingCode && !isAuthenticated) {
    const signInUrl = buildClerkSignInUrl(window.location.href);
    if (signInUrl) {
      window.location.href = signInUrl;
      return;
    }
  }
  
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
          h('div', { 
            style: { 
              width: '32px', 
              height: '32px',
              background: 'linear-gradient(45deg, #3b82f6, #10b981)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '18px',
              fontWeight: '700'
            }
          }, 'GT'),
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
              cursor: 'pointer'
            }
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
        // Dashboard view
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
          
          // Empty state
          h('div', { 
            style: { 
              textAlign: 'center',
              padding: '64px 32px',
              background: 'white',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            } 
          }, [
            h('div', { 
              style: { 
                width: '64px',
                height: '64px',
                background: '#f3f4f6',
                borderRadius: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px'
              }
            }, '📊'),
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
        ]) :
        // Landing page
        h('div', { style: { textAlign: 'center', maxWidth: '600px', margin: '0 auto' } }, [
          h('h1', { 
            style: { 
              fontSize: '48px',
              fontWeight: '700',
              color: '#111827',
              marginBottom: '16px',
              lineHeight: '1.1'
            } 
          }, 'Transform Presentations into Timetables'),
          
          h('p', { 
            style: { 
              fontSize: '20px',
              color: '#6b7280',
              marginBottom: '32px',
              lineHeight: '1.5'
            } 
          }, 'Automatically extract and organize your Gamma presentation content'),
          
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
              cursor: 'pointer'
            }
          }, 'Get Started')
        ])
    ])
  ]);
  
  container.appendChild(dashboard);
  
  // Handle device pairing if authenticated
  if (pairingCode && isAuthenticated) {
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
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error) {
      console.error('[Pairing] Failed to link device:', error);
    }
  }
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (app) {
    renderProductionDashboard(app);
  }
});
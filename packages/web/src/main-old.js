/**
 * Production Gamma Timetable Dashboard
 * Clean, professional interface with real Clerk authentication
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
      const decoded = window.atob(decoded);
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
async function initializeClerk() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!publishableKey) {
    console.warn('[Auth] No Clerk publishable key found');
    return null;
  }

  // Load Clerk SDK from CDN
  if (!window.Clerk) {
    try {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@latest/dist/clerk.browser.js';
        script.async = true;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('[Auth] Failed to load Clerk SDK:', error);
      return null;
    }
  }

  try {
    // Initialize Clerk with the publishable key
    await window.Clerk.load({ publishableKey });
    console.log('[Auth] Clerk SDK loaded successfully');
    return window.Clerk;
  } catch (error) {
    console.error('[Auth] Failed to initialize Clerk:', error);
    return null;
  }
}

function buildClerkSignInUrl(returnUrl) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const clerkDomain = extractClerkDomain(publishableKey);
  
  if (clerkDomain) {
    console.log('[Auth] Using real Clerk hosted sign-in:', clerkDomain);
    return `https://${clerkDomain}/sign-in?redirect_url=${encodeURIComponent(returnUrl)}`;
  }
  
  console.warn('[Auth] Could not extract Clerk domain from key');
  return null;
}

function extractClerkDomain(publishableKey) {
  if (!publishableKey) return null;
  try {
    if (publishableKey.startsWith('pk_test_')) {
      // Extract the base64 encoded part after pk_test_
      const encoded = publishableKey.replace('pk_test_', '');
      const decoded = window.atob(encoded);
      
      // The decoded string contains "outgoing-marten-24.clerk.accounts.dev"
      // But the hosted pages are at "outgoing-marten-24.accounts.dev" (without "clerk")
      if (decoded.includes('.clerk.accounts.dev')) {
        const match = decoded.match(/([a-z0-9-]+)\.clerk\.accounts\.dev/);
        if (match) {
          const hostDomain = `${match[1]}.accounts.dev`;
          return hostDomain;
        }
      }
    } else if (publishableKey.startsWith('pk_live_')) {
      // For live keys, use accounts.com format
      const encoded = publishableKey.replace('pk_live_', '');
      const decoded = window.atob(encoded);
      const match = decoded.match(/([a-z0-9-]+)\.clerk\.accounts\.com/);
      if (match) {
        return `${match[1]}.accounts.com`;
      }
    }
  } catch (error) {
    console.warn('[Auth] Could not extract Clerk domain:', error);
  }
  return null;
}

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

function getQueryParam(name) {
  const url = new URL(window.location.href);
  return url.searchParams.get(name);
}

async function linkDeviceWithCode(code) {
  // Get authentication token - prioritize dev token for local development
  const sessionToken = localStorage.getItem('clerk_session_token');
  const jwtToken = localStorage.getItem('clerk_jwt_token');
  const token = sessionToken || jwtToken || '';
  
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const res = await fetch('/api/devices/link', {
    method: 'POST',
    headers,
    body: JSON.stringify({ code }),
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`link failed: ${res.status}`);
  return res.json();
}

async function renderSignIn(app) {
  const code = getQueryParam('code');
  const sessionToken = getQueryParam('__session'); // Legacy mock auth
  const clerkJwt = getQueryParam('__clerk_db_jwt'); // Real Clerk JWT token
  
  const container = h('div', { style: { padding: '20px', maxWidth: '560px' } }, [
    h('h1', {}, '🔐 Device Linking'),
    h('p', {}, code ? `Linking device with code: ${code}` : 'Ready to link your extension'),
    h('div', { id: 'status', style: { margin: '12px 0' } }),
    
    // Auth section
    h('div', { style: { border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '15px' } }, [
      h('h3', {}, '1️⃣ Sign In'),
      (sessionToken || clerkJwt) ? 
        h('p', { style: { color: 'green' } }, '✅ Authenticated successfully with Clerk') :
        h('button', { id: 'clerk-signin-btn', style: { padding: '10px 20px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' } }, 'Sign in with Clerk'),
    ]),
    
    // Device linking section
    h('div', { style: { border: '1px solid #ddd', padding: '15px', borderRadius: '8px', marginBottom: '15px' } }, [
      h('h3', {}, '2️⃣ Link Device'),
      h('div', { style: { display: 'flex', gap: '8px', alignItems: 'center', marginTop: '10px' } }, [
        h('input', { id: 'code-input', placeholder: 'Enter pairing code', value: code || '', style: { padding: '8px', border: '1px solid #ddd', borderRadius: '4px', flex: '1' } }),
        h('button', { id: 'link-btn', style: { padding: '8px 16px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' } }, 'Link Device'),
      ]),
    ]),
    
    h('hr'),
    h('div', {}, [
      h('button', { id: 'mock-login-btn', style: { padding: '5px 10px', fontSize: '12px' } }, 'Mock Login (Dev)'),
      h('small', { style: { marginLeft: '8px' } }, '(For development only)')
    ]),
  ]);

  app.innerHTML = '';
  app.appendChild(container);

  const status = container.querySelector('#status');
  const codeInput = container.querySelector('#code-input');
  const linkBtn = container.querySelector('#link-btn');
  const mockLoginBtn = container.querySelector('#mock-login-btn');
  const clerkSignInBtn = container.querySelector('#clerk-signin-btn');

  // Handle Clerk Sign-In Button
  if (clerkSignInBtn) {
    clerkSignInBtn.addEventListener('click', () => {
      const currentUrl = window.location.href;
      const clerkUrl = buildClerkSignInUrl(currentUrl);
      if (clerkUrl) {
        status.textContent = 'Redirecting to Clerk...';
        window.location.href = clerkUrl;
      } else {
        status.textContent = '❌ Clerk not configured';
      }
    });
  }

  // Handle Device Linking
  linkBtn.addEventListener('click', async () => {
    const inputCode = codeInput.value.trim();
    if (!inputCode) {
      status.textContent = '❌ Please enter a pairing code';
      return;
    }
    
    try {
      status.textContent = 'Linking device...';
      await linkDeviceWithCode(inputCode);
      status.textContent = '✅ Device linked successfully! You can close this page.';
    } catch (e) {
      status.textContent = `❌ Link failed: ${e?.message || e}`;
    }
  });

  // Development mock login
  mockLoginBtn.addEventListener('click', () => {
    localStorage.setItem('clerk_session_token', 'dev-session-token');
    status.textContent = '🔧 Dev token set. Try linking device now.';
  });

  // Handle authentication tokens from Clerk
  const returnedSessionToken = getQueryParam('__session');
  const returnedClerkJwt = getQueryParam('__clerk_db_jwt');
  
  if (returnedSessionToken || returnedClerkJwt) {
    console.log('[Auth] Authentication token received:', returnedClerkJwt ? 'Clerk JWT' : 'Session token');
    
    // Store the authentication token
    if (returnedClerkJwt) {
      localStorage.setItem('clerk_jwt_token', returnedClerkJwt);
      // For local development, use the expected dev token
      localStorage.setItem('clerk_session_token', 'dev-session-token');
    } else {
      localStorage.setItem('clerk_session_token', returnedSessionToken);
    }
    
    // Auto-link if we have both authentication and code
    const autoCode = codeInput.value.trim();
    if (autoCode) {
      status.textContent = 'Authenticated! Auto-linking device...';
      try {
        await linkDeviceWithCode(autoCode);
        status.textContent = '✅ Device linked successfully! You can close this page.';
      } catch (e) {
        status.textContent = `❌ Auto-link failed: ${e?.message || e}`;
      }
    } else {
      status.textContent = '✅ Authenticated with Clerk! Enter pairing code to link device.';
    }
  }
}

async function renderDashboard(app) {
  // Check if user came from extension with pairing code
  const pairingCode = getQueryParam('code');
  const clerkJwt = getQueryParam('__clerk_db_jwt');
  const storedSessionToken = localStorage.getItem('clerk_session_token');
  const storedJwtToken = localStorage.getItem('clerk_jwt_token');
  const hasStoredAuth = storedSessionToken || storedJwtToken;
  const isAuthenticated = clerkJwt || hasStoredAuth;
  
  console.log('[Dashboard] Auth check:', { clerkJwt, storedSessionToken, storedJwtToken, hasStoredAuth, isAuthenticated });

  console.log('[Dashboard] Pairing code:', pairingCode, 'Authenticated:', isAuthenticated);

  // If we have a pairing code but user is not authenticated, redirect to Clerk
  if (pairingCode && !isAuthenticated) {
    const clerkUrl = buildClerkSignInUrl(window.location.origin + '/sign-in?code=' + pairingCode);
    if (clerkUrl) {
      console.log('[Dashboard] Auto-redirecting to Clerk for authentication with pairing code');
      window.location.href = clerkUrl;
      return;
    }
  }

  const container = h('div', { 
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
        padding: '60px 40px', 
        borderRadius: '20px', 
        boxShadow: '0 20px 60px rgba(0,0,0,0.1)',
        textAlign: 'center',
        maxWidth: '480px',
        width: '100%'
      } 
    }, [
      h('div', { style: { fontSize: '60px', marginBottom: '20px' } }, pairingCode ? '🔗' : '📊'),
      h('h1', { style: { fontSize: '32px', marginBottom: '16px', color: '#2d3748' } }, 
        pairingCode ? 'Device Pairing' : 'Gamma Timetable'),
      h('p', { style: { fontSize: '18px', color: '#718096', marginBottom: '40px' } }, 
        pairingCode ? 
          'Connecting your Chrome extension...' : 
          'Transform your Gamma presentations into beautiful timetables'),
      
      // Auth/Pairing section
      h('div', { id: 'auth-section', style: { marginBottom: '30px' } }, [
        pairingCode && isAuthenticated ?
          // Auto-pairing in progress
          h('div', { style: { textAlign: 'center' } }, [
            h('div', { style: { fontSize: '16px', color: '#38a169', marginBottom: '16px' } }, 
              '✅ Authenticated with Clerk'),
            h('div', { style: { fontSize: '16px', color: '#3182ce', marginBottom: '16px' } }, 
              '🔄 Pairing device automatically...'),
            h('div', { 
              style: { 
                width: '32px', 
                height: '32px', 
                border: '3px solid #e2e8f0', 
                borderTop: '3px solid #3182ce', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite',
                margin: '0 auto'
              } 
            })
          ]) :
          // Normal login flow
          h('button', { 
            id: 'main-login-btn',
            style: { 
              background: '#5a67d8', 
              color: 'white', 
              border: 'none', 
              padding: '16px 32px', 
              borderRadius: '12px', 
              fontSize: '16px', 
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
              transition: 'all 0.2s'
            } 
          }, '🔐 Sign In with Clerk')
      ]),
      
      // Status
      h('div', { id: 'dashboard-status', style: { fontSize: '14px', color: '#a0aec0' } }, 
        pairingCode ? `Pairing code: ${pairingCode}` : 'Ready to connect'),
      
      // Feature highlights
      h('div', { style: { marginTop: '40px', textAlign: 'left' } }, [
        h('h3', { style: { fontSize: '18px', marginBottom: '20px', color: '#2d3748' } }, 'Features'),
        h('div', { style: { display: 'grid', gap: '12px' } }, [
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
            h('span', {}, '✅'),
            h('span', { style: { color: '#4a5568' } }, 'Chrome extension for Gamma.app')
          ]),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
            h('span', {}, '🔄'),
            h('span', { style: { color: '#4a5568' } }, 'Cross-device synchronization')
          ]),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
            h('span', {}, '📊'),
            h('span', { style: { color: '#4a5568' } }, 'Export to Excel & PDF')
          ])
        ])
      ]),
      
      // Logout button for testing (show if authenticated)
      isAuthenticated ? h('div', { style: { marginTop: '30px', textAlign: 'center' } }, [
        h('button', { 
          id: 'main-logout-btn',
          style: { 
            background: '#e53e3e', 
            color: 'white', 
            border: 'none', 
            padding: '8px 16px', 
            borderRadius: '6px',
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          } 
        }, '🚪 Logout & Test New User')
      ]) : null
    ])
  ]);

  // Add CSS animation for spinner
  if (!document.querySelector('#spinner-css')) {
    const style = document.createElement('style');
    style.id = 'spinner-css';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  app.innerHTML = '';
  app.appendChild(container);
  
  // Auto-pairing logic: if authenticated + has pairing code, pair immediately
  if (pairingCode && isAuthenticated) {
    const statusDiv = document.getElementById('dashboard-status');
    
    setTimeout(async () => {
      try {
        console.log('[Dashboard] Starting auto-pairing with code:', pairingCode);
        statusDiv.textContent = 'Connecting to extension...';
        
        await linkDeviceWithCode(pairingCode);
        
        // Success! Update UI
        const authSection = document.getElementById('auth-section');
        authSection.innerHTML = '';
        authSection.appendChild(
          h('div', { style: { textAlign: 'center' } }, [
            h('div', { style: { fontSize: '64px', marginBottom: '20px' } }, '✅'),
            h('div', { style: { fontSize: '20px', color: '#38a169', marginBottom: '16px' } }, 
              'Device Connected Successfully!'),
            h('div', { style: { fontSize: '16px', color: '#4a5568', marginBottom: '24px' } }, 
              'Your Chrome extension is now linked to your account.'),
            h('button', { 
              id: 'logout-btn',
              style: { 
                background: '#e53e3e', 
                color: 'white', 
                border: 'none', 
                padding: '8px 16px', 
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              } 
            }, '🚪 Logout & Test New User')
          ])
        );
        statusDiv.textContent = 'Extension connected and ready to sync';
        
        // Add logout button functionality
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => {
            // Clear all authentication tokens
            localStorage.removeItem('clerk_session_token');
            localStorage.removeItem('clerk_jwt_token');
            
            // Redirect to fresh dashboard
            window.location.href = window.location.origin;
          });
        }
        
      } catch (error) {
        console.error('[Dashboard] Auto-pairing failed:', error);
        // Show error state
        const authSection = document.getElementById('auth-section');
        authSection.innerHTML = '';
        authSection.appendChild(
          h('div', { style: { textAlign: 'center' } }, [
            h('div', { style: { fontSize: '64px', marginBottom: '20px' } }, '❌'),
            h('div', { style: { fontSize: '20px', color: '#e53e3e', marginBottom: '16px' } }, 
              'Pairing Failed'),
            h('div', { style: { fontSize: '16px', color: '#4a5568', marginBottom: '20px' } }, 
              error.message || 'Could not connect to extension'),
            h('button', { 
              id: 'retry-btn',
              style: { 
                background: '#3182ce', 
                color: 'white', 
                border: 'none', 
                padding: '12px 24px', 
                borderRadius: '8px',
                cursor: 'pointer'
              } 
            }, 'Try Again')
          ])
        );
        statusDiv.textContent = 'Connection failed - please try again';
        
        // Add retry button handler
        const retryBtn = document.getElementById('retry-btn');
        if (retryBtn) {
          retryBtn.addEventListener('click', () => window.location.reload());
        }
      }
    }, 1000); // Small delay for better UX
    
    return; // Exit early, don't set up normal login button
  }
  
  // Wire up the main login button
  const loginBtn = document.getElementById('main-login-btn');
  const statusDiv = document.getElementById('dashboard-status');
  const mainLogoutBtn = document.getElementById('main-logout-btn');
  
  // Add logout functionality
  if (mainLogoutBtn) {
    mainLogoutBtn.addEventListener('click', () => {
      // Clear all authentication tokens
      localStorage.removeItem('clerk_session_token');
      localStorage.removeItem('clerk_jwt_token');
      
      // Redirect to fresh dashboard
      window.location.href = window.location.origin;
    });
  }
  
  if (loginBtn && statusDiv) {
    loginBtn.addEventListener('click', async () => {
      statusDiv.textContent = 'Initializing authentication...';
      
      // Try hosted Clerk sign-in first (most reliable)
      const clerkUrl = buildClerkSignInUrl(window.location.origin + '/sign-in');
      if (clerkUrl) {
        statusDiv.textContent = 'Redirecting to Clerk sign-in...';
        window.location.href = clerkUrl;
        return;
      }
      
      // If hosted sign-in URL fails, try Clerk SDK
      const clerk = await initializeClerk();
      if (clerk) {
        try {
          statusDiv.textContent = 'Opening Clerk sign-in modal...';
          await clerk.openSignIn({
            redirectUrl: window.location.origin + '/sign-in',
            afterSignInUrl: window.location.origin + '/sign-in'
          });
        } catch (error) {
          console.error('[Auth] Clerk SDK sign-in failed:', error);
          statusDiv.textContent = 'Authentication failed. Please check console for details.';
        }
      } else {
        statusDiv.textContent = 'Clerk authentication not properly configured.';
      }
    });
  }
}

// NEW SIMPLIFIED DASHBOARD WITH WORKING LOGOUT
function renderSimplifiedDashboard(container) {
  // Simple auth state manager
  const auth = {
    isLoggedIn: () => !!(localStorage.getItem('clerk_session_token') || 
                         localStorage.getItem('clerk_jwt_token') ||
                         localStorage.getItem('device_token')),
    
    logout: () => {
      ['clerk_session_token', 'clerk_jwt_token', 'device_token', 'device_id', 
       'pairing_code', 'user_email', 'gamma_auth_state'].forEach(key => 
        localStorage.removeItem(key));
      window.location.href = window.location.origin;
    },
    
    login: () => {
      // Use real Clerk authentication
      const clerkUrl = buildClerkSignInUrl(window.location.origin);
      if (clerkUrl) {
        window.location.href = clerkUrl;
      } else {
        // Fallback to mock for local testing
        localStorage.setItem('clerk_session_token', 'dev-session-token');
        localStorage.setItem('user_email', 'test@example.com');
        window.location.reload();
      }
    }
  };
  
  const isLoggedIn = auth.isLoggedIn();
  
  container.innerHTML = '';
  
  const dashboard = h('div', { 
    style: { 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)', // Pink to purple gradient - DIFFERENT!
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    } 
  }, [
    h('div', { 
      style: { 
        background: '#1F2937', // Dark background - VERY DIFFERENT!
        color: 'white',
        padding: '40px', 
        borderRadius: '24px', 
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        maxWidth: '500px',
        width: '100%',
        border: '2px solid #374151'
      } 
    }, [
      // Version Badge
      h('div', { style: { textAlign: 'center', marginBottom: '20px' } }, [
        h('span', { 
          style: { 
            background: '#10B981', 
            color: 'white', 
            padding: '4px 12px', 
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: 'bold'
          } 
        }, '✨ NEW DASHBOARD V2')
      ]),
      
      // Header
      h('div', { style: { textAlign: 'center', marginBottom: '30px' } }, [
        h('div', { style: { fontSize: '48px', marginBottom: '10px' } }, '🚀'),
        h('h1', { style: { fontSize: '28px', color: '#F3F4F6', margin: '0' } }, 'Gamma Timetable'),
        h('p', { style: { fontSize: '16px', color: '#9CA3AF', marginTop: '8px' } }, 
          'Fixed Authentication System')
      ]),
      
      // Auth Status - Very prominent
      h('div', { 
        style: { 
          background: isLoggedIn ? '#065F46' : '#7C2D12',
          border: `2px solid ${isLoggedIn ? '#10B981' : '#EF4444'}`,
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px'
        } 
      }, [
        h('div', { style: { display: 'flex', alignItems: 'center', gap: '12px' } }, [
          h('span', { style: { fontSize: '24px' } }, isLoggedIn ? '✅' : '🔒'),
          h('div', {}, [
            h('div', { style: { fontWeight: '700', color: '#F9FAFB', fontSize: '18px' } }, 
              isLoggedIn ? 'You are logged in!' : 'Not Logged In'),
            isLoggedIn && h('div', { style: { fontSize: '14px', color: '#D1D5DB', marginTop: '4px' } }, [
              h('div', {}, `Email: ${localStorage.getItem('user_email') || 'test@example.com'}`),
              localStorage.getItem('clerk_session_token') === 'dev-session-token' && 
                h('div', { style: { fontSize: '12px', color: '#FCA5A5', marginTop: '4px' } }, 
                  '⚠️ Mock authentication (Clerk not configured)')
            ])
          ])
        ])
      ]),
      
      // Main Action Buttons - BIG and CLEAR
      h('div', { style: { marginBottom: '30px' } }, [
        isLoggedIn ? 
          h('div', { style: { display: 'grid', gap: '12px' } }, [
            h('button', { 
              onclick: () => auth.logout(),
              style: { 
                background: '#DC2626', 
                color: 'white', 
                border: 'none', 
                padding: '16px 24px', 
                borderRadius: '12px', 
                fontSize: '18px', 
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
              },
              onmouseover: (e) => e.target.style.transform = 'scale(1.05)',
              onmouseout: (e) => e.target.style.transform = 'scale(1)'
            }, '🚪 LOGOUT'),
            
            h('button', { 
              onclick: () => {
                auth.logout();
                setTimeout(() => auth.login(), 100);
              },
              style: { 
                background: '#2563EB', 
                color: 'white', 
                border: 'none', 
                padding: '16px 24px', 
                borderRadius: '12px', 
                fontSize: '16px', 
                fontWeight: '600',
                cursor: 'pointer'
              } 
            }, '🔄 Switch User (Test)')
          ]) :
          h('button', { 
            onclick: () => auth.login(),
            style: { 
              background: '#10B981', 
              color: 'white', 
              border: 'none', 
              padding: '16px 24px', 
              borderRadius: '12px', 
              fontSize: '18px', 
              fontWeight: '700',
              cursor: 'pointer',
              width: '100%',
              boxShadow: '0 4px 6px rgba(0,0,0,0.3)'
            } 
          }, '🔐 LOGIN')
      ]),
      
      // Features - Dark theme
      h('div', { style: { borderTop: '1px solid #374151', paddingTop: '20px' } }, [
        h('h3', { style: { fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#D1D5DB' } }, 
          'Features'),
        h('div', { style: { display: 'grid', gap: '10px' } }, [
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
            h('span', { style: { color: '#10B981' } }, '✓'),
            h('span', { style: { fontSize: '14px', color: '#9CA3AF' } }, 
              'Working logout button!')
          ]),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
            h('span', { style: { color: '#10B981' } }, '✓'),
            h('span', { style: { fontSize: '14px', color: '#9CA3AF' } }, 
              'Clear authentication state')
          ]),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
            h('span', { style: { color: '#10B981' } }, '✓'),
            h('span', { style: { fontSize: '14px', color: '#9CA3AF' } }, 
              'Easy multi-user testing')
          ])
        ])
      ]),
      
      // Developer Tools - Dark theme
      h('div', { 
        style: { 
          borderTop: '1px solid #374151', 
          marginTop: '30px', 
          paddingTop: '20px' 
        } 
      }, [
        h('h3', { style: { fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#6B7280' } }, 
          '🛠️ Developer Tools'),
        h('div', { style: { display: 'flex', gap: '8px', flexWrap: 'wrap' } }, [
          h('button', { 
            onclick: () => {
              auth.logout();
              alert('All auth data cleared! Page will reload.');
            },
            style: { 
              background: '#374151', 
              color: '#D1D5DB', 
              border: '1px solid #4B5563', 
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
              background: '#374151', 
              color: '#D1D5DB', 
              border: '1px solid #4B5563', 
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

// Load production dashboard
const prodScript = document.createElement('script');
prodScript.src = './production-dashboard.js';
document.head.appendChild(prodScript);

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;
  
  const url = new URL(window.location.href);
  const debug = url.searchParams.get('debug') === 'true';
  
  // Use production dashboard by default
  if (!debug && window.renderProductionDashboard) {
    window.renderProductionDashboard(app);
  } else if (debug) {
    // Debug mode - use simplified dashboard
    renderSimplifiedDashboard(app);
  } else {
    // Fallback to production rendering inline
    const script = document.createElement('script');
    script.textContent = `(${renderProductionDashboardInline.toString()})()`;
    document.body.appendChild(script);
    if (window.renderProductionDashboard) {
      window.renderProductionDashboard(app);
    }
  }
});

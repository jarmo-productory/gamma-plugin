/**
 * Sign-in page with hosted Clerk redirect flow.
 * No UI embedding - uses Clerk's hosted pages for maximum reliability.
 */
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
      ])
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
            h('div', { style: { fontSize: '16px', color: '#4a5568' } }, 
              'Your Chrome extension is now linked to your account.')
          ])
        );
        statusDiv.textContent = 'Extension connected and ready to sync';
        
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

document.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) return;
  
  const url = new URL(window.location.href);
  const isSignInPath = location.pathname === '/sign-in' || location.pathname.endsWith('/sign-in');
  const hasPairCode = !!url.searchParams.get('code');
  const hasClerkJwt = !!url.searchParams.get('__clerk_db_jwt');
  const hasLegacySession = !!url.searchParams.get('__session');
  
  // Use unified dashboard for most flows
  if (isSignInPath && (hasPairCode || hasClerkJwt || hasLegacySession)) {
    // Coming from Clerk auth with pairing code - use dashboard for seamless flow
    renderDashboard(app);
  } else if (isSignInPath && !hasPairCode) {
    // Manual sign-in page (fallback)
    renderSignIn(app);
  } else {
    // Main dashboard - handles all pairing code scenarios automatically
    renderDashboard(app);
  }
});

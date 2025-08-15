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
let clerkInitializationPromise = null;

// Initialize Clerk SDK
async function initializeClerk() {
  // Return existing instance if already initialized
  if (clerkInstance && clerkInstance.loaded) {
    return clerkInstance;
  }
  
  // Return existing initialization promise if already in progress
  if (clerkInitializationPromise) {
    return clerkInitializationPromise;
  }
  
  // Start new initialization
  clerkInitializationPromise = (async () => {
    // Get Clerk publishable key from Vite's define configuration
    const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
    
    if (!publishableKey || publishableKey === 'undefined') {
      console.warn('[Auth] No Clerk publishable key found');
      return null;
    }
    
    try {
      console.log('[Auth] Initializing Clerk SDK...');
      
      // Import Clerk SDK - try from installed package first, then CDN fallback
      let Clerk;
      try {
        const clerkModule = await import('@clerk/clerk-js');
        Clerk = clerkModule.Clerk;
        console.log('[Auth] Using Clerk SDK from npm package');
      } catch (importError) {
        console.log('[Auth] Failed to import from package, trying CDN fallback');
        
        // Load Clerk from CDN if package import fails
        if (!window.Clerk) {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/@clerk/clerk-js@5/dist/clerk.browser.js';
          script.onload = () => console.log('[Auth] Clerk SDK loaded from CDN');
          document.head.appendChild(script);
          
          // Wait for script to load
          await new Promise((resolve) => {
            script.onload = resolve;
          });
        }
        
        Clerk = window.Clerk;
      }
      
      if (!Clerk) {
        throw new Error('Clerk SDK not available');
      }
      
      clerkInstance = new Clerk(publishableKey);
      
      // CRITICAL: Wait for Clerk to fully load and restore sessions from browser storage
      await clerkInstance.load();
      
      // Additional check to ensure Clerk is fully loaded
      // Use different timeouts for development vs production
      const isProduction = window.location.hostname !== 'localhost';
      const maxRetries = isProduction ? 15 : 10; // More retries for production
      const retryDelay = isProduction ? 150 : 100; // Longer delay for production
      
      let retries = 0;
      while (!clerkInstance.loaded && retries < maxRetries) {
        console.log('[Auth] Waiting for Clerk to finish loading...', { 
          retries, 
          environment: isProduction ? 'production' : 'development' 
        });
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        retries++;
      }
      
      console.log('[Auth] Clerk SDK initialized successfully', {
        loaded: clerkInstance.loaded,
        hasSession: !!clerkInstance.session,
        hasUser: !!clerkInstance.user
      });
      
      // Listen for authentication state changes
      clerkInstance.addListener((clerk) => {
        console.log('[Auth] Clerk state changed:', { 
          isSignedIn: !!clerk.user, 
          userId: clerk.user?.id,
          hasSession: !!clerk.session
        });
        
        // Refresh the dashboard when auth state changes
        if (window.gammaAuthStateChangeHandler) {
          window.gammaAuthStateChangeHandler();
        }
      });
      
      return clerkInstance;
    } catch (error) {
      console.error('[Auth] Failed to initialize Clerk SDK:', error);
      clerkInitializationPromise = null; // Reset for retry
      return null;
    }
  })();
  
  return clerkInitializationPromise;
}

// Get current user with Clerk SDK integration
async function getCurrentUser() {
  const clerk = await initializeClerk();
  if (!clerk) return null;
  
  // CRITICAL: Check if Clerk is still loading - don't make auth decisions yet
  if (!clerk.loaded) {
    console.log('[Auth] Clerk SDK still loading, cannot determine auth state yet');
    return null; // Return null but DON'T clear localStorage
  }
  
  // Now we know Clerk is fully loaded and has attempted session restoration
  console.log('[Auth] Checking authentication state', {
    loaded: clerk.loaded,
    hasUser: !!clerk.user,
    hasSession: !!clerk.session,
    sessionId: clerk.session?.id
  });
  
  // Check if user is signed in with Clerk (session has been restored)
  if (clerk.user && clerk.session) {
    const clerkUser = clerk.user;
    const sessionToken = await clerk.session.getToken();
    
    // Store the session token for API calls
    if (sessionToken) {
      localStorage.setItem('clerk_session_token', sessionToken);
    }
    
    try {
      console.log('[Auth] User authenticated with Clerk, bootstrapping from database...');
      const response = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        }
      });
      
      if (response.ok) {
        const { user } = await response.json();
        
        // Store user info from database
        localStorage.setItem('user_id', user.id);
        localStorage.setItem('user_email', user.email);
        localStorage.setItem('user_name', user.name || '');
        localStorage.setItem('user_clerk_id', user.clerkId);
        
        console.log('[Auth] User bootstrapped from database:', user);
        
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          clerkId: user.clerkId,
          source: 'database'
        };
      } else {
        console.error('[Auth] Failed to bootstrap user from database');
      }
    } catch (error) {
      console.error('[Auth] Error bootstrapping user:', error);
    }
    
    // Fallback to Clerk user data if database bootstrap fails
    return {
      email: clerkUser.emailAddresses[0]?.emailAddress,
      name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim() || 'User',
      clerkId: clerkUser.id,
      source: 'clerk'
    };
  }
  
  // At this point, Clerk is fully loaded but there's no active session
  // Check for stored user data that might be stale
  const storedUserId = localStorage.getItem('user_id');
  const storedEmail = localStorage.getItem('user_email');
  const storedName = localStorage.getItem('user_name');
  const storedToken = localStorage.getItem('clerk_session_token');
  const storedClerkId = localStorage.getItem('user_clerk_id');
  
  if (storedUserId && storedEmail && storedToken) {
    // We have stored data but Clerk doesn't have a session
    // This means the session has expired or been revoked
    console.log('[Auth] Found stored session data but Clerk has no active session - clearing stale data');
    const authKeys = ['clerk_session_token', 'user_id', 'user_email', 'user_name', 'user_clerk_id'];
    authKeys.forEach(key => localStorage.removeItem(key));
  }
  
  // Definitively no authenticated user
  return null;
}

// Sign in with Clerk
async function signIn() {
  const clerk = await initializeClerk();
  if (!clerk) return;
  
  try {
    // Use Clerk's built-in sign-in modal
    await clerk.openSignIn();
  } catch (error) {
    console.error('[Auth] Sign-in failed:', error);
  }
}

// Sign out with Clerk
async function logout() {
  const clerk = await initializeClerk();
  
  // Clear local storage first
  const authKeys = [
    'clerk_session_token', 'clerk_jwt_token', 'device_token', 
    'device_id', 'pairing_code', 'user_email', 'user_name', 
    'user_id', 'user_clerk_id', 'gamma_auth_state'
  ];
  
  authKeys.forEach(key => localStorage.removeItem(key));
  
  // Sign out from Clerk
  if (clerk) {
    try {
      await clerk.signOut();
      console.log('[Auth] Successfully signed out from Clerk');
    } catch (error) {
      console.error('[Auth] Error during Clerk sign-out:', error);
    }
  }
  
  // Refresh the page to update UI
  window.location.href = window.location.origin;
}

// Handle device pairing
async function handleDevicePairing(pairingCode) {
  const user = await getCurrentUser();
  if (!user) {
    console.error('[Pairing] No authenticated user found');
    return false;
  }
  
  try {
    const response = await fetch('/api/devices/link', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('clerk_session_token')}`
      },
      body: JSON.stringify({ code: pairingCode })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('[Pairing] Device linked successfully:', result);
      return true;
    } else {
      const error = await response.text();
      console.error('[Pairing] Device linking failed:', error);
      return false;
    }
  } catch (error) {
    console.error('[Pairing] Error during device linking:', error);
    return false;
  }
}

// Main dashboard rendering
async function renderDashboard() {
  const container = document.getElementById('app');
  if (!container) return;
  
  const urlParams = new URLSearchParams(window.location.search);
  const pairingCode = urlParams.get('code');
  
  container.innerHTML = '<div style="text-align: center; padding: 20px;">Loading authentication...</div>';
  
  try {
    // First ensure Clerk is initialized
    const clerk = await initializeClerk();
    
    // If Clerk failed to initialize, show error
    if (!clerk) {
      container.innerHTML = '<div style="text-align: center; color: red; padding: 20px;">Failed to initialize authentication. Please refresh the page.</div>';
      return;
    }
    
    // Check if Clerk is still loading
    if (!clerk.loaded) {
      console.log('[Dashboard] Clerk still loading, showing loading state...');
      container.innerHTML = '<div style="text-align: center; padding: 20px;">Restoring session...</div>';
      
      // For production, add a longer timeout and maximum retry attempts
      const maxRetries = window.location.hostname === 'localhost' ? 50 : 30; // Shorter timeout for production
      const retryDelay = window.location.hostname === 'localhost' ? 100 : 200; // Longer delay for production
      
      if (!window.clerkLoadRetryCount) window.clerkLoadRetryCount = 0;
      window.clerkLoadRetryCount++;
      
      if (window.clerkLoadRetryCount < maxRetries) {
        setTimeout(() => renderDashboard(), retryDelay);
      } else {
        console.error('[Dashboard] Clerk failed to load after maximum retries');
        container.innerHTML = '<div style="text-align: center; color: red; padding: 20px;">Authentication failed to load. Please refresh the page.</div>';
      }
      return;
    }
    
    // Reset retry counter when Clerk loads successfully
    window.clerkLoadRetryCount = 0;
    
    // Now get the current user (Clerk is fully loaded)
    const user = await getCurrentUser();
    const isAuthenticated = !!user;
    
    console.log('[Dashboard] Render state:', { 
      isAuthenticated, 
      pairingCode, 
      user,
      clerkLoaded: clerk.loaded,
      clerkSession: !!clerk.session
    });
    
    container.innerHTML = '';
    
    // Handle pairing flow
    if (pairingCode && !isAuthenticated) {
      console.log('[Dashboard] Need authentication for device pairing');
      
      container.appendChild(h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' } }, [
        h('h1', { style: { fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' } }, 'Device Pairing'),
        h('p', { style: { fontSize: '1.2rem', color: '#666', textAlign: 'center', marginBottom: '2rem' } }, 
          'Please sign in to connect your device to your Gamma account.'
        ),
        h('div', { style: { textAlign: 'center' } }, [
          h('button', {
            onclick: signIn,
            style: {
              backgroundColor: '#007bff', 
              color: 'white', 
              padding: '12px 24px', 
              border: 'none', 
              borderRadius: '6px', 
              fontSize: '16px',
              cursor: 'pointer'
            }
          }, 'Sign In with Clerk')
        ])
      ]));
      return;
    }
    
    // Handle authenticated pairing
    if (pairingCode && isAuthenticated) {
      console.log('[Dashboard] Processing device pairing...');
      
      container.appendChild(h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' } }, [
        h('h1', { style: { fontSize: '2.5rem', marginBottom: '1rem', textAlign: 'center' } }, 'Connecting Device...'),
        h('div', { style: { textAlign: 'center', marginBottom: '2rem' } }, [
          h('div', { style: { fontSize: '1.2rem', color: '#666' } }, 'Linking your extension to your account...')
        ])
      ]));
      
      const success = await handleDevicePairing(pairingCode);
      
      if (success) {
        container.innerHTML = '';
        container.appendChild(h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' } }, [
          h('div', { style: { textAlign: 'center' } }, [
            h('div', { style: { fontSize: '3rem', marginBottom: '1rem' } }, '✅'),
            h('h1', { style: { fontSize: '2.5rem', marginBottom: '1rem', color: '#28a745' } }, 'Device Connected Successfully!'),
            h('p', { style: { fontSize: '1.2rem', color: '#666', marginBottom: '2rem' } }, 
              'Your extension is now connected to your account. You can close this window and return to the extension.'
            ),
            h('button', {
              onclick: () => window.close(),
              style: {
                backgroundColor: '#28a745', 
                color: 'white', 
                padding: '12px 24px', 
                border: 'none', 
                borderRadius: '6px', 
                fontSize: '16px',
                cursor: 'pointer'
              }
            }, 'Close Window')
          ])
        ]));
      } else {
        container.innerHTML = '';
        container.appendChild(h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' } }, [
          h('div', { style: { textAlign: 'center' } }, [
            h('div', { style: { fontSize: '3rem', marginBottom: '1rem' } }, '❌'),
            h('h1', { style: { fontSize: '2.5rem', marginBottom: '1rem', color: '#dc3545' } }, 'Connection Failed'),
            h('p', { style: { fontSize: '1.2rem', color: '#666', marginBottom: '2rem' } }, 
              'Unable to connect your device. Please try again or contact support.'
            ),
            h('button', {
              onclick: () => window.location.reload(),
              style: {
                backgroundColor: '#007bff', 
                color: 'white', 
                padding: '12px 24px', 
                border: 'none', 
                borderRadius: '6px', 
                fontSize: '16px',
                cursor: 'pointer'
              }
            }, 'Try Again')
          ])
        ]));
      }
      return;
    }
    
    // Main dashboard
    if (isAuthenticated) {
      container.appendChild(h('div', { style: { maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' } }, [
        // Header
        h('header', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '1px solid #e9ecef', paddingBottom: '1rem' } }, [
          h('h1', { style: { fontSize: '2rem', margin: '0' } }, 'Gamma Timetables'),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '1rem' } }, [
            h('span', { style: { fontSize: '0.9rem', color: '#666' } }, `Welcome, ${user.name || user.email}`),
            h('button', {
              onclick: logout,
              style: {
                backgroundColor: '#dc3545', 
                color: 'white', 
                padding: '8px 16px', 
                border: 'none', 
                borderRadius: '4px', 
                fontSize: '14px',
                cursor: 'pointer'
              }
            }, 'Sign Out')
          ])
        ]),
        
        // Main content
        h('main', {}, [
          h('div', { style: { textAlign: 'center', padding: '3rem 0' } }, [
            h('h2', { style: { fontSize: '1.8rem', marginBottom: '1rem' } }, 'Your Presentations'),
            h('p', { style: { fontSize: '1.1rem', color: '#666', marginBottom: '2rem' } }, 
              'Manage your Gamma presentation timetables across all your devices.'
            ),
            h('div', { style: { padding: '2rem', backgroundColor: '#f8f9fa', borderRadius: '8px', color: '#666' } }, [
              h('p', {}, 'Presentation sync features will be available soon.')
            ])
          ])
        ])
      ]));
    } else {
      // Not authenticated - show landing page
      container.appendChild(h('div', { style: { maxWidth: '600px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' } }, [
        h('div', { style: { textAlign: 'center' } }, [
          h('h1', { style: { fontSize: '3rem', marginBottom: '1rem' } }, 'Gamma Timetables'),
          h('p', { style: { fontSize: '1.3rem', color: '#666', marginBottom: '3rem' } }, 
            'Transform your Gamma presentations into structured timetables with cloud sync across all your devices.'
          ),
          h('button', {
            onclick: signIn,
            style: {
              backgroundColor: '#007bff', 
              color: 'white', 
              padding: '16px 32px', 
              border: 'none', 
              borderRadius: '8px', 
              fontSize: '18px',
              cursor: 'pointer'
            }
          }, 'Get Started')
        ])
      ]));
    }
  } catch (error) {
    console.error('[Dashboard] Error rendering dashboard:', error);
    container.innerHTML = '<div style="text-align: center; color: red; padding: 20px;">Error loading dashboard. Please refresh the page.</div>';
  }
}

// Set up auth state change handler
window.gammaAuthStateChangeHandler = renderDashboard;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', renderDashboard);

// Also render immediately if DOM is already loaded
if (document.readyState === 'loading') {
  // DOM is still loading
} else {
  // DOM is ready
  renderDashboard();
}
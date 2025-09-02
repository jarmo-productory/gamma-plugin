# Database Architecture & Design Documentation

**Last Updated:** 2025-08-31  
**Version:** 2.0 (Sprint 19 Security Update)  
**Audience:** Development Team & AI Agents  
**Purpose:** Comprehensive database understanding for informed development decisions

---

## 🚨 Sprint 19 Security Update (CRITICAL CHANGES)

**⚠️ BREAKING CHANGES:** As of Sprint 19, the database architecture has been completely overhauled for security:

### **Key Security Changes:**
- **🔐 SHA-256 Token Hashing:** All device tokens now stored as secure hashes, never plaintext
- **🚫 No Direct Table Access:** Anonymous users cannot query `device_tokens` table directly  
- **🔧 RPC-Only Operations:** All token operations go through secure `SECURITY DEFINER` functions
- **🎲 Cryptographically Secure Tokens:** 256-bit entropy opaque tokens (no embedded info)
- **📊 Debug Endpoint Security:** Debug routes sanitized to never expose token values

### **Migration Impact:**
- **Legacy code using direct queries WILL FAIL** after migration
- **Use `secureTokenStore.ts` instead of `tokenStore.ts`**
- **Token validation now requires `validateSecureToken()` RPC function**
- **Cleanup operations use `cleanup_expired_tokens()` RPC function**

---

## 🎯 Overview

The Gamma Timetable Extension uses **Supabase** (PostgreSQL) as its primary database with a hybrid authentication model supporting both web users (via Supabase Auth) and Chrome extension devices (via secure device tokens).

### **Core Architecture Principles**
- **RPC-based security** with SHA-256 token hashing (Sprint 19)
- **Multi-client pattern** (browser, server, service-role)
- **Hybrid authentication** (Supabase Auth sessions + secure device tokens)
- **Migration-driven schema evolution**
- **Direct auth.uid() usage** (no intermediate users table lookup required)
- **Zero direct table access** for sensitive operations

---

## 📊 Database Schema

### **Table: `users`**
**Purpose:** Core user profiles linked to Supabase authentication

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR UNIQUE,          -- LEGACY: From previous Clerk implementation  
  email VARCHAR NOT NULL,
  name VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Current Status:** **LEGACY TABLE** - Modern implementation uses `auth.uid()` directly
**Key Relationships:** Historical only - current code bypasses this table
**Migration Note:** Recent migrations moved from users table lookup to direct `auth.uid()` usage

### **Table: `presentations`**
**Purpose:** Store presentation data and timetables from Gamma

```sql
CREATE TABLE presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,           -- Direct reference to auth.uid()
  title VARCHAR NOT NULL,
  gamma_url VARCHAR UNIQUE NOT NULL,
  start_time VARCHAR DEFAULT '09:00',
  total_duration INTEGER DEFAULT 0,
  timetable_data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Key Features:**
- **JSONB timetable_data** - Complete timetable objects from Gamma presentations
- **Direct auth integration** - `user_id` directly maps to `auth.uid()`
- **Unique gamma_url** - Prevents duplicate presentations from same Gamma URL
- **Flexible timing** - Configurable start time and duration

**RLS Policies (Current):**
```sql
-- Direct auth.uid() policies (no users table lookup)
CREATE POLICY "Users can view own presentations" ON presentations
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own presentations" ON presentations  
  FOR INSERT WITH CHECK (user_id = auth.uid());
```

### **Table: `device_tokens`** ⭐ **CRITICAL FOR AUTHENTICATION**
**Purpose:** Persistent device authentication tokens for Chrome extension

```sql
CREATE TABLE device_tokens (
  token TEXT PRIMARY KEY,               -- Unique token string
  device_id TEXT NOT NULL,              -- Chrome extension device ID
  user_id TEXT NOT NULL,                -- Supabase auth.uid() as TEXT
  user_email TEXT NOT NULL,             -- Denormalized for quick lookup
  device_name TEXT,                     -- Human-readable device name
  issued_at TIMESTAMPTZ DEFAULT NOW(), -- When token was created
  expires_at TIMESTAMPTZ NOT NULL,     -- Token expiration (24h default)
  last_used TIMESTAMPTZ DEFAULT NOW(), -- Last API request timestamp
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Critical Schema Details:**
- **user_id is TEXT** - `auth.uid()::text` conversion for compatibility
- **No foreign key constraint** - Direct auth.uid() reference, no users table dependency
- **Token format (Sprint 19):** 256-bit entropy opaque tokens (Base64URL encoded)
- **Security:** Tokens stored as SHA-256 hashes, never as plaintext

**Indexes (Performance Critical):**
```sql
CREATE INDEX idx_device_tokens_token ON device_tokens(token);
CREATE INDEX idx_device_tokens_user_id ON device_tokens(user_id);  
CREATE INDEX idx_device_tokens_expires_at ON device_tokens(expires_at);
```

**RLS Policies (Complex Security Model):**
```sql
-- Authenticated users can manage their own tokens
CREATE POLICY "authenticated_users_can_view_own_tokens" ON device_tokens
  FOR SELECT TO authenticated  
  USING (auth.uid()::text = user_id);

-- CRITICAL: Anonymous role can read tokens for extension API validation
CREATE POLICY "anonymous_can_read_tokens_for_validation" ON device_tokens
  FOR SELECT TO anon
  USING (true);

-- Anonymous role can update last_used during validation
CREATE POLICY "anonymous_can_update_last_used" ON device_tokens
  FOR UPDATE TO anon
  USING (true) WITH CHECK (true);
```

---

## 🔐 Client Architecture & Security

### **Client Types & Usage**

#### **1. Browser Client** (`utils/supabase/client.ts`)
```typescript
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { detectSessionInUrl: true, flowType: 'pkce' }
    }
  )
}
```

**Usage:** React components, client-side operations  
**Authentication:** Supabase Auth sessions (email/password, OAuth)  
**Security Level:** Anonymous key + RLS policies  

#### **2. Server Client** (`utils/supabase/server.ts`)
```typescript
export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => cookieStore.getAll(), setAll: ... }
    }
  )
}
```

**Usage:** API routes, Server Components, middleware  
**Authentication:** Supabase Auth sessions via Next.js cookies  
**Security Level:** Anonymous key + RLS policies + session validation  

#### **3. Service Role Client** (`utils/supabase/service.ts`)
```typescript
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // 🚨 Server-only!
    {
      auth: { autoRefreshToken: false, persistSession: false }
    }
  )
}
```

**Usage:** Admin operations, bypassing RLS  
**Authentication:** Service role bypasses all RLS policies  
**Security Level:** Full database access  
**⚠️ CRITICAL:** Never import in client-side code

### **Authentication Model: Supabase Auth Direct**

**Key Architecture Decision:** The system **bypasses the users table** and uses `auth.uid()` directly for all operations.

```typescript
// Modern pattern - Direct auth.uid() usage
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  
  // user.id is auth.uid() - use directly, no users table lookup needed
  const userId = user.id
}
```

---

## 🔑 Authentication Patterns

### **Pattern 1: Web User Authentication**
```typescript
// Standard web authentication pattern
export async function GET(request: NextRequest) {
  const supabase = await createClient() // Server client
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }
  
  // user.id is the Supabase auth.uid()
  const userId = user.id
  
  // Query with direct user_id match (RLS will enforce auth.uid() = user_id)
  const { data } = await supabase
    .from('presentations')
    .select('*')
    // RLS automatically filters to user's data
}
```

### **Pattern 2: Device Token Authentication**
```typescript
// Extension API authentication pattern
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Token required' }, { status: 401 })
  }
  
  const token = authHeader.substring(7)
  const tokenData = await validateToken(token) // Uses server client + RLS anon policies
  
  if (!tokenData) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
  }
  
  // tokenData.userId contains the auth.uid() associated with this device
  const userId = tokenData.userId
}
```

### **Pattern 3: Service Role Operations** 
```typescript
// Admin operations bypassing RLS
export async function adminCleanup() {
  const supabase = createServiceRoleClient() // Service role - bypasses RLS
  
  // Can perform operations across all users
  const { data } = await supabase
    .from('device_tokens')
    .delete()
    .lt('expires_at', new Date().toISOString())
}
```

---

## 🗄️ Migration History & Evolution

### **Migration Timeline**
```
20240718000001_initial_schema.sql        - Original Clerk-based schema
20250811090000_devices_table.sql         - Added device management  
20250829000001_device_tokens_table.sql   - Persistent token storage
20250829202819_add_device_tokens_rls_policies.sql - RLS for tokens
20250829210000_fix_presentations_rls_for_direct_auth.sql - Direct auth.uid()
```

### **Key Migration: Direct Auth Transition**
**File:** `20250829210000_fix_presentations_rls_for_direct_auth.sql`

**Problem Solved:** Eliminated dependency on `users` table lookup
**Before:** `user_id IN (SELECT id FROM users WHERE clerk_id = auth.uid()::text)`
**After:** `user_id = auth.uid()`

```sql
-- Old policy (complex lookup)
CREATE POLICY "Users can view own presentations" ON presentations
  FOR SELECT USING (user_id IN (
    SELECT id FROM users WHERE clerk_id = auth.uid()::text
  ));

-- New policy (direct auth.uid())  
CREATE POLICY "Users can view own presentations" ON presentations
  FOR SELECT USING (user_id = auth.uid());
```

**Impact:** Simplified architecture, better performance, eliminated users table dependency for most operations

---

## 🔄 Common Operations & Patterns

### **CRUD Operations**

#### **Save Presentation (Direct Auth)**
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

const { data, error } = await supabase
  .from('presentations')
  .insert({
    user_id: user.id,           // Direct auth.uid()
    title: presentationData.title,
    gamma_url: presentationData.url,
    timetable_data: presentationData
  })
```

#### **Validate Device Token**
```typescript
const supabase = await createClient() // Uses anon policies
const { data: tokenRecord, error } = await supabase
  .from('device_tokens')
  .select('*')
  .eq('token', token)
  .gte('expires_at', new Date().toISOString())
  .single()

if (tokenRecord) {
  // Update last_used timestamp
  await supabase
    .from('device_tokens')  
    .update({ last_used: new Date().toISOString() })
    .eq('token', token)
}
```

#### **List User's Presentations**
```typescript
const supabase = await createClient()
// RLS automatically filters to authenticated user's presentations
const { data } = await supabase
  .from('presentations')
  .select('*')
  .order('created_at', { ascending: false })
```

### **Performance Patterns**

#### **Efficient Device Token Operations**
```typescript
// ✅ GOOD: Uses primary key index
.eq('token', tokenValue)

// ✅ GOOD: Uses user_id index  
.eq('user_id', userId)

// ✅ GOOD: Uses expires_at index for cleanup
.lt('expires_at', new Date().toISOString())
```

### **Error Handling Patterns**

#### **RLS Policy Denials**
```typescript
// When RLS denies access, typically returns empty result set
const { data, error } = await supabase.from('presentations').select()
if (data?.length === 0 && !error) {
  // Could be RLS filtering or genuinely no data
  // Check authentication state
}
```

---

## 🚨 Known Issues & Technical Debt (Sprint 19 Targets)

### **Issue 1: Hybrid Storage Model** ⚠️ **HIGH PRIORITY**
**Location:** `/api/user/devices/route.ts:21-36`
**Problem:** Device listing uses in-memory `globalThis.deviceTokens` instead of database
**Impact:** Device list empty after server restart, inconsistent with token validation
**Evidence:**
```typescript
// ❌ CURRENT: In-memory storage
globalThis.deviceTokens = globalThis.deviceTokens || new Map();
for (const [token, tokenData] of globalThis.deviceTokens.entries()) {
  if (tokenData.userId === userId) {
    userDevices.push({...});
  }
}
```
**Fix Required:** Query `device_tokens` table directly

### **Issue 2: Service Role Import Inconsistency** ⚠️ **SECURITY**  
**Location:** `utils/tokenStore.ts:3` vs `utils/tokenStore.ts:28`
**Problem:** Imports service role client but uses regular server client
**Impact:** Unclear security boundaries, potential RLS bypass confusion
**Evidence:**
```typescript
// Line 3: Imported but unused
import { createServiceRoleClient } from '@/utils/supabase/service';

// Line 28: Actually used (different client)
const supabase = await createClient();
```
**Fix Required:** Either use service role properly or remove unused import

### **Issue 3: Legacy Users Table** ℹ️ **CLEANUP**
**Problem:** `users` table exists but unused in current implementation
**Impact:** Schema confusion, potential data inconsistency
**Fix Required:** Document deprecation or implement proper user profile sync

---

## 📈 Performance Considerations

### **Database Indexes Coverage**
- ✅ `device_tokens.token` - Primary key, optimal for token validation
- ✅ `device_tokens.user_id` - Indexed for user device queries  
- ✅ `device_tokens.expires_at` - Indexed for cleanup operations
- ✅ `presentations.user_id` - Indexed for user presentation queries
- ✅ `presentations.gamma_url` - Unique index prevents duplicates

### **Query Optimization**
- **Direct auth.uid() usage** eliminates users table joins
- **RLS policies** provide automatic filtering without explicit WHERE clauses
- **JSONB operations** on timetable_data use PostgreSQL native operators
- **Batch token cleanup** uses single DELETE with temporal index

---

## 🔍 Debugging & Monitoring

### **Connection Testing**
```bash
# Test basic database connectivity
curl http://localhost:3000/api/test-db
# Expected: {"success":true,"message":"Supabase connection successful"}

# Check token storage model  
curl http://localhost:3000/api/debug/tokens
# Expected: {"storage":"database"} (not in-memory)
```

### **Common Debug Queries**
```sql
-- Check active device tokens for user
SELECT token, device_id, user_email, expires_at, last_used
FROM device_tokens 
WHERE user_id = 'auth-uid-here'
  AND expires_at > NOW()
ORDER BY last_used DESC;

-- Check presentation count per user
SELECT user_id, COUNT(*) as presentation_count
FROM presentations
GROUP BY user_id;

-- Verify RLS is working (should return only user's data when authenticated)  
SELECT * FROM presentations; -- Via authenticated client
```

### **Authentication Flow Testing**
```bash
# Test web user authentication
curl -H "Cookie: sb-access-token=..." http://localhost:3000/api/user/profile

# Test device token authentication  
curl -H "Authorization: Bearer token_device_123..." http://localhost:3000/api/user/profile
```

---

## 🎯 Development Guidelines

### **Before Database Changes**
1. **Test migrations** in local development first
2. **Verify RLS policies** don't break existing functionality
3. **Update this documentation** with schema changes
4. **Consider service role vs authenticated access** requirements

### **Authentication Implementation Rules**
1. **Web routes:** Always use `supabase.auth.getUser()` for session validation
2. **Extension routes:** Use `validateToken()` for device token validation  
3. **Admin operations:** Only use service role client when bypassing RLS is required
4. **Direct auth.uid():** Use `user.id` directly, avoid users table lookups

### **Security Best Practices**
1. **Service role key:** Never expose to client-side code
2. **RLS policies:** Test with both authenticated and anonymous access
3. **Token validation:** Always check expiration and update last_used
4. **Error handling:** Don't leak authentication state in error messages

---

## 📚 Additional Resources

### **Supabase Documentation**
- [Row Level Security Policies](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Database Functions & Triggers](https://supabase.com/docs/guides/database/functions)

### **Project-Specific Files**
- **Migration files:** `supabase/migrations/*.sql`
- **Client implementations:** `packages/web/src/utils/supabase/`
- **Token management:** `packages/web/src/utils/tokenStore.ts` (⚠️ contains hybrid storage issue)
- **API routes:** `packages/web/src/app/api/*/route.ts`
- **Schema types:** `packages/web/src/lib/supabase.ts` (legacy types)

---

*This documentation reflects the current state of the database architecture as of Sprint 19 planning. Issues marked for Sprint 19 resolution should be addressed before the next major feature development.*
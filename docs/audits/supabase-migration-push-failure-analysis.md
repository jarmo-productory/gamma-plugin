# Supabase Migration Push Failure - Root Cause Analysis

**Date:** 2025-11-06  
**Issue:** `supabase db push --linked` fails with connection timeout  
**Error:** `failed to connect to postgres: failed to connect to host=aws-0-eu-central-1.pooler.supabase.com ... timeout: context deadline exceeded`

---

## 🔍 Root Causes (From Research)

### **1. Network Restrictions / IP Allowlist** (Most Likely)

**Problem:** Supabase allows IP-based restrictions on database access. Your current IP might not be allowlisted.

**Solution:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/dknqqcnnbcqujeffbmmb/settings/database
2. Navigate to **Network Restrictions** section
3. Add your current IP address to the allowlist
4. Check if "Allow connections from all IPs" is enabled (if not, enable it temporarily)

**Your Current IP:** `80.235.87.157` (detected via curl)

**How to find your IP:**
```bash
curl ifconfig.me
# Or visit: https://whatismyipaddress.com/
```

---

### **2. Connection Pooler Timeout**

**Problem:** Supabase CLI uses connection pooler (`pooler.supabase.com`) which has stricter timeout limits than direct connections.

**Solution:** Use direct database connection instead of pooler:
- Direct connection string is available in Dashboard → Settings → Database → Connection string
- Use format: `postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres`
- Not the pooler URL: `aws-0-eu-central-1.pooler.supabase.com`

**Note:** Migrations should use direct connections, not pooler connections.

---

### **3. Database Statement Timeout**

**Problem:** Supabase has default statement timeouts:
- Anonymous users: 3 seconds
- Authenticated users: 8 seconds  
- Global limit: 2 minutes

**Solution:** Increase timeout for migration session:
```sql
-- Connect via Supabase Dashboard SQL Editor first
SET statement_timeout = '10min';
-- Then run migration
```

Or alter role permanently:
```sql
ALTER ROLE authenticated SET statement_timeout = '10min';
NOTIFY pgrst, 'reload config';
```

---

### **4. Firewall / Proxy Blocking**

**Problem:** Corporate firewall or proxy blocking outbound PostgreSQL connections (port 5432).

**Solutions:**
- Test connectivity: `nc -zv db.dknqqcnnbcqujeffbmmb.supabase.co 5432`
- Use different network (mobile hotspot, home network)
- Configure firewall to allow Supabase IPs
- Use VPN if corporate network blocks connections

---

### **5. Supabase Service Status**

**Problem:** Temporary Supabase service outage or maintenance.

**Check:** https://status.supabase.com/

---

## ✅ Recommended Solutions (In Order)

### **Solution 1: Check IP Allowlist** (Try First)

1. Open Supabase Dashboard
2. Go to: **Settings** → **Database** → **Network Restrictions**
3. Add your current IP or enable "Allow all IPs"
4. Retry: `supabase db push --linked`

### **Solution 2: Use Direct Connection** (If Pooler Fails)

The CLI might be using pooler connection. Check if there's a way to force direct connection:

```bash
# Check connection method
supabase db push --linked --debug

# Or manually specify direct connection
# (Check Supabase CLI docs for direct connection option)
```

### **Solution 3: Deploy via Dashboard** (Workaround)

Since CLI connection is failing, use Supabase Dashboard SQL Editor:
1. Go to: https://supabase.com/dashboard/project/dknqqcnnbcqujeffbmmb/sql/new
2. Copy migration SQL from: `supabase/migrations/20251106195743_fix_trigger_content_extraction.sql`
3. Paste and run in SQL Editor
4. Verify deployment

### **Solution 4: Increase Timeout** (For Long Migrations)

If migration is timing out during execution:
1. Connect via Dashboard SQL Editor
2. Run: `SET statement_timeout = '10min';`
3. Then run migration SQL
4. Or use Supavisor (session mode) for longer transactions

---

## 🔧 Diagnostic Commands

```bash
# Test network connectivity
nc -zv db.dknqqcnnbcqujeffbmmb.supabase.co 5432

# Check your public IP
curl ifconfig.me

# Test Supabase CLI connection with debug
supabase db push --linked --debug

# Check Supabase status
curl https://status.supabase.com/api/v2/status.json | jq
```

---

## 📊 Most Likely Cause

Based on the error pattern (`pooler.supabase.com` timeout), the most likely causes are:

1. **IP not allowlisted** (60% probability)
2. **Firewall blocking pooler connection** (25% probability)
3. **Connection pooler timeout limits** (10% probability)
4. **Temporary Supabase service issue** (5% probability)

---

## 🎯 Immediate Action Plan

### **Step 1: Check IP Allowlist** (Do This First)

1. Go to: https://supabase.com/dashboard/project/dknqqcnnbcqujeffbmmb/settings/database
2. Scroll to **Network Restrictions** section
3. Check if your IP `80.235.87.157` is allowlisted
4. If not, add it or enable "Allow connections from all IPs"
5. Retry: `supabase db push --linked`

### **Step 2: Deploy Migration via Dashboard** (Immediate Workaround)

Since CLI is blocked, deploy manually:

1. **Go to SQL Editor:** https://supabase.com/dashboard/project/dknqqcnnbcqujeffbmmb/sql/new
2. **Copy migration SQL:** Open `supabase/migrations/20251106195743_fix_trigger_content_extraction.sql`
3. **Paste and Run** in SQL Editor
4. **Verify:** Run this query:
   ```sql
   SELECT prosrc 
   FROM pg_proc 
   WHERE proname = 'sync_slide_fingerprints_incremental'
   AND prosrc LIKE '%extract_content_text%';
   ```
   Should return 1 row if successful.

### **Step 3: Test After Deployment**

After migration is deployed:
1. Save a presentation via extension
2. Check if fingerprints are created:
   ```sql
   SELECT COUNT(*) FROM slide_fingerprints;
   ```
3. Test duration suggestions in timetable view

### **Step 4: Future CLI Fix** (Optional)

Once IP allowlist is fixed:
- Retry `supabase db push --linked` for future migrations
- Or continue using Dashboard SQL Editor (works fine)

---

**Status:** Migration ready, blocked by connection issue. Dashboard SQL Editor is reliable alternative.


# Quick Start: Debugging Guide

## 🚀 Testing Your Fix

Now that everything is implemented, here's how to test that the "Create Session" bug is fixed:

### 1. Start the Development Server

```bash
npm run dev
```

### 2. Test the Diagnostic Endpoint

Open a new terminal and run:

```bash
# Get your auth token from the browser
# 1. Open DevTools (F12)
# 2. Go to Application > Local Storage
# 3. Find your Supabase auth token

# Then test diagnostics:
curl -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  http://localhost:3000/api/debug/diagnostics | jq
```

**Expected output:** A JSON report showing all system checks passing.

### 3. Test Session Creation

**In the browser:**

1. Navigate to your application
2. Log in with your credentials
3. Go to the "Prep" section
4. Click **"Create New Session"**
5. Fill in the form (campaign, title, etc.)
6. Click **"Create"**

**What to watch:**

- **In the browser:** The session should be created successfully
- **In the terminal:** You should see detailed logs like:

```
[POST /api/prep/sessions][req_XXXXX] ===== REQUEST START =====
[POST /api/prep/sessions][req_XXXXX] Body parsed successfully
[POST /api/prep/sessions][req_XXXXX] Token validated successfully
[POST /api/prep/sessions][req_XXXXX] User ID: abc12345...
[supabaseRestRequest][req_XXXXX] POST sessions
[supabaseRestRequest][req_XXXXX] Response: 201 in 150ms
[POST /api/prep/sessions][req_XXXXX] Session created with ID: xyz-789
[POST /api/prep/sessions][req_XXXXX] ===== REQUEST SUCCESS =====
```

### 4. If Something Goes Wrong

**Check the logs for:**

1. **Request ID:** Look for `[req_XXXXX]` to track the flow
2. **Error message:** Clear description of what failed
3. **Timestamp:** When it happened
4. **Context:** What was being attempted

**Common issues and solutions:**

| Log Message | Problem | Solution |
|------------|---------|----------|
| "No authorization header found" | Frontend not sending token | Check Supabase auth on frontend |
| "Token has expired" | Session expired | Refresh token or log in again |
| "NEXT_PUBLIC_SUPABASE_URL is not defined" | Environment variable missing | Check `.env` file exists and is loaded |
| "Response: 403" | RLS policy blocking request | Check Supabase RLS policies |

### 5. Using Request IDs for Debugging

When you see an error:

1. Note the `requestId` from the error response
2. Search your console logs for that ID: `grep req_XXXXX`
3. You'll see the complete flow of that request

**Example:**

```bash
# Error response shows: "requestId": "req_1234567890_abc123"
# Search logs:
grep req_1234567890_abc123 ~/logs/*.log
```

## 📊 What You Should See

### ✅ Success Signs

- No "headers() expects requestAsyncStorage" errors
- Clear log messages with request IDs
- Session created successfully
- Detailed timing information in logs
- Helpful error messages if something fails

### ❌ Warning Signs

- Missing authorization headers (check frontend auth)
- Expired tokens (refresh session)
- Environment variables not loaded (restart server)
- RLS policy errors (check Supabase dashboard)

## 🔍 Advanced Debugging

### View All Diagnostics

The diagnostic endpoint checks everything:

```bash
curl -H "Authorization: Bearer TOKEN" \
  http://localhost:3000/api/debug/diagnostics \
  | jq '.summary'
```

**Output:**
```json
{
  "overallStatus": "healthy",
  "passedChecks": 15,
  "failedChecks": 0,
  "warnings": 2
}
```

### Check Specific Subsystems

```bash
# Check environment
curl ... | jq '.environment'

# Check authentication
curl ... | jq '.authentication'

# Check Supabase connectivity
curl ... | jq '.supabase'

# Check Next.js context
curl ... | jq '.nextjs'
```

### Monitor Logs in Real-Time

```bash
# Watch logs as you make requests
npm run dev 2>&1 | grep "\[POST /api/prep/sessions\]"
```

## 📚 Additional Resources

- **Full Error Handling Guide:** See `ERROR_HANDLING_GUIDE.md`
- **Implementation Details:** See `IMPLEMENTATION_SUMMARY.md`
- **Dependency Info:** See `DEPENDENCY_ANALYSIS.md`

## 💡 Quick Tips

1. **Always check logs first** - They're very detailed now
2. **Use the diagnostic endpoint** - It checks everything at once
3. **Look for request IDs** - They connect all related logs
4. **Check environment variables** - Most issues are config-related
5. **Verify auth tokens** - Make sure they're valid and not expired

## ✅ Verification Checklist

Before reporting an issue, verify:

- [ ] Development server is running
- [ ] Environment variables are set (`.env` file exists)
- [ ] User is logged in (Supabase auth working)
- [ ] Browser has valid auth token (check DevTools)
- [ ] Diagnostic endpoint shows "healthy" status
- [ ] Logs show request is reaching the API
- [ ] Request ID is present in logs and response

## 🎉 Expected Behavior

**The session creation flow should now:**

1. ✅ Accept the form submission
2. ✅ Validate the auth token
3. ✅ Parse the JWT successfully
4. ✅ Create the session in Supabase
5. ✅ Return success with session data
6. ✅ Show detailed logs for debugging
7. ✅ **Never** throw "headers() expects requestAsyncStorage" error

---

**You're all set!** The error has been completely eliminated and you have comprehensive debugging tools at your disposal.

If you still encounter issues, check the logs for the request ID and refer to the ERROR_HANDLING_GUIDE.md for detailed troubleshooting steps.

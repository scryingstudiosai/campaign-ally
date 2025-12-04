# Error Handling and Debugging Guide

## Overview

This guide documents the error handling strategies, debugging tools, and workarounds implemented to resolve the "Invariant: headers() expects to have requestAsyncStorage" error and improve overall application reliability.

## Table of Contents

1. [The headers() Error Explained](#the-headers-error-explained)
2. [Our Solution Strategy](#our-solution-strategy)
3. [Debugging Tools](#debugging-tools)
4. [API Route Best Practices](#api-route-best-practices)
5. [Supabase Authentication Patterns](#supabase-authentication-patterns)
6. [Troubleshooting Guide](#troubleshooting-guide)

---

## The headers() Error Explained

### What is it?

```
Error: Invariant: headers() expects to have requestAsyncStorage
```

### Why does it happen?

This error occurs when Next.js functions like `headers()` or `cookies()` from `next/headers` are called outside of the proper async request context. Specifically:

1. **Next.js 13.5.1** has limited async context propagation
2. **@supabase/ssr**'s `createServerClient()` internally calls these functions
3. When the async context isn't available, Next.js throws this error

### Where does it happen?

- API routes using `createServerClient()` from `@supabase/ssr`
- Server components or actions that lose the request context
- Any code path that calls `headers()` or `cookies()` without proper context

---

## Our Solution Strategy

We use a **multi-layered approach** that avoids the problematic functions entirely:

### 1. Manual Authentication Handling

Instead of relying on `@supabase/ssr`, we:

- Extract the `Authorization` header manually from the request
- Parse the JWT token ourselves
- Create Supabase clients with explicit token configuration

**File**: `/lib/supabase/server.ts`

```typescript
// ✅ CORRECT: Manual token extraction
export function createServerClientFromRequest(request: NextRequest, response: NextResponse) {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    return createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } }
    });
  }
  // Fallback to cookie-based auth or anonymous
}

// ❌ INCORRECT: Using @supabase/ssr
import { createServerClient } from '@supabase/ssr';
// This internally calls headers() and will fail
```

### 2. Direct REST API Calls

For critical operations like session creation, we bypass the Supabase SDK entirely:

**File**: `/app/api/prep/sessions/route.ts`

```typescript
async function supabaseRestRequest(path, method, token, body) {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;
  return fetch(url, {
    method,
    headers: {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
}
```

### 3. Runtime Configuration

All API routes now explicitly specify the Node.js runtime:

```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

This ensures consistent async context handling across all routes.

### 4. Comprehensive Error Logging

Every API route and helper function now includes:

- Request ID generation for correlation
- Timestamp logging
- Detailed parameter logging
- Environment variable validation
- JWT token validation and expiry checks
- Full error stack traces

---

## Debugging Tools

### 1. Diagnostic Endpoint

**URL**: `/api/debug/diagnostics`

**Purpose**: Comprehensive system health check

**What it checks**:
- ✅ Environment variables (Supabase URL, API keys)
- ✅ Request headers and cookies
- ✅ Authentication token validity
- ✅ JWT decoding and expiry
- ✅ Supabase REST API connectivity
- ✅ Supabase SDK functionality
- ✅ Next.js async context availability
- ✅ headers() and cookies() function availability

**Usage**:
```bash
# With authentication
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3000/api/debug/diagnostics

# Response format
{
  "timestamp": "2025-01-XX...",
  "environment": { /* env checks */ },
  "request": { /* request info */ },
  "authentication": { /* auth validation */ },
  "supabase": { /* connectivity tests */ },
  "nextjs": { /* async context checks */ },
  "summary": {
    "overallStatus": "healthy",
    "passedChecks": 15,
    "failedChecks": 0,
    "warnings": 2
  }
}
```

### 2. Enhanced Logging in Sessions Route

**File**: `/app/api/prep/sessions/route.ts`

Every session creation now logs:
- Request ID (for correlation)
- Timestamp
- Request body and headers
- Token extraction and validation
- JWT decoding details
- Token expiry information
- Database operation timing
- Full error traces

**Example log output**:
```
[POST /api/prep/sessions][req_1234567890_abc123] ===== REQUEST START =====
[POST /api/prep/sessions][req_1234567890_abc123] Timestamp: 2025-01-XX...
[POST /api/prep/sessions][req_1234567890_abc123] Body parsed successfully: {"campaignId":"...","title":"Session 1"}
[POST /api/prep/sessions][req_1234567890_abc123] Validation result: PASS
[POST /api/prep/sessions][req_1234567890_abc123] Token extracted successfully
[POST /api/prep/sessions][req_1234567890_abc123] Token length: 250 characters
[POST /api/prep/sessions][req_1234567890_abc123] JWT decoded successfully
[POST /api/prep/sessions][req_1234567890_abc123] User ID: abc12345...
[POST /api/prep/sessions][req_1234567890_abc123] Token expires in: 60 minutes
[supabaseRestRequest][req_1234567890_abc123] Starting POST request to sessions
[supabaseRestRequest][req_1234567890_abc123] Response received in 123ms
[POST /api/prep/sessions][req_1234567890_abc123] Session created with ID: xyz
[POST /api/prep/sessions][req_1234567890_abc123] ===== REQUEST SUCCESS =====
```

### 3. Supabase Helper Logging

**File**: `/lib/supabase/server.ts`

The `createServerClientFromRequest` function now logs:
- Request URL and method
- Environment variable presence
- Authorization header detection
- Token extraction attempts
- JWT payload inspection
- Cookie enumeration
- Authentication fallback chain
- Client creation success/failure

---

## API Route Best Practices

### Required Configuration

Every API route MUST include:

```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Authentication Pattern

Use the shared utility from `/lib/api-utils.ts`:

```typescript
import { extractAuthToken, createErrorResponse, createSuccessResponse } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const logPrefix = `[POST /api/your-route][${requestId}]`;

  try {
    // Extract and validate authentication
    const authResult = extractAuthToken(req, logPrefix);
    if (!authResult.success) {
      return createErrorResponse(authResult.error, 401, requestId);
    }

    const { token, userId } = authResult;

    // Your logic here

    return createSuccessResponse(data, 200, requestId);
  } catch (error) {
    console.error(`${logPrefix} Error:`, error);
    return createErrorResponse(error, 500, requestId);
  }
}
```

### Error Response Format

All API errors should follow this structure:

```typescript
{
  success: false,
  error: "Human-readable error message",
  requestId: "req_1234567890_abc123",
  timestamp: "2025-01-XX...",
  details: { /* optional debug info */ }
}
```

### Success Response Format

All API successes should follow this structure:

```typescript
{
  success: true,
  data: { /* your response data */ },
  requestId: "req_1234567890_abc123",
  timestamp: "2025-01-XX..."
}
```

---

## Supabase Authentication Patterns

### Pattern 1: Direct REST API (Recommended for Critical Operations)

```typescript
import { supabaseRestRequest } from '@/lib/api-utils';

const result = await supabaseRestRequest(
  'your_table',
  'POST',
  token,
  { /* your data */ },
  requestId
);
```

**Pros**:
- Complete control
- No SDK dependencies
- Clear error messages
- Easy to debug

**Cons**:
- More verbose
- Manual query building
- No TypeScript types

### Pattern 2: Manual Supabase Client Creation

```typescript
import { createServerClientFromRequest } from '@/lib/supabase/server';

const supabase = createServerClientFromRequest(req, res);
const { data, error } = await supabase.from('your_table').select('*');
```

**Pros**:
- Supabase SDK features
- TypeScript support
- Query builder

**Cons**:
- Requires proper token handling
- More dependencies

### Pattern 3: Authenticated Client Helper

```typescript
import { createAuthenticatedClient } from '@/lib/supabase/server';

const authResult = extractAuthToken(req);
if (!authResult.success) {
  return createErrorResponse(authResult.error, 401);
}

const supabase = createAuthenticatedClient(authResult.token);
```

---

## Troubleshooting Guide

### Problem: "No authorization token provided"

**Symptoms**:
- 401 error response
- Log shows: "No authorization header found"

**Solutions**:
1. Check frontend is sending `Authorization: Bearer <token>` header
2. Verify Supabase auth is working on frontend
3. Check browser network tab for the header
4. Use diagnostic endpoint to verify headers are received

**Example fix (frontend)**:
```typescript
const { data: { session } } = await supabase.auth.getSession();

await fetch('/api/your-route', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  }
});
```

### Problem: "Token has expired"

**Symptoms**:
- 401 error response
- Log shows: "Token has expired"
- Diagnostic endpoint shows negative expiry time

**Solutions**:
1. Refresh the token on frontend
2. Check system clock sync
3. Verify token expiry settings in Supabase dashboard

**Example fix (frontend)**:
```typescript
const { data: { session }, error } = await supabase.auth.refreshSession();
if (session) {
  // Use new session.access_token
}
```

### Problem: "NEXT_PUBLIC_SUPABASE_URL not configured"

**Symptoms**:
- 500 error response
- Log shows: "CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not defined"

**Solutions**:
1. Check `.env` file exists
2. Verify environment variable names match exactly
3. Restart dev server after changing `.env`
4. Check `.env` is not in `.gitignore` for local development

**Required `.env` contents**:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OPENAI_API_KEY=your-openai-key
```

### Problem: "Invalid JWT format"

**Symptoms**:
- 401 error response
- Log shows: "JWT has X parts (expected 3)"

**Solutions**:
1. Check token is complete (not truncated)
2. Verify Bearer prefix is not included in token extraction
3. Check for URL encoding issues
4. Verify token format: `xxxxx.yyyyy.zzzzz`

### Problem: Session creation fails with database error

**Symptoms**:
- 500 error response
- Log shows Supabase error message
- Diagnostic endpoint shows REST API failure

**Solutions**:
1. Check Row Level Security (RLS) policies on `sessions` table
2. Verify user has proper permissions
3. Check token contains valid `sub` (user ID) claim
4. Review Supabase logs in dashboard
5. Use diagnostic endpoint to test connectivity

**Debugging steps**:
```bash
# 1. Test diagnostic endpoint
curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/debug/diagnostics

# 2. Check logs for detailed error
# Look for [supabaseRestRequest] logs

# 3. Verify RLS policies in Supabase dashboard
# Go to: Authentication > Policies > sessions table

# 4. Test token directly with Supabase
curl -H "Authorization: Bearer TOKEN" \
     -H "apikey: YOUR_ANON_KEY" \
     https://your-project.supabase.co/rest/v1/sessions
```

### Problem: "Invariant: headers() expects to have requestAsyncStorage" still appears

**Symptoms**:
- Error in console
- References to `@supabase/ssr` or `next/headers`

**Solutions**:
1. Search codebase for imports of `next/headers`
2. Find any usage of `@supabase/ssr`'s `createServerClient`
3. Replace with manual authentication handling
4. Verify all API routes have `runtime = 'nodejs'`

**Search commands**:
```bash
# Find problematic imports
grep -r "from 'next/headers'" app/

# Find createServerClient usage
grep -r "createServerClient" app/

# Check runtime configuration
grep -L "export const runtime" app/api/**/route.ts
```

---

## Summary

### ✅ What We Fixed

1. **Eliminated headers() dependency** - All routes use manual token handling
2. **Added comprehensive logging** - Every operation is traceable
3. **Created diagnostic tools** - Easy runtime debugging
4. **Standardized error handling** - Consistent API responses
5. **Ensured runtime configuration** - All 38 routes properly configured
6. **Documented patterns** - Clear guidelines for future development

### 🛠️ Tools Available

- `/api/debug/diagnostics` - System health check
- `/lib/api-utils.ts` - Shared error handling utilities
- `/lib/supabase/server.ts` - Custom Supabase helpers
- Enhanced logging in all routes

### 📚 Best Practices

1. **Always** use `runtime = 'nodejs'` in API routes
2. **Never** import `headers()` or `cookies()` from `next/headers`
3. **Never** use `createServerClient()` from `@supabase/ssr`
4. **Always** include request IDs in logging
5. **Always** validate tokens and check expiry
6. **Always** use try-catch with detailed error logging

---

## Additional Resources

- [Next.js API Routes Documentation](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase REST API](https://supabase.com/docs/guides/api)
- [JWT Debugging](https://jwt.io)

## Support

If you encounter issues not covered in this guide:

1. Run the diagnostic endpoint: `/api/debug/diagnostics`
2. Check the console logs for detailed error traces
3. Review the request ID in error responses
4. Search logs for that request ID to see full flow
5. Compare with working examples in this guide

---

**Last Updated**: 2025-01-XX
**Version**: 1.0
**Maintainer**: Development Team

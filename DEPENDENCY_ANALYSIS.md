# Dependency Analysis and Version Compatibility

## Current Versions

### Core Framework
- **Next.js**: 13.5.1
- **React**: 18.2.0
- **React DOM**: 18.2.0
- **TypeScript**: 5.2.2
- **Node.js**: 22.21.0 (runtime)
- **NPM**: 10.9.4

### Supabase
- **@supabase/supabase-js**: ^2.58.0
- **@supabase/ssr**: ^0.7.0

### Other Key Dependencies
- **OpenAI**: ^6.5.0
- **Zod**: ^3.25.0
- **Tailwind CSS**: 3.3.3
- **shadcn/ui**: Various @radix-ui components

## Known Issues

### Next.js 13.5.1 + Supabase SSR Incompatibility

**Issue**: "Invariant: headers() expects to have requestAsyncStorage"

**Root Cause**:
- The `@supabase/ssr` package's `createServerClient()` function internally calls `headers()` or `cookies()` from `next/headers`
- These functions require Next.js's async request context (requestAsyncStorage)
- Next.js 13.5.1 has known issues with async context not being properly propagated in certain scenarios
- This is particularly problematic in API routes when using the Node.js runtime

**Affected Components**:
- API Routes that use `createServerClient()` from `@supabase/ssr`
- Any server-side code that attempts to use `headers()` or `cookies()` from `next/headers`

**Current Workaround**:
- Custom helpers in `/lib/supabase/server.ts` that bypass `@supabase/ssr`
- Direct use of `@supabase/supabase-js` with manual token handling
- Direct REST API calls to Supabase in critical routes like `/app/api/prep/sessions/route.ts`

## Version Compatibility Notes

### Next.js 13.5.1
- Released: September 2023
- This is a stable version but has known async context issues
- Upgrading to 13.5.6+ or 14.x would likely resolve the requestAsyncStorage issue
- However, we're maintaining 13.5.1 to avoid breaking changes

### @supabase/ssr 0.7.0
- Compatible with Next.js 13+
- Requires proper async context for `createServerClient()`
- We avoid using this package's main API in favor of manual token handling

### Node.js 22.21.0
- Fully compatible with Next.js 13.5.1
- Provides modern async context tracking
- No known compatibility issues

## Recommendations

### Short-term (Current Approach)
1. ✅ Continue using custom Supabase helpers in `/lib/supabase/server.ts`
2. ✅ Use direct REST API calls where SDK is problematic
3. ✅ Ensure all API routes specify `runtime = 'nodejs'`
4. ✅ Avoid importing `headers()` or `cookies()` from `next/headers`

### Long-term (Future Considerations)
1. Consider upgrading to Next.js 14.x or 15.x (breaking changes may apply)
2. Re-evaluate if `@supabase/ssr` can be used directly after Next.js upgrade
3. Monitor Supabase and Next.js release notes for compatibility improvements

## Testing Matrix

| Component | Version | Status | Notes |
|-----------|---------|--------|-------|
| Next.js API Routes | 13.5.1 | ✅ Working | With custom helpers |
| Supabase Auth | 2.58.0 | ✅ Working | Manual token handling |
| Direct REST API | - | ✅ Working | Bypasses SDK completely |
| createServerClient | 0.7.0 | ❌ Broken | Causes headers() error |
| Node.js Runtime | 22.21.0 | ✅ Working | Preferred runtime |
| Edge Runtime | 13.5.1 | ⚠️ Untested | Not recommended |

## Environment Variables Required

```env
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[key]
OPENAI_API_KEY=[key]
```

All variables must be present for the application to function correctly.

## Build Configuration

### next.config.js
```javascript
{
  eslint: { ignoreDuringBuilds: true },
  images: { unoptimized: true },
  experimental: { serverActions: true }
}
```

### Runtime Configuration (All API Routes)
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

## Change Log

- **2025-01-XX**: Initial documentation created
- **2025-01-XX**: Added comprehensive error logging across all API routes
- **2025-01-XX**: Created diagnostic endpoint for runtime debugging

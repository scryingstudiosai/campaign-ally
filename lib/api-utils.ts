import { NextRequest, NextResponse } from 'next/server';

export interface ApiError {
  success: false;
  error: string;
  requestId?: string;
  timestamp?: string;
  details?: any;
}

export interface ApiSuccess<T = any> {
  success: true;
  data: T;
  requestId?: string;
  timestamp?: string;
}

export type ApiResponse<T = any> = ApiSuccess<T> | ApiError;

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

export function formatTimestamp(): string {
  return new Date().toISOString();
}

export function safeStringify(obj: any, maxLength = 500): string {
  try {
    const str = JSON.stringify(obj);
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
  } catch {
    return '[Unable to stringify]';
  }
}

export function createErrorResponse(
  error: unknown,
  status: number = 500,
  requestId?: string
): NextResponse<ApiError> {
  const errorMessage = error instanceof Error ? error.message : 'Internal server error';

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      requestId,
      timestamp: formatTimestamp()
    },
    { status }
  );
}

export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string
): NextResponse<ApiSuccess<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      requestId,
      timestamp: formatTimestamp()
    },
    { status }
  );
}

export interface AuthResult {
  success: boolean;
  token?: string;
  userId?: string;
  error?: string;
  details?: any;
}

export function extractAuthToken(req: NextRequest, logPrefix?: string): AuthResult {
  const prefix = logPrefix || '[extractAuthToken]';

  console.log(`${prefix} Checking for authorization header...`);
  const authHeader = req.headers.get('authorization');

  if (!authHeader) {
    console.warn(`${prefix} No authorization header found`);
    console.log(`${prefix} Available headers:`, Array.from(req.headers.keys()));
    return {
      success: false,
      error: 'No authorization token provided',
      details: { availableHeaders: Array.from(req.headers.keys()) }
    };
  }

  console.log(`${prefix} Authorization header present`);

  if (!authHeader.startsWith('Bearer ')) {
    console.error(`${prefix} Invalid authorization format`);
    return {
      success: false,
      error: 'Invalid authorization format',
      details: { headerPrefix: authHeader.substring(0, 20) }
    };
  }

  const token = authHeader.substring(7);
  console.log(`${prefix} Token extracted, length: ${token.length}`);

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error(`${prefix} Invalid JWT format: ${parts.length} parts`);
      return {
        success: false,
        error: 'Invalid token format',
        details: { parts: parts.length }
      };
    }

    // Safe base64 decode with URL-safe character handling
    let payload;
    try {
      // Handle URL-safe base64
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const decoded = atob(base64);
      payload = JSON.parse(decoded);
    } catch (decodeError) {
      console.error(`${prefix} Failed to decode JWT payload:`, decodeError);
      return {
        success: false,
        error: 'Invalid token encoding',
        details: { decodeError: decodeError instanceof Error ? decodeError.message : String(decodeError) }
      };
    }

    const userId = payload.sub;

    if (!userId) {
      console.error(`${prefix} No user ID in token`);
      return {
        success: false,
        error: 'Invalid token: missing user ID',
        details: { payloadKeys: Object.keys(payload) }
      };
    }

    if (payload.exp) {
      const expiresIn = payload.exp * 1000 - Date.now();
      if (expiresIn < 0) {
        console.error(`${prefix} Token has expired`);
        return {
          success: false,
          error: 'Token has expired',
          details: { expiredAt: new Date(payload.exp * 1000).toISOString() }
        };
      }
      console.log(`${prefix} Token valid for ${Math.round(expiresIn / 1000 / 60)} more minutes`);
    }

    console.log(`${prefix} Token validated successfully`);
    return {
      success: true,
      token,
      userId,
      details: {
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : null
      }
    };
  } catch (error) {
    console.error(`${prefix} Failed to decode token:`, error);
    return {
      success: false,
      error: 'Invalid token',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function supabaseRestRequest(
  path: string,
  method: string,
  token: string,
  body?: any,
  requestId?: string
): Promise<any> {
  const startTime = Date.now();
  const logPrefix = `[supabaseRestRequest][${requestId || 'no-id'}]`;

  try {
    console.log(`${logPrefix} ${method} ${path}`);

    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL not configured');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY not configured');
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`;
    console.log(`${logPrefix} URL: ${url}`);

    const headers: Record<string, string> = {
      'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    };

    if (body) {
      console.log(`${logPrefix} Body: ${safeStringify(body)}`);
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    const duration = Date.now() - startTime;
    console.log(`${logPrefix} Response: ${response.status} in ${duration}ms`);

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        errorData = { message: await response.text() };
      }
      console.error(`${logPrefix} Error:`, safeStringify(errorData));
      throw new Error(errorData.message || errorData.error || 'Database operation failed');
    }

    const data = await response.json();
    console.log(`${logPrefix} Success:`, safeStringify(data));
    return data;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`${logPrefix} Failed after ${duration}ms:`, error);
    throw error;
  }
}

export function validateEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.error('[Environment] Missing required environment variables:', missing);
    return { valid: false, missing };
  }

  console.log('[Environment] All required environment variables are set');
  return { valid: true, missing: [] };
}

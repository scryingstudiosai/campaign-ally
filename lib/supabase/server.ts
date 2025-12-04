import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export function createServerClientFromRequest(request: NextRequest, response: NextResponse) {
  const requestId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const logPrefix = `[createServerClientFromRequest][${requestId}]`;

  console.log(`${logPrefix} ===== STARTING =====`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);
  console.log(`${logPrefix} Request URL: ${request.url}`);
  console.log(`${logPrefix} Request method: ${request.method}`);

  try {
    console.log(`${logPrefix} Validating environment variables...`);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error(`${logPrefix} CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not defined`);
      throw new Error('Supabase URL not configured');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error(`${logPrefix} CRITICAL: NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined`);
      throw new Error('Supabase anon key not configured');
    }
    console.log(`${logPrefix} Environment variables validated successfully`);
    console.log(`${logPrefix} Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);

    console.log(`${logPrefix} Checking for authorization header...`);
    const authHeader = request.headers.get('authorization');
    console.log(`${logPrefix} Authorization header present: ${!!authHeader}`);

    if (authHeader) {
      console.log(`${logPrefix} Authorization header found`);
      const headerPrefix = authHeader.substring(0, 20);
      console.log(`${logPrefix} Header starts with: ${headerPrefix}`);

      if (authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.substring(7);
          console.log(`${logPrefix} Bearer token extracted`);
          console.log(`${logPrefix} Token length: ${token.length} characters`);
          console.log(`${logPrefix} Token preview: ${token.substring(0, 15)}...${token.substring(token.length - 10)}`);

          const parts = token.split('.');
          console.log(`${logPrefix} JWT has ${parts.length} parts (expected 3)`);

          if (parts.length === 3) {
            try {
              // Safe base64 decode with URL-safe character handling
              const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              const payload = JSON.parse(atob(base64));
              console.log(`${logPrefix} JWT decoded successfully`);
              console.log(`${logPrefix} Token issuer: ${payload.iss || 'unknown'}`);
              console.log(`${logPrefix} Token subject (user): ${payload.sub?.substring(0, 8)}...`);
              console.log(`${logPrefix} Token expires: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'unknown'}`);

              if (payload.exp) {
                const expiresIn = payload.exp * 1000 - Date.now();
                const minutesRemaining = Math.round(expiresIn / 1000 / 60);
                console.log(`${logPrefix} Token expires in: ${minutesRemaining} minutes`);

                if (expiresIn < 0) {
                  console.warn(`${logPrefix} WARNING: Token has expired!`);
                } else if (minutesRemaining < 5) {
                  console.warn(`${logPrefix} WARNING: Token expires soon (${minutesRemaining} minutes)`);
                }
              }
            } catch (decodeError) {
              console.error(`${logPrefix} Failed to decode JWT payload:`, decodeError);
            }
          }

          console.log(`${logPrefix} Creating Supabase client with Bearer token authentication`);
          const client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
              auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
              },
            }
          );
          console.log(`${logPrefix} Supabase client created successfully with Bearer auth`);
          console.log(`${logPrefix} ===== SUCCESS (Bearer) =====`);
          return client;
        } catch (tokenError) {
          console.error(`${logPrefix} Error processing Bearer token:`, tokenError);
          console.log(`${logPrefix} Falling back to cookie-based authentication...`);
        }
      } else {
        console.warn(`${logPrefix} Authorization header does not start with 'Bearer '`);
        console.log(`${logPrefix} Header format: ${headerPrefix}...`);
      }
    } else {
      console.log(`${logPrefix} No authorization header found, trying cookie-based auth`);
    }

    console.log(`${logPrefix} Attempting cookie-based authentication...`);
    const cookies = request.cookies.getAll();
    console.log(`${logPrefix} Total cookies found: ${cookies.length}`);
    console.log(`${logPrefix} Cookie names:`, cookies.map(c => c.name));

    const authCookie = cookies.find(c => {
      const matches = c.name.includes('auth-token') ||
        c.name.includes('sb-') ||
        c.name.startsWith('supabase');
      if (matches) {
        console.log(`${logPrefix} Potential auth cookie found: ${c.name}`);
      }
      return matches;
    });

    console.log(`${logPrefix} Auth cookie found: ${!!authCookie}`);

    if (authCookie) {
      console.log(`${logPrefix} Auth cookie name: ${authCookie.name}`);
      console.log(`${logPrefix} Cookie value length: ${authCookie.value.length}`);

      try {
        console.log(`${logPrefix} Attempting to extract access token from cookie...`);
        const tokenMatch = authCookie.value.match(/"access_token":"([^"]+)"/);

        if (tokenMatch && tokenMatch[1]) {
          const token = tokenMatch[1];
          console.log(`${logPrefix} Access token extracted from cookie`);
          console.log(`${logPrefix} Token length: ${token.length} characters`);
          console.log(`${logPrefix} Token preview: ${token.substring(0, 15)}...`);

          try {
            const parts = token.split('.');
            if (parts.length === 3) {
              // Safe base64 decode with URL-safe character handling
              const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
              const payload = JSON.parse(atob(base64));
              console.log(`${logPrefix} Token user: ${payload.sub?.substring(0, 8)}...`);
              console.log(`${logPrefix} Token expires: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'unknown'}`);
            }
          } catch (decodeError) {
            console.warn(`${logPrefix} Could not decode token from cookie:`, decodeError);
          }

          console.log(`${logPrefix} Creating Supabase client with cookie token`);
          const client = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            {
              global: {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              },
              auth: {
                autoRefreshToken: false,
                persistSession: false,
                detectSessionInUrl: false,
              },
            }
          );
          console.log(`${logPrefix} Supabase client created successfully with cookie auth`);
          console.log(`${logPrefix} ===== SUCCESS (Cookie) =====`);
          return client;
        } else {
          console.warn(`${logPrefix} Could not find access_token in cookie value`);
          console.log(`${logPrefix} Cookie value starts with: ${authCookie.value.substring(0, 50)}...`);
        }
      } catch (cookieError) {
        console.error(`${logPrefix} Error extracting token from cookie:`, cookieError);
      }
    } else {
      console.log(`${logPrefix} No suitable auth cookie found`);
      if (cookies.length > 0) {
        console.log(`${logPrefix} Available cookie names for reference:`, cookies.map(c => c.name).join(', '));
      } else {
        console.log(`${logPrefix} No cookies available at all`);
      }
    }

    console.warn(`${logPrefix} No authentication found, returning anonymous client`);
    console.warn(`${logPrefix} This client will have limited permissions`);

    const anonClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    console.log(`${logPrefix} Anonymous Supabase client created`);
    console.log(`${logPrefix} ===== FALLBACK (Anonymous) =====`);
    return anonClient;

  } catch (error) {
    console.error(`${logPrefix} ===== ERROR =====`);
    console.error(`${logPrefix} Error creating Supabase client:`, error);
    console.error(`${logPrefix} Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`${logPrefix} Error message:`, error instanceof Error ? error.message : String(error));
    console.error(`${logPrefix} Error stack:`, error instanceof Error ? error.stack : 'No stack trace');

    console.log(`${logPrefix} Attempting to create fallback anonymous client despite error...`);
    try {
      const fallbackClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
      );
      console.log(`${logPrefix} Fallback client created`);
      return fallbackClient;
    } catch (fallbackError) {
      console.error(`${logPrefix} FATAL: Could not create fallback client:`, fallbackError);
      throw error;
    }
  }
}

export function createAuthenticatedClient(accessToken: string) {
  const logPrefix = '[createAuthenticatedClient]';

  console.log(`${logPrefix} Creating authenticated Supabase client`);
  console.log(`${logPrefix} Timestamp: ${new Date().toISOString()}`);

  try {
    console.log(`${logPrefix} Validating access token...`);
    if (!accessToken) {
      console.error(`${logPrefix} ERROR: Access token is empty or undefined`);
      throw new Error('Access token is required');
    }

    console.log(`${logPrefix} Token length: ${accessToken.length} characters`);
    console.log(`${logPrefix} Token preview: ${accessToken.substring(0, 15)}...${accessToken.substring(accessToken.length - 10)}`);

    const parts = accessToken.split('.');
    console.log(`${logPrefix} JWT has ${parts.length} parts (expected 3)`);

    if (parts.length !== 3) {
      console.error(`${logPrefix} ERROR: Invalid JWT format`);
      throw new Error('Invalid token format');
    }

    try {
      // Safe base64 decode with URL-safe character handling
      const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      console.log(`${logPrefix} JWT decoded successfully`);
      console.log(`${logPrefix} Token subject: ${payload.sub?.substring(0, 8)}...`);
      console.log(`${logPrefix} Token expires: ${payload.exp ? new Date(payload.exp * 1000).toISOString() : 'unknown'}`);

      if (payload.exp) {
        const expiresIn = payload.exp * 1000 - Date.now();
        if (expiresIn < 0) {
          console.error(`${logPrefix} ERROR: Token has expired`);
          throw new Error('Token has expired');
        }
        console.log(`${logPrefix} Token is valid for ${Math.round(expiresIn / 1000 / 60)} more minutes`);
      }
    } catch (decodeError) {
      console.error(`${logPrefix} ERROR: Failed to decode JWT:`, decodeError);
      throw new Error('Invalid token');
    }

    console.log(`${logPrefix} Validating environment variables...`);
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error(`${logPrefix} CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not defined`);
      throw new Error('Supabase URL not configured');
    }
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error(`${logPrefix} CRITICAL: NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined`);
      throw new Error('Supabase anon key not configured');
    }

    console.log(`${logPrefix} Creating Supabase client...`);
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          autoRefreshToken: false,
          persistSession: false,
          detectSessionInUrl: false,
        },
      }
    );

    console.log(`${logPrefix} Supabase client created successfully`);
    return client;
  } catch (error) {
    console.error(`${logPrefix} ===== ERROR =====`);
    console.error(`${logPrefix} Failed to create authenticated client:`, error);
    console.error(`${logPrefix} Error type:`, error instanceof Error ? error.constructor.name : typeof error);
    console.error(`${logPrefix} Error message:`, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

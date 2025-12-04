import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface DiagnosticResult {
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: any;
}

interface DiagnosticReport {
  timestamp: string;
  environment: {
    nodeVersion: string;
    nextVersion: string;
    runtime: string;
    env: Record<string, DiagnosticResult>;
  };
  request: {
    url: string;
    method: string;
    headers: Record<string, DiagnosticResult>;
    cookies: Record<string, DiagnosticResult>;
  };
  authentication: {
    bearerToken: DiagnosticResult;
    jwtDecoding: DiagnosticResult;
    tokenExpiry: DiagnosticResult;
  };
  supabase: {
    connectivity: DiagnosticResult;
    restApi: DiagnosticResult;
    sdkClient: DiagnosticResult;
  };
  nextjs: {
    asyncContext: DiagnosticResult;
    headersFunction: DiagnosticResult;
    cookiesFunction: DiagnosticResult;
  };
  summary: {
    overallStatus: 'healthy' | 'degraded' | 'failed';
    passedChecks: number;
    failedChecks: number;
    warnings: number;
  };
}

async function testSupabaseRestApi(token: string): Promise<DiagnosticResult> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        status: 'fail',
        message: 'Missing Supabase configuration'
      };
    }

    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
      },
    });

    return {
      status: 'pass',
      message: 'Successfully connected to Supabase REST API',
      details: {
        statusCode: response.status,
        statusText: response.statusText,
      }
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Failed to connect to Supabase REST API',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

async function testSupabaseSDK(token: string): Promise<DiagnosticResult> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return {
        status: 'fail',
        message: 'Missing Supabase configuration'
      };
    }

    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data, error } = await client.from('campaigns').select('count').limit(0);

    if (error) {
      return {
        status: 'warn',
        message: 'Supabase SDK connected but query failed',
        details: error.message
      };
    }

    return {
      status: 'pass',
      message: 'Supabase SDK working correctly',
      details: 'Successfully executed test query'
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Supabase SDK failed',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

function testAsyncContext(): DiagnosticResult {
  try {
    if (typeof AsyncLocalStorage !== 'undefined') {
      return {
        status: 'pass',
        message: 'AsyncLocalStorage is available',
        details: 'Async context tracking is supported'
      };
    } else {
      return {
        status: 'warn',
        message: 'AsyncLocalStorage not available',
        details: 'This may cause issues with Next.js async context'
      };
    }
  } catch (error) {
    return {
      status: 'fail',
      message: 'Error checking async context',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

function testHeadersFunction(): DiagnosticResult {
  try {
    const { headers } = require('next/headers');

    if (typeof headers === 'function') {
      try {
        headers();
        return {
          status: 'pass',
          message: 'headers() function works in this context',
          details: 'Async context is properly available'
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('requestAsyncStorage')) {
          return {
            status: 'fail',
            message: 'headers() requires requestAsyncStorage',
            details: 'This is the error we are working around. Use manual token handling instead.'
          };
        }
        return {
          status: 'warn',
          message: 'headers() function failed',
          details: error instanceof Error ? error.message : String(error)
        };
      }
    }

    return {
      status: 'warn',
      message: 'headers() is not a function',
      details: 'Unexpected state'
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Could not load next/headers',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

function testCookiesFunction(): DiagnosticResult {
  try {
    const { cookies } = require('next/headers');

    if (typeof cookies === 'function') {
      try {
        cookies();
        return {
          status: 'pass',
          message: 'cookies() function works in this context',
          details: 'Async context is properly available'
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes('requestAsyncStorage')) {
          return {
            status: 'fail',
            message: 'cookies() requires requestAsyncStorage',
            details: 'This is the error we are working around. Use manual cookie handling instead.'
          };
        }
        return {
          status: 'warn',
          message: 'cookies() function failed',
          details: error instanceof Error ? error.message : String(error)
        };
      }
    }

    return {
      status: 'warn',
      message: 'cookies() is not a function',
      details: 'Unexpected state'
    };
  } catch (error) {
    return {
      status: 'fail',
      message: 'Could not load next/headers',
      details: error instanceof Error ? error.message : String(error)
    };
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();

  console.log(`[Diagnostics] Starting diagnostic check at ${timestamp}`);

  const report: DiagnosticReport = {
    timestamp,
    environment: {
      nodeVersion: process.version,
      nextVersion: '13.5.1',
      runtime: 'nodejs',
      env: {}
    },
    request: {
      url: req.url,
      method: req.method,
      headers: {},
      cookies: {}
    },
    authentication: {
      bearerToken: { status: 'fail', message: 'Not checked' },
      jwtDecoding: { status: 'fail', message: 'Not checked' },
      tokenExpiry: { status: 'fail', message: 'Not checked' }
    },
    supabase: {
      connectivity: { status: 'fail', message: 'Not checked' },
      restApi: { status: 'fail', message: 'Not checked' },
      sdkClient: { status: 'fail', message: 'Not checked' }
    },
    nextjs: {
      asyncContext: { status: 'fail', message: 'Not checked' },
      headersFunction: { status: 'fail', message: 'Not checked' },
      cookiesFunction: { status: 'fail', message: 'Not checked' }
    },
    summary: {
      overallStatus: 'failed',
      passedChecks: 0,
      failedChecks: 0,
      warnings: 0
    }
  };

  report.environment.env['NEXT_PUBLIC_SUPABASE_URL'] = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? {
        status: 'pass',
        message: 'Set',
        details: process.env.NEXT_PUBLIC_SUPABASE_URL
      }
    : {
        status: 'fail',
        message: 'Not set'
      };

  report.environment.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? {
        status: 'pass',
        message: 'Set',
        details: `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`
      }
    : {
        status: 'fail',
        message: 'Not set'
      };

  report.environment.env['OPENAI_API_KEY'] = process.env.OPENAI_API_KEY
    ? {
        status: 'pass',
        message: 'Set',
        details: 'Key present'
      }
    : {
        status: 'warn',
        message: 'Not set'
      };

  const authHeader = req.headers.get('authorization');
  report.request.headers['authorization'] = authHeader
    ? {
        status: 'pass',
        message: 'Present',
        details: {
          format: authHeader.startsWith('Bearer ') ? 'Bearer token' : 'Unknown format',
          length: authHeader.length,
          preview: authHeader.substring(0, 30) + '...'
        }
      }
    : {
        status: 'fail',
        message: 'Missing',
        details: 'No authorization header found'
      };

  const allHeaders = Array.from(req.headers.keys());
  report.request.headers['count'] = {
    status: 'pass',
    message: `${allHeaders.length} headers received`,
    details: allHeaders
  };

  const cookies = req.cookies.getAll();
  report.request.cookies['count'] = {
    status: cookies.length > 0 ? 'pass' : 'warn',
    message: `${cookies.length} cookies received`,
    details: cookies.map(c => c.name)
  };

  const authCookie = cookies.find(c =>
    c.name.includes('auth-token') || c.name.includes('sb-') || c.name.startsWith('supabase')
  );
  report.request.cookies['authCookie'] = authCookie
    ? {
        status: 'pass',
        message: 'Auth cookie found',
        details: { name: authCookie.name, valueLength: authCookie.value.length }
      }
    : {
        status: 'warn',
        message: 'No auth cookie found'
      };

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    report.authentication.bearerToken = {
      status: 'pass',
      message: 'Bearer token extracted',
      details: {
        length: token.length,
        preview: `${token.substring(0, 20)}...${token.substring(token.length - 10)}`
      }
    };

    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]));

        report.authentication.jwtDecoding = {
          status: 'pass',
          message: 'JWT decoded successfully',
          details: {
            sub: payload.sub?.substring(0, 10) + '...',
            iss: payload.iss,
            iat: payload.iat ? new Date(payload.iat * 1000).toISOString() : null,
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
            role: payload.role
          }
        };

        if (payload.exp) {
          const expiresIn = payload.exp * 1000 - Date.now();
          const minutesRemaining = Math.round(expiresIn / 1000 / 60);

          report.authentication.tokenExpiry = expiresIn > 0
            ? {
                status: minutesRemaining < 5 ? 'warn' : 'pass',
                message: `Token expires in ${minutesRemaining} minutes`,
                details: { expiresAt: new Date(payload.exp * 1000).toISOString() }
              }
            : {
                status: 'fail',
                message: 'Token has expired',
                details: { expiredAt: new Date(payload.exp * 1000).toISOString() }
              };
        }

        report.supabase.restApi = await testSupabaseRestApi(token);
        report.supabase.sdkClient = await testSupabaseSDK(token);
      } else {
        report.authentication.jwtDecoding = {
          status: 'fail',
          message: 'Invalid JWT format',
          details: `Expected 3 parts, got ${parts.length}`
        };
      }
    } catch (error) {
      report.authentication.jwtDecoding = {
        status: 'fail',
        message: 'Failed to decode JWT',
        details: error instanceof Error ? error.message : String(error)
      };
    }
  } else {
    report.authentication.bearerToken = {
      status: 'fail',
      message: 'No Bearer token in Authorization header',
      details: authHeader ? 'Header present but not Bearer format' : 'Header missing'
    };
  }

  report.supabase.connectivity = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? {
        status: 'pass',
        message: 'Supabase URL configured',
        details: process.env.NEXT_PUBLIC_SUPABASE_URL
      }
    : {
        status: 'fail',
        message: 'Supabase URL not configured'
      };

  report.nextjs.asyncContext = testAsyncContext();
  report.nextjs.headersFunction = testHeadersFunction();
  report.nextjs.cookiesFunction = testCookiesFunction();

  const allResults = [
    ...Object.values(report.environment.env),
    ...Object.values(report.request.headers),
    ...Object.values(report.request.cookies),
    ...Object.values(report.authentication),
    ...Object.values(report.supabase),
    ...Object.values(report.nextjs)
  ];

  report.summary.passedChecks = allResults.filter(r => r.status === 'pass').length;
  report.summary.failedChecks = allResults.filter(r => r.status === 'fail').length;
  report.summary.warnings = allResults.filter(r => r.status === 'warn').length;

  if (report.summary.failedChecks === 0 && report.summary.warnings === 0) {
    report.summary.overallStatus = 'healthy';
  } else if (report.summary.failedChecks === 0) {
    report.summary.overallStatus = 'degraded';
  } else {
    report.summary.overallStatus = 'failed';
  }

  const duration = Date.now() - startTime;

  console.log(`[Diagnostics] Check completed in ${duration}ms`);
  console.log(`[Diagnostics] Overall status: ${report.summary.overallStatus}`);
  console.log(`[Diagnostics] Passed: ${report.summary.passedChecks}, Failed: ${report.summary.failedChecks}, Warnings: ${report.summary.warnings}`);

  return NextResponse.json({
    ...report,
    meta: {
      duration: `${duration}ms`,
      generatedAt: timestamp
    }
  }, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    }
  });
}

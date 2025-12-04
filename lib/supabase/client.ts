'use client';

import { createClient } from '@supabase/supabase-js';

// Use valid placeholder URL that won't throw errors during build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.fake_signature_for_build_purposes_only';

// Check if we have real configuration
const isValidConfig =
  supabaseUrl !== 'https://placeholder.supabase.co' &&
  !supabaseAnonKey.includes('fake_signature');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: isValidConfig,
    persistSession: isValidConfig,
    detectSessionInUrl: isValidConfig,
  },
});

// Helper to check if Supabase is properly configured
export const isSupabaseConfigured = () => isValidConfig;

/*
  # Move pg_trgm Extension to Extensions Schema

  ## Extension Schema Migration
  
  1. Changes
    - Create `extensions` schema if it doesn't exist
    - Move `pg_trgm` extension from `public` schema to `extensions` schema
    - This follows Supabase best practices for extension management
  
  ## Notes
    - The pg_trgm extension is used for trigram-based text search
    - Moving to extensions schema isolates extensions from user tables
    - Resolves security audit warning about extensions in public schema
*/

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move pg_trgm extension to extensions schema
ALTER EXTENSION pg_trgm SET SCHEMA extensions;

/*
  # Fix Security Audit Issues

  ## Security Definer View Issue
  
  1. Changes
    - Drop the `memory_relation_counts` view that has SECURITY DEFINER property
    - This view is not used anywhere in the application code
    - Removes security audit blocker
  
  ## Notes
    - The view was originally created in migration 20251021205730 but is unused
    - Security audit flags SECURITY DEFINER views as potential security risks
*/

-- Drop the security definer view
DROP VIEW IF EXISTS public.memory_relation_counts;

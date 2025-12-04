/*
  # Fix Function Search Paths - Final

  Sets explicit search_path for all custom functions with correct signatures.
  This prevents SQL injection attacks by restricting the search path.
*/

-- Functions with no parameters
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_memory_chunks_last_edited() SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_codex_version() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_temp;
ALTER FUNCTION public.create_default_codex() SET search_path = public, pg_temp;

-- Functions with parameters
ALTER FUNCTION public.get_memory_stats(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.find_memory_by_name_or_alias(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_related_memories(uuid, integer) SET search_path = public, pg_temp;
ALTER FUNCTION public.search_memories(uuid, text, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.get_entry_relationships(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.seed_preset_tags(uuid) SET search_path = public, pg_temp;
ALTER FUNCTION public.increment_tag_use_count(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.decrement_tag_use_count(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.sync_tag_use_counts(uuid) SET search_path = public, pg_temp;
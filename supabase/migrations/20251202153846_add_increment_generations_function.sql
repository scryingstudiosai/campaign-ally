/*
  # Add Increment Generations Function

  Creates a secure function to increment a user's generation count.
  This function can only increment the authenticated user's own count.
*/

CREATE OR REPLACE FUNCTION public.increment_user_generations(user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only allow users to increment their own generation count
  IF auth.uid() != user_id THEN
    RAISE EXCEPTION 'Unauthorized: Cannot increment generations for other users';
  END IF;

  -- Increment the generation count
  UPDATE public.profiles
  SET generations_used = generations_used + 1
  WHERE id = user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_user_generations(uuid) TO authenticated;
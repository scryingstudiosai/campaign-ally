/*
  # Auto-Increment Generations on Memory Insert

  ## Problem
  - API routes weren't reliably calling increment_user_generations
  - Manual calls in 17+ routes is error-prone and hard to maintain
  
  ## Solution
  - Create a database trigger that auto-increments generations_used
  - Trigger fires AFTER each memory_chunks insert
  - Much more reliable than manual RPC calls from application code
  
  ## Implementation
  1. Create trigger function to increment generation count
  2. Attach trigger to memory_chunks table
  3. Only increments if the memory was created by forge (has forge_type)
  
  ## Notes
  - Trigger runs in database context, so auth.uid() is available
  - SECURITY DEFINER allows it to update profiles table
  - Only counts actual generated content (checks for forge_type)
*/

-- Create function to auto-increment generations
CREATE OR REPLACE FUNCTION public.auto_increment_generations()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Only increment if this is a forge-generated item (has forge_type)
  -- This prevents counting manual imports or other non-generated content
  IF NEW.forge_type IS NOT NULL THEN
    -- Get the user_id from the campaign
    UPDATE public.profiles
    SET generations_used = generations_used + 1
    WHERE id = (
      SELECT user_id 
      FROM public.campaigns 
      WHERE id = NEW.campaign_id
      LIMIT 1
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on memory_chunks
DROP TRIGGER IF EXISTS trg_auto_increment_generations ON public.memory_chunks;
CREATE TRIGGER trg_auto_increment_generations
  AFTER INSERT ON public.memory_chunks
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_increment_generations();

-- Grant execute to authenticated users (though SECURITY DEFINER handles permissions)
GRANT EXECUTE ON FUNCTION public.auto_increment_generations() TO authenticated;

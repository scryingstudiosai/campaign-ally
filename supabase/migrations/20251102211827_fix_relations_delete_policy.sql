/*
  # Fix Relations Table DELETE Policy

  ## Problem
  The current RLS policy on the relations table is preventing DELETE operations from working.
  The policy exists but may be causing fetch errors due to complex subquery evaluation.

  ## Solution
  1. Drop the existing "FOR ALL" policy
  2. Create separate, simpler policies for each operation (SELECT, INSERT, DELETE)
  3. Use more efficient policy conditions

  ## Changes
  - DROP existing policy "relations by campaign owner"
  - CREATE new SELECT policy - allows viewing relations in user's campaigns
  - CREATE new INSERT policy - allows creating relations in user's campaigns  
  - CREATE new DELETE policy - allows deleting relations in user's campaigns

  ## Security
  All policies verify that the relation's campaign_id matches a campaign owned by the authenticated user
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "relations by campaign owner" ON public.relations;

-- Create separate policies for better performance and clarity

-- SELECT policy: View relations in owned campaigns
CREATE POLICY "Users can view relations in their campaigns"
  ON public.relations
  FOR SELECT
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = auth.uid()
    )
  );

-- INSERT policy: Create relations in owned campaigns
CREATE POLICY "Users can create relations in their campaigns"
  ON public.relations
  FOR INSERT
  TO authenticated
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = auth.uid()
    )
  );

-- DELETE policy: Delete relations in owned campaigns
CREATE POLICY "Users can delete relations in their campaigns"
  ON public.relations
  FOR DELETE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = auth.uid()
    )
  );

-- UPDATE policy: Update relations in owned campaigns (for future use)
CREATE POLICY "Users can update relations in their campaigns"
  ON public.relations
  FOR UPDATE
  TO authenticated
  USING (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    campaign_id IN (
      SELECT id FROM public.campaigns WHERE user_id = auth.uid()
    )
  );

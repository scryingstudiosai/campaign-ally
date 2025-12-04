import { supabase } from '@/lib/supabase/client';

const GENERATION_LIMIT = 50;

export interface GenerationLimitCheck {
  allowed: boolean;
  used: number;
  limit: number;
  resetDate?: Date;
}

/**
 * Checks if the reset date indicates we're in a new month
 */
function shouldResetForNewMonth(resetDate: string | null): boolean {
  if (!resetDate) return false;

  const reset = new Date(resetDate);
  const now = new Date();

  // Check if year is different or if same year but different month
  return (
    reset.getFullYear() < now.getFullYear() ||
    (reset.getFullYear() === now.getFullYear() && reset.getMonth() < now.getMonth())
  );
}

/**
 * Checks if a user has remaining generations available
 * @param userId - The user's UUID
 * @returns Object with allowed status, current usage, and limit
 */
export async function checkGenerationLimit(userId: string): Promise<GenerationLimitCheck> {

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('generations_used, generation_reset_date')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking generation limit:', error);
    // On error, deny to be safe
    return {
      allowed: false,
      used: GENERATION_LIMIT,
      limit: GENERATION_LIMIT,
    };
  }

  if (!profile) {
    console.error('Profile not found for user:', userId);
    return {
      allowed: false,
      used: GENERATION_LIMIT,
      limit: GENERATION_LIMIT,
    };
  }

  // Check if we need to reset for a new month
  let used = profile.generations_used || 0;
  if (shouldResetForNewMonth(profile.generation_reset_date)) {
    // If we're in a new month, the count should be considered as 0
    // The actual reset will happen on the next increment
    used = 0;
  }

  const allowed = used < GENERATION_LIMIT;

  return {
    allowed,
    used,
    limit: GENERATION_LIMIT,
    resetDate: profile.generation_reset_date ? new Date(profile.generation_reset_date) : undefined,
  };
}

/**
 * Increments the generation count for a user
 * Should only be called AFTER a successful forge save
 * @param userId - The user's UUID
 * @returns Success status
 */
export async function incrementGeneration(userId: string): Promise<boolean> {

  const { error } = await supabase.rpc('increment_user_generations', {
    user_id: userId,
  });

  if (error) {
    console.error('Error incrementing generation count:', error);
    return false;
  }

  return true;
}

/**
 * Gets the current generation usage for a user
 * @param userId - The user's UUID
 * @returns Current usage and limit
 */
export async function getGenerationUsage(userId: string): Promise<{ used: number; limit: number }> {

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('generations_used, generation_reset_date')
    .eq('id', userId)
    .maybeSingle();

  if (error || !profile) {
    return { used: 0, limit: GENERATION_LIMIT };
  }

  // Check if we need to reset for a new month
  let used = profile.generations_used || 0;
  if (shouldResetForNewMonth(profile.generation_reset_date)) {
    used = 0;
  }

  return {
    used,
    limit: GENERATION_LIMIT,
  };
}

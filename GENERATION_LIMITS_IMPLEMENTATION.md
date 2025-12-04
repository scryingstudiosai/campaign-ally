# Generation Limits Implementation

## Summary

A generation limit system has been implemented to track and limit AI generations to 50 per user.

## Completed

### 1. Database Schema
- ✅ Added `generations_used` column to `profiles` table (default: 0)
- ✅ Created `increment_user_generations(user_id)` database function
  - Secure function that only allows users to increment their own count
  - Uses SECURITY DEFINER with proper auth check

### 2. Core Helper Functions
- ✅ Created `/lib/generation-limits.ts` with:
  - `checkGenerationLimit(userId)` - Returns { allowed, used, limit }
  - `incrementGeneration(userId)` - Increments count after successful save
  - `getGenerationUsage(userId)` - Gets current usage stats

### 3. React Hook
- ✅ Created `/hooks/useGenerationLimit.ts`
  - Provides `checkLimit()` - Call before generation
  - Provides `incrementCount()` - Call after successful save
  - Manages modal state automatically

### 4. UI Components
- ✅ Created `/components/forge/GenerationLimitModal.tsx`
  - Shows when user hits limit
  - Displays current usage and limit

### 5. Example Implementation
- ✅ Updated `NPCForgeDialog.tsx` as reference implementation
  - Checks limit before `handleGenerate()`
  - Increments count after successful `handleSave()`
  - Shows modal when limit reached

## Remaining Work

### Apply to Remaining Forge Dialogs (24 files)

Each of the following files needs the same 4 changes as NPCForgeDialog:

1. **Add imports:**
```typescript
import { useGenerationLimit } from '@/hooks/useGenerationLimit';
import { GenerationLimitModal } from './GenerationLimitModal';
```

2. **Add hook in component:**
```typescript
const { checkLimit, incrementCount, limitModalOpen, setLimitModalOpen, limitInfo } = useGenerationLimit();
```

3. **Check limit at start of handleGenerate:**
```typescript
const handleGenerate = async (params) => {
  // Add these lines at the very start
  const allowed = await checkLimit();
  if (!allowed) {
    return;
  }

  // ... rest of generation logic
};
```

4. **Increment count after successful save:**
```typescript
const handleSave = async () => {
  // ... save logic ...

  toast({
    title: 'Saved to memory',
    description: '...',
  });

  // Add this line after successful save, before closing dialog
  await incrementCount();

  onOpenChange(false);
};
```

5. **Add modal to JSX (before closing `</Dialog>`):**
```tsx
<GenerationLimitModal
  open={limitModalOpen}
  onOpenChange={setLimitModalOpen}
  used={limitInfo.used}
  limit={limitInfo.limit}
/>
```

### Files to Update:

- [ ] BackstoryForgeDialog.tsx
- [ ] EncounterForgeDialog.tsx
- [ ] ForgeDialog.tsx (if it generates)
- [ ] GuildForgeDialog.tsx
- [ ] HeroForgeDialog.tsx
- [ ] HookForgeDialog.tsx
- [ ] InnForgeDialog.tsx
- [ ] ItemForgeDialog.tsx
- [ ] LandmarkForgeDialog.tsx
- [ ] MonsterForgeDialog.tsx
- [ ] NameForgeDialog.tsx
- [ ] NationForgeDialog.tsx
- [ ] OdditiesForgeDialog.tsx
- [ ] PuzzleForgeDialog.tsx
- [ ] RandomTableForgeDialog.tsx
- [ ] ScrollForgeDialog.tsx
- [ ] ShopForgeDialog.tsx
- [ ] TacticalEncounterForge.tsx
- [ ] TavernForgeDialog.tsx
- [ ] TownForgeDialog.tsx
- [ ] TrapForgeDialog.tsx
- [ ] VillainForgeDialog.tsx
- [ ] WeatherForgeDialog.tsx
- [ ] WildMagicForgeDialog.tsx

### Special Cases

Some forges may have different patterns:
- **Tactical Encounter Forge** - May have multiple generation steps
- **Random Table Forge** - May not save to memory
- **Wild Magic Forge** - May not save to memory

For forges that don't save to memory (just generate and copy), you should:
1. Still check the limit before generation
2. Increment immediately after generation (not on save)

## Testing

After updating all forge dialogs, test:
1. Generate 50 items across different forges
2. Verify modal appears on 51st attempt
3. Verify count persists across sessions
4. Verify regenerate doesn't count (only save counts)

## Future Enhancements

Consider adding:
- Admin panel to view/modify user limits
- Monthly reset functionality
- Usage analytics dashboard
- Different tier limits (free: 50, premium: unlimited)

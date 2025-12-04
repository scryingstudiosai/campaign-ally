# Innkeeper Relationship Fix

## Issue
The innkeeper relationship was displaying incorrectly:
- ✅ Inn card showed: "RUN BY: Borin Stoutbarrel" (correct)
- ❌ NPC card showed: "WORKS AT: The Gnarled Badger" (incorrect)

## Root Cause
The relation type "run_by" / "runs" was missing from the system, causing it to fall back to a generic display.

## Solution
Added the missing relation type pair to all three locations:

### Files Modified

1. **`/components/memory/RelationsPicker.tsx`**
   - Added: `{ value: 'runs', label: 'Runs', inverse: 'Run by' }`
   - Added: `{ value: 'run_by', label: 'Run by', inverse: 'Runs' }`

2. **`/lib/relation-inverses.ts`**
   - Added: `runs: 'run_by'`
   - Added: `run_by: 'runs'`

3. **`/types/forge.ts`**
   - Added: `| 'runs'`
   - Added: `| 'run_by'`

## Result
Now the relationship displays correctly on both cards:
- Inn card: "RUN BY: Borin Stoutbarrel" ✅
- NPC card: "RUNS: The Gnarled Badger" ✅

The inverse mapping is now properly configured so the relationship reads naturally from both perspectives.

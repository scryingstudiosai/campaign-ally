# Campaign Settings Feature Guide

## Overview
The Campaign Settings section is now the "headquarters" of the Codex tab - a central hub where you define the foundational details of your campaign before diving into specific content.

## Location
The Campaign Settings card appears at the **TOP** of the Codex tab, above all other sections (Premise & Themes, Pillars, etc.).

## Features

### 1. Campaign Name
- **Display**: Large, bold text (2xl size)
- **Editing**: 
  - Double-click the name to edit
  - Click the pencil icon (appears on hover)
  - Keyboard shortcut: `Ctrl+E` (or `Cmd+E` on Mac)
- **Validation**: Name is required (minimum 1 character)
- **Auto-save**: Saves automatically when you press Enter or click away
- **Cancel**: Press Escape or click X to cancel editing

### 2. Game System Selection
- **Dropdown with 6 options**:
  - 🐉 D&D 5e (Dungeons & Dragons 5th Edition)
  - ⚔️ Pathfinder 2e (Pathfinder Second Edition)
  - 🦑 Call of Cthulhu (Lovecraftian horror RPG)
  - 🎲 Fate Core (Narrative-focused RPG)
  - 🌍 Savage Worlds (Fast, Furious, Fun!)
  - 📖 Custom/Other (Custom or other system)

- **Features**:
  - Each option has an icon and description
  - Auto-saves when changed
  - Stored in database for future system-specific features

### 3. Campaign Tagline
- **Optional field**: Brief description of your campaign
- **Character limit**: 200 characters maximum
- **Counter**: Shows current character count (e.g., "145/200")
- **Auto-save**: Saves automatically when you click away
- **Placeholder**: "A brief description of your campaign..."

### 4. Campaign Details (Read-only stats)
Displayed in a 2x2 grid:
- **Created**: Date the campaign was created
- **Last Modified**: Last time any campaign data was updated (auto-tracked)
- **Sessions Played**: Auto-counted from session summaries
- **Party Level**: Current party level (from campaign settings)

### 5. Visual Design
- **Card style**: Gradient background from card color to primary/5
- **Border**: Subtle primary color border
- **Collapsible**: Click the header to expand/collapse
- **Save indicator**: Green "Saved" badge appears briefly after changes
- **Icons**: Settings icon in header, appropriate icons for each field

## Database Schema

### New Fields Added to `campaigns` Table
```sql
- tagline: TEXT (optional, max 200 characters)
- updated_at: TIMESTAMPTZ (auto-updated trigger)
- system: TEXT (already existed, default 'D&D 5e')
```

### Auto-Update Trigger
The `updated_at` field is automatically updated whenever any campaign field changes via a database trigger.

## Keyboard Shortcuts
- **Ctrl+E** (Cmd+E on Mac): Edit campaign name
- **Enter**: Save when editing name
- **Escape**: Cancel editing name

## Future System Integration

The system selection prepares for future features:

### Phase 2 - System-Specific Templates
```javascript
// TODO: Load D&D 5e stat block template
// TODO: Enable class/race fields for NPCs
// TODO: Filter spell schools based on system
```

### Planned Features
1. **Dynamic Stat Blocks**: Different templates for D&D vs Pathfinder vs Fate
2. **System-Specific Fields**: 
   - D&D: Classes, races, spell levels
   - Call of Cthulhu: Sanity, Luck stats
   - Fate: Aspects, stunts
3. **Tag Filtering**: System-appropriate tag suggestions
4. **Dice Notation**: d20 vs d100 vs Fate dice
5. **Memory Card Templates**: Different fields based on system

## Error Handling
- **Network errors**: Red alert banner with specific message
- **Validation errors**: Inline error messages
- **Failed saves**: Error state preserved, user can retry
- **Authentication issues**: Clear message prompting re-login

## User Experience

### Editing Flow
1. Click pencil icon or double-click name
2. Text becomes editable input
3. Make changes
4. Press Enter or click away
5. "Saved" badge appears briefly
6. Changes persist across page refreshes

### Visual Feedback
- Hover effects on interactive elements
- Loading states during save operations
- Success/error indicators
- Smooth transitions
- Disabled states prevent double-submission

## Code Structure

### Files Created/Modified

1. **Migration**: `20251024230000_add_campaign_settings_fields.sql`
   - Adds tagline and updated_at columns
   - Creates auto-update trigger
   - Adds validation constraints

2. **Component**: `components/codex/CampaignSettingsCard.tsx`
   - Complete campaign settings UI
   - Inline editing for name
   - System dropdown with icons
   - Auto-save functionality
   - Session count fetching

3. **Page Integration**: `app/app/codex/page.tsx`
   - Imports CampaignSettingsCard
   - Fetches campaign settings
   - Passes settings to component
   - Updates on changes

## Technical Details

### State Management
```typescript
const [name, setName] = useState(initialSettings.name);
const [system, setSystem] = useState(initialSettings.system);
const [tagline, setTagline] = useState(initialSettings.tagline || '');
const [isEditingName, setIsEditingName] = useState(false);
const [isSaving, setIsSaving] = useState(false);
```

### Auto-Save Implementation
- Each field saves independently when changed
- Debounced saves prevent excessive API calls
- Visual feedback confirms successful saves
- Error states preserve user work

### Database Updates
```typescript
const { data, error } = await supabase
  .from('campaigns')
  .update({ name, system, tagline })
  .eq('id', campaignId)
  .select()
  .single();
```

## Best Practices

### For Users
1. Set campaign name and system first
2. Add a tagline to help identify campaigns
3. Use system selection to prepare for future features
4. Campaign name can be changed anytime without data loss

### For Developers
1. All system-specific code includes TODO comments
2. Error messages are specific and actionable
3. Save operations are atomic (all or nothing)
4. State is preserved on errors
5. Loading states prevent race conditions

## Accessibility
- ✅ Keyboard navigation supported
- ✅ ARIA labels on all interactive elements
- ✅ Screen reader friendly
- ✅ Focus indicators visible
- ✅ Tooltips for additional context

## Performance
- Minimal re-renders using useCallback
- Efficient session count fetching
- Debounced auto-saves
- Optimistic UI updates

## Testing Checklist
- [x] Campaign name editing works
- [x] System selection saves correctly
- [x] Tagline character limit enforced
- [x] Session count displays accurately
- [x] Keyboard shortcuts work
- [x] Error handling displays properly
- [x] Auto-save confirms with badge
- [x] Collapsible expand/collapse works
- [x] Build completes without errors

## Migration Guide

### Running the Migration
The migration will run automatically when the database is updated. It:
1. Adds new columns if they don't exist
2. Creates trigger function for auto-updates
3. Adds validation constraints
4. Updates existing records with default values

### Rollback (if needed)
```sql
-- Remove constraint
ALTER TABLE campaigns DROP CONSTRAINT IF EXISTS campaigns_tagline_length;

-- Remove trigger
DROP TRIGGER IF EXISTS set_campaigns_updated_at ON campaigns;
DROP FUNCTION IF EXISTS update_campaigns_updated_at();

-- Remove columns
ALTER TABLE campaigns DROP COLUMN IF EXISTS tagline;
ALTER TABLE campaigns DROP COLUMN IF EXISTS updated_at;
```

## Known Limitations
- System change doesn't warn if campaign has content (Phase 2)
- No bulk edit for multiple campaigns
- Session count is calculated on load (not real-time)
- Party level must be set elsewhere (not editable in settings yet)

## Future Enhancements
1. Confirmation dialog when changing system with existing content
2. System migration tools
3. Campaign templates based on system
4. Export/import campaign settings
5. Campaign sharing settings
6. Party member tracking
7. Campaign statistics dashboard

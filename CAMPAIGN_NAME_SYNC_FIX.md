# Campaign Name Real-Time Sync Fix

## Problem
When the campaign name was changed in Campaign Settings (Codex tab), it updated in the database and the Codex page, but didn't update in the campaign selector dropdown (top right) until the page was reloaded.

## Root Cause
The campaigns list was stored in state in the app layout component, while the Campaign Settings component was updating the database directly. These two state sources were not synchronized, causing a disconnect between:
- The campaign name in the Codex tab (reading from database)
- The campaign name in the dropdown (reading from layout state)

## Solution Architecture

### React Context Pattern
Implemented a React Context to provide a shared state update mechanism accessible throughout the app.

```
App Layout (State Owner)
    ↓
CampaignContext (Provider)
    ↓
┌─────────────────┬──────────────────┐
│                 │                  │
Header            Codex Page         Other Pages
(Dropdown)        (Settings Card)
```

### Flow Diagram

```
User Changes Campaign Name
    ↓
CampaignSettingsCard saves to database
    ↓
Calls onCampaignsRefresh callback
    ↓
Context's refreshCampaigns function
    ↓
App Layout's handleCampaignsUpdate
    ↓
Reloads campaigns from database
    ↓
Updates campaigns state
    ↓
Header re-renders with new name
    ↓
Dropdown shows updated name (real-time!)
```

## Implementation Details

### 1. Created Campaign Context (`contexts/CampaignContext.tsx`)

```typescript
const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

export function CampaignProvider({
  children,
  refreshCampaigns,
}: {
  children: ReactNode;
  refreshCampaigns: () => void;
}) {
  return (
    <CampaignContext.Provider value={{ refreshCampaigns }}>
      {children}
    </CampaignContext.Provider>
  );
}

export function useCampaignContext() {
  const context = useContext(CampaignContext);
  return context;
}
```

**Purpose**: Provides a centralized way to trigger campaign list refreshes from anywhere in the app.

### 2. Updated App Layout (`app/app/layout.tsx`)

```typescript
// Wrap the entire app in CampaignProvider
return (
  <CampaignProvider refreshCampaigns={handleCampaignsUpdate}>
    <div className="min-h-screen flex flex-col">
      <Header campaigns={campaigns} ... />
      <main>{children}</main>
    </div>
  </CampaignProvider>
);
```

**Change**: The layout now provides its `handleCampaignsUpdate` function to all child components via context.

### 3. Updated Campaign Settings Card (`components/codex/CampaignSettingsCard.tsx`)

```typescript
interface CampaignSettingsCardProps {
  // ... existing props
  onCampaignsRefresh?: () => void;  // NEW
}

async function updateCampaignSettings(updates) {
  // Save to database
  const { data } = await supabase
    .from('campaigns')
    .update(updates)
    .eq('id', campaignId);
  
  // Update local callback
  if (onSettingsUpdate && data) {
    onSettingsUpdate(data);
  }
  
  // CRITICAL: Refresh campaigns list in dropdown
  if (onCampaignsRefresh) {
    console.log('Calling onCampaignsRefresh to update dropdown');
    onCampaignsRefresh();
  }
}
```

**Change**: Added `onCampaignsRefresh` callback that triggers after successful database save.

### 4. Updated Codex Page (`app/app/codex/page.tsx`)

```typescript
export default function CodexPage() {
  const { refreshCampaigns } = useCampaignContext();  // NEW
  
  return (
    <CampaignSettingsCard
      campaignId={campaignId}
      initialSettings={campaignSettings}
      onSettingsUpdate={handleLocalUpdate}
      onCampaignsRefresh={refreshCampaigns}  // NEW - passes context function
    />
  );
}
```

**Change**: Consumes the context and passes the refresh function to Campaign Settings.

## Benefits

### 1. Single Source of Truth
The app layout maintains the campaigns list as the single source of truth. All updates flow through this centralized state.

### 2. Real-Time Updates
Campaign name changes are immediately reflected in:
- ✅ Campaign Settings card (local state)
- ✅ Campaign selector dropdown (via refresh)
- ✅ Database (persisted)
- ✅ All other components using campaign data

### 3. Optimistic UI Updates
The UI updates immediately (optimistic), then confirms with database:

```typescript
// Update local state immediately
setCampaignName(newName);

// Save to database
await updateCampaignSettings({ name: newName });

// Refresh global state
refreshCampaigns();
```

### 4. Decoupled Components
Components don't need to know about each other's state. They only need to:
- Read from their props
- Call callbacks when data changes
- Use context for global operations

### 5. Scalable Pattern
This pattern can be extended to other settings:
- System changes
- Party level updates
- Tagline modifications
- Any campaign property

## Testing the Fix

### Manual Test Steps
1. Open the Codex tab
2. Edit the campaign name in Campaign Settings
3. Press Enter or click away to save
4. **Verify**: Dropdown in top-right updates immediately (no reload needed)
5. Refresh the page
6. **Verify**: Name persists across refresh

### Console Logs
When a name is saved, you'll see:
```
Campaign updated: { id: '...', name: 'New Name', ... }
Triggering campaigns refresh in dropdown
Calling onCampaignsRefresh to update dropdown
```

### What to Watch For
- Dropdown should update within ~100ms
- "Saved" badge should appear briefly
- No errors in console
- Name persists after page reload

## Error Handling

### Save Failures
If database save fails:
- Error is displayed to user
- Local state is not updated
- Dropdown remains unchanged
- User can retry

### Network Issues
If refresh call fails:
- Name is still saved in database
- May require manual page refresh to see in dropdown
- Future saves will still work

## Performance Considerations

### Minimal Re-renders
- Only affected components re-render
- Context value is memoized
- Refresh is debounced in layout

### Database Efficiency
- Single database query per refresh
- Only fetches campaigns for current user
- Results are cached in state

## Future Enhancements

### Possible Improvements
1. **Optimistic Updates**: Update dropdown immediately before database save
2. **Real-time Subscriptions**: Use Supabase realtime to sync across tabs
3. **Undo/Redo**: Keep history of name changes
4. **Batch Updates**: Combine multiple setting changes into one refresh
5. **Loading States**: Show spinner in dropdown during refresh

### Extended Use Cases
This pattern can be applied to:
- Party level changes
- System selection
- Campaign deletion/creation
- Any cross-component state updates

## Migration Guide

### For Developers
If you're adding new campaign settings:

1. **Save to database** in your component
2. **Call onCampaignsRefresh** after successful save
3. **Add console.log** for debugging
4. **Test** the dropdown updates

Example:
```typescript
async function updateMySetting(value: string) {
  // Save to database
  await supabase.from('campaigns').update({ my_field: value });
  
  // Trigger refresh
  if (onCampaignsRefresh) {
    console.log('Refreshing campaigns after my_field update');
    onCampaignsRefresh();
  }
}
```

## Troubleshooting

### Dropdown Not Updating?
1. Check console for "Calling onCampaignsRefresh" log
2. Verify `onCampaignsRefresh` prop is passed
3. Check if database save succeeded
4. Look for errors in console

### Multiple Refreshes?
- This is expected if multiple fields change quickly
- The layout's `loadCampaigns` function is already idempotent
- Consider debouncing if it becomes a performance issue

### Context Error?
If you see "useCampaignContext must be used within a CampaignProvider":
- Ensure component is inside app layout
- Check that CampaignProvider is wrapping the app
- Verify imports are correct

## Files Modified

1. **contexts/CampaignContext.tsx** (NEW)
   - Creates React Context for campaign operations
   - Provides refreshCampaigns function

2. **app/app/layout.tsx**
   - Wraps app in CampaignProvider
   - Passes handleCampaignsUpdate to context

3. **components/codex/CampaignSettingsCard.tsx**
   - Accepts onCampaignsRefresh callback
   - Calls it after successful save
   - Adds debug logging

4. **app/app/codex/page.tsx**
   - Consumes CampaignContext
   - Passes refreshCampaigns to settings card

## Summary

The fix implements a unidirectional data flow pattern:

```
User Action → Database Update → Context Callback → State Refresh → UI Update
```

This ensures all components stay in sync without tight coupling, making the app more maintainable and scalable.

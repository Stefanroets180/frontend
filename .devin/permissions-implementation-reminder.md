# Permissions Implementation Reminder

## Context
When implementing "Organization settings > Permissions > Manage what each role can access and do in your organization", the current hardcoded permission logic needs to be replaced with dynamic permission checks from the backend.

## Current Hardcoded Permission Logic

### Vehicles Page (`app/(dashboard)/dashboard/vehicles/page.tsx`)
Currently hardcoded to allow access without checking the `permissions` object:

```tsx
// Check if user has permission to view vehicles - SUPER_ADMIN always has access
const canViewVehicles = user?.role === "SUPER_ADMIN" ||
                       user?.role === "ADMIN" ||
                       user?.role === "MANAGER" ||
                       (user?.role === "ASSISTANT" && user?.assistantRole === "ASSISTANT_HIGH") ||
                       (user?.role === "DRIVER");

// Check if user has permission to add vehicles
const canAddVehicle = user?.role === "SUPER_ADMIN" ||
                     user?.role === "ADMIN" ||
                     user?.role === "MANAGER" ||
                     (user?.role === "ASSISTANT" && user?.assistantRole === "ASSISTANT_HIGH");
```

### Why This Was Done
The `permissions` object from the `usePermissions` hook was causing React error #310 (infinite re-render loop) because:
1. The object reference was changing on every render
2. It was used in `useEffect` dependency arrays
3. This caused the effect to re-run infinitely

### Temporary Fix Applied
1. Removed `permissions` from the permission check logic
2. Hardcoded role-based access
3. Removed `permissions` from `useEffect` dependency arrays
4. Wrapped fetch functions with `useCallback` to prevent re-creation

## What Needs to Be Done When Implementing Proper Permissions

### 1. Fix the Root Cause in `usePermissions` Hook
The `usePermissions` hook already has `useMemo` to stabilize the reference, but this may not be sufficient. Consider:
- Using a more stable reference mechanism
- Ensuring the permissions object structure doesn't change on every render
- Using a selector pattern to extract specific permissions

### 2. Revert Hardcoded Logic
Replace hardcoded role checks with dynamic permission checks:
```tsx
// Current (hardcoded)
const canViewVehicles = user?.role === "SUPER_ADMIN" || ...;

// Should be (dynamic)
const canViewVehicles = permissions?.["VEHICLE_ASSIGNMENT"]?.["VIEW_VEHICLES"] ||
                       permissions?.["VEHICLE_ASSIGNMENT"]?.["ASSIGN_VEHICLES"] ||
                       permissions?.["VEHICLE_ASSIGNMENT"]?.["UNASSIGN_VEHICLES"];
```

### 3. Add SUPER_ADMIN Bypass
SUPER_ADMIN should bypass all permission checks, but this should be done at the permission check level, not hardcoded:
```tsx
const canViewVehicles = user?.role === "SUPER_ADMIN" || 
                       permissions?.["VEHICLE_ASSIGNMENT"]?.["VIEW_VEHICLES"];
```

### 4. Test All Pages Affected
The following pages were affected by the permissions object instability:
- `app/(dashboard)/dashboard/vehicles/page.tsx`
- `app/(dashboard)/dashboard/organization/page.tsx`
- `app/(dashboard)/dashboard/settings/page.tsx`
- `app/(dashboard)/dashboard/page.tsx` (main dashboard)
- `app/(dashboard)/dashboard/logbook/page.tsx`
- `app/(dashboard)/dashboard/profile/page.tsx`

### 5. Verify useEffect Dependencies
Ensure that when `permissions` is re-added to dependency arrays:
- The reference is stable (useMemo is working correctly)
- The effect doesn't cause infinite re-renders
- Test with different user roles and permission configurations

## Key Files to Review

### `hooks/usePermissions.ts`
- Contains the `useMemo` fix for stabilizing permissions
- May need additional optimization for the permissions object structure

### `app/(dashboard)/dashboard/vehicles/page.tsx`
- Main file affected by React error #310
- Has hardcoded permission logic that needs to be reverted
- Uses `useCallback` for fetch functions (keep this)

### Other Dashboard Pages
- Check for similar hardcoded permission logic
- Ensure consistent permission checking pattern across all pages

## Testing Checklist
- [ ] Test vehicles page refresh with SUPER_ADMIN
- [ ] Test vehicles page refresh with ADMIN
- [ ] Test vehicles page refresh with MANAGER
- [ ] Test vehicles page refresh with DRIVER
- [ ] Test vehicles page refresh with ASSISTANT
- [ ] Test vehicles page refresh with RENTAL_CUSTOMER
- [ ] Test in both fleet and solo modes
- [ ] Verify no React error #310 in console
- [ ] Verify permission checks work correctly
- [ ] Verify SUPER_ADMIN bypass works correctly

## Notes
- The `usePermissions` hook uses `@tanstack/react-query` for fetching permissions
- Permissions are fetched per organization (`orgId`)
- The permissions object structure is nested: `permissions[permissionType][permissionKey]`
- SUPER_ADMIN should have access to everything regardless of permissions

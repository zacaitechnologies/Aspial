# Role Debugging Guide

## Issue Summary
You've set a user to "operation-user" role, but when they log in:
1. They can still see all pages (should be restricted)
2. The greeting shows "Hi Admin" instead of their actual role

## What I've Fixed

### 1. **Projects Page Greeting** (`src/app/(main)/projects/components/ProjectsClient.tsx`)
   - **Before**: Always showed "Hi, Admin" for any user with admin/full access
   - **After**: Shows staff role if available, otherwise shows system role (Brand Advisor, Operation User, Admin, Staff)
   - **Priority**: Staff Role > System Role
   - **Added**: Fetch user's system role from the database and display it properly

### 2. **Enhanced Debug Page** (`/debug-role`)
   - Added **two sections**:
     1. **Cached Role Status**: Shows what the cached permission checks return (may be stale)
     2. **Raw Database Query**: Shows DIRECT database lookup (not cached) with detailed info
   - Added **cache control buttons**:
     - "Clear My Cache": Clears cache for your user only
     - "Clear All Caches": Clears all user role caches (useful for testing)
     - "Refresh": Reloads the page
   - Shows **exactly what's in the database**:
     - User ID (Public DB)
     - Supabase ID
     - Staff Role (if any)
     - System Roles from `userRoles` table
     - All role slugs

### 3. **User Management Changes**
   - Removed "admin" role from all dropdowns
   - Default role for new users: "brand-advisor" (instead of "staff")
   - Cannot create new admin accounts
   - Cannot edit existing admin accounts' roles (dropdown disabled with warning)

### 4. **New Debug Actions** (`src/app/(main)/actions/admin-actions.ts`)
   - `debugGetUserRoles(userId)`: Gets raw database data without cache
   - `clearUserCache(userId)`: Clears cache for specific user
   - `clearAllCaches()`: Clears all user caches

## How to Diagnose the Issue

### Step 1: Check the Debug Page
1. Have the operation-user log in
2. Navigate to: `/debug-role`
3. Look at **both sections**:

#### Section 1: Cached Role Status
```
✓ or ✗ Admin
✓ or ✗ Brand Advisor  
✓ or ✗ Operation User
Primary Role: [operation-user | admin | brand-advisor | staff]
```

#### Section 2: Raw Database Query
**This is the KEY section!**
```
Found By: supabase_id | id
User ID (Public DB): [UUID]
Supabase ID: [UUID]
System Roles (userRoles table):
  - Slug: operation-user (or whatever is in DB)
Role Slugs: [operation-user] (or empty if no roles!)
```

### Step 2: Identify the Problem

#### Problem A: No Roles in Database
If "Raw Database Query" shows:
```
⚠️ NO ROLES ASSIGNED IN DATABASE!
Role Slugs: [No roles]
```
**Solution**: The user doesn't have a role in the `userRoles` table. You need to:
1. Go to User Management page
2. Edit the user
3. Select "Operation User" from the dropdown
4. Save

#### Problem B: Wrong Role in Database
If "Raw Database Query" shows:
```
System Roles: admin (or brand-advisor)
```
But you expected "operation-user":
**Solution**: 
1. Go to User Management page
2. Edit the user
3. Change the role to "Operation User"
4. Save

#### Problem C: Correct Role but Cached as Wrong
If "Raw Database Query" shows:
```
System Roles: operation-user ✓
Role Slugs: [operation-user] ✓
```
But "Cached Role Status" shows:
```
✓ Admin (incorrect!)
Primary Role: admin (incorrect!)
```
**Solution**: Cache issue!
1. Click "Clear My Cache" button on debug page
2. OR log out and log back in (which clears cache automatically)
3. OR go to `/clear-cache` page (admin only)

### Step 3: Verify the Fix
After fixing:
1. Clear cache or log out/in
2. Go back to `/debug-role`
3. Both sections should now match and show "operation-user"
4. Check the sidebar - restricted pages should be hidden:
   - ❌ Should NOT see: Clients, Services, Payments (Quotations/Invoices/Receipts), User Management
   - ✓ Should see: Projects, Appointment Bookings, Time Tracking, Calendar, Benefits
5. Go to `/projects` - greeting should show:
   - "Hi, [FirstName], our [Staff Role Name]!" (if staff role exists)
   - OR "Hi, [FirstName], our Operation User!" (if no staff role)

## Common Mistakes

### Mistake 1: Confusing User IDs
- **Supabase Auth ID**: The UUID from Supabase Auth (this is `enhancedUser.id`)
- **Public User Table ID**: The UUID from the `public.user` table (different!)
- The system uses **Supabase Auth ID** for role checks

### Mistake 2: Not Clearing Cache
- Role cache lasts for **30 seconds** (was 5 minutes)
- Logout clears cache automatically
- Manual cache clear: Use debug page buttons or `/clear-cache`

### Mistake 3: No Role Assigned in userRoles Table
- Just creating a user doesn't automatically assign a role
- You must explicitly select a role in User Management and save

## Technical Details

### How Role Checks Work
1. Client component calls `checkIsOperationUser(enhancedUser.id)`
2. This calls `getCachedIsUserOperationUser(userId)` in `src/lib/admin-cache.ts`
3. If cache is fresh (< 30 seconds), return cached value
4. Otherwise, call `isUserOperationUser(userSupabaseId)` in `src/app/(main)/projects/permissions.ts`
5. This queries: `prisma.user.findUnique({ where: { supabase_id: userSupabaseId }, include: { userRoles: { include: { role: true } } } })`
6. Checks if any role has `slug === "operation-user"`

### Cache Clearing Points
- **Logout**: `signout()` in `src/lib/auth-actions.ts` calls `clearAllAdminCache()`
- **Role Update**: `updateUserAccount()` in `src/app/(main)/user-management/action.ts` calls `clearAdminCache(userId)`
- **Manual**: Debug page buttons or `/clear-cache` page

## Files Modified

1. `src/app/(main)/projects/components/ProjectsClient.tsx` - Fixed greeting
2. `src/app/(main)/debug-role/page.tsx` - Enhanced debug page
3. `src/app/(main)/actions/admin-actions.ts` - Added debug actions
4. `src/app/(main)/user-management/page.tsx` - Removed admin from dropdowns, changed default to brand-advisor

## Next Steps

1. **Test**: Have the operation-user log in and visit `/debug-role`
2. **Check**: Look at both sections to see cached vs. database values
3. **Fix**: Based on what you see in the debug page:
   - If no roles in DB → Assign role in User Management
   - If wrong role in DB → Edit user in User Management
   - If cache issue → Clear cache using debug page buttons
4. **Verify**: After fix, check sidebar and greeting

---

**Need More Help?**
Share a screenshot of the `/debug-role` page (both sections) and I can tell you exactly what the issue is!


# Role-Based Access Control - Security Implementation

## Overview
This document describes the security measures implemented to prevent data leakage between user roles, specifically for the `operation-user` role.

## Security Measures

### 1. Server-Side Page Protection
All sensitive pages are protected at the server level:

- **Clients** (`/clients`) - Blocked for operation-user
- **Services** (`/services`) - Blocked for operation-user  
- **Quotations** (`/quotations`) - Blocked for operation-user
- **Invoices** (`/invoices`) - Blocked for operation-user
- **Receipts** (`/receipts`) - Blocked for operation-user
- **User Management** (`/user-management`) - Admin only

Each page checks the user's role and returns `<AccessDenied />` if unauthorized.

### 2. Client-Side UI Filtering
The sidebar (`AppSidebar.tsx`) filters navigation items based on role:
- Operation users only see: Projects, Appointment Bookings, Time Tracking, Calendar, Benefits
- Hidden items: Clients, Services, Payments section

### 3. Role Cache Management

#### Cache Duration
- **30 seconds** (reduced from 5 minutes for faster role changes)
- Location: `src/lib/admin-cache.ts`

#### Automatic Cache Clearing

**On Logout** (`signout()` in `src/lib/auth-actions.ts`):
- Clears individual user's role cache
- Clears ALL admin cache as safety measure
- Clears localStorage/sessionStorage via `clearAllCachesOnLogout()`
- Revalidates all page paths
- Forces navigation to `/logout`

**On Role Update** (`updateUserAccount()` in `src/app/(main)/user-management/action.ts`):
- Automatically clears role cache for the updated user
- Takes effect within 30 seconds

**On User Deletion** (`deleteUserAccount()`):
- Clears role cache for deleted user
- Prevents stale cache entries

### 4. Client-Side Cache Clearing

**What Gets Cleared** (`clearAllClientCaches()` in `src/lib/clear-all-cache.ts`):
- Project caches
- Quotation caches
- Invoice caches
- Receipt caches
- Client caches
- Service caches
- All app-specific caches (aspial-*)
- **All sessionStorage** (complete clear)

### 5. Debug Tools

**Debug Page** (`/debug-role`):
- Shows current user's role status
- Displays all role flags (isAdmin, isOperationUser, isBrandAdvisor)
- Shows primary role
- Provides warning if operation-user restrictions are active

**Console Logging**:
- Sidebar logs role checks: `🔐 Sidebar Role Check:`
- Shows filtered items: `🔒 Operation user - filtering out:`
- Cache clearing logs: `🧹 Cleared X cached items`

## Testing Role Restrictions

### 1. Verify Role in Database
Check the `user_role` table:
```sql
SELECT u.email, r.slug as role
FROM "user" u
JOIN user_role ur ON u.id = ur."userId"
JOIN role r ON ur."roleId" = r.id
WHERE u.email = 'user@example.com';
```

Expected result for operation-user: `slug = 'operation-user'`

### 2. Test UI Access
1. Login as operation-user
2. Check sidebar - should NOT see:
   - Clients
   - Services  
   - Payments (Quotations/Invoices/Receipts)
3. Navigate to `/debug-role` - should show:
   - `isOperationUser: true`
   - Warning message about restrictions

### 3. Test Page Access
Try navigating directly to restricted pages:
- `/clients` → Should show "Access Denied"
- `/services` → Should show "Access Denied"
- `/quotations` → Should show "Access Denied"
- `/invoices` → Should show "Access Denied"
- `/receipts` → Should show "Access Denied"
- `/user-management` → Should show "Access Denied"

### 4. Test Cache Clearing
1. Login as admin
2. Change user role to operation-user
3. Wait 30 seconds OR logout/login
4. Check sidebar - restricted items should be hidden
5. Check `/debug-role` - should show operation-user role

## Troubleshooting

### Issue: Old role still showing after change
**Solution**: 
- Wait 30 seconds for cache to expire
- OR logout and login again
- OR run in console: `localStorage.clear(); sessionStorage.clear(); location.reload();`

### Issue: Can still access restricted pages
**Check**:
1. Database role assignment in `user_role` table
2. Console logs: `🔐 Sidebar Role Check:` should show `isOperationUser: true`
3. Navigate to `/debug-role` to verify role status

### Issue: Pages not loading after role change
**Solution**:
- Hard refresh (Ctrl+Shift+R / Cmd+Shift+R)
- Clear browser cache
- Logout and login again

## Security Best Practices

1. **Always logout between role changes** in development
2. **Never cache sensitive data** in localStorage
3. **Always check roles on server-side** - client-side is just UX
4. **Clear ALL caches on logout** - prevents cross-account leakage
5. **Monitor console logs** in development for role issues

## Role Slug Reference

- `admin` - Full access to everything
- `brand-advisor` - Same as admin for most features
- `operation-user` - Limited access (Projects, Bookings, Time Tracking only)
- `staff` - Default role with basic access

## Cache Locations

### Server-Side
- `src/lib/admin-cache.ts` - Role cache (Map in memory)
- Next.js cache - Page data (revalidated on logout)

### Client-Side
- localStorage - Project/quotation/invoice/receipt caches
- sessionStorage - Temporary session data (cleared on logout)
- Browser memory - Component state (cleared on navigation)

## Emergency Cache Clear

If you need to force-clear everything immediately:

### In Browser Console
```javascript
// Clear all client-side caches
localStorage.clear();
sessionStorage.clear();
location.reload();
```

### On Server
Restart the development server - clears all in-memory caches.

## Future Improvements

1. Consider using Redis for role cache in production
2. Add cache versioning to invalidate on deploy
3. Implement rate limiting for role checks
4. Add audit logging for role changes
5. Implement "force logout" for specific users when roles change


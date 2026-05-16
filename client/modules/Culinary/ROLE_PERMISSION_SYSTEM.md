# Role-Based Access Control (RBAC) System

## Overview

The Role-Based Access Control (RBAC) system provides fine-grained permission management for the EchoMenuStudio application. It enables multi-outlet support with role-based access control and outlet-specific data isolation.

## Architecture

### Core Components

1. **Types & Enums** (`client/types/roles-permissions.ts`)
   - `UserRole`: ADMIN, CHEF, MANAGER, STAFF, FOH
   - `Permission`: 25+ granular permissions
   - `OutletUserRole`: User role assignment to specific outlets
   - `AccessContext`: Permission checking context

2. **RBAC Manager** (`client/lib/rbac-manager.ts`)
   - Permission checking functions
   - Recipe access control
   - Inventory & purchasing permissions
   - User & outlet management checks
   - Data filtering utilities

3. **Permissions Hook** (`client/hooks/use-permissions.ts`)
   - `usePermissions()`: Main hook for checking permissions in components
   - `useOutletContext()`: Outlet-specific context
   - Callbacks for all permission checks

4. **Permission Guard** (`client/components/PermissionGuard.tsx`)
   - Conditional rendering based on permissions
   - Recipe-specific action checks (view, edit, delete)
   - Fallback content for denied access

5. **Role Management UI** (`client/components/RoleManagementPanel.tsx`)
   - User role management interface
   - Outlet assignment dialog
   - Team member summaries

6. **Outlet Context** (`client/context/OutletContext.tsx`)
   - Outlet selection state management
   - Available outlets tracking
   - Outlet-specific permissions

7. **Data Isolation** (`client/lib/outlet-data-isolation.ts`)
   - Outlet-scoped data filtering
   - Inter-outlet transfer validation
   - Audit trail management

8. **Role Assignment Service** (`client/lib/role-assignment-service.ts`)
   - Assign/remove users from outlets
   - Bulk operations
   - Audit logging

9. **Integration Utilities** (`client/lib/rbac-integration.ts`)
   - Module-level permission checks
   - Navigation item generation
   - API response filtering

## User Roles

### ADMIN
- Full system access
- Can manage users and outlets
- Can assign/modify all roles
- Sees all data across outlets
- Can approve global recipes

### CHEF
- Create and modify recipes
- Approve global recipes
- View inventory and suppliers
- View purchasing orders
- Create global recipes

### MANAGER
- View and manage operations
- Approve purchasing orders
- Manage outlet staff
- View reports and analytics
- View all outlet data

### STAFF
- View assigned recipes
- View inventory
- Basic operational tasks

### FOH (Front of House)
- View-only access to recipes
- Limited visibility

## Permissions

### Recipe Permissions
- `view_recipe`: View recipes
- `create_recipe`: Create new recipes
- `edit_recipe`: Modify existing recipes
- `delete_recipe`: Delete recipes
- `export_recipe`: Export recipe data

### Global Recipe Permissions
- `create_global_recipe`: Create recipes for all outlets
- `approve_global_recipe`: Approve recipe changes
- `reject_global_recipe`: Reject recipe changes
- `manage_global_recipes`: Manage global recipe library

### Inventory Permissions
- `view_inventory`: View inventory items
- `edit_inventory`: Modify inventory
- `manage_suppliers`: Manage supplier information
- `view_purchasing`: View purchase orders
- `approve_purchasing`: Approve purchase orders

### User & Outlet Permissions
- `manage_users`: Manage user accounts
- `invite_users`: Invite new users
- `manage_outlets`: Manage outlet information
- `manage_outlet_staff`: Manage staff assignments
- `view_all_outlets`: View all outlets

### System Permissions
- `manage_settings`: Configure system settings
- `view_audit_log`: View audit trail
- `view_reports`: Access reports
- `view_analytics`: View analytics
- `export_data`: Export system data

## Usage Guide

### Check Permissions in Components

```tsx
import { usePermissions } from '@/hooks/use-permissions';

function RecipeEditor() {
  const permissions = usePermissions();

  if (!permissions.hasPermission('edit_recipe')) {
    return <div>You don't have permission to edit recipes</div>;
  }

  return <RecipeForm />;
}
```

### Use PermissionGuard Component

```tsx
import { PermissionGuard } from '@/components/PermissionGuard';

function RecipeActions({ recipe }) {
  return (
    <>
      <PermissionGuard
        action="edit"
        recipe={recipe}
      >
        <button>Edit Recipe</button>
      </PermissionGuard>

      <PermissionGuard
        action="delete"
        recipe={recipe}
        fallback={<span>No delete permission</span>}
      >
        <button>Delete Recipe</button>
      </PermissionGuard>
    </>
  );
}
```

### Outlet-Specific Permissions

```tsx
import { usePermissions } from '@/hooks/use-permissions';

function InventoryManagement() {
  const outletId = 'outlet-123';
  const permissions = usePermissions(outletId);

  const canManage = permissions.canManageOutlet(outletId);
  const canEditInventory = permissions.canEditInventory(outletId);

  return (
    // Render UI based on permissions
  );
}
```

### Role Management

```tsx
import { RoleManagementPanel } from '@/components/RoleManagementPanel';

function TeamSettings() {
  const handleRoleChange = async (userId, outletId, role) => {
    await assignUserToOutlet(userId, outletId, role, currentUserId);
  };

  return (
    <RoleManagementPanel
      users={users}
      outlets={outlets}
      onRoleChange={handleRoleChange}
    />
  );
}
```

### Access Outlet Context

```tsx
import { useOutlet } from '@/context/OutletContext';

function OutletSelector() {
  const {
    currentOutletId,
    setCurrentOutletId,
    availableOutlets
  } = useOutlet();

  return (
    <select value={currentOutletId || ''} onChange={(e) => setCurrentOutletId(e.target.value)}>
      {availableOutlets.map(id => (
        <option key={id} value={id}>{id}</option>
      ))}
    </select>
  );
}
```

## Database Schema

The RBAC system requires these tables in Supabase:

### outlet_user_roles
```sql
CREATE TABLE outlet_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  outlet_id UUID NOT NULL,
  role TEXT NOT NULL,
  assigned_by UUID NOT NULL,
  assigned_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, outlet_id)
);
```

### audit_logs
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  outlet_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  changes JSONB,
  timestamp TIMESTAMP DEFAULT now(),
  ip_address TEXT
);
```

## Integration with Existing Systems

### Recipe Module

The RBAC system integrates with the Global Recipe System:
- Chefs can create global recipes
- Managers can see all recipes in their outlets
- Staff can only view recipes
- Permission checks are enforced on edit/delete operations

### Inventory Module

Controls access to inventory and purchasing:
- Managers can edit inventory for their outlets
- Chefs can view supplier information
- Managers can approve purchases
- Admins can transfer inventory between outlets

### User Management

Provides team member and role assignment:
- Admins can manage all users
- Managers can assign staff to their outlets
- Activity tracking via audit logs

## Data Isolation

The system implements outlet-specific data isolation:

```tsx
// Only see data from accessible outlets
const accessibleRecipes = filterRecipesByOutlet(context, allRecipes);

// Filter inventory by outlet access
const outletInventory = filterInventoryByOutlet(context, inventory);

// Check before modifying data
if (!canModifyOutletData(context, data)) {
  return error('No permission to modify this outlet data');
}
```

## Audit Trail

All role changes are logged:

```tsx
await logAuditEntry(
  userId,
  outletId,
  'role_assigned',
  'user_role',
  targetUserId,
  { role: 'chef' }
);

// Retrieve audit logs
const logs = await getOutletAuditLogs(outletId);
```

## Security Considerations

1. **Permission Checks**: Always verify permissions on the backend before executing actions
2. **Outlet Isolation**: Data returned from APIs should be filtered by outlet access
3. **Audit Logging**: All sensitive operations are logged for compliance
4. **Token Validation**: Verify user's organization and outlet access via auth tokens

## Next Steps

1. **Chef Approval Workflow**: Build approval dialog and notification system
2. **Auth Integration**: Connect auth system to populate user information
3. **Inventory Integration**: Wire inventory items to recipe ingredients
4. **Advanced Reporting**: Add role-based access to reporting features

## Files Created

- `client/types/roles-permissions.ts` - Type definitions
- `client/lib/rbac-manager.ts` - Core RBAC logic
- `client/hooks/use-permissions.ts` - Permission checking hook
- `client/components/PermissionGuard.tsx` - Permission guard component
- `client/components/RoleManagementPanel.tsx` - Role management UI
- `client/context/OutletContext.tsx` - Outlet context provider
- `client/lib/outlet-data-isolation.ts` - Data isolation utilities
- `client/lib/role-assignment-service.ts` - Role assignment API
- `client/lib/rbac-integration.ts` - System integration utilities

# Recipe Access Control Integration

## Overview

The Recipe Access Control system ensures that users can only perform actions on recipes they have permission to access. This document describes how authentication, RBAC, and recipe operations integrate to provide secure, role-based recipe management.

## Architecture

### Integration Layers

1. **Authentication Layer** (`client/context/AuthContext.tsx`)
   - User identity verification
   - Session management
   - Organization context

2. **RBAC Layer** (`client/lib/rbac-manager.ts`)
   - Permission checking
   - Recipe access validation
   - Outlet-specific permissions

3. **UI Layer** (`client/components/PermissionGuard.tsx`)
   - Conditional rendering
   - Action availability
   - Feedback on restricted operations

4. **API Layer** (`server/routes/recipe.ts`)
   - Server-side permission validation
   - Data isolation enforcement
   - Audit logging

## Recipe Access Control Functions

### Basic Permission Checks

#### `canViewRecipe(context, recipe)`

Determines if user can view a recipe.

```typescript
import { canViewRecipe } from "@/lib/rbac-manager";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";

function RecipeView({ recipe }) {
  const { user } = useAuth();
  const permissions = usePermissions();

  if (!user) return <Navigate to="/login" />;

  const context = {
    userId: user.id,
    userRole: user.role,
    organizationId: user.organization_id,
    outletRoles: [],
  };

  if (!canViewRecipe(context, recipe)) {
    return <div>You don't have permission to view this recipe</div>;
  }

  return <RecipeContent recipe={recipe} />;
}
```

#### `canEditRecipe(context, recipe)`

Determines if user can edit a recipe.

```typescript
import { canEditRecipe } from "@/lib/rbac-manager";

function RecipeEditor({ recipe }) {
  const { user } = useAuth();
  const permissions = usePermissions();

  const context = {
    userId: user.id,
    userRole: user.role,
    organizationId: user.organization_id,
    outletRoles: permissions.outletRoles,
  };

  if (!canEditRecipe(context, recipe)) {
    return (
      <PermissionGuard
        hasPermission={false}
        message="You don't have permission to edit this recipe"
      />
    );
  }

  return <RecipeForm recipe={recipe} />;
}
```

#### `canDeleteRecipe(context, recipe)`

Determines if user can delete a recipe.

```typescript
import { canDeleteRecipe } from "@/lib/rbac-manager";

async function handleDeleteRecipe(recipe) {
  const context = createAccessContext(user, permissions);

  if (!canDeleteRecipe(context, recipe)) {
    toast.error("You don't have permission to delete this recipe");
    return;
  }

  await deleteRecipe(recipe.id);
  toast.success("Recipe deleted");
}
```

### Global Recipe Permissions

#### `canCreateGlobalRecipe(context)`

Checks if user can create global recipes (shared across outlets).

```typescript
import { canCreateGlobalRecipe } from "@/lib/rbac-manager";

function CreateGlobalRecipeButton() {
  const { user } = useAuth();
  const context = createAccessContext(user, permissions);

  if (!canCreateGlobalRecipe(context)) {
    return null; // Don't show button if no permission
  }

  return <Button onClick={openGlobalRecipeCreator}>Create Global Recipe</Button>;
}
```

#### `canApproveGlobalRecipe(context)`

Checks if user can approve global recipes before they're shared.

```typescript
import { canApproveGlobalRecipe } from "@/lib/rbac-manager";

function ApprovalQueue() {
  const { user } = useAuth();
  const context = createAccessContext(user, permissions);

  if (!canApproveGlobalRecipe(context)) {
    return <div>No pending approvals for your role</div>;
  }

  return <PendingApprovals />;
}
```

### Data Filtering

#### `filterRecipesByPermission(context, recipes)`

Filters a list of recipes to only include ones user can view.

```typescript
import { filterRecipesByPermission } from "@/lib/rbac-manager";

function RecipeList({ recipes }) {
  const { user } = useAuth();
  const permissions = usePermissions();
  const context = createAccessContext(user, permissions);

  const accessibleRecipes = recipes.filter((recipe) =>
    canViewRecipe(context, recipe)
  );

  return (
    <div>
      {accessibleRecipes.map((recipe) => (
        <RecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  );
}
```

## User Roles and Recipe Permissions

### ADMIN

- **View**: All recipes (global and outlet-specific)
- **Create**: Global recipes, local recipes in any outlet
- **Edit**: Any recipe
- **Delete**: Any recipe
- **Approve**: All global recipes
- **Access**: All outlets

### CHEF

- **View**: All recipes in organization
- **Create**: Global recipes, local recipes in assigned outlets
- **Edit**: Own recipes and recipes in assigned outlets
- **Delete**: Own recipes and recipes in assigned outlets
- **Approve**: Global recipes
- **Access**: Assigned outlets only

### MANAGER

- **View**: All recipes in assigned outlets
- **Create**: Local recipes in assigned outlets
- **Edit**: Recipes in assigned outlets (approval required for global)
- **Delete**: Recipes in assigned outlets
- **Approve**: Purchasing orders (not recipes)
- **Access**: Assigned outlets only

### STAFF

- **View**: Recipes in assigned outlet
- **Create**: None (cannot create recipes)
- **Edit**: None (cannot edit recipes)
- **Delete**: None (cannot delete recipes)
- **Approve**: None
- **Access**: Assigned outlet only

### FOH (Front of House)

- **View**: Recipe summaries only
- **Create**: None
- **Edit**: None
- **Delete**: None
- **Approve**: None
- **Access**: Assigned outlet only (limited access)

## Implementation Patterns

### Pattern 1: Permission Guard Wrapper

```typescript
import { PermissionGuard } from "@/components/PermissionGuard";

function RecipeActions({ recipe }) {
  const { user } = useAuth();
  const context = createAccessContext(user, permissions);

  return (
    <div className="recipe-actions">
      <PermissionGuard
        hasPermission={canEditRecipe(context, recipe)}
        requiredRole="chef"
      >
        <Button onClick={editRecipe}>Edit</Button>
      </PermissionGuard>

      <PermissionGuard
        hasPermission={canDeleteRecipe(context, recipe)}
        requiredRole="manager"
      >
        <Button onClick={deleteRecipe} variant="destructive">
          Delete
        </Button>
      </PermissionGuard>
    </div>
  );
}
```

### Pattern 2: Server-Side Validation

```typescript
// server/routes/recipe.ts
import { canEditRecipe } from "@/lib/rbac-manager";

app.put("/api/recipes/:id", async (req, res) => {
  const { user } = req.auth;
  const recipe = await getRecipe(req.params.id);

  const context = {
    userId: user.id,
    userRole: user.role,
    organizationId: user.organization_id,
    outletRoles: user.outletRoles,
  };

  // Validate permission server-side
  if (!canEditRecipe(context, recipe)) {
    return res.status(403).json({ error: "Permission denied" });
  }

  // Proceed with update
  const updated = await updateRecipe(req.params.id, req.body);
  res.json(updated);
});
```

### Pattern 3: Data Filtering in Queries

```typescript
import {
  filterRecipesByPermission,
  getAccessibleOutlets,
} from "@/lib/rbac-manager";

function useAccessibleRecipes() {
  const { user } = useAuth();
  const { data: recipes } = useQuery({
    queryKey: ["recipes"],
    queryFn: async () => {
      const context = createAccessContext(user, permissions);
      const allRecipes = await fetchRecipes();
      return filterRecipesByPermission(context, allRecipes);
    },
  });

  return recipes;
}
```

### Pattern 4: Outlet-Specific Access

```typescript
import { canAccessOutletContext } from "@/lib/rbac-manager";

function OutletRecipes({ outletId }) {
  const { user } = useAuth();
  const permissions = usePermissions(outletId);
  const context = createAccessContext(user, permissions);

  if (!canAccessOutletContext(context, outletId)) {
    return <div>You don't have access to this outlet</div>;
  }

  return <RecipeList outletId={outletId} />;
}
```

## Integration with Approval Workflow

Recipe access control works with the approval workflow for global recipes:

```typescript
import {
  canCreateGlobalRecipe,
  canApproveGlobalRecipe,
} from "@/lib/rbac-manager";
import { submitApprovalRequest } from "@/lib/approval-workflow";

async function publishGlobalRecipe(recipe) {
  const context = createAccessContext(user, permissions);

  // Check if user can create global recipes
  if (!canCreateGlobalRecipe(context)) {
    toast.error("You don't have permission to create global recipes");
    return;
  }

  // Submit for approval
  const approval = await submitApprovalRequest({
    recipeId: recipe.id,
    sourceOutletId: recipe.outletId,
    targetOutletId: "global",
    changes: recipe,
  });

  // Check if user can approve immediately (CHEF or ADMIN)
  if (canApproveGlobalRecipe(context)) {
    await approveRequest(approval.id);
  } else {
    // Submit for approval by chef
    toast.info("Recipe submitted for approval by a chef");
  }
}
```

## Integration with Inventory System

Recipe access control ensures users can only cost recipes with inventory they can access:

```typescript
import { canViewInventory } from "@/lib/rbac-manager";
import { getRecipeIngredientCost } from "@/lib/ingredient-inventory-mapping";

async function calculateRecipeCost(recipe, servings) {
  const context = createAccessContext(user, permissions);

  // Check inventory access
  const outletId = recipe.outletId || user.defaultOutletId;
  if (!canViewInventory(context, outletId)) {
    throw new Error("You don't have access to inventory for this outlet");
  }

  // Calculate cost with accessible inventory
  return getRecipeIngredientCost(recipe.id, servings);
}
```

## Audit Trail

All recipe access is logged for audit purposes:

```typescript
// Access log entry
{
  userId: "user-id",
  action: "view_recipe",
  resourceId: "recipe-id",
  resourceType: "recipe",
  permission: "view_recipe",
  granted: true,
  timestamp: Date.now(),
  context: {
    userRole: "chef",
    organizationId: "org-id",
    outletId: "outlet-id"
  }
}
```

## Best Practices

### 1. Always Validate on Server

- Never trust client-side permission checks alone
- Always validate permissions on the backend before modifying data

### 2. Use Permission Guards in UI

- Use PermissionGuard component to hide unavailable actions
- Provides better UX than showing and then blocking

### 3. Implement Lazy Permission Loading

```typescript
// Load permissions once and cache them
const { permissions } = usePermissions(outletId);

// Reuse permissions for multiple checks
canEditRecipe(context, recipe);
canCreateGlobalRecipe(context);
```

### 4. Provide Clear Feedback

```typescript
<PermissionGuard
  hasPermission={false}
  fallback={
    <div className="text-amber-600">
      <p>You don't have permission to edit this recipe.</p>
      <p className="text-sm">Contact your manager for access.</p>
    </div>
  }
/>
```

### 5. Log Permission Denials

```typescript
if (!canEditRecipe(context, recipe)) {
  logPermissionDenial({
    userId: user.id,
    action: "edit_recipe",
    resourceId: recipe.id,
    reason: "insufficient_permissions",
  });
  return;
}
```

## Error Handling

```typescript
async function handleRecipeOperation(recipe, operation) {
  try {
    const context = createAccessContext(user, permissions);

    switch (operation) {
      case "edit":
        if (!canEditRecipe(context, recipe)) {
          throw new PermissionError("Cannot edit this recipe");
        }
        break;
      case "delete":
        if (!canDeleteRecipe(context, recipe)) {
          throw new PermissionError("Cannot delete this recipe");
        }
        break;
      case "view":
        if (!canViewRecipe(context, recipe)) {
          throw new PermissionError("Cannot view this recipe");
        }
        break;
    }

    await executeOperation(recipe, operation);
  } catch (error) {
    if (error instanceof PermissionError) {
      toast.error(error.message);
      logSecurityEvent({
        type: "permission_denied",
        userId: user.id,
        operation,
        resourceId: recipe.id,
      });
    } else {
      toast.error("An error occurred");
      console.error(error);
    }
  }
}
```

## Testing

### Unit Tests

```typescript
describe("Recipe Access Control", () => {
  it("should allow chef to edit their own recipes", () => {
    const context = {
      userId: "chef-1",
      userRole: "chef",
      organizationId: "org-1",
      outletRoles: [{ outletId: "outlet-1", role: "chef" }],
    };

    const recipe = {
      id: "recipe-1",
      createdBy: "chef-1",
      outletId: "outlet-1",
    };

    expect(canEditRecipe(context, recipe)).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe("Recipe Operations", () => {
  it("should prevent staff from editing recipes", async () => {
    const context = createAccessContext(staffUser, staffPermissions);

    const result = await editRecipe(recipe, { name: "New Name" });

    expect(result.error).toBe("Permission denied");
  });
});
```

## Production Considerations

- Permissions are checked at multiple layers for security
- Client-side checks provide UX feedback
- Server-side checks provide actual security
- Always assume client-side checks can be bypassed
- Implement proper logging and monitoring
- Set up alerts for suspicious permission denials
- Review access logs regularly

## Related Documentation

- [AUTH_INTEGRATION.md](./AUTH_INTEGRATION.md) - Authentication system
- [ROLE_PERMISSION_SYSTEM.md](./ROLE_PERMISSION_SYSTEM.md) - RBAC system details
- [CHEF_APPROVAL_WORKFLOW.md](./CHEF_APPROVAL_WORKFLOW.md) - Approval workflow
- [INVENTORY_INTEGRATION_SUMMARY.md](./INVENTORY_INTEGRATION_SUMMARY.md) - Inventory system

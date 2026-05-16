# Authentication Integration Guide

## Overview

This guide covers the complete authentication system integrated with the EchoMenuStudio application. The system uses Supabase for authentication and user management, with full support for multi-outlet operations and role-based access control (RBAC).

## Architecture

### Core Components

1. **Auth Service** (`client/lib/auth-service.ts`)
   - Supabase client initialization
   - User authentication functions
   - Session management
   - Organization management
   - Invitation system

2. **Auth Context** (`client/context/AuthContext.tsx`)
   - React Context for auth state
   - Session refresh and token management
   - User state management
   - Error handling

3. **Protected Routes** (`client/components/ProtectedRoute.tsx`)
   - Route protection with authentication
   - Role-based route access control
   - Loading states
   - Access denial handling

4. **Session Manager** (`client/lib/session-manager.ts`)
   - Local storage session management
   - Session expiry checking
   - Session refresh monitoring
   - Session health tracking

5. **Pages**
   - `client/pages/Login.tsx` - Sign in and sign up
   - `client/pages/PasswordReset.tsx` - Password reset flow

## Setup Instructions

### 1. Supabase Project Setup

#### Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Wait for project initialization
4. Note your Project URL and Anon Key

#### Configure Environment Variables

Add to `.env.local` or `.env`:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Schema

Run these SQL queries in your Supabase SQL Editor:

#### Organizations Table

```sql
CREATE TABLE organizations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_organizations_owner_id ON organizations(owner_id);
```

#### Users Table

```sql
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  avatar_url VARCHAR(255),
  role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('admin', 'chef', 'manager', 'staff', 'foh')),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_users_email ON users(email);
```

#### Outlets Table

```sql
CREATE TABLE outlets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  location VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_outlets_organization_id ON outlets(organization_id);
```

#### User Outlets (Role Assignment) Table

```sql
CREATE TABLE user_outlets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES outlets(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('admin', 'chef', 'manager', 'staff', 'foh')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, outlet_id)
);

CREATE INDEX idx_user_outlets_user_id ON user_outlets(user_id);
CREATE INDEX idx_user_outlets_outlet_id ON user_outlets(outlet_id);
```

#### Organization Invitations Table

```sql
CREATE TABLE organization_invitations (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'staff' CHECK (role IN ('admin', 'chef', 'manager', 'staff', 'foh')),
  accepted_at TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_invitations_organization_id ON organization_invitations(organization_id);
CREATE INDEX idx_invitations_email ON organization_invitations(email);
```

### 3. Enable Authentication Methods

In Supabase Dashboard:

1. Go to Authentication > Providers
2. Enable **Email**
3. Configure email templates for password reset

## Usage

### Authentication Flow

#### Sign Up

```typescript
import { useAuth } from "@/context/AuthContext";

function SignUpComponent() {
  const { signUp, loading, error } = useAuth();

  const handleSignUp = async () => {
    const success = await signUp(
      "user@example.com",
      "password123",
      "username",
      "Organization Name"
    );
    if (success) {
      // User created and signed in
    }
  };

  return (
    <>
      {error && <div>{error}</div>}
      <button onClick={handleSignUp} disabled={loading}>
        Sign Up
      </button>
    </>
  );
}
```

#### Sign In

```typescript
import { useAuth } from "@/context/AuthContext";

function LoginComponent() {
  const { signIn, loading, error } = useAuth();

  const handleSignIn = async () => {
    const success = await signIn(
      "user@example.com",
      "password123"
    );
    if (success) {
      // User authenticated
    }
  };

  return (
    <>
      {error && <div>{error}</div>}
      <button onClick={handleSignIn} disabled={loading}>
        Sign In
      </button>
    </>
  );
}
```

#### Sign Out

```typescript
import { useAuth } from "@/context/AuthContext";

function ProfileComponent() {
  const { signOut, user } = useAuth();

  return (
    <>
      <p>Logged in as: {user?.email}</p>
      <button onClick={signOut}>
        Sign Out
      </button>
    </>
  );
}
```

#### Protected Routes

```typescript
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminDashboard } from "@/pages/AdminDashboard";

<Routes>
  <Route
    path="/admin"
    element={
      <ProtectedRoute requiredRoles={["admin"]}>
        <AdminDashboard />
      </ProtectedRoute>
    }
  />
</Routes>
```

### Session Management

#### Get Current Session

```typescript
import { useAuth } from "@/context/AuthContext";

function SessionComponent() {
  const { session, user, isAuthenticated } = useAuth();

  return (
    <>
      {isAuthenticated ? (
        <>
          <p>User: {user?.username}</p>
          <p>Organization: {user?.organization_id}</p>
          <p>Token expires: {new Date(session?.expires_at || 0).toLocaleString()}</p>
        </>
      ) : (
        <p>Not authenticated</p>
      )}
    </>
  );
}
```

#### Refresh Session

```typescript
import { useAuth } from "@/context/AuthContext";

function RefreshSessionComponent() {
  const { refreshSession, session } = useAuth();

  const handleRefresh = async () => {
    const success = await refreshSession();
    if (success) {
      console.log("Session refreshed");
    }
  };

  return (
    <button onClick={handleRefresh}>
      Refresh Session
    </button>
  );
}
```

#### Session Monitoring

```typescript
import { useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { isSessionExpired, shouldRefreshSession } from "@/lib/session-manager";

function SessionMonitor() {
  const { session, refreshSession } = useAuth();

  useEffect(() => {
    const checkSession = setInterval(() => {
      if (shouldRefreshSession(session)) {
        refreshSession();
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkSession);
  }, [session, refreshSession]);

  return null;
}
```

## Integration with RBAC

The authentication system integrates seamlessly with the RBAC (Role-Based Access Control) system:

```typescript
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/use-permissions";

function RecipeManagement() {
  const { user } = useAuth();
  const permissions = usePermissions(outletId);

  if (!user) return <Navigate to="/login" />;

  if (!permissions.can_create_recipe) {
    return <div>You don't have permission to create recipes</div>;
  }

  return <RecipeEditor />;
}
```

## API Functions

### Authentication

#### `signUp(data: SignUpData)`

Create a new user account with organization.

```typescript
const result = await signUp({
  email: "user@example.com",
  password: "secure_password",
  username: "username",
  organization_name: "Restaurant Name",
});
```

#### `signIn(data: SignInData)`

Sign in with email and password.

```typescript
const result = await signIn({
  email: "user@example.com",
  password: "password",
});
```

#### `signOut()`

Sign out current user.

```typescript
const result = await signOut();
```

### User Management

#### `getCurrentSession()`

Get current user session.

```typescript
const session = await getCurrentSession();
```

#### `getUserById(userId: string)`

Get user by ID.

```typescript
const user = await getUserById("user-uuid");
```

#### `updateUserProfile(userId: string, updates: Partial<AuthUser>)`

Update user profile.

```typescript
const result = await updateUserProfile("user-uuid", {
  username: "new_username",
  avatar_url: "https://...",
});
```

#### `updatePassword(newPassword: string)`

Update user password.

```typescript
const result = await updatePassword("new_password");
```

### Password Reset

#### `resetPassword(email: string)`

Request password reset email.

```typescript
const result = await resetPassword("user@example.com");
```

#### `resetPasswordWithToken(token: string, newPassword: string)`

Reset password using token from email.

```typescript
const result = await resetPasswordWithToken(token, "new_password");
```

### Organization Management

#### `inviteUserToOrganization(orgId: string, email: string, role: string)`

Invite user to organization.

```typescript
const result = await inviteUserToOrganization(
  "org-uuid",
  "newuser@example.com",
  "chef",
);
```

#### `acceptOrganizationInvitation(invitationId: string, userId: string)`

Accept organization invitation.

```typescript
const result = await acceptOrganizationInvitation(
  "invitation-uuid",
  "user-uuid",
);
```

#### `getOrganizationMembers(orgId: string)`

Get all members of organization.

```typescript
const members = await getOrganizationMembers("org-uuid");
```

## Security Best Practices

### 1. Environment Variables

- Never commit `.env` files with real credentials
- Use `.env.local` for local development
- Use Netlify/Vercel environment variables for production

### 2. Password Requirements

- Minimum 8 characters
- Mix of upper and lowercase
- Numbers and special characters recommended

### 3. Session Management

- Sessions automatically refresh every 10 minutes
- Expired sessions are cleared automatically
- Monitor session health using session manager

### 4. Role-Based Access Control

- Always check permissions before sensitive operations
- Use ProtectedRoute for route protection
- Combine auth checks with permission checks

### 5. Data Isolation

- Users only see data from their organization
- Outlet-specific data isolation enforced
- RBAC system controls access to sensitive operations

## Troubleshooting

### "Supabase is not configured"

- Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env
- Verify keys are correct from Supabase dashboard
- Restart dev server after adding env variables

### "User creation failed"

- Check email is unique
- Verify organization table exists and has correct schema
- Check database permissions

### "Sign in failed"

- Verify email exists in users table
- Confirm password is correct
- Check organization_id is valid

### "Session refresh failed"

- Check internet connection
- Verify token hasn't expired
- Check Supabase project status

## Production Deployment

### Pre-deployment Checklist

- [ ] Set environment variables in hosting platform
- [ ] Enable email authentication in Supabase
- [ ] Configure email templates for password reset
- [ ] Enable HTTPS for all routes
- [ ] Test all auth flows in staging
- [ ] Set up monitoring for auth failures
- [ ] Configure email rate limiting
- [ ] Test session refresh on slow networks

### Environment Variables

Set these in your hosting platform:

```
VITE_SUPABASE_URL=production_url
VITE_SUPABASE_ANON_KEY=production_key
```

### Email Configuration

Configure Supabase email templates for:

1. Password reset
2. Email verification
3. Account invitation
4. Login confirmation (optional)

## Performance Considerations

- Session refresh happens every 10 minutes in background
- Session health checks every 60 seconds
- Failed auth attempts throttled by Supabase
- User list queries paginated for large organizations
- Local storage caching for session data

## Support

For issues or questions:

1. Check Supabase logs in project dashboard
2. Review browser console for errors
3. Verify environment variables are set
4. Check network requests in DevTools
5. Review this guide's troubleshooting section

## Related Documentation

- [ROLE_PERMISSION_SYSTEM.md](./ROLE_PERMISSION_SYSTEM.md) - Role-based access control
- [CHEF_APPROVAL_WORKFLOW.md](./CHEF_APPROVAL_WORKFLOW.md) - Approval workflow system
- [INVENTORY_INTEGRATION_SUMMARY.md](./INVENTORY_INTEGRATION_SUMMARY.md) - Inventory management

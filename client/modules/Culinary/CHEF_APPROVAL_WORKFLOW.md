# Chef Approval Workflow

## Overview

The Chef Approval Workflow provides a structured process for approving recipe changes before they are shared between outlets. This ensures quality control and maintains consistency across a multi-outlet operation.

## Features

### Core Workflow

1. **Request Submission**: A chef or staff member submits a recipe change for approval
2. **Approval Queue**: Approvers review pending change requests
3. **Discussion**: Inline commenting system for feedback and clarification
4. **Decision**: Approve or reject with detailed feedback
5. **Notification**: Automatic notifications on status changes

### Approval Statuses

- **PENDING**: Awaiting review
- **APPROVED**: Accepted and can be applied
- **REJECTED**: Declined with reason provided
- **DRAFT**: Work in progress, not submitted for approval

### Who Can Approve?

- **CHEF** role users with `approve_global_recipe` permission
- **ADMIN** users (all permissions by default)

### Who Can Request?

- **CHEF** role users with `create_global_recipe` permission
- **MANAGER** and **ADMIN** users

## Architecture

### Main Components

1. **Approval Service** (`client/lib/approval-workflow.ts`)
   - Core approval request management
   - Status transitions
   - Comment system
   - Notification system

2. **Approval Dialog** (`client/components/ApprovalDialog.tsx`)
   - Review change details
   - Add comments
   - Approve/reject actions
   - Shows approval history

3. **Approval Queue** (`client/components/ApprovalQueue.tsx`)
   - Lists pending approvals
   - Statistics dashboard
   - Quick action buttons
   - Status filtering

## Data Model

### ApprovalRequest

```typescript
interface ApprovalRequest {
  id: string;
  recipeId: string;
  sourceOutletId: string;
  targetOutletId: string;
  requestedBy: string;
  requestedByUsername: string;
  requestedAt: number;
  status: ApprovalStatus;
  approvedBy?: string;
  approvedByUsername?: string;
  approvedAt?: number;
  rejectionReason?: string;
  changes: {
    name?: string;
    description?: string;
    ingredients?: Array<{
      id: string;
      name: string;
      quantity: number;
      unit: string;
    }>;
    instructions?: string;
    yield?: number;
    costPerServing?: number;
  };
  comments?: ApprovalComment[];
}
```

### ApprovalComment

```typescript
interface ApprovalComment {
  id: string;
  authorId: string;
  authorUsername: string;
  content: string;
  createdAt: number;
  isChef: boolean;
}
```

## Database Schema

### approval_requests
```sql
CREATE TABLE approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL,
  source_outlet_id UUID NOT NULL,
  target_outlet_id UUID NOT NULL,
  requested_by UUID NOT NULL REFERENCES users(id),
  requested_by_username TEXT NOT NULL,
  requested_at TIMESTAMP DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES users(id),
  approved_by_username TEXT,
  approved_at TIMESTAMP,
  rejection_reason TEXT,
  changes JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  FOREIGN KEY (source_outlet_id) REFERENCES outlets(id),
  FOREIGN KEY (target_outlet_id) REFERENCES outlets(id)
);

CREATE INDEX approval_requests_target_status 
  ON approval_requests(target_outlet_id, status);
CREATE INDEX approval_requests_requested_by 
  ON approval_requests(requested_by);
```

### approval_comments
```sql
CREATE TABLE approval_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  approval_request_id UUID NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES users(id),
  author_username TEXT NOT NULL,
  content TEXT NOT NULL,
  is_chef BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX approval_comments_request 
  ON approval_comments(approval_request_id);
```

### notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  reference_id UUID NOT NULL,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX notifications_user_read 
  ON notifications(user_id, read);
```

## Usage Examples

### Submit Recipe Change for Approval

```tsx
import { createApprovalRequest } from '@/lib/approval-workflow';

const handleSubmitForApproval = async (recipeId, changes) => {
  const result = await createApprovalRequest(
    recipeId,
    currentOutletId,
    targetOutletId,
    userId,
    username,
    {
      name: changes.name,
      ingredients: changes.ingredients,
      instructions: changes.instructions,
      yield: changes.yield,
    }
  );

  if (result.success) {
    toast.success('Recipe change submitted for approval');
  }
};
```

### View Pending Approvals

```tsx
import { ApprovalQueue } from '@/components/ApprovalQueue';

function ApprovalCenter() {
  return (
    <ApprovalQueue
      onApprovalStatusChange={() => {
        // Refresh data after approval
      }}
    />
  );
}
```

### Get User's Approval Requests

```tsx
import { getApprovalRequestsForUser } from '@/lib/approval-workflow';

const myRequests = await getApprovalRequestsForUser(userId);
```

### Approve a Request

```tsx
import { approveRequest } from '@/lib/approval-workflow';

const handleApprove = async (requestId) => {
  const result = await approveRequest(
    requestId,
    userId,
    username
  );

  if (result.success) {
    toast.success('Request approved');
  }
};
```

### Reject with Reason

```tsx
import { rejectRequest } from '@/lib/approval-workflow';

const handleReject = async (requestId, reason) => {
  const result = await rejectRequest(
    requestId,
    userId,
    reason
  );

  if (result.success) {
    toast.success('Request rejected');
  }
};
```

### Add Comment to Approval

```tsx
import { addApprovalComment } from '@/lib/approval-workflow';

const handleAddComment = async (requestId, comment) => {
  const result = await addApprovalComment(
    requestId,
    userId,
    username,
    comment,
    isChef
  );

  if (result.success) {
    toast.success('Comment added');
  }
};
```

## Permissions & Access Control

### Approval Permission Hierarchy

| Role | Can Request | Can Approve | Can Comment |
|------|-------------|-------------|------------|
| ADMIN | ✓ | ✓ | ✓ |
| CHEF | ✓ | ✓ | ✓ |
| MANAGER | ✓ | ✗ | ✓ |
| STAFF | ✗ | ✗ | ✗ |
| FOH | ✗ | ✗ | ✗ |

### Required Permissions

- **Create Approval Request**: `create_global_recipe`
- **Approve Request**: `approve_global_recipe`
- **Reject Request**: `approve_global_recipe`
- **Comment**: `approve_global_recipe` (chef indicator) or `edit_recipe`

## Notifications

The system automatically sends notifications for:

1. **Approval Submitted**: Chef is notified a request is pending review
2. **Approved**: Requester is notified of approval
3. **Rejected**: Requester is notified with reason
4. **Comment Added**: Both requester and approver are notified of new comments

### Notification Implementation

Future integration with:
- Email notifications
- In-app notification bell
- Slack/Teams integration
- Mobile push notifications

## Workflow Timeline Example

```
09:00 AM - Chef A submits recipe change request (pending)
09:05 AM - Chef B adds comment asking for clarification
09:10 AM - Chef A replies with additional info
09:15 AM - Chef B approves the request
09:16 AM - Chef A receives approval notification
09:20 AM - Recipe change can now be applied to outlets
```

## Statistics & Reporting

### Get Approval Stats

```tsx
import { getApprovalStats, ApprovalStatsWidget } from '@/lib/approval-workflow';

const stats = await getApprovalStats(outletId);
// Returns: { pending: 5, approved: 23, rejected: 2 }

// Use widget component
<ApprovalStatsWidget outletId={outletId} />
```

### Dashboard Widget

The `ApprovalStatsWidget` component provides a quick overview:
- Pending approvals count
- Recently approved count
- Rejected count

## Integration with Global Recipe System

The approval workflow integrates with the Global Recipe System:

1. **Recipe Sharing**: When a local recipe is marked for sharing globally
2. **Change Tracking**: Approval tracks all changes to the recipe
3. **Approval Gate**: Changes only apply after approval
4. **Audit Trail**: All approvals logged in audit system

## Security Considerations

1. **Permission Validation**: All approval actions check permissions
2. **Audit Logging**: All approvals logged with user and timestamp
3. **Outlet Isolation**: Users can only approve for their outlets
4. **Change Tracking**: Full history of all modifications
5. **Role-Based Access**: Approval actions limited to authorized roles

## Future Enhancements

1. **Scheduled Approvals**: Auto-approve after time period
2. **Multi-Level Approval**: Chain of command approval
3. **Templates**: Pre-defined change templates
4. **Bulk Operations**: Approve multiple requests at once
5. **Approval Analytics**: Trend analysis and metrics
6. **SLA Tracking**: Monitor approval time SLAs

## Files Created

- `client/lib/approval-workflow.ts` - Core approval system
- `client/components/ApprovalDialog.tsx` - Approval review dialog
- `client/components/ApprovalQueue.tsx` - Approval queue/list component

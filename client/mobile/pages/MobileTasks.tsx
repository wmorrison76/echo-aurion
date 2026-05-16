/**
 * Mobile Tasks
 * Placeholder: task list; RBAC enforced; trace on complete.
 */

import React from "react";
import { ListTodo } from "lucide-react";

export default function MobileTasks() {
  return (
    <div className="p-4 space-y-4">
      <h2 className="text-lg font-semibold flex items-center gap-2">
        <ListTodo className="h-5 w-5" />
        Tasks
      </h2>
      <p className="text-sm text-muted-foreground">
        Your tasks; one-tap complete emits trace. (Stub — wire to tasks API.)
      </p>
    </div>
  );
}

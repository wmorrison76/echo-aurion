import { PageLayout } from "../components/layout/PageLayout";
import { SessionRequiredNotice } from "../modules/auth";
import { useSession } from "../modules/auth/hooks/useSession";
import {
  RBACUserManagement,
  OutletManager,
  AdvancedMatchingUI,
} from "../modules/aurum/components";
export default function Admin() {
  const { session } = useSession();
  if (!session) {
    return (
      <PageLayout>
        {" "}
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          {" "}
          <SessionRequiredNotice description="Authenticate to access admin settings." />{" "}
        </div>{" "}
      </PageLayout>
    );
  }
  return (
    <PageLayout>
      {" "}
      <div className="mr-auto ml-10 max-w-7xl overflow-hidden px-6 py-8 sm:px-10">
        {" "}
        <div className="space-y-8">
          {" "}
          {/* Page Header */}{" "}
          <div className="space-y-2">
            {" "}
            <h1 className="text-3xl font-bold text-foreground">
              {" "}
              Administration{" "}
            </h1>{" "}
            <p className="text-muted-foreground">
              {" "}
              Manage users, outlets, chart of accounts, and system settings{" "}
            </p>{" "}
          </div>{" "}
          {/* User Management */}{" "}
          <Section
            title="User Management"
            description="Create users, assign roles, manage permissions"
          >
            {" "}
            <RBACUserManagement />{" "}
          </Section>{" "}
          {/* Outlet Configuration */}{" "}
          <Section
            title="Outlet Management"
            description="Create and manage properties, locations, and entities"
          >
            {" "}
            <OutletManager />{" "}
          </Section>{" "}
          {/* Chart of Accounts */}{" "}
          <Section
            title="Chart of Accounts"
            description="Manage GL accounts and cost centers"
          >
            {" "}
            <div className="rounded-lg border border-border/40 bg-surface-variant/30 p-6">
              {" "}
              <p className="text-sm text-muted-foreground">
                {" "}
                Chart of Accounts management coming soon. Contact your
                administrator to add or modify accounts.{" "}
              </p>{" "}
            </div>{" "}
          </Section>{" "}
          {/* Advanced Settings */}{" "}
          <Section
            title="Advanced Settings"
            description="Invoice matching rules, automation, and integrations"
          >
            {" "}
            <AdvancedMatchingUI />{" "}
          </Section>{" "}
        </div>{" "}
      </div>{" "}
    </PageLayout>
  );
}
function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4">
      {" "}
      <div>
        {" "}
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>{" "}
        <p className="text-sm text-muted-foreground mt-1">{description}</p>{" "}
      </div>{" "}
      <div className="rounded-lg border border-border/40 bg-surface/60 p-6 shadow-sm">
        {" "}
        {children}{" "}
      </div>{" "}
    </div>
  );
}

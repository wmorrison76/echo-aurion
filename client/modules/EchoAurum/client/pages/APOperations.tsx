import { PageLayout } from "../components/layout/PageLayout";
import { SessionRequiredNotice } from "../modules/auth";
import { useSession } from "../modules/auth/hooks/useSession";
import {
  APInvoiceManager,
  InvoicePaymentWorkflow,
} from "../modules/aurum/components";
export default function APOperations() {
  const { session } = useSession();
  if (!session) {
    return (
      <PageLayout>
        {" "}
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          {" "}
          <SessionRequiredNotice description="Authenticate to access AP operations." />{" "}
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
              Accounts Payable{" "}
            </h1>{" "}
            <p className="text-muted-foreground">
              {" "}
              Process vendor invoices, approvals, and payments with Guardian AI
              oversight{" "}
            </p>{" "}
          </div>{" "}
          {/* Process Invoices */}{" "}
          <Section
            title="Process Invoices"
            description="Enter vendor invoices and initiate approval workflow"
          >
            {" "}
            <APInvoiceManager />{" "}
          </Section>{" "}
          {/* Payment Workflow */}{" "}
          <Section
            title="Payment Processing"
            description="Review approved invoices and process payments"
          >
            {" "}
            <InvoicePaymentWorkflow />{" "}
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

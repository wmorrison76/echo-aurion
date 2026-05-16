import { AppLayout } from "@/components/AppLayout";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";

export default function Index() {
  return (
    <AppLayout>
      <div className="flex items-center justify-between p-6">
        <div>
          <h1>Echo Ops</h1>
          <p>Welcome to the system</p>
        </div>
        <ModuleChatButton
          moduleId="purchasing-receiving"
          moduleName="Purchasing & Receiving"
        />
      </div>
    </AppLayout>
  );
}

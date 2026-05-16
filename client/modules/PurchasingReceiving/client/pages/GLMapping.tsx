import { AppLayout } from "@/components/AppLayout";
import { GLGroupManager } from "@/components/gl/GLGroupManager";
import { ProductGLMappingManager } from "@/components/gl/ProductGLMappingManager";
export default function GLMapping() {
  return (
    <AppLayout>
      {" "}
      <div className="space-y-6">
        {" "}
        <div className="space-y-2">
          {" "}
          <h1 className="text-2xl font-semibold tracking-tight">
            {" "}
            GL Mapping Control Center{" "}
          </h1>{" "}
          <p className="text-sm text-muted-foreground">
            {" "}
            Create friendly GL divisions, map minibar and retail items away from
            food cost, and keep finance, rooms, and outlets aligned for
            month-end inventory.{" "}
          </p>{" "}
        </div>{" "}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          {" "}
          <GLGroupManager /> <ProductGLMappingManager />{" "}
        </div>{" "}
      </div>{" "}
    </AppLayout>
  );
}

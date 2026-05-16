import React, { useState } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import { PageLayout } from "../components/layout/PageLayout";
import { SessionRequiredNotice } from "../modules/auth";
import { useSession } from "../modules/auth/hooks/useSession";
import {
  ProfitAndLossReport,
  TrialBalanceReport,
  BalanceSheetReport,
  CashFlowReport,
} from "../modules/aurum/components";
import { useConsoleOverview } from "../modules/console";
export default function FinancialReports() {
  const { session } = useSession();
  const { data: consoleData } = useConsoleOverview();
  const [selectedEntityId, setSelectedEntityId] = useState<string>("");
  const [selectedPeriod, setSelectedPeriod] = useState<string>(
    new Date().toISOString().split("T")[0].slice(0, 7) + "-01",
  );
  if (!session) {
    return (
      <PageLayout>
        {" "}
        <div className="mx-auto max-w-3xl px-6 py-12 sm:px-10">
          {" "}
          <SessionRequiredNotice description="Authenticate to access financial reports." />{" "}
        </div>{" "}
      </PageLayout>
    );
  } // Get available entities const entities = consoleData?.modules?.find( (m: any) => m.id ==="outlets" )?.data || []; const currentEntityId = selectedEntityId || (entities.length > 0 ? entities[0].id :""); return ( <PageLayout> <div className="mx-auto max-w-7xl overflow-hidden px-6 py-8 sm:px-10"> <div className="space-y-8 ml-5 pl-5"> {/* Page Header */} <div className="space-y-2"> <h1 className="text-3xl font-bold text-foreground"> Financial Reports </h1> <p className="text-muted-foreground"> Comprehensive financial statements including P&L, Balance Sheet, Trial Balance, and Cash Flow </p> </div> {/* Entity and Period Selection */} <div className="grid gap-4 md:grid-cols-2 mb-8"> <div> <label className="text-sm font-medium text-foreground mb-2 block"> Select Entity/Location </label> <select value={currentEntityId} onChange={(e) => setSelectedEntityId(e.target.value)} className="w-full px-3 py-2 border border-border/40 rounded-lg bg-surface text-foreground text-sm" > {entities.map((entity: any) => ( <option key={entity.id} value={entity.id}> {entity.name} </option> ))} </select> </div> <div> <label className="text-sm font-medium text-foreground mb-2 block"> Select Period </label> <input type="month" value={selectedPeriod.slice(0, 7)} onChange={(e) => { const [year, month] = e.target.value.split("-"); setSelectedPeriod(`${year}-${month}-01`); }} className="w-full px-3 py-2 border border-border/40 rounded-lg bg-surface text-foreground text-sm" /> </div> </div> {/* Reports Tabs */} <Tabs defaultValue="pl" className="space-y-4"> <TabsList className="grid w-full grid-cols-4"> <TabsTrigger value="pl">Profit & Loss</TabsTrigger> <TabsTrigger value="bs">Balance Sheet</TabsTrigger> <TabsTrigger value="tb">Trial Balance</TabsTrigger> <TabsTrigger value="cf">Cash Flow</TabsTrigger> </TabsList> {/* Profit & Loss Report Tab */} <TabsContent value="pl" className="space-y-4"> {currentEntityId ? ( <ProfitAndLossReport entityId={currentEntityId} defaultPeriod={selectedPeriod} /> ) : ( <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6"> <p className="text-sm text-amber-200"> Please select an entity to view the P&L report. </p> </div> )} </TabsContent> {/* Balance Sheet Tab */} <TabsContent value="bs" className="space-y-4"> {currentEntityId ? ( <BalanceSheetReport entityId={currentEntityId} defaultPeriod={selectedPeriod} /> ) : ( <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6"> <p className="text-sm text-amber-200"> Please select an entity to view the Balance Sheet. </p> </div> )} </TabsContent> {/* Trial Balance Tab */} <TabsContent value="tb" className="space-y-4"> {currentEntityId ? ( <TrialBalanceReport entityId={currentEntityId} defaultPeriod={selectedPeriod} /> ) : ( <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6"> <p className="text-sm text-amber-200"> Please select an entity to view the Trial Balance. </p> </div> )} </TabsContent> {/* Cash Flow Tab */} <TabsContent value="cf" className="space-y-4"> {currentEntityId ? ( <CashFlowReport entityId={currentEntityId} defaultPeriod={selectedPeriod} /> ) : ( <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6"> <p className="text-sm text-amber-200"> Please select an entity to view the Cash Flow Statement. </p> </div> )} </TabsContent> </Tabs> </div> </div> </PageLayout> );
}

import React, { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import type { AttributionRule } from "@/../shared/types/attribution";
import {
  initializeGenesisDRules,
  listAttributionRules,
  listAttributionAudit,
  toggleAttributionRule,
} from "@/lib/attribution-store";
export default function GenesisDPanel() {
  const { t } = useI18n();
  const [rules, setRules] = useState<AttributionRule[]>(() => {
    initializeGenesisDRules();
    return listAttributionRules();
  });
  const audit = useMemo(() => listAttributionAudit().slice(0, 10), [rules]);
  useEffect(() => {
    setRules(listAttributionRules());
  }, []);
  return (
    <div className="w-full h-full flex flex-col bg-background overflow-hidden">
      {" "}
      <div className="flex-shrink-0 border-b border-border/30 p-4">
        {" "}
        <div className="flex items-start justify-between gap-3">
          {" "}
          <div>
            {" "}
            <div className="text-lg font-semibold text-foreground">
              {" "}
              {t("module.genesis-d.title")}{" "}
            </div>{" "}
            <div className="text-sm text-foreground/70 mt-1">
              {" "}
              {t("module.genesis-d.description")}{" "}
            </div>{" "}
          </div>{" "}
          <div className="flex items-center gap-2">
            {" "}
            <ModuleChatButton
              moduleId="genesis-d"
              moduleName={t("module.genesis-d.title")}
            />{" "}
            <Badge>v1</Badge>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {" "}
        <Card className="p-4">
          {" "}
          <div className="font-semibold text-foreground">Rules</div>{" "}
          <div className="text-sm text-foreground/70 mt-1">
            {" "}
            Highest priority enabled rule wins. Defaults protect operations if
            rules are missing.{" "}
          </div>{" "}
          <div className="mt-4 space-y-3">
            {" "}
            {rules.map((r) => (
              <div
                key={r.ruleId}
                className="flex items-start justify-between gap-3 border border-border/30 rounded p-3"
              >
                {" "}
                <div className="flex-1">
                  {" "}
                  <div className="flex items-center gap-2">
                    {" "}
                    <span className="font-semibold text-foreground">
                      {" "}
                      {r.name}{" "}
                    </span>{" "}
                    <Badge variant="secondary">
                      priority {r.priority}
                    </Badge>{" "}
                  </div>{" "}
                  <div className="text-xs text-foreground/70 mt-2 space-y-1">
                    {" "}
                    <div>
                      {" "}
                      mode: <b>{r.mode}</b> • creditProducer:{""}{" "}
                      <b>{String(r.creditProducer)}</b>{" "}
                    </div>{" "}
                    <div>scope: {JSON.stringify(r.scope)}</div>{" "}
                    {r.note ? (
                      <div className="text-xs mt-1">{r.note}</div>
                    ) : null}{" "}
                  </div>{" "}
                </div>{" "}
                <div className="flex flex-col items-end gap-2">
                  {" "}
                  <Badge variant={r.enabled ? "outline" : "secondary"}>
                    {" "}
                    {r.enabled ? "ENABLED" : "DISABLED"}{" "}
                  </Badge>{" "}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      toggleAttributionRule(r.ruleId, !r.enabled, "admin");
                      setRules(listAttributionRules());
                    }}
                  >
                    {" "}
                    Toggle{" "}
                  </Button>{" "}
                </div>{" "}
              </div>
            ))}{" "}
          </div>{" "}
        </Card>{" "}
        <Card className="p-4">
          {" "}
          <div className="font-semibold text-foreground">
            {" "}
            Recent Audit Notes{" "}
          </div>{" "}
          <div className="text-sm text-foreground/70 mt-1">
            {" "}
            These notes are used for clean transparency in EchoAurum.{" "}
          </div>{" "}
          <ul className="mt-3 space-y-2">
            {" "}
            {audit.map((a) => (
              <li key={a.auditId} className="text-sm">
                {" "}
                <div className="flex items-start gap-2">
                  {" "}
                  <Badge variant="secondary" className="flex-shrink-0 mt-0.5">
                    {" "}
                    {a.action}{" "}
                  </Badge>{" "}
                  <div className="flex-1 opacity-90">
                    {" "}
                    <div className="text-xs text-foreground/70">
                      {" "}
                      {a.changedAtISO.slice(0, 19).replace("T", "")}{" "}
                    </div>{" "}
                    <div>{a.note}</div>{" "}
                  </div>{" "}
                </div>{" "}
              </li>
            ))}{" "}
          </ul>{" "}
        </Card>{" "}
      </div>{" "}
    </div>
  );
}

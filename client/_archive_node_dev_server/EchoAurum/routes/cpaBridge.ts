import type { RequestHandler } from "express";
import {
  buildDocuSignBundle,
  composeBinder,
  createPbcPortalState,
  hasAccess,
  validateChecklist,
} from "../../shared/cpaBridge";
export const handleCpaAccess: RequestHandler = (req, res) => {
  const { context, request } = req.body ?? {};
  if (!context || !request) {
    return res.status(400).json({ error: "context and request required" });
  }
  res.json({ allowed: hasAccess(context, request) });
};
export const handleBinderCompose: RequestHandler = (req, res) => {
  const { ledgerId, period, sections } = req.body ?? {};
  if (!ledgerId || !period || !Array.isArray(sections)) {
    return res
      .status(400)
      .json({ error: "ledgerId, period, sections required" });
  }
  res.json({ binder: composeBinder({ ledgerId, period, sections }) });
};
export const handlePbcPortal: RequestHandler = (req, res) => {
  const { requests } = req.body ?? {};
  if (!Array.isArray(requests)) {
    return res.status(400).json({ error: "requests array required" });
  }
  res.json({ portal: createPbcPortalState(requests) });
};
export const handleChecklistValidation: RequestHandler = (req, res) => {
  const { items } = req.body ?? {};
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "items array required" });
  }
  res.json({ validation: validateChecklist(items) });
};
export const handleDocuSignBundle: RequestHandler = (req, res) => {
  const { snapshot, recipients } = req.body ?? {};
  if (!snapshot || !Array.isArray(recipients)) {
    return res.status(400).json({ error: "snapshot and recipients required" });
  }
  res.json({ bundle: buildDocuSignBundle({ snapshot, recipients }) });
};

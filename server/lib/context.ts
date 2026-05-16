import { AsyncLocalStorage } from "async_hooks";

export interface RequestContext {
  orgId?: string;
  userId?: string;
  requestId?: string;
}

export const requestContext = new AsyncLocalStorage<RequestContext>();

export const getRequestContext = () => requestContext.getStore() || {};

export const getOrgId = () => getRequestContext().orgId;
export const getUserId = () => getRequestContext().userId;
export const getRequestId = () => getRequestContext().requestId;

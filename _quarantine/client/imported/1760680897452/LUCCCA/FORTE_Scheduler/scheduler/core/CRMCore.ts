/**
 * CRMCore
 * Handles integration for Banquet Event Orders (BEOs) and Restaurant Event Orders (REOs).
 */
import { BEOInput } from '@data/beoModels';
import { REOInput } from '@data/reoModels';

export const CRMCore = {
  fetchBEOs(): Promise<BEOInput[]> {
    // TODO: Integrate with CRM API or data store
    return Promise.resolve([]);
  },
  fetchREOs(): Promise<REOInput[]> {
    // TODO: Integrate with outlet events
    return Promise.resolve([]);
  }
};

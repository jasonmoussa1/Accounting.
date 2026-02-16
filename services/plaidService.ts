
import { Transaction } from '../types';
import { functions } from '../lib/firebase';
import { httpsCallable } from 'firebase/functions';

// PLAID SERVICE (Production Hardened)
// Relies on Firebase Cloud Functions to handle secrets. 
// Never stores access_tokens in the browser.

export const createLinkToken = async (userId: string): Promise<string> => {
  if (!functions) throw new Error("Firebase Functions not initialized");
  
  console.log(`[Plaid] Calling Cloud Function: createLinkToken for ${userId}...`);
  // Hard dependency on backend. No mock fallbacks allowed in production.
  const createLinkTokenFn = httpsCallable<{userId: string}, {link_token: string}>(functions, 'plaidCreateLinkToken');
  const result = await createLinkTokenFn({ userId });
  return result.data.link_token;
};

export const exchangePublicToken = async (userId: string, publicToken: string, metadata: any) => {
  if (!functions) throw new Error("Firebase Functions not initialized");

  console.log(`[Plaid] Calling Cloud Function: exchangePublicToken...`);
  const exchangePublicTokenFn = httpsCallable(functions, 'plaidExchangePublicToken');
  
  // Hand off the public token to the secure backend immediately
  return await exchangePublicTokenFn({ userId, publicToken, metadata });
};

export const syncTransactions = async (userId: string): Promise<Transaction[]> => {
  if (!functions) throw new Error("Firebase Functions not initialized");

  console.log(`[Plaid] Calling Cloud Function: syncTransactions...`);
  const syncTransactionsFn = httpsCallable<{userId: string}, {transactions: Transaction[]}>(functions, 'plaidSyncTransactions');
  
  try {
    const result = await syncTransactionsFn({ userId });
    return result.data.transactions;
  } catch (error) {
    console.error("Sync Failed:", error);
    // Return empty or throw based on UX preference
    throw error;
  }
};

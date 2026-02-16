
import { Transaction } from '../types';
import { applyRules } from './accounting';

// PLAID SERVICE (Production Ready Architecture)
// Note: In a real deployment, the API calls below would point to your Firebase Cloud Functions.
// For this environment, we mock the network response but keep the logic structure correct.

const API_BASE = '/api/plaid'; // Hypothetical Backend Endpoint

export const createLinkToken = async (userId: string): Promise<string> => {
  console.log(`[Plaid] Requesting Link Token for user ${userId}...`);
  
  // REAL ARCHITECTURE:
  // const response = await fetch(`${API_BASE}/create_link_token`, { 
  //   method: 'POST', body: JSON.stringify({ userId }) 
  // });
  // const data = await response.json();
  // return data.link_token;

  // SIMULATION:
  await new Promise(resolve => setTimeout(resolve, 500));
  return "link-sandbox-" + Math.random().toString(36).substring(7);
};

export const exchangePublicToken = async (userId: string, publicToken: string, metadata: any) => {
  console.log(`[Plaid] Exchanging Public Token: ${publicToken}`);
  
  // REAL ARCHITECTURE:
  // This sends the public_token to the backend. The backend swaps it for an access_token
  // and stores it securely in Firestore/Secret Manager. It NEVER returns the access_token to the client.
  // await fetch(`${API_BASE}/exchange_public_token`, { 
  //   method: 'POST', body: JSON.stringify({ userId, publicToken, metadata }) 
  // });

  // SIMULATION:
  await new Promise(resolve => setTimeout(resolve, 1000));
  return { success: true, itemId: "item_" + Math.random() };
};

export const syncTransactions = async (userId: string): Promise<Transaction[]> => {
  console.log(`[Plaid] Syncing transactions for user ${userId}...`);

  // REAL ARCHITECTURE:
  // Calls the backend to use the stored access_token to fetch /transactions/sync from Plaid.
  // The backend processes pending/posted logic and returns clean data.
  // const response = await fetch(`${API_BASE}/sync_transactions`, { method: 'POST', ... });
  // return await response.json();

  // SIMULATION: Return realistic "Live" data including Pending items
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return [
    {
        id: 'tx_pending_1',
        userId,
        date: new Date().toISOString().split('T')[0],
        description: 'Uber *Pending',
        amount: -24.50,
        bankAccountId: '1000',
        status: 'imported',
        transactionType: 'expense',
        pending: true,
        merchantName: 'Uber',
        category: 'Travel'
    },
    {
        id: 'tx_posted_1',
        userId,
        date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
        description: 'Home Depot #4402',
        amount: -145.22,
        bankAccountId: '1000',
        status: 'imported',
        transactionType: 'expense',
        pending: false, // Cleared
        merchantName: 'Home Depot',
        category: 'Supplies',
        plaidTransactionId: 'plaid_id_12345' // Critical for dedupe
    },
    {
        id: 'tx_posted_2',
        userId,
        date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
        description: 'Client Deposit - Stripe',
        amount: 4500.00,
        bankAccountId: '1000',
        status: 'imported',
        transactionType: 'income',
        pending: false,
        merchantName: 'Stripe',
        category: 'Income',
        plaidTransactionId: 'plaid_id_67890'
    }
  ];
};

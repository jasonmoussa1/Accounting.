
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { Configuration, PlaidApi, PlaidEnvironments, CountryCode, Products } from 'plaid';
import { defineSecret } from "firebase-functions/params";

admin.initializeApp();
const db = admin.firestore();

// Secrets Configuration
const PLAID_CLIENT_ID = defineSecret("PLAID_CLIENT_ID");
const PLAID_SECRET = defineSecret("PLAID_SECRET");

// --- PLAID CLIENT FACTORY ---
const getPlaidClient = () => {
    const configuration = new Configuration({
        basePath: PlaidEnvironments.sandbox, // Change to .production for live environment
        baseOptions: {
            headers: {
                'PLAID-CLIENT-ID': PLAID_CLIENT_ID.value(),
                'PLAID-SECRET': PLAID_SECRET.value(),
            },
        },
    });
    return new PlaidApi(configuration);
};

// --- TASK 1: CREATE LINK TOKEN ---
export const plaidCreateLinkToken = onCall({ secrets: [PLAID_CLIENT_ID, PLAID_SECRET] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    const userId = request.auth.uid;
    
    try {
        const client = getPlaidClient();
        const response = await client.linkTokenCreate({
            user: { client_user_id: userId },
            client_name: 'CustomBooks Finance',
            products: [Products.Transactions],
            country_codes: [CountryCode.Us],
            language: 'en',
        });
        return { link_token: response.data.link_token };
    } catch (error: any) {
        logger.error("Plaid Link Token Error", error);
        throw new HttpsError('internal', error.message || 'Plaid API Error');
    }
});

// --- TASK 2: EXCHANGE PUBLIC TOKEN ---
export const plaidExchangePublicToken = onCall({ secrets: [PLAID_CLIENT_ID, PLAID_SECRET] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    const { publicToken, metadata } = request.data;
    const userId = request.auth.uid;

    if (!publicToken) {
        throw new HttpsError('invalid-argument', 'Missing public_token');
    }

    try {
        const client = getPlaidClient();
        const response = await client.itemPublicTokenExchange({ public_token: publicToken });
        const accessToken = response.data.access_token;
        const itemId = response.data.item_id;

        // SECURITY: Store access_token in a restricted collection.
        // Frontend has NO access to 'bank_connections' via Firestore Rules.
        await db.collection('bank_connections').add({
            userId,
            accessToken,
            itemId,
            institutionId: metadata?.institution?.institution_id || 'unknown',
            institutionName: metadata?.institution?.name || 'Unknown Bank',
            status: 'active',
            createdAt: new Date().toISOString()
        });

        logger.info(`Linked bank account for user ${userId}`);
        return { success: true };
    } catch (error: any) {
        logger.error("Plaid Exchange Error", error);
        throw new HttpsError('internal', error.message || 'Plaid Exchange Failed');
    }
});

// --- TASK 3: SYNC TRANSACTIONS ---
export const plaidSyncTransactions = onCall({ secrets: [PLAID_CLIENT_ID, PLAID_SECRET] }, async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    const userId = request.auth.uid;
    const client = getPlaidClient();

    // 1. Get active connections
    const connectionsSnap = await db.collection('bank_connections')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();

    if (connectionsSnap.empty) {
        return { transactions: [] };
    }

    const newTransactions: any[] = [];
    const endDate = new Date().toISOString().split('T')[0];
    // Pull last 30 days
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // 2. Iterate connections
    for (const doc of connectionsSnap.docs) {
        const connection = doc.data();
        const accessToken = connection.accessToken;

        try {
            const response = await client.transactionsGet({
                access_token: accessToken,
                start_date: startDate,
                end_date: endDate,
            });

            const plaidTxs = response.data.transactions;
            if (plaidTxs.length === 0) continue;

            // 3. Deduplication: Check existing IDs
            const batch = db.batch();
            let batchCount = 0;

            for (const pt of plaidTxs) {
                // Check if transaction exists using Plaid Transaction ID
                const existingSnap = await db.collection('transactions')
                    .where('userId', '==', userId)
                    .where('plaidTransactionId', '==', pt.transaction_id)
                    .limit(1)
                    .get();

                if (!existingSnap.empty) {
                    continue; // Skip duplicate
                }

                const newTxRef = db.collection('transactions').doc();
                
                // Plaid returns positive values for money out (expenses). 
                // Our system: Negative = Expense, Positive = Income.
                const systemAmount = pt.amount > 0 ? -pt.amount : Math.abs(pt.amount);

                const txData = {
                    userId,
                    id: newTxRef.id,
                    date: pt.date,
                    description: pt.name,
                    amount: systemAmount, 
                    bankAccountId: '1000', // Default placeholder. In prod, map `pt.account_id` to internal Asset Account ID.
                    status: 'imported', // Auto-tag as imported
                    transactionType: systemAmount < 0 ? 'expense' : 'income',
                    plaidTransactionId: pt.transaction_id,
                    plaidAccountId: pt.account_id,
                    merchantName: pt.merchant_name || pt.name,
                    pending: pt.pending,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                
                batch.set(newTxRef, txData);
                newTransactions.push(txData);
                batchCount++;
            }

            if (batchCount > 0) {
                await batch.commit();
                logger.info(`Synced ${batchCount} transactions for connection ${doc.id}`);
            }

        } catch (err: any) {
            logger.error(`Error syncing connection ${doc.id}`, err);
            // Continue to next connection even if one fails
        }
    }

    return { transactions: newTransactions };
});

// --- TASK 4: SECURE JOURNAL ENTRY POST ---
export const postJournalEntrySecure = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    const userId = request.auth.uid;
    const { entry } = request.data;

    if (!entry || !entry.lines || !Array.isArray(entry.lines)) {
        throw new HttpsError('invalid-argument', 'Invalid entry structure.');
    }

    // 1. MATH CHECK (Double Entry Integrity)
    // Javascript floating point math can be tricky, so we use a small epsilon for comparison
    const totalDebits = entry.lines.reduce((sum: number, line: any) => sum + (Number(line.debit) || 0), 0);
    const totalCredits = entry.lines.reduce((sum: number, line: any) => sum + (Number(line.credit) || 0), 0);
    
    if (Math.abs(totalDebits - totalCredits) > 0.01) {
        throw new HttpsError(
            'invalid-argument', 
            `Ledger imbalance detected. Debits ($${totalDebits}) != Credits ($${totalCredits}).`
        );
    }

    // 2. LOCK CHECK (Period Protection)
    const entryDate = entry.date;
    const accountIds = entry.lines.map((l: any) => l.accountId);
    
    const uniqueAccountIds = [...new Set(accountIds)];
    
    if (uniqueAccountIds.length > 0) {
        // Query locked periods for these accounts
        const locksSnap = await db.collection('reconciliations')
            .where('userId', '==', userId)
            .where('isLocked', '==', true)
            .where('accountId', 'in', uniqueAccountIds.slice(0, 30)) // Limit check for safety
            .get();

        for (const doc of locksSnap.docs) {
            const lock = doc.data();
            // If the lock date is AFTER or ON the entry date, the period is closed.
            if (lock.statementEndDate >= entryDate) {
                throw new HttpsError(
                    'failed-precondition', 
                    `Period Locked: Account ${lock.accountId} is closed through ${lock.statementEndDate}.`
                );
            }
        }
    }

    // 3. WRITE TO LEDGER
    const timestamp = new Date().toISOString();
    const finalEntry = {
        ...entry,
        userId,
        createdAt: timestamp,
        updatedAt: timestamp
    };
    
    const docRef = await db.collection('journal_entries').add(finalEntry);
    
    logger.info(`Journal Entry ${docRef.id} posted securely by ${userId}`);
    return { id: docRef.id };
});

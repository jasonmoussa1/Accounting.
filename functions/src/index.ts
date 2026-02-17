
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

    const connectionsSnap = await db.collection('bank_connections')
        .where('userId', '==', userId)
        .where('status', '==', 'active')
        .get();

    if (connectionsSnap.empty) {
        return { transactions: [] };
    }

    const newTransactions: any[] = [];
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

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

            const batch = db.batch();
            let batchCount = 0;

            for (const pt of plaidTxs) {
                const existingSnap = await db.collection('transactions')
                    .where('userId', '==', userId)
                    .where('plaidTransactionId', '==', pt.transaction_id)
                    .limit(1)
                    .get();

                if (!existingSnap.empty) continue;

                const newTxRef = db.collection('transactions').doc();
                const systemAmount = pt.amount > 0 ? -pt.amount : Math.abs(pt.amount);

                const txData = {
                    userId,
                    id: newTxRef.id,
                    date: pt.date,
                    description: pt.name,
                    amount: systemAmount, 
                    bankAccountId: '1000', 
                    status: 'imported',
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
        }
    }

    return { transactions: newTransactions };
});

// --- TASK 4: SECURE JOURNAL ENTRY POST (THE ENGINE) ---
export const postJournalEntrySecure = onCall(async (request) => {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be logged in.');
    }
    const userId = request.auth.uid;
    const { entry, linkedTransactionId } = request.data;

    if (!entry || !entry.lines || !Array.isArray(entry.lines)) {
        throw new HttpsError('invalid-argument', 'Invalid entry structure.');
    }

    // Run everything in a Transaction for Atomicity & Locking
    return await db.runTransaction(async (t) => {
        
        // 1. LOCK CHECK (Read First)
        // Query all locks for this user.
        // Optimization: In a huge system we'd filter by account, but for per-user accounting this is safe.
        const locksQuery = db.collection('reconciliations')
            .where('userId', '==', userId)
            .where('isLocked', '==', true);
        
        const locksSnap = await t.get(locksQuery);
        
        // Helper to check if any involved account is locked for the entry date
        const involvedAccountIds = new Set(entry.lines.map((l: any) => l.accountId));
        
        locksSnap.docs.forEach(doc => {
            const lock = doc.data();
            if (involvedAccountIds.has(lock.accountId)) {
                if (entry.date <= lock.statementEndDate) {
                    throw new HttpsError(
                        'failed-precondition', 
                        `Period Locked: Account ${lock.accountId} is closed through ${lock.statementEndDate}. Cannot post to ${entry.date}.`
                    );
                }
            }
        });

        // 2. LINKED TRANSACTION CHECK
        let txRef;
        if (linkedTransactionId) {
            txRef = db.collection('transactions').doc(linkedTransactionId);
            const txSnap = await t.get(txRef);
            
            if (!txSnap.exists) {
                throw new HttpsError('not-found', `Transaction ${linkedTransactionId} not found.`);
            }
            const tx = txSnap.data();
            if (tx?.userId !== userId) {
                throw new HttpsError('permission-denied', 'Transaction belongs to another user.');
            }
            if (tx?.status === 'posted') {
                throw new HttpsError('failed-precondition', 'Transaction is already posted.');
            }
        }

        // 3. VALIDATION & SANITIZATION (Integer Enforcement)
        let totalDebits = 0;
        let totalCredits = 0;
        const sanitizedLines = [];

        for (const line of entry.lines) {
            // Business Integrity
            if (!line.businessId) {
                line.businessId = entry.businessId || 'Big Sky FPV'; // Fallback
            }

            // Integer Enforcement
            let debit = Number(line.debit) || 0;
            let credit = Number(line.credit) || 0;

            const safeDebit = Math.round(debit);
            const safeCredit = Math.round(credit);

            if (Math.abs(debit - safeDebit) > 0.0001 || Math.abs(credit - safeCredit) > 0.0001) {
                logger.warn(`Floating point detected in user ${userId} entry. Rounding ${debit} -> ${safeDebit}, ${credit} -> ${safeCredit}`);
            }

            // Use Integer/Cents
            sanitizedLines.push({
                ...line,
                debit: safeDebit,
                credit: safeCredit
            });

            totalDebits += safeDebit;
            totalCredits += safeCredit;
        }

        // Balance Check (Integer Math)
        if (totalDebits !== totalCredits) {
            throw new HttpsError(
                'invalid-argument', 
                `Ledger Imbalance: Debits (${totalDebits}) != Credits (${totalCredits}).`
            );
        }

        // 4. WRITE OPERATIONS
        const jeRef = db.collection('journal_entries').doc();
        const timestamp = new Date().toISOString();
        
        const finalEntry = {
            ...entry,
            lines: sanitizedLines, // Use sanitized lines
            userId,
            createdAt: timestamp,
            updatedAt: timestamp
        };

        t.set(jeRef, finalEntry);

        // Atomic Update of Source Transaction
        if (txRef) {
            t.update(txRef, {
                status: 'posted',
                linkedJournalEntryId: jeRef.id,
                updatedAt: timestamp
            });
        }

        // Audit Log
        const auditRef = db.collection('audit_events').doc();
        t.set(auditRef, {
            userId,
            action: 'POST_JOURNAL_ENTRY',
            details: `Posted JE ${jeRef.id} ($${totalDebits}) linked to Tx ${linkedTransactionId || 'None'}`,
            timestamp,
            createdAt: timestamp
        });

        return { id: jeRef.id };
    });
});

// --- TASK 5: ATOMIC TRANSACTION POSTING (Wrapper) ---
// Keeps compatibility with frontend calls to 'postTransactionSecure'
export const postTransactionSecure = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const userId = request.auth.uid;
    const { transactionId } = request.data;

    // Fetch the transaction first (outside the atomic write block, to construct the entry)
    const txSnap = await db.collection('transactions').doc(transactionId).get();
    if (!txSnap.exists) throw new HttpsError('not-found', 'Transaction not found');
    const tx = txSnap.data() as any;

    if (tx.userId !== userId) throw new HttpsError('permission-denied', 'Access denied');

    // Construct the Lines based on Transaction Logic
    // NOTE: We do not round here, we let postJournalEntrySecure handle the Integer Enforcement
    const lines: any[] = [];
    const absAmount = Math.abs(tx.amount);
    const isIncome = tx.amount > 0;

    // 1. Bank Line
    lines.push({
        accountId: tx.bankAccountId,
        debit: isIncome ? absAmount : 0,
        credit: isIncome ? 0 : absAmount,
        description: tx.description,
        businessId: tx.assignedBusiness
    });

    // 2. Offset Line(s)
    if (tx.transactionType === 'transfer') {
        lines.push({
            accountId: tx.transferAccountId,
            debit: isIncome ? 0 : absAmount,
            credit: isIncome ? absAmount : 0,
            description: "Transfer Offset",
            businessId: tx.assignedBusiness
        });
    } else {
        if (tx.splits && tx.splits.length > 0) {
            tx.splits.forEach((split: any) => {
                const splitAbs = Math.abs(split.amount);
                lines.push({
                    accountId: split.accountId,
                    debit: isIncome ? 0 : splitAbs,
                    credit: isIncome ? splitAbs : 0,
                    description: split.description || tx.description,
                    businessId: split.businessId || tx.assignedBusiness,
                    projectId: split.projectId || tx.assignedProject || null,
                    contractorId: split.contractorId || tx.assignedContractorId || null
                });
            });
        } else {
            lines.push({
                accountId: tx.assignedAccount,
                debit: isIncome ? 0 : absAmount,
                credit: isIncome ? absAmount : 0,
                description: tx.description,
                businessId: tx.assignedBusiness,
                projectId: tx.assignedProject || null,
                contractorId: tx.assignedContractorId || null
            });
        }
    }

    // Construct Entry
    const entry = {
        date: tx.date,
        description: tx.description,
        businessId: tx.assignedBusiness,
        lines
    };

    // Delegate to the Secure function logic logic 
    // We re-implement the lock logic here to ensure it runs inside *this* transaction context
    return await db.runTransaction(async (t) => {
        // 1. Lock Check
        const locksQuery = db.collection('reconciliations').where('userId', '==', userId).where('isLocked', '==', true);
        const locksSnap = await t.get(locksQuery);
        const involvedAccountIds = new Set(lines.map(l => l.accountId));
        locksSnap.docs.forEach(doc => {
            const lock = doc.data();
            if (involvedAccountIds.has(lock.accountId) && tx.date <= lock.statementEndDate) {
                throw new HttpsError('failed-precondition', `Period Locked: Account ${lock.accountId} closed.`);
            }
        });

        // 2. Tx Status Check (inside transaction)
        const txRef = db.collection('transactions').doc(transactionId);
        const freshTxSnap = await t.get(txRef);
        if (freshTxSnap.data()?.status === 'posted') {
             throw new HttpsError('failed-precondition', 'Already posted.');
        }

        // 3. Write JE
        const jeRef = db.collection('journal_entries').doc();
        const timestamp = new Date().toISOString();
        t.set(jeRef, {
            ...entry,
            userId,
            createdAt: timestamp,
            updatedAt: timestamp
        });

        // 4. Update Tx
        t.update(txRef, {
            status: 'posted',
            linkedJournalEntryId: jeRef.id,
            updatedAt: timestamp
        });

        return { journalEntryId: jeRef.id };
    });
});

// --- TASK 6: ATOMIC INVOICE PAYMENT ---
export const recordInvoicePaymentSecure = onCall(async (request) => {
    if (!request.auth) throw new HttpsError('unauthenticated', 'User must be logged in.');
    const userId = request.auth.uid;
    const { invoiceId, amount, date, method } = request.data;

    return await db.runTransaction(async (t) => {
        const invRef = db.collection('invoices').doc(invoiceId);
        const invSnap = await t.get(invRef);
        if (!invSnap.exists) throw new HttpsError('not-found', 'Invoice not found');
        
        const invoice = invSnap.data() as any;
        if (invoice.userId !== userId) throw new HttpsError('permission-denied', 'Access denied');

        // Fetch System Accounts (Optimized: Assume known or fetch once. Here we query.)
        const accountsSnap = await db.collection('accounts').where('userId', '==', userId).get();
        const accounts = accountsSnap.docs.map(d => ({id: d.id, ...d.data()})) as any[];
        const findId = (c: string) => accounts.find(a => a.code === c)?.id;
        
        const undepositedId = findId('1002');
        const salesId = findId('4000');
        
        if (!undepositedId || !salesId) throw new HttpsError('failed-precondition', 'System accounts missing.');

        // Lock Check
        const locksQuery = db.collection('reconciliations').where('userId', '==', userId).where('isLocked', '==', true);
        const locksSnap = await t.get(locksQuery);
        locksSnap.docs.forEach(doc => {
            const lock = doc.data();
            if ((lock.accountId === undepositedId || lock.accountId === salesId) && date <= lock.statementEndDate) {
                throw new HttpsError('failed-precondition', 'Period Locked.');
            }
        });

        // Writes
        const timestamp = new Date().toISOString();
        
        // JE
        const jeRef = db.collection('journal_entries').doc();
        t.set(jeRef, {
            userId,
            date,
            description: `Payment for Inv #${invoice.invoiceNumber}`,
            businessId: invoice.businessId,
            lines: [
                { accountId: undepositedId, debit: Number(amount), credit: 0, description: 'Undeposited Funds', businessId: invoice.businessId },
                { accountId: salesId, debit: 0, credit: Number(amount), description: 'Sales Income', businessId: invoice.businessId }
            ],
            createdAt: timestamp,
            updatedAt: timestamp
        });

        // Payment Record
        const payRef = db.collection('invoice_payments').doc();
        t.set(payRef, {
            userId,
            invoiceId,
            date,
            amount: Number(amount),
            method,
            linkedJournalEntryId: jeRef.id,
            createdAt: timestamp,
            updatedAt: timestamp
        });

        // Update Invoice
        const newPaid = (Number(invoice.amountPaid) || 0) + Number(amount);
        t.update(invRef, {
            amountPaid: newPaid,
            status: newPaid >= invoice.totalAmount ? 'paid' : 'partial',
            updatedAt: timestamp
        });

        return { success: true };
    });
});

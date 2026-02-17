
import { 
    collection, 
    query, 
    where, 
    getDocs, 
    addDoc, 
    updateDoc, 
    doc, 
    deleteDoc, 
    setDoc
  } from "firebase/firestore";
  import { db, isFirebaseReady } from "../lib/firebase";
  import { FirestoreEntity } from "../types";
  
  // COLLECTION NAMES
  export const COLLECTIONS = {
    ACCOUNTS: 'accounts',
    JOURNAL: 'journal_entries',
    TRANSACTIONS: 'transactions',
    PROJECTS: 'projects',
    CONTRACTORS: 'contractors',
    CUSTOMERS: 'customers',
    INVOICES: 'invoices',
    INVOICE_PAYMENTS: 'invoice_payments',
    RECONCILIATIONS: 'reconciliations',
    MERCHANT_PROFILES: 'merchant_profiles',
    SERVICE_ITEMS: 'service_items',
    SETTINGS: 'system_settings',
    AUDIT_EVENTS: 'audit_events'
  };

  /**
   * REPOSITORY PATTERN
   * Enforces userId on all queries and writes.
   * HARD FAIL if Firebase is offline.
   */
  export class FirestoreRepository {
    
    private static checkConnection() {
        if (!isFirebaseReady || !db) {
            // HARD BLOCKER: Do not fallback to memory.
            throw new Error("CRITICAL: Persistence layer is offline. Data cannot be saved.");
        }
    }

    // READ (List)
    static async getCollection<T>(collectionName: string, userId: string): Promise<T[]> {
      this.checkConnection();
      if (!userId) throw new Error("Security Error: No User ID provided for query.");
      
      const q = query(collection(db!, collectionName), where("userId", "==", userId));
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as T[];
    }

    // READ (Date Range) - For Pagination & Reports
    static async getCollectionByDateRange<T>(
        collectionName: string, 
        userId: string, 
        startDate: string, 
        endDate: string,
        dateField: string = 'date'
    ): Promise<T[]> {
        this.checkConnection();
        if (!userId) throw new Error("Security Error: No User ID provided for query.");

        // NOTE: Requires composite index on [userId, dateField] in Firestore
        const q = query(
            collection(db!, collectionName), 
            where("userId", "==", userId),
            where(dateField, ">=", startDate),
            where(dateField, "<=", endDate)
        );
        const querySnapshot = await getDocs(q);
        
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as T[];
    }
  
    // CREATE (Auto ID)
    static async addDocument<T extends Omit<FirestoreEntity, 'id'>>(
      collectionName: string, 
      data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'userId'>, 
      userId: string
    ): Promise<string> {
      this.checkConnection();
      if (!userId) throw new Error("Security Error: No User ID provided for write.");
  
      const timestamp = new Date().toISOString();
      const payload = {
        ...data,
        userId,
        createdAt: timestamp,
        updatedAt: timestamp
      };
  
      const docRef = await addDoc(collection(db!, collectionName), payload);
      return docRef.id;
    }
  
    // CREATE (Manual ID)
    static async setDocument<T extends Omit<FirestoreEntity, 'id'>>(
      collectionName: string,
      docId: string,
      data: Omit<T, 'id' | 'createdAt' | 'updatedAt' | 'userId'>,
      userId: string
    ): Promise<void> {
      this.checkConnection();
      if (!userId) throw new Error("Security Error: No User ID provided for write.");
  
      const timestamp = new Date().toISOString();
      const payload = {
        ...data,
        userId,
        updatedAt: timestamp
      };
      
      await setDoc(doc(db!, collectionName, docId), payload, { merge: true });
    }
  
    // UPDATE
    static async updateDocument(collectionName: string, docId: string, data: Partial<any>, userId: string): Promise<void> {
        this.checkConnection();
        if (!userId) throw new Error("Security Error: No User ID provided for update.");
        
        const timestamp = new Date().toISOString();
        const payload = { ...data, updatedAt: timestamp };
        
        const docRef = doc(db!, collectionName, docId);
        await updateDoc(docRef, payload);
    }
  
    // DELETE
    static async deleteDocument(collectionName: string, docId: string): Promise<void> {
      this.checkConnection();
      await deleteDoc(doc(db!, collectionName, docId));
    }
  }

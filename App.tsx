
import React, { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { Transactions } from './components/Transactions';
import { Contractors } from './components/Contractors';
import { Invoices } from './components/Invoices';
import { Migration } from './components/Migration';
import { Projects } from './components/Projects';
import { Inbox } from './components/Inbox';
import { Reconciliation } from './components/Reconciliation';
import { Reports } from './components/Reports';
import { ChartOfAccounts } from './components/ChartOfAccounts';
import { OpeningBalances } from './components/OpeningBalances';
import { Customers } from './components/Customers';
import { Login } from './components/Login';
import { Settings } from './components/Settings';
import { NavPath } from './types';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { FinanceProvider } from './contexts/FinanceContext';
import { isFirebaseReady } from './lib/firebase';
import { AlertOctagon } from 'lucide-react';

const OfflineBanner: React.FC = () => {
    if (isFirebaseReady) return null;
    return (
        <div className="bg-rose-600 text-white p-2 text-center text-sm font-bold flex items-center justify-center gap-2 sticky top-0 z-[100]">
            <AlertOctagon size={16} />
            CRITICAL: PERSISTENCE OFFLINE - DATA WILL NOT BE SAVED. CHECK FIREBASE CONFIG.
        </div>
    );
};

const AppContent: React.FC = () => {
  const { currentUser } = useAuth();
  const [currentPath, setCurrentPath] = useState<NavPath>('reports');

  if (!currentUser) {
    return (
        <>
            <OfflineBanner />
            <Login />
        </>
    );
  }

  const renderContent = () => {
    switch (currentPath) {
      case 'dashboard':
        return <Dashboard />;
      case 'inbox':
        return <Inbox />;
      case 'transactions':
        return <Transactions />;
      case 'projects':
        return <Projects />;
      case 'reconciliation':
        return <Reconciliation />;
      case 'invoices':
        return <Invoices />;
      case 'customers':
        return <Customers />;
      case 'contractors':
        return <Contractors />;
      case 'reports':
        return <Reports />;
      case 'migration':
        return <Migration />;
      case 'coa':
        return <ChartOfAccounts />;
      case 'setup':
        return <OpeningBalances />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <FinanceProvider>
        <div className="flex h-screen bg-slate-50 overflow-hidden flex-col">
        <OfflineBanner />
        <div className="flex flex-1 overflow-hidden">
            <Sidebar currentPath={currentPath} onNavigate={setCurrentPath} />
            <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                {renderContent()}
            </main>
        </div>
        </div>
    </FinanceProvider>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;

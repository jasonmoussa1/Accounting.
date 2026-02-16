
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
import { NavPath } from './types';

const App: React.FC = () => {
  const [currentPath, setCurrentPath] = useState<NavPath>('dashboard');

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
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar currentPath={currentPath} onNavigate={setCurrentPath} />
      <main className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;

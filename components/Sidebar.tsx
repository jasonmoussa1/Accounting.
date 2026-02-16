
import React from 'react';
import { NavPath } from '../types';
import { LayoutDashboard, Receipt, FileText, Users, HardHat, BarChart3, Settings, LogOut, ArrowLeftRight, Briefcase, Inbox, Scale, FolderTree, Power } from 'lucide-react';

interface SidebarProps {
  currentPath: NavPath;
  onNavigate: (path: NavPath) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPath, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inbox', label: 'Inbox', icon: Inbox },
    { id: 'transactions', label: 'Transactions', icon: Receipt },
    { id: 'projects', label: 'Projects', icon: Briefcase },
    { id: 'reconciliation', label: 'Reconcile', icon: Scale },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'contractors', label: 'Contractors', icon: HardHat },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'migration', label: 'Migration', icon: ArrowLeftRight },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center text-xs text-white">C</div>
          CustomBooks
        </h1>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const isActive = currentPath === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as NavPath)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {item.label}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800 space-y-1">
        <button 
          onClick={() => onNavigate('setup')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentPath === 'setup' ? 'bg-emerald-900 text-emerald-400' : 'hover:bg-slate-800 hover:text-white'
          }`}
        >
          <Power size={18} />
          Opening Balances
        </button>
        <button 
          onClick={() => onNavigate('coa')}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentPath === 'coa' ? 'bg-slate-800 text-white' : 'hover:bg-slate-800 hover:text-white'
          }`}
        >
          <FolderTree size={18} />
          Chart of Accounts
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 hover:text-white transition-colors">
          <Settings size={18} />
          Settings
        </button>
        <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors">
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

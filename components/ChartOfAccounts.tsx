
import React, { useState, useMemo } from 'react';
import { useFinance } from '../contexts/FinanceContext';
import { Account, AccountType } from '../types';
import { Search, Archive, Edit2, AlertTriangle, CheckCircle, ChevronRight, ChevronDown, Plus } from 'lucide-react';

export const ChartOfAccounts: React.FC = () => {
  const { accounts, updateAccount, addAccount } = useFinance();
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['5000', '6000', '1500'])); // Default expand major categories

  const toggleExpand = (id: string) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const filteredAccounts = useMemo(() => {
    return accounts.filter(a => 
      a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      a.code.includes(searchTerm)
    );
  }, [searchTerm, accounts]);

  // Recursive render
  const renderTree = (parentId?: string, level = 0) => {
    const nodes = filteredAccounts.filter(a => a.parentId === parentId);
    
    // Sort by code for standard accounting order
    nodes.sort((a, b) => a.code.localeCompare(b.code));

    if (nodes.length === 0) return null;

    return nodes.map(node => {
      const hasChildren = filteredAccounts.some(a => a.parentId === node.id);
      const isExpanded = expanded.has(node.id) || searchTerm !== ''; // Auto expand on search
      
      return (
        <React.Fragment key={node.id}>
          <div className={`flex items-center p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group ${node.status === 'archived' ? 'opacity-50 grayscale' : ''}`}>
            <div className="flex-1 flex items-center gap-3" style={{ paddingLeft: `${level * 24}px` }}>
              <button 
                onClick={() => toggleExpand(node.id)}
                className={`p-1 rounded hover:bg-slate-200 text-slate-400 ${hasChildren ? 'visible' : 'invisible'}`}
              >
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              
              <div className="flex flex-col">
                <span className={`font-medium text-sm flex items-center gap-2 ${level === 0 ? 'text-slate-900 text-base' : 'text-slate-700'}`}>
                   {node.name}
                   {node.status === 'archived' && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 rounded uppercase">Archived</span>}
                </span>
                <span className="text-xs text-slate-400 font-mono">{node.code} • {node.type}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
               <button 
                 className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg"
                 title="Edit"
                 onClick={() => {
                   const newName = prompt("Rename Account:", node.name);
                   if (newName) updateAccount(node.id, { name: newName });
                 }}
               >
                 <Edit2 size={14} />
               </button>
               {node.status !== 'archived' && (
                 <button 
                   className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 rounded-lg"
                   title="Archive"
                   onClick={() => {
                     if (confirm(`Archive ${node.name}? It will be hidden from selection menus.`)) {
                       updateAccount(node.id, { status: 'archived' });
                     }
                   }}
                 >
                   <Archive size={14} />
                 </button>
               )}
            </div>
          </div>
          {isExpanded && renderTree(node.id, level + 1)}
        </React.Fragment>
      );
    });
  };

  // Roots
  const rootTypes: AccountType[] = ['Asset', 'Liability', 'Equity', 'Income', 'Cost of Services', 'Expense'];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
       <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Chart of Accounts</h2>
          <p className="text-slate-500">Manage your financial categories and hierarchy.</p>
        </div>
        <button 
            onClick={async () => {
                const name = prompt("Account Name:");
                if (name) await addAccount(name);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all text-sm font-medium shadow-sm"
        >
          <Plus size={16} /> New Account
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search accounts..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="overflow-y-auto">
          {rootTypes.map(type => {
            const roots = filteredAccounts.filter(a => a.type === type && !a.parentId);
            if (roots.length === 0 && !searchTerm) return null;

            return (
              <div key={type}>
                <div className="bg-slate-50 px-4 py-2 text-xs font-bold uppercase text-slate-500 border-b border-slate-100">
                  {type}
                </div>
                {/* Render Logic: Manually render roots to ensure correct grouping by Type */}
                {roots.map(root => (
                   <React.Fragment key={root.id}>
                      <div className={`flex items-center p-3 border-b border-slate-100 hover:bg-slate-50 transition-colors group ${root.status === 'archived' ? 'opacity-50 grayscale' : ''}`}>
                        <div className="flex-1 flex items-center gap-3">
                          <button 
                            onClick={() => toggleExpand(root.id)}
                            className={`p-1 rounded hover:bg-slate-200 text-slate-400`}
                          >
                            {(expanded.has(root.id) || searchTerm) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                          
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-900 text-base flex items-center gap-2">
                              {root.name}
                              {root.status === 'archived' && <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 rounded uppercase">Archived</span>}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">{root.code}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button 
                                onClick={() => {
                                    const newName = prompt("Rename:", root.name);
                                    if(newName) updateAccount(root.id, {name: newName});
                                }}
                                className="p-2 text-slate-400 hover:text-indigo-600 bg-white hover:bg-indigo-50 border border-slate-200 rounded-lg"
                           >
                               <Edit2 size={14} />
                           </button>
                           {root.status !== 'archived' && (
                               <button 
                                    onClick={() => updateAccount(root.id, {status: 'archived'})}
                                    className="p-2 text-slate-400 hover:text-rose-600 bg-white hover:bg-rose-50 border border-slate-200 rounded-lg"
                               >
                                   <Archive size={14} />
                               </button>
                           )}
                        </div>
                      </div>
                      {(expanded.has(root.id) || searchTerm) && renderTree(root.id, 1)}
                   </React.Fragment>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};


import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Account, AccountType } from '../types';
import { mockAccounts, addAccount } from '../services/accounting';
import { Search, Plus, ChevronDown, Check, Tag, FolderTree } from 'lucide-react';

interface CategorySelectProps {
  value: string | undefined;
  onChange: (accountId: string) => void;
  className?: string;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({ value, onChange, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedAccount = mockAccounts.find(a => a.id === value);
  const activeAccounts = useMemo(() => mockAccounts.filter(a => a.status !== 'archived'), [mockAccounts.length]);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredAccounts = useMemo(() => {
    if (!searchTerm) return activeAccounts;
    return activeAccounts.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, activeAccounts]);

  // Grouping logic for display
  const groupedOptions = useMemo(() => {
    const types: AccountType[] = ['Cost of Services', 'Expense', 'Asset', 'Liability', 'Equity', 'Income'];
    const groups: { type: AccountType, roots: { account: Account, children: { account: Account, children: Account[] }[] }[] }[] = [];

    types.forEach(type => {
      const roots = filteredAccounts.filter(a => a.type === type && !a.parentId);
      if (roots.length === 0 && filteredAccounts.some(a => a.type === type)) {
        // If we have orphans (due to search filtering parent out), find their root type at least
      }
      
      const typeGroups = roots.map(root => {
        const children = filteredAccounts.filter(a => a.parentId === root.id);
        const childStructs = children.map(child => ({
           account: child,
           children: filteredAccounts.filter(a => a.parentId === child.id)
        }));
        return { account: root, children: childStructs };
      });

      if (typeGroups.length > 0 || (searchTerm && filteredAccounts.some(a => a.type === type))) {
         groups.push({ type, roots: typeGroups });
      }
    });
    return groups;
  }, [filteredAccounts, searchTerm]);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Add Modal State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryParent, setNewCategoryParent] = useState('');

  const openAddModal = () => {
    setNewCategoryName(searchTerm);
    // Try to infer parent from current selection or logic? Defaulting to empty for now.
    setNewCategoryParent(selectedAccount?.parentId || selectedAccount?.id || ''); 
    setShowAddModal(true);
    setIsOpen(false);
  };

  const handleCreate = () => {
    try {
      if (!newCategoryParent) {
        alert("Please select a parent category.");
        return;
      }
      const newAcc = addAccount(newCategoryName, newCategoryParent);
      onChange(newAcc.id);
      setShowAddModal(false);
      setSearchTerm('');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const getIndent = (level: number) => {
    return level === 0 ? '' : level === 1 ? 'ml-4' : 'ml-8';
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
       {/* Trigger Input */}
       <div 
         className="relative cursor-pointer"
         onClick={() => { setIsOpen(!isOpen); if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50); }}
       >
         <Tag className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
         <div className={`w-full pl-8 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm flex items-center min-h-[38px] ${isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500' : ''}`}>
           {selectedAccount ? (
             <span className="font-medium text-slate-900 truncate">{selectedAccount.name}</span>
           ) : (
             <span className="text-slate-400">Select Category...</span>
           )}
         </div>
         <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
       </div>

       {/* Dropdown Popover */}
       {isOpen && (
         <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-80 flex flex-col">
           <div className="p-2 border-b border-slate-100 bg-slate-50">
             <div className="relative">
               <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <input 
                 ref={inputRef}
                 type="text" 
                 placeholder="Search categories..."
                 className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
             </div>
           </div>
           
           <div className="overflow-y-auto flex-1 p-1">
             {groupedOptions.length === 0 && searchTerm && (
               <div className="p-3 text-center">
                 <p className="text-sm text-slate-500 mb-2">Category not found.</p>
                 <button 
                   onClick={openAddModal}
                   className="flex items-center justify-center gap-2 w-full py-1.5 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                 >
                   <Plus size={14} /> Create "{searchTerm}"
                 </button>
               </div>
             )}

             {groupedOptions.map(group => (
               <div key={group.type}>
                 <div className="px-3 py-1.5 text-[10px] font-bold uppercase text-slate-400 tracking-wider bg-slate-50/50 mt-1 first:mt-0">
                   {group.type}
                 </div>
                 {group.roots.map(root => (
                   <React.Fragment key={root.account.id}>
                     <div 
                       className={`px-3 py-2 text-sm text-slate-900 hover:bg-indigo-50 rounded cursor-pointer font-semibold flex justify-between items-center ${value === root.account.id ? 'bg-indigo-50 text-indigo-700' : ''}`}
                       onClick={() => handleSelect(root.account.id)}
                     >
                       {root.account.name}
                       {value === root.account.id && <Check size={14} />}
                     </div>
                     {root.children.map(child => (
                       <React.Fragment key={child.account.id}>
                         <div 
                           className={`px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 rounded cursor-pointer pl-6 flex justify-between items-center ${value === child.account.id ? 'bg-indigo-50 text-indigo-700' : ''}`}
                           onClick={() => handleSelect(child.account.id)}
                         >
                           {child.account.name}
                           {value === child.account.id && <Check size={14} />}
                         </div>
                         {child.children.map(grandchild => (
                           <div 
                             key={grandchild.id} 
                             className={`px-3 py-2 text-sm text-slate-600 hover:bg-indigo-50 rounded cursor-pointer pl-10 flex justify-between items-center ${value === grandchild.id ? 'bg-indigo-50 text-indigo-700' : ''}`}
                             onClick={() => handleSelect(grandchild.id)}
                           >
                             {grandchild.name}
                             {value === grandchild.id && <Check size={14} />}
                           </div>
                         ))}
                       </React.Fragment>
                     ))}
                   </React.Fragment>
                 ))}
               </div>
             ))}
             
             {!searchTerm && (
                <div 
                  className="mt-2 pt-2 border-t border-slate-100 px-2 pb-2"
                  onClick={openAddModal}
                >
                  <button className="flex items-center gap-2 w-full py-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-lg text-sm transition-colors justify-center">
                    <Plus size={14} /> Add New Category
                  </button>
                </div>
             )}
           </div>
         </div>
       )}

       {/* ADD MODAL */}
       {showAddModal && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4">
           <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6">
             <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
               <FolderTree size={20} className="text-indigo-600" />
               New Category
             </h3>
             
             <div className="space-y-4">
               <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Account Name</label>
                 <input 
                   type="text" 
                   value={newCategoryName}
                   onChange={(e) => setNewCategoryName(e.target.value)}
                   className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                   placeholder="e.g. Underwater Drone Rig"
                   autoFocus
                 />
               </div>
               
               <div>
                 <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Parent Category</label>
                 <div className="relative">
                    <select
                      value={newCategoryParent}
                      onChange={(e) => setNewCategoryParent(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="" disabled>Select Parent...</option>
                      {activeAccounts.filter(a => !a.parentId || activeAccounts.some(parent => parent.id === a.parentId && !parent.parentId)).map(a => (
                        <option key={a.id} value={a.id}>
                          {a.type} &gt; {a.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                 </div>
                 <p className="text-xs text-slate-400 mt-1">
                   New category will inherit type <strong>{mockAccounts.find(a => a.id === newCategoryParent)?.type || '...'}</strong>
                 </p>
               </div>
             </div>

             <div className="flex justify-end gap-3 mt-8">
               <button 
                 onClick={() => setShowAddModal(false)}
                 className="px-4 py-2 text-slate-600 hover:text-slate-900 text-sm font-medium"
               >
                 Cancel
               </button>
               <button 
                 onClick={handleCreate}
                 className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 text-sm font-medium shadow-sm"
               >
                 Create Category
               </button>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

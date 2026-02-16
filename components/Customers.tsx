
import React, { useState } from 'react';
import { mockCustomers } from '../services/accounting';
import { Search, Plus, MapPin, Mail, Building, Phone } from 'lucide-react';

export const Customers: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCustomers = mockCustomers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Customer Directory</h2>
          <p className="text-slate-500">Manage clients and billing information.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all text-sm font-medium shadow-sm">
          <Plus size={16} /> New Customer
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search customers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
           {filteredCustomers.map(customer => (
             <div key={customer.id} className="border border-slate-200 rounded-xl p-5 hover:border-indigo-300 transition-colors group bg-white hover:shadow-sm">
                <div className="flex justify-between items-start mb-3">
                   <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <Building size={20} />
                   </div>
                   {customer.defaultBusiness && (
                     <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-50 text-slate-500 px-2 py-1 rounded border border-slate-100">
                       {customer.defaultBusiness === 'Big Sky FPV' ? 'FPV' : 'Band'}
                     </span>
                   )}
                </div>
                
                <h3 className="font-bold text-slate-900 text-lg mb-1">{customer.name}</h3>
                {customer.contactPerson && <p className="text-sm text-slate-500 mb-4">{customer.contactPerson}</p>}

                <div className="space-y-2 text-sm text-slate-600">
                  <div className="flex items-center gap-2">
                    <Mail size={14} className="text-slate-400" />
                    {customer.email}
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin size={14} className="text-slate-400 mt-0.5" />
                    <span>{customer.city}, {customer.state}</span>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t border-slate-100 flex justify-end">
                   <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-800">View History</button>
                </div>
             </div>
           ))}
           {filteredCustomers.length === 0 && (
             <div className="col-span-full py-12 text-center text-slate-400">
               No customers found.
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

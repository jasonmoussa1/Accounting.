
import React, { useState, useRef, useMemo } from 'react';
import { InvoiceItem, InvoiceStatus, Customer, BusinessId, Invoice } from '../types';
import { Autocomplete } from './Autocomplete';
import { Plus, Trash2, Upload, Save, Send, Calendar, Hash, Building, Eye, ChevronLeft } from 'lucide-react';
import { useFinance } from '../contexts/FinanceContext';

export const Invoices: React.FC = () => {
  const { customers, serviceItems, addCustomer, saveInvoice, recordInvoicePayment, invoices } = useFinance();
  
  const [view, setView] = useState<'list' | 'create'>('list');

  // --- Create State ---
  const [businessId, setBusinessId] = useState<BusinessId>('Big Sky FPV'); 
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2024-001');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  
  const [customerId, setCustomerId] = useState<string>('');
  const [manualCustomer, setManualCustomer] = useState<Partial<Customer>>({ name: '', email: '', address: '', city: '', state: '', zip: '' });
  const [saveCustomerToCatalog, setSaveCustomerToCatalog] = useState(false);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Derived Data ---
  const customerOptions = useMemo(() => customers.map(c => ({
    id: c.id,
    label: c.name,
    subLabel: c.contactPerson,
    badge: c.defaultBusiness,
    data: c
  })), [customers]);

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  // BLOCKER 4: REMOVE TAX
  const total = subtotal; 

  const handleCustomerChange = (id: string, data: any) => {
    setCustomerId(id);
    if (data) {
      setManualCustomer(data);
      if (data.defaultBusiness) setBusinessId(data.defaultBusiness);
    }
  };

  const handleNewCustomer = (name: string) => {
    setCustomerId('new'); 
    setManualCustomer({ ...manualCustomer, name });
    setSaveCustomerToCatalog(true);
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, rate: 0 }]);
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeItem = (id: string) => setItems(items.filter(item => item.id !== id));

  const handleSave = async () => {
    let finalCustomerId = customerId;
    
    // Save New Customer First
    if (customerId === 'new' && saveCustomerToCatalog && manualCustomer.name) {
      try {
        const newCust = await addCustomer({
            name: manualCustomer.name!,
            email: manualCustomer.email || '',
            address: manualCustomer.address || '',
            city: manualCustomer.city || '',
            state: manualCustomer.state || '',
            zip: manualCustomer.zip || '',
            defaultBusiness: businessId
        });
        finalCustomerId = newCust.id;
        alert(`Saved ${newCust.name} to directory!`);
      } catch(e: any) {
        alert(e.message);
        return;
      }
    } else if (!finalCustomerId) {
        alert("Please select a customer.");
        return;
    }

    try {
        await saveInvoice({
            invoiceNumber,
            customerId: finalCustomerId,
            businessId,
            dateIssued: date,
            dueDate,
            items,
            totalAmount: total,
            amountPaid: 0,
            status: 'draft',
            logoUrl: undefined
        });
        alert("Invoice Saved Successfully!");
        setView('list');
    } catch(e: any) {
        alert("Failed to save: " + e.message);
    }
  };

  const handleMarkPaid = async (inv: Invoice) => {
      const confirmed = confirm(`Record full payment of $${inv.totalAmount} for Invoice #${inv.invoiceNumber}?`);
      if (!confirmed) return;

      try {
          await recordInvoicePayment({
              invoiceId: inv.id,
              amount: inv.totalAmount - inv.amountPaid,
              date: new Date().toISOString().split('T')[0],
              method: 'Check'
          });
          alert("Payment recorded.");
      } catch (e: any) {
          alert(e.message);
      }
  };

  if (view === 'list') {
      return (
          <div className="p-8 max-w-7xl mx-auto space-y-6">
              <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-slate-900">Invoices</h2>
                  <button onClick={() => setView('create')} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 font-medium">
                      <Plus size={16} /> Create Invoice
                  </button>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                      <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                          <tr>
                              <th className="px-6 py-3">Number</th>
                              <th className="px-6 py-3">Customer</th>
                              <th className="px-6 py-3">Date</th>
                              <th className="px-6 py-3">Due Date</th>
                              <th className="px-6 py-3 text-right">Total</th>
                              <th className="px-6 py-3 text-right">Paid</th>
                              <th className="px-6 py-3 text-center">Status</th>
                              <th className="px-6 py-3 text-center">Action</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {invoices.map(inv => {
                              const custName = customers.find(c => c.id === inv.customerId)?.name || 'Unknown';
                              return (
                                  <tr key={inv.id} className="hover:bg-slate-50">
                                      <td className="px-6 py-4 font-mono font-medium">{inv.invoiceNumber}</td>
                                      <td className="px-6 py-4">{custName}</td>
                                      <td className="px-6 py-4">{inv.dateIssued}</td>
                                      <td className="px-6 py-4">{inv.dueDate}</td>
                                      <td className="px-6 py-4 text-right font-bold">${inv.totalAmount.toLocaleString()}</td>
                                      <td className="px-6 py-4 text-right text-emerald-600">${inv.amountPaid.toLocaleString()}</td>
                                      <td className="px-6 py-4 text-center">
                                          <span className={`px-2 py-1 text-xs uppercase font-bold rounded ${
                                              inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                              inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 
                                              'bg-slate-100 text-slate-600'
                                          }`}>
                                              {inv.status}
                                          </span>
                                      </td>
                                      <td className="px-6 py-4 text-center">
                                          {inv.status !== 'paid' && (
                                              <button onClick={() => handleMarkPaid(inv)} className="text-indigo-600 hover:underline text-xs font-bold">Mark Paid</button>
                                          )}
                                      </td>
                                  </tr>
                              )
                          })}
                          {invoices.length === 0 && <tr><td colSpan={8} className="text-center py-8 text-slate-400">No invoices found.</td></tr>}
                      </tbody>
                  </table>
              </div>
          </div>
      );
  }

  // CREATE VIEW
  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      <div className="flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => setView('list')} className="p-2 hover:bg-slate-100 rounded-full"><ChevronLeft /></button>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">New Invoice</h2>
            <p className="text-slate-500">Create smart invoices with system memory.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 mr-4">
             <Building size={16} className="text-slate-400 ml-2 mr-1" />
             <select 
               value={businessId}
               onChange={(e) => setBusinessId(e.target.value as BusinessId)}
               className="bg-transparent text-sm font-semibold text-slate-700 focus:outline-none py-1 pr-2"
             >
               <option value="Big Sky FPV">Big Sky FPV</option>
               <option value="TRL Band">TRL Band</option>
             </select>
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-colors text-sm font-medium shadow-sm shadow-indigo-200"
          >
            <Save size={16} /> Save Invoice
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden min-h-0">
        {/* EDITOR */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-6 overflow-y-auto space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Invoice Number</label>
                <div className="relative">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                  />
                </div>
              </div>
              <div className="space-y-2">
                 {/* Logo placeholder - implementation skipped for brevity */}
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Date Issued</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="date" 
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Due Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input 
                    type="date" 
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
               <Autocomplete 
                 label="Client / Customer"
                 options={customerOptions}
                 value={customerId === 'new' ? '' : customerId}
                 onChange={handleCustomerChange}
                 onAddNew={handleNewCustomer}
                 placeholder="Search or add new customer..."
               />
               <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Contact Person" className="px-3 py-2 border rounded text-sm" value={manualCustomer.contactPerson || ''} onChange={e => setManualCustomer({...manualCustomer, contactPerson: e.target.value})} />
                  <input type="email" placeholder="Email" className="px-3 py-2 border rounded text-sm" value={manualCustomer.email || ''} onChange={e => setManualCustomer({...manualCustomer, email: e.target.value})} />
               </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Line Items</label>
                <button onClick={addItem} className="text-xs flex items-center gap-1 text-indigo-600 font-bold hover:text-indigo-700">
                  <Plus size={12} /> Add Item
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-start group">
                    <div className="flex-1 space-y-2">
                      <input 
                        type="text" 
                        placeholder="Description" 
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                      />
                    </div>
                    <div className="w-20">
                      <input 
                        type="number" 
                        placeholder="Qty" 
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-center"
                      />
                    </div>
                    <div className="w-32">
                      <input 
                        type="number" 
                        placeholder="Rate" 
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm text-right"
                      />
                    </div>
                    <div className="w-24 pt-2 text-right font-mono text-sm font-bold text-slate-700">
                      ${(item.quantity * item.rate).toFixed(2)}
                    </div>
                    <button onClick={() => removeItem(item.id)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-mono font-bold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-bold text-slate-900 mt-4 pt-4 border-t border-slate-900">
                <span>Total Due</span>
                <span className="font-mono">${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* PREVIEW (Simplified) */}
        <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-inner flex items-center justify-center text-slate-400">
            <div className="text-center">
                <Eye size={48} className="mx-auto mb-2 opacity-50" />
                <p>PDF Preview</p>
            </div>
        </div>
      </div>
    </div>
  );
};

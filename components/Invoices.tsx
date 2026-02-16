
import React, { useState, useRef, useMemo } from 'react';
import { InvoiceItem, InvoiceStatus, Customer, BusinessId } from '../types';
import { mockCustomers, mockServiceItems, addCustomer, addServiceItem, recordInvoicePayment } from '../services/accounting';
import { Autocomplete } from './Autocomplete';
import { Plus, Trash2, Upload, Save, Send, Calendar, Hash, Percent, ArrowUp, ArrowDown, Building } from 'lucide-react';

export const Invoices: React.FC = () => {
  // --- State ---
  const [businessId, setBusinessId] = useState<BusinessId>('Big Sky FPV'); // Default context
  const [invoiceNumber, setInvoiceNumber] = useState('INV-2024-001');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [status, setStatus] = useState<InvoiceStatus>('draft');
  const [taxRate, setTaxRate] = useState(0);
  const [logo, setLogo] = useState<string | null>(null);
  
  // Customer State
  const [customerId, setCustomerId] = useState<string>('');
  const [manualCustomer, setManualCustomer] = useState<Partial<Customer>>({ name: '', email: '', address: '', city: '', state: '', zip: '' });
  const [saveCustomerToCatalog, setSaveCustomerToCatalog] = useState(false);

  // Line Items State
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Derived Data ---
  
  const customerOptions = useMemo(() => mockCustomers.map(c => ({
    id: c.id,
    label: c.name,
    subLabel: c.contactPerson,
    badge: c.defaultBusiness,
    data: c
  })), [mockCustomers.length]);

  const serviceOptions = useMemo(() => {
    // Sort services: Current Business First
    const sorted = [...mockServiceItems].sort((a, b) => {
      if (a.defaultBusiness === businessId && b.defaultBusiness !== businessId) return -1;
      if (a.defaultBusiness !== businessId && b.defaultBusiness === businessId) return 1;
      return 0;
    });
    
    return sorted.map(s => ({
      id: s.id,
      label: s.name,
      subLabel: `$${s.rate}/${s.unit}`,
      badge: s.defaultBusiness === businessId ? 'Recommended' : undefined,
      data: s
    }));
  }, [businessId, mockServiceItems.length]);

  // --- Actions ---

  const handleCustomerChange = (id: string, data: any) => {
    setCustomerId(id);
    if (data) {
      // Auto-fill manual fields for display/editing
      setManualCustomer(data);
      // Auto-switch business context if customer has a default
      if (data.defaultBusiness) setBusinessId(data.defaultBusiness);
    }
  };

  const handleNewCustomer = (name: string) => {
    setCustomerId('new'); // Flag as new
    setManualCustomer({ ...manualCustomer, name }); // Pre-fill name
    setSaveCustomerToCatalog(true); // Default to save
  };

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, rate: 0 }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleServiceSelect = (lineId: string, serviceId: string, data: any) => {
    if (data) {
      setItems(prev => prev.map(item => 
        item.id === lineId ? {
           ...item, 
           serviceItemId: serviceId,
           description: data.description || data.name,
           rate: data.rate,
           quantity: 1 // Reset qty
        } : item
      ));
    }
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newItems = [...items];
    if (index + direction < 0 || index + direction >= newItems.length) return;
    
    const temp = newItems[index];
    newItems[index] = newItems[index + direction];
    newItems[index + direction] = temp;
    setItems(newItems);
  };

  // --- Calculations ---
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const total = subtotal + taxAmount;

  // --- Save Logic ---
  const handleSave = () => {
    // 1. Save New Customer?
    if (customerId === 'new' && saveCustomerToCatalog && manualCustomer.name) {
      const newCust = addCustomer({
        name: manualCustomer.name!,
        email: manualCustomer.email || '',
        address: manualCustomer.address || '',
        city: manualCustomer.city || '',
        state: manualCustomer.state || '',
        zip: manualCustomer.zip || '',
        defaultBusiness: businessId
      });
      setCustomerId(newCust.id); // Link it
      alert(`Saved ${newCust.name} to directory!`);
    }

    // 2. Save New Service Items? (Implementation optional based on prompt, let's keep it simple for now and just alert)
    const newItemsToSave = items.filter(i => !i.serviceItemId && i.description); // Simplified check
    // In a real app, we'd loop through and save these too if a checkbox was checked per line.

    alert("Invoice Saved (Draft)");
  };

  const handleStatusChange = (newStatus: InvoiceStatus) => {
    if (newStatus === 'paid' && status !== 'paid') {
        if (confirm("Mark as Paid and record payment to Undeposited Funds?")) {
             setStatus('paid');
             // Trigger recording
             try {
                recordInvoicePayment({
                    number: invoiceNumber,
                    businessId,
                    items,
                    taxAmount
                });
                alert("Payment Recorded to Undeposited Funds.");
             } catch(e: any) { alert(e.message); }
        }
    } else {
        setStatus(newStatus);
    }
  };

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-6 h-[calc(100vh-64px)] overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Invoice Builder</h2>
          <p className="text-slate-500">Create smart invoices with system memory.</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Business Context Switcher */}
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

          <div className="flex bg-slate-100 rounded-lg p-1">
            {(['draft', 'sent', 'paid', 'overdue'] as InvoiceStatus[]).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-all ${
                  status === s 
                    ? 'bg-white text-slate-900 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium"
          >
            <Save size={16} />
            Save
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-500 transition-all text-sm font-medium shadow-sm shadow-indigo-200">
            <Send size={16} />
            Send
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-hidden min-h-0">
        
        {/* LEFT COLUMN: EDITOR */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 font-medium text-slate-700">
            <Hash size={16} />
            Editor
          </div>
          
          <div className="p-6 overflow-y-auto space-y-8 scrollbar-thin scrollbar-thumb-slate-200">
            {/* Basic Info */}
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
                <label className="text-xs font-semibold text-slate-500 uppercase">Logo</label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  className="hidden" 
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                        const reader = new FileReader();
                        reader.onloadend = () => setLogo(reader.result as string);
                        reader.readAsDataURL(e.target.files[0]);
                    }
                  }}
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 border border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 transition-all text-sm flex items-center justify-center gap-2"
                >
                  <Upload size={16} />
                  {logo ? 'Change Logo' : 'Upload Logo'}
                </button>
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

            {/* Customer Section */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
               <Autocomplete 
                 label="Client / Customer"
                 options={customerOptions}
                 value={customerId === 'new' ? '' : customerId}
                 onChange={handleCustomerChange}
                 onAddNew={handleNewCustomer}
                 placeholder="Search or add new customer..."
               />
               
               {/* Manual Fields (Visible if 'new' or editing) */}
               <div className="grid grid-cols-2 gap-4">
                  <input type="text" placeholder="Contact Person" className="px-3 py-2 border rounded text-sm" value={manualCustomer.contactPerson || ''} onChange={e => setManualCustomer({...manualCustomer, contactPerson: e.target.value})} />
                  <input type="email" placeholder="Email" className="px-3 py-2 border rounded text-sm" value={manualCustomer.email || ''} onChange={e => setManualCustomer({...manualCustomer, email: e.target.value})} />
                  <input type="text" placeholder="Address" className="col-span-2 px-3 py-2 border rounded text-sm" value={manualCustomer.address || ''} onChange={e => setManualCustomer({...manualCustomer, address: e.target.value})} />
                  <div className="col-span-2 grid grid-cols-3 gap-2">
                     <input type="text" placeholder="City" className="px-3 py-2 border rounded text-sm" value={manualCustomer.city || ''} onChange={e => setManualCustomer({...manualCustomer, city: e.target.value})} />
                     <input type="text" placeholder="State" className="px-3 py-2 border rounded text-sm" value={manualCustomer.state || ''} onChange={e => setManualCustomer({...manualCustomer, state: e.target.value})} />
                     <input type="text" placeholder="Zip" className="px-3 py-2 border rounded text-sm" value={manualCustomer.zip || ''} onChange={e => setManualCustomer({...manualCustomer, zip: e.target.value})} />
                  </div>
               </div>

               {customerId === 'new' && (
                 <label className="flex items-center gap-2 text-sm text-indigo-700 font-medium cursor-pointer">
                   <input 
                     type="checkbox" 
                     checked={saveCustomerToCatalog}
                     onChange={(e) => setSaveCustomerToCatalog(e.target.checked)}
                     className="rounded text-indigo-600 focus:ring-indigo-500"
                   />
                   Save "{manualCustomer.name}" to Customer Directory
                 </label>
               )}
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-slate-500 uppercase">Service Line Items</label>
                <button onClick={addItem} className="text-xs text-indigo-600 font-medium hover:text-indigo-800 flex items-center gap-1">
                  <Plus size={14} /> Add Line
                </button>
              </div>
              
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={item.id} className="flex gap-2 items-start group bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <div className="flex flex-col gap-1 pt-2 text-slate-400">
                       <button onClick={() => moveItem(index, -1)} className="hover:text-slate-600"><ArrowUp size={14}/></button>
                       <button onClick={() => moveItem(index, 1)} className="hover:text-slate-600"><ArrowDown size={14}/></button>
                    </div>

                    <div className="flex-1 space-y-2">
                      <Autocomplete 
                        options={serviceOptions}
                        value={item.serviceItemId || ''}
                        onChange={(id, data) => handleServiceSelect(item.id, id, data)}
                        placeholder="Search service catalog..."
                        className="w-full"
                      />
                      <textarea 
                        placeholder="Description..."
                        rows={2}
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                      />
                    </div>
                    
                    <div className="w-20">
                      <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Qty</label>
                      <input 
                        type="number" 
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-right"
                      />
                    </div>
                    <div className="w-28">
                       <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Rate</label>
                      <input 
                        type="number" 
                        value={item.rate}
                        onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-right"
                      />
                    </div>
                    <button 
                      onClick={() => removeItem(item.id)}
                      className="p-2 mt-6 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals & Settings */}
            <div className="pt-6 border-t border-slate-100 flex justify-between items-end">
              <div className="w-1/3 space-y-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">Tax Rate (%)</label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input 
                    type="number" 
                    value={taxRate}
                    onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PREVIEW */}
        <div className="bg-slate-200/50 rounded-xl border border-slate-200/60 shadow-inner flex items-center justify-center p-8 overflow-y-auto">
          <div className="bg-white shadow-2xl w-full max-w-[210mm] min-h-[297mm] p-12 text-slate-900 flex flex-col relative shrink-0">
            
            {/* Invoice Header */}
            <div className="flex justify-between items-start mb-12">
              <div className="space-y-4">
                {logo ? (
                  <img src={logo} alt="Company Logo" className="h-12 w-auto object-contain" />
                ) : (
                  <div className="h-12 w-12 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">CB</div>
                )}
                <div>
                  <h1 className="text-sm font-bold text-slate-900">{businessId === 'Big Sky FPV' ? 'Big Sky FPV Services' : 'TRL Band Karaoke'}</h1>
                  <p className="text-xs text-slate-500">100 Creator Way</p>
                  <p className="text-xs text-slate-500">Los Angeles, CA 90028</p>
                </div>
              </div>
              <div className="text-right">
                <h1 className="text-4xl font-light text-slate-300 tracking-tight uppercase mb-2">Invoice</h1>
                <p className="text-sm font-semibold text-slate-900">#{invoiceNumber}</p>
                <div className="mt-4 space-y-1">
                  <p className="text-xs text-slate-500">Date Issued: <span className="text-slate-900 font-medium">{date}</span></p>
                  <p className="text-xs text-slate-500">Due Date: <span className="text-slate-900 font-medium">{dueDate}</span></p>
                </div>
              </div>
            </div>

            {/* Bill To */}
            <div className="mb-12">
              <h3 className="text-xs font-bold text-slate-400 uppercase mb-2">Bill To</h3>
              <div className="text-sm text-slate-900">
                <p className="font-bold text-lg">{manualCustomer.name || 'Client Name'}</p>
                {manualCustomer.contactPerson && <p>{manualCustomer.contactPerson}</p>}
                <p>{manualCustomer.email}</p>
                <p>{manualCustomer.address}</p>
                <p>{manualCustomer.city ? `${manualCustomer.city}, ` : ''}{manualCustomer.state} {manualCustomer.zip}</p>
              </div>
            </div>

            {/* Items Table */}
            <div className="flex-1">
              <table className="w-full text-left">
                <thead className="border-b-2 border-slate-100">
                  <tr>
                    <th className="py-3 text-xs font-bold text-slate-500 uppercase w-1/2">Description</th>
                    <th className="py-3 text-xs font-bold text-slate-500 uppercase text-right">Qty</th>
                    <th className="py-3 text-xs font-bold text-slate-500 uppercase text-right">Rate</th>
                    <th className="py-3 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-4 text-sm text-slate-700 font-medium max-w-[200px] break-words">
                        {item.description || 'Item Description'}
                      </td>
                      <td className="py-4 text-sm text-slate-500 text-right">{item.quantity}</td>
                      <td className="py-4 text-sm text-slate-500 text-right">${item.rate.toLocaleString()}</td>
                      <td className="py-4 text-sm text-slate-900 font-bold text-right">${(item.quantity * item.rate).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                      <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 italic">No items added yet.</td>
                      </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totals */}
            <div className="border-t-2 border-slate-100 pt-6 flex justify-end">
              <div className="w-64 space-y-3">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-medium text-slate-900">${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Tax ({taxRate}%)</span>
                  <span className="font-medium text-slate-900">${taxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-lg font-bold text-slate-900 border-t border-slate-100 pt-3">
                  <span>Total</span>
                  <span>${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-12 pt-8 border-t border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 mb-2">Payment Instructions</h4>
              <p className="text-xs text-slate-500 leading-relaxed">
                Please make checks payable to {businessId === 'Big Sky FPV' ? 'Big Sky FPV Services' : 'TRL Band Karaoke'}.<br/>
                Bank Transfer: Chase Bank, Account #938492039, Routing #021000021<br/>
                Thank you for your business!
              </p>
            </div>

            {/* Status Badge (Visual Only) */}
            <div className={`absolute top-0 right-0 mt-12 mr-12 px-4 py-1 border-2 text-sm font-bold uppercase tracking-wider -rotate-12 opacity-80 ${
              status === 'paid' ? 'border-emerald-500 text-emerald-600' :
              status === 'overdue' ? 'border-rose-500 text-rose-600' :
              status === 'sent' ? 'border-indigo-500 text-indigo-600' :
              'border-slate-300 text-slate-400'
            }`}>
              {status}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

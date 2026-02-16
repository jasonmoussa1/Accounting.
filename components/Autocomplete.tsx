
import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, ChevronDown, Check } from 'lucide-react';

interface Option {
  id: string;
  label: string;
  subLabel?: string;
  badge?: string;
  data?: any;
}

interface AutocompleteProps {
  options: Option[];
  value: string;
  onChange: (value: string, data?: any) => void; // Returns ID
  onAddNew?: (inputValue: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

export const Autocomplete: React.FC<AutocompleteProps> = ({ 
  options, 
  value, 
  onChange, 
  onAddNew, 
  placeholder = "Select...", 
  label,
  className 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Derive selected object
  const selectedOption = options.find(o => o.id === value);
  const displayValue = selectedOption ? selectedOption.label : '';

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter options
  const filteredOptions = options.filter(o => 
    o.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (o.subLabel && o.subLabel.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (option: Option) => {
    onChange(option.id, option.data);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleAddNew = () => {
    if (onAddNew) {
      onAddNew(searchTerm);
      setIsOpen(false);
      setSearchTerm('');
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">{label}</label>}
      
      <div 
        className={`w-full bg-white border rounded-lg text-sm flex items-center min-h-[38px] cursor-pointer transition-all ${isOpen ? 'ring-2 ring-indigo-500/20 border-indigo-500' : 'border-slate-200 hover:border-slate-300'}`}
        onClick={() => {
           setIsOpen(!isOpen);
           if (!isOpen) setTimeout(() => inputRef.current?.focus(), 50);
        }}
      >
        <div className="flex-1 px-3 py-2 truncate">
          {displayValue || <span className="text-slate-400">{placeholder}</span>}
        </div>
        <div className="pr-2 text-slate-400">
          <ChevronDown size={14} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden max-h-64 flex flex-col">
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
              <input 
                ref={inputRef}
                type="text" 
                placeholder="Type to search..."
                className="w-full pl-8 pr-3 py-1.5 text-sm bg-white border border-slate-200 rounded-md focus:outline-none focus:border-indigo-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-y-auto flex-1 p-1">
             {filteredOptions.map(option => (
               <div 
                 key={option.id}
                 className={`px-3 py-2 text-sm rounded cursor-pointer flex justify-between items-center group ${value === option.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}
                 onClick={() => handleSelect(option)}
               >
                 <div className="flex flex-col">
                   <span className="font-medium">{option.label}</span>
                   {option.subLabel && <span className="text-xs text-slate-400 group-hover:text-slate-500">{option.subLabel}</span>}
                 </div>
                 <div className="flex items-center gap-2">
                   {option.badge && <span className="text-[10px] uppercase font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">{option.badge}</span>}
                   {value === option.id && <Check size={14} />}
                 </div>
               </div>
             ))}

             {filteredOptions.length === 0 && searchTerm && onAddNew && (
               <div className="p-2">
                 <button 
                   onClick={handleAddNew}
                   className="flex items-center justify-center gap-2 w-full py-2 bg-indigo-50 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors"
                 >
                   <Plus size={14} /> Add "{searchTerm}"
                 </button>
               </div>
             )}
             
             {filteredOptions.length === 0 && !searchTerm && (
                <div className="p-4 text-center text-slate-400 text-xs italic">Start typing to search...</div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};

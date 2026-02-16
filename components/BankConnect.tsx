
import React, { useState } from 'react';
import { syncPlaidToInbox } from '../services/plaidService';
import { Building, CheckCircle, Shield, Loader2, RefreshCw } from 'lucide-react';

interface BankConnectProps {
  onSyncComplete?: (count: number) => void;
  className?: string;
}

export const BankConnect: React.FC<BankConnectProps> = ({ onSyncComplete, className }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'connected'>('idle');

  // Simulated handler to replace Plaid Link
  const handleConnect = async () => {
    setIsConnecting(true);
    
    // Simulate the user interaction delay for "Logging in" to bank
    setTimeout(async () => {
        try {
            // Once connected, trigger the data sync
            const count = await syncPlaidToInbox();
            setStatus('connected');
            if (onSyncComplete) onSyncComplete(count);
        } catch (e) {
            console.error("Connection failed", e);
        } finally {
            setIsConnecting(false);
        }
    }, 1500);
  };

  if (status === 'connected') {
    return (
      <div className={`flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl ${className}`}>
        <div className="bg-emerald-100 p-1.5 rounded-full">
            {isConnecting ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle size={16} />}
        </div>
        <div className="flex-1">
            <p className="text-sm font-bold">Chase Checking (...8849)</p>
            <p className="text-xs opacity-80">Connected & Active</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <button 
        onClick={handleConnect}
        disabled={isConnecting}
        className="group relative flex items-center justify-between w-full bg-slate-900 text-white p-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">
                <Building size={20} className="text-indigo-300" />
            </div>
            <div className="text-left">
                <p className="font-bold text-sm">Connect Bank Account</p>
                <p className="text-xs text-slate-400">Securely import via Plaid (Simulated)</p>
            </div>
        </div>
        
        {isConnecting ? (
            <Loader2 className="animate-spin text-slate-500" size={18} />
        ) : (
            <div className="bg-indigo-600 px-3 py-1.5 rounded text-xs font-bold shadow-sm group-hover:bg-indigo-500 transition-colors">
                Link Now
            </div>
        )}

        <div className="absolute -bottom-2 right-4 text-[10px] text-slate-400 flex items-center gap-1">
            <Shield size={10} /> 256-bit Encrypted
        </div>
      </button>
    </div>
  );
};

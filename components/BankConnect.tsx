
import React, { useState, useEffect, useCallback } from 'react';
import { usePlaidLink, PlaidLinkOptions, PlaidLinkOnSuccess } from 'react-plaid-link';
import { createLinkToken, exchangePublicToken } from '../services/plaidService';
import { useAuth } from '../contexts/AuthContext';
import { Building, CheckCircle, Shield, Loader2, Plus, AlertCircle } from 'lucide-react';

interface BankConnectProps {
  onSyncComplete?: () => void;
  className?: string;
}

export const BankConnect: React.FC<BankConnectProps> = ({ onSyncComplete, className }) => {
  const { currentUser } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // 1. Fetch Link Token on Mount
  useEffect(() => {
    const initLink = async () => {
        if (!currentUser) return;
        try {
            const linkToken = await createLinkToken(currentUser.uid);
            setToken(linkToken);
        } catch (e) {
            console.error("Failed to init Plaid", e);
        }
    };
    initLink();
  }, [currentUser]);

  // 2. Handle Success (Token Exchange)
  const onSuccess = useCallback<PlaidLinkOnSuccess>(async (public_token, metadata) => {
    if (!currentUser) return;
    setLoading(true);
    try {
        await exchangePublicToken(currentUser.uid, public_token, metadata);
        setConnected(true);
        if (onSyncComplete) onSyncComplete();
    } catch (e) {
        console.error("Token Exchange Failed", e);
        alert("Failed to link bank account.");
    } finally {
        setLoading(false);
    }
  }, [currentUser, onSyncComplete]);

  // 3. Configure Link
  const config: PlaidLinkOptions = {
    token,
    onSuccess,
  };

  const { open, ready } = usePlaidLink(config);

  if (connected) {
    return (
      <div className={`flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl ${className}`}>
        <div className="bg-emerald-100 p-1.5 rounded-full">
            <CheckCircle size={16} />
        </div>
        <div className="flex-1">
            <p className="text-sm font-bold">Bank Account Linked</p>
            <p className="text-xs opacity-80">Syncing transactions...</p>
        </div>
      </div>
    );
  }

  if (loading) {
      return (
        <button disabled className={`flex items-center justify-center gap-2 w-full p-4 bg-slate-100 rounded-xl text-slate-500 font-medium ${className}`}>
            <Loader2 className="animate-spin" size={18} /> Connecting securely...
        </button>
      );
  }

  return (
    <div className={`${className}`}>
      <button 
        onClick={() => open()}
        disabled={!ready}
        className="group relative flex items-center justify-between w-full bg-slate-900 text-white p-4 rounded-xl shadow-lg hover:shadow-xl hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2 rounded-lg group-hover:bg-white/20 transition-colors">
                <Building size={20} className="text-indigo-300" />
            </div>
            <div className="text-left">
                <p className="font-bold text-sm">Connect Real Bank</p>
                <p className="text-xs text-slate-400">Via Plaid (Secure)</p>
            </div>
        </div>
        
        <div className="bg-indigo-600 px-3 py-1.5 rounded text-xs font-bold shadow-sm group-hover:bg-indigo-500 transition-colors flex items-center gap-1">
            <Plus size={12} /> Link
        </div>

        <div className="absolute -bottom-2 right-4 text-[10px] text-slate-400 flex items-center gap-1">
            <Shield size={10} /> 256-bit Encrypted
        </div>
      </button>
    </div>
  );
};

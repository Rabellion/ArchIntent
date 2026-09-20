import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { Coins } from 'lucide-react';

interface BudzWalletData {
  balance: number;
  total_purchased: number;
}

interface BudzWalletProps {
  compact?: boolean;
  showHistoryHint?: boolean;
  onLoaded?: (data: BudzWalletData) => void;
}

const BudzWallet: React.FC<BudzWalletProps> = ({ compact = false, showHistoryHint = false, onLoaded }) => {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<BudzWalletData>({ balance: 0, total_purchased: 0 });
  const [loading, setLoading] = useState(true);

  const fetchWallet = async () => {
    try {
      const res = await axiosInstance.get('/budz/wallet');
      const data = res.data?.data || { balance: 0, total_purchased: 0 };
      setWallet(data);
      onLoaded?.(data);
    } catch (_err) {
      setWallet({ balance: 0, total_purchased: 0 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWallet();

    const handler = () => {
      fetchWallet();
    };

    window.addEventListener('budz-updated', handler as EventListener);
    return () => window.removeEventListener('budz-updated', handler as EventListener);
  }, []);

  if (compact) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-xs text-amber-300 font-semibold">Budz Balance</p>
            <p className="text-lg font-bold text-amber-900">{loading ? '...' : `${wallet.balance} Budz`}</p>
          </div>
          <button
            onClick={() => navigate('/dashboard/contractor/buy-budz')}
            className="px-3 py-1.5 bg-amber-500 text-white rounded text-xs font-semibold hover:bg-amber-600"
          >
            Buy More
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-500/30 rounded-xl p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-amber-300 font-semibold flex items-center gap-2">
            <Coins size={16} aria-hidden />
            Budz wallet
          </p>
          <p className="text-2xl font-bold text-amber-900 mt-1">
            {loading ? 'Loading...' : `${wallet.balance} Budz`}
          </p>
          {showHistoryHint && (
            <p className="text-xs text-amber-300 mt-1">Spend Budz to boost ranking in client bid list.</p>
          )}
        </div>
        <button
          onClick={() => navigate('/dashboard/contractor/buy-budz')}
          className="px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600"
        >
          Buy More
        </button>
      </div>
    </div>
  );
};

export default BudzWallet;

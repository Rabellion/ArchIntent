import React, { useEffect, useMemo, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js';
import { useNavigate } from 'react-router-dom';
import axiosInstance from '../api/axios';
import { Coins, Lightbulb, PartyPopper } from 'lucide-react';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface BudzPackage {
  package_id: number;
  name: string;
  budz_amount: number;
  price_pkr: number;
}

interface BudzTransaction {
  transaction_id: number;
  created_at: string;
  description: string;
  transaction_type: 'purchase' | 'spent' | 'refunded';
  budz_amount: number;
  balance_after: number;
}

interface WalletData {
  balance: number;
  total_purchased: number;
  recent_transactions: BudzTransaction[];
}

const PaymentModal: React.FC<{
  selectedPackage: BudzPackage;
  onClose: () => void;
  onSuccess: (newBalance: number, budzAdded: number) => void;
}> = ({ selectedPackage, onClose, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    try {
      const purchaseRes = await axiosInstance.post('/budz/purchase', { package_id: selectedPackage.package_id });
      const clientSecret = purchaseRes.data?.data?.client_secret;
      if (!clientSecret) throw new Error('Missing client secret');

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error('Card form not ready');

      const confirmRes = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement },
      });

      if (confirmRes.error) throw new Error(confirmRes.error.message);
      if (confirmRes.paymentIntent?.status !== 'succeeded') throw new Error('Payment was not completed');

      const confirmApiRes = await axiosInstance.post('/budz/purchase/confirm', {
        stripe_payment_id: confirmRes.paymentIntent.id,
        package_id: selectedPackage.package_id,
      });

      const newBalance = confirmApiRes.data?.data?.balance ?? 0;
      const budzAdded = confirmApiRes.data?.data?.budz_added ?? selectedPackage.budz_amount;
      window.dispatchEvent(new Event('budz-updated'));
      onSuccess(newBalance, budzAdded);
    } catch (err: any) {
      setError(err?.response?.data?.message || err.message || 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-xl max-w-lg w-full p-6">
        <h3 className="text-2xl font-bold text-slate-100 mb-2">Confirm Budz Purchase</h3>
        <p className="text-slate-400 mb-4">{selectedPackage.name} - {selectedPackage.budz_amount} Budz</p>

        <div className="bg-slate-800 rounded-lg p-4 mb-4 border border-slate-600">
          <p className="text-slate-300">Package: <span className="font-semibold text-slate-100">{selectedPackage.name}</span></p>
          <p className="text-slate-300 flex items-center gap-2">
            Budz:{' '}
            <span className="font-semibold inline-flex items-center gap-1 text-slate-100">
              <Coins size={16} className="text-amber-400" aria-hidden />
              {selectedPackage.budz_amount}
            </span>
          </p>
          <p className="text-slate-300">Price: <span className="font-semibold text-slate-100">PKR {Number(selectedPackage.price_pkr).toLocaleString('en-PK')}</span></p>
        </div>

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <form onSubmit={handlePay}>
          <div className="border border-slate-600 rounded-lg p-4 mb-4 bg-slate-800">
            <CardElement />
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 border border-slate-600 rounded-lg text-slate-200 hover:bg-slate-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg font-semibold hover:bg-amber-600 disabled:opacity-50"
            >
              {loading ? 'Processing...' : `Pay PKR ${Number(selectedPackage.price_pkr).toLocaleString('en-PK')}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BuyBudzContent: React.FC = () => {
  const navigate = useNavigate();
  const [packages, setPackages] = useState<BudzPackage[]>([]);
  const [wallet, setWallet] = useState<WalletData>({ balance: 0, total_purchased: 0, recent_transactions: [] });
  const [selectedPackage, setSelectedPackage] = useState<BudzPackage | null>(null);
  const [success, setSuccess] = useState<{ show: boolean; added: number; balance: number }>({ show: false, added: 0, balance: 0 });

  const fetchAll = async () => {
    const [packagesRes, walletRes] = await Promise.all([
      axiosInstance.get('/budz/packages'),
      axiosInstance.get('/budz/wallet'),
    ]);

    setPackages(packagesRes.data?.data || []);
    setWallet(walletRes.data?.data || { balance: 0, total_purchased: 0, recent_transactions: [] });
  };

  useEffect(() => {
    fetchAll().catch(() => undefined);
  }, []);

  const sortedTransactions = useMemo(() => wallet.recent_transactions || [], [wallet.recent_transactions]);

  if (success.show) {
    return (
      <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-700 rounded-xl shadow p-10 text-center">
        <h2 className="text-3xl font-bold text-slate-100 mb-3 flex items-center justify-center gap-2">
          <PartyPopper size={28} className="text-amber-400 shrink-0" aria-hidden />
          <span>{success.added} Budz added to your wallet</span>
        </h2>
        <p className="text-slate-300 mb-6 flex items-center justify-center gap-2">
          <span>New balance:</span>
          <span className="font-semibold inline-flex items-center gap-1 text-slate-100">
            <Coins size={18} className="text-amber-400" aria-hidden />
            {success.balance} Budz
          </span>
        </p>
        <button onClick={() => navigate('/construction-jobs')} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">
          Start Bidding
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-950 min-h-screen p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-slate-100">Buy Budz Coins</h1>
        <p className="text-slate-400 mt-2 mb-6">Use Budz to boost your bids and appear higher in client search results</p>

        <div className="bg-amber-950/40 border border-amber-800/50 rounded-xl p-6 mb-6">
          <p className="text-sm text-amber-200 font-semibold flex items-center gap-2">
            <Coins size={16} aria-hidden />
            Your balance
          </p>
          <p className="text-4xl font-bold text-amber-300 mt-2">{wallet.balance} Budz</p>
        </div>

        <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-xl p-5 mb-6">
          <h3 className="font-bold text-indigo-200 mb-2 flex items-center gap-2">
            <Lightbulb size={18} className="text-indigo-400 shrink-0" aria-hidden />
            How Budz work
          </h3>
          <ul className="text-indigo-100/90 text-sm space-y-1">
            <li>Spend Budz when submitting a bid on a project</li>
            <li>The more Budz you spend, the higher you appear in the client's bid list</li>
            <li>Get 50% of your Budz back if your bid is rejected</li>
            <li>Winning bids keep their Budz (worth it!)</li>
          </ul>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {packages.map((pack) => {
            const isPopular = pack.name.toLowerCase().includes('pro pack');
            const perBudz = Number(pack.price_pkr) / pack.budz_amount;
            return (
              <div key={pack.package_id} className={`bg-slate-900 rounded-xl border p-5 shadow-sm ${isPopular ? 'border-indigo-500 ring-1 ring-indigo-500/40' : 'border-slate-700'}`}>
                {isPopular && <span className="inline-block mb-3 px-2 py-1 rounded bg-indigo-950/80 text-indigo-300 text-xs font-bold border border-indigo-800/50">Most Popular</span>}
                <h4 className="text-xl font-bold text-slate-100">{pack.name}</h4>
                <p className="text-3xl font-extrabold text-amber-400 mt-2 flex items-center gap-2">
                  <Coins size={24} className="text-amber-400 shrink-0" aria-hidden />
                  <span>{pack.budz_amount} Budz</span>
                </p>
                <p className="text-lg font-semibold text-slate-100 mt-1">PKR {Number(pack.price_pkr).toLocaleString('en-PK')}</p>
                <p className="text-sm text-slate-400 mt-1">PKR {perBudz.toFixed(2)} per Budz</p>
                <button onClick={() => setSelectedPackage(pack)} className="mt-4 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700">
                  Buy Now
                </button>
              </div>
            );
          })}
        </div>

        <div className="bg-slate-900 rounded-xl border border-slate-700 shadow p-5">
          <h3 className="text-xl font-bold text-slate-100 mb-4">Transaction History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-200">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left p-2 text-slate-400">Date</th>
                  <th className="text-left p-2 text-slate-400">Description</th>
                  <th className="text-left p-2 text-slate-400">Budz</th>
                  <th className="text-left p-2 text-slate-400">Balance After</th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.map((tx) => {
                  const rowColor = tx.transaction_type === 'purchase'
                    ? 'bg-emerald-950/30'
                    : tx.transaction_type === 'spent'
                    ? 'bg-red-950/30'
                    : 'bg-amber-950/25';
                  const budzLabel = tx.budz_amount > 0 ? `+${tx.budz_amount}` : `${tx.budz_amount}`;

                  return (
                    <tr key={tx.transaction_id} className={`border-b border-slate-800 ${rowColor}`}>
                      <td className="p-2">{new Date(tx.created_at).toLocaleDateString()}</td>
                      <td className="p-2">{tx.description}</td>
                      <td className="p-2 font-semibold">{budzLabel}</td>
                      <td className="p-2">{tx.balance_after}</td>
                    </tr>
                  );
                })}
                {sortedTransactions.length === 0 && (
                  <tr>
                    <td className="p-4 text-slate-500" colSpan={4}>No transactions yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {selectedPackage && (
        <Elements stripe={stripePromise}>
          <PaymentModal
            selectedPackage={selectedPackage}
            onClose={() => setSelectedPackage(null)}
            onSuccess={(newBalance, added) => {
              setSelectedPackage(null);
              setSuccess({ show: true, added, balance: newBalance });
              fetchAll().catch(() => undefined);
            }}
          />
        </Elements>
      )}
    </div>
  );
};

const BuyBudz: React.FC = () => {
  return <BuyBudzContent />;
};

export default BuyBudz;

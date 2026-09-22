import { useCallback, useEffect, useState } from 'react';
import { Banknote, Check, Loader, Pencil } from 'lucide-react';
import axiosInstance from '../../api/axios';

/**
 * Demo bank-transfer payout panel for the architect dashboard.
 *
 * This is the only payout path in the app: it records bank details and
 * withdrawal requests, but does not move money. An operator settles
 * each request manually. Real Stripe Connect payouts were removed --
 * Stripe does not support cross-border Connect payouts to Pakistan.
 *
 * Self-contained: it owns its own fetching and state so the dashboard
 * page does not grow another five useStates.
 */

interface BankDetails {
  has_bank_details: boolean;
  bank_name?: string | null;
  bank_account_title?: string | null;
  bank_account_last4?: string | null;
  bank_iban?: string | null;
}

interface Balance {
  total_earned: number;
  withdrawn_or_pending: number;
  available: number;
  currency: string;
}

interface Withdrawal {
  withdrawal_id: number;
  amount: string | number;
  status: 'requested' | 'approved' | 'rejected';
  bank_account_last4?: string | null;
  requested_at?: string | null;
}

const STATUS_STYLES: Record<Withdrawal['status'], string> = {
  requested: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export default function BankPayoutCard() {
  const [bank, setBank] = useState<BankDetails | null>(null);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [history, setHistory] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [form, setForm] = useState({
    bank_name: '',
    bank_account_title: '',
    bank_account_number: '',
    bank_iban: '',
  });
  const [amount, setAmount] = useState('');

  const load = useCallback(async () => {
    try {
      const [bankRes, balRes, histRes] = await Promise.all([
        axiosInstance.get('/architect/bank-details'),
        axiosInstance.get('/architect/balance'),
        axiosInstance.get('/architect/withdrawals').catch(() => ({ data: { data: [] } })),
      ]);
      const bankData: BankDetails = bankRes.data?.data ?? { has_bank_details: false };
      setBank(bankData);
      setBalance(balRes.data?.data ?? null);
      setHistory(histRes.data?.data ?? []);
      // Open the form straight away when nothing is on file.
      setEditing(!bankData.has_bank_details);
      setForm((f) => ({
        ...f,
        bank_name: bankData.bank_name ?? '',
        bank_account_title: bankData.bank_account_title ?? '',
        bank_iban: bankData.bank_iban ?? '',
      }));
    } catch (e: any) {
      setError(e.response?.data?.message || 'Could not load payout details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const saveBank = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await axiosInstance.post('/architect/bank-details', form);
      setNotice('Bank details saved.');
      setForm((f) => ({ ...f, bank_account_number: '' }));
      setEditing(false);
      await load();
    } catch (e: any) {
      const errs = e.response?.data?.errors;
      setError(
        errs ? String(Object.values(errs)[0]) : e.response?.data?.message || 'Could not save bank details'
      );
    } finally {
      setBusy(false);
    }
  };

  const withdraw = async () => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const res = await axiosInstance.post('/architect/withdraw', {
        amount: Number(amount),
      });
      setNotice(res.data?.message || 'Withdrawal requested.');
      setAmount('');
      await load();
    } catch (e: any) {
      const errs = e.response?.data?.errors;
      setError(
        errs ? String(Object.values(errs)[0]) : e.response?.data?.message || 'Withdrawal failed'
      );
    } finally {
      setBusy(false);
    }
  };

  const currency = balance?.currency === 'PKR' ? '₨' : `${balance?.currency ?? ''} `;
  const available = balance?.available ?? 0;
  const amountNum = Number(amount);
  const canWithdraw =
    !busy && bank?.has_bank_details && amountNum > 0 && amountNum <= available;

  if (loading) {
    return (
      <section className="bg-slate-800 rounded-[2.5rem] border border-slate-700 p-8 flex items-center justify-center">
        <Loader className="w-5 h-5 animate-spin text-slate-400" />
      </section>
    );
  }

  return (
    <section className="bg-slate-800 rounded-[2.5rem] border border-slate-700 p-8">
      <div className="flex items-center gap-3 mb-6">
        <Banknote className="w-6 h-6 text-emerald-400" />
        <h3 className="text-lg font-black italic uppercase tracking-tight text-slate-100">
          Bank Withdrawal
        </h3>
      </div>

      {/* Balance. A stacked list rather than a 3-column grid -- a
          6-7 digit PKR amount needs more width than a third of this
          card can spare, and label-left/value-right on one row fits
          it without truncating or wrapping mid-number. */}
      <div className="space-y-2 mb-6">
        {[
          { label: 'Available', value: available, color: 'text-emerald-400' },
          { label: 'Earned', value: balance?.total_earned ?? 0, color: 'text-slate-200' },
          { label: 'Pending', value: balance?.withdrawn_or_pending ?? 0, color: 'text-amber-400' },
        ].map(({ label, value, color }) => {
          const formatted = `${currency}${value.toLocaleString()}`;
          return (
            <div
              key={label}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl bg-slate-900 border border-slate-700"
            >
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 shrink-0">
                {label}
              </p>
              <p title={formatted} className={`text-sm font-black truncate ${color}`}>
                {formatted}
              </p>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-bold">
          {error}
        </div>
      )}
      {notice && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          {notice}
        </div>
      )}

      {/* Bank details: saved view or form */}
      {bank?.has_bank_details && !editing ? (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1">
                Payout account
              </p>
              <p className="text-slate-100 font-bold">{bank.bank_name}</p>
              <p className="text-slate-400 text-xs mt-0.5">{bank.bank_account_title}</p>
              <p className="text-slate-400 text-xs font-mono mt-1">
                •••• •••• {bank.bank_account_last4 ?? '????'}
              </p>
              {bank.bank_iban && (
                <p className="text-slate-500 text-[10px] font-mono mt-1">{bank.bank_iban}</p>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-600 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
            >
              <Pencil className="w-3 h-3" />
              Edit
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-700 mb-6 space-y-3">
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">
            {bank?.has_bank_details ? 'Update bank details' : 'Add your bank details'}
          </p>
          <input
            value={form.bank_name}
            onChange={(e) => setForm({ ...form, bank_name: e.target.value })}
            placeholder="Bank name"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <input
            value={form.bank_account_title}
            onChange={(e) => setForm({ ...form, bank_account_title: e.target.value })}
            placeholder="Account title (name on the account)"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <input
            value={form.bank_account_number}
            onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })}
            placeholder="Account number"
            inputMode="numeric"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <input
            value={form.bank_iban}
            onChange={(e) => setForm({ ...form, bank_iban: e.target.value })}
            placeholder="IBAN (optional)"
            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-700 text-slate-100 text-sm font-mono placeholder:text-slate-500 focus:outline-none focus:border-emerald-500"
          />
          <div className="flex gap-2">
            <button
              onClick={saveBank}
              disabled={
                busy ||
                !form.bank_name.trim() ||
                !form.bank_account_title.trim() ||
                form.bank_account_number.trim().length < 6
              }
              className="flex-1 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {busy ? 'Saving...' : 'Save Bank Details'}
            </button>
            {bank?.has_bank_details && (
              <button
                onClick={() => setEditing(false)}
                disabled={busy}
                className="px-5 py-3 rounded-xl border border-slate-600 text-slate-300 text-[10px] font-black uppercase tracking-widest hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {/* Withdraw */}
      {bank?.has_bank_details && (
        <div className="flex flex-col sm:flex-row gap-2 mb-6">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={`Amount (max ${available.toLocaleString()})`}
            inputMode="decimal"
            className="min-w-0 flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-sm placeholder:text-slate-500 placeholder:text-xs placeholder:truncate focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={withdraw}
            disabled={!canWithdraw}
            className="px-6 py-3 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            {busy ? 'Sending...' : 'Withdraw'}
          </button>
        </div>
      )}

      {available <= 0 && bank?.has_bank_details && (
        <p className="text-[10px] text-slate-500 font-bold mb-6">
          Nothing available yet. Funds appear here once a client approves your design and the
          payment completes.
        </p>
      )}

      {/* History */}
      {history.length > 0 && (
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-3">
            Recent requests
          </p>
          <div className="space-y-2">
            {history.slice(0, 5).map((w) => (
              <div
                key={w.withdrawal_id}
                className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-900 border border-slate-700"
              >
                <div>
                  <p className="text-slate-200 text-sm font-bold">
                    {currency}
                    {Number(w.amount).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {w.requested_at ? new Date(w.requested_at).toLocaleDateString() : ''}
                    {w.bank_account_last4 ? ` · ••••${w.bank_account_last4}` : ''}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${STATUS_STYLES[w.status]}`}
                >
                  {w.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[9px] text-slate-400 font-bold mt-6 leading-relaxed">
        Demo payout path. Requests are recorded for manual settlement and do not transfer funds
        automatically.
      </p>
    </section>
  );
}

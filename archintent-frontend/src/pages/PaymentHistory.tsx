import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Loader } from 'lucide-react';
import axiosInstance from '../api/axios';

interface Payment {
  payment_id: number;
  project_id: number;
  amount: number;
  payment_type: 'design' | 'construction' | 'refund';
  payment_status: 'pending' | 'held' | 'completed' | 'refunded';
  created_at: string;
  project?: {
    project_id: number;
    project_title: string;
  };
  payer?: {
    full_name: string;
  };
  payee?: {
    full_name: string;
  };
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    pending: 'bg-slate-700/80 text-slate-200 border border-slate-600',
    held: 'bg-amber-950/60 text-amber-200 border border-amber-700/40',
    completed: 'bg-emerald-950/50 text-emerald-200 border border-emerald-700/40',
    refunded: 'bg-rose-950/50 text-rose-200 border border-rose-700/40',
  };

  const key = status in styles ? status : 'pending';

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[key]}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const PaymentHistory: React.FC = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPayments = async () => {
      try {
        const res = await axiosInstance.get('/payments');
        if (res.data.success) {
          setPayments(res.data.data);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load payments');
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[50vh]">
        <Loader size={48} className="mx-auto mb-4 text-indigo-400 animate-spin" aria-hidden />
        <p className="text-slate-400">Loading payment history...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto text-slate-100 pb-8">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-6 font-semibold"
      >
        <ArrowLeft size={20} aria-hidden /> Back
      </button>

      <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-lg shadow-black/20 p-6 sm:p-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-100 mb-8">Payment History</h1>

        {error && (
          <div className="mb-6 bg-rose-950/40 border border-rose-700/50 text-rose-100 px-4 py-3 rounded-xl flex items-start gap-2" role="alert">
            <AlertCircle size={18} className="mt-0.5 text-rose-400 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {payments.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed border-slate-700 bg-slate-950/40">
            <p className="text-slate-400 text-lg">No payments yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-800">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80">
                  <th className="text-left py-3 px-4 font-semibold text-slate-300 text-sm">Project</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300 text-sm">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300 text-sm">Type</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300 text-sm">Status</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-300 text-sm">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {payments.map((payment) => (
                  <tr
                    key={payment.payment_id}
                    className="hover:bg-slate-800/50 cursor-pointer transition"
                    onClick={() => navigate(`/project/${payment.project_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        navigate(`/project/${payment.project_id}`)
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open project ${payment.project?.project_title || payment.project_id}`}
                  >
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-100">
                        {payment.project?.project_title || `Project #${payment.project_id}`}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-indigo-400">
                        PKR {Number(payment.amount || 0).toLocaleString('en-PK')}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-slate-400 capitalize">
                        {payment.payment_type}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={payment.payment_status} />
                    </td>
                    <td className="py-4 px-4 text-slate-400">
                      {new Date(payment.created_at).toLocaleDateString('en-PK')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentHistory;

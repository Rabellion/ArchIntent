import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader,
  Lock,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import axiosInstance from '../api/axios';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || '');

interface ProjectData {
  project_id: number;
  project_title: string;
  project_status: string;
  budget: number;
  client_id: number;
  selected_architect?: {
    architect_id: number;
    user?: {
      full_name: string;
    };
  };
}

const SuccessScreen: React.FC<{
  projectId: number;
  amount: number;
  navigate: ReturnType<typeof useNavigate>;
  platformFee?: number;
  payeeAmount?: number;
}> = ({ projectId, amount, navigate, platformFee = 0, payeeAmount }) => (
  <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
    <div className="max-w-2xl mx-auto text-center text-slate-100">
      <div className="mb-6 flex justify-center">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full animate-pulse" />
          <div className="absolute inset-2 bg-slate-800 border border-emerald-600/40 rounded-full flex items-center justify-center">
            <CheckCircle2 size={64} className="text-emerald-400 animate-bounce" aria-hidden />
          </div>
        </div>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-slate-100 mb-3">Payment Successful!</h1>
      <p className="text-lg sm:text-xl text-slate-400 mb-4">
        PKR {Number(amount || 0).toLocaleString('en-PK')} is now held securely in escrow
      </p>
      <div className="mb-8 max-w-lg mx-auto">
        {platformFee > 0 && payeeAmount != null ? (
          <p className="text-sm text-slate-400">
            Platform fee PKR {Number(platformFee).toLocaleString('en-PK')}. Architect receives PKR{' '}
            {Number(payeeAmount).toLocaleString('en-PK')} when escrow is released.
          </p>
        ) : null}
      </div>

      <div className="bg-indigo-950/40 border border-indigo-700/40 rounded-xl p-6 mb-8 text-left">
        <h3 className="font-semibold text-indigo-200 mb-4">What happens next?</h3>
        <ul className="space-y-3 text-sm sm:text-base text-slate-300">
          <li className="flex gap-3">
            <span className="text-indigo-400 font-bold flex-shrink-0 w-5" aria-hidden>
              •
            </span>
            <span>Your architect has been notified to begin work on your design</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-400 font-bold flex-shrink-0 w-5" aria-hidden>
              •
            </span>
            <span>You'll receive the design within the agreed timeline</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-400 font-bold flex-shrink-0 w-5" aria-hidden>
              •
            </span>
            <span>Review the design and approve or request changes</span>
          </li>
          <li className="flex gap-3">
            <span className="text-indigo-400 font-bold flex-shrink-0 w-5" aria-hidden>
              •
            </span>
            <span>Payment is released only after you approve the final design</span>
          </li>
        </ul>
      </div>

      <button
        type="button"
        onClick={() => navigate(`/project/${projectId}`)}
        className="px-8 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 font-semibold text-lg transition shadow-lg shadow-indigo-950/40"
      >
        View Project Status
      </button>
    </div>
  </div>
);

const PaymentForm: React.FC<{ projectId: number; project: ProjectData }> = ({
  projectId,
  project,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameOnCard, setNameOnCard] = useState(user?.full_name || '');
  const [success, setSuccess] = useState(false);
  const [showTestCards, setShowTestCards] = useState(false);
  const [paidSummary, setPaidSummary] = useState<{
    gross: number;
    platform_fee: number;
    payee_amount: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setError('Payment system not initialized');
      return;
    }

    if (!nameOnCard.trim()) {
      setError('Please enter the name on your card');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Step 1: Create payment intent
      const paymentRes = await axiosInstance.post(`/projects/${projectId}/payment`);

      if (!paymentRes.data.success) {
        throw new Error(paymentRes.data.message || 'Failed to create payment');
      }

      const d = paymentRes.data.data;
      const { client_secret } = d;
      setPaidSummary({
        gross: Number(d.amount ?? project.budget),
        platform_fee: Number(d.platform_fee ?? 0),
        payee_amount: Number(d.payee_amount ?? d.amount ?? project.budget),
      });

      // Step 2: Confirm payment with card
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      const confirmRes = await stripe.confirmCardPayment(client_secret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            name: nameOnCard,
            email: user?.email || '',
          },
        },
      });

      if (confirmRes.error) {
        throw new Error(confirmRes.error.message);
      }

      if (confirmRes.paymentIntent.status === 'succeeded') {
        // Lets the backend verify the charge with Stripe and notify the
        // architect. The card has already been charged at this point, so
        // a failure here must not turn a successful payment into an error
        // screen -- it only means the architect's notification is missed.
        await axiosInstance.post(`/payments/${d.payment_id}/confirm`).catch(() => undefined);
        setSuccess(true);
      }
    } catch (err: any) {
      const apiMessage = err?.response?.data?.message;
      const validationMessage = err?.response?.data?.error;
      setError(apiMessage || validationMessage || err.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <SuccessScreen
        projectId={projectId}
        amount={paidSummary?.gross ?? project.budget}
        navigate={navigate}
        platformFee={paidSummary?.platform_fee}
        payeeAmount={paidSummary?.payee_amount}
      />
    );
  }

  const isDevelopment = import.meta.env.DEV;

  return (
    <div className="space-y-6 text-slate-100">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Error Message */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-700/50 text-rose-100 px-4 py-3 rounded-xl flex items-start gap-2" role="alert">
            <AlertCircle size={18} className="mt-0.5 flex-shrink-0 text-rose-400" aria-hidden />
            <span>{error}</span>
          </div>
        )}

        {/* Card Element */}
        <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-lg shadow-black/20 p-6">
          <h3 className="text-lg font-bold text-slate-100 mb-4">Pay Securely with Card</h3>

          <div className="border border-slate-600 rounded-xl p-4 mb-6 bg-slate-800/80">
            <CardElement
              options={{
                style: {
                  base: {
                    fontSize: '16px',
                    color: '#f1f5f9',
                    '::placeholder': {
                      color: '#94a3b8',
                    },
                  },
                  invalid: {
                    color: '#fb7185',
                  },
                },
              }}
            />
          </div>

          {/* Name on Card */}
          <div className="mb-6">
            <label htmlFor="name_on_card" className="block text-sm font-semibold text-slate-300 mb-2">
              Name on Card
            </label>
            <input
              id="name_on_card"
              type="text"
              value={nameOnCard}
              onChange={(e) => setNameOnCard(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 rounded-xl border border-slate-600 bg-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500"
            />
          </div>

          {paidSummary && paidSummary.platform_fee > 0 && (
            <div className="mb-6 rounded-xl border border-slate-700 bg-slate-800/50 p-4 text-left text-sm text-slate-300">
              <p className="font-semibold text-slate-100 mb-2">Payment breakdown</p>
              <div className="flex justify-between py-1 border-b border-slate-700">
                <span>Total charged</span>
                <span className="font-medium text-slate-100">PKR {paidSummary.gross.toLocaleString('en-PK')}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-700">
                <span>Platform fee</span>
                <span className="font-medium text-slate-100">PKR {paidSummary.platform_fee.toLocaleString('en-PK')}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Architect receives (on release)</span>
                <span className="font-medium text-emerald-400">
                  PKR {paidSummary.payee_amount.toLocaleString('en-PK')}
                </span>
              </div>
            </div>
          )}

          {/* Security Badges */}
          <div className="flex flex-wrap gap-4 text-sm text-slate-400 mb-6">
            <div className="flex items-center gap-2">
              <Lock size={16} className="text-emerald-400" aria-hidden />
              <span>SSL secured</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-indigo-400" aria-hidden />
              <span>Stripe powered</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-violet-400" aria-hidden />
              <span>PCI compliant</span>
            </div>
          </div>

          {/* Payment Button */}
          <button
            type="submit"
            disabled={!stripe || loading}
            className="w-full px-6 py-4 bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 disabled:bg-slate-600 disabled:text-slate-400 font-semibold text-lg transition mb-4 shadow-lg shadow-indigo-950/30"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader size={20} className="animate-spin" aria-hidden />
                Processing Payment...
              </div>
            ) : (
              `Pay PKR ${Number(project.budget || 0).toLocaleString('en-PK')}`
            )}
          </button>

          {/* Test Mode Info */}
          {isDevelopment && (
            <div className="border border-amber-600/40 bg-amber-950/30 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTestCards(!showTestCards)}
                className="w-full px-4 py-3 flex items-center justify-between text-amber-100 font-semibold hover:bg-amber-950/50 transition"
                aria-expanded={showTestCards}
              >
                <span className="flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-400" aria-hidden />
                  Test Mode - Use test card
                </span>
                {showTestCards ? <ChevronUp size={16} aria-hidden /> : <ChevronDown size={16} aria-hidden />}
              </button>

              {showTestCards && (
                <div className="px-4 py-3 border-t border-amber-700/40 bg-amber-950/40">
                  <p className="text-sm text-amber-100/90 mb-2">For testing, use:</p>
                  <div className="bg-slate-950 border border-slate-700 rounded-lg p-3 text-sm font-mono text-slate-300">
                    <p>Card: 4242 4242 4242 4242</p>
                    <p>Exp: Any future date (e.g., 12/26)</p>
                    <p>CVV: Any 3 digits (e.g., 123)</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </form>
    </div>
  );
};

const Payment: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [project, setProject] = useState<ProjectData | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchProject = async () => {
      try {
        const res = await axiosInstance.get(`/projects/${id}`);
        setProject(res.data.data);

        // Verify user is client
        if (user?.user_id !== res.data.data.client_id) {
          setError('Unauthorized: Only the project owner can make payments');
          return;
        }

        // Verify project status
        if (res.data.data.project_status !== 'payment_pending') {
          setError(
            `Project is in ${res.data.data.project_status} status. Payments can only be made when status is payment_pending.`
          );
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    };

    fetchProject();
  }, [id, user?.user_id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 min-h-[50vh]">
        <Loader size={48} className="mx-auto mb-4 text-indigo-400 animate-spin" aria-hidden />
        <p className="text-slate-400">Loading project...</p>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-4xl mx-auto text-slate-100">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-6 font-semibold"
        >
          <ArrowLeft size={20} aria-hidden /> Back
        </button>
        <div className="bg-rose-950/40 border border-rose-700/50 text-rose-100 px-4 py-3 rounded-xl flex items-start gap-2" role="alert">
          <AlertCircle size={18} className="mt-0.5 text-rose-400 shrink-0" aria-hidden />
          <span>{error || 'Project not found'}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto text-slate-100 pb-8">
      <button
        type="button"
        onClick={() => navigate(`/project/${id}`)}
        className="flex items-center gap-2 text-indigo-400 hover:text-indigo-300 mb-8 font-semibold"
      >
        <ArrowLeft size={20} aria-hidden /> Back to Project
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* LEFT COLUMN - Order Summary */}
        <div className="lg:col-span-2 space-y-6">
          {/* Payment Summary Card */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-lg shadow-black/20 p-6">
            <h2 className="text-xl font-bold text-slate-100 mb-6">Payment Summary</h2>

            <div className="space-y-4">
              {/* Project */}
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-400 font-medium shrink-0">Project</span>
                <span className="text-slate-100 font-semibold text-right">
                  {project.project_title}
                </span>
              </div>

              {/* Architect */}
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-400 font-medium shrink-0">Architect</span>
                <span className="text-slate-100 font-semibold text-right">
                  {project.selected_architect?.user?.full_name || 'Not assigned'}
                </span>
              </div>

              {/* Service */}
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-400 font-medium shrink-0">Service</span>
                <span className="text-slate-100 font-semibold text-right">
                  Architectural Design
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-700 my-2" />

              {/* Amount */}
              <div className="flex justify-between items-start gap-4">
                <span className="text-slate-400 font-medium shrink-0">Amount</span>
                <span className="text-2xl sm:text-3xl font-bold text-indigo-400">
                  PKR {Number(project.budget || 0).toLocaleString('en-PK')}
                </span>
              </div>
            </div>
          </div>

          {/* Escrow Explanation */}
          <div className="bg-indigo-950/40 border border-indigo-700/40 rounded-xl p-6">
            <h3 className="font-semibold text-indigo-200 mb-4 flex items-center gap-2">
              <Lock size={18} className="text-indigo-400" aria-hidden />
              Your payment is held in secure escrow
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex gap-3">
                <span className="text-indigo-400 flex-shrink-0" aria-hidden>
                  •
                </span>
                <span>Money is only released after you approve the final design</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-400 flex-shrink-0" aria-hidden>
                  •
                </span>
                <span>You have 3 days to review before auto-release</span>
              </li>
              <li className="flex gap-3">
                <span className="text-indigo-400 flex-shrink-0" aria-hidden>
                  •
                </span>
                <span>Refund available if work doesn't begin</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={() => navigate(`/project/${id}/agreement`)}
              className="mt-4 text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition"
            >
              Questions? View Agreement →
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN - Payment Form */}
        <div className="lg:col-span-3">
          <Elements stripe={stripePromise}>
            <PaymentForm projectId={Number(id)} project={project} />
          </Elements>
        </div>
      </div>
    </div>
  );
};

export default Payment;

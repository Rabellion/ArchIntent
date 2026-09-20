import React, { useEffect, useMemo, useState } from 'react';
import axiosInstance from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { resolveImageUrl } from '../utils/storage';
import { CheckCircle2, Phone, ShieldAlert, User, Camera, ShieldCheck, ChevronRight, Save, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

interface ProfileForm {
  full_name: string;
  phone_number: string;
}

export default function ProfilePage() {
  const { user, validateToken, refreshUser } = useAuth();

  const [form, setForm] = useState<ProfileForm>({
    full_name: '',
    phone_number: '',
  });
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpHint, setOtpHint] = useState('');
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);

  const currentImage = useMemo(() => resolveImageUrl(user?.profile_image), [user?.profile_image]);

  useEffect(() => {
    document.title = 'Identity Settings - ArchIntent';

    const boot = async () => {
      try {
        await validateToken();
      } finally {
        setPageLoading(false);
      }
    };

    boot();
  }, [validateToken]);

  useEffect(() => {
    setForm({
      full_name: user?.full_name || '',
      phone_number: user?.phone_number || '',
    });
  }, [user]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      setError('Only JPG and PNG images are allowed.');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError('Profile image must be 2MB or less.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setProfileFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const payload = new FormData();
      payload.append('full_name', form.full_name.trim());
      payload.append('phone_number', form.phone_number.trim());

      if (profileFile) {
        payload.append('profile_image', profileFile);
      }

      await axiosInstance.post('/profile', payload);

      await refreshUser();
      setSuccess('Identity parameters updated successfully.');
      setProfileFile(null);
      setPreviewUrl('');
    } catch (err: any) {
      const body = err?.response?.data
      const flat =
        body?.errors && typeof body.errors === 'object'
          ? (Object.values(body.errors).flat().find(Boolean) as string | undefined)
          : undefined
      const serverDetail = typeof body?.error === 'string' ? body.error : ''
      setError(flat || serverDetail || body?.message || 'Failed to update identity.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setError('');
    setSuccess('');
    setOtpHint('');
    setDevOtpCode(null);
    setOtpSending(true);
    try {
      const res = await axiosInstance.post('/auth/phone-otp/send');
      setSuccess(res.data?.message || 'Security protocol initiated.');
      const dev = res.data?.data?.dev_code;
      if (typeof dev === 'string' && dev.length === 6) {
        setDevOtpCode(dev);
        setOtpHint('Debug context active. Retrieve code below.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Security protocol failure.');
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    const digits = otpCode.replace(/\D/g, '');
    if (digits.length !== 6) {
      setError('6-digit security sequence required.');
      return;
    }
    setError('');
    setSuccess('');
    setOtpVerifying(true);
    try {
      await axiosInstance.post('/auth/phone-otp/verify', { code: digits });
      setOtpCode('');
      setDevOtpCode(null);
      setOtpHint('');
      await refreshUser();
      setSuccess('Communication channel verified.');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Invalid sequence detected.');
    } finally {
      setOtpVerifying(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <div className="w-16 h-16 border-4 border-slate-700 border-t-indigo-500 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mt-6">Loading Secure Environment...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <div className="pt-12 pb-16 max-w-5xl mx-auto px-4">
        <nav className="flex items-center gap-3 text-slate-500 mb-8">
           <Link to="/" className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition-colors">Environment</Link>
           <ChevronRight className="w-3 h-3 text-slate-600" />
           <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">Identity Settings</span>
        </nav>
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
           <div>
              <h1 className="text-5xl md:text-6xl font-black italic uppercase tracking-tighter leading-[0.9] text-slate-100">
                Identity <br/><span className="text-indigo-400">&amp; Access</span>
              </h1>
              <p className="text-slate-400 font-medium mt-6 text-lg">Manage your secure identity parameters and communication protocols.</p>
           </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-24">
        {error && (
          <div className="mb-8 p-6 bg-rose-950/50 border-2 border-rose-900/60 rounded-[2rem] flex items-center gap-4 text-rose-300">
             <ShieldAlert className="w-6 h-6" />
             <p className="font-bold text-sm uppercase tracking-wide">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-8 p-6 bg-emerald-950/50 border-2 border-emerald-900/60 rounded-[2rem] flex items-center gap-4 text-emerald-300">
             <CheckCircle2 className="w-6 h-6" />
             <p className="font-bold text-sm uppercase tracking-wide">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
           {/* Sidebar: Profile Photo */}
           <div className="lg:col-span-1">
              <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16" />
                 
                 <div className="relative mb-8">
                    <div className="w-full aspect-square rounded-[2.5rem] overflow-hidden bg-white/5 border-4 border-white/10 flex items-center justify-center shadow-2xl">
                      {previewUrl || currentImage ? (
                        <img src={previewUrl || currentImage} alt="Identity Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      ) : (
                        <User className="w-20 h-20 text-slate-700" />
                      )}
                    </div>
                    <label className="absolute -bottom-4 -right-4 w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-indigo-500 transition-all shadow-2xl border-4 border-slate-900 group-hover:scale-110">
                       <Camera className="text-white w-6 h-6" />
                       <input type="file" className="hidden" accept=".jpg,.jpeg,.png" onChange={handleImageChange} />
                    </label>
                 </div>

                 <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Authenticated User</p>
                    <h2 className="text-2xl font-black italic uppercase tracking-tight">{user?.full_name}</h2>
                    <p className="text-slate-500 text-xs font-bold mt-2 truncate">{user?.email}</p>
                 </div>
              </div>
           </div>

           {/* Main: Form Data */}
           <div className="lg:col-span-2 space-y-12">
              <form onSubmit={handleSubmit} className="rounded-[3rem] border border-slate-800 bg-slate-900 p-10 shadow-xl shadow-black/30">
                 <div className="flex items-center gap-4 mb-10 pb-6 border-b border-slate-800">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center text-indigo-400">
                       <User className="w-5 h-5" />
                    </div>
                    <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-100">Identity Details</h3>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Full Legal Name</label>
                       <input
                          name="full_name"
                          value={form.full_name}
                          onChange={handleChange}
                          required
                          className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-800"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Mobile Terminal</label>
                       <input
                          name="phone_number"
                          value={form.phone_number}
                          onChange={handleChange}
                          className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800/80 px-6 py-4 font-bold text-slate-100 outline-none transition-all placeholder:text-slate-500 focus:border-indigo-500 focus:bg-slate-800"
                       />
                    </div>
                 </div>

                 <button
                    type="submit"
                    disabled={loading}
                    className="flex w-full items-center justify-center gap-3 rounded-[1.5rem] bg-indigo-600 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all hover:bg-indigo-500 disabled:opacity-50"
                 >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : (
                      <>Commit Changes <Save className="w-4 h-4" /></>
                    )}
                 </button>
              </form>

              {/* Security Verification Section */}
              <div className="rounded-[3rem] border border-slate-800 bg-slate-900/60 p-10 shadow-inner">
                 <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                       <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-indigo-400 shadow-sm">
                          <Phone className="w-5 h-5" />
                       </div>
                       <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-100">Security Protocol</h3>
                    </div>
                    {user?.phone_verified_at ? (
                       <div className="flex items-center gap-2 rounded-xl border border-emerald-800/80 bg-emerald-950/40 px-4 py-2 text-emerald-300 shadow-sm">
                          <ShieldCheck className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Verified Channel</span>
                       </div>
                    ) : (
                       <div className="flex items-center gap-2 rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-2 text-rose-300 shadow-sm">
                          <ShieldAlert className="w-4 h-4" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Unverified</span>
                       </div>
                    )}
                 </div>

                 {!user?.phone_verified_at && (
                    <div className="space-y-8">
                       <p className="text-sm font-medium text-slate-400">
                         To ensure secure project communications, please verify your mobile terminal. A 6-digit one-time sequence will be transmitted.
                       </p>

                       <div className="flex flex-wrap gap-4">
                          <button
                             type="button"
                             onClick={handleSendOtp}
                             disabled={otpSending || !user?.phone_number?.trim()}
                             className="flex items-center gap-3 rounded-2xl border-2 border-slate-600 bg-slate-800 px-6 py-4 text-[10px] font-black uppercase tracking-[0.15em] text-slate-100 shadow-sm transition-all hover:border-indigo-500 hover:text-indigo-300 disabled:opacity-50"
                          >
                             {otpSending ? 'Transmitting...' : 'Initiate Verification'}
                             <Send className="w-4 h-4" />
                          </button>
                       </div>

                       {otpHint && (
                          <div className="p-4 bg-slate-900 rounded-2xl border border-white/10">
                             <p className="text-[10px] font-mono text-indigo-400 mb-1 uppercase tracking-widest">Debug Sequence:</p>
                             <p className="text-2xl font-mono font-black text-white tracking-[0.5em]">{devOtpCode}</p>
                          </div>
                       )}

                       <div className="flex flex-col sm:flex-row items-end gap-4">
                          <div className="flex-1 space-y-2">
                             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 ml-2">Security Sequence</label>
                             <input
                                inputMode="numeric"
                                maxLength={6}
                                value={otpCode}
                                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                placeholder="000000"
                                className="w-full rounded-2xl border-2 border-slate-700 bg-slate-800 px-6 py-4 text-center font-mono text-2xl font-black tracking-[0.5em] text-slate-100 shadow-sm outline-none transition-all placeholder:text-slate-600 focus:border-indigo-500"
                             />
                          </div>
                          <button
                             type="button"
                             onClick={handleVerifyOtp}
                             disabled={otpVerifying || otpCode.length !== 6}
                             className="h-[62px] rounded-2xl bg-indigo-600 px-10 text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-2xl shadow-indigo-900/40 transition-all hover:bg-indigo-500 disabled:bg-slate-600 disabled:shadow-none"
                          >
                             {otpVerifying ? 'Validating...' : 'Validate Channel'}
                          </button>
                       </div>
                    </div>
                 )}

                 {user?.phone_verified_at && (
                    <div className="rounded-[2rem] border border-slate-800 bg-slate-800/50 p-10 text-center shadow-sm">
                       <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-950/50 text-emerald-400">
                          <ShieldCheck className="w-8 h-8" />
                       </div>
                       <h4 className="text-lg font-black italic uppercase text-slate-100">Protocol Secure</h4>
                       <p className="mt-2 text-sm text-slate-400">Your mobile identity is cryptographically linked to this account.</p>
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}

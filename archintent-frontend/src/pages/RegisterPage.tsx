import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axiosInstance from '../api/axios';
import toast from 'react-hot-toast';

interface FormData {
  full_name: string;
  email: string;
  password: string;
  confirm_password: string;
  role: 'client' | 'architect' | 'contractor' | '';
  phone_number: string;
  identity_type: 'cnic' | 'passport' | '';
  identity_number: string;
  company_name: string;
}

interface FormErrors {
  [key: string]: string;
}

const inputBase = 'w-full px-4 py-3 border border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-800 text-slate-100 placeholder:text-slate-500 transition-colors'
const labelBase = 'block text-sm font-medium text-slate-300 mb-2'

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: '',
    phone_number: '',
    identity_type: '',
    identity_number: '',
    company_name: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  useEffect(() => {
    document.title = 'Register — ArchIntent';
  }, []);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePassword = (password: string): string | null => {
    if (password.length < 8) return 'Min 8 characters';
    if (!/[A-Z]/.test(password)) return 'One uppercase letter';
    if (!/[0-9]/.test(password)) return 'One number';
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return 'One special character';
    return null;
  };

  const checkStrength = (rule: string) => {
    const p = formData.password;
    switch (rule) {
      case 'length': return p.length >= 8;
      case 'upper': return /[A-Z]/.test(p);
      case 'number': return /[0-9]/.test(p);
      case 'special': return /[!@#$%^&*(),.?":{}|<>]/.test(p);
      default: return false;
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.full_name.trim()) newErrors.full_name = 'Full name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!validateEmail(formData.email)) newErrors.email = 'Valid email required';

    const pError = validatePassword(formData.password);
    if (pError) newErrors.password = pError;

    if (formData.password !== formData.confirm_password) newErrors.confirm_password = 'Passwords do not match';
    if (!formData.role) newErrors.role = 'Please select a role';
    if (!formData.phone_number.trim()) newErrors.phone_number = 'Phone number is required';

    if (!formData.identity_type) newErrors.identity_type = 'Identity type is required';
    if (!formData.identity_number.trim()) newErrors.identity_number = 'ID number is required';
    if (formData.role === 'contractor' && !formData.company_name.trim()) {
      newErrors.company_name = 'Company name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleRoleSelect = (role: 'client' | 'architect' | 'contractor') => {
    setFormData(prev => ({ ...prev, role }));
    if (errors.role) setErrors(prev => ({ ...prev, role: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validateForm()) return;
    setLoading(true);

    try {
      const payload: Record<string, string> = {
        full_name: formData.full_name,
        email: formData.email,
        password: formData.password,
        password_confirmation: formData.confirm_password,
        role: formData.role,
        phone_number: formData.phone_number,
        identity_type: formData.identity_type,
        identity_number: formData.identity_number,
      };
      if (formData.role === 'contractor') {
        payload.company_name = formData.company_name;
      }

      const response = await axiosInstance.post('/register', payload);
      const { user_id, email, email_delivered, verification_method } = response.data.data;
      const method = verification_method === 'link' ? 'link' : 'code';
      if (email_delivered === false) {
        toast.error(response.data.message || 'We could not send the verification email. You can request it again on the next page.');
      } else {
        toast.success(`Registration successful! Check your email for the verification ${method}.`);
      }
      navigate(`/verify-otp?userId=${user_id}&email=${encodeURIComponent(email)}&method=${method}`);
    } catch (err: any) {
      if (err.response?.status === 422 && err.response.data.errors) {
        const backendErrors = err.response.data.errors as Record<string, string[]>;
        const fieldErrors: FormErrors = {};
        Object.entries(backendErrors).forEach(([field, messages]) => {
          fieldErrors[field] = messages[0];
        });
        setErrors(prev => ({ ...prev, ...fieldErrors }));
        setApiError(err.response.data.message || 'Please fix the errors below.');
      } else {
        setApiError(
          err.response?.data?.debug ||
          err.response?.data?.message ||
          err.response?.data?.error ||
          'Registration failed. Please try again.',
        );
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-secondary/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-2xl bg-slate-900 rounded-2xl shadow-xl border border-slate-700 overflow-hidden relative z-10">
        <div className="p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
              <span className="material-symbols-outlined text-white text-3xl">architecture</span>
            </div>
            <h1 className="text-3xl font-extrabold text-slate-100">Create Account</h1>
            <p className="text-slate-400 mt-2">Join Pakistan's premier architecture marketplace</p>
          </div>

          {apiError && (
            <div className="mb-6 p-4 bg-red-950/40 border border-red-800/60 text-red-400 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-xl">error</span>
              <span className="text-sm font-medium">{apiError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Full Name */}
              <div>
                <label htmlFor="full_name" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  className={`w-full px-6 py-4 bg-slate-800 border ${errors.full_name ? 'border-red-500' : 'border-slate-600'} rounded-2xl focus:ring-4 focus:ring-indigo-500/30 focus:bg-slate-800 transition-all text-sm text-slate-100 placeholder:text-slate-500 outline-none`}
                  placeholder="Enter your full name"
                />
                {errors.full_name && <p className="text-red-500 text-[10px] font-bold mt-2 px-1">{errors.full_name}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-6 py-4 bg-slate-800 border ${errors.email ? 'border-red-500' : 'border-slate-600'} rounded-2xl focus:ring-4 focus:ring-indigo-500/30 focus:bg-slate-800 transition-all text-sm text-slate-100 placeholder:text-slate-500 outline-none`}
                  placeholder="name@example.com"
                />
                {errors.email && <p className="text-red-500 text-[10px] font-bold mt-2 px-1">{errors.email}</p>}
              </div>
            </div>

            {/* Password Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-6 py-4 bg-slate-800 border ${errors.password ? 'border-red-500' : 'border-slate-600'} rounded-2xl focus:ring-4 focus:ring-indigo-500/30 focus:bg-slate-800 transition-all text-sm text-slate-100 placeholder:text-slate-500 outline-none`}
                  placeholder="Create a strong password"
                />
              </div>
              <div>
                <label htmlFor="confirm_password" className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2 px-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirm_password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  className={`w-full px-6 py-4 bg-slate-800 border ${errors.confirm_password ? 'border-red-500' : 'border-slate-600'} rounded-2xl focus:ring-4 focus:ring-indigo-500/30 focus:bg-slate-800 transition-all text-sm text-slate-100 placeholder:text-slate-500 outline-none`}
                  placeholder="Repeat your password"
                />
                {errors.confirm_password && <p className="text-red-500 text-[10px] font-bold mt-2 px-1">{errors.confirm_password}</p>}
              </div>
            </div>

            {/* Password Strength Indicator */}
            {formData.password && (
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-600">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
                      (step === 1 && checkStrength('length')) ||
                      (step === 2 && checkStrength('upper')) ||
                      (step === 3 && checkStrength('number')) ||
                      (step === 4 && checkStrength('special'))
                        ? 'bg-indigo-600 shadow-[0_0_8px_rgba(79,70,229,0.4)]'
                        : 'bg-slate-600'
                    }`} />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-y-2">
                  {[
                    { key: 'length', label: '8+ Characters' },
                    { key: 'upper', label: 'Uppercase' },
                    { key: 'number', label: 'Number' },
                    { key: 'special', label: 'Special Symbol' }
                  ].map(rule => (
                    <div key={rule.key} className="flex items-center gap-2">
                      <span className={`material-symbols-outlined text-[14px] ${checkStrength(rule.key) ? 'text-indigo-400' : 'text-slate-500'}`}>
                        {checkStrength(rule.key) ? 'check_circle' : 'circle'}
                      </span>
                      <span className={`text-[10px] font-black uppercase tracking-wider ${checkStrength(rule.key) ? 'text-slate-100' : 'text-slate-500'}`}>
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4 px-1">
                Account Type
              </label>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: 'client', label: 'Client', icon: 'person' },
                  { id: 'architect', label: 'Architect', icon: 'architecture' },
                  { id: 'contractor', label: 'Contractor', icon: 'construction' }
                ].map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => handleRoleSelect(role.id as any)}
                    className={`flex flex-col items-center justify-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${
                      formData.role === role.id
                        ? 'border-indigo-500 bg-indigo-950/40 shadow-xl shadow-indigo-900/30 scale-[1.02]'
                        : 'border-slate-600 hover:border-slate-500 bg-slate-800'
                    }`}
                  >
                    <span className={`material-symbols-outlined text-2xl ${formData.role === role.id ? 'text-indigo-400' : 'text-slate-500'}`}>
                      {role.icon}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-widest ${formData.role === role.id ? 'text-indigo-300' : 'text-slate-400'}`}>
                      {role.label}
                    </span>
                  </button>
                ))}
              </div>
              {errors.role && <p className="text-red-500 text-[10px] font-bold mt-3 px-1">{errors.role}</p>}
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone_number" className={labelBase}>
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone_number"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                className={`${inputBase} ${errors.phone_number ? 'border-red-500' : ''}`}
                placeholder="+92 300 1234567"
              />
              {errors.phone_number && <p className="text-red-500 text-sm mt-1">{errors.phone_number}</p>}
            </div>

            {/* Identity Type */}
            <div>
              <label htmlFor="identity_type" className={labelBase}>
                Identity Type *
              </label>
              <select
                id="identity_type"
                name="identity_type"
                value={formData.identity_type}
                onChange={handleChange}
                className={`${inputBase} ${errors.identity_type ? 'border-red-500' : ''}`}
              >
                <option value="">Select identity type</option>
                <option value="cnic">CNIC</option>
                <option value="passport">Passport</option>
              </select>
              {errors.identity_type && <p className="text-red-500 text-sm mt-1">{errors.identity_type}</p>}
            </div>

            {/* Identity Number */}
            <div>
              <label htmlFor="identity_number" className={labelBase}>
                Identity Number *
              </label>
              <input
                type="text"
                id="identity_number"
                name="identity_number"
                value={formData.identity_number}
                onChange={handleChange}
                className={`${inputBase} ${errors.identity_number ? 'border-red-500' : ''}`}
                placeholder="12345-1234567-8"
              />
              {errors.identity_number && <p className="text-red-500 text-sm mt-1">{errors.identity_number}</p>}
            </div>

            {/* Company Name — contractors only */}
            {formData.role === 'contractor' && (
              <div>
                <label htmlFor="company_name" className={labelBase}>
                  Company Name *
                </label>
                <input
                  type="text"
                  id="company_name"
                  name="company_name"
                  value={formData.company_name}
                  onChange={handleChange}
                  className={`${inputBase} ${errors.company_name ? 'border-red-500' : ''}`}
                  placeholder="Your company or firm name"
                />
                {errors.company_name && <p className="text-red-500 text-sm mt-1">{errors.company_name}</p>}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white font-semibold py-3 rounded-xl hover:bg-indigo-500 disabled:bg-slate-600 transition duration-200 flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/40"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Registering...
                </>
              ) : (
                'Register'
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-indigo-400 font-semibold hover:text-indigo-300">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axiosInstance from '../api/axios'
import toast from 'react-hot-toast'
import { Mail, MailCheck, ShieldCheck } from 'lucide-react'

type VerificationMethod = 'code' | 'link'

// Re-checking a link hits Firebase twice per call; this caps how often
// returning to the tab can trigger it.
const AUTO_CHECK_MIN_INTERVAL_MS = 5000

const flattenValidationMessage = (errors: unknown): string | null => {
  if (!errors || typeof errors !== 'object') return null
  const first = Object.values(errors as Record<string, string[]>)[0]
  return Array.isArray(first) ? first[0] ?? null : null
}

const VerifyOtpPage = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const userId = params.get('userId') || ''
  const email = params.get('email') || ''

  const [method, setMethod] = useState<VerificationMethod>(
    params.get('method') === 'link' ? 'link' : 'code',
  )
  const [code, setCode] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [resending, setResending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)
  const lastAutoCheck = useRef(0)

  useEffect(() => {
    document.title = 'Verify Email — ArchIntent'
    if (!userId || !email) navigate('/register')
  }, [userId, email, navigate])

  const uid = Number(userId)
  const userIdValid = Number.isInteger(uid) && uid > 0

  const checkLinkClicked = useCallback(
    async (silent: boolean) => {
      if (!userIdValid) return
      setChecking(true)
      if (!silent) setError('')
      try {
        const res = await axiosInstance.post('/check-email-verification', { user_id: uid, email })
        if (res.data?.data?.verified) {
          toast.success('Email verified! You can now sign in.')
          navigate('/login')
        } else if (!silent) {
          setError("We can't see the link clicked yet. Open the email, click the link, then try again.")
        }
      } catch (err: unknown) {
        if (!silent) {
          const ax = err as { response?: { data?: { message?: string } } }
          setError(ax.response?.data?.message || 'Could not check right now. Please try again.')
        }
      } finally {
        setChecking(false)
      }
    },
    [uid, email, userIdValid, navigate],
  )

  // The user verifies in their email app or another tab, so re-check
  // when they come back to this one.
  useEffect(() => {
    if (method !== 'link') return
    const onReturn = () => {
      if (document.visibilityState !== 'visible') return
      const now = Date.now()
      if (now - lastAutoCheck.current < AUTO_CHECK_MIN_INTERVAL_MS) return
      lastAutoCheck.current = now
      checkLinkClicked(true)
    }
    window.addEventListener('focus', onReturn)
    document.addEventListener('visibilitychange', onReturn)
    return () => {
      window.removeEventListener('focus', onReturn)
      document.removeEventListener('visibilitychange', onReturn)
    }
  }, [method, checkLinkClicked])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const digits = code.replace(/\D/g, '').slice(0, 6)
    if (digits.length !== 6) {
      setError('Please enter all 6 digits')
      return
    }
    if (!userIdValid) {
      setError('Invalid verification link. Register again.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await axiosInstance.post('/verify-email-otp', { user_id: uid, otp: digits })
      toast.success('Email verified! You can now sign in.')
      navigate('/login')
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string; errors?: unknown } } }
      const body = ax.response?.data
      const flat = flattenValidationMessage(body?.errors)
      setError(flat || body?.message || 'Verification failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (!email.trim()) {
      toast.error('Missing email. Go back to register.')
      return
    }
    setResending(true)
    setError('')
    try {
      const res = await axiosInstance.post('/resend-email-otp', { email })
      const next = res.data?.data?.verification_method
      if (next === 'link' || next === 'code') setMethod(next)
      const dev = res.data?.data?.dev_otp as string | undefined
      if (dev) {
        toast.success(`Debug: code is ${dev}`)
      } else {
        toast.success(res.data?.message || 'Check your inbox.')
      }
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: string } } }
      toast.error(ax.response?.data?.message || 'Could not resend. Try again later.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-700 p-8">
          <div className="flex justify-center mb-6">
            <div className="w-14 h-14 bg-indigo-950/60 border border-indigo-800/50 rounded-2xl flex items-center justify-center">
              {method === 'link'
                ? <MailCheck size={28} className="text-indigo-400" />
                : <Mail size={28} className="text-indigo-400" />}
            </div>
          </div>

          <h1 className="text-2xl font-extrabold text-slate-100 text-center mb-2">
            Check your email
          </h1>

          {method === 'link' ? (
            <>
              <p className="text-sm text-slate-400 text-center mb-8">
                We sent a verification link to{' '}
                <span className="font-semibold text-slate-200">{email}</span>. Click it, then come
                back here &mdash; we&apos;ll pick it up automatically.
              </p>

              {error && <p className="text-sm text-red-400 text-center mb-4">{error}</p>}

              <button
                type="button"
                onClick={() => checkLinkClicked(false)}
                disabled={checking}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                <ShieldCheck size={18} />
                {checking ? 'Checking…' : "I've clicked the link"}
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-slate-400 text-center mb-8">
                We sent a 6-digit code to{' '}
                <span className="font-semibold text-slate-200">{email}</span>
              </p>

              <form onSubmit={handleSubmit}>
                <label htmlFor="email-otp" className="sr-only">
                  Six-digit verification code
                </label>
                <input
                  ref={inputRef}
                  id="email-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full text-center text-3xl font-mono font-bold tracking-[0.35em] py-4 border-2 border-slate-600 bg-slate-800 text-slate-100 rounded-xl focus:border-indigo-500 focus:outline-none transition mb-6"
                  aria-label="Six-digit verification code"
                />

                {error && <p className="text-sm text-red-400 text-center mb-4">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting || code.replace(/\D/g, '').length !== 6}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  <ShieldCheck size={18} />
                  {submitting ? 'Verifying…' : 'Verify email'}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 flex flex-col gap-3 text-center text-sm">
            <button
              type="button"
              disabled={resending}
              onClick={handleResend}
              className="text-indigo-400 hover:underline font-medium disabled:opacity-50"
            >
              {resending ? 'Sending…' : method === 'link' ? 'Resend link' : 'Resend code'}
            </button>
            <p className="text-xs text-slate-500">
              {method === 'link'
                ? <>Didn&apos;t receive it? Check your spam or promotions folder, then tap &ldquo;Resend link&rdquo;.</>
                : <>Didn&apos;t receive it? Check your spam or promotions folder, then tap &ldquo;Resend code&rdquo;. Codes expire after 10 minutes.</>}
            </p>
            <button
              type="button"
              className="text-slate-500 hover:text-slate-300 text-xs"
              onClick={() => navigate('/register')}
            >
              Register again
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VerifyOtpPage

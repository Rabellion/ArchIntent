import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import axios from 'axios'
import axiosInstance from '../api/axios'
import toast from 'react-hot-toast'
import { AlertCircle, ArrowLeft, Download, FileText, Loader2 } from 'lucide-react'

type Kind = 'architect' | 'contractor'

const parseFilenameFromDisposition = (header: string | undefined): string | null => {
  if (!header) return null
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header)
  if (match?.[1]) return decodeURIComponent(match[1].replace(/"/g, ''))
  return null
}

const AdminVerificationDocuments = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const kind: Kind = useMemo(
    () => (location.pathname.includes('verify-contractors') ? 'contractor' : 'architect'),
    [location.pathname]
  )

  const entityId = id ? Number.parseInt(id, 10) : NaN

  const [subjectName, setSubjectName] = useState<string>('')
  const [loadingMeta, setLoadingMeta] = useState(true)
  const [loadingDoc, setLoadingDoc] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [contentType, setContentType] = useState('')
  const [downloadName, setDownloadName] = useState('verification-document')

  const backHref =
    kind === 'architect' ? `/admin/verify-architects/${entityId}` : `/admin/verify-contractors/${entityId}`
  const queueHref = kind === 'architect' ? '/admin/verify-architects' : '/admin/verify-contractors'

  const documentPath =
    kind === 'architect'
      ? `/admin/architects/${entityId}/document`
      : `/admin/contractors/${entityId}/document`

  const revokeBlob = useCallback(() => {
    setBlobUrl((prev) => {
      if (prev) window.URL.revokeObjectURL(prev)
      return null
    })
  }, [])

  useEffect(() => {
    return () => revokeBlob()
  }, [revokeBlob])

  useEffect(() => {
    if (!Number.isFinite(entityId) || entityId < 1) {
      setError('Invalid application id')
      setLoadingMeta(false)
      setLoadingDoc(false)
      return
    }

    const loadMeta = async () => {
      try {
        setLoadingMeta(true)
        const reviewPath =
          kind === 'architect'
            ? `/admin/architects/${entityId}/review`
            : `/admin/contractors/${entityId}/review`
        const res = await axiosInstance.get(reviewPath)
        const data = res.data?.data
        const name =
          kind === 'architect'
            ? data?.user?.full_name
            : data?.company_name || data?.user?.full_name
        setSubjectName(typeof name === 'string' && name.trim() ? name.trim() : '')
        const vPath = data?.verification_document as string | undefined
        if (vPath) {
          const base = vPath.split(/[/\\]/).pop()
          if (base) setDownloadName(base)
        }
      } catch {
        setSubjectName('')
      } finally {
        setLoadingMeta(false)
      }
    }

    void loadMeta()
  }, [entityId, kind])

  useEffect(() => {
    if (!Number.isFinite(entityId) || entityId < 1) return

    const loadDoc = async () => {
      try {
        setLoadingDoc(true)
        setError(null)
        revokeBlob()

        const token = sessionStorage.getItem('token')
        if (!token) {
          setError('Please sign in again as admin to view this document')
          setLoadingDoc(false)
          return
        }

        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api'
        const response = await axios.get(`${apiUrl}${documentPath}`, {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob',
        })

        const ct = (response.headers['content-type'] || 'application/octet-stream').split(';')[0].trim()
        setContentType(ct)

        const fromHeader = parseFilenameFromDisposition(response.headers['content-disposition'])
        if (fromHeader) setDownloadName(fromHeader)

        const blob = new Blob([response.data], { type: ct })
        const url = window.URL.createObjectURL(blob)
        setBlobUrl(url)
      } catch (err: unknown) {
        const e = err as { response?: { status?: number; data?: Blob | { message?: string } } }
        const status = e?.response?.status
        let message =
          status === 403
            ? 'You are not allowed to view this document'
            : status === 404
              ? 'No document on file or file missing on server'
              : 'Could not load verification document'

        if (e?.response?.data instanceof Blob) {
          try {
            const text = await e.response.data.text()
            const parsed = JSON.parse(text) as { message?: string }
            if (parsed?.message) message = parsed.message
          } catch {
            /* keep */
          }
        } else if (e?.response?.data && typeof e.response.data === 'object' && 'message' in e.response.data) {
          message = String((e.response.data as { message?: string }).message || message)
        }

        setError(message)
      } finally {
        setLoadingDoc(false)
      }
    }

    void loadDoc()
  }, [documentPath, entityId, revokeBlob])

  const handleDownload = () => {
    if (!blobUrl) {
      toast.error('Nothing to download yet')
      return
    }
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = downloadName || 'verification-document'
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    toast.success('Download started')
  }

  const isPdf = contentType.includes('pdf')
  const isImage = contentType.startsWith('image/')

  const title =
    kind === 'architect' ? 'Architect verification documents' : 'Contractor verification documents'

  if (!Number.isFinite(entityId) || entityId < 1) {
    return (
      <div className="max-w-xl mx-auto py-24 px-4 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" aria-hidden />
        <p className="text-slate-600 font-medium">Invalid link.</p>
        <Link to="/dashboard/admin" className="mt-6 inline-block text-indigo-600 font-bold text-sm">
          Admin dashboard
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <Link
              to={backHref}
              className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-600 text-xs font-bold uppercase tracking-widest mb-3"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden />
              Back to application
            </Link>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">{title}</h1>
            <p className="text-slate-500 text-sm mt-1">
              {subjectName ? (
                <>
                  <span className="font-semibold text-slate-700">{subjectName}</span>
                  <span className="text-slate-400"> · </span>
                </>
              ) : null}
              Admin-only document review. Preview in the browser or download for offline checks.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <Link
              to={queueHref}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest hover:bg-slate-50"
            >
              Queue
            </Link>
            <button
              type="button"
              onClick={handleDownload}
              disabled={!blobUrl || !!error}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none"
              aria-label="Download verification document"
            >
              <Download className="w-4 h-4" aria-hidden />
              Download
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {loadingDoc || loadingMeta ? (
          <div className="flex flex-col items-center justify-center py-32 rounded-3xl border border-slate-200 bg-white">
            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" aria-hidden />
            <p className="mt-4 text-sm font-semibold text-slate-500">Loading document…</p>
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 flex gap-4 text-rose-800">
            <AlertCircle className="w-6 h-6 shrink-0" aria-hidden />
            <div>
              <p className="font-black uppercase tracking-wide text-sm">Unable to load file</p>
              <p className="text-sm mt-1">{error}</p>
            </div>
          </div>
        ) : blobUrl ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white border border-slate-200 px-4 py-3">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FileText className="w-4 h-4 text-indigo-500 shrink-0" aria-hidden />
                <span className="font-mono text-xs truncate max-w-[min(100%,28rem)]">{downloadName}</span>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{contentType}</span>
            </div>

            {isPdf ? (
              <div className="rounded-3xl border border-slate-200 bg-slate-900 overflow-hidden shadow-lg min-h-[75vh]">
                <iframe
                  title="Verification document preview"
                  src={blobUrl}
                  className="w-full min-h-[75vh] bg-white"
                />
              </div>
            ) : isImage ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-4 flex justify-center overflow-auto">
                <img
                  src={blobUrl}
                  alt="Uploaded verification document"
                  className="max-w-full h-auto max-h-[80vh] object-contain"
                />
              </div>
            ) : (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center">
                <p className="text-slate-700 font-semibold">No in-browser preview for this file type.</p>
                <p className="text-slate-500 text-sm mt-2">Use Download to open it locally (Office, viewer, print, etc.).</p>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700"
                >
                  <Download className="w-4 h-4" aria-hidden />
                  Download file
                </button>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default AdminVerificationDocuments

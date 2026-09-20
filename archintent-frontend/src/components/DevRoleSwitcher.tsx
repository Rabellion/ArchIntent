import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

const roles = [
  { key: 'client', label: 'Open as Client' },
  { key: 'architect', label: 'Open as Architect' },
  { key: 'contractor', label: 'Open as Contractor' },
  { key: 'admin', label: 'Open as Admin' },
]

export default function DevRoleSwitcher() {
  const [open, setOpen] = useState(false)

  const handleOpenRole = (role: string) => {
    window.open(`/login?hint=${role}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 text-slate-100">
      {open && (
        <div className="mb-3 w-72 rounded-xl border border-slate-700 bg-slate-900 shadow-xl shadow-black/40 p-4">
          <h3 className="text-xs font-bold uppercase tracking-wide text-slate-100 mb-3">
            Open role in new tab
          </h3>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.key}
                type="button"
                onClick={() => handleOpenRole(role.key)}
                className="w-full text-left px-3 py-2.5 rounded-lg border border-slate-600 bg-slate-800/80 text-sm font-medium text-slate-100 hover:bg-slate-800 hover:border-indigo-500 transition-colors"
              >
                {role.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex items-center gap-2 rounded-full border border-slate-600 bg-slate-900 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-slate-800"
        aria-label="Toggle dev role switcher"
      >
        <RefreshCw size={16} className="shrink-0 text-white" aria-hidden />
        <span className="text-white">Switch role</span>
      </button>
    </div>
  )
}

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Page Not Found — ArchIntent';
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-6 pt-24 pb-16">
      <div className="text-center max-w-lg">
        {/* Giant 404 */}
        <h1 className="text-[12rem] font-black italic text-slate-200 uppercase tracking-tighter leading-none select-none">
          404
        </h1>

        <div className="space-y-4 -mt-12 relative z-10">
          <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.4em]">SIGNAL LOST</p>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter text-slate-100">
            Route Not Found
          </h2>
          <p className="text-slate-500 font-medium leading-relaxed max-w-sm mx-auto">
            The coordinates you entered do not correspond to any known operational sector. Recalibrate and try again.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-12">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-slate-800 border border-slate-600 text-slate-200 font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-slate-700 hover:shadow-lg transition-all duration-300"
          >
            <ArrowLeft size={16} />
            Go Back
          </button>
          <button
            onClick={() => navigate('/')}
            className="flex items-center justify-center gap-3 px-8 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-indigo-500 transition-all duration-500 shadow-xl shadow-indigo-900/40"
          >
            <Home size={16} />
            Home Base
          </button>
        </div>
      </div>
    </div>
  );
}

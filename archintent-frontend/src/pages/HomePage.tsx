import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ArrowRight, 
  Building2, 
  Star, 
  CheckCircle, 
  Zap, 
  ShieldCheck, 
  Users, 
  Trophy,
  Search,
  Layout,
  MessageSquare,
  FileText,
  CreditCard,
  Target,
  Layers,
  ArrowUpRight,
  Fingerprint
} from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';

const STATS = [
  { label: 'VERIFIED ARCHITECTS', value: '450+', sub: 'PEC Registered' },
  { label: 'ACTIVE MISSIONS', value: '1.2K', sub: 'In Pipeline' },
  { label: 'TOTAL VALUATION', value: 'PKR 8.5B', sub: 'Under Management' },
  { label: 'MATCH ACCURACY', value: '98%', sub: 'AI Optimized' }
];

const STEPS = [
  { 
    id: '01', 
    title: 'MANIFEST BRIEF', 
    desc: 'Define your vision using our NLP-driven brief builder. Specify typology, budget, and aesthetic mandates.' 
  },
  { 
    id: '02', 
    title: 'INTELLIGENT MATCH', 
    desc: 'Our proprietary algorithm analyzes portfolios and technical capacity to match you with the top 1% of talent.' 
  },
  { 
    id: '03', 
    title: 'EXECUTE CONTRACT', 
    desc: 'Finalize agreements through our secure legal protocol and initiate the project with protected escrow.' 
  }
];

const FEATURES = [
  { 
    title: 'AI MATCHING', 
    desc: 'Neural matching of project requirements to professional expertise.',
    icon: Target
  },
  { 
    title: 'ESCROW SECURITY', 
    desc: 'Milestone-based payment protection for both parties.',
    icon: ShieldCheck
  },
  { 
    title: 'PEC VERIFIED', 
    desc: 'Strict identity and professional certification protocols.',
    icon: Fingerprint
  },
  { 
    title: 'MASTERWORKS', 
    desc: 'High-fidelity portfolio catalog with verified mission logs.',
    icon: Layout
  }
];

const HomePage: React.FC = () => {
  const navigate = useNavigate()

  useEffect(() => {
    document.title = "ArchIntent — Strategic Architecture Marketplace";
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-inter selection:bg-indigo-500 selection:text-white">
      <PublicNavbar />
      {/* --- HERO SECTION --- */}
      <section className="relative min-h-screen flex items-center pt-32 pb-32 px-6 bg-slate-950 overflow-hidden">
        {/* Architectural Grid Overlay */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(to right, #ffffff11 1px, transparent 1px), linear-gradient(to bottom, #ffffff11 1px, transparent 1px)', backgroundSize: '200px 200px' }} />
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 items-center">
            <div className="lg:col-span-8 space-y-12">
              <div className="flex items-center gap-4 animate-fade-in">
                <div className="w-12 h-[2px] bg-indigo-500" />
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400">MANIFEST YOUR VISION</p>
              </div>

              <h1 className="text-6xl md:text-9xl font-black text-white italic uppercase tracking-tighter leading-[0.85] animate-slide-up">
                Building <br />
                The <span className="text-transparent text-outline-white">Future</span> <br />
                Of <span className="text-indigo-500">Design</span>
              </h1>

              <p className="text-lg md:text-xl text-slate-400 max-w-2xl font-medium leading-relaxed">
                ArchIntent is the strategic marketplace connecting Pakistan's leading developers with PEC-verified architects and elite contractors.
              </p>

              <div className="flex flex-wrap gap-6 pt-6">
                <button
                  onClick={() => navigate('/register')}
                  className="group flex items-center gap-6 bg-slate-800 text-slate-100 px-12 py-6 rounded-2xl hover:bg-indigo-500 hover:text-white transition-all duration-500 shadow-2xl shadow-black/30"
                >
                  <span className="font-black uppercase tracking-[0.2em] text-xs italic">Post A Mission</span>
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </button>
                <button
                  onClick={() => navigate('/architects')}
                  className="flex items-center gap-6 bg-transparent border-2 border-white/10 text-white px-12 py-6 rounded-2xl hover:bg-white/5 transition-all duration-500"
                >
                  <span className="font-black uppercase tracking-[0.2em] text-xs italic">Browse Registry</span>
                  <Search className="w-5 h-5 text-indigo-400" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-4 hidden lg:block">
               <div className="relative group">
                  <div className="absolute -inset-4 bg-indigo-500/20 rounded-[3rem] blur-2xl group-hover:bg-indigo-500/30 transition-all duration-700" />
                  <div className="relative bg-slate-900 border border-white/10 rounded-[3rem] p-10 space-y-10 shadow-2xl">
                     <div className="space-y-4">
                        <div className="w-12 h-12 bg-indigo-500 rounded-2xl flex items-center justify-center">
                           <Zap className="text-white" size={24} />
                        </div>
                        <h3 className="text-xl font-black text-white italic uppercase tracking-tight">AI Matching Protocol</h3>
                        <p className="text-sm text-slate-400 font-medium">Neural processing of architectural requirements is active.</p>
                     </div>
                     <div className="space-y-3">
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full w-2/3 bg-indigo-500 animate-pulse" />
                        </div>
                        <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-slate-500 italic">
                           <span>Processing Brief</span>
                           <span>67% Complete</span>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- STATS SECTION --- */}
      <section className="bg-slate-900 py-24 border-y border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-24">
            {STATS.map((stat, i) => (
              <div key={i} className="space-y-2">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">{stat.label}</p>
                <p className="text-5xl font-black text-slate-100 italic tracking-tighter uppercase">{stat.value}</p>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">{stat.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS (MODULE 01) --- */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20">
            <div className="lg:col-span-4 space-y-8">
              <div className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400">MODULE 01</p>
                <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-slate-100">The <br />Operating <br /><span className="text-slate-500">System</span></h2>
              </div>
              <p className="text-slate-500 font-medium leading-relaxed max-w-xs">
                ArchIntent is more than a directory; it's a strategic platform for professional construction management.
              </p>
            </div>

            <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-10">
               {STEPS.map((step, i) => (
                 <div key={i} className="group space-y-6">
                    <div className="text-8xl font-black text-slate-200 italic leading-none group-hover:text-indigo-900/40 transition-colors">
                      {step.id}
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xl font-black italic uppercase tracking-tight text-slate-100">{step.title}</h3>
                      <p className="text-sm text-slate-500 font-medium leading-relaxed">{step.desc}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES (MODULE 02) --- */}
      <section className="py-32 px-6 bg-slate-900 rounded-[5rem] mx-6 mb-32 border border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-12 mb-20">
             <div className="space-y-4">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-indigo-400">MODULE 02</p>
                <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none text-slate-100">Strategic <br />Protocols</h2>
             </div>
             <p className="text-slate-400 font-medium max-w-sm">Every engagement is protected by our proprietary trust and security layer.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {FEATURES.map((feature, i) => (
              <div key={i} className="bg-slate-800 rounded-[2.5rem] p-10 border border-slate-700 shadow-sm hover:shadow-2xl hover:shadow-indigo-900/20 transition-all duration-700 hover:-translate-y-2 group">
                 <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center mb-10 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500 shadow-inner text-slate-300">
                    <feature.icon size={24} />
                 </div>
                 <h3 className="text-xl font-black italic uppercase tracking-tight mb-4 text-slate-100">{feature.title}</h3>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- DUAL CTA (MODULE 03) --- */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* For Clients */}
              <div className="bg-indigo-600 rounded-[3.5rem] p-16 text-white relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32" />
                 <div className="relative z-10 space-y-12">
                    <div className="space-y-4">
                       <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">FOR CLIENTS</p>
                       <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none">Find Your <br />Architect</h2>
                    </div>
                    <ul className="space-y-4">
                       {['Verified Expertise', 'AI-Driven Search', 'Secure Escrow'].map((item, i) => (
                         <li key={i} className="flex items-center gap-4 text-sm font-black italic uppercase tracking-widest text-indigo-200">
                            <CheckCircle size={16} /> {item}
                         </li>
                       ))}
                    </ul>
                    <button onClick={() => navigate('/register')} className="flex items-center gap-6 bg-slate-800 text-slate-100 px-10 py-5 rounded-2xl hover:bg-slate-950 hover:text-white transition-all duration-500 shadow-2xl">
                       <span className="font-black uppercase tracking-widest text-xs italic">Start Project</span>
                       <ArrowRight className="w-4 h-4" />
                    </button>
                 </div>
              </div>

              {/* For Professionals */}
              <div className="bg-slate-950 rounded-[3.5rem] p-16 text-white relative overflow-hidden group border border-white/5">
                 <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-32 -mb-32" />
                 <div className="relative z-10 space-y-12">
                    <div className="space-y-4">
                       <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/40">FOR PROFESSIONALS</p>
                       <h2 className="text-5xl font-black italic uppercase tracking-tighter leading-none">Scale Your <br />Practice</h2>
                    </div>
                    <ul className="space-y-4">
                       {['Premium Visibility', 'Automated Billing', 'PEC Verification'].map((item, i) => (
                         <li key={i} className="flex items-center gap-4 text-sm font-black italic uppercase tracking-widest text-slate-500">
                            <CheckCircle size={16} /> {item}
                         </li>
                       ))}
                    </ul>
                    <button onClick={() => navigate('/register')} className="flex items-center gap-6 bg-white/5 border border-white/10 text-white px-10 py-5 rounded-2xl hover:bg-slate-800 transition-all duration-500 hover:text-slate-100">
                       <span className="font-black uppercase tracking-widest text-xs italic">Join Registry</span>
                       <ArrowUpRight className="w-4 h-4" />
                    </button>
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-slate-950 pt-32 pb-20 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-24">
           <div className="flex flex-col md:flex-row justify-between gap-20">
              <div className="space-y-8">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                       <Building2 size={20} className="text-white" />
                    </div>
                    <span className="text-3xl font-black text-white italic uppercase tracking-tighter">ArchIntent</span>
                 </div>
                 <p className="text-slate-500 font-medium max-w-xs leading-relaxed">
                   The strategic hub for Pakistan's built environment. AI-optimized and verified.
                 </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-16">
                 <div className="space-y-6">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest italic">Navigation</p>
                    <ul className="space-y-4 text-sm font-bold text-slate-500 italic uppercase tracking-tight">
                       <li><Link to="/architects" className="hover:text-white transition-colors">Architects</Link></li>
                       <li><Link to="/contractors" className="hover:text-white transition-colors">Contractors</Link></li>
                       <li><Link to="/jobs" className="hover:text-white transition-colors">Project Board</Link></li>
                    </ul>
                 </div>
                 <div className="space-y-6">
                    <p className="text-[10px] font-black text-white uppercase tracking-widest italic">Identity</p>
                    <ul className="space-y-4 text-sm font-bold text-slate-500 italic uppercase tracking-tight">
                       <li><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></li>
                       <li><Link to="/register" className="hover:text-white transition-colors">Create Registry</Link></li>
                       <li><Link to="/profile" className="hover:text-white transition-colors">Fleet Settings</Link></li>
                    </ul>
                 </div>
              </div>
           </div>

           <div className="pt-20 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                © 2026 ARCHINTENT OPERATIONAL GROUP. KARACHI // ISLAMABAD // LAHORE
              </p>
              <div className="flex items-center gap-8">
                 <span className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em] flex items-center gap-2">
                    <ShieldCheck size={14} /> SECURITY PROTOCOL ALPHA
                 </span>
              </div>
           </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;

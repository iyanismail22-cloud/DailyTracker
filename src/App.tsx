import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Wallet, 
  Heart, 
  Brain, 
  Calendar as CalendarIcon,
  Plus,
  ArrowRight,
  LogOut,
  LogIn,
  Glasses,
  Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { auth, loginWithGoogle, logout } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

import Dashboard from './components/Dashboard';
import Tasks from './components/Tasks';
import Finance from './components/Finance';
import Health from './components/Health';
import Entertainment from './components/Entertainment';

type Tab = 'dashboard' | 'tasks' | 'finance' | 'health' | 'entertainment';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'tasks', label: 'To-Do List', icon: CheckSquare },
    { id: 'finance', label: 'Finance', icon: Wallet },
    { id: 'health', label: 'Health & Mood', icon: Heart },
    { id: 'entertainment', label: 'Media', icon: Monitor },
  ];

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-wellness-bg">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-wellness-accent border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen flex items-center justify-center bg-glass-bg relative overflow-hidden p-6">
        {/* Background Blobs for Login */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="blur-blob top-[-20%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/30" />
          <div className="blur-blob bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-card p-12 space-y-10 relative z-10 text-center"
        >
          <div className="flex flex-col items-center space-y-6">
            <div className="w-20 h-20 bg-indigo-500 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-indigo-500/40 relative group">
              <Glasses size={48} className="transition-transform group-hover:scale-110 duration-500" />
              <div className="absolute -inset-2 bg-indigo-500/20 blur-xl rounded-full -z-10" />
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tight text-white">LifeLink</h1>
              <p className="text-glass-muted text-sm font-medium leading-relaxed max-w-[280px]">
                Mulai harimu dengan lebih terorganisir, tenang, dan bijak dalam mengelola diri.
              </p>
            </div>
          </div>

          <button 
            onClick={loginWithGoogle}
            className="w-full glass-button h-16 flex items-center justify-center space-x-4 text-xl font-black group"
          >
            <LogIn size={24} className="group-hover:translate-x-1 transition-transform" />
            <span>Masuk Sekarang</span>
          </button>

          <p className="text-[10px] text-glass-muted font-bold uppercase tracking-[0.2em] opacity-40">
            Securely powered by Google Authentication
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-glass-bg overflow-hidden relative p-6 gap-6">
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blur-blob top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600" />
        <div className="blur-blob bottom-[10%] right-[-5%] w-[45%] h-[45%] bg-blue-600" />
        <div className="blur-blob top-[30%] right-[20%] w-[30%] h-[30%] bg-pink-600" />
      </div>

      {/* Sidebar */}
      <aside className="w-24 glass-sidebar flex flex-col items-center py-8 gap-10 relative z-10 shrink-0">
        <div className="w-14 h-14 bg-indigo-500 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 relative">
          <Glasses size={32} />
          <div className="absolute inset-0 bg-white/10 rounded-[1.25rem] blur-sm -z-10" />
        </div>

        <nav className="flex-1 flex flex-col gap-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as Tab)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 relative group overflow-hidden",
                activeTab === item.id 
                  ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/40" 
                  : "text-glass-muted hover:bg-white/5 hover:text-white"
              )}
              title={item.label}
            >
              <item.icon size={20} className="relative z-10" />
            </button>
          ))}
        </nav>

        <button 
          onClick={logout}
          className="w-12 h-12 flex items-center justify-center text-glass-muted hover:text-red-400 transition-colors group bg-white/5 rounded-xl border border-white/5"
          title="Logout"
        >
          <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col gap-6 relative z-10 overflow-hidden">
        <header className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white capitalize leading-tight">
              {activeTab === 'dashboard' ? `Halo, ${user.displayName?.split(' ')[0]}!` : activeTab}
            </h1>
            <p className="text-glass-muted text-xs font-medium">
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' })} • <span className="text-indigo-400 font-bold uppercase tracking-widest text-[10px]">Gemini Insight Potent</span>
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2 pr-4">
              {user.photoURL ? (
                <img src={user.photoURL} className="w-8 h-8 rounded-xl border border-white/20" alt="Avatar" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xs">
                  {user.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-[9px] font-bold text-glass-muted uppercase tracking-widest leading-none">Account</span>
                <span className="text-xs font-semibold text-white/90 truncate max-w-[100px]">{user.displayName || user.email}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto no-scrollbar rounded-[2.5rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="h-full"
            >
              {activeTab === 'dashboard' && <Dashboard user={user} />}
              {activeTab === 'tasks' && <Tasks user={user} />}
              {activeTab === 'finance' && <Finance user={user} />}
              {activeTab === 'health' && <Health user={user} />}
              {activeTab === 'entertainment' && <Entertainment user={user} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

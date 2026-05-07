import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Droplet, 
  Moon, 
  TrendingDown, 
  ArrowUpRight,
  Plus,
  Brain,
  Monitor,
  Tv,
  ArrowRight
} from 'lucide-react';
import { motion } from 'motion/react';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, where, getDoc, doc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { Task, FinanceEntry, HealthEntry } from '../types';
import { handleFirestoreError, OperationType } from '../lib/utils';

interface EntertainmentStats {
  booksRead: number;
  moviesWatched: number;
  seriesFinished: number;
}

const StatCard = ({ icon: Icon, label, value, subValue, color }: any) => (
  <div className="glass-card p-6 flex flex-col space-y-4 relative overflow-hidden group h-full">
    <div className={`w-11 h-11 ${color} rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 overflow-hidden`}>
      <Icon size={18} className="group-hover:scale-110 transition-transform" strokeWidth={2.5} />
    </div>
    <div className="relative z-10 flex-1 flex flex-col justify-end">
      <p className="text-glass-muted text-[10px] font-black uppercase tracking-[0.2em] mb-1">{label}</p>
      <div className="flex items-baseline space-x-2">
        <h4 className="text-2xl font-black text-white leading-tight">{value}</h4>
        {subValue && <span className="text-[10px] text-glass-muted font-bold truncate opacity-60">{subValue}</span>}
      </div>
    </div>
    <div className={`absolute -right-4 -bottom-4 w-16 h-16 ${color} opacity-5 blur-2xl group-hover:scale-150 transition-transform duration-500`} />
  </div>
);

export default function Dashboard({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [finances, setFinances] = useState<FinanceEntry[]>([]);
  const [health, setHealth] = useState<HealthEntry | null>(null);
  const [entStats, setEntStats] = useState<EntertainmentStats>({ booksRead: 0, moviesWatched: 0, seriesFinished: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const tasksPath = `users/${user.uid}/tasks`;
    const financesPath = `users/${user.uid}/finances`;
    const healthPath = `users/${user.uid}/health/${today}`;
    const booksPath = `users/${user.uid}/books`;
    const moviesPath = `users/${user.uid}/movies`;

    const unsubTasks = onSnapshot(query(collection(db, tasksPath)), (s) => {
      setTasks(s.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    });

    const unsubFinances = onSnapshot(query(collection(db, financesPath)), (s) => {
      setFinances(s.docs.map(d => ({ id: d.id, ...d.data() } as FinanceEntry)));
    });

    const unsubHealth = onSnapshot(doc(db, healthPath), (s) => {
      if (s.exists()) setHealth(s.data() as HealthEntry);
    });

    const unsubBooks = onSnapshot(collection(db, booksPath), (s) => {
      const read = s.docs.filter(d => d.data().status === 'finished').length;
      setEntStats(prev => ({ ...prev, booksRead: read }));
    });

    const unsubMovies = onSnapshot(collection(db, moviesPath), (s) => {
      const data = s.docs.map(d => d.data());
      const mWatched = data.filter(d => d.type === 'movie' && d.status === 'finished').length;
      const sFinished = data.filter(d => d.type === 'series' && d.status === 'finished').length;
      setEntStats(prev => ({ ...prev, moviesWatched: mWatched, seriesFinished: sFinished }));
    });

    setIsLoading(false);

    return () => {
      unsubTasks();
      unsubFinances();
      unsubHealth();
      unsubBooks();
      unsubMovies();
    };
  }, [user.uid, today]);

  const dailyExpense = finances
    .filter(f => f.date === today && f.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const completedTasks = tasks.filter(t => t.isCompleted).length;
  const mit = tasks.find(t => t.isImportant && !t.isCompleted) || tasks.find(t => !t.isCompleted);

  const stats = [
    { 
      icon: Zap, 
      label: 'Energy Level', 
      value: health?.energyLevel ? `${health.energyLevel}/10` : '?', 
      subValue: health?.energyLevel ? (health.energyLevel > 7 ? 'Vibrant' : 'Steady') : 'Belum diisi', 
      color: 'bg-indigo-500' 
    },
    { 
      icon: Droplet, 
      label: 'Water Intake', 
      value: `${health?.waterIntake || 0} Gelas`, 
      subValue: `Target: 8 Gelas`, 
      color: 'bg-blue-500' 
    },
    { 
      icon: TrendingDown, 
      label: 'Expenses Today', 
      value: `Rp ${dailyExpense.toLocaleString()}`, 
      subValue: 'Daily', 
      color: 'bg-pink-500' 
    },
    { 
      icon: Monitor, 
      label: 'Media Stats', 
      value: `${entStats.booksRead + entStats.moviesWatched + entStats.seriesFinished}`, 
      subValue: `Read & Watch`, 
      color: 'bg-orange-500' 
    },
  ];

  return (
    <div className="p-8 space-y-8 pb-20 max-w-7xl mx-auto">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-1">
            Dashboard Overview
          </h1>
          <p className="text-glass-muted text-sm font-medium">Monitoring performa dan progres harianmu.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-extrabold text-indigo-400 capitalize tracking-widest">{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-[10px] text-glass-muted uppercase tracking-[0.2em] font-bold opacity-60">
            {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.05 }}
          >
            <StatCard {...stat} />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-10 relative overflow-hidden group shadow-2xl bg-indigo-500/10">
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-2 text-indigo-400">
                  <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />
                  <span className="text-[10px] font-extrabold uppercase tracking-[0.2em]">Smart Priority</span>
                </div>
                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-2.5 py-1 rounded-lg uppercase font-black border border-indigo-500/30">Optimized by AI</span>
              </div>
              <h3 className="text-3xl font-bold mb-3 text-white">{mit ? mit.title : 'All Clear! 🎉'}</h3>
              <p className="text-glass-muted mb-10 max-w-sm text-sm leading-relaxed font-medium">
                {mit ? 'Berdasarkan energimu, selesaikan tugas ini sekarang untuk hasil maksimal.' : 'Kamu sudah sangat produktif hari ini. Istirahat sejenak untuk me-refresh pikiran.'}
              </p>
              {mit && (
                <button className="glass-button flex items-center space-x-3 group">
                  <span className="font-bold">Lihat Detail</span>
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </button>
              )}
            </div>
            <div className="absolute -right-16 -bottom-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-1000" />
            <div className="absolute right-12 top-12 text-white/5 select-none font-black text-9xl">TASK</div>
          </div>

          <div className="glass-card p-8 bg-white/[0.03]">
            <h3 className="font-bold flex items-center space-x-3 mb-6">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/10">
                <Brain size={20} className="text-indigo-400" />
              </div>
              <span className="text-lg text-white">Daily Recap & Review</span>
            </h3>
            <div className="bg-white/5 p-6 rounded-3xl border border-white/5 italic leading-relaxed text-sm text-glass-text/90 relative overflow-hidden">
              <div className="absolute left-0 top-0 w-1 h-full bg-indigo-500/50" />
              {health?.journal ? (
                `"${health.journal.length > 200 ? health.journal.substring(0, 200) + '...' : health.journal}"`
              ) : (
                "Belum ada catatan jurnal. Luangkan waktu sejenak untuk refleksi diri di tab Health."
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 flex flex-col h-full bg-white/[0.03]">
            <h4 className="font-bold flex items-center space-x-3 mb-10">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Plus size={20} />
              </div>
              <span className="text-white">Goal Progression</span>
            </h4>
            <div className="space-y-10 flex-1">
              {[
                { label: 'Tasks Flow', value: `${completedTasks}/${tasks.length}`, progress: tasks.length ? (completedTasks / tasks.length) * 100 : 0, color: 'bg-indigo-500' },
                { label: 'Hydration', value: `${health?.waterIntake || 0}/8`, progress: ((health?.waterIntake || 0) / 8) * 100, color: 'bg-blue-500' },
                { label: 'Media Log', value: `${entStats.booksRead + entStats.moviesWatched}`, progress: 100, color: 'bg-orange-500' },
              ].map((goal) => (
                <div key={goal.label} className="space-y-4">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-glass-muted font-bold uppercase tracking-[0.2em]">{goal.label}</span>
                    <span className="font-black text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md">{goal.value}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(goal.progress, 100)}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={`h-full ${goal.color} rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]`}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-12 pt-6 border-t border-white/5">
              <p className="text-[9px] font-bold text-glass-muted uppercase tracking-[0.2em] text-center opacity-40">
                Data synced to cloud • AI Optimized
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

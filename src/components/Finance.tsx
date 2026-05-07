import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Plus, 
  DollarSign, 
  Target,
  ArrowRight,
  PieChart as PieChartIcon,
  Trash2,
  X
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { FinanceEntry } from '../types';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { handleFirestoreError, OperationType, cn } from '../lib/utils';

const COLORS = ['#6366f1', '#3b82f6', '#d946ef', '#8b5cf6', '#06b6d4'];

export default function Finance({ user }: { user: User }) {
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditSettings, setShowEditSettings] = useState(false);
  
  // Financial Settings State
  const [initialMonthlyBalance, setInitialMonthlyBalance] = useState(0);
  const [initialSavingsBalance, setInitialSavingsBalance] = useState(0);
  const [savingsGoal, setSavingsGoal] = useState(10000000);
  const [editInitialMonthly, setEditInitialMonthly] = useState('');
  const [editInitialSavings, setEditInitialSavings] = useState('');
  const [editSavingsGoal, setEditSavingsGoal] = useState('');
  
  // Form State
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Food');
  const [type, setType] = useState<'expense' | 'income'>('expense');

  useEffect(() => {
    const financesPath = `users/${user.uid}/finances`;
    const settingsPath = `users/${user.uid}/settings/finance`;
    
    // Listen to finances
    const q = query(collection(db, financesPath), orderBy('createdAt', 'desc'));
    const unsubscribeFinances = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinanceEntry));
      setEntries(data);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, financesPath, auth);
    });

    // Listen to settings
    const unsubscribeSettings = onSnapshot(doc(db, settingsPath), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setInitialMonthlyBalance(data.initialMonthlyBalance || 0);
        setInitialSavingsBalance(data.initialSavingsBalance || 0);
        setSavingsGoal(data.savingsGoal || 10000000);
        setEditInitialMonthly((data.initialMonthlyBalance || 0).toString());
        setEditInitialSavings((data.initialSavingsBalance || 0).toString());
        setEditSavingsGoal((data.savingsGoal || 10000000).toString());
      }
    }, (error) => {
      console.error("Error fetching settings:", error);
    });

    return () => {
      unsubscribeFinances();
      unsubscribeSettings();
    };
  }, [user.uid]);

  const updateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const settingsPath = `users/${user.uid}/settings/finance`;
    try {
      const { setDoc } = await import('firebase/firestore');
      await setDoc(doc(db, settingsPath), {
        initialMonthlyBalance: parseFloat(editInitialMonthly) || 0,
        initialSavingsBalance: parseFloat(editInitialSavings) || 0,
        savingsGoal: parseFloat(editSavingsGoal) || 0,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setShowEditSettings(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, settingsPath, auth);
    }
  };

  const addEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) return;
    const financesPath = `users/${user.uid}/finances`;
    try {
      await addDoc(collection(db, financesPath), {
        amount: parseFloat(amount),
        description,
        category,
        type,
        date: new Date().toISOString().split('T')[0],
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setAmount('');
      setDescription('');
      setShowAddForm(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, financesPath, auth);
    }
  };

  const deleteEntry = async (id: string) => {
    const path = `users/${user.uid}/finances/${id}`;
    try {
      await deleteDoc(doc(db, path));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path, auth);
    }
  };

  const totalMonthlyIncome = entries
    .filter(e => e.type === 'income' && e.category !== 'Tabungan' && e.category !== 'Saving')
    .reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalExpenses = entries
    .filter(e => e.type === 'expense')
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const monthlyBalance = initialMonthlyBalance + totalMonthlyIncome - totalExpenses;

  // Savings Logic
  // Income marked as saving = direct deposit to savings
  // Expense marked as saving = transfer from monthly to savings
  const savingsDeposits = entries
    .filter(e => e.type === 'income' && (e.category === 'Tabungan' || e.category === 'Saving'))
    .reduce((acc, curr) => acc + curr.amount, 0);
    
  const savingsTransfers = entries
    .filter(e => e.type === 'expense' && (e.category === 'Tabungan' || e.category === 'Saving'))
    .reduce((acc, curr) => acc + curr.amount, 0);

  const currentSavings = initialSavingsBalance + savingsDeposits + savingsTransfers;

  // Data for chart
  const pieData = Object.entries(
    entries.filter(e => e.type === 'expense').reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div className="p-8 space-y-8 pb-20 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Financial Tracker</h1>
          <p className="text-glass-muted text-sm font-medium">Monitoring arus kas dan target tabunganmu.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="glass-button flex items-center space-x-2"
        >
          <Plus size={20} />
          <span className="font-bold">Tambah Transaksi</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <button 
          onClick={() => setShowEditSettings(true)}
          className="glass-card p-8 bg-indigo-500/10 text-white shadow-2xl space-y-4 relative overflow-hidden border-indigo-500/20 group text-left transition-all hover:bg-indigo-500/20"
        >
          <div className="relative z-10">
            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.2em] mb-1">Saldo Bulanan</p>
            <h2 className="text-4xl font-black">Rp {monthlyBalance.toLocaleString()}</h2>
            <div className="flex items-center space-x-2 mt-6">
              <div className="flex items-center space-x-2 text-[9px] bg-white/10 px-3 py-1 rounded-lg font-black tracking-widest uppercase border border-white/10">
                <TrendingUp size={12} className="text-green-400" />
                <span>Pemasukan: Rp {totalMonthlyIncome.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <DollarSign className="absolute -right-6 -bottom-6 text-white/5 group-hover:scale-110 transition-transform duration-700" size={150} />
          <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity"><TrendingUp size={24} /></div>
        </button>

        <button 
          onClick={() => setShowEditSettings(true)}
          className="glass-card p-8 space-y-5 bg-white/[0.03] text-left transition-all hover:bg-white/[0.08]"
        >
          <div className="flex justify-between items-center">
            <p className="text-glass-muted text-[10px] font-bold uppercase tracking-[0.2em]">Saldo Tabungan</p>
            <Target size={20} className="text-indigo-400" />
          </div>
          <h2 className="text-3xl font-black text-white">Rp {currentSavings.toLocaleString()}</h2>
          <div className="space-y-2">
            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden p-0.5">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${Math.min((currentSavings / (savingsGoal || 1)) * 100, 100)}%` }}
                className="h-full bg-indigo-500 rounded-full"
              />
            </div>
            <div className="flex justify-between text-[9px] font-black tracking-[0.2em] text-glass-muted">
              <span className="text-indigo-400">{Math.round((currentSavings / (savingsGoal || 1)) * 100)}% COMPLETED</span>
              <span>GOAL: Rp {savingsGoal.toLocaleString()}</span>
            </div>
          </div>
        </button>

        <div className="glass-card p-8 flex flex-col justify-center bg-white/[0.03] space-y-3">
          <p className="text-glass-muted text-[10px] font-bold uppercase tracking-[0.2em]">Expenses Today</p>
          <div className="flex items-baseline space-x-2">
            <h2 className="text-3xl font-black text-pink-500">
              Rp {entries.filter(e => e.date === new Date().toISOString().split('T')[0] && e.type === 'expense').reduce((a, b) => a + b.amount, 0).toLocaleString()}
            </h2>
            <TrendingDown size={18} className="text-pink-500/50" />
          </div>
          <p className="text-[10px] text-glass-muted italic font-medium opacity-60">Pola pengeluaranmu stabil hari ini.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="glass-card p-8 min-h-[460px] bg-white/[0.03]">
            <h3 className="font-bold text-white mb-8 flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <TrendingDown size={20} />
              </div>
              <span className="text-lg">Transaksi Terbaru</span>
            </h3>
            {isLoading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <div key={i} className="h-16 glass-card animate-pulse shadow-none bg-white/5" />)}
              </div>
            ) : entries.length === 0 ? (
              <div className="text-center py-24 opacity-20 flex flex-col items-center">
                <DollarSign size={64} className="mb-4" />
                <p className="font-bold uppercase tracking-widest text-xs">Belum ada aktivitas keuangan</p>
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map(entry => (
                  <div key={entry.id} className="flex items-center justify-between p-4 hover:bg-white/[0.05] rounded-[1.5rem] transition-all group border border-transparent hover:border-white/10">
                    <div className="flex items-center space-x-5">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110",
                        entry.type === 'expense' ? "bg-pink-500/10 text-pink-500 border border-pink-500/20" : "bg-green-500/10 text-green-500 border border-green-500/20"
                      )}>
                        {entry.type === 'expense' ? <TrendingDown size={22} /> : <TrendingUp size={22} />}
                      </div>
                      <div>
                        <p className="font-bold text-white text-base leading-tight">{entry.description}</p>
                        <p className="text-[9px] text-glass-muted font-black uppercase tracking-[0.2em] mt-1">{entry.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-5">
                      <p className={cn("font-black text-base", entry.type === 'expense' ? "text-pink-500" : "text-green-500")}>
                        {entry.type === 'expense' ? '-' : '+'}Rp {entry.amount.toLocaleString()}
                      </p>
                      <button 
                        onClick={() => deleteEntry(entry.id)}
                        className="p-2.5 text-glass-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-400/10 rounded-xl"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-10 h-full flex flex-col items-center justify-center bg-white/[0.03]">
            <h3 className="font-bold text-lg text-white mb-2">Alokasi Budget</h3>
            <p className="text-[10px] text-glass-muted uppercase tracking-[0.2em] font-black mb-12 opacity-60">Visualisasi Pengeluaran</p>
            {pieData.length > 0 ? (
              <>
                <div className="w-full h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        innerRadius={80}
                        outerRadius={100}
                        paddingAngle={10}
                        dataKey="value"
                        animationBegin={0}
                        animationDuration={1000}
                        stroke="none"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="outline-none" />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                          borderRadius: '24px', 
                          border: '1px solid rgba(255,255,255,0.1)',
                          backdropFilter: 'blur(10px)',
                          padding: '12px 20px'
                        }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-4 w-full mt-12">
                  {pieData.map((cat, idx) => (
                    <div key={idx} className="flex items-center space-x-4 bg-white/[0.03] p-4 rounded-3xl border border-white/5 group hover:bg-white/[0.06] transition-colors">
                      <div className="w-3.5 h-3.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(255,255,255,0.2)]" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[9px] font-black text-glass-muted uppercase tracking-[0.15em] mb-1">{cat.name}</p>
                        <p className="text-base font-black text-white">Rp {cat.value.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center text-glass-muted font-bold uppercase tracking-widest text-xs opacity-20 py-20">
                <PieChartIcon size={48} className="mx-auto mb-4" />
                Belum ada data visual
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Transaction Modal/Overlay */}
      <AnimatePresence>
        {showAddForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowAddForm(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="glass-card w-full max-w-md p-10 bg-[#1e293b]/90 border-white/20 relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-white">Catat Transaksi</h3>
                <button onClick={() => setShowAddForm(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={addEntry} className="space-y-8">
                <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/5">
                  <button 
                    type="button"
                    onClick={() => setType('expense')}
                    className={cn(
                      "flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                      type === 'expense' ? "bg-indigo-500 text-white shadow-lg" : "text-glass-muted"
                    )}
                  >
                    Pengeluaran
                  </button>
                  <button 
                    type="button"
                    onClick={() => setType('income')}
                    className={cn(
                      "flex-1 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all",
                      type === 'income' ? "bg-green-500 text-white shadow-lg" : "text-glass-muted"
                    )}
                  >
                    Pemasukan
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Jumlah Nominal (Rp)</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="glass-input w-full p-5 text-xl font-black focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Deskripsi Singkat</label>
                    <input 
                      type="text" 
                      placeholder="E.g. Makan malam sehat"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="glass-input w-full p-5 font-bold"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Pilih Kategori</label>
                    <div className="relative">
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="glass-input w-full p-5 font-bold appearance-none cursor-pointer"
                      >
                        <option>Food</option>
                        <option>Transport</option>
                        <option>Bills</option>
                        <option>Shopping</option>
                        <option>Entertainment</option>
                        <option>Health</option>
                        <option>Tabungan</option>
                        <option>Other</option>
                      </select>
                      <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                        <ArrowRight size={16} className="rotate-90" />
                      </div>
                    </div>
                  </div>
                </div>

                <button 
                  type="submit"
                  className="glass-button w-full py-5 text-lg font-black shadow-indigo-500/40"
                >
                  Konfirmasi & Simpan
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Settings Modal */}
      <AnimatePresence>
        {showEditSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditSettings(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 30 }}
              className="glass-card w-full max-w-md p-10 bg-[#1e293b]/90 border-white/20 relative z-10 shadow-2xl"
            >
              <div className="flex justify-between items-center mb-10">
                <h3 className="text-2xl font-black text-white">Financial Target</h3>
                <button onClick={() => setShowEditSettings(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors text-white">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={updateSettings} className="space-y-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Saldo Bulanan Awal</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={editInitialMonthly}
                      onChange={(e) => setEditInitialMonthly(e.target.value)}
                      className="glass-input w-full p-5 text-xl font-black focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Saldo Tabungan Awal</label>
                    <input 
                      type="number" 
                      placeholder="0"
                      value={editInitialSavings}
                      onChange={(e) => setEditInitialSavings(e.target.value)}
                      className="glass-input w-full p-5 text-xl font-black focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] ml-2">Savings Goal (Target Akhir)</label>
                    <input 
                      type="number" 
                      placeholder="E.g. 10000000"
                      value={editSavingsGoal}
                      onChange={(e) => setEditSavingsGoal(e.target.value)}
                      className="glass-input w-full p-5 text-xl font-black focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="glass-button w-full py-5 text-lg font-black shadow-indigo-500/40"
                >
                  Save Settings
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

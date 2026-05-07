import React, { useState, useEffect } from 'react';
import { 
  Droplet, 
  Moon, 
  Footprints, 
  Activity, 
  Zap, 
  AlertCircle, 
  PenLine, 
  Sparkles, 
  Smile, 
  Meh, 
  Frown,
  Brain
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeJournalSentiment } from '../services/geminiService';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { doc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

export default function Health({ user }: { user: User }) {
  const [water, setWater] = useState(0);
  const [energy, setEnergy] = useState(5);
  const [stress, setStress] = useState(5);
  const [sleep, setSleep] = useState(7.5);
  const [steps, setSteps] = useState(6432);
  const [activeMinutes, setActiveMinutes] = useState(35);
  const [journal, setJournal] = useState('');
  const [aiAnalysis, setAiAnalysis] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Editing states
  const [isEditingSleep, setIsEditingSleep] = useState(false);
  const [isEditingSteps, setIsEditingSteps] = useState(false);
  const [isEditingActive, setIsEditingActive] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const energyLevels = [
    { value: 1, label: '1 - Sangat Lemas' },
    { value: 2, label: '2 - Sangat Lelah' },
    { value: 3, label: '3 - Lelah' },
    { value: 4, label: '4 - Kurang Berenergi' },
    { value: 5, label: '5 - Cukup (Neutral)' },
    { value: 6, label: '6 - Stabil' },
    { value: 7, label: '7 - Bersemangat' },
    { value: 8, label: '8 - Sangat Bersemangat' },
    { value: 9, label: '9 - Penuh Energi' },
    { value: 10, label: '10 - Sangat Berenergi' },
  ];

  const stressLevels = [
    { value: 1, label: '1 - Sangat Tenang (Zen)' },
    { value: 2, label: '2 - Tenang' },
    { value: 3, label: '3 - Santai' },
    { value: 4, label: '4 - Sedikit Tegang' },
    { value: 5, label: '5 - Cukup (Neutral)' },
    { value: 6, label: '6 - Tegang' },
    { value: 7, label: '7 - Stres' },
    { value: 8, label: '8 - Sangat Stres' },
    { value: 9, label: '9 - Kewalahan' },
    { value: 10, label: '10 - Sangat Kewalahan' },
  ];

  useEffect(() => {
    const healthPath = `users/${user.uid}/health/${today}`;
    const unsubscribe = onSnapshot(doc(db, healthPath), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setWater(data.waterIntake || 0);
        setEnergy(data.energyLevel || 5);
        setStress(data.stressLevel || 5);
        setSleep(data.sleepHours || 7.5);
        setSteps(data.stepsCount || 6432);
        setActiveMinutes(data.activeMinutes || 35);
        setJournal(data.journal || '');
      }
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, healthPath, auth);
    });
    return unsubscribe;
  }, [user.uid, today]);

  const updateHealthData = async (fields: any) => {
    const healthPath = `users/${user.uid}/health/${today}`;
    try {
      await setDoc(doc(db, healthPath), {
        ...fields,
        date: today,
        ownerId: user.uid,
        updatedAt: serverTimestamp()
      }, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, healthPath, auth);
    }
  };

  const handleAnalyze = async () => {
    if (!journal.trim()) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeJournalSentiment(journal);
      setAiAnalysis(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return <div className="p-8 flex justify-center h-full items-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent" /></div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Health & Vitality</h1>
          <p className="text-glass-muted text-sm font-medium">Pantau kondisi fisik dan mentalmu dengan AI insights.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-6 flex items-center justify-between bg-white/[0.03]">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-500/10 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/20">
                  <Droplet size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] leading-none mb-1">Hydration</p>
                  <h4 className="text-xl font-black text-white">{water} Gelas</h4>
                </div>
              </div>
              <div className="flex space-x-1">
                {[1,2,3,4,5,6,7,8].map(i => (
                  <button 
                    key={i} 
                    onClick={() => {
                      setWater(i);
                      updateHealthData({ waterIntake: i });
                    }}
                    className={cn(
                      "w-2 h-7 rounded-full transition-all hover:scale-y-125 duration-300",
                      i <= water ? "bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" : "bg-white/10"
                    )} 
                  />
                ))}
              </div>
            </div>

            <div className="glass-card p-6 flex items-center justify-between bg-white/[0.03]">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                  <Moon size={24} />
                </div>
                <div>
                  <p className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] leading-none mb-1">Sleep</p>
                  {isEditingSleep ? (
                    <input 
                      type="number" step="0.1"
                      className="bg-white/5 border border-white/10 rounded px-2 py-1 text-white text-lg font-black w-20 outline-none"
                      value={sleep}
                      onChange={(e) => setSleep(parseFloat(e.target.value))}
                      onBlur={() => {
                        setIsEditingSleep(false);
                        updateHealthData({ sleepHours: sleep });
                      }}
                      autoFocus
                    />
                  ) : (
                    <h4 
                      className="text-xl font-black text-white cursor-pointer hover:text-indigo-400 transition-colors"
                      onClick={() => setIsEditingSleep(true)}
                    >
                      {sleep} Jam
                    </h4>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-2 py-0.5 rounded">Deep Recovery</p>
                <p className="text-xs font-bold text-white mt-1 uppercase tracking-widest opacity-60">{sleep >= 7 ? 'Optimum' : 'Need Rest'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-card p-8 bg-white/[0.03] space-y-5">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-orange-500/10 rounded-lg flex items-center justify-center border border-orange-500/20">
                  <Footprints size={16} className="text-orange-400" />
                </div>
                <span className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em]">Step Tracker</span>
              </div>
              <div className="flex items-baseline space-x-2">
                {isEditingSteps ? (
                  <input 
                    type="number"
                    className="bg-white/5 border border-white/10 rounded px-3 py-1 text-3xl font-black text-white w-40 outline-none"
                    value={steps}
                    onChange={(e) => setSteps(parseInt(e.target.value))}
                    onBlur={() => {
                      setIsEditingSteps(false);
                      updateHealthData({ stepsCount: steps });
                    }}
                    autoFocus
                  />
                ) : (
                  <h3 
                    className="text-3xl font-black text-white cursor-pointer hover:text-orange-400 transition-colors"
                    onClick={() => setIsEditingSteps(true)}
                  >
                    {steps.toLocaleString()}
                  </h3>
                )}
                <span className="text-glass-muted text-xs font-bold opacity-40">/ 10.000 STEPS</span>
              </div>
              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.4)] transition-all duration-500" style={{ width: `${Math.min((steps / 10000) * 100, 100)}%` }} />
              </div>
            </div>

            <div className="glass-card p-8 bg-white/[0.03] space-y-5">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-pink-500/10 rounded-lg flex items-center justify-center border border-pink-500/20">
                  <Activity size={16} className="text-pink-400" />
                </div>
                <span className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em]">Active Minutes</span>
              </div>
              <div className="flex items-baseline space-x-2">
                {isEditingActive ? (
                  <input 
                    type="number"
                    className="bg-white/5 border border-white/10 rounded px-3 py-1 text-3xl font-black text-white w-24 outline-none"
                    value={activeMinutes}
                    onChange={(e) => setActiveMinutes(parseInt(e.target.value))}
                    onBlur={() => {
                      setIsEditingActive(false);
                      updateHealthData({ activeMinutes: activeMinutes });
                    }}
                    autoFocus
                  />
                ) : (
                  <h3 
                    className="text-3xl font-black text-white cursor-pointer hover:text-pink-400 transition-colors"
                    onClick={() => setIsEditingActive(true)}
                  >
                    {activeMinutes}
                  </h3>
                )}
                <span className="text-glass-muted text-xs font-bold opacity-40">MINUTES TODAY</span>
              </div>
              <p className="text-[10px] text-glass-muted font-bold tracking-wide flex items-center space-x-1 uppercase opacity-60">
                <span className="w-1 h-1 bg-pink-500 rounded-full animate-ping" />
                <span>{activeMinutes >= 30 ? 'Target tercapai!' : 'Sedikit lagi!'}</span>
              </p>
            </div>
          </div>

          <div className="glass-card p-8 bg-white/[0.03] space-y-10">
            <h3 className="font-bold text-white flex items-center space-x-4">
              <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                <Brain size={20} />
              </div>
              <span className="text-lg">State of Mind</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] flex items-center space-x-3">
                    <Zap size={16} className="text-indigo-400" />
                    <span>Energy Pulse</span>
                  </label>
                  <span className="text-sm font-black text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded-xl border border-indigo-500/20">
                    {energy}/10
                  </span>
                </div>
                <div className="relative group">
                  <select 
                    value={energy}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setEnergy(v);
                      updateHealthData({ energyLevel: v });
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  >
                    {energyLevels.map((lvl) => (
                      <option key={lvl.value} value={lvl.value} className="bg-[#1e293b] text-white">
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <Zap size={14} className="text-indigo-400" />
                  </div>
                </div>
                <div className="flex justify-between text-[8px] font-black text-glass-muted uppercase tracking-[0.2em] opacity-40">
                  <span>Pilih level negi harianmu</span>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-glass-muted uppercase tracking-[0.2em] flex items-center space-x-3">
                    <AlertCircle size={16} className="text-pink-400" />
                    <span>Stress Load</span>
                  </label>
                  <span className="text-sm font-black text-pink-400 bg-pink-500/10 px-3 py-1 rounded-xl border border-pink-500/20">
                    {stress}/10
                  </span>
                </div>
                <div className="relative group">
                  <select 
                    value={stress}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      setStress(v);
                      updateHealthData({ stressLevel: v });
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold text-white outline-none appearance-none cursor-pointer focus:ring-2 focus:ring-pink-500/20 transition-all"
                  >
                    {stressLevels.map((lvl) => (
                      <option key={lvl.value} value={lvl.value} className="bg-[#1e293b] text-white">
                        {lvl.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                    <AlertCircle size={14} className="text-pink-400" />
                  </div>
                </div>
                <div className="flex justify-between text-[8px] font-black text-glass-muted uppercase tracking-[0.2em] opacity-40">
                  <span>Pilih tingkat stress harianmu</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-10 bg-indigo-500/10 border-indigo-500/20 h-full flex flex-col group hover:bg-indigo-500/[0.15] transition-all duration-500">
            <h3 className="font-black text-white flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <PenLine size={20} className="text-indigo-400" />
                <span className="text-lg">Reflective Journal</span>
              </div>
              <div className="w-2 h-2 bg-indigo-500 rounded-full group-hover:animate-ping" />
            </h3>
            <textarea 
              placeholder="Apa yang ada di pikiranmu hari ini? Biarkan kata-kata mengalir..."
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              onBlur={() => updateHealthData({ journal })}
              className="flex-1 bg-transparent border-none outline-none resize-none text-white font-medium placeholder-indigo-300/30 min-h-[250px] leading-relaxed text-sm"
            />
            <div className="pt-8 border-t border-white/5 space-y-6">
              <button 
                onClick={handleAnalyze}
                disabled={isAnalyzing || !journal}
                className="glass-button w-full py-5 text-indigo-400 border-indigo-500/30 flex items-center justify-center space-x-3 hover:bg-indigo-500 hover:text-white transition-all disabled:opacity-20"
              >
                {isAnalyzing ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                ) : (
                  <Sparkles size={20} />
                )}
                <span className="font-black">Deep AI Insight</span>
              </button>

              <AnimatePresence>
                {aiAnalysis && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6 glass-card bg-indigo-500/5 border-indigo-500/20 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 p-3 opacity-10"><Brain size={40} /></div>
                    <div className="flex items-center space-x-3 font-black text-xs uppercase tracking-[0.2em] text-indigo-400 mb-4">
                      <Sparkles size={14} />
                      <span>Sentiment Decoding</span>
                    </div>
                    <p className="text-xs text-indigo-100 italic leading-loose font-medium opacity-80 backdrop-blur-sm">
                      {aiAnalysis}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

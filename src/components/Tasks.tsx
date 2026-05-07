import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Sparkles, 
  Clock, 
  Calendar as CalendarIcon,
  CheckCircle2,
  Circle,
  MoreVertical,
  Trash2
} from 'lucide-react';
import { motion } from 'motion/react';
import { Task } from '../types';
import { generateSmartSchedule } from '../services/geminiService';
import { cn, handleFirestoreError, OperationType } from '../lib/utils';
import { db, auth } from '../lib/firebase';
import { collection, query, onSnapshot, addDoc, updateDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { User } from 'firebase/auth';

export default function Tasks({ user }: { user: User }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Real-time listener
  useEffect(() => {
    const tasksPath = `users/${user.uid}/tasks`;
    const q = query(collection(db, tasksPath));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
      // Sort tasks by start time
      const sortedTasks = taskData.sort((a, b) => {
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });
      setTasks(sortedTasks);
      setIsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, tasksPath, auth);
    });
    return unsubscribe;
  }, [user.uid]);

  const addTask = async () => {
    if (!newTaskTitle.trim()) return;
    const tasksPath = `users/${user.uid}/tasks`;
    try {
      await addDoc(collection(db, tasksPath), {
        title: newTaskTitle,
        startTime,
        endTime,
        date: new Date().toISOString().split('T')[0],
        isCompleted: false,
        isImportant: false,
        category: 'other',
        priority: 'medium',
        ownerId: user.uid,
        createdAt: serverTimestamp()
      });
      setNewTaskTitle('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, tasksPath, auth);
    }
  };

  const toggleTask = async (task: Task) => {
    const taskPath = `users/${user.uid}/tasks/${task.id}`;
    try {
      await updateDoc(doc(db, taskPath), {
        isCompleted: !task.isCompleted
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, taskPath, auth);
    }
  };

  const deleteTask = async (taskId: string) => {
    const taskPath = `users/${user.uid}/tasks/${taskId}`;
    try {
      await deleteDoc(doc(db, taskPath));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, taskPath, auth);
    }
  };

  const handleSmartSchedule = async () => {
    setIsAiLoading(true);
    try {
      const scheduledTasks = await generateSmartSchedule(tasks.map(t => ({ title: t.title, priority: t.priority })));
      // Update each task with the AI generated schedule
      for (const task of tasks) {
        const aiTask = scheduledTasks.find((at: any) => at.title === task.title);
        if (aiTask && (aiTask.startTime !== task.startTime || aiTask.endTime !== task.endTime)) {
          const taskPath = `users/${user.uid}/tasks/${task.id}`;
          await updateDoc(doc(db, taskPath), {
            startTime: aiTask.startTime,
            endTime: aiTask.endTime
          });
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Daily Flow</h1>
          <p className="text-glass-muted text-sm font-medium">Susun jadwal harianmu secara manual sesuai kebutuhan.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-4 space-y-4 bg-white/[0.03]">
            <div className="flex items-center space-x-3">
              <input 
                type="text" 
                placeholder="Apa yang ingin kamu selesaikan?" 
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addTask()}
                className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 outline-none text-white font-medium placeholder-glass-muted focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center space-x-4 flex-1">
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] font-black text-glass-muted uppercase tracking-widest ml-1">Mulai</label>
                  <input 
                    type="time" 
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
                <div className="flex-1 space-y-1">
                  <label className="text-[9px] font-black text-glass-muted uppercase tracking-widest ml-1">Selesai</label>
                  <input 
                    type="time" 
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>
              <button 
                onClick={addTask}
                className="h-14 px-8 glass-button bg-indigo-500 hover:bg-indigo-600 !p-0 flex items-center justify-center shrink-0 mt-5"
              >
                <Plus size={24} />
              </button>
            </div>
          </div>

          <div className="space-y-4 min-h-[400px]">
            {isLoading ? (
              [1,2,3].map(i => <div key={i} className="h-24 glass-card animate-pulse" />)
            ) : tasks.length === 0 ? (
              <div className="glass-card p-20 text-center flex flex-col items-center justify-center border-dashed border-white/5">
                <CheckCircle2 className="text-white/10 mb-6" size={64} />
                <p className="text-glass-muted font-bold uppercase tracking-widest text-xs">Semua tugas telah diselesaikan</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => (
                  <motion.div 
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "glass-card p-5 flex items-center justify-between group transition-all bg-white/[0.02] hover:bg-white/[0.05] border-transparent hover:border-indigo-500/20",
                      task.isCompleted && "opacity-40"
                    )}
                  >
                    <div className="flex items-center space-x-5">
                      <button 
                        onClick={() => toggleTask(task)}
                        className={cn(
                          "transition-all duration-300",
                          task.isCompleted ? "text-indigo-400" : "text-glass-muted hover:text-white"
                        )}
                      >
                        {task.isCompleted ? <CheckCircle2 size={26} /> : <Circle size={26} />}
                      </button>
                      <div>
                        <h4 className={cn("text-base font-bold text-white transition-all", task.isCompleted && "line-through opacity-50")}>
                          {task.title}
                        </h4>
                        <div className="flex items-center space-x-4 mt-1">
                          {task.startTime && (
                            <div className="flex items-center space-x-1.5 text-[10px] font-bold text-indigo-400/80 bg-indigo-500/10 px-2 py-0.5 rounded-md uppercase tracking-wider">
                              <Clock size={10} />
                              <span>{task.startTime} - {task.endTime}</span>
                            </div>
                          )}
                          <span className="text-[9px] uppercase tracking-[0.2em] font-black text-glass-muted opacity-40">{task.category}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteTask(task.id)}
                      className="p-3 text-glass-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-xl"
                    >
                      <Trash2 size={20} />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 bg-white/[0.03] sticky top-8">
            <div className="flex justify-between items-center mb-10">
              <h3 className="font-bold text-white flex items-center space-x-3">
                <Clock size={20} className="text-indigo-400" />
                <span>Daily Timeline</span>
              </h3>
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
            </div>
            
            <div className="space-y-10 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-white/5">
              {tasks.filter(t => t.startTime).map((task) => (
                <div key={task.id} className="relative pl-8 group">
                  <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full bg-glass-bg border-2 border-indigo-500 z-10 shadow-[0_0_10px_rgba(99,102,241,0.4)] group-hover:scale-125 transition-transform" />
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-1.5">{task.startTime} - {task.endTime}</p>
                  <h5 className={cn("text-sm font-bold text-white transition-all", task.isCompleted && "opacity-30")}>{task.title}</h5>
                </div>
              ))}
              
              {tasks.filter(t => t.startTime).length === 0 && (
                <div className="text-center py-10 opacity-40">
                  <Clock size={32} className="mx-auto mb-4 text-white/10" />
                  <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">Belum ada jadwal<br/>yang ditambahkan</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

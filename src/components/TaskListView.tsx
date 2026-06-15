import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TaskItem, User } from '../types';
import { ArrowLeft, Clock, Gift } from 'lucide-react';
import { motion } from 'motion/react';
import { TaskSubmitView } from './TaskSubmitView';
import toast from 'react-hot-toast';

interface TaskListViewProps {
  taskType: string;
  categoryTitle: string;
  user: User;
  onBack: () => void;
}

export function TaskListView({ taskType, categoryTitle, user, onBack }: TaskListViewProps) {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  useEffect(() => {
    loadTasks();
  }, [taskType]);

  const loadTasks = async () => {
    setLoading(true);
    
    // Fetch submissions for this user
    const { data: userSubmissions } = await supabase
      .from('submissions')
      .select('task_id, status')
      .eq('user_id', user.id);

    // Get IDs of tasks that are pending or approved
    const completedTaskIds = new Set(
      (userSubmissions || [])
        .filter(sub => sub.status === 'pending' || sub.status === 'approved')
        .map(sub => sub.task_id)
    );

    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('task_type', taskType)
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (data) {
      // Filter out completed tasks
      setTasks(data.filter(task => !completedTaskIds.has(task.id)));
    }
    setLoading(false);
  };

  if (selectedTask) {
    return (
      <TaskSubmitView 
        task={selectedTask} 
        user={user} 
        onBack={() => setSelectedTask(null)}
        onSuccess={() => {
          loadTasks();
          setSelectedTask(null);
        }}
      />
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
      <div className="bg-primary px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-black/10 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">{categoryTitle}</h1>
        </div>
        {taskType === 'premium' && (
           <span className="bg-amber-400 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
             99+ Available
           </span>
        )}
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
             <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin mb-4"></div>
             <span className="font-bold uppercase tracking-widest text-[10px]">Loading Tasks...</span>
          </div>
        ) : tasks.length === 0 ? (
          taskType === 'premium' ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-10 flex flex-col items-center justify-center gap-3 text-slate-400 mt-10"
            >
              <motion.div 
                animate={{ rotate: 360 }} 
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} 
                className="w-5 h-5 border-[3px] border-slate-200 border-t-slate-400 rounded-full" 
              />
              <span className="text-xs font-black tracking-widest uppercase opacity-70">Loading....</span>
            </motion.div>
          ) : (
            <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 p-10 text-center">
              <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock size={32} />
              </div>
              <h3 className="font-black text-slate-800 text-lg mb-1">No Tasks Available</h3>
              <p className="text-slate-500 text-sm">Please check back later for new tasks.</p>
            </div>
          )
        ) : (
          tasks.map((task, i) => (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              key={task.id}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                if (taskType === 'premium' && !user.isPro) {
                  toast.error('এই টাস্কটি করার জন্য BD Pro একটিভ করতে হবে!', { icon: '👑' });
                  return;
                }
                setSelectedTask(task);
              }}
              className={`relative overflow-hidden bg-white rounded-[24px] shadow-[0_4px_20px_rgb(0,0,0,0.03)] border p-5 cursor-pointer flex flex-col gap-4 group ${taskType === 'premium' && !user.isPro ? 'border-amber-200 bg-gradient-to-br from-amber-50 to-white opacity-90' : 'border-slate-100'}`}
            >
              {taskType === 'premium' && (
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-100 to-amber-50 rounded-bl-full -mr-4 -mt-4 z-0 transition-transform group-hover:scale-110"></div>
              )}
              
              <div className="relative z-10 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="font-black text-slate-800 text-lg leading-tight mb-2 group-hover:text-indigo-600 transition-colors">{task.title}</h3>
                  <div className="inline-flex items-center gap-1.5 font-black text-[13px] tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                    <Gift size={16} className="text-emerald-500" /> 
                    <span>৳ {Number(task.reward).toFixed(2)}</span>
                  </div>
                </div>
                <div className={`shrink-0 flex items-center justify-center h-12 px-5 rounded-2xl font-bold tracking-wide text-sm shadow-sm transition-all ${taskType === 'premium' && !user.isPro ? 'bg-gradient-to-br from-amber-400 to-amber-500 text-white shadow-amber-500/20' : 'bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200/50 text-indigo-700 group-hover:from-indigo-500 group-hover:to-indigo-600 group-hover:text-white group-hover:shadow-indigo-500/20'}`}>
                  {taskType === 'premium' && !user.isPro ? '👑 Unlock' : 'Start'}
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
}

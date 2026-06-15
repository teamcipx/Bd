import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '../types';
import { ArrowLeft, Clock, Copy, CheckCircle2, AlertCircle, PlayCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export function GmailTaskView({ user, onBack }: { user: User, onBack: () => void }) {
  const [task, setTask] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(3600); // 1 hour in seconds
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [availableCount, setAvailableCount] = useState<number | null>(null);

  useEffect(() => {
    checkExistingTask();
    fetchAvailableCount();
  }, []);

  const fetchAvailableCount = async () => {
    const { count } = await supabase
      .from('gmail_tasks')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available');
    setAvailableCount(count);
  };

  useEffect(() => {
    let timer: number;
    if (task && !success) {
      // calculate time left
      const updateTimer = () => {
        const lockedAt = new Date(task.locked_at).getTime();
        const now = new Date().getTime();
        const diff = Math.floor((3600000 - (now - lockedAt)) / 1000);
        
        if (diff <= 0) {
          setTimeLeft(0);
          setError('Time expired. Task has been unlocked.');
          setTask(null);
        } else {
          setTimeLeft(diff);
        }
      };
      updateTimer();
      timer = window.setInterval(updateTimer, 1000);
    }
    return () => window.clearInterval(timer);
  }, [task, success]);

  const checkExistingTask = async () => {
    setLoading(true);
    // Check if user already has a locked task
    const { data: existing } = await supabase
      .from('gmail_tasks')
      .select('*')
      .eq('locked_by', user.id)
      .eq('status', 'locked')
      .order('locked_at', { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
       // Check if it's expired
       const lockedAt = new Date(existing[0].locked_at).getTime();
       const now = new Date().getTime();
       if (now - lockedAt > 3600000) {
         // Expired, unlock it
         await supabase.from('gmail_tasks').update({ status: 'available', locked_by: null, locked_at: null }).eq('id', existing[0].id);
       } else {
         setTask(existing[0]);
       }
    }
    setLoading(false);
  };

  const reserveTask = async () => {
    setLoading(true);
    setError('');
    
    // First, find an available task (or one that is locked but expired)
    // Supabase RPC or we can do client side (less safe but OK for prototypes)
    const thirtyGo = new Date(Date.now() - 3600000).toISOString();
    
    // Try to get available
    const { data: availableData, error: err } = await supabase
      .from('gmail_tasks')
      .select('*')
      .eq('status', 'available')
      .limit(1);

    let targetTask = availableData && availableData[0];
    
    if (!targetTask) {
       // Check if there are expired locked tasks
       const { data: expiredData } = await supabase
         .from('gmail_tasks')
         .select('*')
         .eq('status', 'locked')
         .lt('locked_at', thirtyGo)
         .limit(1);
         
       if (expiredData && expiredData[0]) {
         targetTask = expiredData[0];
       }
    }

    if (targetTask) {
       // Lock it
       const now = new Date().toISOString();
       const { data: updated, error: lockErr } = await supabase
         .from('gmail_tasks')
         .update({ status: 'locked', locked_by: user.id, locked_at: now })
         .eq('id', targetTask.id)
         .select();
         
       if (updated && updated[0]) {
         setTask(updated[0]);
       } else {
         setError('Failed to lock task. Please try again.');
       }
    } else {
       setError('No Gmail tasks are currently available. Please check back later.');
    }
    
    setLoading(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add toast here
  };

  const submitTask = async () => {
    if (!task) return;
    setSubmitting(true);
    setError('');
    const { error: err } = await supabase
      .from('gmail_tasks')
      .update({ status: 'submitted' })
      .eq('id', task.id);
      
    setSubmitting(false);
    if (err) {
      setError(err.message);
    } else {
      setSuccess(true);
    }
  };

  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-md mx-auto pt-10 pb-24 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Submitted Successfully!</h2>
        <p className="text-slate-500 mb-8">Your Gmail creation has been submitted and is pending admin approval.</p>
        <button 
          onClick={onBack}
          className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          Back to Dashboard
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-24">
      <div className="bg-primary px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3 text-white">
        <button onClick={onBack} className="p-2 hover:bg-black/10 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Gmail Task</h1>
      </div>

      <div className="p-4 max-w-md mx-auto">
        {error && (
          <div className="mb-4 flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 className="animate-spin mb-4 text-indigo-500" size={32} />
            <span className="font-bold tracking-widest uppercase text-[10px]">Checking available tasks...</span>
          </div>
        ) : !task ? (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-8 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-indigo-50 to-emerald-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>
             
             <div className="relative z-10">
               <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-500/20 transform rotate-3">
                  <PlayCircle size={36} className="-rotate-3" />
               </div>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-3">জিমেইল তৈরি করুন</h2>
               {availableCount !== null && (
                 <div className="bg-indigo-50 text-indigo-600 inline-block px-4 py-1.5 rounded-full text-sm font-bold border border-indigo-100 shadow-sm mb-2">
                   {availableCount} Tasks Available
                 </div>
               )}
               <div className="text-left text-[13px] text-slate-600 space-y-2 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100 mt-4 mx-auto max-w-[300px]">
                  <p className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-2">কাজের নিয়মাবলি:</p>
                  <ul className="list-decimal pl-4 space-y-2 font-medium">
                    <li>প্রথমে Find & Lock Task বাটনে ক্লিক করুন।</li>
                    <li>আপনাকে যে নাম, পাসওয়ার্ড ও ইমেইল দেওয়া হবে, শুধু সেগুলো দিয়েই নতুন জিমেইল খুলতে হবে।</li>
                    <li>জিমেইল খোলার পর কোনো রিকভারি ইমেইল বা নাম্বার যুক্ত করবেন না।</li>
                    <li>একাউন্ট তৈরি করে সাবমিট করার জন্য <strong className="text-indigo-600 bg-indigo-50 px-1 rounded">১ ঘন্টা</strong> সময় পাবেন।</li>
                    <li>সফলভাবে খোলার পর নিচে সাবমিট বাটনে ক্লিক করুন।</li>
                  </ul>
               </div>
               <button 
                 onClick={reserveTask}
                 className="w-full bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-black transition-all flex justify-center items-center gap-2 active:scale-95 shadow-lg shadow-black/10"
               >
                 <PlayCircle size={20} /> Find & Lock Task
               </button>
             </div>
          </motion.div>
        ) : (
          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="space-y-5">
             <div className="bg-gradient-to-br from-amber-500 to-orange-500 rounded-[28px] p-6 text-center shadow-xl shadow-orange-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                <div className="flex items-center justify-center gap-2 text-orange-100 font-extrabold mb-1.5 uppercase tracking-widest text-[11px] relative z-10">
                   <Clock size={16} /> Time Remaining
                </div>
                <div className="text-5xl font-black text-white font-mono tracking-tighter relative z-10 drop-shadow-sm">
                   {formatTime(timeLeft)}
                </div>
             </div>
             
             <div className="bg-white rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.06)] border border-slate-100 p-6">
                <h3 className="font-bold text-slate-800 border-b border-slate-100 pb-4 mb-5 text-[15px] flex items-center gap-2">
                  <PlayCircle size={18} className="text-indigo-500" /> Account Details
                </h3>
                
                <div className="space-y-4">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">First Name</label>
                     <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100 p-3.5 rounded-2xl group hover:shadow-md transition-all">
                        <span className="font-bold text-slate-800 text-[15px]">{task.first_name}</span>
                        <button onClick={() => copyToClipboard(task.first_name)} className="text-slate-400 p-2 rounded-xl hover:bg-white hover:text-indigo-600 transition-colors shadow-sm bg-white border border-slate-100"><Copy size={16}/></button>
                     </div>
                  </div>
                  
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Last Name</label>
                     <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100 p-3.5 rounded-2xl group hover:shadow-md transition-all">
                        <span className="font-bold text-slate-800 text-[15px]">{task.last_name}</span>
                        <button onClick={() => copyToClipboard(task.last_name)} className="text-slate-400 p-2 rounded-xl hover:bg-white hover:text-indigo-600 transition-colors shadow-sm bg-white border border-slate-100"><Copy size={16}/></button>
                     </div>
                  </div>

                  <div>
                     <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Email Prefix</label>
                     <div className="flex items-center justify-between bg-indigo-50/50 border border-indigo-100 p-3.5 rounded-2xl group hover:shadow-md transition-all">
                        <span className="font-bold text-indigo-900 text-[15px]">{task.email_prefix}</span>
                        <button onClick={() => copyToClipboard(task.email_prefix)} className="text-indigo-500 p-2 rounded-xl hover:bg-white hover:text-indigo-600 transition-colors shadow-sm bg-white border border-indigo-100"><Copy size={16}/></button>
                     </div>
                  </div>
                  
                  <div>
                     <label className="block text-[10px] font-black text-emerald-600/70 uppercase tracking-widest mb-1.5 ml-1">Password</label>
                     <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100 p-3.5 rounded-2xl group hover:shadow-md transition-all">
                        <span className="font-bold text-emerald-900 font-mono tracking-tight text-[15px]">{task.password}</span>
                        <button onClick={() => copyToClipboard(task.password)} className="text-emerald-500 p-2 rounded-xl hover:bg-white hover:text-emerald-600 transition-colors shadow-sm bg-white border border-emerald-100"><Copy size={16}/></button>
                     </div>
                  </div>
                </div>
                
                <div className="pt-2 text-sm text-slate-500 font-medium">
                  উপরের বিবরণগুলো ঠিকঠাক ব্যবহার করে একটি নতুন জিমেইল অ্যাকাউন্ট তৈরি করুন। ফোন ভেরিফিকেশন ছাড়া সফলভাবে একাউন্ট তৈরি হলে নিচের বাটনে ক্লিক করে সাবমিট করুন।
                </div>
             </div>

             <button 
               onClick={submitTask}
               disabled={submitting}
               className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-70 disabled:shadow-none mt-4"
             >
               {submitting ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
               সাবমিট করুন
             </button>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

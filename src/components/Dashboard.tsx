import { User } from '../types';
import { TASK_LIST } from '../data';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Wallet, Flame, CheckCircle2, ChevronRight, Menu, Home, Clock, Coins, User as UserIcon, ShieldAlert, X, HelpCircle, Info, Star, Bell, Gift, Send, Crown, Mail, Calendar, Video } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { TaskListView } from './TaskListView';
import { AdminPanel } from './AdminPanel';
import { HistoryView } from './HistoryView';
import { SiteAgeCounter } from './SiteAgeCounter';
import { RechargeView } from './RechargeView';
import { GmailTaskView } from './GmailTaskView';
import { ReferralView } from './ReferralView';
import { WithdrawView } from './WithdrawView';
import { ReviewView } from './ReviewView';
import { UpdatesView } from './UpdatesView';
import { SupportWidget } from './SupportWidget';
import { BDProView } from './BDProView';
import { KYCView } from './KYCView';
import { TutorialView } from './TutorialView';
import toast from 'react-hot-toast';

import { OnboardingView } from './OnboardingView';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  setUser: (user: User) => void;
}

export function Dashboard({ user, onLogout, setUser }: DashboardProps) {
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(`bdpay_onboarding_${user.id}`));
  const [isBanned, setIsBanned] = useState(false);
  const [canCheckIn, setCanCheckIn] = useState(true);
  const [checkInMsg, setCheckInMsg] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'withdraw' | 'reviews' | 'account' | 'admin' | 'updates' | 'bdpro' | 'kyc' | 'tutorial'>(() => {
    const path = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
    return ['home', 'history', 'withdraw', 'reviews', 'account', 'admin', 'updates', 'bdpro', 'kyc', 'tutorial'].includes(path) ? (path as any) : 'home';
  });

  useEffect(() => {
    const currentPath = `/${activeTab}`;
    if (window.location.pathname !== currentPath) {
      window.history.pushState(null, '', currentPath);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/+/, '').replace(/\/+$/, '');
      if (['home', 'history', 'withdraw', 'reviews', 'account', 'admin', 'updates', 'bdpro'].includes(path)) {
        setActiveTab(path as any);
      } else if (path === '') {
        setActiveTab('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTaskCategory, setActiveTaskCategory] = useState<string | null>(null);
  const [activeTaskTitle, setActiveTaskTitle] = useState('');
  const [isRecharging, setIsRecharging] = useState(false);
  const [showReferral, setShowReferral] = useState(false);
  const [isGmailView, setIsGmailView] = useState(false);
  const [totalReferrals, setTotalReferrals] = useState(0);

  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [siteSettings, setSiteSettings] = useState<any>(null);
  const [showPopup, setShowPopup] = useState(false);
  const [taskCounts, setTaskCounts] = useState<Record<string, number>>({});

  const isAdmin = user.gmail === 'admin@gmail.com';
  
  let totalAvailableTasks = 0;
  for (const count of Object.values(taskCounts)) {
    totalAvailableTasks += Number(count) || 0;
  }

  useEffect(() => {
    // Check for popup setting once on mount
    const checkSettings = async () => {
      try {
        const { data } = await supabase.from('site_settings').select('*').limit(1);
        if (data && data[0]) {
          setSiteSettings(data[0]);
          if (data[0].popup_enabled && Math.random() < 0.75) {
            setShowPopup(true);
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
      }
    };
    checkSettings();

    // Fetch available task counts
    const fetchTaskCounts = async () => {
      try {
        const { data: allTasks } = await supabase.from('tasks').select('id, task_type').eq('is_active', true);
        const { data: userSubmissions } = await supabase.from('submissions').select('task_id').eq('user_id', user.id).in('status', ['pending', 'approved']);
        
        // Also fetch available gmail tasks
        const { count: gmailCount } = await supabase.from('gmail_tasks').select('*', { count: 'exact', head: true }).eq('status', 'available');

        if (allTasks) {
          const completedTaskIds = new Set((userSubmissions || []).map(s => s.task_id));
          const counts: Record<string, number> = {};
          
          allTasks.forEach(task => {
            if (!completedTaskIds.has(task.id)) {
              counts[task.task_type] = (counts[task.task_type] || 0) + 1;
            }
          });
          
          if (gmailCount !== null) {
            counts['gmail'] = gmailCount;
          }
          
          setTaskCounts(counts);
        }
      } catch (err) {
        console.error("Failed to fetch task counts", err);
      }
    };
    fetchTaskCounts();
  }, []);

  useEffect(() => {
    // Realtime Notifications
    const channel = supabase.channel('realtime-notifs')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'support_chats', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.sender_type === 'admin') {
            toast.success('সাপোর্ট থেকে নতুন মেসেজ এসেছে!', { duration: 4000, icon: '💬' });
            setUnreadNotifCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'submissions', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.status === 'approved') {
            toast.success('আপনার একটি কাজ এপ্রুভ হয়েছে!', { duration: 4000, icon: '✅' });
            setUnreadNotifCount(prev => prev + 1);
          } else if (payload.new.status === 'rejected') {
            toast.error('আপনার একটি কাজ রিজেক্ট হয়েছে!', { duration: 4000, icon: '❌' });
            setUnreadNotifCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'withdrawals', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.status === 'approved') {
            toast.success('আপনার উইথড্র রিকোয়েস্ট এপ্রুভ হয়েছে!', { duration: 5000, icon: '💸' });
            setUnreadNotifCount(prev => prev + 1);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'recharges', filter: `user_id=eq.${user.id}` },
        (payload) => {
          if (payload.new.status === 'approved') {
            toast.success('আপনার রিচার্জ রিকোয়েস্ট সফল হয়েছে!', { duration: 5000, icon: '📱' });
            setUnreadNotifCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        await supabase.rpc('auto_process_pending_tasks', { p_user_id: user.id });
        const { data: subs } = await supabase.from('submissions').select('id, status, tasks(title), updated_at').in('status', ['approved', 'rejected']).eq('user_id', user.id).order('updated_at', { ascending: false }).limit(3);
        const { data: recs } = await supabase.from('recharges').select('id, status, offer_details, updated_at').in('status', ['approved', 'rejected']).eq('user_id', user.id).order('updated_at', { ascending: false }).limit(3);
        const { data: custom } = await supabase.from('custom_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
        
        const notifs: any[] = [];
        if (subs) {
          notifs.push(...subs.map(s => ({ id: `task-${s.id}`, type: 'Task', title: Array.isArray(s.tasks) ? s.tasks[0]?.title : (s.tasks as any)?.title || 'Task', status: s.status, updated_at: s.updated_at, is_read: true })));
        }
        if (recs) {
          notifs.push(...recs.map(r => ({ id: `rec-${r.id}`, type: 'Recharge', title: r.offer_details || 'Top Up', status: r.status, updated_at: r.updated_at, is_read: true })));
        }
        if (custom) {
          notifs.push(...custom.map(c => ({ id: c.id, type: 'Admin Alert', title: c.message, status: 'info', updated_at: c.created_at, is_read: c.is_read })));
        }
        
        notifs.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
        
        setNotifications(notifs.slice(0, 10));
        setUnreadNotifCount(notifs.filter(n => !n.is_read).length);
      } catch (err) {
        console.error("Failed to fetch notifications:", err);
      }
    };
    fetchNotifications();

    const refreshUser = async () => {
      try {
        // Ensure profile and process referral
        await supabase.rpc('ensure_user_profile', { p_ref_code: user.referralCode || null });

        // Fetch actual stats - use select(*) to avoid crashing if columns are missing
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();
        let isProFlag = false;
        let isKycFlag = false;
        if (profile) {
          if (profile.is_banned) {
            setIsBanned(true);
            return;
          } else {
            setIsBanned(false);
          }
          setTotalReferrals(profile.total_referrals || 0);
          isProFlag = !!profile.is_pro;
          isKycFlag = !!profile.is_kyc_verified;
        }

        let updatedUser: User = { ...user, isPro: isProFlag, is_kyc_verified: isKycFlag };

        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          const metadata = data.user.user_metadata || {};
          // Make sure we correctly update streak and balance
          updatedUser = {
            ...updatedUser,
            balance: metadata.balance ?? user.balance,
            streak: metadata.streak ?? user.streak,
            lastCheckIn: metadata.lastCheckIn ?? user.lastCheckIn,
          };
        }
        
        // Update local state if there are changes
        if (updatedUser.balance !== user.balance || updatedUser.streak !== user.streak || updatedUser.lastCheckIn !== user.lastCheckIn || updatedUser.isPro !== user.isPro || updatedUser.is_kyc_verified !== user.is_kyc_verified) {
           setUser(updatedUser);
           localStorage.setItem('bdpay_user', JSON.stringify(updatedUser));
           localStorage.setItem('bdpay_registered_user_data', JSON.stringify(updatedUser));
        }
      } catch (err) {
        console.error("Failed to refresh user:", err);
      }
    };
    refreshUser();
  }, [activeTab]);

  useEffect(() => {
    if (user.lastCheckIn) {
      const lastCheckInDate = new Date(user.lastCheckIn).toDateString();
      const todayDate = new Date().toDateString();
      if (lastCheckInDate === todayDate) {
        setCanCheckIn(false);
      }
    }
  }, [user.lastCheckIn]);

  const handleCheckIn = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = user.streak;
    let newBalance = user.balance;
    let message = "সফলভাবে চেক-ইন হয়েছে!";

    if (user.lastCheckIn) {
      const lastDate = new Date(user.lastCheckIn);
      lastDate.setHours(0, 0, 0, 0);
      
      const diffTime = Math.abs(today.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
    } else {
      newStreak = 1;
    }

    if (newStreak === 7) {
      newBalance += 100;
      newStreak = 0; // Reset after bonus
      message = "🎉 ৭ দিনের স্ট্রাইক! আপনি ১০০ টাকা বোনাস পেয়েছেন!";
    }

    const lastCheckInStr = new Date().toISOString();
    const updatedUser = { 
      ...user, 
      lastCheckIn: lastCheckInStr,
      streak: newStreak,
      balance: newBalance
    };

    setIsUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          balance: newBalance,
          streak: newStreak,
          lastCheckIn: lastCheckInStr,
        }
      });
      
      if (!error) {
        setUser(updatedUser);
        localStorage.setItem('bdpay_user', JSON.stringify(updatedUser));
        localStorage.setItem('bdpay_registered_user_data', JSON.stringify(updatedUser));
        setCanCheckIn(false);
        setCheckInMsg(message);
        setTimeout(() => setCheckInMsg(''), 4000);
      } else {
        alert("সার্ভারের সাথে চেক-ইন সিঙ্ক করতে ব্যর্থ। দয়া করে আবার চেষ্টা করুন।");
      }
    } catch (e) {
      console.error(e);
      alert("নেটওয়ার্ক সমস্যা।");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onLogout();
  };

  const startTask = (taskId: string, taskTitle: string) => {
    if (siteSettings?.kyc_enabled && !user.is_kyc_verified && taskId !== 'recharge') {
      setActiveTab('kyc');
      return;
    }

    if (taskId === 'recharge') {
      setIsRecharging(true);
      return;
    }
    if (taskId === 'gmail') {
      setIsGmailView(true);
      return;
    }
    if (['typing', 'telegram'].includes(taskId)) {
      alert(`শিগগিরই আসছে... (${taskTitle} feature will be available very soon!)`);
      return;
    }
    setActiveTaskCategory(taskId);
    setActiveTaskTitle(taskTitle);
  };

  const handleTabChange = (tab: any) => {
    if (siteSettings?.kyc_enabled && !user.is_kyc_verified && tab === 'withdraw') {
      setActiveTab('kyc');
      return;
    }
    setActiveTab(tab);
  };

  const handleOpenNotifications = async () => {
    setShowNotifications(true);
    if (unreadNotifCount > 0) {
      await supabase.from('custom_notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      setUnreadNotifCount(0);
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
    }
  };

  const premiumTask = TASK_LIST.find(t => t.id === 'premium');
  const rechargeTask = TASK_LIST.find(t => t.id === 'recharge');
  const specialTask = TASK_LIST.find(t => t.id === 'special');
  const regularTasks = TASK_LIST.filter(t => t.id !== 'premium' && t.id !== 'recharge' && t.id !== 'special');

  if (isRecharging) {
    return <RechargeView user={user} onBack={() => setIsRecharging(false)} />;
  }

  if (showReferral) {
    return <ReferralView user={user} onBack={() => setShowReferral(false)} />;
  }

  if (isGmailView) {
    return <GmailTaskView user={user} onBack={() => setIsGmailView(false)} />;
  }

  if (isBanned) {
    return (
      <div className="min-h-screen bg-red-600 flex flex-col items-center justify-center p-6 text-center text-white">
        <ShieldAlert size={64} className="text-red-200 mb-6" />
        <h1 className="text-3xl font-black mb-3">একাউন্ট ব্লক করা হয়েছে</h1>
        <p className="text-red-100 font-medium mb-8 text-sm max-w-xs leading-relaxed">
          আমাদের নিয়মনীতি অমান্য করার কারণে আপনার একাউন্টটি সাময়িকভাবে বন্ধ করা হয়েছে। দয়া করে সাপোর্টে যোগাযোগ করুন।
        </p>
        <button 
          onClick={onLogout}
          className="bg-white text-red-600 font-bold px-8 py-3 rounded-xl shadow-lg active:scale-95 transition-transform"
        >
          লগআউট করুন
        </button>
      </div>
    );
  }

  if (showOnboarding) {
    return (
      <OnboardingView onComplete={() => {
        localStorage.setItem(`bdpay_onboarding_${user.id}`, 'true');
        setShowOnboarding(false);
      }} />
    );
  }

  // If a task category is selected, render the TaskListView instead of the main dashboard
  if (activeTaskCategory) {
    return (
      <TaskListView 
        taskType={activeTaskCategory} 
        categoryTitle={activeTaskTitle} 
        user={user} 
        onBack={() => setActiveTaskCategory(null)} 
      />
    );
  }

  const themeBg = user.isPro ? 'bg-gradient-to-r from-slate-900 via-amber-900 to-slate-900' : 'bg-primary';
  const themeText = user.isPro ? 'text-amber-500' : 'text-primary';
  const themeBgLight = user.isPro ? 'bg-amber-500/10' : 'bg-primary/10';

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      {/* Welcome Popup */}
      <AnimatePresence>
        {showPopup && siteSettings && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              onClick={() => setShowPopup(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl relative overflow-hidden text-center"
                onClick={e => e.stopPropagation()}
              >
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50/50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-50/50 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
                
                <button onClick={() => setShowPopup(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 p-2 rounded-full transition-colors z-10">
                  <X size={18} />
                </button>
                
                <div className="relative z-10 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-3xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/30 transform rotate-3 hover:rotate-0 transition-transform">
                    <Bell size={36} className="absolute opacity-20" />
                    <Star size={32} className="relative z-10" fill="currentColor" />
                  </div>
                </div>

                <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight relative z-10">বিডি পেতে স্বাগতম</h2>
                <div className="text-sm text-slate-500 font-medium mb-8 leading-relaxed relative z-10 whitespace-pre-wrap px-2">
                  {siteSettings.popup_text || "আমাদের সাথে যুক্ত থাকার জন্য ধন্যবাদ। আজই টাস্ক সম্পূর্ণ করে ইনকাম শুরু করুন!"}
                </div>
                
                <div className="space-y-3 relative z-10">
                  {siteSettings.tutorial_url && (
                     <button onClick={() => { setActiveTab('tutorial'); setShowPopup(false); }} className="w-full bg-slate-50 border border-slate-100 text-slate-700 py-3.5 rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-slate-100 transition-colors shadow-sm">
                       কিভাবে কাজ করবেন <ChevronRight size={16} className="text-slate-400" />
                     </button>
                  )}
                  {siteSettings.telegram_url && (
                     <a href={siteSettings.telegram_url} target="_blank" rel="noopener noreferrer" className="w-full bg-[#2AABEE]/10 text-[#2AABEE] py-3.5 rounded-2xl font-bold flex justify-center items-center gap-2 hover:bg-[#2AABEE]/20 transition-colors shadow-sm">
                       টেলিগ্রামে যুক্ত হোন
                     </a>
                  )}
                  <button onClick={() => setShowPopup(false)} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 active:scale-[0.98] transition-all uppercase tracking-wide text-sm mt-2">
                    শুরু করুন
                  </button>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Notifications Modal */}
      <AnimatePresence>
        {showNotifications && (
           <>
             <motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50"
               onClick={() => setShowNotifications(false)}
             />
             <motion.div
               initial={{ y: 50, opacity: 0 }}
               animate={{ y: 0, opacity: 1 }}
               exit={{ y: 50, opacity: 0 }}
               className="fixed bottom-0 left-0 right-0 max-h-[70vh] bg-white rounded-t-3xl z-50 shadow-2xl flex flex-col"
             >
                <div className="flex justify-between items-center p-5 border-b border-slate-100">
                   <h2 className="text-xl font-bold text-slate-800">Notifications</h2>
                   <button onClick={() => setShowNotifications(false)} className="bg-slate-100 p-2 rounded-full text-slate-500 hover:bg-slate-200">
                     <X size={20} />
                   </button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                   {notifications.length === 0 ? (
                     <div className="text-center py-8 text-slate-500">
                        <Bell className="mx-auto mb-3 text-slate-300" size={32} />
                        <p>No new notifications</p>
                     </div>
                   ) : (
                     notifications.map(n => (
                       <div key={n.id} className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex items-start gap-4">
                          <div className={`mt-1 p-2 rounded-full ${n.status === 'approved' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                             {n.status === 'approved' ? <CheckCircle2 size={20} /> : <X size={20} />}
                          </div>
                          <div>
                             <p className="font-bold text-slate-800 text-sm">
                               {n.type}: {n.title}
                             </p>
                             <p className="text-xs font-semibold mt-1">
                               Status: <span className={n.status === 'approved' ? 'text-emerald-600' : 'text-red-600'}>{n.status.charAt(0).toUpperCase() + n.status.slice(1)}</span>
                             </p>
                             <p className="text-[10px] text-slate-400 mt-2">
                               {new Date(n.updated_at).toLocaleString()}
                             </p>
                          </div>
                       </div>
                     ))
                   )}
                </div>
             </motion.div>
           </>
        )}
      </AnimatePresence>

      {/* Side Menu Drawer */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-3/4 max-w-sm bg-white z-50 flex flex-col shadow-2xl"
            >
              <div className={`${themeBg} px-6 py-8 text-white relative transition-colors`}>
                <button 
                  onClick={() => setIsMenuOpen(false)}
                  className="absolute top-4 right-4 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
                >
                  <X size={20} />
                </button>
                <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 text-2xl font-bold text-white shadow-inner">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold">{user.name}</h2>
                <p className="text-white/80 text-sm opacity-90">{user.number}</p>
              </div>

              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                <button onClick={() => { setActiveTab('home'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'home' ? `${themeBgLight} ${themeText}` : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Home size={20} className={activeTab === 'home' ? themeText : 'text-slate-400'} /> Dashboard
                </button>
                <button onClick={() => { setActiveTab('history'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'history' ? `${themeBgLight} ${themeText}` : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Clock size={20} className={activeTab === 'history' ? themeText : 'text-slate-400'} /> History
                </button>
                <button onClick={() => { setActiveTab('tutorial'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'tutorial' ? `${themeBgLight} ${themeText}` : 'text-slate-700 hover:bg-slate-50'}`}>
                  <HelpCircle size={20} className={activeTab === 'tutorial' ? themeText : 'text-slate-400'} /> Tutorial
                </button>
                <button onClick={() => { setActiveTab('withdraw'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'withdraw' ? `${themeBgLight} ${themeText}` : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Coins size={20} className={activeTab === 'withdraw' ? themeText : 'text-slate-400'} /> Withdraw
                </button>
                <button onClick={() => { setActiveTab('account'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'account' ? `${themeBgLight} ${themeText}` : 'text-slate-700 hover:bg-slate-50'}`}>
                  <UserIcon size={20} className={activeTab === 'account' ? themeText : 'text-slate-400'} /> Profile
                </button>
                <button onClick={() => { setActiveTab('reviews'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'reviews' ? `${themeBgLight} ${themeText}` : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Star size={20} className={activeTab === 'reviews' ? themeText : 'text-slate-400'} /> Reviews
                </button>
                <button onClick={() => { setActiveTab('updates'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'updates' ? `${themeBgLight} ${themeText}` : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Bell size={20} className={activeTab === 'updates' ? themeText : 'text-slate-400'} /> Updates
                </button>
                <button onClick={() => { setActiveTab('bdpro'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-xl font-medium transition-colors ${activeTab === 'bdpro' ? 'bg-amber-100 text-amber-600' : 'text-slate-700 hover:bg-slate-50'}`}>
                  <Crown size={20} className={activeTab === 'bdpro' ? 'text-amber-500' : 'text-slate-400'} /> BD Pro
                </button>
                
                <hr className="my-4 border-slate-100" />
                
                <button className="w-full flex items-center gap-3 p-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                  <HelpCircle size={20} className="text-slate-400" /> Support
                </button>
                <button className="w-full flex items-center gap-3 p-3 text-slate-700 hover:bg-slate-50 rounded-xl font-medium transition-colors">
                  <Info size={20} className="text-slate-400" /> About Us
                </button>

                <hr className="my-4 border-slate-100" />

                <button onClick={handleLogout} className="w-full flex items-center gap-3 p-3 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors">
                  <LogOut size={20} /> Logout
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Top Header */}
      <div className={`${themeBg} px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between text-white transition-colors`}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 font-extrabold bg-white/20 rounded-lg flex items-center justify-center text-sm shadow-inner">
            B
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">BDPAY</h1>
        </div>
        <div className="flex items-center gap-2">
          {!user.isPro && (
            <button 
              onClick={() => setActiveTab('bdpro')}
              className="p-1 px-3 bg-gradient-to-r from-amber-400 to-amber-500 rounded-full flex items-center gap-1.5 shadow-md border border-amber-300 hover:scale-105 active:scale-95 transition-all"
            >
              <Crown size={14} className="text-white fill-white" />
              <span className="text-xs font-black text-white">PRO</span>
            </button>
          )}
          {user.isPro && (
            <div className="p-1 px-2.5 bg-gradient-to-r from-slate-800 to-slate-900 rounded-lg flex items-center gap-1 shadow-inner border border-white/10 mr-1">
              <Crown size={14} className="text-amber-400 fill-amber-400" />
              <span className="text-[10px] font-black tracking-wider text-amber-400">PRO</span>
            </div>
          )}
          <button 
            onClick={() => handleTabChange('updates')}
            className="p-2 hover:bg-black/10 rounded-lg transition-colors relative"
          >
            <Bell size={22} />
            {unreadNotifCount > 0 && <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border border-primary"></span>}
          </button>
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 hover:bg-black/10 rounded-lg transition-colors border border-transparent hover:border-white/20"
          >
            <Menu size={24} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 pb-24 relative overflow-y-auto">
        {activeTab === 'home' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-8">
            {/* Global Notice Marquee */}
            {siteSettings?.global_notice && (
              <div className="bg-indigo-600 text-white text-sm font-medium py-2 px-4 overflow-hidden relative z-20">
                <div className="whitespace-nowrap animate-marquee">
                  {siteSettings.global_notice}
                </div>
              </div>
            )}
            
            {/* Home Profile Section */}
            <div className={`bg-gradient-to-b from-primary to-indigo-700 ${!siteSettings?.global_notice ? 'pt-4' : 'pt-2'} pb-16 px-5 rounded-b-[2rem] shadow-lg relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl -ml-10 -mb-10"></div>
              
              <div className="max-w-md mx-auto text-white relative z-10">
                <p className="text-indigo-100 text-xs font-medium mb-0.5 tracking-wide uppercase">Welcome back</p>
                <div className="flex items-center">
                  <h2 className="text-2xl font-black tracking-tight">{user.name}</h2>
                  {!canCheckIn && (
                    <motion.div 
                      initial={{ scale: 0, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      className="flex items-center gap-1.5 bg-orange-500/20 px-3 py-1 rounded-full text-orange-300 text-[10px] font-bold ml-3 border border-orange-400/30 backdrop-blur-sm"
                    >
                      <Flame size={12} className="fill-orange-400 stroke-orange-400" />
                      {user.streak} Days
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto px-4 -mt-10 relative space-y-3 z-20">
              {/* Balance Card */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }}
                className="bg-white rounded-2xl shadow-[0_8px_20px_rgb(0,0,0,0.06)] p-4 flex items-center justify-between border border-white/40 ring-1 ring-slate-100/50 backdrop-blur-xl relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent pointer-events-none" />
                <div className="flex items-center gap-3 w-full relative z-10">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-100 to-emerald-50 text-emerald-600 rounded-[14px] shrink-0 flex items-center justify-center shadow-inner border border-emerald-100/50">
                    <Wallet size={24} strokeWidth={1.5} />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] text-slate-500 font-bold tracking-wide uppercase mb-0.5">Main Balance</p>
                    <p className="text-2xl font-black text-slate-800 tracking-tight leading-none">৳ {user.balance.toFixed(2)}</p>
                  </div>

                  {/* Daily Goal Progress Ring */}
                  <div className="relative w-[52px] h-[52px] flex shrink-0 items-center justify-center border border-slate-50 rounded-full" title="Daily Goal: 300 Taka">
                    <svg className="w-full h-full transform -rotate-90 drop-shadow-sm" viewBox="0 0 36 36">
                      <path
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#f1f5f9"
                        strokeWidth="3.5"
                      />
                      <motion.path
                        initial={{ strokeDasharray: "0, 100" }}
                        animate={{ strokeDasharray: `${Math.min((user.balance / 300) * 100, 100)}, 100` }}
                        transition={{ duration: 1.5, ease: 'easeOut', delay: 0.2 }}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[8px] font-black tracking-wider uppercase text-slate-400">Goal</span>
                      <span className="text-[10px] font-bold text-slate-700 leading-none mt-[1px]">{Math.min(Math.floor((user.balance / 300) * 100), 100)}%</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Total Available Tasks Header Info */}
              <motion.div 
                initial={{ y: 20, opacity: 0 }} 
                animate={{ y: 0, opacity: 1 }} 
                transition={{ delay: 0.05 }}
                className="bg-indigo-50 border border-indigo-100 rounded-2xl p-3 flex gap-3 items-center justify-between shadow-sm"
              >
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 bg-white text-indigo-500 rounded-[12px] flex items-center justify-center shadow-sm">
                       <CheckCircle2 size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold tracking-wider uppercase text-slate-500 mb-0.5">Total Tasks Available</p>
                       <p className="font-black text-indigo-700 text-sm">{totalAvailableTasks > 0 ? totalAvailableTasks : 'Loading...'}</p>
                    </div>
                 </div>
              </motion.div>

              {/* Daily Check-In & Streak */}
              {canCheckIn && (
                <motion.div 
                  initial={{ y: 20, opacity: 0 }} 
                  animate={{ y: 0, opacity: 1 }} 
                  transition={{ delay: 0.1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-3 flex gap-3 items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 shrink-0 bg-gradient-to-br from-orange-100 to-amber-50 text-orange-500 rounded-[12px] flex items-center justify-center shadow-inner">
                      <Flame size={20} fill="#f97316" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider uppercase text-slate-400 mb-0.5">Daily Check-In</p>
                      <p className="font-black text-slate-800 text-sm">{user.streak} / 7 Days</p>
                    </div>
                  </div>
                  
                  <button
                    onClick={handleCheckIn}
                    disabled={isUpdating}
                    className="px-4 py-2 shrink-0 rounded-xl text-[11px] font-bold transition-all bg-slate-900 text-white hover:bg-black shadow-[0_4px_10px_0_rgb(0,0,0,0.15)] disabled:opacity-70"
                  >
                    {isUpdating ? 'Wait...' : 'Claim Reward'}
                  </button>
                </motion.div>
              )}
              
              {checkInMsg && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-emerald-500 text-white p-4 rounded-2xl text-sm text-center font-bold shadow-lg shadow-emerald-500/20"
                >
                  {checkInMsg}
                </motion.div>
              )}

              {/* Info Banner & Age */}
              <SiteAgeCounter />
              
              {/* KYC Pending Banner */}
              {siteSettings?.kyc_enabled && !user.is_kyc_verified && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3 shadow-sm mx-1"
                >
                  <ShieldAlert className="text-red-500 shrink-0 mt-0.5" size={24} />
                  <div className="flex-1">
                    <h3 className="text-red-800 font-bold text-sm mb-1">অ্যাকাউন্ট ভেরিফিকেশন (KYC) প্রয়োজন</h3>
                    <p className="text-red-600 text-xs mb-3">টাস্ক সম্পন্ন করতে এবং উইথড্র করতে অ্যাকাউন্ট ভেরিফাই করুন।</p>
                    <button 
                      onClick={() => setActiveTab('kyc')}
                      className="bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                    >
                      Verify Now
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Tasks Grid */}
              <div className="pt-0">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h2 className="text-xl font-black text-slate-800">Earning Options</h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {regularTasks.map((task, idx) => (
                    <motion.button
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + (idx * 0.05) }}
                      onClick={() => startTask(task.id, task.title)}
                      className="bg-white p-3.5 rounded-[1.2rem] shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] border border-slate-100 flex flex-col items-start gap-3 hover:shadow-md hover:border-slate-200 transition-all text-left group relative overflow-hidden"
                    >
                      <div className="absolute -right-4 -top-4 w-20 h-20 bg-slate-50/80 rounded-full group-hover:scale-[2] transition-transform duration-700 ease-in-out z-0 opacity-50" />
                      <div className={`relative z-10 w-10 h-10 rounded-xl flex items-center justify-center ${task.bg.replace('bg-', 'bg-opacity-80 bg-')} ${task.color} shadow-sm border border-white/60`}>
                        <task.icon size={20} strokeWidth={2.5} />
                      </div>
                      <div className="relative z-10 w-full mt-1">
                        <span className="font-extrabold text-[12px] text-slate-800 leading-snug group-hover:text-primary transition-colors flex items-center justify-between">
                          {task.title}
                          {taskCounts[task.id] !== undefined && (
                            <span className="bg-indigo-50 text-indigo-600 text-[9px] px-1.5 py-0.5 rounded font-black border border-indigo-100/50">
                              {taskCounts[task.id]}
                            </span>
                          )}
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Highlighted Tasks */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                {specialTask && taskCounts[specialTask.id] > 0 && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => startTask(specialTask.id, specialTask.title)}
                    className="w-full bg-gradient-to-br from-rose-50 to-pink-50 p-3 rounded-[1.2rem] shadow-sm border border-rose-100 text-left group transition-all hover:shadow-md hover:border-rose-200"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-rose-100 text-rose-600 shadow-sm border border-white`}>
                          <specialTask.icon size={16} />
                        </div>
                        <span className="inline-block px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[8px] font-black rounded uppercase border border-rose-200">Hot</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-[12px] leading-tight group-hover:text-rose-600 transition-colors">{specialTask.title}</h3>
                        <p className="text-[9px] text-slate-500 mt-0.5 font-bold">{taskCounts[specialTask.id]} Available</p>
                      </div>
                    </div>
                  </motion.button>
                )}

                {rechargeTask && (
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => startTask(rechargeTask.id, rechargeTask.title)}
                    className="w-full bg-gradient-to-br from-indigo-50 to-purple-50 p-3 rounded-[1.2rem] shadow-sm border border-indigo-100 text-left group transition-all hover:shadow-md hover:border-indigo-200"
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-100 text-indigo-600 shadow-sm border border-white`}>
                          <rechargeTask.icon size={16} />
                        </div>
                        <span className="inline-block px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-[8px] font-black rounded uppercase border border-indigo-200">Earn</span>
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-[12px] leading-tight group-hover:text-indigo-600 transition-colors">{rechargeTask.title}</h3>
                        <p className="text-[9px] text-slate-500 mt-0.5 font-bold">56৳/1000৳ Com</p>
                      </div>
                    </div>
                  </motion.button>
                )}
              </div>

              {/* Premium Task (Moved below regular tasks) */}
              {premiumTask && (
                <div className="pb-4">
                  <motion.button
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    onClick={() => startTask(premiumTask.id, premiumTask.title)}
                    className="w-full bg-slate-900 p-1.5 rounded-[1.5rem] shadow-xl shadow-amber-500/10 text-left group transition-all hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-0.5 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-yellow-500/20 animate-pulse opacity-50" />
                    <div className="bg-slate-900/90 backdrop-blur-xl rounded-[1.2rem] p-5 flex items-center justify-between h-full relative z-10 border border-white/10">
                      <div className="flex items-center gap-5">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-inner`}>
                          <Star size={28} className="fill-white" />
                        </div>
                        <div>
                          <span className="inline-block px-2.5 py-1 bg-amber-500/20 text-amber-300 text-[10px] font-black rounded-lg tracking-wider uppercase mb-1.5 border border-amber-500/30">99+ Available</span>
                          <h3 className="font-black text-white text-xl leading-tight group-hover:text-amber-300 transition-colors">{premiumTask.title}</h3>
                          <p className="text-xs text-slate-400 mt-1 font-medium">Complete special tasks for top payouts</p>
                        </div>
                      </div>
                      <ChevronRight size={24} className="text-amber-500 opacity-60 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </div>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'history' && <HistoryView user={user} />}

        {activeTab === 'withdraw' && (
          <WithdrawView 
            user={user} 
            totalReferrals={totalReferrals} 
            onWithdraw={() => handleTabChange('history')} 
          />
        )}

        {activeTab === 'reviews' && (
          <ReviewView user={user} />
        )}

        {activeTab === 'updates' && (
          <UpdatesView user={user} />
        )}

        {activeTab === 'bdpro' && (
          <BDProView user={user} onSubscribe={() => handleTabChange('home')} setUser={setUser} />
        )}

        {activeTab === 'kyc' && (
          <KYCView user={user} onBack={() => setActiveTab('home')} />
        )}

        {activeTab === 'tutorial' && (
          <TutorialView />
        )}

        {activeTab === 'account' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
            <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 pt-8 pb-16 px-6 rounded-b-[2.5rem] shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-24 h-24 bg-white/20 rounded-full mb-4 flex items-center justify-center p-1 shadow-inner backdrop-blur-md border border-white/20">
                    <div className="w-full h-full bg-white text-indigo-600 rounded-full flex items-center justify-center">
                        <UserIcon size={40} className="text-indigo-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-black text-white tracking-tight">{user.name}</h2>
                <div className="flex items-center gap-2 mt-2">
                    <p className="text-indigo-100 font-bold bg-white/10 px-3 py-1 rounded-full text-xs tracking-wider border border-white/10">{user.number}</p>
                    {user.isPro && <span className="bg-amber-400 text-amber-900 border border-amber-300 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1"><Crown size={12}/> Pro</span>}
                </div>
              </div>
            </div>
            
            <div className="px-5 -mt-8 relative z-20 space-y-4 max-w-md mx-auto">
              <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 p-5">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Account Details</h3>
                <div className="space-y-4 text-sm relative z-10">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <div className="flex items-center gap-2 text-slate-500 font-bold">
                        <Mail size={16} className="text-slate-400" /> Email
                    </div>
                    <span className="font-bold text-slate-800">{user.gmail}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <div className="flex items-center gap-2 text-slate-500 font-bold">
                        <Calendar size={16} className="text-slate-400" /> Joined
                    </div>
                    <span className="font-bold text-slate-800">{new Date(user.joinedAt).toLocaleDateString()}</span>
                  </div>
                  {user.referralCode && (
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-slate-500 font-bold">
                        <UserIcon size={16} className="text-slate-400" /> Referred By
                      </div>
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">{user.referralCode}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => setShowReferral(true)}
                  className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-indigo-500/20 transition-all group"
                >
                  <Gift size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="font-black text-[11px] uppercase tracking-wider">Refer & Earn</span>
                </button>
                <button 
                  onClick={() => setActiveTab('bdpro')}
                  className="bg-gradient-to-br from-amber-400 to-orange-500 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:opacity-90 shadow-lg shadow-amber-500/20 transition-all group"
                >
                  <Crown size={24} className="group-hover:scale-110 transition-transform" />
                  <span className="font-black text-[11px] uppercase tracking-wider">Upgrade Pro</span>
                </button>
              </div>

              {isAdmin && (
                <button 
                  onClick={() => setActiveTab('admin')}
                  className="w-full bg-slate-800 text-white font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-700 shadow-md active:scale-95 transition-all text-sm uppercase tracking-wide"
                >
                  <ShieldAlert size={20} />
                  Admin Panel
                </button>
              )}

              <button 
                onClick={handleLogout}
                className="w-full bg-rose-50 text-rose-600 font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors shadow-sm text-sm uppercase tracking-wide border border-rose-100"
              >
                <LogOut size={20} />
                Log Out
              </button>
            </div>
          </motion.div>
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel onBack={() => setActiveTab('account')} />
        )}
      </div>

      {/* Bottom Navigation */}
      {activeTab !== 'updates' && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-slate-100 shadow-[0_-5px_20px_rgba(0,0,0,0.03)] pb-2 sm:pb-4">
          <div className="max-w-md mx-auto">
            <div className="flex justify-around items-center px-2 py-2">
              <button 
                onClick={() => handleTabChange('home')}
                className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${activeTab === 'home' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Home size={24} className={activeTab === 'home' ? 'fill-indigo-600/20' : ''} />
                <span className="text-[10px] font-bold tracking-wide">Home</span>
              </button>
              
              <button 
                onClick={() => handleTabChange('history')}
                className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Clock size={24} className={activeTab === 'history' ? 'fill-indigo-600/20' : ''} />
                <span className="text-[10px] font-bold tracking-wide">History</span>
              </button>
              
              <button 
                onClick={() => handleTabChange('withdraw')}
                className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${activeTab === 'withdraw' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Wallet size={24} className={activeTab === 'withdraw' ? 'fill-indigo-600/20' : ''} />
                <span className="text-[10px] font-bold tracking-wide">Withdraw</span>
              </button>
              
              <button 
                onClick={() => handleTabChange('reviews')}
                className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${activeTab === 'reviews' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <Star size={24} className={activeTab === 'reviews' ? 'fill-indigo-600/20' : ''} />
                <span className="text-[10px] font-bold tracking-wide">Reviews</span>
              </button>
              
              <button 
                onClick={() => handleTabChange('account')}
                className={`flex flex-col items-center gap-1 flex-1 py-2 rounded-xl transition-all ${activeTab === 'account' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                <UserIcon size={24} className={activeTab === 'account' ? 'fill-indigo-600/20' : ''} />
                <span className="text-[10px] font-bold tracking-wide">Account</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Telegram Floating Widget */}
      <a 
        href="https://t.me/Bdpaysite"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-[164px] right-4 sm:bottom-[164px] sm:right-4 z-40 bg-[#0088cc] text-white w-14 h-14 rounded-full shadow-[0_4px_15px_rgba(0,136,204,0.4)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all"
        style={{ animation: 'pulse 2s infinite' }}
      >
        <svg fill="currentColor" viewBox="0 0 24 24" height="28" width="28" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.664 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      </a>

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(0, 136, 204, 0.4); }
          70% { box-shadow: 0 0 0 15px rgba(0, 136, 204, 0); }
          100% { box-shadow: 0 0 0 0 rgba(0, 136, 204, 0); }
        }
      `}} />

      <SupportWidget user={user} />
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Submission, TaskItem } from '../types';
import { TASK_LIST } from '../data';
import { ArrowLeft, Check, X, KeySquare, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { AdminInbox } from './AdminInbox';
import { AdminUserDetail } from './AdminUserDetail';

export function AdminPanel({ onBack }: { onBack: () => void }) {
  const [tab, setTab] = useState<'home' | 'submissions' | 'users' | 'tasks' | 'keys' | 'recharges' | 'gmail' | 'offers' | 'notify' | 'settings' | 'inbox' | 'withdrawals'>('home');
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [recharges, setRecharges] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [gmailTasks, setGmailTasks] = useState<any[]>([]);
  const [rechargeOffers, setRechargeOffers] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [keys, setKeys] = useState<{id: string, api_key: string, is_active: boolean}[]>([]);
  const [newKey, setNewKey] = useState('');
  
  const [newOffer, setNewOffer] = useState({ operator: 'gp', title: '', description: '', price: '' });
  const [newNotification, setNewNotification] = useState({ userId: '', message: '' });

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    description: '',
    link: '',
    tutorial_url: '',
    image_url: '',
    reward: '5',
    task_type: 'fb-reels'
  });
  const [newGmailTask, setNewGmailTask] = useState({
    first_name: '',
    last_name: '',
    email_prefix: '',
    password: '',
    reward: '5'
  });

  const [users, setUsers] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalUsers: 0, todayUsers: 0, todayTasks: 0 });

  useEffect(() => {
    if (tab === 'home') loadStats();
    if (tab === 'users') loadUsers();
    if (tab === 'submissions') loadSubmissions();
    if (tab === 'keys') loadKeys();
    if (tab === 'tasks') loadTasks();
    if (tab === 'recharges') loadRecharges();
    if (tab === 'withdrawals') loadWithdrawals();
    if (tab === 'gmail') loadGmailTasks();
    if (tab === 'offers') loadOffers();
    if (tab === 'settings') loadSettings();
  }, [tab]);

  const uploadImageToImgbb = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { data: keys } = await supabase.from('imgbb_keys').select('api_key').eq('is_active', true);
      if (!keys || keys.length === 0) throw new Error('No active ImgBB keys found to upload image.');
      
      let imgSuccess = false;
      let uploadedUrl = '';

      for (const k of keys) {
        try {
          const formData = new FormData();
          formData.append('image', file);
          const res = await fetch(`https://api.imgbb.com/1/upload?key=${k.api_key}`, { method: 'POST', body: formData });
          const imgbbData = await res.json();
          if (imgbbData.success) {
            uploadedUrl = imgbbData.data.url;
            imgSuccess = true;
            break;
          }
        } catch (err) {
          console.error(err);
        }
      }

      if (imgSuccess && uploadedUrl) {
        setNewTaskForm({...newTaskForm, image_url: uploadedUrl});
      } else {
        alert('Image upload failed. Please check ImgBB API keys.');
      }
    } catch (err: any) {
      alert(err.message || 'Image upload failed');
    }
    setUploadingImage(false);
  };

  // --------------- Withdrawals Logic ---------------
  const loadWithdrawals = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('withdrawals')
      .select('*')
      .like('status', 'pending%')
      .order('created_at', { ascending: false });
    
    if (data) {
      const parsedData = data.map(w => {
         const parts = w.status.split('_');
         if (parts.length >= 2) {
           return {
              ...w,
              status: parts[0],
              method: parts[1] || 'Unknown',
              account_number: parts[2] || ''
           };
         }
         return w;
      });
      setWithdrawals(parsedData);
    }
    setLoading(false);
  };

  const handleWithdrawalAction = async (rec: any, action: 'approved' | 'rejected') => {
    if (action === 'rejected') {
      // Refund the amount to the user
      const dummyId = '00000000-0000-0000-0000-000000000000';
      await supabase.rpc('approve_task_submission', { 
         p_submission_id: dummyId, 
         p_user_id: rec.user_id, 
         p_reward: Number(rec.amount) 
      });
    }

    const newStatus = `${action}_${rec.method || ''}_${rec.account_number || ''}`;
    await supabase.from('withdrawals').update({ status: newStatus }).eq('id', rec.id);
    setWithdrawals(withdrawals.filter(r => r.id !== rec.id));
  };

  // --------------- Users & Stats Logic ---------------
  const loadStats = async () => {
    setLoading(true);
    // Simple approximations for demo
    const today = new Date().toISOString().split('T')[0];
    
    // Total users (from user_profiles)
    const { count: totalUsers } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true });
    
    // Today users (created_at >= today)
    const { count: todayUsers } = await supabase.from('user_profiles').select('*', { count: 'exact', head: true }).gte('created_at', today);
    
    // Today tasks submitted
    const { count: todayTasks } = await supabase.from('submissions').select('*', { count: 'exact', head: true }).gte('created_at', today);
    
    setStats({ 
      totalUsers: totalUsers || 0, 
      todayUsers: todayUsers || 0, 
      todayTasks: todayTasks || 0 
    });
    setLoading(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    // Since we don't have a direct 'users' table with balance accessible, we'll fetch from profiles and rely on auth metadata if possible.
    // In a real app we'd need an admin RPC to get user list and auth metadata.
    // We'll just show profiles. Balance isn't easily mutable without auth admin api, so we'll do an RPC.
    const { data } = await supabase.from('user_profiles').select('*').order('created_at', { ascending: false });
    if (data) setUsers(data);
    setLoading(false);
  };

  const updateUserBalance = async (userId: string) => {
    const amount = prompt("Enter amount to ADD to balance (use negative to deduct):");
    if (amount && !isNaN(Number(amount))) {
      const { error } = await supabase.rpc('approve_task_submission', { p_submission_id: '00000000-0000-0000-0000-000000000000', p_user_id: userId, p_reward: Number(amount) });
      if (!error) {
        alert("Balance updated roughly (used trick). For real balance updates, need proper RPC.");
      } else {
        alert("SQL error. To update balance securely, add an 'add_user_balance(user_id, amount)' function.");
      }
    }
  };

  // --------------- Settings Logic ---------------
  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase.from('site_settings').select('*').limit(1);
    if (data && data[0]) setSettings(data[0]);
    setLoading(false);
  };

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    await supabase.from('site_settings').update(settings).eq('id', settings.id);
    alert('Settings saved!');
  };

  // --------------- Notify Logic ---------------
  const sendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNotification.userId || !newNotification.message) return;
    await supabase.from('custom_notifications').insert({ user_id: newNotification.userId, message: newNotification.message });
    setNewNotification({ userId: '', message: '' });
    alert('Notification sent!');
  };

  // --------------- Offers Logic ---------------
  const loadOffers = async () => {
    setLoading(true);
    const { data } = await supabase.from('recharge_offers').select('*').order('created_at', { ascending: false });
    if (data) setRechargeOffers(data);
    setLoading(false);
  };

  const addOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data } = await supabase.from('recharge_offers').insert({
      operator: newOffer.operator,
      title: newOffer.title,
      description: newOffer.description,
      price: Number(newOffer.price)
    }).select();
    if (data && data[0]) {
      setRechargeOffers([data[0], ...rechargeOffers]);
      setNewOffer({ operator: 'gp', title: '', description: '', price: '' });
    }
  };

  const deleteOffer = async (id: string) => {
    await supabase.from('recharge_offers').delete().eq('id', id);
    setRechargeOffers(rechargeOffers.filter(o => o.id !== id));
  };

  // --------------- Gmail Tasks Logic ---------------
  const loadGmailTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from('gmail_tasks')
      .select('*')
      .in('status', ['available', 'locked', 'submitted'])
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map(t => t.locked_by).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('user_profiles').select('*').in('user_id', userIds);
        const profileMap: any = {};
        if (profiles) profiles.forEach(p => profileMap[p.user_id] = p);
        setGmailTasks(data.map(t => ({ ...t, user_profile: profileMap[t.locked_by] })));
      } else {
        setGmailTasks(data);
      }
    } else {
      setGmailTasks([]);
    }
    setLoading(false);
  };

  const handleAddGmailTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.from('gmail_tasks').insert({
      first_name: newGmailTask.first_name,
      last_name: newGmailTask.last_name,
      email_prefix: newGmailTask.email_prefix,
      password: newGmailTask.password,
      reward: Number(newGmailTask.reward),
      status: 'available'
    }).select();
    
    if (data && data[0]) {
      setGmailTasks([data[0], ...gmailTasks]);
      setNewGmailTask({ first_name: '', last_name: '', email_prefix: '', password: '', reward: '5' });
    }
  };

  const handleDeleteGmailTask = async (id: string) => {
    await supabase.from('gmail_tasks').delete().eq('id', id);
    setGmailTasks(gmailTasks.filter(t => t.id !== id));
  };
  
  const handleApproveGmailTask = async (id: string, userId: string, reward: number) => {
    try {
      const { error } = await supabase.rpc('approve_gmail_task', {
        p_task_id: id,
        p_user_id: userId,
        p_reward: reward
      });
      if (error) {
        console.error("RPC Error:", error);
        await supabase.from('gmail_tasks').update({ status: 'approved' }).eq('id', id);
        alert("SQL function not found. Status updated but balance might not reflect. Update SQL schema.");
      }
    } catch (err) {
      await supabase.from('gmail_tasks').update({ status: 'approved' }).eq('id', id);
    }
    
    setGmailTasks(gmailTasks.map(t => t.id === id ? { ...t, status: 'approved' } : t));
  };

  const handleRejectGmailTask = async (id: string) => {
    // Instead of rejecting completely, just make it available again
    await supabase.from('gmail_tasks').update({ status: 'available', locked_by: null, locked_at: null }).eq('id', id);
    setGmailTasks(gmailTasks.map(t => t.id === id ? { ...t, status: 'available', locked_by: null, locked_at: null } : t));
  };

  // --------------- Recharges Logic ---------------
  const loadRecharges = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('recharges')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    
    if (data) setRecharges(data);
    setLoading(false);
  };

  const handleRechargeAction = async (rec: any, action: 'approved' | 'rejected') => {
    await supabase.from('recharges').update({ status: action }).eq('id', rec.id);
    
    // If it's a BD Pro Lifetime Access recharge, update user_profiles
    if (action === 'approved' && rec.offer_details === 'BD Pro Lifetime Access') {
      await supabase.from('user_profiles').update({ is_pro: true }).eq('user_id', rec.user_id);
    }

    if (action === 'approved' && rec.offer_details === 'KYC Verification') {
      await supabase.from('user_profiles').update({ is_kyc_verified: true }).eq('user_id', rec.user_id);
    }
    
    setRecharges(recharges.filter(r => r.id !== rec.id));
  };

  // --------------- Submissions Logic ---------------
  const loadSubmissions = async () => {
    setLoading(true);
    // Joining tasks manually since we might not have a foreign key set up cleanly for users
    const { data: subsData } = await supabase
      .from('submissions')
      .select('*, tasks(*)')
      .eq('status', 'pending');
    
    if (subsData && subsData.length > 0) {
      const userIds = [...new Set(subsData.map(s => s.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profiles } = await supabase.from('user_profiles').select('*').in('user_id', userIds);
        const profileMap: any = {};
        if (profiles) profiles.forEach(p => profileMap[p.user_id] = p);
        setSubmissions(subsData.map(s => ({ ...s, user_profile: profileMap[s.user_id] })));
      } else {
        setSubmissions(subsData);
      }
    } else {
      setSubmissions([]);
    }
    setLoading(false);
  };

  const handleSubmissionAction = async (id: string, action: 'approved' | 'rejected', userId: string, reward: number) => {
    if (action === 'approved') {
      try {
        const { error } = await supabase.rpc('approve_task_submission', {
          p_submission_id: id,
          p_user_id: userId,
          p_reward: reward
        });
        
        if (error) {
          console.error("RPC Error:", error);
          await supabase.from('submissions').update({ status: action }).eq('id', id);
          alert("SQL function not found in Supabase. Please run the latest SQL from /supabase_setup.sql in your Supabase SQL editor.");
        }
      } catch (err) {
        await supabase.from('submissions').update({ status: action }).eq('id', id);
      }
    } else {
      await supabase.from('submissions').update({ status: action }).eq('id', id);
    }
    
    setSubmissions(submissions.filter(s => s.id !== id));
  };


  // --------------- API Keys Logic ---------------
  const loadKeys = async () => {
    setLoading(true);
    const { data } = await supabase.from('imgbb_keys').select('*');
    if (data) setKeys(data);
    setLoading(false);
  };

  const addKey = async () => {
    if (!newKey) return;
    const { data, error } = await supabase.from('imgbb_keys').insert({ api_key: newKey }).select();
    if (data && data[0]) {
      setKeys([...keys, data[0]]);
      setNewKey('');
    }
  };

  const deleteKey = async (id: string) => {
    await supabase.from('imgbb_keys').delete().eq('id', id);
    setKeys(keys.filter(k => k.id !== id));
  };


  // --------------- Tasks Logic ---------------
  const loadTasks = async () => {
    setLoading(true);
    const { data } = await supabase.from('tasks').select('*').order('created_at', { ascending: false });
    if (data) setTasks(data);
    setLoading(false);
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTaskId) {
      const { data, error } = await supabase.from('tasks').update({
        title: newTaskForm.title,
        description: newTaskForm.description,
        link: newTaskForm.link,
        tutorial_url: newTaskForm.tutorial_url,
        image_url: newTaskForm.image_url,
        reward: Number(newTaskForm.reward),
        task_type: newTaskForm.task_type
      }).eq('id', editingTaskId).select();

      if (data && data[0]) {
        setTasks(tasks.map(t => t.id === editingTaskId ? data[0] : t));
        setEditingTaskId(null);
        setNewTaskForm({...newTaskForm, title: '', description: '', link: '', tutorial_url: '', image_url: ''});
      }
    } else {
      const { data, error } = await supabase.from('tasks').insert({
        title: newTaskForm.title,
        description: newTaskForm.description,
        link: newTaskForm.link,
        tutorial_url: newTaskForm.tutorial_url,
        image_url: newTaskForm.image_url,
        reward: Number(newTaskForm.reward),
        task_type: newTaskForm.task_type
      }).select();
      
      if (data && data[0]) {
        setTasks([data[0], ...tasks]);
        setNewTaskForm({...newTaskForm, title: '', description: '', link: '', tutorial_url: '', image_url: ''});
      }
    }
  };

  const startEditTask = (task: TaskItem) => {
    setEditingTaskId(task.id);
    setNewTaskForm({
      title: task.title,
      description: task.description || '',
      link: task.link,
      tutorial_url: task.tutorial_url || '',
      image_url: task.image_url || '',
      reward: String(task.reward),
      task_type: task.task_type
    });
    // Scroll to top to see the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setNewTaskForm({ title: '', description: '', link: '', tutorial_url: '', image_url: '', reward: '5', task_type: 'fb-reels' });
  };

  const toggleTask = async (id: string, currentStatus: boolean) => {
    await supabase.from('tasks').update({ is_active: !currentStatus }).eq('id', id);
    setTasks(tasks.map(t => t.id === id ? { ...t, is_active: !currentStatus } : t));
  };

  const deleteTask = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      // First delete any submissions referencing this task to avoid foreign key errors
      await supabase.from('submissions').delete().eq('task_id', id);
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
         if (error.message.includes('foreign key')) {
             alert('Cannot delete this task. It may be referenced by other records.');
         } else {
             alert(error.message);
         }
      } else {
         setTasks(tasks.filter(t => t.id !== id));
      }
    } catch (e) {
      alert('Delete failed');
    }
  };


  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-50 bg-slate-50 overflow-y-auto h-[100dvh]">
      <div className="bg-slate-800 px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        
        {/* Tabs - Use horizontal scroll or wrap to fit multiple tabs */}
        <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-2xl mb-4">
          <button 
            onClick={() => setTab('home')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'home' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Home
          </button>
          <button 
            onClick={() => setTab('inbox')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'inbox' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Inbox
          </button>
          <button 
            onClick={() => setTab('users')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'users' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Users
          </button>
          <button 
            onClick={() => setTab('submissions')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'submissions' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Proofs
          </button>
          <button 
            onClick={() => setTab('recharges')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'recharges' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Recharges
          </button>
          <button 
            onClick={() => setTab('withdrawals')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'withdrawals' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Withdrawals
          </button>
          <button 
            onClick={() => setTab('gmail')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'gmail' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Gmail
          </button>
          <button 
            onClick={() => setTab('tasks')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'tasks' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Tasks
          </button>
          <button 
            onClick={() => setTab('offers')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'offers' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Offers
          </button>
          <button 
            onClick={() => setTab('notify')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'notify' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Notify
          </button>
          <button 
            onClick={() => setTab('keys')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'keys' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Keys
          </button>
          <button 
            onClick={() => setTab('settings')}
            className={`py-2 px-3 text-[10px] sm:text-xs font-bold rounded-xl transition-all text-center whitespace-nowrap flex-1 min-w-[70px] ${tab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Settings
          </button>
        </div>


        {/* Home Tab */}
        {tab === 'home' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Site Status Overview</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-indigo-600 mb-1">{loading ? '...' : stats.totalUsers}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Users</span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-black text-emerald-600 mb-1">{loading ? '...' : stats.todayUsers}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Today Users</span>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center col-span-2">
                <span className="text-3xl font-black text-purple-600 mb-1">{loading ? '...' : stats.todayTasks}</span>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Today Task Submissions</span>
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {tab === 'users' && (
          selectedUserId ? (
             <AdminUserDetail userId={selectedUserId} onBack={() => setSelectedUserId(null)} />
          ) : (
             <div className="space-y-4">
               <h2 className="text-lg font-bold text-slate-800">User Management</h2>
               <div className="mb-4">
                 <input 
                   type="text" 
                   placeholder="Search by Name, Email, Phone, or ID..." 
                   value={searchTerm}
                   onChange={e => setSearchTerm(e.target.value)}
                   className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                 />
               </div>
               {loading ? <p className="text-slate-500">Loading...</p> : users.length === 0 ? <p className="text-slate-500">No users found.</p> : users.filter(u => {
                 const query = searchTerm.toLowerCase();
                 return (
                   (u.name && u.name.toLowerCase().includes(query)) ||
                   (u.email && u.email.toLowerCase().includes(query)) ||
                   (u.number && u.number.toLowerCase().includes(query)) ||
                   (u.user_id && u.user_id.toLowerCase().includes(query))
                 );
               }).map(u => (
                 <div key={u.user_id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-3 group hover:border-indigo-200 transition-colors">
                   <div className="flex items-start gap-4">
                     <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg uppercase shadow-inner shrink-0 group-hover:scale-105 transition-transform">
                       {u.name ? u.name.substring(0, 2) : 'U'}
                     </div>
                     <div className="flex-1">
                       <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          {u.name || 'Unnamed User'} 
                          {u.number && <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-md font-bold tracking-wide">{u.number}</span>}
                          {u.is_banned && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-md font-bold uppercase tracking-widest">Banned</span>}
                       </h3>
                       <p className="text-xs text-slate-500 font-medium mt-0.5">{u.email}</p>
                       <p className="text-[10px] text-slate-400 font-mono mt-1">ID: {u.user_id}</p>
                     </div>
                   </div>
                   <div className="flex flex-wrap gap-2 pt-3 border-t border-slate-100">
                     <button onClick={() => setSelectedUserId(u.user_id)} className="bg-indigo-600 text-white font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1.5 shadow-sm hover:bg-indigo-700 transition">
                       View Details
                     </button>
                     <button 
                       onClick={async () => {
                         if (window.confirm("Ban this user?")) {
                           const { error } = await supabase.from('user_profiles').update({ is_banned: true }).eq('user_id', u.user_id);
                           if(error) alert('Failed: ' + error.message); else alert('Banned!');
                           loadUsers();
                         }
                       }} 
                       className="bg-orange-50 text-orange-700 py-1.5 px-3 rounded-lg text-xs font-bold hover:bg-orange-100"
                     >
                       Ban
                     </button>
                     <button 
                       onClick={async () => {
                         if (window.confirm("Unban this user?")) {
                           const { error } = await supabase.from('user_profiles').update({ is_banned: false }).eq('user_id', u.user_id);
                           if(error) alert('Failed: ' + error.message); else alert('Unbanned!');
                           loadUsers();
                         }
                       }} 
                       className="bg-blue-50 text-blue-700 py-1.5 px-3 rounded-lg text-xs font-bold hover:bg-blue-100"
                     >
                       Unban
                     </button>
                   </div>
                 </div>
               ))}
             </div>
          )
        )}

        {/* Submissions Tab */}
        {tab === 'submissions' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Pending Proofs</h2>
            {loading ? <p className="text-slate-500">Loading...</p> : submissions.length === 0 ? <p className="text-slate-500">No pending submissions.</p> : submissions.map(sub => (
              <div key={sub.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800">{sub.tasks?.title || 'Unknown Task'}</h3>
                    <p className="text-xs text-slate-500">Reward: ৳{sub.tasks?.reward}</p>
                    {sub.user_profile ? (
                      <p className="text-xs text-slate-600 mt-1 font-medium flex flex-wrap items-center gap-2">
                        <span>User: {sub.user_profile.name}</span>
                        <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded tracking-wide font-bold">{sub.user_profile.number || ''}</span>
                        <span className="bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded tracking-wide font-bold">{sub.user_profile.email}</span>
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-1">User ID: {sub.user_id?.slice(0, 8)}...</p>
                    )}
                  </div>
                </div>
                
                <a href={sub.screenshot_url} target="_blank" rel="noopener noreferrer" className="block text-indigo-600 font-medium text-sm hover:underline">
                  View Screenshot Proof
                </a>
                
                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  <button onClick={() => handleSubmissionAction(sub.id, 'approved', sub.user_id, sub.tasks?.reward || 0)} className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-lg font-medium flex justify-center items-center gap-1 hover:bg-emerald-100">
                    <Check size={18} /> Approve
                  </button>
                  <button onClick={() => handleSubmissionAction(sub.id, 'rejected', sub.user_id, sub.tasks?.reward || 0)} className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-medium flex justify-center items-center gap-1 hover:bg-red-100">
                    <X size={18} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Recharges Tab */}
        {tab === 'recharges' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Pending Purchases & Pro Requests</h2>
            {loading ? <p className="text-slate-500">Loading...</p> : recharges.length === 0 ? <p className="text-slate-500">No pending requests.</p> : recharges.map(rec => (
              <div key={rec.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                       {rec.offer_details === 'BD Pro Lifetime Access' ? (
                          <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-xs font-black uppercase tracking-widest border border-amber-200">
                             Pro Request
                          </span>
                       ) : null}
                       {rec.offer_details === 'KYC Verification' ? (
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-xs font-black uppercase tracking-widest border border-emerald-200">
                             KYC Request
                          </span>
                       ) : null}
                       {rec.offer_details || 'Regular Top-Up'}
                    </h3>
                    <p className="text-sm font-black text-indigo-600 mt-1">Amount: ৳{rec.amount}</p>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(rec.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-sm space-y-2">
                  <p><span className="text-slate-500 font-medium">Phone:</span> <span className="font-bold">{rec.phone_number}</span></p>
                  <p><span className="text-slate-500 font-medium">Operator:</span> <span className="font-bold uppercase">{rec.operator}</span></p>
                  <div className="pt-2 border-t border-slate-200">
                    <span className="text-slate-500 font-medium block mb-1">bKash/Nagad TrxID:</span> 
                    <span className="font-mono bg-indigo-50 text-indigo-700 p-2 rounded block break-all font-bold border border-indigo-100">
                      {rec.trx_id}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => handleRechargeAction(rec, 'approved')}
                    className="flex-1 bg-emerald-100 text-emerald-700 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-emerald-200 font-bold transition-colors"
                  >
                    <Check size={18} /> Approve
                  </button>
                  <button 
                    onClick={() => handleRechargeAction(rec, 'rejected')}
                    className="flex-1 bg-red-100 text-red-700 py-2.5 rounded-lg flex items-center justify-center gap-2 hover:bg-red-200 font-bold transition-colors"
                  >
                    <X size={18} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Withdrawals Tab */}
        {tab === 'withdrawals' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-800">Pending Withdrawals</h2>
            {loading ? <p className="text-slate-500">Loading...</p> : withdrawals.length === 0 ? <p className="text-slate-500">No pending withdrawals.</p> : withdrawals.map(w => (
              <div key={w.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg capitalize">{w.method} Withdrawal</h3>
                    <p className="text-sm font-black text-emerald-600">Amount: ৳{w.amount}</p>
                  </div>
                  <span className="text-xs text-slate-400">{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-slate-50 rounded-lg">
                  <span className="text-sm font-bold text-slate-600 uppercase tracking-widest leading-none block">
                    Acct:
                  </span>
                  <span className="font-mono text-sm font-black text-slate-800 bg-white px-2 py-1 rounded shadow-sm border border-slate-200 ml-2">
                    {w.account_number}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button 
                    onClick={() => handleWithdrawalAction(w, 'approved')}
                    className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-lg font-medium flex justify-center items-center gap-1 hover:bg-emerald-100 transition-colors"
                  >
                    <Check size={18} /> Approve
                  </button>
                  <button 
                    onClick={() => handleWithdrawalAction(w, 'rejected')}
                    className="flex-1 bg-red-50 text-red-600 py-2 rounded-lg font-medium flex justify-center items-center gap-1 hover:bg-red-100 transition-colors"
                  >
                    <X size={18} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Gmail Tasks Tab */}
        {tab === 'gmail' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={20} className="text-indigo-600" /> Add Gmail Task
              </h2>
              <form onSubmit={handleAddGmailTask} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">First Name</label>
                    <input required type="text" value={newGmailTask.first_name} onChange={e => setNewGmailTask({...newGmailTask, first_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="John" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Last Name</label>
                    <input required type="text" value={newGmailTask.last_name} onChange={e => setNewGmailTask({...newGmailTask, last_name: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Email Prefix</label>
                  <input required type="text" value={newGmailTask.email_prefix} onChange={e => setNewGmailTask({...newGmailTask, email_prefix: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="johndoe123" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Password</label>
                  <input required type="text" value={newGmailTask.password} onChange={e => setNewGmailTask({...newGmailTask, password: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="StrongPass123!" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Reward (BDT)</label>
                  <input required type="number" step="0.1" value={newGmailTask.reward} onChange={e => setNewGmailTask({...newGmailTask, reward: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <button type="submit" className="w-full bg-indigo-600 text-white font-medium py-2.5 rounded-xl hover:bg-indigo-700 transition-colors">
                  Add Gmail Task
                </button>
              </form>
            </div>

            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800">Gmail Tasks</h2>
              {loading ? <p className="text-slate-500">Loading...</p> : gmailTasks.length === 0 ? <p className="text-slate-500">No gmail tasks.</p> : gmailTasks.map(task => (
                <div key={task.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                       <div className={`w-3 h-3 rounded-full ${
                          task.status === 'available' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                          task.status === 'locked' ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]' :
                          task.status === 'submitted' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]' :
                          'bg-slate-300'
                       }`}></div>
                       <div>
                         <span className="font-bold text-slate-700 capitalize tracking-wide flex items-center gap-2">
                           {task.first_name} {task.last_name}
                           <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500">{task.status}</span>
                         </span>
                         <p className="text-[12px] text-slate-500 font-medium pb-1">{task.email_prefix}@gmail.com <span className="mx-1">•</span> <span className="font-mono text-slate-400">Pass: {task.password}</span></p>
                         {task.user_profile && (
                            <p className="text-[11px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md mt-1 inline-flex flex-wrap gap-2 items-center">
                              <span>User: {task.user_profile.name}</span>
                              {task.user_profile.number && <span>({task.user_profile.number})</span>}
                              <span className="bg-white/50 px-1 rounded">{task.user_profile.email}</span>
                            </p>
                         )}
                       </div>
                    </div>
                    <div className="flex items-center gap-2">
                       <button onClick={() => handleDeleteGmailTask(task.id)} className="text-red-400 p-2 hover:bg-red-50 hover:text-red-500 rounded-xl transition-colors">
                         <Trash2 size={16} />
                       </button>
                    </div>
                  </div>
                  
                  {task.status === 'submitted' && task.locked_by && (
                    <div className="flex gap-2 pt-3 border-t border-slate-100 mt-1">
                      <button 
                        onClick={() => handleApproveGmailTask(task.id, task.locked_by, task.reward)}
                        className="flex-1 bg-emerald-50 text-emerald-600 py-2 rounded-xl text-sm font-bold hover:bg-emerald-100 transition-colors"
                      >
                        Approve & Pay (৳{task.reward})
                      </button>
                      <button 
                        onClick={() => handleRejectGmailTask(task.id)}
                        className="flex-1 bg-red-50 text-red-600 py-2 rounded-xl text-sm font-bold hover:bg-red-100 transition-colors"
                      >
                        Reject & Unlock
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks Tab */}
        {tab === 'tasks' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                 <h2 className="text-lg font-bold text-slate-800">{editingTaskId ? 'Edit Task' : 'Add New Task'}</h2>
                 {editingTaskId && (
                    <button onClick={cancelEdit} className="text-sm font-bold text-slate-500 hover:text-slate-700">Cancel</button>
                 )}
              </div>
              <form onSubmit={saveTask} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                  <select 
                    value={newTaskForm.task_type} 
                    onChange={e => setNewTaskForm({...newTaskForm, task_type: e.target.value})}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                  >
                    {TASK_LIST.filter(t => !['gmail', 'recharge', 'typing', 'telegram'].includes(t.id)).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Task Title</label>
                  <input required type="text" value={newTaskForm.title} onChange={e => setNewTaskForm({...newTaskForm, title: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Watch Video & Subscribe" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Description (Optional)</label>
                  <textarea value={newTaskForm.description} onChange={e => setNewTaskForm({...newTaskForm, description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="Task details..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">
                    {newTaskForm.task_type === 'fb-post' ? 'Link URL (Optional)' : 'Link URL'}
                  </label>
                  <input required={newTaskForm.task_type !== 'fb-post'} type="url" value={newTaskForm.link} onChange={e => setNewTaskForm({...newTaskForm, link: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Tutorial Image/Video URL (Optional)</label>
                  <input type="url" value={newTaskForm.tutorial_url} onChange={e => setNewTaskForm({...newTaskForm, tutorial_url: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="URL of tutorial video or image..." />
                </div>
                {newTaskForm.task_type === 'fb-post' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Post Image (Required for FB Post)</label>
                    {newTaskForm.image_url ? (
                      <div className="relative mb-2">
                        <img src={newTaskForm.image_url} alt="Uploaded" className="w-full h-32 object-contain rounded-lg border border-slate-200 bg-slate-50" />
                        <button type="button" onClick={() => setNewTaskForm({...newTaskForm, image_url: ''})} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                        <input
                           type="file"
                           accept="image/*"
                           onChange={uploadImageToImgbb}
                           className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {uploadingImage ? (
                           <div className="text-indigo-600 font-medium text-sm animate-pulse">Uploading Image...</div>
                        ) : (
                           <div className="text-slate-500 text-sm">
                             <Plus size={20} className="mx-auto mb-1 opacity-50" />
                             Click to upload image via ImgBB
                           </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Reward (BDT)</label>
                  <input required type="number" step="0.1" value={newTaskForm.reward} onChange={e => setNewTaskForm({...newTaskForm, reward: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <button type="submit" className={`w-full text-white py-2.5 rounded-lg flex justify-center items-center gap-2 transition-colors ${editingTaskId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-slate-800 hover:bg-slate-700'}`}>
                  {editingTaskId ? <Check size={18} /> : <Plus size={18} />} {editingTaskId ? 'Update Task' : 'Add Task'}
                </button>
              </form>
            </div>

            <div className="space-y-3">
              <h3 className="font-bold text-slate-800">Existing Tasks</h3>
              {tasks.map(t => (
                <div key={t.id} className={`bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center ${editingTaskId === t.id ? 'border-indigo-400 ring-2 ring-indigo-50' : 'border-slate-200'}`}>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{t.title}</h4>
                    <p className="text-xs text-slate-500">[{t.task_type}] - ৳{t.reward}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => toggleTask(t.id, t.is_active)}
                      className={`px-3 py-1 text-xs font-medium rounded-full ${t.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}
                    >
                      {t.is_active ? 'Active' : 'Hidden'}
                    </button>
                    <button 
                      onClick={() => startEditTask(t)}
                      className="p-1 px-2 text-indigo-500 hover:bg-indigo-50 rounded-lg transition-colors"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => deleteTask(t.id)}
                      className="p-1 px-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* API Keys Tab */}
        {tab === 'keys' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <KeySquare size={20} className="text-indigo-500" />
                Add ImgBB API Key
              </h2>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={newKey}
                  onChange={e => setNewKey(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" 
                  placeholder="Paste api key here..." 
                />
                <button onClick={addKey} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">Add</button>
              </div>
              <p className="text-xs text-slate-500 mt-3">The app will use these keys to upload screenshots. If one fails, it tries the next.</p>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-slate-800 mb-2">Active Keys</h3>
              {loading ? <p className="text-slate-500">Loading...</p> : keys.length === 0 ? <p className="text-slate-500">No keys added yet.</p> : keys.map(k => (
                <div key={k.id} className={`bg-white px-4 py-3 rounded-xl border flex justify-between items-center ${!k.is_active ? 'border-red-500 bg-red-50' : 'border-slate-200'}`}>
                  <span className={`font-mono text-xs truncate mr-4 ${!k.is_active ? 'text-red-600' : 'text-slate-600'}`}>
                    {k.api_key} {!k.is_active && '(Failed/Invalid)'}
                  </span>
                  <button onClick={() => deleteKey(k.id)} className="text-red-500 hover:bg-red-100 p-1.5 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Offers Tab */}
        {tab === 'offers' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Add Recharge Offer</h2>
              <form onSubmit={addOffer} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Operator</label>
                  <select value={newOffer.operator} onChange={e => setNewOffer({...newOffer, operator: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm">
                    <option value="gp">Grameenphone</option>
                    <option value="robi">Robi</option>
                    <option value="banglalink">Banglalink</option>
                    <option value="airtel">Airtel</option>
                    <option value="teletalk">Teletalk</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Title</label>
                  <input required type="text" value={newOffer.title} onChange={e => setNewOffer({...newOffer, title: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. Monthly Data Pack" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Description</label>
                  <input required type="text" value={newOffer.description} onChange={e => setNewOffer({...newOffer, description: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="e.g. 30GB + 800 Min" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Price (৳)</label>
                  <input required type="number" value={newOffer.price} onChange={e => setNewOffer({...newOffer, price: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg flex justify-center items-center gap-2 hover:bg-slate-700">
                  <Plus size={18} /> Add Offer
                </button>
              </form>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800">Existing Offers</h3>
              {loading ? <p className="text-slate-500">Loading...</p> : rechargeOffers.map(o => (
                <div key={o.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm uppercase">{o.operator} - {o.title}</h4>
                    <p className="text-xs text-slate-500">{o.description} - ৳{o.price}</p>
                  </div>
                  <button onClick={() => deleteOffer(o.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-colors">
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notify Tab */}
        {tab === 'notify' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Send Custom Notification</h2>
              <p className="text-xs text-slate-500 mb-4">You can send an SMS-like notification to their inbox in the app. Enter their exact User ID (Email or Phone not available directly unless searched by ID for now, so use ID or write a broadcast logic).</p>
              <form onSubmit={sendNotification} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">User ID</label>
                  <input required type="text" value={newNotification.userId} onChange={e => setNewNotification({...newNotification, userId: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono" placeholder="uuid format" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1">Message</label>
                  <textarea required value={newNotification.message} onChange={e => setNewNotification({...newNotification, message: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-24" placeholder="Hello..." />
                </div>
                <button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg flex justify-center items-center hover:bg-slate-700">
                  Send Notification
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === 'settings' && (
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Site Settings (Popup & Links)</h2>
              {loading ? <p className="text-slate-500">Loading...</p> : settings ? (
                <form onSubmit={saveSettings} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={settings.popup_enabled} onChange={e => setSettings({...settings, popup_enabled: e.target.checked})} id="popup_enabled" className="w-4 h-4 text-indigo-600 rounded" />
                    <label htmlFor="popup_enabled" className="text-sm font-bold text-slate-700">Enable Random Welcome Popup (25% chance)</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input type="checkbox" checked={settings.kyc_enabled || false} onChange={e => setSettings({...settings, kyc_enabled: e.target.checked})} id="kyc_enabled" className="w-4 h-4 text-emerald-600 rounded" />
                    <label htmlFor="kyc_enabled" className="text-sm font-bold text-emerald-700">Enable KYC Verification (Requires 50 BDT payment for accessing tasks/withdraw)</label>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Popup Text</label>
                    <textarea value={settings.popup_text} onChange={e => setSettings({...settings, popup_text: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-20" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Global Notice (Scrolling on Home)</label>
                    <textarea value={settings.global_notice || ''} onChange={e => setSettings({...settings, global_notice: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm h-20" placeholder="e.g. Server maintenance tonight..." />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tutorial (Facebook Video/Reels URL or ID)</label>
                    <input type="text" value={settings.tutorial_url || ''} onChange={e => setSettings({...settings, tutorial_url: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" placeholder="URL or ID (e.g. 123456789 or https://...)" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Review URL (App/Play Store)</label>
                    <input type="url" value={settings.review_url} onChange={e => setSettings({...settings, review_url: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Telegram Channel URL</label>
                    <input type="url" value={settings.telegram_url} onChange={e => setSettings({...settings, telegram_url: e.target.value})} className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                  </div>
                  <button type="submit" className="w-full bg-slate-800 text-white py-2.5 rounded-lg flex justify-center items-center hover:bg-slate-700">
                    Save Config
                  </button>
                </form>
              ) : <p className="text-slate-500">Settings not initialized in DB</p>}
            </div>
          </div>
        )}

        {tab === 'inbox' && (
          <AdminInbox onClose={() => setTab('home')} />
        )}

      </div>
    </motion.div>
  );
}

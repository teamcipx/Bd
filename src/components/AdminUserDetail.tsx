import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Edit3, ShieldAlert, CheckCircle, XCircle } from 'lucide-react';
import { motion } from 'motion/react';

export function AdminUserDetail({ userId, onBack }: { userId: string, onBack: () => void }) {
  const [profile, setProfile] = useState<any>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    
    // 1. Profile
    const { data: profData } = await supabase.from('user_profiles').select('*').eq('user_id', userId).single();
    if (profData) setProfile(profData);
    
    // 2. Balance via RPC
    const { data: balData, error: balErr } = await supabase.rpc('admin_get_user_balance', { p_user_id: userId });
    if (!balErr) {
      setBalance(balData);
    } else {
      console.warn("SQL function admin_get_user_balance missing. Run latest SQL.");
    }

    // 3. Submissions
    const { data: subs } = await supabase.from('submissions').select('*, tasks(title, task_type)').eq('user_id', userId).order('created_at', { ascending: false });
    if (subs) setSubmissions(subs);

    // 4. Referrals
    const { data: refs } = await supabase.from('referrals').select('*, referred_user_id').eq('referrer_id', userId).order('created_at', { ascending: false });
    if (refs) setReferrals(refs);

    // 5. Withdrawals
    const { data: withs } = await supabase.from('withdrawals').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (withs) setWithdrawals(withs);

    setLoading(false);
  };

  const deductBalance = async () => {
    const amtStr = prompt("Enter amount to DEDUCT from balance:");
    if (!amtStr) return;
    const amount = Number(amtStr);
    if (isNaN(amount) || amount <= 0) return;
    
    const { error } = await supabase.rpc('admin_update_user_balance', { p_user_id: userId, p_amount: -amount });
    if (!error) {
      setBalance((b) => (b || 0) - amount);
      alert("Balance deducted successfully.");
    } else {
      alert("Failed to deduct. Make sure you ran the latest SQL script containing admin_update_user_balance.");
    }
  };

  const addBalance = async () => {
    const amtStr = prompt("Enter amount to ADD to balance:");
    if (!amtStr) return;
    const amount = Number(amtStr);
    if (isNaN(amount) || amount <= 0) return;
    
    const { error } = await supabase.rpc('admin_update_user_balance', { p_user_id: userId, p_amount: amount });
    if (!error) {
      setBalance((b) => (b || 0) + amount);
      alert("Balance added successfully.");
    } else {
      alert("Failed to add balance. Ensure SQL is updated.");
    }
  };

  const toggleBan = async () => {
    if (!profile) return;
    const isBanned = !!profile.is_banned;
    const confirmMsg = isBanned 
      ? "Are you sure you want to unban this user?" 
      : "Are you sure you want to ban this user? They will not be able to use the app.";
    if (!window.confirm(confirmMsg)) return;

    await supabase.from('user_profiles').update({ is_banned: !isBanned }).eq('user_id', userId);
    setProfile({...profile, is_banned: !isBanned});
  };

  if (loading) {
     return <div className="p-8 text-center text-slate-500 font-bold">Loading user details...</div>;
  }

  if (!profile) {
     return <div className="p-8 text-center text-slate-500 font-bold">User not found <button onClick={onBack} className="text-indigo-600 block mx-auto mt-4">Go Back</button></div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-20">
       <button onClick={onBack} className="flex items-center gap-2 text-slate-500 hover:text-slate-700 font-bold mb-4">
         <ArrowLeft size={18} /> Back to Users
       </button>
       
       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
         <div className="flex justify-between items-start mb-6">
            <div>
               <h2 className="text-2xl font-black text-slate-800">{profile.name || 'Unnamed'}</h2>
               <p className="text-sm text-slate-500 font-mono mt-1">{userId}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
               {profile.is_pro && <span className="bg-amber-100 text-amber-700 font-black text-xs px-2 py-1 rounded-md tracking-widest uppercase">VIP / PRO</span>}
               {profile.is_banned && <span className="bg-red-100 text-red-700 font-black text-xs px-2 py-1 rounded-md tracking-widest uppercase">Banned</span>}
               <button onClick={toggleBan} className={`text-[10px] uppercase font-bold px-3 py-1 rounded-md ${profile.is_banned ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                 {profile.is_banned ? 'Unban User' : 'Ban User'}
               </button>
            </div>
         </div>
         
         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
               <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Email</span>
               <span className="font-bold text-slate-700 text-sm">{profile.email || 'N/A'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
               <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Number</span>
               <span className="font-bold text-slate-700 text-sm">{profile.number || 'N/A'}</span>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
               <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">Join Date</span>
               <span className="font-bold text-slate-700 text-sm">{new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
            <div className="bg-indigo-50 p-3 rounded-xl border border-indigo-100 relative">
               <span className="block text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Balance</span>
               <span className="font-black text-indigo-700 text-lg">৳{balance !== null ? balance : '?'}</span>
               <div className="absolute right-2 top-2 bottom-2 flex flex-col gap-1">
                 <button onClick={addBalance} className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-bold hover:bg-indigo-700">+</button>
                 <button onClick={deductBalance} className="bg-rose-500 text-white text-[10px] px-2 py-0.5 rounded font-bold hover:bg-rose-600">-</button>
               </div>
            </div>
         </div>
       </div>

       <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                Withdrawals
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{withdrawals.length}</span>
             </h3>
             <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {withdrawals.length === 0 ? <p className="text-sm text-slate-400">No withdrawals</p> : withdrawals.map(w => (
                  <div key={w.id} className="border-b border-slate-50 pb-2">
                     <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-700 text-sm">৳{w.amount} <span className="uppercase text-xs text-slate-400 ml-1">({w.method})</span></span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${w.status.includes('approved') ? 'bg-emerald-100 text-emerald-600' : w.status.includes('rejected') ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                          {w.status.replace('pending_', 'pending ').replace('approved_', 'approved ').replace('rejected_', 'rejected ')}
                        </span>
                     </div>
                     <span className="text-[10px] text-slate-400">{new Date(w.created_at).toLocaleString()}</span>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                Referrals
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{referrals.length}</span>
             </h3>
             <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                {referrals.length === 0 ? <p className="text-sm text-slate-400">No referrals</p> : referrals.map(r => (
                  <div key={r.id} className="border-b border-slate-50 pb-2">
                     <span className="font-mono text-xs text-slate-500">{r.referred_user_id}</span>
                     <div className="flex justify-between mt-1">
                       <span className="text-[10px] text-slate-400">{new Date(r.created_at).toLocaleDateString()}</span>
                       <span className="text-[10px] font-bold text-emerald-600">৳{r.reward_amount}</span>
                     </div>
                  </div>
                ))}
             </div>
          </div>
       </div>

       <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
             <h3 className="font-bold text-slate-800 mb-4 flex items-center justify-between">
                Task Submissions
                <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">{submissions.length}</span>
             </h3>
             <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 grid grid-cols-1 md:grid-cols-2 gap-3">
                {submissions.length === 0 ? <p className="text-sm text-slate-400">No submissions</p> : submissions.map(s => (
                  <div key={s.id} className="border border-slate-100 rounded-xl p-3 flex gap-3">
                     {s.screenshot_url && <img src={s.screenshot_url} className="w-16 h-16 object-cover rounded-lg bg-slate-100" alt="proof" />}
                     <div className="flex-1">
                        <h4 className="font-bold text-slate-800 text-sm truncate">{s.tasks?.title || 'Unknown Task'}</h4>
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${s.status === 'approved' ? 'text-emerald-500' : s.status === 'rejected' ? 'text-red-500' : 'text-amber-500'}`}>{s.status}</span>
                        <div className="text-[10px] text-slate-400 mt-1">{new Date(s.created_at).toLocaleString()}</div>
                     </div>
                  </div>
                ))}
             </div>
       </div>
    </motion.div>
  );
}

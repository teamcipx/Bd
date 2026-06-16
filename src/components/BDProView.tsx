import React, { useState } from 'react';
import { User } from '../types';
import { motion } from 'motion/react';
import { ShieldCheck, Zap, Headset, Clock, Star, Key, Shield, Crown, Gift, CheckCircle2, ChevronRight, ArrowLeft, AlertCircle, Phone, Smartphone, PlayCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export function BDProView({ user, onSubscribe, setUser, siteSettings }: { user: User, onSubscribe: () => void, setUser?: (u: User) => void, siteSettings?: any }) {
  const [step, setStep] = useState(1);
  const [paymentPhone, setPaymentPhone] = useState('');
  const [method, setMethod] = useState('');
  const [trxId, setTrxId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [copiedType, setCopiedType] = useState<'bkash'|'nagad'|null>(null);
  const [isPending, setIsPending] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  React.useEffect(() => {
    const checkPending = async () => {
      if (user.isPro) {
         setInitLoading(false);
         return;
      }
      const { data } = await supabase.from('recharges').select('id, status').eq('user_id', user.id).eq('offer_details', 'BD Pro Lifetime Access').order('created_at', { ascending: false }).limit(1);
      if (data && data.length > 0) {
        if (data[0].status === 'pending') {
           setIsPending(true);
        } else if (data[0].status === 'approved') {
           if (setUser && !user.isPro) {
              const updatedUser = { ...user, isPro: true };
              setUser(updatedUser);
              localStorage.setItem('bdpay_user', JSON.stringify(updatedUser));
           }
        }
      }
      setInitLoading(false);
    };
    checkPending();
  }, [user.id, user.isPro, setUser]);

  const features = [
    { icon: <ShieldCheck size={20} />, title: "উত্তোলনের জন্য কোনো রেফার লাগবে না", desc: "বিনা রেফারে আনলিমিটেড উইথড্র" },
    { icon: <Zap size={20} />, title: "মাত্র ২০ টাকা হলেই সরাসরি উইথড্র", desc: "সবচেয়ে কম লিমিটে পেমেন্ট" },
    { icon: <Headset size={20} />, title: "যেকোনো সমস্যায় ইনস্ট্যান্ট লাইভ সাপোর্ট", desc: "সারাক্ষণ কাস্টমার সাপোর্ট সুবিধা 24/7" },
    { icon: <Clock size={20} />, title: "মাত্র ২ মিনিটে পেমেন্ট ক্লিয়ারেন্স", desc: "অটো পেমেন্ট সিস্টেমের মাধ্যমে" },
    { icon: <Star size={20} />, title: "নতুন অফার ও টাস্ক সবার আগে পাবেন", desc: "উচ্চ মূল্যের টাস্কগুলো আগে করার সুযোগ" },
    { icon: <Key size={20} />, title: "হাই-পেয়িং প্রিমিয়াম টাস্কের বিশেষ এক্সেস", desc: "শুধুমাত্র প্রো ইউজারদের জন্য স্পেশাল কাজ" },
    { icon: <Shield size={20} />, title: "অ্যাকাউন্টের সর্বোচ্চ নিরাপত্তা নিশ্চিত করা", desc: "আইডি হ্যাক বা নষ্ট হওয়ার ভয় নেই" },
    { icon: <CheckCircle2 size={20} />, title: "বিনা কারণে আইডি ব্যান হওয়া থেকে মুক্তি", desc: "লাইফটাইম গ্যারান্টি সহ অ্যাকাউন্ট" },
    { icon: <Crown size={20} />, title: "প্রোফাইলের পাশে স্পেশাল VIP ব্যাজ", desc: "VIP ইউজারদের জন্য আলাদা সম্মান" },
    { icon: <Gift size={20} />, title: "প্রতি রেফারে দ্বিগুণ (2x) বোনাস", desc: "রেফার করে আরও বেশি আয় করুন" },
  ];

  const handleContinue = () => {
    setStep(2);
  };

  const handleSubmit = async () => {
    if (!paymentPhone || !method || !trxId) {
      setError('Please provide Account Number, Payment Method, and Transaction ID.');
      return;
    }

    setLoading(true);
    setError('');

    const { error: dbError } = await supabase.from('recharges').insert({
      user_id: user.id,
      phone_number: paymentPhone,
      operator: method,
      amount: 150,
      offer_details: 'BD Pro Lifetime Access',
      trx_id: trxId
    });

    setLoading(false);

    if (dbError) {
      setError(dbError.message);
    } else {
      setSuccess(true);
    }
  };

  const fetchPendingStatus = async () => {
    setInitLoading(true);
    const { data } = await supabase.from('recharges').select('id, status').eq('user_id', user.id).eq('offer_details', 'BD Pro Lifetime Access').order('created_at', { ascending: false }).limit(1);
    if (data && data.length > 0) {
      if (data[0].status === 'pending') {
         setIsPending(true);
      } else if (data[0].status === 'approved') {
         setIsPending(false);
         if (setUser && !user.isPro) {
            const updatedUser = { ...user, isPro: true };
            setUser(updatedUser);
            localStorage.setItem('bdpay_user', JSON.stringify(updatedUser));
         }
      }
    }
    setInitLoading(false);
  };

  if (initLoading) {
    return <div className="p-10 text-center text-slate-500 font-medium">Checking status...</div>;
  }

  if (isPending) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-md mx-auto pt-10 pb-24 text-center">
        <div className="w-20 h-20 bg-indigo-100 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-indigo-200">
          <Clock size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">Pending Approval</h2>
        <p className="text-slate-500 mb-8 font-medium text-sm">আপনার BD PRO রিকোয়েস্টটি এখনো পেন্ডিং অবস্থায় আছে। দয়া করে এডমিন এপ্রুভ হওয়া পর্যন্ত অপেক্ষা করুন।</p>
        <div className="flex flex-col gap-3">
          <button 
            onClick={fetchPendingStatus}
            className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl hover:bg-indigo-700 transition-colors flex justify-center items-center gap-2"
          >
            Check Status Again
          </button>
          <button 
            onClick={onSubscribe}
            className="w-full bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </motion.div>
    );
  }

  if (success) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-md mx-auto pt-10 pb-24 text-center">
        <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-amber-200">
          <Crown size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-800 mb-2">রিকোয়েস্ট সাবমিট হয়েছে!</h2>
        <p className="text-slate-500 mb-8 font-medium text-sm">আপনার BD PRO রিকোয়েস্টটি এডমিনের কাছে পাঠানো হয়েছে। পেমেন্ট ভেরিফাই হওয়ার পর দ্রুত প্রো এক্সেস চালু করে দেওয়া হবে।</p>
        <button 
          onClick={onSubscribe}
          className="w-full bg-slate-900 text-white font-bold py-3.5 rounded-xl hover:bg-black transition-colors"
        >
          Back to Dashboard
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-md mx-auto space-y-6 pb-24">
      {step === 1 && (
        <>
          {user.isPro ? (
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl p-6 shadow-xl relative overflow-hidden text-center text-white">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                <Crown size={40} className="text-white" />
              </div>
              <h2 className="text-3xl font-black tracking-wide mb-2">BD PRO অ্যাক্টিভ</h2>
              <p className="text-amber-100 font-medium text-sm">আপনি এখন সকল প্রিমিয়াম ফিচারের লাইফটাইম এক্সেস উপভোগ করছেন।</p>
            </div>
          ) : (
            <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-violet-900 rounded-3xl p-6 shadow-2xl relative overflow-hidden border border-indigo-700/50">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-400/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-500/30 rounded-full blur-2xl -ml-10 -mb-10 pointer-events-none"></div>
              
              {siteSettings?.vip_tutorial_url && (
                <a href={siteSettings.vip_tutorial_url} target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/20 hover:bg-white/30 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-white transition-colors border border-white/20">
                  <PlayCircle size={14} /> Tutorial
                </a>
              )}
              
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-300 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 mb-4 border-2 border-amber-200">
                  <Crown size={40} className="text-white drop-shadow-md" />
                </div>
                <h2 className="text-3xl font-black text-white tracking-wide mb-1">BD <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 to-amber-500">PRO</span></h2>
                <p className="text-indigo-200 text-sm font-medium mb-6">Upgrade your experience with premium features</p>
                
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 w-full border border-white/10">
                  <div className="text-4xl font-black text-white mb-1">৳১৫০</div>
                  <div className="text-xs text-indigo-200 font-bold uppercase tracking-widest">Life Time Access</div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-widest pl-2">Premium Features</h3>
            
            <div className="grid grid-cols-1 gap-3">
              {features.map((feature, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  transition={{ delay: i * 0.05 }}
                  key={i} 
                  className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0 shadow-inner">
                    {feature.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-800 text-sm">{feature.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{feature.desc}</p>
                  </div>
                  <ChevronRight size={16} className="text-slate-300" />
                </motion.div>
              ))}
            </div>
          </div>

          {!user.isPro && (
            <div className="pt-4">
              <button 
                onClick={handleContinue}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-amber-500/30 flex items-center justify-center gap-2 text-lg uppercase tracking-wider transform transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Crown size={22} /> Get BD Pro Now
              </button>
            </div>
          )}
        </>
      )}

      {step === 2 && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
          <button onClick={() => setStep(1)} className="p-2 mb-2 hover:bg-black/5 rounded-lg transition-colors flex items-center gap-2 font-bold text-slate-600">
            <ArrowLeft size={20} /> Back
          </button>
          
          <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 relative overflow-hidden">
            <h2 className="font-bold text-amber-900 mb-2 relative z-10 flex flex-wrap items-center justify-between gap-2">
              পেমেন্ট নির্দেশনা - BD PRO
              <span className="bg-amber-500 text-white text-[10px] px-2 py-1 rounded-lg uppercase tracking-wide font-black">৳150</span>
            </h2>
            <div className="text-sm text-amber-800 space-y-3 relative z-10 font-medium">
              <p>১. নিচের ২টা নম্বরের যেকোনো একটিতে <strong className="text-lg bg-white px-2 py-0.5 rounded shadow-sm text-amber-900 font-black">৳150</strong> Send Money করুন।</p>
              
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200 shadow-sm">
                  <div>
                    <div className="font-mono font-bold text-slate-800 text-base leading-none">01624175616</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">bKash (Personal)</div>
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText('01624175616'); setCopiedType('bkash'); setTimeout(() => setCopiedType(null), 2000); }}
                    className="text-amber-600 bg-amber-50 px-4 py-2 rounded-lg font-bold text-xs hover:bg-amber-100 transition-colors min-w-[70px] text-center shadow-sm"
                  >
                    {copiedType === 'bkash' ? 'Copied' : 'Copy'}
                  </button>
                </div>
                
                <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-amber-200 shadow-sm">
                  <div>
                    <div className="font-mono font-bold text-slate-800 text-base leading-none">01912107604</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase mt-1">Nagad (Personal)</div>
                  </div>
                  <button 
                    onClick={() => { navigator.clipboard.writeText('01912107604'); setCopiedType('nagad'); setTimeout(() => setCopiedType(null), 2000); }}
                    className="text-amber-600 bg-amber-50 px-4 py-2 rounded-lg font-bold text-xs hover:bg-amber-100 transition-colors min-w-[70px] text-center shadow-sm"
                  >
                    {copiedType === 'nagad' ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </div>
              
              <p className="pt-2">২. পেমেন্ট করার পর ট্রানজেকশন আইডি (TrxID) কপি করে নিচে সেন্ড করুন।</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-100 p-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100 font-medium">
                <AlertCircle size={18} /> {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">যেই নাম্বার থেকে টাকা পাঠিয়েছেন</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="tel" 
                  placeholder="01XXXXXXXXX"
                  value={paymentPhone}
                  onChange={e => setPaymentPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">পেমেন্ট মেথড</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setMethod('bKash')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold transition-all ${method === 'bKash' ? 'bg-amber-50 border-amber-500 text-amber-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                >
                  <Smartphone size={18} /> বিকাশ
                </button>
                <button
                  onClick={() => setMethod('Nagad')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border font-bold transition-all ${method === 'Nagad' ? 'bg-amber-50 border-amber-500 text-amber-600 shadow-sm' : 'bg-slate-50 border-slate-200 text-slate-600'}`}
                >
                  <Smartphone size={18} /> নগদ
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1">ট্রানজেকশন আইডি (TrxID)</label>
              <input 
                type="text" 
                placeholder="যেমন: 8A4F9X..."
                value={trxId}
                onChange={e => setTrxId(e.target.value)}
                className="w-full px-4 py-3 outline-none whitespace-pre-wrap bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all font-mono"
              />
            </div>
            
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-slate-800 to-slate-900 text-white font-black py-4 rounded-xl hover:bg-black transition-colors disabled:opacity-70 flex items-center justify-center gap-2 shadow-lg tracking-wide uppercase text-sm"
            >
              {loading ? 'সাবমিট হচ্ছে...' : 'রিকোয়েস্ট সাবমিট করুন'}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

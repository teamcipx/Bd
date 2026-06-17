import { User } from '../types';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShieldCheck, CreditCard, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface KYCViewProps {
  user: any;
  onBack: () => void;
}

export function KYCView({ user, onBack }: KYCViewProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [hasPending, setHasPending] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Form fields (just for show)
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.gmail);
  const [phone, setPhone] = useState(user.number || '');
  
  // Payment field
  const [trxId, setTrxId] = useState('');
  const [method, setMethod] = useState('bkash'); // bkash, nagad
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkPending = async () => {
      try {
        const { data } = await supabase
          .from('recharges')
          .select('*')
          .eq('user_id', user.id)
          .eq('offer_details', 'KYC Verification')
          .eq('status', 'pending');
        
        if (data && data.length > 0) {
          setHasPending(true);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setInitialLoading(false);
      }
    };
    checkPending();
  }, [user.id]);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      toast.error('সব তথ্য পূরণ করুন');
      return;
    }
    setStep(2);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId || trxId.length < 8) {
      toast.error('সঠিক TrxID দিন');
      return;
    }
    
    setLoading(true);
    
    try {
      // Submit recharge request for KYC
      const { error } = await supabase.from('recharges').insert({
        user_id: user.id,
        phone_number: phone || user.number || '01x',
        amount: 50,
        operator: method,
        trx_id: trxId,
        offer_details: 'KYC Verification',
        status: 'pending'
      });
      
      if (error) throw error;
      
      toast.success('KYC ভেরিফিকেশন রিকোয়েস্ট পাঠানো হয়েছে!');
      onBack();
    } catch (error: any) {
      toast.error('সমস্যা হয়েছে: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-8 h-8 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (hasPending) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
        <div className="bg-emerald-600 px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3 text-white">
          <button onClick={onBack} className="p-2 hover:bg-black/10 rounded-lg transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold">KYC Verification</h1>
        </div>

        <div className="p-8 space-y-4 mt-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
            <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 size={40} />
            </div>
            <h2 className="text-xl font-black text-slate-800 mb-2">Review Pending</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-6">
              আপনার KYC ভেরিফিকেশন রিকোয়েস্টটি রিভিউ এর জন্য অপেক্ষমান রয়েছে। দয়া করে অপেক্ষা করুন।
            </p>
            <button 
              onClick={onBack} 
              className="px-8 py-3 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
            >
              ফিরে যান
            </button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-24">
      {/* Header */}
      <div className="bg-emerald-600 px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3 text-white">
        <button onClick={onBack} className="p-2 hover:bg-black/10 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">KYC Verification</h1>
      </div>

      <div className="p-4 space-y-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={32} />
          </div>
          <h2 className="text-xl font-black text-center text-slate-800 mb-4">অ্যাকাউন্ট ভেরিফিকেশন</h2>
          
          <div className="space-y-2 mb-6">
            <p className="font-bold text-slate-700">কেন KYC ভেরিফিকেশন আবশ্যক?</p>
            <ul className="text-sm text-slate-600 space-y-2 ml-1">
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> ফেইক রেফারের মাধ্যমে প্রতারণা রোধ করতে</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> বট ও অটোমেটেড স্ক্রিপ্ট বন্ধ করতে</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> রিয়েল ইউজারদের অগ্রাধিকার দিতে</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> সকলের জন্য সমান সুযোগ নিশ্চিত করতে</li>
              <li className="flex gap-2"><CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" /> প্ল্যাটফর্মের সিকিউরিটি ও কোয়ালিটি রক্ষা করতে</li>
            </ul>
          </div>
          
          <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100 text-sm text-emerald-800 text-center font-bold mb-4">
            KYC ফি মাত্র: ৫০ টাকা
          </div>
        </div>

        {step === 1 ? (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">আপনার তথ্য দিন</h3>
            <form onSubmit={handleContinue} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">পূর্ণ নাম</label>
                <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">ইমেইল ঠিকানা</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">ফোন নাম্বার (বিকাশ/নগদ/রকেট)</label>
                <input required type="text" value={phone} onChange={e => setPhone(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all" />
              </div>
              <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl block text-center shadow-lg shadow-emerald-600/30">
                পরবর্তী ধাপ (Continue)
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="font-bold text-slate-800 mb-4">পেমেন্ট সম্পন্ন করুন</h3>
            
            <div className="flex gap-2 mb-4">
              <button 
                type="button"
                onClick={() => setMethod('bkash')}
                className={`flex-1 py-2 rounded-xl font-bold border transition-colors ${method === 'bkash' ? 'bg-pink-50 border-pink-500 text-pink-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
              >
                bKash
              </button>
              <button 
                type="button"
                onClick={() => setMethod('nagad')}
                className={`flex-1 py-2 rounded-xl font-bold border transition-colors ${method === 'nagad' ? 'bg-orange-50 border-orange-500 text-orange-600' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
              >
                Nagad
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4 text-center">
              <p className="text-sm text-slate-500 mb-1">Send Money To ({method.toUpperCase()})</p>
              <p className="text-xl font-black text-slate-800 tracking-wider">
                {method === 'bkash' ? '01624175616' : '01912107604'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Amount: 50 BDT</p>
            </div>

            <form onSubmit={handlePaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">TrxID (Transaction ID)</label>
                <input required placeholder="e.g. 7XH9A2B" type="text" value={trxId} onChange={e => setTrxId(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all uppercase" />
              </div>
              <button disabled={loading} type="submit" className="w-full bg-emerald-600 text-white font-bold py-3.5 rounded-xl flex justify-center items-center gap-2 shadow-lg shadow-emerald-600/30 disabled:opacity-70">
                {loading ? 'Processing...' : <><CreditCard size={18} /> Verify Payment</>}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full py-2 text-sm text-slate-500 font-medium">
                ফিরে যান
              </button>
            </form>
          </div>
        )}
      </div>
    </motion.div>
  );
}

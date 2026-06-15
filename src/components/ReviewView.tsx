import React, { useState, useEffect } from 'react';
import { User } from '../types';
import { supabase } from '../lib/supabase';
import { Star, Image as ImageIcon, Send, MessageSquare, X } from 'lucide-react';
import { motion } from 'motion/react';

export function ReviewView({ user }: { user: User }) {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [text, setText] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [fakeName, setFakeName] = useState('');
  const [uploading, setUploading] = useState(false);
  
  const isAdmin = user.gmail === 'admin@gmail.com';

  const loadReviews = async () => {
    setLoading(true);
    let query = supabase.from('reviews').select('*').order('created_at', { ascending: false });
    
    if (!isAdmin) {
      query = query.or(`is_admin.eq.true,user_id.eq.${user.id}`);
    }
    
    const { data } = await query;
    if (data) setReviews(data);
    setLoading(false);
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে আপনি এই রিভিউটি মুছে ফেলতে চান?")) return;
    const { error } = await supabase.from('reviews').delete().eq('id', id);
    if (!error) {
      loadReviews();
    } else {
      alert("রিভিউ মুছে ফেলতে ব্যর্থ হয়েছে।");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text && !imageFile) return;
    
    setUploading(true);
    let imageUrl = null;
    
    // If they provided an image, upload it
    if (imageFile) {
      try {
        const { data: keys } = await supabase.from('imgbb_keys').select('api_key').limit(1);
        if (keys && keys[0]) {
          const formData = new FormData();
          formData.append('image', imageFile);
          const res = await fetch(`https://api.imgbb.com/1/upload?key=${keys[0].api_key}`, {
            method: 'POST',
            body: formData,
          });
          const resData = await res.json();
          if (resData.success) {
            imageUrl = resData.data.url;
          }
        }
      } catch (err) {
        console.error('Image upload failed', err);
      }
    }
    
    const reviewerName = isAdmin && fakeName ? fakeName : (user.name || 'User');
    
    const { error } = await supabase.from('reviews').insert({
      user_id: user.id, // Everyone saves their own id
      reviewer_name: reviewerName,
      text,
      image_url: imageUrl,
      is_admin: isAdmin
    });
    
    setUploading(false);
    if (!error) {
      setText('');
      setImageFile(null);
      setFakeName('');
      loadReviews();
    } else {
      alert("রিভিউ সাবমিট করতে ব্যর্থ হয়েছে।");
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 max-w-md mx-auto pb-24">
      <h2 className="text-xl font-bold text-slate-800 mb-4">রিভিউ (Reviews)</h2>
      
      <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm p-4 border border-slate-100 mb-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

        <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2 relative z-10">
          <Star className="text-amber-500 fill-amber-500" size={16} /> নতুন রিভিউ দিন
        </h3>
        
        {isAdmin && (
          <div className="mb-3 relative z-10">
            <label className="block text-xs font-bold text-slate-500 mb-1">Fake Name (Admin Only)</label>
            <input 
              type="text" 
              value={fakeName} 
              onChange={e => setFakeName(e.target.value)} 
              placeholder="E.g. Rakib" 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>
        )}
        
        <div className="mb-4 relative z-10">
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="আপনার মতামত লিখুন..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 min-h-[100px] resize-none"
            required={!imageFile}
          />
        </div>
        
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="relative overflow-hidden flex-1">
            <input 
              type="file"
              accept="image/*"
              onChange={e => setImageFile(e.target.files?.[0] || null)}
              className="absolute inset-0 opacity-0 cursor-pointer z-10"
            />
            <div className={`flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold transition-colors border border-dashed ${imageFile ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-slate-50 border-slate-300 text-slate-500'}`}>
              <ImageIcon size={16} /> {imageFile ? 'ছবি নির্বাচন করা হয়েছে' : 'ছবি যোগ করুন'}
            </div>
          </div>
          
          <button 
            type="submit" 
            disabled={uploading || (!text && !imageFile)} 
            className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-black transition-colors"
          >
            {uploading ? 'প্রসেসিং...' : <><Send size={16} /> সাবমিট করুন</>}
          </button>
        </div>
      </form>

      <div className="space-y-4">
        {loading ? (
          <div className="space-y-3">
             {[1,2,3].map(i => (
               <div key={i} className="bg-white h-24 rounded-2xl border border-slate-100 animate-pulse"></div>
             ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center text-slate-500">
            <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="font-medium text-sm">কোনো রিভিউ নেই</p>
          </div>
        ) : (
          reviews.map((review, i) => (
            <motion.div 
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: i * 0.05 }}
              key={review.id} 
              className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 p-6 border border-slate-100 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 z-0"></div>
              
              <div className="relative z-10 flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl uppercase shadow-inner border border-indigo-200/50">
                    {review.reviewer_name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-bold text-[15px] text-slate-800 tracking-wide">
                      {review.reviewer_name}
                    </h4>
                    <p className="text-[11px] font-bold tracking-wider text-slate-400 mt-0.5 uppercase">{new Date(review.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1 bg-amber-50 px-2.5 py-1.5 rounded-xl border border-amber-100/50">
                    {[1,2,3,4,5].map(star => <Star key={star} size={14} className="text-amber-400 fill-amber-400" />)}
                  </div>
                  {isAdmin && (
                    <button onClick={() => handleDeleteReview(review.id)} className="text-red-500 bg-red-50 p-2 rounded-lg hover:bg-red-100 transition-colors">
                      <X size={16} />
                    </button>
                  )}
                </div>
              </div>
              
              {review.text && (
                <div className="relative z-10 bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-4">
                  <p className="text-sm text-slate-700 leading-relaxed font-medium">{review.text}</p>
                </div>
              )}
              
              {review.image_url && (
                <div className="relative z-10 rounded-2xl overflow-hidden shadow-sm border border-slate-200/60 bg-black/5">
                  <img src={review.image_url} alt="Review attachment" className="w-full h-auto object-cover max-h-[250px]" loading="lazy" />
                </div>
              )}
            </motion.div>
          ))
        )}
        
        {reviews.length > 0 && !loading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-10 flex flex-col items-center justify-center gap-3 text-slate-400"
          >
            <motion.div 
              animate={{ rotate: 360 }} 
              transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }} 
              className="w-5 h-5 border-[3px] border-slate-200 border-t-slate-400 rounded-full" 
            />
            <span className="text-xs font-black tracking-widest uppercase opacity-70">Loading....</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { TaskItem, User } from '../types';
import { ArrowLeft, Upload, CheckCircle2, Image as ImageIcon, ExternalLink, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import toast from 'react-hot-toast';

export function TaskSubmitView({ task, user, onBack, onSuccess }: { task: TaskItem, user: User, onBack: () => void, onSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const submitProof = async () => {
    if (!file) {
      setError('Please select a screenshot first');
      return;
    }
    setLoading(true);
    setUploadProgress(10);
    setError('');

    let progressInterval: number;
    progressInterval = window.setInterval(() => {
      setUploadProgress(prev => prev < 90 ? prev + 15 : prev);
    }, 400);

    try {
      let imageUrl = '';
      let imgSuccess = false;
      
      // Fetch active ImgBB keys
      const { data: keys } = await supabase.from('imgbb_keys').select('id, api_key').eq('is_active', true);
      
      if (!keys || keys.length === 0) {
        throw new Error('No ImgBB API key configured. Please wait for admin to add one.');
      }

      // Try keys until one works (fallback mechanism)
      for (const k of keys) {
        try {
          const formData = new FormData();
          formData.append('image', file);
          
          const imgbbRes = await fetch(`https://api.imgbb.com/1/upload?key=${k.api_key}`, {
            method: 'POST',
            body: formData
          });
          const imgbbData = await imgbbRes.json();
          if (imgbbData.success) {
            imageUrl = imgbbData.data.url;
            imgSuccess = true;
            break;
          } else {
            const errCode = imgbbData.error?.code;
            const errMsg = imgbbData.error?.message || '';
            // Only deactivate key if it is genuinely invalid or quota exceeded (Code 100/102 or mentions API key)
            if (errCode === 100 || errCode === 102 || errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('limit')) {
               console.warn('Imgbb API key exhausted/invalid:', k.api_key);
               await supabase.from('imgbb_keys').update({ is_active: false }).eq('id', k.id);
               continue; // Try next key
            } else {
               // Client-side image issue (e.g. file too large, invalid format) -> Stop and show user
               throw new Error(errMsg || 'Image upload failed. Ensure it is a valid format and under 32MB.');
            }
          }
        } catch(e: any) {
          // If the error was thrown by us (e.g. image size), bubble it up and break cycle
          if (e.message && !e.message.toLowerCase().includes('fetch')) {
             throw e;
          }
          // Network errors during fetch - we can just let it try the next key
          console.error('Network error with key', k.api_key, e);
        }
      }
      
      if (!imgSuccess) {
         throw new Error('Image upload failed. APIs might be exhausted or offline.');
      }

      // Insert submission
      const { error: dbError } = await supabase.from('submissions').insert({
        user_id: user.id,
        task_id: task.id,
        screenshot_url: imageUrl,
        status: 'pending'
      });

      if (dbError) throw dbError;

      window.clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Small delay to show 100% completion
      await new Promise(res => setTimeout(res, 400));
      setSuccess(true);
      toast.success('Task submitted successfully!', { icon: '🎉' });
      
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#3b82f6', '#f59e0b']
      });
      
    } catch (e: any) {
      window.clearInterval(progressInterval);
      setUploadProgress(0);
      setError(e.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto p-8 text-center pt-24">
        <div className="w-20 h-20 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Submitted Successfully!</h2>
        <p className="text-slate-500 mb-8">Your proof has been submitted and is pending admin approval.</p>
        <button 
          onClick={onSuccess || onBack}
          className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-medium hover:bg-slate-200 transition-colors"
        >
          Back to Tasks
        </button>
      </div>
    );
  }

  const getEmbedUrl = (input: string) => {
    let fbUrl = input.trim();
    if (/^\d+$/.test(fbUrl)) {
        fbUrl = `https://www.facebook.com/video.php?v=${fbUrl}`;
    } else if (fbUrl.includes('/reel/') || fbUrl.includes('/share/r/')) {
        fbUrl = fbUrl.split('?')[0]; // Clean query string for clean embed
    }
    return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(fbUrl)}&show_text=false&width=auto`;
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      <div className="bg-primary px-4 py-4 sticky top-0 z-20 shadow-sm flex items-center gap-3 text-white">
        <button onClick={onBack} className="p-2 hover:bg-black/10 rounded-lg transition-colors">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold">Submit Task</h1>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-6 border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 mb-2">{task.title}</h2>
          {task.description && (
            <p className="text-slate-600 text-sm mb-4 whitespace-pre-wrap">{task.description}</p>
          )}
          <p className="text-slate-500 text-sm mb-4">Click the button below to complete the task, take a screenshot, and upload it as proof.</p>
          
          <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 flex justify-between items-center mb-6">
            <span className="font-medium text-indigo-900">Reward</span>
            <span className="font-bold text-indigo-700 text-lg">৳ {Number(task.reward).toFixed(2)}</span>
          </div>

          <a 
            href={task.link} 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full bg-slate-800 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors mb-6"
          >
            Open Task Link <ExternalLink size={18} />
          </a>

          {task.tutorial_url && (
            <div className="mb-6">
              <h3 className="font-bold text-slate-800 mb-2">Tutorial</h3>
              {task.tutorial_url.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                <img src={task.tutorial_url} alt="Task Tutorial" className="w-full rounded-xl object-contain border border-slate-200" />
              ) : task.task_type === 'special' || /^\d+$/.test(task.tutorial_url) || task.tutorial_url.includes('facebook') || task.tutorial_url.includes('fb.watch') ? (
                <div className="relative w-full overflow-hidden aspect-[9/16] max-w-[320px] mx-auto bg-slate-900 rounded-[24px] shadow-lg flex items-center justify-center border-4 border-slate-100 mb-2">
                  <iframe 
                    src={getEmbedUrl(task.tutorial_url)} 
                    className="absolute top-0 left-0 w-full h-full bg-black/5"
                    style={{ border: 'none', overflow: 'hidden' }}
                    scrolling="no" 
                    frameBorder="0" 
                    allowFullScreen={true} 
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
                    title="Task Tutorial Video"
                  />
                </div>
              ) : (
                <a
                  href={task.tutorial_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-medium text-center border border-blue-100 hover:bg-blue-100 transition-colors"
                >
                  View Tutorial Video / Details
                </a>
              )}
            </div>
          )}

          <hr className="border-slate-100 mb-6" />

          <h3 className="font-bold text-slate-800 mb-4">Upload Screenshot Proof</h3>
          
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          <label className="block w-full border-2 border-dashed border-slate-200 hover:border-primary hover:bg-emerald-50 transition-all rounded-2xl p-8 cursor-pointer text-center relative mb-6">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              onChange={e => setFile(e.target.files?.[0] || null)}
            />
            {file ? (
              <div className="text-primary flex flex-col items-center gap-2">
                <ImageIcon size={32} />
                <span className="font-medium text-sm">{file.name}</span>
                <span className="text-xs text-slate-500">Click to change</span>
              </div>
            ) : (
              <div className="text-slate-500 flex flex-col items-center gap-2">
                <Upload size={32} className="text-slate-400" />
                <span className="font-medium">Browse Files</span>
                <span className="text-xs">JPG, PNG up to 5MB</span>
              </div>
            )}
          </label>

          <button 
            onClick={submitProof}
            disabled={loading || !file}
            className="relative overflow-hidden w-full bg-primary text-white py-3 rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-70 flex justify-center items-center gap-2"
          >
            {loading && (
              <motion.div 
                className="absolute left-0 top-0 bottom-0 bg-primary-dark"
                initial={{ width: '0%' }}
                animate={{ width: `${uploadProgress}%` }}
                transition={{ ease: "linear", duration: 0.2 }}
              />
            )}
            <span className="relative z-10 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> 
                  Uploading... {uploadProgress}%
                </>
              ) : 'Submit Proof'}
            </span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

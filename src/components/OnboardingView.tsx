import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, CheckCircle2, Zap, ArrowRight, Home } from 'lucide-react';

const slides = [
  {
    id: 1,
    title: 'স্বাগতম জানাই!',
    description: 'BDPay-এ যুক্ত হওয়ার জন্য ধন্যবাদ। এখানে আপনি সহজ কাজ করে প্রতিদিন ইনকাম করতে পারবেন।',
    icon: Home,
    color: 'from-blue-500 to-indigo-600',
    iconColor: 'text-blue-500'
  },
  {
    id: 2,
    title: 'সততার সাথে কাজ করুন',
    description: 'যেকোনো ধরনের ভুয়া বা ফেক কাজ থেকে বিরত থাকুন। ফেক কাজ করলে একাউন্ট সাময়িকভাবে সাসপেন্ড হতে পারে।',
    icon: ShieldCheck,
    color: 'from-emerald-500 to-teal-600',
    iconColor: 'text-emerald-500'
  },
  {
    id: 3,
    title: 'দ্রুত পেমেন্ট',
    description: 'কাজ সঠিকভাবে সম্পন্ন হলে আপনি খুব দ্রুত আপনার বিকাশ বা নগদে পেমেন্ট পেয়ে যাবেন।',
    icon: Zap,
    color: 'from-amber-400 to-orange-500',
    iconColor: 'text-amber-500'
  },
  {
    id: 4,
    title: 'চলুন শুরু করি!',
    description: 'প্রতিদিনের টাস্কগুলো কমপ্লিট করুন এবং আপনার ইনকাম শুরু করুন।',
    icon: CheckCircle2,
    color: 'from-indigo-600 to-purple-600',
    iconColor: 'text-indigo-600'
  }
];

export function OnboardingView({ onComplete }: { onComplete: () => void }) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const nextSlide = () => {
    if (currentSlide === slides.length - 1) {
      onComplete();
    } else {
      setCurrentSlide(s => s + 1);
    }
  };

  const CurrentIcon = slides[currentSlide].icon;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900 flex items-center justify-center p-6 sm:p-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/50 to-slate-900 pointer-events-none" />
      
      <div className="w-full max-w-sm relative z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center"
          >
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center bg-gradient-to-br ${slides[currentSlide].color} shadow-lg shadow-indigo-500/20 mb-6 text-white`}>
              <CurrentIcon size={40} />
            </div>
            
            <h2 className="text-2xl font-black text-slate-800 mb-3 tracking-tight">
              {slides[currentSlide].title}
            </h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              {slides[currentSlide].description}
            </p>

            <div className="flex gap-2 mb-8">
              {slides.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all duration-300 ${i === currentSlide ? 'w-6 bg-indigo-600' : 'w-2 bg-slate-200'}`}
                />
              ))}
            </div>

            <button 
              onClick={nextSlide}
              className={`w-full py-4 rounded-2xl font-black text-white shadow-lg active:scale-95 transition-all text-lg flex items-center justify-center gap-2 bg-gradient-to-r ${slides[currentSlide].color}`}
            >
              {currentSlide === slides.length - 1 ? 'শুরু করুন' : 'পরবর্তী ধাপ'}
              {currentSlide === slides.length - 1 ? <CheckCircle2 size={20} /> : <ArrowRight size={20} />}
            </button>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

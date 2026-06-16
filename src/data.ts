import { 
  Youtube, 
  Globe, 
  Gamepad2, 
  Keyboard, 
  Smartphone, 
  Video, 
  Mail, 
  Send, 
  Crown, 
  CreditCard, 
  CheckSquare,
  FileImage
} from 'lucide-react';

export const TASK_LIST = [
  { id: 'fb-post', title: 'ফেসবুক পোস্ট', subtitle: 'ক্যাপশন ও ছবি পোস্ট করুন', icon: FileImage, color: 'text-indigo-500', bg: 'bg-indigo-100' },
  { id: 'fb-reels', title: 'ফেসবুক রিলস ভিউ', subtitle: 'ভিডিও দেখে ইনকাম', icon: Video, color: 'text-blue-500', bg: 'bg-blue-100' },
  { id: 'fb-custom', title: 'ফেসবুক কাস্টম টাস্ক', subtitle: 'লাইক, ফলো ও শেয়ার', icon: CheckSquare, color: 'text-blue-600', bg: 'bg-blue-100' },
  { id: 'youtube', title: 'ইউটিউব টাস্ক', subtitle: 'ভিডিও ও সাবস্ক্রাইব', icon: Youtube, color: 'text-red-500', bg: 'bg-red-100' },
  { id: 'website', title: 'ওয়েবসাইট ভিজিট', subtitle: 'ওয়েবসাইট ঘুরে দেখুন', icon: Globe, color: 'text-emerald-500', bg: 'bg-emerald-100' },
  { id: 'gmail', title: 'জিমেইল টাস্ক', subtitle: 'একাউন্ট তৈরি করুন', icon: Mail, color: 'text-red-400', bg: 'bg-red-50' },
  { id: 'telegram', title: 'টেলিগ্রাম সেল', subtitle: 'চ্যানেলে যুক্ত হোন', icon: Send, color: 'text-sky-500', bg: 'bg-sky-100' },
  { id: 'playstore', title: 'প্লেস্টোর টাস্ক', subtitle: 'অ্যাপ ইন্সটল ও রিভিউ', icon: Gamepad2, color: 'text-green-500', bg: 'bg-green-100' },
  { id: 'typing', title: 'টাইপিং টাস্ক', subtitle: 'ক্যাপচা এন্ট্রি', icon: Keyboard, color: 'text-slate-600', bg: 'bg-slate-200' },
  { id: 'tiktok', title: 'টিকটক টাস্ক', subtitle: 'ফলো এবং লাইক', icon: Smartphone, color: 'text-pink-500', bg: 'bg-pink-100' },
  { id: 'special', title: 'স্পেশাল টাস্ক', subtitle: 'উচ্চ মূল্যের টাস্ক', icon: Video, color: 'text-purple-500', bg: 'bg-purple-100' },
  { id: 'premium', title: 'প্রিমিয়াম টাস্ক', subtitle: 'বেশি ইনকাম', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-100' },
  { id: 'recharge', title: 'মোবাইল রিচার্জ', subtitle: 'ডিসকাউন্ট অফার', icon: CreditCard, color: 'text-indigo-500', bg: 'bg-indigo-100' },
];

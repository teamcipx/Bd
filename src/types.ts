export interface User {
  id: string;
  name: string;
  number: string;
  gmail: string;
  pass: string;
  referralCode?: string;
  balance: number;
  streak: number;
  lastCheckIn?: string;
  joinedAt: string;
  isPro?: boolean;
  is_kyc_verified?: boolean;
}

export interface Task {
  id: string;
  title: string;
  iconName: string;
  color: string;
}

export interface TaskItem {
  id: string;
  task_type: string;
  title: string;
  description?: string;
  link: string;
  tutorial_url?: string;
  image_url?: string;
  reward: number;
  is_active: boolean;
}

export interface Submission {
  id: string;
  user_id: string;
  task_id: string;
  screenshot_url: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  tasks?: TaskItem;
  users?: any; // For joining user data
}


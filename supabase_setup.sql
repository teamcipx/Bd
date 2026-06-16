-- Run this SQL in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  reward NUMERIC NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS submissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  screenshot_url TEXT NOT NULL,
  status TEXT DEFAULT 'pending', 
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fix task deletion reference problem
ALTER TABLE submissions
DROP CONSTRAINT IF EXISTS submissions_task_id_fkey,
ADD CONSTRAINT submissions_task_id_fkey
   FOREIGN KEY (task_id)
   REFERENCES tasks(id)
   ON DELETE CASCADE;

CREATE TABLE IF NOT EXISTS imgbb_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to approve task and credit user balance securely
CREATE OR REPLACE FUNCTION approve_task_submission(
  p_submission_id UUID,
  p_user_id UUID,
  p_reward NUMERIC
) RETURNS void AS $$
BEGIN
  -- Update submission status
  UPDATE submissions SET status = 'approved' WHERE id = p_submission_id;


  -- Add reward to user's auth metadata balance
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{balance}',
    to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + p_reward)
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS tutorial_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS caption TEXT;

CREATE TABLE IF NOT EXISTS recharges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  operator TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  offer_details TEXT,
  trx_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  method TEXT, -- bkash, nagad, rocket
  account_number TEXT,
  amount NUMERIC,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  reviewer_name TEXT NOT NULL,
  text TEXT,
  image_url TEXT,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS platform_updates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  text TEXT,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE platform_updates DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS support_chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  sender_type TEXT CHECK (sender_type IN ('user', 'admin')),
  text TEXT,
  image_url TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
ALTER TABLE support_chats DISABLE ROW LEVEL SECURITY;

-- For prototype purposes, disable RLS to make it easy to read/write from client
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;
ALTER TABLE imgbb_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE recharges DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS gmail_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email_prefix TEXT NOT NULL,
  password TEXT NOT NULL,
  reward NUMERIC DEFAULT 5,
  locked_by UUID REFERENCES auth.users(id),
  locked_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'locked', 'submitted', 'approved', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE gmail_tasks DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS recharge_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE recharge_offers DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS custom_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE custom_notifications DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS site_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  popup_enabled BOOLEAN DEFAULT false,
  popup_text TEXT,
  tutorial_url TEXT,
  review_url TEXT,
  telegram_url TEXT,
  global_notice TEXT
);

ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS global_notice TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS kyc_enabled BOOLEAN DEFAULT false;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS vip_tutorial_url TEXT;
ALTER TABLE site_settings ADD COLUMN IF NOT EXISTS gmail_tutorial_url TEXT;

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_kyc_verified BOOLEAN DEFAULT false;

INSERT INTO site_settings (popup_enabled, popup_text, tutorial_url, review_url, telegram_url, global_notice)
SELECT false, 'Welcome to BDPay!', 'https://youtube.com', 'https://play.google.com', 'https://t.me', ''
WHERE NOT EXISTS (SELECT 1 FROM site_settings);

-- Referrals and profiles
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT,
  name TEXT,
  number TEXT,
  my_referral_code TEXT UNIQUE,
  referred_by_code TEXT,
  total_referrals INTEGER DEFAULT 0,
  bonuses_claimed JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS number TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID REFERENCES auth.users(id),
  referred_user_id UUID REFERENCES auth.users(id) UNIQUE,
  reward_amount NUMERIC DEFAULT 15,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE referrals DISABLE ROW LEVEL SECURITY;

-- Function to ensure profile and handle referral signups
CREATE OR REPLACE FUNCTION ensure_user_profile(p_ref_code TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_my_code TEXT;
  v_referrer_id UUID;
  v_existing_ref UUID;
  v_reward NUMERIC := 15;
BEGIN
  -- Generate their own referral code if not exists
  v_my_code := UPPER(SUBSTRING(auth.uid()::text FROM 1 FOR 8));
  
  -- Insert profile if not exists
  INSERT INTO user_profiles (user_id, email, name, number, my_referral_code, referred_by_code)
  SELECT auth.uid(), auth.jwt()->>'email', auth.jwt()->'user_metadata'->>'name', auth.jwt()->'user_metadata'->>'number', v_my_code, p_ref_code
  WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid());

  -- If a referral code was passed, process it
  IF p_ref_code IS NOT NULL AND p_ref_code != '' THEN
    
    -- Check if referrer exists based on code
    SELECT user_id INTO v_referrer_id FROM user_profiles WHERE my_referral_code = UPPER(p_ref_code) AND user_id != auth.uid();
    
    IF v_referrer_id IS NOT NULL THEN
      -- Check if referral already recorded
      SELECT id INTO v_existing_ref FROM referrals WHERE referred_user_id = auth.uid();
      
      IF v_existing_ref IS NULL THEN
        -- Record the referral
        INSERT INTO referrals (referrer_id, referred_user_id, reward_amount) VALUES (v_referrer_id, auth.uid(), v_reward);
        
        -- Update referrer's total referrals
        UPDATE user_profiles SET total_referrals = total_referrals + 1 WHERE user_id = v_referrer_id;
        
        -- Reward referrer balance
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{balance}',
          to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + v_reward)
        )
        WHERE id = v_referrer_id;

        -- Reward the new referred user with 50 Taka if before 2027-01-01
        IF NOW() < '2027-01-01 00:00:00+06'::timestamp THEN
          UPDATE auth.users
          SET raw_user_meta_data = jsonb_set(
            COALESCE(raw_user_meta_data, '{}'::jsonb),
            '{balance}',
            to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + 50)
          )
          WHERE id = auth.uid();
        END IF;

      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to claim milestone bonuses
CREATE OR REPLACE FUNCTION claim_referral_bonus(p_milestone INTEGER, p_bonus NUMERIC)
RETURNS boolean AS $$
DECLARE
  v_profile user_profiles;
BEGIN
  SELECT * INTO v_profile FROM user_profiles WHERE user_id = auth.uid();
  
  IF v_profile.total_referrals >= p_milestone THEN
    IF NOT (v_profile.bonuses_claimed ? p_milestone::text) THEN
      
      -- Record bonus as claimed
      UPDATE user_profiles 
      SET bonuses_claimed = bonuses_claimed || jsonb_build_array(p_milestone::text)
      WHERE user_id = auth.uid();
      
      -- Credit balance
      UPDATE auth.users
      SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{balance}',
        to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + p_bonus)
      )
      WHERE id = auth.uid();
      
      RETURN true;
    END IF;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS device_fingerprints (
  fingerprint TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Backfill missing names and numbers from auth metadata
UPDATE user_profiles
SET 
  name = (SELECT raw_user_meta_data->>'name' FROM auth.users WHERE auth.users.id = user_profiles.user_id)
WHERE name IS NULL;

UPDATE user_profiles
SET 
  number = (SELECT raw_user_meta_data->>'phone' FROM auth.users WHERE auth.users.id = user_profiles.user_id)
WHERE number IS NULL;

ALTER TABLE device_fingerprints DISABLE ROW LEVEL SECURITY;

ALTER TABLE submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable Realtime
BEGIN;
  DROP PUBLICATION IF EXISTS supabase_realtime;
  CREATE PUBLICATION supabase_realtime;
COMMIT;
ALTER PUBLICATION supabase_realtime ADD TABLE support_chats, submissions, withdrawals, recharges;

CREATE OR REPLACE FUNCTION auto_process_pending_tasks(
  p_user_id UUID
) RETURNS void AS $$
DECLARE
  sub RECORD;
  rand NUMERIC;
  rand_hour NUMERIC;
BEGIN
  FOR sub IN
    SELECT s.id, t.reward 
    FROM submissions s
    JOIN tasks t ON s.task_id = t.id
    WHERE s.user_id = p_user_id 
      AND s.status = 'pending'
      AND t.task_type != 'gmail'
      AND EXTRACT(EPOCH FROM (NOW() - s.created_at))/3600 >= (1 + random() * 2)
    FOR UPDATE OF s SKIP LOCKED
  LOOP
    rand := random();
    IF rand <= 0.90 THEN
      UPDATE submissions SET status = 'approved', updated_at = NOW() WHERE id = sub.id;
      
      UPDATE auth.users
      SET raw_user_meta_data = jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{balance}',
        to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + sub.reward)
      )
      WHERE id = p_user_id;
    ELSE
      UPDATE submissions SET status = 'rejected', updated_at = NOW() WHERE id = sub.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION approve_gmail_task(
  p_task_id UUID,
  p_user_id UUID,
  p_reward NUMERIC
) RETURNS void AS $$
BEGIN
  -- Update task status
  UPDATE gmail_tasks SET status = 'approved' WHERE id = p_task_id;

  -- Add reward to user's auth metadata balance
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{balance}',
    to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + p_reward)
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION request_withdrawal(
  p_method TEXT,
  p_account TEXT,
  p_amount NUMERIC
) RETURNS void AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  -- Get user balance
  SELECT COALESCE((raw_user_meta_data->>'balance')::numeric, 0) INTO v_balance
  FROM auth.users WHERE id = auth.uid();

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient balance';
  END IF;

  -- Deduct balance
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{balance}',
    to_jsonb(v_balance - p_amount)
  )
  WHERE id = auth.uid();

  -- Insert withdrawal
  INSERT INTO withdrawals (user_id, amount, status)
  VALUES (auth.uid(), p_amount, 'pending_' || p_method || '_' || p_account);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION process_withdrawal(
  p_withdrawal_id UUID,
  p_action TEXT
) RETURNS void AS $$
DECLARE
  v_user_id UUID;
  v_amount NUMERIC;
  v_status TEXT;
  v_balance NUMERIC;
  v_parts TEXT[];
BEGIN
  SELECT user_id, amount, status INTO v_user_id, v_amount, v_status
  FROM withdrawals WHERE id = p_withdrawal_id;

  IF v_status NOT LIKE 'pending%' THEN
    RAISE EXCEPTION 'Withdrawal is not pending';
  END IF;

  v_parts := string_to_array(v_status, '_');
  
  -- Update status
  UPDATE withdrawals 
  SET status = p_action || '_' || COALESCE(v_parts[2], '') || '_' || COALESCE(v_parts[3], '')
  WHERE id = p_withdrawal_id;

  -- Refund if rejected
  IF p_action = 'rejected' THEN
    SELECT COALESCE((raw_user_meta_data->>'balance')::numeric, 0) INTO v_balance
    FROM auth.users WHERE id = v_user_id;

    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{balance}',
      to_jsonb(v_balance + v_amount)
    )
    WHERE id = v_user_id;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION admin_get_user_balance(p_user_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_bal NUMERIC;
BEGIN
  SELECT COALESCE((raw_user_meta_data->>'balance')::numeric, 0) INTO v_bal
  FROM auth.users WHERE id = p_user_id;
  RETURN v_bal;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION admin_get_user_referrals(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  referred_user_id UUID,
  reward_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE,
  email TEXT,
  name TEXT,
  balance NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id,
    r.referred_user_id,
    r.reward_amount,
    r.created_at,
    u.email::text,
    p.name::text,
    COALESCE((u.raw_user_meta_data->>'balance')::numeric, 0) AS balance
  FROM referrals r
  JOIN auth.users u ON u.id = r.referred_user_id
  JOIN user_profiles p ON p.user_id = r.referred_user_id
  WHERE r.referrer_id = p_user_id
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


CREATE OR REPLACE FUNCTION admin_update_user_balance(p_user_id UUID, p_amount NUMERIC)
RETURNS void AS $$
BEGIN
  UPDATE auth.users
  SET raw_user_meta_data = jsonb_set(
    COALESCE(raw_user_meta_data, '{}'::jsonb),
    '{balance}',
    to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + p_amount)
  )
  WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

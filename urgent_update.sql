-- 1. Add updated_at to recharges and submissions if missing
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE recharges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Fix Referral rewarding logic (referrer gets 15, new user gets 50)
CREATE OR REPLACE FUNCTION ensure_user_profile(p_ref_code TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_my_code TEXT;
  v_referrer_id UUID;
  v_existing_ref UUID;
  v_referrer_reward NUMERIC := 15; -- Referrer gets 15
  v_new_user_bonus NUMERIC := 50;  -- New user gets 50
BEGIN
  v_my_code := UPPER(SUBSTRING(auth.uid()::text FROM 1 FOR 8));
  
  INSERT INTO user_profiles (user_id, email, name, number, my_referral_code, referred_by_code)
  SELECT auth.uid(), auth.jwt()->>'email', auth.jwt()->'user_metadata'->>'name', auth.jwt()->'user_metadata'->>'number', v_my_code, p_ref_code
  WHERE NOT EXISTS (SELECT 1 FROM user_profiles WHERE user_id = auth.uid());

  IF p_ref_code IS NOT NULL AND p_ref_code != '' THEN
    SELECT user_id INTO v_referrer_id FROM user_profiles WHERE my_referral_code = UPPER(p_ref_code) AND user_id != auth.uid();
    
    IF v_referrer_id IS NOT NULL THEN
      SELECT id INTO v_existing_ref FROM referrals WHERE referred_user_id = auth.uid();
      
      IF v_existing_ref IS NULL THEN
        
        -- Insert referral record
        INSERT INTO referrals (referrer_id, referred_user_id, reward_amount) VALUES (v_referrer_id, auth.uid(), v_referrer_reward);
        
        -- 1. Referrer gets 15
        UPDATE user_profiles SET total_referrals = total_referrals + 1, balance = balance + v_referrer_reward WHERE user_id = v_referrer_id;
        
        -- Sync referrer balance to auth
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{balance}',
          to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + v_referrer_reward)
        )
        WHERE id = v_referrer_id;
        
        -- 2. New user gets 50
        UPDATE user_profiles SET balance = balance + v_new_user_bonus WHERE user_id = auth.uid();
        
        -- Sync new user balance to auth
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{balance}',
          to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + v_new_user_bonus)
        )
        WHERE id = auth.uid();

      END IF;
    END IF;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

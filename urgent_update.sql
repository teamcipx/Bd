-- 1. Add updated_at to recharges and submissions if missing
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE recharges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Disable auto approval
CREATE OR REPLACE FUNCTION auto_process_pending_tasks(
  p_user_id UUID
) RETURNS void AS $$
BEGIN
  -- Auto approval disabled
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Fix Referral rewarding logic (give 50 and 15 and sync auth metadata)
CREATE OR REPLACE FUNCTION ensure_user_profile(p_ref_code TEXT DEFAULT NULL)
RETURNS void AS $$
DECLARE
  v_my_code TEXT;
  v_referrer_id UUID;
  v_existing_ref UUID;
  v_reward NUMERIC := 15;
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
        -- "Reffar hoiye join hole 10 tarikher por 50 taka, er age hole 15 taka"
        IF NOW() >= '2026-06-10 00:00:00+06'::timestamp THEN
          v_reward := 50;
        ELSE
          v_reward := 15;
        END IF;

        INSERT INTO referrals (referrer_id, referred_user_id, reward_amount) VALUES (v_referrer_id, auth.uid(), v_reward);
        UPDATE user_profiles SET total_referrals = total_referrals + 1, balance = balance + v_reward WHERE user_id = v_referrer_id;
        
        -- Sync referrer balance to auth
        UPDATE auth.users
        SET raw_user_meta_data = jsonb_set(
          COALESCE(raw_user_meta_data, '{}'::jsonb),
          '{balance}',
          to_jsonb(COALESCE((raw_user_meta_data->>'balance')::numeric, 0) + v_reward)
        )
        WHERE id = v_referrer_id;
        
        -- Bonus for joining by referral
        UPDATE user_profiles SET balance = balance + 50 WHERE user_id = auth.uid();
        
        -- Sync referred user balance to auth
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION do_fix_balances() RETURNS void AS $$
DECLARE
  prof RECORD;
  v_task_reward NUMERIC;
  v_gmail_reward NUMERIC;
  v_referral_reward NUMERIC;
  v_referred_bonus NUMERIC;
  v_withdrawal NUMERIC;
  v_total_balance NUMERIC;
BEGIN
  -- Re-adjust Referral Rewards logic
  -- "Reffar hoiye join hole 10 tarikher por 50 taka, er age hole 15 taka"
  UPDATE referrals
  SET reward_amount = CASE 
    WHEN created_at >= '2026-06-10 00:00:00+06'::timestamp THEN 50 
    ELSE 15 
  END;

  -- Recalculate for every user
  FOR prof IN SELECT user_id FROM user_profiles LOOP
    
    -- Approved Regular Tasks
    SELECT COALESCE(SUM(t.reward), 0) INTO v_task_reward
    FROM submissions s
    JOIN tasks t ON s.task_id = t.id
    WHERE s.user_id = prof.user_id AND s.status = 'approved' AND t.task_type != 'gmail';

    -- Approved Gmail Tasks
    SELECT COALESCE(SUM(reward), 0) INTO v_gmail_reward
    FROM gmail_tasks
    WHERE locked_by = prof.user_id AND status = 'approved';

    -- Referral signups they brought in (as referrer)
    SELECT COALESCE(SUM(reward_amount), 0) INTO v_referral_reward
    FROM referrals
    WHERE referrer_id = prof.user_id;

    -- Joining bonus (If they signed up using someone's referral code)
    SELECT COALESCE(SUM(50), 0) INTO v_referred_bonus
    FROM referrals 
    WHERE referred_user_id = prof.user_id;

    -- Deduct Withdrawals (Pending or Paid - anything not rejected)
    SELECT COALESCE(SUM(amount), 0) INTO v_withdrawal
    FROM withdrawals
    WHERE user_id = prof.user_id AND status NOT LIKE 'rejected%';

    -- Equation: (Tasks) + (Gmail Tasks) + (Referred Others) + (Referred Bonus) - (Withdrawals) + 50 Extra
    v_total_balance := v_task_reward + v_gmail_reward + v_referral_reward + v_referred_bonus - v_withdrawal + 50;
    
    IF v_total_balance < 0 THEN 
      v_total_balance := 0; 
    END IF;

    -- Update the core profile table
    UPDATE user_profiles
    SET balance = v_total_balance
    WHERE user_id = prof.user_id;

    -- Update auth metadata config to keep frontend synced
    UPDATE auth.users
    SET raw_user_meta_data = jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{balance}',
      to_jsonb(v_total_balance)
    )
    WHERE id = prof.user_id;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- THIS EXACT LINE RUNS THE FUNCTION (Previously was missing)
SELECT do_fix_balances();

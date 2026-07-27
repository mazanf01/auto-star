-- Fix: duplicate active credentials (run in Supabase SQL Editor)

-- Step 1: Set ALL to false first
UPDATE star_credentials SET is_active = false;

-- Step 2: Set only the most recent per user as active
UPDATE star_credentials sc
SET is_active = true
WHERE sc.id IN (
  SELECT DISTINCT ON (user_id) id
  FROM star_credentials
  ORDER BY user_id, saved_at DESC
);

-- Step 3: Verify (should show 1 active per user)
SELECT user_id, COUNT(*) FILTER (WHERE is_active) AS active_count
FROM star_credentials
GROUP BY user_id
HAVING COUNT(*) FILTER (WHERE is_active) > 1;
-- Should return 0 rows

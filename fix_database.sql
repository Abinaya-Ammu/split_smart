USE splitsmart_v2;
UPDATE users SET role = 'USER' WHERE role IS NULL;
UPDATE users SET reward_points = 0 WHERE reward_points IS NULL;
UPDATE users SET zero_debt_streak = 0 WHERE zero_debt_streak IS NULL;
UPDATE users SET is_active = true WHERE is_active IS NULL;
UPDATE users SET preferred_language = 'ENGLISH' WHERE preferred_language IS NULL;
SELECT id, name, email, role FROM users;

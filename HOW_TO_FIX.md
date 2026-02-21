# SplitSmart — Fix Everything in Order

## Step 1: Fix the Database (run once)

Open MySQL Workbench and run this SQL:
```sql
USE splitsmart_db;
UPDATE users SET role = 'USER' WHERE role IS NULL;
UPDATE users SET reward_points = 0 WHERE reward_points IS NULL;
UPDATE users SET zero_debt_streak = 0 WHERE zero_debt_streak IS NULL;
UPDATE users SET is_active = true WHERE is_active IS NULL;
UPDATE users SET preferred_language = 'ENGLISH' WHERE preferred_language IS NULL;
```

## Step 2: Update application.properties

Replace your `src/main/resources/application.properties`:
- Set `spring.datasource.password=` to your actual MySQL root password
- The mail line `spring.autoconfigure.exclude=...MailSenderAutoConfiguration` is CRITICAL
  — it prevents the app crashing because you don't have a real email configured

## Step 3: Restart the Spring Boot backend

```bash
# In IntelliJ: click the green Run button
# OR in terminal:
./mvnw spring-boot:run
```

Watch the console — it should say "Started SplitsmartBackendApplication in X seconds"
If it crashes, check the error. Common causes:
- Wrong MySQL password → fix spring.datasource.password
- Port 8080 in use → kill the old process first

## Step 4: Replace frontend src/

Extract the ZIP and replace your entire `src/` folder, then:
```bash
npm start
```

## Step 5: Test in order

1. Open http://localhost:3000/register
2. Fill in name, email, password → click "Create account"
   - Open browser DevTools (F12) → Console tab
   - You should see: `← 201 /auth/register` with a token
3. You'll be redirected to Dashboard
4. Click Groups → "+ New Group" → fill name → "Create Group"
   - Console should show `← 201 /groups`
5. Click the group → "+ Add Expense"
   - Add members first if group is empty

## What was wrong

| Problem | Root Cause | Fix |
|---------|-----------|-----|
| "Something went wrong" on ALL actions | Mail auto-config crashed Spring Boot at startup because `your_email@gmail.com` placeholder caused `JavaMailSender` bean to fail, making every request crash | Added `spring.autoconfigure.exclude` to disable mail until configured |
| Can't login after register | `register()` saved user with NULL `role` → `loadUserByUsername` called `user.getRole().name()` → NPE | Fixed `register()` to always set `role=USER`, `rewardPoints=0` etc |
| Groups show "something went wrong" | Same mail startup crash | Fixed by disabling mail auto-config |
| Add expense fails | Backend needed `participantIds` as actual member IDs from DB | Fixed frontend to always load members and pass their IDs |

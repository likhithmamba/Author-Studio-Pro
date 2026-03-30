



-- Production Row Level Security (RLS) Setup for Supabase
-- Run these commands in your Supabase SQL Editor to secure your database before launch.

-- 1. Enable Row Level Security
ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."subscriptions" ENABLE ROW LEVEL SECURITY;

-- 2. Prevent Anonymous or Authenticated User Access to 'users' table 
-- Since your FastAPI application handles user creation and database queries securely 
-- using the SUPABASE_SERVICE_ROLE_KEY (which inherently bypasses RLS), you want to 
-- ensure NO frontend user can directly query this table via the public Anon Key.
CREATE POLICY "Deny Public Access to Users" ON "public"."users" 
FOR ALL TO public USING (false);

-- 3. Prevent Anonymous or Authenticated User Access to 'subscriptions' table
CREATE POLICY "Deny Public Access to Subscriptions" ON "public"."subscriptions" 
FOR ALL TO public USING (false);

-- You're all set! The backend service role will still be able to insert and select,
-- but a malicious user on the frontend cannot bypass your backend to fetch 
-- unauthorized subscription data.

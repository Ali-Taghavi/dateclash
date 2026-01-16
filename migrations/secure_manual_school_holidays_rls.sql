-- Secure manual_school_holidays table with Row Level Security (RLS)
-- This prevents direct database access from browser/client-side code
-- Only service_role (backend/API) can access this table

-- Enable RLS on the table
ALTER TABLE manual_school_holidays ENABLE ROW LEVEL SECURITY;

-- Revoke SELECT permission from anon and authenticated roles
-- This prevents any client-side queries from accessing the table
REVOKE SELECT ON manual_school_holidays FROM anon;
REVOKE SELECT ON manual_school_holidays FROM authenticated;

-- Drop any existing policies first (if they exist)
DROP POLICY IF EXISTS "Only service_role can read manual_school_holidays" ON manual_school_holidays;

-- Create a policy that denies all access (service_role bypasses RLS anyway)
-- This ensures that even if someone tries to use anon/authenticated roles, they're blocked
-- Note: service_role bypasses RLS by default, so it can still access the table
CREATE POLICY "Deny all except service_role"
  ON manual_school_holidays
  FOR SELECT
  USING (false); -- This denies all access via RLS (service_role bypasses this)

-- Optional: Add a comment to document the security policy
COMMENT ON TABLE manual_school_holidays IS 'Protected table: Only accessible via service_role (backend API). Client-side queries are blocked. RLS denies all, but service_role bypasses RLS.';

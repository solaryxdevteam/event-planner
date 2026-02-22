-- =============================================
-- Enable Row Level Security (RLS) on Public Tables
-- =============================================
-- Resolves Supabase Security Advisor findings:
-- - rls_disabled_in_public (tables in public schema without RLS)
-- - sensitive_columns_exposed (tables with token/sensitive columns without RLS)
--
-- Tables with token/sensitive columns (dj_contact_verifications,
-- venue_contact_verifications, invitations): RLS enabled, NO policies.
-- Access only via service_role in app (public verify + register flows).
--
-- All other tables: RLS enabled + allow_authenticated_all so server-side
-- createClient() (user JWT) keeps working; unauthenticated API access blocked.
-- =============================================

-- 1) Enable RLS on all tables
DO $$
DECLARE
  t text;
  all_tables text[] := ARRAY[
    'venues', 'invitations', 'venue_approvals', 'venue_contact_verifications',
    'events', 'locations', 'event_versions', 'templates', 'event_approvals',
    'reports', 'audit_logs', 'approval_configs', 'users', 'verification_otps',
    'djs', 'marketing_reports', 'user_email_verification_otps', 'dj_contact_verifications'
  ];
BEGIN
  FOREACH t IN ARRAY all_tables
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      t
    );
  END LOOP;
END $$;

-- 2) Token tables: no policies (only service_role can access)
--    dj_contact_verifications, venue_contact_verifications, invitations
--    are already RLS-enabled above; no policy = anon/authenticated get no access.

-- 3) Other tables: allow authenticated users full access
DO $$
DECLARE
  t text;
  tables_with_policy text[] := ARRAY[
    'venues', 'venue_approvals', 'events', 'locations', 'event_versions',
    'templates', 'event_approvals', 'reports', 'audit_logs', 'approval_configs',
    'users', 'verification_otps', 'djs', 'marketing_reports', 'user_email_verification_otps'
  ];
BEGIN
  FOREACH t IN ARRAY tables_with_policy
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS "allow_authenticated_all" ON public.%I',
      t
    );
    EXECUTE format(
      'CREATE POLICY "allow_authenticated_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t
    );
  END LOOP;
END $$;

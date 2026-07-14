-- ============================================================================
-- 00020_secure_profile_updates.sql
-- Fix C1: "Users can update own profile" (00008) has no WITH CHECK, so a client
-- could change ANY column of its own row -> child->parent privilege escalation,
-- arbitrary points_balance, and family switching.
--
-- Strategy (defense in depth):
--   1) Column-level UPDATE grants: the `authenticated` role may only update a
--      safe subset of columns. points_balance / email / id / timestamps become
--      non-updatable by any client. SECURITY DEFINER reward/redemption triggers
--      run as the table owner and are NOT affected by column grants.
--   2) A BEFORE UPDATE guard trigger enforces the state-dependent rules for the
--      columns that must remain grantable for onboarding:
--        - role: settable only while the user has no family yet; locked after.
--        - family_id: settable once (first join), never switched from the client.
--      The guard runs with INVOKER rights so `current_user` reflects the real
--      caller ('authenticated' for the app, the table owner for definer triggers).
--
-- Apply in the Supabase SQL Editor, then run the verification checklist below.
-- ============================================================================

-- 1) Restrict which columns the app role may update --------------------------
REVOKE UPDATE ON public.profiles FROM authenticated, anon;
GRANT UPDATE (display_name, avatar_url, expo_push_token, locale, family_id, role)
  ON public.profiles TO authenticated;

-- 2) State-dependent guard for role / family_id / points_balance -------------
CREATE OR REPLACE FUNCTION public.enforce_profile_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  -- Enforce only for direct client updates. SECURITY DEFINER triggers/functions
  -- (rewards, redemption, admin RPCs) run as the table owner and must pass.
  IF current_user IN ('authenticated', 'anon') THEN
    -- points_balance is managed exclusively by server-side triggers.
    IF NEW.points_balance IS DISTINCT FROM OLD.points_balance THEN
      RAISE EXCEPTION 'points_balance cannot be modified by the client';
    END IF;

    -- role is chosen during onboarding (no family yet) and locked afterwards.
    IF NEW.role IS DISTINCT FROM OLD.role AND OLD.family_id IS NOT NULL THEN
      RAISE EXCEPTION 'role cannot be changed once the user belongs to a family';
    END IF;

    -- family_id may be set on first join but never switched from the client.
    IF NEW.family_id IS DISTINCT FROM OLD.family_id AND OLD.family_id IS NOT NULL THEN
      RAISE EXCEPTION 'family_id cannot be changed by the client';
    END IF;

    -- email / id are immutable from the app.
    IF NEW.email IS DISTINCT FROM OLD.email THEN
      RAISE EXCEPTION 'email cannot be changed by the client';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_update_guard ON public.profiles;
CREATE TRIGGER trg_enforce_profile_update_guard
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_profile_update_guard();

-- ============================================================================
-- Verification checklist (as a CHILD account, through the app or anon+JWT):
--   [denied] update profiles set role='parent'        where id = auth.uid();
--   [denied] update profiles set points_balance=99999 where id = auth.uid();
--   [denied] update profiles set family_id='<other>'  where id = auth.uid();
--   [ ok   ] update profiles set display_name='X', locale='en' where id=auth.uid();
--   [ ok   ] approving a mission still credits points  (reward trigger).
--   [ ok   ] redeeming a gift still debits points      (redemption trigger).
--   [ ok   ] parent create/join family still sets family_id the first time.
-- ============================================================================

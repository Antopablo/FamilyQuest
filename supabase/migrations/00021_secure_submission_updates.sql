-- ============================================================================
-- 00021_secure_submission_updates.sql
-- Fix C2: children could self-approve their own mission submissions.
--
-- "Children can update own submissions" (00017) is a USING-only UPDATE policy
-- (no column/status restriction), and the SECURITY DEFINER trigger
-- on_submission_approved credits points on status -> 'approved'. A child could
-- therefore run `update mission_submissions set status='approved' where id=<own>`
-- and grant themselves points without any parent validation.
--
-- Guard: a BEFORE UPDATE trigger that, for non-parent callers, only allows the
-- legitimate child transition 'claimed' -> 'pending' and forbids setting an
-- approved/rejected status or any validation metadata. Parents and the
-- SECURITY DEFINER server code (which runs as the table owner) are unaffected.
-- The guard runs with INVOKER rights so `current_user` reflects the real caller.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.enforce_submission_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon')
     AND public.user_role() IS DISTINCT FROM 'parent' THEN
    -- Non-parent (child): may only submit a claimed mission for validation.
    IF NEW.status IS DISTINCT FROM OLD.status
       AND NOT (OLD.status = 'claimed' AND NEW.status = 'pending') THEN
      RAISE EXCEPTION 'validation is parent-only: a child may only move a claimed mission to pending';
    END IF;
    -- Non-parent cannot set validation metadata.
    IF NEW.validated_by IS DISTINCT FROM OLD.validated_by
       OR NEW.validated_at IS DISTINCT FROM OLD.validated_at THEN
      RAISE EXCEPTION 'children cannot set validation fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_submission_update_guard ON public.mission_submissions;
CREATE TRIGGER trg_enforce_submission_update_guard
  BEFORE UPDATE ON public.mission_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_submission_update_guard();

-- ============================================================================
-- Verification checklist:
--   [denied] child: update mission_submissions set status='approved' ...
--   [denied] child: update mission_submissions set status='rejected' ...
--   [ ok   ] child: update mission_submissions set status='pending' (from claimed)
--   [ ok   ] parent: update ... set status='approved' -> reward trigger credits points
-- ============================================================================

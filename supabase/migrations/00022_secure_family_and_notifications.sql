-- ============================================================================
-- 00022_secure_family_and_notifications.sql
-- Fix M1: families were world-readable ("Anyone can view family by invite code"
--         USING (true)), leaking every family's name + invite_code and enabling
--         child-email enumeration via get_child_email.
-- Fix M2: notifications had an INSERT policy WITH CHECK (true), letting any user
--         send a notification to anyone (phishing / spam).
-- ============================================================================

-- ---- M1: families -----------------------------------------------------------
-- Remove the blanket SELECT policy that exposed all families.
DROP POLICY IF EXISTS "Anyone can view family by invite code" ON public.families;

-- Creators still need to read the row they just inserted (INSERT ... RETURNING),
-- before their profile.family_id is set.
DROP POLICY IF EXISTS "Creators can view their family" ON public.families;
CREATE POLICY "Creators can view their family" ON public.families
  FOR SELECT USING (created_by = auth.uid());

-- Controlled lookup by invite code for the "join a family" flow: returns only
-- the family matching the exact code, instead of exposing the whole table.
CREATE OR REPLACE FUNCTION public.get_family_by_invite_code(code text)
RETURNS public.families
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT * FROM public.families WHERE invite_code = upper(code) LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.get_family_by_invite_code(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_family_by_invite_code(text) TO authenticated;

-- ---- M2: notifications ------------------------------------------------------
-- Replace the "anyone can insert any notification" policy with one that only
-- allows creating notifications inside the sender's own family, for a recipient
-- who is a member of that same family.
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;
CREATE POLICY "Family members can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    family_id = public.get_my_family_id()
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = recipient_id
        AND p.family_id = public.get_my_family_id()
    )
  );

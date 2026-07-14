-- ============================================================================
-- 00023_harden_update_child_password.sql
-- Fix M3: harden the update_child_password SECURITY DEFINER function.
--   * SET search_path = '' + schema-qualify every name (crypt/gen_salt live in
--     the `extensions` schema). This removes the function_search_path_mutable
--     advisor warning and prevents search_path injection against a function that
--     hashes passwords and writes to auth.users.
--   * Enforce the minimum password length server-side (the client check
--     `password.length < 6` can be bypassed by calling the RPC directly).
--   * Use IS DISTINCT FROM so a caller/child with a NULL role/family can never
--     slip past the authorization checks.
--
-- Writing auth.users.encrypted_password directly is a deliberate choice for this
-- backend-less app; bcrypt hashes are compatible with Supabase Auth (GoTrue).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_child_password(child_id uuid, new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  caller_role text;
  caller_family uuid;
  child_family uuid;
BEGIN
  -- Password policy (mirror of the client-side minimum, enforced server-side).
  IF new_password IS NULL OR length(new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters';
  END IF;

  -- Caller must be a parent.
  SELECT role, family_id INTO caller_role, caller_family
  FROM public.profiles WHERE id = auth.uid();

  IF caller_role IS DISTINCT FROM 'parent' THEN
    RAISE EXCEPTION 'Only parents can change child passwords';
  END IF;

  -- Target must be a child in the caller's family.
  SELECT family_id INTO child_family
  FROM public.profiles WHERE id = child_id AND role = 'child';

  IF child_family IS NULL OR child_family IS DISTINCT FROM caller_family THEN
    RAISE EXCEPTION 'Child not found in your family';
  END IF;

  -- Update the password (bcrypt, compatible with Supabase Auth / GoTrue).
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf'))
  WHERE id = child_id;
END;
$$;

-- ============================================================================
-- 00025_harden_function_search_paths.sql
-- Clear the remaining `function_search_path_mutable` advisors: pin an empty
-- search_path on the 10 remaining functions and fully-qualify every object
-- reference, so a mutable search_path can't be used to hijack a SECURITY DEFINER
-- function. Behaviour is unchanged (pg_catalog is always implicitly in scope;
-- enum literals are coerced from the target column/variable type, not by name).
-- ============================================================================

-- Helpers (SECURITY DEFINER, STABLE) -----------------------------------------
CREATE OR REPLACE FUNCTION public.get_my_family_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT family_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.user_family_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT family_id FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT role::text FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.user_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT role::text FROM public.profiles WHERE id = auth.uid() $$;

CREATE OR REPLACE FUNCTION public.get_child_email(child_name text, family_invite_code text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.email FROM public.profiles p
  JOIN public.families f ON f.id = p.family_id
  WHERE TRIM(p.display_name) = TRIM(child_name)
    AND p.role = 'child'
    AND f.invite_code = family_invite_code
  LIMIT 1
$$;

-- generate_invite_code (INVOKER) ---------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS text LANGUAGE plpgsql SET search_path = ''
AS $$
DECLARE
  code text;
  exists_already boolean;
BEGIN
  LOOP
    code := upper(substr(md5(random()::text), 1, 6));
    SELECT EXISTS(SELECT 1 FROM public.families WHERE invite_code = code) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN code;
END;
$$;

-- remove_child_from_family (DEFINER) -----------------------------------------
CREATE OR REPLACE FUNCTION public.remove_child_from_family(child_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  caller_role text;
  caller_family_id uuid;
  child_family_id uuid;
BEGIN
  SELECT role, family_id INTO caller_role, caller_family_id
  FROM public.profiles WHERE id = auth.uid();

  IF caller_role IS DISTINCT FROM 'parent' THEN
    RAISE EXCEPTION 'Only parents can remove children';
  END IF;

  SELECT family_id INTO child_family_id FROM public.profiles WHERE id = child_id;

  IF child_family_id IS NULL OR child_family_id IS DISTINCT FROM caller_family_id THEN
    RAISE EXCEPTION 'Child is not in your family';
  END IF;

  UPDATE public.profiles SET family_id = NULL WHERE id = child_id;
END;
$$;

-- Triggers -------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE OR REPLACE FUNCTION public.on_gift_redeemed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF new.status = 'redeemed' AND old.status = 'approved' THEN
    IF (SELECT points_balance FROM public.profiles WHERE id = new.child_id) < new.points_cost THEN
      RAISE EXCEPTION 'Insufficient points balance';
    END IF;
    UPDATE public.profiles SET points_balance = points_balance - new.points_cost WHERE id = new.child_id;
    INSERT INTO public.transactions (family_id, child_id, amount, type, reference_id, description)
    VALUES (new.family_id, new.child_id, - new.points_cost, 'gift_redemption', new.id, new.title);
    new.redeemed_at = now();
  END IF;
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.on_submission_approved()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  mission_points integer;
  mission_title text;
BEGIN
  IF new.status = 'approved' AND (old.status = 'pending' OR old.status = 'claimed') THEN
    SELECT points_reward, title INTO mission_points, mission_title
    FROM public.missions WHERE id = new.mission_id;
    UPDATE public.profiles SET points_balance = points_balance + mission_points WHERE id = new.child_id;
    INSERT INTO public.transactions (family_id, child_id, amount, type, reference_id, description)
    VALUES (new.family_id, new.child_id, mission_points, 'mission_reward', new.id, mission_title);
  END IF;
  RETURN new;
END;
$$;

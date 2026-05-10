-- ============================================================
-- Splitkar! — Group management RPCs
-- All functions are SECURITY DEFINER so they bypass RLS and
-- can perform atomic multi-table operations as a unit.
-- auth.uid() still reflects the calling user's session JWT.
-- ============================================================

-- ----------------------------------------------------------------
-- create_group_with_creator
-- Atomically: INSERT group + INSERT admin member + INSERT activity
-- Returns the new group UUID.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION create_group_with_creator(
  p_name        TEXT,
  p_description TEXT    DEFAULT NULL,
  p_currency    TEXT    DEFAULT 'INR',
  p_avatar_url  TEXT    DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_user_id  UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  INSERT INTO public.groups (name, description, currency, avatar_url, created_by)
  VALUES (p_name, p_description, p_currency, p_avatar_url, v_user_id)
  RETURNING id INTO v_group_id;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'admin');

  INSERT INTO public.activities (group_id, actor_id, type, payload)
  VALUES (v_group_id, v_user_id, 'group_created',
          jsonb_build_object('group_name', p_name));

  RETURN v_group_id;
END;
$$;

-- ----------------------------------------------------------------
-- get_group_preview_by_code
-- Returns a group preview for non-members (used in join screen).
-- Bypasses the "member read" RLS on groups so any authenticated
-- user can look up a group by invite code before joining.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_group_preview_by_code(p_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group        public.groups;
  v_member_count BIGINT;
  v_already      BOOLEAN;
BEGIN
  SELECT * INTO v_group
  FROM public.groups
  WHERE invite_code = upper(trim(p_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  SELECT COUNT(*) INTO v_member_count
  FROM public.group_members
  WHERE group_id = v_group.id;

  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = v_group.id AND user_id = auth.uid()
  ) INTO v_already;

  RETURN json_build_object(
    'id',             v_group.id,
    'name',           v_group.name,
    'avatar_url',     v_group.avatar_url,
    'currency',       v_group.currency,
    'member_count',   v_member_count,
    'already_member', v_already
  );
END;
$$;

-- ----------------------------------------------------------------
-- join_group_by_code
-- Validates invite code, inserts member row + activity.
-- Raises 'invalid_code' or 'already_member' as structured errors.
-- Returns the group UUID so the caller can navigate to it.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION join_group_by_code(p_code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group_id UUID;
  v_user_id  UUID := auth.uid();
  v_already  BOOLEAN;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT id INTO v_group_id
  FROM public.groups
  WHERE invite_code = upper(trim(p_code));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid_code';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = v_group_id AND user_id = v_user_id
  ) INTO v_already;

  IF v_already THEN
    RAISE EXCEPTION 'already_member' USING HINT = v_group_id::TEXT;
  END IF;

  INSERT INTO public.group_members (group_id, user_id, role)
  VALUES (v_group_id, v_user_id, 'member');

  INSERT INTO public.activities (group_id, actor_id, type, payload)
  VALUES (v_group_id, v_user_id, 'member_joined', '{}');

  RETURN v_group_id;
END;
$$;

-- ----------------------------------------------------------------
-- leave_group
-- Removes the caller from a group, logs the activity.
-- Blocks if the caller is the last admin.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION leave_group(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id    UUID    := auth.uid();
  v_role       TEXT;
  v_admin_cnt  BIGINT;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  SELECT role INTO v_role
  FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'not_a_member';
  END IF;

  IF v_role = 'admin' THEN
    SELECT COUNT(*) INTO v_admin_cnt
    FROM public.group_members
    WHERE group_id = p_group_id AND role = 'admin';

    IF v_admin_cnt = 1 THEN
      RAISE EXCEPTION 'last_admin';
    END IF;
  END IF;

  DELETE FROM public.group_members
  WHERE group_id = p_group_id AND user_id = v_user_id;

  INSERT INTO public.activities (group_id, actor_id, type, payload)
  VALUES (p_group_id, v_user_id, 'member_left', '{}');
END;
$$;

-- ----------------------------------------------------------------
-- delete_group
-- Hard-deletes a group (admin only). Cascade handles children.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION delete_group(p_group_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'not_authenticated';
  END IF;

  IF NOT is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  DELETE FROM public.groups WHERE id = p_group_id;
END;
$$;

-- ----------------------------------------------------------------
-- regenerate_invite_code
-- Generates a fresh 8-char hex invite code for a group (admin only).
-- Returns the new code so the client can display it immediately.
-- ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION regenerate_invite_code(p_group_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_code TEXT;
BEGIN
  IF NOT is_group_admin(p_group_id) THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  v_new_code := upper(encode(gen_random_bytes(4), 'hex'));

  UPDATE public.groups
  SET invite_code = v_new_code
  WHERE id = p_group_id;

  RETURN v_new_code;
END;
$$;

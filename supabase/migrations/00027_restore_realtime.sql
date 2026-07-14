-- ============================================================================
-- 00027_restore_realtime.sql
-- Fix: the `supabase_realtime` publication was empty, so postgres_changes
-- delivered nothing and the app (hooks/useRealtime.ts) stopped receiving live
-- updates for missions / mission_submissions / gifts / profiles.
--
-- The app subscribes with a `family_id=eq.<id>` filter on '*' events, so the
-- tables also need REPLICA IDENTITY FULL — otherwise UPDATE/DELETE events carry
-- only the primary key in the old tuple and can't be matched against the filter.
-- ============================================================================

ALTER TABLE public.missions            REPLICA IDENTITY FULL;
ALTER TABLE public.mission_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.gifts               REPLICA IDENTITY FULL;
ALTER TABLE public.profiles            REPLICA IDENTITY FULL;
ALTER TABLE public.notifications       REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE
  public.missions,
  public.mission_submissions,
  public.gifts,
  public.profiles,
  public.notifications;

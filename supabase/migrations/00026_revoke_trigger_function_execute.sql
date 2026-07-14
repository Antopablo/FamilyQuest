-- ============================================================================
-- 00026_revoke_trigger_function_execute.sql
-- Trigger functions are invoked by the trigger mechanism, never by clients, so
-- they don't need an EXECUTE grant. Revoking it removes them from the PostgREST
-- RPC surface (/rest/v1/rpc/...) and clears the *_security_definer_function_
-- executable advisors for the reward/redemption triggers. Triggers keep firing
-- normally (EXECUTE is not required for trigger invocation).
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.on_submission_approved()        FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_gift_redeemed()             FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at()            FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_profile_update_guard() FROM public, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_submission_update_guard() FROM public, anon, authenticated;

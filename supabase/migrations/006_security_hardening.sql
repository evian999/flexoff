-- Supabase Database Linter fixes (2026-05):
-- 1. user_preferences — RLS disabled in public
-- 2. replace_user_app_data — SECURITY DEFINER callable by anon / authenticated
--
-- 与 001_app_relational.sql 策略一致：客户端角色不可访问，仅 service_role 读写。

-- ── user_preferences ──────────────────────────────────────────────────────

alter table public.user_preferences enable row level security;

revoke all on table public.user_preferences from public;
revoke all on table public.user_preferences from anon;
revoke all on table public.user_preferences from authenticated;

grant all on table public.user_preferences to service_role;

-- ── replace_user_app_data RPC ─────────────────────────────────────────────

revoke all on function public.replace_user_app_data (text, jsonb) from public;
revoke all on function public.replace_user_app_data (text, jsonb) from anon;
revoke all on function public.replace_user_app_data (text, jsonb) from authenticated;

grant execute on function public.replace_user_app_data (text, jsonb) to service_role;

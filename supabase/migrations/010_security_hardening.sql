-- 보안 하드닝 — Supabase 어드바이저 WARN 정리 (2026-08-19).
--
-- 1) search_path 고정: SECURITY DEFINER/트리거 함수가 호출자의 search_path를
--    물려받으면 악의적 스키마 섀도잉이 가능하다. 전부 public으로 고정한다.
--    (함수 본문은 이미 스키마 한정 참조라 동작 변화 없음)
-- 2) 트리거 전용 함수의 API 실행권 회수: handle_new_user / update_updated_at_column은
--    트리거로만 돌아야 하는데 /rest/v1/rpc/* 로 노출돼 있었다. 트리거는 REVOKE 후에도
--    정상 동작한다 (트리거 실행은 호출 롤의 EXECUTE 권한을 요구하지 않음).
-- 3) delete_user는 auth.uid() 없으면 예외라 anon 호출이 무해하지만, anon 실행권은
--    회수한다 (로그인 사용자의 계정 삭제 기능은 유지).
--
-- 의도적으로 유지: validate_referral_code / record_referral_credit /
-- use_referral_credit / increment_share_view — 프런트가 호출하는 RPC.

-- 1) search_path 고정
ALTER FUNCTION public.handle_new_user() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.validate_referral_code(p_code text) SET search_path = public;
ALTER FUNCTION public.record_referral_credit(p_code text) SET search_path = public;
ALTER FUNCTION public.use_referral_credit(p_user_id uuid) SET search_path = public;
ALTER FUNCTION public.increment_share_view(share_id uuid) SET search_path = public;

-- 2) 트리거 전용 함수 API 노출 차단
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- 3) 계정 삭제는 로그인 사용자만
--    (기본 PUBLIC grant가 anon을 덮으므로 PUBLIC부터 회수하고 필요한 롤에 재부여)
REVOKE EXECUTE ON FUNCTION public.delete_user() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_user() TO authenticated, service_role;

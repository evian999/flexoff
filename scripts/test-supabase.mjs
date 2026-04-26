/**
 * 本地探活：验证 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY 是否可达。
 * 用法（PowerShell）:
 *   $env:SUPABASE_URL="https://<ref>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role>"
 *   node scripts/test-supabase.mjs
 * 或 Node 20+:
 *   node --env-file=.env.local scripts/test-supabase.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error(
    "缺少环境变量: 请设置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const sb = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data, error } = await sb.from("folders").select("id").limit(1);

if (error) {
  console.error("Supabase 查询失败:", error.message);
  if (error.code) console.error("code:", error.code);
  if (error.details) console.error("details:", error.details);
  if (error.hint) console.error("hint:", error.hint);
  process.exit(2);
}

console.log("ok: 已连上 Supabase，folders 样例查询通过");
console.log("行数:", data?.length ?? 0, "(仅 limit 1)");

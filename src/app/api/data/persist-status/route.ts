import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionCookieValue, verifySessionToken } from "@/lib/session";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import { emptyAppData } from "@/lib/types";
import { sanitizeAppDataForPersistence } from "@/lib/validate";

const PROBE_USER_ID = "__flex_off_persist_probe__";

async function getUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = readSessionCookieValue((name) => jar.get(name));
  if (!token) return null;
  try {
    const { sub } = await verifySessionToken(token);
    return sub;
  } catch {
    return null;
  }
}

/** 登录后可访问：探测 Supabase RPC / 表结构是否正常（不会读写真实用户数据） */
export async function GET() {
  const userId = await getUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      backend: "not_supabase",
      hint: "Vercel 未配置 SUPABASE_URL 与 SUPABASE_SERVICE_ROLE_KEY，保存只会走内存/Redis",
    });
  }

  const sb = getSupabaseAdmin();
  if (!sb) {
    return NextResponse.json({
      ok: false,
      backend: "supabase_misconfigured",
      hint: "Supabase 客户端初始化失败，请检查环境变量",
    });
  }

  type CheckResult = { ok: boolean; message?: string; code?: string; hint?: string } | null;

  const checks: Record<string, CheckResult> = {
    foldersSelect: null,
    tasksMentionsColumn: null,
    rpcReplace: null,
  };

  const { error: folderErr } = await sb.from("folders").select("id").limit(1);
  checks.foldersSelect = folderErr
    ? { ok: false, message: folderErr.message, code: folderErr.code }
    : { ok: true };

  const { error: mentionsErr } = await sb
    .from("tasks")
    .select("mentions")
    .limit(0);
  checks.tasksMentionsColumn = mentionsErr
    ? {
        ok: false,
        message: mentionsErr.message,
        code: mentionsErr.code,
        hint: "请在 Supabase SQL Editor 执行 004、005 或 supabase/FIX_SAVE_503.sql",
      }
    : { ok: true };

  const probePayload = JSON.parse(
    JSON.stringify(sanitizeAppDataForPersistence(emptyAppData())),
  ) as Record<string, unknown>;

  const { error: rpcErr } = await sb.rpc("replace_user_app_data", {
    p_user_id: PROBE_USER_ID,
    p_data: probePayload,
  });

  if (rpcErr) {
    let hint =
      "请在 Supabase SQL Editor 执行 supabase/FIX_SAVE_503.sql（或按序跑 006、007）";
    const msg = rpcErr.message ?? "";
    const code = rpcErr.code ?? "";
    if (
      code === "42501" ||
      /permission denied/i.test(msg) ||
      /not authorized/i.test(msg)
    ) {
      hint =
        "Vercel 的 SUPABASE_SERVICE_ROLE_KEY 须为 service_role JWT，勿用 anon/publishable key；并执行 FIX_SAVE_503.sql 确认 GRANT";
    } else if (/function.*does not exist/i.test(msg)) {
      hint = "未创建 replace_user_app_data，请执行 supabase/migrations/001_app_relational.sql";
    } else if (/column.*does not exist/i.test(msg)) {
      hint = "表结构过旧，请执行 supabase/FIX_SAVE_503.sql";
    } else if (/foreign key|violates foreign key/i.test(msg)) {
      hint =
        "RPC 版本过旧（外键失败），请执行 supabase/migrations/007_replace_user_app_data_fk_safe.sql";
    }
    checks.rpcReplace = {
      ok: false,
      message: msg,
      code,
      hint,
    };
  } else {
    checks.rpcReplace = { ok: true };
  }

  const allOk =
    (checks.foldersSelect as { ok: boolean }).ok &&
    (checks.tasksMentionsColumn as { ok: boolean }).ok &&
    (checks.rpcReplace as { ok: boolean }).ok;

  return NextResponse.json({
    ok: allOk,
    backend: "supabase",
    userId,
    checks,
    fix:
      "Supabase Dashboard → SQL Editor → 粘贴运行 supabase/FIX_SAVE_503.sql 全文",
  });
}

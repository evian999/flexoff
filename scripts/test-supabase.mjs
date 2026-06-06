/**
 * 本地探活 + RPC 写入测试（不会动真实用户数据）
 *
 * PowerShell:
 *   $env:SUPABASE_URL="https://<ref>.supabase.co"
 *   $env:SUPABASE_SERVICE_ROLE_KEY="<service_role JWT>"
 *   node scripts/test-supabase.mjs
 *
 * Node 20+:
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

const PROBE_USER = "__flex_off_persist_probe__";

const emptyPayload = {
  tasks: [],
  edges: [],
  groups: [],
  folders: [],
  tags: [],
  layout: {
    positions: {},
    groupRects: {},
    folderRects: {
      __inbox__: { x: 40, y: 40, w: 320, h: 200 },
      __archive__: { x: 400, y: 40, w: 320, h: 200 },
      __recent_deleted__: { x: 760, y: 40, w: 320, h: 200 },
    },
  },
};

const completeLikePayload = {
  ...emptyPayload,
  tasks: [
    {
      id: "probe-parent",
      title: "已完成父任务",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      result: "探针结果",
    },
    {
      id: "probe-child",
      title: "后续任务",
      createdAt: new Date().toISOString(),
    },
  ],
  edges: [
    {
      id: "probe-edge",
      source: "probe-parent",
      target: "probe-child",
      label: "下一步",
    },
  ],
  layout: {
    ...emptyPayload.layout,
    positions: {
      "probe-parent": { x: 100, y: 100 },
      "probe-child": { x: 320, y: 100 },
    },
  },
};

function fail(step, error) {
  console.error(`\n❌ ${step} 失败:`);
  console.error("  message:", error.message);
  if (error.code) console.error("  code:", error.code);
  if (error.details) console.error("  details:", error.details);
  if (error.hint) console.error("  hint:", error.hint);
  console.error(
    "\n修复: 在 Supabase SQL Editor 运行 supabase/FIX_SAVE_503.sql",
  );
  process.exit(2);
}

console.log("1/4 查询 folders …");
const { error: e1 } = await sb.from("folders").select("id").limit(1);
if (e1) fail("folders 查询", e1);
console.log("   ok");

console.log("2/4 检查 tasks.mentions 列 …");
const { error: e2 } = await sb.from("tasks").select("mentions").limit(0);
if (e2) fail("tasks.mentions 列", e2);
console.log("   ok");

console.log("3/4 RPC 空数据探针 …");
const { error: e3 } = await sb.rpc("replace_user_app_data", {
  p_user_id: PROBE_USER,
  p_data: emptyPayload,
});
if (e3) fail("replace_user_app_data (空)", e3);
console.log("   ok");

console.log("4/4 RPC 模拟「完成任务」payload …");
const { error: e4 } = await sb.rpc("replace_user_app_data", {
  p_user_id: PROBE_USER,
  p_data: completeLikePayload,
});
if (e4) fail("replace_user_app_data (完成态)", e4);
console.log("   ok");

console.log(
  "\n✅ 全部通过。若线上仍 503，请确认 Vercel 环境变量与本地使用的是同一 Supabase 项目，且 key 为 service_role。",
);

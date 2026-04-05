-- Taskpath：按用户分区的任务 / 文件夹 / 标签 / 画布布局（关系型）
-- 在 Supabase SQL Editor 中执行整段，或使用 supabase db push

create table if not exists public.folders (
  id text primary key,
  user_id text not null,
  name text not null,
  color text
);

create table if not exists public.tags (
  id text primary key,
  user_id text not null,
  name text not null,
  color text
);

create table if not exists public.tasks (
  id text primary key,
  user_id text not null,
  title text not null,
  created_at timestamptz not null,
  completed_at timestamptz,
  result text,
  folder_id text references public.folders (id) on delete set null
);

create table if not exists public.task_tags (
  task_id text not null references public.tasks (id) on delete cascade,
  tag_id text not null references public.tags (id) on delete cascade,
  primary key (task_id, tag_id)
);

create table if not exists public.task_groups (
  id text primary key,
  user_id text not null,
  name text not null
);

create table if not exists public.task_group_tasks (
  group_id text not null references public.task_groups (id) on delete cascade,
  task_id text not null references public.tasks (id) on delete cascade,
  sort_order int not null default 0,
  primary key (group_id, task_id)
);

create table if not exists public.task_edges (
  id text primary key,
  user_id text not null,
  source_task_id text not null references public.tasks (id) on delete cascade,
  target_task_id text not null references public.tasks (id) on delete cascade,
  label text
);

create table if not exists public.layout_task_positions (
  user_id text not null,
  task_id text not null references public.tasks (id) on delete cascade,
  x double precision not null,
  y double precision not null,
  primary key (user_id, task_id)
);

create table if not exists public.layout_group_rects (
  user_id text not null,
  group_id text not null references public.task_groups (id) on delete cascade,
  x double precision not null,
  y double precision not null,
  w double precision not null,
  h double precision not null,
  primary key (user_id, group_id)
);

create table if not exists public.layout_folder_rects (
  user_id text not null,
  folder_key text not null,
  x double precision not null,
  y double precision not null,
  w double precision not null,
  h double precision not null,
  primary key (user_id, folder_key)
);

create index if not exists idx_folders_user on public.folders (user_id);
create index if not exists idx_tags_user on public.tags (user_id);
create index if not exists idx_tasks_user on public.tasks (user_id);
create index if not exists idx_task_groups_user on public.task_groups (user_id);
create index if not exists idx_task_edges_user on public.task_edges (user_id);

-- 单次请求内删除并写入该用户全部数据（入参仅用于传输，落库为关系行）
create or replace function public.replace_user_app_data (p_user_id text, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.task_edges where user_id = p_user_id;
  delete from public.layout_task_positions where user_id = p_user_id;
  delete from public.layout_group_rects where user_id = p_user_id;
  delete from public.layout_folder_rects where user_id = p_user_id;
  delete from public.task_group_tasks
    where group_id in (select id from public.task_groups where user_id = p_user_id);
  delete from public.task_groups where user_id = p_user_id;
  delete from public.task_tags
    where task_id in (select id from public.tasks where user_id = p_user_id);
  delete from public.tasks where user_id = p_user_id;
  delete from public.folders where user_id = p_user_id;
  delete from public.tags where user_id = p_user_id;

  insert into public.folders (id, user_id, name, color)
  select
    e->>'id',
    p_user_id,
    e->>'name',
    nullif(trim(e->>'color'), '')
  from jsonb_array_elements(coalesce(p_data->'folders', '[]'::jsonb)) as e;

  insert into public.tags (id, user_id, name, color)
  select
    e->>'id',
    p_user_id,
    e->>'name',
    nullif(trim(e->>'color'), '')
  from jsonb_array_elements(coalesce(p_data->'tags', '[]'::jsonb)) as e;

  insert into public.tasks (id, user_id, title, created_at, completed_at, result, folder_id)
  select
    e->>'id',
    p_user_id,
    e->>'title',
    coalesce((e->>'createdAt')::timestamptz, now()),
    nullif(trim(e->>'completedAt'), '')::timestamptz,
    nullif(trim(e->>'result'), ''),
    nullif(trim(e->>'folderId'), '')
  from jsonb_array_elements(coalesce(p_data->'tasks', '[]'::jsonb)) as e;

  insert into public.task_tags (task_id, tag_id)
  select
    e->>'id',
    x.v
  from jsonb_array_elements(coalesce(p_data->'tasks', '[]'::jsonb)) as e
  cross join lateral jsonb_array_elements_text(coalesce(e->'tagIds', '[]'::jsonb)) as x(v);

  insert into public.task_groups (id, user_id, name)
  select
    e->>'id',
    p_user_id,
    e->>'name'
  from jsonb_array_elements(coalesce(p_data->'groups', '[]'::jsonb)) as e;

  insert into public.task_group_tasks (group_id, task_id, sort_order)
  select
    g.elem->>'id',
    t.val,
    (t.ord::int - 1)
  from jsonb_array_elements(coalesce(p_data->'groups', '[]'::jsonb)) as g(elem)
  cross join lateral jsonb_array_elements_text(coalesce(g.elem->'taskIds', '[]'::jsonb))
    with ordinality as t(val, ord);

  insert into public.task_edges (id, user_id, source_task_id, target_task_id, label)
  select
    e->>'id',
    p_user_id,
    e->>'source',
    e->>'target',
    nullif(trim(e->>'label'), '')
  from jsonb_array_elements(coalesce(p_data->'edges', '[]'::jsonb)) as e;

  insert into public.layout_task_positions (user_id, task_id, x, y)
  select
    p_user_id,
    k,
    (v->>'x')::double precision,
    (v->>'y')::double precision
  from jsonb_each(coalesce(p_data->'layout'->'positions', '{}'::jsonb)) as t(k, v);

  insert into public.layout_group_rects (user_id, group_id, x, y, w, h)
  select
    p_user_id,
    k,
    (v->>'x')::double precision,
    (v->>'y')::double precision,
    (v->>'w')::double precision,
    (v->>'h')::double precision
  from jsonb_each(coalesce(p_data->'layout'->'groupRects', '{}'::jsonb)) as t(k, v);

  insert into public.layout_folder_rects (user_id, folder_key, x, y, w, h)
  select
    p_user_id,
    k,
    (v->>'x')::double precision,
    (v->>'y')::double precision,
    (v->>'w')::double precision,
    (v->>'h')::double precision
  from jsonb_each(coalesce(p_data->'layout'->'folderRects', '{}'::jsonb)) as t(k, v);
end;
$$;

grant execute on function public.replace_user_app_data (text, jsonb) to service_role;

alter table public.folders enable row level security;
alter table public.tags enable row level security;
alter table public.tasks enable row level security;
alter table public.task_tags enable row level security;
alter table public.task_groups enable row level security;
alter table public.task_group_tasks enable row level security;
alter table public.task_edges enable row level security;
alter table public.layout_task_positions enable row level security;
alter table public.layout_group_rects enable row level security;
alter table public.layout_folder_rects enable row level security;

-- 仅服务端使用 service_role 访问；anon 无策略即不可读写

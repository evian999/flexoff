/** layout.folderRects 与导航中「收件箱」的统一键 */
export const INBOX_FOLDER_KEY = "__inbox__";
/** 虚拟「归档」文件夹：结项任务可移入此栏（显式 folderId） */
export const ARCHIVE_FOLDER_KEY = "__archive__";

export type Folder = {
  id: string;
  name: string;
  color?: string;
};

export type Tag = {
  id: string;
  name: string;
  color?: string;
};

/** 红旗 / 黄旗 / 蓝旗 → 高 / 中 / 低 */
export type TaskPriority = "high" | "medium" | "low";

export type Task = {
  id: string;
  title: string;
  createdAt: string;
  completedAt?: string;
  result?: string;
  /** 未设置表示收件箱 */
  folderId?: string;
  tagIds?: string[];
  /** 未设置时界面按「中」展示 */
  priority?: TaskPriority;
};

export type TodoEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type TaskGroup = {
  id: string;
  name: string;
  taskIds: string[];
};

export type Vec2 = { x: number; y: number };
export type Rect = { x: number; y: number; w: number; h: number };

export type LayoutState = {
  positions: Record<string, Vec2>;
  groupRects: Record<string, Rect>;
  /** 收件箱 / 归档为内置键，其余为文件夹 id */
  folderRects: Record<string, Rect>;
};

/** 仅读 HTTP 任务列表：关闭后带 token 也无法拉取 */
export type TaskHttpApiPreferences = {
  enabled: boolean;
  /** 随机密钥，请仅通过 HTTPS 传输 */
  token: string;
};

export type AppPreferences = {
  taskHttpApi?: TaskHttpApiPreferences;
};

export type AppData = {
  tasks: Task[];
  edges: TodoEdge[];
  groups: TaskGroup[];
  folders: Folder[];
  tags: Tag[];
  layout: LayoutState;
  /** 用户偏好（随 PATCH /api/data 持久化；Supabase 另写入 user_preferences 表便于 token 反查） */
  preferences?: AppPreferences;
};

export function defaultInboxRect(): Rect {
  return { x: 40, y: 40, w: 320, h: 420 };
}

export function defaultArchiveRect(): Rect {
  return { x: 400, y: 40, w: 320, h: 420 };
}

/** 「全部文件夹」画布上文件夹竖条顺序：收件箱 → 自定义 → 归档 */
export function allCanvasFolderLaneKeys(folders: { id: string }[]): string[] {
  return [INBOX_FOLDER_KEY, ...folders.map((f) => f.id), ARCHIVE_FOLDER_KEY];
}

export function defaultFolderRectForKey(folderKey: string): Rect {
  if (folderKey === INBOX_FOLDER_KEY) return defaultInboxRect();
  if (folderKey === ARCHIVE_FOLDER_KEY) return defaultArchiveRect();
  return defaultInboxRect();
}

export function emptyAppData(): AppData {
  return {
    tasks: [],
    edges: [],
    groups: [],
    folders: [],
    tags: [],
    layout: {
      positions: {},
      groupRects: {},
      folderRects: {
        [INBOX_FOLDER_KEY]: defaultInboxRect(),
        [ARCHIVE_FOLDER_KEY]: defaultArchiveRect(),
      },
    },
    preferences: {},
  };
}

export function taskFolderKey(task: Task): string {
  return task.folderId ?? INBOX_FOLDER_KEY;
}

export type NextStepInput = {
  text: string;
  linkTaskId?: string;
};

/** 导航：全部 | 收件箱键 | 具体文件夹 id */
export type NavFolderId = "all" | typeof INBOX_FOLDER_KEY | string;

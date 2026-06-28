export const schema = `
-- 用户表
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  account_code TEXT UNIQUE,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  status TEXT DEFAULT 'active',
  metadata TEXT
);

-- 账号表
CREATE TABLE IF NOT EXISTS accounts (
  id TEXT PRIMARY KEY,
  account_code TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_by TEXT NOT NULL,
  user_id TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  status TEXT DEFAULT 'active',
  total_usage_count INTEGER DEFAULT 0,
  last_used_at INTEGER,
  metadata TEXT
);

-- 操作日志表
CREATE TABLE IF NOT EXISTS operation_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  account_code TEXT,
  action_type TEXT NOT NULL,
  action_detail TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL
);

-- 解析记录表
CREATE TABLE IF NOT EXISTS parse_records (
  id TEXT PRIMARY KEY,
  account_code TEXT NOT NULL,
  user_id TEXT,
  share_link TEXT NOT NULL,
  access_code TEXT,
  platform_type TEXT,
  parsed_result TEXT,
  file_type TEXT,
  file_name TEXT,
  file_size INTEGER,
  direct_url TEXT,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  created_at INTEGER NOT NULL
);

-- 上传文件表
CREATE TABLE IF NOT EXISTS upload_files (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  account_code TEXT,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  r2_key TEXT NOT NULL,
  direct_url TEXT NOT NULL,
  upload_ip TEXT,
  created_at INTEGER NOT NULL
);

-- AI对话记录表
CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  account_code TEXT,
  conversation_history TEXT,
  message_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 系统配置表
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_accounts_code ON accounts(account_code);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);
CREATE INDEX IF NOT EXISTS idx_logs_account ON operation_logs(account_code);
CREATE INDEX IF NOT EXISTS idx_logs_created ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_parse_account ON parse_records(account_code);
CREATE INDEX IF NOT EXISTS idx_parse_created ON parse_records(created_at);
CREATE INDEX IF NOT EXISTS idx_upload_account ON upload_files(account_code);
CREATE INDEX IF NOT EXISTS idx_upload_created ON upload_files(created_at);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
`

export const initData = `
-- 插入默认管理员账号 (admin / admin123456)
INSERT OR IGNORE INTO users (id, username, password_hash, role, created_at, status)
VALUES (
  'admin-default-001',
  'admin',
  'JDJhJDEwJEFaNldwWnBuQzhOcFJ6dWZOWHVkT2VrV0h5NTJNb3V4NXh6N2QyVHpGNUY2dGRaU0hZaW5L',
  'admin',
  strftime('%s', 'now') * 1000,
  'active'
);

-- 插入系统配置
INSERT OR IGNORE INTO system_config (key, value, updated_at)
VALUES ('site_name', '云盘直链解析平台', strftime('%s', 'now') * 1000);

INSERT OR IGNORE INTO system_config (key, value, updated_at)
VALUES ('default_account_duration', '2592000000', strftime('%s', 'now') * 1000);
`

import Database from 'better-sqlite3'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR ?? join(__dirname, '../../data')

mkdirSync(DATA_DIR, { recursive: true })

const DB_PATH = join(DATA_DIR, 'wledashboard.db')

let _db = null

export function getDb() {
  if (_db) return _db

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.pragma('synchronous = NORMAL')

  applyMigrations(_db)

  return _db
}

function applyMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at TEXT DEFAULT (datetime('now'))
    );
  `)

  const current = db.prepare('SELECT MAX(version) AS v FROM schema_version').get()?.v ?? 0

  const migrations = [
    { version: 1, sql: migration_001 },
    { version: 2, sql: migration_002 },
    { version: 3, sql: migration_003 },
    { version: 4, sql: migration_004 },
    { version: 5, sql: migration_005 },
    { version: 6, sql: migration_006 },
    { version: 7, sql: migration_007 },
    { version: 8, sql: migration_008 },
    { version: 9, sql: migration_009 },
  ]

  for (const m of migrations) {
    if (m.version > current) {
      db.transaction(() => {
        db.exec(m.sql)
        db.prepare('INSERT INTO schema_version (version) VALUES (?)').run(m.version)
      })()
      console.log(`[db] Applied migration v${m.version}`)
    }
  }
}

// ─── Migration 001: Initial Schema ───────────────────────────────────────────

const migration_001 = `
  CREATE TABLE IF NOT EXISTS devices (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    ip_address   TEXT NOT NULL,
    mac_address  TEXT,
    firmware_ver TEXT,
    led_count    INTEGER,
    is_online    INTEGER NOT NULL DEFAULT 1,
    last_seen_at TEXT,
    sort_order   INTEGER NOT NULL DEFAULT 0,
    created_at   TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS groups (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL CHECK (type IN ('zone', 'scene', 'sync', 'custom')),
    color      TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id  TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    PRIMARY KEY (group_id, device_id)
  );

  CREATE TABLE IF NOT EXISTS group_children (
    parent_group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    child_group_id  TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (parent_group_id, child_group_id)
  );

  CREATE TABLE IF NOT EXISTS presets (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    group_id   TEXT REFERENCES groups(id) ON DELETE SET NULL,
    state_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    is_enabled     INTEGER NOT NULL DEFAULT 1,
    trigger_type   TEXT NOT NULL,
    trigger_config TEXT NOT NULL,
    action_type    TEXT NOT NULL,
    action_config  TEXT NOT NULL,
    target_type    TEXT NOT NULL,
    target_id      TEXT NOT NULL,
    created_at     TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS routines (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS routine_steps (
    id            TEXT PRIMARY KEY,
    routine_id    TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
    step_order    INTEGER NOT NULL,
    action_type   TEXT NOT NULL,
    action_config TEXT NOT NULL,
    delay_ms      INTEGER NOT NULL DEFAULT 0,
    target_type   TEXT,
    target_id     TEXT
  );

  CREATE TABLE IF NOT EXISTS dwellings (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS floors (
    id          TEXT PRIMARY KEY,
    dwelling_id TEXT NOT NULL REFERENCES dwellings(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    elevation   REAL NOT NULL DEFAULT 0,
    sort_order  INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id         TEXT PRIMARY KEY,
    floor_id   TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    width      REAL NOT NULL DEFAULT 4.0,
    depth      REAL NOT NULL DEFAULT 4.0,
    position_x REAL NOT NULL DEFAULT 0,
    position_y REAL NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS anchors (
    id         TEXT PRIMARY KEY,
    room_id    TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    device_id  TEXT REFERENCES devices(id) ON DELETE SET NULL,
    name       TEXT NOT NULL,
    type       TEXT NOT NULL,
    offset_x   REAL NOT NULL DEFAULT 0,
    offset_y   REAL NOT NULL DEFAULT 0,
    offset_z   REAL NOT NULL DEFAULT 0,
    rotation_y REAL NOT NULL DEFAULT 0,
    length     REAL NOT NULL DEFAULT 3.5
  );

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS animations (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    timeline_json TEXT NOT NULL,
    duration_ms   INTEGER NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS palettes (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    colors_json TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES
    ('poll_interval_ms', '5000'),
    ('mdns_scan_interval_ms', '30000'),
    ('websocket_preferred', '0'),
    ('latitude', ''),
    ('longitude', ''),
    ('animation_intensity', 'full'),
    ('card_density', 'comfortable'),
    ('theme', 'dark');
`

const migration_002 = `
  ALTER TABLE schedules ADD COLUMN trigger_value TEXT DEFAULT '12:00';
  ALTER TABLE schedules ADD COLUMN payload_json TEXT DEFAULT '{}';
  ALTER TABLE schedules ADD COLUMN enabled INTEGER DEFAULT 1;
  ALTER TABLE schedules ADD COLUMN last_run_at TEXT;

  ALTER TABLE routines ADD COLUMN description TEXT DEFAULT '';
  ALTER TABLE routines ADD COLUMN steps_json TEXT DEFAULT '[]';
  ALTER TABLE routines ADD COLUMN enabled INTEGER DEFAULT 1;
`

const migration_003 = `
  ALTER TABLE anchors ADD COLUMN rotation_y REAL DEFAULT 0;
  ALTER TABLE anchors ADD COLUMN length REAL DEFAULT 3.5;
`

const migration_004 = `
  CREATE TABLE IF NOT EXISTS matrices (
    id         TEXT PRIMARY KEY,
    device_id  TEXT REFERENCES devices(id) ON DELETE SET NULL,
    name       TEXT NOT NULL,
    width      INTEGER NOT NULL DEFAULT 16,
    height     INTEGER NOT NULL DEFAULT 16,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS matrix_drawings (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    width       INTEGER NOT NULL,
    height      INTEGER NOT NULL,
    pixels_json TEXT NOT NULL,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  INSERT OR IGNORE INTO settings (key, value) VALUES
    ('mqtt_enabled', '0'),
    ('mqtt_broker_url', 'mqtt://localhost:1883');
`

const migration_005 = `
  ALTER TABLE anchors ADD COLUMN led_density INTEGER DEFAULT 60;
`

const migration_006 = `
  ALTER TABLE devices ADD COLUMN led_density INTEGER DEFAULT 60;
`

const migration_007 = `
  ALTER TABLE devices ADD COLUMN spotify_sync_enabled INTEGER DEFAULT 0;
  ALTER TABLE groups ADD COLUMN spotify_sync_enabled INTEGER DEFAULT 0;
`

const migration_008 = `
  ALTER TABLE devices ADD COLUMN weather_sync_enabled INTEGER DEFAULT 0;
  ALTER TABLE groups ADD COLUMN weather_sync_enabled INTEGER DEFAULT 0;
`

const migration_009 = `
  ALTER TABLE rooms ADD COLUMN rotation_y REAL DEFAULT 0;
`

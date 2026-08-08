export default function up(db) {
  // Add weather_sync_enabled to devices
  try {
    db.prepare('ALTER TABLE devices ADD COLUMN weather_sync_enabled INTEGER DEFAULT 0').run()
  } catch (err) {
    if (!err.message.includes('duplicate column name')) throw err
  }

  // Add weather_sync_enabled to groups
  try {
    db.prepare('ALTER TABLE groups ADD COLUMN weather_sync_enabled INTEGER DEFAULT 0').run()
  } catch (err) {
    if (!err.message.includes('duplicate column name')) throw err
  }
}

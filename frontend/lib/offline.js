import * as SQLite from 'expo-sqlite'

let db = null

function getDB() {
  if (!db) {
    db = SQLite.openDatabaseSync('learnly_cache.db')
    initDB()
  }
  return db
}

function initDB() {
  const database = db
  database.execSync(`
    CREATE TABLE IF NOT EXISTS cached_lessons (
      node_id TEXT NOT NULL,
      language TEXT NOT NULL,
      content TEXT NOT NULL,
      cached_at INTEGER NOT NULL,
      PRIMARY KEY (node_id, language)
    );

    CREATE TABLE IF NOT EXISTS cached_quizzes (
      node_id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cached_ai_explanations (
      node_id TEXT NOT NULL,
      language TEXT NOT NULL,
      content TEXT NOT NULL,
      cached_at INTEGER NOT NULL,
      PRIMARY KEY (node_id, language)
    );

    CREATE TABLE IF NOT EXISTS cached_roadmaps (
      roadmap_id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      cached_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
  `)
}

export function getCachedLesson(nodeId, language) {
  const database = getDB()
  const row = database.getFirstSync(
    'SELECT content FROM cached_lessons WHERE node_id = ? AND language = ?',
    [nodeId, language]
  )
  return row?.content ? JSON.parse(row.content) : null
}

export function cacheLesson(nodeId, language, content) {
  const database = getDB()
  database.runSync(
    'INSERT OR REPLACE INTO cached_lessons (node_id, language, content, cached_at) VALUES (?, ?, ?, ?)',
    [nodeId, language, JSON.stringify(content), Date.now()]
  )
}

export function getCachedQuiz(nodeId) {
  const database = getDB()
  const row = database.getFirstSync('SELECT content FROM cached_quizzes WHERE node_id = ?', [nodeId])
  return row?.content ? JSON.parse(row.content) : null
}

export function cacheQuiz(nodeId, content) {
  const database = getDB()
  database.runSync(
    'INSERT OR REPLACE INTO cached_quizzes (node_id, content, cached_at) VALUES (?, ?, ?)',
    [nodeId, JSON.stringify(content), Date.now()]
  )
}

export function getCachedAIExplanation(nodeId, language) {
  const database = getDB()
  const row = database.getFirstSync(
    'SELECT content FROM cached_ai_explanations WHERE node_id = ? AND language = ?',
    [nodeId, language]
  )
  return row?.content || null
}

export function cacheAIExplanation(nodeId, language, content) {
  const database = getDB()
  database.runSync(
    'INSERT OR REPLACE INTO cached_ai_explanations (node_id, language, content, cached_at) VALUES (?, ?, ?, ?)',
    [nodeId, language, content, Date.now()]
  )
}

export function getCachedRoadmap(roadmapId) {
  const database = getDB()
  const row = database.getFirstSync('SELECT content FROM cached_roadmaps WHERE roadmap_id = ?', [roadmapId])
  return row?.content ? JSON.parse(row.content) : null
}

export function cacheRoadmap(roadmapId, content) {
  const database = getDB()
  database.runSync(
    'INSERT OR REPLACE INTO cached_roadmaps (roadmap_id, content, cached_at) VALUES (?, ?, ?)',
    [roadmapId, JSON.stringify(content), Date.now()]
  )
}

export function addToSyncQueue(type, payload) {
  const database = getDB()
  database.runSync(
    'INSERT INTO sync_queue (type, payload, created_at) VALUES (?, ?, ?)',
    [type, JSON.stringify(payload), Date.now()]
  )
}

export function getSyncQueue() {
  const database = getDB()
  return database.getAllSync('SELECT * FROM sync_queue ORDER BY created_at ASC')
    .map((row) => ({ ...row, payload: JSON.parse(row.payload) }))
}

export function removeFromSyncQueue(id) {
  const database = getDB()
  database.runSync('DELETE FROM sync_queue WHERE id = ?', [id])
}

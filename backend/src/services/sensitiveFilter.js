const getPool = require('../config/db');

// 内存缓存敏感词，定期刷新
let wordCache = [];
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 加载敏感词到内存
 */
const loadWords = async () => {
  const now = Date.now();
  if (now - cacheTime < CACHE_TTL && wordCache.length > 0) {
    return wordCache;
  }

  try {
    const pool = getPool();
    const [rows] = await pool.query('SELECT * FROM sensitive_words WHERE enabled = 1');
    wordCache = rows;
    cacheTime = now;
    return wordCache;
  } catch (err) {
    console.error('加载敏感词失败:', err.message);
    return wordCache;
  }
};

const filter = async (text) => {
  if (!text) return { passed: true, filteredText: text, hits: [], level: 'none' };

  const words = await loadWords();
  let filteredText = text;
  const hits = [];
  let highestLevel = 'none';

  const levelPriority = { block: 3, review: 2, replace: 1, none: 0 };

  for (const w of words) {
    try {
      const regex = new RegExp(w.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(text)) {
        hits.push(w.word);
        if (levelPriority[w.level] > levelPriority[highestLevel]) {
          highestLevel = w.level;
        }
        if (w.level === 'replace') {
          filteredText = filteredText.replace(regex, w.replacement);
        }
      }
    } catch (e) {
      // Skip invalid regex patterns
    }
  }

  let passed = true;
  if (highestLevel === 'block') passed = false;

  return { passed, filteredText, hits, level: highestLevel };
};

const filterMulti = async (texts) => {
  const results = {};
  for (const [key, text] of Object.entries(texts)) {
    results[key] = await filter(text);
  }
  return results;
};

const hasSensitive = async (text) => {
  const result = await filter(text);
  return result.level === 'block';
};

const addWord = async (word, level = 'block', category = 'other', replacement = '***') => {
  const pool = getPool();
  await pool.query(
    `INSERT INTO sensitive_words (word, level, category, replacement, enabled)
     VALUES (?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE level = ?, category = ?, replacement = ?, enabled = 1`,
    [word, level, category, replacement, level, category, replacement]
  );
  wordCache = [];
  const [rows] = await pool.query('SELECT * FROM sensitive_words WHERE word = ?', [word]);
  return rows[0];
};

const removeWord = async (word) => {
  const pool = getPool();
  await pool.query('UPDATE sensitive_words SET enabled = 0 WHERE word = ?', [word]);
  wordCache = [];
};

module.exports = {
  filter,
  filterMulti,
  hasSensitive,
  addWord,
  removeWord,
  loadWords,
};

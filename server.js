const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './hackathon.db';
const WORKSPACE_DIR = path.join(__dirname, 'workspace');

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure workspace directory exists
if (!fs.existsSync(WORKSPACE_DIR)) {
  fs.mkdirSync(WORKSPACE_DIR, { recursive: true });
}

// Database setup
// 데이터베이스 디렉토리가 없으면 생성
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log(`Connected to SQLite database at ${DB_PATH}`);
    initDatabase();
  }
});

// Initialize database
function initDatabase() {
  db.serialize(() => {
    // Topics table
    db.run(`CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Comments table
    db.run(`CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      content TEXT NOT NULL,
      comment_type TEXT DEFAULT 'feedback',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    )`);

    // Ideas table
    db.run(`CREATE TABLE IF NOT EXISTS ideas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      author_name TEXT NOT NULL,
      idea TEXT NOT NULL,
      votes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    )`);

    // Topic content table (BlockNote.js content)
    db.run(`CREATE TABLE IF NOT EXISTS topic_content (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      version INTEGER DEFAULT 1,
      updated_by TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    )`);

    // Load CSV data if topics table is empty
    db.get("SELECT COUNT(*) as count FROM topics", (err, row) => {
      if (row.count === 0) {
        loadTopicsFromCSV();
      }
    });
  });
}

// Load topics from CSV
function loadTopicsFromCSV() {
  const csvPath = path.join(__dirname, 'subjects.csv');

  try {
    // Read UTF-8 CSV file
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    });

    const stmt = db.prepare("INSERT INTO topics (id, title, description) VALUES (?, ?, ?)");
    records.forEach(record => {
      stmt.run(record['순번'], record['주제'], record['설명']);
    });
    stmt.finalize();
    console.log('Topics loaded from CSV');
  } catch (error) {
    console.error('Error loading CSV:', error);
  }
}

// API Routes

// Get all topics
app.get('/api/topics', (req, res) => {
  db.all("SELECT * FROM topics ORDER BY id", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
    } else {
      res.json(rows);
    }
  });
});

// Get single topic with comments and ideas
app.get('/api/topics/:id', (req, res) => {
  const topicId = req.params.id;

  db.get("SELECT * FROM topics WHERE id = ?", [topicId], (err, topic) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }

    db.all("SELECT * FROM comments WHERE topic_id = ? ORDER BY created_at DESC", [topicId], (err, comments) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      db.all("SELECT * FROM ideas WHERE topic_id = ? ORDER BY votes DESC, created_at DESC", [topicId], (err, ideas) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }

        res.json({ ...topic, comments, ideas });
      });
    });
  });
});

// Add comment
app.post('/api/topics/:id/comments', (req, res) => {
  const { author_name, content, comment_type } = req.body;
  const topicId = req.params.id;

  db.run(
    "INSERT INTO comments (topic_id, author_name, content, comment_type) VALUES (?, ?, ?, ?)",
    [topicId, author_name, content, comment_type || 'feedback'],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, message: 'Comment added successfully' });
      }
    }
  );
});

// Add idea
app.post('/api/topics/:id/ideas', (req, res) => {
  const { author_name, idea } = req.body;
  const topicId = req.params.id;

  db.run(
    "INSERT INTO ideas (topic_id, author_name, idea) VALUES (?, ?, ?)",
    [topicId, author_name, idea],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ id: this.lastID, message: 'Idea added successfully' });
      }
    }
  );
});

// Vote for idea
app.post('/api/ideas/:id/vote', (req, res) => {
  const ideaId = req.params.id;

  db.run(
    "UPDATE ideas SET votes = votes + 1 WHERE id = ?",
    [ideaId],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
      } else {
        res.json({ message: 'Vote recorded successfully' });
      }
    }
  );
});

// Get topic content (BlockNote.js)
app.get('/api/topics/:id/content', (req, res) => {
  const topicId = req.params.id;

  db.get(
    "SELECT content, version, updated_by, updated_at FROM topic_content WHERE topic_id = ? ORDER BY id DESC LIMIT 1",
    [topicId],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      if (!row) {
        // Return empty content if no content exists
        res.json({ 
          content: null,
          version: 0,
          updated_by: null,
          updated_at: null
        });
      } else {
        res.json({
          content: JSON.parse(row.content),
          version: row.version,
          updated_by: row.updated_by,
          updated_at: row.updated_at
        });
      }
    }
  );
});

// Save topic content (BlockNote.js)
app.post('/api/topics/:id/content', (req, res) => {
  const topicId = req.params.id;
  const { content, updated_by } = req.body;

  if (!content) {
    res.status(400).json({ error: 'Content is required' });
    return;
  }

  // Get current version
  db.get(
    "SELECT MAX(version) as current_version FROM topic_content WHERE topic_id = ?",
    [topicId],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }

      const newVersion = (row.current_version || 0) + 1;

      // Insert new version
      db.run(
        "INSERT INTO topic_content (topic_id, content, version, updated_by) VALUES (?, ?, ?, ?)",
        [topicId, JSON.stringify(content), newVersion, updated_by || 'Anonymous'],
        function(err) {
          if (err) {
            res.status(500).json({ error: err.message });
          } else {
            res.json({ 
              id: this.lastID, 
              version: newVersion,
              message: 'Content saved successfully' 
            });
          }
        }
      );
    }
  );
});

// Workspace API Routes - JSON 파일로 저장

// Get workspace data (주제 안내 & 정보 공유, 피드백, 아이디어)
app.get('/api/workspace/:topicId', (req, res) => {
  const topicId = req.params.topicId;
  const workspaceFile = path.join(WORKSPACE_DIR, `topic_${topicId}.json`);

  console.log(`📥 GET /api/workspace/${topicId} - File: ${workspaceFile}`);

  if (!fs.existsSync(workspaceFile)) {
    // 파일이 없으면 기본 구조 반환
    console.log(`⚠️ File not found, returning default structure`);
    return res.json({
      topicId: parseInt(topicId),
      content: null,
      feedback: [],
      ideas: [],
      lastUpdated: new Date().toISOString()
    });
  }

  try {
    const data = JSON.parse(fs.readFileSync(workspaceFile, 'utf-8'));
    console.log(`✅ Workspace data loaded, size: ${JSON.stringify(data).length} bytes`);
    res.json(data);
  } catch (error) {
    console.error(`❌ Error reading workspace file:`, error);
    res.status(500).json({ error: 'Failed to read workspace file', details: error.message });
  }
});

// Save topic content to workspace
app.post('/api/workspace/:topicId/content', (req, res) => {
  const topicId = req.params.topicId;
  const { content, updated_by } = req.body;
  const workspaceFile = path.join(WORKSPACE_DIR, `topic_${topicId}.json`);

  console.log(`📝 POST /api/workspace/${topicId}/content - Blocks: ${content?.length || 0}`);

  let workspaceData = {
    topicId: parseInt(topicId),
    content: null,
    feedback: [],
    ideas: [],
    lastUpdated: null
  };

  // 기존 파일이 있으면 읽어오기
  if (fs.existsSync(workspaceFile)) {
    try {
      workspaceData = JSON.parse(fs.readFileSync(workspaceFile, 'utf-8'));
      console.log(`✅ Existing workspace loaded`);
    } catch (error) {
      console.error('❌ Error reading workspace file:', error);
    }
  }

  // 콘텐츠 업데이트
  workspaceData.content = {
    blocks: content,
    updated_by: updated_by || 'Anonymous',
    updated_at: new Date().toISOString()
  };
  workspaceData.lastUpdated = new Date().toISOString();

  // JSON 파일로 저장
  try {
    fs.writeFileSync(workspaceFile, JSON.stringify(workspaceData, null, 2), 'utf-8');
    console.log(`✅ Content saved to ${workspaceFile}`);
    res.json({ success: true, message: 'Content saved to workspace' });
  } catch (error) {
    console.error(`❌ Error saving workspace file:`, error);
    res.status(500).json({ error: 'Failed to save workspace file', details: error.message });
  }
});

// Add feedback to workspace
app.post('/api/workspace/:topicId/feedback', (req, res) => {
  const topicId = req.params.topicId;
  const { author_name, content } = req.body;
  const workspaceFile = path.join(WORKSPACE_DIR, `topic_${topicId}.json`);

  let workspaceData = {
    topicId: parseInt(topicId),
    content: null,
    feedback: [],
    ideas: [],
    lastUpdated: null
  };

  // 기존 파일이 있으면 읽어오기
  if (fs.existsSync(workspaceFile)) {
    try {
      workspaceData = JSON.parse(fs.readFileSync(workspaceFile, 'utf-8'));
    } catch (error) {
      console.error('Error reading workspace file:', error);
    }
  }

  // 피드백 추가
  const newFeedback = {
    id: Date.now(),
    author_name,
    content,
    created_at: new Date().toISOString()
  };
  workspaceData.feedback.push(newFeedback);
  workspaceData.lastUpdated = new Date().toISOString();

  // JSON 파일로 저장
  try {
    fs.writeFileSync(workspaceFile, JSON.stringify(workspaceData, null, 2), 'utf-8');
    res.json({ success: true, feedback: newFeedback });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// Add idea to workspace
app.post('/api/workspace/:topicId/ideas', (req, res) => {
  const topicId = req.params.topicId;
  const { author_name, idea } = req.body;
  const workspaceFile = path.join(WORKSPACE_DIR, `topic_${topicId}.json`);

  let workspaceData = {
    topicId: parseInt(topicId),
    content: null,
    feedback: [],
    ideas: [],
    lastUpdated: null
  };

  // 기존 파일이 있으면 읽어오기
  if (fs.existsSync(workspaceFile)) {
    try {
      workspaceData = JSON.parse(fs.readFileSync(workspaceFile, 'utf-8'));
    } catch (error) {
      console.error('Error reading workspace file:', error);
    }
  }

  // 아이디어 추가
  const newIdea = {
    id: Date.now(),
    author_name,
    idea,
    votes: 0,
    created_at: new Date().toISOString()
  };
  workspaceData.ideas.push(newIdea);
  workspaceData.lastUpdated = new Date().toISOString();

  // JSON 파일로 저장
  try {
    fs.writeFileSync(workspaceFile, JSON.stringify(workspaceData, null, 2), 'utf-8');
    res.json({ success: true, idea: newIdea });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save idea' });
  }
});

// Vote for idea in workspace
app.post('/api/workspace/:topicId/ideas/:ideaId/vote', (req, res) => {
  const topicId = req.params.topicId;
  const ideaId = parseInt(req.params.ideaId);
  const workspaceFile = path.join(WORKSPACE_DIR, `topic_${topicId}.json`);

  if (!fs.existsSync(workspaceFile)) {
    return res.status(404).json({ error: 'Workspace file not found' });
  }

  try {
    const workspaceData = JSON.parse(fs.readFileSync(workspaceFile, 'utf-8'));
    const idea = workspaceData.ideas.find(i => i.id === ideaId);

    if (!idea) {
      return res.status(404).json({ error: 'Idea not found' });
    }

    idea.votes = (idea.votes || 0) + 1;
    workspaceData.lastUpdated = new Date().toISOString();

    fs.writeFileSync(workspaceFile, JSON.stringify(workspaceData, null, 2), 'utf-8');
    res.json({ success: true, votes: idea.votes });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update vote' });
  }
});

// Development: Vite dev server integration (AFTER all API routes)
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
      logLevel: 'info'
    });

    // Use vite's connect instance as middleware for non-API requests
    app.use(vite.middlewares);

    console.log('🎨 Vite dev server integrated as middleware');
  } else {
    // Production: Serve static files
    app.use(express.static(path.join(__dirname, 'dist')));

    // SPA fallback - serve index.html for all non-API routes
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });

    console.log('📦 Serving production build from dist/');
  }
}

// Start main HTTP server
async function startServer() {
  // Setup Vite/static serving first
  await setupVite();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 슈어해커톤 서버가 http://0.0.0.0:${PORT} 에서 실행 중입니다!`);
    console.log(`   컨테이너 내부: http://0.0.0.0:${PORT}`);
    console.log(`   실시간 협업: Liveblocks 사용`);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`   개발 모드: Vite HMR 활성화`);
    }
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n👋 서버를 종료합니다...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    process.exit(0);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

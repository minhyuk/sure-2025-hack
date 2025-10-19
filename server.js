const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_PATH = process.env.DB_PATH || './hackathon.db';
const WORKSPACE_DIR = path.join(__dirname, 'workspace');
const JWT_SECRET = process.env.JWT_SECRET || 'sure-hackerton-2025-secret-key-change-in-production';
const SALT_ROUNDS = 10;

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
      requirements TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // ============================================
    // 사용자 & 팀 관리
    // ============================================

    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT DEFAULT 'participant',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Teams table
    db.run(`CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      topic_id INTEGER NOT NULL,
      color TEXT DEFAULT '#3B82F6',
      current_stage INTEGER DEFAULT 1,
      status TEXT DEFAULT 'active',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (topic_id) REFERENCES topics(id)
    )`);

    // Team members table
    db.run(`CREATE TABLE IF NOT EXISTS team_members (
      team_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (team_id, user_id),
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`);

    // Team stages (진행 단계 기록)
    db.run(`CREATE TABLE IF NOT EXISTS team_stages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      stage_number INTEGER NOT NULL,
      stage_name TEXT NOT NULL,
      description TEXT NOT NULL,
      file_path TEXT,
      file_url TEXT,
      completed_by INTEGER NOT NULL,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (completed_by) REFERENCES users(id)
    )`);

    // ============================================
    // 해커톤 설정
    // ============================================

    // Hackathon settings
    db.run(`CREATE TABLE IF NOT EXISTS hackathon_settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      description TEXT,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // 기본 설정값 삽입
    db.run(`INSERT OR IGNORE INTO hackathon_settings (key, value, description) VALUES
      ('status', 'preparing', '해커톤 상태: preparing(준비중), active(진행중), ended(종료)'),
      ('start_time', '', '해커톤 시작 시간 (ISO 8601)'),
      ('end_time', '', '해커톤 종료 시간 (ISO 8601)'),
      ('monitor_enabled', 'true', '전체 화면 대시보드 활성화')`);

    // 마이그레이션: is_active를 status로 변환
    db.get("SELECT value FROM hackathon_settings WHERE key = 'is_active'", [], (err, row) => {
      if (row && row.value) {
        let statusValue = 'preparing';
        if (row.value === 'true') {
          statusValue = 'active';
        } else if (row.value === 'ended') {
          statusValue = 'ended';
        } else if (row.value === 'false') {
          statusValue = 'preparing';
        }

        db.run("INSERT OR REPLACE INTO hackathon_settings (key, value, description) VALUES (?, ?, ?)",
          ['status', statusValue, '해커톤 상태: preparing(준비중), active(진행중), ended(종료)'],
          () => {
            console.log(`✅ Migrated is_active='${row.value}' to status='${statusValue}'`);
            // 기존 is_active, current_phase, phase_end_time, current_stage 삭제
            db.run("DELETE FROM hackathon_settings WHERE key IN ('is_active', 'current_phase', 'phase_end_time', 'current_stage')");
          }
        );
      }
    });

    // ============================================
    // 응원 시스템
    // ============================================

    // Cheers (응원 메시지)
    db.run(`CREATE TABLE IF NOT EXISTS cheers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER,
      author_name TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'comment',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )`);

    // Announcements (공지사항)
    db.run(`CREATE TABLE IF NOT EXISTS announcements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      priority TEXT DEFAULT 'normal',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`);

    // ============================================
    // 기존 테이블 (호환성 유지)
    // ============================================

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

    // ============================================
    // 인덱스 생성
    // ============================================

    db.run(`CREATE INDEX IF NOT EXISTS idx_teams_topic ON teams(topic_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_team_stages_team ON team_stages(team_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_cheers_created ON cheers(created_at DESC)`);

    console.log('✅ Database tables initialized');

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

// ============================================
// Utility Functions
// ============================================

// 팀 색상 랜덤 선택
const TEAM_COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6',
  '#F97316', '#84CC16', '#A855F7', '#0EA5E9'
];

function getRandomColor() {
  return TEAM_COLORS[Math.floor(Math.random() * TEAM_COLORS.length)];
}

// ============================================
// JWT Authentication Middleware
// ============================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user; // { id, username, role, team_id }
    next();
  });
}

// Admin-only middleware (for JWT-based auth)
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

// Simple admin authentication middleware (for hardcoded admin login)
function authenticateSimpleAdmin(req, res, next) {
  const adminKey = req.headers['x-admin-key'];
  
  // Check for hardcoded admin key
  if (adminKey === 'admin-claude-2025') {
    req.user = { id: 0, username: 'admin', role: 'admin', team_id: null };
    return next();
  }
  
  // Fallback to JWT authentication
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = user;
    next();
  });
}

// ============================================
// API Routes
// ============================================

// ──────────────────────────────────────────
// Authentication APIs
// ──────────────────────────────────────────

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, email, password, display_name, team_name, topic_id } = req.body;

  // Validation
  if (!username || !email || !password || !display_name || !team_name || !topic_id) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }

  if (password.length < 4) {
    return res.status(400).json({ error: 'Password must be at least 4 characters' });
  }

  try {
    // Check if username or email already exists
    db.get("SELECT id FROM users WHERE username = ? OR email = ?", [username, email], async (err, existingUser) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (existingUser) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const password_hash = await bcrypt.hash(password, SALT_ROUNDS);

      // Insert user
      db.run(
        "INSERT INTO users (username, email, password_hash, display_name, role) VALUES (?, ?, ?, ?, ?)",
        [username, email, password_hash, display_name, 'participant'],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to create user' });
          }

          const userId = this.lastID;

          // First user (id=1) is automatically admin
          if (userId === 1) {
            db.run("UPDATE users SET role = 'admin' WHERE id = ?", [userId], (err) => {
              if (err) console.error('Failed to set admin role:', err);
              else console.log('🔐 First user (id=1) set as admin');
            });
          }

          // Find or create team
          db.get(
            "SELECT id FROM teams WHERE name = ? AND topic_id = ?",
            [team_name, topic_id],
            (err, existingTeam) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }

              if (existingTeam) {
                // Join existing team
                const teamId = existingTeam.id;
                db.run(
                  "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)",
                  [teamId, userId, 'member'],
                  (err) => {
                    if (err) {
                      return res.status(500).json({ error: 'Failed to join team' });
                    }

                    // Generate JWT
                    const token = jwt.sign(
                      { id: userId, username, role: 'participant', team_id: teamId },
                      JWT_SECRET,
                      { expiresIn: '24h' }
                    );

                    res.json({
                      token,
                      user: {
                        id: userId,
                        username,
                        display_name,
                        email,
                        role: 'participant',
                        team_id: teamId,
                        team_name
                      }
                    });
                  }
                );
              } else {
                // Create new team
                const teamColor = getRandomColor();
                db.run(
                  "INSERT INTO teams (name, topic_id, color) VALUES (?, ?, ?)",
                  [team_name, topic_id, teamColor],
                  function(err) {
                    if (err) {
                      return res.status(500).json({ error: 'Failed to create team' });
                    }

                    const teamId = this.lastID;

                    // Add user as team leader
                    db.run(
                      "INSERT INTO team_members (team_id, user_id, role) VALUES (?, ?, ?)",
                      [teamId, userId, 'leader'],
                      (err) => {
                        if (err) {
                          return res.status(500).json({ error: 'Failed to add to team' });
                        }

                        // Generate JWT
                        const token = jwt.sign(
                          { id: userId, username, role: 'participant', team_id: teamId },
                          JWT_SECRET,
                          { expiresIn: '24h' }
                        );

                        res.json({
                          token,
                          user: {
                            id: userId,
                            username,
                            display_name,
                            email,
                            role: 'participant',
                            team_id: teamId,
                            team_name
                          }
                        });
                      }
                    );
                  }
                );
              }
            }
          );
        }
      );
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }

  // Find user
  db.get(
    "SELECT * FROM users WHERE username = ? OR email = ?",
    [username, username],
    async (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.password_hash);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Get user's team
      db.get(
        `SELECT t.id, t.name
         FROM teams t
         INNER JOIN team_members tm ON t.id = tm.team_id
         WHERE tm.user_id = ?`,
        [user.id],
        (err, team) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          // Generate JWT
          const token = jwt.sign(
            {
              id: user.id,
              username: user.username,
              role: user.role,
              team_id: team?.id || null
            },
            JWT_SECRET,
            { expiresIn: '24h' }
          );

          res.json({
            token,
            user: {
              id: user.id,
              username: user.username,
              display_name: user.display_name,
              email: user.email,
              role: user.role,
              team_id: team?.id || null,
              team_name: team?.name || null
            }
          });
        }
      );
    }
  );
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  db.get("SELECT id, username, display_name, email, role FROM users WHERE id = ?", [req.user.id], (err, user) => {
    if (err || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's team
    db.get(
      `SELECT t.id, t.name, t.topic_id, t.color, t.current_stage
       FROM teams t
       INNER JOIN team_members tm ON t.id = tm.team_id
       WHERE tm.user_id = ?`,
      [user.id],
      (err, team) => {
        res.json({
          ...user,
          team_id: team?.id || null,
          team_name: team?.name || null,
          team: team || null
        });
      }
    );
  });
});

// ──────────────────────────────────────────
// Topics APIs
// ──────────────────────────────────────────

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

// ──────────────────────────────────────────
// Dashboard APIs
// ──────────────────────────────────────────

// Get all teams with progress (for dashboard)
app.get('/api/dashboard/teams', (req, res) => {
  const query = `
    SELECT
      t.id,
      t.name,
      t.topic_id,
      t.color,
      t.current_stage,
      t.status,
      topics.title as topic_title,
      (t.current_stage * 10) as progress_percentage,
      COUNT(tm.user_id) as member_count
    FROM teams t
    LEFT JOIN topics ON t.topic_id = topics.id
    LEFT JOIN team_members tm ON t.id = tm.team_id
    WHERE t.status = 'active'
    GROUP BY t.id
    ORDER BY t.topic_id, t.name
  `;

  db.all(query, [], (err, teams) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Group teams by topic
    const groupedByTopic = teams.reduce((acc, team) => {
      if (!acc[team.topic_id]) {
        acc[team.topic_id] = {
          topic_id: team.topic_id,
          topic_title: team.topic_title,
          teams: []
        };
      }
      acc[team.topic_id].teams.push(team);
      return acc;
    }, {});

    res.json({
      teams,
      grouped: Object.values(groupedByTopic)
    });
  });
});

// Get hackathon settings
app.get('/api/dashboard/settings', (req, res) => {
  db.all("SELECT key, value, description FROM hackathon_settings", [], (err, settings) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Convert to key-value object
    const settingsObj = settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});

    res.json(settingsObj);
  });
});

// Get recent cheers
app.get('/api/cheers/recent', (req, res) => {
  const limit = req.query.limit || 20;

  const query = `
    SELECT
      c.id,
      c.team_id,
      c.author_name,
      c.message,
      c.type,
      c.created_at,
      t.name as team_name,
      t.color as team_color
    FROM cheers c
    LEFT JOIN teams t ON c.team_id = t.id
    ORDER BY c.created_at DESC
    LIMIT ?
  `;

  db.all(query, [limit], (err, cheers) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(cheers);
  });
});

// Add cheer
app.post('/api/cheers', (req, res) => {
  const { team_id, author_name, message, type } = req.body;

  if (!author_name || !message) {
    return res.status(400).json({ error: 'Author name and message are required' });
  }

  db.run(
    "INSERT INTO cheers (team_id, author_name, message, type) VALUES (?, ?, ?, ?)",
    [team_id || null, author_name, message, type || 'comment'],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to add cheer' });
      }

      res.json({
        id: this.lastID,
        team_id,
        author_name,
        message,
        type: type || 'comment',
        created_at: new Date().toISOString()
      });
    }
  );
});

// ──────────────────────────────────────────
// Workspace API Routes - JSON 파일로 저장
// ──────────────────────────────────────────

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

// ──────────────────────────────────────────
// Admin API Routes
// ──────────────────────────────────────────

// Update hackathon settings (admin only)
app.put('/api/admin/settings', authenticateSimpleAdmin, (req, res) => {
  const settings = req.body;

  // Update each setting
  const keys = Object.keys(settings);

  if (keys.length === 0) {
    return res.status(400).json({ error: 'No settings to update' });
  }

  let completed = 0;
  let hasError = false;

  keys.forEach(key => {
    db.run(
      "UPDATE hackathon_settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?",
      [settings[key], key],
      (err) => {
        if (err) {
          console.error(`Failed to update setting ${key}:`, err);
          if (!hasError) {
            hasError = true;
            return res.status(500).json({ error: `Failed to update setting ${key}` });
          }
        }
        completed++;

        if (completed === keys.length && !hasError) {
          res.json({ success: true, message: 'Settings updated successfully' });
        }
      }
    );
  });
});

// Get all announcements
app.get('/api/announcements', (req, res) => {
  db.all("SELECT * FROM announcements ORDER BY created_at DESC", [], (err, announcements) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(announcements);
  });
});

// Create announcement (admin only)
app.post('/api/announcements', authenticateSimpleAdmin, (req, res) => {
  const { title, content, priority } = req.body;

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }

  db.run(
    "INSERT INTO announcements (title, content, priority, created_by) VALUES (?, ?, ?, ?)",
    [title, content, priority || 'normal', req.user.id],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create announcement' });
      }

      res.json({
        id: this.lastID,
        title,
        content,
        priority: priority || 'normal',
        created_at: new Date().toISOString()
      });
    }
  );
});

// Delete announcement (admin only)
app.delete('/api/announcements/:id', authenticateSimpleAdmin, (req, res) => {
  const announcementId = req.params.id;

  db.run("DELETE FROM announcements WHERE id = ?", [announcementId], function(err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete announcement' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ success: true, message: 'Announcement deleted' });
  });
});

// Get all teams (admin only) - with member count
app.get('/api/admin/teams', authenticateSimpleAdmin, (req, res) => {
  const query = `
    SELECT
      t.id,
      t.name,
      t.topic_id,
      t.color,
      t.current_stage,
      t.status,
      t.created_at,
      COUNT(tm.user_id) as member_count
    FROM teams t
    LEFT JOIN team_members tm ON t.id = tm.team_id
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `;

  db.all(query, [], (err, teams) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(teams);
  });
});

// Create team (admin only)
app.post('/api/admin/teams', authenticateSimpleAdmin, (req, res) => {
  const { name, topic_id, color, current_stage } = req.body;

  if (!name || !topic_id) {
    return res.status(400).json({ error: 'Name and topic_id are required' });
  }

  db.run(
    "INSERT INTO teams (name, topic_id, color, current_stage) VALUES (?, ?, ?, ?)",
    [name, topic_id, color || getRandomColor(), current_stage || 1],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create team' });
      }

      res.json({
        id: this.lastID,
        name,
        topic_id,
        color,
        current_stage: current_stage || 1,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Update team (admin only)
app.put('/api/admin/teams/:id', authenticateSimpleAdmin, (req, res) => {
  const teamId = req.params.id;
  const { name, topic_id, color, current_stage, status } = req.body;

  const updates = [];
  const values = [];

  if (name !== undefined) {
    updates.push('name = ?');
    values.push(name);
  }
  if (topic_id !== undefined) {
    updates.push('topic_id = ?');
    values.push(topic_id);
  }
  if (color !== undefined) {
    updates.push('color = ?');
    values.push(color);
  }
  if (current_stage !== undefined) {
    updates.push('current_stage = ?');
    values.push(current_stage);
  }
  if (status !== undefined) {
    updates.push('status = ?');
    values.push(status);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(teamId);

  db.run(
    `UPDATE teams SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update team' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Team not found' });
      }

      res.json({ success: true, message: 'Team updated' });
    }
  );
});

// Delete team (admin only)
app.delete('/api/admin/teams/:id', authenticateSimpleAdmin, (req, res) => {
  const teamId = req.params.id;

  // Delete team members first (foreign key constraint)
  db.run("DELETE FROM team_members WHERE team_id = ?", [teamId], (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete team members' });
    }

    // Delete team stages
    db.run("DELETE FROM team_stages WHERE team_id = ?", [teamId], (err) => {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete team stages' });
      }

      // Delete the team
      db.run("DELETE FROM teams WHERE id = ?", [teamId], function(err) {
        if (err) {
          return res.status(500).json({ error: 'Failed to delete team' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Team not found' });
        }

        res.json({ success: true, message: 'Team deleted' });
      });
    });
  });
});

// Create topic (admin only)
app.post('/api/admin/topics', authenticateSimpleAdmin, (req, res) => {
  const { id, title, description, requirements } = req.body;

  if (!id || !title || !description) {
    return res.status(400).json({ error: 'ID, title, and description are required' });
  }

  db.run(
    "INSERT INTO topics (id, title, description, requirements) VALUES (?, ?, ?, ?)",
    [id, title, description, requirements || ''],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create topic (ID may already exist)' });
      }

      res.json({
        id,
        title,
        description,
        requirements,
        created_at: new Date().toISOString()
      });
    }
  );
});

// Update topic (admin only)
app.put('/api/admin/topics/:id', authenticateSimpleAdmin, (req, res) => {
  const topicId = req.params.id;
  const { title, description, requirements } = req.body;

  const updates = [];
  const values = [];

  if (title !== undefined) {
    updates.push('title = ?');
    values.push(title);
  }
  if (description !== undefined) {
    updates.push('description = ?');
    values.push(description);
  }
  if (requirements !== undefined) {
    updates.push('requirements = ?');
    values.push(requirements);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: 'No fields to update' });
  }

  values.push(topicId);

  db.run(
    `UPDATE topics SET ${updates.join(', ')} WHERE id = ?`,
    values,
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update topic' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      res.json({ success: true, message: 'Topic updated' });
    }
  );
});

// Delete topic (admin only)
app.delete('/api/admin/topics/:id', authenticateSimpleAdmin, (req, res) => {
  const topicId = req.params.id;

  // First, get all teams for this topic
  db.all("SELECT id FROM teams WHERE topic_id = ?", [topicId], (err, teams) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // Delete all related data for each team
    const teamIds = teams.map(t => t.id);

    if (teamIds.length > 0) {
      const placeholders = teamIds.map(() => '?').join(',');

      // Delete team members
      db.run(`DELETE FROM team_members WHERE team_id IN (${placeholders})`, teamIds, (err) => {
        if (err) console.error('Failed to delete team members:', err);
      });

      // Delete team stages
      db.run(`DELETE FROM team_stages WHERE team_id IN (${placeholders})`, teamIds, (err) => {
        if (err) console.error('Failed to delete team stages:', err);
      });

      // Delete teams
      db.run(`DELETE FROM teams WHERE topic_id = ?`, [topicId], (err) => {
        if (err) console.error('Failed to delete teams:', err);
      });
    }

    // Delete the topic
    db.run("DELETE FROM topics WHERE id = ?", [topicId], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to delete topic' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Topic not found' });
      }

      res.json({ success: true, message: 'Topic and all related teams deleted' });
    });
  });
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

    // Use vite's connect instance as middleware for non-API requests only
    app.use((req, res, next) => {
      // Skip Vite for API routes
      if (req.url.startsWith('/api')) {
        return next();
      }
      vite.middlewares(req, res, next);
    });

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

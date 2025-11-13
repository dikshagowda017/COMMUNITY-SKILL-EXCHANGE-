const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// ==================== DATABASE CONNECTION ====================
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "root", // your MySQL password
  database: "skillexchange"
});

db.connect(err => {
  if (err) return console.log("❌ Database connection failed:", err);
  console.log("✅ Connected to MySQL");

  // USERS TABLE
  db.query(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      bio TEXT,
      username VARCHAR(100) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      contact_number VARCHAR(30),
      location VARCHAR(100)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // SKILLS TABLE
  db.query(`
    CREATE TABLE IF NOT EXISTS skills (
      skill_id INT AUTO_INCREMENT PRIMARY KEY,
      skill_name VARCHAR(100) NOT NULL UNIQUE,
      description TEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // USER_SKILLS TABLE
  db.query(`
    CREATE TABLE IF NOT EXISTS user_skills (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      skill_id INT NOT NULL,
      can_teach BOOLEAN DEFAULT 0,
      can_learn BOOLEAN DEFAULT 0,
      experience_level VARCHAR(50),
      UNIQUE(user_id, skill_id),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
      FOREIGN KEY (skill_id) REFERENCES skills(skill_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
});

// ==================== REGISTER ====================
app.post("/register", async (req, res) => {
  try {
    console.log("📥 Incoming registration data:", req.body); // <--- add this

    const { name, email, bio, username, password, contact_number, location } = req.body;
    if (!name || !email || !username || !password)
      return res.status(400).json({ message: "Required fields missing" });

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
      `INSERT INTO users (name, email, bio, username, password_hash, contact_number, location)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, email, bio, username, hashedPassword, contact_number, location],
      (err, result) => {
        if (err) {
          console.error("❌ MySQL Error:", err);
          return res.status(500).json({ message: "Error registering user", error: err });
        }
        console.log("✅ User inserted:", result);
        res.json({ message: "✅ Registered successfully!" });
      }
    );
  } catch (error) {
    console.error("❌ Server error:", error);
    res.status(500).json({ message: "Server error", error });
  }
});

// ==================== LOGIN ====================
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, result) => {
    if (err) return res.status(500).json({ message: "Server error" });
    if (result.length === 0) return res.status(400).json({ message: "User not found" });

    const user = result[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ message: "Invalid password" });

    // Check if user has skills already
    db.query("SELECT COUNT(*) AS skillCount FROM user_skills WHERE user_id = ?", [user.user_id], (err2, countRes) => {
      if (err2) return res.status(500).json({ message: "Error checking skills" });
      const hasSkills = countRes[0].skillCount > 0;
      res.json({ message: "✅ Login successful", user_id: user.user_id, hasSkills });
    });
  });
});

// ADD SKILL 
app.post("/add-skill", (req, res) => {
  const { user_id, teachSkill, learnSkill } = req.body;

  if (!user_id) return res.status(400).json({ message: "User ID missing" });
  if (!teachSkill && !learnSkill)
    return res.status(400).json({ message: "At least one skill required" });

  function getOrAddSkill(skill_name, description, callback) {
    db.query("SELECT skill_id FROM skills WHERE skill_name = ?", [skill_name], (err, result) => {
      if (err) return callback(err);
      if (result.length > 0) return callback(null, result[0].skill_id);
      db.query(
        "INSERT INTO skills (skill_name, description) VALUES (?, ?)",
        [skill_name, description || null],
        (err2, res2) => {
          if (err2) return callback(err2);
          callback(null, res2.insertId);
        }
      );
    });
  }

  // Add or update user skill entry
  function updateUserSkill(user_id, skill_id, type, experience_level, callback) {
    const fieldToUpdate = type === "Teach" ? "can_teach" : "can_learn";
    db.query(
      `INSERT INTO user_skills (user_id, skill_id, ${fieldToUpdate}, experience_level)
       VALUES (?, ?, 1, ?)
       ON DUPLICATE KEY UPDATE ${fieldToUpdate} = 1, experience_level = VALUES(experience_level)`,
      [user_id, skill_id, experience_level || null],
      callback
    );
  }

  // Sequentially add learn + teach skills
  const tasks = [];

  if (teachSkill) {
    tasks.push(callback => {
      getOrAddSkill(teachSkill.skill_name, teachSkill.description, (err, skill_id) => {
        if (err) return callback(err);
        updateUserSkill(user_id, skill_id, "Teach", teachSkill.experience_level, callback);
      });
    });
  }

  if (learnSkill) {
    tasks.push(callback => {
      getOrAddSkill(learnSkill.skill_name, learnSkill.description, (err, skill_id) => {
        if (err) return callback(err);
        updateUserSkill(user_id, skill_id, "Learn", learnSkill.experience_level, callback);
      });
    });
  }

  // Execute both
  let completed = 0;
  tasks.forEach(task => {
    task(err => {
      if (err) return res.status(500).json({ message: "Error adding skill", error: err });
      completed++;
      if (completed === tasks.length)
        res.json({ message: "✅ Skill(s) added successfully!" });
    });
  });
});

// ==================== GET ALL SKILLS ====================
app.get("/skills", (req, res) => {
  const query = `
    SELECT 
      u.name AS user_name, 
      s.skill_name, 
      s.description,
      us.can_teach, 
      us.can_learn, 
      us.experience_level
    FROM user_skills us
    JOIN users u ON us.user_id = u.user_id
    JOIN skills s ON us.skill_id = s.skill_id;
  `;

  db.query(query, (err, result) => {
    if (err) {
      console.error("❌ Error fetching skills:", err);
      return res.status(500).json({ message: "Error fetching skills", error: err });
    }
    res.json(result);
  });
});

// ==================== USER DASHBOARD DATA ====================
app.get("/dashboard/:user_id", (req, res) => {
  const user_id = req.params.user_id;

  const userQuery = `SELECT name, email, username FROM users WHERE user_id = ?`;
  const skillQuery = `
    SELECT s.skill_name, us.can_teach, us.can_learn
    FROM user_skills us
    JOIN skills s ON us.skill_id = s.skill_id
    WHERE us.user_id = ?;
  `;
  const exploreQuery = `
    SELECT 
      u.name AS user_name, 
      s.skill_name,
      CASE 
        WHEN us.can_teach = 1 THEN 'Teach' 
        WHEN us.can_learn = 1 THEN 'Learn'
      END AS type
    FROM user_skills us
    JOIN users u ON us.user_id = u.user_id
    JOIN skills s ON us.skill_id = s.skill_id
    WHERE us.user_id != ?;
  `;

  // Fetch user info
  db.query(userQuery, [user_id], (err, userResult) => {
    if (err) {
      console.error("❌ Error fetching user:", err);
      return res.status(500).json({ message: "Error fetching user" });
    }
    if (userResult.length === 0)
      return res.status(404).json({ message: "User not found" });

    // Fetch user's skills
    db.query(skillQuery, [user_id], (err2, skillResult) => {
      if (err2) {
        console.error("❌ Error fetching user skills:", err2);
        return res.status(500).json({ message: "Error fetching user skills" });
      }

      // Fetch explore data
      db.query(exploreQuery, [user_id], (err3, exploreResult) => {
        if (err3) {
          console.error("❌ Error fetching explore data:", err3);
          return res.status(500).json({ message: "Error fetching explore data" });
        }

        const teachSkills = skillResult.filter(s => s.can_teach).map(s => s.skill_name);
        const learnSkills = skillResult.filter(s => s.can_learn).map(s => s.skill_name);

        res.json({
          user: userResult[0],
          teachSkills,
          learnSkills,
          explore: exploreResult
        });
      });
    });
  });
});

// ==================== START SERVER ====================
app.listen(3000, () => console.log("🚀 Server running on http://localhost:3000"));

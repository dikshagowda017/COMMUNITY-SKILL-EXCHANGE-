CREATE DATABASE  IF NOT EXISTS skillexchange;
USE skillexchange;
SELECT * FROM users;
SELECT * FROM skills;
SELECT * FROM user_skills;
SHOW TABLES;
DESC users;
ALTER TABLE user_skills
DROP COLUMN skill_type,
ADD COLUMN can_teach BOOLEAN DEFAULT 0,
ADD COLUMN can_learn BOOLEAN DEFAULT 0;


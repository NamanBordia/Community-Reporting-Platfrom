-- Community Reporting Platform Database Setup
-- MySQL Database Schema

-- Create database
CREATE DATABASE IF NOT EXISTS community_reporting;
USE community_reporting;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    role VARCHAR(20) DEFAULT 'resident',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role),
    INDEX idx_created_at (created_at)
);

-- Issues table
CREATE TABLE IF NOT EXISTS issues (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    issue_type VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'submitted',
    priority VARCHAR(20) DEFAULT 'medium',
    latitude FLOAT NOT NULL,
    longitude FLOAT NOT NULL,
    address VARCHAR(255),
    image_url VARCHAR(500),
    reporter_id INT NOT NULL,
    assigned_to VARCHAR(100),
    estimated_resolution_date DATE,
    actual_resolution_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_status (status),
    INDEX idx_issue_type (issue_type),
    INDEX idx_priority (priority),
    INDEX idx_reporter_id (reporter_id),
    INDEX idx_created_at (created_at),
    INDEX idx_location (latitude, longitude)
);

-- Comments table
CREATE TABLE IF NOT EXISTS comments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    content TEXT NOT NULL,
    issue_id INT NOT NULL,
    author_id INT NOT NULL,
    is_admin_comment BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_issue_id (issue_id),
    INDEX idx_author_id (author_id),
    INDEX idx_created_at (created_at)
);

-- Upvotes table
CREATE TABLE IF NOT EXISTS upvotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id INT NOT NULL,
    user_id INT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_issue_upvote (issue_id, user_id),
    INDEX idx_issue_id (issue_id),
    INDEX idx_user_id (user_id)
);

-- Admins table
CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO users (email, password_hash, first_name, last_name, role) VALUES
('admin@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge', 'Admin', 'User', 'admin'),
('resident1@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge', 'John', 'Doe', 'resident'),
('resident2@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/RK.s5u.Ge', 'Jane', 'Smith', 'resident')
ON DUPLICATE KEY UPDATE email = email;

-- Insert sample issues
INSERT INTO issues (title, description, issue_type, latitude, longitude, reporter_id, address, priority) VALUES
('Large pothole on Main Street', 'There''s a large pothole on Main Street near the intersection with Oak Avenue. It''s causing damage to vehicles.', 'pothole', 40.7128, -74.0060, 2, 'Main Street & Oak Avenue', 'high'),
('Broken street light', 'Street light is not working on Elm Street. It''s been dark for several days.', 'streetlight', 40.7130, -74.0062, 3, 'Elm Street', 'medium'),
('Garbage not collected', 'Garbage bins were not collected on Tuesday. Bins are overflowing.', 'garbage', 40.7125, -74.0058, 2, 'Maple Street', 'medium')
ON DUPLICATE KEY UPDATE title = title;

-- Create indexes for better performance
CREATE INDEX idx_issues_status_type ON issues(status, issue_type);
CREATE INDEX idx_issues_reporter_status ON issues(reporter_id, status);
CREATE INDEX idx_comments_issue_created ON comments(issue_id, created_at);
CREATE INDEX idx_upvotes_issue_count ON upvotes(issue_id);

-- Create views for common queries
CREATE OR REPLACE VIEW issue_summary AS
SELECT 
    i.id,
    i.title,
    i.issue_type,
    i.status,
    i.priority,
    i.created_at,
    i.latitude,
    i.longitude,
    u.first_name,
    u.last_name,
    u.email as reporter_email,
    COUNT(c.id) as comment_count,
    COUNT(up.id) as upvote_count
FROM issues i
JOIN users u ON i.reporter_id = u.id
LEFT JOIN comments c ON i.id = c.issue_id
LEFT JOIN upvotes up ON i.id = up.issue_id
GROUP BY i.id;

-- Create stored procedure for issue statistics
DELIMITER //
CREATE PROCEDURE GetIssueStats(IN user_id_param INT)
BEGIN
    SELECT 
        COUNT(*) as total_issues,
        SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) as submitted_count,
        SUM(CASE WHEN status IN ('verified', 'in_progress') THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status IN ('resolved', 'closed') THEN 1 ELSE 0 END) as resolved_count,
        AVG(CASE WHEN actual_resolution_date IS NOT NULL 
            THEN DATEDIFF(actual_resolution_date, created_at) 
            ELSE NULL END) as avg_resolution_days
    FROM issues 
    WHERE reporter_id = user_id_param;
END //
DELIMITER ;

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON community_reporting.* TO 'community_user'@'localhost';
-- FLUSH PRIVILEGES; 
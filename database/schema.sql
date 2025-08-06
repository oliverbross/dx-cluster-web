-- DX Cluster Web Application Database Schema
-- Created: 2025-08-01

-- Users table for authentication and basic info
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    callsign VARCHAR(20) NOT NULL UNIQUE,
    email VARCHAR(255),
    password_hash VARCHAR(255),
    wavelog_api_key VARCHAR(255),
    wavelog_url VARCHAR(255),
    wavelog_logbook_slug VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- User preferences and settings
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    preference_key VARCHAR(100) NOT NULL,
    preference_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preference (user_id, preference_key)
);

-- DX Clusters available for connection
CREATE TABLE IF NOT EXISTS dx_clusters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    host VARCHAR(255) NOT NULL,
    port INT NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- DX Spots received from clusters
CREATE TABLE IF NOT EXISTS dx_spots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    callsign VARCHAR(20) NOT NULL,
    frequency DECIMAL(10,3) NOT NULL,
    spotter VARCHAR(20) NOT NULL,
    comment TEXT,
    time_spotted TIMESTAMP NOT NULL,
    band VARCHAR(10),
    mode VARCHAR(10),
    dxcc_entity VARCHAR(100),
    grid_square VARCHAR(10),
    continent VARCHAR(5),
    cq_zone INT,
    itu_zone INT,
    cluster_source VARCHAR(100),
    is_needed BOOLEAN DEFAULT FALSE,
    logbook_status ENUM('new', 'worked', 'confirmed') DEFAULT 'new',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_callsign (callsign),
    INDEX idx_frequency (frequency),
    INDEX idx_time_spotted (time_spotted),
    INDEX idx_band (band),
    INDEX idx_is_needed (is_needed)
);

-- User sessions for WebSocket connections
CREATE TABLE IF NOT EXISTS user_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    cluster_id INT,
    is_connected BOOLEAN DEFAULT FALSE,
    last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cluster_id) REFERENCES dx_clusters(id) ON DELETE SET NULL
);

-- Insert default DX clusters (will be updated from ng3k.com)
INSERT INTO dx_clusters (name, host, port, description) VALUES
('DX Summit', 'dxc.dxsummit.fi', 8000, 'Popular DX cluster with web interface'),
('OH2AQ', 'oh2aq.kolumbus.fi', 41112, 'Finnish DX cluster'),
('VE7CC', 've7cc.net', 23, 'Canadian DX cluster'),
('W3LPL', 'w3lpl.net', 7300, 'US East Coast DX cluster'),
('K3LR', 'k3lr.com', 7300, 'US East Coast DX cluster');

-- Create indexes for better performance
CREATE INDEX idx_spots_callsign_band ON dx_spots(callsign, band);
CREATE INDEX idx_spots_time_needed ON dx_spots(time_spotted, is_needed);
CREATE INDEX idx_user_prefs_lookup ON user_preferences(user_id, preference_key);
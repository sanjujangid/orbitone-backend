-- Enable pgcrypto extension for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(100) NOT NULL DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    token_validity_hours INTEGER DEFAULT 24,
    failed_login_attempts INTEGER DEFAULT 0,
    last_failed_attempt TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Privileges table
CREATE TABLE IF NOT EXISTS privileges (
    id SERIAL PRIMARY KEY,
    privilege_name VARCHAR(255) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User privileges junction table
CREATE TABLE IF NOT EXISTS user_privileges (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    privilege_id INTEGER REFERENCES privileges(id) ON DELETE CASCADE,
    granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    granted_by INTEGER REFERENCES users(id),
    UNIQUE(user_id, privilege_id)
);

-- Login logs table
CREATE TABLE IF NOT EXISTS login_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    login_time TIMESTAMP NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Logout logs table
CREATE TABLE IF NOT EXISTS logout_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    logout_time TIMESTAMP NOT NULL,
    reason VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_user_privileges_user_id ON user_privileges(user_id);
CREATE INDEX IF NOT EXISTS idx_user_privileges_privilege_id ON user_privileges(privilege_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON login_logs(login_time);
CREATE INDEX IF NOT EXISTS idx_logout_logs_user_id ON logout_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logout_logs_logout_time ON logout_logs(logout_time);

-- Insert default privileges
INSERT INTO privileges (privilege_name, description) VALUES
('superadmin', 'Full system access'),
('admin', 'Administrative access'),
('user', 'Basic user access'),
('read', 'Read-only access'),
('write', 'Write access'),
('delete', 'Delete access')
ON CONFLICT (privilege_name) DO NOTHING;

-- Insert default superadmin user (password: admin123)
INSERT INTO users (username, email, password_hash, role, token_validity_hours) VALUES
('superadmin', 'superadmin@example.com', crypt('admin123', gen_salt('bf')), 'superadmin', 24)
ON CONFLICT (username) DO NOTHING;

-- Grant superadmin privileges to superadmin user
INSERT INTO user_privileges (user_id, privilege_id)
SELECT u.id, p.id
FROM users u, privileges p
WHERE u.username = 'superadmin' AND p.privilege_name = 'superadmin'
ON CONFLICT (user_id, privilege_id) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 
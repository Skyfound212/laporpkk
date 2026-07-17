-- Create user_logs table for activity tracking
CREATE TABLE IF NOT EXISTS user_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  action VARCHAR(50) NOT NULL CHECK (action IN ('login', 'logout', 'create', 'update', 'delete', 'view')),
  details TEXT,
  ip_address VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "User logs viewable by admin" 
  ON user_logs FOR SELECT USING (true);

CREATE POLICY "System can insert logs" 
  ON user_logs FOR INSERT WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_logs_user_id ON user_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_logs_action ON user_logs(action);
CREATE INDEX IF NOT EXISTS idx_user_logs_created_at ON user_logs(created_at DESC);

-- Function to auto-log user activity
CREATE OR REPLACE FUNCTION log_user_activity(
  p_user_id UUID,
  p_user_name VARCHAR,
  p_action VARCHAR,
  p_details TEXT DEFAULT NULL,
  p_ip_address VARCHAR DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO user_logs (user_id, user_name, action, details, ip_address)
  VALUES (p_user_id, p_user_name, p_action, p_details, p_ip_address);
END;
$$ LANGUAGE plpgsql;

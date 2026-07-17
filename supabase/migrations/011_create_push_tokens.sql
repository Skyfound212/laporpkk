-- Create push_tokens table for Expo push notifications
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform VARCHAR(20) DEFAULT 'android',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own token" 
  ON push_tokens FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token" 
  ON push_tokens FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own token" 
  ON push_tokens FOR UPDATE USING (auth.uid() = user_id);

CREATE TRIGGER update_push_tokens_updated_at 
  BEFORE UPDATE ON push_tokens 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

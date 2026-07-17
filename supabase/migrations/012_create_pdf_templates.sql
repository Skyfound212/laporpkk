-- 010_create_pdf_templates.sql
CREATE TABLE IF NOT EXISTS pdf_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  style_type VARCHAR(20) NOT NULL CHECK (style_type IN ('formal', 'modern', 'minimalis')),
  is_active BOOLEAN DEFAULT false,
  header_text VARCHAR(500) DEFAULT '',
  footer_text VARCHAR(500) DEFAULT '',
  show_logo BOOLEAN DEFAULT true,
  show_signature BOOLEAN DEFAULT true,
  signature_label VARCHAR(100) DEFAULT 'Ketua PKK',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Only one template can be active at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_pdf_templates_active ON pdf_templates (is_active) WHERE is_active = true;

-- RLS
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PDF templates are viewable by everyone"
  ON pdf_templates FOR SELECT USING (true);

CREATE POLICY "Only admin can manage PDF templates"
  ON pdf_templates FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Trigger to ensure only one active template
CREATE OR REPLACE FUNCTION ensure_single_active_template()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE pdf_templates SET is_active = false WHERE id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS single_active_template ON pdf_templates;
CREATE TRIGGER single_active_template
  BEFORE INSERT OR UPDATE ON pdf_templates
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_active_template();

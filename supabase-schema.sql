-- Create design_tokens table
CREATE TABLE design_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('color', 'typography', 'spacing', 'border-radius', 'shadow')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_design_tokens_type ON design_tokens(type);
CREATE INDEX idx_design_tokens_name ON design_tokens(name);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_design_tokens_updated_at 
    BEFORE UPDATE ON design_tokens 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE design_tokens ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations for now (you can restrict this later)
CREATE POLICY "Allow all operations on design_tokens" ON design_tokens
    FOR ALL USING (true);

-- Insert some sample data
INSERT INTO design_tokens (name, value, type, description) VALUES
('primary-blue', '#3B82F6', 'color', 'Primary brand color'),
('secondary-gray', '#6B7280', 'color', 'Secondary text color'),
('spacing-sm', '8px', 'spacing', 'Small spacing value'),
('spacing-md', '16px', 'spacing', 'Medium spacing value'),
('spacing-lg', '24px', 'spacing', 'Large spacing value'),
('border-radius-sm', '4px', 'border-radius', 'Small border radius'),
('heading-large', '24px/1.2 "Inter", sans-serif', 'typography', 'Large heading style'),
('shadow-soft', '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 'shadow', 'Soft drop shadow');

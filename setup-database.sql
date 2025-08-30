-- Setup script for Ace Prep Panel Database
-- Run this in your Supabase SQL Editor

-- 1. Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('resume', 'job_description', 'supporting_document')),
  file_path TEXT NOT NULL,
  file_size INTEGER,
  content_text TEXT,
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create document_sessions table
CREATE TABLE IF NOT EXISTS public.document_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create session_documents junction table
CREATE TABLE IF NOT EXISTS public.session_documents (
  session_id UUID NOT NULL REFERENCES public.document_sessions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  PRIMARY KEY (session_id, document_id)
);

-- 4. Enable Row Level Security
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_documents ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies (drop existing ones first to avoid conflicts)
DROP POLICY IF EXISTS "Users can manage own documents" ON public.documents;
CREATE POLICY "Users can manage own documents" ON public.documents
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own document sessions" ON public.document_sessions;
CREATE POLICY "Users can manage own document sessions" ON public.document_sessions
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own session documents" ON public.session_documents;
CREATE POLICY "Users can manage own session documents" ON public.session_documents
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.document_sessions 
    WHERE id = session_id AND user_id = auth.uid()
  )
);

-- 6. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON public.documents(type);
CREATE INDEX IF NOT EXISTS idx_document_sessions_user_id ON public.document_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_session_documents_session_id ON public.session_documents(session_id);
CREATE INDEX IF NOT EXISTS idx_session_documents_document_id ON public.session_documents(document_id);

-- 7. Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 8. Create triggers for timestamp updates
DROP TRIGGER IF EXISTS update_documents_updated_at ON public.documents;
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_sessions_updated_at ON public.document_sessions;
CREATE TRIGGER update_document_sessions_updated_at
  BEFORE UPDATE ON public.document_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Grant necessary permissions
GRANT ALL ON public.documents TO authenticated;
GRANT ALL ON public.document_sessions TO authenticated;
GRANT ALL ON public.session_documents TO authenticated;

-- 10. Insert some sample data for testing
INSERT INTO public.document_sessions (id, user_id, name, description) 
VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users LIMIT 1),
  'Sample Interview Session',
  'A sample session for testing the document management system'
) ON CONFLICT DO NOTHING;

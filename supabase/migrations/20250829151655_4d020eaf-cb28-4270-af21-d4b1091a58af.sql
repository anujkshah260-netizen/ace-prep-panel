-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  role TEXT DEFAULT 'Data Engineer',
  experience_years INTEGER DEFAULT 7,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view own profile" ON public.profiles
FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = id);

-- Create topics table (the categories like Kafka, AWS, etc.)
CREATE TABLE public.topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  category TEXT DEFAULT 'Technical',
  icon_name TEXT DEFAULT 'code',
  color TEXT DEFAULT 'blue',
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, slug)
);

-- Enable RLS on topics
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;

-- Create policies for topics
CREATE POLICY "Users can manage own topics" ON public.topics
FOR ALL USING (auth.uid() = user_id);

-- Create content versions table (stores AI-generated content)
CREATE TABLE public.topic_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_notes TEXT,
  bullets JSONB DEFAULT '[]',
  script TEXT,
  cross_questions JSONB DEFAULT '[]',
  meta JSONB DEFAULT '{}',
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on content versions
ALTER TABLE public.topic_content_versions ENABLE ROW LEVEL SECURITY;

-- Create policies for content versions
CREATE POLICY "Users can manage own content versions" ON public.topic_content_versions
FOR ALL USING (auth.uid() = user_id);

-- Create current version pointer table
CREATE TABLE public.topic_current_version (
  topic_id UUID PRIMARY KEY REFERENCES public.topics(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES public.topic_content_versions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on current version
ALTER TABLE public.topic_current_version ENABLE ROW LEVEL SECURITY;

-- Create policies for current version
CREATE POLICY "Users can manage own current versions" ON public.topic_current_version
FOR ALL USING (auth.uid() = user_id);

-- Create function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data ->> 'full_name', new.email),
    'Data Engineer'
  );
  RETURN new;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_topics_updated_at
  BEFORE UPDATE ON public.topics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default topics for new users
INSERT INTO public.topics (user_id, title, slug, category, icon_name, color, sort_order) VALUES
-- These will be created for demo purposes, but in real app they'd be created per user
('00000000-0000-0000-0000-000000000000', 'Introduction & Summary', 'introduction-summary', 'Behavioral', 'user', 'blue', 1),
('00000000-0000-0000-0000-000000000000', 'Apache Kafka', 'apache-kafka', 'Technical', 'zap', 'orange', 2),
('00000000-0000-0000-0000-000000000000', 'Apache Spark', 'apache-spark', 'Technical', 'flame', 'red', 3),
('00000000-0000-0000-0000-000000000000', 'Python', 'python', 'Programming', 'code', 'green', 4),
('00000000-0000-0000-0000-000000000000', 'AWS', 'aws', 'Cloud', 'cloud', 'yellow', 5),
('00000000-0000-0000-0000-000000000000', 'Azure', 'azure', 'Cloud', 'cloud', 'blue', 6),
('00000000-0000-0000-0000-000000000000', 'Databases', 'databases', 'Technical', 'database', 'purple', 7),
('00000000-0000-0000-0000-000000000000', 'Security & Compliance', 'security-compliance', 'Technical', 'shield', 'red', 8),
('00000000-0000-0000-0000-000000000000', 'CI/CD & DevOps', 'cicd-devops', 'Technical', 'git-branch', 'indigo', 9),
('00000000-0000-0000-0000-000000000000', 'Real-time vs Batch Processing', 'realtime-batch', 'Architecture', 'activity', 'pink', 10)
ON CONFLICT (user_id, slug) DO NOTHING;
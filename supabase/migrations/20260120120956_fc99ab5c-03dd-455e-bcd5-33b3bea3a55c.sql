-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notebooks table
CREATE TABLE public.notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL DEFAULT '未命名笔记本',
  description TEXT,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'generating', 'completed')),
  result_pdf_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create messages table for chat history
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create files table for uploaded files
CREATE TABLE public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES public.notebooks(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Notebooks policies
CREATE POLICY "Users can view their own notebooks"
ON public.notebooks FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can view featured notebooks"
ON public.notebooks FOR SELECT
USING (is_featured = true);

CREATE POLICY "Users can create their own notebooks"
ON public.notebooks FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notebooks"
ON public.notebooks FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notebooks"
ON public.notebooks FOR DELETE
USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in their notebooks"
ON public.messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.notebooks
    WHERE notebooks.id = messages.notebook_id
    AND notebooks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create messages in their notebooks"
ON public.messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.notebooks
    WHERE notebooks.id = messages.notebook_id
    AND notebooks.user_id = auth.uid()
  )
);

-- Files policies
CREATE POLICY "Users can view files in their notebooks"
ON public.files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.notebooks
    WHERE notebooks.id = files.notebook_id
    AND notebooks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can upload files to their notebooks"
ON public.files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.notebooks
    WHERE notebooks.id = files.notebook_id
    AND notebooks.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete files from their notebooks"
ON public.files FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.notebooks
    WHERE notebooks.id = files.notebook_id
    AND notebooks.user_id = auth.uid()
  )
);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notebooks_updated_at
BEFORE UPDATE ON public.notebooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('uploads', 'uploads', true);

-- Storage policies
CREATE POLICY "Users can upload files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'uploads' AND auth.uid() IS NOT NULL);

CREATE POLICY "Public can view files"
ON storage.objects FOR SELECT
USING (bucket_id = 'uploads');

CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
USING (bucket_id = 'uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
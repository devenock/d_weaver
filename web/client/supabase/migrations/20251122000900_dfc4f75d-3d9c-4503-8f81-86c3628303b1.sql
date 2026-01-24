-- Create diagrams table for saving user diagrams
CREATE TABLE public.diagrams (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  diagram_type TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.diagrams ENABLE ROW LEVEL SECURITY;

-- Policies for diagrams
CREATE POLICY "Users can view their own diagrams"
  ON public.diagrams FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own diagrams"
  ON public.diagrams FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own diagrams"
  ON public.diagrams FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own diagrams"
  ON public.diagrams FOR DELETE
  USING (auth.uid() = user_id);

-- Create collaboration_sessions table for real-time editing
CREATE TABLE public.collaboration_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diagram_id UUID REFERENCES public.diagrams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  cursor_position JSONB,
  last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(diagram_id, user_id)
);

ALTER TABLE public.collaboration_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view collaboration sessions for diagrams they can access"
  ON public.collaboration_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.diagrams d 
      WHERE d.id = diagram_id 
      AND (d.user_id = auth.uid() OR d.is_public = true)
    )
  );

CREATE POLICY "Users can create collaboration sessions"
  ON public.collaboration_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collaboration sessions"
  ON public.collaboration_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collaboration sessions"
  ON public.collaboration_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for collaboration
ALTER PUBLICATION supabase_realtime ADD TABLE public.diagrams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaboration_sessions;

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_diagrams_updated_at
  BEFORE UPDATE ON public.diagrams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
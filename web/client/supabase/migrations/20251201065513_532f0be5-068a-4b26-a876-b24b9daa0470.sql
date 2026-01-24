-- Create comments table for diagram feedback
CREATE TABLE public.comments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  diagram_id uuid NOT NULL REFERENCES public.diagrams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  comment_text text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create policies for comments
CREATE POLICY "Anyone can view comments on public diagrams"
ON public.comments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.diagrams 
    WHERE diagrams.id = comments.diagram_id 
    AND (diagrams.is_public = true OR diagrams.user_id = auth.uid())
  )
);

CREATE POLICY "Authenticated users can create comments"
ON public.comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
ON public.comments
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
ON public.comments
FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON public.comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
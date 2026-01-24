-- Create storage bucket for diagram images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('diagrams', 'diagrams', true);

-- Add image_url column to diagrams table
ALTER TABLE public.diagrams 
ADD COLUMN image_url TEXT;

-- Storage policies for diagram images
CREATE POLICY "Users can upload their own diagram images"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'diagrams' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own diagram images"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'diagrams' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own diagram images"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'diagrams' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Diagram images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'diagrams');
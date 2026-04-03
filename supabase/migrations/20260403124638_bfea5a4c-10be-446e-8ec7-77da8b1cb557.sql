
-- Create atestados storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('atestados', 'atestados', false)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to atestados bucket
CREATE POLICY "Authenticated can upload atestados"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'atestados');

-- Allow authenticated users to view atestados files
CREATE POLICY "Authenticated can view atestados"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'atestados');

-- Allow admins/consultores to delete atestados files
CREATE POLICY "Admins can delete atestados files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'atestados' AND (
  public.has_role(auth.uid(), 'admin_master'::public.app_role) OR 
  public.has_role(auth.uid(), 'consultor'::public.app_role)
));

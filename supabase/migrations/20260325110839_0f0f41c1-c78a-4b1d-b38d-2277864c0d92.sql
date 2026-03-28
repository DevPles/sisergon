-- Create storage bucket for contract documents
INSERT INTO storage.buckets (id, name, public) VALUES ('contratos', 'contratos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for contratos bucket
CREATE POLICY "Authenticated users can upload contract files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'contratos');

CREATE POLICY "Authenticated users can view contract files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'contratos');

CREATE POLICY "Admins can delete contract files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'contratos' AND (
  EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin_master', 'consultor'))
));
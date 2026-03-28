
ALTER TABLE public.form_templates 
  ADD COLUMN IF NOT EXISTS is_default boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS replaced_by uuid REFERENCES public.form_templates(id),
  ADD COLUMN IF NOT EXISTS last_used_at timestamp with time zone;

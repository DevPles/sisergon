
-- Fix permissive RLS policies

-- Drop the overly permissive checklist insert policy
DROP POLICY IF EXISTS "Authenticated can insert checklists" ON public.checklists;
CREATE POLICY "Authenticated can insert own checklists" ON public.checklists FOR INSERT TO authenticated WITH CHECK (auth.uid() = filled_by);

-- Drop the overly permissive action_plans insert policy
DROP POLICY IF EXISTS "Authenticated can insert action_plans from assessments" ON public.action_plans;

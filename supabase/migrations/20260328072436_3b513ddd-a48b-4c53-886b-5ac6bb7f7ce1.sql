ALTER TABLE public.faturamento 
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_link text,
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_status text,
  ADD COLUMN IF NOT EXISTS numero_fatura text,
  ADD COLUMN IF NOT EXISTS metodo_pagamento text;

ALTER TABLE public.empresa_pagamentos
  ADD COLUMN IF NOT EXISTS mp_payment_id text,
  ADD COLUMN IF NOT EXISTS mp_payment_link text,
  ADD COLUMN IF NOT EXISTS mp_preference_id text,
  ADD COLUMN IF NOT EXISTS mp_status text,
  ADD COLUMN IF NOT EXISTS numero_fatura text,
  ADD COLUMN IF NOT EXISTS metodo_pagamento text;

-- Update all user passwords to '123456'
-- The password is hashed using bcrypt with Supabase's default format
UPDATE auth.users SET encrypted_password = crypt('123456', gen_salt('bf')) WHERE id IN (
  '88aeb925-a9e3-4e8a-99aa-1c311bda0658',
  'ffc24772-9a6d-4203-a155-5cceea884b3e',
  '67a7c034-5e69-4098-9f50-765610fdb24e',
  '5291eef9-0bd3-4d6e-982c-50bc688e0fcf',
  '8a8303fd-827a-4353-9dc1-6901e1486457',
  'ca5bcceb-6b76-4b0b-ace5-59a9e50f004d'
);

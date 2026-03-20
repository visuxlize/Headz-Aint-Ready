-- Run BEFORE migrate-roles.sql to see barbers without a linked staff user and how many
-- appointments reference them (those rows are deleted by migrate-roles unless you set user_id first).

-- Schema: appointments.barber_id → barbers.id (pre-migration)
SELECT
  b.id AS barber_profile_id,
  b.name,
  b.email,
  b.user_id,
  COUNT(a.id) AS appointment_count
FROM public.barbers b
LEFT JOIN public.appointments a ON a.barber_id = b.id
WHERE b.user_id IS NULL
GROUP BY b.id, b.name, b.email, b.user_id
ORDER BY appointment_count DESC;

-- To link a barber to their Supabase login (public.users id = auth user id):
-- UPDATE public.barbers SET user_id = '<uuid-from-public.users>' WHERE id = '<barber_profile_uuid>';
-- Find staff UUIDs: SELECT id, email FROM public.users ORDER BY email;

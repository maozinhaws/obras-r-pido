GRANT SELECT, INSERT, UPDATE, DELETE ON public.backups TO authenticated;
GRANT ALL ON public.backups TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

CREATE POLICY "backups own row delete" ON public.backups
  FOR DELETE TO authenticated
  USING (email = lower((auth.jwt() ->> 'email')));

CREATE POLICY "profiles self delete" ON public.profiles
  FOR DELETE TO authenticated
  USING (auth.uid() = id);
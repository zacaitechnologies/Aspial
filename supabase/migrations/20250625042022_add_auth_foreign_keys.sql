-- Function to sync auth.users changes to public.user
CREATE OR REPLACE FUNCTION public.handle_auth_user_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.user (supabase_id, email, created_at)
    VALUES (NEW.id, NEW.email, NEW.created_at)
    ON CONFLICT (supabase_id) 
    DO UPDATE SET 
      email = EXCLUDED.email,
      created_at = EXCLUDED.created_at;
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.user SET
      email = NEW.email,
      updated_at = NOW()
    WHERE supabase_id = NEW.id;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to sync public.user changes back to auth.users
CREATE OR REPLACE FUNCTION public.handle_public_user_sync()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users SET
    email = NEW.email,
    updated_at = NOW()
  WHERE id = NEW.supabase_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP TRIGGER IF EXISTS on_public_user_updated ON public.user;

-- Trigger: auth.users → public.user (INSERT and UPDATE)
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_sync();

CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW 
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.handle_auth_user_sync();

-- Trigger: public.user → auth.users (UPDATE only)
CREATE TRIGGER on_public_user_updated
  AFTER UPDATE ON public.user
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION public.handle_public_user_sync();
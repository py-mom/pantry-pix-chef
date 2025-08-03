-- Fix the handle_new_user function to prevent duplicate role insertions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_count integer;
  role_exists boolean;
BEGIN
  -- Insert profile record (if not exists)
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'display_name')
  ON CONFLICT (user_id) DO NOTHING;
  
  -- Check if user already has a role
  SELECT EXISTS(
    SELECT 1 FROM public.user_roles WHERE user_id = NEW.id
  ) INTO role_exists;
  
  -- Only assign role if user doesn't have one
  IF NOT role_exists THEN
    -- Check if this is the first user
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    -- Assign admin role to first user, regular user role to others
    IF user_count = 1 THEN
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'admin');
    ELSE
      INSERT INTO public.user_roles (user_id, role)
      VALUES (NEW.id, 'user');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;
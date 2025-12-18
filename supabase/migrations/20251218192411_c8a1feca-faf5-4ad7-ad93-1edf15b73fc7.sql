-- Create weekly_staples table for persisting user's weekly staples
CREATE TABLE public.weekly_staples (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Enable Row Level Security
ALTER TABLE public.weekly_staples ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own weekly staples" 
ON public.weekly_staples 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own weekly staples" 
ON public.weekly_staples 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own weekly staples" 
ON public.weekly_staples 
FOR DELETE 
USING (auth.uid() = user_id);
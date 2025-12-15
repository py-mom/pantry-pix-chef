-- Create inventory_items table
CREATE TABLE public.inventory_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'produce',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shopping_list_items table
CREATE TABLE public.shopping_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'produce',
  bought BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for inventory_items
CREATE POLICY "Users can view their own inventory" 
ON public.inventory_items FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory" 
ON public.inventory_items FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory" 
ON public.inventory_items FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory" 
ON public.inventory_items FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for shopping_list_items
CREATE POLICY "Users can view their own shopping list" 
ON public.shopping_list_items FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping list items" 
ON public.shopping_list_items FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping list items" 
ON public.shopping_list_items FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping list items" 
ON public.shopping_list_items FOR DELETE 
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_inventory_items_updated_at
BEFORE UPDATE ON public.inventory_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shopping_list_items_updated_at
BEFORE UPDATE ON public.shopping_list_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
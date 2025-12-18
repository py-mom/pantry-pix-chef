-- Drop the restrictive policies and recreate as permissive for shopping_list_items
DROP POLICY IF EXISTS "Users can delete their own shopping list items" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Users can insert their own shopping list items" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Users can update their own shopping list items" ON public.shopping_list_items;
DROP POLICY IF EXISTS "Users can view their own shopping list" ON public.shopping_list_items;

-- Create permissive policies (default behavior)
CREATE POLICY "Users can view their own shopping list" 
ON public.shopping_list_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own shopping list items" 
ON public.shopping_list_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own shopping list items" 
ON public.shopping_list_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own shopping list items" 
ON public.shopping_list_items 
FOR DELETE 
USING (auth.uid() = user_id);

-- Also fix inventory_items policies which have the same issue
DROP POLICY IF EXISTS "Users can delete their own inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can insert their own inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can update their own inventory" ON public.inventory_items;
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.inventory_items;

CREATE POLICY "Users can view their own inventory" 
ON public.inventory_items 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own inventory" 
ON public.inventory_items 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own inventory" 
ON public.inventory_items 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own inventory" 
ON public.inventory_items 
FOR DELETE 
USING (auth.uid() = user_id);
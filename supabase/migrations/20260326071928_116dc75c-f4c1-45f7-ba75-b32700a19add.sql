
-- Update demo staff profile names for comms testing
UPDATE profiles SET full_name = 'Anna Bergström' WHERE user_id = '6755b499-e210-4b5a-92bc-3294f5d82b11' AND (full_name IS NULL OR full_name = '');
UPDATE profiles SET full_name = 'Erik Lindgren' WHERE user_id = 'b1d713ca-adaf-404b-8340-2e022305720d' AND (full_name IS NULL OR full_name = '');
UPDATE profiles SET full_name = 'Lisa Nyström' WHERE user_id = 'becb5749-b200-411c-89aa-442c72b0297f' AND (full_name IS NULL OR full_name = '');

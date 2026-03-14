-- Додає поле dietary_preferences до profiles
-- Запустіть в Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS dietary_preferences jsonb DEFAULT '{}';

-- Приклад структури:
-- {
--   "diet": "vegan",           -- none | vegetarian | vegan | pescatarian | keto | paleo
--   "allergens": ["gluten", "nuts", "dairy"],
--   "dislikes": ["гриби", "кінза"],
--   "custom_note": "без гострого"
-- }

COMMENT ON COLUMN profiles.dietary_preferences IS 'User dietary preferences: diet type, allergens, dislikes, custom notes';

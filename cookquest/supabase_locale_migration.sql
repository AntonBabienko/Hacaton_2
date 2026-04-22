-- Додає поле locale до profiles
-- Запустіть в Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS locale text DEFAULT 'en';

COMMENT ON COLUMN profiles.locale IS 'User preferred language (en or uk)';

-- Step 1: Remove all old skin ownership records
DELETE FROM user_skins;

-- Step 2: Clear all skins and re-insert only the 8 mascots
DELETE FROM skins;

-- Step 3: Insert 8 mascots (emoji field = image key for /mascots/{key}_{mood}.png)
INSERT INTO skins (name, description, emoji, price, rarity) VALUES
  ('Броколі',   'Веселий друг-овоч. Стартовий маскот!',           'broccoli',  0,    'common'),
  ('Слаймі',    'Милий зелений слайм, що тягнеться до знань',      'slime',     100,  'common'),
  ('Сирко',     'Справжній сирний магнат на твоїй кухні',          'cheese',    200,  'rare'),
  ('Перчик',    'Гострий та запальний помічник',                   'pepper',    300,  'rare'),
  ('Морозко',   'Холодний, але з теплим серцем',                   'icecream',  500,  'epic'),
  ('Пічка',     'Хранитель вогню та смаку',                        'stove',     500,  'epic'),
  ('Казанок',   'Майстер магічної кулінарії',                      'cauldron',  800,  'epic'),
  ('Лицар',     'Непереможний воїн кухні!',                        'knightpan', 1500, 'legendary');

-- Step 4: Give every user 'Броколі' for free + reset active skin to broccoli
INSERT INTO user_skins (user_id, skin_id)
SELECT p.id, s.id
FROM profiles p, skins s
WHERE s.emoji = 'broccoli';

-- Step 5: Reset everyone's active skin to broccoli
UPDATE profiles
SET current_skin_id = (SELECT id FROM skins WHERE emoji = 'broccoli' LIMIT 1);

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================
-- PROFILES
-- =====================
create table if not exists profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  username text unique not null,
  balance integer not null default 0,
  rating_score integer not null default 0,
  xp integer not null default 0,
  level integer not null default 1,
  current_skin_id uuid,
  created_at timestamptz not null default now()
);

-- =====================
-- SKINS
-- =====================
create table if not exists skins (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  emoji text not null,
  price integer not null default 100,
  rarity text not null default 'common' check (rarity in ('common', 'rare', 'epic', 'legendary')),
  created_at timestamptz not null default now()
);

-- =====================
-- USER SKINS
-- =====================
create table if not exists user_skins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  skin_id uuid references skins(id) on delete cascade not null,
  purchased_at timestamptz not null default now(),
  unique (user_id, skin_id)
);

-- =====================
-- RECIPES
-- =====================
create table if not exists recipes (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  points integer not null default 50,
  ingredients jsonb not null default '[]',
  instructions jsonb not null default '[]',
  cuisine_type text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- =====================
-- USER SAVED RECIPES
-- =====================
create table if not exists user_saved_recipes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  recipe_id uuid references recipes(id) on delete cascade not null,
  cook_count integer not null default 0,
  saved_at timestamptz not null default now(),
  unique (user_id, recipe_id)
);

-- =====================
-- BATTLES
-- =====================
create table if not exists battles (
  id uuid primary key default uuid_generate_v4(),
  recipe_id uuid references recipes(id) on delete cascade not null,
  challenger_id uuid references profiles(id) on delete cascade not null,
  opponent_id uuid references profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'in_progress', 'completed', 'declined')),
  challenger_started_at timestamptz,
  opponent_started_at timestamptz,
  challenger_finished_at timestamptz,
  opponent_finished_at timestamptz,
  challenger_time integer,
  opponent_time integer,
  challenger_quality integer,
  opponent_quality integer,
  challenger_score integer,
  opponent_score integer,
  created_at timestamptz not null default now()
);

-- =====================
-- COOKING SESSIONS
-- =====================
create table if not exists cooking_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  recipe_id uuid references recipes(id) on delete cascade not null,
  battle_id uuid references battles(id) on delete set null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  steps_photos jsonb not null default '{}',
  points_earned integer
);

-- =====================
-- FRIENDSHIPS
-- =====================
create table if not exists friendships (
  id uuid primary key default uuid_generate_v4(),
  requester_id uuid references profiles(id) on delete cascade not null,
  addressee_id uuid references profiles(id) on delete cascade not null,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id)
);

-- =====================
-- CHALLENGES
-- =====================
create table if not exists challenges (
  id uuid primary key default uuid_generate_v4(),
  cuisine text not null,
  date date not null unique,
  description text not null,
  bonus_points integer not null default 50,
  created_at timestamptz not null default now()
);

-- =====================
-- USER CHALLENGE COMPLETIONS
-- =====================
create table if not exists user_challenge_completions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  challenge_id uuid references challenges(id) on delete cascade not null,
  completed_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

-- =====================
-- NOTIFICATIONS
-- =====================
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('battle_invite', 'friend_request', 'battle_result', 'achievement')),
  data jsonb not null default '{}',
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

alter table profiles enable row level security;
alter table skins enable row level security;
alter table user_skins enable row level security;
alter table recipes enable row level security;
alter table user_saved_recipes enable row level security;
alter table battles enable row level security;
alter table cooking_sessions enable row level security;
alter table friendships enable row level security;
alter table challenges enable row level security;
alter table user_challenge_completions enable row level security;
alter table notifications enable row level security;

-- Profiles
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);
create policy "Users can insert own profile" on profiles for insert with check (auth.uid() = id);

-- Skins (public read)
create policy "Skins are viewable by everyone" on skins for select using (true);

-- User skins
create policy "Users can view own skins" on user_skins for select using (auth.uid() = user_id);
create policy "Users can buy skins" on user_skins for insert with check (auth.uid() = user_id);

-- Recipes
create policy "Recipes are viewable by everyone" on recipes for select using (true);
create policy "Users can create recipes" on recipes for insert with check (auth.uid() = created_by);

-- User saved recipes
create policy "Users can view own saved recipes" on user_saved_recipes for select using (auth.uid() = user_id);
create policy "Users can save recipes" on user_saved_recipes for insert with check (auth.uid() = user_id);
create policy "Users can update own saved recipes" on user_saved_recipes for update using (auth.uid() = user_id);

-- Battles
create policy "Users can view their battles" on battles for select using (auth.uid() = challenger_id or auth.uid() = opponent_id);
create policy "Users can create battles" on battles for insert with check (auth.uid() = challenger_id);
create policy "Users can update their battles" on battles for update using (auth.uid() = challenger_id or auth.uid() = opponent_id);

-- Cooking sessions
create policy "Users can view own sessions" on cooking_sessions for select using (auth.uid() = user_id);
create policy "Users can create sessions" on cooking_sessions for insert with check (auth.uid() = user_id);
create policy "Users can update own sessions" on cooking_sessions for update using (auth.uid() = user_id);

-- Friendships
create policy "Users can view their friendships" on friendships for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "Users can create friendship requests" on friendships for insert with check (auth.uid() = requester_id);
create policy "Users can update their friendship requests" on friendships for update using (auth.uid() = addressee_id or auth.uid() = requester_id);
create policy "Users can delete friendships" on friendships for delete using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Challenges (public read, authenticated insert for auto-generation)
create policy "Challenges are viewable by everyone" on challenges for select using (true);
create policy "Authenticated users can insert challenges" on challenges for insert to authenticated with check (true);

-- User challenge completions
create policy "Users can view own completions" on user_challenge_completions for select using (auth.uid() = user_id);
create policy "Users can complete challenges" on user_challenge_completions for insert with check (auth.uid() = user_id);

-- Notifications
create policy "Users can view own notifications" on notifications for select using (auth.uid() = user_id);
create policy "Notifications can be inserted for any user" on notifications for insert with check (true);
create policy "Users can update own notifications" on notifications for update using (auth.uid() = user_id);

-- =====================
-- SEED: SKINS
-- =====================
insert into skins (name, description, emoji, price, rarity) values
  ('Новачок', 'Стандартний кухар', '🧑‍🍳', 0, 'common'),
  ('Пірат кухні', 'Готує з пристрастю', '🏴‍☠️', 100, 'common'),
  ('Робот-шеф', 'Технологічний кухар', '🤖', 200, 'rare'),
  ('Ніндзя', 'Готує з блискавичною швидкістю', '🥷', 300, 'rare'),
  ('Клоун', 'Перетворює кухню на шоу', '🤡', 150, 'common'),
  ('Інопланетянин', 'Готує міжгалактичні рецепти', '👽', 500, 'epic'),
  ('Дракон', 'Повелитель вогню та спецій', '🐲', 750, 'epic'),
  ('Єдиноріг', 'Магічний кухар з іншого виміру', '🦄', 1000, 'legendary'),
  ('Феєрверк', 'Вибуховий смак!', '🎆', 800, 'epic'),
  ('Корона', 'Справжній король кухні', '👑', 1500, 'legendary')
on conflict do nothing;

-- =====================
-- SEED: CHALLENGES (next 7 days)
-- =====================
insert into challenges (cuisine, date, description, bonus_points)
select
  'Італійська',
  (current_date + (generate_series(0,6) || ' days')::interval)::date,
  'Приготуй будь-яку страву ' || 'Італійської' || ' кухні',
  75
on conflict (date) do nothing;

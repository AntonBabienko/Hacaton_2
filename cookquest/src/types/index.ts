export interface User {
  id: string
  username: string
  balance: number
  rating_score: number
  current_skin_id: string | null
  active_mascot: string | null
  level: number
  xp: number
  created_at: string
}

export interface RecipeStep {
  step: number
  title: string
  description: string
  requires_photo: boolean
}

export interface Recipe {
  id: string
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  ingredients: string[]
  instructions: RecipeStep[]
  cuisine_type: string
  created_at: string
}

export interface GeneratedRecipe {
  name: string
  description: string
  difficulty: 'easy' | 'medium' | 'hard'
  points: number
  ingredients: string[]
  instructions: RecipeStep[]
  cuisine_type: string
}

export interface SavedRecipe {
  id: string
  user_id: string
  recipe_id: string
  recipe: Recipe
  cook_count: number
  saved_at: string
}

export interface Battle {
  id: string
  recipe_id: string
  recipe: Recipe
  challenger_id: string
  challenger: User
  opponent_id: string
  opponent: User
  status: 'pending' | 'accepted' | 'in_progress' | 'completed'
  challenger_time?: number
  opponent_time?: number
  challenger_score?: number
  opponent_score?: number
  challenger_quality?: number
  opponent_quality?: number
  created_at: string
}

export interface Friendship {
  id: string
  requester_id: string
  addressee_id: string
  friend: User
  status: 'pending' | 'accepted'
  created_at: string
}

export interface Skin {
  id: string
  name: string
  description: string
  emoji: string
  price: number
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

export interface Challenge {
  id: string
  cuisine: string
  date: string
  description: string
  bonus_points: number
}

export interface Notification {
  id: string
  user_id: string
  type: 'battle_invite' | 'friend_request' | 'battle_result' | 'achievement'
  data: Record<string, unknown>
  read: boolean
  created_at: string
}

export interface CookingSession {
  id: string
  user_id: string
  recipe_id: string
  battle_id?: string
  started_at: string
  finished_at?: string
  steps_photos: Record<string, string>
  points_earned?: number
}

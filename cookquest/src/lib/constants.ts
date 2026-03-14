export const LEVELS = [
  { level: 1, name: 'Новачок', min_xp: 0, max_xp: 100 },
  { level: 2, name: 'Кухар-початківець', min_xp: 100, max_xp: 300 },
  { level: 3, name: 'Кухар', min_xp: 300, max_xp: 600 },
  { level: 4, name: 'Досвідчений кухар', min_xp: 600, max_xp: 1000 },
  { level: 5, name: 'Шеф-кухар', min_xp: 1000, max_xp: 1500 },
  { level: 6, name: 'Майстер кухні', min_xp: 1500, max_xp: 2500 },
  { level: 7, name: 'Гранд-майстер', min_xp: 2500, max_xp: 4000 },
  { level: 8, name: 'Легенда кухні', min_xp: 4000, max_xp: Infinity },
]

export const DIFFICULTY_LABELS = {
  easy: 'Легко',
  medium: 'Середньо',
  hard: 'Складно',
}

export const DIFFICULTY_COLORS = {
  easy: 'text-green-600 bg-green-100',
  medium: 'text-yellow-600 bg-yellow-100',
  hard: 'text-red-600 bg-red-100',
}

export const RARITY_COLORS = {
  common: 'text-gray-600 bg-gray-100',
  rare: 'text-blue-600 bg-blue-100',
  epic: 'text-purple-600 bg-purple-100',
  legendary: 'text-yellow-600 bg-yellow-100',
}

export const DIFFICULTY_POINTS: Record<string, number> = {
  easy: 50,
  medium: 100,
  hard: 200,
}

export const BATTLE_MULTIPLIER = 2.6

export const CUISINES_SCHEDULE = [
  'Італійська', 'Іспанська', 'Французька', 'Японська',
  'Мексиканська', 'Індійська', 'Тайська', 'Грецька',
  'Українська', 'Китайська', 'Американська', 'Турецька',
]

export const GROQ_VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct'
export const GROQ_TEXT_MODEL = 'llama-3.3-70b-versatile'

// Mascot shop items — `key` maps to /mascots/{key}_{mood}.png
export const MASCOT_ITEMS = [
  { key: 'broccoli', name: 'Броколі', price: 0, rarity: 'common' as const, description: 'Веселий друг-овоч. Безкоштовний стартовий маскот!' },
  { key: 'slime', name: 'Слаймі', price: 100, rarity: 'common' as const, description: 'Милий зелений слайм, що тягнеться до знань' },
  { key: 'cheese', name: 'Сирко', price: 200, rarity: 'rare' as const, description: 'Справжній сирний магнат на твоїй кухні' },
  { key: 'pepper', name: 'Перчик', price: 300, rarity: 'rare' as const, description: 'Гострий та запальний помічник' },
  { key: 'icecream', name: 'Морозко', price: 500, rarity: 'epic' as const, description: 'Холодний, але з теплим серцем' },
  { key: 'stove', name: 'Пічка', price: 500, rarity: 'epic' as const, description: 'Хранитель вогню та смаку' },
  { key: 'cauldron', name: 'Казанок', price: 800, rarity: 'epic' as const, description: 'Майстер магічної кулінарії' },
  { key: 'knightpan', name: 'Лицар', price: 1500, rarity: 'legendary' as const, description: 'Непереможний воїн кухні!' },
] as const

export const DEFAULT_MASCOT = 'broccoli'

export type MascotKey = typeof MASCOT_ITEMS[number]['key']

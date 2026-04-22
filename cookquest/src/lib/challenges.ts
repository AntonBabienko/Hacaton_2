import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { GROQ_TEXT_MODEL } from '@/lib/constants'
import { sanitizeText } from '@/lib/ai/sanitizer'
import { extractJSON, validateQuests } from '@/lib/ai/validator'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

export function buildSystemPrompt(locale: string = 'uk') {
  const isEn = locale === 'en'
  if (isEn) {
    return `You are a generator of interesting culinary quests for CookQuest.

YOUR TASK:
Create 7 unique daily quests for a given national cuisine.

RULES:
- Each quest MUST be specific: name a REAL random dish of this country (e.g. not just "Salad", but "Mexican Copil Salad"), ingredient or technique.
- Avoid generic phrases like "International dish". Be as authentic as possible to the theme.
- Description — 1 catchy sentence (up to 80 characters). Use imperative mood: "Cook...", "Boil...", "Bake...".
- Diversity: 1 breakfast, 2 main dishes, 1 dessert, 1 pastry, 2 techniques or sauces.
- bonus_points: 30–150 (depending on dish complexity).

RESPONSE FORMAT (JSON array ONLY):
[
  {"description": "Cook spicy Enchilada with Mole sauce", "bonus_points": 120}
]`
  }
  
  return `Ти — генератор цікавих кулінарних квестів для CookQuest.

ТВОЯ ЗАДАЧА:
Створити 7 унікальних щоденних квестів на задану національну кухню.

ПРАВИЛА:
- Кожен квест МАЄ бути конкретним: назви РЕАЛЬНУ випадкову страву цієї країни (наприклад, не просто "Салат", а "Мексиканський салат Копіл"), інгредієнт або техніку.
- Уникай загальних фраз типу "Міжнародна страва". Будь максимально автентичним до теми.
- Опис — 1 влучне речення (до 80 символів). Використовуй наказовий спосіб: "Приготуй...", "Звари...", "Запечи...".
- Різноманітність: 1 сніданок, 2 основні страви, 1 десерт, 1 випічка, 2 техніки або соуси.
- bonus_points: 30–150 (залежно від складності страви).

ФОРМАТ ВІДПОВІДІ (ЛИШЕ JSON масив):
[
  {"description": "Приготуй гостру Енчіладу з соусом Моле", "bonus_points": 120}
]`
}

export async function generateQuests(cuisine: string, startDate: string, locale: string = 'uk') {
  try {
    const safeCuisine = sanitizeText(String(cuisine || 'Міжнародна'))
    const isEn = locale === 'en'

    const { text } = await generateText({
      model: groq(GROQ_TEXT_MODEL),
      messages: [
        { role: 'system', content: buildSystemPrompt(locale) },
        {
          role: 'user',
          content: isEn 
            ? `Theme of the week: ${safeCuisine} cuisine. Week start date: ${startDate}. Generate 7 quests.`
            : `Тема тижня: ${safeCuisine} кухня. Дата початку тижня: ${startDate}. Згенеруй 7 квестів.`,
        },
      ],
    })

    const raw = extractJSON<any[]>(text, 'array')
    const quests = validateQuests(raw)

    return quests
  } catch (error) {
    console.error('Помилка генерації квестів:', error)
    return []
  }
}

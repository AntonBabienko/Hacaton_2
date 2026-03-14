import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { GROQ_TEXT_MODEL } from '@/lib/constants'
import { sanitizeText } from '@/lib/ai/sanitizer'
import { extractJSON, validateQuests } from '@/lib/ai/validator'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `Ти — генератор цікавих кулінарних квестів для CookQuest.

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
  {"description": "Приготуй гостру Енчіладу з соусом Моле", "bonus_points": 120},
  ...
]`

export async function generateQuests(cuisine: string, startDate: string) {
  try {
    const safeCuisine = sanitizeText(String(cuisine || 'Міжнародна'))

    const { text } = await generateText({
      model: groq(GROQ_TEXT_MODEL),
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: `Тема тижня: ${safeCuisine} кухня. Дата початку тижня: ${startDate}. Згенеруй 7 квестів.`,
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

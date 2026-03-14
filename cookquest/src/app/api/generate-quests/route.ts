import { createGroq } from '@ai-sdk/groq'
import { generateText } from 'ai'
import { GROQ_TEXT_MODEL } from '@/lib/constants'
import { sanitizeText } from '@/lib/ai/sanitizer'
import { extractJSON, validateQuests } from '@/lib/ai/validator'

const groq = createGroq({ apiKey: process.env.GROQ_API_KEY })

const SYSTEM_PROMPT = `Ти — генератор щоденних кулінарних квестів для мобільного додатку CookQuest.

ТВОЯ ЗАДАЧА:
Створити 7 унікальних щоденних квестів (по одному на кожен день тижня) на задану кухню.

ПРАВИЛА:
- Кожен квест — конкретне завдання: приготувати страву, використати інгредієнт, спробувати техніку
- Опис — 1 коротке речення (до 80 символів), від другої особи ("Приготуй...", "Зроби...", "Спробуй...")
- bonus_points: 30–50 для простих, 60–80 для середніх, 100–150 для складних завдань
- Різноманітність: сніданки, обіди, вечері, снеки, техніки
- Тільки про їжу та кулінарію — жодних сторонніх тем

ФОРМАТ ВІДПОВІДІ (ЛИШЕ JSON масив з 7 об'єктів):
[
  {"description": "Приготуй класичну пасту з томатним соусом", "bonus_points": 50},
  ...
]`

export async function POST(req: Request) {
  try {
    const { cuisine, startDate } = await req.json()
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

    if (quests.length === 0) {
      return Response.json({ error: 'Не вдалося згенерувати квести' }, { status: 500 })
    }

    return Response.json({ quests })
  } catch (error) {
    console.error('Помилка генерації квестів:', error)
    return Response.json({ error: 'Внутрішня помилка сервера' }, { status: 500 })
  }
}

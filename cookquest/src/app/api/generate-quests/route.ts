import { generateQuests } from '@/lib/challenges'

export async function POST(req: Request) {
  try {
    const { cuisine, startDate } = await req.json()
    const quests = await generateQuests(cuisine, startDate)

    if (quests.length === 0) {
      return Response.json({ error: 'Не вдалося згенерувати квести' }, { status: 500 })
    }

    return Response.json({ quests })
  } catch (error) {
    console.error('Помилка API генерації квестів:', error)
    return Response.json({ error: 'Внутрішня помилка сервера' }, { status: 500 })
  }
}

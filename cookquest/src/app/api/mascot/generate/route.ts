import { NextRequest, NextResponse } from 'next/server'

const STABILITY_BASE = 'https://api.stability.ai/v2beta/stable-image'
const GENERATE_URL = `${STABILITY_BASE}/generate/core`
const REMOVE_BG_URL = `${STABILITY_BASE}/edit/remove-background`

// ─── Catalogs (ported from axiba12-main/src/ai/prompts/mascotPrompt.js) ──────

const VALID_TYPES = ['chef', 'ingredient', 'dish', 'appliance', 'animal', 'trophy']

const MASCOT_STYLES: Record<string, { stylePreset: string; promptHint: string }> = {
  cartoon: { stylePreset: 'comic-book', promptHint: 'cartoon character design, bold outlines, clean linework, expressive features' },
  chibi:   { stylePreset: 'anime',      promptHint: 'chibi style, super deformed proportions, oversized round head, tiny body, big sparkly eyes' },
  pixel:   { stylePreset: 'pixel-art',  promptHint: 'pixel art style, retro 16-bit game sprite, crisp pixels, limited color palette' },
  flat:    { stylePreset: 'digital-art',promptHint: 'flat vector illustration, geometric shapes, minimal shadows, clean modern design' },
  '3d':    { stylePreset: '3d-model',   promptHint: '3D rendered character, smooth surfaces, studio lighting, subsurface scattering, Pixar-like quality' },
  fantasy: { stylePreset: 'fantasy-art',promptHint: 'fantasy illustration style, painterly details, magical aura, storybook quality' },
}

const MASCOT_COLORS: Record<string, string> = {
  red:     'vibrant red and white color palette',
  orange:  'warm orange and cream color palette',
  yellow:  'sunny golden yellow and warm white color palette',
  green:   'fresh bright green and mint color palette',
  blue:    'sky blue and soft white color palette',
  purple:  'royal purple and lavender color palette',
  pink:    'bubbly pastel pink and white color palette',
  brown:   'warm chocolate brown and tan color palette',
  gold:    'luxurious gold and cream color palette, premium feel',
  rainbow: 'vibrant multicolor rainbow palette, colorful and joyful',
}

const MASCOT_PERSONALITIES: Record<string, string> = {
  happy:       'cheerful expression, wide bright smile, happy crinkled eyes, positive energetic pose',
  brave:       'confident heroic pose, determined furrowed brows, chest out, strong bold stance',
  cute:        'adorable rosy cheeks, innocent wide eyes, soft gentle expression, slightly blushing',
  wise:        'thoughtful calm expression, wise knowing eyes, gentle smile, serene dignified pose',
  energetic:   'dynamic action pose, excited open mouth, radiant motion lines, full of life',
  mischievous: 'cheeky smirk, playful winking one eye, raised eyebrow, mischievous tilt of head',
}

const EMOTIONS: Record<string, string> = {
  neutral: 'calm neutral expression, relaxed composed face, subtle slight smile, no strong emotion, serene look',
  happy:   'wide bright cheerful smile, happy crinkled eyes, joyful exuberant expression, big grin, upbeat energetic pose',
  sad:     'sad drooping eyes, slight downward frown, melancholic dejected expression, slumped gentle pose, tearful glistening eyes',
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildSubjectPrompt(typeId: string, subject: string): string {
  const c = subject || null
  switch (typeId) {
    case 'chef':
      return c
        ? `cute cartoon ${c} mascot character, chef theme, wearing chef hat and apron, friendly cooking character, full body`
        : 'cute cartoon chef mascot character, wearing tall white toque blanche chef hat and double-breasted chef apron, holding a wooden ladle, friendly cooking character, full body'
    case 'ingredient':
      return `cute anthropomorphic ${c || 'tomato'} food ingredient mascot character, round body with big expressive eyes, tiny stubby arms and legs, adorable smiling face, full body`
    case 'dish':
      return `cute anthropomorphic ${c || 'bowl of borsch soup'} dish mascot character, friendly bowl or plate shape with an expressive face, tiny arms, charming cooking mascot, full body`
    case 'appliance':
      return `cute anthropomorphic ${c || 'frying pan'} kitchen appliance mascot character, cooking tool with a cute smiling face, tiny arms and personality, full body`
    case 'animal':
      return `cute ${c || 'bear'} animal chef mascot character, wearing a chef hat and apron, adorable anthropomorphic animal cooking character, full body`
    case 'trophy':
      return `cute golden ${c ? c + ' ' : ''}cooking trophy award mascot character, shiny trophy cup with a cute smiling face, wearing a tiny chef hat, achievement mascot, full body`
    default:
      return `cute ${c || 'cooking'} mascot character, kitchen theme, full body`
  }
}

function buildPrompt(params: {
  type: string; style: string; personality: string; color: string
  subjectName: string; emotion: string
}) {
  const styleCfg = MASCOT_STYLES[params.style] ?? MASCOT_STYLES.cartoon
  const colorPrompt = MASCOT_COLORS[params.color] ?? MASCOT_COLORS.orange
  const expressionHint = EMOTIONS[params.emotion] ?? MASCOT_PERSONALITIES[params.personality] ?? MASCOT_PERSONALITIES.happy
  const subjectPrompt = buildSubjectPrompt(params.type, params.subjectName)

  const prompt = [
    subjectPrompt,
    styleCfg.promptHint,
    expressionHint,
    colorPrompt,
    'pure white background',
    'solid white background only',
    'isolated character on white',
    'no background elements',
    'full body character',
    'centered composition',
    'mascot illustration',
    'no text, no letters, no watermark',
    'masterpiece, best quality, sharp clean details, high resolution',
  ].join(', ')

  const negativePrompt = [
    'background', 'colored background', 'dark background', 'gradient background',
    'textured background', 'pattern background', 'environment', 'scene', 'landscape',
    'room', 'kitchen background', 'shadow on background', 'drop shadow',
    'realistic photograph', 'photorealistic', 'photo', 'blurry', 'low quality',
    'bad anatomy', 'deformed', 'ugly', 'disfigured', 'poorly drawn', 'extra limbs',
    'multiple characters', 'text', 'letters', 'watermark', 'signature', 'logo',
    'frame', 'border', 'nsfw', 'violence', 'gore',
  ].join(', ')

  return { prompt, negativePrompt, stylePreset: styleCfg.stylePreset }
}

// ─── Stability AI pipeline ────────────────────────────────────────────────────

async function generateOne(params: {
  prompt: string; negativePrompt: string; stylePreset: string; apiKey: string
}): Promise<string> {
  // Step 1 — Generate
  const form1 = new FormData()
  form1.append('prompt', params.prompt)
  form1.append('aspect_ratio', '1:1')
  form1.append('output_format', 'png')
  form1.append('negative_prompt', params.negativePrompt)
  form1.append('style_preset', params.stylePreset)

  const res1 = await fetch(GENERATE_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${params.apiKey}`, Accept: 'image/*' },
    body: form1,
  })

  if (!res1.ok) {
    const text = await res1.text().catch(() => '')
    if (res1.status === 401 || res1.status === 403) throw new Error('Невірний Stability AI API ключ')
    if (res1.status === 402) throw new Error('Недостатньо кредитів Stability AI')
    if (res1.status === 422) throw new Error('Запит відхилено фільтром контенту')
    if (res1.status === 429) throw new Error('Забагато запитів — зачекай хвилину')
    throw new Error(`Stability AI error ${res1.status}: ${text.slice(0, 200)}`)
  }

  const imgBlob = await res1.blob()

  // Step 2 — Remove background (best-effort fallback)
  let finalBlob = imgBlob
  try {
    const form2 = new FormData()
    form2.append('image', imgBlob, 'mascot.png')
    form2.append('output_format', 'png')

    const res2 = await fetch(REMOVE_BG_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${params.apiKey}`, Accept: 'image/*' },
      body: form2,
    })
    if (res2.ok) finalBlob = await res2.blob()
  } catch {
    // keep original if bg removal fails
  }

  // Step 3 — Convert to base64 data URL
  const buffer = await finalBlob.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  return `data:image/png;base64,${base64}`
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.STABILITY_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'STABILITY_API_KEY не налаштований на сервері' }, { status: 500 })
    }

    const body = await req.json()
    const { type, style, personality, color, subjectName = '' } = body

    // Validate
    if (!VALID_TYPES.includes(type)) return NextResponse.json({ error: 'Невірний тип' }, { status: 400 })
    if (!MASCOT_STYLES[style])       return NextResponse.json({ error: 'Невірний стиль' }, { status: 400 })
    if (!MASCOT_PERSONALITIES[personality]) return NextResponse.json({ error: 'Невірний характер' }, { status: 400 })
    if (!MASCOT_COLORS[color])       return NextResponse.json({ error: 'Невірний колір' }, { status: 400 })

    const subject = String(subjectName).trim().replace(/[<>{}\[\]\\]/g, '').slice(0, 50)

    // Generate 3 emotions in parallel
    const emotions = ['neutral', 'happy', 'sad'] as const
    const results = await Promise.all(
      emotions.map(async (emotion) => {
        const { prompt, negativePrompt, stylePreset } = buildPrompt({
          type, style, personality, color, subjectName: subject, emotion,
        })
        try {
          const imageDataUrl = await generateOne({ prompt, negativePrompt, stylePreset, apiKey })
          return { emotion, imageDataUrl, success: true }
        } catch (err: any) {
          return { emotion, imageDataUrl: null, success: false, error: err.message }
        }
      })
    )

    if (!results.some(r => r.success)) {
      return NextResponse.json({ error: results[0]?.error || 'Генерація не вдалася' }, { status: 502 })
    }

    return NextResponse.json({ success: true, emotions: results })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Внутрішня помилка' }, { status: 500 })
  }
}

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import CookingSession from './cooking-session'

export default async function CookPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: session } = await supabase
    .from('cooking_sessions')
    .select('*, recipe:recipes(*)')
    .eq('id', id)
    .eq('user_id', user!.id)
    .single()

  if (!session) notFound()

  // saved_recipe lookup depends on session.recipe_id, but we already have it from the row
  const { data: savedRecipe } = await supabase
    .from('user_saved_recipes')
    .select('cook_count')
    .eq('user_id', user!.id)
    .eq('recipe_id', session.recipe_id)
    .maybeSingle()

  return (
    <CookingSession
      session={session}
      recipe={session.recipe}
      userId={user!.id}
      cookCount={savedRecipe?.cook_count || 0}
    />
  )
}

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RecipeDetail from './recipe-detail'

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: recipe } = await supabase
    .from('recipes')
    .select('*')
    .eq('id', id)
    .single()

  if (!recipe) notFound()

  const { data: savedRecipe } = await supabase
    .from('user_saved_recipes')
    .select('id, cook_count')
    .eq('user_id', user!.id)
    .eq('recipe_id', id)
    .single()

  const { data: friends } = await supabase
    .from('friendships')
    .select(`
      id,
      friend:profiles!friendships_addressee_id_fkey(id, username)
    `)
    .eq('requester_id', user!.id)
    .eq('status', 'accepted')

  return (
    <RecipeDetail
      recipe={recipe}
      userId={user!.id}
      savedRecipe={savedRecipe}
      friends={friends || []}
    />
  )
}

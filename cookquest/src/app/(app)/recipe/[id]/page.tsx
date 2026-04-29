import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import RecipeDetail from './recipe-detail'

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: recipe }, { data: savedRecipe }, { data: friends }] = await Promise.all([
    supabase.from('recipes').select('*').eq('id', id).single(),
    supabase
      .from('user_saved_recipes')
      .select('id, cook_count')
      .eq('user_id', user!.id)
      .eq('recipe_id', id)
      .single(),
    supabase
      .from('friendships')
      .select(`
        id,
        friend:profiles!friendships_addressee_id_fkey(id, username)
      `)
      .eq('requester_id', user!.id)
      .eq('status', 'accepted'),
  ])

  if (!recipe) notFound()

  return (
    <RecipeDetail
      recipe={recipe}
      userId={user!.id}
      savedRecipe={savedRecipe}
      friends={friends || []}
    />
  )
}

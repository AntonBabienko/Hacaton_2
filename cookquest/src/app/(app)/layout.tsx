import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import { DEFAULT_MASCOT } from '@/lib/constants'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const activeMascot = profile?.active_mascot || DEFAULT_MASCOT

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      <Navbar profile={profile} activeMascot={activeMascot} />
      <main className="max-w-lg mx-auto px-4 py-4 pb-nav">
        {children}
      </main>
    </div>
  )
}

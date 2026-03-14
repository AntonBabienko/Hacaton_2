import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Navbar from '@/components/layout/navbar'
import { MascotProvider } from '@/components/mascot-provider'
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

  // Derive active mascot from current_skin_id
  let activeMascot = DEFAULT_MASCOT
  if (profile?.current_skin_id) {
    const { data: skin } = await supabase
      .from('skins')
      .select('emoji')
      .eq('id', profile.current_skin_id)
      .single()
    if (skin?.emoji) activeMascot = skin.emoji
  }

  return (
    <div className="min-h-screen bg-[#0f0f23]">
      <MascotProvider mascot={activeMascot}>
        <Navbar profile={profile} activeMascot={activeMascot} />
        <main className="max-w-lg mx-auto px-4 py-4 pb-nav">
          {children}
        </main>
      </MascotProvider>
    </div>
  )
}

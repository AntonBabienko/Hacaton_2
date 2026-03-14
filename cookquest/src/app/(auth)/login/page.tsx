'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({ email, password })

      if (error) {
        toast.error('Невірний логін або пароль')
        return
      }

      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-8">
      <h2 className="text-2xl font-extrabold text-white mb-6">Вхід</h2>
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            placeholder="your@email.com"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Пароль
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors"
        >
          {loading ? 'Входимо...' : 'Увійти'}
        </button>
      </form>
      <p className="text-center text-gray-500 mt-6 text-sm">
        Ще немає акаунту?{' '}
        <Link href="/register" className="text-orange-400 font-bold hover:underline">
          Зареєструватися
        </Link>
      </p>
    </div>
  )
}

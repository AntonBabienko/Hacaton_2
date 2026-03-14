'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function RegisterPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const usernameInvalid = username.length > 0 && !/^[a-zA-Z0-9_]+$/.test(username)

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (username.length < 3) {
      toast.error("Ім'я має бути мінімум 3 символи")
      return
    }
    if (usernameInvalid) {
      toast.error("Тільки латинські літери, цифри та _")
      return
    }
    if (password.length < 6) {
      toast.error('Пароль має бути мінімум 6 символів')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()

      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase())
        .maybeSingle()

      if (existing) {
        toast.error("Це ім'я вже зайнято")
        return
      }

      const { data, error } = await supabase.auth.signUp({ email, password })

      if (error) {
        toast.error(error.message)
        return
      }

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').insert({
          id: data.user.id,
          username: username.toLowerCase(),
          balance: 0,
          rating_score: 0,
          xp: 0,
          level: 1,
        })
        if (profileError) {
          toast.error('Помилка створення профілю')
          return
        }
      }

      toast.success('Акаунт створено!')
      router.push('/')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-8">
      <h2 className="text-2xl font-extrabold text-white mb-6">Реєстрація</h2>
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Ім&apos;я користувача
          </label>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value.replace(/\s/g, '_'))}
            required
            placeholder="your_username"
            className={`w-full px-4 py-2.5 bg-white/5 border rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:border-transparent ${usernameInvalid ? 'border-red-500/50 focus:ring-red-500/50' : 'border-white/10 focus:ring-orange-500/50'}`}
          />
          <p className={`text-xs mt-1 ${usernameInvalid ? 'text-red-400' : 'text-gray-600'}`}>
            Тільки латинські літери, цифри, _
          </p>
        </div>
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
            placeholder="мінімум 6 символів"
            className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-transparent"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 hover:bg-orange-400 disabled:opacity-60 text-white font-bold py-2.5 rounded-xl transition-colors"
        >
          {loading ? 'Реєструємось...' : 'Створити акаунт'}
        </button>
      </form>
      <p className="text-center text-gray-500 mt-6 text-sm">
        Вже є акаунт?{' '}
        <Link href="/login" className="text-orange-400 font-bold hover:underline">
          Увійти
        </Link>
      </p>
    </div>
  )
}

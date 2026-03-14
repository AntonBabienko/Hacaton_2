'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Users, Search, UserPlus, Check, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import Mascot from '@/components/mascot'
import { useActiveMascot } from '@/components/mascot-provider'

interface Props {
  userId: string
  friends: any[]
  incomingRequests: any[]
  outgoingRequests: any[]
  skinMap: Record<string, string>
}

export default function FriendsContent({ userId, friends: initialFriends, incomingRequests: initialIncoming, outgoingRequests: initialOutgoing, skinMap }: Props) {
  const activeMascot = useActiveMascot()

  function getFriendMascot(friend: any): string {
    if (!friend?.current_skin_id) return 'broccoli'
    return skinMap[friend.current_skin_id] || 'broccoli'
  }
  const supabase = createClient()
  const [friends, setFriends] = useState(initialFriends)
  const [incoming, setIncoming] = useState(initialIncoming)
  const [outgoing, setOutgoing] = useState(initialOutgoing)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)

  async function searchUsers() {
    if (searchQuery.length < 2) { toast.error('Мінімум 2 символи'); return }
    setSearching(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, level, rating_score')
        .ilike('username', `%${searchQuery}%`)
        .neq('id', userId)
        .limit(10)

      setSearchResults(data || [])
    } finally {
      setSearching(false)
    }
  }

  async function sendRequest(targetId: string, username: string) {
    const { error } = await supabase.from('friendships').insert({
      requester_id: userId,
      addressee_id: targetId,
      status: 'pending',
    })
    if (error) { toast.error('Помилка'); return }

    await supabase.from('notifications').insert({
      user_id: targetId,
      type: 'friend_request',
      data: { from_id: userId },
      read: false,
    })

    setOutgoing(prev => [...prev, { id: Date.now().toString(), friend: { id: targetId, username } }])
    setSearchResults(prev => prev.filter(u => u.id !== targetId))
    toast.success(`Запит надіслано ${username}`)
  }

  async function acceptRequest(friendshipId: string, requesterId: string) {
    await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId)

    await supabase.from('friendships').insert({
      requester_id: userId,
      addressee_id: requesterId,
      status: 'accepted',
    })

    const accepted = incoming.find(r => r.id === friendshipId)
    setFriends(prev => [...prev, {
      id: friendshipId,
      friend: accepted?.requester,
    }])
    setIncoming(prev => prev.filter(r => r.id !== friendshipId))
    toast.success('Запит прийнято!')
  }

  async function rejectRequest(friendshipId: string) {
    await supabase.from('friendships').delete().eq('id', friendshipId)
    setIncoming(prev => prev.filter(r => r.id !== friendshipId))
  }

  const allKnownIds = new Set([
    ...friends.map(f => f.friend?.id || f.addressee_id),
    ...outgoing.map(f => f.friend?.id),
    ...incoming.map(f => f.requester?.id),
    userId,
  ])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 border border-blue-500/20 rounded-2xl p-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-blue-400" />
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white">Друзі</h1>
            <p className="text-xs text-gray-400">{friends.length} друзів</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-4">
        <h2 className="font-bold text-white text-sm mb-3">Знайти користувача</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchUsers()}
            placeholder="Ім'я користувача..."
            className="flex-1 px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent"
          />
          <button
            onClick={searchUsers}
            disabled={searching}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white rounded-xl transition-colors"
          >
            <Search size={16} />
          </button>
        </div>
        {searchResults.length > 0 && (
          <div className="mt-3 space-y-1">
            {searchResults.map(user => (
              <div key={user.id} className="flex items-center justify-between p-2.5 hover:bg-white/5 rounded-xl transition-colors">
                <div>
                  <p className="font-bold text-sm text-white">{user.username}</p>
                  <p className="text-[10px] text-gray-500">Рівень {user.level} • {user.rating_score} балів</p>
                </div>
                {!allKnownIds.has(user.id) ? (
                  <button
                    onClick={() => sendRequest(user.id, user.username)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs font-bold transition-colors"
                  >
                    <UserPlus size={12} />
                    Додати
                  </button>
                ) : (
                  <span className="text-[10px] text-gray-600">Вже додано</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Incoming requests */}
      {incoming.length > 0 && (
        <div className="bg-[#1a1a2e] rounded-2xl border border-orange-500/20 p-4">
          <h2 className="font-bold text-white text-sm mb-3">
            Запити в друзі ({incoming.length})
          </h2>
          <div className="space-y-1">
            {incoming.map(req => (
              <div key={req.id} className="flex items-center justify-between p-2.5">
                <p className="font-bold text-sm text-white">{req.requester?.username}</p>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => acceptRequest(req.id, req.requester?.id)}
                    className="p-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                  >
                    <Check size={14} />
                  </button>
                  <button
                    onClick={() => rejectRequest(req.id)}
                    className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing */}
      {outgoing.length > 0 && (
        <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-4">
          <h2 className="font-bold text-white text-sm mb-3">Надіслані запити</h2>
          <div className="space-y-1">
            {outgoing.map(req => (
              <div key={req.id} className="flex items-center justify-between p-2.5">
                <p className="font-bold text-sm text-white">{req.friend?.username}</p>
                <span className="text-[10px] text-gray-500 bg-white/5 px-2 py-1 rounded-full">Очікується</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends list */}
      <div className="bg-[#1a1a2e] rounded-2xl border border-white/5 p-4">
        <h2 className="font-bold text-white text-sm mb-3">Мої друзі ({friends.length})</h2>
        {friends.length === 0 ? (
          <div className="py-4">
            <Mascot name={activeMascot as any} mood="neutral" size={100} message="Знайди друзів вище!" animation="idle" />
          </div>
        ) : (
          <div className="space-y-1">
            {friends.map(f => (
              <div key={f.id} className="flex items-center gap-3 p-2.5 hover:bg-white/5 rounded-xl transition-colors">
                <div className="w-9 h-9 bg-blue-500/10 rounded-xl flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/mascots/${getFriendMascot(f.friend)}_happy.png`} alt="" width={32} height={32} className="drop-shadow-sm" />
                </div>
                <div>
                  <p className="font-bold text-sm text-white">{f.friend?.username}</p>
                  <p className="text-[10px] text-gray-500">Рівень {f.friend?.level} • 🏆 {f.friend?.rating_score}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

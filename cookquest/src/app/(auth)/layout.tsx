import { MascotStatic } from '@/components/mascot'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0f0f23] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <MascotStatic name="knightpan" mood="happy" size={140} />
          <h1 className="text-3xl font-extrabold text-orange-400 tracking-tight mt-3">COOKQUEST</h1>
          <p className="text-gray-500 mt-1 text-sm">Готуй. Змагайся. Перемагай.</p>
        </div>
        {children}
      </div>
    </div>
  )
}

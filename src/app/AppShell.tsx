'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isShop = pathname.startsWith('/shop')

  if (isShop) {
    return <main>{children}</main>
  }

  return (
    <>
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
          <Link href="/" className="text-xl font-bold mr-4">
            Agri Manager 🚜
          </Link>

          <nav className="flex flex-wrap gap-2">
            <Link href="/" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Dashboard</Link>
            <Link href="/uova" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Uova</Link>
            <Link href="/vendite" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Vendite</Link>
            <Link href="/calendario" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Calendario</Link>
            <Link href="/agenda" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Agenda</Link>
            <Link href="/spese" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Spese</Link>
            <Link href="/coltivazioni" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Coltivazioni</Link>
            <Link href="/raccolte" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Raccolte</Link>
            <Link href="/magazzino" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Magazzino</Link>
            <Link href="/prodotti" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Prodotti</Link>
            <Link href="/rettifiche" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Rettifiche</Link>
            <Link href="/clienti" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Clienti</Link>
            <Link href="/galline" className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-100 transition">Galline</Link>
          </nav>
        </div>
      </header>

      <main>{children}</main>
    </>
  )
}
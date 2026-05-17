'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isShop = pathname.startsWith('/shop')

  const [unreadCount, setUnreadCount] = useState(0)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    if (isShop) return

    loadNotifications(true)

    const interval = setInterval(() => {
      loadNotifications(false)
    }, 10000)

    return () => clearInterval(interval)
  }, [isShop])

  async function loadNotifications(firstLoad = false) {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, read, created_at')
      .eq('read', false)
      .order('created_at', { ascending: false })

    console.log('NOTIFICATIONS DATA:', data)
    console.log('NOTIFICATIONS ERROR:', error)

    if (error) return

    const count = data?.length || 0
    setUnreadCount(count)

    if (!firstLoad && count > 0) {
      setToastMessage(data?.[0]?.message || 'Nuovo ordine ricevuto')

      setTimeout(() => {
        setToastMessage('')
      }, 6000)
    }
  }

  async function markNotificationsRead() {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false)

    setUnreadCount(0)
    setToastMessage('')
  }

  if (isShop) {
    return <main>{children}</main>
  }

  return (
    <>
     {toastMessage && (
       <div className="fixed top-4 right-4 z-50 bg-green-600 text-white rounded-2xl shadow-lg p-4 max-w-sm">
         <div className="font-semibold">🔔 Nuovo ordine shop</div>
         <div className="text-sm mt-1">{toastMessage}</div>

         <a
           href="/vendite"
           className="inline-block mt-3 bg-white text-green-700 rounded px-3 py-1 text-sm font-semibold"
         >
           Vai a Vendite
         </a>
       </div>
     )}
      <header className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center gap-3">
          <Link href="/" className="text-xl font-bold mr-4">
            Agri Manager 🚜
          </Link>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={markNotificationsRead}
              className="bg-red-600 text-white rounded-lg px-3 py-2 font-semibold"
            >
              🔔 Nuovi ordini: {unreadCount}
            </button>
          )}

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
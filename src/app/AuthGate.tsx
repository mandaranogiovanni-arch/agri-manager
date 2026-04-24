'use client'

import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState<string | null>(null)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUserEmail(data.session?.user.email || null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user.email || null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function login() {
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setMessage('Email o password non corretti')
      return
    }
  }

  async function register() {
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Account creato. Controlla eventualmente la mail di conferma.')
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  if (loading) {
    return <div className="p-6">Caricamento...</div>
  }

  if (!userEmail) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border rounded-2xl p-6 max-w-sm w-full space-y-4">
          <h1 className="text-2xl font-bold">Agri Manager 🚜</h1>
          <p className="text-gray-600">Accedi al tuo gestionale.</p>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border rounded p-2"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded p-2"
          />

          <button
            onClick={login}
            className="w-full bg-green-600 text-white rounded p-2"
          >
            Accedi
          </button>

          <button
            onClick={register}
            className="w-full border rounded p-2 bg-white"
          >
            Crea account
          </button>

          {message && <p className="text-sm text-red-600">{message}</p>}
        </div>
      </main>
    )
  }

  return (
    <>
      <div className="bg-white border-b px-4 py-2 text-sm flex justify-end gap-3">
        <span>{userEmail}</span>
        <button onClick={logout} className="text-red-600">
          Esci
        </button>
      </div>
      {children}
    </>
  )
}
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

type EggRow = {
  id: string
  production_date: string
  quantity: number
  broken: number
  created_at?: string
}

export default function UovaPage() {
  const [quantity, setQuantity] = useState('')
  const [broken, setBroken] = useState('')
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState<EggRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEggProduction()
  }, [])

  async function loadEggProduction() {
    setLoading(true)

    const { data, error } = await supabase
      .from('egg_production')
      .select('*')
      .order('production_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setMessage('Errore caricamento storico ❌')
    } else {
      setRows(data || [])
    }

    setLoading(false)
  }

  async function saveEggs() {
    setMessage('')

    const qty = Number(quantity)
    const brk = Number(broken || 0)

    if (!qty || qty < 0) {
      setMessage('Inserisci un numero uova valido')
      return
    }

    if (brk < 0) {
      setMessage('Le uova rotte non possono essere negative')
      return
    }

    const { error } = await supabase.from('egg_production').insert([
      {
        production_date: new Date().toISOString().split('T')[0],
        quantity: qty,
        broken: brk,
      },
    ])

    if (error) {
      console.error(error)
      setMessage('Errore salvataggio ❌')
      return
    }

    setMessage('Salvato con successo ✅')
    setQuantity('')
    setBroken('')
    loadEggProduction()
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Produzione Uova 🥚</h1>

      <div className="border rounded-xl p-4 mb-6 space-y-3 bg-white">
        <input
          type="number"
          placeholder="Numero uova"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <input
          type="number"
          placeholder="Uova rotte"
          value={broken}
          onChange={(e) => setBroken(e.target.value)}
          className="w-full border p-2 rounded"
        />

        <button
          onClick={saveEggs}
          className="w-full bg-green-600 text-white p-2 rounded"
        >
          Salva
        </button>

        {message && <p className="text-center text-sm">{message}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Storico produzione</h2>

        {loading ? (
          <p>Caricamento...</p>
        ) : rows.length === 0 ? (
          <p>Nessun dato salvato.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((row) => (
              <div key={row.id} className="border rounded-xl p-4 bg-white">
                <div className="font-semibold">
                  Data:{' '}
                  {new Date(row.production_date).toLocaleDateString('it-IT')}
                </div>
                <div>Uova: {row.quantity}</div>
                <div>Rotte: {row.broken}</div>
                <div>Buone: {row.quantity - row.broken}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
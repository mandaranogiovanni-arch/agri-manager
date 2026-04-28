'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

type EggRow = {
  id: string
  production_date: string
  quantity: number
  broken: number
  batch_number?: string | null
  created_at?: string
}

export default function UovaPage() {
  const [quantity, setQuantity] = useState('')
  const [broken, setBroken] = useState('')
  const [productionDate, setProductionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [message, setMessage] = useState('')
  const [rows, setRows] = useState<EggRow[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)

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

    if (editingId) {
      // 🔄 UPDATE
      const { error } = await supabase
        .from('egg_production')
        .update({
          production_date: productionDate,
          quantity: qty,
          broken: brk,
        })
        .eq('id', editingId)

      if (error) {
        console.error(error)
        setMessage('Errore aggiornamento ❌')
        return
      }

      setMessage('Modificato con successo ✅')
      setEditingId(null)
    } else {
      // ➕ INSERT
      const { error } = await supabase.from('egg_production').insert([
        {
          production_date: productionDate,
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
    }

    setQuantity('')
    setBroken('')
    loadEggProduction()
    setProductionDate(new Date().toISOString().split('T')[0])
  }

  function startEdit(row: EggRow) {
    setEditingId(row.id)
    setProductionDate(row.production_date)
    setQuantity(String(row.quantity))
    setBroken(String(row.broken))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteRow(id: string) {
    const conferma = window.confirm('Vuoi eliminare questo record?')
    if (!conferma) return

    const { error } = await supabase
      .from('egg_production')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      setMessage('Errore eliminazione ❌')
      return
    }

    setMessage('Eliminato ✅')
    loadEggProduction()
  }

  return (
    <main className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Produzione Uova 🥚</h1>

      <div className="border rounded-xl p-4 mb-6 space-y-3 bg-white">
        <input
          type="date"
          value={productionDate}
          onChange={(e) => setProductionDate(e.target.value)}
          className="w-full border p-2 rounded"
        />

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
          {editingId ? 'Aggiorna' : 'Salva'}
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
                
                <div>Lotto: {row.batch_number || '-'}</div>
                <div>Uova: {row.quantity}</div>
                <div>Rotte: {row.broken}</div>
                <div>Buone: {row.quantity - row.broken}</div>

                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => startEdit(row)}
                    className="bg-blue-600 text-white px-3 py-1 rounded"
                  >
                    Modifica
                  </button>

                  <button
                    onClick={() => deleteRow(row.id)}
                    className="bg-red-600 text-white px-3 py-1 rounded"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
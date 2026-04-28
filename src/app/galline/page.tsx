'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

type ChickenMovement = {
  id: string
  movement_date: string
  movement_type: string
  quantity: number
  reason: string | null
  notes: string | null
  created_at?: string
}

export default function GallinePage() {
  const [movements, setMovements] = useState<ChickenMovement[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)

  const [movementDate, setMovementDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [movementType, setMovementType] = useState('carico')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadMovements()
  }, [])

  async function loadMovements() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('chicken_movements')
      .select('*')
      .order('movement_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setMessage('Errore caricamento movimenti ❌')
    } else {
      setMovements(data || [])
    }

    setLoading(false)
  }

  function resetForm() {
    setEditingId(null)
    setMovementDate(new Date().toISOString().split('T')[0])
    setMovementType('carico')
    setQuantity('')
    setReason('')
    setNotes('')
  }

  async function saveMovement() {
    setMessage('')

    const qty = Number(quantity)

    if (!movementDate) {
      setMessage('Inserisci una data valida')
      return
    }

    if (!qty || qty <= 0) {
      setMessage('Inserisci una quantità valida')
      return
    }

    const payload = {
      movement_date: movementDate,
      movement_type: movementType,
      quantity: qty,
      reason: reason.trim() || null,
      notes: notes.trim() || null,
    }

    if (editingId) {
      const { error } = await supabase
        .from('chicken_movements')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        console.error(error)
        setMessage('Errore aggiornamento movimento ❌')
        return
      }

      setMessage('Movimento aggiornato ✅')
    } else {
      const { error } = await supabase
        .from('chicken_movements')
        .insert([payload])

      if (error) {
        console.error(error)
        setMessage('Errore salvataggio movimento ❌')
        return
      }

      setMessage('Movimento salvato ✅')
    }

    resetForm()
    loadMovements()
  }

  function startEdit(row: ChickenMovement) {
    setEditingId(row.id)
    setMovementDate(row.movement_date)
    setMovementType(row.movement_type)
    setQuantity(String(row.quantity))
    setReason(row.reason || '')
    setNotes(row.notes || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteMovement(id: string) {
    const conferma = window.confirm('Vuoi eliminare questo movimento?')
    if (!conferma) return

    const { error } = await supabase
      .from('chicken_movements')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      setMessage('Errore eliminazione movimento ❌')
      return
    }

    setMessage('Movimento eliminato ✅')
    setMovements((prev) => prev.filter((m) => m.id !== id))

    if (editingId === id) {
      resetForm()
    }
  }

  function getMovementSign(type: string) {
    if (type === 'carico') return 1
    return -1
  }

  function getTypeLabel(type: string) {
    switch (type) {
      case 'carico':
        return 'Carico / Acquisto'
      case 'morte':
        return 'Morte'
      case 'vendita':
        return 'Vendita'
      case 'regalo':
        return 'Regalo'
      case 'smarrimento':
        return 'Smarrimento'
      default:
        return type
    }
  }

  const stats = useMemo(() => {
    const totalLoaded = movements
      .filter((m) => m.movement_type === 'carico')
      .reduce((sum, m) => sum + Number(m.quantity || 0), 0)

    const totalDeaths = movements
      .filter((m) => m.movement_type === 'morte')
      .reduce((sum, m) => sum + Number(m.quantity || 0), 0)

    const totalOut = movements
      .filter((m) => m.movement_type !== 'carico')
      .reduce((sum, m) => sum + Number(m.quantity || 0), 0)

    const currentTotal = movements.reduce(
      (sum, m) => sum + Number(m.quantity || 0) * getMovementSign(m.movement_type),
      0
    )

    return {
      totalLoaded,
      totalDeaths,
      totalOut,
      currentTotal,
    }
  }, [movements])

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Galline 🐔</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Galline attuali</div>
          <div className="text-3xl font-bold">{stats.currentTotal}</div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Totale caricate</div>
          <div className="text-3xl font-bold">{stats.totalLoaded}</div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Morte</div>
          <div className="text-3xl font-bold">{stats.totalDeaths}</div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Uscite totali</div>
          <div className="text-3xl font-bold">{stats.totalOut}</div>
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4 mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {editingId ? 'Modifica movimento' : 'Nuovo movimento'}
          </h2>

          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="border rounded px-4 py-2 bg-white"
            >
              Annulla modifica
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Data</label>
            <input
              type="date"
              value={movementDate}
              onChange={(e) => setMovementDate(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Tipo movimento</label>
            <select
              value={movementType}
              onChange={(e) => setMovementType(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="carico">Carico / Acquisto</option>
              <option value="morte">Morte</option>
              <option value="vendita">Vendita</option>
              <option value="regalo">Regalo</option>
              <option value="smarrimento">Smarrimento</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Quantità</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Es. 10"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Motivo</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="w-full border rounded p-2"
            placeholder="Es. acquisto nuove ovaiole, morte naturale..."
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Note</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded p-2"
            rows={3}
          />
        </div>

        <button
          type="button"
          onClick={saveMovement}
          className="w-full bg-green-600 text-white rounded p-2"
        >
          {editingId ? 'Aggiorna movimento' : 'Salva movimento'}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Storico movimenti</h2>

        {loading ? (
          <p>Caricamento...</p>
        ) : movements.length === 0 ? (
          <p>Nessun movimento salvato.</p>
        ) : (
          <div className="space-y-4">
            {movements.map((row) => (
              <div key={row.id} className="bg-white border rounded-2xl p-4">
                <div className="font-semibold">
                  {new Date(row.movement_date).toLocaleDateString('it-IT')}
                </div>

                <div>Tipo: {getTypeLabel(row.movement_type)}</div>
                <div>Quantità: {row.quantity}</div>
                {row.reason && <div>Motivo: {row.reason}</div>}
                {row.notes && <div>Note: {row.notes}</div>}

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => startEdit(row)}
                    className="bg-blue-600 text-white rounded px-4 py-2"
                  >
                    Modifica
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteMovement(row.id)}
                    className="bg-red-600 text-white rounded px-4 py-2"
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
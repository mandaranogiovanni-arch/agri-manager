'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

type Product = {
  id: string
  name: string
  category: string
  unit: string
}

type StockAdjustment = {
  id: string
  product_id: string | null
  adjustment_date: string
  quantity: number
  reason: string | null
  notes: string | null
}

export default function RettifichePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [editingId, setEditingId] = useState<string | null>(null)

  const [productId, setProductId] = useState('')
  const [adjustmentDate, setAdjustmentDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('scarto')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setMessage('')

    const [productsRes, adjustmentsRes] = await Promise.all([
      supabase.from('products').select('id, name, category, unit').order('name'),
      supabase
        .from('stock_adjustments')
        .select('*')
        .order('adjustment_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ])

    if (productsRes.error) {
      console.error(productsRes.error)
      setMessage('Errore caricamento prodotti ❌')
    } else {
      setProducts(productsRes.data || [])
    }

    if (adjustmentsRes.error) {
      console.error(adjustmentsRes.error)
      setMessage('Errore caricamento rettifiche ❌')
    } else {
      setAdjustments(adjustmentsRes.data || [])
    }

    setLoading(false)
  }

  function resetForm() {
    setEditingId(null)
    setProductId('')
    setAdjustmentDate(new Date().toISOString().split('T')[0])
    setQuantity('')
    setReason('scarto')
    setNotes('')
  }

  async function saveAdjustment() {
    setMessage('')

    if (!productId) {
      setMessage('Seleziona un prodotto')
      return
    }

    if (!quantity || Number(quantity) <= 0) {
      setMessage('Inserisci una quantità valida')
      return
    }

    if (!adjustmentDate) {
      setMessage('Inserisci una data valida')
      return
    }

    const payload = {
      product_id: productId,
      adjustment_date: adjustmentDate,
      quantity: Number(quantity),
      reason: reason || null,
      notes: notes.trim() || null,
    }

    if (editingId) {
      const { error } = await supabase
        .from('stock_adjustments')
        .update(payload)
        .eq('id', editingId)

      if (error) {
        console.error(error)
        setMessage('Errore aggiornamento rettifica ❌')
        return
      }

      setMessage('Rettifica aggiornata ✅')
    } else {
      const { error } = await supabase.from('stock_adjustments').insert([payload])

      if (error) {
        console.error(error)
        setMessage('Errore salvataggio rettifica ❌')
        return
      }

      setMessage('Rettifica salvata ✅')
    }

    resetForm()
    loadAll()
  }

  function startEditAdjustment(adj: StockAdjustment) {
    setEditingId(adj.id)
    setProductId(adj.product_id || '')
    setAdjustmentDate(adj.adjustment_date)
    setQuantity(String(adj.quantity))
    setReason(adj.reason || 'scarto')
    setNotes(adj.notes || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteAdjustment(id: string) {
    const conferma = window.confirm('Vuoi davvero eliminare questa rettifica?')
    if (!conferma) return

    const { error } = await supabase
      .from('stock_adjustments')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      setMessage('Errore eliminazione rettifica ❌')
      return
    }

    setMessage('Rettifica eliminata ✅')
    setAdjustments((prev) => prev.filter((a) => a.id !== id))

    if (editingId === id) {
      resetForm()
    }
  }

  function getProduct(productId: string | null) {
    return products.find((p) => p.id === productId)
  }

  const totalAdjusted = useMemo(() => {
    return adjustments.reduce((sum, adj) => sum + Number(adj.quantity || 0), 0)
  }, [adjustments])

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Rettifiche Magazzino 📉</h1>

      <div className="bg-white border rounded-2xl p-4 mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {editingId ? 'Modifica rettifica' : 'Nuova rettifica'}
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

        <div>
          <label className="block text-sm mb-1">Prodotto</label>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full border rounded p-2"
          >
            <option value="">Seleziona prodotto</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} ({product.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Data</label>
            <input
              type="date"
              value={adjustmentDate}
              onChange={(e) => setAdjustmentDate(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Quantità da scaricare</label>
            <input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full border rounded p-2"
              placeholder="Es. 2 o 5.5"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Motivo</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="scarto">Scarto</option>
              <option value="autoconsumo">Autoconsumo</option>
              <option value="regalo">Regalo</option>
              <option value="rettifica">Rettifica</option>
              <option value="altro">Altro</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Note</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Es. pomodori rovinati, merce consumata in casa..."
          />
        </div>

        <div className="text-lg font-semibold">
          Totale scarichi registrati: {totalAdjusted}
        </div>

        <button
          onClick={saveAdjustment}
          className="w-full bg-green-600 text-white rounded p-2"
        >
          {editingId ? 'Aggiorna rettifica' : 'Salva rettifica'}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Storico rettifiche</h2>

        {loading ? (
          <p>Caricamento...</p>
        ) : adjustments.length === 0 ? (
          <p>Nessuna rettifica salvata.</p>
        ) : (
          <div className="space-y-4">
            {adjustments.map((adj) => {
              const product = getProduct(adj.product_id)

              return (
                <div key={adj.id} className="bg-white border rounded-2xl p-4">
                  <div className="font-semibold">
                    {product ? `${product.name} (${product.unit})` : 'Prodotto sconosciuto'}
                  </div>

                  <div>
                    Data: {new Date(adj.adjustment_date).toLocaleDateString('it-IT')}
                  </div>

                  <div>
                    Quantità scaricata: {adj.quantity} {product?.unit || ''}
                  </div>

                  {adj.reason && <div>Motivo: {adj.reason}</div>}
                  {adj.notes && <div>Note: {adj.notes}</div>}

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => startEditAdjustment(adj)}
                      className="bg-blue-600 text-white rounded px-4 py-2"
                    >
                      Modifica
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteAdjustment(adj.id)}
                      className="bg-red-600 text-white rounded px-4 py-2"
                    >
                      Elimina
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
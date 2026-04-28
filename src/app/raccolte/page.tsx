'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

type Product = {
  id: string
  name: string
  category: string
  unit: string
}

type Harvest = {
  id: string
  product_id: string | null
  harvest_date: string
  quantity: number
  notes: string | null
  created_at?: string
}

export default function RaccoltePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [editingHarvestId, setEditingHarvestId] = useState<string | null>(null)

  const [productId, setProductId] = useState('')
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0])
  const [quantity, setQuantity] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setMessage('')

    const [productsRes, harvestsRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, category, unit')
        .neq('category', 'uova')
        .order('name'),
      supabase
        .from('harvests')
        .select('*')
        .order('harvest_date', { ascending: false })
        .order('created_at', { ascending: false }),
    ])

    if (productsRes.error) {
      console.error(productsRes.error)
      setMessage('Errore caricamento prodotti ❌')
    } else {
      setProducts(productsRes.data || [])
    }

    if (harvestsRes.error) {
      console.error(harvestsRes.error)
      setMessage('Errore caricamento raccolte ❌')
    } else {
      setHarvests(harvestsRes.data || [])
    }

    setLoading(false)
  }

  function resetForm() {
    setEditingHarvestId(null)
    setProductId('')
    setHarvestDate(new Date().toISOString().split('T')[0])
    setQuantity('')
    setNotes('')
  }

  async function saveHarvest() {
    setMessage('')

    if (!productId) {
      setMessage('Seleziona un prodotto')
      return
    }

    if (!quantity || Number(quantity) <= 0) {
      setMessage('Inserisci una quantità valida')
      return
    }

    if (!harvestDate) {
      setMessage('Inserisci una data valida')
      return
    }

    const payload = {
      product_id: productId,
      harvest_date: harvestDate,
      quantity: Number(quantity),
      notes: notes.trim() || null,
    }

    if (editingHarvestId) {
      const { error } = await supabase
        .from('harvests')
        .update(payload)
        .eq('id', editingHarvestId)

      if (error) {
        console.error(error)
        setMessage('Errore aggiornamento raccolta ❌')
        return
      }

      setMessage('Raccolta aggiornata ✅')
    } else {
      const { error } = await supabase.from('harvests').insert([payload])

      if (error) {
        console.error(error)
        setMessage('Errore salvataggio raccolta ❌')
        return
      }

      setMessage('Raccolta salvata ✅')
    }

    resetForm()
    loadAll()
  }

  function startEditHarvest(harvest: Harvest) {
    setEditingHarvestId(harvest.id)
    setProductId(harvest.product_id || '')
    setHarvestDate(harvest.harvest_date)
    setQuantity(String(harvest.quantity))
    setNotes(harvest.notes || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteHarvest(harvestId: string) {
    const conferma = window.confirm('Vuoi davvero eliminare questa raccolta?')
    if (!conferma) return

    const { error } = await supabase.from('harvests').delete().eq('id', harvestId)

    if (error) {
      console.error(error)
      setMessage('Errore eliminazione raccolta ❌')
      return
    }

    setMessage('Raccolta eliminata ✅')
    setHarvests((prev) => prev.filter((harvest) => harvest.id !== harvestId))

    if (editingHarvestId === harvestId) {
      resetForm()
    }
  }

  function getProduct(productId: string | null) {
    return products.find((p) => p.id === productId)
  }

  const totalHarvested = useMemo(() => {
    return harvests.reduce((sum, harvest) => sum + Number(harvest.quantity || 0), 0)
  }, [harvests])

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Raccolte 🍅</h1>

      <div className="bg-white border rounded-2xl p-4 mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {editingHarvestId ? 'Modifica raccolta' : 'Nuova raccolta'}
          </h2>

          {editingHarvestId && (
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Data raccolta</label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Quantità raccolta</label>
            <input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Es. 12 o 35.5"
              className="w-full border rounded p-2"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Note</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border rounded p-2"
            placeholder="Es. prima raccolta, qualità ottima..."
          />
        </div>

        <div className="text-lg font-semibold">
          Totale raccolto registrato: {totalHarvested}
        </div>

        <button
          onClick={saveHarvest}
          className="w-full bg-green-600 text-white rounded p-2"
        >
          {editingHarvestId ? 'Aggiorna raccolta' : 'Salva raccolta'}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Storico raccolte</h2>

        {loading ? (
          <p>Caricamento...</p>
        ) : harvests.length === 0 ? (
          <p>Nessuna raccolta salvata.</p>
        ) : (
          <div className="space-y-4">
            {harvests.map((harvest) => {
              const product = getProduct(harvest.product_id)

              return (
                <div key={harvest.id} className="bg-white border rounded-2xl p-4">
                  <div className="font-semibold">
                    {product ? `${product.name} (${product.unit})` : 'Prodotto sconosciuto'}
                  </div>

                  <div>
                    Data raccolta:{' '}
                    {new Date(harvest.harvest_date).toLocaleDateString('it-IT')}
                  </div>

                  <div>
                    Quantità: {harvest.quantity} {product?.unit || ''}
                  </div>

                  {harvest.notes && <div>Note: {harvest.notes}</div>}

                  <div className="flex flex-wrap gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => startEditHarvest(harvest)}
                      className="bg-blue-600 text-white rounded px-4 py-2"
                    >
                      Modifica
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteHarvest(harvest.id)}
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
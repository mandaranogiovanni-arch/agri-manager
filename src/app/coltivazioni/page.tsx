'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

type Product = {
  id: string
  name: string
  category: string
  unit: string
}

type Crop = {
  id: string
  product_id: string | null
  planted_at: string | null
  quantity: number | null
  area_name: string | null
  notes: string | null
  created_at?: string
}

export default function ColtivazioniPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [editingCropId, setEditingCropId] = useState<string | null>(null)

  const [productId, setProductId] = useState('')
  const [plantedAt, setPlantedAt] = useState(new Date().toISOString().split('T')[0])
  const [quantity, setQuantity] = useState('')
  const [areaName, setAreaName] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setMessage('')

    const [productsRes, cropsRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, category, unit')
        .neq('category', 'uova')
        .order('name'),
      supabase.from('crops').select('*').order('planted_at', { ascending: false }),
    ])

    if (productsRes.error) {
      console.error(productsRes.error)
      setMessage('Errore caricamento prodotti ❌')
    } else {
      setProducts(productsRes.data || [])
    }

    if (cropsRes.error) {
      console.error(cropsRes.error)
      setMessage('Errore caricamento coltivazioni ❌')
    } else {
      setCrops(cropsRes.data || [])
    }

    setLoading(false)
  }

  function resetForm() {
    setEditingCropId(null)
    setProductId('')
    setPlantedAt(new Date().toISOString().split('T')[0])
    setQuantity('')
    setAreaName('')
    setNotes('')
  }

  async function saveCrop() {
    setMessage('')

    if (!productId) {
      setMessage('Seleziona un prodotto')
      return
    }

    const payload = {
      product_id: productId,
      planted_at: plantedAt || null,
      quantity: quantity ? Number(quantity) : null,
      area_name: areaName.trim() || null,
      notes: notes.trim() || null,
    }

    if (editingCropId) {
      const { error } = await supabase
        .from('crops')
        .update(payload)
        .eq('id', editingCropId)

      if (error) {
        console.error(error)
        setMessage('Errore aggiornamento coltivazione ❌')
        return
      }

      setMessage('Coltivazione aggiornata ✅')
    } else {
      const { error } = await supabase.from('crops').insert([payload])

      if (error) {
        console.error(error)
        setMessage('Errore salvataggio coltivazione ❌')
        return
      }

      setMessage('Coltivazione salvata ✅')
    }

    resetForm()
    loadAll()
  }

  function startEditCrop(crop: Crop) {
    setEditingCropId(crop.id)
    setProductId(crop.product_id || '')
    setPlantedAt(crop.planted_at || new Date().toISOString().split('T')[0])
    setQuantity(crop.quantity !== null && crop.quantity !== undefined ? String(crop.quantity) : '')
    setAreaName(crop.area_name || '')
    setNotes(crop.notes || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteCrop(cropId: string) {
    const conferma = window.confirm('Vuoi davvero eliminare questa coltivazione?')
    if (!conferma) return

    const { error } = await supabase.from('crops').delete().eq('id', cropId)

    if (error) {
      console.error(error)
      setMessage('Errore eliminazione coltivazione ❌')
      return
    }

    setMessage('Coltivazione eliminata ✅')
    setCrops((prev) => prev.filter((crop) => crop.id !== cropId))

    if (editingCropId === cropId) {
      resetForm()
    }
  }

  function getProductLabel(productId: string | null) {
    const product = products.find((p) => p.id === productId)
    if (!product) return 'Prodotto sconosciuto'
    return `${product.name} (${product.unit})`
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Coltivazioni 🌱</h1>

      <div className="bg-white border rounded-2xl p-4 mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {editingCropId ? 'Modifica coltivazione' : 'Nuova coltivazione'}
          </h2>

          {editingCropId && (
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
            <label className="block text-sm mb-1">Data impianto / semina</label>
            <input
              type="date"
              value={plantedAt}
              onChange={(e) => setPlantedAt(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Quantità</label>
            <input
              type="number"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Es. 100 o 25"
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Zona / Area</label>
            <input
              type="text"
              value={areaName}
              onChange={(e) => setAreaName(e.target.value)}
              placeholder="Es. Serra 1, Orto nord..."
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
            placeholder="Es. varietà, trattamento, irrigazione..."
          />
        </div>

        <button
          onClick={saveCrop}
          className="w-full bg-green-600 text-white rounded p-2"
        >
          {editingCropId ? 'Aggiorna coltivazione' : 'Salva coltivazione'}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Storico coltivazioni</h2>

        {loading ? (
          <p>Caricamento...</p>
        ) : crops.length === 0 ? (
          <p>Nessuna coltivazione salvata.</p>
        ) : (
          <div className="space-y-4">
            {crops.map((crop) => (
              <div key={crop.id} className="bg-white border rounded-2xl p-4">
                <div className="font-semibold">{getProductLabel(crop.product_id)}</div>

                {crop.planted_at && (
                  <div>
                    Data impianto / semina:{' '}
                    {new Date(crop.planted_at).toLocaleDateString('it-IT')}
                  </div>
                )}

                {crop.quantity !== null && <div>Quantità: {crop.quantity}</div>}
                {crop.area_name && <div>Zona / Area: {crop.area_name}</div>}
                {crop.notes && <div>Note: {crop.notes}</div>}

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => startEditCrop(crop)}
                    className="bg-blue-600 text-white rounded px-4 py-2"
                  >
                    Modifica
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteCrop(crop.id)}
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
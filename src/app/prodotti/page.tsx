'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../supabase'

type Product = {
  id: string
  name: string
  category: string
  unit: string
  base_price: number | null
  min_stock: number | null
}

export default function ProdottiPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [editingProductId, setEditingProductId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('ortaggi')
  const [unit, setUnit] = useState('kg')
  const [basePrice, setBasePrice] = useState('')
  const [minStock, setMinStock] = useState('')

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    setMessage('')

    const { data, error } = await supabase
      .from('products')
      .select('id, name, category, unit, base_price, min_stock')
      .order('name')

    if (error) {
      console.error(error)
      setMessage('Errore caricamento prodotti ❌')
    } else {
      setProducts(data || [])
    }

    setLoading(false)
  }

  function resetForm() {
    setEditingProductId(null)
    setName('')
    setCategory('ortaggi')
    setUnit('kg')
    setBasePrice('')
    setMinStock('')
  }

  async function saveProduct() {
    setMessage('')

    if (!name.trim()) {
      setMessage('Inserisci il nome del prodotto')
      return
    }

    const payload = {
      name: name.trim(),
      category,
      unit,
      base_price: basePrice ? Number(basePrice) : 0,
      min_stock: minStock ? Number(minStock) : 0,
    }

    if (editingProductId) {
      const { error } = await supabase
        .from('products')
        .update(payload)
        .eq('id', editingProductId)

      if (error) {
        console.error(error)
        setMessage('Errore aggiornamento prodotto ❌')
        return
      }

      setMessage('Prodotto aggiornato ✅')
    } else {
      const { error } = await supabase.from('products').insert([payload])

      if (error) {
        console.error(error)
        setMessage('Errore salvataggio prodotto ❌')
        return
      }

      setMessage('Prodotto salvato ✅')
    }

    resetForm()
    loadProducts()
  }

  function startEditProduct(product: Product) {
    setEditingProductId(product.id)
    setName(product.name)
    setCategory(product.category)
    setUnit(product.unit)

    setBasePrice(
      product.base_price !== null && product.base_price !== undefined
        ? String(product.base_price)
        : ''
    )

    // 👇 AGGIUNGI QUESTO QUI
    setMinStock(
      product.min_stock !== null && product.min_stock !== undefined
        ? String(product.min_stock)
        : ''
    )

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteProduct(productId: string) {
    const conferma = window.confirm('Vuoi davvero eliminare questo prodotto?')
    if (!conferma) return

    const { error } = await supabase.from('products').delete().eq('id', productId)

    if (error) {
      console.error(error)
      setMessage('Errore eliminazione prodotto ❌')
      return
    }

    setMessage('Prodotto eliminato ✅')
    setProducts((prev) => prev.filter((product) => product.id !== productId))

    if (editingProductId === productId) {
      resetForm()
    }
  }

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Prodotti 🧺</h1>

      <div className="bg-white border rounded-2xl p-4 mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {editingProductId ? 'Modifica prodotto' : 'Nuovo prodotto'}
          </h2>

          {editingProductId && (
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
          <label className="block text-sm mb-1">Nome prodotto</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Pomodori"
            className="w-full border rounded p-2"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm mb-1">Categoria</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="uova">Uova</option>
              <option value="ortaggi">Ortaggi</option>
              <option value="frutta">Frutta</option>
              <option value="altro">Altro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Unità di misura</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="pezzi">Pezzi</option>
              <option value="kg">Kg</option>
              <option value="g">g</option>
              <option value="litri">Litri</option>
              <option value="mazzi">Mazzi</option>
              <option value="cassette">Cassette</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Soglia minima magazzino</label>
            <input
              type="number"
              step="0.01"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value)}
              placeholder="Es. 5"
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Prezzo base (€)</label>
            <input
              type="number"
              step="0.01"
              value={basePrice}
              onChange={(e) => setBasePrice(e.target.value)}
              placeholder="Es. 2.50"
              className="w-full border rounded p-2"
            />
          </div>
        </div>

        <button
          onClick={saveProduct}
          className="w-full bg-green-600 text-white rounded p-2"
        >
          {editingProductId ? 'Aggiorna prodotto' : 'Salva prodotto'}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Elenco prodotti</h2>

        {loading ? (
          <p>Caricamento...</p>
        ) : products.length === 0 ? (
          <p>Nessun prodotto salvato.</p>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white border rounded-2xl p-4">
                <div className="font-semibold text-lg">{product.name}</div>
                <div>Categoria: {product.category}</div>
                <div>Unità: {product.unit}</div>
                <div>
                  Prezzo base: €{' '}
                  {Number(product.base_price || 0).toLocaleString('it-IT', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>

                <div>
                  Soglia minima: {Number(product.min_stock || 0)} {product.unit}
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => startEditProduct(product)}
                    className="bg-blue-600 text-white rounded px-4 py-2"
                  >
                    Modifica
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteProduct(product.id)}
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
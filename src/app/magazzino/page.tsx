'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

type Product = {
  id: string
  name: string
  category: string
  unit: string
  min_stock?: number | null
}

type Harvest = {
  product_id: string | null
  quantity: number
}

type OrderItem = {
  product_id: string | null
  quantity: number
}

type StockAdjustment = {
  product_id: string | null
  quantity: number
}

type ProductStockRow = {
  id: string
  name: string
  category: string
  unit: string
  harvested: number
  sold: number
  adjusted: number
  available: number
  min_stock: number
status: 'ok' | 'low' | 'empty'
}

export default function MagazzinoPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [harvests, setHarvests] = useState<Harvest[]>([])
  const [orderItems, setOrderItems] = useState<OrderItem[]>([])
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setMessage('')

    const [productsRes, harvestsRes, itemsRes, adjustmentsRes] = await Promise.all([
      supabase.from('products').select('id, name, category, unit, min_stock').order('name'),
      supabase.from('harvests').select('product_id, quantity'),
      supabase.from('order_items').select('product_id, quantity'),
      supabase.from('stock_adjustments').select('product_id, quantity'),
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

    if (itemsRes.error) {
      console.error(itemsRes.error)
      setMessage('Errore caricamento vendite ❌')
    } else {
      setOrderItems(itemsRes.data || [])
    }

    if (adjustmentsRes.error) {
      console.error(adjustmentsRes.error)
      setMessage('Errore caricamento rettifiche ❌')
    } else {
      setAdjustments(adjustmentsRes.data || [])
    }

    setLoading(false)
  }

  const stockRows = useMemo<ProductStockRow[]>(() => {
    return products.map((product) => {
      const harvested = harvests
        .filter((h) => h.product_id === product.id)
        .reduce((sum, h) => sum + Number(h.quantity || 0), 0)

      const sold = orderItems
        .filter((item) => item.product_id === product.id)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0)

      const adjusted = adjustments
        .filter((adj) => adj.product_id === product.id)
        .reduce((sum, adj) => sum + Number(adj.quantity || 0), 0)

        const minStock = Number(product.min_stock || 0)
        const available = harvested - sold - adjusted

        let status: 'ok' | 'low' | 'empty' = 'ok'

        if (available <= 0) {
          status = 'empty'
        } else if (minStock > 0 && available <= minStock) {
          status = 'low'
        }

      return {
        id: product.id,
        name: product.name,
        category: product.category,
        unit: product.unit,
        harvested,
        sold,
        adjusted,
        min_stock: minStock,
        available,
        status,
      }
    })
  }, [products, harvests, orderItems, adjustments])

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Magazzino / Disponibilità 📦</h1>

      {message && <p className="mb-4 text-sm">{message}</p>}

      {loading ? (
        <p>Caricamento...</p>
      ) : stockRows.length === 0 ? (
        <p>Nessun prodotto trovato.</p>
      ) : (
        <div className="space-y-4">
          {stockRows.map((row) => (
            <div
              key={row.id}
              className={`bg-white border rounded-2xl p-4 ${
                row.status === 'empty'
                  ? 'border-red-500 bg-red-50'
                  : row.status === 'low'
                  ? 'border-orange-500 bg-orange-50'
                  : ''
              }`}
            >
              <div className="text-xl font-semibold">{row.name}</div>
              <div className="text-sm text-gray-600 mb-3">
                Categoria: {row.category} • Unità: {row.unit}
              </div>

              {row.status === 'empty' && (
                <div className="mt-2 mb-3 text-sm font-semibold text-red-600">
                  Esaurito / disponibilità zero
                </div>
              )}

              {row.status === 'low' && (
                <div className="mt-2 mb-3 text-sm font-semibold text-orange-600">
                  Sotto scorta minima
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="border rounded-xl p-3 bg-gray-50">
                  <div className="text-sm text-gray-500">Totale raccolto</div>
                  <div className="text-2xl font-bold">
                    {row.harvested} {row.unit}
                  </div>
                </div>

                <div className="border rounded-xl p-3 bg-gray-50">
                  <div className="text-sm text-gray-500">Totale venduto</div>
                  <div className="text-2xl font-bold">
                    {row.sold} {row.unit}
                  </div>
                </div>

                <div className="border rounded-xl p-3 bg-gray-50">
                  <div className="text-sm text-gray-500">Scarichi / rettifiche</div>
                  <div className="text-2xl font-bold">
                    {row.adjusted} {row.unit}
                  </div>
                </div>

                <div className="border rounded-xl p-3 bg-gray-50">
                  <div className="text-sm text-gray-500">Disponibilità reale teorica</div>
                  <div className="text-2xl font-bold">
                    {row.available} {row.unit}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  )
}
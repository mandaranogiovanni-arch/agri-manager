'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

type Customer = {
  id: string
  name: string
}

type Product = {
  id: string
  name: string
  unit: string
}

type Order = {
  id: string
  order_date: string
  customer_id: string | null
  total: number
  paid: boolean
  status: string | null
  fulfillment_status: string | null
  pickup_time: string | null
  notes: string | null
  public_order_number?: number | null
}

type OrderItem = {
  id: string
  order_id: string
  product_id: string | null
  quantity: number
  price: number
}

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setMessage('')

    const [customersRes, productsRes, ordersRes, itemsRes] = await Promise.all([
      supabase.from('customers').select('id, name').order('name'),
      supabase.from('products').select('id, name, unit').order('name'),
      supabase
        .from('orders')
        .select(
          'id, public_order_number, order_date, customer_id, total, paid, status, fulfillment_status, pickup_time, notes'
        )
        .neq('fulfillment_status', 'annullato')
        .order('pickup_time', { ascending: true }),
      supabase.from('order_items').select('id, order_id, product_id, quantity, price'),
    ])

    if (customersRes.error) console.error(customersRes.error)
    if (productsRes.error) console.error(productsRes.error)
    if (ordersRes.error) console.error(ordersRes.error)
    if (itemsRes.error) console.error(itemsRes.error)

    setCustomers(customersRes.data || [])
    setProducts(productsRes.data || [])
    setOrders(ordersRes.data || [])
    setItems(itemsRes.data || [])
    setLoading(false)
  }

  function getCustomerName(id: string | null) {
    return customers.find((c) => c.id === id)?.name || 'Cliente sconosciuto'
  }

  function getProductName(id: string | null) {
    return products.find((p) => p.id === id)?.name || 'Prodotto sconosciuto'
  }

  function getProductUnit(id: string | null) {
    return products.find((p) => p.id === id)?.unit || ''
  }

  function getItemsForOrder(orderId: string) {
    return items.filter((item) => item.order_id === orderId)
  }

  const dayOrders = useMemo(() => {
    return orders.filter((order) => order.order_date === selectedDate)
  }, [orders, selectedDate])

  const pendingOrders = useMemo(() => {
    return dayOrders.filter(
      (order) =>
        order.fulfillment_status !== 'consegnato' &&
        order.fulfillment_status !== 'annullato'
    )
  }, [dayOrders])

  const deliveredUnpaidOrders = useMemo(() => {
    return dayOrders.filter(
      (order) => order.fulfillment_status === 'consegnato' && !order.paid
    )
  }, [dayOrders])

  const productSummary = useMemo(() => {
    const dayOrderIds = new Set(pendingOrders.map((order) => order.id))
    const dayItems = items.filter((item) => dayOrderIds.has(item.order_id))

    return products
      .map((product) => {
        const quantity = dayItems
          .filter((item) => item.product_id === product.id)
          .reduce((sum, item) => sum + Number(item.quantity || 0), 0)

        return {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          quantity,
        }
      })
      .filter((row) => row.quantity > 0)
  }, [products, items, pendingOrders])

  const expectedRevenue = pendingOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  )

  const unpaidDeliveredTotal = deliveredUnpaidOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  )

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Agenda giornaliera 📋</h1>

      <div className="bg-white border rounded-2xl p-4 mb-6">
        <label className="block text-sm mb-1">Giorno</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded p-2"
        />

        <div className="mt-3 font-semibold">
          {new Date(selectedDate).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Ordini da preparare</div>
          <div className="text-3xl font-bold">{pendingOrders.length}</div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Prodotti da preparare</div>
          <div className="text-3xl font-bold">{productSummary.length}</div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Incasso previsto</div>
          <div className="text-3xl font-bold">
            €{' '}
            {expectedRevenue.toLocaleString('it-IT', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Consegnati non pagati</div>
          <div className="text-3xl font-bold">
            €{' '}
            {unpaidDeliveredTotal.toLocaleString('it-IT', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Totale da preparare</h2>

        {productSummary.length === 0 ? (
          <p>Nessun prodotto da preparare per questo giorno.</p>
        ) : (
          <div className="space-y-3">
            {productSummary.map((row) => (
              <div key={row.productId} className="bg-white border rounded-2xl p-4">
                <div className="font-semibold text-lg">{row.name}</div>
                <div>
                  Totale: {row.quantity} {row.unit}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Ordini da preparare</h2>

        {loading ? (
          <p>Caricamento...</p>
        ) : pendingOrders.length === 0 ? (
          <p>Nessun ordine da preparare.</p>
        ) : (
          <div className="space-y-4">
            {pendingOrders.map((order) => {
              const orderItems = getItemsForOrder(order.id)

              return (
                <div key={order.id} className="bg-white border rounded-2xl p-4">

                  {order.public_order_number && (
                    <div className="font-semibold text-green-700">
                      Ordine #{order.public_order_number}
                    </div>
                  )}
                  
                  <div className="font-semibold text-lg">
                    {order.pickup_time ? `${order.pickup_time} - ` : ''}
                    {getCustomerName(order.customer_id)}
                  </div>

                  <div>Tipo: {order.status === 'prenotazione' ? 'Prenotazione' : 'Vendita'}</div>
                  <div>Stato: {order.fulfillment_status || 'da_evadere'}</div>
                  <div>Pagamento: {order.paid ? 'Pagato' : 'Non pagato'}</div>

                  {order.notes && <div>Note: {order.notes}</div>}

                  <div className="space-y-2 mt-3">
                    {orderItems.map((item) => (
                      <div key={item.id} className="border rounded-lg p-3 bg-gray-50">
                        <div>Prodotto: {getProductName(item.product_id)}</div>
                        <div>
                          Quantità: {item.quantity} {getProductUnit(item.product_id)}
                        </div>
                        <div>
                          Prezzo: €{' '}
                          {Number(item.price).toLocaleString('it-IT', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="font-semibold mt-3">
                    Totale: €{' '}
                    {Number(order.total || 0).toLocaleString('it-IT', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>

                  <Link
                    href="/vendite"
                    className="inline-block mt-3 bg-blue-600 text-white rounded px-4 py-2"
                  >
                    Vai a vendite
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-3">Consegnati non pagati</h2>

        {deliveredUnpaidOrders.length === 0 ? (
          <p>Nessun consegnato non pagato per questo giorno.</p>
        ) : (
          <div className="space-y-4">
            {deliveredUnpaidOrders.map((order) => (
              <div key={order.id} className="bg-white border rounded-2xl p-4 border-red-300">
                <div className="font-semibold">{getCustomerName(order.customer_id)}</div>
                <div>
                  Totale da incassare: €{' '}
                  {Number(order.total || 0).toLocaleString('it-IT', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {message && <p className="text-sm mt-4">{message}</p>}
    </main>
  )
}
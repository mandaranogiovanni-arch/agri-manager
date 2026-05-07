'use client'

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
  daily_booking_limit?: number | null
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
}

type OrderItem = {
  id: string
  order_id: string
  product_id: string | null
  quantity: number
  price: number
}

export default function CalendarioPage() {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )

  const [viewMode, setViewMode] = useState<'giorno' | 'settimana'>('giorno')
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
      supabase
        .from('products')
        .select('id, name, unit, daily_booking_limit')
        .order('name'),
      supabase
        .from('orders')
        .select(
          'id, order_date, customer_id, total, paid, status, fulfillment_status, pickup_time, notes'
        )
        .eq('status', 'prenotazione')
        .neq('fulfillment_status', 'annullato')
        .order('pickup_time', { ascending: true }),
      supabase
        .from('order_items')
        .select('id, order_id, product_id, quantity, price'),
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

  const dayOrders = useMemo(() => {
    return orders.filter((order) => order.order_date === selectedDate)
  }, [orders, selectedDate])

  const dayOrderIds = useMemo(() => {
    return new Set(dayOrders.map((order) => order.id))
  }, [dayOrders])

  const dayItems = useMemo(() => {
    return items.filter((item) => dayOrderIds.has(item.order_id))
  }, [items, dayOrderIds])

  const productSummary = useMemo(() => {
    return products
      .map((product) => {
        const booked = dayItems
          .filter((item) => item.product_id === product.id)
          .reduce((sum, item) => sum + Number(item.quantity || 0), 0)

        const limit = Number(product.daily_booking_limit || 0)

        return {
          productId: product.id,
          name: product.name,
          unit: product.unit,
          booked,
          limit,
          remaining: limit - booked,
        }
      })
      .filter((row) => row.booked > 0 || row.limit > 0)
  }, [products, dayItems])

  const totalDayRevenue = dayOrders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  )

  function getWeekDays(dateString: string) {
    const date = new Date(dateString)
    const day = date.getDay()
    const diffToMonday = day === 0 ? -6 : 1 - day

    const monday = new Date(date)
    monday.setDate(date.getDate() + diffToMonday)

    return Array.from({ length: 7 }).map((_, index) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + index)
      return d.toISOString().split('T')[0]
    })
  }

  const weekDays = getWeekDays(selectedDate)

  function getOrdersForDate(date: string) {
    return orders.filter((order) => order.order_date === date)
  }

  function getItemsForOrders(orderList: Order[]) {
    const ids = new Set(orderList.map((order) => order.id))
    return items.filter((item) => ids.has(item.order_id))
  }

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Calendario prenotazioni 📅</h1>

      <div className="bg-white border rounded-2xl p-4 mb-6">
        <label className="block text-sm mb-1">Seleziona giorno</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border rounded p-2"
        />

        <div className="mt-4 text-lg font-semibold">
          {new Date(selectedDate).toLocaleDateString('it-IT')}
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button
          type="button"
          onClick={() => setViewMode('giorno')}
          className={`px-4 py-2 rounded border ${
            viewMode === 'giorno' ? 'bg-green-600 text-white' : 'bg-white'
          }`}
        >
          Giorno
        </button>

        <button
          type="button"
          onClick={() => setViewMode('settimana')}
          className={`px-4 py-2 rounded border ${
            viewMode === 'settimana' ? 'bg-green-600 text-white' : 'bg-white'
          }`}
        >
          Settimana
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Prenotazioni</div>
          <div className="text-3xl font-bold">{dayOrders.length}</div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Totale prenotato</div>
          <div className="text-3xl font-bold">
            €{' '}
            {totalDayRevenue.toLocaleString('it-IT', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
        </div>

        <div className="bg-white border rounded-2xl p-4">
          <div className="text-sm text-gray-500">Prodotti prenotati</div>
          <div className="text-3xl font-bold">{dayItems.length}</div>
        </div>
      </div>

      {viewMode === 'settimana' && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Vista settimanale</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-7 gap-3">
            {weekDays.map((date) => {
              const ordersOfDay = getOrdersForDate(date)
              const itemsOfDay = getItemsForOrders(ordersOfDay)

              const totalDay = ordersOfDay.reduce(
                (sum, order) => sum + Number(order.total || 0),
                0
              )

              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => {
                    setSelectedDate(date)
                    setViewMode('giorno')
                  }}
                  className={`text-left bg-white border rounded-2xl p-4 hover:shadow-md ${
                    date === selectedDate ? 'border-green-600 ring-2 ring-green-200' : ''
                  }`}
                >
                  <div className="font-semibold">
                    {new Date(date).toLocaleDateString('it-IT', {
                      weekday: 'short',
                      day: '2-digit',
                      month: '2-digit',
                    })}
                  </div>

                  <div className="mt-2 text-sm text-gray-600">
                    Prenotazioni: {ordersOfDay.length}
                  </div>

                  <div className="text-sm text-gray-600">
                    Prodotti: {itemsOfDay.length}
                  </div>

                  <div className="mt-2 font-semibold">
                    €{' '}
                    {totalDay.toLocaleString('it-IT', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {viewMode === 'giorno' && (
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">Riepilogo prodotti</h2>  

        {productSummary.length === 0 ? (
          <p>Nessun prodotto prenotato per questo giorno.</p>
        ) : (
          <div className="space-y-3">
            {productSummary.map((row) => (
              <div
                key={row.productId}
                className={`bg-white border rounded-2xl p-4 ${
                  row.remaining < 0
                    ? 'border-red-500 bg-red-50'
                    : row.remaining === 0 && row.limit > 0
                    ? 'border-orange-500 bg-orange-50'
                    : ''
                }`}
              >
                <div className="font-semibold text-lg">{row.name}</div>

                <div>
                  Prenotato: {row.booked} {row.unit}
                </div>

                <div>
                  Limite giornaliero: {row.limit} {row.unit}
                </div>

                <div>
                  Rimanente prenotabile: {row.remaining} {row.unit}
                </div>

                {row.remaining < 0 && (
                  <div className="text-red-600 font-semibold mt-2">
                    ⚠️ Superato limite giornaliero
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      {viewMode === 'giorno' && (
      <section>
        <h2 className="text-xl font-semibold mb-3">Prenotazioni del giorno</h2>

        {loading ? (
          <p>Caricamento...</p>
        ) : dayOrders.length === 0 ? (
          <p>Nessuna prenotazione per questo giorno.</p>
        ) : (
          <div className="space-y-4">
            {dayOrders.map((order) => {
              const orderItems = items.filter((item) => item.order_id === order.id)

              return (
                <div key={order.id} className="bg-white border rounded-2xl p-4">
                  <div className="font-semibold text-lg">
                    {order.pickup_time ? `${order.pickup_time} - ` : ''}
                    {getCustomerName(order.customer_id)}
                  </div>

                  <div>
                    Stato: {order.fulfillment_status || 'da_evadere'}
                  </div>

                  <div>
                    Pagamento: {order.paid ? 'Pagato' : 'Non pagato'}
                  </div>

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
                </div>
              )
            })}
          </div>
        )}
      </section>
      )}

      {message && <p className="text-sm mt-4">{message}</p>}
    </main>
  )
}
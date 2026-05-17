'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

type Product = {
  id: string
  name: string
  category: string
  unit: string
  base_price: number | null
  daily_booking_limit: number | null
  visible_in_shop: boolean | null
}

type Order = {
  id: string
  order_date: string
  status: string | null
  fulfillment_status: string | null
}

type OrderItem = {
  order_id: string
  product_id: string | null
  quantity: number
}

type CartLine = {
  productId: string
  quantity: string
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [items, setItems] = useState<OrderItem[]>([])

  const [publicOrderNumber, setPublicOrderNumber] = useState<number | null>(null)

  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [pickupTime, setPickupTime] = useState('')

  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [cart, setCart] = useState<CartLine[]>([])

  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [whatsappText, setWhatsappText] = useState('')
  const [showWhatsappButton, setShowWhatsappButton] = useState(false)

  const [shopUserEmail, setShopUserEmail] = useState<string | null>(null)
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setShopUserEmail(data.session?.user.email || null)
      loadAll()
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setShopUserEmail(session?.user.email || null)
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  async function loadAll() {
    setLoading(true)
    setMessage('')

    const [productsRes, ordersRes, itemsRes] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, category, unit, base_price, daily_booking_limit, visible_in_shop')
        .eq('visible_in_shop', true)
        .order('name'),

      supabase
        .from('orders')
        .select('id, order_date, status, fulfillment_status')
        .eq('status', 'prenotazione')
        .neq('fulfillment_status', 'annullato'),

      supabase
        .from('order_items')
        .select('order_id, product_id, quantity'),
    ])

    if (productsRes.error) console.error(productsRes.error)
    if (ordersRes.error) console.error(ordersRes.error)
    if (itemsRes.error) console.error(itemsRes.error)

    setProducts(productsRes.data || [])
    setOrders(ordersRes.data || [])
    setItems(itemsRes.data || [])
    setLoading(false)
  }

  function getBookedQty(productId: string) {
    const dayOrderIds = new Set(
      orders
        .filter((order) => order.order_date === selectedDate)
        .map((order) => order.id)
    )

    return items
      .filter(
        (item) =>
          dayOrderIds.has(item.order_id) &&
          item.product_id === productId
      )
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0)
  }

  function getRemaining(product: Product) {
    const limit = Number(product.daily_booking_limit || 0)
    const booked = getBookedQty(product.id)
    return Math.max(0, limit - booked)
  }

  function updateCart(productId: string, quantity: string) {
    setCart((prev) => {
      const existing = prev.find((line) => line.productId === productId)

      if (existing) {
        return prev.map((line) =>
          line.productId === productId ? { ...line, quantity } : line
        )
      }

      return [...prev, { productId, quantity }]
    })
  }

  const validCart = useMemo(() => {
    return cart.filter(
      (line) => line.productId && Number(line.quantity) > 0
    )
  }, [cart])

  const total = useMemo(() => {
    return validCart.reduce((sum, line) => {
      const product = products.find((p) => p.id === line.productId)
      return sum + Number(line.quantity || 0) * Number(product?.base_price || 0)
    }, 0)
  }, [validCart, products])

  async function createOrder() {
    setMessage('')

    if (!customerName.trim()) {
      setMessage('Inserisci il tuo nome')
      return
    }

    if (validCart.length === 0) {
      setMessage('Seleziona almeno un prodotto')
      return
    }

    for (const line of validCart) {
      const product = products.find((p) => p.id === line.productId)
      if (!product) continue

      const requested = Number(line.quantity || 0)
      const remaining = getRemaining(product)

      if (requested > remaining) {
        setMessage(
          `Disponibilità insufficiente per ${product.name}. Rimasti: ${remaining} ${product.unit}`
        )
        return
      }
    }

    let customerId: string | null = null

    const existingCustomer = await supabase
      .from('customers')
      .select('id')
      .eq('name', customerName.trim())
      .maybeSingle()

    if (existingCustomer.data?.id) {
      customerId = existingCustomer.data.id
    } else {
      const { data, error } = await supabase
        .from('customers')
        .insert([
          {
            name: customerName.trim(),
            phone: customerPhone.trim() || null,
            notes: 'Creato da shop cliente',
          },
        ])
        .select()
        .single()

      if (error) {
        console.error(error)
        setMessage('Errore creazione cliente')
        return
      }

      customerId = data.id
    }

    const payloadItems = validCart.map((line) => {
      const product = products.find((p) => p.id === line.productId)

      return {
        product_id: line.productId,
        quantity: Number(line.quantity),
        price: Number(product?.base_price || 0),
      }
    })

    const { data: orderId, error } = await supabase.rpc('create_shop_order', {
      p_customer_name: customerName.trim(),
      p_customer_phone: customerPhone.trim() || null,
      p_order_date: selectedDate,
      p_pickup_time: pickupTime || null,
      p_notes: notes.trim() || 'Ordine da shop cliente',
      p_items: payloadItems,
    })

    if (error) {
      console.error(error)
      setMessage('Errore invio ordine')
      return
    }

    const { data: createdOrder } = await supabase
      .from('orders')
      .select('public_order_number')
      .eq('id', orderId)
      .single()

    if (createdOrder?.public_order_number) {
      setPublicOrderNumber(createdOrder.public_order_number)
    }

    const orderSummary = validCart
      .map((line) => {
        const product = products.find((p) => p.id === line.productId)
        return `- ${product?.name}: ${line.quantity} ${product?.unit}`
      })
      .join('\n')

    const orderNumberText = createdOrder?.public_order_number
      ? `#${createdOrder.public_order_number}`
      : '-'

    const text = `Nuovo ordine da shop:
    Ordine: ${orderNumberText}
    Nome: ${customerName}
    Telefono: ${customerPhone || '-'}
    Data: ${new Date(selectedDate).toLocaleDateString('it-IT')}
    Ora: ${pickupTime || '-'}
    Prodotti:
    ${orderSummary}
    Totale: € ${total.toLocaleString('it-IT', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}
    Note: ${notes || '-'}`

    setWhatsappText(text)
    setShowWhatsappButton(true)

    setMessage('Ordine inviato con successo ✅')
    setCustomerName('')
    setCustomerPhone('')
    setNotes('')
    setCart([])
    setPickupTime('')
    loadAll()
  }

  async function shopLogin() {
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({
      email: authEmail,
      password: authPassword,
    })

    if (error) {
      setMessage('Email o password non corretti')
      return
    }
  }

  async function shopRegister() {
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email: authEmail,
      password: authPassword,
    })

    if (error) {
      setMessage(error.message)
      return
    }

    setMessage('Account creato. Ora puoi accedere.')
    setAuthMode('login')
  }

  async function shopLogout() {
    await supabase.auth.signOut()
  }

  if (!shopUserEmail) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white border rounded-2xl p-6 max-w-sm w-full space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <img src="/icon-192.png" alt="Agri Shop" className="w-12 h-12 rounded-2xl" />
            <div>
              <h1 className="text-2xl font-bold">Agri Shop</h1>
              <p className="text-gray-600 text-sm">Accedi per ordinare</p>
            </div>
          </div>

          <input
            type="email"
            placeholder="Email"
            value={authEmail}
            onChange={(e) => setAuthEmail(e.target.value)}
            className="w-full border rounded p-2"
          />

          <input
            type="password"
            placeholder="Password"
            value={authPassword}
            onChange={(e) => setAuthPassword(e.target.value)}
            className="w-full border rounded p-2"
          />

          <button
            type="button"
            onClick={authMode === 'login' ? shopLogin : shopRegister}
            className="w-full bg-green-600 text-white rounded p-2"
          >
            {authMode === 'login' ? 'Accedi' : 'Crea account'}
          </button>

          <button
            type="button"
            onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
            className="w-full border rounded p-2 bg-white"
          >
            {authMode === 'login'
              ? 'Non hai un account? Registrati'
              : 'Hai già un account? Accedi'}
          </button>

          {message && <p className="text-sm text-red-600">{message}</p>}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/icon-192.png"
            alt="Agri Shop"
            className="w-14 h-14 rounded-2xl"
          />
          <div>
            <h1 className="text-3xl font-bold">Agri Shop</h1>
            <p className="text-gray-600">Ordina prodotti agricoli freschi</p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-4">
          <div className="text-sm text-gray-600">
            Accesso: {shopUserEmail}
          </div>

          <button
            type="button"
            onClick={shopLogout}
            className="text-sm text-red-600"
          >
            Esci
          </button>
        </div>

        <div className="bg-white border rounded-2xl p-4 mb-6">
          <label className="block text-sm mb-1">Giorno ritiro / consegna</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        <div className="bg-white border rounded-2xl p-4 mb-6">
          <label className="block text-sm mb-1">Ora ritiro / consegna</label>
          <input
            type="time"
            value={pickupTime}
            onChange={(e) => setPickupTime(e.target.value)}
            className="w-full border rounded p-2"
          />
        </div>

        {loading ? (
          <p>Caricamento...</p>
        ) : products.length === 0 ? (
          <p>Nessun prodotto disponibile nello shop.</p>
        ) : (
          <div className="space-y-4 mb-6">
            {products.map((product) => {
              const remaining = getRemaining(product)
              const cartLine = cart.find((line) => line.productId === product.id)

              return (
                <div
                  key={product.id}
                  className={`bg-white border rounded-2xl p-4 ${
                    remaining <= 0 ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex justify-between gap-3">
                    <div>
                      <div className="font-semibold text-xl">{product.name}</div>
                      <div className="text-gray-600">
                        €{' '}
                        {Number(product.base_price || 0).toLocaleString('it-IT', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        / {product.unit}
                      </div>
                      <div className="text-sm mt-1">
                        Disponibili per questo giorno: {remaining} {product.unit}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={remaining <= 0}
                      value={cartLine?.quantity || ''}
                      onChange={(e) => updateCart(product.id, e.target.value)}
                      placeholder="Quantità"
                      className="w-full border rounded p-2"
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="bg-white border rounded-2xl p-4 space-y-3">
          <h2 className="text-xl font-semibold">I tuoi dati</h2>

          <input
            type="text"
            placeholder="Nome e cognome"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full border rounded p-2"
          />

          <input
            type="text"
            placeholder="Telefono / WhatsApp"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full border rounded p-2"
          />

          <textarea
            placeholder="Note ordine"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full border rounded p-2"
            rows={3}
          />

          <div className="text-lg font-semibold">
            Totale: €{' '}
            {total.toLocaleString('it-IT', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          <button
            type="button"
            onClick={createOrder}
            className="w-full bg-green-600 text-white rounded p-3"
          >
            Invia ordine
          </button>

          {message && <p className="text-sm">{message}</p>}

          {publicOrderNumber && (
            <div className="border rounded-xl p-4 bg-green-50 text-green-800">
              <div className="font-semibold text-lg">
                Ordine ricevuto ✅
              </div>

              <div className="mt-1">
                Numero ordine: #{publicOrderNumber}
              </div>

              <div className="mt-1">
                Ti contatteremo presto per conferma.
              </div>
            </div>
          )}

          {showWhatsappButton && whatsappText && (
            <a
              href={`https://wa.me/393312677131?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              className="block text-center bg-green-700 text-white rounded p-3"
            >
              Invia riepilogo su WhatsApp
            </a>
          )}
        </div>
      </div>
    </main>
  )
}
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
  category: string
  unit: string
  base_price?: number | null
  [key: string]: any
}

type OrderRow = {
  id: string
  order_date: string
  total: number
  paid: boolean
  customer_id: string | null
  status?: string | null
  pickup_time?: string | null
  notes?: string | null
  fulfillment_status?: string | null
}

type OrderItemRow = {
  id: string
  order_id: string
  product_id: string | null
  quantity: number
  price: number
}

type SaleLine = {
  productId: string
  quantity: string
  price: string
}

type EggProductionRow = {
  quantity: number
  broken: number
}

type StockAdjustmentRow = {
  product_id: string | null
  quantity: number
} 

type ProductAvailability = {
  productId: string
  available: number
}

export default function VenditePage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [orderItems, setOrderItems] = useState<OrderItemRow[]>([])

  const [editingOrderId, setEditingOrderId] = useState<string | null>(null)

  const [customerId, setCustomerId] = useState('')
  const [paid, setPaid] = useState(false)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)

  const [filterType, setFilterType] = useState('tutti')
  const [filterFulfillment, setFilterFulfillment] = useState('tutti')
  const [filterPayment, setFilterPayment] = useState('tutti')
  const [filterCustomer, setFilterCustomer] = useState('tutti')
  const [filterDate, setFilterDate] = useState('')

  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [orderStatus, setOrderStatus] = useState('vendita')
  const [pickupTime, setPickupTime] = useState('')
  const [orderNotes, setOrderNotes] = useState('')
  const [fulfillmentStatus, setFulfillmentStatus] = useState('da_evadere')

  const [showNewCustomer, setShowNewCustomer] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerNotes, setNewCustomerNotes] = useState('') 

  const [availabilityMap, setAvailabilityMap] = useState<Record<string, number>>({})

  const [lines, setLines] = useState<SaleLine[]>([
    { productId: '', quantity: '', price: '' },
  ])

  useEffect(() => {
    loadAll()
  }, [])

  useEffect(() => {
    if (products.length > 0) {
      loadAvailability()
    }
  }, [products])

  async function loadAvailability() {
    const [harvestsRes, itemsRes, adjustmentsRes, eggsRes] = await Promise.all([
      supabase.from('harvests').select('product_id, quantity'),
      supabase.from('order_items').select('product_id, quantity'),
      supabase.from('stock_adjustments').select('product_id, quantity'),
      supabase.from('egg_production').select('quantity, broken'),
    ])

    if (harvestsRes.error || itemsRes.error || adjustmentsRes.error || eggsRes.error) {
      console.error(harvestsRes.error || itemsRes.error || adjustmentsRes.error || eggsRes.error)
      return
    }

    const harvests = harvestsRes.data || []
    const orderItemsAll = itemsRes.data || []
    const adjustments = adjustmentsRes.data || []
    const eggs = eggsRes.data || []

    const eggsAvailable = eggs.reduce(
      (sum, row) => sum + Number(row.quantity || 0) - Number(row.broken || 0),
      0
    )

    const map: Record<string, number> = {}

    for (const product of products) {
      const harvested = harvests
        .filter((h) => h.product_id === product.id)
        .reduce((sum, h) => sum + Number(h.quantity || 0), 0)

      const sold = orderItemsAll
        .filter((item) => item.product_id === product.id)
        .reduce((sum, item) => sum + Number(item.quantity || 0), 0)

      const adjusted = adjustments
        .filter((adj) => adj.product_id === product.id)
        .reduce((sum, adj) => sum + Number(adj.quantity || 0), 0)

      map[product.id] =
        (product.category === 'uova' ? eggsAvailable : harvested) - sold - adjusted
    }

    setAvailabilityMap(map)
  }

  async function loadAll() {
    setLoading(true)
    setMessage('')

    const [customersRes, productsRes, ordersRes, itemsRes] = await Promise.all([
      supabase.from('customers').select('id, name').order('name'),
      supabase.from('products').select('id, name, category, unit, base_price').order('name'),
      supabase
        .from('orders')
        .select(
          'id, order_date, total, paid, customer_id, status, pickup_time, notes, fulfillment_status'
        )
        .order('order_date', { ascending: false })
        .order('created_at', { ascending: false }),
      supabase.from('order_items').select('id, order_id, product_id, quantity, price'),
    ])

    if (customersRes.error) console.error(customersRes.error)
    if (productsRes.error) console.error(productsRes.error)
    if (ordersRes.error) console.error(ordersRes.error)
    if (itemsRes.error) console.error(itemsRes.error)

    setCustomers(customersRes.data || [])
    setProducts(productsRes.data || [])
    setOrders(ordersRes.data || [])
    setOrderItems(itemsRes.data || [])
    setLoading(false)
  }

  function resetForm() {
    setEditingOrderId(null)
    setCustomerId('')
    setPaid(false)
    setOrderDate(new Date().toISOString().split('T')[0])
    setOrderStatus('vendita')
    setPickupTime('')
    setOrderNotes('')
    setFulfillmentStatus('da_evadere')
    setLines([{ productId: '', quantity: '1', price: '' }])
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: '', quantity: '1', price: '' }])
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index))
  }

  function updateLine(index: number, field: keyof SaleLine, value: string) {
    setLines((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line

        const updatedLine = { ...line, [field]: value }

        // 👉 quando cambio prodotto
        if (field === 'productId') {
          const selectedProduct = products.find((p) => p.id === value)

          if (selectedProduct) {
            // se prezzo vuoto o zero → auto riempie
            if (!line.price || Number(line.price) === 0) {
              updatedLine.price = String(selectedProduct.base_price ?? 0)
            }
          }
        }

        return updatedLine
      })
    )
  }

  function lineTotal(line: SaleLine) {
    return Number(line.quantity || 0) * Number(line.price || 0)
  }

  function getLineAvailabilityStatus(line: SaleLine) {
  if (!line.productId) return 'neutral'

  const available = availabilityMap[line.productId] ?? 0
  const requested = Number(line.quantity || 0)

  if (!requested || requested <= 0) return 'neutral'

  return requested <= available ? 'ok' : 'error'
}

function hasAvailabilityErrors() {
  return lines.some((line) => getLineAvailabilityStatus(line) === 'error')
}

  const total = useMemo(() => {
    return lines.reduce((sum, line) => sum + lineTotal(line), 0)
  }, [lines])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchType =
        filterType === 'tutti' ? true : (order.status || 'vendita') === filterType

      const matchFulfillment =
        filterFulfillment === 'tutti'
          ? true
          : (order.fulfillment_status || 'da_evadere') === filterFulfillment

      const matchPayment =
        filterPayment === 'tutti'
          ? true
          : filterPayment === 'pagato'
          ? order.paid
          : !order.paid

      const matchCustomer =
        filterCustomer === 'tutti' ? true : order.customer_id === filterCustomer

      const matchDate = filterDate ? order.order_date === filterDate : true

      return (
        matchType &&
        matchFulfillment &&
        matchPayment &&
        matchCustomer &&
        matchDate
      )
    })
  }, [orders, filterType, filterFulfillment, filterPayment, filterCustomer, filterDate])

  async function createNewCustomer() {
    setMessage('')

    if (!newCustomerName.trim()) {
      setMessage('Inserisci il nome del cliente')
      return
    }

    const { data, error } = await supabase
      .from('customers')
      .insert([
        {
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim() || null,
          notes: newCustomerNotes.trim() || null,
        },
      ])
      .select()
      .single()

    if (error) {
      console.error(error)
      setMessage('Errore creazione cliente ❌')
      return
    }

    setMessage('Cliente creato con successo ✅')
    setShowNewCustomer(false)
    setNewCustomerName('')
    setNewCustomerPhone('')
    setNewCustomerNotes('')

    await loadAll()

    if (data?.id) {
      setCustomerId(data.id)
    }
  }

  function validateForm() {
    if (!customerId) {
      setMessage('Seleziona un cliente')
      return false
    }

    if (!orderDate) {
      setMessage('Inserisci una data valida')
      return false
    }

    const validLines = lines.filter(
      (line) =>
        line.productId &&
        Number(line.quantity) > 0 &&
        Number(line.price) > 0
    )

    if (validLines.length === 0) {
      setMessage('Inserisci almeno una riga valida')
      return false
    }

    const hasInvalidLine = lines.some((line) => {
      const hasSomething = line.productId || line.quantity || line.price
      const valid =
        line.productId &&
        Number(line.quantity) > 0 &&
        Number(line.price) > 0
      return hasSomething && !valid
    })

    if (hasInvalidLine) {
      setMessage('Controlla le righe incomplete o non valide')
      return false
    }

    return true
  }

  async function checkAvailabilityForLines() {
  const validLines = lines.filter(
    (line) =>
      line.productId &&
      Number(line.quantity) > 0 &&
      Number(line.price) > 0
  )

  const [harvestsRes, itemsRes, adjustmentsRes, eggsRes] = await Promise.all([
    supabase.from('harvests').select('product_id, quantity'),
    supabase.from('order_items').select('order_id, product_id, quantity'),
    supabase.from('stock_adjustments').select('product_id, quantity'),
    supabase.from('egg_production').select('quantity, broken'),
  ])

  if (harvestsRes.error || itemsRes.error || adjustmentsRes.error || eggsRes.error) {
    console.error(harvestsRes.error || itemsRes.error || adjustmentsRes.error || eggsRes.error)
    setMessage('Errore controllo disponibilità ❌')
    return false
  }

  const harvests = harvestsRes.data || []
  const orderItemsAll = itemsRes.data || []
  const adjustments: StockAdjustmentRow[] = adjustmentsRes.data || []
  const eggs: EggProductionRow[] = eggsRes.data || []

  const currentOrderItems = editingOrderId
    ? orderItemsAll.filter((item) => item.order_id === editingOrderId)
    : []

  for (const line of validLines) {
    const product = products.find((p) => p.id === line.productId)

    if (!product) {
      setMessage('Prodotto non trovato')
      return false
    }

    const requestedQty = Number(line.quantity || 0)

    const harvested = harvests
      .filter((h) => h.product_id === line.productId)
      .reduce((sum, h) => sum + Number(h.quantity || 0), 0)

    const sold = orderItemsAll
      .filter((item) => item.product_id === line.productId)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0)

    const adjusted = adjustments
      .filter((adj) => adj.product_id === line.productId)
      .reduce((sum, adj) => sum + Number(adj.quantity || 0), 0)

    const eggsAvailable =
      product.category === 'uova'
        ? eggs.reduce(
            (sum, row) => sum + Number(row.quantity || 0) - Number(row.broken || 0),
            0
          )
        : 0

    const currentOrderQtyForThisProduct = currentOrderItems
      .filter((item) => item.product_id === line.productId)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0)

    const available =
      (product.category === 'uova' ? eggsAvailable : harvested) -
      sold -
      adjusted +
      currentOrderQtyForThisProduct

    if (requestedQty > available) {
      setMessage(
        `Disponibilità insufficiente per ${product.name}. Disponibile: ${available} ${product.unit}, richiesto: ${requestedQty} ${product.unit}`
      )
      return false
    }
  }

  return true
}

function getFriendlyErrorMessage(error: any) {
  const raw = error?.message || error?.details || ''

  if (!raw) return 'Errore sconosciuto ❌'

  if (raw.toLowerCase().includes('disponibilità insufficiente')) {
    return raw
  }

  if (raw.toLowerCase().includes('prodotto non trovato')) {
    return 'Prodotto non trovato ❌'
  }

  if (raw.toLowerCase().includes('prodotto mancante')) {
    return 'Manca il prodotto in una riga ordine ❌'
  }

  if (raw.toLowerCase().includes('quantità non valida')) {
    return 'Quantità non valida ❌'
  }

  if (raw.toLowerCase().includes('prezzo non valido')) {
    return 'Prezzo non valido ❌'
  }

  if (raw.toLowerCase().includes('nessuna riga ordine presente')) {
    return 'Inserisci almeno una riga ordine ❌'
  }

  if (raw.toLowerCase().includes('data ordine mancante')) {
    return 'Data ordine mancante ❌'
  }

  if (raw.toLowerCase().includes('totale ordine non valido')) {
    return 'Totale ordine non valido ❌'
  }

  if (raw.toLowerCase().includes('violates foreign key constraint')) {
    return 'Dati collegati non validi ❌'
  }

  return `Errore: ${raw}`
}

  async function saveSale() {
    setMessage('')

    if (!validateForm()) return

    if (orderStatus === 'vendita') {
      const hasAvailability = await checkAvailabilityForLines()
      if (!hasAvailability) return
    }

    const validLines = lines.filter(
      (line) =>
        line.productId &&
        Number(line.quantity) > 0 &&
        Number(line.price) >= 0
    )

    const payloadItems = validLines.map((line) => ({
      product_id: line.productId,
      quantity: Number(line.quantity),
      price: Number(line.price),
    }))

    const { error } = await supabase.rpc('create_order_with_items', {
      p_order_date: orderDate,
      p_total: total,
      p_paid: paid,
      p_customer_id: customerId || null,
      p_status: orderStatus,
      p_fulfillment_status: fulfillmentStatus,
      p_pickup_time: pickupTime || null,
      p_notes: orderNotes.trim() || null,
      p_items: payloadItems,
    })

    if (error) {
      console.error(error)
      setMessage(getFriendlyErrorMessage(error))
      return
    }

    setMessage(
      orderStatus === 'prenotazione'
        ? 'Prenotazione salvata con successo ✅'
        : 'Vendita salvata con successo ✅'
    )

    resetForm()
    loadAll()
    loadAvailability()
  }

  async function updateSale() {
    setMessage('')

    if (!editingOrderId) return
    if (!validateForm()) return

    if (orderStatus === 'vendita') {
      const hasAvailability = await checkAvailabilityForLines()
      if (!hasAvailability) return
    }

    const validLines = lines.filter(
      (line) =>
        line.productId &&
        Number(line.quantity) > 0 &&
        Number(line.price) >= 0
    )

    const payloadItems = validLines.map((line) => ({
      product_id: line.productId,
      quantity: Number(line.quantity),
      price: Number(line.price),
    }))

    const { error } = await supabase.rpc('update_order_with_items', {
      p_order_id: editingOrderId,
      p_order_date: orderDate,
      p_total: total,
      p_paid: paid,
      p_customer_id: customerId || null,
      p_status: orderStatus,
      p_fulfillment_status: fulfillmentStatus,
      p_pickup_time: pickupTime || null,
      p_notes: orderNotes.trim() || null,
      p_items: payloadItems,
    })

    if (error) {
      console.error(error)
      setMessage(getFriendlyErrorMessage(error))
      return
    }

    setMessage('Ordine aggiornato con successo ✅')
    resetForm()
    loadAll()
    loadAvailability()
  }

  function startEditOrder(order: OrderRow) {
    const items = orderItems.filter((item) => item.order_id === order.id)

    setEditingOrderId(order.id)
    setCustomerId(order.customer_id || '')
    setPaid(order.paid)
    setOrderDate(order.order_date)
    setOrderStatus(order.status || 'vendita')
    setPickupTime(order.pickup_time || '')
    setOrderNotes(order.notes || '')
    setFulfillmentStatus(order.fulfillment_status || 'da_evadere')
    setLines(
      items.length > 0
        ? items.map((item) => ({
            productId: item.product_id || '',
            quantity: String(item.quantity),
            price: String(item.price),
          }))
        : [{ productId: '', quantity: '1', price: '' }]
    )

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function updateOrderFulfillmentStatus(
    orderId: string,
    newStatus: string
  ) {
    setMessage('')

    if (newStatus === 'consegnato') {
      const orderToCheck = orders.find((order) => order.id === orderId)

      if (orderToCheck) {
        const itemsToCheck = orderItems.filter((item) => item.order_id === orderId)

        for (const item of itemsToCheck) {
          const product = products.find((p) => p.id === item.product_id)

          if (!product) continue

          const available = availabilityMap[item.product_id || ''] ?? 0

          if (Number(item.quantity) > available) {
            setMessage(
              `Non puoi consegnare: disponibilità insufficiente per ${product.name}. Disponibile: ${available} ${product.unit}, richiesto: ${item.quantity} ${product.unit}`
            )
            return
          }
        }
      }
    }

    const { error } = await supabase.rpc('update_order_status_safe', {
      p_order_id: orderId,
      p_new_status: newStatus,
    })

    if (error) {
      console.error(error)
      setMessage(getFriendlyErrorMessage(error))
      return
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, fulfillment_status: newStatus }
          : order
      )
    )

    setMessage('Stato ordine aggiornato ✅')
    loadAvailability()
  }

  async function updateOrderPaidStatus(orderId: string, newPaidValue: boolean) {
    setMessage('')

    const { error } = await supabase
      .from('orders')
      .update({ paid: newPaidValue })
      .eq('id', orderId)

    if (error) {
      console.error(error)
      setMessage('Errore aggiornamento stato pagamento ❌')
      return
    }

    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, paid: newPaidValue } : order
      )
    )

    setMessage('Stato pagamento aggiornato ✅')
  }

  async function deleteOrder(orderId: string) {
    const conferma = window.confirm(
      'Vuoi davvero eliminare questo ordine?'
    )

    if (!conferma) return

    setMessage('')

    const { error } = await supabase.from('orders').delete().eq('id', orderId)

    if (error) {
      console.error(error)
      setMessage('Errore eliminazione ordine ❌')
      return
    }

    setOrders((prev) => prev.filter((order) => order.id !== orderId))
    setOrderItems((prev) => prev.filter((item) => item.order_id !== orderId))
    setMessage('Ordine eliminato ✅')
    loadAvailability()

    if (editingOrderId === orderId) {
      resetForm()
    }
  }

  function getCustomerName(id: string | null) {
    return customers.find((c) => c.id === id)?.name || 'Cliente sconosciuto'
  }

  function getProductName(productId: string | null) {
    return products.find((p) => p.id === productId)?.name || 'Prodotto sconosciuto'
  }

  function getProductUnit(productId: string | null) {
    return products.find((p) => p.id === productId)?.unit || ''
  }

  function getItemsForOrder(orderId: string) {
    return orderItems.filter((item) => item.order_id === orderId)
  }

  function getStatusLabel(status?: string | null) {
    switch (status) {
      case 'prenotazione':
        return 'Prenotazione'
      case 'vendita':
      default:
        return 'Vendita'
    }
  }

  function getFulfillmentLabel(status?: string | null) {
    switch (status) {
      case 'confermato':
        return 'Confermato'
      case 'consegnato':
        return 'Consegnato / Ritirato'
      case 'annullato':
        return 'Annullato'
      case 'da_evadere':
      default:
        return 'Da evadere'
    }
  }

  const saveDisabled = hasAvailabilityErrors()

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Vendite e Prenotazioni 🛒</h1>

      <div className="bg-white border rounded-2xl p-4 mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {editingOrderId ? 'Modifica ordine' : 'Nuovo ordine'}
          </h2>

          {editingOrderId && (
            <button
              type="button"
              onClick={resetForm}
              className="border rounded px-4 py-2 bg-white"
            >
              Annulla modifica
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Tipo</label>
            <select
              value={orderStatus}
              onChange={(e) => setOrderStatus(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="vendita">Vendita</option>
              <option value="prenotazione">Prenotazione</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">
              {orderStatus === 'prenotazione' ? 'Data prenotazione' : 'Data vendita'}
            </label>
            <input
              type="date"
              value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm mb-1">Ora ritiro / consegna</label>
            <input
              type="time"
              value={pickupTime}
              onChange={(e) => setPickupTime(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Stato ordine</label>
            <select
              value={fulfillmentStatus}
              onChange={(e) => setFulfillmentStatus(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="da_evadere">Da evadere</option>
              <option value="confermato">Confermato</option>
              <option value="consegnato">Consegnato / Ritirato</option>
              <option value="annullato">Annullato</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Cliente</label>
          <div className="flex gap-2">
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="">Seleziona cliente</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowNewCustomer((prev) => !prev)}
              className="border rounded px-4 py-2 bg-white hover:bg-gray-50 whitespace-nowrap"
            >
              + Nuovo cliente
            </button>
          </div>
        </div>

        {showNewCustomer && (
          <div className="border rounded-xl p-4 space-y-3 bg-gray-50">
            <div className="font-medium">Nuovo cliente</div>

            <input
              type="text"
              placeholder="Nome cliente"
              value={newCustomerName}
              onChange={(e) => setNewCustomerName(e.target.value)}
              className="w-full border rounded p-2"
            />

            <input
              type="text"
              placeholder="Telefono"
              value={newCustomerPhone}
              onChange={(e) => setNewCustomerPhone(e.target.value)}
              className="w-full border rounded p-2"
            />

            <textarea
              placeholder="Note cliente"
              value={newCustomerNotes}
              onChange={(e) => setNewCustomerNotes(e.target.value)}
              className="w-full border rounded p-2"
              rows={3}
            />

            <div className="flex gap-2">
              <button
                type="button"
                onClick={createNewCustomer}
                className="bg-blue-600 text-white rounded px-4 py-2"
              >
                Salva cliente
              </button>

              <button
                type="button"
                onClick={() => setShowNewCustomer(false)}
                className="border rounded px-4 py-2 bg-white"
              >
                Chiudi
              </button>
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm mb-1">Note ordine</label>
          <textarea
            value={orderNotes}
            onChange={(e) => setOrderNotes(e.target.value)}
            placeholder="Es. ritiro al banco, consegna domani, chiamare prima..."
            className="w-full border rounded p-2"
            rows={3}
          />
        </div>

        <div className="space-y-4">
          {lines.map((line, index) => (
            <div key={index} className="border rounded-xl p-3 space-y-3">
              <div className="font-medium">Riga {index + 1}</div>

              <div>
                <label className="block text-sm mb-1">Prodotto</label>
                <select
                  value={line.productId}
                  onChange={(e) => {
                    const productId = e.target.value
                    updateLine(index, 'productId', productId)

                    const product = products.find(p => p.id === productId)

                    if (product) {
                      updateLine(index, 'price', String(product.base_price || 0))
                    }
                  }}
                  className="w-full border rounded p-2"
                >
                  <option value="">Seleziona prodotto</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.unit}) - disp. {availabilityMap[product.id] ?? 0}
                    </option>
                  ))}
                </select>

                {line.productId && (
                  <div
                    className={`text-sm mt-1 font-medium ${
                      getLineAvailabilityStatus(line) === 'error'
                        ? 'text-red-600'
                        : getLineAvailabilityStatus(line) === 'ok'
                        ? 'text-green-600'
                        : 'text-gray-600'
                    }`}
                  >
                    Disponibile ora:{' '}
                    {availabilityMap[line.productId] ?? 0}{' '}
                    {products.find((p) => p.id === line.productId)?.unit || ''}

                    {Number(line.quantity || 0) > 0 && (
                      <>
                        {' '}• Richiesto: {Number(line.quantity || 0)}{' '}
                        {products.find((p) => p.id === line.productId)?.unit || ''}
                      </>
                    )}

                    {getLineAvailabilityStatus(line) === 'error' && ' • Quantità insufficiente'}
                    {getLineAvailabilityStatus(line) === 'ok' && ' • OK'}
                  </div>
                )}
              </div>

              <div
                className={`w-full border rounded p-2 ${
                  getLineAvailabilityStatus(line) === 'error'
                    ? 'border-red-500 bg-red-50'
                    : getLineAvailabilityStatus(line) === 'ok'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300'
                }`}
              >
                
                <div>
                  <label className="block text-sm mb-1">Quantità</label>
                  <input
                    type="number"
                    step="0.01"
                    value={line.quantity}
                    onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                    className={`w-full border rounded p-2 ${
                      getLineAvailabilityStatus(line) === 'error'
                        ? 'border-red-500'
                        : getLineAvailabilityStatus(line) === 'ok'
                        ? 'border-green-500'
                        : 'border-gray-300'
                    }`}
                  />
                </div>

                <div className="flex gap-2 items-center">
                  <button
                    type="button"
                    onClick={() =>
                      updateLine(
                        index,
                        'quantity',
                        String(Math.max(1, Number(line.quantity || 0) - 1))
                      )
                    }
                    className="px-3 py-1 border rounded"
                  >
                    -
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateLine(
                        index,
                        'quantity',
                        String(Number(line.quantity || 0) + 1)
                      )
                    }
                    className="px-3 py-1 border rounded"
                  >
                    +
                  </button>
                </div>

                <div>
                  <label className="block text-sm mb-1">Prezzo unitario (€)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={line.price}
                    onChange={(e) => updateLine(index, 'price', e.target.value)}
                    className="w-full border rounded p-2"
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Totale riga</label>
                  <div className="w-full border rounded p-2 bg-gray-50">
                    €{' '}
                    {lineTotal(line).toLocaleString('it-IT', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </div>

              {lines.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="text-red-600 text-sm"
                >
                  Rimuovi riga
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={addLine}
            className="border rounded px-4 py-2 bg-white hover:bg-gray-50"
          >
            + Aggiungi prodotto
          </button>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="paid"
            type="checkbox"
            checked={paid}
            onChange={(e) => setPaid(e.target.checked)}
          />
          <label htmlFor="paid">Pagato</label>
        </div>

        <div className="text-lg font-semibold">
          Totale ordine: €{' '}
          {total.toLocaleString('it-IT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>

        <button
          type="button"
          onClick={editingOrderId ? updateSale : saveSale}
          disabled={hasAvailabilityErrors()}
          className={`w-full rounded p-2 text-white ${
            hasAvailabilityErrors()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700'
          }`}
        >
          {editingOrderId
            ? 'Aggiorna ordine'
            : orderStatus === 'prenotazione'
            ? 'Salva prenotazione'
            : 'Salva vendita'}
        </button>

        {hasAvailabilityErrors() && (
          <p className="text-sm text-red-600 mt-2">
            Non puoi salvare: quantità superiore alla disponibilità.
          </p>
        )}

        {message && <p className="text-sm">{message}</p>}
      </div>

      <div className="bg-white border rounded-2xl p-4 mb-4 space-y-4">
        <h3 className="text-lg font-semibold">Filtri ordini</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          <div>
            <label className="block text-sm mb-1">Tipo</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="tutti">Tutti</option>
              <option value="vendita">Vendita</option>
              <option value="prenotazione">Prenotazione</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Stato ordine</label>
            <select
              value={filterFulfillment}
              onChange={(e) => setFilterFulfillment(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="tutti">Tutti</option>
              <option value="da_evadere">Da evadere</option>
              <option value="confermato">Confermato</option>
              <option value="consegnato">Consegnato / Ritirato</option>
              <option value="annullato">Annullato</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Pagamento</label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="tutti">Tutti</option>
              <option value="pagato">Pagato</option>
              <option value="non_pagato">Non pagato</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Cliente</label>
            <select
              value={filterCustomer}
              onChange={(e) => setFilterCustomer(e.target.value)}
              className="w-full border rounded p-2"
            >
              <option value="tutti">Tutti</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Data</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setFilterType('tutti')
            setFilterFulfillment('tutti')
            setFilterPayment('tutti')
            setFilterCustomer('tutti')
            setFilterDate('')
          }}
          className="border rounded px-4 py-2 bg-white"
        >
          Reset filtri
        </button>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Storico ordini</h2>

        {loading ? (
          <p>Caricamento...</p>
        ) : filteredOrders.length === 0 ? (
          <p>Nessun ordine trovato con questi filtri.</p>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const items = getItemsForOrder(order.id)

              return (
                <div key={order.id} className="bg-white border rounded-2xl p-4">
                  <div className="font-semibold mb-2">
                    Data: {new Date(order.order_date).toLocaleDateString('it-IT')}
                  </div>

                  <div>Tipo: {getStatusLabel(order.status)}</div>
                  <div>Cliente: {getCustomerName(order.customer_id)}</div>

                  <div className="mb-2">
                    Stato ordine attuale: {getFulfillmentLabel(order.fulfillment_status)}
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm mb-1">Cambia stato ordine</label>
                    <select
                      value={order.fulfillment_status || 'da_evadere'}
                      onChange={(e) =>
                        updateOrderFulfillmentStatus(order.id, e.target.value)
                      }
                      className="border rounded p-2"
                    >
                      <option value="da_evadere">Da evadere</option>
                      <option value="confermato">Confermato</option>
                      <option value="consegnato">Consegnato / Ritirato</option>
                      <option value="annullato">Annullato</option>
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="block text-sm mb-1">Stato pagamento</label>
                    <select
                      value={order.paid ? 'pagato' : 'non_pagato'}
                      onChange={(e) =>
                        updateOrderPaidStatus(order.id, e.target.value === 'pagato')
                      }
                      className="border rounded p-2"
                    >
                      <option value="non_pagato">Non pagato</option>
                      <option value="pagato">Pagato</option>
                    </select>
                  </div>

                  {order.pickup_time && (
                    <div>Ora ritiro / consegna: {order.pickup_time}</div>
                  )}

                  {order.notes && <div>Note: {order.notes}</div>}

                  <div className="space-y-2 my-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="border rounded-lg p-3 bg-gray-50"
                      >
                        <div>Prodotto: {getProductName(item.product_id)}</div>
                        <div>
                          Quantità: {item.quantity} {getProductUnit(item.product_id)}
                        </div>
                        <div>
                          Prezzo unitario: €{' '}
                          {Number(item.price).toLocaleString('it-IT', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                        <div>
                          Totale riga: €{' '}
                          {Number(item.quantity * item.price).toLocaleString('it-IT', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-lg font-semibold mb-3">
                    Totale ordine: €{' '}
                    {Number(order.total || 0).toLocaleString('it-IT', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startEditOrder(order)}
                      className="bg-blue-600 text-white rounded px-4 py-2"
                    >
                      Modifica ordine
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteOrder(order.id)}
                      className="bg-red-600 text-white rounded px-4 py-2"
                    >
                      Elimina ordine
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
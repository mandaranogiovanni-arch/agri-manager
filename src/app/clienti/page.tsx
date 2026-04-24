'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

type Customer = {
  id: string
  name: string
  phone: string | null
  notes: string | null
  created_at?: string
}

type Order = {
  id: string
  customer_id: string | null
  order_date: string
  total: number
  paid: boolean
  status?: string | null
  fulfillment_status?: string | null
  pickup_time?: string | null
  notes?: string | null
}

export default function ClientiPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [search, setSearch] = useState('')

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setMessage('')

    const [customersRes, ordersRes] = await Promise.all([
      supabase.from('customers').select('*').order('name'),
      supabase
        .from('orders')
        .select('id, customer_id, order_date, total, paid, status, fulfillment_status, pickup_time, notes')
        .order('order_date', { ascending: false }),
    ])

    if (customersRes.error) {
      console.error(customersRes.error)
      setMessage('Errore caricamento clienti ❌')
    } else {
      setCustomers(customersRes.data || [])
    }

    if (ordersRes.error) {
      console.error(ordersRes.error)
      setMessage('Errore caricamento ordini clienti ❌')
    } else {
      setOrders(ordersRes.data || [])
    }

    setLoading(false)
  }

  function resetForm() {
    setEditingCustomerId(null)
    setName('')
    setPhone('')
    setNotes('')
  }

  async function saveCustomer() {
    setMessage('')

    if (!name.trim()) {
      setMessage('Inserisci il nome del cliente')
      return
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      notes: notes.trim() || null,
    }

    if (editingCustomerId) {
      const { error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', editingCustomerId)

      if (error) {
        console.error(error)
        setMessage('Errore aggiornamento cliente ❌')
        return
      }

      setMessage('Cliente aggiornato ✅')
    } else {
      const { error } = await supabase.from('customers').insert([payload])

      if (error) {
        console.error(error)
        setMessage('Errore salvataggio cliente ❌')
        return
      }

      setMessage('Cliente salvato ✅')
    }

    resetForm()
    loadAll()
  }

  function startEditCustomer(customer: Customer) {
    setEditingCustomerId(customer.id)
    setName(customer.name)
    setPhone(customer.phone || '')
    setNotes(customer.notes || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteCustomer(customerId: string) {
    const customerOrders = orders.filter((order) => order.customer_id === customerId)

    if (customerOrders.length > 0) {
      const confirmWithOrders = window.confirm(
        'Questo cliente ha ordini collegati. Se lo elimini, negli ordini resterà cliente vuoto. Vuoi continuare?'
      )
      if (!confirmWithOrders) return
    } else {
      const confirmDelete = window.confirm('Vuoi davvero eliminare questo cliente?')
      if (!confirmDelete) return
    }

    const { error } = await supabase.from('customers').delete().eq('id', customerId)

    if (error) {
      console.error(error)
      setMessage('Errore eliminazione cliente ❌')
      return
    }

    setMessage('Cliente eliminato ✅')
    setCustomers((prev) => prev.filter((customer) => customer.id !== customerId))

    if (selectedCustomerId === customerId) {
      setSelectedCustomerId(null)
    }

    if (editingCustomerId === customerId) {
      resetForm()
    }
  }

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase()

    if (!q) return customers

    return customers.filter((customer) => {
      const n = customer.name?.toLowerCase() || ''
      const p = customer.phone?.toLowerCase() || ''
      const no = customer.notes?.toLowerCase() || ''

      return n.includes(q) || p.includes(q) || no.includes(q)
    })
  }, [customers, search])

  function getCustomerOrders(customerId: string) {
    return orders.filter((order) => order.customer_id === customerId)
  }

  function getCustomerStats(customerId: string) {
    const customerOrders = getCustomerOrders(customerId)

    const totalSpent = customerOrders.reduce(
      (sum, order) => sum + Number(order.total || 0),
      0
    )

    const unpaidOrders = customerOrders.filter((order) => !order.paid).length

    return {
      orderCount: customerOrders.length,
      totalSpent,
      unpaidOrders,
    }
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId) || null
  const selectedCustomerOrders = selectedCustomerId ? getCustomerOrders(selectedCustomerId) : []

  function getOrderTypeLabel(status?: string | null) {
    return status === 'prenotazione' ? 'Prenotazione' : 'Vendita'
  }

  function getOrderStatusLabel(status?: string | null) {
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

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Clienti 👤</h1>

      <div className="bg-white border rounded-2xl p-4 mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {editingCustomerId ? 'Modifica cliente' : 'Nuovo cliente'}
          </h2>

          {editingCustomerId && (
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
          <label className="block text-sm mb-1">Nome cliente</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Mario Rossi"
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Telefono</label>
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Es. 3331234567"
            className="w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm mb-1">Note</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Es. cliente abituale, preferisce ritiro mattina..."
            className="w-full border rounded p-2"
          />
        </div>

        <button
          onClick={saveCustomer}
          className="w-full bg-green-600 text-white rounded p-2"
        >
          {editingCustomerId ? 'Aggiorna cliente' : 'Salva cliente'}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </div>

      <div className="bg-white border rounded-2xl p-4 mb-6">
        <label className="block text-sm mb-1">Cerca cliente</label>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca per nome, telefono o note"
          className="w-full border rounded p-2"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-3">Elenco clienti</h2>

          {loading ? (
            <p>Caricamento...</p>
          ) : filteredCustomers.length === 0 ? (
            <p>Nessun cliente trovato.</p>
          ) : (
            <div className="space-y-4">
              {filteredCustomers.map((customer) => {
                const stats = getCustomerStats(customer.id)

                return (
                  <div
                    key={customer.id}
                    className={`bg-white border rounded-2xl p-4 ${
                      selectedCustomerId === customer.id ? 'ring-2 ring-green-500' : ''
                    }`}
                  >
                    <div className="font-semibold text-lg">{customer.name}</div>

                    {customer.phone && <div>Telefono: {customer.phone}</div>}
                    {customer.notes && <div>Note: {customer.notes}</div>}

                    <div className="mt-3 space-y-1 text-sm">
                      <div>Ordini totali: {stats.orderCount}</div>
                      <div>
                        Totale speso: €{' '}
                        {stats.totalSpent.toLocaleString('it-IT', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                      <div>Ordini non pagati: {stats.unpaidOrders}</div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerId(customer.id)}
                        className="border rounded px-4 py-2 bg-white"
                      >
                        Storico
                      </button>

                      <button
                        type="button"
                        onClick={() => startEditCustomer(customer)}
                        className="bg-blue-600 text-white rounded px-4 py-2"
                      >
                        Modifica
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteCustomer(customer.id)}
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

        <div>
          <h2 className="text-xl font-semibold mb-3">Storico cliente</h2>

          {!selectedCustomer ? (
            <div className="bg-white border rounded-2xl p-4">
              <p>Seleziona un cliente per vedere lo storico ordini.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-white border rounded-2xl p-4">
                <div className="font-semibold text-lg">{selectedCustomer.name}</div>
                {selectedCustomer.phone && <div>Telefono: {selectedCustomer.phone}</div>}
                {selectedCustomer.notes && <div>Note: {selectedCustomer.notes}</div>}

                <div className="mt-3 text-sm">
                  Totale ordini: {getCustomerStats(selectedCustomer.id).orderCount}
                </div>
                <div className="text-sm">
                  Totale speso: €{' '}
                  {getCustomerStats(selectedCustomer.id).totalSpent.toLocaleString('it-IT', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                <div className="text-sm">
                  Ordini non pagati: {getCustomerStats(selectedCustomer.id).unpaidOrders}
                </div>
              </div>

              {selectedCustomerOrders.length === 0 ? (
                <div className="bg-white border rounded-2xl p-4">
                  <p>Nessun ordine per questo cliente.</p>
                </div>
              ) : (
                selectedCustomerOrders.map((order) => (
                  <div key={order.id} className="bg-white border rounded-2xl p-4">
                    <div className="font-semibold">
                      Data: {new Date(order.order_date).toLocaleDateString('it-IT')}
                    </div>
                    <div>Tipo: {getOrderTypeLabel(order.status)}</div>
                    <div>Stato ordine: {getOrderStatusLabel(order.fulfillment_status)}</div>
                    <div>Pagamento: {order.paid ? 'Pagato' : 'Non pagato'}</div>
                    {order.pickup_time && <div>Ora: {order.pickup_time}</div>}
                    {order.notes && <div>Note: {order.notes}</div>}
                    <div className="mt-2 font-semibold">
                      Totale: €{' '}
                      {Number(order.total || 0).toLocaleString('it-IT', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
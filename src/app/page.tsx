'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

type EggRow = {
  production_date: string
  quantity: number
  broken: number
}

type OrderRow = {
  id: string
  order_date: string
  total: number
  paid: boolean
  fulfillment_status?: string | null
}

type ExpenseRow = {
  amount: number
  expense_date: string
}

type Product = {
  id: string
  name: string
  category: string
  unit: string
}

type Harvest = {
  product_id: string | null
  quantity: number
}

type OrderItem = {
  product_id: string | null
  quantity: number
}

type DashboardStats = {
  eggsToday: number
  brokenToday: number
  goodEggsToday: number
  totalEggRecords: number
  totalRevenue: number
  revenueToday: number
  totalExpenses: number
  expensesToday: number
  netProfit: number
  pendingOrders: number
  unpaidOrders: number
  totalHarvested: number
  availableProductsCount: number
  totalAvailableStock: number
  topSoldProduct: string
  topHarvestedProduct: string
}

export default function Home() {
  const [stats, setStats] = useState<DashboardStats>({
    eggsToday: 0,
    brokenToday: 0,
    goodEggsToday: 0,
    totalEggRecords: 0,
    totalRevenue: 0,
    revenueToday: 0,
    totalExpenses: 0,
    expensesToday: 0,
    netProfit: 0,
    pendingOrders: 0,
    unpaidOrders: 0,
    totalHarvested: 0,
    availableProductsCount: 0,
    totalAvailableStock: 0,
    topSoldProduct: '-',
    topHarvestedProduct: '-',
  })

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    const today = new Date().toISOString().split('T')[0]

    const [
      eggRes,
      orderRes,
      expenseRes,
      productRes,
      harvestRes,
      itemRes,
      adjustmentsRes,
    ] = await Promise.all([
      supabase.from('egg_production').select('production_date, quantity, broken'),
      supabase.from('orders').select('id, order_date, total, paid, fulfillment_status'),
      supabase.from('expenses').select('amount, expense_date'),
      supabase.from('products').select('id, name, category, unit'),
      supabase.from('harvests').select('product_id, quantity'),
      supabase.from('order_items').select('product_id, quantity'),
      supabase.from('stock_adjustments').select('product_id, quantity'),
    ])

    if (eggRes.error) console.error('Errore egg dashboard:', eggRes.error)
    if (orderRes.error) console.error('Errore order dashboard:', orderRes.error)
    if (expenseRes.error) console.error('Errore expenses dashboard:', expenseRes.error)
    if (productRes.error) console.error('Errore products dashboard:', productRes.error)
    if (harvestRes.error) console.error('Errore harvests dashboard:', harvestRes.error)
    if (itemRes.error) console.error('Errore order_items dashboard:', itemRes.error)

    const eggRows: EggRow[] = eggRes.data || []
    const orderRows: OrderRow[] = orderRes.data || []
    const expenseRows: ExpenseRow[] = expenseRes.data || []
    const products: Product[] = productRes.data || []
    const harvests: Harvest[] = harvestRes.data || []
    const orderItems: OrderItem[] = itemRes.data || []
    const adjustments: OrderItem[] = adjustmentsRes.data || []

    const todayEggRows = eggRows.filter((row) => row.production_date === today)
    const eggsToday = todayEggRows.reduce((sum, row) => sum + (row.quantity || 0), 0)
    const brokenToday = todayEggRows.reduce((sum, row) => sum + (row.broken || 0), 0)

    const todayOrders = orderRows.filter((row) => row.order_date === today)
    const totalRevenue = orderRows.reduce((sum, row) => sum + Number(row.total || 0), 0)
    const revenueToday = todayOrders.reduce((sum, row) => sum + Number(row.total || 0), 0)

    const todayExpensesRows = expenseRows.filter((row) => row.expense_date === today)
    const totalExpenses = expenseRows.reduce((sum, row) => sum + Number(row.amount || 0), 0)
    const expensesToday = todayExpensesRows.reduce(
      (sum, row) => sum + Number(row.amount || 0),
      0
    )

    const pendingOrders = orderRows.filter(
      (row) =>
        row.fulfillment_status !== 'consegnato' &&
        row.fulfillment_status !== 'annullato'
    ).length

    const unpaidOrders = orderRows.filter((row) => !row.paid).length

    const productStats = products.map((product) => {
      const harvested = harvests
        .filter((h) => h.product_id === product.id)
        .reduce((sum, h) => sum + Number(h.quantity || 0), 0)

      const sold = orderItems
        .filter((i) => i.product_id === product.id)
        .reduce((sum, i) => sum + Number(i.quantity || 0), 0)

      const adjusted = adjustments
        .filter((a) => a.product_id === product.id)
        .reduce((sum, a) => sum + Number(a.quantity || 0), 0)

      return {
        ...product,
        harvested,
        sold,
        adjusted,
        available: harvested - sold - adjusted,
      }
    })

    const totalHarvested = productStats.reduce((sum, p) => sum + p.harvested, 0)
    const totalAvailableStock = productStats.reduce((sum, p) => sum + p.available, 0)
    const availableProductsCount = productStats.filter((p) => p.available > 0).length

    const topSold = [...productStats].sort((a, b) => b.sold - a.sold)[0]
    const topHarvested = [...productStats].sort((a, b) => b.harvested - a.harvested)[0]

    setStats({
      eggsToday,
      brokenToday,
      goodEggsToday: eggsToday - brokenToday,
      totalEggRecords: eggRows.length,
      totalRevenue,
      revenueToday,
      totalExpenses,
      expensesToday,
      netProfit: totalRevenue - totalExpenses,
      pendingOrders,
      unpaidOrders,
      totalHarvested,
      availableProductsCount,
      totalAvailableStock,
      topSoldProduct: topSold && topSold.sold > 0 ? topSold.name : '-',
      topHarvestedProduct:
        topHarvested && topHarvested.harvested > 0 ? topHarvested.name : '-',
    })
  }

  function Card({ title, value }: any) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-5">
        <div className="text-sm text-gray-500 mb-1">{title}</div>
        <div className="text-3xl font-bold">{value}</div>
      </div>
    )
  }

  return (
  <main className="min-h-screen bg-gray-50 p-6">
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Dashboard Azienda Agricola 🚜</h1>
      <p className="text-gray-600 mb-6">
        Panoramica rapida di produzione, ordini, ricavi, spese e magazzino.
      </p>

      {/* 🥚 PRODUZIONE */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">🥚 Produzione uova</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card title="Uova oggi" value={stats.eggsToday} />
          <Card title="Uova buone oggi" value={stats.goodEggsToday} />
          <Card title="Uova rotte oggi" value={stats.brokenToday} />
          <Card title="Registrazioni uova" value={stats.totalEggRecords} />
        </div>
      </section>

      {/* 💰 ECONOMIA */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">💰 Economia</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card title="Ricavi totali" value={`€ ${stats.totalRevenue.toFixed(2)}`} />
          <Card title="Ricavi oggi" value={`€ ${stats.revenueToday.toFixed(2)}`} />
          <Card title="Spese totali" value={`€ ${stats.totalExpenses.toFixed(2)}`} />
          <Card title="Spese oggi" value={`€ ${stats.expensesToday.toFixed(2)}`} />
          <Card title="Utile netto" value={`€ ${stats.netProfit.toFixed(2)}`} />
        </div>
      </section>

      {/* 📦 ORDINI */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">📦 Ordini</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card title="Ordini da evadere" value={stats.pendingOrders} />
          <Card title="Ordini non pagati" value={stats.unpaidOrders} />
        </div>
      </section>

      {/* 🥕 MAGAZZINO */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">🥕 Magazzino e raccolte</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <Card title="Totale raccolto" value={stats.totalHarvested} />
          <Card title="Prodotti disponibili" value={stats.availableProductsCount} />
          <Card title="Disponibilità teorica" value={stats.totalAvailableStock} />
          <Card title="Prodotto più venduto" value={stats.topSoldProduct} />
          <Card title="Prodotto più raccolto" value={stats.topHarvestedProduct} />
        </div>
      </section>

      {/* MODULI */}
      <h2 className="text-xl font-semibold mb-4">Moduli</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        <Link href="/uova" className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md">
          <div className="text-xl font-semibold mb-2">Produzione uova 🥚</div>
          <div className="text-gray-600">Inserisci la produzione giornaliera.</div>
        </Link>

        <Link href="/vendite" className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md">
          <div className="text-xl font-semibold mb-2">Vendite 🛒</div>
          <div className="text-gray-600">Gestisci vendite e prenotazioni.</div>
        </Link>

        <Link href="/spese" className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md">
          <div className="text-xl font-semibold mb-2">Spese 💸</div>
          <div className="text-gray-600">Controlla i costi aziendali.</div>
        </Link>

        <Link href="/coltivazioni" className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md">
          <div className="text-xl font-semibold mb-2">Coltivazioni 🌱</div>
          <div className="text-gray-600">Gestisci semine e impianti.</div>
        </Link>

        <Link href="/raccolte" className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md">
          <div className="text-xl font-semibold mb-2">Raccolte 🍅</div>
          <div className="text-gray-600">Registra raccolti.</div>
        </Link>

        <Link href="/clienti" className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md">
          <div className="text-xl font-semibold mb-2">Clienti 👤</div>
          <div className="text-gray-600">Gestisci clienti e storico.</div>
        </Link>

        <Link href="/magazzino" className="bg-white rounded-2xl shadow-sm border p-5 hover:shadow-md">
          <div className="text-xl font-semibold mb-2">Magazzino 📦</div>
          <div className="text-gray-600">Controlla disponibilità.</div>
        </Link>
      </div>
    </div>
  </main>
)
}
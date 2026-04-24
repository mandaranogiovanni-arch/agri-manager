'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabase'

type ExpenseRow = {
  id: string
  name: string
  category: string | null
  amount: number
  expense_date: string
  notes: string | null
}

export default function SpesePage() {
  const [expenses, setExpenses] = useState<ExpenseRow[]>([])
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [category, setCategory] = useState('mangime')
  const [amount, setAmount] = useState('')
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadExpenses()
  }, [])

  async function loadExpenses() {
    setLoading(true)

    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('expense_date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      setMessage('Errore caricamento spese ❌')
    } else {
      setExpenses(data || [])
    }

    setLoading(false)
  }

  function resetForm() {
    setEditingExpenseId(null)
    setName('')
    setCategory('mangime')
    setAmount('')
    setExpenseDate(new Date().toISOString().split('T')[0])
    setNotes('')
  }

  async function saveExpense() {
    setMessage('')

    if (!name.trim()) {
      setMessage('Inserisci un nome spesa')
      return
    }

    if (!amount || Number(amount) <= 0) {
      setMessage('Inserisci un importo valido')
      return
    }

    if (!expenseDate) {
      setMessage('Inserisci una data valida')
      return
    }

    const payload = {
      name: name.trim(),
      category,
      amount: Number(amount),
      expense_date: expenseDate,
      notes: notes.trim() || null,
    }

    if (editingExpenseId) {
      const { error } = await supabase
        .from('expenses')
        .update(payload)
        .eq('id', editingExpenseId)

      if (error) {
        console.error(error)
        setMessage('Errore aggiornamento spesa ❌')
        return
      }

      setMessage('Spesa aggiornata ✅')
    } else {
      const { error } = await supabase.from('expenses').insert([payload])

      if (error) {
        console.error(error)
        setMessage('Errore salvataggio spesa ❌')
        return
      }

      setMessage('Spesa salvata ✅')
    }

    resetForm()
    loadExpenses()
  }

  function startEditExpense(expense: ExpenseRow) {
    setEditingExpenseId(expense.id)
    setName(expense.name)
    setCategory(expense.category || 'mangime')
    setAmount(String(expense.amount))
    setExpenseDate(expense.expense_date)
    setNotes(expense.notes || '')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function deleteExpense(expenseId: string) {
    const conferma = window.confirm('Vuoi davvero eliminare questa spesa?')
    if (!conferma) return

    const { error } = await supabase.from('expenses').delete().eq('id', expenseId)

    if (error) {
      console.error(error)
      setMessage('Errore eliminazione spesa ❌')
      return
    }

    setMessage('Spesa eliminata ✅')
    setExpenses((prev) => prev.filter((expense) => expense.id !== expenseId))

    if (editingExpenseId === expenseId) {
      resetForm()
    }
  }

  const totalExpenses = useMemo(() => {
    return expenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0)
  }, [expenses])

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Spese 💸</h1>

      <div className="bg-white border rounded-2xl p-4 mb-8 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">
            {editingExpenseId ? 'Modifica spesa' : 'Nuova spesa'}
          </h2>

          {editingExpenseId && (
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
          <label className="block text-sm mb-1">Nome spesa</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Es. Mangime ovaiole"
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
              <option value="mangime">Mangime</option>
              <option value="semi">Semi</option>
              <option value="piantine">Piantine</option>
              <option value="concime">Concime</option>
              <option value="medicinali">Medicinali</option>
              <option value="acqua">Acqua</option>
              <option value="energia">Energia</option>
              <option value="attrezzatura">Attrezzatura</option>
              <option value="trasporto">Trasporto</option>
              <option value="altro">Altro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Importo (€)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full border rounded p-2"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">Data spesa</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
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
          />
        </div>

        <div className="text-lg font-semibold">
          Totale spese registrate: €{' '}
          {totalExpenses.toLocaleString('it-IT', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}
        </div>

        <button
          onClick={saveExpense}
          className="w-full bg-green-600 text-white rounded p-2"
        >
          {editingExpenseId ? 'Aggiorna spesa' : 'Salva spesa'}
        </button>

        {message && <p className="text-sm">{message}</p>}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-3">Storico spese</h2>

        {loading ? (
          <p>Caricamento...</p>
        ) : expenses.length === 0 ? (
          <p>Nessuna spesa salvata.</p>
        ) : (
          <div className="space-y-4">
            {expenses.map((expense) => (
              <div key={expense.id} className="bg-white border rounded-2xl p-4">
                <div className="font-semibold">
                  {new Date(expense.expense_date).toLocaleDateString('it-IT')}
                </div>
                <div>Nome: {expense.name}</div>
                <div>Categoria: {expense.category || '-'}</div>
                <div>
                  Importo: €{' '}
                  {Number(expense.amount).toLocaleString('it-IT', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
                {expense.notes && <div>Note: {expense.notes}</div>}

                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    onClick={() => startEditExpense(expense)}
                    className="bg-blue-600 text-white rounded px-4 py-2"
                  >
                    Modifica
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteExpense(expense.id)}
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
'use client'

import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'

const CATEGORIES = [
  { value: 'kids', label: 'Kids' },
  { value: 'adults', label: 'Adults' },
  { value: 'seniors', label: 'Seniors' },
] as const

type ServiceRow = {
  id: string
  name: string
  description: string | null
  price: string
  durationMinutes: number
  category: string | null
  isActive: boolean
  displayOrder: number
}

type FormState = {
  name: string
  description: string
  category: (typeof CATEGORIES)[number]['value']
  price: string
  durationMinutes: number
  isActive: boolean
  displayOrder: number
}

function formatMoney(p: string) {
  const n = Number.parseFloat(p)
  if (!Number.isFinite(n)) return p
  return n.toFixed(2)
}

function categoryLabel(c: string | null) {
  const v = (c || 'adults').toLowerCase()
  return CATEGORIES.find((x) => x.value === v)?.label ?? 'Adults'
}

function emptyForm(): FormState {
  return {
    name: '',
    description: '',
    category: 'adults',
    price: '0.00',
    durationMinutes: 30,
    isActive: true,
    displayOrder: 0,
  }
}

export function ServicesSettingsClient() {
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/services', { credentials: 'include' })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Failed to load')
      setRows(json.data ?? [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load services')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (svc: ServiceRow) => {
    setEditingId(svc.id)
    const cat = (svc.category || 'adults').toLowerCase()
    const category = CATEGORIES.some((c) => c.value === cat)
      ? (cat as FormState['category'])
      : 'adults'
    setForm({
      name: svc.name,
      description: svc.description ?? '',
      category,
      price: formatMoney(svc.price),
      durationMinutes: svc.durationMinutes,
      isActive: svc.isActive,
      displayOrder: svc.displayOrder,
    })
    setModalOpen(true)
  }

  const saveModal = async () => {
    const name = form.name.trim()
    if (!name) {
      toast.error('Name is required')
      return
    }
    const priceNum = Number.parseFloat(form.price)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error('Enter a valid price')
      return
    }
    const priceStr = priceNum.toFixed(2)

    if (editingId) {
      const prev = rows
      setRows((r) =>
        r.map((x) =>
          x.id === editingId
            ? {
                ...x,
                name,
                description: form.description || null,
                category: form.category,
                price: priceStr,
                durationMinutes: form.durationMinutes,
                isActive: form.isActive,
                displayOrder: form.displayOrder,
              }
            : x
        )
      )
      setModalOpen(false)
      try {
        const res = await fetch(`/api/admin/services/${editingId}`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            description: form.description || null,
            category: form.category,
            price: priceStr,
            durationMinutes: form.durationMinutes,
            isActive: form.isActive,
            displayOrder: form.displayOrder,
          }),
        })
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || 'Save failed')
        toast.success('Service updated')
        if (json.data) {
          setRows((r) => r.map((x) => (x.id === editingId ? { ...x, ...json.data } : x)))
        }
      } catch (e) {
        setRows(prev)
        toast.error(e instanceof Error ? e.message : 'Save failed')
        setModalOpen(true)
      }
      return
    }

    setModalOpen(false)
    try {
      const res = await fetch('/api/admin/services', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: form.description || null,
          category: form.category,
          price: priceStr,
          durationMinutes: form.durationMinutes,
          isActive: form.isActive,
          displayOrder: form.displayOrder,
        }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Create failed')
      toast.success('Service created')
      if (json.data) setRows((r) => [...r, json.data as ServiceRow])
      else void load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Create failed')
      setModalOpen(true)
    }
  }

  const toggleActive = async (svc: ServiceRow) => {
    const next = !svc.isActive
    const prev = rows
    setRows((r) => r.map((x) => (x.id === svc.id ? { ...x, isActive: next } : x)))
    try {
      const res = await fetch(`/api/admin/services/${svc.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: next }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Update failed')
      toast.success(next ? 'Service activated' : 'Service deactivated')
      if (json.data) setRows((r) => r.map((x) => (x.id === svc.id ? { ...x, ...json.data } : x)))
    } catch (e) {
      setRows(prev)
      toast.error(e instanceof Error ? e.message : 'Update failed')
    }
  }

  const deleteService = async (svc: ServiceRow) => {
    if (
      !window.confirm(
        `Delete “${svc.name}”? Only allowed if no appointments use this service. Otherwise deactivate it instead.`
      )
    ) {
      return
    }
    try {
      const res = await fetch(`/api/admin/services/${svc.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Delete failed')
      toast.success('Service removed')
      setRows((r) => r.filter((x) => x.id !== svc.id))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-headz-black">Services &amp; pricing</h1>
          <p className="text-sm text-headz-gray mt-1">
            Set category (Kids / Adults / Seniors) for the homepage price list. Order controls listing within each
            column.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center rounded-lg bg-headz-red px-4 py-2.5 text-sm font-medium text-white hover:bg-headz-redDark shadow-sm"
        >
          Add service
        </button>
      </div>

      <div className="rounded-xl border border-black/10 bg-white shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-10 text-center text-headz-gray text-sm">Loading…</div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-headz-gray text-sm">No services yet.</div>
        ) : (
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-black/10 bg-headz-black/[0.03] text-left text-xs font-semibold uppercase tracking-wider text-headz-gray">
                <th className="py-3 px-3">Name</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Price</th>
                <th className="py-3 px-3 text-right">Duration</th>
                <th className="py-3 px-3">Order</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((svc) => (
                <tr key={svc.id} className="border-b border-black/5 hover:bg-headz-cream/40">
                  <td className="py-3 px-3 font-medium text-headz-black">{svc.name}</td>
                  <td className="py-3 px-3 text-headz-gray">{categoryLabel(svc.category)}</td>
                  <td className="py-3 px-3 text-right tabular-nums">${formatMoney(svc.price)}</td>
                  <td className="py-3 px-3 text-right">{svc.durationMinutes} min</td>
                  <td className="py-3 px-3 tabular-nums text-headz-gray">{svc.displayOrder}</td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        svc.isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-black/10 text-headz-gray'
                      }`}
                    >
                      {svc.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(svc)}
                      className="text-sm font-medium text-headz-red hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void toggleActive(svc)}
                      className="text-sm font-medium text-headz-gray hover:text-headz-black"
                    >
                      {svc.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteService(svc)}
                      className="text-sm font-medium text-red-700 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-black/10 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal
            aria-labelledby="svc-modal-title"
          >
            <h2 id="svc-modal-title" className="text-lg font-semibold text-headz-black">
              {editingId ? 'Edit service' : 'New service'}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">Name</label>
                <input
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">Category (homepage column)</label>
                <select
                  className="w-full px-3 py-2 border border-black/15 rounded-lg bg-white"
                  value={form.category}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, category: e.target.value as FormState['category'] }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">Description (optional)</label>
                <textarea
                  className="w-full px-3 py-2 border border-black/15 rounded-lg min-h-[80px]"
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-headz-black mb-1">Price (USD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg tabular-nums"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-headz-black mb-1">Duration (min)</label>
                  <input
                    type="number"
                    min={5}
                    className="w-full px-3 py-2 border border-black/15 rounded-lg"
                    value={form.durationMinutes}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, durationMinutes: Number.parseInt(e.target.value, 10) || 0 }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-headz-black mb-1">Display order</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-black/15 rounded-lg"
                    value={form.displayOrder}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, displayOrder: Number.parseInt(e.target.value, 10) || 0 }))
                    }
                  />
                </div>
                <div className="flex items-end">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                      className="rounded border-black/20"
                    />
                    <span className="text-sm font-medium text-headz-black">Active</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-black/15 text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveModal()}
                className="px-4 py-2 rounded-lg bg-headz-red text-white text-sm font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

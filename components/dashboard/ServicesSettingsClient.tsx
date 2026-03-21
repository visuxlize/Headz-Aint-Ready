'use client'

import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { formatServicePriceDisplay } from '@/lib/services/format-service-price'

const CATEGORIES = [
  { value: 'kids', label: 'Kids' },
  { value: 'adults', label: 'Adults' },
  { value: 'seniors', label: 'Seniors' },
  { value: 'add-ons', label: 'Add-ons' },
] as const

type ServiceRow = {
  id: string
  name: string
  description: string | null
  priceDisplayOverride?: string | null
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
  priceDisplayOverride: string
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
    priceDisplayOverride: '',
    durationMinutes: 30,
    isActive: true,
    displayOrder: 0,
  }
}

export function ServicesSettingsClient() {
  const [rows, setRows] = useState<ServiceRow[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<
    'all' | 'kids' | 'adults' | 'seniors' | 'add-ons'
  >('all')
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
      priceDisplayOverride: svc.priceDisplayOverride ?? '',
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
                priceDisplayOverride: form.priceDisplayOverride.trim() || null,
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
            priceDisplayOverride: form.priceDisplayOverride.trim() || null,
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
          priceDisplayOverride: form.priceDisplayOverride.trim() || null,
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

  const filteredRows =
    categoryFilter === 'all'
      ? rows
      : rows.filter((r) => (r.category || 'adults').toLowerCase() === categoryFilter)

  return (
    <div className="space-y-8 pt-2 sm:pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-bold text-headz-black md:text-3xl">Services &amp; pricing</h1>
          <p className="text-sm text-headz-gray mt-1 max-w-xl">
            Categories drive the homepage and booking filters. Order sets sort order; inactive services stay hidden
            from guests.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center rounded-xl bg-headz-red px-4 py-2.5 text-sm font-medium text-white hover:bg-headz-redDark shadow-sm"
        >
          Add service
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['all', 'kids', 'adults', 'seniors', 'add-ons'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setCategoryFilter(key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wide transition-colors ${
              categoryFilter === key
                ? 'bg-headz-black text-white'
                : 'bg-white border border-black/10 text-headz-gray hover:border-headz-red/40'
            }`}
          >
            {key === 'all'
              ? 'All'
              : key === 'add-ons'
                ? 'Add-ons'
                : CATEGORIES.find((c) => c.value === key)?.label ?? key}
          </button>
        ))}
      </div>

      <div>
        {loading ? (
          <div className="rounded-2xl border border-black/10 bg-white p-12 text-center text-headz-gray text-sm">
            Loading…
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-black/15 bg-white p-12 text-center text-headz-gray text-sm">
            {rows.length === 0 ? 'No services yet.' : 'No services in this category.'}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredRows.map((svc) => (
              <div
                key={svc.id}
                className="group flex flex-col rounded-2xl border border-black/[0.08] bg-white p-6 shadow-sm transition-all hover:border-headz-red/20 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold leading-snug text-headz-black">{svc.name}</p>
                    {svc.description?.trim() ? (
                      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-headz-gray">{svc.description}</p>
                    ) : null}
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                      svc.isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-black/[0.06] text-headz-gray'
                    }`}
                  >
                    {svc.isActive ? 'Active' : 'Off'}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex rounded-md bg-headz-cream/90 px-2.5 py-1 text-[11px] font-medium text-headz-black/70">
                    {categoryLabel(svc.category)}
                  </span>
                  <span className="inline-flex rounded-md bg-black/[0.04] px-2.5 py-1 text-[11px] font-medium text-headz-gray">
                    Sort {svc.displayOrder}
                  </span>
                </div>
                <div className="mt-5 border-t border-black/[0.06] pt-5">
                  <p className="text-2xl font-bold tabular-nums leading-none text-headz-red">
                    {formatServicePriceDisplay(svc)}
                  </p>
                  <p className="mt-2 text-xs text-headz-gray">{svc.durationMinutes} minutes</p>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-black/[0.06] pt-4">
                  <button
                    type="button"
                    onClick={() => openEdit(svc)}
                    className="text-sm font-semibold text-headz-red hover:underline"
                  >
                    Edit
                  </button>
                  <span className="text-headz-gray/30" aria-hidden>
                    ·
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggleActive(svc)}
                    className="text-sm font-medium text-headz-black/70 hover:text-headz-black"
                  >
                    {svc.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => void deleteService(svc)}
                    className="ml-auto text-sm font-medium text-red-700 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
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
              <div>
                <label className="block text-sm font-medium text-headz-black mb-1">
                  Price label override (optional)
                </label>
                <input
                  className="w-full px-3 py-2 border border-black/15 rounded-lg"
                  placeholder='e.g. $45.00 & Up — leave empty to use numeric price'
                  value={form.priceDisplayOverride}
                  onChange={(e) => setForm((f) => ({ ...f, priceDisplayOverride: e.target.value }))}
                />
                <p className="text-xs text-headz-gray mt-1">
                  Numeric price below is still used for booking fees and card charges.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-headz-black mb-1">Price (USD, base)</label>
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

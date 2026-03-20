'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { toast } from 'sonner'

type ServiceRow = {
  id: string
  name: string
  description: string | null
  price: string
  durationMinutes: number
  isActive: boolean
  displayOrder: number
}

type FormState = {
  name: string
  description: string
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

function SortableRow({
  svc,
  onEdit,
  onToggleActive,
}: {
  svc: ServiceRow
  onEdit: () => void
  onToggleActive: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: svc.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.7 : 1,
  }

  return (
    <tr ref={setNodeRef} style={style} className="border-b border-black/5 hover:bg-headz-cream/40">
      <td className="py-3 px-2 w-10">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing p-1 text-headz-gray hover:text-headz-black touch-none"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M8 6h2v2H8V6zm0 5h2v2H8v-2zm0 5h2v2H8v-2zm5-10h2v2h-2V6zm0 5h2v2h-2v-2zm0 5h2v2h-2v-2z" />
          </svg>
        </button>
      </td>
      <td className="py-3 px-2 font-medium text-headz-black">{svc.name}</td>
      <td className="py-3 px-2 text-sm text-headz-gray max-w-[200px] truncate" title={svc.description ?? ''}>
        {svc.description || '—'}
      </td>
      <td className="py-3 px-2 text-right tabular-nums">${formatMoney(svc.price)}</td>
      <td className="py-3 px-2 text-right">{svc.durationMinutes} min</td>
      <td className="py-3 px-2">
        <span
          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
            svc.isActive ? 'bg-emerald-100 text-emerald-900' : 'bg-black/10 text-headz-gray'
          }`}
        >
          {svc.isActive ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="py-3 px-2 text-right tabular-nums">{svc.displayOrder}</td>
      <td className="py-3 px-2 text-right space-x-2 whitespace-nowrap">
        <button
          type="button"
          onClick={onEdit}
          className="text-sm font-medium text-headz-red hover:underline"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={onToggleActive}
          className="text-sm font-medium text-headz-gray hover:text-headz-black"
        >
          {svc.isActive ? 'Deactivate' : 'Activate'}
        </button>
      </td>
    </tr>
  )
}

function emptyForm(): FormState {
  return {
    name: '',
    description: '',
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

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

  const orderedIds = useMemo(() => rows.map((r) => r.id), [rows])

  const onDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = rows.findIndex((r) => r.id === active.id)
    const newIndex = rows.findIndex((r) => r.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const previous = rows
    const next = arrayMove(rows, oldIndex, newIndex)
    setRows(next)

    const orderedIds = next.map((r) => r.id)
    try {
      const res = await fetch('/api/admin/services/reorder', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(json.error || 'Reorder failed')
      toast.success('Order saved')
      setRows(next.map((r, i) => ({ ...r, displayOrder: i })))
    } catch (e) {
      setRows(previous)
      toast.error(e instanceof Error ? e.message : 'Could not save order')
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setModalOpen(true)
  }

  const openEdit = (svc: ServiceRow) => {
    setEditingId(svc.id)
    setForm({
      name: svc.name,
      description: svc.description ?? '',
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-headz-black">Services &amp; pricing</h1>
          <p className="text-sm text-headz-gray mt-1">
            Changes apply immediately to booking, no-show fees (20% of price), and the public price list.
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
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="border-b border-black/10 bg-headz-black/[0.03] text-left text-xs font-semibold uppercase tracking-wider text-headz-gray">
                  <th className="py-3 px-2 w-10" aria-hidden />
                  <th className="py-3 px-2">Name</th>
                  <th className="py-3 px-2">Description</th>
                  <th className="py-3 px-2 text-right">Price</th>
                  <th className="py-3 px-2 text-right">Duration</th>
                  <th className="py-3 px-2">Status</th>
                  <th className="py-3 px-2 text-right">Sort</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
                  {rows.map((svc) => (
                    <SortableRow
                      key={svc.id}
                      svc={svc}
                      onEdit={() => openEdit(svc)}
                      onToggleActive={() => void toggleActive(svc)}
                    />
                  ))}
                </SortableContext>
              </tbody>
            </table>
          </DndContext>
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
                <label className="block text-sm font-medium text-headz-black mb-1">Description</label>
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

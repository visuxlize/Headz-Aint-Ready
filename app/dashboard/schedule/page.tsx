import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { barbers, services, appointments } from '@/lib/db/schema'
import { eq, and, gte, lt } from 'drizzle-orm'
import { ScheduleView } from '@/components/dashboard/ScheduleView'

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = toDateString(new Date())
  const dayStart = new Date(`${today}T09:00:00-05:00`)
  const dayEnd = new Date(`${today}T20:00:00-05:00`)

  const [barbersList, servicesList, appointmentsToday] = await Promise.all([
    db.select().from(barbers).where(eq(barbers.isActive, true)).orderBy(barbers.sortOrder),
    db.select().from(services).where(eq(services.isActive, true)),
    db
      .select()
      .from(appointments)
      .where(
        and(
          gte(appointments.startAt, dayStart),
          lt(appointments.startAt, dayEnd),
          eq(appointments.status, 'confirmed')
        )
      ),
  ])

  const byBarber = new Map<string, typeof appointmentsToday>()
  for (const a of appointmentsToday) {
    const list = byBarber.get(a.barberId) ?? []
    list.push(a)
    byBarber.set(a.barberId, list)
  }
  const serviceMap = new Map(servicesList.map((s) => [s.id, s]))
  const barberMap = new Map(barbersList.map((b) => [b.id, b]))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Schedule</h1>
        <p className="text-headz-gray text-sm mt-1">
          Calendar view by barber. Open slots vs blocked. Change the date to load that day.
        </p>
      </div>
      <ScheduleView
        barbers={barbersList}
        services={servicesList}
        appointmentsByBarber={Object.fromEntries(
          barbersList.map((b) => [
            b.id,
            (byBarber.get(b.id) ?? []).sort(
              (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
            ),
          ])
        )}
        serviceMap={Object.fromEntries(serviceMap)}
        barberMap={Object.fromEntries(barberMap)}
        defaultDate={today}
      />
    </div>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { barbers, services, appointments } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { ScheduleView } from '@/components/dashboard/ScheduleView'
import { appointmentStartUtc } from '@/lib/appointments/time'

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10)
}

export default async function SchedulePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const today = toDateString(new Date())

  const [barbersList, servicesList, appointmentsToday] = await Promise.all([
    db.select().from(barbers).where(eq(barbers.isActive, true)).orderBy(barbers.sortOrder),
    db.select().from(services).where(eq(services.isActive, true)).orderBy(services.displayOrder),
    db
      .select()
      .from(appointments)
      .where(and(eq(appointments.appointmentDate, today), eq(appointments.status, 'pending'))),
  ])

  const byBarberProfile = new Map<string, typeof appointmentsToday>()
  for (const a of appointmentsToday) {
    const barber = barbersList.find((b) => b.userId === a.barberId)
    if (!barber) continue
    const list = byBarberProfile.get(barber.id) ?? []
    list.push(a)
    byBarberProfile.set(barber.id, list)
  }
  const serviceMap = new Map(servicesList.map((s) => [s.id, s]))
  const barberByUserId = Object.fromEntries(
    barbersList.filter((b) => b.userId).map((b) => [b.userId as string, b])
  )

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
            (byBarberProfile.get(b.id) ?? []).sort(
              (a, b) => appointmentStartUtc(a).getTime() - appointmentStartUtc(b).getTime()
            ),
          ])
        )}
        serviceMap={Object.fromEntries(serviceMap)}
        barberMap={barberByUserId}
        defaultDate={today}
      />
    </div>
  )
}

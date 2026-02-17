import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { barbers, barberAvailability, barberTimeOff } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { AvailabilityEditor } from '@/components/dashboard/AvailabilityEditor'

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function minutesTo12h(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const ampm = h < 12 ? 'AM' : 'PM'
  return `${hour12}:${String(min).padStart(2, '0')} ${ampm}`
}

function minutesToTime(m: number) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export default async function AvailabilityPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const [barbersList, allAvailability, allTimeOff] = await Promise.all([
    db.select().from(barbers).where(eq(barbers.isActive, true)).orderBy(barbers.sortOrder),
    db.select().from(barberAvailability),
    db.select().from(barberTimeOff),
  ])

  const availabilityByBarber = new Map<string, typeof allAvailability>()
  const timeOffByBarber = new Map<string, typeof allTimeOff>()
  for (const a of allAvailability) {
    const list = availabilityByBarber.get(a.barberId) ?? []
    list.push(a)
    availabilityByBarber.set(a.barberId, list)
  }
  for (const t of allTimeOff) {
    const list = timeOffByBarber.get(t.barberId) ?? []
    list.push(t)
    timeOffByBarber.set(t.barberId, list)
  }

  const barberData = barbersList.map((b) => {
    const av = (availabilityByBarber.get(b.id) ?? []).map((a) => ({
      id: a.id,
      dayOfWeek: a.dayOfWeek,
      dayName: DAY_NAMES[a.dayOfWeek],
      startMinutes: a.startMinutes,
      endMinutes: a.endMinutes,
      startTime: minutesToTime(a.startMinutes),
      endTime: minutesToTime(a.endMinutes),
      startTime12: minutesTo12h(a.startMinutes),
      endTime12: minutesTo12h(a.endMinutes),
    }))
    const totalMinutes = av.reduce((sum, a) => sum + (a.endMinutes - a.startMinutes), 0)
    return {
      barber: {
        id: b.id,
        name: b.name,
        slug: b.slug,
        avatarUrl: b.avatarUrl ?? null,
        email: b.email ?? null,
      },
      availability: av,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      timeOff: (timeOffByBarber.get(b.id) ?? []).map((t) => ({
        id: t.id,
        startDate: String(t.startDate),
        endDate: String(t.endDate),
        type: t.type,
        notes: t.notes,
      })),
    }
  })

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-headz-black">Staff working hours</h1>
        <p className="text-headz-gray text-sm mt-1">
          Recurring weekly hours and time off. Booking only shows slots when the barber is available within store hours.
        </p>
      </div>
      <AvailabilityEditor barberData={barberData} dayNames={DAY_NAMES} dayShort={DAY_SHORT} />
    </div>
  )
}

'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function registerInterest(eventId: string) {
    // Set a cookie (24 hours) to track the event interest
    const cookieStore = await cookies()

    cookieStore.set({
        name: 'interested_event_id',
        value: eventId,
        httpOnly: true,
        path: '/',
        maxAge: 86400 // 24 hours
    })

    redirect('/login')
}

export async function checkInterest() {
    const cookieStore = await cookies()
    const interest = cookieStore.get('interested_event_id')

    if (interest?.value) {
        return interest.value
    }

    return null
}

export async function clearInterest() {
    const cookieStore = await cookies()
    cookieStore.delete('interested_event_id')
}

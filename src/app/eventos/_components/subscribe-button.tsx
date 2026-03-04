'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { registerInterest } from '../actions'

interface SubscribeButtonProps {
    eventId: string
    isLoggedIn: boolean
}

export function SubscribeButton({ eventId, isLoggedIn }: SubscribeButtonProps) {
    const [isPending, startTransition] = useTransition()
    const router = useRouter()

    const handleClick = () => {
        if (isLoggedIn) {
            router.push('/atleta/dashboard')
            return
        }

        startTransition(async () => {
            await registerInterest(eventId)
        })
    }

    return (
        <Button
            onClick={handleClick}
            disabled={isPending}
            variant="default"
            pill
            className="h-12 px-10 text-ui font-bold text-white shadow-lg shadow-primary/20 w-full sm:w-fit"
        >
            {isPending ? 'Redirecionando...' : 'Fazer Inscrição'}
        </Button>
    )
}

import { NextResponse } from 'next/server'
// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUnder18, generateGuardianDeclaration } from '@/lib/guardian-declarations'
import { auditLog } from '@/lib/audit-log'

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url)
    const code = searchParams.get('code')
    // if "next" is in search params, use it as the redirection URL
    const next = searchParams.get('next') ?? '/'

    if (code) {
        const supabase = await createClient()
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (!error) {
            // Generate guardian declaration for minor athletes who registered via /register
            try {
                const { data: { user } } = await supabase.auth.getUser()
                if (user) {
                    const meta = user.user_metadata ?? {}
                    const birthDate = meta.birth_date as string | undefined
                    if (birthDate && isUnder18(birthDate) && meta.role === 'atleta') {
                        const adminClient = createAdminClient()
                        // Check if declaration already exists (e.g., created by academy)
                        const { data: existing } = await adminClient
                            .from('athlete_guardian_declarations')
                            .select('id')
                            .eq('athlete_id', user.id)
                            .maybeSingle()

                        if (!existing) {
                            await generateGuardianDeclaration({
                                adminClient,
                                athleteId: user.id,
                                athleteName: meta.full_name ?? '',
                                academyName: meta.gym_name ?? null,
                                hasGuardian: !!meta.has_guardian,
                                guardianName: meta.guardian_name ?? null,
                                guardianCpf: meta.guardian_cpf ?? null,
                                guardianRelationship: meta.guardian_relationship ?? null,
                                guardianPhone: meta.guardian_phone ?? null,
                                templateType: 'self_register',
                            })
                        }
                    }
                }
            } catch (err) {
                // Do NOT block login — just log so we can detect and retry manually
                auditLog('GUARDIAN_DECLARATION_FAILED', {
                    athlete_id: (await supabase.auth.getUser()).data.user?.id ?? 'unknown',
                    error: err instanceof Error ? err.message : String(err),
                }, 'error')
            }

            const forwardedHost = request.headers.get('x-forwarded-host') // cookie forwarding
            const isLocalEnv = process.env.NODE_ENV === 'development'
            if (isLocalEnv) {
                // we can be sure that origin is http://localhost:3000
                return NextResponse.redirect(`${origin}${next}`)
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`)
            } else {
                return NextResponse.redirect(`${origin}${next}`)
            }
        }
    }

    // return the user to an error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`)
}

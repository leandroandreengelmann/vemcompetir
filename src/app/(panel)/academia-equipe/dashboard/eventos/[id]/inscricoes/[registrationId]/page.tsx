import { redirect } from 'next/navigation';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function RegistrationIndexPage(props: Props) {
    const { id } = await props.params;
    redirect(`/academia-equipe/dashboard/eventos/${id}/inscricoes`);
}

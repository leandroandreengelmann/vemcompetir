import { listLogs, listTemplates } from '../actions';
import { HistoricoClient } from './HistoricoClient';

type SearchParams = Promise<{
    template?: string;
    status?: string;
    phone?: string;
    from?: string;
    to?: string;
    page?: string;
}>;

export default async function HistoricoPage(props: { searchParams: SearchParams }) {
    const sp = await props.searchParams;
    const page = Number(sp.page ?? 1);
    const filters = {
        template: sp.template,
        status: sp.status,
        phone: sp.phone,
        from: sp.from,
        to: sp.to,
        page,
        pageSize: 50,
    };

    const [{ rows, total, pageSize }, templates] = await Promise.all([
        listLogs(filters),
        listTemplates(),
    ]);

    return (
        <HistoricoClient
            rows={rows as any[]}
            total={total}
            page={page}
            pageSize={pageSize}
            templates={(templates as any[]).map((t) => ({ key: t.key, title: t.title }))}
            filters={filters}
        />
    );
}


import { createClient } from '@/lib/supabase/server';
import { requireRole } from '@/lib/auth-guards';
import { NextResponse } from 'next/server';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> } // In Next 15+ params should be awaited if dynamic
) {
    const { id } = await params;

    // Check auth
    try {
        await requireRole('admin_geral');
    } catch (e) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Fetch table info
    const { data: tableData, error: tableError } = await supabase
        .from('category_tables')
        .select('*')
        .eq('id', id)
        .single();

    if (tableError || !tableData) {
        return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    // Fetch rows
    const { data: rows, error: rowsError } = await supabase
        .from('category_rows')
        .select('sexo,idade,divisao_idade,faixa,categoria_peso,peso_min_kg,peso_max_kg,uniforme,categoria_completa')
        .eq('table_id', id)
        .order('created_at', { ascending: false });

    if (rowsError) {
        return NextResponse.json({ error: 'Error fetching rows' }, { status: 500 });
    }

    // Generate CSV
    const headers = [
        'sexo',
        'idade',
        'divisao_idade',
        'faixa',
        'categoria_peso',
        'peso_min_kg',
        'peso_max_kg',
        'uniforme',
        'categoria_completa'
    ];

    const csvRows = [headers.join(',')];

    rows?.forEach(row => {
        const values = headers.map(header => {
            const val = row[header as keyof typeof row];
            if (val === null || val === undefined) return '';
            // Escape quotes and wrap in quotes if contains comma or quote
            const stringVal = String(val);
            if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                return `"${stringVal.replace(/"/g, '""')}"`;
            }
            return stringVal;
        });
        csvRows.push(values.join(','));
    });

    const csvContent = csvRows.join('\n');

    // Return CSV file
    const filename = `${tableData.name.replace(/[^a-z0-9]/gi, '_')}_categorias.csv`;

    return new NextResponse(csvContent, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
        },
    });
}

'use server';

import { requireRole } from '@/lib/auth-guards';
import { createAdminClient } from '@/lib/supabase/admin';
import { slugify } from '@/lib/store';
import { revalidatePath } from 'next/cache';

type Result = { success?: boolean; error?: string; id?: string };

const BUCKET = 'store-images';

async function uniqueSlug(
    admin: ReturnType<typeof createAdminClient>,
    table: 'store_categories' | 'store_products',
    base: string,
    ignoreId?: string,
): Promise<string> {
    const root = slugify(base) || 'item';
    let slug = root;
    for (let i = 2; i < 50; i++) {
        let q = admin.from(table).select('id').eq('slug', slug).limit(1);
        if (ignoreId) q = q.neq('id', ignoreId);
        const { data } = await q;
        if (!data || data.length === 0) return slug;
        slug = `${root}-${i}`;
    }
    return `${root}-${Date.now()}`;
}

// ─────────────────────────────── CATEGORIAS ───────────────────────────────

export async function createCategoryAction(formData: FormData): Promise<Result> {
    await requireRole('admin_geral');
    const name = (formData.get('name') as string)?.trim().slice(0, 60);
    if (!name) return { error: 'Informe o nome da categoria.' };

    const admin = createAdminClient();
    const slug = await uniqueSlug(admin, 'store_categories', name);

    const { data, error } = await admin
        .from('store_categories')
        .insert({
            name,
            slug,
            description: ((formData.get('description') as string) || '').trim() || null,
            sort_order: Number(formData.get('sort_order') || 0),
        })
        .select('id')
        .single();

    if (error) return { error: 'Erro ao criar categoria.' };

    revalidatePath('/admin/dashboard/loja/categorias');
    return { success: true, id: data.id };
}

export async function updateCategoryAction(id: string, formData: FormData): Promise<Result> {
    await requireRole('admin_geral');
    const name = (formData.get('name') as string)?.trim().slice(0, 60);
    if (!id || !name) return { error: 'Dados inválidos.' };

    const admin = createAdminClient();
    const { error } = await admin
        .from('store_categories')
        .update({
            name,
            description: ((formData.get('description') as string) || '').trim() || null,
            sort_order: Number(formData.get('sort_order') || 0),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) return { error: 'Erro ao atualizar categoria.' };
    revalidatePath('/admin/dashboard/loja/categorias');
    return { success: true };
}

export async function toggleCategoryAction(id: string, isActive: boolean): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { error } = await admin
        .from('store_categories')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) return { error: 'Erro ao alterar status.' };
    revalidatePath('/admin/dashboard/loja/categorias');
    return { success: true };
}

export async function deleteCategoryAction(id: string): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { error } = await admin.from('store_categories').delete().eq('id', id);
    if (error) return { error: 'Não foi possível excluir (pode haver produtos vinculados).' };
    revalidatePath('/admin/dashboard/loja/categorias');
    return { success: true };
}

export async function uploadCategoryImageAction(formData: FormData): Promise<Result> {
    await requireRole('admin_geral');
    const id = formData.get('category_id') as string;
    const file = formData.get('file') as File;
    if (!id || !file || file.size === 0) return { error: 'Selecione uma imagem.' };

    const admin = createAdminClient();
    const { data: cat } = await admin.from('store_categories').select('image_path').eq('id', id).single();

    const ext = file.name.split('.').pop() || 'jpg';
    const path = `categories/${id}/${Date.now()}.${ext}`;

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (upErr) return { error: 'Erro no upload da imagem.' };

    if (cat?.image_path && cat.image_path !== path) {
        await admin.storage.from(BUCKET).remove([cat.image_path]);
    }
    await admin.from('store_categories').update({ image_path: path, updated_at: new Date().toISOString() }).eq('id', id);

    revalidatePath('/admin/dashboard/loja/categorias');
    return { success: true };
}

// ──────────────────────────────── PRODUTOS ────────────────────────────────

function parsePrice(raw: FormDataEntryValue | null): number {
    if (!raw) return 0;
    const n = Number(String(raw).replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
}

export async function createProductAction(formData: FormData): Promise<Result> {
    await requireRole('admin_geral');
    const name = (formData.get('name') as string)?.trim().slice(0, 120);
    if (!name) return { error: 'Informe o nome do produto.' };

    const admin = createAdminClient();
    const slug = await uniqueSlug(admin, 'store_products', name);
    const promo = parsePrice(formData.get('promo_price'));

    const { data, error } = await admin
        .from('store_products')
        .insert({
            name,
            slug,
            description: ((formData.get('description') as string) || '').trim() || null,
            price: parsePrice(formData.get('price')),
            promo_price: promo > 0 ? promo : null,
            category_id: (formData.get('category_id') as string) || null,
            is_featured: formData.get('is_featured') === 'on',
            is_active: true,
            sort_order: Number(formData.get('sort_order') || 0),
        })
        .select('id')
        .single();

    if (error) return { error: 'Erro ao criar produto.' };
    revalidatePath('/admin/dashboard/loja/produtos');
    return { success: true, id: data.id };
}

export async function updateProductAction(id: string, formData: FormData): Promise<Result> {
    await requireRole('admin_geral');
    const name = (formData.get('name') as string)?.trim().slice(0, 120);
    if (!id || !name) return { error: 'Dados inválidos.' };

    const admin = createAdminClient();
    const promo = parsePrice(formData.get('promo_price'));
    const { error } = await admin
        .from('store_products')
        .update({
            name,
            description: ((formData.get('description') as string) || '').trim() || null,
            price: parsePrice(formData.get('price')),
            promo_price: promo > 0 ? promo : null,
            category_id: (formData.get('category_id') as string) || null,
            is_featured: formData.get('is_featured') === 'on',
            sort_order: Number(formData.get('sort_order') || 0),
            updated_at: new Date().toISOString(),
        })
        .eq('id', id);

    if (error) return { error: 'Erro ao atualizar produto.' };
    revalidatePath('/admin/dashboard/loja/produtos');
    revalidatePath(`/admin/dashboard/loja/produtos/${id}`);
    return { success: true };
}

export async function toggleProductAction(id: string, isActive: boolean): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { error } = await admin
        .from('store_products')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('id', id);
    if (error) return { error: 'Erro ao alterar status.' };
    revalidatePath('/admin/dashboard/loja/produtos');
    return { success: true };
}

export async function deleteProductAction(id: string): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    // Remove imagens do storage antes de apagar o registro.
    const { data: imgs } = await admin.from('store_product_images').select('path').eq('product_id', id);
    if (imgs && imgs.length > 0) {
        await admin.storage.from(BUCKET).remove(imgs.map((i) => i.path));
    }
    const { error } = await admin.from('store_products').delete().eq('id', id);
    if (error) return { error: 'Erro ao excluir produto.' };
    revalidatePath('/admin/dashboard/loja/produtos');
    return { success: true };
}

// ───────────────────────────── FOTOS DO PRODUTO ────────────────────────────

export async function uploadProductImageAction(formData: FormData): Promise<Result> {
    await requireRole('admin_geral');
    const productId = formData.get('product_id') as string;
    const file = formData.get('file') as File;
    if (!productId || !file || file.size === 0) return { error: 'Selecione uma imagem.' };

    const admin = createAdminClient();
    const ext = file.name.split('.').pop() || 'jpg';
    const path = `products/${productId}/${Date.now()}.${ext}`;

    const { error: upErr } = await admin.storage.from(BUCKET).upload(path, file, { upsert: true });
    if (upErr) return { error: 'Erro no upload da imagem.' };

    // Primeira imagem vira a principal automaticamente.
    const { count } = await admin
        .from('store_product_images')
        .select('id', { count: 'exact', head: true })
        .eq('product_id', productId);

    const { error } = await admin.from('store_product_images').insert({
        product_id: productId,
        path,
        is_primary: (count ?? 0) === 0,
        sort_order: count ?? 0,
    });
    if (error) return { error: 'Erro ao registrar a imagem.' };

    revalidatePath(`/admin/dashboard/loja/produtos/${productId}`);
    return { success: true };
}

export async function deleteProductImageAction(imageId: string, productId: string): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { data: img } = await admin.from('store_product_images').select('path, is_primary').eq('id', imageId).single();
    if (img?.path) await admin.storage.from(BUCKET).remove([img.path]);
    await admin.from('store_product_images').delete().eq('id', imageId);

    // Se removeu a principal, promove a próxima como principal.
    if (img?.is_primary) {
        const { data: next } = await admin
            .from('store_product_images')
            .select('id')
            .eq('product_id', productId)
            .order('sort_order', { ascending: true })
            .limit(1)
            .maybeSingle();
        if (next) await admin.from('store_product_images').update({ is_primary: true }).eq('id', next.id);
    }

    revalidatePath(`/admin/dashboard/loja/produtos/${productId}`);
    return { success: true };
}

export async function setPrimaryImageAction(imageId: string, productId: string): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    await admin.from('store_product_images').update({ is_primary: false }).eq('product_id', productId);
    await admin.from('store_product_images').update({ is_primary: true }).eq('id', imageId);
    revalidatePath(`/admin/dashboard/loja/produtos/${productId}`);
    return { success: true };
}

// ──────────────────────────────── VARIAÇÕES ───────────────────────────────

export async function addVariantAction(formData: FormData): Promise<Result> {
    await requireRole('admin_geral');
    const productId = formData.get('product_id') as string;
    const size = ((formData.get('size') as string) || '').trim() || null;
    const color = ((formData.get('color') as string) || '').trim() || null;
    if (!productId || (!size && !color)) return { error: 'Informe ao menos tamanho ou cor.' };

    const admin = createAdminClient();
    const { error } = await admin.from('store_product_variants').insert({
        product_id: productId,
        size,
        color,
        sku: ((formData.get('sku') as string) || '').trim() || null,
    });
    if (error) return { error: 'Erro ao adicionar variação.' };
    revalidatePath(`/admin/dashboard/loja/produtos/${productId}`);
    return { success: true };
}

export async function deleteVariantAction(variantId: string, productId: string): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();
    const { error } = await admin.from('store_product_variants').delete().eq('id', variantId);
    if (error) return { error: 'Erro ao remover variação.' };
    revalidatePath(`/admin/dashboard/loja/produtos/${productId}`);
    return { success: true };
}

// ─────────────────────────────── CONFIGURAÇÕES ────────────────────────────

export async function updateSettingsAction(formData: FormData): Promise<Result> {
    await requireRole('admin_geral');
    const admin = createAdminClient();

    const rawPhone = (formData.get('whatsapp_number') as string) || '';
    const digits = rawPhone.replace(/\D/g, '');
    const whatsapp = digits ? (digits.startsWith('55') ? digits : `55${digits}`) : null;

    const { data: existing } = await admin.from('store_settings').select('id').limit(1).maybeSingle();

    const payload = {
        store_name: ((formData.get('store_name') as string) || '').trim() || null,
        whatsapp_number: whatsapp,
        is_enabled: formData.get('is_enabled') === 'on',
        updated_at: new Date().toISOString(),
    };

    const { error } = existing
        ? await admin.from('store_settings').update(payload).eq('id', existing.id)
        : await admin.from('store_settings').insert(payload);

    if (error) return { error: 'Erro ao salvar configurações.' };
    revalidatePath('/admin/dashboard/loja/configuracoes');
    return { success: true };
}

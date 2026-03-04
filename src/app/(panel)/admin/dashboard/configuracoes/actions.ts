'use server'

import { updateSystemSettingAdmin } from "@/lib/dal/system-settings";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth-guards";

export async function updateRegistrationTaxAction(formData: FormData) {
    // Ensure only admins can update
    await requireRole('admin_geral');

    const tax = formData.get('tax') as string;
    const key = formData.get('key') as string;

    if (!key) return { error: 'Chave de configuração inválida.' };

    // If tax is empty, we might want to delete the setting to revert to default, 
    // but for now let's just allow saving 0 or update if value exists.
    // Actually, if it's empty, we should probably interpret as "remove override"?
    // For simplicity, let's treat empty as 0 or require a value.
    // The user said "define a value".

    // Validate number format
    let taxValue: number;

    if (!tax || tax.trim() === '') {
        // If empty per-event, maybe we should remove the key?
        // Current DAL doesn't support delete, so let's enforce a value or 0.
        // Or we can save '0' or assume 'default'. 
        // Let's require a number for now to avoid complexity, or 0.
        // If it's the global key, it must have a value.
        if (key === 'own_event_registration_tax') {
            return { error: 'O valor padrão é obrigatório.' };
        }
        // For events, if empty, we could functionally remove it by setting empty string?
        // DAL upsert expects string. let's just save empty string and handle it as "no override".
        // But `parseFloat` on empty string is NaN.
        // Let's assume if they clear it, they want to remove override.
        // For now, let's force them to put 0 or a value.
        // But 0 is a valid tax (free).
        // Let's just Require a value for simplicity.
        return { error: 'Informe um valor.' };
    } else {
        const normalizedTax = tax.replace(',', '.');
        taxValue = parseFloat(normalizedTax);
        if (isNaN(taxValue) || taxValue < 0) {
            return { error: 'O valor da taxa deve ser um número positivo.' };
        }
    }

    try {
        // Use Admin DAL to bypass RLS
        await updateSystemSettingAdmin(key, taxValue.toFixed(2));
        revalidatePath('/admin/dashboard/configuracoes');
        return { success: true, message: 'Taxa atualizada com sucesso!' };
    } catch (e) {
        console.error(e);
        return { error: 'Erro ao atualizar a taxa.' };
    }
}

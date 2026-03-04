import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "../supabase/admin";

export interface SystemSetting {
    key: string;
    value: string;
    description: string | null;
}

export async function getSystemSetting(key: string): Promise<string | null> {
    const supabase = await createClient();

    // We use maybeSingle because the key might not exist yet if migration wasn't run
    const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

    if (error) {
        console.error(`Error fetching system setting ${key}:`, error);
        return null; // Return null on error so we can fallback to defaults
    }

    return data?.value || null;
}

export async function updateSystemSetting(key: string, value: string): Promise<void> {
    const supabase = await createClient();

    const { error } = await supabase
        .from('system_settings')
        .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error(`Error updating system setting ${key}:`, error);
        throw new Error(`Failed to update setting: ${error.message}`);
    }
}

export async function updateSystemSettingAdmin(key: string, value: string): Promise<void> {
    const supabase = createAdminClient();

    const { error } = await supabase
        .from('system_settings')
        .upsert({
            key,
            value,
            updated_at: new Date().toISOString()
        })
        .select();

    if (error) {
        console.error(`Error updating system setting (admin) ${key}:`, error);
        throw new Error(`Failed to update setting: ${error.message}`);
    }
}

export async function getSystemSettingsMap(keys: string[]): Promise<Map<string, string>> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', keys);

    if (error) {
        console.error(`Error fetching system settings map:`, error);
        return new Map();
    }

    const map = new Map<string, string>();
    data?.forEach(item => {
        map.set(item.key, item.value);
    });

    return map;
}

let allowedDomains: string[] | null = null

export async function getAllowedDomains(): Promise<string[]> {
    if (allowedDomains) return allowedDomains
    if (!process.env.WHITELIST_JSON_URL || process.env.WHITELIST_JSON_URL === '') return;
    const res = await $fetch(process.env.WHITELIST_JSON_URL);
    allowedDomains = res as string[];
    return allowedDomains;
}
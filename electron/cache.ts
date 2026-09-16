import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CachedScan } from './types';
export type { CachedScan } from './types';

export async function readCache(dir: string): Promise<CachedScan | null> {
    try {
        const data: unknown = JSON.parse(await readFile(join(dir, 'scan-cache.json'), 'utf8'));
        if (!data || typeof data !== 'object') return null;
        const cache = data as Partial<CachedScan>;
        if (cache.formatVersion !== 1 || typeof cache.scannedAt !== 'string' || !Number.isFinite(Date.parse(cache.scannedAt))
            || !Array.isArray(cache.result?.packages) || !Array.isArray(cache.result?.errors)) return null;
        return cache as CachedScan;
    } catch {
        return null;
    }
}

export async function writeCache(dir: string, data: CachedScan): Promise<void> {
    await mkdir(dir, { recursive: true });
    const file = join(dir, 'scan-cache.json');
    await writeFile(`${file}.tmp`, JSON.stringify(data), 'utf8');
    await rename(`${file}.tmp`, file);
}

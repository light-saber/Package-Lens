import { afterEach, beforeEach, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readCache, writeCache } from '../electron/cache';
import type { CachedScan } from '../electron/types';
let dir: string;
beforeEach(() => { dir = mkdtempSync(join(tmpdir(), 'packagelens-cache-')); });
afterEach(() => rmSync(dir, { recursive: true, force: true }));
const data: CachedScan = {
    formatVersion: 1, scannedAt: '2026-09-16T00:00:00.000Z', result: { packages: [], errors: [] },
};
it('round-trips a scan through the atomic cache file', async () => {
    await writeCache(dir, data);
    expect(await readCache(dir)).toEqual(data);
});
it('returns null for a missing file', async () => {
    expect(await readCache(dir)).toBeNull();
});
it('returns null for corrupt JSON', async () => {
    writeFileSync(join(dir, 'scan-cache.json'), '{bad');
    expect(await readCache(dir)).toBeNull();
});
it.each([
    { ...data, formatVersion: 2 }, { ...data, scannedAt: 'invalid' },
    { ...data, result: { packages: {}, errors: [] } }, { ...data, result: { packages: [] } }, null,
])('returns null for an invalid cache shape: %j', async value => {
    writeFileSync(join(dir, 'scan-cache.json'), JSON.stringify(value));
    expect(await readCache(dir)).toBeNull();
});

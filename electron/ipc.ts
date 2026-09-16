import { ipcMain } from 'electron';
import { getAllPackages, resolvePipCmd } from './scanners';
import { updatePackage, updateAll } from './updater';
import { Package, ScanResponse, ScanResult } from './types';
import { readCache, writeCache } from './cache';

let scanPromise: Promise<ScanResult> | null = null;
let completedAt: string | null = null;

async function freshScan(getCacheDir: () => string): Promise<ScanResponse> {
    if (!scanPromise) {
        scanPromise = (async () => {
            const result = await getAllPackages();
            completedAt = new Date().toISOString();
            try {
                await writeCache(getCacheDir(), { formatVersion: 1, scannedAt: completedAt, result });
            } catch {
                console.warn('Unable to persist scan cache');
            }
            return result;
        })().finally(() => { scanPromise = null; });
    }
    const result = await scanPromise;
    return { ...result, scannedAt: completedAt, stale: false };
}

export function registerIpcHandlers(getCacheDir: () => string) {
    let updating = false;
    const runUpdate = async <T>(action: () => Promise<T>) => {
        if (updating) throw new Error('An update is already running');
        updating = true;
        try { return await action(); } finally { updating = false; }
    };
    ipcMain.handle('update-package', (event, pkg: Pick<Package, 'manager' | 'name'>) =>
        runUpdate(() => updatePackage(pkg, output => {
            if (!event.sender.isDestroyed()) event.sender.send('update-output', output);
        })));
    ipcMain.handle('update-all', (event, packages: Package[]) =>
        runUpdate(() => updateAll(packages, output => {
            if (!event.sender.isDestroyed()) event.sender.send('update-output', output);
        })));
    ipcMain.handle('get-packages', async event => {
        if (scanPromise) return freshScan(getCacheDir);
        const cache = await readCache(getCacheDir());
        // Another request may have started a scan while the cache was read.
        if (scanPromise) return freshScan(getCacheDir);
        if (!cache) return freshScan(getCacheDir);
        void freshScan(getCacheDir).then(response => {
            if (!event.sender.isDestroyed()) event.sender.send('scan-complete', response);
        }).catch(() => { console.warn('Background scan failed'); });
        return { ...cache.result, scannedAt: cache.scannedAt, stale: true } satisfies ScanResponse;
    });
    ipcMain.handle('rescan-packages', async event => {
        const response = await freshScan(getCacheDir);
        if (!event.sender.isDestroyed()) event.sender.send('scan-complete', response);
        return response;
    });

    ipcMain.handle('get-uninstall-command', async (_event, pkg: Package) => {
        switch (pkg.manager) {
            case 'brew':
                // Crude check for cask, but 'brew uninstall' usually handles both.
                // If we want to be specific, we could store 'isCask' in Package.
                // For now, 'brew uninstall' is safe.
                return `brew uninstall ${pkg.name}`;
            case 'pip':
                return `${await resolvePipCmd()} uninstall ${pkg.name}`;
            case 'npm':
                return `npm uninstall -g ${pkg.name}`;
            default:
                return '';
        }
    });
}

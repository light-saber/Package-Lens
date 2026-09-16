import { ipcMain } from 'electron';
import { getAllPackages, resolvePipCmd } from './scanners';
import { updatePackage, updateAll } from './updater';
import { Package } from './types';

export function registerIpcHandlers() {
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
    ipcMain.handle('get-packages', async () => {
        return await getAllPackages();
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

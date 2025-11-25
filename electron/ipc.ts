import { ipcMain } from 'electron';
import { getAllPackages } from './scanners';
import { Package } from './types';

export function registerIpcHandlers() {
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
                return `pip3 uninstall ${pkg.name}`;
            case 'npm':
                return `npm uninstall -g ${pkg.name}`;
            default:
                return '';
        }
    });
}

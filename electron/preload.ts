import type { Package, UpdateEvent } from './types';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    updatePackage: (manager: Package['manager'], name: string) => ipcRenderer.invoke('update-package', { manager, name }),
    updateAll: (packages: Package[]) => ipcRenderer.invoke('update-all', packages),
    onUpdateOutput: (callback: (event: UpdateEvent) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, output: UpdateEvent) => callback(output);
        ipcRenderer.on('update-output', listener);
        return () => { ipcRenderer.removeListener('update-output', listener); };
    },
    getPackages: () => ipcRenderer.invoke('get-packages'),
    getUninstallCommand: (pkg: Package) => ipcRenderer.invoke('get-uninstall-command', pkg),
});

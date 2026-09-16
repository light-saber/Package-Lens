import type { Package, ScanResponse, UpdateEvent } from './types';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    updatePackage: (manager: Package['manager'], name: string) => ipcRenderer.invoke('update-package', { manager, name }),
    updateAll: (packages: Package[]) => ipcRenderer.invoke('update-all', packages),
    onUpdateOutput: (callback: (event: UpdateEvent) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, output: UpdateEvent) => callback(output);
        ipcRenderer.on('update-output', listener);
        return () => { ipcRenderer.removeListener('update-output', listener); };
    },
    getPackages: (): Promise<ScanResponse> => ipcRenderer.invoke('get-packages'),
    rescanPackages: (): Promise<ScanResponse> => ipcRenderer.invoke('rescan-packages'),
    onScanComplete: (callback: (response: ScanResponse) => void) => {
        const listener = (_event: Electron.IpcRendererEvent, response: ScanResponse) => callback(response);
        ipcRenderer.on('scan-complete', listener);
        return () => { ipcRenderer.removeListener('scan-complete', listener); };
    },
    getUninstallCommand: (pkg: Package) => ipcRenderer.invoke('get-uninstall-command', pkg),
    getUpdateCommand: (pkg: Package) => ipcRenderer.invoke('get-update-command', pkg),
    openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
});

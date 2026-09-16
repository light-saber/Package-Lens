import type { Package } from './types';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getPackages: () => ipcRenderer.invoke('get-packages'),
    getUninstallCommand: (pkg: Package) => ipcRenderer.invoke('get-uninstall-command', pkg),
});

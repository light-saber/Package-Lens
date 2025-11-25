import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
    getPackages: () => ipcRenderer.invoke('get-packages'),
    getUninstallCommand: (pkg: any) => ipcRenderer.invoke('get-uninstall-command', pkg),
});

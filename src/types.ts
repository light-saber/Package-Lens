export type PackageStatus = 'current' | 'update' | 'unknown';

export interface Package {
    name: string;
    version: string;
    manager: 'brew' | 'pip' | 'npm';
    description: string;
    installPath: string;
    status: PackageStatus;
    latestVersion?: string;
    homepage: string;
    installedAt?: string;
}

declare global {
    interface Window {
        electronAPI: {
            updatePackage: (manager: Package['manager'], name: string) => Promise<{ exitCode: number }>;
            updateAll: (packages: Package[]) => Promise<{ ok: number; failed: number }>;
            onUpdateOutput: (callback: (event: UpdateEvent) => void) => () => void;
            getPackages: () => Promise<ScanResponse>;
            rescanPackages: () => Promise<ScanResponse>;
            onScanComplete: (callback: (response: ScanResponse) => void) => () => void;
            getUninstallCommand: (pkg: Package) => Promise<string>;
            getUpdateCommand: (pkg: Package) => Promise<string>;
            openExternal: (url: string) => Promise<void>;
        };
    }
}

export type SortKey = 'name' | 'version' | 'status' | 'manager';
export interface SortState { key: SortKey; direction: 'asc' | 'desc'; }

export interface ScannerError {
    manager: Package['manager'];
    message: string;
}

export interface ScanResult {
    packages: Package[];
    errors: ScannerError[];
}

export type UpdateEvent =
    | { type: 'output'; manager: Package['manager']; name: string; line: string }
    | { type: 'done'; manager: Package['manager']; name: string; exitCode: number }
    | { type: 'error'; manager: Package['manager']; name: string; message: string }
    | { type: 'summary'; ok: number; failed: number };

export interface ScanResponse extends ScanResult {
    scannedAt: string | null;
    stale: boolean;
}

export type PackageStatus = 'current' | 'update' | 'unknown';

export interface Package {
    name: string;
    version: string;
    manager: 'brew' | 'pip' | 'npm';
    description: string;
    installPath: string;
    status: PackageStatus;
    latestVersion?: string;
}

declare global {
    interface Window {
        electronAPI: {
            updatePackage: (manager: Package['manager'], name: string) => Promise<{ exitCode: number }>;
            updateAll: (packages: Package[]) => Promise<{ ok: number; failed: number }>;
            onUpdateOutput: (callback: (event: UpdateEvent) => void) => () => void;
            getPackages: () => Promise<ScanResult>;
            getUninstallCommand: (pkg: Package) => Promise<string>;
        };
    }
}

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

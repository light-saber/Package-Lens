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

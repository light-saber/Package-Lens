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

export interface ScannerError {
    manager: 'brew' | 'pip' | 'npm';
    message: string;
}

export interface ScanResult {
    packages: Package[];
    errors: ScannerError[];
}

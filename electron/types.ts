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

export interface ScannerError {
    manager: 'brew' | 'pip' | 'npm';
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

export interface CachedScan {
    formatVersion: 1;
    scannedAt: string;
    result: ScanResult;
}

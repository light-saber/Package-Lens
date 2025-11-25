export interface Package {
    name: string;
    version: string;
    manager: 'brew' | 'pip' | 'npm';
    description: string;
    installPath: string;
    latestVersion?: string;
}

export interface ScannerError {
    manager: 'brew' | 'pip' | 'npm';
    message: string;
}

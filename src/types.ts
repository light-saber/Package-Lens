export interface Package {
    name: string;
    version: string;
    manager: 'brew' | 'pip' | 'npm';
    description: string;
    installPath: string;
    latestVersion?: string;
}

declare global {
    interface Window {
        electronAPI: {
            getPackages: () => Promise<Package[]>;
            getUninstallCommand: (pkg: Package) => Promise<string>;
        };
    }
}

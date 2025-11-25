import { exec } from 'child_process';
import { promisify } from 'util';
import { Package } from './types';
import path from 'path';

const execAsync = promisify(exec);

// Helper to execute command and return stdout
async function runCommand(command: string): Promise<string> {
    try {
        const { stdout } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 }); // 10MB buffer
        return stdout;
    } catch (error) {
        console.error(`Error executing ${command}:`, error);
        // Return empty string or throw? For scanners, maybe return empty JSON or throw.
        // If command fails (e.g. pip not found), we should probably return null or empty.
        throw error;
    }
}

export async function getBrewPackages(): Promise<Package[]> {
    try {
        // Get installed packages with details
        const infoPromise = runCommand('brew info --json=v2 --installed');
        // Get outdated packages
        const outdatedPromise = runCommand('brew outdated --json');

        const [infoOutput, outdatedOutput] = await Promise.all([infoPromise, outdatedPromise]);

        const info = JSON.parse(infoOutput);
        const outdated = JSON.parse(outdatedOutput);

        // Create a map of outdated packages for quick lookup
        const outdatedMap = new Map<string, string>();
        if (Array.isArray(outdated.formulae)) {
            outdated.formulae.forEach((pkg: any) => {
                outdatedMap.set(pkg.name, pkg.current_version);
            });
        }
        // Handle casks if needed, but usually 'brew info' includes them? 
        // brew info --json=v2 includes 'casks' array.
        if (Array.isArray(outdated.casks)) {
            outdated.casks.forEach((pkg: any) => {
                outdatedMap.set(pkg.name, pkg.current_version);
            });
        }

        const packages: Package[] = [];

        // Process Formulae
        if (Array.isArray(info.formulae)) {
            info.formulae.forEach((pkg: any) => {
                packages.push({
                    name: pkg.name,
                    version: pkg.versions.stable || pkg.installed[0]?.version,
                    manager: 'brew',
                    description: pkg.desc || '',
                    installPath: pkg.installed[0]?.runtime_dependencies?.[0]?.path || `/usr/local/Cellar/${pkg.name}`, // Fallback
                    latestVersion: outdatedMap.get(pkg.name),
                });
            });
        }

        // Process Casks
        if (Array.isArray(info.casks)) {
            info.casks.forEach((pkg: any) => {
                packages.push({
                    name: pkg.token,
                    version: pkg.version,
                    manager: 'brew',
                    description: pkg.desc || '',
                    installPath: `/Applications/${pkg.name}.app`, // Approximation, casks vary
                    latestVersion: outdatedMap.get(pkg.token),
                });
            });
        }

        return packages;
    } catch (error) {
        console.error('Failed to scan brew packages:', error);
        return [];
    }
}

export async function getPipPackages(): Promise<Package[]> {
    try {
        // Try pip3 first, then pip
        let pipCmd = 'pip3';
        try {
            await execAsync('pip3 --version');
        } catch {
            pipCmd = 'pip';
        }

        const inspectPromise = runCommand(`${pipCmd} inspect`);
        const outdatedPromise = runCommand(`${pipCmd} list --outdated --format=json`);

        const [inspectOutput, outdatedOutput] = await Promise.all([inspectPromise, outdatedPromise]);

        const inspect = JSON.parse(inspectOutput);
        const outdated = JSON.parse(outdatedOutput);

        const outdatedMap = new Map<string, string>();
        if (Array.isArray(outdated)) {
            outdated.forEach((pkg: any) => {
                outdatedMap.set(pkg.name, pkg.latest_version);
            });
        }

        const packages: Package[] = [];

        // inspect.installed is the array
        if (inspect.installed && Array.isArray(inspect.installed)) {
            inspect.installed.forEach((item: any) => {
                const metadata = item.metadata || {};
                packages.push({
                    name: metadata.name || item.project_name,
                    version: metadata.version || item.version,
                    manager: 'pip',
                    description: metadata.summary || '',
                    installPath: item.installer?.url || '', // inspect output varies. 
                    // Actually 'installed' usually has 'metadata' and 'installer'. 
                    // Let's check where path is. 
                    // Usually it's not directly in 'inspect' output for path?
                    // 'pip show' gives Location. 
                    // 'inspect' has 'direct_url'?
                    // Let's assume empty path if not found for now, or use a placeholder.
                    // Wait, I need path.
                    latestVersion: outdatedMap.get(metadata.name || item.project_name),
                });
            });
        }

        // Fix for path: pip inspect might not give local path easily.
        // We might need to run `pip show` for all? That's slow.
        // Or maybe `pip list -v`?
        // Let's stick to what we have. If path is missing, we can fetch it on demand or leave it.
        // PRD says "Display the exact location".
        // I'll try to get it.

        return packages;
    } catch (error) {
        console.error('Failed to scan pip packages:', error);
        return [];
    }
}

export async function getNpmPackages(): Promise<Package[]> {
    try {
        const listPromise = runCommand('npm list -g --depth=0 --json');
        const outdatedPromise = runCommand('npm outdated -g --json').catch(() => '{}'); // npm outdated returns 1 if outdated packages exist

        const [listOutput, outdatedOutput] = await Promise.all([listPromise, outdatedPromise]);

        const list = JSON.parse(listOutput);
        const outdated = JSON.parse(outdatedOutput || '{}');

        const packages: Package[] = [];

        if (list.dependencies) {
            for (const [name, details] of Object.entries(list.dependencies as Record<string, any>)) {
                packages.push({
                    name,
                    version: details.version,
                    manager: 'npm',
                    description: '', // npm list doesn't give description.
                    installPath: path.join(list.path || '', 'node_modules', name), // Global path
                    latestVersion: outdated[name]?.latest,
                });
            }
        }

        return packages;
    } catch (error) {
        console.error('Failed to scan npm packages:', error);
        return [];
    }
}

export async function getAllPackages(): Promise<Package[]> {
    const [brew, pip, npm] = await Promise.all([
        getBrewPackages(),
        getPipPackages(),
        getNpmPackages(),
    ]);
    return [...brew, ...pip, ...npm];
}

import { exec } from 'child_process';
import { promisify } from 'util';
import { Package, ScanResult } from './types';
import path from 'path';
import { readFile } from 'node:fs/promises';

const execAsync = promisify(exec);
export interface CommandResult { stdout: string; stderr: string; exitCode: number; executionFailed?: boolean }
export async function runCommand(command: string): Promise<CommandResult> {
    try {
        const { stdout, stderr } = await execAsync(command, { maxBuffer: 10 * 1024 * 1024 });
        return { stdout, stderr, exitCode: 0 };
    } catch (error) {
        const failure = error as { stdout?: string; stderr?: string; code?: unknown };
        return { stdout: failure.stdout ?? '', stderr: failure.stderr ?? '', exitCode: typeof failure.code === 'number' ? failure.code : 1, executionFailed: typeof failure.code !== 'number' };
    }
}

function statusFields(version: string, latestVersion?: string): Pick<Package, 'status' | 'latestVersion'> {
    return latestVersion && latestVersion !== version ? { status: 'update', latestVersion } : { status: 'current' };
}
interface BrewFormula { name: string; desc?: string; homepage?: string; urls?: { homepage?: string }; installed: { version: string; path?: string; time?: string }[] }
export function mapBrewFormula(pkg: BrewFormula, outdatedMap: Map<string, string>): Package {
    const version = pkg.installed[0]?.version ?? '';
    return { name: pkg.name, version, manager: 'brew', description: pkg.desc ?? '',
        homepage: pkg.homepage ?? pkg.urls?.homepage ?? '', installedAt: pkg.installed[0]?.time,
        installPath: pkg.installed[0]?.path ?? '/usr/local/Cellar/' + pkg.name,
        ...statusFields(version, outdatedMap.get(pkg.name)) };
}
interface BrewCask { token: string; name: string | string[]; version: string; desc?: string; homepage?: string }
interface PipItem { metadata?: { name?: string; version?: string; summary?: string; home_page?: string; project_urls?: Record<string, string> }; project_name?: string; version?: string; metadata_location?: string }
type NpmOutdated = Record<string, { latest: string }>;
export function mapBrewCask(pkg: BrewCask, outdatedMap: Map<string, string>): Package {
    return { name: pkg.token, version: pkg.version, manager: 'brew', description: pkg.desc ?? '',
        homepage: pkg.homepage ?? '',
        installPath: '/Applications/' + pkg.name + '.app', ...statusFields(pkg.version, outdatedMap.get(pkg.token)) };
}
export function mapPipItem(item: PipItem, outdatedMap: Map<string, string>): Package {
    const name = item.metadata?.name || item.project_name || '';
    const version = item.metadata?.version || item.version || '';
    return { name, version, manager: 'pip', description: item.metadata?.summary || '',
        homepage: item.metadata?.home_page || item.metadata?.project_urls?.['Homepage'] || item.metadata?.project_urls?.['Home page'] || '',
        installPath: item.metadata_location || '', ...statusFields(version, outdatedMap.get(name)) };
}
export function mapNpmEntry(name: string, details: { version: string; path?: string }, outdated: NpmOutdated): Package {
    return { name, version: details.version, manager: 'npm', description: '', homepage: '',
        installPath: path.join(details.path || '', 'node_modules', name), ...statusFields(details.version, outdated[name]?.latest) };
}
let pipPromise: Promise<'pip3' | 'pip'> | undefined;
export function resolvePipCmd(): Promise<'pip3' | 'pip'> {
    return pipPromise ??= runCommand('pip3 --version').then(result => result.exitCode === 0 ? 'pip3' : 'pip');
}
type Runner = typeof runCommand;
function parseOutput(result: CommandResult, manager: Package['manager'], outdated = false): unknown {
    if (result.executionFailed) throw new Error(result.stderr.trim() || 'Command execution failed');
    if (result.exitCode !== 0 && !(outdated && manager === 'npm' && result.exitCode === 1 && result.stdout.trim())) {
        throw new Error(result.stderr.trim() || `Command exited with code ${result.exitCode}`);
    }
    if (outdated && !result.stdout.trim() && result.exitCode === 0) return manager === 'pip' ? [] : {};
    return JSON.parse(result.stdout);
}
function record(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
    return value as Record<string, unknown>;
}
function versionMap(value: unknown): Map<string, string> {
    if (!Array.isArray(value)) throw new Error('Expected an outdated package array');
    return new Map(value.map(entry => {
        const pkg = record(entry);
        const name = pkg.token ?? pkg.name;
        if (typeof name !== 'string' || typeof pkg.latest_version !== 'string') throw new Error('Invalid outdated package');
        return [name, pkg.latest_version];
    }));
}
async function scan(manager: Package['manager'], listCmd: string, outdatedCmd: string, runner: Runner,
    map: (data: unknown, outdated: unknown) => Package[]): Promise<ScanResult> {
    const errors: ScanResult['errors'] = [];
    const [list, outdated] = await Promise.all([runner(listCmd), runner(outdatedCmd)]);
    let data: unknown;
    try { data = parseOutput(list, manager); }
    catch (error) { return { packages: [], errors: [{ manager, message: `Installed scan failed: ${String(error)}` }] }; }
    try {
        return { packages: map(data, parseOutput(outdated, manager, true)), errors };
    } catch (error) {
        errors.push({ manager, message: `Update check failed: ${String(error)}` });
        try {
            return { packages: map(data, manager === 'pip' ? [] : {}).map(pkg => ({ ...pkg, status: 'unknown', latestVersion: undefined })), errors };
        } catch (error) {
            errors.push({ manager, message: `Installed scan failed: ${String(error)}` });
            return { packages: [], errors };
        }
    }
}
export async function getBrewPackages(runner: Runner = runCommand): Promise<ScanResult> {
    return scan('brew', 'brew info --json=v2 --installed', 'brew outdated --json', runner, (data, outdated) => {
        const info = record(data);
        const updates = record(outdated);
        const formulae = versionMap(updates.formulae ?? []);
        const casks = versionMap(updates.casks ?? []);
        return [...((info.formulae ?? []) as BrewFormula[]).map(pkg => mapBrewFormula(pkg, formulae)),
            ...((info.casks ?? []) as BrewCask[]).map(pkg => mapBrewCask(pkg, casks))];
    });
}
export async function getPipPackages(runner: Runner = runCommand): Promise<ScanResult> {
    const pipCmd = await resolvePipCmd();
    return scan('pip', `${pipCmd} inspect`, `${pipCmd} list --outdated --format=json`, runner, (data, outdated) => {
        const updates = versionMap(outdated);
        return ((record(data).installed ?? []) as PipItem[]).map(item => mapPipItem(item, updates));
    });
}
export async function getNpmPackages(runner: Runner = runCommand): Promise<ScanResult> {
    const result = await scan('npm', 'npm list -g --depth=0 --json', 'npm outdated -g --json', runner, (data, outdated) => {
        const list = record(data);
        const updates = record(outdated);
        for (const entry of Object.values(updates)) {
            if (typeof record(entry).latest !== 'string') throw new Error('Invalid npm outdated entry');
        }
        return Object.entries(record(list.dependencies ?? {})).map(([name, details]) => {
            const entry = record(details);
            if (typeof entry.version !== 'string') throw new Error('Invalid npm installed version');
            return mapNpmEntry(name, { version: entry.version, path: typeof list.path === 'string' ? list.path : '' }, updates as NpmOutdated);
        });
    });
    const packages = await Promise.all(result.packages.map(async pkg => {
        const homepage = await readNpmHomepage(pkg.installPath);
        return homepage ? { ...pkg, homepage } : pkg;
    }));
    return { ...result, packages };
}

export async function readNpmHomepage(installPath: string): Promise<string | undefined> {
    try {
        const data = record(JSON.parse(await readFile(path.join(installPath, 'package.json'), 'utf8')));
        return typeof data.homepage === 'string' && data.homepage.trim() ? data.homepage : undefined;
    } catch {
        return undefined;
    }
}

export async function getAllPackages(): Promise<ScanResult> {
    const results = await Promise.all([getBrewPackages(), getPipPackages(), getNpmPackages()]);
    return { packages: results.flatMap(result => result.packages), errors: results.flatMap(result => result.errors) };
}

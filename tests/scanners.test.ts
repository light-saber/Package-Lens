import { describe, expect, it } from 'vitest';
import { mapBrewFormula } from '../electron/scanners';
import info from './fixtures/brewInfo.json';
import outdated from './fixtures/brewOutdated.json';

describe('scanner mappings', () => {
    it('uses the installed formula version and its own cellar path', () => {
        const pkg = mapBrewFormula(info.formulae[0], new Map(outdated.formulae.map(p => [p.name, p.latest_version])));
        expect(pkg.version).toBe('2.0.5');
        expect(pkg.installPath).toBe('/opt/homebrew/Cellar/wget/2.0.5');
        expect(pkg).toMatchObject({ status: 'update', latestVersion: '2.1.0' });
    });
});

import { getNpmPackages, getBrewPackages, getPipPackages, mapBrewCask, mapPipItem, mapNpmEntry, runCommand } from '../electron/scanners';
import pip from './fixtures/pipInspect.json';
import pipOutdated from './fixtures/pipOutdated.json';
import npm from './fixtures/npmList.json';
import npmOutdated from './fixtures/npmOutdated.json';
const result = (stdout: string, exitCode = 0) => ({ stdout, stderr: '', exitCode });
it('maps cask updates and absent keys', () => {
    expect(mapBrewCask(info.casks[0], new Map([['editor', '2.0']]))).toMatchObject({ version: '1.0', status: 'update' });
    expect(mapBrewCask(info.casks[0], new Map()).status).toBe('current');
    expect(mapBrewFormula({ name: 'empty', installed: [] }, new Map()).version).toBe('');
});
it('uses pip metadata location with a string installer', () => {
    expect(mapPipItem(pip.installed[0], new Map(pipOutdated.map(p => [p.name, p.latest_version])))).toMatchObject({ installPath: '/python/requests.dist-info', status: 'update' });
});
it('maps npm latest and global path', () => {
    expect(mapNpmEntry('typescript', { ...npm.dependencies.typescript, path: npm.path }, npmOutdated)).toMatchObject({ version: '5.8', latestVersion: '5.9', status: 'update', installPath: '/usr/local/lib/node_modules/typescript' });
});
it('preserves stdout when a command exits 1', async () => {
    expect(await runCommand("printf '{}' ; exit 1")).toMatchObject({ stdout: '{}', exitCode: 1 });
});
it('accepts npm outdated exit 1 with valid data', async () => {
    const scan = await getNpmPackages(async cmd => result(JSON.stringify(cmd.includes('outdated') ? npmOutdated : npm), cmd.includes('outdated') ? 1 : 0));
    expect(scan.errors).toEqual([]);
    expect(scan.packages[0].status).toBe('update');
});
it('accepts empty successful outdated stdout', async () => {
    const scan = await getNpmPackages(async cmd => result(cmd.includes('outdated') ? '' : JSON.stringify(npm)));
    expect(scan.errors).toEqual([]);
    expect(scan.packages[0].status).toBe('current');
});
it.each(['bad json', '{}'])('marks failed npm checks unknown: %s', async stdout => {
    const scan = await getNpmPackages(async cmd => cmd.includes('outdated') ? result(stdout, 2) : result(JSON.stringify(npm)));
    expect(scan.packages[0].status).toBe('unknown');
    expect(scan.errors[0].manager).toBe('npm');
});
it('surfaces brew and pip outdated failures while retaining installed packages', async () => {
    const brew = await getBrewPackages(async cmd => result(cmd.includes('outdated') ? 'invalid' : JSON.stringify(info)));
    const python = await getPipPackages(async cmd => result(cmd.includes('outdated') ? 'invalid' : JSON.stringify(pip)));
    for (const scan of [brew, python]) {
        expect(scan.packages[0].status).toBe('unknown');
        expect(scan.errors).toHaveLength(1);
    }
});
it('does not accept npm output from a failed execution', async () => {
    const scan = await getNpmPackages(async cmd => cmd.includes('outdated')
        ? { ...result(JSON.stringify(npmOutdated), 1), executionFailed: true }
        : result(JSON.stringify(npm)));
    expect(scan.packages[0].status).toBe('unknown');
    expect(scan.errors).toHaveLength(1);
});


it('enriches formula, cask and pip metadata with their available fields', () => {
    expect(mapBrewFormula(info.formulae[0], new Map())).toMatchObject({
        homepage: 'https://www.gnu.org/software/wget/', installedAt: '2026-05-02 18:30:00 UTC',
    });
    expect(mapBrewFormula({ name: 'new', installed: [], urls: { homepage: 'https://example.com' } }, new Map()).homepage).toBe('https://example.com');
    expect(mapBrewCask(info.casks[0], new Map()).homepage).toBe('https://example.com/editor');
    expect(mapPipItem(pip.installed[0], new Map()).homepage).toBe('https://requests.readthedocs.io/');
    expect(mapPipItem({ metadata: { project_urls: { 'Home page': 'https://example.com' } } }, new Map()).homepage).toBe('https://example.com');
});

import { afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readNpmHomepage } from '../electron/scanners';
const temporaryDirectories: string[] = [];
function npmDirectory() {
    const dir = mkdtempSync(join(tmpdir(), 'packagelens-npm-'));
    temporaryDirectories.push(dir);
    return dir;
}
afterEach(() => temporaryDirectories.splice(0).forEach(dir => rmSync(dir, { recursive: true, force: true })));

it('reads an npm homepage and tolerates missing or invalid package JSON', async () => {
    const dir = npmDirectory();
    expect(await readNpmHomepage(dir)).toBeUndefined();
    for (const content of ['bad json', 'null', '{}', '{"homepage":42}', '{"homepage":"  "}']) {
        writeFileSync(join(dir, 'package.json'), content);
        expect(await readNpmHomepage(dir)).toBeUndefined();
    }
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ homepage: 'https://www.typescriptlang.org/' }));
    expect(await readNpmHomepage(dir)).toBe('https://www.typescriptlang.org/');
});

it.each([true, false])('enriches npm scans without errors when package JSON exists: %s', async exists => {
    const dir = npmDirectory();
    const installPath = join(dir, 'node_modules', 'typescript');
    mkdirSync(installPath, { recursive: true });
    if (exists) writeFileSync(join(installPath, 'package.json'), JSON.stringify({ homepage: 'https://www.typescriptlang.org/' }));
    const scan = await getNpmPackages(async cmd => result(JSON.stringify(cmd.includes('outdated') ? {} : { ...npm, path: dir })));
    expect(scan.errors).toEqual([]);
    expect(scan.packages[0].homepage).toBe(exists ? 'https://www.typescriptlang.org/' : '');
});

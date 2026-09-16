import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { resolvePipCmd } from './scanners';
import type { Package, UpdateEvent } from './types';

type Target = Pick<Package, 'manager' | 'name'>;
type Emit = (event: UpdateEvent) => void;

export async function buildUpdateArgs(manager: Package['manager'], name: string) {
    if (typeof name !== 'string' || !/^(?:@[a-zA-Z0-9_.-]+\/)?[a-zA-Z0-9][a-zA-Z0-9_.+@/-]*$/.test(name)) {
        throw new Error('Invalid package name');
    }
    switch (manager) {
        case 'brew': return { command: 'brew', args: ['upgrade', name] };
        case 'pip': return { command: await resolvePipCmd(), args: ['install', '--upgrade', name] };
        case 'npm': return { command: 'npm', args: ['update', '-g', name] };
        default: throw new Error('Invalid package manager');
    }
}

export async function updatePackage({ manager, name }: Target, emit: Emit): Promise<{ exitCode: number }> {
    try {
        const { command, args } = await buildUpdateArgs(manager, name);
        return await new Promise(resolve => {
            const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
            for (const input of [child.stdout, child.stderr]) {
                createInterface({ input, crlfDelay: Infinity }).on('line', line => {
                    emit({ type: 'output', manager, name, line });
                });
            }
            child.once('error', error => {
                emit({ type: 'error', manager, name, message: error.message });
            });
            child.once('close', code => {
                const exitCode = code ?? 1;
                emit({ type: 'done', manager, name, exitCode });
                resolve({ exitCode });
            });
        });
    } catch (error) {
        emit({ type: 'error', manager, name, message: error instanceof Error ? error.message : String(error) });
        emit({ type: 'done', manager, name, exitCode: 1 });
        return { exitCode: 1 };
    }
}

export async function updateAll(packages: Target[], emit: Emit) {
    const summary = { ok: 0, failed: 0 };
    for (const pkg of packages) {
        const { exitCode } = await updatePackage(pkg, emit);
        if (exitCode === 0) summary.ok++;
        else summary.failed++;
    }
    emit({ type: 'summary', ...summary });
    return summary;
}

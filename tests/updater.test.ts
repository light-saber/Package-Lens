import { describe, expect, it, vi } from 'vitest';
vi.mock('../electron/scanners', () => ({ resolvePipCmd: vi.fn(async () => 'pip') }));
import { buildUpdateArgs } from '../electron/updater';

describe('update command builder', () => {
    it('builds brew arguments', async () => {
        expect(await buildUpdateArgs('brew', 'wget')).toEqual({ command: 'brew', args: ['upgrade', 'wget'] });
    });
    it('uses the resolved pip fallback', async () => {
        expect(await buildUpdateArgs('pip', 'requests')).toEqual({ command: 'pip', args: ['install', '--upgrade', 'requests'] });
    });
    it('keeps scoped npm names in a separate argument', async () => {
        expect(await buildUpdateArgs('npm', '@scope/tool')).toEqual({ command: 'npm', args: ['update', '-g', '@scope/tool'] });
    });
    it.each(['--help', '', 'pkg; touch /tmp/injected', '$(whoami)', 'a\nb'])('rejects invalid or option-like package names: %s', async name => {
        await expect(buildUpdateArgs('npm', name)).rejects.toThrow('Invalid package name');
    });
});

// Fake child streams exercise chunk boundaries and process lifecycle without upgrading software.
import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { updatePackage, updateAll } from '../electron/updater';
import type { UpdateEvent } from '../electron/types';
vi.mock('node:child_process', () => ({ spawn: vi.fn() }));

function childProcess() {
    return Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough() });
}

describe('update execution', () => {
    it('streams complete stdout/stderr lines and flushes final partial lines before done', async () => {
        const child = childProcess();
        vi.mocked(spawn).mockReturnValueOnce(child as unknown as ReturnType<typeof spawn>);
        const events: UpdateEvent[] = [];
        const result = updatePackage({ manager: 'npm', name: '@scope/tool' }, event => events.push(event));
        await vi.waitFor(() => expect(spawn).toHaveBeenCalled());
        child.stdout.write('hel');
        child.stdout.write('lo\nlast');
        child.stderr.end('warning\n');
        child.stdout.end();
        await new Promise(resolve => setImmediate(resolve));
        child.emit('close', 0);
        expect(await result).toEqual({ exitCode: 0 });
        expect(events.filter(event => event.type === 'output').map(event => event.line)).toEqual(['hello', 'warning', 'last']);
        expect(events.at(-1)).toMatchObject({ type: 'done', exitCode: 0 });
        expect(spawn).toHaveBeenLastCalledWith('npm', ['update', '-g', '@scope/tool'], { stdio: ['ignore', 'pipe', 'pipe'] });
    });

    it('waits for each child, continues after failure, and emits the batch summary', async () => {
        const first = childProcess();
        const second = childProcess();
        vi.mocked(spawn).mockClear().mockReturnValueOnce(first as unknown as ReturnType<typeof spawn>)
            .mockReturnValueOnce(second as unknown as ReturnType<typeof spawn>);
        const events: UpdateEvent[] = [];
        const result = updateAll([{ manager: 'brew', name: 'wget' }, { manager: 'pip', name: 'requests' }], event => events.push(event));
        await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(1));
        first.emit('error', new Error('spawn failed'));
        first.emit('close', -2);
        await vi.waitFor(() => expect(spawn).toHaveBeenCalledTimes(2));
        second.emit('close', 0);
        expect(await result).toEqual({ ok: 1, failed: 1 });
        expect(events).toContainEqual({ type: 'error', manager: 'brew', name: 'wget', message: 'spawn failed' });
        expect(events.at(-1)).toEqual({ type: 'summary', ok: 1, failed: 1 });
    });
});

import { beforeEach, expect, it, vi } from 'vitest';
import type { ScanResult } from '../electron/types';
const mocks = vi.hoisted(() => ({
    handlers: new Map<string, (event: { sender: { isDestroyed: () => boolean; send: ReturnType<typeof vi.fn> } }, ...args: unknown[]) => Promise<unknown>>(),
    scan: vi.fn(), read: vi.fn(), write: vi.fn(), open: vi.fn(),
}));
vi.mock('electron', () => ({
    ipcMain: { handle: (name: string, handler: typeof mocks.handlers extends Map<string, infer T> ? T : never) => mocks.handlers.set(name, handler) },
    shell: { openExternal: mocks.open },
}));
vi.mock('../electron/scanners', () => ({ getAllPackages: mocks.scan, resolvePipCmd: async () => 'pip' }));
vi.mock('../electron/cache', () => ({ readCache: mocks.read, writeCache: mocks.write }));
const result: ScanResult = { packages: [], errors: [] };
const event = { sender: { isDestroyed: () => false, send: vi.fn() } };
async function invoke(name: string, ...args: unknown[]) {
    const handler = mocks.handlers.get(name);
    if (!handler) throw new Error(`Missing handler ${name}`);
    return handler(event, ...args);
}
beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.handlers.clear();
    mocks.read.mockResolvedValue(null);
    mocks.write.mockResolvedValue(undefined);
    mocks.scan.mockResolvedValue(result);
    const { registerIpcHandlers } = await import('../electron/ipc');
    registerIpcHandlers(() => '/cache');
});
it('returns cache immediately and publishes a fresh background scan', async () => {
    const scannedAt = '2026-05-02T18:30:00.000Z';
    mocks.read.mockResolvedValue({ formatVersion: 1, scannedAt, result });
    let finish!: (value: ScanResult) => void;
    mocks.scan.mockReturnValue(new Promise<ScanResult>(resolve => { finish = resolve; }));
    expect(await invoke('get-packages')).toEqual({ ...result, scannedAt, stale: true });
    finish(result);
    await vi.waitFor(() => expect(event.sender.send).toHaveBeenCalledWith('scan-complete', expect.objectContaining({ stale: false })));
    expect(mocks.write).toHaveBeenCalledTimes(1);
});
it('shares one scan and cache write between launch and concurrent refreshes', async () => {
    let finish!: (value: ScanResult) => void;
    mocks.scan.mockReturnValue(new Promise<ScanResult>(resolve => { finish = resolve; }));
    const first = invoke('get-packages');
    await vi.waitFor(() => expect(mocks.scan).toHaveBeenCalledTimes(1));
    const second = invoke('rescan-packages');
    finish(result);
    const [a, b] = await Promise.all([first, second]);
    expect(a).toEqual(b);
    expect(a.stale).toBe(false);
    expect(Date.parse(a.scannedAt!)).not.toBeNaN();
    expect(mocks.scan).toHaveBeenCalledTimes(1);
    expect(mocks.write).toHaveBeenCalledTimes(1);
});

it('returns fresh data when persistence fails and allows the next scan', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.write.mockRejectedValueOnce(new Error('disk unavailable'));
    try {
        expect(await invoke('rescan-packages')).toMatchObject({ ...result, stale: false });
        expect(await invoke('rescan-packages')).toMatchObject({ ...result, stale: false });
        expect(mocks.scan).toHaveBeenCalledTimes(2);
    } finally { warning.mockRestore(); }
});
it('releases the shared guard after a failed scan', async () => {
    mocks.scan.mockRejectedValueOnce(new Error('scan failed'));
    await expect(invoke('rescan-packages')).rejects.toThrow('scan failed');
    expect(await invoke('rescan-packages')).toMatchObject({ ...result, stale: false });
    expect(mocks.scan).toHaveBeenCalledTimes(2);
});

it('builds update commands and safely returns empty string on error', async () => {
    expect(await invoke('get-update-command', { manager: 'brew', name: 'wget' })).toBe('brew upgrade wget');
    expect(await invoke('get-update-command', { manager: 'pip', name: 'requests' })).toBe('pip install --upgrade requests');
    expect(await invoke('get-update-command', { manager: 'npm', name: 'typescript' })).toBe('npm update -g typescript');
    expect(await invoke('get-update-command', { manager: 'npm', name: 'bad; command' })).toBe('');
});

it('restricts open-external to http and https URLs', async () => {
    await invoke('open-external', 'https://brew.sh');
    expect(mocks.open).toHaveBeenCalledWith('https://brew.sh');

    mocks.open.mockClear();
    await invoke('open-external', 'http://example.com/docs');
    expect(mocks.open).toHaveBeenCalledWith('http://example.com/docs');

    mocks.open.mockClear();
    await invoke('open-external', 'javascript:alert(1)');
    expect(mocks.open).not.toHaveBeenCalled();

    mocks.open.mockClear();
    await invoke('open-external', 'file:///etc/passwd');
    expect(mocks.open).not.toHaveBeenCalled();

    mocks.open.mockClear();
    await invoke('open-external', 'not-a-url');
    expect(mocks.open).not.toHaveBeenCalled();
});

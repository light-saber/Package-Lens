import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import type { Package, ScannerError, ScanResponse, UpdateEvent } from '../types';

interface UpdateLog { lines: string[]; exitCode?: number }
interface AppContextType {
    updatingPackages: Set<string>;
    updateLogs: Record<string, UpdateLog>;
    updateBusy: boolean;
    batchProgress: { completed: number; total: number } | null;
    updatePackage: (pkg: Package) => Promise<void>;
    updateAll: () => Promise<void>;
    packages: Package[];
    scanErrors: ScannerError[];
    scannedAt: string | null;
    stale: boolean;
    managerCounts: Record<'all' | Package['manager'], number>;
    outdatedCount: number;
    statusFilter: 'all' | 'outdated';
    setStatusFilter: (filter: 'all' | 'outdated') => void;
    loading: boolean;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    managerFilter: 'all' | 'brew' | 'pip' | 'npm';
    setManagerFilter: (filter: 'all' | 'brew' | 'pip' | 'npm') => void;
    selectedPackage: Package | null;
    setSelectedPackage: (pkg: Package | null) => void;
    refreshPackages: () => Promise<void>;
    filteredPackages: Package[];
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [packages, setPackages] = useState<Package[]>([]);
    const [scanErrors, setScanErrors] = useState<ScannerError[]>([]);
    const [scannedAt, setScannedAt] = useState<string | null>(null);
    const [stale, setStale] = useState(false);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<'all' | 'outdated'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [managerFilter, setManagerFilter] = useState<'all' | 'brew' | 'pip' | 'npm'>('all');
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

    const [updatingPackages, setUpdatingPackages] = useState<Set<string>>(new Set());
    const [updateLogs, setUpdateLogs] = useState<Record<string, UpdateLog>>({});
    const [updateBusy, setUpdateBusy] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ completed: number; total: number } | null>(null);
    const busy = useRef(false);

    const receiveUpdate = (event: UpdateEvent) => {
        if (event.type === 'summary') return;
        const key = `${event.manager}:${event.name}`;
        setUpdateLogs(logs => {
            const log = logs[key] ?? { lines: [] };
            return { ...logs, [key]: event.type === 'done'
                ? { ...log, exitCode: event.exitCode }
                : { ...log, lines: [...log.lines, event.type === 'output' ? event.line : event.message] } };
        });
        if (event.type === 'done') {
            setUpdatingPackages(keys => { const next = new Set(keys); next.delete(key); return next; });
            setBatchProgress(progress => progress ? { ...progress, completed: progress.completed + 1 } : null);
            const stale = (pkg: Package): Package => `${pkg.manager}:${pkg.name}` === key
                ? { ...pkg, status: 'unknown', latestVersion: undefined } : pkg;
            setPackages(items => items.map(stale));
            setSelectedPackage(pkg => pkg ? stale(pkg) : null);
        }
    };

    useEffect(() => window.electronAPI.onUpdateOutput(receiveUpdate), []);

    const runUpdates = async (targets: Package[], batch: boolean) => {
        if (busy.current || loading || targets.length === 0) return;
        busy.current = true;
        setUpdateBusy(true);
        setUpdatingPackages(new Set(targets.map(pkg => `${pkg.manager}:${pkg.name}`)));
        setUpdateLogs(logs => {
            const next = { ...logs };
            targets.forEach(pkg => { next[`${pkg.manager}:${pkg.name}`] = { lines: [] }; });
            return next;
        });
        setBatchProgress(batch ? { completed: 0, total: targets.length } : null);
        try {
            if (batch) await window.electronAPI.updateAll(targets);
            else await window.electronAPI.updatePackage(targets[0].manager, targets[0].name);
        } catch (error) {
            for (const pkg of targets) {
                receiveUpdate({ type: 'error', manager: pkg.manager, name: pkg.name, message: String(error) });
                receiveUpdate({ type: 'done', manager: pkg.manager, name: pkg.name, exitCode: 1 });
            }
        } finally {
            busy.current = false;
            setUpdateBusy(false);
            setUpdatingPackages(new Set());
            setBatchProgress(null);
        }
    };

    const receiveScan = (data: ScanResponse) => {
        setPackages(data.packages);
        setSelectedPackage(selected => selected
            ? data.packages.find(pkg => pkg.manager === selected.manager && pkg.name === selected.name) ?? null
            : null);
        setScanErrors(data.errors);
        setScannedAt(data.scannedAt);
        setStale(data.stale);
    };

    const refreshPackages = async () => {
        if (busy.current) return;
        setLoading(true);
        try {
            receiveScan(await window.electronAPI.rescanPackages());
        } catch (error) {
            console.error('Failed to fetch packages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let active = true;
        let receivedFresh = false;
        const unsubscribe = window.electronAPI.onScanComplete(data => {
            receivedFresh = true;
            if (active) receiveScan(data);
        });
        void window.electronAPI.getPackages().then(data => {
            // A fast background completion must not be overwritten by stale cache.
            if (active && !(receivedFresh && data.stale)) receiveScan(data);
        }).catch(error => {
            console.error('Failed to fetch packages:', error);
        }).finally(() => { if (active) setLoading(false); });
        return () => { active = false; unsubscribe(); };
    }, []);

    const managerCounts = useMemo(() => ({
        all: packages.length,
        brew: packages.filter(pkg => pkg.manager === 'brew').length,
        pip: packages.filter(pkg => pkg.manager === 'pip').length,
        npm: packages.filter(pkg => pkg.manager === 'npm').length,
    }), [packages]);
    const outdatedCount = useMemo(() => packages.filter(pkg => pkg.status === 'update').length, [packages]);

    const filteredPackages = packages.filter((pkg) => {
        const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesManager = managerFilter === 'all' || pkg.manager === managerFilter;
        return matchesSearch && matchesManager && (statusFilter === 'all' || pkg.status === 'update');
    });

    return (
        <AppContext.Provider
            value={{
                updatingPackages,
                updateLogs,
                updateBusy,
                batchProgress,
                updatePackage: pkg => runUpdates([pkg], false),
                updateAll: () => runUpdates(filteredPackages.filter(pkg => pkg.status === 'update'), true),
                packages,
                scanErrors,
                scannedAt,
                stale,
                managerCounts,
                outdatedCount,
                statusFilter,
                setStatusFilter,
                loading,
                searchQuery,
                setSearchQuery,
                managerFilter,
                setManagerFilter,
                selectedPackage,
                setSelectedPackage,
                refreshPackages,
                filteredPackages,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

// Context and its hook intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

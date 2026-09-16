import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

function formatRelativeTime(scannedAt: string): string {
    const date = new Date(scannedAt);
    if (isNaN(date.getTime())) return '';
    const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
    const rtf = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    if (diffSec < 60) {
        return rtf.format(-diffSec, 'second');
    }
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) {
        return rtf.format(-diffMin, 'minute');
    }
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) {
        return rtf.format(-diffHours, 'hour');
    }
    const diffDays = Math.floor(diffHours / 24);
    return rtf.format(-diffDays, 'day');
}

export const FilterBar: React.FC = () => {
    const {
        packages,
        searchQuery,
        setSearchQuery,
        loading,
        refreshPackages,
        outdatedCount,
        statusFilter,
        setStatusFilter,
        scanErrors,
        filteredPackages,
        updateAll,
        updateBusy,
        batchProgress,
        searchInputRef,
        scannedAt,
        stale,
    } = useApp();

    const [, setTick] = useState(0);
    useEffect(() => {
        if (!scannedAt) return;
        const interval = setInterval(() => setTick(t => t + 1), 10000);
        return () => clearInterval(interval);
    }, [scannedAt]);

    const updateCount = filteredPackages.filter(pkg => pkg.status === 'update').length;
    const showLastScanned = Boolean(scannedAt && !(loading && packages.length === 0));

    return (
        <>
        <div className="filter-bar">
            <div className="search-container">
                <Search className="search-icon" size={18} />
                <input
                    ref={searchInputRef}
                    type="text"
                    aria-label="Search packages"
                    placeholder="Search packages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                />
            </div>
            <button
                onClick={refreshPackages}
                disabled={loading || updateBusy}
                className="refresh-btn"
            >
                {loading ? 'Scanning...' : 'Refresh'}
            </button>
        </div>
        <div className="update-strip">
            <div className="update-strip-row">
                <span className="update-strip-count" role="status">
                    {outdatedCount > 0 ? `${outdatedCount} updates available` : 'All packages up to date'}
                </span>
                <button className="status-toggle" aria-pressed={statusFilter === 'outdated'}
                    onClick={() => setStatusFilter(statusFilter === 'all' ? 'outdated' : 'all')}>
                    {statusFilter === 'all' ? 'Show outdated only' : 'Show all'}
                </button>
                {(outdatedCount > 0 || batchProgress) && <button className="update-btn"
                    disabled={loading || updateBusy || updateCount === 0} onClick={updateAll}>
                    Update all ({batchProgress?.total ?? updateCount})
                </button>}
                {batchProgress && <span className="update-progress" role="status">
                    Updating {Math.min(batchProgress.completed + 1, batchProgress.total)} of {batchProgress.total}...
                </span>}
                {showLastScanned && scannedAt && (
                    <span className="last-scanned last-scanned-badge" title={scannedAt}>
                        Last scanned {formatRelativeTime(scannedAt)}
                        {stale && (
                            <span className="rescanning-indicator">
                                {' '}rescanning...
                                <span className="spinner-dot" aria-hidden="true" />
                            </span>
                        )}
                    </span>
                )}
            </div>
            {scanErrors.length > 0 && <div className="scan-errors" role="status">
                {scanErrors.map((error, index) => <div key={`${error.manager}-${index}`}>{error.manager}: {error.message}</div>)}
            </div>}
        </div>
        </>
    );
};

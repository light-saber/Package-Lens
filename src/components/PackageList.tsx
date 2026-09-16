import React, { useEffect } from 'react';
import { useApp, type SortKey } from '../context/AppContext';
import { AlertCircle, CheckCircle2, HelpCircle, ArrowUp, ArrowDown, ArrowUpDown, ExternalLink } from 'lucide-react';
import type { Package } from '../types';

const INSTALL_URLS: Record<Package['manager'], string> = {
    brew: 'https://brew.sh',
    pip: 'https://pip.pypa.io/en/stable/installation/',
    npm: 'https://docs.npmjs.com/downloading-and-installing-node-js-and-npm',
};

export const PackageList: React.FC = () => {
    const {
        packages,
        filteredPackages,
        loading,
        selectedPackage,
        setSelectedPackage,
        sort,
        toggleSort,
        scanErrors,
        managerFilter,
        refreshPackages,
        clearFilters,
    } = useApp();

    useEffect(() => {
        if (!selectedPackage) return;
        const key = `${selectedPackage.manager}:${selectedPackage.name}`;
        document.querySelector(`[data-pkg-key="${CSS.escape(key)}"]`)?.scrollIntoView({ block: 'nearest' });
    }, [selectedPackage]);

    if (loading && filteredPackages.length === 0) {
        return (
            <div className="state-container">
                <div className="spinner"></div>
                Scanning system...
            </div>
        );
    }

    if (filteredPackages.length === 0) {
        const visibleErrors = managerFilter === 'all'
            ? (packages.length === 0 ? scanErrors : [])
            : scanErrors.filter(e => e.manager === managerFilter);

        if (visibleErrors.length > 0) {
            return (
                <div className="state-container empty-errors">
                    {visibleErrors.map((error, index) => (
                        <div key={`${error.manager}-${index}`} className="error-card">
                            <div className="error-card-header">
                                <AlertCircle size={18} className="error-card-icon" />
                                <span className="error-card-manager">{error.manager}</span>
                            </div>
                            <p className="error-card-message">{error.message}</p>
                            <button
                                type="button"
                                className="error-card-link"
                                onClick={() => window.electronAPI.openExternal(INSTALL_URLS[error.manager])}
                            >
                                <span>How to install {error.manager}</span>
                                <ExternalLink size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            );
        }

        if (packages.length === 0 && !loading) {
            return (
                <div className="state-container empty-state">
                    <p className="empty-title">No packages found by any manager</p>
                    <p className="empty-subtitle">Installing a package manager and scanning again is expected here.</p>
                    <button type="button" className="empty-action-btn" onClick={refreshPackages}>
                        Refresh
                    </button>
                </div>
            );
        }

        return (
            <div className="state-container empty-state">
                <p className="empty-title">No packages match your search or filters</p>
                <button type="button" className="empty-action-btn" onClick={clearFilters}>
                    Clear filters
                </button>
            </div>
        );
    }

    const renderSortIcon = (key: SortKey) => {
        if (sort.key === key) {
            return sort.direction === 'asc'
                ? <ArrowUp size={14} className="sort-icon active" />
                : <ArrowDown size={14} className="sort-icon active" />;
        }
        return <ArrowUpDown size={14} className="sort-icon" />;
    };

    const getAriaSort = (key: SortKey): 'ascending' | 'descending' | 'none' => {
        if (sort.key !== key) return 'none';
        return sort.direction === 'asc' ? 'ascending' : 'descending';
    };

    return (
        <div className="package-list-container">
            <table className="package-table">
                <thead>
                    <tr>
                        <th
                            className="sortable-th"
                            aria-sort={getAriaSort('name')}
                            onClick={() => toggleSort('name')}
                        >
                            <div className="th-content">
                                <span>Name</span>
                                {renderSortIcon('name')}
                            </div>
                        </th>
                        <th
                            className="sortable-th"
                            aria-sort={getAriaSort('version')}
                            onClick={() => toggleSort('version')}
                        >
                            <div className="th-content">
                                <span>Version</span>
                                {renderSortIcon('version')}
                            </div>
                        </th>
                        <th
                            className="sortable-th"
                            aria-sort={getAriaSort('manager')}
                            onClick={() => toggleSort('manager')}
                        >
                            <div className="th-content">
                                <span>Manager</span>
                                {renderSortIcon('manager')}
                            </div>
                        </th>
                        <th
                            className="sortable-th"
                            aria-sort={getAriaSort('status')}
                            onClick={() => toggleSort('status')}
                        >
                            <div className="th-content">
                                <span>Status</span>
                                {renderSortIcon('status')}
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {filteredPackages.map((pkg, index) => (
                        <tr
                            key={`${pkg.manager}-${pkg.name}-${index}`}
                            data-pkg-key={`${pkg.manager}:${pkg.name}`}
                            onClick={() => setSelectedPackage(pkg)}
                            className={`package-row ${selectedPackage?.name === pkg.name && selectedPackage?.manager === pkg.manager ? 'selected' : ''}`}
                        >
                            <td className="pkg-name">{pkg.name}</td>
                            <td className="pkg-version">{pkg.version}</td>
                            <td>
                                <span className={`pkg-tag tag-${pkg.manager}`}>
                                    {pkg.manager}
                                </span>
                            </td>
                            <td>
                                {pkg.status === 'update' ? (
                                    <div className="status-update">
                                        <AlertCircle size={14} />
                                        <span>Update: {pkg.latestVersion}</span>
                                    </div>
                                ) : pkg.status === 'unknown' ? (
                                    <div className="status-unknown">
                                        <HelpCircle size={14} />
                                        <span>Not checked</span>
                                    </div>
                                ) : (
                                    <div className="status-ok">
                                        <CheckCircle2 size={14} />
                                        <span>Up to date</span>
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

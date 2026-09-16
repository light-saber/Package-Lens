import React from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const FilterBar: React.FC = () => {
    const { searchQuery, setSearchQuery, loading, refreshPackages, outdatedCount, statusFilter, setStatusFilter, scanErrors } = useApp();

    return (
        <>
        <div className="filter-bar">
            <div className="search-container">
                <Search className="search-icon" size={18} />
                <input
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
                disabled={loading}
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
            </div>
            {scanErrors.length > 0 && <div className="scan-errors" role="status">
                {scanErrors.map((error, index) => <div key={`${error.manager}-${index}`}>{error.manager}: {error.message}</div>)}
            </div>}
        </div>
        </>
    );
};

import React from 'react';
import { Search } from 'lucide-react';
import { useApp } from '../context/AppContext';

export const FilterBar: React.FC = () => {
    const { searchQuery, setSearchQuery, loading, refreshPackages } = useApp();

    return (
        <div className="filter-bar">
            <div className="search-container">
                <Search className="search-icon" size={18} />
                <input
                    type="text"
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
    );
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Package } from '../types';

interface AppContextType {
    packages: Package[];
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
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [managerFilter, setManagerFilter] = useState<'all' | 'brew' | 'pip' | 'npm'>('all');
    const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

    const refreshPackages = async () => {
        setLoading(true);
        try {
            const data = await window.electronAPI.getPackages();
            setPackages(data);
        } catch (error) {
            console.error('Failed to fetch packages:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshPackages();
    }, []);

    const filteredPackages = packages.filter((pkg) => {
        const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesManager = managerFilter === 'all' || pkg.manager === managerFilter;
        return matchesSearch && matchesManager;
    });

    return (
        <AppContext.Provider
            value={{
                packages,
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

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useApp must be used within an AppProvider');
    }
    return context;
};

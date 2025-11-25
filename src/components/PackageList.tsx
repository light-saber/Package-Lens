import React from 'react';
import { useApp } from '../context/AppContext';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const PackageList: React.FC = () => {
    const { filteredPackages, loading, selectedPackage, setSelectedPackage } = useApp();

    if (loading && filteredPackages.length === 0) {
        return (
            <div className="state-container">
                <div className="spinner"></div>
                Scanning system...
            </div>
        );
    }

    if (filteredPackages.length === 0) {
        return (
            <div className="state-container">
                No packages found.
            </div>
        );
    }

    return (
        <div className="package-list-container">
            <table className="package-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Version</th>
                        <th>Manager</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredPackages.map((pkg, index) => (
                        <tr
                            key={`${pkg.manager}-${pkg.name}-${index}`}
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
                                {pkg.latestVersion && pkg.latestVersion !== pkg.version ? (
                                    <div className="status-update">
                                        <AlertCircle size={14} />
                                        <span>Update: {pkg.latestVersion}</span>
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

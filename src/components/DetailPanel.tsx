import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Copy, Terminal, X, Folder, ExternalLink } from 'lucide-react';

function getHostname(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

export const DetailPanel: React.FC = () => {
    const { selectedPackage, setSelectedPackage, updatingPackages, updateLogs, updateBusy, loading, updatePackage } = useApp();
    const [uninstallCmd, setUninstallCmd] = useState('');
    const [updateCmd, setUpdateCmd] = useState('');
    const [copiedUninstall, setCopiedUninstall] = useState(false);
    const [copiedUpdate, setCopiedUpdate] = useState(false);

    useEffect(() => {
        if (selectedPackage) {
            Promise.all([
                window.electronAPI.getUninstallCommand(selectedPackage),
                window.electronAPI.getUpdateCommand(selectedPackage),
            ]).then(([uninstall, update]) => {
                setUninstallCmd(uninstall);
                setUpdateCmd(update);
            });
        }
    }, [selectedPackage]);

    const handleCopyUninstall = () => {
        navigator.clipboard.writeText(uninstallCmd);
        setCopiedUninstall(true);
        setTimeout(() => setCopiedUninstall(false), 2000);
    };

    const handleCopyUpdate = () => {
        navigator.clipboard.writeText(updateCmd);
        setCopiedUpdate(true);
        setTimeout(() => setCopiedUpdate(false), 2000);
    };

    if (!selectedPackage) return null;

    const key = `${selectedPackage.manager}:${selectedPackage.name}`;
    const log = updateLogs[key];
    const updating = updatingPackages.has(key);

    return (
        <div className="detail-panel">
            <div className="detail-header">
                <h2 className="detail-title" title={selectedPackage.name}>{selectedPackage.name}</h2>
                <button onClick={() => setSelectedPackage(null)} className="close-btn" aria-label="Close package details">
                    <X size={20} />
                </button>
            </div>

            <div className="detail-content">
                {/* Description */}
                {selectedPackage.description && (
                    <div className="detail-section">
                        <h3>Description</h3>
                        <p className="detail-text">{selectedPackage.description}</p>
                    </div>
                )}

                {/* Homepage */}
                {selectedPackage.homepage && (
                    <div className="detail-section">
                        <h3>Homepage</h3>
                        <button
                            type="button"
                            className="homepage-link-btn"
                            title={selectedPackage.homepage}
                            onClick={() => window.electronAPI.openExternal(selectedPackage.homepage)}
                        >
                            <span>{getHostname(selectedPackage.homepage)}</span>
                            <ExternalLink size={14} />
                        </button>
                    </div>
                )}

                {/* Version Info */}
                <div className="detail-section">
                    <h3>Version</h3>
                    <div className="version-row">
                        <span className="code-block">{selectedPackage.version}</span>
                        {selectedPackage.latestVersion && selectedPackage.latestVersion !== selectedPackage.version && (
                            <span className="status-update">→ {selectedPackage.latestVersion} available</span>
                        )}
                    </div>
                    {selectedPackage.installedAt && (
                        <div className="installed-date">
                            Installed {new Date(selectedPackage.installedAt).toLocaleDateString()}
                        </div>
                    )}
                </div>

                {selectedPackage.status === 'update' && <button className="update-btn"
                    disabled={updateBusy || loading} onClick={() => updatePackage(selectedPackage)}>
                    {updating ? 'Updating...' : 'Update now'}
                </button>}

                {/* Location */}
                <div className="detail-section">
                    <h3>
                        <Folder size={14} /> Installation Path
                    </h3>
                    <div className="code-block">
                        {selectedPackage.installPath || 'Unknown location'}
                    </div>
                </div>

                {/* Update Command */}
                <div className="detail-section">
                    <h3>
                        <Terminal size={14} /> Update Command
                    </h3>
                    <div className="cmd-block">
                        {updateCmd || 'Loading...'}
                        <button
                            type="button"
                            onClick={handleCopyUpdate}
                            className="copy-btn"
                            title="Copy to clipboard"
                        >
                            {copiedUpdate ? <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span> : <Copy size={14} />}
                        </button>
                    </div>
                </div>

                {/* Uninstall */}
                <div className="detail-section">
                    <h3>
                        <Terminal size={14} /> Uninstall Command
                    </h3>
                    <div className="cmd-block">
                        {uninstallCmd || 'Loading...'}
                        <button
                            type="button"
                            onClick={handleCopyUninstall}
                            className="copy-btn"
                            title="Copy to clipboard"
                        >
                            {copiedUninstall ? <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span> : <Copy size={14} />}
                        </button>
                    </div>
                </div>
                {log && <div className="detail-section">
                    <details open>
                        <summary>Update output</summary>
                        <pre className="update-log" aria-label="Update output">{log.lines.join('\n') || 'Waiting for output...'}</pre>
                    </details>
                    {log.exitCode !== undefined && <p role="status"
                        className={log.exitCode === 0 ? 'update-success' : 'update-failure'}>
                        {log.exitCode === 0 ? 'Succeeded' : 'Failed'} (exit code {log.exitCode}). Refresh to check installed versions.
                    </p>}
                </div>}
            </div>
        </div>
    );
};

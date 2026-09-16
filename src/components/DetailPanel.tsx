import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Copy, Terminal, X, Folder } from 'lucide-react';

export const DetailPanel: React.FC = () => {
    const { selectedPackage, setSelectedPackage, updatingPackages, updateLogs, updateBusy, loading, updatePackage } = useApp();
    const [uninstallCmd, setUninstallCmd] = useState('');
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        if (selectedPackage) {
            window.electronAPI.getUninstallCommand(selectedPackage).then(setUninstallCmd);
        }
    }, [selectedPackage]);

    const handleCopy = () => {
        navigator.clipboard.writeText(uninstallCmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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

                {/* Version Info */}
                <div className="detail-section">
                    <h3>Version</h3>
                    <div className="version-row">
                        <span className="code-block">{selectedPackage.version}</span>
                        {selectedPackage.latestVersion && selectedPackage.latestVersion !== selectedPackage.version && (
                            <span className="status-update">→ {selectedPackage.latestVersion} available</span>
                        )}
                    </div>
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

                {/* Uninstall */}
                <div className="detail-section">
                    <h3>
                        <Terminal size={14} /> Uninstall Command
                    </h3>
                    <div className="cmd-block">
                        {uninstallCmd || 'Loading...'}
                        <button
                            onClick={handleCopy}
                            className="copy-btn"
                            title="Copy to clipboard"
                        >
                            {copied ? <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>✓</span> : <Copy size={14} />}
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

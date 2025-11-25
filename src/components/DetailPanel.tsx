import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Copy, Terminal, X, Folder } from 'lucide-react';

export const DetailPanel: React.FC = () => {
    const { selectedPackage, setSelectedPackage } = useApp();
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

    return (
        <div className="detail-panel">
            <div className="detail-header">
                <h2 className="detail-title" title={selectedPackage.name}>{selectedPackage.name}</h2>
                <button onClick={() => setSelectedPackage(null)} className="close-btn">
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
            </div>
        </div>
    );
};

import React from 'react';
import { Package, Layers, Terminal, type LucideIcon } from 'lucide-react';
import { useApp } from '../context/AppContext';

const NavItem = ({ label, icon: Icon, value }: { label: string; icon: LucideIcon; value: 'all' | 'brew' | 'pip' | 'npm' }) => {
    const { managerFilter, setManagerFilter } = useApp();
    return (
        <button onClick={() => setManagerFilter(value)} className={`nav-item ${managerFilter === value ? 'active' : ''}`}>
            <Icon size={18} />
            <span>{label}</span>
        </button>
    );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className="app-sidebar">
                <div className="sidebar-header">
                    <div className="logo-box">
                        <Package className="text-white" size={24} color="#1a1b26" />
                    </div>
                    <h1 className="app-title">PackageLens</h1>
                </div>

                <nav className="sidebar-nav">
                    <NavItem label="All Packages" icon={Layers} value="all" />
                    <div className="nav-section-title">Managers</div>
                    <NavItem label="Homebrew" icon={Terminal} value="brew" />
                    <NavItem label="Pip (Python)" icon={Terminal} value="pip" />
                    <NavItem label="Npm (Node)" icon={Terminal} value="npm" />
                </nav>

                <div className="sidebar-footer">
                    v1.0.0
                </div>
            </aside>

            {/* Main Content */}
            <main className="app-main">
                {children}
            </main>
        </div>
    );
};

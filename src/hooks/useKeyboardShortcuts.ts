import { useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';

export function useKeyboardShortcuts(): void {
    const app = useApp();
    const appRef = useRef(app);
    useEffect(() => {
        appRef.current = app;
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.defaultPrevented || e.isComposing) {
                return;
            }

            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                 target.tagName === 'TEXTAREA' ||
                 target.tagName === 'SELECT' ||
                 Boolean(target.isContentEditable))
            ) {
                return;
            }

            const isCmdOrCtrl = e.metaKey || e.ctrlKey;
            const hasExtraModifiers = e.altKey || e.shiftKey;

            // Cmd/Ctrl+F (metaKey OR ctrlKey, no shift/alt): focus search
            if ((e.key === 'f' || e.key === 'F') && isCmdOrCtrl && !hasExtraModifiers) {
                e.preventDefault();
                appRef.current.focusSearch();
                return;
            }

            // Cmd/Ctrl+R (metaKey OR ctrlKey, no shift/alt): refresh packages with preventDefault
            if ((e.key === 'r' || e.key === 'R') && isCmdOrCtrl && !hasExtraModifiers) {
                e.preventDefault();
                void appRef.current.refreshPackages();
                return;
            }

            // ArrowDown / ArrowUp (no modifiers): navigate filteredPackages with wrap-around
            if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !isCmdOrCtrl && !hasExtraModifiers) {
                const { filteredPackages, selectedPackage, setSelectedPackage } = appRef.current;
                if (filteredPackages.length === 0) {
                    return;
                }

                e.preventDefault();
                const currentIndex = selectedPackage
                    ? filteredPackages.findIndex(pkg => `${pkg.manager}:${pkg.name}` === `${selectedPackage.manager}:${selectedPackage.name}`)
                    : -1;

                let nextIndex: number;
                if (e.key === 'ArrowDown') {
                    if (currentIndex === -1 || currentIndex >= filteredPackages.length - 1) {
                        nextIndex = 0;
                    } else {
                        nextIndex = currentIndex + 1;
                    }
                } else {
                    if (currentIndex <= 0) {
                        nextIndex = filteredPackages.length - 1;
                    } else {
                        nextIndex = currentIndex - 1;
                    }
                }

                setSelectedPackage(filteredPackages[nextIndex]);
                return;
            }

            // Escape (no modifiers): close detail panel if selectedPackage is set
            if (e.key === 'Escape' && !isCmdOrCtrl && !hasExtraModifiers) {
                const { selectedPackage, setSelectedPackage } = appRef.current;
                if (selectedPackage) {
                    e.preventDefault();
                    setSelectedPackage(null);
                }
                return;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);
}

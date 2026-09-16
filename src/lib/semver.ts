export function isParseableSemver(input: string): boolean {
    if (typeof input !== 'string') return false;
    const clean = input.trim().replace(/^[vV]/, '');
    if (!clean) return false;
    return /^\d/.test(clean);
}

export function compareSemver(a: string, b: string): number {
    const isParseableA = isParseableSemver(a);
    const isParseableB = isParseableSemver(b);

    if (!isParseableA && !isParseableB) {
        if (a === b) return 0;
        return a.localeCompare(b);
    }
    if (!isParseableA) return 1;
    if (!isParseableB) return -1;

    const cleanA = a.trim().replace(/^[vV]/, '');
    const cleanB = b.trim().replace(/^[vV]/, '');

    // Split off build metadata (+...) and ignore it
    const [noBuildA] = cleanA.split('+');
    const [noBuildB] = cleanB.split('+');

    // Split off prerelease (-...)
    const dashIdxA = noBuildA.indexOf('-');
    const dashIdxB = noBuildB.indexOf('-');

    const coreStrA = dashIdxA >= 0 ? noBuildA.slice(0, dashIdxA) : noBuildA;
    const coreStrB = dashIdxB >= 0 ? noBuildB.slice(0, dashIdxB) : noBuildB;

    const prereleaseA = dashIdxA >= 0 ? noBuildA.slice(dashIdxA + 1) : undefined;
    const prereleaseB = dashIdxB >= 0 ? noBuildB.slice(dashIdxB + 1) : undefined;

    // Core: split on '.', compare left to right numerically; missing segments act as 0
    const coreA = coreStrA.split('.');
    const coreB = coreStrB.split('.');
    const maxLen = Math.max(coreA.length, coreB.length);

    for (let i = 0; i < maxLen; i++) {
        const segA = i < coreA.length ? coreA[i] : '0';
        const segB = i < coreB.length ? coreB[i] : '0';
        const isNumA = /^\d+$/.test(segA);
        const isNumB = /^\d+$/.test(segB);

        if (isNumA && isNumB) {
            const numA = parseInt(segA, 10);
            const numB = parseInt(segB, 10);
            if (numA !== numB) {
                return numA < numB ? -1 : 1;
            }
        } else {
            // If a segment is not numeric at a position where the other is numeric, compare as strings
            const cmp = segA.localeCompare(segB);
            if (cmp !== 0) {
                return cmp < 0 ? -1 : 1;
            }
        }
    }

    // Cores are equal; compare prerelease
    // No-prerelease beats any prerelease
    if (prereleaseA === undefined && prereleaseB === undefined) {
        return 0;
    }
    if (prereleaseA === undefined && prereleaseB !== undefined) {
        return 1;
    }
    if (prereleaseA !== undefined && prereleaseB === undefined) {
        return -1;
    }

    // Both have prereleases: dot-separated identifiers
    const partsA = prereleaseA!.split('.');
    const partsB = prereleaseB!.split('.');
    const minParts = Math.min(partsA.length, partsB.length);

    for (let i = 0; i < minParts; i++) {
        const idA = partsA[i];
        const idB = partsB[i];
        const isNumA = /^\d+$/.test(idA);
        const isNumB = /^\d+$/.test(idB);

        if (isNumA && isNumB) {
            const numA = parseInt(idA, 10);
            const numB = parseInt(idB, 10);
            if (numA !== numB) {
                return numA < numB ? -1 : 1;
            }
        } else if (isNumA && !isNumB) {
            // Numeric prerelease identifiers rank below non-numeric ones
            return -1;
        } else if (!isNumA && isNumB) {
            return 1;
        } else {
            if (idA !== idB) {
                return idA < idB ? -1 : 1;
            }
        }
    }

    // Identical prefixes: shorter list ranks lower
    if (partsA.length !== partsB.length) {
        return partsA.length < partsB.length ? -1 : 1;
    }

    return 0;
}

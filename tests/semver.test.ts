import { describe, expect, it } from 'vitest';
import { compareSemver } from '../src/lib/semver';

describe('compareSemver', () => {
    it('compares versions per semver rules', () => {
        expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
        expect(compareSemver('0.10.0', '0.9.9')).toBeGreaterThan(0);
        expect(compareSemver('5.8', '5.9')).toBeLessThan(0);
        expect(compareSemver('v2.0.5', '2.0.5')).toBe(0);
        expect(compareSemver('V2.0.5', 'v2.0.5')).toBe(0);
        expect(compareSemver('1.0.0-beta', '1.0.0')).toBeLessThan(0);
        expect(compareSemver('1.0.0', '1.0.1')).toBeLessThan(0);
        expect(compareSemver('2.0.0', '1.9.9')).toBeGreaterThan(0);
    });

    it('sorts empty or unknown values last', () => {
        expect(compareSemver('1.0.0', '')).toBeLessThan(0);
        expect(compareSemver('', '1.0.0')).toBeGreaterThan(0);
        expect(compareSemver('1.0.0', 'unknown')).toBeLessThan(0);
        expect(compareSemver('unknown', '1.0.0')).toBeGreaterThan(0);
        expect(compareSemver('', '')).toBe(0);
        expect(compareSemver('unknown', 'unknown')).toBe(0);
        expect(compareSemver('unknown', '')).toBeGreaterThan(0);
        expect(compareSemver('', 'unknown')).toBeLessThan(0);
    });

    it('handles prereleases and build metadata', () => {
        expect(compareSemver('1.0.0-alpha', '1.0.0-alpha.1')).toBeLessThan(0);
        expect(compareSemver('1.0.0-alpha.1', '1.0.0-alpha.beta')).toBeLessThan(0);
        expect(compareSemver('1.0.0-beta.2', '1.0.0-beta.11')).toBeLessThan(0);
        expect(compareSemver('1.0.0+20130313144700', '1.0.0+exp.sha.5114f85')).toBe(0);
    });

    it('handles missing segments as 0', () => {
        expect(compareSemver('1.0', '1.0.0')).toBe(0);
        expect(compareSemver('1', '1.0.0')).toBe(0);
        expect(compareSemver('1.1', '1.0.9')).toBeGreaterThan(0);
    });
});

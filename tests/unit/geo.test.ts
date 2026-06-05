import { haversineKm } from '../../src/utils/geo';

describe('haversineKm', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineKm(4.05, 9.7, 4.05, 9.7)).toBeCloseTo(0, 3);
  });

  it('calculates correct distance between Douala and Yaoundé (~200km)', () => {
    const dist = haversineKm(4.0511, 9.7679, 3.848, 11.5021);
    expect(dist).toBeGreaterThan(190);
    expect(dist).toBeLessThan(220);
  });

  it('is symmetric', () => {
    const d1 = haversineKm(4.05, 9.7, 3.84, 11.5);
    const d2 = haversineKm(3.84, 11.5, 4.05, 9.7);
    expect(d1).toBeCloseTo(d2, 5);
  });

  it('returns positive values for different coordinates', () => {
    expect(haversineKm(0, 0, 1, 1)).toBeGreaterThan(0);
  });
});

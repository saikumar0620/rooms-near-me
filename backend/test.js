const test = require('node:test');
const assert = require('node:assert');
const { haversine, parseRent, isValidIndiaCoords } = require('./server');

// 1. S2 Distance Benchmark Tests
test('Distance Pair 1: Quarter circumference (Pole to Equator along prime meridian)', () => {
  // Source: Analytical spherical geometry: (pi / 2) * 6371 = 10007.5434 km
  const dist = haversine(0, 0, 90, 0);
  assert.ok(Math.abs(dist - 10007.5434) < 0.01, `Expected ~10007.5434 km, got ${dist}`);
});

test('Distance Pair 2: One degree along the Equator', () => {
  // Source: Analytical spherical geometry: 2 * pi * 6371 / 360 = 111.1949 km
  const dist = haversine(0, 0, 0, 1);
  assert.ok(Math.abs(dist - 111.1949) < 0.01, `Expected ~111.1949 km, got ${dist}`);
});

test('Distance Pair 3: London to Paris benchmark', () => {
  // Source: Published Ed Williams Great Circle formula for R=6371 km
  const dist = haversine(51.5074, -0.1278, 48.8566, 2.3522);
  assert.ok(Math.abs(dist - 343.556) < 0.05, `Expected ~343.56 km, got ${dist}`);
});

test('Distance Pair 4: Hyderabad Charminar to Golconda Fort', () => {
  // Source: Standard coordinates calculated using R=6371 km
  const dist = haversine(17.3616, 78.4747, 17.3833, 78.4011);
  assert.ok(Math.abs(dist - 8.175) < 0.05, `Expected ~8.17 km, got ${dist}`);
});

// 2. S2 Rent Parsing Tests
test('Rent conversion covers every style from data README', () => {
  const cases = [
    { in: '12000', exp: 12000 },
    { in: '12,000', exp: 12000 },
    { in: 'Rs 12,000', exp: 12000 },
    { in: 'Rs. 12000', exp: 12000 },
    { in: '12k', exp: 12000 },
    { in: '12.5k', exp: 12500 },
    { in: '12000/month', exp: 12000 },
  ];
  cases.forEach(({ in: str, exp }) => {
    assert.strictEqual(parseRent(str), exp, `Failed for input: ${str}`);
  });
});

// 3. N3 Coordinate Boundary Validation
test('N3 India coordinate validation rejects unusable and swapped points', () => {
  assert.strictEqual(isValidIndiaCoords(17.44, 78.34), true); // Hyderabad
  assert.strictEqual(isValidIndiaCoords(78.35, 17.41), false); // Swapped coordinates
  assert.strictEqual(isValidIndiaCoords(0, 0), false); // Null island
  assert.strictEqual(isValidIndiaCoords('', ''), false); // Blank
});
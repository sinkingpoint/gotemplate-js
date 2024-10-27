import { normaliseHexExponent } from "./node"

test('0x1p-2', () => {
    expect(Number(normaliseHexExponent('0x1p-2'))).toEqual(0.25);
});

test('0x2.p10', () => {
    expect(Number(normaliseHexExponent('0x2.p10'))).toEqual(2048.0);
});

test('0x1.Fp+0', () => {
    expect(Number(normaliseHexExponent('0x1.Fp+0'))).toEqual(1.9375);
});

test('0X.8p-0', () => {
    expect(Number(normaliseHexExponent('0X.8p-0'))).toEqual(0.5);
});

test('0X_1FFFP-16', () => {
    expect(Number(normaliseHexExponent('0X_1FFFP-16'))).toEqual(0.1249847412109375);
});

test('0x.p1', () => {
    expect(() => normaliseHexExponent('0x.p1')).toThrow();
})

test('1p-2', () => {
    expect(normaliseHexExponent('1p-2')).toBeNull();
})

test('0x1.5e-2', () => {
    expect(() => normaliseHexExponent('0x1.5e-2')).toThrow();
})

test('0X_1P4', () => {
    expect(Number(normaliseHexExponent('0X_1P4'))).toEqual(16);
})
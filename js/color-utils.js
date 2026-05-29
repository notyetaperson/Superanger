// Color space conversion and distance calculations
import {
    RGB_TO_XYZ,
    INV_255,
    GAMMA_THRESHOLD,
    GAMMA_MULT,
    GAMMA_POW,
    LAB_THRESHOLD,
    LAB_MULT,
    LAB_ADD
} from './config.js';

// Fast RGB to Lab conversion
export function rgbToLabFast(r, g, b) {
    r *= INV_255;
    g *= INV_255;
    b *= INV_255;
    
    r = r > GAMMA_THRESHOLD ? Math.pow((r + 0.055) / GAMMA_MULT, GAMMA_POW) : r * 0.0773993808;
    g = g > GAMMA_THRESHOLD ? Math.pow((g + 0.055) / GAMMA_MULT, GAMMA_POW) : g * 0.0773993808;
    b = b > GAMMA_THRESHOLD ? Math.pow((b + 0.055) / GAMMA_MULT, GAMMA_POW) : b * 0.0773993808;
    
    const x = (r * RGB_TO_XYZ[0] + g * RGB_TO_XYZ[1] + b * RGB_TO_XYZ[2]) * 1.052156522;
    const y = (r * RGB_TO_XYZ[3] + g * RGB_TO_XYZ[4] + b * RGB_TO_XYZ[5]);
    const z = (r * RGB_TO_XYZ[6] + g * RGB_TO_XYZ[7] + b * RGB_TO_XYZ[8]) * 0.918357670;
    
    const fx = x > LAB_THRESHOLD ? Math.pow(x, 0.333333333) : (LAB_MULT * x + LAB_ADD);
    const fy = y > LAB_THRESHOLD ? Math.pow(y, 0.333333333) : (LAB_MULT * y + LAB_ADD);
    const fz = z > LAB_THRESHOLD ? Math.pow(z, 0.333333333) : (LAB_MULT * z + LAB_ADD);
    
    return [
        (116 * fy) - 16,
        500 * (fx - fy),
        200 * (fy - fz)
    ];
}

// Fast color distance (squared to avoid sqrt)
export function colorDistanceSq(r1, g1, b1, r2, g2, b2, colorSpace, labCache) {
    if (colorSpace === 'lab') {
        let lab1, lab2;
        const key1 = (r1 << 16) | (g1 << 8) | b1;
        const key2 = (r2 << 16) | (g2 << 8) | b2;
        
        if (!labCache.has(key1)) {
            labCache.set(key1, rgbToLabFast(r1, g1, b1));
        }
        if (!labCache.has(key2)) {
            labCache.set(key2, rgbToLabFast(r2, g2, b2));
        }
        
        lab1 = labCache.get(key1);
        lab2 = labCache.get(key2);
        
        const dL = lab1[0] - lab2[0];
        const da = lab1[1] - lab2[1];
        const db = lab1[2] - lab2[2];
        return dL * dL + da * da + db * db;
    } else {
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        return dr * dr + dg * dg + db * db;
    }
}

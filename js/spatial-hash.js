// Spatial hash creation and lookup
import { colorDistanceSq } from './color-utils.js';

// Create optimized spatial hash
export function createSpatialHash(sourceData, bucketSize = 16) {
    const hash = new Map();
    const data = sourceData.data;
    const len = data.length;
    
    for (let i = 0; i < len; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        
        const key = ((r / bucketSize) | 0) << 16 | ((g / bucketSize) | 0) << 8 | ((b / bucketSize) | 0);
        
        let bucket = hash.get(key);
        if (!bucket) {
            bucket = [];
            hash.set(key, bucket);
        }
        bucket.push(i);
    }
    
    return { hash, bucketSize, data };
}

// Find closest pixel using spatial hash
export function findClosestSpatial(targetR, targetG, targetB, spatialData, usedPixels, colorSpace, labCache) {
    const { hash, bucketSize, data } = spatialData;
    
    let bestIndex = -1;
    let bestDistSq = Infinity;
    
    const baseR = (targetR / bucketSize) | 0;
    const baseG = (targetG / bucketSize) | 0;
    const baseB = (targetB / bucketSize) | 0;
    const baseKey = baseR << 16 | baseG << 8 | baseB;
    
    // Check center bucket first
    let bucket = hash.get(baseKey);
    if (bucket) {
        const bucketLen = bucket.length;
        for (let i = 0; i < bucketLen; i++) {
            const idx = bucket[i];
            if (usedPixels.has(idx)) continue;
            
            const distSq = colorDistanceSq(
                targetR, targetG, targetB,
                data[idx], data[idx + 1], data[idx + 2],
                colorSpace, labCache
            );
            
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                bestIndex = idx;
                if (distSq === 0) return bestIndex;
            }
        }
    }
    
    // Check neighboring buckets if needed
    if (bestDistSq > 100) {
        for (let dr = -1; dr <= 1; dr++) {
            for (let dg = -1; dg <= 1; dg++) {
                for (let db = -1; db <= 1; db++) {
                    if (dr === 0 && dg === 0 && db === 0) continue;
                    
                    const key = baseKey + (dr << 16) + (dg << 8) + db;
                    bucket = hash.get(key);
                    
                    if (bucket) {
                        const bucketLen = bucket.length;
                        for (let i = 0; i < bucketLen; i++) {
                            const idx = bucket[i];
                            if (usedPixels.has(idx)) continue;
                            
                            const distSq = colorDistanceSq(
                                targetR, targetG, targetB,
                                data[idx], data[idx + 1], data[idx + 2],
                                colorSpace, labCache
                            );
                            
                            if (distSq < bestDistSq) {
                                bestDistSq = distSq;
                                bestIndex = idx;
                                if (distSq === 0) return bestIndex;
                            }
                        }
                    }
                }
            }
        }
    }
    
    return bestIndex;
}

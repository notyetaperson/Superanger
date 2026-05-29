// Main pixel processing algorithms
import { CONFIG } from './config.js';
import { colorDistanceSq } from './color-utils.js';
import { createSpatialHash, findClosestSpatial } from './spatial-hash.js';
import { updateProgress, showStatus } from './ui-helpers.js';
import { resultCanvas } from './dom.js';

export let currentSourceData = null;
export let currentModulatorData = null;
export let pixelMapping = {}; // Maps result index -> source index
export let isProcessing = false;
export let cancelProcessing = false;

// Main processing function with optimized algorithms
export function processPixels(sourceData, modulatorData, algorithmType, colorSpace) {
    // Validate inputs
    if (!sourceData || !modulatorData) {
        throw new Error('Invalid image data provided');
    }
    
    if (!sourceData.data || !modulatorData.data) {
        throw new Error('Image data arrays are missing');
    }
    
    if (sourceData.data.length === 0 || modulatorData.data.length === 0) {
        throw new Error('Empty image data provided');
    }
    
    // Reset state
    isProcessing = true;
    cancelProcessing = false;
    pixelMapping = {};
    showStatus('Preparing pixel matching...', 'processing');
    
    const sourceDataArr = sourceData.data;
    const modulatorDataArr = modulatorData.data;
    const sourceLen = sourceDataArr.length;
    const modulatorLen = modulatorDataArr.length;
    const totalPixels = modulatorLen / 4;
    
    resultCanvas.width = modulatorData.width;
    resultCanvas.height = modulatorData.height;
    const resultCtx = resultCanvas.getContext('2d');
    const resultData = resultCtx.createImageData(resultCanvas.width, resultCanvas.height);
    
    const usedPixels = new Set();
    pixelMapping = {};
    const labCache = colorSpace === 'lab' ? new Map() : null;
    
    let spatialData = null;
    
    // Build spatial hash if needed
    if (algorithmType === 'spatial') {
        showStatus('Building spatial hash...', 'processing');
        updateProgress(25);
        spatialData = createSpatialHash(sourceData, 16);
        updateProgress(30);
    }
    
    showStatus('Matching pixels...', 'processing');
    
    // Process in chunks using requestAnimationFrame for smooth UI
    const chunkSize = Math.max(CONFIG.MIN_CHUNK_SIZE, Math.floor(totalPixels / CONFIG.CHUNK_SIZE_DIVISOR));
    let processedPixels = 0;
    let currentIndex = 0;
    
    const processChunk = () => {
        // Check for cancellation
        if (cancelProcessing) {
            isProcessing = false;
            showStatus('Processing cancelled', 'error');
            return;
        }
        
        const endIndex = Math.min(currentIndex + chunkSize * 4, modulatorLen);
        
        for (let i = currentIndex; i < endIndex; i += 4) {
            const targetR = modulatorDataArr[i];
            const targetG = modulatorDataArr[i + 1];
            const targetB = modulatorDataArr[i + 2];
            const targetA = modulatorDataArr[i + 3];
            
            let bestIndex = -1;
            
            if (algorithmType === 'spatial' && spatialData) {
                bestIndex = findClosestSpatial(
                    targetR, targetG, targetB,
                    spatialData, usedPixels, colorSpace, labCache
                );
            } else {
                // Greedy or Optimal
                let bestDistSq = Infinity;
                const thresholdSq = algorithmType === 'greedy' ? 625 : Infinity;
                let foundGood = false;
                
                for (let j = 0; j < sourceLen; j += 4) {
                    if (usedPixels.has(j)) continue;
                    
                    const distSq = colorDistanceSq(
                        targetR, targetG, targetB,
                        sourceDataArr[j], sourceDataArr[j + 1], sourceDataArr[j + 2],
                        colorSpace, labCache
                    );
                    
                    if (distSq < thresholdSq && algorithmType === 'greedy' && !foundGood) {
                        bestIndex = j;
                        foundGood = true;
                        break;
                    }
                    
                    if (distSq < bestDistSq) {
                        bestDistSq = distSq;
                        bestIndex = j;
                        if (distSq === 0) break;
                    }
                }
            }
            
            // Always assign a pixel (use fallback if needed)
            if (bestIndex >= 0) {
                resultData.data[i] = sourceDataArr[bestIndex];
                resultData.data[i + 1] = sourceDataArr[bestIndex + 1];
                resultData.data[i + 2] = sourceDataArr[bestIndex + 2];
                resultData.data[i + 3] = targetA;
                usedPixels.add(bestIndex);
                pixelMapping[i] = bestIndex;
            } else {
                // Fallback: use closest pixel even if already used
                let fallbackIndex = 0;
                let fallbackDistSq = Infinity;
                for (let j = 0; j < sourceLen; j += 4) {
                    const distSq = colorDistanceSq(
                        targetR, targetG, targetB,
                        sourceDataArr[j], sourceDataArr[j + 1], sourceDataArr[j + 2],
                        colorSpace, labCache
                    );
                    if (distSq < fallbackDistSq) {
                        fallbackDistSq = distSq;
                        fallbackIndex = j;
                    }
                }
                resultData.data[i] = sourceDataArr[fallbackIndex];
                resultData.data[i + 1] = sourceDataArr[fallbackIndex + 1];
                resultData.data[i + 2] = sourceDataArr[fallbackIndex + 2];
                resultData.data[i + 3] = targetA;
                pixelMapping[i] = fallbackIndex;
            }
            
            processedPixels++;
        }
        
        currentIndex = endIndex;
        
        // Update progress
        const progress = 30 + (processedPixels / totalPixels) * 65;
        updateProgress(progress);
        
        // Continue processing or finish
        if (endIndex < modulatorLen && !cancelProcessing) {
            requestAnimationFrame(processChunk);
        } else {
            isProcessing = false;
            // Processing complete
            updateProgress(95);
            showStatus('Rendering result...', 'processing');
            
            // Store final result
            const finalResultData = new ImageData(
                new Uint8ClampedArray(resultData.data),
                resultCanvas.width,
                resultCanvas.height
            );
            
            // Always render directly first
            resultCtx.putImageData(resultData, 0, 0);
            
            // Store for animation
            currentSourceData = sourceData;
            currentModulatorData = modulatorData;
            
            // Trigger completion callback
            setTimeout(() => {
                if (!cancelProcessing && typeof window.onPixelProcessingComplete === 'function') {
                    window.onPixelProcessingComplete(finalResultData);
                }
            }, 100);
        }
    };
    
    // Start processing with error handling
    try {
        requestAnimationFrame(processChunk);
    } catch (error) {
        isProcessing = false;
        console.error('Error starting processing:', error);
        showStatus('Error starting processing: ' + error.message, 'error');
        throw error;
    }
}

// Cancel current processing
export function cancelPixelProcessing() {
    cancelProcessing = true;
    isProcessing = false;
}

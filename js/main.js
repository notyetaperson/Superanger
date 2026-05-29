// Main coordination and initialization
import { CONFIG } from './config.js';
import { initializeDOM, DOMCache, resultCanvas } from './dom.js';
import { handleImageUpload, sourceImage, modulatorImage } from './image-handler.js';
import { updateExecuteButton, startProcessing, finishProcessing, showStatus, downloadResult, updateProgress } from './ui-helpers.js';
import { processPixels, currentSourceData, pixelMapping, cancelPixelProcessing } from './pixel-processor.js';
import { PixelAnimation } from './animation.js';

let pixelAnimation = null;
let currentProcessId = null;

// Browser compatibility check
function checkBrowserCompatibility() {
    const issues = [];
    
    if (typeof Image === 'undefined') {
        issues.push('Image API not supported');
    }
    
    if (typeof CanvasRenderingContext2D === 'undefined' && typeof OffscreenCanvasRenderingContext2D === 'undefined') {
        issues.push('Canvas API not supported');
    }
    
    if (typeof requestAnimationFrame === 'undefined') {
        issues.push('requestAnimationFrame not supported');
    }
    
    if (typeof FileReader === 'undefined') {
        issues.push('FileReader API not supported');
    }
    
    if (issues.length > 0) {
        showStatus('Browser compatibility issues: ' + issues.join(', '), 'error');
        console.warn('Compatibility issues:', issues);
        return false;
    }
    
    return true;
}

// Set up completion callback
window.onPixelProcessingComplete = (finalResultData) => {
    try {
        // Cleanup previous animation if exists
        if (pixelAnimation && typeof pixelAnimation.stop === 'function') {
            pixelAnimation.stop();
            pixelAnimation = null;
        }
        
        // Start animation if mapping available
        if (currentSourceData && Object.keys(pixelMapping).length > 0) {
            showStatus('Animating pixels...', 'processing');
            startPixelAnimation(currentSourceData, finalResultData, pixelMapping);
        } else {
            const totalPixels = ((finalResultData?.data.length || 0) / 4).toLocaleString();
            showStatus(`Complete! Processed ${totalPixels} pixels.`, 'success');
            finishProcessing();
            currentProcessId = null;
        }
    } catch (error) {
        console.error('Error in completion callback:', error);
        showStatus('Error completing processing: ' + error.message, 'error');
        finishProcessing();
        currentProcessId = null;
    }
};

// Initialize app
function initializeApp() {
    // Check browser compatibility
    if (!checkBrowserCompatibility()) {
        return;
    }
    
    try {
        initializeDOM();
        
        // Validate critical DOM elements
        if (!DOMCache.executeBtn || !DOMCache.sourceInput || !DOMCache.modulatorInput) {
            throw new Error('Critical DOM elements not found');
        }
        
        // Add event listeners with error handling
        if (DOMCache.sourceInput) {
            DOMCache.sourceInput.addEventListener('change', (e) => {
                try {
                    handleImageUpload(e, 'source');
                } catch (error) {
                    console.error('Error handling source upload:', error);
                    showStatus('Error uploading source image: ' + error.message, 'error');
                }
            });
        }
        
        if (DOMCache.modulatorInput) {
            DOMCache.modulatorInput.addEventListener('change', (e) => {
                try {
                    handleImageUpload(e, 'modulator');
                } catch (error) {
                    console.error('Error handling modulator upload:', error);
                    showStatus('Error uploading modulator image: ' + error.message, 'error');
                }
            });
        }
        
        if (DOMCache.executeBtn) {
            DOMCache.executeBtn.addEventListener('click', () => {
                try {
                    executeRearrangement();
                } catch (error) {
                    console.error('Error executing rearrangement:', error);
                    showStatus('Error: ' + error.message, 'error');
                    finishProcessing();
                }
            });
            
            // Keyboard support
            DOMCache.executeBtn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    DOMCache.executeBtn.click();
                }
            });
        }
        
        if (DOMCache.downloadBtn) {
            DOMCache.downloadBtn.addEventListener('click', () => {
                try {
                    downloadResult(resultCanvas);
                } catch (error) {
                    console.error('Error downloading result:', error);
                    showStatus('Error downloading: ' + error.message, 'error');
                }
            });
        }
        
        // Add global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            showStatus('An unexpected error occurred. Please refresh the page.', 'error');
        });
        
        // Add unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            showStatus('An error occurred. Please try again.', 'error');
        });
        
    } catch (error) {
        console.error('Error initializing app:', error);
        showStatus('Failed to initialize application: ' + error.message, 'error');
    }
}

// Use DOMContentLoaded or run immediately if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

// Export for use in other modules
export { updateExecuteButton };

// Handle image upload completion
export function onImageUploaded() {
    updateExecuteButton();
}

// Execute pixel rearrangement
function executeRearrangement() {
    // Validate inputs
    if (!sourceImage || !modulatorImage) {
        showStatus('Please upload both images first.', 'error');
        return;
    }
    
    // Validate image dimensions
    if (sourceImage.width <= 0 || sourceImage.height <= 0 || 
        modulatorImage.width <= 0 || modulatorImage.height <= 0) {
        showStatus('Invalid image dimensions. Please upload valid images.', 'error');
        return;
    }
    
    // Cancel any existing processing
    if (currentProcessId !== null) {
        cancelPixelProcessing();
    }
    
    // Generate new process ID
    currentProcessId = Date.now();
    const processId = currentProcessId;
    
    startProcessing();
    
    const processFn = () => {
        // Check if this process was cancelled
        if (currentProcessId !== processId) {
            return;
        }
        
        try {
            let sourceWidth = sourceImage.width;
            let sourceHeight = sourceImage.height;
            let modulatorWidth = modulatorImage.width;
            let modulatorHeight = modulatorImage.height;
            
            // Automatically reduce quality by 70% (scale to 30% of original)
            sourceWidth = Math.floor(sourceWidth * CONFIG.QUALITY_REDUCTION);
            sourceHeight = Math.floor(sourceHeight * CONFIG.QUALITY_REDUCTION);
            modulatorWidth = Math.floor(modulatorWidth * CONFIG.QUALITY_REDUCTION);
            modulatorHeight = Math.floor(modulatorHeight * CONFIG.QUALITY_REDUCTION);
            
            // Apply maxPixels limit if set
            if (CONFIG.MAX_PIXELS > 0) {
                const sourceRatio = Math.min(CONFIG.MAX_PIXELS / sourceWidth, CONFIG.MAX_PIXELS / sourceHeight);
                const modulatorRatio = Math.min(CONFIG.MAX_PIXELS / modulatorWidth, CONFIG.MAX_PIXELS / modulatorHeight);
                
                if (sourceRatio < 1) {
                    sourceWidth = Math.floor(sourceWidth * sourceRatio);
                    sourceHeight = Math.floor(sourceHeight * sourceRatio);
                }
                if (modulatorRatio < 1) {
                    modulatorWidth = Math.floor(modulatorWidth * modulatorRatio);
                    modulatorHeight = Math.floor(modulatorHeight * modulatorRatio);
                }
            }
            
            let sourceCanvas, modulatorCanvas, sourceCtx, modulatorCtx;
            
            if (typeof OffscreenCanvas !== 'undefined') {
                sourceCanvas = new OffscreenCanvas(sourceWidth, sourceHeight);
                modulatorCanvas = new OffscreenCanvas(modulatorWidth, modulatorHeight);
                sourceCtx = sourceCanvas.getContext('2d');
                modulatorCtx = modulatorCanvas.getContext('2d');
            } else {
                sourceCanvas = document.createElement('canvas');
                modulatorCanvas = document.createElement('canvas');
                sourceCanvas.width = sourceWidth;
                sourceCanvas.height = sourceHeight;
                modulatorCanvas.width = modulatorWidth;
                modulatorCanvas.height = modulatorHeight;
                sourceCtx = sourceCanvas.getContext('2d');
                modulatorCtx = modulatorCanvas.getContext('2d');
            }
            
            sourceCtx.drawImage(sourceImage, 0, 0, sourceWidth, sourceHeight);
            modulatorCtx.drawImage(modulatorImage, 0, 0, modulatorWidth, modulatorHeight);
            
            updateProgress(10);
            showStatus('Extracting pixel data...', 'processing');
            
            const sourceData = sourceCtx.getImageData(0, 0, sourceWidth, sourceHeight);
            const modulatorData = modulatorCtx.getImageData(0, 0, modulatorWidth, modulatorHeight);
            
            resultCanvas.width = modulatorWidth;
            resultCanvas.height = modulatorHeight;
            
            updateProgress(20);
            
            // Validate canvas contexts
            if (!sourceCtx || !modulatorCtx) {
                throw new Error('Failed to get canvas context');
            }
            
            // Process on main thread with optimized algorithms
            processPixels(
                sourceData,
                modulatorData,
                CONFIG.ALGORITHM_TYPE,
                CONFIG.COLOR_SPACE
            );
            
        } catch (error) {
            console.error('Error in processFn:', error);
            showStatus('Error: ' + (error.message || 'Unknown error occurred'), 'error');
            finishProcessing();
            currentProcessId = null;
        }
    };
    
    // Use requestIdleCallback with fallback
    if (window.requestIdleCallback) {
        requestIdleCallback(processFn, { timeout: 100 });
    } else {
        setTimeout(processFn, 100);
    }
}

// Start pixel animation
function startPixelAnimation(sourceData, resultData, mapping) {
    try {
        // CRITICAL: Render the complete result FIRST before any animation
        if (!resultCanvas) {
            throw new Error('Result canvas not available');
        }
        
        const resultCtx = resultCanvas.getContext('2d');
        if (!resultCtx) {
            throw new Error('Failed to get result canvas context');
        }
        
        resultCtx.putImageData(resultData, 0, 0);
        
        const mappingKeys = Object.keys(mapping);
        if (mappingKeys.length === 0) {
            const totalPixels = (resultData.data.length / 4).toLocaleString();
            showStatus(`Complete! Processed ${totalPixels} pixels.`, 'success');
            finishProcessing();
            currentProcessId = null;
            return;
        }
        
        // Create animation (visual effect only)
        const sourcePreview = document.getElementById('sourcePreview');
        if (!sourcePreview) {
            // Skip animation if source preview not available
            const totalPixels = (resultData.data.length / 4).toLocaleString();
            showStatus(`Complete! Processed ${totalPixels} pixels.`, 'success');
            finishProcessing();
            currentProcessId = null;
            return;
        }
        
        pixelAnimation = new PixelAnimation(
            sourcePreview,
            resultCanvas,
            sourceData,
            resultData,
            mapping
        );
        
        pixelAnimation.start();
        
        // Finish after animation
        setTimeout(() => {
            try {
                const finalCtx = resultCanvas.getContext('2d');
                if (finalCtx) {
                    finalCtx.putImageData(resultData, 0, 0);
                }
                
                const totalPixels = (resultData.data.length / 4).toLocaleString();
                showStatus(`Complete! Processed ${totalPixels} pixels.`, 'success');
                finishProcessing();
                currentProcessId = null;
            } catch (error) {
                console.error('Error finishing animation:', error);
                finishProcessing();
                currentProcessId = null;
            }
        }, pixelAnimation.duration + 500);
    } catch (error) {
        console.error('Error starting animation:', error);
        showStatus('Error during animation: ' + error.message, 'error');
        finishProcessing();
        currentProcessId = null;
    }
}

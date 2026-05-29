// UI updates, progress, and status messages
import { DOMCache } from './dom.js';
import * as imageHandler from './image-handler.js';

export let isProcessing = false;

export function updateExecuteButton() {
    DOMCache.executeBtn.disabled = !(imageHandler.sourceImage && imageHandler.modulatorImage) || isProcessing;
}

// Optimized progress update
let progressAnimationFrame = null;
export function updateProgress(percent) {
    if (!DOMCache.progressFill || !DOMCache.progressText) {
        console.warn('Progress elements not initialized');
        return;
    }
    
    // Clamp percent to valid range
    const clampedPercent = Math.max(0, Math.min(100, percent));
    
    if (progressAnimationFrame) {
        cancelAnimationFrame(progressAnimationFrame);
    }
    
    progressAnimationFrame = requestAnimationFrame(() => {
        if (DOMCache.progressFill && DOMCache.progressText) {
            DOMCache.progressFill.style.width = clampedPercent + '%';
            const roundedPercent = Math.round(clampedPercent);
            DOMCache.progressText.textContent = roundedPercent + '%';
            
            // Update ARIA attributes for accessibility
            const progressContainer = DOMCache.progressContainer;
            if (progressContainer) {
                progressContainer.setAttribute('aria-valuenow', roundedPercent);
            }
        }
    });
}

export function showStatus(message, type) {
    if (!DOMCache.statusDiv) {
        console.warn('Status element not initialized');
        return;
    }
    DOMCache.statusDiv.textContent = message;
    DOMCache.statusDiv.className = 'status ' + type;
}

export function startProcessing() {
    isProcessing = true;
    if (DOMCache.executeBtn) DOMCache.executeBtn.disabled = true;
    if (DOMCache.downloadBtn) DOMCache.downloadBtn.style.display = 'none';
    if (DOMCache.btnText) DOMCache.btnText.style.display = 'none';
    if (DOMCache.btnLoader) DOMCache.btnLoader.style.display = 'inline';
    if (DOMCache.progressContainer) DOMCache.progressContainer.style.display = 'block';
    showStatus('Initializing...', 'processing');
    updateProgress(0);
}

export function finishProcessing() {
    isProcessing = false;
    if (DOMCache.executeBtn) DOMCache.executeBtn.disabled = false;
    if (DOMCache.downloadBtn) DOMCache.downloadBtn.style.display = 'flex';
    if (DOMCache.btnText) DOMCache.btnText.style.display = 'inline';
    if (DOMCache.btnLoader) DOMCache.btnLoader.style.display = 'none';
    
    setTimeout(() => {
        if (DOMCache.progressContainer) DOMCache.progressContainer.style.display = 'none';
    }, 2000);
}

export function downloadResult(resultCanvas) {
    if (!resultCanvas) return;
    
    const link = document.createElement('a');
    link.download = 'pixel-rearrangement-result.png';
    link.href = resultCanvas.toDataURL('image/png');
    link.click();
}

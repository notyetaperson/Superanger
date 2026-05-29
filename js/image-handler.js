// Image upload and canvas drawing
import { sourceCanvas, modulatorCanvas, DOMCache } from './dom.js';
import { updateExecuteButton, showStatus } from './ui-helpers.js';
import { CONFIG } from './config.js';

export let sourceImage = null;
export let modulatorImage = null;

// Validate file before processing
function validateFile(file) {
    if (!file) {
        return { valid: false, error: 'No file selected' };
    }
    
    // Check file type
    if (!CONFIG.SUPPORTED_FORMATS.includes(file.type)) {
        return { 
            valid: false, 
            error: `Unsupported file type. Supported formats: ${CONFIG.SUPPORTED_FORMATS.map(f => f.split('/')[1].toUpperCase()).join(', ')}` 
        };
    }
    
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > CONFIG.MAX_FILE_SIZE_MB) {
        return { 
            valid: false, 
            error: `File too large. Maximum size: ${CONFIG.MAX_FILE_SIZE_MB}MB (current: ${fileSizeMB.toFixed(2)}MB)` 
        };
    }
    
    return { valid: true };
}

// Handle image upload
export function handleImageUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    const infoDiv = type === 'source' ? DOMCache.sourceInfo : DOMCache.modulatorInfo;
    const input = type === 'source' ? DOMCache.sourceInput : DOMCache.modulatorInput;
    
    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
        showStatus(validation.error, 'error');
        infoDiv.textContent = validation.error;
        if (input) input.value = ''; // Clear invalid file
        if (type === 'source') sourceImage = null;
        else modulatorImage = null;
        updateExecuteButton();
        return;
    }
    
    const fileSize = (file.size / 1024).toFixed(2);
    infoDiv.textContent = `Loading: ${file.name} (${fileSize} KB)...`;
    infoDiv.setAttribute('aria-live', 'polite');
    
    const reader = new FileReader();
    
    reader.onerror = () => {
        const errorMsg = 'Failed to read file';
        showStatus(errorMsg, 'error');
        infoDiv.textContent = errorMsg;
        if (input) input.value = '';
        if (type === 'source') sourceImage = null;
        else modulatorImage = null;
        updateExecuteButton();
    };
    
    reader.onload = (e) => {
        const img = new Image();
        
        img.onerror = () => {
            const errorMsg = 'Invalid or corrupted image file';
            showStatus(errorMsg, 'error');
            infoDiv.textContent = errorMsg;
            if (input) input.value = '';
            if (type === 'source') sourceImage = null;
            else modulatorImage = null;
            updateExecuteButton();
        };
        
        img.onload = () => {
            // Validate image dimensions
            if (img.width > CONFIG.MAX_IMAGE_DIMENSION || img.height > CONFIG.MAX_IMAGE_DIMENSION) {
                const errorMsg = `Image too large. Maximum dimension: ${CONFIG.MAX_IMAGE_DIMENSION}px`;
                showStatus(errorMsg, 'error');
                infoDiv.textContent = errorMsg;
                if (input) input.value = '';
                if (type === 'source') sourceImage = null;
                else modulatorImage = null;
                updateExecuteButton();
                return;
            }
            
            // Check estimated memory usage
            const estimatedMB = (img.width * img.height * 4 * 2) / (1024 * 1024); // RGBA * 2 images
            if (estimatedMB > CONFIG.MAX_MEMORY_MB) {
                const warning = `Large image detected (${estimatedMB.toFixed(1)}MB estimated). Processing may be slow.`;
                showStatus(warning, 'processing');
            }
            
            try {
                if (type === 'source') {
                    sourceImage = img;
                    drawImageToCanvas(img, sourceCanvas);
                    infoDiv.textContent = `✓ ${file.name} (${fileSize} KB) | ${img.width}×${img.height}px`;
                } else {
                    modulatorImage = img;
                    drawImageToCanvas(img, modulatorCanvas);
                    infoDiv.textContent = `✓ ${file.name} (${fileSize} KB) | ${img.width}×${img.height}px`;
                }
                updateExecuteButton();
            } catch (error) {
                console.error('Error drawing image:', error);
                showStatus('Error displaying image: ' + error.message, 'error');
                infoDiv.textContent = 'Error displaying image';
            }
        };
        
        // Sanitize: only set src after validation
        try {
            img.src = e.target.result;
        } catch (error) {
            console.error('Error setting image source:', error);
            showStatus('Error loading image: ' + error.message, 'error');
            infoDiv.textContent = 'Error loading image';
        }
    };
    
    try {
        reader.readAsDataURL(file);
    } catch (error) {
        console.error('Error reading file:', error);
        showStatus('Error reading file: ' + error.message, 'error');
        infoDiv.textContent = 'Error reading file';
    }
}

// Draw image to canvas
export function drawImageToCanvas(img, canvas) {
    if (!img || !canvas) {
        console.error('Invalid image or canvas');
        return;
    }
    
    const maxWidth = CONFIG.PREVIEW_WIDTH;
    const maxHeight = CONFIG.PREVIEW_HEIGHT;
    let width = img.width;
    let height = img.height;
    
    if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.floor(width * ratio);
        height = Math.floor(height * ratio);
    }
    
    // Validate dimensions
    if (width <= 0 || height <= 0 || !isFinite(width) || !isFinite(height)) {
        console.error('Invalid image dimensions:', width, height);
        return;
    }
    
    try {
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { 
            willReadFrequently: false,
            alpha: true,
            desynchronized: false
        });
        
        // Clear canvas before drawing
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
    } catch (error) {
        console.error('Error drawing to canvas:', error);
        throw new Error('Failed to draw image to canvas: ' + error.message);
    }
}

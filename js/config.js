// Configuration and constants
export const CONFIG = {
    // Default algorithm settings
    ALGORITHM_TYPE: 'spatial',
    COLOR_SPACE: 'lab',
    MAX_PIXELS: 500,
    
    // Quality reduction
    QUALITY_REDUCTION: 0.3,
    
    // Canvas dimensions
    PREVIEW_WIDTH: 400,
    PREVIEW_HEIGHT: 300,
    RESULT_WIDTH: 800,
    RESULT_HEIGHT: 600,
    
    // Processing
    CHUNK_SIZE_DIVISOR: 100, // Process 1% per frame
    MIN_CHUNK_SIZE: 100,
    
    // Validation
    MAX_FILE_SIZE_MB: 50, // Maximum file size in MB
    MAX_IMAGE_DIMENSION: 10000, // Maximum image dimension in pixels
    SUPPORTED_FORMATS: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    
    // Performance
    MAX_MEMORY_MB: 500, // Approximate max memory usage in MB
    CANCEL_TIMEOUT_MS: 100 // Timeout for cancel operations
};

// Pre-computed constants for Lab conversion
export const RGB_TO_XYZ = new Float32Array([
    0.4124, 0.3576, 0.1805,
    0.2126, 0.7152, 0.0722,
    0.0193, 0.1192, 0.9505
]);

export const XYZ_TO_LAB_DIV = [0.95047, 1.00000, 1.08883];
export const INV_255 = 1 / 255;
export const GAMMA_THRESHOLD = 0.04045;
export const GAMMA_MULT = 1.055;
export const GAMMA_POW = 2.4;
export const LAB_THRESHOLD = 0.008856;
export const LAB_MULT = 7.787;
export const LAB_ADD = 16 / 116;

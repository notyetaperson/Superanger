// DOM element cache and initialization
export const DOMCache = {
    sourceInput: null,
    modulatorInput: null,
    executeBtn: null,
    downloadBtn: null,
    progressContainer: null,
    progressFill: null,
    progressText: null,
    statusDiv: null,
    sourceInfo: null,
    modulatorInfo: null,
    btnText: null,
    btnLoader: null
};

export let sourceCanvas = null;
export let modulatorCanvas = null;
export let resultCanvas = null;

// Initialize DOM elements
export function initializeDOM() {
    sourceCanvas = document.getElementById('sourcePreview');
    modulatorCanvas = document.getElementById('modulatorPreview');
    resultCanvas = document.getElementById('resultCanvas');
    
    // Set canvas dimensions immediately to prevent CLS
    if (sourceCanvas) {
        sourceCanvas.width = 400;
        sourceCanvas.height = 300;
    }
    if (modulatorCanvas) {
        modulatorCanvas.width = 400;
        modulatorCanvas.height = 300;
    }
    if (resultCanvas) {
        resultCanvas.width = 800;
        resultCanvas.height = 600;
    }
    
    DOMCache.sourceInput = document.getElementById('sourceImage');
    DOMCache.modulatorInput = document.getElementById('modulatorImage');
    DOMCache.executeBtn = document.getElementById('executeBtn');
    DOMCache.downloadBtn = document.getElementById('downloadBtn');
    DOMCache.progressContainer = document.getElementById('progressContainer');
    DOMCache.progressFill = document.getElementById('progressFill');
    DOMCache.progressText = document.getElementById('progressText');
    DOMCache.statusDiv = document.getElementById('status');
    DOMCache.sourceInfo = document.getElementById('sourceInfo');
    DOMCache.modulatorInfo = document.getElementById('modulatorInfo');
    DOMCache.btnText = DOMCache.executeBtn?.querySelector('.btn-text');
    DOMCache.btnLoader = DOMCache.executeBtn?.querySelector('.btn-loader');
}

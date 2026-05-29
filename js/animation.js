// Pixel flying animation system
export class PixelAnimation {
    constructor(sourceCanvas, resultCanvas, sourceImageData, resultImageData, pixelMapping) {
        this.sourceCanvas = sourceCanvas;
        this.resultCanvas = resultCanvas;
        this.sourceImageData = sourceImageData;
        this.resultImageData = resultImageData;
        this.pixelMapping = pixelMapping; // Maps result index -> source index
        
        this.animationCanvas = document.createElement('canvas');
        this.animationCanvas.style.position = 'absolute';
        this.animationCanvas.style.pointerEvents = 'none';
        this.animationCanvas.style.zIndex = '10';
        this.animationCtx = this.animationCanvas.getContext('2d');
        
        this.particles = [];
        this.isAnimating = false;
        this.animationFrame = null;
        this.startTime = 0;
        this.duration = 2000; // 2 seconds
        this.pixelsPerFrame = 50; // Animate this many pixels per frame
        
        this.setupCanvas();
        this.createParticles();
    }
    
    setupCanvas() {
        const container = this.resultCanvas.parentElement;
        container.style.position = 'relative';
        
        this.animationCanvas.width = this.resultCanvas.width;
        this.animationCanvas.height = this.resultCanvas.height;
        this.animationCanvas.style.left = '0';
        this.animationCanvas.style.top = '0';
        this.animationCanvas.style.width = this.resultCanvas.offsetWidth + 'px';
        this.animationCanvas.style.height = this.resultCanvas.offsetHeight + 'px';
        
        container.appendChild(this.animationCanvas);
    }
    
    createParticles() {
        const resultWidth = this.resultCanvas.width;
        const resultHeight = this.resultCanvas.height;
        const sourceWidth = this.sourceImageData.width;
        const sourceHeight = this.sourceImageData.height;
        
        const resultData = this.resultImageData.data;
        
        // Get source canvas position relative to result
        const sourceRect = this.sourceCanvas.getBoundingClientRect();
        const resultRect = this.resultCanvas.getBoundingClientRect();
        
        const sourceOffsetX = sourceRect.left - resultRect.left;
        const sourceOffsetY = sourceRect.top - resultRect.top;
        const sourceToScreenX = sourceRect.width / sourceWidth;
        const sourceToScreenY = sourceRect.height / sourceHeight;
        const resultToScreenX = resultRect.width / resultWidth;
        const resultToScreenY = resultRect.height / resultHeight;
        
        // Sample pixels for performance (animate every Nth pixel)
        const sampleRate = Math.max(1, Math.floor(resultWidth * resultHeight / 10000));
        
        // Create particles for each pixel
        for (let y = 0; y < resultHeight; y += sampleRate) {
            for (let x = 0; x < resultWidth; x += sampleRate) {
                const resultIdx = (y * resultWidth + x) * 4;
                const sourceIdx = this.pixelMapping[resultIdx];
                
                if (sourceIdx !== undefined && sourceIdx >= 0 && sourceIdx < this.sourceImageData.data.length) {
                    // Calculate source pixel position
                    const sourcePixelX = (sourceIdx / 4) % sourceWidth;
                    const sourcePixelY = Math.floor((sourceIdx / 4) / sourceWidth);
                    
                    // Convert to screen coordinates
                    const startX = sourceOffsetX + (sourcePixelX * sourceToScreenX);
                    const startY = sourceOffsetY + (sourcePixelY * sourceToScreenY);
                    const endX = x * resultToScreenX;
                    const endY = y * resultToScreenY;
                    
                    // Get pixel color from result data
                    const r = resultData[resultIdx] || 0;
                    const g = resultData[resultIdx + 1] || 0;
                    const b = resultData[resultIdx + 2] || 0;
                    const a = resultData[resultIdx + 3] || 255;
                    
                    // Store pixel coordinates for final rendering
                    this.particles.push({
                        startX,
                        startY,
                        endX,
                        endY,
                        pixelX: x,  // Store actual pixel coordinates
                        pixelY: y,
                        currentX: startX,
                        currentY: startY,
                        r, g, b, a,
                        progress: 0,
                        delay: Math.random() * 0.6, // Stagger animation
                        size: Math.max(2, Math.min(4, 2000 / resultWidth)) // Adaptive size
                    });
                }
            }
        }
        
        // Shuffle for more organic feel
        this.particles.sort(() => Math.random() - 0.5);
    }
    
    start() {
        if (this.isAnimating) return;
        
        this.isAnimating = true;
        this.startTime = performance.now();
        
        // CRITICAL: Render ALL pixels immediately - don't wait for animation
        // Animation is just visual, but the full result must be visible
        const ctx = this.resultCanvas.getContext('2d');
        ctx.putImageData(this.resultImageData, 0, 0);
        
        this.animate();
    }
    
    animate() {
        if (!this.isAnimating) return;
        
        const currentTime = performance.now();
        const elapsed = currentTime - this.startTime;
        const normalizedTime = Math.min(elapsed / this.duration, 1);
        
        // Clear animation canvas
        this.animationCtx.clearRect(0, 0, this.animationCanvas.width, this.animationCanvas.height);
        
        // IMPORTANT: Result canvas already has all pixels rendered from start()
        // Animation overlay is just visual effect on top
        
        let activeParticles = 0;
        
        // Update and draw particles (visual effect only)
        for (let i = 0; i < this.particles.length; i++) {
            const particle = this.particles[i];
            
            // Check if particle should start animating
            if (normalizedTime < particle.delay) {
                continue;
            }
            
            // Calculate progress with easing
            const particleTime = (normalizedTime - particle.delay) / (1 - particle.delay);
            particle.progress = this.easeInOutCubic(Math.max(0, Math.min(1, particleTime)));
            
            if (particle.progress < 1) {
                // Particle is still animating - draw on overlay
                activeParticles++;
                
                // Update position
                particle.currentX = particle.startX + (particle.endX - particle.startX) * particle.progress;
                particle.currentY = particle.startY + (particle.endY - particle.startY) * particle.progress;
                
                // Draw particle on animation overlay (visual effect only)
                this.animationCtx.fillStyle = `rgba(${particle.r}, ${particle.g}, ${particle.b}, ${particle.a / 255})`;
                this.animationCtx.fillRect(
                    particle.currentX,
                    particle.currentY,
                    particle.size,
                    particle.size
                );
            }
        }
        
        // Continue animation
        if (normalizedTime < 1 || activeParticles > 0) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        } else {
            this.stop();
        }
    }
    
    easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    
    stop() {
        this.isAnimating = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Final safety render - ensure all pixels are correct
        try {
            const resultCtx = this.resultCanvas.getContext('2d');
            if (resultCtx && this.resultImageData) {
                resultCtx.putImageData(this.resultImageData, 0, 0);
            }
        } catch (error) {
            console.error('Error in final render:', error);
        }
        
        // Clear particles to free memory
        this.particles = [];
        
        // Remove animation canvas
        setTimeout(() => {
            try {
                if (this.animationCanvas && this.animationCanvas.parentElement) {
                    this.animationCanvas.parentElement.removeChild(this.animationCanvas);
                }
                // Clear canvas context
                if (this.animationCtx) {
                    this.animationCtx.clearRect(0, 0, this.animationCanvas.width, this.animationCanvas.height);
                }
            } catch (error) {
                console.error('Error cleaning up animation canvas:', error);
            }
        }, 100);
    }
}

// Simplified version for real-time animation during processing
class SimplePixelAnimation {
    constructor(resultCanvas) {
        this.resultCanvas = resultCanvas;
        this.animationCanvas = document.createElement('canvas');
        this.animationCanvas.style.position = 'absolute';
        this.animationCanvas.style.pointerEvents = 'none';
        this.animationCanvas.style.zIndex = '10';
        this.animationCtx = this.animationCanvas.getContext('2d');
        
        this.pixelQueue = [];
        this.isAnimating = false;
        this.animationFrame = null;
        this.pixelsPerFrame = 100;
        
        this.setupCanvas();
    }
    
    setupCanvas() {
        const container = this.resultCanvas.parentElement;
        container.style.position = 'relative';
        
        this.animationCanvas.width = this.resultCanvas.width;
        this.animationCanvas.height = this.resultCanvas.height;
        this.animationCanvas.style.left = '0';
        this.animationCanvas.style.top = '0';
        this.animationCanvas.style.width = this.resultCanvas.offsetWidth + 'px';
        this.animationCanvas.style.height = this.resultCanvas.offsetHeight + 'px';
        
        container.appendChild(this.animationCanvas);
    }
    
    addPixel(sourceX, sourceY, targetX, targetY, r, g, b, a) {
        const sourceRect = this.sourceCanvas?.getBoundingClientRect();
        const resultRect = this.resultCanvas.getBoundingClientRect();
        
        let startX = sourceX;
        let startY = sourceY;
        
        if (sourceRect) {
            startX = sourceRect.left - resultRect.left + (sourceX * (sourceRect.width / this.sourceCanvas.width));
            startY = sourceRect.top - resultRect.top + (sourceY * (sourceRect.height / this.sourceCanvas.height));
        }
        
        this.pixelQueue.push({
            startX,
            startY,
            endX: targetX,
            endY: targetY,
            currentX: startX,
            currentY: startY,
            r, g, b, a,
            progress: 0,
            duration: 800 + Math.random() * 400,
            startTime: performance.now()
        });
        
        if (!this.isAnimating) {
            this.start();
        }
    }
    
    setSourceCanvas(sourceCanvas) {
        this.sourceCanvas = sourceCanvas;
    }
    
    start() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.animate();
    }
    
    animate() {
        if (!this.isAnimating && this.pixelQueue.length === 0) return;
        
        const currentTime = performance.now();
        const resultCtx = this.resultCanvas.getContext('2d');
        const resultImageData = resultCtx.getImageData(0, 0, this.resultCanvas.width, this.resultCanvas.height);
        const resultData = resultImageData.data;
        
        this.animationCtx.clearRect(0, 0, this.animationCanvas.width, this.animationCanvas.height);
        
        let activePixels = 0;
        
        for (let i = this.pixelQueue.length - 1; i >= 0; i--) {
            const pixel = this.pixelQueue[i];
            const elapsed = currentTime - pixel.startTime;
            pixel.progress = Math.min(elapsed / pixel.duration, 1);
            
            if (pixel.progress >= 1) {
                // Pixel reached destination
                const x = Math.floor(pixel.endX);
                const y = Math.floor(pixel.endY);
                const idx = (y * this.resultCanvas.width + x) * 4;
                
                if (idx >= 0 && idx < resultData.length - 3) {
                    resultData[idx] = pixel.r;
                    resultData[idx + 1] = pixel.g;
                    resultData[idx + 2] = pixel.b;
                    resultData[idx + 3] = pixel.a;
                }
                
                this.pixelQueue.splice(i, 1);
            } else {
                // Animate pixel
                activePixels++;
                const eased = this.easeOutCubic(pixel.progress);
                
                pixel.currentX = pixel.startX + (pixel.endX - pixel.startX) * eased;
                pixel.currentY = pixel.startY + (pixel.endY - pixel.startY) * eased;
                
                const scaleX = this.animationCanvas.width / this.resultCanvas.width;
                const scaleY = this.animationCanvas.height / this.resultCanvas.height;
                
                this.animationCtx.fillStyle = `rgba(${pixel.r}, ${pixel.g}, ${pixel.b}, ${pixel.a / 255})`;
                this.animationCtx.fillRect(
                    pixel.currentX * scaleX,
                    pixel.currentY * scaleY,
                    2,
                    2
                );
            }
        }
        
        resultCtx.putImageData(resultImageData, 0, 0);
        
        if (this.pixelQueue.length > 0 || activePixels > 0) {
            this.animationFrame = requestAnimationFrame(() => this.animate());
        } else {
            this.stop();
        }
    }
    
    easeOutCubic(t) {
        return 1 - Math.pow(1 - t, 3);
    }
    
    stop() {
        this.isAnimating = false;
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }
        
        // Clear pixel queue to free memory
        this.pixelQueue = [];
        
        setTimeout(() => {
            try {
                if (this.animationCanvas && this.animationCanvas.parentElement) {
                    this.animationCanvas.parentElement.removeChild(this.animationCanvas);
                }
                // Clear canvas context
                if (this.animationCtx) {
                    this.animationCtx.clearRect(0, 0, this.animationCanvas.width, this.animationCanvas.height);
                }
            } catch (error) {
                console.error('Error cleaning up simple animation:', error);
            }
        }, 500);
    }
    
    clear() {
        this.pixelQueue = [];
        this.stop();
    }
}

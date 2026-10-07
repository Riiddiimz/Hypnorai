/* ==========================================================================
   SeedSearcher - Recherche Déterministe de Durée de Simulation
   Simule en mémoire ultra-rapide des milliers de seeds pour trouver
   celle qui correspond exactement à la durée cible choisie (ex: 15s, 30s, 60s).
   ========================================================================== */

class SeedSearcher {
    constructor(simulation) {
        this.sim = simulation;
        this.prng = new PRNG(1);
        this.isSearching = false;
        this.searchTaskId = null;

        // Search parameters
        this.targetDuration = 30; // seconds
        this.tolerance = 0.45; // seconds
        this.testedCount = 0;
        this.bestSeed = null;
        this.bestDuration = null;
        this.bestDiff = Infinity;
        this.currentSeedCandidate = 1;

        // Callback hooks
        this.onProgress = null;
        this.onFound = null;
    }

    // Fast Headless simulation of a single seed
    evaluateSeed(seed, maxDuration = 120) {
        const mode = this.sim.activeMode;
        if (mode.evaluateSeed) return mode.evaluateSeed(seed, maxDuration, this.prng);
        this.prng.setSeed(seed);
        const count = mode.ringCount || 6;
        const maxRadius = Math.max(30, this.sim.boundaryRadius - 6);
        const innerRadius = Math.max(22, Math.min(65, this.sim.boundaryRadius * 0.24));
        const spacing = count > 1 ? (maxRadius - innerRadius) / (count - 1) : 0;
        const gapSize = mode.gapSize;
        const rotMultiplier = mode.rotationMultiplier;
        const rotDir = mode.rotationDirection;

        // Rings setup
        const rings = [];
        for (let i = 0; i < count; i++) {
            let speedSign = 1;
            if (rotDir === 'alternate') {
                speedSign = (i % 2 === 0 ? 1 : -1);
            } else if (rotDir === 'counter') {
                speedSign = -1;
            }

            rings.push({
                radius: Math.min(maxRadius, innerRadius + i * spacing),
                gapAngle: (i % 2 === 0 ? -Math.PI / 2 : Math.PI / 2) + (i * 0.65),
                rotationSpeed: speedSign * (0.22 + i * 0.04),
                active: true
            });
        }

        // Initial Ball setup
        const spawnOffset = rings[0].radius * 0.35;
        let ball = {
            x: this.sim.center.x,
            y: this.sim.center.y - spawnOffset,
            vx: (this.prng.random() - 0.5) * 6,
            vy: (this.prng.random() - 0.5) * 4,
            radius: this.sim.ballRadius
        };

        const gravity = this.sim.gravity;
        const bounciness = this.sim.bounciness;
        const speedBoost = this.sim.speedBoost;
        const maxSpeed = this.sim.maxSpeed;

        const dtScale = 1.0;
        const substeps = 8;
        const subDt = dtScale / substeps;
        const maxFrames = Math.floor(maxDuration * 60);

        let clearedCount = 0;

        for (let frame = 0; frame < maxFrames; frame++) {
            // Rotate rings
            for (let i = 0; i < count; i++) {
                if (rings[i].active) {
                    rings[i].gapAngle = (rings[i].gapAngle + rings[i].rotationSpeed * rotMultiplier * dtScale) % (Math.PI * 2);
                }
            }

            // Substep physics
            for (let step = 0; step < substeps; step++) {
                ball.vy += gravity * subDt;
                ball.x += ball.vx * subDt;
                ball.y += ball.vy * subDt;

                const curSpeed = Math.hypot(ball.vx, ball.vy);
                if (curSpeed > maxSpeed) {
                    ball.vx = (ball.vx / curSpeed) * maxSpeed;
                    ball.vy = (ball.vy / curSpeed) * maxSpeed;
                }

                // Check collision with innermost active ring
                const ringIndex = rings.findIndex(r => r.active);
                if (ringIndex === -1) {
                    // All rings cleared!
                    const elapsedSec = frame / 60;
                    return elapsedSec;
                }

                const ring = rings[ringIndex];
                const dx = ball.x - this.sim.center.x;
                const dy = ball.y - this.sim.center.y;
                const dist = Math.hypot(dx, dy);
                const radialVel = (ball.vx * dx + ball.vy * dy) / Math.max(dist, 0.001);
                const distDiff = dist - (ring.radius - ball.radius);

                if (distDiff >= 0 && radialVel > 0) {
                    let ballAngle = Math.atan2(dy, dx);
                    let relAngle = (ballAngle - ring.gapAngle) % (Math.PI * 2);
                    relAngle = Math.atan2(Math.sin(relAngle), Math.cos(relAngle));

                    if (Math.abs(relAngle) <= gapSize / 2) {
                        // Cleared ring
                        ring.active = false;
                        clearedCount++;
                        if (clearedCount >= count) {
                            return frame / 60;
                        }
                    } else {
                        // Rebound
                        const nx = dx / Math.max(dist, 0.001);
                        const ny = dy / Math.max(dist, 0.001);
                        ball.x = this.sim.center.x + nx * (ring.radius - ball.radius);
                        ball.y = this.sim.center.y + ny * (ring.radius - ball.radius);

                        const dot = ball.vx * nx + ball.vy * ny;
                        if (dot > 0) {
                            const bounceMult = bounciness * speedBoost;
                            ball.vx = (ball.vx - 2 * dot * nx) * bounceMult;
                            ball.vy = (ball.vy - 2 * dot * ny) * bounceMult;
                        }
                    }
                }
            }
        }

        return maxDuration; // Did not finish within limit
    }

    startSearch(targetDuration, onProgress, onFound) {
        this.stopSearch();
        const m = this.sim.activeMode;
        if (m.setTargetDuration) m.setTargetDuration(targetDuration);
        this.tolerance = m.searchTolerance ?? 0.45;

        this.targetDuration = targetDuration;
        this.onProgress = onProgress;
        this.onFound = onFound;
        this.isSearching = true;
        this.testedCount = 0;
        this.bestSeed = null;
        this.bestDuration = null;
        this.bestDiff = Infinity;
        this.currentSeedCandidate = Math.floor(Math.random() * 900000) + 100000;

        const maxDurationLimit = Math.max(120, targetDuration + 15);

        const frameTimeBudgetMs = 8; // Max 8ms per frame to keep 60 FPS silky smooth

        const searchStep = () => {
            if (!this.isSearching) return;

            const frameStart = performance.now();

            while (this.isSearching && (performance.now() - frameStart) < frameTimeBudgetMs) {
                this.currentSeedCandidate++;
                this.testedCount++;

                const duration = this.evaluateSeed(this.currentSeedCandidate, maxDurationLimit);
                const diff = Math.abs(duration - this.targetDuration);

                if (diff < this.bestDiff) {
                    this.bestDiff = diff;
                    this.bestSeed = this.currentSeedCandidate;
                    this.bestDuration = duration;
                }

                // Match found within tolerance threshold!
                if (diff <= this.tolerance) {
                    this.isSearching = false;
                    if (this.onFound) {
                        this.onFound({
                            seed: this.currentSeedCandidate,
                            duration: duration,
                            testedCount: this.testedCount
                        });
                    }
                    return;
                }
            }

            if (this.onProgress) {
                this.onProgress({
                    testedCount: this.testedCount,
                    bestSeed: this.bestSeed,
                    bestDuration: this.bestDuration,
                    bestDiff: this.bestDiff
                });
            }

            // Continue searching asynchronously without freezing the UI
            this.searchTaskId = requestAnimationFrame(searchStep);
        };

        this.searchTaskId = requestAnimationFrame(searchStep);
    }

    stopSearch() {
        this.isSearching = false;
        if (this.searchTaskId) {
            cancelAnimationFrame(this.searchTaskId);
            this.searchTaskId = null;
        }
    }
}

window.SeedSearcher = SeedSearcher;

/* ==========================================================================
   Spiral Vault Mode - Archimedean Spiral of Destructible Vault Blocks
   - Une spirale de blocs destructibles un par seconde
   - Physique déterministe à pas fixe synchronisée avec le Seed Searcher
   - Synthèse mélodique progressive (Web Audio)
   - Effet ralenti dramatique (slowmo) sur les 3 derniers blocs
   - Boucle auto fluide avec reformation de la spirale
   ========================================================================== */

class SpiralMode {
    constructor(sim) {
        this.sim = sim;
        this.id = 'spiral';
        this.name = 'Spiral Vault';
        this.ownsPhysics = true;

        // Configuration par défaut (remplacée par modesConfig.js)
        this.blockCount = 60;
        this.splitLevels = 3;
        this.rotationSpeed = 0.3;
        this.rotationDirection = 'alternate'; // 'alternate' | 'clockwise' | 'counter'
        this.paletteName = 'cyberpunk';
        this.melody = 'ascending'; // 'ascending' | 'arpeggio' | 'seeded'
        this.multiColor = true;
        this.slowmo = true;
        this.autoLoop = true;
        this.searchTolerance = 0.45;
        this.targetDuration = 60;

        // Données d'exécution
        this.blocks = [];
        this.clearedCount = 0;
        this.rotationAngle = 0;
        this.splitThresholds = [];
        this.splitsTriggered = 0;
        this.isReforming = false;
        this.reformTimer = 0;
        this.completed = false;

        // Palettes de couleurs HSL
        this.palettes = {
            neon: [320, 190, 275, 155, 225, 45],
            cyberpunk: [325, 185, 290, 175, 340, 195],
            ocean: [185, 205, 225, 245, 265, 285],
            sunset: [350, 15, 30, 45, 15, 330],
            candy: [325, 345, 285, 250, 195, 220],
            fire: [0, 15, 28, 42, 55, 10],
            rainbow: [0, 60, 120, 180, 240, 300]
        };
    }

    // Compatibilité avec le compteur UI de simulation.js (clearedCount / rings.length)
    get rings() {
        return this.blocks;
    }

    applySettings(settings) {
        if (!settings) return;
        if (settings.blockCount !== undefined) this.blockCount = settings.blockCount;
        if (settings.splitLevels !== undefined) this.splitLevels = settings.splitLevels;
        if (settings.rotationSpeed !== undefined) this.rotationSpeed = settings.rotationSpeed;
        if (settings.rotationDirection !== undefined) this.rotationDirection = settings.rotationDirection;
        if (settings.paletteName !== undefined) this.paletteName = settings.paletteName;
        if (settings.melody !== undefined) this.melody = settings.melody;
        if (settings.multiColor !== undefined) this.multiColor = !!settings.multiColor;
        if (settings.slowmo !== undefined) this.slowmo = !!settings.slowmo;
        if (settings.autoLoop !== undefined) this.autoLoop = !!settings.autoLoop;
        if (settings.targetDuration !== undefined) this.targetDuration = settings.targetDuration;
    }

    setTargetDuration(d) {
        this.targetDuration = d;
    }

    getBlockHue(index) {
        const pal = this.palettes[this.paletteName] || this.palettes.cyberpunk;
        return this.multiColor ? pal[index % pal.length] : pal[0];
    }

    setupRings(resetState = true) {
        this.initGeometry(resetState);
    }

    updateGeometry() {
        this.initGeometry(false);
    }

    initGeometry(resetState = true) {
        const count = Math.max(12, this.blockCount || 60);
        const maxRadius = Math.max(50, this.sim.boundaryRadius - 16);
        const innerRadius = Math.max(26, this.sim.boundaryRadius * 0.20);
        const totalTurns = 3.2; // Nombre de tours de spirale
        const totalAngle = Math.PI * 2 * totalTurns;

        if (resetState || this.blocks.length !== count) {
            this.blocks = [];
            this.clearedCount = 0;
            this.rotationAngle = 0;
            this.splitsTriggered = 0;
            this.isReforming = false;
            this.reformTimer = 0;
            this.completed = false;

            // Calcul des seuils de division de balle
            this.splitThresholds = [];
            if (this.splitLevels > 0) {
                for (let s = 1; s <= this.splitLevels; s++) {
                    this.splitThresholds.push(Math.floor((count * s) / (this.splitLevels + 1)));
                }
            }

            for (let i = 0; i < count; i++) {
                const progress = i / count;
                const nextProgress = (i + 1) / count;
                const theta0 = progress * totalAngle;
                const theta1 = nextProgress * totalAngle;
                const r0 = innerRadius + progress * (maxRadius - innerRadius);
                const r1 = innerRadius + nextProgress * (maxRadius - innerRadius);

                this.blocks.push({
                    index: i,
                    theta0: theta0,
                    theta1: theta1,
                    r0: r0,
                    r1: r1,
                    radius: (r0 + r1) * 0.5,
                    thickness: 12,
                    active: true,
                    opacity: 1,
                    hue: this.getBlockHue(i)
                });
            }
        } else {
            // Mise à jour douce des rayons lors d'un redimensionnement
            for (let i = 0; i < this.blocks.length; i++) {
                const progress = i / count;
                const nextProgress = (i + 1) / count;
                this.blocks[i].r0 = innerRadius + progress * (maxRadius - innerRadius);
                this.blocks[i].r1 = innerRadius + nextProgress * (maxRadius - innerRadius);
                this.blocks[i].radius = (this.blocks[i].r0 + this.blocks[i].r1) * 0.5;
                this.blocks[i].hue = this.getBlockHue(i);
            }
        }
    }

    // Direction de rotation en fonction du temps
    getRotationDirectionMultiplier(elapsedSeconds) {
        if (this.rotationDirection === 'clockwise') return 1;
        if (this.rotationDirection === 'counter') return -1;
        // Alterné : inverse de sens toutes les 10 secondes
        return Math.floor(elapsedSeconds / 10) % 2 === 0 ? 1 : -1;
    }

    // Physique pas à pas fixe appelée par simulation.js
    update(dtScale) {
        if (this.isReforming) {
            this.reformTimer += (dtScale / 60);
            if (this.reformTimer >= 1.0) {
                this.initGeometry(true);
                this.sim.initMode();
            }
            return;
        }

        // Ralenti final quand il ne reste que 3 blocs
        const remainingBlocks = this.blocks.length - this.clearedCount;
        let effectiveDtScale = dtScale;
        if (this.slowmo && remainingBlocks <= 3 && remainingBlocks > 0) {
            effectiveDtScale = dtScale * 0.35;
        }

        // Avancement de la rotation
        const dir = this.getRotationDirectionMultiplier(this.sim.elapsedSeconds);
        this.rotationAngle += dir * (this.rotationSpeed * 0.035) * effectiveDtScale;

        // Sous-pas de physique pour précision 100% sans effet tunnel
        const substeps = 8;
        const subDt = effectiveDtScale / substeps;
        const gravity = this.sim.gravity;
        const bounciness = this.sim.bounciness;
        const speedBoost = this.sim.speedBoost;
        const maxSpeed = this.sim.maxSpeed;
        const cx = this.sim.center.x;
        const cy = this.sim.center.y;
        const outerBoundary = Math.max(50, this.sim.boundaryRadius - 6);

        for (let step = 0; step < substeps; step++) {
            for (let b = this.sim.balls.length - 1; b >= 0; b--) {
                const ball = this.sim.balls[b];

                // Intégration Verlet / Euler
                ball.vy += gravity * subDt;
                ball.x += ball.vx * subDt;
                ball.y += ball.vy * subDt;

                // Clamp vitesse max
                const spd = Math.hypot(ball.vx, ball.vy);
                if (spd > maxSpeed) {
                    ball.vx = (ball.vx / spd) * maxSpeed;
                    ball.vy = (ball.vy / spd) * maxSpeed;
                }

                // Collision avec les blocs actifs de la spirale
                this.checkBallBlocksCollision(ball, cx, cy, bounciness, speedBoost, true);

                // Rebond sur le mur extérieur du conteneur
                const distCenter = Math.hypot(ball.x - cx, ball.y - cy);
                if (distCenter + ball.radius >= outerBoundary) {
                    const nx = (ball.x - cx) / Math.max(distCenter, 0.001);
                    const ny = (ball.y - cy) / Math.max(distCenter, 0.001);
                    ball.x = cx + nx * (outerBoundary - ball.radius);
                    ball.y = cy + ny * (outerBoundary - ball.radius);

                    const dot = ball.vx * nx + ball.vy * ny;
                    if (dot > 0) {
                        ball.vx = (ball.vx - 2 * dot * nx) * bounciness;
                        ball.vy = (ball.vy - 2 * dot * ny) * bounciness;
                    }
                }
            }
        }
    }

    checkBallBlocksCollision(ball, cx, cy, bounciness, speedBoost, triggerVFX = true) {
        const dx = ball.x - cx;
        const dy = ball.y - cy;
        const ballDist = Math.hypot(dx, dy);

        for (let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            if (!block.active) continue;

            // Test rapide par distance radiale
            const minR = block.r0 - block.thickness * 0.5 - ball.radius;
            const maxR = block.r1 + block.thickness * 0.5 + ball.radius;
            if (ballDist < minR || ballDist > maxR) continue;

            // Position angulaire avec rotation
            const midAngle = ((block.theta0 + block.theta1) * 0.5) + this.rotationAngle;
            const midRadius = block.radius;
            const bx = cx + Math.cos(midAngle) * midRadius;
            const by = cy + Math.sin(midAngle) * midRadius;

            // Demi-longueur de l'arc du bloc
            const arcLength = (block.theta1 - block.theta0) * midRadius;
            const halfL = Math.max(8, arcLength * 0.5);
            const halfW = block.thickness * 0.5;

            // Repère local tangent/normal
            const tangX = -Math.sin(midAngle);
            const tangY = Math.cos(midAngle);
            const normX = Math.cos(midAngle);
            const normY = Math.sin(midAngle);

            const relX = ball.x - bx;
            const relY = ball.y - by;
            const dotT = relX * tangX + relY * tangY;
            const dotN = relX * normX + relY * normY;

            // Collision Boîte englobante orientée (OBB)
            if (Math.abs(dotT) <= halfL + ball.radius && Math.abs(dotN) <= halfW + ball.radius) {
                // Direction de rebond (normale ou tangente selon le point d'impact)
                let colNx = normX;
                let colNy = normY;
                if (Math.abs(dotN) < halfW && Math.abs(dotT) > halfL) {
                    colNx = (dotT > 0 ? 1 : -1) * tangX;
                    colNy = (dotT > 0 ? 1 : -1) * tangY;
                } else {
                    colNx = (dotN > 0 ? 1 : -1) * normX;
                    colNy = (dotN > 0 ? 1 : -1) * normY;
                }

                // Repousser la balle pour éviter le chevauchement
                ball.x += colNx * 2.5;
                ball.y += colNy * 2.5;

                const dotV = ball.vx * colNx + ball.vy * colNy;
                if (dotV < 0) {
                    const bounceFactor = bounciness * speedBoost;
                    ball.vx = (ball.vx - 2 * dotV * colNx) * bounceFactor;
                    ball.vy = (ball.vy - 2 * dotV * colNy) * bounceFactor;
                }

                // Destruction du bloc
                block.active = false;
                this.clearedCount++;

                if (triggerVFX) {
                    this.onBlockDestroyed(block, bx, by);
                }
                break;
            }
        }
    }

    onBlockDestroyed(block, bx, by) {
        // Déclenchement de la note musicale via le synthétiseur Web Audio
        if (window.audioSynth) {
            let noteOffset = 0;
            if (this.melody === 'ascending') {
                noteOffset = this.clearedCount;
            } else if (this.melody === 'arpeggio') {
                noteOffset = Math.abs((this.clearedCount % 12) - 6);
            } else if (this.melody === 'seeded') {
                noteOffset = Math.floor(Math.sin(this.clearedCount * 13.37) * 8);
            }
            window.audioSynth.playBounceSound(140, noteOffset);
        }

        // Effets visuels (particules + onde de choc)
        if (this.sim.createSparks) {
            this.sim.createSparks(bx, by, `hsl(${block.hue}, 100%, 65%)`, 10);
        }
        if (this.sim.createShockwave && this.sim.enableShockwaves) {
            this.sim.createShockwave(bx, by, `hsl(${block.hue}, 100%, 65%)`);
        }

        // Paliers de division de balle
        if (this.splitLevels > 0 && this.splitsTriggered < this.splitLevels) {
            const nextThreshold = this.splitThresholds[this.splitsTriggered];
            if (nextThreshold !== undefined && this.clearedCount >= nextThreshold) {
                this.splitsTriggered++;
                if (this.sim.balls.length < 8) {
                    const originalBall = this.sim.balls[0] || { x: bx, y: by, vx: 3, vy: -3, radius: this.sim.ballRadius };
                    const newBall = new Ball(
                        originalBall.x,
                        originalBall.y,
                        -originalBall.vx * 1.05,
                        originalBall.vy * 0.95,
                        originalBall.radius,
                        block.hue
                    );
                    this.sim.balls.push(newBall);
                }
            }
        }

        // Dernier bloc détruit : Fin de la vidéo ou reformation
        if (this.clearedCount >= this.blocks.length) {
            this.completed = true;
            if (this.autoLoop) {
                this.isReforming = true;
                this.reformTimer = 0;
            } else {
                this.sim.triggerVictory();
            }
        }
    }

    render(ctx) {
        ctx.save();
        const cx = this.sim.center.x;
        const cy = this.sim.center.y;
        const outerBoundary = Math.max(50, this.sim.boundaryRadius - 6);

        // Halo et cercle de délimitation extérieure de la chambre
        ctx.beginPath();
        ctx.arc(cx, cy, outerBoundary, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 242, 254, 0.22)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Rendu des blocs de la spirale
        for (let i = 0; i < this.blocks.length; i++) {
            const block = this.blocks[i];
            if (!block.active) continue;

            const t0 = block.theta0 + this.rotationAngle;
            const t1 = block.theta1 + this.rotationAngle;
            const r0 = block.r0;
            const r1 = block.r1;
            const hw = block.thickness * 0.5;

            // Arc segment du bloc avec effet néon
            ctx.beginPath();
            ctx.arc(cx, cy, (r0 + r1) * 0.5, t0, t1);
            ctx.strokeStyle = `hsl(${block.hue}, 95%, 60%)`;
            ctx.lineWidth = block.thickness;
            ctx.lineCap = 'round';
            ctx.shadowColor = `hsl(${block.hue}, 100%, 60%)`;
            ctx.shadowBlur = 12;
            ctx.stroke();

            // Bordure lumineuse intérieure du bloc
            ctx.beginPath();
            ctx.arc(cx, cy, (r0 + r1) * 0.5, t0, t1);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Effet d'animation de reformation de la spirale en boucle
        if (this.isReforming) {
            const reformProgress = Math.min(1, this.reformTimer / 1.0);
            ctx.beginPath();
            ctx.arc(cx, cy, outerBoundary * reformProgress, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(0, 242, 254, ${1 - reformProgress})`;
            ctx.lineWidth = 6;
            ctx.stroke();
        }

        ctx.restore();
    }

    draw(ctx) {
        this.render(ctx);
    }

    handleCollision(ball) {
        // La gestion des collisions est intégrée au sous-pas fixe de update()
    }

    // =========================================================================
    // Simulation Headless ultra-rapide pour le Seed Searcher
    // Simule la spirale en mémoire sans DOM ni Audio pour trouver la seed exacte
    // =========================================================================
    evaluateSeed(seed, maxDuration = 120, prng) {
        prng.setSeed(seed);

        const count = Math.max(12, this.blockCount || 60);
        const maxRadius = Math.max(50, this.sim.boundaryRadius - 16);
        const innerRadius = Math.max(26, this.sim.boundaryRadius * 0.20);
        const totalAngle = Math.PI * 2 * 3.2;
        const outerBoundary = Math.max(50, this.sim.boundaryRadius - 6);

        // Blocs headless
        const blocks = [];
        for (let i = 0; i < count; i++) {
            const p0 = i / count;
            const p1 = (i + 1) / count;
            blocks.push({
                theta0: p0 * totalAngle,
                theta1: p1 * totalAngle,
                r0: innerRadius + p0 * (maxRadius - innerRadius),
                r1: innerRadius + p1 * (maxRadius - innerRadius),
                radius: innerRadius + ((p0 + p1) * 0.5) * (maxRadius - innerRadius),
                thickness: 12,
                active: true
            });
        }

        let cleared = 0;
        let rotAngle = 0;
        let simTime = 0;
        const subDt = (1.0 / 60) / 4; // 4 sous-pas headless par frame
        const gravity = this.sim.gravity;
        const bounciness = this.sim.bounciness;
        const speedBoost = this.sim.speedBoost;
        const maxSpeed = this.sim.maxSpeed;
        const cx = this.sim.center.x;
        const cy = this.sim.center.y;

        // Balle headless initialisée déterministement
        const innermost = blocks[0];
        const spawnOffset = innermost.radius * 0.35;
        const angle = prng.random() * Math.PI * 2;
        const spd = 4 + prng.random() * 2;

        const balls = [{
            x: cx,
            y: cy - spawnOffset,
            vx: Math.cos(angle) * spd,
            vy: Math.sin(angle) * spd,
            radius: this.sim.ballRadius
        }];

        while (simTime < maxDuration) {
            simTime += (1.0 / 60);

            // Rotation
            const dir = (this.rotationDirection === 'clockwise') ? 1 :
                        (this.rotationDirection === 'counter') ? -1 :
                        (Math.floor(simTime / 10) % 2 === 0 ? 1 : -1);
            rotAngle += dir * (this.rotationSpeed * 0.035);

            for (let s = 0; s < 4; s++) {
                for (let b = 0; b < balls.length; b++) {
                    const ball = balls[b];
                    ball.vy += gravity * subDt;
                    ball.x += ball.vx * subDt;
                    ball.y += ball.vy * subDt;

                    const curSpeed = Math.hypot(ball.vx, ball.vy);
                    if (curSpeed > maxSpeed) {
                        ball.vx = (ball.vx / curSpeed) * maxSpeed;
                        ball.vy = (ball.vy / curSpeed) * maxSpeed;
                    }

                    // Collision blocs
                    const bDist = Math.hypot(ball.x - cx, ball.y - cy);
                    for (let i = 0; i < blocks.length; i++) {
                        const block = blocks[i];
                        if (!block.active) continue;

                        if (bDist < block.r0 - 15 || bDist > block.r1 + 15) continue;

                        const midAngle = ((block.theta0 + block.theta1) * 0.5) + rotAngle;
                        const bx = cx + Math.cos(midAngle) * block.radius;
                        const by = cy + Math.sin(midAngle) * block.radius;
                        const arcL = (block.theta1 - block.theta0) * block.radius;
                        const halfL = Math.max(8, arcL * 0.5);
                        const halfW = block.thickness * 0.5;

                        const tangX = -Math.sin(midAngle);
                        const tangY = Math.cos(midAngle);
                        const normX = Math.cos(midAngle);
                        const normY = Math.sin(midAngle);

                        const dotT = (ball.x - bx) * tangX + (ball.y - by) * tangY;
                        const dotN = (ball.x - bx) * normX + (ball.y - by) * normY;

                        if (Math.abs(dotT) <= halfL + ball.radius && Math.abs(dotN) <= halfW + ball.radius) {
                            let colNx = normX;
                            let colNy = normY;
                            if (Math.abs(dotN) < halfW && Math.abs(dotT) > halfL) {
                                colNx = (dotT > 0 ? 1 : -1) * tangX;
                                colNy = (dotT > 0 ? 1 : -1) * tangY;
                            } else {
                                colNx = (dotN > 0 ? 1 : -1) * normX;
                                colNy = (dotN > 0 ? 1 : -1) * normY;
                            }

                            const dotV = ball.vx * colNx + ball.vy * colNy;
                            if (dotV < 0) {
                                ball.vx = (ball.vx - 2 * dotV * colNx) * bounciness * speedBoost;
                                ball.vy = (ball.vy - 2 * dotV * colNy) * bounciness * speedBoost;
                            }

                            block.active = false;
                            cleared++;
                            break;
                        }
                    }

                    // Collision bord extérieur
                    const distCenter = Math.hypot(ball.x - cx, ball.y - cy);
                    if (distCenter + ball.radius >= outerBoundary) {
                        const nx = (ball.x - cx) / distCenter;
                        const ny = (ball.y - cy) / distCenter;
                        ball.x = cx + nx * (outerBoundary - ball.radius);
                        ball.y = cy + ny * (outerBoundary - ball.radius);
                        const dot = ball.vx * nx + ball.vy * ny;
                        if (dot > 0) {
                            ball.vx = (ball.vx - 2 * dot * nx) * bounciness;
                            ball.vy = (ball.vy - 2 * dot * ny) * bounciness;
                        }
                    }
                }
            }

            if (cleared >= count) {
                return simTime;
            }
        }

        return maxDuration;
    }
}

window.SpiralMode = SpiralMode;

/* ==========================================================================
   Application Bootstrap & UI Event Handlers
   Connecte les panneaux gauche/droite, les réglages, et le chercheur de seed.
   ========================================================================== */

window.addEventListener('DOMContentLoaded', () => {
    const sim = new Simulation();
    window.sim = sim; // Expose for debugging

    // Unlock Web Audio on First User Gesture
    const unlockAudio = () => {
        if (window.audioSynth) {
            window.audioSynth.init();
        }
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio, { passive: true });

    // Render Loop (60 FPS normalized)
    const targetFrameTime = 1000 / 60;
    let lastFrameTime = 0;

    function animate(timestamp) {
        if (!lastFrameTime) lastFrameTime = timestamp;
        const elapsed = timestamp - lastFrameTime;

        if (elapsed >= targetFrameTime) {
            sim.update(elapsed / targetFrameTime);
            sim.draw();
            lastFrameTime = timestamp;
        }

        requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);

    // Accordions Toggle Controller
    document.querySelectorAll('.accordion-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-target');
            const targetEl = document.getElementById(targetId);
            const icon = btn.querySelector('.fa-chevron-down');
            if (targetEl) {
                targetEl.classList.toggle('open');
                if (targetEl.classList.contains('open')) {
                    icon.style.transform = 'rotate(0deg)';
                } else {
                    icon.style.transform = 'rotate(-90deg)';
                }
            }
        });
    });

    // Mobile Sidebar Toggles (Left & Right)
    const leftSidebar = document.getElementById('leftSidebar');
    const rightSidebar = document.getElementById('rightSidebar');

    const toggleLeftSidebarBtn = document.getElementById('toggleLeftSidebarBtn');
    const closeLeftSidebarBtn = document.getElementById('closeLeftSidebarBtn');
    if (toggleLeftSidebarBtn && leftSidebar) {
        toggleLeftSidebarBtn.addEventListener('click', () => {
            leftSidebar.classList.toggle('-translate-x-full');
            if (rightSidebar) rightSidebar.classList.add('translate-x-full');
        });
    }
    if (closeLeftSidebarBtn && leftSidebar) {
        closeLeftSidebarBtn.addEventListener('click', () => {
            leftSidebar.classList.add('-translate-x-full');
        });
    }

    const toggleRightSidebarBtn = document.getElementById('toggleRightSidebarBtn');
    const closeRightSidebarBtn = document.getElementById('closeRightSidebarBtn');
    if (toggleRightSidebarBtn && rightSidebar) {
        toggleRightSidebarBtn.addEventListener('click', () => {
            rightSidebar.classList.toggle('translate-x-full');
            if (leftSidebar) leftSidebar.classList.add('-translate-x-full');
        });
    }
    if (closeRightSidebarBtn && rightSidebar) {
        closeRightSidebarBtn.addEventListener('click', () => {
            rightSidebar.classList.add('translate-x-full');
        });
    }

    // Play / Pause Controls
    const playPauseBtn = document.getElementById('playPauseBtn');
    const playPauseIcon = document.getElementById('playPauseIcon');
    const playPauseText = document.getElementById('playPauseText');

    function togglePlayPause() {
        sim.paused = !sim.paused;
        if (sim.paused) {
            playPauseIcon.className = 'fa-solid fa-play text-emerald-400';
            playPauseText.textContent = 'Reprendre';
        } else {
            playPauseIcon.className = 'fa-solid fa-pause text-cyan-400';
            playPauseText.textContent = 'Pause';
        }
    }

    if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlayPause);

    // Fullscreen Toggle
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (fullscreenBtn) {
        fullscreenBtn.addEventListener('click', () => {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });
    }

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        } else if (e.key === 'r' || e.key === 'R') {
            sim.initMode();
        } else if (e.key === 'b' || e.key === 'B') {
            const innermost = sim.activeMode && sim.activeMode.rings ? sim.activeMode.rings[0] : null;
            const spawnOffset = innermost ? innermost.radius * 0.35 : 10;
            sim.spawnBall(sim.center.x, sim.center.y - spawnOffset);
        }
    });

    // Scroll-lock helper for checkbox changes
    const lockScroll = (containerId, fn) => {
        const container = document.getElementById(containerId);
        return (e) => {
            const top = container ? container.scrollTop : 0;
            fn(e);
            if (container) {
                container.scrollTop = top;
                requestAnimationFrame(() => {
                    container.scrollTop = top;
                });
            }
        };
    };

    // =========================================================================
    // Mode Settings Controls (Left Sidebar)
    // =========================================================================
    const classicRingsSlider = document.getElementById('classicRingsSlider');
    const classicRingsVal = document.getElementById('classicRingsVal');
    if (classicRingsSlider && sim.activeMode) {
        classicRingsSlider.addEventListener('input', (e) => {
            sim.activeMode.ringCount = parseInt(e.target.value, 10);
            if (classicRingsVal) classicRingsVal.textContent = sim.activeMode.ringCount;
            sim.activeMode.setupRings(true);
        });
    }

    const classicRotationSlider = document.getElementById('classicRotationSlider');
    const classicRotationValue = document.getElementById('classicRotationValue');
    if (classicRotationSlider && sim.activeMode) {
        classicRotationSlider.addEventListener('input', (e) => {
            sim.activeMode.rotationMultiplier = parseFloat(e.target.value);
            if (classicRotationValue) classicRotationValue.textContent = `${sim.activeMode.rotationMultiplier.toFixed(2)}x`;
        });
    }

    const classicDirSelect = document.getElementById('classicDirSelect');
    if (classicDirSelect && sim.activeMode) {
        classicDirSelect.addEventListener('change', (e) => {
            sim.activeMode.rotationDirection = e.target.value;
            sim.activeMode.setupRings(false);
        });
    }

    const classicGapSlider = document.getElementById('classicGapSlider');
    const classicGapVal = document.getElementById('classicGapVal');
    if (classicGapSlider && sim.activeMode) {
        classicGapSlider.addEventListener('input', (e) => {
            sim.activeMode.gapSize = Math.PI * parseFloat(e.target.value);
            const val = parseFloat(e.target.value);
            const label = val <= 0.35 ? 'Étroite' : val <= 0.6 ? 'Moyenne' : 'Large';
            if (classicGapVal) classicGapVal.textContent = label;
            sim.activeMode.updateGeometry();
        });
    }

    const classicPaletteSelect = document.getElementById('classicPaletteSelect');
    const classicPalettePreview = document.getElementById('classicPalettePreview');
    if (classicPaletteSelect && sim.activeMode) {
        classicPaletteSelect.addEventListener('change', (e) => {
            sim.activeMode.paletteName = e.target.value;
            if (classicPalettePreview) classicPalettePreview.textContent = e.target.options[e.target.selectedIndex].text;
            sim.activeMode.updateRingColors();
        });
    }

    const classicMultiColorToggle = document.getElementById('classicMultiColorToggle');
    if (classicMultiColorToggle && sim.activeMode) {
        classicMultiColorToggle.addEventListener('change', lockScroll('leftSettingsContainer', (e) => {
            sim.activeMode.multiColor = e.target.checked;
            sim.activeMode.updateRingColors();
        }));
    }

    const classicSpikeToggle = document.getElementById('classicSpikeToggle');
    const spikeGroup = document.getElementById('spikeCountGroup');
    if (classicSpikeToggle && sim.activeMode) {
        classicSpikeToggle.addEventListener('change', lockScroll('leftSettingsContainer', (e) => {
            sim.activeMode.spikesEnabled = e.target.checked;
            if (spikeGroup) spikeGroup.classList.toggle('hidden', !sim.activeMode.spikesEnabled);
        }));
    }

    const classicSpikeCountSlider = document.getElementById('classicSpikeCountSlider');
    const classicSpikeCountValue = document.getElementById('classicSpikeCountValue');
    if (classicSpikeCountSlider && sim.activeMode) {
        classicSpikeCountSlider.addEventListener('input', (e) => {
            sim.activeMode.spikeCount = parseInt(e.target.value, 10);
            if (classicSpikeCountValue) classicSpikeCountValue.textContent = sim.activeMode.spikeCount;
        });
    }

    // =========================================================================
    // Boule & Physique Controls (Left Sidebar)
    // =========================================================================
    const gravitySlider = document.getElementById('gravitySlider');
    const gravityVal = document.getElementById('gravityVal');
    if (gravitySlider) {
        gravitySlider.addEventListener('input', (e) => {
            sim.gravity = parseFloat(e.target.value);
            if (gravityVal) gravityVal.textContent = sim.gravity.toFixed(2);
        });
    }

    const bounceSlider = document.getElementById('bounceSlider');
    const bounceVal = document.getElementById('bounceVal');
    if (bounceSlider) {
        bounceSlider.addEventListener('input', (e) => {
            sim.bounciness = parseFloat(e.target.value);
            if (bounceVal) bounceVal.textContent = `${sim.bounciness.toFixed(2)}x`;
        });
    }

    const radiusSlider = document.getElementById('radiusSlider');
    const radiusVal = document.getElementById('radiusVal');
    if (radiusSlider) {
        radiusSlider.addEventListener('input', (e) => {
            sim.ballRadius = parseInt(e.target.value, 10);
            if (radiusVal) radiusVal.textContent = `${sim.ballRadius}px`;
            sim.balls.forEach(b => b.radius = sim.ballRadius);
        });
    }

    const speedBoostSlider = document.getElementById('speedBoostSlider');
    const speedBoostVal = document.getElementById('speedBoostVal');
    if (speedBoostSlider) {
        speedBoostSlider.addEventListener('input', (e) => {
            sim.speedBoost = parseFloat(e.target.value);
            const pct = Math.round((sim.speedBoost - 1.0) * 100);
            if (speedBoostVal) speedBoostVal.textContent = `+${pct}%`;
        });
    }

    // Reset to current mode defaults button
    const resetModeDefaultsBtn = document.getElementById('resetModeDefaultsBtn');
    if (resetModeDefaultsBtn) {
        resetModeDefaultsBtn.addEventListener('click', () => {
            sim.applyModeConfig('classic');

            // Sync UI sliders
            if (gravitySlider) gravitySlider.value = sim.gravity;
            if (gravityVal) gravityVal.textContent = sim.gravity.toFixed(2);

            if (bounceSlider) bounceSlider.value = sim.bounciness;
            if (bounceVal) bounceVal.textContent = `${sim.bounciness.toFixed(2)}x`;

            if (radiusSlider) radiusSlider.value = sim.ballRadius;
            if (radiusVal) radiusVal.textContent = `${sim.ballRadius}px`;

            if (speedBoostSlider) speedBoostSlider.value = sim.speedBoost;
            if (speedBoostVal) speedBoostVal.textContent = `+${Math.round((sim.speedBoost - 1) * 100)}%`;

            if (classicRingsSlider) classicRingsSlider.value = sim.activeMode.ringCount;
            if (classicRingsVal) classicRingsVal.textContent = sim.activeMode.ringCount;

            if (classicRotationSlider) classicRotationSlider.value = sim.activeMode.rotationMultiplier;
            if (classicRotationValue) classicRotationValue.textContent = `${sim.activeMode.rotationMultiplier.toFixed(2)}x`;
        });
    }

    // =========================================================================
    // Deterministic Seed & Duration Searcher Controller
    // =========================================================================
    let targetDuration = 65;
    const customDurationSlider = document.getElementById('customDurationSlider');
    const targetDurationVal = document.getElementById('targetDurationVal');
    const findSeedBtn = document.getElementById('findSeedBtn');
    const findSeedBtnText = document.getElementById('findSeedBtnText');
    const seedSearchStatusBox = document.getElementById('seedSearchStatusBox');
    const searchCountDisplay = document.getElementById('searchCountDisplay');
    const bestCandidateDisplay = document.getElementById('bestCandidateDisplay');
    const manualSeedInput = document.getElementById('manualSeedInput');
    const applySeedBtn = document.getElementById('applySeedBtn');
    const copySeedBtn = document.getElementById('copySeedBtn');

    function updateTargetDuration(newSec) {
        targetDuration = parseInt(newSec, 10);
        if (customDurationSlider) customDurationSlider.value = targetDuration;
        if (targetDurationVal) targetDurationVal.textContent = `${targetDuration}s`;
        if (findSeedBtnText && !sim.seedSearcher.isSearching) {
            findSeedBtnText.textContent = `Trouver la Seed (${targetDuration}s)`;
        }

        // Highlight preset buttons
        document.querySelectorAll('.duration-preset-btn').forEach(btn => {
            const btnSec = parseInt(btn.getAttribute('data-duration'), 10);
            if (btnSec === targetDuration) {
                btn.className = 'duration-preset-btn py-1 px-2 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 text-xs font-mono font-semibold transition';
            } else {
                btn.className = 'duration-preset-btn py-1 px-2 rounded-lg bg-zinc-800 hover:bg-cyan-500/20 hover:text-cyan-300 text-xs font-mono font-semibold border border-zinc-700 transition';
            }
        });
    }

    document.querySelectorAll('.duration-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            updateTargetDuration(btn.getAttribute('data-duration'));
        });
    });

    if (customDurationSlider) {
        customDurationSlider.addEventListener('input', (e) => {
            updateTargetDuration(e.target.value);
        });
    }

    if (findSeedBtn) {
        findSeedBtn.addEventListener('click', () => {
            if (sim.seedSearcher.isSearching) {
                sim.seedSearcher.stopSearch();
                findSeedBtnText.textContent = `Trouver la Seed (${targetDuration}s)`;
                findSeedBtn.classList.remove('searching-active');
                return;
            }

            // Start background fast-forward search
            seedSearchStatusBox.classList.remove('hidden');
            findSeedBtnText.textContent = 'Arrêter la recherche...';
            findSeedBtn.classList.add('searching-active');

            sim.seedSearcher.startSearch(
                targetDuration,
                // On progress
                (progress) => {
                    if (searchCountDisplay) searchCountDisplay.textContent = progress.testedCount.toLocaleString();
                    if (bestCandidateDisplay) {
                        bestCandidateDisplay.textContent = `Seed #${progress.bestSeed} (${progress.bestDuration.toFixed(1)}s)`;
                    }
                },
                // On exact match found
                (result) => {
                    findSeedBtnText.textContent = `Trouver la Seed (${targetDuration}s)`;
                    findSeedBtn.classList.remove('searching-active');
                    if (searchCountDisplay) searchCountDisplay.textContent = result.testedCount.toLocaleString();
                    if (bestCandidateDisplay) {
                        bestCandidateDisplay.textContent = `✓ Trouvée: Seed #${result.seed} (${result.duration.toFixed(1)}s)`;
                    }

                    // Apply the winning seed to simulation
                    if (manualSeedInput) manualSeedInput.value = result.seed;
                    sim.setSeed(result.seed);
                }
            );
        });
    }

    if (applySeedBtn && manualSeedInput) {
        applySeedBtn.addEventListener('click', () => {
            const entered = parseInt(manualSeedInput.value, 10);
            if (entered) sim.setSeed(entered);
        });
    }

    if (copySeedBtn && manualSeedInput) {
        copySeedBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(manualSeedInput.value).then(() => {
                copySeedBtn.innerHTML = '<i class="fa-solid fa-check text-emerald-400"></i>';
                setTimeout(() => {
                    copySeedBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
                }, 1200);
            });
        });
    }

    // =========================================================================
    // Right Sidebar Controls : Audio & Synthétiseur
    // =========================================================================
    const audioButton = document.getElementById('audioInitBtn');
    if (audioButton && window.audioSynth) {
        audioButton.addEventListener('click', () => {
            window.audioSynth.init();
            window.audioSynth.muted = !window.audioSynth.muted;

            if (window.audioSynth.muted) {
                audioButton.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> Mute';
                audioButton.classList.remove('bg-emerald-500/20', 'border-emerald-500/50', 'text-emerald-400');
                audioButton.classList.add('bg-red-500/20', 'border-red-500/50', 'text-red-400');
            } else {
                audioButton.innerHTML = '<i class="fa-solid fa-volume-high"></i> Audio';
                audioButton.classList.remove('bg-red-500/20', 'border-red-500/50', 'text-red-400');
                audioButton.classList.add('bg-emerald-500/20', 'border-emerald-500/50', 'text-emerald-400');
            }
        });
    }

    const instSelect = document.getElementById('instSelect');
    if (instSelect && window.audioSynth) {
        instSelect.addEventListener('change', (e) => {
            window.audioSynth.instrument = e.target.value;
        });
    }

    const scaleSelect = document.getElementById('scaleSelect');
    if (scaleSelect && window.audioSynth) {
        scaleSelect.addEventListener('change', (e) => {
            window.audioSynth.scaleName = e.target.value;
        });
    }

    const volumeSlider = document.getElementById('volumeSlider');
    const volumeValue = document.getElementById('volumeValue');
    if (volumeSlider && window.audioSynth) {
        volumeSlider.addEventListener('input', (e) => {
            window.audioSynth.volume = e.target.value / 100;
            if (volumeValue) volumeValue.textContent = `${e.target.value}%`;
        });
    }

    // =========================================================================
    // Right Sidebar Controls : Visual FX
    // =========================================================================
    const trailToggle = document.getElementById('trailToggle');
    if (trailToggle) {
        trailToggle.addEventListener('change', lockScroll('rightSettingsContainer', (e) => {
            sim.enableTrail = e.target.checked;
        }));
    }

    const particlesToggle = document.getElementById('particlesToggle');
    if (particlesToggle) {
        particlesToggle.addEventListener('change', lockScroll('rightSettingsContainer', (e) => {
            sim.enableParticles = e.target.checked;
        }));
    }

    const shockwavesToggle = document.getElementById('shockwavesToggle');
    if (shockwavesToggle) {
        shockwavesToggle.addEventListener('change', lockScroll('rightSettingsContainer', (e) => {
            sim.enableShockwaves = e.target.checked;
        }));
    }

    const shakeToggle = document.getElementById('shakeToggle');
    if (shakeToggle) {
        shakeToggle.addEventListener('change', lockScroll('rightSettingsContainer', (e) => {
            sim.enableScreenShake = e.target.checked;
        }));
    }

    const portraitToggle = document.getElementById('portraitToggle');
    const frameWrapper = document.getElementById('frameWrapper');
    if (portraitToggle && frameWrapper) {
        portraitToggle.addEventListener('change', lockScroll('rightSettingsContainer', (e) => {
            if (e.target.checked) {
                frameWrapper.classList.add('aspect-[9/16]', 'max-w-[520px]', 'phone-frame');
            } else {
                frameWrapper.classList.remove('aspect-[9/16]', 'max-w-[520px]', 'phone-frame');
            }
            setTimeout(() => sim.resize(), 100);
        }));
    }

    // =========================================================================
    // Right Sidebar : Populate Mode Profiles & Default Values Visually
    // =========================================================================
    const presetsSettings = document.getElementById('presetsSettings');
    if (presetsSettings && window.MODES_CONFIG) {
        presetsSettings.innerHTML = '';
        Object.values(window.MODES_CONFIG).forEach(mode => {
            const card = document.createElement('div');
            card.className = 'p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-1.5 text-xs';
            card.innerHTML = `
                <div class="flex items-center justify-between">
                    <span class="font-bold flex items-center gap-1.5" style="color: ${mode.color}">
                        <i class="fa-solid ${mode.icon}"></i> ${mode.name}
                    </span>
                    <span class="text-[9px] px-1.5 py-0.5 rounded font-mono ${mode.id === 'classic' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-400'}">${mode.badge}</span>
                </div>
                <p class="text-[10px] text-zinc-400 leading-tight">${mode.description}</p>
                <div class="grid grid-cols-2 gap-1 text-[10px] font-mono pt-1 border-t border-zinc-800/60 text-zinc-300">
                    <div>Rayon boule : <strong class="text-cyan-300">${mode.ballPhysics.ballRadius}px</strong></div>
                    <div>Gravité : <strong class="text-purple-300">${mode.ballPhysics.gravity}</strong></div>
                    <div>Rebond : <strong class="text-pink-300">${mode.ballPhysics.bounciness}x</strong></div>
                    <div>Gain vit. : <strong class="text-yellow-300">+${Math.round((mode.ballPhysics.speedBoost - 1) * 100)}%</strong></div>
                </div>
            `;
            presetsSettings.appendChild(card);
        });
    }

    // =========================================================================
    // Action Buttons
    // =========================================================================
    const resetBtn = document.getElementById('resetBtn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            sim.initMode();
        });
    }

    const replayBtn = document.getElementById('replayBtn');
    if (replayBtn) {
        replayBtn.addEventListener('click', () => {
            sim.initMode();
        });
    }

    const spawnBallBtn = document.getElementById('spawnBallBtn');
    if (spawnBallBtn) {
        spawnBallBtn.addEventListener('click', () => {
            const innermost = sim.activeMode && sim.activeMode.rings ? sim.activeMode.rings[0] : null;
            const spawnOffset = innermost ? innermost.radius * 0.35 : 10;
            sim.spawnBall(sim.center.x, sim.center.y - spawnOffset);
        });
    }

    // =========================================================================
    // Mode Freeze Circle : sélection, réglages et valeurs par défaut
    // =========================================================================
    const classicBox = document.getElementById('classicSettingsBox');
    const freezeBox = document.getElementById('freezeCircleSettingsBox');
    const freezeMode = () => sim.modes.freezeCircle;

    function syncPhysicsUI() {
        if (gravitySlider) gravitySlider.value = sim.gravity;
        if (gravityVal) gravityVal.textContent = sim.gravity.toFixed(2);
        if (bounceSlider) bounceSlider.value = sim.bounciness;
        if (bounceVal) bounceVal.textContent = `${sim.bounciness.toFixed(2)}x`;
        if (radiusSlider) radiusSlider.value = sim.ballRadius;
        if (radiusVal) radiusVal.textContent = `${sim.ballRadius}px`;
        if (speedBoostSlider) speedBoostSlider.value = sim.speedBoost;
        if (speedBoostVal) speedBoostVal.textContent = `+${Math.round((sim.speedBoost - 1) * 100)}%`;
    }

    const freezeGapSize = document.getElementById('freezeGapSizeSlider');
    const freezeGapSizeVal = document.getElementById('freezeGapSizeVal');
    const freezeGapAngle = document.getElementById('freezeGapAngleSlider');
    const freezeGapAngleVal = document.getElementById('freezeGapAngleVal');
    const freezePosX = document.getElementById('freezePosXSlider');
    const freezePosXVal = document.getElementById('freezePosXVal');
    const freezePosY = document.getElementById('freezePosYSlider');
    const freezePosYVal = document.getElementById('freezePosYVal');
    const freezeSpeed = document.getElementById('freezeSpeedSlider');
    const freezeSpeedVal = document.getElementById('freezeSpeedVal');

    function syncFreezeUI() {
        const m = freezeMode();
        if (freezeGapSize) freezeGapSize.value = m.gapSizeDeg;
        if (freezeGapSizeVal) freezeGapSizeVal.textContent = `${m.gapSizeDeg}°`;
        if (freezeGapAngle) freezeGapAngle.value = m.gapAngleDeg;
        if (freezeGapAngleVal) freezeGapAngleVal.textContent = `${m.gapAngleDeg}°`;
        if (freezePosX) freezePosX.value = m.positionX;
        if (freezePosXVal) freezePosXVal.textContent = `${m.positionX}%`;
        if (freezePosY) freezePosY.value = m.positionY;
        if (freezePosYVal) freezePosYVal.textContent = `${m.positionY}%`;
        if (freezeSpeed) freezeSpeed.value = m.ballSpeed;
        if (freezeSpeedVal) freezeSpeedVal.textContent = m.ballSpeed.toFixed(1);
    }

    const bindFreeze = (el, evt, fn) => {
        if (el) el.addEventListener(evt, (e) => {
            fn(e);
            sim.initMode();
        });
    };
    bindFreeze(freezeGapSize, 'input', e => {
        freezeMode().gapSizeDeg = parseFloat(e.target.value);
        freezeGapSizeVal.textContent = `${freezeMode().gapSizeDeg}°`;
    });
    bindFreeze(freezeGapAngle, 'input', e => {
        freezeMode().gapAngleDeg = parseFloat(e.target.value);
        freezeGapAngleVal.textContent = `${freezeMode().gapAngleDeg}°`;
    });
    bindFreeze(freezePosX, 'input', e => {
        freezeMode().positionX = parseFloat(e.target.value);
        freezePosXVal.textContent = `${freezeMode().positionX}%`;
    });
    bindFreeze(freezePosY, 'input', e => {
        freezeMode().positionY = parseFloat(e.target.value);
        freezePosYVal.textContent = `${freezeMode().positionY}%`;
    });
    bindFreeze(freezeSpeed, 'input', e => {
        freezeMode().ballSpeed = parseFloat(e.target.value);
        freezeSpeedVal.textContent = freezeMode().ballSpeed.toFixed(1);
    });

    function selectMode(id) {
        sim.setMode(id);
        document.querySelectorAll('#modeButtons .mode-btn').forEach(b => {
            const on = b.dataset.mode === id;
            b.classList.toggle('opacity-50', !on);
            const badge = b.querySelector(':scope > span:last-child');
            if (badge) badge.textContent = on ? 'Actif' : 'Choisir';
        });
        if (classicBox) classicBox.classList.toggle('hidden', id !== 'classic');
        if (freezeBox) freezeBox.classList.toggle('hidden', id !== 'freezeCircle');
        if (findSeedBtn) findSeedBtn.classList.remove('searching-active');
        if (seedSearchStatusBox) seedSearchStatusBox.classList.add('hidden');
        updateTargetDuration(65);
        sim.activeMode.setTargetDuration && sim.activeMode.setTargetDuration(targetDuration);
        syncPhysicsUI();
        syncFreezeUI();
        if (manualSeedInput) manualSeedInput.value = sim.seed;
    }
    document.querySelectorAll('#modeButtons .mode-btn').forEach(btn => {
        btn.addEventListener('click', () => selectMode(btn.dataset.mode));
    });

    if (resetModeDefaultsBtn) {
        const freshBtn = resetModeDefaultsBtn.cloneNode(true);
        resetModeDefaultsBtn.replaceWith(freshBtn);
        freshBtn.addEventListener('click', () => {
            sim.applyModeDefaults();
            syncPhysicsUI();
            syncFreezeUI();
            if (sim.activeModeId === 'classic') {
                if (classicRingsSlider) classicRingsSlider.value = sim.activeMode.ringCount;
                if (classicRingsVal) classicRingsVal.textContent = sim.activeMode.ringCount;
                if (classicRotationSlider) classicRotationSlider.value = sim.activeMode.rotationMultiplier;
                if (classicRotationValue) classicRotationValue.textContent = `${sim.activeMode.rotationMultiplier.toFixed(2)}x`;
            }
        });
    }
});

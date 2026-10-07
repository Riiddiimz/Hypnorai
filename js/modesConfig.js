/* ==========================================================================
   Modes Configuration & Presets
   Définit les valeurs par défaut visuelles et physiques spécifiques à chaque mode.
   D'un mode à l'autre, la boule et la physique adoptent des réglages adaptés.
   ========================================================================== */

const MODES_CONFIG = {
    classic: {
        id: 'classic',
        name: 'Classic Escape',
        badge: 'Actif',
        description: 'La balle rebondit à l\'intérieur d\'anneaux rotatifs et cherche la brèche pour s\'échapper.',
        icon: 'fa-circle-notch',
        color: '#10b981', // Emerald

        // Réglages physiques spécifiques de la boule pour ce mode
        ballPhysics: {
            gravity: 0.24,
            bounciness: 1.02,
            ballRadius: 13,
            speedBoost: 1.01,
            maxSpeed: 32
        },

        // Réglages géométriques du mode
        modeSettings: {
            ringCount: 6,
            rotationMultiplier: 0.12,
            rotationDirection: 'alternate', // 'alternate' | 'clockwise' | 'counter'
            gapSizeRatio: 0.45,
            paletteName: 'neon',
            multiColor: true,
            spikesEnabled: false,
            spikeCount: 8,
            spikeLength: 16,
            spikeWidth: 0.12
        }
    },

    spiral: {
        id: 'spiral',
        name: 'Spiral Vault',
        badge: 'Nouveau',
        description: 'Une spirale de blocs, un par seconde : la balle les détruit un à un, la mélodie se construit, le dernier bloc casse à la fin de la vidéo.',
        icon: 'fa-hurricane',
        color: '#00f2fe',

        ballPhysics: {
            gravity: 0.20,
            bounciness: 1.00,
            ballRadius: 11,
            speedBoost: 1.01,
            maxSpeed: 16
        },

        modeSettings: {
            blockCount: 60,
            splitLevels: 3,
            rotationSpeed: 0.3,
            rotationDirection: 'alternate',
            paletteName: 'cyberpunk',
            multiColor: true,
            slowmo: true,
            autoLoop: true,
            melody: 'ascending',
            targetDuration: 60
        }
    },

    infinite: {
        id: 'infinite',
        name: 'Infinite Loop',
        badge: 'Bientôt',
        description: 'Multiplication exponentielle : chaque collision génère de nouvelles balles.',
        icon: 'fa-infinity',
        color: '#00f2fe', // Cyan

        // Boules plus petites et gravité allégée pour gérer la masse
        ballPhysics: {
            gravity: 0.18,
            bounciness: 1.00,
            ballRadius: 8,
            speedBoost: 1.00,
            maxSpeed: 26
        },

        modeSettings: {
            spawnPerCollision: 1,
            maxBalls: 150,
            overflowRule: 'stop'
        }
    },

    destruction: {
        id: 'destruction',
        name: 'Destruction Rings',
        badge: 'Bientôt',
        description: 'Les parois sont composées de briques fragiles qui éclatent au contact.',
        icon: 'fa-volcano',
        color: '#f59e0b', // Amber

        // Grosse balle puissante avec rebond tonique
        ballPhysics: {
            gravity: 0.28,
            bounciness: 1.04,
            ballRadius: 15,
            speedBoost: 1.02,
            maxSpeed: 35
        },

        modeSettings: {
            ringCount: 5,
            hitsToBreak: 1,
            debrisAmount: 8
        }
    },

    accumulation: {
        id: 'accumulation',
        name: 'Spike Trap',
        badge: 'Bientôt',
        description: 'Des pics capturent les balles jusqu\'au seuil critique de l\'explosion.',
        icon: 'fa-certificate',
        color: '#ff2a85', // Pink

        // Gravité modérée, rayon standard
        ballPhysics: {
            gravity: 0.22,
            bounciness: 1.01,
            ballRadius: 12,
            speedBoost: 1.00,
            maxSpeed: 30
        },

        modeSettings: {
            spikeCount: 16,
            stickThreshold: 12,
            explosionForce: 8
        }
    }
};

window.MODES_CONFIG = MODES_CONFIG;

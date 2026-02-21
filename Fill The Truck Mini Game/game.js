// ==================== CONSTANTS ====================
const TRUCK_WIDTH = 400;
const TRUCK_HEIGHT = 600;

// Physics constants
const WORLD_GRAVITY = 0.147; // Reduced by 60% total for graceful, more visible drops
const DEFAULT_FRICTION = 0.85; // High friction prevents sliding
const DEFAULT_RESTITUTION = 0.03; // Very low bounce
const DEFAULT_DENSITY = 0.001; // Base density
const SLEEP_THRESHOLD = 60; // Frames before items sleep

// Furniture items with updated dimensions
// Items with 'sprite' property will use image sprites instead of textured shapes
const FURNITURE_ITEMS = [
    { type: 'rect', width: 75, height: 120, name: 'Fridge', density: 0.003, color: '#E8E8E8', texture: 'metal' },
    { type: 'rect', width: 70, height: 85, name: 'Washer', density: 0.003, color: '#F5F5F5', texture: 'metal' },
    { type: 'rect', width: 70, height: 85, name: 'Dryer', density: 0.003, color: '#FFFFFF', texture: 'metal' },
    { type: 'rect', width: 145, height: 65, name: 'Sofa', density: 0.0015, color: '#D4B896', texture: 'fabric_tan', sprite: 'couch' },
    { type: 'rect', width: 110, height: 65, name: 'Loveseat', density: 0.0015, color: '#D4B896', texture: 'fabric_tan', sprite: 'loveseat' },
    { type: 'rect', width: 65, height: 65, name: 'Armchair', density: 0.0012, color: '#D4B896', texture: 'fabric_tan', sprite: 'armchair' },
    { type: 'rect', width: 60, height: 60, name: 'Ottoman', density: 0.001, color: '#D4B896', texture: 'fabric_tan', sprite: 'ottoman' },
    { type: 'rect', width: 40, height: 75, name: 'Dining Chair', density: 0.001, color: '#B8956E', texture: 'wood_oak', sprite: 'dining_chair' },
    { type: 'rect', width: 60, height: 70, name: 'Nightstand', density: 0.0025, color: '#8B7355', texture: 'wood' },
    { type: 'rect', width: 140, height: 80, name: 'Vanity Dresser', density: 0.0025, color: '#8B6B4D', texture: 'wood_walnut' },
    { type: 'rect', width: 60, height: 125, name: 'Tall Chest', density: 0.0025, color: '#8B6B4D', texture: 'wood_walnut' },
    { type: 'ellipse', width: 100, height: 100, name: 'Kitchen Table', density: 0.0025, color: '#B8956E', texture: 'wood_oak' },
    { type: 'rect', width: 68, height: 30, name: 'Toolbox', density: 0.0025, color: '#CC0000', texture: 'metal' },
    { type: 'rect', width: 45, height: 30, name: 'Medium Box', density: 0.001, color: '#D2B48C', texture: 'cardboard' },
    { type: 'rect', width: 20, height: 20, name: 'Small Box', density: 0.0008, color: '#C19A6B', texture: 'cardboard' },
    { type: 'rect', width: 45, height: 45, name: 'Large Box', density: 0.0012, color: '#DEB887', texture: 'cardboard' },
    { type: 'rect', width: 55, height: 40, name: 'Storage Tote', density: 0.0015, color: '#2D2D2D', texture: 'metal', sprite: 'tote_yellow' }
];

// Brand theming configuration
const BRAND_THEMES = {
    brand1: {
        name: "MoverCo",
        truckColors: {
            doors: "#FF6B35",
            accent: "#2C3E50",
            wheels: "#2C3E50"
        },
        background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
        uiAccent: "#FF6B35"
    },
    brand2: {
        name: "QuickHaul",
        truckColors: {
            doors: "#2E86AB",
            accent: "#A23B72",
            wheels: "#1F4E5F"
        },
        background: "linear-gradient(135deg, #2E86AB 0%, #A23B72 100%)",
        uiAccent: "#2E86AB"
    }
};

let currentBrand = 'brand1'; // Default brand

// ==================== MATTER.JS SETUP ====================
const { Engine, World, Bodies, Body, Events, Sleeping } = Matter;
let engine, world;

// ==================== GAME STATE ====================
let canvas, ctx, nextCanvas, nextCtx;
let currentBody = null; // Matter.js body for current item
let nextItem = null;
let itemsPacked = 0;
let startTime = Date.now();
let timerInterval = null;
let isGameOver = false;
let lastTimestamp = 0;
let gameLoop = null;
let isPlayerControlling = true; // True when player has control

// Texture image objects for photorealistic rendering
const textureImages = {
    wood: null,
    wood_oak: null,
    wood_walnut: null,
    metal: null,
    fabric: null,
    fabric_tan: null,
    fabric_gray: null,
    cardboard: null
};
let texturesLoaded = false;

// Sprite images for furniture items
const spriteImages = {
    couch: null,
    loveseat: null,
    armchair: null,
    ottoman: null,
    dining_chair: null,
    tote_yellow: null
};
let spritesLoaded = false;

// Sprite crop regions (for sprites that need cropping)
const spriteCrops = {
    tote_yellow: { x: 295, y: 208, w: 945, h: 565 }
};

// ==================== TEXTURE LOADING ====================
function loadTextures() {
    const texturePaths = {
        wood: 'wood-texture.png',
        wood_oak: 'fill_the_truck_assets_individual/textures/wood_oak_tile.png',
        wood_walnut: 'fill_the_truck_assets_individual/textures/wood_walnut_tile.png',
        metal: 'metal-texture.png',
        fabric: 'fabric-texture.png',
        fabric_tan: 'fill_the_truck_assets_individual/textures/fabric_tan_tile.png',
        fabric_gray: 'fill_the_truck_assets_individual/textures/fabric_gray_tile.png',
        cardboard: 'cardboard-texture.png'
    };

    let loadedCount = 0;
    const totalTextures = Object.keys(texturePaths).length;

    for (let type in texturePaths) {
        const img = new Image();
        img.onload = () => {
            textureImages[type] = img;
            loadedCount++;
            if (loadedCount === totalTextures) {
                texturesLoaded = true;
                console.log('All textures loaded successfully');
            }
        };
        img.onerror = () => {
            console.error(`Failed to load texture: ${texturePaths[type]}`);
            loadedCount++;
            if (loadedCount === totalTextures) {
                console.log('Proceeding without some textures (will use fallback colors)');
            }
        };
        img.src = texturePaths[type];
    }
}

// Load furniture sprite images
function loadSprites() {
    const spritePaths = {
        couch: 'fill_the_truck_assets_individual/sprites/couch_upholstered_tan.png',
        loveseat: 'fill_the_truck_assets_individual/sprites/loveseat_upholstered_tan.png',
        armchair: 'fill_the_truck_assets_individual/sprites/armchair_upholstered_tan.png',
        ottoman: 'fill_the_truck_assets_individual/sprites/ottoman_upholstered_tan.png',
        dining_chair: 'fill_the_truck_assets_individual/sprites/dining_chair_wood_oak.png',
        tote_yellow: 'fill_the_truck_sheet_assets/sprites/Tote_Plastic_Yellow-top.png'
    };

    let loadedCount = 0;
    const totalSprites = Object.keys(spritePaths).length;

    for (let type in spritePaths) {
        const img = new Image();
        img.onload = () => {
            spriteImages[type] = img;
            loadedCount++;
            if (loadedCount === totalSprites) {
                spritesLoaded = true;
                console.log('All sprites loaded successfully');
            }
        };
        img.onerror = () => {
            console.error(`Failed to load sprite: ${spritePaths[type]}`);
            loadedCount++;
            if (loadedCount === totalSprites) {
                console.log('Proceeding without some sprites (will use fallback textures)');
            }
        };
        img.src = spritePaths[type];
    }
}

// ==================== INITIALIZATION ====================
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    nextCanvas = document.getElementById('nextPieceCanvas');
    nextCtx = nextCanvas.getContext('2d');

    canvas.width = TRUCK_WIDTH;
    canvas.height = TRUCK_HEIGHT;

    // Load photorealistic texture images and sprites
    loadTextures();
    loadSprites();

    // Initialize physics engine
    initPhysics();

    // Set up brand selector
    const brandSelect = document.getElementById('brandSelect');
    if (brandSelect) {
        brandSelect.value = currentBrand;
        brandSelect.addEventListener('change', (e) => {
            applyBrandTheme(e.target.value);
        });
    }

    // Prepare game
    nextItem = getRandomItem();

    // Set up keyboard controls
    document.addEventListener('keydown', handleKeyPress);

    // Set up mobile touch controls
    setupMobileControls();

    // Add replay button listener
    const replayBtn = document.getElementById('replayBtn');
    if (replayBtn) {
        replayBtn.addEventListener('click', restartGame);
    }

    // Start countdown (which will spawn item and start game loop)
    startCountdown();
}

// Initialize Matter.js physics engine
function initPhysics() {
    engine = Engine.create({
        enableSleeping: true,
        gravity: { x: 0, y: WORLD_GRAVITY }
    });

    world = engine.world;

    // Create static boundaries (floor and walls)
    // Floor aligned with visual brown floor (y=520-540)
    const floor = Bodies.rectangle(TRUCK_WIDTH / 2, TRUCK_HEIGHT - 70, TRUCK_WIDTH, 20, {
        isStatic: true,
        friction: 0.9,
        label: 'floor'
    });

    const leftWall = Bodies.rectangle(30, TRUCK_HEIGHT / 2, 20, TRUCK_HEIGHT, {
        isStatic: true,
        friction: 0.5,
        label: 'leftWall'
    });

    const rightWall = Bodies.rectangle(370, TRUCK_HEIGHT / 2, 20, TRUCK_HEIGHT, {
        isStatic: true,
        friction: 0.5,
        label: 'rightWall'
    });

    World.add(world, [floor, leftWall, rightWall]);
}

// ==================== PHYSICS ====================
function getRandomSpawnX(itemWidth) {
    // Calculate safe X position within truck interior (inside doors)
    const minX = 30 + itemWidth / 2 + 10; // Left door edge + padding
    const maxX = 370 - itemWidth / 2 - 10; // Right door edge - padding
    return Math.random() * (maxX - minX) + minX;
}

function createFurnitureBody(furnitureItem) {
    const { type, width, height, name, density, friction, color, texture } = furnitureItem;

    let body;
    const spawnX = getRandomSpawnX(width); // Random X position

    // Create different polygon shapes based on type
    switch(type) {
        case 'triangle':
            // Create triangle using vertices
            body = Bodies.fromVertices(
                spawnX,
                -100, // Spawn above visible area
                [
                    { x: 0, y: height },
                    { x: width / 2, y: 0 },
                    { x: width, y: height }
                ],
                {
                    isStatic: false, // Enable physics from spawn for Tetris-style falling
                    friction: friction || DEFAULT_FRICTION,
                    restitution: DEFAULT_RESTITUTION,
                    density: density || DEFAULT_DENSITY,
                    sleepThreshold: SLEEP_THRESHOLD,
                    label: type
                }
            );
            break;

        case 'trapezoid':
            // Create trapezoid (wider at bottom)
            body = Bodies.fromVertices(
                spawnX,
                -100, // Spawn above visible area
                [
                    { x: width * 0.2, y: 0 },
                    { x: width * 0.8, y: 0 },
                    { x: width, y: height },
                    { x: 0, y: height }
                ],
                {
                    isStatic: false, // Enable physics from spawn for Tetris-style falling
                    friction: friction || DEFAULT_FRICTION,
                    restitution: DEFAULT_RESTITUTION,
                    density: density || DEFAULT_DENSITY,
                    sleepThreshold: SLEEP_THRESHOLD,
                    label: type
                }
            );
            break;

        case 'L-shape':
            // Create L-shaped polygon
            body = Bodies.fromVertices(
                spawnX,
                -100, // Spawn above visible area
                [
                    { x: 0, y: 0 },
                    { x: width * 0.5, y: 0 },
                    { x: width * 0.5, y: height * 0.5 },
                    { x: width, y: height * 0.5 },
                    { x: width, y: height },
                    { x: 0, y: height }
                ],
                {
                    isStatic: false, // Enable physics from spawn for Tetris-style falling
                    friction: friction || DEFAULT_FRICTION,
                    restitution: DEFAULT_RESTITUTION,
                    density: density || DEFAULT_DENSITY,
                    sleepThreshold: SLEEP_THRESHOLD,
                    label: type
                }
            );
            break;

        case 'pentagon':
            // Create pentagon
            const sides = 5;
            const vertices = [];
            for (let i = 0; i < sides; i++) {
                const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
                vertices.push({
                    x: width / 2 + (width / 2) * Math.cos(angle),
                    y: height / 2 + (height / 2) * Math.sin(angle)
                });
            }
            body = Bodies.fromVertices(
                spawnX,
                -100, // Spawn above visible area
                vertices,
                {
                    isStatic: false, // Enable physics from spawn for Tetris-style falling
                    friction: friction || DEFAULT_FRICTION,
                    restitution: DEFAULT_RESTITUTION,
                    density: density || DEFAULT_DENSITY,
                    sleepThreshold: SLEEP_THRESHOLD,
                    label: type
                }
            );
            break;

        default:
            // Rectangle (default)
            body = Bodies.rectangle(
                spawnX,
                -100, // Spawn above visible area
                width,
                height,
                {
                    isStatic: false, // Enable physics from spawn for Tetris-style falling
                    friction: friction || DEFAULT_FRICTION,
                    restitution: DEFAULT_RESTITUTION,
                    density: density || DEFAULT_DENSITY,
                    sleepThreshold: SLEEP_THRESHOLD,
                    label: type
                }
            );
            break;
    }

    // Attach metadata for rendering (include sprite if available)
    body.furnitureData = { type, name, width, height, color, texture, sprite: furnitureItem.sprite };

    World.add(world, body);
    return body;
}

// ==================== GAME MECHANICS ====================
function getRandomItem() {
    return FURNITURE_ITEMS[Math.floor(Math.random() * FURNITURE_ITEMS.length)];
}

function spawnItem() {
    if (isGameOver) return;

    const furnitureItem = nextItem;
    nextItem = getRandomItem();

    // Create Matter.js body for new item
    currentBody = createFurnitureBody(furnitureItem);
    isPlayerControlling = true;

    // Give item controlled downward velocity for Tetris-style falling (slowed by 20%)
    Body.setVelocity(currentBody, { x: 0, y: 1.2 });

    // Clear any existing auto-drop timer to prevent multiple spawns
    if (window.autoDropTimer) {
        clearTimeout(window.autoDropTimer);
    }

    // Auto-drop timer - automatically drop item after 3.5 seconds if player doesn't
    const spawnedBody = currentBody;  // Capture the current body reference
    window.autoDropTimer = setTimeout(() => {
        if (currentBody === spawnedBody && isPlayerControlling && !isGameOver) {
            dropItem();
        }
    }, 3500);

    drawNextItem();

    // Check game over immediately when item spawns
    if (checkGameOver()) {
        endGame();
    }
}

function checkGameOver() {
    // Game over mechanic #1: Check horizontal coverage above y=0
    // Game over when >50% of horizontal space is blocked by settled items above the top frame
    //
    // Game over mechanic #2: Overflow line at y=-100 (100px above visible frame)
    // If 100% of any settled item is above this line, game over immediately.
    // This catches the case where items are stacked high on one side without
    // reaching the 50% horizontal coverage threshold.

    const stackedBodies = world.bodies.filter(b => !b.isStatic);
    const TRUCK_INTERIOR_START = 30;  // Left door width
    const TRUCK_INTERIOR_END = 370;   // Right door starts at 370
    const TRUCK_INTERIOR_WIDTH = TRUCK_INTERIOR_END - TRUCK_INTERIOR_START;  // 340px total
    const COVERAGE_THRESHOLD = TRUCK_INTERIOR_WIDTH * 0.5;  // 170px (50% coverage)
    const OVERFLOW_LINE_Y = -100;  // 100px above visible frame

    // Track which horizontal segments are blocked above y=0
    const blockedSegments = [];

    for (let body of stackedBodies) {
        // Skip the item currently being controlled/dropped - it hasn't settled yet
        if (body === currentBody) continue;

        const topY = body.bounds.min.y;     // Top edge of item
        const bottomY = body.bounds.max.y;  // Bottom edge of item
        const velocity = body.velocity.y;   // Vertical velocity

        // Check if item is settled (low velocity)
        const isSettled = Math.abs(velocity) < 0.5;

        // Mechanic #2: If entire item is above the overflow line and settled, game over
        if (isSettled && bottomY < OVERFLOW_LINE_Y) {
            return true;
        }

        // Mechanic #1: Check settled items that extend above y=0 (above visible truck frame)
        if (topY < 0 && isSettled) {
            // Item is settled and extends above the top frame
            const leftX = Math.max(body.bounds.min.x, TRUCK_INTERIOR_START);
            const rightX = Math.min(body.bounds.max.x, TRUCK_INTERIOR_END);

            // Only count if item actually overlaps with truck interior
            if (leftX < rightX) {
                blockedSegments.push({ left: leftX, right: rightX });
            }
        }
    }

    // Merge overlapping segments and calculate total blocked width
    if (blockedSegments.length === 0) {
        return false;  // No items above threshold
    }

    // Sort segments by left edge
    blockedSegments.sort((a, b) => a.left - b.left);

    // Merge overlapping segments
    const merged = [blockedSegments[0]];
    for (let i = 1; i < blockedSegments.length; i++) {
        const current = blockedSegments[i];
        const last = merged[merged.length - 1];

        if (current.left <= last.right) {
            // Overlapping or touching - merge them
            last.right = Math.max(last.right, current.right);
        } else {
            // Non-overlapping - add as new segment
            merged.push(current);
        }
    }

    // Calculate total blocked width
    let totalBlockedWidth = 0;
    for (let segment of merged) {
        totalBlockedWidth += (segment.right - segment.left);
    }

    // Game over if more than 50% of horizontal space is blocked
    return totalBlockedWidth > COVERAGE_THRESHOLD;
}

function moveItem(dx) {
    if (!currentBody || isGameOver) return;

    // Apply horizontal velocity while preserving vertical velocity
    const currentVelocity = currentBody.velocity;
    Body.setVelocity(currentBody, {
        x: dx * 0.35, // Horizontal velocity (slower, more intuitive control)
        y: currentVelocity.y  // Preserve falling velocity
    });
}

function rotateItem() {
    if (!currentBody || isGameOver) return;

    // Rotate by 90 degrees
    const currentAngle = currentBody.angle;
    const newAngle = currentAngle + Math.PI / 2;

    Body.setAngle(currentBody, newAngle);

    // Check if rotation caused boundary violation
    const bounds = currentBody.bounds;
    const width = bounds.max.x - bounds.min.x;
    const height = bounds.max.y - bounds.min.y;

    if (bounds.min.x < 30 || bounds.max.x > 370) {
        // Revert rotation
        Body.setAngle(currentBody, currentAngle);
    }
}

function dropItem() {
    if (!currentBody || isGameOver) return;

    // Can't drop if not controlling yet (shouldn't happen but safety check)
    if (!isPlayerControlling) return;

    // Clear auto-drop timer since player manually dropped
    if (window.autoDropTimer) {
        clearTimeout(window.autoDropTimer);
        window.autoDropTimer = null;
    }

    // Just speed up the fall - don't disable control
    Body.setVelocity(currentBody, {
        x: currentBody.velocity.x, // Preserve horizontal movement
        y: 5  // Increase falling speed significantly
    });

    // Player can still move/rotate while fast-falling
    isPlayerControlling = false;
    itemsPacked++;

    // Spawn next item after a short delay
    setTimeout(() => {
        if (!isGameOver) {
            spawnItem();
        }
    }, 800);
}

function autoDrop() {
    if (!currentBody || isGameOver) return;

    // Wake up the body to ensure physics is active
    Sleeping.set(currentBody, false);

    // Release control - enable physics
    Body.setStatic(currentBody, false);

    // Give item initial downward velocity
    Body.setVelocity(currentBody, { x: 0, y: 1.47 }); // Reduced by 60% total for graceful drop

    // Force the body to stay awake briefly
    currentBody.sleepThreshold = Infinity;
    setTimeout(() => {
        if (currentBody) {
            currentBody.sleepThreshold = SLEEP_THRESHOLD;
        }
    }, 100);

    isPlayerControlling = false;
    itemsPacked++;

    // Spawn next item after a short delay
    setTimeout(() => {
        if (!isGameOver) {
            spawnItem();
        }
    }, 800);
}

// ==================== UPDATE GAME STATE ====================
function update(timestamp) {
    if (isGameOver) return;

    const deltaTime = timestamp - lastTimestamp || 16.67;
    lastTimestamp = timestamp;

    // Update physics engine (always run to handle dropped items)
    Engine.update(engine, deltaTime);

    // Check for game over continuously (not just at spawn)
    if (checkGameOver()) {
        endGame();
        return;
    }

    // Update score
    updateScore();

    // Render
    draw();

    gameLoop = requestAnimationFrame(update);
}

// ==================== KEYBOARD INPUT ====================
function handleKeyPress(e) {
    if (isGameOver) return;

    switch (e.key) {
        case 'ArrowLeft':
            moveItem(-10);
            e.preventDefault();
            break;
        case 'ArrowRight':
            moveItem(10);
            e.preventDefault();
            break;
        case 'ArrowDown':
        case ' ':
            dropItem();
            e.preventDefault();
            break;
        case 'ArrowUp':
            rotateItem();
            e.preventDefault();
            break;
    }
}

// ==================== MOBILE CONTROLS ====================
function setupMobileControls() {
    const leftBtn = document.getElementById('leftBtn');
    const rightBtn = document.getElementById('rightBtn');
    const downBtn = document.getElementById('downBtn');
    const rotateBtn = document.getElementById('rotateBtn');

    if (leftBtn) {
        leftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            moveItem(-10);
        });
    }

    if (rightBtn) {
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            moveItem(10);
        });
    }

    if (downBtn) {
        downBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            dropItem();
        });
    }

    if (rotateBtn) {
        rotateBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            rotateItem();
        });
    }
}

// ==================== RENDERING ====================
function lightenColor(color, percent) {
    // Simple color lightening helper
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R<255?R<1?0:R:255)*0x10000 +
        (G<255?G<1?0:G:255)*0x100 +
        (B<255?B<1?0:B:255))
        .toString(16).slice(1);
}

function createTexture(ctx, type, baseColor, width, height, itemName) {
    // Use photorealistic texture images if loaded
    if (texturesLoaded && textureImages[type]) {
        const img = textureImages[type];

        // Calculate scale factor based on item size and texture type
        let scaleFactor = 1;

        // Adjust scale for different texture types to prevent crowding
        if (type === 'cardboard') {
            // Cardboard should scale to show 1-2 clean tile repetitions (matching wood/metal quality)
            scaleFactor = Math.max(width, height) / 190;  // Larger divisor = smaller scale = fewer repetitions
        } else if (type === 'fabric') {
            // Fabric should scale to show 2-3 full weave patterns
            scaleFactor = Math.max(width, height) / 80;
        } else if (type === 'wood') {
            // Wood grain should scale naturally
            scaleFactor = Math.max(width, height) / 150;
        } else if (type === 'metal') {
            // Metal can tile more since it has fine horizontal lines
            scaleFactor = Math.max(width, height) / 120;
        }

        // Apply scaling transformation
        ctx.save();
        ctx.scale(scaleFactor, scaleFactor);

        // Create pattern and fill
        const pattern = ctx.createPattern(img, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fill();

        ctx.restore();
    } else {
        // Fallback to solid color if textures not loaded yet
        ctx.fillStyle = baseColor;
        ctx.fill();
    }

    // Add item-specific details ON TOP of the texture
    if (itemName === 'Fridge' && type === 'metal') {
        // Door split line (vertical)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -height/2);
        ctx.lineTo(0, height/2);
        ctx.stroke();

        // Door handles
        ctx.fillStyle = 'rgba(50, 50, 50, 0.8)';
        ctx.fillRect(-width/4 - 5, 0, 3, 15);  // Left handle
        ctx.fillRect(width/4 + 2, 0, 3, 15);   // Right handle
    }

    if (itemName === 'Washer' && type === 'metal') {
        // Circular door in center (front-load washer)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, height/6, width/3, 0, Math.PI * 2);  // Large circle
        ctx.stroke();

        // Inner circle (door window)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, height/6, width/4.5, 0, Math.PI * 2);  // Smaller inner circle
        ctx.stroke();

        // Door handle (small rectangle on right side)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(width/3, height/6 - 5, 4, 10);
    }

    if (itemName === 'Dryer' && type === 'metal') {
        // Rectangular door outline
        const doorWidth = width * 0.65;
        const doorHeight = height * 0.5;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-doorWidth/2, -height/8, doorWidth, doorHeight);

        // Inner rectangle (door panel)
        const innerWidth = doorWidth * 0.9;
        const innerHeight = doorHeight * 0.9;
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-innerWidth/2, -height/8 + (doorHeight - innerHeight)/2, innerWidth, innerHeight);

        // Door handle
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(doorWidth/2 - 8, height/8, 4, 12);
    }

    // Add nightstand-specific details (single drawer)
    if (itemName === 'Nightstand' && type.startsWith('wood')) {
        // Drawer outline (bottom half of nightstand)
        const drawerHeight = height * 0.4;
        const drawerY = height * 0.15;  // Position in lower half

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(-width * 0.4, drawerY, width * 0.8, drawerHeight);

        // Drawer handle (small horizontal bar)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-8, drawerY + drawerHeight/2 - 2, 16, 4);
    }

    // Add vanity dresser details (3 columns × 3 rows of drawers)
    if (itemName === 'Vanity Dresser' && type.startsWith('wood')) {
        const drawerWidth = width / 3.3;  // 3 columns with spacing
        const drawerHeight = height / 3.5;  // 3 rows with spacing
        const spacing = 4;

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 1.5;

        // Draw 3×3 grid of drawers
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const x = -width/2 + spacing + col * (drawerWidth + spacing);
                const y = -height/2 + spacing + row * (drawerHeight + spacing);

                // Drawer outline
                ctx.strokeRect(x, y, drawerWidth, drawerHeight);

                // Drawer knob
                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.beginPath();
                ctx.arc(x + drawerWidth/2, y + drawerHeight/2, 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // Add tall chest details (5 vertical drawers)
    if (itemName === 'Tall Chest' && type.startsWith('wood')) {
        const drawerWidth = width * 0.85;
        const drawerHeight = height / 5.5;  // 5 drawers with spacing
        const spacing = 3;

        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;

        // Draw 5 stacked drawers
        for (let i = 0; i < 5; i++) {
            const y = -height/2 + spacing + i * (drawerHeight + spacing);

            // Drawer outline
            ctx.strokeRect(-drawerWidth/2, y, drawerWidth, drawerHeight);

            // Two knobs per drawer
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.beginPath();
            ctx.arc(-drawerWidth * 0.25, y + drawerHeight/2, 2.5, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(drawerWidth * 0.25, y + drawerHeight/2, 2.5, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // Add toolbox details (red mechanic's toolbox)
    if (itemName === 'Toolbox' && type === 'metal') {
        // Top handle
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, -height/2, width * 0.25, Math.PI, 0, false);  // Curved handle on top
        ctx.stroke();

        // Front latch/lock plate (center)
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(-8, 0, 16, 12);

        // Lock keyhole
        ctx.fillStyle = 'rgba(255, 200, 0, 0.8)';  // Gold keyhole
        ctx.beginPath();
        ctx.arc(0, 3, 3, 0, Math.PI * 2);
        ctx.fill();

        // Side latches
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(-width/2 + 3, -2, 10, 4);  // Left latch
        ctx.fillRect(width/2 - 13, -2, 10, 4);   // Right latch
    }

    if ((itemName === 'Sofa' || itemName === 'Loveseat') && type === 'fabric') {
        // Cushion division lines (vertical)
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.lineWidth = 2;
        const numCushions = itemName === 'Sofa' ? 3 : 2;
        for (let i = 1; i < numCushions; i++) {
            const x = -width/2 + (width/numCushions) * i;
            ctx.beginPath();
            ctx.moveTo(x, -height/2);
            ctx.lineTo(x, height/2);
            ctx.stroke();
        }
    }

    // Add packing tape to cardboard boxes
    if (type === 'cardboard') {
        const tapeWidth = width * 0.05;  // Tape is 5% of box width
        const tapeHeight = height * 0.20;  // Tape wraps 20% down from top

        // Dark brown packing tape - horizontal strip on top
        ctx.fillStyle = 'rgba(101, 67, 33, 0.85)';  // Dark brown tape color
        ctx.fillRect(-tapeWidth/2, -height/2, tapeWidth, 3);  // Top edge

        // Tape going down the front face (visible portion)
        ctx.fillRect(-tapeWidth/2, -height/2, tapeWidth, tapeHeight);

        // Subtle tape shine/highlight
        ctx.fillStyle = 'rgba(139, 90, 43, 0.4)';
        ctx.fillRect(-tapeWidth/2 + 1, -height/2 + 1, tapeWidth - 2, 2);
    }
}

function drawTruckFrame(context) {
    const theme = BRAND_THEMES[currentBrand];
    const doorWidth = 30; // Width of each door
    const doorColor = theme.truckColors.doors;
    const accentColor = theme.truckColors.accent;
    const wheelColor = theme.truckColors.wheels;

    // Undercarriage fill (behind everything - fills gaps)
    context.fillStyle = '#444444';
    context.fillRect(0, 540, TRUCK_WIDTH, TRUCK_HEIGHT - 540);

    // Frame extension (fills door-to-wheel gap)
    context.fillStyle = '#333333';
    context.fillRect(0, 541, 30, 600 - 541);
    context.fillRect(TRUCK_WIDTH - 30, 541, 30, 600 - 541);

    // Left door
    context.fillStyle = doorColor;
    context.fillRect(0, 0, doorWidth, 541);

    // Door panel lines (left door)
    context.strokeStyle = accentColor;
    context.lineWidth = 2;
    context.strokeRect(5, 20, doorWidth - 10, 541 - 40);

    // Hinges on left door
    for (let i = 0; i < 3; i++) {
        context.fillStyle = accentColor;
        const hingeY = 100 + i * 200;
        context.fillRect(2, hingeY, 6, 30);
        context.fillRect(doorWidth - 8, hingeY, 6, 30);
    }

    // Right door
    context.fillStyle = doorColor;
    context.fillRect(TRUCK_WIDTH - doorWidth, 0, doorWidth, 541);

    // Door panel lines (right door)
    context.strokeStyle = accentColor;
    context.lineWidth = 2;
    context.strokeRect(TRUCK_WIDTH - doorWidth + 5, 20, doorWidth - 10, 541 - 40);

    // Hinges on right door
    for (let i = 0; i < 3; i++) {
        context.fillStyle = accentColor;
        const hingeY = 100 + i * 200;
        context.fillRect(TRUCK_WIDTH - doorWidth + 2, hingeY, 6, 30);
        context.fillRect(TRUCK_WIDTH - 8, hingeY, 6, 30);
    }

    // Cargo floor
    context.fillStyle = '#C9A76A'; // Wood tone
    context.fillRect(0, 520, TRUCK_WIDTH, 20);

    // Tail lights
    const tailLightY = 463;
    const tailLightHeight = 15;
    const tailLightWidth = 19;

    // Left tail light
    context.fillStyle = '#8B0000'; // Dark red
    context.fillRect(5, tailLightY, tailLightWidth, tailLightHeight);
    context.fillStyle = '#FF4500'; // Bright red (inner)
    context.fillRect(8, tailLightY + 3, tailLightWidth - 6, tailLightHeight - 6);

    // Left amber light
    context.fillStyle = '#8B4500'; // Dark amber
    context.fillRect(5, tailLightY + 18, tailLightWidth, 12);
    context.fillStyle = '#FFA500'; // Bright amber
    context.fillRect(8, tailLightY + 21, tailLightWidth - 6, 6);

    // Right tail light
    context.fillStyle = '#8B0000';
    context.fillRect(TRUCK_WIDTH - tailLightWidth - 5, tailLightY, tailLightWidth, tailLightHeight);
    context.fillStyle = '#FF4500';
    context.fillRect(TRUCK_WIDTH - tailLightWidth - 2, tailLightY + 3, tailLightWidth - 6, tailLightHeight - 6);

    // Right amber light
    context.fillStyle = '#8B4500';
    context.fillRect(TRUCK_WIDTH - tailLightWidth - 5, tailLightY + 18, tailLightWidth, 12);
    context.fillStyle = '#FFA500';
    context.fillRect(TRUCK_WIDTH - tailLightWidth - 2, tailLightY + 21, tailLightWidth - 6, 6);

    // Wheels
    const wheelWidth = 40;
    const wheelHeight = 75;
    const wheelY = 581;

    const wheelPositions = [
        { x: 40, y: wheelY },   // Left outer
        { x: 90, y: wheelY },   // Left inner
        { x: 315, y: wheelY },  // Right inner
        { x: 362, y: wheelY }   // Right outer
    ];

    for (let wheel of wheelPositions) {
        context.save();
        context.translate(wheel.x, wheel.y);

        // Tire rubber (dark black) - ROUNDED RECTANGLE for rear view
        const cornerRadius = 8;
        context.fillStyle = '#1a1a1a';
        context.beginPath();
        context.roundRect(-wheelWidth/2, -wheelHeight/2, wheelWidth, wheelHeight, cornerRadius);
        context.fill();

        // Wheel rim/hub (brand color) - smaller rounded rectangle
        const rimWidth = wheelWidth * 0.6;
        const rimHeight = wheelHeight * 0.7;
        const rimRadius = 5;
        context.fillStyle = wheelColor;
        context.beginPath();
        context.roundRect(-rimWidth/2, -rimHeight/2, rimWidth, rimHeight, rimRadius);
        context.fill();

        // Rim details (horizontal line in center for tread pattern)
        context.strokeStyle = '#444';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(-wheelWidth/2 + 2, 0);
        context.lineTo(wheelWidth/2 - 2, 0);
        context.stroke();

        // Tire tread outline (rounded rectangle)
        context.strokeStyle = '#000';
        context.lineWidth = 2;
        context.beginPath();
        context.roundRect(-wheelWidth/2, -wheelHeight/2, wheelWidth, wheelHeight, cornerRadius);
        context.stroke();

        context.restore();
    }

    // Step bar (on top of wheels)
    const stepBarY = 564;
    const stepBarHeight = 19;
    const stepBarInset = 3;

    // Step bar base (gray metal)
    context.fillStyle = '#888888';
    context.fillRect(stepBarInset, stepBarY, TRUCK_WIDTH - (stepBarInset * 2), stepBarHeight);

    // Step bar highlight (metallic top edge)
    context.fillStyle = '#AAAAAA';
    context.fillRect(stepBarInset, stepBarY, TRUCK_WIDTH - (stepBarInset * 2), 2);

    // Step bar shadow (darker bottom edge)
    context.fillStyle = '#555555';
    context.fillRect(stepBarInset, stepBarY + stepBarHeight - 2, TRUCK_WIDTH - (stepBarInset * 2), 2);
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, TRUCK_WIDTH, TRUCK_HEIGHT);

    // Draw truck frame (doors, tail lights)
    drawTruckFrame(ctx);

    // Add clipping region to constrain items to truck interior (x=30 to x=370)
    ctx.save();
    ctx.beginPath();
    ctx.rect(30, 0, 340, TRUCK_HEIGHT);  // Clip to interior only
    ctx.clip();

    // Draw all physics bodies (now constrained by clipping)
    const bodies = world.bodies.filter(b => !b.isStatic);

    for (let body of bodies) {
        if (body.furnitureData) {
            drawFurnitureBody(ctx, body);
        }
    }

    // Remove clipping region
    ctx.restore();
}

function drawFurnitureBody(context, body) {
    const { type, name, width, height, color, texture, sprite } = body.furnitureData;
    const { x, y } = body.position;
    const angle = body.angle;

    context.save();

    // Translate to body position and apply rotation
    context.translate(x, y);
    context.rotate(angle);

    // Opacity for sleeping items
    if (body.isSleeping) {
        context.globalAlpha = 0.7;
    }

    // Check if this item has a sprite and if sprites are loaded
    if (sprite && spritesLoaded && spriteImages[sprite]) {
        // Draw the sprite image scaled to fit the physics body dimensions
        const img = spriteImages[sprite];

        // Check if this sprite has a crop region defined
        if (spriteCrops[sprite]) {
            const crop = spriteCrops[sprite];
            // Draw cropped region of sprite
            context.drawImage(img, crop.x, crop.y, crop.w, crop.h, -width / 2, -height / 2, width, height);
        } else {
            // Draw full sprite
            context.drawImage(img, -width / 2, -height / 2, width, height);
        }
    } else {
        // Fallback to textured shape rendering
        context.beginPath();

        // Draw shape path
        if (type === 'rect') {
            context.rect(-width / 2, -height / 2, width, height);
        } else if (type === 'ellipse') {
            // Draw ellipse/oval shape
            context.ellipse(0, 0, width / 2, height / 2, 0, 0, Math.PI * 2);
        } else if (body.vertices && body.vertices.length > 0) {
            // Draw polygon using vertices
            const firstVertex = body.vertices[0];
            context.moveTo(firstVertex.x - x, firstVertex.y - y);

            for (let i = 1; i < body.vertices.length; i++) {
                const vertex = body.vertices[i];
                context.lineTo(vertex.x - x, vertex.y - y);
            }

            context.closePath();
        } else {
            // Fallback to rectangle
            context.rect(-width / 2, -height / 2, width, height);
        }

        // Apply texture instead of simple fill
        createTexture(context, texture || 'default', color || '#999', width, height, name);

        // Stroke outline
        context.strokeStyle = 'rgba(0, 0, 0, 0.6)';
        context.lineWidth = 2;
        context.stroke();
    }

    context.restore();
}


// Draw next item preview with textures and details matching the falling item
function drawNextItem() {
    nextCtx.fillStyle = '#f0f0f0';
    nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);

    if (nextItem) {
        const scale = Math.min(100 / nextItem.width, 80 / nextItem.height);
        const w = nextItem.width * scale;
        const h = nextItem.height * scale;

        const centerX = nextCanvas.width / 2;
        const centerY = (nextCanvas.height - 20) / 2;

        const { type, name, color, texture, sprite } = nextItem;

        nextCtx.save();
        nextCtx.translate(centerX, centerY);

        // Check if this item has a sprite and if sprites are loaded
        if (sprite && spritesLoaded && spriteImages[sprite]) {
            // Draw the sprite image scaled to fit the preview
            const img = spriteImages[sprite];

            // Check if this sprite has a crop region defined
            if (spriteCrops[sprite]) {
                const crop = spriteCrops[sprite];
                // Draw cropped region of sprite
                nextCtx.drawImage(img, crop.x, crop.y, crop.w, crop.h, -w / 2, -h / 2, w, h);
            } else {
                // Draw full sprite
                nextCtx.drawImage(img, -w / 2, -h / 2, w, h);
            }
        } else {
            // Fallback to textured shape rendering
            nextCtx.beginPath();
            switch(type) {
                case 'ellipse':
                    // Draw ellipse/oval shape
                    nextCtx.ellipse(0, 0, w / 2, h / 2, 0, 0, Math.PI * 2);
                    break;

                case 'triangle':
                    nextCtx.moveTo(-w/2, h/2);
                    nextCtx.lineTo(0, -h/2);
                    nextCtx.lineTo(w/2, h/2);
                    break;

                case 'trapezoid':
                    nextCtx.moveTo(-w*0.3, -h/2);
                    nextCtx.lineTo(w*0.3, -h/2);
                    nextCtx.lineTo(w/2, h/2);
                    nextCtx.lineTo(-w/2, h/2);
                    break;

                case 'L-shape':
                    nextCtx.moveTo(-w/2, -h/2);
                    nextCtx.lineTo(0, -h/2);
                    nextCtx.lineTo(0, 0);
                    nextCtx.lineTo(w/2, 0);
                    nextCtx.lineTo(w/2, h/2);
                    nextCtx.lineTo(-w/2, h/2);
                    break;

                case 'pentagon':
                    for (let i = 0; i < 5; i++) {
                        const angle = (i * 2 * Math.PI / 5) - Math.PI / 2;
                        const px = (w / 2) * Math.cos(angle);
                        const py = (h / 2) * Math.sin(angle);
                        if (i === 0) nextCtx.moveTo(px, py);
                        else nextCtx.lineTo(px, py);
                    }
                    break;

                default:
                    // Rectangle
                    nextCtx.rect(-w/2, -h/2, w, h);
                    break;
            }
            nextCtx.closePath();

            // Apply texture using the same function as the game
            createTexture(nextCtx, texture || 'default', color || '#999', w, h, name);

            // Stroke outline
            nextCtx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
            nextCtx.lineWidth = 2;
            nextCtx.stroke();
        }

        nextCtx.restore();

        // Draw item name
        nextCtx.fillStyle = '#333';
        nextCtx.font = 'bold 12px Arial';
        nextCtx.textAlign = 'center';
        nextCtx.fillText(name, nextCanvas.width / 2, nextCanvas.height - 8);
    }
}

// ==================== UTILITIES ====================
function updateScore() {
    const bodies = world.bodies.filter(b => !b.isStatic && b.furnitureData);
    let filledArea = 0;

    for (let body of bodies) {
        filledArea += body.furnitureData.width * body.furnitureData.height;
    }

    const totalArea = TRUCK_WIDTH * TRUCK_HEIGHT;
    const efficiency = Math.round((filledArea / totalArea) * 100);

    document.getElementById('efficiency').textContent = efficiency + '%';
    document.getElementById('items').textContent = bodies.length;
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').textContent = elapsed + 's';

    const messageEl = document.getElementById('message');
    if (elapsed === 30) {
        messageEl.textContent = 'Great job! Keep packing efficiently! 📦';
        messageEl.style.display = 'block';
        setTimeout(() => messageEl.style.display = 'none', 3000);
    } else if (elapsed === 60) {
        messageEl.textContent = 'Almost there! A rep will call you soon! 📞';
        messageEl.style.display = 'block';
        setTimeout(() => messageEl.style.display = 'none', 3000);
    } else if (elapsed === 90) {
        messageEl.textContent = 'Excellent packing! We\'ll be in touch shortly! ✨';
        messageEl.style.display = 'block';
    }
}

function endGame() {
    isGameOver = true;
    cancelAnimationFrame(gameLoop);
    clearInterval(timerInterval);

    // Get final stats
    const efficiency = document.getElementById('efficiency').textContent;

    // Show game over overlay
    const overlay = document.getElementById('gameOverOverlay');
    document.getElementById('finalEfficiency').textContent = efficiency;
    document.getElementById('finalItems').textContent = itemsPacked;
    overlay.style.display = 'flex';

    // Hide old message div (if it exists)
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
}

function startCountdown() {
    const overlay = document.getElementById('countdownOverlay');
    const numberEl = document.getElementById('countdownNumber');

    overlay.style.display = 'flex';

    let count = 3;
    numberEl.textContent = count;

    const countdownInterval = setInterval(() => {
        count--;

        if (count > 0) {
            numberEl.textContent = count;
            // Restart animation by removing and re-adding class
            numberEl.style.animation = 'none';
            setTimeout(() => {
                numberEl.style.animation = 'countdown-pulse 1s ease-in-out';
            }, 10);
        } else if (count === 0) {
            numberEl.textContent = 'GO!';
            numberEl.style.animation = 'none';
            setTimeout(() => {
                numberEl.style.animation = 'countdown-pulse 1s ease-in-out';
            }, 10);
        } else {
            // Countdown complete - hide overlay and start game
            clearInterval(countdownInterval);
            overlay.style.display = 'none';

            // Start actual gameplay
            spawnItem();
            gameLoop = requestAnimationFrame(update);
            timerInterval = setInterval(updateTimer, 1000);
        }
    }, 1000);  // 1 second intervals
}

function restartGame() {
    // Hide game over overlay
    const overlay = document.getElementById('gameOverOverlay');
    overlay.style.display = 'none';

    // Clear all physics bodies except walls
    const bodiesToRemove = world.bodies.filter(b => !b.isStatic);
    World.remove(world, bodiesToRemove);

    // Reset game state variables
    currentBody = null;
    nextItem = null;
    itemsPacked = 0;
    isGameOver = false;
    isPlayerControlling = true;
    startTime = Date.now();

    // Reset UI
    document.getElementById('efficiency').textContent = '0%';
    document.getElementById('items').textContent = '0';
    document.getElementById('timer').textContent = '0s';

    // Clear next item preview
    nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);

    // Prepare next item
    nextItem = getRandomItem();

    // Start countdown (which will spawn item and start game loop)
    startCountdown();
}

// ==================== BRAND THEMING ====================
function applyBrandTheme(brandKey) {
    const theme = BRAND_THEMES[brandKey];
    if (!theme) return;

    const root = document.documentElement;

    // Update CSS custom properties
    root.style.setProperty('--brand-primary', theme.uiAccent);
    root.style.setProperty('--brand-bg', theme.background);
    root.style.setProperty('--truck-doors', theme.truckColors.doors);
    root.style.setProperty('--truck-accent', theme.truckColors.accent);
    root.style.setProperty('--truck-wheels', theme.truckColors.wheels);

    currentBrand = brandKey;

    // Save to localStorage
    localStorage.setItem('selectedBrand', brandKey);

    // Redraw if game is active
    if (ctx) {
        draw();
    }
}

function loadBrandPreference() {
    // Check URL parameter first
    const urlParams = new URLSearchParams(window.location.search);
    const brandParam = urlParams.get('brand');

    if (brandParam && BRAND_THEMES[brandParam]) {
        applyBrandTheme(brandParam);
        return;
    }

    // Fall back to localStorage
    const saved = localStorage.getItem('selectedBrand');
    if (saved && BRAND_THEMES[saved]) {
        applyBrandTheme(saved);
        return;
    }

    // Use default
    applyBrandTheme('brand1');
}

// ==================== STARTUP ====================
window.addEventListener('load', () => {
    loadBrandPreference();
    init();
});

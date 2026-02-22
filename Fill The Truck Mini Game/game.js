// ==================== CONSTANTS ====================
const TRUCK_WIDTH = 400;
const TRUCK_HEIGHT = 600;

// Physics constants
const WORLD_GRAVITY = 0.147; // Reduced by 60% total for graceful, more visible drops
const DEFAULT_FRICTION = 0.85; // High friction prevents sliding
const DEFAULT_RESTITUTION = 0.03; // Very low bounce
const DEFAULT_DENSITY = 0.001; // Base density
const SLEEP_THRESHOLD = 60; // Frames before items sleep
const SPAWN_Y = -40; // Spawn just above visible area for quick entry

// Furniture items — all sprite-based
// Dimensions are game-world pixels (truck interior is 340px wide)
// Density controls weight: heavy appliances ~0.003, furniture ~0.0015-0.002, light items ~0.0008-0.001
const FURNITURE_ITEMS = [
    // Heavy appliances
    { type: 'rect', width: 85, height: 135, name: 'Fridge', density: 0.003, sprite: 'fridge' },
    { type: 'rect', width: 80, height: 97, name: 'Washer', density: 0.003, sprite: 'washer' },
    { type: 'rect', width: 80, height: 97, name: 'Dryer', density: 0.003, sprite: 'dryer' },
    { type: 'rect', width: 70, height: 45, name: 'Microwave', density: 0.0015, sprite: 'microwave' },
    // Large furniture
    { type: 'rect', width: 106, height: 91, name: 'Upright Piano', density: 0.003, sprite: 'piano' },
    { type: 'rect', width: 140, height: 78, name: 'Long Dresser', density: 0.002, sprite: 'long_dresser' },
    { type: 'rect', width: 65, height: 95, name: 'Chest of Drawers', density: 0.002, sprite: 'chest_of_drawers' },
    { type: 'rect', width: 45, height: 125, name: 'Grandfather Clock', density: 0.0025, sprite: 'grandfather_clock' },
    { type: 'polygon', width: 130, height: 71, name: 'Dining Table', density: 0.002, sprite: 'dining_table',
        vertices: [[-0.5,-0.5],[0.5,-0.5],[0.4,0.5],[-0.4,0.5]] },
    { type: 'polygon', width: 85, height: 60, name: 'Coffee Table', density: 0.0015, sprite: 'coffee_table',
        vertices: [[-0.5,-0.5],[0.5,-0.5],[0.45,0.0],[0.3,0.5],[-0.3,0.5],[-0.45,0.0]] },
    // Medium furniture
    { type: 'rect', width: 55, height: 52, name: 'Nightstand', density: 0.0015, sprite: 'nightstand' },
    { type: 'polygon', width: 38, height: 65, name: 'Bar Stool', density: 0.0008, sprite: 'bar_stool',
        vertices: [[-0.4,-0.5],[0.4,-0.5],[0.3,-0.25],[0.45,0.5],[0.15,0.5],[0.0,0.0],[-0.15,0.5],[-0.45,0.5],[-0.3,-0.25]] },
    { type: 'rect', width: 50, height: 85, name: 'Mirror', density: 0.001, sprite: 'mirror' },
    { type: 'polygon', width: 80, height: 60, name: 'TV', density: 0.001, sprite: 'tv',
        vertices: [[-0.5,-0.5],[0.5,-0.5],[0.5,0.15],[0.2,0.15],[0.25,0.5],[-0.25,0.5],[-0.2,0.15],[-0.5,0.15]] },
    { type: 'polygon', width: 40, height: 125, name: 'Floor Lamp', density: 0.0008, sprite: 'floor_lamp',
        vertices: [[-0.5,-0.5],[0.5,-0.5],[0.3,-0.32],[0.15,-0.32],[0.15,0.38],[0.3,0.5],[-0.3,0.5],[-0.15,0.38],[-0.15,-0.32],[-0.3,-0.32]] },
    // Outdoor / bulky
    { type: 'polygon', width: 90, height: 77, name: 'BBQ Pit', density: 0.0015, sprite: 'bbq',
        vertices: [[-0.5,-0.5],[0.5,-0.5],[0.5,0.05],[0.35,0.05],[0.3,0.5],[0.1,0.5],[0.1,0.15],[-0.1,0.15],[-0.1,0.5],[-0.3,0.5],[-0.35,0.05],[-0.5,0.05]] },
    { type: 'polygon', width: 100, height: 60, name: 'Bicycle', density: 0.001, sprite: 'bicycle',
        vertices: [[-0.3,-0.5],[0.35,-0.5],[0.5,-0.1],[0.45,0.5],[0.15,0.3],[-0.15,0.3],[-0.45,0.5],[-0.5,-0.1]] },
    { type: 'polygon', width: 75, height: 56, name: 'Lawnmower', density: 0.0015, sprite: 'lawnmower',
        vertices: [[-0.3,-0.5],[0.2,-0.5],[0.5,0.0],[0.5,0.5],[-0.5,0.5],[-0.5,0.0]] },
    { type: 'polygon', width: 75, height: 56, name: 'Wagon', density: 0.001, sprite: 'wagon',
        vertices: [[-0.5,-0.5],[-0.3,-0.5],[-0.3,-0.1],[0.5,-0.1],[0.5,0.5],[-0.5,0.5]] },
    // Small items
    { type: 'polygon', width: 45, height: 60, name: 'Plant', density: 0.001, sprite: 'plant',
        vertices: [[0.0,-0.5],[0.5,-0.1],[0.35,0.1],[0.25,0.1],[0.25,0.5],[-0.25,0.5],[-0.25,0.1],[-0.35,0.1],[-0.5,-0.1]] },
    { type: 'rect', width: 45, height: 70, name: 'Trash Can', density: 0.001, sprite: 'trashcan' },
    { type: 'rect', width: 51, height: 87, name: 'Vacuum', density: 0.001, sprite: 'vacuum' },
    { type: 'polygon', width: 38, height: 90, name: 'Guitar', density: 0.0008, sprite: 'guitar',
        vertices: [[-0.15,-0.5],[0.15,-0.5],[0.12,-0.1],[0.5,0.15],[0.4,0.5],[-0.4,0.5],[-0.5,0.15],[-0.12,-0.1]] },
    // Boxes & small items
    { type: 'rect', width: 65, height: 50, name: 'Large Carton', density: 0.001, sprite: 'large_carton' },
    { type: 'rect', width: 50, height: 50, name: 'Medium Carton', density: 0.001, sprite: 'medium_carton' },
    { type: 'rect', width: 45, height: 35, name: 'Small Carton', density: 0.0008, sprite: 'small_carton' },
    { type: 'rect', width: 50, height: 40, name: 'Book Box', density: 0.0015, sprite: 'book_box' },
    { type: 'rect', width: 65, height: 43, name: 'Toolbox', density: 0.001, sprite: 'toolbox' },
    { type: 'rect', width: 85, height: 55, name: 'Storage Tote', density: 0.001, sprite: 'tote' },
    // Seating furniture
    { type: 'rect', width: 80, height: 72, name: 'Armchair', density: 0.0015, sprite: 'armchair' },
    { type: 'rect', width: 155, height: 62, name: 'Couch', density: 0.002, sprite: 'couch' },
    { type: 'rect', width: 45, height: 80, name: 'Dining Chair', density: 0.001, sprite: 'dining_chair' },
    { type: 'rect', width: 120, height: 60, name: 'Loveseat', density: 0.0018, sprite: 'loveseat' },
    { type: 'rect', width: 50, height: 45, name: 'Ottoman', density: 0.001, sprite: 'ottoman' },
];

// Brand theming configuration
const BRAND_THEMES = {
    americanMover: {
        name: "American Mover",
        truckColors: {
            doors: "#B22234",
            accent: "#F5F5F5",
            wheels: "#3C3B6E"
        },
        background: "linear-gradient(135deg, #3C3B6E 0%, #B22234 100%)",
        uiAccent: "#B22234"
    },
    moverCo: {
        name: "MoverCo",
        truckColors: {
            doors: "#FF6B35",
            accent: "#2C3E50",
            wheels: "#2C3E50"
        },
        background: "linear-gradient(135deg, #FF6B35 0%, #F7931E 100%)",
        uiAccent: "#FF6B35"
    },
    quickHaul: {
        name: "QuickHaul",
        truckColors: {
            doors: "#2E86AB",
            accent: "#A23B72",
            wheels: "#1F4E5F"
        },
        background: "linear-gradient(135deg, #2E86AB 0%, #A23B72 100%)",
        uiAccent: "#2E86AB"
    },
    budgetHauler: {
        name: "Budget Hauler",
        truckColors: {
            doors: "#FFD100",
            accent: "#006B3F",
            wheels: "#004D2C"
        },
        background: "linear-gradient(135deg, #FFD100 0%, #006B3F 100%)",
        uiAccent: "#006B3F"
    },
    premiumLine: {
        name: "Premium Line",
        truckColors: {
            doors: "#1B2A4A",
            accent: "#C5A55A",
            wheels: "#0F1A2E"
        },
        background: "linear-gradient(135deg, #1B2A4A 0%, #C5A55A 100%)",
        uiAccent: "#1B2A4A"
    },
    safeStore: {
        name: "SafeStore",
        truckColors: {
            doors: "#FF6600",
            accent: "#004C97",
            wheels: "#003060"
        },
        background: "linear-gradient(135deg, #FF6600 0%, #004C97 100%)",
        uiAccent: "#FF6600"
    },
    ecoMove: {
        name: "EcoMove",
        truckColors: {
            doors: "#4CAF50",
            accent: "#E8E8E8",
            wheels: "#2E7D32"
        },
        background: "linear-gradient(135deg, #4CAF50 0%, #81C784 100%)",
        uiAccent: "#4CAF50"
    },
    ironBox: {
        name: "Iron Box",
        truckColors: {
            doors: "#444444",
            accent: "#CC0000",
            wheels: "#222222"
        },
        background: "linear-gradient(135deg, #444444 0%, #CC0000 100%)",
        uiAccent: "#CC0000"
    }
};

let currentBrand = 'americanMover'; // Default brand

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

// Sprite images for all furniture items
const spriteImages = {};
let spritesLoaded = false;

// ==================== SPRITE LOADING ====================
function loadSprites() {
    const spritePaths = {
        fridge: 'fill_the_truck_assets_individual/sprites/Fridge.png',
        washer: 'fill_the_truck_assets_individual/sprites/Washer.png',
        dryer: 'fill_the_truck_assets_individual/sprites/Dryer.png',
        microwave: 'fill_the_truck_assets_individual/sprites/Microwave.png',
        piano: 'fill_the_truck_assets_individual/sprites/Upright Piano.png',
        long_dresser: 'fill_the_truck_assets_individual/sprites/Long Dresser.png',
        chest_of_drawers: 'fill_the_truck_assets_individual/sprites/Chest of Drawers.png',
        grandfather_clock: 'fill_the_truck_assets_individual/sprites/Grandfather Clock.png',
        dining_table: 'fill_the_truck_assets_individual/sprites/rectangle dining table.png',
        coffee_table: 'fill_the_truck_assets_individual/sprites/Round Coffee Table.png',
        nightstand: 'fill_the_truck_assets_individual/sprites/NightStand.png',
        bar_stool: 'fill_the_truck_assets_individual/sprites/Bar Stool.png',
        mirror: 'fill_the_truck_assets_individual/sprites/Mirror.png',
        tv: 'fill_the_truck_assets_individual/sprites/TV.png',
        floor_lamp: 'fill_the_truck_assets_individual/sprites/Floor Lamp.png',
        bbq: 'fill_the_truck_assets_individual/sprites/BBQ Pit.png',
        bicycle: 'fill_the_truck_assets_individual/sprites/Bicycle.png',
        lawnmower: 'fill_the_truck_assets_individual/sprites/Lawnmower.png',
        wagon: 'fill_the_truck_assets_individual/sprites/Wagon.png',
        plant: 'fill_the_truck_assets_individual/sprites/Plant.png',
        trashcan: 'fill_the_truck_assets_individual/sprites/TrashCan.png',
        vacuum: 'fill_the_truck_assets_individual/sprites/Vacuum.png',
        guitar: 'fill_the_truck_assets_individual/sprites/Acoustic Guitar.png',
        large_carton: 'fill_the_truck_assets_individual/sprites/Large Carton.png',
        medium_carton: 'fill_the_truck_assets_individual/sprites/Medium Carton.png',
        small_carton: 'fill_the_truck_assets_individual/sprites/Small Carton.png',
        book_box: 'fill_the_truck_assets_individual/sprites/Book Box.png',
        toolbox: 'fill_the_truck_assets_individual/sprites/Small Red Toolbox.png',
        tote: 'fill_the_truck_assets_individual/sprites/Tote_Plastic_Yellow-top.png',
        armchair: 'fill_the_truck_assets_individual/sprites/armchair_upholstered_tan.png',
        couch: 'fill_the_truck_assets_individual/sprites/couch_upholstered_tan.png',
        dining_chair: 'fill_the_truck_assets_individual/sprites/dining_chair_wood_oak.png',
        loveseat: 'fill_the_truck_assets_individual/sprites/loveseat_upholstered_tan.png',
        ottoman: 'fill_the_truck_assets_individual/sprites/ottoman_upholstered_tan.png',
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

    // Load sprite images
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

    // Walls extend 300px above visible area so items stacking above the
    // canvas top are still horizontally constrained and can't tumble off.
    const wallHeight = TRUCK_HEIGHT + 300;
    const wallCenterY = TRUCK_HEIGHT / 2 - 150; // shifted up so wall spans y=-300 to y=600

    const leftWall = Bodies.rectangle(30, wallCenterY, 20, wallHeight, {
        isStatic: true,
        friction: 0.5,
        label: 'leftWall'
    });

    const rightWall = Bodies.rectangle(370, wallCenterY, 20, wallHeight, {
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
    const { type, width, height, name, density, friction } = furnitureItem;

    let body;
    const spawnX = getRandomSpawnX(width); // Random X position

    // Create different polygon shapes based on type
    switch(type) {
        case 'triangle':
            // Create triangle using vertices
            body = Bodies.fromVertices(
                spawnX,
                SPAWN_Y, // Spawn just above visible area
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
                SPAWN_Y, // Spawn just above visible area
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
                SPAWN_Y, // Spawn just above visible area
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
                SPAWN_Y, // Spawn just above visible area
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

        case 'polygon': {
            // Custom polygon from vertex data — supports concave shapes via poly-decomp
            const scaledVerts = furnitureItem.vertices.map(v => ({
                x: v[0] * width,
                y: v[1] * height
            }));
            body = Bodies.fromVertices(
                spawnX,
                SPAWN_Y,
                scaledVerts,
                {
                    isStatic: false,
                    friction: friction || DEFAULT_FRICTION,
                    restitution: DEFAULT_RESTITUTION,
                    density: density || DEFAULT_DENSITY,
                    sleepThreshold: SLEEP_THRESHOLD,
                    label: type
                }
            );
            // Fallback to rectangle if fromVertices fails (degenerate polygon)
            if (!body) {
                body = Bodies.rectangle(spawnX, SPAWN_Y, width, height, {
                    isStatic: false,
                    friction: friction || DEFAULT_FRICTION,
                    restitution: DEFAULT_RESTITUTION,
                    density: density || DEFAULT_DENSITY,
                    sleepThreshold: SLEEP_THRESHOLD,
                    label: 'rect'
                });
            }
            break;
        }

        default:
            // Rectangle (default)
            body = Bodies.rectangle(
                spawnX,
                SPAWN_Y, // Spawn just above visible area
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

    // Attach metadata for rendering
    body.furnitureData = { type, name, width, height, sprite: furnitureItem.sprite };

    // For polygon bodies, calculate offset between center-of-mass and bounding box center
    // so sprites render aligned with the physics shape
    if (type === 'polygon') {
        const bcx = (body.bounds.min.x + body.bounds.max.x) / 2;
        const bcy = (body.bounds.min.y + body.bounds.max.y) / 2;
        body.furnitureData.renderOffset = {
            x: bcx - body.position.x,
            y: bcy - body.position.y
        };
    }

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
    // Game over mechanic #1: Horizontal coverage slightly above the truck frame
    // The fill line is at y=-10 (just above the visible truck opening at y=0).
    // When items stack high enough that >50% of the truck width is blocked
    // at that height, the truck is full.
    //
    // Game over mechanic #2: Overflow ceiling at y=-100 (well above visible frame)
    // If ANY non-current item's top crosses this line, game over immediately.
    // Safety net for narrow stacks that don't hit 50% coverage.

    const stackedBodies = world.bodies.filter(b => !b.isStatic);
    const TRUCK_INTERIOR_START = 30;  // Left door width
    const TRUCK_INTERIOR_END = 370;   // Right door starts at 370
    const TRUCK_INTERIOR_WIDTH = TRUCK_INTERIOR_END - TRUCK_INTERIOR_START;  // 340px total
    const COVERAGE_THRESHOLD = TRUCK_INTERIOR_WIDTH * 0.5;  // 170px (50% coverage)
    const FILL_LINE_Y = -10;   // Slightly above the visible truck frame top (y=0)
    const OVERFLOW_CEILING_Y = -100;  // Absolute ceiling — safety net for narrow stacks

    // Track which horizontal segments are blocked above the fill line
    const blockedSegments = [];

    for (let body of stackedBodies) {
        // Skip the item currently being controlled/dropped - it hasn't settled yet
        if (body === currentBody) continue;

        const topY = body.bounds.min.y;     // Top edge of item

        // Mechanic #2: If any item's top crosses the overflow ceiling, game over immediately
        if (topY < OVERFLOW_CEILING_Y) {
            return true;
        }

        // Mechanic #1: Check items that extend above the fill line
        // No velocity requirement — moving or settled, if it's above the line it counts.
        if (topY < FILL_LINE_Y) {
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
        return false;  // No items above fill line
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
    if (!isPlayerControlling) return; // Can't move after drop

    // Apply horizontal velocity while preserving vertical velocity
    const currentVelocity = currentBody.velocity;
    Body.setVelocity(currentBody, {
        x: dx * 0.35, // Horizontal velocity (slower, more intuitive control)
        y: currentVelocity.y  // Preserve falling velocity
    });
}

function rotateItem() {
    if (!currentBody || isGameOver) return;
    if (!isPlayerControlling) return; // Can't rotate after drop

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

    // Disable player control - no more movement after drop
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
    const { name, width, height, sprite, renderOffset } = body.furnitureData;
    const { x, y } = body.position;
    const angle = body.angle;

    // Render offset compensates for center-of-mass vs bounding-box-center difference
    // in polygon bodies created via Bodies.fromVertices
    const ox = renderOffset ? renderOffset.x : 0;
    const oy = renderOffset ? renderOffset.y : 0;

    context.save();

    // Translate to body position and apply rotation
    context.translate(x, y);
    context.rotate(angle);

    // Draw sprite if loaded, otherwise draw placeholder rectangle
    if (sprite && spriteImages[sprite]) {
        context.drawImage(spriteImages[sprite], -width / 2 + ox, -height / 2 + oy, width, height);
    } else {
        // Fallback placeholder while sprites load
        context.fillStyle = '#999';
        context.fillRect(-width / 2 + ox, -height / 2 + oy, width, height);
        context.strokeStyle = 'rgba(0,0,0,0.4)';
        context.lineWidth = 1;
        context.strokeRect(-width / 2 + ox, -height / 2 + oy, width, height);
        context.fillStyle = '#333';
        context.font = '8px sans-serif';
        context.textAlign = 'center';
        context.fillText(name, ox, 3 + oy);
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

        nextCtx.save();
        nextCtx.translate(centerX, centerY);

        if (nextItem.sprite && spriteImages[nextItem.sprite]) {
            nextCtx.drawImage(spriteImages[nextItem.sprite], -w / 2, -h / 2, w, h);
        } else {
            nextCtx.fillStyle = '#999';
            nextCtx.fillRect(-w / 2, -h / 2, w, h);
        }

        nextCtx.restore();

        // Draw item name
        nextCtx.fillStyle = '#333';
        nextCtx.font = 'bold 12px Arial';
        nextCtx.textAlign = 'center';
        nextCtx.fillText(nextItem.name, nextCanvas.width / 2, nextCanvas.height - 8);
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
    applyBrandTheme('americanMover');
}

// ==================== STARTUP ====================
window.addEventListener('load', () => {
    loadBrandPreference();
    init();
});

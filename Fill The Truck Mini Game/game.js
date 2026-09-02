// ==================== CONSTANTS ====================
const TRUCK_WIDTH = 400;
const TRUCK_HEIGHT = 600;

// Physics constants
const WORLD_GRAVITY = 0.26; // Snappier fall so first piece hits the well quickly
const DEFAULT_FRICTION = 0.85; // High friction prevents sliding
const DEFAULT_RESTITUTION = 0.03; // Very low bounce
const DEFAULT_DENSITY = 0.001; // Base density
const SLEEP_THRESHOLD = 60; // Frames before items sleep
const SPAWN_Y = 15; // Spawn just inside top of visible area for instant visibility

// ==================== DIY vs MOVERS DAMAGE ====================
// Fake destruction: impulse + stacked-weight thresholds, then sprite swaps.
// No fracture sim. V1 only: dining table, cartons, plant.
const PACK_DIY = 'diy';
const PACK_MOVERS = 'movers';
let packMode = PACK_DIY;
let stackCheckFrame = 0;

const MOVERS_GRID = 16;
const SPAWN_DELAY_MS = 280;
const FIRST_SPAWN_Y = 55;
const FIRST_FALL_VY = 4.0;
const FALL_VY = 2.8;

const DEDICATED_DAMAGE = {
    dining_table: [
        { state: 'cracked', sprite: 'dining_table_cracked', speed: 3.2, stackMass: 8, price: 180, label: 'Cracked dining table' },
        { state: 'broken', sprite: 'dining_table_broken', speed: 6.0, stackMass: 16, price: 450, label: 'Broken dining table' },
    ],
    large_carton: [
        { state: 'crushed', sprite: 'large_carton_crushed', speed: 2.2, stackMass: 5, price: 40, label: 'Crushed large carton' },
        { state: 'pancaked', sprite: 'large_carton_pancaked', speed: 4.0, stackMass: 9, price: 75, label: 'Pancaked large carton' },
    ],
    medium_carton: [
        { state: 'crushed', sprite: 'medium_carton_crushed', speed: 1.9, stackMass: 4, price: 25, label: 'Crushed medium carton' },
        { state: 'pancaked', sprite: 'medium_carton_pancaked', speed: 3.6, stackMass: 7, price: 50, label: 'Pancaked medium carton' },
    ],
    small_carton: [
        { state: 'crushed', sprite: 'small_carton_crushed', speed: 1.6, stackMass: 3, price: 15, label: 'Crushed small carton' },
        { state: 'pancaked', sprite: 'small_carton_pancaked', speed: 3.2, stackMass: 6, price: 30, label: 'Pancaked small carton' },
    ],
    plant: [
        { state: 'dumped', sprite: 'plant_dumped', speed: 2.0, stackMass: 4, price: 65, label: 'Dumped plant' },
        { state: 'smashed', sprite: 'plant_smashed', speed: 3.8, stackMass: 8, price: 110, label: 'Smashed plant' },
    ],
};

function genericStages(name) {
    const n = (name || 'item').toLowerCase();
    return [
        { state: 'damaged', sprite: null, overlay: 1, speed: 3.0, stackMass: 7, price: 55, label: 'Damaged ' + n },
        { state: 'wrecked', sprite: null, overlay: 2, speed: 5.5, stackMass: 13, price: 120, label: 'Wrecked ' + n },
    ];
}
function getDamageProfile(body) {
    if (!body || !body.furnitureData) return null;
    const key = body.furnitureData.baseSprite;
    const dedicated = DEDICATED_DAMAGE[key];
    if (dedicated) return { dumpIfInverted: key === 'plant', stages: dedicated };
    return { dumpIfInverted: false, stages: genericStages(body.furnitureData.name) };
}

function nextDamageStage(body) {
    const profile = getDamageProfile(body);
    if (!profile) return null;
    const idx = body.furnitureData.stageIndex || 0;
    if (idx >= profile.stages.length) return null;
    return profile.stages[idx];
}

function applyDamage(body, reason) {
    if (packMode !== PACK_DIY || isGameOver) return false;
    const stage = nextDamageStage(body);
    if (!stage) return false;
    body.furnitureData.stageIndex = (body.furnitureData.stageIndex || 0) + 1;
    body.furnitureData.damageState = stage.state;
    body.furnitureData.damageReason = reason;
    if (stage.sprite && spriteImages[stage.sprite]) {
        body.furnitureData.sprite = stage.sprite;
    } else {
        body.furnitureData.overlayLevel = stage.overlay || body.furnitureData.stageIndex;
    }
    updateDamageMeter();
    return true;
}

function collectDamageBill() {
    const lines = [];
    let total = 0;
    if (!world) return { lines, total };
    for (const body of world.bodies) {
        if (!body.furnitureData) continue;
        const profile = getDamageProfile(body);
        if (!profile) continue;
        const idx = body.furnitureData.stageIndex || 0;
        if (idx <= 0) continue;
        const stage = profile.stages[Math.min(idx, profile.stages.length) - 1];
        lines.push({ label: stage.label, price: stage.price, reason: body.furnitureData.damageReason });
        total += stage.price;
    }
    return { lines, total };
}

function updateDamageMeter() {
    const el = document.getElementById('damageMeter');
    const wrap = document.getElementById('damageMeterWrap');
    if (!el) return;
    if (packMode === PACK_MOVERS) {
        el.textContent = '$0';
        if (wrap) wrap.querySelector('.label').textContent = 'Pro pack:';
        return;
    }
    if (wrap) wrap.querySelector('.label').textContent = 'DIY Damage:';
    el.textContent = '$' + collectDamageBill().total;
}

function setPackMode(mode, persist) {
    packMode = (mode === PACK_MOVERS) ? PACK_MOVERS : PACK_DIY;
    document.body.classList.toggle('pack-movers', packMode === PACK_MOVERS);
    const diyBtn = document.getElementById('modeDiy');
    const moversBtn = document.getElementById('modeMovers');
    if (diyBtn) diyBtn.classList.toggle('is-active', packMode === PACK_DIY);
    if (moversBtn) moversBtn.classList.toggle('is-active', packMode === PACK_MOVERS);
    if (persist !== false) {
        try { localStorage.setItem('packMode', packMode); } catch (_) {}
    }
    updateDamageMeter();
}

function loadPackMode() {
    const urlParams = new URLSearchParams(window.location.search);
    const fromUrl = (urlParams.get('mode') || '').toLowerCase();
    if (fromUrl === PACK_DIY || fromUrl === PACK_MOVERS) {
        setPackMode(fromUrl, false);
        return;
    }
    let saved = null;
    try { saved = localStorage.getItem('packMode'); } catch (_) {}
    setPackMode(saved === PACK_MOVERS ? PACK_MOVERS : PACK_DIY, false);
}

function setupModeSelector() {
    const selector = document.getElementById('modeSelector');
    if (!selector) return;
    selector.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-mode]');
        if (!btn) return;
        setPackMode(btn.getAttribute('data-mode'), true);
    });
}

function considerImpact(victim, other) {
    const profile = getDamageProfile(victim);
    const stage = nextDamageStage(victim);
    if (!profile || !stage || other.isStatic) return;
    const rel = Matter.Vector.sub(victim.velocity, other.velocity);
    const speed = Matter.Vector.magnitude(rel);
    const otherMass = other.mass || 0;
    // Slam: fast relative speed. Crush-on-hit: slower but a much heavier body.
    if (speed >= stage.speed || (otherMass >= stage.stackMass && speed >= 0.9)) {
        applyDamage(victim, 'impact');
    }
}

function setupDamageCollisions() {
    Events.on(engine, 'collisionStart', (event) => {
        if (packMode !== PACK_DIY || isGameOver) return;
        for (const pair of event.pairs) {
            considerImpact(pair.bodyA, pair.bodyB);
            considerImpact(pair.bodyB, pair.bodyA);
        }
    });
}

function checkStackedWeightAndTilt() {
    if (packMode !== PACK_DIY || isGameOver || !world) return;
    const bodies = world.bodies.filter(b => !b.isStatic && b.furnitureData);
    for (const victim of bodies) {
        const profile = getDamageProfile(victim);
        const stage = nextDamageStage(victim);
        if (!profile || !stage) continue;

        if (profile.dumpIfInverted) {
            const a = ((victim.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
            if (a > 1.15 && a < (Math.PI * 2 - 1.15)) {
                applyDamage(victim, 'inverted');
                continue;
            }
        }

        let massOn = 0;
        for (const other of bodies) {
            if (other === victim) continue;
            const overlapX = other.bounds.min.x < victim.bounds.max.x && other.bounds.max.x > victim.bounds.min.x;
            const restingOn = other.bounds.max.y >= victim.bounds.min.y - 6 && other.position.y < victim.position.y;
            if (overlapX && restingOn) massOn += other.mass || 0;
        }
        if (massOn >= stage.stackMass) applyDamage(victim, 'crush');
    }
}

function renderDamageBill() {
    const box = document.getElementById('damageBill');
    const title = document.getElementById('damageBillTitle');
    const list = document.getElementById('damageBillLines');
    const totalEl = document.getElementById('damageBillTotal');
    const cta = document.getElementById('ctaMessage');
    if (!box) return { lines: [], total: 0, mode: packMode };

    const bill = collectDamageBill();
    box.hidden = false;
    list.innerHTML = '';

    if (packMode === PACK_MOVERS) {
        box.classList.add('pros');
        title.textContent = 'Packed by pros';
        const li = document.createElement('li');
        li.innerHTML = '<span>Wrapped and stacked</span><span>$0</span>';
        list.appendChild(li);
        totalEl.textContent = 'Claim total: $0';
        if (cta) cta.innerHTML = 'That is how the truck should look when we load it.<br>A member of our team will reach out to you shortly.';
        return { ...bill, total: 0, mode: packMode };
    }

    box.classList.remove('pros');
    title.textContent = 'DIY damage bill';
    if (bill.lines.length === 0) {
        const li = document.createElement('li');
        li.innerHTML = '<span>Got lucky this run</span><span>$0</span>';
        list.appendChild(li);
    } else {
        for (const line of bill.lines) {
            const li = document.createElement('li');
            li.innerHTML = '<span>' + line.label + '</span><span>$' + line.price + '</span>';
            list.appendChild(li);
        }
    }
    totalEl.textContent = 'Claim total: $' + bill.total;
    if (cta) {
        cta.innerHTML = bill.total > 0
            ? "Don't try to load the truck yourself, leave that to us.<br>That bill is why."
            : "Don't try to load the truck yourself, leave that to us.<br>A member of our team will reach out to you shortly.";
    }
    return { ...bill, mode: packMode };
}

const opaqueCropCache = new WeakMap();

function getOpaqueCrop(img) {
    const cached = opaqueCropCache.get(img);
    if (cached) return cached;
    try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        const g = c.getContext('2d');
        g.drawImage(img, 0, 0);
        const data = g.getImageData(0, 0, w, h).data;
        let minX = w, minY = h, maxX = 0, maxY = 0;
        let found = false;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const a = data[(y * w + x) * 4 + 3];
                if (a > 16) {
                    found = true;
                    if (x < minX) minX = x;
                    if (y < minY) minY = y;
                    if (x > maxX) maxX = x;
                    if (y > maxY) maxY = y;
                }
            }
        }
        const crop = found
            ? { sx: minX, sy: minY, sw: maxX - minX + 1, sh: maxY - minY + 1 }
            : { sx: 0, sy: 0, sw: w, sh: h };
        opaqueCropCache.set(img, crop);
        return crop;
    } catch (err) {
        const crop = {
            sx: 0,
            sy: 0,
            sw: img.naturalWidth || img.width || 1,
            sh: img.naturalHeight || img.height || 1
        };
        opaqueCropCache.set(img, crop);
        return crop;
    }
}

function drawSpriteAtBodySize(context, img, dx, dy, dw, dh) {
    const crop = getOpaqueCrop(img);
    context.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, dx, dy, dw, dh);
}

function stampDamageOverlay(context, w, h, level) {
    context.save();
    context.beginPath();
    context.rect(0, 0, w, h);
    context.clip();
    const heavy = level >= 2;
    context.fillStyle = heavy ? 'rgba(90, 40, 10, 0.32)' : 'rgba(90, 40, 10, 0.18)';
    context.fillRect(0, 0, w, h);
    context.strokeStyle = heavy ? 'rgba(40, 20, 10, 0.85)' : 'rgba(40, 20, 10, 0.55)';
    context.lineWidth = heavy ? 2.2 : 1.4;
    context.beginPath();
    context.moveTo(w * 0.12, h * 0.18);
    context.lineTo(w * 0.38, h * 0.42);
    context.lineTo(w * 0.28, h * 0.72);
    context.moveTo(w * 0.55, h * 0.12);
    context.lineTo(w * 0.72, h * 0.48);
    context.lineTo(w * 0.88, h * 0.35);
    if (heavy) {
        context.moveTo(w * 0.18, h * 0.55);
        context.lineTo(w * 0.62, h * 0.82);
        context.moveTo(w * 0.42, h * 0.22);
        context.lineTo(w * 0.85, h * 0.68);
    }
    context.stroke();
    context.restore();
}

function stampMoversWrap(context, w, h, name) {
    context.save();
    context.beginPath();
    context.rect(0, 0, w, h);
    context.clip();
    const boxed = /plant|guitar|lamp|toolbox|tote|carton|box|microwave|vacuum|trash/i.test(name || '');
    if (boxed) {
        context.fillStyle = 'rgba(196, 154, 92, 0.55)';
        context.fillRect(0, 0, w, h);
        context.strokeStyle = 'rgba(120, 80, 40, 0.7)';
        context.lineWidth = Math.max(1.5, Math.min(w, h) * 0.04);
        context.strokeRect(2, 2, w - 4, h - 4);
        context.beginPath();
        context.moveTo(w / 2, 0);
        context.lineTo(w / 2, h);
        context.moveTo(0, h / 2);
        context.lineTo(w, h / 2);
        context.stroke();
        context.fillStyle = 'rgba(90, 60, 30, 0.55)';
        context.fillRect(w * 0.3, h * 0.42, w * 0.4, h * 0.16);
    } else {
        context.fillStyle = 'rgba(196, 164, 110, 0.5)';
        context.fillRect(0, 0, w, h);
        context.strokeStyle = 'rgba(140, 110, 70, 0.55)';
        context.lineWidth = 1.5;
        const step = Math.max(8, Math.min(w, h) / 5);
        for (let x = -h; x < w + h; x += step) {
            context.beginPath();
            context.moveTo(x, 0);
            context.lineTo(x + h, h);
            context.stroke();
        }
        context.strokeStyle = 'rgba(180, 30, 30, 0.75)';
        context.lineWidth = Math.max(2, Math.min(w, h) * 0.06);
        context.strokeRect(w * 0.08, h * 0.08, w * 0.84, h * 0.84);
    }
    context.restore();
}


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
    { type: 'compound', width: 130, height: 71, name: 'Dining Table', density: 0.002, sprite: 'dining_table',
        parts: [
            { shape: 'rect', x: 0, y: -0.38, w: 1.0, h: 0.25 },   // tabletop (full width, top 25%)
            { shape: 'rect', x: -0.35, y: 0.2, w: 0.1, h: 0.6 },  // left leg
            { shape: 'rect', x: 0.35, y: 0.2, w: 0.1, h: 0.6 },   // right leg
        ] },
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
    },
    // ===== Customer themes =====
    scobey: {
        name: "Scobey Moving & Storage",
        companyName: "Scobey Moving & Storage",
        truckColors: {
            doors: "#16653A",   // deep forest green body
            accent: "#F4F6F9",  // white/silver trim
            wheels: "#0E3F23"   // darkest green
        },
        background: "linear-gradient(135deg, #14512B 0%, #2E9E5B 100%)",
        uiAccent: "#1B6E3C"     // green for UI accents
    },
    central: {
        name: "Central Transportation Systems",
        companyName: "Central Transportation Systems",
        truckColors: {
            doors: "#14539E",   // royal blue body
            accent: "#F4F6F9",  // white/silver trim
            wheels: "#0A3A6B"   // darkest blue
        },
        background: "linear-gradient(135deg, #0A3D7A 0%, #2E83D6 100%)",
        uiAccent: "#1A5FB4"     // blue for UI accents
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
let isFirstSpawn = true; // First item spawns mid-window so it lands quickly

// Analytics: per-session counters reset in restartGame; emitted in fillTheTruck:complete
let analyticsCounters = {
    canvasTaps: 0,
    canvasDrags: 0,
    canvasSwipes: 0,
    keypresses: 0,
    buttonTaps: 0,
    rotations: 0,
    manualDrops: 0,
    autoDrops: 0,
};
let firstInputTime = null;       // first user input after gameStart; ms since epoch
let replayCount = 0;             // number of restarts in this page load
let lastGameOverReason = null;   // 'coverage_threshold' | 'overflow_ceiling'

function recordInput(source) {
    if (firstInputTime === null) firstInputTime = Date.now();
    if (source && source in analyticsCounters) analyticsCounters[source]++;
}

function postParent(payload) {
    try { window.parent.postMessage(payload, '*'); }
    catch (_) { /* cross-origin: ignore */ }
}

// Tell the embedding page how tall the game is so it can size the iframe.
// Mobile (stacked layout + touch controls) is much taller than desktop, so a
// fixed iframe height would clip; the parent listens for this and resizes.
function postHeight() {
    const height = Math.max(
        document.documentElement.scrollHeight,
        document.body ? document.body.scrollHeight : 0
    );
    postParent({ type: 'fillTheTruck:resize', height: height });
}

function setupAutoResize() {
    postHeight();
    if (window.ResizeObserver && document.body) {
        new ResizeObserver(() => postHeight()).observe(document.body);
    }
    window.addEventListener('resize', postHeight);
    window.addEventListener('orientationchange', () => setTimeout(postHeight, 200));
}

// Sprite images for all furniture items
const spriteImages = {};
let spritesLoaded = false;

// ==================== SPRITE LOADING ====================
function loadSprites() {
    const spritePaths = {
        fridge: 'fill_the_truck_assets_individual/sprites/Fridge-2-22.png',
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
        tote: 'fill_the_truck_assets_individual/sprites/Tote_Plastic_Yellow-top-2-22.png',
        armchair: 'fill_the_truck_assets_individual/sprites/armchair_upholstered_tan.png',
        couch: 'fill_the_truck_assets_individual/sprites/couch_upholstered_tan.png',
        dining_chair: 'fill_the_truck_assets_individual/sprites/dining_chair_wood_oak.png',
        loveseat: 'fill_the_truck_assets_individual/sprites/loveseat_upholstered_tan.png',
        ottoman: 'fill_the_truck_assets_individual/sprites/ottoman_upholstered_tan.png',
        dining_table_cracked: 'fill_the_truck_assets_individual/sprites/rectangle dining table-cracked.png',
        large_carton_crushed: 'fill_the_truck_assets_individual/sprites/Large Carton-crushed.png',
        medium_carton_crushed: 'fill_the_truck_assets_individual/sprites/Medium Carton-crushed.png',
        small_carton_crushed: 'fill_the_truck_assets_individual/sprites/Small Carton-crushed.png',
        plant_dumped: 'fill_the_truck_assets_individual/sprites/Plant-dumped.png',
        dining_table_broken: ['fill_the_truck_assets_individual/sprites/rectangle dining table-broken.png', 'fill_the_truck_assets_individual/sprites/Dining Table Broken.png'],
        large_carton_pancaked: ['fill_the_truck_assets_individual/sprites/Large Carton-pancaked.png', 'fill_the_truck_assets_individual/sprites/Large Carton Pancaked.png'],
        medium_carton_pancaked: ['fill_the_truck_assets_individual/sprites/Medium Carton-pancaked.png', 'fill_the_truck_assets_individual/sprites/Medium Carton Pancaked.png'],
        small_carton_pancaked: ['fill_the_truck_assets_individual/sprites/Small Carton-pancaked.png', 'fill_the_truck_assets_individual/sprites/Small Carton Pancaked.png'],
        plant_smashed: ['fill_the_truck_assets_individual/sprites/Plant-smashed.png', 'fill_the_truck_assets_individual/sprites/Plant Smashed.png'],
    };

    let loadedCount = 0;
    const totalSprites = Object.keys(spritePaths).length;

    const markDone = (ok) => {
        loadedCount++;
        if (loadedCount === totalSprites) {
            spritesLoaded = true;
            console.log(ok ? 'All sprites loaded successfully' : 'Proceeding without some sprites (will use fallback textures)');
        }
    };

    for (let type in spritePaths) {
        const paths = [].concat(spritePaths[type]);
        const img = new Image();
        let pathIndex = 0;
        img.onload = () => {
            spriteImages[type] = img;
            markDone(true);
        };
        img.onerror = () => {
            pathIndex++;
            if (pathIndex < paths.length) {
                img.src = paths[pathIndex];
                return;
            }
            console.error('Failed to load sprite: ' + paths[0]);
            markDone(false);
        };
        img.src = paths[0];
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
    setupModeSelector();

    // Prepare game
    nextItem = getRandomItem();

    // Set up keyboard controls
    document.addEventListener('keydown', handleKeyPress);

    // Set up mobile touch controls
    setupMobileControls();
    setupCanvasTouch();

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
    setupDamageCollisions();
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

        case 'compound': {
            // Compound body from multiple rectangular parts (e.g. table with legs)
            // Parts are defined with normalized coordinates: x/y relative to center,
            // w/h as fraction of total width/height
            const partBodies = furnitureItem.parts.map(p => {
                return Bodies.rectangle(
                    spawnX + p.x * width,
                    SPAWN_Y + p.y * height,
                    p.w * width,
                    p.h * height,
                    {
                        friction: friction || DEFAULT_FRICTION,
                        restitution: DEFAULT_RESTITUTION,
                        density: density || DEFAULT_DENSITY,
                    }
                );
            });
            body = Body.create({
                parts: partBodies,
                isStatic: false,
                friction: friction || DEFAULT_FRICTION,
                restitution: DEFAULT_RESTITUTION,
                sleepThreshold: SLEEP_THRESHOLD,
                label: type
            });
            // Position the compound body at spawn point
            Body.setPosition(body, { x: spawnX, y: SPAWN_Y });
            break;
        }

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
    body.furnitureData = {
        type,
        name,
        width,
        height,
        sprite: furnitureItem.sprite,
        baseSprite: furnitureItem.sprite,
        stageIndex: 0,
        damageState: 'intact',
        overlayLevel: 0,
    };

    // For polygon/compound bodies, calculate offset between center-of-mass and bounding box center
    // so sprites render aligned with the physics shape
    if (type === 'polygon' || type === 'compound') {
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

    // First piece: mouth of the truck, fast fall. Subsequent: top of frame, still snappy.
    if (isFirstSpawn) {
        Body.setPosition(currentBody, { x: currentBody.position.x, y: FIRST_SPAWN_Y });
        Body.setVelocity(currentBody, { x: 0, y: FIRST_FALL_VY });
        isFirstSpawn = false;
        postParent({ type: 'fillTheTruck:gameStart' });
    } else {
        Body.setVelocity(currentBody, { x: 0, y: FALL_VY });
    }

    if (packMode === PACK_MOVERS) {
        snapMoversBody(currentBody, false);
    }

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
            lastGameOverReason = 'overflow_ceiling';
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
    if (totalBlockedWidth > COVERAGE_THRESHOLD) {
        lastGameOverReason = 'coverage_threshold';
        return true;
    }
    return false;
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
    if (packMode === PACK_MOVERS) snapMoversBody(currentBody, false);
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
    } else {
        analyticsCounters.rotations++;
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
    analyticsCounters.manualDrops++;
    postParent({
        type: 'fillTheTruck:itemPacked',
        itemsPacked: itemsPacked,
        efficiency: parseInt(document.getElementById('efficiency').textContent, 10) || 0,
        elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
    });

    // Spawn next item after a short delay
    setTimeout(() => {
        if (!isGameOver) {
            spawnItem();
        }
    }, SPAWN_DELAY_MS);
}

function autoDrop() {
    if (!currentBody || isGameOver) return;

    // Wake up the body to ensure physics is active
    Sleeping.set(currentBody, false);

    // Release control - enable physics
    Body.setStatic(currentBody, false);

    // Give item initial downward velocity
    Body.setVelocity(currentBody, { x: 0, y: FALL_VY });

    // Force the body to stay awake briefly
    currentBody.sleepThreshold = Infinity;
    setTimeout(() => {
        if (currentBody) {
            currentBody.sleepThreshold = SLEEP_THRESHOLD;
        }
    }, 100);

    isPlayerControlling = false;
    itemsPacked++;
    analyticsCounters.autoDrops++;
    postParent({
        type: 'fillTheTruck:itemPacked',
        itemsPacked: itemsPacked,
        efficiency: parseInt(document.getElementById('efficiency').textContent, 10) || 0,
        elapsedSeconds: Math.floor((Date.now() - startTime) / 1000),
    });

    // Spawn next item after a short delay
    setTimeout(() => {
        if (!isGameOver) {
            spawnItem();
        }
    }, SPAWN_DELAY_MS);
}

function snapMoversBody(body, snapY) {
    if (packMode !== PACK_MOVERS || !body || !body.furnitureData) return;
    const halfW = (body.bounds.max.x - body.bounds.min.x) / 2;
    let x = Math.round(body.position.x / MOVERS_GRID) * MOVERS_GRID;
    x = Math.max(30 + halfW + 2, Math.min(370 - halfW - 2, x));
    const quarter = Math.PI / 2;
    const angle = Math.round(body.angle / quarter) * quarter;
    const y = snapY ? Math.round(body.position.y / MOVERS_GRID) * MOVERS_GRID : body.position.y;
    Body.setAngle(body, angle);
    Body.setAngularVelocity(body, 0);
    Body.setPosition(body, { x: x, y: y });
    if (snapY) Body.setVelocity(body, { x: 0, y: 0 });
    else Body.setVelocity(body, { x: 0, y: body.velocity.y });
}

// ==================== UPDATE GAME STATE ====================
function update(timestamp) {
    if (isGameOver) return;

    const deltaTime = timestamp - lastTimestamp || 16.67;
    lastTimestamp = timestamp;

    // Update physics engine (always run to handle dropped items)
    Engine.update(engine, deltaTime);

    stackCheckFrame++;
    if (packMode === PACK_DIY && stackCheckFrame % 8 === 0) checkStackedWeightAndTilt();
    if (packMode === PACK_MOVERS && stackCheckFrame % 4 === 0) {
        for (const body of world.bodies) {
            if (body.isStatic || !body.furnitureData) continue;
            const settled = body !== currentBody && Math.abs(body.velocity.y) < 0.35;
            snapMoversBody(body, settled);
        }
    }

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
            recordInput('keypresses');
            moveItem(-10);
            e.preventDefault();
            break;
        case 'ArrowRight':
            recordInput('keypresses');
            moveItem(10);
            e.preventDefault();
            break;
        case 'ArrowDown':
        case ' ':
            recordInput('keypresses');
            dropItem();
            e.preventDefault();
            break;
        case 'ArrowUp':
            recordInput('keypresses');
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
            recordInput('buttonTaps');
            moveItem(-10);
        });
    }

    if (rightBtn) {
        rightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            recordInput('buttonTaps');
            moveItem(10);
        });
    }

    if (downBtn) {
        downBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            recordInput('buttonTaps');
            dropItem();
        });
    }

    if (rotateBtn) {
        rotateBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            recordInput('buttonTaps');
            rotateItem();
        });
    }
}

// ==================== CANVAS TOUCH (drag / tap-rotate / swipe-drop) ====================
function setupCanvasTouch() {
    if (!canvas) return;

    const TAP_TIME_MS = 250;
    const TAP_MOVE_PX = 8;        // CSS pixels
    const SWIPE_TIME_MS = 300;
    const SWIPE_MIN_DY = 40;      // CSS pixels
    const SWIPE_AXIS_RATIO = 1.5;

    let active = false;
    let startX = 0, startY = 0, startT = 0;
    let lastX = 0, lastY = 0;
    let maxMove = 0;
    let dragging = false;
    let consumed = false;

    function gameXFromClientX(clientX) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        return (clientX - rect.left) * scaleX;
    }

    function snapPieceTo(gameX) {
        if (!currentBody || !isPlayerControlling || isGameOver) return;
        const bounds = currentBody.bounds;
        const halfW = (bounds.max.x - bounds.min.x) / 2;
        const minX = 30 + halfW;
        const maxX = 370 - halfW;
        const clampedX = Math.max(minX, Math.min(maxX, gameX));
        Body.setPosition(currentBody, { x: clampedX, y: currentBody.position.y });
        Body.setVelocity(currentBody, { x: 0, y: currentBody.velocity.y });
    }

    canvas.addEventListener('touchstart', (e) => {
        if (isGameOver || !isPlayerControlling || !currentBody) return;
        if (e.touches.length !== 1) return;
        const t = e.touches[0];
        active = true;
        consumed = false;
        dragging = false;
        startX = lastX = t.clientX;
        startY = lastY = t.clientY;
        startT = performance.now();
        maxMove = 0;
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
        if (!active || consumed) return;
        const t = e.touches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        const dist = Math.hypot(dx, dy);
        if (dist > maxMove) maxMove = dist;
        lastX = t.clientX;
        lastY = t.clientY;

        if (!dragging && maxMove > TAP_MOVE_PX) {
            dragging = true;
            recordInput('canvasDrags');
        }
        if (dragging) snapPieceTo(gameXFromClientX(t.clientX));
        e.preventDefault();
    }, { passive: false });

    canvas.addEventListener('touchend', (e) => {
        if (!active) return;
        active = false;
        if (consumed) return;

        const duration = performance.now() - startT;
        const dx = lastX - startX;
        const dy = lastY - startY;

        // Swipe-down beats drag classification
        if (dy > SWIPE_MIN_DY && Math.abs(dy) > Math.abs(dx) * SWIPE_AXIS_RATIO && duration < SWIPE_TIME_MS) {
            consumed = true;
            recordInput('canvasSwipes');
            dropItem();
            e.preventDefault();
            return;
        }

        // Tap → rotate
        if (!dragging && duration < TAP_TIME_MS && maxMove < TAP_MOVE_PX) {
            recordInput('canvasTaps');
            rotateItem();
            e.preventDefault();
        }
    }, { passive: false });

    canvas.addEventListener('touchcancel', () => {
        active = false;
        dragging = false;
        consumed = false;
    });
}

// ==================== RENDERING ====================


function drawTruckFrame(context) {
    const theme = BRAND_THEMES[currentBrand];
    const doorWidth = 30; // Width of each door
    const doorColor = theme.truckColors.doors;
    const accentColor = theme.truckColors.accent;

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

        // Wheel hub (neutral gunmetal hubcap — deliberately NOT the brand color,
        // a colored tire center reads as a mistake)
        const rimWidth = wheelWidth * 0.6;
        const rimHeight = wheelHeight * 0.7;
        const rimRadius = 5;
        const hubGradient = context.createLinearGradient(0, -rimHeight / 2, 0, rimHeight / 2);
        hubGradient.addColorStop(0, '#5a5a5a');
        hubGradient.addColorStop(0.5, '#333333');
        hubGradient.addColorStop(1, '#5a5a5a');
        context.fillStyle = hubGradient;
        context.beginPath();
        context.roundRect(-rimWidth/2, -rimHeight/2, rimWidth, rimHeight, rimRadius);
        context.fill();

        // Rim details (horizontal line in center for tread pattern)
        context.strokeStyle = '#6a6a6a';
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

    const destX = -width / 2 + ox;
    const destY = -height / 2 + oy;
    const img = (sprite && spriteImages[sprite]) || (body.furnitureData.baseSprite && spriteImages[body.furnitureData.baseSprite]);
    if (img) {
        drawSpriteAtBodySize(context, img, destX, destY, width, height);
    } else {
        context.fillStyle = '#999';
        context.fillRect(destX, destY, width, height);
        context.strokeStyle = 'rgba(0,0,0,0.4)';
        context.lineWidth = 1;
        context.strokeRect(destX, destY, width, height);
        context.fillStyle = '#333';
        context.font = '8px sans-serif';
        context.textAlign = 'center';
        context.fillText(name, ox, 3 + oy);
    }

    if (packMode === PACK_DIY) {
        const overlayLevel = body.furnitureData.overlayLevel || 0;
        const stageIndex = body.furnitureData.stageIndex || 0;
        const dedicatedMissing = stageIndex > 0 && !(sprite && spriteImages[sprite]);
        if (overlayLevel || dedicatedMissing) {
            context.save();
            context.translate(destX, destY);
            stampDamageOverlay(context, width, height, overlayLevel || stageIndex);
            context.restore();
        }
    }
    if (packMode === PACK_MOVERS) {
        context.save();
        context.translate(destX, destY);
        stampMoversWrap(context, width, height, name);
        context.restore();
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
            drawSpriteAtBodySize(nextCtx, spriteImages[nextItem.sprite], -w / 2, -h / 2, w, h);
        } else {
            nextCtx.fillStyle = '#999';
            nextCtx.fillRect(-w / 2, -h / 2, w, h);
        }
        if (packMode === PACK_MOVERS) {
            nextCtx.save();
            nextCtx.translate(-w / 2, -h / 2);
            stampMoversWrap(nextCtx, w, h, nextItem.name);
            nextCtx.restore();
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
    updateDamageMeter();
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
    const efficiencyNum = parseInt(efficiency, 10) || 0;
    const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);

    // Show game over overlay
    const overlay = document.getElementById('gameOverOverlay');
    document.getElementById('finalEfficiency').textContent = efficiency;
    document.getElementById('finalItems').textContent = itemsPacked;
    const bill = renderDamageBill();
    overlay.style.display = 'flex';

    // Notify embedding parent page (no-op when not iframed — posts to self).
    // Parent listener can read items/efficiency/time and decide what to show
    // (custom message, discount tier, CTA, etc.) — we don't make offers here.
    postParent({
        type: 'fillTheTruck:complete',
        items: itemsPacked,
        efficiency: efficiencyNum,
        timeSeconds: elapsedSeconds,
        inputBreakdown: {
            touches: analyticsCounters.canvasTaps + analyticsCounters.canvasDrags + analyticsCounters.canvasSwipes + analyticsCounters.buttonTaps,
            canvasTaps: analyticsCounters.canvasTaps,
            canvasDrags: analyticsCounters.canvasDrags,
            canvasSwipes: analyticsCounters.canvasSwipes,
            keypresses: analyticsCounters.keypresses,
            buttonTaps: analyticsCounters.buttonTaps,
        },
        rotations: analyticsCounters.rotations,
        manualDrops: analyticsCounters.manualDrops,
        autoDrops: analyticsCounters.autoDrops,
        timeToFirstInputMs: firstInputTime !== null ? (firstInputTime - startTime) : null,
        gameOverReason: lastGameOverReason,
        replayCount: replayCount,
        packMode: packMode,
        damageBill: bill.total,
        damagedItems: bill.lines,
    });

    // Hide old message div (if it exists)
    const messageEl = document.getElementById('message');
    if (messageEl) {
        messageEl.style.display = 'none';
    }
}

function startCountdown() {
    const overlay = document.getElementById('countdownOverlay');
    const numberEl = document.getElementById('countdownNumber');

    overlay.classList.remove('banner-mode');
    overlay.style.display = 'flex';

    numberEl.textContent = 'Go';
    numberEl.style.animation = 'none';
    setTimeout(() => {
        numberEl.style.animation = 'countdown-pulse 0.28s ease-in-out';
    }, 10);

    const countdownInterval = setInterval(() => {
        clearInterval(countdownInterval);

        startTime = Date.now();
        spawnItem();
        gameLoop = requestAnimationFrame(update);
        timerInterval = setInterval(updateTimer, 1000);

        overlay.classList.add('banner-mode');
        numberEl.textContent = 'Fill the Truck!';
        numberEl.style.animation = 'none';
        setTimeout(() => {
            numberEl.style.animation = 'countdown-pulse 0.6s ease-in-out forwards';
        }, 10);

        setTimeout(() => {
            overlay.style.display = 'none';
            overlay.classList.remove('banner-mode');
        }, 700);
    }, 280);
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
    isFirstSpawn = true;
    startTime = Date.now();

    // Reset per-session analytics
    Object.keys(analyticsCounters).forEach(k => analyticsCounters[k] = 0);
    firstInputTime = null;
    lastGameOverReason = null;
    replayCount++;

    // Reset UI
    document.getElementById('efficiency').textContent = '0%';
    document.getElementById('items').textContent = '0';
    document.getElementById('timer').textContent = '0s';
    const billBox = document.getElementById('damageBill');
    if (billBox) billBox.hidden = true;
    updateDamageMeter();

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

    // Show the customer's company name in the header (themes that carry one)
    const companyEl = document.getElementById('companyName');
    if (companyEl) {
        if (theme.companyName) {
            companyEl.textContent = theme.companyName;
            companyEl.style.display = 'block';
        } else {
            companyEl.textContent = '';
            companyEl.style.display = 'none';
        }
    }

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
        // Production embed: a brand is pinned via URL, so hide the dev brand picker.
        const selector = document.getElementById('brandSelector');
        if (selector) selector.style.display = 'none';
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
    loadPackMode();
    init();
    setupAutoResize();
});

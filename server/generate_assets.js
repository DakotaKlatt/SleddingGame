const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, 'public', 'assets');

const COLORS = {
    skin: ['#ffdbac', '#f1c27d', '#e0ac69', '#8d5524', '#c68642'],
    clothing: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#00ffff', '#ff00ff', '#333333', '#eeeeee'],
    sleds: ['#8b4513', '#a0522d', '#cd853f', '#708090', '#c0c0c0', '#ff4500'],
    hats: ['#ff0000', '#00ff00', '#0000ff', '#111111', '#555555', '#ff9900']
};

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function writeSvg(category, name, content) {
    const dir = path.join(BASE_DIR, category);
    ensureDir(dir);
    fs.writeFileSync(path.join(dir, `${name}.svg`), content);
    console.log(`Generated ${category}/${name}.svg`);
}

// --- GENERATORS ---

// Character: Simple body with scarf
function generateCharacter(id, color) {
    const svg = `
<svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <!-- Body -->
    <rect x="22" y="20" width="20" height="30" rx="5" fill="${color}" />
    <!-- Head -->
    <circle cx="32" cy="16" r="10" fill="#ffdbac" />
    <!-- Scarf -->
    <path d="M20 26 H44 L40 34 H24 Z" fill="#ffffff" opacity="0.8" />
    <rect x="36" y="26" width="8" height="20" fill="#ffffff" opacity="0.8" transform="rotate(10 40 26)" />
</svg>`;
    writeSvg('characters', id, svg.trim());
}

// Sled: Various shapes
function generateSled(id, color, type) {
    let shape = '';
    if (type === 'toboggan') {
        shape = `<path d="M5 25 Q5 15 15 15 L55 15 Q60 15 60 25 L5 25 Z" fill="${color}" />`;
    } else if (type === 'saucer') {
        shape = `<ellipse cx="32" cy="20" rx="28" ry="5" fill="${color}" />`;
    } else if (type === 'tube') {
        shape = `<rect x="5" y="15" width="54" height="10" rx="5" fill="${color}" stroke="#000" stroke-width="2"/>`;
    }
    
    const svg = `
<svg width="64" height="32" viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg">
    ${shape}
</svg>`;
    writeSvg('sleds', id, svg.trim());
}

// Hat: Various types
function generateHat(id, color, type) {
    let shape = '';
    if (type === 'beanie') {
        shape = `<path d="M10 30 Q10 5 32 5 Q54 5 54 30 Z" fill="${color}" /> <rect x="8" y="28" width="48" height="8" rx="2" fill="#eee"/>`;
    } else if (type === 'helmet') {
        shape = `<path d="M12 30 Q12 2 32 2 Q52 2 52 30 Z" fill="${color}" stroke="#333" stroke-width="2"/> <rect x="28" y="28" width="8" height="6" fill="#333"/>`;
    } else if (type === 'santa') {
        shape = `<path d="M10 30 Q5 5 32 5 L54 30 Z" fill="#d00" /> <circle cx="54" cy="30" r="5" fill="#fff"/> <rect x="8" y="28" width="48" height="8" rx="2" fill="#fff"/>`;
    }

    const svg = `
<svg width="64" height="40" viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg">
    ${shape}
</svg>`;
    writeSvg('hats', id, svg.trim());
}

// Environment: Trees, Rocks
function generateEnvironment() {
    // Pine Tree
    const treeSvg = `
<svg width="64" height="128" viewBox="0 0 64 128" xmlns="http://www.w3.org/2000/svg">
    <rect x="28" y="100" width="8" height="28" fill="#5d4037"/>
    <path d="M32 10 L10 50 H54 Z" fill="#2e7d32"/>
    <path d="M32 40 L6 80 H58 Z" fill="#2e7d32"/>
    <path d="M32 70 L2 110 H62 Z" fill="#2e7d32"/>
</svg>`;
    writeSvg('environment', 'tree_pine', treeSvg.trim());

    // Rock
    const rockSvg = `
<svg width="64" height="32" viewBox="0 0 64 32" xmlns="http://www.w3.org/2000/svg">
    <path d="M5 30 L15 10 L30 5 L45 15 L60 30 Z" fill="#757575"/>
</svg>`;
    writeSvg('environment', 'rock_grey', rockSvg.trim());
}

// --- EXECUTE ---

// Clean up? No, just overwrite.

// Generate Characters
COLORS.clothing.forEach((c, i) => generateCharacter(`char_${i}`, c));

// Generate Sleds
generateSled('sled_wood', '#8b4513', 'toboggan');
generateSled('sled_metal', '#708090', 'saucer');
generateSled('sled_plastic', '#ff4500', 'tube');
generateSled('sled_gold', '#ffd700', 'toboggan');

// Generate Hats
generateHat('hat_beanie', '#ff0000', 'beanie');
generateHat('hat_helmet', '#333333', 'helmet');
generateHat('hat_santa', '#ff0000', 'santa');
generateHat('hat_blue', '#0000ff', 'beanie');

// Generate Env
generateEnvironment();

console.log('Done generating assets!');


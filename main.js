// Game State
const gameState = {
    candyCanes: 0,
    clickMultiplier: 1,
    autoClickRate: 0, // per second
    upgradeLevels: {}, // { upgradeId: level }
    inventory: {
        1: false, // Support little software engineer student
        2: false  // Letter to Santa
    }
};

// Upgrade Definitions
const upgrades = [
    {
        id: 1,
        name: "Better Mouse Firmware",
        description: "Increases Canes per click",
        baseCost: 1,
        baseEffect: 1,
        type: "click",
        emoji: "🖱️"
    },
    {
        id: 2,
        name: "Junior Elf Intern",
        description: "Generates +1 cane/sec",
        baseCost: 5,
        baseEffect: 1,
        type: "passive",
        emoji: "🧑‍🎄"
    },
    {
        id: 3,
        name: "Christmas Tree Farm",
        description: "Generates +5 canes/sec",
        baseCost: 50,
        baseEffect: 5,
        type: "passive",
        emoji: "🎄"
    },
    {
        id: 4,
        name: "Reindeer Team",
        description: "Generates +25 canes/sec",
        baseCost: 500,
        baseEffect: 25,
        type: "passive",
        emoji: "🦌"
    },
    {
        id: 5,
        name: "Santa's Workshop",
        description: "Generates +100 canes/sec",
        baseCost: 5000,
        baseEffect: 100,
        type: "passive",
        emoji: "🏭"
    },
    {
        id: 6,
        name: "Gingerbread Factory",
        description: "Generates +1K canes/sec",
        baseCost: 50000,
        baseEffect: 1000,
        type: "passive",
        emoji: "🍪"
    },
    {
        id: 7,
        name: "Snow Globe Production",
        description: "Generates +10K canes/sec",
        baseCost: 500000,
        baseEffect: 10000,
        type: "passive",
        emoji: "❄️"
    },
    {
        id: 8,
        name: "Candy Cane Empire",
        description: "Generates +100K canes/sec",
        baseCost: 5000000,
        baseEffect: 100000,
        type: "passive",
        emoji: "🍭"
    },
    {
        id: 9,
        name: "North Pole HQ",
        description: "Generates +1M canes/sec",
        baseCost: 50000000,
        baseEffect: 1000000,
        type: "passive",
        emoji: "🏔️"
    }
];

// Shop Costs
const shopCosts = {
    1: 1000,
    2: 100000 // more reasonable than 1B
};

// Active upgrades on field
const activeUpgrades = [];

// DOM Elements
const present = document.getElementById('present');
const presentContainer = document.getElementById('present-container');
const candyCounter = document.getElementById('candy-counter');
const clickEffect = document.getElementById('click-effect');
const snowCanvas = document.getElementById('snow-canvas');
const modalOverlay = document.getElementById('modal-overlay');
const upgradesToggle = document.getElementById('upgrades-toggle');
const shopToggle = document.getElementById('shop-toggle');
const inventoryToggle = document.getElementById('inventory-toggle');
const upgradesPanel = document.getElementById('upgrades-panel');
const shopPanel = document.getElementById('shop-panel');
const inventoryPanel = document.getElementById('inventory-panel');
const approveBtn = document.getElementById('approve-btn');
const emailBody = document.getElementById('email-body');
const purchasePopupOverlay = document.getElementById('purchase-popup-overlay');
const purchaseItemName = document.getElementById('purchase-item-name');
const thankyouModal = document.getElementById('thankyou-modal');
const thankyouModalOverlay = document.getElementById('thankyou-modal-overlay');
// Sound control elements
const bgVolumeInput = document.getElementById('bg-volume');
const sfxVolumeInput = document.getElementById('sfx-volume');

// Audio objects (initialized later)
let bgAudio = null;
let sfxAudio = null;
let bgAudioSrc = null;
let sfxAudioSrc = null;

// Snow Animation
let snowflakes = [];
let animationId = null;

function initSnow() {
    const ctx = snowCanvas.getContext('2d');
    snowCanvas.width = window.innerWidth;
    snowCanvas.height = window.innerHeight;

    // Create snowflakes (reduced count for performance)
    for (let i = 0; i < 60; i++) {
        snowflakes.push({
            x: Math.random() * snowCanvas.width,
            y: Math.random() * snowCanvas.height,
            radius: Math.random() * 3 + 1,
            speed: Math.random() * 2 + 0.5,
            opacity: Math.random() * 0.5 + 0.3
        });
    }

    function animateSnow() {
        ctx.clearRect(0, 0, snowCanvas.width, snowCanvas.height);

        snowflakes.forEach(flake => {
            ctx.beginPath();
            ctx.arc(flake.x, flake.y, flake.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
            ctx.fill();

            flake.y += flake.speed;
            flake.x += Math.sin(flake.y * 0.01) * 0.5;

            if (flake.y > snowCanvas.height) {
                flake.y = 0;
                flake.x = Math.random() * snowCanvas.width;
            }
        });

        animationId = requestAnimationFrame(animateSnow);
    }

    // Pause/resume snow when tab visibility changes to reduce CPU usage
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            if (animationId) cancelAnimationFrame(animationId);
            animationId = null;
        } else {
            if (!animationId) animateSnow();
        }
    });

    animateSnow();
}

// Format numbers with scientific notation
function formatNumber(num) {
    if (num >= 1e12) {
        return (num / 1e12).toFixed(2) + 'T';
    } else if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    } else if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    } else if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    }
    return Math.floor(num).toLocaleString();
}

// Calculate upgrade cost
function getUpgradeCost(upgradeId) {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    const level = gameState.upgradeLevels[upgradeId] || 0;
    // gentler exponential growth so upgrades stay reasonable
    return Math.floor(upgrade.baseCost * Math.pow(1.35, level));
}

// Get upgrade effect
function getUpgradeEffect(upgradeId) {
    const upgrade = upgrades.find(u => u.id === upgradeId);
    const level = gameState.upgradeLevels[upgradeId] || 0;
    return upgrade.baseEffect * level;
}

// Initialize
function init() {
    loadGameState();
    initSnow();
    setupEventListeners();
    generateUpgradeUI();
    startGameLoop();
    updateDisplay();
    updateAllUI();
    initAudio();
}

// Setup Event Listeners
function setupEventListeners() {
    // Present Click
    present.addEventListener('click', handlePresentClick);

    // Toggle Buttons
    upgradesToggle.addEventListener('click', () => togglePanel('upgrades-panel', upgradesToggle));
    shopToggle.addEventListener('click', () => togglePanel('shop-panel', shopToggle));
    inventoryToggle.addEventListener('click', () => togglePanel('inventory-panel', inventoryToggle));

    // Panel Close Buttons
    document.querySelectorAll('.panel-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const panelId = e.target.getAttribute('data-panel');
            closePanel(panelId);
        });
    });

    // Upgrade Buttons (delegated)
    document.getElementById('upgrades-content').addEventListener('click', (e) => {
        const btn = e.target.closest('[data-upgrade]');
        if (btn && !btn.disabled) {
            e.preventDefault();
            e.stopPropagation();
            const upgradeId = parseInt(btn.getAttribute('data-upgrade'));
            buyUpgrade(upgradeId);
        }
    });

    // Shop Buttons
    document.querySelectorAll('[data-shop]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const shopId = parseInt(e.target.closest('[data-shop]').getAttribute('data-shop'));
            buyShopItem(shopId);
        });
    });

    // Inventory Items (delegated)
    document.getElementById('inventory-panel').addEventListener('click', (e) => {
        const item = e.target.closest('[data-item]');
        if (item && !item.classList.contains('locked')) {
            const itemId = parseInt(item.getAttribute('data-item'));
            if (itemId === 1) {
                // First item clicked - show thank you message
                openModal('thankyou-modal');
            } else if (itemId === 2) {
                // Letter to Santa clicked - trigger game end
                openModal('game-end-modal');
            }
        }
    });

    // Modal Close
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-modal');
            if (modalId) {
                closeModal(modalId);
            }
        });
    });

    modalOverlay.addEventListener('click', () => {
        closeModal('game-end-modal');
    });

    thankyouModalOverlay.addEventListener('click', () => {
        closeModal('thankyou-modal');
    });

    // Purchase Popup Close
    purchasePopupOverlay.addEventListener('click', () => {
        closePurchasePopup();
    });

    // Approve Button
    approveBtn.addEventListener('click', handleApprove);

    // Window resize
    window.addEventListener('resize', () => {
        snowCanvas.width = window.innerWidth;
        snowCanvas.height = window.innerHeight;
    });

    // Volume sliders handlers
    if (bgVolumeInput) {
        bgVolumeInput.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            if (bgAudio) bgAudio.volume = v;
            localStorage.setItem('bgVolume', v);
        });
    }
    if (sfxVolumeInput) {
        sfxVolumeInput.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value);
            if (sfxAudio) sfxAudio.volume = v;
            localStorage.setItem('sfxVolume', v);
        });
    }

    // (debug play buttons removed)
}

// Handle Present Click
function handlePresentClick(e) {
    // Add candy canes
    gameState.candyCanes += gameState.clickMultiplier;
    
    // Bounce animation
    present.classList.add('bouncing');
    setTimeout(() => {
        present.classList.remove('bouncing');
    }, 300);
    
    // Show click effect
    showClickEffect(e);
    
    // Update display
    updateDisplay();
    // Update buttons if panels are open
    if (upgradesPanel && upgradesPanel.classList.contains('active')) {
        updateUpgradeButtons();
    }
    if (shopPanel && shopPanel.classList.contains('active')) {
        updateShopButtons();
    }
    saveGameState();
}

// Show Click Effect
function showClickEffect(e) {
    const rect = present.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    clickEffect.textContent = `+${formatNumber(gameState.clickMultiplier)}`;
    clickEffect.style.left = x + 'px';
    clickEffect.style.top = y + 'px';
    clickEffect.style.animation = 'none';
    
    // Trigger animation
    setTimeout(() => {
        clickEffect.style.animation = 'float-up 1s ease-out forwards';
    }, 10);
}

// Game Loop (using requestAnimationFrame)
let lastTime = 0;
function startGameLoop() {
    function gameLoop(timestamp) {
        try {
            const deltaTime = timestamp - lastTime;
            lastTime = timestamp;

            // Auto-clicker (update every frame, but apply per second)
            if (gameState.autoClickRate > 0) {
                const increment = (gameState.autoClickRate * deltaTime) / 1000;
                gameState.candyCanes += increment;
                updateDisplay();
                // Update buttons when candy canes change
                try {
                    if (upgradesPanel && upgradesPanel.classList.contains('active')) updateUpgradeButtons();
                } catch (e) { console.warn('updateUpgradeButtons error', e); }
                try {
                    if (shopPanel && shopPanel.classList.contains('active')) updateShopButtons();
                } catch (e) { console.warn('updateShopButtons error', e); }
                saveGameState();
            }
        } catch (e) {
            console.error('gameLoop error', e);
        } finally {
            requestAnimationFrame(gameLoop);
        }
    }
    requestAnimationFrame(gameLoop);
}

// Toggle Panel
function togglePanel(panelId, toggleBtn) {
    const panel = document.getElementById(panelId);
    const isActive = panel.classList.contains('active');
    // Allow multiple panels open: toggle without closing others
    if (!isActive) {
        panel.classList.add('active');
        toggleBtn.classList.add('active');

        // Update UI when opening panels
        if (panelId === 'upgrades-panel') {
            updateUpgradeButtons();
        } else if (panelId === 'shop-panel') {
            updateShopButtons();
        } else if (panelId === 'inventory-panel') {
            updateInventory();
        }
    } else {
        // close if already active
        panel.classList.remove('active');
        toggleBtn.classList.remove('active');
    }
}

// Close Panel
function closePanel(panelId) {
    const panel = document.getElementById(panelId);
    panel.classList.remove('active');
    
    // Remove active from corresponding toggle
    if (panelId === 'upgrades-panel') {
        upgradesToggle.classList.remove('active');
    } else if (panelId === 'shop-panel') {
        shopToggle.classList.remove('active');
    } else if (panelId === 'inventory-panel') {
        inventoryToggle.classList.remove('active');
    }
}

// Close All Panels
function closeAllPanels() {
    document.querySelectorAll('.side-panel, .bottom-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    document.querySelectorAll('.toggle-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

// Generate Upgrade UI
function generateUpgradeUI() {
    const container = document.getElementById('upgrades-content');
    container.innerHTML = '';

    upgrades.forEach(upgrade => {
        const level = gameState.upgradeLevels[upgrade.id] || 0;
        const cost = getUpgradeCost(upgrade.id);
        const effect = getUpgradeEffect(upgrade.id);

        const item = document.createElement('div');
        item.className = 'upgrade-item';
        item.innerHTML = `
            <div class="upgrade-info">
                <h3>${upgrade.name}</h3>
                <p>${upgrade.description}</p>
                ${level > 0 ? `<div class="upgrade-level">Level ${level}</div>` : ''}
            </div>
            <button class="buy-btn" data-upgrade="${upgrade.id}" ${gameState.candyCanes < cost ? 'disabled' : ''} type="button">
                <span class="btn-text">${level === 0 ? `Buy ${upgrade.name}` : `Upgrade ${upgrade.name} (Lvl ${level})`}</span>
                <span class="price">${formatNumber(cost)} 🍭</span>
            </button>
        `;
        container.appendChild(item);
    });
}

// Buy Upgrade
function buyUpgrade(upgradeId) {
    const cost = getUpgradeCost(upgradeId);
    
    if (gameState.candyCanes < cost) {
        return;
    }

    gameState.candyCanes -= cost;
    gameState.upgradeLevels[upgradeId] = (gameState.upgradeLevels[upgradeId] || 0) + 1;

    const upgrade = upgrades.find(u => u.id === upgradeId);
    if (upgrade.type === 'click') {
        gameState.clickMultiplier = 1;
        upgrades.forEach(u => {
            if (u.type === 'click') {
                const level = gameState.upgradeLevels[u.id] || 0;
                if (level > 0) {
                    gameState.clickMultiplier += u.baseEffect * level;
                }
            }
        });
    } else if (upgrade.type === 'passive') {
        gameState.autoClickRate = 0;
        upgrades.forEach(u => {
            if (u.type === 'passive') {
                const level = gameState.upgradeLevels[u.id] || 0;
                if (level > 0) {
                    gameState.autoClickRate += u.baseEffect * level;
                }
            }
        });
        
        // Show upgrade on field if it's passive
        showUpgradeOnField(upgrade);
    }

    updateDisplay();
    // Regenerate UI to show updated levels
    generateUpgradeUI();
    updateShopButtons();
    updateInventory();
    // play purchase sound
    console.log('buyUpgrade: playing purchase SFX for upgrade', upgradeId);
    playPurchaseSfx();
    saveGameState();
}

// Show upgrade on field
function showUpgradeOnField(upgrade) {
    // Check if upgrade already exists on field
    let upgradeEl = document.querySelector(`[data-upgrade-id="${upgrade.id}"]`);
    
    const level = gameState.upgradeLevels[upgrade.id] || 0;
    const totalEffect = upgrade.baseEffect * level;
    
    if (!upgradeEl) {
        // Create new upgrade element
        upgradeEl = document.createElement('div');
        upgradeEl.className = 'field-upgrade';
        upgradeEl.dataset.upgradeId = upgrade.id;
        
        // Random position around center
        const angle = Math.random() * Math.PI * 2;
        const distance = 150 + Math.random() * 100;
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        upgradeEl.style.left = `calc(50% + ${x}px)`;
        upgradeEl.style.top = `calc(50% + ${y}px)`;
        
        upgradeEl.innerHTML = `
            <div class="field-upgrade-emoji">${upgrade.emoji}</div>
            <div class="field-upgrade-name">${upgrade.name}</div>
            <div class="field-upgrade-effect">+${formatNumber(totalEffect)}/sec</div>
        `;
        
        presentContainer.appendChild(upgradeEl);
        
        // Animate in
        setTimeout(() => {
            upgradeEl.classList.add('bounce-in');
        }, 10);
    } else {
        // Update existing upgrade
        const effectEl = upgradeEl.querySelector('.field-upgrade-effect');
        if (effectEl) {
            effectEl.textContent = `+${formatNumber(totalEffect)}/sec`;
        }
        // Bounce animation
        upgradeEl.style.animation = 'none';
        setTimeout(() => {
            upgradeEl.style.animation = 'bounce-in 0.5s ease-out';
        }, 10);
    }
}

// Buy Shop Item
function buyShopItem(shopId) {
    if (gameState.inventory[shopId]) {
        return;
    }

    const cost = shopCosts[shopId];
    if (gameState.candyCanes < cost) {
        return;
    }

    gameState.candyCanes -= cost;
    gameState.inventory[shopId] = true;

    // Get item name
    const itemNames = {
        1: "Support little software engineer student",
        2: "Letter to Santa"
    };
    
    // Show purchase popup
    showPurchasePopup(itemNames[shopId]);

    // play thank you SFX
    console.log('buyShopItem: attempting SFX for shop', shopId);
    playPurchaseSfx();

    updateDisplay();
    updateShopButtons();
    updateInventory();
    saveGameState();
}

// Show Purchase Popup
function showPurchasePopup(itemName) {
    purchaseItemName.textContent = itemName;
    purchasePopupOverlay.classList.add('active');
}

// Close Purchase Popup
function closePurchasePopup() {
    purchasePopupOverlay.classList.remove('active');
}

// Open Modal
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        if (modalId === 'game-end-modal') {
            modalOverlay.classList.add('active');
        } else if (modalId === 'thankyou-modal') {
            thankyouModalOverlay.classList.add('active');
        }
    }
}

// Close Modal
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
    if (modalId === 'game-end-modal') {
        modalOverlay.classList.remove('active');
    } else if (modalId === 'thankyou-modal') {
        thankyouModalOverlay.classList.remove('active');
    }
}

// Update Display
function updateDisplay() {
    candyCounter.textContent = formatNumber(gameState.candyCanes);
}

// Update Upgrade Buttons (without regenerating)
function updateUpgradeButtons() {
    upgrades.forEach(upgrade => {
        const level = gameState.upgradeLevels[upgrade.id] || 0;
        const cost = getUpgradeCost(upgrade.id);
        const btn = document.querySelector(`[data-upgrade="${upgrade.id}"]`);
        
        if (btn) {
            const canAfford = gameState.candyCanes >= cost;
            btn.disabled = !canAfford;
            
            const priceSpan = btn.querySelector('.price');
            const btnText = btn.querySelector('.btn-text');
            
            if (priceSpan) {
                priceSpan.textContent = `${formatNumber(cost)} 🍭`;
            }
            
            if (btnText) {
                btnText.textContent = level === 0 ? `Buy ${upgrade.name}` : `Upgrade ${upgrade.name} (Lvl ${level})`;
            }
        }
    });
}

// Update All UI
function updateAllUI() {
    generateUpgradeUI();
    updateShopButtons();
    updateInventory();
}

// Update Shop Buttons
function updateShopButtons() {
    for (let i = 1; i <= 2; i++) {
        try {
            const shopItem = document.getElementById(`shop-item-${i}`);
            const priceEl = document.getElementById(`shop-price-${i}`);
            const cost = shopCosts[i];
            if (priceEl) priceEl.textContent = formatNumber(cost);
            if (!shopItem) continue;
            const buyBtn = shopItem.querySelector('.buy-btn');

            if (gameState.inventory[i]) {
                shopItem.classList.add('owned');
                if (buyBtn) {
                    buyBtn.disabled = true;
                    buyBtn.innerHTML = '<span>OWNED</span>';
                }
            } else {
                shopItem.classList.remove('owned');
                if (buyBtn) buyBtn.disabled = gameState.candyCanes < cost;
            }
        } catch (e) {
            console.warn('updateShopButtons error for item', i, e);
            continue;
        }
    }
}

// Update Inventory
function updateInventory() {
    for (let i = 1; i <= 2; i++) {
        const invItem = document.getElementById(`inv-item-${i}`);
        if (gameState.inventory[i]) {
            invItem.classList.remove('locked');
        } else {
            invItem.classList.add('locked');
        }
    }
}

// Handle Approve
function handleApprove() {
    emailBody.innerHTML = `
        <p><strong>Yes, you have approved the purchase for your brother.</strong></p>
        <p>Anyways, please tell that dude how much you can support him. (Pls, this website took a lot of hours from this guy's gaming time to build. And yes there's AI involved in this project but more likely for learning—like if we can use emojis instead of drawing things, or how to make a snowfall effect, mostly effects thing cus I'm sucks at UI. Overall It's honest work!)</p>
    `;
    approveBtn.style.display = 'none';
}

// Audio initialization and helpers
function initAudio() {
    try {
        // filenames (exact names in audio folder)
        const bgFile = "I don't want a lot for Christmas.mp3";
        const sfxFile = 'ThankYou.mp3';

        // candidate paths to try (raw, encodeURI, encodeURIComponent)
        const candidates = (name) => [
            'audio/' + name,
            'audio/' + encodeURI(name),
            'audio/' + encodeURIComponent(name)
        ];

        // helper to try loading audio from candidates and resolve when playable
        const tryLoad = (name) => {
            return new Promise((resolve, reject) => {
                const paths = candidates(name);
                let idx = 0;

                function attempt() {
                    if (idx >= paths.length) return reject(new Error('All audio paths failed: ' + name));
                    const p = paths[idx++];
                    const a = new Audio(p);
                    a.preload = 'auto';
                    const onCan = () => {
                        a.removeEventListener('canplaythrough', onCan);
                        a.removeEventListener('error', onErr);
                        resolve({ audio: a, src: p });
                    };
                    const onErr = (e) => {
                        a.removeEventListener('canplaythrough', onCan);
                        a.removeEventListener('error', onErr);
                        // try next
                        setTimeout(attempt, 50);
                    };
                    a.addEventListener('canplaythrough', onCan);
                    a.addEventListener('error', onErr);
                    // kick network by reading src
                    a.src = p;
                    // small timeout fallback
                    setTimeout(() => {
                        // if not resolved yet, allow next attempt in onErr or timeout
                    }, 800);
                }
                attempt();
            });
        };

        // load bg and sfx (best-effort)
        tryLoad(bgFile).then(result => {
            bgAudio = result.audio;
            bgAudio.loop = true;
            bgAudioSrc = result.src;
            const savedBg = parseFloat(localStorage.getItem('bgVolume'));
            bgAudio.volume = !isNaN(savedBg) ? savedBg : 0.25;
            if (bgVolumeInput) bgVolumeInput.value = bgAudio.volume;
            console.log('BG audio loaded', bgAudioSrc);

            // try to play immediately; if blocked, set up resume on interaction
            bgAudio.play().then(() => {
                console.log('BG autoplay succeeded');
            }).catch((err) => {
                console.warn('BG autoplay blocked, will resume on interaction', err);
                // attempt muted autoplay to satisfy policy, then unmute on user gesture
                bgAudio.muted = true;
                bgAudio.play().catch(() => {});
                const resume = () => {
                    bgAudio.muted = false;
                    bgAudio.play().catch(e => console.warn('BG resume failed', e));
                    document.removeEventListener('click', resume);
                    document.removeEventListener('keydown', resume);
                };
                document.addEventListener('click', resume);
                document.addEventListener('keydown', resume);
            });
        }).catch(err => console.warn('BG failed to load', err));

        tryLoad(sfxFile).then(result => {
            sfxAudio = result.audio;
            sfxAudioSrc = result.src;
            const savedSfx = parseFloat(localStorage.getItem('sfxVolume'));
            sfxAudio.volume = !isNaN(savedSfx) ? savedSfx : 0.8;
            if (sfxVolumeInput) sfxVolumeInput.value = sfxAudio.volume;
            console.log('SFX audio loaded', sfxAudioSrc);
        }).catch(err => console.warn('SFX failed to load', err));

        // proactive diagnostics: try fetch heads (non-blocking)
        testAudioFiles('audio/' + bgFile, 'audio/' + sfxFile);
            // if autoplay didn't start, show a small prompt to enable sound after load
            setTimeout(() => {
                if (bgAudio && (bgAudio.paused || bgAudio.muted)) {
                    showEnableSoundPrompt();
                }
            }, 1200);
    } catch (e) {
        console.warn('Audio init failed', e);
    }
}

    function showEnableSoundPrompt() {
        if (document.getElementById('enable-sound-prompt')) return;
        const wrap = document.createElement('div');
        wrap.id = 'enable-sound-prompt';
        wrap.style.position = 'fixed';
        wrap.style.bottom = '20px';
        wrap.style.left = '50%';
        wrap.style.transform = 'translateX(-50%)';
        wrap.style.background = 'rgba(15,23,42,0.95)';
        wrap.style.color = '#e0e0e0';
        wrap.style.padding = '10px 14px';
        wrap.style.borderRadius = '10px';
        wrap.style.zIndex = 9999;
        wrap.style.boxShadow = '0 8px 30px rgba(0,0,0,0.5)';
        wrap.innerHTML = `<span style="margin-right:10px;">Enable sound for music and SFX</span>`;
        const btn = document.createElement('button');
        btn.textContent = 'Enable';
        btn.style.padding = '6px 10px';
        btn.style.borderRadius = '8px';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.addEventListener('click', () => {
            if (bgAudio) {
                bgAudio.muted = false;
                bgAudio.play().catch(err => console.warn('BG play on enable failed', err));
            }
            if (sfxAudio) {
                // warm up sfx
                sfxAudio.play().then(() => sfxAudio.pause()).catch(() => {});
            }
            wrap.remove();
        });
        wrap.appendChild(btn);
        document.body.appendChild(wrap);
    }

// fetch audio files to check if they're reachable and log status
function testAudioFiles(bgPath, sfxPath) {
    try {
        fetch(bgPath, { method: 'HEAD' }).then(res => {
            console.log('BG fetch HEAD status:', res.status, bgPath);
        }).catch(err => console.warn('BG fetch failed', err, bgPath));

        fetch(sfxPath, { method: 'HEAD' }).then(res => {
            console.log('SFX fetch HEAD status:', res.status, sfxPath);
        }).catch(err => console.warn('SFX fetch failed', err, sfxPath));
    } catch (e) {
        console.warn('testAudioFiles error', e);
    }
}

function playPurchaseSfx() {
    const src = sfxAudioSrc || (sfxAudio && sfxAudio.src);
    if (!src) {
        // try common candidates immediately (don't wait for preloading)
        const name = 'ThankYou.mp3';
        const candidates = ['audio/' + name, 'audio/' + encodeURI(name), 'audio/' + encodeURIComponent(name)];
        for (let i = 0; i < candidates.length; i++) {
            try {
                const a = new Audio(candidates[i]);
                a.volume = sfxAudio && typeof sfxAudio.volume === 'number' ? sfxAudio.volume : 0.8;
                a.play().then(() => {
                    console.log('SFX played from candidate', candidates[i]);
                }).catch(err => {
                    console.warn('Candidate SFX play failed', candidates[i], err);
                });
                // don't return immediately; allow multiple attempts but continue
            } catch (e) {
                console.warn('SFX candidate creation error', e);
            }
        }
        return;
    }
    try {
        const a = new Audio(src);
        a.volume = sfxAudio && typeof sfxAudio.volume === 'number' ? sfxAudio.volume : 0.8;
        a.preload = 'auto';
        a.play().catch(err => {
            console.warn('SFX play failed, trying fallback', err);
            try {
                if (sfxAudio) {
                    const clone = sfxAudio.cloneNode(true);
                    clone.volume = sfxAudio.volume;
                    clone.play().catch(e => console.warn('SFX clone fallback failed', e));
                }
            } catch (e) {
                console.warn('SFX fallback error', e);
            }
        });
    } catch (e) {
        console.warn('playPurchaseSfx error', e);
    }
}

// Save Game State
function saveGameState() {
    try {
        localStorage.setItem('candyCanesClicker', JSON.stringify({
            candyCanes: gameState.candyCanes,
            upgradeLevels: gameState.upgradeLevels,
            inventory: gameState.inventory
        }));
    } catch (e) {
        console.error('Failed to save game state:', e);
    }
}

// Load Game State
function loadGameState() {
    try {
        const saved = localStorage.getItem('candyCanesClicker');
        if (saved) {
            const data = JSON.parse(saved);
            gameState.candyCanes = data.candyCanes || 0;
            gameState.upgradeLevels = data.upgradeLevels || {};
            gameState.inventory = data.inventory || { 1: false, 2: false };

            // Recalculate multipliers
            gameState.clickMultiplier = 1;
            gameState.autoClickRate = 0;

            upgrades.forEach(u => {
                const level = gameState.upgradeLevels[u.id] || 0;
                if (level > 0) {
                    if (u.type === 'click') {
                        gameState.clickMultiplier += u.baseEffect * level;
                    } else if (u.type === 'passive') {
                        gameState.autoClickRate += u.baseEffect * level;
                    }
                }
            });
        }
    } catch (e) {
        console.error('Failed to load game state:', e);
    }
}

// Initialize the game
init();

let DEBUG_SHOW_AREA_LINES = true; // 設置為 false 可關閉調試虛線

// ==================== 可調整參數（基礎值，會根據螢幕大小自動調整） ====================
const BASE_CARD_SIZE = 60;
const COLS = 6;
const ROWS = 7;

// ==================== 音效配置 ====================
const CLICK_SOUND_URL = 'images/click.mp3';
const BGM1_URL = 'images/bgm1.mp3';
const BGM2_URL = 'images/bgm2.mp3';

let clickAudio = null;
let bgmAudio = null;
let currentBgmIndex = 1;
let bgmEnabled = true;
let sfxEnabled = true;

// ==================== 洗牌次數限制 ====================
let shuffleRemainingCount = 3;

// ==================== 關卡選擇器 ====================
let settingsVisible = false;
let selectedLevel = 1;

// ==================== 禁止位置配置 ====================
let forbiddenPositions = [];

// ==================== 動態縮放變數 ====================
let CARD_SIZE, GRID_STEP, HALF_SHIFT;
let PAD_LEFT, PAD_TOP;
let SLOT_X_OFFSET, SLOT_Y_OFFSET, BTN_Y_OFFSET;

// ✅ 新增：UI 元素的動態變數
let TITLE_WIDTH, TITLE_HEIGHT, TITLE_X, TITLE_Y;
let COIN_WIDTH, COIN_HEIGHT, COIN_X, COIN_Y;
let SCORE_BG_WIDTH, SCORE_BG_HEIGHT, SCORE_BG_X, SCORE_BG_Y;
let SCORE_FONT_SIZE, SCORE_TEXT_X, SCORE_TEXT_Y;
let INFO_FONT_SIZE;
let REMAIN_TEXT_X, REMAIN_TEXT_Y;


// 添加按钮之间的间距变量
const BTN_GAP = 20; // 两个按钮之间的间距

// ✅ 新增：關卡按鈕數組
let levelButtons1 = [];
let levelButtons2 = [];

// ==================== 累積總分（跨關卡） ====================
let totalScore = 0;
function calculateDynamicSizes() {
    const sys = wx.getSystemInfoSync();
    const screenWidth = sys.screenWidth;
    const screenHeight = sys.screenHeight;

    // 定義百分比佈局區域
    const TOP_AREA_HEIGHT = screenHeight * 0.20;
    const MIDDLE_AREA_HEIGHT = screenHeight * 0.60;
    const BOTTOM_AREA_HEIGHT = screenHeight * 0.20;
    const MIDDLE_AREA_START = TOP_AREA_HEIGHT;

    // 根據卡牌網格計算所需空間
    const gridWidth = (COLS + 1) * BASE_CARD_SIZE;
    const gridHeight = (ROWS + 1) * BASE_CARD_SIZE;

    // 卡槽高度為 CARD_SIZE 的兩倍
    const slotHeight = BASE_CARD_SIZE * 2;
    const extraPadding = 20; // 額外邊距

    // 計算卡牌+卡槽的總所需高度
    const totalContentHeightNeeded = gridHeight + slotHeight + extraPadding;

    // 計算縮放比例（基於高度）
    let scaleFactor = MIDDLE_AREA_HEIGHT / totalContentHeightNeeded;

    // 同時考慮寬度限制
    const gridWidthNeeded = gridWidth + BASE_CARD_SIZE;
    const scaleFactorForWidth = screenWidth / gridWidthNeeded;
    scaleFactor = Math.min(scaleFactor, scaleFactorForWidth, 1.0);

    // 應用縮放
    CARD_SIZE = Math.round(BASE_CARD_SIZE * scaleFactor);
    GRID_STEP = CARD_SIZE;
    HALF_SHIFT = CARD_SIZE / 2;

    // 計算縮放後的實際尺寸
    const actualGridWidth = COLS * GRID_STEP;
    const actualGridHeight = ROWS * GRID_STEP;
    const actualSlotHeight = CARD_SIZE * 2;
    const actualTotalHeight = actualGridHeight + actualSlotHeight + extraPadding;

    // 水平居中
    PAD_LEFT = (screenWidth - actualGridWidth) / 2;

    // 垂直居中在中間區域
    PAD_TOP = MIDDLE_AREA_START + (MIDDLE_AREA_HEIGHT - actualTotalHeight) / 2;

    // 卡槽位置（固定在中间区域底部）
    const BOTTOM_AREA_START = screenHeight * 0.20 + screenHeight * 0.60; // 中间区域底部
    SLOT_X_OFFSET = 0;  // 水平不需要額外偏移，因為 PAD_LEFT 已經處理了居中
    SLOT_Y_OFFSET = BOTTOM_AREA_START - PAD_TOP - (CARD_SIZE * 2) - 10;  // 中间区域底部 - 卡槽高度 - 10px边距
    BTN_Y_OFFSET = 0;

    // === 標題圖片動態尺寸 ===
    const titleAreaWidth = screenWidth * 0.8;
    const titleAspectRatio = 528 / 200;

    TITLE_WIDTH = Math.min(titleAreaWidth, Math.round(screenWidth * 0.7));
    TITLE_HEIGHT = Math.round(TITLE_WIDTH / titleAspectRatio);
    TITLE_X = (screenWidth - TITLE_WIDTH) / 2;
    TITLE_Y = TOP_AREA_HEIGHT * 0.1;

    // === 金幣圖片動態尺寸與位置 ===
    const coinScale = scaleFactor * 0.45;

    COIN_WIDTH = Math.round(100 * coinScale);
    COIN_HEIGHT = Math.round(127 * coinScale);

    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
    const menuButtonBottom = menuButtonInfo.bottom;

    const rightEdge = screenWidth - 20;
    const topBase = Math.max(menuButtonBottom + 15, TOP_AREA_HEIGHT * 0.3);

    SCORE_BG_WIDTH = Math.round(140 * scaleFactor);
    SCORE_BG_HEIGHT = Math.round(40 * scaleFactor);

    SCORE_BG_X = rightEdge - SCORE_BG_WIDTH;
    SCORE_BG_Y = topBase;

    COIN_X = SCORE_BG_X + Math.round(12 * scaleFactor);
    COIN_Y = SCORE_BG_Y + Math.round((SCORE_BG_HEIGHT - COIN_HEIGHT) / 2);

    SCORE_FONT_SIZE = Math.round(22 * scaleFactor);
    SCORE_TEXT_X = COIN_X + COIN_WIDTH + Math.round(8 * scaleFactor);
    SCORE_TEXT_Y = SCORE_BG_Y + Math.round(SCORE_BG_HEIGHT * 0.68);

    INFO_FONT_SIZE = Math.round(18 * scaleFactor);

    REMAIN_TEXT_X = COIN_X + Math.round(8 * scaleFactor);
    REMAIN_TEXT_Y = SCORE_BG_Y + Math.round(SCORE_BG_HEIGHT * 1.65);

    // === 底部按鈕位置 ===
    const BTN_WIDTH = Math.round(95 * scaleFactor);
    const BTN_HEIGHT = Math.round(42 * scaleFactor);


    const BTN_CENTER_Y = BOTTOM_AREA_START + (BOTTOM_AREA_HEIGHT / 2) - (BTN_HEIGHT / 2);

    const totalButtonsWidth = BTN_WIDTH * 2 + BTN_GAP;
    const startX = (screenWidth - totalButtonsWidth) / 2;

    shuffleBtnRect = {
        x: startX,
        y: BTN_CENTER_Y,
        w: BTN_WIDTH,
        h: BTN_HEIGHT
    };

    resetBtnRect = {
        x: startX + BTN_WIDTH + BTN_GAP,
        y: BTN_CENTER_Y,
        w: BTN_WIDTH,
        h: BTN_HEIGHT
    };

    console.log(`========== 動態尺寸計算 ==========`);
    console.log(`螢幕尺寸: ${screenWidth}x${screenHeight}`);
    console.log(`縮放比例: ${scaleFactor}, 卡牌大小: ${CARD_SIZE}`);
    console.log(`網格區域: ${actualGridWidth}x${actualGridHeight}`);
    console.log(`PAD_LEFT: ${PAD_LEFT}, PAD_TOP: ${PAD_TOP}`);
    console.log(`卡槽偏移: (${SLOT_X_OFFSET}, ${SLOT_Y_OFFSET})`);
    console.log(`中間區域: Y=${MIDDLE_AREA_START} 到 ${MIDDLE_AREA_START + MIDDLE_AREA_HEIGHT}`);
    console.log(`內容範圍: Y=${PAD_TOP} 到 ${PAD_TOP + actualTotalHeight}`);
    console.log(`=================================`);
}
function generateForbiddenPositions(level) {
    const forbiddenCount = 10 + (level - 1) * 3;
    const allBasePositions = generateBaseGridForForbidden();

    for (let i = allBasePositions.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [allBasePositions[i], allBasePositions[j]] = [allBasePositions[j], allBasePositions[i]];
    }

    return allBasePositions.slice(0, forbiddenCount);
}

function generateBaseGridForForbidden() {
    let points = [];
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            points.push({
                x: BASE_MIN_X + c * GRID_STEP,
                y: BASE_MIN_Y + r * GRID_STEP
            });
        }
    }
    return points;
}

function isPositionForbidden(x, y) {
    for (let pos of forbiddenPositions) {
        if (Math.abs(pos.x - x) < 1 && Math.abs(pos.y - y) < 1) {
            return true;
        }
    }
    return false;
}

function getAvailableBasePositions(layer, existingCards) {
    let occupied = new Set();
    for (let c of existingCards) {
        if (c.layer === layer) occupied.add(`${c.x},${c.y}`);
    }
    return BASE_POSITIONS.filter(p => {
        if (occupied.has(`${p.x},${p.y}`)) return false;
        if (isPositionForbidden(p.x, p.y)) return false;
        return true;
    });
}

// ==================== 關卡配置 ====================
function getLevelConfig(level) {
    let layers = 5 + (level - 1) * 2;
    let cardsPerLayer = 18;
    return { layers, cardsPerLayer };
}

// ==================== 圖片資源配置 ====================
const CARD_IMAGES = {
    'drill': 'card_drill.png',
    'driver': 'card_driver.png',
    'goggle': 'card_goggle.png',
    'hammer': 'card_hammer.png',
    'machine': 'card_machine.png',
    'plier': 'card_plier.png',
    'resistor': 'card_resistor.png',
    'screw': 'card_screw.png',
    'vr': 'card_vr.png',
    'wrench': 'card_wrench.png'
};

const CARD_KEYS = ['drill', 'driver', 'goggle', 'hammer', 'machine', 'plier', 'resistor', 'screw', 'vr', 'wrench'];
let loadedImages = {};

// ==================== 動畫相關變數 ====================
let activeAnimations = [];

// ==================== 全域變數 ====================
let canvas, ctx;
let gameActive = true;
let currentRoundScore = 0;
let slotCards = [];
let stackCards = [];
let nextCardId = 1;

let currentLevel = 1;
const TOTAL_LEVELS = 10;

let screenWidth, screenHeight;
let offsetX = 0, offsetY = 0;
let cardScale = 1;

// 在全局变量区域添加新的按钮矩形变量（替换原来的）
let resetBtnRect = { x: 0, y: 0, w: 95, h: 42 };
let shuffleBtnRect = { x: 0, y: 0, w: 95, h: 42 };
let settingsBtnRect = { x: 0, y: 0, w: 80, h: 35 };

// 顏色主題
const colors = {
    bg: '#ffffff',
    cardLight: '#fff7e8',
    cardDark: '#e8d8c0',
    border: '#b97f3a',
    text: '#5a2f0a',
    scoreBg: '#2c2b28',
    slotBg: '#e7dbb6',
    titleText: '#5a3c1a',
    subtitleText: '#8b6942',
    remainText: '#4a2e0a',
    settingsPanel: '#fef3dd',
    scoreText: '#ffeaac'
};

// ==================== 動態計算的邊界 ====================
let BASE_MIN_X = 0;
let BASE_MIN_Y = 0;
let BASE_MAX_X = 0;
let BASE_MAX_Y = 0;
let MIN_X = 0;
let MAX_X = 0;
let MIN_Y = 0;
let MAX_Y = 0;
let BASE_POSITIONS = [];

// ==================== 音效初始化 ====================
function initAudio() {
    clickAudio = wx.createInnerAudioContext();
    clickAudio.src = CLICK_SOUND_URL;
    clickAudio.volume = 0.5;
    clickAudio.onError((err) => {
        console.error("點擊音效載入失敗:", err);
    });

    bgmAudio = wx.createInnerAudioContext();
    bgmAudio.src = BGM1_URL;
    bgmAudio.loop = true;
    bgmAudio.volume = 0.4;
    bgmAudio.onError((err) => {
        console.error("背景音樂載入失敗:", err);
    });

    if (bgmEnabled) {
        bgmAudio.play();
    }
}

function playClickSound() {
    if (sfxEnabled && clickAudio) {
        clickAudio.stop();
        clickAudio.play();
    }
}

function toggleBgm() {
    bgmEnabled = !bgmEnabled;
    if (bgmEnabled) {
        bgmAudio.play();
    } else {
        bgmAudio.stop();
    }
}

function toggleSfx() {
    sfxEnabled = !sfxEnabled;
}

function switchBgm() {
    if (currentBgmIndex === 1) {
        currentBgmIndex = 2;
        bgmAudio.src = BGM2_URL;
    } else {
        currentBgmIndex = 1;
        bgmAudio.src = BGM1_URL;
    }
    if (bgmEnabled) {
        bgmAudio.play();
    }
}

// ==================== 圖片載入 ====================
function loadCardImages() {
    return new Promise((resolve) => {
        let loadedCount = 0;
        const totalImages = CARD_KEYS.length + 3; // +3 為標題圖片、金幣圖片和齒輪圖標

        // 載入標題圖片
        const titleImg = wx.createImage();
        titleImg.src = 'images/title.png';
        titleImg.onload = () => {
            loadedCount++;
            loadedImages['title'] = titleImg;
            if (loadedCount === totalImages) {
                console.log(`所有圖片載入完成，共 ${totalImages} 張`);
                resolve();
            }
        };
        titleImg.onerror = (err) => {
            console.error('載入標題圖片失敗:', err);
            loadedCount++;
            loadedImages['title'] = null;
            if (loadedCount === totalImages) {
                resolve();
            }
        };

        // 載入金幣圖片
        const coinImg = wx.createImage();
        coinImg.src = 'images/coin.png';
        coinImg.onload = () => {
            loadedCount++;
            loadedImages['coin'] = coinImg;
            if (loadedCount === totalImages) resolve();
        };
        coinImg.onerror = (err) => {
            console.error('載入金幣圖片失敗:', err);
            loadedCount++;
            loadedImages['coin'] = null;
            if (loadedCount === totalImages) resolve();
        };

        // 載入齒輪圖標（設定按鈕）
        const gearImg = wx.createImage();
        gearImg.src = 'images/gear.png';
        gearImg.onload = () => {
            loadedCount++;
            loadedImages['gear'] = gearImg;
            if (loadedCount === totalImages) resolve();
        };
        gearImg.onerror = (err) => {
            console.error('載入齒輪圖片失敗:', err);
            loadedCount++;
            loadedImages['gear'] = null;
            if (loadedCount === totalImages) resolve();
        };

        // 載入卡牌圖片
        for (let key of CARD_KEYS) {
            const img = wx.createImage();
            img.src = `images/${CARD_IMAGES[key]}`;
            img.onload = () => {
                loadedCount++;
                loadedImages[key] = img;
                if (loadedCount === totalImages) {
                    console.log(`所有卡牌圖片載入完成，共 ${totalImages} 張`);
                    resolve();
                }
            };
            img.onerror = (err) => {
                console.error(`載入圖片失敗: images/${CARD_IMAGES[key]}`, err);
                loadedCount++;
                loadedImages[key] = null;
                if (loadedCount === totalImages) {
                    resolve();
                }
            };
        }
    });
}

// ==================== 基礎網格生成 ====================
function generateBaseGrid() {
    let points = [];
    for (let c = 0; c < COLS; c++) {
        for (let r = 0; r < ROWS; r++) {
            points.push({
                x: BASE_MIN_X + c * GRID_STEP,
                y: BASE_MIN_Y + r * GRID_STEP
            });
        }
    }
    return points;
}

function getOffsetPositionByDir(basePos, dir) {
    const dirs = [
        [0, -HALF_SHIFT], [0, HALF_SHIFT],
        [-HALF_SHIFT, 0], [HALF_SHIFT, 0],
        [-HALF_SHIFT, -HALF_SHIFT], [HALF_SHIFT, -HALF_SHIFT],
        [-HALF_SHIFT, HALF_SHIFT], [HALF_SHIFT, HALF_SHIFT]
    ];
    let [dx, dy] = dirs[dir % dirs.length];
    let x = basePos.x + dx;
    let y = basePos.y + dy;
    if (x >= MIN_X && x <= MAX_X && y >= MIN_Y && y <= MAX_Y) {
        return { x, y };
    }
    return null;
}

// ==================== 重疊檢測 ====================
function doesOverlap(newX, newY, layer, existingCards) {
    const newLeft = newX - CARD_SIZE / 2;
    const newRight = newX + CARD_SIZE / 2;
    const newTop = newY - CARD_SIZE / 2;
    const newBottom = newY + CARD_SIZE / 2;
    for (let c of existingCards) {
        if (c.layer !== layer) continue;
        const left = c.x - CARD_SIZE / 2;
        const right = c.x + CARD_SIZE / 2;
        const top = c.y - CARD_SIZE / 2;
        const bottom = c.y + CARD_SIZE / 2;
        if (newRight > left && newLeft < right && newBottom > top && newTop < bottom) {
            return true;
        }
    }
    return false;
}

// ==================== 關卡生成 ====================
function generateLevel(level) {
    let cfg = getLevelConfig(level);
    let cards = [];
    let id = 1;
    let layerDirs = [];

    for (let layer = 0; layer < cfg.layers; layer++) {
        let targetCount = cfg.cardsPerLayer;
        let availableBase = getAvailableBasePositions(layer, cards);
        let toPlace = Math.min(targetCount, availableBase.length);

        for (let i = availableBase.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [availableBase[i], availableBase[j]] = [availableBase[j], availableBase[i]];
        }

        let layerOffsetDir = -1;
        if (layer === 0) {
            layerOffsetDir = -1;
        } else {
            let availableDirs = [0, 1, 2, 3, 4, 5, 6, 7];
            let prevDir = layerDirs[layer - 1];
            if (prevDir !== -1) {
                availableDirs = availableDirs.filter(d => d !== prevDir);
            }
            if (availableDirs.length === 0) {
                availableDirs = [0, 1, 2, 3, 4, 5, 6, 7];
            }
            let randomIndex = Math.floor(Math.random() * availableDirs.length);
            layerOffsetDir = availableDirs[randomIndex];
        }
        layerDirs.push(layerOffsetDir);

        for (let i = 0; i < toPlace; i++) {
            let basePos = availableBase[i];
            let finalPos = { ...basePos };
            if (layer > 0 && layerOffsetDir !== -1) {
                let offsetPos = getOffsetPositionByDir(basePos, layerOffsetDir);
                if (offsetPos) finalPos = offsetPos;
            }
            cards.push({ id: id++, x: finalPos.x, y: finalPos.y, layer: layer });
        }
    }

    let total = cards.length;
    let remainder = total % 3;
    if (remainder !== 0) {
        let need = 3 - remainder;
        for (let attempt = 0; attempt < need; attempt++) {
            let added = false;
            for (let layer = cfg.layers - 1; layer >= 0 && !added; layer--) {
                let offsetDir = layerDirs[layer];
                let shuffledBase = [...BASE_POSITIONS];
                for (let i = shuffledBase.length - 1; i > 0; i--) {
                    let j = Math.floor(Math.random() * (i + 1));
                    [shuffledBase[i], shuffledBase[j]] = [shuffledBase[j], shuffledBase[i]];
                }
                for (let base of shuffledBase) {
                    if (isPositionForbidden(base.x, base.y)) continue;

                    let candidateX = base.x;
                    let candidateY = base.y;
                    if (layer > 0 && offsetDir !== -1) {
                        let offset = getOffsetPositionByDir(base, offsetDir);
                        if (offset) {
                            candidateX = offset.x;
                            candidateY = offset.y;
                        }
                    }
                    let occupied = false;
                    for (let c of cards) {
                        if (c.layer === layer && Math.abs(c.x - candidateX) < 1 && Math.abs(c.y - candidateY) < 1) {
                            occupied = true;
                            break;
                        }
                    }
                    if (occupied) continue;
                    if (!doesOverlap(candidateX, candidateY, layer, cards)) {
                        cards.push({ id: id++, x: candidateX, y: candidateY, layer: layer });
                        added = true;
                        break;
                    }
                }
            }
        }
    }
    return { cards };
}

// ==================== 輔助函數 ====================
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateIconPool(totalCards) {
    if (totalCards % 3 !== 0) totalCards = Math.ceil(totalCards / 3) * 3;
    let pool = [];
    let idx = 0;
    while (pool.length < totalCards) {
        let icon = CARD_KEYS[idx % CARD_KEYS.length];
        for (let i = 0; i < 3 && pool.length < totalCards; i++) pool.push(icon);
        idx++;
    }
    return shuffleArray(pool);
}

// ==================== 遊戲邏輯 ====================
function isRectOverlap(card1, card2) {
    const h = CARD_SIZE / 2;
    const l1 = card1.x - h, r1 = card1.x + h, t1 = card1.y - h, b1 = card1.y + h;
    const l2 = card2.x - h, r2 = card2.x + h, t2 = card2.y - h, b2 = card2.y + h;
    return !(r1 <= l2 || l1 >= r2 || b1 <= t2 || t1 >= b2);
}

function isCardCovered(card, allCards) {
    const upper = allCards.filter(c => !c.removed && c.layer > card.layer);
    for (let u of upper) {
        if (isRectOverlap(card, u)) return true;
    }
    return false;
}

function updateAllCardsClickable() {
    for (let card of stackCards) {
        if (!card.removed) {
            card.clickable = !isCardCovered(card, stackCards);
        }
    }
}

// 當卡牌消除時增加分數（只增加當前關卡分數）
function addScore(amount) {
    currentRoundScore += amount;
}

// 獲取當前顯示的總分（當前關卡分數 + 之前關卡累積的總分）
function getDisplayScore() {
    return totalScore + currentRoundScore;
}

function eliminateFromSlot() {
    let changed = false;
    while (true) {
        let count = new Map();
        for (let icon of slotCards) count.set(icon, (count.get(icon) || 0) + 1);
        let target = null;
        for (let [icon, cnt] of count) if (cnt >= 3) { target = icon; break; }
        if (!target) break;
        let newSlot = [], removed = 0;
        for (let icon of slotCards) {
            if (icon === target && removed < 3) { removed++; continue; }
            newSlot.push(icon);
        }
        slotCards = newSlot;
        addScore(10);  // 消除一組得10分（當前關卡分數）
        changed = true;
    }
    if (changed) {
        checkGameEnd();
    }
}

function checkGameEnd() {
    let remaining = stackCards.filter(c => !c.removed).length;
    if (remaining === 0 && slotCards.length === 0 && gameActive) {
        gameActive = false;

        // ★ 將當前關卡分數累加到總分
        totalScore += currentRoundScore;
        currentRoundScore = 0;  // 重置當前關卡分數

        if (currentLevel < TOTAL_LEVELS) {
            wx.showModal({
                title: `🎉 第${currentLevel}關通關！`,
                content: `累積總分：${totalScore}\n下一關即將開始！`,
                confirmText: '下一關',
                cancelText: '重玩此關',
                success: (res) => {
                    if (res.confirm) {
                        currentLevel++;
                        shuffleRemainingCount = 3;
                        loadLevel(currentLevel, true);  // true 表示保留總分
                    } else {
                        shuffleRemainingCount = 3;
                        loadLevel(currentLevel, false); // false 表示重玩此關不保留本次分數
                        // 注意：重玩此關時，之前累積的 totalScore 不變，但 currentRoundScore 已歸零
                    }
                }
            });
        } else {
            // 最終通關，顯示累積總分
            wx.showModal({
                title: '🏆 恭喜通關全部關卡！',
                content: `累積總得分：${totalScore}`,
                showCancel: false,
                success: () => {
                    // 遊戲完成後可以選擇重置或回到第一關
                    totalScore = 0;
                    currentLevel = 1;
                    shuffleRemainingCount = 3;
                    loadLevel(1, false);
                }
            });
        }
        return true;
    }
    if (slotCards.length >= 7 && gameActive) {
        let can = false;
        let cnt = new Map();
        for (let icon of slotCards) cnt.set(icon, (cnt.get(icon) || 0) + 1);
        for (let v of cnt.values()) if (v >= 3) can = true;
        if (!can) {
            gameActive = false;

            // 失敗時，不保留當前關卡分數（總分不變）
            // 可選：顯示失敗提示
            wx.showModal({
                title: '😭 遊戲失敗',
                content: `累積總分：${totalScore}`,
                confirmText: '重玩此關',
                cancelText: '回到第一關',
                success: (res) => {
                    if (res.confirm) {
                        shuffleRemainingCount = 3;
                        loadLevel(currentLevel, false); // 重玩此關，不保留本次失敗的分數
                    } else {
                        totalScore = 0;  // 重置總分
                        currentLevel = 1;
                        shuffleRemainingCount = 3;
                        loadLevel(1, false);
                    }
                }
            });
            return true;
        }
    }
    return false;
}

// ==================== 動畫系統 ====================
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function startCardAnimation(card, fromX, fromY, toX, toY) {
    playClickSound();

    card.isAnimating = true;
    card.animatedRemoved = true;

    const scaleStartTime = Date.now();
    const scaleDuration = 200;

    const animObj = {
        card: card,
        fromX: fromX,
        fromY: fromY,
        toX: toX,
        toY: toY,
        startTime: scaleStartTime,
        scaleDuration: scaleDuration,
        flyDuration: 500,
        phase: 'scale',
        scale: 1,
        startScale: 1
    };

    activeAnimations.push(animObj);
}

function updateAnimations() {
    const now = Date.now();
    const completedAnimations = [];

    for (let i = 0; i < activeAnimations.length; i++) {
        const anim = activeAnimations[i];

        if (anim.phase === 'scale') {
            const elapsed = now - anim.startTime;
            if (elapsed < anim.scaleDuration) {
                let t = elapsed / anim.scaleDuration;
                if (t < 0.5) {
                    anim.scale = 1 + 0.2 * (t * 2);
                } else {
                    anim.scale = 1.1 - 0.1 * ((t - 0.5) * 2);
                }
            } else {
                anim.phase = 'fly';
                anim.flyStartTime = now;
                anim.scale = 1;
            }
        }

        if (anim.phase === 'fly') {
            const elapsed = now - anim.flyStartTime;
            if (elapsed < anim.flyDuration) {
                let progress = elapsed / anim.flyDuration;
                const easeProgress = easeOutCubic(progress);
                anim.currentX = anim.fromX + (anim.toX - anim.fromX) * easeProgress;
                anim.currentY = anim.fromY + (anim.toY - anim.fromY) * easeProgress;
                anim.rotation = easeProgress * 0.1;
            } else {
                completedAnimations.push(i);
                anim.card.removed = true;
                slotCards.push(anim.card.icon);
                delete anim.card.isAnimating;
                delete anim.card.animatedRemoved;
            }
        }
    }

    for (let i = completedAnimations.length - 1; i >= 0; i--) {
        activeAnimations.splice(completedAnimations[i], 1);
    }

    if (completedAnimations.length > 0) {
        updateAllCardsClickable();
        eliminateFromSlot();
        checkGameEnd();
    }
}

function onCardClick(card) {
    if (!gameActive || !card.clickable) return;
    if (card.isAnimating) return;

    // 計算卡槽中目標卡牌的位置
    const slotX = PAD_LEFT;  // 卡槽左邊界
    const slotY = PAD_TOP + SLOT_Y_OFFSET;  // 卡槽Y位置
    const slotSpacing = (COLS * GRID_STEP) / 7;  // 每個槽位的間距

    const targetSlotIndex = slotCards.length;
    const targetX = slotX + (targetSlotIndex * slotSpacing) + (slotSpacing / 2) - (CARD_SIZE / 2);
    const targetY = slotY + 8;  // 加上內邊距

    const fromX = card.x - CARD_SIZE / 2;
    const fromY = card.y - CARD_SIZE / 2;

    startCardAnimation(card, fromX, fromY, targetX, targetY);
}

// keepTotalScore: 是否保留總分（通關時 true，重玩關卡或切換關卡時 false 或看情況）
function loadLevel(level, keepTotalScore = false) {
    currentLevel = level;

    if (!keepTotalScore) {
        // 切換關卡或重玩時，如果不保留當前關卡分數，則只重置 currentRoundScore
        // totalScore 保持不變（從之前關卡累積來的）
        // 注意：這意味著如果玩家手動切換關卡，之前關卡的總分仍保留
        // 如果想要手動切換關卡時重置總分，可以將 totalScore 設為 0
        currentRoundScore = 0;
    }
    // 如果 keepTotalScore === true，表示通關後進入下一關，此時 totalScore 已經累加，currentRoundScore 已歸零

    forbiddenPositions = generateForbiddenPositions(level);

    nextCardId = 1;
    let levelData = generateLevel(level);
    let positions = levelData.cards;
    let iconPool = generateIconPool(positions.length);
    let newCards = [];
    for (let i = 0; i < positions.length; i++) {
        newCards.push({
            id: nextCardId++,
            icon: iconPool[i % iconPool.length],
            x: positions[i].x,
            y: positions[i].y,
            layer: positions[i].layer,
            clickable: true,
            removed: false,
            isAnimating: false,
            animatedRemoved: false
        });
    }
    stackCards = newCards;
    updateAllCardsClickable();
    slotCards = [];
    gameActive = true;
    activeAnimations = [];
    shuffleRemainingCount = 3;

    settingsVisible = false;
}

function resetGame() {
    // 重置遊戲：重置總分和當前關卡分數
    totalScore = 0;
    currentRoundScore = 0;
    shuffleRemainingCount = 3;
    loadLevel(currentLevel, false);
}

function shuffleRemaining() {
    if (!gameActive) return;
    if (shuffleRemainingCount <= 0) {
        wx.showToast({
            title: '洗牌次數已用完',
            icon: 'none',
            duration: 1000
        });
        return;
    }

    let active = stackCards.filter(c => !c.removed && !c.isAnimating);
    if (active.length === 0) return;

    let icons = active.map(c => c.icon);
    let shuffled = shuffleArray([...icons]);
    active.forEach((c, idx) => c.icon = shuffled[idx]);

    shuffleRemainingCount--;
    wx.showToast({
        title: `洗牌剩餘 ${shuffleRemainingCount} 次`,
        icon: 'none',
        duration: 1000
    });
}

function toggleSettings() {
    settingsVisible = !settingsVisible;
}

function selectLevel(level) {
    if (level >= 1 && level <= TOTAL_LEVELS) {
        // 手動切換關卡時，重置總分和當前分數（可選，根據需求）
        // 如果想要保留總分，可以注釋掉 totalScore = 0
        totalScore = 0;
        currentRoundScore = 0;
        loadLevel(level, false);
    }
    settingsVisible = false;
}

// ==================== 繪製 ====================
function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
function drawCard(ctx, card, x, y, scale = 1, alpha = 1, isAnimating = false, rotation = 0) {
    const img = loadedImages[card.icon];
    const size = CARD_SIZE * scale;
    const offset = (size - CARD_SIZE) / 2;

    // 計算實際繪製位置（x, y 是卡牌的左上角）
    let drawX = x - offset;
    let drawY = y - offset;

    ctx.save();

    if (rotation > 0) {
        const centerX = drawX + size / 2;
        const centerY = drawY + size / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(rotation);
        ctx.translate(-centerX, -centerY);
    }

    if (isAnimating) {
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
    } else {
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 2;
    }
    ctx.globalAlpha = alpha;

    if (img && img.complete) {
        ctx.drawImage(img, drawX, drawY, size, size);
    } else {
        // 繪製卡牌背景
        ctx.fillStyle = '#e8d8c0';
        ctx.fillRect(drawX, drawY, size, size);

        // 繪製邊框
        ctx.strokeStyle = '#b97f3a';
        ctx.lineWidth = 2;
        ctx.strokeRect(drawX, drawY, size, size);

        // 繪製文字
        ctx.font = `${Math.max(12, CARD_SIZE * 0.3 * scale)}px "Segoe UI"`;
        ctx.fillStyle = '#5a2f0a';
        ctx.fillText(card.icon.substring(0, 3), drawX + 10, drawY + size - 10);
    }

    ctx.shadowBlur = 0;

    // 如果卡牌不可點擊，添加半透明遮罩
    if (!card.clickable && !card.removed && !isAnimating) {
        ctx.fillStyle = 'rgba(120, 100, 80, 0.3)';
        roundRect(ctx, drawX, drawY, size, size, 8);
        ctx.fill();
    }

    ctx.restore();
}
function renderUI() {
    ctx.clearRect(0, 0, screenWidth, screenHeight);

    // 背景
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // === 定義百分比區域變數 ===
    const TOP_AREA_HEIGHT = screenHeight * 0.20;
    const MIDDLE_AREA_HEIGHT = screenHeight * 0.60;
    const BOTTOM_AREA_HEIGHT = screenHeight * 0.20;
    const MIDDLE_AREA_START = TOP_AREA_HEIGHT;
    const BOTTOM_AREA_START = TOP_AREA_HEIGHT + MIDDLE_AREA_HEIGHT;

    // === 繪製三個區域的調試虛線（可開關）===
    if (typeof DEBUG_SHOW_AREA_LINES !== 'undefined' && DEBUG_SHOW_AREA_LINES) {
        // 上方區域與中間區域的分隔線
        ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([10, 5]);
        ctx.beginPath();
        ctx.moveTo(0, TOP_AREA_HEIGHT);
        ctx.lineTo(screenWidth, TOP_AREA_HEIGHT);
        ctx.stroke();

        // 中間區域與下方區域的分隔線
        ctx.beginPath();
        ctx.moveTo(0, BOTTOM_AREA_START);
        ctx.lineTo(screenWidth, BOTTOM_AREA_START);
        ctx.stroke();

        // 重置虛線設置
        ctx.setLineDash([]);

        // 添加區域標籤
        const labelFontSize = Math.max(14, Math.round(16 * (CARD_SIZE / BASE_CARD_SIZE)));
        ctx.font = `bold ${labelFontSize}px "Segoe UI"`;

        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillText(`上方 20% (0-${TOP_AREA_HEIGHT}px)`, 10, TOP_AREA_HEIGHT - 5);
        ctx.fillText(`中間 60% (${MIDDLE_AREA_START}-${BOTTOM_AREA_START}px)`, 10, MIDDLE_AREA_START + 20);
        ctx.fillText(`下方 20% (${BOTTOM_AREA_START}-${screenHeight}px)`, 10, BOTTOM_AREA_START + 20);

        // 區域背景色（半透明）
        ctx.fillStyle = 'rgba(255, 200, 200, 0.1)';
        ctx.fillRect(0, 0, screenWidth, TOP_AREA_HEIGHT);
        ctx.fillStyle = 'rgba(200, 255, 200, 0.1)';
        ctx.fillRect(0, MIDDLE_AREA_START, screenWidth, MIDDLE_AREA_HEIGHT);
        ctx.fillStyle = 'rgba(200, 200, 255, 0.1)';
        ctx.fillRect(0, BOTTOM_AREA_START, screenWidth, BOTTOM_AREA_HEIGHT);
    }

    // 繪製卡牌（按層級排序，低層級先繪製）
    let sorted = [...stackCards].sort((a, b) => a.layer - b.layer);
    for (let c of sorted) {
        if (c.removed) continue;
        if (c.isAnimating) continue;
        let x = c.x - CARD_SIZE / 2;
        let y = c.y - CARD_SIZE / 2;
        drawCard(ctx, c, x, y, 1, 1, false, 0);
    }
    // === 繪製卡槽（固定在中间区域底部）===
    const slotX = PAD_LEFT;
    const slotWidth = COLS * GRID_STEP;
    const slotHeight = CARD_SIZE * 2;  // 卡槽高度为两倍卡牌大小
    const slotY = BOTTOM_AREA_START - slotHeight - 5;  // 固定在底部，留5px边距

    // 繪製卡槽背景
    ctx.fillStyle = colors.slotBg;
    roundRect(ctx, slotX, slotY, slotWidth, slotHeight, 15);
    ctx.fill();
    ctx.strokeStyle = '#b9975a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 計算每個槽位的寬度和起始位置（使用原始卡牌尺寸）
    const slotSpacing = slotWidth / 7;
    const cardSlotWidth = CARD_SIZE;  // 保持原始卡牌大小
    const cardSlotHeight = CARD_SIZE;  // 保持原始卡牌大小
    const cardSlotY = slotY + (slotHeight - cardSlotHeight) / 2;  // 垂直居中

    // 繪製7個槽位卡片
    for (let i = 0; i < 7; i++) {
        // 計算每個槽位的中心X位置
        const slotCenterX = slotX + (i * slotSpacing) + (slotSpacing / 2);
        const cardSlotX = slotCenterX - cardSlotWidth / 2;

        if (i < slotCards.length) {
            const iconKey = slotCards[i];
            const img = loadedImages[iconKey];

            // 繪製卡片背景
            ctx.fillStyle = '#fff3df';
            roundRect(ctx, cardSlotX, cardSlotY, cardSlotWidth, cardSlotHeight, 8);
            ctx.fill();
            ctx.strokeStyle = '#d4a373';
            ctx.lineWidth = 1;
            ctx.stroke();

            // 繪製卡片圖標
            if (img && img.complete) {
                const iconSize = cardSlotWidth - 4;
                const iconX = cardSlotX + (cardSlotWidth - iconSize) / 2;
                const iconY = cardSlotY + (cardSlotHeight - iconSize) / 2;
                ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.font = `${Math.max(12, cardSlotWidth * 0.3)}px "Segoe UI"`;
                ctx.fillStyle = '#5a2f0a';
                ctx.fillText(iconKey.substring(0, 3), cardSlotX + cardSlotWidth * 0.2, cardSlotY + cardSlotHeight * 0.65);
            }
        } else {
            // 空槽位
            ctx.fillStyle = '#eeddbb';
            roundRect(ctx, cardSlotX, cardSlotY, cardSlotWidth, cardSlotHeight, 8);
            ctx.fill();
            ctx.strokeStyle = '#c9b37c';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = `${Math.max(12, cardSlotWidth * 0.3)}px "Segoe UI"`;
            ctx.fillStyle = '#bba46c';
            ctx.fillText('?', cardSlotX + cardSlotWidth * 0.38, cardSlotY + cardSlotHeight * 0.65);
        }
    }

    // 繪製動畫中的卡片
    for (let anim of activeAnimations) {
        const card = anim.card;
        let x, y, scale, rotation;
        if (anim.phase === 'scale') {
            x = anim.fromX;
            y = anim.fromY;
            scale = anim.scale;
            rotation = 0;
        } else {
            x = anim.currentX;
            y = anim.currentY;
            scale = 1;
            rotation = anim.rotation || 0;
        }
        drawCard(ctx, card, x, y, scale, 1, true, rotation);
    }

    // === 繪製底部按鈕（屏幕坐標系）===
    const buttonFontSize = Math.max(14, Math.round(18 * (CARD_SIZE / BASE_CARD_SIZE)));

    // 洗牌按鈕
    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, shuffleBtnRect.x, shuffleBtnRect.y, shuffleBtnRect.w, shuffleBtnRect.h, 35);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';
    ctx.font = `bold ${buttonFontSize}px "Segoe UI"`;
    ctx.fillText('♻️ 洗牌', shuffleBtnRect.x + 15, shuffleBtnRect.y + shuffleBtnRect.h * 0.7);
    ctx.font = `bold ${Math.max(10, Math.round(12 * (CARD_SIZE / BASE_CARD_SIZE)))}px "Segoe UI"`;
    ctx.fillStyle = '#b16224';
    ctx.fillText(`x${shuffleRemainingCount}`, shuffleBtnRect.x + shuffleBtnRect.w - 20, shuffleBtnRect.y + shuffleBtnRect.h * 0.6);

    // 重來按鈕
    ctx.fillStyle = '#ffdd99';
    roundRect(ctx, resetBtnRect.x, resetBtnRect.y, resetBtnRect.w, resetBtnRect.h, 35);
    ctx.fill();
    ctx.fillStyle = '#4f2d0a';
    ctx.font = `bold ${buttonFontSize}px "Segoe UI"`;
    ctx.fillText('🔄 重來', resetBtnRect.x + 15, resetBtnRect.y + resetBtnRect.h * 0.7);

    // === 繪製右上角得分面板 ===
    const coinImg = loadedImages['coin'];
    const displayScore = getDisplayScore();

    // 繪製背景框
    ctx.fillStyle = colors.scoreBg;
    roundRect(ctx, SCORE_BG_X, SCORE_BG_Y, SCORE_BG_WIDTH, SCORE_BG_HEIGHT, 25);
    ctx.fill();

    // 繪製金幣圖片
    if (coinImg && coinImg.complete) {
        ctx.drawImage(coinImg, COIN_X, COIN_Y, COIN_WIDTH, COIN_HEIGHT);
    } else {
        ctx.font = `${SCORE_FONT_SIZE}px "Segoe UI"`;
        ctx.fillStyle = '#ffeaac';
        ctx.fillText('💰', COIN_X, COIN_Y + COIN_HEIGHT * 0.7);
    }

    // 繪製分數
    ctx.font = `bold ${SCORE_FONT_SIZE}px "Segoe UI"`;
    ctx.fillStyle = colors.scoreText;
    ctx.fillText(`${displayScore}`, SCORE_TEXT_X, SCORE_TEXT_Y);

    const infoFontSize = Math.max(14, Math.round(INFO_FONT_SIZE * 0.9));

    // 繪製剩餘卡片數量
    let remain = stackCards.filter(c => !c.removed && !c.isAnimating).length;
    ctx.font = `${infoFontSize}px "Segoe UI"`;
    ctx.fillStyle = colors.subtitleText;
    ctx.fillText(`剩餘 ${remain}`, REMAIN_TEXT_X, REMAIN_TEXT_Y);

    // 繪製關卡文字
    const levelTextY = REMAIN_TEXT_Y + Math.round(INFO_FONT_SIZE * 1.3);
    const levelTextX = REMAIN_TEXT_X;
    ctx.fillStyle = colors.subtitleText;
    ctx.fillText(`第 ${currentLevel} / ${TOTAL_LEVELS} 關`, levelTextX, levelTextY);

    // 設定按鈕
    const gearImg = loadedImages['gear'];
    const gearSize = 30;
    const gearX = screenWidth - gearSize - 20;
    const gearY = REMAIN_TEXT_Y - gearSize + 8;

    if (gearImg && gearImg.complete) {
        ctx.drawImage(gearImg, gearX, gearY, gearSize, gearSize);
    } else {
        ctx.fillStyle = '#ffdd99';
        roundRect(ctx, gearX, gearY, gearSize, gearSize, 8);
        ctx.fill();
        ctx.fillStyle = '#4f2d0a';
        ctx.font = `${Math.round(gearSize * 0.6)}px "Segoe UI"`;
        ctx.fillText('⚙️', gearX + gearSize * 0.2, gearY + gearSize * 0.75);
    }

    settingsBtnRect = { x: gearX, y: gearY, w: gearSize, h: gearSize };

    // 繪製標題圖片
    const titleImg = loadedImages['title'];
    if (titleImg && titleImg.complete) {
        ctx.drawImage(titleImg, TITLE_X, TITLE_Y, TITLE_WIDTH, TITLE_HEIGHT);
    } else {
        const titleFontSize = Math.round(28 * (Math.min(screenWidth / 375, screenHeight / 667)));
        ctx.font = `bold ${titleFontSize}px "KaiTi", "華文楷書"`;
        ctx.fillStyle = '#5a3c1a';
        ctx.fillText('福一下哥', TITLE_X, TITLE_Y + TITLE_HEIGHT * 0.7);
    }

    // === 繪製設定面板 ===
    if (settingsVisible) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        const panelWidth = Math.min(280, screenWidth * 0.8);
        const panelHeight = Math.min(320, screenHeight * 0.6);
        const panelX = (screenWidth - panelWidth) / 2;
        const panelY = (screenHeight - panelHeight) / 2;

        ctx.fillStyle = colors.settingsPanel;
        roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 20);
        ctx.fill();

        const panelTitleSize = Math.min(22, Math.round(panelWidth * 0.08));
        ctx.fillStyle = '#5a3c1a';
        ctx.font = `bold ${panelTitleSize}px "KaiTi"`;
        ctx.fillText('設定', panelX + panelWidth * 0.4, panelY + panelHeight * 0.12);

        ctx.strokeStyle = '#d4c4a0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 20, panelY + panelHeight * 0.17);
        ctx.lineTo(panelX + panelWidth - 20, panelY + panelHeight * 0.17);
        ctx.stroke();

        const itemFontSize = Math.min(16, Math.round(panelWidth * 0.057));

        // 背景音樂開關
        ctx.fillStyle = bgmEnabled ? '#2f6b2f' : '#aa5440';
        roundRect(ctx, panelX + panelWidth * 0.72, panelY + panelHeight * 0.24, panelWidth * 0.2, panelHeight * 0.09, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
        ctx.fillText(bgmEnabled ? 'ON' : 'OFF', panelX + panelWidth * 0.77, panelY + panelHeight * 0.3);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `${itemFontSize}px "Segoe UI"`;
        ctx.fillText('背景音樂', panelX + panelWidth * 0.1, panelY + panelHeight * 0.3);

        // 切換背景音樂按鈕
        ctx.fillStyle = '#c28a4e';
        roundRect(ctx, panelX + panelWidth * 0.72, panelY + panelHeight * 0.35, panelWidth * 0.2, panelHeight * 0.09, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
        ctx.fillText(`${currentBgmIndex}`, panelX + panelWidth * 0.8, panelY + panelHeight * 0.41);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `${itemFontSize}px "Segoe UI"`;
        ctx.fillText('切換BGM', panelX + panelWidth * 0.1, panelY + panelHeight * 0.41);

        // 點擊音效開關
        ctx.fillStyle = sfxEnabled ? '#2f6b2f' : '#aa5440';
        roundRect(ctx, panelX + panelWidth * 0.72, panelY + panelHeight * 0.46, panelWidth * 0.2, panelHeight * 0.09, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
        ctx.fillText(sfxEnabled ? 'ON' : 'OFF', panelX + panelWidth * 0.77, panelY + panelHeight * 0.52);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `${itemFontSize}px "Segoe UI"`;
        ctx.fillText('點擊音效', panelX + panelWidth * 0.1, panelY + panelHeight * 0.52);

        // 分隔線
        ctx.beginPath();
        ctx.moveTo(panelX + 20, panelY + panelHeight * 0.62);
        ctx.lineTo(panelX + panelWidth - 20, panelY + panelHeight * 0.62);
        ctx.stroke();

        // 關卡選擇標籤
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `bold ${itemFontSize}px "Segoe UI"`;
        ctx.fillText('切換關卡', panelX + panelWidth * 0.1, panelY + panelHeight * 0.72);

        // 關卡按鈕行1 (1-5)
        const levelBtnWidth = Math.min(45, (panelWidth - 40) / 5.5);
        const levelBtnHeight = Math.min(30, panelHeight * 0.1);

        window.levelButtons1 = [];
        for (let i = 0; i < 5; i++) {
            const levelNum = i + 1;
            const btnX = panelX + 20 + i * (levelBtnWidth + 5);
            const btnY = panelY + panelHeight * 0.78;
            const isCurrent = (levelNum === currentLevel);
            ctx.fillStyle = isCurrent ? '#2f6b2f' : '#ffdd99';
            roundRect(ctx, btnX, btnY, levelBtnWidth, levelBtnHeight, 12);
            ctx.fill();
            ctx.fillStyle = isCurrent ? '#ffffff' : '#4f2d0a';
            ctx.font = `bold ${Math.min(14, Math.round(levelBtnHeight * 0.5))}px "Segoe UI"`;
            ctx.fillText(`${levelNum}`, btnX + levelBtnWidth * 0.35, btnY + levelBtnHeight * 0.7);
            window.levelButtons1.push({ x: btnX, y: btnY, w: levelBtnWidth, h: levelBtnHeight, level: levelNum });
        }

        // 關卡按鈕行2 (6-10)
        window.levelButtons2 = [];
        for (let i = 0; i < 5; i++) {
            const levelNum = i + 6;
            const btnX = panelX + 20 + i * (levelBtnWidth + 5);
            const btnY = panelY + panelHeight * 0.89;
            const isCurrent = (levelNum === currentLevel);
            ctx.fillStyle = isCurrent ? '#2f6b2f' : '#ffdd99';
            roundRect(ctx, btnX, btnY, levelBtnWidth, levelBtnHeight, 12);
            ctx.fill();
            ctx.fillStyle = isCurrent ? '#ffffff' : '#4f2d0a';
            ctx.font = `bold ${Math.min(14, Math.round(levelBtnHeight * 0.5))}px "Segoe UI"`;
            ctx.fillText(`${levelNum}`, btnX + levelBtnWidth * 0.35, btnY + levelBtnHeight * 0.7);
            window.levelButtons2.push({ x: btnX, y: btnY, w: levelBtnWidth, h: levelBtnHeight, level: levelNum });
        }

        // 關閉按鈕
        ctx.fillStyle = '#aa5440';
        const closeBtnSize = Math.min(30, panelWidth * 0.1);
        roundRect(ctx, panelX + panelWidth - closeBtnSize - 10, panelY + 10, closeBtnSize, closeBtnSize, closeBtnSize / 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(20, Math.round(closeBtnSize * 0.7))}px "Segoe UI"`;
        ctx.fillText('✕', panelX + panelWidth - closeBtnSize, panelY + closeBtnSize * 0.8);
    }

    // 遊戲結束遮罩
    if (!gameActive) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);
        ctx.font = 'bold 40px "Segoe UI"';
        ctx.fillStyle = '#ffffff';
        ctx.fillText('遊戲結束', screenWidth / 2 - 100, screenHeight / 2);
    }
}

// ==================== 觸摸事件 ====================
function onTouchStart(e) {
    let t = e.touches[0];
    let x = t.clientX;  // 直接使用屏幕坐標
    let y = t.clientY;  // 直接使用屏幕坐標

    // 檢查設定面板內的點擊（使用屏幕坐標）
    if (settingsVisible) {
        const panelWidth = Math.min(280, screenWidth * 0.8);
        const panelHeight = Math.min(320, screenHeight * 0.6);
        const panelX = (screenWidth - panelWidth) / 2;
        const panelY = (screenHeight - panelHeight) / 2;

        // 關閉按鈕
        const closeBtnSize = Math.min(30, panelWidth * 0.1);
        const closeX = panelX + panelWidth - closeBtnSize - 10;
        const closeY = panelY + 10;
        if (x >= closeX && x <= closeX + closeBtnSize &&
            y >= closeY && y <= closeY + closeBtnSize) {
            settingsVisible = false;
            return;
        }

        // 背景音樂開關按鈕
        const bgmBtnX = panelX + panelWidth * 0.72;
        const bgmBtnY = panelY + panelHeight * 0.24;
        const bgmBtnW = panelWidth * 0.2;
        const bgmBtnH = panelHeight * 0.09;
        if (x >= bgmBtnX && x <= bgmBtnX + bgmBtnW &&
            y >= bgmBtnY && y <= bgmBtnY + bgmBtnH) {
            toggleBgm();
            return;
        }

        // 切換BGM按鈕
        const switchBgmX = panelX + panelWidth * 0.72;
        const switchBgmY = panelY + panelHeight * 0.35;
        if (x >= switchBgmX && x <= switchBgmX + bgmBtnW &&
            y >= switchBgmY && y <= switchBgmY + bgmBtnH) {
            switchBgm();
            return;
        }

        // 點擊音效開關按鈕
        const sfxBtnX = panelX + panelWidth * 0.72;
        const sfxBtnY = panelY + panelHeight * 0.46;
        if (x >= sfxBtnX && x <= sfxBtnX + bgmBtnW &&
            y >= sfxBtnY && y <= sfxBtnY + bgmBtnH) {
            toggleSfx();
            return;
        }

        // 關卡按鈕行1
        if (window.levelButtons1) {
            for (let btn of window.levelButtons1) {
                if (x >= btn.x && x <= btn.x + btn.w &&
                    y >= btn.y && y <= btn.y + btn.h) {
                    selectLevel(btn.level);
                    return;
                }
            }
        }

        // 關卡按鈕行2
        if (window.levelButtons2) {
            for (let btn of window.levelButtons2) {
                if (x >= btn.x && x <= btn.x + btn.w &&
                    y >= btn.y && y <= btn.y + btn.h) {
                    selectLevel(btn.level);
                    return;
                }
            }
        }
        return;
    }
    // 检查屏幕坐标系下的按钮（不需要坐标转换）
    // 检查洗牌按钮
    if (shuffleBtnRect &&
        x >= shuffleBtnRect.x && x <= shuffleBtnRect.x + shuffleBtnRect.w &&
        y >= shuffleBtnRect.y && y <= shuffleBtnRect.y + shuffleBtnRect.h) {
        shuffleRemaining();
        return;
    }

    // 检查重来按钮
    if (resetBtnRect &&
        x >= resetBtnRect.x && x <= resetBtnRect.x + resetBtnRect.w &&
        y >= resetBtnRect.y && y <= resetBtnRect.y + resetBtnRect.h) {
        resetGame();
        return;
    }
    // 檢查設定按鈕（使用屏幕坐標，不需要轉換）
    if (settingsBtnRect &&
        x >= settingsBtnRect.x && x <= settingsBtnRect.x + settingsBtnRect.w &&
        y >= settingsBtnRect.y && y <= settingsBtnRect.y + settingsBtnRect.h) {
        toggleSettings();
        return;
    }

    if (!gameActive) return;

    // 轉換遊戲坐標（用於點擊卡牌）
    let gameX = (x - offsetX) / cardScale;
    let gameY = (y - offsetY) / cardScale;

    // 點擊卡牌
    let sorted = [...stackCards].filter(c => !c.removed && !c.isAnimating).sort((a, b) => b.layer - a.layer);
    for (let card of sorted) {
        let left = card.x - CARD_SIZE / 2, right = card.x + CARD_SIZE / 2;
        let top = card.y - CARD_SIZE / 2, bottom = card.y + CARD_SIZE / 2;
        if (gameX >= left && gameX <= right && gameY >= top && gameY <= bottom) {
            if (card.clickable) onCardClick(card);
            break;
        }
    }
}

function onTouchEnd(e) {
    let t = e.changedTouches[0];

    // 如果設定面板打開，不處理遊戲按鈕
    if (settingsVisible) return;

    // 使用屏幕坐標
    let x = t.clientX;
    let y = t.clientY;

    // 轉換遊戲坐標
    let gameX = (x - offsetX) / cardScale;
    let gameY = (y - offsetY) / cardScale;

    // 檢查洗牌和重來按鈕
    if (shuffleBtnRect &&
        gameX >= shuffleBtnRect.x && gameX <= shuffleBtnRect.x + shuffleBtnRect.w &&
        gameY >= shuffleBtnRect.y && gameY <= shuffleBtnRect.y + shuffleBtnRect.h) {
        // 已經在 onTouchStart 中處理，避免重複
        return;
    }

    if (resetBtnRect &&
        gameX >= resetBtnRect.x && gameX <= resetBtnRect.x + resetBtnRect.w &&
        gameY >= resetBtnRect.y && gameY <= resetBtnRect.y + resetBtnRect.h) {
        // 已經在 onTouchStart 中處理，避免重複
        return;
    }
}
function init() {
    canvas = wx.createCanvas();

    let sys = wx.getWindowInfo();
    screenWidth = sys.screenWidth;
    screenHeight = sys.screenHeight;
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    ctx = canvas.getContext('2d');

    console.log(`畫布尺寸: ${canvas.width} x ${canvas.height}`);

    // 計算動態尺寸
    calculateDynamicSizes();

    // 直接使用計算好的 PAD_LEFT 和 PAD_TOP
    BASE_MIN_X = PAD_LEFT + GRID_STEP / 2;
    BASE_MIN_Y = PAD_TOP + GRID_STEP / 2;  // 修改：從 GRID_STEP/2 開始，讓網格完整顯示

    BASE_MAX_X = BASE_MIN_X + (COLS - 1) * GRID_STEP;
    BASE_MAX_Y = BASE_MIN_Y + (ROWS - 1) * GRID_STEP;

    // 擴展邊界（包含卡牌完整大小）
    MIN_X = BASE_MIN_X - CARD_SIZE / 2;
    MAX_X = BASE_MAX_X + CARD_SIZE / 2;
    MIN_Y = PAD_TOP;  // 從 PAD_TOP 開始
    MAX_Y = PAD_TOP + (ROWS * GRID_STEP) + (CARD_SIZE * 2) + 40;  // 包含網格 + 卡槽空間

    console.log(`========== 遊戲坐標系統 ==========`);
    console.log(`BASE_MIN: (${BASE_MIN_X}, ${BASE_MIN_Y})`);
    console.log(`BASE_MAX: (${BASE_MAX_X}, ${BASE_MAX_Y})`);
    console.log(`MIN/MAX: X(${MIN_X}~${MAX_X}), Y(${MIN_Y}~${MAX_Y})`);
    console.log(`CARD_SIZE: ${CARD_SIZE}, GRID_STEP: ${GRID_STEP}`);
    console.log(`=================================`);

    BASE_POSITIONS = generateBaseGrid();

    // 不需要額外的縮放和偏移，因為坐標已經是世界坐標
    cardScale = 1;
    offsetX = 0;
    offsetY = 0;

    initAudio();

    loadCardImages().then(() => {
        totalScore = 0;
        currentRoundScore = 0;
        loadLevel(1, false);
    });

    wx.onTouchStart(onTouchStart);
    wx.onTouchEnd(onTouchEnd);

    function frame() {
        updateAnimations();
        renderUI();
        requestAnimationFrame(frame);
    }
    frame();
}
function drawDebugBounds(ctx) {
    // BASE 範圍（基礎網格邊界）- 藍色虛線框
    ctx.strokeStyle = 'rgba(0, 100, 255, 0.6)';
    ctx.lineWidth = 1.5 / cardScale;
    ctx.setLineDash([8, 4]);

    const baseLeft = BASE_MIN_X - CARD_SIZE / 2;
    const baseTop = BASE_MIN_Y - CARD_SIZE / 2;
    const baseWidth = BASE_MAX_X - BASE_MIN_X + CARD_SIZE;
    const baseHeight = BASE_MAX_Y - BASE_MIN_Y + CARD_SIZE;

    ctx.strokeRect(baseLeft, baseTop, baseWidth, baseHeight);

    // 添加標籤
    ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
    ctx.font = `bold ${11 / cardScale}px "Segoe UI"`;
    ctx.fillText('BASE', baseLeft + 5, baseTop - 5);

    // MIN/MAX 範圍（擴展邊界）- 紅色實線框
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
    ctx.lineWidth = 2 / cardScale;
    ctx.setLineDash([]);
    ctx.strokeRect(MIN_X, MIN_Y, MAX_X - MIN_X, MAX_Y - MIN_Y);

    // 添加標籤和坐標
    ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
    ctx.fillText('MIN/MAX', MIN_X + 5, MIN_Y - 5);

    // 四角坐標標註
    const fontSize = `${10 / cardScale}px "Segoe UI"`;
    ctx.font = fontSize;

    // 左上角
    ctx.fillText(`(${MIN_X.toFixed(0)},${MIN_Y.toFixed(0)})`, MIN_X + 5, MIN_Y + 15);
    // 右上角
    ctx.fillText(`(${MAX_X.toFixed(0)},${MIN_Y.toFixed(0)})`, MAX_X - 70, MIN_Y + 15);
    // 左下角
    ctx.fillText(`(${MIN_X.toFixed(0)},${MAX_Y.toFixed(0)})`, MIN_X + 5, MAX_Y - 5);
    // 右下角
    ctx.fillText(`(${MAX_X.toFixed(0)},${MAX_Y.toFixed(0)})`, MAX_X - 70, MAX_Y - 5);

    ctx.fillText(`CARD_SIZE: ${CARD_SIZE}px`, 500, 500);
}
init();
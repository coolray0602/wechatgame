// 可調整參數（基礎值，會根據螢幕大小自動調整）
const BASE_CARD_SIZE = 60;
const COLS = 6;
const ROWS = 7;
const TOP_AREA_RATIO = 0.20;
const BOTTOM_AREA_RATIO = 0.15;
const MIDDLE_AREA_RATIO = 1 - TOP_AREA_RATIO - BOTTOM_AREA_RATIO; 

// ==================== 音效配置 ====================
const CLICK_SOUND_URL = 'res/click.mp3';
const BGM1_URL = 'res/bgm1.mp3';
const BGM2_URL = 'res/bgm2.mp3';
const WASH_SOUND_URL = 'res/wash.mp3';
const THROW_SOUND_URL = 'res/throw.mp3';
const THROWBOMB_SOUND_URL = 'res/throwbomb.mp3';
const EXPLOSION_SOUND_URL = 'res/explosion.mp3';
const COINS_SOUND_URL = 'res/coins.mp3';
const DROP_SOUND_URL = 'res/drop.mp3';
const DROPS_SOUND_URL = 'res/drops.mp3';
const CLEAR_SOUND_URL = 'res/clear.mp3';

let clickAudio = null;
let bgmAudio = null;
let washAudio = null;
let throwAudio = null;
let throwBombAudio = null;
let explosionAudio = null;
let coinsAudio = null;
let dropAudio = null;
let dropsAudio = null;
let clearAudio = null;
let currentBgmIndex = 1;
let bgmEnabled = true;
let sfxEnabled = true;

// ==================== 道具系統（商店購買 + 道具櫃） ====================
let ownedItems = [];  // ['wash' | 'throw' | 'switch']，最多 5 個
let baseVariant = 0;  // 0 = slot.png, 1 = slot1.png

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
let SETTINGS_BTN_SIZE, SETTINGS_BTN_X, SETTINGS_BTN_Y;

let SLOT_BG_WIDTH;
let SLOT_BG_HEIGHT;
let SLOT_BG_X;
let SLOT_BG_Y;
// 添加按钮之间的间距变量
const BTN_GAP = 20; // 两个按钮之间的间距
const SLOT_CARD_Y_RATIO = 0.12;
// ✅ 新增：關卡按鈕數組
let levelButtons1 = [];
let levelButtons2 = [];

// ==================== 累積總分（跨關卡） ====================
let totalScore = 0;
function calculateDynamicSizes() {
    const sys = wx.getSystemInfoSync();
    const screenWidth = sys.screenWidth;
    const screenHeight = sys.screenHeight;
    const windowInfo = wx.getWindowInfo();
    const safeAreaTop = windowInfo.safeArea?.top || windowInfo.statusBarHeight || 20;
    const uiMargin = Math.max(10, Math.round(12 * Math.min(screenWidth / 375, 1)));

    console.log('安全区域上缘位置：', safeAreaTop);
    console.log('安全区域对象：', windowInfo.safeArea);

    // 定義百分比佈局區域
    const TOP_AREA_HEIGHT = screenHeight * TOP_AREA_RATIO;
    const MIDDLE_AREA_HEIGHT = screenHeight * MIDDLE_AREA_RATIO;
    const BOTTOM_AREA_HEIGHT = screenHeight * BOTTOM_AREA_RATIO;
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
    const BOTTOM_AREA_START = TOP_AREA_HEIGHT + MIDDLE_AREA_HEIGHT; // 中间区域底部
    SLOT_X_OFFSET = 0;  // 水平不需要額外偏移，因為 PAD_LEFT 已經處理了居中
    SLOT_Y_OFFSET = BOTTOM_AREA_START - PAD_TOP - (CARD_SIZE * 2) - 10;  // 中间区域底部 - 卡槽高度 - 10px边距
    BTN_Y_OFFSET = 0;

    // === 頂部區域高度 ===
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();

    // TOP_AREA 的完整可用高度（不受膠囊垂直影響，膠囊只佔右側）
    const topAreaBottom = TOP_AREA_HEIGHT;
    const topContentTop = safeAreaTop;
    const topContentBottom = topAreaBottom;
    const topContentHeight = topContentBottom - topContentTop;

    // === 標題圖片動態尺寸 ===
    const titleAspectRatio = 528 / 200;
    // 標題高度：取 content 的 78% 與 total 的 68%（確保適配各種解析度）
    TITLE_HEIGHT = Math.round(Math.min(topContentHeight * 0.78, TOP_AREA_HEIGHT * 0.68));
    TITLE_WIDTH = Math.round(TITLE_HEIGHT * titleAspectRatio);
    // 限制最大寬度不超過螢幕的 42%
    if (TITLE_WIDTH > screenWidth * 0.42) {
        TITLE_WIDTH = Math.round(screenWidth * 0.42);
        TITLE_HEIGHT = Math.round(TITLE_WIDTH / titleAspectRatio);
    }
    TITLE_X = uiMargin;
    // 標題垂直置中於頂部區域
    TITLE_Y = topContentTop + Math.round((topContentHeight - TITLE_HEIGHT) / 2);

    // === 金幣圖片動態尺寸 ===
    const coinScale = scaleFactor * 0.45;
    COIN_WIDTH = Math.round(100 * coinScale);
    COIN_HEIGHT = Math.round(127 * coinScale);

    // === 各元件尺寸 ===
    SETTINGS_BTN_SIZE = Math.max(24, Math.round(28 * scaleFactor));
    SCORE_BG_HEIGHT = Math.max(26, Math.round(32 * scaleFactor));
    SCORE_BG_WIDTH = Math.max(110, Math.round(140 * scaleFactor));
    INFO_FONT_SIZE = Math.max(16, Math.round(18 * scaleFactor));

    // === 膠囊水平避讓，右側區塊對齊 TOP_AREA 下緣 ===
    const rightEdge = screenWidth - uiMargin;
    console.log(`[UI] screenWidth=${screenWidth} contentH=${topContentHeight} capsule=${JSON.stringify(menuButtonInfo)}`);

    // === 右半部佈局（靠右，垂直排列，對齊 TOP_AREA 下緣） ===
    // 佈局：第一行 [分數框] [⚙️]
    //        第二行 [第N關 (剩餘M)]
    const rowGap = Math.max(16, Math.round(20 * scaleFactor));
    const scoreGearGap = Math.max(4, Math.round(6 * scaleFactor));

    // 計算右側區塊整體高度：分數框 + rowGap + 資訊文字行
    const infoLineH = Math.round(INFO_FONT_SIZE * 1.6);
    const rightBlockH = SCORE_BG_HEIGHT + rowGap + infoLineH;
    // 對齊上方 20% 區域（TOP_AREA）的下緣
    const rightBlockTop = TOP_AREA_HEIGHT - rightBlockH - Math.round(4 * scaleFactor);

    // 第一行：分數框 + 設定按鈕（靠右對齊 rightEdge）
    SETTINGS_BTN_X = rightEdge - SETTINGS_BTN_SIZE;
    SETTINGS_BTN_Y = rightBlockTop + Math.round((SCORE_BG_HEIGHT - SETTINGS_BTN_SIZE) / 2);

    SCORE_BG_X = SETTINGS_BTN_X - scoreGearGap - SCORE_BG_WIDTH;
    SCORE_BG_Y = rightBlockTop;

    // 金幣圖片在分數框內
    COIN_X = SCORE_BG_X + Math.round(7 * scaleFactor);
    COIN_Y = SCORE_BG_Y + Math.round((SCORE_BG_HEIGHT - COIN_HEIGHT) / 2);
    SCORE_FONT_SIZE = Math.max(13, Math.round(17 * scaleFactor));
    SCORE_TEXT_X = COIN_X + COIN_WIDTH + Math.round(5 * scaleFactor);
    SCORE_TEXT_Y = SCORE_BG_Y + Math.round(SCORE_BG_HEIGHT * 0.68);

    // 第二行：關卡 + 剩餘（合併一行，右對齊）
    REMAIN_TEXT_X = rightEdge;
    REMAIN_TEXT_Y = SCORE_BG_Y + SCORE_BG_HEIGHT + rowGap + Math.round(INFO_FONT_SIZE * 1.05);
    // === 卡槽背景動態尺寸與位置 ===
    const SLOT_ASPECT = 900 / 230;
    
    // 盡量用滿螢幕寬度，確保不超出螢幕
    const SLOT_MARGIN = Math.round(12 * scaleFactor);
    SLOT_BG_WIDTH = screenWidth - SLOT_MARGIN * 2;
    // 高度等比例縮放
    SLOT_BG_HEIGHT = SLOT_BG_WIDTH / SLOT_ASPECT;
    const oldSlotY = PAD_TOP + SLOT_Y_OFFSET;
    const oldSlotHeight = CARD_SIZE * 2;
    SLOT_BG_X = (screenWidth - SLOT_BG_WIDTH) / 2;
    SLOT_BG_Y = oldSlotY - (SLOT_BG_HEIGHT - oldSlotHeight) / 2;
    // === 底部道具商店區域 ===
    const bottomCenterY = BOTTOM_AREA_START + BOTTOM_AREA_HEIGHT / 2;
    const shopSize = Math.round(Math.min(BOTTOM_AREA_HEIGHT * 0.7, 60));

    // 商店圖（最左側）
    const shopX = Math.round(screenWidth * 0.02 + 8);
    const shopY = Math.round(bottomCenterY - shopSize / 2);

    // Shelf 道具櫃（商店右側剩餘空間）
    const shelfH = Math.round(shopSize * 1.2);
    const shelfX = shopX + shopSize + 8;
    const shelfW = Math.max(60, screenWidth - shelfX - 8);
    const shelfAspect = 1100 / 228;
    const shelfDrawH = Math.min(shelfH, shelfW / shelfAspect);
    const shelfDrawW = shelfDrawH * shelfAspect;
    const shelfY = Math.round(bottomCenterY - shelfDrawH / 2);

    // 計算 shelf 內每個格子的位置（中間寬、兩側向內收）
    const slotW = Math.round(shelfDrawW * 0.175);
    const slotGapX = Math.round((shelfDrawW - slotW * 5) / 6);
    const slotShift = [slotGapX * 1.5, slotGapX * 0.5, 0, -slotGapX * 0.5, -slotGapX * 1.5];
    shelfSlots = [];
    for (let i = 0; i < 5; i++) {
        shelfSlots.push({
            x: shelfX + slotGapX + (slotW + slotGapX) * i + slotShift[i],
            y: shelfY + Math.round(shelfDrawH * 0.15),
            w: slotW,
            h: Math.round(shelfDrawH * 0.7),
            item: null
        });
    }

    // 商店圖點擊區域
    shopWashRect = { x: shopX - 4, y: shopY - 4, w: shopSize + 8, h: shopSize + 8 };

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
    '1001': 'items/1001.png',
    '10kv': 'items/10kv.png',
    '11k': 'items/11k.png',
    '12e': 'items/12e.png',
    '16k': 'items/16k.png',
    'j08k': 'items/j08k.png',
    'jr10k': 'items/jr10k.png',
    'se10': 'items/se10.png',
    'se11': 'items/se11.png',
    'se28': 'items/se28.png',
    'xx45': 'items/xx45.png',
    'xx46': 'items/xx46.png',
    'xx91': 'items/xx91.png'
};

const CARD_KEYS = ['1001', '10kv', '11k', '12e', '16k', 'j08k', 'jr10k', 'se10', 'se11', 'se28', 'xx45', 'xx46', 'xx91'];
let loadedImages = {};

// ==================== 動畫相關變數 ====================
let activeAnimations = [];
let throwBackAnimations = [];
let shuffleAnimations = [];
let actionAnimations = [];
let throwActionAnimations = [];
let danceAnimations = [];
let bombAnimations = [];
let landingEffects = [];
let gameOverState = null;  // null | 'win' | 'fail'

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

let settingsResetBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let settingsBtnRect = { x: 0, y: 0, w: 80, h: 35 };
let gameOverBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let shopWashRect = { x: 0, y: 0, w: 0, h: 0 };
let shopThrowRect = { x: 0, y: 0, w: 0, h: 0 };
let shelfSlots = [];  // [{ x, y, w, h, item: 'wash'|'throw'|null }]
let shopOpen = false;
let shopItemRects = [];  // [{ x, y, w, h, name, cost, icon }]
let shopCloseRect = { x: 0, y: 0, w: 0, h: 0 };

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

    washAudio = wx.createInnerAudioContext();
    washAudio.src = WASH_SOUND_URL;
    washAudio.loop = true;
    washAudio.volume = 0.5;
    washAudio.onError((err) => {
        console.error("洗牌音效載入失敗:", err);
    });

    throwAudio = wx.createInnerAudioContext();
    throwAudio.src = THROW_SOUND_URL;
    throwAudio.volume = 0.5;
    throwAudio.onError((err) => {
        console.error("丟回音效載入失敗:", err);
    });

    throwBombAudio = wx.createInnerAudioContext();
    throwBombAudio.src = THROWBOMB_SOUND_URL;
    throwBombAudio.volume = 0.5;
    throwBombAudio.onError((err) => {
        console.error("丟炸彈音效載入失敗:", err);
    });

    explosionAudio = wx.createInnerAudioContext();
    explosionAudio.src = EXPLOSION_SOUND_URL;
    explosionAudio.volume = 0.6;
    explosionAudio.onError((err) => {
        console.error("爆炸音效載入失敗:", err);
    });

    coinsAudio = wx.createInnerAudioContext();
    coinsAudio.src = COINS_SOUND_URL;
    coinsAudio.volume = 0.5;
    coinsAudio.onError((err) => {
        console.error("金幣音效載入失敗:", err);
    });

    dropAudio = wx.createInnerAudioContext();
    dropAudio.src = DROP_SOUND_URL;
    dropAudio.volume = 0.5;
    dropAudio.onError((err) => {
        console.error("掉落音效載入失敗:", err);
    });

    dropsAudio = wx.createInnerAudioContext();
    dropsAudio.src = DROPS_SOUND_URL;
    dropsAudio.volume = 0.6;
    dropsAudio.onError((err) => {
        console.error("山崩音效載入失敗:", err);
    });

    clearAudio = wx.createInnerAudioContext();
    clearAudio.src = CLEAR_SOUND_URL;
    clearAudio.volume = 0.5;
    clearAudio.onError((err) => {
        console.error("消除音效載入失敗:", err);
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
        const totalImages = CARD_KEYS.length + 6 + 6 + 3 + 1 + 1 + 4 + 2 + 1 + 1 + 1 + 5 + 1; // +5 dance frames +1 dance icon

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

        // 載入上方區域背景圖片
        const bgTopImg = wx.createImage();
        bgTopImg.src = 'res/background.png';
        bgTopImg.onload = () => {
            loadedCount++;
            loadedImages['bgTop'] = bgTopImg;
            if (loadedCount === totalImages) resolve();
        };
        bgTopImg.onerror = (err) => {
            console.error('載入背景圖片失敗:', err);
            loadedCount++;
            loadedImages['bgTop'] = null;
            if (loadedCount === totalImages) resolve();
        };

        // 載入卡牌底座（slot）
        const slotBaseImg = wx.createImage();
        slotBaseImg.src = 'images/slot.png';
        slotBaseImg.onload = () => {
            loadedCount++;
            loadedImages['slotBase'] = slotBaseImg;
            if (loadedCount === totalImages) resolve();
        };
        slotBaseImg.onerror = (err) => {
            console.error('載入卡牌底座失敗:', err);
            loadedCount++;
            loadedImages['slotBase'] = null;
            if (loadedCount === totalImages) resolve();
        };

        // 載入卡牌圖片（物品）
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
        // 載入動作動畫圖片（1~6.png）
        for (let f = 1; f <= 6; f++) {
            const actionImg = wx.createImage();
            actionImg.src = `res/action/${f}.png`;
            actionImg.onload = () => {
                loadedCount++;
                loadedImages[`action${f}`] = actionImg;
                if (loadedCount === totalImages) resolve();
            };
            actionImg.onerror = (err) => {
                console.error(`載入動作圖片 ${f} 失敗:`, err);
                loadedCount++;
                loadedImages[`action${f}`] = null;
                if (loadedCount === totalImages) resolve();
            };
        }
        // 載入丟回動作圖片（t1~t3.png，270x600）
        for (let f = 1; f <= 3; f++) {
            const throwActionImg = wx.createImage();
            throwActionImg.src = `res/action/t${f}.png`;
            throwActionImg.onload = () => {
                loadedCount++;
                loadedImages[`throwAction${f}`] = throwActionImg;
                if (loadedCount === totalImages) resolve();
            };
            throwActionImg.onerror = (err) => {
                console.error(`載入丟回動作圖片 t${f} 失敗:`, err);
                loadedCount++;
                loadedImages[`throwAction${f}`] = null;
                if (loadedCount === totalImages) resolve();
            };
        }
        // 載入跳舞動畫圖片
        for (let f = 1; f <= 5; f++) {
            const danceImg = wx.createImage();
            danceImg.src = `res/action/dance${f}.png`;
            danceImg.onload = () => {
                loadedCount++;
                loadedImages[`dance${f}`] = danceImg;
                if (loadedCount === totalImages) resolve();
            };
            danceImg.onerror = (err) => {
                console.error(`載入跳舞動畫圖片 dance${f} 失敗:`, err);
                loadedCount++;
                loadedImages[`dance${f}`] = null;
                if (loadedCount === totalImages) resolve();
            };
        }
        // 載入卡槽棧板圖片
        const palletImg = wx.createImage();
        palletImg.src = 'images/pallet.png';

        palletImg.onload = () => {
            loadedCount++;
            loadedImages['pallet'] = palletImg;
            if (loadedCount === totalImages) resolve();
        };

        palletImg.onerror = (err) => {
            console.error('載入棧板圖片失敗:', err);
            loadedCount++;
            loadedImages['pallet'] = null;
            if (loadedCount === totalImages) resolve();
        };

        // 載入失敗畫面圖片
        const failImg = wx.createImage();
        failImg.src = 'images/fail.png';
        failImg.onload = () => {
            loadedCount++;
            loadedImages['fail'] = failImg;
            if (loadedCount === totalImages) resolve();
        };
        failImg.onerror = (err) => {
            console.error('載入失敗圖片失敗:', err);
            loadedCount++;
            loadedImages['fail'] = null;
            if (loadedCount === totalImages) resolve();
        };

        // 載入通關圖片
        const winImg = wx.createImage();
        winImg.src = 'images/win.png';
        winImg.onload = () => {
            loadedCount++;
            loadedImages['win'] = winImg;
            if (loadedCount === totalImages) resolve();
        };
        winImg.onerror = (err) => {
            console.error('載入通關圖片失敗:', err);
            loadedCount++;
            loadedImages['win'] = null;
            if (loadedCount === totalImages) resolve();
        };

        // 載入商店相關圖片
        const loadSimpleImg = (key, path) => {
            const img = wx.createImage();
            img.src = path;
            img.onload = () => { loadedCount++; loadedImages[key] = img; if (loadedCount === totalImages) resolve(); };
            img.onerror = (err) => { console.error(`載入 ${key} 失敗:`, err); loadedCount++; loadedImages[key] = null; if (loadedCount === totalImages) resolve(); };
        };
        loadSimpleImg('shop', 'images/shop.png');
        loadSimpleImg('shelf', 'images/shelf.png');
        loadSimpleImg('washIcon', 'images/wash.png');
        loadSimpleImg('throwIcon', 'images/throw.png');
        loadSimpleImg('switchIcon', 'images/switch.png');
        loadSimpleImg('slotBase1', 'images/slot1.png');
        loadSimpleImg('bombIcon', 'images/bomb.png');
        loadSimpleImg('explode', 'images/explode.png');
        loadSimpleImg('shakeIcon', 'images/shake.png');
        loadSimpleImg('danceIcon', 'images/dance.png');
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
    const upper = allCards.filter(c => !c.removed && !c.isAnimating && c.layer > card.layer);
    for (let u of upper) {
        if (isRectOverlap(card, u)) return true;
    }
    return false;
}

function isCardCoveredBy(upperCard, lowerCard) {
    return upperCard.layer > lowerCard.layer && isRectOverlap(upperCard, lowerCard);
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

function buyItem(type) {
    if (!gameActive) return;
    const costMap = { wash: 100, throw: 30, switch: 50, bomb: 200, shake: 60, dance: 70 };
    const cost = costMap[type] || 0;
    if (cost === 0) return;
    const displayScore = getDisplayScore();
    if (displayScore < cost) {
        wx.showToast({ title: '金幣不足！', icon: 'none', duration: 1000 });
        return;
    }
    if (ownedItems.length >= 5) {
        wx.showToast({ title: '道具櫃已滿！', icon: 'none', duration: 1000 });
        return;
    }
    // 扣金幣（從 currentRoundScore 先扣，不夠再扣 totalScore）
    if (currentRoundScore >= cost) {
        currentRoundScore -= cost;
    } else {
        const remaining = cost - currentRoundScore;
        currentRoundScore = 0;
        totalScore -= remaining;
    }
    ownedItems.push(type);
    // 播放購買音效
    if (sfxEnabled && coinsAudio) {
        coinsAudio.stop();
        coinsAudio.play();
    }
}

function toggleBase() {
    baseVariant = baseVariant === 0 ? 1 : 0;
}

function useDance() {
    if (!gameActive) return;
    let active = stackCards.filter(c => !c.removed && !c.isAnimating);
    if (active.length === 0) return;

    // 挑選最多 5 張：沒被蓋住 + 有蓋住別的卡牌
    let candidates = active.filter(c => {
        if (!c.clickable) return false;
        // 檢查是否有蓋住其他卡牌
        return active.some(other => other !== c && isCardCoveredBy(c, other));
    });
    if (candidates.length === 0) {
        // fallback: 至少有 clickable 的牌
        candidates = active.filter(c => c.clickable);
    }
    candidates = candidates.slice(0, 5);

    const dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    const topLayer = stackCards.reduce((mx, c) => Math.max(mx, c.layer), 0) + 10;
    for (let card of candidates) {
        card.isAnimating = true;
        // 計算卡牌當前的網格位置
        const curCol = Math.round((card.x - BASE_MIN_X) / GRID_STEP);
        const curRow = Math.round((card.y - BASE_MIN_Y) / GRID_STEP);
        // 靠近邊緣則向內移動
        const nearLeft = curCol <= 1;
        const nearRight = curCol >= COLS - 2;
        const nearTop = curRow <= 1;
        const nearBottom = curRow >= ROWS - 2;
        let dc, dr;
        if (nearLeft && !nearRight) dc = 1;
        else if (nearRight && !nearLeft) dc = -1;
        else if (nearTop && !nearBottom) dr = 1;
        else if (nearBottom && !nearTop) dr = -1;
        if (dc === undefined && dr === undefined) {
            const rdir = dirs[Math.floor(Math.random() * dirs.length)];
            dc = rdir[0]; dr = rdir[1];
        } else {
            dc = dc || (Math.random() < 0.5 ? -1 : 1);
            dr = dr || (Math.random() < 0.5 ? -1 : 1);
        }
        // 移動 1 個網格步長並限制在合法範圍
        const newCol = Math.max(0, Math.min(COLS - 1, curCol + dc));
        const newRow = Math.max(0, Math.min(ROWS - 1, curRow + dr));
        const clampedX = BASE_MIN_X + newCol * GRID_STEP;
        const clampedY = BASE_MIN_Y + newRow * GRID_STEP;
        card._danceAnim = {
            fromX: card.x, fromY: card.y,
            toX: clampedX, toY: clampedY,
            startTime: 0, duration: 2000
        };
        card.layer = topLayer;  // 移到最上層
    }

    danceAnimations.push({
        startTime: Date.now(),
        frame: 1,
        phase: 'dance',
        moveStartTime: 0,
        targets: candidates  // 記錄受影響的卡牌
    });
}

function updateDanceAnimations() {
    if (danceAnimations.length === 0) return;
    const now = Date.now();
    const frameInterval = 150;

    for (let i = danceAnimations.length - 1; i >= 0; i--) {
        const a = danceAnimations[i];
        const elapsed = now - a.startTime;

        if (a.phase === 'dance') {
            if (elapsed < 3000) {
                const cycleTime = elapsed < 500 ? 500 : elapsed - 500;
                const cycleFrame = Math.floor((cycleTime % (frameInterval * 4)) / frameInterval);
                a.frame = elapsed < 500 ? 1 : 2 + cycleFrame;
            } else {
                // 3秒後開始移動卡牌
                a.phase = 'move';
                a.moveStartTime = now;
                // 設定卡牌動畫的實際開始時間
                for (let card of a.targets) {
                    if (card._danceAnim) card._danceAnim.startTime = now;
                }
                updateAllCardsClickable();
            }
        }

        // 卡牌移動動畫（僅在 move 階段更新）
        if (a.phase === 'move') {
            for (let card of a.targets) {
                const da = card._danceAnim;
                if (!da || !da.startTime) continue;
                const p = Math.min((now - da.startTime) / da.duration, 1);
                const ease = easeOutCubic(p);
                card.x = da.fromX + (da.toX - da.fromX) * ease;
                card.y = da.fromY + (da.toY - da.fromY) * ease;
                const shakeAmp = (1 - p) * CARD_SIZE * 0.25;
                card.x += Math.sin(now * 0.03 + card.y * 0.01) * shakeAmp;
                card.y += Math.cos(now * 0.035 + card.x * 0.01) * shakeAmp;
                if (p >= 1) {
                    card.x = da.toX; card.y = da.toY;
                    delete card._danceAnim;
                    delete card.isAnimating;
                }
            }
        }

        if (a.phase === 'move' && now - a.moveStartTime > 2500) {
            danceAnimations.splice(i, 1);
            updateAllCardsClickable();
        }
    }
}

function useShake() {
    if (!gameActive) return;
    let active = stackCards.filter(c => !c.removed && (!c.isAnimating || c.willRemove));
    if (active.length === 0) return;

    // 按位置分組（對齊到 GRID_STEP 網格）
    const gridStep = GRID_STEP;
    const posMap = {};
    for (let c of active) {
        const gx = Math.round(c.x / gridStep) * gridStep;
        const gy = Math.round(c.y / gridStep) * gridStep;
        const key = `${gx},${gy}`;
        if (!posMap[key]) posMap[key] = { x: gx, y: gy, cards: [] };
        posMap[key].cards.push(c);
    }

    // 找出中心點 + 上下左右共 5 個位置合計卡牌最多的
    const neighborOffsets = [[0,0],[0,-1],[0,1],[-1,0],[1,0]];
    let bestCenter = null;
    let maxTotal = 0;
    for (let key in posMap) {
        const [cx, cy] = key.split(',').map(Number);
        let total = 0;
        for (let [dx, dy] of neighborOffsets) {
            const nk = `${cx + dx * gridStep},${cy + dy * gridStep}`;
            if (posMap[nk]) total += posMap[nk].cards.length;
        }
        if (total > maxTotal) { maxTotal = total; bestCenter = { x: cx, y: cy }; }
    }
    if (!bestCenter) return;

    // 收集中心 + 上下左右五個位置的所有卡牌
    let affectedCards = [];
    for (let [dx, dy] of neighborOffsets) {
        const key = `${bestCenter.x + dx * gridStep},${bestCenter.y + dy * gridStep}`;
        if (posMap[key]) affectedCards.push(...posMap[key].cards);
    }
    if (affectedCards.length === 0) return;

    // 播放山崩音效
    if (sfxEnabled && dropsAudio) {
        dropsAudio.stop();
        dropsAudio.play();
    }

    // 對受影響區域每張卡牌往 8 個方向隨機外移 0.5～1 個卡牌距離（動畫 3 秒）
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    const now = Date.now();
    for (let card of affectedCards) {
        card.isAnimating = true;
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const dist = CARD_SIZE * (0.5 + Math.random() * 0.5);
        const newX = card.x + dir[0] * dist;
        const newY = card.y + dir[1] * dist;
        const clampedX = Math.round(Math.max(CARD_SIZE * 0.5, Math.min(screenWidth - CARD_SIZE * 0.5, newX)) / GRID_STEP) * GRID_STEP;
        const clampedY = Math.round(Math.max(CARD_SIZE * 0.5, Math.min(screenHeight * 0.7, newY)) / GRID_STEP) * GRID_STEP;
        card._shakeAnim = {
            fromX: card.x, fromY: card.y,
            toX: clampedX, toY: clampedY,
            startTime: now, duration: 3000
        };
        card.layer = (card.layer || 1) + Math.floor(Math.random() * 0.5);
    }
}

function updateShakeAnimations() {
    const now = Date.now();
    for (let card of stackCards) {
        const a = card._shakeAnim;
        if (!a) continue;
        const progress = Math.min((now - a.startTime) / a.duration, 1);
        const ease = easeOutCubic(progress);
        card.x = a.fromX + (a.toX - a.fromX) * ease;
        card.y = a.fromY + (a.toY - a.fromY) * ease;
        // 抖動效果：小幅正弦震動（初期強烈，逐漸衰減）
        const shakeAmp = (1 - progress) * CARD_SIZE * 0.25;
        card.x += Math.sin(now * 0.03 + card.y * 0.01) * shakeAmp;
        card.y += Math.cos(now * 0.035 + card.x * 0.01) * shakeAmp;
        if (progress >= 1) {
            delete card._shakeAnim;
            delete card.isAnimating;
        }
    }
}

function useBomb(shelfIndex) {
    if (!gameActive) return;
    // 從櫃中移除
    if (shelfIndex < ownedItems.length && ownedItems[shelfIndex] === 'bomb') {
        ownedItems.splice(shelfIndex, 1);
    }
    let active = stackCards.filter(c => !c.removed && !c.isAnimating);
    if (active.length === 0) return;

    // 隨機選一個位置
    const targetCard = active[Math.floor(Math.random() * active.length)];
    const targetX = targetCard.x;
    const targetY = targetCard.y;

    // 收集該位置附近最多 5 張牌
    let nearby = active.filter(c => {
        const dist = Math.hypot(c.x - targetX, c.y - targetY);
        return dist < CARD_SIZE * 0.9;
    });
    nearby.sort((a, b) => b.layer - a.layer);
    nearby = nearby.slice(0, 5);

    // 確保每種類型都是 3 的倍數：從其他位置移除多餘的牌
    let removedIcons = nearby.map(c => c.icon);
    let allIcons = active.map(c => c.icon);

    // 檢查 removed 後的剩餘是否都是 3 的倍數
    let remainingIcons = [...allIcons];
    for (let ic of removedIcons) {
        const idx = remainingIcons.indexOf(ic);
        if (idx !== -1) remainingIcons.splice(idx, 1);
    }

    // 找出需要額外移除的牌
    let count = new Map();
    for (let ic of remainingIcons) count.set(ic, (count.get(ic) || 0) + 1);
    let extraToRemove = [];
    for (let [ic, cnt] of count) {
        while (cnt % 3 !== 0 && cnt > 0) {
            cnt--;
            extraToRemove.push(ic);
        }
    }

    let extraCards = active.filter(c => !nearby.includes(c));
    let finalRemove = [...nearby];
    for (let ic of extraToRemove) {
        let found = extraCards.find(c => c.icon === ic && !finalRemove.includes(c));
        if (found) finalRemove.push(found);
    }

    // 標記為等待爆炸後飛走（不設 isAnimating，卡牌仍正常顯示）
    for (let c of finalRemove) {
        c.willRemove = true;
    }

    // 炸彈從 shelf 位置飛到螢幕中央（變大），再落到目標位置
    const shelfSlot = shelfSlots[shelfIndex] || { x: screenWidth * 0.5, y: screenHeight * 0.9, w: 30, h: 30 };
    const startX = shelfSlot.x + shelfSlot.w / 2 - CARD_SIZE * 0.35;
    const startY = shelfSlot.y - CARD_SIZE * 0.3;
    const centerX = screenWidth / 2 - screenHeight * 0.25;
    const centerY = screenHeight * 0.15;
    bombAnimations.push({
        x: startX, y: startY,
        startX, startY,
        centerX, centerY,
        targetX: targetX - CARD_SIZE / 2,
        targetY: targetY - CARD_SIZE / 2,
        startTime: Date.now(),
        size: CARD_SIZE * 0.7,
        bigSize: screenHeight * 0.5,
        phase: 'flyUp',
        cards: finalRemove,
        cardStartTime: 0  // 卡牌飛走開始時間（爆炸後）
    });
    // 播放丟炸彈音效
    if (sfxEnabled && throwBombAudio) {
        throwBombAudio.seek(0);
        throwBombAudio.play();
    }

    updateAllCardsClickable();
    checkGameEnd();
}

function updateBombAnimations() {
    if (bombAnimations.length === 0) return;
    const now = Date.now();
    const completed = [];

    for (let i = 0; i < bombAnimations.length; i++) {
        const a = bombAnimations[i];

        if (a.phase === 'flyUp') {
            // 飛到螢幕中央並變大（逐漸變慢，模擬向上飛失去動量）
            const elapsed = now - a.startTime;
            const progress = Math.min(elapsed / 500, 1);
            const ease = easeOutQuint(progress);
            a.x = a.startX + (a.centerX - a.startX) * ease;
            a.y = a.startY + (a.centerY - a.startY) * ease;
            a.size = CARD_SIZE * 0.7 + (a.bigSize - CARD_SIZE * 0.7) * ease;
            if (progress >= 1) {
                a.phase = 'flyDown';
                a.flyDownStart = now;
            }
        } else if (a.phase === 'flyDown') {
            // 從中央落到目標位置（逐漸變快，模擬向下掉落加速）
            const elapsed = now - a.flyDownStart;
            const progress = Math.min(elapsed / 400, 1);
            const ease = easeInQuint(progress);
            a.x = a.centerX + (a.targetX - a.centerX) * ease;
            a.y = a.centerY + (a.targetY - a.centerY) * ease;
            a.size = a.bigSize + (CARD_SIZE * 0.7 - a.bigSize) * ease;
            if (progress >= 1) {
                a.phase = 'explode';
                a.explodeTime = now;
                a.cardStartTime = now;
                // 爆炸開始時標記卡牌為動畫中，更新可點擊狀態
                for (let c of a.cards) {
                    c.isAnimating = true;
                }
                updateAllCardsClickable();
                // 停止丟炸彈音效，播放爆炸音效
                if (sfxEnabled && throwBombAudio) throwBombAudio.stop();
                if (sfxEnabled && explosionAudio) {
                    explosionAudio.seek(0);
                    explosionAudio.play();
                }
            }
        } else {
            // 爆炸效果 + 卡牌飛走
            const expElapsed = now - a.explodeTime;
            const expProgress = Math.min(expElapsed / 800, 1);
            const scale = expProgress < 0.3
                ? 0.5 + expProgress * 5
                : 2.0 - (expProgress - 0.3) * 1.5;
            a.explodeSize = CARD_SIZE * Math.max(scale, 0.3);
            a.explodeAlpha = expProgress < 0.6 ? 1 : 1 - (expProgress - 0.6) / 0.4;

            // 卡牌飛出：爆炸開始後卡牌從原位飛向屏幕外
            const cardElapsed = now - a.cardStartTime;
            const cardProgress = Math.min(cardElapsed / 600, 1);
            for (let c of a.cards) {
                if (!c._flyDir) {
                    c._flyDir = { dx: (Math.random() - 0.5) * 2, dy: -(0.5 + Math.random()) };
                }
                c._flyX = c.x + c._flyDir.dx * screenWidth * cardProgress;
                c._flyY = c.y + c._flyDir.dy * screenHeight * cardProgress;
                c._flyAlpha = 1 - cardProgress;
            }

            if (expProgress >= 1) completed.push(i);
        }
    }

    for (let idx of completed.reverse()) {
        const anim = bombAnimations[idx];
        for (let c of anim.cards) {
            c.removed = true;
            delete c.willRemove;
            delete c.isAnimating;
            delete c._flyDir;
        }
        bombAnimations.splice(idx, 1);
        updateAllCardsClickable();
        checkGameEnd();
    }
}

function resetToolCounts() {
    ownedItems = [];
    baseVariant = 0;
}

function eliminateFromSlot() {
    let changed = false;
    while (true) {
        let count = new Map();
        for (let icon of slotCards) count.set(icon, (count.get(icon) || 0) + 1);
        let target = null;
        for (let [icon, cnt] of count) if (cnt >= 3) { target = icon; break; }
        if (!target) break;
        // 找到被消除的第一張牌在槽中的位置（視覺起點）
        let matchIndex = slotCards.indexOf(target);
        let newSlot = [], removed = 0;
        for (let icon of slotCards) {
            if (icon === target && removed < 3) { removed++; continue; }
            newSlot.push(icon);
        }
        slotCards = newSlot;
        addScore(10);

        // 生成搬運動畫
        spawnActionAnimation(matchIndex);
        changed = true;
    }
    if (changed) {
        // 播放消除音效
        if (sfxEnabled && clearAudio) {
            clearAudio.stop();
            clearAudio.play();
        }
        checkGameEnd();
    }
}

function getSlotInsertIndex(icon, cards = slotCards) {
    const sameIconIndex = cards.lastIndexOf(icon);
    return sameIconIndex === -1 ? cards.length : sameIconIndex + 1;
}

function insertIconIntoSlot(icon, cards = slotCards) {
    const insertIndex = getSlotInsertIndex(icon, cards);
    cards.splice(insertIndex, 0, icon);
    return insertIndex;
}

function getProjectedSlotCards() {
    const projectedSlotCards = [...slotCards];

    for (let anim of activeAnimations) {
        if (anim.card && !anim.card.removed) {
            insertIconIntoSlot(anim.card.icon, projectedSlotCards);
        }
    }

    return projectedSlotCards;
}

function checkGameEnd() {
    let remaining = stackCards.filter(c => !c.removed).length;
    if (remaining === 0 && slotCards.length === 0 && gameActive) {
        gameActive = false;
        gameOverState = 'win';
        totalScore += currentRoundScore;
        currentRoundScore = 0;
        return true;
    }
    if (slotCards.length >= 6 && gameActive) {
        let can = false;
        let cnt = new Map();
        for (let icon of slotCards) cnt.set(icon, (cnt.get(icon) || 0) + 1);
        for (let v of cnt.values()) if (v >= 3) can = true;
        if (!can) {
            gameActive = false;
            gameOverState = 'fail';
            return true;
        }
    }
    return false;
}

// ==================== 動畫系統 ====================
function easeOutCubic(t) {
    return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInCubic(t) {
    return t * t * t;
}

function easeOutQuint(t) {
    return 1 - Math.pow(1 - t, 5);
}

function easeInQuint(t) {
    return t * t * t * t * t;
}

function startCardAnimation(card, fromX, fromY, toX, toY) {
    playClickSound();

    card.isAnimating = true;
    card.animatedRemoved = true;

    // 立即更新可點擊狀態：讓被蓋住的牌立刻變為可取
    updateAllCardsClickable();

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
                insertIconIntoSlot(anim.card.icon);
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

function startThrowBackAnimation(icon, fromX, fromY, toX, toY, targetCenterX, targetCenterY, targetLayer) {
    throwBackAnimations.push({
        icon,
        fromX,
        fromY,
        toX,
        toY,
        targetCenterX,
        targetCenterY,
        targetLayer,
        startTime: Date.now(),
        duration: 650,
        currentX: fromX,
        currentY: fromY,
        rotation: 0
    });
}

function updateThrowBackAnimations() {
    const now = Date.now();
    const completedAnimations = [];

    for (let i = 0; i < throwBackAnimations.length; i++) {
        const anim = throwBackAnimations[i];
        const elapsed = now - anim.startTime;
        const progress = Math.min(1, elapsed / anim.duration);
        const easeProgress = easeOutCubic(progress);
        const arcLift = Math.sin(Math.PI * progress) * CARD_SIZE * 0.7;

        anim.currentX = anim.fromX + (anim.toX - anim.fromX) * easeProgress;
        anim.currentY = anim.fromY + (anim.toY - anim.fromY) * easeProgress - arcLift;
        anim.rotation = (1 - progress) * -0.18;

        if (progress >= 1) {
            completedAnimations.push(i);
            stackCards.push({
                id: nextCardId++,
                icon: anim.icon,
                x: anim.targetCenterX,
                y: anim.targetCenterY,
                layer: anim.targetLayer,
                clickable: true,
                removed: false,
                isAnimating: false,
                animatedRemoved: false
            });
            landingEffects.push({
                x: anim.targetCenterX,
                y: anim.targetCenterY,
                startTime: now,
                duration: 720
            });
            // 播放掉落音效
            if (sfxEnabled && dropAudio) {
                dropAudio.stop();
                dropAudio.play();
            }
        }
    }

    for (let i = completedAnimations.length - 1; i >= 0; i--) {
        throwBackAnimations.splice(completedAnimations[i], 1);
    }

    if (completedAnimations.length > 0) {
        updateAllCardsClickable();
    }

    landingEffects = landingEffects.filter(effect => now - effect.startTime < effect.duration);
}

function updateShuffleAnimations() {
    if (shuffleAnimations.length === 0) return;
    const now = Date.now();
    const completedIndices = [];
    let maxProgress = 0;

    for (let i = 0; i < shuffleAnimations.length; i++) {
        const anim = shuffleAnimations[i];
        const elapsed = now - anim.startTime;
        const progress = Math.min(elapsed / anim.totalDuration, 1);
        maxProgress = Math.max(maxProgress, progress);

        if (anim.phase === 'flyOut') {
            const t = Math.min(progress / 0.5, 1);
            const ease = easeOutCubic(t);
            anim.currentX = anim.fromX + (anim.midwayX - anim.fromX) * ease;
            anim.currentY = anim.fromY + (anim.midwayY - anim.fromY) * ease;
            anim.rotation = ease * Math.PI * 2 * (Math.random() > 0.5 ? 1 : -1);

            if (progress >= 0.5) {
                anim.phase = 'flyIn';
            }
        } else {
            const t = Math.min((progress - 0.5) / 0.5, 1);
            const ease = easeOutBack(t);
            anim.currentX = anim.midwayX + (anim.toX - anim.midwayX) * ease;
            anim.currentY = anim.midwayY + (anim.toY - anim.midwayY) * ease;
            anim.rotation = (1 - ease) * 0.3 * (Math.random() > 0.5 ? 1 : -1);

            if (progress >= 1) {
                completedIndices.push(i);
            }
        }
    }

    // 洗牌音效淡出：進度超過 70% 時開始降低音量
    if (washAudio && maxProgress >= 0.7 && maxProgress < 1) {
        const fadeProgress = (maxProgress - 0.7) / 0.3;
        washAudio.volume = Math.max(0, 0.5 * (1 - fadeProgress));
    }

    // 完成動畫的卡片：更新 icon 並清除動畫標記
    for (let idx = completedIndices.length - 1; idx >= 0; idx--) {
        const anim = shuffleAnimations[completedIndices[idx]];
        anim.card.icon = anim.newIcon;
        delete anim.card.isAnimating;
    }

    for (let idx = completedIndices.length - 1; idx >= 0; idx--) {
        shuffleAnimations.splice(completedIndices[idx], 1);
    }

    if (completedIndices.length > 0) {
        updateAllCardsClickable();
    }

    // 所有動畫完成時停止洗牌音效
    if (shuffleAnimations.length === 0 && washAudio) {
        washAudio.stop();
    }
}

function spawnActionAnimation(slotIndex) {
    const pos = getSlotCardPosition(slotIndex);
    // 圖片比例 330:600，底部對齊卡槽背景底部，高度比卡槽高
    const h = SLOT_BG_HEIGHT * 1.4 * 1.5;  // 再增大一半
    const w = h * (330 / 600);
    const bottomY = SLOT_BG_Y + SLOT_BG_HEIGHT + 50;
    actionAnimations.push({
        x: pos.x,
        y: bottomY - h,
        startX: pos.x,
        w: w, h: h,
        size: Math.max(w, h), // 保留舊欄位兼容
        startTime: Date.now(),
        duration: 2200,
        frame: 1,
        frameTimer: 0,
        frameInterval: 120,
        phase: 'lift',
        finished: false
    });
}

function updateActionAnimations() {
    if (actionAnimations.length === 0) return;
    const now = Date.now();

    for (let i = 0; i < actionAnimations.length; i++) {
        const a = actionAnimations[i];
        const elapsed = now - a.startTime;
        const progress = Math.min(elapsed / a.duration, 1);

        // 站立階段：x 不動；跑步階段才開始右移
        if (a.phase === 'lift') {
            a.x = a.startX;  // 站在原地
        } else {
            // 從開始跑步的位置線性移到螢幕外
            if (!a.runStartTime) a.runStartTime = now;
            const runElapsed = now - a.runStartTime;
            const runDuration = a.duration - (a.liftDuration || a.duration * 0.3);
            const runProgress = Math.min(runElapsed / runDuration, 1);
            const targetX = screenWidth + a.w;
            a.x = a.startX + (targetX - a.startX) * runProgress;
        }

        // 幀更新
        a.frameTimer += 16;
        if (a.frameTimer >= a.frameInterval) {
            a.frameTimer = 0;
            if (a.phase === 'lift') {
                a.frame++;
                if (a.frame > 3) {
                    a.phase = 'run';
                    a.frame = 4;
                    a.direction = 1;
                    a.liftDuration = now - a.startTime;
                }
            } else {
                // 跑步循環：4→5→6→4→5→6...
                a.frame++;
                if (a.frame > 6) a.frame = 4;
            }
        }

        if (progress >= 1) {
            a.finished = true;
        }
    }

    actionAnimations = actionAnimations.filter(a => !a.finished);
}

function spawnThrowActionAnimation(slotPos, throwBackInfo) {
    const h = SLOT_BG_HEIGHT * 1.8;
    const w = h * (270 / 600);
    const bottomY = SLOT_BG_Y + SLOT_BG_HEIGHT + 50;
    throwActionAnimations.push({
        x: slotPos.x - w / 2 + 50,
        y: bottomY - h,
        w: w, h: h,
        startTime: Date.now(),
        duration: 800,
        frame: 1,
        prevFrame: 1,
        frameTimer: 0,
        frameInterval: 180,
        finished: false,
        throwBackInfo: throwBackInfo,
        throwStarted: false
    });
}

function updateThrowActionAnimations() {
    if (throwActionAnimations.length === 0) return;
    const now = Date.now();

    for (let i = 0; i < throwActionAnimations.length; i++) {
        const a = throwActionAnimations[i];
        const elapsed = now - a.startTime;
        const progress = Math.min(elapsed / a.duration, 1);

        // 幀更新：t1→t2→t3，到 t3 後停留
        a.frameTimer += 16;
        if (a.frameTimer >= a.frameInterval && a.frame < 3) {
            a.frameTimer = 0;
            a.prevFrame = a.frame;
            a.frame++;
        }

        // 當進入第2幀時觸發丟回卡牌動畫
        if (a.frame >= 2 && !a.throwStarted && a.throwBackInfo) {
            a.throwStarted = true;
            const info = a.throwBackInfo;
            startThrowBackAnimation(
                info.icon,
                info.fromX, info.fromY,
                info.toX, info.toY,
                info.targetCX, info.targetCY,
                info.targetLayer
            );
        }

        if (progress >= 1) {
            a.finished = true;
        }
    }

    throwActionAnimations = throwActionAnimations.filter(a => !a.finished);
}

function getSlotCardPosition(index) {
    const slotGap = Math.max(0, (SLOT_BG_WIDTH - CARD_SIZE * 6) / 7);

    return {
        x: SLOT_BG_X + slotGap * (index + 1) + CARD_SIZE * index,
        y: SLOT_BG_Y + SLOT_BG_HEIGHT * SLOT_CARD_Y_RATIO - 20
    };
}

function onCardClick(card) {
    if (!gameActive || !card.clickable) return;
    if (card.isAnimating) return;

    // 計算卡槽中目標卡牌的位置
    const projectedSlotCards = getProjectedSlotCards();
    if (projectedSlotCards.length >= 6) return;

    const targetSlotIndex = getSlotInsertIndex(card.icon, projectedSlotCards);
    const targetSlotPosition = getSlotCardPosition(targetSlotIndex);
    const targetX = targetSlotPosition.x;
    const targetY = targetSlotPosition.y;

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
    gameOverState = null;
    activeAnimations = [];
    throwBackAnimations = [];
    shuffleAnimations = [];
    actionAnimations = [];
    throwActionAnimations = [];
    danceAnimations = [];
    bombAnimations = [];
    landingEffects = [];
    resetToolCounts();

    settingsVisible = false;
}

function resetGame() {
    // 重置遊戲：回到第一關，重置總分
    totalScore = 0;
    currentRoundScore = 0;
    currentLevel = 1;
    resetToolCounts();
    loadLevel(currentLevel, false);
}

function shuffleRemaining() {
    if (!gameActive) return;
    const washIdx = ownedItems.indexOf('wash');
    if (washIdx === -1) {
        wx.showToast({ title: '沒有洗牌道具', icon: 'none', duration: 1000 });
        return;
    }

    let active = stackCards.filter(c => !c.removed && !c.isAnimating);
    if (active.length === 0) return;

    // 消耗一個洗牌道具
    ownedItems.splice(washIdx, 1);

    // 洗牌 icon 列表
    let icons = active.map(c => c.icon);
    let shuffled = shuffleArray([...icons]);

    // 為每張牌生成動畫：從原位 → 亂飛 → 回原位（但 icon 已換）
    const totalDuration = 3000;
    const now = Date.now();
    const topAreaH = screenHeight * TOP_AREA_RATIO;

    for (let i = 0; i < active.length; i++) {
        const card = active[i];
        card.isAnimating = true;

        const baseX = card.x - CARD_SIZE / 2;
        const baseY = card.y - CARD_SIZE / 2;

        // 隨機中繼點（在螢幕範圍內亂飛）
        const midwayX = Math.random() * (screenWidth - CARD_SIZE);
        const midwayY = topAreaH + Math.random() * (screenHeight * 0.5 - CARD_SIZE);

        shuffleAnimations.push({
            card: card,
            newIcon: shuffled[i],
            fromX: baseX, fromY: baseY,
            midwayX: midwayX, midwayY: midwayY,
            toX: baseX, toY: baseY,  // 回到原位
            startTime: now,
            totalDuration: totalDuration,
            phase: 'flyOut'
        });
    }

    // 播放洗牌音效（循環）
    if (sfxEnabled && washAudio) {
        washAudio.volume = 0.5;
        washAudio.seek(0);
        washAudio.play();
    }
}

function throwBackLastSlotCard() {
    if (!gameActive) return;
    const throwIdx = ownedItems.indexOf('throw');
    if (throwIdx === -1) {
        wx.showToast({ title: '沒有丟回道具', icon: 'none', duration: 1000 });
        return;
    }

    if (slotCards.length === 0) {
        wx.showToast({ title: '卡槽沒有卡片', icon: 'none', duration: 1000 });
        return;
    }

    // 消耗一個丟回道具
    ownedItems.splice(throwIdx, 1);

    const slotIndex = 0;  // 丟回第一個位置的卡牌
    const fromPosition = getSlotCardPosition(slotIndex);
    const icon = slotCards.shift();
    const activeCards = stackCards.filter(c => !c.removed && !c.isAnimating);
    const positionPool = activeCards.length > 0 ? activeCards : BASE_POSITIONS;
    const target = positionPool[Math.floor(Math.random() * positionPool.length)];
    const topLayer = stackCards.reduce((maxLayer, c) => Math.max(maxLayer, c.layer), 0) + 1;
    const targetX = target.x - CARD_SIZE / 2;
    const targetY = target.y - CARD_SIZE / 2;

    // 播放丟回音效
    if (sfxEnabled && throwAudio) {
        throwAudio.stop();
        throwAudio.play();
    }

    // 播放丟回動作動畫（動畫到第2幀時才觸發卡牌飛出）
    spawnThrowActionAnimation(fromPosition, {
        icon, fromX: fromPosition.x, fromY: fromPosition.y,
        toX: targetX, toY: targetY,
        targetCX: target.x, targetCY: target.y,
        targetLayer: topLayer
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
    const slotBase = loadedImages[baseVariant === 0 ? 'slotBase' : 'slotBase1'];
    const size = CARD_SIZE * scale;
    const offset = (size - CARD_SIZE) / 2;

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

    // 繪製底座（slot.png，150x150）
    if (slotBase && slotBase.complete) {
        ctx.drawImage(slotBase, drawX, drawY, size, size);
    }

    // 在底座上繪製物品
    if (img && img.complete) {
        ctx.drawImage(img, drawX, drawY, size, size);
    } else {
        // fallback：繪製文字標籤
        ctx.font = `bold ${Math.max(12, CARD_SIZE * 0.3 * scale)}px "Segoe UI"`;
        ctx.fillStyle = '#5a2f0a';
        ctx.textAlign = 'center';
        ctx.fillText(card.icon, drawX + size / 2, drawY + size / 2 + 6);
        ctx.textAlign = 'left';
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

function drawLandingEffects(ctx) {
    const now = Date.now();

    for (let effect of landingEffects) {
        const progress = Math.min(1, (now - effect.startTime) / effect.duration);
        const alpha = 1 - progress;
        const radius = CARD_SIZE * (0.45 + progress * 0.9);

        ctx.save();
        const glow = ctx.createRadialGradient(effect.x, effect.y, 0, effect.x, effect.y, radius);
        glow.addColorStop(0, `rgba(255, 236, 158, ${0.42 * alpha})`);
        glow.addColorStop(0.45, `rgba(255, 190, 84, ${0.24 * alpha})`);
        glow.addColorStop(1, 'rgba(255, 190, 84, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(255, 226, 130, ${0.8 * alpha})`;
        ctx.lineWidth = Math.max(2, CARD_SIZE * 0.05);
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius * 0.72, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
}
function renderUI() {
    ctx.clearRect(0, 0, screenWidth, screenHeight);

    // 背景
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // === 定義百分比區域變數 ===
    const TOP_AREA_HEIGHT = screenHeight * TOP_AREA_RATIO;
    const MIDDLE_AREA_HEIGHT = screenHeight * MIDDLE_AREA_RATIO;
    const BOTTOM_AREA_HEIGHT = screenHeight * BOTTOM_AREA_RATIO;
    const MIDDLE_AREA_START = TOP_AREA_HEIGHT;
    const BOTTOM_AREA_START = TOP_AREA_HEIGHT + MIDDLE_AREA_HEIGHT;

    // === 上方區域背景（與中間區域同色） ===
    ctx.fillStyle = 'rgba(220, 250, 230, 0.6)';
    ctx.fillRect(0, 0, screenWidth, TOP_AREA_HEIGHT);

    // === 繪製上方區域背景圖片（底部 30% 漸層透明） ===
    const bgTopImg = loadedImages['bgTop'];
    if (bgTopImg && bgTopImg.complete) {
        const imgW = bgTopImg.width;
        const imgH = bgTopImg.height;
        const areaW = screenWidth;
        const areaH = TOP_AREA_HEIGHT;

        const scale = Math.max(areaW / imgW, areaH / imgH);
        const drawW = Math.round(imgW * scale);
        const drawH = Math.round(imgH * scale);
        const drawX = Math.round((areaW - drawW) / 2);
        const drawY = Math.round((areaH - drawH) / 2);

        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, areaW, areaH);
        ctx.clip();
        ctx.globalAlpha = 0.45;
        ctx.drawImage(bgTopImg, drawX, drawY, drawW, drawH);

        // 底部 30% 漸層遮罩：從透明漸變到背景色
        const grad = ctx.createLinearGradient(0, areaH * 0.7, 0, areaH);
        grad.addColorStop(0, 'rgba(220, 250, 230, 0)');
        grad.addColorStop(0.5, 'rgba(220, 250, 230, 0.5)');
        grad.addColorStop(1, 'rgba(220, 250, 230, 0.95)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, areaW, areaH);
        ctx.restore();
    }

    // === 中間區域背景（淺綠色，與上方一致） ===
    ctx.fillStyle = 'rgba(220, 250, 230, 0.6)';
    ctx.fillRect(0, MIDDLE_AREA_START, screenWidth, MIDDLE_AREA_HEIGHT);

    // 繪製卡牌（按層級排序，低層級先繪製）
    let sorted = [...stackCards].sort((a, b) => a.layer - b.layer);
    for (let c of sorted) {
        if (c.removed) continue;
        if (c.isAnimating) continue;
        let x = c.x - CARD_SIZE / 2;
        let y = c.y - CARD_SIZE / 2;
        drawCard(ctx, c, x, y, 1, 1, false, 0);
    }

    // 繪製山崩/跳舞抖動中的卡牌（有 _shakeAnim 或 _danceAnim 的卡牌在動畫中）
    for (let c of stackCards) {
        if (c.removed || (!c._shakeAnim && !c._danceAnim)) continue;
        let x = c.x - CARD_SIZE / 2;
        let y = c.y - CARD_SIZE / 2;
        drawCard(ctx, c, x, y, 1, 1, false, 0);
    }

    // 繪製炸彈飛走的卡牌
    for (let c of stackCards) {
        if (c.removed || !c.willRemove || !c._flyX) continue;
        const tempCard = { icon: c.icon, clickable: false };
        drawCard(ctx, tempCard, c._flyX, c._flyY, 1, c._flyAlpha || 1, true, (Math.random() - 0.5) * 0.3);
    }

    drawLandingEffects(ctx);

    // === 繪製卡槽棧板（每個槽位一個 pallet） ===
    const palletImg = loadedImages['pallet'];
    const palletW = CARD_SIZE + 16;
    const palletH = palletW * 185 / 300;
    const SLOT_COUNT = 6;

    for (let i = 0; i < SLOT_COUNT; i++) {
        const slotPos = getSlotCardPosition(i);
        const px = slotPos.x + (CARD_SIZE - palletW) / 2;
        // 卡片高出棧板約一半高度
        const py = slotPos.y + CARD_SIZE * 1.5 - palletH;

        if (palletImg && palletImg.complete) {
            ctx.drawImage(palletImg, px, py, palletW, palletH);
        } else {
            ctx.fillStyle = '#eeddbb';
            roundRect(ctx, px, py, palletW, palletH, 6);
            ctx.fill();
        }
    }

    const cardSlotWidth = CARD_SIZE;  // 保持原始卡牌大小
    const cardSlotHeight = CARD_SIZE;  // 保持原始卡牌大小

    // 繪製6個槽位卡片
    for (let i = 0; i < 6; i++) {
        const cardSlotPosition = getSlotCardPosition(i);
        const cardSlotX = cardSlotPosition.x;
        const cardSlotY = cardSlotPosition.y;

        if (i < slotCards.length) {
            const iconKey = slotCards[i];
            const img = loadedImages[iconKey];
            const slotBase = loadedImages[baseVariant === 0 ? 'slotBase' : 'slotBase1'];

            // 繪製底座
            if (slotBase && slotBase.complete) {
                ctx.drawImage(slotBase, cardSlotX, cardSlotY, cardSlotWidth, cardSlotHeight);
            } else {
                ctx.fillStyle = '#fff3df';
                roundRect(ctx, cardSlotX, cardSlotY, cardSlotWidth, cardSlotHeight, 8);
                ctx.fill();
                ctx.strokeStyle = '#d4a373';
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // 繪製物品圖標
            if (img && img.complete) {
                const iconSize = cardSlotWidth - 4;
                const iconX = cardSlotX + (cardSlotWidth - iconSize) / 2;
                const iconY = cardSlotY + (cardSlotHeight - iconSize) / 2;
                ctx.drawImage(img, iconX, iconY, iconSize, iconSize);
            } else {
                ctx.font = `${Math.max(12, cardSlotWidth * 0.3)}px "Segoe UI"`;
                ctx.fillStyle = '#5a2f0a';
                ctx.textAlign = 'center';
                ctx.fillText(iconKey, cardSlotX + cardSlotWidth / 2, cardSlotY + cardSlotHeight / 2 + 6);
                ctx.textAlign = 'left';
            }
        } else {
            // 空槽位
            ctx.save();
            ctx.globalAlpha = 0.45;
            ctx.fillStyle = '#eeddbb';
            roundRect(ctx, cardSlotX, cardSlotY, cardSlotWidth, cardSlotHeight, 8);
            ctx.fill();
            ctx.strokeStyle = '#c9b37c';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.font = `${Math.max(12, cardSlotWidth * 0.3)}px "Segoe UI"`;
            ctx.fillStyle = '#bba46c';
            ctx.fillText('?', cardSlotX + cardSlotWidth * 0.38, cardSlotY + cardSlotHeight * 0.65);
            ctx.restore();
        }
    }

    // === 繪製三消搬運動畫（卡槽前方） ===
    for (let a of actionAnimations) {
        const img = loadedImages[`action${a.frame}`];
        if (img && img.complete) {
            ctx.drawImage(img, a.x, a.y, a.w, a.h);
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

    for (let anim of throwBackAnimations) {
        drawCard(ctx, { icon: anim.icon }, anim.currentX, anim.currentY, 1, 1, true, anim.rotation || 0);
    }

    // === 繪製丟回動作動畫（卡牌上方） ===
    for (let a of throwActionAnimations) {
        const img = loadedImages[`throwAction${a.frame}`];
        if (img && img.complete) {
            ctx.drawImage(img, a.x, a.y, a.w, a.h);
        }
    }

    // === 繪製炸彈動畫 ===
    for (let a of bombAnimations) {
        if (a.phase === 'flyUp' || a.phase === 'flyDown') {
            const bombImg = loadedImages['bombIcon'];
            if (bombImg && bombImg.complete) {
                ctx.drawImage(bombImg, a.x, a.y, a.size, a.size);
            }
        } else {
            const expImg = loadedImages['explode'];
            if (expImg && expImg.complete) {
                ctx.save();
                if (a.explodeAlpha !== undefined) ctx.globalAlpha = a.explodeAlpha;
                const es = a.explodeSize || a.size * 2;
                const ex = a.targetX - es / 2;
                const ey = a.targetY - es / 2;
                ctx.drawImage(expImg, ex, ey, es, es);
                ctx.restore();
            }
        }
    }

    // === 繪製跳舞動畫（全螢幕半透明） ===
    for (let a of danceAnimations) {
        if (a.phase === 'dance') {
            const danceImg = loadedImages[`dance${a.frame}`];
            if (danceImg && danceImg.complete) {
                const imgW = 784, imgH = 1000;
                const dw = screenWidth;
                const dh = Math.round(screenWidth * (imgH / imgW));
                const dy = Math.round((screenHeight - dh) / 2);
            ctx.drawImage(danceImg, 0, dy, dw, dh);
            }
        }
    }

    // 繪製洗牌動畫中的卡片
    for (let anim of shuffleAnimations) {
        const card = anim.card;
        // 動畫期間暫時用新 icon 繪製
        const tempCard = { icon: anim.newIcon, clickable: card.clickable };
        drawCard(ctx, tempCard, anim.currentX, anim.currentY, 1, 1, true, anim.rotation || 0);
    }

    // === 繪製底部道具商店 ===
    const shopImg = loadedImages['shop'];
    const shelfImg = loadedImages['shelf'];
    const washIconImg = loadedImages['washIcon'];
    const throwIconImg = loadedImages['throwIcon'];
    const shopSize = Math.round(Math.min(BOTTOM_AREA_HEIGHT * 0.7, 60));
    const bottomCenterY = BOTTOM_AREA_START + BOTTOM_AREA_HEIGHT / 2;
    const shopX = Math.round(screenWidth * 0.02 + 8);
    const shopY = Math.round(bottomCenterY - shopSize / 2);

    // 商店圖
    if (shopImg && shopImg.complete) {
        ctx.drawImage(shopImg, shopX, shopY, shopSize, shopSize);
    }

    // Shelf 道具櫃（商店右側，填滿剩餘空間）
    const shelfH = Math.round(shopSize * 1.2);
    const shelfX = shopX + shopSize + 8;
    const shelfW = Math.max(60, screenWidth - shelfX - 8);
    const shelfAspect = 1100 / 228;
    const shelfDrawH = Math.min(shelfH, shelfW / shelfAspect);
    const shelfDrawW = shelfDrawH * shelfAspect;
    const shelfY = Math.round(bottomCenterY - shelfDrawH / 2);
    if (shelfImg && shelfImg.complete) {
        ctx.drawImage(shelfImg, shelfX, shelfY, shelfDrawW, shelfDrawH);
    }

    // 繪製 shelf 內的道具圖標
    const slotW = Math.round(shelfDrawW * 0.175);
    const slotGapX = Math.round((shelfDrawW - slotW * 5) / 6);
    const slotShift = [slotGapX * 1.5, slotGapX * 0.5, 0, -slotGapX * 0.5, -slotGapX * 1.5];
    shelfSlots = [];
    for (let i = 0; i < 5; i++) {
        const sx = shelfX + slotGapX + (slotW + slotGapX) * i + slotShift[i];
        const sy = shelfY + Math.round(shelfDrawH * 0.15);
        const sw = slotW;
        const sh = Math.round(shelfDrawH * 0.7);
        const item = i < ownedItems.length ? ownedItems[i] : null;
        shelfSlots.push({ x: sx, y: sy, w: sw, h: sh, item });

        if (item) {
            // 保持 1:1 比例，取最小邊長置中繪製
            const iconS = Math.min(sw, sh);
            const iconX = sx + (sw - iconS) / 2;
            const iconY = sy + (sh - iconS) / 2;
            const iconMap = { wash: 'washIcon', throw: 'throwIcon', switch: 'switchIcon', bomb: 'bombIcon', shake: 'shakeIcon', dance: 'danceIcon' };
            const iconImg = loadedImages[iconMap[item]];
            if (iconImg && iconImg.complete) {
                ctx.drawImage(iconImg, iconX, iconY, iconS, iconS);
            }
        }
    }

    // === 購物面板（半透明遮罩 + 9 格商店） ===
    if (shopOpen) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        const panelW = Math.min(screenWidth * 0.88, 360);
        const cols = 3;
        const rows = 3;
        const padding = Math.round(panelW * 0.06);
        const gap = Math.round(panelW * 0.05);
        const cellW = Math.round((panelW - padding * 2 - gap * (cols - 1)) / cols);
        const cellH = Math.round(cellW * 1.1);
        const headerH = Math.round(cellH * 0.7);
        const panelH = headerH + padding + (cellH + gap) * rows + padding;
        const panelX = (screenWidth - panelW) / 2;
        const panelY = (screenHeight - panelH) / 2;

        // 面板背景
        ctx.fillStyle = '#fef3dd';
        roundRect(ctx, panelX, panelY, panelW, panelH, 16);
        ctx.fill();

        // 標題
        ctx.textAlign = 'center';
        ctx.fillStyle = '#5a3c1a';
        ctx.font = `bold ${Math.round(cellH * 0.28)}px "KaiTi"`;
        ctx.fillText('道具商店', panelX + panelW / 2, panelY + headerH * 0.55);

        // 關閉按鈕
        const closeSize = Math.round(headerH * 0.45);
        const closeX = panelX + panelW - closeSize - 10;
        const closeY = panelY + 8;
        shopCloseRect = { x: closeX, y: closeY, w: closeSize, h: closeSize };
        ctx.fillStyle = '#d4a373';
        roundRect(ctx, closeX, closeY, closeSize, closeSize, closeSize / 2);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(closeSize * 0.7)}px "Segoe UI"`;
        ctx.fillText('✕', closeX + closeSize / 2, closeY + closeSize * 0.75);
        ctx.textAlign = 'left';

        // 商品定義（目前只有 2 種，預留 9 格）
        const shopItems = [
            { name: 'wash', icon: 'washIcon', label: '洗牌', cost: 100 },
            { name: 'throw', icon: 'throwIcon', label: '丟回', cost: 30 },
            { name: 'switch', icon: 'switchIcon', label: '換座', cost: 50 },
            { name: 'bomb', icon: 'bombIcon', label: '炸彈', cost: 200 },
            { name: 'shake', icon: 'shakeIcon', label: '山崩', cost: 60 },
            { name: 'dance', icon: 'danceIcon', label: '跳舞', cost: 70 },
        ];
        shopItemRects = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const cx = panelX + padding + c * (cellW + gap);
                const cy = panelY + headerH + padding + r * (cellH + gap);
                const item = idx < shopItems.length ? shopItems[idx] : null;

                if (item) {
                    shopItemRects.push({ x: cx, y: cy, w: cellW, h: cellH, name: item.name, cost: item.cost });

                    // 格子背景
                    ctx.fillStyle = '#fff8ed';
                    roundRect(ctx, cx, cy, cellW, cellH, 10);
                    ctx.fill();
                    ctx.strokeStyle = '#d4c4a0';
                    ctx.lineWidth = 1;
                    roundRect(ctx, cx, cy, cellW, cellH, 10);
                    ctx.stroke();

                    // 道具圖標
                    const iconImg = loadedImages[item.icon];
                    const iconS = Math.round(cellW * 0.5);
                    const iconX = cx + (cellW - iconS) / 2;
                    const iconY = cy + Math.round(cellH * 0.06);
                    if (iconImg && iconImg.complete) {
                        ctx.drawImage(iconImg, iconX, iconY, iconS, iconS);
                    }

                    // 名稱
                    ctx.textAlign = 'center';
                    ctx.font = `bold ${Math.round(cellH * 0.14)}px "Segoe UI"`;
                    ctx.fillStyle = '#4a2e0a';
                    ctx.fillText(item.label, cx + cellW / 2, cy + cellH * 0.68);

                    // 價格
                    ctx.font = `${Math.round(cellH * 0.13)}px "Segoe UI"`;
                    ctx.fillStyle = '#b16224';
                    ctx.fillText(`💰 ${item.cost}`, cx + cellW / 2, cy + cellH * 0.88);
                    ctx.textAlign = 'left';
                }
            }
        }
    }

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

    const infoFontSize = Math.max(16, Math.round(INFO_FONT_SIZE * 0.95));

    // 繪製關卡 + 剩餘卡牌（合併一行，右對齊，無背景）
    let remain = stackCards.filter(c => !c.removed && !c.isAnimating).length + throwBackAnimations.length;
    {
        const infoLabel = `第 ${currentLevel} 關 (剩餘${remain})`;
        ctx.font = `bold ${infoFontSize}px "Segoe UI"`;
        ctx.textAlign = 'right';
        ctx.fillStyle = colors.subtitleText;
        ctx.fillText(infoLabel, REMAIN_TEXT_X, REMAIN_TEXT_Y);
        ctx.textAlign = 'left';
    }

    // 設定按鈕
    const gearImg = loadedImages['gear'];
    const gearSize = SETTINGS_BTN_SIZE;
    const gearX = SETTINGS_BTN_X;
    const gearY = SETTINGS_BTN_Y;

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
        const panelHeight = Math.min(240, screenHeight * 0.48);
        const panelX = (screenWidth - panelWidth) / 2;
        const panelY = (screenHeight - panelHeight) / 2;

        ctx.fillStyle = colors.settingsPanel;
        roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 20);
        ctx.fill();

        const panelTitleSize = Math.min(22, Math.round(panelWidth * 0.08));
        ctx.fillStyle = '#5a3c1a';
        ctx.font = `bold ${panelTitleSize}px "KaiTi"`;
        ctx.fillText('設定', panelX + panelWidth * 0.4, panelY + panelHeight * 0.16);

        ctx.strokeStyle = '#d4c4a0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(panelX + 20, panelY + panelHeight * 0.23);
        ctx.lineTo(panelX + panelWidth - 20, panelY + panelHeight * 0.23);
        ctx.stroke();

        const itemFontSize = Math.min(16, Math.round(panelWidth * 0.057));

        // 背景音樂開關
        ctx.fillStyle = bgmEnabled ? '#2f6b2f' : '#aa5440';
        roundRect(ctx, panelX + panelWidth * 0.72, panelY + panelHeight * 0.34, panelWidth * 0.2, panelHeight * 0.14, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
        ctx.fillText(bgmEnabled ? 'ON' : 'OFF', panelX + panelWidth * 0.77, panelY + panelHeight * 0.43);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `${itemFontSize}px "Segoe UI"`;
        ctx.fillText('背景音樂', panelX + panelWidth * 0.1, panelY + panelHeight * 0.43);

        // 切換背景音樂按鈕
        ctx.fillStyle = '#c28a4e';
        roundRect(ctx, panelX + panelWidth * 0.72, panelY + panelHeight * 0.50, panelWidth * 0.2, panelHeight * 0.14, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
        ctx.fillText(`${currentBgmIndex}`, panelX + panelWidth * 0.8, panelY + panelHeight * 0.59);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `${itemFontSize}px "Segoe UI"`;
        ctx.fillText('切換BGM', panelX + panelWidth * 0.1, panelY + panelHeight * 0.59);

        // 點擊音效開關
        ctx.fillStyle = sfxEnabled ? '#2f6b2f' : '#aa5440';
        roundRect(ctx, panelX + panelWidth * 0.72, panelY + panelHeight * 0.66, panelWidth * 0.2, panelHeight * 0.14, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
        ctx.fillText(sfxEnabled ? 'ON' : 'OFF', panelX + panelWidth * 0.77, panelY + panelHeight * 0.75);
        ctx.fillStyle = '#4a2e0a';
        ctx.font = `${itemFontSize}px "Segoe UI"`;
        ctx.fillText('點擊音效', panelX + panelWidth * 0.1, panelY + panelHeight * 0.75);

        // 重新開始按鈕
        const resetBtnX = panelX + panelWidth * 0.1;
        const resetBtnY = panelY + panelHeight * 0.84;
        const resetBtnW = panelWidth * 0.82;
        const resetBtnH = panelHeight * 0.14;
        settingsResetBtnRect = { x: resetBtnX, y: resetBtnY, w: resetBtnW, h: resetBtnH };
        ctx.fillStyle = '#aa5440';
        roundRect(ctx, resetBtnX, resetBtnY, resetBtnW, resetBtnH, 15);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(15, Math.round(panelWidth * 0.052))}px "Segoe UI"`;
        ctx.fillText('重新開始遊戲', resetBtnX + resetBtnW * 0.28, resetBtnY + resetBtnH * 0.68);

        // 關閉按鈕
        ctx.fillStyle = '#aa5440';
        const closeBtnSize = Math.min(30, panelWidth * 0.1);
        const closeX = panelX + panelWidth - closeBtnSize - 10;
        const closeY = panelY + 10;
        roundRect(ctx, closeX, closeY, closeBtnSize, closeBtnSize, closeBtnSize / 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${Math.min(20, Math.round(closeBtnSize * 0.7))}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✕', closeX + closeBtnSize / 2, closeY + closeBtnSize / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // 遊戲結束遮罩
    if (!gameActive) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;

        if (gameOverState === 'win') {
            // === 通關畫面 ===
            const winImg = loadedImages['win'];
            const imgH = Math.min(screenHeight * 0.42, 400);
            const imgW = imgH * (winImg ? winImg.width / winImg.height : 1);
            const imgX = centerX - imgW / 2;
            const imgY = centerY - imgH * 0.55;

            if (winImg && winImg.complete) {
                ctx.drawImage(winImg, imgX, imgY, imgW, imgH);
            }

            ctx.textAlign = 'center';
            ctx.font = 'bold 36px "KaiTi", "華文楷書"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('太棒了！', centerX, imgY + imgH + 36);

            const btnW = Math.min(200, screenWidth * 0.5);
            const btnH = Math.min(50, screenHeight * 0.07);
            const btnX = centerX - btnW / 2;
            const btnY = imgY + imgH + 55;
            gameOverBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

            ctx.fillStyle = '#ffdd99';
            roundRect(ctx, btnX, btnY, btnW, btnH, 14);
            ctx.fill();
            ctx.fillStyle = '#5a3c1a';
            ctx.font = `bold ${Math.min(18, Math.round(btnH * 0.42))}px "Segoe UI"`;
            ctx.fillText('下一關', centerX, btnY + btnH * 0.65);

        } else {
            // === 失敗畫面 ===
            const failImg = loadedImages['fail'];
            const imgH = Math.min(screenHeight * 0.42, 400);
            const imgW = imgH * 541 / 800;
            const imgX = centerX - imgW / 2;
            const imgY = centerY - imgH * 0.55;

            if (failImg && failImg.complete) {
                ctx.drawImage(failImg, imgX, imgY, imgW, imgH);
            }

            ctx.textAlign = 'center';
            ctx.font = 'bold 36px "KaiTi", "華文楷書"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('倉庫滿了', centerX, imgY + imgH + 36);

            const btnW = Math.min(200, screenWidth * 0.5);
            const btnH = Math.min(50, screenHeight * 0.07);
            const btnX = centerX - btnW / 2;
            const btnY = imgY + imgH + 55;
            gameOverBtnRect = { x: btnX, y: btnY, w: btnW, h: btnH };

            ctx.fillStyle = '#ffdd99';
            roundRect(ctx, btnX, btnY, btnW, btnH, 14);
            ctx.fill();
            ctx.fillStyle = '#5a3c1a';
            ctx.font = `bold ${Math.min(18, Math.round(btnH * 0.42))}px "Segoe UI"`;
            ctx.fillText('再來一次', centerX, btnY + btnH * 0.65);

            ctx.fillStyle = '#ffeebb';
            ctx.font = `${Math.min(18, Math.round(screenWidth * 0.045))}px "KaiTi", "華文楷書"`;
            ctx.fillText('我就不信過不了！', centerX, btnY + btnH + 30);
        }

        ctx.textAlign = 'left';
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
        const panelHeight = Math.min(240, screenHeight * 0.48);
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
        const bgmBtnY = panelY + panelHeight * 0.34;
        const bgmBtnW = panelWidth * 0.2;
        const bgmBtnH = panelHeight * 0.14;
        if (x >= bgmBtnX && x <= bgmBtnX + bgmBtnW &&
            y >= bgmBtnY && y <= bgmBtnY + bgmBtnH) {
            toggleBgm();
            return;
        }

        // 切換BGM按鈕
        const switchBgmX = panelX + panelWidth * 0.72;
        const switchBgmY = panelY + panelHeight * 0.50;
        if (x >= switchBgmX && x <= switchBgmX + bgmBtnW &&
            y >= switchBgmY && y <= switchBgmY + bgmBtnH) {
            switchBgm();
            return;
        }

        // 點擊音效開關按鈕
        const sfxBtnX = panelX + panelWidth * 0.72;
        const sfxBtnY = panelY + panelHeight * 0.66;
        if (x >= sfxBtnX && x <= sfxBtnX + bgmBtnW &&
            y >= sfxBtnY && y <= sfxBtnY + bgmBtnH) {
            toggleSfx();
            return;
        }

        // 重新開始遊戲按鈕
        const resetBtnX = panelX + panelWidth * 0.1;
        const resetBtnY = panelY + panelHeight * 0.84;
        const resetBtnW = panelWidth * 0.82;
        const resetBtnH = panelHeight * 0.14;
        if (x >= resetBtnX && x <= resetBtnX + resetBtnW &&
            y >= resetBtnY && y <= resetBtnY + resetBtnH) {
            resetGame();
            return;
        }

        return;
    }
    // 購物面板打開時，只處理面板內點擊
    if (shopOpen) {
        // 關閉按鈕
        if (x >= shopCloseRect.x && x <= shopCloseRect.x + shopCloseRect.w &&
            y >= shopCloseRect.y && y <= shopCloseRect.y + shopCloseRect.h) {
            shopOpen = false;
            return;
        }
        // 商品點擊
        for (let r of shopItemRects) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                buyItem(r.name);
                shopOpen = false;
                return;
            }
        }
        // 面板外點擊關閉
        shopOpen = false;
        return;
    }

    // 檢查商店圖（點擊打開購物面板）
    if (gameActive && shopWashRect &&
        x >= shopWashRect.x && x <= shopWashRect.x + shopWashRect.w &&
        y >= shopWashRect.y && y <= shopWashRect.y + shopWashRect.h) {
        shopOpen = true;
        return;
    }

    // 檢查 shelf 道具櫃（使用道具，使用後從櫃中移除）
    for (let si = 0; si < shelfSlots.length; si++) {
        const slot = shelfSlots[si];
        if (slot.item && gameActive &&
            x >= slot.x && x <= slot.x + slot.w &&
            y >= slot.y && y <= slot.y + slot.h) {
            const used = slot.item;
            if (used === 'wash') {
                shuffleRemaining();
            } else if (used === 'throw') {
                throwBackLastSlotCard();
            } else if (used === 'switch') {
                ownedItems.splice(si, 1);
                toggleBase();
            } else if (used === 'bomb') {
                useBomb(si);
            } else if (used === 'shake') {
                ownedItems.splice(si, 1);
                useShake();
            } else if (used === 'dance') {
                ownedItems.splice(si, 1);
                useDance();
            }
            return;
        }
    }
    // 檢查設定按鈕（遊戲中才能按）
    if (gameActive && settingsBtnRect &&
        x >= settingsBtnRect.x && x <= settingsBtnRect.x + settingsBtnRect.w &&
        y >= settingsBtnRect.y && y <= settingsBtnRect.y + settingsBtnRect.h) {
        toggleSettings();
        return;
    }

    // 遊戲結束畫面按鈕
    if (!gameActive && gameOverBtnRect &&
        x >= gameOverBtnRect.x && x <= gameOverBtnRect.x + gameOverBtnRect.w &&
        y >= gameOverBtnRect.y && y <= gameOverBtnRect.y + gameOverBtnRect.h) {
        if (gameOverState === 'win') {
            // 下一關
            if (currentLevel < TOTAL_LEVELS) {
                currentLevel++;
            } else {
                currentLevel = 1;
                totalScore = 2000;  // 測試階段初始金幣
            }
            resetToolCounts();
            loadLevel(currentLevel, true);
        } else {
            // 再來一次
            resetGame();
        }
        return;
    }

    if (!gameActive || shopOpen) return;

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
    BASE_MIN_Y = PAD_TOP + GRID_STEP / 2;

    BASE_MAX_X = BASE_MIN_X + (COLS - 1) * GRID_STEP;
    BASE_MAX_Y = BASE_MIN_Y + (ROWS - 1) * GRID_STEP;

    // 擴展邊界（包含卡牌完整大小）
    MIN_X = BASE_MIN_X - CARD_SIZE / 2;
    MAX_X = BASE_MAX_X + CARD_SIZE / 2;
    MIN_Y = PAD_TOP;
    MAX_Y = PAD_TOP + (ROWS * GRID_STEP) + (CARD_SIZE * 2) + 40;

    BASE_POSITIONS = generateBaseGrid();

    cardScale = 1;
    offsetX = 0;
    offsetY = 0;

    wx.onTouchStart(onTouchStart);

    // 加載分包資源後初始化音效和圖片
    wx.showLoading({ title: '載入中...' });
    const loadTask = wx.loadSubpackage({
        name: 'res',
        success: () => {
            console.log('分包 res 加載成功');
            wx.hideLoading();
            initAudio();
            loadCardImages().then(() => {
                totalScore = 2000;  // 測試階段初始金幣
                currentRoundScore = 0;
                loadLevel(1, false);
                startGameLoop();
            });
        },
        fail: (err) => {
            console.error('分包加載失敗:', err);
            wx.hideLoading();
            // 嘗試降級：可能資源還在主包
            initAudio();
            loadCardImages().then(() => {
                totalScore = 2000;  // 測試階段初始金幣
                currentRoundScore = 0;
                loadLevel(1, false);
                startGameLoop();
            });
        }
    });

    loadTask.onProgressUpdate((res) => {
        console.log(`分包下載進度: ${res.progress}%`);
    });
}

function startGameLoop() {
    function frame() {
        updateAnimations();
        updateThrowBackAnimations();
        updateShuffleAnimations();
        updateActionAnimations();
        updateThrowActionAnimations();
        updateBombAnimations();
        updateShakeAnimations();
        updateDanceAnimations();
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

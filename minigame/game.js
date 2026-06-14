// 可调整参数（基础值，会根据屏幕大小自动调整）
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

// 从本地储存读取音效设置
try {
    const saved = wx.getStorageSync('audioSettings');
    if (saved) {
        bgmEnabled = saved.bgmEnabled !== undefined ? saved.bgmEnabled : true;
        sfxEnabled = saved.sfxEnabled !== undefined ? saved.sfxEnabled : true;
    }
} catch (e) {
    // ignore
}

// ==================== 道具系统（商店购买 + 道具柜） ====================
let ownedItems = [];  // ['wash' | 'throw' | 'switch']，最多 5 个
let boughtItems = []; // 本关已购买过的道具（使用后也不能再买）
let baseVariant = 0;  // 0 = slot.png, 1 = slot1.png

// ==================== 开始画面 ====================
let startScreenPhase = 'loading'; // 'loading' | 'ready' | 'playing'
let startScreenBtnScale = 1;     // 呼吸缩放
let startScreenBtnRect = null;   // 开始按鈕点击区域
let homeSettingsBtnRect = null;  // 首页设置按鈕区域
let homeLoadBtnRect = null;      // 继续进度按鈕区域
let testAddCoinRect = null;      // 测试：+100 金币
let testSkipRect = null;         // 测试：直接过关
let imageLoadCount = 0;          // 图片加载计数
let imageLoadTotal = 1;          // 图片總数（预设1避免除零）

// 首页角色动画
let homeCharFrame = 0;           // 当前帧 (0=w1, ..., 10=w11)
let homeCharLastTime = 0;
let homeCharLoopCount = 0;       // w9-w11 已循環次数
const HOME_CHAR_INTERVAL = 120;

// ==================== 关卡选择器 ====================
let settingsVisible = false;
let selectedLevel = 1;

// ==================== 禁止位置配置 ====================
let forbiddenPositions = [];

// ==================== 动态缩放变数 ====================
let CARD_SIZE, GRID_STEP, HALF_SHIFT;
let PAD_LEFT, PAD_TOP;
let SLOT_X_OFFSET, SLOT_Y_OFFSET, BTN_Y_OFFSET;

// ✅ 新增：UI 元素的动态变数
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
// ✅ 新增：关卡按鈕数组
let levelButtons1 = [];
let levelButtons2 = [];

// ==================== 累積总分（跨关卡） ====================
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

    // 定义百分比佈局区域
    const TOP_AREA_HEIGHT = screenHeight * TOP_AREA_RATIO;
    const MIDDLE_AREA_HEIGHT = screenHeight * MIDDLE_AREA_RATIO;
    const BOTTOM_AREA_HEIGHT = screenHeight * BOTTOM_AREA_RATIO;
    const MIDDLE_AREA_START = TOP_AREA_HEIGHT;

    // 根据卡牌网格计算所需空间
    const gridWidth = (COLS + 1) * BASE_CARD_SIZE;
    const gridHeight = (ROWS + 1) * BASE_CARD_SIZE;

    // 卡槽高度为 CARD_SIZE 的兩倍
    const slotHeight = BASE_CARD_SIZE * 2;
    const extraPadding = 20; // 額外边距

    // 计算卡牌+卡槽的總所需高度
    const totalContentHeightNeeded = gridHeight + slotHeight + extraPadding;

    // 计算缩放比例（基于高度）
    let scaleFactor = MIDDLE_AREA_HEIGHT / totalContentHeightNeeded;

    // 同时考慮宽度限制
    const gridWidthNeeded = gridWidth + BASE_CARD_SIZE;
    const scaleFactorForWidth = screenWidth / gridWidthNeeded;
    scaleFactor = Math.min(scaleFactor, scaleFactorForWidth, 1.0);

    // 应用缩放
    CARD_SIZE = Math.round(BASE_CARD_SIZE * scaleFactor);
    GRID_STEP = CARD_SIZE;
    HALF_SHIFT = CARD_SIZE / 2;

    // 计算缩放后的实際尺寸
    const actualGridWidth = COLS * GRID_STEP;
    const actualGridHeight = ROWS * GRID_STEP;
    const actualSlotHeight = CARD_SIZE * 2;
    const actualTotalHeight = actualGridHeight + actualSlotHeight + extraPadding;

    // 水平居中
    PAD_LEFT = (screenWidth - actualGridWidth) / 2;

    // 垂直居中在中间区域
    PAD_TOP = MIDDLE_AREA_START + (MIDDLE_AREA_HEIGHT - actualTotalHeight) / 2;

    // 卡槽位置（固定在中间区域底部）
    const BOTTOM_AREA_START = TOP_AREA_HEIGHT + MIDDLE_AREA_HEIGHT; // 中间区域底部
    SLOT_X_OFFSET = 0;  // 水平不需要額外偏移，因为 PAD_LEFT 已經处理了居中
    SLOT_Y_OFFSET = BOTTOM_AREA_START - PAD_TOP - (CARD_SIZE * 2) - 10;  // 中间区域底部 - 卡槽高度 - 10px边距
    BTN_Y_OFFSET = 0;

    // === 頂部区域高度 ===
    const menuButtonInfo = wx.getMenuButtonBoundingClientRect();

    // TOP_AREA 的完整可用高度（不受膠囊垂直影響，膠囊只佔右側）
    const topAreaBottom = TOP_AREA_HEIGHT;
    const topContentTop = safeAreaTop;
    const topContentBottom = topAreaBottom;
    const topContentHeight = topContentBottom - topContentTop;

    // === 标題图片动态尺寸 ===
    const titleAspectRatio = 528 / 200;
    // 标題高度：取 content 的 78% 与 total 的 68%（确保适配各种解析度）
    TITLE_HEIGHT = Math.round(Math.min(topContentHeight * 0.78, TOP_AREA_HEIGHT * 0.68));
    TITLE_WIDTH = Math.round(TITLE_HEIGHT * titleAspectRatio);
    // 限制最大宽度不超过螢幕的 42%
    if (TITLE_WIDTH > screenWidth * 0.42) {
        TITLE_WIDTH = Math.round(screenWidth * 0.42);
        TITLE_HEIGHT = Math.round(TITLE_WIDTH / titleAspectRatio);
    }
    TITLE_X = uiMargin;
    // 标題垂直置中于頂部区域
    TITLE_Y = topContentTop + Math.round((topContentHeight - TITLE_HEIGHT) / 2);

    // === 金币图片动态尺寸 ===
    const coinScale = scaleFactor * 0.45;
    COIN_WIDTH = Math.round(100 * coinScale);
    COIN_HEIGHT = Math.round(127 * coinScale);

    // === 各元件尺寸 ===
    SETTINGS_BTN_SIZE = Math.max(24, Math.round(28 * scaleFactor));
    SCORE_BG_HEIGHT = Math.max(26, Math.round(32 * scaleFactor));
    SCORE_BG_WIDTH = Math.max(110, Math.round(140 * scaleFactor));
    INFO_FONT_SIZE = Math.max(16, Math.round(18 * scaleFactor));

    // === 膠囊水平避让，右側区块对齊 TOP_AREA 下缘 ===
    const rightEdge = screenWidth - uiMargin;
    console.log(`[UI] screenWidth=${screenWidth} contentH=${topContentHeight} capsule=${JSON.stringify(menuButtonInfo)}`);

    // === 右半部佈局（靠右，垂直排列，对齊 TOP_AREA 下缘） ===
    // 佈局：第一行 [分数框] [⚙️]
    //        第二行 [第N关 (剩余M)]
    const rowGap = Math.max(16, Math.round(20 * scaleFactor));
    const scoreGearGap = Math.max(4, Math.round(6 * scaleFactor));

    // 计算右側区块整体高度：分数框 + rowGap + 资訊文字行
    const infoLineH = Math.round(INFO_FONT_SIZE * 1.6);
    const rightBlockH = SCORE_BG_HEIGHT + rowGap + infoLineH;
    // 对齊上方 20% 区域（TOP_AREA）的下缘
    const rightBlockTop = TOP_AREA_HEIGHT - rightBlockH - Math.round(4 * scaleFactor);

    // 第一行：分数框 + 设置按鈕（靠右对齊 rightEdge）
    SETTINGS_BTN_X = rightEdge - SETTINGS_BTN_SIZE;
    SETTINGS_BTN_Y = rightBlockTop + Math.round((SCORE_BG_HEIGHT - SETTINGS_BTN_SIZE) / 2);

    SCORE_BG_X = SETTINGS_BTN_X - scoreGearGap - SCORE_BG_WIDTH;
    SCORE_BG_Y = rightBlockTop;

    // 金币图片在分数框內
    COIN_X = SCORE_BG_X + Math.round(7 * scaleFactor);
    COIN_Y = SCORE_BG_Y + Math.round((SCORE_BG_HEIGHT - COIN_HEIGHT) / 2);
    SCORE_FONT_SIZE = Math.max(13, Math.round(17 * scaleFactor));
    SCORE_TEXT_X = COIN_X + COIN_WIDTH + Math.round(5 * scaleFactor);
    SCORE_TEXT_Y = SCORE_BG_Y + Math.round(SCORE_BG_HEIGHT * 0.68);

    // 第二行：关卡 + 剩余（合并一行，右对齊）
    REMAIN_TEXT_X = rightEdge;
    REMAIN_TEXT_Y = SCORE_BG_Y + SCORE_BG_HEIGHT + rowGap + Math.round(INFO_FONT_SIZE * 1.05);
    // === 卡槽背景动态尺寸与位置 ===
    const SLOT_ASPECT = 900 / 230;
    
    // 盡量用满螢幕宽度，确保不超出螢幕
    const SLOT_MARGIN = Math.round(12 * scaleFactor);
    SLOT_BG_WIDTH = screenWidth - SLOT_MARGIN * 2;
    // 高度等比例缩放
    SLOT_BG_HEIGHT = SLOT_BG_WIDTH / SLOT_ASPECT;
    const oldSlotY = PAD_TOP + SLOT_Y_OFFSET;
    const oldSlotHeight = CARD_SIZE * 2;
    SLOT_BG_X = (screenWidth - SLOT_BG_WIDTH) / 2;
    SLOT_BG_Y = oldSlotY - (SLOT_BG_HEIGHT - oldSlotHeight) / 2;
    // === 底部道具商店区域 ===
    const bottomCenterY = BOTTOM_AREA_START + BOTTOM_AREA_HEIGHT / 2;
    const shopSize = Math.round(Math.min(BOTTOM_AREA_HEIGHT * 0.7, 60));

    // 商店图（最左側）
    const shopX = Math.round(screenWidth * 0.02 + 8);
    const shopY = Math.round(bottomCenterY - shopSize / 2);

    // Shelf 道具柜（商店右側剩余空间）
    const shelfH = Math.round(shopSize * 1.2);
    const shelfX = shopX + shopSize + 8;
    const shelfW = Math.max(60, screenWidth - shelfX - 8);
    const shelfAspect = 1100 / 228;
    const shelfDrawH = Math.min(shelfH, shelfW / shelfAspect);
    const shelfDrawW = shelfDrawH * shelfAspect;
    const shelfY = Math.round(bottomCenterY - shelfDrawH / 2);

    // 计算 shelf 內每个格子的位置（中间宽、兩側向內收）
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

    // 商店图点击区域
    shopWashRect = { x: shopX - 4, y: shopY - 4, w: shopSize + 8, h: shopSize + 8 };

    console.log(`========== 动态尺寸计算 ==========`);
    console.log(`螢幕尺寸: ${screenWidth}x${screenHeight}`);
    console.log(`缩放比例: ${scaleFactor}, 卡牌大小: ${CARD_SIZE}`);
    console.log(`网格区域: ${actualGridWidth}x${actualGridHeight}`);
    console.log(`PAD_LEFT: ${PAD_LEFT}, PAD_TOP: ${PAD_TOP}`);
    console.log(`卡槽偏移: (${SLOT_X_OFFSET}, ${SLOT_Y_OFFSET})`);
    console.log(`中间区域: Y=${MIDDLE_AREA_START} 到 ${MIDDLE_AREA_START + MIDDLE_AREA_HEIGHT}`);
    console.log(`內容範围: Y=${PAD_TOP} 到 ${PAD_TOP + actualTotalHeight}`);
    console.log(`=================================`);
}
function generateForbiddenPositions(level) {
    const cfg = getLevelConfig(level);
    const forbiddenCount = cfg.forbiddenCount;
    const allBasePositions = generateBaseGridForForbidden();

    for (let i = allBasePositions.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [allBasePositions[i], allBasePositions[j]] = [allBasePositions[j], allBasePositions[i]];
    }

    return allBasePositions.slice(0, Math.min(forbiddenCount, allBasePositions.length));
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

// ==================== 关卡配置 ====================
// 关卡设计：forbidden 数、层数、可用卡牌种类
function getLevelConfig(level) {
    if (level <= 5) {
        // Lv1-5: 简单入门，只用 basic 子集
        return {
            layers: 4 + Math.floor((level - 1) / 2),  // 4,4,5,5,5
            cardsPerLayer: 18,
            forbiddenCount: 8 + (level - 1) * 2,       // 8,10,12,14,16
            numCardTypes: 6 + (level - 1)               // 6,7,8,9,10
        };
    } else if (level <= 10) {
        // Lv6-10: 增加层数和禁止格
        return {
            layers: 6 + Math.floor((level - 6) / 2),   // 6,6,7,7,7
            cardsPerLayer: 18,
            forbiddenCount: 18 + (level - 6) * 3,       // 18,21,24,27,30
            numCardTypes: 10 + (level - 6)               // 10,11,12,13,14
        };
    } else if (level <= 15) {
        // Lv11-15: 引入 adv 卡牌，更多层
        return {
            layers: 8 + Math.floor((level - 11) / 2),  // 8,8,9,9,9
            cardsPerLayer: 18,
            forbiddenCount: 33 + (level - 11) * 3,      // 33,36,39,42,45
            numCardTypes: 15 + (level - 11)              // 15,16,17,18,19
        };
    } else if (level <= 20) {
        // Lv16-20: 更多禁止格、穩定层数
        return {
            layers: 9 + Math.floor((level - 16) / 3),  // 9,9,9,10,10
            cardsPerLayer: 18,
            forbiddenCount: 48 + (level - 16) * 3,      // 48,51,54,57,60
            numCardTypes: 20 + (level - 16)              // 20,21,22,23,24
        };
    } else if (level <= 25) {
        // Lv21-25: 高难度
        return {
            layers: 10 + Math.floor((level - 21) / 2), // 10,10,11,11,11
            cardsPerLayer: 18,
            forbiddenCount: 63 + (level - 21) * 3,      // 63,66,69,72,75
            numCardTypes: 24 + (level - 21)              // 24,25,26,27,28
        };
    } else {
        // Lv26-30: 终極难度
        return {
            layers: 12 + Math.floor((level - 26) / 2), // 12,12,13,13,14
            cardsPerLayer: 18,
            forbiddenCount: 78 + (level - 26) * 3,      // 78,81,84,87,90
            numCardTypes: 28 + (level - 26)              // 28,29,29,29,29 (capped at 29)
        };
    }
}

// ==================== 图片资源配置 ====================
const CARD_KEYS = ['apple', 'chair', 'duck', 'frog', 'gear', 'golfball', 'golfclub', 'grape',
    'green', 'hat', 'iphone', 'leaf', 'screw', 'strawberry', 'tv', 'whale'];
const ADV_CARD_KEYS = ['1001', '10kv', '11k', '12e', '16k', 'j08k', 'jr10k', 'se10', 'se11', 'se28', 'xx45', 'xx46', 'xx91'];

const CARD_IMAGES = {};
for (let k of CARD_KEYS) CARD_IMAGES[k] = `items/basic/${k}.png`;
for (let k of ADV_CARD_KEYS) CARD_IMAGES[k] = `items/adv/${k}.png`;
let loadedImages = {};

// ==================== 动画相关变量 ====================
let activeAnimations = [];
let throwBackAnimations = [];
let shuffleAnimations = [];
let actionAnimations = [];
let throwActionAnimations = [];
let danceAnimations = [];
let bombAnimations = [];
let entranceAnimations = [];
let landingEffects = [];
let gameOverState = null;  // null | 'win' | 'fail'

// ==================== 全域变数 ====================
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
let settingsHomeBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let settingsBtnRect = { x: 0, y: 0, w: 80, h: 35 };
let gameOverBtnRect = { x: 0, y: 0, w: 0, h: 0 };
let gameOverHomeBtnRect = null;  // 失败页面的「回到首页」
let gameOverBtn2Rects = [];  // 通关三选一
let shopWashRect = { x: 0, y: 0, w: 0, h: 0 };
let shopThrowRect = { x: 0, y: 0, w: 0, h: 0 };
let shelfSlots = [];  // [{ x, y, w, h, item: 'wash'|'throw'|null }]
let shopOpen = false;
let shopItemRects = [];  // [{ x, y, w, h, name, cost, icon }]
let shopCloseRect = { x: 0, y: 0, w: 0, h: 0 };

// 颜色主題
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

// ==================== 动态计算的边界 ====================
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
        console.error("点击音效载入失败:", err);
    });

    bgmAudio = wx.createInnerAudioContext();
    bgmAudio.src = BGM1_URL;
    bgmAudio.loop = true;
    bgmAudio.volume = 0.4;
    bgmAudio.onError((err) => {
        console.error("背景音乐载入失败:", err);
    });

    washAudio = wx.createInnerAudioContext();
    washAudio.src = WASH_SOUND_URL;
    washAudio.loop = true;
    washAudio.volume = 0.5;
    washAudio.onError((err) => {
        console.error("洗牌音效载入失败:", err);
    });

    throwAudio = wx.createInnerAudioContext();
    throwAudio.src = THROW_SOUND_URL;
    throwAudio.volume = 0.5;
    throwAudio.onError((err) => {
        console.error("丢回音效载入失败:", err);
    });

    throwBombAudio = wx.createInnerAudioContext();
    throwBombAudio.src = THROWBOMB_SOUND_URL;
    throwBombAudio.volume = 0.5;
    throwBombAudio.onError((err) => {
        console.error("丟炸弹音效载入失败:", err);
    });

    explosionAudio = wx.createInnerAudioContext();
    explosionAudio.src = EXPLOSION_SOUND_URL;
    explosionAudio.volume = 0.6;
    explosionAudio.onError((err) => {
        console.error("爆炸音效载入失败:", err);
    });

    coinsAudio = wx.createInnerAudioContext();
    coinsAudio.src = COINS_SOUND_URL;
    coinsAudio.volume = 0.5;
    coinsAudio.onError((err) => {
        console.error("金币音效载入失败:", err);
    });

    dropAudio = wx.createInnerAudioContext();
    dropAudio.src = DROP_SOUND_URL;
    dropAudio.volume = 0.5;
    dropAudio.onError((err) => {
        console.error("掉落音效载入失败:", err);
    });

    dropsAudio = wx.createInnerAudioContext();
    dropsAudio.src = DROPS_SOUND_URL;
    dropsAudio.volume = 0.6;
    dropsAudio.onError((err) => {
        console.error("山崩音效载入失败:", err);
    });

    clearAudio = wx.createInnerAudioContext();
    clearAudio.src = CLEAR_SOUND_URL;
    clearAudio.volume = 0.5;
    clearAudio.onError((err) => {
        console.error("消除音效载入失败:", err);
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
    saveAudioSettings();
    if (bgmEnabled) {
        bgmAudio.play();
    } else {
        bgmAudio.stop();
    }
}

function toggleSfx() {
    sfxEnabled = !sfxEnabled;
    saveAudioSettings();
}

function saveAudioSettings() {
    try {
        wx.setStorageSync('audioSettings', { bgmEnabled, sfxEnabled });
    } catch (e) {
        // ignore
    }
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

// ==================== 图片载入 ====================
function loadCardImages() {
    return new Promise((resolve) => {
        imageLoadCount = 0;
        imageLoadTotal = (CARD_KEYS.length + ADV_CARD_KEYS.length) + 6 + 6 + 3 + 1 + 1 + 4 + 2 + 1 + 1 + 1 + 5 + 1 + 2 + 1 + 1 + 11; // +1 load +1 bank + home char

        // 载入标題图片
        const titleImg = wx.createImage();
        titleImg.src = 'res/images/title.png';
        titleImg.onload = () => {
            imageLoadCount++;
            loadedImages['title'] = titleImg;
            if (imageLoadCount === imageLoadTotal) {
                console.log(`所有图片载入完成，共 ${imageLoadTotal} 張`);
                resolve();
            }
        };
        titleImg.onerror = (err) => {
            console.error('载入标題图片失败:', err);
            imageLoadCount++;
            loadedImages['title'] = null;
            if (imageLoadCount === imageLoadTotal) {
                resolve();
            }
        };

        // 载入开始画面图片
        const startBgImg = wx.createImage();
        startBgImg.src = 'res/images/startbg.png';
        startBgImg.onload = () => {
            imageLoadCount++;
            loadedImages['startBg'] = startBgImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };
        startBgImg.onerror = () => {
            imageLoadCount++;
            loadedImages['startBg'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        const startBtnImg = wx.createImage();
        startBtnImg.src = 'res/images/start.png';
        startBtnImg.onload = () => {
            imageLoadCount++;
            loadedImages['startBtn'] = startBtnImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };
        startBtnImg.onerror = () => {
            imageLoadCount++;
            loadedImages['startBtn'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        const loadImg = wx.createImage();
        loadImg.src = 'res/images/load.png';
        loadImg.onload = () => {
            imageLoadCount++;
            loadedImages['load'] = loadImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };
        loadImg.onerror = () => {
            imageLoadCount++;
            loadedImages['load'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        const bankImg = wx.createImage();
        bankImg.src = 'res/images/bank.png';
        bankImg.onload = () => {
            imageLoadCount++;
            loadedImages['bank'] = bankImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };
        bankImg.onerror = () => {
            imageLoadCount++;
            loadedImages['bank'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        // 载入首页角色动画 w1-w11
        for (let i = 1; i <= 11; i++) {
            const key = `w${i}`;
            const img = wx.createImage();
            img.src = `res/action/w${i}.png`;
            img.onload = () => {
                imageLoadCount++;
                loadedImages[key] = img;
                if (imageLoadCount === imageLoadTotal) resolve();
            };
            img.onerror = () => {
                imageLoadCount++;
                loadedImages[key] = null;
                if (imageLoadCount === imageLoadTotal) resolve();
            };
        }

        // 载入金币图片
        const coinImg = wx.createImage();
        coinImg.src = 'images/coin.png';
        coinImg.onload = () => {
            imageLoadCount++;
            loadedImages['coin'] = coinImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };
        coinImg.onerror = (err) => {
            console.error('载入金币图片失败:', err);
            imageLoadCount++;
            loadedImages['coin'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        // 载入齒輪图标（设置按鈕）
        const gearImg = wx.createImage();
        gearImg.src = 'images/gear.png';
        gearImg.onload = () => {
            imageLoadCount++;
            loadedImages['gear'] = gearImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };
        gearImg.onerror = (err) => {
            console.error('载入齒輪图片失败:', err);
            imageLoadCount++;
            loadedImages['gear'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        // 载入上方区域背景图片
        const bgTopImg = wx.createImage();
        bgTopImg.src = 'res/background.png';
        bgTopImg.onload = () => {
            imageLoadCount++;
            loadedImages['bgTop'] = bgTopImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };
        bgTopImg.onerror = (err) => {
            console.error('载入背景图片失败:', err);
            imageLoadCount++;
            loadedImages['bgTop'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        // 载入卡牌底座（slot）
        const slotBaseImg = wx.createImage();
        slotBaseImg.src = 'images/slot.png';
        slotBaseImg.onload = () => {
            imageLoadCount++;
            loadedImages['slotBase'] = slotBaseImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };
        slotBaseImg.onerror = (err) => {
            console.error('载入卡牌底座失败:', err);
            imageLoadCount++;
            loadedImages['slotBase'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        // 载入卡牌图片（物品）
        const ALL_CARD_KEYS = [...CARD_KEYS, ...ADV_CARD_KEYS];
        for (let key of ALL_CARD_KEYS) {
            const img = wx.createImage();
            img.src = `images/${CARD_IMAGES[key]}`;
            img.onload = () => {
                imageLoadCount++;
                loadedImages[key] = img;
                if (imageLoadCount === imageLoadTotal) {
                    console.log(`所有卡牌图片载入完成，共 ${imageLoadTotal} 張`);
                    resolve();
                }
            };
            img.onerror = (err) => {
                console.error(`载入图片失败: images/${CARD_IMAGES[key]}`, err);
                imageLoadCount++;
                loadedImages[key] = null;
                if (imageLoadCount === imageLoadTotal) {
                    resolve();
                }
            };
        }
        // 载入动作动画图片（1~6.png）
        for (let f = 1; f <= 6; f++) {
            const actionImg = wx.createImage();
            actionImg.src = `res/action/${f}.png`;
            actionImg.onload = () => {
                imageLoadCount++;
                loadedImages[`action${f}`] = actionImg;
                if (imageLoadCount === imageLoadTotal) resolve();
            };
            actionImg.onerror = (err) => {
                console.error(`载入动作图片 ${f} 失败:`, err);
                imageLoadCount++;
                loadedImages[`action${f}`] = null;
                if (imageLoadCount === imageLoadTotal) resolve();
            };
        }
        // 载入丢回动作图片（t1~t3.png，270x600）
        for (let f = 1; f <= 3; f++) {
            const throwActionImg = wx.createImage();
            throwActionImg.src = `res/action/t${f}.png`;
            throwActionImg.onload = () => {
                imageLoadCount++;
                loadedImages[`throwAction${f}`] = throwActionImg;
                if (imageLoadCount === imageLoadTotal) resolve();
            };
            throwActionImg.onerror = (err) => {
                console.error(`载入丢回动作图片 t${f} 失败:`, err);
                imageLoadCount++;
                loadedImages[`throwAction${f}`] = null;
                if (imageLoadCount === imageLoadTotal) resolve();
            };
        }
        // 载入跳舞动画图片
        for (let f = 1; f <= 5; f++) {
            const danceImg = wx.createImage();
            danceImg.src = `res/action/dance${f}.png`;
            danceImg.onload = () => {
                imageLoadCount++;
                loadedImages[`dance${f}`] = danceImg;
                if (imageLoadCount === imageLoadTotal) resolve();
            };
            danceImg.onerror = (err) => {
                console.error(`载入跳舞动画图片 dance${f} 失败:`, err);
                imageLoadCount++;
                loadedImages[`dance${f}`] = null;
                if (imageLoadCount === imageLoadTotal) resolve();
            };
        }
        // 载入卡槽栈板图片
        const palletImg = wx.createImage();
        palletImg.src = 'res/images/pallet.png';

        palletImg.onload = () => {
            imageLoadCount++;
            loadedImages['pallet'] = palletImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        palletImg.onerror = (err) => {
            console.error('载入栈板图片失败:', err);
            imageLoadCount++;
            loadedImages['pallet'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        // 载入失败画面图片
        const failImg = wx.createImage();
        failImg.src = 'res/images/fail.png';
        failImg.onload = () => {
            imageLoadCount++;
            loadedImages['fail'] = failImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };
        failImg.onerror = (err) => {
            console.error('载入失败图片失败:', err);
            imageLoadCount++;
            loadedImages['fail'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        // 载入通关图片
        const winImg = wx.createImage();
        winImg.src = 'res/images/win.png';
        winImg.onload = () => {
            imageLoadCount++;
            loadedImages['win'] = winImg;
            if (imageLoadCount === imageLoadTotal) resolve();
        };
        winImg.onerror = (err) => {
            console.error('载入通关图片失败:', err);
            imageLoadCount++;
            loadedImages['win'] = null;
            if (imageLoadCount === imageLoadTotal) resolve();
        };

        // 载入商店相关图片
        const loadSimpleImg = (key, path) => {
            const img = wx.createImage();
            img.src = path;
            img.onload = () => { imageLoadCount++; loadedImages[key] = img; if (imageLoadCount === imageLoadTotal) resolve(); };
            img.onerror = (err) => { console.error(`载入 ${key} 失败:`, err); imageLoadCount++; loadedImages[key] = null; if (imageLoadCount === imageLoadTotal) resolve(); };
        };
        loadSimpleImg('shop', 'images/shop.png');
        loadSimpleImg('shelf', 'res/images/shelf.png');
        loadSimpleImg('washIcon', 'images/wash.png');
        loadSimpleImg('throwIcon', 'images/throw.png');
        loadSimpleImg('switchIcon', 'images/switch.png');
        loadSimpleImg('slotBase1', 'images/slot1.png');
        loadSimpleImg('bombIcon', 'images/bomb.png');
        loadSimpleImg('explode', 'res/images/explode.png');
        loadSimpleImg('shakeIcon', 'images/shake.png');
        loadSimpleImg('danceIcon', 'images/dance.png');
    });
}

// ==================== 基础网格生成 ====================
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

// ==================== 重叠检测 ====================
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

// ==================== 关卡生成 ====================
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

// ==================== 辅助函数 ====================
function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function generateIconPool(totalCards, numTypes) {
    // 选取可用卡牌：優先 basic，不足时补 adv
    let available = [...CARD_KEYS];
    if (numTypes > CARD_KEYS.length) {
        available = available.concat(ADV_CARD_KEYS.slice(0, numTypes - CARD_KEYS.length));
    }
    available = available.slice(0, numTypes);

    if (totalCards % 3 !== 0) totalCards = Math.ceil(totalCards / 3) * 3;
    let pool = [];
    let idx = 0;
    while (pool.length < totalCards) {
        let icon = available[idx % available.length];
        for (let i = 0; i < 3 && pool.length < totalCards; i++) pool.push(icon);
        idx++;
    }
    return shuffleArray(pool);
}

// ==================== 游戏逻辑 ====================
function isRectOverlap(card1, card2) {
    const h = CARD_SIZE / 2;
    const l1 = card1.x - h, r1 = card1.x + h, t1 = card1.y - h, b1 = card1.y + h;
    const l2 = card2.x - h, r2 = card2.x + h, t2 = card2.y - h, b2 = card2.y + h;
    // 使用小容差避免浮点数边缘接触误判
    const EPS = 0.01;
    return r1 > l2 + EPS && l1 < r2 - EPS && b1 > t2 + EPS && t1 < b2 - EPS;
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

// 当卡牌消除时增加分数（只增加当前关卡分数）
function addScore(amount) {
    currentRoundScore += amount;
}

// 獲取当前显示的总分（当前关卡分数 + 之前关卡累積的总分）
function getDisplayScore() {
    return totalScore + currentRoundScore;
}

function buyItem(type) {
    if (!gameActive) return;
    // 检查是否已在本关购买过此道具
    if (boughtItems.includes(type)) {
        wx.showToast({ title: '本关已购买过！', icon: 'none', duration: 1000 });
        return;
    }
    const costMap = { wash: 180, throw: 50, switch: 20, bomb: 200, shake: 80, dance: 100 };
    const cost = costMap[type] || 0;
    if (cost === 0) return;
    const displayScore = getDisplayScore();
    if (displayScore < cost) {
        wx.showToast({ title: '金币不足！', icon: 'none', duration: 1000 });
        return;
    }
    if (ownedItems.length >= 5) {
        wx.showToast({ title: '道具柜已满！', icon: 'none', duration: 1000 });
        return;
    }
    // 扣金币（从 currentRoundScore 先扣，不够再扣 totalScore）
    if (currentRoundScore >= cost) {
        currentRoundScore -= cost;
    } else {
        const remaining = cost - currentRoundScore;
        currentRoundScore = 0;
        totalScore -= remaining;
    }
    ownedItems.push(type);
    boughtItems.push(type);
    // 播放购买音效
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

    // 挑选最多 5 張：沒被蓋住 + 有蓋住別的卡牌
    let candidates = active.filter(c => {
        if (!c.clickable) return false;
        // 检查是否有蓋住其他卡牌
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
        // 计算卡牌当前的网格位置
        const curCol = Math.round((card.x - BASE_MIN_X) / GRID_STEP);
        const curRow = Math.round((card.y - BASE_MIN_Y) / GRID_STEP);
        // 靠近边缘則向內移动
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
        // 移动 1 个网格步长并限制在合法範围
        const newCol = Math.max(0, Math.min(COLS - 1, curCol + dc));
        const newRow = Math.max(0, Math.min(ROWS - 1, curRow + dr));
        const clampedX = BASE_MIN_X + newCol * GRID_STEP;
        const clampedY = BASE_MIN_Y + newRow * GRID_STEP;
        card._danceAnim = {
            fromX: card.x, fromY: card.y,
            toX: clampedX, toY: clampedY,
            startTime: 0, duration: 2000
        };
        card.layer = topLayer;  // 移到最上层
    }

    danceAnimations.push({
        startTime: Date.now(),
        frame: 1,
        phase: 'dance',
        moveStartTime: 0,
        targets: candidates  // 記录受影響的卡牌
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
                // 3秒后开始移动卡牌
                a.phase = 'move';
                a.moveStartTime = now;
                // 设置卡牌动画的实際开始时间
                for (let card of a.targets) {
                    if (card._danceAnim) card._danceAnim.startTime = now;
                }
                updateAllCardsClickable();
            }
        }

        // 卡牌移动动画（仅在 move 階段更新）
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

function shakeCoveringCards(targetCard) {
    if (!gameActive) return;
    const covering = stackCards.filter(c =>
        !c.removed && !c.isAnimating && !c._shakeAnim && !c._coverShake &&
        c.layer > targetCard.layer && isRectOverlap(targetCard, c)
    );

    // Debug: 打印遮擋资訊（完整精度）
    const hh = CARD_SIZE / 2;
    console.log(`被点击: icon=${targetCard.icon} xy=(${targetCard.x},${targetCard.y}) layer=${targetCard.layer} rect=[${(targetCard.x-hh).toFixed(2)},${(targetCard.y-hh).toFixed(2)}]-[${(targetCard.x+hh).toFixed(2)},${(targetCard.y+hh).toFixed(2)}] CARD_SIZE=${CARD_SIZE}`);
    for (let c of covering) {
        console.log(`  遮擋者: icon=${c.icon} xy=(${c.x},${c.y}) layer=${c.layer} rect=[${(c.x-hh).toFixed(2)},${(c.y-hh).toFixed(2)}]-[${(c.x+hh).toFixed(2)},${(c.y+hh).toFixed(2)}]`);
    }

    if (covering.length === 0) return;
    if (sfxEnabled && dropAudio) {
        dropAudio.stop();
        dropAudio.play();
    }
    const now = Date.now();
    for (let card of covering) {
        card._coverShake = { origX: card.x, origY: card.y, startTime: now, duration: 300 };
    }
}

function updateCoverShakeAnimations() {
    const now = Date.now();
    for (let card of stackCards) {
        const cs = card._coverShake;
        if (!cs) continue;
        const p = Math.min((now - cs.startTime) / cs.duration, 1);
        const amp = (1 - p) * CARD_SIZE * 0.08 * Math.sin(p * Math.PI * 6);
        card.x = cs.origX + amp;
        card.y = cs.origY + amp * 0.7;
        if (p >= 1) { card.x = cs.origX; card.y = cs.origY; delete card._coverShake; }
    }
}

function useShake() {
    if (!gameActive) return;
    let active = stackCards.filter(c => !c.removed && (!c.isAnimating || c.willRemove));
    if (active.length === 0) return;

    // 按位置分组（对齊到 GRID_STEP 网格）
    const gridStep = GRID_STEP;
    const posMap = {};
    for (let c of active) {
        const gx = Math.round(c.x / gridStep) * gridStep;
        const gy = Math.round(c.y / gridStep) * gridStep;
        const key = `${gx},${gy}`;
        if (!posMap[key]) posMap[key] = { x: gx, y: gy, cards: [] };
        posMap[key].cards.push(c);
    }

    // 找出中心点 + 上下左右共 5 个位置合计卡牌最多的
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

    // 收集中心 + 上下左右五个位置的所有卡牌
    let affectedCards = [];
    for (let [dx, dy] of neighborOffsets) {
        const key = `${bestCenter.x + dx * gridStep},${bestCenter.y + dy * gridStep}`;
        if (posMap[key]) affectedCards.push(...posMap[key].cards);
    }
    if (affectedCards.length === 0) return;

    // 將受影響的卡牌移至所有卡牌最上层
    const maxLayer = stackCards.reduce((mx, c) => Math.max(mx, c.layer), 0);
    for (let i = 0; i < affectedCards.length; i++) {
        affectedCards[i].layer = maxLayer + 1 + i;
    }

    // 立即更新可点击状态

    // 播放山崩音效
    if (sfxEnabled && dropsAudio) {
        dropsAudio.stop();
        dropsAudio.play();
    }

    // 对受影響区域每張卡牌隨机外移 1～2 格（动画 3 秒）
    const dirs = [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]];
    const now = Date.now();
    for (let card of affectedCards) {
        const dir = dirs[Math.floor(Math.random() * dirs.length)];
        const steps = Math.random() < 0.5 ? 1 : 2;
        const curCol = Math.round((card.x - BASE_MIN_X) / GRID_STEP);
        const curRow = Math.round((card.y - BASE_MIN_Y) / GRID_STEP);
        const newCol = Math.max(0, Math.min(COLS - 1, curCol + dir[0] * steps));
        const newRow = Math.max(0, Math.min(ROWS - 1, curRow + dir[1] * steps));
        const clampedX = BASE_MIN_X + newCol * GRID_STEP;
        const clampedY = BASE_MIN_Y + newRow * GRID_STEP;
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
    let anyFinished = false;
    for (let card of stackCards) {
        const a = card._shakeAnim;
        if (!a) continue;
        const progress = Math.min((now - a.startTime) / a.duration, 1);
        const ease = easeOutCubic(progress);
        card.x = a.fromX + (a.toX - a.fromX) * ease;
        card.y = a.fromY + (a.toY - a.fromY) * ease;
        // 抖动效果：小幅正弦震动（初期強烈，逐渐衰減）
        const shakeAmp = (1 - progress) * CARD_SIZE * 0.25;
        card.x += Math.sin(now * 0.03 + card.y * 0.01) * shakeAmp;
        card.y += Math.cos(now * 0.035 + card.x * 0.01) * shakeAmp;
        if (progress >= 1) {
            card.x = a.toX; card.y = a.toY;
            delete card._shakeAnim;
            anyFinished = true;
        }
    }
    if (anyFinished) updateAllCardsClickable();
}

function useBomb(shelfIndex) {
    if (!gameActive) return;
    // 从柜中移除
    if (shelfIndex < ownedItems.length && ownedItems[shelfIndex] === 'bomb') {
        ownedItems.splice(shelfIndex, 1);
    }
    let active = stackCards.filter(c => !c.removed && !c.isAnimating);
    if (active.length === 0) return;

    // 隨机选一个位置
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

    // 确保每种类型都是 3 的倍数：从其他位置移除多余的牌
    let removedIcons = nearby.map(c => c.icon);
    let allIcons = active.map(c => c.icon);

    // 检查 removed 后的剩余是否都是 3 的倍数
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

    // 标記为等待爆炸后飛走（不设 isAnimating，卡牌仍正常显示）
    for (let c of finalRemove) {
        c.willRemove = true;
    }

    // 炸弹从 shelf 位置飛到螢幕中央（变大），再落到目标位置
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
        cardStartTime: 0  // 卡牌飛走开始时间（爆炸后）
    });
    // 播放丟炸弹音效
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
            // 飛到螢幕中央并变大（逐渐变慢，模擬向上飛失去动量）
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
            // 从中央落到目标位置（逐渐变快，模擬向下掉落加速）
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
                // 爆炸开始时标記卡牌为动画中，更新可点击状态
                for (let c of a.cards) {
                    c.isAnimating = true;
                }
                updateAllCardsClickable();
                // 停止丟炸弹音效，播放爆炸音效
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

            // 卡牌飛出：爆炸开始后卡牌从原位飛向屏幕外
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
    boughtItems = [];
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
        // 找到被消除的第一張牌在槽中的位置（视覺起点）
        let matchIndex = slotCards.indexOf(target);
        let newSlot = [], removed = 0;
        for (let icon of slotCards) {
            if (icon === target && removed < 3) { removed++; continue; }
            newSlot.push(icon);
        }
        slotCards = newSlot;
        addScore(10);

        // 生成搬運动画
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
        // 保留 currentRoundScore 給通关三选一使用
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
            clearProgress();
            return true;
        }
    }
    return false;
}

// ==================== 动画系统 ====================
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

    // 立即更新可点击状态：让被蓋住的牌立刻变为可取
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

    // 洗牌音效淡出：进度超过 70% 时开始降低音量
    if (washAudio && maxProgress >= 0.7 && maxProgress < 1) {
        const fadeProgress = (maxProgress - 0.7) / 0.3;
        washAudio.volume = Math.max(0, 0.5 * (1 - fadeProgress));
    }

    // 完成动画的卡片：更新 icon 并清除动画标記
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

    // 所有动画完成时停止洗牌音效
    if (shuffleAnimations.length === 0 && washAudio) {
        washAudio.stop();
    }
}

function spawnActionAnimation(slotIndex) {
    const pos = getSlotCardPosition(slotIndex);
    // 图片比例 330:600，底部对齊卡槽背景底部，高度比卡槽高
    const h = SLOT_BG_HEIGHT * 1.4 * 1.5;  // 再增大一半
    const w = h * (330 / 600);
    const bottomY = SLOT_BG_Y + SLOT_BG_HEIGHT + 50;
    actionAnimations.push({
        x: pos.x,
        y: bottomY - h,
        startX: pos.x,
        w: w, h: h,
        size: Math.max(w, h), // 保留舊栏位兼容
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

        // 站立階段：x 不动；跑步階段才开始右移
        if (a.phase === 'lift') {
            a.x = a.startX;  // 站在原地
        } else {
            // 从开始跑步的位置线性移到螢幕外
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

        // 幀更新：t1→t2→t3，到 t3 后停留
        a.frameTimer += 16;
        if (a.frameTimer >= a.frameInterval && a.frame < 3) {
            a.frameTimer = 0;
            a.prevFrame = a.frame;
            a.frame++;
        }

        // 当进入第2幀时触发丢回卡牌动画
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

    // 计算卡槽中目标卡牌的位置
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

// keepTotalScore: 是否保留总分（通关时 true，重玩关卡或切换关卡时 false 或看情况）
function spawnEntranceAnimations() {
    // 播放掉落音效
    if (sfxEnabled && dropsAudio) {
        dropsAudio.stop();
        dropsAudio.play();
    }
    const now = Date.now();
    const centerX = screenWidth / 2;
    const centerY = -CARD_SIZE * 2;
    for (let i = 0; i < stackCards.length; i++) {
        const card = stackCards[i];
        card.isAnimating = true;
        entranceAnimations.push({
            card,
            fromX: centerX + (Math.random() - 0.5) * screenWidth * 0.5,
            fromY: centerY + (Math.random() - 0.5) * CARD_SIZE * 3,
            toX: card.x, toY: card.y,
            fromScale: 5, toScale: 1,
            fromAlpha: 0, toAlpha: 1,
            startTime: now + i * 30,  // 依序延遲
            duration: 700,
            phase: 'entrance'
        });
    }
}

function updateEntranceAnimations() {
    if (entranceAnimations.length === 0) return;
    const now = Date.now();
    const completed = [];

    for (let i = 0; i < entranceAnimations.length; i++) {
        const a = entranceAnimations[i];
        const elapsed = now - a.startTime;
        if (elapsed < 0) continue;
        const progress = Math.min(elapsed / a.duration, 1);
        const ease = easeOutBack(progress);

        a.card.x = a.fromX + (a.toX - a.fromX) * ease;
        a.card.y = a.fromY + (a.toY - a.fromY) * ease;
        a.card._entranceScale = a.fromScale + (a.toScale - a.fromScale) * ease;
        a.card._entranceAlpha = a.fromAlpha + (a.toAlpha - a.fromAlpha) * ease;

        if (progress >= 1 && a.phase === 'entrance') {
            a.card.x = a.toX;
            a.card.y = a.toY;
            a.card._entranceScale = 1;
            a.card._entranceAlpha = 1;
            a.phase = 'landing';
            a.landTime = now;
        }

        if (a.phase === 'landing') {
            const landElapsed = now - a.landTime;
            if (landElapsed > 400) {
                delete a.card.isAnimating;
                delete a.card._entranceScale;
                delete a.card._entranceAlpha;
                completed.push(i);
            }
        }
    }

    for (let idx of completed.reverse()) {
        entranceAnimations.splice(idx, 1);
    }
    if (completed.length > 0) {
        updateAllCardsClickable();
    }
    // 全部掉落完畢后停止音效并強制清理
    if (entranceAnimations.length === 0) {
        for (let card of stackCards) {
            if (card.isAnimating && card._entranceScale !== undefined) {
                delete card.isAnimating;
                delete card._entranceScale;
                delete card._entranceAlpha;
            }
        }
        updateAllCardsClickable();
        if (dropsAudio) dropsAudio.stop();
    }
}

function updateLandingEffects() {
    if (landingEffects.length === 0) return;
    const now = Date.now();
    for (let i = landingEffects.length - 1; i >= 0; i--) {
        if (now - landingEffects[i].startTime >= landingEffects[i].duration) {
            landingEffects.splice(i, 1);
        }
    }
}
function loadLevel(level, keepTotalScore = false) {
    currentLevel = level;

    if (!keepTotalScore) {
        // 切换关卡或重玩时，如果不保留当前关卡分数，則只重置 currentRoundScore
        // totalScore 保持不变（从之前关卡累積来的）
        // 注意：这意味著如果玩家手动切换关卡，之前关卡的总分仍保留
        // 如果想要手动切换关卡时重置总分，可以將 totalScore 设为 0
        currentRoundScore = 0;
    }
    // 如果 keepTotalScore === true，表示通关后进入下一关，此时 totalScore 已經累加，currentRoundScore 已归零

    forbiddenPositions = generateForbiddenPositions(level);

    nextCardId = 1;
    let levelData = generateLevel(level);
    let positions = levelData.cards;
    let cfg = getLevelConfig(level);
    let iconPool = generateIconPool(positions.length, cfg.numCardTypes);
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
    gameOverBtn2Rects = [];
    activeAnimations = [];
    throwBackAnimations = [];
    shuffleAnimations = [];
    actionAnimations = [];
    throwActionAnimations = [];
    danceAnimations = [];
    bombAnimations = [];
    entranceAnimations = [];
    landingEffects = [];
    resetToolCounts();

    // 生成进場动画：卡牌从视角高空落下
    if (startScreenPhase === 'playing') spawnEntranceAnimations();

    settingsVisible = false;
}

function goToHome() {
    if (bgmAudio) bgmAudio.stop();
    totalScore = 0;
    currentRoundScore = 0;
    settingsVisible = false;
    gameActive = false;
    startScreenPhase = 'ready';
}

function resetGame() {
    // 重置游戏：回到第一关，重置总分
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

    // 消耗一个洗牌道具
    ownedItems.splice(washIdx, 1);

    // 洗牌 icon 列表
    let icons = active.map(c => c.icon);
    let shuffled = shuffleArray([...icons]);

    // 为每張牌生成动画：从原位 → 亂飛 → 回原位（但 icon 已换）
    const totalDuration = 3000;
    const now = Date.now();
    const topAreaH = screenHeight * TOP_AREA_RATIO;

    for (let i = 0; i < active.length; i++) {
        const card = active[i];
        card.isAnimating = true;

        const baseX = card.x - CARD_SIZE / 2;
        const baseY = card.y - CARD_SIZE / 2;

        // 隨机中繼点（在螢幕範围內亂飛）
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
        wx.showToast({ title: '沒有丢回道具', icon: 'none', duration: 1000 });
        return;
    }

    if (slotCards.length === 0) {
        wx.showToast({ title: '卡槽沒有卡片', icon: 'none', duration: 1000 });
        return;
    }

    // 消耗一个丢回道具
    ownedItems.splice(throwIdx, 1);

    const slotIndex = 0;  // 丢回第一个位置的卡牌
    const fromPosition = getSlotCardPosition(slotIndex);
    const icon = slotCards.shift();
    const activeCards = stackCards.filter(c => !c.removed && !c.isAnimating);
    const positionPool = activeCards.length > 0 ? activeCards : BASE_POSITIONS;
    const target = positionPool[Math.floor(Math.random() * positionPool.length)];
    const topLayer = stackCards.reduce((maxLayer, c) => Math.max(maxLayer, c.layer), 0) + 1;
    const targetX = target.x - CARD_SIZE / 2;
    const targetY = target.y - CARD_SIZE / 2;

    // 播放丢回音效
    if (sfxEnabled && throwAudio) {
        throwAudio.stop();
        throwAudio.play();
    }

    // 播放丢回动作动画（动画到第2幀时才触发卡牌飛出）
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
        // 手动切换关卡时，重置总分和当前分数（可选，根据需求）
        // 如果想要保留总分，可以注释掉 totalScore = 0
        totalScore = 0;
        currentRoundScore = 0;
        loadLevel(level, false);
    }
    settingsVisible = false;
}

// ==================== 绘制 ====================
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

    // 绘制底座（slot.png，150x150）
    if (slotBase && slotBase.complete) {
        ctx.drawImage(slotBase, drawX, drawY, size, size);
    }

    // 在底座上绘制物品
    if (img && img.complete) {
        ctx.drawImage(img, drawX, drawY, size, size);
    } else {
        // fallback：绘制文字标签
        ctx.font = `bold ${Math.max(12, CARD_SIZE * 0.3 * scale)}px "Segoe UI"`;
        ctx.fillStyle = '#5a2f0a';
        ctx.textAlign = 'center';
        ctx.fillText(card.icon, drawX + size / 2, drawY + size / 2 + 6);
        ctx.textAlign = 'left';
    }

    ctx.shadowBlur = 0;

    // 如果卡牌不可点击，添加半透明遮罩
    if (!card.clickable && !card.removed && !isAnimating) {
        ctx.fillStyle = 'rgba(60, 45, 30, 0.5)';
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
function drawSettingsPanel() {
    if (!settingsVisible) return;

    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    const panelWidth = Math.min(280, screenWidth * 0.8);
    const panelHeight = Math.min(340, screenHeight * 0.64);
    const panelX = (screenWidth - panelWidth) / 2;
    const panelY = (screenHeight - panelHeight) / 2;

    ctx.fillStyle = colors.settingsPanel;
    roundRect(ctx, panelX, panelY, panelWidth, panelHeight, 20);
    ctx.fill();

    // 标題
    const panelTitleSize = Math.min(22, Math.round(panelWidth * 0.08));
    ctx.fillStyle = '#5a3c1a';
    ctx.font = `bold ${panelTitleSize}px "KaiTi"`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('设置', panelX + panelWidth / 2, panelY + panelHeight * 0.09);

    ctx.strokeStyle = '#d4c4a0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(panelX + 20, panelY + panelHeight * 0.16);
    ctx.lineTo(panelX + panelWidth - 20, panelY + panelHeight * 0.16);
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    const itemFontSize = Math.min(16, Math.round(panelWidth * 0.055));
    const toggleW = panelWidth * 0.2;
    const toggleH = panelHeight * 0.10;
    const toggleX = panelX + panelWidth * 0.72;
    const labelX = panelX + panelWidth * 0.1;

    // 背景音乐
    const bgmRowY = panelY + panelHeight * 0.22;
    ctx.fillStyle = bgmEnabled ? '#2f6b2f' : '#aa5440';
    roundRect(ctx, toggleX, bgmRowY, toggleW, toggleH, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(bgmEnabled ? 'ON' : 'OFF', toggleX + toggleW / 2, bgmRowY + toggleH / 2);
    ctx.fillStyle = '#4a2e0a';
    ctx.font = `${itemFontSize}px "Segoe UI"`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('背景音乐', labelX, bgmRowY + toggleH / 2);

    // 切换BGM
    const switchRowY = panelY + panelHeight * 0.36;
    ctx.fillStyle = '#c28a4e';
    roundRect(ctx, toggleX, switchRowY, toggleW, toggleH, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(`${currentBgmIndex}`, toggleX + toggleW / 2, switchRowY + toggleH / 2);
    ctx.fillStyle = '#4a2e0a';
    ctx.font = `${itemFontSize}px "Segoe UI"`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('切换BGM', labelX, switchRowY + toggleH / 2);

    // 点击音效
    const sfxRowY = panelY + panelHeight * 0.50;
    ctx.fillStyle = sfxEnabled ? '#2f6b2f' : '#aa5440';
    roundRect(ctx, toggleX, sfxRowY, toggleW, toggleH, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(14, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(sfxEnabled ? 'ON' : 'OFF', toggleX + toggleW / 2, sfxRowY + toggleH / 2);
    ctx.fillStyle = '#4a2e0a';
    ctx.font = `${itemFontSize}px "Segoe UI"`;
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillText('点击音效', labelX, sfxRowY + toggleH / 2);

    // 放弃并退出（仅游戏中显示）
    if (startScreenPhase === 'playing') {
    const homeBtnX = panelX + panelWidth * 0.1;
    const homeBtnW = panelWidth * 0.82;
    const homeBtnH = panelHeight * 0.10;
    const homeBtnY = panelY + panelHeight * 0.68;
    settingsHomeBtnRect = { x: homeBtnX, y: homeBtnY, w: homeBtnW, h: homeBtnH };
    ctx.fillStyle = '#6b8a6b';
    roundRect(ctx, homeBtnX, homeBtnY, homeBtnW, homeBtnH, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.min(15, Math.round(panelWidth * 0.05))}px "Segoe UI"`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('放弃并退出', homeBtnX + homeBtnW / 2, homeBtnY + homeBtnH / 2);
    }

    // 关闭按鈕
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

function renderUI() {
    ctx.clearRect(0, 0, screenWidth, screenHeight);

    // 背景
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // === 定义百分比区域变数 ===
    const TOP_AREA_HEIGHT = screenHeight * TOP_AREA_RATIO;
    const MIDDLE_AREA_HEIGHT = screenHeight * MIDDLE_AREA_RATIO;
    const BOTTOM_AREA_HEIGHT = screenHeight * BOTTOM_AREA_RATIO;
    const MIDDLE_AREA_START = TOP_AREA_HEIGHT;
    const BOTTOM_AREA_START = TOP_AREA_HEIGHT + MIDDLE_AREA_HEIGHT;

    // === 上方区域背景（与中间区域同色） ===
    ctx.fillStyle = 'rgba(220, 250, 230, 0.6)';
    ctx.fillRect(0, 0, screenWidth, TOP_AREA_HEIGHT);

    // === 绘制上方区域背景图片（底部 30% 渐层透明） ===
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

        // 底部 30% 渐层遮罩：从透明渐变到背景色
        const grad = ctx.createLinearGradient(0, areaH * 0.7, 0, areaH);
        grad.addColorStop(0, 'rgba(220, 250, 230, 0)');
        grad.addColorStop(0.5, 'rgba(220, 250, 230, 0.5)');
        grad.addColorStop(1, 'rgba(220, 250, 230, 0.95)');
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, areaW, areaH);
        ctx.restore();
    }

    // === 中间区域背景（淺綠色，与上方一致） ===
    ctx.fillStyle = 'rgba(220, 250, 230, 0.6)';
    ctx.fillRect(0, MIDDLE_AREA_START, screenWidth, MIDDLE_AREA_HEIGHT);

    // 绘制卡牌（按层级排序，低层级先绘制）
    let sorted = [...stackCards].sort((a, b) => a.layer - b.layer);
    for (let c of sorted) {
        if (c.removed) continue;
        if (c.isAnimating) continue;
        let x = c.x - CARD_SIZE / 2;
        let y = c.y - CARD_SIZE / 2;
        drawCard(ctx, c, x, y, 1, 1, false, 0);
    }

    // 绘制跳舞抖动中的卡牌（有 _danceAnim 的卡牌在动画中）
    for (let c of stackCards) {
        if (c.removed || !c._danceAnim) continue;
        let x = c.x - CARD_SIZE / 2;
        let y = c.y - CARD_SIZE / 2;
        drawCard(ctx, c, x, y, 1, 1, false, 0);
    }

    // 绘制进場动画中的卡牌（缩放 + 透明度）
    for (let c of stackCards) {
        if (c.removed || c._entranceScale === undefined) continue;
        const es = c._entranceScale || 1;
        const ea = c._entranceAlpha !== undefined ? c._entranceAlpha : 1;
        let x = c.x - (CARD_SIZE * es) / 2;
        let y = c.y - (CARD_SIZE * es) / 2;
        drawCard(ctx, c, x, y, es, ea, false, 0);
    }

    // 绘制炸弹飛走的卡牌
    for (let c of stackCards) {
        if (c.removed || !c.willRemove || !c._flyX) continue;
        const tempCard = { icon: c.icon, clickable: false };
        drawCard(ctx, tempCard, c._flyX, c._flyY, 1, c._flyAlpha || 1, true, (Math.random() - 0.5) * 0.3);
    }

    // === 绘制卡槽栈板（每个槽位一个 pallet） ===
    const palletImg = loadedImages['pallet'];
    const palletW = CARD_SIZE + 16;
    const palletH = palletW * 185 / 300;
    const SLOT_COUNT = 6;

    for (let i = 0; i < SLOT_COUNT; i++) {
        const slotPos = getSlotCardPosition(i);
        const px = slotPos.x + (CARD_SIZE - palletW) / 2;
        // 卡片高出栈板約一半高度
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

    // 绘制6个槽位卡片
    for (let i = 0; i < 6; i++) {
        const cardSlotPosition = getSlotCardPosition(i);
        const cardSlotX = cardSlotPosition.x;
        const cardSlotY = cardSlotPosition.y;

        if (i < slotCards.length) {
            const iconKey = slotCards[i];
            const img = loadedImages[iconKey];
            const slotBase = loadedImages[baseVariant === 0 ? 'slotBase' : 'slotBase1'];

            // 绘制底座
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

            // 绘制物品图标
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

    // === 绘制三消搬運动画（卡槽前方） ===
    for (let a of actionAnimations) {
        const img = loadedImages[`action${a.frame}`];
        if (img && img.complete) {
            ctx.drawImage(img, a.x, a.y, a.w, a.h);
        }
    }

    // 绘制动画中的卡片
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

    // === 绘制丢回动作动画（卡牌上方） ===
    for (let a of throwActionAnimations) {
        const img = loadedImages[`throwAction${a.frame}`];
        if (img && img.complete) {
            ctx.drawImage(img, a.x, a.y, a.w, a.h);
        }
    }

    // === 绘制炸弹动画 ===
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

    // === 绘制跳舞动画（全螢幕半透明） ===
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

    // 绘制洗牌动画中的卡片
    for (let anim of shuffleAnimations) {
        const card = anim.card;
        // 动画期间暂时用新 icon 绘制
        const tempCard = { icon: anim.newIcon, clickable: card.clickable };
        drawCard(ctx, tempCard, anim.currentX, anim.currentY, 1, 1, true, anim.rotation || 0);
    }

    // === 绘制底部道具商店 ===
    const shopImg = loadedImages['shop'];
    const shelfImg = loadedImages['shelf'];
    const washIconImg = loadedImages['washIcon'];
    const throwIconImg = loadedImages['throwIcon'];
    const shopSize = Math.round(Math.min(BOTTOM_AREA_HEIGHT * 0.7, 60));
    const bottomCenterY = BOTTOM_AREA_START + BOTTOM_AREA_HEIGHT / 2;
    const shopX = Math.round(screenWidth * 0.02 + 8);
    const shopY = Math.round(bottomCenterY - shopSize / 2);

    // 商店图
    if (shopImg && shopImg.complete) {
        ctx.drawImage(shopImg, shopX, shopY, shopSize, shopSize);
    }

    // Shelf 道具柜（商店右側，填满剩余空间）
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

    // 绘制 shelf 內的道具图标
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
            // 保持 1:1 比例，取最小边长置中绘制
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

        // 标題
        ctx.textAlign = 'center';
        ctx.fillStyle = '#5a3c1a';
        ctx.font = `bold ${Math.round(cellH * 0.28)}px "KaiTi"`;
        ctx.fillText('道具商店', panelX + panelW / 2, panelY + headerH * 0.55);

        // 关闭按鈕
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

        // 商品定义（目前只有 2 种，预留 9 格）
        const shopItems = [
            { name: 'wash', icon: 'washIcon', label: '洗牌', cost: 180 },
            { name: 'throw', icon: 'throwIcon', label: '丢回', cost: 50 },
            { name: 'switch', icon: 'switchIcon', label: '换座', cost: 20 },
            { name: 'bomb', icon: 'bombIcon', label: '炸弹', cost: 200 },
            { name: 'shake', icon: 'shakeIcon', label: '山崩', cost: 80 },
            { name: 'dance', icon: 'danceIcon', label: '跳舞', cost: 100 },
        ];
        shopItemRects = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const idx = r * cols + c;
                const cx = panelX + padding + c * (cellW + gap);
                const cy = panelY + headerH + padding + r * (cellH + gap);
                const item = idx < shopItems.length ? shopItems[idx] : null;

                if (item) {
                    const isOwned = boughtItems.includes(item.name);
                    if (!isOwned) {
                        shopItemRects.push({ x: cx, y: cy, w: cellW, h: cellH, name: item.name, cost: item.cost });
                    }

                    // 格子背景（已购买变灰）
                    ctx.fillStyle = isOwned ? '#e0d8cc' : '#fff8ed';
                    roundRect(ctx, cx, cy, cellW, cellH, 10);
                    ctx.fill();
                    ctx.strokeStyle = isOwned ? '#c0b8a8' : '#d4c4a0';
                    ctx.lineWidth = 1;
                    roundRect(ctx, cx, cy, cellW, cellH, 10);
                    ctx.stroke();

                    // 道具图标（已购买降低透明度）
                    const iconImg = loadedImages[item.icon];
                    const iconS = Math.round(cellW * 0.5);
                    const iconX = cx + (cellW - iconS) / 2;
                    const iconY = cy + Math.round(cellH * 0.06);
                    if (isOwned) ctx.globalAlpha = 0.35;
                    if (iconImg && iconImg.complete) {
                        ctx.drawImage(iconImg, iconX, iconY, iconS, iconS);
                    }
                    if (isOwned) ctx.globalAlpha = 1;

                    // 名稱
                    ctx.textAlign = 'center';
                    ctx.font = `bold ${Math.round(cellH * 0.14)}px "Segoe UI"`;
                    ctx.fillStyle = isOwned ? '#b0a898' : '#4a2e0a';
                    ctx.fillText(item.label, cx + cellW / 2, cy + cellH * 0.68);

                    // 价格（已购买显示已擁有）
                    ctx.font = `${Math.round(cellH * 0.13)}px "Segoe UI"`;
                    ctx.fillStyle = isOwned ? '#b0a898' : '#b16224';
                    ctx.fillText(isOwned ? '已持有' : `💰 ${item.cost}`, cx + cellW / 2, cy + cellH * 0.88);
                    ctx.textAlign = 'left';
                }
            }
        }
    }

    // === 绘制右上角得分面板 ===
    const coinImg = loadedImages['coin'];
    const displayScore = getDisplayScore();

    // 绘制背景框
    ctx.fillStyle = colors.scoreBg;
    roundRect(ctx, SCORE_BG_X, SCORE_BG_Y, SCORE_BG_WIDTH, SCORE_BG_HEIGHT, 25);
    ctx.fill();

    // 绘制金币图片
    if (coinImg && coinImg.complete) {
        ctx.drawImage(coinImg, COIN_X, COIN_Y, COIN_WIDTH, COIN_HEIGHT);
    } else {
        ctx.font = `${SCORE_FONT_SIZE}px "Segoe UI"`;
        ctx.fillStyle = '#ffeaac';
        ctx.fillText('💰', COIN_X, COIN_Y + COIN_HEIGHT * 0.7);
    }

    // 绘制分数
    ctx.font = `bold ${SCORE_FONT_SIZE}px "Segoe UI"`;
    ctx.fillStyle = colors.scoreText;
    ctx.fillText(`${displayScore}`, SCORE_TEXT_X, SCORE_TEXT_Y);

    const infoFontSize = Math.max(16, Math.round(INFO_FONT_SIZE * 0.95));

    // 绘制关卡 + 剩余卡牌（合并一行，右对齊，无背景）
    let remain = stackCards.filter(c => !c.removed && !c.isAnimating).length + throwBackAnimations.length;
    {
        const infoLabel = `第 ${currentLevel} 关 (剩余${remain})`;
        ctx.font = `bold ${infoFontSize}px "Segoe UI"`;
        ctx.textAlign = 'right';
        ctx.fillStyle = colors.subtitleText;
        ctx.fillText(infoLabel, REMAIN_TEXT_X, REMAIN_TEXT_Y);
        ctx.textAlign = 'left';
    }

    // 设置按鈕
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

    // 绘制标題图片
    const titleImg = loadedImages['title'];
    if (titleImg && titleImg.complete) {
        ctx.drawImage(titleImg, TITLE_X, TITLE_Y, TITLE_WIDTH, TITLE_HEIGHT);
    } else {
        const titleFontSize = Math.round(28 * (Math.min(screenWidth / 375, screenHeight / 667)));
        ctx.font = `bold ${titleFontSize}px "KaiTi", "華文楷書"`;
        ctx.fillStyle = '#5a3c1a';
        ctx.fillText('福一下哥', TITLE_X, TITLE_Y + TITLE_HEIGHT * 0.7);
    }

    // === 测试按钮 ===
    if (gameActive) {
        const tbW = 100, tbH = 30, tbGap = 8;
        const tbX1 = screenWidth / 2 - tbW - tbGap / 2;
        const tbX2 = screenWidth / 2 + tbGap / 2;
        const tbY = screenHeight - tbH - 10;
        testAddCoinRect = { x: tbX1, y: tbY, w: tbW, h: tbH };
        testSkipRect = { x: tbX2, y: tbY, w: tbW, h: tbH };
        ctx.fillStyle = 'rgba(100,100,100,0.6)';
        roundRect(ctx, tbX1, tbY, tbW, tbH, 8);
        ctx.fill();
        roundRect(ctx, tbX2, tbY, tbW, tbH, 8);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold 14px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+100', tbX1 + tbW / 2, tbY + tbH / 2);
        ctx.fillText('过关', tbX2 + tbW / 2, tbY + tbH / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }

    // === 绘制设置面板 ===
    drawSettingsPanel();

    // 游戏结束遮罩
    if (!gameActive) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, screenWidth, screenHeight);

        const centerX = screenWidth / 2;
        const centerY = screenHeight / 2;

        if (gameOverState === 'win') {
            // === 通关三选一 ===
            const winImg = loadedImages['win'];
            const imgH = Math.min(screenHeight * 0.22, 200);
            const imgW = imgH * (winImg ? winImg.width / winImg.height : 1);
            const imgX = centerX - imgW / 2;
            const imgY = centerY - imgH * 0.8;

            if (winImg && winImg.complete) {
                ctx.drawImage(winImg, imgX, imgY, imgW, imgH);
            }

            ctx.textAlign = 'center';
            const txY = imgY + imgH + 16;
            ctx.font = 'bold 22px "KaiTi", "華文楷書"';
            ctx.fillStyle = '#ffffff';
            ctx.fillText('恭喜过关！金币 +' + currentRoundScore, centerX, txY);

            const btnW = Math.min(170, screenWidth * 0.44);
            const btnH = Math.min(40, screenHeight * 0.055);
            const btnGap = 8;
            const btnStartY = txY + 16;

            // 按鈕1：保存并暂离
            gameOverBtn2Rects = [];
            const b1y = btnStartY;
            gameOverBtn2Rects.push({ x: centerX - btnW / 2, y: b1y, w: btnW, h: btnH, action: 'save' });
            ctx.fillStyle = '#6b8a6b';
            roundRect(ctx, gameOverBtn2Rects[0].x, b1y, btnW, btnH, 12);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.min(16, Math.round(btnH * 0.45))}px "Segoe UI"`;
            ctx.textBaseline = 'middle';
            ctx.fillText('保存并暂离', centerX, b1y + btnH / 2);

            // 按鈕2：继续挑战
            const b2y = b1y + btnH + btnGap;
            gameOverBtn2Rects.push({ x: centerX - btnW / 2, y: b2y, w: btnW, h: btnH, action: 'continue' });
            ctx.fillStyle = '#c28a4e';
            roundRect(ctx, gameOverBtn2Rects[gameOverBtn2Rects.length - 1].x, b2y, btnW, btnH, 12);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText('继续挑战', centerX, b2y + btnH / 2);

            // 按鈕3：帶著金币撤离
            const b3y = b2y + btnH + btnGap;
            gameOverBtn2Rects.push({ x: centerX - btnW / 2, y: b3y, w: btnW, h: btnH, action: 'withdraw' });
            ctx.fillStyle = '#aa5440';
            roundRect(ctx, gameOverBtn2Rects[gameOverBtn2Rects.length - 1].x, b3y, btnW, btnH, 12);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText('帶著金币撤离', centerX, b3y + btnH / 2);
            ctx.textBaseline = 'alphabetic';

        } else {
            // === 失败画面 ===
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
            ctx.fillText('仓库满了', centerX, imgY + imgH + 36);

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
            ctx.fillText('再来一次', centerX, btnY + btnH * 0.65);

            ctx.fillStyle = '#ffeebb';
            ctx.font = `${Math.min(18, Math.round(screenWidth * 0.045))}px "KaiTi", "華文楷書"`;
            ctx.fillText('我就不信过不了！', centerX, btnY + btnH + 30);

            // 回到首页按鈕
            const homeBtnW = Math.min(140, screenWidth * 0.35);
            const homeBtnH = Math.min(36, screenHeight * 0.05);
            const homeBtnX = centerX - homeBtnW / 2;
            const homeBtnY = btnY + btnH + 52;
            gameOverHomeBtnRect = { x: homeBtnX, y: homeBtnY, w: homeBtnW, h: homeBtnH };
            ctx.fillStyle = '#6b8a6b';
            roundRect(ctx, homeBtnX, homeBtnY, homeBtnW, homeBtnH, 10);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.min(14, Math.round(homeBtnH * 0.45))}px "Segoe UI"`;
            ctx.textBaseline = 'middle';
            ctx.fillText('回到首页', centerX, homeBtnY + homeBtnH / 2);
            ctx.textBaseline = 'alphabetic';
        }

        ctx.textAlign = 'left';
    }
}

// ==================== 触摸事件 ====================
function onTouchStart(e) {
    let t = e.touches[0];
    let x = t.clientX;
    let y = t.clientY;

    // 开始画面：点击开始按鈕
    // 开始画面：点击开始挑战 或 继续进度
    if (startScreenPhase === 'ready') {
        const isLoad = savedLevel > 1 && homeLoadBtnRect &&
            x >= homeLoadBtnRect.x && x <= homeLoadBtnRect.x + homeLoadBtnRect.w &&
            y >= homeLoadBtnRect.y && y <= homeLoadBtnRect.y + homeLoadBtnRect.h;
        const isStart = (!savedLevel || savedLevel <= 1) && startScreenBtnRect &&
            x >= startScreenBtnRect.x && x <= startScreenBtnRect.x + startScreenBtnRect.w &&
            y >= startScreenBtnRect.y && y <= startScreenBtnRect.y + startScreenBtnRect.h;
        if (isLoad) {
            // 继续进度（立即清除存档，退出即算输）
            startScreenPhase = 'playing';
            totalScore = savedTempCoin;
            currentLevel = savedLevel;
            clearProgress();
            savedLevel = 1;
            savedTempCoin = 0;
            loadLevel(currentLevel, false);
            if (bgmAudio && bgmEnabled) bgmAudio.play();
            spawnEntranceAnimations();
            return;
        } else if (isStart) {
            // 开始挑战（清除存档）
            startScreenPhase = 'playing';
            clearProgress();
            savedLevel = 1;
            savedTempCoin = 0;
            totalScore = 0;
            currentRoundScore = 0;
            currentLevel = 1;
            loadLevel(1, false);
            if (bgmAudio) {
                bgmAudio.stop();
                if (bgmEnabled) bgmAudio.play();
            }
            spawnEntranceAnimations();
            return;
        }
    }

    // 开始画面：点击设置按鈕
    if ((startScreenPhase === 'loading' || startScreenPhase === 'ready') && homeSettingsBtnRect &&
        x >= homeSettingsBtnRect.x && x <= homeSettingsBtnRect.x + homeSettingsBtnRect.w &&
        y >= homeSettingsBtnRect.y && y <= homeSettingsBtnRect.y + homeSettingsBtnRect.h) {
        settingsVisible = true;
        return;
    }

    // 设置面板內的点击（无論是否在游戏中）
    if (settingsVisible) {
        const panelWidth = Math.min(280, screenWidth * 0.8);
        const panelHeight = Math.min(340, screenHeight * 0.64);
        const panelX = (screenWidth - panelWidth) / 2;
        const panelY = (screenHeight - panelHeight) / 2;

        // 关闭按鈕
        const closeBtnSize = Math.min(30, panelWidth * 0.1);
        const closeX = panelX + panelWidth - closeBtnSize - 10;
        const closeY = panelY + 10;
        if (x >= closeX && x <= closeX + closeBtnSize &&
            y >= closeY && y <= closeY + closeBtnSize) {
            settingsVisible = false;
            return;
        }

        const toggleW = panelWidth * 0.2;
        const toggleH = panelHeight * 0.10;
        const toggleX = panelX + panelWidth * 0.72;

        // 背景音乐
        const bgmRowY = panelY + panelHeight * 0.22;
        if (x >= toggleX && x <= toggleX + toggleW && y >= bgmRowY && y <= bgmRowY + toggleH) {
            toggleBgm(); return;
        }

        // 切换BGM
        const switchRowY = panelY + panelHeight * 0.36;
        if (x >= toggleX && x <= toggleX + toggleW && y >= switchRowY && y <= switchRowY + toggleH) {
            switchBgm(); return;
        }

        // 点击音效
        const sfxRowY = panelY + panelHeight * 0.50;
        if (x >= toggleX && x <= toggleX + toggleW && y >= sfxRowY && y <= sfxRowY + toggleH) {
            toggleSfx(); return;
        }

        // 放弃并退出（仅游戏中显示）
        if (startScreenPhase === 'playing') {
        const homeBtnW = panelWidth * 0.82;
        const homeBtnH = panelHeight * 0.10;
        const homeBtnX = panelX + panelWidth * 0.1;
        const homeBtnY = panelY + panelHeight * 0.68;
        if (x >= homeBtnX && x <= homeBtnX + homeBtnW && y >= homeBtnY && y <= homeBtnY + homeBtnH) {
            clearProgress();
            savedLevel = 1;
            savedTempCoin = 0;
            goToHome(); return;
        }
        }

        return;
    }

    if (startScreenPhase !== 'playing') return;

    // 購物面板打开时，只处理面板內点击
    if (shopOpen) {
        // 关闭按鈕
        if (x >= shopCloseRect.x && x <= shopCloseRect.x + shopCloseRect.w &&
            y >= shopCloseRect.y && y <= shopCloseRect.y + shopCloseRect.h) {
            shopOpen = false;
            return;
        }
        // 商品点击
        for (let r of shopItemRects) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                buyItem(r.name);
                shopOpen = false;
                return;
            }
        }
        // 面板外点击关闭
        shopOpen = false;
        return;
    }

    // 检查商店图（点击打开購物面板）
    if (gameActive && shopWashRect &&
        x >= shopWashRect.x && x <= shopWashRect.x + shopWashRect.w &&
        y >= shopWashRect.y && y <= shopWashRect.y + shopWashRect.h) {
        shopOpen = true;
        return;
    }

    // 检查 shelf 道具柜（使用道具，使用后从柜中移除）
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
    // 检查设置按鈕（游戏中才能按）
    if (gameActive && settingsBtnRect &&
        x >= settingsBtnRect.x && x <= settingsBtnRect.x + settingsBtnRect.w &&
        y >= settingsBtnRect.y && y <= settingsBtnRect.y + settingsBtnRect.h) {
        toggleSettings();
        return;
    }

    // 游戏结束画面按鈕（三选一 / 失败再来一次）
    if (!gameActive && gameOverState === 'win' && gameOverBtn2Rects) {
        for (let r of gameOverBtn2Rects) {
            if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
                if (r.action === 'save') {
                    // 保存并暂离（存下一关，代表本关已通关）
                    const nextLevel = currentLevel + 1;
                    saveProgress(nextLevel, totalScore + currentRoundScore);
                    savedLevel = nextLevel;
                    savedTempCoin = totalScore + currentRoundScore;
                    console.log('[save] 保存: nextLevel=' + savedLevel + ' tempcoin=' + savedTempCoin);
                    goToHome();
                } else if (r.action === 'continue') {
                    // 继续挑战：累加金币到 totalScore，进入下一关
                    totalScore += currentRoundScore;
                    currentRoundScore = 0;
                    if (currentLevel < TOTAL_LEVELS) {
                        currentLevel++;
                    } else {
                        currentLevel = 1;
                        totalScore = 0;
                    }
                    resetToolCounts();
                    loadLevel(currentLevel, true);
                } else if (r.action === 'withdraw') {
                    // 帶著金币撤离：累加到 bank
                    getSavedBankCoins((bank) => {
                        const withdrawAmount = totalScore + currentRoundScore;
                        const newBank = (bank || 0) + withdrawAmount;
                        savedBankCoins = newBank;
                        saveBankCoins(newBank);
                        clearProgress();
                        goToHome();
                    });
                    return;
            }
        }
    }
}
    if (!gameActive && gameOverState === 'fail' && gameOverBtnRect &&
        x >= gameOverBtnRect.x && x <= gameOverBtnRect.x + gameOverBtnRect.w &&
        y >= gameOverBtnRect.y && y <= gameOverBtnRect.y + gameOverBtnRect.h) {
        resetGame();
        return;
    }
    // 失败页面「回到首页」
    if (!gameActive && gameOverState === 'fail' && gameOverHomeBtnRect &&
        x >= gameOverHomeBtnRect.x && x <= gameOverHomeBtnRect.x + gameOverHomeBtnRect.w &&
        y >= gameOverHomeBtnRect.y && y <= gameOverHomeBtnRect.y + gameOverHomeBtnRect.h) {
        clearProgress();
        savedLevel = 1;
        savedTempCoin = 0;
        goToHome();
        return;
    }

    // 测试按钮点击
    if (gameActive && testAddCoinRect && x >= testAddCoinRect.x && x <= testAddCoinRect.x + testAddCoinRect.w &&
        y >= testAddCoinRect.y && y <= testAddCoinRect.y + testAddCoinRect.h) {
        currentRoundScore += 100;
        return;
    }
    if (gameActive && testSkipRect && x >= testSkipRect.x && x <= testSkipRect.x + testSkipRect.w &&
        y >= testSkipRect.y && y <= testSkipRect.y + testSkipRect.h) {
        gameActive = false;
        gameOverState = 'win';
        return;
    }

    if (!gameActive || shopOpen) return;

    // 转换游戏坐标（用于点击卡牌）
    let gameX = (x - offsetX) / cardScale;
    let gameY = (y - offsetY) / cardScale;

    // 点击卡牌
    let sorted = [...stackCards].filter(c => !c.removed && !c.isAnimating).sort((a, b) => b.layer - a.layer);
    for (let card of sorted) {
        let left = card.x - CARD_SIZE / 2, right = card.x + CARD_SIZE / 2;
        let top = card.y - CARD_SIZE / 2, bottom = card.y + CARD_SIZE / 2;
        if (gameX >= left && gameX <= right && gameY >= top && gameY <= bottom) {
            if (card.clickable) {
                onCardClick(card);
            } else {
                // 被遮挡的卡牌：让遮挡它的卡牌晃动
                shakeCoveringCards(card);
            }
            break;
        }
    }
}

// ==================== 持久化存档（setUserCloudStorage + update 雙寫） ====================
function getRM() {
    try { return wx.getRankManager(); } catch (e) { return null; }
}

function _rmSet(kvList, fallback) {
    const rm = getRM();
    if (!rm) { fallback && fallback(); return; }
    try {
        rm.setUserCloudStorage({ KVDataList: kvList, success: () => {}, fail: () => { fallback && fallback(); } });
    } catch (e) { fallback && fallback(); }
}

// 上報到后台玩法 ID（让「待测试」变有效）
function _rmReport(scoreKey, score) {
    const rm = getRM();
    if (!rm) return;
    try {
        rm.update({ scoreKey, score, success: () => {}, fail: (e) => { console.warn('玩法上報失败:', scoreKey, e); } });
    } catch (e) {}
}

function _rmGet(keys, onDone) {
    const rm = getRM();
    if (!rm) { onDone({}); return; }
    try {
        rm.getCurrentUserCloudStorage({
            keyList: keys,
            success: (res) => {
                const kv = {};
                const list = res && res.KVDataList;
                if (Array.isArray(list)) for (let it of list) kv[it.key] = it.value;
                onDone(kv);
            },
            fail: () => { onDone({}); }
        });
    } catch (e) { onDone({}); }
}

// 同时寫一份本地 StorageSync 作为备份（devtools fallback）
function _localSet(kv) { try { for (let k in kv) wx.setStorageSync(k, kv[k]); } catch (e) {} }

function saveProgress(level, tempCoin) {
    const kv = [{ key: 'level', value: String(level || 1) }, { key: 'tempcoin', value: String(tempCoin || 0) }];
    _localSet({ savedLevel: level || 1, savedTempCoin: tempCoin || 0 });
    _rmSet(kv);
    _rmReport('level', level || 1);
    _rmReport('tempcoin', tempCoin || 0);
}

function clearProgress() {
    const kv = [{ key: 'level', value: '1' }, { key: 'tempcoin', value: '0' }];
    _localSet({ savedLevel: 1, savedTempCoin: 0 });
    _rmSet(kv);
    _rmReport('level', 1);
    _rmReport('tempcoin', 0);
}

function saveBankCoins(coins) {
    _localSet({ bankCoins: coins || 0 });
    _rmSet([{ key: 'coins', value: String(coins || 0) }]);
    _rmReport('coins', coins || 0);
}

function getSavedBankCoins(callback) {
    // 先取本地快取
    const local = wx.getStorageSync('bankCoins') || 0;
    callback(local);
    // 再从雲端同步最新值
    _rmGet(['coins'], (kv) => {
        const cloud = parseInt(kv.coins, 10) || 0;
        if (cloud > local) {
            savedBankCoins = cloud;
            wx.setStorageSync('bankCoins', cloud);
        }
    });
}

let savedBankCoins = 0;
let savedLevel = 0;
let savedTempCoin = 0;

function loadSavedProgress() {
    console.log('[loadSavedProgress] 开始读取存档...');
    // 先讀本地（秒开，devtools 可用）
    try {
        savedLevel = wx.getStorageSync('savedLevel') || 1;
        savedTempCoin = wx.getStorageSync('savedTempCoin') || 0;
        savedBankCoins = wx.getStorageSync('bankCoins') || 0;
        console.log('[loadSavedProgress] 本地: level=' + savedLevel + ' tempcoin=' + savedTempCoin + ' coins=' + savedBankCoins);
    } catch (e) { savedLevel = 1; savedTempCoin = 0; savedBankCoins = 0; }
    // 再从雲端同步（跨裝置）
    _rmGet(['level', 'tempcoin', 'coins'], (kv) => {
        console.log('[loadSavedProgress] 雲端: level=' + kv.level + ' tempcoin=' + kv.tempcoin + ' coins=' + kv.coins);
        const lv = parseInt(kv.level, 10) || 0;
        const tc = parseInt(kv.tempcoin, 10) || 0;
        const bc = parseInt(kv.coins, 10) || 0;
        if (lv > savedLevel) { savedLevel = lv; }
        if (tc > savedTempCoin) { savedTempCoin = tc; }
        if (bc > savedBankCoins) { savedBankCoins = bc; }
        console.log('[loadSavedProgress] 同步后: level=' + savedLevel + ' tempcoin=' + savedTempCoin + ' coins=' + savedBankCoins);
        // 同步回本地
        wx.setStorageSync('savedLevel', savedLevel);
        wx.setStorageSync('savedTempCoin', savedTempCoin);
        wx.setStorageSync('bankCoins', savedBankCoins);
    });
}

function init() {
    loadSavedProgress();

    canvas = wx.createCanvas();

    let sys = wx.getWindowInfo();
    screenWidth = sys.screenWidth;
    screenHeight = sys.screenHeight;
    canvas.width = screenWidth;
    canvas.height = screenHeight;
    ctx = canvas.getContext('2d');

    console.log(`画布尺寸: ${canvas.width} x ${canvas.height}`);

    // 计算动态尺寸
    calculateDynamicSizes();

    // 直接使用计算好的 PAD_LEFT 和 PAD_TOP
    BASE_MIN_X = PAD_LEFT + GRID_STEP / 2;
    BASE_MIN_Y = PAD_TOP + GRID_STEP / 2;

    BASE_MAX_X = BASE_MIN_X + (COLS - 1) * GRID_STEP;
    BASE_MAX_Y = BASE_MIN_Y + (ROWS - 1) * GRID_STEP;

    // 扩展边界（包含卡牌完整大小）
    MIN_X = BASE_MIN_X - CARD_SIZE / 2;
    MAX_X = BASE_MAX_X + CARD_SIZE / 2;
    MIN_Y = PAD_TOP;
    MAX_Y = PAD_TOP + (ROWS * GRID_STEP) + (CARD_SIZE * 2) + 40;

    BASE_POSITIONS = generateBaseGrid();

    cardScale = 1;
    offsetX = 0;
    offsetY = 0;

    wx.onTouchStart(onTouchStart);

    // 开始主循環（会根据 startScreenPhase 渲染对应画面）
    startGameLoop();

    // 加载分包资源后初始化音效和图片
    const loadTask = wx.loadSubpackage({
        name: 'res',
        success: () => {
            console.log('分包 res 加载成功');
            initAudio();
            loadCardImages().then(() => {
                totalScore = 0;
                currentRoundScore = 0;
                loadLevel(1, false);
                startScreenPhase = 'ready'; // 载入完畢，显示开始按鈕
                console.log('所有资源载入完成，等待开始');
            });
        },
        fail: (err) => {
            console.error('分包加载失败:', err);
            initAudio();
            loadCardImages().then(() => {
                totalScore = 0;
                currentRoundScore = 0;
                loadLevel(1, false);
                startScreenPhase = 'ready';
            });
        }
    });

    loadTask.onProgressUpdate((res) => {
        console.log(`分包下载进度: ${res.progress}%`);
    });
}

let loadingProgress = 0;

function startScreenLoop() {
    function frame() {
        // 计算加载进度
        loadingProgress = Math.max(loadingProgress, imageLoadCount / Math.max(1, imageLoadTotal));

        ctx.clearRect(0, 0, screenWidth, screenHeight);
        drawStartScreen();

        if (startScreenPhase === 'playing') return; // 停止循環
        requestAnimationFrame(frame);
    }
    frame();
}

function updateHomeCharAnimation() {
    const now = Date.now();
    if (homeCharLastTime === 0) homeCharLastTime = now - HOME_CHAR_INTERVAL;
    if (now - homeCharLastTime < HOME_CHAR_INTERVAL) return;
    homeCharLastTime = now;
    homeCharFrame++;
    if (homeCharFrame >= 11) {
        // 到 w11 后进入循環階段
        homeCharLoopCount++;
        homeCharFrame = 8; // w9
    }
    // w9,w10,w11 播 3 次后回到 w1
    if (homeCharFrame >= 8 && homeCharLoopCount >= 3) {
        homeCharFrame = 0;
        homeCharLoopCount = 0;
    }
}

function drawStartScreen() {
    // 底色（避免加载时黑屏）
    ctx.fillStyle = '#3b2a1a';
    ctx.fillRect(0, 0, screenWidth, screenHeight);

    // 背景
    const bgImg = loadedImages['startBg'];
    if (bgImg && bgImg.complete) {
        const scale = Math.max(screenWidth / 643, screenHeight / 1100);
        const dw = Math.round(643 * scale);
        const dh = Math.round(1100 * scale);
        const dx = Math.round((screenWidth - dw) / 2);
        const dy = Math.round((screenHeight - dh) / 2);
        ctx.drawImage(bgImg, dx, dy, dw, dh);
    }

    // 首页角色动画（填满屏幕宽度，垂直置中）
    updateHomeCharAnimation();
    const charKey = `w${homeCharFrame + 1}`;
    const charImg = loadedImages[charKey];
    if (charImg && charImg.complete) {
        const cw = screenWidth;
        const ch = Math.round(screenWidth * (1184 / 944));
        const cx = 0;
        const cy = Math.round((screenHeight - ch) / 2);
        ctx.drawImage(charImg, cx, cy, cw, ch);
    }

    // 标題
    const titleImg = loadedImages['title'];
    if (titleImg && titleImg.complete) {
        const tw = Math.round(screenWidth * 0.65);
        const th = Math.round(tw * (titleImg.height / titleImg.width));
        const tx = Math.round((screenWidth - tw) / 2);
        const ty = Math.round(screenHeight * 0.12);
        ctx.drawImage(titleImg, tx, ty, tw, th);
    }

    // 设置齒輪按鈕（载入中或就緒时都显示，与游戏中同位置、同图片）
    {
    const gearSize = SETTINGS_BTN_SIZE;
    const gearX = SETTINGS_BTN_X;
    const gearY = SETTINGS_BTN_Y;
    homeSettingsBtnRect = { x: gearX, y: gearY, w: gearSize, h: gearSize };
    const gearImg = loadedImages['gear'];
    if (gearImg && gearImg.complete) {
        ctx.drawImage(gearImg, gearX, gearY, gearSize, gearSize);
    } else {
        ctx.fillStyle = '#ffdd99';
        roundRect(ctx, gearX, gearY, gearSize, gearSize, 8);
        ctx.fill();
        ctx.fillStyle = '#4f2d0a';
        ctx.font = `${Math.round(gearSize * 0.6)}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚙', gearX + gearSize / 2, gearY + gearSize / 2);
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
    }
    }

    // 在首页也渲染设置面板（仅音效/音乐）
    drawSettingsPanel();

    if (startScreenPhase === 'loading') {
        // 进度條
        const barW = Math.round(screenWidth * 0.7);
        const barH = 12;
        const barX = Math.round((screenWidth - barW) / 2);
        const barY = Math.round(screenHeight * 0.78);
        ctx.fillStyle = 'rgba(100, 80, 50, 0.4)';
        roundRect(ctx, barX, barY, barW, barH, 6);
        ctx.fill();
        ctx.fillStyle = '#c8a050';
        roundRect(ctx, barX, barY, Math.round(barW * Math.min(1, loadingProgress)), barH, 6);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `${Math.max(14, Math.round(barH * 1.2))}px "Segoe UI"`;
        ctx.textAlign = 'center';
        ctx.fillText(`载入中 ${Math.round(loadingProgress * 100)}%`, screenWidth / 2, barY + barH * 2);
        ctx.textAlign = 'left';
    } else if (startScreenPhase === 'ready') {
        // 呼吸缩放按钮（有存档时显示继续进度，否則显示开始挑战）
        const elapsed = Date.now();
        const breath = 1 + Math.sin(elapsed * 0.003) * 0.06;
        startScreenBtnScale = breath;

        const hasProgress = savedLevel > 1;
        // 每秒印一次 debug
        if (Math.floor(elapsed / 1000) !== Math.floor((elapsed - 16) / 1000)) {
            console.log('[drawStart] ready, savedLevel=' + savedLevel + ' hasProgress=' + hasProgress + ' loadImg=' + !!loadedImages['load']);
        }
        const btnImg = loadedImages[hasProgress ? 'load' : 'startBtn'];
        const bw = Math.round(screenWidth * 0.45 * breath);
        const bhBase = hasProgress ? (bw * 0.35) : bw * (btnImg.height / btnImg.width);
        const bh = Math.round(bhBase);
        const bx = Math.round((screenWidth - bw) / 2);
        const by = Math.round(screenHeight * 0.70);
        if (hasProgress) {
            homeLoadBtnRect = { x: bx, y: by, w: bw, h: bh };
            startScreenBtnRect = null;
        } else {
            startScreenBtnRect = { x: bx, y: by, w: bw, h: bh };
            homeLoadBtnRect = null;
        }
        if (btnImg && btnImg.complete) {
            ctx.drawImage(btnImg, bx, by, bw, bh);
        } else if (hasProgress) {
            // load.png 载入失败时画文字按鈕
            ctx.fillStyle = '#c28a4e';
            roundRect(ctx, bx, by, bw, bh, 12);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.round(bh * 0.35)}px "Segoe UI"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('继续进度', bx + bw / 2, by + bh / 2);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        }

        // 已攻略层数（load.png 下方）
        if (hasProgress) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${Math.round(bh * 0.3)}px "KaiTi", "華文楷書"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(`已攻略至第 ${savedLevel - 1} 层`, bx + bw / 2, by + bh + 6);
            ctx.textAlign = 'left';
            ctx.textBaseline = 'alphabetic';
        }

        // Bank 金币显示（首页下方）
        const bankImg = loadedImages['bank'];
        const bkW = Math.round(screenWidth * 0.12);
        const bkH = Math.round(bkW * (244 / 200));
        const bkX = Math.round(screenWidth / 2 - bkW * 0.7);
        const bkY = Math.round(screenHeight * 0.88);
        if (bankImg && bankImg.complete) {
            ctx.drawImage(bankImg, bkX, bkY, bkW, bkH);
        }
        // 金額文字 + 黑色背景
        const textX = bkX + bkW + 4;
        const textY = bkY + bkH / 2;
        const textSize = Math.round(bkW * 0.45);
        ctx.font = `bold ${textSize}px "Segoe UI"`;
        ctx.textBaseline = 'middle';
        const textW = ctx.measureText(`${savedBankCoins}`).width;
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        roundRect(ctx, textX - 4, textY - textSize / 2 - 2, textW + 8, textSize + 4, 6);
        ctx.fill();
        ctx.fillStyle = '#ffd700';
        ctx.textAlign = 'left';
        ctx.fillText(`${savedBankCoins}`, textX, textY);
        ctx.textBaseline = 'alphabetic';
    }
}

function startGameLoop() {
    function frame() {
        // 如果不在 playing 状态，渲染开始画面
        if (startScreenPhase !== 'playing') {
            ctx.clearRect(0, 0, screenWidth, screenHeight);
            drawStartScreen();
            requestAnimationFrame(frame);
            return;
        }
        updateAnimations();
        updateThrowBackAnimations();
        updateShuffleAnimations();
        updateActionAnimations();
        updateThrowActionAnimations();
        updateBombAnimations();
        updateShakeAnimations();
        updateCoverShakeAnimations();
        updateDanceAnimations();
        updateEntranceAnimations();
        updateAllCardsClickable();
        renderUI();
        requestAnimationFrame(frame);
    }
    frame();
}
function drawDebugBounds(ctx) {
    // BASE 範围（基础网格边界）- 藍色虛线框
    ctx.strokeStyle = 'rgba(0, 100, 255, 0.6)';
    ctx.lineWidth = 1.5 / cardScale;
    ctx.setLineDash([8, 4]);

    const baseLeft = BASE_MIN_X - CARD_SIZE / 2;
    const baseTop = BASE_MIN_Y - CARD_SIZE / 2;
    const baseWidth = BASE_MAX_X - BASE_MIN_X + CARD_SIZE;
    const baseHeight = BASE_MAX_Y - BASE_MIN_Y + CARD_SIZE;

    ctx.strokeRect(baseLeft, baseTop, baseWidth, baseHeight);

    // 添加标签
    ctx.fillStyle = 'rgba(0, 100, 255, 0.8)';
    ctx.font = `bold ${11 / cardScale}px "Segoe UI"`;
    ctx.fillText('BASE', baseLeft + 5, baseTop - 5);

    // MIN/MAX 範围（扩展边界）- 紅色实线框
    ctx.strokeStyle = 'rgba(255, 50, 50, 0.6)';
    ctx.lineWidth = 2 / cardScale;
    ctx.setLineDash([]);
    ctx.strokeRect(MIN_X, MIN_Y, MAX_X - MIN_X, MAX_Y - MIN_Y);

    // 添加标签和坐标
    ctx.fillStyle = 'rgba(255, 50, 50, 0.8)';
    ctx.fillText('MIN/MAX', MIN_X + 5, MIN_Y - 5);

    // 四角坐标标注
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

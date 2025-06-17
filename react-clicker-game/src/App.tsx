import React, { useState, useEffect } from 'react';
import Bubble from './components/Bubble';
import ResourceDisplay from './components/ResourceDisplay';

interface BubbleData {
    id: number;
    position: { x: number; y: number };
    timeout: number; // timestamp when bubble should disappear
}

const UI_WIDTH = 260;
const UI_HEIGHT = 140;
const UPGRADE_COST = 50;
const STORAGE_KEY = 'bubble-clicker-game-state';
const PRESTIGE_KEY = 'bubble-clicker-prestige';
const PRESTIGE_GOAL = 1_000_000;

const getRandomPosition = () => {
    // UI panel is at left: 20, top: 20, width: 260, height: 140
    const minX = UI_WIDTH + 40; // 260 + 40 = 300, so bubbles start to the right of UI
    const minY = 0;
    const maxX = window.innerWidth - 80;
    const maxY = window.innerHeight - 120;
    return {
        x: Math.random() * (maxX - minX) + minX,
        y: Math.random() * (maxY - minY) + minY,
    };
};

const getInitialState = () => {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prestigeSaved = localStorage.getItem(PRESTIGE_KEY);
    let prestigeStars = 0;
    let lifetimeGold = 0;
    let prestigeCost = 1_000_000; // Default starting cost
    if (prestigeSaved) {
        try {
            const prestige = JSON.parse(prestigeSaved);
            prestigeStars = prestige.prestigeStars ?? 0;
            lifetimeGold = prestige.lifetimeGold ?? 0;
            prestigeCost = prestige.prestigeCost ?? 1_000_000;
        } catch {}
    }
    if (saved) {
        try {
            const state = JSON.parse(saved);
            return {
                currency: state.currency ?? 0,
                upgradeLevel: state.upgradeLevel ?? 0,
                doubleGpsLevel: state.doubleGpsLevel ?? 0,
                doubleGpsCost: state.doubleGpsCost ?? 200,
                goldPerClick: state.goldPerClick ?? 1,
                clickUpgradeLevel: state.clickUpgradeLevel ?? 0,
                clickUpgradeCost: state.clickUpgradeCost ?? 50,
                prestigeStars,
                lifetimeGold,
                prestigeUpgrades: state.prestigeUpgrades ?? {},
                prestigeCost: state.prestigeCost ?? prestigeCost, // <--- add this line
            };
        } catch {}
    }
    return {
        currency: 0,
        upgradeLevel: 0,
        doubleGpsLevel: 0,
        doubleGpsCost: 200,
        goldPerClick: 1,
        clickUpgradeLevel: 0,
        clickUpgradeCost: 50,
        prestigeStars,
        lifetimeGold,
        prestigeUpgrades: {},
        prestigeCost, // <--- add this line
    };
};

const initialState = getInitialState();
console.log('Loaded state:', initialState);

const App: React.FC = () => {
    const [bubbles, setBubbles] = useState<BubbleData[]>([]);
    const [currency, setCurrency] = useState<number>(initialState.currency);
    const [upgradeLevel, setUpgradeLevel] = useState<number>(initialState.upgradeLevel);
    const [shopOpen, setShopOpen] = useState(false);
    const [doubleGpsLevel, setDoubleGpsLevel] = useState<number>(initialState.doubleGpsLevel ?? 0);
    const [doubleGpsCost, setDoubleGpsCost] = useState<number>(initialState.doubleGpsCost ?? 200);
    const [goldPerClick, setGoldPerClick] = useState<number>(initialState.goldPerClick ?? 1);
    const [clickUpgradeLevel, setClickUpgradeLevel] = useState<number>(initialState.clickUpgradeLevel ?? 0);
    const [clickUpgradeCost, setClickUpgradeCost] = useState<number>(initialState.clickUpgradeCost ?? 50);
    const [popEffects, setPopEffects] = useState<{ id: number; x: number; y: number; value: number }[]>([]);
    const [showSparkle, setShowSparkle] = useState(false);
    const [prestigeStars, setPrestigeStars] = useState<number>(initialState.prestigeStars ?? 0);
    const [lifetimeGold, setLifetimeGold] = useState<number>(initialState.lifetimeGold ?? 0);
    const [prestigeUpgrades, setPrestigeUpgrades] = useState<{ [key: string]: number }>(
        initialState.prestigeUpgrades ?? {}
    );
    const [shopTab, setShopTab] = useState<'main' | 'prestige'>('main');
    const [prestigeCost, setPrestigeCost] = useState<number>(initialState.prestigeCost ?? 1_000_000);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const lastCurrency = React.useRef(currency);

    useEffect(() => {
        const data = {
            currency, upgradeLevel, doubleGpsLevel, doubleGpsCost,
            goldPerClick, clickUpgradeLevel, clickUpgradeCost
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [currency, upgradeLevel, doubleGpsLevel, doubleGpsCost, goldPerClick, clickUpgradeLevel, clickUpgradeCost]);

    useEffect(() => {
        if (currency - lastCurrency.current >= 10) { // threshold for "rapid" gain
            setShowSparkle(true);
            setTimeout(() => setShowSparkle(false), 700); // sparkle duration
        }
        lastCurrency.current = currency;
    }, [currency]);

    function applySoftCap(value: number, cap: number, power = 0.5) {
        return value <= cap ? value : cap + Math.pow(value - cap, power);
    }

    // Example: Soft cap GPS at 1000, then sqrt growth
    const prestigeBonus = 1 + prestigeStars * 0.02;
    const rawGps = upgradeLevel * Math.pow(2, doubleGpsLevel) * prestigeBonus;
    const goldPerSecond = Math.floor(applySoftCap(rawGps, 1000, 0.5));

    // Example: Soft cap click at 100, then sqrt growth
    const clickValueBonus = 1 + 0.1 * (prestigeUpgrades["click10"] ?? 0);
    const rawGoldPerClick = goldPerClick * clickValueBonus;
    const effectiveGoldPerClick = Math.floor(applySoftCap(rawGoldPerClick, 100, 0.5));

    // Save game state to localStorage every 5 seconds
  
    // Spawn a bubble every second
    useEffect(() => {
        const interval = setInterval(() => {
            const newBubble = {
                id: Date.now() + Math.random(),
                position: getRandomPosition(),
                timeout: Date.now() + 10000 // 10 seconds from now
            };
            const MAX_BUBBLES = window.innerWidth < 600 ? 6 : 12;
            setBubbles(bubs => bubs.length < MAX_BUBBLES ? [...bubs, newBubble] : bubs);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // Gold per second effect
    useEffect(() => {
        if (goldPerSecond > 0) {
            const interval = setInterval(() => {
                setCurrency((c: number) => c + goldPerSecond);
                setLifetimeGold(lg => lg + goldPerSecond);
            }, 1000);
            return () => clearInterval(interval);
        }
    }, [goldPerSecond]);

    const handlePop = (id: number, screenPos: { x: number; y: number }) => {
        setBubbles(bubs => bubs.filter(b => b.id !== id));
        setCurrency((c: number) => c + goldPerClick);
        setLifetimeGold(lg => lg + goldPerClick);
        setPopEffects(effects => [
            ...effects,
            { id: Date.now() + Math.random(), x: screenPos.x, y: screenPos.y, value: goldPerClick }
        ]);
    };

    const handleUpgrade = () => {
        if (currency >= UPGRADE_COST) {
            setCurrency((c: number) => c - UPGRADE_COST);
            setUpgradeLevel((lvl: number) => lvl + 1);
        }
    };

    // Example shop items
    const shopItems = [
        { id: 1, name: 'Bubble Blaster', cost: 100 },
        { id: 2, name: 'Auto Popper', cost: 250 },
        { id: 3, name: 'Golden Soap', cost: 500 },
    ];

    const handleBuy = (item: { id: number; name: string; cost: number }) => {
        if (currency >= item.cost) {
            setCurrency((c: number) => c - item.cost);
            // Add your item effect logic here
            alert(`You bought: ${item.name}`);
        }
    };

    useEffect(() => {
        if (popEffects.length === 0) return;
        const timeout = setTimeout(() => {
            setPopEffects(effects => effects.slice(1));
        }, 700); // Duration matches animation
        return () => clearTimeout(timeout);
    }, [popEffects]);

    // Remove expired bubbles
    useEffect(() => {
        const interval = setInterval(() => {
            setBubbles(bubs => bubs.filter(b => b.timeout > Date.now()));
        }, 500); // Check every 0.5s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const prestigeData = {
            prestigeStars,
            lifetimeGold
        };
        localStorage.setItem(PRESTIGE_KEY, JSON.stringify(prestigeData));
    }, [prestigeStars, lifetimeGold]);

    useEffect(() => {
        const data = {
            currency, upgradeLevel, doubleGpsLevel, doubleGpsCost,
            goldPerClick, clickUpgradeLevel, clickUpgradeCost,
            prestigeUpgrades,
            prestigeCost, // <--- add this line
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }, [currency, upgradeLevel, doubleGpsLevel, doubleGpsCost, goldPerClick, clickUpgradeLevel, clickUpgradeCost, prestigeUpgrades, prestigeCost]);

    const prestigeShop = [
        {
            key: "start100",
            name: "Start with 100 gold",
            desc: "Begin each run with 100 gold.",
            cost: 1,
            max: 1,
        },
        {
            key: "click10",
            name: "+10% Click Value",
            desc: "Increase manual click value by 10% per level.",
            cost: 2,
            max: 10,
        },
        {
            key: "earlyAuto",
            name: "Unlock Auto-Buyers Earlier",
            desc: "Auto-buyers unlock at half the usual cost.",
            cost: 3,
            max: 1,
        },
    ];

    // Upgrade cost: fast at first, then ramps up
    const getUpgradeCost = (level: number) =>
      Math.floor(50 * Math.pow(1.18, level)); // 1.18 is a good early/midgame curve

    // Double GPS cost: steeper curve
    const getDoubleGpsCost = (level: number) =>
      Math.floor(200 * Math.pow(2.7, level)); // Steep for late game

    // Manual click upgrade cost: moderate curve
    const getClickUpgradeCost = (level: number) =>
      Math.floor(50 * Math.pow(2.1, level));

    const getNextPrestigeCost = (currentCost: number) => Math.floor(currentCost * 2.5); // or any scaling you want

    const calculatePrestigeStars = (gold: number) => Math.floor(gold / 1_000_000);

    return (
        <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-blue-100 to-white">
            {/* Shop Icon Button */}
            <div className="fixed top-6 left-6 z-50 flex flex-col gap-3">
    {/* Store Button */}
    <button
        className="w-14 h-14 flex items-center justify-center rounded-xl bg-white/90 shadow-lg border border-blue-200 hover:bg-blue-100 hover:shadow-xl transition-all text-blue-600 text-2xl active:scale-95"
        onClick={() => setShopOpen(true)}
        aria-label="Open Shop"
    >
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
            <rect x="3" y="7" width="18" height="13" rx="3" fill="#e3f2fd" stroke="#0288d1" strokeWidth="2"/>
            <path d="M3 7l2-4h14l2 4" stroke="#0288d1" strokeWidth="2" fill="none"/>
        </svg>
    </button>
    {/* Settings Button */}
    <button
        className="w-14 h-14 flex items-center justify-center rounded-xl bg-white/90 shadow-lg border border-gray-200 hover:bg-gray-100 hover:shadow-xl transition-all text-gray-600 text-2xl active:scale-95"
        onClick={() => setSettingsOpen(true)}
        aria-label="Open Settings"
    >
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="#90a4ae" strokeWidth="2" fill="#f5f7fa"/>
            <path d="M12 8v4l3 2" stroke="#90a4ae" strokeWidth="2" strokeLinecap="round"/>
            <circle cx="12" cy="12" r="2" fill="#90a4ae"/>
        </svg>
    </button>
</div>

            {/* Backdrop */}
            {shopOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 backdrop-blur-sm transition-opacity duration-300"
                    onClick={() => setShopOpen(false)}
                    aria-label="Close Shop"
                />
            )}

            {/* Side Shop Menu */}
            <div
                className={`fixed top-0 left-0 h-full w-[22rem] max-w-full z-50 flex flex-col transition-transform duration-300 ${
                    shopOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
                style={{ borderTopRightRadius: '1.5rem', borderBottomRightRadius: '1.5rem', boxShadow: '4px 0 24px #0288d133', background: '#fff' }}
                tabIndex={shopOpen ? 0 : -1}
                aria-hidden={!shopOpen}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b bg-white/90 rounded-tr-2xl shadow">
                    <div className="flex items-center gap-2">
                        <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#0288d1" strokeWidth="2" fill="#b3e5fc"/></svg>
                        <h3 className="text-xl font-bold text-blue-700 tracking-wide">Shop</h3>
                    </div>
                    <button
                        className="text-2xl font-bold text-gray-400 hover:text-blue-500 transition"
                        onClick={() => setShopOpen(false)}
                        aria-label="Close Shop"
                    >
                        ×
                    </button>
                </div>
                <div className="px-0 pt-0">
                    <div className="w-full bg-white rounded-t-2xl border-b border-gray-200 flex gap-1 px-6 pt-0 pb-2" style={{marginTop: '-1px'}}>
    <button
        className={`flex-1 px-3 py-2 rounded-lg font-semibold transition ${
            shopTab === 'main'
                ? 'bg-blue-100 text-blue-700 shadow'
                : 'bg-white text-blue-400'
        }`}
        onClick={() => setShopTab('main')}
    >
        Upgrades
    </button>
    <button
        className={`flex-1 px-3 py-2 rounded-lg font-semibold transition ${
            shopTab === 'prestige'
                ? 'bg-yellow-100 text-yellow-700 shadow'
                : 'bg-white text-yellow-400'
        }`}
        onClick={() => setShopTab('prestige')}
    >
        Prestige
    </button>
</div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 pb-6 bg-white rounded-b-2xl">
                    {shopTab === 'main' ? (
                        <>
                            <div className="mb-6">
                                <div className="font-semibold text-blue-700 text-base mb-2 flex items-center gap-2">
                                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#0288d1" strokeWidth="2" fill="#b3e5fc"/></svg>
                                    Upgrade Level: <span className="text-blue-900">{upgradeLevel}</span>
                                </div>
                                <button
                                    onClick={handleUpgrade}
                                    disabled={currency < getUpgradeCost(upgradeLevel)}
                                    className="w-full mb-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 text-white font-semibold shadow hover:from-blue-500 hover:to-blue-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    Buy Upgrade <span className="font-normal text-base">(+1 gold/sec)</span> — {getUpgradeCost(upgradeLevel)} gold
                                </button>
                            </div>
                            <div className="mb-6">
                                <div className="font-semibold text-yellow-700 text-base mb-2 flex items-center gap-2">
                                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="#fbc02d" strokeWidth="2" fill="#fffde7"/></svg>
                                    Double GPS: <span className="text-yellow-900">{doubleGpsLevel}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (currency >= getDoubleGpsCost(doubleGpsLevel)) {
                                            setCurrency(c => c - getDoubleGpsCost(doubleGpsLevel));
                                            setDoubleGpsLevel(lvl => lvl + 1);
                                            setDoubleGpsCost(getDoubleGpsCost(doubleGpsLevel + 1));
                                        }
                                    }}
                                    disabled={currency < getDoubleGpsCost(doubleGpsLevel)}
                                    className="w-full mb-2 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold shadow hover:from-yellow-500 hover:to-yellow-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    Double GPS (x2) — {getDoubleGpsCost(doubleGpsLevel)} gold
                                </button>
                            </div>
                            <div className="mb-6">
                                <div className="font-semibold text-green-700 text-base mb-2 flex items-center gap-2">
                                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24"><path d="M12 2L2 7h20L12 2z" fill="#c8e6c9"/><path d="M4 9v11h16V9H4zm2 2h12v7H6v-7z" fill="#4caf50"/></svg>
                                    Manual Click: <span className="text-green-900">{clickUpgradeLevel}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        if (currency >= getClickUpgradeCost(clickUpgradeLevel)) {
                                            setCurrency(c => c - getClickUpgradeCost(clickUpgradeLevel));
                                            setGoldPerClick(g => g + 1);
                                            setClickUpgradeLevel(lvl => lvl + 1);
                                            setClickUpgradeCost(getClickUpgradeCost(clickUpgradeLevel + 1));
                                        }
                                    }}
                                    disabled={currency < getClickUpgradeCost(clickUpgradeLevel)}
                                    className="w-full mb-2 px-4 py-2 rounded-lg bg-gradient-to-r from-green-400 to-green-500 text-white font-semibold shadow hover:from-green-500 hover:to-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                                >
                                    Manual Click +1 — {getClickUpgradeCost(clickUpgradeLevel)} gold
                                </button>
                            </div>
                            <ul>
                                {shopItems.map(item => (
                                    <li key={item.id} className="flex items-center justify-between mb-4 p-3 rounded-lg bg-white/90 shadow hover:bg-blue-50 transition">
                                        <span className="font-medium text-base">{item.name}</span>
                                        <span className="mx-2 text-yellow-700 font-semibold">{item.cost}💰</span>
                                        <button
                                            className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-blue-400 to-blue-500 text-white font-semibold shadow hover:from-blue-500 hover:to-blue-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                                            disabled={currency < item.cost}
                                            onClick={() => handleBuy(item)}
                                        >
                                            Buy
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <div>
                            {prestigeShop.map(item => (
                                <div key={item.key} className="flex items-center justify-between mb-4 p-3 rounded-lg bg-white/90 shadow hover:bg-yellow-50 transition">
                                    <div className="flex-1 pr-4">
                                        <div className="text-sm font-semibold text-gray-700">{item.name}</div>
                                        <div className="text-xs text-gray-500">{item.desc}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg font-bold text-yellow-600">{item.cost}⭐</span>
                                        <button
                                            disabled={
                                                prestigeStars < item.cost ||
                                                (prestigeUpgrades[item.key] ?? 0) >= item.max
                                            }
                                            onClick={() => {
                                                if (
                                                    prestigeStars >= item.cost &&
                                                    (prestigeUpgrades[item.key] ?? 0) < item.max
                                                ) {
                                                    setPrestigeStars(s => s - item.cost);
                                                    setPrestigeUpgrades(prev => ({
                                                        ...prev,
                                                        [item.key]: (prev[item.key] ?? 0) + 1,
                                                    }));
                                                }
                                            }}
                                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold shadow hover:from-yellow-500 hover:to-yellow-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                                        >
                                            Buy
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Gold and Gold Per Second Display */}
            <div className="fixed top-6 right-8 z-20 flex items-center gap-6 bg-white/80 rounded-xl shadow-lg px-6 py-3">
                <div className="relative">
                    <ResourceDisplay
                        name="Gold"
                        icon={<span role="img" aria-label="gold">💰</span>}
                        value={currency}
                    />
                    {showSparkle && (
                        <div className="absolute inset-0 pointer-events-none">
                            {/* 5 sparkles in different directions */}
                            <div className="sparkle-dot" style={{ "--x": "-16px", "--y": "-16px", background: "#facc15" } as React.CSSProperties}></div>
                            <div className="sparkle-dot" style={{ "--x": "16px", "--y": "-16px", background: "#fde68a" } as React.CSSProperties}></div>
                            <div className="sparkle-dot" style={{ "--x": "-16px", "--y": "16px", background: "#fbbf24" } as React.CSSProperties}></div>
                            <div className="sparkle-dot" style={{ "--x": "16px", "--y": "16px", background: "#f59e42" } as React.CSSProperties}></div>
                            <div className="sparkle-dot" style={{ "--x": "0px", "--y": "-22px", background: "#fffde4" } as React.CSSProperties}></div>
                        </div>
                    )}
                </div>
                <ResourceDisplay
                    name="GPS"
                    icon={
                        <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" stroke="#0288d1" strokeWidth="2" fill="#b3e5fc"/>
                        </svg>
                    }
                    value={`${goldPerSecond} /s`}
                />
            </div>

            {/* Bubbles */}
            {bubbles.map(bubble => (
                <Bubble
                    key={bubble.id}
                    position={bubble.position}
                    onPop={screenPos => handlePop(bubble.id, screenPos)}
                />
            ))}

            {/* Pop Effects */}
            {popEffects.map(effect => (
    <div
        key={effect.id}
        className="pointer-events-none select-none fixed z-50 text-green-600 font-bold text-xl"
        style={{
            left: effect.x,
            top: effect.y,
            transform: 'translate(-50%, -50%)',
            opacity: 0.8,
            animation: 'pop-float 0.4s cubic-bezier(0.4,0,0.2,1) forwards'
        }}
    >
        +{effect.value}
    </div>
))}

            {/* Sparkle Effect */}
            <div className="fixed bottom-6 right-8 z-30 bg-white/90 rounded-xl shadow-lg px-6 py-4 flex flex-col items-center gap-2">
    <div className="flex items-center gap-2 text-yellow-600 font-bold text-lg">
        ⭐ Prestige Stars: {prestigeStars}
    </div>
    <div className="text-gray-700 text-sm">
        Lifetime Gold: {lifetimeGold.toLocaleString()}
    </div>
    <button
        disabled={calculatePrestigeStars(currency) < 1}
        onClick={() => {
            const starsEarned = calculatePrestigeStars(currency);
            if (starsEarned > 0) {
                setPrestigeStars(s => s + starsEarned);
                setCurrency(prestigeUpgrades["start100"] ? 100 : 0);
                setUpgradeLevel(0);
                setDoubleGpsLevel(0);
                setDoubleGpsCost(200);
                setGoldPerClick(1);
                setClickUpgradeLevel(0);
                setClickUpgradeCost(50);
                setBubbles([]);
                // No prestigeCost update needed!
            }
        }}
        className="mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-500 text-white font-semibold shadow hover:from-yellow-500 hover:to-yellow-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
    >
        {calculatePrestigeStars(currency) > 0
            ? `Prestige! (+${calculatePrestigeStars(currency)} ⭐)`
            : `Prestige requires at least 1,000,000 gold`}
    </button>
    <div className="text-xs text-yellow-700 mt-1">
        Each star increases GPS by 2% permanently.
    </div>
</div>

            {/* Settings Modal */}
            {settingsOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[300px] flex flex-col items-center">
            <h2 className="text-xl font-bold mb-4">Settings</h2>
            
            {/* === DEV TOOLS START === */}
            <div className="w-full mb-4 p-4 rounded-lg bg-yellow-50 border border-yellow-300 flex flex-col items-center">
    <div className="font-bold text-yellow-800 mb-2">DEV TOOLS</div>
    <div className="flex gap-2 mb-2">
        <button
            className="px-3 py-1 rounded bg-blue-200 text-blue-800 font-semibold hover:bg-blue-300 transition"
            onClick={() => setCurrency(c => c + 1000000)}
        >
            +1M Gold
        </button>
        <button
            className="px-3 py-1 rounded bg-green-200 text-green-800 font-semibold hover:bg-green-300 transition"
            onClick={() => {
                setUpgradeLevel(lvl => lvl + 10);
                setDoubleGpsLevel(lvl => lvl + 2);
            }}
        >
            +10 Upgrades, +2 GPS
        </button>
    </div>
    <div className="flex gap-2">
        <button
            className="px-3 py-1 rounded bg-yellow-200 text-yellow-800 font-semibold hover:bg-yellow-300 transition"
            onClick={() => setPrestigeStars(s => s + 10)}
        >
            +10 Stars
        </button>
    </div>
</div>
{/* === DEV TOOLS END === */}
      
      <button className="mb-4 px-4 py-2 rounded-lg bg-red-500 text-white font-semibold shadow hover:bg-red-600 transition" onClick={() => setShowResetConfirm(true)}>
        HARD RESET
      </button>
      <button
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold shadow hover:bg-gray-300 transition"
                onClick={() => setSettingsOpen(false)}
            >
                Close
            </button>
            {showResetConfirm && (
                <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60">
                    <div className="bg-white rounded-xl shadow-xl p-6 flex flex-col items-center">
                        <div className="mb-4 text-lg font-bold text-red-600">
                            Are you sure you want to HARD RESET all progress?
                        </div>
                        <div className="flex gap-4">
                            <button
                                className="px-4 py-2 rounded-lg bg-red-500 text-white font-semibold shadow hover:bg-red-600 transition"
                                onClick={() => {
                                    localStorage.clear();
                                    window.location.reload();
                                }}
                            >
                                Yes, reset everything
                            </button>
                            <button
                                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold shadow hover:bg-gray-300 transition"
                                onClick={() => setShowResetConfirm(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    </div>
)}

            {/* === DEV TOOLS START === */}
            <div className="w-full mb-4 p-4 rounded-lg bg-yellow-50 border border-yellow-300 flex flex-col items-center">
    <div className="font-bold text-yellow-800 mb-2">DEV TOOLS</div>
    <div className="flex gap-2 mb-2">
        <button
            className="px-3 py-1 rounded bg-blue-200 text-blue-800 font-semibold hover:bg-blue-300 transition"
            onClick={() => setCurrency(c => c + 1000000)}
        >
            +1M Gold
        </button>
        <button
            className="px-3 py-1 rounded bg-green-200 text-green-800 font-semibold hover:bg-green-300 transition"
            onClick={() => {
                setUpgradeLevel(lvl => lvl + 10);
                setDoubleGpsLevel(lvl => lvl + 2);
            }}
        >
            +10 Upgrades, +2 GPS
        </button>
    </div>
    <div className="flex gap-2">
        <button
            className="px-3 py-1 rounded bg-yellow-200 text-yellow-800 font-semibold hover:bg-yellow-300 transition"
            onClick={() => setPrestigeStars(s => s + 10)}
        >
            +10 Stars
        </button>
    </div>
</div>
{/* === DEV TOOLS END === */}

        </div>

    );
};

export default App;
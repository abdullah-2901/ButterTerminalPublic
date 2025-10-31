//DashboardContent.js
// Import React and core dependencies
import React, { useEffect, useState, useCallback, useContext, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import axios from 'axios';
// Telegram auth now handled by buttertrade.online - import removed


// Import asset icons
import web_icon from '../assets/icons/web.svg';
import telegram_icon from '../assets/icons/telegram_icon.svg';
import twitter_icon from '../assets/icons/twitter_icon.svg';
import solscan_icon from '../assets/icons/solscan.svg';
import sol_Icon from '../assets/icons/solanaIcon.svg';

// Import UI components and libraries
import { Container, Row, Col, Tab, Tabs, Tooltip, OverlayTrigger } from 'react-bootstrap';

import Spinner from '../Spinner';

// Import styles
import 'bootstrap/dist/css/bootstrap.min.css';
// import './App.css';
import('@solana/wallet-adapter-react-ui/styles.css');

// Import custom components
import { copyHandler } from '../utils/CopyHandler';
import TradeSettings from './TradeSetings';
import LimitOrder from './limit-order-component';
import TokenHoldings from './tokenListing';
import SwipeableChartCard from './swipeable-chart-card';
import BuyAndSellPopup from './BuyAndSellPopup';
// import BuyAndSellPopup from './BuyAndSellPopupWithDetailedPage';
import ButterTerminalContext from './ButterTerminalContext';
import Footer from './Footer';

import usePriceWebSocket  from '../usePriceWebSocket';
import WebSocketStatus  from '../WebSocketStatus';

// Import Solana wallet components
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';

// API endpoints configuration
const UPDATE_STATUS_URL = 'https://api.buttertrade.xyz/api/Data';
const HOLDERS_DATA_API = 'https://api.buttertrade.xyz/api/Data/GetHoldersLiveDataWithChannelName';
const SETTINGS_STORAGE_KEY = 'butter_trade_settings';

// Base tab configuration
const BASE_TAB_CONFIGURATIONS = [
    {
        name: 'sauce',
        channels: [ 'pumpswap'],
        combinedChannels: 'pumpswap'
    }
    // ,
    // {
    //     name: 'churning',
    //     channels: ['SolVol'],
    //     combinedChannels: 'SolVol'
    // },
    // {
    //     name: 'early',
    //     channels: ['EarlyCalls'],
    //     combinedChannels: 'EarlyCalls'
    // }
];

// Helper function to convert timeframe to seconds
const getTimeframeSeconds = (timeframe) => {
    if (!timeframe) return 60;
    const unit = timeframe.slice(-1);
    const val = parseInt(timeframe.slice(0, -1), 10) || 1;
    if (unit === 's') return val;
    if (unit === 'm') return val * 60;
    if (unit === 'h') return val * 3600;
    if (unit === 'd') return val * 86400;
    return 60;
};

// Settings management functions
const getDefaultSettings = () => ({
    priorityFee: '0.01',
    slippage: '30',
    mevProtection: false,
    bribe: '0.002'
});

const loadSettingsFromStorage = () => {
    try {
        const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return savedSettings ? JSON.parse(savedSettings) : getDefaultSettings();
    } catch (error) {
        console.error('Error loading settings from localStorage:', error);
        return getDefaultSettings();
    }
};

const saveSettingsToStorage = (settings) => {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
        console.error('Error saving settings to localStorage:', error);
    }
};

const DashboardContent = () => {
    // Wallet and context hooks
    const { connected, publicKey } = useWallet();
    const { createNewButterWallet, butterWalletCredentials, getWallet } = useContext(ButterTerminalContext);
    const navigate = useNavigate();
    const activeChannelRef = useRef('sauce');
    const intervalsRef = useRef({ price: null, holders: null });

    // State management
    const [chartData, setChartData] = useState([]);
    const [previousChartData, setPreviousChartData] = useState([]);
    const [holdersData, setHoldersData] = useState([]);
    const [previousHoldersData, setPreviousHoldersData] = useState([]);
    const [priceLoading, setPriceLoading] = useState(true);
    const [holdersLoading, setHoldersLoading] = useState(true);
    const [activeChannel, setActiveChannel] = useState('sauce');
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [settings, setSettings] = useState(loadSettingsFromStorage());
    // Dynamic tabs from Telegram chat names
    const [chatTabs, setChatTabs] = useState([]);

    // UI state
    const [showBuySellPopup, setShowBuySellPopup] = useState(false);
    const [showListingPopup, setShowListingPopup] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isLimitMode, setIsLimitMode] = useState(false);
    const [isWalletPopupOpen, setIsWalletPopupOpen] = useState(false);
    const [copiedStates, setCopiedStates] = useState({});
    const [updatingStatus, setUpdatingStatus] = useState(null);

    // Telegram state (dashboard button)
    const [telegramUser, setTelegramUser] = useState(null);
    const AUTH_APP_DOMAIN = 'https://buttertrade.online';
    
    const onConnectTelegram = async () => {
        try {
            if (butterWalletCredentials?.telegram_id != null) {
                return;
            }
            // Redirect to auth app on buttertrade.online
            const returnUrl = encodeURIComponent(`${window.location.origin}${window.location.pathname}`);
            const authUrl = `${AUTH_APP_DOMAIN}/?returnUrl=${returnUrl}`;
            window.location.href = authUrl;
        } catch (e) {
            console.error('Telegram connect failed:', e);
        }
    };

    // Handle Telegram auth callback from buttertrade.online
    useEffect(() => {
        const handleTelegramAuthCallback = async () => {
            // Check if we're coming from the auth app - check for telegramData in URL params
            const urlParams = new URLSearchParams(window.location.search);
            const telegramData = urlParams.get('telegramData');
            const isAuthCallback = urlParams.get('telegramAuth') === 'true' || telegramData !== null;

            if (isAuthCallback && telegramData) {
                try {
                    const user = JSON.parse(decodeURIComponent(telegramData));
                    setTelegramUser(user);

                    // Save telegram_id to backend immediately
                    const telegramIdToSave = user?.username || String(user?.id || '');
                    
                    if (telegramIdToSave) {
                        // Function to save telegram_id
                        const saveTelegramId = async (userPublicKey) => {
                            try {
                                const body = new URLSearchParams();
                                body.set('userpublickey', userPublicKey.toString());
                                body.set('telegram_id', telegramIdToSave);
                                
                                await axios.post('https://trd.buttertrade.xyz/api/save-telegram', body);
                                
                                // Refresh wallet data to get updated telegram_id
                                if (publicKey && getWallet) {
                                    await getWallet(publicKey.toString());
                                }
                                
                                // Clean up URL parameters after successful save
                                window.history.replaceState({}, document.title, window.location.pathname);
                                return true;
                            } catch (err) {
                                console.error('Failed to save Telegram:', err?.response?.data || err.message);
                                return false;
                            }
                        };

                        // Check if butterWalletCredentials is already available
                        const userPublicKey = butterWalletCredentials?.userpublickey;
                        
                        if (userPublicKey) {
                            // Credentials are available, save immediately
                            await saveTelegramId(userPublicKey);
                        } else {
                            // Credentials not available yet, wait for them (page reloads and API takes time)
                            // Store telegramData in sessionStorage so we can save it later
                            sessionStorage.setItem('pendingTelegramAuth', JSON.stringify({
                                telegramId: telegramIdToSave,
                                userData: user
                            }));
                            
                            // Clean up URL parameters but keep waiting for credentials
                            window.history.replaceState({}, document.title, window.location.pathname);
                        }
                    }
                } catch (err) {
                    console.error('Failed to process Telegram auth callback:', err);
                }
            }
        };

        handleTelegramAuthCallback();
    }, [publicKey, butterWalletCredentials, getWallet]);

    // Handle pending Telegram auth when butterWalletCredentials becomes available
    useEffect(() => {
        const handlePendingTelegramAuth = async () => {
            const pendingAuth = sessionStorage.getItem('pendingTelegramAuth');
            
            if (pendingAuth && butterWalletCredentials?.userpublickey) {
                // Clear sessionStorage immediately to prevent multiple saves
                sessionStorage.removeItem('pendingTelegramAuth');
                
                try {
                    const { telegramId, userData } = JSON.parse(pendingAuth);
                    const userPublicKey = butterWalletCredentials.userpublickey;
                    
                    const body = new URLSearchParams();
                    body.set('userpublickey', userPublicKey.toString());
                    body.set('telegram_id', telegramId);
                    
                    await axios.post('https://trd.buttertrade.xyz/api/save-telegram', body);
                    
                    // Update telegram user state
                    setTelegramUser(userData);
                    
                    // Refresh wallet data to get updated telegram_id
                    if (publicKey && getWallet) {
                        await getWallet(publicKey.toString());
                    }
                } catch (err) {
                    console.error('Failed to save pending Telegram auth:', err);
                    // Restore pending auth if save failed so user can retry
                    sessionStorage.setItem('pendingTelegramAuth', pendingAuth);
                }
            }
        };

        handlePendingTelegramAuth();
    }, [butterWalletCredentials, publicKey, getWallet]);

    // Hydrate telegram from backend initial-state when wallet connects
    useEffect(() => {
        const fetchTelegram = async () => {
            try {
                if (!publicKey) return;
                const resp = await axios.post('https://trd.buttertrade.xyz/api/initial-state', {
                    publicKey: publicKey.toString()
                }, { headers: { 'Content-Type': 'application/json' } });
                const tgid = resp?.data?.data?.telegram_id ?? resp?.data?.telegram_id ?? null;
                if (tgid) {
                    const isNumeric = /^\d+$/.test(String(tgid));
                    const userObj = isNumeric
                        ? { id: String(tgid), username: '' }
                        : { id: '', username: String(String(tgid).replace(/^@/, '')) };
                    setTelegramUser(userObj);
                }
            } catch (err) {
                // silent
            }
        };
        fetchTelegram();
    }, [publicKey]);

    // Fetch Telegram chat names and create dynamic tabs
    useEffect(() => {
        const fetchChatTabs = async () => {
            try {
                const rawTg = butterWalletCredentials?.telegram_id
                    || (telegramUser?.username ? telegramUser.username : (telegramUser?.id ? String(telegramUser.id) : null));
                if (!rawTg) return;
                const cleaned = String(rawTg).replace(/^@/, '');
                const resp = await axios.get(`https://trd.buttertrade.xyz/api/telegram-chats/${encodeURIComponent(cleaned)}`);
                const chats = Array.isArray(resp?.data?.data) ? resp.data.data : [];
                const uniqueChats = [...new Set(chats.filter(Boolean))];
                const tabs = uniqueChats.map(name => ({ name, channels: [name], combinedChannels: name }));
                setChatTabs(tabs);
            } catch (e) {
                setChatTabs([]);
            }
        };
        fetchChatTabs();
    }, [butterWalletCredentials?.telegram_id, telegramUser?.username, telegramUser?.id]);

    // Token and trade state
    const [contractAddress, setContractAddress] = useState('');
    const [channel, setChannel] = useState('');
    const [tradeType, setTradeType] = useState('');
    const [currentType, setCurrentType] = useState('buy');
    const [icon, setIcon] = useState();
    const [decimals, setDecimals] = useState();
    const [tokenInfo, setTokenInfo] = useState({
        tokenSymbol: '',
        tokenName: '',
        tokenIcon: null,
        tokenPrice: 0,
        tokenBalance: 0,
        mcap: '$0',
        liquidity: '$0',
        volume24h: '$0',
        priceChange: 0
    });
    const [isApiDataInitialized, setIsApiDataInitialized] = useState(false);
    // Add pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMoreData, setHasMoreData] = useState(true);
    const [paginationByTab, setPaginationByTab] = useState({});
    const loadMoreRef = useRef(null);
    

// First define handlePriceUpdate
// In DashboardContent.js, update the handlePriceUpdate function:

// Add throttling to prevent excessive updates
const lastUpdateTimeRef = useRef({});

// Around line 168 - Modify handlePriceUpdate to skip running candle updates
const handlePriceUpdate = useCallback((priceData) => {
    if (!priceData || !priceData.contractAddress || !priceData.time) {
        return;
    }
    
    // ✅ ONLY update parent state for COMPLETE candles
    // Running candles are handled by the chart's WebSocket listener
    if (!priceData.isComplete) {
        return;
    }

    setChartData(prevData => {
        // Find the matching chart index first
        const chartIndex = prevData.findIndex(chart => 
            chart.contractAddress === priceData.contractAddress && 
            chart.timeframe === priceData.timeframe
        );
        
        // If no matching chart found, return unchanged
        if (chartIndex === -1) {
            return prevData;
        }
        
        const chart = prevData[chartIndex];
        const newDataPoint = {
            time: priceData.time,
            open: +priceData.open || 0,
            high: +priceData.high || 0,
            low: +priceData.low || 0,
            close: +priceData.close || 0,
            marketCap: +priceData.marketCap || 0,
            isComplete: true, // Always true at this point
            volume: priceData.volume
        };

        let updatedData = [...chart.data];
        let hasChanges = false;
        
        // Only process complete candles here
        const existingIndex = updatedData.findIndex(point => point.time === newDataPoint.time);
        
        if (existingIndex !== -1) {
            const existing = updatedData[existingIndex];
            
            const isDifferent = 
                Math.abs(existing.open - newDataPoint.open) > 0.0000001 ||
                Math.abs(existing.high - newDataPoint.high) > 0.0000001 ||
                Math.abs(existing.low - newDataPoint.low) > 0.0000001 ||
                Math.abs(existing.close - newDataPoint.close) > 0.0000001;
            
            if (isDifferent) {
                updatedData[existingIndex] = newDataPoint;
                hasChanges = true;
            }
        } else {
            updatedData.push(newDataPoint);
            updatedData.sort((a, b) => a.time - b.time);
            hasChanges = true;
        }

        // If no changes, return prevData unchanged (same reference!)
        if (!hasChanges) {
            return prevData;
        }

        // Memory management
        if (updatedData.length > 500) {
            updatedData = updatedData.filter(d => d.isComplete).slice(-400);
        }
        
        // Only create new array when we have actual changes
        const newData = [...prevData];
        newData[chartIndex] = {
            ...chart,
            data: updatedData,
            lastUpdate: Date.now(),
            currentMarketCap: newDataPoint.marketCap
        };
        
        return newData;
    });
}, []);

// Then use it in the WebSocket hook
const {
    isConnected: isPriceConnected,
    error: wsError,
    registerTokenTimeframe,
    subscribeToChannel
} = usePriceWebSocket(activeChannel, handlePriceUpdate);

// Subscribe to specific tokens when chart data is loaded or WebSocket reconnects
useEffect(() => {
    if (isApiDataInitialized && isPriceConnected && chartData.length > 0) {
        // Collect all channels to subscribe to
        const channels = chartData
            .filter(chart => chart.contractAddress && chart.timeframe)
            .map(chart => `${chart.contractAddress}:${chart.timeframe}`);
        
        if (channels.length > 0) {
            subscribeToChannel(channels);
            
            // Also subscribe to live price feeds for real-time updates
            const liveChannels = channels.map(channel => {
                const parts = channel.split(':');
                return `${parts[0]}:live`; // Convert "contract:timeframe" to "contract:live"
            });
            
            subscribeToChannel(liveChannels);
        }
    }
}, [isApiDataInitialized, isPriceConnected, subscribeToChannel]);

// Subscribe to tokens when chart data changes (but not on every chart data update to avoid excessive subscriptions)
useEffect(() => {
    if (isPriceConnected && chartData.length > 0) {
        // Collect all channels to subscribe to
        const channels = chartData
            .filter(chart => chart.contractAddress && chart.timeframe)
            .map(chart => `${chart.contractAddress}:${chart.timeframe}`);
        
        if (channels.length > 0) {
            subscribeToChannel(channels);
            
            // Also subscribe to live price feeds for real-time updates
            const liveChannels = channels.map(channel => {
                const parts = channel.split(':');
                return `${parts[0]}:live`; // Convert "contract:timeframe" to "contract:live"
            });
            
            subscribeToChannel(liveChannels);
        }
    }
}, [chartData.length, isPriceConnected, subscribeToChannel]); // Only trigger when chart data length changes

// Periodically update current candles to keep them fresh and create new ones when timeframes change
// Subscribe to tokens when chart data changes (but not on every chart data update to avoid excessive subscriptions)
useEffect(() => {
    if (isPriceConnected && chartData.length > 0) {
        // Collect all channels to subscribe to
        const channels = chartData
            .filter(chart => chart.contractAddress && chart.timeframe)
            .map(chart => `${chart.contractAddress}:${chart.timeframe}`);
        
        if (channels.length > 0) {
            subscribeToChannel(channels);
            
            // Also subscribe to live price feeds for real-time updates
            const liveChannels = channels.map(channel => {
                const parts = channel.split(':');
                return `${parts[0]}:live`; // Convert "contract:timeframe" to "contract:live"
            });
            
            subscribeToChannel(liveChannels);
        }
    }
}, [chartData.length, isPriceConnected, subscribeToChannel]); // Only trigger when chart data length changes

// REMOVED: Two useEffect hooks that created artificial current candles
// 1. Periodic update effect (lines 366-433) - REMOVED
// 2. Simulation effect (lines 436-502) - REMOVED
// Real-time current candles are now handled exclusively by WebSocket

// Remove the old bulk subscription logic
// useEffect(() => {
//     if (isApiDataInitialized && isPriceConnected && subscribeToChannel) {

// Simulate real-time price updates for current candles
useEffect(() => {
    if (!isPriceConnected || chartData.length === 0) return;
    
    const simulateRealTimeUpdates = () => {
        setChartData(prevData => {
            return prevData.map(chart => {
                if (!chart.data || chart.data.length === 0) return chart;
                
                const latestCandle = chart.data[chart.data.length - 1];
                
                // Only update if the latest candle is running (not complete)
                if (!latestCandle.isComplete) {
                    const updatedData = [...chart.data];
                    const lastIndex = updatedData.length - 1;
                    
                    // Simulate small price movements for demonstration
                    const priceVariation = (Math.random() - 0.5) * 0.000001; // Small random variation
                    const newPrice = Math.max(0.000001, latestCandle.close + priceVariation);
                    
                    // Only update if price changed significantly
                    const priceChanged = Math.abs(newPrice - latestCandle.close) > 0.0000001;
                    
                    if (priceChanged) {
                        const updatedCandle = {
                            ...latestCandle,
                            high: Math.max(latestCandle.high, newPrice),
                            low: Math.min(latestCandle.low, newPrice),
                            close: newPrice,
                            marketCap: latestCandle.marketCap * (newPrice / latestCandle.close) // Adjust market cap proportionally
                        };
                        
                        updatedData[lastIndex] = updatedCandle;
                    } else {
                        return chart; // No changes, return original chart
                    }
                    
                    return {
                        ...chart,
                        data: updatedData,
                        lastUpdate: Date.now()
                    };
                }
                
                return chart;
            });
        });
    };
    
    // Update every 5 seconds to simulate real-time price changes (reduced frequency)
    const interval = setInterval(simulateRealTimeUpdates, 5000);
    
    return () => clearInterval(interval);
}, [isPriceConnected, chartData.length]);

// Remove the old bulk subscription logic
// useEffect(() => {
//     if (isApiDataInitialized && isPriceConnected && subscribeToChannel) {
//         const currentTabConfig = TAB_CONFIGURATIONS.find(tab => tab.name === activeChannel);
//         
//         if (currentTabConfig) {
//             // For sauce tab (pumpswap), use bulk subscription to get multiple tokens
//             if (activeChannel === 'sauce') {
//                 // console.log('Subscribing to pumpswap channel for bulk token updates...');
//                 subscribeToTokenChannel('pumpswap', 50); // Limit to 50 tokens to prevent memory issues
//             } else if (Array.isArray(currentTabConfig.channels)) {
//                 // For other tabs with multiple channels, subscribe to each channel
//                 currentTabConfig.channels.forEach(channel => {
//                     subscribeToChannel(channel);
//                 });
//             } else {
//                 subscribeToChannel(currentTabConfig.combinedChannels);
//             }
//         }
//     }
// }, [isApiDataInitialized, isPriceConnected, activeChannel, subscribeToChannel, subscribeToTokenChannel]);


// Rest of initialization effects
useEffect(() => {
    const initializeData = async () => {
        try {
            // Initial data fetch from REST API
            await fetchPriceDataForChannel(activeChannel);
        } catch (error) {
            console.error('Error initializing data:', error);
            setError(error.message);
        }
    };

    initializeData();
}, []); // Only run once on component mount

// Add infinite scrolling
// Add infinite scrolling - modify this useEffect
useEffect(() => {
    // console.log("Scroll observer effect running with state:", {
    //     priceLoading,
    //     isLoadingMore,
    //     hasMoreData,
    //     activeChannel,
    //     currentPage: paginationByTab[activeChannel] || 1
    // });
    
    // Create the observer without the loading conditions - check them inside the callback instead
    const observer = new IntersectionObserver(
        entries => {
            const [entry] = entries;
            // console.log("Intersection detected:", entry.isIntersecting, 
            //             "Intersection ratio:", entry.intersectionRatio);
            
            if (entry.isIntersecting) {
                // console.log("Element is visible - checking if we should load more");
                
                // Check loading conditions inside the callback
                if (!priceLoading && !isLoadingMore && hasMoreData) {
                    // console.log("✅ LOADING MORE DATA NOW");
                    // Get current page for this tab
                    const page = paginationByTab[activeChannel] || 1;
                    const nextPage = page + 1;
                    
                    // console.log(`Loading page ${nextPage} for ${activeChannel}`);
                    
                    // Update pagination state
                    setPaginationByTab(prev => ({
                        ...prev,
                        [activeChannel]: nextPage
                    }));
                    
                    // Fetch more data
                    fetchPriceDataForChannel(activeChannel, nextPage, true);
                } else {
                    // console.log("Cannot load more because:", 
                    //            priceLoading ? "still loading initial data" : "",
                    //            isLoadingMore ? "already loading more data" : "",
                    //            !hasMoreData ? "no more data available" : "");
                }
            }
        },
        // Use a lower threshold to detect earlier
        { threshold: 0.01, rootMargin: "100px" }
    );
    
    // Ensure the sentinel element exists before observing
    const loadMoreElement = loadMoreRef.current;
    if (loadMoreElement) {
        observer.observe(loadMoreElement);
        // console.log("✅ Observer attached to loadMoreRef element");
    } 
    // else {
    //     console.log("❌ loadMoreRef element does not exist");
    // }
    
    return () => {
        if (loadMoreElement) {
            observer.unobserve(loadMoreElement);
        }
    };
// Include all dependencies that might affect the loading conditions
}, [activeChannel, paginationByTab, hasMoreData, priceLoading, isLoadingMore]);

const processData = (rawData, currentTab) => {
    try {
        // Check if we have a valid response format
        if (!rawData || !rawData.contracts || !Array.isArray(rawData.contracts)) {
            console.error('Invalid data format received:', rawData);
            return [];
        }

        // console.log("Processing data array with length:", rawData.contracts.length);
        
        // Process each token in the contracts array
        return rawData.contracts.map(contract => {
            try {
                // Basic validation checks with detailed logging
                if (!contract) {
                    console.error('Null or undefined contract item');
                    return null;
                }
                
                const { 
                    contractAddress, 
                    channelName, 
                    symbol, 
                    name, 
                    timeframe, 
                    candles 
                } = contract;
                
                if (!contractAddress) {
                    console.error('Missing contract address in contract data');
                    return null;
                }
                
                if (!candles || !Array.isArray(candles)) {
                    console.error(`Missing or invalid candles for token: ${contractAddress}`);
                    // Return token with empty data instead of null
                    return {
                        contractAddress,
                        tokenName: name || 'Unknown Token',
                        tokenSymbol: symbol || 'Unknown',
                        tokenImage: null, // No image in the new format
                        description: '',
                        timeframe: timeframe || '1m',
                        decimals: 9, // Default decimals
                        solscanURL: `https://solscan.io/token/${contractAddress}`,
                        website: null,
                        twitter: null,
                        telegram: null,
                        data: [] // Empty data array
                    };
                }
                
                // Safely map OHLC data with additional error checking
                const chartData = candles.map(candle => {
                    try {
                        if (!candle || !candle.time) {
                            return null;
                        }
                        
                        return {
                            time: Math.floor(new Date(candle.time).getTime() / 1000),
                            open: Number(candle.open || 0),
                            high: Number(candle.high || 0),
                            low: Number(candle.low || 0),
                            close: Number(candle.close || 0),
                            marketCap: Number(candle.marketCap || 0),
                            volume: {
                                dollar: Number(candle.volume || 0),
                                sol: Number(candle.volume || 0) / 100, // Estimate SOL volume
                                buy: Number(candle.volume || 0) / 200, // Estimate buy volume
                                sell: Number(candle.volume || 0) / 200 // Estimate sell volume
                            },
                            isComplete: true
                        };
                    } catch (err) {
                        console.error(`Error processing candle for ${contractAddress}:`, err);
                        return null;
                    }
                })
                .filter(Boolean) // Remove null points
                .sort((a, b) => a.time - b.time);

                // DON'T create artificial current candles from API data
                // Let WebSocket provide real-time current candle with correct OHLC values
                
                const tokenName = name || 'Unknown Token';
                const tokenSymbol = symbol || 'Unknown';
                
                // Skip tokens with unknown names or symbols
                if (tokenName === 'Unknown Token' || tokenSymbol === 'Unknown' || 
                    tokenName.toLowerCase().includes('unknown') || 
                    tokenSymbol.toLowerCase().includes('unknown')) {
                    return null;
                }
                
                return {
                    contractAddress,
                    tokenName,
                    tokenSymbol,
                    tokenImage: null, // No image in the new format
                    description: '',
                    timeframe: timeframe || '1m',
                    decimals: 9, // Default decimals
                    solscanURL: `https://solscan.io/token/${contractAddress}`,
                    website: null,
                    twitter: null,
                    telegram: null,
                    channelName: channelName || 'Unknown',
                    data: chartData
                };
            } catch (itemError) {
                console.error('Error processing token item:', itemError);
                return null;
            }
        }).filter(Boolean); // Remove any null items
    } catch (error) {
        console.error('Error processing data:', error);
        return [];
    }
};


    const processHoldersData = (rawData) => {
        setIsProcessing(true);
        try {
            const processedData = rawData.map(item => ({
                channelName: item.ChannelName || 'Unknown Channel',
                contractAddress: item.ContractAddress,
                tokenSymbol: item.TokenSymbol || 'Unknown Token',
                data: (item.Data || [])
                    .map(point => ({
                        time: Math.floor(new Date(point.CreatedDate).getTime() / 1000),
                        value: parseFloat(point.Holders),
                    }))
                    .filter(point => !isNaN(point.value) && !isNaN(point.time))
            })).filter(item => item.data.length > 0);

            return processedData;
        } catch (error) {
            throw new Error('Error processing holders data: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

  

    const fetchPriceDataForChannel = async (channel, page = 1, shouldAppend = false) => {
        if (channel !== activeChannelRef.current) return;
    
        try {
            if (page > 1) {
                setIsLoadingMore(true);
            } else {
                setPriceLoading(true);
            }
    
            // Choose endpoint based on selected tab/channel
            // sauce → active tokens; other tabs → by-chat
            const url = channel === 'sauce'
                ? `/OHLCV/api/tokens/active?hours=96`
                : `https://api.buttertrade.xyz/OHLCV/api/tokens/by-chat/${encodeURIComponent(channel)}`;
            
            
            let response;
            try {
                response = await axios.get(url, {
                    timeout: 50000,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache',
                        'Content-Type': 'application/json'
                    }
                });
            } catch (apiError) {
                console.error("API Error:", apiError);
                
            }
            
            if (channel !== activeChannelRef.current) return;
            
            const tokensData = response.data || { contracts: [] };
            
            const processedPriceData = processData(tokensData, channel);
            
            // Check if we have more data to load
            setHasMoreData(processedPriceData.length > 0);
            
            if (shouldAppend && page > 1) {
                // Append new data to existing data
                setChartData(prevData => {
                    // Create a map of existing items by contractAddress to avoid duplicates
                    const existingItems = new Map(
                        prevData.map(item => [item.contractAddress, item])
                    );
                    
                    // Add new items that don't already exist
                    const newItems = [];
                    processedPriceData.forEach(newItem => {
                        if (!existingItems.has(newItem.contractAddress)) {
                            existingItems.set(newItem.contractAddress, newItem);
                            newItems.push(newItem);
                        }
                    });
                    
                    // Subscribe to new tokens
                    if (isPriceConnected && newItems.length > 0) {
                        const channels = newItems
                            .filter(chart => chart.contractAddress && chart.timeframe)
                            .map(chart => `${chart.contractAddress}:${chart.timeframe}`);
                        
                        if (channels.length > 0) {
                            subscribeToChannel(channels);
                            
                            // Also subscribe to live price feeds for real-time updates
                            const liveChannels = channels.map(channel => {
                                const parts = channel.split(':');
                                return `${parts[0]}:live`; // Convert "contract:timeframe" to "contract:live"
                            });
                            
                            subscribeToChannel(liveChannels);
                        }
                    }
                    
                    return Array.from(existingItems.values());
                });
            } else {
                // Replace data completely (for first page or tab change)
                setChartData(processedPriceData);
                
                // Subscribe to the new tokens
                if (isPriceConnected && processedPriceData.length > 0) {
                    const channels = processedPriceData
                        .filter(chart => chart.contractAddress && chart.timeframe)
                        .map(chart => `${chart.contractAddress}:${chart.timeframe}`);
                    
                    if (channels.length > 0) {
                        subscribeToChannel(channels);
                        
                        // Also subscribe to live price feeds for real-time updates
                        const liveChannels = channels.map(channel => {
                            const parts = channel.split(':');
                            return `${parts[0]}:live`; // Convert "contract:timeframe" to "contract:live"
                        });
                        
                        subscribeToChannel(liveChannels);
                    }
                }
            }
            
            setLastUpdate(new Date().toLocaleString());
            setIsApiDataInitialized(true);
        } catch (error) {
            console.error('Error in fetchPriceDataForChannel:', error);
            setError(error.message);
            setIsApiDataInitialized(false);
        } finally {
            setPriceLoading(false);
            setIsLoadingMore(false);
        }
    };
    
    // const fetchHoldersDataForChannel = async (channel) => {
    //     if (channel !== activeChannelRef.current) return;

    //     try {
    //         const channelParam = getChannelsForTab(channel);
    //         const url = `${HOLDERS_DATA_API}?ChannelName='${channelParam}'`;
    //         const holdersResponse = await axios.post(url, {
    //             timeout: 50000,
    //             headers: {
    //                 'Cache-Control': 'no-cache',
    //                 'Pragma': 'no-cache',
    //                 'Content-Type': 'application/json'
    //             }
    //         });

    //         if (channel !== activeChannelRef.current) return;
    //         // console.log("holdersResponse.data")
    //         // console.log(holdersResponse.data)
            
            
    //         const processedHoldersData = processHoldersData(holdersResponse.data);
    //         setHoldersData(processedHoldersData);
    //     } catch (error) {
    //         // console.error(`Error fetching holders data for ${channel}:`, error);
    //         setError(error.message);
    //     }
    // };

    const updateChartStatus = async (channelName, contractAddress) => {
        try {
            setUpdatingStatus(`${channelName}-${contractAddress}`);
            const params = new URLSearchParams({
                channelName: channelName,
                contractAddress: contractAddress
            });

            await axios.post(
                `${UPDATE_STATUS_URL}/UpdateStatus?${params.toString()}`,
                null,
                { headers: { 'Content-Type': 'application/json' } }
            );

            const currentChannel = activeChannelRef.current;
            await Promise.all([
                fetchPriceDataForChannel(currentChannel),
                // fetchHoldersDataForChannel(currentChannel)
            ]);
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update chart status. Please try again.');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const getChannelsForTab = (tabName) => {
        const tabConfig = TAB_CONFIGURATIONS.find(tab => tab.name === tabName);
        return tabConfig ? tabConfig.combinedChannels : tabName;
    };

    const getHoldersChange = (data) => {
        if (!data || data.length < 2) return 0;
        const recentData = data.slice(Math.max(data.length - 1000, 0));
        const firstHolders = recentData[0].value;
        const lastHolders = recentData[recentData.length - 1].value;
        return ((lastHolders - firstHolders) / firstHolders) * 100;
    };

    const getPriceChange = (data) => {
        if (!data || data.length < 2) return 0;
        
        const recentData = data.slice(Math.max(data.length - 1000, 0));
        
        const firstClosingPrice = recentData[0].close;  
        
        const lastClosingPrice = recentData[recentData.length - 1].close;  
        
        return ((lastClosingPrice - firstClosingPrice) / firstClosingPrice) * 100;
    };

    const handleTabSelect = async (selectedTab) => {
        // Clear existing intervals
        Object.keys(intervalsRef.current).forEach(key => {
            if (intervalsRef.current[key]) {
                clearInterval(intervalsRef.current[key]);
                intervalsRef.current[key] = null;
            }
        });
    
        // console.log(`Switching to tab: ${selectedTab}`);
        setActiveChannel(selectedTab);
        activeChannelRef.current = selectedTab;
        
        // Clear existing data
        setChartData([]);
        setHoldersData([]);
        setPriceLoading(true);
        setHoldersLoading(true);
        
        // Reset pagination for this tab if it's the first visit
        if (!paginationByTab[selectedTab]) {
            setPaginationByTab(prev => ({
                ...prev,
                [selectedTab]: 1
            }));
        }
        setHasMoreData(true);
    
        try {
            // Fetch first page of data for this tab
            await fetchPriceDataForChannel(selectedTab, paginationByTab[selectedTab] || 1, false);
            
            // FIXED: Reduce API call frequency to prevent conflicts with WebSocket
            intervalsRef.current.price = setInterval(() => {
                if (activeChannelRef.current === selectedTab) {
                    fetchPriceDataForChannel(selectedTab, 1, false);
                }
            }, 300000); // Increased from 90s to 5 minutes
            
        } catch (error) {
            console.error('Error during tab switch:', error);
            setError(error.message);
        } finally {
            setPriceLoading(false);
            setHoldersLoading(false);
        }
    };




    const handleSettingsChange = (newSettings) => {
        try {
            const priorityFee = parseFloat(newSettings.priorityFee);
            const slippage = parseFloat(newSettings.slippage);
            const bribe = parseFloat(newSettings.bribe);

            if (isNaN(priorityFee) || priorityFee < 0) throw new Error('Invalid priority fee value');
            if (isNaN(slippage) || slippage < 0 || slippage > 100) throw new Error('Invalid slippage value');
            if (isNaN(bribe) || bribe < 0) throw new Error('Invalid bribe value');

            setSettings(newSettings);
            saveSettingsToStorage(newSettings);
        } catch (error) {
            console.error('Settings update failed:', error);
            alert('Invalid settings values. Please check your inputs.');
        }
    };

    useEffect(() => {
        if (connected && publicKey) {
            const fetchWallet = async () => {
                try {
                    const result = await getWallet(publicKey.toString());
                    const tgid = result?.telegramId;
                    if (tgid) {
                        const isNumeric = /^\d+$/.test(String(tgid));
                        const userObj = isNumeric
                            ? { id: String(tgid), username: '' }
                            : { id: '', username: String(String(tgid).replace(/^@/, '')) };
                        setTelegramUser(userObj);
                    }
                } catch (error) {
                    console.error('Error fetching wallet:', error);
                }
            };
            fetchWallet();
        }
    }, [connected, publicKey]);

    useEffect(() => {
        const initializeData = async () => {
            try {
                // Initialize both price and holders data with initial fetch
                await Promise.all([
                    fetchPriceDataForChannel(activeChannel),
                    // fetchHoldersDataForChannel(activeChannel)
                ]);
                
                // FIXED: Reduce API call frequency to prevent conflicts with WebSocket
                intervalsRef.current.price = setInterval(
                    () => fetchPriceDataForChannel(activeChannel),
                    300000  // Increased from 90s to 5 minutes
                );
                
                // Set up interval for holders updates (every 10 seconds)
                // intervalsRef.current.holders = setInterval(
                //     () => fetchHoldersDataForChannel(activeChannel),
                //     10000  // 10 seconds
                // );
            } catch (error) {
                console.error('Error during initialization:', error);
                setError(error.message);
            }
        };
    
        initializeData();
    
        // Cleanup function to clear both intervals when component unmounts
        return () => {
            Object.keys(intervalsRef.current).forEach(key => {
                if (intervalsRef.current[key]) {
                    clearInterval(intervalsRef.current[key]);
                    intervalsRef.current[key] = null;
                }
            });
        };
    }, []);  // Empty dependency array means this runs once on mount

    const renderChartRows = (data, currentTab) => {
        if (!data || data.length === 0) {
            // console.log('No data provided to renderChartRows');
            return null;
        }
        
        // Use all data without channel filtering
        const filteredData = data;
        
        return Array.from({ length: Math.ceil(filteredData.length / 3) }, (_, rowIndex) => {
            const rowItems = filteredData.slice(rowIndex * 3, rowIndex * 3 + 3);
            
            return (
                <Row key={rowIndex} className="chart-row mb-3">
                    {rowItems.map((item, index) => {
                        // Safety check for item.data
                        if (!item.data || !Array.isArray(item.data)) {
                            console.warn('DashboardContent: item.data is null or not an array for:', item.contractAddress);
                            return null;
                        }
                        
                        const lastDataPoint = item.data[item.data.length - 1] || {};
                        const marketCap = lastDataPoint.marketCap || 0;
                        
                        return (
                            <Col key={`${item.contractAddress}-${index}-${item.lastUpdate || 0}`} xs={12} md={4}>
                                <SwipeableChartCard
                                    item={{
                                        contractAddress: item.contractAddress,
                                        channelName: activeChannel, // Just use the active tab as channel name
                                        tokenName: item.tokenName,
                                        tokenSymbol: item.tokenSymbol,
                                        tokenImage: item.tokenImage,
                                        marketCap: marketCap,
                                        description: item.description,
                                        timeframe: item.timeframe,
                                        decimals: item.decimals,
                                        solscanURL: item.solscanURL,
                                        website: item.website,
                                        twitter: item.twitter,
                                        telegram: item.telegram
                                    }}
                                    displayPriceData={item.data}
                                    displayHoldersData={holdersData.find(h => h.contractAddress === item.contractAddress)?.data || []}
                                    updateChartStatus={updateChartStatus}
                                    isUpdating={updatingStatus === `${activeChannel}-${item.contractAddress}`}
                                    copiedStates={copiedStates}
                                    setCopiedStates={setCopiedStates}
                                    copyHandler={copyHandler}
                                    connected={connected}
                                    setChannel={setChannel}
                                    setContractAddress={setContractAddress}
                                    contractAddress={contractAddress}
                                    setTradeType={setTradeType}
                                    setShowBuySellPopup={setShowBuySellPopup}
                                    setShowListingPopup={setShowListingPopup}
                                    setIsLimitMode={setIsLimitMode}
                                    isLimitMode={isLimitMode}
                                    setIsSettingsOpen={setIsSettingsOpen}
                                    getPriceChange={getPriceChange}
                                    solscan_icon={solscan_icon}
                                    web_icon={web_icon}
                                    telegram_icon={telegram_icon}
                                    twitter_icon={twitter_icon}
                                    currentType={currentType}
                                    setCurrentType={setCurrentType}
                                    setTokenInfo={setTokenInfo}
                                    tokenInfo={tokenInfo}
                                    settings={settings}
                                    setSettings={setSettings}
                                    icon={icon}
                                    setIcon={setIcon}
                                    decimals={decimals}
                                    setDecimals={setDecimals}
                                />
                            </Col>
                        );
                    })}
                    {[...Array(3 - rowItems.length)].map((_, index) => (
                        <Col key={`placeholder-${index}`} xs={12} md={4}>
                            <div className="chart-card invisible" />
                        </Col>
                    ))}
                </Row>
            );
        });
    };
    // Main render
    return (
        <div className="dashboard">
            <Container fluid className="py-4">
                {/* Header Section */}
                <Row className="mb-4">
                    <Col>
                        <div className="header-card">
                            <div className="d-flex justify-content-between align-items-center">
                                <h1 className="dashboard-title">Butter Terminal Dashboard</h1>
                                <div className="d-flex flex-column align-items-center flex-grow-1 justify-content-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
                                    <WebSocketStatus isConnected={isPriceConnected} error={wsError} />
                                    {lastUpdate && (
                                        <div className="last-update">
                                            <p>Price Data Updated: {lastUpdate}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="d-flex align-items-center gap-3">
                                    {butterWalletCredentials && (
                                        <button
                                            className='rounded bg-[#EEAB00] text-black p-2.5 hover:opacity-90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed'
                                            onClick={onConnectTelegram}
                                            title="Connect Telegram"
                                            disabled={Boolean(butterWalletCredentials?.telegram_id != null)}
                                        >
                                            {(() => {
                                                const tgid = butterWalletCredentials?.telegram_id;
                                                if (tgid) {
                                                    const isNumeric = /^\d+$/.test(String(tgid));
                                                    return isNumeric ? `ID: ${tgid}` : `@${String(tgid).replace(/^@/, '')}`;
                                                }
                                                if (telegramUser?.username) return `@${telegramUser.username}`;
                                                if (telegramUser?.id) return `ID: ${telegramUser.id}`;
                                                return 'Connect Telegram';
                                            })()}
                                        </button>
                                    )}
                                    <button
                                        className='rounded bg-slate-600 text-white p-2.5 hover:bg-slate-500 transition-colors'
                                        onClick={() => {
                                            if (!connected) {
                                                alert('Please connect your wallet first');
                                                return;
                                            }
                                            navigate('/account');
                                        }}
                                        disabled={!connected}
                                    >
                                        Account
                                    </button>

                                    {!butterWalletCredentials?.publickey ? (
                                        <button
                                            className='rounded bg-slate-600 text-white p-2.5 Create__Butter__Wallet'
                                            onClick={() => {
                                                if (!connected) {
                                                    alert('Please connect your wallet');
                                                    return;
                                                }
                                                navigate('/butter-wallet');
                                            }}
                                            disabled={!connected}
                                        >
                                            Create Butter Wallet
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowListingPopup(true)}
                                            className="flex items-center justify-center w-10 h-10 rounded bg-slate-600 hover:bg-slate-500 transition-colors"
                                            title="View Holdings"
                                        >
                                            <svg 
                                                className="w-5 h-5 text-white" 
                                                viewBox="0 0 24 24" 
                                                fill="none" 
                                                stroke="currentColor" 
                                                strokeWidth="2"
                                            >
                                                <path d="M21 12V7H5C4.46957 7 3.96086 6.78929 3.58579 6.41421C3.21071 6.03914 3 5.53043 3 5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H21V7" />
                                                <path d="M3 5V19C3 19.5304 3.21071 20.0391 3.58579 20.4142C3.96086 20.7893 4.46957 21 5 21H21V17" />
                                                <circle cx="19" cy="17" r="2" />
                                                <circle cx="19" cy="7" r="2" />
                                            </svg>
                                        </button>
                                    )}
                                    <WalletMultiButton />
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>

                

                {/* Tabs Section */}
                <div className="tabs-section">
                <Tabs 
                    activeKey={activeChannel}
                    onSelect={handleTabSelect}
                    className="mb-4"
                >
                {[...BASE_TAB_CONFIGURATIONS, ...chatTabs].map(tab => (
                <Tab eventKey={tab.name} title={tab.name} key={tab.name}>
                    <div className="charts-container">
                        {/* Just pass the chartData directly without filtering by channels */}
                        {renderChartRows(chartData, tab)}
                    </div>
                    
                    {/* Load More button */}

                    {/*{hasMoreData && !isLoadingMore && chartData.length >= 20 && (
                    <div className="text-center py-4 mb-4">
                        <button 
                            className="px-4 py-2 bg-[#00ff88] text-black font-bold rounded-lg hover:opacity-90 transition-opacity"
                            onClick={() => {
                                const page = paginationByTab[activeChannel] || 1;
                                const nextPage = page + 1;
                                
                                
                                setPaginationByTab(prev => ({
                                    ...prev,
                                    [activeChannel]: nextPage
                                }));
                                
                                fetchPriceDataForChannel(activeChannel, nextPage, true);
                            }}
                            disabled={priceLoading || isLoadingMore}
                        >
                            Load More
                        </button>
                    </div>
                )}*/}
                    
                    {isLoadingMore && (
                        <div className="text-center py-4">
                            <Spinner size="small" message="Loading more tokens..." />
                        </div>
                    )}
                </Tab>
            ))}
                </Tabs>
            </div>
                {/* Loading State */}
                {priceLoading && holdersLoading && chartData.length === 0 && holdersData.length === 0 && (
                    <Row>
                        <Col className="text-center py-5">
                            <Spinner size="large" message="Fetching data..." />
                        </Col>
                    </Row>
                )}

                {/* Processing Overlay */}
                {isProcessing && !holdersLoading && !priceLoading && (
                    <div className="processing-overlay">
                        <div className="processing-content">
                            <Spinner size="large" message="Processing data..." />
                        </div>
                    </div>
                )}
            </Container>

            {/* Modal Components */}
            <BuyAndSellPopup
                isOpen={showBuySellPopup}
                onClose={() => setShowBuySellPopup(false)}
                contractAddress={contractAddress}
                setIsSettingsOpen={setIsSettingsOpen}
                setIsLimitMode={setIsLimitMode}
                isLimitMode={isLimitMode}
                channel={channel}
                type={tradeType}
                currentType={currentType}
                setCurrentType={setCurrentType}
                settings={settings}
                setSettings={setSettings}
                icon={icon}
                decimals={decimals}
                setDecimals={setDecimals}
                {...tokenInfo}
            />

            {showListingPopup && (
                <TokenHoldings 
                    isOpen={showListingPopup}
                    onClose={() => setShowListingPopup(false)}
                    contractAddress={contractAddress}
                    channel={channel}
                    settings={settings}
                    copiedStates={copiedStates}
                    setCopiedStates={setCopiedStates}
                    copyHandler={copyHandler}
                />
            )}

            <TradeSettings
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                onSettingsChange={handleSettingsChange}
                settings={settings}
                setSettings={setSettings}
                publicKey={publicKey}
            />

            {isLimitMode && (
                <LimitOrder
                    isOpen={isLimitMode}
                    onClose={() => setIsLimitMode(false)}
                    tokenSymbol={tokenInfo.tokenSymbol}
                    tokenIcon={tokenInfo.tokenIcon}
                    type={tradeType}
                    solIcon={sol_Icon}
                    setIsSettingsOpen={setIsSettingsOpen}
                    isLimitMode={isLimitMode}
                    setIsLimitMode={setIsLimitMode}
                    setShowBuySellPopup={setShowBuySellPopup}
                    currentType={currentType}
                    setCurrentType={setCurrentType}
                />
            )}
            
            {/* Footer */}
            <Footer />
        </div>
    );
};
export default DashboardContent;

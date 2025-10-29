// usePriceWebSocket.js
import { useState, useEffect, useRef, useCallback } from 'react';

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

// Helper function to log updates with timestamps
const logUpdate = (message, data) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`, data);
};

// 🔧 timeframe helpers (used to place the running candle correctly)
const tfToSeconds = (tf) => {
    if (!tf) return 60;
    const unit = tf.slice(-1);
    const val = parseInt(tf.slice(0, -1), 10) || 1;
    if (unit === 's') return val;
    if (unit === 'm') return val * 60;
    if (unit === 'h') return val * 3600;
    if (unit === 'd') return val * 86400;
    return 60;
};

const usePriceWebSocket = (initialChannel, onPriceUpdate) => {
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [subscriptionStatus, setSubscriptionStatus] = useState({
        active: false,
        count: 0,
        contracts: [],
        lastSubscribed: null,
        lastReceived: null
    });
    
    const socketRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);
    const reconnectAttemptsRef = useRef(0);
    const currentChannelRef = useRef(initialChannel);
    const isConnectingRef = useRef(false);
    const urlIndexRef = useRef(0);
    
    const activeSubscriptionsRef = useRef(new Set());
    
    // For data timeout detection
    const lastMessageTimeRef = useRef(Date.now());
    const dataTimeoutCheckerRef = useRef(null);
    
    // For logging and statistics - with memory optimization
    const updateStatsRef = useRef({
        totalUpdates: 0,
        byContract: {},
        byTimeframe: {},
        lastUpdate: null,
        updateHistory: [] // Limited to last 10 updates to save memory
    });
    
    const tokenTimeframesRef = useRef(new Map());
    
    // Define WebSocket URLs to try - moved outside function to persist between reconnects
    const wsUrlsRef = useRef([
        'wss://api.buttertrade.xyz/OHLCV/ws',
        'wss://api.buttertrade.xyz/ws',
        // 'wss://api.buttertrade.xyz/v1/ws',
        // 'wss://api.buttertrade.xyz/v2/ws'
    ]);

    const registerTokenTimeframe = useCallback((contractAddress, timeframe, channelName) => {
        tokenTimeframesRef.current.set(contractAddress, { 
            timeframe, 
            channelName 
        });
    }, []);

    const subscribeToChannel = useCallback((channel) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not ready for subscription');
            return;
        }
    
        // Handle both single channels and arrays of channels
        const channels = Array.isArray(channel) ? channel : [channel];
        
        // Filter out already subscribed channels
        const newChannels = channels.filter(ch => !activeSubscriptionsRef.current.has(ch));
        
        if (newChannels.length === 0) {
            return;
        }
        
        try {
            // Send all subscription requests in a single message
            const subscriptionMessage = {
                action: 'subscribeMany',
                channels: newChannels
            };
            
            socketRef.current.send(JSON.stringify(subscriptionMessage));
            
            // Add all channels to active subscriptions
            newChannels.forEach(ch => {
                activeSubscriptionsRef.current.add(ch);
            });
            
            // Update current channel to the first one
            if (newChannels.length > 0) {
                currentChannelRef.current = newChannels[0];
            }
        } catch (err) {
            console.error('Batch subscription error:', err);
            setError(`Subscription error: ${err.message}`);
        }
    }, []);
    
    const unsubscribeFromChannel = useCallback((channel) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not ready for unsubscription');
            return;
        }
    
        // Handle both single channels and arrays of channels
        const channels = Array.isArray(channel) ? channel : [channel];
        
        // Filter to only channels that are currently subscribed
        const subscribedChannels = channels.filter(ch => activeSubscriptionsRef.current.has(ch));
        
        if (subscribedChannels.length === 0) {
            return;
        }
        
        try {
            // Send all unsubscription requests in a single message
            const unsubscriptionMessage = {
                action: 'unsubscribeMany',
                channels: subscribedChannels
            };
            
            socketRef.current.send(JSON.stringify(unsubscriptionMessage));
            
            // Remove all channels from active subscriptions
            subscribedChannels.forEach(ch => {
                activeSubscriptionsRef.current.delete(ch);
            });
        } catch (err) {
            console.error('Batch unsubscription error:', err);
            setError(`Unsubscription error: ${err.message}`);
        }
    }, []);
    
    const subscribeToContract = useCallback((contractAddress, timeframe) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not ready for contract subscription');
            return false;
        }

        // We need to use {contract}:{timeframe}
        let channelName;
        if (contractAddress === timeframe || !timeframe) {
            channelName = contractAddress;
        } else {
            channelName = `${contractAddress}:${timeframe}`;
        }
        
        // Register the contract and timeframe
        registerTokenTimeframe(contractAddress, timeframe, channelName);
        
        try {
            const subscriptionMessage = {
                action: 'subscribeMany',
                channels: [channelName]
            };
            
            socketRef.current.send(JSON.stringify(subscriptionMessage));
            
            activeSubscriptionsRef.current.add(channelName);
            currentChannelRef.current = channelName;
            
            // Update subscription status
            setSubscriptionStatus(prev => {
                const contracts = Array.from(new Set([...prev.contracts, contractAddress]));
                return {
                    active: true,
                    count: activeSubscriptionsRef.current.size,
                    contracts,
                    lastSubscribed: new Date().toISOString(),
                    lastReceived: prev.lastReceived
                };
            });
            
            return true;
        } catch (err) {
            console.error('Contract subscription error:', err);
            setError(`Contract subscription error: ${err.message}`);
            return false;
        }
    }, [registerTokenTimeframe]);
    
    // Function to subscribe to multiple contracts at once
    const subscribeToContracts = useCallback((contracts, timeframes = ['1m']) => {
        if (!Array.isArray(contracts) || contracts.length === 0) {
            console.warn('No contracts provided for subscription');
            return { success: false, subscribed: 0, total: 0 };
        }
        
        if (!Array.isArray(timeframes)) {
            timeframes = [timeframes];
        }
        
        // Generate all channel names
        const channels = [];
        contracts.forEach(contract => {
            timeframes.forEach(timeframe => {
                const channelName = `${contract}:${timeframe}`;
                channels.push(channelName);
                
                // Register the contract and timeframe
                registerTokenTimeframe(contract, timeframe, channelName);
            });
        });
        
        // Use batch subscription
        subscribeToChannel(channels);
        
        return {
            success: true,
            subscribed: channels.length,
            total: channels.length
        };
    }, [subscribeToChannel, registerTokenTimeframe]);

    // Function to subscribe to a channel that provides multiple tokens (like pumpswap)
    const subscribeToTokenChannel = useCallback((channelName, maxTokens = 50) => {
        if (!socketRef.current || socketRef.current.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket not ready for channel subscription');
            return false;
        }

        try {
            const subscriptionMessage = {
                action: 'subscribeMany',
                channels: [channelName],
                maxTokens: maxTokens // Limit the number of tokens to prevent memory overload
            };
            
            socketRef.current.send(JSON.stringify(subscriptionMessage));
            activeSubscriptionsRef.current.add(channelName);
            currentChannelRef.current = channelName;
            
            return true;
        } catch (err) {
            console.error('Channel subscription error:', err);
            setError(`Channel subscription error: ${err.message}`);
            return false;
        }
    }, []);

    // Function to track update statistics - optimized for memory usage
    const trackUpdate = useCallback((data) => {
        const stats = updateStatsRef.current;
        stats.totalUpdates++;
        
        // Track by contract - limit to most recent 50 contracts
        const contract = data.contractAddress || 'unknown';
        if (!stats.byContract[contract]) {
            stats.byContract[contract] = 0;
            
            // Memory optimization: limit number of tracked contracts
            const contractKeys = Object.keys(stats.byContract);
            if (contractKeys.length > 50) {
                let minCount = Infinity;
                let minKey = null;
                contractKeys.forEach(key => {
                    if (stats.byContract[key] < minCount) {
                        minCount = stats.byContract[key];
                        minKey = key;
                    }
                });
                if (minKey) delete stats.byContract[minKey];
            }
        }
        stats.byContract[contract]++;
        
        const timeframe = data.timeframe || 'unknown';
        if (!stats.byTimeframe[timeframe]) {
            stats.byTimeframe[timeframe] = 0;
        }
        stats.byTimeframe[timeframe]++;
        
        stats.lastUpdate = new Date();
        
        stats.updateHistory.unshift({
            time: stats.lastUpdate,
            contract,
            timeframe,
            price: data.close
        });
        
        if (stats.updateHistory.length > 10) {
            stats.updateHistory.pop();
        }
        
        if (stats.totalUpdates % 100 === 0) {
            logUpdate('WebSocket update statistics', {
                totalUpdates: stats.totalUpdates,
                activeContracts: Object.keys(stats.byContract).length,
                updatesPerMinute: calculateUpdatesPerMinute(stats.updateHistory)
            });
        }
    }, []);
    
    // Calculate updates per minute based on history
    const calculateUpdatesPerMinute = (history) => {
        if (history.length < 2) return 0;
        
        const now = new Date();
        const oneMinuteAgo = new Date(now - 60000);
        
        const recentUpdates = history.filter(update => update.time > oneMinuteAgo);
        return recentUpdates.length;
    };

    const processMessage = useCallback((data) => {
        try {
            if (!onPriceUpdate) {
                console.error('onPriceUpdate callback is undefined!');
                return;
            }
            if (typeof data === 'string' && data.startsWith('Message')) return;
            
            let message;
            try {
                message = JSON.parse(data);
            } catch (err) {
                console.error('Failed to parse message:', data);
                return;
            }
            
            // Handle welcome message
            if (message.type === 'connected') {
                // Request live price updates for all subscribed tokens
                if (activeSubscriptionsRef.current.size > 0) {
                    const channels = Array.from(activeSubscriptionsRef.current);
                    channels.forEach(channel => {
                        // Try to subscribe to live price feed for each token
                        const livePriceChannel = channel.replace(/:.*$/, ':live');
                        if (!activeSubscriptionsRef.current.has(livePriceChannel)) {
                            subscribeToChannel(livePriceChannel);
                        }
                    });
                }
                
                return;
            }

            // ✅ FIXED: Robust handling for Redis "current/previous" payload
            // This handles real-time OHLC updates where current candle values are updated in real-time
            if (message['current:open'] && message['current:close'] && message.contractAddress) {
                const tf = message.timeframe || '1m';
                const tfSeconds = tfToSeconds(tf);

                // Use the actual timestamps from the message, not calculated ones
                const prevTime = Math.floor(new Date(message['previous:opentime']).getTime() / 1000);
                const currTime = Math.floor(new Date(message['current:opentime']).getTime() / 1000);
                
                // Validate timestamps
                if (isNaN(prevTime) || isNaN(currTime)) {
                    // console.warn('Invalid timestamps in WebSocket message:', {
                    //     prevTime: message['previous:opentime'],
                    //     currTime: message['current:opentime']
                    // });
                    return;
                }
                
                // Calculate proper timeframe boundaries using the actual timestamps
                const getTimeframeStart = (timestamp, timeframe) => {
                    const duration = tfToSeconds(timeframe);
                    return Math.floor(timestamp / duration) * duration;
                };

                // Build previous as COMPLETE bar with proper timeframe alignment
                const previousCandle = {
                    time: getTimeframeStart(prevTime, tf),
                    open: parseFloat(message['previous:open']),
                    high: parseFloat(message['previous:high']),
                    low: parseFloat(message['previous:low']),
                    close: parseFloat(message['previous:close']),
                    volume: {
                        dollar: parseFloat(message['previous:volume'] || 0),
                        sol: parseFloat(message['previous:volume'] || 0) / 100, // Estimate SOL volume
                        buy: parseFloat(message['previous:volume'] || 0) / 200, // Estimate buy volume
                        sell: parseFloat(message['previous:volume'] || 0) / 200 // Estimate sell volume
                    },
                    marketCap: parseFloat(message['previous:marketcap']),
                    isComplete: true,
                    contractAddress: message.contractAddress,
                    channelName: message['previous:channel'],
                    timeframe: tf
                };

                // Current candle should use the actual current timestamp, not calculated
                // For real-time updates, we need to ensure OHLC values are properly calculated
                const currentOpen = parseFloat(message['current:open']);
                const currentHigh = parseFloat(message['current:high']);
                const currentLow = parseFloat(message['current:low']);
                const currentClose = parseFloat(message['current:close']);
                
                // Ensure high is the maximum of open and close for real-time updates
                const realTimeHigh = Math.max(currentOpen, currentClose, currentHigh);
                // Ensure low is the minimum of open and close for real-time updates
                const realTimeLow = Math.min(currentOpen, currentClose, currentLow);
                
                const currentCandle = {
                    time: getTimeframeStart(currTime, tf),
                    open: currentOpen,
                    high: realTimeHigh,
                    low: realTimeLow,
                    close: currentClose,
                    volume: {
                        dollar: parseFloat(message['current:volume'] || 0),
                        sol: parseFloat(message['current:volume'] || 0) / 100, // Estimate SOL volume
                        buy: parseFloat(message['current:volume'] || 0) / 200, // Estimate buy volume
                        sell: parseFloat(message['current:volume'] || 0) / 200 // Estimate sell volume
                    },
                    marketCap: parseFloat(message['current:marketcap']),
                    isComplete: false, // running
                    contractAddress: message.contractAddress,
                    channelName: message['current:channel'],
                    timeframe: tf
                };

                // Validate candle data
                const validateCandle = (candle, name) => {
                    if (isNaN(candle.time) || isNaN(candle.close) || candle.time <= 0 || candle.close <= 0) {
                        console.warn(`Invalid ${name} candle data:`, candle);
                        return false;
                    }
                    return true;
                };
                
                if (!validateCandle(previousCandle, 'previous') || !validateCandle(currentCandle, 'current')) {
                    return;
                }

                // Emit in the right order
                onPriceUpdate(previousCandle);
                onPriceUpdate(currentCandle);

                try {
                    window.dispatchEvent(new CustomEvent('priceUpdate', { detail: previousCandle }));
                    window.dispatchEvent(new CustomEvent('priceUpdate', { detail: currentCandle }));
                } catch (error) { 
                    console.error('❌ WebSocket: Error dispatching custom events:', error);
                }

                return; // Exit early: handled
            }
            
            // Handle the old WebSocket message format
            if (message.table === 'ohlc_price_1_hyper' && message.action === 'UPDATE') {
                const priceData = message.updated_row;
                const timestamp = new Date(priceData.timestamp);
                const timeValue = Math.floor(timestamp.getTime() / 1000);
                if (isNaN(timeValue) || timeValue <= 0) return;
                
                // Determine isComplete based on data source and prefix
                let isComplete = true; // Default for API data
                
                // Check if this is WebSocket data with prefix indicators
                if (priceData.channelname && priceData.channelname.includes('current')) {
                    isComplete = false; // Current prefix = running candle
                } else if (priceData.channelname && priceData.channelname.includes('previous')) {
                    isComplete = true; // Previous prefix = complete candle
                } else if (priceData.isComplete !== undefined) {
                    isComplete = priceData.isComplete; // Use explicit value if provided
                }
                
                // FIXED: Add validation to prevent invalid price data
                const open = parseFloat(priceData.open);
                const high = parseFloat(priceData.high);
                const low = parseFloat(priceData.low);
                const close = parseFloat(priceData.close);
                
                // For real-time updates, ensure OHLC values are properly calculated
                const realTimeHigh = Math.max(open, close, high);
                const realTimeLow = Math.min(open, close, low);
                
                // Validate price data
                if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || 
                    open <= 0 || high <= 0 || low <= 0 || close <= 0) {
                    console.warn('Invalid price data received, skipping:', priceData);
                    return;
                }
                
                // FIXED: Use proper timeframe calculation for consistent time alignment
                const timeframe = priceData.timeframe || '1m';
                const tfSeconds = tfToSeconds(timeframe);
                const timeframeStart = Math.floor(timeValue / tfSeconds) * tfSeconds;
                
                const transformedData = {
                    time: timeframeStart, // Use aligned timeframe start time
                    open: open,
                    high: realTimeHigh, // Use real-time calculated high
                    low: realTimeLow,   // Use real-time calculated low
                    close: close,
                    marketCap: parseFloat(priceData.marketcap) || 0,
                    isComplete: isComplete,
                    contractAddress: priceData.contractaddress,
                    channelName: priceData.channelname,
                    timeframe: timeframe,
                    volume: {
                        sol: parseFloat(priceData.solvolume) || 0,
                        dollar: parseFloat(priceData.dollarvolume) || 0,
                        buy: parseFloat(priceData.buyvolume) || 0,
                        sell: parseFloat(priceData.sellvolume) || 0
                    }
                };

                
                trackUpdate(transformedData);
                setSubscriptionStatus(prev => ({ ...prev, lastReceived: new Date().toISOString() }));
                onPriceUpdate(transformedData);
                try {
                    window.dispatchEvent(new CustomEvent('priceUpdate', { detail: transformedData }));
                } catch (error) {}
            } 
            // Handle standard OHLCV format from your API
            else if (message.contractAddress || message.contract) {
                const contractAddress = message.contractAddress || message.contract;
                const timeframe = message.timeframe || message.tf || '1m';
                
                // Determine isComplete based on data source and prefix
                let isComplete = true; // Default for API data
                
                // Check for prefix indicators in channel name or message properties
                const channelName = message.channelName || `${contractAddress}:${timeframe}`;
                if (channelName.includes('current') || message.type === 'current') {
                    isComplete = false; // Current prefix = running candle
                } else if (channelName.includes('previous') || message.type === 'previous') {
                    isComplete = true; // Previous prefix = complete candle
                } else if (message.isComplete !== undefined) {
                    isComplete = message.isComplete; // Use explicit value if provided
                }
                
                // FIXED: Add validation to prevent invalid price data
                const open = parseFloat(message.open || 0);
                const high = parseFloat(message.high || 0);
                const low = parseFloat(message.low || 0);
                const close = parseFloat(message.close || 0);
                
                // For real-time updates, ensure OHLC values are properly calculated
                const realTimeHigh = Math.max(open, close, high);
                const realTimeLow = Math.min(open, close, low);
                
                // Validate price data
                if (isNaN(open) || isNaN(high) || isNaN(low) || isNaN(close) || 
                    open <= 0 || high <= 0 || low <= 0 || close <= 0) {
                    console.warn('Invalid price data received, skipping:', message);
                    return;
                }
                
                // FIXED: Use proper timeframe calculation for consistent time alignment
                const rawTime = message.time ? Math.floor(new Date(message.time).getTime() / 1000) : Math.floor(Date.now() / 1000);
                const tfSeconds = tfToSeconds(timeframe);
                const timeframeStart = Math.floor(rawTime / tfSeconds) * tfSeconds;
                
                const transformedData = {
                    time: timeframeStart, // Use aligned timeframe start time
                    open: open,
                    high: realTimeHigh, // Use real-time calculated high
                    low: realTimeLow,   // Use real-time calculated low
                    close: close,
                    marketCap: parseFloat(message.marketCap || message.market_cap || 0),
                    isComplete: isComplete,
                    contractAddress: contractAddress,
                    channelName: channelName,
                    timeframe: timeframe,
                    volume: {
                        sol: parseFloat(message.volume?.sol || message.solVolume || 0),
                        dollar: parseFloat(message.volume?.dollar || message.dollarVolume || 0),
                        buy: parseFloat(message.volume?.buy || message.buyVolume || 0),
                        sell: parseFloat(message.volume?.sell || message.sellVolume || 0)
                    }
                };
                
                
                trackUpdate(transformedData);
                setSubscriptionStatus(prev => ({ ...prev, lastReceived: new Date().toISOString() }));
                onPriceUpdate(transformedData);
                try {
                    window.dispatchEvent(new CustomEvent('priceUpdate', { detail: transformedData }));
                } catch (error) {}
            }
            // Handle pong message
            else if (message.type === 'pong' || message.action === 'pong') {
                return;
            }
            
            // Handle live price updates
            else if (message.type === 'price' || message.action === 'price' || message.live === true) {
                
                if (message.contractAddress && message.price !== undefined) {
                    const currentTime = Math.floor(Date.now() / 1000);
                    const timeframe = message.timeframe || '1m';
                    const tfSeconds = tfToSeconds(timeframe);
                    const timeframeStart = Math.floor(currentTime / tfSeconds) * tfSeconds;
                    
                    // For live updates, we need to maintain the original open price
                    // and update high/low based on the current price
                    const currentPrice = parseFloat(message.price);
                    const openPrice = message.open ? parseFloat(message.open) : currentPrice;
                    const highPrice = message.high ? parseFloat(message.high) : Math.max(openPrice, currentPrice);
                    const lowPrice = message.low ? parseFloat(message.low) : Math.min(openPrice, currentPrice);
                    
                    const livePriceData = {
                        time: timeframeStart,
                        open: openPrice,
                        high: highPrice,
                        low: lowPrice,
                        close: currentPrice,
                        volume: {
                            dollar: message.volume?.dollar || message.volume || 0,
                            sol: message.volume?.sol || (message.volume || 0) / 100,
                            buy: message.volume?.buy || (message.volume || 0) / 200,
                            sell: message.volume?.sell || (message.volume || 0) / 200
                        },
                        marketCap: message.marketCap || 0,
                        isComplete: false, // This is a live price update
                        contractAddress: message.contractAddress,
                        timeframe: timeframe
                    };
                    
                    
                    onPriceUpdate(livePriceData);
                    
                    try {
                        window.dispatchEvent(new CustomEvent('priceUpdate', { detail: livePriceData }));
                    } catch (error) { /* noop */ }
                }
                return;
            }
            // Handle direct price updates (generic)
            else if (message.price || message.o || message.open) {
                const channelParts = currentChannelRef.current.split(':');
                const contractFromChannel = channelParts[0] === 'ohlcv' ? channelParts[1] : channelParts[0];
                const contractAddress = message.contractAddress || message.contract || 
                                        message.address || message.token || contractFromChannel;
                
                const timeframeFromChannel = channelParts[0] === 'ohlcv' ? channelParts[2] : channelParts[1];
                const timeframe = message.timeframe || message.tf || 
                                  message.interval || timeframeFromChannel || '1m';
                
                // Determine isComplete based on data source and prefix
                let isComplete = true; // Default for API data
                const channelName = message.channelName || `${contractAddress}:${timeframe}`;
                
                if (channelName.includes('current') || message.type === 'current') {
                    isComplete = false; // Current prefix = running candle
                } else if (channelName.includes('previous') || message.type === 'previous') {
                    isComplete = true; // Previous prefix = complete candle
                } else if (message.isComplete !== undefined) {
                    isComplete = message.isComplete; // Use explicit value if provided
                }
                
                const transformedData = {
                    time: message.time || message.t ? 
                          Math.floor(new Date(message.time || message.t).getTime() / 1000) : 
                          Math.floor(Date.now() / 1000),
                    open: parseFloat(message.open || message.o || message.price || 0),
                    high: parseFloat(message.high || message.h || message.price || 0),
                    low:  parseFloat(message.low  || message.l || message.price || 0),
                    close:parseFloat(message.close || message.c || message.price || 0),
                    marketCap: parseFloat(message.marketCap || message.market_cap || 0),
                    isComplete: isComplete,
                    contractAddress: contractAddress,
                    channelName: channelName,
                    timeframe: timeframe,
                    volume: {
                        sol: parseFloat(message.volume?.sol || message.volume || message.v || 0),
                        dollar: parseFloat(message.volume?.dollar || message.dollarVolume || 0),
                        buy: parseFloat(message.volume?.buy || message.buyVolume || 0),
                        sell: parseFloat(message.volume?.sell || message.sellVolume || 0)
                    }
                };
                
                
                trackUpdate(transformedData);
                setSubscriptionStatus(prev => ({ ...prev, lastReceived: new Date().toISOString() }));
                onPriceUpdate(transformedData);
                try {
                    window.dispatchEvent(new CustomEvent('priceUpdate', { detail: transformedData }));
                } catch (error) {}
            }
            // Handle Redis-like nested formats
            else if (message.state || message.data) {
                let dataObj = message;
                
                if (message.state && typeof message.state === 'object') {
                    dataObj = message.state;
                } else if (message.state && typeof message.state === 'string') {
                    try { dataObj = JSON.parse(message.state); } catch {}
                } else if (message.data && typeof message.data === 'object') {
                    dataObj = message.data;
                } else if (message.data && typeof message.data === 'string') {
                    try { dataObj = JSON.parse(message.data); } catch {}
                }
                
                const channelParts = currentChannelRef.current.split(':');
                const contractFromChannel = channelParts[0] === 'ohlcv' ? channelParts[1] : channelParts[0];
                const contractAddress = message.contract || dataObj.contract || dataObj.contractAddress || contractFromChannel;
                
                const timeframeFromChannel = channelParts[0] === 'ohlcv' ? channelParts[2] : channelParts[1];
                const timeframe = message.timeframe || message.tf || dataObj.timeframe || dataObj.tf || timeframeFromChannel || '1m';
                
                // Determine isComplete based on data source and prefix
                let isComplete = true; // Default for API data
                const channelName = `${contractAddress}:${timeframe}`;
                
                if (channelName.includes('current') || dataObj.type === 'current' || message.type === 'current') {
                    isComplete = false; // Current prefix = running candle
                } else if (channelName.includes('previous') || dataObj.type === 'previous' || message.type === 'previous') {
                    isComplete = true; // Previous prefix = complete candle
                } else if (dataObj.isComplete !== undefined) {
                    isComplete = dataObj.isComplete; // Use explicit value if provided
                }
                
                const transformedData = {
                    time: dataObj.time || dataObj.timestamp ? 
                          Math.floor(new Date(dataObj.time || dataObj.timestamp).getTime() / 1000) : 
                          Math.floor(Date.now() / 1000),
                    open: parseFloat(dataObj.open || dataObj.o || 0),
                    high: parseFloat(dataObj.high || dataObj.h || 0),
                    low:  parseFloat(dataObj.low  || dataObj.l || 0),
                    close:parseFloat(dataObj.close || dataObj.c || 0),
                    marketCap: parseFloat(dataObj.marketCap || dataObj.market_cap || 0),
                    isComplete: isComplete,
                    contractAddress: contractAddress,
                    channelName: channelName,
                    timeframe: timeframe,
                    volume: {
                        sol: parseFloat(dataObj.volume?.sol || dataObj.solVolume || dataObj.sol_volume || 0),
                        dollar: parseFloat(dataObj.volume?.dollar || dataObj.dollarVolume || dataObj.dollar_volume || 0),
                        buy: parseFloat(dataObj.volume?.buy || dataObj.buyVolume || dataObj.buy_volume || 0),
                        sell: parseFloat(dataObj.volume?.sell || dataObj.sellVolume || dataObj.sell_volume || 0)
                    }
                };
                
                
                trackUpdate(transformedData);
                setSubscriptionStatus(prev => ({ ...prev, lastReceived: new Date().toISOString() }));
                onPriceUpdate(transformedData);
                try {
                    window.dispatchEvent(new CustomEvent('priceUpdate', { detail: transformedData }));
                } catch (error) {}
            }
            // Unknown message format
            else {
                console.log('Unknown message format:', Object.keys(message));
                const possibleKeys = ['data', 'payload', 'message', 'result', 'value', 'state'];
                for (const key of possibleKeys) {
                    if (message[key] && typeof message[key] === 'object') {
                        const nestedData = message[key];
                        if (nestedData.open !== undefined || nestedData.close !== undefined) {
                            const channelParts = currentChannelRef.current.split(':');
                            const contractFromChannel = channelParts[0] === 'ohlcv' ? channelParts[1] : channelParts[0];
                            const contractAddress = nestedData.contractAddress || nestedData.contract || contractFromChannel;
                            const timeframeFromChannel = channelParts[0] === 'ohlcv' ? channelParts[2] : channelParts[1];
                            const timeframe = nestedData.timeframe || nestedData.tf || timeframeFromChannel || '1m';
                            
                            // Determine isComplete based on data source and prefix
                            let isComplete = true; // Default for API data
                            const channelName = `${contractAddress}:${timeframe}`;
                            
                            if (channelName.includes('current') || nestedData.type === 'current') {
                                isComplete = false; // Current prefix = running candle
                            } else if (channelName.includes('previous') || nestedData.type === 'previous') {
                                isComplete = true; // Previous prefix = complete candle
                            } else if (nestedData.isComplete !== undefined) {
                                isComplete = nestedData.isComplete; // Use explicit value if provided
                            }
                            
                            const transformedData = {
                                time: nestedData.time || nestedData.timestamp ? 
                                      Math.floor(new Date(nestedData.time || nestedData.timestamp).getTime() / 1000) : 
                                      Math.floor(Date.now() / 1000),
                                open: parseFloat(nestedData.open || nestedData.o || 0),
                                high: parseFloat(nestedData.high || nestedData.h || 0),
                                low:  parseFloat(nestedData.low  || nestedData.l || 0),
                                close:parseFloat(nestedData.close || nestedData.c || 0),
                                marketCap: parseFloat(nestedData.marketCap || nestedData.market_cap || 0),
                                isComplete: isComplete,
                                contractAddress: contractAddress,
                                channelName: channelName,
                                timeframe: timeframe,
                                volume: {
                                    sol: parseFloat(nestedData.volume?.sol || nestedData.volume || 0),
                                    dollar: parseFloat(nestedData.volume?.dollar || nestedData.dollarVolume || 0),
                                    buy: parseFloat(nestedData.volume?.buy || nestedData.buyVolume || 0),
                                    sell: parseFloat(nestedData.volume?.sell || nestedData.sellVolume || 0)
                                }
                            };
                            
                            logUpdate('Price update received', {
                                contract: transformedData.contractAddress,
                                timeframe: transformedData.timeframe,
                                price: transformedData.close,
                                time: new Date(transformedData.time * 1000).toISOString()
                            });
                            
                            trackUpdate(transformedData);
                            setSubscriptionStatus(prev => ({ ...prev, lastReceived: new Date().toISOString() }));
                            onPriceUpdate(transformedData);
                            try {
                                window.dispatchEvent(new CustomEvent('priceUpdate', { detail: transformedData }));
                            } catch (error) {}
                        }
                    } else if (message[key] && typeof message[key] === 'string') {
                        try { JSON.parse(message[key]); } catch {}
                    }
                }
            }
        } catch (err) {
            console.error('Error processing message:', err);
            if (typeof data === 'string') {
                console.error('Raw message:', data.slice(0, 200));
            }
        }
    }, [onPriceUpdate, trackUpdate]);

    const cleanupWebSocket = useCallback(() => {
        if (socketRef.current) {
            const channels = Array.from(activeSubscriptionsRef.current);
            if (channels.length > 0) {
                try {
                    socketRef.current.send(JSON.stringify({
                        action: 'unsubscribeMany',
                        channels: channels
                    }));
                } catch (err) {
                    console.error('Error unsubscribing:', err);
                }
            }
            
            socketRef.current.close(1000, "Clean disconnect");
            socketRef.current = null;
            activeSubscriptionsRef.current.clear();
        }

        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

    }, []);

    // Add ping interval to keep the connection alive
    useEffect(() => {
        let pingInterval = null;
        
        if (isConnected && socketRef.current) {
            pingInterval = setInterval(() => {
                if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
                    socketRef.current.send(JSON.stringify({ action: 'ping' }));
                    socketRef.current.send(JSON.stringify({ type: 'ping' }));
                    
                    const pingCount = Math.floor(Date.now() / 30000) % 5;
                    if (pingCount === 0) {
                        socketRef.current.send(JSON.stringify({ 
                            action: 'status', 
                            type: 'subscription_check'
                        }));
                    }
                }
            }, 30000);
        }
        
        return () => {
            if (pingInterval) {
                clearInterval(pingInterval);
            }
        };
    }, [isConnected]);
    
    // Add data timeout checker
    useEffect(() => {
        const DATA_TIMEOUT = 60000; // 60 seconds
        
        const updateLastMessageTime = () => {
            lastMessageTimeRef.current = Date.now();
        };
        
        const checkDataTimeout = () => {
            const now = Date.now();
            const timeSinceLastMessage = now - lastMessageTimeRef.current;
            if (isConnected && timeSinceLastMessage > DATA_TIMEOUT) {
                if (socketRef.current) {
                    try { socketRef.current.close(); } catch (err) {
                        console.error('Error closing socket during timeout reconnect:', err);
                    }
                }
            }
        };
        
        if (isConnected && socketRef.current) {
            updateLastMessageTime();
            dataTimeoutCheckerRef.current = setInterval(checkDataTimeout, 10000);
            const socket = socketRef.current;
            socket.addEventListener('message', updateLastMessageTime);
            
            return () => {
                socket.removeEventListener('message', updateLastMessageTime);
                if (dataTimeoutCheckerRef.current) {
                    clearInterval(dataTimeoutCheckerRef.current);
                    dataTimeoutCheckerRef.current = null;
                }
            };
        } else {
            if (dataTimeoutCheckerRef.current) {
                clearInterval(dataTimeoutCheckerRef.current);
                dataTimeoutCheckerRef.current = null;
            }
        }
    }, [isConnected]);

    useEffect(() => {
        if (isConnectingRef.current) return;

        const connectWebSocket = () => {
            try {
                isConnectingRef.current = true;
                cleanupWebSocket();

                const wsUrls = wsUrlsRef.current;
                const currentUrl = wsUrls[urlIndexRef.current];
                const ws = new WebSocket(currentUrl);

                socketRef.current = ws;

                ws.onopen = () => {
                    setIsConnected(true);
                    setError(null);
                    reconnectAttemptsRef.current = 0;
                    isConnectingRef.current = false;
                    
                    // Test message to see if the connection is working
                    ws.send(JSON.stringify({ action: 'ping' }));
                    
                    if (urlIndexRef.current !== 0) {
                        wsUrls.splice(0, 0, wsUrls.splice(urlIndexRef.current, 1)[0]);
                        urlIndexRef.current = 0;
                    }

                    if (activeSubscriptionsRef.current.size > 0) {
                        const channels = Array.from(activeSubscriptionsRef.current);
                        activeSubscriptionsRef.current.clear();
                        channels.forEach(channel => {
                            subscribeToChannel(channel);
                        });
                    } else if (currentChannelRef.current && currentChannelRef.current !== 'sauce') {
                        // Only auto-subscribe if it's not a special channel like 'sauce' which is handled by components
                        subscribeToChannel(currentChannelRef.current);
                    }
                };

                ws.onmessage = (event) => {
                    lastMessageTimeRef.current = Date.now();
                    processMessage(event.data);
                };

                ws.onclose = (event) => {
                    setIsConnected(false);
                    isConnectingRef.current = false;
                    
                    if (!event.wasClean) {
                        if (urlIndexRef.current < wsUrls.length - 1) {
                            urlIndexRef.current++;
                            reconnectTimeoutRef.current = setTimeout(() => {
                                connectWebSocket();
                            }, 1000);
                        } else if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                            urlIndexRef.current = 0;
                            const delay = Math.min(
                                INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current),
                                MAX_RECONNECT_DELAY
                            );
                            reconnectTimeoutRef.current = setTimeout(() => {
                                reconnectAttemptsRef.current++;
                                connectWebSocket();
                            }, delay);
                        } else {
                            setError('Failed to connect after multiple attempts. Please check your internet connection or try again later.');
                        }
                    }
                };

                ws.onerror = (event) => {
                    const errorMessage = event.message || 'Unknown WebSocket error';
                    console.error(`WebSocket Error:`, errorMessage);
                    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS && urlIndexRef.current >= wsUrls.length - 1) {
                        setError(`Connection error: ${errorMessage}. Please check your internet connection or try again later.`);
                    } else {
                        setError('Attempting to reconnect...');
                    }
                };
            } catch (err) {
                console.error('Error creating WebSocket:', err);
                setError(`Failed to create WebSocket: ${err.message}`);
                isConnectingRef.current = false;
            }
        };

        connectWebSocket();

        return cleanupWebSocket;
    }, [cleanupWebSocket, processMessage, subscribeToChannel]);

    // Function to get current update statistics - optimized for memory usage
    const getUpdateStats = useCallback(() => {
        const stats = updateStatsRef.current;
        return {
            totalUpdates: stats.totalUpdates,
            contractCount: Object.keys(stats.byContract).length,
            timeframeCount: Object.keys(stats.byTimeframe).length,
            lastUpdate: stats.lastUpdate ? stats.lastUpdate.toISOString() : null,
            updatesPerMinute: calculateUpdatesPerMinute(stats.updateHistory)
        };
    }, []);

    return {
        isConnected,
        error,
        subscriptionStatus,
        registerTokenTimeframe,
        subscribeToChannel,
        unsubscribeFromChannel,
        subscribeToContract,
        subscribeToContracts,
        subscribeToTokenChannel,
        getUpdateStats,
        getActiveSubscriptions: useCallback(() => Array.from(activeSubscriptionsRef.current), [])
    };
};

export default usePriceWebSocket;

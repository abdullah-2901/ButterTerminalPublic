import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import BuyAndSellPopup from './BuyAndSellPopupWithDetailedPage';
import LightweightChart from '../LightweightChartDetailPage';
import usePriceWebSocket from '../usePriceWebSocket';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faGear } from '@fortawesome/free-solid-svg-icons';
import TradeSettings from './TradeSetings';

// API utility function
const fetchCandleData = async (contractAddress, timeframe) => {
  try {
    const response = await fetch(`https://api.buttertrade.xyz/OHLCV/api/candles/${contractAddress}/${timeframe}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching candle data:', error);
    throw error;
  }
};

// Define constants for settings storage and timeframe mapping
const SETTINGS_STORAGE_KEY = 'butter_trade_settings';
const timeframeMapping = {
  '1m': '1M',
  '5m': '5M',
  '15m': '15M',
  '30m': '30M',
  '1h': '1H',
  '4h': '4H',
  '1d': '1D'
};

// Available timeframes for chart viewing
const TIME_FRAMES = Object.values(timeframeMapping);

// Settings management utilities
const getDefaultSettings = () => ({
  priorityFee: '0.01',
  slippage: '30',
  mevProtection: false,
  bribe: '0.002'
});

// Function to load settings from localStorage with error handling
const loadSettingsFromStorage = () => {
  try {
    const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    return savedSettings ? JSON.parse(savedSettings) : getDefaultSettings();
  } catch (error) {
    console.error('Error loading settings from localStorage:', error);
    return getDefaultSettings();
  }
};

// Function to save settings to localStorage with error handling
const saveSettingsToStorage = (settings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving settings to localStorage:', error);
  }
};

const TokenDetailPage = ({
  solscan_icon,
  web_icon,
  telegram_icon,
  twitter_icon,
  setShowBuySellPopup,
  updateChartStatus = () => {},
  getPriceChange = () => {},
  connected = false
}) => {
  // Navigation and routing hooks setup
  const { tokenAddress } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const chartContainerRef = useRef(null);
  
  // Store normalized address for case-insensitive comparison
  const normalizedTokenAddress = useRef(tokenAddress?.toLowerCase());

  // Initialize chart data state with empty arrays (will be populated by API)
  const [chartData, setChartData] = useState({
    priceData: [],
    holdersData: []
  });

  // Initialize timeframe state from navigation or default to '1H'
  const initialTimeframe = location.state?.tokenDetails?.timeframe;
  const mappedInitialTimeframe = timeframeMapping[initialTimeframe?.toLowerCase()] || '1H';
  const [selectedTimeframe, setSelectedTimeframe] = useState(mappedInitialTimeframe);

  // Component state initialization
  const [tokenData, setTokenData] = useState(null);
  const [currentType, setCurrentType] = useState('buy');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [currentPrice, setCurrentPrice] = useState(null); // Store current price separately

  // Settings state management with localStorage integration
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(loadSettingsFromStorage());

  // Transform API data to chart format
  const transformApiDataToChartFormat = useCallback((apiData) => {
    if (!apiData || !apiData.candles || !Array.isArray(apiData.candles)) {
      return [];
    }

    return apiData.candles.map(candle => ({
      time: Math.floor(new Date(candle.time).getTime() / 1000),
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      marketCap: parseFloat(candle.marketCap),
      isComplete: true
    })).sort((a, b) => a.time - b.time);
  }, []);

  // Fetch current price from 1-minute data
  const fetchCurrentPrice = useCallback(async (contractAddress) => {
    if (!contractAddress) return;

    try {
      const apiData = await fetchCandleData(contractAddress, '1m');
      const transformedData = transformApiDataToChartFormat(apiData);
      
      if (transformedData.length > 0) {
        const latestCandle = transformedData[transformedData.length - 1];
        setCurrentPrice(latestCandle.close);
        
        // Update token data with current price
        setTokenData(prev => {
          if (!prev) return prev;
          
          const priceChange = getPriceChange(transformedData);
          return {
            ...prev,
            price: latestCandle.close,
            marketCap: latestCandle.marketCap.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            priceChange: priceChange
          };
        });
      }
    } catch (error) {
      console.error('Error fetching current price:', error);
    }
  }, [transformApiDataToChartFormat, getPriceChange]);

  // Load chart data from API
  const loadChartData = useCallback(async (contractAddress, timeframe) => {
    if (!contractAddress) return;

    try {
      setApiLoading(true);
      setError(null);

      // Convert display timeframe to API timeframe
      const apiTimeframe = Object.entries(timeframeMapping)
        .find(([api, display]) => display === timeframe)?.[0] || '1m';

      const apiData = await fetchCandleData(contractAddress, apiTimeframe);
      const transformedData = transformApiDataToChartFormat(apiData);

      setChartData(prevData => ({
        ...prevData,
        priceData: transformedData
      }));

      // If this is not 1m timeframe, keep the current price from 1m data
      if (apiTimeframe !== '1m') {
        // Fetch current price from 1m data to keep price consistent
        await fetchCurrentPrice(contractAddress);
      } else {
        // For 1m timeframe, update price from this data
        if (transformedData.length > 0) {
          const latestCandle = transformedData[transformedData.length - 1];
          setCurrentPrice(latestCandle.close);
          setTokenData(prev => {
            if (!prev) return prev;
            
            const priceChange = getPriceChange(transformedData);
            return {
              ...prev,
              price: latestCandle.close,
              marketCap: latestCandle.marketCap.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }),
              priceChange: priceChange
            };
          });
        }
      }

      setLastUpdate(new Date().toLocaleString());
    } catch (error) {
      console.error('Error loading chart data:', error);
      setError(`Failed to load chart data: ${error.message}`);
    } finally {
      setApiLoading(false);
    }
  }, [transformApiDataToChartFormat, getPriceChange, fetchCurrentPrice]);

  // Handle timeframe change
  const handleTimeframeChange = useCallback((newTimeframe) => {
    setSelectedTimeframe(newTimeframe);
    loadChartData(tokenAddress, newTimeframe);
  }, [tokenAddress, loadChartData]);

  // WebSocket price update handler with memoization for performance
  const handlePriceUpdate = useCallback((priceData) => {
    // Perform more flexible address matching
    if (!priceData || !priceData.contractaddress) {
      return;
    }
    
    // Normalize the contract address for case-insensitive comparison
    const incomingAddress = priceData.contractaddress.toLowerCase();
    
    if (incomingAddress !== normalizedTokenAddress.current) {
      return;
    }

    setChartData(prevData => {
      const newDataPoint = {
        time: Math.floor(new Date(priceData.timestamp).getTime() / 1000),
        open: parseFloat(priceData.open),
        high: parseFloat(priceData.high),
        low: parseFloat(priceData.low),
        close: parseFloat(priceData.close),
        marketCap: parseFloat(priceData.marketcap || 0),
        isComplete: true
      };

      const updatedPriceData = [...prevData.priceData];
      const existingIndex = updatedPriceData.findIndex(point => point.time === newDataPoint.time);

      if (existingIndex !== -1) {
        // Update existing candle
        updatedPriceData[existingIndex] = {
          ...updatedPriceData[existingIndex],
          high: Math.max(updatedPriceData[existingIndex].high, newDataPoint.high),
          low: Math.min(updatedPriceData[existingIndex].low, newDataPoint.low),
          close: newDataPoint.close,
          marketCap: newDataPoint.marketCap
        };
      } else {
        // Add new candle
        updatedPriceData.push(newDataPoint);
        updatedPriceData.sort((a, b) => a.time - b.time);
      }

      // Update token data with latest price info
      setTokenData(prev => {
        if (!prev) return prev;
        
        const priceChange = getPriceChange(updatedPriceData);
        const updatedTokenData = {
          ...prev,
          price: newDataPoint.close,
          marketCap: newDataPoint.marketCap.toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          }),
          priceChange: priceChange
        };
        
        return updatedTokenData;
      });

      const updateTime = new Date().toLocaleString();
      setLastUpdate(updateTime);

      return {
        ...prevData,
        priceData: updatedPriceData
      };
    });
  }, [tokenAddress, getPriceChange]);

  // Initialize WebSocket connection
  const {
    isConnected: isPriceConnected,
    error: wsError,
    registerTokenTimeframe,
    subscribeToChannel
  } = usePriceWebSocket(null, handlePriceUpdate);

  // Settings change handler with validation and storage
  const handleSettingsChange = useCallback((newSettings) => {
    try {
      const priorityFee = parseFloat(newSettings.priorityFee);
      const slippage = parseFloat(newSettings.slippage);
      const bribe = parseFloat(newSettings.bribe);

      // Validate the settings values
      if (isNaN(priorityFee) || priorityFee < 0) throw new Error('Invalid priority fee value');
      if (isNaN(slippage) || slippage < 0 || slippage > 100) throw new Error('Invalid slippage value');
      if (isNaN(bribe) || bribe < 0) throw new Error('Invalid bribe value');

      // Update state and persist to storage
      setSettings(newSettings);
      saveSettingsToStorage(newSettings);
    } catch (error) {
      console.error('Settings update failed:', error);
      alert('Invalid settings values. Please check your inputs.');
    }
  }, []);

  // Set up WebSocket subscription
  useEffect(() => {
    if (isPriceConnected && subscribeToChannel && tokenAddress) {
      const apiTimeframe = Object.entries(timeframeMapping)
        .find(([api, display]) => display === selectedTimeframe)?.[0] || '1m';
      
      // Subscribe to specific contract address and timeframe
      const channelName = `${tokenAddress}:${apiTimeframe}`;
      registerTokenTimeframe(tokenAddress, apiTimeframe, channelName);
      subscribeToChannel(channelName);
    }
  }, [isPriceConnected, subscribeToChannel, tokenAddress, registerTokenTimeframe, selectedTimeframe]);

  // Initialize token data and load chart data
  useEffect(() => {
    const initializeTokenData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (location.state?.tokenDetails) {
          const apiData = location.state.tokenDetails;

          const transformedData = {
            tokenName: apiData.tokenName || 'Unknown',
            tokenSymbol: apiData.tokenSymbol || 'Unknown',
            price: 0, // Will be updated when chart data loads
            decimals: apiData.decimals || 6,
            marketCap: '0', // Will be updated when chart data loads
            liquidity: "0",
            supply: "0",
            priceChange: 0, // Will be updated when chart data loads
            tokenImage: apiData.tokenImage || '/placeholder.png',
            links: {
              website: apiData.website || "#",
              telegram: apiData.telegram || "#",
              twitter: apiData.twitter || "#",
              solscan: apiData.solscanURL || `https://solscan.io/token/${tokenAddress}`
            }
          };

          setTokenData(transformedData);
          
          // First fetch current price from 1m data
          await fetchCurrentPrice(tokenAddress);
          
          // Then load chart data for selected timeframe
          await loadChartData(tokenAddress, selectedTimeframe);
        }
      } catch (error) {
        console.error('Error initializing token data:', error);
        setError('Failed to load token data');
      } finally {
        setLoading(false);
      }
    };

    initializeTokenData();
  }, [tokenAddress, location.state, selectedTimeframe, loadChartData]);

  // Load settings from storage on component mount
  useEffect(() => {
    const savedSettings = loadSettingsFromStorage();
    setSettings(savedSettings);
  }, []);

  // Loading state handler
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#141414]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Error state handler
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#141414] text-white flex-col">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">Error Loading Token Data</h2>
          <p className="text-gray-400">{error}</p>
          <button 
            onClick={() => navigate(-1)}
            className="mt-4 px-4 py-2 bg-green-500 rounded hover:bg-green-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Process links and stats for display
  const socialLinks = [
    { icon: solscan_icon, url: tokenData?.links.solscan, label: 'Solscan' },
    { icon: web_icon, url: tokenData?.links.website, label: 'Website' },
    { icon: telegram_icon, url: tokenData?.links.telegram, label: 'Telegram' },
    { icon: twitter_icon, url: tokenData?.links.twitter, label: 'Twitter' }
  ].filter(link => link.url && link.url !== '#');

  const tokenStats = [
    { label: 'Price', value: tokenData?.price ? `$${tokenData.price}` : 'N/A' },
    { 
      label: 'Market Cap', 
      value: chartData.priceData.length > 0 
        ? `$${chartData.priceData[chartData.priceData.length - 1].marketCap.toLocaleString(undefined, {
            maximumFractionDigits: 0
          })}` 
        : 'N/A' 
    },
    { label: 'Liquidity', value: tokenData?.liquidity || 'N/A' },
    { label: 'Supply', value: tokenData?.supply || 'N/A' }
  ];

  return (
    <div className="h-screen bg-[#141414] text-white flex flex-col overflow-hidden">
      {/* Header Section */}
      <div className="h-12 border-b border-gray-800 flex items-center justify-between px-4">
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${isPriceConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-400">
              {isPriceConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
          {lastUpdate && (
            <div className="text-sm text-gray-400">
              Last update: {lastUpdate}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Section */}
      <div className="flex flex-1 overflow-hidden">
        {/* Chart Section */}
        <div className="flex-1 border-r border-gray-800 flex flex-col">
          {/* Token Info Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-800 rounded-lg overflow-hidden">
                <img 
                  src={tokenData.tokenImage} 
                  alt={tokenData.tokenSymbol}
                  className="w-full h-full object-cover"
                />
              </div>
              
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{tokenData.tokenSymbol}</h1>
                  {typeof tokenData.priceChange === 'number' && (
                    <div className={`px-2 py-0.5 rounded text-sm ${
                      tokenData.priceChange >= 0 ? 'bg-green-500/20 text-[#00ff88]' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {tokenData.priceChange.toFixed(2)}%
                    </div>
                  )}
                  <div className="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                    Live Price
                  </div>
                </div>
                <div className="text-sm text-gray-400">{tokenData.tokenName}</div>
              </div>
            </div>

            <div className="flex gap-2">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center bg-[#343735] rounded-lg hover:bg-gray-700"
                >
                  <img src={link.icon} alt={link.label} className="w-4 h-4 opacity-60 hover:opacity-100" />
                </a>
              ))}
            </div>
          </div>

          {/* Token Stats */}
          <div className="flex justify-between px-4 py-2 border-b border-gray-800">
            {tokenStats.map((stat, index) => (
              <div key={index}>
                <div className="text-xs text-gray-400">{stat.label}</div>
                <div className="text-sm font-medium">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-2 p-2 border-b border-gray-800">
            {TIME_FRAMES.map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => handleTimeframeChange(timeframe)}
                disabled={apiLoading}
                className={`px-3 py-1 rounded text-xs ${
                  selectedTimeframe === timeframe 
                    ? 'bg-[#00ff88] text-black' 
                    : 'bg-[#1B1B1B] text-gray-400 hover:bg-gray-800'
                } ${apiLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {timeframe}
              </button>
            ))}
            {apiLoading && (
              <div className="ml-2 text-xs text-gray-400">
                Loading...
              </div>
            )}
          </div>

          {/* Chart */}
          <div ref={chartContainerRef} className="flex-1 bg-black p-4 overflow-hidden relative">
            {apiLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto mb-2"></div>
                  <div className="text-sm text-gray-400">Loading chart data...</div>
                </div>
              </div>
            ) : (
              <LightweightChart
                data={chartData.priceData}
                tokenSymbol={tokenData?.tokenSymbol || 'Token'}
                chartTitle=""
                containerRef={chartContainerRef}
                chartType="price"
                isFullWidth
              />
            )}
          </div>
        </div>

        {/* Trading Panel */}
        <div className="w-[380px] border-l border-gray-800">
          <BuyAndSellPopup 
            isOpen={true}
            onClose={() => {}}
            contractAddress={tokenAddress}
            channel={tokenData?.tokenSymbol}
            tokenSymbol={tokenData?.tokenSymbol}
            setIsSettingsOpen={setIsSettingsOpen}
            settings={settings}
            currentType={currentType}
            setCurrentType={setCurrentType}
            connected={connected}
            icon={tokenData?.tokenImage}
            decimals={tokenData?.decimals}
          />
        </div>
      </div>

      {/* Trade Settings Modal */}
      <TradeSettings
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsChange={handleSettingsChange}
        setSettings={setSettings}
        settings={settings}
      />
    </div>
  );
};

export default TokenDetailPage;

// https://api.buttertrade.xyz/OHLCV/api/candles/contractaddress/timeframe
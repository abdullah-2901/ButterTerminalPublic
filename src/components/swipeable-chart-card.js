//swipable-chart-card.js
import React, { useContext, useEffect, useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faExclamationTriangle,faExpand,faBookmark } from '@fortawesome/free-solid-svg-icons';
import { useNavigate } from 'react-router-dom';
import ButterTerminalContext from './ButterTerminalContext';
import LightweightChart from '../LightweightChart';
import html2canvas from 'html2canvas';
import sol_Icon from '../assets/icons/solanaIcon.svg';





const getHolderUpdateThreshold = (holderCount) => {
    if (holderCount <= 500) return 5;
    if (holderCount <= 1000) return 12;
    if (holderCount <= 1500) return 18;
    if (holderCount <= 2500) return 30;
    if (holderCount <= 4000) return 42;
    if (holderCount <= 5000) return 48;
    if (holderCount <= 7000) return 54;
    if (holderCount <= 10000) return 60;
    if (holderCount <= 15000) return 60;
    if (holderCount <= 20000) return 90;
    return 150;
};

const SwipeableChartCard = ({
    item,
    displayPriceData,
    displayHoldersData,
    updateChartStatus,
    isUpdating,
    copiedStates,
    setCopiedStates,
    copyHandler,
    connected,
    setChannel,
    setContractAddress,
    setTradeType,
    setShowBuySellPopup,
    setShowListingPopup,
    setIsSettingsOpen,
    getPriceChange,
    solscan_icon,
    web_icon,
    telegram_icon,
    twitter_icon,
    setTokenInfo,
    icon,
    setIcon,
    setDecimals,
    decimals
}) => {
    
    const navigate = useNavigate();
    const { butterWalletCredentials } = useContext(ButterTerminalContext);
    
    // Early return if displayPriceData is null or not an array
    if (!displayPriceData || !Array.isArray(displayPriceData)) {
        console.warn('SwipeableChartCard: displayPriceData is null or not an array for:', item.contractAddress);
        return null;
    }
    
    const [startX, setStartX] = useState(null);
    const [currentOffset, setCurrentOffset] = useState(0);
    const [isSwiping, setIsSwiping] = useState(false);
    const [showPriceAlert, setShowPriceAlert] = useState(false);
    const [showHoldersAlert, setShowHoldersAlert] = useState(false);
    const [priceUpdateTime, setPriceUpdateTime] = useState(null);
    const [holdersUpdateTime, setHoldersUpdateTime] = useState(null);
    const cardRef = useRef(null);
    const checkUpdateInterval = useRef(null);
    
    const handleShare = async () => {
        const chartElement = cardRef.current;
    
        if (chartElement) {
            try {
                // Capture the chart as canvas
                const canvas = await html2canvas(chartElement);
                
                // Convert canvas to blob
                const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
                
                // Create FormData and append the image
                const formData = new FormData();
                formData.append('image', blob, 'chart.png');
    
                // Upload to your server
                const response = await fetch('http://localhost:3001/upload-image', {
                    method: 'POST',
                    body: formData
                });
    
                const { imageUrl } = await response.json(); // Get back the public URL
    
                // Now share to Twitter with the public image URL
                const tweetText = `Check out the ${item.tokenSymbol} chart! 🚀`;
                const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(imageUrl)}`;
                window.open(twitterUrl, '_blank');
    
            } catch (error) {
                console.error('Error sharing:', error);
                // Fallback to text-only share if image upload fails
                const tweetText = `Check out the ${item.tokenSymbol} chart! 🚀`;
                const twitterUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
                window.open(twitterUrl, '_blank');
            }
        }
    };


    useEffect(() => {
        checkUpdateInterval.current = setInterval(checkLastUpdate, 10000);
        
        return () => {
            if (checkUpdateInterval.current) {
                clearInterval(checkUpdateInterval.current);
            }
        };
    }, [displayPriceData, displayHoldersData]);

  // In the checkLastUpdate function, replace the price check block with:
  const TimeUtils = {
    getTimeDifference: (timestamp1, timestamp2) => {
        // Ensure both timestamps are in milliseconds
        const t1 = timestamp1 * 1000; // Always convert to milliseconds
        const t2 = timestamp2 * 1000;
        return Math.abs(t2 - t1) / 1000 / 60;
    },

    formatTimeDifference: (diffInMinutes) => {
        if (diffInMinutes < 60) {
            return `${Math.floor(diffInMinutes)} min`;
        }
        const hours = Math.floor(diffInMinutes / 60);
        const minutes = Math.floor(diffInMinutes % 60);
        return `${hours}h ${minutes}min`;
    }
};

const getTimeframeInMinutes = (timeframe) => {
    switch (timeframe?.toLowerCase()) {
        case '1m': return 1;
        case '3m': return 3;
        case '5m': return 5;
        case '15m': return 15;
        case '30m': return 30;
        case '1h': return 60;
        case '2h': return 120;
        case '4h': return 240;
        case '1d': return 1440;
        default: return 2; // Default alert threshold
    }
};

const checkLastUpdate = () => {
    // For price - adjust for timezone
    const nowWithOffset = Math.floor(Date.now() / 1000) + (new Date().getTimezoneOffset() * 60);
    // For holders - use regular timestamp
    const now = Math.floor(Date.now() / 1000);

    if (displayPriceData?.length > 0) {
        const lastDataPoint = displayPriceData[displayPriceData.length - 1];
        if (lastDataPoint && lastDataPoint.time) {
            const lastTimestamp = lastDataPoint.time;
            const priceUpdateDiff = Math.abs(nowWithOffset - lastTimestamp) / 60;
            setPriceUpdateTime(priceUpdateDiff);
            
            const timeframeThreshold = getTimeframeInMinutes(item.timeframe);
            setShowPriceAlert(priceUpdateDiff > timeframeThreshold);
        }
    }

    if (displayHoldersData?.length > 0) {
        const currentHolders = displayHoldersData[displayHoldersData.length - 1].value;
        const updateThresholdMinutes = getHolderUpdateThreshold(currentHolders);
        
        const lastHoldersTimestamp = displayHoldersData[displayHoldersData.length - 1].time;
        const holdersUpdateDiff = Math.abs(now - lastHoldersTimestamp) / 60;
        setHoldersUpdateTime(holdersUpdateDiff);
        setShowHoldersAlert(holdersUpdateDiff > updateThresholdMinutes);
    }
};

    const handleTouchStart = (e) => {
        setStartX(e.touches[0].clientX);
        setIsSwiping(true);
    };

    const handleTouchMove = (e) => {
        if (!startX) return;
        
        const currentX = e.touches[0].clientX;
        const diff = currentX - startX;
        const maxOffset = 100;
        const newOffset = Math.max(-maxOffset, Math.min(maxOffset, diff));
        setCurrentOffset(newOffset);
    };

    const handleTouchEnd = () => {
        if (!connected) {
            alert('Please connect your wallet');
            setCurrentOffset(0);
            setIsSwiping(false);
            setStartX(null);
            return;
        }

        const threshold = 60;

        if (currentOffset < -threshold) {
            handleBuy();
        } else if (currentOffset > threshold) {
            handleShowListing();
        }

        setCurrentOffset(0);
        setIsSwiping(false);
        setStartX(null);
    };

    const handleShowListing = () => {
        if (!connected) {
            alert('Please connect your wallet');
            return;
        }
        setChannel(item.channelName);
        setContractAddress(item.contractAddress);
        setShowListingPopup(true);
    };

    const handleTrade = () => {
        if (!connected) {
            alert('Please connect your wallet');
            return;
        }

        if (!butterWalletCredentials) {
            navigate('/butter-wallet');
            return;
        }

        const priceChangeValue = getPriceChange(displayPriceData);
        
        setChannel(item.channelName);
        setContractAddress(item.contractAddress);
        setIcon(icon = item.tokenImage);
        setDecimals(decimals = item.decimals);
        setTradeType('buy');
        
        setTokenInfo({
            tokenSymbol: item.tokenSymbol || 'Unknown',
            tokenName: item.tokenName || 'Sample Token Name Inc',
            tokenIcon: item.tokenIcon || null,
            tokenPrice: item.price || 0,
            tokenBalance: item.balance || 0,
            mcap: '$200.6M',
            liquidity: '$300.9K',
            volume24h: '$12.9M',
            priceChange: typeof priceChangeValue === 'number' ? priceChangeValue : 0
        });
        
        setShowBuySellPopup(true);
    };

    // Prepare chart data with timezone-aware timestamps
    const prepareChartData = (data) => {
        if (!data) return [];
        return data.map(point => ({
            ...point,
            time: point.time,
            localTime: TimeUtils.serverToLocal(point.time).toLocaleString()
        }));
    };
    // console.log(displayPriceData)
    return (
        <div className="relative">
            {/* <div 
                className="absolute inset-y-0 right-0 bg-[#00ff88] flex items-center justify-center text-black font-bold w-24 rounded-l-lg z-10"
                style={{
                    opacity: Math.max(0, -currentOffset) / 100,
                    transform: `translateX(${Math.min(0, currentOffset)}px)`,
                    transition: isSwiping ? 'none' : 'all 0.3s ease'
                }}
            >
                BUY
            </div> */}

            {/* <div 
                className="absolute inset-y-0 left-0 bg-[#00ff88] flex items-center justify-center text-black font-bold w-24 rounded-r-lg z-10"
                style={{
                    opacity: Math.max(0, currentOffset) / 100,
                    transform: `translateX(${Math.max(0, currentOffset)}px)`,
                    transition: isSwiping ? 'none' : 'all 0.3s ease'
                }}
            >
                HOLDINGS
            </div> */}

            <div 
                ref={cardRef}
                className="chart-card flex flex-col"  // Changed to className for better organization
                style={{
                    transform: `translateX(${currentOffset}px)`,
                    transition: isSwiping ? 'none' : 'transform 0.3s ease',
                    background: '#000000',
                    borderRadius: '16px',
                    padding: '12px',
                    minHeight: '450px',
                }}
                // onTouchStart={handleTouchStart}
                // onTouchMove={handleTouchMove}
                // onTouchEnd={handleTouchEnd}
            
            >
                <div className="flex-shrink-0">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">{item?item.tokenName:""}</span>
                    <div className="flex items-center gap-2">
                   {/* Update these blocks in your return JSX */}
                   {/* {showPriceAlert && (
                    <div className="flex items-center text-yellow-500">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                        <span className="text-xs">
                            Price not updated in {TimeUtils.formatTimeDifference(priceUpdateTime)}
                        </span>
                    </div>
                )}
                {showHoldersAlert && displayHoldersData?.length > 0 && (
                    <div className="flex items-center text-yellow-500">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="mr-1" />
                        <span className="text-xs">
                            Holders not updated in {TimeUtils.formatTimeDifference(holdersUpdateTime)}
                        </span>
                    </div>
                )} */}
                {/* <button
                    className="text-gray-400 hover:text-white"
                    onClick={handleShare}
                    title="Share chart"
                >
                    <FontAwesomeIcon icon={faBookmark} /> 
                </button> */}
                          
                  <button
                            className="text-gray-400 hover:text-white"
                            onClick={() => {
                                // Create a state object with the chart data
                                const chartState = {
                                    priceData: displayPriceData,
                                    holdersData: displayHoldersData,
                                    tokenDetails: {
                                        tokenName: item.tokenName,
                                        tokenSymbol: item.tokenSymbol,
                                        price: item.price,
                                        marketCap: displayPriceData?.[displayPriceData.length - 1]?.marketCap,
                                        timeframe: item.timeframe,
                                        twitter: item.twitter,
                                        website:item.website,
                                        solscan: item.solscan,
                                        telegram: item.telegram,
                                        solscanURL:item.solscanURL,
                                        tokenImage:item.tokenImage,
                                        timeframe:item.timeframe,
                                        decimals:item.decimals
                        
                                        // Add any other relevant token details
                                    }
                                };
                        
                                // Navigate with state
                                navigate(`/token/${item.contractAddress}`, { state: chartState });
                            }}                            disabled={isUpdating}
                            title="Remove chart"
                            >
                            <FontAwesomeIcon icon={faExpand} />
                            </button>
                        <div className={`price-change ${getPriceChange(displayPriceData) >= 0 ? 'positive' : 'negative'} mr-3`}>
                        
                            {getPriceChange(displayPriceData).toFixed(2)}%
                        </div>
                        
                        {/* {isUpdating ? (
                            <span className="spinner-border spinner-border-sm" />
                        ) : (
                            <button
                                className="text-gray-400 hover:text-white"
                                onClick={() => updateChartStatus(item.channelName, item.contractAddress)}
                                disabled={isUpdating}
                                title="Remove chart"
                            >
                                <FontAwesomeIcon icon={faXmark} />
                            </button>
                        )} */}
                    </div>
                </div>

                <div className="flex justify-between items-start w-full">
                    <div className="flex items-start gap-3">
                        <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden">
                        {item.tokenImage ? (
                            <img 
                                src={item.tokenImage} 
                                alt={""}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.onerror = null; // Prevent infinite loop
                                    e.target.src = ''; // Clear the broken image
                                    e.target.parentElement.classList.add('bg-pink-200'); // Add fallback background
                                }}
                            />
                        ) : (
                            <div className="w-full h-full bg-pink-200" />
                        )}
                    </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-bold text-base text-white">{item.tokenSymbol}</span>
                                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-1 rounded">
                                        {item.timeframe || '1m'}
                                    </span>
                                    <button 
                                        onClick={async () => {
                                            try {
                                                const hasCopied = await copyHandler(item.contractAddress);
                                                if (hasCopied) {
                                                    setCopiedStates(prev => ({...prev, [item.contractAddress]: true}));
                                                    setTimeout(() => setCopiedStates(prev => ({...prev, [item.contractAddress]: false})), 800);
                                                }
                                            } catch (error) {
                                                console.error("Copy error:", error);
                                            }
                                        }}
                                        className="ml-1 flex items-center justify-center w-5 h-5 bg-gray-800 rounded-full hover:bg-gray-700 transition-all"
                                    >
                                        {copiedStates[item.contractAddress] ? (
                                            <svg className="w-2.5 h-2.5 text-[#00ff88]" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0" />
                                            </svg>
                                        ) : (
                                            <svg className="w-2.5 h-2.5 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <div className="flex gap-1.5">
                                    {[
                                        { icon: solscan_icon, alt: 'Solscan', url: item?item.solscanURL:"" },
                                        { icon: web_icon, alt: 'Website', url: item?item.website:"" },
                                        { icon: telegram_icon, alt: 'Telegram', url: item?item.telegram:"" },
                                        { icon: twitter_icon, alt: 'Twitter', url: item?item.twitter:"" }
                                    ].filter(social => social.url).map((social, index) => (
                                        <a 
                                            key={index}
                                            href={social.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="w-5 h-5 flex items-center justify-center bg-gray-800 rounded-full hover:bg-gray-700 transition-colors"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                window.open(social.url, '_blank', 'noopener,noreferrer');
                                            }}
                                        >
                                            <img 
                                                src={social.icon} 
                                                alt={social.alt} 
                                                className="w-3 h-3 opacity-60 hover:opacity-100" 
                                            />
                                        </a>
                                    ))}
                                </div>
                                {/* <div className="text-xs text-gray-400">40+ mins ago</div> */}
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-0.5 text-right">
                        <div className="text-xs text-gray-400">
                            MCap: {displayPriceData && displayPriceData.length > 0 && displayPriceData[displayPriceData.length - 1]?.marketCap
                                ? `$${displayPriceData[displayPriceData.length - 1].marketCap.toLocaleString(undefined, {
                                    maximumFractionDigits: 0
                                })}`
                                : '--'
                            }
                        </div>
                        
                        {/* Volume in USD */}
                        <div className="text-xs text-gray-400">
                            Vol($): {displayPriceData && displayPriceData.length > 0 && displayPriceData[displayPriceData.length - 1]?.volume
                                ? `$${(typeof displayPriceData[displayPriceData.length - 1].volume === 'object' 
                                    ? displayPriceData[displayPriceData.length - 1].volume.dollar 
                                    : displayPriceData[displayPriceData.length - 1].volume).toLocaleString(undefined, {
                                    maximumFractionDigits: 2
                                })}`
                                : '$0'
                            }
                            
                        </div>

                    </div>
                </div>
                </div>

                <div className="flex flex-col flex-1 mt-4">  {/* Simplified flex structure */}
        {/* Price chart container */}
        <div className="mb-5">  {/* Explicit margin bottom for separation */}
            <div className="w-full h-[150px] relative">  {/* Removed redundant flex properties */}
                <LightweightChart
                    data={displayPriceData}
                    tokenSymbol={""}
                    chartTitle=""
                    height={250}
                    chartType="price"
                    contractAddress={item.contractAddress}
                    timeframe={item.timeframe}
                />
            </div>
        </div>
        
        {/* Holders chart container */}
        {/* <div className="w-full"> 
            <div className="w-full h-[120px] relative">
                <LightweightChart
                    data={displayHoldersData}
                    tokenSymbol={""}
                    chartTitle=""
                    height={100}
                    chartType="Holders"
                />
            </div>
        </div> */}
    </div>

<div className="flex justify-center "> 
{/* <button
    onClick={() => {
        // Create a state object with the chart data
        console.log(item)
        const chartState = {
            priceData: displayPriceData,
            holdersData: displayHoldersData,
            tokenDetails: {
                tokenName: item.tokenName,
                tokenSymbol: item.tokenSymbol,
                price: item.price,
                marketCap: displayPriceData?.[displayPriceData.length - 1]?.marketCap,
                timeframe: item.timeframe,
                twitter: item.twitter,
                website:item.website,
                solscan: item.solscan,
                telegram: item.telegram,
                solscanURL:item.solscanURL,
                tokenImage:item.tokenImage,
                timeframe:item.timeframe

                // Add any other relevant token details
            }
        };

        // Navigate with state
        navigate(`/token/${item.contractAddress}`, { state: chartState });
    }}
    className="px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:opacity-90 transition-opacity"
>
    Trade
</button> */}
<button
        onClick={handleTrade}
        className="px-6 py-3 bg-[#00ff88] text-black font-bold rounded-lg hover:opacity-90 transition-opacity"
    >
        Trade
    </button>

</div>
            </div>
        </div>
    );
};

export default SwipeableChartCard;
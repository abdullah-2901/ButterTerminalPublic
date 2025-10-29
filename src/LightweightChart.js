//LightweightChart.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createChart } from 'lightweight-charts';

const LightweightChart = ({ data, tokenSymbol, chartTitle, height = 300, chartType, contractAddress, timeframe }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const resizeObserverRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(true);
    const [chartError, setChartError] = useState(null);
    const lastCandleRef = useRef(null);
    const currentCandleRef = useRef(null);
    const timeframeRef = useRef(null);
    const updateTimeoutRef = useRef(null);
    const pendingUpdatesRef = useRef([]);
    const lastDataLengthRef = useRef(0);

    // Debug function to log data issues - only enabled in development
    const logDataIssues = (data, label) => {
        // Disable all logging in production
        if (process.env.NODE_ENV !== 'development') return;
        if (!data || !Array.isArray(data) || data.length === 0) return;
        
        // Only log serious issues like time ordering problems
        for (let i = 1; i < Math.min(data.length, 10); i++) {
            if (data[i].time < data[i - 1].time) {
                console.warn(`${label} - Time ordering issue at index ${i}`);
                break; // Only log once per dataset
            }
        }
    };

    // Helper function to get timeframe duration in seconds
    const getTimeframeDuration = (timeframe) => {
        if (!timeframe) return 60; // Default to 1 minute
        
        const unit = timeframe.slice(-1);
        const value = parseInt(timeframe.slice(0, -1)) || 1;
        
        switch (unit) {
            case 's': return value; // seconds
            case 'm': return value * 60; // minutes
            case 'h': return value * 3600; // hours
            case 'd': return value * 86400; // days
            default: return 60; // Default to 1 minute
        }
    };
    
    // Helper function to get the start time of a timeframe
    const getTimeframeStart = (timestamp, timeframe) => {
        const duration = getTimeframeDuration(timeframe);
        return Math.floor(timestamp / duration) * duration;
    };

    // Process pending updates when chart is ready
    const processPendingUpdates = useCallback(() => {
        if (!seriesRef.current || !chartRef.current || pendingUpdatesRef.current.length === 0) {
            return;
        }

        const updates = [...pendingUpdatesRef.current];
        pendingUpdatesRef.current = [];

        updates.forEach(updateData => {
            if (chartType === 'Holders' || !updateData) {
                return;
            }
            
            const timestamp = updateData.time;
            const timeframe = updateData.timeframe || '1m';
            
            if (updateData.isComplete) {
                const existingData = seriesRef.current?.data() || [];
                const existingCandle = existingData.find(candle => candle.time === timestamp);
                
                if (existingCandle && existingCandle.isComplete) {
                    return;
                }
                
                const completeCandle = {
                    time: timestamp,
                    open: updateData.open,
                    high: updateData.high,
                    low: updateData.low,
                    close: updateData.close,
                    volume: updateData.volume,
                    isComplete: true
                };
                
                try {
                    seriesRef.current.update(completeCandle);
                    lastCandleRef.current = completeCandle;
                } catch (error) {
                    console.warn('Failed to process pending complete candle:', error.message);
                }
            } else {
                const timeframeStart = getTimeframeStart(timestamp, timeframe);
                
                if (currentCandleRef.current && currentCandleRef.current.time === timeframeStart) {
                    currentCandleRef.current = {
                        ...currentCandleRef.current,
                        high: Math.max(currentCandleRef.current.high, updateData.high),
                        low: Math.min(currentCandleRef.current.low, updateData.low),
                        close: updateData.close,
                        volume: updateData.volume || currentCandleRef.current.volume || 0
                    };
                    
                    try {
                        seriesRef.current.update(currentCandleRef.current);
                    } catch (error) {
                        console.warn('Failed to process pending running candle update:', error.message);
                    }
                } else {
                    const previousClose = lastCandleRef.current ? lastCandleRef.current.close : updateData.open;
                    
                    currentCandleRef.current = {
                        time: timeframeStart,
                        open: previousClose,
                        high: Math.max(previousClose, updateData.high),
                        low: Math.min(previousClose, updateData.low),
                        close: updateData.close,
                        volume: updateData.volume || 0,
                        isComplete: false,
                        timeframeStart: timeframeStart,
                        timeframe: timeframe
                    };
                    
                    try {
                        seriesRef.current.update(currentCandleRef.current);
                    } catch (error) {
                        console.warn('Failed to process pending new running candle:', error.message);
                    }
                }
            }
        });
    }, [chartType]);

    // Separate effect for initial chart creation
    useEffect(() => {
        if (!chartContainerRef.current) return;

        // Chart configuration
        const chartOptions = {
            width: chartContainerRef.current.clientWidth,
            height: height,
            layout: {
                background: { color: '#000000' },
                textColor: '#ffffff',
                fontSize: 9,
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            },
            grid: {
                vertLines: { color: '#000000' },
                horzLines: { color: '#000000' },
            },
            crosshair: { mode: 1 },
            timeScale: {
                timeVisible: true,
                borderColor: '#e1e1e1',
                minBarSpacing: 0.5,
                rightOffset: 10,
                barSpacing: 3,
                fixLeftEdge: true,
                fixRightEdge: true,
                lockVisibleTimeRangeOnResize: true,
                rightBarStaysOnScroll: true
            },
            rightPriceScale: {
                borderColor: '#e1e1e1',
                scaleMargins: { top: 0.1, bottom: 0.1 },
                mode: 0,
                format: price => price.toFixed(6),
                alignLabels: true,
            },
        };

        // Create chart if it doesn't exist
        if (!chartRef.current) {
            chartRef.current = createChart(chartContainerRef.current, chartOptions);
        }

        // Create series based on chart type
        if (!seriesRef.current) {
            if (chartType === 'Holders') {
                seriesRef.current = chartRef.current.addAreaSeries({
                    lineColor: '#26a69a',
                    topColor: '#26a69a',
                    bottomColor: 'rgba(38, 166, 154, 0.1)',
                    lineWidth: 1.5,
                    priceLineVisible: false,
                    lastValueVisible: false,
                    crosshairMarkerVisible: true,
                    crosshairMarkerRadius: 4,
                    fillStyle: {
                        type: 'gradient_area',
                    }
                });
            } else {
                seriesRef.current = chartRef.current.addCandlestickSeries({
                    upColor: '#26a69a',
                    downColor: '#ef5350',
                    borderVisible: false,
                    wickUpColor: '#26a69a',
                    wickDownColor: '#ef5350',
                    priceFormat: {
                        type: 'price',
                        precision: 6,
                        minMove: 0.000001,
                    },
                });
            }
        }

        // Handle resize
        if (!resizeObserverRef.current) {
            resizeObserverRef.current = new ResizeObserver(entries => {
                if (!chartRef.current) return;
                const { width } = entries[0].contentRect;
                if (width > 0) {
                    chartRef.current.applyOptions({ width });
                    chartRef.current.timeScale().fitContent();
                }
            });
            resizeObserverRef.current.observe(chartContainerRef.current);
        }

        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
        };
    }, [chartType, height]);

    // Separate effect to process initial data only once when component mounts
    useEffect(() => {
        if (!data || data.length === 0 || !seriesRef.current) return;

        // Check if we already have data loaded to prevent re-processing
        const existingData = seriesRef.current?.data() || [];
        if (existingData.length > 0) {
            return;
        }
        
        // Process initial data only once
        try {
            // Data preprocessing to ensure unique, ascending timestamps
            const processData = (rawData) => {
                if (!rawData || !Array.isArray(rawData) || rawData.length === 0) {
                    return [];
                }

                // First, convert all timestamps to numbers and filter out invalid data
                const validData = rawData
                    .map(point => {
                        if (!point || typeof point !== 'object') return null;
                        
                        // Convert time to number if it's not already
                        let timestamp;
                        if (typeof point.time === 'number') {
                            timestamp = point.time;
                        } else if (point.time) {
                            const date = new Date(point.time);
                            timestamp = isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 1000);
                        } else {
                            return null;
                        }

                        // Validate timestamp
                        if (!timestamp || timestamp <= 0 || isNaN(timestamp)) {
                            return null;
                        }

                        return { ...point, time: timestamp };
                    })
                    .filter(point => point !== null);

                if (validData.length === 0) {
                    return [];
                }

                // Sort by time first
                validData.sort((a, b) => a.time - b.time);

                // Remove duplicates and handle same timestamps
                const uniqueData = [];
                const seenTimestamps = new Set();

                for (let i = 0; i < validData.length; i++) {
                    let timestamp = validData[i].time;
                    
                    // If we've seen this timestamp before, add a small increment
                    while (seenTimestamps.has(timestamp)) {
                        timestamp += 0.001;
                    }
                    
                    seenTimestamps.add(timestamp);
                    uniqueData.push({ ...validData[i], time: timestamp });
                }

                // Final validation: ensure data is properly sorted
                for (let i = 1; i < uniqueData.length; i++) {
                    if (uniqueData[i].time < uniqueData[i - 1].time) {
                        // Fix by adjusting the timestamp
                        uniqueData[i].time = uniqueData[i - 1].time + 0.001;
                    }
                }

                return uniqueData;
            };

            // Process data based on chart type
            if (chartType === 'Holders') {
                const processedData = processData(data)
                    .map(point => ({
                        time: point.time,
                        value: typeof point.value === 'number' ? point.value : 
                               typeof point.Holders === 'number' ? point.Holders : 
                               parseFloat(point.value || point.Holders)
                    }))
                    .filter(point => !isNaN(point.time) && point.time > 0);

                if (processedData.length > 0) {
                    try {
                        seriesRef.current.setData(processedData);
                    } catch (setDataError) {
                        console.error('Error setting holders chart data:', setDataError);
                        setChartError('Failed to load holders data');
                        return;
                    }
                } else {
                    setChartError('No valid holders data available');
                }
            } else {
                // Process and update price data
                const processedData = processData(data)
                    .map(point => ({
                        time: point.time,
                        open: Number(point.open) || 0,
                        high: Number(Math.max(point.high, point.latestPrice || 0, point.close || 0)) || 0,
                        low: Number(Math.min(point.low, point.latestPrice || Infinity, point.close || Infinity)) || 0,
                        close: Number(point.close) || 0
                    }))
                    .filter(point => 
                        !isNaN(point.time) && 
                        !isNaN(point.open) && 
                        !isNaN(point.high) && 
                        !isNaN(point.low) && 
                        !isNaN(point.close) &&
                        point.time > 0 &&
                        point.open > 0 &&
                        point.close > 0
                    );

                if (processedData.length > 0) {
                    // Ensure all historical data is properly sorted by time
                    processedData.sort((a, b) => a.time - b.time);
                    
                    // Store the last candle for reference (all historical data should be complete)
                    const lastCandle = processedData[processedData.length - 1];
                    lastCandleRef.current = lastCandle;
                    
                    try {
                        seriesRef.current.setData(processedData);
                        lastDataLengthRef.current = processedData.length;
                        
                        // Process any pending updates now that chart is ready
                        setTimeout(() => {
                            processPendingUpdates();
                        }, 100);
                    } catch (setDataError) {
                        console.error('Error setting chart data:', setDataError);
                        setChartError('Failed to load chart data');
                        return;
                    }
                } else {
                    setChartError('No valid data available');
                }
            }

            chartRef.current.timeScale().fitContent();
            setIsProcessing(false);

        } catch (error) {
            console.error('Error processing initial data:', error);
            setChartError('Failed to process initial data');
            setIsProcessing(false);
        }
    }, []); // Empty dependency array - runs only once on mount, ignoring data changes!

    // Handle real-time updates with debouncing
    const updateCandle = useCallback((newData) => {
        if (chartType === 'Holders' || !newData) {
            return;
        }

        // If chart isn't ready, queue the update
        if (!seriesRef.current || !chartRef.current) {
            pendingUpdatesRef.current.push(newData);
            return;
        }
        
        // Clear any pending update
        if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
        }
        
        // Debounce updates to prevent rapid shifting
        updateTimeoutRef.current = setTimeout(() => {
            const timestamp = newData.time;
            const timeframe = newData.timeframe || '1m';
            
            // Store timeframe for reference
            if (!timeframeRef.current) {
                timeframeRef.current = timeframe;
            }
            
            // Get current chart data to determine if this is a new candle or update
            const chartData = seriesRef.current?.data() || [];
            const lastChartTime = chartData.length > 0 ? chartData[chartData.length - 1].time : 0;
            
            // Skip updates that are significantly older than the last chart data
            // Allow updates within the same timeframe for real-time updates
            if (timestamp < lastChartTime - 300) { // 5 minutes buffer
                return;
            }
            
            if (newData.isComplete) {
                // Check if we already have a complete candle at this timestamp
                const existingData = seriesRef.current?.data() || [];
                const existingCandle = existingData.find(candle => candle.time === timestamp);
                
                if (existingCandle && existingCandle.isComplete) {
                    return;
                }
                
                // This is a complete candle
                const completeCandle = {
                    time: timestamp,
                    open: newData.open,
                    high: newData.high,
                    low: newData.low,
                    close: newData.close,
                    volume: newData.volume,
                    isComplete: true
                };
                
                // Complete any existing running candle first
                if (currentCandleRef.current) {
                    const previousComplete = {
                        ...currentCandleRef.current,
                        isComplete: true
                    };
                    
                    try {
                        seriesRef.current.update(previousComplete);
                        lastCandleRef.current = previousComplete;
                    } catch (error) {
                        console.warn('Failed to complete previous candle:', error.message);
                    }
                    currentCandleRef.current = null;
                }
                
                // Add the complete candle
                try {
                    seriesRef.current.update(completeCandle);
                    lastCandleRef.current = completeCandle;
                } catch (error) {
                    console.warn('Failed to update complete candle:', error.message);
                }
                
            } else {
                // This is real-time data for a running candle
                const timeframeStart = getTimeframeStart(timestamp, timeframe);
                
                // Check if this is a new timeframe or updating existing running candle
                const isNewTimeframe = !currentCandleRef.current || 
                                      timeframeStart !== currentCandleRef.current.timeframeStart ||
                                      (currentCandleRef.current && currentCandleRef.current.isComplete);
                
                if (isNewTimeframe) {
                    // Complete previous running candle if exists
                    if (currentCandleRef.current) {
                        const previousComplete = {
                            ...currentCandleRef.current,
                            isComplete: true
                        };
                        
                        try {
                            seriesRef.current.update(previousComplete);
                            lastCandleRef.current = previousComplete;
                        } catch (error) {
                            console.warn('Failed to complete previous candle (new timeframe):', error.message);
                        }
                    }
                    
                    // Create new running candle
                    const previousClose = lastCandleRef.current ? lastCandleRef.current.close : newData.open;
                    
                    
                    currentCandleRef.current = {
                        time: timeframeStart,
                        open: previousClose,
                        high: Math.max(previousClose, newData.high),
                        low: Math.min(previousClose, newData.low),
                        close: newData.close,
                        volume: newData.volume || 0,
                        isComplete: false,
                        timeframeStart: timeframeStart,
                        timeframe: timeframe
                    };
                    
                    try {
                        seriesRef.current.update(currentCandleRef.current);
                    } catch (error) {
                        console.warn('Failed to create new running candle:', error.message);
                    }
                } else {
                    // Update existing running candle
                    if (currentCandleRef.current) {
                        currentCandleRef.current = {
                            ...currentCandleRef.current,
                            high: Math.max(currentCandleRef.current.high, newData.high),
                            low: Math.min(currentCandleRef.current.low, newData.low),
                            close: newData.close,
                            volume: newData.volume || currentCandleRef.current.volume || 0
                        };
                        
                        try {
                            seriesRef.current.update(currentCandleRef.current);
                        } catch (error) {
                            console.warn('Failed to update existing running candle:', error.message);
                        }
                    }
                }
            }
            
            // Auto-scroll to show latest data (only if user hasn't manually scrolled)
            if (chartRef.current) {
                const timeScale = chartRef.current.timeScale();
                const visibleRange = timeScale.getVisibleRange();
                if (visibleRange && visibleRange.to > lastChartTime - 300) {
                    timeScale.scrollToPosition(0, false);
                }
            }
            
        }, 50); // 50ms debounce delay
    }, [chartType, getTimeframeStart]);

    useEffect(() => {
        // Listen for custom price update events (from usePriceWebSocket)
        const handleCustomPriceUpdate = (event) => {
            try {
                if (event.detail && event.detail.time && event.detail.contractAddress) {
                    // Only process updates for this specific contract address
                    if (event.detail.contractAddress === contractAddress) {
                        // Get the chart's timeframe from the prop or initial data
                        const chartTimeframe = timeframe || (data && data.length > 0 ? 
                            (data[0].timeframe || '1m') : '1m');
                        
                        // Only process updates that match the chart's timeframe
                        if (event.detail.timeframe === chartTimeframe) {
                            // Only process if chart is ready and we have valid data
                            if (seriesRef.current && chartRef.current) {
                                updateCandle(event.detail);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('❌ Chart: Error handling custom price update:', error);
            }
        };
        
        // Add event listener
        window.addEventListener('priceUpdate', handleCustomPriceUpdate);
        
        // Cleanup function
        return () => {
            window.removeEventListener('priceUpdate', handleCustomPriceUpdate);
        };
    }, [contractAddress, timeframe, updateCandle]);

    // Cleanup effect for chart destruction
    useEffect(() => {
        return () => {
            if (chartRef.current) {
                chartRef.current.remove();
                chartRef.current = null;
            }
            if (seriesRef.current) {
                seriesRef.current = null;
            }
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
                resizeObserverRef.current = null;
            }
        };
    }, []);
    
    if (chartError) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-1 text-red-600 text-xs">
                {chartError}
            </div>
        );
    }

    return (
        <div className="relative">
            <div
                ref={chartContainerRef} 
                className={`w-full min-w-[150px] ${isProcessing ? 'opacity-50' : ''}`}
                style={{ height: `${height}px` }} 
            />
        </div>
    );
};

// Memoize the component to prevent unnecessary re-renders
export default React.memo(LightweightChart, (prevProps, nextProps) => {
    // Only re-render if these specific props change
    const shouldNotUpdate = 
        prevProps.contractAddress === nextProps.contractAddress &&
        prevProps.timeframe === nextProps.timeframe &&
        prevProps.chartType === nextProps.chartType &&
        prevProps.height === nextProps.height &&
        prevProps.data === nextProps.data;
    
    return shouldNotUpdate; // Return true to skip re-render
});
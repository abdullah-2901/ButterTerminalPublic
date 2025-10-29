import React, { useEffect, useRef, useState } from 'react';
import { createChart } from 'lightweight-charts';

const LightweightChart = ({ data, tokenSymbol, chartTitle, height = 300, chartType }) => {
    const chartContainerRef = useRef(null);
    const chartRef = useRef(null);
    const seriesRef = useRef(null);
    const resizeObserverRef = useRef(null);
    const [isProcessing, setIsProcessing] = useState(true);
    const [chartError, setChartError] = useState(null);

    useEffect(() => {
        // Guard clause - don't proceed if we don't have what we need
        if (!chartContainerRef.current) return;
        
        // If no data, show empty state
        if (!data || data.length === 0) {
            setIsProcessing(false);
            return;
        }

        try {
            // Data preprocessing to ensure unique, ascending timestamps
            const processData = (rawData) => {
                // Remove duplicates and sort by time
                const uniqueData = rawData.reduce((acc, point) => {
                    // Convert time to number if it's not already
                    const timestamp = typeof point.time === 'number' 
                        ? point.time 
                        : new Date(point.time).getTime() / 1000;

                    // If this timestamp doesn't exist or is newer, add/replace
                    const existingIndex = acc.findIndex(p => p.time === timestamp);
                    if (existingIndex === -1) {
                        acc.push({ ...point, time: timestamp });
                    } else {
                        // If existing point, potentially merge or keep the latest
                        acc[existingIndex] = { 
                            ...acc[existingIndex], 
                            ...point, 
                            time: timestamp 
                        };
                    }
                    return acc;
                }, []);

                // Sort by time and ensure no duplicate times
                return uniqueData
                    .sort((a, b) => a.time - b.time)
                    // Optional: Add a small increment to timestamps if they're exactly the same
                    .map((point, index, arr) => {
                        if (index > 0 && point.time === arr[index - 1].time) {
                            point.time += 0.001; // Add a tiny increment
                        }
                        return point;
                    });
            };

            // Trading interface style chart options
            const chartOptions = {
                width: chartContainerRef.current.clientWidth,
                height: height,
                layout: {
                    background: { type: 'solid', color: '#000000' },
                    textColor: '#999999',
                    fontSize: 11,
                    fontFamily: 'Segoe UI, sans-serif',
                },
                grid: {
                    vertLines: { color: 'rgba(42, 46, 57, 0.3)' },
                    horzLines: { color: 'rgba(42, 46, 57, 0.3)' }
                },
                crosshair: {
                    mode: 1,
                    style: 1,
                    vertLine: {
                        color: '#758696',
                        width: 1,
                        style: 1,
                    },
                    horzLine: {
                        color: '#758696',
                        width: 1,
                        style: 1,
                    }
                },
                timeScale: {
                    timeVisible: true,
                    secondsVisible: false,
                    borderColor: 'rgba(42, 46, 57, 0.5)',
                    barSpacing: 5,
                    rightOffset: 5,
                    fixLeftEdge: true,
                    lockVisibleTimeRangeOnResize: true,
                    rightBarStaysOnScroll: true,
                    borderVisible: false,
                },
                rightPriceScale: {
                    borderColor: 'rgba(42, 46, 57, 0.5)',
                    borderVisible: false,
                    scaleMargins: {
                        top: 0.3,
                        bottom: 0.25,
                    },
                    format: price => price.toFixed(6),
                },
                handleScroll: {
                    mouseWheel: true,
                    pressedMouseMove: true,
                    horzTouchDrag: true,
                    vertTouchDrag: false
                },
                handleScale: {
                    axisPressedMouseMove: false,
                    mouseWheel: true,
                    pinch: true
                }
            };

            // Create chart instance
            chartRef.current = createChart(chartContainerRef.current, chartOptions);

            // Add the appropriate series based on chart type
            if (chartType === 'price') {
                // Candlestick series for price data
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
                    lastValueVisible: true,
                    priceLineVisible: false,
                    baseLineVisible: false,
                });

                // Process and validate price data using the new processData function
                const processedData = processData(data)
                    .filter(point => (
                        !isNaN(point.time) &&
                        !isNaN(point.open) &&
                        !isNaN(point.high) &&
                        !isNaN(point.low) &&
                        !isNaN(point.close) &&
                        point.time > 0
                    ))
                    .map(point => ({
                        time: point.time,
                        open: point.open,
                        high: point.high,
                        low: point.low,
                        close: point.close || point.price,
                    }));

                if (processedData.length > 0) {
                    seriesRef.current.setData(processedData);
                }
            }

            // Fit content and handle initial viewport
            chartRef.current.timeScale().fitContent();

            // Set up resize handling
            resizeObserverRef.current = new ResizeObserver(entries => {
                if (!chartRef.current) return;
                
                const { width, height } = entries[0].contentRect;
                if (width > 0 && height > 0) {
                    chartRef.current.applyOptions({ 
                        width: Math.min(width, 10000),
                        height: height 
                    });
                    chartRef.current.timeScale().fitContent();
                }
            });

            resizeObserverRef.current.observe(chartContainerRef.current);
            setIsProcessing(false);

        } catch (error) {
            console.error('Error initializing chart:', error);
            setChartError('Failed to initialize chart');
            setIsProcessing(false);
        }

        // Cleanup function
        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
            }
            if (chartRef.current) {
                chartRef.current.remove();
            }
        };
    }, [data, tokenSymbol, chartTitle, chartType, height]);

    // Error state rendering
    if (chartError) {
        return (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-500 text-sm">
                {chartError}
            </div>
        );
    }

    // Empty state rendering
    if (!data || data.length === 0) {
        return (
            <div className="relative w-full h-full flex items-center justify-center">
                <div className="text-center text-gray-400">
                    <div className="text-sm">No chart data available</div>
                    <div className="text-xs mt-1">Select a timeframe to load data</div>
                </div>
            </div>
        );
    }

    // Main render
    return (
        <div className="relative w-full h-full">
            <div
                ref={chartContainerRef} 
                className={`w-full h-full ${isProcessing ? 'opacity-50' : ''}`}
                style={{ minHeight: '200px' }}
            />
        </div>
    );
};

export default LightweightChart;
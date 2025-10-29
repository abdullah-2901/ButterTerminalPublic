import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { Container, Row, Col, Tab, Tabs, Tooltip, OverlayTrigger } from 'react-bootstrap';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard, faXmark } from '@fortawesome/free-solid-svg-icons';
import LightweightChart from '../LightweightChart';
import Spinner from '../Spinner';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../App.css';
import StrategySelector from '../StrategySelector';
import { copyHandler } from '../utils/CopyHandler';
import TradeDropdown from './TradeDropdown';

const API_URL = 'http://208.167.248.128:8086/api/Data/GetLiveData';
const UPDATE_STATUS_URL = 'http://208.167.248.128:8086/api/Data'; // Replace with your actual update endpoint



// const API_URL = 'https://localhost:7025/api/Data/GetLiveData';
// const UPDATE_STATUS_URL = 'https://localhost:7025/api/Data'; // Replace with your actual update endpoint

const Terminal = () => {

    const [chartData, setChartData] = useState([]);
    const [previousChartData, setPreviousChartData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdate, setLastUpdate] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeChannel, setActiveChannel] = useState(null);
    const [copiedContract, setCopiedContract] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(null);
    const [copiedStates, setCopiedStates] = useState({});
    const [isOpenTradeDropdown, setIsOpenTradeDropdown] = useState(false);

    const processData = (rawData) => {
        setIsProcessing(true);

        try {
            const processedData = rawData.map(item => {
                const tokenSymbol = item.tokenSymbol || 'Unknown Token';
                
                // Skip tokens with unknown symbols
                if (tokenSymbol === 'Unknown Token' || tokenSymbol.toLowerCase().includes('unknown')) {
                    console.log(`Skipping token with unknown symbol: ${item.contractAddress} - Symbol: "${tokenSymbol}"`);
                    return null;
                }
                
                return {
                    channelName: item.channelName || 'Unknown Channel',
                    contractAddress: item.contractAddress,
                    tokenSymbol,
                    data: (item.data || [])
                        .map(point => ({
                            time: Math.floor(new Date(point.createdDate).getTime() / 1000),
                            value: parseFloat(point.price),
                        }))
                        .filter(point => !isNaN(point.value) && !isNaN(point.time))
                };
            }).filter(item => item !== null && item.data.length > 0);

            return processedData;
        } catch (error) {
            throw new Error('Error processing data: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const updateChartStatus = async (channelName, contractAddress) => {
        try {
            setUpdatingStatus(`${channelName}-${contractAddress}`);

            // Convert parameters to URL-encoded query string
            const params = new URLSearchParams({
                channelName: channelName,
                contractAddress: contractAddress
            });

            // Make the POST request with query parameters
            const response = await axios.post(
                `${UPDATE_STATUS_URL}/UpdateStatus?${params.toString()}`,
                null,  // no body needed since we're using query params
                {
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status === 200) {
                // Remove the chart from local state
                const updatedChartData = chartData.filter(
                    item => !(item.channelName === channelName && item.contractAddress === contractAddress)
                );
                setChartData(updatedChartData);
                console.log('Update successful');

            } else {
                throw new Error('Failed to update status');
            }

            fetchLiveData();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update chart status. Please try again.');
        } finally {
            setUpdatingStatus(null);
        }
    };


    const mergeData = (oldData, newData) => {
        return newData.map(newItem => {
            const oldItem = oldData.find(item => item.contractAddress === newItem.contractAddress);
            if (!oldItem) return newItem;

            const combinedData = [...oldItem.data];
            newItem.data.forEach(newPoint => {
                if (!combinedData.some(oldPoint => oldPoint.time === newPoint.time)) {
                    combinedData.push(newPoint);
                }
            });

            const sortedData = combinedData
                .sort((a, b) => a.time - b.time)
                .slice(-1000);

            return {
                ...newItem,
                data: sortedData
            };
        });
    };

    const fetchLiveData = useCallback(async () => {
        try {
            setError(null);
            if (chartData.length === 0) setLoading(true);

            const response = await axios.get(API_URL, {
                timeout: 50000,
                headers: {
                    'Cache-Control': 'no-cache',
                    'Pragma': 'no-cache'
                }
            });

            if (!response.data || !Array.isArray(response.data)) {
                throw new Error('Invalid data format received from API');
            }

            const processedData = processData(response.data);
            // console.log("processedData",processedData)
            setPreviousChartData(chartData);
            const mergedData = mergeData(chartData, processedData);
            setLastUpdate(new Date().toLocaleString());

            if (JSON.stringify(mergedData) !== JSON.stringify(chartData)) {
                setChartData(mergedData);
            }

        } catch (error) {
            console.error('Error fetching live data:', error);
            setError(
                error.response?.data?.message ||
                error.message ||
                'Failed to fetch data. Please try again later.'
            );
        } finally {
            setLoading(false);
        }
    }, [chartData]);

    useEffect(() => {
        fetchLiveData();
        const interval = setInterval(fetchLiveData, 30000);
        return () => clearInterval(interval);
    }, [fetchLiveData]);

    const groupedData = chartData.reduce((acc, item) => {
        if (!acc[item.channelName]) acc[item.channelName] = [];
        acc[item.channelName].push(item);
        return acc;
    }, {});

    useEffect(() => {
        if (Object.keys(groupedData).length > 0 && !activeChannel) {
            setActiveChannel(Object.keys(groupedData)[0]);
        }
    }, [groupedData]);

    const getPriceChange = (data) => {
        if (!data || data.length < 2) return 0;
        const firstPrice = data[0].value;
        const lastPrice = data[data.length - 1].value;
        return ((lastPrice - firstPrice) / firstPrice) * 100;
    };

    const renderChartRows = (data) => {
        // Create array of chunks, each containing 3 items
        return Array.from({ length: Math.ceil(data.length / 3) }, (_, rowIndex) => {
            const rowItems = data.slice(rowIndex * 3, rowIndex * 3 + 3);

            return (
                <Row key={rowIndex} className="chart-row mb-3">
                    {rowItems.map((item, index) => {
                        const displayData = loading ?
                            previousChartData.find(prev => prev.contractAddress === item.contractAddress)?.data || item.data
                            : item.data;

                        const isUpdating = updatingStatus === `${item.channelName}-${item.contractAddress}`;

                        return (
                            <Col key={`${item.contractAddress}-${index}`} xs={12} md={4}>
                                <div className="chart-card">
                                    <div className="chart-header">
                                        <div className="chart-title d-flex flex-wrap align-items-center justify-content-between w-100">
                                            <div className="d-flex flex-wrap align-items-center gap-1">
                                                <h3 className="token-symbol">{item.tokenSymbol}</h3>
                                                {copiedStates[item.contractAddress] ? (
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-check2" viewBox="0 0 16 16">
                                                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0" />
                                                    </svg>
                                                ) : (
                                                    <svg
                                                        xmlns="http://www.w3.org/2000/svg"
                                                        width="16"
                                                        height="16"
                                                        fill="currentColor"
                                                        className="bi bi-copy"
                                                        style={{ cursor: "pointer" }}
                                                        onClick={async () => {
                                                            try {
                                                                const hasCopied = await copyHandler(item.contractAddress);
                                                                if (hasCopied) {
                                                                    setCopiedStates(prev => ({
                                                                        ...prev,
                                                                        [item.contractAddress]: true
                                                                    }));
                                                                    setTimeout(() => {
                                                                        setCopiedStates(prev => ({
                                                                            ...prev,
                                                                            [item.contractAddress]: false
                                                                        }));
                                                                    }, 1800);
                                                                } else {
                                                                    console.error("Copy failed");
                                                                    alert("Failed to copy the address. Please try again.");
                                                                }
                                                            } catch (error) {
                                                                console.error("Unexpected error during copy:", error);
                                                                alert("An unexpected error occurred. Please try again.", error);
                                                            }
                                                        }}
                                                        viewBox="0 0 16 16"
                                                    >
                                                        <path fillRule="evenodd" d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z" />
                                                    </svg>
                                                )}
                                                {/* <StrategySelector contractAddress={item.contractAddress} channelName={item.channelName} /> */}
                                            </div>
                                            <div className="d-flex align-items-center mt-2 mt-sm-0">
                                                <div className={`price-change ${getPriceChange(displayData) >= 0 ? 'positive' : 'negative'}`}>
                                                    {getPriceChange(displayData).toFixed(2)}%
                                                </div>
                                                <button
                                                    className="close-button"
                                                    onClick={() => updateChartStatus(item.channelName, item.contractAddress)}
                                                    disabled={isUpdating}
                                                    title="Remove chart"
                                                >
                                                    {isUpdating ? (
                                                        <span className="spinner-border spinner-border-sm" />
                                                    ) : (
                                                        <FontAwesomeIcon icon={faXmark} />
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="chart-body">
                                        <LightweightChart
                                            data={displayData}
                                            tokenSymbol={item.tokenSymbol}
                                        />
                                    </div>
                                    <div className='flex justify-center items-center'>
                                        <div className="relative inline-block">
                                            <Dropdown>
                                                <Dropdown.Toggle variant="" id="dropdown-basic">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="bi bi-three-dots" viewBox="0 0 16 16">
                                                        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3m5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3" />
                                                    </svg>
                                                </Dropdown.Toggle>
                                                <Dropdown.Menu>
                                                    <Dropdown.Item href="#/action-2" onClick={''}>Buy</Dropdown.Item>
                                                    <Dropdown.Item href="#/action-3">Sell</Dropdown.Item>
                                                </Dropdown.Menu>
                                            </Dropdown>
                                        </div>
                                    </div>
                                </div>
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

    return (
        <div className="dashboard">
            <Container fluid className="py-4">
                <Row className="mb-4">
                    <Col>
                        <div className="header-card">
                            <div className="d-flex justify-content-between align-items-center">
                                <h1 className="dashboard-title">Butter Terminal Dashboard</h1>
                                <div>
                                    {lastUpdate && (
                                        <p className="last-update">
                                            Last updated: {lastUpdate}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Col>
                </Row>

                {loading && chartData.length === 0 && (
                    <Row>
                        <Col className="text-center py-5">
                            <Spinner size="large" message="Fetching data..." />
                        </Col>
                    </Row>
                )}

                {isProcessing && !loading && (
                    <div className="processing-overlay">
                        <div className="processing-content">
                            <Spinner size="large" message="Processing data..." />
                        </div>
                    </div>
                )}

                {error && (
                    <Row className="mb-4">
                        <Col>
                            <div className="error-alert" role="alert">
                                <h4>Error</h4>
                                <p>{error}</p>
                                <button
                                    onClick={fetchLiveData}
                                    className="retry-button"
                                >
                                    Retry
                                </button>
                            </div>
                        </Col>
                    </Row>
                )}

                {(chartData.length > 0 || previousChartData.length > 0) ? (
                    <Tabs
                        activeKey={activeChannel}
                        onSelect={(channel) => setActiveChannel(channel)}
                        className="mb-4"
                    >
                        {Object.keys(groupedData).map((channel) => (
                            <Tab eventKey={channel} title={channel} key={channel}>
                                <div className="charts-container">
                                    {renderChartRows(groupedData[channel])}
                                </div>
                            </Tab>
                        ))}
                    </Tabs>
                ) : (!loading && !error) ? (
                    <Row>
                        <Col>
                            <div className="no-data">
                                <p>No data available to display</p>
                            </div>
                        </Col>
                    </Row>
                ) : null}
            </Container>
        </div>
    );
};

export default Terminal;
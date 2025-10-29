import React, { useEffect, useState, useCallback, useContext } from 'react';
import axios from 'axios';
import { Container, Row, Col, Tab, Tabs, Tooltip, OverlayTrigger } from 'react-bootstrap';
import Dropdown from 'react-bootstrap/Dropdown';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faClipboard, faXmark } from '@fortawesome/free-solid-svg-icons';
import LightweightChart from './LightweightChart';
import Spinner from './Spinner';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import StrategySelector from './StrategySelector';
import { copyHandler } from './utils/CopyHandler'
import TradeDropdown from './components/TradeDropdown';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import BuyAndSellPopup from './components/BuyAndSellPopup';
import ButterTerminalContext from './components/ButterTerminalContext';
import NewButterWalletPopup from './components/NewButterWalletPopup';
import('@solana/wallet-adapter-react-ui/styles.css');



// const API_URL = 'https://localhost:7025/api/Data/GetLiveData';
// const UPDATE_STATUS_URL = 'https://localhost:7025/api/Data'; // Replace with your actual update endpoint

const App = () => {
    const { connected, publicKey } = useWallet();
    const { createNewButterWallet, butterWalletCredentials,  } = useContext(ButterTerminalContext);
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
    const [showBuySellPopup, setShowBuySellPopup] = useState(false);
    const [tradeType, setTradeType] = useState(''); // 'buy' or 'sell'
    const [isWalletPopupOpen, setIsWalletPopupOpen] = useState(false);
    const [contractAddress, setContractAddress] = useState('');
    const [channel, setChannel] = useState('');
    const [holdersData, setHoldersData] = useState([]);
    const [previousHoldersData, setPreviousHoldersData] = useState([]);
    // Replace the single showHolders state
    // const [showHolders, setShowHolders] = useState({});

    const processData = (rawData) => {
        setIsProcessing(true);

        try {
            const processedData = rawData.map(item => ({
                channelName: item.channelName || 'Unknown Channel',
                contractAddress: item.contractAddress,
                tokenSymbol: item.tokenSymbol || 'Unknown Token',
                data: (item.data || [])
                    .map(point => ({
                        time: Math.floor(new Date(point.createdDate).getTime() / 1000),
                        value: parseFloat(point.price),
                    }))
                    .filter(point => !isNaN(point.value) && !isNaN(point.time))
            })).filter(item => item.data.length > 0);

            return processedData;
        } catch (error) {
            throw new Error('Error processing data: ' + error.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const processHoldersData = (rawData) => {
        setIsProcessing(true);

        try {
            const processedData = rawData.map(item => ({
                channelName: item.channelName || 'Unknown Channel',
                contractAddress: item.contractAddress,
                tokenSymbol: item.tokenSymbol || 'Unknown Token',
                data: (item.data || [])
                    .map(point => ({
                        time: Math.floor(new Date(point.date_time).getTime() / 1000),
                        value: parseFloat(point.holders),
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

    // Modify fetchLiveData to fetch both price and holders data
    const fetchLiveData = useCallback(async () => {
        try {
            setError(null);
            if (chartData.length === 0) setLoading(true);

            // Fetch both price and holders data concurrently
            const [priceResponse, holdersResponse] = await Promise.all([
                axios.get(API_URL, {
                    timeout: 5000000,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                }),
                axios.get(Holders_Data_API, {
                    timeout: 5000000,
                    headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                    }
                })
            ]);

            if (!priceResponse.data || !Array.isArray(priceResponse.data)) {
                throw new Error('Invalid price data format received from API');
            }

            if (!holdersResponse.data || !Array.isArray(holdersResponse.data)) {
                throw new Error('Invalid holders data format received from API');
            }

            // Process both datasets
            const processedPriceData = processData(priceResponse.data);

            // const processedPriceData=[{
            //     "channelName": "solvolumealert",
            //     "contractAddress": "8Vm62Z6mBiCksHvZjzyCNvuUxs75oHUHq6WKLvYMpump",
            //     "tokenSymbol": "boys",
            //     "data": [
            //         {
            //             "time": 1732077301,
            //             "value": 0.0001315394577306945
            //         },
            //         {
            //             "time": 1732077351,
            //             "value": 0.0001457548567451941
            //         },
            //         {
            //             "time": 1732077396,
            //             "value": 0.00013642290027608968
            //         },
            //         {
            //             "time": 1732077436,
            //             "value": 0.00017107671562506576
            //         },
            //         {
            //             "time": 1732077733,
            //             "value": 0.00009749496858606756
            //         }
            //     ]
            // },
            // {
            //     "channelName": "solvolumealert",
            //     "contractAddress": "8Vm62Z6mBiCksHvZjzyCNvuUxs75oHUHq6WKLvYMpump",
            //     "tokenSymbol": "boys",
            //     "data": [
            //         {
            //             "time": 1732077301,
            //             "value": 0.0001315394577306945
            //         },
            //         {
            //             "time": 1732077351,
            //             "value": 0.0001457548567451941
            //         },
            //         {
            //             "time": 1732077396,
            //             "value": 0.00013642290027608968
            //         },
            //         {
            //             "time": 1732077436,
            //             "value": 0.00017107671562506576
            //         },
            //         {
            //             "time": 1732077733,
            //             "value": 0.00009749496858606756
            //         }
            //     ]
            // },{
            //     "channelName": "solvolumealert",
            //     "contractAddress": "8Vm62Z6mBiCksHvZjzyCNvuUxs75oHUHq6WKLvYMpump",
            //     "tokenSymbol": "boys",
            //     "data": [
            //         {
            //             "time": 1732077301,
            //             "value": 0.0001315394577306945
            //         },
            //         {
            //             "time": 1732077351,
            //             "value": 0.0001457548567451941
            //         },
            //         {
            //             "time": 1732077396,
            //             "value": 0.00013642290027608968
            //         },
            //         {
            //             "time": 1732077436,
            //             "value": 0.00017107671562506576
            //         },
            //         {
            //             "time": 1732077733,
            //             "value": 0.00009749496858606756
            //         }
            //     ]
            // }]

            console.log("processedPriceData")
            console.log(processedPriceData)
            const processedHoldersData = processHoldersData(holdersResponse.data);
            // const processedHoldersData = [];
            console.log("processedHoldersData")
            console.log(processedHoldersData)
            // Update price data
            setPreviousChartData(chartData);
            const mergedPriceData = mergeData(chartData, processedPriceData);

            // Update holders data
            setPreviousHoldersData(holdersData);
            const mergedHoldersData = mergeData(holdersData, processedHoldersData);

            setLastUpdate(new Date().toLocaleString());

            if (JSON.stringify(mergedPriceData) !== JSON.stringify(chartData)) {
                setChartData(mergedPriceData);
            }

            if (JSON.stringify(mergedHoldersData) !== JSON.stringify(holdersData)) {
                setHoldersData(mergedHoldersData);
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
    }, [chartData, holdersData]);

    useEffect(() => {
        fetchLiveData();
        const interval = setInterval(fetchLiveData, 20000);
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
                        const displayPriceData = loading ?
                            previousChartData.find(prev => prev.contractAddress === item.contractAddress)?.data || item.data
                            : item.data;

                        const displayHoldersData = loading ?
                            previousHoldersData.find(prev => prev.contractAddress === item.contractAddress)?.data ||
                            holdersData.find(curr => curr.contractAddress === item.contractAddress)?.data || []
                            : holdersData.find(curr => curr.contractAddress === item.contractAddress)?.data || [];

                        const isUpdating = updatingStatus === `${item.channelName}-${item.contractAddress}`;

                        return (
                            <Col key={`${item.contractAddress}-${index}`} xs={12} md={4}>
                                <div className="chart-card">
                                    <div className="chart-header">
                                        <div className='d-flex flex-column align-items-center justify-content-between w-100 '>
                                            <div className="chart-title d-flex flex-wrap align-items-center justify-content-between w-100 ">
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
                                                                        }, 800);
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
                                                    {/* // In the renderChartRows function, modify the holders button: */}


                                                    {/* <StrategySelector contractAddress={item.contractAddress} channelName={item.channelName} /> */}
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
                                                                <Dropdown.Item
                                                                    onClick={() => {
                                                                        if (!connected) {
                                                                            alert('Please connect your wallet')
                                                                            return;
                                                                        }
                                                                        setChannel(item.channelName)
                                                                        setContractAddress(item.contractAddress)
                                                                        setTradeType('buy');
                                                                        setShowBuySellPopup(true);
                                                                    }}
                                                                >
                                                                    Buy
                                                                </Dropdown.Item>
                                                                <Dropdown.Item
                                                                    onClick={() => {
                                                                        if (!connected) {
                                                                            alert('Please connect your wallet')
                                                                            return;
                                                                        }
                                                                        setChannel(item.channelName)
                                                                        setContractAddress(item.contractAddress)
                                                                        setTradeType('sell');
                                                                        setShowBuySellPopup(true);
                                                                    }}
                                                                >
                                                                    Sell
                                                                </Dropdown.Item>
                                                            </Dropdown.Menu>
                                                        </Dropdown>
                                                    </div>
                                                </div>
                                                <div className="d-flex align-items-center mt-2 mt-sm-0">
                                                    <div className={`price-change ${getPriceChange(displayPriceData) >= 0 ? 'positive' : 'negative'}`}>
                                                        {getPriceChange(displayPriceData).toFixed(2)}%
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
                                            <div className='d-flex flex-wrap align-items-center justify-content-between w-100' >
                                                <a
                                                    href={`https://x.com/search?q=$${item.tokenSymbol}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm border bg-slate-800 text-white px-1.5 rounded no-underline"
                                                >
                                                    Search on X
                                                </a>
                                                <div className="grid grid-cols-4 gap-4">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-bold">Price</span>
                                                    <span className="text-sm">
                                                        ${displayPriceData && displayPriceData.length > 0
                                                            ? displayPriceData[displayPriceData.length - 1].value.toFixed(12)
                                                            : 'N/A'
                                                        }
                                                    </span>
                                                </div>
                                                
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-bold">Holders</span>
                                                    <span className="text-sm">
                                                        {displayHoldersData && displayHoldersData.length > 0
                                                            ? Math.round(displayHoldersData[displayHoldersData.length - 1].value)
                                                            : 'N/A'
                                                        }
                                                    </span>
                                                </div>
                                                
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-bold">MarketCap</span>
                                                    <span className="text-sm">
                                                        {displayHoldersData && displayHoldersData.length > 0
                                                            ? Math.round(displayHoldersData[displayHoldersData.length - 1].value)
                                                            : 'N/A'
                                                        }
                                                    </span>
                                                </div>
                                                
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-bold">BundledTx</span>
                                                    <span className="text-sm">
                                                        {displayHoldersData && displayHoldersData.length > 0
                                                            ? Math.round(displayHoldersData[displayHoldersData.length - 1].value)
                                                            : 'N/A'
                                                        }
                                                    </span>
                                                </div>
                                            </div>
                                            </div>
                                        </div>
                                    </div>
                                    {/* In the chart-body div */}
                                    <div className="chart-body">
                                        <LightweightChart
                                            data={displayPriceData}
                                            tokenSymbol={item.tokenSymbol}
                                            chartTitle="Price"
                                        />
                                        <LightweightChart
                                            data={displayHoldersData}
                                            tokenSymbol={item.tokenSymbol}
                                            chartTitle="Holders"
                                            chartType="holders"
                                        />
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
                                <div className='flex justify-center gap-2 items-center'>
                                    <button
                                        className='rounded bg-slate-600 text-white p-2.5'
                                        onClick={async () => {
                                            try {
                                                if (!connected) {
                                                    return alert('Please connect your wallet');
                                                }
                                                if (butterWalletCredentials) {
                                                    return setIsWalletPopupOpen(true);
                                                }
                                                setIsWalletPopupOpen(true);
                                                const success = await createNewButterWallet(publicKey);
                                                if (!success) {
                                                    setIsWalletPopupOpen(false);
                                                    alert('Failed to create wallet');
                                                }
                                            } catch (error) {
                                                console.error('Error:', error);
                                                setIsWalletPopupOpen(false);
                                                alert('Error creating wallet');
                                            }
                                        }}
                                        disabled={!connected}
                                    >
                                        Create Butter Wallet
                                    </button>
                                    <WalletMultiButton />
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
            <BuyAndSellPopup
                isOpen={showBuySellPopup}
                onClose={() => setShowBuySellPopup(false)}
                contractAddress={contractAddress}
                channel={channel}
                type={tradeType}
            />
            <NewButterWalletPopup
                isOpen={isWalletPopupOpen}
                onClose={() => setIsWalletPopupOpen(false)}
            />
        </div>
    );
};

export default App;
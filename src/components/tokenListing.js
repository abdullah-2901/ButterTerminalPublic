import React, { useState, useEffect, useContext } from 'react';
import ButterTerminalContext from './ButterTerminalContext';
import axios from 'axios';

// Define constants for API endpoints to maintain consistency and easy updates
const JUPITER_API_BASE = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';

const TokenHoldings = ({ isOpen, onClose, settings, copyHandler, setCopiedStates, copiedStates }) => {
    // Context and state management for core functionality
    const { getTokenAccountsByOwner, butterWalletCredentials } = useContext(ButterTerminalContext);
    const [sortOrder, setSortOrder] = useState('end-date');
    const [holdings, setHoldings] = useState([]);
    
    // State for trading-related functionality
    const [isJitoIncluded, setIsJitoIncluded] = useState(false);
    const [jitoAmount, setJitoAmount] = useState(0);
    const [processingTokens, setProcessingTokens] = useState(new Set());
    const [walletCopied, setWalletCopied] = useState(false);

    // Loading and error states
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLoadingQuotes, setIsLoadingQuotes] = useState(false);

    // Market values and metadata management
    const [marketValues, setMarketValues] = useState({});
    let [tokenMetadata, setTokenMetadata] = useState({});

    // Function to fetch quote for a single token using Jupiter API
    const fetchQuoteForToken = async (tokenMint, amount, decimals) => {
        try {
            const inputAmountInBaseUnits = Math.floor(amount * Math.pow(10, decimals));
            
            const params = new URLSearchParams({
                inputMint: tokenMint,
                outputMint: SOL_MINT,
                amount: inputAmountInBaseUnits.toString(),
                slippageBps: '100',
                onlyDirectRoutes: 'false',
            });

            const response = await fetch(`${JUPITER_API_BASE}/quote?${params}`);
            const quoteData = await response.json();

            if (quoteData) {
                return Number(quoteData.outAmount) / 1e9;
            }
            return 0;
        } catch (error) {
            console.error('Error fetching quote for token:', tokenMint, error);
            return 0;
        }
    };

    // Function to fetch all token quotes in parallel
    const fetchAllQuotes = async (holdingsData) => {
        setIsLoadingQuotes(true);
        const values = {};
        
        for (const holding of holdingsData) {
            const value = await fetchQuoteForToken(
                holding.token,
                holding.value,
                holding.decimals
            );
            values[holding.token] = value;
        }
        
        setMarketValues(values);
        setIsLoadingQuotes(false);
    };

    // Function to fetch metadata for tokens from API
    const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.example.com';
    const fetchTokenMetadata = async (tokenAddresses) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/token-metadata`, {
                params: {
                    tokens: tokenAddresses.join(',')
                }
            });
            
            if (response.data.success) {
                setTokenMetadata(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching token metadata:', error.response || error);
        }
    };

    // Main function to fetch token accounts and related data
    const fetchTokenAccounts = async () => {
        try {
            setIsLoading(true);
            const walletPublicKey = butterWalletCredentials?.publickey;
            const response = await getTokenAccountsByOwner(walletPublicKey);
            
            if (response.result && response.result.value) {
                const transformedHoldings = response.result.value
                    .map(account => {
                        const tokenData = account.account.data.parsed.info;
                        return {
                            token: tokenData.mint,
                            amount: tokenData.tokenAmount.amount,
                            value: tokenData.tokenAmount.uiAmount,
                            decimals: tokenData.tokenAmount.decimals,
                            icon: null
                        };
                    })
                    .filter(holding => holding.value > 0);

                setHoldings(transformedHoldings);
                
                if (transformedHoldings.length > 0) {
                    const tokenAddresses = transformedHoldings.map(h => h.token);
                    await Promise.all([
                        fetchTokenMetadata(tokenAddresses),
                        fetchAllQuotes(transformedHoldings)
                    ]);
                }
            } else {
                setHoldings([]);
            }
        } catch (err) {
            setError('Failed to fetch token data');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    // Initialize data when modal opens
    useEffect(() => {
        if (isOpen) {
            fetchTokenAccounts();
        }
    }, [isOpen, butterWalletCredentials]);

    // Handle token exit/selling functionality
    const handleExit = async (holding) => {
        if (!butterWalletCredentials) {
            alert('Please create butter wallet.');
            return;
        }

        try {
            setProcessingTokens(prev => new Set([...prev, holding.token]));
            setError(null);

            const requestData = {
                type: 'sell',
                amount: parseFloat(holding.value || 0),
                priorityFee: parseFloat(settings?.priorityFee || 0),
                slippage: parseFloat(settings?.slippage || 0),
                publicKey: butterWalletCredentials?.userpublickey || '',
                butterPublicKey: butterWalletCredentials?.publickey || '',
                butterSecretKey: butterWalletCredentials?.secretkey || '',
                contractAddress: holding?.token || '',
                channel: 'default',
                isJitoTrans: Boolean(isJitoIncluded),
                isJitoAmount: isJitoIncluded ? parseFloat(jitoAmount || 0) : 0
            };

            const response = await axios.post(`${API_BASE_URL}/api/trade`, requestData);

            if (response.status === 200) {
                await fetchTokenAccounts();
                alert('Trade submitted successfully');
            }
        } catch (error) {
            console.error('Trade submission error:', error);
            const errorMessage = error.response?.data?.error || error.message || 'Unknown error';
            alert(`Failed to submit trade: ${errorMessage}`);
        } finally {
            setProcessingTokens(prev => {
                const newSet = new Set(prev);
                newSet.delete(holding.token);
                return newSet;
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 backdrop-blur-xl bg-black/30" onClick={onClose} />
            
            <div className="relative bg-[#1C1C1C]/95 w-[600px] rounded-2xl overflow-hidden">
                {/* Header Section */}
                <div className="p-4 flex justify-between items-center border-b border-gray-800/50">
                    <h2 className="text-xl text-white font-bold">Holdings</h2>
                    <button 
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg text-gray-300 hover:bg-gray-700/50 transition-colors"
                        onClick={onClose}
                    >
                        ✕
                    </button>
                </div>

                {/* Wallet Address Row */}
                <div className="px-4 py-2 border-b border-gray-800/50 flex items-center">
                    <span className="text-gray-400 text-sm">Wallet:</span>
                    <span className="text-gray-400 text-sm ml-2">
                        {butterWalletCredentials?.publickey 
                            ? `${butterWalletCredentials.publickey.slice(0, 4)}...${butterWalletCredentials.publickey.slice(-4)}`
                            : ''
                        }
                    </span>
                    {butterWalletCredentials?.publickey && (
                        <button 
                            onClick={async () => {
                                try {
                                    const hasCopied = await copyHandler(butterWalletCredentials.publickey);
                                    if (hasCopied) {
                                        setWalletCopied(true);
                                        setTimeout(() => setWalletCopied(false), 800);
                                    }
                                } catch (error) {
                                    console.error("Copy error:", error);
                                }
                            }}
                            className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-gray-800 rounded-full hover:bg-gray-700 transition-all"
                        >
                            {walletCopied ? (
                                <svg className="w-2 h-2 text-[#00ff88]" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0" />
                                </svg>
                            ) : (
                                <svg className="w-2 h-2 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                                    <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z" />
                                </svg>
                            )}
                        </button>
                    )}
                </div>

                {/* Table Headers */}
                <div className="grid grid-cols-4 gap-4 p-4 text-gray-400 border-b border-gray-800/50">
                    <div>Token</div>
                    <div className="text-right"># of token</div>
                    <div className="text-right">Market Value (SOL)</div>
                    <div></div>
                </div>

                {/* Table Content */}
                <div className="max-h-[60vh] overflow-y-auto">
                    {isLoading || isLoadingQuotes ? (
                        <div className="text-center py-4 text-gray-400">Loading tokens...</div>
                    ) : error ? (
                        <div className="text-center py-4 text-red-400">{error}</div>
                    ) : holdings.length === 0 ? (
                        <div className="text-center py-4 text-gray-400">No tokens found</div>
                    ) : (
                        holdings.map((holding, index) => (
                            <div 
                                key={index} 
                                className="grid grid-cols-4 gap-4 p-4 items-center border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors"
                            >
                                {/* Token Information Column */}
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-800/50 rounded-full flex items-center justify-center overflow-hidden">
                                        {tokenMetadata[holding.token]?.image ? (
                                            <img 
                                                src={tokenMetadata[holding.token].image} 
                                                alt={tokenMetadata[holding.token].symbol} 
                                                className="w-6 h-6 object-cover"
                                            />
                                        ) : (
                                            <span className="text-sm font-bold text-blue-400">
                                                {tokenMetadata[holding.token]?.symbol?.[0] || holding.token.slice(0, 1)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-white font-medium">
                                            {tokenMetadata[holding.token]?.symbol || holding.token.slice(0, 8)}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {holding.token.slice(0, 8)}...
                                            <button 
                                                onClick={async () => {
                                                    try {
                                                        const hasCopied = await copyHandler(holding.token);
                                                        if (hasCopied) {
                                                            setCopiedStates(prev => ({...prev, [holding.token]: true}));
                                                            setTimeout(() => setCopiedStates(prev => ({...prev, [holding.token]: false})), 800);
                                                        }
                                                    } catch (error) {
                                                        console.error("Copy error:", error);
                                                    }
                                                }}
                                                className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-gray-800 rounded-full hover:bg-gray-700 transition-all"
                                            >
                                                {copiedStates[holding.token] ? (
                                                    <svg className="w-2 h-2 text-[#00ff88]" viewBox="0 0 16 16" fill="currentColor">
                                                        <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-2 h-2 text-gray-400" viewBox="0 0 16 16" fill="currentColor">
                                                        <path d="M4 2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zm2-1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V2a1 1 0 0 0-1-1zM2 5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1h1v1a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h1v1z" />
                                                    </svg>
                                                )}
                                            </button>
                                        </span>
                                    </div>
                                </div>

                                {/* Token Amount Column */}
                                <div className="text-right text-white">
                                    {Number(holding.value).toLocaleString()}
                                </div>

                                {/* Market Value Column */}
                                <div className="text-right text-white">
                                    {marketValues[holding.token] 
                                        ? marketValues[holding.token].toLocaleString(undefined, {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 8
                                          })
                                        : '---'
                                    } SOL
                                </div>

                                {/* Action Column */}
                                <div className="flex justify-end">
                                    <button 
                                        className={`px-4 py-1 text-sm font-medium ${
                                            processingTokens.has(holding.token)
                                                ? 'text-gray-500 cursor-not-allowed' 
                                                : 'text-red-400 hover:bg-red-400/10'
                                        } rounded-lg transition-colors`}
                                        onClick={() => handleExit(holding)}
                                        disabled={processingTokens.has(holding.token)}
                                    >
                                        {processingTokens.has(holding.token) ? 'Processing...' : 'Exit'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default TokenHoldings;
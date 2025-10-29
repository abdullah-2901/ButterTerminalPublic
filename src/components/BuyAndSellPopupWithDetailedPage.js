import React, { useContext, useEffect, useState,useCallback,useRef  } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark, faGear } from '@fortawesome/free-solid-svg-icons';
// import 'react-toastify/dist/ReactToastify.css';
import toast, { Toaster } from 'react-hot-toast';
import axios from 'axios';

import ButterTerminalContext from './ButterTerminalContext';
import "./styles/BuyAndSell.css";
import sol_Icon from '../assets/icons/solanaIcon.svg';
import max_icon from '../assets/icons/maxIcon.svg';

// API endpoints and constants
const JUPITER_API_BASE = 'https://quote-api.jup.ag/v6';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
// const HELIUS_WS_URL = 'wss://atlas-mainnet.helius-rpc.com/?api-key=';
const HELIUS_WS_URL = 'wss://mainnet.helius-rpc.com/?api-key=';
const MAX_RETRIES = 3;
const CONNECTION_TIMEOUT = 10000;
const RECONNECT_DELAY = 1000;
const toastOptions = {
  style: {
    background: '#333',
    color: '#fff',
    zIndex: 10000,
    borderRadius: '8px',
    fontSize: '14px'
  },
  success: {
    duration: 5000,
    iconTheme: {
      primary: '#00ff88',
      secondary: '#fff'
    }
  },
  error: {
    duration: 5000,
    iconTheme: {
      primary: '#ff3b3b',
      secondary: '#fff'
    }
  },
  loading: {
    duration: Infinity,
    iconTheme: {
      primary: '#fff',
      secondary: '#333'
    }
  }
};

export const useTransactionMonitor = () => {
  // State management with refs to avoid race conditions
  const wsRef = useRef(null);
  const subscriptionIdRef = useRef(null);
  const cleanupInProgressRef = useRef(false);
  
  // Regular state for UI updates
  const [transactionStatus, setTransactionStatus] = useState(null);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // Enhanced logging function
  // const console.log = (message, data = null) => {
  //   const timestamp = new Date().toISOString();
  //   console.log(`[${timestamp}] ${message}`);
  //   if (data) {
  //     console.log('Data:', JSON.stringify(data, null, 2));
  //   }
  // };

  // Unsubscribe function following Solana WebSocket API spec
  const unsubscribeFromSignature = useCallback(async () => {
    // console.log('Attempting to unsubscribe from signature');
    
    if (cleanupInProgressRef.current || !subscriptionIdRef.current) {
      return;
    }

    cleanupInProgressRef.current = true;
    const ws = wsRef.current;

    if (!ws || ws.readyState !== WebSocket.OPEN) {
      cleanupInProgressRef.current = false;
      return;
    }

    try {
      // Following exact Solana API format for unsubscribe
      const unsubscribeMessage = {
        jsonrpc: "2.0",
        id: 2,
        method: "signatureUnsubscribe",
        params: [subscriptionIdRef.current]
      };

      return new Promise((resolve) => {
        const handleUnsubscribeResponse = (event) => {
          const response = JSON.parse(event.data);
          if (response.id === 2) {
            ws.removeEventListener('message', handleUnsubscribeResponse);
            subscriptionIdRef.current = null;
            resolve();
          }
        };

        ws.addEventListener('message', handleUnsubscribeResponse);
        ws.send(JSON.stringify(unsubscribeMessage));
      });
    } finally {
      cleanupInProgressRef.current = false;
    }
  }, []);

  // Cleanup utility
  const cleanup = useCallback(async () => {
    if (subscriptionIdRef.current) {
      await unsubscribeFromSignature();
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsMonitoring(false);
    setRetryCount(0);
    cleanupInProgressRef.current = false;
  }, [unsubscribeFromSignature]);

  // WebSocket connection creation with timeout
  const createWebSocketConnection = useCallback(() => {
    return new Promise((resolve, reject) => {
      const websocket = new WebSocket(HELIUS_WS_URL);
      let timeoutId;

      const cleanupConnection = () => {
        clearTimeout(timeoutId);
        websocket.onopen = null;
        websocket.onerror = null;
      };

      timeoutId = setTimeout(() => {
        cleanupConnection();
        websocket.close();
        reject(new Error('WebSocket connection timeout'));
      }, CONNECTION_TIMEOUT);

      websocket.onopen = () => {
        cleanupConnection();
        resolve(websocket);
      };

      websocket.onerror = (error) => {
        cleanupConnection();
        reject(error);
      };

      return websocket;
    });
  }, []);

  const monitorTransaction = useCallback(async (signature) => {
    if (!signature) {
      throw new Error('Transaction signature is required');
    }
  
    // console.log(`Starting to monitor transaction: ${signature}`);
    await cleanup();
  
    // Show initial monitoring toast
    // const monitoringToast = toast.loading('Monitoring transaction...', {
    //   duration: Infinity // Keep the toast until we dismiss it
    // });
  
    return new Promise(async (resolve, reject) => {
      try {
        setIsMonitoring(true);
        setTransactionStatus('processing');
  
        const websocket = await createWebSocketConnection();
        wsRef.current = websocket;
        // console.log('WebSocket connection established');
  
        websocket.onmessage = (event) => {
          try {
            const response = JSON.parse(event.data);
            // console.log("Raw WebSocket Response:", response);
  
            // Handle subscription confirmation
            if (response.id === 1 && typeof response.result === 'number') {
              subscriptionIdRef.current = response.result;
              // console.log(`Subscription confirmed: ${response.result}`);
            }
  
            // Handle signature notifications
            if (response.method === 'signatureNotification') {
              const { result } = response.params;
  
              // Handle received signature notification
              if (result.value === 'receivedSignature') {
                toast.loading('Transaction received by network...', {
                  id: monitoringToast
                });
                return;
              }
  
              // Handle processed transaction notification
              if (result.value.err === null) {
                setTransactionStatus('confirmed');
                // toast.success('Transaction confirmed successfully!', {
                //   id: monitoringToast,
                //   duration: 5000
                // });
                cleanup();
                resolve(response); // Return the actual WebSocket response
              } else {
                setTransactionStatus('failed');
                toast.error('Transaction failed. Please try again.', {
                  id: monitoringToast,
                  duration: 5000
                });
                cleanup();
                reject(new Error('Transaction failed'));
              }
            }
          } catch (error) {
            // console.log('Error processing WebSocket message:', error);
            toast.error('Error processing transaction update', {
              id: monitoringToast,
              duration: 5000
            });
            reject(error);
          }
        };
  
        websocket.onerror = async (error) => {
          // console.log('WebSocket error occurred:', error);
          
          if (retryCount < MAX_RETRIES) {
            setRetryCount(prev => prev + 1);
            toast.loading(`Retrying connection (Attempt ${retryCount + 1}/${MAX_RETRIES})...`, {
              id: monitoringToast
            });
            await new Promise(r => setTimeout(r, RECONNECT_DELAY));
            await monitorTransaction(signature);
          } else {
            setTransactionStatus('error');
            toast.error('Failed to monitor transaction after several attempts', {
              id: monitoringToast,
              duration: 5000
            });
            cleanup();
            reject(new Error('Failed to monitor transaction'));
          }
        };
  
        websocket.onclose = () => {
          // console.log('WebSocket connection closed');
          if (isMonitoring) {
            cleanup();
            // Only show this if we weren't successful
            if (transactionStatus !== 'confirmed') {
              toast.error('Connection closed unexpectedly', {
                id: monitoringToast,
                duration: 5000
              });
            }
          }
        };
  
        // Send subscription request
        const subscribeMessage = {
          jsonrpc: "2.0",
          id: 1,
          method: "signatureSubscribe",
          params: [
            signature,
            {
              commitment: "finalized",
              enableReceivedNotification: true
            }
          ]
        };
        
        websocket.send(JSON.stringify(subscribeMessage));
  
      } catch (error) {
        // console.log('Error in monitoring setup:', error);
        toast.error('Failed to start transaction monitoring', {
          id: monitoringToast,
          duration: 5000
        });
        cleanup();
        reject(error);
      }
    });
  }, [cleanup, createWebSocketConnection, retryCount]);
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    transactionStatus,
    isMonitoring,
    monitorTransaction,
    unsubscribeFromSignature
  };
};
// Main BuyAndSellPopup component
const BuyAndSellPopup = ({ 
  isOpen, 
  onClose, 
  contractAddress, 
  channel, 
  type: initialType,
  tokenSymbol,
  setIsSettingsOpen,
  setIsLimitMode,
  isLimitMode,
  tokenIcon,
  currentType,
  setCurrentType,
  settings,
  icon,
  decimals
}) => {
  // Existing state
  const [formData, setFormData] = useState({
    amount: '',
    priorityFee: '',
    slippage: ''
  });
  const [selectedPercentage, setSelectedPercentage] = useState(null);
  const [isJitoIncluded, setIsJitoIncluded] = useState(false);
  const [jitoAmount, setJitoAmount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inputAmount, setInputAmount] = useState(0);
  const [quoteAmount, setQuoteAmount] = useState(0);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState(null);
  const [bestRoute, setBestRoute] = useState(null);
  const [isInsufficientBalance, setIsInsufficientBalance] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);

  // Initialize transaction monitoring
  
  const {
    transactionStatus: wsTransactionStatus,
    isMonitoring,
    monitorTransaction,
    unsubscribeFromSignature
  } = useTransactionMonitor();

  const { publicKey, connected } = useWallet();
  const { butterWalletSol, calculateSolBalance, butterWalletCredentials, calculateTokenBalance } = useContext(ButterTerminalContext);
  const [lastTransactionTime, setLastTransactionTime] = useState(null);

  // Enhanced balance update function
  const updateBalances = useCallback(async () => {
    if (!butterWalletCredentials?.publickey || !contractAddress) return;

    try {
      // Update SOL balance
      await calculateSolBalance(butterWalletCredentials.publickey);
      
      // Update token balance
      const newTokenBalance = await calculateTokenBalance(
        butterWalletCredentials.publickey,
        contractAddress,
        decimals
      );
      setTokenBalance(newTokenBalance);
    } catch (error) {
      console.error('Error updating balances:', error);
    }
  }, [butterWalletCredentials, contractAddress, calculateSolBalance, calculateTokenBalance, decimals]);

  // Update balances when popup opens
  useEffect(() => {
    if (isOpen) {
      updateBalances();
    }
  }, [isOpen, updateBalances]);

  // Update balances when wallet changes
  useEffect(() => {
    if (butterWalletCredentials?.publickey) {
      updateBalances();
    }
  }, [butterWalletCredentials, updateBalances]);

  // Update balances after successful transaction
  useEffect(() => {
    if (lastTransactionTime) {
      const updateAfterTransaction = async () => {
        // Wait a brief moment for blockchain to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        await updateBalances();
      };
      
      updateAfterTransaction();
    }
  }, [lastTransactionTime, updateBalances]);

  // useEffect(() => {
  //   if (isOpen) {
  //     toast.success('Ready to trade', {
  //       position: 'top-center',
  //       style: {
  //         background: '#00ff88',
  //         color: '#000'
  //       }
  //     });
  //   }
  // }, [isOpen]);
useEffect(() => {
    if (butterWalletCredentials?.publickey) {
      try {
        calculateSolBalance(butterWalletCredentials.publickey);
      } catch (error) {
        console.error('Invalid public key format:', error);
      }
    }
  }, [butterWalletCredentials]);

  // Quote fetching
  useEffect(() => {
    const amount = parseFloat(formData.amount);
    if (!isNaN(amount) && amount > 0) {
      const timeoutId = setTimeout(() => {
        fetchQuote(amount);
      }, 500);
      return () => clearTimeout(timeoutId);
    }
  }, [formData.amount, currentType, contractAddress, settings.slippage]);

  // Type update
  // useEffect(() => {
  //   setCurrentType(initialType);
  // }, [initialType]);

  // Balance update
  useEffect(() => {
    if (butterWalletCredentials?.publickey && contractAddress) {
      const updateBalances = async () => {
        calculateSolBalance(butterWalletCredentials.publickey);
        const balance = await calculateTokenBalance(
          butterWalletCredentials.publickey,
          contractAddress,
          decimals
        );
        setTokenBalance(balance);
      };
      
      updateBalances();
    }
  }, [currentType]);
  // Cleanup subscription when component unmounts
  useEffect(() => {
    return () => {
      unsubscribeFromSignature();
    };
  }, []);
  const handleInputChange = (e) => {
    const { value } = e.target;
    const validNumberPattern = /^\d*\.?\d*$/;
    
    if (value === '' || validNumberPattern.test(value)) {
      setFormData(prev => ({ ...prev, amount: value }));
      
      const inputAmount = parseFloat(value);
      if (currentType === 'buy') {
        setIsInsufficientBalance(inputAmount > parseFloat(butterWalletSol || 0));
      } else {
        setIsInsufficientBalance(inputAmount > parseFloat(tokenBalance || 0));
      }
      
      if (value === '') {
        setQuoteAmount(0);
        setBestRoute(null);
      }
    }
  };

  const handlePercentageClick = (percentage) => {
    if (currentType === 'buy') {
      const solBalance = parseFloat(butterWalletSol || 0);
      const amount = percentage.toString();
      setFormData({ amount });
      setSelectedPercentage(percentage);
      setIsInsufficientBalance(percentage > solBalance);
    } else {
      const maxAmount = parseFloat(tokenBalance || 0);
      const calculatedAmount = (maxAmount * (percentage / 100)).toFixed(6);
      setFormData({ amount: calculatedAmount });
      setSelectedPercentage(percentage);
      setIsInsufficientBalance(false);
    }
  };

  const fetchQuote = async (amount) => {
    if (!amount || amount <= 0 || !contractAddress) {
      setQuoteAmount(0);
      setBestRoute(null);
      return;
    }

    try {
      setIsLoadingQuote(true);
      setQuoteError(null);

      const inputMint = currentType === 'buy' ? SOL_MINT : contractAddress;
      const outputMint = currentType === 'buy' ? contractAddress : SOL_MINT;
      const inputDecimals = currentType === 'buy' ? 9 : decimals;
      const inputAmountInBaseUnits = Math.floor(amount * Math.pow(10, inputDecimals));

      const params = new URLSearchParams({
        inputMint,
        outputMint,
        amount: inputAmountInBaseUnits.toString(),
        slippageBps: Math.floor(settings.slippage * 100).toString(),
        onlyDirectRoutes: 'false',
      });

      const response = await fetch(`${JUPITER_API_BASE}/quote?${params}`);

      const quoteData = await response.json();

      if (quoteData) {

        setBestRoute(quoteData);
        
        let outputAmount;
        if (currentType === 'buy') {
          const rawAmount = quoteData.outAmount;
          const divisor = Math.pow(10, decimals);
          outputAmount = Number(rawAmount) / divisor;
        } else {
          const rawAmount = quoteData.outAmount;
          outputAmount = Number(rawAmount) / 1e9;
        }
        
        setQuoteAmount(outputAmount);
      }
    } catch (error) {
      console.error('Error fetching quote:', error);
      setQuoteError('Failed to fetch quote. Please try again.');
      setQuoteAmount(0);
      setBestRoute(null);
    } finally {
      setIsLoadingQuote(false);
    }
  };
  const showToast = {
    success: (message) => toast.success(message, toastOptions),
    error: (message) => toast.error(message, toastOptions),
    loading: (message, id) => toast.loading(message, { ...toastOptions, id }),
    dismiss: (id) => toast.dismiss(id)
  };

  const handleSubmit = async () => {
    if (!butterWalletCredentials) {
      showToast.error('Please create butter wallet first');
      return;
    }

    if (!connected) {
      showToast.error('Please connect your wallet first');
      return;
    }

    const toastId = showToast.loading('Preparing transaction...');

    try {
      setIsSubmitting(true);
      
 
  
      const requestData = {
        type: currentType,
        amount: parseFloat(formData.amount),
        priorityFee: parseFloat(settings.priorityFee),
        slippage: parseFloat(settings.slippage),
        publicKey: publicKey?.toString(),
        butterPublicKey: butterWalletCredentials.publickey,
        butterSecretKey: butterWalletCredentials.secretkey,
        contractAddress,
        channel,
        isJitoTrans: parseFloat(settings.priorityFee) > 0,
        isJitoAmount: parseFloat(settings.priorityFee) || 0
      };
  
      try {
        // Update submission status
        showToast.loading('Submitting transaction...', toastId);
  
        const response = await axios.post('https://trd.buttertrade.xyz/trade', requestData);
  
        if (response.status === 200 && response.data.Signature) {
          // Clear the submission toast as we're moving to monitoring
          
          
          // console.log(`Transaction submitted: ${response.data.Signature}`);
          
          try {
            // The monitoring process now handles its own toast notifications
            const wsResponse = await monitorTransaction(response.data.Signature);
            // console.log(wsResponse)
            showToast.dismiss(toastId);
            if (wsResponse.params.result.value.err==null)
            {
              showToast.success('Transaction confirmed successfully!'); 
              setLastTransactionTime(Date.now());           }
              
            // Log for debugging but don't show to user since toast is handled in monitor
            
  
          } catch (monitorError) {
            // console.error('Transaction monitoring error:', monitorError);

            // Monitor handles its own error toasts, no need to show another
            showToast.error('Error monitoring transaction: ' + monitorError.message);
          }
        } else {
          showToast.error('Failed to submit transaction - Invalid response');
        }
      } catch (submitError) {
        // console.error('Transaction submission error:', submitError);
        showToast.error('Transaction failed: ' + (error.response?.data?.message || error.message));
      }
    } catch (error) {
      // console.error('Unexpected error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  const isButtonDisabled = () => {
    // Check for insufficient balance
    if (isInsufficientBalance) return true;
    
    // Check if a transaction is in progress
    if (isSubmitting || isMonitoring) return true;
    
    // Check if the amount is empty or invalid
    if (!formData.amount || parseFloat(formData.amount) <= 0) return true;
    
    // Check if we have proper wallet setup
    if (!butterWalletCredentials || !connected) return true;
    
    return false;
  };
  
  // Get the appropriate button text based on current state
  const getButtonText = () => {
    if (isInsufficientBalance) return 'Insufficient Balance';
    if (isSubmitting || isMonitoring) return 'Processing...';
    if (!formData.amount || parseFloat(formData.amount) <= 0) return 'Enter Amount';
    if (!butterWalletCredentials) return 'Create Wallet First';
    if (!connected) return 'Connect Wallet';
    return currentType.toUpperCase();
  };
  
  // Get appropriate button styles based on state
  const getButtonStyles = () => {
    if (isButtonDisabled()) {
      return 'bg-gray-500 text-white cursor-not-allowed opacity-50';
    }
    
    return currentType === 'sell' 
      ? 'bg-[#ff3b3b] hover:bg-[#ff2d2d]' 
      : 'bg-[#00ff88] text-black hover:bg-[#00ee77]';
  };
  

  if (!isOpen) return null;





  return (
    <div className="h-full bg-[#141414] w-full p-4 text-white">
    {/* Toaster for notifications stays the same */}
    <Toaster 
      position="top-center"
      reverseOrder={false}
      containerStyle={{
        top: 60,
        zIndex: 10000
      }}
      toastOptions={toastOptions}
    />
       
        <div className="flex justify-between items-center mb-4">
        <div className="market__limit__main__button">
    <button 
        className={`text-sm font-medium ${
            !isLimitMode ? 'text-white border-b-2 border-[#00ff88]' : 'text-gray-400'
        }`}
    >
        Market
    </button>
    {/* <button 
        onClick={() => {
            onClose();  // Close BuyAndSell popup
            setIsLimitMode(true);  // Show Limit popup
        }}
        className={`px-3 py-1.5 text-sm font-medium ${
            isLimitMode ? 'text-white border-b-2 border-[#00ff88]' : 'text-gray-400'
        }`}
    >
        Limit
    </button> */}
</div>
    
 
</div>

        {/* Buy/Sell Toggle */}
        <div className="flex justify-between items-center w-full">
        <div className="bg-[#343735] w-fit rounded-[25px] p-0.5">
  <div className="flex w-fit">
    <button 
      className={`py-1.5 px-6 text-sm font-semibold transition-all rounded-[25px]
        ${currentType === 'buy' 
          ? 'bg-[#00ff88] text-white ' 
          : 'text-gray-400 hover:text-white'
        }`}
      onClick={() => setCurrentType('buy')}
    >
      BUY
    </button>
    <button 
      className={`py-1.5 px-6 text-sm font-semibold transition-all rounded-[25px]
        ${currentType === 'sell'
          ? 'bg-[#ff3b3b] text-white'
          : 'text-gray-400 hover:text-white'
        }`}
      onClick={() => setCurrentType('sell')}
    >
      SELL
    </button>
  </div>
</div>
  
<div 
  onClick={() => setIsSettingsOpen(true)}
  className="flex items-center gap-1.5 bg-black/60 px-3 py-1.5 rounded-lg cursor-pointer hover:bg-black/80"
>
  <FontAwesomeIcon icon={faGear} className="w-4 h-4 text-gray-400" />
  <span className="text-sm text-gray-400">{settings?.slippage}%</span>
</div>
</div>
        
        <div className='Horizontal__Line__Container'>
          <div className='h-[1px] w-full bg-[#FFFFFF]/15 rounded-sm'></div>
        </div>

        {/* You Pay Section */}
        <div className="bg-[#343735] rounded-lg p-4 pb-1 mb-4">
      <div className="flex justify-between">
        <div className="flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center"
              style={{ background: tokenIcon ? 'transparent' : '#1a1a1a' }}
            >
              {sol_Icon && currentType=='buy' ? 
                <img src={sol_Icon} alt={tokenSymbol} className="w-4 h-4 object-cover" /> :
                <img src={icon?icon:""} alt={""} className="w-4 h-4 object-cover" />
              }
            </div>
            <span>{currentType=='buy' ? "Sol" : tokenSymbol}</span>
          </div>
          
        </div>

        <div className="flex flex-col items-end w-2/3">
          <div className="text-xs text-gray-400 mb-0.5">YOU PAY</div>
          <input
            type="text"
            id="amount"
            value={formData.amount}
            onChange={handleInputChange}
            className="bg-transparent text-right text-xl font-bold focus:outline-none text-yellow-400"
            placeholder="0.0"
          />
        </div>
      </div>
      <div className="flex justify-between items-center">
            {currentType=='buy' ? (
              <span className="text-gray-400">
                Balance: {butterWalletSol || '0.0'} 
                {/* <button onClick={setInputAmount(inputAmount=tokenBalance)}>
                <img src={max_icon} alt={tokenSymbol} className="w-3 h-3 object-cover inline-block ml-1" />
                </button> */}
              </span>
            ) : (
              <span className="text-sm text-gray-400 flex items-center">
                Balance: {tokenBalance || '0'}
                {/* <button onClick={setInputAmount(inputAmount=tokenBalance)}>
                <img 
                  src={max_icon} 
                  alt={tokenSymbol} 
                  className="w-3 h-3 object-cover ml-1.5 inline-block" 
                /></button> */}
              </span>
            )}
          </div>
    </div>

        {/* Percentage Buttons */}
        {currentType=='buy'?
        <div className="w-2/3 flex justify-between gap-2 mb-4 ml-auto">
      {[0.05, 0.15, 1].map((percentage) => (
        <button
          key={percentage}
          onClick={() => handlePercentageClick(percentage)}
          className={`flex-1 py-2 rounded-[25px] text-sm transition-colors duration-200 flex items-center justify-center gap-1 ${
            selectedPercentage === percentage 
              ? 'bg-[#00ff88] text-white' 
              : 'bg-[#343735] text-gray-400'
          }`}
        >
          <img src={sol_Icon} alt={tokenSymbol} className="w-4 h-4 object-cover" />
          <span>{percentage}</span>
        </button>
      ))}
    </div>:
    <div className="w-2/3 flex justify-between gap-2 mb-4 ml-auto">
    {['15', '50', '100'].map((percentage) => (
      <button
        key={percentage}
        onClick={() => handlePercentageClick(percentage)}
        className={`flex-1 py-2 rounded-[25px] text-sm transition-colors duration-200 flex items-center justify-center gap-1 ${
          selectedPercentage === percentage 
            ? 'bg-[#ff3b3b] text-white' 
            : 'bg-[#343735] text-gray-400'
        }`}
      >
        <span>{percentage}%</span>
      </button>
    ))}
  </div>
    }

        

        {/* You Receive Section */}
        <div className="bg-[#343735] rounded-lg p-4 pb-1 mb-6">
        <div className="flex justify-between">
          <div className="flex flex-col justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center"
                style={{ background: tokenIcon ? 'transparent' : '#1a1a1a' }}
              >
                {sol_Icon && currentType=='buy' ? 
                <img src={icon?icon:""} alt={""} className="w-4 h-4 object-cover" />:
                <img src={sol_Icon} alt={tokenSymbol} className="w-4 h-4 object-cover" />
                }
              </div>
              <span>{currentType=='buy' ? tokenSymbol : 'Sol'}</span>
            </div>
          </div>

          <div className="flex flex-col items-end w-2/3">
              <div className="text-xs text-gray-400 mb-0.5">YOU RECEIVE</div>
              {isLoadingQuote ? (
                <div className="text-xl font-bold text-yellow-400">Loading...</div>
              ) : quoteError ? (
                <div className="text-sm text-red-400">{quoteError}</div>
              ) : (
                <div className="text-xl font-bold text-yellow-400">
                  {quoteAmount ? quoteAmount.toFixed(6) : '0.0'}
                  {bestRoute && (
                    <div className="text-xs text-gray-400 mt-1">
                      Price Impact: {(bestRoute.priceImpactPct * 100).toFixed(2)}%
                    </div>
                  )}
                </div>
              )}
            </div>
        </div>
        <div className="flex justify-between items-center">
          {currentType=='sell' ? (
            <span className="text-gray-400">
              Balance: {butterWalletSol || '0.0'}
            </span>
          ) : (
            <span className="text-sm text-gray-400 flex items-center">
              Balance: {tokenBalance || '0'}
            </span>
          )}
        </div>
      </div>

        {/* Submit Button */}
        <button
  onClick={handleSubmit}
  disabled={isButtonDisabled()}
  className={`w-full py-3.5 rounded-lg font-bold text-base transition-colors duration-200 ${getButtonStyles()}`}
>
  {getButtonText()}
</button>

      
    </div>
  );
};

export default BuyAndSellPopup;
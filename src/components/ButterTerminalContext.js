import axios from 'axios';
import React, { createContext, useEffect, useState, useCallback, useRef } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

const ButterTerminalContext = createContext();

const CHAINSTACK_API_URL = process.env.REACT_APP_CHAINSTACK_API_URL || '';
const BALANCE_UPDATE_INTERVAL = 5000; // 5 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const ButterTerminalContextProvider = ({ children }) => {
    // State management
    let [butterWalletCredentials, setButterWalletCredentials] = useState(null);
    const [butterWalletSolBalance, setButterWalletSolBalance] = useState(0);
    const [butterWalletSol, setButterWalletSol] = useState(0);
    const [isUpdatingBalance, setIsUpdatingBalance] = useState(false);
    
    // Refs for managing updates
    const lastUpdateTime = useRef(0);
    const updateTimeoutRef = useRef(null);
    const retryCountRef = useRef(0);
    
    const { connection } = useConnection();

    // Helper function to implement retry logic with exponential backoff
    const withRetry = async (operation, errorMessage) => {
        let delay = RETRY_DELAY;
        
        for (let i = 0; i < MAX_RETRIES; i++) {
            try {
                const result = await operation();
                retryCountRef.current = 0; // Reset counter on success
                return result;
            } catch (error) {
                console.error(`${errorMessage} (Attempt ${i + 1}/${MAX_RETRIES}):`, error);
                
                if (i === MAX_RETRIES - 1) {
                    throw error; // Throw on final retry
                }
                
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }
    };
    
    const getTokenAccountsByOwner = async (walletAddress) => {
        const options = {
            method: 'POST',
            url: CHAINSTACK_API_URL,
            headers: {
                accept: 'application/json',
                'content-type': 'application/json'
            },
            data: {
                id: 1,
                jsonrpc: '2.0',
                method: 'getTokenAccountsByOwner',
                params: [
                    walletAddress,
                    { programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA' },
                    { encoding: 'jsonParsed' }
                ]
            }
        };
    
        try {
            const response = await axios.request(options);
            return response.data;
        } catch (error) {
            console.error('Chainstack API Error:', error);
            throw error;
        }
    };

    const getWallet = async (address) => {
        try {
            if (!address) {
                console.error('No address provided to getWallet');
                return false;
            }
            
            const response = await withRetry(
                async () => axios.get('https://trd.buttertrade.xyz/api/walletsinfo', {
                    params: { publicKey: address.toString() }
                }),
                'Error fetching wallet info'
            );

            if (response.data.success && Array.isArray(response.data.data) && response.data.data.length > 0) {
                const walletData = response.data.data[0];
                setButterWalletCredentials(walletData);
                await updateAllBalances(address, walletData.publickey);
                return true;
            }

            setButterWalletCredentials(null);
            return false;
        } catch (error) {
            console.error('Error fetching wallet:', error);
            setButterWalletCredentials(null);
            return false;
        }
    };

    const createNewButterWallet = async (address) => {
        try {
            const response = await axios.post('https://trd.buttertrade.xyz/api/newbutterwallet', {
                publicKey: address
            });

            if (response.data.success && response.data.data) {
                setButterWalletCredentials(response.data.data);
                return true;
            }
            return false;
        } catch (error) {
            throw new Error(error);
        }
    };

    const calculateSolBalance = useCallback(async (key) => {
        if (!key) {
            // Don't reset to 0 immediately - keep previous value
            return;
        }
    
        const operation = async () => {
            try {
                const publicKeyObject = new PublicKey(key);
                const sol = await connection.getBalance(publicKeyObject) / LAMPORTS_PER_SOL;
                
                setButterWalletSol(prevBalance => {
                    // Only update if there's a significant change or we got a valid number
                    const difference = Math.abs(prevBalance - sol);
                    if (sol > 0 && (!isNaN(sol) || difference > 0.000001)) {
                        return sol;
                    }
                    return prevBalance; // Keep existing balance if the new one is invalid/zero
                });
            } catch (err) {
                console.error("Error fetching SOL balance:", err);
                // Don't update on error - keep previous balance
                return;
            }
        };
    
        await withRetry(operation, 'Error calculating SOL balance');
    }, [connection]);

    const getButterSolBalance = useCallback(async (key) => {
        if (!key) {
            setButterWalletSolBalance(0);
            return;
        }

        const operation = async () => {
            const publicKeyObject = new PublicKey(key);
            const sol = await connection.getBalance(publicKeyObject) / LAMPORTS_PER_SOL;
            
            setButterWalletSolBalance(prevBalance => {
                const difference = Math.abs(prevBalance - sol);
                if (difference > 0.000001) {
                    return sol;
                }
                return prevBalance;
            });
        };

        await withRetry(operation, 'Error calculating Butter SOL balance');
    }, [connection]);

    const updateAllBalances = useCallback(async (walletKey, butterWalletKey) => {
        if (isUpdatingBalance) return;
        
        const now = Date.now();
        if (now - lastUpdateTime.current < BALANCE_UPDATE_INTERVAL) {
            // Clear any existing timeout
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
            
            // Schedule update for later
            updateTimeoutRef.current = setTimeout(() => {
                updateAllBalances(walletKey, butterWalletKey);
            }, BALANCE_UPDATE_INTERVAL - (now - lastUpdateTime.current));
            
            return;
        }

        try {
            setIsUpdatingBalance(true);
            lastUpdateTime.current = now;

            await Promise.all([
                walletKey ? calculateSolBalance(walletKey) : Promise.resolve(),
                butterWalletKey ? getButterSolBalance(butterWalletKey) : Promise.resolve()
            ]);
        } catch (error) {
            console.error('Error updating balances:', error);
        } finally {
            setIsUpdatingBalance(false);
        }
    }, [calculateSolBalance, getButterSolBalance, isUpdatingBalance]);

    const findAssociatedTokenAddress = async (walletAddress, tokenMintAddress) => {
        // The token account address is deterministically derived from the wallet and mint
        const [associatedToken] = await PublicKey.findProgramAddressSync(
            [
                new PublicKey(walletAddress).toBuffer(),
                new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA').toBuffer(),
                new PublicKey(tokenMintAddress).toBuffer(),
            ],
            new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL')
        );
        return associatedToken;
    };
    
    const calculateTokenBalance = async (walletKey, tokenMintAddress, decimals = 9) => {
        if (!walletKey || !tokenMintAddress) {
            return 0;
        }
    
        try {
            // Convert string addresses to PublicKey objects
            const walletPubkey = new PublicKey(walletKey);
            const mintPubkey = new PublicKey(tokenMintAddress);
    
            // Find the associated token account address
            const tokenAccount = await findAssociatedTokenAddress(
                walletPubkey,
                mintPubkey
            );
    
            // Get all token accounts owned by the wallet
            const tokenAccountInfo = await connection.getTokenAccountBalance(tokenAccount);
            
            // If the account exists, return its balance
            if (tokenAccountInfo?.value) {
                // The balance comes in base units, so we divide by 10^decimals
                return parseFloat(tokenAccountInfo.value.uiAmount || 0);
            }
    
            return 0;
        } catch (error) {
            // console.error('Error calculating token balance:', error);
            return 0;
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (updateTimeoutRef.current) {
                clearTimeout(updateTimeoutRef.current);
            }
        };
    }, []);

    // Value to be provided to consuming components
    const value = {
        createNewButterWallet,
        setButterWalletSol,
        calculateTokenBalance,
        getTokenAccountsByOwner,
        butterWalletCredentials,
        setButterWalletCredentials,
        butterWalletSolBalance,
        butterWalletSol,
        calculateSolBalance,
        getButterSolBalance,
        getWallet,
        updateAllBalances,
        isUpdatingBalance,
    };

    return (
        <ButterTerminalContext.Provider value={value}>
            {children}
        </ButterTerminalContext.Provider>
    );
};

export default ButterTerminalContext;
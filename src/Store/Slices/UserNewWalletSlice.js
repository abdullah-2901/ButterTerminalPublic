import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// First, let's expand the initial state to include our new butter wallet properties
const initialState = {
    // Existing state properties
    user_wallet_detail: null,
    user_new_wallet_balance: null,
    user_subscription_data: null,
    // New butter wallet properties
    butterWalletCredentials: null,
    butterWalletSol: 0,
    // Status management
    status: 'idle',
    error: null
};

// Your existing local storage helper
const loadStateFromLocalStorage = () => {
    try {
        const serializedState = localStorage.getItem('userAccountState');
        if (serializedState === null) {
            return undefined;
        }
        return JSON.parse(serializedState);
    } catch (err) {
        console.error("Error loading state:", err);
        return undefined;
    }
};

// Let's create new async thunks for butter wallet operations
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://api.example.com';
export const getButterWallet = createAsyncThunk(
    'UserNewWalletDetails/getButterWallet',
    async (address) => {
        try {
            const response = await axios.get(`${API_BASE_URL}/api/walletsinfo`, {
                params: { publicKey: address.toString() }
            });

            if (response.data.success && Array.isArray(response.data.data)) {
                if (response.data.data.length > 0) {
                    return response.data.data[0];
                }
            }
            return null;
        } catch (error) {
            throw error;
        }
    }
);

export const createButterWallet = createAsyncThunk(
    'UserNewWalletDetails/createButterWallet',
    async (address) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/api/newbutterwallet`, {
                publicKey: address
            });

            if (response.data.success && response.data.data) {
                return response.data.data;
            }
            throw new Error('Failed to create butter wallet');
        } catch (error) {
            throw error;
        }
    }
);

// Your existing initialize wallet thunk
export const initializeWallet = createAsyncThunk(
    'UserNewWalletDetails/initializeWallet',
    async (_, { getState }) => {
        const state = loadStateFromLocalStorage();
        if (state && state.wallet) {
            const response = await axios.post(`${API_BASE_URL}/api/initial-state`, 
                { publicKey: state.wallet }
            );
            return {
                user_wallet_detail: response.data.data.user_wallet_detail || null,
                user_new_wallet_balance: response.data.data.user_new_wallet_balance || 0,
                user_subscription_data: response.data.data.user_subscription_data || null,
            };
        }
        return initialState;
    }
);

const UserNewWalletDetails = createSlice({
    name: 'UserNewWalletDetails',
    initialState,
    reducers: {
        // Existing reducers
        saveUserDetail: (state, action) => {
            state.user_wallet_detail = action.payload;
        },
        saveNewBalance: (state, action) => {
            state.user_new_wallet_balance = action.payload;
        },
        saveSubscriptionData: (state, action) => {
            state.user_subscription_data = action.payload;
        },
        // New reducers for butter wallet
        setButterWalletSol: (state, action) => {
            state.butterWalletSol = action.payload;
        },
        clearButterWallet: (state) => {
            state.butterWalletCredentials = null;
            state.butterWalletSol = 0;
        }
    },
    extraReducers: (builder) => {
        builder
            // Existing cases for initializeWallet
            .addCase(initializeWallet.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(initializeWallet.fulfilled, (state, action) => {
                state.status = 'succeeded';
                state.user_wallet_detail = action.payload.user_wallet_detail;
                state.user_new_wallet_balance = action.payload.user_new_wallet_balance;
                state.user_subscription_data = action.payload.user_subscription_data;
            })
            .addCase(initializeWallet.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            // New cases for butter wallet operations
            .addCase(getButterWallet.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(getButterWallet.fulfilled, (state, action) => {
                state.butterWalletCredentials = action.payload;
                state.status = 'succeeded';
            })
            .addCase(getButterWallet.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            })
            .addCase(createButterWallet.pending, (state) => {
                state.status = 'loading';
            })
            .addCase(createButterWallet.fulfilled, (state, action) => {
                state.butterWalletCredentials = action.payload;
                state.status = 'succeeded';
            })
            .addCase(createButterWallet.rejected, (state, action) => {
                state.status = 'failed';
                state.error = action.error.message;
            });
    }
});

// Export actions and reducer
export const { 
    saveUserDetail, 
    saveNewBalance, 
    saveSubscriptionData,
    setButterWalletSol,
    clearButterWallet 
} = UserNewWalletDetails.actions;

export default UserNewWalletDetails.reducer;
import { configureStore } from "@reduxjs/toolkit";
import MintNumberSlice from "./Slices/MintNumberSlice";
import UserAccountDetailsSlice from "./Slices/UserAccountDetailsSlice";
import UserNewWalletDetails from './Slices/UserNewWalletSlice';
import StrategySlice from './Slices/StrategyData';

// Create store with middleware and devTools configuration
const store = configureStore({
    reducer: {
        UserDetail: UserAccountDetailsSlice,
        totalMint: MintNumberSlice,
        UserNewWalletInfo: UserNewWalletDetails,
        StrategyData: StrategySlice
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore these specific action types
                ignoredActions: ['UserNewWalletDetails/initializeWallet/fulfilled'],
                // Ignore these field paths in the state
                ignoredPaths: ['UserNewWalletInfo.error']
            }
        }),
    devTools: process.env.NODE_ENV !== 'production'
});

// Helper function to check the state structure
const logState = () => {
    const state = store.getState();
    // console.log('Current Store State:', state);
    // console.log('UserNewWalletInfo State:', state.UserNewWalletInfo);
};

// For debugging
export const getState = () => store.getState();

// Log initial state
logState();

export { store };
import { createSlice } from "@reduxjs/toolkit";

const loadState = () => {
    try {
        const serializedState = localStorage.getItem('userAccountState');
        if (serializedState === null) {
            return undefined;
        }
        return JSON.parse(serializedState);
    } catch (err) {
        return undefined;
    }
};

const saveState = (state) => {
    try {
        const serializedState = JSON.stringify(state);
        localStorage.setItem('userAccountState', serializedState);
    } catch (err) {
        // Ignore write errors
        // console.log(err);

    }
};

const initialState = loadState() || {
    butterBalance: 0,
    SOLBalance: 0,
    wallet: null,
    loading: false,
    error: null
};

const UserAccountDetailsReducer = createSlice({
    name: "UserAccountDetailsReducer",
    initialState,
    reducers: {
        setButterBalance: (state, action) => {
            state.butterBalance = action.payload;
            saveState(state);
        },
        setSOLBalance: (state, action) => {
            state.SOLBalance = action.payload;
            saveState(state);
        },
        setWallet: (state, action) => {
            state.wallet = action.payload;
            saveState(state);
        },
        setLoading: (state, action) => {
            state.loading = action.payload;
        },
        setError: (state, action) => {
            state.error = action.payload;
        },
        loadSavedState: (state) => {
            const savedState = loadState();
            if (savedState) {
                return { ...state, ...savedState };
            }
        }
    }
});

export const { setButterBalance, setSOLBalance, setWallet, setLoading, setError, loadSavedState } = UserAccountDetailsReducer.actions;
export default UserAccountDetailsReducer.reducer;
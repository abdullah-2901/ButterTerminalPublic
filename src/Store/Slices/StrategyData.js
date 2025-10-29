import { createSlice } from "@reduxjs/toolkit";


const initialState = {
    allAvailableStrategies: [
        {
            title: 'Surf The Bolinger Bands',
            description: 'AI won’t replace designers, but designers who use <br /> AI will replace those who don’t. Similar to how <br /> calculators were once thought to replace',
            specs: {
                returnExpected: '96%',
                riskFactor: 'High',
                userPopularity: '8.5m'
            },
            totalValueLocked: '50000/70000',
            barPercentage: '65%'
        },
        {
            title: 'Surf The Bolinger Bands',
            description: 'AI won’t replace designers, but designers who use <br /> AI will replace those who don’t. Similar to how <br /> calculators were once thought to replace',
            specs: {
                returnExpected: '96%',
                riskFactor: 'High',
                userPopularity: '8.5m'
            },
            totalValueLocked: '50000/70000',
            barPercentage: '65%'
        },
        {
            title: 'Surf The Bolinger Bands',
            description: 'AI won’t replace designers, but designers who use <br /> AI will replace those who don’t. Similar to how <br /> calculators were once thought to replace',
            specs: {
                returnExpected: '96%',
                riskFactor: 'High',
                userPopularity: '8.5m'
            },
            totalValueLocked: '50000/70000',
            barPercentage: '65%'
        },
    ],
    selectedStrategy: null,
    selectedTab: 'account'
};


const StrategySlice = createSlice({
    name: 'StrategySlice',
    initialState,
    reducers: {
        setNewStrategy: (state, action) => {
            state.selectedStrategy = action.payload;
        },
        setNewTab: (state, action) => {
            // Validate tab value before setting
            const validTabs = ['account', 'deposit', 'withdraw'];
            if (validTabs.includes(action.payload)) {
                state.selectedTab = action.payload;
            }
        }
    }
});

export const { setNewStrategy, setNewTab } = StrategySlice.actions;
export default StrategySlice.reducer;
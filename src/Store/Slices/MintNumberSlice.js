import { createSlice } from "@reduxjs/toolkit";


const initialState = {
    totalNFtsMint: 1
};


const MintNumberSlice = createSlice({
    name: 'MintNumberSlice',
    initialState: initialState,
    reducers: {
        incrementNFT: (state) => {
            if (state.totalNFtsMint < 5) {
                state.totalNFtsMint += 1;
            }
        },
        decrementNFT: (state) => {
            if (state.totalNFtsMint > 1) {
                state.totalNFtsMint -= 1;
            }
        },
        setNFTValue: (state, action) => {
            const value = action.payload;
            if (value >= 1 && value <= 5) {
                state.totalNFtsMint = value;
            }
        }
    }
})


export const { incrementNFT, decrementNFT, setNFTValue } = MintNumberSlice.actions;
export default MintNumberSlice.reducer; 
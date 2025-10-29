import { configureStore } from '@reduxjs/toolkit';

// Initial state for the UserDetail slice
const initialState = {
  UserDetail: {
    SOLBalance: 0,
    // Add other initial state properties as needed
  }
};

// Create a reducer
const rootReducer = (state = initialState, action) => {
  switch (action.type) {
    // Add cases for different actions
    default:
      return state;
  }
};

// Configure the store
const store = configureStore({
  reducer: rootReducer
});

export default store;
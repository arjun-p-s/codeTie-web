import { createSlice } from "@reduxjs/toolkit";

const connectionRequestSlice = createSlice({
  name: "Requests",
  initialState: [],
  reducers: {
    addConnectionRequest: (state, action) => action.payload,
    removeConnectionRequest: (state, action) => {
      const newArray = state.filter((r) => r._id !== action.payload);
      return newArray;
    },
  },
});

export const { addConnectionRequest, removeConnectionRequest } =
  connectionRequestSlice.actions;
export default connectionRequestSlice.reducer;

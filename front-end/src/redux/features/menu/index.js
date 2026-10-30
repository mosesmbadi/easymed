import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  showChild: true,
};

const MenuSlice = createSlice({
  name: "menu",
  initialState,
  reducers: {
    setShowChild: (state, action) => {
      state.showChild = action.payload;
    },
  },
});

export const { setShowChild } = MenuSlice.actions;

export const toggleShowMenu = () => async (dispatch, getState) => {
    const currentShowChild = getState().menu.showChild;
    dispatch(setShowChild(!currentShowChild));
};


export default MenuSlice.reducer;

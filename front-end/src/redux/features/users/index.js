import { createSlice } from "@reduxjs/toolkit";
import { getAllUsers, getUserById ,resetPassword} from "@/redux/service/user";


const initialState = {
  users: [],
  password: {},
  userProfile: {}
};

const UserSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    setUsers: (state, action) => {
      state.users = action.payload;
    },
    setUserProfile: (state, action) => {
      state.userProfile = action.payload;
    },
    setUserPassword: (state, action) => {
      state.password = action.payload;
    },
  },
});

export const { setUsers, setUserProfile, setUserPassword } = UserSlice.actions;


export const getAllTheUsers = (auth) => async (dispatch) => {
  try {
    const response = await getAllUsers(auth);
    dispatch(setUsers(response));
  } catch (error) {
    console.log("ALL_USERS_ERROR ", error);
  }
};

export const getCurrentUser = (auth) => async (dispatch) => {
  try {
    const response = await getUserById(auth);
    dispatch(setUserProfile(response));
  } catch (error) {
    console.log("ALL_USERS_ERROR ", error);
  }
};

export const resetUserPassword = (auth) => async (dispatch) => {
  try {
    const response = await resetPassword(auth);
    dispatch(setUserPassword(response));
  } catch (error) {
    console.log("ALL_USERS_ERROR ", error);
  }
};

export default UserSlice.reducer;
import { createSlice } from "@reduxjs/toolkit";
import { fetchAnnouncements, fetchAnnouncementChannels } from "@/redux/service/announcements";


const initialState = {
  announcements: [],
  channels: [],
};

const AnnouncementSlice = createSlice({
  name: "announcements",
  initialState,
  reducers: {
    setAnnouncements: (state, action) => {
      state.announcements = action.payload;
    },
    setAnnouncementsChannels: (state, action) => {
        state.channels = action.payload;
    },
    updateChannel: (state, action) => {
      // Find the index of the item with the same id as action.payload.id
      const index = state.channels.findIndex(channel => parseInt(channel.id) === parseInt(action.payload.id));
      
      if (index !== -1) {
        // Update the item at the found index with the new data from action.payload
        state.channels[index] = {
          ...state.channels[index], // Keep existing properties
          ...action.payload       // Override with new data
        };
      }
    },
  },
});

export const { setAnnouncements, setAnnouncementsChannels, updateChannel } = AnnouncementSlice.actions;


export const getAllAnnouncements = (auth) => async (dispatch) => {
  try {
    const response = await fetchAnnouncements(auth);
    dispatch(setAnnouncements(response));
  } catch (error) {
    console.log("Announcements_ERROR ", error);
  }
};

export const getAllAnnouncementsChannels = (auth) => async (dispatch) => {
    try {
      const response = await fetchAnnouncementChannels(auth);
      dispatch(setAnnouncementsChannels(response));
    } catch (error) {
      console.log("Announcements_Channels_ERROR ", error);
    }
};

export const updateAChannelItemStore = (channel) => (dispatch) => {
  dispatch(updateChannel(channel));
};


export default AnnouncementSlice.reducer;

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './features/auth'
import patientReducer from './features/patients'
import inventoryReducer from './features/inventory'
import insuranceReducer from './features/insurance'
import appointmentReducer from './features/appointment'
import doctorReducer from './features/doctors'
import labReducer from './features/laboratory'
import billingReducer from './features/billing'
import prescriptionsReducer from './features/pharmacy'
import userReducer from './features/users'
import AnnouncementReducer from './features/announcements'
import MenuReducer from './features/menu'
import CompanyReducer from './features/company'
import inpatientReducer from "./features/inpatient";



export const store = configureStore({
    reducer:{
        auth: authReducer,
        patient: patientReducer,
        inventory: inventoryReducer,
        insurance: insuranceReducer,
        appointment: appointmentReducer,
        doctor: doctorReducer,
        laboratory: labReducer,
        billing: billingReducer,
        prescription: prescriptionsReducer,
        user: userReducer,
        announcement: AnnouncementReducer,
        menu: MenuReducer,
        company: CompanyReducer,
        inpatient: inpatientReducer
    }
})
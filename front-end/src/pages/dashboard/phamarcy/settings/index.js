import React, { useState } from 'react';
import { Container, Box, Tab, Tabs } from '@mui/material';
import DashboardLayout from '@/components/layout/dashboard-layout';
import AuthGuard from '@/assets/hoc/auth-guard';
import ProtectedRoute from '@/assets/hoc/protected-route';
import PhamarcyNav from '@/components/dashboard/pharmacy/PhamarcyNav';
import DrugCategories from '@/components/dashboard/pharmacy/DrugCategories';
import DrugModes from '@/components/dashboard/pharmacy/DrugModes';
import DrugStates from '@/components/dashboard/pharmacy/DrugStates';
import Drugs from '@/components/dashboard/pharmacy/Drugs';

function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ py: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const PharmacySettings = () => {
    const [value, setValue] = useState(0);

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    return (
        <Container maxWidth="xl">
            <PhamarcyNav />
            <Box sx={{ width: '100%', mt: 2 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={value} onChange={handleChange} aria-label="pharmacy settings tabs">
                        <Tab label="Categories" id="settings-tab-0" />
                        <Tab label="Modes of Administration" id="settings-tab-1" />
                        <Tab label="States" id="settings-tab-2" />
                        <Tab label="Drug Names" id="settings-tab-3" />
                    </Tabs>
                </Box>
                <TabPanel value={value} index={0}>
                    <DrugCategories />
                </TabPanel>
                <TabPanel value={value} index={1}>
                    <DrugModes />
                </TabPanel>
                <TabPanel value={value} index={2}>
                    <DrugStates />
                </TabPanel>
                <TabPanel value={value} index={3}>
                    <Drugs />
                </TabPanel>
            </Box>
        </Container>
    );
};

PharmacySettings.getLayout = (page) => (
    <ProtectedRoute permission={'CAN_ACCESS_PHARMACY_DASHBOARD'}>
        <AuthGuard>
            <DashboardLayout>{page}</DashboardLayout>
        </AuthGuard>
    </ProtectedRoute>
);

export default PharmacySettings;

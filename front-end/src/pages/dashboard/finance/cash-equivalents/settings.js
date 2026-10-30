import React, { useState, useEffect } from "react";
import { Container, Box, Tabs, Tab } from "@mui/material";
import DashboardLayout from "@/components/layout/dashboard-layout";
import ProtectedRoute from "@/assets/hoc/protected-route";
import AuthGuard from "@/assets/hoc/auth-guard";
import CashEquivalentsNav from "@/components/dashboard/finance/CashEquivalentsNav";

import MainAccountDataGrid from "@/components/dashboard/finance/cash-equivalents/MainAccountDataGrid";
import SubAccountDataGrid from "@/components/dashboard/finance/cash-equivalents/SubAccountDataGrid";
import { fetchPaymentModes, fetchMainAccounts } from "@/redux/service/billing";
import { useAuth } from "@/assets/hooks/use-auth";

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const CashEquivalentsSettings = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [paymentModes, setPaymentModes] = useState([]);
    const [mainAccounts, setMainAccounts] = useState([]);
    const auth = useAuth();

    const handleTabChange = (event, newValue) => {
      setCurrentTab(newValue);
    };

    const loadLookups = async () => {
      try {
        const modes = await fetchPaymentModes(auth);
        setPaymentModes(modes);

        const accounts = await fetchMainAccounts(auth);
        setMainAccounts(accounts);
      } catch (e) {
        console.error("Failed to fetch lookups", e);
      }
    };

    useEffect(() => {
      if (auth) {
        loadLookups();
      }
    }, [auth]);

    return (
        <Container maxWidth="xl" className="my-8">
            <CashEquivalentsNav />
            <section className="bg-white p-4 rounded shadow-md min-h-[400px]">
                <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                    <Tabs
                        value={currentTab}
                        onChange={handleTabChange}
                        aria-label="cash equivalents settings tabs"
                    >
                        <Tab label="Main Accounts" />
                        <Tab label="Sub Accounts" />
                    </Tabs>
                </Box>
                <TabPanel value={currentTab} index={0}>
                    <MainAccountDataGrid />
                </TabPanel>
                <TabPanel value={currentTab} index={1}>
                    <SubAccountDataGrid mainAccounts={mainAccounts} paymentModes={paymentModes} />
                </TabPanel>
            </section>
        </Container>
    );
};

CashEquivalentsSettings.getLayout = (page) => (
    <ProtectedRoute permission={"CAN_ACCESS_BILLING_DASHBOARD"}>
        <AuthGuard>
            <DashboardLayout>{page}</DashboardLayout>
        </AuthGuard>
    </ProtectedRoute>
);

export default CashEquivalentsSettings;


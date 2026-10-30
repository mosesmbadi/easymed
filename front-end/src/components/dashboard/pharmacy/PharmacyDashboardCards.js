import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    Grid,
    IconButton,
    Button,
    Divider,
    Stack
} from '@mui/material';
import {
    Warning as WarningIcon,
    Inventory as InventoryIcon,
    Print as PrintIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { useAuth } from '@/assets/hooks/use-auth';
import { APP_API_URL } from '@/assets/api-endpoints';
import { toast } from 'react-toastify';
import axios from 'axios';
import { downloadPharmacyReportPDF } from '@/redux/service/pdfs';

const PharmacyDashboardCards = () => {
    const auth = useAuth();
    const [metrics, setMetrics] = useState({
        short_expiries: 0,
        reorder_levels: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchMetrics = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get(APP_API_URL.PHARMACY_DASHBOARD_METRICS, {
                headers: { Authorization: `Bearer ${auth?.token}` }
            });
            setMetrics(response.data);
        } catch (error) {
            console.error("Failed to fetch pharmacy metrics", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (auth?.token) {
            fetchMetrics();

            // Auto-refresh every 30 seconds
            const interval = setInterval(fetchMetrics, 30000);
            return () => clearInterval(interval);
        }
    }, [auth]);

    const handlePrint = async (type) => {
        try {
            toast.info("Generating report...");
            const response = await downloadPharmacyReportPDF(type, auth);
            window.open(response.url, '_blank');
            toast.success("Report ready");
        } catch (error) {
            console.error("Failed to generate report", error);
            toast.error("Failed to generate report");
        }
    };

    const MetricCard = ({ title, value, icon, color, type }) => (
        <Card sx={{ height: '100%', boxShadow: 2, borderRadius: 1 }}>
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                    <Box sx={{
                        backgroundColor: `${color}.light`,
                        borderRadius: '50%',
                        p: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {React.cloneElement(icon, { fontSize: 'small' })}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h5" fontWeight="bold" color={`${color}.main`}>
                            {value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1, textTransform: 'uppercase', fontWeight: 'bold' }}>
                            {title}
                        </Typography>
                    </Box>
                </Stack>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 0.5 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PrintIcon fontSize="small" />}
                        onClick={() => handlePrint(type)}
                        sx={{ fontSize: '0.7rem', py: 0.25, px: 1, minWidth: 'auto' }}
                    >
                        Print
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" fontWeight="bold">Pharmacy Inventory Metrics</Typography>
                <IconButton onClick={fetchMetrics} size="small" color="primary">
                    <RefreshIcon fontSize="small" />
                </IconButton>
            </Box>
            <Grid container spacing={2} justifyContent="flex-start">
                <Grid item xs={12} sm={4} md={3} lg={2.5}>
                    <MetricCard
                        title="Short Expiries"
                        value={metrics.short_expiries}
                        icon={<WarningIcon sx={{ color: 'warning.main' }} />}
                        color="warning"
                        type="expiry"
                    />
                </Grid>
                <Grid item xs={12} sm={4} md={3} lg={2.5}>
                    <MetricCard
                        title="Re-order Levels"
                        value={metrics.reorder_levels}
                        icon={<InventoryIcon sx={{ color: 'error.main' }} />}
                        color="error"
                        type="reorder"
                    />
                </Grid>
            </Grid>
        </Box>
    );
};

export default PharmacyDashboardCards;

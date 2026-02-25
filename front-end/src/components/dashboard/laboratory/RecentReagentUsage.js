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
    Timer as TimerIcon,
    Warning as WarningIcon,
    Inventory as InventoryIcon,
    Print as PrintIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { downloadLabReportPDF } from '@/redux/service/pdfs';
import { useAuth } from '@/assets/hooks/use-auth';
import { APP_API_URL } from '@/assets/api-endpoints';
import { toast } from 'react-toastify';
import axios from 'axios';

const LabDashboardCards = () => {
    const auth = useAuth();
    const [metrics, setMetrics] = useState({
        late_pending: 0,
        pending_tat: 0,
        short_expiries: 0,
        reorder_levels: 0
    });
    const [isLoading, setIsLoading] = useState(true);

    const fetchMetrics = async () => {
        try {
            setIsLoading(true);
            const response = await axios.get(APP_API_URL.LAB_DASHBOARD_METRICS, {
                headers: { Authorization: `Bearer ${auth?.token}` }
            });
            setMetrics(response.data);
        } catch (error) {
            console.error("Failed to fetch lab metrics", error);
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
            const response = await downloadLabReportPDF(type, auth);
            window.open(response.url, '_blank');
            toast.success("Report ready");
        } catch (error) {
            console.error("Failed to generate lab report", error);
            toast.error("Failed to generate report");
        }
    };

    const MetricCard = ({ title, value, icon, color, type, subtitle }) => (
        <Card sx={{ height: '100%', boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                    <Box sx={{
                        backgroundColor: `${color}.light`,
                        borderRadius: '50%',
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        {icon}
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
                            {value}
                        </Typography>
                        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
                            {title}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: '0.75rem', display: 'block' }}>
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                </Stack>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                    <Button
                        size="small"
                        variant="outlined"
                        startIcon={<PrintIcon />}
                        onClick={() => handlePrint(type)}
                    >
                        Print
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );

    return (
        <Box sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" fontWeight="bold">Lab Performance & Inventory Metrics</Typography>
                <IconButton onClick={fetchMetrics} size="small" color="primary">
                    <RefreshIcon />
                </IconButton>
            </Box>
            <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                    <MetricCard
                        title="Pending Tests"
                        value={metrics.pending_tat}
                        subtitle={`${metrics.late_pending} Exceeded TAT`}
                        icon={<TimerIcon sx={{ color: 'primary.main' }} />}
                        color="primary"
                        type="tat"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
                    <MetricCard
                        title="Short Expiries"
                        value={metrics.short_expiries}
                        icon={<WarningIcon sx={{ color: 'warning.main' }} />}
                        color="warning"
                        type="expiry"
                    />
                </Grid>
                <Grid item xs={12} md={4}>
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

export default LabDashboardCards;

/* 
// Previous Reagent Usage Component commented out as requested
const RecentReagentUsage = () => {
    ...
}
*/

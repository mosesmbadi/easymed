import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    LinearProgress,
    Chip,
    Grid,
    Skeleton,
    Alert,
    Tooltip,
    IconButton
} from '@mui/material';
import {
    Science as ScienceIcon,
    TrendingDown as TrendingDownIcon,
    Warning as WarningIcon,
    Error as ErrorIcon,
    CheckCircle as CheckCircleIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';
import { fetchRecentReagentUsage } from '@/redux/service/laboratory';
import { useAuth } from '@/assets/hooks/use-auth';
import { format } from 'date-fns';

const RecentReagentUsage = () => {
    const auth = useAuth();
    const [recentReagents, setRecentReagents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadRecentUsage = async () => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await fetchRecentReagentUsage(auth);
            setRecentReagents(data);
        } catch (err) {
            setError(err.message || 'Failed to load recent reagent usage');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadRecentUsage();
        
        // Auto-refresh every 60 seconds
        const interval = setInterval(() => {
            loadRecentUsage();
        }, 60000);
        
        return () => clearInterval(interval);
    }, [auth]);

    const getStockColor = (stockPercentage, isOutOfStock, isLowStock) => {
        if (isOutOfStock) return 'error';
        if (isLowStock) return 'warning';
        if (stockPercentage >= 100) return 'success';
        if (stockPercentage >= 50) return 'info';
        return 'warning';
    };

    const getStockIcon = (isOutOfStock, isLowStock) => {
        if (isOutOfStock) return <ErrorIcon fontSize="small" />;
        if (isLowStock) return <WarningIcon fontSize="small" />;
        return <CheckCircleIcon fontSize="small" />;
    };

    const formatLastUsed = (dateString) => {
        if (!dateString) return 'Unknown';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            const diffHours = Math.floor(diffMs / 3600000);

            if (diffMins < 1) return 'Just now';
            if (diffMins < 60) return `${diffMins} min ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            return format(date, 'MMM dd, HH:mm');
        } catch (e) {
            return 'Unknown';
        }
    };

    if (error) {
        return (
            <Card sx={{ mb: 3, boxShadow: 2 }}>
                <CardContent>
                    <Alert severity="error">
                        Failed to load recent reagent usage: {error || 'Unknown error'}
                    </Alert>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card sx={{ mb: 3, boxShadow: 3, borderRadius: 2 }}>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ScienceIcon color="primary" fontSize="large" />
                        <Typography variant="h5" component="h2" fontWeight="bold">
                            Recently Used Reagents (24h)
                        </Typography>
                    </Box>
                    <Tooltip title="Refresh">
                        <IconButton onClick={loadRecentUsage} size="small" color="primary">
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                {isLoading ? (
                    <Grid container spacing={2}>
                        {[1, 2, 3, 4].map((item) => (
                            <Grid item xs={12} sm={6} md={3} key={item}>
                                <Skeleton variant="rectangular" height={120} sx={{ borderRadius: 1 }} />
                            </Grid>
                        ))}
                    </Grid>
                ) : recentReagents && recentReagents.length > 0 ? (
                    <Grid container spacing={2}>
                        {recentReagents.map((reagent, index) => {
                            const stockPercentage = Math.round(reagent.stock_percentage);
                            const stockColor = getStockColor(
                                stockPercentage,
                                reagent.is_out_of_stock,
                                reagent.is_low_stock
                            );

                            return (
                                <Grid item xs={12} sm={6} md={3} key={index}>
                                    <Card
                                        variant="outlined"
                                        sx={{
                                            height: '100%',
                                            borderLeft: 4,
                                            borderLeftColor: `${stockColor}.main`,
                                            transition: 'transform 0.2s, box-shadow 0.2s',
                                            '&:hover': {
                                                transform: 'translateY(-4px)',
                                                boxShadow: 4
                                            }
                                        }}
                                    >
                                        <CardContent>
                                            {/* Reagent Name */}
                                            <Tooltip title={reagent.reagent_name}>
                                                <Typography
                                                    variant="subtitle1"
                                                    fontWeight="bold"
                                                    noWrap
                                                    gutterBottom
                                                    sx={{ fontSize: '0.95rem' }}
                                                >
                                                    {reagent.reagent_name}
                                                </Typography>
                                            </Tooltip>

                                            {/* Reagent Code */}
                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                sx={{ display: 'block', mb: 1 }}
                                            >
                                                {reagent.reagent_code}
                                            </Typography>

                                            {/* Stock Level */}
                                            <Box sx={{ mb: 1 }}>
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                                    <Typography variant="body2" color="text.secondary">
                                                        Available Tests
                                                    </Typography>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {reagent.available_tests}
                                                    </Typography>
                                                </Box>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(stockPercentage, 100)}
                                                    color={stockColor}
                                                    sx={{ height: 8, borderRadius: 1 }}
                                                />
                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                                                    Threshold: {reagent.minimum_threshold}
                                                </Typography>
                                            </Box>

                                            {/* Status & Last Used */}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
                                                <Chip
                                                    icon={getStockIcon(reagent.is_out_of_stock, reagent.is_low_stock)}
                                                    label={
                                                        reagent.is_out_of_stock
                                                            ? 'Out of Stock'
                                                            : reagent.is_low_stock
                                                            ? 'Low Stock'
                                                            : 'In Stock'
                                                    }
                                                    color={stockColor}
                                                    size="small"
                                                    sx={{ fontWeight: 'bold' }}
                                                />
                                            </Box>

                                            {/* Last Used Time */}
                                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <TrendingDownIcon fontSize="small" color="action" />
                                                <Typography variant="caption" color="text.secondary">
                                                    {formatLastUsed(reagent.last_used)}
                                                </Typography>
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            );
                        })}
                    </Grid>
                ) : (
                    <Alert severity="info" icon={<ScienceIcon />}>
                        No reagents have been used in the last 24 hours.
                    </Alert>
                )}
            </CardContent>
        </Card>
    );
};

export default RecentReagentUsage;

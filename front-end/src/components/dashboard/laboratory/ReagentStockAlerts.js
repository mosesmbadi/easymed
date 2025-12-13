import React, { useState, useEffect } from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  Card,
  CardContent,
  IconButton,
  Collapse,
  Chip,
  Typography,
  Badge,
  Tooltip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Science as ScienceIcon,
} from '@mui/icons-material';
import { useGetLowStockReagentsQuery } from '../../../redux/service/laboratory';

const ReagentStockAlerts = () => {
  const [expanded, setExpanded] = useState(true);
  const { data: lowStockData, isLoading, refetch } = useGetLowStockReagentsQuery();

  useEffect(() => {
    // Refetch every 5 minutes
    const interval = setInterval(() => {
      refetch();
    }, 300000);

    return () => clearInterval(interval);
  }, [refetch]);

  if (isLoading) return null;

  const outOfStock = lowStockData?.filter(item => item.available_tests <= 0) || [];
  const lowStock = lowStockData?.filter(item => item.available_tests > 0) || [];

  if (!lowStockData || lowStockData.length === 0) return null;

  return (
    <Card 
      sx={{ 
        mb: 2, 
        border: '2px solid',
        borderColor: outOfStock.length > 0 ? 'error.main' : 'warning.main',
      }}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={1}>
            <Badge badgeContent={lowStockData.length} color="error">
              <ScienceIcon color={outOfStock.length > 0 ? 'error' : 'warning'} />
            </Badge>
            <Typography variant="h6" component="div">
              Reagent Stock Alerts
            </Typography>
          </Box>
          <IconButton onClick={() => setExpanded(!expanded)} size="small">
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        <Collapse in={expanded}>
          <Box mt={2}>
            {outOfStock.length > 0 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>Out of Stock ({outOfStock.length})</AlertTitle>
                {outOfStock.map((item) => (
                  <Box
                    key={item.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={0.5}
                  >
                    <Typography variant="body2">
                      <strong>{item.reagent_item_name}</strong>
                    </Typography>
                    <Chip
                      icon={<ErrorIcon />}
                      label="0 tests"
                      color="error"
                      size="small"
                    />
                  </Box>
                ))}
              </Alert>
            )}

            {lowStock.length > 0 && (
              <Alert severity="warning">
                <AlertTitle>Low Stock ({lowStock.length})</AlertTitle>
                {lowStock.map((item) => (
                  <Box
                    key={item.id}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    py={0.5}
                  >
                    <Typography variant="body2">
                      <strong>{item.reagent_item_name}</strong>
                    </Typography>
                    <Tooltip 
                      title={`Minimum threshold: ${item.minimum_threshold} tests`}
                      arrow
                    >
                      <Chip
                        icon={<WarningIcon />}
                        label={`${item.available_tests} tests`}
                        color="warning"
                        size="small"
                      />
                    </Tooltip>
                  </Box>
                ))}
              </Alert>
            )}
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default ReagentStockAlerts;

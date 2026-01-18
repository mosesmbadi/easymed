import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  CircularProgress,
  Grid,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { useGetReagentConsumptionReportQuery } from '../../../redux/service/laboratory';
import { format } from 'date-fns';

const ReagentConsumptionReport = () => {
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [endDate, setEndDate] = useState(new Date());

  const { data: reportData, isLoading, refetch } = useGetReagentConsumptionReportQuery({
    start_date: format(startDate, 'yyyy-MM-dd'),
    end_date: format(endDate, 'yyyy-MM-dd'),
  });

  const handleDownloadCSV = () => {
    if (!reportData || reportData.length === 0) return;

    const csvContent = [
      ['Reagent', 'Tests Consumed', 'Test Panels Used', 'Period'],
      ...reportData.map(item => [
        item.reagent_name,
        item.total_consumed,
        item.test_panels.join(', '),
        `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`,
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `reagent_consumption_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.csv`;
    link.click();
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" component="div">
              Reagent Consumption Report
            </Typography>
            <Box display="flex" gap={1}>
              <Tooltip title="Refresh">
                <IconButton onClick={refetch} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download CSV">
                <IconButton 
                  onClick={handleDownloadCSV} 
                  color="primary"
                  disabled={!reportData || reportData.length === 0}
                >
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Grid container spacing={2} mb={3}>
            <Grid item xs={12} sm={5}>
              <DatePicker
                label="Start Date"
                value={startDate}
                onChange={(newValue) => setStartDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
                maxDate={endDate}
              />
            </Grid>
            <Grid item xs={12} sm={5}>
              <DatePicker
                label="End Date"
                value={endDate}
                onChange={(newValue) => setEndDate(newValue)}
                renderInput={(params) => <TextField {...params} fullWidth />}
                minDate={startDate}
                maxDate={new Date()}
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button
                variant="contained"
                fullWidth
                sx={{ height: '100%' }}
                onClick={refetch}
              >
                Generate
              </Button>
            </Grid>
          </Grid>

          {isLoading ? (
            <Box display="flex" justifyContent="center" py={4}>
              <CircularProgress />
            </Box>
          ) : reportData && reportData.length > 0 ? (
            <>
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'primary.main' }}>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                        Reagent
                      </TableCell>
                      <TableCell align="center" sx={{ color: 'white', fontWeight: 'bold' }}>
                        Tests Consumed
                      </TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>
                        Used By Test Panels
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportData.map((item, index) => (
                      <TableRow
                        key={index}
                        sx={{ '&:hover': { backgroundColor: 'action.hover' } }}
                      >
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <TrendingDownIcon color="error" fontSize="small" />
                            <Typography variant="body2" fontWeight="medium">
                              {item.reagent_name}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="center">
                          <Chip
                            label={item.total_consumed}
                            color="primary"
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box display="flex" flexWrap="wrap" gap={0.5}>
                            {item.test_panels.map((panel, idx) => (
                              <Chip
                                key={idx}
                                label={panel}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Report Period:</strong> {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Total Reagents:</strong> {reportData.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Total Tests Consumed:</strong>{' '}
                  {reportData.reduce((sum, item) => sum + item.total_consumed, 0)}
                </Typography>
              </Box>
            </>
          ) : (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                No consumption data available for the selected period
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </LocalizationProvider>
  );
};

export default ReagentConsumptionReport;

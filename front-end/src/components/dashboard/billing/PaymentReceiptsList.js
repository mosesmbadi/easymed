import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Chip,
} from '@mui/material';
import { DataGrid } from 'devextreme-react';
import {
  Column,
  Paging,
  FilterRow,
  HeaderFilter,
  SearchPanel,
  Sorting,
} from 'devextreme-react/data-grid';
import { Print as PrintIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '@/assets/hooks/use-auth';
import { fetchPaymentReceipts } from '@/redux/service/billing';
import { toast } from 'react-toastify';

const PaymentReceiptsList = () => {
  const auth = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReceipts = async () => {
    if (!auth) return;
    
    setLoading(true);
    try {
      const data = await fetchPaymentReceipts(auth);
      setReceipts(data);
    } catch (error) {
      toast.error('Failed to load payment receipts');
      console.error('Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [auth]);

  const handlePrintReceipt = async (receiptId) => {
    try {
      const resp = await fetch(`/api/billing/payment-receipt?id=${receiptId}`, {
        headers: {
          'Authorization': `Bearer ${auth?.token}`,
        }
      });
      
      if (!resp.ok) {
        const txt = await resp.text();
        toast.error(txt || 'Failed to download receipt');
      } else {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
    } catch (error) {
      toast.error('Error downloading receipt');
      console.error('Error:', error);
    }
  };

  const renderPrintButton = (cellData) => {
    return (
      <Button
        variant="outlined"
        size="small"
        startIcon={<PrintIcon />}
        onClick={() => handlePrintReceipt(cellData.data.id)}
        sx={{ textTransform: 'none' }}
      >
        Print
      </Button>
    );
  };

  const renderCustomerName = (cellData) => {
    const { patient_name, insurance_name } = cellData.data;
    return (
      <Box>
        <Typography variant="body2">
          {patient_name || insurance_name || 'N/A'}
        </Typography>
        <Chip
          label={patient_name ? 'Cash' : 'Credit'}
          size="small"
          color={patient_name ? 'success' : 'primary'}
          sx={{ mt: 0.5, height: '20px', fontSize: '0.7rem' }}
        />
      </Box>
    );
  };

  const renderAmount = (cellData) => {
    return `KES ${parseFloat(cellData.value || 0).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const renderDate = (cellData) => {
    const date = cellData.value ? new Date(cellData.value) : null;
    return date ? date.toLocaleDateString('en-GB') : 'N/A';
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="h2">
            Payment Receipts
          </Typography>
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={16} /> : <RefreshIcon />}
            onClick={loadReceipts}
            disabled={loading}
            sx={{ textTransform: 'none' }}
          >
            Refresh
          </Button>
        </Box>

        <DataGrid
          dataSource={receipts}
          showBorders={true}
          rowAlternationEnabled={true}
          columnAutoWidth={true}
          wordWrapEnabled={true}
          height={500}
        >
          <FilterRow visible={true} />
          <HeaderFilter visible={true} />
          <SearchPanel visible={true} placeholder="Search receipts..." />
          <Paging defaultPageSize={10} />
          <Sorting mode="multiple" />

          <Column
            dataField="id"
            caption="Receipt #"
            width={100}
            alignment="center"
          />
          
          <Column
            caption="Customer"
            cellRender={renderCustomerName}
            width={180}
          />

          <Column
            dataField="payment_mode.mode_name"
            caption="Payment Mode"
            width={150}
          />

          <Column
            dataField="total_amount"
            caption="Amount"
            cellRender={renderAmount}
            width={130}
            alignment="right"
          />

          <Column
            dataField="reference_number"
            caption="Reference"
            width={150}
          />

          <Column
            dataField="payment_date"
            caption="Payment Date"
            cellRender={renderDate}
            width={120}
            dataType="date"
          />

          <Column
            dataField="created_at"
            caption="Created At"
            cellRender={renderDate}
            width={120}
            dataType="date"
          />

          <Column
            caption="Actions"
            cellRender={renderPrintButton}
            width={120}
            alignment="center"
            allowFiltering={false}
            allowSorting={false}
          />
        </DataGrid>
      </CardContent>
    </Card>
  );
};

export default PaymentReceiptsList;

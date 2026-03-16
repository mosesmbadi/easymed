import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from 'devextreme-react';
import {
  Column,
  Paging,
  Pager,
  FilterRow,
  HeaderFilter,
  SearchPanel,
  Sorting,
} from 'devextreme-react/data-grid';
import { Print as PrintIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { useAuth } from '@/assets/hooks/use-auth';
import { toast } from 'react-toastify';
import { formatMoney } from '@/functions/money';

const allowedPageSizes = [5, 10, 20, 'all'];

const SupplierPaymentReceiptsList = () => {
  const auth = useAuth();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReceipts = async () => {
    if (!auth) return;

    setLoading(true);
    try {
      const resp = await fetch('/api/inventory/supplier-payment-receipts', {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      if (!resp.ok) throw new Error('Failed to fetch');
      const data = await resp.json();
      setReceipts(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      toast.error('Failed to load supplier payment receipts');
      console.error('Error loading supplier receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReceipts();
  }, [auth]);

  const handlePrintReceipt = async (receiptId) => {
    try {
      const resp = await fetch(
        `/api/inventory/supplier-payment-receipts/${receiptId}/print`,
        { headers: { Authorization: `Bearer ${auth?.token}` } }
      );

      if (!resp.ok) {
        toast.error('Failed to download receipt');
        return;
      }

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      toast.error('Error downloading receipt');
      console.error('Error:', error);
    }
  };

  const renderPrintButton = (cellData) => (
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

  const renderAmount = (cellData) => formatMoney(cellData.value || 0);

  const renderInvoices = (cellData) => {
    const nums = cellData.data?.invoice_numbers;
    if (Array.isArray(nums) && nums.length > 0) return nums.join(', ');

    const allocs = cellData.data?.allocations;
    if (Array.isArray(allocs) && allocs.length > 0) {
      return [...new Set(allocs.map((a) => a.invoice_no).filter(Boolean))].join(', ');
    }
    return 'N/A';
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
            Supplier Payment Receipts
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
          <Pager
            visible={true}
            allowedPageSizes={allowedPageSizes}
            displayMode="full"
            showPageSizeSelector={true}
            showInfo={true}
            showNavigationButtons={true}
          />
          <Sorting mode="multiple" />

          <Column dataField="id" caption="Receipt #" width={100} alignment="center" />

          <Column dataField="supplier_name" caption="Supplier" width={200} />

          <Column
            dataField="sub_account_name"
            caption="Payment Account"
            width={180}
          />

          <Column
            caption="Paid Invoice(s)"
            width={220}
            cellRender={renderInvoices}
            allowHeaderFiltering={false}
          />

          <Column
            dataField="total_amount"
            caption="Amount"
            cellRender={renderAmount}
            width={130}
            alignment="right"
          />

          <Column dataField="reference_number" caption="Reference" width={150} />

          <Column
            dataField="payment_date"
            caption="Payment Date"
            cellRender={renderDate}
            width={120}
            dataType="date"
          />

          <Column
            dataField="created_at"
            caption="Created"
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

export default SupplierPaymentReceiptsList;

//------------------------ Backend APIs ----------------------//
export const API_URL = {
  /***************** AUTHENTICATION APIS **********************/
  REGISTER_USER: "/users/register/",
  CREATE_USER: "/users/register/",
  LOGIN: "/users/login/",
  REFRESH_TOKEN: "/api/token/refresh/",
  PASSWORD_RESET: "/customuser/password-reset/request/",
  CHANGE_PASSWORD: "/customuser/password-reset/confirm/",
  ADMIN_CHANGE_PASSWORD: "/customuser/users/",
  GET_USER_PERMISSIONS: "/authperms/permissions/user",
  CREATE_GROUP: "/authperms/groups/add",
  ADD_PERMISSION: "/authperms/groups/permissions/add",
  FETCH_GROUP: "/authperms/groups",
  FETCH_ALL_PERMISSIONS: "/authperms/permissions",
  FETCH_GROUP_PERMISSIONS: "/authperms/groups/",

  /***************** PATIENT APIS **********************/
  CREATE_PATIENT: "/patients/patients/",
  EDIT_PATIENT: "/patients/patients",
  DELETE_PATIENT: "/patients/patients/",
  FETCH_PATIENT: "/patients/patients/",
  FETCH_PATIENT_BY_ID: "/patients/patients",
  PATIENT_KIN: "/patients/next-of-kin/",
  PATIENT_KIN_CONTACT: "/patients/contact-details/",
  SEARCH_PATIENT: "/patients/patients/",
  BOOK_APPOINTMENT: "/patients/publicappointments/",
  CREATE_APPOINTMENT: "/patients/appointments/",
  FETCH_APPOINTMENTS: "/patients/publicappointments/",
  FETCH_PATIENT_APPOINTMENTS: "/patients/appointments",
  FETCH_PATIENT_APPOINTMENTS_BY_PATIENT_ID: "/patients/appointments/by_patient_id",
  FETCH_DOCTOR_APPOINTMENTS: "/patients/appointments/",
  FETCH_SERVICES: "/patients/services/",
  FETCH_INSURANCE: "/company/insurance-companies/",
  PRESCRIBE: "/patients/prescriptions/",
  ASSIGN_DOCTOR: "/patients/appointments",
  CONSULT_PATIENT: "/patients/consultations/",
  REFER_PATIENT: "/patients/referrals/",
  GET_PATIENT_PROFILE: "/patients/patients",
  PRESCRIBE_DRUG: "/patients/prescribed-drugs/",
  PRESCRIBE_DRUG_BY_PATIENT_ID: "/patients/prescribed-drugs/by_patient_id",
  CREATE_PRESCRIPTION: "/patients/prescriptions/",
  GET_PATIENT_TRIAGE: "/patients/triage/",

  PATIENT_ATTENDANCE_PROCESS: "/patients/initiate-attendance-process/",

  /***************** AI TRIAGE APIS **********************/
  AI_TRIAGE_REQUEST: "/roby/triage/request/",
  AI_TRIAGE_RESULTS: "/roby/triage/results/",

  /***************** DOCTOR APIS **********************/
  CREATE_DOCTOR: "/accounts/register/",
  FETCH_DOCTOR: "/users/doctors/",

  /***************** CUSTOM USERS APIS **********************/
  FETCH_NURSES: "/customuser/nurses/",

  /***************** LABORATORY APIS **********************/
  FETCH_LAB_RESULTS: "/lab/lab-test-results/",
  SEND_LAB_RESULTS: "/lab/lab-test-results/",
  FETCH_LAB_REQUESTS: "/lab/lab-test-requests/",
  FETCH_ONE_LAB_REQUESTS: "/lab/lab-test-requests/",
  FETCH_LAB_REQUESTS_BY_PATIENT_ID: "/lab/lab-test-request-by-patient-id",
  SEND_LAB_REQUESTS: "/lab/lab-test-requests/",
  FETCH_LAB_EQUIPMENT: "/lab/lab-equipment/",
  SEND_TO_EQUIPMENT: "/lab/equipment-test-request/",
  PUBLIC_LAB_REQUEST: "/lab/public-lab-test-request/",
  FETCH_LAB_TEST_PROFILE: "/lab/lab-test-profile/",
  FETCH_LAB_TEST_PANELS: "/lab/lab-test-panel/",
  FETCH_LAB_TEST_PANELS_BY_PROFILE_ID: "/lab/lab-test-panel/labtestpanels-byprofile-id",
  FETCH_LAB_TEST_REQUEST_PANELS: "/lab/lab-test-requests-panel/",
  FETCH_PANELS_BY_RESULT: "/lab/lab-test-result-panels-by-lab-test-result-id/",
  FETCH_QUALITATIVE_PANELS_BY_RESULT: "/lab/qualitative-lab-test-result-panels-by-lab-test-result-id/",
  FETCH_LAB_TEST_RESULT_PANELS: "/lab/lab-test-results-panel/",
  QUALITATIVE_LAB_TEST_RESULTS: "/lab/lab-test-results-qualitative/",
  QUALITATIVE_LAB_TEST_RESULTS_PANEL_ITEM: "/lab/lab-test-results-panel-qualitative/",
  GET_LAB_TEST_PANELS_BY_LAB_TEST_REQUEST_ID: "lab/lab-test-request-panels-by-lab-test-request-id/",
  SEND_LAB_RESULTS_ITEMS: "/lab/lab-test-result-item/",
  APPROVE_LAB_RESULTS: "/lab/approve-results/",
  APPROVE_QUALITATIVE_LAB_RESULTS: "/lab/approve-qualitative-results/",
  PHARMACY_DASHBOARD_METRICS: "/pharmacy/pharmacy-dashboard-metrics/",
  PRINT_PHARMACY_REPORT: "/pharmacy/print-pharmacy-report/",
  LAB_TEST_REQ_BY_PROCESS_ID: "lab/lab-test-request-by-process-id/",
  SAMPLES_BY_process_ID: "/lab/patient-samples-by-process-id/",
  PANELS_BY_SAMPLE_ID: "/lab/labtestrequestpanels/sample/",
  PHLEBOTOMY_PATIENT_SAMPLES: "/lab/patient-samples/",
  SPECIMENS: "/lab/specimens/",
  REFERENCE_VALUES: "/lab/reference-values/",
  LAB_TEST_INTERPRETATIONS: "/lab/lab-test-interpretations/",
  PRINT_LAB_REPORT: "/lab/print-lab-report/",
  LAB_SETTINGS: "/lab/lab-settings/",
  LAB_DASHBOARD_METRICS: "/lab/lab-dashboard-metrics/",

  /***************** INVENTORY APIS **********************/
  ADD_INVENTORY: "/inventory/inventories/",
  FETCH_INVENTORY: "/inventory/inventories/",
  FETCH_SUPPLIERS: "/inventory/suppliers/",
  FETCH_ITEMS: "/inventory/items/",
  DELETE_ITEM: "/inventory/items",
  FETCH_ORDER_BILL: "/inventory/orderbill/",
  REQUISITION: "/inventory/requisition/",
  REQUISITION_ITEM: "/inventory/requisition/",
  PURCHASE_ORDER: "/inventory/",
  PURCHASE_ORDER_ITEM: "/inventory/purchase-order-item/",
  FETCH_INCOMING_ITEMS: "/inventory/incoming-item/",
  FETCH_SUPPLIER_INVOICE: "/inventory/supplier-invoice/",
  FETCH_INVOICE: "/inventory/supplier_invoice_pdf/",
  FETCH_GOODS_RECEIPT_NOTE: "/inventory/goods-receipt-note/",
  FETCH_DEPARTMENTS: "/inventory/departments/",
  FETCH_LOW_QUANTITY: "/inventory/inventory_filter/",

  /***************** NURSING APIS **********************/
  ADD_TRIAGE: "/patients/triage/",


  /***************** BILLING APIS **********************/
  FETCH_PATIENT_BILLING_APPOINTMENTS: "/patients/appointments",
  FETCH_PATIENT_BILLING_LAB_REQUEST: "/lab/lab-test-request-by-patient-id",
  FETCH_PATIENT_BILLING_PRESCRIBED_DRUG: "/patients/prescribed-drugs/by_patient_id",
  BILLING_INVOICE_ITEMS: "/billing/invoice-items/",
  BILLING_INVOICES: "/billing/invoices/",
  PAY_INVOICES: "/billing/invoice-payments/",
  FETCH_INVOICES: "/billing/invoices/",
  FeTCH_PATIENT_INVOICES: "/billing/invoices/patient/",
  FETCH_INVOICE_ITEMS_BY_INVOICE: "/billing/invoices/items/",
  TOTALS_OF_THE_DAY: "/reports/total_payment_mode_amount/",
  PAYMENT_MODES: "/billing/payment-modes/",
  INSURANCE_INVENTORY_PRICES: "/inventory/insurance-item-prices/",

  /***************** PRESCRIPRION **********************/
  FETCH_PRESCRIPTION: "/patients/prescriptions",
  FETCH_PUBLIC_PRESCRIPTION: "/pharmacy/public-prescription-requests/",
  PATIENTPRESCRIPTIONREQUEST: "/pharmacy/public-prescription-requests/",
  FETCH_PRESCRIBED_DRUGS: "/patients/prescribed-drugs/",
  FETCH_PRESCRIPTIONS_PRESCRIBED_DRUGS: "/patients/prescribed-drugs/by-prescription",
  DRUG_CATEGORIES: "/pharmacy/drug-categories/",
  DRUG_MODES: "/pharmacy/drug-modes/",
  DRUG_STATES: "/pharmacy/drug-states/",
  DRUGS: "/pharmacy/drugs/",

  /***************** User **********************/
  GET_USER_NAME: "/users/users",
  FETCH_ALL_USERS: "/users/users/",
  FETCH_USER_BY_ID: "/users/users",

  /***************** Announcements **********************/
  FETCH_ANNOUNCEMENTS_CHANNELS: "/announcement/channels/",
  FETCH_ANNOUNCEMENTS: "/announcement/announcements/",

  /***************** Company **********************/
  FETCH_COMPANY_INFO: "/company/company/",

  /***************** PDFs **********************/
  DOWNLOAD_PDF: "/download",
  DOWNLOAD_RESULT_PDF: "/lab/download",
  SALE_BY_DATE_RANGE_PDF: "/sale_by_date/pdf/",
  SALE_BY_DATE_RANGE_AND_ITEM_PDF: "/serve_sales_by_item_id_pdf/",

  /***************** REPORTS **********************/
  SALE_BY_DATE_RANGE_GENERATE_REPORTS: "/reports/sale_by_date/",
  SALE_BY_DATE_RANGE_AND_ITEM_ID_GENERATE_REPORTS: "/reports/sale_by_item_and_date/",


  /***************** PATIENTS USERS ENDPOINTS **********************/
  /***************** LABORATORY **********************/
  PATIENTLABTESTREQUEST: "/patientlabtestrequest",

  /***************** INPATIENT ENDPOINTS **********************/
  ADMIT_PATIENT: "/inpatient/patient-admissions/",
  DISCHARGE_PATIENT: "/inpatient/patient-admissions/",
  ADMITTED_PATIENT_VITALS: "/inpatient/patient-admissions/",
  ADMITTED_PATIENT_SCHEDULES: "/inpatient/patient-admissions/",
  ADMITTED_PATIENT_SCHEDULED_DRUGS: "/inpatient/patient-admissions/",
  INPATIENT_BEDS: "/inpatient/beds/",
  INPATIENT_WARDS: "/inpatient/wards/",
  INPATIENT_NURSE_DUTIES: "/inpatient/ward-nurse-assignments/",


};

//------------------------ Application APIs ----------------------//
export const APP_API_URL = {
  BASE_URL: ((typeof window !== 'undefined' && typeof process !== 'undefined' && process.env.NEXT_PUBLIC_BACKEND_URL) || "http://localhost:8000").replace(/\/$/, ''),

  /***************** AUTH **********************/

  REGISTER_USER: "/api/register",
  CREATE_USER: "/api/auth/create-user",
  LOGIN: "/api/register/login",
  REFRESH_TOKEN: "/api/auth/refresh",
  PASSWORD_RESET: "/api/register/reset-password",
  CHANGE_PASSWORD: "/api/register/change-password",
  ADMIN_CHANGE_PASSWORD: "/api/register/admin",
  GET_USER_PERMISSIONS: "/api/auth/user-permissions",
  CREATE_GROUP: "/api/groups/create-group",
  ADD_PERMISSION: "/api/groups/add-permission/",
  FETCH_GROUP: "/api/groups",
  FETCH_PATIENT_GROUP: "/api/auth/get-group",
  FETCH_ALL_PERMISSIONS: "/api/groups/fetchPermissions",
  FETCH_GROUP_PERMISSIONS: "/api/groups/fetchGroupPermissions",

  /***************** PATIENT APIS **********************/
  CREATE_PATIENT: "/api/patient",
  EDIT_PATIENT: "/api/patient/edit-patient",
  DELETE_PATIENT: "/api/patient/delete-patient",
  FETCH_PATIENT: "/api/patient",
  FETCH_PATIENT_BY_ID: "/api/patient/patient_by_id",
  PATIENT_KIN: "/api/patient/patientKin",
  PATIENT_KIN_CONTACT: "/api/patient/next-of-kin-contact/",
  SEARCH_PATIENT: "/api/billing/search-patients",
  BOOK_APPOINTMENT: "/api/appointment",
  CREATE_APPOINTMENT: "/api/appointment/create-appointment",
  FETCH_APPOINTMENTS: "/api/appointment",
  FETCH_PATIENT_APPOINTMENTS: "/api/appointment/patient-appointment",
  FETCH_PATIENT_APPOINTMENTS_BY_PATIENT_ID: "/api/appointment/appointments-by-patient-id/",
  FETCH_DOCTOR_APPOINTMENTS: "/api/appointment/get-appointment-by-doctor",
  FETCH_SERVICES: "/api/patient/fetch-services",
  FETCH_INSURANCE: "/api/insurance",
  PRESCRIBE: "/api/patient/prescribe",
  ASSIGN_DOCTOR: "/api/patient/assign-doctor",
  CONSULT_PATIENT: "/api/patient/consult-patient",
  REFER_PATIENT: "/api/patient/refer-patient",
  GET_PATIENT_PROFILE: "/api/patient/patient-profile",
  PRESCRIBE_DRUG: "/api/patient/prescribe-drug",
  PRESCRIBE_DRUG_BY_PATIENT_ID: "/api/patient/prescribed-drugs-by-patient-id",
  CREATE_PRESCRIPTION: "/api/patient/create-prescription",
  GET_PATIENT_TRIAGE: "/api/patient/get-patient-triage",

  PATIENT_ATTENDANCE_PROCESS: "/api/patient/attendance-process",

  /***************** AI TRIAGE APIS **********************/
  AI_TRIAGE_REQUEST: "/api/ai-triage/request",
  AI_TRIAGE_RESULTS: "/api/ai-triage/results",

  /***************** DOCTOR APIS **********************/
  CREATE_DOCTOR: "/api/doctor/create-doctor",
  FETCH_DOCTOR: "/api/doctor/fetch-doctor",

  /***************** CUSTOM USERS APIS **********************/
  FETCH_NURSES: "/api/nurses/nurses",

  /***************** LABORATORY APIS **********************/
  FETCH_LAB_RESULTS: "/api/laboratory/get-lab-results",
  SEND_LAB_RESULTS: "/api/laboratory/get-lab-results",
  FETCH_LAB_REQUESTS: "/api/laboratory/get-lab-requests",
  FETCH_ONE_LAB_REQUESTS: "/api/laboratory/getOneTestRequest",
  FETCH_LAB_REQUESTS_BY_PATIENT_ID: "/api/laboratory/labRequestsByPatientId",
  SEND_LAB_REQUESTS: "/api/laboratory/get-lab-requests",
  FETCH_LAB_EQUIPMENT: "/api/laboratory/get-lab-equipment",
  LAB_EQUIPMENT_PARSER: "/api/laboratory/get-lab-parser",
  SEND_TO_EQUIPMENT: "/api/laboratory/send-to-equipment",
  PUBLIC_LAB_REQUEST: "/api/laboratory/public-lab-request",
  FETCH_LAB_TEST_PROFILE: "/api/laboratory/get-lab-test-profile",
  FETCH_LAB_TEST_PANELS: "/api/laboratory/get-lab-test-panels",
  FETCH_LAB_TEST_PANELS_BY_PROFILE_ID: "/api/laboratory/labtestpanels-byprofile-id",
  SEND_LAB_RESULTS_ITEMS: "/api/laboratory/get-lab-test-result-item",
  FETCH_LAB_TEST_REQUEST_PANELS: "/api/laboratory/lab-test-requests-panel/",
  FETCH_PANELS_BY_RESULT: "/api/laboratory/lab-test-result-panels-by-lab-test-result-id/",
  FETCH_QUALITATIVE_PANELS_BY_RESULT: "/api/laboratory/qualitative-lab-test-result-panels-by-lab-test-result-id/",
  FETCH_LAB_TEST_RESULT_PANELS: "/api/laboratory/lab-test-results-panel/",
  QUALITATIVE_LAB_TEST_RESULTS: "/api/laboratory/lab-test-results-qualitative/",
  QUALITATIVE_LAB_TEST_RESULTS_PANEL_ITEM: "/api/laboratory/lab-test-results-panel-qualitative/",
  GET_LAB_TEST_PANELS_BY_LAB_TEST_REQUEST_ID: "/api/laboratory/lab-test-request-panels-by-lab-test-request-id/",
  APPROVE_LAB_RESULTS: "/api/laboratory/approve-results/",
  APPROVE_QUALITATIVE_LAB_RESULTS: "/api/laboratory/approve-qualitative-results/",
  PHARMACY_DASHBOARD_METRICS: "/api/pharmacy/pharmacy-dashboard-metrics",
  PRINT_PHARMACY_REPORT: "/api/pharmacy/print-pharmacy-report",
  LAB_TEST_REQ_BY_PROCESS_ID: "/api/laboratory/lab-test-request-by-process-id",
  SAMPLES_BY_process_ID: "/api/laboratory/samples-by-process-id/",
  PANELS_BY_SAMPLE_ID: "/api/laboratory/panels-by-specific-sample/",
  PHLEBOTOMY_PATIENT_SAMPLES: "/api/laboratory/patient-samples",
  SPECIMENS: "/api/laboratory/specimens",
  REFERENCE_VALUES: "/api/laboratory/reference-values",
  LAB_TEST_INTERPRETATIONS: "/api/laboratory/lab-test-interpretations",
  LAB_SETTINGS: "/api/laboratory/lab-settings",
  LAB_DASHBOARD_METRICS: "/api/laboratory/lab-dashboard-metrics",

  /***************** INVENTORY APIS **********************/
  ADD_INVENTORY: "/api/inventory/add-inventory",
  FETCH_INVENTORY: "/api/inventory/fetch-inventory",
  FETCH_SUPPLIERS: "/api/inventory/fetch-suppliers",
  FETCH_ITEMS: "/api/inventory/fetch-items",
  FETCH_ITEM: "/api/inventory/get-item",
  DELETE_ITEM: "/api/inventory/delete-item",
  FETCH_ORDER_BILL: "/api/order-bills/fetch-order-bill",
  REQUISITION: "/api/inventory/requisition",
  REQUISITION_ITEM: "/api/inventory/requisition-item",
  PURCHASE_ORDER: "/api/inventory/purchase-order",
  PURCHASE_ORDER_ITEM: "/api/inventory/purchase-order-item",
  FETCH_INCOMING_ITEMS: "/api/inventory/incomingItem",
  FETCH_SUPPLIER_INVOICE: "/api/inventory/supplier-invoice/",
  FETCH_INVOICE: "/api/inventory/fetch-invoice/",
  FETCH_GOODS_RECEIPT_NOTE: "/api/inventory/goods-receipt-note/",
  FETCH_LOW_QUANTITY: "/api/inventory/low-drugs",
  FETCH_DEPARTMENTS: "/api/groups/department/",

  /***************** NURSING APIS **********************/
  ADD_TRIAGE: "/api/nursing/add-triage",

  /***************** BILLING APIS **********************/
  FETCH_PATIENT_BILLING_APPOINTMENTS: "/api/billing/patient-appointments",
  FETCH_PATIENT_BILLING_LAB_REQUEST: "/api/billing/patient-lab-request",
  FETCH_PATIENT_BILLING_PRESCRIBED_DRUG: "/api/billing/prescribed-drug",
  BILLING_INVOICE_ITEMS: "/api/billing/invoice-items",
  BILLING_INVOICES: "/api/billing/billing-invoices",
  PAY_INVOICES: "/api/billing/invoice-payments",
  FETCH_INVOICES: "/api/billing/fetch-invoices",
  FeTCH_PATIENT_INVOICES: "/api/billing/fetch-invoices-by-patient/",
  FETCH_INVOICE_ITEMS_BY_INVOICE: "/api/billing/fetch-invoices-items-by-invoice/",
  TOTALS_OF_THE_DAY: "/api/billing/transactionAday/",
  PAYMENT_MODES: "/api/billing/payment-modes/",
  INSURANCE_INVENTORY_PRICES: "/api/insurance/insurance-prices",


  /***************** PRESCRIPRION **********************/
  FETCH_PRESCRIPTION: "/api/pharmacy/fetch-prescriptions",
  FETCH_PUBLIC_PRESCRIPTION: "/api/pharmacy/fetch-public-prescriptions",
  FETCH_PRESCRIBED_DRUGS: "/api/pharmacy/fetch-prescribed-drugs",
  FETCH_PRESCRIPTIONS_PRESCRIBED_DRUGS: "/api/pharmacy/fetch-prescriptions-prescribed-drug",
  DRUG_CATEGORIES: "/api/pharmacy/drug-categories",
  DRUG_MODES: "/api/pharmacy/drug-modes",
  DRUG_STATES: "/api/pharmacy/drug-states",
  DRUGS: "/api/pharmacy/drugs",

  /***************** User **********************/
  GET_USER_NAME: "/api/user/getUserName",
  FETCH_ALL_USERS: "/api/user/getAllUsers",
  FETCH_USER_BY_ID: "/api/user/user-by-id",

  /***************** Announcements **********************/
  FETCH_ANNOUNCEMENTS_CHANNELS: "/api/announcement/channels/",
  FETCH_ANNOUNCEMENTS: "/api/announcement/announcements/",

  /***************** Company **********************/
  FETCH_COMPANY_INFO: "/api/company/company/",

  /***************** PDFs **********************/
  DOWNLOAD_PDF: "/api/pdf/download_pdf",
  DOWNLOAD_RESULT_PDF: "/api/pdf/result_pdf",
  SALE_BY_DATE_RANGE_PDF: "/api/pdf/sale-by-date-range-report-pdf",
  SALE_BY_DATE_RANGE_AND_ITEM_PDF: "/api/pdf/sale-by-date-range-and-item-report-pdf",
  LAB_REPORT_PDF: "/api/pdf/lab-report-pdf",

  /***************** REPORTS **********************/
  SALE_BY_DATE_RANGE_GENERATE_REPORTS: "/api/reports/sale-by-date-range/",
  SALE_BY_DATE_RANGE_AND_ITEM_ID_GENERATE_REPORTS: "/api/reports/sale-by-date-range-and-item",

  /***************** PATIENTS USERS ENDPOINTS **********************/
  /***************** LABORATORY **********************/
  PATIENTLABTESTREQUEST: "/api/patient-profile/patientlabtestrequest",
  RECENT_REAGENT_USAGE: "/api/laboratory/recent-reagent-usage",

  /***************** PRESCRIPTION **********************/
  PATIENTPRESCRIPTIONREQUEST: "/api/patient-profile/patientprescriptionrequest",


  /***************** INPATIENT ENDPOINTS **********************/
  ADMIT_PATIENT: "/api/inpatient/admissions/",
  DISCHARGE_PATIENT: "/api/inpatient/discharge/",
  ADMITTED_PATIENT_VITALS: "/api/inpatient/vitals/",
  ADMITTED_PATIENT_SCHEDULES: "/api/inpatient/schedules/",
  ADMITTED_PATIENT_SCHEDULED_DRUGS: "/api/inpatient/scheduled_drug/",
  ADMITTED_PATIENT_SCHEDULED_LAB_TEST: "/api/inpatient/scheduled_lab_test/",
  INPATIENT_BEDS: "/api/inpatient/bed",
  INPATIENT_WARDS: "/api/inpatient/wards",
  INPATIENT_NURSE_DUTIES: "/api/inpatient/nurse-duties",

};

export const API_METHODS = {
  GET: "GET",
  POST: "POST",
  PATCH: "PATCH",
  PUT: "PUT",
  DELETE: "DELETE",
};

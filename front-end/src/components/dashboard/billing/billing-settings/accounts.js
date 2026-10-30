import * as Yup from "yup";

// Who, other than the patient, can be billed for a patient's care. Mirrors
// company.InsuranceCompany.AccountType.
export const ACCOUNT_TYPES = [
  { value: "insurer", label: "Insurer" },
  { value: "corporate", label: "Corporate client" },
  { value: "facility", label: "Referring facility" },
];

export const accountFields = [
  { name: "contact_person", placeholder: "Contact person" },
  { name: "email", placeholder: "Email", type: "email" },
  { name: "phone", placeholder: "Phone" },
  { name: "address", placeholder: "Address" },
];

export const accountValidationSchema = Yup.object().shape({
  name: Yup.string().required("Field is required!"),
  account_type: Yup.string().required("Field is required!"),
  email: Yup.string().email("Enter a valid email"),
});

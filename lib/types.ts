export interface User {
  id: string;
  name: string;
  username: string | null;
  email: string;
  role: "superadmin" | "admin" | "staff";
  auth_provider: string;
  workspace_id: string;
}

export interface AuthConfig {
  google_enabled: boolean;
  ai_enabled: boolean;
  default_academic_year: string;
}

export interface StudentCategory {
  id: string;
  name: string;
  is_active: boolean;
  student_count: number;
}

export interface InstallmentTemplate {
  id?: string;
  installment_number: number;
  label: string | null;
  amount: string;
  due_date: string | null;
}

export interface FeeStructure {
  id: string;
  class_name: string;
  category_id: string | null;
  category_name: string | null;
  academic_year: string;
  total_amount: string;
  num_installments: number;
  is_active: boolean;
  created_at: string;
  templates: InstallmentTemplate[];
}

export interface Student {
  id: string;
  name: string;
  admission_number: string | null;
  roll_number: string | null;
  class_name: string | null;
  section: string | null;
  category_id: string | null;
  category_name: string | null;
  father_name: string | null;
  father_phone: string | null;
  mother_name: string | null;
  mother_phone: string | null;
  phone: string | null;
  enrollment_status: string;
  tc_given: boolean;
}

export interface Installment {
  id: string;
  installment_number: number;
  label: string | null;
  amount: string;
  due_date: string | null;
  paid_amount: string;
  status: string;
  paid_date: string | null;
}

export interface StudentFeeListItem {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string | null;
  category_name: string | null;
  academic_year: string;
  total_fee: string;
  discount: string;
  net_fee: string;
  opening_dues: string;
  paid: string;
  pending: string;
  status: string;
}

export interface StudentFeeDetail {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string | null;
  category_name: string | null;
  academic_year: string;
  total_fee: string;
  discount: string;
  net_fee: string;
  opening_dues: string;
  total_payable: string;
  paid: string;
  balance: string;
  status: string;
  installments: Installment[];
}

export interface Transaction {
  id: string;
  student_fee_id: string;
  installment_id: string | null;
  amount: string;
  type: string;
  note: string | null;
  mode: string | null;
  receipt_number: string | null;
  created_at: string;
  created_by_name: string | null;
}

export interface DashboardSummary {
  total_fee: string;
  collected_fee: string;
  pending_installments: number;
  overdue_amount: string;
}

export interface OverdueStudent {
  student_fee_id: string;
  student_name: string;
  class_name: string | null;
  overdue_amount: string;
  earliest_due_date: string | null;
}

export interface ChartData {
  collected: string;
  pending: string;
  overdue: string;
}

export interface ImportSheet {
  sheet_name: string;
  columns: string[];
  sample_rows: Record<string, string | null>[];
  row_count: number;
  suggested_entity: string;
  suggested_mapping: Record<string, string>;
  confidence: string | null;
  notes: string | null;
  detected_academic_year: string | null;
  academic_year_source: "sheet" | "column" | "filename" | null;
}

export interface ImportAnalyze {
  file_token: string;
  ai_used: boolean;
  academic_year: string;
  year_options: string[];
  sheets: ImportSheet[];
}

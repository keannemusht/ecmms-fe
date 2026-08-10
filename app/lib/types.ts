export type Role = 'ADMIN' | 'MANAGEMENT' | 'USER';
export type EmploymentType = 'PKWT' | 'PKWTT' | 'MAGANG';
export type ContractStatus = 'AKTIF' | 'AKAN_BERAKHIR' | 'EXPIRED' | 'DIPERPANJANG' | 'DIANGKAT_TETAP';
export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'IN_APP';
export type SubmissionType = 'EXTENSION' | 'DATA_UPDATE' | 'RESIGNATION' | 'OTHER';
export type SubmissionStatus = 'PENDING' | 'DIPROSES' | 'DISETUJUI' | 'DITOLAK';

export interface EmployeeRef {
  id: string;
  nik: string;
  name: string;
  email: string;
  phone: string | null;
  department: string;
  position: string;
  employmentType: EmploymentType;
  joinDate: string;
}

export interface UserRef {
  id: string;
  name: string;
  email: string;
}

export interface Contract {
  id: string;
  employeeId: string;
  employee: EmployeeRef;
  contractNumber: string;
  contractType: EmploymentType;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  documentUrl: string | null;
  notes: string | null;
  createdById: string | null;
  createdBy: UserRef | null;
  createdAt: string;
  updatedAt: string;
  history?: ContractHistory[];
}

export interface ContractHistory {
  id: string;
  contractId: string;
  changeType: string;
  previousData: string | null;
  newData: string | null;
  changedById: string | null;
  changedBy: { id: string; name: string } | null;
  createdAt: string;
}

export interface Employee extends EmployeeRef {
  createdAt: string;
  updatedAt: string;
  contracts?: Contract[];
  submissions?: Submission[];
  user?: { id: string; email: string; role: Role; isActive: boolean } | null;
}

export interface Submission {
  id: string;
  employeeId: string;
  employee: EmployeeRef;
  submissionType: SubmissionType;
  status: SubmissionStatus;
  reason: string;
  remarks: string | null;
  processedById: string | null;
  processedBy: { id: string; name: string } | null;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationRule {
  id: string;
  name: string;
  daysBefore: number;
  channels: NotificationChannel[];
  targetRoles: Role[];
  template: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationLog {
  id: string;
  contractId: string | null;
  contract: { id: string; contractNumber: string; employee: EmployeeRef } | null;
  recipient: string;
  channel: NotificationChannel;
  status: string;
  message: string;
  error: string | null;
  sentAt: string;
}

export interface InAppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  link: string | null;
  contractId: string | null;
  whatsappPhone: string | null;
  whatsappMessage: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  user: { id: string; name: string; email: string; role: Role } | null;
  action: string;
  entity: string;
  details: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  isActive: boolean;
  employeeId: string | null;
  employee: { id: string; name: string; nik: string; department: string } | null;
  createdAt: string;
}

export interface ReferenceItem {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  employees: { total: number; pkwt: number; pkwtt: number; magang: number };
  contracts: { aktif: number; akanBerakhir: number; expired: number; diperpanjang: number };
  overdueCount: number;
  overdueList: Contract[];
  expiring30DaysCount: number;
  expiring30DaysList: Contract[];
}

export interface ChartDatum {
  name: string;
  value: number;
}

export interface DashboardCharts {
  departmentData: ChartDatum[];
  contractTypeData: ChartDatum[];
}

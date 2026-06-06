import { useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input, Select } from './Input';
import { projectService } from '../../services/projectService';
import { employeeService, type EmployeeRecord } from '../../services/employeeService';
import { clientService, type ClientRecord } from '../../services/clientService';
import type { Project } from '../../types/project';
import type { GenerateReportPayload, ReportFormat, ReportType } from '../../types/report';

type EntityOption = {
  id: string;
  label: string;
};

export type GenerateReportFormValues = GenerateReportPayload;

interface GenerateReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: GenerateReportFormValues) => Promise<void>;
  submitting?: boolean;
}

const reportTypeOptions: Array<{ value: ReportType; label: string }> = [
  { value: 'company', label: 'Company' },
  { value: 'project', label: 'Project' },
  { value: 'employee', label: 'Employee' },
  { value: 'client', label: 'Client' },
];

const formatOptions: Array<{ value: ReportFormat; label: string }> = [
  { value: 'pdf', label: 'PDF' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV' },
];

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildProjectOptions = (projects: Project[]): EntityOption[] =>
  projects.map((project) => ({ id: project.id, label: project.name }));

const buildEmployeeOptions = (employees: EmployeeRecord[]): EntityOption[] =>
  employees.map((employee) => ({ id: employee.id, label: employee.name }));

const buildClientOptions = (clients: ClientRecord[]): EntityOption[] =>
  clients.map((client) => ({ id: client.id, label: client.company || client.name }));

export const GenerateReportModal = ({ open, onClose, onSubmit, submitting = false }: GenerateReportModalProps) => {
  const [reportType, setReportType] = useState<ReportType>('company');
  const [format, setFormat] = useState<ReportFormat>('pdf');
  const [title, setTitle] = useState('Company Report');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [selectedEntityId, setSelectedEntityId] = useState('');
  const [entityOptions, setEntityOptions] = useState<EntityOption[]>([]);
  const [entityLoading, setEntityLoading] = useState(false);
  const [entityError, setEntityError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const entityLabel = useMemo(() => {
    switch (reportType) {
      case 'project':
        return 'Project';
      case 'employee':
        return 'Employee';
      case 'client':
        return 'Client';
      default:
        return '';
    }
  }, [reportType]);

  const loadEntityOptions = async (nextReportType: Exclude<ReportType, 'company'>) => {
    const requestId = ++requestIdRef.current;

    setEntityLoading(true);
    setEntityError(null);

    try {
      if (nextReportType === 'project') {
        const response = await projectService.getProjects({ per_page: 100 });
        if (requestId === requestIdRef.current) {
          setEntityOptions(buildProjectOptions(response.data ?? []));
        }
      }

      if (nextReportType === 'employee') {
        const response = await employeeService.getEmployees();
        if (requestId === requestIdRef.current) {
          setEntityOptions(buildEmployeeOptions(response));
        }
      }

      if (nextReportType === 'client') {
        const response = await clientService.getClients();
        if (requestId === requestIdRef.current) {
          setEntityOptions(buildClientOptions(response));
        }
      }
    } catch (loadError) {
      if (requestId === requestIdRef.current) {
        setEntityOptions([]);
        setEntityError(loadError instanceof Error ? loadError.message : 'Failed to load options');
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setEntityLoading(false);
      }
    }
  };

  const handleReportTypeChange = (nextReportType: ReportType) => {
    setReportType(nextReportType);
    setFormError(null);
    setEntityOptions([]);
    setSelectedEntityId('');
    setEntityError(null);

    if (nextReportType === 'company') {
      setEntityLoading(false);
      return;
    }

    void loadEntityOptions(nextReportType);
  };

  const validate = (): string | null => {
    if (!title.trim()) {
      return 'Title is required';
    }

    if (reportType !== 'company' && !selectedEntityId) {
      return `${entityLabel} is required`;
    }

    if ((startDate && !endDate) || (!startDate && endDate)) {
      return 'Please select both start and end dates';
    }

    if (startDate && endDate && startDate > endDate) {
      return 'Start date must be before end date';
    }

    if (recipientEmail.trim() && !emailRegex.test(recipientEmail.trim())) {
      return 'Please enter a valid email address';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validate();

    if (validationError) {
      setFormError(validationError);
      // Show a friendly toast for missing entity selection
      if (validationError.includes('is required')) {
        toast.error(`Please select ${entityLabel.toLowerCase()}`);
      }
      return;
    }

    setFormError(null);

    // Build payload with exact shape expected by backend.
    const basePayload: Record<string, unknown> = {
      report_type: reportType,
      format,
      title: title.trim(),
    };

    if (startDate) basePayload.start_date = startDate;
    if (endDate) basePayload.end_date = endDate;
    if (recipientEmail.trim()) basePayload.recipient_email = recipientEmail.trim();

    // When an entity is required, send it as `entity_id` exactly.
    if (reportType !== 'company') {
      basePayload.entity_id = selectedEntityId;
    }

    const payload: GenerateReportFormValues = basePayload as GenerateReportFormValues;

    await onSubmit(payload);
  };

  return (
    <Modal open={open} onClose={onClose} title="Generate Report" panelClassName="max-w-3xl">
      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Select label="Report Type" value={reportType} onChange={(event) => handleReportTypeChange(event.target.value as ReportType)} className="leading-6" style={{ lineHeight: '1.6', paddingBottom: '2px' }}>
              {reportTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
          </Select>
          </div>

          <div>
            <Select label="Format" value={format} onChange={(event) => setFormat(event.target.value as ReportFormat)} className="leading-6" style={{ lineHeight: '1.6', paddingBottom: '2px' }}>
              {formatOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
          </Select>
          </div>
        </div>

        <Input
          label="Title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Quarterly Company Health Report"
          helpText="This title appears in the report history and downloads."
        />

        {reportType !== 'company' && (
          <div>
            <Select label={entityLabel} value={selectedEntityId} onChange={(event) => setSelectedEntityId(event.target.value)} disabled={entityLoading} className="leading-6" style={{ lineHeight: '1.6', paddingBottom: '2px' }}>
              <option value="">Select {entityLabel.toLowerCase()}</option>
              {entityOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </Select>
            {entityLoading && (
              <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 size={16} className="animate-spin" />
                Loading {entityLabel.toLowerCase()}s...
              </p>
            )}
            {entityError && <p className="mt-2 text-sm text-red-700">{entityError}</p>}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <Input
            label="Start Date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />
          <Input
            label="End Date"
            type="date"
            value={endDate}
            onChange={(event) => setEndDate(event.target.value)}
          />
        </div>

        <Input
          label="Optional Email"
          type="email"
          value={recipientEmail}
          onChange={(event) => setRecipientEmail(event.target.value)}
          placeholder="example@email.com"
          helpText="If provided, the report will be emailed automatically after generation."
        />

        {formError && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSubmit()} isLoading={submitting}>
            Generate Report
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default GenerateReportModal;

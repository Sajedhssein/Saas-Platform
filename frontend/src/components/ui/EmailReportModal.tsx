import { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Input } from './Input';

interface EmailReportModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (email: string) => Promise<void>;
  reportTitle?: string;
  initialEmail?: string;
  submitting?: boolean;
}

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const EmailReportModal = ({
  open,
  onClose,
  onSubmit,
  reportTitle,
  initialEmail = '',
  submitting = false,
}: EmailReportModalProps) => {
  const [email, setEmail] = useState(initialEmail);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setError(null);
    await onSubmit(email.trim());
  };

  return (
    <Modal open={open} onClose={onClose} title="Email Report" panelClassName="max-w-xl">
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-medium text-slate-900">Send report by email</p>
          <p className="text-sm text-slate-600">
            {reportTitle ? `Report: ${reportTitle}` : 'Choose a recipient for this report.'}
          </p>
        </div>

        <Input
          label="Recipient Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="example@email.com"
          error={error ?? undefined}
        />

        <div className="flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button variant="primary" onClick={() => void handleSubmit()} isLoading={submitting}>
            Send Email
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default EmailReportModal;

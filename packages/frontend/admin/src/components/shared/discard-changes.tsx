import { t } from '../../i18n';
import { ConfirmDialog } from './confirm-dialog';

export const DiscardChanges = ({
  open,
  onClose,
  onConfirm,
  onOpenChange,
  description = t('Changes will not be saved.'),
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  description?: string;
}) => {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Discard Changes')}
      description={description}
      confirmText={t('Discard')}
      confirmButtonVariant="destructive"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};

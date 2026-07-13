import { TypeConfirmDialog } from '../../../components/shared/type-confirm-dialog';
import { t } from '../../../i18n';

export const DeleteAccountDialog = ({
  email,
  open,
  onClose,
  onDelete,
  onOpenChange,
}: {
  email: string;
  open: boolean;
  onClose: () => void;
  onDelete: () => void;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <TypeConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Delete Account ?')}
      description={
        <>
          <span className="font-bold">{email}</span>{' '}
          {t(
            'will be permanently deleted. This operation is irreversible. Please proceed with caution.'
          )}
        </>
      }
      targetText={email}
      inputPlaceholder={t('Please type email to confirm')}
      confirmText={t('Delete')}
      confirmButtonVariant="destructive"
      onConfirm={onDelete}
      onClose={onClose}
    />
  );
};

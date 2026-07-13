import { TypeConfirmDialog } from '../../../components/shared/type-confirm-dialog';
import { t } from '../../../i18n';

export const DisableAccountDialog = ({
  email,
  open,
  onClose,
  onDisable,
  onOpenChange,
}: {
  email: string;
  open: boolean;
  onClose: () => void;
  onDisable: () => void;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <TypeConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Disable Account ?')}
      description={
        <>
          {t('The data associated with')}{' '}
          <span className="font-bold">{email}</span>{' '}
          {t(
            'will be deleted and cannot be used for logging in. This operation is irreversible. Please proceed with caution.'
          )}
        </>
      }
      targetText={email}
      inputPlaceholder={t('Please type email to confirm')}
      confirmText={t('Disable')}
      confirmButtonVariant="destructive"
      onConfirm={onDisable}
      onClose={onClose}
    />
  );
};

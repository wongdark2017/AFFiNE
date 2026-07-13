import { ConfirmDialog } from '../../../components/shared/confirm-dialog';
import { t } from '../../../i18n';

export const EnableAccountDialog = ({
  open,
  email,
  onClose,
  onConfirm,
  onOpenChange,
}: {
  open: boolean;
  email: string;
  onClose: () => void;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
}) => {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('Enable Account')}
      description={
        <>
          {t(
            'Are you sure you want to enable the account? After enabling the account, the'
          )}{' '}
          <span className="font-bold">{email}</span>{' '}
          {t('email can be used to log in.')}
        </>
      }
      confirmText={t('Enable')}
      confirmButtonVariant="default"
      onConfirm={onConfirm}
      onClose={onClose}
    />
  );
};

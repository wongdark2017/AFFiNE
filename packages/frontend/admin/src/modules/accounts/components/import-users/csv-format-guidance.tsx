import { WarningIcon } from '@blocksuite/icons/rc';
import type { FC } from 'react';

import { t } from '../../../../i18n';

interface CsvFormatGuidanceProps {
  passwordLimits: {
    minLength: number;
    maxLength: number;
  };
}

/**
 * Component that displays CSV format guidelines
 */
export const CsvFormatGuidance: FC<CsvFormatGuidanceProps> = ({
  passwordLimits,
}) => {
  return (
    <div className="flex gap-1 rounded-[6px] bg-secondary p-1.5 text-xs text-muted-foreground">
      <div className="flex justify-center py-0.5">
        <WarningIcon fontSize={16} className="text-foreground" />
      </div>
      <div>
        <p>{t('CSV file includes username, email, and password.')}</p>
        <ul>
          {[
            t('Username (optional): any text.'),
            t('Email (required): e.g., user@example.com.'),
            t('Password (optional): {min}–{max} characters.', {
              min: passwordLimits.minLength,
              max: passwordLimits.maxLength,
            }),
          ].map((text, index) => (
            <li
              key={`guidance-${index}`}
              className="relative pl-2 leading-normal"
            >
              <span className="absolute left-0 top-2 w-1 h-1 rounded-full bg-current" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

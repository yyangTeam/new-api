/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useContext } from 'react';
import { Button, Typography } from '@douyinfe/semi-ui';
import { IconExternalOpen } from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../context/Status';

const { Text } = Typography;

const ImageGen = () => {
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const url = statusState?.status?.image_generation_url;
  const openMode = statusState?.status?.image_generation_open_mode ?? 'embed';

  if (!url) return null;

  if (openMode === 'new_tab') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '16px' }}>
        <IconExternalOpen size='extra-large' style={{ color: 'var(--semi-color-text-2)' }} />
        <Text type='tertiary'>{t('点击在新标签页打开生图工具')}</Text>
        <Button
          theme='solid'
          icon={<IconExternalOpen />}
          onClick={() => window.open(url, '_blank', 'noopener,noreferrer')}
        >
          {t('打开生图工具')}
        </Button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <iframe
        src={url}
        style={{ width: '100%', height: '100%', border: 'none' }}
        sandbox='allow-scripts allow-same-origin allow-forms allow-popups'
        title='Image Generation'
      />
    </div>
  );
};

export default ImageGen;

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

import React, { useEffect, useRef, useState } from 'react';
import { Button, Form, RadioGroup, Radio, Spin, Typography } from '@douyinfe/semi-ui';
import { API, compareObjects, showError, showSuccess, showWarning } from '../../../helpers';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

export default function SettingsImageGen(props) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [inputs, setInputs] = useState({
    ImageGenerationUrl: '',
    ImageGenerationOpenMode: 'embed',
  });
  const refForm = useRef();
  const [inputsRow, setInputsRow] = useState(inputs);

  useEffect(() => {
    if (props.options) {
      const next = {
        ImageGenerationUrl: props.options.ImageGenerationUrl || '',
        ImageGenerationOpenMode: props.options.ImageGenerationOpenMode || 'embed',
      };
      setInputs(next);
      setInputsRow(next);
    }
  }, [props.options]);

  async function onSubmit() {
    const updateArray = compareObjects(inputs, inputsRow);
    if (!updateArray.length) return showWarning(t('你似乎并没有修改什么'));
    const requestQueue = updateArray.map((item) =>
      API.put('/api/option/', { key: item.key, value: inputs[item.key] }),
    );
    setLoading(true);
    Promise.all(requestQueue)
      .then((res) => {
        if (res.includes(undefined)) return showError(t('部分保存失败，请重试'));
        showSuccess(t('保存成功'));
        props.refresh();
      })
      .catch(() => showError(t('保存失败，请重试')))
      .finally(() => setLoading(false));
  }

  return (
    <Spin spinning={loading}>
      <Form
        ref={refForm}
        values={inputs}
        onValueChange={(values) => setInputs({ ...inputs, ...values })}
      >
        <Form.Input
          field='ImageGenerationUrl'
          label={t('生图 URL')}
          placeholder={t('留空则隐藏生图菜单项')}
          extraText={
            <Text type='tertiary' size='small'>
              {t('留空则不显示生图菜单项')}
            </Text>
          }
        />
        <Form.Slot label={t('打开方式')}>
          <RadioGroup
            value={inputs.ImageGenerationOpenMode}
            onChange={(e) => setInputs({ ...inputs, ImageGenerationOpenMode: e.target.value })}
            direction='horizontal'
          >
            <Radio value='embed'>{t('嵌入（iframe）')}</Radio>
            <Radio value='new_tab'>{t('新标签页打开')}</Radio>
          </RadioGroup>
        </Form.Slot>
        <Button theme='solid' onClick={onSubmit}>
          {t('保存生图设置')}
        </Button>
      </Form>
    </Spin>
  );
}

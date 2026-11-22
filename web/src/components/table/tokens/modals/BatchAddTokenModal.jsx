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

import React, { useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  API,
  showError,
  showSuccess,
  timestamp2string,
  renderGroupOption,
  getCurrencyConfig,
  getModelCategories,
  selectFilter,
} from '../../../../helpers';
import {
  displayAmountToQuota,
  quotaToDisplayAmount,
} from '../../../../helpers/quota';
import { useIsMobile } from '../../../../hooks/common/useIsMobile';
import {
  Avatar,
  Banner,
  Button,
  Card,
  Col,
  Form,
  Modal,
  Row,
  SideSheet,
  Space,
  Spin,
  Tag,
  Typography,
} from '@douyinfe/semi-ui';
import {
  IconClose,
  IconCreditCard,
  IconKey,
  IconLink,
  IconSave,
} from '@douyinfe/semi-icons';
import { useTranslation } from 'react-i18next';
import { StatusContext } from '../../../../context/Status';

const { Text, Title } = Typography;

const MAX_BATCH_TOKEN_COUNT = 50;
const MAX_TOKEN_NAME_LENGTH = 50;

const parseTokenNames = (input) => {
  const text = input || '';
  const trimmed = text.trim();
  if (trimmed === '') {
    return { names: [], error: 'Please enter token name list' };
  }

  const comma = /[,\uFF0C]/;
  const semicolon = /[;\uFF1B]/;
  const whitespace = /\s+/;
  const detectionText = trimmed.replace(/\s*([,\uFF0C;\uFF1B])\s*/g, '$1');
  const delimiterTypes = [];

  if (comma.test(trimmed)) delimiterTypes.push('comma');
  if (semicolon.test(trimmed)) delimiterTypes.push('semicolon');
  if (whitespace.test(detectionText)) delimiterTypes.push('whitespace');

  if (delimiterTypes.length > 1) {
    return { names: [], error: 'Please use only one delimiter' };
  }

  let parts;
  switch (delimiterTypes[0]) {
    case 'comma':
      parts = trimmed.split(/[,\uFF0C]/);
      break;
    case 'semicolon':
      parts = trimmed.split(/[;\uFF1B]/);
      break;
    case 'whitespace':
      parts = trimmed.split(/\s+/);
      break;
    default:
      parts = [trimmed];
      break;
  }

  const names = parts.map((name) => name.trim());
  if (names.some((name) => name === '')) {
    return { names: [], error: 'Token name cannot be empty' };
  }
  if (names.length < 1 || names.length > MAX_BATCH_TOKEN_COUNT) {
    return { names: [], error: 'Token count must be 1-50' };
  }

  const seen = new Set();
  for (const name of names) {
    if (Array.from(name).length > MAX_TOKEN_NAME_LENGTH) {
      return { names: [], error: 'Token name cannot exceed 50 characters' };
    }
    if (seen.has(name)) {
      return { names: [], error: 'Duplicate names exist in this batch' };
    }
    seen.add(name);
  }

  return { names, error: '' };
};

const BatchAddTokenModal = ({ visible, onCancel, refresh }) => {
  const { t } = useTranslation();
  const [statusState] = useContext(StatusContext);
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState([]);
  const [groups, setGroups] = useState([]);
  const [showQuotaInput, setShowQuotaInput] = useState(false);
  const [namesText, setNamesText] = useState('');
  const formApiRef = useRef(null);
  const isMobile = useIsMobile();

  const parsedNames = useMemo(() => parseTokenNames(namesText), [namesText]);

  const getInitValues = () => ({
    names_text: '',
    remain_quota: 0,
    remain_amount: 0,
    expired_time: -1,
    unlimited_quota: true,
    model_limits_enabled: false,
    model_limits: [],
    allow_ips: '',
    group: '',
    cross_group_retry: false,
  });

  const resetForm = () => {
    formApiRef.current?.setValues(getInitValues());
    setNamesText('');
    setShowQuotaInput(false);
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const setExpiredTime = (month, day, hour, minute) => {
    let now = new Date();
    let timestamp = now.getTime() / 1000;
    let seconds = month * 30 * 24 * 60 * 60;
    seconds += day * 24 * 60 * 60;
    seconds += hour * 60 * 60;
    seconds += minute * 60;
    if (!formApiRef.current) return;
    if (seconds !== 0) {
      timestamp += seconds;
      formApiRef.current.setValue('expired_time', timestamp2string(timestamp));
    } else {
      formApiRef.current.setValue('expired_time', -1);
    }
  };

  const loadModels = async () => {
    const res = await API.get('/api/user/models');
    const { success, message, data } = res.data;
    if (success) {
      const categories = getModelCategories(t);
      const options = (data || []).map((model) => {
        let icon = null;
        for (const [key, category] of Object.entries(categories)) {
          if (key !== 'all' && category.filter({ model_name: model })) {
            icon = category.icon;
            break;
          }
        }
        return {
          label: (
            <span className='flex items-center gap-1'>
              {icon}
              {model}
            </span>
          ),
          value: model,
        };
      });
      setModels(options);
    } else {
      showError(t(message));
    }
  };

  const loadGroups = async () => {
    const res = await API.get('/api/user/self/groups');
    const { success, message, data } = res.data;
    if (success) {
      const options = Object.entries(data).map(([group, info]) => ({
        label: info.desc,
        value: group,
        ratio: info.ratio,
      }));
      if (statusState?.status?.default_use_auto_group) {
        if (options.some((group) => group.value === 'auto')) {
          options.sort((a, b) => (a.value === 'auto' ? -1 : 1));
        }
      }
      setGroups(options);
    } else {
      showError(t(message));
    }
  };

  useEffect(() => {
    if (visible) {
      resetForm();
      loadModels();
      loadGroups();
    }
  }, [visible]);

  const showBatchResult = (data) => {
    const created = data?.created || 0;
    const failed = data?.failed || 0;
    const errors = data?.errors || [];

    if (failed > 0) {
      if (created > 0) {
        showSuccess(t('Created {{count}} tokens', { count: created }));
      }
      Modal.warning({
        title: t('Batch add tokens partially failed'),
        content: (
          <div>
            <div className='mb-2'>
              {t('The following tokens failed to create:')}
            </div>
            <div style={{ maxHeight: 180, overflow: 'auto' }}>
              {errors.map((error, index) => (
                <div key={`${error.name}-${index}`}>
                  {t('{{name}}: {{reason}}', {
                    name: error.name,
                    reason: error.reason,
                  })}
                </div>
              ))}
            </div>
          </div>
        ),
        okText: t('Confirm'),
      });
      return;
    }

    showSuccess(
      t('Batch add tokens succeeded. Created {{count}} tokens.', {
        count: created,
      }),
    );
  };

  const submit = async (values) => {
    const parsed = parseTokenNames(values.names_text);
    if (parsed.error) {
      showError(t(parsed.error));
      return;
    }

    setLoading(true);
    const localInputs = { ...values };
    delete localInputs.names_text;

    localInputs.names = parsed.names;
    localInputs.remain_quota = localInputs.unlimited_quota
      ? 0
      : displayAmountToQuota(localInputs.remain_amount);
    delete localInputs.remain_amount;

    if (!localInputs.unlimited_quota && localInputs.remain_quota <= 0) {
      showError(t('Please enter amount'));
      setLoading(false);
      return;
    }

    if (localInputs.expired_time !== -1) {
      const time = Date.parse(localInputs.expired_time);
      if (isNaN(time)) {
        showError(t('Expiration time format is invalid!'));
        setLoading(false);
        return;
      }
      localInputs.expired_time = Math.ceil(time / 1000);
    }

    localInputs.model_limits = (localInputs.model_limits || []).join(',');
    localInputs.model_limits_enabled = localInputs.model_limits.length > 0;

    const res = await API.post('/api/token/batch/create', localInputs);
    const { success, message, data } = res.data;
    if (success) {
      showBatchResult(data);
      await refresh();
      handleCancel();
    } else {
      showError(t(message));
    }
    setLoading(false);
  };

  return (
    <SideSheet
      placement='left'
      title={
        <Space>
          <Tag color='green' shape='circle'>
            {t('Batch')}
          </Tag>
          <Title heading={4} className='m-0'>
            {t('Batch Add Tokens')}
          </Title>
        </Space>
      }
      bodyStyle={{ padding: '0' }}
      visible={visible}
      width={isMobile ? '100%' : 640}
      footer={
        <div className='flex justify-end bg-white'>
          <Space>
            <Button
              theme='solid'
              className='!rounded-lg'
              onClick={() => formApiRef.current?.submitForm()}
              icon={<IconSave />}
              loading={loading}
            >
              {t('Submit')}
            </Button>
            <Button
              theme='light'
              className='!rounded-lg'
              type='primary'
              onClick={handleCancel}
              icon={<IconClose />}
            >
              {t('Cancel')}
            </Button>
          </Space>
        </div>
      }
      closeIcon={null}
      onCancel={handleCancel}
    >
      <Spin spinning={loading}>
        <Form
          initValues={getInitValues()}
          getFormApi={(api) => (formApiRef.current = api)}
          onSubmit={submit}
        >
          {({ values }) => (
            <div className='p-2'>
              <Card className='!rounded-2xl shadow-sm border-0'>
                <div className='flex items-center mb-2'>
                  <Avatar size='small' color='blue' className='mr-2 shadow-md'>
                    <IconKey size={16} />
                  </Avatar>
                  <div>
                    <Text className='text-lg font-medium'>
                      {t('Basic Information')}
                    </Text>
                    <div className='text-xs text-gray-600'>
                      {t('Set token names and shared configuration')}
                    </div>
                  </div>
                </div>
                <Row gutter={12}>
                  <Col span={24}>
                    <Form.TextArea
                      field='names_text'
                      label={t('Token Name List')}
                      placeholder={t('Example: token-a, token-b, token-c')}
                      extraText={t(
                        'Supports one delimiter type per batch: comma (English or Chinese), semicolon (English or Chinese), or whitespace (spaces, new lines, tabs).',
                      )}
                      autosize
                      rows={4}
                      rules={[
                        {
                          required: true,
                          message: t('Please enter token name list'),
                        },
                      ]}
                      onChange={setNamesText}
                      showClear
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Banner
                      type={parsedNames.error ? 'warning' : 'info'}
                      description={
                        parsedNames.error
                          ? t(parsedNames.error)
                          : t(
                              'Will create {{count}} tokens. Full keys will not be shown in the creation result.',
                              { count: parsedNames.names.length },
                            )
                      }
                      closeIcon={null}
                    />
                  </Col>
                  <Col span={24}>
                    {groups.length > 0 ? (
                      <Form.Select
                        field='group'
                        label={t('Token Group')}
                        placeholder={t('Token group, default is user group')}
                        optionList={groups}
                        renderOptionItem={renderGroupOption}
                        filter={(input, option) => {
                          const q = input.toLowerCase();
                          return (
                            option.value?.toLowerCase().includes(q) ||
                            (typeof option.label === 'string' &&
                              option.label.toLowerCase().includes(q))
                          );
                        }}
                        showClear
                        style={{ width: '100%' }}
                      />
                    ) : (
                      <Form.Select
                        placeholder={t('No user-selectable groups configured')}
                        disabled
                        label={t('Token Group')}
                        style={{ width: '100%' }}
                      />
                    )}
                  </Col>
                  <Col
                    span={24}
                    style={{
                      display: values.group === 'auto' ? 'block' : 'none',
                    }}
                  >
                    <Form.Switch
                      field='cross_group_retry'
                      label={t('Cross-group retry')}
                      size='default'
                      extraText={t(
                        'When enabled, if the current group channel fails, the next group channel will be tried in order',
                      )}
                    />
                  </Col>
                  <Col xs={24} sm={24} md={24} lg={10} xl={10}>
                    <Form.DatePicker
                      field='expired_time'
                      label={t('Expiration Time')}
                      type='dateTime'
                      placeholder={t('Please select expiration time')}
                      rules={[
                        {
                          required: true,
                          message: t('Please select expiration time'),
                        },
                        {
                          validator: (rule, value) => {
                            if (value === -1 || !value)
                              return Promise.resolve();
                            const time = Date.parse(value);
                            if (isNaN(time)) {
                              return Promise.reject(
                                t('Expiration time format is invalid!'),
                              );
                            }
                            if (time <= Date.now()) {
                              return Promise.reject(
                                t('Expiration time cannot be earlier than now!'),
                              );
                            }
                            return Promise.resolve();
                          },
                        },
                      ]}
                      showClear
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col xs={24} sm={24} md={24} lg={14} xl={14}>
                    <Form.Slot label={t('Expiration Shortcut')}>
                      <Space wrap>
                        <Button
                          theme='light'
                          type='primary'
                          onClick={() => setExpiredTime(0, 0, 0, 0)}
                        >
                          {t('Never expires')}
                        </Button>
                        <Button
                          theme='light'
                          type='tertiary'
                          onClick={() => setExpiredTime(1, 0, 0, 0)}
                        >
                          {t('One month')}
                        </Button>
                        <Button
                          theme='light'
                          type='tertiary'
                          onClick={() => setExpiredTime(0, 1, 0, 0)}
                        >
                          {t('One day')}
                        </Button>
                        <Button
                          theme='light'
                          type='tertiary'
                          onClick={() => setExpiredTime(0, 0, 1, 0)}
                        >
                          {t('One hour')}
                        </Button>
                      </Space>
                    </Form.Slot>
                  </Col>
                </Row>
              </Card>

              <Card className='!rounded-2xl shadow-sm border-0'>
                <div className='flex items-center mb-2'>
                  <Avatar size='small' color='green' className='mr-2 shadow-md'>
                    <IconCreditCard size={16} />
                  </Avatar>
                  <div>
                    <Text className='text-lg font-medium'>
                      {t('Quota Settings')}
                    </Text>
                    <div className='text-xs text-gray-600'>
                      {t('Set token available quota and count')}
                    </div>
                  </div>
                </div>
                <Row gutter={12}>
                  <Col span={24}>
                    <Form.InputNumber
                      field='remain_amount'
                      label={t('Amount')}
                      prefix={getCurrencyConfig().symbol}
                      placeholder={t('Enter amount')}
                      precision={6}
                      disabled={values.unlimited_quota}
                      min={0}
                      step={0.000001}
                      onChange={(val) => {
                        const amount = val === '' || val == null ? 0 : val;
                        formApiRef.current?.setValue('remain_amount', amount);
                        formApiRef.current?.setValue(
                          'remain_quota',
                          displayAmountToQuota(amount),
                        );
                      }}
                      style={{ width: '100%' }}
                      showClear
                    />
                  </Col>
                  <Col span={24}>
                    <div
                      className='text-xs cursor-pointer mt-1'
                      style={{ color: 'var(--semi-color-text-2)' }}
                      onClick={() => setShowQuotaInput((v) => !v)}
                    >
                      {showQuotaInput
                        ? `v ${t('Hide raw quota input')}`
                        : `> ${t('Use raw quota input')}`}
                    </div>
                    <div
                      style={{ display: showQuotaInput ? 'block' : 'none' }}
                      className='mt-2'
                    >
                      <Form.InputNumber
                        field='remain_quota'
                        label={t('Quota')}
                        placeholder={t('Enter quota')}
                        disabled={values.unlimited_quota}
                        min={0}
                        step={500000}
                        rules={
                          values.unlimited_quota
                            ? []
                            : [{ required: true, message: t('Please enter quota') }]
                        }
                        onChange={(val) => {
                          const quota = val === '' || val == null ? 0 : val;
                          formApiRef.current?.setValue('remain_quota', quota);
                          formApiRef.current?.setValue(
                            'remain_amount',
                            Number(quotaToDisplayAmount(quota).toFixed(6)),
                          );
                        }}
                        style={{ width: '100%' }}
                        showClear
                      />
                    </div>
                  </Col>
                  <Col span={24}>
                    <Form.Switch
                      field='unlimited_quota'
                      label={t('Unlimited quota')}
                      size='default'
                      extraText={t(
                        'Token quota only limits the token itself. Actual usage is also limited by the account balance.',
                      )}
                    />
                  </Col>
                </Row>
              </Card>

              <Card className='!rounded-2xl shadow-sm border-0'>
                <div className='flex items-center mb-2'>
                  <Avatar
                    size='small'
                    color='purple'
                    className='mr-2 shadow-md'
                  >
                    <IconLink size={16} />
                  </Avatar>
                  <div>
                    <Text className='text-lg font-medium'>
                      {t('Access Limits')}
                    </Text>
                    <div className='text-xs text-gray-600'>
                      {t('Set token access limits')}
                    </div>
                  </div>
                </div>
                <Row gutter={12}>
                  <Col span={24}>
                    <Form.Select
                      field='model_limits'
                      label={t('Model Limit List')}
                      placeholder={t(
                        'Select models supported by this token. Leave empty to support all models.',
                      )}
                      multiple
                      optionList={models}
                      extraText={t('Optional. Model limits are not recommended unless needed.')}
                      filter={selectFilter}
                      autoClearSearchValue={false}
                      searchPosition='dropdown'
                      showClear
                      style={{ width: '100%' }}
                    />
                  </Col>
                  <Col span={24}>
                    <Form.TextArea
                      field='allow_ips'
                      label={t('IP whitelist (CIDR supported)')}
                      placeholder={t('Allowed IPs, one per line. Empty means no limit.')}
                      autosize
                      rows={1}
                      extraText={t(
                        'Do not over-trust this feature. IPs may be spoofed. Use it with gateways such as nginx and CDN.',
                      )}
                      showClear
                      style={{ width: '100%' }}
                    />
                  </Col>
                </Row>
              </Card>
            </div>
          )}
        </Form>
      </Spin>
    </SideSheet>
  );
};

export default BatchAddTokenModal;

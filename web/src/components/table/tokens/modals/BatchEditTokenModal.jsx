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

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Checkbox,
  Banner,
  Space,
  Button,
  Select,
  Switch,
  DatePicker,
  InputNumber,
  TextArea,
  Col,
  Row,
  Typography,
} from '@douyinfe/semi-ui';
import {
  API,
  showError,
  renderGroupOption,
  getCurrencyConfig,
  getModelCategories,
  selectFilter,
} from '../../../../helpers';
import {
  displayAmountToQuota,
} from '../../../../helpers/quota';
import { useTranslation } from 'react-i18next';

const { Text } = Typography;

const BatchEditTokenModal = ({ visible, onCancel, onConfirm, selectedKeys }) => {
  const { t } = useTranslation();
  const [models, setModels] = useState([]);
  const [groups, setGroups] = useState([]);

  const [enableGroup, setEnableGroup] = useState(false);
  const [enableCrossGroupRetry, setEnableCrossGroupRetry] = useState(false);
  const [enableExpiredTime, setEnableExpiredTime] = useState(false);
  const [enableQuota, setEnableQuota] = useState(false);
  const [enableModelLimits, setEnableModelLimits] = useState(false);
  const [enableAllowIps, setEnableAllowIps] = useState(false);

  const [group, setGroup] = useState('');
  const [crossGroupRetry, setCrossGroupRetry] = useState(false);
  const [expiredTime, setExpiredTime] = useState(-1);
  const [remainAmount, setRemainAmount] = useState(0);
  const [unlimitedQuota, setUnlimitedQuota] = useState(true);
  const [modelLimits, setModelLimits] = useState([]);
  const [allowIps, setAllowIps] = useState('');

  const loadModels = async () => {
    try {
      const res = await API.get('/api/user/models');
      const { success, data } = res.data;
      if (success) {
        const categories = getModelCategories(t);
        const options = data.map((model) => {
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
      }
    } catch (_) {}
  };

  const loadGroups = async () => {
    try {
      const res = await API.get('/api/user/self/groups');
      const { success, data } = res.data;
      if (success) {
        const options = Object.entries(data).map(([groupKey, info]) => ({
          label: info.desc,
          value: groupKey,
          ratio: info.ratio,
        }));
        setGroups(options);
      }
    } catch (_) {}
  };

  useEffect(() => {
    if (visible) {
      loadModels();
      loadGroups();
    }
  }, [visible]);

  const resetForm = () => {
    setEnableGroup(false);
    setEnableCrossGroupRetry(false);
    setEnableExpiredTime(false);
    setEnableQuota(false);
    setEnableModelLimits(false);
    setEnableAllowIps(false);
    setGroup('');
    setCrossGroupRetry(false);
    setExpiredTime(-1);
    setRemainAmount(0);
    setUnlimitedQuota(true);
    setModelLimits([]);
    setAllowIps('');
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  const setExpiredTimeShortcut = (month, day, hour) => {
    if (month === 0 && day === 0 && hour === 0) {
      setExpiredTime(-1);
      return;
    }
    const now = new Date();
    let timestamp = now.getTime() / 1000;
    timestamp += month * 30 * 24 * 60 * 60;
    timestamp += day * 24 * 60 * 60;
    timestamp += hour * 60 * 60;
    setExpiredTime(Math.ceil(timestamp));
  };

  const handleSubmit = () => {
    const hasAny =
      enableGroup ||
      enableCrossGroupRetry ||
      enableExpiredTime ||
      enableQuota ||
      enableModelLimits ||
      enableAllowIps;

    if (!hasAny) {
      showError(t('请至少勾选一个要修改的字段'));
      return;
    }

    const fields = {};

    if (enableGroup) {
      fields.group = group;
    }
    if (enableCrossGroupRetry) {
      fields.cross_group_retry = crossGroupRetry;
    }
    if (enableExpiredTime) {
      if (expiredTime !== -1 && typeof expiredTime === 'string') {
        const time = Date.parse(expiredTime);
        if (isNaN(time)) {
          showError(t('过期时间格式错误！'));
          return;
        }
        fields.expired_time = Math.ceil(time / 1000);
      } else {
        fields.expired_time = expiredTime;
      }
    }
    if (enableQuota) {
      fields.unlimited_quota = unlimitedQuota;
      fields.remain_quota = unlimitedQuota ? 0 : displayAmountToQuota(remainAmount);
    }
    if (enableModelLimits) {
      fields.model_limits = modelLimits.join(',');
    }
    if (enableAllowIps) {
      fields.allow_ips = allowIps;
    }

    onConfirm(fields);
    resetForm();
  };

  return (
    <Modal
      title={t('批量编辑令牌') + ` (${selectedKeys.length})`}
      visible={visible}
      onCancel={handleCancel}
      onOk={handleSubmit}
      okText={t('保存')}
      cancelText={t('取消')}
      width={560}
      style={{ maxHeight: '80vh' }}
      bodyStyle={{ overflow: 'auto', maxHeight: '60vh' }}
    >
      <Banner
        type='info'
        description={t('仅勾选的字段会被修改，未勾选的字段保持不变。修改将覆盖所有选中令牌的对应值。')}
        className='mb-3'
        closeIcon={null}
      />

      <div className='flex flex-col gap-3'>
        {/* Group */}
        <div className='border rounded-lg p-3'>
          <Checkbox
            checked={enableGroup}
            onChange={(e) => setEnableGroup(e.target.checked)}
          >
            {t('令牌分组')}
          </Checkbox>
          <div className={enableGroup ? 'mt-2' : 'mt-2 opacity-40 pointer-events-none'}>
            {groups.length > 0 ? (
              <Select
                placeholder={t('令牌分组，默认为用户的分组')}
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
                value={group}
                onChange={setGroup}
                showClear
                style={{ width: '100%' }}
              />
            ) : (
              <Select
                placeholder={t('管理员未设置用户可选分组')}
                disabled
                style={{ width: '100%' }}
              />
            )}
          </div>
        </div>

        {/* Cross-group retry */}
        <div className='border rounded-lg p-3'>
          <Checkbox
            checked={enableCrossGroupRetry}
            onChange={(e) => setEnableCrossGroupRetry(e.target.checked)}
          >
            {t('跨分组重试')}
          </Checkbox>
          <div className={enableCrossGroupRetry ? 'mt-2' : 'mt-2 opacity-40 pointer-events-none'}>
            <Switch
              checked={crossGroupRetry}
              onChange={setCrossGroupRetry}
              size='default'
            />
          </div>
        </div>

        {/* Expired Time */}
        <div className='border rounded-lg p-3'>
          <Checkbox
            checked={enableExpiredTime}
            onChange={(e) => setEnableExpiredTime(e.target.checked)}
          >
            {t('过期时间')}
          </Checkbox>
          <div className={enableExpiredTime ? 'mt-2' : 'mt-2 opacity-40 pointer-events-none'}>
            <DatePicker
              type='dateTime'
              placeholder={t('请选择过期时间')}
              value={expiredTime === -1 ? null : expiredTime}
              onChange={(val) => setExpiredTime(val || -1)}
              showClear
              style={{ width: '100%' }}
            />
            <Space wrap className='mt-2'>
              <Button
                theme='light'
                type='primary'
                size='small'
                onClick={() => setExpiredTimeShortcut(0, 0, 0)}
              >
                {t('永不过期')}
              </Button>
              <Button
                theme='light'
                type='tertiary'
                size='small'
                onClick={() => setExpiredTimeShortcut(1, 0, 0)}
              >
                {t('一个月')}
              </Button>
              <Button
                theme='light'
                type='tertiary'
                size='small'
                onClick={() => setExpiredTimeShortcut(0, 1, 0)}
              >
                {t('一天')}
              </Button>
              <Button
                theme='light'
                type='tertiary'
                size='small'
                onClick={() => setExpiredTimeShortcut(0, 0, 1)}
              >
                {t('一小时')}
              </Button>
            </Space>
          </div>
        </div>

        {/* Quota */}
        <div className='border rounded-lg p-3'>
          <Checkbox
            checked={enableQuota}
            onChange={(e) => setEnableQuota(e.target.checked)}
          >
            {t('额度设置')}
          </Checkbox>
          <div className={enableQuota ? 'mt-2' : 'mt-2 opacity-40 pointer-events-none'}>
            <Row gutter={12}>
              <Col span={24}>
                <InputNumber
                  prefix={getCurrencyConfig().symbol}
                  placeholder={t('输入金额')}
                  precision={6}
                  disabled={unlimitedQuota}
                  min={0}
                  step={0.000001}
                  value={remainAmount}
                  onChange={(val) => setRemainAmount(val === '' || val == null ? 0 : val)}
                  style={{ width: '100%' }}
                  showClear
                />
              </Col>
              <Col span={24} className='mt-2'>
                <Space>
                  <Switch
                    checked={unlimitedQuota}
                    onChange={setUnlimitedQuota}
                    size='default'
                  />
                  <Text>{t('无限额度')}</Text>
                </Space>
              </Col>
            </Row>
          </div>
        </div>

        {/* Model Limits */}
        <div className='border rounded-lg p-3'>
          <Checkbox
            checked={enableModelLimits}
            onChange={(e) => setEnableModelLimits(e.target.checked)}
          >
            {t('模型限制列表')}
          </Checkbox>
          <div className={enableModelLimits ? 'mt-2' : 'mt-2 opacity-40 pointer-events-none'}>
            <Select
              placeholder={t('请选择该令牌支持的模型，留空支持所有模型')}
              multiple
              optionList={models}
              value={modelLimits}
              onChange={setModelLimits}
              filter={selectFilter}
              autoClearSearchValue={false}
              searchPosition='dropdown'
              showClear
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* IP Whitelist */}
        <div className='border rounded-lg p-3'>
          <Checkbox
            checked={enableAllowIps}
            onChange={(e) => setEnableAllowIps(e.target.checked)}
          >
            {t('IP白名单（支持CIDR表达式）')}
          </Checkbox>
          <div className={enableAllowIps ? 'mt-2' : 'mt-2 opacity-40 pointer-events-none'}>
            <TextArea
              placeholder={t('允许的IP，一行一个，不填写则不限制')}
              autosize
              rows={2}
              value={allowIps}
              onChange={setAllowIps}
              showClear
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default BatchEditTokenModal;

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
import { Button, Card, Tag, Typography } from '@douyinfe/semi-ui';
import {
  Copy as CopyIcon,
  CreditCard,
  Gift,
  LayoutDashboard,
  MessageCircle,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { marked } from 'marked';
import { useTranslation } from 'react-i18next';
import {
  API,
  copy,
  getLogo,
  getSystemName,
  showError,
  showSuccess,
} from '../../helpers';
import { useIsMobile } from '../../hooks/common/useIsMobile';
import { useActualTheme } from '../../context/Theme';
import NoticeModal from '../../components/layout/NoticeModal';

const { Text, Title } = Typography;

const BASE_URL = 'https://reverse-api.xyz';
const RECHARGE_URL = 'https://pay.ldxp.cn/shop/OMVWLM92';
const QQ_GROUP_URL = 'https://qm.qq.com/q/qFApKRd1dK';
const PROVIDERS = ['GPT', 'CLAUDE'];
const SUPPORTED_MODELS = [
  'gpt-5.4',
  'gpt5.5',
  'sonnet-4.6',
  'opus-4.6',
  'opus-4.7',
  'opus-4.8',
];

const Home = () => {
  const { t, i18n } = useTranslation();
  const actualTheme = useActualTheme();
  const isMobile = useIsMobile();
  const [homePageContentLoaded, setHomePageContentLoaded] = useState(false);
  const [homePageContent, setHomePageContent] = useState('');
  const [noticeVisible, setNoticeVisible] = useState(false);
  const logo = getLogo();
  const systemName = getSystemName();

  const displayHomePageContent = async () => {
    setHomePageContent(localStorage.getItem('home_page_content') || '');
    const res = await API.get('/api/home_page_content');
    const { success, message, data } = res.data;
    if (success) {
      const rawContent = data || '';
      const content = rawContent.startsWith('https://')
        ? rawContent
        : marked.parse(rawContent);
      setHomePageContent(content);
      localStorage.setItem('home_page_content', content);

      if (rawContent.startsWith('https://')) {
        const iframe = document.querySelector('iframe');
        if (iframe) {
          iframe.onload = () => {
            iframe.contentWindow.postMessage({ themeMode: actualTheme }, '*');
            iframe.contentWindow.postMessage({ lang: i18n.language }, '*');
          };
        }
      }
    } else {
      showError(message);
      setHomePageContent(t('Failed to load home page content'));
    }
    setHomePageContentLoaded(true);
  };

  const handleCopyBaseURL = async () => {
    const ok = await copy(BASE_URL);
    if (ok) {
      showSuccess(t('Copied to clipboard'));
    }
  };

  useEffect(() => {
    const checkNoticeAndShow = async () => {
      const lastCloseDate = localStorage.getItem('notice_close_date');
      const today = new Date().toDateString();
      if (lastCloseDate !== today) {
        try {
          const res = await API.get('/api/notice');
          const { success, data } = res.data;
          if (success && data && data.trim() !== '') {
            setNoticeVisible(true);
          }
        } catch (error) {
          console.error('Failed to load notice:', error);
        }
      }
    };

    checkNoticeAndShow();
  }, []);

  useEffect(() => {
    displayHomePageContent().then();
  }, []);

  return (
    <div className='classic-page-fill classic-home-page w-full overflow-x-hidden'>
      <NoticeModal
        visible={noticeVisible}
        onClose={() => setNoticeVisible(false)}
        isMobile={isMobile}
      />
      {homePageContentLoaded && homePageContent === '' ? (
        <div className='classic-home-default classic-reverse-home w-full'>
          <div className='classic-reverse-grid' aria-hidden />
          <img
            src={logo}
            alt=''
            aria-hidden
            className='classic-reverse-watermark'
          />

          <section className='classic-reverse-shell'>
            <div className='classic-reverse-hero'>
              <Tag color='blue' shape='circle' className='!px-4 !py-1'>
                {t('GPT and CLAUDE ready')}
              </Tag>
              <img
                src={logo}
                alt={systemName || 'Reverse API'}
                className='classic-reverse-logo'
              />
              <div className='flex flex-col items-center gap-3'>
                <Title heading={1} className='!m-0 classic-reverse-title'>
                  Reverse API
                </Title>
                <Title heading={3} className='!m-0 !text-semi-color-primary'>
                  {t('Stable. Fast.')}
                </Title>
                <Text className='classic-reverse-subtitle'>
                  {t('A clean relay endpoint for GPT and CLAUDE model access.')}
                </Text>
              </div>

              <div className='classic-reverse-actions'>
                <Link to='/console' className='classic-reverse-action-link'>
                  <Button
                    theme='solid'
                    type='primary'
                    icon={<LayoutDashboard size={16} />}
                    className='classic-reverse-action'
                  >
                    {t('Enter console')}
                  </Button>
                </Link>
                <Button
                  theme='outline'
                  type='tertiary'
                  icon={<CreditCard size={16} />}
                  className='classic-reverse-action'
                  onClick={() => window.open(RECHARGE_URL, '_blank')}
                >
                  {t('Online recharge')}
                </Button>
                <Link
                  to='/console/topup#redeem-cdk'
                  className='classic-reverse-action-link'
                >
                  <Button
                    theme='outline'
                    type='tertiary'
                    icon={<Gift size={16} />}
                    className='classic-reverse-action'
                  >
                    {t('Redeem CDK')}
                  </Button>
                </Link>
                <Button
                  theme='outline'
                  type='tertiary'
                  icon={<MessageCircle size={16} />}
                  className='classic-reverse-action'
                  onClick={() => window.open(QQ_GROUP_URL, '_blank')}
                >
                  {t('Join after-sales QQ group')}
                </Button>
              </div>
            </div>

            <div className='classic-reverse-info-grid'>
              <Card className='classic-reverse-card'>
                <div className='classic-reverse-card-title'>
                  <Server size={18} />
                  <span>BASE_URL</span>
                </div>
                <Text type='secondary'>
                  {t(
                    'Use this endpoint as the base URL in compatible clients.',
                  )}
                </Text>
                <div className='classic-reverse-base-url'>
                  <code>{BASE_URL}</code>
                  <Button
                    size='small'
                    theme='outline'
                    type='tertiary'
                    icon={<CopyIcon size={14} />}
                    onClick={handleCopyBaseURL}
                  >
                    {t('Copy')}
                  </Button>
                </div>
              </Card>

              <Card className='classic-reverse-card'>
                <div className='classic-reverse-card-title'>
                  <Sparkles size={18} />
                  <span>{t('Supported models')}</span>
                </div>
                <Text type='secondary'>
                  {t(
                    'Start from the console, recharge online, redeem CDK, or join after-sales support from one place.',
                  )}
                </Text>
                <div className='classic-reverse-models'>
                  {SUPPORTED_MODELS.map((model) => (
                    <Tag key={model} color='white' className='font-mono'>
                      {model}
                    </Tag>
                  ))}
                </div>
                <div className='classic-reverse-feature-grid'>
                  <div className='classic-reverse-feature'>
                    <ShieldCheck size={16} />
                    <span>{t('Stable routing')}</span>
                  </div>
                  <div className='classic-reverse-feature'>
                    <Zap size={16} />
                    <span>{t('High-speed responses')}</span>
                  </div>
                </div>
              </Card>
            </div>

            <div className='classic-reverse-provider-grid'>
              {PROVIDERS.map((provider) => (
                <Card key={provider} className='classic-reverse-provider-card'>
                  <div className='classic-reverse-provider-name'>
                    <span>{provider}</span>
                    <Rocket size={18} />
                  </div>
                  <Text type='secondary'>{t('Support vendors')}</Text>
                </Card>
              ))}
            </div>
          </section>
        </div>
      ) : (
        <div className='classic-page-fill overflow-x-hidden w-full'>
          {homePageContent.startsWith('https://') ? (
            <iframe
              src={homePageContent}
              className='w-full h-full border-none'
              title={t('Custom Home Page')}
            />
          ) : (
            <div
              className='mt-[60px]'
              dangerouslySetInnerHTML={{ __html: homePageContent }}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default Home;

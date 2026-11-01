/*
Copyright (C) 2023-2026 QuantumNous

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
import { Claude, DeepSeek, Gemini, OpenAI } from '@lobehub/icons'
import { Link } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  GitBranch,
  KeyRound,
  Layers,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'

import '@/styles/home-editorial.css'

import { ConnectionPanel } from './connection-panel'

export function EditorialLanding(props: { isAuthenticated?: boolean }) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const systemName = status?.system_name || 'New API'
  const docsUrl =
    typeof status?.docs_link === 'string' && status.docs_link
      ? status.docs_link
      : 'https://docs.newapi.pro'
  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const capabilities = [
    {
      number: '01',
      icon: Braces,
      title: t('Keep your favorite protocol'),
      description: t(
        'Connect through OpenAI, Anthropic, or Gemini compatible routes using the tools you already know.'
      ),
    },
    {
      number: '02',
      icon: GitBranch,
      title: t('Give every model a route'),
      description: t(
        'Manage providers and channels in one place, with routing and fallback controls for your applications.'
      ),
    },
    {
      number: '03',
      icon: KeyRound,
      title: t('A key for every workflow'),
      description: t(
        'Organize API keys and access permissions around your applications, projects, and team.'
      ),
    },
    {
      number: '04',
      icon: Layers,
      title: t('Know what you are using'),
      description: t(
        'Review requests, usage, and costs together so you can understand how your applications run.'
      ),
    },
  ]

  return (
    <main className='home-page'>
      <div className='home-masthead'>
        <span className='home-kicker'>{t('The connection layer for AI')}</span>
        <a href='#connect' className='home-section-link'>
          {t('From idea to API')}
          <ArrowDown aria-hidden='true' size={13} />
        </a>
      </div>

      <section className='home-hero' aria-labelledby='home-title'>
        <div className='home-hero-copy'>
          <h1 id='home-title' className='home-title'>
            {t('Many models.')}
            <em>{t('One connection.')}</em>
          </h1>
          <p className='home-lead'>
            {t(
              'A clear path from your application to the AI models it needs. One address, familiar protocols, and room to build.'
            )}
          </p>
          <div className='home-actions'>
            <Button
              role='link'
              render={
                <Link to={props.isAuthenticated ? '/dashboard' : '/sign-up'} />
              }
              className='home-action'
            >
              {props.isAuthenticated ? t('Go to Dashboard') : t('Get Started')}
              <ArrowUpRight aria-hidden='true' />
            </Button>
            <Button
              variant='outline'
              role='link'
              render={<Link to='/pricing' />}
              className='home-action'
            >
              {t('Explore models')}
              <ArrowRight aria-hidden='true' />
            </Button>
          </div>
          <p className='home-hero-footnote'>
            {t('Your tools. Your models. Your next idea.')}
          </p>
        </div>

        <div className='home-switchboard-group'>
          <div
            className='home-switchboard'
            role='img'
            aria-label={`${t('AI providers connected through one gateway')}: ${systemName}`}
          >
            <svg
              viewBox='0 0 480 380'
              className='home-switchboard-lines'
              aria-hidden='true'
            >
              <circle cx='240' cy='190' r='145' />
              <circle cx='240' cy='190' r='99' />
              <path d='M92 77H180V190H240 M385 85H310V190H240 M76 292H175V190H240 M390 298H310V190H240' />
              <path className='home-active-line' d='M92 77H180V190H240' />
              <path d='M22 20h12m-6-6v12M446 20h12m-6-6v12M22 360h12m-6-6v12M446 360h12m-6-6v12' />
            </svg>
            <div
              className='home-provider home-provider-openai'
              aria-hidden='true'
            >
              <OpenAI size={24} />
              <span>OpenAI</span>
            </div>
            <div
              className='home-provider home-provider-claude'
              aria-hidden='true'
            >
              <Claude size={25} />
              <span>Anthropic</span>
            </div>
            <div
              className='home-provider home-provider-gemini'
              aria-hidden='true'
            >
              <Gemini size={25} />
              <span>Gemini</span>
            </div>
            <div
              className='home-provider home-provider-deepseek'
              aria-hidden='true'
            >
              <DeepSeek size={25} />
              <span>DeepSeek</span>
            </div>
            <div className='home-gateway' aria-hidden='true'>
              <span>API</span>
              <ArrowUpRight size={32} />
            </div>
          </div>
          <div className='home-gateway-name' title={systemName}>
            {systemName}
          </div>
          <span className='home-switchboard-caption' aria-hidden='true'>
            {t('Different models. Common ground.')}
          </span>
        </div>
      </section>

      <div className='home-protocol-strip'>
        <span className='home-kicker'>{t('Built to connect')}</span>
        <div>
          <span>OpenAI API</span>
          <span>Anthropic API</span>
          <span>Gemini API</span>
          <span>SDK / CLI</span>
        </div>
        <span className='home-strip-note'>
          {t('Available models depend on configured channels.')}
        </span>
      </div>

      <ConnectionPanel origin={origin} docsUrl={docsUrl} />

      <section
        className='home-capabilities'
        aria-labelledby='home-capabilities-title'
      >
        <div className='home-section-heading'>
          <span className='home-kicker'>
            <span>02</span> {t('Behind the connection')}
          </span>
          <h2 id='home-capabilities-title'>
            {t('Less plumbing.')}
            <em>{t('More building.')}</em>
          </h2>
          <p>
            {t(
              'The practical details of running AI applications, brought together in one gateway.'
            )}
          </p>
        </div>
        <div className='home-capability-list'>
          {capabilities.map((item) => (
            <div key={item.number} className='home-capability'>
              <span className='home-capability-number'>{item.number}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <item.icon size={23} strokeWidth={1.4} aria-hidden='true' />
            </div>
          ))}
        </div>
      </section>

      <section className='home-start' aria-labelledby='home-start-title'>
        <div>
          <span className='home-kicker'>
            <span>03</span> {t('Make something')}
          </span>
          <h2 id='home-start-title'>{t('The next step is yours.')}</h2>
          <p>
            {t(
              'Choose a model, create an API key, and connect your application. Start with a small idea and take it from there.'
            )}
          </p>
        </div>
        <div className='home-start-actions'>
          <Button
            role='link'
            render={<Link to={props.isAuthenticated ? '/keys' : '/sign-up'} />}
            className='home-action'
          >
            {t('Create an API key')}
            <ArrowUpRight aria-hidden='true' />
          </Button>
          <a className='home-section-link' href='#connect'>
            {t('See the request example')}
            <ArrowUpRight aria-hidden='true' size={15} />
          </a>
        </div>
      </section>
    </main>
  )
}

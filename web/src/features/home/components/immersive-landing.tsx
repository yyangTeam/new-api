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
import { Link } from '@tanstack/react-router'
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Braces,
  GitBranch,
  KeyRound,
  Layers,
  Pause,
  Play,
  Sparkles,
} from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Glow } from '@/components/layout/components/glow'
import { Button } from '@/components/ui/button'
import { useStatus } from '@/hooks/use-status'

import '@/styles/home-immersive.css'

import { ConnectionPanel, type ApiProtocol } from './connection-panel'
import { ModelConstellation, type ModelProvider } from './model-constellation'

const providerProtocols: Record<ModelProvider, ApiProtocol> = {
  openai: 'openai',
  claude: 'anthropic',
  gemini: 'gemini',
  deepseek: 'openai',
}

const protocolNames = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
}

export function ImmersiveLanding(props: { isAuthenticated?: boolean }) {
  const { t } = useTranslation()
  const [paused, setPaused] = useState(false)
  const [provider, setProvider] = useState<ModelProvider>('openai')
  const protocol = providerProtocols[provider]
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
    <main className='home-page' data-motion={paused ? 'paused' : 'running'}>
      <section className='home-hero' aria-labelledby='home-title'>
        <Glow variant='center' className='home-aurora' aria-hidden='true' />
        <div className='home-starfield' aria-hidden='true' />
        <div className='home-floor' aria-hidden='true'>
          <div />
        </div>
        <div className='home-horizon' aria-hidden='true' />
        <div className='home-masthead'>
          <span className='home-kicker'>
            <Sparkles aria-hidden='true' size={14} />
            {t('The connection layer for AI')}
          </span>
          <div className='home-masthead-actions'>
            <a href='#connect' className='home-section-link'>
              {t('From idea to API')}
              <ArrowDown aria-hidden='true' size={13} />
            </a>
            <Button
              variant='ghost'
              size='icon'
              className='home-motion-control'
              aria-label={
                paused ? t('Resume animations') : t('Pause animations')
              }
              title={paused ? t('Resume animations') : t('Pause animations')}
              onClick={() => setPaused(!paused)}
            >
              {paused ? (
                <Play aria-hidden='true' />
              ) : (
                <Pause aria-hidden='true' />
              )}
            </Button>
          </div>
        </div>
        <div className='home-hero-body'>
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
                  <Link
                    to={props.isAuthenticated ? '/dashboard' : '/sign-up'}
                  />
                }
                className='home-action'
              >
                {props.isAuthenticated
                  ? t('Go to Dashboard')
                  : t('Get Started')}
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
            <div className='home-signal-path' aria-hidden='true'>
              <span>SDK / CLI</span>
              <ArrowRight size={14} />
              <strong>API</strong>
              <ArrowRight size={14} />
              <span>{protocolNames[protocol]} API</span>
            </div>
          </div>

          <ModelConstellation
            systemName={systemName}
            selected={provider}
            onSelect={setProvider}
            paused={paused}
          />
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

      <ConnectionPanel
        origin={origin}
        docsUrl={docsUrl}
        selected={protocol}
        onSelect={(next) => setProvider(next === 'anthropic' ? 'claude' : next)}
      />

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
              <div className='home-capability-icon'>
                <item.icon size={25} strokeWidth={1.6} aria-hidden='true' />
              </div>
              <span className='home-capability-number'>{item.number}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
              <div className='home-capability-signal' aria-hidden='true'>
                <i />
                <i />
                <i />
                <i />
                <i />
              </div>
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

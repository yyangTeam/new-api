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
import { ArrowUpRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const protocols = [
  {
    id: 'openai',
    name: 'OpenAI',
    basePath: '/v1',
    path: '/v1/chat/completions',
    headers: ['-H "Authorization: Bearer $NEW_API_KEY"'],
    body: '{"model":"your-model","messages":[{"role":"user","content":"Hello"}]}',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    basePath: '',
    path: '/v1/messages',
    headers: [
      '-H "x-api-key: $NEW_API_KEY"',
      "-H 'anthropic-version: 2023-06-01'",
    ],
    body: '{"model":"your-model","max_tokens":256,"messages":[{"role":"user","content":"Hello"}]}',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    basePath: '',
    path: '/v1beta/models/your-model:generateContent',
    headers: ['-H "x-goog-api-key: $NEW_API_KEY"'],
    body: '{"contents":[{"parts":[{"text":"Hello"}]}]}',
  },
] as const

export type ApiProtocol = (typeof protocols)[number]['id']

export function ConnectionPanel(props: {
  origin: string
  docsUrl: string
  selected: ApiProtocol
  onSelect: (protocol: ApiProtocol) => void
}) {
  const { t } = useTranslation()
  const protocol =
    protocols.find((item) => item.id === props.selected) ?? protocols[0]
  const baseUrl = `${props.origin}${protocol.basePath}`
  const request = [
    `curl '${props.origin}${protocol.path}'`,
    ...protocol.headers.map((header) => `  ${header}`),
    "  -H 'Content-Type: application/json'",
    `  -d '${protocol.body}'`,
  ].join(' \\\n')
  const docsLink = props.docsUrl.startsWith('http') ? (
    <a href={props.docsUrl} target='_blank' rel='noopener noreferrer' />
  ) : (
    <Link to={props.docsUrl} />
  )

  return (
    <section
      id='connect'
      className='home-connect'
      aria-label={t('API connection example')}
    >
      <div className='home-connect-intro'>
        <span className='home-kicker'>
          <span>01</span> {t('Make the connection')}
        </span>
        <h2>{t('Your next request starts here.')}</h2>
        <p>
          {t(
            'Use this address in your SDK or favorite AI application. Choose a protocol to see a request example.'
          )}
        </p>
        <div className='home-base-url'>
          <span className='home-kicker'>{t('API Base URL')}</span>
          <div>
            <code>{baseUrl}</code>
            <CopyButton value={baseUrl} aria-label={t('Copy API base URL')} />
          </div>
        </div>
        <Button
          variant='link'
          role='link'
          render={docsLink}
          className='home-guide-link'
        >
          {t('Read the integration guide')}
          <ArrowUpRight aria-hidden='true' />
        </Button>
      </div>

      <Tabs
        value={props.selected}
        onValueChange={(value) => {
          const next = protocols.find((item) => item.id === value)
          if (next) props.onSelect(next.id)
        }}
        className='home-request'
      >
        <div className='home-terminal-heading'>
          <div className='home-terminal-dots' aria-hidden='true'>
            <span />
            <span />
            <span />
          </div>
          <span>{protocol.name} API</span>
          <code>POST</code>
        </div>
        <div className='home-request-toolbar'>
          <TabsList variant='line' aria-label={t('API protocol')}>
            {protocols.map((item) => (
              <TabsTrigger key={item.id} value={item.id}>
                {item.name}
              </TabsTrigger>
            ))}
          </TabsList>
          <CopyButton value={request} aria-label={t('Copy request example')} />
        </div>
        <div className='home-request-endpoint'>
          <span aria-hidden='true'>↳</span>
          <code>{protocol.path}</code>
        </div>
        {protocols.map((item) => (
          <TabsContent key={item.id} value={item.id}>
            <pre aria-label={t('Request example')}>
              <code>{request}</code>
            </pre>
          </TabsContent>
        ))}
        <p className='home-request-note'>
          {t('Replace the example model and set NEW_API_KEY before running.')}
        </p>
      </Tabs>
    </section>
  )
}

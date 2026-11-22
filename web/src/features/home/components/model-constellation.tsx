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
import { useEffect, useId, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useMediaQuery } from '@/hooks/use-media-query'

const providers = [
  {
    id: 'openai',
    name: 'OpenAI',
    api: 'OpenAI API',
    Icon: OpenAI,
    route: 'M100 110H195L280 195V245L360 290',
  },
  {
    id: 'claude',
    name: 'Anthropic',
    api: 'Anthropic API',
    Icon: Claude.Color,
    route: 'M620 135H535L450 220V250L360 290',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    api: 'Gemini API',
    Icon: Gemini.Color,
    route: 'M100 450H195L280 365V335L360 290',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    api: 'OpenAI API',
    Icon: DeepSeek.Color,
    route: 'M620 440H535L450 355V325L360 290',
  },
] as const

export type ModelProvider = (typeof providers)[number]['id']

export function ModelConstellation(props: {
  systemName: string
  selected: ModelProvider
  onSelect: (provider: ModelProvider) => void
  paused: boolean
}) {
  const { t } = useTranslation()
  const gradientId = useId()
  const sceneRef = useRef<HTMLDivElement>(null)
  const boundsRef = useRef<DOMRect | null>(null)
  const [hovered, setHovered] = useState<ModelProvider | null>(null)
  const limitedMotion = useMediaQuery(
    '(prefers-reduced-motion: reduce), (pointer: coarse)'
  )
  const motionDisabled = props.paused || limitedMotion

  useEffect(() => {
    if (motionDisabled) {
      sceneRef.current?.style.setProperty('--scene-x', '0deg')
      sceneRef.current?.style.setProperty('--scene-y', '0deg')
    }
  }, [motionDisabled])

  return (
    <div className='home-switchboard-group'>
      <div
        className='home-switchboard'
        data-route={hovered ?? props.selected}
        onPointerEnter={(event) => {
          boundsRef.current = event.currentTarget.getBoundingClientRect()
        }}
        onPointerMove={(event) => {
          const bounds = boundsRef.current
          if (motionDisabled || event.pointerType !== 'mouse' || !bounds) return
          const x = Math.max(
            -1,
            Math.min(1, ((event.clientX - bounds.left) / bounds.width) * 2 - 1)
          )
          const y = Math.max(
            -1,
            Math.min(1, ((event.clientY - bounds.top) / bounds.height) * 2 - 1)
          )
          sceneRef.current?.style.setProperty('--scene-y', `${x * 12}deg`)
          sceneRef.current?.style.setProperty('--scene-x', `${-y * 9}deg`)
        }}
        onPointerLeave={() => {
          boundsRef.current = null
          setHovered(null)
          sceneRef.current?.style.setProperty('--scene-x', '0deg')
          sceneRef.current?.style.setProperty('--scene-y', '0deg')
        }}
      >
        <div
          className='home-scene-art'
          role='img'
          aria-label={`${t('AI providers connected through one gateway')}: ${props.systemName}`}
        >
          <div className='home-scene-halo' aria-hidden='true' />
          <svg
            viewBox='0 0 720 580'
            preserveAspectRatio='none'
            className='home-switchboard-lines'
            aria-hidden='true'
          >
            <defs>
              <linearGradient id={gradientId} x1='0' x2='1' y1='0' y2='1'>
                <stop stopColor='#64f4ff' />
                <stop offset='.5' stopColor='#7794ff' />
                <stop offset='1' stopColor='#c1a1ff' />
              </linearGradient>
            </defs>
            <g className='home-circuit-traces'>
              <path d='M0 180H120L185 245H260M720 195H600L535 260H475M0 385H125L195 320H265M720 375H600L540 315H475M215 0V80L310 175M505 0V95L430 170M230 580V500L310 415M490 580V485L425 415' />
              <path d='M0 200H100L160 260H240M720 215H620L555 280H500M0 365H105L170 300H245M720 395H620L550 335H505' />
              <circle cx='120' cy='180' r='4' />
              <circle cx='600' cy='195' r='4' />
              <circle cx='125' cy='385' r='4' />
              <circle cx='600' cy='375' r='4' />
            </g>
            {providers.map((provider) => (
              <g
                key={provider.id}
                className='home-model-route'
                data-provider={provider.id}
                stroke={`url(#${gradientId})`}
              >
                <path d={provider.route} className='home-route-track' />
                <path d={provider.route} className='home-route-pulse' />
              </g>
            ))}
            <g className='home-scene-markers'>
              <path d='M35 45h20m-10-10v20M665 525h20m-10-10v20M340 65h40M340 515h40' />
              <circle cx='360' cy='65' r='3' />
              <circle cx='360' cy='515' r='3' />
            </g>
          </svg>
          <div
            ref={sceneRef}
            className='home-scene-parallax'
            aria-hidden='true'
          >
            <div className='home-energy-ring home-energy-ring-one' />
            <div className='home-energy-ring home-energy-ring-two' />
            <div className='home-core-stage'>
              <div className='home-core-shadow' />
              <div className='home-chip-base' />
              <div className='home-chip-mid' />
              <div className='home-chip-pins'>
                <span />
                <span />
                <span />
                <span />
              </div>
              <div className='home-chip-top'>
                <svg viewBox='0 0 260 260' className='home-chip-circuits'>
                  <path d='M0 45H35L60 70H90M0 65H25L60 100H75M260 45H225L200 70H170M260 65H235L200 100H185M0 215H35L60 190H90M0 195H25L60 160H75M260 215H225L200 190H170M260 195H235L200 160H185M95 0V25L110 40V65M165 0V25L150 40V65M95 260V235L110 220V195M165 260V235L150 220V195' />
                  <circle cx='90' cy='70' r='3' />
                  <circle cx='170' cy='70' r='3' />
                  <circle cx='90' cy='190' r='3' />
                  <circle cx='170' cy='190' r='3' />
                </svg>
                <div className='home-chip-die'>
                  <div className='home-core-emblem'>
                    <span />
                    <span />
                    <span />
                  </div>
                  <strong>API</strong>
                  <span className='home-chip-die-label'>NEW API</span>
                </div>
                <span className='home-chip-corner home-chip-corner-one' />
                <span className='home-chip-corner home-chip-corner-two' />
              </div>
              <div className='home-chip-glass' />
            </div>
            <div className='home-core-axis' />
          </div>
          <span className='home-scene-coordinate' aria-hidden='true'>
            01 / API
          </span>
        </div>
        <div
          className='home-model-controls'
          role='group'
          aria-label={t('API protocol')}
        >
          {providers.map((provider) => (
            <Button
              key={provider.id}
              variant='outline'
              className={`home-provider home-provider-${provider.id}`}
              aria-label={provider.name}
              aria-pressed={props.selected === provider.id}
              aria-controls='connect'
              onClick={() => props.onSelect(provider.id)}
              onPointerEnter={() => setHovered(provider.id)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(provider.id)}
              onBlur={() => setHovered(null)}
            >
              <provider.Icon size={28} aria-hidden='true' />
              <span>
                <strong>{provider.name}</strong>
                <small>{provider.api}</small>
              </span>
              <i aria-hidden='true' />
            </Button>
          ))}
        </div>
      </div>
      <div className='home-gateway-name' title={props.systemName}>
        {props.systemName}
      </div>
      <p className='home-switchboard-caption'>
        {t('Select a model to explore its connection.')}
      </p>
    </div>
  )
}

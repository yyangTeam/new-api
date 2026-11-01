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
import { useId } from 'react'
import { useTranslation } from 'react-i18next'

export function ModelConstellation(props: { systemName: string }) {
  const { t } = useTranslation()
  const gradientId = useId()

  return (
    <div className='home-switchboard-group'>
      <div
        className='home-switchboard'
        role='img'
        aria-label={`${t('AI providers connected through one gateway')}: ${props.systemName}`}
      >
        <svg
          viewBox='0 0 800 360'
          preserveAspectRatio='none'
          className='home-switchboard-lines'
          aria-hidden='true'
        >
          <defs>
            <linearGradient id={gradientId} x1='0' x2='1' y1='0' y2='1'>
              <stop stopColor='#7cefff' />
              <stop offset='.5' stopColor='#8b8cff' />
              <stop offset='1' stopColor='#e089ff' />
            </linearGradient>
          </defs>
          <ellipse
            cx='400'
            cy='180'
            rx='295'
            ry='136'
            className='home-orbit-track'
          />
          <ellipse
            cx='400'
            cy='180'
            rx='345'
            ry='88'
            className='home-orbit-track'
          />
          <g className='home-model-routes' stroke={`url(#${gradientId})`}>
            <path d='M150 80C250 80 255 180 400 180' />
            <path d='M650 80C550 80 545 180 400 180' />
            <path d='M150 275C255 275 255 180 400 180' />
            <path d='M650 275C545 275 545 180 400 180' />
          </g>
          <g className='home-route-pulses' stroke={`url(#${gradientId})`}>
            <path d='M150 80C250 80 255 180 400 180' />
            <path d='M650 80C550 80 545 180 400 180' />
            <path d='M150 275C255 275 255 180 400 180' />
            <path d='M650 275C545 275 545 180 400 180' />
          </g>
          <g className='home-orbit-stars'>
            <circle cx='105' cy='180' r='3' />
            <circle cx='695' cy='180' r='3' />
            <circle cx='400' cy='44' r='2' />
            <circle cx='400' cy='316' r='2' />
            <path d='M60 40h10m-5-5v10M730 320h10m-5-5v10' />
          </g>
        </svg>
        <div
          className='home-orbital-ring home-orbital-ring-one'
          aria-hidden='true'
        />
        <div
          className='home-orbital-ring home-orbital-ring-two'
          aria-hidden='true'
        />
        <div className='home-provider home-provider-openai' aria-hidden='true'>
          <OpenAI size={26} />
          <span>OpenAI</span>
          <i />
        </div>
        <div className='home-provider home-provider-claude' aria-hidden='true'>
          <Claude.Color size={27} />
          <span>Anthropic</span>
          <i />
        </div>
        <div className='home-provider home-provider-gemini' aria-hidden='true'>
          <Gemini.Color size={27} />
          <span>Gemini</span>
          <i />
        </div>
        <div
          className='home-provider home-provider-deepseek'
          aria-hidden='true'
        >
          <DeepSeek.Color size={27} />
          <span>DeepSeek</span>
          <i />
        </div>
        <div className='home-gateway' aria-hidden='true'>
          <svg viewBox='0 0 200 200' className='home-core-grid'>
            <circle cx='100' cy='100' r='94' />
            <ellipse cx='100' cy='100' rx='70' ry='94' />
            <ellipse cx='100' cy='100' rx='34' ry='94' />
            <ellipse cx='100' cy='100' rx='94' ry='32' />
            <ellipse cx='100' cy='100' rx='94' ry='65' />
            <path d='M6 100H194M100 6V194' />
          </svg>
          <div className='home-core-emblem'>
            <span />
            <span />
            <span />
          </div>
          <strong>API</strong>
        </div>
      </div>
      <div className='home-gateway-name' title={props.systemName}>
        {props.systemName}
      </div>
      <span className='home-switchboard-caption' aria-hidden='true'>
        {t('Different models. Common ground.')}
      </span>
    </div>
  )
}

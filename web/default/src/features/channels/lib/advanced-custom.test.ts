import {
  CHANNEL_TYPE_ADVANCED_CUSTOM,
  ADVANCED_CUSTOM_CONVERTER_OPTIONS,
  ADVANCED_CUSTOM_AUTH_MODE_OPTIONS,
  ADVANCED_CUSTOM_INCOMING_PATH_OPTIONS,
  ADVANCED_CUSTOM_TEMPLATE_OPTIONS,
  cloneAdvancedCustomConfig,
  getAdvancedCustomTemplateConfig,
  createAdvancedCustomRoute,
  createAdvancedCustomConfig,
  getAdvancedCustomUpstreamPathPlaceholder,
  getAdvancedCustomIncomingPathOptions,
  getDefaultAdvancedCustomIncomingPath,
  isAdvancedCustomIncomingPathAllowed,
  getAdvancedCustomConverterOptions,
  getAdvancedCustomIncomingPathLabel,
  parseAdvancedCustomConfig,
  stringifyAdvancedCustomConfig,
  normalizeAdvancedCustomConfig,
  validateAdvancedCustomConfig,
  advancedCustomConfigUsesRelativeUpstreamPath,
  getAdvancedCustomStats,
  getAdvancedCustomAuthMode,
  buildAdvancedCustomAuth,
} from './advanced-custom'
import type { AdvancedCustomConfig, AdvancedCustomRoute } from '../types'

describe('CHANNEL_TYPE_ADVANCED_CUSTOM', () => {
  test('equals 58', () => {
    expect(CHANNEL_TYPE_ADVANCED_CUSTOM).toBe(58)
  })
})

describe('cloneAdvancedCustomConfig', () => {
  test('returns a deep copy', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
        },
      ],
    }
    const cloned = cloneAdvancedCustomConfig(config)
    expect(cloned).toEqual(config)
    expect(cloned).not.toBe(config)
    expect(cloned.advanced_routes).not.toBe(config.advanced_routes)
  })

  test('mutating the clone does not affect the original', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
        },
      ],
    }
    const cloned = cloneAdvancedCustomConfig(config)
    cloned.advanced_routes![0].incoming_path = '/v1/embeddings'
    expect(config.advanced_routes![0].incoming_path).toBe(
      '/v1/chat/completions'
    )
  })
})

describe('getAdvancedCustomTemplateConfig', () => {
  test('returns config for a known template', () => {
    const config = getAdvancedCustomTemplateConfig('official_openai_chat')
    expect(config.advanced_routes).toHaveLength(1)
    expect(config.advanced_routes![0].incoming_path).toBe(
      '/v1/chat/completions'
    )
    expect(config.advanced_routes![0].converter).toBe('none')
  })

  test('returns a deep copy (mutations do not affect template)', () => {
    const config = getAdvancedCustomTemplateConfig('official_openai_chat')
    config.advanced_routes![0].incoming_path = '/changed'
    const again = getAdvancedCustomTemplateConfig('official_openai_chat')
    expect(again.advanced_routes![0].incoming_path).toBe(
      '/v1/chat/completions'
    )
  })

  test('returns first template for unknown key', () => {
    const config = getAdvancedCustomTemplateConfig('nonexistent_template')
    const firstTemplate = ADVANCED_CUSTOM_TEMPLATE_OPTIONS[0]
    expect(config.advanced_routes!.length).toBe(
      firstTemplate.config.advanced_routes!.length
    )
    expect(config.advanced_routes![0].incoming_path).toBe(
      firstTemplate.config.advanced_routes![0].incoming_path
    )
  })

  test('official_openai_images has two routes', () => {
    const config = getAdvancedCustomTemplateConfig('official_openai_images')
    expect(config.advanced_routes).toHaveLength(2)
    expect(config.advanced_routes![0].incoming_path).toBe(
      '/v1/images/generations'
    )
    expect(config.advanced_routes![1].incoming_path).toBe('/v1/images/edits')
  })

  test('official_gemini_native has three routes with query auth', () => {
    const config = getAdvancedCustomTemplateConfig('official_gemini_native')
    expect(config.advanced_routes).toHaveLength(3)
    for (const route of config.advanced_routes!) {
      expect(route.auth?.type).toBe('query')
      expect(route.auth?.name).toBe('key')
    }
  })

  test('official_claude_messages uses x-api-key header auth', () => {
    const config = getAdvancedCustomTemplateConfig('official_claude_messages')
    expect(config.advanced_routes![0].auth?.type).toBe('header')
    expect(config.advanced_routes![0].auth?.name).toBe('x-api-key')
  })
})

describe('createAdvancedCustomRoute', () => {
  test('returns default route', () => {
    const route = createAdvancedCustomRoute()
    expect(route.incoming_path).toBe('/v1/chat/completions')
    expect(route.upstream_path).toBe('/v1/chat/completions')
    expect(route.converter).toBe('none')
    expect(route.auth).toBeUndefined()
  })
})

describe('createAdvancedCustomConfig', () => {
  test('returns config with one default route', () => {
    const config = createAdvancedCustomConfig()
    expect(config.advanced_routes).toHaveLength(1)
    expect(config.advanced_routes![0].converter).toBe('none')
  })
})

describe('getAdvancedCustomUpstreamPathPlaceholder', () => {
  test('returns gemini path for openai_chat_completions_to_gemini_generate_content', () => {
    expect(
      getAdvancedCustomUpstreamPathPlaceholder(
        'openai_chat_completions_to_gemini_generate_content'
      )
    ).toBe('/v1beta/models/{model}:generateContent')
  })

  test('returns anthropic path for openai_chat_completions_to_anthropic_messages', () => {
    expect(
      getAdvancedCustomUpstreamPathPlaceholder(
        'openai_chat_completions_to_anthropic_messages'
      )
    ).toBe('/v1/messages')
  })

  test('returns /v1/chat/completions for openai_responses_to_openai_chat_completions', () => {
    expect(
      getAdvancedCustomUpstreamPathPlaceholder(
        'openai_responses_to_openai_chat_completions'
      )
    ).toBe('/v1/chat/completions')
  })

  test('returns /v1/chat/completions for none', () => {
    expect(getAdvancedCustomUpstreamPathPlaceholder('none')).toBe(
      '/v1/chat/completions'
    )
  })

  test('returns /v1/chat/completions for other converters', () => {
    expect(
      getAdvancedCustomUpstreamPathPlaceholder(
        'anthropic_messages_to_openai_chat_completions'
      )
    ).toBe('/v1/chat/completions')
  })
})

describe('getAdvancedCustomIncomingPathOptions', () => {
  test('returns all options for none converter', () => {
    const options = getAdvancedCustomIncomingPathOptions('none')
    expect(options).toEqual(ADVANCED_CUSTOM_INCOMING_PATH_OPTIONS)
  })

  test('returns only /v1/messages for anthropic_messages_to_openai_chat_completions', () => {
    const options = getAdvancedCustomIncomingPathOptions(
      'anthropic_messages_to_openai_chat_completions'
    )
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('/v1/messages')
  })

  test('returns only /v1/chat/completions for openai_chat_completions_to_anthropic_messages', () => {
    const options = getAdvancedCustomIncomingPathOptions(
      'openai_chat_completions_to_anthropic_messages'
    )
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('/v1/chat/completions')
  })

  test('returns only /v1/responses for openai_responses_to_openai_chat_completions', () => {
    const options = getAdvancedCustomIncomingPathOptions(
      'openai_responses_to_openai_chat_completions'
    )
    expect(options).toHaveLength(1)
    expect(options[0].value).toBe('/v1/responses')
  })

  test('returns gemini paths for gemini_generate_content_to_openai_chat_completions', () => {
    const options = getAdvancedCustomIncomingPathOptions(
      'gemini_generate_content_to_openai_chat_completions'
    )
    expect(options.length).toBeGreaterThanOrEqual(1)
    for (const opt of options) {
      expect(
        opt.value.includes(':generateContent') ||
          opt.value.includes(':streamGenerateContent')
      ).toBe(true)
    }
  })
})

describe('getDefaultAdvancedCustomIncomingPath', () => {
  test('returns first available option for converter', () => {
    expect(
      getDefaultAdvancedCustomIncomingPath(
        'anthropic_messages_to_openai_chat_completions'
      )
    ).toBe('/v1/messages')
  })

  test('returns /v1/chat/completions for none', () => {
    expect(getDefaultAdvancedCustomIncomingPath('none')).toBe(
      '/v1/chat/completions'
    )
  })
})

describe('isAdvancedCustomIncomingPathAllowed', () => {
  test('allows any path for none converter', () => {
    expect(
      isAdvancedCustomIncomingPathAllowed('/v1/chat/completions', 'none')
    ).toBe(true)
    expect(
      isAdvancedCustomIncomingPathAllowed('/v1/embeddings', 'none')
    ).toBe(true)
  })

  test('allows /v1/messages only for anthropic_messages_to_openai_chat_completions', () => {
    expect(
      isAdvancedCustomIncomingPathAllowed(
        '/v1/messages',
        'anthropic_messages_to_openai_chat_completions'
      )
    ).toBe(true)
    expect(
      isAdvancedCustomIncomingPathAllowed(
        '/v1/chat/completions',
        'anthropic_messages_to_openai_chat_completions'
      )
    ).toBe(false)
  })

  test('allows /v1/chat/completions for openai_chat_completions_to_openai_responses', () => {
    expect(
      isAdvancedCustomIncomingPathAllowed(
        '/v1/chat/completions',
        'openai_chat_completions_to_openai_responses'
      )
    ).toBe(true)
    expect(
      isAdvancedCustomIncomingPathAllowed(
        '/v1/responses',
        'openai_chat_completions_to_openai_responses'
      )
    ).toBe(false)
  })

  test('allows /v1/responses for openai_responses_to_openai_chat_completions', () => {
    expect(
      isAdvancedCustomIncomingPathAllowed(
        '/v1/responses',
        'openai_responses_to_openai_chat_completions'
      )
    ).toBe(true)
    expect(
      isAdvancedCustomIncomingPathAllowed(
        '/v1/chat/completions',
        'openai_responses_to_openai_chat_completions'
      )
    ).toBe(false)
  })
})

describe('getAdvancedCustomConverterOptions', () => {
  test('always includes none', () => {
    const options = getAdvancedCustomConverterOptions('/v1/embeddings')
    expect(options.some((o) => o.value === 'none')).toBe(true)
  })

  test('includes anthropic converter for /v1/messages', () => {
    const options = getAdvancedCustomConverterOptions('/v1/messages')
    expect(
      options.some(
        (o) => o.value === 'anthropic_messages_to_openai_chat_completions'
      )
    ).toBe(true)
  })

  test('includes openai-to-anthropic for /v1/chat/completions', () => {
    const options = getAdvancedCustomConverterOptions('/v1/chat/completions')
    expect(
      options.some(
        (o) => o.value === 'openai_chat_completions_to_anthropic_messages'
      )
    ).toBe(true)
    expect(
      options.some(
        (o) => o.value === 'openai_chat_completions_to_openai_responses'
      )
    ).toBe(true)
    expect(
      options.some(
        (o) =>
          o.value === 'openai_chat_completions_to_gemini_generate_content'
      )
    ).toBe(true)
  })

  test('trims whitespace from incoming path', () => {
    const options = getAdvancedCustomConverterOptions(
      '  /v1/chat/completions  '
    )
    expect(
      options.some(
        (o) => o.value === 'openai_chat_completions_to_anthropic_messages'
      )
    ).toBe(true)
  })
})

describe('getAdvancedCustomIncomingPathLabel', () => {
  test('returns label for known path', () => {
    expect(getAdvancedCustomIncomingPathLabel('/v1/chat/completions')).toBe(
      'OpenAI Chat'
    )
    expect(getAdvancedCustomIncomingPathLabel('/v1/messages')).toBe(
      'Claude Messages'
    )
  })

  test('returns value itself for unknown path', () => {
    expect(getAdvancedCustomIncomingPathLabel('/custom/path')).toBe(
      '/custom/path'
    )
  })
})

describe('parseAdvancedCustomConfig', () => {
  test('parses valid JSON config', () => {
    const json = JSON.stringify({
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
        },
      ],
    })
    const result = parseAdvancedCustomConfig(json)
    expect(result).not.toBeNull()
    expect(result!.advanced_routes).toHaveLength(1)
  })

  test('returns null for undefined', () => {
    expect(parseAdvancedCustomConfig(undefined)).toBeNull()
  })

  test('returns null for empty string', () => {
    expect(parseAdvancedCustomConfig('')).toBeNull()
  })

  test('returns null for whitespace-only string', () => {
    expect(parseAdvancedCustomConfig('   ')).toBeNull()
  })

  test('returns null for invalid JSON', () => {
    expect(parseAdvancedCustomConfig('{invalid')).toBeNull()
  })

  test('returns null for JSON array', () => {
    expect(parseAdvancedCustomConfig('[]')).toBeNull()
  })

  test('returns null for JSON primitive', () => {
    expect(parseAdvancedCustomConfig('"hello"')).toBeNull()
    expect(parseAdvancedCustomConfig('42')).toBeNull()
    expect(parseAdvancedCustomConfig('true')).toBeNull()
    expect(parseAdvancedCustomConfig('null')).toBeNull()
  })

  test('normalizes the parsed config', () => {
    const json = JSON.stringify({
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
        },
      ],
    })
    const result = parseAdvancedCustomConfig(json)
    expect(result!.advanced_routes![0].converter).toBe('none')
    expect(result!.advanced_routes![0].upstream_path).toBe('')
  })

  test('returns empty routes array for missing advanced_routes', () => {
    const result = parseAdvancedCustomConfig('{}')
    expect(result).not.toBeNull()
    expect(result!.advanced_routes).toEqual([])
  })
})

describe('stringifyAdvancedCustomConfig', () => {
  test('produces valid JSON with indentation', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
        },
      ],
    }
    const result = stringifyAdvancedCustomConfig(config)
    const parsed = JSON.parse(result)
    expect(parsed.advanced_routes).toHaveLength(1)
  })

  test('normalizes before stringifying', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
        },
      ],
    }
    const result = stringifyAdvancedCustomConfig(config)
    const parsed = JSON.parse(result)
    expect(parsed.advanced_routes[0].converter).toBe('none')
  })
})

describe('normalizeAdvancedCustomConfig', () => {
  test('normalizes routes', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '  /v1/chat/completions  ',
        },
      ],
    }
    const result = normalizeAdvancedCustomConfig(config)
    expect(result.advanced_routes![0].upstream_path).toBe(
      '/v1/chat/completions'
    )
    expect(result.advanced_routes![0].converter).toBe('none')
  })

  test('handles non-array advanced_routes', () => {
    const config = {
      advanced_routes: 'not-an-array',
    } as unknown as AdvancedCustomConfig
    const result = normalizeAdvancedCustomConfig(config)
    expect(result.advanced_routes).toEqual([])
  })

  test('preserves auth when present', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
          auth: {
            type: 'header',
            name: 'Authorization',
            value: 'Bearer {api_key}',
          },
        },
      ],
    }
    const result = normalizeAdvancedCustomConfig(config)
    expect(result.advanced_routes![0].auth).toEqual({
      type: 'header',
      name: 'Authorization',
      value: 'Bearer {api_key}',
    })
  })

  test('omits auth when not present', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
        },
      ],
    }
    const result = normalizeAdvancedCustomConfig(config)
    expect(result.advanced_routes![0].auth).toBeUndefined()
  })

  test('defaults missing auth name/value to empty string', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
          auth: { type: 'header' },
        },
      ],
    }
    const result = normalizeAdvancedCustomConfig(config)
    expect(result.advanced_routes![0].auth!.name).toBe('')
    expect(result.advanced_routes![0].auth!.value).toBe('')
  })
})

describe('validateAdvancedCustomConfig', () => {
  const validRoute: AdvancedCustomRoute = {
    incoming_path: '/v1/chat/completions',
    upstream_path: '/v1/chat/completions',
    converter: 'none',
  }

  test('returns null for valid config', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [validRoute],
    }
    expect(validateAdvancedCustomConfig(config)).toBeNull()
  })

  test('returns error for null config', () => {
    const result = validateAdvancedCustomConfig(null)
    expect(result).not.toBeNull()
    expect(result!.message).toBe(
      'Advanced custom configuration is required'
    )
  })

  test('returns error for empty routes', () => {
    const config: AdvancedCustomConfig = { advanced_routes: [] }
    const result = validateAdvancedCustomConfig(config)
    expect(result).not.toBeNull()
    expect(result!.message).toContain('at least one route')
  })

  test('returns error for missing incoming path', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        { incoming_path: '', upstream_path: '/v1/chat/completions' },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.routeIndex).toBe(0)
    expect(result!.message).toBe('Incoming path is required')
  })

  test('returns error for incoming path not starting with /', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: 'v1/chat/completions',
          upstream_path: '/v1/chat/completions',
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.message).toBe('Incoming path must start with /')
  })

  test('returns error for incoming path with query string', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions?foo=bar',
          upstream_path: '/v1/chat/completions',
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.message).toBe('Incoming path must not include query')
  })

  test('returns error for duplicate incoming paths', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        { ...validRoute },
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/embeddings',
          converter: 'none',
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.routeIndex).toBe(1)
    expect(result!.message).toBe('Incoming path must be unique')
  })

  test('returns error for missing upstream path', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '',
          converter: 'none',
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.message).toBe('Upstream path is required')
  })

  test('returns error for upstream path that is not URL or absolute path', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: 'relative/path',
          converter: 'none',
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.message).toBe(
      'Upstream path must be a full URL or a path starting with /'
    )
  })

  test('accepts full HTTP URL as upstream path', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: 'https://api.example.com/v1/chat',
          converter: 'none',
        },
      ],
    }
    expect(validateAdvancedCustomConfig(config)).toBeNull()
  })

  test('rejects upstream path starting with //', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '//example.com/v1/chat',
          converter: 'none',
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.message).toBe(
      'Upstream path must be a full URL or a path starting with /'
    )
  })

  test('returns error for unregistered converter', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'nonexistent_converter' as any,
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.message).toBe('Converter is not registered')
  })

  test('returns error for converter/path mismatch', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/embeddings',
          upstream_path: '/v1/messages',
          converter: 'anthropic_messages_to_openai_chat_completions',
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.message).toBe('Converter does not match incoming path')
  })

  test('returns error for header auth missing name', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
          auth: { type: 'header', name: '', value: 'Bearer {api_key}' },
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.message).toBe('Auth name is required')
  })

  test('returns error for header auth missing value', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
          auth: { type: 'header', name: 'Authorization', value: '' },
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.message).toBe('Auth value is required')
  })

  test('returns error for invalid auth type', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
          auth: {
            type: 'bearer' as any,
            name: 'Authorization',
            value: 'Bearer token',
          },
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.message).toBe('Auth type is invalid')
  })

  test('accepts none auth type without name/value', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
          auth: { type: 'none' },
        },
      ],
    }
    expect(validateAdvancedCustomConfig(config)).toBeNull()
  })

  test('accepts query auth with name and value', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
          auth: { type: 'query', name: 'key', value: '{api_key}' },
        },
      ],
    }
    expect(validateAdvancedCustomConfig(config)).toBeNull()
  })

  test('accepts route without auth (default)', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [validRoute],
    }
    expect(validateAdvancedCustomConfig(config)).toBeNull()
  })

  test('validates correct route index on error', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        validRoute,
        {
          incoming_path: '/v1/embeddings',
          upstream_path: '',
          converter: 'none',
        },
      ],
    }
    const result = validateAdvancedCustomConfig(config)
    expect(result!.routeIndex).toBe(1)
  })
})

describe('advancedCustomConfigUsesRelativeUpstreamPath', () => {
  test('returns true when a route has relative upstream path', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
        },
      ],
    }
    expect(advancedCustomConfigUsesRelativeUpstreamPath(config)).toBe(true)
  })

  test('returns false when all routes have absolute URLs', () => {
    const config: AdvancedCustomConfig = {
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: 'https://api.example.com/v1/chat',
          converter: 'none',
        },
      ],
    }
    expect(advancedCustomConfigUsesRelativeUpstreamPath(config)).toBe(false)
  })

  test('returns false for null config', () => {
    expect(advancedCustomConfigUsesRelativeUpstreamPath(null)).toBe(false)
  })

  test('returns false for empty routes', () => {
    const config: AdvancedCustomConfig = { advanced_routes: [] }
    expect(advancedCustomConfigUsesRelativeUpstreamPath(config)).toBe(false)
  })
})

describe('getAdvancedCustomStats', () => {
  test('returns stats for valid config', () => {
    const json = JSON.stringify({
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
        },
        {
          incoming_path: '/v1/embeddings',
          upstream_path: '/v1/embeddings',
          converter: 'none',
        },
      ],
    })
    const stats = getAdvancedCustomStats(json)
    expect(stats.routeCount).toBe(2)
    expect(stats.valid).toBe(true)
    expect(stats.routeTypeLabels).toContain('OpenAI Chat')
    expect(stats.routeTypeLabels).toContain('OpenAI Embeddings')
  })

  test('returns invalid stats for undefined', () => {
    const stats = getAdvancedCustomStats(undefined)
    expect(stats.routeCount).toBe(0)
    expect(stats.valid).toBe(false)
    expect(stats.routeTypeLabels).toEqual([])
  })

  test('returns invalid stats for empty string', () => {
    const stats = getAdvancedCustomStats('')
    expect(stats.routeCount).toBe(0)
    expect(stats.valid).toBe(false)
  })

  test('returns invalid stats for bad JSON', () => {
    const stats = getAdvancedCustomStats('{bad')
    expect(stats.routeCount).toBe(0)
    expect(stats.valid).toBe(false)
  })

  test('deduplicates route type labels', () => {
    const json = JSON.stringify({
      advanced_routes: [
        {
          incoming_path: '/v1/chat/completions',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
        },
      ],
    })
    const stats = getAdvancedCustomStats(json)
    const duplicates = stats.routeTypeLabels.filter(
      (label, i, arr) => arr.indexOf(label) !== i
    )
    expect(duplicates).toHaveLength(0)
  })

  test('reports invalid for config that fails validation', () => {
    const json = JSON.stringify({
      advanced_routes: [
        {
          incoming_path: '',
          upstream_path: '/v1/chat/completions',
          converter: 'none',
        },
      ],
    })
    const stats = getAdvancedCustomStats(json)
    expect(stats.routeCount).toBe(1)
    expect(stats.valid).toBe(false)
  })
})

describe('getAdvancedCustomAuthMode', () => {
  test('returns default when no auth', () => {
    const route: AdvancedCustomRoute = {
      incoming_path: '/v1/chat/completions',
      upstream_path: '/v1/chat/completions',
      converter: 'none',
    }
    expect(getAdvancedCustomAuthMode(route)).toBe('default')
  })

  test('returns auth type when auth is present', () => {
    const route: AdvancedCustomRoute = {
      incoming_path: '/v1/chat/completions',
      upstream_path: '/v1/chat/completions',
      converter: 'none',
      auth: { type: 'header', name: 'Authorization', value: 'Bearer x' },
    }
    expect(getAdvancedCustomAuthMode(route)).toBe('header')
  })

  test('returns none for none auth type', () => {
    const route: AdvancedCustomRoute = {
      incoming_path: '/v1/chat/completions',
      upstream_path: '/v1/chat/completions',
      converter: 'none',
      auth: { type: 'none' },
    }
    expect(getAdvancedCustomAuthMode(route)).toBe('none')
  })

  test('returns query for query auth type', () => {
    const route: AdvancedCustomRoute = {
      incoming_path: '/v1/chat/completions',
      upstream_path: '/v1/chat/completions',
      converter: 'none',
      auth: { type: 'query', name: 'key', value: '{api_key}' },
    }
    expect(getAdvancedCustomAuthMode(route)).toBe('query')
  })
})

describe('buildAdvancedCustomAuth', () => {
  test('returns undefined for default mode', () => {
    expect(buildAdvancedCustomAuth('default', undefined)).toBeUndefined()
  })

  test('returns none auth for none mode', () => {
    expect(buildAdvancedCustomAuth('none', undefined)).toEqual({
      type: 'none',
    })
  })

  test('returns header auth with defaults for header mode', () => {
    const result = buildAdvancedCustomAuth('header', undefined)
    expect(result).toEqual({
      type: 'header',
      name: 'Authorization',
      value: 'Bearer {api_key}',
    })
  })

  test('preserves previous auth values for header mode', () => {
    const prevAuth = {
      type: 'header' as const,
      name: 'X-Custom',
      value: 'custom-value',
    }
    const result = buildAdvancedCustomAuth('header', prevAuth)
    expect(result).toEqual({
      type: 'header',
      name: 'X-Custom',
      value: 'custom-value',
    })
  })

  test('returns query auth with defaults for query mode', () => {
    const result = buildAdvancedCustomAuth('query', undefined)
    expect(result).toEqual({
      type: 'query',
      name: 'api_key',
      value: '{api_key}',
    })
  })

  test('preserves previous auth values for query mode', () => {
    const prevAuth = {
      type: 'query' as const,
      name: 'token',
      value: 'my-token',
    }
    const result = buildAdvancedCustomAuth('query', prevAuth)
    expect(result).toEqual({
      type: 'query',
      name: 'token',
      value: 'my-token',
    })
  })

  test('uses defaults when previous auth has empty name/value for header', () => {
    const prevAuth = {
      type: 'header' as const,
      name: '',
      value: '',
    }
    const result = buildAdvancedCustomAuth('header', prevAuth)
    expect(result!.name).toBe('Authorization')
    expect(result!.value).toBe('Bearer {api_key}')
  })

  test('uses defaults when previous auth has empty name/value for query', () => {
    const prevAuth = {
      type: 'query' as const,
      name: '',
      value: '',
    }
    const result = buildAdvancedCustomAuth('query', prevAuth)
    expect(result!.name).toBe('api_key')
    expect(result!.value).toBe('{api_key}')
  })
})

describe('exported constants', () => {
  test('ADVANCED_CUSTOM_CONVERTER_OPTIONS contains expected converters', () => {
    const values = ADVANCED_CUSTOM_CONVERTER_OPTIONS.map((o) => o.value)
    expect(values).toContain('none')
    expect(values).toContain(
      'anthropic_messages_to_openai_chat_completions'
    )
    expect(values).toContain(
      'openai_chat_completions_to_anthropic_messages'
    )
    expect(values).toContain('openai_chat_completions_to_openai_responses')
    expect(values).toContain('openai_responses_to_openai_chat_completions')
    expect(values).toContain(
      'gemini_generate_content_to_openai_chat_completions'
    )
    expect(values).toContain(
      'openai_chat_completions_to_gemini_generate_content'
    )
  })

  test('ADVANCED_CUSTOM_AUTH_MODE_OPTIONS contains expected modes', () => {
    const values = ADVANCED_CUSTOM_AUTH_MODE_OPTIONS.map((o) => o.value)
    expect(values).toContain('default')
    expect(values).toContain('none')
    expect(values).toContain('header')
    expect(values).toContain('query')
  })

  test('ADVANCED_CUSTOM_INCOMING_PATH_OPTIONS contains common paths', () => {
    const values = ADVANCED_CUSTOM_INCOMING_PATH_OPTIONS.map((o) => o.value)
    expect(values).toContain('/v1/chat/completions')
    expect(values).toContain('/v1/messages')
    expect(values).toContain('/v1/embeddings')
    expect(values).toContain('/v1/responses')
  })

  test('ADVANCED_CUSTOM_TEMPLATE_OPTIONS has at least one template', () => {
    expect(ADVANCED_CUSTOM_TEMPLATE_OPTIONS.length).toBeGreaterThan(0)
    for (const template of ADVANCED_CUSTOM_TEMPLATE_OPTIONS) {
      expect(template.value).toBeTruthy()
      expect(template.label).toBeTruthy()
      expect(template.config.advanced_routes!.length).toBeGreaterThan(0)
    }
  })
})

import { describe, it, expect } from 'vitest'

import { getModelCategory, categorizeModels } from './model-categories'

describe('model-categories', () => {
  describe('getModelCategory', () => {
    const cases: Array<[string, string]> = [
      // OpenAI
      ['gpt-4', 'OpenAI'],
      ['gpt-3.5-turbo', 'OpenAI'],
      ['chatgpt-4o-latest', 'OpenAI'],
      ['dall-e-3', 'OpenAI'],
      ['whisper-1', 'OpenAI'],
      ['text-embedding-3-small', 'OpenAI'],
      ['text-embedding-ada-002', 'OpenAI'],
      ['o1', 'OpenAI'],
      ['o3', 'OpenAI'],
      ['o4-mini', 'OpenAI'],
      ['tts-1', 'OpenAI'],
      ['tts-1-hd', 'OpenAI'],
      ['openai/gpt-4', 'OpenAI'],
      ['openai.gpt-4', 'OpenAI'],
      ['codex-mini', 'OpenAI'],
      ['omni-moderation-latest', 'OpenAI'],
      ['text-moderation-stable', 'OpenAI'],
      ['text-ada-001', 'OpenAI'],
      ['text-babbage-001', 'OpenAI'],
      ['text-curie-001', 'OpenAI'],
      ['davinci-002', 'OpenAI'],
      ['babbage-002', 'OpenAI'],
      ['computer-use-preview', 'OpenAI'],
      ['sora', 'OpenAI'],
      // Anthropic
      ['claude-3-opus', 'Anthropic'],
      ['claude-3.5-sonnet', 'Anthropic'],
      ['anthropic.claude-v3', 'Anthropic'],
      // Gemini
      ['gemini-1.5-pro', 'Gemini'],
      ['gemma-7b', 'Gemini'],
      ['learnlm-1.5-pro-experimental', 'Gemini'],
      ['imagen-3.0-generate-001', 'Gemini'],
      ['veo-2.0-generate-001', 'Gemini'],
      ['palm-2', 'Gemini'],
      ['aqa', 'Gemini'],
      ['google/aqa', 'Gemini'],
      // xAI
      ['grok-2', 'xAI'],
      ['x-ai/grok', 'xAI'],
      ['xai/grok-3', 'xAI'],
      ['xai-grok-beta', 'xAI'],
      // DeepSeek
      ['deepseek-chat', 'DeepSeek'],
      ['deepseek-coder', 'DeepSeek'],
      // Qwen
      ['qwen-72b-chat', 'Qwen'],
      ['qwq-32b', 'Qwen'],
      ['qvq-72b', 'Qwen'],
      ['tongyi-vl', 'Qwen'],
      ['gte-large', 'Qwen'],
      ['text-embedding-v3', 'Qwen'],
      ['gui-plus', 'Qwen'],
      ['z-image-v1', 'Qwen'],
      // Wan
      ['wan2.1-t2v-turbo', 'Wan'],
      ['wanx1-t2v', 'Wan'],
      // Moonshot
      ['moonshot-v1-128k', 'Moonshot'],
      ['kimi-chat', 'Moonshot'],
      // MiniMax
      ['minimax-01', 'MiniMax'],
      ['abab6.5g', 'MiniMax'],
      ['hailuo-video', 'MiniMax'],
      ['t2v-01-director', 'MiniMax'],
      ['i2v-01', 'MiniMax'],
      ['s2v-01', 'MiniMax'],
      // Doubao
      ['doubao-pro-4k', 'Doubao'],
      ['volcengine-chat', 'Doubao'],
      ['seedance-1.0', 'Doubao'],
      ['seedream-3.0', 'Doubao'],
      ['seed-1-thinking', 'Doubao'],
      // Zhipu
      ['chatglm-6b', 'Zhipu'],
      ['cogview-3', 'Zhipu'],
      ['cogvideo-flash', 'Zhipu'],
      ['glm-4', 'Zhipu'],
      ['glm-4v', 'Zhipu'],
      ['zhipu-glm', 'Zhipu'],
      // Baidu
      ['ernie-bot-4', 'Baidu'],
      ['wenxin-4', 'Baidu'],
      // Yi
      ['01-ai/yi-large', 'Yi'],
      ['yi-34b', 'Yi'],
      // iFlytek
      ['sparkdesk-v3', 'iFlytek'],
      // Tencent
      ['hunyuan-pro', 'Tencent'],
      ['hy001', 'Tencent'],
      // Baichuan
      ['baichuan2-13b', 'Baichuan'],
      // InternLM
      ['internlm2-20b', 'InternLM'],
      // StepFun
      ['step-1-8k', 'StepFun'],
      // MiMo
      ['mimo-7b', 'MiMo'],
      // Mistral
      ['mistral-large', 'Mistral'],
      ['mixtral-8x7b', 'Mistral'],
      ['codestral-latest', 'Mistral'],
      ['ministral-8b', 'Mistral'],
      ['pixtral-large', 'Mistral'],
      ['magistral-small', 'Mistral'],
      // Meta
      ['meta-llama/llama-3-70b', 'Meta'],
      ['llama-3.1-70b', 'Meta'],
      ['llama2-70b', 'Meta'],
      ['llama3-8b', 'Meta'],
      // Cohere
      ['command-r-plus', 'Cohere'],
      ['command', 'Cohere'],
      ['c4ai-aya-23', 'Cohere'],
      ['aya-expanse-32b', 'Cohere'],
      // Jina
      ['jina-embeddings-v2', 'Jina'],
      ['jinaai/jina-clip-v1', 'Jina'],
      // BAAI
      ['baai/bge-large-en-v1.5', 'BAAI'],
      ['bge-m3', 'BAAI'],
      // Black Forest Labs
      ['flux.1-pro', 'Black Forest Labs'],
      ['black-forest-labs/flux', 'Black Forest Labs'],
      // Microsoft
      ['microsoft/phi-3', 'Microsoft'],
      ['phi-3.5-mini', 'Microsoft'],
      // Amazon
      ['nova-micro', 'Amazon'],
      ['titan-embed-text-v2', 'Amazon'],
      ['amazon/nova-lite', 'Amazon'],
      // AI21 Labs
      ['jamba-instruct', 'AI21 Labs'],
      ['ai21/j2-ultra', 'AI21 Labs'],
      // Stability AI
      ['stable-diffusion-xl', 'Stability AI'],
      ['stable-image-ultra', 'Stability AI'],
      ['sdxl-turbo', 'Stability AI'],
      ['stabilityai/sd-turbo', 'Stability AI'],
      // Nous Research
      ['hermes-2-pro', 'Nous Research'],
      ['nousresearch/hermes-3', 'Nous Research'],
      // 360 AI
      // Note: '360gpt-pro' matches OpenAI first due to 'gpt-' keyword
      ['360zhinao-2', '360 AI'],
      // Midjourney
      ['midjourney-v6', 'Midjourney'],
      ['mj_imagine', 'Midjourney'],
      ['mj-turbo', 'Midjourney'],
      ['swap_face', 'Midjourney'],
      // Kling
      ['kling-v1', 'Kling'],
      // Vidu
      ['vidu-gen', 'Vidu'],
      // Suno
      ['suno-v3', 'Suno'],
      // Jimeng
      ['jimeng-2.1', 'Jimeng'],
      // Perplexity (takes precedence over base models)
      ['sonar-pro', 'Perplexity'],
      ['perplexity/sonar', 'Perplexity'],
      // NVIDIA (takes precedence over base models)
      ['nvidia/llama-3.1-nemotron-70b', 'NVIDIA'],
      ['nemotron-4-340b', 'NVIDIA'],
      // Other
      ['unknown-model', 'Other'],
      ['my-custom-model', 'Other'],
    ]

    it.each(cases)('categorizes "%s" as "%s"', (model, expected) => {
      expect(getModelCategory(model)).toBe(expected)
    })

    it('handles case insensitivity', () => {
      expect(getModelCategory('GPT-4')).toBe('OpenAI')
      expect(getModelCategory('CLAUDE-3-OPUS')).toBe('Anthropic')
      expect(getModelCategory('Gemini-Pro')).toBe('Gemini')
    })

    it('trims whitespace', () => {
      expect(getModelCategory('  gpt-4  ')).toBe('OpenAI')
    })
  })

  describe('categorizeModels', () => {
    it('groups models by category', () => {
      const models = ['gpt-4', 'claude-3-opus', 'gpt-3.5-turbo', 'unknown']
      const result = categorizeModels(models)
      expect(result).toEqual({
        OpenAI: ['gpt-4', 'gpt-3.5-turbo'],
        Anthropic: ['claude-3-opus'],
        Other: ['unknown'],
      })
    })

    it('handles empty input', () => {
      expect(categorizeModels([])).toEqual({})
    })

    it('handles all same category', () => {
      const models = ['gpt-4', 'gpt-3.5-turbo', 'dall-e-3']
      const result = categorizeModels(models)
      expect(result).toEqual({
        OpenAI: ['gpt-4', 'gpt-3.5-turbo', 'dall-e-3'],
      })
    })
  })
})

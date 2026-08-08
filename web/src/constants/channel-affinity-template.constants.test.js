import {
  CODEX_CLI_HEADER_PASSTHROUGH_HEADERS,
  CLAUDE_CLI_HEADER_PASSTHROUGH_HEADERS,
  CODEX_CLI_HEADER_PASSTHROUGH_TEMPLATE,
  CLAUDE_CLI_HEADER_PASSTHROUGH_TEMPLATE,
  CHANNEL_AFFINITY_RULE_TEMPLATES,
  cloneChannelAffinityTemplate,
} from './channel-affinity-template.constants';

describe('cloneChannelAffinityTemplate', () => {
  test('returns a deep copy of an object', () => {
    const original = { a: 1, b: { c: [2, 3] } };
    const cloned = cloneChannelAffinityTemplate(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.b).not.toBe(original.b);
    expect(cloned.b.c).not.toBe(original.b.c);
  });

  test('mutations on clone do not affect original', () => {
    const original = { nested: { value: 42 } };
    const cloned = cloneChannelAffinityTemplate(original);
    cloned.nested.value = 99;
    expect(original.nested.value).toBe(42);
  });

  test('returns empty object for null/undefined', () => {
    expect(cloneChannelAffinityTemplate(null)).toEqual({});
    expect(cloneChannelAffinityTemplate(undefined)).toEqual({});
  });

  test('clones a channel affinity rule template', () => {
    const codexTemplate = CHANNEL_AFFINITY_RULE_TEMPLATES.codexCli;
    const cloned = cloneChannelAffinityTemplate(codexTemplate);
    expect(cloned).toEqual(codexTemplate);
    expect(cloned).not.toBe(codexTemplate);
    expect(cloned.model_regex).not.toBe(codexTemplate.model_regex);
  });
});

describe('passthrough header templates', () => {
  test('CODEX template wraps headers in pass_headers operation', () => {
    expect(CODEX_CLI_HEADER_PASSTHROUGH_TEMPLATE.operations).toHaveLength(1);
    const op = CODEX_CLI_HEADER_PASSTHROUGH_TEMPLATE.operations[0];
    expect(op.mode).toBe('pass_headers');
    expect(op.keep_origin).toBe(true);
    expect(op.value).toEqual(CODEX_CLI_HEADER_PASSTHROUGH_HEADERS);
  });

  test('CLAUDE template wraps headers in pass_headers operation', () => {
    expect(CLAUDE_CLI_HEADER_PASSTHROUGH_TEMPLATE.operations).toHaveLength(1);
    const op = CLAUDE_CLI_HEADER_PASSTHROUGH_TEMPLATE.operations[0];
    expect(op.mode).toBe('pass_headers');
    expect(op.keep_origin).toBe(true);
    expect(op.value).toEqual(CLAUDE_CLI_HEADER_PASSTHROUGH_HEADERS);
  });
});

describe('CHANNEL_AFFINITY_RULE_TEMPLATES', () => {
  test('has codexCli and claudeCli templates', () => {
    expect(CHANNEL_AFFINITY_RULE_TEMPLATES).toHaveProperty('codexCli');
    expect(CHANNEL_AFFINITY_RULE_TEMPLATES).toHaveProperty('claudeCli');
  });

  test('codexCli template has expected structure', () => {
    const tpl = CHANNEL_AFFINITY_RULE_TEMPLATES.codexCli;
    expect(tpl.name).toBe('codex cli trace');
    expect(tpl.model_regex).toEqual(['^gpt-.*$']);
    expect(tpl.path_regex).toEqual(['/v1/responses']);
    expect(tpl.skip_retry_on_failure).toBe(true);
    expect(tpl.param_override_template).toBe(
      CODEX_CLI_HEADER_PASSTHROUGH_TEMPLATE,
    );
  });

  test('claudeCli template has expected structure', () => {
    const tpl = CHANNEL_AFFINITY_RULE_TEMPLATES.claudeCli;
    expect(tpl.name).toBe('claude cli trace');
    expect(tpl.model_regex).toEqual(['^claude-.*$']);
    expect(tpl.path_regex).toEqual(['/v1/messages']);
    expect(tpl.skip_retry_on_failure).toBe(true);
    expect(tpl.param_override_template).toBe(
      CLAUDE_CLI_HEADER_PASSTHROUGH_TEMPLATE,
    );
  });
});

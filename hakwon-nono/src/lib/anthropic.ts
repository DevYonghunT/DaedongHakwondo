import Anthropic from '@anthropic-ai/sdk';

/** 요청 시점에 환경변수를 읽어 Anthropic 클라이언트를 반환합니다. */
export function getAnthropicClient(): Anthropic {
  // Claude Code가 ANTHROPIC_API_KEY를 빈 문자열로 오버라이드하므로 CLAUDE_API_KEY를 우선 사용
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY 또는 ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');
  }
  return new Anthropic({ apiKey });
}

// 하위 호환용 (기존 코드에서 `anthropic` import 시 사용)
let _client: Anthropic | null = null;
export const anthropic = {
  get messages() {
    if (!_client) {
      _client = getAnthropicClient();
    }
    return _client.messages;
  },
};

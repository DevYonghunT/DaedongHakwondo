import Anthropic from '@anthropic-ai/sdk';

/** 요청 시점에 환경변수를 읽어 Anthropic 클라이언트를 반환합니다. */
export function getAnthropicClient(): Anthropic {
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('CLAUDE_API_KEY 또는 ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다');
  }
  return new Anthropic({ apiKey });
}

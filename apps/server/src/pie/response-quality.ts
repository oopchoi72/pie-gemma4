const INTRO_ONLY =
  /^(제공|다음|아래|정리|요약|설명).{0,120}(입니다|습니다|내용입니다)\.?$/s;

export function needsContinuation(
  userMessage: string,
  assistantText: string,
): boolean {
  const text = assistantText.trim();
  if (!text) return true;

  const structuredRequest =
    /표|문서|목록|리스트|정리|작성|만들어|설명|기능/.test(userMessage);
  if (!structuredRequest) return false;

  if (INTRO_ONLY.test(text)) return true;
  if (text.length < 80) return true;

  if (/문서/.test(userMessage) && !/[\n#\-*]/.test(text)) return true;
  if (/표/.test(userMessage) && !/\|/.test(text)) return true;

  if (/문서|기능/.test(userMessage)) {
    const bullets = (text.match(/^[\-*]\s/gm) ?? []).length;
    if (bullets < 4 && text.length < 320) return true;
  }

  return false;
}

export const CONTINUE_PROMPT =
  '위 답변에 본문이 없습니다. 도입 문장을 반복하지 말고, 요청한 내용 전체를 바로 작성해줘.';

export function augmentUserMessage(message: string): string {
  if (!/기능|도구|제공/.test(message)) return message;

  const format = /문서/.test(message)
    ? 'markdown 문서(## 제목, ### 소제목, - 목록)'
    : /표/.test(message)
      ? 'markdown 표'
      : 'markdown';

  return [
    message,
    '',
    '반드시 read, grep, find, ls 네 도구를 모두 포함해.',
    `${format} 형식으로 본문을 끝까지 작성해.`,
    '도입 문장만 출력하지 마.',
  ].join('\n');
}

export function augmentImagePrompt(message: string, imageCount: number): string {
  const guide = [
    `[첨부 이미지 ${imageCount}장이 있습니다. 반드시 이미지를 직접 보고 분석하세요.`,
    '"이미지가 첨부되지 않았다"고 답하지 마세요.',
    '이미지 속 한글·이름·날짜·숫자는 보이는 그대로 정확히 적고, 추측하거나 다른 글자로 바꾸지 마세요.',
    '글자가 작거나 불분명하면 그렇다고 말하고, 확실한 부분만 인용하세요.]',
    '',
  ].join('\n');

  const trimmed = message.trim();
  return trimmed ? `${guide}${trimmed}` : guide.trim();
}

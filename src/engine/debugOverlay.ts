export function buildDebugText(lines: string[]): string {
  return lines.map((line, index) => `${index + 1}. ${line}`).join('\n')
}

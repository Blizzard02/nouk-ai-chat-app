import { renderMarkdown } from './markdown-renderer';

describe('renderMarkdown', () => {
  it('renders headings, paragraphs, and inline code', () => {
    const html = renderMarkdown('# Title\n\nSome `inline code` here.');
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<code>inline code</code>');
  });

  it('renders ordered and unordered lists', () => {
    const html = renderMarkdown('- one\n- two\n\n1. first\n2. second');
    expect(html).toContain('<ul>');
    expect(html).toContain('<ol>');
    expect(html).toContain('<li>one</li>');
    expect(html).toContain('<li>first</li>');
  });

  it('renders GFM tables', () => {
    const html = renderMarkdown('| A | B |\n| --- | --- |\n| 1 | 2 |');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>A</th>');
    expect(html).toContain('<td>1</td>');
  });

  it('wraps fenced code blocks with a language label and syntax-highlighted tokens', () => {
    const html = renderMarkdown('```typescript\nconst x: number = 1;\n```');
    expect(html).toContain('code-block__header');
    expect(html).toContain('typescript');
    expect(html).toContain('hljs');
  });

  it('falls back to a plain "text" label for an unrecognized language', () => {
    const html = renderMarkdown('```not-a-real-language\nhello\n```');
    expect(html).toContain('>text<');
  });

  it('does not throw on empty input', () => {
    expect(() => renderMarkdown('')).not.toThrow();
  });
});

import { renderCardHtml } from './renderer.js';

export function buildPublicPreviewHtml(data) {
  const { background, cardTheme, template, accent } = data;
  const theme = cardTheme === 'light' ? 'light' : 'dark';

  const bgStyle = background && background.trim() !== ''
    ? `${background};background-size:cover;background-position:center;background-repeat:no-repeat;`
    : `background:linear-gradient(145deg,rgb(2,6,23),rgb(15,23,42),rgb(2,6,23));background-size:cover;background-position:center;background-repeat:no-repeat;`;

  return `
    <div class="w-full min-h-full" style="${bgStyle}">
      <div class="w-full flex items-start justify-center p-4">
        ${renderCardHtml(data, { theme, template, accent, interactive: false })}
      </div>
    </div>`;
}
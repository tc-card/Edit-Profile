import { renderCardHtml, backgroundLayerHtml } from './renderer.js';

export function buildPublicPreviewHtml(data) {
  const { background, cardTheme, template, accent, cardBlur, bgBlur, cardOpacity } = data;
  const theme = cardTheme === 'light' ? 'light' : 'dark';

  const bgStyle = background && background.trim() !== ''
    ? `background:${background};background-size:cover;background-position:center;background-repeat:no-repeat;`
    : `background:linear-gradient(145deg,rgb(2,6,23),rgb(15,23,42),rgb(2,6,23));background-size:cover;background-position:center;background-repeat:no-repeat;`;

  // Blurred background = its own layer (blurring the wrapper would blur the card too).
  const layer = backgroundLayerHtml(background, bgBlur, 'absolute');
  const wrapStyle = layer ? 'position:relative;overflow:hidden;background:#0b1020;' : bgStyle;

  return `
    <div class="w-full min-h-full" style="${wrapStyle}">
      ${layer}
      <div class="w-full flex items-start justify-center p-4" style="position:relative;z-index:1;">
        ${renderCardHtml(data, { theme, template, accent, cardBlur, cardOpacity, interactive: false })}
      </div>
    </div>`;
}
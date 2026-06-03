import type { TravelAnswer } from '../../api/generated/model';
import { formatActivityTime } from '../../utils/format';

const PDF_RENDER_WIDTH = 820;
const PDF_MARGIN = 24;

export type PdfCanvasSlice = {
  sourceY: number;
  sourceHeight: number;
  renderedHeight: number;
};

export async function downloadPdf(answer: TravelAnswer, language: string) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: false });
  const container = createPdfRenderHost(answer, language);
  document.body.appendChild(container);

  try {
    await waitForPdfRender();
    const canvas = await html2canvas(container, {
      backgroundColor: '#ffffff',
      foreignObjectRendering: false,
      logging: false,
      removeContainer: false,
      scale: Math.min(2, Math.max(1.25, window.devicePixelRatio || 1.5)),
      useCORS: true,
      windowWidth: PDF_RENDER_WIDTH,
      windowHeight: Math.max(container.scrollHeight, 1),
    });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageWidth = pageWidth - PDF_MARGIN * 2;
    const pageContentHeight = pageHeight - PDF_MARGIN * 2;
    const slices = computePdfCanvasSlices(
      canvas.width,
      canvas.height,
      imageWidth,
      pageContentHeight,
    );

    slices.forEach((slice, index) => {
      if (index > 0) {
        pdf.addPage();
      }

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      pageCanvas.height = slice.sourceHeight;
      const pageContext = pageCanvas.getContext('2d');
      if (!pageContext) {
        throw new Error('Unable to create PDF page canvas');
      }

      pageContext.fillStyle = '#ffffff';
      pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
      pageContext.drawImage(
        canvas,
        0,
        slice.sourceY,
        canvas.width,
        slice.sourceHeight,
        0,
        0,
        canvas.width,
        slice.sourceHeight,
      );

      const imageData = pageCanvas.toDataURL('image/jpeg', 0.94);
      pdf.addImage(
        imageData,
        'JPEG',
        PDF_MARGIN,
        PDF_MARGIN,
        imageWidth,
        slice.renderedHeight,
        undefined,
        'FAST',
      );
    });
    pdf.save('huaxia-itinerary.pdf');
  } finally {
    container.remove();
  }
}

export function computePdfCanvasSlices(
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  pageContentHeight: number,
): PdfCanvasSlice[] {
  if (canvasWidth <= 0 || canvasHeight <= 0 || imageWidth <= 0 || pageContentHeight <= 0) {
    return [];
  }

  const sourcePageHeight = Math.max(1, Math.floor((pageContentHeight * canvasWidth) / imageWidth));
  const slices: PdfCanvasSlice[] = [];
  let sourceY = 0;

  while (sourceY < canvasHeight) {
    const sourceHeight = Math.min(sourcePageHeight, canvasHeight - sourceY);
    slices.push({
      sourceY,
      sourceHeight,
      renderedHeight: (sourceHeight * imageWidth) / canvasWidth,
    });
    sourceY += sourceHeight;
  }

  return slices;
}

export function createPdfRenderHost(answer: TravelAnswer, language: string) {
  const container = document.createElement('div');
  container.innerHTML = buildPdfHtml(answer, language);
  container.style.position = 'absolute';
  container.style.left = '-10000px';
  container.style.top = '0';
  container.style.width = `${PDF_RENDER_WIDTH}px`;
  container.style.maxWidth = `${PDF_RENDER_WIDTH}px`;
  container.style.background = '#ffffff';
  container.style.zIndex = '0';
  container.style.opacity = '1';
  container.style.pointerEvents = 'none';
  return container;
}

export function buildPdfHtml(answer: TravelAnswer, language: string) {
  const title = language === 'zh-CN' ? '华夏旅行社行程方案' : 'HuaXia Itinerary';
  const itinerary = answer.generated_itinerary?.itinerary ?? [];
  const topicSections = answer.topic_sections ?? [];
  return `
    <style>
      .pdf-root {
        box-sizing: border-box;
        color: #1f2933;
        font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Arial Unicode MS", Arial, sans-serif;
        font-size: 18px;
        line-height: 1.72;
        padding: 0 6px 28px;
      }
      .pdf-title {
        border-bottom: 3px solid #d94834;
        color: #173d40;
        font-size: 34px;
        font-weight: 900;
        letter-spacing: 0;
        margin: 0 0 20px;
        padding-bottom: 14px;
      }
      .pdf-section {
        margin: 22px 0;
      }
      .pdf-section h2 {
        color: #2f6f73;
        font-size: 24px;
        margin: 0 0 10px;
      }
      .pdf-day {
        border: 1px solid #d8e0df;
        border-radius: 8px;
        margin: 14px 0;
        padding: 16px 18px;
      }
      .pdf-day h3 {
        font-size: 21px;
        margin: 0 0 8px;
      }
      .pdf-activity {
        border-top: 1px solid #edf1f0;
        padding: 10px 0;
      }
      .pdf-activity:first-of-type {
        border-top: 0;
      }
      .pdf-time {
        color: #d94834;
        font-weight: 900;
      }
      .pdf-muted {
        color: #5d6572;
      }
      ul {
        margin: 8px 0 0 22px;
        padding: 0;
      }
      li {
        margin: 6px 0;
      }
    </style>
    <div class="pdf-root">
      <h1 class="pdf-title">${escapeHtml(title)}</h1>
      <div class="pdf-section">${paragraphs(answer.answer)}</div>
      ${itinerary.length > 0 ? `
        <div class="pdf-section">
          <h2>${escapeHtml(language === 'zh-CN' ? '详细行程' : 'Detailed Itinerary')}</h2>
          ${itinerary.map((day) => `
            <div class="pdf-day">
              <h3>D${day.day}｜${escapeHtml(day.city)}</h3>
              ${day.activities.map((activity) => `
                <div class="pdf-activity">
                  <div class="pdf-time">${escapeHtml(formatActivityTime(activity, language))}</div>
                  <strong>${escapeHtml(activity.name)}</strong>
                  <div>${escapeHtml(activity.description)}</div>
                </div>
              `).join('')}
              ${day.notes ? `<div class="pdf-muted">${escapeHtml(day.notes)}</div>` : ''}
            </div>
          `).join('')}
        </div>
      ` : ''}
      ${topicSections.map((section) => `
        <div class="pdf-section">
          <h2>${escapeHtml(section.title)}</h2>
          ${section.summary ? paragraphs(section.summary) : ''}
          <ul>
            ${(section.items ?? []).map((item) => `
              <li><strong>${escapeHtml(item.title)}</strong>${item.city ? `｜${escapeHtml(item.city)}` : ''}：${escapeHtml(item.description)}</li>
            `).join('')}
            ${(section.recommendations ?? []).map((item) => `<li>${escapeHtml(item)}</li>`).join('')}
          </ul>
        </div>
      `).join('')}
      <div class="pdf-section">
        <h2>${escapeHtml(language === 'zh-CN' ? '亮点' : 'Highlights')}</h2>
        <ul>${answer.highlights.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="pdf-section">
        <h2>${escapeHtml(language === 'zh-CN' ? '提醒' : 'Notes')}</h2>
        <ul>${answer.warnings.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
      <div class="pdf-section">
        <h2>${escapeHtml(language === 'zh-CN' ? '引用' : 'References')}</h2>
        <ul>${answer.citations.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>
      </div>
    </div>
  `;
}

function paragraphs(text: string) {
  return text
    .split('\n')
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function waitForPdfRender() {
  await document.fonts?.ready;
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

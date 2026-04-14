import { jsPDF } from 'jspdf';

// Paper sleeve dimensions (CD is 120mm, add margin for paper thickness when folded)
const PANEL_SIZE = 132;
const SIDE_FLAP_WIDTH = 20;
const BOTTOM_FLAP_HEIGHT = 14;

// Page sizes in mm
const PAGE_SIZES = {
  letter: { width: 215.9, height: 279.4 },
  a4: { width: 210, height: 297 },
};

async function loadImageAsBase64(url) {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function generateCDCoverPDF(album, tracks = [], paperSize = 'letter') {
  const page = PAGE_SIZES[paperSize];
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: paperSize === 'letter' ? 'letter' : 'a4',
  });

  // Calculate total template size
  const templateWidth = SIDE_FLAP_WIDTH + PANEL_SIZE + SIDE_FLAP_WIDTH;
  const templateHeight = PANEL_SIZE + PANEL_SIZE + BOTTOM_FLAP_HEIGHT;

  // Center the template on the page (with small top margin)
  const startX = (page.width - templateWidth) / 2;
  const startY = 8;

  // Panel positions
  const backPanelX = startX + SIDE_FLAP_WIDTH;
  const backPanelY = startY;
  const frontPanelX = startX + SIDE_FLAP_WIDTH;
  const frontPanelY = startY + PANEL_SIZE;
  const bottomFlapY = frontPanelY + PANEL_SIZE;

  // Load album artwork
  let imageData = null;
  try {
    imageData = await loadImageAsBase64(album.artworkUrl);
  } catch (error) {
    console.error('Failed to load image:', error);
  }

  // Draw FRONT PANEL with artwork
  if (imageData) {
    doc.addImage(imageData, 'JPEG', frontPanelX, frontPanelY, PANEL_SIZE, PANEL_SIZE);
  } else {
    doc.setFillColor(220, 220, 220);
    doc.rect(frontPanelX, frontPanelY, PANEL_SIZE, PANEL_SIZE, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Image not available', frontPanelX + PANEL_SIZE / 2, frontPanelY + PANEL_SIZE / 2, { align: 'center' });
  }

  // Draw BACK PANEL (light gray background)
  doc.setFillColor(252, 252, 252);
  doc.rect(backPanelX, backPanelY, PANEL_SIZE, PANEL_SIZE, 'F');

  // === BACK PANEL CONTENT (rotated 180° for correct reading after fold) ===
  const backCenterX = backPanelX + PANEL_SIZE / 2;
  const margin = 10;

  // Helper: draw centered rotated text (jsPDF align:'center' doesn't work with angle)
  const drawCenteredRotated = (text, x, y, fontSize) => {
    doc.setFontSize(fontSize);
    const textWidth = doc.getTextWidth(text);
    // For 180° rotation, shift by half text width to center
    doc.text(text, x + textWidth / 2, y, { angle: 180 });
  };

  // Title at bottom of panel (= top after fold)
  // Position title and artist within bottom 25mm of panel
  const titleY = backPanelY + PANEL_SIZE - margin - 5; // 5mm from bottom edge (after margin)
  const artistY = titleY - 10; // 10mm above title

  doc.setFontSize(12);
  doc.setTextColor(30, 30, 30);
  doc.setFont(undefined, 'bold');
  let titleText = album.name;
  if (doc.getTextWidth(titleText) > PANEL_SIZE - margin * 2) {
    titleText = titleText.substring(0, 20) + '...';
  }
  drawCenteredRotated(titleText, backCenterX, titleY, 12);

  // Artist
  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  let artistText = album.artist;
  if (doc.getTextWidth(artistText) > PANEL_SIZE - margin * 2) {
    artistText = artistText.substring(0, 25) + '...';
  }
  drawCenteredRotated(artistText, backCenterX, artistY, 9);

  // Tracks - single column for <=14 tracks, two columns for more
  if (tracks.length > 0) {
    const textHeight = 3;
    const tracksTopY = backPanelY + margin + textHeight;
    const tracksBottomY = backPanelY + PANEL_SIZE - margin - 32;
    const availableSpace = tracksBottomY - tracksTopY;

    const maxTracksPerColumn = 12;
    const useDoubleColumn = tracks.length > maxTracksPerColumn;

    doc.setTextColor(50, 50, 50);

    if (useDoubleColumn) {
      // Two columns layout - show all tracks, split evenly
      const totalTracks = tracks.length;
      const firstColumnCount = Math.ceil(totalTracks / 2);
      const secondColumnCount = totalTracks - firstColumnCount;
      const maxPerColumn = Math.max(firstColumnCount, secondColumnCount);
      const lineHeight = Math.max(availableSpace / maxPerColumn, textHeight + 1);

      // Column positions (180° rotation swaps left/right after fold)
      const columnOffset = 28;
      const rightColumnX = backCenterX + columnOffset; // PDF right = visual left after fold
      const leftColumnX = backCenterX - columnOffset;  // PDF left = visual right after fold

      // First half - appears in LEFT column after fold
      tracks.slice(0, firstColumnCount).forEach((track, i) => {
        const y = tracksBottomY - (i * lineHeight);
        let name = track.name.length > 16 ? track.name.substring(0, 14) + '..' : track.name;
        const text = track.duration
          ? `${track.number}. ${name} - ${track.duration}`
          : `${track.number}. ${name}`;
        drawCenteredRotated(text, rightColumnX, y, 6);
      });

      // Second half - appears in RIGHT column after fold
      tracks.slice(firstColumnCount).forEach((track, i) => {
        const y = tracksBottomY - (i * lineHeight);
        let name = track.name.length > 16 ? track.name.substring(0, 14) + '..' : track.name;
        const text = track.duration
          ? `${track.number}. ${name} - ${track.duration}`
          : `${track.number}. ${name}`;
        drawCenteredRotated(text, leftColumnX, y, 6);
      });
    } else {
      // Single column layout - show all tracks
      const lineHeight = Math.max(availableSpace / tracks.length, textHeight + 1);

      tracks.forEach((track, i) => {
        const y = tracksBottomY - (i * lineHeight);
        let name = track.name.length > 22 ? track.name.substring(0, 20) + '..' : track.name;
        const text = track.duration
          ? `${track.number}. ${name} - ${track.duration}`
          : `${track.number}. ${name}`;
        drawCenteredRotated(text, backCenterX, y, 7);
      });

      if (tracks.length > maxTracks) {
        doc.setTextColor(120, 120, 120);
        drawCenteredRotated(`+ ${tracks.length - maxTracks} more tracks`, backCenterX, tracksTopY - lineHeight, 6);
      }
    }
  }


  // Draw SIDE FLAPS
  doc.setFillColor(248, 248, 248);
  doc.rect(startX, frontPanelY, SIDE_FLAP_WIDTH, PANEL_SIZE, 'F');
  doc.rect(startX + SIDE_FLAP_WIDTH + PANEL_SIZE, frontPanelY, SIDE_FLAP_WIDTH, PANEL_SIZE, 'F');

  // Draw BOTTOM FLAP
  doc.rect(frontPanelX, bottomFlapY, PANEL_SIZE, BOTTOM_FLAP_HEIGHT, 'F');

  // Draw CUT LINES (solid black)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.5);
  doc.setLineDashPattern([], 0);

  // Outer cut path
  doc.line(backPanelX, startY, backPanelX + PANEL_SIZE, startY);
  doc.line(backPanelX + PANEL_SIZE, startY, backPanelX + PANEL_SIZE, frontPanelY);
  doc.line(backPanelX + PANEL_SIZE, frontPanelY, startX + templateWidth, frontPanelY);
  doc.line(startX + templateWidth, frontPanelY, startX + templateWidth, frontPanelY + PANEL_SIZE);
  doc.line(startX + templateWidth, frontPanelY + PANEL_SIZE, frontPanelX + PANEL_SIZE, bottomFlapY);
  doc.line(frontPanelX + PANEL_SIZE, bottomFlapY, frontPanelX + PANEL_SIZE, bottomFlapY + BOTTOM_FLAP_HEIGHT);
  doc.line(frontPanelX + PANEL_SIZE, bottomFlapY + BOTTOM_FLAP_HEIGHT, frontPanelX, bottomFlapY + BOTTOM_FLAP_HEIGHT);
  doc.line(frontPanelX, bottomFlapY + BOTTOM_FLAP_HEIGHT, frontPanelX, bottomFlapY);
  doc.line(frontPanelX, bottomFlapY, startX, frontPanelY + PANEL_SIZE);
  doc.line(startX, frontPanelY + PANEL_SIZE, startX, frontPanelY);
  doc.line(startX, frontPanelY, backPanelX, frontPanelY);
  doc.line(backPanelX, frontPanelY, backPanelX, startY);

  // Draw FOLD LINES (dashed gray)
  doc.setDrawColor(150, 150, 150);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([3, 2], 0);

  doc.line(backPanelX, frontPanelY, backPanelX + PANEL_SIZE, frontPanelY);
  doc.line(frontPanelX, frontPanelY, frontPanelX, frontPanelY + PANEL_SIZE);
  doc.line(frontPanelX + PANEL_SIZE, frontPanelY, frontPanelX + PANEL_SIZE, frontPanelY + PANEL_SIZE);
  doc.line(frontPanelX, bottomFlapY, frontPanelX + PANEL_SIZE, bottomFlapY);

  doc.setLineDashPattern([], 0);

  // Fold direction arrows on flaps
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text('fold', startX + SIDE_FLAP_WIDTH / 2, frontPanelY + PANEL_SIZE / 2 - 3, { align: 'center', angle: 90 });
  doc.text(String.fromCharCode(8594), startX + SIDE_FLAP_WIDTH / 2, frontPanelY + PANEL_SIZE / 2 + 3, { align: 'center', angle: 90 });

  doc.text('fold', startX + SIDE_FLAP_WIDTH + PANEL_SIZE + SIDE_FLAP_WIDTH / 2, frontPanelY + PANEL_SIZE / 2 + 3, { align: 'center', angle: 90 });
  doc.text(String.fromCharCode(8592), startX + SIDE_FLAP_WIDTH + PANEL_SIZE + SIDE_FLAP_WIDTH / 2, frontPanelY + PANEL_SIZE / 2 - 3, { align: 'center', angle: 90 });

  // Finger notch (semicircle at top)
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([1, 1], 0);
  const notchRadius = 8;
  const notchX = backPanelX + PANEL_SIZE / 2;
  const notchY = startY;

  for (let angle = 0; angle < 180; angle += 15) {
    const rad1 = (angle * Math.PI) / 180;
    const rad2 = ((angle + 15) * Math.PI) / 180;
    doc.line(
      notchX + notchRadius * Math.cos(rad1),
      notchY - notchRadius * Math.sin(rad1),
      notchX + notchRadius * Math.cos(rad2),
      notchY - notchRadius * Math.sin(rad2)
    );
  }

  doc.setLineDashPattern([], 0);

  // ===== FOLDING INSTRUCTIONS IN CUT-OFF MARGINS =====

  // Calculate safe margin positions
  const leftMarginX = 5; // 5mm from left edge
  const rightMarginX = page.width - 5; // 5mm from right edge
  const bottomMarginY = Math.min(bottomFlapY + BOTTOM_FLAP_HEIGHT + 5, page.height - 8);

  doc.setTextColor(100, 100, 100);
  doc.setFontSize(6);

  // LEFT MARGIN - Steps 1-3 (vertical text going down)
  let leftY = backPanelY;
  doc.setFont(undefined, 'bold');
  doc.text('FOLDING STEPS:', leftMarginX + 3, leftY, { angle: 90 });
  doc.setFont(undefined, 'normal');
  leftY += 25;
  doc.text('1. Cut along solid lines', leftMarginX + 3, leftY, { angle: 90 });
  leftY += 30;
  doc.text('2. Fold side flaps back', leftMarginX + 3, leftY, { angle: 90 });
  leftY += 28;
  doc.text('3. Fold bottom flap back', leftMarginX + 3, leftY, { angle: 90 });
  leftY += 30;
  doc.text('4. Fold back panel down', leftMarginX + 3, leftY, { angle: 90 });
  leftY += 28;
  doc.text('5. Insert CD from top', leftMarginX + 3, leftY, { angle: 90 });

  // RIGHT MARGIN - Legend (vertical text going up)
  let rightY = bottomFlapY + BOTTOM_FLAP_HEIGHT;
  doc.setFont(undefined, 'bold');
  doc.text('LEGEND:', rightMarginX - 3, rightY, { angle: -90 });
  doc.setFont(undefined, 'normal');
  rightY -= 18;

  // Draw mini cut line example
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(rightMarginX - 5, rightY - 8, rightMarginX - 5, rightY - 2);
  doc.text('= cut', rightMarginX - 3, rightY - 12, { angle: -90 });

  rightY -= 28;

  // Draw mini fold line example
  doc.setDrawColor(130, 130, 130);
  doc.setLineDashPattern([2, 1], 0);
  doc.line(rightMarginX - 5, rightY - 8, rightMarginX - 5, rightY - 2);
  doc.setLineDashPattern([], 0);
  doc.text('= fold', rightMarginX - 3, rightY - 12, { angle: -90 });

  // BOTTOM MARGIN - Tip
  doc.setTextColor(130, 130, 130);
  doc.text('TIP: Cut the semicircle notch at top for easy CD removal. Store sleeve with opening facing up.', page.width / 2, bottomMarginY, { align: 'center' });

  // Generate filename
  const safeName = album.name.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
  const filename = `cd_sleeve_${safeName}.pdf`;

  doc.save(filename);
  return filename;
}

// Jewel case dimensions (standard CD jewel case)
const JEWEL_FRONT_SIZE = 120; // 120mm x 120mm front booklet
const JEWEL_BACK_WIDTH = 151; // Back tray card total width
const JEWEL_BACK_HEIGHT = 118; // Back tray card height
const JEWEL_SPINE_WIDTH = 6.5; // Spine width on each side

export async function generateJewelCasePDF(album, tracks = [], paperSize = 'letter') {
  const page = PAGE_SIZES[paperSize];
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: paperSize === 'letter' ? 'letter' : 'a4',
  });

  // Load album artwork
  let imageData = null;
  try {
    imageData = await loadImageAsBase64(album.artworkUrl);
  } catch (error) {
    console.error('Failed to load image:', error);
  }

  // ===== FRONT BOOKLET (120mm x 120mm) at top =====
  const frontX = (page.width - JEWEL_FRONT_SIZE) / 2;
  const frontY = 12;

  // Draw front cover with artwork
  if (imageData) {
    doc.addImage(imageData, 'JPEG', frontX, frontY, JEWEL_FRONT_SIZE, JEWEL_FRONT_SIZE);
  } else {
    doc.setFillColor(220, 220, 220);
    doc.rect(frontX, frontY, JEWEL_FRONT_SIZE, JEWEL_FRONT_SIZE, 'F');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Image not available', frontX + JEWEL_FRONT_SIZE / 2, frontY + JEWEL_FRONT_SIZE / 2, { align: 'center' });
  }

  // Cut line around front cover
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(frontX, frontY, JEWEL_FRONT_SIZE, JEWEL_FRONT_SIZE);
  doc.setLineDashPattern([], 0);

  // Label
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('FRONT BOOKLET (120×120mm)', page.width / 2, frontY + JEWEL_FRONT_SIZE + 6, { align: 'center' });

  // ===== BACK TRAY CARD (151mm x 118mm) below =====
  const backX = (page.width - JEWEL_BACK_WIDTH) / 2;
  const backY = frontY + JEWEL_FRONT_SIZE + 14;

  // Draw back tray card background
  doc.setFillColor(252, 252, 252);
  doc.rect(backX, backY, JEWEL_BACK_WIDTH, JEWEL_BACK_HEIGHT, 'F');

  // Draw spine areas (slightly darker)
  doc.setFillColor(245, 245, 245);
  doc.rect(backX, backY, JEWEL_SPINE_WIDTH, JEWEL_BACK_HEIGHT, 'F'); // Left spine
  doc.rect(backX + JEWEL_BACK_WIDTH - JEWEL_SPINE_WIDTH, backY, JEWEL_SPINE_WIDTH, JEWEL_BACK_HEIGHT, 'F'); // Right spine

  // Spine text (rotated)
  doc.setFontSize(7);
  doc.setTextColor(50, 50, 50);
  const spineText = `${album.artist} - ${album.name}`.substring(0, 40);

  // Left spine (text reads bottom to top)
  doc.text(spineText, backX + JEWEL_SPINE_WIDTH / 2 + 1, backY + JEWEL_BACK_HEIGHT - 5, { angle: 90 });

  // Right spine (text reads top to bottom)
  doc.text(spineText, backX + JEWEL_BACK_WIDTH - JEWEL_SPINE_WIDTH / 2 - 1, backY + 5, { angle: -90 });

  // Main content area dimensions
  const contentX = backX + JEWEL_SPINE_WIDTH + 5;
  const contentWidth = JEWEL_BACK_WIDTH - (JEWEL_SPINE_WIDTH * 2) - 10;
  const contentCenterX = backX + JEWEL_BACK_WIDTH / 2;
  const margin = 8;

  // Album title and artist at top
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.setFont(undefined, 'bold');
  let titleText = album.name;
  if (doc.getTextWidth(titleText) > contentWidth) {
    titleText = titleText.substring(0, 25) + '...';
  }
  doc.text(titleText, contentCenterX, backY + margin + 5, { align: 'center' });

  doc.setFont(undefined, 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(album.artist, contentCenterX, backY + margin + 12, { align: 'center' });

  // Track listing
  if (tracks.length > 0) {
    const tracksStartY = backY + margin + 22;
    const tracksEndY = backY + JEWEL_BACK_HEIGHT - margin - 5;
    const availableHeight = tracksEndY - tracksStartY;

    const maxTracksPerColumn = 12;
    const useDoubleColumn = tracks.length > maxTracksPerColumn;

    doc.setFontSize(6.5);
    doc.setTextColor(50, 50, 50);

    if (useDoubleColumn) {
      // Show all tracks split evenly between columns
      const totalTracks = tracks.length;
      const firstColumnCount = Math.ceil(totalTracks / 2);
      const maxPerColumn = firstColumnCount;
      const lineHeight = Math.min(availableHeight / maxPerColumn, 7);

      const colOffset = 32;
      const leftColX = contentCenterX - colOffset;
      const rightColX = contentCenterX + colOffset;

      // Left column
      tracks.slice(0, firstColumnCount).forEach((track, i) => {
        const y = tracksStartY + (i * lineHeight);
        let name = track.name.length > 18 ? track.name.substring(0, 16) + '..' : track.name;
        const text = track.duration
          ? `${track.number}. ${name} - ${track.duration}`
          : `${track.number}. ${name}`;
        doc.text(text, leftColX, y, { align: 'center' });
      });

      // Right column
      tracks.slice(firstColumnCount).forEach((track, i) => {
        const y = tracksStartY + (i * lineHeight);
        let name = track.name.length > 18 ? track.name.substring(0, 16) + '..' : track.name;
        const text = track.duration
          ? `${track.number}. ${name} - ${track.duration}`
          : `${track.number}. ${name}`;
        doc.text(text, rightColX, y, { align: 'center' });
      });
    } else {
      const lineHeight = Math.min(availableHeight / tracks.length, 7);

      tracks.forEach((track, i) => {
        const y = tracksStartY + (i * lineHeight);
        let name = track.name.length > 28 ? track.name.substring(0, 26) + '..' : track.name;
        const text = track.duration
          ? `${track.number}. ${name} - ${track.duration}`
          : `${track.number}. ${name}`;
        doc.text(text, contentCenterX, y, { align: 'center' });
      });
    }
  }

  // Cut line around back tray card
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.3);
  doc.setLineDashPattern([2, 2], 0);
  doc.rect(backX, backY, JEWEL_BACK_WIDTH, JEWEL_BACK_HEIGHT);

  // Fold lines for spines
  doc.setDrawColor(150, 150, 150);
  doc.setLineDashPattern([1, 1], 0);
  doc.line(backX + JEWEL_SPINE_WIDTH, backY, backX + JEWEL_SPINE_WIDTH, backY + JEWEL_BACK_HEIGHT);
  doc.line(backX + JEWEL_BACK_WIDTH - JEWEL_SPINE_WIDTH, backY, backX + JEWEL_BACK_WIDTH - JEWEL_SPINE_WIDTH, backY + JEWEL_BACK_HEIGHT);
  doc.setLineDashPattern([], 0);

  // Label
  doc.setFontSize(7);
  doc.setTextColor(100, 100, 100);
  doc.text('BACK TRAY CARD (151×118mm) - Fold spines back', page.width / 2, backY + JEWEL_BACK_HEIGHT + 6, { align: 'center' });

  // Generate filename
  const safeName = album.name.replace(/[^a-z0-9]/gi, '_').substring(0, 30);
  const filename = `jewel_case_${safeName}.pdf`;

  doc.save(filename);
  return filename;
}

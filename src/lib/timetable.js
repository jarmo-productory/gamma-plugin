import { jsPDF } from 'jspdf';

/**
 * @typedef {object} Slide
 * @property {string} id
 * @property {string} title
 * @property {string[]} content
 */

/**
 * @typedef {object} TimetableItem
 * @property {string} id
 * @property {string} title
 * @property {string[]} content
 * @property {string} startTime
 * @property {number} duration
 * @property {string} endTime
 */

/**
 * @typedef {object} Timetable
 * @property {string} startTime
 * @property {TimetableItem[]} items
 * @property {number} totalDuration
 */

/**
 * Formats a Date object into HH:MM format.
 * @param {Date} date
 * @returns {string}
 */
function formatTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Parses an HH:MM time string into a Date object for today.
 * @param {string} timeString
 * @returns {Date}
 */
function parseTime(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

/**
 * Generates a timetable from a list of slides.
 * @param {Slide[]} slides
 * @param {object} options
 * @param {string} options.startTime - The start time in HH:MM format.
 * @param {number} options.defaultDuration - Default duration per slide in minutes.
 * @returns {Timetable}
 */
export function generateTimetable(slides, options = {}) {
  const {
    startTime = '09:00',
    defaultDuration = 5,
    breakAfter = 60,
    breakDuration = 10
  } = options;

  let currentTime = new Date(`1970-01-01T${startTime}:00`);
  let timeSinceLastBreak = 0;

  const items = slides.map(slide => {
    const itemDuration = slide.duration === 0 ? 0 : (slide.duration || defaultDuration);
    
    // Logic for breaks can be added here later
    // For now, just add the item duration

    const itemStartTime = new Date(currentTime);
    currentTime.setMinutes(currentTime.getMinutes() + itemDuration);
    const itemEndTime = new Date(currentTime);

    timeSinceLastBreak += itemDuration;

    return {
      id: slide.id,
      title: slide.title,
      content: slide.content,
      startTime: itemStartTime.toTimeString().slice(0, 5),
      endTime: itemEndTime.toTimeString().slice(0, 5),
      duration: itemDuration,
    };
  });

  return {
    startTime,
    items,
    totalDuration: timeSinceLastBreak,
  };
}

/**
 * Generates a CSV string from a timetable.
 * @param {Timetable} timetable
 * @returns {string}
 */
export function generateCSV(timetable) {
  let csv = 'Item,Start Time,Duration (min),End Time\n';
  timetable.items.forEach(item => {
    // Escape quotes in title
    const title = item.title.replace(/"/g, '""');
    csv += `"${title}",${item.startTime},${item.duration},${item.endTime}\n`;
  });
  return csv;
}

/**
 * Triggers a file download for the given content.
 * @param {string} filename
 * @param {string} url
 * @param {boolean} isBlob
 */
export function downloadFile(filename, url, isBlob = false) {
  const link = document.createElement('a');
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);

  if (isBlob) {
    link.href = url;
  } else {
    const blob = new Blob([url], { type: 'text/csv;charset=utf-8;' });
    link.href = URL.createObjectURL(blob);
  }
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates an Excel file from timetable data.
 * @param {object} timetable
 * @returns {Blob}
 */
export function generateXLSX(timetable) {
  const worksheet = XLSX.utils.json_to_sheet(timetable.items);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Timetable');
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  return new Blob([wbout], { type: 'application/octet-stream' });
}

/**
 * Generates a PDF file from timetable data.
 * @param {object} timetable
 */
export function generatePDF(timetable) {
    const doc = new jsPDF();
    let y = 10;

    doc.setFontSize(16);
    doc.text('Gamma Timetable', 10, y);
    y += 10;

    timetable.items.forEach(item => {
        doc.setFontSize(12);
        doc.text(`${item.startTime} - ${item.endTime} (${item.duration}m) - ${item.title}`, 10, y);
        y += 7;

        item.content.forEach(contentItem => {
            doc.setFontSize(10);
            doc.text(contentItem.text, 15, y);
            y+= 5;
            if (contentItem.subItems && contentItem.subItems.length > 0) {
                contentItem.subItems.forEach(subItem => {
                    doc.text(`- ${subItem}`, 20, y);
                    y += 5;
                });
            }
        });
        y+=5;
    });

    doc.save('gamma-timetable.pdf');
}

/**
 * Copies text to the clipboard.
 * @param {string} text
 * @returns {Promise<void>}
 */
export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text);
} 
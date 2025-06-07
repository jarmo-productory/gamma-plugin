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
  const { startTime = '09:00', defaultDuration = 5 } = options;

  const timetableItems = [];
  let currentTime = parseTime(startTime);
  let totalDuration = 0;

  slides.forEach((slide) => {
    const itemStartTime = new Date(currentTime);
    const duration = defaultDuration;
    
    currentTime.setMinutes(currentTime.getMinutes() + duration);
    totalDuration += duration;
    
    timetableItems.push({
      id: slide.id,
      title: slide.title,
      content: slide.content,
      startTime: formatTime(itemStartTime),
      duration,
      endTime: formatTime(currentTime),
    });
  });

  return {
    startTime,
    items: timetableItems,
    totalDuration,
  };
} 
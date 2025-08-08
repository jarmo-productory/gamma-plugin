# Gamma Timetable Extension - UX Improvements PRD

## 1. Sticky Header Design

### Layout Structure

- **Position**: `position: sticky; top: 0; z-index: 1000;`
- **Background**: Clean white background with subtle shadow
- **Padding**: `16px 24px`
- **Border**: Bottom border `1px solid #e5e7eb`
- **Box Shadow**: `0 2px 4px rgba(0, 0, 0, 0.1)`

### First Row - Title & Duration

- **Layout**: `display: flex; justify-content: space-between; align-items: center;`
- **Title Styling**:
  - Font: `font-size: 18px; font-weight: 600; color: #1f2937;`
  - Text overflow: `text-overflow: ellipsis; overflow: hidden; white-space: nowrap;`
  - Max width: `calc(100% - 80px)` to leave space for duration
- **Duration Badge**:
  - Background: `background-color: #f3f4f6;`
  - Padding: `4px 12px;`
  - Border radius: `16px;`
  - Font: `font-size: 14px; font-weight: 500; color: #6b7280;`
  - Text: Format as "Xh Ym" (e.g., "1h 30m")

### Second Row - Functions Toolbar

- **Layout**: `display: flex; align-items: center; gap: 12px; margin-top: 12px;`

#### Time Display Section

- **Container**: `display: flex; align-items: center; gap: 8px;`
- **Time Display**:
  - Font: `font-size: 24px; font-weight: 700; color: #1f2937;`
  - Font family: `font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;`
- **Refresh Button**:
  - Size: `32px × 32px`
  - Background: `transparent`
  - Border: `1px solid #d1d5db`
  - Border radius: `6px`
  - Hover state: `background-color: #f9fafb; border-color: #9ca3af;`
  - Icon: Circular arrow SVG, `16px × 16px`, color `#6b7280`

#### Export Buttons Section

- **Container**: `display: flex; gap: 8px; margin-left: auto;`
- **Button Styling** (CSV, XLSX, Copy):
  - Size: `height: 32px; padding: 0 12px;`
  - Background: `background-color: #f8fafc;`
  - Border: `1px solid #e2e8f0;`
  - Border radius: `6px;`
  - Font: `font-size: 14px; font-weight: 500; color: #475569;`
  - Layout: `display: flex; align-items: center; gap: 6px;`
  - Hover state: `background-color: #f1f5f9; border-color: #cbd5e1;`
  - Active state: `background-color: #e2e8f0;`

## 2. SVG Icons Specifications

### Required Icons (to be placed in `src/assets/icons/`)

- **refresh.svg**: Circular arrow icon (16×16px)
- **csv.svg**: Spreadsheet icon with CSV label (16×16px)
- **xlsx.svg**: Excel-style spreadsheet icon (16×16px)
- **copy.svg**: Duplicate/copy icon (16×16px)

### Icon Styling

- **Default color**: `#6b7280`
- **Hover color**: `#374151`
- **SVG properties**: `fill="currentColor" stroke="none"`

## 3. Responsive Design

- **Minimum width**: `320px`
- **Mobile breakpoint** (`max-width: 480px`):
  - Reduce padding to `12px 16px`
  - Stack buttons vertically if needed
  - Reduce font sizes by 10%

## 4. Animation & Transitions

- **Button hover transitions**: `transition: all 0.15s ease-in-out;`
- **Refresh button rotation**: `transform: rotate(360deg); transition: transform 0.3s ease-in-out;`
- **Header shadow on scroll**: Increase shadow intensity when content scrolls

## 5. Accessibility

- **Button aria-labels**:
  - Refresh: `aria-label="Refresh timetable"`
  - CSV: `aria-label="Export to CSV"`
  - XLSX: `aria-label="Export to Excel"`
  - Copy: `aria-label="Copy to clipboard"`
- **Focus states**: `outline: 2px solid #3b82f6; outline-offset: 2px;`
- **Keyboard navigation**: All buttons accessible via Tab key

## 6. Excel Export Adjustments

- Remove slide ID from first column
- First row: Slide show title (text from 1st slide)
- Second row: Empty
- Data starts from third row

## 7. Implementation Notes

- Use CSS Grid for precise layout control
- Implement smooth scrolling behavior
- Ensure header remains functional during content updates
- Test across different content lengths and screen sizes

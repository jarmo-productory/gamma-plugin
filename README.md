# Gamma Timetable Extension

A Chrome extension to help you create and manage timetables directly from your Gamma presentations.

## Features

- **Automatic Slide Detection:** Automatically detects all slides in a Gamma presentation.
- **Timetable Generation:** Instantly generates a schedule based on your slides.
- **Customizable Durations:** Use a simple slider to set the duration for each slide, from 0 to 15 minutes.
- **Data Persistence:** Your timetable is automatically saved and reloaded for each presentation.
- **Multiple Export Formats:** Export your timetable to CSV, Excel (.xlsx), or PDF. You can also copy it to your clipboard.

## How to Use

1.  **Install the Extension:**
    -   Download the latest release `.zip` file from the [releases page](https://github.com/jarmo-productory/gamma-plugin/releases).
    -   Open Chrome and navigate to `chrome://extensions`.
    -   Enable "Developer mode" in the top right corner.
    -   Click "Load unpacked" and select the `dist` folder from the unzipped release.

2.  **Open a Gamma Presentation:**
    -   Navigate to any presentation on `gamma.app`.
    -   Click the extension icon in your Chrome toolbar to open the sidebar.

3.  **Generate a Timetable:**
    -   The sidebar will initially show the raw content extracted from the slides.
    -   Click the "Generate Timetable" button.
    -   You will be prompted to enter a start time (e.g., "09:00").

4.  **Adjust Timings:**
    -   Use the slider below each slide title to adjust its duration. The timetable will update automatically.
    -   Set a duration of 0 to effectively skip a slide in the schedule.

5.  **Export Your Timetable:**
    -   Use the buttons at the top of the sidebar to export your finished timetable to CSV, Excel, or PDF.

## Development

To set up the extension for local development:

1.  Clone the repository:
    ```bash
    git clone https://github.com/jarmo-productory/gamma-plugin.git
    ```
2.  Install dependencies:
    ```bash
    cd gamma-plugin
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
4.  Load the `dist` folder into Chrome as an unpacked extension (see installation instructions).

The `dist` folder will be automatically updated as you make changes to the source files in the `src` directory. 
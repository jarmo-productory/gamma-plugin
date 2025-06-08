# Gamma Timetable Extension

A Chrome extension to help you create and manage timetables directly from your Gamma presentations.

---

## 🚀 Installation Guide (For Everyone)

Follow these steps to install the extension. No technical experience needed!

**1. Download the Extension**

*   Click here to go to the **[Latest Release Page](https://github.com/jarmo-productory/gamma-plugin/releases/latest)**.
*   On that page, look for the file named `gamma-plugin-release.zip` and click on it to download.

**2. Unzip the File**

*   Find the downloaded `.zip` file on your computer (usually in your "Downloads" folder).
*   Unzip the file. This will create a new folder.
    *   **Windows:** Right-click the file and select "Extract All...".
    *   **Mac:** Double-click the file.

**3. Load the Extension in Chrome**

*   Open the Google Chrome browser.
*   Click on the **three dots (⋮)** menu in the top-right corner, go to **Extensions**, and then select **Manage Extensions**.
    *   *Alternatively, you can copy and paste this address into your browser: `chrome://extensions`*
*   In the top-right corner of the "Extensions" page, turn on the **Developer mode** switch.

![Developer Mode Switch](httpsd://i.imgur.com/i7gV6rV.png)

*   Now that Developer mode is on, a new menu will appear. Click the **Load unpacked** button.

![Load Unpacked Button](https://i.imgur.com/h4iB54r.png)

*   A file selection window will open. Navigate to the folder you unzipped in Step 2 and select the **`dist`** folder inside it. Click **Select Folder**.

**4. All Done!**

*   The "Gamma Timetable Extension" should now appear in your list of extensions!
*   You can click the jigsaw puzzle icon (🧩) in your Chrome toolbar to pin the extension for easy access.

---

## ✨ Features

- **Automatic Slide Detection:** Automatically detects all slides in a Gamma presentation.
- **Timetable Generation:** Instantly generates a schedule based on your slides.
- **Customizable Durations:** Use a simple slider to set the duration for each slide, from 0 to 15 minutes.
- **Data Persistence:** Your timetable is automatically saved and reloaded for each presentation.
- **Multiple Export Formats:** Export your timetable to CSV, Excel (.xlsx), or PDF. You can also copy it to your clipboard.

## How to Use

1.  **Open a Gamma Presentation:**
    -   Navigate to any presentation on `gamma.app`.
    -   Click the extension icon in your Chrome toolbar to open the sidebar.

2.  **Generate a Timetable:**
    -   The sidebar will initially show the raw content extracted from the slides.
    -   Click the "Generate Timetable" button.
    -   You will be prompted to enter a start time (e.g., "09:00").

3.  **Adjust Timings:**
    -   Use the slider below each slide title to adjust its duration. The timetable will update automatically.
    -   Set a duration of 0 to effectively skip a slide in the schedule.

4.  **Export Your Timetable:**
    -   Use the buttons at the top of the sidebar to export your finished timetable to CSV, Excel, or PDF.

---

## 💻 For Developers

To set up the extension for local development:

1.  **Clone the Repository:**
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
4.  **Load the Extension:** Follow the installation guide above, but instead of the unzipped release folder, select the `dist` folder located inside your local project directory.

The `dist` folder will be automatically updated by the `dev` command as you make changes to the source files in the `src` directory. 
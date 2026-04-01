# Attendance Tracker

A modern, responsive web application for tracking Work From Office (WFO) attendance with comprehensive features for managing work hours, leave, and generating reports.

## Features

### Core Functionality
- **Daily Attendance Logging**: Log check-in and check-out times with automatic hour calculation
- **10-Hour Maximum Rule**: Hours are capped at 10 per day (check-in/check-out times can exceed 10 hours, but only 10 hours are counted)
- **24-Hour Time Format**: All times are in 24-hour format (HH:MM)
- **Edit & Delete Entries**: Easily modify or remove existing attendance records

### Dashboard & Reporting
- **Dashboard Overview**: Quick stats showing working days, expected hours, worked hours, and shortfall
- **Monthly View**: Detailed monthly statistics with working days and hours breakdown
- **Quarterly View**: Navigate through quarters with monthly breakdowns and status indicators
- **Yearly View**: Annual overview with quarterly summaries and completion status

### Leave Management
- **PL Days Tracking**: Enter and track paid leave days
- **Automatic Holiday Calculation**: Holidays are automatically calculated based on the current month
- **Deduction Tracking**: View total deductions from expected hours

### Data Management
- **CSV Import**: Import attendance data from CSV files
- **CSV Export**: Export all attendance data to CSV format
- **CSV Format**: `date,checkin,checkout,hours` (e.g., `2026-04-01,09:00,17:00,8.0`)
- **Data Validation**: Automatic validation and error handling during import

### User Experience
- **Responsive Design**: Optimized for mobile (380px+), tablet, and desktop screens
- **Tabbed Interface**: Easy navigation between Dashboard, Monthly, Quarterly, and Yearly views
- **Toast Notifications**: Visual feedback for all actions (success, error, warning)
- **Modern UI**: Clean, professional design with smooth animations
- **Keyboard Friendly**: Quick time entry with "Now" buttons for current time

## CSV Format Details

### Required Columns
1. **date**: Date in YYYY-MM-DD format (e.g., `2026-04-01`)
2. **checkin**: Check-in time in HH:MM 24-hour format (e.g., `09:00`)
3. **checkout**: Check-out time in HH:MM 24-hour format (e.g., `17:00`)
4. **hours**: Hours worked as decimal number (e.g., `8.0`)

### Example CSV Content
```
date,checkin,checkout,hours
2026-04-01,09:00,17:00,8.0
2026-04-02,08:30,18:30,10.0
2026-04-03,09:00,20:00,10.0
```

### Important Notes
- Hours are **capped at 10 per day** regardless of check-in/check-out times
- If check-in/check-out times result in more than 10 hours, only 10 hours are counted
- The first row should contain headers and will be skipped during import
- Invalid rows are automatically skipped during import

## Usage

### Getting Started
1. Open `index.html` in a modern web browser
2. The app will automatically set today's date
3. Enter check-in and check-out times
4. Click "Save Entry" to log your attendance

### Logging Attendance
1. Select the date using the date picker
2. Enter check-in time (24-hour format)
3. Enter check-out time (24-hour format)
4. Click "Save Entry" or press Enter
5. Use "Now" buttons to quickly insert current time

### Editing Entries
1. Find the entry in the Attendance Logs table
2. Click the edit button (pencil icon)
3. Modify the date, check-in, or check-out times
4. Click "Update Entry" to save changes
5. Click "Cancel" to discard changes

### Importing CSV Data
1. Scroll to the "Data Management" section
2. Click "Choose File" under "Upload CSV"
3. Select a CSV file in the correct format
4. The app will validate and import valid entries
5. Invalid rows are automatically skipped

### Exporting Data
1. Scroll to the "Data Management" section
2. Click "Download" under "Download CSV"
3. A CSV file will be downloaded with all attendance data

### Managing Leave
1. Scroll to the "Leave Management" section
2. Enter the number of PL (paid leave) days
3. Holidays are automatically calculated
4. Deductions are reflected in the dashboard

## Technical Details

### Browser Compatibility
- Chrome (recommended)
- Firefox
- Safari
- Edge

### Data Storage
- All data is stored in the browser's localStorage
- Data persists across browser sessions
- No server or database required

### File Structure
```
timetracker/
├── index.html      # Main HTML file
├── styles.css      # CSS styles
├── app.js          # JavaScript application logic
└── README.md       # This file
```

## Design Features

### Color Scheme
- Primary: Indigo (#6366f1)
- Success: Green (#10b981)
- Warning: Amber (#f59e0b)
- Danger: Red (#ef4444)
- Info: Blue (#3b82f6)

### Typography
- Font Family: Inter (Google Fonts)
- Clean, modern sans-serif for excellent readability

### Responsive Breakpoints
- Mobile: 380px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px+

## Status Indicators

### Monthly/Quarterly Status
- **Complete**: Green badge - Hours worked meets or exceeds target
- **In Progress**: Yellow badge - Some hours logged but target not met
- **Not Started**: Gray badge - No hours logged for the period

### Hours Color Coding
- **Green**: 6 or more hours worked (meets daily target)
- **Yellow**: Less than 6 hours worked (below daily target)

## Tips for Best Use

1. **Regular Logging**: Log attendance daily for accuracy
2. **CSV Backup**: Export data regularly as a backup
3. **Check Calculations**: Verify the 10-hour cap is working as expected
4. **Mobile Use**: The app works great on mobile devices for quick logging
5. **Leave Planning**: Use the quarterly view to plan leave and track progress

## Support

For issues or questions, please refer to the CSV format example and ensure your data matches the required format.

---

**Version**: 1.0.0
**Last Updated**: 2026
**License**: MIT

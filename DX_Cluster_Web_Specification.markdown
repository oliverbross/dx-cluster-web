# DX Cluster Web Application: Project Specification

## 1. Overview

The DX Cluster Web Application is a web-based, responsive tool designed for ham radio operators to monitor and interact with DX clusters. A DX cluster is a network of computers that share real-time information about DX activity (distant or rare radio stations). This application integrates with Wavelog via API to help operators identify stations they need to work based on their logbook, offering advanced filtering, alarms, and a user-friendly interface.

### Key Objectives
- Provide real-time access to DX cluster spots.
- Integrate with Wavelog to check logbook status and highlight "needed" stations.
- Offer comprehensive filtering and customizable alarms (visual and audio).
- Ensure a responsive design usable on desktop and mobile devices.

### Key Features
- **DX Cluster Integration**: Connect to DX clusters, send commands, and receive spots.
- **Spot Filtering and Display**: Display and filter spots with color-coding based on logbook status.
- **Alarm and Notification System**: Visual and audio alerts for user-defined criteria.
- **Wavelog API Integration**: Check logbook status and potentially log new contacts.
- **User Interface**: Responsive dashboard with settings, terminal, spot, and alarm windows.
- **Preferences**: Customize filters, colors, and audio settings.

---

## 2. Functional Requirements

### 2.1. User Interface
The application must be web-based and responsive, ensuring usability across devices. The UI includes:

- **Dashboard**: Central hub linking to all features.
- **DX Cluster Settings**: Configure cluster connections and filters.
- **DX Alarm Settings**: Set up color-coding, audio, and alarm triggers.
- **DX Cluster Terminal Window**: Send commands and view responses.
- **DX Spot Window**: Display and interact with filtered spots.
- **DX Station Alarm Window**: Auto-open for alarm-triggering spots.
- **Preferences**: Customize settings and appearance.

#### Detailed UI Requirements
- **DX Spot Window**:
  - Display spots in a table (callsign, frequency, mode, time, etc.).
  - Allow sorting by column, adjusting column widths, and hiding columns.
  - Provide real-time filtering (e.g., band, mode) via dropdowns or popup menus.
  - Include search fields for callsign or other attributes.
  - Double-click a spot to transfer data to logging or tune the radio.
- **DX Station Alarm Window**:
  - Auto-open for spots matching alarm criteria, with detailed spot info.
  - Close after two hours if no further spots are received.
  - Support multiple simultaneous alarm windows with sequence numbers in titles.
- **Terminal Window**:
  - Text field for manual commands and a response display area.
  - Eight configurable macro buttons for predefined commands.

---

### 2.2. DX Cluster Integration
- **Cluster Selection**:
  - Fetch a list of DX clusters from [https://www.ng3k.com/misc/cluster.html](https://www.ng3k.com/misc/cluster.html).
  - Allow users to select from the list or add custom clusters (address, port).
- **Connection Management**:
  - Support auto-login with username/password or default to the user’s callsign from Preferences.
  - Provide connect/disconnect buttons.
- **Command Sending**:
  - Send user-defined commands on connection (separated by `\n`, e.g., `sh/dx/10 \n sh/wwv/3`).
  - Allow manual command entry via the Terminal Window.
- **Spot Reception**:
  - Process spots in real-time from the connected cluster.

---

### 2.3. Spot Filtering and Display
- **Filtering**:
  - Filter spots by band, mode, and other criteria in DX Cluster Settings.
  - Recognize special comments (e.g., SOTA, POTA, WWFF) for filtering/highlighting.
  - Option to hide spots not meeting filter or color-coding criteria.
- **Display**:
  - Show only the latest spot per callsign, band, and mode within the last two hours.
  - Color-code spots based on logbook status (e.g., new DXCC, worked, confirmed).
  - Indicate LoTW (`.`, `;`) and eQSL (`,`, `;`) users with suffixes.
- **Interaction**:
  - Double-click transfers data to logging or tunes the radio.
  - Right-click offers a context menu (e.g., show on map, add to log).

---

### 2.4. Alarm and Notification System
- **Color Coding**:
  - Define "new" stations (e.g., DXCC, band, mode, IOTA) based on logbook data.
  - Customize colors for statuses (e.g., new, worked, confirmed).
- **Audio Announcements**:
  - Enable/disable audio with options for English/German voices.
  - Adjust speed and volume via sliders.
- **Station List**:
  - Support a list of stations/partial callsigns (with `*` wildcard, e.g., `VP2M*`) for alarms.
  - Open a DX Station Alarm Window for each matching spot.

---

### 2.5. Wavelog API Integration
- **API Key**:
  - Support read-only or read/write API keys entered by the user.
- **Logbook Checks**:
  - Use `/api/logbook_check_callsign` and `/api/logbook_check_grid` to verify if a station/grid is logged.
  - Determine "needed" status based on criteria (e.g., new DXCC, band, mode).
- **Station Info**:
  - Fetch user station details via `/api/station_info`.
- **Logging**:
  - Since no direct logging API exists, implement a workaround (e.g., pre-fill Wavelog’s logging page in a browser).

---

### 2.6. Preferences and Customization
- **General**:
  - Store the user’s callsign and auto-connect option.
- **Colors**:
  - Provide color pickers for spot statuses (e.g., new DXCC, worked but not confirmed).
- **Audio**:
  - Configure language, speed, and volume for announcements.
- **Filters**:
  - Set default filters for spots (e.g., bands, modes).

---

## 3. Technical Requirements

### 3.1. Architecture
- **Frontend**: Use React or Angular for a responsive, dynamic UI.
- **Backend**: Use Node.js or Django for API handling, spot processing, and settings management.
- **Database**: Use PostgreSQL or MongoDB for user settings and spot history.
- **Modularity**: Separate UI, logic, and data layers for flexibility.

### 3.2. Security
- **Authentication**: Secure API key storage and user data.
- **Data Protection**: Encrypt sensitive information (e.g., passwords, API keys).

### 3.3. Performance
- **Real-Time**: Optimize for low-latency spot processing.
- **Scalability**: Support multiple users and high spot volumes.

---

## 4. Additional Considerations
- **Documentation**: Include developer and user guides.
- **Testing**: Unit, integration, and acceptance tests for reliability.
- **Extensibility**: Allow easy addition of features (e.g., new APIs, filters).

---

## 5. Deliverables
- Fully functional web application.
- Source code with documentation and comments.
- User manual and developer documentation.
- Deployment instructions.

---

This specification ensures all features from your draft are implemented professionally, with room for future growth. A developer can use this to build a robust, user-friendly DX cluster tool.
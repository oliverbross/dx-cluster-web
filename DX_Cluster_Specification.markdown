# DX Cluster Web Application Specification

## 1. Wavelog API Calls
The following API endpoints from Wavelog enable logbook integration:

- **`api/logbook_check_callsign`**  
  - **Purpose**: Check if a callsign is in the user's logbook.  
  - **Parameters**:  
    ```json
    {
      "key": "YOUR_API_KEY",
      "logbook_public_slug": "YOUR_LOGBOOK_SLUG",
      "band": "20m",
      "callsign": "DX_CALLSIGN"
    }
    ```

- **`api/logbook_check_grid`**  
  - **Purpose**: Check if a grid square is logged.  
  - **Parameters**:  
    ```json
    {
      "key": "YOUR_API_KEY",
      "logbook_public_slug": "YOUR_LOGBOOK_SLUG",
      "band": "20m",
      "grid": "GRID_SQUARE"
    }
    ```

- **`api/station_info`**  
  - **Purpose**: Retrieve station profile details.  
  - **Response**:  
    ```json
    [
      {
        "station_id": "1",
        "station_profile_name": "JO30oo / DJ7NT",
        "station_gridsquare": "JO30OO",
        "station_callsign": "DJ7NT",
        "station_active": "1"
      }
    ]
    ```

- **`api/get_wp_stats`** (Wavelog 2.0.1+)  
  - **Purpose**: Fetch QSO statistics.  
  - **Parameters**:  
    ```json
    {
      "key": "YOUR_API_KEY",
      "station_id": "YOUR_STATION_ID"
    }
    ```

**Note**: For logging QSOs, pre-fill Wavelog’s logging page as a workaround.

## 2. DX Cluster List
- **Source**: [https://www.ng3k.com/misc/cluster.html](https://www.ng3k.com/misc/cluster.html)  
- **Implementation**:  
  - Fetch list dynamically from the URL.  
  - Allow manual entry of custom clusters (e.g., `host:port`).

## 3. Technology Stack
- **JavaScript**: Real-time updates (WebSockets), UI (React/Vue.js).  
- **PHP**: Server logic, API calls (Ratchet for WebSockets).  
- **MySQL**: Store settings, spot history.  
- **HTML**: Responsive UI structure.  

**Recommendations**:  
- Use Laravel for PHP backend.  
- Add Redis for caching.
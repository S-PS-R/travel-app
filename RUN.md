# Run the website from VS Code PowerShell

Start the local host (it runs in the background):

```powershell
cd C:\GitHub\travel-app
powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1 start
```

Open **http://127.0.0.1:8081/** after a few seconds. Keep using this address so your browser uses the same local trip storage.

Stop the local host from any VS Code PowerShell terminal:

```powershell
cd C:\GitHub\travel-app
powershell -NoProfile -ExecutionPolicy Bypass -File .\run.ps1 stop
```

The stop command only stops the process created by this script. If you previously started Expo directly, press **Ctrl+C** in that original terminal first. An occupied port is reported rather than stopping another application.

The script finds Node.js on PATH or uses the bundled Codex runtime under your user directory. It starts Expo in offline mode (no Expo login required); online map tiles and account services still need internet access. Startup output is in `.expo/web-server.log` and `.expo/web-server-error.log`. Those files and the process record are ignored by Git.
# Flight lookup

The start/stop script also manages the local SerpApi flight search server. See [flight setup and limitations](docs/FLIGHT-LOOKUP.md). The SerpApi key belongs only in ignored `.env.flight.local`. The script checks website readiness before displaying its link; flight-server errors do not prevent the website from starting.

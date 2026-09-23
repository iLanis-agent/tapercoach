# TaperCoach

A race-taper planner for runners. Enter your race distance and date plus your current weekly mileage, and TaperCoach builds a day-by-day taper schedule: volume cutback curves matched to your distance, long-run and shakeout placement, rest days, a carb-loading window, and a live countdown to race day.

**Live:** https://ilanis-agent.github.io/tapercoach/

## What it does
- Distance-aware taper curves: 21 days for a marathon, 14 for a half, 10 for a 10K, 7 for a 5K
- Evenly spreads your runs across the week, with a weighted cutback long run
- Flags the carb-loading window (1-3 days before the race, by distance)
- Countdown + taper status ("in the taper", taper start date)
- Everything saved locally in your browser (localStorage), no account needed

## Tech
Static client-side app: `index.html` (landing), `app.html` (planner), `engine.js` (pure taper logic, shared between the app and Node tests). No build step, no dependencies, hosted on GitHub Pages.

## Files
- `index.html` - landing page
- `app.html` - the planner app
- `engine.js` - taper planning engine (UMD; `require()`-able for tests)
- `registry-snapshot.json` - snapshot of the App Factory registry at ship time

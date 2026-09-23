// TaperCoach engine - race taper planning logic (no DOM)
(function (root) {
  'use strict';

  var BUCKETS = [
    { name: '5K',      maxKm: 6,    taperDays: 7,  curve: [0.50],              carbDays: 1 },
    { name: '10K',     maxKm: 12,   taperDays: 10, curve: [0.45, 0.70],        carbDays: 2 },
    { name: 'Half',    maxKm: 25,   taperDays: 14, curve: [0.45, 0.70],        carbDays: 2 },
    { name: 'Marathon', maxKm: 1e9, taperDays: 21, curve: [0.40, 0.55, 0.75],  carbDays: 3 }
  ];

  function bucketFor(km) {
    if (!(km > 0)) throw new Error('distance must be positive');
    for (var i = 0; i < BUCKETS.length; i++) if (km <= BUCKETS[i].maxKm) return BUCKETS[i];
    return BUCKETS[BUCKETS.length - 1];
  }

  function taperDays(bucket) { return bucket.taperDays; }

  // daysOut: 0 = race day. Returns weekly volume multiplier vs normal training.
  function weeklyMultiplier(daysOut, bucket) {
    if (daysOut < 0) return 0;
    if (daysOut >= bucket.taperDays) return 1.0;
    var weekIndex = Math.floor(daysOut / 7); // 0 = race week
    var c = bucket.curve;
    return c[Math.min(weekIndex, c.length - 1)];
  }

  // Which weekday offsets (0=Mon) are run days for n runs/week, evenly spread.
  function runDayOffsets(runsPerWeek) {
    if (runsPerWeek < 1 || runsPerWeek > 7) throw new Error('runsPerWeek 1-7');
    var offs = [];
    for (var i = 0; i < runsPerWeek; i++) offs.push(Math.floor(i * 7 / runsPerWeek));
    return offs;
  }

  function addDays(date, n) {
    var d = new Date(date.getTime());
    d.setDate(d.getDate() + n);
    return d;
  }

  function iso(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function startOfDay(d) { var x = new Date(d.getTime()); x.setHours(0,0,0,0); return x; }

  function daysBetween(a, b) {
    return Math.round((startOfDay(b) - startOfDay(a)) / 86400000);
  }

  // Weight of a run day within its week: last run day of the week is the long run (+50%).
  function dayWeight(offset, offsets) {
    var isLast = offset === offsets[offsets.length - 1];
    return isLast ? 1.5 : 1.0;
  }

  // opts: {distanceKm, raceDate (Date), today (Date), weeklyKm, runsPerWeek}
  // Returns {bucket, daysOut, taperStartISO, carbStartISO, days: [{iso, daysOut, kind, km, note}], totals}
  function buildPlan(opts) {
    var bucket = bucketFor(opts.distanceKm);
    var today = startOfDay(opts.today);
    var race = startOfDay(opts.raceDate);
    var daysOut = daysBetween(today, race);
    if (daysOut < 0) throw new Error('race date is in the past');
    var offsets = runDayOffsets(opts.runsPerWeek);
    var weights = offsets.map(function (o) { return dayWeight(o, offsets); });
    var wSum = weights.reduce(function (a, b) { return a + b; }, 0);

    var days = [];
    for (var i = 0; i <= daysOut; i++) {
      var d = addDays(today, i);
      var out = daysOut - i;
      var dow = (d.getDay() + 6) % 7; // Mon=0
      var mult = weeklyMultiplier(out, bucket);
      var weekKm = opts.weeklyKm * mult;
      var isRun = offsets.indexOf(dow) !== -1;
      var kind, km = 0, note = '';
      if (out === 0) {
        kind = 'race'; km = opts.distanceKm; note = 'Race day - trust the taper';
      } else if (isRun && out <= 3) {
        kind = 'shakeout';
        km = Math.max(2, Math.round(weekKm * (weights[offsets.indexOf(dow)] / wSum) * 0.6));
        note = 'Short shakeout with a few strides';
      } else if (isRun) {
        kind = (dow === offsets[offsets.length - 1]) ? 'long' : 'easy';
        km = Math.round(weekKm * (weights[offsets.indexOf(dow)] / wSum));
        note = kind === 'long' ? 'Cutback long run' : 'Easy aerobic';
      } else {
        kind = 'rest'; note = 'Full rest';
      }
      if (out > 0 && out <= bucket.carbDays) note = note ? note + ' - carb load' : 'Carb load';
      days.push({ iso: iso(d), daysOut: out, kind: kind, km: km, note: note });
    }
    var taperStart = addDays(race, -bucket.taperDays);
    var carbStart = addDays(race, -bucket.carbDays);
    var totalRunKm = days.reduce(function (a, d) { return d.kind === 'race' ? a : a + d.km; }, 0);
    return {
      bucket: bucket.name,
      daysOut: daysOut,
      taperStartISO: iso(taperStart),
      carbStartISO: iso(carbStart),
      inTaper: daysOut < bucket.taperDays,
      days: days,
      totalRunKm: Math.round(totalRunKm)
    };
  }

  function statusFor(plan) {
    if (plan.daysOut === 0) return 'Race day!';
    if (plan.inTaper) return 'In the taper - ' + plan.daysOut + ' days to go';
    return plan.daysOut + ' days out - taper starts ' + plan.taperStartISO;
  }

  var api = {
    bucketFor: bucketFor,
    taperDays: taperDays,
    weeklyMultiplier: weeklyMultiplier,
    runDayOffsets: runDayOffsets,
    buildPlan: buildPlan,
    statusFor: statusFor,
    iso: iso,
    daysBetween: daysBetween
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.TaperEngine = api;
})(typeof self !== 'undefined' ? self : this);

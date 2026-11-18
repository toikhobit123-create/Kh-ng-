/**
 * PVZ Tower Defense 2D - JSON-Based Wave Schedule Engine
 * Parses, validates, and expands JSON wave schedules with explicit intervals,
 * segment durations, start offsets, lane constraints, and mini-boss spacing.
 */

class WaveScheduleRegistry {
  static _schedule = null;
  static _loadAttempted = false;

  static getDefaultMetadata() {
    return {
      schemaVersion: 1,
      defaults: {
        initialDelay: (typeof WAVE_CONFIG !== 'undefined' && WAVE_CONFIG.INITIAL_DELAY) ? WAVE_CONFIG.INITIAL_DELAY : 20.0,
        restDelay: (typeof WAVE_CONFIG !== 'undefined' && WAVE_CONFIG.REST_DELAY) ? WAVE_CONFIG.REST_DELAY : 15.0,
        miniBossMinCellsBehind: 2,
        miniBossFallbackTimeout: 18.0
      }
    };
  }

  static validateSchedule(scheduleObj) {
    const errors = [];
    if (!scheduleObj || typeof scheduleObj !== 'object' || Array.isArray(scheduleObj)) {
      return { valid: false, errors: ['Schedule root must be a JSON object.'] };
    }
    if (!scheduleObj.levels || typeof scheduleObj.levels !== 'object' || Array.isArray(scheduleObj.levels)) {
      errors.push('Schedule must define a "levels" object keyed by level number.');
      return { valid: false, errors };
    }

    for (const [levelKey, levelDef] of Object.entries(scheduleObj.levels)) {
      if (!levelDef || typeof levelDef !== 'object') {
        errors.push(`Level "${levelKey}" must be an object.`);
        continue;
      }
      if (!Array.isArray(levelDef.waves) || levelDef.waves.length === 0) {
        errors.push(`Level "${levelKey}" must have a non-empty "waves" array.`);
        continue;
      }
      levelDef.waves.forEach((waveDef, wIdx) => {
        if (!waveDef || typeof waveDef !== 'object') {
          errors.push(`Level "${levelKey}" wave[${wIdx}] must be an object.`);
          return;
        }
        if (waveDef.duration !== undefined && (typeof waveDef.duration !== 'number' || waveDef.duration < 0)) {
          errors.push(`Level "${levelKey}" wave[${wIdx}].duration must be a non-negative number.`);
        }
        if (!Array.isArray(waveDef.segments)) {
          errors.push(`Level "${levelKey}" wave[${wIdx}] must define a "segments" array.`);
          return;
        }
        waveDef.segments.forEach((seg, sIdx) => {
          if (!seg || typeof seg !== 'object' || typeof seg.type !== 'string' || !seg.type.trim()) {
            errors.push(`Level "${levelKey}" wave[${wIdx}] segment[${sIdx}] missing valid "type".`);
            return;
          }
          if (seg.startOffset !== undefined && (typeof seg.startOffset !== 'number' || seg.startOffset < 0)) {
            errors.push(`Level "${levelKey}" wave[${wIdx}] segment[${sIdx}].startOffset must be >= 0.`);
          }
          if (seg.interval !== undefined && (typeof seg.interval !== 'number' || seg.interval < 0)) {
            errors.push(`Level "${levelKey}" wave[${wIdx}] segment[${sIdx}].interval must be >= 0.`);
          }
          if (seg.duration !== undefined && (typeof seg.duration !== 'number' || seg.duration < 0)) {
            errors.push(`Level "${levelKey}" wave[${wIdx}] segment[${sIdx}].duration must be >= 0.`);
          }
          if (seg.count !== undefined && (!Number.isInteger(seg.count) || seg.count < 1)) {
            errors.push(`Level "${levelKey}" wave[${wIdx}] segment[${sIdx}].count must be an integer >= 1.`);
          }
          const hasCount = Number.isInteger(seg.count) && seg.count >= 1;
          const hasIntervalAndDuration = typeof seg.interval === 'number' && seg.interval > 0 && typeof seg.duration === 'number';
          if (!hasCount && !hasIntervalAndDuration) {
            errors.push(`Level "${levelKey}" wave[${wIdx}] segment[${sIdx}] must specify "count" or both "interval" (> 0) and "duration".`);
          }
        });
      });
    }

    return { valid: errors.length === 0, errors };
  }

  static loadFromObject(scheduleObj) {
    const validation = this.validateSchedule(scheduleObj);
    if (!validation.valid) {
      throw new Error(`Invalid wave schedule JSON: ${validation.errors.join('; ')}`);
    }
    this._schedule = scheduleObj;
    this._loadAttempted = true;
    return this._schedule;
  }

  static loadFromJson(jsonString) {
    const parsed = JSON.parse(jsonString);
    return this.loadFromObject(parsed);
  }

  static getSchedule() {
    if (!this._schedule && !this._loadAttempted) {
      this.loadSyncFromEnvironment();
    }
    return this._schedule;
  }

  static loadSyncFromEnvironment() {
    this._loadAttempted = true;

    // 1. Pre-injected global object (if any)
    if (typeof window !== 'undefined' && window.WAVE_SCHEDULES_DATA) {
      try {
        return this.loadFromObject(window.WAVE_SCHEDULES_DATA);
      } catch (e) {
        console.warn('Failed to parse window.WAVE_SCHEDULES_DATA:', e);
      }
    }

    // 2. Android WebView Bridge reading assets/www/data/wave_schedules.json synchronously
    if (
      typeof window !== 'undefined' &&
      window.PvzAndroidBridge &&
      typeof window.PvzAndroidBridge.getWaveSchedulesJson === 'function'
    ) {
      try {
        const jsonStr = window.PvzAndroidBridge.getWaveSchedulesJson();
        if (jsonStr && jsonStr.trim().length > 0) {
          return this.loadFromJson(jsonStr);
        }
      } catch (e) {
        console.warn('Failed to load wave schedule from PvzAndroidBridge:', e);
      }
    }

    // 3. Node.js environment (tests / tooling)
    if (typeof require === 'function' && typeof __dirname === 'string') {
      try {
        const fs = require('fs');
        const path = require('path');
        const candidatePaths = [
          path.resolve(__dirname, '../data/wave_schedules.json'),
          path.resolve(process.cwd(), 'app/src/main/assets/www/data/wave_schedules.json')
        ];
        for (const p of candidatePaths) {
          if (fs.existsSync(p)) {
            const raw = fs.readFileSync(p, 'utf8');
            return this.loadFromJson(raw);
          }
        }
      } catch (e) {
        console.warn('Failed to load wave_schedules.json in Node:', e);
      }
    }

    return null;
  }

  static async loadAsync(url = 'data/wave_schedules.json') {
    if (typeof fetch !== 'function') return this.getSchedule();
    try {
      const response = await fetch(url);
      if (!response.ok) return this.getSchedule();
      const data = await response.json();
      return this.loadFromObject(data);
    } catch (e) {
      return this.getSchedule();
    }
  }

  static getLevelSchedule(level, overrideSchedule = null) {
    const root = overrideSchedule || this.getSchedule();
    if (!root || !root.levels) return null;
    const key = String(level);
    return root.levels[key] || null;
  }

  static expandSegment(segment, rowsCount = 5, defaults = {}) {
    const type = segment.type;
    const startOffset = Math.max(0, Number(segment.startOffset) || 0);
    const interval = segment.interval !== undefined ? Math.max(0, Number(segment.interval)) : 0;
    const duration = segment.duration !== undefined ? Math.max(0, Number(segment.duration)) : 0;
    const jitter = segment.jitter !== undefined ? Math.max(0, Number(segment.jitter)) : 0;
    const hasExplicitCount = Number.isInteger(segment.count) && segment.count >= 1;

    const rawTimestamps = [];
    if (hasExplicitCount) {
      const count = segment.count;
      if (count === 1) {
        rawTimestamps.push(startOffset);
      } else if (interval > 0) {
        const effectiveInterval = (duration > 0 && (count - 1) * interval > duration)
          ? duration / (count - 1)
          : interval;
        for (let i = 0; i < count; i++) {
          rawTimestamps.push(startOffset + i * effectiveInterval);
        }
      } else if (duration > 0) {
        const effectiveInterval = duration / (count - 1);
        for (let i = 0; i < count; i++) {
          rawTimestamps.push(startOffset + i * effectiveInterval);
        }
      } else {
        for (let i = 0; i < count; i++) {
          rawTimestamps.push(startOffset);
        }
      }
    } else if (interval > 0) {
      // Duration + interval driven spawning
      const maxSteps = Math.floor((duration + 1e-6) / interval) + 1;
      for (let k = 0; k < maxSteps; k++) {
        rawTimestamps.push(startOffset + k * interval);
      }
    } else {
      rawTimestamps.push(startOffset);
    }

    const isMiniBoss = segment.isMiniBoss !== undefined
      ? !!segment.isMiniBoss
      : (typeof WaveManager !== 'undefined' && typeof WaveManager.isWaveMiniBossType === 'function'
          ? WaveManager.isWaveMiniBossType(type)
          : false);

    const minCellsBehindRegular = segment.minCellsBehindRegular !== undefined
      ? Math.max(0, Number(segment.minCellsBehindRegular))
      : (isMiniBoss ? (defaults.miniBossMinCellsBehind !== undefined ? defaults.miniBossMinCellsBehind : 2) : 0);

    const allowedRows = Array.isArray(segment.rows) && segment.rows.length > 0
      ? segment.rows.filter(r => Number.isInteger(r) && r >= 0 && r < rowsCount)
      : null;

    return rawTimestamps.map((baseDelay, idx) => {
      let delay = baseDelay;
      if (jitter > 0 && idx > 0) {
        const offset = (Math.random() * 2 - 1) * jitter;
        delay = Math.max(startOffset, baseDelay + offset);
      }
      delay = Number(delay.toFixed(3));

      let assignedRow;
      if (typeof segment.row === 'number' && Number.isInteger(segment.row)) {
        assignedRow = Math.max(0, Math.min(rowsCount - 1, segment.row));
      } else if (allowedRows && allowedRows.length > 0) {
        assignedRow = allowedRows[Math.floor(Math.random() * allowedRows.length)];
      } else {
        assignedRow = Math.floor(Math.random() * rowsCount);
      }

      return {
        type,
        row: assignedRow,
        delay,
        isMiniBoss,
        minCellsBehindRegular,
        miniBossGap: segment.miniBossGap !== undefined ? Number(segment.miniBossGap) : undefined
      };
    });
  }

  static buildWavePlan(level, waveNumber, overrideSchedule = null) {
    const root = overrideSchedule || this.getSchedule();
    if (!root || !root.levels) return null;

    const defaults = Object.assign({}, this.getDefaultMetadata().defaults, root.defaults || {});
    const levelDef = root.levels[String(level)];
    if (!levelDef || !Array.isArray(levelDef.waves) || levelDef.waves.length === 0) {
      return null;
    }

    const waveDef = levelDef.waves.find(w => w.wave === waveNumber) || levelDef.waves[waveNumber - 1];
    if (!waveDef) return null;

    const rowsCount = (typeof CONFIG !== 'undefined' && CONFIG.ROWS) ? CONFIG.ROWS : 5;
    const queue = [];

    for (const seg of (waveDef.segments || [])) {
      const items = this.expandSegment(seg, rowsCount, defaults);
      for (const item of items) {
        queue.push(item);
      }
    }

    queue.sort((a, b) => {
      if (a.delay !== b.delay) return a.delay - b.delay;
      if (a.isMiniBoss !== b.isMiniBoss) return a.isMiniBoss ? 1 : -1;
      return 0;
    });

    const maxScheduledDelay = queue.length > 0 ? queue[queue.length - 1].delay : 0;
    const waveDuration = Math.max(Number(waveDef.duration) || 0, maxScheduledDelay);

    return {
      level: Number(level),
      wave: waveNumber,
      totalWaves: levelDef.waves.length,
      waveName: waveDef.name || `Wave ${waveNumber}`,
      initialDelay: levelDef.initialDelay !== undefined ? Number(levelDef.initialDelay) : defaults.initialDelay,
      restDelay: waveDef.restAfter !== undefined
        ? Number(waveDef.restAfter)
        : (levelDef.restDelay !== undefined ? Number(levelDef.restDelay) : defaults.restDelay),
      isFinalWave: waveDef.isFinal !== undefined ? !!waveDef.isFinal : (waveNumber >= levelDef.waves.length),
      bgm: waveDef.bgm || null,
      waveDuration,
      segments: (waveDef.segments || []).map(s => ({
        type: s.type,
        startOffset: Number(s.startOffset) || 0,
        interval: Number(s.interval) || 0,
        duration: Number(s.duration) || 0,
        count: s.count || null
      })),
      queue,
      miniBossFallbackTimeout: defaults.miniBossFallbackTimeout || 18.0
    };
  }
}

if (typeof window !== 'undefined') {
  window.WaveScheduleRegistry = WaveScheduleRegistry;
  // Trigger async fetch as well for HTTP browser contexts where PvzAndroidBridge isn't present
  if (!window.PvzAndroidBridge && typeof fetch === 'function') {
    WaveScheduleRegistry.loadAsync('data/wave_schedules.json');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { WaveScheduleRegistry };
}

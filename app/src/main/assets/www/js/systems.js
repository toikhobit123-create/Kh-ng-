/**
 * PVZ Tower Defense 2D - Systems
 * Quản lý: Đợt Zombie (WaveManager 5 Wave/màn), Tương tác nhập liệu (InputHandler), Sandbox Panel kéo thả
 */

class CollisionSystem {
  static handleProjectileZombieCollisions(projectiles, zombies, gameState) {
    for (const p of projectiles) {
      if (
        !p.alive ||
        p.isLobbed ||
        p.isRollingPoisonBoulder ||
        p.isEnergyWave ||
        p.isJhinBullet ||
        p.isAhriOrb || p.type === 'ahri_orb' ||
        p.isIreliaBlade || p.type === 'irelia_blade' ||
        p.isAuroraRabbit || p.type === 'aurora_rabbit' ||
        p.isSyndraEmpoweredOrb || p.type === 'syndra_empowered_orb' ||
        p.isKataDagger || p.type === 'kata_dagger'
      ) continue;

      let targetZombie = null;
      let minX = Infinity;

      const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
      for (const z of zombies) {
        if (!z.alive || z.isHypnotized || z.isSubmerged || z.x > lawnRight) continue;
        if (z.row !== p.row) continue;

        if (p.x >= z.x - 25 && p.x <= z.x + 30) {
          if (z.x < minX) {
            minX = z.x;
            targetZombie = z;
          }
        }
      }

      if (targetZombie) {
        targetZombie.takeDamage(p.damage);
        p.alive = false;

        if (gameState && gameState.audio) {
          gameState.audio.playHit();
        }

        if (p.type === 'goo_pea') {
          targetZombie.applyPoison(1, 6.0, 3.0);
          targetZombie.applySlow(0.5, 4.0);
          gameState.spawnParticles(p.x, p.y, '#ba68c8', 6);
        } else if (p.type === 'ice_pea') {
          targetZombie.applySlow(0.5, 10.0);
          gameState.spawnParticles(p.x, p.y, '#00e5ff', 6);
        } else {
          gameState.spawnParticles(p.x, p.y, '#81c784', 5);
        }
      }
    }
  }
}

/**
 * QUẢN LÝ ĐỢT TẤN CÔNG (WaveManager - JSON-Driven Interval & Duration Scheduler)
 * - Đọc lịch trình Wave từ JSON (WaveScheduleRegistry / customSchedule) theo từng level & wave.
 * - Mỗi wave gồm nhiều segment quy định loại zombie, startOffset, interval, duration, count.
 * - Hỗ trợ lọc độ trễ Mini-Boss đi sau wave zombie thường đúng khoảng cách quy định (mặc định 2 ô).
 * - Phải diệt sạch 100% wave hiện tại mới sang wave tiếp theo.
 */
class WaveManager {
  constructor(level = 1, customSchedule = null) {
    this.level = level;
    this.levelConfig = (typeof LEVEL_CONFIG !== 'undefined' && LEVEL_CONFIG[level]) ? LEVEL_CONFIG[level] : { waves: 5, zombiePool: ['basic'] };
    this.customSchedule = WaveManager._normalizeScheduleInput(customSchedule);

    const registry = WaveManager._getRegistry();
    const levelSched = registry ? registry.getLevelSchedule(level, this.customSchedule) : null;

    this.currentWave = 1;
    this.totalWaves = levelSched && Array.isArray(levelSched.waves)
      ? levelSched.waves.length
      : ((level === 6 || level === 12 || level === 13) ? 1 : (this.levelConfig.waves || 5));

    const defaultInitialDelay = level === 13
      ? 18.0
      : ((level === 6 || level === 12) ? 8.0 : ((typeof WAVE_CONFIG !== 'undefined' && WAVE_CONFIG.INITIAL_DELAY) ? WAVE_CONFIG.INITIAL_DELAY : 20.0));

    // Trạng thái: 'initial_delay' | 'spawning' | 'waiting_clear' | 'wave_rest' | 'all_cleared'
    this.state = 'initial_delay';
    this.delayTimer = (levelSched && levelSched.initialDelay !== undefined)
      ? Number(levelSched.initialDelay)
      : defaultInitialDelay;
    this.restDelay = (levelSched && levelSched.restDelay !== undefined)
      ? Number(levelSched.restDelay)
      : ((typeof WAVE_CONFIG !== 'undefined' && WAVE_CONFIG.REST_DELAY) ? WAVE_CONFIG.REST_DELAY : 15.0);
    this.restTimer = 0;
    this.spawnTimer = 0;
    this.waveDuration = 0;
    this.waveName = 'Wave 1';
    this.isFinalWave = false;
    this.waveBgm = null;
    this.activeSegments = [];
    this.waveSpawnQueue = [];
    this.miniBossFallbackTimeout = 18.0;

    this.totalZombiesInWave = 0;
    this.spawnedZombiesInWave = 0;
    this.killedZombiesInWave = 0;
    this.lastRegularSpawnTime = 0;
    this.lastMiniBossSpawnTime = -999;

    this.prepareWave(1);
  }

  static _getRegistry() {
    if (typeof WaveScheduleRegistry !== 'undefined') return WaveScheduleRegistry;
    if (typeof require === 'function') {
      try {
        return require('./waveScheduler.js').WaveScheduleRegistry;
      } catch (_e) {
        return null;
      }
    }
    return null;
  }

  static _normalizeScheduleInput(scheduleOrJson) {
    if (!scheduleOrJson) return null;
    if (typeof scheduleOrJson === 'string') {
      return JSON.parse(scheduleOrJson);
    }
    return scheduleOrJson;
  }

  static loadSchedule(scheduleOrJson) {
    const registry = WaveManager._getRegistry();
    if (!registry) {
      throw new Error('WaveScheduleRegistry is not loaded.');
    }
    if (typeof scheduleOrJson === 'string') {
      return registry.loadFromJson(scheduleOrJson);
    }
    return registry.loadFromObject(scheduleOrJson);
  }

  static validateSchedule(scheduleOrJson) {
    const registry = WaveManager._getRegistry();
    const obj = WaveManager._normalizeScheduleInput(scheduleOrJson);
    return registry ? registry.validateSchedule(obj) : { valid: false, errors: ['Registry unavailable'] };
  }

  static isWaveMiniBossType(type) {
    if (type === 'gargantuar') return true;
    return !!(typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG[type] && ZOMBIE_CONFIG[type].isMiniBoss);
  }

  applySchedule(scheduleOrJson) {
    this.customSchedule = WaveManager._normalizeScheduleInput(scheduleOrJson);
    const registry = WaveManager._getRegistry();
    const levelSched = registry ? registry.getLevelSchedule(this.level, this.customSchedule) : null;
    if (levelSched && Array.isArray(levelSched.waves)) {
      this.totalWaves = levelSched.waves.length;
      if (this.state === 'initial_delay' && levelSched.initialDelay !== undefined) {
        this.delayTimer = Number(levelSched.initialDelay);
      }
    }
    this.prepareWave(this.currentWave);
  }

  prepareWave(waveNumber) {
    this.currentWave = waveNumber;
    const registry = WaveManager._getRegistry();
    const plan = registry ? registry.buildWavePlan(this.level, waveNumber, this.customSchedule) : null;

    if (plan) {
      this.totalWaves = plan.totalWaves;
      this.waveName = plan.waveName;
      this.waveDuration = plan.waveDuration;
      this.restDelay = plan.restDelay;
      this.isFinalWave = plan.isFinalWave;
      this.waveBgm = plan.bgm;
      this.activeSegments = plan.segments;
      this.waveSpawnQueue = plan.queue;
      this.miniBossFallbackTimeout = plan.miniBossFallbackTimeout || 18.0;
    } else {
      this._prepareFallbackWave(waveNumber);
    }

    this.totalZombiesInWave = this.waveSpawnQueue.length;
    this.spawnedZombiesInWave = 0;
    this.killedZombiesInWave = 0;
    this.lastRegularSpawnTime = 0;
    this.lastMiniBossSpawnTime = -999;
    this.spawnTimer = 0;
  }

  _prepareFallbackWave(waveNumber) {
    const pool = (this.levelConfig && Array.isArray(this.levelConfig.zombiePool) && this.levelConfig.zombiePool.length > 0)
      ? this.levelConfig.zombiePool
      : ['basic'];
    const count = Math.max(1, waveNumber * 2 + 1);
    const interval = Math.max(2.0, 8.0 - waveNumber * 1.1);
    const rowsCount = (typeof CONFIG !== 'undefined' && CONFIG.ROWS) ? CONFIG.ROWS : 5;

    this.waveName = `Wave ${waveNumber}`;
    this.isFinalWave = waveNumber >= this.totalWaves;
    this.waveBgm = this.isFinalWave ? 'boss' : null;
    this.activeSegments = [{ type: pool[0], startOffset: 0, interval, duration: (count - 1) * interval, count }];
    this.waveSpawnQueue = [];
    for (let i = 0; i < count; i++) {
      const type = pool[Math.min(pool.length - 1, Math.floor((i / count) * pool.length))];
      const isMiniBoss = WaveManager.isWaveMiniBossType(type);
      this.waveSpawnQueue.push({
        type,
        row: Math.floor(Math.random() * rowsCount),
        delay: Number((i * interval).toFixed(3)),
        isMiniBoss,
        minCellsBehindRegular: isMiniBoss ? 2 : 0
      });
    }
    this.waveDuration = count > 1 ? (count - 1) * interval : 0;
  }

  getScheduleSummary() {
    return {
      level: this.level,
      currentWave: this.currentWave,
      totalWaves: this.totalWaves,
      waveName: this.waveName,
      state: this.state,
      waveDuration: this.waveDuration,
      elapsedInWave: this.spawnTimer,
      totalZombiesInWave: this.totalZombiesInWave,
      spawnedZombiesInWave: this.spawnedZombiesInWave,
      remainingInQueue: this.waveSpawnQueue.length,
      segments: this.activeSegments
    };
  }

  update(dt, gameState) {
    // 0. Chế độ Sandbox hoặc Giai đoạn Dàn Trận Bloodharbor: KHÔNG chạy timer / sinh zombie
    if (gameState && (gameState.isSandbox || gameState.isSetupPhase)) {
      return;
    }

    // 1. Đầu game: Chờ delay trước khi zombie xuất hiện
    if (this.state === 'initial_delay') {
      this.delayTimer -= dt;
      if (this.delayTimer <= 0) {
        this.state = 'spawning';
        this.delayTimer = 0;
        if (gameState && gameState.audio) {
          if (this.waveBgm === 'boss') {
            gameState.audio.playWaveHorn();
            gameState.audio.playBGM('boss');
          } else {
            gameState.audio.playZombieGroan();
          }
        }
      }
      return;
    }

    // 2. Nghỉ giữa các Wave sau khi diệt sạch 100% zombie wave trước
    if (this.state === 'wave_rest') {
      this.restTimer -= dt;
      if (this.restTimer <= 0) {
        const nextWave = this.currentWave + 1;
        this.prepareWave(nextWave);
        this.state = 'spawning';
        if (gameState && gameState.audio) {
          if (this.isFinalWave || this.waveBgm === 'boss' || nextWave === 5) {
            gameState.audio.playWaveHorn();
            gameState.audio.playBGM('boss');
          } else {
            gameState.audio.playZombieGroan();
          }
        }
      }
      return;
    }

    // 3. Đang sinh quái theo lịch JSON (interval & duration)
    if (this.state === 'spawning') {
      this.spawnTimer += dt;
      const spawnX = CONFIG.CANVAS_WIDTH + 20;

      while (this.waveSpawnQueue.length > 0 && this.waveSpawnQueue[0].delay <= this.spawnTimer) {
        const nextItem = this.waveSpawnQueue[0];

        if (nextItem.isMiniBoss) {
          const bossGap = nextItem.miniBossGap || 2.5;
          if (this.lastMiniBossSpawnTime >= 0 && (this.spawnTimer - this.lastMiniBossSpawnTime) < bossGap) {
            break;
          }

          const minCells = nextItem.minCellsBehindRegular !== undefined ? nextItem.minCellsBehindRegular : 2;
          const behindPx = CONFIG.CELL_WIDTH * minCells;
          const liveRegulars = (gameState.zombies || []).filter(z =>
            z.alive && !z.isObstacle && !z.isHypnotized &&
            !WaveManager.isWaveMiniBossType(z.type) && !z.isBoss
          );

          let maxRegularX = -Infinity;
          if (liveRegulars.length > 0 && behindPx > 0) {
            maxRegularX = Math.max(...liveRegulars.map(z => z.x));
            const maxAllowedRegularX = spawnX - behindPx;
            const elapsedSinceLastRegular = this.spawnTimer - this.lastRegularSpawnTime;
            if (maxRegularX > maxAllowedRegularX && elapsedSinceLastRegular < this.miniBossFallbackTimeout) {
              break;
            }
          }

          const item = this.waveSpawnQueue.shift();
          const spawnedZ = gameState.spawnZombie(item.type, item.row);
          if (spawnedZ && behindPx > 0 && maxRegularX > spawnX - behindPx) {
            spawnedZ.x = Math.max(spawnedZ.x, maxRegularX + behindPx);
          }
          this.lastMiniBossSpawnTime = this.spawnTimer;
          this.spawnedZombiesInWave++;
        } else {
          const item = this.waveSpawnQueue.shift();
          gameState.spawnZombie(item.type, item.row);
          this.lastRegularSpawnTime = this.spawnTimer;
          this.spawnedZombiesInWave++;
        }
      }

      if (this.waveSpawnQueue.length === 0) {
        this.state = 'waiting_clear';
      }
    }

    // 4. BẮT BUỘC: Phải diệt sạch 100% quái vật của Wave hiện tại mới chuyển trạng thái
    if (this.state === 'waiting_clear') {
      const activeEnemies = gameState.zombies.filter(z => z.alive && !z.isObstacle && !z.isHypnotized && z.type !== 'yone_body').length;
      const flyingImps = gameState.flyingImps ? gameState.flyingImps.length : 0;
      const pendingWaves = gameState.pendingSandstormWaves ? gameState.pendingSandstormWaves.length : 0;

      const pykeAlive = this.level === 20 && gameState.zombies.some(z => z.alive && z.type === 'zombot_pyke');

      if (activeEnemies === 0 && flyingImps === 0 && pendingWaves === 0 && !pykeAlive) {
        if (this.currentWave >= this.totalWaves) {
          this.state = 'all_cleared';
          gameState.onLevelVictory();
        } else {
          this.state = 'wave_rest';
          this.restTimer = this.restDelay;
        }
      }
    }
  }

  getProgress() {
    if (this.state === 'initial_delay') return 0;
    const waveFraction = (this.currentWave - 1) / this.totalWaves;
    let inWaveProgress = 0;
    if (this.waveDuration > 0 && this.state === 'spawning') {
      const timeRatio = Math.min(1, this.spawnTimer / this.waveDuration);
      const countRatio = this.totalZombiesInWave > 0 ? (this.spawnedZombiesInWave / this.totalZombiesInWave) : 0;
      inWaveProgress = Math.max(timeRatio, countRatio) * (1 / this.totalWaves);
    } else if (this.totalZombiesInWave > 0) {
      inWaveProgress = (this.spawnedZombiesInWave / this.totalZombiesInWave) * (1 / this.totalWaves);
    }
    return Math.min(1.0, Math.max(0.0, waveFraction + inWaveProgress));
  }

  getStatusText(gameState) {
    if (gameState && gameState.isSandbox) return null;

    if (gameState && gameState.isSetupPhase) {
      const cap = gameState.maxPlantsOnBoard || 12;
      const count = gameState.plants ? gameState.plants.length : 0;
      return {
        title: `⚓ DÀN TRẬN BẾN CẢNG (${count}/${cap})`,
        sub: 'Đặt tối đa 12 cây (cột 1-6) rồi bấm Kéo Còi Tàu!',
        color: '#26c6da'
      };
    }

    if (this.state === 'initial_delay') {
      return {
        title: '⏳ CHUẨN BỊ CHIẾN ĐẤU',
        sub: `Zombie tấn công sau: ${Math.ceil(this.delayTimer)}s`,
        color: '#ffb300'
      };
    }
    if (this.state === 'wave_rest') {
      return {
        title: `✨ HOÀN THÀNH WAVE ${this.currentWave}!`,
        sub: `Nghỉ ngơi ${Math.ceil(this.restTimer)}s trước Wave ${this.currentWave + 1}...`,
        color: '#4fc3f7'
      };
    }
    if (this.state === 'waiting_clear') {
      const remaining = gameState ? gameState.zombies.filter(z => z.alive && !z.isObstacle && !z.isHypnotized && z.type !== 'yone_body').length : 0;
      const bossAlive = gameState && this.level === 12 && gameState.zombies.some(z => z.alive && z.type === 'ancient_dragon_boss');
      const azirAlive = gameState && this.level === 13 && gameState.zombies.some(z => z.alive && z.type === 'azir_desert_emperor');
      const pykeAlive = gameState && this.level === 20 && gameState.zombies.some(z => z.alive && z.type === 'zombot_pyke');
      const pendingStorm = (gameState && gameState.pendingSandstormWaves && gameState.pendingSandstormWaves.length > 0)
        ? gameState.pendingSandstormWaves[0]
        : null;
      return {
        title: this.level === 20
          ? (pykeAlive
              ? `⚓ ZOMBOT ĐỒ TỂ · PHASE ${gameState.bloodharborPhase || 1} (${remaining})`
              : `⚔️ HẠ GỤC TÀN QUÂN BẾN CẢNG (${remaining})`)
          : this.level === 13
          ? (azirAlive
              ? `☀️ HẠ HOÀNG ĐẾ AZIR & QUÂN SA MẠC (${remaining})`
              : (pendingStorm
                  ? `🌪️ SẮP CÓ WAVE BÃO CÁT (${Math.ceil(pendingStorm.timer)}s)`
                  : `⚔️ DIỆT SẠCH QUÂN SA MẠC CÒN LẠI (${remaining})`))
          : this.level === 12
          ? (bossAlive ? `🐉 HẠ BOSS RỒNG NGÀN TUỔI & HẾT QUÂN (${remaining})` : `⚔️ DIỆT SẠCH ZOMBIE & RỒNG CÒN LẠI (${remaining})`)
          : `⚔️ TIÊU DIỆT HẾT ZOMBIE CÒN LẠI (${remaining})`,
        sub: this.level === 20
          ? 'Đọc chiêu Q/E/R, dùng Xẻng đảo đội hình và săn Thuyền Trưởng Truy Nã!'
          : this.level === 13
          ? 'Phải hạ Azir, Thần Cá Sấu - Khuyển và toàn bộ Wave Bão Cát mới thắng!'
          : (this.level === 12 ? 'Phải diệt Boss và toàn bộ Zombie/Rồng mới thắng!' : 'Phải diệt sạch 100% để qua Wave!'),
        color: this.level === 20 ? '#ff5252' : (this.level === 13 ? '#ffb300' : '#ff7043')
      };
    }
    if (this.state === 'spawning' && (this.isFinalWave || this.currentWave === 5)) {
      if (this.level === 20) {
        const phase = (gameState && gameState.bloodharborPhase) || 1;
        const cutTimer = (gameState && typeof gameState.yourCutTimer === 'number') ? Math.ceil(gameState.yourCutTimer) : 25;
        return {
          title: `⚓ PHASE ${phase}: ${phase === 1 ? 'THĂM DÒ' : phase === 2 ? 'THỦY TRIỀU DÂNG' : 'HUYẾT CẢNG CUỒNG NỘ'}`,
          sub: `💀 Truy Nã tiếp theo: ${cutTimer}s · Hạ Zombot Đồ Tể để thắng!`,
          color: phase === 3 ? '#ff1744' : (phase === 2 ? '#00e5ff' : '#ffb300')
        };
      }
      return {
        title: `🚨 ĐỢT TẤN CÔNG CUỐI CÙNG (${this.waveName.toUpperCase()})!`,
        sub: 'Toàn bộ Zombie đang ồ ạt tràn vào!',
        color: '#e53935'
      };
    }
    return null;
  }
}

/**
 * QUẢN LÝ NHẬP LIỆU & SANDBOX CONTROL PANEL
 */
class InputHandler {
  constructor(canvas, gameState) {
    this.canvas = canvas;
    this.gameState = gameState;

    this.hoverCol = -1;
    this.hoverRow = -1;
    this.pointerX = 0;
    this.pointerY = 0;
    this.isPointerOnCanvas = false;

    this.initEvents();
  }

  initEvents() {
    const updatePointerPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      this.pointerX = (clientX - rect.left) * scaleX;
      this.pointerY = (clientY - rect.top) * scaleY;

      const relativeX = this.pointerX - CONFIG.GRID_OFFSET_X;
      const relativeY = this.pointerY - CONFIG.GRID_OFFSET_Y;

      if (relativeX >= 0 && relativeX < CONFIG.COLS * CONFIG.CELL_WIDTH &&
          relativeY >= 0 && relativeY < CONFIG.ROWS * CONFIG.CELL_HEIGHT) {
        this.hoverCol = Math.floor(relativeX / CONFIG.CELL_WIDTH);
        this.hoverRow = Math.floor(relativeY / CONFIG.CELL_HEIGHT);
        this.isPointerOnCanvas = true;
      } else {
        this.hoverCol = -1;
        this.hoverRow = -1;
        this.isPointerOnCanvas = false;
      }
    };

    this.canvas.addEventListener('mousemove', (e) => updatePointerPos(e));
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      updatePointerPos(e);
    }, { passive: false });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverCol = -1;
      this.hoverRow = -1;
      this.isPointerOnCanvas = false;
    });

    const handleAction = (e) => {
      updatePointerPos(e);

      // TÍCH HỢP CONVEYOR: Bắt sự kiện nhấn chuột / chạm vào thẻ bài trên băng chuyền
      if (this.gameState.gameMode === 'conveyor' && this.gameState.conveyorSystem) {
        const hitConveyor = this.gameState.conveyorSystem.onInputDown(this.pointerX, this.pointerY);
        if (hitConveyor) {
          if (this.gameState.audio && this.gameState.audio.playClick) {
            this.gameState.audio.playClick();
          }
          return; // Nếu chạm vào băng chuyền thì bỏ qua logic sân cỏ
        }
      }

      // 1. Nhặt Sun bằng tay
      const sunHitRadius = 40;
      for (const sun of this.gameState.suns) {
        if (!sun.collected && sun.alive) {
          const dx = this.pointerX - sun.x;
          const dy = this.pointerY - (sun.y + Math.sin(sun.floatTimer) * 4);
          if (dx * dx + dy * dy <= sunHitRadius * sunHitRadius) {
            sun.collect();
            return;
          }
        }
      }

      // 1.8. Dùng Plant Food lên cây đã trồng (Ngắt hơi thở lửa của Rồng & kích hoạt chiêu cuối)
      if (this.gameState.isPlantFoodActive) {
        if (this.hoverRow >= 0 && this.hoverCol >= 0) {
          const targetPlant = this.gameState.plants.find(p => p.alive && p.row === this.hoverRow && p.col === this.hoverCol);
          if (targetPlant) {
            const success = targetPlant.triggerPlantFood(this.gameState);
            if (success === false) {
              if (this.gameState.spawnFloatingText) {
                this.gameState.spawnFloatingText(targetPlant.x, targetPlant.y - 20, 'KHÔNG THỂ DÙNG! ⚠️', '#ff5252', 16);
              }
              this.gameState.setPlantFood(false);
              return;
            }
            this.gameState.plantFood = Math.max(0, this.gameState.plantFood - 1);
            this.gameState.setPlantFood(false);
            this.gameState.updateHUD();
            if (this.gameState.audio && this.gameState.audio.playExplosion) {
              this.gameState.audio.playExplosion('fire');
            }
            if (this.gameState.spawnFloatingText) {
              this.gameState.spawnFloatingText(targetPlant.x, targetPlant.y - 20, 'PLANT FOOD! ⚡🍃', '#76ff03', 20);
            }
            return;
          }
        }
        this.gameState.setPlantFood(false);
        return;
      }

      // 2. Xẻng đào cây
      if (this.gameState.isShovelActive) {
        if (this.hoverRow >= 0 && this.hoverCol >= 0) {
          this.gameState.removePlantAt(this.hoverRow, this.hoverCol);
        }
        this.gameState.setShovel(false);
        return;
      }

      // 3. Trồng cây
      if (this.gameState.selectedPlantType) {
        if (this.hoverRow >= 0 && this.hoverCol >= 0) {
          const success = this.gameState.tryPlant(this.gameState.selectedPlantType, this.hoverRow, this.hoverCol);
          if (success) {
            this.gameState.clearSelection();
          }
        } else {
          this.gameState.clearSelection();
        }
      }
    };

    const handleRelease = (e) => {
      // TÍCH HỢP CONVEYOR: Xử lý thả thẻ bài (Trồng cây hoặc Buff lá Plant Food)
      if (this.gameState.gameMode === 'conveyor' && this.gameState.conveyorSystem && this.gameState.conveyorSystem.draggedItem) {
        const gridPos = (this.hoverRow >= 0 && this.hoverCol >= 0) ? { row: this.hoverRow, col: this.hoverCol } : null;
        const currentPlant = gridPos ? this.gameState.plants.find(p => p.alive && p.row === gridPos.row && p.col === gridPos.col) : null;

        // Giao quyền xử lý đặt cây/buff lá cho Conveyor (Trồng miễn phí)
        this.gameState.conveyorSystem.onInputUp(
          gridPos,
          currentPlant,
          (row, col, plantId) => this.gameState.tryPlant(plantId, row, col, true),
          (plantEntity) => {
            if (plantEntity && plantEntity.triggerPlantFood) {
              const success = plantEntity.triggerPlantFood(this.gameState);
              if (success === false) {
                if (this.gameState.spawnFloatingText) {
                  this.gameState.spawnFloatingText(plantEntity.x, plantEntity.y - 20, 'KHÔNG THỂ DÙNG! ⚠️', '#ff5252', 16);
                }
                return false;
              }
              if (this.gameState.audio && this.gameState.audio.playExplosion) {
                this.gameState.audio.playExplosion('fire');
              }
              if (this.gameState.spawnFloatingText) {
                this.gameState.spawnFloatingText(plantEntity.x, plantEntity.y - 20, 'PLANT FOOD! ⚡🍃', '#76ff03', 20);
              }
              return true;
            }
            return false;
          }
        );
      }
    };

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 2) {
        e.preventDefault();
        this.gameState.clearSelection();
        return;
      }
      handleAction(e);
    });

    this.canvas.addEventListener('mouseup', (e) => {
      handleRelease(e);
    });

    this.canvas.addEventListener('touchstart', (e) => {
      handleAction(e);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      handleRelease(e);
    }, { passive: false });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.initSandboxEvents();

    const getSpawnRow = () => {
      const selectEl = document.getElementById('sb-row-select');
      const val = selectEl ? parseInt(selectEl.value, 10) : -1;
      if (val >= 0 && val < CONFIG.ROWS) return val;
      if (this.hoverRow >= 0) return this.hoverRow;
      return Math.floor(Math.random() * CONFIG.ROWS);
    };

    // Phím tắt kiểm thử
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      const num = parseInt(e.key, 10);
      if (num >= 1 && num <= 7) {
        const deck = this.gameState.selectedDeck;
        if (deck && deck[num - 1]) {
          this.gameState.selectCard(deck[num - 1]);
        } else if (num <= this.gameState.plantKeys.length) {
          this.gameState.selectCard(this.gameState.plantKeys[num - 1]);
        }
      } else if (e.key === 's' || e.key === 'S') {
        this.gameState.addSun(100);
        this.gameState.spawnParticles(100, 30, '#ffd54f', 6);
      } else if (e.key === 'd' || e.key === 'D' || e.key === 'x' || e.key === 'X') {
        this.gameState.clearSelection();
        this.gameState.setShovel(!this.gameState.isShovelActive);
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        this.gameState.toggleSpeed();
      } else if (e.key === 'z' || e.key === 'Z') {
        this.gameState.spawnZombie('basic', getSpawnRow());
      } else if (e.key === 'c' || e.key === 'C') {
        this.gameState.spawnZombie('conehead', getSpawnRow());
      } else if (e.key === 'b' || e.key === 'B') {
        this.gameState.spawnZombie('buckethead', getSpawnRow());
      } else if (e.key === 'p' || e.key === 'P') {
        this.gameState.spawnZombie('pole_vaulting', getSpawnRow());
      } else if (e.key === 'g' || e.key === 'G') {
        this.gameState.spawnZombie('gargantuar', getSpawnRow());
      } else if (e.key === 't' || e.key === 'T') {
        this.gameState.spawnZombie('tombstone', getSpawnRow());
      } else if (e.key === 'j' || e.key === 'J') {
        this.gameState.spawnZombie('jurassic_bully', getSpawnRow());
      } else if (e.key === 'l' || e.key === 'L') {
        this.gameState.spawnZombie('lang_khach', getSpawnRow());
      } else if (e.key === 'h' || e.key === 'H') {
        this.gameState.spawnZombie('shen', getSpawnRow());
      } else if (e.key === 'a' || e.key === 'A') {
        this.gameState.spawnZombie('anivia', getSpawnRow());
      } else if (e.key === 'o' || e.key === 'O') {
        this.gameState.spawnZombie('balloon', getSpawnRow());
      } else if (e.key === 'k' || e.key === 'K') {
        this.gameState.spawnZombie('jetpack', getSpawnRow());
      } else if (e.key === 'e' || e.key === 'E') {
        this.gameState.spawnZombie('thresh', getSpawnRow());
      } else if (e.key === 'q' || e.key === 'Q') {
        this.gameState.spawnZombie('quan_chua', getSpawnRow());
      } else if (e.key === 'w' || e.key === 'W') {
        this.gameState.spawnZombie('dragon_wind', getSpawnRow());
      } else if (e.key === 'n' || e.key === 'N') {
        this.gameState.spawnZombie('dragon_water', getSpawnRow());
      } else if (e.key === 'Escape') {
        this.gameState.clearSelection();
        this.gameState.setShovel(false);
        const sbPanel = document.getElementById('sandbox-panel');
        if (sbPanel && !sbPanel.classList.contains('hidden')) {
          sbPanel.classList.add('hidden');
        } else {
          this.gameState.togglePause();
        }
      }
    });
  }

  initSandboxEvents() {
    const sandboxBtn = document.getElementById('sandbox-btn');
    const sandboxPanel = document.getElementById('sandbox-panel');
    const closeBtn = document.getElementById('sandbox-close-btn');

    if (sandboxBtn && sandboxPanel) {
      let lastToggleTime = 0;
      const toggleSandbox = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        const now = Date.now();
        if (now - lastToggleTime < 350) return;
        lastToggleTime = now;

        sandboxPanel.classList.toggle('hidden');
        if (!sandboxPanel.classList.contains('hidden')) {
          sandboxPanel.style.right = '8px';
          sandboxPanel.style.left = 'auto';
          sandboxPanel.style.top = '52px';
          if (typeof this.gameState.renderSandboxZombiePool === 'function') {
            this.gameState.renderSandboxZombiePool();
          }
        }
      };

      sandboxBtn.addEventListener('click', toggleSandbox);
      sandboxBtn.addEventListener('touchend', toggleSandbox, { passive: false });
    }

    if (closeBtn && sandboxPanel) {
      closeBtn.addEventListener('click', () => {
        sandboxPanel.classList.add('hidden');
      });
    }

    const toggleZombiePickerBtn = document.getElementById('sb-toggle-zombie-picker');
    const zombiePickerGrid = document.getElementById('sb-zombie-picker-grid');
    if (toggleZombiePickerBtn && zombiePickerGrid) {
      toggleZombiePickerBtn.addEventListener('click', () => {
        const willShow = zombiePickerGrid.classList.contains('hidden');
        zombiePickerGrid.classList.toggle('hidden', !willShow);
        toggleZombiePickerBtn.textContent = willShow ? '✓ Xong' : '✏️ Chọn 8 Z';
        toggleZombiePickerBtn.classList.toggle('sb-btn-active', willShow);
        if (typeof this.gameState.renderSandboxZombiePool === 'function') {
          this.gameState.renderSandboxZombiePool();
        }
      });
    }

    const resetZombieDeckBtn = document.getElementById('sb-reset-zombie-deck');
    if (resetZombieDeckBtn) {
      resetZombieDeckBtn.addEventListener('click', () => {
        if (typeof this.gameState.resetDefaultSandboxZombies === 'function') {
          this.gameState.resetDefaultSandboxZombies();
        }
      });
    }

    // Bảng điều khiển HTML góc phải KÉO THẢ ĐƯỢC (Draggable)
    const headerEl = sandboxPanel ? sandboxPanel.querySelector('.sandbox-header') : null;
    if (sandboxPanel && headerEl) {
      let isDragging = false;
      let startX = 0, startY = 0;
      let initialLeft = 0, initialTop = 0;

      const onStart = (clientX, clientY) => {
        isDragging = true;
        startX = clientX;
        startY = clientY;
        const rect = sandboxPanel.getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;
        sandboxPanel.style.right = 'auto';
        sandboxPanel.style.left = `${initialLeft}px`;
        sandboxPanel.style.top = `${initialTop}px`;
      };

      const onMove = (clientX, clientY) => {
        if (!isDragging) return;
        const dx = clientX - startX;
        const dy = clientY - startY;
        sandboxPanel.style.left = `${Math.max(10, Math.min(window.innerWidth - 260, initialLeft + dx))}px`;
        sandboxPanel.style.top = `${Math.max(10, Math.min(window.innerHeight - 200, initialTop + dy))}px`;
      };

      const onEnd = () => { isDragging = false; };

      headerEl.addEventListener('mousedown', (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        onStart(e.clientX, e.clientY);
      });
      window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
      window.addEventListener('mouseup', onEnd);

      headerEl.addEventListener('touchstart', (e) => {
        if (e.target.tagName.toLowerCase() === 'button') return;
        onStart(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      window.addEventListener('touchmove', (e) => {
        if (isDragging && e.touches) onMove(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: true });
      window.addEventListener('touchend', onEnd);
    }

    // Nút +1000 Sun (yêu cầu bắt buộc) & +100 Sun (test tương thích)
    const add1000Btn = document.getElementById('sb-add-1000-sun');
    if (add1000Btn) {
      add1000Btn.addEventListener('click', () => {
        this.gameState.addSun(1000);
        this.gameState.spawnParticles(100, 30, '#ffd54f', 15);
      });
    }

    const add100Btn = document.getElementById('sb-add-100-sun');
    if (add100Btn) {
      add100Btn.addEventListener('click', () => {
        this.gameState.addSun(100);
        this.gameState.spawnParticles(100, 30, '#ffd54f', 6);
      });
    }

    const maxSunBtn = document.getElementById('sb-max-sun');
    if (maxSunBtn) {
      maxSunBtn.addEventListener('click', () => {
        this.gameState.sun = 9999;
        this.gameState.updateHUD();
        this.gameState.spawnParticles(100, 30, '#ffd54f', 20);
      });
    }

    // Nút Xóa toàn bộ Zombie/Cây/Reset màn
    const clearAllBtn = document.getElementById('sb-clear-all');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', () => {
        this.gameState.clearAllZombies();
        this.gameState.plants = [];
        this.gameState.projectiles = [];
        this.gameState.barriers = [];
        this.gameState.flyingImps = [];
      });
    }

    const clearZombiesBtn = document.getElementById('sb-clear-zombies');
    if (clearZombiesBtn) {
      clearZombiesBtn.addEventListener('click', () => {
        this.gameState.clearAllZombies();
      });
    }

    const resetLevelBtn = document.getElementById('sb-reset-level');
    if (resetLevelBtn) {
      resetLevelBtn.addEventListener('click', () => {
        this.gameState.reset();
      });
    }

    // Nút Toggle x1 / x2 trong Sandbox
    const toggleSpeedBtn = document.getElementById('sb-toggle-speed');
    if (toggleSpeedBtn) {
      toggleSpeedBtn.addEventListener('click', () => {
        this.gameState.toggleSpeed();
      });
    }

    const getSelectedRow = () => {
      const selectEl = document.getElementById('sb-row-select');
      const val = selectEl ? parseInt(selectEl.value, 10) : -1;
      if (val >= 0 && val < CONFIG.ROWS) return val;
      if (this.hoverRow >= 0) return this.hoverRow;
      return Math.floor(Math.random() * CONFIG.ROWS);
    };

    const bindSpawn = (id, type) => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => {
          this.gameState.spawnZombie(type, getSelectedRow());
        });
      }
    };

    bindSpawn('sb-spawn-basic', 'basic');
    bindSpawn('sb-spawn-regular', 'regular');
    bindSpawn('sb-spawn-conehead', 'conehead');
    bindSpawn('sb-spawn-buckethead', 'buckethead');
    bindSpawn('sb-spawn-pole-vaulting', 'pole_vaulting');
    bindSpawn('sb-spawn-gargantuar', 'gargantuar');
    bindSpawn('sb-spawn-tombstone', 'tombstone');
    bindSpawn('sb-spawn-imp', 'imp');
    bindSpawn('sb-spawn-bully', 'jurassic_bully');
    bindSpawn('sb-spawn-skull', 'turquoise_skull');
    bindSpawn('sb-spawn-dragon', 'zombot_dark_dragon');
    bindSpawn('sb-spawn-imp-dragon', 'imp_dragon');
    bindSpawn('sb-spawn-troglobite', 'troglobite');
    bindSpawn('sb-spawn-yeti-imp', 'yeti_imp');
    bindSpawn('sb-spawn-lang-khach', 'lang_khach');
    bindSpawn('sb-spawn-shen', 'shen');
    bindSpawn('sb-spawn-anivia', 'anivia');
    bindSpawn('sb-spawn-balloon', 'balloon');
    bindSpawn('sb-spawn-jetpack', 'jetpack');
    bindSpawn('sb-spawn-thresh', 'thresh');
    bindSpawn('sb-spawn-quan-chua', 'quan_chua');
    bindSpawn('sb-spawn-dragon-hatchling', 'dragon_hatchling');
    bindSpawn('sb-spawn-dragon-adult', 'dragon_adult');
    bindSpawn('sb-spawn-dragon-dark', 'dragon_dark');
    bindSpawn('sb-spawn-dragon-chemtech', 'dragon_chemtech');
    bindSpawn('sb-spawn-dragon-wind', 'dragon_wind');
    bindSpawn('sb-spawn-dragon-water', 'dragon_water');
    bindSpawn('sb-spawn-ancient-dragon', 'ancient_dragon_boss');
    bindSpawn('sb-spawn-azir', 'azir_desert_emperor');
    bindSpawn('sb-spawn-renekton', 'renekton_croc');
    bindSpawn('sb-spawn-nasus', 'nasus_hound');
    bindSpawn('sb-spawn-nosus-thrall', 'nosus_thrall');
    bindSpawn('sb-spawn-nosus-assassin', 'nosus_assassin');
    bindSpawn('sb-spawn-nosus-shieldbearer', 'nosus_shieldbearer');
    bindSpawn('sb-spawn-nosus-hemomancer', 'nosus_hemomancer');
    bindSpawn('sb-spawn-nosus-warlord', 'nosus_warlord');
    bindSpawn('sb-spawn-ionia-zed', 'ionia_zed');
    bindSpawn('sb-spawn-ionia-yone', 'ionia_yone');
    bindSpawn('sb-spawn-ionia-sett', 'ionia_sett');
    bindSpawn('sb-spawn-drowned-sailor', 'drowned_sailor');
    bindSpawn('sb-spawn-anchor-bearer', 'anchor_bearer');
    bindSpawn('sb-spawn-swimming-ghost', 'swimming_ghost');
    bindSpawn('sb-spawn-wanted-captain', 'wanted_captain');
    bindSpawn('sb-spawn-zombot-pyke', 'zombot_pyke');

    const resetCdBtn = document.getElementById('sb-reset-cooldowns');
    if (resetCdBtn) {
      resetCdBtn.addEventListener('click', () => {
        if (typeof this.gameState.toggleSandboxNoCooldown === 'function') {
          this.gameState.toggleSandboxNoCooldown();
        } else {
          this.gameState.resetCooldowns();
        }
      });
    }
  }
}

if (typeof window !== 'undefined') {
  window.CollisionSystem = CollisionSystem;
  window.WaveManager = WaveManager;
  window.InputHandler = InputHandler;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CollisionSystem, WaveManager, InputHandler };
}

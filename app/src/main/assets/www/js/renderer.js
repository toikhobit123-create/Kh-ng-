/**
 * PVZ Tower Defense 2D - Renderer
 * Vẽ toàn bộ sân cỏ 5x9, Cây, Zombie, Đạn, Sun, Máy cắt cỏ, Hiệu ứng
 */

// Polyfill an toàn cho roundRect trên tất cả các phiên bản Android WebView
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function(x, y, w, h, radii) {
    if (!radii) radii = 0;
    let r1 = 0, r2 = 0, r3 = 0, r4 = 0;
    if (typeof radii === 'number') {
      r1 = r2 = r3 = r4 = radii;
    } else if (Array.isArray(radii)) {
      if (radii.length === 1) { r1 = r2 = r3 = r4 = radii[0]; }
      else if (radii.length === 2) { r1 = r3 = radii[0]; r2 = r4 = radii[1]; }
      else if (radii.length === 4) { [r1, r2, r3, r4] = radii; }
    }
    this.beginPath();
    this.moveTo(x + r1, y);
    this.lineTo(x + w - r2, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r2);
    this.lineTo(x + w, y + h - r3);
    this.quadraticCurveTo(x + w, y + h, x + w - r3, y + h);
    this.lineTo(x + r4, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r4);
    this.lineTo(x, y + r1);
    this.quadraticCurveTo(x, y, x + r1, y);
    this.closePath();
    return this;
  };
}

class GameRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this._bgCache = null;
    this._frameTimeSec = 0;
  }

  getFrameTimeSec() {
    return this._frameTimeSec || (typeof performance !== 'undefined' ? performance.now() * 0.001 : Date.now() * 0.001);
  }

  drawCachedBg(ctx, cacheKey, w, h, drawStaticFn) {
    if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
      drawStaticFn(ctx);
      return false;
    }
    if (!this._bgCache || this._bgCache.key !== cacheKey || this._bgCache.w !== w || this._bgCache.h !== h) {
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const offCtx = off.getContext('2d');
      if (offCtx) {
        drawStaticFn(offCtx);
        this._bgCache = { key: cacheKey, w, h, canvas: off };
      } else {
        drawStaticFn(ctx);
        return false;
      }
    }
    ctx.drawImage(this._bgCache.canvas, 0, 0);
    return true;
  }

  drawHitFlashOverlay(ctx, rx, ry, yOffset = 0, tint = 'rgba(255, 255, 255, 0.42)') {
    ctx.save();
    ctx.fillStyle = tint;
    ctx.beginPath();
    ctx.ellipse(0, yOffset, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();
  }

  render(gameState, inputHandler) {
    const ctx = this.ctx;
    this._frameTimeSec = (typeof performance !== 'undefined' ? performance.now() : Date.now()) * 0.001;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Áp dụng rung lắc màn hình cho lớp thế giới (giữ HUD phía trên ổn định)
    const shakeX = gameState.screenShakeX || 0;
    const shakeY = gameState.screenShakeY || 0;
    const hasShake = Math.abs(shakeX) > 0.05 || Math.abs(shakeY) > 0.05;
    if (hasShake) {
      ctx.save();
      ctx.translate(shakeX, shakeY);
    }

    // 1. Vẽ nền sân cỏ và bối cảnh 5x9 (Sân Long Tộc cho Map Special 11)
    this.drawLawn(ctx, gameState);

    // 1.5. Vẽ các ô bị thiêu rụi thành đất cháy trong 10s (Scorched Tiles)
    if (gameState.scorchedTiles && gameState.scorchedTiles.length > 0) {
      this.drawScorchedTiles(ctx, gameState.scorchedTiles);
    }

    // 1.7. Vẽ Bẫy Hoa Sen của Jhinplant trên mặt sân
    if (gameState.lotusTraps && gameState.lotusTraps.length > 0) {
      this.drawLotusTraps(ctx, gameState.lotusTraps);
    }

    // 1.75. Vẽ Bình Thuốc Hóa Kỹ của Rồng Hóa Kỹ
    if (gameState.chemPotions && gameState.chemPotions.length > 0) {
      this.drawChemPotions(ctx, gameState.chemPotions);
    }

    // 1.8. Vẽ Vùng Lão Hóa 2×2 của Thần Khuyển (Map 13)
    if (gameState.witherZones && gameState.witherZones.length > 0) {
      this.drawWitherZones(ctx, gameState.witherZones);
    }

    // 1.9. Cảnh báo chiêu thức Zombot Đồ Tể Pyke (Lao Móc Q, Lướt Sóng E, Dấu Chữ X R)
    if (gameState.isBloodharborMode) {
      this.drawPykeTelegraphs(ctx, gameState);
    }

    // 2. Vẽ ô đánh dấu hover / preview trồng cây
    this.drawPlacementPreview(ctx, gameState, inputHandler);

    // 2.5. Vẽ vùng phạm vi tấn công (Ground Range Highlight) để nhìn rõ tầm đánh của cây
    if (gameState.attackEffects && gameState.attackEffects.length > 0) {
      this.drawAttackRangeZones(ctx, gameState.attackEffects);
    }

    // 3. Vẽ máy cắt cỏ (Lawnmowers)
    this.drawLawnmowers(ctx, gameState.lawnmowers);

    // 4. Vẽ hàng rào toàn ảnh (Holographic Barriers)
    if (gameState.barriers && gameState.barriers.length > 0) {
      this.drawBarriers(ctx, gameState.barriers);
    }

    // 5. Vẽ Cây (Plants)
    for (const plant of gameState.plants) {
      if (plant.alive) {
        this.drawPlant(ctx, plant, gameState);
      }
    }

    // 6. Vẽ tia sét (Lightning Arcs)
    if (gameState.lightningArcs && gameState.lightningArcs.length > 0) {
      this.drawLightningArcs(ctx, gameState.lightningArcs);
    }

    // 7. Vẽ đám mây khí choáng (Gas Clouds)
    if (gameState.gasClouds && gameState.gasClouds.length > 0) {
      this.drawGasClouds(ctx, gameState.gasClouds);
    }

    // 8. Vẽ Zombie (sắp xếp theo y để hiển thị đúng độ sâu lớp; Sett đang bay R được ưu tiên nổi lên trên)
    const sortedZombies = [...gameState.zombies].sort((a, b) => (a.y + (a.rAnimActive ? 1000 : 0)) - (b.y + (b.rAnimActive ? 1000 : 0)));
    for (const zombie of sortedZombies) {
      this.drawZombie(ctx, zombie);
    }

    // 8.3. Vẽ hơi thở lửa (Fire Breath) & cảnh báo của Zombot Dark Dragon
    const bossDragon = gameState.zombies.find(z => z.alive && z.type === 'zombot_dark_dragon');
    if (bossDragon && (bossDragon.isWindupBreath || bossDragon.isBreathingFire)) {
      this.drawFireBreath(ctx, bossDragon);
    }

    // 8.4. Vẽ hiệu ứng đòn đánh phạm vi phía trước (Ngọn lửa 3 hàng, Sóng đấm, Cắn, Nổ...)
    if (gameState.attackEffects && gameState.attackEffects.length > 0) {
      this.drawAttackEffectVfx(ctx, gameState.attackEffects);
    }

    // 8.5. Vẽ Imp đang bay trên không (FlyingImps)
    if (gameState.flyingImps && gameState.flyingImps.length > 0) {
      this.drawFlyingImps(ctx, gameState.flyingImps);
    }

    // 8.8. Vẽ tia Laser của Turquoise Skull Zombie
    if (gameState.laserBeams && gameState.laserBeams.length > 0) {
      this.drawLaserBeams(ctx, gameState.laserBeams);
    }

    // 9. Vẽ Đạn (Projectiles)
    for (const proj of gameState.projectiles) {
      if (proj.alive) {
        this.drawProjectile(ctx, proj);
      }
    }

    // 9.5. Vẽ Cầu lửa Zombot Dark Dragon (Lobbed Fireballs)
    if (gameState.fireballs && gameState.fireballs.length > 0) {
      this.drawFireballs(ctx, gameState.fireballs);
    }

    // 9.6. Vẽ Cột băng sắc nhọn của Anivia Phượng Hoàng Băng
    if (gameState.aniviaIceSpikes && gameState.aniviaIceSpikes.length > 0) {
      this.drawAniviaIceSpikes(ctx, gameState.aniviaIceSpikes);
    }

    // 10. Vẽ Mặt trời (Suns)
    for (const sun of gameState.suns) {
      if (sun.alive) {
        this.drawSun(ctx, sun);
      }
    }

    // 11. Vẽ Hiệu ứng hạt (Particles - batched single save/restore)
    if (gameState.particles && gameState.particles.length > 0) {
      this.drawParticles(ctx, gameState.particles);
    }

    // 12. Vẽ Chữ nổi (Floating Texts như SPUDOW! 💥)
    if (gameState.floatingTexts) {
      for (const ft of gameState.floatingTexts) {
        if (ft.alive && ft.draw) {
          ft.draw(ctx);
        }
      }
    }

    // 12.8. Hiệu ứng Ngưng Đọng Thời Gian (Galio Skill 2)
    if (gameState.timeStopTimer && gameState.timeStopTimer > 0) {
      ctx.save();
      const pulse = Math.min(1, gameState.timeStopTimer / 0.35);
      ctx.fillStyle = `rgba(0, 229, 255, ${0.12 * pulse})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.strokeStyle = `rgba(255, 215, 64, ${0.45 * pulse})`;
      ctx.lineWidth = 4;
      ctx.strokeRect(2, 2, this.canvas.width - 4, this.canvas.height - 4);
      ctx.restore();
    }

    if (hasShake) {
      ctx.restore();
    }

    // 13. UI Thanh Máu Trùm Persistent (Đỉnh Canvas) hoặc Banner Wave thông thường
    const isBossHudLevel = (gameState.currentLevel === 6 || gameState.currentLevel === 12 || gameState.currentLevel === 13 || gameState.currentLevel === 20) ||
      (gameState.zombies && gameState.zombies.some(z => z.alive && (z.type === 'zombot_dark_dragon' || z.type === 'ancient_dragon_boss' || z.type === 'azir_desert_emperor' || z.type === 'zombot_pyke')));

    if (isBossHudLevel && !gameState.isSandbox) {
      this.drawBossHealthBar(ctx, gameState);
    } else {
      this.drawWaveBanner(ctx, gameState);
    }

    // 14. Vẽ Băng chuyền (Conveyor Belt) nếu ở chế độ Conveyor
    if (gameState.gameMode === 'conveyor' && gameState.conveyorSystem) {
      gameState.conveyorSystem.draw(ctx, inputHandler ? inputHandler.pointerX : 0, inputHandler ? inputHandler.pointerY : 0);
    }
  }

  drawWaveBanner(ctx, gameState) {
    if (!gameState || !gameState.waveManager || gameState.isSandbox) return;
    const wm = gameState.waveManager;
    const status = wm.getStatusText ? wm.getStatusText(gameState) : null;
    if (!status) return;

    ctx.save();
    const cx = CONFIG.CANVAS_WIDTH / 2;
    const cy = 34;

    ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const text = `${status.title}  —  ${status.sub}`;
    const textWidth = ctx.measureText(text).width;
    const boxW = Math.max(340, textWidth + 30);
    const boxH = 30;

    // Nền bảng ma quái huyền bí với viền phát sáng sắc nét, không dùng shadowBlur gây giật lag
    ctx.fillStyle = 'rgba(12, 16, 24, 0.92)';
    ctx.strokeStyle = status.color || '#4fc3f7';
    ctx.lineWidth = 1.8;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(cx - boxW / 2, cy - boxH / 2, boxW, boxH, 6);
    } else {
      ctx.rect(cx - boxW / 2, cy - boxH / 2, boxW, boxH);
    }
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = status.color || '#ffffff';
    ctx.fillText(text, cx, cy);

    ctx.restore();
  }

  // ==========================================================================
  // THANH MÁU TRÙM PERSISTENT DYNAMIC Ở ĐỈNH CANVAS (ZOMBOT DARK DRAGON 27,000 HP)
  // Cập nhật thời gian thực, có hiệu ứng thanh bóng ma tổn thương (Ghost bar)
  // ==========================================================================
  drawBossHealthBar(ctx, gameState) {
    if (!gameState) return;
    if (typeof document !== 'undefined' && document.body && document.body.classList && document.body.classList.contains('native-compose-hud')) {
      return;
    }
    const isBloodharborMap = gameState.currentLevel === 20 ||
      (gameState.zombies && gameState.zombies.some(z => z.type === 'zombot_pyke'));
    const isDesertMap = !isBloodharborMap && (gameState.currentLevel === 13 ||
      (gameState.zombies && gameState.zombies.some(z => z.type === 'azir_desert_emperor')));
    const isAncientMap = !isBloodharborMap && !isDesertMap && (gameState.currentLevel === 12 ||
      (gameState.zombies && gameState.zombies.some(z => z.type === 'ancient_dragon_boss')));
    const targetBossType = isBloodharborMap
      ? 'zombot_pyke'
      : (isDesertMap ? 'azir_desert_emperor' : (isAncientMap ? 'ancient_dragon_boss' : 'zombot_dark_dragon'));
    const boss = (gameState.zombies && gameState.zombies.length > 0)
      ? gameState.zombies.find(z => z.type === targetBossType)
      : null;
    const maxHp = isBloodharborMap ? 15000 : (isDesertMap ? 20000 : (isAncientMap ? 10000 : 27000));
    const hasSpawnedYet = isBloodharborMap
      ? !gameState.isSetupPhase
      : (!gameState.waveManager || gameState.waveManager.state !== 'initial_delay');
    const currentHp = boss ? Math.max(0, boss.hp) : ((gameState.isVictory || (hasSpawnedYet && !isBloodharborMap)) ? 0 : maxHp);
    const shieldHp = (boss && boss.bossAllShieldHp > 0) ? Math.ceil(boss.bossAllShieldHp) : 0;
    const hpRatio = Math.max(0, Math.min(1.0, currentHp / maxHp));

    // Hiệu ứng thanh bóng ma tổn thương (Trailing ghost damage bar)
    if (this.bossTrailingHp === undefined || this.bossTrailingHp > maxHp || this.bossTrailingHp < 0) {
      this.bossTrailingHp = currentHp;
    }
    if (this.bossTrailingHp > currentHp) {
      this.bossTrailingHp -= Math.max(25, (this.bossTrailingHp - currentHp) * 0.08);
      if (this.bossTrailingHp < currentHp) this.bossTrailingHp = currentHp;
    } else if (this.bossTrailingHp < currentHp) {
      this.bossTrailingHp = currentHp;
    }
    const trailingRatio = Math.max(0, Math.min(1.0, this.bossTrailingHp / maxHp));

    ctx.save();

    const isConveyorBoss = (gameState.currentLevel === 6 || gameState.gameMode === 'conveyor') && !isDesertMap && !isAncientMap && !isBloodharborMap;
    const barW = isConveyorBoss ? 300 : 540;
    const barH = isConveyorBoss ? 20 : 26;
    const cx = isConveyorBoss ? 500 : (CONFIG.CANVAS_WIDTH / 2);
    const x = cx - barW / 2;
    const y = 8;
    const r = isConveyorBoss ? 5 : 6;

    // 1. Khung nền kim loại phát sáng
    ctx.fillStyle = isBloodharborMap
      ? 'rgba(7, 22, 28, 0.96)'
      : (isDesertMap ? 'rgba(26, 17, 6, 0.95)' : 'rgba(10, 12, 18, 0.95)');
    ctx.strokeStyle = isBloodharborMap
      ? ((boss && (boss.pykeStuckTimer > 0 || boss.pykeVulnerableTimer > 0)) ? '#ffd54f' : (hpRatio <= 0.334 ? '#ff1744' : '#00e5ff'))
      : (isDesertMap
        ? ((hpRatio <= 0.35 && currentHp > 0) ? '#ff6d00' : '#ffca28')
        : ((hpRatio < 0.30 && currentHp > 0) ? '#ff1744' : '#ffd700'));
    ctx.lineWidth = isConveyorBoss ? 1.6 : 2.0;

    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x, y, barW, barH, r);
    } else {
      ctx.rect(x, y, barW, barH);
    }
    ctx.fill();
    ctx.stroke();

    // 2. Lòng thanh máu (Inner track)
    const pad = isConveyorBoss ? 2.5 : 3;
    const innerX = x + pad;
    const innerY = y + pad;
    const innerW = barW - pad * 2;
    const innerH = barH - pad * 2;

    ctx.fillStyle = isBloodharborMap ? '#081820' : (isDesertMap ? '#1f1306' : '#140d12');
    ctx.fillRect(innerX, innerY, innerW, innerH);

    // 3. Thanh bóng ma tổn thương (Trailing ghost damage bar)
    if (trailingRatio > hpRatio) {
      const trailWidth = innerW * trailingRatio;
      ctx.fillStyle = isBloodharborMap ? '#4dd0e1' : (isDesertMap ? '#ffe082' : '#ffb300');
      ctx.fillRect(innerX, innerY, trailWidth, innerH);
    }

    // 4. Thanh máu thực tế (Real-time dynamic fill bar)
    if (hpRatio > 0) {
      const fillWidth = innerW * hpRatio;
      const grad = ctx.createLinearGradient(innerX, innerY, innerX + fillWidth, innerY + innerH);

      if (isBloodharborMap) {
        if (hpRatio > 0.667) {
          grad.addColorStop(0, '#00838f');
          grad.addColorStop(1, '#00e5ff');
        } else if (hpRatio > 0.334) {
          grad.addColorStop(0, '#ef6c00');
          grad.addColorStop(1, '#26c6da');
        } else {
          grad.addColorStop(0, '#b71c1c');
          grad.addColorStop(1, '#ff1744');
        }
      } else if (isDesertMap) {
        if (hpRatio > 0.75) {
          grad.addColorStop(0, '#ffb300');
          grad.addColorStop(1, '#ffe082');
        } else if (hpRatio > 0.35) {
          grad.addColorStop(0, '#f57c00');
          grad.addColorStop(1, '#ffca28');
        } else {
          grad.addColorStop(0, '#d84315');
          grad.addColorStop(1, '#ff9100');
        }
      } else if (hpRatio > 0.65) {
        grad.addColorStop(0, '#00e676');
        grad.addColorStop(1, '#76ff03');
      } else if (hpRatio >= 0.30) {
        grad.addColorStop(0, '#ffa000');
        grad.addColorStop(1, '#ff3d00');
      } else {
        grad.addColorStop(0, '#b71c1c');
        grad.addColorStop(1, '#ff1744');
      }

      ctx.fillStyle = grad;
      ctx.fillRect(innerX, innerY, fillWidth, innerH);

      // Hiệu ứng bóng sáng bề mặt thủy tinh (Gloss highlight)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.fillRect(innerX, innerY, fillWidth, innerH / 2);
    }

    // 5. Vạch phân mốc giai đoạn
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    const m1 = isBloodharborMap ? (10000 / 15000) : (isDesertMap ? 0.75 : 0.65);
    const m2 = isBloodharborMap ? (5000 / 15000) : (isDesertMap ? 0.35 : 0.30);
    ctx.fillRect(innerX + innerW * m1 - 1, innerY, 2, innerH);
    ctx.fillRect(innerX + innerW * m2 - 1, innerY, 2, innerH);

    // 6. Huy hiệu bên trái thanh máu
    ctx.font = isConveyorBoss ? '13px sans-serif' : '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(isBloodharborMap ? '🪝' : (isDesertMap ? '🦅' : '🐲'), x - (isConveyorBoss ? 12 : 14), y + barH / 2);

    // 7. Huy hiệu trạng thái / Giai đoạn
    let phaseText = '';
    if (isBloodharborMap) {
      if (gameState.isSetupPhase) {
        phaseText = '⏳ DÀN TRẬN · KÉO CÒI ĐỂ BẮT ĐẦU';
      } else if (currentHp <= 0 || gameState.isVictory) {
        phaseText = 'ĐÃ HẠ GỤC!';
      } else if (boss && (boss.pykeStuckTimer > 0 || boss.pykeVulnerableTimer > 0)) {
        const t = Math.max(boss.pykeStuckTimer || 0, boss.pykeVulnerableTimer || 0);
        phaseText = `💥 BỊ KẸT · ×2 DMG (${t.toFixed(1)}s)`;
      } else if (currentHp > 10000) {
        phaseText = 'P1: THĂM DÒ (8s/chiêu)';
      } else if (currentHp > 5000) {
        phaseText = 'P2: THỦY TRIỀU DÂNG (NGẬP CỘT 6)';
      } else {
        phaseText = 'P3: HUYẾT CẢNG CUỒNG NỘ! 🔥';
      }
    } else if (!boss && !gameState.isVictory && !hasSpawnedYet) {
      phaseText = isConveyorBoss ? 'SẮP RA' : '⏳ ĐANG GIÁNG LÂM...';
    } else if (isDesertMap) {
      if (currentHp <= 0) {
        phaseText = 'DỌN SẠCH ĐỘI QUÂN CÁT!';
      } else if (currentHp <= 7000) {
        phaseText = 'GĐ 3: CÁ SẤU & THẦN KHUYỂN! 🔥';
      } else if (currentHp <= 15000) {
        phaseText = 'GĐ 2: BÃO CÁT & QUAN TÀI 🌪️';
      } else {
        phaseText = 'GĐ 1: LÍNH CÁT TRỖI DẬY ☀️';
      }
    } else if (isAncientMap) {
      if (currentHp <= 0) {
        phaseText = 'DỌN SẠCH QUÂN ĐỊCH!';
      } else if (shieldHp > 0) {
        phaseText = `🛡️ KHIÊN ${shieldHp.toLocaleString()}`;
      } else if (currentHp <= 100) {
        phaseText = 'HUYẾT CHIẾN CUỐI! 🔥';
      } else {
        phaseText = '7 TUYỆT KỸ LONG VƯƠNG';
      }
    } else if (hpRatio > 0.65) {
      phaseText = isConveyorBoss ? 'GĐ 1' : 'GĐ 1: GẦM THẢ LÍNH';
    } else if (hpRatio >= 0.30) {
      phaseText = isConveyorBoss ? 'GĐ 2' : 'GĐ 2: CẦU LỬA & IMP';
    } else if (currentHp > 0) {
      phaseText = isConveyorBoss ? 'GĐ 3 🔥' : 'GĐ 3: CUỒNG BỘ! 🔥';
    } else {
      phaseText = 'ĐÃ HẠ GỤC!';
    }

    // 8. Chữ hiển thị thông số máu thời gian thực
    ctx.font = isConveyorBoss
      ? 'bold 10.5px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      : 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const bossTitle = isBloodharborMap
      ? 'ZOMBOT ĐỒ TỂ · BẾN CẢNG TỬ THẦN'
      : (isDesertMap
        ? 'HOÀNG ĐẾ SA MẠC AZIR'
        : (isAncientMap ? 'BOSS RỒNG NGÀN TUỔI' : (isConveyorBoss ? 'RỒNG ĐEN' : 'ZOMBOT DARK DRAGON')));
    let hpLabel = '';
    if (currentHp <= 0 || gameState.isVictory) {
      hpLabel = isConveyorBoss
        ? `💀 ${bossTitle} HẠ GỤC! (0/${maxHp.toLocaleString()})`
        : `💀 ${bossTitle} ĐÃ BỊ HẠ GỤC! (0 / ${maxHp.toLocaleString()} HP) [${phaseText}]`;
    } else {
      hpLabel = isConveyorBoss
        ? `${bossTitle} · ${Math.ceil(currentHp).toLocaleString()}/${maxHp.toLocaleString()} (${(hpRatio * 100).toFixed(0)}%) [${phaseText}]`
        : `${bossTitle}  ·  ${Math.ceil(currentHp).toLocaleString()} / ${maxHp.toLocaleString()} HP  (${(hpRatio * 100).toFixed(1)}%)  [${phaseText}]`;
    }

    ctx.strokeStyle = '#000000';
    ctx.lineWidth = isConveyorBoss ? 3.0 : 3.5;
    ctx.strokeText(hpLabel, cx, y + barH / 2);

    ctx.fillStyle = (hpRatio <= m2 && currentHp > 0) ? '#ffea00' : '#ffffff';
    ctx.fillText(hpLabel, cx, y + barH / 2);

    ctx.restore();
  }

  drawLawn(ctx, gameState = null) {
    const lvl = gameState ? gameState.currentLevel : 0;
    const lvlCfg = (typeof LEVEL_CONFIG !== 'undefined' && LEVEL_CONFIG[lvl]) ? LEVEL_CONFIG[lvl] : null;
    const isBloodharborRealm = !!(gameState && !gameState.isSandbox && (lvl === 20 || gameState.isBloodharborMode || (lvlCfg && lvlCfg.theme === 'bloodharbor')));
    if (isBloodharborRealm) {
      this.drawBloodharborLawn(ctx, gameState);
      return;
    }
    const isIoniaRealm = !!(gameState && !gameState.isSandbox && ((lvl >= 17 && lvl <= 19) || (lvlCfg && lvlCfg.theme === 'ionia')));
    if (isIoniaRealm) {
      this.drawIoniaLawn(ctx, gameState);
      return;
    }
    const isNosusRealm = !!(gameState && !gameState.isSandbox && ((lvl >= 14 && lvl <= 16) || (lvlCfg && lvlCfg.theme === 'nosus')));
    if (isNosusRealm) {
      this.drawNosusLawn(ctx, gameState);
      return;
    }
    const isDesertRealm = !!(gameState && !gameState.isSandbox && (lvl === 13 || (lvlCfg && lvlCfg.theme === 'desert')));
    if (isDesertRealm) {
      this.drawDesertLawn(ctx, gameState);
      return;
    }
    const isDragonRealm = !!(gameState && !gameState.isSandbox && (lvl === 11 || (lvlCfg && lvlCfg.isSpecial)));
    if (isDragonRealm) {
      this.drawDragonRealmLawn(ctx, gameState);
      return;
    }

    const w = this.canvas.width;
    const h = this.canvas.height;
    this.drawCachedBg(ctx, 'standard', w, h, (bCtx) => {
      // ==========================================
      // CHIẾN TRƯỜNG HUYỀN BÍ DƯỚI ÁNH TRĂNG (MOONLIT HORROR GRAVEYARD LAWN)
      // Sáng rõ, sắc nét, tương phản cao, tràn ngập ánh trăng ma quái
      // ==========================================

      // 1. Khu vực thềm đá hầm mộ cổ bên trái (Patio)
      const patioWidth = CONFIG.GRID_OFFSET_X;
      bCtx.fillStyle = '#2c3342';
      bCtx.fillRect(0, 0, patioWidth, h);

      // Phiến đá hầm mộ granite ánh trăng nứt nẻ
      bCtx.strokeStyle = '#47536b';
      bCtx.lineWidth = 2;
      for (let y = 0; y < h; y += 42) {
        bCtx.beginPath();
        bCtx.moveTo(0, y);
        bCtx.lineTo(patioWidth, y);
        bCtx.stroke();

        bCtx.fillStyle = '#374154';
        bCtx.fillRect(4, y + 3, patioWidth - 14, 18);
      }

      // Mép thềm đá viền thép đen & rãnh huyết ngọc rỉ dọc mép
      bCtx.fillStyle = '#1c202b';
      bCtx.fillRect(patioWidth - 10, 0, 10, h);
      bCtx.fillStyle = '#b71c1c';
      bCtx.fillRect(patioWidth - 3, 0, 3, h);

      // 2. Mép nghĩa địa & Bia mộ cổ phát sáng bên phải (Right Graveyard Zone)
      const lawnEndX = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
      bCtx.fillStyle = '#262936';
      bCtx.fillRect(lawnEndX, 0, w - lawnEndX, h);

      bCtx.fillStyle = '#343f3b';
      bCtx.fillRect(lawnEndX, 0, 16, h);
      bCtx.strokeStyle = '#52665e';
      bCtx.lineWidth = 1.5;
      bCtx.strokeRect(lawnEndX, 0, 16, h);

      // Các bia mộ cổ bằng đá granite phát quang ánh lân tinh xanh (Tombstones)
      for (let r = 0; r < CONFIG.ROWS; r++) {
        const graveY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + 20;
        const graveX = lawnEndX + 18;

        bCtx.save();
        bCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        bCtx.beginPath();
        bCtx.ellipse(graveX + 10, graveY + 40, 16, 6, 0, 0, Math.PI * 2);
        bCtx.fill();

        bCtx.fillStyle = '#546e7a';
        bCtx.beginPath();
        bCtx.roundRect(graveX, graveY, 20, 38, [10, 10, 0, 0]);
        bCtx.fill();
        bCtx.strokeStyle = '#90a4ae';
        bCtx.lineWidth = 1.8;
        bCtx.stroke();

        bCtx.strokeStyle = '#cfd8dc';
        bCtx.lineWidth = 2;
        bCtx.beginPath();
        bCtx.moveTo(graveX + 10, graveY + 7); bCtx.lineTo(graveX + 10, graveY + 22);
        bCtx.moveTo(graveX + 4, graveY + 12); bCtx.lineTo(graveX + 16, graveY + 12);
        bCtx.stroke();

        bCtx.fillStyle = '#00e5ff';
        bCtx.beginPath();
        bCtx.arc(graveX + 10, graveY + 28, 2.5, 0, Math.PI * 2);
        bCtx.fill();

        bCtx.fillStyle = '#ff5252';
        bCtx.beginPath();
        bCtx.arc(graveX + 10, graveY - 3, 3, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.restore();
      }

      // 3. Lưới đất bãi tha ma 5 hàng x 9 cột
      const lawnTile1 = '#2d4b3e';
      const lawnTile2 = '#233d32';

      for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          const x = CONFIG.GRID_OFFSET_X + c * CONFIG.CELL_WIDTH;
          const y = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT;
          const isAlt = (r + c) % 2 === 0;

          bCtx.fillStyle = isAlt ? lawnTile1 : lawnTile2;
          bCtx.fillRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          bCtx.strokeStyle = 'rgba(128, 222, 234, 0.3)';
          bCtx.lineWidth = 1.2;
          bCtx.strokeRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          bCtx.fillStyle = isAlt ? '#3e6654' : '#2f4f41';
          bCtx.beginPath();
          bCtx.arc(x + 18, y + 24, 2, 0, Math.PI * 2);
          bCtx.arc(x + 55, y + 60, 2.5, 0, Math.PI * 2);
          bCtx.fill();

          if ((r * 3 + c * 5) % 4 === 0) {
            bCtx.strokeStyle = isAlt ? 'rgba(0, 229, 255, 0.4)' : 'rgba(224, 64, 251, 0.4)';
            bCtx.lineWidth = 1.2;
            bCtx.beginPath();
            bCtx.moveTo(x + 12, y + 16);
            bCtx.lineTo(x + 36, y + 42);
            bCtx.lineTo(x + 68, y + 36);
            bCtx.stroke();
          }

          if ((r * 2 + c * 3) % 5 === 0) {
            bCtx.strokeStyle = '#1a2420';
            bCtx.lineWidth = 2;
            bCtx.beginPath();
            bCtx.moveTo(x + 6, y + 70);
            bCtx.quadraticCurveTo(x + 28, y + 54, x + 48, y + 68);
            bCtx.stroke();
          }
        }
      }

      // 4. Vầng Trăng Tròn Huyền Bí Trên Bầu Trời
      bCtx.save();
      const moonX = 640;
      const moonY = 32;

      const moonHalo = bCtx.createRadialGradient(moonX, moonY, 15, moonX, moonY, 95);
      moonHalo.addColorStop(0, 'rgba(224, 247, 250, 0.45)');
      moonHalo.addColorStop(0.4, 'rgba(128, 222, 234, 0.22)');
      moonHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      bCtx.fillStyle = moonHalo;
      bCtx.beginPath();
      bCtx.arc(moonX, moonY, 95, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.fillStyle = '#f0fcff';
      bCtx.beginPath();
      bCtx.arc(moonX, moonY, 26, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.fillStyle = '#d0edf2';
      bCtx.beginPath();
      bCtx.arc(moonX - 8, moonY - 6, 5, 0, Math.PI * 2);
      bCtx.arc(moonX + 6, moonY + 7, 7, 0, Math.PI * 2);
      bCtx.arc(moonX + 11, moonY - 8, 4, 0, Math.PI * 2);
      bCtx.fill();

      const yardLight = bCtx.createRadialGradient(480, 160, 50, 480, 240, 500);
      yardLight.addColorStop(0, 'rgba(224, 247, 250, 0.14)');
      yardLight.addColorStop(0.7, 'rgba(128, 222, 234, 0.06)');
      yardLight.addColorStop(1, 'rgba(0, 0, 0, 0)');
      bCtx.fillStyle = yardLight;
      bCtx.fillRect(CONFIG.GRID_OFFSET_X, CONFIG.GRID_OFFSET_Y, CONFIG.COLS * CONFIG.CELL_WIDTH, CONFIG.ROWS * CONFIG.CELL_HEIGHT);

      // 5. Rừng gai đen gothic trên nóc
      bCtx.fillStyle = '#1e222e';
      for (let i = 0; i < 16; i++) {
        const bx = 30 + i * 60;
        const by = (i % 2 === 0) ? 14 : 22;
        bCtx.beginPath();
        bCtx.arc(bx, by, 30, 0, Math.PI * 2);
        bCtx.fill();
      }
      bCtx.strokeStyle = '#3e475d';
      bCtx.lineWidth = 2.5;
      for (let i = 0; i < 12; i++) {
        const gx = 60 + i * 75;
        bCtx.beginPath();
        bCtx.moveTo(gx, 0);
        bCtx.lineTo(gx - 8, 26);
        bCtx.lineTo(gx + 4, 36);
        bCtx.stroke();
      }

      // 6. Dải sương mù lân tinh mỏng ở chân sân
      const gradMist = bCtx.createLinearGradient(0, h - 40, 0, h);
      gradMist.addColorStop(0, 'rgba(0, 0, 0, 0)');
      gradMist.addColorStop(1, 'rgba(128, 222, 234, 0.18)');
      bCtx.fillStyle = gradMist;
      bCtx.fillRect(0, h - 40, w, 40);

      bCtx.restore();
    });
  }

  // ==========================================
  // ĐẤU TRƯỜNG VƯƠNG QUỐC LONG TỘC (VOLCANIC DRAGON REALM - MAP SPECIAL 11)
  // Cache phần tĩnh (trời, núi, sân đá, trụ đá) và chỉ vẽ lửa + tàn lửa động
  // ==========================================
  drawDragonRealmLawn(ctx, gameState) {
    const t = this.getFrameTimeSec();
    const w = this.canvas.width;
    const h = this.canvas.height;
    const patioWidth = CONFIG.GRID_OFFSET_X;
    const lawnEndX = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;

    this.drawCachedBg(ctx, 'dragon', w, h, (bCtx) => {
      const skyGrad = bCtx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#16060b');
      skyGrad.addColorStop(0.22, '#2d0c14');
      skyGrad.addColorStop(0.65, '#200b10');
      skyGrad.addColorStop(1, '#120609');
      bCtx.fillStyle = skyGrad;
      bCtx.fillRect(0, 0, w, h);

      const patioGrad = bCtx.createLinearGradient(0, 0, patioWidth, 0);
      patioGrad.addColorStop(0, '#221118');
      patioGrad.addColorStop(0.85, '#311920');
      patioGrad.addColorStop(1, '#1a0c10');
      bCtx.fillStyle = patioGrad;
      bCtx.fillRect(0, 0, patioWidth, h);

      for (let y = CONFIG.GRID_OFFSET_Y; y < CONFIG.GRID_OFFSET_Y + CONFIG.ROWS * CONFIG.CELL_HEIGHT; y += CONFIG.CELL_HEIGHT) {
        bCtx.fillStyle = '#3b1f27';
        bCtx.fillRect(6, y + 6, patioWidth - 20, CONFIG.CELL_HEIGHT - 12);
        bCtx.strokeStyle = '#6d3b2e';
        bCtx.lineWidth = 1.5;
        bCtx.strokeRect(6, y + 6, patioWidth - 20, CONFIG.CELL_HEIGHT - 12);

        bCtx.fillStyle = 'rgba(255, 160, 0, 0.35)';
        bCtx.fillRect(patioWidth - 22, y + CONFIG.CELL_HEIGHT / 2 - 4, 8, 8);
      }

      bCtx.fillStyle = '#180a0e';
      bCtx.fillRect(patioWidth - 10, 0, 10, h);

      const cliffGrad = bCtx.createLinearGradient(lawnEndX, 0, w, 0);
      cliffGrad.addColorStop(0, '#220e12');
      cliffGrad.addColorStop(0.5, '#19090d');
      cliffGrad.addColorStop(1, '#110508');
      bCtx.fillStyle = cliffGrad;
      bCtx.fillRect(lawnEndX, 0, w - lawnEndX, h);

      bCtx.fillStyle = '#2e1519';
      bCtx.fillRect(lawnEndX, 0, 15, h);
      bCtx.strokeStyle = '#ff6d00';
      bCtx.lineWidth = 1.6;
      bCtx.beginPath();
      bCtx.moveTo(lawnEndX + 2, 0);
      bCtx.lineTo(lawnEndX + 2, h);
      bCtx.stroke();

      for (let r = 0; r < CONFIG.ROWS; r++) {
        const pillarY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + 22;
        const pillarX = lawnEndX + 24;

        bCtx.fillStyle = 'rgba(255, 87, 34, 0.25)';
        bCtx.beginPath();
        bCtx.ellipse(pillarX + 12, pillarY + 42, 20, 7, 0, 0, Math.PI * 2);
        bCtx.fill();

        bCtx.fillStyle = '#331a20';
        bCtx.strokeStyle = '#793b2d';
        bCtx.lineWidth = 1.6;
        bCtx.beginPath();
        bCtx.moveTo(pillarX, pillarY + 40);
        bCtx.lineTo(pillarX + 3, pillarY + 8);
        bCtx.lineTo(pillarX + 12, pillarY);
        bCtx.lineTo(pillarX + 21, pillarY + 8);
        bCtx.lineTo(pillarX + 24, pillarY + 40);
        bCtx.closePath();
        bCtx.fill();
        bCtx.stroke();

        bCtx.strokeStyle = '#ffab40';
        bCtx.lineWidth = 1.4;
        bCtx.beginPath();
        bCtx.moveTo(pillarX + 8, pillarY + 18);
        bCtx.lineTo(pillarX + 12, pillarY + 13);
        bCtx.lineTo(pillarX + 16, pillarY + 18);
        bCtx.lineTo(pillarX + 12, pillarY + 26);
        bCtx.closePath();
        bCtx.stroke();
      }

      const dragonTile1 = '#382026';
      const dragonTile2 = '#2b171d';

      for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          const x = CONFIG.GRID_OFFSET_X + c * CONFIG.CELL_WIDTH;
          const y = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT;
          const isAlt = (r + c) % 2 === 0;

          bCtx.fillStyle = isAlt ? dragonTile1 : dragonTile2;
          bCtx.fillRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          bCtx.strokeStyle = 'rgba(255, 167, 38, 0.24)';
          bCtx.lineWidth = 1.1;
          bCtx.strokeRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          bCtx.fillStyle = isAlt ? '#462830' : '#361e25';
          bCtx.beginPath();
          bCtx.arc(x + 18, y + 22, 2.2, 0, Math.PI * 2);
          bCtx.arc(x + 58, y + 64, 2.6, 0, Math.PI * 2);
          bCtx.fill();

          if ((r * 3 + c * 5) % 4 === 0) {
            bCtx.strokeStyle = isAlt ? 'rgba(255, 111, 0, 0.36)' : 'rgba(255, 61, 0, 0.32)';
            bCtx.lineWidth = 1.3;
            bCtx.beginPath();
            bCtx.moveTo(x + 12, y + 18);
            bCtx.lineTo(x + 38, y + 40);
            bCtx.lineTo(x + 66, y + 34);
            bCtx.stroke();
          }

          if ((r * 2 + c * 3) % 5 === 0) {
            bCtx.strokeStyle = 'rgba(22, 9, 13, 0.72)';
            bCtx.lineWidth = 1.8;
            for (let s = 0; s < 3; s++) {
              bCtx.beginPath();
              bCtx.moveTo(x + 16 + s * 6, y + 58);
              bCtx.lineTo(x + 30 + s * 6, y + 74);
              bCtx.stroke();
            }
          }
        }
      }

      const sunX = 670;
      const sunY = 29;
      const sunHalo = bCtx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 110);
      sunHalo.addColorStop(0, 'rgba(255, 145, 0, 0.55)');
      sunHalo.addColorStop(0.42, 'rgba(255, 23, 68, 0.25)');
      sunHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      bCtx.fillStyle = sunHalo;
      bCtx.beginPath();
      bCtx.arc(sunX, sunY, 110, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.fillStyle = '#ff9100';
      bCtx.beginPath();
      bCtx.arc(sunX, sunY, 24, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.fillStyle = '#19070b';
      bCtx.beginPath();
      bCtx.arc(sunX - 2, sunY + 1, 19.5, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.fillStyle = '#1b090e';
      bCtx.beginPath();
      bCtx.moveTo(0, CONFIG.GRID_OFFSET_Y);
      const peaks = [0, 38, 70, 18, 125, 44, 195, 14, 270, 42, 345, 16, 420, 46, 510, 14, 595, 42, 745, 16, 825, 40, 895, 12, w, 46];
      for (let i = 0; i < peaks.length; i += 2) {
        bCtx.lineTo(peaks[i], peaks[i + 1]);
      }
      bCtx.lineTo(w, CONFIG.GRID_OFFSET_Y);
      bCtx.closePath();
      bCtx.fill();

      bCtx.strokeStyle = 'rgba(255, 109, 0, 0.38)';
      bCtx.lineWidth = 1.5;
      bCtx.beginPath();
      for (let i = 0; i < peaks.length; i += 2) {
        if (i === 0) bCtx.moveTo(peaks[i], peaks[i + 1]);
        else bCtx.lineTo(peaks[i], peaks[i + 1]);
      }
      bCtx.stroke();

      const arenaGlow = bCtx.createRadialGradient(500, 270, 40, 500, 270, 440);
      arenaGlow.addColorStop(0, 'rgba(255, 111, 0, 0.11)');
      arenaGlow.addColorStop(0.7, 'rgba(213, 0, 0, 0.05)');
      arenaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      bCtx.fillStyle = arenaGlow;
      bCtx.fillRect(CONFIG.GRID_OFFSET_X, CONFIG.GRID_OFFSET_Y, CONFIG.COLS * CONFIG.CELL_WIDTH, CONFIG.ROWS * CONFIG.CELL_HEIGHT);

      const bottomLava = bCtx.createLinearGradient(0, h - 34, 0, h);
      bottomLava.addColorStop(0, 'rgba(0, 0, 0, 0)');
      bottomLava.addColorStop(1, 'rgba(255, 87, 34, 0.24)');
      bCtx.fillStyle = bottomLava;
      bCtx.fillRect(0, h - 34, w, 34);
    });

    // Lớp động siêu nhẹ (mép dung nham, lửa trụ đá, tàn lửa bay)
    ctx.save();
    const lavaLineAlpha = 0.72 + Math.sin(t * 2.4) * 0.2;
    ctx.fillStyle = `rgba(255, 87, 34, ${lavaLineAlpha})`;
    ctx.fillRect(patioWidth - 4, 0, 3.5, h);
    ctx.fillStyle = 'rgba(255, 213, 79, 0.75)';
    ctx.fillRect(patioWidth - 3, 0, 1.2, h);

    ctx.strokeStyle = `rgba(255, 111, 0, ${0.5 + Math.sin(t * 2.8) * 0.2})`;
    ctx.lineWidth = 2.0;
    for (let fy = 40; fy < h - 30; fy += 85) {
      ctx.beginPath();
      ctx.moveTo(lawnEndX + 18, fy);
      ctx.lineTo(lawnEndX + 42, fy + 14);
      ctx.lineTo(lawnEndX + 68, fy + 6);
      ctx.lineTo(w - 6, fy + 24);
      ctx.stroke();
    }

    for (let r = 0; r < CONFIG.ROWS; r++) {
      const pillarY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + 22;
      const pillarX = lawnEndX + 24;
      const flicker = Math.sin(t * 6.5 + r * 1.4);

      ctx.fillStyle = '#ff6d00';
      ctx.beginPath();
      ctx.moveTo(pillarX + 6, pillarY + 2);
      ctx.quadraticCurveTo(pillarX + 12 + flicker * 2, pillarY - 14, pillarX + 18, pillarY + 2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffe082';
      ctx.beginPath();
      ctx.arc(pillarX + 12 + flicker * 0.8, pillarY - 2, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 16; i++) {
      const seed = i * 53.7;
      const ex = (seed * 17 + t * (14 + (i % 5) * 4)) % w;
      const ey = h - ((seed * 11 + t * (22 + (i % 4) * 6)) % h);
      const radius = 1.3 + (i % 3) * 0.7;
      const alpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 2 + i));
      ctx.fillStyle = i % 3 === 0
        ? `rgba(255, 224, 130, ${alpha})`
        : `rgba(255, 87, 34, ${alpha})`;
      ctx.beginPath();
      ctx.arc(ex, ey, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ==========================================
  // ĐẤU TRƯỜNG SA MẠC SHURIMA (MAP 13 - BOSS AZIR HOÀNG ĐẾ SA MẠC)
  // Cache phần tĩnh (trời, kim tự tháp, lưới cát, cột đá) và chỉ vẽ đuốc + hạt cát động
  // ==========================================
  drawDesertLawn(ctx, gameState) {
    const t = this.getFrameTimeSec();
    const w = this.canvas.width;
    const h = this.canvas.height;
    const patioWidth = CONFIG.GRID_OFFSET_X;
    const lawnEndX = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;

    this.drawCachedBg(ctx, 'desert', w, h, (bCtx) => {
      const skyGrad = bCtx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#3a1f05');
      skyGrad.addColorStop(0.22, '#6b3b0e');
      skyGrad.addColorStop(0.6, '#4f2b09');
      skyGrad.addColorStop(1, '#2b1605');
      bCtx.fillStyle = skyGrad;
      bCtx.fillRect(0, 0, w, h);

      const patioGrad = bCtx.createLinearGradient(0, 0, patioWidth, 0);
      patioGrad.addColorStop(0, '#5a3916');
      patioGrad.addColorStop(0.85, '#7a5022');
      patioGrad.addColorStop(1, '#44290d');
      bCtx.fillStyle = patioGrad;
      bCtx.fillRect(0, 0, patioWidth, h);

      for (let y = CONFIG.GRID_OFFSET_Y; y < CONFIG.GRID_OFFSET_Y + CONFIG.ROWS * CONFIG.CELL_HEIGHT; y += CONFIG.CELL_HEIGHT) {
        bCtx.fillStyle = '#8b5e2a';
        bCtx.fillRect(6, y + 6, patioWidth - 20, CONFIG.CELL_HEIGHT - 12);
        bCtx.strokeStyle = '#ffd54f';
        bCtx.lineWidth = 1.4;
        bCtx.strokeRect(6, y + 6, patioWidth - 20, CONFIG.CELL_HEIGHT - 12);

        bCtx.fillStyle = '#ffd54f';
        bCtx.beginPath();
        bCtx.arc(patioWidth - 18, y + CONFIG.CELL_HEIGHT / 2, 4.2, 0, Math.PI * 2);
        bCtx.fill();
      }

      bCtx.fillStyle = '#38200a';
      bCtx.fillRect(patioWidth - 10, 0, 10, h);

      const eastGrad = bCtx.createLinearGradient(lawnEndX, 0, w, 0);
      eastGrad.addColorStop(0, '#4f3010');
      eastGrad.addColorStop(0.6, '#39210a');
      eastGrad.addColorStop(1, '#261405');
      bCtx.fillStyle = eastGrad;
      bCtx.fillRect(lawnEndX, 0, w - lawnEndX, h);

      bCtx.strokeStyle = 'rgba(255, 213, 79, 0.45)';
      bCtx.lineWidth = 2.0;
      bCtx.beginPath();
      bCtx.moveTo(lawnEndX + 2, 0);
      bCtx.lineTo(lawnEndX + 2, h);
      bCtx.stroke();

      for (let r = 0; r < CONFIG.ROWS; r++) {
        const obY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + 20;
        const obX = lawnEndX + 22;

        bCtx.fillStyle = 'rgba(212, 163, 115, 0.25)';
        bCtx.beginPath();
        bCtx.ellipse(obX + 12, obY + 44, 20, 7, 0, 0, Math.PI * 2);
        bCtx.fill();

        bCtx.fillStyle = '#795528';
        bCtx.strokeStyle = '#ffca28';
        bCtx.lineWidth = 1.5;
        bCtx.beginPath();
        bCtx.moveTo(obX + 2, obY + 42);
        bCtx.lineTo(obX + 5, obY + 10);
        bCtx.lineTo(obX + 12, obY);
        bCtx.lineTo(obX + 19, obY + 10);
        bCtx.lineTo(obX + 22, obY + 42);
        bCtx.closePath();
        bCtx.fill();
        bCtx.stroke();

        bCtx.strokeStyle = '#ffe082';
        bCtx.lineWidth = 1.2;
        bCtx.beginPath();
        bCtx.moveTo(obX + 12, obY + 14);
        bCtx.lineTo(obX + 12, obY + 32);
        bCtx.moveTo(obX + 8, obY + 20);
        bCtx.lineTo(obX + 16, obY + 20);
        bCtx.stroke();
      }

      const sandTile1 = '#c49048';
      const sandTile2 = '#b07d38';

      for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          const x = CONFIG.GRID_OFFSET_X + c * CONFIG.CELL_WIDTH;
          const y = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT;
          const isAlt = (r + c) % 2 === 0;

          bCtx.fillStyle = isAlt ? sandTile1 : sandTile2;
          bCtx.fillRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          bCtx.strokeStyle = 'rgba(255, 224, 130, 0.28)';
          bCtx.lineWidth = 1.1;
          bCtx.strokeRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          bCtx.strokeStyle = isAlt ? 'rgba(255, 236, 179, 0.24)' : 'rgba(93, 64, 55, 0.16)';
          bCtx.lineWidth = 1.2;
          bCtx.beginPath();
          bCtx.moveTo(x + 10, y + 26);
          bCtx.quadraticCurveTo(x + 40, y + 18, x + 70, y + 27);
          bCtx.moveTo(x + 14, y + 66);
          bCtx.quadraticCurveTo(x + 42, y + 58, x + 68, y + 67);
          bCtx.stroke();

          if ((r === 2 && c === 4) || ((r + c) % 4 === 0 && c > 0 && c < 8)) {
            bCtx.strokeStyle = 'rgba(255, 213, 79, 0.22)';
            bCtx.lineWidth = 1.3;
            bCtx.beginPath();
            bCtx.arc(x + CONFIG.CELL_WIDTH / 2, y + CONFIG.CELL_HEIGHT / 2, 16, 0, Math.PI * 2);
            bCtx.stroke();
          }
        }
      }

      const sunX = 720;
      const sunY = 30;
      const sunAura = bCtx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 105);
      sunAura.addColorStop(0, 'rgba(255, 241, 118, 0.62)');
      sunAura.addColorStop(0.45, 'rgba(255, 179, 0, 0.28)');
      sunAura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      bCtx.fillStyle = sunAura;
      bCtx.beginPath();
      bCtx.arc(sunX, sunY, 105, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.fillStyle = '#ffd54f';
      bCtx.strokeStyle = '#fff9c4';
      bCtx.lineWidth = 2;
      bCtx.beginPath();
      bCtx.arc(sunX, sunY, 20, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.stroke();

      bCtx.strokeStyle = '#ffab00';
      bCtx.lineWidth = 2.4;
      bCtx.beginPath();
      bCtx.arc(sunX, sunY, 27, Math.PI * 0.15, Math.PI * 0.85);
      bCtx.stroke();

      bCtx.fillStyle = '#4e2c0a';
      const pyramids = [
        [85, 58, 128, 18, 170, 58],
        [155, 58, 188, 28, 222, 58],
        [340, 58, 378, 22, 416, 58],
        [540, 58, 582, 16, 624, 58],
        [810, 58, 848, 24, 886, 58]
      ];
      for (const py of pyramids) {
        bCtx.beginPath();
        bCtx.moveTo(py[0], py[1]);
        bCtx.lineTo(py[2], py[3]);
        bCtx.lineTo(py[4], py[5]);
        bCtx.closePath();
        bCtx.fill();
        bCtx.strokeStyle = 'rgba(255, 213, 79, 0.35)';
        bCtx.lineWidth = 1.2;
        bCtx.stroke();
      }
    });

    // Lớp động siêu nhẹ (viền sáng, đuốc cột đá, hạt cát bay)
    ctx.save();
    const sunRimAlpha = 0.72 + Math.sin(t * 2.2) * 0.18;
    ctx.fillStyle = `rgba(255, 193, 7, ${sunRimAlpha})`;
    ctx.fillRect(patioWidth - 4, 0, 3.5, h);

    for (let r = 0; r < CONFIG.ROWS; r++) {
      const obY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + 20;
      const obX = lawnEndX + 22;
      const flame = Math.sin(t * 6.0 + r * 1.3);

      ctx.fillStyle = '#ff9100';
      ctx.beginPath();
      ctx.moveTo(obX + 7, obY + 1);
      ctx.quadraticCurveTo(obX + 12 + flame * 2, obY - 12, obX + 17, obY + 1);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#fff59d';
      ctx.beginPath();
      ctx.arc(obX + 12 + flame * 0.8, obY - 2, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 18; i++) {
      const seed = i * 47.3;
      const sx = w - ((seed * 19 + t * (55 + (i % 5) * 14)) % w);
      const sy = CONFIG.GRID_OFFSET_Y + ((seed * 13 + Math.sin(t * 2 + i) * 18) % (CONFIG.ROWS * CONFIG.CELL_HEIGHT));
      const rDot = 1.2 + (i % 3) * 0.6;
      const alpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 2.4 + i));
      ctx.fillStyle = `rgba(255, 236, 179, ${alpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, rDot, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ==========================================
  // CHIẾN TRƯỜNG NOSUS (MAP 14-16: PHÁO ĐÀI THIẾT HUYẾT)
  // Cache phần tĩnh (bầu trời huyết thực, tường thành sắt đen, sàn đá nạm thép đỏ, chậu than)
  // ==========================================
  drawNosusLawn(ctx, gameState) {
    const t = this.getFrameTimeSec();
    const w = this.canvas.width;
    const h = this.canvas.height;
    const patioWidth = CONFIG.GRID_OFFSET_X;
    const lawnEndX = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;

    this.drawCachedBg(ctx, 'nosus', w, h, (bCtx) => {
      // 1. Bầu trời pháo đài rực đỏ sẫm & sắt đen
      const skyGrad = bCtx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#140508');
      skyGrad.addColorStop(0.24, '#2c0a12');
      skyGrad.addColorStop(0.65, '#1d090e');
      skyGrad.addColorStop(1, '#100407');
      bCtx.fillStyle = skyGrad;
      bCtx.fillRect(0, 0, w, h);

      // 2. Thềm phòng thủ thép Nosus bên trái (Patio)
      const patioGrad = bCtx.createLinearGradient(0, 0, patioWidth, 0);
      patioGrad.addColorStop(0, '#1c181d');
      patioGrad.addColorStop(0.85, '#2b2228');
      patioGrad.addColorStop(1, '#151014');
      bCtx.fillStyle = patioGrad;
      bCtx.fillRect(0, 0, patioWidth, h);

      for (let y = CONFIG.GRID_OFFSET_Y; y < CONFIG.GRID_OFFSET_Y + CONFIG.ROWS * CONFIG.CELL_HEIGHT; y += CONFIG.CELL_HEIGHT) {
        bCtx.fillStyle = '#32262c';
        bCtx.fillRect(6, y + 6, patioWidth - 20, CONFIG.CELL_HEIGHT - 12);
        bCtx.strokeStyle = '#78909c';
        bCtx.lineWidth = 1.6;
        bCtx.strokeRect(6, y + 6, patioWidth - 20, CONFIG.CELL_HEIGHT - 12);

        // Đinh tán thép & dấu huyết ấn Nosus
        bCtx.fillStyle = '#b71c1c';
        bCtx.beginPath();
        bCtx.moveTo(patioWidth - 22, y + CONFIG.CELL_HEIGHT / 2 - 5);
        bCtx.lineTo(patioWidth - 15, y + CONFIG.CELL_HEIGHT / 2);
        bCtx.lineTo(patioWidth - 22, y + CONFIG.CELL_HEIGHT / 2 + 5);
        bCtx.lineTo(patioWidth - 29, y + CONFIG.CELL_HEIGHT / 2);
        bCtx.closePath();
        bCtx.fill();
      }

      bCtx.fillStyle = '#120b0e';
      bCtx.fillRect(patioWidth - 10, 0, 10, h);

      // 3. Doanh trại thép gai & cờ chiến bên phải (Zombie Entry Zone)
      const eastGrad = bCtx.createLinearGradient(lawnEndX, 0, w, 0);
      eastGrad.addColorStop(0, '#2a161c');
      eastGrad.addColorStop(0.55, '#1d0d12');
      eastGrad.addColorStop(1, '#12060a');
      bCtx.fillStyle = eastGrad;
      bCtx.fillRect(lawnEndX, 0, w - lawnEndX, h);

      bCtx.fillStyle = '#372329';
      bCtx.fillRect(lawnEndX, 0, 14, h);
      bCtx.strokeStyle = '#d50000';
      bCtx.lineWidth = 1.8;
      bCtx.beginPath();
      bCtx.moveTo(lawnEndX + 2, 0);
      bCtx.lineTo(lawnEndX + 2, h);
      bCtx.stroke();

      // Chậu than thiết huyết & cờ hiệu Nosus ở 5 hàng bên phải
      for (let r = 0; r < CONFIG.ROWS; r++) {
        const bY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + 24;
        const bX = lawnEndX + 22;

        // Cờ đỏ Nosus
        bCtx.fillStyle = '#8e0000';
        bCtx.strokeStyle = '#ff5252';
        bCtx.lineWidth = 1.2;
        bCtx.beginPath();
        bCtx.moveTo(bX + 34, bY - 4);
        bCtx.lineTo(bX + 54, bY - 4);
        bCtx.lineTo(bX + 54, bY + 26);
        bCtx.lineTo(bX + 44, bY + 36);
        bCtx.lineTo(bX + 34, bY + 26);
        bCtx.closePath();
        bCtx.fill();
        bCtx.stroke();

        // Chữ V thép trên cờ
        bCtx.strokeStyle = '#cfd8dc';
        bCtx.lineWidth = 1.8;
        bCtx.beginPath();
        bCtx.moveTo(bX + 39, bY + 4);
        bCtx.lineTo(bX + 44, bY + 18);
        bCtx.lineTo(bX + 49, bY + 4);
        bCtx.stroke();

        // Chậu than sắt đen
        bCtx.fillStyle = '#263238';
        bCtx.strokeStyle = '#78909c';
        bCtx.lineWidth = 1.5;
        bCtx.beginPath();
        bCtx.moveTo(bX + 2, bY + 14);
        bCtx.lineTo(bX + 24, bY + 14);
        bCtx.lineTo(bX + 20, bY + 34);
        bCtx.lineTo(bX + 6, bY + 34);
        bCtx.closePath();
        bCtx.fill();
        bCtx.stroke();
      }

      // 4. Lưới sân đấu Pháo Đài Đá Sắt & Huyết Ấn (5x9)
      const tile1 = '#2c1c21';
      const tile2 = '#221519';

      for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          const x = CONFIG.GRID_OFFSET_X + c * CONFIG.CELL_WIDTH;
          const y = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT;
          const isAlt = (r + c) % 2 === 0;

          bCtx.fillStyle = isAlt ? tile1 : tile2;
          bCtx.fillRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          // Viền ô nạm sắt & mạch huyết đỏ
          bCtx.strokeStyle = 'rgba(176, 190, 197, 0.24)';
          bCtx.lineWidth = 1.1;
          bCtx.strokeRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          // Đinh tán sắt 4 góc
          bCtx.fillStyle = '#546e7a';
          bCtx.fillRect(x + 4, y + 4, 3, 3);
          bCtx.fillRect(x + CONFIG.CELL_WIDTH - 7, y + 4, 3, 3);
          bCtx.fillRect(x + 4, y + CONFIG.CELL_HEIGHT - 7, 3, 3);
          bCtx.fillRect(x + CONFIG.CELL_WIDTH - 7, y + CONFIG.CELL_HEIGHT - 7, 3, 3);

          // Vết nứt huyết ngọc chìm trên mặt đá
          if ((r * 3 + c * 5) % 4 === 0) {
            bCtx.strokeStyle = 'rgba(255, 23, 68, 0.26)';
            bCtx.lineWidth = 1.2;
            bCtx.beginPath();
            bCtx.moveTo(x + 16, y + 20);
            bCtx.lineTo(x + 38, y + 44);
            bCtx.lineTo(x + 62, y + 36);
            bCtx.stroke();
          }

          // Huyết ấn chữ thập giữa sân
          if (r === 2 && (c === 2 || c === 4 || c === 6)) {
            bCtx.strokeStyle = 'rgba(213, 0, 0, 0.28)';
            bCtx.lineWidth = 1.6;
            bCtx.beginPath();
            bCtx.arc(x + CONFIG.CELL_WIDTH / 2, y + CONFIG.CELL_HEIGHT / 2, 18, 0, Math.PI * 2);
            bCtx.stroke();
          }
        }
      }

      // 5. Nhật thực đỏ & tường thành răng cưa Nosus phía trên
      const moonX = 685;
      const moonY = 30;
      const moonHalo = bCtx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 105);
      moonHalo.addColorStop(0, 'rgba(255, 23, 68, 0.55)');
      moonHalo.addColorStop(0.45, 'rgba(183, 28, 28, 0.24)');
      moonHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      bCtx.fillStyle = moonHalo;
      bCtx.beginPath();
      bCtx.arc(moonX, moonY, 105, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.fillStyle = '#ff1744';
      bCtx.beginPath();
      bCtx.arc(moonX, moonY, 21, 0, Math.PI * 2);
      bCtx.fill();
      bCtx.fillStyle = '#180509';
      bCtx.beginPath();
      bCtx.arc(moonX - 2, moonY + 1, 16.5, 0, Math.PI * 2);
      bCtx.fill();

      // Tháp nhọn pháo đài thép phía bắc
      bCtx.fillStyle = '#16090d';
      bCtx.strokeStyle = '#61252f';
      bCtx.lineWidth = 1.4;
      for (let bx = 24; bx < w - 20; bx += 68) {
        bCtx.beginPath();
        bCtx.moveTo(bx, CONFIG.GRID_OFFSET_Y);
        bCtx.lineTo(bx + 12, 22);
        bCtx.lineTo(bx + 24, 34);
        bCtx.lineTo(bx + 36, 18);
        bCtx.lineTo(bx + 48, 34);
        bCtx.lineTo(bx + 60, CONFIG.GRID_OFFSET_Y);
        bCtx.closePath();
        bCtx.fill();
        bCtx.stroke();
      }
    });

    // Lớp động siêu nhẹ (mép huyết quang, lửa chậu than và tàn lửa đỏ)
    ctx.save();
    const rimAlpha = 0.72 + Math.sin(t * 2.6) * 0.18;
    ctx.fillStyle = `rgba(255, 23, 68, ${rimAlpha})`;
    ctx.fillRect(patioWidth - 4, 0, 3.5, h);

    for (let r = 0; r < CONFIG.ROWS; r++) {
      const bY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + 24;
      const bX = lawnEndX + 22;
      const flame = Math.sin(t * 6.8 + r * 1.5);

      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.moveTo(bX + 6, bY + 14);
      ctx.quadraticCurveTo(bX + 13 + flame * 2.2, bY - 4, bX + 20, bY + 14);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffab40';
      ctx.beginPath();
      ctx.arc(bX + 13 + flame * 0.9, bY + 10, 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 16; i++) {
      const seed = i * 43.9;
      const ex = (seed * 17 + t * (28 + (i % 4) * 8)) % w;
      const ey = h - ((seed * 13 + t * (24 + (i % 5) * 6)) % h);
      const radius = 1.2 + (i % 3) * 0.65;
      const alpha = 0.25 + 0.35 * Math.abs(Math.sin(t * 2.5 + i));
      ctx.fillStyle = i % 3 === 0 ? `rgba(255, 171, 64, ${alpha})` : `rgba(255, 23, 68, ${alpha})`;
      ctx.beginPath();
      ctx.arc(ex, ey, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // ==========================================
  // CHIẾN TRƯỜNG IONIA (MAP 17-19: VÙNG ĐẤT IONIA - ĐỀN HOA ANH ĐÀO)
  // ==========================================
  drawIoniaLawn(ctx, gameState) {
    const t = this.getFrameTimeSec();
    const w = this.canvas.width;
    const h = this.canvas.height;
    const patioWidth = CONFIG.GRID_OFFSET_X;
    const lawnEndX = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;

    this.drawCachedBg(ctx, 'ionia', w, h, (bCtx) => {
      // 1. Bầu trời hoàng hôn linh giới ngọc bích & hoa anh đào
      const skyGrad = bCtx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#091f24');
      skyGrad.addColorStop(0.28, '#13333a');
      skyGrad.addColorStop(0.68, '#1a2736');
      skyGrad.addColorStop(1, '#0e1922');
      bCtx.fillStyle = skyGrad;
      bCtx.fillRect(0, 0, w, h);

      // 2. Thềm Đền Ngọc Bích bên trái (Patio)
      const patioGrad = bCtx.createLinearGradient(0, 0, patioWidth, 0);
      patioGrad.addColorStop(0, '#142a2e');
      patioGrad.addColorStop(0.85, '#1d3b40');
      patioGrad.addColorStop(1, '#0f2226');
      bCtx.fillStyle = patioGrad;
      bCtx.fillRect(0, 0, patioWidth, h);

      for (let y = CONFIG.GRID_OFFSET_Y; y < CONFIG.GRID_OFFSET_Y + CONFIG.ROWS * CONFIG.CELL_HEIGHT; y += CONFIG.CELL_HEIGHT) {
        bCtx.fillStyle = '#204549';
        bCtx.fillRect(6, y + 6, patioWidth - 20, CONFIG.CELL_HEIGHT - 12);
        bCtx.strokeStyle = '#64ffda';
        bCtx.lineWidth = 1.4;
        bCtx.strokeRect(6, y + 6, patioWidth - 20, CONFIG.CELL_HEIGHT - 12);

        // Ấn hoa sen Ionia trên thềm đá
        bCtx.fillStyle = '#f48fb1';
        bCtx.beginPath();
        bCtx.arc(patioWidth - 22, y + CONFIG.CELL_HEIGHT / 2, 5.5, 0, Math.PI * 2);
        bCtx.fill();
      }

      bCtx.fillStyle = '#0c1f22';
      bCtx.fillRect(patioWidth - 10, 0, 10, h);

      // 3. Rừng Anh Đào & Đèn Lồng Linh Giới bên phải
      const eastGrad = bCtx.createLinearGradient(lawnEndX, 0, w, 0);
      eastGrad.addColorStop(0, '#1a3539');
      eastGrad.addColorStop(0.55, '#152531');
      eastGrad.addColorStop(1, '#0d1720');
      bCtx.fillStyle = eastGrad;
      bCtx.fillRect(lawnEndX, 0, w - lawnEndX, h);

      for (let r = 0; r < CONFIG.ROWS; r++) {
        const bY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + 24;
        const bX = lawnEndX + 20;

        // Cổng gỗ Torii thu nhỏ & đèn lồng hoa anh đào
        bCtx.fillStyle = '#5d1c2e';
        bCtx.fillRect(bX + 36, bY - 4, 4, 40);
        bCtx.fillRect(bX + 52, bY - 4, 4, 40);
        bCtx.fillRect(bX + 32, bY - 6, 28, 5);

        bCtx.fillStyle = '#f48fb1';
        bCtx.strokeStyle = '#ffd54f';
        bCtx.lineWidth = 1.2;
        bCtx.beginPath();
        bCtx.ellipse(bX + 14, bY + 20, 9, 12, 0, 0, Math.PI * 2);
        bCtx.fill();
        bCtx.stroke();
      }

      // 4. Lưới sân đấu Đá Ngọc Bích Ionia (5x9)
      const tile1 = '#1c3b38';
      const tile2 = '#16302f';
      for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          const x = CONFIG.GRID_OFFSET_X + c * CONFIG.CELL_WIDTH;
          const y = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT;
          const isAlt = (r + c) % 2 === 0;

          bCtx.fillStyle = isAlt ? tile1 : tile2;
          bCtx.fillRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          bCtx.strokeStyle = 'rgba(100, 255, 218, 0.18)';
          bCtx.lineWidth = 1.0;
          bCtx.strokeRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          // Cánh hoa anh đào rơi tĩnh trên sân đá
          if ((r * 7 + c * 3) % 4 === 0) {
            bCtx.fillStyle = 'rgba(244, 143, 177, 0.35)';
            bCtx.beginPath();
            bCtx.ellipse(x + 22, y + 26, 4.5, 2.2, 0.5, 0, Math.PI * 2);
            bCtx.fill();
            bCtx.beginPath();
            bCtx.ellipse(x + 56, y + 60, 4, 2, -0.4, 0, Math.PI * 2);
            bCtx.fill();
          }

          // Vòng ấn tinh linh ở trung tâm sân
          if (r === 2 && (c === 2 || c === 4 || c === 6)) {
            bCtx.strokeStyle = 'rgba(244, 143, 177, 0.25)';
            bCtx.lineWidth = 1.4;
            bCtx.beginPath();
            bCtx.arc(x + CONFIG.CELL_WIDTH / 2, y + CONFIG.CELL_HEIGHT / 2, 18, 0, Math.PI * 2);
            bCtx.stroke();
          }
        }
      }

      // 5. Trăng tròn linh giới & mái đền Ionia phía trên
      const moonX = 685;
      const moonY = 30;
      const moonHalo = bCtx.createRadialGradient(moonX, moonY, 8, moonX, moonY, 108);
      moonHalo.addColorStop(0, 'rgba(244, 143, 177, 0.45)');
      moonHalo.addColorStop(0.5, 'rgba(100, 255, 218, 0.20)');
      moonHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
      bCtx.fillStyle = moonHalo;
      bCtx.beginPath();
      bCtx.arc(moonX, moonY, 108, 0, Math.PI * 2);
      bCtx.fill();

      bCtx.fillStyle = '#fce4ec';
      bCtx.beginPath();
      bCtx.arc(moonX, moonY, 20, 0, Math.PI * 2);
      bCtx.fill();

      // Mái đền cong Ionia dọc phía bắc
      bCtx.fillStyle = '#11262a';
      bCtx.strokeStyle = '#4db6ac';
      bCtx.lineWidth = 1.4;
      for (let bx = 24; bx < w - 20; bx += 84) {
        bCtx.beginPath();
        bCtx.moveTo(bx, CONFIG.GRID_OFFSET_Y);
        bCtx.quadraticCurveTo(bx + 20, 24, bx + 42, 18);
        bCtx.quadraticCurveTo(bx + 64, 24, bx + 78, CONFIG.GRID_OFFSET_Y);
        bCtx.closePath();
        bCtx.fill();
        bCtx.stroke();
      }
    });

    // Lớp động: Méo viền ngọc bích phát sáng + Cánh hoa anh đào bay chéo & đom đóm linh hồn
    ctx.save();
    const rimAlpha = 0.65 + Math.sin(t * 2.4) * 0.2;
    ctx.fillStyle = `rgba(100, 255, 218, ${rimAlpha})`;
    ctx.fillRect(patioWidth - 4, 0, 3.5, h);

    for (let i = 0; i < 18; i++) {
      const seed = i * 53.7;
      const px = w - ((seed * 19 + t * (32 + (i % 4) * 9)) % w);
      const py = (seed * 11 + t * (20 + (i % 5) * 6)) % h;
      const rot = t * 2.2 + i;
      const alpha = 0.42 + 0.32 * Math.abs(Math.sin(t * 2.1 + i));
      if (i % 3 === 0) {
        ctx.fillStyle = `rgba(100, 255, 218, ${alpha})`;
        ctx.beginPath();
        ctx.arc(px, py, 2.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(rot);
        ctx.fillStyle = `rgba(244, 143, 177, ${alpha})`;
        ctx.beginPath();
        ctx.ellipse(0, 0, 4.4, 2.2, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
    ctx.restore();
  }

  // ============================================================================
  // MAP 20: BẾN CẢNG TỬ THẦN (BLOODHARBOR PIER)
  // Cột 1-6: Sàn gỗ trồng cây (Phase 2 ngập cột 6, Phase 3 sương mù cột 5-6)
  // Cột 7-9: Vùng nước đen nơi Boss Zombot Đồ Tể Pyke di chuyển
  // ============================================================================
  drawBloodharborLawn(ctx, gameState) {
    const t = this.getFrameTimeSec();
    const w = this.canvas.width;
    const h = this.canvas.height;
    const patioWidth = CONFIG.GRID_OFFSET_X;
    const lawnStartY = CONFIG.GRID_OFFSET_Y;
    const lawnEndY = CONFIG.GRID_OFFSET_Y + CONFIG.ROWS * CONFIG.CELL_HEIGHT;
    const pierEndX = CONFIG.GRID_OFFSET_X + 6 * CONFIG.CELL_WIDTH;
    const lawnEndX = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;

    this.drawCachedBg(ctx, 'bloodharbor', w, h, (bCtx) => {
      // 1. Nền đêm bão tố Bến Cảng Tử Thần
      const skyGrad = bCtx.createLinearGradient(0, 0, 0, h);
      skyGrad.addColorStop(0, '#040c12');
      skyGrad.addColorStop(0.55, '#071720');
      skyGrad.addColorStop(1, '#03080d');
      bCtx.fillStyle = skyGrad;
      bCtx.fillRect(0, 0, w, h);

      // 2. Cầu cảng phòng thủ bên trái (CẤM VƯỢT CỘT 1 - Không có Máy Cắt Cỏ!)
      const patioGrad = bCtx.createLinearGradient(0, 0, patioWidth, 0);
      patioGrad.addColorStop(0, '#101418');
      patioGrad.addColorStop(1, '#1c242b');
      bCtx.fillStyle = patioGrad;
      bCtx.fillRect(0, 0, patioWidth, h);

      for (let r = 0; r < CONFIG.ROWS; r++) {
        const y = lawnStartY + r * CONFIG.CELL_HEIGHT;
        bCtx.fillStyle = '#221712';
        bCtx.fillRect(8, y + 6, patioWidth - 18, CONFIG.CELL_HEIGHT - 12);
        bCtx.strokeStyle = 'rgba(255, 82, 82, 0.55)';
        bCtx.lineWidth = 1.4;
        bCtx.strokeRect(8, y + 6, patioWidth - 18, CONFIG.CELL_HEIGHT - 12);

        bCtx.fillStyle = '#ff5252';
        bCtx.font = 'bold 12px sans-serif';
        bCtx.textAlign = 'center';
        bCtx.textBaseline = 'middle';
        bCtx.fillText('☠️', patioWidth / 2 - 2, y + CONFIG.CELL_HEIGHT / 2);
      }

      // Cọc chắn cảnh báo ranh giới Cột 1
      bCtx.fillStyle = '#7f0000';
      bCtx.fillRect(patioWidth - 8, 0, 8, h);

      // 3. Cột 1-6 (col 0..5): Sàn gỗ Bến Cảng đóng đinh thép
      for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < 6; c++) {
          const x = CONFIG.GRID_OFFSET_X + c * CONFIG.CELL_WIDTH;
          const y = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT;
          const isAlt = (r + c) % 2 === 0;

          bCtx.fillStyle = isAlt ? '#4e342e' : '#3e2723';
          bCtx.fillRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

          // Các thanh ván gỗ ngang và đinh tán
          bCtx.strokeStyle = 'rgba(20, 10, 6, 0.55)';
          bCtx.lineWidth = 1.4;
          for (let p = 1; p <= 3; p++) {
            const py = y + (CONFIG.CELL_HEIGHT / 4) * p;
            bCtx.beginPath();
            bCtx.moveTo(x, py);
            bCtx.lineTo(x + CONFIG.CELL_WIDTH, py);
            bCtx.stroke();
          }

          bCtx.fillStyle = '#78909c';
          bCtx.beginPath();
          bCtx.arc(x + 8, y + 8, 1.8, 0, Math.PI * 2);
          bCtx.arc(x + CONFIG.CELL_WIDTH - 8, y + 8, 1.8, 0, Math.PI * 2);
          bCtx.arc(x + 8, y + CONFIG.CELL_HEIGHT - 8, 1.8, 0, Math.PI * 2);
          bCtx.arc(x + CONFIG.CELL_WIDTH - 8, y + CONFIG.CELL_HEIGHT - 8, 1.8, 0, Math.PI * 2);
          bCtx.fill();

          bCtx.strokeStyle = 'rgba(128, 222, 234, 0.22)';
          bCtx.lineWidth = 1.1;
          bCtx.strokeRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);
        }
      }

      // 4. Cột 7-9 (col 6..8): Vùng nước đen sâu thẳm của Zombot Đồ Tể
      const waterGrad = bCtx.createLinearGradient(pierEndX, 0, w, 0);
      waterGrad.addColorStop(0, '#071b24');
      waterGrad.addColorStop(0.5, '#041219');
      waterGrad.addColorStop(1, '#02090e');
      bCtx.fillStyle = waterGrad;
      bCtx.fillRect(pierEndX, lawnStartY, w - pierEndX, lawnEndY - lawnStartY);

      for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 6; c < CONFIG.COLS; c++) {
          const x = CONFIG.GRID_OFFSET_X + c * CONFIG.CELL_WIDTH;
          const y = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT;
          bCtx.strokeStyle = 'rgba(0, 229, 255, 0.14)';
          bCtx.lineWidth = 1.0;
          bCtx.strokeRect(x, y, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);
        }
      }

      // Ranh giới gỗ & xích sắt ngăn cách Cột 6 (Sàn) và Cột 7 (Nước đen)
      bCtx.fillStyle = '#1b110d';
      bCtx.fillRect(pierEndX - 4, lawnStartY, 8, lawnEndY - lawnStartY);
      bCtx.strokeStyle = '#00e5ff';
      bCtx.lineWidth = 1.6;
      bCtx.beginPath();
      bCtx.moveTo(pierEndX, lawnStartY);
      bCtx.lineTo(pierEndX, lawnEndY);
      bCtx.stroke();

      // Số cột 1-6 rõ ràng phía dưới sàn
      bCtx.font = 'bold 10px sans-serif';
      bCtx.textAlign = 'center';
      bCtx.fillStyle = 'rgba(178, 235, 242, 0.72)';
      for (let c = 0; c < 6; c++) {
        bCtx.fillText(`C${c + 1}`, CONFIG.GRID_OFFSET_X + (c + 0.5) * CONFIG.CELL_WIDTH, lawnEndY + 12);
      }
      bCtx.fillStyle = 'rgba(0, 229, 255, 0.65)';
      bCtx.fillText('🌊 VÙNG NƯỚC ĐEN (BOSS)', pierEndX + 1.5 * CONFIG.CELL_WIDTH, lawnEndY + 12);
    });

    // --- Lớp động: Sóng nước đen, Ngập cột 6 (Phase 2), Sương mù (Phase 3), Ô bị trói E ---
    ctx.save();

    // Sóng nước đen chuyển động tại cột 7-9
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.24)';
    ctx.lineWidth = 1.6;
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const wy = lawnStartY + r * CONFIG.CELL_HEIGHT + 28;
      for (let k = 0; k < 3; k++) {
        const wx = pierEndX + 16 + k * 78 + Math.sin(t * 2.2 + r + k) * 10;
        ctx.beginPath();
        ctx.moveTo(wx, wy);
        ctx.quadraticCurveTo(wx + 20, wy - 5, wx + 40, wy);
        ctx.stroke();
      }
    }

    // Giai đoạn Dàn Trận (Setup Phase): Khung hướng dẫn nổi bật
    if (gameState && gameState.isSetupPhase) {
      const pulse = 0.55 + Math.sin(t * 4.0) * 0.25;
      ctx.strokeStyle = `rgba(0, 229, 255, ${pulse})`;
      ctx.lineWidth = 3.0;
      ctx.setLineDash([10, 6]);
      ctx.strokeRect(CONFIG.GRID_OFFSET_X + 2, lawnStartY + 2, 6 * CONFIG.CELL_WIDTH - 4, lawnEndY - lawnStartY - 4);
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(6, 20, 28, 0.85)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.roundRect(pierEndX + 14, lawnStartY + 140, 212, 118, 10);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚓ GIAI ĐOẠN DÀN TRẬN', pierEndX + 120, lawnStartY + 166);
      ctx.fillStyle = '#e0f7fa';
      ctx.font = '11.5px sans-serif';
      ctx.fillText('• Đặt tối đa 12 cây (Cột 1–6)', pierEndX + 120, lawnStartY + 190);
      ctx.fillText('• Hồi chiêu 0s · Đổi vị trí tự do', pierEndX + 120, lawnStartY + 210);
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 11.5px sans-serif';
      ctx.fillText('Bấm "🚢 KÉO CÒI TÀU" để đánh!', pierEndX + 120, lawnStartY + 236);
    }

    // Phase 2+: Nước đen tràn ngập cột 6 (col === 5)
    if (gameState && Array.isArray(gameState.floodedCols) && gameState.floodedCols.includes(5)) {
      const fx = CONFIG.GRID_OFFSET_X + 5 * CONFIG.CELL_WIDTH;
      const floodGrad = ctx.createLinearGradient(fx, lawnStartY, fx + CONFIG.CELL_WIDTH, lawnStartY);
      floodGrad.addColorStop(0, 'rgba(0, 77, 64, 0.62)');
      floodGrad.addColorStop(0.5, 'rgba(4, 24, 34, 0.85)');
      floodGrad.addColorStop(1, 'rgba(2, 14, 20, 0.92)');
      ctx.fillStyle = floodGrad;
      ctx.fillRect(fx, lawnStartY, CONFIG.CELL_WIDTH, lawnEndY - lawnStartY);

      ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
      ctx.lineWidth = 2.0;
      ctx.strokeRect(fx + 1, lawnStartY + 1, CONFIG.CELL_WIDTH - 2, lawnEndY - lawnStartY - 2);

      for (let r = 0; r < CONFIG.ROWS; r++) {
        const cy = lawnStartY + r * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
        const waveShift = Math.sin(t * 3.5 + r) * 6;
        ctx.strokeStyle = 'rgba(128, 222, 234, 0.45)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(fx + 10, cy + waveShift);
        ctx.quadraticCurveTo(fx + CONFIG.CELL_WIDTH / 2, cy - 10 + waveShift, fx + CONFIG.CELL_WIDTH - 10, cy + waveShift);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 138, 128, 0.85)';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⛔ NGẬP NƯỚC', fx + CONFIG.CELL_WIDTH / 2, cy + 20);
      }
    }

    // Phase 3: Sương mù phủ cột 5-6 & Cảnh báo -20% tầm bắn cột 1-2
    if (gameState && gameState.bloodharborPhase >= 3) {
      const fogX = CONFIG.GRID_OFFSET_X + 4 * CONFIG.CELL_WIDTH;
      const fogW = 2 * CONFIG.CELL_WIDTH;
      const fogAlpha = 0.34 + Math.sin(t * 2.5) * 0.08;
      const fogGrad = ctx.createLinearGradient(fogX, lawnStartY, fogX + fogW, lawnEndY);
      fogGrad.addColorStop(0, `rgba(136, 14, 79, ${fogAlpha * 0.85})`);
      fogGrad.addColorStop(0.5, `rgba(18, 32, 42, ${fogAlpha * 1.15})`);
      fogGrad.addColorStop(1, `rgba(183, 28, 28, ${fogAlpha * 0.9})`);
      ctx.fillStyle = fogGrad;
      ctx.fillRect(fogX, lawnStartY, fogW, lawnEndY - lawnStartY);

      ctx.strokeStyle = 'rgba(255, 82, 82, 0.72)';
      ctx.lineWidth = 2.0;
      ctx.setLineDash([8, 5]);
      ctx.strokeRect(fogX + 2, lawnStartY + 2, fogW - 4, lawnEndY - lawnStartY - 4);
      ctx.setLineDash([]);

      // Luồng sương cuộn
      for (let i = 0; i < 6; i++) {
        const fx = fogX + 20 + ((i * 37 + t * 28) % (fogW - 40));
        const fy = lawnStartY + 35 + i * 74;
        ctx.fillStyle = 'rgba(255, 138, 128, 0.16)';
        ctx.beginPath();
        ctx.ellipse(fx, fy, 36, 16, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = 'rgba(20, 8, 12, 0.85)';
      ctx.beginPath();
      ctx.roundRect(fogX + 12, lawnStartY + 8, fogW - 24, 22, 6);
      ctx.fill();
      ctx.fillStyle = '#ff8a80';
      ctx.font = 'bold 10.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌫️ SƯƠNG MÙ · CỘT 1–2 GIẢM 20% TẦM', fogX + fogW / 2, lawnStartY + 22);

      // Viền cảnh báo giảm 20% tầm ở cột 1-2
      ctx.strokeStyle = 'rgba(255, 171, 64, 0.55)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(CONFIG.GRID_OFFSET_X + 2, lawnStartY + 2, 2 * CONFIG.CELL_WIDTH - 4, lawnEndY - lawnStartY - 4);
    }

    // Các ô đang bị trói bởi Lướt Sóng (E) của Zombot Pyke
    if (gameState && Array.isArray(gameState.rootedTiles)) {
      for (const rt of gameState.rootedTiles) {
        const rx = CONFIG.GRID_OFFSET_X + rt.col * CONFIG.CELL_WIDTH;
        const ry = CONFIG.GRID_OFFSET_Y + rt.row * CONFIG.CELL_HEIGHT;
        const pulse = 0.65 + Math.sin(t * 7) * 0.25;
        ctx.fillStyle = `rgba(0, 229, 255, ${0.22 * pulse})`;
        ctx.fillRect(rx + 2, ry + 2, CONFIG.CELL_WIDTH - 4, CONFIG.CELL_HEIGHT - 4);
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.9 * pulse})`;
        ctx.lineWidth = 2.4;
        ctx.strokeRect(rx + 2, ry + 2, CONFIG.CELL_WIDTH - 4, CONFIG.CELL_HEIGHT - 4);

        ctx.fillStyle = '#80deea';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`⛓️ ${rt.timer.toFixed(1)}s`, rx + CONFIG.CELL_WIDTH / 2, ry + CONFIG.CELL_HEIGHT - 9);
      }
    }

    ctx.restore();
  }

  // Cảnh báo chiêu thức rõ ràng (Q / E / R) của Zombot Đồ Tể Pyke trước khi đánh
  drawPykeTelegraphs(ctx, gameState) {
    if (!gameState || !Array.isArray(gameState.zombies)) return;
    const boss = gameState.zombies.find(z => z.alive && z.type === 'zombot_pyke');
    if (!boss || !boss.pykeTelegraph) return;

    const tel = boss.pykeTelegraph;
    const t = this.getFrameTimeSec();
    const dur = Math.max(0.2, tel.duration || 2.0);
    const prog = Math.max(0, Math.min(1, 1 - (tel.remaining || 0) / dur));
    const pulse = 0.65 + Math.sin(t * 14) * 0.3;

    ctx.save();
    if (tel.kind === 'Q' && Array.isArray(tel.rows)) {
      const startX = CONFIG.GRID_OFFSET_X;
      const endX = boss.x - 16;
      for (const r of tel.rows) {
        const yTop = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + 6;
        const yMid = yTop + (CONFIG.CELL_HEIGHT - 12) / 2;
        const h = CONFIG.CELL_HEIGHT - 12;

        ctx.fillStyle = `rgba(0, 229, 255, ${0.14 + 0.14 * prog})`;
        ctx.fillRect(startX, yTop, endX - startX, h);
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.85 * pulse})`;
        ctx.lineWidth = 2.2;
        ctx.setLineDash([10, 6]);
        ctx.strokeRect(startX, yTop, endX - startX, h);
        ctx.setLineDash([]);

        // Mũi tên cảnh báo Lao Móc chạy dọc theo hàng
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 2.6;
        const shift = (t * 180) % 60;
        for (let ax = endX - 24 - shift; ax > startX + 20; ax -= 60) {
          ctx.beginPath();
          ctx.moveTo(ax + 8, yMid - 8);
          ctx.lineTo(ax, yMid);
          ctx.lineTo(ax + 8, yMid + 8);
          ctx.stroke();
        }

        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`🪝 LAO MÓC (Q) ${tel.remaining.toFixed(1)}s`, startX + 8, yTop + 14);
      }
    } else if (tel.kind === 'E' && Array.isArray(tel.cols) && tel.cols.length > 0) {
      const startCol = tel.cols[0];
      const endCol = tel.cols[tel.cols.length - 1];
      const zx = CONFIG.GRID_OFFSET_X + startCol * CONFIG.CELL_WIDTH;
      const zw = (endCol - startCol + 1) * CONFIG.CELL_WIDTH;
      const zy = CONFIG.GRID_OFFSET_Y + tel.row * CONFIG.CELL_HEIGHT + 4;
      const zh = CONFIG.CELL_HEIGHT - 8;

      ctx.fillStyle = `rgba(38, 198, 218, ${0.20 + 0.18 * prog})`;
      ctx.fillRect(zx, zy, zw, zh);
      ctx.strokeStyle = `rgba(0, 229, 255, ${pulse})`;
      ctx.lineWidth = 3.0;
      ctx.strokeRect(zx, zy, zw, zh);

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🌊 LƯỚT SÓNG TRÓI ${tel.remaining.toFixed(1)}s`, zx + zw / 2, zy + zh / 2 + 4);
    } else if (tel.kind === 'R') {
      const tx = tel.targetX || (CONFIG.GRID_OFFSET_X + (tel.targetCol || 0) * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2);
      const ty = tel.targetY || (CONFIG.GRID_OFFSET_Y + (tel.targetRow || 0) * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2);
      const cellX = CONFIG.GRID_OFFSET_X + (tel.targetCol || 0) * CONFIG.CELL_WIDTH;
      const cellY = CONFIG.GRID_OFFSET_Y + (tel.targetRow || 0) * CONFIG.CELL_HEIGHT;

      ctx.fillStyle = `rgba(255, 23, 68, ${0.22 + 0.18 * prog})`;
      ctx.fillRect(cellX + 2, cellY + 2, CONFIG.CELL_WIDTH - 4, CONFIG.CELL_HEIGHT - 4);

      // Vòng ngắm thu nhỏ & chữ X Đồ Tể
      const ringR = 44 - 16 * prog;
      ctx.strokeStyle = `rgba(255, 213, 79, ${pulse})`;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.arc(tx, ty, ringR, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 4.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(tx - 24, ty - 24);
      ctx.lineTo(tx + 24, ty + 24);
      ctx.moveTo(tx + 24, ty - 24);
      ctx.lineTo(tx - 24, ty + 24);
      ctx.stroke();

      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`☠️ CHÉM X (${tel.remaining.toFixed(1)}s)`, tx, cellY - 4);
    }
    ctx.restore();
  }

  drawPlacementPreview(ctx, gameState, input) {
    if (!input.isPointerOnCanvas) return;
    const r = input.hoverRow;
    const c = input.hoverCol;
    if (r < 0 || r >= CONFIG.ROWS || c < 0 || c >= CONFIG.COLS) return;

    const cellX = CONFIG.GRID_OFFSET_X + c * CONFIG.CELL_WIDTH;
    const cellY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT;

    const isOccupied = gameState.isCellOccupied(r, c);
    const isBloodharborBlocked = !!(gameState.isBloodharborMode && (
      c >= 6 ||
      (Array.isArray(gameState.floodedCols) && gameState.floodedCols.includes(c)) ||
      (typeof gameState.getAliveBoardPlantCount === 'function' && gameState.getAliveBoardPlantCount() >= (gameState.maxPlantsOnBoard || 12))
    ));

    if (gameState.selectedPlantType) {
      if (isOccupied || isBloodharborBlocked) {
        // Ô không hợp lệ -> Highlight đỏ sẫm cảnh báo
        ctx.fillStyle = 'rgba(213, 0, 0, 0.45)';
        ctx.fillRect(cellX, cellY, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(cellX + 2, cellY + 2, CONFIG.CELL_WIDTH - 4, CONFIG.CELL_HEIGHT - 4);
      } else {
        // Ô hợp lệ -> Vòng triệu hồi hắc ám phát quang xanh tím
        ctx.fillStyle = 'rgba(118, 255, 3, 0.22)';
        ctx.fillRect(cellX, cellY, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);
        ctx.strokeStyle = '#76ff03';
        ctx.lineWidth = 2.5;
        ctx.strokeRect(cellX + 2, cellY + 2, CONFIG.CELL_WIDTH - 4, CONFIG.CELL_HEIGHT - 4);

        // Vẽ mờ cây quỷ xem trước
        ctx.save();
        ctx.globalAlpha = 0.65;
        const dummyPlant = {
          type: gameState.selectedPlantType,
          x: cellX + CONFIG.CELL_WIDTH / 2,
          y: cellY + CONFIG.CELL_HEIGHT / 2,
          animTime: 0,
          flashTimer: 0,
          state: 'idle',
          glow: 0,
          stage: 1,
          armed: false,
          isIcon: true,
          hp: 1,
          maxHp: 1
        };
        this.drawPlant(ctx, dummyPlant);
        ctx.restore();
      }
    } else if (gameState.isShovelActive && isOccupied) {
      // Đang dùng xẻng đào mộ
      ctx.fillStyle = 'rgba(183, 28, 28, 0.55)';
      ctx.fillRect(cellX, cellY, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(cellX + 2, cellY + 2, CONFIG.CELL_WIDTH - 4, CONFIG.CELL_HEIGHT - 4);
    }
  }

  // CỖ MÁY NGHIỀN HỒN SẮT ĐEN (Soul Harvesters / Bone Grinder Death Carts)
  drawLawnmowers(ctx, lawnmowers) {
    lawnmowers.forEach(m => {
      if (!m.active) return;
      ctx.save();
      ctx.translate(m.x, m.y);

      // Bóng tử khí đen kịt dưới máy
      ctx.fillStyle = 'rgba(5, 3, 8, 0.65)';
      ctx.beginPath();
      ctx.ellipse(0, 16, 26, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      // Tay đẩy kim loại rỉ sét đen
      ctx.strokeStyle = '#455a64';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-12, -4);
      ctx.lineTo(-30, -22);
      ctx.lineTo(-38, -20);
      ctx.stroke();

      // Bánh xe sắt gai nhọn hoắt
      ctx.fillStyle = '#10171a';
      ctx.beginPath();
      ctx.arc(-14, 12, 7.5, 0, Math.PI * 2);
      ctx.arc(14, 12, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Thân cỗ máy sắt đen bọc thép gai đẫm máu
      ctx.fillStyle = '#1c1b22';
      ctx.beginPath();
      ctx.roundRect(-22, -12, 44, 24, 5);
      ctx.fill();
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Vết máu tươi bắn loang lổ trên thân máy
      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(-18, -6, 28, 5);
      ctx.fillRect(-6, 2, 22, 4);

      // Đầu lâu kim loại phát sáng mắt đỏ gắn đầu xe
      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath();
      ctx.arc(16, -2, 6, 0, Math.PI * 2);
      ctx.fill();
      // Mắt đỏ quỷ
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(18, -3, 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Động cơ hơi nước hắc ám
      ctx.fillStyle = '#263238';
      ctx.fillRect(-6, -18, 14, 8);
      // Khói đen bốc lên
      ctx.fillStyle = 'rgba(20, 15, 25, 0.6)';
      ctx.beginPath();
      ctx.arc(-2, -24, 4, 0, Math.PI * 2);
      ctx.arc(-5, -30, 6, 0, Math.PI * 2);
      ctx.fill();

      // LƯỠI CƯA RĂNG GAI XOAY TÍT KHI ĐANG PHÓNG ĐI (Spinning Razor Blades)
      if (m.moving) {
        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(22, 0, 14, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 23, 68, 0.4)';
        ctx.beginPath();
        ctx.arc(22, 0, 12, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    });
  }

  drawPlant(ctx, plant, gameState = null) {
    const throwOffsetX = !plant.isIcon ? (plant.settThrowOffsetX || 0) : 0;
    const throwLiftY = !plant.isIcon ? (plant.settThrowLiftY || 0) : 0;
    const throwAngle = !plant.isIcon ? (plant.settThrowAngle || 0) : 0;
    const throwScaleX = !plant.isIcon && plant.settThrowScaleX ? plant.settThrowScaleX : 1;
    const throwScaleY = !plant.isIcon && plant.settThrowScaleY ? plant.settThrowScaleY : 1;
    const airborneLift = throwLiftY > 0
      ? throwLiftY
      : ((plant.airborneTimer > 0 && !plant.isIcon)
        ? Math.sin(Math.min(1, plant.airborneTimer / (plant.airborneDuration || 0.7)) * Math.PI) * 28
        : 0);
    const drawX = plant.x + throwOffsetX;

    // 1. Bóng tự nhiên dịu mát dưới gốc thực vật (di chuyển & thu nhỏ khi bị Sett R nhấc bổng)
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)';
    const shadowScale = Math.max(0.45, 1 - airborneLift / 140);
    ctx.beginPath();
    ctx.ellipse(drawX, plant.y + 24, 20 * shadowScale, 7 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Vẽ thực vật (nhấc bổng & xoay theo quỹ đạo ném khi bị Yone R hất tung hoặc Sett R ném)
    ctx.save();
    ctx.translate(drawX, plant.y - airborneLift);
    if (throwAngle !== 0) {
      ctx.rotate(throwAngle);
    }
    if (throwScaleX !== 1 || throwScaleY !== 1) {
      ctx.scale(throwScaleX, throwScaleY);
    }

    this.drawPlantBody(ctx, plant);

    // Thanh tiến độ Skill 1 nhỏ trên đầu Galio + thanh máu khi bị thương (không chồng đè)
    const isDamaged = plant.hp < plant.maxHp && !plant.isRecharging;
    if (plant.type === 'galio') {
      const skillInterval = plant.skill1Interval || 5.0;
      const skillRatio = Math.max(0, Math.min(1, (plant.skill1Timer || 0) / skillInterval));
      this.drawGalioSkillBar(ctx, -16, -37, 32, 4, skillRatio);
      if (isDamaged) {
        this.drawHealthBar(ctx, -20, -45, 40, 5, plant.hp / plant.maxHp, '#ff1744');
      }
    } else if (plant.type === 'jhinplant' && !plant.isIcon) {
      this.drawJhinAmmoHud(ctx, plant);
      if (isDamaged) {
        this.drawHealthBar(ctx, -20, -47, 40, 5, plant.hp / plant.maxHp, '#ff1744');
      }
    } else if (plant.type === 'lux' && !plant.isIcon) {
      const stacks = Math.max(0, Math.min(10, plant.killAssistCount || 0));
      const threshold = plant.ultThreshold || 10;
      const ratio = stacks / threshold;
      ctx.fillStyle = 'rgba(15, 12, 20, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-19, -40, 38, 8, 3);
      ctx.fill();
      ctx.fillStyle = stacks >= 8 ? '#ffd54f' : '#fff176';
      if (ratio > 0) {
        ctx.beginPath();
        ctx.roundRect(-18, -39, 36 * ratio, 6, 2);
        ctx.fill();
      }
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${stacks}/${threshold}`, 0, -42);
      if (isDamaged) {
        this.drawHealthBar(ctx, -20, -52, 40, 5, plant.hp / plant.maxHp, '#ff1744');
      }
    } else if (plant.type === 'syndra' && !plant.isIcon) {
      const stacks = Math.max(0, Math.min(3, plant.orbStacks || 0));
      const maxStacks = plant.maxOrbStacks || 3;
      const orbProgress = Math.max(0, Math.min(1, (plant.orbTimer || 0) / (plant.orbInterval || 3.0)));
      // Thanh tụ cầu & hiển thị 3 ô stack nhỏ gọn
      ctx.fillStyle = 'rgba(18, 6, 31, 0.88)';
      ctx.beginPath();
      ctx.roundRect(-20, -43, 40, 8, 3);
      ctx.fill();
      for (let s = 0; s < maxStacks; s++) {
        ctx.fillStyle = s < stacks ? '#e040fb' : '#311b47';
        ctx.beginPath();
        ctx.arc(-12 + s * 12, -39, 2.7, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = 'rgba(179, 136, 255, 0.75)';
      ctx.fillRect(-18, -35, 36 * orbProgress, 1.8);
      if (isDamaged) {
        this.drawHealthBar(ctx, -20, -54, 40, 5, plant.hp / plant.maxHp, '#ff1744');
      }
    } else if (plant.type === 'kata' && !plant.isIcon) {
      const ratio = plant.isSpinning
        ? Math.max(0, Math.min(1, (plant.spinTimer || 0) / 3.0))
        : Math.max(0, Math.min(1, (plant.spinChargeTimer || 0) / 3.0));
      ctx.fillStyle = 'rgba(20, 10, 12, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-18, -40, 36, 5, 2.5);
      ctx.fill();
      if (ratio > 0) {
        ctx.fillStyle = plant.isSpinning ? '#ff1744' : '#ff8a80';
        ctx.beginPath();
        ctx.roundRect(-17, -39, 34 * ratio, 3, 2);
        ctx.fill();
      }
      if (isDamaged) {
        this.drawHealthBar(ctx, -20, -49, 40, 5, plant.hp / plant.maxHp, '#ff1744');
      }
    } else if (plant.type === 'aurora' && !plant.isIcon && plant.isAuroraSkillOwner === true) {
      const ratio = Math.max(0, Math.min(1, (plant.skillTimer || 0) / (plant.skillInterval || 20.0)));
      ctx.fillStyle = 'rgba(12, 22, 32, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-18, -40, 36, 5, 2.5);
      ctx.fill();
      if (ratio > 0) {
        ctx.fillStyle = ratio >= 1 ? '#f48fb1' : '#80deea';
        ctx.beginPath();
        ctx.roundRect(-17, -39, 34 * ratio, 3, 2);
        ctx.fill();
      }
      if (isDamaged) {
        this.drawHealthBar(ctx, -20, -49, 40, 5, plant.hp / plant.maxHp, '#ff1744');
      }
    } else if (plant.type === 'ahri' && !plant.isIcon) {
      const ratio = Math.max(0, Math.min(1, (plant.skillTimer || 0) / (plant.skillInterval || 15.0)));
      ctx.fillStyle = 'rgba(26, 12, 28, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-18, -40, 36, 5, 2.5);
      ctx.fill();
      if (ratio > 0) {
        ctx.fillStyle = ratio >= 1 ? '#ff4081' : '#f48fb1';
        ctx.beginPath();
        ctx.roundRect(-17, -39, 34 * ratio, 3, 2);
        ctx.fill();
      }
      if (isDamaged) {
        this.drawHealthBar(ctx, -20, -49, 40, 5, plant.hp / plant.maxHp, '#ff1744');
      }
    } else if (plant.type === 'irelia' && !plant.isIcon) {
      const cdMax = plant.skillCooldown || 2.0;
      const cdRem = Math.max(0, plant.skillCooldownTimer || 0);
      const readyRatio = Math.max(0, Math.min(1, 1 - cdRem / cdMax));
      const stacks = Math.max(0, Math.min(3, plant.ireStacks || 0));
      ctx.fillStyle = 'rgba(10, 20, 32, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-20, -42, 40, 8, 3);
      ctx.fill();
      for (let s = 0; s < 3; s++) {
        ctx.fillStyle = s < stacks ? '#00e5ff' : '#1b3a4b';
        ctx.beginPath();
        ctx.arc(-11 + s * 11, -38, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = cdRem <= 0 ? '#ffd54f' : '#4fc3f7';
      ctx.fillRect(-18, -35, 36 * readyRatio, 1.8);
      if (isDamaged) {
        this.drawHealthBar(ctx, -20, -52, 40, 5, plant.hp / plant.maxHp, '#ff1744');
      }
    } else if (plant.type === 'karma' && !plant.isIcon) {
      const stacks = Math.max(0, Math.min(3, plant.mantraCount || 0));
      const ratio = Math.max(0, Math.min(1, (plant.skillTimer || 0) / (plant.skillInterval || 5.0)));
      ctx.fillStyle = 'rgba(8, 26, 22, 0.88)';
      ctx.beginPath();
      ctx.roundRect(-20, -42, 40, 8, 3);
      ctx.fill();
      for (let s = 0; s < 3; s++) {
        ctx.fillStyle = s < stacks ? '#00e676' : '#143d32';
        ctx.beginPath();
        ctx.arc(-11 + s * 11, -38, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = stacks >= 3 ? '#ffd54f' : '#1de9b6';
      ctx.fillRect(-18, -35, 36 * ratio, 1.8);
      if (isDamaged) {
        this.drawHealthBar(ctx, -20, -52, 40, 5, plant.hp / plant.maxHp, '#ff1744');
      }
    } else if (isDamaged) {
      this.drawHealthBar(ctx, -20, -38, 40, 5, plant.hp / plant.maxHp, '#ff1744');
    }

    // Khiên năng lượng Karma Mantra bọc quanh & thanh khiên trên đầu cây
    if (plant.shieldHp > 0 && !plant.isIcon) {
      const shieldPulse = 0.72 + Math.sin((plant.animTime || 0) * 5.0) * 0.2;
      ctx.save();
      ctx.strokeStyle = `rgba(29, 233, 182, ${shieldPulse})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, 2, 23, 25, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(0, 230, 118, 0.10)';
      ctx.beginPath();
      ctx.ellipse(0, 2, 22, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const maxShield = Math.max(plant.maxShieldHp || 200, plant.shieldHp);
      const shieldBarY = (plant.type === 'syndra' || plant.type === 'lux' || plant.type === 'irelia' || plant.type === 'karma')
        ? (isDamaged ? -59 : -50)
        : (isDamaged ? -46 : -38);
      this.drawHealthBar(ctx, -20, shieldBarY, 40, 4.5, Math.min(1, plant.shieldHp / maxShield), '#1de9b6');
    }

    // Vòng xích & sao choáng nếu cây bị Thresh trói choáng hoặc Yone R hất tung
    if (plant.stunTimer > 0 && !plant.isIcon) {
      const t = (plant.animTime || 0) * 5.0;
      ctx.strokeStyle = airborneLift > 1 ? 'rgba(255, 82, 82, 0.9)' : 'rgba(105, 240, 174, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 6, 19, 8, 0, 0, Math.PI * 2);
      ctx.stroke();

      for (let i = 0; i < 3; i++) {
        const ang = t + (i * Math.PI * 2) / 3;
        const sx = Math.cos(ang) * 14;
        const sy = -28 + Math.sin(ang) * 4;
        ctx.fillStyle = '#ffd54f';
        ctx.beginPath();
        ctx.arc(sx, sy, 2.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hiệu ứng Lão Hóa của Thần Khuyển (-50% tốc độ đánh + đốt 10 DMG/0.5s)
    if (plant.witherTimer > 0 && !plant.isIcon) {
      const wt = (plant.animTime || 0) * 3.5;
      ctx.save();
      ctx.strokeStyle = 'rgba(171, 71, 188, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 12, 22, 9, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(156, 39, 176, 0.25)';
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      // Đồng hồ cát tím xoay nhẹ
      ctx.fillStyle = '#e040fb';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⏳ -50%', 0, -45 + Math.sin(wt) * 2);
      ctx.restore();
    }

    // Dấu Ấn Tử Thần của Zed trên cây (Xoay chữ X đỏ đen + đếm ngược nổ 300 DMG)
    if (plant.zedDeathMarkTimer > 0 && !plant.isIcon) {
      const rem = plant.zedDeathMarkTimer;
      const dur = plant.zedDeathMarkDuration || 5.0;
      const pulse = 0.72 + Math.sin((plant.animTime || 0) * 10) * 0.25;
      const rot = (dur - rem) * 3.2;

      ctx.save();
      // Vòng tròn ấn tử thần đỏ thẫm
      ctx.strokeStyle = `rgba(255, 23, 68, ${pulse})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, -4, 24, 0, Math.PI * 2);
      ctx.stroke();

      // Dấu X tử thần xoay phía trên cây
      ctx.save();
      ctx.translate(0, -28);
      ctx.rotate(rot);
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 3.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-10, -10); ctx.lineTo(10, 10);
      ctx.moveTo(10, -10); ctx.lineTo(-10, 10);
      ctx.stroke();
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.restore();

      // Nhãn đếm ngược 5.0s -> 0.0s rõ ràng
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.lineWidth = 2.6;
      const markText = `❌ ${rem.toFixed(1)}s`;
      ctx.strokeText(markText, 0, -44);
      ctx.fillStyle = rem <= 1.2 ? '#ffd54f' : '#ff5252';
      ctx.fillText(markText, 0, -44);
      ctx.restore();
    }

    // Hiệu ứng Bến Cảng Tử Thần: Bị Trói Sóng (E) & Giảm 20% tầm bắn trong Sương Mù Phase 3
    if (gameState && gameState.isBloodharborMode && !plant.isIcon) {
      if (typeof gameState.isTileRooted === 'function' && gameState.isTileRooted(plant.row, plant.col)) {
        ctx.save();
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(0, 8, 24, 10, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#00e5ff';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⛓️ BỊ TRÓI', 0, -40);
        ctx.restore();
      } else if (gameState.bloodharborPhase >= 3 && plant.col <= 1) {
        ctx.save();
        ctx.fillStyle = 'rgba(20, 8, 12, 0.78)';
        ctx.beginPath();
        ctx.roundRect(-24, 24, 48, 12, 4);
        ctx.fill();
        ctx.fillStyle = '#ffab91';
        ctx.font = 'bold 8.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('-20% TẦM', 0, 33);
        ctx.restore();
      }
    }

    ctx.restore();

    // Vẽ Đám mây sấm sét Plant Food của Sậy Sét (Lightning Reed)
    if (plant.stormCloud) {
      this.drawStormCloud(ctx, plant.stormCloud);
    }
  }

  drawPlantBody(ctx, plant) {
    if (plant.type === 'sunflower') {
      this.drawSunflowerGraphics(ctx, plant);
    } else if (plant.type === 'peashooter') {
      this.drawPeashooterGraphics(ctx, plant);
    } else if (plant.type === 'snow_pea') {
      this.drawSnowPeaGraphics(ctx, plant);
    } else if (plant.type === 'repeater') {
      this.drawRepeaterGraphics(ctx, plant);
    } else if (plant.type === 'cabbage_pult') {
      this.drawCabbagePultGraphics(ctx, plant);
    } else if (plant.type === 'melon_pult') {
      this.drawMelonPultGraphics(ctx, plant);
    } else if (plant.type === 'bonk_choy') {
      this.drawBonkChoyGraphics(ctx, plant);
    } else if (plant.type === 'snapdragon') {
      this.drawSnapdragonGraphics(ctx, plant);
    } else if (plant.type === 'wall_nut') {
      this.drawWallNutGraphics(ctx, plant);
    } else if (plant.type === 'cherry_bomb') {
      this.drawCherryBombGraphics(ctx, plant);
    } else if (plant.type === 'chomper') {
      this.drawChomperGraphics(ctx, plant);
    } else if (plant.type === 'lightning_reed') {
      this.drawLightningReedGraphics(ctx, plant);
    } else if (plant.type === 'stunion') {
      this.drawStunionGraphics(ctx, plant);
    } else if (plant.type === 'infi_nut') {
      this.drawInfiNutGraphics(ctx, plant);
    } else if (plant.type === 'sun_shroom') {
      this.drawSunShroomGraphics(ctx, plant);
    } else if (plant.type === 'goo_peashooter') {
      this.drawGooPeashooterGraphics(ctx, plant);
    } else if (plant.type === 'hypno_shroom') {
      this.drawHypnoShroomGraphics(ctx, plant);
    } else if (plant.type === 'potato_mine') {
      this.drawPotatoMineGraphics(ctx, plant);
    } else if (plant.type === 'magnet_shroom') {
      this.drawMagnetShroomGraphics(ctx, plant);
    } else if (plant.type === 'tall_nut') {
      this.drawTallNutGraphics(ctx, plant);
    } else if (plant.type === 'kernel_pult') {
      this.drawKernelPultGraphics(ctx, plant);
    } else if (plant.type === 'spikeweed') {
      this.drawSpikeweedGraphics(ctx, plant);
    } else if (plant.type === 'spring_bean') {
      this.drawSpringBeanGraphics(ctx, plant);
    } else if (plant.type === 'iceberg_lettuce') {
      this.drawIcebergLettuceGraphics(ctx, plant);
    } else if (plant.type === 'fume_shroom') {
      this.drawFumeShroomGraphics(ctx, plant);
    } else if (plant.type === 'laser_bean') {
      this.drawLaserBeanGraphics(ctx, plant);
    } else if (plant.type === 'squash') {
      this.drawSquashGraphics(ctx, plant);
    } else if (plant.type === 'galio') {
      this.drawGalioGraphics(ctx, plant);
    } else if (plant.type === 'jhinplant') {
      this.drawJhinplantGraphics(ctx, plant);
    } else if (plant.type === 'blover') {
      this.drawBloverGraphics(ctx, plant);
    } else if (plant.type === 'lux') {
      this.drawLuxGraphics(ctx, plant);
    } else if (plant.type === 'syndra') {
      this.drawSyndraGraphics(ctx, plant);
    } else if (plant.type === 'kata') {
      this.drawKataGraphics(ctx, plant);
    } else if (plant.type === 'aurora') {
      this.drawAuroraGraphics(ctx, plant);
    } else if (plant.type === 'ahri') {
      this.drawAhriGraphics(ctx, plant);
    } else if (plant.type === 'irelia') {
      this.drawIreliaGraphics(ctx, plant);
    } else if (plant.type === 'karma') {
      this.drawKarmaGraphics(ctx, plant);
    } else {
      this.drawGenericPlantGraphics(ctx, plant);
    }
  }

  drawStormCloud(ctx, cloud) {
    ctx.save();
    ctx.translate(cloud.x, cloud.y);
    // Đám mây giông bão xám đậm
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.arc(-16, 0, 14, 0, Math.PI * 2);
    ctx.arc(0, -6, 18, 0, Math.PI * 2);
    ctx.arc(16, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // Viền sấm sét phát sáng cyan
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Tia chớp nhỏ dưới đáy mây giật sét
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.moveTo(-4, 8); ctx.lineTo(2, 14); ctx.lineTo(-1, 14); ctx.lineTo(3, 20);
    ctx.lineTo(-2, 16); ctx.lineTo(0, 16); ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // 1. Sậy Sét (Lightning Reed - PvZ 2 Style)
  drawLightningReedGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 4.0;
    const sway = Math.sin(time) * 1.8;
    const isAttacking = plant.state === 'shooting';

    // Rễ cây lá cỏ tươi tốt bám đất
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.ellipse(-8, 20, 8, 4, -0.3, 0, Math.PI * 2);
    ctx.ellipse(8, 20, 8, 4, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // 3 thân sậy mảnh mai màu xanh lục tươi
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';

    // Nhánh trái
    ctx.beginPath();
    ctx.moveTo(-3, 20);
    ctx.quadraticCurveTo(-10, 6, -8 + sway * 0.7, -4);
    ctx.stroke();

    // Nhánh phải
    ctx.beginPath();
    ctx.moveTo(3, 20);
    ctx.quadraticCurveTo(10, 6, 8 + sway * 0.7, -4);
    ctx.stroke();

    // Thân chính giữa
    ctx.strokeStyle = '#4caf50';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.quadraticCurveTo(sway * 0.5, 4, sway, -14);
    ctx.stroke();

    // Bông sậy điện & chỏm tích điện phát sáng cyan
    ctx.fillStyle = '#e0f7fa';
    ctx.beginPath();
    ctx.arc(sway, -16, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00bcd4';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Cuộn dây kim loại dẫn sét màu vàng kim
    ctx.strokeStyle = '#fbc02d';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(sway, -16, 12, -0.8, 0.8);
    ctx.stroke();

    // Quả cầu năng lượng sấm sét phát sáng rực rỡ
    const pulse = 1.0 + Math.sin(time * 2) * 0.15;
    ctx.fillStyle = isAttacking ? '#00e5ff' : '#18ffff';
    ctx.beginPath();
    ctx.arc(sway, -16, 5.5 * pulse, 0, Math.PI * 2);
    ctx.fill();

    // Tia sét nhỏ crackling trên đỉnh đầu
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(sway - 2, -26);
    ctx.lineTo(sway + 3, -20);
    ctx.lineTo(sway, -20);
    ctx.lineTo(sway + 4, -14);
    ctx.stroke();

    // Đôi mắt hoạt hình dễ thương
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sway - 3, -16, 2.8, 0, Math.PI * 2);
    ctx.arc(sway + 3, -16, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#006064';
    ctx.beginPath();
    ctx.arc(sway - 2.5, -16, 1.5, 0, Math.PI * 2);
    ctx.arc(sway + 3.5, -16, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sway - 3, -17, 0.8, 0, Math.PI * 2);
    ctx.arc(sway + 3, -17, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Hành Choáng (Stunion - PvZ 2 Style)
  drawStunionGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3.0;
    const squish = Math.sin(time) * 0.06;

    ctx.save();
    ctx.scale(1 + squish, 1 - squish);

    // Rễ củ hành nhỏ bám đất
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-5, 18); ctx.lineTo(-7, 24);
    ctx.moveTo(0, 18); ctx.lineTo(0, 25);
    ctx.moveTo(5, 18); ctx.lineTo(7, 24);
    ctx.stroke();

    // Củ hành tròn múp míp màu vàng ấm
    const onionGrad = ctx.createRadialGradient(-3, 2, 3, 0, 4, 18);
    onionGrad.addColorStop(0, '#fff59d');
    onionGrad.addColorStop(0.5, '#fbc02d');
    onionGrad.addColorStop(1, '#f57f17');
    ctx.fillStyle = onionGrad;
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 17, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Các đường vân múi hành cong tự nhiên
    ctx.strokeStyle = 'rgba(230, 81, 0, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-6, 4, 7, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(6, 4, 7, 16, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Chùm lá mầm xanh non tươi tắn trên đỉnh đầu
    ctx.fillStyle = '#7cb342';
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.quadraticCurveTo(-10, -26, -5, -28);
    ctx.quadraticCurveTo(-2, -18, 0, -13);
    ctx.quadraticCurveTo(2, -18, 5, -28);
    ctx.quadraticCurveTo(10, -26, 0, -13);
    ctx.fill();
    ctx.strokeStyle = '#558b2f';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Má hồng đáng yêu
    ctx.fillStyle = 'rgba(255, 112, 67, 0.55)';
    ctx.beginPath();
    ctx.arc(-9, 7, 3, 0, Math.PI * 2);
    ctx.arc(9, 7, 3, 0, Math.PI * 2);
    ctx.fill();

    // Đôi mắt to tròn ngái ngủ ngộ nghĩnh
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-5, 2, 4.5, 5, 0, 0, Math.PI * 2);
    ctx.ellipse(5, 2, 4.5, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Con ngươi to đen láy
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(-4, 2.5, 2.5, 0, Math.PI * 2);
    ctx.arc(6, 2.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Đốm sáng long lanh
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5, 1.5, 1.0, 0, Math.PI * 2);
    ctx.arc(5, 1.5, 1.0, 0, Math.PI * 2);
    ctx.fill();

    // Miệng cười nhỏ chúm chím
    ctx.strokeStyle = '#bf360c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 9, 3, 0.2, Math.PI - 0.2);
    ctx.stroke();

    ctx.restore();
  }

  // 3. Hạt Dẻ Hologram (Infi-nut - PvZ 2 Sci-Fi Style)
  drawInfiNutGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3.0;
    const pulse = Math.sin(time) * 0.08;

    // Bệ máy chiếu công nghệ tương lai bằng kim loại titan
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.roundRect(-18, 16, 36, 10, 4);
    ctx.fill();
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Đèn LED hiển thị trạng thái
    ctx.fillStyle = plant.isRecharging ? '#ffca28' : '#00e5ff';
    ctx.beginPath();
    ctx.arc(0, 21, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (plant.isRecharging) {
      // Đang tái nạp: Vòng xoay nạp hologram 15s hồi sinh
      const remainingSec = Math.max(1, Math.ceil(plant.rechargeTimer || 0));
      const progress = 1 - Math.max(0, Math.min(1, (plant.rechargeTimer || 0) / 15.0));

      ctx.save();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 6, 16, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
      ctx.stroke();

      // Nón tia chiếu hologram nhẹ
      ctx.fillStyle = 'rgba(0, 229, 255, 0.18)';
      ctx.beginPath();
      ctx.moveTo(-12, 16); ctx.lineTo(12, 16); ctx.lineTo(16, -2); ctx.lineTo(-16, -2);
      ctx.closePath();
      ctx.fill();

      // Đồng hồ đếm ngược 15s
      ctx.fillStyle = '#00e5ff';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ ${remainingSec}s`, 0, -6);
      ctx.restore();
      return;
    }

    // Hologram Hạt Dẻ màu xanh ngọc Cyan trong suốt
    ctx.save();
    ctx.globalAlpha = 0.82 + pulse;

    // Luồng ánh sáng phát chiếu từ bệ máy
    const beamGrad = ctx.createLinearGradient(0, 16, 0, -18);
    beamGrad.addColorStop(0, 'rgba(0, 229, 255, 0.45)');
    beamGrad.addColorStop(1, 'rgba(0, 229, 255, 0.08)');
    ctx.fillStyle = beamGrad;
    ctx.beginPath();
    ctx.moveTo(-14, 16); ctx.lineTo(14, 16); ctx.lineTo(18, -18); ctx.lineTo(-18, -18);
    ctx.closePath();
    ctx.fill();

    // Thân hạt dẻ Hologram phát quang
    ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.beginPath();
    ctx.roundRect(-15, -18, 30, 34, 12);
    ctx.fill();
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // Các đường quét scanline kỹ thuật số
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-12, -10 + Math.sin(time * 4) * 8);
    ctx.lineTo(12, -10 + Math.sin(time * 4) * 8);
    ctx.moveTo(-12, -2 + Math.sin(time * 4) * 8);
    ctx.lineTo(12, -2 + Math.sin(time * 4) * 8);
    ctx.stroke();

    // Mắt hologram vui vẻ
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5, -6, 3, 0, Math.PI * 2);
    ctx.arc(5, -6, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#006064';
    ctx.beginPath();
    ctx.arc(-4.5, -6, 1.8, 0, Math.PI * 2);
    ctx.arc(5.5, -6, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Nụ cười hologram
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -1, 3.5, 0.1, Math.PI - 0.1);
    ctx.stroke();

    ctx.restore();
  }

  // 4. Nấm Mặt Trời (Sun-shroom - PvZ 2 Style)
  drawSunShroomGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3.0;
    const sway = Math.sin(time) * 1.1;
    const stage = plant.stage || 1;
    const scale = stage === 1 ? 0.78 : (stage === 2 ? 1.0 : 1.22);

    ctx.save();
    ctx.scale(scale, scale);

    // Hào quang vàng ấm áp khi sắp sản xuất mặt trời
    if (plant.glow && plant.glow > 0) {
      ctx.fillStyle = `rgba(255, 235, 59, ${plant.glow * 0.5})`;
      ctx.beginPath();
      ctx.arc(sway, -2, 26, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chân cuống nấm mũm mĩm màu kem ngà
    const stalkGrad = ctx.createLinearGradient(-9, 0, 9, 22);
    stalkGrad.addColorStop(0, '#fffde7');
    stalkGrad.addColorStop(0.6, '#fff3cd');
    stalkGrad.addColorStop(1, '#ffe082');
    ctx.fillStyle = stalkGrad;
    ctx.beginPath();
    ctx.moveTo(-8, 1);
    ctx.quadraticCurveTo(-11, 14, -8, 21);
    ctx.quadraticCurveTo(0, 23, 8, 21);
    ctx.quadraticCurveTo(11, 14, 8, 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#d9822b';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Mặt dưới vành mũ nấm (Bóng gân nấm màu cam ấm)
    ctx.fillStyle = '#e69500';
    ctx.beginPath();
    ctx.ellipse(sway, 1, 20, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b26a00';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Mũ nấm hình ô loe lượn sóng màu vàng rực rỡ
    const capGrad = ctx.createRadialGradient(sway - 4, -12, 2, sway, -4, 23);
    capGrad.addColorStop(0, '#ffff8d');
    capGrad.addColorStop(0.45, '#ffd54f');
    capGrad.addColorStop(0.85, '#ffb300');
    capGrad.addColorStop(1, '#f57c00');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.moveTo(sway - 21, 1);
    ctx.bezierCurveTo(sway - 22, -16, sway - 10, -21, sway, -21);
    ctx.bezierCurveTo(sway + 10, -21, sway + 22, -16, sway + 21, 1);
    ctx.bezierCurveTo(sway + 12, 4, sway + 5, 2, sway, 3);
    ctx.bezierCurveTo(sway - 5, 2, sway - 12, 4, sway - 21, 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Các đốm tròn kem sáng ấm trên mũ nấm
    ctx.fillStyle = '#fff9c4';
    ctx.beginPath();
    ctx.ellipse(sway - 10, -6, 3.6, 2.8, -0.3, 0, Math.PI * 2);
    ctx.ellipse(sway + 10, -6, 3.6, 2.8, 0.3, 0, Math.PI * 2);
    ctx.arc(sway - 1, -13, 3.3, 0, Math.PI * 2);
    ctx.arc(sway + 6, -12, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // Đôi mắt (Stage 1: Mắt lim dim ngái ngủ; Stage 2+: Mắt mở to sáng rạng rỡ)
    if (stage === 1) {
      ctx.strokeStyle = '#4e342e';
      ctx.lineWidth = 1.8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(sway - 4.2, 10, 2.8, 0.15, Math.PI - 0.15);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(sway + 4.2, 10, 2.8, 0.15, Math.PI - 0.15);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(sway - 4.2, 10, 3.3, 4.2, 0, 0, Math.PI * 2);
      ctx.ellipse(sway + 4.2, 10, 3.3, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      ctx.fillStyle = '#3e2723';
      ctx.beginPath();
      ctx.arc(sway - 3.6, 10, 2.0, 0, Math.PI * 2);
      ctx.arc(sway + 4.8, 10, 2.0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(sway - 4.5, 8.8, 1.0, 0, Math.PI * 2);
      ctx.arc(sway + 3.9, 8.8, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Má hồng và nụ cười nhỏ
    ctx.fillStyle = 'rgba(255, 112, 67, 0.45)';
    ctx.beginPath();
    ctx.arc(sway - 7.5, 13.5, 2.0, 0, Math.PI * 2);
    ctx.arc(sway + 7.5, 13.5, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#bf360c';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sway, 14.5, 2.6, 0.15, Math.PI - 0.15);
    ctx.stroke();

    ctx.restore();
  }

  // 5. Đậu Độc (Goo Peashooter - PvZ 2 Style)
  drawGooPeashooterGraphics(ctx, plant) {
    const isShooting = plant.state === 'shooting';
    const squishX = isShooting ? 1.25 : 1.0;
    const squishY = isShooting ? 0.82 : 1.0;
    const time = (plant.animTime || 0) * 3.5;
    const sway = Math.sin(time) * 1.5;

    // Rễ cây lá tím uốn lượn mềm mại
    ctx.fillStyle = '#4a148c';
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7b1fa2';
    ctx.beginPath();
    ctx.ellipse(-10, 21, 8, 4, -0.2, 0, Math.PI * 2);
    ctx.ellipse(10, 21, 8, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Thân cây màu tím đậm
    ctx.strokeStyle = '#6a1b9a';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(-4, 8, sway * 0.5, -2);
    ctx.stroke();

    // Đầu Đậu Độc màu tím bóng bẩy
    ctx.save();
    ctx.translate(sway, -6);
    ctx.scale(squishX, squishY);

    // Chiếc lá cong điệu đà sau gáy
    ctx.fillStyle = '#9c27b0';
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.quadraticCurveTo(-22, -12, -18, 0);
    ctx.quadraticCurveTo(-14, 2, -8, 2);
    ctx.closePath();
    ctx.fill();

    // Đầu tròn tím bóng mượt
    const headGrad = ctx.createRadialGradient(-3, -3, 3, 0, 0, 16);
    headGrad.addColorStop(0, '#ce93d8');
    headGrad.addColorStop(0.5, '#ab47bc');
    headGrad.addColorStop(1, '#6a1b9a');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4a148c';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Nòng bắn màu xanh nõn chuối ngọc phát quang (Toxic Lime Spout)
    const snoutGrad = ctx.createLinearGradient(10, -8, 22, 8);
    snoutGrad.addColorStop(0, '#b2ff59');
    snoutGrad.addColorStop(1, '#64dd17');
    ctx.fillStyle = snoutGrad;
    ctx.beginPath();
    ctx.ellipse(15, 0, 6.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#33691e';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Họng súng sâu
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.ellipse(15, 0, 3.5, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Giọt chất độc xanh lá bóng rỉ ở mép họng
    ctx.fillStyle = '#76ff03';
    ctx.beginPath();
    ctx.arc(19, 5 + Math.sin(time * 3) * 1.5, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Đôi mắt to tròn hoạt hình ngộ nghĩnh
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(3, -5, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#311b92';
    ctx.beginPath();
    ctx.arc(4, -5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3.5, -6, 1.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 6. Hướng Dương (Sunflower - PvZ 2 Style)
  drawSunflowerGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3.0;
    const sway = Math.sin(time) * 1.5;

    // Rễ và lá cỏ xanh mướt bám đất
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.ellipse(-10, 21, 9, 4.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(10, 21, 9, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Thân cây xanh mềm mại đung đưa
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(sway * 0.5, 10, sway, 0);
    ctx.stroke();

    // Hai chiếc lá xanh mượt hai bên thân
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(sway - 7, 12, 7, 3.5, -0.4, 0, Math.PI * 2);
    ctx.ellipse(sway + 7, 12, 7, 3.5, 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Hào quang vàng óng ả khi chuẩn bị sinh mặt trời
    if (plant.glow && plant.glow > 0) {
      ctx.save();
      ctx.globalAlpha = plant.glow * 0.55;
      const sunGlow = ctx.createRadialGradient(sway, -2, 4, sway, -2, 32);
      sunGlow.addColorStop(0, '#fff59d');
      sunGlow.addColorStop(0.6, '#ffd54f');
      sunGlow.addColorStop(1, 'rgba(255, 179, 0, 0)');
      ctx.fillStyle = sunGlow;
      ctx.beginPath();
      ctx.arc(sway, -2, 32, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 16 Cánh hoa vàng rực rỡ xếp tròn đều quanh nhụy
    const petalCount = 16;
    for (let i = 0; i < petalCount; i++) {
      const angle = (i * Math.PI * 2) / petalCount + Math.sin(time * 0.8) * 0.05;
      const px = sway + Math.cos(angle) * 17;
      const py = -2 + Math.sin(angle) * 17;

      // Cánh hoa bầu tròn với gradient vàng tươi
      ctx.fillStyle = i % 2 === 0 ? '#fbc02d' : '#fdd835';
      ctx.beginPath();
      ctx.arc(px, py, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f57f17';
      ctx.lineWidth = 1.0;
      ctx.stroke();
    }

    // Nhụy hoa tròn màu nâu ấm áp (Warm caramel seed disc)
    const faceGrad = ctx.createRadialGradient(sway - 3, -5, 2, sway, -2, 14);
    faceGrad.addColorStop(0, '#8d6e63');
    faceGrad.addColorStop(0.7, '#6d4c41');
    faceGrad.addColorStop(1, '#4e342e');
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(sway, -2, 13.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Hai đốm má hồng cam dễ thương
    ctx.fillStyle = 'rgba(255, 138, 101, 0.6)';
    ctx.beginPath();
    ctx.arc(sway - 7, 2, 2.8, 0, Math.PI * 2);
    ctx.arc(sway + 7, 2, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Đôi mắt to tròn đen láy với đốm sáng long lanh
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(sway - 4, -3, 3.2, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(sway + 4, -3, 3.2, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(sway - 3.8, -3, 2.5, 0, Math.PI * 2);
    ctx.arc(sway + 4.2, -3, 2.5, 0, Math.PI * 2);
    ctx.fill();
    // Đốm sáng tinh nghịch
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(sway - 4.5, -4, 1.1, 0, Math.PI * 2);
    ctx.arc(sway + 3.5, -4, 1.1, 0, Math.PI * 2);
    ctx.arc(sway - 3.2, -2, 0.6, 0, Math.PI * 2);
    ctx.arc(sway + 4.8, -2, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Nụ cười tươi rói thân thiện
    ctx.strokeStyle = '#271005';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(sway, 2, 3.8, 0.1, Math.PI - 0.1);
    ctx.stroke();
  }

  // 7. Đậu Bắn Súng (Peashooter - PvZ 2 Style)
  drawPeashooterGraphics(ctx, plant) {
    const isShooting = plant.state === 'shooting';
    const squishX = isShooting ? 1.28 : 1.0;
    const squishY = isShooting ? 0.82 : 1.0;
    const time = (plant.animTime || 0) * 3.5;
    const sway = Math.sin(time) * 1.5;

    // Rễ cây bám đất
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.ellipse(-10, 21, 9, 4.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(10, 21, 9, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Thân cây xanh bóng uốn lượn
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(-4, 10, sway * 0.5, -2);
    ctx.stroke();

    // Đầu hạt đậu tròn trịa
    ctx.save();
    ctx.translate(sway, -6);
    ctx.scale(squishX, squishY);

    // Chiếc lá nhỏ cong vuốt sau gáy
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.quadraticCurveTo(-22, -14, -18, 0);
    ctx.quadraticCurveTo(-14, 2, -8, 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Đầu tròn màu xanh nõn chuối mượt mà
    const headGrad = ctx.createRadialGradient(-3, -3, 3, 0, 0, 16);
    headGrad.addColorStop(0, '#81c784');
    headGrad.addColorStop(0.5, '#4caf50');
    headGrad.addColorStop(1, '#2e7d32');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Nòng bắn hình trụ tròn
    const snoutGrad = ctx.createLinearGradient(10, -8, 22, 8);
    snoutGrad.addColorStop(0, '#66bb6a');
    snoutGrad.addColorStop(1, '#388e3c');
    ctx.fillStyle = snoutGrad;
    ctx.beginPath();
    ctx.ellipse(15, 0, 6.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Miệng nòng sâu bên trong
    ctx.fillStyle = '#0f3a14';
    ctx.beginPath();
    ctx.ellipse(15, 0, 3.8, 5.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đôi mắt to tròn hoạt hình ngộ nghĩnh
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(3, -5, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(4, -5, 2.6, 0, Math.PI * 2);
    ctx.fill();
    // Đốm sáng phản chiếu
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3.5, -6, 1.1, 0, Math.PI * 2);
    ctx.arc(4.8, -4, 0.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- 8. Đậu Băng (Snow Pea - PvZ 2 Style) ---
  drawSnowPeaGraphics(ctx, plant) {
    const isShooting = plant.state === 'shooting';
    const squishX = isShooting ? 1.28 : 1.0;
    const squishY = isShooting ? 0.82 : 1.0;
    const time = (plant.animTime || 0) * 3.5;
    const sway = Math.sin(time) * 1.5;

    // Rễ cây bám đất
    ctx.fillStyle = '#006064';
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00838f';
    ctx.beginPath();
    ctx.ellipse(-10, 21, 9, 4.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(10, 21, 9, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Thân cây xanh băng lạnh
    ctx.strokeStyle = '#00acc1';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(-4, 10, sway * 0.5, -2);
    ctx.stroke();

    ctx.save();
    ctx.translate(sway, -6);
    ctx.scale(squishX, squishY);

    // Chùm gai băng pha lê sắc nhọn phía sau gáy
    ctx.fillStyle = '#b2ebf2';
    ctx.beginPath();
    ctx.moveTo(-10, -14); ctx.lineTo(-24, -20); ctx.lineTo(-14, -8);
    ctx.moveTo(-8, -6); ctx.lineTo(-22, -6); ctx.lineTo(-10, 2);
    ctx.moveTo(-8, 2); ctx.lineTo(-18, 8); ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#00bcd4';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Đầu hình cầu băng ngọc xanh biếc rực rỡ
    const headGrad = ctx.createRadialGradient(-3, -3, 3, 0, 0, 16);
    headGrad.addColorStop(0, '#e0f7fa');
    headGrad.addColorStop(0.5, '#4dd0e1');
    headGrad.addColorStop(1, '#00838f');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#006064';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Nòng bắn đạn băng pha lê
    const snoutGrad = ctx.createLinearGradient(10, -8, 22, 8);
    snoutGrad.addColorStop(0, '#80deea');
    snoutGrad.addColorStop(1, '#00acc1');
    ctx.fillStyle = snoutGrad;
    ctx.beginPath();
    ctx.ellipse(15, 0, 6.5, 8.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#006064';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Họng súng băng sâu
    ctx.fillStyle = '#004d40';
    ctx.beginPath();
    ctx.ellipse(15, 0, 3.8, 5.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đôi mắt xanh băng sáng long lanh
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(3, -5, 4, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#006064';
    ctx.beginPath();
    ctx.arc(4, -5, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#80deea';
    ctx.beginPath();
    ctx.arc(3.5, -6, 1.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- 9. Đậu Nòng Đôi (Repeater - PvZ 2 Style) ---
  drawRepeaterGraphics(ctx, plant) {
    const isShooting = plant.state === 'shooting';
    const squishX = isShooting ? 1.28 : 1.0;
    const squishY = isShooting ? 0.82 : 1.0;
    const time = (plant.animTime || 0) * 3.5;
    const sway = Math.sin(time) * 1.5;

    // Rễ cây bám đất
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.ellipse(0, 22, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(-10, 21, 9, 4.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(10, 21, 9, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Thân cây xanh lục đậm
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(-4, 10, sway * 0.5, -2);
    ctx.stroke();

    ctx.save();
    ctx.translate(sway, -6);
    ctx.scale(squishX, squishY);

    // 2 chiếc lá mào gập nhọn ngầu phía sau (Iconic Repeater Mohawk)
    ctx.fillStyle = '#388e3c';
    ctx.beginPath();
    ctx.moveTo(-10, -14); ctx.lineTo(-24, -22); ctx.lineTo(-12, -8);
    ctx.moveTo(-8, -6); ctx.lineTo(-22, -10); ctx.lineTo(-10, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Đầu hạt đậu màu xanh ngọc bích đậm
    const headGrad = ctx.createRadialGradient(-3, -3, 3, 0, 0, 16);
    headGrad.addColorStop(0, '#66bb6a');
    headGrad.addColorStop(0.5, '#2e7d32');
    headGrad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 15.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0d3813';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Nòng bắn kép kiên cố
    const snoutGrad = ctx.createLinearGradient(10, -8, 24, 8);
    snoutGrad.addColorStop(0, '#4caf50');
    snoutGrad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = snoutGrad;
    ctx.beginPath();
    ctx.ellipse(16, 0, 7.5, 9.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0d3813';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Họng súng sâu
    ctx.fillStyle = '#061d09';
    ctx.beginPath();
    ctx.ellipse(16, 0, 4.2, 6.2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đôi mắt kiên định, tự tin ngầu lòi
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(3, -5, 4, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.arc(4, -5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3.5, -6, 1.0, 0, Math.PI * 2);
    ctx.fill();

    // Lông mày nghiêm nghị, quyết đoán
    ctx.strokeStyle = '#0d3813';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(8, -8);
    ctx.stroke();

    ctx.restore();
  }

  // --- 10. Bắp Cải (Cabbage-pult - PvZ 2 Style) ---
  drawCabbagePultGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3.0;
    const isShooting = plant.state === 'shooting';
    const armAngle = isShooting ? 0.55 : -0.15 + Math.sin(time) * 0.06;
    const bob = Math.sin(time) * 1.0;

    ctx.save();

    // 1. Đài lá bắp cải xòe xanh đậm bám đất
    ctx.fillStyle = '#2e7d32';
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.5;
    for (const leaf of [{ x: -13, y: 17, rx: 11, ry: 5.5, a: -0.35 }, { x: 13, y: 17, rx: 11, ry: 5.5, a: 0.35 }, { x: 0, y: 19, rx: 13, ry: 5.5, a: 0 }]) {
      ctx.beginPath();
      ctx.ellipse(leaf.x, leaf.y, leaf.rx, leaf.ry, leaf.a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 2. Cuống dây leo máy bắn đá vươn lên từ sau thân bắp cải
    ctx.save();
    ctx.translate(-4, 4 + bob);
    ctx.rotate(armAngle);

    ctx.strokeStyle = '#558b2f';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.quadraticCurveTo(-14, -10, -14, -24);
    ctx.stroke();

    // Đài lá đỡ bắp cải trên đầu cần bắn
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.ellipse(-14, -22, 10, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Quả bắp cải đạn nằm gọn trong chén lá (giống hệt đạn bắp cải)
    const ammoGrad = ctx.createRadialGradient(-16, -29, 1.5, -14, -27, 9);
    ammoGrad.addColorStop(0, '#e8f5e9');
    ammoGrad.addColorStop(0.5, '#81c784');
    ammoGrad.addColorStop(1, '#388e3c');
    ctx.fillStyle = ammoGrad;
    ctx.beginPath();
    ctx.arc(-14, -27, 8.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Đường gân lá cuộn tròn trên quả bắp cải đạn
    ctx.strokeStyle = '#c8e6c9';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-15, -27, 5, -0.5, 2.4);
    ctx.moveTo(-10, -31); ctx.quadraticCurveTo(-14, -26, -19, -29);
    ctx.stroke();

    ctx.restore();

    // 3. Thân chính: Bắp Cải tròn múp nhiều tầng lá xanh non cuộn chặt
    ctx.save();
    ctx.translate(2, 6 + bob);

    const cabGrad = ctx.createRadialGradient(-4, -5, 2, 0, 0, 17);
    cabGrad.addColorStop(0, '#c8e6c9');
    cabGrad.addColorStop(0.55, '#81c784');
    cabGrad.addColorStop(1, '#388e3c');
    ctx.fillStyle = cabGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.9;
    ctx.stroke();

    // Lớp lá bắp cải cuộn ôm 2 bên & gân lá trắng xanh nhạt đặc trưng
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-14, -4); ctx.quadraticCurveTo(-5, 2, -6, 13);
    ctx.moveTo(14, -3); ctx.quadraticCurveTo(6, 2, 7, 13);
    ctx.stroke();

    ctx.strokeStyle = '#e8f5e9';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-10, -8); ctx.quadraticCurveTo(-4, -12, 3, -10);
    ctx.moveTo(-12, 2); ctx.quadraticCurveTo(-8, 6, -5, 11);
    ctx.stroke();

    // Chỏm lá xoăn trên đỉnh đầu bắp cải
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(-2, -13, 6, 3.2, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Đôi mắt to tròn thân thiện nhìn sang phải
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-1, -1, 3.4, 4.2, 0, 0, Math.PI * 2);
    ctx.ellipse(7, -1, 3.4, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.fillStyle = '#1b2621';
    ctx.beginPath();
    ctx.arc(0, -1, 1.9, 0, Math.PI * 2);
    ctx.arc(8, -1, 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-0.8, -2.2, 0.9, 0, Math.PI * 2);
    ctx.arc(7.2, -2.2, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Nụ cười tự tin
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(3.5, 4.5, 3.2, 0.15, Math.PI - 0.15);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // --- 11. Dưa Hấu (Melon-pult - PvZ 2 Style) ---
  drawMelonPultGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 2.8;
    const isShooting = plant.state === 'shooting';
    const armAngle = isShooting ? 0.55 : -0.14 + Math.sin(time) * 0.05;
    const bob = Math.sin(time) * 0.9;

    ctx.save();

    // 1. Đế lá dưa hấu bản to xanh thẫm bám đất
    ctx.fillStyle = '#1b5e20';
    ctx.strokeStyle = '#0a330e';
    ctx.lineWidth = 1.5;
    for (const leaf of [{ x: -15, y: 18, rx: 12, ry: 5, a: -0.3 }, { x: 15, y: 18, rx: 12, ry: 5, a: 0.3 }, { x: 0, y: 20, rx: 14, ry: 5, a: 0 }]) {
      ctx.beginPath();
      ctx.ellipse(leaf.x, leaf.y, leaf.rx, leaf.ry, leaf.a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // 2. Cần dây leo chắc khỏe phía sau nâng quả dưa hấu đạn
    ctx.save();
    ctx.translate(-5, 3 + bob);
    ctx.rotate(armAngle);

    ctx.strokeStyle = '#33691e';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 5);
    ctx.quadraticCurveTo(-15, -10, -14, -24);
    ctx.stroke();

    // Giá đỡ lá & gỗ nhỏ
    ctx.fillStyle = '#6d4c41';
    ctx.beginPath();
    ctx.ellipse(-14, -22, 11, 4.5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Quả dưa hấu đạn to tròn có sọc xanh đậm rõ rệt
    const ammoMelonGrad = ctx.createRadialGradient(-16, -30, 2, -14, -28, 12);
    ammoMelonGrad.addColorStop(0, '#a5d6a7');
    ammoMelonGrad.addColorStop(0.45, '#43a047');
    ammoMelonGrad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = ammoMelonGrad;
    ctx.beginPath();
    ctx.ellipse(-14, -28, 11.5, 9, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a330e';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Sọc zíc-zắc dưa hấu đậm nét trên đạn
    ctx.strokeStyle = '#0d3b12';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-22, -29); ctx.quadraticCurveTo(-14, -34, -6, -30);
    ctx.moveTo(-23, -26); ctx.quadraticCurveTo(-14, -26, -5, -27);
    ctx.moveTo(-21, -23); ctx.quadraticCurveTo(-14, -20, -7, -24);
    ctx.stroke();

    ctx.restore();

    // 3. Thân chính: Quả Dưa Hấu khổng lồ múp míp có sọc vằn đặc trưng
    ctx.save();
    ctx.translate(2, 6 + bob);

    const bodyGrad = ctx.createRadialGradient(-5, -5, 3, 0, 0, 20);
    bodyGrad.addColorStop(0, '#81c784');
    bodyGrad.addColorStop(0.5, '#388e3c');
    bodyGrad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 19, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a330e';
    ctx.lineWidth = 2.1;
    ctx.stroke();

    // Các dải sọc dọc đậm đặc trưng của quả dưa hấu
    ctx.strokeStyle = '#0d3b12';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, -11); ctx.quadraticCurveTo(-15, 0, -11, 12);
    ctx.moveTo(-4, -14); ctx.quadraticCurveTo(-6, -1, -3, 14);
    ctx.moveTo(5, -14); ctx.quadraticCurveTo(3, -1, 6, 14);
    ctx.moveTo(13, -10); ctx.quadraticCurveTo(16, 0, 12, 11);
    ctx.stroke();

    // Đốm sáng bóng trên vỏ dưa
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(-6, -9, 6, 2.4, -0.2, 0, Math.PI * 2);
    ctx.fill();

    // Khuôn mặt ngầu lòi điềm tĩnh trên thân dưa hấu
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(0, -1, 3.6, 4.3, 0, 0, Math.PI * 2);
    ctx.ellipse(9, -1, 3.6, 4.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0a330e';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Lông mày điềm tĩnh hơi nhíu
    ctx.strokeStyle = '#0a330e';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(-4, -6); ctx.lineTo(3, -4.5);
    ctx.moveTo(13, -6); ctx.lineTo(6, -4.5);
    ctx.stroke();

    ctx.fillStyle = '#1b2621';
    ctx.beginPath();
    ctx.arc(1.2, -0.8, 2.0, 0, Math.PI * 2);
    ctx.arc(10.2, -0.8, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0.4, -2.0, 0.9, 0, Math.PI * 2);
    ctx.arc(9.4, -2.0, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Miệng mỉm tự tin
    ctx.strokeStyle = '#0a330e';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(2, 6);
    ctx.quadraticCurveTo(5.5, 8, 9, 5.5);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // --- 12. Đấm Bốc (Bonk Choy - PvZ 2 Style) ---
  drawBonkChoyGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 4.0;
    const isPunching = plant.state === 'shooting' || (plant.punchAnimTimer && plant.punchAnimTimer > 0);
    const punchPhase = Math.sin(time * 3);
    const jabProgress = plant.punchAnimTimer > 0 ? Math.min(1, plant.punchAnimTimer / 0.16) : 0;
    const jabBoost = jabProgress > 0 ? Math.sin(jabProgress * Math.PI) * 15 : 0;
    const frontOffset = (isPunching ? (punchPhase > 0 ? 13 : -3) : Math.sin(time) * 1.5) + jabBoost;
    const backOffset = isPunching ? (punchPhase <= 0 ? 12 : -3) : -Math.sin(time) * 1.5;

    ctx.save();
    if (plant.punchDir === -1) {
      ctx.scale(-1, 1);
    }

    // 1. Hai lá gốc xòe bám đất
    ctx.fillStyle = '#388e3c';
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(-10, 20, 9, 4, -0.25, 0, Math.PI * 2);
    ctx.ellipse(10, 20, 9, 4, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Nắm đấm tay sau (găng tay đấm bốc xanh lá vung phía sau / trái)
    ctx.save();
    ctx.translate(-14 + backOffset * 0.6, 2);
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(8, 6);
    ctx.quadraticCurveTo(2, 5, -2, 0);
    ctx.stroke();

    // Cổ tay lá & găng đấm
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.ellipse(-3, 0, 7.5, 6.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.6;
    ctx.stroke();
    // Ngón cái găng đấm
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(1, -4, 3.2, 2.4, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Tán lá cải thìa xòe dựng đứng trên đỉnh đầu (Bok Choy Leaf Crown)
    const crestLeaves = [
      { x: -11, y: -15, rx: 6.5, ry: 11, rot: -0.45, c: '#2e7d32' },
      { x: 11, y: -15, rx: 6.5, ry: 11, rot: 0.45, c: '#2e7d32' },
      { x: -5, y: -18, rx: 6.5, ry: 12, rot: -0.18, c: '#43a047' },
      { x: 5, y: -18, rx: 6.5, ry: 12, rot: 0.18, c: '#43a047' },
      { x: 0, y: -19, rx: 6.5, ry: 12.5, rot: 0, c: '#66bb6a' }
    ];
    for (const lf of crestLeaves) {
      ctx.save();
      ctx.translate(lf.x, lf.y);
      ctx.rotate(lf.rot);
      ctx.fillStyle = lf.c;
      ctx.beginPath();
      ctx.ellipse(0, 0, lf.rx, lf.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1b5e20';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      // Gân lá sáng
      ctx.strokeStyle = '#a5d6a7';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(0, -7);
      ctx.stroke();
      ctx.restore();
    }

    // 4. Thân bẹ cải thìa (thân bầu màu xanh nõn chuối -> xanh lá)
    const bodyGrad = ctx.createLinearGradient(0, -14, 0, 21);
    bodyGrad.addColorStop(0, '#66bb6a');
    bodyGrad.addColorStop(0.45, '#aed581');
    bodyGrad.addColorStop(1, '#dce775');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.moveTo(-11, -11);
    ctx.quadraticCurveTo(-15, 6, -10, 20);
    ctx.quadraticCurveTo(0, 23, 10, 20);
    ctx.quadraticCurveTo(15, 6, 11, -11);
    ctx.quadraticCurveTo(0, -14, -11, -11);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Đường gân bẹ cải dọc thân
    ctx.strokeStyle = 'rgba(27, 94, 32, 0.35)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-6, 6); ctx.quadraticCurveTo(-7, 14, -5, 20);
    ctx.moveTo(6, 6); ctx.quadraticCurveTo(7, 14, 5, 20);
    ctx.stroke();

    // 5. Đôi mắt & chân mày đấu sĩ quyết tâm
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-4.5, -2, 3.6, 4.3, 0, 0, Math.PI * 2);
    ctx.ellipse(5.5, -2, 3.6, 4.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.fillStyle = '#1b2621';
    ctx.beginPath();
    ctx.arc(-3.6, -1.8, 2.0, 0, Math.PI * 2);
    ctx.arc(6.4, -1.8, 2.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.3, -3.0, 0.9, 0, Math.PI * 2);
    ctx.arc(5.7, -3.0, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Lông mày xếch quyết chiến
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 2.3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-8.5, -7); ctx.lineTo(-1, -4.5);
    ctx.moveTo(9.5, -7); ctx.lineTo(2, -4.5);
    ctx.stroke();

    // Miệng cười nhếch tự tin
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-2.5, 5.5);
    ctx.quadraticCurveTo(2, 7.5, 6, 4.5);
    ctx.stroke();

    // 6. Nắm đấm tay trước (Găng đấm bốc lá to rõ phía trước / phải)
    ctx.save();
    ctx.translate(15 + frontOffset, 3);
    // Cánh tay nối
    ctx.strokeStyle = '#43a047';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-10 - frontOffset * 0.5, 3);
    ctx.lineTo(-4, 1);
    ctx.stroke();

    // Khối găng đấm bốc to tròn chắc nịch
    const fistGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 10);
    fistGrad.addColorStop(0, '#a5d6a7');
    fistGrad.addColorStop(0.6, '#66bb6a');
    fistGrad.addColorStop(1, '#2e7d32');
    ctx.fillStyle = fistGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 9.2, 8.2, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Ngón cái & đường chia khớp đốt ngón tay
    ctx.fillStyle = '#81c784';
    ctx.beginPath();
    ctx.ellipse(-2, -5.5, 4.2, 2.8, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(3, -4); ctx.lineTo(3, 5);
    ctx.moveTo(6, -3); ctx.lineTo(6, 4);
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // --- 13. Rồng Lửa (Snapdragon - PvZ 2 Style) ---
  drawSnapdragonGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 4.0;
    const isAttacking = plant.state === 'shooting';
    const sway = Math.sin(time) * 1.5;

    ctx.save();
    // Gốc rễ lá bám đất
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(0, 20, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cổ rồng xanh lá mướt
    ctx.strokeStyle = '#43a047';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.quadraticCurveTo(-4, 6, sway * 0.5, -6);
    ctx.stroke();

    // Cánh rồng lá xanh 2 bên
    ctx.fillStyle = '#66bb6a';
    ctx.beginPath();
    ctx.ellipse(-10, 6, 8, 4, -0.4, 0, Math.PI * 2);
    ctx.ellipse(10, 6, 8, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Đầu hoa rồng lửa màu cam đỏ rực rỡ
    ctx.save();
    ctx.translate(sway, -8);

    // Mào gai rồng màu đỏ rực phía trên
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(-8, -12); ctx.lineTo(-14, -24); ctx.lineTo(-4, -16);
    ctx.lineTo(2, -26); ctx.lineTo(6, -14);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Đầu rồng màu cam lửa ấm áp
    const headGrad = ctx.createRadialGradient(-2, -4, 2, 0, 0, 16);
    headGrad.addColorStop(0, '#ffa726');
    headGrad.addColorStop(0.6, '#f57c00');
    headGrad.addColorStop(1, '#d84315');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 12, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#bf360c';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Miệng rồng mở rộng phun lửa
    ctx.fillStyle = '#ffcc80';
    ctx.beginPath();
    ctx.arc(12, 2, 7, -Math.PI / 3, Math.PI / 3);
    ctx.fill();

    // Hàng răng trắng nhỏ dễ thương
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(11, -3); ctx.lineTo(13, 0); ctx.lineTo(15, -3);
    ctx.moveTo(11, 5); ctx.lineTo(13, 2); ctx.lineTo(15, 5);
    ctx.fill();

    // Mắt rồng màu vàng rực sáng
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(1, -4, 3.5, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff8f00';
    ctx.beginPath();
    ctx.arc(1.5, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(2, -4, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Ánh lửa rực sáng trong khoang miệng khi chuẩn bị / đang phun lửa 3 hàng
    if (isAttacking) {
      const mouthGlow = ctx.createRadialGradient(13, 2, 1, 15, 2, 11);
      mouthGlow.addColorStop(0, '#fffde7');
      mouthGlow.addColorStop(0.45, '#ffca28');
      mouthGlow.addColorStop(1, 'rgba(255, 87, 34, 0)');
      ctx.fillStyle = mouthGlow;
      ctx.beginPath();
      ctx.arc(14, 2, 11, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  // --- 8. Wall-nut (Hạt Dẻ Phòng Thủ 4000 HP - Chuẩn Hoạt Họa PvZ 2) ---
  drawWallNutGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 2.0;
    const hpRatio = Math.max(0, plant.hp / plant.maxHp);
    const isBadlyDamaged = hpRatio < 0.35;
    const isLightlyDamaged = hpRatio < 0.70;

    // Rung lắc nhẹ khi bị cắn / nguy cấp
    const shake = isBadlyDamaged ? (Math.sin(time * 6) * 1.5) : (Math.sin(time) * 0.8);
    ctx.save();
    ctx.translate(shake, 0);

    // 1. Thân củ hạt dẻ nâu bóng bẩy đặc trưng PvZ 2
    const nutGrad = ctx.createLinearGradient(-16, -24, 16, 22);
    nutGrad.addColorStop(0, '#d79551');
    nutGrad.addColorStop(0.45, '#b86d2d');
    nutGrad.addColorStop(1, '#7a3c10');

    ctx.fillStyle = nutGrad;
    ctx.beginPath();
    ctx.roundRect(-16, -22, 32, 44, [16, 16, 13, 13]);
    ctx.fill();

    ctx.strokeStyle = '#4e2307';
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Vệt sáng bóng phản chiếu ở gò đầu hạt dẻ
    ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
    ctx.beginPath();
    ctx.ellipse(-7, -13, 6, 4, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vết nứt vỏ quả theo nấc máu
    if (isLightlyDamaged) {
      ctx.strokeStyle = '#3d1b05';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-4, -3);
      ctx.lineTo(-7, 4);
      ctx.stroke();
    }
    if (isBadlyDamaged) {
      ctx.strokeStyle = '#3d1b05';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(6, -12);
      ctx.lineTo(12, -4);
      ctx.lineTo(8, 6);
      ctx.lineTo(11, 14);
      ctx.stroke();

      // Giọt nước mắt sợ sệt hài hước
      ctx.fillStyle = '#64b5f6';
      ctx.beginPath();
      ctx.ellipse(-10, 2, 2.5, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Đôi mắt to tròn ngộ nghĩnh PvZ 2
    // Tròng trắng
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-6, -6, 4.5, 6.2, 0.05, 0, Math.PI * 2);
    ctx.ellipse(6, -6, 4.5, 6.2, -0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4e2307';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Con ngươi đen nhìn sang phải
    ctx.fillStyle = '#1a0d05';
    ctx.beginPath();
    ctx.ellipse(-4.5, -5.5, 2.6, 3.8, 0, 0, Math.PI * 2);
    ctx.ellipse(7.5, -5.5, 2.6, 3.8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đốm sáng long lanh trong mắt
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5.5, -7, 1.3, 0, Math.PI * 2);
    ctx.arc(6.5, -7, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // 4. Khuôn miệng biểu cảm
    ctx.strokeStyle = '#4e2307';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    if (isBadlyDamaged) {
      // Mếu máo
      ctx.arc(0, 11, 4.5, Math.PI * 1.15, Math.PI * 1.85);
    } else if (isLightlyDamaged) {
      // Bối rối
      ctx.moveTo(-3, 8);
      ctx.lineTo(3, 7);
    } else {
      // Cười mỉm tự tin
      ctx.arc(0, 5, 4.5, 0.15 * Math.PI, 0.85 * Math.PI);
    }
    ctx.stroke();

    // 5. Giáp sắt hiệp sĩ (Knight Armor) khi kích hoạt Plant Food (8000 HP)
    if (plant.hasArmor && plant.armorHp > 0) {
      // Thân giáp sắt viền vàng
      const armorGrad = ctx.createLinearGradient(-18, -24, 18, 24);
      armorGrad.addColorStop(0, '#eceff1');
      armorGrad.addColorStop(0.5, '#b0bec5');
      armorGrad.addColorStop(1, '#546e7a');

      ctx.fillStyle = armorGrad;
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.roundRect(-18, -24, 36, 48, 11);
      ctx.stroke();

      // Mũ giáp sắt hiệp sĩ có vành che trán
      ctx.beginPath();
      ctx.arc(0, -16, 18, Math.PI, 0);
      ctx.lineTo(18, -8);
      ctx.lineTo(-18, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Khe kính nhìn mắt giáp màu đen sâu thẳm
      ctx.fillStyle = '#1c2429';
      ctx.beginPath();
      ctx.roundRect(-12, -12, 24, 4, 2);
      ctx.fill();

      // Ánh mắt kiên cường phát sáng vàng bên trong khe kính
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(-5, -10, 1.5, 0, Math.PI * 2);
      ctx.arc(5, -10, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Huy hiệu kim loại vàng kim hoàng gia trên đỉnh trán
      ctx.fillStyle = '#ffd700';
      ctx.strokeStyle = '#b78103';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(0, -20, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // --- 9. Cherry Bomb (Quả Cherry Nổ 1800 DMG - PvZ 2 Sôi Động) ---
  drawCherryBombGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 12.0;
    const pulse = 1.0 + Math.sin(time) * 0.12;

    ctx.save();
    ctx.scale(pulse, pulse);

    // Cuống đôi màu xanh lá cây bóng uốn lượn nối 2 quả
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-11, -2);
    ctx.quadraticCurveTo(-4, -20, 0, -26);
    ctx.moveTo(11, -1);
    ctx.quadraticCurveTo(4, -20, 0, -26);
    ctx.stroke();

    // Chiếc lá xanh mơn mởn ở đỉnh cuống
    ctx.fillStyle = '#4caf50';
    ctx.beginPath();
    ctx.ellipse(5, -28, 6, 3, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Ngòi nổ tia lửa điện bùng nổ trên đỉnh cuống
    const sparkRadius = 4 + Math.sin(time * 2) * 2;
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(0, -27, sparkRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff5722';
    ctx.beginPath();
    ctx.arc(0, -27, sparkRadius * 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Quả cherry trái (Đỏ tươi mọng nước)
    const cherryGradLeft = ctx.createRadialGradient(-14, 0, 2, -11, 4, 14);
    cherryGradLeft.addColorStop(0, '#ff5252');
    cherryGradLeft.addColorStop(0.65, '#d50000');
    cherryGradLeft.addColorStop(1, '#880e4f');

    ctx.fillStyle = cherryGradLeft;
    ctx.beginPath();
    ctx.arc(-11, 4, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a0a20';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Quả cherry phải (Tức giận đồng pha)
    const cherryGradRight = ctx.createRadialGradient(8, 2, 2, 11, 6, 14);
    cherryGradRight.addColorStop(0, '#ff5252');
    cherryGradRight.addColorStop(0.65, '#d50000');
    cherryGradRight.addColorStop(1, '#880e4f');

    ctx.fillStyle = cherryGradRight;
    ctx.beginPath();
    ctx.arc(11, 6, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a0a20';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Vệt sáng bóng trên 2 quả cherry
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(-15, 0, 3.5, 2.2, -0.4, 0, Math.PI * 2);
    ctx.ellipse(7, 2, 3.5, 2.2, -0.4, 0, Math.PI * 2);
    ctx.fill();

    // Mắt cherry trái dữ dội
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-13, 3, 3.2, 0, Math.PI * 2);
    ctx.arc(-7, 3, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0006';
    ctx.beginPath();
    ctx.arc(-12, 3, 1.6, 0, Math.PI * 2);
    ctx.arc(-6.5, 3, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Chân mày nhăn nhó giận dữ trái
    ctx.strokeStyle = '#3e0310';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-16, 0); ctx.lineTo(-6, 2);
    ctx.stroke();

    // Mắt cherry phải dữ dội
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(8, 5, 2.6, 0, Math.PI * 2);
    ctx.arc(14, 5, 3.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0006';
    ctx.beginPath();
    ctx.arc(8.5, 5, 1.4, 0, Math.PI * 2);
    ctx.arc(13, 5, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Chân mày nhăn nhó phải
    ctx.strokeStyle = '#3e0310';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(6, 4); ctx.lineTo(16, 2);
    ctx.stroke();

    ctx.restore();
  }

  // --- 10. Chomper (Cây Ăn Thịt Nuốt Trọn 2400 DMG - PvZ 2 Sống Động) ---
  drawChomperGraphics(ctx, plant) {
    const isChewing = plant.isChewing;
    const time = (plant.animTime || 0) * (isChewing ? 5.5 : 2.5);
    const jawOpen = isChewing ? (Math.abs(Math.sin(time)) * 8) : 13;

    ctx.save();

    // 1. Đài hoa & lá xanh xòe rộng dưới gốc
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(-12, 18, 9, 4, -0.2, 0, Math.PI * 2);
    ctx.ellipse(12, 18, 9, 4, 0.2, 0, Math.PI * 2);
    ctx.ellipse(0, 20, 11, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 2. Thân cây uốn lượn uyển chuyển
    const sway = Math.sin(time * 0.8) * 3;
    ctx.strokeStyle = '#388e3c';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 18);
    ctx.quadraticCurveTo(-6 + sway, 4, 2 + sway, -8);
    ctx.stroke();

    // 3. Đầu cây ăn thịt màu tím rực rỡ đặc trưng
    ctx.translate(2 + sway, -8);

    // Môi trên màu tím đậm
    const topHeadGrad = ctx.createRadialGradient(2, -8, 2, 4, -6, 17);
    topHeadGrad.addColorStop(0, '#ab47bc');
    topHeadGrad.addColorStop(0.65, '#7b1fa2');
    topHeadGrad.addColorStop(1, '#4a148c');

    ctx.fillStyle = topHeadGrad;
    ctx.beginPath();
    ctx.arc(4, -8, 16, -Math.PI * 0.55, Math.PI * 0.28);
    ctx.lineTo(2, -4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#311b92';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Môi dưới cử động khi há miệng / nhai ngấu nghiến
    const botHeadGrad = ctx.createRadialGradient(2, -6 + jawOpen, 2, 4, -4 + jawOpen, 16);
    botHeadGrad.addColorStop(0, '#ba68c8');
    botHeadGrad.addColorStop(0.65, '#8e24aa');
    botHeadGrad.addColorStop(1, '#4a148c');

    ctx.fillStyle = botHeadGrad;
    ctx.beginPath();
    ctx.arc(4, -8 + jawOpen, 15, -Math.PI * 0.25, Math.PI * 0.55);
    ctx.lineTo(2, -4 + jawOpen);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#311b92';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Hàng răng trắng ngà nhọn sắc bén
    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    // Răng trên
    ctx.moveTo(4, -7); ctx.lineTo(8, -2); ctx.lineTo(12, -7);
    ctx.moveTo(12, -7); ctx.lineTo(16, -1); ctx.lineTo(19, -5);
    // Răng dưới
    ctx.moveTo(4, -7 + jawOpen); ctx.lineTo(8, -12 + jawOpen); ctx.lineTo(12, -7 + jawOpen);
    ctx.moveTo(12, -7 + jawOpen); ctx.lineTo(16, -13 + jawOpen); ctx.lineTo(19, -6 + jawOpen);
    ctx.fill();

    // Đôi mắt to tò mò trên đỉnh đầu
    ctx.fillStyle = '#fbc02d';
    ctx.beginPath();
    ctx.ellipse(-2, -14, 3.5, 4.5, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#311b92';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.fillStyle = '#1a237e';
    ctx.beginPath();
    ctx.arc(-1.5, -14, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-2, -15, 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 17. Nấm Thôi Miên (Hypno-shroom - PvZ 2 Psychedelic Style)
  drawHypnoShroomGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3.0;
    const pulse = 1.0 + Math.sin(time) * 0.04;

    ctx.save();
    ctx.scale(pulse, pulse);

    // 1. Thân nấm màu tím oải hương nhạt múp míp
    const stalkGrad = ctx.createLinearGradient(-9, 1, 9, 22);
    stalkGrad.addColorStop(0, '#f3e5f5');
    stalkGrad.addColorStop(0.6, '#e1bee7');
    stalkGrad.addColorStop(1, '#ce93d8');
    ctx.fillStyle = stalkGrad;
    ctx.beginPath();
    ctx.moveTo(-8, 1);
    ctx.quadraticCurveTo(-11, 14, -8, 21);
    ctx.quadraticCurveTo(0, 23, 8, 21);
    ctx.quadraticCurveTo(11, 14, 8, 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#6a1b9a';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // 2. Đôi mắt xoáy thôi miên đặc trưng
    for (const ex of [-4.2, 4.2]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(ex, 10.5, 3.6, 4.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6a1b9a';
      ctx.lineWidth = 1.0;
      ctx.stroke();

      // Vòng xoáy thôi miên màu hồng tím bên trong mắt
      ctx.strokeStyle = '#d500f9';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(ex, 10.5, 2.3, 0, Math.PI * 1.6);
      ctx.stroke();
      ctx.fillStyle = '#4a148c';
      ctx.beginPath();
      ctx.arc(ex, 10.5, 1.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Miệng nhỏ mơ màng
    ctx.strokeStyle = '#7b1fa2';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 16, 2.0, 0.2, Math.PI - 0.2);
    ctx.stroke();

    // 3. Vành dưới mũ nấm
    ctx.fillStyle = '#7b1fa2';
    ctx.beginPath();
    ctx.ellipse(0, 1, 20, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4. Mũ nấm hình vòm ảo giác nhiều dải màu rực rỡ (Tím / Hồng / Cyan)
    const capGrad = ctx.createRadialGradient(0, -10, 2, 0, -4, 22);
    capGrad.addColorStop(0, '#ff80ab');
    capGrad.addColorStop(0.45, '#d500f9');
    capGrad.addColorStop(0.8, '#8e24aa');
    capGrad.addColorStop(1, '#4a148c');
    ctx.fillStyle = capGrad;
    ctx.beginPath();
    ctx.moveTo(-21, 1);
    ctx.bezierCurveTo(-22, -16, -11, -22, 0, -22);
    ctx.bezierCurveTo(11, -22, 22, -16, 21, 1);
    ctx.bezierCurveTo(10, 4, -10, 4, -21, 1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Các vòng sóng thôi miên màu hồng/vàng/cyan phát sáng trên mũ nấm
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -6, 13, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();

    // Đốm phát sáng Cyan & Vàng chanh
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(-11, -5, 2.6, 0, Math.PI * 2);
    ctx.arc(11, -5, 2.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(-6, -13, 2.3, 0, Math.PI * 2);
    ctx.arc(6, -13, 2.3, 0, Math.PI * 2);
    ctx.fill();

    // 5. Vòng xoáy thôi miên xoay giữa mũ nấm
    ctx.save();
    ctx.translate(0, -8);
    ctx.rotate(time * 0.8);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 3.2; a += 0.3) {
      const r = a * 1.05;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.restore();

    // 6. Hào quang Super Hypno (nằm thẳng đứng phía trên đỉnh mũ, ngoài khối xoay)
    if (plant.isSuperHypno) {
      ctx.save();
      ctx.translate(0, -28);
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 14, 5, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(0, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();
  }

  // 18. Mìn Khoai Tây (Potato Mine)
  drawPotatoMineGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3.0;

    // Mô đất xới xung quanh
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.ellipse(0, 16, 20, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(0, 16, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    if (!plant.armed) {
      // TRƯỚC 5S: CHƯA NHÔ LÊN (Chỉ có chỏm đầu nhô lên mặt đất)
      const bob = Math.sin(time * 1.5) * 1.0;

      // Chỏm đầu khoai nhỏ
      ctx.fillStyle = '#8d6e63';
      ctx.beginPath();
      ctx.arc(0, 14 + bob, 10, Math.PI, 0, false);
      ctx.fill();
      ctx.strokeStyle = '#5d4037';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Đèn tín hiệu nhấp nháy đỏ trên đầu
      const blink = 0.3 + 0.7 * Math.abs(Math.sin((plant.armTimer || 0) * 4));
      ctx.fillStyle = `rgba(255, 23, 68, ${blink})`;
      ctx.beginPath();
      ctx.arc(0, 3 + bob, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Cột đèn nhỏ
      ctx.strokeStyle = '#424242';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 6 + bob);
      ctx.lineTo(0, 14 + bob);
      ctx.stroke();

      // Mắt nhắm he hé dưới đất
      ctx.strokeStyle = '#3e2723';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-4, 13 + bob); ctx.lineTo(-2, 14 + bob);
      ctx.moveTo(4, 13 + bob); ctx.lineTo(2, 14 + bob);
      ctx.stroke();
    } else {
      // SAU 5S: ĐÃ NHÔ LÊN HOÀN TOÀN (Sẵn sàng nổ SPUDOW)
      const sway = Math.sin(time * 2) * 1.2;

      ctx.save();
      ctx.translate(0, sway);

      // Thân củ khoai tây tròn trịa múp míp
      ctx.fillStyle = '#8d6e63';
      ctx.beginPath();
      ctx.ellipse(0, 6, 15, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Đốm vỏ khoai tây
      ctx.fillStyle = '#795548';
      ctx.beginPath();
      ctx.arc(-8, 8, 1.8, 0, Math.PI * 2);
      ctx.arc(7, 10, 1.5, 0, Math.PI * 2);
      ctx.arc(-4, 0, 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Mắt to tròn mở to cảnh giác
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(-5, 4, 4, 5, 0, 0, Math.PI * 2);
      ctx.ellipse(5, 4, 4, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#212121';
      ctx.beginPath();
      ctx.arc(-4, 4, 2, 0, Math.PI * 2);
      ctx.arc(4, 4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Má hồng
      ctx.fillStyle = 'rgba(255, 138, 128, 0.6)';
      ctx.beginPath();
      ctx.arc(-10, 8, 2.5, 0, Math.PI * 2);
      ctx.arc(10, 8, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Cần ăng-ten đèn đỏ trên đầu sẵn sàng nổ
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(0, -15);
      ctx.stroke();

      // Đèn đỏ phát sáng rực rỡ
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(0, -16, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(0, -16, 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  drawZombie(ctx, zombie) {
    ctx.save();
    if (zombie.isHypnotized) {
      // Đảo chiều zombie quay mặt sang phải
      ctx.translate(zombie.x, zombie.y);
      ctx.scale(-1, 1);
      ctx.translate(-zombie.x, -zombie.y);
    }
    if (zombie.visualScale && zombie.visualScale !== 1) {
      ctx.translate(zombie.x, zombie.y);
      ctx.scale(zombie.visualScale, zombie.visualScale);
      ctx.translate(-zombie.x, -zombie.y);
    }

    if (zombie.windHasteTimer > 0) {
      ctx.save();
      ctx.translate(zombie.x, zombie.y);
      const wt = Date.now() * 0.015;
      ctx.strokeStyle = 'rgba(77, 208, 225, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        const yOff = -18 + i * 14 + Math.sin(wt + i) * 2;
        const xShift = ((wt * 12 + i * 9) % 16);
        ctx.beginPath();
        ctx.moveTo(8 + xShift, yOff);
        ctx.lineTo(24 + xShift, yOff);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Bão cát bé dưới chân zombie từ wave bão cát của Azir (tăng x2 tốc chạy)
    if (zombie.alive && zombie.hasMiniSandstorm) {
      ctx.save();
      ctx.translate(zombie.x, zombie.y + 24);
      const st = Date.now() * 0.012;
      ctx.fillStyle = 'rgba(255, 213, 79, 0.22)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      for (let ring = 0; ring < 3; ring++) {
        const ry = -ring * 6;
        const rx = 18 + ring * 4;
        ctx.strokeStyle = ring % 2 === 0 ? 'rgba(255, 193, 7, 0.85)' : 'rgba(212, 163, 115, 0.85)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.ellipse(Math.sin(st + ring) * 2.5, ry, rx, 5.5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }

    if (zombie.type === 'ice_block') {
      this.drawIceBlock(ctx, zombie);
    } else if (zombie.type === 'anivia_ice_block') {
      this.drawAniviaIceBlock(ctx, zombie);
    } else if (zombie.type === 'troglobite') {
      this.drawTroglobite(ctx, zombie);
    } else if (zombie.type === 'yeti_imp') {
      this.drawYetiImp(ctx, zombie);
    } else if (zombie.type === 'sand_coffin') {
      this.drawSandCoffin(ctx, zombie);
    } else if (zombie.type === 'sand_soldier') {
      this.drawSandSoldier(ctx, zombie);
    } else if (zombie.type === 'tombstone' || zombie.isObstacle) {
      this.drawTombstone(ctx, zombie);
    } else if (zombie.type === 'zombot_dark_dragon') {
      this.drawZombotDarkDragon(ctx, zombie);
    } else if (zombie.type === 'ancient_dragon_boss') {
      this.drawAncientDragonBoss(ctx, zombie);
    } else if (zombie.type === 'azir_desert_emperor') {
      this.drawAzirDesertEmperor(ctx, zombie);
    } else if (zombie.type === 'renekton_croc') {
      this.drawRenektonCroc(ctx, zombie);
    } else if (zombie.type === 'nasus_hound') {
      this.drawNasusHound(ctx, zombie);
    } else if (zombie.type === 'imp_dragon') {
      this.drawImpDragon(ctx, zombie);
    } else if (zombie.type === 'dragon_hatchling') {
      this.drawDragonHatchling(ctx, zombie);
    } else if (zombie.type === 'dragon_adult') {
      this.drawDragonAdult(ctx, zombie);
    } else if (zombie.type === 'dragon_dark') {
      this.drawDragonDark(ctx, zombie);
    } else if (zombie.type === 'dragon_chemtech') {
      this.drawDragonChemtech(ctx, zombie);
    } else if (zombie.type === 'dragon_wind') {
      this.drawDragonWind(ctx, zombie);
    } else if (zombie.type === 'dragon_water') {
      this.drawDragonWater(ctx, zombie);
    } else if (zombie.type === 'anivia') {
      this.drawAnivia(ctx, zombie);
    } else if (zombie.type === 'balloon') {
      this.drawBalloonZombie(ctx, zombie);
    } else if (zombie.type === 'jetpack') {
      this.drawJetpackZombie(ctx, zombie);
    } else if (zombie.type === 'thresh') {
      this.drawThreshZombie(ctx, zombie);
    } else if (zombie.type === 'quan_chua') {
      this.drawQuanChuaZombie(ctx, zombie);
    } else if (zombie.type === 'conehead') {
      this.drawConeheadZombie(ctx, zombie);
    } else if (zombie.type === 'buckethead') {
      this.drawBucketheadZombie(ctx, zombie);
    } else if (zombie.type === 'pole_vaulting') {
      this.drawPoleVaultingZombie(ctx, zombie);
    } else if (zombie.type === 'gargantuar') {
      this.drawGargantuar(ctx, zombie);
    } else if (zombie.type === 'imp') {
      this.drawImp(ctx, zombie);
    } else if (zombie.type === 'jurassic_bully') {
      this.drawJurassicBully(ctx, zombie);
    } else if (zombie.type === 'turquoise_skull') {
      this.drawTurquoiseSkull(ctx, zombie);
    } else if (zombie.type === 'lang_khach') {
      this.drawLangKhachZombie(ctx, zombie);
    } else if (zombie.type === 'shen') {
      this.drawShenMatHoangHon(ctx, zombie);
    } else if (zombie.type === 'nosus_thrall') {
      this.drawNosusThrall(ctx, zombie);
    } else if (zombie.type === 'nosus_assassin') {
      this.drawNosusAssassin(ctx, zombie);
    } else if (zombie.type === 'nosus_shieldbearer') {
      this.drawNosusShieldbearer(ctx, zombie);
    } else if (zombie.type === 'nosus_hemomancer') {
      this.drawNosusHemomancer(ctx, zombie);
    } else if (zombie.type === 'nosus_warlord') {
      this.drawNosusWarlord(ctx, zombie);
    } else if (zombie.type === 'ionia_zed') {
      this.drawIoniaZed(ctx, zombie);
    } else if (zombie.type === 'ionia_yone') {
      this.drawIoniaYone(ctx, zombie);
    } else if (zombie.type === 'yone_body') {
      this.drawYoneBody(ctx, zombie);
    } else if (zombie.type === 'ionia_sett') {
      this.drawIoniaSett(ctx, zombie);
    } else if (zombie.type === 'drowned_sailor') {
      this.drawDrownedSailor(ctx, zombie);
    } else if (zombie.type === 'anchor_bearer') {
      this.drawAnchorBearer(ctx, zombie);
    } else if (zombie.type === 'swimming_ghost') {
      this.drawSwimmingGhost(ctx, zombie);
    } else if (zombie.type === 'wanted_captain') {
      this.drawWantedCaptain(ctx, zombie);
    } else if (zombie.type === 'zombot_pyke') {
      this.drawZombotPyke(ctx, zombie);
    } else {
      this.drawRegularZombie(ctx, zombie);
    }

    // Hiệu ứng Băng Giá Làm Chậm (Ice Slow Frost Overlay & Particles)
    if (zombie.alive && zombie.slowTimer > 0) {
      this.drawFrostSlowOverlay(ctx, zombie);
    }

    // Hiệu ứng Khiên Kiếm Linh Hồn từ Shen Mắt Hoàng Hôn (350 Giáp, độc xuyên qua)
    if (zombie.alive && zombie.spiritShieldHp > 0) {
      this.drawSpiritShieldOverlay(ctx, zombie);
    }

    // Hào quang Cuồng Huyết / Chiến Hống Nosus
    if (zombie.alive && (zombie.nosusSpeedBuffTimer > 0 || zombie.bloodBurstTimer > 0)) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.85)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(zombie.x, zombie.y + 22, 22, 8, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Vòng hào quang Bình Thuốc Hóa Kỹ đang buff trên zombie/rồng
    if (zombie.alive && zombie.potionBuffType) {
      const auraColor = zombie.potionBuffType === 'speed'
        ? 'rgba(186, 104, 200, 0.72)'
        : (zombie.potionBuffType === 'giant_hp' ? 'rgba(102, 187, 106, 0.75)' : 'rgba(239, 83, 80, 0.75)');
      ctx.save();
      ctx.strokeStyle = auraColor;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(zombie.x, zombie.y + 22, 23, 9, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();

    // Hào quang thôi miên xoay trên đầu
    if (zombie.isHypnotized && zombie.alive) {
      this.drawHypnotizedHalo(ctx, zombie);
      if (zombie.isTempHypnotized && zombie.tempHypnoTimer > 0) {
        ctx.save();
        ctx.fillStyle = '#f48fb1';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`💖 ${zombie.tempHypnoTimer.toFixed(1)}s`, zombie.x, zombie.y - 52);
        ctx.restore();
      }
    }
  }

  // Hiệu ứng bao phủ băng tuyết & tinh thể băng sắc nét khi zombie bị làm chậm
  drawFrostSlowOverlay(ctx, zombie) {
    const time = this.getFrameTimeSec() * 3.0;
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    // 1. Lớp phủ sương giá băng thanh mảnh, rõ nét mà không che chi tiết zombie
    ctx.fillStyle = 'rgba(0, 229, 255, 0.2)';
    ctx.strokeStyle = 'rgba(128, 216, 255, 0.78)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(0, 0, 17, 29, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2. Chông băng sắc nhọn dưới chân zombie
    ctx.fillStyle = 'rgba(178, 235, 242, 0.9)';
    ctx.beginPath();
    ctx.moveTo(-16, 28); ctx.lineTo(-12, 18); ctx.lineTo(-8, 28);
    ctx.moveTo(-6, 28); ctx.lineTo(-2, 16); ctx.lineTo(2, 28);
    ctx.moveTo(4, 28); ctx.lineTo(8, 20); ctx.lineTo(12, 28);
    ctx.fill();

    // 3. Tinh thể băng tuyết xoay lơ lửng xung quanh (Frost Ice Shards)
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI / 2) + time * 1.6;
      const dist = 16 + Math.sin(time * 3 + i) * 2.5;
      const px = Math.cos(angle) * dist;
      const py = Math.sin(angle) * (dist * 1.15) - 4;

      ctx.fillStyle = i % 2 === 0 ? '#80e5ff' : '#ffffff';
      ctx.beginPath();
      ctx.moveTo(px, py - 4);
      ctx.lineTo(px + 2.8, py);
      ctx.lineTo(px, py + 4);
      ctx.lineTo(px - 2.8, py);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  drawHypnotizedHalo(ctx, zombie) {
    ctx.save();
    ctx.translate(zombie.x, zombie.y - 48);
    const rot = performance.now() * 0.004;
    ctx.rotate(rot);

    ctx.strokeStyle = '#e040fb';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 4; a += 0.2) {
      const r = 2 + a * 2.5;
      const px = Math.cos(a) * r;
      const py = Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(Math.cos(rot * 2) * 12, Math.sin(rot * 2) * 12, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // --- Bia Mộ Vật Cản (Tombstone - HP 500) ---
  drawTombstone(ctx, zombie) {
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    // Bóng bia mộ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Khối đá bia mộ
    ctx.fillStyle = '#4a5568';
    ctx.beginPath();
    ctx.roundRect(-16, -18, 32, 44, [8, 8, 2, 2]);
    ctx.fill();
    ctx.strokeStyle = '#2d3748';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Thánh giá chạm trổ
    ctx.strokeStyle = '#cbd5e0';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(0, 10);
    ctx.moveTo(-6, -4); ctx.lineTo(6, -4);
    ctx.stroke();

    // Thanh máu nếu bị đạn bắn
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -28, 36, 5, zombie.hp / zombie.maxHp, '#ff1744');
    }
    ctx.restore();
  }

  // --- Conehead Zombie (Zombie Đội Nón Giao Thông - Chuẩn PvZ 2) ---
  drawConeheadZombie(ctx, zombie) {
    this.drawRegularZombie(ctx, zombie);
    if (!zombie.alive) return;

    // Nón giao thông màu cam rực rỡ đặc trưng PvZ 2 trên đầu
    ctx.save();
    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const walkY = !zombie.isEating ? Math.sin(cycle) * 2.8 : 0;
    ctx.translate(zombie.x, zombie.y - 34 + walkY);

    // Đế hình vuông nón bảo hộ giao thông
    ctx.fillStyle = '#e65100';
    ctx.beginPath();
    ctx.ellipse(0, 9, 13, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#bf360c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Thân nón hình nón cam tươi sáng
    const coneGrad = ctx.createLinearGradient(-10, 8, 10, -20);
    coneGrad.addColorStop(0, '#ff9100');
    coneGrad.addColorStop(0.5, '#ff6d00');
    coneGrad.addColorStop(1, '#e65100');

    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(-10, 8);
    ctx.lineTo(-2, -20);
    ctx.quadraticCurveTo(0, -22, 2, -20);
    ctx.lineTo(10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#bf360c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Vệt phản quang trắng đôi chuẩn quốc tế
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-6, 2); ctx.lineTo(-4, -5); ctx.lineTo(4, -5); ctx.lineTo(6, 2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-3, -9); ctx.lineTo(-2, -14); ctx.lineTo(2, -14); ctx.lineTo(3, -9);
    ctx.closePath();
    ctx.fill();

    // Vết nứt sứt mẻ nếu nón bị tấn công
    if (zombie.armorHp <= 180) {
      ctx.strokeStyle = '#bf360c';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-2, -12); ctx.lineTo(3, -4); ctx.lineTo(1, 4);
      ctx.stroke();
    }
    ctx.restore();
  }

  // --- Buckethead Zombie (Zombie Đội Thùng Sắt 1290 HP - Chuẩn PvZ 2) ---
  drawBucketheadZombie(ctx, zombie) {
    this.drawRegularZombie(ctx, zombie);
    if (!zombie.alive) return;
    // Nếu thùng sắt đã bị Nấm Nam Châm hút hoặc bắn nát (armorHp <= 0), không vẽ thùng sắt nữa!
    if (zombie.armorHp <= 0) return;

    ctx.save();
    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const walkY = !zombie.isEating ? Math.sin(cycle) * 2.8 : 0;
    ctx.translate(zombie.x, zombie.y - 33 + walkY);

    // Thùng kim loại mạ kẽm (Galvanized Steel Bucket)
    const bucketGrad = ctx.createLinearGradient(-13, -15, 13, 10);
    bucketGrad.addColorStop(0, '#eceff1');
    bucketGrad.addColorStop(0.3, '#cfd8dc');
    bucketGrad.addColorStop(0.7, '#90a4ae');
    bucketGrad.addColorStop(1, '#546e7a');

    ctx.fillStyle = bucketGrad;
    ctx.beginPath();
    ctx.roundRect(-13, -16, 26, 24, [3, 3, 5, 5]);
    ctx.fill();
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Gờ vành cuộn tròn miệng thùng
    ctx.fillStyle = '#b0bec5';
    ctx.beginPath();
    ctx.ellipse(0, 8, 13, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Quai xách thùng sắt vắt cong ngược ra sau
    ctx.strokeStyle = '#eceff1';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, -14, 9, Math.PI * 0.9, Math.PI * 0.1, false);
    ctx.stroke();

    // Đinh tán cố định quai thùng 2 bên
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.arc(-11, -8, 1.8, 0, Math.PI * 2);
    ctx.arc(11, -8, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Vết lồi lõm rỉ sét móp méo khi bị đạn bắn
    if (zombie.armorHp <= 600) {
      ctx.fillStyle = '#784e2d';
      ctx.beginPath();
      ctx.ellipse(-5, -4, 4, 2, -0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(4, 2, 5, 2.5, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // --- Pole Vaulting Zombie (Zombie Nhảy Sào) ---
  drawPoleVaultingZombie(ctx, zombie) {
    const time = zombie.animTime || 0;
    const isVaulting = zombie.isVaulting;
    const hasVaulted = zombie.hasVaulted;

    // Bóng tử khí
    if (zombie.alive) {
      this.drawHorrorShadow(ctx, zombie.x, zombie.y + 28, 22, 8, time, zombie.isEating, false);
    }

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 1.2);
      this.drawHorrorDissolution(ctx, zombie);
    }

    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const walkY = zombie.alive && !zombie.isEating ? Math.sin(cycle * 1.5) * 3.5 : 0;
    const legAngle = zombie.alive && !zombie.isEating ? Math.sin(cycle * 1.5) * 0.75 : 0;

    // --- A. Đôi chân vận động viên điền kinh đang chạy nước rút ---
    // Chân sau
    ctx.strokeStyle = '#689f38'; // Da chân xanh zombie
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(4, 12 + walkY);
    ctx.lineTo(4 + Math.sin(legAngle) * 14, 28);
    ctx.stroke();
    // Giày thể thao sau đỏ trắng
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(2 + Math.sin(legAngle) * 14, 27, 8, 4);

    // Chân trước gập cao chạy nước rút
    ctx.strokeStyle = '#7cb342';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(-4, 12 + walkY);
    ctx.lineTo(-4 - Math.sin(legAngle) * 14, 28);
    ctx.stroke();
    // Giày thể thao trước
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(-8 - Math.sin(legAngle) * 14, 27, 10, 4.5);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8 - Math.sin(legAngle) * 14, 29, 10, 1.5);

    // Quần đùi thể thao trắng viền đỏ
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(-10, 6 + walkY, 20, 10, [0, 0, 3, 3]);
    ctx.fill();
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Cổ nối đầu & thân
    ctx.fillStyle = '#556b2f';
    ctx.fillRect(-4, -6 + walkY, 8, 6);

    // --- B. Thân áo ba lỗ thể thao màu cam rực rỡ ---
    ctx.fillStyle = '#ef6c00'; // Áo vận động viên cam đậm nổi bật
    ctx.beginPath();
    ctx.roundRect(-11, -3 + walkY, 22, 16, 3);
    ctx.fill();
    ctx.strokeStyle = '#b23c00';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Sọc trắng thể thao dọc áo
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-8, -3 + walkY, 3, 16);
    ctx.fillRect(5, -3 + walkY, 3, 16);

    // Số áo '01' trên ngực
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('01', 0, 9 + walkY);

    // Cánh tay cầm sào
    ctx.strokeStyle = '#689f38';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-6, 2 + walkY);
    ctx.lineTo(-14, 6 + walkY);
    ctx.stroke();

    // --- C. Đầu Zombie & Băng đô thể thao đỏ ---
    ctx.fillStyle = '#556b2f';
    ctx.beginPath();
    ctx.arc(0, -15 + walkY, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2e3d16';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Băng đô đỏ thể thao quấn trán
    ctx.fillStyle = '#d32f2f';
    ctx.fillRect(-13, -20 + walkY, 26, 4.5);
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 1;
    ctx.strokeRect(-13, -20 + walkY, 26, 4.5);

    // Đôi mắt trợn trừng
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-4, -15 + walkY, 3, 0, Math.PI * 2);
    ctx.arc(4, -15 + walkY, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(-4.5, -15 + walkY, 1.5, 0, Math.PI * 2);
    ctx.arc(4.5, -15 + walkY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Hàm răng sắc nhọn
    ctx.fillStyle = '#fff9c4';
    ctx.fillRect(-4, -9 + walkY, 3, 2.5);
    ctx.fillRect(1, -9 + walkY, 3, 2.5);

    // --- D. Cây sào dài ---
    if (!hasVaulted) {
      ctx.strokeStyle = '#fbc02d'; // Cây sào gỗ vàng sáng
      ctx.lineWidth = 4;
      ctx.beginPath();
      if (isVaulting) {
        ctx.moveTo(10, 25); ctx.lineTo(-18, -32);
      } else {
        ctx.moveTo(-38, 10 + walkY); ctx.lineTo(26, -18 + walkY);
      }
      ctx.stroke();
      ctx.strokeStyle = '#f57f17';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    this.drawZombieStatus(ctx, zombie, walkY, -45, -32);

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -38, 36, 5, zombie.hp / zombie.maxHp, '#ff1744');
    }
    ctx.restore();
  }

  // ==========================================
  // LÃNG KHÁCH ZOMBIE (Yasuo Zombie)
  // Nón lá rách bươm, tóc bạc che 1 mắt, áo rách lãng khách,
  // kiếm gỗ tạc từ khúc xương, lá phong xoay vòng dưới chân
  // ==========================================
  drawLangKhachZombie(ctx, zombie) {
    const time = zombie.animTime || 0;
    const isInvuln = zombie.invulnerableTimer && zombie.invulnerableTimer > 0;
    const isDashing = !!zombie.isDashing;
    const isSlashing = isDashing || (zombie.slashAnimTimer && zombie.slashAnimTimer > 0);

    // Bóng tử khí dưới chân
    if (zombie.alive) {
      this.drawHorrorShadow(ctx, zombie.x, zombie.y + 28, 22, 8, time, zombie.isEating, false);
    }

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 1.2);
      this.drawHorrorDissolution(ctx, zombie);
    }

    // Dư ảnh lướt gió (Skill 1)
    if (isDashing) {
      ctx.save();
      ctx.globalAlpha = 0.45;
      ctx.strokeStyle = '#80deea';
      ctx.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(12 + i * 6, -12 + i * 11);
        ctx.lineTo(38 + i * 10, -12 + i * 11);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Luồng gió & lá phong xoay vòng dưới chân (luôn tồn tại khi sống)
    if (zombie.alive) {
      ctx.save();
      ctx.strokeStyle = 'rgba(178, 235, 242, 0.55)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(0, 27, 23, 7, 0, (time * 3.5) % (Math.PI * 2), (time * 3.5) % (Math.PI * 2) + Math.PI * 1.35);
      ctx.stroke();

      const leafColors = ['#e53935', '#ff7043', '#ffb300', '#d84315'];
      for (let i = 0; i < 4; i++) {
        const ang = time * 3.4 + i * (Math.PI / 2);
        const lx = Math.cos(ang) * 21;
        const ly = 26 + Math.sin(ang) * 6.5;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(ang + 0.8);
        ctx.fillStyle = leafColors[i % leafColors.length];
        // Hình lá phong nhỏ 3 cánh sắc nét
        ctx.beginPath();
        ctx.moveTo(0, -4.5);
        ctx.lineTo(2, -1);
        ctx.lineTo(4.5, -1.5);
        ctx.lineTo(1.8, 1.4);
        ctx.lineTo(0, 4);
        ctx.lineTo(-1.8, 1.4);
        ctx.lineTo(-4.5, -1.5);
        ctx.lineTo(-2, -1);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }

    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const walkY = zombie.alive && !zombie.isEating && !isDashing ? Math.sin(cycle * 1.3) * 2.5 : 0;
    const legAngle = zombie.alive && !zombie.isEating && !isDashing ? Math.sin(cycle * 1.3) * 0.5 : 0;

    // --- 1. Đôi chân & quần rách lãng khách ---
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(4, 11 + walkY);
    ctx.lineTo(4 + Math.sin(legAngle) * 11, 27);
    ctx.stroke();

    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 6.2;
    ctx.beginPath();
    ctx.moveTo(-4, 11 + walkY);
    ctx.lineTo(-4 - Math.sin(legAngle) * 11, 27);
    ctx.stroke();

    // Xà cạp rách & dép cỏ
    ctx.fillStyle = '#8d6e63';
    ctx.fillRect(1 + Math.sin(legAngle) * 11, 25, 7, 3.5);
    ctx.fillRect(-7 - Math.sin(legAngle) * 11, 25, 7, 3.5);

    // --- 2. Khăn choàng rách bay trong gió phía sau ---
    const scarfWave = Math.sin(time * 5.2) * 4;
    ctx.fillStyle = '#37474f';
    ctx.strokeStyle = '#1c262b';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4, -5 + walkY);
    ctx.quadraticCurveTo(18, -4 + scarfWave, 26, 4 + scarfWave);
    ctx.lineTo(22, 7 + scarfWave);
    ctx.lineTo(27, 10 + scarfWave * 0.6);
    ctx.lineTo(8, 5 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // --- 3. Bộ đồ rách rưới phong cách lãng khách ---
    ctx.fillStyle = '#263238';
    ctx.strokeStyle = '#102027';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-11, -5 + walkY);
    ctx.lineTo(11, -5 + walkY);
    ctx.lineTo(14, 16 + walkY);
    // Gấu áo rách tua rua
    ctx.lineTo(8, 13 + walkY);
    ctx.lineTo(4, 18 + walkY);
    ctx.lineTo(-1, 13 + walkY);
    ctx.lineTo(-6, 17 + walkY);
    ctx.lineTo(-13, 14 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vạt áo chéo kiểu kiếm sĩ & đai lưng xộc xệch
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-9, -4 + walkY);
    ctx.lineTo(7, 8 + walkY);
    ctx.stroke();

    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(-11, 6 + walkY, 22, 4);
    ctx.fillStyle = '#bcaaa4';
    ctx.fillRect(-11, 9 + walkY, 4, 5); // Mảnh đai rách thả xuống

    // Giáp vai rách bên phải
    ctx.fillStyle = '#455a64';
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(9, -4 + walkY, 7, 4.5, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // --- 4. Đầu Zombie + Tóc bạc dựng ngược che 1 bên mắt + Nón lá rách bươm ---
    ctx.fillStyle = '#689f38';
    ctx.strokeStyle = '#33691e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -15 + walkY, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mắt trái (phía hướng đi) phát sáng sắc lạnh; mắt phải bị tóc bạc che khuất
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.5, -14.5 + walkY, 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(-5, -14.5 + walkY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Miệng nhe răng
    ctx.fillStyle = '#fff9c4';
    ctx.fillRect(-4.5, -8.5 + walkY, 2.5, 2);
    ctx.fillRect(0, -8.5 + walkY, 2.5, 2);

    // Tóc bạc dựng ngược tung bay và rủ che 1 bên mắt (bên phải khuôn mặt)
    ctx.fillStyle = '#eceff1';
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    // Chỏm tóc dựng ngược phía sau/trên
    ctx.moveTo(-2, -25 + walkY);
    ctx.lineTo(6, -33 + walkY);
    ctx.lineTo(8, -26 + walkY);
    ctx.lineTo(15, -31 + walkY);
    ctx.lineTo(12, -22 + walkY);
    ctx.lineTo(17, -18 + walkY);
    ctx.lineTo(11, -14 + walkY);
    // Lọn tóc bạc rủ dài che phủ một bên mắt
    ctx.lineTo(7, -8 + walkY);
    ctx.lineTo(2, -9 + walkY);
    ctx.lineTo(1, -18 + walkY);
    ctx.lineTo(-4, -22 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nón lá rách bươm đội nghiêng
    ctx.save();
    ctx.translate(0, -22 + walkY);
    ctx.rotate(-0.14);
    const hatGrad = ctx.createLinearGradient(-22, -8, 22, 6);
    hatGrad.addColorStop(0, '#d7ccc8');
    hatGrad.addColorStop(0.5, '#c5a86b');
    hatGrad.addColorStop(1, '#8d6e63');
    ctx.fillStyle = hatGrad;
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(0, -14);
    ctx.lineTo(23, 3);
    // Vành nón lá rách bươm nham nhở
    ctx.lineTo(16, 4);
    ctx.lineTo(13, 0);
    ctx.lineTo(9, 4.5);
    ctx.lineTo(0, 3.5);
    ctx.lineTo(-8, 5);
    ctx.lineTo(-12, 1);
    ctx.lineTo(-17, 4.5);
    ctx.lineTo(-24, 2.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Các nan tre & lỗ rách trên nón lá
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -14); ctx.lineTo(-9, 3.5);
    ctx.moveTo(0, -14); ctx.lineTo(4, 3.5);
    ctx.moveTo(0, -14); ctx.lineTo(14, 2);
    ctx.stroke();
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(-7, -3, 2.4, 1.3, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // --- 5. Tay & Khúc xương hình thanh kiếm gỗ ---
    const slashSwing = isSlashing ? -0.95 : Math.sin(time * 3.0) * 0.08;
    ctx.save();
    ctx.translate(-6, 1 + walkY);
    ctx.rotate(slashSwing);

    // Cánh tay zombie đưa kiếm về phía trước
    ctx.strokeStyle = '#689f38';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-9, 3);
    ctx.stroke();

    // Khúc xương được gọt thành dáng thanh kiếm gỗ (hướng mũi về phía trước - trái)
    ctx.save();
    ctx.translate(-9, 3);
    ctx.rotate(-0.35);

    // Đuôi chuôi xương 2 đầu tròn đặc trưng của khúc xương
    ctx.fillStyle = '#fff8e1';
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(6, -1.5, 2.5, 0, Math.PI * 2);
    ctx.arc(6, 1.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Chuôi cầm
    ctx.fillStyle = '#bcaaa4';
    ctx.fillRect(-3, -2, 9, 4);
    ctx.strokeRect(-3, -2, 9, 4);

    // Chắn kiếm gỗ buộc dây
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(-5, -5, 3, 10);

    // Lưỡi kiếm khúc xương trắng ngà dáng kiếm gỗ cong nhẹ
    ctx.fillStyle = '#fffde7';
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-5, -2.5);
    ctx.quadraticCurveTo(-18, -4.5, -31, -1.5);
    ctx.lineTo(-34, 0.5);
    ctx.quadraticCurveTo(-20, 2.5, -5, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Vệt chém kiếm khi lướt / vung kiếm
    if (isSlashing) {
      ctx.strokeStyle = 'rgba(128, 222, 234, 0.85)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(-18, 0, 18, Math.PI * 0.72, Math.PI * 1.35);
      ctx.stroke();
    }
    ctx.restore();
    ctx.restore();

    // --- 6. Skill 2: Hào quang Bất Tử 3s (HP < 50%) ---
    if (isInvuln && zombie.alive) {
      const pulse = 0.65 + Math.sin(time * 12) * 0.25;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, -2 + walkY, 24, 30, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.ellipse(0, -2 + walkY, 27, 33, 0, time * 4, time * 4 + Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // --- 7. Chỉ báo số lần lướt (0/3, 1/3, 2/3) cho Skill 3 ---
    if (zombie.alive) {
      const stacks = zombie.dashCount || 0;
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < stacks ? '#00e5ff' : 'rgba(15, 23, 42, 0.7)';
        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(-7 + i * 7, -45, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    this.drawZombieStatus(ctx, zombie, walkY, -54, -40);

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -39, 36, 5, zombie.hp / zombie.maxHp, isInvuln ? '#ffd54f' : '#ff1744');
    }
    ctx.restore();
  }

  // ==========================================
  // SHEN MẮT HOÀNG HÔN (Ninja Giáp Tím + Kiếm Linh Hồn sau lưng)
  // ==========================================
  drawShenMatHoangHon(ctx, zombie) {
    const time = zombie.animTime || 0;
    const isCasting = zombie.spiritCastAnimTimer && zombie.spiritCastAnimTimer > 0;
    const isAttacking = zombie.isEating || isCasting;

    if (zombie.alive) {
      this.drawHorrorShadow(ctx, zombie.x, zombie.y + 28, 22, 8, time, zombie.isEating, false);
    }

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 1.2);
      ctx.rotate(Math.min(Math.PI / 2, zombie.deathTimer * 1.9));
      ctx.translate(0, zombie.deathTimer * 12);
    }

    const walkCycle = zombie.isEating ? 0 : Math.sin(time * 5.2);
    const walkY = zombie.isEating ? Math.sin(time * 8) * 1.2 : Math.abs(Math.sin(time * 5.2)) * 2.0;

    // 1. Hào quang hoàng hôn tím khi tung chiêu Kiếm Linh Hồn
    if (zombie.alive && isCasting) {
      const pulse = 0.7 + Math.sin(time * 18) * 0.25;
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.strokeStyle = '#e040fb';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, -4 + walkY, 26, 34, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(0, -4 + walkY, 31, 38, 0, time * 5, time * 5 + Math.PI * 1.5);
      ctx.stroke();
      ctx.restore();
    }

    // 2. THANH KIẾM LINH HỒN LUÔN ĐEO SAU LƯNG
    ctx.save();
    ctx.translate(6, -4 + walkY);
    ctx.rotate(0.58); // Đeo chéo sau lưng từ vai phải xuống hông trái

    // Khí quang quanh Kiếm Linh Hồn
    const bladeGlow = 0.55 + Math.sin(time * 4.5) * 0.2 + (isCasting ? 0.25 : 0);
    ctx.save();
    ctx.globalAlpha = Math.min(1, bladeGlow);
    ctx.fillStyle = 'rgba(170, 0, 255, 0.35)';
    ctx.beginPath();
    ctx.roundRect(-5, -36, 10, 44, 5);
    ctx.fill();
    ctx.restore();

    // Lưỡi Kiếm Linh Hồn phát sáng tím-lam
    const bladeGrad = ctx.createLinearGradient(0, -34, 0, 8);
    bladeGrad.addColorStop(0, '#80deea');
    bladeGrad.addColorStop(0.35, '#e040fb');
    bladeGrad.addColorStop(0.8, '#7b1fa2');
    bladeGrad.addColorStop(1, '#311b92');
    ctx.fillStyle = bladeGrad;
    ctx.strokeStyle = '#f3e5f5';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -37);
    ctx.lineTo(4.2, -26);
    ctx.lineTo(3.4, 4);
    ctx.lineTo(-3.4, 4);
    ctx.lineTo(-4.2, -26);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sống kiếm phát sáng
    ctx.strokeStyle = '#e0f7fa';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -33);
    ctx.lineTo(0, 1);
    ctx.stroke();

    // Chắn kiếm & chuôi kiếm ninja
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(-5.5, 3, 11, 3);
    ctx.fillStyle = '#4a148c';
    ctx.fillRect(-2, 6, 4, 9);
    ctx.fillStyle = '#ce93d8';
    ctx.beginPath();
    ctx.arc(0, 16, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 3. Khăn choàng ninja tím bay phía sau
    const capeWave = Math.sin(time * 6) * 4;
    ctx.fillStyle = '#4a148c';
    ctx.strokeStyle = '#1a0033';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(4, -8 + walkY);
    ctx.quadraticCurveTo(18, -4 + capeWave, 22, 14 + capeWave * 0.7);
    ctx.lineTo(12, 16 + walkY);
    ctx.lineTo(2, 4 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 4. Chân & ống quyển giáp ninja tím
    const leftLegAngle = walkCycle * 0.28;
    const rightLegAngle = -walkCycle * 0.28;
    for (const [lx, ang] of [[-5, leftLegAngle], [5, rightLegAngle]]) {
      ctx.save();
      ctx.translate(lx, 12 + walkY);
      ctx.rotate(ang);
      ctx.fillStyle = '#1a1033';
      ctx.fillRect(-3.5, 0, 7, 13);
      // Bọc ống đồng giáp tím
      ctx.fillStyle = '#6a1b9a';
      ctx.strokeStyle = '#ce93d8';
      ctx.lineWidth = 1;
      ctx.fillRect(-4, 4, 8, 8);
      ctx.strokeRect(-4, 4, 8, 8);
      // Giày ninja
      ctx.fillStyle = '#212121';
      ctx.fillRect(-6, 12, 9, 4);
      ctx.restore();
    }

    // 5. Thân giáp ninja tím đặc trưng
    const armorGrad = ctx.createLinearGradient(-12, -10 + walkY, 12, 14 + walkY);
    armorGrad.addColorStop(0, '#7b1fa2');
    armorGrad.addColorStop(0.55, '#4a148c');
    armorGrad.addColorStop(1, '#240b4c');
    ctx.fillStyle = armorGrad;
    ctx.strokeStyle = '#ce93d8';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.roundRect(-11, -9 + walkY, 22, 23, 5);
    ctx.fill();
    ctx.stroke();

    // Tấm giáp ngực & biểu tượng Mắt Hoàng Hôn
    ctx.fillStyle = '#311b92';
    ctx.beginPath();
    ctx.moveTo(-9, -7 + walkY);
    ctx.lineTo(9, -7 + walkY);
    ctx.lineTo(6, 7 + walkY);
    ctx.lineTo(-6, 7 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Ấn Kinkaku / Con mắt hoàng hôn trước ngực
    ctx.fillStyle = '#e040fb';
    ctx.beginPath();
    ctx.ellipse(-1, 0 + walkY, 3.8, 2.3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(-1, 0 + walkY, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Đai lưng ninja tím sáng
    ctx.fillStyle = '#9c27b0';
    ctx.fillRect(-11, 8 + walkY, 22, 4);

    // Giáp vai nhọn (Pauldrons)
    ctx.fillStyle = '#6a1b9a';
    ctx.strokeStyle = '#e1bee7';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-14, -9 + walkY);
    ctx.lineTo(-5, -11 + walkY);
    ctx.lineTo(-7, -3 + walkY);
    ctx.lineTo(-15, -4 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(6, -11 + walkY);
    ctx.lineTo(15, -9 + walkY);
    ctx.lineTo(15, -4 + walkY);
    ctx.lineTo(7, -3 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 6. Đầu đội mũ trùm & mặt nạ ninja tím
    ctx.save();
    ctx.translate(-1, -18 + walkY);

    // Mũ trùm ninja tím thẫm
    ctx.fillStyle = '#38006b';
    ctx.strokeStyle = '#ce93d8';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Băng trán giáp kim loại tím-vàng
    ctx.fillStyle = '#6a1b9a';
    ctx.fillRect(-11.5, -6, 23, 4.5);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1;
    ctx.strokeRect(-11.5, -6, 23, 4.5);

    // Khe mắt zombie ẩn trong mặt nạ
    ctx.fillStyle = '#1b0b2e';
    ctx.beginPath();
    ctx.roundRect(-9.5, -1.5, 16, 6, 2.5);
    ctx.fill();

    // Hai mắt hoàng hôn phát sáng sắc lạnh
    ctx.fillStyle = isAttacking ? '#ffea00' : '#e040fb';
    ctx.beginPath();
    ctx.ellipse(-5.5, 1.5, 2.3, 1.4, -0.15, 0, Math.PI * 2);
    ctx.ellipse(2, 1.5, 2.1, 1.4, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5.8, 1.5, 0.8, 0, Math.PI * 2);
    ctx.arc(1.7, 1.5, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Khăn che mặt ninja tím
    ctx.fillStyle = '#4a148c';
    ctx.beginPath();
    ctx.moveTo(-10.5, 3);
    ctx.lineTo(10.5, 3);
    ctx.lineTo(8, 11);
    ctx.lineTo(-8, 11);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 7. Cánh tay giáp ninja & đòn chém Kiếm Hồn khi tấn công
    const armSwing = zombie.isEating ? Math.sin(time * 14) * 0.55 - 0.35 : Math.sin(time * 3.5) * 0.12;
    ctx.save();
    ctx.translate(-8, -3 + walkY);
    ctx.rotate(armSwing);
    ctx.fillStyle = '#4a148c';
    ctx.strokeStyle = '#ce93d8';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-12, -2.5, 13, 5.5, 2.5);
    ctx.fill();
    ctx.stroke();

    // Găng tay giáp tím + tia kiếm năng lượng khi cắn
    ctx.fillStyle = '#7b1fa2';
    ctx.beginPath();
    ctx.arc(-13, 0, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (zombie.isEating) {
      ctx.strokeStyle = 'rgba(224, 64, 251, 0.9)';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(-15, 0, 12, Math.PI * 0.65, Math.PI * 1.35);
      ctx.stroke();
    }
    ctx.restore();

    // 8. Chỉ báo tích đòn Skill 2 (3 đòn hạ cây phòng thủ)
    if (zombie.alive && zombie.defensiveBiteCount > 0) {
      for (let i = 0; i < 3; i++) {
        ctx.fillStyle = i < zombie.defensiveBiteCount ? '#e040fb' : 'rgba(15, 23, 42, 0.75)';
        ctx.strokeStyle = '#80deea';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(-7 + i * 7, -45, 2.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }

    this.drawZombieStatus(ctx, zombie, walkY, -56, -42);

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -20, -38, 40, 5, zombie.hp / zombie.maxHp, '#ab47bc');
    }
    ctx.restore();
  }

  // ==========================================
  // 5 BINH CHỦNG CHIẾN TRƯỜNG NOSUS (TỪ YẾU ĐẾN MẠNH)
  // ==========================================

  // 1. Binh Sĩ Nosus (Tier 1 - Rìu chiến & giáp sắt đen-đỏ)
  drawNosusThrall(ctx, zombie) {
    const time = this.getFrameTimeSec();
    const walkY = zombie.isEating ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 3.5;
    const armSwing = zombie.isEating ? Math.sin(time * 14) * 0.55 - 0.35 : Math.sin(time * 4.5) * 0.16;

    this.drawHorrorShadow(ctx, zombie.x, zombie.y, 17, 7, zombie.animTime, zombie.isEating, zombie.hp < zombie.maxHp * 0.35);
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    // Chân bọc sắt
    const legAngle = zombie.isEating ? 0 : Math.sin(zombie.walkCycle || 0) * 0.25;
    for (const [lx, ang] of [[-5, legAngle], [5, -legAngle]]) {
      ctx.save();
      ctx.translate(lx, 12 + walkY);
      ctx.rotate(ang);
      ctx.fillStyle = '#263238';
      ctx.fillRect(-3.5, 0, 7, 14);
      ctx.fillStyle = '#546e7a';
      ctx.fillRect(-4, 7, 8, 5);
      ctx.restore();
    }

    // Thân áo giáp thép xỉn & dải băng đỏ
    ctx.fillStyle = '#37474f';
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-10, -8 + walkY, 20, 21, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(-10, 5 + walkY, 20, 4);

    // Giáp vai gai nhỏ
    ctx.fillStyle = '#455a64';
    ctx.beginPath();
    ctx.moveTo(-13, -8 + walkY); ctx.lineTo(-5, -10 + walkY); ctx.lineTo(-7, -2 + walkY); ctx.closePath();
    ctx.moveTo(13, -8 + walkY); ctx.lineTo(5, -10 + walkY); ctx.lineTo(7, -2 + walkY); ctx.closePath();
    ctx.fill();

    // Đầu + Mũ sắt sừng nhỏ
    ctx.save();
    ctx.translate(-1, -17 + walkY);
    ctx.fillStyle = '#78909c';
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    // Mũ sắt Nosus
    ctx.fillStyle = '#263238';
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, -2, 10.5, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mắt đỏ rực
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(-4.5, 0, 2, 0, Math.PI * 2);
    ctx.arc(2.5, 0, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Rìu chiến cầm tay trước
    ctx.save();
    ctx.translate(-9, -2 + walkY);
    ctx.rotate(armSwing);
    ctx.fillStyle = '#455a64';
    ctx.fillRect(-11, -2, 12, 4.5);
    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-13, -12, 3, 18);
    ctx.fillStyle = '#cfd8dc';
    ctx.strokeStyle = '#d50000';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-13, -11);
    ctx.lineTo(-22, -14);
    ctx.lineTo(-20, -3);
    ctx.lineTo(-13, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    this.drawZombieStatus(ctx, zombie, walkY, -46, -34);
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -33, 36, 4.5, zombie.hp / zombie.maxHp, '#ef5350');
    }
    ctx.restore();
  }

  // 2. Sát Thủ Huyết Đao Nosus (Tier 2 - Áo choàng đỏ, song đao răng cưa, Cuồng Huyết)
  drawNosusAssassin(ctx, zombie) {
    const time = this.getFrameTimeSec();
    const walkY = zombie.isEating ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 4;
    const isBurst = zombie.bloodBurstTimer > 0;
    const armSwing = zombie.isEating ? Math.sin(time * 16) * 0.65 - 0.3 : Math.sin(time * 5.5) * 0.22;

    this.drawHorrorShadow(ctx, zombie.x, zombie.y, 17, 7, zombie.animTime, zombie.isEating, false);
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (isBurst) {
      ctx.fillStyle = 'rgba(255, 23, 68, 0.22)';
      ctx.beginPath();
      ctx.ellipse(2, -4, 22, 28, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Khăn choàng rách đỏ thẫm
    const capeWave = Math.sin(time * 8) * 4;
    ctx.fillStyle = '#8e0000';
    ctx.beginPath();
    ctx.moveTo(4, -7 + walkY);
    ctx.quadraticCurveTo(19, -2 + capeWave, 23, 14 + capeWave * 0.7);
    ctx.lineTo(10, 14 + walkY);
    ctx.closePath();
    ctx.fill();

    // Thân giáp da đen gọn gàng
    ctx.fillStyle = '#1c1518';
    ctx.strokeStyle = isBurst ? '#ff5252' : '#78909c';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-9, -8 + walkY, 18, 22, 4);
    ctx.fill();
    ctx.stroke();

    // Đai chéo đỏ ngực
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-8, -7 + walkY);
    ctx.lineTo(8, 10 + walkY);
    ctx.stroke();

    // Đầu trùm khăn sát thủ
    ctx.save();
    ctx.translate(-1, -17 + walkY);
    ctx.fillStyle = '#261419';
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isBurst ? '#ffea00' : '#ff1744';
    ctx.beginPath();
    ctx.ellipse(-4.5, 0, 2.4, 1.3, -0.2, 0, Math.PI * 2);
    ctx.ellipse(2.2, 0, 2.2, 1.3, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Lưỡi huyết đao sắc bén
    ctx.save();
    ctx.translate(-9, -1 + walkY);
    ctx.rotate(armSwing);
    ctx.fillStyle = '#212121';
    ctx.fillRect(-10, -2, 11, 4);
    ctx.fillStyle = '#eceff1';
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-10, -2);
    ctx.lineTo(-27, -7);
    ctx.lineTo(-21, 3);
    ctx.lineTo(-10, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    this.drawZombieStatus(ctx, zombie, walkY, -46, -34);
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -34, 36, 4.5, zombie.hp / zombie.maxHp, isBurst ? '#ffea00' : '#ff1744');
    }
    ctx.restore();
  }

  // 3. Vệ Binh Khiên Sắt Nosus (Tier 3 - Đại thuẫn thép đen viền đỏ 750 Giáp)
  drawNosusShieldbearer(ctx, zombie) {
    const time = this.getFrameTimeSec();
    const walkY = zombie.isEating ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 2.5;
    const hasMetalShield = (zombie.armorHp || 0) > 0 && zombie.hasShield !== false;

    this.drawHorrorShadow(ctx, zombie.x, zombie.y, 20, 8, zombie.animTime, zombie.isEating, false);
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    // Giáp nặng toàn thân
    ctx.fillStyle = '#263238';
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-12, -10 + walkY, 24, 24, 5);
    ctx.fill();
    ctx.stroke();

    // Huy hiệu Nosus đỏ giữa ngực
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.moveTo(0, -6 + walkY); ctx.lineTo(6, 2 + walkY); ctx.lineTo(0, 10 + walkY); ctx.lineTo(-6, 2 + walkY);
    ctx.closePath();
    ctx.fill();

    // Đầu đội mũ trụ chiến binh
    ctx.save();
    ctx.translate(0, -20 + walkY);
    ctx.fillStyle = '#37474f';
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, 20, 6);
    ctx.fill();
    ctx.stroke();
    // Chỏm mũ đỏ
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(-3, -15, 6, 6);
    // Khe mắt sáng đỏ
    ctx.fillStyle = '#111';
    ctx.fillRect(-8, -2, 13, 4);
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(-6, -1, 4, 2.2);
    ctx.fillRect(0, -1, 4, 2.2);
    ctx.restore();

    // ĐẠI THUẪN THIẾT HUYẾT phía trước
    if (hasMetalShield) {
      const shieldShake = zombie.flashTimer > 0 ? -2 : 0;
      ctx.save();
      ctx.translate(-15 + shieldShake, -2 + walkY);
      const sGrad = ctx.createLinearGradient(-8, -22, 8, 22);
      sGrad.addColorStop(0, '#455a64');
      sGrad.addColorStop(0.5, '#263238');
      sGrad.addColorStop(1, '#102027');
      ctx.fillStyle = sGrad;
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-7, -21);
      ctx.lineTo(7, -18);
      ctx.lineTo(7, 16);
      ctx.lineTo(-1, 24);
      ctx.lineTo(-7, 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gai nhọn & huyết ấn trên khiên
      ctx.fillStyle = '#d50000';
      ctx.beginPath();
      ctx.arc(-1, 0, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath();
      ctx.moveTo(-7, -8); ctx.lineTo(-13, -6); ctx.lineTo(-7, -4);
      ctx.moveTo(-7, 4); ctx.lineTo(-13, 6); ctx.lineTo(-7, 8);
      ctx.fill();
      ctx.restore();
    }

    this.drawZombieStatus(ctx, zombie, walkY, -52, -40);
    if (hasMetalShield && zombie.maxArmorHp) {
      this.drawHealthBar(ctx, -20, -45, 40, 4, zombie.armorHp / zombie.maxArmorHp, '#90a4ae');
    }
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -20, -39, 40, 4.5, zombie.hp / zombie.maxHp, '#ef5350');
    }
    ctx.restore();
  }

  // 4. Huyết Pháp Sư Nosus (Tier 4 - Áo choàng pháp sư, trượng huyết cầu & aura Huyết Tế)
  drawNosusHemomancer(ctx, zombie) {
    const time = this.getFrameTimeSec();
    const walkY = (zombie.isAttacking || zombie.isEating) ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 2.5;
    const isCasting = zombie.hemoCastAnimTimer > 0;

    this.drawHorrorShadow(ctx, zombie.x, zombie.y, 19, 7.5, zombie.animTime, zombie.isEating, false);
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    // Áo choàng huyết thuật dài
    const robeGrad = ctx.createLinearGradient(-12, -12 + walkY, 12, 22 + walkY);
    robeGrad.addColorStop(0, '#880e4f');
    robeGrad.addColorStop(0.5, '#4a0014');
    robeGrad.addColorStop(1, '#1a0007');
    ctx.fillStyle = robeGrad;
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-10, -10 + walkY);
    ctx.lineTo(10, -10 + walkY);
    ctx.lineTo(15, 22 + walkY);
    ctx.lineTo(-14, 22 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cổ áo cao & huy hiệu hồng ngọc
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(-1, -4 + walkY, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Mũ trùm pháp sư Nosus
    ctx.save();
    ctx.translate(-1, -19 + walkY);
    ctx.fillStyle = '#310010';
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-11, 6);
    ctx.quadraticCurveTo(-12, -13, 0, -14);
    ctx.quadraticCurveTo(12, -13, 12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mắt phát sáng huyền bí đỏ tươi
    ctx.fillStyle = isCasting ? '#ffeb3b' : '#ff1744';
    ctx.beginPath();
    ctx.arc(-4, -1, 2.2, 0, Math.PI * 2);
    ctx.arc(3, -1, 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Trượng Huyết Cầu lơ lửng phía trước
    ctx.save();
    ctx.translate(-16, -4 + walkY);
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.lineTo(-2, -16);
    ctx.stroke();

    const orbR = isCasting ? 8 : 6;
    ctx.fillStyle = 'rgba(255, 23, 68, 0.35)';
    ctx.beginPath();
    ctx.arc(-2, -20 + Math.sin(time * 5) * 2, orbR + 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff1744';
    ctx.strokeStyle = '#ffcdd2';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-2, -20 + Math.sin(time * 5) * 2, orbR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    this.drawZombieStatus(ctx, zombie, walkY, -54, -40);
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -20, -39, 40, 5, zombie.hp / zombie.maxHp, '#ff1744');
    }
    ctx.restore();
  }

  // 5. Darius - Đại Tướng Nosus (Giáp Noxian sừng thép, đại rìu hành quyết rõ động tác bổ rìu / xoay 3x3 / bất tử 4s / cuồng nộ x2)
  drawNosusWarlord(ctx, zombie) {
    const time = this.getFrameTimeSec();
    const spinTimer = zombie.spinAnimTimer || 0;
    const isSpinning = spinTimer > 0;
    const chopTimer = zombie.slashAnimTimer || 0;
    const isChopping = chopTimer > 0;
    const isFrenzied = !!zombie.isDariusFrenzied;
    const isInvuln = (zombie.invulnerableTimer || 0) > 0;
    const isHalfHp = zombie.hp <= zombie.maxHp * 0.5;
    const walkY = (zombie.isEating || isSpinning) ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 3;

    // Tính góc vung đại rìu rõ ràng: giơ rìu lên theo attackTimer -> bổ xuống cực mạnh khi slashAnimTimer > 0
    let axeAngle = Math.sin(zombie.walkCycle || 0) * 0.14;
    let torsoLean = 0;
    if (isSpinning) {
      const spinProg = 1 - Math.max(0, Math.min(1, spinTimer / 0.65));
      axeAngle = -spinProg * Math.PI * 4;
    } else if (isChopping) {
      const chopProg = 1 - Math.max(0, Math.min(1, chopTimer / 0.38));
      // Bổ từ trên cao (+0.95 rad) chém gập mạnh xuống phía trước (-1.45 rad)
      axeAngle = 0.95 - Math.min(1, chopProg * 1.45) * 2.4;
      torsoLean = -0.18 * Math.sin(Math.min(1, chopProg * 1.3) * Math.PI);
    } else if (zombie.isEating) {
      const atkRatio = Math.max(0, Math.min(1, (zombie.attackTimer || 0) / (zombie.attackInterval || 1.75)));
      // Giơ rìu dần lên cao chuẩn bị bổ
      axeAngle = -0.15 + atkRatio * 1.1;
      torsoLean = atkRatio * 0.12;
    }

    this.drawHorrorShadow(ctx, zombie.x, zombie.y, 28, 10, zombie.animTime, zombie.isEating, false);
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    // 1. Hào quang Cuồng Nộ (<100 HP) hoặc Nửa Máu (<=50% HP)
    if (isFrenzied) {
      const pulse = 0.6 + 0.35 * Math.sin(time * 12);
      ctx.strokeStyle = `rgba(255, 23, 68, ${pulse})`;
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.ellipse(0, -6, 33, 41, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Vệt huyết hỏa bốc lên khi tăng tốc x2
      ctx.fillStyle = 'rgba(255, 82, 82, 0.55)';
      for (let i = 0; i < 4; i++) {
        const fx = -14 + i * 9 + Math.sin(time * 9 + i) * 3;
        const fy = 18 - ((time * 48 + i * 13) % 44);
        ctx.beginPath();
        ctx.ellipse(fx, fy, 3.2, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (isHalfHp) {
      ctx.strokeStyle = `rgba(255, 23, 68, ${0.38 + 0.25 * Math.sin(time * 6)})`;
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, -6, 30, 38, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 2. Khiên Bất Tử 4s (<100 HP)
    if (isInvuln) {
      ctx.fillStyle = 'rgba(255, 213, 79, 0.18)';
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, -8, 35, 43, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Áo choàng chiến tướng đỏ sẫm
    const capeWave = Math.sin(time * (isFrenzied ? 10 : 5)) * 4.5;
    ctx.fillStyle = isFrenzied ? '#b71c1c' : '#7f0000';
    ctx.beginPath();
    ctx.moveTo(8, -14 + walkY);
    ctx.quadraticCurveTo(30, -4 + capeWave, 33, 22 + capeWave * 0.6);
    ctx.lineTo(10, 22 + walkY);
    ctx.closePath();
    ctx.fill();

    // Chân thiết giáp to bản
    const legAng = (zombie.isEating || isSpinning) ? 0 : Math.sin(zombie.walkCycle || 0) * 0.22;
    for (const [lx, ang] of [[-8, legAng], [8, -legAng]]) {
      ctx.save();
      ctx.translate(lx, 13 + walkY);
      ctx.rotate(ang);
      ctx.fillStyle = '#1c1f24';
      ctx.strokeStyle = isFrenzied ? '#ffd54f' : '#ff5252';
      ctx.lineWidth = 1.3;
      ctx.fillRect(-5, 0, 10, 17);
      ctx.strokeRect(-5, 0, 10, 17);
      ctx.restore();
    }

    // Thân trên nghiêng theo nhịp bổ rìu
    ctx.save();
    ctx.rotate(torsoLean);

    // Thân giáp Thiết Huyết đồ sộ
    const bodyGrad = ctx.createLinearGradient(-16, -16 + walkY, 16, 16 + walkY);
    bodyGrad.addColorStop(0, isFrenzied ? '#4a1c1c' : '#37474f');
    bodyGrad.addColorStop(0.55, '#1c242b');
    bodyGrad.addColorStop(1, '#0d1115');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = isInvuln ? '#ffd54f' : (isFrenzied || isHalfHp ? '#ff1744' : '#b0bec5');
    ctx.lineWidth = 1.9;
    ctx.beginPath();
    ctx.roundRect(-16, -16 + walkY, 32, 31, 6);
    ctx.fill();
    ctx.stroke();

    // Huyết ấn Noxus trước ngực
    ctx.fillStyle = isFrenzied ? '#ffd54f' : '#ff1744';
    ctx.beginPath();
    ctx.moveTo(0, -10 + walkY); ctx.lineTo(8, -1 + walkY); ctx.lineTo(0, 9 + walkY); ctx.lineTo(-8, -1 + walkY);
    ctx.closePath();
    ctx.fill();

    // Giáp vai gai nhọn khổng lồ
    for (const dir of [-1, 1]) {
      ctx.fillStyle = '#263238';
      ctx.strokeStyle = isFrenzied ? '#ffd54f' : '#ff5252';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(dir * 12, -16 + walkY);
      ctx.lineTo(dir * 26, -25 + walkY);
      ctx.lineTo(dir * 23, -6 + walkY);
      ctx.lineTo(dir * 12, -6 + walkY);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Đầu Darius: chiến tướng giáp sừng thép & vệt sẹo mặt
    ctx.save();
    ctx.translate(-1, -28 + walkY);
    ctx.fillStyle = '#212529';
    ctx.strokeStyle = isInvuln ? '#ffd54f' : '#ff5252';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, 0, 12.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sừng sắt hai bên
    ctx.fillStyle = isFrenzied ? '#ffd54f' : '#cfd8dc';
    ctx.beginPath();
    ctx.moveTo(-10, -6); ctx.lineTo(-21, -20); ctx.lineTo(-6, -11); ctx.closePath();
    ctx.moveTo(10, -6); ctx.lineTo(21, -20); ctx.lineTo(6, -11); ctx.closePath();
    ctx.fill();

    // Đôi mắt rực lửa chiến tướng
    ctx.fillStyle = isFrenzied ? '#ffd54f' : '#ff1744';
    ctx.fillRect(-7, -2, 5, 3);
    ctx.fillRect(1, -2, 5, 3);
    ctx.restore();

    // ĐẠI RÌU HÀNH QUYẾT DARIUS (Xoay 360 độ khi Máy Chém Xoay hoặc Bổ thẳng xuống)
    ctx.save();
    ctx.translate(isSpinning ? 0 : -15, (isSpinning ? -4 : -6) + walkY);
    ctx.rotate(axeAngle);

    if (isSpinning) {
      // Vệt lưỡi rìu xoay tròn 360 độ rõ nét quanh Darius
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.85)';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, 0, 34, 0, Math.PI * 1.45);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(255, 213, 79, 0.9)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 36, 0.2, Math.PI * 1.3);
      ctx.stroke();
    } else if (isChopping) {
      // Vệt chém bổ dọc
      ctx.strokeStyle = 'rgba(255, 23, 68, 0.78)';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.arc(0, 0, 32, Math.PI * 0.72, Math.PI * 1.38);
      ctx.stroke();
    }

    ctx.fillStyle = '#3e2723';
    ctx.fillRect(-4, -24, 5, 38);
    ctx.fillStyle = isFrenzied ? '#ff8a80' : '#cfd8dc';
    ctx.strokeStyle = isFrenzied ? '#ffd54f' : '#ff1744';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-4, -22);
    ctx.lineTo(-25, -28);
    ctx.quadraticCurveTo(-31, -14, -23, 0);
    ctx.lineTo(-4, -8);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // End torsoLean

    // Nhãn trạng thái rõ ràng trên đầu Darius
    if (isInvuln || isFrenzied) {
      ctx.save();
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.lineWidth = 2.6;
      const badgeText = isInvuln
        ? `BẤT TỬ ${Math.max(0, zombie.invulnerableTimer).toFixed(1)}s · 1s/ĐÒN`
        : 'CUỒNG NỘ ×2 · ONE-HIT';
      ctx.strokeStyle = 'rgba(0,0,0,0.9)';
      ctx.strokeText(badgeText, 0, -58);
      ctx.fillStyle = isInvuln ? '#ffd54f' : '#ff5252';
      ctx.fillText(badgeText, 0, -58);
      ctx.restore();
    }

    this.drawZombieStatus(ctx, zombie, walkY, -68, -50);
    this.drawHealthBar(ctx, -27, -50, 54, 5.8, zombie.hp / zombie.maxHp, isFrenzied ? '#ffd54f' : '#ff1744');
    ctx.restore();
  }

  // ==========================================
  // VÙNG ĐẤT IONIA ZOMBIE RENDERERS (ZED, YONE, THỂ XÁC YONE, SETT MINI-BOSS)
  // ==========================================

  // 1. Zed - Chúa Tể Bóng Tối (Giáp nhẫn giả đen đỏ, 2 lưỡi hái cổ tay, lướt bóng miễn nhiễm gắn Dấu Ấn Tử Thần)
  drawIoniaZed(ctx, zombie) {
    const time = this.getFrameTimeSec();
    const isDashing = !!zombie.isShadowDashing;
    const isSlashing = (zombie.slashAnimTimer || 0) > 0;
    const walkY = (zombie.isEating || isDashing) ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 3;

    this.drawHorrorShadow(ctx, zombie.x, zombie.y, 20, 7, zombie.animTime, zombie.isEating, false);
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (isDashing) {
      ctx.globalAlpha = 0.78;
      // Vệt bóng phân thân phía sau khi đang lao tới plant
      for (let i = 1; i <= 2; i++) {
        ctx.fillStyle = `rgba(33, 33, 33, ${0.42 - i * 0.14})`;
        ctx.beginPath();
        ctx.ellipse(i * 15, walkY, 12, 22, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.ellipse(0, -4, 24, 30, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Khăn choàng đen đỏ bay nhẹ sau lưng
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.moveTo(6, -12 + walkY);
    ctx.quadraticCurveTo(24, -6 + Math.sin(time * 8) * 3, 25, 14);
    ctx.lineTo(7, 14 + walkY);
    ctx.closePath();
    ctx.fill();

    // Chân nhẫn giả gọn nhẹ
    const legAng = zombie.isEating ? 0 : Math.sin(zombie.walkCycle || 0) * 0.25;
    for (const [lx, ang] of [[-6, legAng], [6, -legAng]]) {
      ctx.save();
      ctx.translate(lx, 12 + walkY);
      ctx.rotate(ang);
      ctx.fillStyle = '#18181c';
      ctx.fillRect(-3.5, 0, 7, 15);
      ctx.restore();
    }

    // Thân giáp bóng tối
    ctx.fillStyle = '#202229';
    ctx.strokeStyle = isDashing ? '#ff5252' : '#9e9e9e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-11, -13 + walkY, 22, 26, 5);
    ctx.fill();
    ctx.stroke();

    // Giáp vai gai sắt
    ctx.fillStyle = '#37474f';
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-10, -13 + walkY); ctx.lineTo(-19, -18 + walkY); ctx.lineTo(-14, -5 + walkY); ctx.closePath();
    ctx.moveTo(10, -13 + walkY); ctx.lineTo(19, -18 + walkY); ctx.lineTo(14, -5 + walkY); ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Phi tiêu shuriken trên lưng
    ctx.save();
    ctx.translate(10, -5 + walkY);
    ctx.rotate(time * 2.2);
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
    ctx.moveTo(6, -6); ctx.lineTo(-6, 6);
    ctx.stroke();
    ctx.restore();

    // Đầu mặt nạ Zed với khe mắt đỏ rực
    ctx.fillStyle = '#171920';
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(-1, -22 + walkY, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(-9, -24 + walkY, 13, 6);
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(-7, -22.5 + walkY, 4, 2.6);
    ctx.fillRect(-1, -22.5 + walkY, 4, 2.6);

    // Song kiếm bóng tối ở cổ tay
    const bladeAng = isSlashing ? -0.9 : Math.sin(time * 5) * 0.1;
    ctx.save();
    ctx.translate(-11, -3 + walkY);
    ctx.rotate(bladeAng);
    ctx.fillStyle = '#263238';
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-20, -4); ctx.lineTo(-13, 4); ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    if (isDashing) {
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5252';
      ctx.fillText('MIỄN NHIỄM', 0, -48);
    }

    this.drawZombieStatus(ctx, zombie, walkY, -54, -38);
    this.drawHealthBar(ctx, -20, -38, 40, 4.8, zombie.hp / zombie.maxHp, '#ff1744');
    ctx.restore();
  }

  // 2. Yone - Song Kiếm Đấu Sĩ (Kiếm Thép + Huyết Kiếm 12% HP, Xuất Hồn E ở cột 6, Tụ lực R 1.2s lướt 3 ô)
  drawIoniaYone(ctx, zombie) {
    const time = this.getFrameTimeSec();
    const isSpirit = !!zombie.isSpiritForm;
    const isChargingR = !!zombie.isChargingR;
    const isDashingR = !!zombie.isDashingR;
    const isEmpoweredNext = zombie.yoneAttackPhase === 1;
    const isSlashing = (zombie.slashAnimTimer || 0) > 0;
    const walkY = (zombie.isEating || isChargingR || isDashingR) ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 3;

    // Đường nối linh hồn về Thể Xác khi đang Xuất Hồn (E)
    if (isSpirit && zombie.spiritBody && zombie.spiritBody.alive) {
      ctx.save();
      const bx = zombie.spiritBody.x;
      const by = zombie.spiritBody.y - 8;
      const grad = ctx.createLinearGradient(zombie.x, zombie.y - 8, bx, by);
      grad.addColorStop(0, 'rgba(128, 222, 234, 0.85)');
      grad.addColorStop(0.5, 'rgba(255, 82, 82, 0.72)');
      grad.addColorStop(1, 'rgba(128, 222, 234, 0.85)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3.2;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(zombie.x, zombie.y - 10);
      ctx.lineTo(bx, by);
      ctx.stroke();
      ctx.restore();
    }

    // Vạch báo trước Đoạt Mệnh (R) trong 1.2s tụ lực (2 ô trên hàng)
    if (isChargingR) {
      ctx.save();
      const dashW = CONFIG.CELL_WIDTH * (zombie.ultDashCells || 2);
      const startX = Math.max(CONFIG.GRID_OFFSET_X, zombie.x - dashW);
      const laneTop = zombie.y - CONFIG.CELL_HEIGHT * 0.36;
      const laneH = CONFIG.CELL_HEIGHT * 0.72;
      const prog = 1 - Math.max(0, Math.min(1, (zombie.rChargeTimer || 0) / (zombie.rChargeDuration || 1.2)));

      ctx.fillStyle = 'rgba(255, 23, 68, 0.16)';
      ctx.fillRect(startX, laneTop, zombie.x - startX, laneH);
      ctx.fillStyle = `rgba(255, 23, 68, ${0.20 + prog * 0.32})`;
      ctx.fillRect(startX + (zombie.x - startX) * (1 - prog), laneTop, (zombie.x - startX) * prog, laneH);

      ctx.strokeStyle = '#ff5252';
      ctx.lineWidth = 2.0;
      ctx.strokeRect(startX, laneTop, zombie.x - startX, laneH);

      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`ĐOẠT MỆNH ${Math.max(0, zombie.rChargeTimer || 0).toFixed(1)}s!`, (startX + zombie.x) / 2, laneTop - 5);
      ctx.restore();
    }

    this.drawHorrorShadow(ctx, zombie.x, zombie.y, 22, 8, zombie.animTime, zombie.isEating, false);
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (isSpirit) {
      // Hào quang Linh Hồn xanh ngọc (Xuất Hồn E)
      ctx.strokeStyle = 'rgba(128, 222, 234, 0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, -4, 25, 32, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(0, 229, 255, 0.12)';
      ctx.fill();
    }

    // Dây băng trắng phấp phới
    ctx.strokeStyle = isSpirit ? '#80deea' : '#eceff1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, -14 + walkY);
    ctx.quadraticCurveTo(22, -18 + Math.sin(time * 7) * 4, 28, -6);
    ctx.stroke();

    // Chân kiếm sĩ
    const legAng = (zombie.isEating || isChargingR) ? 0 : Math.sin(zombie.walkCycle || 0) * 0.24;
    for (const [lx, ang] of [[-6, legAng], [6, -legAng]]) {
      ctx.save();
      ctx.translate(lx, 12 + walkY);
      ctx.rotate(ang);
      ctx.fillStyle = isSpirit ? '#004d40' : '#263238';
      ctx.fillRect(-3.8, 0, 7.6, 15);
      ctx.restore();
    }

    // Áo võ sĩ Ionia (xanh ngọc khi Xuất Hồn, tối sẫm băng vải bình thường)
    ctx.fillStyle = isSpirit ? '#00695c' : '#2c2233';
    ctx.strokeStyle = isSpirit ? '#80deea' : (isEmpoweredNext ? '#ff5252' : '#b0bec5');
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-12, -14 + walkY, 24, 27, 5);
    ctx.fill();
    ctx.stroke();

    // Dải băng chéo ngực
    ctx.strokeStyle = '#eceff1';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-10, -11 + walkY);
    ctx.lineTo(10, 8 + walkY);
    ctx.stroke();

    // Đầu: Tóc dài đen & mặt nạ nửa mặt Azakana trắng-đỏ
    ctx.fillStyle = '#14171c';
    ctx.beginPath();
    ctx.arc(0, -24 + walkY, 10.5, 0, Math.PI * 2);
    ctx.fill();
    // Mặt nạ trắng-đỏ
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    ctx.arc(-3, -23 + walkY, 7.5, Math.PI * 0.5, Math.PI * 1.5);
    ctx.fill();
    ctx.fillStyle = '#ff1744';
    ctx.fillRect(-8, -25 + walkY, 5, 2.5);

    // Song Kiếm: Kiếm Thép (trắng-xanh) & Huyết Kiếm Azakana (đỏ rực khi đánh cường hóa)
    const swing = isSlashing ? -0.95 : (isChargingR ? 0.65 : Math.sin(time * 5) * 0.12);
    // Kiếm Thép (trên)
    ctx.save();
    ctx.translate(-10, -8 + walkY);
    ctx.rotate(swing - 0.18);
    ctx.strokeStyle = isEmpoweredNext ? '#cfd8dc' : '#80deea';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-24, -6);
    ctx.stroke();
    ctx.restore();

    // Huyết Kiếm Azakana (dưới)
    ctx.save();
    ctx.translate(-10, 0 + walkY);
    ctx.rotate(swing + 0.25);
    ctx.strokeStyle = isEmpoweredNext ? '#ff1744' : '#ef5350';
    ctx.lineWidth = isEmpoweredNext ? 3.8 : 2.6;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-26, 4);
    ctx.stroke();
    ctx.restore();

    if (isSpirit) {
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#80deea';
      ctx.fillText(`LINH HỒN ${Math.max(0, zombie.spiritFormTimer || 0).toFixed(1)}s`, 0, -52);
      if (zombie.spiritShieldHp > 0) {
        this.drawHealthBar(ctx, -20, -46, 40, 4.2, Math.min(1, zombie.spiritShieldHp / (zombie.spiritShieldMaxHp || 200)), '#00e5ff');
      }
    } else if (isEmpoweredNext) {
      ctx.font = 'bold 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ff5252';
      ctx.fillText('12% HP ⚔️', 0, -48);
    }

    const hpBarY = isSpirit && zombie.spiritShieldHp > 0 ? -39 : -40;
    this.drawZombieStatus(ctx, zombie, walkY, -60, hpBarY);
    this.drawHealthBar(ctx, -21, hpBarY, 42, 4.8, zombie.hp / zombie.maxHp, isSpirit ? '#80deea' : '#ef5350');
    ctx.restore();
  }

  // 3. Thể Xác Yone (Bất động tại cột 6, miễn nhiễm khống chế)
  drawYoneBody(ctx, zombie) {
    const time = this.getFrameTimeSec();
    const pulse = 0.55 + 0.35 * Math.sin(time * 5);

    this.drawHorrorShadow(ctx, zombie.x, zombie.y, 18, 6, zombie.animTime, false, false);
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    // Vòng ấn Thể Xác dưới đất
    ctx.strokeStyle = `rgba(128, 222, 234, ${pulse})`;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(0, 14, 22, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Thân quỳ bất động
    ctx.fillStyle = '#1c262b';
    ctx.strokeStyle = '#80deea';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-11, -10, 22, 24, 6);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(0, -18, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = 'bold 8.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#80deea';
    ctx.fillText('THỂ XÁC · MIỄN CC', 0, -40);
    this.drawHealthBar(ctx, -19, -34, 38, 4.5, zombie.hp / zombie.maxHp, '#80deea');
    ctx.restore();
  }

  // 4. Sett - Mini-Boss Đấu Trường Ionia (Tụ W hình thang vàng rực như LMHT, hoạt ảnh R nhấc bổng lộn nhào giáng đất, găng rực lửa)
  drawIoniaSett(ctx, zombie) {
    const time = this.getFrameTimeSec();
    const isPunching = (zombie.punchAnimTimer || 0) > 0;
    const isChargingW = !!zombie.isChargingW;
    const isCastingW = (zombie.wCastAnimTimer || 0) > 0;
    const isCastingR = (zombie.rSlamAnimTimer || 0) > 0 || !!zombie.rAnimActive;
    const hasShield = zombie.settShieldTimer > 0 && zombie.settShieldHp > 0;
    const gritRatio = Math.max(0, Math.min(1, (zombie.grit || 0) / (zombie.maxGrit || 800)));
    const walkY = (zombie.isEating || isChargingW || isCastingW || isCastingR) ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 3;

    // Tính vị trí nhảy, xoay & pha hoạt ảnh kỹ năng R (Hủy Diệt Đấu Trường)
    let rJumpX = zombie.rJumpOffsetX || 0;
    let rJumpY = zombie.rJumpOffsetY || 0;
    let rBodyAngle = zombie.rBodyAngle || 0;
    const rPhase = zombie.rAnimPhase || (isCastingR ? 'slam' : null);
    if (isCastingR && !zombie.rAnimActive) {
      const rProg = 1 - Math.max(0, Math.min(1, (zombie.rSlamAnimTimer || 0) / 0.65));
      rJumpY = -Math.sin(rProg * Math.PI) * 58;
      rBodyAngle = -Math.sin(rProg * Math.PI) * 0.85;
    }

    // Báo trước Cuồng Thú Quyền (W) trên mặt đất — Hình thang vàng cam với làn giữa rực lửa như ảnh LMHT
    if (isChargingW) {
      const forwardCells = zombie.wForwardCells || 3;
      const sideRows = zombie.wSideRows || 2;
      const frontX = Math.max(CONFIG.GRID_OFFSET_X, zombie.x - forwardCells * CONFIG.CELL_WIDTH - 16);
      const backX = zombie.x - 10;
      const minRow = Math.max(0, zombie.row - sideRows);
      const maxRow = Math.min(CONFIG.ROWS - 1, zombie.row + sideRows);
      const frontTopY = CONFIG.GRID_OFFSET_Y + minRow * CONFIG.CELL_HEIGHT + 4;
      const frontBotY = CONFIG.GRID_OFFSET_Y + (maxRow + 1) * CONFIG.CELL_HEIGHT - 4;
      const cTopY = CONFIG.GRID_OFFSET_Y + zombie.row * CONFIG.CELL_HEIGHT + 7;
      const cBotY = CONFIG.GRID_OFFSET_Y + (zombie.row + 1) * CONFIG.CELL_HEIGHT - 7;
      const backTopY = cTopY - Math.min(48, (cTopY - frontTopY) * 0.45);
      const backBotY = cBotY + Math.min(48, (frontBotY - cBotY) * 0.45);
      const prog = 1 - Math.max(0, Math.min(1, (zombie.wChargeTimer || 0) / (zombie.wChargeDuration || 0.50)));

      this.drawSettHaymakerZone(ctx, {
        backX, frontX,
        backTopY, backBotY,
        frontTopY, frontBotY,
        cTopY, cBotY,
        time,
        intensity: 0.72 + 0.28 * prog,
        progress: prog,
        isBlast: false
      });
    }

    // Bóng đổ co giãn theo độ cao nhảy R của Sett
    const airFactor = Math.max(0, Math.min(1, Math.abs(rJumpY) / 100));
    this.drawHorrorShadow(ctx, zombie.x + rJumpX, zombie.y, 28 * (1 - 0.38 * airFactor), 10 * (1 - 0.38 * airFactor), zombie.animTime, zombie.isEating, false);

    // Dư ảnh vàng-đỏ kéo vệt sau lưng khi Sett đang bay nhảy kỹ năng R
    if (isCastingR && Math.abs(rJumpY) > 10) {
      for (let g = 1; g <= 2; g++) {
        ctx.save();
        ctx.translate(zombie.x + rJumpX + g * 15, zombie.y + rJumpY + g * 12);
        ctx.rotate(rBodyAngle + g * 0.16);
        ctx.globalAlpha = 0.26 / g;
        ctx.fillStyle = g === 1 ? '#ffd54f' : '#ff5722';
        ctx.beginPath();
        ctx.roundRect(-18, -20, 36, 38, 10);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(zombie.x + rJumpX, zombie.y + rJumpY);

    // Xoay thân Sett theo tư thế nhào lộn/giáng đòn R (giữ HUD máu bên ngoài không bị xoay)
    ctx.save();
    if (rBodyAngle !== 0) {
      ctx.rotate(rBodyAngle);
    }

    // Hào quang đấu trường khi gồng W, tung R hoặc Gan Lì cao
    if (isChargingW || isCastingW || isCastingR || gritRatio >= 0.45) {
      const auraAlpha = isCastingR ? 0.68 : (isChargingW ? 0.55 : (0.20 + gritRatio * 0.35));
      const fireGrad = ctx.createRadialGradient(isCastingR ? 0 : 14, -12 + walkY, 4, isCastingR ? 0 : 16, -12 + walkY, isCastingR ? 52 : 42);
      fireGrad.addColorStop(0, `rgba(255, 224, 130, ${auraAlpha})`);
      fireGrad.addColorStop(0.55, `rgba(255, 111, 0, ${auraAlpha * 0.78})`);
      fireGrad.addColorStop(1, 'rgba(255, 61, 0, 0)');
      ctx.fillStyle = fireGrad;
      ctx.beginPath();
      ctx.arc(isCastingR ? 0 : 14, -12 + walkY, isCastingR ? 52 : 42, 0, Math.PI * 2);
      ctx.fill();
    }

    // Vòng năng lượng Showstopper xoáy quanh người khi đang thi triển R
    if (isCastingR) {
      ctx.strokeStyle = rPhase === 'slam' ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 193, 7, 0.85)';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([10, 6]);
      ctx.beginPath();
      ctx.ellipse(0, -6, 39, 44, 0, time * 8, time * 8 + Math.PI * 1.55);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Hào quang Giáp Ảo W (500 HP) sắc nét dạng khiên lục giác vàng rực
    if (hasShield) {
      ctx.fillStyle = 'rgba(255, 213, 79, 0.16)';
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.ellipse(0, -6, 36, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.ellipse(0, -6, 40, 48, 0, time * 2.2, time * 2.2 + Math.PI * 1.7);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (gritRatio >= 0.55) {
      ctx.strokeStyle = `rgba(255, 171, 0, ${0.42 + 0.38 * Math.sin(time * 9)})`;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(0, -6, 33, 41, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Áo choàng lông thú đỏ-trắng Vastaya (với gai vàng vai đặc trưng của Sett)
    ctx.fillStyle = '#8e0000';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(8, -16 + walkY);
    ctx.quadraticCurveTo(32, -8 + Math.sin(time * 6) * 3, 32, 20);
    ctx.lineTo(10, 20 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Chân đấu sĩ lực lưỡng (co gối khi bay R, đạp trụ khi giáng xuống)
    const legAng = (zombie.isEating || isChargingW) ? 0 : (isCastingR ? (rPhase === 'slam' ? -0.35 : 0.45) : Math.sin(zombie.walkCycle || 0) * 0.22);
    for (const [lx, ang] of [[-8, legAng], [8, -legAng]]) {
      ctx.save();
      ctx.translate(lx, 14 + walkY);
      ctx.rotate(ang);
      ctx.fillStyle = '#263238';
      ctx.fillRect(-5.5, 0, 11, isCastingR && rPhase === 'leap' ? 12 : 16);
      ctx.restore();
    }

    // Thân hình đô con cơ bắp & đai lưng vàng đấu trường
    const leanX = isChargingW ? 6 : (isCastingW ? -8 : (isCastingR ? -6 : 0));
    ctx.fillStyle = (isChargingW || isCastingW || isCastingR) ? '#ff8f00' : '#4a1c1c';
    ctx.strokeStyle = (isChargingW || hasShield || isCastingR) ? '#ffe082' : '#ff6d00';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-17 + leanX, -17 + walkY, 34, 32, 7);
    ctx.fill();
    ctx.stroke();

    // Cổ lông trắng & mặt cơ bắp
    ctx.fillStyle = '#eceff1';
    ctx.beginPath();
    ctx.ellipse(leanX, -17 + walkY, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đầu Sett với mái tóc đỏ rực & đôi tai sói Vastaya
    ctx.fillStyle = '#ffccbc';
    ctx.beginPath();
    ctx.arc(-1 + leanX, -28 + walkY, 11.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d84315';
    ctx.beginPath();
    ctx.moveTo(-12 + leanX, -31 + walkY); ctx.lineTo(-17 + leanX, -45 + walkY); ctx.lineTo(-4 + leanX, -36 + walkY);
    ctx.lineTo(3 + leanX, -46 + walkY); ctx.lineTo(11 + leanX, -35 + walkY); ctx.lineTo(16 + leanX, -42 + walkY); ctx.lineTo(10 + leanX, -28 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(-7 + leanX, -30 + walkY, 4.5, 2.8);
    ctx.fillRect(-1 + leanX, -30 + walkY, 4.5, 2.8);

    // Đôi găng thép khổng lồ (Gồng tụ lửa vàng khi W, vươn tay ôm & nện đất khi R, hoặc đấm lao trái/phải)
    const punchOffset = isPunching ? -18 : (isChargingW ? 12 : (isCastingW ? -20 : 0));
    const punchHand = zombie.punchHand || 0;
    for (let h = 0; h < 2; h++) {
      let hy = (h === 0 ? -7 : 5) + walkY;
      let hx = -16 + leanX + ((isChargingW || isCastingW || (isPunching && punchHand === h)) ? punchOffset : 0);
      if (isCastingR) {
        if (rPhase === 'windup' || rPhase === 'leap') {
          // Hai tay vươn lên trước ôm chặt mục tiêu đang nhấc bổng
          hx = -23 + leanX;
          hy = (h === 0 ? -22 : -8);
        } else if (rPhase === 'slam') {
          // Hai găng giáng thẳng xuống mặt sân
          hx = -18 + (h === 0 ? -7 : 9);
          hy = 18;
        }
      }
      if (isChargingW || isCastingW || isCastingR || gritRatio >= 0.65) {
        ctx.fillStyle = isCastingR ? 'rgba(255, 235, 59, 0.5)' : 'rgba(255, 213, 79, 0.35)';
        ctx.beginPath();
        ctx.arc(hx - 2, hy, isCastingR ? 15 : 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = (isChargingW || isCastingW || isCastingR) ? '#ffe082' : '#ffb300';
      ctx.strokeStyle = (isChargingW || isCastingW || isCastingR) ? '#ffffff' : '#ff3d00';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.roundRect(hx - 10, hy - 6, isCastingR ? 17 : 15, isCastingR ? 14 : 12, 4);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore(); // Kết thúc phần thân xoay theo rBodyAngle

    // Nhãn & thanh Giáp Ảo + Thanh Gan Lì (Grit 0..800) + Thanh Máu (3000 HP)
    if (hasShield) {
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffd54f';
      ctx.fillText(`GIÁP W: ${Math.ceil(zombie.settShieldHp)} (${zombie.settShieldTimer.toFixed(1)}s)`, 0, -64);
    }
    // Thanh Gan Lì ngay dưới thanh HP
    this.drawHealthBar(ctx, -27, -45, 54, 4.0, gritRatio, '#ffb300');
    this.drawZombieStatus(ctx, zombie, walkY, -70, -53);
    this.drawHealthBar(ctx, -27, -53, 54, 5.8, zombie.hp / zombie.maxHp, '#ff5252');
    ctx.restore();
  }

  // ============================================================================
  // MAP 20: CÁC KẺ ĐỊCH & BOSS BẾN CẢNG TỬ THẦN (BLOODHARBOR PIER)
  // ============================================================================
  drawDrownedSailor(ctx, zombie) {
    const t = this.getFrameTimeSec();
    const walkY = zombie.isEating ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 3.2;

    ctx.save();
    ctx.translate(zombie.x, zombie.y - walkY);

    // Bóng & vũng nước chân
    ctx.fillStyle = 'rgba(0, 229, 255, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Áo thủy thủ mục nát ngấm nước biển
    ctx.fillStyle = '#1d3b42';
    ctx.strokeStyle = '#091519';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-12, -10, 24, 30, 5);
    ctx.fill();
    ctx.stroke();

    // Đai lưng da & dao găm rỉ
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-12, 4, 24, 5);
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-12, 2);
    ctx.lineTo(-24, -5 + Math.sin(t * 7) * 2);
    ctx.stroke();

    // Đầu xanh xám bọt biển & khăn trùm hải tặc
    ctx.fillStyle = '#4f6d6b';
    ctx.beginPath();
    ctx.arc(0, -21, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#0d47a1';
    ctx.beginPath();
    ctx.arc(0, -25, 12, Math.PI, Math.PI * 2);
    ctx.fill();

    // Mắt phát sáng bọt biển
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(-5, -21, 2.2, 0, Math.PI * 2);
    ctx.arc(2, -21, 2.2, 0, Math.PI * 2);
    ctx.fill();

    this.drawZombieStatus(ctx, zombie, walkY, -46, -38);
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -40, 36, 4.5, zombie.hp / zombie.maxHp, '#00e5ff');
    }
    ctx.restore();
  }

  drawAnchorBearer(ctx, zombie) {
    const walkY = zombie.isEating ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 2.4;
    const slamSwing = zombie.anchorSlamAnimTimer > 0 ? Math.sin((zombie.anchorSlamAnimTimer / 0.45) * Math.PI) : 0;
    const bites = zombie.anchorBiteCount || 0;

    ctx.save();
    ctx.translate(zombie.x, zombie.y - walkY);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 28, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân hộ pháp thợ lặn biển sâu
    ctx.fillStyle = '#263238';
    ctx.strokeStyle = '#0b1014';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.roundRect(-18, -18, 36, 42, 8);
    ctx.fill();
    ctx.stroke();

    // Mũ lặn đồng rỉ sét có kính tròn phát sáng cam
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.arc(0, -28, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffab00';
    ctx.beginPath();
    ctx.arc(-4, -28, 5, 0, Math.PI * 2);
    ctx.fill();

    // Mỏ neo sắt khổng lồ (vung mạnh ở cú cắn thứ 3)
    ctx.save();
    ctx.translate(-18, -4);
    ctx.rotate(-0.3 - slamSwing * 1.15);
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(0, 18);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 16, 12, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();

    // 3 chấm tích lũy Đẩy Lùi mỏ neo
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < bites ? '#ffab00' : 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(-8 + i * 8, -48, 2.7, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawZombieStatus(ctx, zombie, walkY, -62, -54);
    this.drawHealthBar(ctx, -22, -55, 44, 5.2, zombie.hp / zombie.maxHp, '#ffab00');
    ctx.restore();
  }

  drawSwimmingGhost(ctx, zombie) {
    const t = this.getFrameTimeSec();
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (zombie.isSubmerged) {
      // Đang lặn ngầm: Vòng sóng nước + vây linh hồn xanh ngọc
      ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
      ctx.beginPath();
      ctx.ellipse(0, 14, 24, 9, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.ellipse(0, 14, 18 + Math.sin(t * 8) * 3, 6, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#00bcd4';
      ctx.beginPath();
      ctx.moveTo(-6, 12);
      ctx.lineTo(-14, -10);
      ctx.lineTo(8, 12);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#80deea';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌊 LẶN NGẦM', 0, -16);
    } else {
      // Đã trồi lên ở Cột 5
      const floatY = Math.sin(t * 5) * 3;
      ctx.translate(0, floatY);
      ctx.globalAlpha = 0.88;

      ctx.fillStyle = '#00838f';
      ctx.strokeStyle = '#80deea';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-12, 22);
      ctx.quadraticCurveTo(-15, -10, 0, -24);
      ctx.quadraticCurveTo(15, -10, 12, 22);
      ctx.lineTo(4, 16);
      ctx.lineTo(-4, 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e0f7fa';
      ctx.beginPath();
      ctx.arc(-4, -11, 2.4, 0, Math.PI * 2);
      ctx.arc(4, -11, 2.4, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = 1;
      this.drawZombieStatus(ctx, zombie, 0, -38, -32);
      this.drawHealthBar(ctx, -18, -33, 36, 4.5, zombie.hp / zombie.maxHp, '#26c6da');
    }
    ctx.restore();
  }

  drawWantedCaptain(ctx, zombie) {
    const t = this.getFrameTimeSec();
    const walkY = zombie.isEating ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * 3.5;

    ctx.save();
    ctx.translate(zombie.x, zombie.y - walkY);

    // Hào quang ĐẦU LÂU ĐỎ dưới chân
    ctx.strokeStyle = `rgba(255, 23, 68, ${0.65 + Math.sin(t * 7) * 0.28})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.ellipse(0, 26, 22, 8, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Áo choàng Thuyền Trưởng đỏ thẫm viền vàng
    ctx.fillStyle = '#7f0000';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-14, -14, 28, 36, 6);
    ctx.fill();
    ctx.stroke();

    // Mũ thuyền trưởng 3 góc & đầu lâu vàng
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(0, -24, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.moveTo(-20, -28);
    ctx.lineTo(0, -42);
    ctx.lineTo(20, -28);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.stroke();

    // Biểu tượng ĐẦU LÂU ĐỎ TRUY NÃ nổi bật trên đầu
    const skullBob = Math.sin(t * 6) * 3;
    ctx.fillStyle = 'rgba(18, 4, 8, 0.9)';
    ctx.beginPath();
    ctx.roundRect(-34, -72 + skullBob, 68, 16, 5);
    ctx.fill();
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.fillStyle = '#ff5252';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('💀 TRUY NÃ', 0, -61 + skullBob);

    this.drawZombieStatus(ctx, zombie, walkY, -52, -46);
    this.drawHealthBar(ctx, -20, -49, 40, 5.2, zombie.hp / zombie.maxHp, '#ff1744');
    ctx.restore();
  }

  drawZombotPyke(ctx, zombie) {
    const t = this.getFrameTimeSec();
    const phase = zombie.pykePhase || 1;
    const isStuck = (zombie.pykeStuckTimer || 0) > 0;
    const isVuln = (zombie.pykeVulnerableTimer || 0) > 0;
    const phaseColor = phase >= 3 ? '#ff1744' : (phase === 2 ? '#ffab00' : '#00e5ff');
    const bob = isStuck ? 0 : Math.sin(t * 2.8) * 3.5;

    ctx.save();
    ctx.translate(zombie.x, zombie.y + bob);

    // Bóng & xoáy nước khổng lồ dưới chân Boss
    ctx.fillStyle = 'rgba(0, 12, 18, 0.72)';
    ctx.beginPath();
    ctx.ellipse(0, 44, 52, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isVuln ? '#ffd54f' : phaseColor;
    ctx.lineWidth = isVuln ? 3.2 : 2.2;
    ctx.stroke();

    // Thân Zombot Đồ Tể giáp thép Bilgewater
    const bodyGrad = ctx.createLinearGradient(-34, -46, 34, 34);
    bodyGrad.addColorStop(0, '#1c313a');
    bodyGrad.addColorStop(0.5, '#0d1b22');
    bodyGrad.addColorStop(1, '#261419');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.roundRect(-34, -42, 68, 72, 12);
    ctx.fill();
    ctx.stroke();

    // Gai vai hàm cá mập
    ctx.fillStyle = '#455a64';
    ctx.beginPath();
    ctx.moveTo(-36, -34); ctx.lineTo(-54, -54); ctx.lineTo(-22, -44); ctx.closePath();
    ctx.moveTo(36, -34); ctx.lineTo(54, -54); ctx.lineTo(22, -44); ctx.closePath();
    ctx.fill();

    // Lõi năng lượng trước ngực (đổi màu theo Phase)
    ctx.fillStyle = phaseColor;
    ctx.beginPath();
    ctx.arc(0, -10, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -10, 5, 0, Math.PI * 2);
    ctx.fill();

    // Đầu trùm khăn bịt mặt & mắt rực sáng
    ctx.fillStyle = '#102027';
    ctx.beginPath();
    ctx.arc(0, -56, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Khăn bịt mặt Đồ Tể đỏ/ngọc
    ctx.fillStyle = phase >= 3 ? '#b71c1c' : '#006064';
    ctx.beginPath();
    ctx.roundRect(-18, -56, 36, 18, 6);
    ctx.fill();

    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.ellipse(-7, -61, 4, 2.4, -0.2, 0, Math.PI * 2);
    ctx.ellipse(7, -61, 4, 2.4, 0.2, 0, Math.PI * 2);
    ctx.fill();

    // Móc câu Bone Skewer khổng lồ bên tay trái hướng về phía đội hình cây
    ctx.save();
    ctx.translate(-38, -8);
    ctx.rotate(zombie.pykeTelegraph ? Math.sin(t * 14) * 0.18 : Math.sin(t * 2.4) * 0.08);
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-34, -8);
    ctx.lineTo(-48, -22);
    ctx.arc(-42, -8, 14, -Math.PI * 0.7, Math.PI * 0.5);
    ctx.stroke();
    ctx.strokeStyle = phaseColor;
    ctx.lineWidth = 2.0;
    ctx.stroke();
    ctx.restore();

    // Trạng thái bị KẸT ×2 SÁT THƯƠNG
    if (isStuck || isVuln) {
      const rem = Math.max(zombie.pykeStuckTimer || 0, zombie.pykeVulnerableTimer || 0);
      ctx.fillStyle = 'rgba(20, 10, 0, 0.9)';
      ctx.beginPath();
      ctx.roundRect(-58, -104, 116, 18, 6);
      ctx.fill();
      ctx.strokeStyle = '#ffd54f';
      ctx.lineWidth = 1.6;
      ctx.stroke();
      ctx.fillStyle = '#ffd54f';
      ctx.font = 'bold 10.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`💥 KẸT ×2 DMG (${rem.toFixed(1)}s)`, 0, -92);
    }

    this.drawZombieStatus(ctx, zombie, 0, -90, -80);
    this.drawHealthBar(ctx, -42, -84, 84, 7.0, zombie.hp / zombie.maxHp, phaseColor);
    ctx.restore();
  }

  // Hiệu ứng Khiên Kiếm Linh Hồn (350 Giáp, Độc xuyên qua bình thường)
  drawSpiritShieldOverlay(ctx, zombie) {
    const time = this.getFrameTimeSec() * 4;
    const maxShield = zombie.spiritShieldMaxHp || 350;
    const shieldRatio = Math.max(0, Math.min(1, zombie.spiritShieldHp / maxShield));

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    // Vòng khiên năng lượng tím-lam sắc nét bao bọc zombie
    const rx = zombie.type === 'jurassic_bully' ? 28 : 22;
    const ry = zombie.type === 'jurassic_bully' ? 38 : 32;
    ctx.fillStyle = 'rgba(156, 39, 176, 0.14)';
    ctx.strokeStyle = 'rgba(224, 64, 251, 0.9)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.ellipse(0, -2, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Vòng xoáy Kiếm Linh Hồn hộ thể
    ctx.strokeStyle = 'rgba(128, 222, 234, 0.85)';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.ellipse(0, -2, rx + 3, ry + 3, 0, time * 2.5, time * 2.5 + Math.PI * 1.6);
    ctx.stroke();
    ctx.setLineDash([]);

    // Thanh Kiếm Linh Hồn mini bay quanh khiên
    const swordAngle = time * 2.4;
    const sx = Math.cos(swordAngle) * (rx + 4);
    const sy = Math.sin(swordAngle) * 10 - 6;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.fillStyle = '#e040fb';
    ctx.strokeStyle = '#e0f7fa';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(2.5, -2);
    ctx.lineTo(1.8, 7);
    ctx.lineTo(-1.8, 7);
    ctx.lineTo(-2.5, -2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Thanh giáp Kiếm Linh Hồn (màu tím sáng phía trên thanh máu)
    this.drawHealthBar(ctx, -19, -48, 38, 4.5, shieldRatio, '#e040fb');

    ctx.restore();
  }

  // ==========================================
  // HỆ THỐNG HIỆU ỨNG & ĐỒ HỌA ZOMBIE PVZ 2 CHUẨN
  // ==========================================

  // Bóng đổ mặt đất tự nhiên, mượt mà dưới chân zombie
  drawHorrorShadow(ctx, x, y, rx, ry, animTime, isEating, isLowHp) {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Hiệu ứng biến mất hoạt hình nhẹ nhàng khi zombie tử trận
  drawHorrorDissolution(ctx, zombie) {
    const p = Math.min(1.0, zombie.deathTimer / 1.1);
    const starCount = 5;
    ctx.save();
    for (let i = 0; i < starCount; i++) {
      const angle = (i * Math.PI * 2) / starCount + (zombie.animTime || 0);
      const dist = p * 22 + (i * 2);
      const starX = Math.cos(angle) * dist;
      const starY = -p * 24 - Math.sin(angle) * 6;
      const alpha = Math.max(0, 1 - p);

      ctx.fillStyle = `rgba(255, 235, 59, ${alpha * 0.85})`;
      ctx.beginPath();
      ctx.arc(starX, starY, 2.2 * (1 - p * 0.4), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 1. Zombie Thường (Regular Zombie / Browncoat - Phong Cách Hoạt Họa PvZ 2 Chính Gốc)
  drawRegularZombie(ctx, zombie) {
    const isLowHp = zombie.hp < zombie.maxHp * 0.5;

    // Bóng đổ mặt cỏ mượt mà
    if (zombie.alive) {
      this.drawHorrorShadow(ctx, zombie.x, zombie.y + 28, 20, 7, zombie.animTime || 0, zombie.isEating, isLowHp);
    }

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 1.2);
      this.drawHorrorDissolution(ctx, zombie);
    }

    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const walkY = zombie.alive && !zombie.isEating ? Math.sin(cycle) * 2.8 : 0;
    const legAngle = zombie.alive && !zombie.isEating ? Math.sin(cycle) * 0.45 : 0;

    // --- A. Đôi chân và Quần Tây Xanh Xám (PvZ 2 Trousers) ---
    // Chân sau
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(3, 12 + walkY);
    ctx.lineTo(3 + Math.sin(legAngle) * 9, 28);
    ctx.stroke();
    // Giày tây đen sau
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.roundRect(1 + Math.sin(legAngle) * 9, 26, 9, 4.5, 2);
    ctx.fill();

    // Chân trước (gần camera hơn)
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 7.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 12 + walkY);
    ctx.lineTo(-4 - Math.sin(legAngle) * 9, 28);
    ctx.stroke();
    // Ống quần rách gấu đặc trưng PvZ
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-7 - Math.sin(legAngle) * 9, 25);
    ctx.lineTo(-1 - Math.sin(legAngle) * 9, 25);
    ctx.stroke();

    // Giày tây đen trước bóng bẩy
    ctx.fillStyle = '#1e1e1e';
    ctx.beginPath();
    ctx.roundRect(-8 - Math.sin(legAngle) * 9, 26, 11, 5, 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fillRect(-6 - Math.sin(legAngle) * 9, 27, 4, 1.5);

    // --- B. Cổ nối đầu & thân ---
    ctx.fillStyle = '#7da06d';
    ctx.fillRect(-3.5, -8 + walkY, 7, 6);

    // --- C. Áo khoác vest nâu & Áo sơ mi trắng & Cà vạt đỏ tươi ---
    // Thân áo vest nâu
    const suitGrad = ctx.createLinearGradient(-12, -4 + walkY, 12, 16 + walkY);
    suitGrad.addColorStop(0, '#8d6e63');
    suitGrad.addColorStop(0.5, '#795548');
    suitGrad.addColorStop(1, '#5d4037');

    ctx.fillStyle = suitGrad;
    ctx.beginPath();
    ctx.roundRect(-12, -4 + walkY, 24, 20, 4);
    ctx.fill();
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Ve cổ áo vest
    ctx.fillStyle = '#a1887f';
    ctx.beginPath();
    ctx.moveTo(-11, -4 + walkY); ctx.lineTo(-4, 4 + walkY); ctx.lineTo(-10, 12 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(11, -4 + walkY); ctx.lineTo(4, 4 + walkY); ctx.lineTo(10, 12 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Áo sơ mi trắng lộ ở cổ
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    ctx.moveTo(-4, -4 + walkY);
    ctx.lineTo(0, 4 + walkY);
    ctx.lineTo(4, -4 + walkY);
    ctx.closePath();
    ctx.fill();

    // Cà vạt đỏ tươi PvZ 2
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.moveTo(-2.5, -2 + walkY);
    ctx.lineTo(2.5, -2 + walkY);
    ctx.lineTo(3.5, 8 + walkY);
    ctx.lineTo(0, 13 + walkY);
    ctx.lineTo(-3.5, 8 + walkY);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Khuy cúc áo vàng
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.arc(0, 12 + walkY, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // --- D. Cánh tay Zombie vươn dài ra phía trước chuẩn tư thế PvZ ---
    const armReachX = zombie.isEating ? -24 : -21;
    const armReachY = zombie.isEating ? (Math.sin((zombie.animTime || 0) * 12) * 4) : (1 + walkY);

    // Cánh tay sau
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(8, 0 + walkY);
    ctx.lineTo(13, 7 + walkY);
    ctx.stroke();
    // Bàn tay xanh sau
    ctx.fillStyle = '#7da06d';
    ctx.beginPath();
    ctx.arc(13, 7 + walkY, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Cánh tay trước (vươn thẳng ngang ngực về phía trước)
    // Ống tay áo vest nâu
    ctx.strokeStyle = '#795548';
    ctx.lineWidth = 5.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, 1 + walkY);
    ctx.lineTo(-13, 1 + walkY);
    ctx.stroke();

    // Cẳng tay da xanh thối rữa hoạt hình
    ctx.strokeStyle = '#7da06d';
    ctx.lineWidth = 4.0;
    ctx.beginPath();
    ctx.moveTo(-13, 1 + walkY);
    ctx.lineTo(armReachX, armReachY);
    ctx.stroke();

    // Bàn tay hoạt họa với các ngón tay xòe ra nắm bắt
    ctx.fillStyle = '#7da06d';
    ctx.beginPath();
    ctx.arc(armReachX, armReachY, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4e6d3f';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    // Ngón tay hoạt họa ngộ nghĩnh
    ctx.fillStyle = '#7da06d';
    ctx.beginPath();
    ctx.ellipse(armReachX - 3.5, armReachY - 1.5, 2.2, 1.2, -0.2, 0, Math.PI * 2);
    ctx.ellipse(armReachX - 4.0, armReachY + 0.8, 2.2, 1.2, 0, 0, Math.PI * 2);
    ctx.ellipse(armReachX - 3.2, armReachY + 2.8, 2.2, 1.2, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // --- E. Đầu Zombie Ngộ Nghĩnh Hài Hước Đặc Trưng PvZ 2 ---
    const headTilt = zombie.isEating 
      ? (Math.sin((zombie.animTime || 0) * 10) * 0.14) 
      : 0.04;

    ctx.save();
    ctx.translate(0, -18 + walkY);
    ctx.rotate(headTilt);

    // Hộp sọ màu xanh rêu / olive tươi sáng chuẩn PvZ 2
    const headGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 16);
    headGrad.addColorStop(0, '#92b781');
    headGrad.addColorStop(0.7, '#7da06d');
    headGrad.addColorStop(1, '#5a784d');

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#445e39';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Sợi tóc xoăn ngộ nghĩnh trên đỉnh đầu
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(1, -15);
    ctx.quadraticCurveTo(5, -20, 2, -22);
    ctx.stroke();

    // ĐÔI MẮT BẤT ĐỐI XỨNG HÀI HƯỚC KINH ĐIỂN CỦA PVZ
    // Mắt phải (to tròn ngơ ngác)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5.5, -3, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#33492a';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Con ngươi mắt phải lệch ngộ nghĩnh
    ctx.fillStyle = '#1c211a';
    ctx.beginPath();
    ctx.arc(-6.5, -2.8, 2.2, 0, Math.PI * 2);
    ctx.fill();
    // Đốm sáng phản chiếu
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-7.2, -3.5, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Mắt trái (nhỏ hơn, hơi lé hài hước)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4.8, -3, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#33492a';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Con ngươi mắt trái
    ctx.fillStyle = '#1c211a';
    ctx.beginPath();
    ctx.arc(3.8, -2.8, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(3.2, -3.4, 0.7, 0, Math.PI * 2);
    ctx.fill();

    // KHUÔN MIỆNG VẨU RĂNG ĐẶC TRƯNG PVZ 2 (Underbite cartoon mouth)
    const mouthOpen = zombie.isEating ? 7 : 3.5;
    ctx.fillStyle = '#3a2024';
    ctx.beginPath();
    ctx.ellipse(zombie.isEating ? -7 : -6, 5, zombie.isEating ? 6 : 4.5, mouthOpen, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#271216';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Hàng răng cửa vuông vức trắng ngà hoạt hình
    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    ctx.rect(-9, 4, 3, 3);
    ctx.rect(-5, 4, 3, 3);
    ctx.rect(-8, 7, 3, 3);
    ctx.fill();
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 0.8;
    ctx.strokeRect(-9, 4, 3, 3);
    ctx.strokeRect(-5, 4, 3, 3);
    ctx.strokeRect(-8, 7, 3, 3);

    // Mẩu thức ăn xanh văng ra khi đang ngoạm cây vui nhộn
    if (zombie.isEating) {
      ctx.fillStyle = '#4caf50';
      ctx.beginPath();
      ctx.arc(-14, 4 + Math.sin(zombie.animTime * 15) * 3, 1.3, 0, Math.PI * 2);
      ctx.arc(-12, 8 + Math.cos(zombie.animTime * 12) * 3, 1.0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    this.drawZombieStatus(ctx, zombie, walkY, -48, -34);

    if (zombie.alive && zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -42, 36, 4, zombie.hp / zombie.maxHp, '#d50000');
    }

    ctx.restore();
  }

  // 2. Gargantuar — Khổng Lồ Quái Vật Bất Tử (Horror Abomination Juggernaut)
  drawGargantuar(ctx, zombie) {
    const isLowHp = zombie.hp < zombie.maxHp * 0.5;

    // Bóng ma quái khổng lồ với tử khí cuồn cuộn
    if (zombie.alive) {
      this.drawHorrorShadow(ctx, zombie.x, zombie.y + 36, 38, 13, zombie.animTime || 0, zombie.isSmashing, isLowHp);
    }

    ctx.save();
    ctx.translate(zombie.x, zombie.y);
    ctx.scale(1.18, 1.18); // Tăng kích thước thêm 18% tạo vóc dáng khổng lồ uy lực lấn át

    // Hào quang tử khí & cuồng nộ đỏ rực quanh vai
    if (zombie.alive) {
      ctx.save();
      ctx.fillStyle = isLowHp ? 'rgba(255, 23, 68, 0.25)' : 'rgba(183, 28, 28, 0.14)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 36, 44, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 1.0);
      this.drawHorrorDissolution(ctx, zombie);
    }

    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const walkY = zombie.alive && !zombie.isSmashing ? Math.sin(cycle) * 2.5 : 0;
    const legAngle = zombie.alive && !zombie.isSmashing ? Math.sin(cycle) * 0.35 : 0;

    // --- A. Giỏ đựng Imp bằng gỗ mục đóng đinh sắt & xích máu (Backpack) ---
    ctx.save();
    ctx.translate(15, -14 + walkY);

    // Thùng gỗ đen mục với thanh sắt rỉ sét
    ctx.fillStyle = '#2d1f1b';
    ctx.beginPath();
    ctx.roundRect(-4, -6, 22, 28, 4);
    ctx.fill();
    ctx.strokeStyle = '#140c0a';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Dây xích sắt đen siết ngang ngực
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(-18, 9);
    ctx.stroke();

    // Imp Quỷ Lùn trong giỏ (nếu chưa ném)
    if (!zombie.hasThrownImp) {
      ctx.save();
      ctx.translate(7, -11);

      // Đầu Imp quỷ dị với tai nhọn dơi
      ctx.fillStyle = '#455a64';
      ctx.beginPath();
      ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
      ctx.fill();

      // Tai nhọn quỷ dơi
      ctx.fillStyle = '#37474f';
      ctx.beginPath();
      ctx.moveTo(-6, -4); ctx.lineTo(-13, -9); ctx.lineTo(-5, 1);
      ctx.closePath();
      ctx.fill();

      // Mắt quỷ đỏ rực trong đêm tối
      ctx.fillStyle = '#0a0d0b';
      ctx.beginPath();
      ctx.arc(-2.5, -1.5, 3.2, 0, Math.PI * 2);
      ctx.arc(3.0, -1.5, 2.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(-2.5, -1.5, 1.8, 0, Math.PI * 2);
      ctx.arc(3.0, -1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();

      // Răng nanh quỷ nhọn
      ctx.fillStyle = '#fff59d';
      ctx.beginPath();
      ctx.moveTo(-4, 3); ctx.lineTo(-2, 6); ctx.lineTo(0, 3);
      ctx.fill();

      ctx.restore();
    }
    ctx.restore();

    // --- B. Đôi chân hộ pháp gân guốc bọc giáp sắt nát ---
    ctx.strokeStyle = '#1c2529';
    ctx.lineWidth = 10;
    // Chân sau
    ctx.beginPath();
    ctx.moveTo(8, 16);
    ctx.lineTo(8 + Math.sin(legAngle) * 12, 36);
    ctx.stroke();
    // Bàn chân quái vật to lớn đạp vỡ đất
    ctx.fillStyle = '#10171a';
    ctx.fillRect(8 + Math.sin(legAngle) * 12 - 7, 34, 16, 6);

    // Chân trước
    ctx.beginPath();
    ctx.moveTo(-8, 16);
    ctx.lineTo(-8 - Math.sin(legAngle) * 12, 36);
    ctx.stroke();
    ctx.fillRect(-8 - Math.sin(legAngle) * 12 - 11, 34, 18, 6);

    // Xích sắt quấn quanh cổ chân
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 2.2;
    ctx.strokeRect(-8 - Math.sin(legAngle) * 12 - 5, 28, 10, 4);

    // --- C. Thân hình khổng lồ chắp vá, gân máu đỏ rực & đinh ghim kim loại ---
    ctx.fillStyle = '#37474f'; // Thịt xác chết xám đậm
    ctx.beginPath();
    ctx.roundRect(-19, -12 + walkY, 36, 32, 8);
    ctx.fill();

    // Gân máu đỏ tím phồng rộp trên lồng ngực
    ctx.strokeStyle = 'rgba(213, 0, 0, 0.7)';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-12, -4 + walkY); ctx.lineTo(-6, 2 + walkY); ctx.lineTo(-10, 8 + walkY);
    ctx.moveTo(4, -6 + walkY); ctx.lineTo(10, 0 + walkY); ctx.lineTo(6, 6 + walkY);
    ctx.stroke();

    // Vết khâu kim loại / Ghim sắt dập trên da thịt (Iron Staples)
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 2;
    for (let s = -8; s <= 6; s += 5) {
      ctx.beginPath();
      ctx.moveTo(s - 1, -8 + walkY);
      ctx.lineTo(s + 2, -8 + walkY);
      ctx.stroke();
      ctx.fillStyle = '#111111';
      ctx.fillRect(s - 2, -9 + walkY, 1.5, 2);
      ctx.fillRect(s + 2, -9 + walkY, 1.5, 2);
    }

    // Áo gi-lê da thuộc cũ nát đẫm máu
    ctx.fillStyle = '#271813';
    ctx.beginPath();
    ctx.roundRect(-17, -10 + walkY, 14, 28, 4);
    ctx.roundRect(4, -10 + walkY, 12, 28, 4);
    ctx.fill();

    // Vết máu bắn loang lổ trên áo
    ctx.fillStyle = '#6a0a16';
    ctx.beginPath();
    ctx.arc(-8, 4 + walkY, 4, 0, Math.PI * 2);
    ctx.arc(10, 8 + walkY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Thắt lưng sắt to bản có đầu lâu nhỏ
    ctx.fillStyle = '#151515';
    ctx.fillRect(-17, 12 + walkY, 34, 7);
    ctx.fillStyle = '#90a4ae';
    ctx.strokeRect(-7, 11 + walkY, 14, 9);

    // --- D. Đầu Gargantuar Dị Dạng Khát Máu ---
    ctx.save();
    ctx.translate(-6, -26 + walkY);

    // Hộp sọ đồ sộ méo mó
    ctx.fillStyle = '#455a64';
    ctx.beginPath();
    ctx.ellipse(0, 0, 21, 19, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // Bu-lông sắt tán xuyên qua thái dương
    ctx.fillStyle = '#78909c';
    ctx.fillRect(-20, -8, 5, 7);
    ctx.fillRect(17, -8, 5, 7);
    ctx.fillStyle = '#263238';
    ctx.fillRect(-22, -6, 2, 3);
    ctx.fillRect(22, -6, 2, 3);

    // Hàm dưới bạnh ra nhô về phía trước
    ctx.fillStyle = '#2e3b42';
    ctx.beginPath();
    ctx.roundRect(-17, 6, 28, 13, 5);
    ctx.fill();

    // Răng nanh đại quỷ nhọn hoắt dính đầy máu tươi
    ctx.fillStyle = '#fff9c4';
    ctx.beginPath();
    ctx.moveTo(-13, 6); ctx.lineTo(-10, 0); ctx.lineTo(-7, 6);
    ctx.moveTo(-4, 6); ctx.lineTo(-1, 0); ctx.lineTo(2, 6);
    ctx.moveTo(5, 6); ctx.lineTo(7, 1); ctx.lineTo(10, 6);
    ctx.fill();

    // Máu tươi nhỏ giọt từ khóe hàm
    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.arc(-10, 3, 2, 0, Math.PI * 2);
    ctx.arc(-1, 3, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Mắt phải: ĐỒNG TỬ ĐỎ RỰC TỎA LỬA ĐỊA NGỤC (Cyclopean Hellfire Eye)
    ctx.fillStyle = '#0a0d0b';
    ctx.beginPath();
    ctx.arc(-8, -4, 6.2, 0, Math.PI * 2);
    ctx.fill();

    // Quầng lửa đỏ ma quỷ
    ctx.fillStyle = 'rgba(255, 61, 0, 0.4)';
    ctx.beginPath();
    ctx.arc(-8, -4, 8.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ff3d00';
    ctx.beginPath();
    ctx.arc(-8, -4, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(-8.5, -4.5, 1.6, 0, Math.PI * 2);
    ctx.fill();

    // Mắt trái: Bị khâu chéo bằng ghim sắt rỉ sét tàn bạo
    ctx.strokeStyle = '#1b1b1b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(3, -8); ctx.lineTo(12, 0);
    ctx.moveTo(12, -8); ctx.lineTo(3, 0);
    ctx.stroke();
    // Máu đông quanh vết khâu mắt
    ctx.fillStyle = '#4a0810';
    ctx.beginPath();
    ctx.arc(7.5, -4, 4.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // --- E. CỘT ĐIỆN QUÁI VẬT BỌC DÂY KẼM GAI & ĐINH SẮT (Horror Smash Pole) ---
    ctx.save();
    ctx.translate(-10, -4 + walkY);

    let poleAngle = -0.35;
    if (zombie.isSmashing) {
      const cycleTime = zombie.attackTimer || 0;
      const windup = zombie.smashWindup || 1.1;

      if (cycleTime < windup) {
        const p = cycleTime / windup;
        poleAngle = -0.35 - p * 1.15; // Vung cực cao về sau
      } else {
        const strikeProgress = Math.min(1.0, (cycleTime - windup) / 0.22);
        poleAngle = -1.5 + strikeProgress * 2.3; // Giáng sấm sét chẻ đôi mặt đất
      }
    } else if (zombie.isThrowingImp) {
      poleAngle = -0.75;
    }

    ctx.rotate(poleAngle);

    // Thân cột gỗ đen mục nát
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.roundRect(-8, -50, 16, 66, 3);
    ctx.fill();
    ctx.strokeStyle = '#21130d';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Máu tươi vấy đẫm ở đầu cột điện đập
    ctx.fillStyle = '#6a0a16';
    ctx.fillRect(-8, -50, 16, 24);
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(-8, -48, 16, 8);

    // Thanh xà ngang bằng gỗ
    ctx.fillStyle = '#2d1c16';
    ctx.fillRect(-20, -48, 40, 8);

    // Các quả sứ cách điện nứt vỡ
    ctx.fillStyle = '#cfd8dc';
    ctx.beginPath();
    ctx.arc(-15, -50, 4, 0, Math.PI * 2);
    ctx.arc(15, -50, 4, 0, Math.PI * 2);
    ctx.fill();

    // Dây kẽm gai sắc nhọn quấn quanh thân cột (Barbed Wire)
    ctx.strokeStyle = '#90a4ae';
    ctx.lineWidth = 1.6;
    for (let wy = -36; wy <= 6; wy += 10) {
      ctx.beginPath();
      ctx.moveTo(-10, wy);
      ctx.lineTo(10, wy + 4);
      ctx.stroke();
      // Gai nhọn chĩa ra
      ctx.fillStyle = '#cfd8dc';
      ctx.fillRect(-12, wy - 1, 3, 2);
      ctx.fillRect(9, wy + 3, 3, 2);
    }

    // Đinh đường sắt khổng lồ đóng xuyên qua cột
    ctx.fillStyle = '#546e7a';
    ctx.fillRect(-12, -20, 24, 4);
    ctx.fillRect(-11, -2, 22, 4);

    ctx.restore();

    // Cánh tay hộ pháp gân guốc ghì chặt thân cột
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 8.5;
    ctx.beginPath();
    ctx.moveTo(-10, -6 + walkY);
    ctx.lineTo(-24, 4 + walkY);
    ctx.stroke();

    // Vòng sắt có gai quanh cổ tay
    ctx.fillStyle = '#212121';
    ctx.fillRect(-24, 0 + walkY, 6, 7);
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(-25, 2 + walkY, 2, 3);

    // HIỆU ỨNG RUNG CHUYỂN NỨT ĐẤT KHI ĐẬP (Ground Shatter Fissure FX)
    if (zombie.isSmashing && zombie.attackTimer >= (zombie.smashWindup || 1.1)) {
      ctx.save();
      // Vệt nứt toác mặt đất màu đỏ máu & than đen
      ctx.strokeStyle = 'rgba(183, 28, 28, 0.85)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-35, 34); ctx.lineTo(-55, 38); ctx.lineTo(-70, 32);
      ctx.moveTo(-45, 36); ctx.lineTo(-58, 44);
      ctx.stroke();

      // Bụi đất và tia lửa ma quỷ bắn tung tóe
      ctx.fillStyle = '#ff3d00';
      ctx.beginPath();
      ctx.arc(-55, 32, 2.5, 0, Math.PI * 2);
      ctx.arc(-65, 26, 2.0, 0, Math.PI * 2);
      ctx.arc(-42, 28, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    this.drawZombieStatus(ctx, zombie, walkY, -64, -50);

    if (zombie.alive && zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -26, -58 + walkY, 52, 6, zombie.hp / zombie.maxHp, '#d50000');
    }

    ctx.restore();
  }

  // 3. Imp — Chú Zombie Nhí Nhanh Nhẹn (Chuẩn Hoạt Họa PvZ 2)
  drawImp(ctx, zombie) {
    const isLowHp = zombie.hp < zombie.maxHp * 0.5;

    // Bóng đổ mượt mà dưới chân Imp
    if (zombie.alive) {
      this.drawHorrorShadow(ctx, zombie.x, zombie.y + 18, 13, 5.0, zombie.animTime || 0, zombie.isEating, isLowHp);
    }

    ctx.save();
    ctx.translate(zombie.x, zombie.y);
    ctx.scale(0.72, 0.72);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 1.5);
      this.drawHorrorDissolution(ctx, zombie);
    }

    // Bước chạy lon ton siêu nhanh của Imp
    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const walkY = zombie.alive && !zombie.isEating ? Math.sin(cycle * 1.8) * 3.5 : 0;
    const legAngle = zombie.alive && !zombie.isEating ? Math.sin(cycle * 1.8) * 0.65 : 0;

    // Đôi chân bé xíu mặc quần short xanh tím
    ctx.strokeStyle = '#5e35b1';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 10 + walkY);
    ctx.lineTo(-4 - Math.sin(legAngle) * 9, 23);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(4, 10 + walkY);
    ctx.lineTo(4 + Math.sin(legAngle) * 9, 23);
    ctx.stroke();

    // Giày sneaker thể thao nhỏ màu đỏ trắng
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.roundRect(-7 - Math.sin(legAngle) * 9, 21, 7, 4, 1.5);
    ctx.roundRect(2 + Math.sin(legAngle) * 9, 21, 7, 4, 1.5);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-7 - Math.sin(legAngle) * 9, 23, 7, 1.5);
    ctx.fillRect(2 + Math.sin(legAngle) * 9, 23, 7, 1.5);

    // Thân bé xíu mặc áo tím năng động
    const bodyGrad = ctx.createLinearGradient(-8, -4 + walkY, 8, 14 + walkY);
    bodyGrad.addColorStop(0, '#7e57c2');
    bodyGrad.addColorStop(1, '#512da8');

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.roundRect(-8, -4 + walkY, 16, 16, 4);
    ctx.fill();
    ctx.strokeStyle = '#311b92';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Dây đeo yếm / cổ áo vàng cam
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.arc(0, 4 + walkY, 1.5, 0, Math.PI * 2);
    ctx.fill();

    // Cánh tay nhỏ vươn ra
    const armX = zombie.isEating ? -16 : -13;
    const armY = zombie.isEating ? (Math.sin((zombie.animTime || 0) * 16) * 4) : (-1 + walkY);

    ctx.strokeStyle = '#7da06d';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-5, 0 + walkY);
    ctx.lineTo(armX, armY);
    ctx.stroke();

    // Bàn tay xanh tròn nhỏ
    ctx.fillStyle = '#7da06d';
    ctx.beginPath();
    ctx.arc(armX, armY, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // --- Đầu Imp Quá Khổ Dễ Thương ---
    const headTilt = zombie.isEating 
      ? Math.sin((zombie.animTime || 0) * 12) * 0.14 
      : 0.05;

    ctx.save();
    ctx.translate(0, -14 + walkY);
    ctx.rotate(headTilt);

    // Hộp sọ màu xanh rêu sáng PvZ 2
    const headGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 14);
    headGrad.addColorStop(0, '#9ccc65');
    headGrad.addColorStop(0.65, '#8bc34a');
    headGrad.addColorStop(1, '#689f38');

    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 13.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#558b2f';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Đôi mắt to tròn ngộ nghĩnh không cân xứng
    // Mắt phải (to tròn)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.5, -2, 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#33691e';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(-5.2, -1.8, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5.8, -2.4, 0.9, 0, Math.PI * 2);
    ctx.fill();

    // Mắt trái (nhỏ hơn ngộ nghĩnh)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4.2, -2, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#33691e';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(3.4, -1.8, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(2.8, -2.4, 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Miệng cười nhăn nhở / há ngoạm
    const mouthW = zombie.isEating ? 5.5 : 3.5;
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.ellipse(zombie.isEating ? -5 : -4, 4.5, zombie.isEating ? 5.8 : 4.5, mouthW, 0, 0, Math.PI * 2);
    ctx.fill();

    // Răng sún ngộ nghĩnh của Imp
    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    ctx.rect(-6, 3.5, 2.5, 2.5);
    ctx.rect(-2, 3.5, 2.5, 2.5);
    ctx.fill();
    ctx.strokeStyle = '#5d4037';
    ctx.lineWidth = 0.6;
    ctx.strokeRect(-6, 3.5, 2.5, 2.5);
    ctx.strokeRect(-2, 3.5, 2.5, 2.5);

    // Chỏm tóc dựng đứng trên đỉnh đầu
    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -13); ctx.quadraticCurveTo(-2, -19, -4, -22);
    ctx.moveTo(1, -13); ctx.quadraticCurveTo(3, -18, 5, -21);
    ctx.stroke();

    ctx.restore();

    this.drawZombieStatus(ctx, zombie, walkY, -40, -28);

    if (zombie.alive && zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -14, -34, 28, 3.5, zombie.hp / zombie.maxHp, '#d50000');
    }

    ctx.restore();
  }

  // 4. Jurassic Bully — Quái Thú Tiền Sử Đột Biến (Horror Apex Beast Brute)
  drawJurassicBully(ctx, zombie) {
    const isLowHp = zombie.hp < zombie.maxHp * 0.5;

    // Bóng tử khí mặt đất
    if (zombie.alive) {
      this.drawHorrorShadow(ctx, zombie.x, zombie.y + 30, 29, 9.5, zombie.animTime || 0, zombie.isEating, isLowHp);
    }

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 1.2);
      this.drawHorrorDissolution(ctx, zombie);
    }

    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const walkY = zombie.alive && !zombie.isEating ? Math.sin(cycle) * 2.2 : 0;
    const legAngle = zombie.alive && !zombie.isEating ? Math.sin(cycle) * 0.32 : 0;

    // --- A. Chân to hộ pháp có vảy gai bò sát ---
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 7.5;
    ctx.beginPath();
    ctx.moveTo(-7, 12);
    ctx.lineTo(-7 - Math.sin(legAngle) * 9, 30);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(7, 12);
    ctx.lineTo(7 + Math.sin(legAngle) * 9, 30);
    ctx.stroke();

    // Móng vuốt thú săn mồi sắc lẹm
    ctx.fillStyle = '#10171a';
    ctx.fillRect(-11 - Math.sin(legAngle) * 9, 28, 9, 4.5);
    ctx.fillRect(4 + Math.sin(legAngle) * 9, 28, 9, 4.5);

    // Váy da thú hổ báo rách rưới đẫm máu
    ctx.fillStyle = '#b26a00';
    ctx.beginPath();
    ctx.roundRect(-15, 8 + walkY, 30, 13, 3);
    ctx.fill();
    // Vết cào & đốm đen thú dữ
    ctx.fillStyle = '#211202';
    ctx.fillRect(-9, 11 + walkY, 4, 3);
    ctx.fillRect(2, 13 + walkY, 4, 3);
    ctx.fillRect(8, 10 + walkY, 4, 3);

    // --- B. Thân hình vạm vỡ cuồn cuộn với giáp vảy đen & sẹo cào rợn người ---
    ctx.fillStyle = '#455a64'; // Lớp da xác sống bò sát
    ctx.beginPath();
    ctx.roundRect(-17, -10 + walkY, 34, 23, 6);
    ctx.fill();

    // Các mảng giáp vảy rồng/khủng long đen sần sùi trên lưng
    ctx.fillStyle = '#21272b';
    ctx.fillRect(10, -8 + walkY, 6, 18);
    ctx.fillRect(6, -6 + walkY, 4, 14);

    // Vết cào thú khổng lồ rách toác ngực ứa máu
    ctx.strokeStyle = '#b71c1c';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-12, -6 + walkY); ctx.lineTo(-2, 4 + walkY);
    ctx.moveTo(-8, -8 + walkY); ctx.lineTo(2, 2 + walkY);
    ctx.moveTo(-4, -10 + walkY); ctx.lineTo(6, 0 + walkY);
    ctx.stroke();

    // Vòng xuyến xương thú sắc nhọn vắt chéo ngực
    ctx.strokeStyle = '#fff9c4';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-16, -10 + walkY);
    ctx.lineTo(16, 10 + walkY);
    ctx.stroke();

    // Tay to lực lưỡng với nắm đấm bọc đá gai (Bone Knuckledusters)
    const armReach = zombie.isEating ? -24 : -16;
    const armY = zombie.isEating ? (Math.sin((zombie.animTime || 0) * 12) * 6) : (6 + walkY);

    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 6.5;
    ctx.beginPath();
    ctx.moveTo(-12, -4 + walkY);
    ctx.lineTo(armReach, armY);
    ctx.stroke();

    // Khớp xương & gai đá bọc tay đấm
    ctx.fillStyle = '#fffde7';
    ctx.fillRect(armReach - 4, armY - 3, 7, 6);
    ctx.fillStyle = '#212121';
    ctx.fillRect(armReach - 6, armY - 2, 3, 4);

    // --- C. Đầu Bully Tiền Sử Hung Bạo Đầy Sát Khí ---
    ctx.save();
    ctx.translate(-4, -22 + walkY);

    // Hộp sọ to bạnh
    ctx.fillStyle = '#546e7a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16.5, 14.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tóc bờm thú đen xơ xác dựng ngược
    ctx.fillStyle = '#141414';
    ctx.beginPath();
    ctx.arc(0, -10, 13, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(-13, -15, 26, 8);

    // Gờ trán nhô ra đanh thép hung tợn
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-13, -5, 26, 4.5);

    // MẮT THÚ SĂN MỒI RỰC LỬA CAM ĐỎ (Predatory Amber-Red Eyes)
    ctx.fillStyle = '#0a0d0b';
    ctx.beginPath();
    ctx.arc(-6, -1, 4.2, 0, Math.PI * 2);
    ctx.arc(4, -1, 3.6, 0, Math.PI * 2);
    ctx.fill();

    // Tròng mắt hổ phách đỏ rực
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath();
    ctx.arc(-6, -1, 2.4, 0, Math.PI * 2);
    ctx.arc(4, -1, 2.0, 0, Math.PI * 2);
    ctx.fill();

    // Đồng tử khe dọc dã thú
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.fillRect(-6.5, -3, 1.2, 4);
    ctx.fillRect(3.5, -3, 1.0, 4);

    // Xương xỏ qua vách mũi dính máu
    ctx.strokeStyle = '#fffde7';
    ctx.lineWidth = 3.2;
    ctx.beginPath();
    ctx.moveTo(-11, 4);
    ctx.lineTo(7, 4);
    ctx.stroke();
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(-4, 3, 3, 2.5);

    // Miệng rộng ngoác với 2 răng kiếm nanh hổ tiền sử (Sabertooth Fangs)
    const mouthDepth = zombie.isEating ? 6 : 4;
    ctx.fillStyle = '#100508';
    ctx.beginPath();
    ctx.ellipse(zombie.isEating ? -4 : -3, 8, zombie.isEating ? 5.5 : 4, mouthDepth, 0, 0, Math.PI * 2);
    ctx.fill();

    // Răng kiếm dài nhọn hoắt chĩa ngược lên
    ctx.fillStyle = '#fffde7';
    ctx.beginPath();
    ctx.moveTo(-6, 9); ctx.lineTo(-4, 1); ctx.lineTo(-2, 9);
    ctx.moveTo(1, 9); ctx.lineTo(3, 2); ctx.lineTo(5, 9);
    ctx.fill();

    // Máu tươi văng ra khi cắn 100 HP/s
    if (zombie.isEating) {
      ctx.fillStyle = '#d50000';
      ctx.beginPath();
      ctx.arc(-9, 8 + Math.sin(zombie.animTime * 14) * 3, 1.8, 0, Math.PI * 2);
      ctx.arc(-11, 5 + Math.cos(zombie.animTime * 12) * 2, 1.4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Huy hiệu Kháng Đẩy Lùi Kiểu Khiên Đá Sắt Cổ Đại (Runic Knockback Barrier)
    if (zombie.alive) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 179, 0, 0.95)';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🛡️ KHÁNG ĐẨY LÙI', 0, -36 + walkY);
      ctx.restore();
    }

    this.drawZombieStatus(ctx, zombie, walkY, -54, -44);

    if (zombie.alive && zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -20, -42, 40, 4.5, zombie.hp / zombie.maxHp, '#ff6d00');
    }

    ctx.restore();
  }

  // 5. Turquoise Skull Zombie — Linh Mục Tử Thần Sọ Ngọc Bích (Horror Necromancer Lich)
  drawTurquoiseSkull(ctx, zombie) {
    const isLowHp = zombie.hp < zombie.maxHp * 0.5;

    // Bóng tử khí hắc ám ngọc bích
    if (zombie.alive) {
      this.drawHorrorShadow(ctx, zombie.x, zombie.y + 28, 23, 7.8, zombie.animTime || 0, zombie.alive && zombie.isChargingLaser, isLowHp);
    }

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 1.3);
      this.drawHorrorDissolution(ctx, zombie);
    }

    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const walkY = zombie.alive && !zombie.isEating && !zombie.isChargingLaser ? Math.sin(cycle) * 2.5 : 0;
    const legAngle = zombie.alive && !zombie.isEating && !zombie.isChargingLaser ? Math.sin(cycle) * 0.35 : 0;

    // Chân xác ướp gầy guộc
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-5, 12);
    ctx.lineTo(-5 - Math.sin(legAngle) * 8, 28);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(5, 12);
    ctx.lineTo(5 + Math.sin(legAngle) * 8, 28);
    ctx.stroke();

    // Áo choàng tử thần bóng tối (Death Cultist Shroud)
    ctx.fillStyle = '#00251a';
    ctx.beginPath();
    ctx.roundRect(-12, -8 + walkY, 24, 23, 4);
    ctx.fill();

    // Viền thêu phù chú ngọc bích ma thuật
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.2;
    ctx.strokeRect(-11, 4 + walkY, 22, 10);

    // Ký tự cổ ngữ phát sáng trên áo
    ctx.fillStyle = '#18ffff';
    ctx.fillRect(-6, 7 + walkY, 3, 4);
    ctx.fillRect(3, 7 + walkY, 3, 4);

    // Thân hình khô đét như xác ướp
    ctx.fillStyle = '#455a64';
    ctx.beginPath();
    ctx.roundRect(-8, -6 + walkY, 16, 18, 3);
    ctx.fill();

    // --- Đầu Linh Mục Tử Thần ---
    ctx.save();
    ctx.translate(-2, -20 + walkY);

    // Mũ lông quạ đen & ngọc bích ma quái
    ctx.fillStyle = '#00b4d8';
    ctx.beginPath();
    ctx.moveTo(-8, -10); ctx.lineTo(-14, -24); ctx.lineTo(-4, -12);
    ctx.moveTo(0, -10); ctx.lineTo(0, -28); ctx.lineTo(4, -10);
    ctx.moveTo(6, -10); ctx.lineTo(12, -23); ctx.lineTo(8, -11);
    ctx.fill();

    // Lông quạ đen ở viền mũ
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.moveTo(-10, -10); ctx.lineTo(-18, -18); ctx.lineTo(-7, -13);
    ctx.moveTo(8, -10); ctx.lineTo(16, -17); ctx.lineTo(6, -13);
    ctx.fill();

    // Hộp sọ xác ướp khô đét
    ctx.fillStyle = '#546e7a';
    ctx.beginPath();
    ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
    ctx.fill();

    // Hốc mắt đen sâu hoắm bốc khói ngọc bích
    ctx.fillStyle = '#00141a';
    ctx.beginPath();
    ctx.arc(-4, -1, 3.6, 0, Math.PI * 2);
    ctx.arc(4, -1, 3.4, 0, Math.PI * 2);
    ctx.fill();

    // ĐỐM LỬA LINH HỒN NGỌC BÍCH LE LÓI TRONG HỐC MẮT (Spectral Cyan Soulflames)
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(-4, -1, 1.6, 0, Math.PI * 2);
    ctx.arc(4, -1, 1.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-4.2, -1.2, 0.7, 0, Math.PI * 2);
    ctx.arc(3.8, -1.2, 0.6, 0, Math.PI * 2);
    ctx.fill();

    // Miệng khô đen lộ răng
    ctx.fillStyle = '#111111';
    ctx.fillRect(-4, 5, 8, 3);
    ctx.fillStyle = '#cfd8dc';
    ctx.fillRect(-3, 5, 2, 2);
    ctx.fillRect(1, 5, 2, 2);

    ctx.restore();

    // --- SỌ NGỌC BÍCH MA THUẬT (CURSED TURQUOISE SKULL ARTIFACT) ---
    ctx.save();
    const skullPulse = zombie.alive && zombie.isChargingLaser ? Math.sin((zombie.animTime || 0) * 16) * 3.0 : 0;
    const skullFloatY = Math.sin((zombie.animTime || 0) * 4) * 2;
    ctx.translate(-15, -6 + walkY + skullFloatY);

    // Cánh tay gầy trơ xương nâng sọ
    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(9, -2);
    ctx.lineTo(0, 4);
    ctx.stroke();

    // KHI ĐANG TỤ LỰC LASER: Vòng tròn ma pháp & sấm sét ngọc bích (Occult Charge Vortex)
    if (zombie.alive && zombie.isChargingLaser) {
      const chargeRatio = Math.min(1.0, (zombie.laserTimer || 0) / (zombie.laserChargeDuration || 5.0));

      // 1. Quầng hào quang năng lượng tà ác bùng phát
      ctx.save();
      ctx.fillStyle = `rgba(0, 229, 255, ${0.25 + chargeRatio * 0.55})`;
      ctx.beginPath();
      ctx.arc(0, 0, 18 + chargeRatio * 18 + skullPulse, 0, Math.PI * 2);
      ctx.fill();

      // 2. Vòng tròn ma pháp xung kích
      ctx.strokeStyle = '#18ffff';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 15 + chargeRatio * 15, 0, Math.PI * 2);
      ctx.stroke();

      // 3. Các tia chớp ma quỷ crackling xung quanh sọ
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 4; i++) {
        const sparkAng = (zombie.animTime * 12 + i * Math.PI * 0.5);
        const sx = Math.cos(sparkAng) * (12 + chargeRatio * 10);
        const sy = Math.sin(sparkAng) * (12 + chargeRatio * 10);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(sx, sy);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Khối Sọ Ngọc Bích Cổ Đại (Turquoise Skull)
    // Hào quang ma mị
    ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
    ctx.beginPath();
    ctx.arc(0, -2, 12 + (skullPulse ? 1.5 : 0), 0, Math.PI * 2);
    ctx.fill();

    // Khối sọ ngọc bích
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(0, -2, 9.5 + (skullPulse ? 1 : 0), 0, Math.PI * 2);
    ctx.fill();

    // Hàm dưới sọ
    ctx.fillStyle = '#00b4d8';
    ctx.beginPath();
    ctx.roundRect(-5.5, 4.5, 11, 6.5, 2);
    ctx.fill();

    // Hốc mắt đen thăm thẳm của sọ
    ctx.fillStyle = '#00252b';
    ctx.beginPath();
    ctx.arc(-3.8, -2, 2.8, 0, Math.PI * 2);
    ctx.arc(3.8, -2, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Tia sáng trắng tinh khiết lóe lên từ mắt sọ
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-3.2, -2.5, 1.2, 0, Math.PI * 2);
    ctx.arc(4.2, -2.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Thanh tiến trình tụ lực Laser (5.0s) phong cách Ma Pháp Hắc Ám
    if (zombie.alive && zombie.isChargingLaser) {
      const chargeRatio = Math.min(1.0, (zombie.laserTimer || 0) / (zombie.laserChargeDuration || 5.0));
      const remainingSec = Math.max(0, (zombie.laserChargeDuration - zombie.laserTimer)).toFixed(1);

      ctx.save();
      ctx.fillStyle = '#18ffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`⚡ MA QUẢNG LASER: ${remainingSec}s`, 0, -42 + walkY);

      // Khung thanh năng lượng tà đạo
      ctx.fillStyle = 'rgba(0, 20, 25, 0.85)';
      ctx.fillRect(-20, -37 + walkY, 40, 5);
      ctx.fillStyle = '#00e5ff';
      ctx.fillRect(-20, -37 + walkY, 40 * chargeRatio, 5);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(-20, -37 + walkY, 40, 5);
      ctx.restore();
    }

    this.drawZombieStatus(ctx, zombie, walkY, -52, -42);

    if (zombie.alive && zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -16, -34, 32, 4, zombie.hp / zombie.maxHp, '#00e5ff');
    }

    ctx.restore();
  }

  // 6.1. Khối Băng Chứa Yeti Imp (Ice Block - Frostbite Caves)
  drawIceBlock(ctx, zombie) {
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 2.0);
    }

    // Bóng đổ trên mặt đất
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 26, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Khối băng tinh thể 3D bán trong suốt
    const hpRatio = Math.max(0, zombie.hp / zombie.maxHp);
    const iceGrad = ctx.createLinearGradient(-22, -26, 22, 26);
    iceGrad.addColorStop(0, 'rgba(224, 247, 250, 0.95)');
    iceGrad.addColorStop(0.3, 'rgba(128, 222, 234, 0.88)');
    iceGrad.addColorStop(0.7, 'rgba(38, 198, 218, 0.85)');
    iceGrad.addColorStop(1, 'rgba(0, 151, 167, 0.9)');

    ctx.fillStyle = iceGrad;
    ctx.beginPath();
    ctx.roundRect(-22, -26, 44, 52, 8);
    ctx.fill();

    ctx.strokeStyle = '#b2ebf2';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Bóng hình mờ của Yeti Imp bị đông cứng bên trong khối băng
    ctx.fillStyle = 'rgba(236, 239, 241, 0.65)';
    ctx.beginPath();
    ctx.arc(0, -6, 10, 0, Math.PI * 2); // Đầu imp
    ctx.roundRect(-8, 3, 16, 15, 4);    // Thân imp
    ctx.fill();

    // 2 sừng băng nhỏ của Yeti Imp lờ mờ bên trong
    ctx.fillStyle = 'rgba(0, 172, 193, 0.7)';
    ctx.beginPath();
    ctx.moveTo(-7, -13); ctx.lineTo(-12, -20); ctx.lineTo(-4, -14);
    ctx.moveTo(7, -13); ctx.lineTo(12, -20); ctx.lineTo(4, -14);
    ctx.fill();

    // Mắt đỏ phát sáng lấp ló trong băng
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(-3, -7, 1.8, 0, Math.PI * 2);
    ctx.arc(3, -7, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Vệt nứt trên tảng băng khi mất máu
    if (hpRatio < 0.75) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-14, -18); ctx.lineTo(-6, -6); ctx.lineTo(-12, 6);
      ctx.stroke();
    }
    if (hpRatio < 0.45) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(12, -15); ctx.lineTo(4, -2); ctx.lineTo(10, 12);
      ctx.moveTo(-4, -24); ctx.lineTo(2, -12); ctx.lineTo(-2, 18);
      ctx.stroke();
    }

    // Tia sáng lấp lánh phản chiếu bề mặt băng
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.moveTo(-16, -20); ctx.lineTo(-6, -24); ctx.lineTo(-12, -16);
    ctx.closePath();
    ctx.fill();

    // Thanh máu nếu bị thương
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -34, 36, 4.5, hpRatio, '#00e5ff');
    }

    ctx.restore();
  }

  // 6.2. Zombie Người Tiền Sử Đẩy Băng (Troglobite - Frostbite Caves)
  drawTroglobite(ctx, zombie) {
    const isLowHp = zombie.hp < zombie.maxHp * 0.5;
    if (zombie.alive) {
      this.drawHorrorShadow(ctx, zombie.x, zombie.y + 24, 22, 7.5, zombie.animTime || 0, false, isLowHp);
    }

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 1.5);
      this.drawHorrorDissolution(ctx, zombie);
    }

    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const isMoving = zombie.alive && !zombie.isEating;
    const walkY = isMoving ? Math.sin(cycle) * 2.0 : 0;
    const legAngle = isMoving ? Math.sin(cycle) * 0.35 : 0;

    // Chân và bàn chân người tiền sử
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    // Chân trái
    ctx.save();
    ctx.translate(-5, 12);
    ctx.rotate(legAngle);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2, 14); ctx.stroke();
    ctx.restore();
    // Chân phải
    ctx.save();
    ctx.translate(6, 12);
    ctx.rotate(-legAngle);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, 14); ctx.stroke();
    ctx.restore();

    // Thân áo da thú tiền sử (Fur Tunic)
    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.moveTo(-13, -8 + walkY);
    ctx.lineTo(13, -8 + walkY);
    ctx.lineTo(15, 14 + walkY);
    ctx.lineTo(9, 10 + walkY);
    ctx.lineTo(3, 15 + walkY);
    ctx.lineTo(-4, 11 + walkY);
    ctx.lineTo(-10, 16 + walkY);
    ctx.lineTo(-14, 11 + walkY);
    ctx.closePath();
    ctx.fill();

    // Đốm họa tiết da báo tiền sử
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(-5, 0 + walkY, 2.5, 0, Math.PI * 2);
    ctx.arc(5, 4 + walkY, 2.2, 0, Math.PI * 2);
    ctx.arc(1, -4 + walkY, 2, 0, Math.PI * 2);
    ctx.fill();

    // Dây đai xương chéo qua ngực
    ctx.strokeStyle = '#d7ccc8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-11, -8 + walkY);
    ctx.lineTo(11, 10 + walkY);
    ctx.stroke();

    // Đầu người tiền sử với trán vồ và tóc rối
    ctx.fillStyle = '#558b2f';
    ctx.beginPath();
    ctx.arc(0, -18 + walkY, 11, 0, Math.PI * 2);
    ctx.fill();

    // Tóc bờm đen tiền sử bù xù
    ctx.fillStyle = '#212121';
    ctx.beginPath();
    ctx.arc(0, -22 + walkY, 13, Math.PI, 0);
    ctx.lineTo(12, -14 + walkY);
    ctx.lineTo(9, -10 + walkY);
    ctx.lineTo(-9, -10 + walkY);
    ctx.lineTo(-12, -14 + walkY);
    ctx.closePath();
    ctx.fill();

    // Khúc xương gài trên tóc
    ctx.fillStyle = '#f5f5f5';
    ctx.beginPath();
    ctx.roundRect(-10, -25 + walkY, 20, 4, 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-10, -25 + walkY, 3, 0, Math.PI * 2);
    ctx.arc(10, -25 + walkY, 3, 0, Math.PI * 2);
    ctx.fill();

    // Mắt hung tợn và miệng nhe răng
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(-4, -18 + walkY, 2.8, 0, Math.PI * 2);
    ctx.arc(4, -18 + walkY, 2.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.arc(-4, -18 + walkY, 1.4, 0, Math.PI * 2);
    ctx.arc(4, -18 + walkY, 1.4, 0, Math.PI * 2);
    ctx.fill();

    // Hai cánh tay dang rộng vươn về phía trước đẩy tảng băng!
    ctx.strokeStyle = '#558b2f';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-6, -4 + walkY);
    ctx.lineTo(-20, -6 + walkY);
    ctx.lineTo(-26, -3 + walkY);

    ctx.moveTo(6, -4 + walkY);
    ctx.lineTo(-14, 2 + walkY);
    ctx.lineTo(-24, 4 + walkY);
    ctx.stroke();

    // Thanh máu nếu bị thương
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -35 + walkY, 36, 4.5, zombie.hp / zombie.maxHp, '#ff1744');
    }

    ctx.restore();
  }

  // 6.3. Yeti Imp Nhanh Nhẹn (Frostbite Caves)
  drawYetiImp(ctx, zombie) {
    const isLowHp = zombie.hp < zombie.maxHp * 0.5;
    if (zombie.alive) {
      this.drawHorrorShadow(ctx, zombie.x, zombie.y + 20, 16, 5.5, zombie.animTime || 0, false, isLowHp);
    }

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 1.6);
      this.drawHorrorDissolution(ctx, zombie);
    }

    const cycle = Number.isFinite(zombie.walkCycle) ? zombie.walkCycle : 0;
    const isMoving = zombie.alive && !zombie.isEating;
    const runCycle = cycle * 1.5;
    const walkY = isMoving ? Math.sin(runCycle) * 2.2 : 0;
    const legAngle = isMoving ? Math.sin(runCycle) * 0.55 : 0;

    // Chân Yeti tí hon chạy thoăn thoắt
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.save();
    ctx.translate(-4, 10);
    ctx.rotate(legAngle);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-2, 10); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(4, 10);
    ctx.rotate(-legAngle);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1, 10); ctx.stroke();
    ctx.restore();

    // Thân lông xù trắng muốt của Yeti (Fluffy White Body)
    ctx.fillStyle = '#eceff1';
    ctx.beginPath();
    ctx.roundRect(-9, -2 + walkY, 18, 15, 6);
    ctx.fill();
    ctx.strokeStyle = '#b0bec5';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Đầu Yeti Imp to tròn phủ đầy lông trắng
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, -11 + walkY, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Khuôn mặt da xanh băng giá
    ctx.fillStyle = '#80deea';
    ctx.beginPath();
    ctx.ellipse(0, -10 + walkY, 7, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hai sừng băng xanh ngọc cong nhọn trên đầu
    ctx.fillStyle = '#00acc1';
    ctx.beginPath();
    ctx.moveTo(-6, -18 + walkY); ctx.lineTo(-12, -26 + walkY); ctx.lineTo(-2, -20 + walkY);
    ctx.moveTo(6, -18 + walkY); ctx.lineTo(12, -26 + walkY); ctx.lineTo(2, -20 + walkY);
    ctx.fill();

    // Đôi mắt đỏ hung tợn của quỷ tuyết
    ctx.fillStyle = '#ffd600';
    ctx.beginPath();
    ctx.arc(-3, -11 + walkY, 2.5, 0, Math.PI * 2);
    ctx.arc(3, -11 + walkY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.arc(-3, -11 + walkY, 1.3, 0, Math.PI * 2);
    ctx.arc(3, -11 + walkY, 1.3, 0, Math.PI * 2);
    ctx.fill();

    // Miệng nhe răng nanh nhọn hoắt
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.arc(0, -6 + walkY, 3, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-2, -6 + walkY, 1.2, 2);
    ctx.fillRect(1, -6 + walkY, 1.2, 2);

    // Hai tay lông xù vung vẩy khi chạy
    ctx.strokeStyle = '#eceff1';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-8, -2 + walkY);
    ctx.lineTo(-14, 4 + walkY);
    ctx.moveTo(8, -2 + walkY);
    ctx.lineTo(14, 4 + walkY);
    ctx.stroke();

    // Thanh máu nếu bị thương
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -14, -28 + walkY, 28, 3.5, zombie.hp / zombie.maxHp, '#ff1744');
    }

    ctx.restore();
  }

  // 6. Tia Laser Ma Thuật Hư Vô của Turquoise Skull (Eldritch Void-Beam FX)
  drawLaserBeams(ctx, laserBeams) {
    for (const beam of laserBeams) {
      if (beam.timer <= 0) continue;
      const alpha = Math.min(1.0, beam.timer / 0.16);

      ctx.save();
      ctx.lineCap = 'round';
      // 1. Quầng năng lượng Plasma ngọc bích tỏa rộng
      ctx.strokeStyle = `rgba(0, 229, 255, ${alpha * 0.42})`;
      ctx.lineWidth = 18;
      ctx.beginPath();
      ctx.moveTo(beam.fromX, beam.fromY);
      ctx.lineTo(beam.toX, beam.toY);
      ctx.stroke();

      // 2. Luồng plasma ngọc bích sắc nét
      ctx.strokeStyle = `rgba(24, 255, 255, ${alpha * 0.92})`;
      ctx.lineWidth = 7.5;
      ctx.beginPath();
      ctx.moveTo(beam.fromX, beam.fromY);
      ctx.lineTo(beam.toX, beam.toY);
      ctx.stroke();

      // 3. Lõi hủy diệt trắng tinh khiết
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.moveTo(beam.fromX, beam.fromY);
      ctx.lineTo(beam.toX, beam.toY);
      ctx.stroke();

      // Điểm phát tia ở đầu sọ
      ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.65})`;
      ctx.beginPath();
      ctx.arc(beam.fromX, beam.fromY, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(beam.fromX, beam.fromY, 4.5, 0, Math.PI * 2);
      ctx.fill();

      // 4. Vòng tròn nổ xung kích sắc nét tại mục tiêu
      ctx.fillStyle = `rgba(0, 229, 255, ${alpha * 0.55})`;
      ctx.beginPath();
      ctx.arc(beam.toX, beam.toY, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.beginPath();
      ctx.arc(beam.toX, beam.toY, 9, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.85})`;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(beam.toX, beam.toY, 26 * (1.12 - alpha * 0.12), 0, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    }
  }

  // 7. Vẽ Imp đang bay theo quỹ đạo parabol trên không trung (Horror Flying Imp)
  drawFlyingImps(ctx, flyingImps) {
    for (const fImp of flyingImps) {
      if (!fImp.alive) continue;

      const heightAboveLawn = Math.max(0, fImp.targetY - fImp.y);
      const shadowScale = Math.max(0.35, 1 - heightAboveLawn / 120);

      // Bóng tử khí đổ trên sân cỏ
      ctx.save();
      ctx.fillStyle = 'rgba(6, 3, 10, 0.45)';
      ctx.beginPath();
      ctx.ellipse(fImp.x, fImp.targetY + 28, 14 * shadowScale, 5 * shadowScale, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Imp quỷ dữ nhào lộn
      ctx.save();
      ctx.translate(fImp.x, fImp.y);
      ctx.rotate(fImp.rotation);
      ctx.scale(0.68, 0.68);

      // Thân yếm tím đen
      ctx.fillStyle = '#4a148c';
      ctx.beginPath();
      ctx.roundRect(-8, -4, 16, 16, 3);
      ctx.fill();

      // Tay chân quỷ giang rộng với móng vuốt nhọn
      ctx.strokeStyle = '#546e7a';
      ctx.lineWidth = 3.5;
      ctx.beginPath();
      ctx.moveTo(-6, -2); ctx.lineTo(-14, -10);
      ctx.moveTo(6, -2); ctx.lineTo(14, -10);
      ctx.moveTo(-4, 10); ctx.lineTo(-10, 18);
      ctx.moveTo(4, 10); ctx.lineTo(10, 18);
      ctx.stroke();

      // Móng vuốt đen
      ctx.fillStyle = '#111111';
      ctx.fillRect(-15, -12, 4, 3);
      ctx.fillRect(13, -12, 4, 3);

      // Đầu Imp quỷ với mắt đỏ rực và tai dơi
      ctx.fillStyle = '#546e7a';
      ctx.beginPath();
      ctx.arc(0, -12, 12.5, 0, Math.PI * 2);
      ctx.fill();

      // Tai nhọn dơi
      ctx.fillStyle = '#37474f';
      ctx.beginPath();
      ctx.moveTo(-7, -14); ctx.lineTo(-16, -21); ctx.lineTo(-5, -8);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(7, -14); ctx.lineTo(16, -21); ctx.lineTo(5, -8);
      ctx.closePath();
      ctx.fill();

      // Mắt trợn trừng đỏ rực khi đang bay
      ctx.fillStyle = '#0a0d0b';
      ctx.beginPath();
      ctx.arc(-3.5, -12, 4.2, 0, Math.PI * 2);
      ctx.arc(3.5, -12, 4.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(-3.5, -12, 2.5, 0, Math.PI * 2);
      ctx.arc(3.5, -12, 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Miệng cười điên dại với răng kim
      ctx.fillStyle = '#fffde7';
      ctx.fillRect(-4, -6, 2, 2.5);
      ctx.fillRect(0, -6, 2, 2.5);

      ctx.restore();
    }
  }

  // Vẽ các biểu tượng trạng thái phong cách Horror (Choáng, Chậm, Độc)
  drawZombieStatus(ctx, zombie, walkY, stunY, debuffY) {
    // 1. Choáng (Stun): Vòng xoáy sao phù thủy & hào quang vàng
    if (zombie.stunTimer > 0) {
      ctx.save();
      ctx.fillStyle = '#ffd600';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('💫 CHOÁNG', 0, stunY + walkY);
      ctx.restore();
    }

    // 2. Chậm (Slow): Huy hiệu băng tuyết nổi bật & làm chậm 50%
    if (zombie.slowTimer > 0) {
      ctx.save();
      const badgeY = debuffY + walkY;
      ctx.fillStyle = 'rgba(0, 40, 60, 0.85)';
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.roundRect(-32, badgeY - 10, 64, 13, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#80d8ff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❄️ BĂNG (-50%)', 0, badgeY);
      ctx.restore();
    }

    // 3. Độc Dược Ăn Mòn (Poison): Đầu lâu hóa chất tím & bong bóng độc
    if (zombie.poisonStacks > 0) {
      ctx.save();
      ctx.fillStyle = '#ea80fc';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`☣️ ĐỘC x${zombie.poisonStacks}`, 16, debuffY + walkY);
      ctx.restore();
    }

    // 4. Buff Bình Thuốc Hóa Kỹ
    if (zombie.potionBuffType) {
      ctx.save();
      const label = zombie.potionBuffType === 'speed'
        ? '🧪 ×2 TỐC'
        : (zombie.potionBuffType === 'giant_hp' ? '🧪 +300HP' : '🧪 ×2 ĐÁNH');
      const color = zombie.potionBuffType === 'speed'
        ? '#ea80fc'
        : (zombie.potionBuffType === 'giant_hp' ? '#69f0ae' : '#ff6e6e');
      ctx.fillStyle = color;
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(label, 0, stunY - 11 + walkY);
      ctx.restore();
    }

    // 5. Buff Gió Thuận từ Rồng Gió (x2 tốc chạy 3s)
    if (zombie.windHasteTimer > 0) {
      ctx.save();
      const windY = zombie.potionBuffType ? (stunY - 22 + walkY) : (stunY - 11 + walkY);
      ctx.fillStyle = 'rgba(0, 48, 64, 0.85)';
      ctx.strokeStyle = '#4dd0e1';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.roundRect(-27, windY - 9, 54, 12, 4);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#80deea';
      ctx.font = 'bold 8.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('🌪️ ×2 TỐC', 0, windY);
      ctx.restore();
    }
  }

  drawProjectile(ctx, proj) {
    // 1. Bóng đổ nhẹ gọn dưới mặt đất
    const shadowY = CONFIG.GRID_OFFSET_Y + proj.row * CONFIG.CELL_HEIGHT + 72;
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(proj.x, shadowY, 10, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Viên đạn bay trên không
    ctx.save();
    ctx.translate(proj.x, proj.y);

    if (proj.isRollingPoisonBoulder) {
      // Vệt khí độc phía sau tảng đá lăn
      ctx.fillStyle = 'rgba(170, 0, 255, 0.28)';
      ctx.beginPath();
      ctx.moveTo(-42, 0);
      ctx.lineTo(-4, -18);
      ctx.lineTo(-4, 18);
      ctx.closePath();
      ctx.fill();

      const rollAngle = (proj.x / 18) * Math.PI * 2;
      ctx.rotate(rollAngle);

      const boulderGrad = ctx.createRadialGradient(-6, -6, 4, 0, 0, 22);
      boulderGrad.addColorStop(0, '#f3e5f5');
      boulderGrad.addColorStop(0.32, '#d500f9');
      boulderGrad.addColorStop(0.75, '#4a148c');
      boulderGrad.addColorStop(1, '#1a0033');

      ctx.fillStyle = boulderGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#69f0ae';
      ctx.lineWidth = 2.6;
      ctx.stroke();

      // Bong bóng độc phát sáng xoay tròn theo đá
      ctx.fillStyle = '#76ff03';
      ctx.beginPath();
      ctx.arc(-8, -8, 4, 0, Math.PI * 2);
      ctx.arc(10, -5, 3.5, 0, Math.PI * 2);
      ctx.arc(-5, 11, 4.2, 0, Math.PI * 2);
      ctx.arc(7, 9, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
      return;
    }

    if (proj.type === 'galio_wave' || proj.isEnergyWave) {
      if (proj.isGiant) {
        ctx.scale(1.4, 1.4);
      }
      // Sóng năng lượng trăng khuyết vàng-lục bảo của Galio
      ctx.fillStyle = 'rgba(0, 229, 255, 0.32)';
      ctx.beginPath();
      ctx.arc(-4, 0, 26, -Math.PI * 0.44, Math.PI * 0.44);
      ctx.quadraticCurveTo(4, 0, -4, -26 * Math.sin(Math.PI * 0.44));
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(4, -22);
      ctx.quadraticCurveTo(22, 0, 4, 22);
      ctx.quadraticCurveTo(10, 0, 4, -22);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#fff59d';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(6, -18);
      ctx.quadraticCurveTo(20, 0, 6, 18);
      ctx.stroke();

      ctx.restore();
      return;
    }

    if (proj.isGiant) {
      ctx.scale(2.2, 2.2);
    }

    if (proj.type === 'goo_pea') {
      // Vệt đuôi độc tố sắc nét
      ctx.fillStyle = 'rgba(224, 64, 251, 0.42)';
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-2, -6);
      ctx.lineTo(-2, 6);
      ctx.closePath();
      ctx.fill();

      const gooGrad = ctx.createRadialGradient(-2, -2, 1.5, 0, 0, 9.2);
      gooGrad.addColorStop(0, '#ffffff');
      gooGrad.addColorStop(0.3, '#ea80fc');
      gooGrad.addColorStop(0.7, '#aa00ff');
      gooGrad.addColorStop(1, '#38006b');
      ctx.fillStyle = gooGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 9.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#69f0ae';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2.5, -2.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'ice_pea') {
      // Vệt sương băng thuôn nhọn sắc nét
      ctx.fillStyle = 'rgba(128, 222, 234, 0.48)';
      ctx.beginPath();
      ctx.moveTo(-22, 0);
      ctx.lineTo(-2, -5.5);
      ctx.lineTo(-2, 5.5);
      ctx.closePath();
      ctx.fill();

      const iceGrad = ctx.createRadialGradient(-2, -2, 1.5, 0, 0, 9);
      iceGrad.addColorStop(0, '#ffffff');
      iceGrad.addColorStop(0.42, '#80e5ff');
      iceGrad.addColorStop(0.8, '#00b4d8');
      iceGrad.addColorStop(1, '#0277bd');
      ctx.fillStyle = iceGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 8.8, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#e0f7fa';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Lõi tinh thể băng 4 cạnh sắc nét
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(5, 0);
      ctx.lineTo(0, 5);
      ctx.lineTo(-5, 0);
      ctx.closePath();
      ctx.fill();
    } else if (proj.type === 'cabbage') {
      // Vệt gió nhẹ phía sau đạn bắp cải
      ctx.strokeStyle = 'rgba(165, 214, 167, 0.55)';
      ctx.lineWidth = 2.0;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-16, -2);
      ctx.lineTo(-8, -2);
      ctx.moveTo(-13, 3);
      ctx.lineTo(-7, 3);
      ctx.stroke();

      const cabProjGrad = ctx.createRadialGradient(-2, -2, 1.5, 0, 0, 10);
      cabProjGrad.addColorStop(0, '#e8f5e9');
      cabProjGrad.addColorStop(0.5, '#81c784');
      cabProjGrad.addColorStop(1, '#2e7d32');
      ctx.fillStyle = cabProjGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1b5e20';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Gân lá bắp cải cuộn xoắn
      ctx.strokeStyle = '#c8e6c9';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.arc(-1, -1, 5.5, -0.4, 2.3);
      ctx.moveTo(5, -5); ctx.quadraticCurveTo(0, 0, -6, -3);
      ctx.stroke();
    } else if (proj.type === 'melon') {
      // Vệt không khí tốc độ cao sau quả dưa hấu
      ctx.strokeStyle = 'rgba(129, 199, 132, 0.52)';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-22, -4);
      ctx.lineTo(-11, -4);
      ctx.moveTo(-19, 3);
      ctx.lineTo(-10, 3);
      ctx.stroke();

      const melProjGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 14);
      melProjGrad.addColorStop(0, '#b9f6ca');
      melProjGrad.addColorStop(0.45, '#43a047');
      melProjGrad.addColorStop(1, '#1b5e20');
      ctx.fillStyle = melProjGrad;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13.5, 10.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#a5d6a7';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Kẻ sọc dọc đặc trưng dưa hấu
      ctx.strokeStyle = '#0d3b12';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(-11, -4); ctx.quadraticCurveTo(0, -7, 11, -4);
      ctx.moveTo(-12, 0); ctx.quadraticCurveTo(0, 1, 12, 0);
      ctx.moveTo(-11, 4); ctx.quadraticCurveTo(0, 7, 11, 4);
      ctx.stroke();
    } else if (proj.type === 'jhin_bullet' || proj.isJhinBullet) {
      if (proj.isFourthShot) {
        // Viên thứ 4: Đạn nghệ thuật tử thần đỏ-vàng sắc lẹm + tia sao 4 cánh
        ctx.fillStyle = 'rgba(255, 23, 68, 0.42)';
        ctx.beginPath();
        ctx.moveTo(-34, 0);
        ctx.lineTo(-3, -6);
        ctx.lineTo(-3, 6);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#e040fb';
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-8, -7.5);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-8, 7.5);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.moveTo(13, 0);
        ctx.lineTo(-5, -4.5);
        ctx.lineTo(-5, 4.5);
        ctx.closePath();
        ctx.fill();

        // Tia sao nghệ thuật vàng sáng
        ctx.fillStyle = '#fff59d';
        ctx.beginPath();
        ctx.moveTo(2, -8); ctx.lineTo(4, -2); ctx.lineTo(10, 0); ctx.lineTo(4, 2);
        ctx.lineTo(2, 8); ctx.lineTo(0, 2); ctx.lineTo(-6, 0); ctx.lineTo(0, -2);
        ctx.closePath();
        ctx.fill();
      } else {
        // Viên 1-3: Đạn xuyên tím-đỏ sắc bén
        ctx.fillStyle = 'rgba(224, 64, 251, 0.44)';
        ctx.beginPath();
        ctx.moveTo(-22, 0);
        ctx.lineTo(-4, -3.2);
        ctx.lineTo(-4, 3.2);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#7b1fa2';
        ctx.strokeStyle = '#ff5252';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(11, 0);
        ctx.lineTo(-6, -4);
        ctx.lineTo(-3, 0);
        ctx.lineTo(-6, 4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(5, 0, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (proj.type === 'syndra_empowered_orb' || proj.isSyndraEmpoweredOrb) {
      // Cầu cường hóa 600 DMG hắc ám của Syndra
      const pulse = 1.0 + Math.sin(Date.now() * 0.025) * 0.12;
      ctx.scale(pulse, pulse);

      ctx.fillStyle = 'rgba(170, 0, 255, 0.34)';
      ctx.beginPath();
      ctx.arc(-4, 0, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(224, 64, 251, 0.5)';
      ctx.beginPath();
      ctx.ellipse(-12, 0, 14, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      const orbGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 15);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.28, '#f50057');
      orbGrad.addColorStop(0.65, '#7b1fa2');
      orbGrad.addColorStop(1, '#120024');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ea80fc';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 7.5, 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 7.5, -0.5, 0, Math.PI * 2);
      ctx.stroke();
    } else if (proj.type === 'syndra_orb' || proj.isSyndraOrb) {
      // Quả cầu bóng tối 100 DMG của Syndra
      ctx.fillStyle = 'rgba(142, 36, 170, 0.38)';
      ctx.beginPath();
      ctx.ellipse(-8, 0, 11, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();

      const orbGrad = ctx.createRadialGradient(-2, -2, 1.5, 0, 0, 11.5);
      orbGrad.addColorStop(0, '#f3e5f5');
      orbGrad.addColorStop(0.35, '#d500f9');
      orbGrad.addColorStop(0.75, '#4a148c');
      orbGrad.addColorStop(1, '#120024');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ce93d8';
      ctx.lineWidth = 1.6;
      ctx.stroke();
    } else if (proj.type === 'syndra_bolt' || proj.isSyndraBolt) {
      // Tia ma pháp dạ lan hương biến dị (30 DMG / 0.5s)
      ctx.fillStyle = 'rgba(179, 136, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(-7, 0, 8, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4a148c';
      ctx.strokeStyle = '#e040fb';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(9, 0);
      ctx.lineTo(-4, -4.5);
      ctx.lineTo(-1.5, 0);
      ctx.lineTo(-4, 4.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#e1bee7';
      ctx.beginPath();
      ctx.arc(1.5, 0, 2.0, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'kata_dagger' || proj.isKataDagger) {
      // Dao găm hoa hồng xoay tròn sắc bén của Kata
      const spin = (Date.now() * 0.028) % (Math.PI * 2);
      ctx.rotate(spin);

      ctx.fillStyle = 'rgba(255, 23, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#cfd8dc';
      ctx.strokeStyle = '#ff1744';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(1, -3.5);
      ctx.lineTo(-10, 0);
      ctx.lineTo(1, 3.5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#b71c1c';
      ctx.fillRect(-10, -2, 5, 4);
    } else if (proj.type === 'aurora_rabbit' || proj.isAuroraRabbit) {
      // Linh hồn thỏ xanh-hồng phát sáng của Aurora
      ctx.fillStyle = 'rgba(128, 222, 234, 0.36)';
      ctx.beginPath();
      ctx.ellipse(-8, 2, 13, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Đôi tai thỏ linh hồn dài rủ nhẹ
      ctx.fillStyle = '#b2ebf2';
      ctx.strokeStyle = '#f48fb1';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(-3, -9, 3.2, 8.5, -0.35, 0, Math.PI * 2);
      ctx.ellipse(2, -10, 3.2, 8.5, -0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Thân thỏ cầu vồng rực sáng
      const rabbitGrad = ctx.createRadialGradient(2, -1, 1.5, 0, 0, 10);
      rabbitGrad.addColorStop(0, '#ffffff');
      rabbitGrad.addColorStop(0.55, '#80deea');
      rabbitGrad.addColorStop(1, '#f48fb1');
      ctx.fillStyle = rabbitGrad;
      ctx.beginPath();
      ctx.ellipse(0, 1, 9.5, 7.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ff4081';
      ctx.beginPath();
      ctx.arc(4.5, -1, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.type === 'irelia_blade' || proj.isIreliaBlade) {
      // Phi kiếm bay sắc bén của Kiếm Vũ Ire (35 DMG, chuyển ánh vàng khi tích nội tại)
      const isGolden = (proj.ireStacks || 0) >= 2;
      const trail = proj.trail;
      if (Array.isArray(trail) && trail.length >= 2) {
        for (let i = 0; i < trail.length - 1; i++) {
          const p0 = trail[i];
          const p1 = trail[i + 1];
          const ratio = (i + 1) / trail.length;
          ctx.strokeStyle = isGolden
            ? `rgba(255, 213, 79, ${0.55 * ratio})`
            : `rgba(0, 229, 255, ${0.55 * ratio})`;
          ctx.lineWidth = 1.5 + ratio * 3.5;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p0.x - proj.x, p0.y - proj.y);
          ctx.lineTo(p1.x - proj.x, p1.y - proj.y);
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.rotate(proj.flightAngle || 0);

      // Hào quang phi kiếm
      ctx.fillStyle = isGolden ? 'rgba(255, 213, 79, 0.35)' : 'rgba(0, 229, 255, 0.35)';
      ctx.beginPath();
      ctx.ellipse(-2, 0, 18, 6.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Thân phi kiếm Ionia hai lưỡi nhọn
      const bladeGrad = ctx.createLinearGradient(-14, 0, 18, 0);
      if (isGolden) {
        bladeGrad.addColorStop(0, '#ff8f00');
        bladeGrad.addColorStop(0.5, '#ffd54f');
        bladeGrad.addColorStop(1, '#ffffff');
      } else {
        bladeGrad.addColorStop(0, '#0288d1');
        bladeGrad.addColorStop(0.5, '#80d8ff');
        bladeGrad.addColorStop(1, '#ffffff');
      }
      ctx.fillStyle = bladeGrad;
      ctx.strokeStyle = isGolden ? '#ffe082' : '#e0f7fa';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-3, -5.2);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-3, 5.2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Sống kiếm phát sáng
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.lineTo(15, 0);
      ctx.stroke();

      ctx.restore();
    } else if (proj.type === 'ahri_orb' || proj.isAhriOrb) {
      // Quả cầu Boomerang của Ahri: Lượt đi xanh-hồng linh hồn -> Lượt về quả cầu TRẮNG rực sáng (50 Sát Thương Chuẩn)
      const isRet = !!proj.isReturning;
      const spin = proj.spinAngle || (Date.now() * 0.012);

      // Vệt sao chổi theo quỹ đạo bay để nhìn rõ lượt đi & lượt về
      const trail = proj.trail;
      if (Array.isArray(trail) && trail.length >= 2) {
        for (let i = 0; i < trail.length - 1; i++) {
          const p0 = trail[i];
          const p1 = trail[i + 1];
          const ratio = (i + 1) / trail.length;
          ctx.strokeStyle = isRet
            ? `rgba(255, 255, 255, ${0.72 * ratio})`
            : `rgba(77, 208, 225, ${0.58 * ratio})`;
          ctx.lineWidth = (isRet ? 11 : 8) * ratio;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p0.x - proj.x, p0.y - proj.y);
          ctx.lineTo(p1.x - proj.x, p1.y - proj.y);
          ctx.stroke();
        }
      }

      ctx.save();
      ctx.rotate(spin);

      if (isRet) {
        // Vệt hào quang trắng tinh khiết (Sát thương chuẩn xuyên khiên/giáp)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.52)';
        ctx.beginPath();
        ctx.arc(0, 0, 17, 0, Math.PI * 2);
        ctx.fill();

        const whiteGrad = ctx.createRadialGradient(-2, -2, 1.5, 0, 0, 12);
        whiteGrad.addColorStop(0, '#ffffff');
        whiteGrad.addColorStop(0.7, '#ffffff');
        whiteGrad.addColorStop(1, '#e1f5fe');
        ctx.fillStyle = whiteGrad;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, 11.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Ngôi sao 4 cánh ánh sáng trắng rực rỡ bên trong
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-7.5, 0); ctx.lineTo(7.5, 0);
        ctx.moveTo(0, -7.5); ctx.lineTo(0, 7.5);
        ctx.stroke();
      } else {
        // Lượt đi: Quả cầu xanh ngọc-hồng linh hồn
        ctx.fillStyle = 'rgba(128, 222, 234, 0.44)';
        ctx.beginPath();
        ctx.arc(0, 0, 14, 0, Math.PI * 2);
        ctx.fill();

        const orbGrad = ctx.createRadialGradient(-2, -2, 1.5, 0, 0, 10);
        orbGrad.addColorStop(0, '#ffffff');
        orbGrad.addColorStop(0.45, '#4dd0e1');
        orbGrad.addColorStop(1, '#f06292');
        ctx.fillStyle = orbGrad;
        ctx.strokeStyle = '#80deea';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, 9.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    } else {
      // Đạn đậu năng lượng xanh rực sắc nét + vệt đuôi thuôn gọn
      ctx.fillStyle = 'rgba(118, 255, 3, 0.44)';
      ctx.beginPath();
      ctx.moveTo(-20, 0);
      ctx.lineTo(-2, -5.2);
      ctx.lineTo(-2, 5.2);
      ctx.closePath();
      ctx.fill();

      const peaGrad = ctx.createRadialGradient(-2.4, -2.4, 1.2, 0, 0, 8.6);
      peaGrad.addColorStop(0, '#f1f8e9');
      peaGrad.addColorStop(0.35, '#76ff03');
      peaGrad.addColorStop(0.8, '#33691e');
      peaGrad.addColorStop(1, '#1b5e20');
      ctx.fillStyle = peaGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 8.6, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#b9f6ca';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-2.5, -2.5, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Vẽ hàng rào toàn ảnh (Infi-nut Plant Food)
  drawBarriers(ctx, barriers) {
    const t = this.getFrameTimeSec();
    for (const b of barriers) {
      if (!b.alive) continue;
      const topY = CONFIG.GRID_OFFSET_Y;
      const height = CONFIG.ROWS * CONFIG.CELL_HEIGHT;
      const scanY = topY + ((t * 140) % height);

      ctx.save();
      // Luồng năng lượng bảo vệ 5 hàng trong suốt gọn gàng
      ctx.fillStyle = 'rgba(0, 229, 255, 0.16)';
      ctx.fillRect(b.x - 13, topY, 26, height);

      // Viền 2 bên sắc nét
      ctx.strokeStyle = 'rgba(0, 229, 255, 0.55)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(b.x - 13, topY); ctx.lineTo(b.x - 13, topY + height);
      ctx.moveTo(b.x + 13, topY); ctx.lineTo(b.x + 13, topY + height);
      ctx.stroke();

      // Cột laser chính giữa phát sáng rực rỡ
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(b.x, topY);
      ctx.lineTo(b.x, topY + height);
      ctx.stroke();

      // Lõi trắng mảnh giữa cột năng lượng
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      // Sóng quét năng lượng chạy dọc hàng rào
      ctx.strokeStyle = 'rgba(224, 247, 250, 0.9)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(b.x - 12, scanY);
      ctx.lineTo(b.x + 12, scanY);
      ctx.stroke();

      // Lưới ngang định vị
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      for (let y = topY + 24; y < topY + height; y += 28) {
        ctx.beginPath();
        ctx.moveTo(b.x - 11, y);
        ctx.lineTo(b.x + 11, y);
        ctx.stroke();
      }

      // Thanh máu của hàng rào 10.000 HP
      if (b.hp < b.maxHp) {
        this.drawHealthBar(ctx, b.x - 25, topY - 14, 50, 6, b.hp / b.maxHp, '#00e5ff');
      }

      ctx.restore();
    }
  }

  // Vẽ các tia sét zig-zag ổn định, sắc nét của Sậy Sét Hư Không (không random mỗi frame)
  drawLightningArcs(ctx, arcs) {
    for (const arc of arcs) {
      if (arc.timer <= 0) continue;
      const maxT = arc.maxTimer || 0.18;
      const alpha = Math.max(0.15, Math.min(1, arc.timer / maxT));
      const offsets = arc.offsets && arc.offsets.length === 3 ? arc.offsets : [-9, 10, -7];
      const segments = 4;
      const dx = (arc.toX - arc.fromX) / segments;
      const dy = (arc.toY - arc.fromY) / segments;

      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(arc.fromX, arc.fromY);
      for (let i = 1; i < segments; i++) {
        const off = offsets[i - 1];
        ctx.lineTo(arc.fromX + dx * i + off * 0.45, arc.fromY + dy * i + off);
      }
      ctx.lineTo(arc.toX, arc.toY);

      // 1. Quầng sáng ngoài
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.34 * alpha})`;
      ctx.lineWidth = 7.5;
      ctx.stroke();

      // 2. Thân sét ngọc lam
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.95 * alpha})`;
      ctx.lineWidth = 3.0;
      ctx.stroke();

      // 3. Lõi sét trắng sắc nét
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1.3;
      ctx.stroke();

      // Vòng nổ tĩnh điện tại điểm giật
      ctx.strokeStyle = `rgba(128, 222, 234, ${0.85 * alpha})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(arc.toX, arc.toY, 8 + (1 - alpha) * 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // Vẽ đám mây tử khí trong suốt sắc nét của Stunion
  drawGasClouds(ctx, clouds) {
    for (const cloud of clouds) {
      const progress = cloud.timer / cloud.maxDuration;
      const alpha = Math.max(0, 1 - progress);
      const radius = 24 + progress * 36;

      ctx.save();
      ctx.globalAlpha = alpha * 0.8;

      const gasGrad = ctx.createRadialGradient(cloud.x, cloud.y, 4, cloud.x, cloud.y, radius);
      gasGrad.addColorStop(0, 'rgba(185, 246, 202, 0.42)');
      gasGrad.addColorStop(0.55, 'rgba(0, 230, 118, 0.28)');
      gasGrad.addColorStop(1, 'rgba(0, 230, 118, 0)');
      ctx.fillStyle = gasGrad;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Vòng sóng gây choáng sắc nét
      ctx.strokeStyle = 'rgba(105, 240, 174, 0.85)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, radius * 0.88, 0, Math.PI * 2);
      ctx.stroke();

      // Các đốm bào tử phát sáng xoay vòng
      ctx.fillStyle = '#e0f2f1';
      for (let i = 0; i < 6; i++) {
        const angle = i * (Math.PI * 2 / 6) + cloud.timer * 3.5;
        const ox = Math.cos(angle) * (radius * 0.72);
        const oy = Math.sin(angle) * (radius * 0.72);
        ctx.beginPath();
        ctx.arc(cloud.x + ox, cloud.y + oy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  // Vẽ vùng đánh dấu phạm vi tấn công gọn, sắc nét trên mặt cỏ (không che khuất cây/zombie)
  drawAttackRangeZones(ctx, effects) {
    for (const eff of effects) {
      const rawTimer = eff.timer || 0;
      const duration = Math.max(0.05, eff.duration || 0.35);

      // Trong lúc Sett đang bay kỹ năng R (timer < 0), vẽ vòng ngắm cảnh báo ô đích 3×3 trước khi giáng đất
      if (rawTimer < 0) {
        if (eff.kind === 'sett_r_slam') {
          const minRow = Math.max(0, eff.minRow !== undefined ? eff.minRow : eff.row);
          const maxRow = Math.min(CONFIG.ROWS - 1, eff.maxRow !== undefined ? eff.maxRow : eff.row);
          const topY = CONFIG.GRID_OFFSET_Y + minRow * CONFIG.CELL_HEIGHT + 4;
          const bottomY = CONFIG.GRID_OFFSET_Y + (maxRow + 1) * CONFIG.CELL_HEIGHT - 4;
          const zoneX = eff.startX;
          const zoneW = Math.max(12, eff.endX - eff.startX);
          const zoneH = Math.max(12, bottomY - topY);
          const prep = Math.max(0, Math.min(1, 1 + rawTimer / 0.36));

          ctx.save();
          ctx.fillStyle = `rgba(255, 111, 0, ${0.12 + 0.16 * prep})`;
          ctx.strokeStyle = `rgba(255, 213, 79, ${0.55 + 0.4 * prep})`;
          ctx.lineWidth = 2.0;
          ctx.setLineDash([8, 5]);
          ctx.beginPath();
          ctx.roundRect(zoneX, topY, zoneW, zoneH, 6);
          ctx.fill();
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.beginPath();
          ctx.ellipse(eff.x, eff.y + 8, 36 * (1 - 0.35 * prep), 16 * (1 - 0.35 * prep), 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
        continue;
      }

      const progress = Math.min(1, Math.max(0, rawTimer / duration));
      const alpha = Math.pow(1 - progress, 0.85);
      if (alpha <= 0.02) continue;
      if (eff.startX === undefined || eff.endX === undefined) continue;
      if (eff.kind === 'pyke_q_hook' || eff.kind === 'anchor_slam') continue;

      const minRow = Math.max(0, eff.minRow !== undefined ? eff.minRow : eff.row);
      const maxRow = Math.min(CONFIG.ROWS - 1, eff.maxRow !== undefined ? eff.maxRow : eff.row);
      const topY = CONFIG.GRID_OFFSET_Y + minRow * CONFIG.CELL_HEIGHT + 4;
      const bottomY = CONFIG.GRID_OFFSET_Y + (maxRow + 1) * CONFIG.CELL_HEIGHT - 4;
      const zoneX = eff.startX;
      const zoneW = Math.max(12, eff.endX - eff.startX);
      const zoneH = Math.max(12, bottomY - topY);

      let fillCol = 'rgba(255, 193, 7, 0.16)';
      let borderCol = 'rgba(255, 171, 64, 0.72)';

      if (eff.kind === 'snapdragon_flame') {
        fillCol = 'rgba(255, 87, 34, 0.18)';
        borderCol = 'rgba(255, 152, 0, 0.78)';
      } else if (eff.kind === 'bonk_choy_punch' || eff.kind === 'bonk_choy_flurry') {
        fillCol = 'rgba(118, 255, 3, 0.14)';
        borderCol = 'rgba(178, 255, 89, 0.72)';
      } else if (eff.kind === 'chomper_bite' || eff.kind === 'chomper_burp') {
        fillCol = 'rgba(213, 0, 249, 0.15)';
        borderCol = 'rgba(234, 128, 252, 0.75)';
      } else if (eff.kind === 'stunion_gas') {
        fillCol = 'rgba(0, 230, 118, 0.16)';
        borderCol = 'rgba(105, 240, 174, 0.75)';
      } else if (eff.kind === 'galio_strike' || eff.kind === 'galio_vortex') {
        fillCol = 'rgba(0, 229, 255, 0.14)';
        borderCol = 'rgba(255, 215, 64, 0.78)';
      } else if (eff.kind === 'lang_khach_dash' || eff.kind === 'lang_khach_tornado') {
        fillCol = 'rgba(128, 222, 234, 0.16)';
        borderCol = 'rgba(229, 57, 53, 0.75)';
      } else if (eff.kind === 'shen_spirit_ult') {
        fillCol = 'rgba(156, 39, 176, 0.18)';
        borderCol = 'rgba(128, 222, 234, 0.85)';
      } else if (eff.kind === 'sett_r_slam') {
        fillCol = 'rgba(255, 109, 0, 0.22)';
        borderCol = 'rgba(255, 213, 79, 0.9)';
      } else if (eff.kind === 'pyke_e_surge') {
        fillCol = 'rgba(0, 229, 255, 0.22)';
        borderCol = 'rgba(38, 198, 218, 0.9)';
      } else if (eff.kind === 'blast_3x3') {
        fillCol = 'rgba(255, 23, 68, 0.20)';
        borderCol = eff.color || 'rgba(255, 82, 82, 0.8)';
      } else if (eff.kind === 'lotus_2x2') {
        fillCol = 'rgba(224, 64, 251, 0.22)';
        borderCol = 'rgba(255, 23, 68, 0.88)';
      } else if (eff.kind === 'blover_wind') {
        fillCol = 'rgba(105, 240, 174, 0.12)';
        borderCol = 'rgba(178, 255, 89, 0.65)';
      }

      ctx.save();
      ctx.globalAlpha = alpha;

      // Một lớp phủ nhẹ và một viền liền mảnh duy nhất để nhìn rõ đúng ô phạm vi
      ctx.fillStyle = fillCol;
      ctx.beginPath();
      ctx.roundRect(zoneX, topY, zoneW, zoneH, 6);
      ctx.fill();

      ctx.strokeStyle = borderCol;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      ctx.restore();
    }
  }

  // Vẽ hiệu ứng đòn đánh gọn gàng, rõ hướng và đúng ranh giới tầm đánh
  drawAttackEffectVfx(ctx, effects) {
    for (const eff of effects) {
      if ((eff.timer || 0) < 0) continue;
      const duration = Math.max(0.05, eff.duration || 0.35);
      const p = Math.min(1, Math.max(0, (eff.timer || 0) / duration));
      const fade = Math.pow(1 - p, 0.85);
      if (fade <= 0.02) continue;

      const minRow = Math.max(0, eff.minRow !== undefined ? eff.minRow : eff.row);
      const maxRow = Math.min(CONFIG.ROWS - 1, eff.maxRow !== undefined ? eff.maxRow : eff.row);
      const topY = CONFIG.GRID_OFFSET_Y + minRow * CONFIG.CELL_HEIGHT + 4;
      const bottomY = CONFIG.GRID_OFFSET_Y + (maxRow + 1) * CONFIG.CELL_HEIGHT - 4;
      const zoneW = Math.max(12, eff.endX - eff.startX);

      ctx.save();
      ctx.globalAlpha = fade;

      if (eff.kind === 'snapdragon_flame') {
        const originX = eff.x + 14;
        const originY = eff.y - 6;
        const reachRatio = Math.min(1, p * 2.8);
        const curEndX = eff.x + (eff.endX - eff.x) * reachRatio;

        for (let r = minRow; r <= maxRow; r++) {
          const rowCenterY = CONFIG.GRID_OFFSET_Y + (r + 0.5) * CONFIG.CELL_HEIGHT;
          const midX = originX + (curEndX - originX) * 0.5;
          const midY = originY + (rowCenterY - originY) * 0.65;
          const halfThick = eff.isPlantFood ? 14 : 10;

          // Luồng lửa thon gọn trong suốt vừa đủ thấy 3 hàng mà không che zombie
          const flameGrad = ctx.createLinearGradient(originX, originY, curEndX, rowCenterY);
          flameGrad.addColorStop(0, 'rgba(255, 238, 88, 0.82)');
          flameGrad.addColorStop(0.45, 'rgba(255, 111, 0, 0.62)');
          flameGrad.addColorStop(1, 'rgba(229, 57, 53, 0.08)');

          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.moveTo(originX, originY - 2.5);
          ctx.quadraticCurveTo(midX, midY - halfThick, curEndX, rowCenterY - halfThick * 0.35);
          ctx.quadraticCurveTo(curEndX + 8, rowCenterY, curEndX, rowCenterY + halfThick * 0.35);
          ctx.quadraticCurveTo(midX, midY + halfThick, originX, originY + 2.5);
          ctx.closePath();
          ctx.fill();

          // Tia lửa mảnh ở tâm hàng
          ctx.strokeStyle = 'rgba(255, 253, 231, 0.65)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(originX + 4, originY);
          ctx.quadraticCurveTo(midX, midY, curEndX - 6, rowCenterY);
          ctx.stroke();
        }
      } else if (eff.kind === 'bonk_choy_punch') {
        const reach = Math.min(1, p * 3.4);
        const dir = eff.punchDir === -1 ? -1 : 1;
        const leftReachX = eff.x - (eff.x - eff.startX) * reach;
        const rightReachX = eff.x + (eff.endX - eff.x) * reach;

        for (const targetEdgeX of [leftReachX, rightReachX]) {
          const isLeft = targetEdgeX < eff.x;
          const isPrimary = (dir === -1 && isLeft) || (dir === 1 && !isLeft) || eff.punchDir === 0;

          ctx.strokeStyle = isPrimary ? 'rgba(178, 255, 89, 0.96)' : 'rgba(178, 255, 89, 0.45)';
          ctx.lineWidth = isPrimary ? 3.2 : 1.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          if (isLeft) {
            ctx.arc(targetEdgeX + 8, eff.y, 17, Math.PI * 0.65, Math.PI * 1.35);
          } else {
            ctx.arc(targetEdgeX - 8, eff.y, 17, -Math.PI * 0.35, Math.PI * 0.35);
          }
          ctx.stroke();

          if (isPrimary) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.moveTo(eff.x + (isLeft ? -14 : 14), eff.y);
            ctx.lineTo(targetEdgeX + (isLeft ? 8 : -8), eff.y);
            ctx.stroke();
          }
        }
      } else if (eff.kind === 'bonk_choy_flurry') {
        const cx = (eff.startX + eff.endX) / 2;
        const cy = (topY + bottomY) / 2;
        const halfW = zoneW / 2;
        const halfH = (bottomY - topY) / 2;
        const rp = Math.min(1, p * 1.8);

        ctx.strokeStyle = 'rgba(178, 255, 89, 0.9)';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(12, halfW * rp), Math.max(12, halfH * rp), 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 141, 0.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(8, halfW * rp * 0.72), Math.max(8, halfH * rp * 0.72), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'chomper_bite') {
        const biteX = eff.targetX || (eff.startX + zoneW * 0.65);
        const snap = Math.sin(Math.min(1, p * 2.2) * Math.PI);
        const jawGap = 18 * (1 - snap * 0.85);

        ctx.strokeStyle = 'rgba(234, 128, 252, 0.95)';
        ctx.lineWidth = 3.0;
        ctx.beginPath();
        ctx.arc(biteX, eff.y - jawGap, 20, 0.15 * Math.PI, 0.85 * Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(biteX, eff.y + jawGap, 20, 1.15 * Math.PI, 1.85 * Math.PI);
        ctx.stroke();

        if (snap > 0.55) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(biteX - 14, eff.y);
          ctx.lineTo(biteX + 14, eff.y);
          ctx.stroke();
        }
      } else if (eff.kind === 'chomper_burp') {
        for (let w = 0; w < 2; w++) {
          const wp = Math.min(1, Math.max(0, p * 1.4 - w * 0.2));
          if (wp <= 0) continue;
          const wx = eff.x + (eff.endX - eff.x) * wp;
          ctx.strokeStyle = w === 0 ? 'rgba(255, 255, 255, 0.88)' : 'rgba(234, 128, 252, 0.82)';
          ctx.lineWidth = 3.2 - w;
          ctx.beginPath();
          ctx.arc(wx - 12, eff.y, 21, -Math.PI * 0.38, Math.PI * 0.38);
          ctx.stroke();
        }
      } else if (eff.kind === 'stunion_gas') {
        const cx = (eff.startX + eff.endX) / 2;
        const cy = (topY + bottomY) / 2;
        const rx = (zoneW / 2) * Math.min(1, p * 2.4);
        const ry = ((bottomY - topY) / 2) * Math.min(1, p * 2.4);

        ctx.strokeStyle = 'rgba(105, 240, 174, 0.9)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(10, rx), Math.max(10, ry), 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(224, 242, 241, 0.6)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(6, rx * 0.65), Math.max(6, ry * 0.65), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'galio_strike') {
        const reach = Math.min(1, p * 3.4);
        const dir = eff.punchDir === -1 ? -1 : 1;
        const leftReachX = eff.x - (eff.x - eff.startX) * reach;
        const rightReachX = eff.x + (eff.endX - eff.x) * reach;

        for (const targetEdgeX of [leftReachX, rightReachX]) {
          const isLeft = targetEdgeX < eff.x;
          const isPrimary = (dir === -1 && isLeft) || (dir === 1 && !isLeft) || eff.punchDir === 0;
          ctx.strokeStyle = isPrimary ? 'rgba(0, 229, 255, 0.92)' : 'rgba(0, 229, 255, 0.42)';
          ctx.lineWidth = isPrimary ? 2.8 : 1.8;
          ctx.lineCap = 'round';
          ctx.beginPath();
          if (isLeft) {
            ctx.arc(targetEdgeX + 8, eff.y, 17, Math.PI * 0.68, Math.PI * 1.32);
          } else {
            ctx.arc(targetEdgeX - 8, eff.y, 17, -Math.PI * 0.32, Math.PI * 0.32);
          }
          ctx.stroke();

          if (isPrimary) {
            ctx.strokeStyle = 'rgba(255, 215, 64, 0.78)';
            ctx.lineWidth = 2.2;
            ctx.beginPath();
            ctx.moveTo(eff.x + (isLeft ? -14 : 14), eff.y);
            ctx.lineTo(targetEdgeX + (isLeft ? 8 : -8), eff.y);
            ctx.stroke();
          }
        }
      } else if (eff.kind === 'galio_vortex') {
        // Vòng xoáy hút trọng lực & tia kéo 5 zombie về ô Galio
        const ringR = 16 + Math.sin(p * Math.PI) * 26;
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y, ringR, ringR * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y, ringR * 0.58, ringR * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();

        if (Array.isArray(eff.pulledPaths)) {
          ctx.strokeStyle = 'rgba(0, 229, 255, 0.85)';
          ctx.lineWidth = 2.2;
          for (const path of eff.pulledPaths) {
            ctx.beginPath();
            ctx.moveTo(path.fromX, path.fromY);
            ctx.lineTo(path.toX, path.toY);
            ctx.stroke();
          }
        }
      } else if (eff.kind === 'lang_khach_dash') {
        const dashX = eff.endX - (eff.endX - eff.startX) * Math.min(1, p * 1.6);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(128, 222, 234, 0.92)';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(eff.endX, eff.y);
        ctx.lineTo(dashX, eff.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(eff.endX, eff.y - 7);
        ctx.lineTo(dashX, eff.y - 7);
        ctx.moveTo(eff.endX, eff.y + 7);
        ctx.lineTo(dashX + 10, eff.y + 7);
        ctx.stroke();
      } else if (eff.kind === 'lang_khach_tornado') {
        const cx = eff.endX - (eff.endX - eff.startX) * Math.min(1, p * 1.15);
        for (let ring = 0; ring < 5; ring++) {
          const ry = eff.y + 22 - ring * 11;
          const rx = 10 + ring * 5;
          const spin = p * 18 + ring;
          ctx.strokeStyle = ring % 2 === 0 ? 'rgba(178, 235, 242, 0.92)' : 'rgba(255, 255, 255, 0.88)';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.ellipse(cx + Math.sin(spin) * 3.5, ry, rx, 6, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
        // Mảnh gió sắc cạnh thay vì chấm tròn
        for (let l = 0; l < 6; l++) {
          const la = p * 16 + l * 1.05;
          const lx = cx + Math.cos(la) * (14 + (l % 3) * 6);
          const ly = eff.y + 18 - ((l * 9 + p * 30) % 44);
          ctx.strokeStyle = l % 2 === 0 ? '#ff5252' : '#ffab40';
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(lx - 4, ly + 1);
          ctx.lineTo(lx + 4, ly - 2);
          ctx.stroke();
        }
      } else if (eff.kind === 'shen_spirit_ult') {
        const tx = eff.targetX !== undefined ? eff.targetX : eff.x;
        const ty = eff.targetY !== undefined ? eff.targetY : eff.y;
        const beamP = Math.min(1, p * 1.8);
        const curX = eff.x + (tx - eff.x) * beamP;
        const curY = eff.y + (ty - eff.y) * beamP;

        // Tia kết nối Kiếm Linh Hồn sắc nét từ Shen đến đồng minh
        ctx.strokeStyle = 'rgba(224, 64, 251, 0.92)';
        ctx.lineWidth = 3.4;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eff.x, eff.y - 8);
        ctx.quadraticCurveTo((eff.x + tx) * 0.5, Math.min(eff.y, ty) - 36, curX, curY - 8);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(128, 222, 234, 0.95)';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(eff.x, eff.y - 8);
        ctx.quadraticCurveTo((eff.x + tx) * 0.5, Math.min(eff.y, ty) - 36, curX, curY - 8);
        ctx.stroke();

        // Kiếm Linh Hồn đáp xuống & vòng giáp đôi
        const ringR = 14 + p * 22;
        ctx.strokeStyle = '#e040fb';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(tx, ty, ringR, ringR * 0.55, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#80deea';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.ellipse(tx, ty, ringR * 0.65, ringR * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'blast_3x3') {
        const cx = (eff.startX + eff.endX) / 2;
        const cy = (topY + bottomY) / 2;
        const expRatio = Math.min(1, p * 2.4);
        const rx = (zoneW / 2) * expRatio;
        const ry = ((bottomY - topY) / 2) * expRatio;

        ctx.strokeStyle = eff.color || 'rgba(255, 82, 82, 0.9)';
        ctx.lineWidth = 3.4 * (1 - p * 0.5);
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(12, rx), Math.max(12, ry), 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 245, 157, 0.8)';
        ctx.lineWidth = 1.8 * (1 - p * 0.5);
        ctx.beginPath();
        ctx.ellipse(cx, cy, Math.max(8, rx * 0.65), Math.max(8, ry * 0.65), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'lotus_2x2') {
        const cx = (eff.startX + eff.endX) / 2;
        const cy = (topY + bottomY) / 2;
        const expRatio = Math.min(1, p * 1.9);
        const maxR = Math.min(zoneW, bottomY - topY) * 0.52 * expRatio;

        for (let i = 0; i < 8; i++) {
          const ang = (i * Math.PI) / 4 + p * 0.9;
          const px = cx + Math.cos(ang) * maxR * 0.65;
          const py = cy + Math.sin(ang) * maxR * 0.65;
          ctx.fillStyle = i % 2 === 0 ? 'rgba(224, 64, 251, 0.78)' : 'rgba(255, 23, 68, 0.8)';
          ctx.strokeStyle = 'rgba(255, 215, 64, 0.65)';
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.ellipse(px, py, Math.max(6, maxR * 0.35), Math.max(4, maxR * 0.16), ang, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(255, 215, 64, 0.92)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(8, maxR * 0.42), 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'blover_wind') {
        // Cánh quạt Cỏ Ba Lá quay tốc độ cao tại vị trí trồng + luồng gió thổi xuyên 5 hàng
        ctx.save();
        ctx.translate(eff.x, eff.y - 6);
        ctx.rotate(p * Math.PI * 10);
        for (let i = 0; i < 3; i++) {
          ctx.save();
          ctx.rotate((i * Math.PI * 2) / 3);
          ctx.fillStyle = '#69f0ae';
          ctx.strokeStyle = '#1b5e20';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.ellipse(0, -13, 8, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
        ctx.restore();

        // Luồng gió xanh lướt nhanh từ trái sang phải khắp toàn sân
        for (let r = 0; r < CONFIG.ROWS; r++) {
          const ry = CONFIG.GRID_OFFSET_Y + (r + 0.5) * CONFIG.CELL_HEIGHT;
          const offset = (r % 2) * 45;
          const gustX = eff.startX + (eff.endX - eff.startX) * Math.min(1, p * 1.45) - offset;
          ctx.strokeStyle = r % 2 === 0 ? 'rgba(185, 246, 202, 0.88)' : 'rgba(128, 222, 234, 0.82)';
          ctx.lineWidth = 2.6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(Math.max(eff.startX, gustX - 110), ry - 8);
          ctx.quadraticCurveTo(Math.max(eff.startX, gustX - 45), ry - 16, gustX, ry - 6);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(Math.max(eff.startX, gustX - 85), ry + 9);
          ctx.quadraticCurveTo(Math.max(eff.startX, gustX - 30), ry + 16, gustX + 20, ry + 7);
          ctx.stroke();
        }
      } else if (eff.kind === 'lux_beam') {
        const beamY = eff.y - 10;
        const beamGrad = ctx.createLinearGradient(eff.startX, beamY - 8, eff.startX, beamY + 8);
        beamGrad.addColorStop(0, 'rgba(255, 213, 79, 0)');
        beamGrad.addColorStop(0.35, 'rgba(255, 241, 118, 0.72)');
        beamGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.96)');
        beamGrad.addColorStop(0.65, 'rgba(255, 241, 118, 0.72)');
        beamGrad.addColorStop(1, 'rgba(255, 213, 79, 0)');
        ctx.fillStyle = beamGrad;
        ctx.fillRect(eff.startX, beamY - 9, eff.endX - eff.startX, 18);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.98)';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(eff.startX, beamY);
        ctx.lineTo(eff.endX, beamY);
        ctx.stroke();
      } else if (eff.kind === 'lux_ult_beam') {
        const beamY = eff.y - 10;
        const thickness = 28 * (0.65 + 0.35 * (1 - p));
        const ultGrad = ctx.createLinearGradient(eff.startX, beamY - thickness, eff.startX, beamY + thickness);
        ultGrad.addColorStop(0, 'rgba(255, 179, 0, 0)');
        ultGrad.addColorStop(0.22, 'rgba(255, 213, 79, 0.75)');
        ultGrad.addColorStop(0.38, 'rgba(178, 255, 255, 0.85)');
        ultGrad.addColorStop(0.5, 'rgba(255, 255, 255, 1)');
        ultGrad.addColorStop(0.62, 'rgba(178, 255, 255, 0.85)');
        ultGrad.addColorStop(0.78, 'rgba(255, 213, 79, 0.75)');
        ultGrad.addColorStop(1, 'rgba(255, 179, 0, 0)');
        ctx.fillStyle = ultGrad;
        ctx.fillRect(eff.startX, beamY - thickness, eff.endX - eff.startX, thickness * 2);

        // Chớp lăng kính ở điểm phát sáng
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.beginPath();
        ctx.arc(eff.startX + 4, beamY, 16 * (1 - p * 0.4), 0, Math.PI * 2);
        ctx.fill();
      } else if (eff.kind === 'kata_blade_storm') {
        // Vòng xoáy bão dao 3x3 của Kata
        const radius = CONFIG.CELL_WIDTH * 1.35;
        const rot = (Date.now() * 0.02) % (Math.PI * 2);
        const alpha = Math.max(0, 1 - p * 0.65);

        ctx.strokeStyle = `rgba(255, 23, 68, ${0.72 * alpha})`;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y, radius, radius * 0.72, 0, 0, Math.PI * 2);
        ctx.stroke();

        for (let i = 0; i < 6; i++) {
          const ang = rot + (i * Math.PI) / 3;
          const bx = eff.x + Math.cos(ang) * radius * 0.88;
          const by = eff.y + Math.sin(ang) * radius * 0.62;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(ang + Math.PI / 2);
          ctx.fillStyle = `rgba(236, 239, 241, ${0.95 * alpha})`;
          ctx.strokeStyle = `rgba(255, 23, 68, ${alpha})`;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(10, 0);
          ctx.lineTo(-5, -3);
          ctx.lineTo(-5, 3);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }
      } else if (eff.kind === 'aurora_realm') {
        // Pháp trận Linh Giới phạm vi 2 ô của Aurora
        const alpha = p < 0.2 ? p * 5 : Math.max(0, 1 - (p - 0.2) / 0.8);
        const spanW = (eff.endX - eff.startX) * 0.5 || CONFIG.CELL_WIDTH * 1.1;
        const realmGrad = ctx.createRadialGradient(eff.x, eff.y, 10, eff.x, eff.y, spanW);
        realmGrad.addColorStop(0, `rgba(244, 143, 177, ${0.42 * alpha})`);
        realmGrad.addColorStop(0.6, `rgba(128, 222, 234, ${0.35 * alpha})`);
        realmGrad.addColorStop(1, 'rgba(128, 222, 234, 0)');
        ctx.fillStyle = realmGrad;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y + 8, spanW, 38, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(128, 222, 234, ${0.9 * alpha})`;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y + 8, spanW * 0.94, 34, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(244, 143, 177, ${0.85 * alpha})`;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y + 8, spanW * 0.68, 24, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'ahri_charm') {
        // Tia Hôn Gió trái tim hồng từ Ahri tới zombie
        const sx = eff.startX ?? eff.x;
        const sy = eff.startY ?? eff.y;
        const ex = eff.endX ?? (sx + 80);
        const ey = eff.endY ?? sy;
        const alpha = Math.max(0, 1 - p);

        ctx.strokeStyle = `rgba(244, 143, 177, ${0.88 * alpha})`;
        ctx.lineWidth = 3.2;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + ex) * 0.5, Math.min(sy, ey) - 18, ex, ey);
        ctx.stroke();

        const hx = sx + (ex - sx) * Math.min(1, p * 1.4);
        const hy = sy + (ey - sy) * Math.min(1, p * 1.4) - Math.sin(Math.min(1, p * 1.4) * Math.PI) * 18;
        ctx.fillStyle = `rgba(255, 64, 129, ${alpha})`;
        ctx.beginPath();
        ctx.arc(hx - 3, hy - 2, 4, 0, Math.PI * 2);
        ctx.arc(hx + 3, hy - 2, 4, 0, Math.PI * 2);
        ctx.moveTo(hx - 6.5, hy);
        ctx.lineTo(hx, hy + 7);
        ctx.lineTo(hx + 6.5, hy);
        ctx.closePath();
        ctx.fill();
      } else if (eff.kind === 'irelia_dash') {
        // Vệt lướt kiếm xanh ngọc-vàng khi Kiếm Vũ Ire kết liễu & dịch chuyển (hoặc lướt trở về vị trí cũ)
        const sx = eff.startX ?? eff.x;
        const sy = eff.startY ?? eff.y;
        const ex = eff.endX ?? eff.x;
        const ey = eff.endY ?? eff.y;
        const alpha = Math.max(0, 1 - p);
        const isRet = !!eff.isReturn;

        ctx.strokeStyle = isRet
          ? `rgba(255, 213, 79, ${0.88 * alpha})`
          : `rgba(0, 229, 255, ${0.92 * alpha})`;
        ctx.lineWidth = (isRet ? 4.5 : 5.5) * (1 - p * 0.45);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        // Tia sáng chạy dọc quỹ đạo lướt
        const prog = Math.min(1, p * 1.6);
        const curX = sx + (ex - sx) * prog;
        const curY = sy + (ey - sy) * prog;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
        ctx.beginPath();
        ctx.arc(curX, curY, 5.5 * (1 - p * 0.4), 0, Math.PI * 2);
        ctx.fill();

        if (isRet) {
          ctx.strokeStyle = `rgba(128, 216, 255, ${0.9 * alpha})`;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(ex, ey, 10 + p * 16, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeStyle = `rgba(255, 213, 79, ${0.95 * alpha})`;
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          ctx.moveTo(ex - 20, ey - 16); ctx.lineTo(ex + 20, ey + 16);
          ctx.moveTo(ex + 20, ey - 16); ctx.lineTo(ex - 20, ey + 16);
          ctx.stroke();
        }
      } else if (eff.kind === 'irelia_home_marker') {
        // Ấn ký vị trí gốc đếm ngược 1.5s trước khi Kiếm Vũ Ire lướt quay về
        const hx = eff.x;
        const hy = eff.y + 8;
        const pulse = 0.75 + 0.25 * Math.sin(p * Math.PI * 8);
        const rem = Math.max(0, 1 - p);

        ctx.save();
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.55 * pulse})`;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.ellipse(hx, hy, 22, 11, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Vòng đếm ngược thu về
        ctx.strokeStyle = 'rgba(255, 213, 79, 0.9)';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(hx, hy, 18, 9, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * rem);
        ctx.stroke();

        // Ấn thoi vàng ở tâm ô gốc
        ctx.fillStyle = `rgba(128, 216, 255, ${0.75 * pulse})`;
        ctx.beginPath();
        ctx.moveTo(hx, hy - 6);
        ctx.lineTo(hx + 7, hy);
        ctx.lineTo(hx, hy + 6);
        ctx.lineTo(hx - 7, hy);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (eff.kind === 'irelia_slash') {
        const sx = eff.startX ?? eff.x;
        const sy = eff.startY ?? eff.y;
        const ex = eff.endX ?? eff.x;
        const ey = eff.endY ?? eff.y;
        const alpha = Math.max(0, 1 - p);
        const angle = Math.atan2(ey - sy, ex - sx);

        ctx.save();
        ctx.translate(ex, ey);
        ctx.rotate(angle);
        ctx.strokeStyle = `rgba(0, 229, 255, ${0.95 * alpha})`;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(-16, -9); ctx.lineTo(16, 9);
        ctx.moveTo(-16, 9); ctx.lineTo(16, -9);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, 13 * (0.45 + p * 0.65), -0.95, 0.95);
        ctx.stroke();
        ctx.restore();
      } else if (eff.kind === 'karma_shield_beam') {
        const sx = eff.startX ?? eff.x;
        const sy = eff.startY ?? eff.y;
        const ex = eff.endX ?? (sx + 60);
        const ey = eff.endY ?? sy;
        const alpha = Math.max(0, 1 - p);

        ctx.strokeStyle = `rgba(29, 233, 182, ${0.9 * alpha})`;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo((sx + ex) * 0.5, Math.min(sy, ey) - 16, ex, ey);
        ctx.stroke();

        ctx.strokeStyle = `rgba(105, 240, 174, ${alpha})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(ex, ey, 18 * (0.5 + p * 0.5), 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'karma_mantra') {
        const alpha = Math.max(0, 1 - p * 0.85);
        const spanW = CONFIG.CELL_WIDTH * 1.45;
        const auraGrad = ctx.createRadialGradient(eff.x, eff.y, 12, eff.x, eff.y, spanW);
        auraGrad.addColorStop(0, `rgba(255, 213, 79, ${0.35 * alpha})`);
        auraGrad.addColorStop(0.55, `rgba(29, 233, 182, ${0.32 * alpha})`);
        auraGrad.addColorStop(1, 'rgba(0, 230, 118, 0)');
        ctx.fillStyle = auraGrad;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y, spanW, CONFIG.CELL_HEIGHT * 1.25, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `rgba(105, 240, 174, ${0.9 * alpha})`;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y, spanW * (0.75 + p * 0.25), CONFIG.CELL_HEIGHT * (0.9 + p * 0.35), 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'quan_chua_strike') {
        const sx = eff.startX ?? eff.x;
        const sy = eff.startY ?? eff.y;
        const ex = eff.endX ?? (sx - 60);
        const ey = eff.endY ?? sy;
        const cx = (sx + ex) * 0.5;
        const cy = Math.min(sy, ey) - 18;

        ctx.strokeStyle = 'rgba(224, 64, 251, 0.92)';
        ctx.lineWidth = 4.6 * (1 - p * 0.5);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(255, 213, 79, 0.95)';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(234, 128, 252, 0.9)';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.arc(ex, ey, 11 * (0.4 + p * 0.85), 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'dragon_fire_breath') {
        const sx = eff.startX ?? eff.x;
        const sy = eff.startY ?? eff.y;
        const ex = eff.endX ?? (sx - 44);
        const ey = eff.endY ?? sy;
        const reach = Math.min(1, p * 2.5);
        const curX = sx + (ex - sx) * reach;
        const curY = sy + (ey - sy) * reach;

        const fireGrad = ctx.createLinearGradient(sx, sy, curX, curY);
        fireGrad.addColorStop(0, 'rgba(255, 249, 196, 0.95)');
        fireGrad.addColorStop(0.45, eff.color || 'rgba(255, 145, 0, 0.88)');
        fireGrad.addColorStop(1, 'rgba(213, 0, 0, 0.14)');
        ctx.fillStyle = fireGrad;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 2);
        ctx.lineTo(curX, curY - 11);
        ctx.quadraticCurveTo(curX - 7, curY, curX, curY + 11);
        ctx.lineTo(sx, sy + 2);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(curX, curY);
        ctx.stroke();
      } else if (eff.kind === 'ancient_lightning') {
        const sx = eff.startX ?? eff.x;
        const sy = Math.max(12, (eff.endY ?? eff.y) - 180);
        const ex = eff.endX ?? eff.x;
        const ey = eff.endY ?? eff.y;
        const alpha = Math.max(0, 1 - p);

        ctx.strokeStyle = `rgba(255, 235, 59, ${0.95 * alpha})`;
        ctx.lineWidth = 5 * (1 - p * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - 10, sy);
        ctx.lineTo(ex + 14, sy + 55);
        ctx.lineTo(ex - 12, sy + 115);
        ctx.lineTo(ex, ey);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        ctx.strokeStyle = `rgba(224, 64, 251, ${0.68 * alpha})`;
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(sx, eff.startY ?? (ey - 40));
        ctx.quadraticCurveTo((sx + ex) * 0.5, Math.min(eff.startY ?? ey, ey) - 65, ex, ey);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 213, 79, ${0.85 * alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(ex, ey, 24 * (0.4 + p * 0.8), 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'ancient_fear_roar') {
        const radius = 30 + p * 380;
        ctx.strokeStyle = `rgba(255, 23, 68, ${0.85 * (1 - p)})`;
        ctx.lineWidth = 4.8 * (1 - p * 0.6);
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, radius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 213, 79, ${0.72 * (1 - p)})`;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, radius * 0.72, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'ancient_execute') {
        const s = 26 * (1 - p * 0.3);
        const alpha = 1 - p;
        ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(255, 23, 68, ${0.96 * alpha})`;
        ctx.lineWidth = 4.6;
        ctx.beginPath();
        ctx.moveTo(eff.x - s, eff.y - s);
        ctx.lineTo(eff.x + s, eff.y + s);
        ctx.moveTo(eff.x + s, eff.y - s);
        ctx.lineTo(eff.x - s, eff.y + s);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 245, 157, ${0.9 * alpha})`;
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else if (eff.kind === 'ancient_dragon_rain') {
        const alpha = Math.sin(p * Math.PI);
        ctx.fillStyle = `rgba(38, 198, 218, ${0.12 * alpha})`;
        ctx.fillRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);
        ctx.strokeStyle = `rgba(105, 240, 174, ${0.72 * alpha})`;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        for (let i = 0; i < 30; i++) {
          const rx = ((i * 97 + p * 180) % CONFIG.CANVAS_WIDTH);
          const ry = ((i * 71 + p * 420) % CONFIG.CANVAS_HEIGHT);
          ctx.beginPath();
          ctx.moveTo(rx, ry);
          ctx.lineTo(rx - 6, ry + 18);
          ctx.stroke();
        }
      } else if (eff.kind === 'azir_sandstorm_3rows') {
        const alpha = Math.sin(p * Math.PI);
        const rows = Array.isArray(eff.rows) ? eff.rows : [0, 2, 4];
        const sx = eff.startX ?? CONFIG.GRID_OFFSET_X;
        const ex = eff.endX ?? (CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH);
        for (const r of rows) {
          const ry = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT;
          const grad = ctx.createLinearGradient(sx, ry, ex, ry + CONFIG.CELL_HEIGHT);
          grad.addColorStop(0, `rgba(255, 193, 7, ${0.38 * alpha})`);
          grad.addColorStop(0.5, `rgba(212, 163, 115, ${0.52 * alpha})`);
          grad.addColorStop(1, `rgba(255, 143, 0, ${0.38 * alpha})`);
          ctx.fillStyle = grad;
          ctx.fillRect(sx, ry + 4, ex - sx, CONFIG.CELL_HEIGHT - 8);

          ctx.strokeStyle = `rgba(255, 236, 179, ${0.88 * alpha})`;
          ctx.lineWidth = 2.6;
          for (let k = 0; k < 4; k++) {
            const wx = ex - ((p * 900 + k * 210) % (ex - sx));
            ctx.beginPath();
            ctx.ellipse(wx, ry + CONFIG.CELL_HEIGHT / 2, 26, 18, 0, 0, Math.PI * 2);
            ctx.stroke();
          }
        }
      } else if (eff.kind === 'sand_soldier_emerge') {
        const alpha = 1 - p;
        const radius = 12 + p * 26;
        ctx.strokeStyle = eff.isCoffin
          ? `rgba(255, 213, 79, ${0.95 * alpha})`
          : `rgba(255, 179, 0, ${0.95 * alpha})`;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y + 18, radius, radius * 0.42, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 248, 225, ${0.7 * alpha})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y + 18, radius * 0.6, radius * 0.25, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'renekton_charge') {
        const alpha = 1 - p;
        ctx.lineCap = 'round';
        ctx.strokeStyle = `rgba(255, 112, 67, ${0.88 * alpha})`;
        ctx.lineWidth = 9 * (1 - p * 0.5);
        ctx.beginPath();
        ctx.moveTo(eff.endX ?? eff.x, eff.y);
        ctx.lineTo(eff.startX ?? (eff.x - 70), eff.y);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 245, 157, ${0.9 * alpha})`;
        ctx.lineWidth = 3 * (1 - p * 0.5);
        ctx.stroke();
      } else if (eff.kind === 'renekton_sweep_3x3') {
        const alpha = 1 - p;
        const tY = CONFIG.GRID_OFFSET_Y + (eff.minRow ?? 0) * CONFIG.CELL_HEIGHT + 6;
        const bY = CONFIG.GRID_OFFSET_Y + ((eff.maxRow ?? 4) + 1) * CONFIG.CELL_HEIGHT - 6;
        const sx = eff.startX ?? (eff.x - 100);
        const ex = eff.endX ?? (eff.x + 100);

        ctx.fillStyle = `rgba(255, 87, 34, ${0.22 * alpha})`;
        ctx.fillRect(sx, tY, ex - sx, bY - tY);

        ctx.strokeStyle = `rgba(255, 138, 101, ${0.82 * alpha})`;
        ctx.lineWidth = 7 * (1 - p * 0.4);
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, 92 * (0.65 + p * 0.45), Math.PI * 0.25, Math.PI * 1.75);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 245, 157, ${0.98 * alpha})`;
        ctx.lineWidth = 2.5 * (1 - p * 0.3);
        ctx.stroke();
      } else if (eff.kind === 'nosus_blood_bolt') {
        const alpha = 1 - p;
        const bx = (eff.startX ?? eff.x) + ((eff.endX ?? eff.x) - (eff.startX ?? eff.x)) * p;
        const by = (eff.startY ?? eff.y) + ((eff.endY ?? eff.y) - (eff.startY ?? eff.y)) * p;

        ctx.strokeStyle = `rgba(255, 23, 68, ${0.82 * alpha})`;
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eff.startX ?? eff.x, eff.startY ?? eff.y);
        ctx.lineTo(bx, by);
        ctx.stroke();

        ctx.fillStyle = '#ff1744';
        ctx.beginPath();
        ctx.arc(bx, by, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffcdd2';
        ctx.beginPath();
        ctx.arc(bx, by, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (eff.kind === 'nosus_blood_pact') {
        const alpha = 1 - p;
        const rx = 32 + p * 86;
        const ry = 22 + p * 68;
        ctx.fillStyle = `rgba(213, 0, 0, ${0.14 * alpha})`;
        ctx.strokeStyle = `rgba(255, 23, 68, ${0.9 * alpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y, rx, ry, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (eff.kind === 'nosus_darius_spin') {
        const alpha = 1 - p;
        const tY = CONFIG.GRID_OFFSET_Y + (eff.minRow ?? 0) * CONFIG.CELL_HEIGHT + 6;
        const bY = CONFIG.GRID_OFFSET_Y + ((eff.maxRow ?? 4) + 1) * CONFIG.CELL_HEIGHT - 6;
        const sx = eff.startX ?? (eff.x - 130);
        const ex = eff.endX ?? (eff.x + 130);
        const spinAng = p * Math.PI * 6;

        // Vùng quét Máy Chém Xoay 3x3
        ctx.fillStyle = `rgba(213, 0, 0, ${0.14 * alpha})`;
        ctx.fillRect(sx, tY, Math.max(20, ex - sx), bY - tY);
        ctx.strokeStyle = `rgba(255, 82, 82, ${0.55 * alpha})`;
        ctx.lineWidth = 2.2;
        ctx.strokeRect(sx, tY, Math.max(20, ex - sx), bY - tY);

        // Vòng lưỡi rìu xoay 360 độ
        ctx.strokeStyle = `rgba(255, 23, 68, ${0.95 * alpha})`;
        ctx.lineWidth = 7 * (1 - p * 0.35);
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, 112 * (0.72 + p * 0.28), spinAng, spinAng + Math.PI * 1.45);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 213, 79, ${0.9 * alpha})`;
        ctx.lineWidth = 3 * (1 - p * 0.35);
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, 96 * (0.75 + p * 0.25), spinAng + Math.PI, spinAng + Math.PI * 2.2);
        ctx.stroke();

        // Sóng hồi máu xanh ngọc nhẹ ở tâm
        ctx.strokeStyle = `rgba(105, 240, 174, ${0.8 * alpha})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, 20 + p * 45, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'nosus_darius_chop') {
        const alpha = 1 - p;
        const rad = eff.isExecute ? 58 : 44;
        ctx.strokeStyle = eff.isExecute
          ? `rgba(255, 213, 79, ${0.98 * alpha})`
          : `rgba(255, 23, 68, ${0.95 * alpha})`;
        ctx.lineWidth = (eff.isExecute ? 8 : 6) * (1 - p * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(eff.x + 12, eff.y, rad, Math.PI * 0.72, Math.PI * 1.42);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.85 * alpha})`;
        ctx.lineWidth = 2.4 * (1 - p * 0.4);
        ctx.stroke();
      } else if (eff.kind === 'nosus_darius_last_stand') {
        const alpha = 1 - p;
        ctx.fillStyle = `rgba(255, 23, 68, ${0.2 * alpha})`;
        ctx.strokeStyle = `rgba(255, 213, 79, ${0.98 * alpha})`;
        ctx.lineWidth = 4.5 * (1 - p * 0.3);
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, 26 + p * 115, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (eff.kind === 'zed_slash') {
        const alpha = 1 - p;
        ctx.strokeStyle = `rgba(255, 23, 68, ${0.95 * alpha})`;
        ctx.lineWidth = 4.5 * (1 - p * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eff.x - 18, eff.y - 18); ctx.lineTo(eff.x + 18, eff.y + 18);
        ctx.moveTo(eff.x + 18, eff.y - 18); ctx.lineTo(eff.x - 18, eff.y + 18);
        ctx.stroke();
        ctx.strokeStyle = `rgba(25, 25, 30, ${0.8 * alpha})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else if (eff.kind === 'zed_shadow_dash') {
        const alpha = 1 - p;
        ctx.strokeStyle = `rgba(33, 33, 33, ${0.85 * alpha})`;
        ctx.lineWidth = 14 * (1 - p * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(eff.startX ?? eff.x, eff.y);
        ctx.lineTo(eff.endX ?? eff.x, eff.y);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 23, 68, ${0.92 * alpha})`;
        ctx.lineWidth = 4 * (1 - p * 0.3);
        ctx.stroke();
      } else if (eff.kind === 'zed_death_mark') {
        const alpha = 1 - p;
        const rad = 28 * (1.4 - p * 0.5);
        ctx.strokeStyle = `rgba(255, 23, 68, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(eff.x - rad, eff.y - rad); ctx.lineTo(eff.x + rad, eff.y + rad);
        ctx.moveTo(eff.x + rad, eff.y - rad); ctx.lineTo(eff.x - rad, eff.y + rad);
        ctx.stroke();
      } else if (eff.kind === 'zed_death_mark_boom') {
        const alpha = 1 - p;
        const r = 16 + p * 44;
        ctx.fillStyle = `rgba(255, 23, 68, ${0.32 * alpha})`;
        ctx.strokeStyle = `rgba(255, 213, 79, ${0.95 * alpha})`;
        ctx.lineWidth = 4 * (1 - p * 0.4);
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.strokeStyle = `rgba(33, 33, 33, ${alpha})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(eff.x - r * 0.7, eff.y - r * 0.7); ctx.lineTo(eff.x + r * 0.7, eff.y + r * 0.7);
        ctx.moveTo(eff.x + r * 0.7, eff.y - r * 0.7); ctx.lineTo(eff.x - r * 0.7, eff.y + r * 0.7);
        ctx.stroke();
      } else if (eff.kind === 'yone_slash') {
        const alpha = 1 - p;
        ctx.strokeStyle = eff.isEmpowered
          ? `rgba(255, 23, 68, ${0.96 * alpha})`
          : `rgba(128, 222, 234, ${0.95 * alpha})`;
        ctx.lineWidth = (eff.isEmpowered ? 6.5 : 4.5) * (1 - p * 0.35);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(eff.x + 12, eff.y, eff.isEmpowered ? 34 : 26, Math.PI * 0.65, Math.PI * 1.45);
        ctx.stroke();
      } else if (eff.kind === 'yone_r_dash') {
        const alpha = 1 - p;
        const tY = CONFIG.GRID_OFFSET_Y + (eff.row ?? 0) * CONFIG.CELL_HEIGHT + 12;
        const bY = CONFIG.GRID_OFFSET_Y + ((eff.row ?? 0) + 1) * CONFIG.CELL_HEIGHT - 12;
        const sx = eff.endX ?? (eff.x - 240);
        const ex = eff.startX ?? eff.x;
        ctx.fillStyle = `rgba(255, 23, 68, ${0.22 * alpha})`;
        ctx.fillRect(sx, tY, Math.max(20, ex - sx), bY - tY);
        ctx.strokeStyle = `rgba(128, 222, 234, ${0.92 * alpha})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(ex, eff.y - 8); ctx.lineTo(sx, eff.y - 8);
        ctx.stroke();
        ctx.strokeStyle = `rgba(255, 23, 68, ${0.96 * alpha})`;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(ex, eff.y + 8); ctx.lineTo(sx, eff.y + 8);
        ctx.stroke();
      } else if (eff.kind === 'yone_spirit_snap') {
        const alpha = 1 - p;
        ctx.strokeStyle = `rgba(128, 222, 234, ${0.95 * alpha})`;
        ctx.lineWidth = 5 * (1 - p * 0.4);
        ctx.beginPath();
        ctx.moveTo(eff.startX ?? eff.x, eff.y);
        ctx.lineTo(eff.endX ?? eff.x, eff.y);
        ctx.stroke();
      } else if (eff.kind === 'sett_punch') {
        const alpha = 1 - p;
        const sx = eff.startX ?? (eff.x + 28);
        const sy = eff.startY ?? eff.y;
        const fistX = sx + (eff.x - sx) * Math.min(1, p * 1.45);
        const fistY = sy + (eff.y - sy) * Math.min(1, p * 1.45);

        // Vệt đấm tốc độ vàng-đỏ
        ctx.strokeStyle = `rgba(255, 179, 0, ${0.9 * alpha})`;
        ctx.lineWidth = 8 * (1 - p * 0.4);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(fistX, fistY);
        ctx.stroke();

        // Sóng xung kích va chạm đấm
        const r = 14 + p * 30;
        ctx.fillStyle = `rgba(255, 171, 0, ${0.34 * alpha})`;
        ctx.strokeStyle = `rgba(255, 213, 79, ${0.98 * alpha})`;
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Nắm đấm vàng rực ở điểm va chạm
        ctx.fillStyle = `rgba(255, 224, 130, ${0.95 * alpha})`;
        ctx.strokeStyle = `rgba(255, 61, 0, ${0.95 * alpha})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(fistX - 9, fistY - 7, 16, 14, 4);
        ctx.fill();
        ctx.stroke();
      } else if (eff.kind === 'sett_w_blast') {
        const alpha = 1 - p;
        const frontX = eff.startX ?? (eff.x - 240);
        const backX = eff.endX ?? (eff.x - 10);
        const frontTopY = CONFIG.GRID_OFFSET_Y + (eff.minRow ?? 0) * CONFIG.CELL_HEIGHT + 4;
        const frontBotY = CONFIG.GRID_OFFSET_Y + ((eff.maxRow ?? 4) + 1) * CONFIG.CELL_HEIGHT - 4;
        const cTopY = CONFIG.GRID_OFFSET_Y + (eff.row ?? 2) * CONFIG.CELL_HEIGHT + 7;
        const cBotY = CONFIG.GRID_OFFSET_Y + ((eff.row ?? 2) + 1) * CONFIG.CELL_HEIGHT - 7;
        const backTopY = cTopY - Math.min(48, (cTopY - frontTopY) * 0.45);
        const backBotY = cBotY + Math.min(48, (frontBotY - cBotY) * 0.45);

        this.drawSettHaymakerZone(ctx, {
          backX, frontX,
          backTopY, backBotY,
          frontTopY, frontBotY,
          cTopY, cBotY,
          time: this.getFrameTimeSec(),
          intensity: alpha,
          progress: p,
          isBlast: true
        });
      } else if (eff.kind === 'sett_r_throw') {
        const alpha = 1 - p;
        const sx = eff.startX ?? eff.x;
        const ex = eff.endX ?? eff.x;
        const sy = eff.startY ?? eff.y;
        const ey = eff.endY ?? eff.y;
        const cx = (sx + ex) / 2;
        const cy = Math.min(sy, ey) - 96;

        // Vòng sóng khởi phát ngay tại vị trí Sett túm lấy cây phòng thủ
        if (p < 0.55) {
          const gp = p / 0.55;
          ctx.strokeStyle = `rgba(255, 213, 79, ${(1 - gp) * 0.9})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(sx, sy + 12, 16 + gp * 26, 8 + gp * 14, 0, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Dải quỹ đạo vồng cao Showstopper rực lửa vàng-đỏ
        const ribbonGrad = ctx.createLinearGradient(sx, sy, ex, ey);
        ribbonGrad.addColorStop(0, `rgba(255, 235, 59, ${0.85 * alpha})`);
        ribbonGrad.addColorStop(0.5, `rgba(255, 145, 0, ${0.95 * alpha})`);
        ribbonGrad.addColorStop(1, `rgba(255, 61, 0, ${0.85 * alpha})`);
        ctx.strokeStyle = ribbonGrad;
        ctx.lineWidth = 8 * (1 - p * 0.45);
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.75 * alpha})`;
        ctx.lineWidth = 2.4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.quadraticCurveTo(cx, cy, ex, ey);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (eff.kind === 'sett_r_slam') {
        const alpha = 1 - p;
        const tY = CONFIG.GRID_OFFSET_Y + (eff.minRow ?? 0) * CONFIG.CELL_HEIGHT + 6;
        const bY = CONFIG.GRID_OFFSET_Y + ((eff.maxRow ?? 4) + 1) * CONFIG.CELL_HEIGHT - 6;
        const sx = eff.startX ?? (eff.x - 110);
        const ex = eff.endX ?? (eff.x + 110);

        // Vùng nổ 3×3 cam-vàng rực lửa
        ctx.fillStyle = `rgba(255, 109, 0, ${0.30 * alpha})`;
        ctx.strokeStyle = `rgba(255, 213, 79, ${0.92 * alpha})`;
        ctx.lineWidth = 2.8;
        ctx.fillRect(sx, tY, Math.max(20, ex - sx), bY - tY);
        ctx.strokeRect(sx, tY, Math.max(20, ex - sx), bY - tY);

        // Hố va chạm sẫm màu tại tâm giáng đòn
        ctx.fillStyle = `rgba(46, 14, 5, ${0.55 * alpha})`;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y + 8, 34 + p * 22, 16 + p * 10, 0, 0, Math.PI * 2);
        ctx.fill();

        // 10 tia nứt mặt đấu trường tỏa mạnh từ tâm
        ctx.strokeStyle = `rgba(255, 224, 130, ${0.96 * alpha})`;
        ctx.lineWidth = 3.2;
        for (let k = 0; k < 10; k++) {
          const ang = (k * Math.PI) / 5 + 0.15;
          const len = 22 + p * 78;
          ctx.beginPath();
          ctx.moveTo(eff.x + Math.cos(ang) * 10, eff.y + 6 + Math.sin(ang) * 6);
          ctx.lineTo(eff.x + Math.cos(ang) * len, eff.y + 6 + Math.sin(ang) * (len * 0.68));
          ctx.stroke();
        }

        // Cột sáng bùng nổ thẳng đứng lúc chạm đất
        if (p < 0.45) {
          const colA = (1 - p / 0.45) * 0.72;
          const colGrad = ctx.createLinearGradient(eff.x, eff.y + 10, eff.x, eff.y - 110);
          colGrad.addColorStop(0, `rgba(255, 245, 157, ${colA})`);
          colGrad.addColorStop(0.6, `rgba(255, 145, 0, ${colA * 0.6})`);
          colGrad.addColorStop(1, 'rgba(255, 61, 0, 0)');
          ctx.fillStyle = colGrad;
          ctx.beginPath();
          ctx.moveTo(eff.x - 32, eff.y + 10);
          ctx.lineTo(eff.x - 16, eff.y - 108);
          ctx.lineTo(eff.x + 16, eff.y - 108);
          ctx.lineTo(eff.x + 32, eff.y + 10);
          ctx.closePath();
          ctx.fill();
        }

        // Hai vòng sóng xung kích kép (vàng cam + trắng chói)
        ctx.strokeStyle = `rgba(255, 171, 0, ${0.9 * alpha})`;
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y + 4, 30 + p * 98, 20 + p * 68, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${0.95 * alpha})`;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y + 4, 18 + p * 74, 12 + p * 50, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'melee_bite') {
        const alpha = 1 - p;
        ctx.strokeStyle = eff.color || `rgba(174, 213, 129, ${alpha})`;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, 10 + p * 10, Math.PI * 0.65, Math.PI * 1.45);
        ctx.stroke();
      } else if (eff.kind === 'pyke_q_hook') {
        const alpha = 1 - p * 0.7;
        const reach = Math.min(1, p * 2.2);
        const sx = eff.startX ?? eff.x;
        const ex = eff.endX ?? sx;
        const curX = sx + (ex - sx) * reach;
        const y = eff.y;

        ctx.strokeStyle = `rgba(0, 229, 255, ${0.9 * alpha})`;
        ctx.lineWidth = 3.2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(sx, y);
        ctx.lineTo(curX, y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Đầu móc lao rực sáng
        ctx.fillStyle = `rgba(255, 213, 79, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(curX - 16, y);
        ctx.lineTo(curX + 6, y - 9);
        ctx.lineTo(curX + 2, y);
        ctx.lineTo(curX + 6, y + 9);
        ctx.closePath();
        ctx.fill();
      } else if (eff.kind === 'pyke_e_surge') {
        const alpha = 1 - p;
        const sx = eff.startX ?? eff.x;
        const ex = eff.endX ?? eff.x;
        const y = eff.y;
        const surgeX = ex - (ex - sx) * Math.min(1, p * 1.5);

        ctx.strokeStyle = `rgba(0, 229, 255, ${0.95 * alpha})`;
        ctx.lineWidth = 4.2;
        ctx.beginPath();
        ctx.moveTo(ex, y - 16);
        ctx.lineTo(surgeX, y);
        ctx.lineTo(ex, y + 16);
        ctx.stroke();

        ctx.fillStyle = `rgba(38, 198, 218, ${0.42 * alpha})`;
        ctx.beginPath();
        ctx.ellipse(surgeX, y, 24, 28, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (eff.kind === 'pyke_r_x_mark') {
        const pulse = 0.7 + Math.sin(p * Math.PI * 6) * 0.3;
        const r = 34 - p * 12;
        ctx.strokeStyle = `rgba(255, 23, 68, ${pulse})`;
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, Math.max(12, r), 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffd54f';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(eff.x - 18, eff.y - 18); ctx.lineTo(eff.x + 18, eff.y + 18);
        ctx.moveTo(eff.x + 18, eff.y - 18); ctx.lineTo(eff.x - 18, eff.y + 18);
        ctx.stroke();
      } else if (eff.kind === 'pyke_r_exec') {
        const alpha = 1 - p;
        const spread = 18 + p * 36;
        ctx.lineCap = 'round';
        ctx.strokeStyle = eff.hit ? `rgba(255, 23, 68, ${alpha})` : `rgba(255, 171, 64, ${alpha})`;
        ctx.lineWidth = 7 * (1 - p * 0.45);
        ctx.beginPath();
        ctx.moveTo(eff.x - spread, eff.y - spread); ctx.lineTo(eff.x + spread, eff.y + spread);
        ctx.moveTo(eff.x + spread, eff.y - spread); ctx.lineTo(eff.x - spread, eff.y + spread);
        ctx.stroke();

        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
        ctx.lineWidth = 2.6;
        ctx.stroke();

        if (eff.hit) {
          ctx.strokeStyle = `rgba(0, 230, 118, ${alpha})`;
          ctx.lineWidth = 3.0;
          ctx.beginPath();
          ctx.arc(eff.x, eff.y, 16 + p * 44, 0, Math.PI * 2);
          ctx.stroke();
        }
      } else if (eff.kind === 'anchor_slam') {
        const alpha = 1 - p;
        const sx = eff.startX ?? eff.x;
        const ex = eff.endX ?? eff.x;
        ctx.strokeStyle = `rgba(255, 171, 0, ${alpha})`;
        ctx.lineWidth = 4.0;
        ctx.beginPath();
        ctx.moveTo(sx, eff.y);
        ctx.quadraticCurveTo((sx + ex) / 2, eff.y - 36, ex, eff.y);
        ctx.stroke();

        ctx.strokeStyle = `rgba(176, 190, 197, ${alpha})`;
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.ellipse(ex, eff.y + 10, 14 + p * 28, 7 + p * 14, 0, 0, Math.PI * 2);
        ctx.stroke();
      } else if (eff.kind === 'swimmer_surface') {
        const alpha = 1 - p;
        ctx.strokeStyle = `rgba(0, 229, 255, ${alpha})`;
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y + 12, 16 + p * 36, 8 + p * 16, 0, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(128, 222, 234, ${0.35 * alpha})`;
        ctx.beginPath();
        ctx.moveTo(eff.x - 18, eff.y + 12);
        ctx.lineTo(eff.x, eff.y - 38 * (1 - p * 0.4));
        ctx.lineTo(eff.x + 18, eff.y + 12);
        ctx.closePath();
        ctx.fill();
      } else if (eff.kind === 'your_cut_reward') {
        const alpha = 1 - p;
        ctx.strokeStyle = `rgba(255, 213, 79, ${alpha})`;
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.arc(eff.x, eff.y, 14 + p * 46, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = `rgba(255, 235, 59, ${0.28 * alpha})`;
        ctx.fill();
      } else if (eff.kind === 'squash_slam') {
        const alpha = 1 - p;
        ctx.fillStyle = `rgba(118, 255, 3, ${0.32 * alpha})`;
        ctx.strokeStyle = `rgba(178, 255, 89, ${0.95 * alpha})`;
        ctx.lineWidth = 3.4;
        ctx.beginPath();
        ctx.ellipse(eff.x, eff.y + 12, 24 + p * 34, 12 + p * 16, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  // Vẽ vùng hình thang Cuồng Thú Quyền (W) của Sett giống hiệu ứng LMHT:
  // Hai cánh rìa cam sẫm (200 DMG) mở rộng hình thang + làn giữa vàng rực các tia lửa chạy dọc (550 DMG)
  drawSettHaymakerZone(ctx, {
    backX, frontX,
    backTopY, backBotY,
    frontTopY, frontBotY,
    cTopY, cBotY,
    time,
    intensity = 1,
    progress = 0,
    isBlast = false
  }) {
    ctx.save();
    const a = Math.max(0, Math.min(1, intensity));
    const width = Math.max(24, backX - frontX);

    // 1. Vùng hình thang tổng thể (Cánh rìa 200 DMG) — cam sẫm ánh đồng rực viền vàng cam
    const wingGrad = ctx.createLinearGradient(backX, 0, frontX, 0);
    wingGrad.addColorStop(0, `rgba(191, 74, 0, ${(isBlast ? 0.44 : 0.34) * a})`);
    wingGrad.addColorStop(0.65, `rgba(145, 52, 0, ${(isBlast ? 0.38 : 0.28) * a})`);
    wingGrad.addColorStop(1, `rgba(105, 36, 0, ${(isBlast ? 0.32 : 0.22) * a})`);
    ctx.fillStyle = wingGrad;
    ctx.beginPath();
    ctx.moveTo(backX, backTopY);
    ctx.lineTo(frontX, frontTopY);
    ctx.lineTo(frontX, frontBotY);
    ctx.lineTo(backX, backBotY);
    ctx.closePath();
    ctx.fill();

    // Đường viền hình thang phát sáng cam-vàng & 2 góc móc Ionia sắc nét ở đầu rìa
    ctx.strokeStyle = `rgba(255, 145, 0, ${0.92 * a})`;
    ctx.lineWidth = isBlast ? 3.8 : 2.8;
    ctx.stroke();

    // Móc hoa văn 2 góc rìa ngoài (giống đường viền uốn lượn trong ảnh)
    ctx.strokeStyle = `rgba(255, 202, 40, ${0.88 * a})`;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(frontX + 12, frontTopY + 14, 14, Math.PI * 0.9, Math.PI * 1.65);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(frontX + 12, frontBotY - 14, 14, Math.PI * 0.35, Math.PI * 1.1);
    ctx.stroke();

    // 2. Làn giữa chuẩn xác (550 DMG) — vàng rực chói lọi với các dải tia lửa chạy dọc từ Sett ra trước
    const centerGrad = ctx.createLinearGradient(backX, 0, frontX, 0);
    centerGrad.addColorStop(0, `rgba(255, 241, 118, ${(isBlast ? 0.85 : 0.52) * a})`);
    centerGrad.addColorStop(0.5, `rgba(255, 179, 0, ${(isBlast ? 0.72 : 0.44) * a})`);
    centerGrad.addColorStop(1, `rgba(255, 143, 0, ${(isBlast ? 0.58 : 0.36) * a})`);
    ctx.fillStyle = centerGrad;
    ctx.fillRect(frontX, cTopY, width, cBotY - cTopY);

    // Thanh tụ lực / luồng sóng tiến dần từ tay Sett tới hết vùng đánh
    if (!isBlast) {
      const surgeW = width * progress;
      ctx.fillStyle = `rgba(255, 235, 130, ${0.38 * a})`;
      ctx.fillRect(backX - surgeW, cTopY, surgeW, cBotY - cTopY);
    } else {
      // Đợt sóng xung kích lao cực nhanh qua làn giữa khi Sett tung đấm
      const beamHeadX = backX - width * Math.min(1, progress * 1.5);
      const beamGrad = ctx.createLinearGradient(backX, 0, beamHeadX, 0);
      beamGrad.addColorStop(0, `rgba(255, 255, 255, ${0.22 * a})`);
      beamGrad.addColorStop(0.7, `rgba(255, 245, 157, ${0.85 * a})`);
      beamGrad.addColorStop(1, `rgba(255, 255, 255, ${0.98 * a})`);
      ctx.fillStyle = beamGrad;
      ctx.fillRect(Math.max(frontX, beamHeadX), cTopY + 3, backX - Math.max(frontX, beamHeadX), cBotY - cTopY - 6);
    }

    // Các tia lửa uốn lượn chạy dọc trong làn giữa (như vệt năng lượng trong ảnh LMHT)
    const cMidY = (cTopY + cBotY) / 2;
    const cHalf = (cBotY - cTopY) / 2;
    for (let s = -2; s <= 2; s++) {
      const laneOff = s * cHalf * 0.32;
      ctx.strokeStyle = s === 0
        ? `rgba(255, 255, 255, ${(isBlast ? 0.96 : 0.78) * a})`
        : `rgba(255, 224, 130, ${(isBlast ? 0.86 : 0.62) * a})`;
      ctx.lineWidth = s === 0 ? (isBlast ? 3.4 : 2.2) : 1.5;
      ctx.beginPath();
      const segs = 6;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const px = backX - width * t;
        const wave = Math.sin(t * 7 + time * 14 + s * 1.3) * (isBlast ? 4.2 : 2.6);
        const py = cMidY + laneOff + wave;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    // Viền hai bên làn giữa sắc nét màu vàng sáng
    ctx.strokeStyle = `rgba(255, 238, 88, ${0.98 * a})`;
    ctx.lineWidth = isBlast ? 3.2 : 2.4;
    ctx.strokeRect(frontX, cTopY, width, cBotY - cTopY);

    // Nhãn phân biệt vùng giữa 550 DMG và vùng rìa 200 DMG
    if (!isBlast) {
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(255, 249, 196, ${0.98 * a})`;
      ctx.fillText('CUỒNG THÚ QUYỀN · TÂM 550 / RÌA 200', (frontX + backX) / 2, cTopY - 6);
    }

    ctx.restore();
  }

  // Vẽ Tinh Hồn Hắc Ám (Soul Orb / Ethereal Nether Flame) thay thế mặt trời hoạt hình
  drawSun(ctx, sun) {
    ctx.save();
    const bob = Math.sin(sun.floatTimer) * 4;
    ctx.translate(sun.x, sun.y + bob);

    // Độ mờ khi gần biến mất
    if (!sun.collected && sun.lifetime > CONFIG.NATURAL_SUN_LIFETIME - 2.0) {
      const remaining = CONFIG.NATURAL_SUN_LIFETIME - sun.lifetime;
      ctx.globalAlpha = Math.max(0.2, remaining / 2.0);
    }

    // 1. Quầng hào quang huyết ấn & linh hồn ma quỷ (Crimson & Nether Flame Halo)
    ctx.fillStyle = 'rgba(255, 23, 68, 0.32)';
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.fill();

    // 2. Vòng xoáy 8 tia linh hồn quỷ dữ xoay quanh tâm
    const rayCount = 8;
    const rot = sun.rotTimer || 0;
    ctx.fillStyle = '#ff5252';
    for (let i = 0; i < rayCount; i++) {
      const angle = rot + (i * Math.PI * 2) / rayCount;
      const rx = Math.cos(angle) * 16;
      const ry = Math.sin(angle) * 16;
      ctx.beginPath();
      ctx.arc(rx, ry, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Quả cầu Tinh Hồn Huyết Ngọc (Soul Orb Core)
    const orbGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 15);
    orbGrad.addColorStop(0, '#ffffff');
    orbGrad.addColorStop(0.3, '#ff8a80');
    orbGrad.addColorStop(0.7, '#d50000');
    orbGrad.addColorStop(1, '#3e0404');
    ctx.fillStyle = orbGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 14, 0, Math.PI * 2);
    ctx.fill();

    // 4. Đồng tử quỷ / Cổ ngữ ma thuật trung tâm phát sáng
    ctx.fillStyle = '#1a0000';
    ctx.beginPath();
    ctx.ellipse(0, 0, 2.5, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Điểm sáng lóe mắt quỷ
    ctx.fillStyle = '#ff8a80';
    ctx.beginPath();
    ctx.arc(0, -1.5, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawParticleShape(ctx, p) {
    const a = Math.max(0, p.alpha);
    if (a <= 0.01) return;
    ctx.globalAlpha = a;

    if (p.shape === 'ring') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1.2, p.radius * 0.14);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, p.radius), 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.shape === 'spark') {
      const len = Math.max(4, p.radius * 3.1);
      const ca = Math.cos(p.angle || 0);
      const sa = Math.sin(p.angle || 0);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = Math.max(1.2, p.radius * 0.65);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x - ca * len * 0.6, p.y - sa * len * 0.6);
      ctx.lineTo(p.x + ca * len * 0.4, p.y + sa * len * 0.4);
      ctx.stroke();
    } else if (p.shape === 'shard') {
      const r = Math.max(1.8, p.radius * 1.5);
      const ca = Math.cos(p.angle || 0);
      const sa = Math.sin(p.angle || 0);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.moveTo(p.x + ca * r, p.y + sa * r);
      ctx.lineTo(p.x - sa * (r * 0.5), p.y + ca * (r * 0.5));
      ctx.lineTo(p.x - ca * r, p.y - sa * r);
      ctx.lineTo(p.x + sa * (r * 0.5), p.y - ca * (r * 0.5));
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.8, p.radius), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawParticles(ctx, particles) {
    ctx.save();
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      if (p && p.alive) {
        this._drawParticleShape(ctx, p);
      }
    }
    ctx.restore();
  }

  drawParticle(ctx, p) {
    ctx.save();
    this._drawParticleShape(ctx, p);
    ctx.restore();
  }

  drawHealthBar(ctx, x, y, width, height, ratio, color) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - 1, y - 1, width + 2, height + 2);

    ctx.fillStyle = color;
    ctx.fillRect(x, y, Math.max(0, width * ratio), height);
  }

  drawGalioSkillBar(ctx, x, y, width, height, ratio) {
    ctx.save();
    ctx.fillStyle = 'rgba(10, 18, 28, 0.78)';
    ctx.strokeStyle = 'rgba(255, 213, 79, 0.65)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x - 1, y - 1, width + 2, height + 2, 2.5);
    ctx.fill();
    ctx.stroke();

    if (ratio > 0.001) {
      const barGrad = ctx.createLinearGradient(x, y, x + width, y);
      barGrad.addColorStop(0, '#00b0ff');
      barGrad.addColorStop(0.7, '#00e5ff');
      barGrad.addColorStop(1, '#ffd54f');
      ctx.fillStyle = barGrad;
      ctx.beginPath();
      ctx.roundRect(x, y, Math.max(2, width * ratio), height, 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawScorchedTiles(ctx, scorchedTiles) {
    const time = this.getFrameTimeSec() * 3;
    for (const st of scorchedTiles) {
      if (st.timer <= 0) continue;
      const x = CONFIG.GRID_OFFSET_X + st.col * CONFIG.CELL_WIDTH;
      const y = CONFIG.GRID_OFFSET_Y + st.row * CONFIG.CELL_HEIGHT;
      const w = CONFIG.CELL_WIDTH;
      const h = CONFIG.CELL_HEIGHT;
      const alpha = Math.min(1.0, st.timer / 1.5) * 0.88;

      ctx.save();
      ctx.globalAlpha = alpha;

      // Nền đất cháy đen tro tàn
      ctx.fillStyle = '#1c0905';
      ctx.fillRect(x + 2, y + 2, w - 4, h - 4);

      // Các vết nứt dung nham nóng đỏ
      ctx.strokeStyle = '#ff3d00';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 14);
      ctx.lineTo(x + w * 0.45, y + h * 0.5);
      ctx.lineTo(x + w * 0.82, y + h * 0.28);
      ctx.moveTo(x + w * 0.45, y + h * 0.5);
      ctx.lineTo(x + w * 0.32, y + h * 0.85);
      ctx.moveTo(x + w * 0.45, y + h * 0.5);
      ctx.lineTo(x + w * 0.78, y + h * 0.78);
      ctx.stroke();

      // Lõi dung nham vàng rực phát sáng
      ctx.strokeStyle = '#ffd600';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Đốm lửa tro tàn bập bùng
      const emberFlicker = Math.sin(time * 6 + st.row * 3 + st.col) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 87, 34, ${0.38 * emberFlicker})`;
      ctx.fillRect(x + 5, y + 5, w - 10, h - 10);

      // Icon đốm lửa nhỏ ở góc
      ctx.font = '14px sans-serif';
      ctx.fillStyle = '#ff6d00';
      ctx.fillText('🔥', x + w - 22, y + 18);

      // Đếm ngược thời gian còn lại
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.ceil(st.timer)}s`, x + w / 2, y + h - 8);

      ctx.restore();
    }
  }

  drawFireballs(ctx, fireballs) {
    const time = this.getFrameTimeSec() * 5;
    for (const fb of fireballs) {
      if (!fb.alive) continue;
      const p = Math.max(0, Math.min(1, fb.progress));
      const curX = fb.startX + (fb.targetX - fb.startX) * p;
      const arc = 4 * fb.arcHeight * p * (1 - p);
      const curY = fb.startY + (fb.targetY - fb.startY) * p - arc;

      ctx.save();
      ctx.translate(curX, curY);

      // Đuôi lửa thuôn mượt thay vì vệt xám đục
      const trailAngle = Math.atan2((fb.targetY - fb.startY), (fb.targetX - fb.startX));
      const tx = -Math.cos(trailAngle) * 34;
      const ty = -Math.sin(trailAngle) * 34;
      const px = -Math.sin(trailAngle) * 12;
      const py = Math.cos(trailAngle) * 12;
      ctx.fillStyle = 'rgba(255, 87, 34, 0.45)';
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(px, py);
      ctx.lineTo(-px, -py);
      ctx.closePath();
      ctx.fill();

      // Quả cầu lửa dung nham rực cháy
      const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 18);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.3, '#ffd600');
      grad.addColorStop(0.65, '#ff3d00');
      grad.addColorStop(1, '#bf360c');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 18, 0, Math.PI * 2);
      ctx.fill();

      // Tia lửa bốc cháy xoay quanh
      ctx.fillStyle = '#ffea00';
      for (let j = 0; j < 5; j++) {
        const flameAng = time * 3 + (j * Math.PI * 2) / 5;
        const fx = Math.cos(flameAng) * 21;
        const fy = Math.sin(flameAng) * 21;
        ctx.beginPath();
        ctx.arc(fx, fy, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  drawFireBreath(ctx, boss) {
    if (!boss || !boss.alive) return;
    const rows = boss.breathRows || [boss.bossRow, boss.bossRow + 1];
    const time = this.getFrameTimeSec() * 5;

    // 1. Khi đang tụ chiêu (isWindupBreath): Chiếu tia cảnh báo đỏ rực trên 2 hàng
    if (boss.isWindupBreath) {
      const pulse = Math.sin(time * 12) * 0.2 + 0.3;
      for (const r of rows) {
        if (r < 0 || r >= CONFIG.ROWS) continue;
        const y = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT;
        const h = CONFIG.CELL_HEIGHT;
        const w = boss.x - CONFIG.GRID_OFFSET_X;

        ctx.save();
        ctx.fillStyle = `rgba(255, 23, 68, ${pulse})`;
        ctx.fillRect(CONFIG.GRID_OFFSET_X, y, w, h);

        ctx.strokeStyle = '#ff1744';
        ctx.lineWidth = 2;
        ctx.setLineDash([12, 8]);
        ctx.strokeRect(CONFIG.GRID_OFFSET_X, y, w, h);

        // Chữ cảnh báo
        ctx.fillStyle = '#ffeb3b';
        ctx.font = 'bold 14px -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('⚠️ CẢNH BÁO: HƠI THỞ LỬA SẮP CÀN QUÉT! (DÙNG PLANT FOOD ĐỂ NGẮT CHIÊU)', CONFIG.GRID_OFFSET_X + w / 2, y + h / 2 + 5);
        ctx.restore();
      }
      return;
    }

    // 2. Khi đang khạc lửa (isBreathingFire): Luồng lửa khổng lồ quét qua 2 hàng
    if (boss.isBreathingFire) {
      const startX = boss.x - 40;
      const endX = CONFIG.GRID_OFFSET_X;
      const startRow = Math.min(...rows);
      const startY = CONFIG.GRID_OFFSET_Y + startRow * CONFIG.CELL_HEIGHT;
      const breathHeight = CONFIG.CELL_HEIGHT * 2;

      ctx.save();
      const gradFire = ctx.createLinearGradient(startX, 0, endX, 0);
      gradFire.addColorStop(0, 'rgba(255, 238, 88, 0.94)');
      gradFire.addColorStop(0.3, 'rgba(255, 109, 0, 0.88)');
      gradFire.addColorStop(0.7, 'rgba(255, 61, 0, 0.82)');
      gradFire.addColorStop(1, 'rgba(191, 54, 12, 0.65)');

      ctx.fillStyle = gradFire;
      ctx.beginPath();
      ctx.moveTo(startX, boss.y - 10);
      for (let x = startX; x >= endX; x -= 40) {
        const wave = Math.sin(time * 8 + x * 0.05) * 14;
        ctx.lineTo(x, startY + wave);
      }
      ctx.lineTo(endX, startY + breathHeight);
      for (let x = endX; x <= startX; x += 40) {
        const wave = Math.cos(time * 8 + x * 0.05) * 14;
        ctx.lineTo(x, startY + breathHeight + wave);
      }
      ctx.closePath();
      ctx.fill();

      // Lõi lửa vàng trắng cực nóng ở giữa
      ctx.fillStyle = 'rgba(255, 255, 255, 0.86)';
      ctx.beginPath();
      ctx.moveTo(startX, boss.y - 5);
      ctx.lineTo(endX, startY + breathHeight * 0.35 + Math.sin(time * 10) * 8);
      ctx.lineTo(endX, startY + breathHeight * 0.65 + Math.cos(time * 10) * 8);
      ctx.closePath();
      ctx.fill();

      // Tia tàn lửa nóng bay dọc luồng (thay cho khói xám đục)
      ctx.strokeStyle = 'rgba(255, 213, 79, 0.82)';
      ctx.lineWidth = 2.4;
      ctx.lineCap = 'round';
      for (let k = 0; k < 8; k++) {
        const emberX = startX - ((k * 75 + time * 180) % (startX - endX));
        const emberY = startY + 12 + ((k * 23) % (breathHeight - 24));
        ctx.beginPath();
        ctx.moveTo(emberX, emberY);
        ctx.lineTo(emberX - 16, emberY + ((k % 2 === 0) ? -3 : 3));
        ctx.stroke();
      }

      ctx.restore();
    }
  }

  drawZombotDarkDragon(ctx, zombie) {
    const time = performance.now() * 0.003;
    const x = zombie.x;
    const y = zombie.y;
    const bob = Math.sin(zombie.bobbingAnim || 0) * 6;

    ctx.save();
    ctx.translate(x, y + bob);

    // 1. Cánh máy cơ khí khổng lồ phía sau (Mechanical Dragon Wings)
    const wingAngle = Math.sin(time * 4) * 0.25;
    ctx.save();
    ctx.translate(30, -30);
    ctx.rotate(wingAngle);
    // Khung kim loại cánh
    ctx.fillStyle = '#263238';
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(55, -60);
    ctx.lineTo(95, -50);
    ctx.lineTo(125, -20);
    ctx.lineTo(90, 10);
    ctx.lineTo(40, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Màng cánh da rách hắc ám
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.moveTo(10, -10);
    ctx.quadraticCurveTo(55, -45, 95, -40);
    ctx.quadraticCurveTo(75, -10, 85, 5);
    ctx.quadraticCurveTo(45, 10, 10, -10);
    ctx.fill();
    ctx.restore();

    // 2. Thân mình bọc thép rồng máy (Armored Body)
    ctx.fillStyle = '#1e272c';
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(35, 10, 45, 60, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Đinh tán & khớp nối thép trên thân
    ctx.fillStyle = '#78909c';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(20 + i * 10, -25 + i * 18, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ống khói động cơ phía sau nhả khói
    ctx.fillStyle = '#263238';
    ctx.fillRect(55, -45, 18, 25);
    ctx.fillStyle = 'rgba(66, 66, 66, 0.5)';
    ctx.beginPath();
    ctx.arc(64 + Math.sin(time * 3) * 5, -55, 12, 0, Math.PI * 2);
    ctx.fill();

    // 3. Cổ rồng nhiều đốt kim loại uốn lượn vươn về phía trước
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.moveTo(20, -20);
    ctx.quadraticCurveTo(-15, -40, -45, -35);
    ctx.lineTo(-45, 10);
    ctx.quadraticCurveTo(-10, 15, 25, 25);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Đốt vảy gai nhọn trên sống cổ
    ctx.fillStyle = '#cfd8dc';
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(-10 - k * 14, -38 + k * 4);
      ctx.lineTo(-14 - k * 14, -54 + k * 4);
      ctx.lineTo(-5 - k * 14, -36 + k * 4);
      ctx.fill();
    }

    // 4. Đầu rồng máy bọc thép hắc ám (Dragon Head)
    ctx.save();
    ctx.translate(-45, -25);

    // Sừng rồng kim loại sắc nhọn cong vút
    ctx.fillStyle = '#90a4ae';
    ctx.beginPath();
    ctx.moveTo(10, -15);
    ctx.quadraticCurveTo(35, -45, 55, -55);
    ctx.quadraticCurveTo(30, -35, 5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hộp sọ đầu bọc thép
    ctx.fillStyle = '#1c2429';
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(15, -15);
    ctx.lineTo(-45, -5);
    ctx.lineTo(-65, 15);
    ctx.lineTo(-20, 30);
    ctx.lineTo(20, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hàm dưới kim loại (răng nanh cưa sắt)
    ctx.fillStyle = '#263238';
    const jawDrop = (zombie.isBreathingFire || zombie.isRoaring || zombie.isPreparingFireball) ? 14 : 0;
    ctx.beginPath();
    ctx.moveTo(-20, 25 + jawDrop);
    ctx.lineTo(-55, 20 + jawDrop);
    ctx.lineTo(-65, 32 + jawDrop);
    ctx.lineTo(-15, 36 + jawDrop);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Răng cưa nhọn kim loại
    ctx.fillStyle = '#eceff1';
    for (let r = 0; r < 5; r++) {
      ctx.beginPath();
      ctx.moveTo(-58 + r * 8, 14);
      ctx.lineTo(-54 + r * 8, 22);
      ctx.lineTo(-50 + r * 8, 14);
      ctx.fill();
    }

    // Lửa trong vòm họng khi gầm hoặc chuẩn bị lửa
    if (zombie.isBreathingFire || zombie.isPreparingFireball || zombie.isWindupBreath) {
      ctx.fillStyle = '#ff3d00';
      ctx.beginPath();
      ctx.arc(-45, 20, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd600';
      ctx.beginPath();
      ctx.arc(-47, 20, 9, 0, Math.PI * 2);
      ctx.fill();
    }

    // Mắt rồng máy đỏ rực phát quang
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.ellipse(-25, -2, 7, 5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(-26, -3, 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 5. Hiệu ứng bị ngắt chiêu & Choáng 3s bởi Plant Food
    if (zombie.stunTimer > 0) {
      ctx.fillStyle = '#ffd600';
      ctx.font = 'bold 22px sans-serif';
      const starRot = time * 8;
      for (let s = 0; s < 3; s++) {
        const sa = starRot + (s * Math.PI * 2) / 3;
        const sx = Math.cos(sa) * 35 - 30;
        const sy = Math.sin(sa) * 15 - 70;
        ctx.fillText('💫', sx, sy);
      }
    }

    ctx.restore();
  }

  drawAncientDragonBoss(ctx, zombie) {
    const time = performance.now() * 0.003;
    const x = zombie.x;
    const y = zombie.y;
    const bob = Math.sin(zombie.bobbingAnim || 0) * 6;
    const rageRatio = 1 - Math.max(0, Math.min(1, zombie.hp / Math.max(1, zombie.maxHp)));

    ctx.save();
    ctx.translate(x, y + bob);

    // 0. Hào quang hoàng kim / huyết long phía sau Boss Rồng Ngàn Tuổi
    const auraRadius = 92 + Math.sin(time * 3.5) * 6 + rageRatio * 10;
    const auraGrad = ctx.createRadialGradient(12, 0, 18, 12, 0, auraRadius);
    auraGrad.addColorStop(0, rageRatio > 0.6 ? 'rgba(255, 61, 0, 0.35)' : 'rgba(255, 213, 79, 0.28)');
    auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(12, 0, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // 1. Đôi cánh Cổ Long khổng lồ viền vàng rực (Ancient Elder Dragon Wings)
    const wingAngle = Math.sin(time * 4.2) * 0.24;
    ctx.save();
    ctx.translate(28, -32);
    ctx.rotate(wingAngle);
    ctx.fillStyle = '#5c0011';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(62, -74);
    ctx.lineTo(108, -62);
    ctx.lineTo(136, -24);
    ctx.lineTo(98, 12);
    ctx.lineTo(44, 24);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#b71c1c';
    ctx.beginPath();
    ctx.moveTo(12, -12);
    ctx.quadraticCurveTo(60, -56, 102, -46);
    ctx.quadraticCurveTo(80, -10, 92, 6);
    ctx.quadraticCurveTo(48, 12, 12, -12);
    ctx.fill();
    ctx.restore();

    // 2. Thân rồng giáp vảy đỏ sẫm - vàng hoàng kim
    ctx.fillStyle = '#4a000d';
    ctx.strokeStyle = '#ffca28';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(34, 12, 48, 64, 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Vảy bụng vàng cổ đại phát sáng
    ctx.fillStyle = '#ff8f00';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.ellipse(14 + i * 5, -24 + i * 20, 18 - i, 8, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Đuôi rồng cổ đại uốn lượn với gai vàng
    ctx.strokeStyle = '#7f0000';
    ctx.lineWidth = 15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(72, 42);
    ctx.quadraticCurveTo(118, 22 + Math.sin(time * 5) * 14, 134, 60);
    ctx.stroke();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(128, 52);
    ctx.lineTo(148, 66);
    ctx.lineTo(122, 68);
    ctx.stroke();

    // 3. Cổ & Đầu Cổ Long Ngàn Tuổi vương giả
    ctx.strokeStyle = '#6a0014';
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(16, -24);
    ctx.quadraticCurveTo(-8, -42, -26, -24);
    ctx.stroke();

    ctx.save();
    ctx.translate(-32, -26);
    ctx.rotate(Math.sin(time * 2.5) * 0.08);

    // Sừng vương miện ngàn tuổi dài uốn cong
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.moveTo(10, -18);
    ctx.lineTo(36, -54);
    ctx.lineTo(22, -16);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.moveTo(-4, -20);
    ctx.lineTo(14, -46);
    ctx.lineTo(6, -16);
    ctx.closePath();
    ctx.fill();

    // Bờm rồng trắng bạc tượng trưng cho ngàn năm tuổi
    ctx.fillStyle = '#eceff1';
    ctx.beginPath();
    ctx.moveTo(14, -14);
    ctx.lineTo(32, -22);
    ctx.lineTo(26, -2);
    ctx.lineTo(34, 10);
    ctx.lineTo(16, 12);
    ctx.closePath();
    ctx.fill();

    // Hàm trên
    ctx.fillStyle = '#880e4f';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(14, -20);
    ctx.lineTo(-54, -10);
    ctx.lineTo(-60, 6);
    ctx.lineTo(10, 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Râu rồng cổ đại
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-48, 2);
    ctx.quadraticCurveTo(-72, 12 + Math.sin(time * 7) * 6, -80, 26);
    ctx.stroke();

    // Hàm dưới
    ctx.fillStyle = '#4a000d';
    ctx.beginPath();
    ctx.moveTo(6, 10);
    ctx.lineTo(-48, 12);
    ctx.lineTo(-44, 24);
    ctx.lineTo(12, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Mắt vàng/đỏ rực uy nghiêm
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.ellipse(-24, -4, 7.5, 5, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.arc(-25, -4, 2.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // 4. Vòng khiên toàn sát thương (Skill 3: Gargantuar hy sinh -> +500 khiên cộng dồn)
    if (zombie.bossAllShieldHp > 0) {
      const shieldPulse = 0.65 + Math.sin(time * 6) * 0.2;
      ctx.save();
      ctx.strokeStyle = `rgba(255, 215, 64, ${shieldPulse})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.ellipse(4, 2, 74, 86, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 215, 64, 0.12)';
      ctx.fill();

      // Nhãn lượng khiên còn lại phía trên Boss
      ctx.fillStyle = 'rgba(24, 16, 8, 0.85)';
      ctx.beginPath();
      ctx.roundRect(-48, -104, 104, 22, 7);
      ctx.fill();
      ctx.strokeStyle = '#ffd740';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffe57f';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`🛡️ ${Math.ceil(zombie.bossAllShieldHp)}`, 4, -93);
      ctx.restore();
    }

    // 5. Hiệu ứng sấm sét / mưa rồng tích tụ quanh thân
    if (zombie.ancientBossRagePhase) {
      ctx.fillStyle = '#ff5252';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡ CUỒNG NỘ LONG TỘC ⚡', 4, -118);
    }

    ctx.restore();
  }

  // Vẽ Vùng Lão Hóa 2×2 của Thần Khuyển (Map 13)
  drawWitherZones(ctx, zones) {
    const t = this.getFrameTimeSec() * 4;
    for (const z of zones) {
      if (!z || z.remaining <= 0) continue;
      const topY = CONFIG.GRID_OFFSET_Y + z.minRow * CONFIG.CELL_HEIGHT + 4;
      const botY = CONFIG.GRID_OFFSET_Y + (z.maxRow + 1) * CONFIG.CELL_HEIGHT - 4;
      const w = z.endX - z.startX;
      const h = botY - topY;
      const alpha = Math.min(1, z.remaining / 0.8);

      ctx.save();
      ctx.fillStyle = `rgba(106, 27, 154, ${0.2 * alpha})`;
      ctx.fillRect(z.startX, topY, w, h);

      ctx.strokeStyle = `rgba(224, 64, 251, ${0.8 * alpha})`;
      ctx.lineWidth = 2.0;
      ctx.setLineDash([7, 5]);
      ctx.strokeRect(z.startX + 2, topY + 2, w - 4, h - 4);
      ctx.setLineDash([]);

      // Vòng cổ ngữ lão hóa xoay ở tâm vùng 2x2
      const cx = (z.startX + z.endX) * 0.5;
      const cy = (topY + botY) * 0.5;
      ctx.translate(cx, cy);
      ctx.rotate(t);
      ctx.strokeStyle = `rgba(255, 213, 79, ${0.65 * alpha})`;
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, 0, 24, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  // =========================================================================
  // MAP 13: BOSS AZIR HOÀNG ĐẾ SA MẠC (Người Đầu Đại Bàng Màu Vàng + Giáp Hoàng Kim)
  // =========================================================================
  drawAzirDesertEmperor(ctx, zombie) {
    const time = performance.now() * 0.003;
    const bob = Math.sin(zombie.bobbingAnim || time * 2) * 5;
    const x = zombie.x;
    const y = zombie.y + bob;
    const isCasting = zombie.castAnimTimer > 0;

    ctx.save();
    ctx.translate(x, y);

    // 0. Đĩa Mặt Trời Hoàng Kim Shurima tỏa sáng sau lưng Boss Azir
    const haloRadius = 86 + Math.sin(time * 3) * 5;
    const sunHalo = ctx.createRadialGradient(8, -16, 14, 8, -16, haloRadius);
    sunHalo.addColorStop(0, 'rgba(255, 235, 59, 0.42)');
    sunHalo.addColorStop(0.55, 'rgba(255, 160, 0, 0.22)');
    sunHalo.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = sunHalo;
    ctx.beginPath();
    ctx.arc(8, -16, haloRadius, 0, Math.PI * 2);
    ctx.fill();

    // Vòng đĩa mặt trời kim loại quay sau lưng
    ctx.save();
    ctx.translate(10, -18);
    ctx.rotate(time * 0.4);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, 56, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      ctx.fillStyle = '#ffca28';
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * 56, Math.sin(a) * 56);
      ctx.lineTo(Math.cos(a - 0.14) * 68, Math.sin(a - 0.14) * 68);
      ctx.lineTo(Math.cos(a + 0.14) * 68, Math.sin(a + 0.14) * 68);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    // 1. Áo choàng hoàng đế đỏ thẫm viền vàng bay phấp phới
    ctx.fillStyle = '#880e1f';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(8, -28);
    ctx.quadraticCurveTo(56, -8 + Math.sin(time * 4) * 8, 66, 62);
    ctx.lineTo(-10, 68);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. Thân giáp hoàng kim uy nghi (Dáng người chiến binh Ai Cập cổ đại)
    const armorGrad = ctx.createLinearGradient(-22, -32, 26, 48);
    armorGrad.addColorStop(0, '#fff59d');
    armorGrad.addColorStop(0.45, '#ffca28');
    armorGrad.addColorStop(1, '#c67c00');
    ctx.fillStyle = armorGrad;
    ctx.strokeStyle = '#5d3a00';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-22, -26, 46, 66, 12);
    ctx.fill();
    ctx.stroke();

    // Đệm vai đại bàng vàng nhọn hai bên
    ctx.fillStyle = '#ffb300';
    ctx.strokeStyle = '#fff59d';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-22, -22);
    ctx.lineTo(-42, -36);
    ctx.lineTo(-26, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(22, -22);
    ctx.lineTo(44, -36);
    ctx.lineTo(28, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Viên ngọc lam lapis lazuli giữa ngực giáp vàng
    ctx.fillStyle = '#00e5ff';
    ctx.strokeStyle = '#fff9c4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-2, -14);
    ctx.lineTo(6, -6);
    ctx.lineTo(-2, 4);
    ctx.lineTo(-10, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Khố hoàng gia & chân giáp vàng
    ctx.fillStyle = '#b71c1c';
    ctx.fillRect(-16, 32, 34, 24);
    ctx.fillStyle = '#ffd54f';
    ctx.fillRect(-14, 46, 11, 24);
    ctx.fillRect(6, 46, 11, 24);

    // 3. Quyền Trượng Mặt Trời Shurima (giơ cao khi cast skill)
    ctx.save();
    ctx.translate(-30, isCasting ? -16 : 2);
    ctx.rotate(isCasting ? -0.45 : -0.15);
    ctx.strokeStyle = '#ffca28';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(0, 48);
    ctx.lineTo(0, -48);
    ctx.stroke();

    // Đầu trượng hình chim ưng & đĩa mặt trời
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.arc(0, -54, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(0, -54, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. ĐẦU ĐẠI BÀNG MÀU VÀNG (Signature Golden Eagle Head)
    ctx.save();
    ctx.translate(-2, -46);

    // Mào vương miện pharaon kẻ xanh lam - vàng ròng
    ctx.fillStyle = '#ffca28';
    ctx.strokeStyle = '#6d4c00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -16);
    ctx.lineTo(10, -34);
    ctx.lineTo(28, -14);
    ctx.lineTo(22, 16);
    ctx.lineTo(6, 12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Sọc xanh ngọc trên khăn trùm pharaon
    ctx.strokeStyle = '#00acc1';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(8, -24); ctx.lineTo(22, -8);
    ctx.moveTo(10, -14); ctx.lineTo(22, 4);
    ctx.stroke();

    // Hộp sọ & lông đại bàng màu vàng rực
    ctx.fillStyle = '#ffd54f';
    ctx.strokeStyle = '#7f4f00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-2, -4, 17, 15, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mỏ đại bàng vàng cong sắc lẹm hướng sang trái
    ctx.fillStyle = '#ffb300';
    ctx.strokeStyle = '#4e342e';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-14, -10);
    ctx.quadraticCurveTo(-34, -8, -36, 4);
    ctx.lineTo(-27, 10);
    ctx.lineTo(-22, 2);
    ctx.lineTo(-14, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Đôi mắt đại bàng phát sáng xanh lam / vàng kim sắc bén
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.ellipse(-11, -7, 4.5, 3, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-12, -7, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  // Lính Cát Trỗi Dậy (Sand Soldier - 200 DMG đánh 1 cây rồi biến mất)
  drawSandSoldier(ctx, zombie) {
    const time = performance.now() * 0.005;
    const emerge = zombie.emergeTimer > 0 ? (1 - zombie.emergeTimer / 0.35) : 1;
    const x = zombie.x;
    const y = zombie.y + (1 - emerge) * 26;

    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1, Math.max(0.25, emerge));

    // Vòng cát xoáy dưới chân
    ctx.fillStyle = 'rgba(255, 213, 79, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 20, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân chiến binh cát vàng ròng
    const sandGrad = ctx.createLinearGradient(-12, -24, 12, 24);
    sandGrad.addColorStop(0, '#ffe082');
    sandGrad.addColorStop(0.5, '#ffb300');
    sandGrad.addColorStop(1, '#8d5524');
    ctx.fillStyle = sandGrad;
    ctx.strokeStyle = '#5d3a00';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-10, -12, 20, 32, 6);
    ctx.fill();
    ctx.stroke();

    // Mũ chiến binh Ai Cập nhọn
    ctx.fillStyle = '#ffca28';
    ctx.beginPath();
    ctx.arc(0, -20, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ff6f00';
    ctx.beginPath();
    ctx.moveTo(-4, -28);
    ctx.lineTo(0, -38);
    ctx.lineTo(4, -28);
    ctx.closePath();
    ctx.fill();

    // Mắt phát sáng vàng rực
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.arc(-4, -20, 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Giáo cát dài sắc nhọn hướng sang trái
    ctx.strokeStyle = '#ffe082';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(12, 6);
    ctx.lineTo(-26 + Math.sin(time * 4) * 2, -6);
    ctx.stroke();
    ctx.fillStyle = '#fff9c4';
    ctx.beginPath();
    ctx.moveTo(-26, -6);
    ctx.lineTo(-18, -10);
    ctx.lineTo(-19, -2);
    ctx.closePath();
    ctx.fill();

    // Khiên cát tròn bên cạnh
    ctx.fillStyle = '#d4a373';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(-9, 2, 7, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -16, -42, 32, 4, zombie.hp / zombie.maxHp, '#ffd54f');
    }
    ctx.restore();
  }

  // Quan Tài Sa Mạc (Sand Coffin - 800 HP, đứng im như mộ, vỡ thả 1 Basic Zombie)
  drawSandCoffin(ctx, zombie) {
    const x = zombie.x;
    const y = zombie.y;
    const hpRatio = Math.max(0, zombie.hp / Math.max(1, zombie.maxHp));

    ctx.save();
    ctx.translate(x, y);

    // Bóng cát dưới chân quan tài
    ctx.fillStyle = 'rgba(62, 39, 35, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Thân quan tài pharaon hình lục giác đứng
    const coffinGrad = ctx.createLinearGradient(-16, -34, 16, 26);
    coffinGrad.addColorStop(0, '#ffd54f');
    coffinGrad.addColorStop(0.5, '#b8860b');
    coffinGrad.addColorStop(1, '#5d4037');
    ctx.fillStyle = coffinGrad;
    ctx.strokeStyle = '#ffe082';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(0, -36);
    ctx.lineTo(16, -22);
    ctx.lineTo(13, 24);
    ctx.lineTo(-13, 24);
    ctx.lineTo(-16, -22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Hoa văn xanh ngọc Ai Cập trên nắp quan tài
    ctx.fillStyle = '#00838f';
    ctx.fillRect(-10, -14, 20, 6);
    ctx.fillRect(-8, 2, 16, 5);

    // Biểu tượng mắt Horus / hộp sọ vàng
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.arc(0, -23, 5.5, 0, Math.PI * 2);
    ctx.fill();

    // Vết nứt khi quan tài chịu sát thương
    if (hpRatio < 0.7) {
      ctx.strokeStyle = '#212121';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-8, -18); ctx.lineTo(2, -6); ctx.lineTo(-5, 8);
      ctx.stroke();
    }
    if (hpRatio < 0.35) {
      ctx.strokeStyle = '#ff6d00';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(9, -10); ctx.lineTo(-2, 4); ctx.lineTo(7, 18);
      ctx.stroke();
    }

    this.drawHealthBar(ctx, -20, -46, 40, 5, hpRatio, '#ffca28');
    ctx.restore();
  }

  // Mini-Boss 1: Thần Cá Sấu (2100 HP · 100/s · Lướt 2 cây 1000 · Hóa Khổng Lồ giữa sân)
  drawRenektonCroc(ctx, zombie) {
    const time = performance.now() * 0.005;
    const bob = Math.sin(time * 3.5) * 3;
    const isGiant = !!zombie.isGiantForm;
    const isCharging = !!zombie.isChargingSweep;

    ctx.save();
    ctx.translate(zombie.x, zombie.y + bob);

    // Hào quang cuồng nộ đỏ cam khi hóa khổng lồ
    if (isGiant) {
      const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, 44);
      aura.addColorStop(0, 'rgba(255, 61, 0, 0.38)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bóng đổ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đuôi cá sấu có gai lưng phía sau
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.moveTo(10, 12);
    ctx.quadraticCurveTo(32, 18 + Math.sin(time * 5) * 5, 42, 10);
    ctx.lineTo(14, 22);
    ctx.closePath();
    ctx.fill();

    // Thân cá sấu chiến binh bọc giáp vàng đồng
    ctx.fillStyle = '#2e7d32';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(2, 4, 17, 22, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Đệm giáp ngực vàng
    ctx.fillStyle = isGiant ? '#ff8f00' : '#d4a373';
    ctx.beginPath();
    ctx.roundRect(-10, -10, 20, 20, 5);
    ctx.fill();

    // Đầu cá sấu mõm dài răng nhọn
    ctx.fillStyle = '#1b5e20';
    ctx.strokeStyle = '#ffca28';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.roundRect(-30, -22, 28, 15, 6);
    ctx.fill();
    ctx.stroke();

    // Răng nanh trắng nhọn
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-27 + i * 5, -7);
      ctx.lineTo(-25 + i * 5, -2);
      ctx.lineTo(-23 + i * 5, -7);
      ctx.fill();
    }

    // Mắt đỏ rực hung hãn
    ctx.fillStyle = isGiant ? '#ff1744' : '#ffeb3b';
    ctx.beginPath();
    ctx.arc(-14, -17, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Đại đao bán nguyệt khổng lồ trên tay
    ctx.save();
    ctx.translate(-12, 2);
    ctx.rotate(isCharging ? -0.9 : Math.sin(time * 4) * 0.25);
    ctx.strokeStyle = isCharging ? '#ff3d00' : '#ffd54f';
    ctx.fillStyle = isCharging ? '#ff6e40' : '#b0bec5';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.arc(-10, -8, 19, Math.PI * 0.3, Math.PI * 1.65);
    ctx.arc(-5, -8, 13, Math.PI * 1.65, Math.PI * 0.3, true);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Thanh tụ lực 3s cho Skill 2 Quét Đao 3x3
    if (isCharging) {
      const chargeRatio = Math.max(0, Math.min(1, 1 - (zombie.sweepChargeTimer || 0) / 3.0));
      this.drawHealthBar(ctx, -24, -44, 48, 5, chargeRatio, '#ff6d00');
      ctx.fillStyle = '#ffe082';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚔️ TỤ LỰC QUÉT 3×3', 0, -50);
    }

    const hpRatio = Math.max(0, zombie.hp / Math.max(1, zombie.maxHp));
    this.drawHealthBar(ctx, -22, -36, 44, 5, hpRatio, isGiant ? '#ff3d00' : '#69f0ae');
    ctx.restore();
  }

  // Mini-Boss 2: Thần Khuyển (2500 HP · Lão Hóa 2x2 · <60% HP Hóa Lớn Hủy Diệt Cây + Hồi 160)
  drawNasusHound(ctx, zombie) {
    const time = performance.now() * 0.004;
    const bob = Math.sin(time * 3) * 2.5;
    const isGiant = !!zombie.isGiantForm;

    ctx.save();
    ctx.translate(zombie.x, zombie.y + bob);

    if (isGiant) {
      const aura = ctx.createRadialGradient(0, 0, 8, 0, 0, 44);
      aura.addColorStop(0, 'rgba(224, 64, 251, 0.38)');
      aura.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bóng đổ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 22, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Áo choàng & giáp tím hoàng kim (Anubis Guardian)
    ctx.fillStyle = '#4a148c';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(-14, -14, 28, 38, 8);
    ctx.fill();
    ctx.stroke();

    // Đai cổ vàng Ai Cập
    ctx.fillStyle = '#ffca28';
    ctx.beginPath();
    ctx.ellipse(0, -12, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đầu chó rừng Anubis đen tuyền viền vàng + đôi tai nhọn dựng đứng
    ctx.fillStyle = '#1f162b';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.8;
    // Tai trái & phải dựng cao
    ctx.beginPath();
    ctx.moveTo(-6, -24); ctx.lineTo(-2, -44); ctx.lineTo(4, -24);
    ctx.moveTo(4, -24); ctx.lineTo(11, -43); ctx.lineTo(13, -22);
    ctx.fill();
    ctx.stroke();

    // Hộp sọ & mõm chó Anubis
    ctx.beginPath();
    ctx.ellipse(0, -21, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.roundRect(-22, -23, 16, 8, 3);
    ctx.fill();
    ctx.stroke();

    // Mắt tím/vàng rực rỡ
    ctx.fillStyle = isGiant ? '#e040fb' : '#ffd54f';
    ctx.beginPath();
    ctx.arc(-8, -23, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Đại Rìu Trượng Tích Quyền Năng (Siphoning Strike Halberd)
    ctx.save();
    ctx.translate(-14, 2);
    ctx.rotate(Math.sin(time * 3.5) * 0.15);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, 26);
    ctx.lineTo(-4, -30);
    ctx.stroke();

    // Lưỡi rìu tím phát sáng
    ctx.fillStyle = isGiant ? '#e040fb' : '#9c27b0';
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-4, -28);
    ctx.quadraticCurveTo(-24, -24, -18, -8);
    ctx.lineTo(-3, -12);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    const hpRatio = Math.max(0, zombie.hp / Math.max(1, zombie.maxHp));
    this.drawHealthBar(ctx, -22, -52, 44, 5, hpRatio, isGiant ? '#e040fb' : '#ab47bc');
    ctx.restore();
  }

  drawImpDragon(ctx, zombie) {
    const time = performance.now() * 0.004;
    const walkBob = Math.sin(time * 6) * 3;
    const x = zombie.x;
    const y = zombie.y + walkBob;

    ctx.save();
    ctx.translate(x, y);

    // 1. Cánh rồng con nhỏ xíu vỗ phành phạch
    const wingFlap = Math.sin(time * 10) * 0.3;
    ctx.save();
    ctx.translate(8, -12);
    ctx.rotate(wingFlap);
    ctx.fillStyle = '#4a148c';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(16, -18);
    ctx.lineTo(24, -10);
    ctx.lineTo(16, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // 2. Thân thể có vảy bò sát màu tím hắc ám
    ctx.fillStyle = '#311b92';
    ctx.beginPath();
    ctx.ellipse(0, 4, 12, 16, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Bụng vảy vàng cam chống lửa
    ctx.fillStyle = '#ff8f00';
    ctx.beginPath();
    ctx.ellipse(-3, 6, 6, 11, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Đuôi rồng nhỏ ngoe nguẩy
    ctx.strokeStyle = '#311b92';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(6, 12);
    ctx.quadraticCurveTo(16, 18 + Math.sin(time * 8) * 4, 22, 14);
    ctx.stroke();

    // 3. Đầu đội mũ rồng sừng nhỏ
    ctx.fillStyle = '#4a148c';
    ctx.beginPath();
    ctx.ellipse(-2, -12, 13, 11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Sừng rồng cam nhọn
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath();
    ctx.moveTo(2, -18);
    ctx.lineTo(8, -27);
    ctx.lineTo(12, -17);
    ctx.closePath();
    ctx.fill();

    // Mắt Imp tinh nghịch rực lửa
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(-7, -13, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d50000';
    ctx.beginPath();
    ctx.arc(-8, -13, 2, 0, Math.PI * 2);
    ctx.fill();

    // Miệng ngậm lửa nhỏ
    ctx.fillStyle = '#ff3d00';
    ctx.beginPath();
    ctx.arc(-11, -8, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Thanh máu nếu bị thương
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -14, -28, 28, 4, zombie.hp / zombie.maxHp, '#ff1744');
    }

    ctx.restore();
  }

  // Anivia Phượng Hoàng Băng (Dạng 1, Trứng Băng Giá, và Dạng 2 tiến hóa)
  drawAnivia(ctx, zombie) {
    const time = (zombie.animTime || 0) * 3.0;
    const isEgg = zombie.aniviaPhase === 'egg';
    const isPhase2 = zombie.aniviaPhase === 'phase2';

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - (zombie.deathTimer || 0) * 1.8);
    }

    if (isEgg) {
      // Bóng đổ trên mặt đất cho Trứng Băng Giá
      ctx.fillStyle = 'rgba(0, 35, 65, 0.42)';
      ctx.beginPath();
      ctx.ellipse(0, 24, 24, 7.5, 0, 0, Math.PI * 2);
      ctx.fill();

      const eggPulse = 0.5 + 0.5 * Math.sin(time * 2.8);
      const eggWobble = Math.sin(time * 4.5) * 0.04;
      const eggDuration = zombie.eggDuration || 5.0;
      const hatchProgress = Math.max(0, Math.min(1, 1 - (zombie.eggTimer || 0) / eggDuration));

      ctx.save();
      ctx.rotate(eggWobble * (0.4 + hatchProgress));

      // Hào quang tái sinh xung quanh trứng
      const auraGrad = ctx.createRadialGradient(0, -4, 6, 0, -4, 34 + hatchProgress * 8);
      auraGrad.addColorStop(0, `rgba(179, 229, 252, ${0.35 + eggPulse * 0.25})`);
      auraGrad.addColorStop(0.6, `rgba(79, 195, 247, ${0.18 + hatchProgress * 0.2})`);
      auraGrad.addColorStop(1, 'rgba(79, 195, 247, 0)');
      ctx.fillStyle = auraGrad;
      ctx.beginPath();
      ctx.arc(0, -4, 36 + hatchProgress * 8, 0, Math.PI * 2);
      ctx.fill();

      // Đế gai băng nâng đỡ trứng
      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.moveTo(-18, 22); ctx.lineTo(-14, 10); ctx.lineTo(-7, 17);
      ctx.lineTo(0, 8); ctx.lineTo(7, 17); ctx.lineTo(14, 10); ctx.lineTo(18, 22);
      ctx.closePath();
      ctx.fill();

      // Thân Trứng Băng Giá pha lê
      const eggGrad = ctx.createLinearGradient(-16, -28, 16, 20);
      eggGrad.addColorStop(0, '#f0fbff');
      eggGrad.addColorStop(0.35, '#b3e5fc');
      eggGrad.addColorStop(0.75, '#4fc3f7');
      eggGrad.addColorStop(1, '#0288d1');
      ctx.fillStyle = eggGrad;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.bezierCurveTo(15, -24, 19, -2, 16, 12);
      ctx.bezierCurveTo(13, 21, -13, 21, -16, 12);
      ctx.bezierCurveTo(-19, -2, -15, -24, 0, -28);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#e1f5fe';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Mặt cắt tinh thể & lõi phát sáng bên trong trứng
      ctx.fillStyle = `rgba(255, 255, 255, ${0.35 + eggPulse * 0.3})`;
      ctx.beginPath();
      ctx.moveTo(0, -24); ctx.lineTo(8, -8); ctx.lineTo(0, 8); ctx.lineTo(-8, -8);
      ctx.closePath();
      ctx.fill();

      const hpRatio = Math.max(0, zombie.hp / zombie.maxHp);
      if (hpRatio < 0.7 || hatchProgress > 0.6) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(-7, -14); ctx.lineTo(-1, -4); ctx.lineTo(-6, 5);
        ctx.moveTo(8, -10); ctx.lineTo(3, 1);
        ctx.stroke();
      }
      if (hpRatio < 0.35 || hatchProgress > 0.85) {
        ctx.strokeStyle = '#e0f7fa';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(0, -22); ctx.lineTo(5, -9); ctx.lineTo(-3, 4); ctx.lineTo(4, 14);
        ctx.stroke();
      }

      ctx.restore();

      // Thanh đếm ngược hồi sinh 5s & thanh HP trứng
      const remaining = Math.max(0, zombie.eggTimer || 0);
      this.drawHealthBar(ctx, -20, -40, 40, 5, hpRatio, '#4fc3f7');
      ctx.fillStyle = 'rgba(1, 30, 56, 0.82)';
      ctx.beginPath();
      ctx.roundRect(-22, -56, 44, 13, 4);
      ctx.fill();
      ctx.strokeStyle = '#81d4fa';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = '#e1f5fe';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`🥚 ${remaining.toFixed(1)}s`, 0, -46.5);

      this.drawZombieStatus(ctx, zombie, 0, -68, -60);
      ctx.restore();
      return;
    }

    // Dạng 1 & Dạng 2 (Bay lơ lửng trên mặt đất)
    const hoverY = -18 + Math.sin(time * 2.0) * 4.5;
    const flap = Math.sin(time * (zombie.isAttacking ? 4.4 : 2.8));
    const scale = isPhase2 ? 1.28 : 1.0;

    // Bóng đổ trên mặt đất tách biệt để thể hiện độ cao khi bay
    ctx.fillStyle = isPhase2 ? 'rgba(0, 45, 85, 0.42)' : 'rgba(0, 30, 60, 0.32)';
    ctx.beginPath();
    ctx.ellipse(0, 26, (isPhase2 ? 27 : 21) - flap * 2.5, isPhase2 ? 8 : 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, hoverY);
    ctx.scale(scale, scale);

    // Hào quang băng giá phía sau (Dạng 2 rực rỡ hơn)
    if (isPhase2) {
      const haloGrad = ctx.createRadialGradient(0, -8, 6, 0, -8, 42);
      haloGrad.addColorStop(0, 'rgba(225, 245, 254, 0.55)');
      haloGrad.addColorStop(0.55, 'rgba(79, 195, 247, 0.28)');
      haloGrad.addColorStop(1, 'rgba(79, 195, 247, 0)');
      ctx.fillStyle = haloGrad;
      ctx.beginPath();
      ctx.arc(0, -8, 42, 0, Math.PI * 2);
      ctx.fill();

      // Vòng tinh thể hào quang xoay chậm
      ctx.save();
      ctx.translate(2, -10);
      ctx.rotate(time * 0.45);
      ctx.strokeStyle = 'rgba(179, 229, 252, 0.72)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.arc(0, 0, 28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Đuôi lông vũ băng dài thướt tha phía sau (bên phải vì quay mặt sang trái)
    const tailWave = Math.sin(time * 2.4) * 4;
    ctx.fillStyle = isPhase2 ? 'rgba(129, 212, 250, 0.9)' : 'rgba(179, 229, 252, 0.85)';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.quadraticCurveTo(26, 4 + tailWave, 40, -3 + tailWave * 1.4);
    ctx.quadraticCurveTo(28, 12 + tailWave, 10, 8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isPhase2 ? '#e1f5fe' : '#81d4fa';
    ctx.beginPath();
    ctx.moveTo(9, 4);
    ctx.quadraticCurveTo(25, 14 - tailWave, 36, 18 + tailWave);
    ctx.quadraticCurveTo(22, 18, 7, 9);
    ctx.closePath();
    ctx.fill();

    if (isPhase2) {
      // Dải đuôi pha lê thứ 3 rực rỡ cho Dạng 2
      ctx.fillStyle = 'rgba(224, 247, 250, 0.92)';
      ctx.beginPath();
      ctx.moveTo(10, -2);
      ctx.quadraticCurveTo(30, -10 - tailWave, 44, -14 + tailWave);
      ctx.quadraticCurveTo(30, -1, 11, 3);
      ctx.closePath();
      ctx.fill();
    }

    // Cánh sau (cánh phải)
    ctx.save();
    ctx.translate(6, -6);
    ctx.rotate(-0.35 + flap * 0.42);
    const backWingGrad = ctx.createLinearGradient(0, 0, 24, -26);
    backWingGrad.addColorStop(0, '#4fc3f7');
    backWingGrad.addColorStop(0.6, '#b3e5fc');
    backWingGrad.addColorStop(1, '#ffffff');
    ctx.fillStyle = backWingGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(14, -24);
    ctx.lineTo(24, -16);
    ctx.lineTo(19, -8);
    ctx.lineTo(28, -4);
    ctx.lineTo(12, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e1f5fe';
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();

    // Thân Phượng Hoàng Băng xanh nhạt
    const bodyGrad = ctx.createLinearGradient(-10, -22, 12, 14);
    bodyGrad.addColorStop(0, '#f1fbff');
    bodyGrad.addColorStop(0.45, '#b3e5fc');
    bodyGrad.addColorStop(1, '#29b6f6');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(2, -2, 11, 14, 0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#e1f5fe';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Giáp ngực tinh thể băng
    ctx.fillStyle = isPhase2 ? '#ffffff' : '#e1f5fe';
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-1, -14);
    ctx.lineTo(4, -5);
    ctx.lineTo(-2, 7);
    ctx.closePath();
    ctx.fill();

    // Đầu và mào pha lê băng (quay sang trái)
    ctx.save();
    ctx.translate(-8, -16);

    // Mào băng sau đầu
    ctx.fillStyle = isPhase2 ? '#80deea' : '#4fc3f7';
    ctx.beginPath();
    ctx.moveTo(-1, -6);
    ctx.lineTo(12, -16);
    ctx.lineTo(8, -6);
    ctx.lineTo(16, -9);
    ctx.lineTo(6, -1);
    ctx.closePath();
    ctx.fill();

    if (isPhase2) {
      // Vương miện băng 3 chấu thanh thoát cho Dạng 2
      ctx.fillStyle = '#e1f5fe';
      ctx.beginPath();
      ctx.moveTo(-4, -7); ctx.lineTo(-7, -19); ctx.lineTo(-1, -10);
      ctx.lineTo(2, -22); ctx.lineTo(4, -10); ctx.lineTo(10, -18); ctx.lineTo(6, -6);
      ctx.closePath();
      ctx.fill();
    }

    // Đầu tròn thanh tú
    const headGrad = ctx.createLinearGradient(-8, -8, 8, 8);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.55, '#b3e5fc');
    headGrad.addColorStop(1, '#4fc3f7');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
    ctx.fill();

    // Mỏ băng nhọn sắc sảo
    ctx.fillStyle = isPhase2 ? '#e0f7fa' : '#81d4fa';
    ctx.beginPath();
    ctx.moveTo(-7, -2);
    ctx.lineTo(-17, 2);
    ctx.lineTo(-7, 4.5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0288d1';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Mắt băng giá phát sáng sắc nét (không shadowBlur)
    ctx.fillStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.beginPath();
    ctx.ellipse(-3.2, -1.2, isPhase2 ? 4.8 : 3.8, isPhase2 ? 3.5 : 2.8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = isPhase2 ? '#ffffff' : '#00e5ff';
    ctx.beginPath();
    ctx.ellipse(-3.2, -1.2, 2.6, 1.8, -0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Cánh trước (cánh chính nhiều tầng lông băng)
    ctx.save();
    ctx.translate(1, -5);
    ctx.rotate(0.2 + flap * 0.52);
    const frontWingGrad = ctx.createLinearGradient(-6, -24, 18, 12);
    frontWingGrad.addColorStop(0, '#ffffff');
    frontWingGrad.addColorStop(0.45, '#b3e5fc');
    frontWingGrad.addColorStop(0.85, '#4fc3f7');
    frontWingGrad.addColorStop(1, '#0288d1');
    ctx.fillStyle = frontWingGrad;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-6, -24);
    ctx.lineTo(5, -18);
    ctx.lineTo(10, -29);
    ctx.lineTo(17, -14);
    ctx.lineTo(25, -19);
    ctx.lineTo(19, -2);
    ctx.lineTo(10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#e1f5fe';
    ctx.lineWidth = 1.4;
    ctx.stroke();
    ctx.restore();

    // Vuốt băng nhỏ phía dưới thân
    ctx.strokeStyle = '#81d4fa';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-2, 10); ctx.lineTo(-6, 16);
    ctx.moveTo(3, 10); ctx.lineTo(0, 16);
    ctx.stroke();

    // Các mảnh tinh thể tuyết quay quanh (nhiều và sáng hơn ở Dạng 2)
    const sparkleCount = isPhase2 ? 4 : 2;
    for (let i = 0; i < sparkleCount; i++) {
      const ang = time * 1.6 + (i * Math.PI * 2) / sparkleCount;
      const sx = Math.cos(ang) * (isPhase2 ? 27 : 21);
      const sy = Math.sin(ang) * (isPhase2 ? 15 : 11) - 6;
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#80deea';
      ctx.beginPath();
      ctx.moveTo(sx, sy - 3.5);
      ctx.lineTo(sx + 2.5, sy);
      ctx.lineTo(sx, sy + 3.5);
      ctx.lineTo(sx - 2.5, sy);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();

    // Thanh máu & trạng thái ở trên đỉnh Phượng Hoàng
    const barY = hoverY - (isPhase2 ? 46 : 38);
    if (zombie.hp < zombie.maxHp || isPhase2) {
      const barWidth = isPhase2 ? 46 : 38;
      this.drawHealthBar(
        ctx,
        -barWidth / 2,
        barY,
        barWidth,
        isPhase2 ? 5.5 : 4.5,
        Math.max(0, zombie.hp / zombie.maxHp),
        isPhase2 ? '#00e5ff' : '#4fc3f7'
      );
    }

    this.drawZombieStatus(ctx, zombie, hoverY, isPhase2 ? -58 : -50, isPhase2 ? -48 : -40);
    ctx.restore();
  }

  // Khối Băng do Anivia Dạng 2 tạo ra khi hạ cây (đặc tính như mộ, HP = 1/2 cây gốc)
  drawAniviaIceBlock(ctx, zombie) {
    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - (zombie.deathTimer || 0) * 2.0);
    }

    // Bóng đổ trên mặt đất
    ctx.fillStyle = 'rgba(0, 35, 65, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 25, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const hpRatio = Math.max(0, zombie.hp / Math.max(1, zombie.maxHp));
    const iceGrad = ctx.createLinearGradient(-20, -28, 20, 24);
    iceGrad.addColorStop(0, 'rgba(240, 251, 255, 0.96)');
    iceGrad.addColorStop(0.35, 'rgba(179, 229, 252, 0.9)');
    iceGrad.addColorStop(0.75, 'rgba(79, 195, 247, 0.88)');
    iceGrad.addColorStop(1, 'rgba(2, 136, 209, 0.92)');

    // Khối băng đa giác nhọn như bia mộ pha lê
    ctx.fillStyle = iceGrad;
    ctx.beginPath();
    ctx.moveTo(-20, 22);
    ctx.lineTo(-22, -6);
    ctx.lineTo(-12, -24);
    ctx.lineTo(0, -30);
    ctx.lineTo(13, -22);
    ctx.lineTo(22, -4);
    ctx.lineTo(20, 22);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#e1f5fe';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Bóng mầm cây bị đóng băng lờ mờ bên trong
    ctx.fillStyle = 'rgba(0, 131, 143, 0.42)';
    ctx.beginPath();
    ctx.ellipse(-5, -2, 7, 4, -0.4, 0, Math.PI * 2);
    ctx.ellipse(5, -4, 7, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(-2, -2, 4, 14);

    // Mặt cắt ánh sáng pha lê
    ctx.fillStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.beginPath();
    ctx.moveTo(-12, -22);
    ctx.lineTo(0, -28);
    ctx.lineTo(3, 18);
    ctx.lineTo(-14, 18);
    ctx.closePath();
    ctx.fill();

    // Vệt nứt khi mất máu
    if (hpRatio < 0.75) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-11, -16); ctx.lineTo(-3, -4); ctx.lineTo(-9, 8);
      ctx.stroke();
    }
    if (hpRatio < 0.4) {
      ctx.strokeStyle = '#e0f7fa';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(10, -14); ctx.lineTo(2, 0); ctx.lineTo(9, 14);
      ctx.stroke();
    }

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -38, 36, 4.5, hpRatio, '#4fc3f7');
    }

    ctx.restore();
  }

  // Đạn Cột Băng Nhỏ Sắc Nhọn của Anivia
  drawAniviaIceSpikes(ctx, spikes) {
    for (const spike of spikes) {
      if (!spike.alive) continue;
      const dx = (spike.targetX !== undefined ? spike.targetX : spike.x - 1) - spike.x;
      const dy = (spike.targetY !== undefined ? spike.targetY : spike.y) - spike.y;
      const angle = (dx === 0 && dy === 0) ? Math.PI : Math.atan2(dy, dx);

      ctx.save();
      ctx.translate(spike.x, spike.y);
      ctx.rotate(angle);

      // Vệt băng mờ phía sau
      const trailLen = spike.isPhase2 ? 24 : 18;
      const trailGrad = ctx.createLinearGradient(-trailLen, 0, 0, 0);
      trailGrad.addColorStop(0, 'rgba(179, 229, 252, 0)');
      trailGrad.addColorStop(1, 'rgba(129, 212, 250, 0.72)');
      ctx.fillStyle = trailGrad;
      ctx.beginPath();
      ctx.moveTo(-trailLen, 0);
      ctx.lineTo(0, -4);
      ctx.lineTo(0, 4);
      ctx.closePath();
      ctx.fill();

      // Cột băng nhọn sắc bén
      const len = spike.isPhase2 ? 17 : 13;
      const halfW = spike.isPhase2 ? 5.2 : 4.0;
      const crystalGrad = ctx.createLinearGradient(-len * 0.5, -halfW, len, halfW);
      crystalGrad.addColorStop(0, '#29b6f6');
      crystalGrad.addColorStop(0.55, '#b3e5fc');
      crystalGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = crystalGrad;
      ctx.beginPath();
      ctx.moveTo(len, 0);
      ctx.lineTo(-2, -halfW);
      ctx.lineTo(-len * 0.55, 0);
      ctx.lineTo(-2, halfW);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = '#e1f5fe';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      ctx.restore();
    }
  }

  // Zombie Bóng Bay (Balloon Zombie - Bay nhỏ)
  drawBalloonZombie(ctx, zombie) {
    const time = (zombie.animTime || 0) * 3.0;
    const hoverY = -16 + Math.sin(time * 2.2) * 4.5;

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - (zombie.deathTimer || 0) * 2.0);
    }

    // Bóng đổ trên mặt đất tách biệt khi đang bay
    ctx.fillStyle = 'rgba(0, 0, 0, 0.34)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 17, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, hoverY);

    // Dây bóng bay nối từ tay lên quả bóng đỏ lớn
    const sway = Math.sin(time * 2.4) * 3;
    ctx.strokeStyle = '#eceff1';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.quadraticCurveTo(-2 + sway * 0.5, -18, sway, -31);
    ctx.stroke();

    // Quả bóng bay đỏ bóng bẩy
    const balGrad = ctx.createRadialGradient(sway - 4, -44, 2, sway, -41, 15);
    balGrad.addColorStop(0, '#ff8a80');
    balGrad.addColorStop(0.5, '#f44336');
    balGrad.addColorStop(1, '#b71c1c');
    ctx.fillStyle = balGrad;
    ctx.beginPath();
    ctx.ellipse(sway, -41, 13, 15.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Đuôi thắt nút bóng bay
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.moveTo(sway - 2.5, -26);
    ctx.lineTo(sway + 2.5, -26);
    ctx.lineTo(sway, -29);
    ctx.closePath();
    ctx.fill();

    // Ánh sáng bóng
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.ellipse(sway - 4.5, -47, 3.2, 5.2, -0.35, 0, Math.PI * 2);
    ctx.fill();

    // Thân Zombie mặc áo vest sẫm lơ lửng
    ctx.fillStyle = '#4e342e';
    ctx.beginPath();
    ctx.roundRect(-9, -6, 18, 22, 4);
    ctx.fill();

    // Chân đung đưa trên không
    const legSwing = Math.sin(time * 2.5) * 4;
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 15); ctx.lineTo(-6 + legSwing, 26);
    ctx.moveTo(4, 15); ctx.lineTo(6 - legSwing, 26);
    ctx.stroke();

    // Đầu Zombie xanh nhợt
    ctx.fillStyle = '#8bc34a';
    ctx.strokeStyle = '#33691e';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-1, -14, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mắt
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.arc(-4.5, -15, 2.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(-5, -15, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Tay giơ cầm dây bóng bay
    ctx.strokeStyle = '#8bc34a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-5, -2);
    ctx.lineTo(-9, -8);
    ctx.stroke();

    ctx.restore();

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -16, hoverY - 62, 32, 4.5, Math.max(0, zombie.hp / zombie.maxHp), '#ff5252');
    }
    this.drawZombieStatus(ctx, zombie, hoverY, -74, -64);
    ctx.restore();
  }

  // Zombie Jetpack (Bay nhỏ + Tăng x1.5 tốc độ ở nửa sân)
  drawJetpackZombie(ctx, zombie) {
    const time = (zombie.animTime || 0) * 3.0;
    const isBoost = !!zombie.jetpackBoosted;
    const hoverY = -15 + Math.sin(time * (isBoost ? 3.8 : 2.2)) * 3.5;

    ctx.save();
    ctx.translate(zombie.x, zombie.y);

    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - (zombie.deathTimer || 0) * 2.0);
    }

    // Bóng đổ trên mặt đất
    ctx.fillStyle = 'rgba(0, 0, 0, 0.36)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 20, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, hoverY);
    if (isBoost) {
      ctx.rotate(-0.18); // Nghiêng lao về phía trước khi tăng tốc x1.5
    }

    // Lửa phản lực từ Jetpack sau lưng (to và rực hơn khi boost)
    const flameLen = (isBoost ? 22 : 12) + Math.sin(time * 9) * 3.5;
    const flameGrad = ctx.createLinearGradient(12, 8, 12 + flameLen, 20);
    flameGrad.addColorStop(0, '#ffffff');
    flameGrad.addColorStop(0.35, isBoost ? '#00e5ff' : '#ffd54f');
    flameGrad.addColorStop(0.75, isBoost ? '#ff3d00' : '#ff6d00');
    flameGrad.addColorStop(1, 'rgba(255, 61, 0, 0)');
    ctx.fillStyle = flameGrad;
    ctx.beginPath();
    ctx.moveTo(8, 6);
    ctx.lineTo(14 + flameLen, 14);
    ctx.lineTo(6, 15);
    ctx.closePath();
    ctx.fill();

    // Bình động cơ Jetpack kim loại đeo sau lưng
    ctx.fillStyle = '#546e7a';
    ctx.strokeStyle = '#cfd8dc';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(4, -10, 11, 20, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isBoost ? '#ff3d00' : '#ffab00';
    ctx.fillRect(6, -5, 7, 4);

    // Thân Zombie bộ đồ phi hành gia tối màu
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.roundRect(-9, -8, 17, 23, 4);
    ctx.fill();
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Chân bay
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, 14); ctx.lineTo(-1, 24);
    ctx.moveTo(3, 14); ctx.lineTo(7, 23);
    ctx.stroke();

    // Đầu Zombie + Mũ kính phi công
    ctx.fillStyle = '#9ccc65';
    ctx.beginPath();
    ctx.arc(-2, -16, 9.5, 0, Math.PI * 2);
    ctx.fill();

    // Kính bảo hộ cam/cyan phát sáng
    ctx.fillStyle = isBoost ? '#ff5252' : '#00e5ff';
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-11, -20, 10, 6, 2.5);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, hoverY - 36, 36, 4.5, Math.max(0, zombie.hp / zombie.maxHp), isBoost ? '#ff6d00' : '#ff1744');
    }
    this.drawZombieStatus(ctx, zombie, hoverY, -48, -38);
    ctx.restore();
  }

  // Thresh Zombie (Cai ngục u ám xanh lá cầm xích sắt + lồng đèn)
  drawThreshZombie(ctx, zombie) {
    const time = (zombie.animTime || 0) * 3.0;
    const walkY = zombie.isHooking ? 0 : Math.abs(Math.sin(zombie.walkCycle || 0)) * -2.5;

    ctx.save();
    // Vẽ sợi xích sắt nối trực tiếp tới cây đang bị trói (nếu có)
    if (zombie.alive && !zombie.isHypnotized && zombie.hookedPlant && zombie.hookedPlant.alive) {
      const target = zombie.hookedPlant;
      const startX = zombie.x - 16;
      const startY = zombie.y - 8 + walkY;
      const endX = target.x;
      const endY = target.y - 4;

      ctx.save();
      // Hào quang xích linh hồn xanh ngọc u ám
      ctx.strokeStyle = 'rgba(0, 230, 118, 0.35)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      // Mắt xích sắt nối liền
      ctx.strokeStyle = '#37474f';
      ctx.lineWidth = 3.5;
      ctx.setLineDash([7, 4]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();

      ctx.strokeStyle = '#69f0ae';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 7]);
      ctx.beginPath();
      ctx.moveTo(startX, startY);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Móc lưỡi hái ghim vào cây
      ctx.fillStyle = '#b0bec5';
      ctx.strokeStyle = '#00e676';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(endX, endY, 6, Math.PI * 0.4, Math.PI * 1.6);
      ctx.stroke();
      ctx.restore();
    }

    ctx.translate(zombie.x, zombie.y + walkY);
    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - (zombie.deathTimer || 0) * 2.0);
    }

    // Bóng đổ u ám trên mặt đất
    ctx.fillStyle = 'rgba(4, 24, 18, 0.52)';
    ctx.beginPath();
    ctx.ellipse(0, 24 - walkY, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hào quang hồn ma xanh lá u ám xung quanh áo choàng
    const aura = ctx.createRadialGradient(0, -4, 4, 0, -4, 34);
    aura.addColorStop(0, 'rgba(0, 230, 118, 0.25)');
    aura.addColorStop(1, 'rgba(0, 77, 64, 0)');
    ctx.fillStyle = aura;
    ctx.beginPath();
    ctx.arc(0, -4, 34, 0, Math.PI * 2);
    ctx.fill();

    // Áo choàng cai ngục dài xẻ tà xanh lá thẫm u ám
    const coatGrad = ctx.createLinearGradient(-15, -18, 16, 24);
    coatGrad.addColorStop(0, '#1b4332');
    coatGrad.addColorStop(0.5, '#0f2f24');
    coatGrad.addColorStop(1, '#081c15');
    ctx.fillStyle = coatGrad;
    ctx.beginPath();
    ctx.moveTo(-12, -16);
    ctx.lineTo(12, -16);
    ctx.lineTo(17, 21);
    ctx.lineTo(7, 17);
    ctx.lineTo(0, 23);
    ctx.lineTo(-8, 17);
    ctx.lineTo(-16, 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#26a69a';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Giáp vai gai sắt
    ctx.fillStyle = '#263238';
    ctx.strokeStyle = '#4db6ac';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-15, -18, 30, 9, 4);
    ctx.fill();
    ctx.stroke();

    // Dây xích sắt quấn quanh người
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 2.4;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(-11, -8); ctx.lineTo(11, 6);
    ctx.moveTo(11, -8); ctx.lineTo(-11, 6);
    ctx.stroke();
    ctx.setLineDash([]);

    // Đầu lâu sừng ma màu xanh ngọc u ám
    ctx.fillStyle = '#0d2b22';
    ctx.strokeStyle = '#69f0ae';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(-1, -24, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 2 sừng cai ngục cong
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.moveTo(-7, -30); ctx.lineTo(-14, -40); ctx.lineTo(-3, -33);
    ctx.moveTo(5, -30); ctx.lineTo(12, -40); ctx.lineTo(2, -33);
    ctx.closePath();
    ctx.fill();

    // Mắt linh hồn xanh phát sáng rợn người (không shadowBlur)
    ctx.fillStyle = 'rgba(0, 230, 118, 0.36)';
    ctx.beginPath();
    ctx.arc(-5, -24, 4.2, 0, Math.PI * 2);
    ctx.arc(2, -24, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#b9f6ca';
    ctx.beginPath();
    ctx.arc(-5, -24, 2.2, 0, Math.PI * 2);
    ctx.arc(2, -24, 1.9, 0, Math.PI * 2);
    ctx.fill();

    // Đèn lồng thu hồn bên tay phải
    const lanternSwing = Math.sin(time * 2.2) * 2;
    ctx.fillStyle = '#263238';
    ctx.fillRect(11 + lanternSwing, -4, 8, 12);
    ctx.fillStyle = '#00e676';
    ctx.fillRect(12.5 + lanternSwing, -1.5, 5, 7);

    // Lưỡi hái xích sắt cầm ở tay trái (khi chưa quăng ra)
    if (!zombie.hookedPlant) {
      ctx.strokeStyle = '#b0bec5';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(-19, -6, 7, Math.PI * 0.25, Math.PI * 1.45);
      ctx.stroke();
    }

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -46, 36, 4.5, Math.max(0, zombie.hp / zombie.maxHp), '#00e676');
    }
    this.drawZombieStatus(ctx, zombie, 0, -58, -50);
    ctx.restore();
  }

  drawQuanChuaZombie(ctx, zombie) {
    const time = (zombie.walkCycle || 0) + (zombie.animTime || 0);
    const channeling = !!zombie.isChanneling;
    const walkY = channeling ? 0 : Math.abs(Math.sin((zombie.walkCycle || 0) * 1.4)) * 2.5;

    ctx.save();
    ctx.translate(zombie.x, zombie.y + walkY);
    if (!zombie.alive) {
      ctx.globalAlpha = Math.max(0, 1 - (zombie.deathTimer || 0) * 2.0);
    }

    // Bóng đổ / Vòng tròn triệu hồi dưới chân khi đang niệm phép 3s
    if (channeling) {
      const pulse = 1 + Math.sin(this.getFrameTimeSec() * 12) * 0.08;
      ctx.save();
      ctx.scale(1, 0.42);
      ctx.strokeStyle = '#ea80fc';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.arc(0, (24 - walkY) / 0.42, 30 * pulse, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = 'rgba(170, 0, 255, 0.24)';
      ctx.beginPath();
      ctx.arc(0, (24 - walkY) / 0.42, 28 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(30, 8, 45, 0.45)';
      ctx.beginPath();
      ctx.ellipse(0, 24 - walkY, 21, 7, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Áo choàng hoàng gia tím thẫm + viền vàng
    ctx.fillStyle = '#311b4b';
    ctx.beginPath();
    ctx.moveTo(-10, -16);
    ctx.lineTo(14, -14);
    ctx.lineTo(20, 21);
    ctx.lineTo(-16, 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Váy dạ hội quý tộc đỏ tía
    const dressGrad = ctx.createLinearGradient(-12, -14, 12, 22);
    dressGrad.addColorStop(0, '#6a1b9a');
    dressGrad.addColorStop(0.6, '#4a148c');
    dressGrad.addColorStop(1, '#260e3a');
    ctx.fillStyle = dressGrad;
    ctx.beginPath();
    ctx.moveTo(-8, -14);
    ctx.lineTo(8, -14);
    ctx.lineTo(15, 22);
    ctx.lineTo(-14, 22);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ce93d8';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Cổ áo cao quý tộc
    ctx.fillStyle = '#880e4f';
    ctx.beginPath();
    ctx.moveTo(-11, -15);
    ctx.lineTo(-15, -24);
    ctx.lineTo(-4, -17);
    ctx.moveTo(11, -15);
    ctx.lineTo(15, -24);
    ctx.lineTo(4, -17);
    ctx.closePath();
    ctx.fill();

    // Đầu zombie quý tộc tái tím
    ctx.fillStyle = '#8e9c78';
    ctx.strokeStyle = '#4a148c';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, -23, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mái tóc tím đậm
    ctx.fillStyle = '#4a148c';
    ctx.beginPath();
    ctx.arc(2, -25, 9.5, -Math.PI * 0.85, Math.PI * 0.35);
    ctx.fill();

    // Đôi mắt phát sáng ma mị (không shadowBlur)
    ctx.fillStyle = 'rgba(224, 64, 251, 0.36)';
    ctx.beginPath();
    ctx.arc(-4.5, -23, 3.8, 0, Math.PI * 2);
    ctx.arc(1.5, -23, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3e5f5';
    ctx.beginPath();
    ctx.arc(-4.5, -23, 1.9, 0, Math.PI * 2);
    ctx.arc(1.5, -23, 1.7, 0, Math.PI * 2);
    ctx.fill();

    // Vương miện Quận Chúa vàng ròng
    ctx.fillStyle = '#ffd54f';
    ctx.strokeStyle = '#ff8f00';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(-8, -31);
    ctx.lineTo(-7, -38);
    ctx.lineTo(-3, -34);
    ctx.lineTo(0, -40);
    ctx.lineTo(3, -34);
    ctx.lineTo(7, -38);
    ctx.lineTo(8, -31);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ngọc ruby trên vương miện
    ctx.fillStyle = '#e040fb';
    ctx.beginPath();
    ctx.arc(0, -34.5, 1.7, 0, Math.PI * 2);
    ctx.fill();

    // Quyền trượng linh hồn bên tay trái
    const castRaise = channeling ? -7 : ((zombie.castAnimTimer || 0) > 0 ? -4 : 0);
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-14, 16);
    ctx.lineTo(-16, -15 + castRaise);
    ctx.stroke();

    ctx.fillStyle = channeling ? 'rgba(224, 64, 251, 0.42)' : 'rgba(224, 64, 251, 0.28)';
    ctx.beginPath();
    ctx.arc(-16, -17 + castRaise, channeling ? 9.5 : 7.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = channeling ? '#ffffff' : '#ea80fc';
    ctx.beginPath();
    ctx.arc(-16, -17 + castRaise, channeling ? 5.2 : 4.0, 0, Math.PI * 2);
    ctx.fill();

    // Quỹ đạo linh hồn đang thu thập (tối đa 8 đốm bay quanh)
    const soulCount = zombie.soulCount || 0;
    if (soulCount > 0) {
      const orbitN = Math.min(8, soulCount);
      for (let i = 0; i < orbitN; i++) {
        const ang = (this.getFrameTimeSec() * 4) + (i * Math.PI * 2 / orbitN);
        const ox = Math.cos(ang) * 20;
        const oy = -10 + Math.sin(ang) * 9;
        ctx.fillStyle = '#ea80fc';
        ctx.beginPath();
        ctx.arc(ox, oy, 2.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Thanh máu & thanh niệm phép 3s
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -48, 36, 4.5, Math.max(0, zombie.hp / zombie.maxHp), '#ce93d8');
    }
    if (channeling) {
      const dur = zombie.channelDuration || 3.0;
      const prog = Math.max(0, Math.min(1, 1 - (zombie.channelTimer || 0) / dur));
      this.drawHealthBar(ctx, -18, -55, 36, 4.5, prog, '#ffd54f');
    }

    // Huy hiệu số linh hồn thu được
    if (soulCount > 0 || (zombie.gargantuarSouls || 0) > 0) {
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#f3e5f5';
      const label = (zombie.gargantuarSouls || 0) > 0
        ? `👻${soulCount} + 🪣${zombie.gargantuarSouls}`
        : `👻${soulCount}`;
      ctx.fillText(label, 0, channeling ? -60 : -53);
    }

    this.drawZombieStatus(ctx, zombie, 0, -68, -55);
    ctx.restore();
  }

  // 1. Rồng Mới Nở (Bay nhỏ, tốc độ cao, khạc lửa tầm gần)
  drawDragonHatchling(ctx, zombie) {
    ctx.save();
    ctx.translate(zombie.x, zombie.y);
    if (!zombie.alive) ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 2);

    const t = this.getFrameTimeSec() * 8;
    const hoverY = -12 + Math.sin(t + zombie.x * 0.03) * 3.5;
    const flap = Math.sin(t * 2.2) * 8;

    // Bóng bay nhỏ dưới sân
    ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 14, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, hoverY);

    // Cánh rồng non phía sau
    ctx.fillStyle = '#ffab40';
    ctx.strokeStyle = '#bf360c';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(4, -4);
    ctx.quadraticCurveTo(18, -22 + flap, 24, -6 + flap * 0.5);
    ctx.quadraticCurveTo(14, 2, 4, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Đuôi lửa nhỏ
    ctx.strokeStyle = '#e65100';
    ctx.lineWidth = 3.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(10, 6);
    ctx.quadraticCurveTo(22, 10, 25, 2);
    ctx.stroke();
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(26, 1, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // Thân rồng cam rực
    const bodyGrad = ctx.createRadialGradient(-3, -2, 2, 0, 0, 14);
    bodyGrad.addColorStop(0, '#ffd180');
    bodyGrad.addColorStop(0.55, '#ff6d00');
    bodyGrad.addColorStop(1, '#bf360c');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(0, 2, 13, 10, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#4e1300';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Đầu rồng & mõm khạc lửa quay trái
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath();
    ctx.ellipse(-11, -7, 9.5, 7.5, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sừng nhỏ vàng
    ctx.fillStyle = '#fff59d';
    ctx.beginPath();
    ctx.moveTo(-7, -13); ctx.lineTo(-3, -21); ctx.lineTo(-1, -13);
    ctx.closePath();
    ctx.fill();

    // Mắt rồng sáng rực
    ctx.fillStyle = '#ffff00';
    ctx.beginPath();
    ctx.arc(-14, -9, 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0000';
    ctx.beginPath();
    ctx.arc(-14.6, -9, 1.0, 0, Math.PI * 2);
    ctx.fill();

    // Đốm lửa ở mõm khi đang tấn công
    if (zombie.isEating) {
      ctx.fillStyle = '#ffeb3b';
      ctx.beginPath();
      ctx.arc(-21, -5, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    if (zombie.flashTimer > 0) this.drawHitFlashOverlay(ctx, 18, 15, -2);
    ctx.restore();

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -15, -36, 30, 4, Math.max(0, zombie.hp / zombie.maxHp), '#ff9100');
    }
    this.drawZombieStatus(ctx, zombie, hoverY * 0.5, -46, -34);
    ctx.restore();
  }

  // 2. Rồng Trưởng Thành (Bay lớn - miễn nhiễm Cỏ Ba Lá, khạc lửa mạnh)
  drawDragonAdult(ctx, zombie) {
    ctx.save();
    ctx.translate(zombie.x, zombie.y);
    if (!zombie.alive) ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 2);

    const t = this.getFrameTimeSec() * 6.5;
    const hoverY = -17 + Math.sin(t + zombie.x * 0.025) * 4.5;
    const flap = Math.sin(t * 1.9) * 11;

    // Bóng đổ lớn dưới cỏ
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 22, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, hoverY);

    // Đôi cánh dơi đỏ sẫm sải rộng
    ctx.fillStyle = '#b71c1c';
    ctx.strokeStyle = '#4a0000';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(4, -6);
    ctx.lineTo(24, -28 + flap);
    ctx.lineTo(34, -8 + flap * 0.6);
    ctx.quadraticCurveTo(20, 4, 5, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Đuôi rồng có gai
    ctx.strokeStyle = '#880e4f';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 7);
    ctx.quadraticCurveTo(28, 13, 33, -2);
    ctx.stroke();
    ctx.fillStyle = '#ff6d00';
    ctx.beginPath();
    ctx.moveTo(31, -2); ctx.lineTo(39, -6); ctx.lineTo(35, 3);
    ctx.closePath();
    ctx.fill();

    // Thân vảy đỏ rực & bụng vàng dung nham
    const bodyGrad = ctx.createLinearGradient(-14, -12, 16, 16);
    bodyGrad.addColorStop(0, '#ff5252');
    bodyGrad.addColorStop(0.55, '#c62828');
    bodyGrad.addColorStop(1, '#5d0000');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.ellipse(2, 3, 18, 13, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#2b0000';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.ellipse(-2, 7, 11, 6, -0.2, 0, Math.PI);
    ctx.fill();

    // Đầu rồng có sừng lớn
    ctx.fillStyle = '#d32f2f';
    ctx.beginPath();
    ctx.ellipse(-15, -8, 12, 9, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffe082';
    ctx.beginPath();
    ctx.moveTo(-10, -16); ctx.lineTo(-2, -28); ctx.lineTo(-4, -15);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-16, -15); ctx.lineTo(-10, -24); ctx.lineTo(-11, -14);
    ctx.closePath();
    ctx.fill();

    // Mắt hổ phách dữ tợn
    ctx.fillStyle = '#ffea00';
    ctx.beginPath();
    ctx.arc(-19, -10, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-19.8, -10, 1.1, 0, Math.PI * 2);
    ctx.fill();

    if (zombie.flashTimer > 0) this.drawHitFlashOverlay(ctx, 24, 18, -2);
    ctx.restore();

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -20, -48, 40, 4.5, Math.max(0, zombie.hp / zombie.maxHp), '#ff5252');
    }
    this.drawZombieStatus(ctx, zombie, hoverY * 0.5, -58, -44);
    ctx.restore();
  }

  // 3. Rồng Hắc Ám (Bay lớn - Ăn thịt rồng thường lấy giáp, đòn đầu tiên lên mỗi cây ×2 sát thương)
  drawDragonDark(ctx, zombie) {
    ctx.save();
    ctx.translate(zombie.x, zombie.y);
    if (!zombie.alive) ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 2);

    const t = this.getFrameTimeSec() * 7;
    const hoverY = -18 + Math.sin(t + zombie.x * 0.03) * 4.2;
    const flap = Math.sin(t * 2.0) * 11;

    // Bóng hắc ám dưới mặt đất
    ctx.fillStyle = 'rgba(26, 0, 48, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 26, 23, 7.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, hoverY);

    // Hào quang bóng tối bao quanh
    ctx.fillStyle = 'rgba(170, 0, 255, 0.22)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 22, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cánh rồng hắc ám viền tím ma mị
    ctx.fillStyle = '#1a0c26';
    ctx.strokeStyle = '#aa00ff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(4, -7);
    ctx.lineTo(25, -30 + flap);
    ctx.lineTo(35, -9 + flap * 0.6);
    ctx.quadraticCurveTo(21, 5, 4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Đuôi gai tím đen
    ctx.strokeStyle = '#2d1245';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 7);
    ctx.quadraticCurveTo(27, 14, 34, -2);
    ctx.stroke();

    // Thân vảy đen tuyền
    const darkGrad = ctx.createRadialGradient(-4, -3, 3, 2, 2, 20);
    darkGrad.addColorStop(0, '#4a148c');
    darkGrad.addColorStop(0.55, '#1e0b36');
    darkGrad.addColorStop(1, '#090312');
    ctx.fillStyle = darkGrad;
    ctx.beginPath();
    ctx.ellipse(1, 3, 18, 13, -0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ea80fc';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Giáp hấp thụ từ rồng thường (vòng khiên tím rực)
    if (zombie.armorHp > 0) {
      ctx.strokeStyle = '#e040fb';
      ctx.lineWidth = 2.6;
      ctx.setLineDash([5, 3]);
      ctx.beginPath();
      ctx.ellipse(0, 1, 23, 17, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Đầu rồng hắc ám & sừng tím
    ctx.fillStyle = '#140826';
    ctx.beginPath();
    ctx.ellipse(-15, -8, 12, 9, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ba68c8';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.fillStyle = '#ce93d8';
    ctx.beginPath();
    ctx.moveTo(-10, -16); ctx.lineTo(-1, -28); ctx.lineTo(-4, -14);
    ctx.closePath();
    ctx.fill();

    // Đôi mắt đỏ tím phát sáng (không shadowBlur)
    ctx.fillStyle = 'rgba(224, 64, 251, 0.42)';
    ctx.beginPath();
    ctx.arc(-19, -10, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f3e5f5';
    ctx.beginPath();
    ctx.arc(-19, -10, 2.2, 0, Math.PI * 2);
    ctx.fill();

    if (zombie.flashTimer > 0) this.drawHitFlashOverlay(ctx, 25, 19, -2);
    ctx.restore();

    const barY = -50;
    if (zombie.armorHp > 0 && zombie.maxArmorHp > 0) {
      this.drawHealthBar(ctx, -20, barY - 6, 40, 4, Math.min(1, zombie.armorHp / zombie.maxArmorHp), '#e040fb');
    }
    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -20, barY, 40, 4.5, Math.max(0, zombie.hp / zombie.maxHp), '#ab47bc');
    }
    this.drawZombieStatus(ctx, zombie, hoverY * 0.5, -62, -48);
    ctx.restore();
  }

  // 4. Rồng Hóa Kỹ (Đi bộ nặng nề - mỗi 200 máu ném bình thuốc Hóa Kỹ 3x3)
  drawDragonChemtech(ctx, zombie) {
    ctx.save();
    ctx.translate(zombie.x, zombie.y);
    if (!zombie.alive) ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 2);

    const stride = zombie.isEating ? 0 : Math.sin(zombie.walkCycle * 1.1);
    const walkY = Math.abs(stride) * -2.2;

    // Bóng nặng trên mặt đất
    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 24, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, walkY);

    // Bình chứa hóa chất phát sáng trên lưng
    ctx.fillStyle = '#1b2e26';
    ctx.strokeStyle = '#76ff03';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(1, -24, 16, 18, 5);
    ctx.fill();
    ctx.stroke();

    const vialsLeft = Math.max(0, (zombie.maxPotions || 5) - (zombie.potionsThrown || 0));
    const fillRatio = vialsLeft / (zombie.maxPotions || 5);
    if (fillRatio > 0) {
      ctx.fillStyle = 'rgba(118, 255, 3, 0.78)';
      const h = 14 * fillRatio;
      ctx.beginPath();
      ctx.roundRect(3, -8 - h, 12, h, 3);
      ctx.fill();
    }

    // Hai chân đi bộ nặng nề
    ctx.fillStyle = '#263238';
    ctx.fillRect(-10 + stride * 4, 10, 7, 13);
    ctx.fillRect(4 - stride * 4, 10, 7, 13);

    // Đuôi cơ khí hóa kỹ
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(15, 6);
    ctx.quadraticCurveTo(28, 12, 34, 2);
    ctx.stroke();
    ctx.fillStyle = '#76ff03';
    ctx.beginPath();
    ctx.arc(34, 2, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Thân giáp thép Hóa Kỹ xanh đen
    const armorGrad = ctx.createLinearGradient(-16, -12, 18, 14);
    armorGrad.addColorStop(0, '#455a64');
    armorGrad.addColorStop(0.55, '#263238');
    armorGrad.addColorStop(1, '#102027');
    ctx.fillStyle = armorGrad;
    ctx.beginPath();
    ctx.ellipse(0, 2, 19, 14, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#76ff03';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Đầu rồng đeo mặt nạ hóa chất
    ctx.fillStyle = '#37474f';
    ctx.beginPath();
    ctx.ellipse(-16, -5, 12, 9.5, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b2ff59';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Kính bảo hộ & mắt phát sáng xanh hóa chất (không shadowBlur)
    ctx.fillStyle = 'rgba(118, 255, 3, 0.42)';
    ctx.beginPath();
    ctx.arc(-20, -7, 5.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ccff90';
    ctx.beginPath();
    ctx.arc(-20, -7, 2.7, 0, Math.PI * 2);
    ctx.fill();

    if (zombie.flashTimer > 0) this.drawHitFlashOverlay(ctx, 25, 18, -2);
    ctx.restore();

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -22, -38, 44, 5, Math.max(0, zombie.hp / zombie.maxHp), '#76ff03');
    }
    // Chấm hiển thị số bình thuốc còn lại (5 bình)
    for (let i = 0; i < (zombie.maxPotions || 5); i++) {
      const pipX = -14 + i * 7;
      const available = i < vialsLeft;
      ctx.fillStyle = available ? '#76ff03' : '#263238';
      ctx.strokeStyle = '#aeea00';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.arc(pipX, -44, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    this.drawZombieStatus(ctx, zombie, walkY, -56, -48);
    ctx.restore();
  }

  // 5. Rồng Gió (Bay nhẹ - nhanh 1s/ô, tăng ×2 tốc chạy 3s cho đồng minh cùng hàng)
  drawDragonWind(ctx, zombie) {
    ctx.save();
    ctx.translate(zombie.x, zombie.y);
    if (!zombie.alive) ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 2);

    const t = this.getFrameTimeSec() * 11;
    const hoverY = -14 + Math.sin(t + zombie.x * 0.04) * 3.8;
    const flap = Math.sin(t * 2.6) * 9.5;

    // Bóng bay nhỏ dưới sân
    ctx.fillStyle = 'rgba(0, 35, 45, 0.35)';
    ctx.beginPath();
    ctx.ellipse(0, 24, 15, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, hoverY);

    // Luồng xoáy gió nhẹ phía sau cánh
    ctx.strokeStyle = 'rgba(128, 222, 234, 0.55)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(10, -2);
    ctx.quadraticCurveTo(28, -10 + Math.sin(t) * 3, 36, -3);
    ctx.moveTo(12, 5);
    ctx.quadraticCurveTo(26, 11 + Math.cos(t) * 3, 34, 6);
    ctx.stroke();

    // Cánh phong linh thanh mảnh
    ctx.fillStyle = 'rgba(128, 222, 234, 0.85)';
    ctx.strokeStyle = '#00838f';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(2, -4);
    ctx.quadraticCurveTo(18, -26 + flap, 28, -10 + flap * 0.55);
    ctx.quadraticCurveTo(15, 2, 2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Đuôi khí lưu sắc bén
    ctx.strokeStyle = '#00acc1';
    ctx.lineWidth = 3.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(11, 5);
    ctx.quadraticCurveTo(24, 8, 30, -1);
    ctx.stroke();
    ctx.fillStyle = '#e0f7fa';
    ctx.beginPath();
    ctx.arc(31, -2, 2.8, 0, Math.PI * 2);
    ctx.fill();

    // Thân rồng ngọc lam thanh thoát
    const windGrad = ctx.createLinearGradient(-13, -8, 14, 10);
    windGrad.addColorStop(0, '#b2ebf2');
    windGrad.addColorStop(0.55, '#26c6da');
    windGrad.addColorStop(1, '#00695c');
    ctx.fillStyle = windGrad;
    ctx.beginPath();
    ctx.ellipse(0, 2, 14, 9.5, -0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#004d40';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // Đầu rồng & mào gió
    ctx.fillStyle = '#4dd0e1';
    ctx.beginPath();
    ctx.ellipse(-12, -6, 9.5, 7, 0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e0f7fa';
    ctx.beginPath();
    ctx.moveTo(-8, -12);
    ctx.lineTo(-1, -21);
    ctx.lineTo(-3, -11);
    ctx.closePath();
    ctx.fill();

    // Mắt rồng gió sáng ngọc (không shadowBlur)
    ctx.fillStyle = 'rgba(0, 229, 255, 0.42)';
    ctx.beginPath();
    ctx.arc(-15, -8, 4.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffff8d';
    ctx.beginPath();
    ctx.arc(-15, -8, 2.1, 0, Math.PI * 2);
    ctx.fill();

    if (zombie.flashTimer > 0) this.drawHitFlashOverlay(ctx, 20, 15, -2);
    ctx.restore();

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -16, -38, 32, 4, Math.max(0, zombie.hp / zombie.maxHp), '#26c6da');
    }
    this.drawZombieStatus(ctx, zombie, hoverY * 0.5, -48, -36);
    ctx.restore();
  }

  // 6. Rồng Nước (Đi bộ - 10 bản thể hồi sinh khác hàng, mỗi mạng cộng +1/2 HP & ATK)
  drawDragonWater(ctx, zombie) {
    ctx.save();
    ctx.translate(zombie.x, zombie.y);
    if (!zombie.alive) ctx.globalAlpha = Math.max(0, 1 - zombie.deathTimer * 2);

    const stride = zombie.isEating ? 0 : Math.sin(zombie.walkCycle * 1.15);
    const walkY = Math.abs(stride) * -2.2;
    const t = this.getFrameTimeSec() * 7;
    const life = zombie.waterLife || 1;
    const maxLives = zombie.maxWaterLives || 10;

    // Gợn sóng dưới chân
    ctx.strokeStyle = 'rgba(41, 182, 246, 0.55)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 23, 18 + Math.sin(t * 2) * 2.5, 6.5, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = 'rgba(1, 30, 60, 0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 23, 16, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(0, walkY);

    // Vây lưng thủy long phát sáng
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.moveTo(-4, -9); ctx.lineTo(0, -21); ctx.lineTo(5, -8);
    ctx.moveTo(4, -7); ctx.lineTo(10, -17); ctx.lineTo(14, -4);
    ctx.closePath();
    ctx.fill();

    // Hai chân bước trên đất
    ctx.fillStyle = '#01579b';
    ctx.fillRect(-9 + stride * 3.5, 9, 6.5, 12);
    ctx.fillRect(3 - stride * 3.5, 9, 6.5, 12);

    // Đuôi thủy cầu
    ctx.strokeStyle = '#0288d1';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(13, 5);
    ctx.quadraticCurveTo(25, 11, 31, 1);
    ctx.stroke();
    ctx.fillStyle = '#80d8ff';
    ctx.beginPath();
    ctx.arc(32, 1, 3.8, 0, Math.PI * 2);
    ctx.fill();

    // Thân rồng nước xanh lam sâu
    const waterGrad = ctx.createLinearGradient(-15, -10, 16, 12);
    waterGrad.addColorStop(0, '#4fc3f7');
    waterGrad.addColorStop(0.55, '#0288d1');
    waterGrad.addColorStop(1, '#01579b');
    ctx.fillStyle = waterGrad;
    ctx.beginPath();
    ctx.ellipse(0, 2, 16.5, 12, -0.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#80d8ff';
    ctx.lineWidth = 1.4;
    ctx.stroke();

    // Đầu rồng & sừng giọt nước
    ctx.fillStyle = '#039be5';
    ctx.beginPath();
    ctx.ellipse(-14, -5, 10.5, 8.2, 0.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b3e5fc';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    ctx.fillStyle = '#80d8ff';
    ctx.beginPath();
    ctx.moveTo(-10, -12);
    ctx.lineTo(-5, -21);
    ctx.lineTo(-3, -11);
    ctx.closePath();
    ctx.fill();

    // Mắt xanh ngọc (không shadowBlur)
    ctx.fillStyle = 'rgba(0, 229, 255, 0.42)';
    ctx.beginPath();
    ctx.arc(-18, -7, 4.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e1f5fe';
    ctx.beginPath();
    ctx.arc(-18, -7, 2.2, 0, Math.PI * 2);
    ctx.fill();

    if (zombie.flashTimer > 0) this.drawHitFlashOverlay(ctx, 22, 17, -2);
    ctx.restore();

    if (zombie.hp < zombie.maxHp) {
      this.drawHealthBar(ctx, -18, -36, 36, 4.5, Math.max(0, zombie.hp / zombie.maxHp), '#29b6f6');
    }

    // Huy hiệu bản thể 💧 x/10 nổi bật trên đầu Rồng Nước
    ctx.save();
    ctx.fillStyle = 'rgba(1, 35, 68, 0.88)';
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.roundRect(-21, -51, 42, 13, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#80d8ff';
    ctx.font = 'bold 9.5px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`💧 ${life}/${maxLives}`, 0, -41.5);
    ctx.restore();

    this.drawZombieStatus(ctx, zombie, walkY, -62, -52);
    ctx.restore();
  }

  drawMagnetShroomGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3.0;
    const breathe = Math.sin(time * 2.5) * 1.2;

    ctx.save();

    // 1. Thân nấm màu kem xám nhạt múp míp chuẩn PvZ 2
    const stalkGrad = ctx.createLinearGradient(-9, 2, 9, 22);
    stalkGrad.addColorStop(0, '#f5f5f5');
    stalkGrad.addColorStop(0.6, '#e0e0e0');
    stalkGrad.addColorStop(1, '#b0bec5');
    ctx.fillStyle = stalkGrad;
    ctx.beginPath();
    ctx.moveTo(-8, 3);
    ctx.quadraticCurveTo(-11, 14, -8, 22);
    ctx.quadraticCurveTo(0, 24, 8, 22);
    ctx.quadraticCurveTo(11, 14, 8, 3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1.6;
    ctx.stroke();

    // Đôi mắt nghiêm nghị & lông mày cau
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-3.8, 12, 3.0, 3.6, 0, 0, Math.PI * 2);
    ctx.ellipse(3.8, 12, 3.0, 3.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1.0;
    ctx.stroke();

    ctx.fillStyle = '#1c2429';
    ctx.beginPath();
    ctx.arc(-3.2, 12, 1.7, 0, Math.PI * 2);
    ctx.arc(4.4, 12, 1.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1.7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-7, 8); ctx.lineTo(-1, 9.5);
    ctx.moveTo(7, 8); ctx.lineTo(1, 9.5);
    ctx.stroke();

    // 2. Mũ nấm hình Nam Châm Móng Ngựa Đỏ - Đầu Bạc (PvZ 2 Classic Magnet-shroom)
    ctx.save();
    ctx.translate(0, -10 + breathe);

    // Thân nam châm hình chữ U lộn ngược (Vòm đỏ rực ở trên, 2 đầu bạc hướng lên hoặc xuống? Nam châm PvZ 2 vòm ở dưới nối cuống, 2 cực bạc chĩa lên trên!)
    // Dùng dáng móng ngựa mở lên trên (chữ U) như Magnet-shroom PvZ 2 rất dễ nhận biết!
    ctx.beginPath();
    ctx.arc(0, 0, 19, 0, Math.PI, false);
    ctx.lineTo(-19, -12);
    ctx.lineTo(-10, -12);
    ctx.arc(0, 0, 10, Math.PI, 0, true);
    ctx.lineTo(19, -12);
    ctx.closePath();

    const magGrad = ctx.createLinearGradient(-19, -12, 19, 19);
    magGrad.addColorStop(0, '#ff5252');
    magGrad.addColorStop(0.55, '#e53935');
    magGrad.addColorStop(1, '#b71c1c');
    ctx.fillStyle = magGrad;
    ctx.fill();
    ctx.strokeStyle = '#7f0000';
    ctx.lineWidth = 2.0;
    ctx.stroke();

    // Hai đầu cực kim loại bạc sáng loáng
    const tipGradLeft = ctx.createLinearGradient(-19, -13, -10, -5);
    tipGradLeft.addColorStop(0, '#ffffff');
    tipGradLeft.addColorStop(0.6, '#cfd8dc');
    tipGradLeft.addColorStop(1, '#78909c');
    ctx.fillStyle = tipGradLeft;
    ctx.fillRect(-19, -12, 9, 8);
    ctx.fillRect(10, -12, 9, 8);

    ctx.strokeStyle = '#37474f';
    ctx.lineWidth = 1.6;
    ctx.strokeRect(-19, -12, 9, 8);
    ctx.strokeRect(10, -12, 9, 8);

    // Sóng từ trường màu xanh Cyan tỏa ra giữa 2 cực nam châm
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(0, -11, 7, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.6)';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.arc(0, -11, 11, Math.PI * 1.18, Math.PI * 1.82);
    ctx.stroke();

    // Nếu đang hút/giữ vật phẩm kim loại (xô sắt / nón hiệp sĩ)
    if (plant.hasItem || plant.attractedArmor || (plant.attractTimer > 0)) {
      ctx.save();
      ctx.translate(0, -18);
      ctx.rotate(-0.12);
      ctx.fillStyle = '#78909c';
      ctx.beginPath();
      ctx.roundRect(-11, -11, 22, 18, 3);
      ctx.fill();
      ctx.strokeStyle = '#263238';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Quai xách xô sắt
      ctx.strokeStyle = '#cfd8dc';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(0, -11, 7, Math.PI, 0);
      ctx.stroke();

      // Tia điện từ trường giật lách tách
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-13, 0); ctx.lineTo(-17, -4);
      ctx.moveTo(13, 0); ctx.lineTo(17, -4);
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
    ctx.restore();
  }

  // =========================================================================
  // ĐỒ HỌA CÁC LOẠI CÂY BĂNG CHUYỀN (CONVEYOR BELT PLANTS)
  // =========================================================================

  // 1. Hạt Dẻ Cao (Tall-nut) — Tường thành 4000 HP chặn đứng mọi bước nhảy sào
  drawTallNutGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 1.5;
    const isWounded = plant.hp < plant.maxHp * 0.65;
    const isCritical = plant.hp < plant.maxHp * 0.35;

    // Vỏ hạt dẻ khổng lồ cao sừng sững
    const nutGrad = ctx.createLinearGradient(-18, -35, 18, 25);
    nutGrad.addColorStop(0, '#6d4c41');
    nutGrad.addColorStop(0.5, '#4e342e');
    nutGrad.addColorStop(1, '#271406');
    ctx.fillStyle = nutGrad;
    ctx.strokeStyle = '#1a0c02';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.roundRect(-18, -35, 36, 62, 16);
    ctx.fill();
    ctx.stroke();

    // Tán lông/chỏm tóc gỗ trên đầu
    ctx.fillStyle = '#3e2723';
    ctx.beginPath();
    ctx.arc(0, -35, 6, 0, Math.PI, true);
    ctx.fill();

    // Đôi mắt kiên định, nghiêm nghị nhìn thẳng
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-7, -12, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(7, -12, 4.5, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Mí mắt trĩu nặng nghiêm nghị
    ctx.fillStyle = '#4e342e';
    ctx.beginPath();
    ctx.roundRect(-12, -18, 10, 5, 2);
    ctx.roundRect(2, -18, 10, 5, 2);
    ctx.fill();

    // Con ngươi đen hướng thẳng về trước
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-5.5, -11, 2.5, 0, Math.PI * 2);
    ctx.arc(8.5, -11, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Vết nứt vỡ khi bị cắn thương tích
    if (isWounded) {
      ctx.strokeStyle = '#1a0c02';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, 5); ctx.lineTo(-4, 12); ctx.lineTo(-12, 18);
      ctx.moveTo(8, -2); ctx.lineTo(14, 6);
      ctx.stroke();
    }
    // Giọt nước mắt cảm động khi sắp vỡ
    if (isCritical) {
      ctx.fillStyle = '#4fc3f7';
      ctx.beginPath();
      ctx.ellipse(-10, -5, 2.5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 2. Bắp Ngô (Kernel-pult) — Phóng bơ và hạt ngô
  drawKernelPultGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3;
    const sway = Math.sin(time) * 1.5;

    // Lá bẹ bắp ngô xòe quanh chân
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(-14, 18, 12, 6, -0.3, 0, Math.PI * 2);
    ctx.ellipse(14, 18, 12, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Bắp ngô vàng óng
    ctx.fillStyle = '#fbc02d';
    ctx.strokeStyle = '#f57f17';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 14, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Râu bắp ngô màu nâu vàng trên đỉnh
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -22); ctx.lineTo(sway - 3, -30);
    ctx.moveTo(2, -22); ctx.lineTo(sway + 4, -28);
    ctx.stroke();

    // Đôi mắt to tròn
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-4, -6, 2.5, 0, Math.PI * 2);
    ctx.arc(6, -6, 2.5, 0, Math.PI * 2);
    ctx.fill();

    // Muỗng bắn nạp sẵn viên bơ vàng béo ngậy
    ctx.save();
    ctx.translate(-12, -8);
    ctx.fillStyle = '#6d4c41';
    ctx.fillRect(-2, -14, 4, 18);
    // Bơ vàng béo ngậy vuông vắn
    ctx.fillStyle = '#fff176';
    ctx.strokeStyle = '#fbc02d';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-6, -20, 12, 10, 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  // 3. Gai Cỏ (Spikeweed) — Chông gai sắc nhọn đâm xuyên chân
  drawSpikeweedGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 4;

    // Nền thảm rễ gai bám mặt đất
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.ellipse(0, 20, 26, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Cụm chông gai nhọn hoắt bằng đá và kim loại
    ctx.fillStyle = '#455a64';
    ctx.strokeStyle = '#263238';
    ctx.lineWidth = 1.5;
    const spikeOffsets = [-20, -12, -4, 4, 12, 20];
    for (let i = 0; i < spikeOffsets.length; i++) {
      const sx = spikeOffsets[i];
      const h = (i % 2 === 0 ? 16 : 22) + Math.sin(time + i) * 1.5;
      ctx.beginPath();
      ctx.moveTo(sx - 4, 22);
      ctx.lineTo(sx, 22 - h);
      ctx.lineTo(sx + 4, 22);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Đầu nhọn kim loại sáng bóng
      ctx.fillStyle = '#cfd8dc';
      ctx.beginPath();
      ctx.moveTo(sx - 2, 22 - h + 6);
      ctx.lineTo(sx, 22 - h);
      ctx.lineTo(sx + 2, 22 - h + 6);
      ctx.fill();
      ctx.fillStyle = '#455a64';
    }

    // Mắt hung tợn ẩn nấp giữa các bụi gai
    ctx.fillStyle = '#e53935';
    ctx.beginPath();
    ctx.arc(-3, 14, 2.5, 0, Math.PI * 2);
    ctx.arc(5, 14, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4. Đậu Bật Nhảy (Spring Bean) — Bật nảy đẩy lùi zombie
  drawSpringBeanGraphics(ctx, plant) {
    const isSleeping = (plant.sleepTimer || 0) > 0;
    const bounceY = isSleeping ? 6 : Math.abs(Math.sin((plant.animTime || 0) * 4)) * 3;

    // Lò xo thép cuộn tròn ở dưới đáy
    ctx.strokeStyle = '#78909c';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(-10, 24);
    ctx.bezierCurveTo(-14, 18, 14, 16, 10, 10);
    ctx.bezierCurveTo(6, 4, -8, 2, -4, -2 + bounceY);
    ctx.stroke();

    // Thân hạt đậu xanh mướt mọng nước
    ctx.save();
    ctx.translate(0, -6 + bounceY);
    ctx.fillStyle = isSleeping ? '#689f38' : '#7cb342';
    ctx.strokeStyle = '#33691e';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 13, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mắt nếu đang ngủ (nhắm nghiền zZz) hoặc đang thức (mở to lanh lợi)
    if (isSleeping) {
      ctx.strokeStyle = '#1b5e20';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-6, -1, 3.5, 0, Math.PI, false);
      ctx.arc(6, -1, 3.5, 0, Math.PI, false);
      ctx.stroke();

      // Chữ zZz bay lên
      ctx.fillStyle = '#b0bec5';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('z', 12, -12);
      ctx.fillText('Z', 16, -18);
    } else {
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(-5, -2, 2.5, 0, Math.PI * 2);
      ctx.arc(5, -2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-6, -3, 1, 0, Math.PI * 2);
      ctx.arc(4, -3, 1, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // 5. Xà Lách Băng (Iceberg Lettuce) — Pha lê tuyết đóng băng
  drawIcebergLettuceGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3;
    const pulse = 1.0 + Math.sin(time) * 0.08;

    ctx.save();
    ctx.scale(pulse, pulse);

    // Hào quang băng giá tỏa sương mù lạnh
    ctx.fillStyle = 'rgba(0, 229, 255, 0.25)';
    ctx.beginPath();
    ctx.arc(0, 2, 22, 0, Math.PI * 2);
    ctx.fill();

    // Các cánh lá bắp cải băng pha lê trong suốt
    const iceGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 18);
    iceGrad.addColorStop(0, '#ffffff');
    iceGrad.addColorStop(0.5, '#b2ebf2');
    iceGrad.addColorStop(1, '#00b0ff');
    ctx.fillStyle = iceGrad;
    ctx.strokeStyle = '#80d8ff';
    ctx.lineWidth = 1.8;

    for (let a = 0; a < Math.PI * 2; a += Math.PI / 3) {
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 9, 13, a, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Đôi mắt băng ngây thơ dễ thương
    ctx.fillStyle = '#01579b';
    ctx.beginPath();
    ctx.ellipse(-4, -1, 2.5, 4, 0, 0, Math.PI * 2);
    ctx.ellipse(4, -1, 2.5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-5, -2, 1.2, 0, Math.PI * 2);
    ctx.arc(3, -2, 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 6. Nấm Khói (Fume-shroom) — Phun luồng khói bào tử tím xuyên thấu
  drawFumeShroomGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3;

    // Chân nấm tím mọng
    ctx.fillStyle = '#4a148c';
    ctx.beginPath();
    ctx.roundRect(-9, 4, 18, 18, 5);
    ctx.fill();

    // Mũ nấm hình phễu loe hướng sang phải
    const capGrad = ctx.createLinearGradient(-14, -18, 18, 0);
    capGrad.addColorStop(0, '#6a1b9a');
    capGrad.addColorStop(0.7, '#ab47bc');
    capGrad.addColorStop(1, '#e1bee7');
    ctx.fillStyle = capGrad;
    ctx.strokeStyle = '#38006b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(2, -6, 17, 14, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Miệng phễu phun khói mở to sang phải
    ctx.fillStyle = '#12005e';
    ctx.beginPath();
    ctx.ellipse(14, -4, 5, 9, 0, 0, Math.PI * 2);
    ctx.fill();

    // Đôi mắt lim dim tím huyền ảo
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-4, -6, 3, 4, -0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-3, -6, 1.8, 0, Math.PI * 2);
    ctx.fill();

    // Bọt khói tím bay lập lờ trước mũi
    ctx.fillStyle = 'rgba(186, 104, 200, 0.6)';
    ctx.beginPath();
    ctx.arc(22 + Math.sin(time) * 3, -4, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // 7. Đậu Laser (Laser Bean) — Đậu vũ trụ bắn tia laser xuyên hàng
  drawLaserBeanGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 4;

    // Thân hạt đậu vũ trụ màu ngọc bích khí động học
    const beanGrad = ctx.createLinearGradient(-12, -18, 12, 18);
    beanGrad.addColorStop(0, '#00e676');
    beanGrad.addColorStop(0.7, '#00b0ff');
    beanGrad.addColorStop(1, '#1a237e');
    ctx.fillStyle = beanGrad;
    ctx.strokeStyle = '#00e5ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 20, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Kính bảo hộ Cybernetic Laser Visor màu xanh neon (sắc nét, không dùng shadowBlur gây drop FPS)
    ctx.fillStyle = '#00e5ff';
    ctx.strokeStyle = '#e0f7fa';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-10, -8, 22, 9, 3);
    ctx.fill();
    ctx.stroke();

    // Vạch quét laser đỏ/trắng chạy qua kính
    const scanX = -6 + ((time * 6) % 14);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(scanX, -7, 3, 7);

    // Cổng dẫn năng lượng sau lưng
    ctx.fillStyle = '#37474f';
    ctx.fillRect(-15, -4, 4, 8);
  }

  // 8. Bí Đè (Squash) — Nhảy đè nát zombie
  drawSquashGraphics(ctx, plant) {
    const jumpProgress = plant.isJumping
      ? Math.max(0, Math.min(1, (plant.jumpTimer || 0) / (plant.jumpDuration || 0.42)))
      : 0;
    const jumpOffset = plant.isSquashing
      ? -Math.sin((plant.squashTimer || 0) * Math.PI) * 28
      : 0;
    const stretchY = plant.isJumping ? (1 + Math.sin(jumpProgress * Math.PI) * 0.24) : 1;
    const stretchX = plant.isJumping ? (1 - Math.sin(jumpProgress * Math.PI) * 0.14) : 1;
    const leanAngle = plant.isJumping ? Math.sin(jumpProgress * Math.PI) * 0.18 : 0;

    ctx.save();
    ctx.translate(0, jumpOffset);
    ctx.rotate(leanAngle);
    ctx.scale(stretchX, stretchY);

    // Thân bí xanh khổng lồ bạnh gân guốc
    const squashGrad = ctx.createLinearGradient(-18, -25, 18, 22);
    squashGrad.addColorStop(0, '#558b2f');
    squashGrad.addColorStop(0.6, '#33691e');
    squashGrad.addColorStop(1, '#1b5e20');
    ctx.fillStyle = squashGrad;
    ctx.strokeStyle = '#0b3200';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, 2, 18, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Cuống bí xoắn trên đầu
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.moveTo(0, -20);
    ctx.quadraticCurveTo(-4, -28, 4, -30);
    ctx.stroke();

    // Đôi mắt siêu cau có gắt gỏng
    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.ellipse(-6, -6, 4.5, 3.5, 0.2, 0, Math.PI * 2);
    ctx.ellipse(6, -6, 4.5, 3.5, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(-5, -6, 2, 0, Math.PI * 2);
    ctx.arc(5, -6, 2, 0, Math.PI * 2);
    ctx.fill();

    // Lông mày cau lại giận dữ
    ctx.strokeStyle = '#0b3200';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-11, -12); ctx.lineTo(-2, -8);
    ctx.moveTo(11, -12); ctx.lineTo(2, -8);
    ctx.stroke();

    // Miệng trề cau có
    ctx.beginPath();
    ctx.arc(0, 8, 8, Math.PI * 1.15, Math.PI * 1.85, false);
    ctx.stroke();

    ctx.restore();
  }

  // --- Galio (Vệ Thần Kháng Ma Thạch Trắng-Vàng-Lục Bảo) ---
  drawGalioGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3.0;
    const isPunching = (plant.punchAnimTimer && plant.punchAnimTimer > 0) || plant.state === 'shooting';
    const isCastingWave = plant.skill1AnimTimer && plant.skill1AnimTimer > 0;
    const jabProgress = plant.punchAnimTimer > 0 ? Math.min(1, plant.punchAnimTimer / 0.16) : 0;
    const jabBoost = jabProgress > 0 ? Math.sin(jabProgress * Math.PI) * 14 : 0;
    const hover = Math.sin(time) * 1.4;

    ctx.save();
    if (plant.punchDir === -1) {
      ctx.scale(-1, 1);
    }
    ctx.translate(0, hover);

    // 1. Đôi cánh đá cẩm thạch viền vàng sau vai
    const wingFlap = isCastingWave ? -0.25 : Math.sin(time * 0.8) * 0.08;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.scale(side, 1);
      ctx.rotate(wingFlap);
      ctx.fillStyle = isCastingWave ? '#e0f7fa' : '#cfd8dc';
      ctx.strokeStyle = '#ffa000';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(8, -2);
      ctx.lineTo(24, -18);
      ctx.lineTo(26, -5);
      ctx.lineTo(19, 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Vân vàng trên cánh
      ctx.strokeStyle = '#ffca28';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(11, -3);
      ctx.lineTo(22, -13);
      ctx.stroke();
      ctx.restore();
    }

    // 2. Chân đế đá vững chãi
    ctx.fillStyle = '#90a4ae';
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(-10, 14, 8, 9, 3);
    ctx.roundRect(2, 14, 8, 9, 3);
    ctx.fill();
    ctx.stroke();

    // 3. Thân giáp kháng ma thạch trắng ngà + viền vàng kim
    const bodyGrad = ctx.createLinearGradient(-13, -12, 13, 18);
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.55, '#eceff1');
    bodyGrad.addColorStop(1, '#b0bec5');
    ctx.fillStyle = bodyGrad;
    ctx.strokeStyle = '#546e7a';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-14, -10);
    ctx.lineTo(14, -10);
    ctx.lineTo(10, 15);
    ctx.lineTo(-10, 15);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Khung giáp vai vàng kim
    ctx.fillStyle = '#ffca28';
    ctx.strokeStyle = '#8d6e63';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(-13, -7, 6.5, 5.5, -0.25, 0, Math.PI * 2);
    ctx.ellipse(13, -7, 6.5, 5.5, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Lõi năng lượng ngọc lam trước ngực (sáng mạnh khi sắp hoặc đang bắn Skill 1)
    const chargeRatio = plant.skill1Interval ? Math.min(1, (plant.skill1Timer || 0) / plant.skill1Interval) : 0;
    ctx.fillStyle = isCastingWave ? '#ffffff' : (chargeRatio > 0.75 ? '#84ffff' : '#00e5ff');
    ctx.strokeStyle = '#ffa000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 2, isCastingWave ? 6 : 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Đầu mũ giáp có sừng vàng và đôi mắt ngọc sáng
    ctx.fillStyle = '#eceff1';
    ctx.strokeStyle = '#455a64';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.roundRect(-8.5, -24, 17, 14, 4);
    ctx.fill();
    ctx.stroke();

    // Mão vương miện vàng
    ctx.fillStyle = '#ffb300';
    ctx.beginPath();
    ctx.moveTo(-7, -23);
    ctx.lineTo(-10, -31);
    ctx.lineTo(-3, -24);
    ctx.lineTo(0, -30);
    ctx.lineTo(3, -24);
    ctx.lineTo(10, -31);
    ctx.lineTo(7, -23);
    ctx.closePath();
    ctx.fill();

    // Mắt sáng xanh lam
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.ellipse(-3.5, -17, 2.2, 1.5, 0.15, 0, Math.PI * 2);
    ctx.ellipse(3.5, -17, 2.2, 1.5, -0.15, 0, Math.PI * 2);
    ctx.fill();

    // 5. Nắm đấm đá khổng lồ phía trước (vung ra khi đánh thường / bắn sóng)
    const fistX = 14 + (isPunching ? 6 : 0) + jabBoost;
    ctx.fillStyle = '#eceff1';
    ctx.strokeStyle = '#ffca28';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.ellipse(fistX, 4, 8, 7, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  // Bẫy Hoa Sen Tử Vong (Jhinplant Skill): chặn đặt cây & nổ 444 DMG AoE 2x2
  drawLotusTraps(ctx, traps) {
    for (const trap of traps) {
      if (!trap.alive) continue;
      const t = trap.animTime || 0;
      const pulse = 1 + Math.sin(t * 4.5) * 0.06;

      ctx.save();
      ctx.translate(trap.x, trap.y + 4);
      ctx.scale(pulse, pulse);

      // Vòng ấn tử vong dưới mặt cỏ (báo hiệu ô đã có bẫy)
      ctx.fillStyle = 'rgba(74, 20, 140, 0.36)';
      ctx.beginPath();
      ctx.ellipse(0, 4, 28, 17, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 23, 68, 0.78)';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.ellipse(0, 4, 26, 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);

      // 8 cánh hoa sen góc cạnh tím-đỏ
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4 + t * 0.4;
        ctx.save();
        ctx.rotate(angle);
        ctx.fillStyle = i % 2 === 0 ? '#6a1b9a' : '#880e4f';
        ctx.strokeStyle = '#ea80fc';
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.moveTo(0, -4);
        ctx.lineTo(7, -15);
        ctx.lineTo(0, -21);
        ctx.lineTo(-7, -15);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Nhụy hoa sen phát sáng đỏ rực
      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff59d';
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // Bình Thuốc Hóa Kỹ (Rồng Hóa Kỹ ném ra 3x3: không thể phá hủy, chặn trồng cây, chỉ mất khi zombie/rồng đi vào)
  drawChemPotions(ctx, potions) {
    for (const potion of potions) {
      if (!potion.alive) continue;

      const colorMain = potion.kind === 'speed'
        ? '#ab47bc'
        : (potion.kind === 'giant_hp' ? '#43a047' : '#e53935');
      const colorLight = potion.kind === 'speed'
        ? '#f3e5f5'
        : (potion.kind === 'giant_hp' ? '#b9f6ca' : '#ffcdd2');
      const colorGlow = potion.kind === 'speed'
        ? 'rgba(171, 71, 188, 0.32)'
        : (potion.kind === 'giant_hp' ? 'rgba(67, 160, 71, 0.34)' : 'rgba(229, 57, 53, 0.34)');

      let drawX = potion.x;
      let drawY = potion.y;
      if (!potion.landed) {
        const p = Math.min(1, (potion.flightTimer || 0) / Math.max(0.05, potion.flightDuration || 0.34));
        const fx = potion.fromX !== undefined ? potion.fromX : potion.x;
        const fy = potion.fromY !== undefined ? potion.fromY : potion.y - 30;
        drawX = fx + (potion.x - fx) * p;
        drawY = fy + (potion.y - fy) * p - Math.sin(p * Math.PI) * 38;
      }

      const t = potion.animTime || 0;
      const bob = potion.landed ? Math.sin(t * 4.0) * 1.5 : 0;

      ctx.save();
      // Vòng cấm trồng cây trên mặt đất khi đã đáp xuống
      if (potion.landed) {
        ctx.fillStyle = colorGlow;
        ctx.beginPath();
        ctx.ellipse(potion.x, potion.y + 8, 24, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colorMain;
        ctx.lineWidth = 1.6;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        ctx.ellipse(potion.x, potion.y + 8, 22, 10.5, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.translate(drawX, drawY + bob);

      // Thân bình thủy tinh tròn + cổ bình
      ctx.fillStyle = colorMain;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.arc(0, 2, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Cổ bình & nút gỗ
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.fillRect(-3.5, -13, 7, 5);
      ctx.fillStyle = '#8d6e63';
      ctx.fillRect(-4, -16, 8, 3.5);

      // Ánh sáng phản chiếu & ký hiệu loại thuốc
      ctx.fillStyle = colorLight;
      ctx.beginPath();
      ctx.arc(-4, -2, 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      const badge = potion.kind === 'speed' ? '×2S' : (potion.kind === 'giant_hp' ? '+300' : '×2A');
      ctx.fillText(badge, 0, 5);

      ctx.restore();
    }
  }

  // Thanh hiển thị 4 viên đạn / nạp đạn 4s trên đầu Jhinplant
  drawJhinAmmoHud(ctx, plant) {
    ctx.save();
    if (plant.isReloading) {
      const total = plant.reloadDuration || 4.0;
      const progress = Math.max(0, Math.min(1, 1 - (plant.reloadTimer || 0) / total));
      ctx.fillStyle = 'rgba(10, 6, 16, 0.85)';
      ctx.strokeStyle = '#ce93d8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-18, -39, 36, 5, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ff1744';
      ctx.beginPath();
      ctx.roundRect(-17, -38, 34 * progress, 3, 1.5);
      ctx.fill();
    } else {
      const ammo = plant.ammo !== undefined ? plant.ammo : 4;
      const fired = 4 - ammo;
      for (let i = 0; i < 4; i++) {
        const px = -12 + i * 8;
        const py = -37;
        const available = i >= fired;
        const isFourth = i === 3;
        ctx.fillStyle = !available
          ? 'rgba(40, 28, 52, 0.85)'
          : (isFourth ? '#ff1744' : '#e040fb');
        ctx.strokeStyle = available ? '#ffffff' : '#5e4375';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.arc(px, py, isFourth ? 3.2 : 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // Jhinplant (Hoa Súng Tử Vong): Thược dược tím góc cạnh + mặt nạ nghệ thuật + ống ngắm la-de đỏ rực
  drawJhinplantGraphics(ctx, plant) {
    const t = plant.animTime || 0;
    const isFourthReady = !plant.isReloading && plant.ammo === 1;
    const recoil = (plant.state === 'shooting') ? -4 : 0;
    const sway = Math.sin(t * 2.2) * 1.6;

    ctx.save();

    // 1. Thân & lá góc cạnh tím thẫm
    ctx.fillStyle = '#2d0b45';
    ctx.strokeStyle = '#7b1fa2';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-4, 22);
    ctx.lineTo(-20, 12);
    ctx.lineTo(-7, 13);
    ctx.lineTo(0, 22);
    ctx.lineTo(18, 13);
    ctx.lineTo(6, 20);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#3c1053';
    ctx.beginPath();
    ctx.moveTo(-3.5, 22);
    ctx.lineTo(-2.5, -2);
    ctx.lineTo(3.5, -2);
    ctx.lineTo(4, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.translate(recoil + sway * 0.35, -7);

    // 2. Cánh hoa thược dược / hoa súng tím thẫm góc cạnh (8 cánh nhọn hiện đại)
    const petalColors = ['#38006b', '#5e178c', '#4a148c', '#7b1fa2'];
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = petalColors[i % petalColors.length];
      ctx.strokeStyle = isFourthReady && i % 2 === 0 ? '#ff5252' : '#ce93d8';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(6.5, -16);
      ctx.lineTo(0, -23);
      ctx.lineTo(-6.5, -16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Lớp cánh trong sắc nét
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      ctx.save();
      ctx.rotate(angle);
      ctx.fillStyle = '#1f0836';
      ctx.strokeStyle = '#ba68c8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -4);
      ctx.lineTo(5, -12);
      ctx.lineTo(0, -17);
      ctx.lineTo(-5, -12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 3. Trung tâm mặt nạ nghệ thuật lạnh lùng (Asymmetric Theatre Mask)
    ctx.fillStyle = '#f3e5f5';
    ctx.strokeStyle = '#240b36';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(10, -6);
    ctx.lineTo(8, 8);
    ctx.lineTo(0, 12);
    ctx.lineTo(-9, 7);
    ctx.lineTo(-10, -6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Nửa bóng tối nghệ thuật bên trái mặt nạ
    ctx.fillStyle = 'rgba(49, 27, 146, 0.35)';
    ctx.beginPath();
    ctx.moveTo(0, -12);
    ctx.lineTo(-10, -6);
    ctx.lineTo(-9, 7);
    ctx.lineTo(0, 12);
    ctx.closePath();
    ctx.fill();

    // Khe mắt lạnh lùng + con mắt ngắm đỏ rực
    ctx.fillStyle = '#1a0826';
    ctx.beginPath();
    ctx.moveTo(-7, -3);
    ctx.lineTo(-2, -1);
    ctx.lineTo(-5, 2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = isFourthReady ? '#ff1744' : '#d500f9';
    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.lineTo(8, -4);
    ctx.lineTo(6, 1.5);
    ctx.closePath();
    ctx.fill();

    // Nét khắc miệng lạnh lùng trên mặt nạ
    ctx.strokeStyle = '#311b92';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-4, 5.5);
    ctx.quadraticCurveTo(0, 7.5, 5, 5);
    ctx.stroke();

    // 4. Ống ngắm la-de màu đỏ rực trên đầu hoa
    ctx.fillStyle = '#212121';
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.roundRect(-5, -20, 17, 6, 2);
    ctx.fill();
    ctx.stroke();

    // Thấu kính la-de đỏ rực
    ctx.fillStyle = '#ff1744';
    ctx.beginPath();
    ctx.arc(11, -17, isFourthReady ? 3.2 : 2.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffebee';
    ctx.beginPath();
    ctx.arc(11, -17, 1.1, 0, Math.PI * 2);
    ctx.fill();

    // Tia ngắm la-de đỏ rực phóng về phía trước
    if (!plant.isReloading) {
      const beamAlpha = isFourthReady ? (0.75 + Math.sin(t * 14) * 0.2) : 0.45;
      const beamLen = plant.isIcon ? 18 : (isFourthReady ? 140 : 88);
      ctx.strokeStyle = `rgba(255, 23, 68, ${beamAlpha})`;
      ctx.lineWidth = isFourthReady ? 2.2 : 1.3;
      ctx.beginPath();
      ctx.moveTo(13, -17);
      ctx.lineTo(13 + beamLen, -17);
      ctx.stroke();
    }

    if (plant.flashTimer > 0) this.drawHitFlashOverlay(ctx, 20, 20, 0);
    ctx.restore();
    ctx.restore();
  }

  // 9. Cây Tổng Quát Fallback — Đảm bảo không bao giờ bị tàng hình
  drawGenericPlantGraphics(ctx, plant) {
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#76ff03';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Chữ cái viết tắt
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    const initial = (plant.type || 'P').charAt(0).toUpperCase();
    ctx.fillText(initial, 0, 4);
  }

  // Cỏ Ba Lá (Blover): 3 lá xanh biếc hình cánh quạt + gương mặt tinh anh
  drawBloverGraphics(ctx, plant) {
    const t = plant.animTime || 0;
    const spin = plant.isIcon ? 0.25 : Math.sin(t * 5) * 0.25;

    ctx.save();
    if (plant.flashTimer > 0) {
      ctx.filter = 'brightness(1.5)';
    }

    // Thân cuống xanh tươi
    ctx.strokeStyle = '#2e7d32';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 22);
    ctx.quadraticCurveTo(-3, 10, 0, -2);
    ctx.stroke();

    // Lá gốc nhỏ
    ctx.fillStyle = '#43a047';
    ctx.beginPath();
    ctx.ellipse(-7, 20, 7, 3.5, -0.35, 0, Math.PI * 2);
    ctx.ellipse(7, 20, 7, 3.5, 0.35, 0, Math.PI * 2);
    ctx.fill();

    // 3 cánh lá cỏ ba lá xoay tạo gió
    ctx.save();
    ctx.translate(0, -6);
    ctx.rotate(spin);
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI * 2) / 3);
      const leafGrad = ctx.createRadialGradient(-2, -12, 2, 0, -12, 13);
      leafGrad.addColorStop(0, '#b9f6ca');
      leafGrad.addColorStop(0.45, '#00e676');
      leafGrad.addColorStop(1, '#1b5e20');
      ctx.fillStyle = leafGrad;
      ctx.strokeStyle = '#0d3b13';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.bezierCurveTo(-11, -6, -12, -21, -2, -21);
      ctx.lineTo(0, -17);
      ctx.lineTo(2, -21);
      ctx.bezierCurveTo(12, -21, 11, -6, 0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Gân lá
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -3);
      ctx.lineTo(0, -15);
      ctx.stroke();
      ctx.restore();
    }

    // Gương mặt ở tâm cỏ ba lá
    ctx.fillStyle = '#00c853';
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mắt & miệng thổi gió
    ctx.fillStyle = '#0d1b0f';
    ctx.beginPath();
    ctx.arc(-2.2, -1.2, 1.3, 0, Math.PI * 2);
    ctx.arc(2.2, -1.2, 1.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#80deea';
    ctx.beginPath();
    ctx.arc(0, 2.2, 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.restore();
  }

  // Lux (Tiểu Thư Ánh Sáng - Bông hoa phép thuật ánh sáng vàng kim rực rỡ)
  drawLuxGraphics(ctx, plant) {
    const time = (plant.animTime || 0) * 3.0;
    const bob = Math.sin(time * 2.2) * 1.4;
    const isUlting = (plant.ultAnimTimer || 0) > 0;
    const isBeaming = (plant.beamAnimTimer || 0) > 0;
    const stacks = plant.killAssistCount || 0;

    ctx.save();
    ctx.translate(0, bob);

    // Hào quang ánh sáng vàng kim dưới chân & xung quanh khi tích stack / bắn tia
    const glowRadius = isUlting ? 34 : (isBeaming ? 27 : 22 + stacks * 0.5);
    const auraGrad = ctx.createRadialGradient(0, -6, 4, 0, -6, glowRadius);
    auraGrad.addColorStop(0, isUlting ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 245, 157, 0.42)');
    auraGrad.addColorStop(0.6, 'rgba(255, 213, 79, 0.2)');
    auraGrad.addColorStop(1, 'rgba(255, 213, 79, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -6, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    // Lá đế xanh ngọc viền vàng
    ctx.fillStyle = '#43a047';
    ctx.strokeStyle = '#1b5e20';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(-9, 17, 10, 4.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(9, 17, 10, 4.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thân áo giáp trắng vàng Demacia
    const stemGrad = ctx.createLinearGradient(-7, 2, 7, 18);
    stemGrad.addColorStop(0, '#ffffff');
    stemGrad.addColorStop(0.5, '#fff8e1');
    stemGrad.addColorStop(1, '#ffd54f');
    ctx.fillStyle = stemGrad;
    ctx.strokeStyle = '#f9a825';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.roundRect(-6, 1, 12, 16, 4);
    ctx.fill();
    ctx.stroke();

    // Cánh hoa ánh sáng 8 tia tỏa sáng sau đầu
    ctx.save();
    ctx.translate(0, -10);
    ctx.rotate(time * 0.25);
    for (let i = 0; i < 8; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 4);
      ctx.fillStyle = i % 2 === 0 ? '#ffd54f' : '#fff59d';
      ctx.strokeStyle = '#ff8f00';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(3.5, -18);
      ctx.lineTo(0, -22);
      ctx.lineTo(-3.5, -18);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();

    // Khuôn mặt rạng rỡ & vương miện Demacia
    const headGrad = ctx.createRadialGradient(-2, -12, 2, 0, -10, 12);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.6, '#fff59d');
    headGrad.addColorStop(1, '#fbc02d');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#f57f17';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, -10, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Mắt sáng lấp lánh
    ctx.fillStyle = '#0288d1';
    ctx.beginPath();
    ctx.arc(3.5, -11, 2.2, 0, Math.PI * 2);
    ctx.arc(-2.5, -11, 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(4.2, -11.8, 0.8, 0, Math.PI * 2);
    ctx.arc(-1.8, -11.8, 0.8, 0, Math.PI * 2);
    ctx.fill();

    // Quyền trượng pha lê ánh sáng bên tay phải
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(11, 14);
    ctx.lineTo(15, -12);
    ctx.stroke();

    ctx.fillStyle = isUlting ? '#ffffff' : '#fff59d';
    ctx.shadowColor = '#ffd54f';
    ctx.shadowBlur = isBeaming || isUlting ? 12 : 6;
    ctx.beginPath();
    ctx.arc(15, -13, isUlting ? 6.5 : 4.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  // Phù Thủy Syndra: Dạ lan hương / Lưu ly biến dị dáng cao thanh thoát mang sắc tối & cầu bóng tối quay quanh
  drawSyndraGraphics(ctx, plant) {
    const t = plant.animTime || 0;
    const sway = Math.sin(t * 2.1) * 1.4;
    const bob = Math.sin(t * 3.0) * 1.1;
    const isEmpowering = (plant.empoweredAnimTimer || 0) > 0;
    const isCasting = (plant.orbCastAnimTimer || 0) > 0 || (plant.state === 'shooting');
    const stacks = plant.isIcon ? 3 : Math.max(0, Math.min(3, plant.orbStacks || 0));

    ctx.save();
    if (plant.flashTimer > 0) {
      ctx.filter = 'brightness(1.45)';
    }

    // 1. Hào quang hắc ám dưới gốc cây
    const auraRadius = isEmpowering ? 34 : (23 + stacks * 2.5);
    const auraGrad = ctx.createRadialGradient(0, 2, 4, 0, 0, auraRadius);
    auraGrad.addColorStop(0, isEmpowering ? 'rgba(224, 64, 251, 0.55)' : 'rgba(123, 31, 162, 0.32)');
    auraGrad.addColorStop(0.65, 'rgba(49, 27, 146, 0.16)');
    auraGrad.addColorStop(1, 'rgba(18, 6, 31, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, -2, auraRadius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Lá đế mảnh dài uốn cong sắc tối (giống họ hàng Shadow-shroom & Moonflower nhưng thanh thoát hơn)
    ctx.fillStyle = '#1b1033';
    ctx.strokeStyle = '#6a1b9a';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-2, 22);
    ctx.quadraticCurveTo(-17, 15, -21, 5);
    ctx.quadraticCurveTo(-11, 10, -2, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(2, 22);
    ctx.quadraticCurveTo(17, 15, 21, 5);
    ctx.quadraticCurveTo(11, 10, 2, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. Thân cọng mảnh cao ráo uốn nhẹ
    const stemGrad = ctx.createLinearGradient(-4, -10, 4, 22);
    stemGrad.addColorStop(0, '#5e35b1');
    stemGrad.addColorStop(0.5, '#311b92');
    stemGrad.addColorStop(1, '#140826');
    ctx.strokeStyle = '#9c27b0';
    ctx.lineWidth = 1.2;
    ctx.fillStyle = stemGrad;
    ctx.beginPath();
    ctx.moveTo(-3.2, 22);
    ctx.quadraticCurveTo(-2 + sway * 0.4, 4, -2.4 + sway * 0.6, -11 + bob * 0.5);
    ctx.lineTo(2.4 + sway * 0.6, -11 + bob * 0.5);
    ctx.quadraticCurveTo(2.5 + sway * 0.4, 4, 3.2, 22);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Đài lá thanh mảnh quanh cổ hoa
    ctx.save();
    ctx.translate(sway * 0.6, -11 + bob);

    // 4. Cụm hoa dạ lan hương / lưu ly biến dị sắc tối vươn cao (3 tầng cánh rủ sang trọng)
    const outerPetals = [
      { ang: -2.35, len: 18, w: 6.2 },
      { ang: -1.75, len: 21, w: 6.5 },
      { ang: -0.95, len: 20, w: 6.2 },
      { ang: 0.4, len: 18, w: 5.8 },
      { ang: 2.75, len: 18, w: 5.8 }
    ];
    for (let i = 0; i < outerPetals.length; i++) {
      const pt = outerPetals[i];
      ctx.save();
      ctx.rotate(pt.ang);
      const pGrad = ctx.createLinearGradient(0, 0, 0, -pt.len);
      pGrad.addColorStop(0, '#120524');
      pGrad.addColorStop(0.55, '#4a148c');
      pGrad.addColorStop(1, isCasting ? '#ea80fc' : '#ab47bc');
      ctx.fillStyle = pGrad;
      ctx.strokeStyle = '#ce93d8';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-pt.w, -pt.len * 0.5, 0, -pt.len);
      ctx.quadraticCurveTo(pt.w, -pt.len * 0.5, 0, 0);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Chóp vương miện hoa dạ lan hương biến dị trên đỉnh đầu
    for (let j = -1; j <= 1; j++) {
      ctx.save();
      ctx.translate(j * 4.5, -13);
      ctx.rotate(j * 0.28);
      ctx.fillStyle = j === 0 ? '#7b1fa2' : '#4a148c';
      ctx.strokeStyle = '#e040fb';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, 3);
      ctx.quadraticCurveTo(-4, -5, 0, -11);
      ctx.quadraticCurveTo(4, -5, 0, 3);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Nhụy & khuôn mặt hoa lưu ly sắc tối ở tâm
    const faceGrad = ctx.createRadialGradient(-2, -3, 1.5, 0, -2, 10.5);
    faceGrad.addColorStop(0, '#4a148c');
    faceGrad.addColorStop(0.6, '#240742');
    faceGrad.addColorStop(1, '#0d021c');
    ctx.fillStyle = faceGrad;
    ctx.strokeStyle = '#ba68c8';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(0, -2, 9.5, 10.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Đôi mắt ma pháp sắc sảo phát sáng màu tím lam
    ctx.fillStyle = isEmpowering ? '#ffffff' : '#e040fb';
    ctx.shadowColor = '#e040fb';
    ctx.shadowBlur = isCasting || isEmpowering ? 8 : 4;
    ctx.beginPath();
    ctx.moveTo(-6, -4);
    ctx.lineTo(-1.5, -2);
    ctx.lineTo(-4.5, -0.2);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(6.8, -4);
    ctx.lineTo(1.8, -2);
    ctx.lineTo(5.0, -0.2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    // Điểm sáng tinh thể ở giữa trán
    ctx.fillStyle = '#b388ff';
    ctx.beginPath();
    ctx.moveTo(0, -10.5);
    ctx.lineTo(2.4, -7.2);
    ctx.lineTo(0, -4.5);
    ctx.lineTo(-2.4, -7.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();

    // 5. Các quả cầu bóng tối quay quanh Syndra theo số stack (0..3)
    const orbitTime = plant.isIcon ? 0.6 : t * 2.8;
    for (let k = 0; k < stacks; k++) {
      const angle = orbitTime + (k * Math.PI * 2) / Math.max(1, stacks);
      const ox = Math.cos(angle) * 21;
      const oy = -6 + Math.sin(angle) * 9;

      ctx.fillStyle = 'rgba(224, 64, 251, 0.35)';
      ctx.beginPath();
      ctx.arc(ox, oy, 7.2, 0, Math.PI * 2);
      ctx.fill();

      const miniOrbGrad = ctx.createRadialGradient(ox - 1.5, oy - 1.5, 1, ox, oy, 5.0);
      miniOrbGrad.addColorStop(0, '#f3e5f5');
      miniOrbGrad.addColorStop(0.45, '#d500f9');
      miniOrbGrad.addColorStop(1, '#1a0033');
      ctx.fillStyle = miniOrbGrad;
      ctx.strokeStyle = '#ea80fc';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.arc(ox, oy, 5.0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // Kata Blade Rose: Hoa hồng lưỡi kiếm sắc đỏ rực cùng dải dao găm quay quanh khi tung bão dao 3x3
  drawKataGraphics(ctx, plant) {
    const t = plant.animTime || 0;
    const isSpinning = !!plant.isSpinning && !plant.isIcon;
    const bob = isSpinning ? 0 : Math.sin(t * 2.6) * 1.2;

    ctx.save();
    if (plant.flashTimer > 0) {
      ctx.filter = 'brightness(1.45)';
    }
    ctx.translate(0, bob);

    // Lá gai thép đen ánh đỏ dưới chân
    ctx.fillStyle = '#1b0a0e';
    ctx.strokeStyle = '#d32f2f';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-3, 21);
    ctx.lineTo(-21, 10);
    ctx.lineTo(-9, 13);
    ctx.lineTo(0, 22);
    ctx.lineTo(21, 10);
    ctx.lineTo(9, 13);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Thân hoa hồng gai sắc nét
    ctx.fillStyle = '#2e1018';
    ctx.strokeStyle = '#ff5252';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-4, 21);
    ctx.lineTo(-3, -4);
    ctx.lineTo(3, -4);
    ctx.lineTo(4, 21);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Cụm cánh hoa hồng rèn từ lưỡi dao bạc & đỏ thẫm
    ctx.save();
    ctx.translate(0, -10);
    if (isSpinning) {
      ctx.rotate(t * 14.0);
    }

    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.fillStyle = i % 2 === 0 ? '#b71c1c' : '#d50000';
      ctx.strokeStyle = '#eceff1';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(0, -5);
      ctx.lineTo(6.5, -15);
      ctx.lineTo(0, -22);
      ctx.lineTo(-6.5, -15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Tâm hoa hồng sắc lạnh với đôi mắt đỏ rực
    const coreGrad = ctx.createRadialGradient(-2, -2, 1.5, 0, 0, 10);
    coreGrad.addColorStop(0, '#ff8a80');
    coreGrad.addColorStop(0.55, '#c62828');
    coreGrad.addColorStop(1, '#3e0008');
    ctx.fillStyle = coreGrad;
    ctx.strokeStyle = '#ff1744';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 9.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-5.5, -2.5); ctx.lineTo(-1.5, -0.5); ctx.lineTo(-4.5, 1.5); ctx.closePath();
    ctx.moveTo(6.0, -2.5); ctx.lineTo(2.0, -0.5); ctx.lineTo(5.0, 1.5); ctx.closePath();
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  // Aurora (Hoa Chuông Linh Giới): Hoa chuông xanh ngọc-hồng dịu phát sáng, dáng tai thỏ linh hồn tinh nghịch
  drawAuroraGraphics(ctx, plant) {
    const t = plant.animTime || 0;
    const sway = Math.sin(t * 2.3) * 1.5;
    const bob = Math.sin(t * 3.1) * 1.2;
    const isCasting = (plant.realmCastAnimTimer || 0) > 0;

    ctx.save();
    if (plant.flashTimer > 0) {
      ctx.filter = 'brightness(1.45)';
    }

    // Vòng hào quang Linh Giới quanh gốc
    const auraR = isCasting ? 32 : 24;
    const auraGrad = ctx.createRadialGradient(0, 2, 3, 0, 0, auraR);
    auraGrad.addColorStop(0, isCasting ? 'rgba(244, 143, 177, 0.55)' : 'rgba(128, 222, 234, 0.32)');
    auraGrad.addColorStop(1, 'rgba(128, 222, 234, 0)');
    ctx.fillStyle = auraGrad;
    ctx.beginPath();
    ctx.arc(0, 0, auraR, 0, Math.PI * 2);
    ctx.fill();

    // Lá đế xanh lục-ngọc mềm mại
    ctx.fillStyle = '#00695c';
    ctx.strokeStyle = '#80cbc4';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(-10, 17, 10, 4.5, -0.3, 0, Math.PI * 2);
    ctx.ellipse(10, 17, 10, 4.5, 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thân uốn cong dáng hoa chuông
    ctx.strokeStyle = '#4db6ac';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.quadraticCurveTo(-4 + sway * 0.4, 5, 2 + sway * 0.6, -12 + bob);
    ctx.stroke();

    ctx.save();
    ctx.translate(2 + sway * 0.6, -12 + bob);

    // Đôi cánh hoa vươn cao giống đôi tai thỏ linh giới
    ctx.fillStyle = '#e0f7fa';
    ctx.strokeStyle = '#f48fb1';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(-6, -13, 3.8, 10.5, -0.25, 0, Math.PI * 2);
    ctx.ellipse(5, -14, 3.8, 10.5, 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Chuông hoa linh giới xanh ngọc pha hồng rạng rỡ
    const bellGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 14);
    bellGrad.addColorStop(0, '#ffffff');
    bellGrad.addColorStop(0.45, '#80deea');
    bellGrad.addColorStop(1, '#f06292');
    ctx.fillStyle = bellGrad;
    ctx.strokeStyle = '#00acc1';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-11, 5);
    ctx.quadraticCurveTo(-11, -10, 0, -10);
    ctx.quadraticCurveTo(12, -10, 12, 5);
    ctx.quadraticCurveTo(6, 9, 0, 6);
    ctx.quadraticCurveTo(-6, 9, -11, 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Kính tròn đáng yêu & mắt sáng tinh anh của Aurora
    ctx.fillStyle = '#263238';
    ctx.beginPath();
    ctx.arc(-2.8, -1, 2.0, 0, Math.PI * 2);
    ctx.arc(4.2, -1, 2.0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(-2.8, -1, 3.2, 0, Math.PI * 2);
    ctx.arc(4.2, -1, 3.2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
    ctx.restore();
  }

  // Ahri (Hồ Ly Chín Đuôi): Hoa hồ ly trắng-hồng với 9 cánh đuôi xòe rực rỡ & quả cầu linh hồn trước mặt
  drawAhriGraphics(ctx, plant) {
    const t = plant.animTime || 0;
    const sway = Math.sin(t * 2.4) * 1.4;
    const isCasting = (plant.charmCastAnimTimer || 0) > 0;

    ctx.save();
    if (plant.flashTimer > 0) {
      ctx.filter = 'brightness(1.45)';
    }

    // Chùm cánh đuôi chín nhánh trắng-hồng phía sau
    for (let i = -3; i <= 3; i++) {
      const ang = i * 0.34 - 0.15 + Math.sin(t * 2.8 + i) * 0.05;
      ctx.save();
      ctx.translate(-4, 8);
      ctx.rotate(ang);
      const tailGrad = ctx.createLinearGradient(0, 0, -18, -12);
      tailGrad.addColorStop(0, '#f48fb1');
      tailGrad.addColorStop(0.65, '#fce4ec');
      tailGrad.addColorStop(1, '#ffffff');
      ctx.fillStyle = tailGrad;
      ctx.strokeStyle = '#f06292';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(-14, -10, -21, -2);
      ctx.quadraticCurveTo(-13, 6, 0, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Lá đế xanh lục-ngọc
    ctx.fillStyle = '#2e7d32';
    ctx.strokeStyle = '#a5d6a7';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-8, 19, 9, 4.2, -0.25, 0, Math.PI * 2);
    ctx.ellipse(9, 19, 9, 4.2, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thân hoa thanh mảnh
    ctx.strokeStyle = '#66bb6a';
    ctx.lineWidth = 4.0;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.quadraticCurveTo(-3 + sway * 0.4, 6, 1 + sway * 0.6, -9);
    ctx.stroke();

    ctx.save();
    ctx.translate(1 + sway * 0.6, -10);

    // Đôi tai hồ ly hồng-trắng trên đỉnh đầu
    ctx.fillStyle = '#fce4ec';
    ctx.strokeStyle = '#e91e63';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(-9, -4); ctx.lineTo(-12, -19); ctx.lineTo(-2, -10); ctx.closePath();
    ctx.moveTo(9, -4); ctx.lineTo(12, -19); ctx.lineTo(2, -10); ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Đầu hoa hồ ly
    const headGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 13);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.55, '#f8bbd0');
    headGrad.addColorStop(1, '#ec407a');
    ctx.fillStyle = headGrad;
    ctx.strokeStyle = '#c2185b';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Đôi mắt vàng hổ phách sắc sảo & vệt má hồ ly
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.ellipse(-3.5, -1.5, 2.2, 1.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(4.5, -1.5, 2.2, 1.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a0a14';
    ctx.beginPath();
    ctx.arc(-3.5, -1.5, 1.0, 0, Math.PI * 2);
    ctx.arc(4.5, -1.5, 1.0, 0, Math.PI * 2);
    ctx.fill();

    // Quả cầu linh hồn bay lơ lửng trước tay Ahri (ẩn đi khi đã phóng ra ngoài, sáng bừng khi thu hồi về tay)
    const hasActiveOrbOut = !!(plant.activeOrb && plant.activeOrb.alive);
    const catchAlpha = Math.max(0, Math.min(1, (plant.orbCatchTimer || 0) / 0.22));
    const orbX = 16;
    const orbY = 3 + Math.sin(t * 4.5) * 2.5;
    if (!hasActiveOrbOut) {
      if (catchAlpha > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${0.65 * catchAlpha})`;
        ctx.beginPath();
        ctx.arc(orbX, orbY, 12.5 * catchAlpha + 5, 0, Math.PI * 2);
        ctx.fill();
      }
      const orbGrad = ctx.createRadialGradient(orbX - 1.5, orbY - 1.5, 1, orbX, orbY, isCasting ? 8.5 : 6.5);
      orbGrad.addColorStop(0, '#ffffff');
      orbGrad.addColorStop(0.5, isCasting ? '#ff80ab' : '#80deea');
      orbGrad.addColorStop(1, isCasting ? '#f50057' : '#00acc1');
      ctx.fillStyle = orbGrad;
      ctx.beginPath();
      ctx.arc(orbX, orbY, isCasting ? 7.5 : 5.8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    ctx.restore();
  }

  // Kiếm Vũ Ire: Búp hoa diên vĩ lam-vàng cùng 4 thanh phi kiếm bay quanh lưng
  drawIreliaGraphics(ctx, plant) {
    const t = plant.animTime || 0;
    const bob = Math.sin(t * 3.0) * 1.4;
    const isSlashing = (plant.slashAnimTimer || 0) > 0;
    const isDashing = (plant.dashAnimTimer || 0) > 0;
    const slashProg = isSlashing ? Math.min(1, (plant.slashAnimTimer || 0) / 0.28) : 0;
    const stacks = plant.ireStacks || 0;

    ctx.save();
    if (plant.flashTimer > 0) {
      ctx.filter = 'brightness(1.45)';
    }

    if (isDashing) {
      ctx.fillStyle = 'rgba(0, 229, 255, 0.28)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 24, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // 4 thanh phi kiếm bạc-lam lơ lửng quanh thân (lao về phía trước khi phóng phi kiếm)
    for (let i = 0; i < 4; i++) {
      const side = i < 2 ? -1 : 1;
      const idx = i % 2;
      const lungeX = isSlashing ? Math.sin(slashProg * Math.PI) * (side > 0 ? 11 : 5) : 0;
      const bx = side * (15 + idx * 5) + lungeX + Math.sin(t * 4.2 + i) * 1.6;
      const by = -14 + idx * 12 + Math.cos(t * 3.6 + i) * 1.8;
      const rot = isSlashing
        ? (Math.PI * 0.48)
        : (0.25 * side + Math.sin(t * 3 + i) * 0.08);
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(rot);
      ctx.fillStyle = stacks >= 2 ? '#ffd54f' : '#80d8ff';
      ctx.strokeStyle = stacks >= 2 ? '#ef6c00' : '#00838f';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(0, -11);
      ctx.lineTo(3.2, 0);
      ctx.lineTo(0, 9);
      ctx.lineTo(-3.2, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Lá đế xanh lam
    ctx.fillStyle = '#00695c';
    ctx.strokeStyle = '#4dd0e1';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.ellipse(-9, 19, 9.5, 4.2, -0.25, 0, Math.PI * 2);
    ctx.ellipse(9, 19, 9.5, 4.2, 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thân hoa giáp bạc-lam
    ctx.strokeStyle = '#26a69a';
    ctx.lineWidth = 4.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(0, -6 + bob);
    ctx.stroke();

    ctx.save();
    ctx.translate(0, -10 + bob);

    // Mũ vương miện kiếm vàng kim & cánh hoa diên vĩ lam
    ctx.fillStyle = '#ffd54f';
    ctx.strokeStyle = '#ef6c00';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(-8, -7); ctx.lineTo(-11, -18); ctx.lineTo(-3, -11);
    ctx.lineTo(0, -21); ctx.lineTo(3, -11); ctx.lineTo(11, -18); ctx.lineTo(8, -7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const irisGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 12);
    irisGrad.addColorStop(0, '#e0f7fa');
    irisGrad.addColorStop(0.5, '#00b0ff');
    irisGrad.addColorStop(1, '#1a237e');
    ctx.fillStyle = irisGrad;
    ctx.strokeStyle = '#ffd54f';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, 10.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Đôi mắt kiên định rực sáng cyan
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-3.5, -1, 1.9, 0, Math.PI * 2);
    ctx.arc(3.8, -1, 1.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#00e5ff';
    ctx.beginPath();
    ctx.arc(-3.5, -1, 1.0, 0, Math.PI * 2);
    ctx.arc(3.8, -1, 1.0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  // Karma (Khai Sáng): Hoa sen ngọc lục bảo với vòng luân xa rồng song sinh sau lưng
  drawKarmaGraphics(ctx, plant) {
    const t = plant.animTime || 0;
    const sway = Math.sin(t * 2.0) * 1.1;
    const isEmpowered = (plant.empoweredAnimTimer || 0) > 0 || (plant.mantraCount || 0) >= 3;

    ctx.save();
    if (plant.flashTimer > 0) {
      ctx.filter = 'brightness(1.45)';
    }

    // Vòng luân xa Mantra phát sáng sau lưng Karma
    ctx.save();
    ctx.translate(0, -8);
    ctx.rotate(t * (isEmpowered ? 2.4 : 0.9));
    ctx.strokeStyle = isEmpowered ? '#ffd54f' : '#1de9b6';
    ctx.lineWidth = isEmpowered ? 2.6 : 2.0;
    ctx.beginPath();
    ctx.arc(0, 0, 18, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      ctx.fillStyle = i % 2 === 0 ? '#00e676' : '#ffd54f';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 18, Math.sin(a) * 18, 2.3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // Đài sen xanh ngọc ở gốc
    ctx.fillStyle = '#004d40';
    ctx.strokeStyle = '#64ffda';
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.ellipse(-9, 18, 10, 4.5, -0.2, 0, Math.PI * 2);
    ctx.ellipse(9, 18, 10, 4.5, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Thân hoa sen
    ctx.strokeStyle = '#00897b';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, 20);
    ctx.lineTo(sway * 0.4, -8);
    ctx.stroke();

    ctx.save();
    ctx.translate(sway * 0.4, -10);

    // Các cánh hoa sen ngọc-vàng
    const lotusGrad = ctx.createRadialGradient(-2, -2, 2, 0, 0, 13);
    lotusGrad.addColorStop(0, '#b9f6ca');
    lotusGrad.addColorStop(0.55, '#00bfa5');
    lotusGrad.addColorStop(1, '#004d40');
    ctx.fillStyle = lotusGrad;
    ctx.strokeStyle = isEmpowered ? '#ffd54f' : '#64ffda';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-12, 3);
    ctx.quadraticCurveTo(-13, -11, 0, -14);
    ctx.quadraticCurveTo(13, -11, 12, 3);
    ctx.quadraticCurveTo(0, 10, -12, 3);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Ấn thánh vàng trên trán & đôi mắt an nhiên phát sáng ngọc
    ctx.fillStyle = '#ffd54f';
    ctx.beginPath();
    ctx.moveTo(0, -10); ctx.lineTo(2.4, -6); ctx.lineTo(0, -3); ctx.lineTo(-2.4, -6); ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#e0f2f1';
    ctx.beginPath();
    ctx.arc(-3.5, 0, 1.9, 0, Math.PI * 2);
    ctx.arc(3.5, 0, 1.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
    ctx.restore();
  }

  static getPlantIconCanvas(plantType, size = 88) {
    if (typeof document === 'undefined') return null;
    if (!GameRenderer._iconCanvasCache) GameRenderer._iconCanvasCache = {};
    const cacheKey = `${plantType}:${size}`;
    if (GameRenderer._iconCanvasCache[cacheKey]) {
      return GameRenderer._iconCanvasCache[cacheKey];
    }

    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = size;
    iconCanvas.height = size;
    const iconCtx = iconCanvas.getContext('2d');

    if (!GameRenderer._iconRenderer) {
      GameRenderer._iconRenderer = new GameRenderer(iconCanvas);
    }

    const scale = size / 68;
    iconCtx.save();
    iconCtx.translate(size / 2, size / 2 + 4 * scale);
    iconCtx.scale(scale, scale);

    const dummyPlant = {
      type: plantType,
      x: 0,
      y: 0,
      animTime: 0,
      flashTimer: 0,
      state: 'idle',
      glow: 0,
      stage: plantType === 'sun_shroom' ? 2 : 1,
      armed: true,
      sleepTimer: 0,
      isIcon: true,
      hp: 300,
      maxHp: 300
    };
    GameRenderer._iconRenderer.drawPlantBody(iconCtx, dummyPlant);
    iconCtx.restore();

    GameRenderer._iconCanvasCache[cacheKey] = iconCanvas;
    return iconCanvas;
  }

  static getPlantIconDataURL(plantType, size = 88) {
    if (typeof document === 'undefined') return '';
    if (!GameRenderer._iconUrlCache) GameRenderer._iconUrlCache = {};
    const cacheKey = `${plantType}:${size}`;
    if (GameRenderer._iconUrlCache[cacheKey]) {
      return GameRenderer._iconUrlCache[cacheKey];
    }
    const canvas = GameRenderer.getPlantIconCanvas(plantType, size);
    if (!canvas) return '';
    const url = canvas.toDataURL('image/png');
    GameRenderer._iconUrlCache[cacheKey] = url;
    return url;
  }
}

if (typeof window !== 'undefined') {
  window.GameRenderer = GameRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GameRenderer;
}

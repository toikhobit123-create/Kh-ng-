/**
 * PVZ Tower Defense 2D - Game Entities
 * BẮT BUỘC: Đọc trực tiếp DATA & LOGIC TẤN CÔNG (ATK) từ PLANT_CONFIG và ZOMBIE_CONFIG
 * Tuyệt đối không hardcode số liệu rải rác trong hàm
 */

let _entityIdCounter = 1;
function generateId() {
  return _entityIdCounter++;
}

function isZombieOnLawn(z) {
  if (!z || !z.alive) return false;
  const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
  return z.x <= lawnRight;
}

function isTwoRowBoss(z) {
  return !!(z && (z.type === 'zombot_dark_dragon' || z.type === 'ancient_dragon_boss' || z.type === 'azir_desert_emperor'));
}

function isBossRowMatch(z, row) {
  if (!z) return false;
  if (isTwoRowBoss(z)) {
    return row === z.bossRow || row === z.bossRow + 1;
  }
  return z.row === row;
}

function configureWaterDragonLife(zombie, targetLife = 10) {
  const life = Math.max(1, Math.min(zombie.maxWaterLives || 10, targetLife));
  const factor = zombie.waterScaleFactor || 0.5;
  const baseCfg = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG.dragon_water) ? ZOMBIE_CONFIG.dragon_water : {};
  let hp = baseCfg.hp || 100;
  let dmg = baseCfg.damage || 20;
  for (let l = 2; l <= life; l++) {
    hp = Math.round(hp + hp * factor);
    dmg = Math.round(dmg + dmg * factor);
  }
  zombie.waterLife = life;
  zombie.hp = hp;
  zombie.maxHp = hp;
  zombie.baseHp = hp;
  zombie.damage = dmg;
  zombie.visualScale = Math.min(1.42, 0.92 + (life - 1) * 0.05);
  return zombie;
}

/**
 * LỚP CÂY (Plant)
 */
class Plant {
  constructor(type, row, col) {
    const proto = PLANT_CONFIG[type] || PLANT_REGISTRY[type];
    if (!proto) throw new Error(`Unknown plant type: ${type}`);

    this.id = generateId();
    this.type = type;
    this.name = proto.name;
    this.group = proto.group || 'straight';
    this.row = row;
    this.col = col;

    // Tọa độ tâm ô
    this.x = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
    this.y = CONFIG.GRID_OFFSET_Y + row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;

    this.maxHp = proto.hp;
    this.hp = proto.hp;
    this.alive = true;

    // Bộ đếm thời gian hành động & animation
    this.actionTimer = 0;
    this.flashTimer = 0;
    this.shootStateTimer = 0;
    this.animTime = Math.random() * Math.PI * 2;
    this.state = 'idle';

    // Cấu hình năng lực theo Object PLANT_CONFIG
    this.atkSpeed = proto.atkSpeed || proto.shootInterval || proto.attackInterval || 1.0;
    this.shootInterval = this.atkSpeed;
    this.shootTimer = 0;
    this.damage = proto.damage || 20;

    // Nhóm Functional: Sunflower tạo Sun (nhả 25 sun / 24s)
    if (proto.produceSun) {
      this.sunInterval = proto.sunInterval || 24.0;
      this.sunTimer = this.sunInterval - (proto.firstSunDelay || 5.0);
      this.sunAmount = proto.sunAmount || 25;
      this.glow = 0;
    }

    // Nhóm Straight: Repeater bắn liên thanh 2 hạt
    this.burstCount = proto.burstCount || 1;
    this.burstRemaining = 0;
    this.burstTimer = 0;

    // Nhóm Instant: Cherry Bomb
    if (type === 'cherry_bomb') {
      this.fuseTimer = proto.fuseTime || 1.2;
      this.hasExploded = false;
    }

    // Nhóm Melee Swallow: Chomper
    if (type === 'chomper') {
      this.swallowDamage = proto.swallowDamage || 2400;
      this.chewDuration = proto.chewDuration || 20.0;
      this.chewTimer = 0;
      this.isChewing = false;
      this.bossDamage = proto.bossDamage || 200;
      this.bossAtkSpeed = proto.bossAtkSpeed || 1.0;
    }

    // Nhóm Melee: Snapdragon & Bonk Choy
    if (type === 'snapdragon') {
      this.flameTimer = 0;
      this.rangeCols = proto.rangeCols || 2.2;
    }
    if (type === 'bonk_choy') {
      this.punchAnimTimer = 0;
      this.punchDir = 1;
    }
    if (type === 'galio') {
      this.skill1Timer = 0;
      this.skill1Interval = proto.skill1Interval || 5.0;
      this.skill1AnimTimer = 0;
      this.punchAnimTimer = 0;
      this.punchDir = 1;
      this.deathSkillTriggered = false;
    }
    if (type === 'jhinplant') {
      this.magSize = proto.magSize || 4;
      this.ammo = this.magSize;
      this.isReloading = false;
      this.reloadDuration = proto.reloadDuration || 4.0;
      this.reloadTimer = 0;
      this.curtainBarrage = null;
    }

    // Hạt Dẻ Toàn Ảnh: Infi-nut
    if (type === 'infi_nut') {
      this.timeSinceLastHit = 0;
      this.regenDelay = proto.regenDelay || 15.0;
      this.regenRate = proto.regenRate || 160.0;
      this.isRecharging = false;
      this.rechargeTimer = 0;
      this.rechargeDuration = 15.0;
    }

    // Nấm Mặt Trời: Sun Shroom
    if (type === 'sun_shroom') {
      this.stage = 1;
      this.growthTimer = 0;
    }

    // Hành Tây Choáng: Stunion
    if (type === 'stunion') {
      this.activated = false;
    }

    // Cỏ Ba Lá: Blover (kích hoạt tức thì rồi biến mất)
    if (type === 'blover') {
      this.activated = false;
    }

    // Cỏ Gai: Spikeweed (cây sát đất không bị zombie ăn)
    this.isGroundPlant = !!(proto.isGroundPlant || type === 'spikeweed');

    // Mìn Khoai Tây: Potato Mine
    // 5s sau khi đặt xuống mới nhô lên. Bị ăn trước khi nhô lên sẽ mất luôn.
    if (type === 'potato_mine') {
      this.armed = false;
      this.armTimer = 0;
      this.armDuration = proto.armDuration || 5.0;
      this.damage = proto.damage || 2700;
    }

    // Nấm Thôi Miên: Hypno-shroom
    if (type === 'hypno_shroom') {
      this.isHypno = true;
    }

    // Nấm Nam Châm: Magnet-shroom
    if (type === 'magnet_shroom') {
      this.attractTimer = 0;
      this.attractInterval = proto.attractInterval || 10.0;
      this.attractedArmor = null;
    }

    // Đánh dấu hỗ trợ tiêu diệt bởi Anivia Dạng 2 (tạo Khối Băng HP = 1/2 cây gốc)
    this.aniviaAssistTimer = 0;
    this.frozenBlockSpawned = false;

    // Trạng thái choáng (bị Thresh Zombie ném xích) & Lão Hóa (Thần Khuyển)
    this.stunTimer = 0;
    this.hookedByThresh = null;
    this.witherTimer = 0;

    // Lux (Tiểu Thư Ánh Sáng): Tích 10 hạ/hỗ trợ -> Cầu Vồng Tối Thượng 600 DMG + choáng 2s
    if (type === 'lux') {
      this.killAssistCount = 0;
      this.ultThreshold = proto.ultThreshold || 10;
      this.beamAnimTimer = 0;
      this.ultAnimTimer = 0;
    }

    // Phù Thủy Syndra: Tích 1 quả cầu mỗi 3s (tối đa 3 stack), có zombie ném cầu 100 DMG (kill -> hồi 1 cầu),
    // không có zombie tích 3 stack phóng cầu cường hóa 600 DMG vào mục tiêu ATK cao nhất hàng
    if (type === 'syndra') {
      this.orbStacks = 0;
      this.maxOrbStacks = proto.maxOrbStacks || 3;
      this.orbTimer = 0;
      this.orbInterval = proto.orbInterval || 3.0;
      this.orbCastAnimTimer = 0;
      this.empoweredAnimTimer = 0;
    }

    // Kata Blade Rose: Tầm đánh 2 ô ném dao nảy tối đa 3 mục tiêu, sau 3s tấn công xoay bão dao 3x3 (3s, 30 DMG/0.25s, kill hồi đầy máu)
    if (type === 'kata') {
      this.isSpinning = false;
      this.spinTimer = 0;
      this.spinTickTimer = 0;
      this.spinChargeTimer = 0;
      this.hasAttackedZombie = false;
      this.throwAnimTimer = 0;
    }

    // Aurora Hoa Chuông Linh Giới: Bắn thỏ cầu vồng xuyên 4 mục tiêu (đẩy lùi mục tiêu đầu 1 ô),
    // mỗi 15s gọi pháp trận toàn sân (tránh hàng có Aurora khác) gây 200 DMG & đẩy lùi về ô 1 ngoài sân
    if (type === 'aurora') {
      this.skillTimer = 0;
      this.skillInterval = proto.skillInterval || 15.0;
      this.realmCastAnimTimer = 0;
    }
  }

  update(dt, gameState) {
    if (!this.alive) return;

    this.animTime += dt;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }
    if (this.witherTimer > 0) {
      this.witherTimer = Math.max(0, this.witherTimer - dt);
    }
    const atkDt = this.witherTimer > 0 ? dt * 0.5 : dt;
    if (this.aniviaAssistTimer > 0) {
      this.aniviaAssistTimer = Math.max(0, this.aniviaAssistTimer - dt);
    }
    if (this.beamAnimTimer > 0) {
      this.beamAnimTimer = Math.max(0, this.beamAnimTimer - dt);
    }
    if (this.ultAnimTimer > 0) {
      this.ultAnimTimer = Math.max(0, this.ultAnimTimer - dt);
    }
    if (this.orbCastAnimTimer > 0) {
      this.orbCastAnimTimer = Math.max(0, this.orbCastAnimTimer - dt);
    }
    if (this.empoweredAnimTimer > 0) {
      this.empoweredAnimTimer = Math.max(0, this.empoweredAnimTimer - dt);
    }
    if (this.throwAnimTimer > 0) {
      this.throwAnimTimer = Math.max(0, this.throwAnimTimer - dt);
    }
    if (this.realmCastAnimTimer > 0) {
      this.realmCastAnimTimer = Math.max(0, this.realmCastAnimTimer - dt);
    }

    // Nếu Thresh vừa chết / bị thôi miên, nhả xích & giải choáng ngay lập tức
    if (this.hookedByThresh && (!this.hookedByThresh.alive || this.hookedByThresh.isHypnotized || this.hookedByThresh.hookedPlant !== this)) {
      this.hookedByThresh = null;
      this.stunTimer = 0;
      if (this.state === 'stunned') {
        this.state = 'idle';
      }
    }

    if (this.stunTimer > 0) {
      this.stunTimer = Math.max(0, this.stunTimer - dt);
      this.state = 'stunned';
      if (this.stunTimer <= 0) {
        this.state = 'idle';
      }
      return;
    }

    if (this.shootStateTimer > 0) {
      this.shootStateTimer -= dt;
      if (this.shootStateTimer <= 0 && this.state === 'shooting') {
        this.state = 'idle';
      }
    }

    // ----------------------------------------------------
    // NHÓM 4: CHỨC NĂNG - Sunflower (25 Sun / 24s)
    // ----------------------------------------------------
    if (this.type === 'sunflower') {
      this.sunTimer += dt;
      if (this.sunTimer >= this.sunInterval - 1.2) {
        this.glow = Math.min(1.0, this.glow + dt * 2);
      } else {
        this.glow = Math.max(0.0, this.glow - dt * 2);
      }

      if (this.sunTimer >= this.sunInterval) {
        this.sunTimer = 0;
        this.glow = 0;
        const offsetX = (Math.random() - 0.5) * 24;
        const targetY = this.y + 15 + Math.random() * 8;
        gameState.spawnSun(this.x + offsetX, this.y - 12, targetY, false, this.sunAmount);
      }
    }

    // Cập nhật loạt đạn liên thanh Plant Food (Peashooter 60 viên, Repeater 90 viên + đại đạn 600 DMG, Snow Pea 60 viên băng)
    if (this.plantFoodBarrage && this.plantFoodBarrage.count > 0) {
      this.plantFoodBarrage.timer -= dt;
      if (this.plantFoodBarrage.timer <= 0) {
        this.plantFoodBarrage.timer = this.plantFoodBarrage.interval || 0.02;
        this.plantFoodBarrage.count--;

        const pType = this.plantFoodBarrage.type || 'pea';
        const pDmg = this.plantFoodBarrage.damage || 20;
        const jitterY = (Math.random() - 0.5) * 12;
        const proj = new Projectile(pType, this.row, this.x + 20, this.y - 15 + jitterY, pDmg, 8.5);
        gameState.projectiles.push(proj);

        if (this.plantFoodBarrage.count === 0 && this.plantFoodBarrage.finisher) {
          const f = this.plantFoodBarrage.finisher;
          const giantProj = new Projectile('pea', this.row, this.x + 25, this.y - 15, f.damage || 600, 7.5);
          giantProj.isGiant = true;
          gameState.projectiles.push(giantProj);
          gameState.spawnParticles(this.x + 25, this.y - 15, '#76ff03', 15);
        }
      }
    }

    // Cập nhật Đám mây sấm sét Plant Food của Sậy Sét (Lightning Reed) truy kích zombie máu trâu nhất
    if (this.stormCloud) {
      this.stormCloud.duration -= dt;
      if (this.stormCloud.duration <= 0) {
        this.stormCloud = null;
      } else {
        if (!this.stormCloud.target || !this.stormCloud.target.alive) {
          let highestHp = -1;
          let bestTarget = null;
          gameState.zombies.forEach(z => {
            if (isZombieOnLawn(z) && !z.isHypnotized && z.hp > highestHp) {
              highestHp = z.hp;
              bestTarget = z;
            }
          });
          this.stormCloud.target = bestTarget;
        }

        if (this.stormCloud.target && this.stormCloud.target.alive) {
          const targetX = this.stormCloud.target.x;
          const targetY = this.stormCloud.target.y - 45;
          this.stormCloud.x += (targetX - this.stormCloud.x) * Math.min(1.0, dt * 5.0);
          this.stormCloud.y += (targetY - this.stormCloud.y) * Math.min(1.0, dt * 5.0);

          this.stormCloud.strikeTimer = (this.stormCloud.strikeTimer || 0) - dt;
          if (this.stormCloud.strikeTimer <= 0) {
            this.stormCloud.strikeTimer = 0.25;
            this.stormCloud.target.takeDamage(60);
            gameState.spawnLightningArc(this.stormCloud.x, this.stormCloud.y, this.stormCloud.target.x, this.stormCloud.target.y);
            gameState.spawnParticles(this.stormCloud.target.x, this.stormCloud.target.y - 10, '#00e5ff', 5);
            if (gameState.audio && gameState.audio.playLightning) {
              gameState.audio.playLightning();
            }
          }
        }
      }
    }

    // ----------------------------------------------------
    // NHÓM 1: BẮN THẲNG (Straight) - Peashooter, Snow Pea, Repeater, Goo Peashooter
    // (Không bao gồm lightning_reed vì lightning_reed chỉ giật tia sét)
    // ----------------------------------------------------
    if (this.type !== 'lightning_reed' && this.type !== 'jhinplant' && (this.group === 'straight' || this.type === 'peashooter' || this.type === 'snow_pea' || this.type === 'repeater' || this.type === 'goo_peashooter')) {
      if (this.shootTimer > 0) {
        this.shootTimer -= atkDt;
      }

      // Xử lý bắn phát đạn phụ (Repeater burst)
      if (this.burstRemaining > 0) {
        this.burstTimer -= atkDt;
        if (this.burstTimer <= 0) {
          this.burstRemaining--;
          this.shoot(gameState, 'pea');
          this.burstTimer = 0.15;
        }
      }

      // Tìm zombie hoặc vật cản còn sống trên cùng hàng ở phía trước (hoặc Boss Rồng 2 hàng)
      const hasTargetAhead = gameState.zombies.some(z => {
        if (!isZombieOnLawn(z) || z.isHypnotized) return false;
        return isBossRowMatch(z, this.row) && z.x > this.x - 10;
      });

      if (hasTargetAhead && this.shootTimer <= 0 && this.burstRemaining === 0) {
        const proto = PLANT_CONFIG[this.type];
        this.shootTimer = (proto && proto.atkSpeed) ? proto.atkSpeed : this.atkSpeed;

        if (this.type === 'repeater') {
          this.shoot(gameState, 'pea');
          this.burstRemaining = 1; // Phát thứ 2 bắn sau 0.15s
          this.burstTimer = 0.15;
        } else if (this.type === 'snow_pea') {
          this.shoot(gameState, 'ice_pea');
        } else if (this.type === 'goo_peashooter') {
          this.shoot(gameState, 'goo_pea');
        } else {
          this.shoot(gameState, 'pea');
        }
      }
    }

    // ----------------------------------------------------
    // JHINPLANT (Hoa Súng Tử Vong) - 4 viên (125 DMG, viên 4 x4 = 500 DMG) + Nạp đạn 4s
    // ----------------------------------------------------
    if (this.type === 'jhinplant') {
      const proto = PLANT_CONFIG.jhinplant || {};

      // Plant Food: Bắn liên hoàn 4 phát đại bác tử vong
      if (this.curtainBarrage && this.curtainBarrage.shotsLeft > 0) {
        this.curtainBarrage.timer -= atkDt;
        if (this.curtainBarrage.timer <= 0) {
          this.curtainBarrage.timer = this.curtainBarrage.interval || 0.16;
          const isFourthPF = (this.curtainBarrage.shotsLeft === 1);
          this.curtainBarrage.shotsLeft--;

          const pfDmg = isFourthPF ? 1000 : 250;
          const proj = gameState.spawnProjectile(
            'jhin_bullet',
            this.row,
            this.x + 26,
            this.y - 14,
            pfDmg,
            13.0
          );
          proj.isJhinBullet = true;
          proj.isFourthShot = isFourthPF;
          this.state = 'shooting';
          this.shootStateTimer = 0.2;
          gameState.spawnParticles(this.x + 24, this.y - 14, isFourthPF ? '#ff1744' : '#e040fb', isFourthPF ? 10 : 5);
          if (gameState.audio && gameState.audio.playJhinShot) {
            gameState.audio.playJhinShot(isFourthPF);
          }
          if (this.curtainBarrage.shotsLeft === 0) {
            this.curtainBarrage = null;
          }
        }
      }

      if (this.isReloading) {
        this.reloadTimer -= atkDt;
        if (this.reloadTimer <= 0) {
          this.isReloading = false;
          this.reloadTimer = 0;
          this.ammo = this.magSize || 4;
          this.shootTimer = 0;
        }
      } else {
        if (this.shootTimer > 0) {
          this.shootTimer -= atkDt;
        }

        const hasTargetAhead = gameState.zombies.some(z => {
          if (!isZombieOnLawn(z) || z.isHypnotized) return false;
          return isBossRowMatch(z, this.row) && z.x > this.x - 10;
        });

        if (hasTargetAhead && this.shootTimer <= 0) {
          const isFourthShot = (this.ammo === 1);
          const baseDmg = proto.damage || 125;
          const dmg = isFourthShot ? baseDmg * (proto.fourthShotMultiplier || 4) : baseDmg;
          const speed = proto.projectileSpeed || 11.0;

          const proj = gameState.spawnProjectile(
            'jhin_bullet',
            this.row,
            this.x + 26,
            this.y - 14,
            dmg,
            speed
          );
          proj.isJhinBullet = true;
          proj.isFourthShot = isFourthShot;

          this.state = 'shooting';
          this.shootStateTimer = isFourthShot ? 0.3 : 0.2;
          gameState.spawnParticles(this.x + 24, this.y - 14, isFourthShot ? '#ff1744' : '#ba68c8', isFourthShot ? 10 : 4);
          if (gameState.audio && gameState.audio.playJhinShot) {
            gameState.audio.playJhinShot(isFourthShot);
          }

          this.ammo--;
          if (this.ammo <= 0) {
            this.isReloading = true;
            this.reloadTimer = proto.reloadDuration || 4.0;
            this.shootTimer = 0;
            if (gameState.spawnFloatingText) {
              gameState.spawnFloatingText(this.x, this.y - 30, 'IV! NẠP ĐẠN 4s', '#ff1744', 15);
            }
          } else {
            this.shootTimer = proto.atkSpeed || 2.2;
          }
        }
      }
    }

    // ----------------------------------------------------
    // LUX (Tiểu Thư Ánh Sáng) - 45 DMG/s tia sáng xuyên 1 hàng (cả vật cản)
    // Giết / hỗ trợ 10 zombie -> Luồng sáng 600 DMG + choáng 2s (reset 0/10)
    // ----------------------------------------------------
    if (this.type === 'lux') {
      if (this.shootTimer > 0) {
        this.shootTimer -= atkDt;
      }

      const targetsAhead = (gameState.zombies || []).filter(z => {
        if (!isZombieOnLawn(z) || z.isHypnotized) return false;
        return isBossRowMatch(z, this.row) && z.x > this.x - 10;
      });

      if (targetsAhead.length > 0 && this.shootTimer <= 0) {
        const proto = PLANT_CONFIG.lux || {};
        this.shootTimer = proto.atkSpeed || 1.0;
        const dmg = proto.damage || 45;
        this.beamAnimTimer = 0.28;
        this.state = 'shooting';
        this.shootStateTimer = 0.28;

        for (const z of targetsAhead) {
          if (!z.isObstacle && typeof z.registerLuxAssist === 'function') {
            z.registerLuxAssist(this);
          }
          z.takeDamage(dmg, false);
          gameState.spawnParticles(z.x, z.y - 10, '#fff59d', 3);
        }

        const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
        if (gameState.spawnAttackEffect) {
          gameState.spawnAttackEffect({
            kind: 'lux_beam',
            x: this.x,
            y: this.y,
            row: this.row,
            minRow: this.row,
            maxRow: this.row,
            startX: this.x + 18,
            endX: lawnRight,
            duration: 0.26
          });
        }
        if (gameState.audio && gameState.audio.playShoot) {
          gameState.audio.playShoot('laser');
        }
      }
    }

    // ----------------------------------------------------
    // PHÙ THỦY SYNDRA - Đánh thường 30 DMG / 0.5s
    // Skill mỗi 3s tạo 1 cầu: có zom ném cầu 100 DMG (kill -> hồi 1 cầu);
    // không có zom tích 3 stack -> phóng cầu cường hóa 600 DMG vào mục tiêu ATK cao nhất hàng
    // ----------------------------------------------------
    if (this.type === 'syndra') {
      const proto = PLANT_CONFIG.syndra || {};
      const maxStacks = this.maxOrbStacks || proto.maxOrbStacks || 3;
      const orbInterval = this.orbInterval || proto.orbInterval || 3.0;

      if (this.shootTimer > 0) {
        this.shootTimer -= atkDt;
      }

      const rowTargets = (gameState.zombies || []).filter(z => {
        if (!isZombieOnLawn(z) || z.isHypnotized) return false;
        return isBossRowMatch(z, this.row);
      });
      const targetsAhead = rowTargets.filter(z => z.x > this.x - 10);
      const combatZombies = rowTargets.filter(z => !z.isObstacle);

      // Đòn đánh thường: 30 DMG mỗi 0.5s lên kẻ địch phía trước trên hàng
      if (targetsAhead.length > 0 && this.shootTimer <= 0) {
        this.shootTimer = proto.atkSpeed || this.atkSpeed || 0.5;
        const dmg = proto.damage || 30;
        const speed = proto.projectileSpeed || 9.5;
        const bolt = gameState.spawnProjectile(
          'syndra_bolt',
          this.row,
          this.x + 18,
          this.y - 14,
          dmg,
          speed
        );
        bolt.isSyndraBolt = true;
        this.state = 'shooting';
        this.shootStateTimer = 0.2;
        gameState.spawnParticles(this.x + 18, this.y - 14, '#ba68c8', 3);
        if (gameState.audio && gameState.audio.playShoot) {
          gameState.audio.playShoot('pea');
        }
      }

      // Nếu đã tích đủ 3 stack cầu từ lúc chưa có zombie và vừa xuất hiện zombie -> phóng ngay Cầu Cường Hóa 600 DMG
      if (this.orbStacks >= maxStacks && combatZombies.length > 0) {
        this.orbStacks = 0;
        this.orbTimer = 0;
        this.fireSyndraEmpoweredOrb(gameState, combatZombies);
      } else if (this.orbStacks < maxStacks) {
        this.orbTimer += atkDt;
        if (this.orbTimer >= orbInterval) {
          this.orbTimer = 0;
          if (combatZombies.length === 0) {
            // Không có zombie trên hàng -> tích tụ 1 quả cầu quanh bản thân (tối đa 3 stack)
            this.orbStacks = Math.min(maxStacks, (this.orbStacks || 0) + 1);
            this.orbCastAnimTimer = 0.35;
            gameState.spawnParticles(this.x, this.y - 14, '#e040fb', 6);
            if (gameState.spawnFloatingText) {
              gameState.spawnFloatingText(this.x, this.y - 30, `TÍCH CẦU ${this.orbStacks}/${maxStacks} 🔮`, '#ce93d8', 13);
            }
          } else if (this.orbStacks + 1 >= maxStacks) {
            // Đủ 3 stack cầu khi có zombie -> phóng Cầu Cường Hóa 600 DMG vào mục tiêu ATK cao nhất hàng
            this.orbStacks = 0;
            this.fireSyndraEmpoweredOrb(gameState, combatZombies);
          } else {
            // Có zombie trên hàng -> ném ngay quả cầu 100 DMG (kill -> hồi lại 1 cầu)
            this.fireSyndraOrb(gameState, combatZombies);
          }
        }
      }
    }

    // ----------------------------------------------------
    // KATA BLADE ROSE - Ném dao 30 DMG/s nảy 3 mục tiêu (tầm 2 ô),
    // sau 3s tấn công zombie -> xoay bão dao 3x3 trong 3s (30 DMG / 0.25s, kill hồi đầy máu)
    // ----------------------------------------------------
    if (this.type === 'kata') {
      const proto = PLANT_CONFIG.kata || {};
      if (this.shootTimer > 0) {
        this.shootTimer -= atkDt;
      }

      if (this.isSpinning) {
        this.spinTimer -= atkDt;
        this.spinTickTimer -= atkDt;
        this.state = 'shooting';
        this.shootStateTimer = 0.25;

        if (this.spinTickTimer <= 0) {
          this.spinTickTimer = proto.spinInterval || 0.25;
          const spinDmg = this.empSpinDamage || proto.spinDamage || 30;
          const rangeX = CONFIG.CELL_WIDTH * 1.65;
          let killedZombie = false;

          (gameState.zombies || []).forEach(z => {
            if (!isZombieOnLawn(z) || z.isHypnotized) return;
            const rowMatch = isTwoRowBoss(z)
              ? (Math.abs(z.bossRow - this.row) <= 1 || Math.abs((z.bossRow + 1) - this.row) <= 1)
              : (Math.abs(z.row - this.row) <= 1);
            if (rowMatch && Math.abs(z.x - this.x) <= rangeX) {
              const wasAlive = z.alive;
              z.takeDamage(spinDmg, false);
              gameState.spawnParticles(z.x, z.y - 10, '#ff1744', 4);
              if (wasAlive && !z.alive && !z.isObstacle && this.hp < this.maxHp) {
                this.hp = this.maxHp;
                gameState.spawnParticles(this.x, this.y - 12, '#00e676', 12);
                if (gameState.spawnFloatingText) {
                  gameState.spawnFloatingText(this.x, this.y - 34, 'HỒI ĐẦY MÁU! 🌹', '#00e676', 15);
                }
              }
            }
          });

          if (gameState.spawnAttackEffect) {
            gameState.spawnAttackEffect({
              kind: 'kata_blade_storm',
              x: this.x,
              y: this.y,
              row: this.row,
              minRow: Math.max(0, this.row - 1),
              maxRow: Math.min(CONFIG.ROWS - 1, this.row + 1),
              startX: this.x - rangeX,
              endX: this.x + rangeX,
              duration: 0.24
            });
          }
          if (gameState.audio && gameState.audio.playMelee) {
            gameState.audio.playMelee();
          }
        }

        if (this.spinTimer <= 0) {
          this.isSpinning = false;
          this.empSpinDamage = 0;
          this.spinChargeTimer = 0;
          this.hasAttackedZombie = false;
          this.shootTimer = 0.2;
        }
      } else {
        const rangePx = CONFIG.CELL_WIDTH * (proto.rangeCells || 2.15);
        const targetsInRange = (gameState.zombies || []).filter(z => {
          if (!isZombieOnLawn(z) || z.isHypnotized) return false;
          return isBossRowMatch(z, this.row) && z.x >= this.x - 10 && z.x <= this.x + rangePx;
        });

        if (targetsInRange.length > 0) {
          if (this.hasAttackedZombie) {
            this.spinChargeTimer += atkDt;
          }

          if (this.shootTimer <= 0) {
            this.shootTimer = proto.atkSpeed || 1.0;
            this.hasAttackedZombie = true;
            let primary = targetsInRange[0];
            for (const z of targetsInRange) {
              if (z.x < primary.x) primary = z;
            }

            const dagger = gameState.spawnProjectile(
              'kata_dagger',
              this.row,
              this.x + 10,
              this.y - 26,
              proto.damage || 30,
              proto.projectileSpeed || 11.0
            );
            const initDist = Math.hypot(primary.x - dagger.x, (primary.y - 14) - dagger.y);
            dagger.isKataDagger = true;
            dagger.lockedTarget = primary;
            dagger.startX = dagger.x;
            dagger.startY = dagger.y;
            dagger.lobProgress = 0;
            dagger.lobDuration = Math.max(0.24, Math.min(0.46, initDist / 420));
            dagger.arcHeight = Math.max(68, Math.min(96, 58 + initDist * 0.18));
            dagger.bounceOriginRow = isTwoRowBoss(primary) ? primary.bossRow : primary.row;
            dagger.bounceOriginX = primary.x;
            dagger.hitIds = new Set();
            dagger.maxBounces = proto.bounceTargets || 3;

            this.throwAnimTimer = 0.25;
            this.state = 'shooting';
            this.shootStateTimer = 0.22;
            gameState.spawnParticles(this.x + 10, this.y - 26, '#ff5252', 4);
            if (gameState.audio && gameState.audio.playShoot) {
              gameState.audio.playShoot('pea');
            }
          }

          if (this.hasAttackedZombie && this.spinChargeTimer >= (proto.skillChargeDuration || 3.0)) {
            this.isSpinning = true;
            this.spinTimer = proto.spinDuration || 3.0;
            this.spinTickTimer = 0;
            if (gameState.spawnFloatingText) {
              gameState.spawnFloatingText(this.x, this.y - 32, 'BÃO DAO 3x3! 🔪🌹', '#ff1744', 16);
            }
          }
        }
      }
    }

    // ----------------------------------------------------
    // AURORA HOA CHUÔNG LINH GIỚI - Bắn thỏ cầu vồng 40 DMG/s xuyên 4 mục tiêu (đẩy lùi mục tiêu 1)
    // Mỗi 15s triệu hồi pháp trận toàn sân tại zombie gần sân nhất (tránh hàng Aurora khác)
    // ----------------------------------------------------
    if (this.type === 'aurora') {
      const proto = PLANT_CONFIG.aurora || {};
      if (this.shootTimer > 0) {
        this.shootTimer -= atkDt;
      }

      const targetsAhead = (gameState.zombies || []).filter(z => {
        if (!isZombieOnLawn(z) || z.isHypnotized) return false;
        return isBossRowMatch(z, this.row) && z.x > this.x - 10;
      });

      if (targetsAhead.length > 0 && this.shootTimer <= 0) {
        this.shootTimer = proto.atkSpeed || 2.0;
        const rabbit = gameState.spawnProjectile(
          'aurora_rabbit',
          this.row,
          this.x + 12,
          this.y - 18,
          proto.damage || 40,
          proto.projectileSpeed || 8.5
        );
        rabbit.isAuroraRabbit = true;
        rabbit.baseY = this.y - 14;
        rabbit.hitIds = new Set();
        rabbit.maxPierces = proto.pierceCount || 4;
        rabbit.firstKnockbackPx = CONFIG.CELL_WIDTH * (proto.firstKnockbackCells || 1.0);
        rabbit.flightTime = 0;

        this.state = 'shooting';
        this.shootStateTimer = 0.25;
        gameState.spawnParticles(this.x + 12, this.y - 16, '#80deea', 5);
        if (gameState.audio && gameState.audio.playShoot) {
          gameState.audio.playShoot('lobbed');
        }
      }

      this.skillTimer += atkDt;
      if (this.skillTimer >= (proto.skillInterval || 15.0)) {
        const triggered = this.triggerAuroraRealmSkill(gameState, proto.realmDamage || 200);
        if (triggered) {
          this.skillTimer = 0;
        } else {
          // Chưa có zombie trên sân -> giữ sẵn chiêu để tung ngay khi zombie xuất hiện
          this.skillTimer = proto.skillInterval || 15.0;
        }
      }
    }

    // ----------------------------------------------------
    // NHÓM 2: BẮN CẦU VỒNG (Lobbed) - Cabbage-pult, Melon-pult
    // Ưu tiên bắn zombie địch trước, khi không có zombie mới ưu tiên target Mộ (Tombstone)
    // ----------------------------------------------------
    if (this.group === 'lobbed') {
      if (this.shootTimer > 0) {
        this.shootTimer -= atkDt;
      }

      // 1. Tìm zombie địch bình thường (ưu tiên) hoặc Bia Mộ ở phía trước không cấp phát mảng/sắp xếp
      let targetZombie = null;
      let minZombieX = Infinity;
      let targetObstacle = null;
      let minObstacleX = Infinity;

      for (let i = 0; i < gameState.zombies.length; i++) {
        const z = gameState.zombies[i];
        if (!isZombieOnLawn(z) || z.isHypnotized) continue;
        if (!isBossRowMatch(z, this.row) || z.x <= this.x - 10) continue;

        if (!z.isObstacle) {
          if (z.x < minZombieX) {
            minZombieX = z.x;
            targetZombie = z;
          }
        } else if (z.row === this.row && z.x < minObstacleX) {
          minObstacleX = z.x;
          targetObstacle = z;
        }
      }

      const targetZombieToShoot = targetZombie || targetObstacle;

      if (targetZombieToShoot && this.shootTimer <= 0) {
        const proto = PLANT_CONFIG[this.type];
        this.shootTimer = (proto && proto.atkSpeed) ? proto.atkSpeed : this.atkSpeed;

        const spawnX = this.x - 10;
        const spawnY = this.y - 25;
        const projType = proto.projectileType || (this.type === 'melon_pult' ? 'melon' : 'cabbage');

        gameState.spawnLobbedProjectile(
          projType,
          this.row,
          spawnX,
          spawnY,
          targetZombieToShoot.x + 10,
          targetZombieToShoot.y,
          proto.damage,
          proto.splashDamage || 0,
          proto.splashRadiusCells || 1.2,
          proto.arcHeight || 95
        );

        if (gameState && gameState.audio) {
          gameState.audio.playShoot('lobbed');
        }

        this.state = 'shooting';
        this.shootStateTimer = 0.25;
      }
    }

    // ----------------------------------------------------
    // NHÓM 3: CẬN CHIẾN (Melee) - Bonk Choy & Snapdragon
    // ----------------------------------------------------
    if (this.type === 'bonk_choy') {
      if (this.shootTimer > 0) {
        this.shootTimer -= atkDt;
      }
      if (this.punchAnimTimer > 0) {
        this.punchAnimTimer -= dt;
      }

      // Phạm vi tấn công 2 ô trước mặt và 2 ô đằng sau lưng (rangeCols: 2 ô)
      const rangePx = CONFIG.CELL_WIDTH * 2.15;
      const targets = gameState.zombies.filter(z => {
        return isZombieOnLawn(z) && !z.isHypnotized && isBossRowMatch(z, this.row) && Math.abs(z.x - this.x) <= rangePx;
      });

      if (targets.length > 0 && this.shootTimer <= 0) {
        const proto = PLANT_CONFIG.bonk_choy;
        this.shootTimer = proto.atkSpeed || 0.5; // 0.5s mỗi lần đấm
        this.punchAnimTimer = 0.24;
        this.state = 'shooting';
        this.shootStateTimer = 0.24;

        const hasFront = targets.some(z => z.x >= this.x);
        const hasBack = targets.some(z => z.x < this.x);
        this.punchDir = (hasFront && hasBack) ? 0 : (hasBack ? -1 : 1);

        // Đấm 20 sát thương mỗi 0.5s cho các mục tiêu trong phạm vi
        targets.forEach(z => {
          z.takeDamage(proto.damage || 20);
          gameState.spawnParticles(z.x, z.y - 10, '#cddc39', 3);
        });
        if (gameState.spawnAttackEffect) {
          const lawnLeft = CONFIG.GRID_OFFSET_X;
          const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
          gameState.spawnAttackEffect({
            kind: 'bonk_choy_punch',
            x: this.x,
            y: this.y,
            row: this.row,
            minRow: this.row,
            maxRow: this.row,
            startX: Math.max(lawnLeft, this.x - rangePx),
            endX: Math.min(lawnRight, this.x + rangePx),
            punchDir: this.punchDir,
            duration: 0.22
          });
        }
        if (gameState && gameState.audio) {
          gameState.audio.playMelee && gameState.audio.playMelee();
        }
      }
    }

    if (this.type === 'snapdragon') {
      if (this.shootTimer > 0) {
        this.shootTimer -= atkDt;
      }
      if (this.flameTimer > 0) {
        this.flameTimer -= dt;
      }

      // Tầm 1x3 ô: hàng trên, hàng hiện tại, hàng dưới; 2.2 ô phía trước (không thiêu đồng minh thôi miên)
      const rangePx = CONFIG.CELL_WIDTH * 2.2;
      const targets = gameState.zombies.filter(z => {
        if (!isZombieOnLawn(z) || z.isHypnotized) return false;
        const rowMatch = isTwoRowBoss(z)
          ? (Math.abs(z.bossRow - this.row) <= 1 || Math.abs((z.bossRow + 1) - this.row) <= 1)
          : (Math.abs(z.row - this.row) <= 1);
        return rowMatch && z.x >= this.x && z.x <= this.x + rangePx;
      });

      if (targets.length > 0 && this.shootTimer <= 0) {
        const proto = PLANT_CONFIG.snapdragon;
        this.shootTimer = proto.atkSpeed || 1.0;
        this.flameTimer = 0.42;
        this.state = 'shooting';
        this.shootStateTimer = 0.42;

        // Phun lửa thiêu rụi toàn bộ mục tiêu trong phạm vi 1x3 ô
        targets.forEach(z => {
          z.takeDamage(proto.damage);
          gameState.spawnParticles(z.x, z.y - 8, '#ff5722', 4);
        });
        if (gameState.spawnAttackEffect) {
          const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
          gameState.spawnAttackEffect({
            kind: 'snapdragon_flame',
            x: this.x,
            y: this.y,
            row: this.row,
            minRow: Math.max(0, this.row - 1),
            maxRow: Math.min(CONFIG.ROWS - 1, this.row + 1),
            startX: this.x,
            endX: Math.min(lawnRight, this.x + rangePx),
            isPlantFood: false,
            duration: 0.36
          });
        }
      }
    }

    if (this.type === 'galio') {
      if (this.shootTimer > 0) {
        this.shootTimer -= atkDt;
      }
      if (this.punchAnimTimer > 0) {
        this.punchAnimTimer -= dt;
      }
      if (this.skill1AnimTimer > 0) {
        this.skill1AnimTimer -= dt;
      }

      const proto = PLANT_CONFIG.galio;
      const rangePx = CONFIG.CELL_WIDTH * 2.15; // 2 ô tính từ bản thân

      // Basic Attack: 2 ô tính từ bản thân, 50 sát thương / 0.5s
      const meleeTargets = gameState.zombies.filter(z => {
        if (!isZombieOnLawn(z) || z.isHypnotized) return false;
        return isBossRowMatch(z, this.row) && Math.abs(z.x - this.x) <= rangePx;
      });

      if (meleeTargets.length > 0 && this.shootTimer <= 0) {
        this.shootTimer = proto.atkSpeed || 0.5;
        this.punchAnimTimer = 0.22;
        this.state = 'shooting';
        this.shootStateTimer = 0.22;

        const hasFront = meleeTargets.some(z => z.x >= this.x);
        const hasBack = meleeTargets.some(z => z.x < this.x);
        this.punchDir = (hasFront && hasBack) ? 0 : (hasBack ? -1 : 1);

        meleeTargets.forEach(z => {
          z.takeDamage(proto.damage || 50);
          gameState.spawnParticles(z.x, z.y - 10, '#4fc3f7', 3);
        });

        if (gameState.spawnAttackEffect) {
          const lawnLeft = CONFIG.GRID_OFFSET_X;
          const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
          gameState.spawnAttackEffect({
            kind: 'galio_strike',
            x: this.x,
            y: this.y,
            row: this.row,
            minRow: this.row,
            maxRow: this.row,
            startX: Math.max(lawnLeft, this.x - rangePx),
            endX: Math.min(lawnRight, this.x + rangePx),
            punchDir: this.punchDir,
            duration: 0.22
          });
        }
        if (gameState && gameState.audio && gameState.audio.playMelee) {
          gameState.audio.playMelee();
        }
      }

      // Skill 1: Chỉ tích tiến độ khi đang tấn công zombie; đủ 5s bắn sóng năng lượng trước mặt (500 sát thương lên zombie đầu tiên trúng chiêu)
      if (meleeTargets.length > 0) {
        const interval = this.skill1Interval || 5.0;
        this.skill1Timer = Math.min(interval, this.skill1Timer + atkDt);
        if (this.skill1Timer >= interval) {
          this.skill1Timer = 0;
          this.skill1AnimTimer = 0.4;
          this.punchDir = 1;
          this.state = 'shooting';
          this.shootStateTimer = 0.35;

          const wave = new Projectile(
            'galio_wave',
            this.row,
            this.x + 22,
            this.y - 4,
            proto.skill1Damage || 500,
            proto.skill1Speed || 9.0
          );
          wave.isEnergyWave = true;
          wave.isSingleTarget = true;
          wave.hitZombies = new Set();
          gameState.projectiles.push(wave);

          gameState.spawnParticles(this.x + 20, this.y - 4, '#00e5ff', 6);
          if (gameState && gameState.audio && gameState.audio.playShoot) {
            gameState.audio.playShoot('laser');
          }
        }
      }
    }

    // ----------------------------------------------------
    // NHÓM 4: CHỨC NĂNG ĐẶC BIỆT - Cherry Bomb & Chomper
    // ----------------------------------------------------
    if (this.type === 'cherry_bomb') {
      if (!this.hasExploded) {
        this.fuseTimer -= dt;
        // Rung lắc & nhấp nháy đỏ sắp nổ
        if (this.fuseTimer <= 0) {
          this.hasExploded = true;
          this.alive = false;

          const proto = PLANT_CONFIG.cherry_bomb;
          const radiusPx = CONFIG.CELL_WIDTH * 1.6;

          // Nổ 3x3 gây 1800 DMG (không đánh đồng minh thôi miên)
          gameState.zombies.forEach(z => {
            if (!isZombieOnLawn(z) || z.isHypnotized) return;
            const rowMatch = isTwoRowBoss(z)
              ? (Math.abs(z.bossRow - this.row) <= 1 || Math.abs((z.bossRow + 1) - this.row) <= 1)
              : (Math.abs(z.row - this.row) <= 1);
            if (rowMatch && Math.abs(z.x - this.x) <= radiusPx) {
              z.takeDamage(proto.damage); // 1800 DMG
              gameState.spawnParticles(z.x, z.y, '#e53935', 12);
            }
          });

          if (gameState.spawnAttackEffect) {
            const lawnLeft = CONFIG.GRID_OFFSET_X;
            const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
            gameState.spawnAttackEffect({
              kind: 'blast_3x3',
              x: this.x,
              y: this.y,
              row: this.row,
              minRow: Math.max(0, this.row - 1),
              maxRow: Math.min(CONFIG.ROWS - 1, this.row + 1),
              startX: Math.max(lawnLeft, this.x - radiusPx),
              endX: Math.min(lawnRight, this.x + radiusPx),
              color: '#ff1744',
              duration: 0.55
            });
          }

          // Hiệu ứng khói lửa nổ tung
          gameState.spawnExplosion(this.x, this.y);
          if (gameState && gameState.audio) {
            gameState.audio.playExplosion('normal');
          }
        }
      }
    }

    if (this.type === 'chomper') {
      if (this.isChewing) {
        this.chewTimer -= dt;
        if (this.chewTimer <= 0) {
          this.isChewing = false;
          this.state = 'idle';
        }
      } else {
        if (this.shootTimer > 0) {
          this.shootTimer -= atkDt;
        }

        // Tầm cắn: Bao gồm ô của bản thân và 1 ô trước mặt (Ví dụ đặt sau Hạt Dẻ, khi zombie cắn hạt dẻ Chomper vẫn với tới ăn được)
        const cellLeft = this.x - CONFIG.CELL_WIDTH * 0.45;
        const reachRight = this.x + CONFIG.CELL_WIDTH * 1.85;
        const targetsInRange = gameState.zombies.filter(z => {
          if (!isZombieOnLawn(z) || z.isHypnotized) return false;
          return isBossRowMatch(z, this.row) && z.x >= cellLeft && z.x <= reachRight;
        });
        targetsInRange.sort((a, b) => a.x - b.x);
        const target = targetsInRange[0];

        if (target && this.shootTimer <= 0) {
          const proto = PLANT_CONFIG.chomper;
          this.state = 'shooting';
          this.shootStateTimer = 0.35;

          if (gameState.spawnAttackEffect) {
            const lawnLeft = CONFIG.GRID_OFFSET_X;
            const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
            gameState.spawnAttackEffect({
              kind: 'chomper_bite',
              x: this.x,
              y: this.y,
              row: this.row,
              minRow: this.row,
              maxRow: this.row,
              startX: Math.max(lawnLeft, cellLeft),
              endX: Math.min(lawnRight, reachRight),
              targetX: target.x,
              duration: 0.38
            });
          }

          const largeUnSwallowableTypes = ['jurassic_bully', 'gargantuar', 'zombot_dark_dragon', 'ancient_dragon_boss', 'azir_desert_emperor', 'renekton_croc', 'nasus_hound', 'lang_khach', 'troglobite'];
          const cannotSwallow = target.isBoss || target.isObstacle || target.isLargeFlying || target.flyingSize === 'large' || largeUnSwallowableTypes.includes(target.type);
          if (cannotSwallow) {
            // Với Boss / Vật cản / Zombie lớn (Kẻ bắt nạt, Gargantuar, Zomboss, Lãng khách): Cắn liên tục 200 dmg mỗi 1.0s
            this.shootTimer = proto.bossAtkSpeed || 1.0;
            target.takeDamage(proto.bossDamage || 200);
            gameState.spawnParticles(target.x, target.y - 10, '#ab47bc', 5);
          } else {
            // Với Zombie thường: Nuốt tức thì (2400 dmg), tiêu hóa 20s
            target.takeDamage(proto.swallowDamage);
            this.isChewing = true;
            this.chewTimer = proto.chewDuration || 20.0;
            this.state = 'chewing';
            gameState.spawnParticles(target.x, target.y - 10, '#7b1fa2', 8);
          }
          if (gameState && gameState.audio) {
            gameState.audio.playChomp && gameState.audio.playChomp();
          }
        }
      }
    }

    // ----------------------------------------------------
    // CÁC CÂY TƯƠNG THÍCH KHÁC (Sậy Sét, Stunion, Infi-nut, Sun-shroom)
    // ----------------------------------------------------
    if (this.type === 'lightning_reed') {
      if (this.shootTimer > 0) this.shootTimer -= atkDt;
      const validZombies = gameState.zombies.filter(z => {
        if (!isZombieOnLawn(z) || z.isHypnotized) return false;
        const isBossTarget = isTwoRowBoss(z) && (Math.abs(z.bossRow - this.row) <= 1 || Math.abs((z.bossRow + 1) - this.row) <= 1);
        const matchesRow = Math.abs(z.row - this.row) <= 1 || isBossTarget;
        return matchesRow && z.x >= this.x - 40;
      });
      if (validZombies.length > 0 && this.shootTimer <= 0) {
        this.shootTimer = this.shootInterval;
        this.attackLightning(validZombies, gameState);
      }
    }

    if (this.type === 'stunion') {
      if (!this.activated) {
        const proto = PLANT_CONFIG.stunion || {};
        const stunDur = proto.stunDuration || 5.0;
        const gasCols = proto.gasRangeCols || 2;
        const lawnLeft = CONFIG.GRID_OFFSET_X;
        const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
        const minX = Math.max(lawnLeft, this.x - CONFIG.CELL_WIDTH * 0.5);
        const maxX = Math.min(lawnRight, this.x + (gasCols + 0.5) * CONFIG.CELL_WIDTH);

        const matchesStunionHit = (z) => {
          if (!isZombieOnLawn(z) || z.isHypnotized || z.isObstacle) return false;
          return isBossRowMatch(z, this.row) && z.x >= minX && z.x <= maxX;
        };

        const targetZombie = gameState.zombies.find(matchesStunionHit);
        if (targetZombie) {
          this.activated = true;
          this.state = 'shooting';
          gameState.zombies.forEach(z => {
            if (matchesStunionHit(z)) {
              z.applyStun(stunDur);
            }
          });
          gameState.spawnGasCloud(this.x + 35, this.y);
          if (gameState.spawnAttackEffect) {
            gameState.spawnAttackEffect({
              kind: 'stunion_gas',
              x: this.x,
              y: this.y,
              row: this.row,
              minRow: this.row,
              maxRow: this.row,
              startX: minX,
              endX: maxX,
              isPlantFood: false,
              duration: 0.85
            });
          }
          setTimeout(() => { this.alive = false; }, 300);
        }
      }
    }

    // Cỏ Ba Lá (Blover): Thổi bay toàn bộ zombie bay hoặc đang ở trạng thái lơ lửng ngay lập tức rồi biến mất
    if (this.type === 'blover') {
      if (!this.activated) {
        this.activated = true;
        this.alive = false;
        let blownCount = 0;

        // 1. Thổi bay Imp đang bay trên không (do Gargantuar ném)
        if (gameState.flyingImps && gameState.flyingImps.length > 0) {
          for (const fImp of gameState.flyingImps) {
            if (fImp && fImp.alive) {
              fImp.alive = false;
              blownCount++;
              gameState.spawnParticles(fImp.x, fImp.y, '#76ff03', 10);
              gameState.spawnParticles(fImp.x, fImp.y, '#b2ebf2', 8);
              if (gameState.spawnFloatingText) {
                gameState.spawnFloatingText(fImp.x, fImp.y - 18, 'THỔI BAY! 🍀💨', '#76ff03', 15);
              }
            }
          }
        }

        // 2. Thổi bay mọi zombie bay nhỏ / đang lơ lửng trên không (như Pole Vaulting đang nhảy trên không, flyingSize !== 'large')
        if (gameState.zombies && gameState.zombies.length > 0) {
          for (const z of gameState.zombies) {
            if (!z || !z.alive || z.isHypnotized || z.isObstacle || z.isBoss) continue;
            const isAirborne = !!(z.isVaulting || z.isFlying || z.isAirborne || z.isFloating);
            if (isAirborne) {
              // Zombie bay lớn không thể bị thổi bay
              if (z.isLargeFlying || z.flyingSize === 'large') {
                gameState.spawnParticles(z.x, z.y - 14, '#80deea', 8);
                if (gameState.spawnFloatingText) {
                  gameState.spawnFloatingText(z.x, z.y - 34, 'KHÁNG THỔI BAY! ❄️', '#80deea', 15);
                }
                continue;
              }
              z.isBlownAway = true;
              z.isVaulting = false;
              z.alive = false;
              z.deathTimer = 99;
              blownCount++;
              gameState.spawnParticles(z.x, z.y - 10, '#76ff03', 12);
              gameState.spawnParticles(z.x, z.y - 10, '#e0f7fa', 10);
              if (gameState.spawnFloatingText) {
                gameState.spawnFloatingText(z.x, z.y - 24, 'THỔI BAY! 🍀💨', '#76ff03', 16);
              }
            }
          }
        }

        const lawnLeft = CONFIG.GRID_OFFSET_X;
        const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
        if (gameState.spawnAttackEffect) {
          gameState.spawnAttackEffect({
            kind: 'blover_wind',
            x: this.x,
            y: this.y,
            row: this.row,
            minRow: 0,
            maxRow: CONFIG.ROWS - 1,
            startX: lawnLeft,
            endX: lawnRight,
            blownCount,
            duration: 0.75
          });
        }
        gameState.spawnParticles(this.x, this.y, '#76ff03', 14);
        gameState.spawnParticles(this.x, this.y, '#b2ebf2', 10);
        if (gameState.spawnFloatingText) {
          const msg = blownCount > 0 ? `THỔI BAY ${blownCount} ZOM! 🍀💨` : 'GIÓ CỎ BA LÁ! 🍀💨';
          gameState.spawnFloatingText(this.x, this.y - 24, msg, '#b9f6ca', 16);
        }
        if (gameState.audio && gameState.audio.playPlant) {
          gameState.audio.playPlant('blover');
        }
      }
      return;
    }

    // Cỏ Gai (Spikeweed): Gây 15 sát thương mỗi giây cho zombie đi qua ô
    if (this.type === 'spikeweed') {
      if (this.shootTimer > 0) {
        this.shootTimer -= atkDt;
      }
      if (this.shootTimer <= 0 && gameState.zombies && gameState.zombies.length > 0) {
        const targetsOnTile = gameState.zombies.filter(z => {
          if (!isZombieOnLawn(z) || z.isHypnotized || z.isObstacle) return false;
          if (z.isVaulting || z.isFlying || z.isAirborne || z.isFloating) return false;
          return isBossRowMatch(z, this.row) && Math.abs(z.x - this.x) <= CONFIG.CELL_WIDTH * 0.55;
        });

        if (targetsOnTile.length > 0) {
          const proto = PLANT_CONFIG.spikeweed || {};
          this.shootTimer = this.shootInterval || proto.attackInterval || 1.0;
          const dmg = this.damage || proto.damage || 15;
          this.state = 'shooting';
          this.shootStateTimer = 0.25;
          for (const target of targetsOnTile) {
            target.takeDamage(dmg, false);
            gameState.spawnParticles(target.x, target.y + 18, '#cfd8dc', 4);
          }
        }
      }
    }

    if (this.type === 'infi_nut') {
      // Khi Infi-nut bị tiêu diệt bởi zombie thường: Để lại máy chiếu, sau 15s hồi sinh đầy máu!
      if (this.isRecharging) {
        this.rechargeTimer -= dt;
        if (this.rechargeTimer <= 0) {
          this.isRecharging = false;
          this.rechargeTimer = 0;
          this.hp = this.maxHp;
          this.state = 'idle';
          gameState.spawnParticles(this.x, this.y, '#00e5ff', 25);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(this.x, this.y - 25, 'HỒI SINH! 🛡️', '#00e5ff', 16);
          }
          if (gameState && gameState.audio) {
            gameState.audio.playPlant();
          }
        }
      } else {
        // Tự phục hồi máu bình thường khi không nhận sát thương sau 15s
        this.timeSinceLastHit += dt;
        if (this.timeSinceLastHit >= this.regenDelay && this.hp < this.maxHp) {
          this.hp = Math.min(this.maxHp, this.hp + this.regenRate * dt);
        }
      }
    }

    if (this.type === 'sun_shroom') {
      this.growthTimer += dt;
      const proto = PLANT_CONFIG.sun_shroom;
      if (this.stage === 1 && this.growthTimer >= proto.stage2Time) {
        this.stage = 2;
        gameState.spawnParticles(this.x, this.y, '#ffd54f', 6);
      } else if (this.stage === 2 && this.growthTimer >= proto.stage3Time) {
        this.stage = 3;
        gameState.spawnParticles(this.x, this.y, '#ffa000', 8);
      }
      this.sunTimer += dt;
      if (this.sunTimer >= this.sunInterval) {
        this.sunTimer = 0;
        const amount = this.stage === 1 ? proto.stage1Sun : (this.stage === 2 ? proto.stage2Sun : proto.stage3Sun);
        gameState.spawnSun(this.x, this.y - 10, this.y + 15, false, amount);
      }
    }

    // ----------------------------------------------------
    // NẤM NAM CHÂM (Magnet-shroom)
    // ----------------------------------------------------
    // NẤM NAM CHÂM (Magnet-shroom)
    // Hút thùng sắt, mũ giáp kim loại của zombie trên sân (bán kính 7.5 ô)
    // ----------------------------------------------------
    if (this.type === 'magnet_shroom') {
      if (this.attractTimer > 0) {
        this.attractTimer -= dt;
        if (this.attractTimer <= 0) {
          this.attractedArmor = null; // Tiêu hóa xong thùng sắt, sẵn sàng hút tiếp
        }
      } else {
        // Tìm zombie gần nhất còn giáp sắt/thùng sắt
        const candidateZombie = gameState.zombies.find(z => {
          return isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle && !z.nonMetalArmor && (z.armorHp > 0 || z.type === 'buckethead') && Math.hypot(z.x - this.x, z.y - this.y) <= CONFIG.CELL_WIDTH * 7.5;
        });

        if (candidateZombie) {
          candidateZombie.armorHp = 0; // Hút phăng giáp sắt!
          candidateZombie.hasShield = false;
          // Đưa máu về máu cơ bản (190 HP của zombie thường) để loại bỏ hoàn toàn lượng máu khủng của giáp thùng sắt
          if (candidateZombie.baseHp && candidateZombie.hp > candidateZombie.baseHp) {
            candidateZombie.hp = candidateZombie.baseHp;
          }
          this.attractedArmor = 'bucket';
          this.attractTimer = this.attractInterval || 12.0;

          // Hiệu ứng tia từ tính và mảnh kim loại bay về phía nấm nam châm
          gameState.spawnParticles(this.x, this.y - 20, '#b0bec5', 18);
          gameState.spawnParticles(this.x, this.y - 20, '#00e5ff', 12);
          gameState.spawnParticles(candidateZombie.x, candidateZombie.y - 20, '#b0bec5', 14);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(this.x, this.y - 28, 'HÚT KIM LOẠI! 🧲', '#00e5ff', 16);
            gameState.spawnFloatingText(candidateZombie.x, candidateZombie.y - 25, 'MẤT THÙNG SẮT! ⛓️', '#b0bec5', 14);
          }
          if (gameState.audio && gameState.audio.playHit) {
            gameState.audio.playHit();
          }
        }
      }
    }

    // ----------------------------------------------------
    // MÌN KHOAI TÂY (Potato Mine)
    // ----------------------------------------------------
    if (this.type === 'potato_mine') {
      if (!this.armed) {
        this.armTimer += dt;
        if (this.armTimer >= this.armDuration) {
          this.armed = true;
          gameState.spawnParticles(this.x, this.y, '#ffd54f', 8);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(this.x, this.y - 25, 'SẴN SÀNG! 🥔', '#76ff03', 14);
          }
        }
      } else {
        // Đã nhô lên: Quét Zombie đi dưới đất bước tới (bỏ qua zombie bay, không kích hoạt mìn)
        const triggerZombie = gameState.zombies.find(z => {
          if (!isZombieOnLawn(z) || z.isHypnotized || z.isObstacle || z.row !== this.row) return false;
          if (z.isFlying || z.isAirborne || z.isFloating || z.isVaulting) return false;
          const dist = Math.abs(z.x - this.x);
          return dist <= (z.type === 'gargantuar' ? 65 : 42) || (z.isEating && z.eatingPlant === this);
        });

        if (triggerZombie) {
          this.alive = false;
          // Hiệu ứng nổ SPUDOW!
          gameState.spawnParticles(this.x, this.y, '#ff6f00', 25);
          gameState.spawnParticles(this.x, this.y, '#ffd54f', 20);
          gameState.spawnParticles(this.x, this.y, '#5d4037', 15);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(this.x, this.y - 32, 'SPUDOW! 💥', '#ff6f00', 22);
          }
          if (gameState && gameState.audio) {
            gameState.audio.playExplosion('spudow');
          }

          // Nổ sát thương 2700 trong phạm vi 3x3 ô (không gây sát thương cho zombie đang bay)
          const radiusX = CONFIG.CELL_WIDTH * 1.5;
          if (gameState.spawnAttackEffect) {
            const lawnLeft = CONFIG.GRID_OFFSET_X;
            const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
            gameState.spawnAttackEffect({
              kind: 'blast_3x3',
              x: this.x,
              y: this.y,
              row: this.row,
              minRow: Math.max(0, this.row - 1),
              maxRow: Math.min(CONFIG.ROWS - 1, this.row + 1),
              startX: Math.max(lawnLeft, this.x - radiusX),
              endX: Math.min(lawnRight, this.x + radiusX),
              color: '#ff9100',
              duration: 0.55
            });
          }
          gameState.zombies.forEach(z => {
            if (isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle && !z.isFlying && !z.isAirborne && !z.isFloating && !z.isVaulting) {
              const rowMatch = isTwoRowBoss(z)
                ? (Math.abs(z.bossRow - this.row) <= 1 || Math.abs((z.bossRow + 1) - this.row) <= 1)
                : (Math.abs(z.row - this.row) <= 1);
              const colDist = Math.abs(z.x - this.x);
              if (rowMatch && colDist <= radiusX) {
                z.takeDamage(this.damage); // 2700 DMG
              }
            }
          });
        }
      }
    }
  }

  shoot(gameState, projType = 'pea') {
    const proto = PLANT_CONFIG[this.type] || {};
    const spawnX = this.x + 24;
    const spawnY = this.y - 12;
    const dmg = proto.damage || this.damage || 20;
    const speed = proto.projectileSpeed || 6.5;

    gameState.spawnProjectile(projType, this.row, spawnX, spawnY, dmg, speed);
    if (gameState && gameState.audio) {
      gameState.audio.playShoot(projType);
    }
    this.state = 'shooting';
    this.shootStateTimer = 0.2;
  }

  attackLightning(validZombies, gameState) {
    this.state = 'shooting';
    this.shootStateTimer = 0.22;
    let primaryTarget = null;
    let minDistance = Infinity;

    for (const z of validZombies) {
      const dist = Math.hypot(z.x - this.x, z.y - this.y);
      if (dist < minDistance) {
        minDistance = dist;
        primaryTarget = z;
      }
    }
    if (!primaryTarget) return;

    // Mục tiêu chính: 10 sát thương sét
    primaryTarget.takeDamage(10);
    gameState.spawnLightningArc(this.x + 8, this.y - 20, primaryTarget.x, primaryTarget.y - 8);
    gameState.spawnParticles(primaryTarget.x, primaryTarget.y - 8, '#00e5ff', 4);
    if (gameState && gameState.audio) {
      gameState.audio.playZap && gameState.audio.playZap();
    }

    // Sát thương lan tối đa 3 mục tiêu (1 mục tiêu chính + tối đa 2 mục tiêu lan)
    // Khoảng cách từ mục tiêu chính tới mục tiêu lan không quá 3 ô (3 * CONFIG.CELL_WIDTH)
    const maxChainDistPx = CONFIG.CELL_WIDTH * 3.0;
    const chainCandidates = validZombies.filter(z => {
      if (z.id === primaryTarget.id || !z.alive) return false;
      const distFromPrimary = Math.hypot(z.x - primaryTarget.x, z.y - primaryTarget.y);
      return distFromPrimary <= maxChainDistPx;
    });

    chainCandidates.sort((a, b) => Math.hypot(a.x - primaryTarget.x, a.y - primaryTarget.y) - Math.hypot(b.x - primaryTarget.x, b.y - primaryTarget.y));

    for (const chainZ of chainCandidates.slice(0, 2)) {
      chainZ.takeDamage(10);
      gameState.spawnLightningArc(primaryTarget.x, primaryTarget.y - 8, chainZ.x, chainZ.y - 8);
      gameState.spawnParticles(chainZ.x, chainZ.y - 8, '#00e5ff', 3);
    }
  }

  triggerPlantFood(gameState) {
    if (!gameState) return false;

    // 5. Cây tức thời: Cherry Bomb KHÔNG thể dùng Plant Food
    if (this.type === 'cherry_bomb') {
      return false;
    }

    // Ngắt đòn khạc lửa của Zombot Dark Dragon nếu rồng đang chuẩn bị hoặc đang khạc lửa
    const bossDragon = gameState.zombies.find(z => z.alive && z.type === 'zombot_dark_dragon');
    if (bossDragon) {
      bossDragon.cancelFireBreath(gameState);
    }

    // Hiệu ứng chung: Hồi đầy máu và phát tán hào quang lá thần
    this.hp = this.maxHp;
    gameState.spawnParticles(this.x, this.y, '#76ff03', 25);
    gameState.spawnParticles(this.x, this.y, '#ffd54f', 15);

    // ====================================================
    // 1. NHÓM SẢN XUẤT MẶT TRỜI
    // ====================================================
    if (this.type === 'sunflower') {
      // Hướng Dương: Lập tức sản xuất ra 150 mặt trời (6 cụm x 25)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI * 2;
        const targetX = this.x + Math.cos(angle) * 35;
        const targetY = this.y + Math.sin(angle) * 30;
        gameState.spawnSun(this.x, this.y - 10, targetY, false, 25);
      }
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, '+150 SUN! ☀️', '#ffd54f', 18);
      }
      return true;
    }

    if (this.type === 'sun_shroom') {
      // Nấm Mặt Trời: Đạt kích thước lớn nhất (stage 3) và tạo 225 mặt trời (3 cụm x 75)
      this.stage = 3;
      this.growthTimer = (PLANT_CONFIG.sun_shroom && PLANT_CONFIG.sun_shroom.stage3Time) || 90.0;
      for (let i = 0; i < 3; i++) {
        const offsetX = (i - 1) * 28;
        gameState.spawnSun(this.x + offsetX, this.y - 15, this.y + 20, false, 75);
      }
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, 'MAX SIZE! +225 SUN! 🍄☀️', '#ffa000', 18);
      }
      return true;
    }

    // ====================================================
    // 2. NHÓM CÂY TẤN CÔNG TẦM XA (BẮN ĐẬU & BẮN ĐÁ)
    // ====================================================
    if (this.type === 'peashooter') {
      // Đậu Bắn Súng: Loạt đạn liên thanh gồm 60 viên đậu, 20 DMG/viên = 1200 tổng sát thương
      this.plantFoodBarrage = {
        count: 60,
        interval: 0.02,
        timer: 0,
        type: 'pea',
        damage: 20
      };
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, 'BARRAGE 60 PEAS! 🍃', '#76ff03', 16);
      }
      return true;
    }

    if (this.type === 'repeater') {
      // Đậu Nòng Đôi: Loạt 90 viên đậu kết thúc bằng viên đậu khổng lồ 600 DMG
      this.plantFoodBarrage = {
        count: 90,
        interval: 0.016,
        timer: 0,
        type: 'pea',
        damage: 20,
        finisher: { damage: 600 }
      };
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, 'GATLING + GIANT PEA! 💥', '#76ff03', 16);
      }
      return true;
    }

    if (this.type === 'snow_pea') {
      // Đậu Băng: Tạo dải băng chạy dọc hàng làm chậm và đóng băng zombie + 60 viên đậu băng liên thanh
      gameState.zombies.forEach(z => {
        if (isZombieOnLawn(z) && !z.isHypnotized && z.row === this.row) {
          z.applySlow(0.3, 12.0); // Làm chậm nặng
          z.applyStun(3.0, true); // Đóng băng 3s (isFreeze = true)
          z.takeDamage(100);
          gameState.spawnParticles(z.x, z.y - 10, '#00e5ff', 8);
        }
      });
      // Vệt sương băng trên toàn hàng
      for (let c = 0; c < CONFIG.COLS; c++) {
        const iceX = CONFIG.GRID_OFFSET_X + c * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
        gameState.spawnParticles(iceX, this.y + 15, '#e0f7fa', 3);
      }
      this.plantFoodBarrage = {
        count: 60,
        interval: 0.02,
        timer: 0,
        type: 'ice_pea',
        damage: 20
      };
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, 'BLIZZARD LANE! ❄️', '#00e5ff', 16);
      }
      return true;
    }

    if (this.type === 'goo_peashooter') {
      // Đậu Độc: Nhổ viên đạn độc khổng lồ lăn dọc hàng, xô ngã, 1000 impact damage + dải độc 8s
      const boulder = new Projectile('goo_pea', this.row, this.x + 25, this.y - 8, 1000, 5.5);
      boulder.isRollingPoisonBoulder = true;
      boulder.hitZombies = new Set();
      gameState.projectiles.push(boulder);
      gameState.spawnParticles(this.x + 25, this.y - 8, '#d500f9', 20);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, 'POISON BOULDER! ☣️', '#d500f9', 18);
      }
      return true;
    }

    if (this.type === 'cabbage_pult') {
      // Bắp Cải: Bắn bắp cải lớn vào tất cả zombie trên sân, mỗi bắp cải 200 sát thương
      const livingZombies = gameState.zombies.filter(z => isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle);
      if (livingZombies.length > 0) {
        livingZombies.forEach(z => {
          gameState.spawnLobbedProjectile('cabbage', z.row, this.x - 10, this.y - 25, z.x, z.y, 200, 0, 1.0, 110);
        });
      } else {
        // Mưa bắp cải khắp các hàng nếu chưa có zombie
        for (let r = 0; r < CONFIG.ROWS; r++) {
          const targetX = CONFIG.GRID_OFFSET_X + 6 * CONFIG.CELL_WIDTH;
          const targetY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
          gameState.spawnLobbedProjectile('cabbage', r, this.x - 10, this.y - 25, targetX, targetY, 200, 0, 1.0, 110);
        }
      }
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, 'CABBAGE BARRAGE! 🥬', '#8bc34a', 18);
      }
      return true;
    }

    if (this.type === 'melon_pult') {
      // Dưa Hấu: Bắn dưa hấu khổng lồ vào tất cả zombie trên màn hình (200 direct + 100 AoE)
      const livingZombies = gameState.zombies.filter(z => isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle);
      if (livingZombies.length > 0) {
        livingZombies.forEach(z => {
          gameState.spawnLobbedProjectile('melon', z.row, this.x - 10, this.y - 25, z.x, z.y, 200, 100, 1.5, 120);
        });
      } else {
        for (let r = 0; r < CONFIG.ROWS; r++) {
          const targetX = CONFIG.GRID_OFFSET_X + 6 * CONFIG.CELL_WIDTH;
          const targetY = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
          gameState.spawnLobbedProjectile('melon', r, this.x - 10, this.y - 25, targetX, targetY, 200, 100, 1.5, 120);
        }
      }
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, 'MELON RAIN! 🍉', '#4caf50', 18);
      }
      return true;
    }

    // ====================================================
    // 3. NHÓM CẬN CHIẾN & DIỆN RỘNG
    // ====================================================
    if (this.type === 'bonk_choy') {
      // Đấm Bốc: Tung chuỗi đấm liên hoàn quét mọi hướng phạm vi 3x3 (1500 DMG)
      this.state = 'shooting';
      this.punchAnimTimer = 1.0;
      this.punchDir = 0;
      const radiusPx = CONFIG.CELL_WIDTH * 1.8;
      if (gameState.spawnAttackEffect) {
        const lawnLeft = CONFIG.GRID_OFFSET_X;
        const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
        gameState.spawnAttackEffect({
          kind: 'bonk_choy_flurry',
          x: this.x,
          y: this.y,
          row: this.row,
          minRow: Math.max(0, this.row - 1),
          maxRow: Math.min(CONFIG.ROWS - 1, this.row + 1),
          startX: Math.max(lawnLeft, this.x - radiusPx),
          endX: Math.min(lawnRight, this.x + radiusPx),
          duration: 0.9
        });
      }
      gameState.zombies.forEach(z => {
        if (isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle) {
          if (Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.x) <= radiusPx) {
            z.takeDamage(1500);
            gameState.spawnParticles(z.x, z.y - 10, '#cddc39', 12);
            gameState.spawnParticles(z.x, z.y - 10, '#ffeb3b', 8);
          }
        }
      });
      if (gameState.audio && gameState.audio.playMelee) {
        gameState.audio.playMelee();
      }
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 28, '1500 DMG FLURRY! 🥊💥', '#cddc39', 18);
      }
      return true;
    }

    if (this.type === 'snapdragon') {
      // Rồng Lửa: Nhảy lên không trung và phun luồng lửa lớn 3x3 phía trước mặt (1200 DMG)
      this.state = 'shooting';
      this.flameTimer = 1.2;
      const maxRangeX = this.x + CONFIG.CELL_WIDTH * 3.2;
      if (gameState.spawnAttackEffect) {
        const lawnLeft = CONFIG.GRID_OFFSET_X;
        const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
        gameState.spawnAttackEffect({
          kind: 'snapdragon_flame',
          x: this.x,
          y: this.y,
          row: this.row,
          minRow: Math.max(0, this.row - 1),
          maxRow: Math.min(CONFIG.ROWS - 1, this.row + 1),
          startX: Math.max(lawnLeft, this.x - 10),
          endX: Math.min(lawnRight, maxRangeX),
          isPlantFood: true,
          duration: 1.05
        });
      }
      gameState.zombies.forEach(z => {
        if (isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle) {
          if (Math.abs(z.row - this.row) <= 1 && z.x >= this.x - 10 && z.x <= maxRangeX) {
            z.takeDamage(1200);
            gameState.spawnParticles(z.x, z.y - 10, '#ff5722', 14);
            gameState.spawnParticles(z.x, z.y - 10, '#ff9800', 10);
          }
        }
      });
      if (gameState.audio && gameState.audio.playExplosion) {
        gameState.audio.playExplosion('fire');
      }
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 28, '1200 FIRE BLAST! 🔥🐉', '#ff5722', 18);
      }
      return true;
    }

    if (this.type === 'lightning_reed') {
      // Sậy Sét: Triệu hồi đám mây sấm sét nhỏ tự đuổi theo zombie có máu cao nhất, giật sét liên tục 10s
      this.stormCloud = {
        x: this.x,
        y: this.y - 50,
        duration: 10.0,
        strikeTimer: 0,
        target: null
      };
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 28, 'STORM CLOUD! ⚡☁️', '#00e5ff', 18);
      }
      return true;
    }

    if (this.type === 'chomper') {
      // Hoa Ăn Thịt: Hút nuốt chửng tối đa 3 zombie phía trước trên hàng, sau đó ợ hơi đẩy lùi và làm choáng các zombie còn lại
      const rowZombies = gameState.zombies.filter(z => {
        if (!isZombieOnLawn(z) || z.isHypnotized || z.x < this.x - 20) return false;
        return isBossRowMatch(z, this.row);
      });
      rowZombies.sort((a, b) => a.x - b.x);

      const largeUnSwallowableTypes = ['jurassic_bully', 'gargantuar', 'zombot_dark_dragon', 'ancient_dragon_boss', 'azir_desert_emperor', 'renekton_croc', 'nasus_hound', 'lang_khach', 'troglobite'];
      const swallowTargets = rowZombies.slice(0, 3);
      swallowTargets.forEach(target => {
        if (target.isBoss || target.isObstacle || largeUnSwallowableTypes.includes(target.type)) {
          target.takeDamage(1500);
        } else {
          target.takeDamage(99999);
        }
        gameState.spawnParticles(target.x, target.y - 10, '#7b1fa2', 15);
      });

      // Ợ hơi tạo luồng gió đẩy lùi tất cả zombie còn lại trên hàng và gây choáng 2s
      gameState.zombies.forEach(z => {
        if (isZombieOnLawn(z) && !z.isHypnotized && z.row === this.row && !swallowTargets.includes(z)) {
          z.applyKnockback(180);
          z.applyStun(2.0);
          gameState.spawnParticles(z.x, z.y, '#e1bee7', 6);
        }
      });

      if (gameState.spawnAttackEffect) {
        const lawnLeft = CONFIG.GRID_OFFSET_X;
        const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
        gameState.spawnAttackEffect({
          kind: 'chomper_burp',
          x: this.x,
          y: this.y,
          row: this.row,
          minRow: this.row,
          maxRow: this.row,
          startX: Math.max(lawnLeft, this.x - 20),
          endX: lawnRight,
          duration: 0.7
        });
      }

      this.isChewing = true;
      this.chewTimer = 10.0;
      this.state = 'chewing';

      if (gameState.audio && gameState.audio.playChomp) {
        gameState.audio.playChomp();
      }
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 28, 'SWALLOW 3 & BURP! 💨', '#ab47bc', 18);
      }
      return true;
    }

    // ====================================================
    // 4. NHÓM PHÒNG THỦ & KHỐNG CHẾ
    // ====================================================
    if (this.type === 'wall_nut') {
      // Hạt Dẻ: Khoác lớp giáp kim loại hiệp sĩ (8000 HP, chặn đòn đập Gargantuar không vỡ ngay)
      this.hasArmor = true;
      this.armorHp = 8000;
      this.maxArmorHp = 8000;
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, 'KNIGHT ARMOR 8000 HP! 🛡️⚔️', '#b0bec5', 18);
      }
      return true;
    }

    if (this.type === 'infi_nut') {
      // Hạt Dẻ Hologram: Tạo bức tường lực 10.000 máu bao phủ cả 5 hàng ngang, tự phục hồi
      this.isRecharging = false;
      this.rechargeTimer = 0;
      gameState.spawnHolographicBarrier(this.col + 1);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, '10,000 HP BARRIER! 🛡️🌐', '#00e5ff', 18);
      }
      return true;
    }

    if (this.type === 'stunion') {
      // Hành Choáng: Thở đám mây khí gas khổng lồ làm choáng (stun) toàn bộ zombie trong phạm vi 3x4 phía trước suốt 5s
      const proto = PLANT_CONFIG.stunion || {};
      const stunDur = proto.stunDuration || 5.0;
      this.activated = true;
      this.state = 'shooting';
      const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
      const reachX = Math.min(lawnRight, this.x + CONFIG.CELL_WIDTH * 4.2);
      for (let r = Math.max(0, this.row - 1); r <= Math.min(CONFIG.ROWS - 1, this.row + 1); r++) {
        gameState.spawnGasCloud(this.x + 60, CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2);
      }
      gameState.zombies.forEach(z => {
        if (isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle) {
          const isBossHitbox = isTwoRowBoss(z) &&
            (Math.abs(z.bossRow - this.row) <= 1 || Math.abs((z.bossRow + 1) - this.row) <= 1);
          const isRowMatch = Math.abs(z.row - this.row) <= 1 || isBossHitbox;
          if (isRowMatch && z.x >= this.x - 20 && z.x <= reachX) {
            z.applyStun(stunDur);
            gameState.spawnParticles(z.x, z.y - 10, '#cddc39', 8);
          }
        }
      });
      if (gameState.spawnAttackEffect) {
        const lawnLeft = CONFIG.GRID_OFFSET_X;
        gameState.spawnAttackEffect({
          kind: 'stunion_gas',
          x: this.x,
          y: this.y,
          row: this.row,
          minRow: Math.max(0, this.row - 1),
          maxRow: Math.min(CONFIG.ROWS - 1, this.row + 1),
          startX: Math.max(lawnLeft, this.x - 20),
          endX: reachX,
          isPlantFood: true,
          duration: 1.1
        });
      }
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 28, `3x4 STUN ${stunDur} SECONDS! 🧅💨`, '#ffd54f', 18);
      }
      setTimeout(() => { if (this.alive) this.alive = false; }, 400);
      return true;
    }

    // ====================================================
    // 5. NHÓM CÂY TỨC THỜI, NẤM & MÌN
    // ====================================================
    if (this.type === 'potato_mine') {
      // Mìn Khoai Tây: Lập tức trồi lên đã kích hoạt + phân bào ném 2 quả mìn đã kích hoạt vào ô trống ngẫu nhiên
      this.armed = true;
      this.armTimer = this.armDuration || 14.0;

      // Tìm các ô trống trên sân
      const emptyTiles = [];
      for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 1; c < CONFIG.COLS - 1; c++) {
          const hasPlant = gameState.plants.some(p => p.alive && p.row === r && p.col === c);
          if (!hasPlant) {
            emptyTiles.push({ row: r, col: c });
          }
        }
      }

      emptyTiles.sort(() => Math.random() - 0.5);
      const chosen = emptyTiles.slice(0, 2);
      chosen.forEach(tile => {
        const extraMine = new Plant('potato_mine', tile.row, tile.col);
        extraMine.armed = true;
        extraMine.armTimer = extraMine.armDuration || 14.0;
        gameState.plants.push(extraMine);
        gameState.spawnParticles(extraMine.x, extraMine.y, '#ffd54f', 15);
      });

      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 25, 'ARMED + 2 EXTRA MINES! 🥔🥔🥔', '#ffd54f', 18);
      }
      return true;
    }

    if (this.type === 'hypno_shroom') {
      // Nấm Thôi Miên: Nhận năng lượng thôi miên mạnh mẽ (isSuperHypno = true)
      // Zombie ăn phải sẽ đột biến thành Gargantuar chiến đấu cho người chơi
      this.isSuperHypno = true;
      gameState.spawnParticles(this.x, this.y, '#e040fb', 35);
      gameState.spawnParticles(this.x, this.y, '#ffd54f', 20);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 28, 'SUPER HYPNO! (MUTATE GARGANTUAR) 🌀🧟‍♂️', '#e040fb', 18);
      }
      return true;
    }

    if (this.type === 'magnet_shroom') {
      // Nấm Nam Châm: Hút toàn bộ kim loại của tất cả zombie trên sân và bắn trả lại làm đạn (300 DMG/mảnh)
      const metalZombies = gameState.zombies.filter(z => {
        return isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle && (z.armorHp > 0 || z.type === 'buckethead' || z.hasShield);
      });

      if (metalZombies.length > 0) {
        metalZombies.forEach(z => {
          z.armorHp = 0;
          z.hasShield = false;
          if (z.baseHp && z.hp > z.baseHp) {
            z.hp = z.baseHp;
          }
          gameState.spawnParticles(z.x, z.y - 15, '#b0bec5', 12);

          // Bắn trả mảnh kim loại vào zombie
          const shrapnel = new Projectile('pea', z.row, this.x + 20, this.y - 10, 300, 8.5);
          gameState.projectiles.push(shrapnel);
        });
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x, this.y - 28, `STRIPPED & FIRED ${metalZombies.length} METALS! 🧲⚡`, '#00e5ff', 18);
        }
      } else {
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x, this.y - 28, 'KHÔNG CÓ KIM LOẠI 🧲', '#b0bec5', 16);
        }
      }
      return true;
    }

    if (this.type === 'galio') {
      const proto = PLANT_CONFIG.galio || {};
      this.hp = this.maxHp;
      this.skill1Timer = 0;
      this.skill1AnimTimer = 0.45;
      this.punchDir = 1;
      const superWave = new Projectile(
        'galio_wave',
        this.row,
        this.x + 22,
        this.y - 4,
        (proto.skill1Damage || 500) * 2.4,
        10.5
      );
      superWave.isEnergyWave = true;
      superWave.isGiant = true;
      superWave.hitZombies = new Set();
      gameState.projectiles.push(superWave);
      gameState.spawnParticles(this.x + 20, this.y, '#00e5ff', 18);
      gameState.spawnParticles(this.x, this.y, '#ffd54f', 12);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 28, 'SÓNG VỆ THẦN! ⚡🛡️', '#00e5ff', 18);
      }
      return true;
    }

    if (this.type === 'jhinplant') {
      this.hp = this.maxHp;
      this.isReloading = false;
      this.reloadTimer = 0;
      this.ammo = this.magSize || 4;
      this.shootTimer = 0;
      this.curtainBarrage = {
        shotsLeft: 4,
        timer: 0,
        interval: 0.16
      };
      gameState.spawnParticles(this.x + 10, this.y - 10, '#ff1744', 18);
      gameState.spawnParticles(this.x + 10, this.y - 10, '#e040fb', 14);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 30, 'MÀN HẠ MÀN IV! 🎭🌹', '#ff1744', 18);
      }
      return true;
    }

    if (this.type === 'spikeweed') {
      this.hp = this.maxHp;
      if (gameState.zombies) {
        gameState.zombies.forEach(z => {
          if (isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle && !z.isFlying && !z.isAirborne && !z.isFloating && !z.isVaulting && isBossRowMatch(z, this.row)) {
            z.takeDamage(300, false);
            gameState.spawnParticles(z.x, z.y + 18, '#cfd8dc', 10);
          }
        });
      }
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 26, 'BÃO GAI THÉP! 🌵⚡', '#cfd8dc', 17);
      }
      return true;
    }

    if (this.type === 'lux') {
      this.hp = this.maxHp;
      this.triggerLuxUltimate(gameState, true);
      return true;
    }

    if (this.type === 'syndra') {
      this.hp = this.maxHp;
      this.orbTimer = 0;
      const combatZombies = (gameState.zombies || []).filter(z => {
        return isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle && isBossRowMatch(z, this.row);
      });
      if (combatZombies.length > 0) {
        this.fireSyndraEmpoweredOrb(gameState, combatZombies, true);
        this.orbStacks = Math.min(this.maxOrbStacks || 3, Math.max(2, this.orbStacks || 0));
      } else {
        this.orbStacks = this.maxOrbStacks || 3;
        this.empoweredAnimTimer = 0.5;
        gameState.spawnParticles(this.x, this.y - 14, '#e040fb', 16);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x, this.y - 32, '3/3 CẦU HẮC ÁM! 🔮⚡', '#e040fb', 17);
        }
      }
      return true;
    }

    if (this.type === 'kata') {
      this.hp = this.maxHp;
      this.isSpinning = true;
      this.spinTimer = 4.0;
      this.spinTickTimer = 0;
      this.empSpinDamage = 60;
      gameState.spawnParticles(this.x, this.y - 10, '#ff1744', 18);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 34, 'BÔNG SEN TỬ THẦN! 🔪🌹', '#ff1744', 18);
      }
      return true;
    }

    if (this.type === 'aurora') {
      this.hp = this.maxHp;
      this.triggerAuroraRealmSkill(gameState, 300, true);
      return true;
    }

    return true;
  }

  triggerAuroraRealmSkill(gameState, realmDamage = 200, isPlantFood = false) {
    if (!gameState) return false;
    const candidates = (gameState.zombies || []).filter(z => isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle);
    if (candidates.length === 0) return false;

    const busyRows = new Set();
    (gameState.attackEffects || []).forEach(eff => {
      if (eff.kind === 'aurora_realm' && eff.sourcePlantId !== this.id) {
        busyRows.add(eff.row);
      }
    });

    // Tìm zombie gần nhà nhất (min z.x) trên hàng chưa có Aurora khác đang bật pháp trận; fallback toàn sân
    let bestUnoccupied = null;
    let bestAny = null;
    for (const z of candidates) {
      if (!bestAny || z.x < bestAny.x) {
        bestAny = z;
      }
      const zRow = isTwoRowBoss(z) ? z.bossRow : z.row;
      if (!busyRows.has(zRow)) {
        if (!bestUnoccupied || z.x < bestUnoccupied.x) {
          bestUnoccupied = z;
        }
      }
    }

    const chosen = bestUnoccupied || bestAny;
    if (!chosen) return false;

    const targetRow = isTwoRowBoss(chosen) ? chosen.bossRow : chosen.row;
    const centerX = chosen.x;
    const centerY = CONFIG.GRID_OFFSET_Y + targetRow * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
    const halfSpanPx = CONFIG.CELL_WIDTH * 1.15;
    const spawnEdgeX = CONFIG.CANVAS_WIDTH + 10;

    // Ghi nhận hiệu ứng pháp trận ngay lập tức để Aurora khác (kể cả trong cùng frame) chọn hàng khác
    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'aurora_realm',
        sourcePlantId: this.id,
        x: centerX,
        y: centerY,
        row: targetRow,
        minRow: targetRow,
        maxRow: targetRow,
        startX: centerX - halfSpanPx,
        endX: centerX + halfSpanPx,
        duration: 2.2
      });
    }

    (gameState.zombies || []).forEach(z => {
      if (!isZombieOnLawn(z) || z.isHypnotized) return;
      if (!isBossRowMatch(z, targetRow)) return;
      if (Math.abs(z.x - centerX) <= halfSpanPx) {
        z.takeDamage(realmDamage, false);
        // Đẩy tất cả zombie (kể cả Gargantuar, Mini-boss...) trừ Zomboss, vật cản và Darius (miễn đẩy lùi) văng về rìa phải ngoài cùng
        if (z.alive && !z.isObstacle && !isTwoRowBoss(z) && z.type !== 'nosus_warlord') {
          if (z.x < spawnEdgeX) {
            z.x = spawnEdgeX;
          }
          z.isDashing = false;
          z.isEating = false;
          z.eatingPlant = null;
          z.dashBlockedPlant = null;
        }
        gameState.spawnParticles(centerX, centerY - 8, '#80deea', 8);
        gameState.spawnParticles(z.x, z.y - 10, '#f48fb1', 6);
      }
    });

    this.realmCastAnimTimer = 0.55;
    this.state = 'shooting';
    this.shootStateTimer = 0.35;
    if (gameState.spawnFloatingText) {
      const txt = isPlantFood ? 'LINH GIỚI TỐI THƯỢNG! 🐇✨' : 'PHÁP TRẬN LINH GIỚI! 🐇';
      gameState.spawnFloatingText(centerX, centerY - 34, txt, '#80deea', 16);
    }
    if (gameState.audio && gameState.audio.playExplosion) {
      gameState.audio.playExplosion('normal');
    }
    return true;
  }

  getZombieEffectiveAtk(z) {
    if (!z || z.isObstacle) return 0;
    if (z.type === 'anivia' && z.aniviaPhase === 'egg') return 0;
    const proto = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG[z.type]) ? ZOMBIE_CONFIG[z.type] : {};
    let atk = Math.max(
      z.damage || 0,
      proto.damage || 0,
      proto.damagePerSec || 0,
      z.laserDamage || 0,
      proto.laserDamage || 0,
      proto.dashDamage || 0,
      proto.giantDamage || 0
    );
    if (z.type === 'nasus_hound' && z.isGiantForm) {
      atk = Math.max(atk, 2000);
    }
    return atk;
  }

  findHighestAtkSyndraTarget(candidates) {
    if (!candidates || candidates.length === 0) return null;
    let best = null;
    let bestAtk = -1;
    let bestX = Infinity;
    for (const z of candidates) {
      if (!z || !z.alive) continue;
      const atk = this.getZombieEffectiveAtk(z);
      if (atk > bestAtk || (atk === bestAtk && z.x < bestX)) {
        best = z;
        bestAtk = atk;
        bestX = z.x;
      }
    }
    return best;
  }

  fireSyndraOrb(gameState, combatZombies) {
    if (!gameState || !combatZombies || combatZombies.length === 0) return;
    const proto = PLANT_CONFIG.syndra || {};
    const orbDmg = proto.orbDamage || 100;
    const speed = (proto.projectileSpeed || 9.5) + 1.5;

    // Ưu tiên mục tiêu gần nhất phía trước trên hàng (hoặc gần nhất trên hàng nếu đã vượt qua)
    let aheadTarget = null;
    let minAheadX = Infinity;
    let closestTarget = null;
    let minDist = Infinity;
    for (const z of combatZombies) {
      if (z.x >= this.x - 10 && z.x < minAheadX) {
        minAheadX = z.x;
        aheadTarget = z;
      }
      const d = Math.abs(z.x - this.x);
      if (d < minDist) {
        minDist = d;
        closestTarget = z;
      }
    }
    const target = aheadTarget || closestTarget;

    const proj = gameState.spawnProjectile(
      'syndra_orb',
      this.row,
      this.x + 16,
      this.y - 16,
      orbDmg,
      speed
    );
    proj.isSyndraOrb = true;
    proj.ownerPlant = this;
    proj.lockedTarget = target;

    this.orbCastAnimTimer = 0.3;
    this.state = 'shooting';
    this.shootStateTimer = 0.25;
    gameState.spawnParticles(this.x + 16, this.y - 16, '#e040fb', 8);
    if (gameState.audio && gameState.audio.playShoot) {
      gameState.audio.playShoot('laser');
    }
  }

  onSyndraOrbKill(gameState) {
    if (!this.alive || this.type !== 'syndra') return;
    const maxStacks = this.maxOrbStacks || 3;
    this.orbStacks = Math.min(maxStacks, (this.orbStacks || 0) + 1);
    this.orbCastAnimTimer = 0.35;
    if (gameState) {
      gameState.spawnParticles(this.x, this.y - 16, '#ea80fc', 10);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 34, `HỒI CẦU! (${this.orbStacks}/${maxStacks}) 🔮`, '#ea80fc', 15);
      }
    }
  }

  fireSyndraEmpoweredOrb(gameState, combatZombies, isPlantFood = false) {
    if (!gameState || !combatZombies || combatZombies.length === 0) return;
    const proto = PLANT_CONFIG.syndra || {};
    const empoweredDmg = proto.empoweredOrbDamage || 600;
    const target = this.findHighestAtkSyndraTarget(combatZombies);
    if (!target) return;

    const proj = gameState.spawnProjectile(
      'syndra_empowered_orb',
      this.row,
      this.x + 12,
      this.y - 22,
      empoweredDmg,
      14.0
    );
    proj.isSyndraEmpoweredOrb = true;
    proj.ownerPlant = this;
    proj.lockedTarget = target;

    this.empoweredAnimTimer = 0.5;
    this.orbCastAnimTimer = 0.45;
    this.state = 'shooting';
    this.shootStateTimer = 0.4;
    gameState.spawnParticles(this.x + 10, this.y - 20, '#e040fb', 16);
    gameState.spawnParticles(this.x + 10, this.y - 20, '#7c4dff', 10);
    if (gameState.spawnFloatingText) {
      const label = isPlantFood ? 'CẦU HẮC ÁM TỐI THƯỢNG! 🔮⚡' : '3/3 CẦU CƯỜNG HÓA! 🔮💥';
      gameState.spawnFloatingText(this.x, this.y - 36, label, '#e040fb', 16);
    }
    if (gameState.audio && gameState.audio.playExplosion) {
      gameState.audio.playExplosion('normal');
    }
  }

  onLuxKillOrAssist(gameState) {
    if (!this.alive || this.type !== 'lux') return;
    const threshold = this.ultThreshold || 10;
    this.killAssistCount = (this.killAssistCount || 0) + 1;
    if (this.killAssistCount >= threshold) {
      this.killAssistCount -= threshold;
      this.triggerLuxUltimate(gameState, false);
    }
  }

  triggerLuxUltimate(gameState, isPlantFood = false) {
    if (!gameState) return;
    const proto = PLANT_CONFIG.lux || {};
    const ultDmg = proto.ultDamage || 600;
    const stunDur = proto.ultStunDuration || 2.0;

    this.ultAnimTimer = 0.55;
    this.beamAnimTimer = 0.55;
    this.state = 'shooting';
    this.shootStateTimer = 0.5;

    const targets = (gameState.zombies || []).filter(z => {
      if (!isZombieOnLawn(z) || z.isHypnotized) return false;
      return isBossRowMatch(z, this.row) && z.x > this.x - 10;
    });

    for (const z of targets) {
      if (!z.isObstacle && typeof z.registerLuxAssist === 'function') {
        z.registerLuxAssist(this);
      }
      z.takeDamage(ultDmg, false);
      if (z.alive && !z.isObstacle) {
        z.applyStun(stunDur, false);
      }
      gameState.spawnParticles(z.x, z.y - 12, '#ffd54f', 8);
      gameState.spawnParticles(z.x, z.y - 12, '#ffffff', 5);
    }

    const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'lux_ult_beam',
        x: this.x,
        y: this.y,
        row: this.row,
        minRow: this.row,
        maxRow: this.row,
        startX: this.x + 18,
        endX: lawnRight,
        duration: 0.55
      });
    }
    if (gameState.spawnFloatingText) {
      const label = isPlantFood ? 'CẦU VỒNG TỐI THƯỢNG! 600 ⚡✨' : '10/10 ÁNH SÁNG HỦY DIỆT! 600 ✨';
      gameState.spawnFloatingText(this.x + 40, this.y - 30, label, '#ffd54f', 18);
    }
    if (gameState.audio && gameState.audio.playExplosion) {
      gameState.audio.playExplosion('normal');
    }
  }

  takeDamage(amount, isPermanentKill = false) {
    if (this.isRecharging) return; // Máy chiếu đang sạc không nhận sát thương

    // Giáp sắt hiệp sĩ của Wall-Nut (8000 HP, chặn đòn đập Gargantuar không vỡ ngay)
    if (this.hasArmor && this.armorHp > 0) {
      this.flashTimer = 0.12;
      const effectiveDmg = amount >= 5000 ? 2000 : amount;
      this.armorHp -= effectiveDmg;
      if (this.armorHp <= 0) {
        this.armorHp = 0;
        this.hasArmor = false;
      }
      return;
    }

    this.hp -= amount;
    this.flashTimer = 0.12;
    if (this.type === 'infi_nut') {
      this.timeSinceLastHit = 0;
      if (this.hp <= 0) {
        if (isPermanentKill) {
          // Chỉ có Gargantuar đập nát hoàn toàn máy chiếu!
          this.hp = 0;
          this.alive = false;
        } else {
          // Zombie thường tiêu diệt sẽ để lại máy chiếu, sau 15s hồi sinh đầy máu
          this.hp = 0;
          this.isRecharging = true;
          this.rechargeTimer = this.rechargeDuration || 15.0;
          this.state = 'recharging';
        }
        return;
      }
    }
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  // Skill 2 của Galio khi chết:
  // Dừng thời gian 1s, hút tối đa 5 zombie gần vào nhà nhất vô ô Galio và gây 1500 sát thương
  triggerGalioDeathSkill(gameState) {
    if (this.deathSkillTriggered || !gameState) return;
    this.deathSkillTriggered = true;

    const proto = PLANT_CONFIG.galio || {};
    const freezeDuration = proto.deathFreezeDuration || 1.0;
    const pullCount = proto.deathPullCount || 5;
    const skillDmg = proto.deathSkillDamage || 1500;

    // 1. Dừng thời gian 1s
    gameState.timeStopTimer = Math.max(gameState.timeStopTimer || 0, freezeDuration);

    // 2. Chọn tối đa 5 zombie địch gần vào nhà nhất (x nhỏ nhất trước)
    const candidates = (gameState.zombies || []).filter(z => {
      return isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle && !isTwoRowBoss(z);
    });
    candidates.sort((a, b) => a.x - b.x);
    const pulled = candidates.slice(0, pullCount);

    const pulledPaths = [];
    pulled.forEach((z, idx) => {
      const oldX = z.x;
      const oldY = z.y;
      const spreadX = (idx - (pulled.length - 1) / 2) * 8;

      if (z.iceBlock) {
        z.iceBlock.pusher = null;
        z.iceBlock = null;
      }

      z.isEating = false;
      z.isSmashing = false;
      z.eatingPlant = null;
      z.row = this.row;
      z.x = this.x + spreadX;
      z.y = this.y;

      pulledPaths.push({ fromX: oldX, fromY: oldY, toX: z.x, toY: z.y });

      gameState.spawnParticles(oldX, oldY - 10, '#00e5ff', 5);
      z.takeDamage(skillDmg);
      gameState.spawnParticles(z.x, z.y - 10, '#ffd54f', 6);
    });

    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'galio_vortex',
        x: this.x,
        y: this.y,
        row: this.row,
        minRow: this.row,
        maxRow: this.row,
        startX: this.x - CONFIG.CELL_WIDTH * 0.5,
        endX: this.x + CONFIG.CELL_WIDTH * 0.5,
        pulledPaths,
        duration: freezeDuration
      });
    }

    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(
        this.x,
        this.y - 26,
        `DỪNG THỜI GIAN 1s · HÚT ${pulled.length} ZOM (-1500) ⏳🌀`,
        '#00e5ff',
        17
      );
    }
    if (gameState.audio && gameState.audio.playExplosion) {
      gameState.audio.playExplosion('normal');
    }
  }
}

/**
 * LỚP ZOMBIE
 * Tính toán tốc độ, cắn, đập, nhảy sào, mất máu đọc 100% từ ZOMBIE_CONFIG
 */
class Zombie {
  constructor(type, row, gameState = null) {
    let proto = ZOMBIE_CONFIG[type];
    // Xác thực tính hợp lệ của loại zombie: phải là object và có id, hp
    if (!proto || typeof proto !== 'object' || !proto.id || !proto.hp) {
      console.warn(`[Zombie] Loại zombie không hợp lệ: '${type}', chuyển về 'basic'`);
      proto = ZOMBIE_CONFIG.basic;
      type = 'basic';
    }

    this.id = generateId();
    this.type = type;
    this.name = proto.name;
    this.row = row;
    this.gameState = gameState;

    this.x = CONFIG.CANVAS_WIDTH + 20;
    this.y = CONFIG.GRID_OFFSET_Y + row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;

    this.maxHp = proto.hp;
    this.hp = proto.hp;
    this.armorHp = proto.armorHp || 0;
    this.baseHp = proto.baseHp || proto.hp;
    this.isBoss = proto.isBoss || false;
    this.isMiniBoss = !!proto.isMiniBoss;
    this.isObstacle = proto.isObstacle || false;

    // Tốc độ di chuyển tính từ speedPerCell (giây / ô)
    // Tốc độ px/giây = CELL_WIDTH / speedPerCell
    this.speedPerCell = proto.speedPerCell || 5.0;
    this.speed = (CONFIG.CELL_WIDTH / this.speedPerCell) / 60; // pixel/frame 60fps

    // Sát thương cắn: 100 DPS (50 DMG mỗi 0.5s từ ZOMBIE_COMBAT_DEFAULTS)
    const defaultDamage = (typeof ZOMBIE_COMBAT_DEFAULTS !== 'undefined' ? ZOMBIE_COMBAT_DEFAULTS.biteDamage : 50);
    const defaultInterval = (typeof ZOMBIE_COMBAT_DEFAULTS !== 'undefined' ? ZOMBIE_COMBAT_DEFAULTS.biteInterval : 0.5);
    this.damage = proto.damage !== undefined ? proto.damage : defaultDamage;
    this.attackInterval = proto.atkSpeed || proto.attackInterval || defaultInterval;
    this.attackTimer = 0;

    // Pole Vaulting Zombie
    this.hasVaulted = false;
    this.isVaulting = false;
    this.vaultTimer = 0;
    this.vaultStartX = 0;
    this.vaultTargetX = 0;

    // Gargantuar (Khổng Lồ)
    this.isSmashing = false;
    this.hasStruckThisCycle = false;
    this.hasThrownImp = false;
    this.isThrowingImp = false;
    this.throwImpTimer = 0;
    this.smashWindup = proto.smashWindup || 1.1;

    // Turquoise Skull Zombie (Laser Beam)
    this.isChargingLaser = false;
    this.laserTimer = 0;
    this.laserChargeDuration = proto.laserChargeDuration || 5.0;
    this.laserDamage = proto.laserDamage || 4000;
    this.laserRangeCells = proto.laserRangeCells || 4;

    // Kháng hiệu ứng & đẩy lùi
    this.knockbackImmune = proto.knockbackImmune || (this.isBoss || this.isObstacle);
    this.stunTimer = 0;
    this.slowTimer = 0;
    this.slowFactor = 1.0;
    this.poisonStacks = 0;
    this.poisonDuration = 0;
    this.poisonTickTimer = 0;
    this.poisonDmgPerSec = 3.0;

    // Trạng thái cắn cây & vòng đời
    this.isEating = false;
    this.eatingPlant = null;
    this.alive = true;
    this.deathTimer = 0;
    this.flashTimer = 0;
    this.animTime = Math.random() * Math.PI * 2;
    this.walkCycle = 0; // Khởi tạo chu kỳ bước đi, chống lỗi undefined -> NaN
    // Trạng thái thôi miên (Hypnotized)
    this.isHypnotized = false;

    // Vật cản Tombstone: đứng yên trên sân
    if (this.isObstacle) {
      this.speed = 0;
      this.speedPerCell = 999999;
    }

    // Zombot Dark Dragon (Trùm Rồng 27.000 HP - Map 6)
    if (this.type === 'zombot_dark_dragon') {
      this.isDarkDragon = true;
      this.x = CONFIG.GRID_OFFSET_X + 7.5 * CONFIG.CELL_WIDTH; // Nằm ở 2 ô đầu bên phải map (cột 7-8)
      this.bossRow = 1; // Chiếm 2 hàng: hàng bossRow và bossRow + 1
      this.row = 1;
      this.targetRow = 1;
      this.moveRowTimer = 3.5;
      this.bobbingAnim = 0;

      // Cooldown kỹ năng (Khởi đầu giãn cách cho người chơi kịp xếp cây trên băng chuyền)
      this.roarTimer = 16.0;        // Gầm triệu hồi lính (ban đầu 16s cho dễ thở)
      this.fireballTimer = 10.0;    // Bắn cầu lửa ấp nở Imp Dragon
      this.breathTimer = 22.0;     // Khạc lửa càn quét 2 hàng

      // Trạng thái vận chiêu
      this.isRoaring = false;
      this.roarDuration = 0;
      this.isPreparingFireball = false;
      this.fireballPrepTimer = 0;
      this.isBreathingFire = false;
      this.isWindupBreath = false;
      this.breathWindupTimer = 0;
      this.breathDuration = 0;
      this.breathRows = [1, 2];
    }

    // Boss Rồng Ngàn Tuổi (10.000 HP - Map 12)
    if (this.type === 'ancient_dragon_boss') {
      this.isAncientDragonBoss = true;
      this.x = CONFIG.GRID_OFFSET_X + 7.5 * CONFIG.CELL_WIDTH;
      this.bossRow = 1;
      this.row = 1;
      this.targetRow = 1;
      this.moveRowTimer = 3.5;
      this.bobbingAnim = 0;

      this.summonTimer = proto.roarSummonCooldown || 12.0;
      this.isRoaring = false;
      this.roarDuration = 0;

      // 7 Kỹ năng của Boss Rồng Ngàn Tuổi
      this.lightningTimer = proto.lightningCooldown || 20.0;
      this.lightningAnimTimer = 0;
      this.hasSummoned5Gargs = false;
      this.bossAllShieldHp = 0;
      this.bossAllShieldMaxHp = 0;
      this.fearMilestonesTriggered = 0;
      this.rainTimer = proto.rainHealCooldown || 16.0;
      this.rainAnimTimer = 0;
      this.hasTriggeredFinalSwarm = false;
    }

    // Azir Hoàng Đế Sa Mạc (20.000 HP - Map 13)
    this.hasMiniSandstorm = false;
    this.sandstormSpeedMultiplier = 2.0;
    if (this.type === 'azir_desert_emperor') {
      this.isAzirBoss = true;
      this.x = CONFIG.GRID_OFFSET_X + 7.5 * CONFIG.CELL_WIDTH;
      this.bossRow = 1;
      this.row = 1;
      this.targetRow = 1;
      this.moveRowTimer = 3.5;
      this.bobbingAnim = 0;
      this.summonTimer = proto.summonCooldown || 12.0;
      this.skill1Timer = proto.skill1Cooldown || 8.5;
      this.isRoaring = false;
      this.roarDuration = 0;
      this.castAnimTimer = 0;
      this.hasTriggeredPhase2 = false;
      this.sandCoffinEmpowered = false;
      this.hasTriggeredPhase3 = false;
      this.localSandstormTimers = [];
    }

    // Lính Cát Sa Mạc & Quan Tài Sa Mạc
    if (this.type === 'sand_soldier') {
      this.emergeTimer = 0.35;
      this.hasAttackedOnce = false;
    }
    if (this.type === 'sand_coffin') {
      this.hasReleasedCoffinZombie = false;
    }

    // Mini-Boss 1: Thần Cá Sấu
    if (this.type === 'renekton_croc') {
      this.dashCharges = proto.dashCharges ?? 2;
      this.isGiantForm = false;
      this.isDashing = false;
      this.dashTimer = 0;
      this.dashDuration = 0.22;
      this.dashStartX = 0;
      this.dashTargetX = 0;
      this.isChargingSweep = false;
      this.sweepChargeTimer = 0;
      this.sweepChargeDuration = proto.sweepChargeDuration || 3.0;
      this.sweepCharges = proto.sweepCharges ?? 1;
      this.hasUsedSweep = false;
      this.sweepAnimTimer = 0;
    }

    // Mini-Boss 2: Thần Khuyển
    if (this.type === 'nasus_hound') {
      this.isGiantForm = false;
      this.witherCooldownTimer = 2.0;
      this.witherCooldown = proto.witherCooldown || 10.0;
      this.witherCastAnimTimer = 0;
    }

    // Miễn nhiễm đóng băng, làm chậm, thôi miên & choáng
    this.freezeImmune = proto.freezeImmune || false;
    this.slowImmune = proto.slowImmune || false;
    this.hypnoImmune = proto.hypnoImmune || false;
    this.stunImmune = proto.stunImmune || isTwoRowBoss(this);
    this.slowActionDelayDuration = proto.slowActionDelay || 1.5;
    this.actionDelayTimer = 0;
    this.slowDelayCooldown = 0;

    // Troglobite đẩy khối băng
    this.hasSpawnedBlock = false;
    this.iceBlock = null;
    this.hasReleasedImp = false;

    // Lãng Khách Zombie (Yasuo Zombie)
    this.isDashing = false;
    this.dashTimer = 0;
    this.dashDuration = 0.28;
    this.dashStartX = 0;
    this.dashTargetX = 0;
    this.dashRecoveryTimer = 0;
    this.dashBlockedPlant = null;
    this.mustEatPlantToDash = false;
    this.dashCount = 0;
    this.hasTriggeredInvuln = false;
    this.invulnerableTimer = 0;
    this.slashAnimTimer = 0;

    // Shen Mắt Hoàng Hôn & Giáp Kiếm Linh Hồn
    this.spiritShieldHp = 0;
    this.spiritShieldMaxHp = proto.spiritShieldAmount || 350;
    this.skill1Timer = 0;
    this.spiritCastAnimTimer = 0;
    this.defensiveTargetRef = null;
    this.defensiveBiteCount = 0;

    // Cơ chế Zombie Bay & Anivia Phượng Hoàng Băng
    this.isFlying = !!proto.isFlying;
    this.flyingSize = proto.flyingSize || null;
    this.isLargeFlying = !!(proto.isLargeFlying || proto.flyingSize === 'large');
    this.isAttacking = false;
    this.iceImmunePopupCooldown = 0;

    if (this.type === 'anivia') {
      this.aniviaPhase = 'phase1'; // 'phase1' | 'egg' | 'phase2'
      this.eggTimer = 0;
      this.eggDuration = proto.eggDuration || 5.0;
      this.eggHp = proto.eggHp || 770;
      this.phase2Hp = proto.phase2Hp || 1100;
      this.phase2Damage = proto.phase2Damage || 40;
      this.phase2AttackInterval = proto.phase2AttackInterval || 0.35;
      this.attackRangeCells = proto.attackRangeCells || 3.0;
      this.attackTimer = this.attackInterval;
    }

    // Hỗ trợ theo dõi hạ gục / hỗ trợ bởi Lux
    this.luxAttackers = null;
    this.luxDeathProcessed = false;

    // Zombie Jetpack: tăng x1.5 tốc độ chạy khi đến gần nửa sân
    if (this.type === 'jetpack') {
      this.jetpackBoosted = false;
      this.boostSpeedMultiplier = proto.boostSpeedMultiplier || 1.5;
      this.boostColumnThreshold = proto.boostColumnThreshold || 5;
    }

    // Thresh Zombie: ném xích tầm 3 ô, choáng plant tấn công, kéo về phía Thresh 1 ô + 100 DMG mỗi 1.5s
    if (this.type === 'thresh') {
      this.hookedPlant = null;
      this.hookPullTimer = 0;
      this.hookCooldown = 0;
      this.hookRangeCells = proto.hookRangeCells || 3.0;
      this.pullInterval = proto.pullInterval || 1.5;
      this.pullDamage = proto.pullDamage || 100;
      this.hookThrowAnimTimer = 0;
      this.isHooking = false;
    }

    // Quận Chúa: thu linh hồn zombie cùng hàng chết; ≥3 linh hồn -> đứng im niệm 3s triệu hồi
    this.quanChuaDeathProcessed = false;
    this.isSummonedByQuanChua = false;
    if (this.type === 'quan_chua') {
      this.soulCount = 0;
      this.gargantuarSouls = 0;
      this.isChanneling = false;
      this.channelTimer = 0;
      this.channelDuration = proto.channelDuration || 3.0;
      this.minSoulsToChannel = proto.minSoulsToChannel || 3;
      this.coneheadThreshold = proto.coneheadThreshold || 5;
      this.attackRangeCells = proto.attackRangeCells || 1.0;
      this.castAnimTimer = 0;
      this.attackTimer = this.attackInterval;
    }

    // Hệ Rồng Long Tộc & Buff Bình Thuốc Hóa Kỹ
    this.nonMetalArmor = !!proto.nonMetalArmor;
    this.potionBuffType = null; // 'speed' | 'giant_hp' | 'atk_speed'
    this.potionSpeedMult = 1.0;
    this.potionAtkSpeedMult = 1.0;
    this.visualScale = 1.0;

    if (this.type === 'dragon_dark') {
      this.hasDevouredDragon = false;
      this.firstStrikeTargets = new Set();
      this.firstHitMultiplier = proto.firstHitMultiplier || 2.0;
    }

    if (this.type === 'dragon_chemtech') {
      this.potionsThrown = 0;
      this.maxPotions = proto.maxPotions || 5;
      this.potionHpStep = proto.potionHpStep || 200;
      this.skipChemDrop = false;
    }

    // Rồng Gió & buff tăng tốc gió cùng hàng
    this.windHasteTimer = 0;
    this.windHasteMultiplier = 2.0;
    if (this.type === 'dragon_wind') {
      this.hasCastWindHaste = false;
      this.windHasteDuration = proto.windHasteDuration || 3.0;
      this.windHasteMultiplier = proto.windHasteMultiplier || 2.0;
    }

    // Rồng Nước: 10 bản thể (hồi sinh ở đầu hàng khác, +1/2 HP và ATK của bản vừa chết)
    if (this.type === 'dragon_water') {
      this.waterLife = 1;
      this.maxWaterLives = proto.maxWaterLives || 10;
      this.waterScaleFactor = proto.waterScaleFactor || 0.5;
      this.skipWaterRevive = false;
      this.visualScale = 0.92;
    }

    // Chiến Trường Nosus (5 binh chủng: Thrall, Assassin, Shieldbearer, Hemomancer, Warlord)
    this.nosusSpeedBuffTimer = 0;
    this.nosusSpeedBuffMult = 1.0;
    if (this.type === 'nosus_assassin') {
      this.hasBloodBurst = false;
      this.bloodBurstTimer = 0;
      this.bloodBurstDuration = proto.bloodBurstDuration || 3.0;
      this.bloodBurstMult = proto.bloodBurstMult || 1.6;
    } else if (this.type === 'nosus_shieldbearer') {
      this.hasShield = !!proto.hasShield;
      this.maxArmorHp = proto.armorHp || 750;
    } else if (this.type === 'nosus_hemomancer') {
      this.attackRangeCells = proto.attackRangeCells || 2.5;
      this.bloodPactTimer = 2.5;
      this.bloodPactCooldown = proto.bloodPactCooldown || 6.5;
      this.bloodPactHeal = proto.bloodPactHeal || 120;
      this.hemoCastAnimTimer = 0;
      this.attackTimer = this.attackInterval;
    } else if (this.type === 'nosus_warlord') {
      this.executeThreshold = proto.executeThreshold || 0.20;
      this.spinCooldown = proto.spinCooldown || 5.0;
      this.spinTimer = 0;
      this.spinAnimTimer = 0;
      this.spinDamage = proto.spinDamage || 180;
      this.slashAnimTimer = 0;
      this.hasDariusLastStand = false;
      this.isDariusFrenzied = false;
      this.baseAttackInterval = this.attackInterval || 1.75;
      this.dariusLastStandThreshold = proto.lastStandThreshold || 100;
      this.dariusInvulnDuration = proto.invulnDuration || 4.0;
      this.dariusInvulnAttackInterval = proto.invulnAttackInterval || 1.0;
      this.dariusFrenzySpeedMult = proto.frenzySpeedMult || 2.0;
    }
  }

  registerLuxAssist(luxPlant) {
    if (!luxPlant || this.isObstacle) return;
    if (!this.luxAttackers) {
      this.luxAttackers = new Set();
    }
    this.luxAttackers.add(luxPlant);
  }

  hypnotize(gameState) {
    if (this.hypnoImmune || this.isObstacle || !this.alive || this.isHypnotized) return;
    this.isHypnotized = true;
    this.isEating = false;
    this.isAttacking = false;
    this.isSmashing = false;
    this.isChargingLaser = false;
    this.laserTimer = 0;
    this.eatingPlant = null;
    this.attackTimer = 0;
    this.hasVaulted = true; // Bỏ sào nhảy nếu có
    if (this.type === 'thresh' && typeof this.releaseThreshHook === 'function') {
      this.releaseThreshHook();
    }
    if (this.type === 'quan_chua') {
      this.isChanneling = false;
      this.channelTimer = 0;
    }

    if (gameState) {
      gameState.spawnParticles(this.x, this.y, '#e040fb', 20);
      gameState.spawnParticles(this.x, this.y, '#ffd54f', 10);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 35, 'THÔI MIÊN! 🌀', '#e040fb', 18);
      }
    }
  }

  applyKnockback(distance) {
    if (this.knockbackImmune || !this.alive) return;
    if (this.isObstacle) return;
    this.x = Math.min(CONFIG.CANVAS_WIDTH + 50, this.x + distance);
  }

  applyStun(duration, isFreeze = false) {
    if (this.isObstacle || !this.alive) return;
    if (this.stunImmune || isTwoRowBoss(this)) {
      // Zomboss miễn nhiễm choáng -> chuyển hóa thành hiệu ứng làm chậm (và kích hoạt delay hành động 1.5s)
      const slowDur = Math.max(duration || 3.0, this.slowActionDelayDuration || 1.5);
      this.applySlow(0.5, slowDur);
      if (this.gameState && this.gameState.spawnFloatingText && !isFreeze) {
        this.gameState.spawnFloatingText(this.x - 20, this.y - 56, 'MIỄN CHOÁNG · CHẬM! ❄️', '#00e5ff', 15);
      }
      return;
    }
    if (this.freezeImmune && isFreeze) {
      if (this.type === 'anivia' && this.gameState && this.gameState.spawnFloatingText && this.iceImmunePopupCooldown <= 0) {
        this.iceImmunePopupCooldown = 1.6;
        this.gameState.spawnFloatingText(this.x, this.y - 42, 'MIỄN BĂNG! ❄️', '#80deea', 14);
      }
      return; // Miễn nhiễm với việc đóng băng!
    }
    this.stunTimer = Math.max(this.stunTimer, duration);
    this.isEating = false;
    this.isAttacking = false;
    this.isSmashing = false;
    this.isChargingLaser = false;
    this.laserTimer = 0;
    this.eatingPlant = null;
  }

  applySlow(factor, duration) {
    if (this.isObstacle || !this.alive) return;
    if (this.slowImmune || this.freezeImmune) {
      if (this.gameState && this.gameState.spawnFloatingText && this.iceImmunePopupCooldown <= 0) {
        if (this.type === 'anivia') {
          this.iceImmunePopupCooldown = 1.6;
          this.gameState.spawnFloatingText(this.x, this.y - 42, 'MIỄN LÀM CHẬM! ❄️', '#80deea', 14);
        } else if (this.type === 'nosus_warlord') {
          this.iceImmunePopupCooldown = 1.8;
          this.gameState.spawnFloatingText(this.x, this.y - 44, 'MIỄN LÀM CHẬM! 🪓', '#ff5252', 14);
        }
      }
      return; // Miễn nhiễm hoàn toàn làm chậm và đóng băng!
    }
    const wasSlowed = this.slowTimer > 0;
    this.slowTimer = Math.max(this.slowTimer, duration);
    this.slowFactor = Math.min(this.slowFactor || 1.0, factor);

    if (this.stunImmune || isTwoRowBoss(this)) {
      // Hiệu ứng làm chậm lên Zomboss khiến nó bị delay hành động 1.5s
      if (!wasSlowed || this.slowDelayCooldown <= 0) {
        const delayDur = this.slowActionDelayDuration || 1.5;
        this.actionDelayTimer = Math.max(this.actionDelayTimer || 0, delayDur);
        this.slowDelayCooldown = delayDur + 1.5;
        if (this.gameState && this.gameState.spawnFloatingText) {
          this.gameState.spawnFloatingText(this.x - 20, this.y - 38, 'DELAY HÀNH ĐỘNG 1.5s! ⏳❄️', '#4fc3f7', 16);
        }
      }
    }
  }

  applyPoison(stacks, duration, dmgPerSec = 15.0, maxStacks = 3) {
    if (this.isObstacle || !this.alive) return;
    this.poisonStacks = Math.min(maxStacks, this.poisonStacks + stacks);
    this.poisonDuration = Math.max(this.poisonDuration, duration);
    this.poisonDmgPerSec = dmgPerSec;
  }

  update(dt, gameState) {
    this.gameState = gameState;
    this.animTime += dt;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }
    if (this.invulnerableTimer > 0) {
      this.invulnerableTimer = Math.max(0, this.invulnerableTimer - dt);
    }
    if (this.slashAnimTimer > 0) {
      this.slashAnimTimer = Math.max(0, this.slashAnimTimer - dt);
    }
    if (this.dashRecoveryTimer > 0) {
      this.dashRecoveryTimer = Math.max(0, this.dashRecoveryTimer - dt);
    }
    if (this.spiritCastAnimTimer > 0) {
      this.spiritCastAnimTimer = Math.max(0, this.spiritCastAnimTimer - dt);
    }
    if (this.skill1Timer > 0) {
      this.skill1Timer = Math.max(0, this.skill1Timer - dt);
    }
    if (this.iceImmunePopupCooldown > 0) {
      this.iceImmunePopupCooldown = Math.max(0, this.iceImmunePopupCooldown - dt);
    }
    if (this.hemoCastAnimTimer > 0) {
      this.hemoCastAnimTimer = Math.max(0, this.hemoCastAnimTimer - dt);
    }
    if (this.spinAnimTimer > 0) {
      this.spinAnimTimer = Math.max(0, this.spinAnimTimer - dt);
    }

    // Xử lý Khối Băng (Ice Block) do Troglobite đẩy
    if (this.type === 'ice_block') {
      if (this.hp <= 0 && !this.hasReleasedImp) {
        this.hasReleasedImp = true;
        this.alive = false;
        gameState.spawnParticles(this.x, this.y, '#80deea', 25);
        gameState.spawnParticles(this.x, this.y, '#ffffff', 20);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x, this.y - 25, 'YETI IMP THOÁT RA! ❄️👹', '#00e5ff', 16);
        }
        if (gameState.audio && gameState.audio.playHit) {
          gameState.audio.playHit();
        }
        const imp = new Zombie('yeti_imp', this.row);
        imp.x = this.x;
        gameState.zombies.push(imp);
        return;
      }
      if (!this.alive) {
        this.deathTimer += dt;
        return;
      }

      // Nghiền nát tất cả các cây phía trước khi bị đẩy tới!
      const crushedPlant = gameState.plants.find(p => {
        return p.alive && !p.isRecharging && p.row === this.row &&
               p.x >= this.x - CONFIG.CELL_WIDTH * 0.45 && p.x <= this.x + CONFIG.CELL_WIDTH * 0.65;
      });

      if (crushedPlant) {
        if (crushedPlant.hasArmor && crushedPlant.armorHp > 0) {
          crushedPlant.takeDamage(2000, true);
        } else {
          crushedPlant.takeDamage(99999, true);
        }
        gameState.spawnParticles(crushedPlant.x, crushedPlant.y, '#80deea', 12);
        gameState.spawnParticles(crushedPlant.x, crushedPlant.y, '#81c784', 8);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(crushedPlant.x, crushedPlant.y - 25, 'CRUSHED! 🧊💥', '#80deea', 16);
        }
        if (gameState.audio && gameState.audio.playExplosion) {
          gameState.audio.playExplosion('normal');
        }
      }
      return;
    }

    if (!this.alive) {
      this.deathTimer += dt;
      return;
    }

    // Troglobite đẩy khối băng
    if (this.type === 'troglobite') {
      if (!this.hasSpawnedBlock && gameState) {
        this.hasSpawnedBlock = true;
        const block = new Zombie('ice_block', this.row);
        block.x = this.x - 48;
        block.pusher = this;
        this.iceBlock = block;
        gameState.zombies.push(block);
      }

      // Đẩy khối băng di chuyển cùng nhịp ở phía trước
      if (this.iceBlock && this.iceBlock.alive) {
        this.iceBlock.x = this.x - 48;
        this.iceBlock.y = this.y;
      }
    }

    // Vật cản Tombstone đứng yên
    if (this.isObstacle) return;

    // ====================================================
    // XỬ LÝ BOSS ZOMBOT DARK DRAGON (Map 6)
    // ====================================================
    if (this.type === 'zombot_dark_dragon') {
      if (this.slowTimer > 0) {
        this.slowTimer = Math.max(0, this.slowTimer - dt);
        if (this.slowTimer === 0) {
          this.slowFactor = 1.0;
        }
      }
      if (this.slowDelayCooldown > 0) {
        this.slowDelayCooldown = Math.max(0, this.slowDelayCooldown - dt);
      }
      if (this.actionDelayTimer > 0) {
        this.actionDelayTimer = Math.max(0, this.actionDelayTimer - dt);
        this.bobbingAnim += dt * 0.6;
        return; // Delay mọi hành động của Zomboss trong 1.5s khi bị làm chậm
      }

      this.bobbingAnim += dt * 2.0;

      // Di chuyển lướt lên xuống nhịp nhàng ở 2 ô đầu mép phải map (cột 7-8)
      this.moveRowTimer -= dt;
      if (this.moveRowTimer <= 0) {
        this.moveRowTimer = 4.0 + Math.random() * 2.5;
        // Chọn hàng mục tiêu (0, 1, 2, 3 - mỗi vị trí chiếm 2 hàng liên tiếp)
        const possibleRows = [0, 1, 2, 3].filter(r => r !== this.targetRow);
        this.targetRow = possibleRows[Math.floor(Math.random() * possibleRows.length)];
      }

      // Nội suy vị trí y mượt mà theo targetRow (vị trí giữa 2 hàng)
      const targetCenterY = CONFIG.GRID_OFFSET_Y + (this.targetRow + 0.5) * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
      this.y += (targetCenterY - this.y) * Math.min(1.0, dt * 2.5);
      this.bossRow = Math.max(0, Math.min(3, Math.round((this.y - CONFIG.GRID_OFFSET_Y - CONFIG.CELL_HEIGHT) / CONFIG.CELL_HEIGHT)));
      this.row = this.bossRow; // Gán hàng cơ sở để đạn bắn thẳng kiểm tra va chạm

      // Zomboss giẫm / đập tan mọi cây nằm trực tiếp dưới chân Boss ở 2 cột cuối (cột 7-8)
      if (gameState && gameState.plants) {
        for (const p of gameState.plants) {
          if (p.alive && !p.isRecharging && p.col >= 7 && (p.row === this.bossRow || p.row === this.bossRow + 1)) {
            p.takeDamage(99999, true);
            gameState.spawnParticles(p.x, p.y, '#ff5722', 12);
          }
        }
      }

      // 1. Kỹ năng 1: GẦM TRIỆU HỒI ZOMBIE DARK AGES (Roaring)
      if (this.isRoaring) {
        this.roarDuration -= dt;
        if (this.roarDuration <= 0) {
          this.isRoaring = false;
        }
      } else {
        this.roarTimer -= dt;
        if (this.roarTimer <= 0) {
          const hpRatio = this.hp / this.maxHp;
          let spawnCount = 2;
          let pool = ['basic', 'imp_dragon'];

          if (hpRatio > 0.65) {
            // Giai đoạn đầu (Máu > 65%): Thả ít (2 con), loại cơ bản để người chơi chuẩn bị
            this.roarTimer = 17.0 + Math.random() * 3.0;
            spawnCount = 2;
            pool = ['basic', 'imp_dragon', 'imp'];
          } else if (hpRatio >= 0.30) {
            // Giai đoạn giữa (Máu 30% - 65%): Thả vừa phải (3 con), tăng thêm Conehead, Pole Vaulting, Turquoise Skull, Lãng Khách, Shen
            this.roarTimer = 14.0 + Math.random() * 3.0;
            spawnCount = 3;
            pool = ['basic', 'conehead', 'pole_vaulting', 'imp_dragon', 'turquoise_skull', 'lang_khach', 'shen'];
          } else {
            // Giai đoạn nguy cấp (Máu < 30% - Cuồng bạo): Thả nhiều (4-5 con), xuất hiện Buckethead, Lãng Khách, Bully, Troglobite, Shen & Gargantuar
            this.roarTimer = 11.0 + Math.random() * 2.0;
            spawnCount = 4 + Math.floor(Math.random() * 2);
            pool = ['conehead', 'buckethead', 'lang_khach', 'imp_dragon', 'turquoise_skull', 'jurassic_bully', 'troglobite', 'shen', 'gargantuar'];
          }

          this.isRoaring = true;
          this.roarDuration = 2.0;
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(this.x - 30, this.y - 60, 'GẦM RỐNG! 🐲', '#ff1744', 22);
          }
          if (gameState.audio) {
            gameState.audio.playRoar && gameState.audio.playRoar();
          }

          for (let i = 0; i < spawnCount; i++) {
            const zType = pool[Math.floor(Math.random() * pool.length)];
            const r = Math.floor(Math.random() * CONFIG.ROWS);
            // KHÔNG THẢ GẦN NHÀ: Luôn cách nhà ít nhất 4 ô (cột 4, 5, 6)
            const col = 4 + Math.floor(Math.random() * 3);
            const spawnX = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
            setTimeout(() => {
              if (!gameState || !this.alive || gameState.isPaused || gameState.isGameOver || gameState.isVictory) return;
              const summonedZ = new Zombie(zType, r);
              summonedZ.x = spawnX;
              gameState.zombies.push(summonedZ);
              gameState.spawnParticles(spawnX, summonedZ.y, '#795548', 15);
              gameState.spawnParticles(spawnX, summonedZ.y, '#ffd54f', 8);
            }, i * 350);
          }
        }
      }

      // 2. Kỹ năng 2: BẮN CẦU LỬA ẤP NỞ IMP DRAGON & THIÊU RỤI Ô 10S (Lobbed Fireballs)
      if (this.isPreparingFireball) {
        this.fireballPrepTimer -= dt;
        if (this.fireballPrepTimer <= 0) {
          this.isPreparingFireball = false;
        }
      } else {
        this.fireballTimer -= dt;
        if (this.fireballTimer <= 0) {
          this.fireballTimer = 9.0 + Math.random() * 3.0;
          this.isPreparingFireball = true;
          this.fireballPrepTimer = 1.0;

          // Tìm mục tiêu: KHÔNG BẮN VÀO 4 Ô GẦN NHÀ (cột 0, 1, 2, 3)
          // Ưu tiên Nấm Nam Châm ở cột >= 4, hoặc cây khác ở cột >= 4
          let targetPlant = gameState.plants.find(p => p.alive && p.col >= 4 && p.type === 'magnet_shroom');
          let targetRow, targetCol;
          if (targetPlant) {
            targetRow = targetPlant.row;
            targetCol = targetPlant.col;
          } else {
            // Chọn ngẫu nhiên trong các cây an toàn (cột >= 4)
            const safeLivingPlants = gameState.plants.filter(p => p.alive && !p.isRecharging && p.col >= 4);
            if (safeLivingPlants.length > 0 && Math.random() < 0.7) {
              const p = safeLivingPlants[Math.floor(Math.random() * safeLivingPlants.length)];
              targetRow = p.row;
              targetCol = p.col;
            } else {
              targetRow = Math.floor(Math.random() * CONFIG.ROWS);
              targetCol = 4 + Math.floor(Math.random() * 3); // Cột 4, 5, 6
            }
          }

          const targetX = CONFIG.GRID_OFFSET_X + targetCol * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
          const targetY = CONFIG.GRID_OFFSET_Y + targetRow * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;

          // Nhổ cầu lửa bay dạng parabol xuống ô mục tiêu (đảm bảo cách nhà ít nhất 4 ô)
          if (gameState.spawnFireball) {
            gameState.spawnFireball(this.x - 30, this.y - 20, targetX, targetY, targetRow, targetCol);
          }
        }
      }

      // 3. Kỹ năng 3: KHẠC LỬA CÀN QUÉT 2 HÀNG NGANG (Fire Breath)
      // Có thể bị ngắt bằng cách kích hoạt Plant Food lên cây
      if (this.isWindupBreath) {
        this.breathWindupTimer -= dt;
        if (this.breathWindupTimer <= 0) {
          this.isWindupBreath = false;
          this.isBreathingFire = true;
          this.breathDuration = 2.2;

          // Phun lửa càn quét 2 hàng ngang [breathRows[0], breathRows[1]]
          this.executeFireBreath(gameState);
        }
      } else if (this.isBreathingFire) {
        this.breathDuration -= dt;
        if (this.breathDuration <= 0) {
          this.isBreathingFire = false;
        }
      } else {
        this.breathTimer -= dt;
        if (this.breathTimer <= 0) {
          this.breathTimer = 22.0 + Math.random() * 5.0;
          this.isWindupBreath = true;
          this.breathWindupTimer = 1.8; // Báo hiệu tích tụ lửa trong 1.8s
          this.breathRows = [this.bossRow, this.bossRow + 1];

          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(this.x - 30, this.y - 40, 'HƠI THỞ LỬA SẮP ĐẾN! 🔥', '#ff3d00', 18);
          }
        }
      }

      return; // Rồng không di chuyển về phía sân nhà hay cắn cây thông thường
    }

    // ====================================================
    // XỬ LÝ BOSS RỒNG NGÀN TUỔI (Map 12 - 10.000 HP - 7 Skill)
    // ====================================================
    if (this.type === 'ancient_dragon_boss') {
      if (this.slowTimer > 0) {
        this.slowTimer = Math.max(0, this.slowTimer - dt);
        if (this.slowTimer === 0) {
          this.slowFactor = 1.0;
        }
      }
      if (this.slowDelayCooldown > 0) {
        this.slowDelayCooldown = Math.max(0, this.slowDelayCooldown - dt);
      }
      if (this.lightningAnimTimer > 0) {
        this.lightningAnimTimer = Math.max(0, this.lightningAnimTimer - dt);
      }
      if (this.rainAnimTimer > 0) {
        this.rainAnimTimer = Math.max(0, this.rainAnimTimer - dt);
      }
      if (this.isRoaring) {
        this.roarDuration -= dt;
        if (this.roarDuration <= 0) {
          this.isRoaring = false;
        }
      }
      if (this.actionDelayTimer > 0) {
        this.actionDelayTimer = Math.max(0, this.actionDelayTimer - dt);
        this.bobbingAnim += dt * 0.6;
        return;
      }

      this.bobbingAnim += dt * 2.2;

      // Di chuyển lên xuống nhịp nhàng ở 2 cột cuối (cột 7-8) giống Zomboss
      this.moveRowTimer -= dt;
      if (this.moveRowTimer <= 0) {
        this.moveRowTimer = 3.5 + Math.random() * 2.5;
        const possibleRows = [0, 1, 2, 3].filter(r => r !== this.targetRow);
        this.targetRow = possibleRows[Math.floor(Math.random() * possibleRows.length)];
      }

      const targetCenterY = CONFIG.GRID_OFFSET_Y + (this.targetRow + 0.5) * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
      this.y += (targetCenterY - this.y) * Math.min(1.0, dt * 2.6);
      this.bossRow = Math.max(0, Math.min(3, Math.round((this.y - CONFIG.GRID_OFFSET_Y - CONFIG.CELL_HEIGHT) / CONFIG.CELL_HEIGHT)));
      this.row = this.bossRow;

      // Đè nát mọi cây nằm trực tiếp dưới thân Boss ở cột 7-8
      if (gameState && gameState.plants) {
        for (const p of gameState.plants) {
          if (p.alive && !p.isRecharging && p.col >= 7 && (p.row === this.bossRow || p.row === this.bossRow + 1)) {
            p.armorHp = 0;
            p.hasArmor = false;
            p.takeDamage(99999, true);
            gameState.spawnParticles(p.x, p.y, '#ff6f00', 12);
          }
        }
      }

      // Di chuyển thả rồng & zombie định kỳ như Zomboss
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        const hpRatio = this.hp / Math.max(1, this.maxHp);
        let spawnCount = 2;
        let pool = ['basic', 'imp_dragon', 'dragon_hatchling', 'conehead'];
        if (hpRatio > 0.65) {
          this.summonTimer = 13.0 + Math.random() * 2.5;
          spawnCount = 2;
          pool = ['basic', 'conehead', 'imp_dragon', 'dragon_hatchling', 'dragon_wind'];
        } else if (hpRatio >= 0.30) {
          this.summonTimer = 11.0 + Math.random() * 2.5;
          spawnCount = 3;
          pool = ['conehead', 'buckethead', 'dragon_hatchling', 'dragon_adult', 'dragon_wind', 'thresh', 'lang_khach'];
        } else {
          this.summonTimer = 9.5 + Math.random() * 2.0;
          spawnCount = 4;
          pool = ['buckethead', 'dragon_adult', 'dragon_dark', 'dragon_chemtech', 'dragon_wind', 'shen', 'quan_chua'];
        }
        this.isRoaring = true;
        this.roarDuration = 1.4;
        if (gameState && gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x - 30, this.y - 62, 'TRIỆU HỒI LONG QUÂN! 🐉', '#ffb300', 19);
        }
        if (gameState && gameState.audio && gameState.audio.playRoar) {
          gameState.audio.playRoar();
        }
        for (let i = 0; i < spawnCount; i++) {
          const zType = pool[Math.floor(Math.random() * pool.length)];
          const r = Math.floor(Math.random() * CONFIG.ROWS);
          const col = 4 + Math.floor(Math.random() * 3); // Cột 4-6 (>= 4 ô cách nhà)
          const spawnX = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
          const summoned = new Zombie(zType, r, gameState);
          summoned.x = spawnX + i * 18;
          if (gameState && Array.isArray(gameState.zombies)) {
            gameState.zombies.push(summoned);
            gameState.spawnParticles(summoned.x, summoned.y, '#ffd54f', 12);
          }
        }
      }

      // SKILL 5: Khi 1 plant có dưới 15% HP -> hủy diệt plant đó ngay lập tức
      this.executeLowHpPlants(gameState);

      // SKILL 1: Mỗi 20s bắn sét hủy diệt random 3 cây ATK cao nhất có trên sân
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0) {
        const cfg = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG.ancient_dragon_boss) ? ZOMBIE_CONFIG.ancient_dragon_boss : {};
        this.lightningTimer = cfg.lightningCooldown || 20.0;
        this.executeAncientLightningStrike(gameState);
      }

      // SKILL 6: Gọi mưa hồi 20% máu cho tất cả Rồng (không tính bản thân) mỗi 16s
      this.rainTimer -= dt;
      if (this.rainTimer <= 0) {
        const cfg = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG.ancient_dragon_boss) ? ZOMBIE_CONFIG.ancient_dragon_boss : {};
        this.rainTimer = cfg.rainHealCooldown || 16.0;
        this.executeDragonRainHeal(gameState);
      }

      // SKILL 7 dự phòng nếu HP <= 100
      if (!this.hasTriggeredFinalSwarm && this.hp <= 100 && this.alive) {
        this.hasTriggeredFinalSwarm = true;
        this.triggerAncientFinalSwarm(gameState);
      }

      return;
    }

    // ====================================================
    // XỬ LÝ BOSS AZIR HOÀNG ĐẾ SA MẠC (Map 13 - 20.000 HP)
    // ====================================================
    if (this.type === 'azir_desert_emperor') {
      if (this.slowTimer > 0) {
        this.slowTimer = Math.max(0, this.slowTimer - dt);
        if (this.slowTimer === 0) {
          this.slowFactor = 1.0;
        }
      }
      if (this.slowDelayCooldown > 0) {
        this.slowDelayCooldown = Math.max(0, this.slowDelayCooldown - dt);
      }
      if (this.castAnimTimer > 0) {
        this.castAnimTimer = Math.max(0, this.castAnimTimer - dt);
      }
      if (this.isRoaring) {
        this.roarDuration -= dt;
        if (this.roarDuration <= 0) {
          this.isRoaring = false;
        }
      }
      // Dự phòng nếu Azir được cập nhật trực tiếp trong unit test không qua Game.update
      if ((!gameState || !gameState._managesDesertTimers) && this.localSandstormTimers && this.localSandstormTimers.length > 0) {
        for (let i = this.localSandstormTimers.length - 1; i >= 0; i--) {
          this.localSandstormTimers[i] -= dt;
          if (this.localSandstormTimers[i] <= 0) {
            this.localSandstormTimers.splice(i, 1);
            this.spawnAzirSandstormWave(gameState);
          }
        }
      }

      if (this.actionDelayTimer > 0) {
        this.actionDelayTimer = Math.max(0, this.actionDelayTimer - dt);
        this.bobbingAnim += dt * 0.6;
        return;
      }

      this.bobbingAnim += dt * 2.1;

      // Di chuyển lên xuống ở 2 cột cuối (cột 7-8) giống các Boss khác
      this.moveRowTimer -= dt;
      if (this.moveRowTimer <= 0) {
        this.moveRowTimer = 3.5 + Math.random() * 2.5;
        const possibleRows = [0, 1, 2, 3].filter(r => r !== this.targetRow);
        this.targetRow = possibleRows[Math.floor(Math.random() * possibleRows.length)];
      }

      const targetCenterY = CONFIG.GRID_OFFSET_Y + (this.targetRow + 0.5) * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
      this.y += (targetCenterY - this.y) * Math.min(1.0, dt * 2.6);
      this.bossRow = Math.max(0, Math.min(3, Math.round((this.y - CONFIG.GRID_OFFSET_Y - CONFIG.CELL_HEIGHT) / CONFIG.CELL_HEIGHT)));
      this.row = this.bossRow;

      // Đè nát mọi cây nằm dưới thân Boss ở cột 7-8
      if (gameState && gameState.plants) {
        for (const p of gameState.plants) {
          if (p.alive && !p.isRecharging && p.col >= 7 && (p.row === this.bossRow || p.row === this.bossRow + 1)) {
            p.armorHp = 0;
            p.hasArmor = false;
            p.takeDamage(99999, true);
            gameState.spawnParticles(p.x, p.y, '#ffb300', 12);
          }
        }
      }

      // Kiểm tra các mốc Phase 2 (15.000 HP) & Phase 3 (7.000 HP)
      this.checkAzirHpTriggers(gameState);

      // Triệu hồi quân sa mạc định kỳ như các Boss khác
      this.summonTimer -= dt;
      if (this.summonTimer <= 0) {
        const hpRatio = this.hp / Math.max(1, this.maxHp);
        let spawnCount = 2;
        let pool = ['basic', 'conehead', 'pole_vaulting'];
        if (hpRatio > 0.75) {
          this.summonTimer = 12.5 + Math.random() * 2.5;
          spawnCount = 2;
          pool = ['basic', 'imp', 'conehead', 'pole_vaulting'];
        } else if (hpRatio > 0.35) {
          this.summonTimer = 10.5 + Math.random() * 2.5;
          spawnCount = 3;
          pool = ['conehead', 'buckethead', 'pole_vaulting', 'turquoise_skull', 'lang_khach'];
        } else {
          this.summonTimer = 9.0 + Math.random() * 2.0;
          spawnCount = 4;
          pool = ['buckethead', 'turquoise_skull', 'lang_khach', 'shen', 'quan_chua'];
        }
        this.isRoaring = true;
        this.roarDuration = 1.2;
        if (gameState && gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x - 30, this.y - 62, 'TRỖI DẬY, QUÂN ĐOÀN SHURIMA! ☀️👑', '#ffd54f', 18);
        }
        if (gameState && gameState.audio && gameState.audio.playRoar) {
          gameState.audio.playRoar();
        }
        for (let i = 0; i < spawnCount; i++) {
          const zType = pool[Math.floor(Math.random() * pool.length)];
          const r = Math.floor(Math.random() * CONFIG.ROWS);
          const col = 4 + Math.floor(Math.random() * 3); // Cột 4-6 (>= 4 ô cách nhà)
          const spawnX = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
          const summoned = new Zombie(zType, r, gameState);
          summoned.x = spawnX + i * 16;
          if (gameState && Array.isArray(gameState.zombies)) {
            gameState.zombies.push(summoned);
            gameState.spawnParticles(summoned.x, summoned.y, '#ffd54f', 12);
          }
        }
      }

      // Skill 1 (Phase 1) / Skill 2 Empowered (Phase 2+): Lính Cát trỗi dậy / Quan Tài 800 HP ưu tiên hàng có nhiều cây nhất (tránh 2 ô cuối col 0-1 & boss cols 7-8)
      this.skill1Timer -= dt;
      if (this.skill1Timer <= 0) {
        const cfg = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG.azir_desert_emperor) ? ZOMBIE_CONFIG.azir_desert_emperor : {};
        this.skill1Timer = cfg.skill1Cooldown || 8.5;
        this.summonAzirSkill1SoldierOrCoffin(gameState);
      }

      return;
    }

    // Xử lý ném Imp của Gargantuar khi HP < 50% HP tối đa (< 1500 / 1800)
    if (this.type === 'gargantuar' && !this.hasThrownImp && this.hp < this.maxHp * 0.5 && this.alive) {
      this.hasThrownImp = true;
      this.isThrowingImp = true;
      this.throwImpTimer = 0.5;
    }

    if (this.isThrowingImp) {
      this.throwImpTimer -= dt;
      if (this.throwImpTimer <= 0) {
        this.isThrowingImp = false;
        const rawTargetX = this.x - 3 * CONFIG.CELL_WIDTH;
        const minLawnX = CONFIG.GRID_OFFSET_X + CONFIG.CELL_WIDTH / 2;
        const maxLawnX = CONFIG.GRID_OFFSET_X + (CONFIG.COLS - 0.5) * CONFIG.CELL_WIDTH;
        const clampedTargetX = Math.max(minLawnX, Math.min(rawTargetX, maxLawnX));

        const startX = this.x - 20;
        const startY = this.y - 30;
        const targetY = CONFIG.GRID_OFFSET_Y + this.row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;

        gameState.spawnFlyingImp(this.row, startX, startY, clampedTargetX, targetY);
      }
    }

    // Xử lý sát thương độc (Đánh thẳng vào máu, xuyên giáp)
    if (this.poisonDuration > 0 && this.poisonStacks > 0) {
      this.poisonDuration -= dt;
      this.poisonTickTimer += dt;
      if (this.poisonTickTimer >= 0.5) {
        const tickDamage = (this.poisonDmgPerSec * this.poisonStacks) * this.poisonTickTimer;
        this.takeDamage(tickDamage, true); // Độc đánh thẳng vào máu xuyên giáp!
        this.poisonTickTimer = 0;
        gameState.spawnParticles(this.x, this.y - 12, '#ab47bc', 2);
      }
      if (this.poisonDuration <= 0) {
        this.poisonStacks = 0;
      }
    }

    // Choáng: đứng yên
    if (this.stunTimer > 0) {
      this.stunTimer -= dt;
      this.isEating = false;
      this.isSmashing = false;
      this.eatingPlant = null;
      return;
    }

    // Hiệu ứng làm chậm (Slow Pea), Bình thuốc Tốc Độ (x2 speed), Gió Thuận (x2), Buff Nosus & Bão Cát Bé dưới chân (x2)
    if (this.windHasteTimer > 0) {
      this.windHasteTimer = Math.max(0, this.windHasteTimer - dt);
    }
    if (this.nosusSpeedBuffTimer > 0) {
      this.nosusSpeedBuffTimer = Math.max(0, this.nosusSpeedBuffTimer - dt);
      if (this.nosusSpeedBuffTimer === 0) {
        this.nosusSpeedBuffMult = 1.0;
      }
    }
    if (this.bloodBurstTimer > 0) {
      this.bloodBurstTimer = Math.max(0, this.bloodBurstTimer - dt);
    }
    const sandstormMult = this.hasMiniSandstorm ? (this.sandstormSpeedMultiplier || 2.0) : 1.0;
    const dariusFrenzyMult = (this.type === 'nosus_warlord' && this.isDariusFrenzied) ? (this.dariusFrenzySpeedMult || 2.0) : 1.0;
    const nosusBuffMult = (this.nosusSpeedBuffTimer > 0 ? (this.nosusSpeedBuffMult || 1.25) : 1.0)
      * (this.bloodBurstTimer > 0 ? (this.bloodBurstMult || 1.6) : 1.0)
      * dariusFrenzyMult;
    let currentSpeedFactor = (this.potionSpeedMult || 1.0)
      * (this.windHasteTimer > 0 ? (this.windHasteMultiplier || 2.0) : 1.0)
      * sandstormMult
      * nosusBuffMult;
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      currentSpeedFactor *= this.slowFactor;
    }
    const atkDt = dt * (this.potionAtkSpeedMult || 1.0);

    // Zombie Jetpack: Khi đến gần nửa sân (cột <= 5) kích hoạt tăng x1.5 run speed
    if (this.type === 'jetpack' && !this.isHypnotized) {
      if (!this.jetpackBoosted) {
        const triggerX = CONFIG.GRID_OFFSET_X + (this.boostColumnThreshold || 5) * CONFIG.CELL_WIDTH;
        if (this.x <= triggerX) {
          this.jetpackBoosted = true;
          if (gameState) {
            gameState.spawnParticles(this.x + 12, this.y - 6, '#ff6d00', 14);
            gameState.spawnParticles(this.x + 12, this.y - 6, '#ffd54f', 10);
            if (gameState.spawnFloatingText) {
              gameState.spawnFloatingText(this.x, this.y - 34, 'TĂNG TỐC x1.5! 🚀🔥', '#ffab00', 16);
            }
          }
        }
      }
      if (this.jetpackBoosted) {
        currentSpeedFactor *= (this.boostSpeedMultiplier || 1.5);
      }
    }

    // ----------------------------------------------------
    // SKILL 1 CỦA SHEN MẮT HOÀNG HÔN:
    // Khi có đồng minh >500 HP (trừ Gargantuar, Zomboss) tụt xuống <= 50% HP -> triệu hồi Kiếm Hồn buff 350 giáp
    // Ưu tiên đồng minh gần nhất, hồi chiêu 7s
    // ----------------------------------------------------
    if (this.type === 'shen' && !this.isHypnotized && this.skill1Timer <= 0 && gameState && Array.isArray(gameState.zombies)) {
      const shenProto = ZOMBIE_CONFIG.shen || {};
      const minHp = shenProto.skill1MinMaxHp || 500;
      const shieldAmount = shenProto.spiritShieldAmount || 350;

      const allyCandidates = gameState.zombies.filter(z =>
        z.alive &&
        z.id !== this.id &&
        !z.isHypnotized &&
        !z.isObstacle &&
        !z.isBoss &&
        z.type !== 'gargantuar' &&
        !isTwoRowBoss(z) &&
        z.maxHp > minHp &&
        z.hp <= z.maxHp * 0.5 &&
        !(z.spiritShieldHp > 0)
      );

      if (allyCandidates.length > 0) {
        allyCandidates.sort((a, b) => Math.hypot(a.x - this.x, a.y - this.y) - Math.hypot(b.x - this.x, b.y - this.y));
        const allyTarget = allyCandidates[0];

        allyTarget.spiritShieldHp = shieldAmount;
        allyTarget.spiritShieldMaxHp = shieldAmount;
        this.skill1Timer = shenProto.skill1Cooldown || 7.0;
        this.spiritCastAnimTimer = 0.65;

        gameState.spawnParticles(this.x, this.y - 16, '#ce93d8', 10);
        gameState.spawnParticles(allyTarget.x, allyTarget.y - 14, '#e040fb', 16);
        gameState.spawnParticles(allyTarget.x, allyTarget.y - 14, '#00e5ff', 8);

        if (gameState.spawnAttackEffect) {
          gameState.spawnAttackEffect({
            kind: 'shen_spirit_ult',
            x: this.x,
            y: this.y,
            row: this.row,
            targetX: allyTarget.x,
            targetY: allyTarget.y,
            minRow: Math.min(this.row, allyTarget.row),
            maxRow: Math.max(this.row, allyTarget.row),
            startX: Math.min(this.x, allyTarget.x),
            endX: Math.max(this.x, allyTarget.x),
            duration: 0.65
          });
        }
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x, this.y - 36, 'NHẤT THỐNG! ⚔️', '#ce93d8', 15);
          gameState.spawnFloatingText(allyTarget.x, allyTarget.y - 34, `+${shieldAmount} GIÁP HỒN! 🛡️💜`, '#e040fb', 16);
        }
      }
    }

    // ----------------------------------------------------
    // ZOMBIE BỊ THÔI MIÊN: QUAY LẠI VÀ CHIẾN ĐẤU CHO BẠN (Hypnotized Zombie)
    // Tấn công cả Zombie địch lẫn Bia Mộ (Tombstone) cản đường
    // ----------------------------------------------------
    if (this.isHypnotized) {
      // Tìm Zombie quân địch hoặc Mộ phía trước trên cùng hàng (hướng di chuyển sang phải)
      const enemyTargetAhead = gameState.zombies.find(z => {
        return z.alive && !z.isHypnotized && z.row === this.row &&
               z.x >= this.x - 15 && z.x <= this.x + 40;
      });

      if (enemyTargetAhead) {
        this.isEating = true;
        this.attackTimer += dt;
        if (this.attackTimer >= this.attackInterval) {
          this.attackTimer = 0;
          enemyTargetAhead.takeDamage(this.damage || 50);
          gameState.spawnParticles(enemyTargetAhead.x, enemyTargetAhead.y, '#e040fb', 5);
          // Nếu đối phương là zombie địch (không phải bia mộ bất động), zombie địch cắn trả
          if (!enemyTargetAhead.isObstacle) {
            this.takeDamage(enemyTargetAhead.damage || 50);
          }
        }
      } else {
        this.isEating = false;
        this.attackTimer = 0;
        // Đi lùi về phía bên phải
        const currentSpeedPxPerSec = (CONFIG.CELL_WIDTH / (this.speedPerCell || 6.0)) * currentSpeedFactor;
        this.x += currentSpeedPxPerSec * dt;
        this.walkCycle = (Number.isFinite(this.walkCycle) ? this.walkCycle : 0) + dt * 4.5 * currentSpeedFactor;

        // Rời trận khi ra khỏi mép phải
        if (this.x > CONFIG.CANVAS_WIDTH + 60) {
          this.alive = false;
        }
      }
      return;
    }

    // ----------------------------------------------------
    // XỬ LÝ NHẢY SÀO (Pole Vaulting Zombie)
    // ----------------------------------------------------
    if (this.type === 'pole_vaulting' && this.isVaulting) {
      this.vaultTimer += dt;
      const t = Math.min(1.0, this.vaultTimer / 0.85);
      // Quỹ đạo nhảy hình parabol qua đầu cây
      this.x = this.vaultStartX + (this.vaultTargetX - this.vaultStartX) * t;

      if (t >= 1.0) {
        this.isVaulting = false;
        this.hasVaulted = true;
        // Sau khi nhảy mất sào: tốc độ giảm xuống 4.5s/ô (17.78 px/s)
        this.speedPerCell = ZOMBIE_CONFIG.pole_vaulting.slowSpeedPerCell || 4.5;
        this.speed = (CONFIG.CELL_WIDTH / this.speedPerCell) / 60;
      }
      return;
    }

    // ----------------------------------------------------
    // XỬ LÝ LÃNG KHÁCH ZOMBIE (Skill 1: Lướt & Skill 3: Lốc Xoáy)
    // ----------------------------------------------------
    if (this.type === 'lang_khach') {
      const proto = ZOMBIE_CONFIG.lang_khach || {};
      // Mở khóa lướt nếu cây chắn trước mặt đã bị tiêu diệt
      if (this.dashBlockedPlant && (!this.dashBlockedPlant.alive || this.dashBlockedPlant.isRecharging)) {
        this.dashBlockedPlant = null;
      }

      if (this.isDashing) {
        this.dashTimer += dt;
        const t = Math.min(1.0, this.dashTimer / (this.dashDuration || 0.28));
        const easeT = 1 - Math.pow(1 - t, 2);
        this.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * easeT;

        if (t >= 1.0) {
          this.isDashing = false;
          this.dashRecoveryTimer = 0.25;

          const landedCol = Math.floor((this.x - CONFIG.GRID_OFFSET_X) / CONFIG.CELL_WIDTH);
          const blockingPlant = gameState.plants.find(p =>
            p.alive && !p.isRecharging && !p.isGroundPlant && p.row === this.row &&
            (p.col === landedCol || (p.x <= this.x + 25 && (this.x - p.x) <= CONFIG.CELL_WIDTH * 0.85))
          );
          if (blockingPlant) {
            this.dashBlockedPlant = blockingPlant;
          }

          if (this.dashCount >= (proto.tornadoThreshold || 2)) {
            this.dashCount = 0;
            this.triggerLangKhachTornado(gameState);
            if (this.dashBlockedPlant && (!this.dashBlockedPlant.alive || this.dashBlockedPlant.isRecharging)) {
              this.dashBlockedPlant = null;
            }
          }
        }
        return;
      }

      // Skill 1: Sau khi lướt xong, không thể lướt tiếp tới khi tấn công thường ăn được 1 plant
      if (!this.mustEatPlantToDash && !this.dashBlockedPlant && this.dashRecoveryTimer <= 0) {
        const dashRangePx = CONFIG.CELL_WIDTH * (proto.dashRangeCells || 3.0) + 8;
        let firstPlantAhead = null;
        let maxPlantX = -Infinity;
        for (const p of gameState.plants) {
          if (!p.alive || p.isRecharging || p.isGroundPlant || p.row !== this.row) continue;
          if (p.x <= this.x + CONFIG.CELL_WIDTH * 0.35 && (this.x - p.x) <= dashRangePx) {
            if (p.x > maxPlantX) {
              maxPlantX = p.x;
              firstPlantAhead = p;
            }
          }
        }

        if (firstPlantAhead) {
          const dashDmg = proto.dashDamage || 100;
          firstPlantAhead.takeDamage(dashDmg, false);
          gameState.spawnParticles(firstPlantAhead.x, firstPlantAhead.y - 8, '#80deea', 8);

          const landingCol = firstPlantAhead.col - 1;
          const plantAtLanding = gameState.plants.find(p =>
            p.alive && !p.isRecharging && !p.isGroundPlant && p.row === this.row && p.col === landingCol
          );
          const minSafeX = CONFIG.GRID_OFFSET_X + 14;
          const rawLandingX = plantAtLanding
            ? (plantAtLanding.x + 18)
            : (firstPlantAhead.x - CONFIG.CELL_WIDTH);
          const clampedTargetX = Math.max(minSafeX, rawLandingX);

          this.isDashing = true;
          this.dashTimer = 0;
          this.dashStartX = this.x;
          this.dashTargetX = clampedTargetX;
          this.mustEatPlantToDash = true;
          this.dashCount += 1;
          this.slashAnimTimer = 0.34;
          this.isEating = false;
          this.eatingPlant = null;

          if (gameState.spawnAttackEffect) {
            gameState.spawnAttackEffect({
              kind: 'lang_khach_dash',
              x: this.x,
              y: this.y,
              row: this.row,
              minRow: this.row,
              maxRow: this.row,
              startX: clampedTargetX,
              endX: this.x,
              duration: 0.32
            });
          }
          gameState.spawnParticles(this.x, this.y + 12, '#ef5350', 6);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(firstPlantAhead.x, firstPlantAhead.y - 26, `LƯỚT! 💨 (-${dashDmg})`, '#80deea', 16);
          }
          return;
        }
      }
    }

    // ----------------------------------------------------
    // XỬ LÝ BẮN LASER (Turquoise Skull Zombie)
    // ----------------------------------------------------
    if (this.type === 'turquoise_skull') {
      const targetPlantInLaserRange = gameState.plants.find(p => {
        return p.alive && !p.isRecharging && !p.isGroundPlant && p.row === this.row && p.x < this.x && (this.x - p.x) <= CONFIG.CELL_WIDTH * 4;
      });

      if (targetPlantInLaserRange) {
        this.isChargingLaser = true;
        this.laserTimer += dt;
        if (this.laserTimer >= this.laserChargeDuration) {
          this.laserTimer = 0;
          this.isChargingLaser = false;
          // Bắn tia Laser xuyên thấu tiêu diệt cây với 4000 sát thương
          if (targetPlantInLaserRange.alive) {
            targetPlantInLaserRange.takeDamage(this.laserDamage);
          }
          if (gameState.spawnLaserBeam) {
            gameState.spawnLaserBeam(this.x, this.y, targetPlantInLaserRange.x, targetPlantInLaserRange.y, this.row);
          }
        }
        return; // Dừng di chuyển trong khi đang tập trung năng lượng bắn Laser
      } else {
        this.isChargingLaser = false;
        this.laserTimer = 0;
      }
    }

    // ----------------------------------------------------
    // XỬ LÝ LÍNH CÁT SA MẠC (Trỗi dậy 0.35s, đánh 1 cây 200 DMG rồi biến mất)
    // ----------------------------------------------------
    if (this.type === 'sand_soldier' && this.emergeTimer > 0) {
      this.emergeTimer = Math.max(0, this.emergeTimer - dt);
      return;
    }

    // ----------------------------------------------------
    // XỬ LÝ MINI-BOSS 1: THẦN CÁ SẤU (Renekton)
    // ----------------------------------------------------
    if (this.type === 'renekton_croc' && !this.isHypnotized) {
      if (this.sweepAnimTimer > 0) {
        this.sweepAnimTimer = Math.max(0, this.sweepAnimTimer - dt);
      }

      // Hóa khổng lồ khi di chuyển đến giữa sân (<= cột 4.5)
      const centerLawnX = CONFIG.GRID_OFFSET_X + 4.5 * CONFIG.CELL_WIDTH;
      if (!this.isGiantForm && this.x <= centerLawnX) {
        this.triggerRenektonGiantTransform(gameState);
      }

      // Đang tụ lực 3s cho Skill 2: Quét Đao 3x3 (400 DMG + hồi 100 HP / cây + lướt 1 ô, chỉ dùng 1 lần)
      if (this.isChargingSweep) {
        this.sweepChargeTimer -= dt;
        this.isEating = false;
        this.eatingPlant = null;
        if (this.sweepChargeTimer <= 0) {
          this.isChargingSweep = false;
          this.hasUsedSweep = true;
          this.sweepCharges = 0;
          this.executeRenektonSweep(gameState);
        }
        return;
      }

      // Đang lướt qua cây (Skill 1)
      if (this.isDashing) {
        this.dashTimer += dt;
        const t = Math.min(1.0, this.dashTimer / (this.dashDuration || 0.22));
        const easeT = 1 - Math.pow(1 - t, 2);
        this.x = this.dashStartX + (this.dashTargetX - this.dashStartX) * easeT;
        if (t >= 1.0) {
          this.isDashing = false;
        }
        return;
      }

      // Dạng Khổng Lồ: Kích hoạt tụ lực 3s Skill 2 (chỉ dùng 1 lần duy nhất) khi có cây trong phạm vi 3x3
      if (this.isGiantForm && !this.hasUsedSweep && this.sweepCharges > 0) {
        if (gameState && Array.isArray(gameState.plants)) {
          const hasPlantInSweep = gameState.plants.some(p =>
            p.alive && !p.isRecharging &&
            Math.abs(p.row - this.row) <= 1 &&
            Math.abs(p.x - this.x) <= CONFIG.CELL_WIDTH * 1.55
          );
          if (hasPlantInSweep) {
            this.isChargingSweep = true;
            this.sweepChargeTimer = this.sweepChargeDuration || 3.0;
            this.sweepCharges = Math.max(0, this.sweepCharges - 1);
            this.hasUsedSweep = true;
            this.isEating = false;
            this.eatingPlant = null;
            if (gameState.spawnFloatingText) {
              gameState.spawnFloatingText(this.x, this.y - 46, 'CÁ SẤU TỤ LỰC 3s! 🐊⚔️', '#ff5252', 17);
            }
            return;
          }
        }
      }

      // Skill 1: Lướt qua 2 cây đầu tiên gặp phải gây 1000 DMG
      if (this.dashCharges > 0 && gameState && Array.isArray(gameState.plants)) {
        let firstPlant = null;
        let maxX = -Infinity;
        for (const p of gameState.plants) {
          if (!p.alive || p.isRecharging || p.isGroundPlant || p.row !== this.row) continue;
          if (p.x <= this.x + CONFIG.CELL_WIDTH * 0.45 && (this.x - p.x) <= CONFIG.CELL_WIDTH * 0.85) {
            if (p.x > maxX) {
              maxX = p.x;
              firstPlant = p;
            }
          }
        }
        if (firstPlant) {
          const dashDmg = (ZOMBIE_CONFIG.renekton_croc && ZOMBIE_CONFIG.renekton_croc.dashDamage) || 1000;
          this.dashCharges -= 1;
          firstPlant.takeDamage(dashDmg, false);
          this.isEating = false;
          this.eatingPlant = null;
          this.isDashing = true;
          this.dashTimer = 0;
          this.dashStartX = this.x;
          this.dashTargetX = Math.max(CONFIG.GRID_OFFSET_X + 12, firstPlant.x - CONFIG.CELL_WIDTH * 0.72);
          gameState.spawnParticles(firstPlant.x, firstPlant.y - 8, '#ff7043', 14);
          gameState.spawnParticles(firstPlant.x, firstPlant.y - 8, '#ffd54f', 10);
          if (gameState.spawnAttackEffect) {
            gameState.spawnAttackEffect({
              kind: 'renekton_charge',
              x: this.x,
              y: this.y,
              row: this.row,
              startX: this.dashTargetX,
              endX: this.x,
              duration: 0.34
            });
          }
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(firstPlant.x, firstPlant.y - 28, `CÁ SẤU LƯỚT -${dashDmg}! 🐊💨`, '#ffab00', 16);
          }
          return;
        }
      }
    }

    // ----------------------------------------------------
    // XỬ LÝ MINI-BOSS 2: THẦN KHUYỂN (Nasus)
    // ----------------------------------------------------
    if (this.type === 'nasus_hound' && !this.isHypnotized) {
      if (this.witherCastAnimTimer > 0) {
        this.witherCastAnimTimer = Math.max(0, this.witherCastAnimTimer - dt);
      }
      if (!this.isGiantForm && this.hp < this.maxHp * 0.60) {
        this.triggerNasusGiantTransform(gameState);
      }

      // Skill 1 Lão Hóa: Chỉ dùng khi >= 60% HP (chưa hóa lớn), tầm 2 ô trước mặt, hồi chiêu 10s
      if (!this.isGiantForm) {
        if (this.witherCooldownTimer > 0) {
          this.witherCooldownTimer = Math.max(0, this.witherCooldownTimer - dt);
        }
        if (this.witherCooldownTimer <= 0 && gameState && Array.isArray(gameState.plants)) {
          const rangePx = CONFIG.CELL_WIDTH * 2.2;
          const candidates = gameState.plants.filter(p =>
            p.alive && !p.isRecharging &&
            Math.abs(p.row - this.row) <= 1 &&
            p.x <= this.x + 20 &&
            (this.x - p.x) <= rangePx
          );
          if (candidates.length > 0) {
            candidates.sort((a, b) => {
              const rowDiffA = Math.abs(a.row - this.row);
              const rowDiffB = Math.abs(b.row - this.row);
              if (rowDiffA !== rowDiffB) return rowDiffA - rowDiffB;
              return b.x - a.x;
            });
            this.castNasusWitherZone(candidates[0], gameState);
            this.witherCooldownTimer = this.witherCooldown || 10.0;
          }
        }
      }
    }

    // ----------------------------------------------------
    // XỬ LÝ ANIVIA PHƯỢNG HOÀNG BĂNG (Trứng 5s -> Dạng 2 & Tấn công tầm 3 ô)
    // ----------------------------------------------------
    if (this.type === 'anivia') {
      if (this.aniviaPhase === 'egg') {
        this.isAttacking = false;
        this.isEating = false;
        this.eggTimer -= dt;
        if (this.eggTimer <= 0 && this.alive) {
          // Hồi sinh & Tiến hóa lên Dạng 2!
          this.aniviaPhase = 'phase2';
          this.hp = this.phase2Hp || 1100;
          this.maxHp = this.phase2Hp || 1100;
          this.baseHp = this.maxHp;
          this.isFlying = true;
          this.flyingSize = 'large';
          this.isLargeFlying = true;
          this.damage = this.phase2Damage || 40;
          this.attackInterval = this.phase2AttackInterval || 0.35;
          this.attackTimer = this.attackInterval;
          this.stunTimer = 0;
          this.slowTimer = 0;
          this.slowFactor = 1.0;
          this.poisonStacks = 0;
          this.poisonDuration = 0;
          if (gameState) {
            gameState.spawnParticles(this.x, this.y - 16, '#80deea', 24);
            gameState.spawnParticles(this.x, this.y - 16, '#ffffff', 16);
            if (gameState.spawnFloatingText) {
              gameState.spawnFloatingText(this.x, this.y - 44, 'TIẾN HÓA DẠNG 2! ❄️🔥', '#00e5ff', 19);
            }
          }
        }
        return;
      }

      // Dạng 1 & Dạng 2: Bay trên không, bắn cột băng sắc nhọn tầm 3 ô (bỏ qua cây sát đất / mìn)
      const rangePx = CONFIG.CELL_WIDTH * (this.attackRangeCells || 3.0) + 12;
      let bestTarget = null;
      let maxTargetX = -Infinity;

      if (gameState && gameState.plants) {
        for (const p of gameState.plants) {
          if (!p.alive || p.isRecharging || p.isGroundPlant || p.type === 'potato_mine') continue;
          if (p.row !== this.row) continue;
          if (p.x <= this.x + 25 && (this.x - p.x) <= rangePx && p.x > maxTargetX) {
            maxTargetX = p.x;
            bestTarget = p;
          }
        }
      }
      if (gameState && gameState.barriers) {
        for (const b of gameState.barriers) {
          if (!b.alive) continue;
          if (b.x <= this.x + 25 && (this.x - b.x) <= rangePx && b.x > maxTargetX) {
            maxTargetX = b.x;
            bestTarget = b;
          }
        }
      }
      if (gameState && gameState.zombies) {
        for (const z of gameState.zombies) {
          if (!z.alive || !z.isHypnotized || z.row !== this.row) continue;
          if (z.x <= this.x + 25 && (this.x - z.x) <= rangePx && z.x > maxTargetX) {
            maxTargetX = z.x;
            bestTarget = z;
          }
        }
      }

      if (bestTarget) {
        this.isAttacking = true;
        this.isEating = false;
        this.eatingPlant = null;
        this.attackTimer += atkDt;
        if (this.attackTimer >= this.attackInterval) {
          this.attackTimer = Math.min(this.attackInterval, this.attackTimer - this.attackInterval);
          if (gameState && typeof gameState.spawnAniviaIceSpike === 'function') {
            gameState.spawnAniviaIceSpike(this, bestTarget);
          } else {
            if (this.aniviaPhase === 'phase2') {
              bestTarget.aniviaAssistTimer = 4.0;
            }
            bestTarget.takeDamage(this.damage || 40, false);
          }
        }
        return;
      } else {
        this.isAttacking = false;
        this.isEating = false;
        this.eatingPlant = null;
        this.attackTimer = Math.min(this.attackInterval, this.attackTimer + atkDt);

        const currentSpeedPxPerSec = (CONFIG.CELL_WIDTH / (this.speedPerCell || 8.0)) * currentSpeedFactor;
        this.x -= currentSpeedPxPerSec * dt;
        this.walkCycle = (Number.isFinite(this.walkCycle) ? this.walkCycle : 0) + dt * 4.5 * currentSpeedFactor;

        if (this.x <= CONFIG.GRID_OFFSET_X) {
          const mower = gameState.lawnmowers[this.row];
          if (mower && mower.active) {
            mower.trigger(gameState);
          } else if (!mower || !mower.active) {
            if (gameState.isSandbox) {
              this.alive = false;
            } else {
              gameState.triggerGameOver();
            }
          }
        }
        return;
      }
    }

    // ----------------------------------------------------
    // XỬ LÝ THRESH ZOMBIE (Ném xích tầm 3 ô, choáng cây tấn công, kéo 1 ô + 100 DMG / 1.5s)
    // ----------------------------------------------------
    if (this.type === 'thresh') {
      if (this.hookThrowAnimTimer > 0) {
        this.hookThrowAnimTimer = Math.max(0, this.hookThrowAnimTimer - dt);
      }
      if (this.hookCooldown > 0) {
        this.hookCooldown = Math.max(0, this.hookCooldown - dt);
      }

      // Kiểm tra mục tiêu đang bị trói xích có còn hợp lệ trên sân không
      if (this.hookedPlant) {
        const target = this.hookedPlant;
        const stillOnLawn = target.alive && !target.isRecharging && !target.shoveled &&
          target.row === this.row && gameState.plants.includes(target);
        if (!stillOnLawn) {
          this.releaseThreshHook();
          // Nếu vừa mất mục tiêu (chết / bị loại khỏi sân) -> kéo liền luôn nếu trong tầm còn cây!
          if (this.tryThreshHook(gameState)) {
            return;
          }
        }
      }

      // Đang trói & kéo cây hiện tại
      if (this.hookedPlant) {
        const target = this.hookedPlant;
        this.isHooking = true;
        this.isEating = false;
        this.eatingPlant = null;

        // Duy trì trạng thái choáng nếu là plant tấn công
        if (this.isAttackingPlant(target)) {
          target.stunTimer = Math.max(target.stunTimer || 0, 0.25);
          target.hookedByThresh = this;
        }

        this.hookPullTimer += dt;
        const pullInterval = this.pullInterval || 1.5;
        if (this.hookPullTimer >= pullInterval) {
          this.hookPullTimer -= pullInterval;
          const nextCol = target.col + 1;

          if (nextCol >= CONFIG.COLS) {
            // Bị kéo ra hết sân -> cây bị tiêu diệt lập tức!
            const oldX = target.x;
            const oldY = target.y;
            this.releaseThreshHook();
            target.pulledOffLawn = true;
            target.takeDamage(99999, true);
            target.alive = false;
            gameState.spawnParticles(oldX, oldY, '#26a69a', 16);
            gameState.spawnParticles(oldX, oldY, '#69f0ae', 10);
            if (gameState.spawnFloatingText) {
              gameState.spawnFloatingText(oldX, oldY - 26, 'BỊ KÉO RA HẾT SÂN! ⛓️💀', '#69f0ae', 16);
            }
            this.tryThreshHook(gameState);
            return;
          }

          // Nếu ô phía trước có cây khác thì hoán đổi để không bị chồng ô
          const occupant = gameState.plants.find(p =>
            p !== target && p.alive && p.row === this.row && p.col === nextCol
          );
          if (occupant) {
            occupant.col = target.col;
            occupant.x = CONFIG.GRID_OFFSET_X + occupant.col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
          }

          target.col = nextCol;
          target.x = CONFIG.GRID_OFFSET_X + target.col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
          target.takeDamage(this.pullDamage || 100, false);

          gameState.spawnParticles(target.x, target.y - 6, '#26a69a', 10);
          gameState.spawnParticles(target.x, target.y - 6, '#b9f6ca', 5);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(target.x, target.y - 26, `-${this.pullDamage || 100} ⛓️`, '#69f0ae', 15);
          }

          if (!target.alive || target.isRecharging) {
            // Sau khi kéo mà plant chết -> kéo liền luôn nếu phạm vi có cây!
            this.releaseThreshHook();
            this.tryThreshHook(gameState);
          } else if (this.isAttackingPlant(target)) {
            target.stunTimer = Math.max(target.stunTimer || 0, pullInterval + 0.15);
            target.hookedByThresh = this;
          }
        }
        return;
      }

      // Chưa trói cây nào -> thử ném xích nếu trong tầm 3 ô có plant
      if (this.hookCooldown <= 0 && this.tryThreshHook(gameState)) {
        return;
      }
    }

    // ----------------------------------------------------
    // XỬ LÝ QUẬN CHÚA (Tầm đánh 1 ô 150 DMG/s, niệm phép 3s triệu hồi khi ≥3 zom cùng hàng chết)
    // ----------------------------------------------------
    if (this.type === 'quan_chua') {
      if (this.castAnimTimer > 0) {
        this.castAnimTimer = Math.max(0, this.castAnimTimer - dt);
      }

      // Đứng im niệm phép 3s thu linh hồn
      if (this.isChanneling) {
        this.isAttacking = false;
        this.isEating = false;
        this.eatingPlant = null;
        this.channelTimer -= dt;
        if (this.channelTimer <= 0) {
          this.completeQuanChuaRitual(gameState);
        }
        return;
      }

      // Tìm mục tiêu trong tầm đánh 1 ô phía trước cùng hàng
      const rangePx = CONFIG.CELL_WIDTH * (this.attackRangeCells || 1.0) + 15;
      let bestTarget = null;
      let maxTargetX = -Infinity;

      if (gameState && gameState.plants) {
        for (const p of gameState.plants) {
          if (!p.alive || p.isRecharging || p.isGroundPlant) continue;
          if (p.row !== this.row) continue;
          if (p.x <= this.x + 25 && (this.x - p.x) <= rangePx && p.x > maxTargetX) {
            maxTargetX = p.x;
            bestTarget = p;
          }
        }
      }
      if (gameState && gameState.barriers) {
        for (const b of gameState.barriers) {
          if (!b.alive) continue;
          if (b.x <= this.x + 25 && (this.x - b.x) <= rangePx && b.x > maxTargetX) {
            maxTargetX = b.x;
            bestTarget = b;
          }
        }
      }
      if (gameState && gameState.zombies) {
        for (const z of gameState.zombies) {
          if (!z.alive || !z.isHypnotized || z.row !== this.row) continue;
          if (z.x <= this.x + 25 && (this.x - z.x) <= rangePx && z.x > maxTargetX) {
            maxTargetX = z.x;
            bestTarget = z;
          }
        }
      }

      if (bestTarget) {
        this.isAttacking = true;
        this.isEating = false;
        this.eatingPlant = null;
        this.attackTimer += atkDt;
        if (this.attackTimer >= this.attackInterval) {
          this.attackTimer = Math.min(this.attackInterval, this.attackTimer - this.attackInterval);
          this.castAnimTimer = 0.28;
          const dmg = this.damage || 150;
          bestTarget.takeDamage(dmg, false);
          if (gameState) {
            gameState.spawnParticles(bestTarget.x, bestTarget.y - 8, '#ce93d8', 8);
            gameState.spawnParticles(bestTarget.x, bestTarget.y - 8, '#ffd54f', 4);
            if (gameState.spawnAttackEffect) {
              gameState.spawnAttackEffect({
                kind: 'quan_chua_strike',
                x: this.x - 14,
                y: this.y - 12,
                startX: this.x - 14,
                startY: this.y - 12,
                endX: bestTarget.x,
                endY: bestTarget.y - 8,
                duration: 0.24
              });
            }
          }
        }
        return;
      }

      this.isAttacking = false;
      this.isEating = false;
      this.eatingPlant = null;
      this.attackTimer = Math.min(this.attackInterval, this.attackTimer + dt);

      const currentSpeedPxPerSec = (CONFIG.CELL_WIDTH / (this.speedPerCell || 7.0)) * currentSpeedFactor;
      this.x -= currentSpeedPxPerSec * dt;
      this.walkCycle = (Number.isFinite(this.walkCycle) ? this.walkCycle : 0) + dt * 4.5 * currentSpeedFactor;

      if (this.x <= CONFIG.GRID_OFFSET_X) {
        const mower = gameState.lawnmowers[this.row];
        if (mower && mower.active) {
          mower.trigger(gameState);
        } else if (!mower || !mower.active) {
          if (gameState.isSandbox) {
            this.alive = false;
          } else {
            gameState.triggerGameOver();
          }
        }
      }
      return;
    }

    // ----------------------------------------------------
    // XỬ LÝ HUYẾT PHÁP SƯ NOSUS (Tầm 2.5 ô bắn cầu huyết + Huyết Tế hồi 120 HP & +25% tốc chạy 3x2)
    // ----------------------------------------------------
    if (this.type === 'nosus_hemomancer') {
      if (this.bloodPactTimer > 0) {
        this.bloodPactTimer = Math.max(0, this.bloodPactTimer - dt);
      }
      if (this.bloodPactTimer <= 0 && this.x <= CONFIG.CANVAS_WIDTH - 10) {
        this.bloodPactTimer = this.bloodPactCooldown || 6.5;
        this.castNosusBloodPact(gameState);
      }

      const rangePx = CONFIG.CELL_WIDTH * (this.attackRangeCells || 2.5) + 12;
      let bestTarget = null;
      let maxTargetX = -Infinity;

      if (gameState && gameState.plants) {
        for (const p of gameState.plants) {
          if (!p.alive || p.isRecharging || p.isGroundPlant) continue;
          if (p.row !== this.row) continue;
          if (p.x <= this.x + 20 && (this.x - p.x) <= rangePx && p.x > maxTargetX) {
            maxTargetX = p.x;
            bestTarget = p;
          }
        }
      }
      if (gameState && gameState.barriers) {
        for (const b of gameState.barriers) {
          if (!b.alive) continue;
          if (b.x <= this.x + 20 && (this.x - b.x) <= rangePx && b.x > maxTargetX) {
            maxTargetX = b.x;
            bestTarget = b;
          }
        }
      }
      if (gameState && gameState.zombies) {
        for (const z of gameState.zombies) {
          if (!z.alive || !z.isHypnotized || z.row !== this.row) continue;
          if (z.x <= this.x + 20 && (this.x - z.x) <= rangePx && z.x > maxTargetX) {
            maxTargetX = z.x;
            bestTarget = z;
          }
        }
      }

      if (bestTarget) {
        this.isAttacking = true;
        this.isEating = false;
        this.eatingPlant = null;
        this.attackTimer += atkDt;
        if (this.attackTimer >= this.attackInterval) {
          this.attackTimer = Math.min(this.attackInterval, this.attackTimer - this.attackInterval);
          this.hemoCastAnimTimer = 0.34;
          const dmg = this.damage || 80;
          bestTarget.takeDamage(dmg, false);
          if (gameState) {
            gameState.spawnParticles(bestTarget.x, bestTarget.y - 8, '#ff1744', 8);
            gameState.spawnParticles(bestTarget.x, bestTarget.y - 8, '#b71c1c', 5);
            if (gameState.spawnAttackEffect) {
              gameState.spawnAttackEffect({
                kind: 'nosus_blood_bolt',
                x: this.x - 16,
                y: this.y - 12,
                startX: this.x - 16,
                startY: this.y - 12,
                endX: bestTarget.x,
                endY: bestTarget.y - 8,
                duration: 0.25
              });
            }
          }
        }
        return;
      }

      this.isAttacking = false;
      this.isEating = false;
      this.eatingPlant = null;
      this.attackTimer = Math.min(this.attackInterval, this.attackTimer + atkDt);

      const currentSpeedPxPerSec = (CONFIG.CELL_WIDTH / (this.speedPerCell || 6.5)) * currentSpeedFactor;
      this.x -= currentSpeedPxPerSec * dt;
      this.walkCycle = (Number.isFinite(this.walkCycle) ? this.walkCycle : 0) + dt * 4.5 * currentSpeedFactor;

      if (this.x <= CONFIG.GRID_OFFSET_X) {
        const mower = gameState.lawnmowers[this.row];
        if (mower && mower.active) {
          mower.trigger(gameState);
        } else if (!mower || !mower.active) {
          if (gameState.isSandbox) {
            this.alive = false;
          } else {
            gameState.triggerGameOver();
          }
        }
      }
      return;
    }

    // Rồng Hắc Ám: khi ra sân ăn thịt 1 rồng thường (Mới Nở / Trưởng Thành) để biến máu thành Giáp Hắc Ám
    if (this.type === 'dragon_dark' && !this.hasDevouredDragon && !this.isHypnotized && this.x <= CONFIG.CANVAS_WIDTH - 15 && gameState && Array.isArray(gameState.zombies)) {
      const victim = gameState.zombies.find(v =>
        v !== this &&
        v.alive &&
        !v.isHypnotized &&
        v.row === this.row &&
        (v.type === 'dragon_hatchling' || v.type === 'dragon_adult') &&
        Math.abs(v.x - this.x) <= CONFIG.CELL_WIDTH * 2.6
      );
      if (victim) {
        this.hasDevouredDragon = true;
        const absorbed = Math.max(1, Math.round(victim.hp));
        this.armorHp = (this.armorHp || 0) + absorbed;
        this.maxArmorHp = (this.maxArmorHp || 0) + absorbed;
        this.nonMetalArmor = true;

        victim.alive = false;
        victim.deathTimer = 99;
        victim.luxDeathProcessed = true;
        victim.quanChuaDeathProcessed = true;

        gameState.spawnParticles(victim.x, victim.y - 10, '#7b1fa2', 16);
        gameState.spawnParticles(this.x, this.y - 10, '#ce93d8', 12);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x, this.y - 42, `NUỐT RỒNG +${absorbed} GIÁP! 🖤🐉`, '#ea80fc', 16);
        }
      }
    }

    // Rồng Gió: khi ra sân tăng tốc cho zombie/rồng cùng hàng ×2 tốc độ chạy trong 3s
    if (this.type === 'dragon_wind' && !this.hasCastWindHaste && !this.isHypnotized && this.x <= CONFIG.CANVAS_WIDTH - 10 && gameState && Array.isArray(gameState.zombies)) {
      this.hasCastWindHaste = true;
      const dur = this.windHasteDuration || 3.0;
      const mult = this.windHasteMultiplier || 2.0;
      let buffedCount = 0;

      for (const ally of gameState.zombies) {
        if (!ally || ally === this || !ally.alive || ally.isObstacle || ally.isHypnotized) continue;
        if (ally.row !== this.row) continue;
        ally.windHasteTimer = Math.max(ally.windHasteTimer || 0, dur);
        ally.windHasteMultiplier = mult;
        buffedCount++;
        gameState.spawnParticles(ally.x, ally.y - 12, '#4dd0e1', 8);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(ally.x, ally.y - 30, '×2 TỐC (3s)! 💨', '#4dd0e1', 14);
        }
      }

      gameState.spawnParticles(this.x, this.y - 12, '#80deea', 16);
      gameState.spawnParticles(this.x, this.y - 12, '#e0f7fa', 10);
      if (gameState.spawnFloatingText) {
        const msg = buffedCount > 0 ? `GIÓ THUẬN ×2 TỐC (${buffedCount})! 🌪️` : 'CUỒNG PHONG KHỞI! 🌪️';
        gameState.spawnFloatingText(this.x, this.y - 40, msg, '#00e5ff', 16);
      }
    }

    // Darius (Đại Tướng Nosus) - Tốc đánh 1s/đòn khi đang Bất Tử, và Skill 1 Máy Chém Xoay 3x3 mỗi 5s khi <= 50% HP
    if (this.type === 'nosus_warlord') {
      this.attackInterval = this.invulnerableTimer > 0
        ? (this.dariusInvulnAttackInterval || 1.0)
        : (this.baseAttackInterval || 1.75);
      if (!this.isHypnotized && this.alive && this.hp > 0 && this.hp <= this.maxHp * 0.5 && this.x <= CONFIG.CANVAS_WIDTH - 10) {
        if (this.spinTimer > 0) {
          this.spinTimer = Math.max(0, this.spinTimer - dt);
        }
        if (this.spinTimer <= 0) {
          this.spinTimer = this.spinCooldown || 5.0;
          this.performDariusSpin(gameState);
        }
      }
    }

    // Kiểm tra va chạm với Cây, Hàng rào toàn ảnh hoặc Zombie đồng minh thôi miên
    // Khi cây đặt ra sau khi zombie đã bước vào ô, zombie lập tức tương tác/tấn công và nhận tác dụng của cây
    const plantInFront = gameState.plants.find(p => {
      if (!p.alive || p.isRecharging || p.row !== this.row) return false;
      // Cây sát đất (Cỏ Gai): không bị zombie thường ăn hay chặn nhảy sào, nhưng vẫn bị Gargantuar đập!
      if (p.isGroundPlant && this.type !== 'gargantuar') return false;
      return this.x >= p.x - CONFIG.CELL_WIDTH * 0.45 && this.x <= p.x + CONFIG.CELL_WIDTH * 0.85;
    });

    const barrierInFront = gameState.barriers.find(b => {
      return b.alive && Math.abs(this.x - b.x) < 30;
    });

    const hypnotizedAllyInFront = gameState.zombies.find(z => {
      return z.alive && z.isHypnotized && z.row === this.row && Math.abs(z.x - this.x) <= 30;
    });

    const targetToAttack = plantInFront || barrierInFront || hypnotizedAllyInFront;

    // Pole Vaulting gặp cây đầu tiên: Nhảy qua cây thay vì cắn (trừ Hạt Dẻ Cao Tall-nut sẽ chặn đứng cú nhảy!)
    if (this.type === 'pole_vaulting' && !this.hasVaulted && !this.isVaulting && plantInFront) {
      if (plantInFront.type === 'tall_nut') {
        this.hasVaulted = true; // Mất sào, rơi xuống trước mặt Tall-nut
        this.speedPerCell = ZOMBIE_CONFIG.pole_vaulting.slowSpeedPerCell || 4.5;
        this.speed = (CONFIG.CELL_WIDTH / this.speedPerCell) / 60;
        gameState.spawnParticles(this.x, this.y, '#d7ccc8', 12);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(plantInFront.x, plantInFront.y - 25, 'CHẶN ĐỨNG! 🛡️', '#ffd54f', 16);
        }
      } else {
        this.isVaulting = true;
        this.vaultTimer = 0;
        this.vaultStartX = this.x;
        this.vaultTargetX = Math.max(CONFIG.GRID_OFFSET_X, plantInFront.x - CONFIG.CELL_WIDTH * 0.9);
        gameState.spawnParticles(this.x, this.y, '#ffd54f', 6);
        return;
      }
    }

    if (targetToAttack) {
      // Dừng di chuyển để tấn công
      this.isEating = true;
      this.eatingPlant = targetToAttack;

      if (this.type === 'gargantuar') {
        // Gargantuar: Đập bẹp 1-hit ONESHOT bất kỳ cây nào (99999 DMG, phá hủy vĩnh viễn cả máy chiếu Infi-nut)
        this.isSmashing = true;
        this.attackTimer += atkDt;

        if (this.attackTimer >= this.smashWindup && !this.hasStruckThisCycle) {
          this.hasStruckThisCycle = true;
          targetToAttack.takeDamage(99999, true); // 1-hit oneshot bất kỳ plant nào!
          gameState.spawnParticles(targetToAttack.x, targetToAttack.y, '#795548', 12);
          if (gameState && gameState.audio) {
            gameState.audio.playGargantuarSmash();
          }

          // Nếu là nấm thôi miên bị đập thì bị nghiền nát
          if (targetToAttack.type === 'hypno_shroom') {
            targetToAttack.alive = false;
          }
        }

        if (this.attackTimer >= 2.0) {
          this.attackTimer = 0;
          this.hasStruckThisCycle = false;
          if (!targetToAttack.alive || targetToAttack.isRecharging) {
            this.isEating = false;
            this.isSmashing = false;
            this.eatingPlant = null;
          }
        }
      } else if (this.type === 'sand_soldier') {
        // Lính Cát: tấn công được 1 cây sát thương 200 rồi biến mất ngay
        const sandDmg = this.damage || 200;
        targetToAttack.takeDamage(sandDmg, false);
        gameState.spawnParticles(targetToAttack.x + 6, targetToAttack.y - 6, '#ffd54f', 12);
        gameState.spawnParticles(this.x, this.y - 8, '#d4a373', 10);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(targetToAttack.x, targetToAttack.y - 26, `-${sandDmg} LÍNH CÁT! ⏳`, '#ffd54f', 15);
        }
        if (gameState && gameState.audio && gameState.audio.playHit) {
          gameState.audio.playHit();
        }
        this.alive = false;
        this.hasAttackedOnce = true;
        this.deathTimer = 0.85;
        this.isEating = false;
        this.eatingPlant = null;
      } else if (this.type === 'nasus_hound' && this.isGiantForm) {
        // Thần Khuyển Hóa Lớn (<60% HP): tốc độ đánh 2s/lần, đòn đánh hủy diệt cây & hồi +350 HP
        this.attackInterval = 2.0;
        this.attackTimer += atkDt;
        if (this.attackTimer >= 2.0) {
          this.attackTimer = 0;
          if (targetToAttack.hasArmor) {
            targetToAttack.hasArmor = false;
            targetToAttack.armorHp = 0;
          }
          targetToAttack.takeDamage(99999, true);
          const healAmt = (ZOMBIE_CONFIG.nasus_hound && ZOMBIE_CONFIG.nasus_hound.giantHealOnKill) || 350;
          this.hp = Math.min(this.maxHp, this.hp + healAmt);
          gameState.spawnParticles(targetToAttack.x, targetToAttack.y - 8, '#ab47bc', 14);
          gameState.spawnParticles(this.x, this.y - 12, '#69f0ae', 10);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(this.x, this.y - 44, `TRẢM CÂY +${healAmt} HP! 🐺🪓`, '#ce93d8', 16);
          }
          if (gameState && gameState.audio && gameState.audio.playGargantuarSmash) {
            gameState.audio.playGargantuarSmash();
          }
          this.isEating = false;
          this.eatingPlant = null;
        }
      } else {
        // Zombie thường / Nón sắt / Thùng sắt / Các loài Rồng Long Tộc
        this.attackTimer += atkDt;
        if (this.attackTimer >= this.attackInterval) {
          this.attackTimer = 0;

          // ĐẶC ĐIỂM BẢN GỐC: KHI THÂY MA ĂN NẤM THÔI MIÊN, CHÚNG SẼ QUAY LẠI VÀ CHIẾN ĐẤU CHO BẠN!
          if (targetToAttack.type === 'hypno_shroom') {
            if (this.hypnoImmune) {
              targetToAttack.alive = false;
              targetToAttack.takeDamage(99999, true);
              this.isEating = false;
              this.eatingPlant = null;
              if (gameState) {
                gameState.spawnParticles(targetToAttack.x, targetToAttack.y - 6, '#ff1744', 14);
                if (gameState.spawnFloatingText) {
                  gameState.spawnFloatingText(this.x, this.y - 42, 'MIỄN THÔI MIÊN! 🪓', '#ff5252', 16);
                }
              }
              return;
            }
            const isSuper = targetToAttack.isSuperHypno;
            targetToAttack.alive = false;
            targetToAttack.takeDamage(9999);
            this.isEating = false;
            this.eatingPlant = null;
            if (isSuper) {
              // Zombie đột biến thành Gargantuar chiến đấu cho phe người chơi!
              this.alive = false;
              const allyGarg = new Zombie('gargantuar', this.row);
              allyGarg.x = this.x;
              allyGarg.isHypnotized = true;
              gameState.zombies.push(allyGarg);
              gameState.spawnParticles(this.x, this.y, '#e040fb', 30);
              gameState.spawnParticles(this.x, this.y, '#ffd54f', 20);
              if (gameState.spawnFloatingText) {
                gameState.spawnFloatingText(this.x, this.y - 35, 'ĐỘT BIẾN GARGANTUAR! 🧟‍♂️⚡', '#e040fb', 18);
              }
            } else {
              this.hypnotize(gameState);
            }
            if (gameState && gameState.audio) {
              gameState.audio.playHypno();
            }
            return;
          }

          const targetProto = (targetToAttack && targetToAttack.type && typeof PLANT_CONFIG !== 'undefined') ? PLANT_CONFIG[targetToAttack.type] : null;
          const isDefensiveTarget = !!targetToAttack && (
            (typeof HolographicBarrier !== 'undefined' && targetToAttack instanceof HolographicBarrier) ||
            targetToAttack.type === 'wall_nut' ||
            targetToAttack.type === 'tall_nut' ||
            targetToAttack.type === 'infi_nut' ||
            !!(targetProto && targetProto.isDefensive)
          );

          if (this.type === 'shen' && isDefensiveTarget) {
            if (this.defensiveTargetRef !== targetToAttack) {
              this.defensiveTargetRef = targetToAttack;
              this.defensiveBiteCount = 0;
            }
            this.defensiveBiteCount++;
            this.slashAnimTimer = 0.3;
            const killBites = (ZOMBIE_CONFIG.shen && ZOMBIE_CONFIG.shen.defensiveKillBites) || 3;

            if (this.defensiveBiteCount >= killBites) {
              // Skill 2: Kết liễu plant phòng thủ ở lần cắn thứ 3 bất kể lượng máu / giáp hiện có
              if (targetToAttack.hasArmor) {
                targetToAttack.hasArmor = false;
                targetToAttack.armorHp = 0;
              }
              targetToAttack.takeDamage(99999, true);
              this.defensiveTargetRef = null;
              this.defensiveBiteCount = 0;
              gameState.spawnParticles(targetToAttack.x, targetToAttack.y - 6, '#e040fb', 16);
              gameState.spawnParticles(targetToAttack.x, targetToAttack.y - 6, '#ffd54f', 8);
              if (gameState.spawnFloatingText) {
                gameState.spawnFloatingText(targetToAttack.x, targetToAttack.y - 28, `TRẢM HỒN (${killBites}/${killBites})! ⚔️💀`, '#e040fb', 16);
              }
            } else {
              targetToAttack.takeDamage(this.damage, false);
              gameState.spawnParticles(targetToAttack.x + 8, targetToAttack.y - 6, '#ce93d8', 7);
              if (gameState.spawnFloatingText) {
                gameState.spawnFloatingText(targetToAttack.x, targetToAttack.y - 24, `KIẾM HỒN (${this.defensiveBiteCount}/${killBites}) ⚔️`, '#ce93d8', 14);
              }
            }
          } else if (this.type === 'nosus_warlord') {
            this.slashAnimTimer = 0.38;
            const threshold = this.executeThreshold || 0.20;
            const targetMaxHp = targetToAttack.maxHp || 300;
            const effectiveHp = (targetToAttack.hp || 0) + (targetToAttack.armorHp || 0);
            const isOneHitFrenzy = !!this.isDariusFrenzied;
            const isExecute = !isOneHitFrenzy && effectiveHp > 0 && (effectiveHp / targetMaxHp) < threshold;

            if (isOneHitFrenzy || isExecute) {
              if (targetToAttack.hasArmor) {
                targetToAttack.hasArmor = false;
                targetToAttack.armorHp = 0;
              }
              targetToAttack.takeDamage(99999, true);
              gameState.spawnParticles(targetToAttack.x, targetToAttack.y - 8, '#ff1744', 20);
              gameState.spawnParticles(targetToAttack.x, targetToAttack.y - 8, '#ffd54f', 10);
              if (gameState.spawnFloatingText) {
                const msg = isOneHitFrenzy ? 'TRẢM SÁT ONE-HIT! 🪓💀' : 'HÀNH QUYẾT (<20%)! 🪓🩸';
                gameState.spawnFloatingText(targetToAttack.x, targetToAttack.y - 30, msg, '#ff1744', 17);
              }
            } else {
              targetToAttack.takeDamage(this.damage || 240, false);
              gameState.spawnParticles(targetToAttack.x + 8, targetToAttack.y - 6, '#d50000', 10);
              gameState.spawnParticles(targetToAttack.x + 8, targetToAttack.y - 6, '#ffd54f', 4);
            }
            if (gameState.spawnAttackEffect) {
              gameState.spawnAttackEffect({
                kind: 'nosus_darius_chop',
                x: targetToAttack.x,
                y: targetToAttack.y - 8,
                startX: this.x - 16,
                startY: this.y - 24,
                isExecute: isOneHitFrenzy || isExecute,
                duration: 0.34
              });
            }
          } else {
            let dealDmg = this.damage;
            let isDarkFirstStrike = false;
            if (this.type === 'dragon_dark' && this.firstStrikeTargets && !this.firstStrikeTargets.has(targetToAttack)) {
              this.firstStrikeTargets.add(targetToAttack);
              dealDmg = Math.round(this.damage * (this.firstHitMultiplier || 2.0));
              isDarkFirstStrike = true;
            }
            targetToAttack.takeDamage(dealDmg, false);
            if (this.type === 'lang_khach') {
              this.slashAnimTimer = 0.25;
              gameState.spawnParticles(targetToAttack.x + 8, targetToAttack.y - 6, '#b2ebf2', 4);
            } else if (this.type === 'shen') {
              this.slashAnimTimer = 0.28;
              gameState.spawnParticles(targetToAttack.x + 8, targetToAttack.y - 6, '#ce93d8', 5);
            } else if (this.type === 'nosus_thrall' || this.type === 'nosus_assassin' || this.type === 'nosus_shieldbearer') {
              gameState.spawnParticles(targetToAttack.x + 8, targetToAttack.y - 6, '#ff5252', 5);
            } else if (this.type === 'dragon_hatchling' || this.type === 'dragon_adult') {
              gameState.spawnParticles(targetToAttack.x + 6, targetToAttack.y - 6, '#ff6d00', 8);
              gameState.spawnParticles(targetToAttack.x + 6, targetToAttack.y - 6, '#ffd54f', 5);
              if (gameState.spawnAttackEffect) {
                gameState.spawnAttackEffect({
                  kind: 'dragon_fire_breath',
                  x: this.x - 12,
                  y: this.y - 8,
                  startX: this.x - 12,
                  startY: this.y - 10,
                  endX: targetToAttack.x + 6,
                  endY: targetToAttack.y - 6,
                  color: this.type === 'dragon_adult' ? '#ff3d00' : '#ff9100',
                  duration: 0.26
                });
              }
            } else if (this.type === 'dragon_dark') {
              gameState.spawnParticles(targetToAttack.x + 6, targetToAttack.y - 6, '#aa00ff', isDarkFirstStrike ? 12 : 6);
              if (isDarkFirstStrike && gameState.spawnFloatingText) {
                gameState.spawnFloatingText(targetToAttack.x, targetToAttack.y - 26, `-${dealDmg} ×2! 🖤`, '#ea80fc', 16);
              }
            } else if (this.type === 'dragon_chemtech') {
              gameState.spawnParticles(targetToAttack.x + 6, targetToAttack.y - 6, '#76ff03', 7);
            } else if (this.type === 'dragon_wind') {
              gameState.spawnParticles(targetToAttack.x + 6, targetToAttack.y - 6, '#4dd0e1', 7);
              gameState.spawnParticles(targetToAttack.x + 6, targetToAttack.y - 6, '#e0f7fa', 4);
            } else if (this.type === 'dragon_water') {
              gameState.spawnParticles(targetToAttack.x + 6, targetToAttack.y - 6, '#29b6f6', 8);
              gameState.spawnParticles(targetToAttack.x + 6, targetToAttack.y - 6, '#e1f5fe', 4);
            } else {
              gameState.spawnParticles(targetToAttack.x + 10, targetToAttack.y, '#81c784', 3);
            }
          }
          if (gameState && gameState.audio) {
            gameState.audio.playChomp();
          }

          // Nếu cây chết hoặc biến thành máy chiếu sạc (Infi-nut), zombie dừng cắn và đi tiếp!
          if (!targetToAttack.alive || targetToAttack.isRecharging) {
            this.isEating = false;
            this.eatingPlant = null;
            if (this.defensiveTargetRef === targetToAttack) {
              this.defensiveTargetRef = null;
              this.defensiveBiteCount = 0;
            }
            if (this.type === 'lang_khach' && targetToAttack !== hypnotizedAllyInFront) {
              this.mustEatPlantToDash = false;
            }
            if (this.dashBlockedPlant === targetToAttack) {
              this.dashBlockedPlant = null;
            }
          }
        }
      }
    } else {
      // Không có cây chặn đường -> Tiếp tục bước đi
      this.isEating = false;
      this.isSmashing = false;
      this.eatingPlant = null;
      this.attackTimer = 0;
      this.hasStruckThisCycle = false;

      // Di chuyển từ phải sang trái (dx = (CELL_WIDTH / speedPerCell) * dt * speedFactor)
      const currentSpeedPxPerSec = (CONFIG.CELL_WIDTH / this.speedPerCell) * currentSpeedFactor;
      this.x -= currentSpeedPxPerSec * dt;
      this.walkCycle = (Number.isFinite(this.walkCycle) ? this.walkCycle : 0) + dt * 4.5 * currentSpeedFactor;

      // Zombie xâm nhập vào nhà bên trái -> Kích hoạt Máy cắt cỏ hoặc Game Over
      if (this.x <= CONFIG.GRID_OFFSET_X) {
        const mower = gameState.lawnmowers[this.row];
        if (mower && mower.active) {
          mower.trigger(gameState);
        } else if (!mower || !mower.active) {
          if (gameState.isSandbox) {
            this.alive = false; // Trong Sandbox không ngắt quãng bằng Game Over
          } else {
            gameState.triggerGameOver();
          }
        }
      }
    }
  }

  takeDamage(amount, bypassArmor = false) {
    if (!this.alive) return;

    // Miễn nhiễm sát thương trong thời gian bất tử (Lãng Khách 3s / Darius Skill 2 2s)
    if ((this.type === 'lang_khach' || this.type === 'nosus_warlord') && this.invulnerableTimer > 0 && amount < 99999) {
      this.flashTimer = 0.08;
      return;
    }

    // Skill 3 Boss Rồng Ngàn Tuổi: Lớp khiên cộng dồn hấp thụ MỌI loại sát thương (kể cả độc / xuyên giáp)
    if (this.type === 'ancient_dragon_boss' && this.bossAllShieldHp > 0 && amount > 0) {
      this.flashTimer = 0.12;
      if (this.bossAllShieldHp >= amount) {
        this.bossAllShieldHp -= amount;
        if (this.gameState) {
          this.gameState.spawnParticles(this.x - 24, this.y, '#ffd54f', 5);
        }
        return;
      } else {
        amount -= this.bossAllShieldHp;
        this.bossAllShieldHp = 0;
      }
    }

    this.flashTimer = 0.12;
    const prevHp = this.hp;

    // Nếu có cờ bypassArmor (Đậu Độc): Đánh thẳng vào máu, bỏ qua giáp nón/xô và giáp Kiếm Linh Hồn
    if (bypassArmor) {
      this.hp -= amount;
    } else {
      let effectiveAmount = amount;
      // Giáp Kiếm Linh Hồn của Shen hấp thụ sát thương thường trước máu & giáp thường (vẫn bị Độc xuyên qua)
      if (this.spiritShieldHp > 0 && effectiveAmount > 0) {
        if (this.spiritShieldHp >= effectiveAmount) {
          this.spiritShieldHp -= effectiveAmount;
          return;
        } else {
          effectiveAmount -= this.spiritShieldHp;
          this.spiritShieldHp = 0;
        }
      }

      // Trừ giáp thường trước nếu có (Conehead / Buckethead)
      if (this.armorHp > 0) {
        if (this.armorHp >= effectiveAmount) {
          this.armorHp -= effectiveAmount;
          this.hp -= effectiveAmount;
          return;
        } else {
          this.armorHp = 0;
          this.hp -= effectiveAmount;
        }
      } else {
        this.hp -= effectiveAmount;
      }
    }

    // Kiểm tra các mốc mất máu thực (không tính khiên) của Boss Rồng Ngàn Tuổi: Skill 2, Skill 4, Skill 7
    if (this.type === 'ancient_dragon_boss' && typeof this.checkAncientBossHpTriggers === 'function') {
      this.checkAncientBossHpTriggers(this.gameState);
    }

    // Kiểm tra các mốc Phase 2 (15.000 HP) & Phase 3 (7.000 HP) của Boss Azir Hoàng Đế Sa Mạc
    if (this.type === 'azir_desert_emperor' && typeof this.checkAzirHpTriggers === 'function') {
      this.checkAzirHpTriggers(this.gameState);
    }

    // Kiểm tra mốc Hóa Lớn (< 60% HP) của Thần Khuyển
    if (this.type === 'nasus_hound' && !this.isGiantForm && this.hp > 0 && this.hp < this.maxHp * 0.60 && typeof this.triggerNasusGiantTransform === 'function') {
      this.triggerNasusGiantTransform(this.gameState);
    }

    // Sát Thủ Huyết Đao Nosus: Lần đầu chịu sát thương -> kích hoạt Cuồng Huyết (×1.6 tốc độ chạy trong 3s)
    if (this.type === 'nosus_assassin' && !this.hasBloodBurst && !this.isHypnotized && this.hp > 0 && amount > 0 && amount < 99999) {
      this.hasBloodBurst = true;
      this.bloodBurstTimer = this.bloodBurstDuration || 3.0;
      if (this.gameState) {
        this.gameState.spawnParticles(this.x, this.y - 8, '#ff1744', 12);
        if (this.gameState.spawnFloatingText) {
          this.gameState.spawnFloatingText(this.x, this.y - 34, 'CUỒNG HUYẾT ×1.6 TỐC! 🗡️🩸', '#ff5252', 15);
        }
      }
    }

    // Darius (Đại Tướng Nosus) - Skill 2: Sau khi xuống dưới 100 máu -> Bất tử 2s, đòn thường one-hit plant, ×2 tốc độ chạy tới khi chết
    if (this.type === 'nosus_warlord' && !this.hasDariusLastStand && !this.isHypnotized && amount < 99999 && this.hp < (this.dariusLastStandThreshold || 100)) {
      this.triggerDariusLastStand(prevHp, this.gameState);
      return;
    }

    // Skill 2 của Lãng Khách Zombie: Khi HP tụt xuống dưới 50% -> Bất tử 3s (1 lần/mạng)
    if (this.type === 'lang_khach' && !this.hasTriggeredInvuln && amount < 99999 && this.hp < this.maxHp * 0.5) {
      this.hasTriggeredInvuln = true;
      const proto = ZOMBIE_CONFIG.lang_khach || {};
      this.invulnerableTimer = proto.invulnDuration || 3.0;
      if (this.hp <= 0 && prevHp > 0) {
        this.hp = 1;
      }
      if (this.gameState) {
        this.gameState.spawnParticles(this.x, this.y - 10, '#80deea', 16);
        this.gameState.spawnParticles(this.x, this.y - 10, '#ffd54f', 12);
        if (this.gameState.spawnFloatingText) {
          this.gameState.spawnFloatingText(this.x, this.y - 36, 'BẤT TỬ 3s! 🛡️🌪️', '#ffd54f', 18);
        }
      }
      return;
    }

    if (this.hp <= 0) {
      // Kỹ năng Phượng Hoàng Băng Anivia: Khi chết ở Dạng 1 -> biến thành Trứng Băng Giá (770 HP) trong 5s
      if (this.type === 'anivia' && this.aniviaPhase === 'phase1' && !this.skipEggRebirth) {
        this.aniviaPhase = 'egg';
        this.hp = this.eggHp || 770;
        this.maxHp = this.eggHp || 770;
        this.baseHp = this.maxHp;
        this.eggTimer = this.eggDuration || 5.0;
        this.isFlying = false;
        this.isLargeFlying = false;
        this.flyingSize = null;
        this.isAttacking = false;
        this.isEating = false;
        this.eatingPlant = null;
        this.attackTimer = 0;
        this.stunTimer = 0;
        this.slowTimer = 0;
        this.slowFactor = 1.0;
        this.poisonStacks = 0;
        this.poisonDuration = 0;
        this.alive = true;
        if (this.gameState) {
          this.gameState.spawnParticles(this.x, this.y - 10, '#80deea', 20);
          this.gameState.spawnParticles(this.x, this.y - 10, '#ffffff', 12);
          if (this.gameState.spawnFloatingText) {
            this.gameState.spawnFloatingText(this.x, this.y - 38, 'TRỨNG BĂNG GIÁ (5s)! 🥚❄️', '#80deea', 17);
          }
        }
        return;
      }

      this.hp = 0;
      this.alive = false;
      this.isEating = false;
      this.isAttacking = false;
      this.isSmashing = false;
      this.isChargingLaser = false;
      this.laserTimer = 0;
      this.eatingPlant = null;
      if (this.type === 'thresh' && typeof this.releaseThreshHook === 'function') {
        this.releaseThreshHook();
      }

      // Nếu khối băng bị phá hủy, giải phóng Yeti Imp
      if (this.type === 'ice_block' && !this.hasReleasedImp && this.gameState) {
        this.hasReleasedImp = true;
        this.gameState.spawnParticles(this.x, this.y, '#80deea', 25);
        this.gameState.spawnParticles(this.x, this.y, '#ffffff', 20);
        if (this.gameState.spawnFloatingText) {
          this.gameState.spawnFloatingText(this.x, this.y - 25, 'YETI IMP THOÁT RA! ❄️👹', '#00e5ff', 16);
        }
        if (this.gameState.audio && this.gameState.audio.playHit) {
          this.gameState.audio.playHit();
        }
        const imp = new Zombie('yeti_imp', this.row);
        imp.x = this.x;
        this.gameState.zombies.push(imp);
      }

      // Quan Tài Sa Mạc vỡ -> triệu hồi 1 Basic Zombie tại vị trí quan tài
      if (this.type === 'sand_coffin' && !this.hasReleasedCoffinZombie && this.gameState) {
        this.hasReleasedCoffinZombie = true;
        this.gameState.spawnParticles(this.x, this.y - 8, '#ffd54f', 16);
        this.gameState.spawnParticles(this.x, this.y - 8, '#d4a373', 14);
        if (this.gameState.spawnFloatingText) {
          this.gameState.spawnFloatingText(this.x, this.y - 28, 'QUAN TÀI VỠ -> BASIC ZOMBIE! ⚰️🧟', '#ffd54f', 15);
        }
        const basicZ = new Zombie('basic', this.row, this.gameState);
        basicZ.x = this.x;
        this.gameState.zombies.push(basicZ);
      }

      // Rồng Nước: 10 bản thể — khi chết hồi sinh từ ô ban đầu ở hàng khác, cộng thêm +1/2 HP & ATK của bản vừa chết
      if (this.type === 'dragon_water' && !this.skipWaterRevive && !this.isHypnotized && (this.waterLife || 1) < (this.maxWaterLives || 10) && this.gameState) {
        this.skipWaterRevive = true;
        const candidateRows = [];
        for (let r = 0; r < CONFIG.ROWS; r++) {
          if (r !== this.row) candidateRows.push(r);
        }
        const nextRow = candidateRows.length > 0
          ? candidateRows[Math.floor(Math.random() * candidateRows.length)]
          : (this.row + 1) % CONFIG.ROWS;

        const nextLife = (this.waterLife || 1) + 1;
        const factor = this.waterScaleFactor || 0.5;
        const nextMaxHp = Math.round(this.maxHp + this.maxHp * factor);
        const nextDamage = Math.round(this.damage + this.damage * factor);

        const clone = new Zombie('dragon_water', nextRow, this.gameState);
        clone.waterLife = nextLife;
        clone.maxWaterLives = this.maxWaterLives || 10;
        clone.waterScaleFactor = factor;
        clone.hp = nextMaxHp;
        clone.maxHp = nextMaxHp;
        clone.baseHp = nextMaxHp;
        clone.damage = nextDamage;
        clone.x = CONFIG.CANVAS_WIDTH + 20;
        clone.visualScale = Math.min(1.42, 0.92 + (nextLife - 1) * 0.05);

        this.gameState.zombies.push(clone);

        this.gameState.spawnParticles(this.x, this.y - 10, '#29b6f6', 18);
        this.gameState.spawnParticles(this.x, this.y - 10, '#e1f5fe', 12);
        this.gameState.spawnParticles(clone.x - 24, clone.y - 10, '#00e5ff', 14);
        if (this.gameState.spawnFloatingText) {
          this.gameState.spawnFloatingText(this.x, this.y - 34, `BẢN THỂ ${nextLife}/10 XUẤT TRẬN! 💧`, '#00e5ff', 16);
          this.gameState.spawnFloatingText(clone.x - 56, clone.y - 36, `RỒNG NƯỚC ${nextLife}/10 (${nextMaxHp} HP · ${nextDamage} ATK) 🌊`, '#4fc3f7', 15);
        }
      }

      // Skill 3 Boss Rồng Ngàn Tuổi: Khi 1 Gargantuar hi sinh -> cộng dồn 500 khiên hấp thụ mọi sát thương cho Boss
      if (this.type === 'gargantuar' && !this.isHypnotized && !this.ancientBossShieldGranted && this.gameState && Array.isArray(this.gameState.zombies)) {
        this.ancientBossShieldGranted = true;
        const livingBosses = this.gameState.zombies.filter(z => z.alive && z.type === 'ancient_dragon_boss');
        for (const boss of livingBosses) {
          boss.grantAncientShield(500, this.gameState, this);
        }
      }
    }

    if (this.type === 'dragon_chemtech' && !this.skipChemDrop && typeof this.checkChemtechPotionDrop === 'function') {
      this.checkChemtechPotionDrop(this.gameState);
    }
  }

  checkChemtechPotionDrop(gameState) {
    const step = this.potionHpStep || 200;
    const maxP = this.maxPotions || 5;
    const damageLost = Math.max(0, (this.maxHp || 1000) - Math.max(0, this.hp));
    const targetTotal = !this.alive ? maxP : Math.min(maxP, Math.floor(damageLost / step));
    const needed = Math.max(0, targetTotal - (this.potionsThrown || 0));
    if (needed > 0 && gameState && typeof gameState.spawnChemPotionsAround === 'function') {
      this.potionsThrown += needed;
      gameState.spawnChemPotionsAround(this, needed);
    }
  }

  applyChemPotionBuff(kind, gameState) {
    if (!this.alive || this.isObstacle || this.isHypnotized) return false;
    if (this.type === 'dragon_chemtech' || this.potionBuffType) return false;

    this.potionBuffType = kind;
    if (kind === 'speed') {
      this.potionSpeedMult = 2.0;
      if (gameState) {
        gameState.spawnParticles(this.x, this.y - 8, '#ab47bc', 12);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x, this.y - 34, '×2 TỐC CHẠY! 💜🧪', '#ea80fc', 15);
        }
      }
    } else if (kind === 'giant_hp') {
      this.hp += 300;
      this.maxHp += 300;
      this.baseHp = (this.baseHp || this.maxHp) + 300;
      this.visualScale = 1.18;
      if (gameState) {
        gameState.spawnParticles(this.x, this.y - 8, '#66bb6a', 12);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x, this.y - 34, '+300 HP HÓA LỚN! 💚🧪', '#69f0ae', 15);
        }
      }
    } else if (kind === 'atk_speed') {
      this.potionAtkSpeedMult = 2.0;
      if (gameState) {
        gameState.spawnParticles(this.x, this.y - 8, '#ff5252', 12);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x, this.y - 34, '×2 TỐC ĐÁNH! ❤️🧪', '#ff5252', 15);
        }
      }
    }
    return true;
  }

  isAttackingPlant(plant) {
    if (!plant || !plant.type) return false;
    const cfg = (typeof PLANT_CONFIG !== 'undefined' && PLANT_CONFIG[plant.type]) ? PLANT_CONFIG[plant.type] : null;
    return !!(cfg && cfg.canAttack && !cfg.isDefensive && !cfg.produceSun);
  }

  findThreshHookTarget(gameState) {
    if (!gameState || !gameState.plants) return null;
    const rangePx = CONFIG.CELL_WIDTH * (this.hookRangeCells || 3.0) + 12;
    let bestTarget = null;
    let maxTargetX = -Infinity;
    for (const p of gameState.plants) {
      if (!p.alive || p.isRecharging || p.shoveled || p.row !== this.row) continue;
      if (p.x <= this.x + 25 && (this.x - p.x) <= rangePx && p.x > maxTargetX) {
        maxTargetX = p.x;
        bestTarget = p;
      }
    }
    return bestTarget;
  }

  tryThreshHook(gameState) {
    const target = this.findThreshHookTarget(gameState);
    if (!target) return false;

    this.hookedPlant = target;
    this.hookPullTimer = 0;
    this.hookThrowAnimTimer = 0.35;
    this.isHooking = true;
    this.isEating = false;
    this.eatingPlant = null;

    const isAtk = this.isAttackingPlant(target);
    if (isAtk) {
      target.stunTimer = Math.max(target.stunTimer || 0, (this.pullInterval || 1.5) + 0.15);
      target.hookedByThresh = this;
    }

    if (gameState) {
      gameState.spawnParticles(this.x - 16, this.y - 10, '#26a69a', 8);
      gameState.spawnParticles(target.x, target.y - 8, '#69f0ae', 10);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(
          target.x,
          target.y - 28,
          isAtk ? 'TRÓI XÍCH & CHOÁNG! ⛓️' : 'TRÓI XÍCH! ⛓️',
          '#69f0ae',
          15
        );
      }
    }
    return true;
  }

  releaseThreshHook() {
    if (this.hookedPlant) {
      if (this.hookedPlant.hookedByThresh === this) {
        this.hookedPlant.hookedByThresh = null;
        this.hookedPlant.stunTimer = 0;
        if (this.hookedPlant.state === 'stunned') {
          this.hookedPlant.state = 'idle';
        }
      }
      this.hookedPlant = null;
    }
    this.hookPullTimer = 0;
    this.isHooking = false;
  }

  onSameRowZombieDeath(deadZombie, gameState) {
    if (!this.alive || this.type !== 'quan_chua' || this.isHypnotized || !deadZombie) return;
    this.soulCount = (this.soulCount || 0) + 1;
    if (deadZombie.type === 'gargantuar') {
      this.gargantuarSouls = (this.gargantuarSouls || 0) + 1;
    }

    if (gameState) {
      gameState.spawnParticles(deadZombie.x, deadZombie.y - 12, '#ce93d8', 8);
      gameState.spawnParticles(this.x, this.y - 18, '#e040fb', 6);
    }

    const minSouls = this.minSoulsToChannel || 3;
    if (!this.isChanneling && this.soulCount >= minSouls) {
      this.isChanneling = true;
      this.channelTimer = this.channelDuration || 3.0;
      this.isAttacking = false;
      this.isEating = false;
      this.eatingPlant = null;
      if (gameState && gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 44, 'NIỆM PHÉP THU HỒN (3s)! 👑💜', '#ea80fc', 16);
      }
    }
  }

  completeQuanChuaRitual(gameState) {
    const souls = Math.max(0, this.soulCount || 0);
    const gargSouls = Math.max(0, this.gargantuarSouls || 0);
    const coneCount = souls >= (this.coneheadThreshold || 5) ? 1 : 0;
    const bucketCount = gargSouls;

    this.isChanneling = false;
    this.channelTimer = 0;
    this.soulCount = 0;
    this.gargantuarSouls = 0;
    this.castAnimTimer = 0.45;

    if (!gameState || !Array.isArray(gameState.zombies)) return;

    const spawnSummon = (type, indexOffset) => {
      const summoned = new Zombie(type, this.row);
      summoned.isSummonedByQuanChua = true;
      const offsetX = 10 + (indexOffset % 4) * 14;
      summoned.x = Math.max(
        CONFIG.GRID_OFFSET_X + 20,
        Math.min(CONFIG.CANVAS_WIDTH - 20, this.x - offsetX)
      );
      gameState.zombies.push(summoned);
      gameState.spawnParticles(summoned.x, summoned.y - 10, '#e040fb', 7);
      gameState.spawnParticles(summoned.x, summoned.y - 10, '#ffd54f', 4);
    };

    for (let i = 0; i < souls; i++) {
      spawnSummon('imp', i);
    }
    for (let c = 0; c < coneCount; c++) {
      spawnSummon('conehead', souls + c);
    }
    for (let b = 0; b < bucketCount; b++) {
      spawnSummon('buckethead', souls + coneCount + b);
    }

    if (gameState.spawnFloatingText) {
      let msg = `TRIỆU HỒI ${souls} IMP`;
      if (coneCount > 0) msg += ' + 1 NÓN';
      if (bucketCount > 0) msg += ` + ${bucketCount} XÔ SẮT`;
      msg += '! 👑';
      gameState.spawnFloatingText(this.x, this.y - 46, msg, '#ffd54f', 17);
    }
    if (gameState.audio && gameState.audio.playExplosion) {
      gameState.audio.playExplosion('normal');
    }
  }

  // Skill 3 của Lãng Khách Zombie: Lướt đủ 2 lần -> Bắn lốc xoáy gây 1800 sát thương lên 2 ô trước mặt
  triggerLangKhachTornado(gameState) {
    if (!gameState) return;
    const proto = ZOMBIE_CONFIG.lang_khach || {};
    const tornadoDmg = proto.tornadoDamage || 1800;
    const rangeCells = proto.tornadoRangeCells || 2.0;
    const rangePx = CONFIG.CELL_WIDTH * rangeCells + 16;
    const minX = Math.max(CONFIG.GRID_OFFSET_X, this.x - rangePx);
    const maxX = this.x + 15;

    (gameState.plants || []).forEach(p => {
      if (p.alive && !p.isRecharging && p.row === this.row && p.x >= minX && p.x <= maxX) {
        p.takeDamage(tornadoDmg, false);
        gameState.spawnParticles(p.x, p.y - 10, '#80deea', 8);
        gameState.spawnParticles(p.x, p.y - 10, '#ef5350', 4);
      }
    });
    (gameState.zombies || []).forEach(z => {
      if (z.alive && z.isHypnotized && z.row === this.row && z.x >= minX && z.x <= maxX) {
        z.takeDamage(tornadoDmg);
      }
    });
    (gameState.barriers || []).forEach(b => {
      if (b.alive && b.x >= minX && b.x <= maxX) {
        b.takeDamage(tornadoDmg);
      }
    });

    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'lang_khach_tornado',
        x: this.x,
        y: this.y,
        row: this.row,
        minRow: this.row,
        maxRow: this.row,
        startX: minX,
        endX: this.x,
        duration: 0.65
      });
    }
    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(this.x - 30, this.y - 36, `LỐC XOÁY! 🌪️ (-${tornadoDmg})`, '#80deea', 18);
    }
    if (gameState.audio && gameState.audio.playExplosion) {
      gameState.audio.playExplosion('normal');
    }
  }

  // Huyết Pháp Sư Nosus: Huyết Tế hồi +120 HP bản thân & đồng minh trong phạm vi 3x2 + buff 25% tốc chạy 2.5s
  castNosusBloodPact(gameState) {
    if (!gameState || !Array.isArray(gameState.zombies)) return;
    const healAmt = this.bloodPactHeal || 120;
    const rangeX = CONFIG.CELL_WIDTH * 1.65;
    let affected = 0;

    for (const ally of gameState.zombies) {
      if (!ally || !ally.alive || ally.isObstacle || ally.isHypnotized) continue;
      if (Math.abs(ally.row - this.row) <= 1 && Math.abs(ally.x - this.x) <= rangeX) {
        ally.hp = Math.min(ally.maxHp, ally.hp + healAmt);
        ally.nosusSpeedBuffTimer = Math.max(ally.nosusSpeedBuffTimer || 0, 2.5);
        ally.nosusSpeedBuffMult = Math.max(ally.nosusSpeedBuffMult || 1.0, 1.25);
        affected++;
        gameState.spawnParticles(ally.x, ally.y - 10, '#ff1744', 6);
      }
    }

    this.hemoCastAnimTimer = 0.45;
    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'nosus_blood_pact',
        x: this.x,
        y: this.y,
        row: this.row,
        duration: 0.55
      });
    }
    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(this.x, this.y - 38, `HUYẾT TẾ +${healAmt} HP (${affected}) 🩸`, '#ff5252', 15);
    }
  }

  // Darius - Skill 1: Máy Chém Xoay 3x3 kích hoạt mỗi 5s khi còn <= 50% HP, hồi 150-200-300 HP (máu càng ít hồi càng nhiều)
  performDariusSpin(gameState) {
    if (!this.alive || this.isHypnotized || this.hp <= 0) return;
    this.spinAnimTimer = 0.65;

    const hpRatio = this.hp / Math.max(1, this.maxHp);
    const healAmt = hpRatio <= 0.20 ? 300 : (hpRatio <= 0.35 ? 200 : 150);
    this.hp = Math.min(this.maxHp, this.hp + healAmt);

    if (!gameState) return;
    const spinDmg = this.spinDamage || 180;
    const rangeX = CONFIG.CELL_WIDTH * 1.65;
    const minX = Math.max(CONFIG.GRID_OFFSET_X, this.x - rangeX);
    const maxX = Math.min(CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH, this.x + rangeX);
    const minRow = Math.max(0, this.row - 1);
    const maxRow = Math.min(CONFIG.ROWS - 1, this.row + 1);

    (gameState.plants || []).forEach(p => {
      if (!p.alive || p.isRecharging || p.isGroundPlant) return;
      if (Math.abs(p.row - this.row) <= 1 && Math.abs(p.x - this.x) <= rangeX) {
        p.takeDamage(spinDmg, false);
        gameState.spawnParticles(p.x, p.y - 8, '#ff1744', 10);
      }
    });
    (gameState.barriers || []).forEach(b => {
      if (b.alive && Math.abs(b.x - this.x) <= rangeX) {
        b.takeDamage(spinDmg);
      }
    });
    (gameState.zombies || []).forEach(z => {
      if (z.alive && z.isHypnotized && Math.abs(z.row - this.row) <= 1 && Math.abs(z.x - this.x) <= rangeX) {
        z.takeDamage(spinDmg, false);
      }
    });

    gameState.spawnParticles(this.x, this.y - 10, '#ff1744', 18);
    gameState.spawnParticles(this.x, this.y - 14, '#69f0ae', 12);
    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'nosus_darius_spin',
        x: this.x,
        y: this.y,
        row: this.row,
        minRow,
        maxRow,
        startX: minX,
        endX: maxX,
        radius: rangeX,
        duration: 0.65
      });
    }
    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(this.x, this.y - 46, `MÁY CHÉM XOAY 3×3! +${healAmt} HP 🪓🩸`, '#69f0ae', 16);
    }
    if (gameState.audio && gameState.audio.playMelee) {
      gameState.audio.playMelee();
    }
  }

  // Darius - Skill 2: Xuống dưới 100 HP -> Bất tử 4s (tốc đánh 1s/đòn), đòn thường one-hit plant, tăng ×2 tốc độ chạy tới khi chết
  triggerDariusLastStand(prevHp, gameState) {
    if (this.hasDariusLastStand) return;
    this.hasDariusLastStand = true;
    this.isDariusFrenzied = true;
    this.invulnerableTimer = this.dariusInvulnDuration || 4.0;
    this.attackInterval = this.dariusInvulnAttackInterval || 1.0;

    // Đảm bảo không bị chết xuyên ngưỡng bất tử (< 100 máu) trừ đòn kết liễu >= 99999
    if (this.hp <= 0 && prevHp > 0) {
      this.hp = Math.max(1, Math.min(99, prevHp));
    }

    if (!gameState) return;
    gameState.spawnParticles(this.x, this.y - 10, '#ffd54f', 18);
    gameState.spawnParticles(this.x, this.y - 10, '#ff1744', 22);
    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'nosus_darius_last_stand',
        x: this.x,
        y: this.y - 6,
        duration: 0.55
      });
    }
    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(this.x, this.y - 52, 'BẤT TỬ 4s · 1s/ĐÒN · ×2 TỐC · ONE-HIT! 🪓🔥', '#ffd54f', 17);
    }
    if (gameState.audio && gameState.audio.playRoar) {
      gameState.audio.playRoar();
    }
  }

  // Khạc lửa càn quét qua 2 hàng ngang
  executeFireBreath(gameState) {
    if (!gameState) return;
    const rows = this.breathRows || [this.bossRow, this.bossRow + 1];

    if (gameState.audio) {
      gameState.audio.playExplosion && gameState.audio.playExplosion('fire');
    }

    // Tiêu diệt toàn bộ cây trên 2 hàng và thiêu rụi các ô thành đất cháy 10s
    for (let r of rows) {
      if (r < 0 || r >= CONFIG.ROWS) continue;

      // Thiêu rụi cây
      gameState.plants.forEach(p => {
        if (p.alive && p.row === r) {
          p.takeDamage(99999, true); // Thiêu rụi ngay lập tức
          gameState.spawnParticles(p.x, p.y, '#ff3d00', 12);
        }
      });

      // Tiêu diệt cả zombie phe nó trên đường đi (trừ bản thân rồng)
      gameState.zombies.forEach(z => {
        if (z.alive && z.id !== this.id && z.row === r) {
          if (!z.isFireImmune) {
            z.takeDamage(99999);
            gameState.spawnParticles(z.x, z.y, '#ff5722', 10);
          }
        }
      });

      // Thiêu rụi tất cả các ô trên 2 hàng này trong 10 giây
      for (let c = 0; c < CONFIG.COLS - 2; c++) {
        if (gameState.scorchTile) {
          gameState.scorchTile(r, c, 10.0);
        }
      }
    }
  }

  // Ngắt đòn khạc lửa khi người chơi dùng Plant Food
  cancelFireBreath(gameState) {
    if (this.isWindupBreath || this.isBreathingFire) {
      this.isWindupBreath = false;
      this.isBreathingFire = false;
      this.breathWindupTimer = 0;
      this.breathDuration = 0;
      this.breathTimer = 18.0; // Hồi chiêu lại
      this.applyStun(3.0); // Choáng rồng 3 giây!

      if (gameState) {
        gameState.spawnParticles(this.x, this.y, '#76ff03', 30);
        gameState.spawnParticles(this.x, this.y, '#00e5ff', 25);
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(this.x - 30, this.y - 50, 'NGẮT CHIÊU THÀNH CÔNG! ⚡', '#76ff03', 20);
        }
      }
    }
  }

  // =========================================================================
  // 7 TUYỆT KỸ CỦA BOSS RỒNG NGÀN TUỔI (Map 12 - 10.000 HP)
  // =========================================================================
  getPlantEffectiveAtk(plant) {
    if (!plant || !plant.type) return 0;
    const proto = (typeof PLANT_CONFIG !== 'undefined' && PLANT_CONFIG[plant.type]) ? PLANT_CONFIG[plant.type] : {};
    if (!proto.canAttack || proto.produceSun || proto.isDefensive || proto.isInstant) return 0;
    const burst = proto.burstCount || 1;
    const base = plant.damage || proto.damage || proto.bossDamage || proto.swallowDamage || 0;
    return base * burst;
  }

  // Skill 1: Mỗi 20s bắn sét hủy diệt random 3 cây ATK cao nhất có trên sân
  executeAncientLightningStrike(gameState) {
    if (!gameState || !Array.isArray(gameState.plants)) return [];
    const candidates = gameState.plants
      .filter(p => p.alive && !p.isRecharging && this.isAttackingPlant(p))
      .map(p => ({ plant: p, atk: this.getPlantEffectiveAtk(p) }))
      .filter(item => item.atk > 0);

    if (candidates.length === 0) return [];

    candidates.sort((a, b) => b.atk - a.atk);
    const maxTargets = 3;
    let chosen = [];

    if (candidates.length <= maxTargets) {
      chosen = candidates.map(c => c.plant);
    } else {
      const cutoffAtk = candidates[maxTargets - 1].atk;
      const strictlyHigher = candidates.filter(c => c.atk > cutoffAtk).map(c => c.plant);
      const tiedAtCutoff = candidates.filter(c => c.atk === cutoffAtk).map(c => c.plant);

      // Xáo trộn ngẫu nhiên các cây đồng hạng ATK cao nhất để chọn random
      for (let i = tiedAtCutoff.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [tiedAtCutoff[i], tiedAtCutoff[j]] = [tiedAtCutoff[j], tiedAtCutoff[i]];
      }
      chosen = strictlyHigher.concat(tiedAtCutoff.slice(0, maxTargets - strictlyHigher.length));
    }

    this.lightningAnimTimer = 0.7;
    chosen.forEach(p => {
      p.armorHp = 0;
      p.hasArmor = false;
      p.takeDamage(99999, true);
      gameState.spawnParticles(p.x, p.y - 10, '#ffd54f', 16);
      gameState.spawnParticles(p.x, p.y - 10, '#e040fb', 12);
      if (gameState.spawnAttackEffect) {
        gameState.spawnAttackEffect({
          kind: 'ancient_lightning',
          x: p.x,
          y: p.y,
          startX: this.x - 24,
          startY: this.y - 28,
          endX: p.x,
          endY: p.y,
          duration: 0.6
        });
      }
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(p.x, p.y - 30, 'SÉT HỦY DIỆT! ⚡💀', '#ffd54f', 16);
      }
    });

    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(this.x - 30, this.y - 68, `THIÊN LÔI HỦY DIỆT (${chosen.length} CÂY)! ⚡`, '#ffeb3b', 19);
    }
    if (gameState.audio && gameState.audio.playZap) {
      gameState.audio.playZap();
    }
    return chosen;
  }

  // Skill 2: Khi mất 1000 máu đầu tiên -> triệu hồi 5 Gargantuar trên 5 hàng
  summonFiveGargantuars(gameState) {
    if (!gameState || !Array.isArray(gameState.zombies)) return;
    const spawnX = CONFIG.GRID_OFFSET_X + 6.2 * CONFIG.CELL_WIDTH;
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const garg = new Zombie('gargantuar', r, gameState);
      garg.x = spawnX + (r % 2) * 16;
      gameState.zombies.push(garg);
      gameState.spawnParticles(garg.x, garg.y, '#ff5252', 18);
      gameState.spawnParticles(garg.x, garg.y, '#ffd54f', 10);
    }
    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(this.x - 40, this.y - 70, 'TRIỆU HỒI 5 GARGANTUAR (5 HÀNG)! 👹🔥', '#ff1744', 20);
    }
    if (gameState.audio && gameState.audio.playRoar) {
      gameState.audio.playRoar();
    }
  }

  // Skill 3: Khi 1 Gargantuar hi sinh -> cộng dồn +500 Khiên hấp thụ mọi loại sát thương
  grantAncientShield(amount, gameState, deadGarg) {
    if (!this.alive) return;
    const shieldAmt = amount || 500;
    this.bossAllShieldHp = (this.bossAllShieldHp || 0) + shieldAmt;
    this.bossAllShieldMaxHp = Math.max(this.bossAllShieldMaxHp || 0, this.bossAllShieldHp);
    if (gameState) {
      if (deadGarg) {
        gameState.spawnParticles(deadGarg.x, deadGarg.y - 16, '#ffd54f', 16);
      }
      gameState.spawnParticles(this.x - 20, this.y - 12, '#ffd54f', 22);
      gameState.spawnParticles(this.x - 20, this.y - 12, '#ff6d00', 12);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x - 30, this.y - 54, `+${shieldAmt} KHIÊN BẤT HOẠI! 🛡️🔥`, '#ffd54f', 18);
      }
    }
  }

  // Skill 4: Gầm lên gây hoảng sợ -> choáng 2s tất cả plant tấn công mỗi khi mất 1500 máu (không tính khiên)
  triggerAncientFearRoar(gameState) {
    this.isRoaring = true;
    this.roarDuration = 1.6;
    if (!gameState) return;
    const stunDur = 2.0;
    let affected = 0;

    if (Array.isArray(gameState.plants)) {
      for (const p of gameState.plants) {
        if (p.alive && !p.isRecharging && this.isAttackingPlant(p)) {
          p.stunTimer = Math.max(p.stunTimer || 0, stunDur);
          p.state = 'stunned';
          affected++;
          gameState.spawnParticles(p.x, p.y - 12, '#ff1744', 6);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(p.x, p.y - 26, 'HOẢNG SỢ 2s! 😱', '#ff5252', 14);
          }
        }
      }
    }

    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'ancient_fear_roar',
        x: this.x - 28,
        y: this.y,
        duration: 0.75
      });
    }
    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(this.x - 30, this.y - 74, `GẦM HOẢNG SỢ · CHOÁNG ${affected} CÂY 2s! 🐉😱`, '#ff5252', 20);
    }
    if (gameState.audio && gameState.audio.playRoar) {
      gameState.audio.playRoar();
    }
  }

  // Skill 5: Khi 1 plant có dưới 15% HP -> hủy diệt plant đó
  executeLowHpPlants(gameState) {
    if (!gameState || !Array.isArray(gameState.plants)) return;
    for (const p of gameState.plants) {
      if (p.alive && !p.isRecharging && p.maxHp > 0 && p.hp > 0 && (p.hp / p.maxHp) < 0.15) {
        p.armorHp = 0;
        p.hasArmor = false;
        p.takeDamage(99999, true);
        gameState.spawnParticles(p.x, p.y - 8, '#d50000', 14);
        gameState.spawnParticles(p.x, p.y - 8, '#ffab00', 8);
        if (gameState.spawnAttackEffect) {
          gameState.spawnAttackEffect({
            kind: 'ancient_execute',
            x: p.x,
            y: p.y,
            duration: 0.48
          });
        }
        if (gameState.spawnFloatingText) {
          gameState.spawnFloatingText(p.x, p.y - 26, 'HỦY DIỆT <15% HP! 💀', '#ff1744', 15);
        }
      }
    }
  }

  // Skill 6: Gọi mưa hồi 20% máu cho Rồng (không tính bản thân) mỗi 16s
  executeDragonRainHeal(gameState) {
    if (!gameState || !Array.isArray(gameState.zombies)) return 0;
    const dragonTypes = new Set([
      'imp_dragon',
      'dragon_hatchling',
      'dragon_adult',
      'dragon_dark',
      'dragon_chemtech',
      'dragon_wind',
      'dragon_water',
      'zombot_dark_dragon'
    ]);
    this.rainAnimTimer = 1.6;
    let healedCount = 0;

    for (const z of gameState.zombies) {
      if (!z.alive || z.id === this.id || z.isHypnotized || z.isObstacle) continue;
      if (!dragonTypes.has(z.type)) continue;
      const healAmt = Math.round((z.maxHp || 100) * 0.20);
      z.hp = Math.min(z.maxHp, z.hp + healAmt);
      healedCount++;
      gameState.spawnParticles(z.x, z.y - 12, '#00e676', 10);
      gameState.spawnParticles(z.x, z.y - 12, '#4fc3f7', 6);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(z.x, z.y - 30, `+${healAmt} HP 🌧️💚`, '#69f0ae', 15);
      }
    }

    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'ancient_dragon_rain',
        x: CONFIG.CANVAS_WIDTH / 2,
        y: CONFIG.CANVAS_HEIGHT / 2,
        duration: 1.5
      });
    }
    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(this.x - 30, this.y - 68, `MƯA LONG TỘC +20% HP (${healedCount} RỒNG)! 🌧️🐉`, '#4fc3f7', 18);
    }
    return healedCount;
  }

  // Skill 7: Khi còn <= 100 HP -> thả tất cả Zombie & Rồng (số lượng x2 mỗi hàng), Rồng Nước ở dạng mạng thứ 10
  triggerAncientFinalSwarm(gameState) {
    if (!gameState || !Array.isArray(gameState.zombies)) return 0;
    const allZombieAndDragonTypes = [
      'basic', 'imp', 'conehead', 'buckethead', 'pole_vaulting',
      'turquoise_skull', 'jurassic_bully', 'troglobite', 'yeti_imp',
      'lang_khach', 'shen', 'anivia', 'balloon', 'jetpack',
      'thresh', 'quan_chua', 'gargantuar', 'imp_dragon',
      'dragon_hatchling', 'dragon_adult', 'dragon_dark',
      'dragon_chemtech', 'dragon_wind', 'dragon_water'
    ];

    let spawnedCount = 0;
    const baseSpawnX = CONFIG.CANVAS_WIDTH + 18;

    allZombieAndDragonTypes.forEach((zType, typeIdx) => {
      for (let copy = 0; copy < 2; copy++) {
        const row = (typeIdx * 2 + copy) % CONFIG.ROWS;
        const z = new Zombie(zType, row, gameState);
        if (zType === 'dragon_water') {
          configureWaterDragonLife(z, 10);
        }
        const waveStagger = (Math.floor(typeIdx / CONFIG.ROWS) * 2 + copy) * 28;
        z.x = baseSpawnX + waveStagger;
        gameState.zombies.push(z);
        spawnedCount++;
      }
    });

    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'ancient_fear_roar',
        x: this.x - 28,
        y: this.y,
        duration: 0.9
      });
    }
    gameState.spawnParticles(this.x - 20, this.y, '#ff1744', 28);
    gameState.spawnParticles(this.x - 20, this.y, '#ffd54f', 24);
    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(this.x - 50, this.y - 76, `HUYẾT CHIẾN CUỐI · THẢ ${spawnedCount} ZOMBIE & RỒNG! 🔥🐉`, '#ffab00', 20);
    }
    if (gameState.audio && gameState.audio.playWaveHorn) {
      gameState.audio.playWaveHorn();
    }
    return spawnedCount;
  }

  checkAncientBossHpTriggers(gameState) {
    if (this.type !== 'ancient_dragon_boss') return;
    const maxHp = this.maxHp || 10000;
    const clampedHp = Math.max(0, this.hp);
    const hpLost = Math.max(0, maxHp - clampedHp);

    // Skill 2: Mất 1000 máu đầu tiên -> triệu hồi 5 Gargantuar 5 hàng
    if (!this.hasSummoned5Gargs && hpLost >= 1000) {
      this.hasSummoned5Gargs = true;
      this.summonFiveGargantuars(gameState);
    }

    // Skill 4: Mỗi 1500 máu thực mất (không tính khiên) -> gầm choáng 2s tất cả plant tấn công
    const expectedFears = Math.floor(hpLost / 1500);
    if (expectedFears > (this.fearMilestonesTriggered || 0)) {
      this.fearMilestonesTriggered = expectedFears;
      this.triggerAncientFearRoar(gameState);
    }

    // Skill 7: Khi còn <= 100 HP -> thả tất cả zombie & rồng x2, rồng nước dạng mạng 10
    if (!this.hasTriggeredFinalSwarm && this.hp <= 100) {
      this.hasTriggeredFinalSwarm = true;
      this.triggerAncientFinalSwarm(gameState);
    }
  }

  // =========================================================================
  // BỘ KỸ NĂNG BOSS AZIR HOÀNG ĐẾ SA MẠC & SONG THẦN (Map 13 - 20.000 HP)
  // =========================================================================
  summonAzirSkill1SoldierOrCoffin(gameState) {
    if (!gameState || !Array.isArray(gameState.plants) || !Array.isArray(gameState.zombies)) return null;
    // Không được spawn tới 2 ô cuối (cột 0-1 gần nhà) và tránh 2 cột của Boss (7-8) -> chỉ chọn cây tại cột 2..6
    const eligiblePlants = gameState.plants.filter(p => {
      if (!p.alive || p.isRecharging || p.isGroundPlant) return false;
      const col = Number.isFinite(p.col) ? p.col : Math.floor((p.x - CONFIG.GRID_OFFSET_X) / CONFIG.CELL_WIDTH);
      return col >= 2 && col <= 6;
    });
    const fallbackPlants = eligiblePlants.length > 0
      ? eligiblePlants
      : gameState.plants.filter(p => {
          if (!p.alive || p.isRecharging) return false;
          const col = Number.isFinite(p.col) ? p.col : Math.floor((p.x - CONFIG.GRID_OFFSET_X) / CONFIG.CELL_WIDTH);
          return col >= 2 && col <= 6;
        });

    if (fallbackPlants.length === 0) return null;

    // Ưu tiên hàng có nhiều cây nhất (trong số các hàng có mục tiêu hợp lệ tại cột 2..6)
    const rowPlantCounts = new Map();
    for (const p of gameState.plants) {
      if (!p.alive || p.isRecharging) continue;
      rowPlantCounts.set(p.row, (rowPlantCounts.get(p.row) || 0) + 1);
    }
    let maxRowPlantCount = -1;
    for (const p of fallbackPlants) {
      const count = rowPlantCounts.get(p.row) || 0;
      if (count > maxRowPlantCount) {
        maxRowPlantCount = count;
      }
    }
    const candidateRows = [];
    for (const p of fallbackPlants) {
      if ((rowPlantCounts.get(p.row) || 0) === maxRowPlantCount && !candidateRows.includes(p.row)) {
        candidateRows.push(p.row);
      }
    }
    const chosenRow = candidateRows[Math.floor(Math.random() * candidateRows.length)];
    const rowTargets = fallbackPlants.filter(p => p.row === chosenRow);
    const targetPlant = rowTargets[Math.floor(Math.random() * rowTargets.length)];
    const spawnType = this.sandCoffinEmpowered ? 'sand_coffin' : 'sand_soldier';
    const unit = new Zombie(spawnType, targetPlant.row, gameState);
    unit.x = this.sandCoffinEmpowered ? targetPlant.x : (targetPlant.x + 12);
    gameState.zombies.push(unit);

    this.castAnimTimer = 0.6;
    gameState.spawnParticles(unit.x, unit.y - 6, '#ffd54f', 16);
    gameState.spawnParticles(unit.x, unit.y - 6, '#d4a373', 10);
    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'sand_soldier_emerge',
        x: unit.x,
        y: unit.y,
        row: unit.row,
        isCoffin: spawnType === 'sand_coffin',
        duration: 0.55
      });
    }
    if (gameState.spawnFloatingText) {
      const label = this.sandCoffinEmpowered ? 'QUAN TÀI SA MẠC (800 HP)! ⚰️' : 'LÍNH CÁT TRỖI DẬY! ⏳⚔️';
      gameState.spawnFloatingText(unit.x, unit.y - 34, label, '#ffd54f', 16);
    }
    return unit;
  }

  triggerAzirPhase2Sandstorm(gameState) {
    if (!gameState) return [];
    const allRows = [0, 1, 2, 3, 4];
    for (let i = allRows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [allRows[i], allRows[j]] = [allRows[j], allRows[i]];
    }
    const stormRows = allRows.slice(0, 3).sort((a, b) => a - b);
    const stormRowSet = new Set(stormRows);

    // 1. Bão cát hủy diệt tất cả cây & zombie trên 3 hàng đã chọn (trừ Boss Azir)
    if (Array.isArray(gameState.plants)) {
      for (const p of gameState.plants) {
        if (p.alive && stormRowSet.has(p.row)) {
          p.armorHp = 0;
          p.hasArmor = false;
          p.takeDamage(99999, true);
          gameState.spawnParticles(p.x, p.y - 8, '#ffb300', 10);
        }
      }
    }

    if (Array.isArray(gameState.zombies)) {
      for (const z of gameState.zombies) {
        if (!z.alive || z.id === this.id || z.type === 'azir_desert_emperor' || isTwoRowBoss(z)) continue;
        if (stormRowSet.has(z.row)) {
          z.skipWaterRevive = true;
          z.hasReleasedCoffinZombie = true;
          z.hasReleasedImp = true;
          z.alive = false;
          z.hp = 0;
          z.deathTimer = 0.6;
          gameState.spawnParticles(z.x, z.y - 8, '#d4a373', 10);
        }
      }
    }

    // 2. Skill 2: Cường hóa Lính Cát -> Quan Tài 800 HP (chuyển đổi cả lính cát đang sống trên sân)
    this.sandCoffinEmpowered = true;
    if (Array.isArray(gameState.zombies)) {
      for (let i = 0; i < gameState.zombies.length; i++) {
        const z = gameState.zombies[i];
        if (z.alive && z.type === 'sand_soldier') {
          const coffin = new Zombie('sand_coffin', z.row, gameState);
          coffin.x = z.x;
          z.alive = false;
          z.deathTimer = 99;
          gameState.zombies.push(coffin);
          gameState.spawnParticles(coffin.x, coffin.y - 8, '#ffd54f', 12);
        }
      }
    }

    // 3. Sau 20s kể từ khi dùng Bão Cát -> triệu hồi 1 wave zombie từ ngoài sân có bão cát bé dưới chân (×2 tốc chạy)
    const cfg = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG.azir_desert_emperor) ? ZOMBIE_CONFIG.azir_desert_emperor : {};
    const waveDelay = cfg.sandstormWaveDelay || 20.0;
    if (typeof gameState.scheduleSandstormWave === 'function') {
      gameState.scheduleSandstormWave(waveDelay);
    } else {
      this.localSandstormTimers = this.localSandstormTimers || [];
      this.localSandstormTimers.push(waveDelay);
    }

    const lawnLeft = CONFIG.GRID_OFFSET_X;
    const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
    if (gameState.spawnAttackEffect) {
      gameState.spawnAttackEffect({
        kind: 'azir_sandstorm_3rows',
        rows: stormRows,
        startX: lawnLeft,
        endX: lawnRight,
        duration: 1.4
      });
    }
    if (gameState.spawnFloatingText) {
      const rowLabels = stormRows.map(r => `H${r + 1}`).join(', ');
      gameState.spawnFloatingText(this.x - 60, this.y - 72, `BÃO CÁT SA MẠC HỦY ${rowLabels}! QUAN TÀI CƯỜNG HÓA! 🌪️☀️`, '#ffab00', 19);
    }
    if (gameState.audio && gameState.audio.playWaveHorn) {
      gameState.audio.playWaveHorn();
    }
    return stormRows;
  }

  spawnAzirSandstormWave(gameState) {
    if (!gameState || !Array.isArray(gameState.zombies)) return [];
    const waveTypes = ['basic', 'conehead', 'buckethead', 'pole_vaulting', 'turquoise_skull', 'lang_khach', 'shen', 'basic'];
    const spawned = [];
    const baseSpawnX = CONFIG.CANVAS_WIDTH + 22;

    waveTypes.forEach((zType, idx) => {
      const row = idx % CONFIG.ROWS;
      const z = new Zombie(zType, row, gameState);
      z.x = baseSpawnX + Math.floor(idx / CONFIG.ROWS) * 36;
      z.hasMiniSandstorm = true;
      z.sandstormSpeedMultiplier = 2.0;
      gameState.zombies.push(z);
      spawned.push(z);
      gameState.spawnParticles(z.x - 16, z.y + 16, '#ffd54f', 10);
    });

    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(CONFIG.CANVAS_WIDTH / 2, CONFIG.GRID_OFFSET_Y + 30, 'WAVE BÃO CÁT ×2 TỐC ĐỘ TRÀN VÀO! 🌪️💨', '#ffd54f', 20);
    }
    if (gameState.audio && gameState.audio.playWaveHorn) {
      gameState.audio.playWaveHorn();
    }
    return spawned;
  }

  triggerAzirPhase3MiniBosses(gameState) {
    if (!gameState || !Array.isArray(gameState.zombies)) return [];
    const rows = [0, 1, 2, 3, 4];
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
    const crocRow = rows[0];
    const houndRow = rows[1];
    const spawnX = CONFIG.GRID_OFFSET_X + 6.8 * CONFIG.CELL_WIDTH;

    const croc = new Zombie('renekton_croc', crocRow, gameState);
    croc.x = spawnX;
    const hound = new Zombie('nasus_hound', houndRow, gameState);
    hound.x = spawnX + 20;

    gameState.zombies.push(croc, hound);
    gameState.spawnParticles(croc.x, croc.y - 10, '#69f0ae', 20);
    gameState.spawnParticles(croc.x, croc.y - 10, '#ffd54f', 14);
    gameState.spawnParticles(hound.x, hound.y - 10, '#ce93d8', 20);
    gameState.spawnParticles(hound.x, hound.y - 10, '#ffd54f', 14);

    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(this.x - 60, this.y - 74, 'PHASE 3: TRIỆU HỒI THẦN CÁ SẤU & THẦN KHUYỂN! 🐊🐺☀️', '#ff5252', 20);
    }
    if (gameState.audio && gameState.audio.playRoar) {
      gameState.audio.playRoar();
    }
    return [croc, hound];
  }

  checkAzirHpTriggers(gameState) {
    if (this.type !== 'azir_desert_emperor') return;
    const cfg = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG.azir_desert_emperor) ? ZOMBIE_CONFIG.azir_desert_emperor : {};
    const phase2Hp = cfg.phase2HpThreshold || 15000;
    const phase3Hp = cfg.phase3HpThreshold || 7000;

    if (!this.hasTriggeredPhase2 && this.hp <= phase2Hp) {
      this.hasTriggeredPhase2 = true;
      this.triggerAzirPhase2Sandstorm(gameState);
    }
    if (!this.hasTriggeredPhase3 && this.hp <= phase3Hp) {
      this.hasTriggeredPhase3 = true;
      this.triggerAzirPhase3MiniBosses(gameState);
    }
  }

  triggerRenektonGiantTransform(gameState) {
    if (this.isGiantForm) return;
    this.isGiantForm = true;
    this.visualScale = 1.45;
    const cfg = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG.renekton_croc) ? ZOMBIE_CONFIG.renekton_croc : {};
    this.damage = cfg.giantDamage || 250;
    this.attackInterval = 1.0;
    if (gameState) {
      gameState.spawnParticles(this.x, this.y - 12, '#ff3d00', 22);
      gameState.spawnParticles(this.x, this.y - 12, '#ffd54f', 16);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 46, 'THẦN CÁ SẤU HÓA KHỔNG LỒ (250 ATK)! 🐊🔥', '#ff5252', 18);
      }
    }
  }

  executeRenektonSweep(gameState) {
    const cfg = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG.renekton_croc) ? ZOMBIE_CONFIG.renekton_croc : {};
    const sweepDmg = cfg.sweepDamage || 400;
    const healPerPlant = cfg.sweepHealPerPlant || 100;
    const radiusX = CONFIG.CELL_WIDTH * 1.55;
    let hitCount = 0;

    if (gameState && Array.isArray(gameState.plants)) {
      for (const p of gameState.plants) {
        if (p.alive && !p.isRecharging && Math.abs(p.row - this.row) <= 1 && Math.abs(p.x - this.x) <= radiusX) {
          p.takeDamage(sweepDmg, false);
          hitCount++;
          gameState.spawnParticles(p.x, p.y - 8, '#ff5252', 10);
        }
      }
    }

    const totalHeal = hitCount * healPerPlant;
    if (totalHeal > 0) {
      this.hp = Math.min(this.maxHp, this.hp + totalHeal);
    }
    this.sweepAnimTimer = 0.55;

    // Sau khi quét đao -> lướt tiếp 1 ô
    const prevX = this.x;
    this.x = Math.max(CONFIG.GRID_OFFSET_X + 12, this.x - CONFIG.CELL_WIDTH);

    if (gameState) {
      if (gameState.spawnAttackEffect) {
        const lawnLeft = CONFIG.GRID_OFFSET_X;
        const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
        gameState.spawnAttackEffect({
          kind: 'renekton_sweep_3x3',
          x: prevX,
          y: this.y,
          row: this.row,
          minRow: Math.max(0, this.row - 1),
          maxRow: Math.min(CONFIG.ROWS - 1, this.row + 1),
          startX: Math.max(lawnLeft, prevX - radiusX),
          endX: Math.min(lawnRight, prevX + radiusX),
          duration: 0.52
        });
      }
      gameState.spawnParticles(this.x, this.y - 10, '#69f0ae', Math.min(18, 6 + hitCount * 3));
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(prevX, this.y - 50, `QUÉT ĐAO 3×3 (-${sweepDmg}) +${totalHeal} HP! 🐊⚔️`, '#ffab00', 17);
      }
    }
    return hitCount;
  }

  triggerNasusGiantTransform(gameState) {
    if (this.isGiantForm) return;
    this.isGiantForm = true;
    this.visualScale = 1.45;
    this.attackInterval = (ZOMBIE_CONFIG.nasus_hound && ZOMBIE_CONFIG.nasus_hound.giantAttackInterval) || 2.0;
    this.attackTimer = 0;
    if (gameState) {
      gameState.spawnParticles(this.x, this.y - 12, '#ab47bc', 24);
      gameState.spawnParticles(this.x, this.y - 12, '#ffd54f', 16);
      if (gameState.spawnFloatingText) {
        gameState.spawnFloatingText(this.x, this.y - 46, 'THẦN KHUYỂN HÓA LỚN · HỦY DIỆT CÂY! 🐺👑', '#e040fb', 18);
      }
    }
  }

  castNasusWitherZone(targetPlant, gameState) {
    if (!targetPlant || !gameState) return null;
    const cfg = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG.nasus_hound) ? ZOMBIE_CONFIG.nasus_hound : {};
    const duration = cfg.witherDuration || 5.0;
    const burnDamage = cfg.witherBurnDamage || 10;
    const burnInterval = cfg.witherBurnInterval || 0.5;

    const tCol = Number.isFinite(targetPlant.col)
      ? targetPlant.col
      : Math.floor((targetPlant.x - CONFIG.GRID_OFFSET_X) / CONFIG.CELL_WIDTH);
    const startCol = Math.max(0, Math.min(CONFIG.COLS - 2, tCol));
    const startX = CONFIG.GRID_OFFSET_X + startCol * CONFIG.CELL_WIDTH;
    const endX = startX + 2 * CONFIG.CELL_WIDTH;

    let minRow = Math.min(this.row, targetPlant.row);
    if (minRow + 1 < targetPlant.row) minRow = targetPlant.row - 1;
    minRow = Math.max(0, Math.min(CONFIG.ROWS - 2, minRow));
    const maxRow = minRow + 1;

    const zone = {
      id: generateId(),
      minRow,
      maxRow,
      startX,
      endX,
      remaining: duration,
      duration,
      burnTimer: 0,
      burnDamage,
      burnInterval
    };

    if (!Array.isArray(gameState.witherZones)) {
      gameState.witherZones = [];
    }
    gameState.witherZones.push(zone);

    if (Array.isArray(gameState.plants)) {
      for (const p of gameState.plants) {
        if (p.alive && !p.isRecharging && p.row >= minRow && p.row <= maxRow && p.x >= startX && p.x <= endX) {
          p.witherTimer = Math.max(p.witherTimer || 0, duration);
          gameState.spawnParticles(p.x, p.y - 10, '#ab47bc', 6);
        }
      }
    }

    this.witherCastAnimTimer = 0.55;
    if (gameState.spawnFloatingText) {
      gameState.spawnFloatingText(targetPlant.x, targetPlant.y - 32, 'LÃO HÓA 2×2 (-50% TỐC ĐÁNH 5s)! ⏳💜', '#ce93d8', 16);
    }
    return zone;
  }
}

/**
 * LỚP ĐẠN BẮN THẲNG & ĐẠN CẦU VỒNG (Projectile)
 */
class Projectile {
  constructor(type, row, x, y, damage, speed = 6.5) {
    this.id = generateId();
    this.type = type; // 'pea', 'ice_pea', 'goo_pea', 'cabbage', 'melon'
    this.row = row;
    this.x = x;
    this.y = y;
    this.damage = damage;
    this.speed = speed;
    this.alive = true;

    // Cấu hình đạn cầu vồng (Lobbed)
    this.isLobbed = (type === 'cabbage' || type === 'melon');
    this.targetX = x;
    this.targetY = y;
    this.startX = x;
    this.startY = y;
    this.arcHeight = 90;
    this.lobProgress = 0;
    this.lobDuration = 0.75;
    this.splashDamage = 0;
    this.splashRadiusCells = 1.2;
  }

  update(dt, gameState) {
    if (!this.alive) return;

    if (this.isLobbed) {
      // Đạn cầu vồng bay parabol theo thời gian, bỏ qua vật cản
      this.lobProgress += dt / this.lobDuration;
      const t = Math.min(1.0, this.lobProgress);

      this.x = this.startX + (this.targetX - this.startX) * t;
      const linearY = this.startY + (this.targetY - this.startY) * t;
      const arc = 4 * this.arcHeight * t * (1 - t);
      this.y = linearY - arc;

      // Đạn tiếp đất -> Gây sát thương trực tiếp và sát thương lan AoE 3x3
      if (t >= 1.0) {
        this.alive = false;
        const splashRadiusPx = this.splashRadiusCells * CONFIG.CELL_WIDTH;

        gameState.zombies.forEach(z => {
          if (isZombieOnLawn(z) && !z.isHypnotized && Math.abs(z.row - this.row) <= 1) {
            const dist = Math.hypot(z.x - this.targetX, z.y - this.targetY);
            if (dist <= 35) {
              z.takeDamage(this.damage); // Sát thương trực tiếp
              gameState.spawnParticles(z.x, z.y - 10, this.type === 'melon' ? '#4caf50' : '#8bc34a', 6);
            } else if (dist <= splashRadiusPx && this.splashDamage > 0) {
              z.takeDamage(this.splashDamage); // Sát thương lan AoE 3x3
              gameState.spawnParticles(z.x, z.y - 10, '#81c784', 3);
            }
          }
        });
      }
      return;
    }

    // Đạn bắn thẳng di chuyển ngang
    const moveStep = this.speed * (60 * dt);
    this.x += moveStep;

    if (this.isRollingPoisonBoulder) {
      // Đạn độc khổng lồ lăn dọc hàng (Goo Peashooter Plant Food): Xô ngã, 1000 DMG xuyên giáp, để lại độc 8s
      this.hitZombies = this.hitZombies || new Set();
      gameState.zombies.forEach(z => {
        if (!isZombieOnLawn(z) || z.isHypnotized) return;
        const isRowMatch = isBossRowMatch(z, this.row);
        if (isRowMatch && Math.abs(z.x - this.x) <= 35 && !this.hitZombies.has(z.id)) {
          this.hitZombies.add(z.id);
          z.takeDamage(this.damage || 1000, true);
          z.applyKnockback(120);
          z.applyPoison(3, 8.0, 30.0, 3);
          gameState.spawnParticles(z.x, z.y - 10, '#d500f9', 12);
          gameState.spawnParticles(z.x, z.y - 10, '#00e676', 8);
        }
      });
      if (this.x > CONFIG.CANVAS_WIDTH + 80) {
        this.alive = false;
      }
      return;
    }

    if (this.isEnergyWave) {
      // Sóng năng lượng của Galio:
      // - Skill 1 (isSingleTarget / !isGiant): chỉ gây sát thương lên zombie đầu tiên dính chiêu rồi tan biến
      // - Plant Food (isGiant): xuyên qua toàn bộ hàng
      this.hitZombies = this.hitZombies || new Set();
      if (this.isSingleTarget || !this.isGiant) {
        let firstZombie = null;
        let minX = Infinity;
        for (const z of gameState.zombies) {
          if (!isZombieOnLawn(z) || z.isHypnotized) continue;
          const isRowMatch = isBossRowMatch(z, this.row);
          const hitHalfW = isTwoRowBoss(z) ? 60 : 34;
          if (isRowMatch && Math.abs(z.x - this.x) <= hitHalfW && z.x < minX) {
            minX = z.x;
            firstZombie = z;
          }
        }
        if (firstZombie) {
          firstZombie.takeDamage(this.damage || 500);
          gameState.spawnParticles(firstZombie.x, firstZombie.y - 10, '#00e5ff', 10);
          gameState.spawnParticles(firstZombie.x, firstZombie.y - 10, '#ffd54f', 6);
          if (gameState && gameState.audio && gameState.audio.playHit) {
            gameState.audio.playHit();
          }
          this.alive = false;
        }
      } else {
        gameState.zombies.forEach(z => {
          if (!isZombieOnLawn(z) || z.isHypnotized) return;
          const isRowMatch = isBossRowMatch(z, this.row);
          const hitHalfW = isTwoRowBoss(z) ? 60 : 38;
          if (isRowMatch && Math.abs(z.x - this.x) <= hitHalfW && !this.hitZombies.has(z.id)) {
            this.hitZombies.add(z.id);
            z.takeDamage(this.damage || 500);
            gameState.spawnParticles(z.x, z.y - 10, '#00e5ff', 6);
            gameState.spawnParticles(z.x, z.y - 10, '#ffd54f', 4);
          }
        });
      }
      if (this.x > CONFIG.CANVAS_WIDTH + 60) {
        this.alive = false;
      }
      return;
    }

    // Đạn của Jhinplant: tìm mục tiêu gần nhất phía trước, nếu là viên thứ 4 hạ gục zombie sẽ đặt Bẫy Hoa Sen
    if (this.isJhinBullet) {
      let frontZombie = null;
      let minX = Infinity;
      for (const z of gameState.zombies) {
        if (!isZombieOnLawn(z) || z.isHypnotized) continue;
        const isRowMatch = isBossRowMatch(z, this.row);
        const hitHalfW = isTwoRowBoss(z) ? 58 : 28;
        if (isRowMatch && Math.abs(z.x - this.x) < hitHalfW && z.x < minX) {
          minX = z.x;
          frontZombie = z;
        }
      }

      if (frontZombie) {
        this.alive = false;
        const wasAlive = frontZombie.alive;
        frontZombie.takeDamage(this.damage);

        if (gameState && gameState.audio && gameState.audio.playHit) {
          gameState.audio.playHit();
        }

        if (this.isFourthShot) {
          gameState.spawnParticles(frontZombie.x, frontZombie.y - 12, '#ff1744', 14);
          gameState.spawnParticles(frontZombie.x, frontZombie.y - 12, '#e040fb', 10);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(frontZombie.x, frontZombie.y - 28, `IV! -${this.damage}`, '#ff1744', 18);
          }
          // Skill: Khi viên thứ 4 tiêu diệt Zombie (KHÔNG tạo bẫy khi phá Bia Mộ / vật cản) -> đặt 1 Bẫy Hoa Sen tại đó
          if (wasAlive && !frontZombie.alive && !frontZombie.isObstacle && frontZombie.type !== 'tombstone' && typeof gameState.spawnLotusTrap === 'function') {
            gameState.spawnLotusTrap(frontZombie.row, frontZombie.x, frontZombie.y);
          }
        } else {
          gameState.spawnParticles(frontZombie.x, frontZombie.y - 10, '#ce93d8', 6);
        }
      }

      if (this.x > CONFIG.CANVAS_WIDTH + 20) {
        this.alive = false;
      }
      return;
    }

    // Quả cầu cường hóa của Syndra (3 stack -> sốc 600 DMG vào 1 mục tiêu có ATK cao nhất trên hàng)
    if (this.isSyndraEmpoweredOrb || this.type === 'syndra_empowered_orb') {
      let target = this.lockedTarget;
      if (!target || !target.alive || target.isHypnotized) {
        // Nếu mục tiêu đã chết trước khi cầu chạm tới, chuyển hướng sang kẻ địch ATK cao nhất còn sống trên hàng
        const rowCandidates = (gameState.zombies || []).filter(z => {
          return isZombieOnLawn(z) && !z.isHypnotized && !z.isObstacle && isBossRowMatch(z, this.row);
        });
        if (this.ownerPlant && typeof this.ownerPlant.findHighestAtkSyndraTarget === 'function') {
          target = this.ownerPlant.findHighestAtkSyndraTarget(rowCandidates);
        } else {
          target = rowCandidates[0] || null;
        }
        this.lockedTarget = target;
      }

      if (target && target.alive) {
        const dx = target.x - this.x;
        const dy = (target.y - 10) - this.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.abs(moveStep);
        const hitDist = isTwoRowBoss(target) ? 48 : 24;

        if (dist <= Math.max(hitDist, step)) {
          this.alive = false;
          target.takeDamage(this.damage || 600, false);
          gameState.spawnParticles(target.x, target.y - 12, '#e040fb', 18);
          gameState.spawnParticles(target.x, target.y - 12, '#7c4dff', 12);
          gameState.spawnParticles(target.x, target.y - 12, '#ffffff', 6);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(target.x, target.y - 30, `SỐC CẦU -${this.damage || 600}! 🔮`, '#e040fb', 18);
          }
          if (gameState.audio && gameState.audio.playHit) {
            gameState.audio.playHit();
          }
        } else {
          // Bám sát theo mục tiêu có ATK cao nhất (bỏ qua mục tiêu dọc đường)
          this.x += (dx / dist) * step - moveStep; // trừ moveStep đã cộng ở đầu update
          this.y += (dy / dist) * step;
        }
      } else if (this.x > CONFIG.CANVAS_WIDTH + 40 || this.x < CONFIG.GRID_OFFSET_X - 40) {
        this.alive = false;
      }
      return;
    }

    // Quả cầu thường của Syndra (100 DMG; nếu kill zombie sẽ hồi lại 1 cầu cho Syndra)
    if (this.isSyndraOrb || this.type === 'syndra_orb') {
      if (this.lockedTarget && this.lockedTarget.alive && !this.lockedTarget.isHypnotized && this.lockedTarget.x < this.x - 10) {
        // Mục tiêu đang ở sát/sau cây trên hàng -> bay ngược lại đúng mục tiêu
        const dx = this.lockedTarget.x - this.x;
        const dy = (this.lockedTarget.y - 12) - this.y;
        const dist = Math.hypot(dx, dy);
        const step = Math.abs(moveStep);
        if (dist <= Math.max(24, step)) {
          const hitTarget = this.lockedTarget;
          this.alive = false;
          const wasAlive = hitTarget.alive;
          hitTarget.takeDamage(this.damage || 100, false);
          gameState.spawnParticles(hitTarget.x, hitTarget.y - 12, '#e040fb', 12);
          if (gameState.audio && gameState.audio.playHit) {
            gameState.audio.playHit();
          }
          if (wasAlive && !hitTarget.alive && !hitTarget.isObstacle && this.ownerPlant && this.ownerPlant.alive && typeof this.ownerPlant.onSyndraOrbKill === 'function') {
            this.ownerPlant.onSyndraOrbKill(gameState);
          }
        } else {
          this.x += (dx / dist) * step - moveStep;
          this.y += (dy / dist) * step;
        }
        return;
      }

      let hitZombie = null;
      let minX = Infinity;
      for (const z of gameState.zombies) {
        if (!isZombieOnLawn(z) || z.isHypnotized || z.isObstacle) continue;
        if (!isBossRowMatch(z, this.row)) continue;
        const hitHalfW = isTwoRowBoss(z) ? 56 : 28;
        if (Math.abs(z.x - this.x) < hitHalfW && z.x < minX) {
          minX = z.x;
          hitZombie = z;
        }
      }

      if (hitZombie) {
        this.alive = false;
        const wasAlive = hitZombie.alive;
        hitZombie.takeDamage(this.damage || 100, false);
        gameState.spawnParticles(hitZombie.x, hitZombie.y - 12, '#e040fb', 12);
        gameState.spawnParticles(hitZombie.x, hitZombie.y - 12, '#9c27b0', 6);
        if (gameState.audio && gameState.audio.playHit) {
          gameState.audio.playHit();
        }
        if (wasAlive && !hitZombie.alive && !hitZombie.isObstacle && this.ownerPlant && this.ownerPlant.alive && typeof this.ownerPlant.onSyndraOrbKill === 'function') {
          this.ownerPlant.onSyndraOrbKill(gameState);
        }
      }

      if (this.x > CONFIG.CANVAS_WIDTH + 30) {
        this.alive = false;
      }
      return;
    }

    // Dao nảy cầu vồng từ trên xuống của Kata Blade Rose (30 DMG, nảy tối đa 3 mục tiêu khác nhau)
    if (this.isKataDagger || this.type === 'kata_dagger') {
      const target = this.lockedTarget;
      if (!target || !target.alive || target.isHypnotized) {
        this.alive = false;
        return;
      }

      if (this.startX === undefined || this.startY === undefined) {
        this.startX = this.x;
        this.startY = this.y;
        this.lobProgress = 0;
        this.lobDuration = this.lobDuration || 0.30;
        this.arcHeight = this.arcHeight || 76;
      }

      const destX = target.x;
      const destY = target.y - 14;
      this.lobProgress = (this.lobProgress || 0) + dt / (this.lobDuration || 0.32);
      const t = Math.min(1.0, this.lobProgress);

      this.x = this.startX + (destX - this.startX) * t;
      const linearY = this.startY + (destY - this.startY) * t;
      const arc = 4 * (this.arcHeight || 76) * t * (1 - t);
      this.y = linearY - arc;

      if (t >= 1.0) {
        this.hitIds = this.hitIds || new Set();
        if (!this.hitIds.has(target.id)) {
          this.hitIds.add(target.id);
          target.takeDamage(this.damage || 30, false);
          gameState.spawnParticles(destX, target.y - 10, '#ff1744', 6);
          if (gameState.audio && gameState.audio.playHit) {
            gameState.audio.playHit();
          }
        }

        const maxBounces = this.maxBounces || 3;
        if (this.hitIds.size >= maxBounces) {
          this.alive = false;
          return;
        }

        // Tìm mục tiêu tiếp theo trong phạm vi 3x2 (gồm hàng trên, cùng hàng, hàng dưới; rộng 2 ô)
        const originRow = (this.bounceOriginRow !== undefined) ? this.bounceOriginRow : (isTwoRowBoss(target) ? target.bossRow : target.row);
        const originX = (this.bounceOriginX !== undefined) ? this.bounceOriginX : destX;
        const maxBounceHorizontalPx = CONFIG.CELL_WIDTH * 2.05;
        let nextTarget = null;
        let minBounceDist = Infinity;
        for (const z of gameState.zombies) {
          if (!isZombieOnLawn(z) || z.isHypnotized || this.hitIds.has(z.id)) continue;
          const rowMatch = isTwoRowBoss(z)
            ? (Math.abs(z.bossRow - originRow) <= 1 || Math.abs((z.bossRow + 1) - originRow) <= 1)
            : (Math.abs(z.row - originRow) <= 1);
          if (!rowMatch || Math.abs(z.x - originX) > maxBounceHorizontalPx) continue;
          const d = Math.hypot(z.x - destX, z.y - target.y);
          if (d < minBounceDist) {
            minBounceDist = d;
            nextTarget = z;
          }
        }

        if (nextTarget) {
          this.x = destX;
          this.y = destY;
          this.startX = destX;
          this.startY = destY;
          this.row = isTwoRowBoss(nextTarget) ? nextTarget.bossRow : nextTarget.row;
          const bounceDist = Math.hypot(nextTarget.x - destX, (nextTarget.y - 14) - destY);
          this.lobProgress = 0;
          this.lobDuration = Math.max(0.18, Math.min(0.32, bounceDist / 450));
          this.arcHeight = Math.max(44, Math.min(72, 36 + bounceDist * 0.2));
          this.lockedTarget = nextTarget;
        } else {
          this.alive = false;
        }
      }
      return;
    }

    // Linh hồn thỏ kiểu cầu vồng của Aurora (40 DMG, xuyên 4 mục tiêu, đẩy lùi zombie đầu tiên chạm phải 1 ô; không đẩy lùi Mini-Boss/Boss)
    if (this.isAuroraRabbit || this.type === 'aurora_rabbit') {
      this.hitIds = this.hitIds || new Set();
      this.flightTime = (this.flightTime || 0) + dt;
      const baseY = this.baseY || (CONFIG.GRID_OFFSET_Y + this.row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2 - 14);
      // Quỹ đạo cầu vồng nhún nhảy thanh thoát dọc theo hàng
      this.y = baseY - Math.abs(Math.sin(this.flightTime * 5.2)) * 38;

      const maxPierces = this.maxPierces || 4;
      for (const z of gameState.zombies) {
        if (!isZombieOnLawn(z) || z.isHypnotized || z.isObstacle) continue;
        if (this.hitIds.has(z.id)) continue;
        if (!isBossRowMatch(z, this.row)) continue;

        const hitHalfW = isTwoRowBoss(z) ? 55 : 28;
        if (Math.abs(z.x - this.x) < hitHalfW) {
          this.hitIds.add(z.id);
          z.takeDamage(this.damage || 40, false);
          gameState.spawnParticles(z.x, z.y - 10, '#80deea', 6);
          gameState.spawnParticles(z.x, z.y - 10, '#f48fb1', 4);
          if (gameState.audio && gameState.audio.playHit) {
            gameState.audio.playHit();
          }

          if (this.hitIds.size === 1) {
            const isMiniBoss = !!(z.isMiniBoss || z.type === 'renekton_croc' || z.type === 'nasus_hound');
            if (!isMiniBoss && !z.isBoss && !z.knockbackImmune) {
              z.applyKnockback(this.firstKnockbackPx || CONFIG.CELL_WIDTH);
              z.isEating = false;
              z.eatingPlant = null;
              z.dashBlockedPlant = null;
            }
          }

          if (this.hitIds.size >= maxPierces) {
            this.alive = false;
            return;
          }
        }
      }

      if (this.x > CONFIG.CANVAS_WIDTH + 30) {
        this.alive = false;
      }
      return;
    }

    // Va chạm với Tombstone (Vật cản) hoặc Zombie đầu tiên trên hàng (không bắn trúng đồng minh bị thôi miên)
    for (const z of gameState.zombies) {
      if (!isZombieOnLawn(z) || z.isHypnotized) continue;

      // Với Boss Rồng 2 hàng: Hitbox chiếm 2 hàng liên tiếp (z.bossRow và z.bossRow + 1)
      const isRowMatch = isBossRowMatch(z, this.row);

      if (isRowMatch && Math.abs(z.x - this.x) < (isTwoRowBoss(z) ? 55 : (this.isGiant ? 36 : 26))) {
        this.alive = false;
        if (this.isGiant) {
          z.takeDamage(this.damage || 600);
          z.applyKnockback(60);
          gameState.spawnParticles(z.x, z.y - 10, '#76ff03', 1, {
            shape: 'ring',
            vx: 0,
            vy: 0,
            radius: 8,
            maxRadius: 44,
            gravity: 0,
            decay: 3.0
          });
          gameState.spawnParticles(z.x, z.y - 10, '#76ff03', 8, { shape: 'spark' });
          gameState.spawnParticles(z.x, z.y - 10, '#ffffff', 5);
          if (gameState.spawnFloatingText) {
            gameState.spawnFloatingText(z.x, z.y - 25, '600 DMG! 💥', '#76ff03', 18);
          }
          break;
        }
        if (this.type === 'ice_pea') {
          z.takeDamage(this.damage);
          z.applySlow(0.5, 10.0); // Làm chậm 50% trong 10s
          gameState.spawnParticles(z.x, z.y - 10, '#80e5ff', 5, { shape: 'shard', radius: 3.0, gravity: 130, decay: 2.6 });
        } else if (this.type === 'goo_pea') {
          // Đậu Độc: Sát thương cơ bản 30, đánh thẳng vào máu xuyên giáp nón/xô, độc 15 dmg/s dồn tối đa 3 lần, KHÔNG làm chậm
          z.takeDamage(this.damage || 30, true); // bypassArmor = true!
          z.applyPoison(1, 4.0, 15.0, 3); // 1 stack mỗi viên, 15 dmg/s, tối đa 3 stacks
          gameState.spawnParticles(z.x, z.y - 10, '#d500f9', 5);
        } else if (this.type === 'syndra_bolt') {
          z.takeDamage(this.damage);
          gameState.spawnParticles(z.x, z.y - 10, '#ba68c8', 5);
        } else {
          z.takeDamage(this.damage);
          gameState.spawnParticles(z.x, z.y - 10, '#76ff03', 4);
        }
        break;
      }
    }

    if (this.x > CONFIG.CANVAS_WIDTH + 20) {
      this.alive = false;
    }
  }
}

/**
 * LỚP SUN (Tài nguyên Mặt Trời)
 * Tự động nhặt sau khi rơi 0.5s (có thể click tay bất cứ lúc nào)
 */
class Sun {
  constructor(x, y, targetY, isNatural = true, amount = 25) {
    this.id = generateId();
    this.x = x;
    this.y = y;
    this.targetY = targetY;
    this.isNatural = isNatural;
    this.amount = amount;

    this.collected = false;
    this.alive = true;
    this.lifetime = 0;
    this.groundTime = 0;
    this.floatTimer = Math.random() * Math.PI * 2;
    this.rotTimer = Math.random() * Math.PI * 2;

    this.startX = x;
    this.startY = y;
    this.flyProgress = 0;
  }

  update(dt, sunTargetPos, gameState) {
    if (!this.alive) return;

    this.rotTimer += dt * 1.5;

    // Tự động nhặt sau khi rơi 0.5s theo đúng yêu cầu
    if (!this.collected) {
      this.groundTime += dt;
      if (this.groundTime >= CONFIG.SUN_AUTO_COLLECT_DELAY) {
        this.collect();
      }
    }

    if (this.collected) {
      this.flyProgress += dt * 3.5;
      if (this.flyProgress >= 1.0) {
        this.flyProgress = 1.0;
        this.alive = false;
        gameState.addSun(this.amount);
        return;
      }
      const t = this.flyProgress;
      const easeT = t * t * (3 - 2 * t);
      this.x = this.startX + (sunTargetPos.x - this.startX) * easeT;
      this.y = this.startY + (sunTargetPos.y - this.startY) * easeT;
      return;
    }

    // Rơi xuống đất
    if (this.y < this.targetY) {
      this.y += 85 * dt;
      if (this.y >= this.targetY) {
        this.y = this.targetY;
      }
    } else {
      this.floatTimer += dt * 3;
      this.lifetime += dt;
      if (this.lifetime >= CONFIG.NATURAL_SUN_LIFETIME) {
        this.alive = false;
      }
    }
  }

  collect() {
    if (this.collected || !this.alive) return false;
    this.collected = true;
    this.startX = this.x;
    this.startY = this.y;
    this.flyProgress = 0;
    return true;
  }
}

/**
 * LỚP MÁY CẮT CỎ (Lawnmower)
 * 5 máy (1/hàng) ở mép trái. Tự chạy khi zombie chạm nhà, nghiền nát mọi zombie trên hàng. Dùng 1 lần.
 */
class Lawnmower {
  constructor(row) {
    this.row = row;
    this.x = CONFIG.GRID_OFFSET_X - 45;
    this.y = CONFIG.GRID_OFFSET_Y + row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
    this.active = true;
    this.moving = false;
    this.speed = CONFIG.LAWNMOWER_SPEED || 8.5;
    this.hasHitBoss = false;
  }

  trigger(gameState) {
    if (!this.active || this.moving) return;
    this.moving = true;
    if (gameState && gameState.audio) {
      gameState.audio.playLawnmower();
    }
  }

  update(dt, gameState) {
    if (!this.active) return;

    if (this.moving) {
      this.x += this.speed * (60 * dt);

      // Nghiền nát tất cả zombie quân địch trên cùng hàng khi máy chạy qua
      gameState.zombies.forEach(z => {
        if (!z.alive || z.isHypnotized) return;

        const isBoss = isTwoRowBoss(z);
        const isRowMatch = isBoss
          ? (this.row === z.bossRow || this.row === z.bossRow + 1 || z.row === this.row)
          : (z.row === this.row);
        const hitDistance = isBoss ? 55 : 45;

        if (isRowMatch && Math.abs(z.x - this.x) < hitDistance) {
          if (isBoss) {
            // Máy cắt cỏ KHÔNG giết boss Zombot ngay lập tức!
            // Va chạm chỉ gây đúng 111 sát thương theo yêu cầu của người chơi
            if (!this.hasHitBoss) {
              this.hasHitBoss = true;
              const bossDmg = 111;
              z.takeDamage(bossDmg);
              if (gameState.spawnExplosion) {
                gameState.spawnExplosion(this.x, this.y);
              }
              if (gameState.spawnParticles) {
                gameState.spawnParticles(this.x, this.y, '#ff1744', 16);
                gameState.spawnParticles(this.x, this.y, '#ffd54f', 12);
              }
              if (gameState.spawnFloatingText) {
                gameState.spawnFloatingText(z.x, z.y - 20, `-${bossDmg} DMG! 💥`, '#ff1744', 22);
              }
              if (gameState.audio && gameState.audio.playExplosion) {
                gameState.audio.playExplosion('fire');
              }
              // Tiêu hao máy cắt cỏ sau khi đâm vào thân rồng khổng lồ
              this.active = false;
              this.moving = false;
            }
          } else {
            z.skipEggRebirth = true;
            z.takeDamage(99999);
            gameState.spawnParticles(z.x, z.y, '#b71c1c', 10);
          }
        }
      });

      if (this.x > CONFIG.CANVAS_WIDTH + 60) {
        this.active = false;
        this.moving = false;
      }
    }
  }
}

/**
 * LỚP HIỆU ỨNG HẠT (Particle)
 */
class Particle {
  constructor(x, y, color, opts = null) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.shape = (opts && opts.shape) || 'circle';
    this.vx = (opts && opts.vx !== undefined) ? opts.vx : (Math.random() - 0.5) * 145;
    this.vy = (opts && opts.vy !== undefined) ? opts.vy : (Math.random() - 0.5) * 145 - 42;
    this.radius = (opts && opts.radius !== undefined) ? opts.radius : (2.2 + Math.random() * 2.4);
    this.maxRadius = (opts && opts.maxRadius !== undefined) ? opts.maxRadius : (this.radius * 6);
    this.alpha = 1.0;
    this.alive = true;
    this.gravity = (opts && opts.gravity !== undefined) ? opts.gravity : (this.shape === 'ring' ? 0 : 185);
    this.decay = (opts && opts.decay !== undefined) ? opts.decay : (this.shape === 'ring' ? 2.8 : 2.3);
    this.angle = (opts && opts.angle !== undefined) ? opts.angle : Math.atan2(this.vy, this.vx);
    this.spin = (opts && opts.spin !== undefined) ? opts.spin : ((Math.random() - 0.5) * 10);
  }

  update(dt) {
    if (this.shape === 'ring') {
      this.radius += (this.maxRadius - this.radius) * Math.min(1, dt * 11);
    } else {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.vy += this.gravity * dt;
      if (this.shape === 'spark') {
        this.angle = Math.atan2(this.vy, this.vx);
      } else if (this.shape === 'shard') {
        this.angle += this.spin * dt;
      }
    }
    this.alpha -= dt * this.decay;
    if (this.alpha <= 0) {
      this.alive = false;
    }
  }
}

/**
 * LỚP IMP ĐANG BAY TRÊN KHÔNG (FlyingImp)
 */
class FlyingImp {
  constructor(row, startX, startY, targetX, targetY) {
    this.id = generateId();
    this.row = row;
    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.x = startX;
    this.y = startY;
    this.arcHeight = 85;
    this.progress = 0;
    this.duration = 0.9;
    this.alive = true;
  }

  update(dt, gameState) {
    if (!this.alive) return;
    this.progress += dt / this.duration;
    const t = Math.min(1.0, this.progress);
    this.x = this.startX + (this.targetX - this.startX) * t;
    const linearY = this.startY + (this.targetY - this.startY) * t;
    const arc = 4 * this.arcHeight * t * (1 - t);
    this.y = linearY - arc;

    if (t >= 1.0) {
      this.alive = false;
      gameState.spawnLandedImp(this.row, this.targetX, this.targetY);
    }
  }
}

/**
 * LỚP HÀNG RÀO TOÀN ẢNH (Holographic Barrier)
 */
class HolographicBarrier {
  constructor(col) {
    this.id = generateId();
    this.col = Math.min(CONFIG.COLS - 1, col);
    this.x = CONFIG.GRID_OFFSET_X + this.col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
    this.maxHp = 10000;
    this.hp = 10000;
    this.alive = true;
    this.flashTimer = 0;
    this.animTime = 0;
  }

  takeDamage(amount) {
    this.hp -= amount;
    this.flashTimer = 0.12;
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  }

  update(dt) {
    this.animTime += dt;
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
    }
    // Tự phục hồi nếu không bị phá hủy hoàn toàn (hồi 200 HP/s)
    if (this.alive && this.hp < this.maxHp) {
      this.hp = Math.min(this.maxHp, this.hp + 200 * dt);
    }
  }
}

/**
 * LỚP CHỮ BAY NỔI (FloatingText) - Cho hiệu ứng SPUDOW!, THÔI MIÊN!, v.v.
 */
class FloatingText {
  constructor(x, y, text, color = '#ffd54f', fontSize = 16) {
    this.x = x;
    this.y = y;
    this.text = text;
    this.color = color;
    this.fontSize = fontSize;
    this.life = 1.3;
    this.maxLife = 1.3;
    this.alive = true;
  }

  update(dt) {
    this.life -= dt;
    this.y -= 25 * dt;
    if (this.life <= 0) {
      this.alive = false;
    }
  }
}

if (typeof window !== 'undefined') {
  window.Plant = Plant;
  window.Zombie = Zombie;
  window.Projectile = Projectile;
  window.Lawnmower = Lawnmower;
  window.Sun = Sun;
  window.FloatingText = FloatingText;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Plant, Zombie, Projectile, Lawnmower, Sun, FloatingText };
}

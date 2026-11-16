/**
 * PVZ Tower Defense 2D - Configuration & Registries
 * BẮT BUỘC: Tách riêng DATA và LOGIC TẤN CÔNG (ATK) của Cây và Zombie thành các Object độc lập
 * Code xử lý game (bắn đạn, cắn, trừ máu) chỉ đọc thông số từ các Object này ra để tính toán
 */

// ============================================================================
// 1. CẤU HÌNH DATA CÂY (PLANT_CONFIG)
// ============================================================================
const PLANT_CONFIG = {
  // [NHÓM 1: BẮN THẲNG - Straight]
  // Chuẩn PvZ gốc: Tốc độ bắn 1.425s/lần (~14 DPS). Đạn bị chặn bởi vật cản.
  peashooter: {
    id: 'peashooter',
    name: 'Peashooter',
    group: 'straight',
    cost: 100,
    hp: 300,
    atkSpeed: 1.425, // Chuẩn PvZ gốc: 20 sát thương, bắn mỗi 1.425s (~14 DPS)
    shootInterval: 1.425,
    damage: 20,
    projectileType: 'pea',
    projectileSpeed: 6.5,
    cooldown: 7.5,
    canAttack: true,
    produceSun: false
  },
  snow_pea: {
    id: 'snow_pea',
    name: 'Snow Pea',
    group: 'straight',
    cost: 175,
    hp: 300,
    atkSpeed: 1.425, // Chuẩn PvZ gốc: bắn mỗi 1.425s
    shootInterval: 1.425,
    damage: 20,
    projectileType: 'ice_pea',
    projectileSpeed: 6.5,
    slowFactor: 0.5, // Làm chậm 50%
    slowDuration: 10.0, // Trong 10s
    cooldown: 7.5,
    canAttack: true,
    produceSun: false
  },
  repeater: {
    id: 'repeater',
    name: 'Repeater',
    group: 'straight',
    cost: 200,
    hp: 300,
    atkSpeed: 1.425, // Chuẩn PvZ gốc: 40 mỗi lượt (2 viên x 20), bắn mỗi 1.425s (~28 DPS)
    shootInterval: 1.425,
    damage: 20,
    burstCount: 2, // Bắn 2 hạt (20x2)
    burstInterval: 0.15,
    projectileType: 'pea',
    projectileSpeed: 6.5,
    cooldown: 7.5,
    canAttack: true,
    produceSun: false
  },

  // [NHÓM 2: BẮN CẦU VỒNG - Lobbed]
  // Chuẩn PvZ gốc: Tốc độ bắn 2.925s/lần. Bỏ qua vật cản.
  cabbage_pult: {
    id: 'cabbage_pult',
    name: 'Cabbage-pult',
    group: 'lobbed',
    cost: 100,
    hp: 300,
    atkSpeed: 2.925, // Chuẩn PvZ gốc: 40 sát thương, bắn mỗi 2.925s (~14 DPS)
    shootInterval: 2.925,
    damage: 40,
    projectileType: 'cabbage',
    splashDamage: 0, // Cabbage-pult gốc chỉ gây đơn mục tiêu trực tiếp
    splashRadiusCells: 0,
    arcHeight: 90,
    cooldown: 7.5,
    canAttack: true,
    produceSun: false
  },
  melon_pult: {
    id: 'melon_pult',
    name: 'Melon-pult',
    group: 'lobbed',
    cost: 300,
    hp: 300,
    atkSpeed: 2.925, // Chuẩn PvZ gốc: 80 trực tiếp + 30 lan, bắn mỗi 2.925s (~27 DPS)
    shootInterval: 2.925,
    damage: 80,
    projectileType: 'melon',
    splashDamage: 30, // Chuẩn PvZ gốc: 30 sát thương lan AoE 3x3
    splashRadiusCells: 1.5,
    arcHeight: 110,
    cooldown: 7.5,
    canAttack: true,
    produceSun: false
  },

  // [NHÓM 3: CẬN CHIẾN - Melee]
  // Tốc độ đánh (atkSpeed): 1.0s/lần. Đánh xuyên, nhiều mục tiêu.
  bonk_choy: {
    id: 'bonk_choy',
    name: 'Bonk Choy',
    group: 'melee',
    cost: 150,
    hp: 300,
    atkSpeed: 0.5, // 0.5s mỗi đòn
    damage: 20,    // 20 damage mỗi lần đấm
    rangeCols: 2.0, // Tầm 2 ô phía trước và đằng sau lưng
    cooldown: 7.5,
    canAttack: true,
    produceSun: false
  },
  snapdragon: {
    id: 'snapdragon',
    name: 'Snapdragon',
    group: 'melee',
    cost: 200,
    hp: 300,
    atkSpeed: 1.0,
    damage: 30,
    rangeCols: 2.2, // Tầm 1x3 ô phía trước (hàng trên, hàng hiện tại, hàng dưới)
    rangeRows: 1,
    cooldown: 7.5,
    canAttack: true,
    produceSun: false
  },
  galio: {
    id: 'galio',
    name: 'Galio',
    nameEn: 'Galio',
    group: 'melee',
    cost: 200,
    hp: 250,
    atkSpeed: 0.5, // Basic attack: 50 sát thương / 0.5s
    damage: 50,
    rangeCols: 2.0, // Tầm 2 ô tính từ bản thân
    skill1Interval: 5.0, // Skill 1: mỗi 5s bắn sóng năng lượng trước mặt
    skill1Damage: 500,
    skill1Speed: 9.0,
    deathFreezeDuration: 1.0, // Skill 2: khi chết dừng thời gian 1s
    deathPullCount: 5, // Hút 5 zombie gần vào nhà nhất về ô Galio
    deathSkillDamage: 1500,
    cooldown: 20.0,
    canAttack: true,
    produceSun: false
  },
  jhinplant: {
    id: 'jhinplant',
    name: 'Jhinplant',
    nameVi: 'Hoa Súng Tử Vong',
    group: 'straight',
    cost: 140,
    hp: 440,
    atkSpeed: 2.2, // Bắn từng viên cách nhau 2.2s (đã cân bằng từ 1.75s)
    damage: 125, // Viên 1, 2, 3: 125 DMG
    fourthShotMultiplier: 4, // Viên thứ 4 gấp 4 dam = 500 DMG
    magSize: 4,
    reloadDuration: 4.0, // Nạp đạn 4s sau viên thứ 4
    lotusTrapDamage: 444, // Bẫy hoa sen nổ 444 DMG AoE 2x2 ô
    projectileType: 'jhin_bullet',
    projectileSpeed: 11.0,
    cooldown: 4.0,
    canAttack: true,
    produceSun: false
  },

  // [NHÓM 4: CHỨC NĂNG]
  sunflower: {
    id: 'sunflower',
    name: 'Sunflower',
    group: 'functional',
    cost: 50,
    hp: 300,
    cooldown: 7.5,
    produceSun: true,
    sunInterval: 24.0, // Sunflower nhả 25 sun / 24s theo yêu cầu
    firstSunDelay: 5.0,
    sunAmount: 25,
    canAttack: false
  },
  wall_nut: {
    id: 'wall_nut',
    name: 'Wall-nut',
    group: 'functional',
    cost: 50,
    hp: 4000, // HP 4000
    isDefensive: true,
    cooldown: 20.0,
    canAttack: false,
    produceSun: false
  },
  cherry_bomb: {
    id: 'cherry_bomb',
    name: 'Cherry Bomb',
    group: 'instant',
    cost: 150,
    hp: 300,
    fuseTime: 1.2,
    damage: 1800, // Nổ 3x3, Dmg 1800
    rangeRadiusCells: 1.5,
    cooldown: 35.0,
    isInstant: true,
    canAttack: true,
    produceSun: false
  },
  chomper: {
    id: 'chomper',
    name: 'Chomper',
    group: 'melee_swallow',
    cost: 150,
    hp: 300,
    rangeCols: 1.8, // Phạm vi từ ô của bản thân và 1 ô trước mặt
    swallowDamage: 2400, // Nuốt: 2400 dmg tức thì
    chewDuration: 20.0, // Tiêu hóa 20s
    bossDamage: 200, // Với Boss: Cắn 200 dmg mỗi 1.0s
    bossAtkSpeed: 1.0,
    cooldown: 7.5,
    canAttack: true,
    produceSun: false
  },

  // Hỗ trợ tương thích các cây đã có
  lightning_reed: {
    id: 'lightning_reed',
    name: 'Sậy Sét',
    group: 'straight',
    cost: 125,
    hp: 300,
    cooldown: 7.5,
    canAttack: true,
    attackInterval: 1.4,
    atkSpeed: 1.4,
    directDamage: 10,
    chainDamage: 10,
    damage: 10,
    maxTargets: 3, // Sát thương lan tối đa 3 mục tiêu (1 mục tiêu chính + 2 mục tiêu lan)
    maxChainRangeCells: 3.0, // Khoảng cách từ mục tiêu chính tới mục tiêu lan không quá 3 ô
    rowRange: 1
  },
  stunion: {
    id: 'stunion',
    name: 'Hành Tây Choáng',
    group: 'instant',
    cost: 25,
    hp: 300,
    cooldown: 15.0,
    isInstant: true,
    stunDuration: 5.0,
    gasRangeCols: 2
  },
  infi_nut: {
    id: 'infi_nut',
    name: 'Hạt Dẻ Toàn Ảnh',
    group: 'functional',
    cost: 75,
    hp: 2000,
    cooldown: 15.0,
    isDefensive: true,
    regenDelay: 15.0,
    regenRate: 160.0,
    barrierHp: 10000
  },
  sun_shroom: {
    id: 'sun_shroom',
    name: 'Nấm Mặt Trời',
    group: 'functional',
    cost: 25,
    hp: 300,
    cooldown: 7.5,
    produceSun: true,
    sunInterval: 32.0,
    firstSunDelay: 8.0,
    stage1Sun: 25,
    stage2Sun: 50,
    stage3Sun: 75,
    stage2Time: 40.0,
    stage3Time: 85.0
  },
  goo_peashooter: {
    id: 'goo_peashooter',
    name: 'Đậu Độc',
    group: 'straight',
    cost: 125,
    hp: 300,
    cooldown: 7.5,
    canAttack: true,
    shootInterval: 1.4,
    atkSpeed: 1.4,
    baseDamage: 30,
    damage: 30,
    poisonDmgPerSec: 15.0, // 15 sát thương độc mỗi giây
    maxPoisonStacks: 3,    // Cộng dồn tối đa 3 lần
    poisonDuration: 4.0,
    slowFactor: 1.0,       // Không làm chậm
    slowDuration: 0,       // Không làm chậm
    projectileSpeed: 6.0
  },

  // [NHÓM 5: THẢO MỘC ĐẶC BIỆT THEO YÊU CẦU]
  // Nấm Thôi Miên (Hypno-shroom):
  // CHI PHÍ MẶT TRỜI: 100, SẠC LẠI: 20s, SỰ BỀN BỈ: 50, Đơn mục tiêu
  // Khi thây ma ăn nấm thôi miên, chúng sẽ quay lại và chiến đấu cho bạn
  hypno_shroom: {
    id: 'hypno_shroom',
    name: 'Nấm Thôi Miên',
    nameEn: 'Hypno-shroom',
    group: 'functional_hypno',
    cost: 100,
    hp: 50,
    cooldown: 20.0,
    canAttack: false,
    produceSun: false,
    singleTarget: true,
    desc: 'Khi thây ma ăn nấm thôi miên, chúng sẽ quay lại và chiến đấu cho bạn.'
  },

  // Mìn Khoai Tây (Potato Mine):
  // CHI PHÍ MẶT TRỜI: 50, SẠC LẠI: 25s, SỰ BỀN BỈ: 300, HƯ HẠI: 2700
  // THỜI GIAN nhô lên: 5s sau khi đặt xuống. Nếu chưa nhô lên mà bị zom ăn sẽ bị mất luôn.
  // Nổ gây sát thương 3x3 ô.
  potato_mine: {
    id: 'potato_mine',
    name: 'Mìn Khoai Tây',
    nameEn: 'Potato Mine',
    group: 'instant_mine',
    cost: 50,
    hp: 300,
    damage: 2700,
    armDuration: 5.0,
    cooldown: 25.0,
    splashRadiusCells: 1.5,
    canAttack: true,
    produceSun: false,
    desc: '5s sau khi đặt xuống sẽ nhô lên. Nếu chưa nhô lên mà bị zom ăn sẽ bị mất luôn. Nổ gây 2700 sát thương phạm vi 3x3 ô.'
  },

  // Nấm Nam Châm (Magnet-shroom):
  // Hút xô sắt, nón sắt, xích sắt của zombie. Ưu tiên hàng đầu bị rồng nhắm cầu lửa!
  magnet_shroom: {
    id: 'magnet_shroom',
    name: 'Nấm Nam Châm',
    nameEn: 'Magnet-shroom',
    group: 'functional_magnet',
    cost: 100,
    hp: 300,
    cooldown: 15.0,
    canAttack: false,
    produceSun: false,
    attractInterval: 10.0,
    desc: 'Hút các vật kim loại (thùng sắt, nón sắt, xích sắt). Luôn là mục tiêu ưu tiên số 1 của Zombot Dark Dragon!'
  },

  // Cỏ Ba Lá (Blover): Thổi bay toàn bộ zombie bay hoặc đang lơ lửng ngay lập tức rồi biến mất
  blover: {
    id: 'blover',
    name: 'Cỏ Ba Lá',
    nameEn: 'Blover',
    group: 'instant',
    cost: 50,
    hp: 300,
    cooldown: 10.0,
    isInstant: true,
    canAttack: true,
    produceSun: false
  },

  // Cỏ Gai (Spikeweed): 100 Sun, hồi 5s, 300 HP, 15 DMG/giây, ở dưới chân nên không bị zom ăn nhưng vẫn bị đè & Gargantuar/Zomboss đập
  spikeweed: {
    id: 'spikeweed',
    name: 'Cỏ Gai',
    nameEn: 'Spikeweed',
    group: 'ground',
    cost: 100,
    hp: 300,
    cooldown: 5.0,
    damage: 15,
    damagePerSec: 15,
    attackInterval: 1.0,
    atkSpeed: 1.0,
    isGroundPlant: true,
    canAttack: true,
    produceSun: false
  },

  // Lux (Tiểu Thư Ánh Sáng): 300 HP, 300 Sun, hồi 5s, 45 DMG/s tia sáng xuyên 1 hàng (cả vật cản),
  // giết hoặc hỗ trợ 10 zombie bắn luồng sáng 600 DMG + choáng 2s rồi reset 0/10
  lux: {
    id: 'lux',
    name: 'Lux',
    nameVi: 'Tiểu Thư Ánh Sáng',
    group: 'light_beam',
    cost: 300,
    hp: 300,
    cooldown: 5.0,
    atkSpeed: 1.0,
    attackInterval: 1.0,
    damage: 45,
    ultThreshold: 10,
    ultDamage: 600,
    ultStunDuration: 2.0,
    canAttack: true,
    produceSun: false
  },

  // Phù Thủy Syndra: Hoa dạ lan hương / lưu ly biến dị hắc ám
  // 250 Sun, hồi 12s, 200 HP, đánh thường 30 DMG / 0.5s.
  // Skill: Mỗi 3s tích 1 quả cầu; có zombie ném cầu 100 DMG (kill -> hồi 1 cầu);
  // không có zombie tích tối đa 3 stack, đủ 3 stack phóng cầu cường hóa 600 DMG vào mục tiêu ATK cao nhất hàng.
  syndra: {
    id: 'syndra',
    name: 'Phù Thủy Syndra',
    nameVi: 'Phù Thủy Syndra',
    group: 'dark_arcane',
    cost: 250,
    hp: 200,
    cooldown: 12.0,
    atkSpeed: 0.5,
    attackInterval: 0.5,
    damage: 30,
    orbInterval: 3.0,
    orbDamage: 100,
    maxOrbStacks: 3,
    empoweredOrbDamage: 600,
    projectileSpeed: 9.5,
    canAttack: true,
    produceSun: false
  },

  // Kata Blade Rose: 100 Sun, hồi 9s, 450 HP, ATK 30/s tầm 2 ô ném dao nảy tối đa 3 mục tiêu,
  // sau 3s tấn công zombie xoay bão dao 3x3 trong 3s (30 DMG / 0.25s), kill hồi đầy máu.
  kata: {
    id: 'kata',
    name: 'Kata Blade Rose',
    nameVi: 'Kata Hoa Hồng Kiếm',
    group: 'blade_dancer',
    cost: 100,
    hp: 450,
    cooldown: 9.0,
    atkSpeed: 1.0,
    attackInterval: 1.0,
    damage: 30,
    rangeCells: 2.15,
    bounceTargets: 3,
    skillChargeDuration: 3.0,
    spinDuration: 3.0,
    spinInterval: 0.25,
    spinDamage: 30,
    projectileSpeed: 11.0,
    canAttack: true,
    produceSun: false
  },

  // Aurora (Hoa Chuông Linh Giới): 250 Sun, hồi 15s, 300 HP, 40 DMG/s kiểu cầu vồng xuyên 4 mục tiêu,
  // mục tiêu đầu tiên bị đẩy lùi 1 ô. Mỗi 15s gọi pháp trận toàn sân tại zombie gần nhà nhất (tránh trùng hàng Aurora khác),
  // gây 200 DMG phạm vi 2 ô và đẩy lùi về ô 1 ngoài sân.
  aurora: {
    id: 'aurora',
    name: 'Aurora',
    nameVi: 'Aurora Hoa Chuông Linh Giới',
    group: 'spirit_bell',
    cost: 250,
    hp: 300,
    cooldown: 15.0,
    atkSpeed: 2.0,
    attackInterval: 2.0,
    damage: 40,
    pierceCount: 4,
    firstKnockbackCells: 1.0,
    skillInterval: 15.0,
    realmDamage: 200,
    realmRangeCells: 2.0,
    projectileSpeed: 8.5,
    canAttack: true,
    produceSun: false
  }

};

// ============================================================================
// 2. CẤU HÌNH THÔNG SỐ CHIẾN ĐẤU CHUYÊN BIỆT CỦA ZOMBIE (ZOMBIE_COMBAT_STATS)
// ============================================================================
const ZOMBIE_COMBAT_STATS = {
  // Chỉ số cắn chung (Bite Stats)
  global: {
    biteDamage: 50,
    biteInterval: 0.5,
    biteDps: 100
  },

  // Chỉ số chiến đấu chuyên biệt từng loại Zombie (Specialized Combat Mechanics)
  specialized: {
    pole_vaulting: {
      fastSpeedPerCell: 3.0,
      slowSpeedPerCell: 5.5,
      vaultDistanceCells: 1.2
    },
    gargantuar: {
      damage: 500, // damage: 1500
      smashInterval: 2.0,
      smashWindup: 1.0,
      impThrowThreshold: 1500, // impThrowThreshold: 1800
      impThrowCells: 3
    },
    zombot_dark_dragon: {
      collisionDamage: 111,
      damage: 99999, // Hơi thở lửa oneshot cây
      roarCooldown: 14.0,     // Gầm triệu hồi lính Dark Ages mỗi 14s
      fireballCooldown: 9.0,  // Nhổ cầu lửa mỗi 9s
      breathCooldown: 22.0,   // Hơi thở lửa càn quét 2 hàng mỗi 22s
      knockbackImmune: true,
      stunImmune: true,       // Miễn nhiễm choáng (choáng chuyển hóa thành làm chậm)
      slowActionDelay: 1.5    // Hiệu ứng làm chậm khiến Zomboss bị delay hành động 1.5s
    },
    imp_dragon: {
      isFireImmune: true // Miễn nhiễm sát thương lửa
    },
    tombstone: {
      isObstacle: true,
      damage: 0,
      atkSpeed: 999999
    },
    jurassic_bully: {
      damagePerSec: 100,
      knockbackImmune: true
    },
    turquoise_skull: {
      damagePerSec: 100,
      laserDamage: 4000,
      laserChargeDuration: 5.0,
      laserRangeCells: 4,
      laserCooldown: 2.5
    },
    troglobite: {
      damage: 100,
      attackInterval: 0.5,
      freezeImmune: true,
      slowImmune: true
    },
    yeti_imp: {
      damage: 100,
      attackInterval: 0.5,
      freezeImmune: true,
      slowImmune: true
    },
    ice_block: {
      isObstacle: true,
      damage: 0,
      atkSpeed: 999999,
      freezeImmune: true,
      slowImmune: true,
      knockbackImmune: true
    },
    lang_khach: {
      damage: 60,
      damagePerSec: 120,
      attackInterval: 0.5,
      dashRangeCells: 3.0,
      dashDamage: 100,
      invulnDuration: 3.0,
      tornadoThreshold: 2,
      tornadoDamage: 1800,
      tornadoRangeCells: 2.0
    },
    shen: {
      damage: 114,           // 60/giây với chu kỳ cắn 1.9s (60 * 1.9 = 114 DMG/lần)
      damagePerSec: 60,
      attackInterval: 1.9,
      atkSpeed: 1.9,
      hardened: true,
      skill1Cooldown: 7.0,
      spiritShieldAmount: 350,
      skill1MinMaxHp: 500,   // Chỉ buff zombie có maxHp > 500 (trừ Gargantuar, Zomboss)
      defensiveKillBites: 3  // Kết liễu cây phòng thủ trong 3 lần cắn bất kể máu
    },
    anivia: {
      isFlying: true,
      flyingSize: 'large',
      isLargeFlying: true,
      damage: 40,
      attackInterval: 1.0,
      atkSpeed: 1.0,
      attackRangeCells: 3.0,
      freezeImmune: true,
      slowImmune: true,
      eggHp: 770,
      eggDuration: 5.0,
      phase2Hp: 1100,
      phase2Damage: 40,
      phase2AttackInterval: 0.35
    },
    anivia_ice_block: {
      isObstacle: true,
      damage: 0,
      atkSpeed: 999999,
      freezeImmune: true,
      slowImmune: true,
      knockbackImmune: true
    },
    balloon: {
      isFlying: true,
      flyingSize: 'small',
      damage: 50,
      attackInterval: 0.5,
      atkSpeed: 0.5
    },
    jetpack: {
      isFlying: true,
      flyingSize: 'small',
      damage: 50,
      attackInterval: 0.5,
      atkSpeed: 0.5,
      boostSpeedMultiplier: 1.5,
      boostColumnThreshold: 5
    },
    thresh: {
      damage: 50,
      attackInterval: 0.5,
      atkSpeed: 0.5,
      hookRangeCells: 3.0,
      pullInterval: 1.5,
      pullDamage: 100
    },
    quan_chua: {
      damage: 150,
      attackInterval: 1.0,
      atkSpeed: 1.0,
      attackRangeCells: 1.0,
      channelDuration: 3.0,
      minSoulsToChannel: 3,
      coneheadThreshold: 5
    },
    dragon_hatchling: {
      damage: 100,
      attackInterval: 0.85,
      atkSpeed: 0.85
    },
    dragon_adult: {
      damage: 150,
      attackInterval: 1.0,
      atkSpeed: 1.0
    },
    dragon_dark: {
      damage: 150,
      attackInterval: 1.0,
      atkSpeed: 1.0,
      firstHitMultiplier: 2.0
    },
    dragon_chemtech: {
      damage: 169,
      attackInterval: 1.0,
      atkSpeed: 1.0,
      potionHpStep: 200,
      maxPotions: 5
    },
    dragon_wind: {
      damage: 50,
      attackInterval: 1.0,
      atkSpeed: 1.0,
      windHasteDuration: 3.0,
      windHasteMultiplier: 2.0
    },
    dragon_water: {
      damage: 20,
      attackInterval: 1.0,
      atkSpeed: 1.0,
      maxWaterLives: 10,
      waterScaleFactor: 0.5
    },
    ancient_dragon_boss: {
      collisionDamage: 99999,
      roarSummonCooldown: 12.0,
      lightningCooldown: 20.0,
      lightningTargetCount: 3,
      gargantuarTriggerLostHp: 1000,
      gargantuarShieldAmount: 500,
      fearTriggerStepHp: 1500,
      fearStunDuration: 2.0,
      executeHpRatio: 0.15,
      rainHealCooldown: 16.0,
      rainHealRatio: 0.20,
      finalSwarmHpThreshold: 100,
      knockbackImmune: true,
      stunImmune: true,
      slowActionDelay: 1.5
    },
    azir_desert_emperor: {
      collisionDamage: 99999,
      summonCooldown: 12.0,
      skill1Cooldown: 8.5,
      sandSoldierDamage: 200,
      phase2HpThreshold: 15000,
      sandstormWaveDelay: 20.0,
      phase3HpThreshold: 7000,
      knockbackImmune: true,
      stunImmune: true,
      slowActionDelay: 1.5
    },
    sand_soldier: {
      damage: 200,
      attackInterval: 0.4,
      atkSpeed: 0.4,
      vanishAfterFirstAttack: true
    },
    sand_coffin: {
      damage: 0,
      spawnedZombieType: 'basic'
    },
    renekton_croc: {
      damage: 100,
      attackInterval: 1.0,
      atkSpeed: 1.0,
      dashCharges: 2,
      dashDamage: 1000,
      giantDamage: 250,
      sweepChargeDuration: 3.0,
      sweepDamage: 400,
      sweepHealPerPlant: 100,
      sweepCharges: 1
    },
    nasus_hound: {
      damage: 100,
      attackInterval: 1.0,
      atkSpeed: 1.0,
      witherRangeCells: 2.0,
      witherSlowFactor: 0.5,
      witherDuration: 5.0,
      witherBurnDamage: 10,
      witherBurnInterval: 0.5,
      witherCooldown: 10.0,
      giantThresholdRatio: 0.60,
      giantAttackInterval: 2.0,
      giantHealOnKill: 350
    }
  }
};

const ZOMBIE_COMBAT_DEFAULTS = ZOMBIE_COMBAT_STATS.global;

// ============================================================================
// CHỈ SỐ CƠ BẢN CỦA TỪNG LOẠI ZOMBIE (ZOMBIE_BASE_STATS)
// ============================================================================
const ZOMBIE_BASE_STATS = {
  basic: {
    id: 'basic',
    name: 'Basic Zombie',
    hp: 190,
    baseHp: 190,
    speedPerCell: 6.0,
    speed: 0.222,
    atkSpeed: 0.5,
    damage: 50,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0
  },

  conehead: {
    id: 'conehead',
    name: 'Conehead Zombie',
    hp: 560,
    armorHp: 370,
    baseHp: 190,
    speedPerCell: 6.0,
    speed: 0.222,
    atkSpeed: 0.5,
    damage: 50,
    isBoss: false,
    hasShield: true,
    resistanceKnockback: 0
  },

  buckethead: {
    id: 'buckethead',
    name: 'Buckethead Zombie',
    hp: 1290,
    armorHp: 1100,
    baseHp: 190,
    speedPerCell: 6.0,
    speed: 0.222,
    atkSpeed: 0.5,
    damage: 50,
    isBoss: false,
    hasShield: true,
    resistanceKnockback: 0
  },

  pole_vaulting: {
    id: 'pole_vaulting',
    name: 'Pole Vaulting Zombie',
    hp: 500,
    baseHp: 500,
    speedPerCell: 3.0,
    speed: 0.444,
    atkSpeed: 0.5,
    damage: 50,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0
  },

  gargantuar: {
    id: 'gargantuar',
    name: 'Gargantuar BOSS',
    hp: 3000, // hp: 3600
    baseHp: 3000,
    speedPerCell: 8.5,
    speed: 0.157,
    speedCellsPerSec: 0.24,
    damage: 500,
    isBoss: true,
    hasShield: false,
    resistanceKnockback: 1.0
  },

  zombot_dark_dragon: {
    id: 'zombot_dark_dragon',
    name: 'Zombot Dark Dragon',
    hp: 27000,
    maxHp: 27000,
    baseHp: 27000,
    isBoss: true,
    speed: 0,
    speedPerCell: 999999,
    attackInterval: 1.0,
    knockbackImmune: true,
    stunImmune: true,
    slowActionDelay: 1.5,
    resistanceKnockback: 1.0,
    hasShield: false
  },

  ancient_dragon_boss: {
    id: 'ancient_dragon_boss',
    name: 'Boss Rồng Ngàn Tuổi',
    hp: 10000,
    maxHp: 10000,
    baseHp: 10000,
    isBoss: true,
    speed: 0,
    speedPerCell: 999999,
    attackInterval: 1.0,
    knockbackImmune: true,
    stunImmune: true,
    slowActionDelay: 1.5,
    resistanceKnockback: 1.0,
    hasShield: false
  },

  imp_dragon: {
    id: 'imp_dragon',
    name: 'Imp Dragon Zombie',
    hp: 190,
    baseHp: 190,
    speed: 0.65,
    speedPerCell: 2.8,
    damage: 20,
    attackInterval: 0.5,
    atkSpeed: 0.5,
    hasShield: false,
    resistanceKnockback: 0.2
  },

  tombstone: {
    id: 'tombstone',
    name: 'Tombstone (Vật cản)',
    hp: 500,
    baseHp: 500,
    isObstacle: true,
    speedPerCell: 999999,
    speed: 0,
    damage: 0,
    atkSpeed: 999999,
    resistanceKnockback: 1.0
  },

  regular: {
    id: 'regular',
    name: 'Zombie Thường',
    hp: 200,
    baseHp: 200,
    speed: 0.35,
    speedPerCell: 5.0,
    damage: 20,
    attackInterval: 0.5,
    atkSpeed: 0.5,
    hasShield: false,
    resistanceKnockback: 0
  },

  imp: {
    id: 'imp',
    name: 'Imp',
    hp: 100,
    baseHp: 100,
    speed: 0.70,
    speedPerCell: 2.5,
    damage: 20,
    attackInterval: 0.5,
    atkSpeed: 0.5,
    hasShield: false,
    resistanceKnockback: 0
  },

  jurassic_bully: {
    id: 'jurassic_bully',
    name: 'Jurassic Bully',
    hp: 1100,
    baseHp: 1100,
    speed: 0.2133,
    speedCellsPerSec: 0.16,
    speedPerCell: 6.25,
    damage: 25,
    attackInterval: 0.25,
    resistanceKnockback: 1.0,
    hasShield: false
  },

    turquoise_skull: {
    id: 'turquoise_skull',
    name: 'Turquoise Skull Zombie',
    hp: 250,
    baseHp: 250,
    speed: 0.2467,
    speedCellsPerSec: 0.185,
    speedPerCell: 5.4,
    damage: 25,
    attackInterval: 0.25,
    resistanceKnockback: 0,
    hasShield: false
  },

  troglobite: {
    id: 'troglobite',
    name: 'Troglobite với một khối',
    hp: 470,
    baseHp: 470,
    armorHp: 0,
    speed: 0.2467,
    speedCellsPerSec: 0.185,
    speedPerCell: 5.4,
    damage: 100,
    attackInterval: 0.5,
    freezeImmune: true,
    slowImmune: true,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.4
  },

  yeti_imp: {
    id: 'yeti_imp',
    name: 'Yeti Imp',
    hp: 190,
    baseHp: 190,
    armorHp: 0,
    speed: 0.444,
    speedCellsPerSec: 0.33,
    speedPerCell: 3.0,
    damage: 100,
    attackInterval: 0.5,
    freezeImmune: true,
    slowImmune: true,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0
  },

  ice_block: {
    id: 'ice_block',
    name: 'Khối Băng (Yeti Imp)',
    hp: 450,
    baseHp: 450,
    armorHp: 0,
    isObstacle: true,
    speed: 0,
    speedPerCell: 999999,
    damage: 0,
    freezeImmune: true,
    slowImmune: true,
    knockbackImmune: true,
    hasShield: false,
    resistanceKnockback: 1.0
  },

  lang_khach: {
    id: 'lang_khach',
    name: 'Lãng Khách Zombie',
    hp: 600,
    baseHp: 600,
    armorHp: 0,
    speed: 0.278,
    speedPerCell: 4.8,
    damage: 60,
    damagePerSec: 120,
    attackInterval: 0.5,
    atkSpeed: 0.5,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0
  },

  shen: {
    id: 'shen',
    name: 'Shen Mắt Hoàng Hôn',
    hp: 1800,
    baseHp: 1800,
    armorHp: 0,
    hardened: true,
    speed: 0.222,
    speedPerCell: 6.0,
    damage: 114,
    damagePerSec: 60,
    attackInterval: 1.9,
    atkSpeed: 1.9,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0
  },

  anivia: {
    id: 'anivia',
    name: 'Anivia Phượng Hoàng Băng',
    hp: 660,
    baseHp: 660,
    armorHp: 0,
    speed: 0.167,
    speedPerCell: 8.0,
    damage: 40,
    attackInterval: 1.0,
    atkSpeed: 1.0,
    attackRangeCells: 3.0,
    isFlying: true,
    flyingSize: 'large',
    isLargeFlying: true,
    freezeImmune: true,
    slowImmune: true,
    eggHp: 770,
    eggDuration: 5.0,
    phase2Hp: 1100,
    phase2Damage: 40,
    phase2AttackInterval: 0.35,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.4
  },

  anivia_ice_block: {
    id: 'anivia_ice_block',
    name: 'Khối Băng Phượng Hoàng',
    hp: 150,
    baseHp: 150,
    armorHp: 0,
    isObstacle: true,
    speed: 0,
    speedPerCell: 999999,
    damage: 0,
    freezeImmune: true,
    slowImmune: true,
    knockbackImmune: true,
    hasShield: false,
    resistanceKnockback: 1.0
  },

  balloon: {
    id: 'balloon',
    name: 'Zombie Bóng Bay',
    hp: 190,
    baseHp: 190,
    armorHp: 0,
    speed: 0.296,
    speedPerCell: 4.5,
    damage: 50,
    attackInterval: 0.5,
    atkSpeed: 0.5,
    isFlying: true,
    flyingSize: 'small',
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0
  },

  jetpack: {
    id: 'jetpack',
    name: 'Zombie Jetpack',
    hp: 350,
    baseHp: 350,
    armorHp: 0,
    speed: 0.278,
    speedPerCell: 4.8,
    damage: 50,
    attackInterval: 0.5,
    atkSpeed: 0.5,
    isFlying: true,
    flyingSize: 'small',
    boostSpeedMultiplier: 1.5,
    boostColumnThreshold: 5,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0
  },

  thresh: {
    id: 'thresh',
    name: 'Thresh Zombie',
    hp: 490,
    baseHp: 490,
    armorHp: 0,
    speed: 0.222,
    speedPerCell: 6.0,
    damage: 50,
    attackInterval: 0.5,
    atkSpeed: 0.5,
    hookRangeCells: 3.0,
    pullInterval: 1.5,
    pullDamage: 100,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.2
  },

  quan_chua: {
    id: 'quan_chua',
    name: 'Quận Chúa',
    hp: 600,
    baseHp: 600,
    armorHp: 0,
    speed: 0.19,
    speedPerCell: 7.0,
    damage: 150,
    attackInterval: 1.0,
    atkSpeed: 1.0,
    attackRangeCells: 1.0,
    channelDuration: 3.0,
    minSoulsToChannel: 3,
    coneheadThreshold: 5,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.2
  },

  dragon_hatchling: {
    id: 'dragon_hatchling',
    name: 'Rồng Mới Nở',
    hp: 200,
    baseHp: 200,
    armorHp: 0,
    speed: 0.296,
    speedPerCell: 4.5,
    damage: 100,
    attackInterval: 0.85,
    atkSpeed: 0.85,
    isFlying: true,
    flyingSize: 'small',
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0
  },

  dragon_adult: {
    id: 'dragon_adult',
    name: 'Rồng Trưởng Thành',
    hp: 500,
    baseHp: 500,
    armorHp: 0,
    speed: 0.35,
    speedPerCell: 3.8,
    damage: 150,
    attackInterval: 1.0,
    atkSpeed: 1.0,
    isFlying: true,
    flyingSize: 'large',
    isLargeFlying: true,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.25
  },

  dragon_dark: {
    id: 'dragon_dark',
    name: 'Rồng Hắc Ám',
    hp: 300,
    baseHp: 300,
    armorHp: 0,
    nonMetalArmor: true,
    speed: 0.296,
    speedPerCell: 4.5,
    damage: 150,
    attackInterval: 1.0,
    atkSpeed: 1.0,
    firstHitMultiplier: 2.0,
    isFlying: true,
    flyingSize: 'large',
    isLargeFlying: true,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.3
  },

  dragon_chemtech: {
    id: 'dragon_chemtech',
    name: 'Rồng Hóa Kỹ',
    hp: 1000,
    baseHp: 1000,
    armorHp: 0,
    speed: 0.222,
    speedPerCell: 6.0,
    damage: 169,
    attackInterval: 1.0,
    atkSpeed: 1.0,
    potionHpStep: 200,
    maxPotions: 5,
    isFlying: false,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.4
  },

  dragon_wind: {
    id: 'dragon_wind',
    name: 'Rồng Gió',
    hp: 400,
    baseHp: 400,
    armorHp: 0,
    speed: 1.333,
    speedPerCell: 1.0,
    damage: 50,
    attackInterval: 1.0,
    atkSpeed: 1.0,
    windHasteDuration: 3.0,
    windHasteMultiplier: 2.0,
    isFlying: true,
    flyingSize: 'small',
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0
  },

  dragon_water: {
    id: 'dragon_water',
    name: 'Rồng Nước',
    hp: 100,
    baseHp: 100,
    armorHp: 0,
    speed: 0.222,
    speedPerCell: 6.0,
    damage: 20,
    attackInterval: 1.0,
    atkSpeed: 1.0,
    maxWaterLives: 10,
    waterScaleFactor: 0.5,
    isFlying: false,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.15
  },

  azir_desert_emperor: {
    id: 'azir_desert_emperor',
    name: 'Azir Hoàng Đế Sa Mạc',
    hp: 20000,
    maxHp: 20000,
    baseHp: 20000,
    isBoss: true,
    speed: 0,
    speedPerCell: 999999,
    attackInterval: 1.0,
    knockbackImmune: true,
    stunImmune: true,
    slowActionDelay: 1.5,
    resistanceKnockback: 1.0,
    hasShield: false
  },

  sand_soldier: {
    id: 'sand_soldier',
    name: 'Lính Cát Sa Mạc',
    hp: 240,
    baseHp: 240,
    armorHp: 0,
    speed: 0.296,
    speedPerCell: 4.5,
    damage: 200,
    attackInterval: 0.4,
    atkSpeed: 0.4,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.2
  },

  sand_coffin: {
    id: 'sand_coffin',
    name: 'Quan Tài Sa Mạc',
    hp: 800,
    baseHp: 800,
    armorHp: 0,
    isObstacle: true,
    speed: 0,
    speedPerCell: 999999,
    damage: 0,
    atkSpeed: 999999,
    knockbackImmune: true,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 1.0
  },

  renekton_croc: {
    id: 'renekton_croc',
    name: 'Thần Cá Sấu',
    hp: 2700,
    baseHp: 2700,
    armorHp: 0,
    speed: 0.222,
    speedPerCell: 6.0,
    damage: 100,
    attackInterval: 1.0,
    atkSpeed: 1.0,
    isBoss: false,
    isMiniBoss: true,
    hasShield: false,
    resistanceKnockback: 0.85
  },

  nasus_hound: {
    id: 'nasus_hound',
    name: 'Thần Khuyển',
    hp: 3000,
    baseHp: 3000,
    armorHp: 0,
    speed: 0.222,
    speedPerCell: 6.0,
    damage: 100,
    attackInterval: 1.0,
    atkSpeed: 1.0,
    isBoss: false,
    isMiniBoss: true,
    hasShield: false,
    resistanceKnockback: 0.85
  },

  // ============================================================================
  // THẾ GIỚI MỚI: CHIẾN TRƯỜNG NOSUS (5 LOẠI ZOMBIE TỪ YẾU TỚI MẠNH)
  // ============================================================================
  nosus_thrall: {
    id: 'nosus_thrall',
    name: 'Binh Sĩ Nosus',
    hp: 210,
    baseHp: 210,
    armorHp: 0,
    speed: 0.296,
    speedPerCell: 4.5,
    damage: 45,
    attackInterval: 0.5,
    atkSpeed: 0.5,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0
  },

  nosus_assassin: {
    id: 'nosus_assassin',
    name: 'Sát Thủ Huyết Đao Nosus',
    hp: 340,
    baseHp: 340,
    armorHp: 0,
    speed: 0.333,
    speedPerCell: 4.0,
    damage: 65,
    attackInterval: 0.5,
    atkSpeed: 0.5,
    bloodBurstDuration: 3.0,
    bloodBurstMult: 1.6,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.1
  },

  nosus_shieldbearer: {
    id: 'nosus_shieldbearer',
    name: 'Vệ Binh Khiên Sắt Nosus',
    hp: 1050,
    baseHp: 300,
    armorHp: 750,
    speed: 0.215,
    speedPerCell: 6.2,
    damage: 65,
    attackInterval: 0.5,
    atkSpeed: 0.5,
    isBoss: false,
    hasShield: true,
    resistanceKnockback: 0.4
  },

  nosus_hemomancer: {
    id: 'nosus_hemomancer',
    name: 'Huyết Pháp Sư Nosus',
    hp: 760,
    baseHp: 760,
    armorHp: 0,
    speed: 0.205,
    speedPerCell: 6.5,
    damage: 80,
    attackInterval: 1.4,
    atkSpeed: 1.4,
    attackRangeCells: 2.5,
    bloodPactCooldown: 6.5,
    bloodPactHeal: 120,
    isBoss: false,
    hasShield: false,
    resistanceKnockback: 0.3
  },

  nosus_warlord: {
    id: 'nosus_warlord',
    name: 'Darius (Đại Tướng Nosus)',
    hp: 3200,
    baseHp: 3200,
    armorHp: 0,
    speed: 0.222,
    speedPerCell: 6.0,
    damage: 240,
    attackInterval: 1.75,
    atkSpeed: 1.75,
    executeThreshold: 0.20,
    spinCooldown: 5.0,
    spinDamage: 180,
    spinHealMin: 150,
    spinHealMid: 200,
    spinHealMax: 300,
    lastStandThreshold: 100,
    invulnDuration: 4.0,
    invulnAttackInterval: 1.0,
    frenzySpeedMult: 2.0,
    slowImmune: true,
    hypnoImmune: true,
    knockbackImmune: true,
    isBoss: false,
    isMiniBoss: true,
    hasShield: false,
    resistanceKnockback: 1.0
  }
};

// ============================================================================
// HỢP NHẤT DANH MỤC ZOMBIE (ZOMBIE_CONFIG) - CHỈ CHỨA CÁC ĐỐI TƯỢNG LOẠI ZOMBIE
// Object.keys(ZOMBIE_CONFIG) 100% không bị va chạm hay ô nhiễm bởi biteDamage/biteInterval
// ============================================================================
const ZOMBIE_CONFIG = {};
for (const [id, base] of Object.entries(ZOMBIE_BASE_STATS)) {
  ZOMBIE_CONFIG[id] = {
    ...base,
    ...(ZOMBIE_COMBAT_STATS.specialized[id] || {})
  };
}

// Aliases cho cấu trúc code trước
const PLANT_REGISTRY = PLANT_CONFIG;
const ZOMBIE_REGISTRY = ZOMBIE_CONFIG;

// ============================================================================
// 3. CƠ CHẾ GAME CỐT LÕI (CORE CONFIG)
// ============================================================================
const CONFIG = {
  // Lưới 9 cột x 5 hàng. Kích thước ô 80x100 chuẩn
  ROWS: 5,
  COLS: 9,
  CANVAS_WIDTH: 960,
  CANVAS_HEIGHT: 540,

  GRID_OFFSET_X: 140, // Chừa mép trái cho khay hạt giống dọc (72px) và máy cắt cỏ (95px)
  GRID_OFFSET_Y: 60,  // Chừa mép trên cho thanh wave & nút chức năng (35px), hàng 1 hoàn toàn không bị che!
  CELL_WIDTH: 80,     // 80px x 9 cột = 720px
  CELL_HEIGHT: 90,    // 90px x 5 hàng = 450px

  // Kinh tế Sun
  INITIAL_SUN: 50,       // Ban đầu 50 Sun theo yêu cầu
  SANDBOX_SUN: 9999,     // Sandbox: 9999 Sun
  SUN_VALUE: 25,
  SUN_AUTO_COLLECT_DELAY: 0.5, // Tự động nhặt sau khi rơi 0.5s (có thể click tay)
  NATURAL_SUN_INTERVAL: 8.5,
  NATURAL_SUN_LIFETIME: 10.0,

  // Tốc độ game mặc định là 2.0 (hỗ trợ bật/tắt x1 và x2)
  GAME_SPEED: 2.0,

  // Máy cắt cỏ: 5 máy (1/hàng) ở mép trái. Tự chạy khi zombie chạm nhà, nghiền nát mọi zombie trên hàng
  USE_LAWNMOWERS: true,
  LAWNMOWER_SPEED: 8.5,

  // Tham chiếu cấu hình Zombie
  zombieBase: ZOMBIE_BASE_STATS,
  zombieCombat: ZOMBIE_COMBAT_STATS,

  // Giới hạn dt tối đa trong game loop: scaledDt = Math.min(dt * timeScale, 0.1) chống xuyên tường
  MAX_SCALED_DT: 0.1,

  // --- CẤU HÌNH HỆ THỐNG CONVEYOR BELT (BĂNG CHUYỀN) ---
  conveyor: {
    enabled: true,
    capacity: 8,              // Số ô tối đa trên băng chuyền (8 ô)
    spawnInterval: 4500,      // Thời gian sinh cây mới (4.5s)
    initialSpawn: 5,          // Số lượng vật phẩm sinh ra ngay khi bắt đầu màn
    plantFoodWeight: 14,      // Trọng số xuất hiện của Plant Food
    
    // Plant Pool CHỈ GỒM CÁC CÂY NGƯỜI CHƠI ĐÃ CÓ TRONG GAME (Tuyệt đối không thêm cây lạ)
    plantPool: [
      // [Phòng thủ kiên cố]
      { plantId: "wall_nut", weight: 26 },
      { plantId: "infi_nut", weight: 22 },
      
      // [Tấn công cơ bản & tầm xa]
      { plantId: "peashooter", weight: 26 },
      { plantId: "cabbage_pult", weight: 26 },
      { plantId: "snow_pea", weight: 22 },
      { plantId: "repeater", weight: 18 },
      { plantId: "lightning_reed", weight: 20 },
      { plantId: "goo_peashooter", weight: 18 },
      { plantId: "melon_pult", weight: 14 },
      
      // [Cận chiến & diện rộng]
      { plantId: "bonk_choy", weight: 18 },
      { plantId: "snapdragon", weight: 18 },
      { plantId: "chomper", weight: 15 },
      { plantId: "galio", weight: 14 },
      { plantId: "jhinplant", weight: 14 },
      
      // [Khống chế & khắc chế Zombie / Boss]
      { plantId: "magnet_shroom", weight: 25 },
      { plantId: "stunion", weight: 18 },
      { plantId: "potato_mine", weight: 20 },
      { plantId: "hypno_shroom", weight: 15 },
      { plantId: "cherry_bomb", weight: 10 },
      { plantId: "blover", weight: 12 },
      { plantId: "spikeweed", weight: 16 },
      { plantId: "lux", weight: 12 },
      { plantId: "syndra", weight: 12 },
      { plantId: "kata", weight: 14 },
      { plantId: "aurora", weight: 12 }
    ]
  }
};

// ============================================================================
// 4. HỆ THỐNG WORLD MAP & ĐỘ KHÓ TĂNG DẦN
// ============================================================================
const LEVEL_CONFIG = {
  1: {
    level: 1,
    title: 'Level 1: Khởi Đầu Nghĩa Địa',
    subtitle: 'Kẻ thù: Basic Zombie & Quỷ Lùn Imp',
    description: 'Làm quen với khu vườn nghĩa địa cùng Basic Zombie và Quỷ Lùn Imp nhanh nhẹn.',
    zombiePool: ['basic', 'imp'],
    hasTombstones: false,
    tombstoneCount: 0,
    spawnMultiplier: 1.0,
    waves: 5
  },
  2: {
    level: 2,
    title: 'Level 2: Bia Mộ & Nón Sắt',
    subtitle: 'Thêm Conehead & Pole Vaulting (Cầm Sào)',
    description: 'Bia Mộ xuất hiện trên sân. Zombie Nón Sắt và Nhảy Sào vượt rào tham chiến!',
    zombiePool: ['basic', 'conehead', 'pole_vaulting'],
    hasTombstones: true,
    tombstoneCount: 4,
    spawnMultiplier: 1.0,
    waves: 5
  },
  3: {
    level: 3,
    title: 'Level 3: Binh Đoàn Thùng Sắt, Bay & Thresh',
    subtitle: 'Thêm Buckethead, Đầu Lâu, Bóng Bay, Jetpack & Thresh',
    description: 'Zombie Thùng Sắt, Đầu Lâu Laser cùng Bóng Bay, Jetpack tăng tốc và Thresh ném xích kéo cây!',
    zombiePool: ['basic', 'conehead', 'buckethead', 'turquoise_skull', 'balloon', 'jetpack', 'thresh'],
    hasTombstones: true,
    tombstoneCount: 6,
    spawnMultiplier: 1.5,
    waves: 5
  },
  4: {
    level: 4,
    title: 'Level 4: Kỷ Băng Hà & Quận Chúa',
    subtitle: 'Thêm Jurassic Bully, Troglobite, Lãng Khách, Anivia & Quận Chúa',
    description: 'Jurassic Bully càn quét, Troglobite đẩy tảng băng, Lãng Khách lướt kiếm, Anivia bay trên không và Quận Chúa thu hồn gọi quân!',
    zombiePool: ['basic', 'conehead', 'buckethead', 'balloon', 'jetpack', 'thresh', 'lang_khach', 'jurassic_bully', 'troglobite', 'yeti_imp', 'anivia', 'quan_chua'],
    hasTombstones: true,
    tombstoneCount: 7,
    spawnMultiplier: 2.0,
    waves: 5
  },
  5: {
    level: 5,
    title: 'Level 5: ĐẠI CHIẾN BOSS GARGANTUAR',
    subtitle: 'Hội Tụ Binh Đoàn & BOSS Khổng Lồ Gargantuar',
    description: 'Tất cả các binh chủng zombie tinh nhuệ tràn vào cùng trùm Khổng Lồ Gargantuar đập nát vườn cây!',
    zombiePool: ['basic', 'imp', 'conehead', 'pole_vaulting', 'buckethead', 'balloon', 'jetpack', 'thresh', 'lang_khach', 'jurassic_bully', 'turquoise_skull', 'troglobite', 'yeti_imp', 'shen', 'anivia', 'quan_chua', 'gargantuar'],
    hasTombstones: true,
    tombstoneCount: 8,
    spawnMultiplier: 2.5,
    isBossLevel: true,
    waves: 5
  },
  6: {
    level: 6,
    title: 'Level 6: ĐẠI CHIẾN ZOMBOT DARK DRAGON',
    subtitle: 'TRÙM RỒNG HẮC ÁM 27.000 HP (BĂNG CHUYỀN CONVEYOR)',
    description: 'Trùm Rồng phun lửa thiêu rụi 2 hàng, nhổ cầu lửa nở Imp Dragon và tiếng gầm triệu hồi tất cả binh chủng!',
    zombiePool: ['basic', 'imp', 'conehead', 'buckethead', 'pole_vaulting', 'balloon', 'jetpack', 'thresh', 'lang_khach', 'jurassic_bully', 'turquoise_skull', 'troglobite', 'yeti_imp', 'shen', 'anivia', 'quan_chua', 'gargantuar', 'imp_dragon'],
    hasTombstones: true,
    tombstoneCount: 6,
    spawnMultiplier: 2.0,
    isBossLevel: true,
    isConveyor: true,
    gameMode: 'conveyor',
    bossType: 'zombot_dark_dragon',
    waves: 1 // Trận đấu trùm duy nhất với thanh máu HP 27.000
  },
  7: {
    level: 7,
    title: 'Level 7: Bầu Trời Hỗn Loạn',
    subtitle: 'Bóng Bay, Jetpack, Anivia & Thresh Áp Sát',
    description: 'Không quân Bóng Bay, Jetpack tăng tốc và Phượng Hoàng Anivia phối hợp cùng Thresh ném xích phá vỡ tuyến giữa!',
    zombiePool: ['imp', 'basic', 'conehead', 'buckethead', 'balloon', 'jetpack', 'thresh', 'turquoise_skull', 'lang_khach', 'jurassic_bully', 'shen', 'quan_chua', 'anivia', 'gargantuar'],
    hasTombstones: true,
    tombstoneCount: 8,
    spawnMultiplier: 2.6,
    waves: 5
  },
  8: {
    level: 8,
    title: 'Level 8: Kỷ Băng Hà & Kiếm Hồn',
    subtitle: 'Troglobite, Shen, Lãng Khách & Quận Chúa',
    description: 'Binh đoàn Băng Giá đẩy tảng băng kết hợp Lãng Khách lướt kiếm, Shen buff giáp và Quận Chúa thu hồn gọi quân!',
    zombiePool: ['imp', 'conehead', 'buckethead', 'balloon', 'jetpack', 'thresh', 'turquoise_skull', 'troglobite', 'yeti_imp', 'lang_khach', 'jurassic_bully', 'shen', 'anivia', 'quan_chua', 'gargantuar'],
    hasTombstones: true,
    tombstoneCount: 9,
    spawnMultiplier: 2.8,
    waves: 5
  },
  9: {
    level: 9,
    title: 'Level 9: Binh Đoàn Tinh Nhuệ',
    subtitle: 'Liên Hoàn Thresh, Quận Chúa & Song Hùng Gargantuar',
    description: 'Toàn bộ binh chủng tinh nhuệ tràn lên với nhịp độ dồn dập cùng cặp Gargantuar hộ tống Quận Chúa!',
    zombiePool: ['imp', 'conehead', 'buckethead', 'pole_vaulting', 'balloon', 'jetpack', 'thresh', 'turquoise_skull', 'troglobite', 'lang_khach', 'jurassic_bully', 'shen', 'anivia', 'quan_chua', 'gargantuar'],
    hasTombstones: true,
    tombstoneCount: 9,
    spawnMultiplier: 3.1,
    waves: 5
  },
  10: {
    level: 10,
    title: 'Level 10: Đêm Tận Thế Hắc Ám',
    subtitle: 'Thử Thách Cực Đại 5 Đợt (Không Zomboss)',
    description: 'Đỉnh cao chiến thuật khu vườn: 5 đợt tổng lực với quân số dày đặc, Thresh, Quận Chúa, Anivia, Shen và bộ ba Gargantuar!',
    zombiePool: ['imp', 'conehead', 'buckethead', 'pole_vaulting', 'balloon', 'jetpack', 'thresh', 'turquoise_skull', 'troglobite', 'lang_khach', 'jurassic_bully', 'shen', 'anivia', 'quan_chua', 'gargantuar'],
    hasTombstones: true,
    tombstoneCount: 10,
    spawnMultiplier: 3.5,
    waves: 5
  },
  11: {
    level: 11,
    title: 'Map Special: Vương Quốc Long Tộc',
    subtitle: 'Plants vs Dragons · Độc Quyền 6 Loài Rồng',
    description: 'Chiến trường đặc biệt không có zombie thường & bia mộ: đối đầu Rồng Mới Nở, Rồng Trưởng Thành, Rồng Hắc Ám, Rồng Hóa Kỹ, Rồng Gió tăng tốc và Rồng Nước 10 mạng!',
    zombiePool: ['dragon_hatchling', 'dragon_adult', 'dragon_wind', 'dragon_water', 'dragon_dark', 'dragon_chemtech'],
    hasTombstones: false,
    tombstoneCount: 0,
    spawnMultiplier: 2.5,
    isSpecial: true,
    waves: 5
  },
  12: {
    level: 12,
    title: 'Level 12: BOSS RỒNG NGÀN TUỔI',
    subtitle: 'Long Vương Cổ Đại 10.000 HP · 7 Tuyệt Kỹ Hủy Diệt (0 Sun)',
    description: 'Hạ gục Boss Rồng Ngàn Tuổi và tiêu diệt toàn bộ binh đoàn Zombie & Long Tộc! Trồng cây không tốn Sun nhưng vẫn phải chờ hồi chiêu.',
    zombiePool: ['basic', 'imp', 'conehead', 'buckethead', 'pole_vaulting', 'balloon', 'jetpack', 'thresh', 'lang_khach', 'jurassic_bully', 'turquoise_skull', 'troglobite', 'yeti_imp', 'shen', 'anivia', 'quan_chua', 'gargantuar', 'imp_dragon', 'dragon_hatchling', 'dragon_adult', 'dragon_wind', 'dragon_water', 'dragon_dark', 'dragon_chemtech'],
    hasTombstones: false,
    tombstoneCount: 0,
    spawnMultiplier: 2.5,
    isBossLevel: true,
    isSpecial: true,
    freeSunCost: true,
    bossType: 'ancient_dragon_boss',
    waves: 1
  },
  13: {
    level: 13,
    title: 'Level 13: HOÀNG ĐẾ SA MẠC AZIR',
    subtitle: 'Boss Azir 20.000 HP · 0 Sun · Zombie ra chậm +10s',
    description: 'Chiến trường Sa Mạc Shurima! Trồng cây không tốn Sun (vẫn chờ hồi chiêu) và có thêm 10s chuẩn bị trước khi Azir xuất trận!',
    theme: 'desert',
    zombiePool: ['basic', 'imp', 'conehead', 'buckethead', 'pole_vaulting', 'turquoise_skull', 'lang_khach', 'shen', 'quan_chua', 'gargantuar', 'sand_soldier', 'sand_coffin', 'renekton_croc', 'nasus_hound'],
    hasTombstones: false,
    tombstoneCount: 0,
    spawnMultiplier: 2.6,
    isBossLevel: true,
    isSpecial: true,
    freeSunCost: true,
    bossType: 'azir_desert_emperor',
    waves: 1
  },
  14: {
    level: 14,
    title: 'Level 14: Tiền Đồn Thiết Huyết Nosus',
    subtitle: 'Chiến Trường Nosus · Màn 1/3',
    description: 'Bước vào pháo đài Chiến Trường Nosus! Đẩy lùi Binh Sĩ Nosus, Sát Thủ Huyết Đao và Vệ Binh Khiên Sắt 1050 HP.',
    theme: 'nosus',
    worldName: 'Chiến Trường Nosus',
    zombiePool: ['nosus_thrall', 'nosus_assassin', 'nosus_shieldbearer'],
    hasTombstones: false,
    tombstoneCount: 0,
    spawnMultiplier: 2.4,
    waves: 5
  },
  15: {
    level: 15,
    title: 'Level 15: Huyết Tế Pháo Đài Nosus',
    subtitle: 'Chiến Trường Nosus · Màn 2/3',
    description: 'Huyết Pháp Sư Nosus tham chiến! Bắn cầu huyết từ tầm 2.5 ô và thi triển Huyết Tế hồi máu + tăng tốc đồng minh.',
    theme: 'nosus',
    worldName: 'Chiến Trường Nosus',
    zombiePool: ['nosus_thrall', 'nosus_assassin', 'nosus_shieldbearer', 'nosus_hemomancer'],
    hasTombstones: false,
    tombstoneCount: 0,
    spawnMultiplier: 2.7,
    waves: 5
  },
  16: {
    level: 16,
    title: 'Level 16: Đại Tướng Darius Nosus',
    subtitle: 'Chiến Trường Nosus · Màn 3/3 (Toàn Quân)',
    description: 'Trận quyết chiến pháo đài Nosus! Đối đầu toàn bộ 5 binh chủng Nosus cùng Darius 3200 HP miễn làm chậm/thôi miên/đẩy lùi, Máy Chém Xoay 3×3 và Huyết Nộ bất tử 2s!',
    theme: 'nosus',
    worldName: 'Chiến Trường Nosus',
    zombiePool: ['nosus_thrall', 'nosus_assassin', 'nosus_shieldbearer', 'nosus_hemomancer', 'nosus_warlord'],
    hasTombstones: false,
    tombstoneCount: 0,
    spawnMultiplier: 3.0,
    isBossLevel: true,
    waves: 5
  }
};

// Cấu hình Wave mặc định
const WAVE_CONFIG = {
  INITIAL_DELAY: 20.0, // Đầu game delay 20s trước khi zombie xuất hiện theo yêu cầu
  REST_DELAY: 15.0,    // Phải diệt sạch 100% zombie của 1 wave, sau đó nghỉ 15s mới tới wave tiếp theo
  TOTAL_WAVES: 5       // 5 wave mỗi màn
};

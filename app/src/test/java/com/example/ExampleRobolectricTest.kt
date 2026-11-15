package com.example

import org.junit.Assert.assertTrue
import org.junit.Test
import java.io.File

class ExampleRobolectricTest {

  @Test
  fun `verify app configuration and web assets`() {
    val assetsHtml = File("src/main/assets/www/index.html")
    assertTrue("Asset HTML file must exist for WebView", assetsHtml.exists())
    val htmlContent = assetsHtml.readText()
    assertTrue("index.html must contain speed-btn", htmlContent.contains("speed-btn"))
  }

  @Test
  fun `verify core javascript modules and speed 2x default`() {
    val jsDir = File("src/main/assets/www/js")
    assertTrue("JS directory must exist", jsDir.exists() && jsDir.isDirectory)
    
    val requiredFiles = listOf("config.js", "entities.js", "systems.js", "renderer.js", "game.js")
    for (file in requiredFiles) {
      val f = File(jsDir, file)
      assertTrue("File $file must exist", f.exists())
    }

    val configFile = File(jsDir, "config.js")
    val configContent = configFile.readText()
    assertTrue("config.js must set default GAME_SPEED to 2.0", configContent.contains("GAME_SPEED: 2.0"))

    val gameFile = File(jsDir, "game.js")
    val gameContent = gameFile.readText()
    assertTrue("game.js must have setSpeed method", gameContent.contains("setSpeed(speed)"))
    assertTrue("game.js must initialize speed to 2", gameContent.contains("this.setSpeed(2)"))
    assertTrue("game.js must compute gameDeltaTime from gameSpeed", gameContent.contains("gameDeltaTime = isGameplayRunning ? (rawDeltaTime * this.gameSpeed) : 0"))

    val entitiesFile = File(jsDir, "entities.js")
    val entitiesContent = entitiesFile.readText()
    assertTrue("Plant must track animTime", entitiesContent.contains("this.animTime += dt"))
    assertTrue("Zombie must track animTime", entitiesContent.contains("this.animTime += dt"))
    assertTrue("Sun must track rotTimer", entitiesContent.contains("this.rotTimer += dt"))
  }

  @Test
  fun `verify css styles contain speed-btn rules`() {
    val cssFile = File("src/main/assets/www/css/style.css")
    assertTrue("style.css must exist", cssFile.exists())
    val cssContent = cssFile.readText()
    assertTrue("style.css must contain speed-btn styling", cssContent.contains(".speed-btn"))
    assertTrue("style.css must contain speed-2x styling", cssContent.contains(".speed-2x"))
  }

  @Test
  fun `verify part 3 five new plants configuration and cards`() {
    val jsDir = File("src/main/assets/www/js")
    val configFile = File(jsDir, "config.js")
    val configContent = configFile.readText()

    // 1. Lightning Reed: 125 Sun, 300 HP, 10 direct, 10 chain
    assertTrue("config.js must contain lightning_reed", configContent.contains("lightning_reed:"))
    assertTrue("lightning_reed cost 125", configContent.contains("cost: 125"))
    assertTrue("lightning_reed directDamage 10", configContent.contains("directDamage: 10"))
    assertTrue("lightning_reed chainDamage 10", configContent.contains("chainDamage: 10"))

    // 2. Stunion: 25 Sun, 300 HP, 5.0s stun (planted tile + 2 front tiles)
    assertTrue("config.js must contain stunion", configContent.contains("stunion:"))
    assertTrue("stunion stunDuration 5.0", configContent.contains("stunDuration: 5.0"))

    // 3. Infi-nut: 75 Sun, 2000 HP, 15s regen delay, 160 regen rate
    assertTrue("config.js must contain infi_nut", configContent.contains("infi_nut:"))
    assertTrue("infi_nut hp 2000", configContent.contains("hp: 2000"))
    assertTrue("infi_nut regenRate 160", configContent.contains("regenRate: 160.0"))

    // 4. Sun Shroom: 25 Sun, 300 HP, stages 25, 50, 75
    assertTrue("config.js must contain sun_shroom", configContent.contains("sun_shroom:"))
    assertTrue("sun_shroom stage1Sun 25", configContent.contains("stage1Sun: 25"))
    assertTrue("sun_shroom stage2Sun 50", configContent.contains("stage2Sun: 50"))
    assertTrue("sun_shroom stage3Sun 75", configContent.contains("stage3Sun: 75"))

    // 5. Goo Peashooter: 125 Sun, 300 HP, 30 base, 15 poison/s, 3 stacks, no slow
    assertTrue("config.js must contain goo_peashooter", configContent.contains("goo_peashooter:"))
    assertTrue("goo_peashooter baseDamage 30", configContent.contains("baseDamage: 30"))
    assertTrue("goo_peashooter poisonDmgPerSec 15.0", configContent.contains("poisonDmgPerSec: 15.0"))
    assertTrue("goo_peashooter maxPoisonStacks 3", configContent.contains("maxPoisonStacks: 3"))
    assertTrue("goo_peashooter slowFactor 1.0", configContent.contains("slowFactor: 1.0"))

    // Verify all 5 cards exist in index.html
    val assetsHtml = File("src/main/assets/www/index.html")
    val htmlContent = assetsHtml.readText()
    assertTrue("index.html must have card-lightning-reed", htmlContent.contains("card-lightning-reed"))
    assertTrue("index.html must have card-stunion", htmlContent.contains("card-stunion"))
    assertTrue("index.html must have card-infi-nut", htmlContent.contains("card-infi-nut"))
    assertTrue("index.html must have card-sun-shroom", htmlContent.contains("card-sun-shroom"))
    assertTrue("index.html must have card-goo-peashooter", htmlContent.contains("card-goo-peashooter"))

    // Verify entities implementation
    val entitiesFile = File(jsDir, "entities.js")
    val entitiesContent = entitiesFile.readText()
    assertTrue("entities.js must implement attackLightning", entitiesContent.contains("attackLightning"))
    assertTrue("entities.js must implement applyStun", entitiesContent.contains("applyStun"))
    assertTrue("entities.js must implement applyPoison", entitiesContent.contains("applyPoison"))
    assertTrue("entities.js must implement applySlow", entitiesContent.contains("applySlow"))
    assertTrue("entities.js must implement HolographicBarrier", entitiesContent.contains("class HolographicBarrier"))
  }

  @Test
  fun `verify part 4 gargantuar and imp configuration and mechanics`() {
    val jsDir = File("src/main/assets/www/js")
    val configFile = File(jsDir, "config.js")
    val configContent = configFile.readText()

    // 1. Gargantuar (Khổng Lồ): HP 3600, speed 0.24 cells/s, damage 1500, impThrowThreshold 1800
    assertTrue("config.js must contain gargantuar", configContent.contains("gargantuar:"))
    assertTrue("gargantuar hp 3600", configContent.contains("hp: 3600"))
    assertTrue("gargantuar speed 0.24 cells/s", configContent.contains("speedCellsPerSec: 0.24"))
    assertTrue("gargantuar damage 1500", configContent.contains("damage: 1500"))
    assertTrue("gargantuar impThrowThreshold 1800", configContent.contains("impThrowThreshold: 1800"))
    assertTrue("gargantuar impThrowCells 3", configContent.contains("impThrowCells: 3"))

    // 2. Imp (Quỷ Lùn): HP 100 (50% of 200), speed 0.70 (2x of 0.35), damage 20, attackInterval 0.5
    assertTrue("config.js must contain imp", configContent.contains("imp:"))
    assertTrue("imp hp 100 (50% regular)", configContent.contains("hp: 100"))
    assertTrue("imp speed 0.70 (2x regular)", configContent.contains("speed: 0.70"))
    assertTrue("imp damage 20", configContent.contains("damage: 20"))
    assertTrue("imp attackInterval 0.5", configContent.contains("attackInterval: 0.5"))

    // 3. Regular zombie unchanged
    assertTrue("config.js must contain regular zombie", configContent.contains("regular:"))
    assertTrue("regular zombie hp 200", configContent.contains("hp: 200"))
    assertTrue("regular zombie speed 0.35", configContent.contains("speed: 0.35"))

    // 4. Entities implementation for Gargantuar and Imp
    val entitiesFile = File(jsDir, "entities.js")
    val entitiesContent = entitiesFile.readText()
    assertTrue("entities.js must track hasThrownImp", entitiesContent.contains("hasThrownImp"))
    assertTrue("entities.js must track isSmashing", entitiesContent.contains("isSmashing"))
    assertTrue("entities.js must track hasStruckThisCycle", entitiesContent.contains("hasStruckThisCycle"))
    assertTrue("entities.js must check 50% HP threshold for Imp throw", entitiesContent.contains("this.hp < this.maxHp * 0.5"))
    assertTrue("entities.js must clamp throw landing to valid lawn boundary", entitiesContent.contains("clampedTargetX"))
    assertTrue("entities.js must implement FlyingImp class", entitiesContent.contains("class FlyingImp"))
    assertTrue("FlyingImp must compute parabolic arc", entitiesContent.contains("4 * this.arcHeight * t * (1 - t)"))

    // 5. Game and renderer implementation
    val gameFile = File(jsDir, "game.js")
    val gameContent = gameFile.readText()
    assertTrue("game.js must track flyingImps array", gameContent.contains("this.flyingImps = []"))
    assertTrue("game.js must implement spawnFlyingImp", gameContent.contains("spawnFlyingImp"))
    assertTrue("game.js must implement spawnLandedImp", gameContent.contains("spawnLandedImp"))

    val rendererFile = File(jsDir, "renderer.js")
    val rendererContent = rendererFile.readText()
    assertTrue("renderer.js must have drawGargantuar", rendererContent.contains("drawGargantuar"))
    assertTrue("renderer.js must have drawImp", rendererContent.contains("drawImp"))
    assertTrue("renderer.js must have drawFlyingImps", rendererContent.contains("drawFlyingImps"))
    assertTrue("renderer.js must have drawRegularZombie", rendererContent.contains("drawRegularZombie"))
  }

  @Test
  fun `verify sandbox panel and debug shortcuts`() {
    val htmlFile = File("src/main/assets/www/index.html")
    val html = htmlFile.readText()
    assertTrue("index.html must have sandbox-btn", html.contains("id=\"sandbox-btn\""))
    assertTrue("index.html must have sandbox-panel", html.contains("id=\"sandbox-panel\""))
    assertTrue("index.html must have sb-add-100-sun", html.contains("id=\"sb-add-100-sun\""))
    assertTrue("index.html must have sb-spawn-bully", html.contains("id=\"sb-spawn-bully\""))
    assertTrue("index.html must have sb-spawn-skull", html.contains("id=\"sb-spawn-skull\""))
    assertTrue("index.html must have sb-clear-zombies", html.contains("id=\"sb-clear-zombies\""))

    val jsDir = File("src/main/assets/www/js")
    val systemsContent = File(jsDir, "systems.js").readText()
    assertTrue("systems.js must have initSandboxEvents", systemsContent.contains("initSandboxEvents"))
    assertTrue("systems.js key S must add 100 sun", systemsContent.contains("addSun(100)"))
    assertTrue("systems.js key J must spawn jurassic_bully", systemsContent.contains("'jurassic_bully'"))
    assertTrue("systems.js key T must spawn turquoise_skull", systemsContent.contains("'turquoise_skull'"))

    val gameContent = File(jsDir, "game.js").readText()
    assertTrue("game.js must have clearAllZombies method", gameContent.contains("clearAllZombies()"))
    assertTrue("game.js must have resetCooldowns method", gameContent.contains("resetCooldowns()"))
  }

  @Test
  fun `verify part 5 jurassic bully and turquoise skull zombies`() {
    val jsDir = File("src/main/assets/www/js")
    val configContent = File(jsDir, "config.js").readText()

    // 1. Jurassic Bully configuration
    assertTrue("config.js must contain jurassic_bully", configContent.contains("jurassic_bully:"))
    assertTrue("jurassic_bully max HP 1100", configContent.contains("hp: 1100"))
    assertTrue("jurassic_bully speed 0.16 cells/s", configContent.contains("speedCellsPerSec: 0.16"))
    assertTrue("jurassic_bully bite damage 100 HP/s", configContent.contains("damagePerSec: 100"))
    assertTrue("jurassic_bully knockback immunity", configContent.contains("knockbackImmune: true"))

    // 2. Turquoise Skull Zombie configuration
    assertTrue("config.js must contain turquoise_skull", configContent.contains("turquoise_skull:"))
    assertTrue("turquoise_skull max HP 250", configContent.contains("hp: 250"))
    assertTrue("turquoise_skull speed 0.185 cells/s", configContent.contains("speedCellsPerSec: 0.185"))
    assertTrue("turquoise_skull laser damage 4000", configContent.contains("laserDamage: 4000"))
    assertTrue("turquoise_skull laser charge duration 5.0s", configContent.contains("laserChargeDuration: 5.0"))
    assertTrue("turquoise_skull laser range 4 cells", configContent.contains("laserRangeCells: 4"))

    // 3. Entities implementation
    val entitiesContent = File(jsDir, "entities.js").readText()
    assertTrue("entities.js must have applyKnockback method", entitiesContent.contains("applyKnockback"))
    assertTrue("applyKnockback must respect knockbackImmune", entitiesContent.contains("if (this.knockbackImmune || !this.alive) return;"))
    assertTrue("entities.js must track isChargingLaser", entitiesContent.contains("isChargingLaser"))
    assertTrue("entities.js must track laserTimer", entitiesContent.contains("laserTimer"))
    assertTrue("entities.js must enforce 4-cell laser range", entitiesContent.contains("CONFIG.CELL_WIDTH * 4"))
    assertTrue("entities.js must deal 4000 laser damage", entitiesContent.contains("takeDamage(this.laserDamage)"))

    // 4. Renderer implementation
    val rendererContent = File(jsDir, "renderer.js").readText()
    assertTrue("renderer.js must have drawJurassicBully", rendererContent.contains("drawJurassicBully"))
    assertTrue("renderer.js must have drawTurquoiseSkull", rendererContent.contains("drawTurquoiseSkull"))
    assertTrue("renderer.js must have drawLaserBeams", rendererContent.contains("drawLaserBeams"))
  }

  @Test
  fun `verify lawn entry targeting, troglobite chomper rule, zomboss stun immunity, and stunion balance`() {
    val jsDir = File("src/main/assets/www/js")
    val configContent = File(jsDir, "config.js").readText()
    val entitiesContent = File(jsDir, "entities.js").readText()

    assertTrue("config.js must set stunion gasRangeCols to 2", configContent.contains("gasRangeCols: 2"))
    assertTrue("config.js must configure zombot_dark_dragon stunImmune", configContent.contains("stunImmune: true"))
    assertTrue("config.js must configure zombot_dark_dragon slowActionDelay", configContent.contains("slowActionDelay: 1.5"))
    assertTrue("entities.js must enforce isZombieOnLawn", entitiesContent.contains("function isZombieOnLawn(z)"))
    assertTrue("entities.js must treat troglobite as unswallowable", entitiesContent.contains("'troglobite'"))
    assertTrue("entities.js must handle Zomboss actionDelayTimer", entitiesContent.contains("this.actionDelayTimer > 0"))
  }

  @Test
  fun `verify shen mat hoang hon configuration, skills, and renderer`() {
    val jsDir = File("src/main/assets/www/js")
    val configContent = File(jsDir, "config.js").readText()
    val entitiesContent = File(jsDir, "entities.js").readText()
    val rendererContent = File(jsDir, "renderer.js").readText()
    val htmlContent = File("src/main/assets/www/index.html").readText()

    assertTrue("config.js must configure shen", configContent.contains("shen:"))
    assertTrue("shen must have 1800 hp", configContent.contains("hp: 1800"))
    assertTrue("shen must have 1.9 attackInterval", configContent.contains("attackInterval: 1.9"))
    assertTrue("shen must have 114 bite damage", configContent.contains("damage: 114"))
    assertTrue("shen must have 350 spiritShieldAmount", configContent.contains("spiritShieldAmount: 350"))
    assertTrue("shen must have 7.0 skill1Cooldown", configContent.contains("skill1Cooldown: 7.0"))
    assertTrue("shen must have 3 defensiveKillBites", configContent.contains("defensiveKillBites: 3"))

    assertTrue("entities.js must track spiritShieldHp", entitiesContent.contains("this.spiritShieldHp"))
    assertTrue("entities.js must exclude gargantuar from Shen Skill 1", entitiesContent.contains("z.type !== 'gargantuar'"))
    assertTrue("entities.js must exclude zombot_dark_dragon from Shen Skill 1", entitiesContent.contains("z.type !== 'zombot_dark_dragon'"))
    assertTrue("entities.js must implement Shen 3-bite defensive kill", entitiesContent.contains("this.defensiveBiteCount >= killBites"))

    assertTrue("renderer.js must have drawShenMatHoangHon", rendererContent.contains("drawShenMatHoangHon"))
    assertTrue("renderer.js must have drawSpiritShieldOverlay", rendererContent.contains("drawSpiritShieldOverlay"))
    assertTrue("index.html must have sb-spawn-shen", htmlContent.contains("sb-spawn-shen"))
  }

  @Test
  fun `verify lang_khach post-dash eat lock and 60 dmg per 0_5s basic attack`() {
    val jsDir = File("src/main/assets/www/js")
    val configContent = File(jsDir, "config.js").readText()
    val entitiesContent = File(jsDir, "entities.js").readText()

    assertTrue("lang_khach must deal 60 basic attack damage", configContent.contains("damage: 60"))
    assertTrue("lang_khach must attack every 0.5s", configContent.contains("attackInterval: 0.5"))
    assertTrue("entities.js must track mustEatPlantToDash", entitiesContent.contains("this.mustEatPlantToDash"))
    assertTrue("entities.js must gate dash behind !this.mustEatPlantToDash", entitiesContent.contains("!this.mustEatPlantToDash"))
  }

  @Test
  fun `verify blover and spikeweed configuration and mechanics`() {
    val jsDir = File("src/main/assets/www/js")
    val configContent = File(jsDir, "config.js").readText()
    val entitiesContent = File(jsDir, "entities.js").readText()
    val rendererContent = File(jsDir, "renderer.js").readText()
    val htmlContent = File("src/main/assets/www/index.html").readText()

    assertTrue("config.js must configure blover", configContent.contains("blover:"))
    assertTrue("blover cooldown must be 10.0", configContent.contains("cooldown: 10.0"))
    assertTrue("config.js must configure spikeweed", configContent.contains("spikeweed:"))
    assertTrue("spikeweed cost must be 100", configContent.contains("cost: 100"))
    assertTrue("spikeweed cooldown must be 5.0", configContent.contains("cooldown: 5.0"))
    assertTrue("spikeweed damage must be 15", configContent.contains("damage: 15"))
    assertTrue("spikeweed must be isGroundPlant", configContent.contains("isGroundPlant: true"))

    assertTrue("entities.js must implement blover instant blow-away", entitiesContent.contains("this.type === 'blover'"))
    assertTrue("entities.js must implement spikeweed damage tick", entitiesContent.contains("this.type === 'spikeweed'"))
    assertTrue("entities.js must skip eating ground plants except gargantuar", entitiesContent.contains("if (p.isGroundPlant && this.type !== 'gargantuar') return false;"))

    assertTrue("renderer.js must draw blover", rendererContent.contains("drawBloverGraphics"))
    assertTrue("renderer.js must draw spikeweed", rendererContent.contains("drawSpikeweedGraphics"))
    assertTrue("index.html must have card-blover", htmlContent.contains("card-blover"))
    assertTrue("index.html must have card-spikeweed", htmlContent.contains("card-spikeweed"))
  }

  @Test
  fun `verify boss maps 12 and 13 free sun with cooldown and map 13 10s zombie delay`() {
    val jsDir = File("src/main/assets/www/js")
    val configContent = File(jsDir, "config.js").readText()
    val gameContent = File(jsDir, "game.js").readText()
    val systemsContent = File(jsDir, "systems.js").readText()

    assertTrue("config.js must configure freeSunCost for boss levels", configContent.contains("freeSunCost: true"))
    assertTrue("game.js must implement isFreePlantSunLevel", gameContent.contains("isFreePlantSunLevel()"))
    assertTrue("game.js must skip sun cost on free-sun boss levels", gameContent.contains("if (!isFreeSun) {"))
    assertTrue("systems.js must delay level 13 initial spawn to 18.0s", systemsContent.contains("level === 13\n      ? 18.0"))
  }

  @Test
  fun `verify lang_khach 2-dash tornado buff and syndra plant assets and config`() {
    val jsDir = File("src/main/assets/www/js")
    val configContent = File(jsDir, "config.js").readText()
    val entitiesContent = File(jsDir, "entities.js").readText()
    val rendererContent = File(jsDir, "renderer.js").readText()
    val gameContent = File(jsDir, "game.js").readText()
    val indexHtml = File("src/main/assets/www/index.html").readText()

    // Lang Khach buff: 2 dashes -> tornado
    assertTrue("config.js must set lang_khach tornadoThreshold to 2", configContent.contains("tornadoThreshold: 2"))
    assertTrue("entities.js must fallback lang_khach tornadoThreshold to 2", entitiesContent.contains("proto.tornadoThreshold || 2"))

    // Syndra config & mechanics
    assertTrue("config.js must define syndra", configContent.contains("syndra: {"))
    assertTrue("config.js must set syndra cost 250", configContent.contains("cost: 250"))
    assertTrue("config.js must set syndra cooldown 12.0", configContent.contains("cooldown: 12.0"))
    assertTrue("config.js must set syndra hp 200", configContent.contains("hp: 200"))
    assertTrue("config.js must set syndra orbDamage 100", configContent.contains("orbDamage: 100"))
    assertTrue("config.js must set syndra empoweredOrbDamage 600", configContent.contains("empoweredOrbDamage: 600"))

    assertTrue("entities.js must implement onSyndraOrbKill", entitiesContent.contains("onSyndraOrbKill(gameState)"))
    assertTrue("entities.js must implement findHighestAtkSyndraTarget", entitiesContent.contains("findHighestAtkSyndraTarget(candidates)"))
    assertTrue("entities.js must implement fireSyndraEmpoweredOrb", entitiesContent.contains("fireSyndraEmpoweredOrb(gameState"))
    assertTrue("renderer.js must implement drawSyndraGraphics", rendererContent.contains("drawSyndraGraphics(ctx, plant)"))
    assertTrue("game.js must register syndra in plantKeys", gameContent.contains("'syndra'"))
    assertTrue("index.html must include card-syndra", indexHtml.contains("id=\"card-syndra\""))

    val syndraCatalog = com.example.model.PvzCatalog.plantById["syndra"]
    assertTrue("PvzCatalog must contain syndra with 250 cost, 12.0s cooldown, 200 HP",
      syndraCatalog != null &&
        syndraCatalog.cost == 250 &&
        syndraCatalog.cooldownText == "12.0s" &&
        syndraCatalog.hpText == "200 HP"
    )
  }

  @Test
  fun `verify kata blade rose and aurora plant configs mechanics visuals and catalog`() {
    val jsDir = File("src/main/assets/www/js")
    val configContent = File(jsDir, "config.js").readText()
    val entitiesContent = File(jsDir, "entities.js").readText()
    val rendererContent = File(jsDir, "renderer.js").readText()
    val gameContent = File(jsDir, "game.js").readText()
    val indexHtml = File("src/main/assets/www/index.html").readText()

    assertTrue("config.js must define kata", configContent.contains("kata: {"))
    assertTrue("config.js must define aurora", configContent.contains("aurora: {"))
    assertTrue("entities.js must handle kata_dagger bounce", entitiesContent.contains("isKataDagger") && entitiesContent.contains("bounceOriginRow"))
    assertTrue("entities.js must handle kata_blade_storm spin", entitiesContent.contains("kata_blade_storm"))
    assertTrue("entities.js must handle aurora_rabbit pierce & knockback", entitiesContent.contains("isAuroraRabbit"))
    assertTrue("entities.js must implement triggerAuroraRealmSkill", entitiesContent.contains("triggerAuroraRealmSkill(gameState") && entitiesContent.contains("!isTwoRowBoss(z)"))
    assertTrue("config.js must nerf aurora atkSpeed to 2.0", configContent.contains("atkSpeed: 2.0"))
    assertTrue("renderer.js must implement drawKataGraphics", rendererContent.contains("drawKataGraphics(ctx, plant)"))
    assertTrue("renderer.js must implement drawAuroraGraphics", rendererContent.contains("drawAuroraGraphics(ctx, plant)"))
    assertTrue("game.js must register kata and aurora", gameContent.contains("'kata'") && gameContent.contains("'aurora'"))
    assertTrue("index.html must include card-kata and card-aurora", indexHtml.contains("id=\"card-kata\"") && indexHtml.contains("id=\"card-aurora\""))

    val kataCatalog = com.example.model.PvzCatalog.plantById["kata"]
    assertTrue("PvzCatalog must contain kata 100 cost, 9.0s cd, 450 HP",
      kataCatalog != null &&
        kataCatalog.cost == 100 &&
        kataCatalog.cooldownText == "9.0s" &&
        kataCatalog.hpText == "450 HP"
    )

    val auroraCatalog = com.example.model.PvzCatalog.plantById["aurora"]
    assertTrue("PvzCatalog must contain aurora 250 cost, 15.0s cd, 300 HP",
      auroraCatalog != null &&
        auroraCatalog.cost == 250 &&
        auroraCatalog.cooldownText == "15.0s" &&
        auroraCatalog.hpText == "300 HP"
    )
  }

  @Test
  fun `verify boss azir prioritizes rows with most plants for sand soldier summon`() {
    val jsDir = File("src/main/assets/www/js")
    val entitiesContent = File(jsDir, "entities.js").readText()
    val gameContent = File(jsDir, "game.js").readText()

    assertTrue("entities.js must count plants per row in summonAzirSkill1SoldierOrCoffin",
      entitiesContent.contains("summonAzirSkill1SoldierOrCoffin(gameState)") &&
        entitiesContent.contains("rowPlantCounts") &&
        entitiesContent.contains("maxRowPlantCount")
    )
    assertTrue("game.js must describe Azir prioritizing rows with the most plants",
      gameContent.contains("ưu tiên trồi dậy ở hàng có nhiều cây nhất")
    )
  }
}

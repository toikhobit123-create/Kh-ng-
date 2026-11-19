package com.example.model

import androidx.compose.ui.graphics.Color
import com.example.ui.theme.AmberGold
import com.example.ui.theme.CrimsonSoul
import com.example.ui.theme.IceCyan
import com.example.ui.theme.ToxicLime

sealed interface AppScreen {
  data object MainMenu : AppScreen
  data object WorldMap : AppScreen
  data class SeedSelection(val level: Int) : AppScreen
  data object SandboxSelection : AppScreen
  data object InGame : AppScreen
}

data class PlantCatalogItem(
  val id: String,
  val shortName: String,
  val fullName: String,
  val group: String,
  val cost: Int,
  val damageText: String,
  val rateText: String,
  val cooldownText: String,
  val hpText: String,
  val description: String,
  val accentColor: Color
)

data class ZombieCatalogItem(
  val id: String,
  val name: String,
  val avatarEmoji: String,
  val hpText: String,
  val speedText: String,
  val damageText: String,
  val description: String,
  val isBoss: Boolean = false
)

data class LevelInfo(
  val level: Int,
  val title: String,
  val subtitle: String,
  val description: String,
  val zombieIds: List<String>,
  val tacticalTip: String,
  val isBoss: Boolean = false,
  val isConveyor: Boolean = false,
  val isSpecial: Boolean = false
)

data class GameSettings(
  val masterVolume: Float = 0.75f,
  val bgmVolume: Float = 0.45f,
  val sfxVolume: Float = 0.85f,
  val isMuted: Boolean = false,
  val defaultSpeed: Int = 2,
  val hudOnRight: Boolean = false,
  val confirmShovel: Boolean = false,
  val respectCutoutInsets: Boolean = true
)

data class CampaignProgress(
  val unlockedLevel: Int = 20,
  val completedLevels: Set<Int> = emptySet(),
  val selectedDeck: List<String> = DEFAULT_DECK,
  val sandboxPlants: List<String> = DEFAULT_SANDBOX_PLANTS,
  val sandboxZombies: List<String> = DEFAULT_SANDBOX_ZOMBIES
) {
  companion object {
    val DEFAULT_DECK = listOf(
      "sunflower",
      "peashooter",
      "snow_pea",
      "wall_nut",
      "cabbage_pult",
      "repeater",
      "cherry_bomb"
    )

    val DEFAULT_SANDBOX_PLANTS = listOf(
      "sunflower",
      "peashooter",
      "snow_pea",
      "wall_nut",
      "repeater",
      "cherry_bomb",
      "blover",
      "jhinplant"
    )

    val DEFAULT_SANDBOX_ZOMBIES = listOf(
      "basic",
      "conehead",
      "buckethead",
      "gargantuar",
      "dragon_hatchling",
      "dragon_dark",
      "dragon_wind",
      "dragon_water"
    )
  }
}

data class HudSnapshot(
  val sun: Int = 50,
  val plantFood: Int = 3,
  val isPlantFoodActive: Boolean = false,
  val isShovelActive: Boolean = false,
  val selectedPlantType: String = "",
  val gameSpeed: Int = 2,
  val isPaused: Boolean = false,
  val isSandbox: Boolean = false,
  val sandboxNoCooldown: Boolean = false,
  val isFreePlantSun: Boolean = false,
  val gameMode: String = "normal",
  val currentLevel: Int = 1,
  val waveProgress: Float = 0f,
  val currentWave: Int = 1,
  val totalWaves: Int = 5,
  val waveStatusTitle: String = "",
  val waveStatusSub: String = "",
  val isBossLevel: Boolean = false,
  val bossHp: Int = 27000,
  val bossMaxHp: Int = 27000,
  val selectedDeck: List<String> = CampaignProgress.DEFAULT_DECK,
  val sandboxPlants: List<String> = CampaignProgress.DEFAULT_SANDBOX_PLANTS,
  val sandboxZombies: List<String> = CampaignProgress.DEFAULT_SANDBOX_ZOMBIES,
  val cooldowns: Map<String, Float> = emptyMap(),
  val isBloodharborMode: Boolean = false,
  val isSetupPhase: Boolean = false,
  val bloodharborPhase: Int = 1,
  val maxPlantsOnBoard: Int = 12,
  val plantCountOnBoard: Int = 0,
  val yourCutTimer: Float = 20f,
  val recalledPlantHps: Map<String, Int> = emptyMap(),
  val exhaustedSingleUse: Set<String> = emptySet(),
  val pykeStuckTimer: Float = 0f,
  val pykeVulnerableTimer: Float = 0f,
  val pykeGreyHealth: Int = 0,
  val pykeMaxGreyHealth: Int = 800
)

data class MatchResult(
  val victory: Boolean,
  val level: Int
)

data class ShovelConfirmRequest(
  val plantType: String,
  val row: Int,
  val col: Int
)

data class PvzUiState(
  val currentScreen: AppScreen = AppScreen.MainMenu,
  val engineReady: Boolean = false,
  val progress: CampaignProgress = CampaignProgress(),
  val settings: GameSettings = GameSettings(),
  val hud: HudSnapshot = HudSnapshot(),
  val showAlmanac: Boolean = false,
  val showSettings: Boolean = false,
  val showSandboxDrawer: Boolean = false,
  val matchResult: MatchResult? = null,
  val pendingShovelConfirm: ShovelConfirmRequest? = null
)

object PvzCatalog {
  val plants: List<PlantCatalogItem> = listOf(
    PlantCatalogItem(
      id = "sunflower",
      shortName = "Hướng Dương",
      fullName = "Hướng Dương (Sunflower)",
      group = "Kinh Tế",
      cost = 50,
      damageText = "0 (Không bắn)",
      rateText = "25 Sun / 24s",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Cung cấp 25 Mặt Trời mỗi 24 giây. Nền tảng kinh tế tối quan trọng để xây dựng phòng tuyến.",
      accentColor = AmberGold
    ),
    PlantCatalogItem(
      id = "peashooter",
      shortName = "Đậu Quỷ",
      fullName = "Đậu Quỷ (Peashooter)",
      group = "Bắn Thẳng",
      cost = 100,
      damageText = "20 DMG",
      rateText = "1.425s / phát",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Bắn hạt đậu cơ bản gây 20 sát thương mỗi 1.425s. Chiến binh tuyến đầu tiêu chuẩn.",
      accentColor = ToxicLime
    ),
    PlantCatalogItem(
      id = "snow_pea",
      shortName = "Đậu Băng",
      fullName = "Đậu Băng (Snow Pea)",
      group = "Làm Chậm",
      cost = 175,
      damageText = "20 DMG + Băng",
      rateText = "1.425s / phát",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Bắn đậu băng gây 20 sát thương và làm chậm 50% tốc độ di chuyển và cắn của Zombie trong 10s.",
      accentColor = IceCyan
    ),
    PlantCatalogItem(
      id = "repeater",
      shortName = "Đậu Đôi",
      fullName = "Đậu Nòng Đôi (Repeater)",
      group = "Bắn Thẳng x2",
      cost = 200,
      damageText = "40 DMG (2x20)",
      rateText = "1.425s (~28 DPS)",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Bắn liên thanh 2 hạt đậu mỗi lượt gây 40 sát thương, tăng gấp đôi hỏa lực phá giáp.",
      accentColor = ToxicLime
    ),
    PlantCatalogItem(
      id = "wall_nut",
      shortName = "Hạt Dẻ",
      fullName = "Hạt Dẻ (Wall-nut)",
      group = "Phòng Thủ",
      cost = 50,
      damageText = "0 (Khiên chắn)",
      rateText = "Bất động",
      cooldownText = "20.0s",
      hpText = "4000 HP",
      description = "Lớp vỏ siêu dày chịu đựng tới 4000 sát thương, cản bước zombie cho tuyến sau xả đạn.",
      accentColor = AmberGold
    ),
    PlantCatalogItem(
      id = "potato_mine",
      shortName = "Mìn Khoai",
      fullName = "Mìn Khoai Tây (Potato Mine)",
      group = "Cạm Bẫy Nổ",
      cost = 50,
      damageText = "2700 DMG (3x3)",
      rateText = "Kích nổ khi dẫm",
      cooldownText = "25.0s",
      hpText = "300 HP",
      description = "Cần 5s nhô lên mặt đất. Khi kích hoạt, dẫm phải sẽ nổ tung 2700 sát thương phạm vi 3x3 ô.",
      accentColor = CrimsonSoul
    ),
    PlantCatalogItem(
      id = "hypno_shroom",
      shortName = "Nấm Miên",
      fullName = "Nấm Thôi Miên (Hypno-shroom)",
      group = "Thôi Miên",
      cost = 100,
      damageText = "Thôi miên kẻ địch",
      rateText = "Tác dụng khi bị ăn",
      cooldownText = "20.0s",
      hpText = "50 HP",
      description = "Khi zombie cắn phải nấm thôi miên, chúng sẽ quay lưng lại và chiến đấu bảo vệ khu vườn cho bạn.",
      accentColor = Color(0xFFCE93D8)
    ),
    PlantCatalogItem(
      id = "cabbage_pult",
      shortName = "Bắp Cải",
      fullName = "Bắp Cải (Cabbage-pult)",
      group = "Cầu Vồng",
      cost = 100,
      damageText = "40 DMG",
      rateText = "2.925s (~14 DPS)",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Bắn bắp cải theo đường cầu vồng, vượt qua mọi Bia Mộ và vật cản để đánh trúng Zombie.",
      accentColor = ToxicLime
    ),
    PlantCatalogItem(
      id = "melon_pult",
      shortName = "Dưa Hấu",
      fullName = "Dưa Hấu (Melon-pult)",
      group = "Cầu Vồng AoE",
      cost = 300,
      damageText = "100 (+30 AoE)",
      rateText = "2.925s (~34 DPS)",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Bắn dưa hấu hạng nặng cầu vồng qua Bia Mộ. Gây 100 sát thương trực tiếp và 30 sát thương lan 3x3.",
      accentColor = ToxicLime
    ),
    PlantCatalogItem(
      id = "bonk_choy",
      shortName = "Đấm Bốc",
      fullName = "Đấm Bốc (Bonk Choy)",
      group = "Cận Chiến",
      cost = 150,
      damageText = "20 DMG / 0.5s",
      rateText = "0.5s / đấm",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Võ sĩ cận chiến tung đòn đấm nhanh 20 sát thương mỗi 0.5s trong phạm vi 2 ô trước và sau.",
      accentColor = ToxicLime
    ),
    PlantCatalogItem(
      id = "snapdragon",
      shortName = "Rồng Lửa",
      fullName = "Rồng Lửa (Snapdragon)",
      group = "Phun Lửa 3 Hàng",
      cost = 200,
      damageText = "30 DMG (3 hàng)",
      rateText = "1.0s / lần",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Phun luồng lửa ma quái hình nón bao phủ 3 hàng liền kề, thiêu rụi nhiều mục tiêu cùng lúc.",
      accentColor = CrimsonSoul
    ),
    PlantCatalogItem(
      id = "chomper",
      shortName = "Hoa Đớp",
      fullName = "Hoa Ăn Thịt (Chomper)",
      group = "Nuốt Chửng",
      cost = 150,
      damageText = "2400 DMG (Nuốt)",
      rateText = "Tiêu hóa 20s",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Nuốt trọn 1 Zombie trong phạm vi 1 ô trước mặt. Không thể nuốt zombie lớn hoặc zombie bay lớn (Kẻ Bắt Nạt, Gargantuar, Zomboss, Lãng Khách, Troglobite, Anivia); cắn liên tục 200 DMG mỗi giây.",
      accentColor = Color(0xFFBA68C8)
    ),
    PlantCatalogItem(
      id = "cherry_bomb",
      shortName = "Bom Đào",
      fullName = "Bom Anh Đào (Cherry Bomb)",
      group = "Nổ Tức Thời",
      cost = 150,
      damageText = "1800 DMG (3x3)",
      rateText = "Nổ sau 1.2s",
      cooldownText = "35.0s",
      hpText = "300 HP",
      description = "Phát nổ hủy diệt phạm vi 3x3 ô với 1800 sát thương, xóa sổ ngay đàn zombie dày đặc.",
      accentColor = CrimsonSoul
    ),
    PlantCatalogItem(
      id = "lightning_reed",
      shortName = "Sậy Sét",
      fullName = "Sậy Sét (Lightning Reed)",
      group = "Giật Sét",
      cost = 125,
      damageText = "10 DMG x 3 mục tiêu",
      rateText = "1.0s / tia",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Giật tia lôi điện xuyên qua tối đa 3 mục tiêu trong phạm vi lan 3 ô, khắc chế bầy Imp đông đúc.",
      accentColor = IceCyan
    ),
    PlantCatalogItem(
      id = "stunion",
      shortName = "Hành Choáng",
      fullName = "Hành Choáng (Stunion)",
      group = "Khí Choáng",
      cost = 25,
      damageText = "Choáng 5 Giây",
      rateText = "Tức thời",
      cooldownText = "15.0s",
      hpText = "300 HP",
      description = "Thổi luồng khí cực nồng làm tê liệt mọi zombie ở ô đang trồng và 2 ô trước mặt suốt 5 giây.",
      accentColor = Color(0xFFBA68C8)
    ),
    PlantCatalogItem(
      id = "infi_nut",
      shortName = "Dẻ Holo",
      fullName = "Hạt Dẻ Hologram (Infi-nut)",
      group = "Khiên Hồi Phục",
      cost = 75,
      damageText = "0 (Tự hồi máu)",
      rateText = "Bất động",
      cooldownText = "15.0s",
      hpText = "2000 HP",
      description = "Chiếu lá chắn toàn ảnh 2000 HP. Khi không bị cắn sẽ tự tái tạo lại hoàn toàn.",
      accentColor = IceCyan
    ),
    PlantCatalogItem(
      id = "sun_shroom",
      shortName = "Nấm Sun",
      fullName = "Nấm Mặt Trời (Sun Shroom)",
      group = "Kinh Tế Tiến Hóa",
      cost = 25,
      damageText = "0 (Kinh tế)",
      rateText = "25 → 50 → 75 Sun",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Cây kinh tế giá rẻ 25 Sun. Lớn dần qua 3 giai đoạn để nhả tới 75 Mặt Trời mỗi đợt.",
      accentColor = AmberGold
    ),
    PlantCatalogItem(
      id = "goo_peashooter",
      shortName = "Đậu Độc",
      fullName = "Đậu Độc (Goo Pea)",
      group = "Độc Xuyên Giáp",
      cost = 125,
      damageText = "30 DMG + 15 Độc/s",
      rateText = "1.4s / phát",
      cooldownText = "7.5s",
      hpText = "300 HP",
      description = "Bắn hạt đậu độc xuyên giáp nón/xô, cộng dồn tối đa 3 lớp độc gây 15 DMG mỗi giây.",
      accentColor = Color(0xFFCE93D8)
    ),
    PlantCatalogItem(
      id = "magnet_shroom",
      shortName = "Nam Châm",
      fullName = "Nấm Nam Châm (Magnet-shroom)",
      group = "Hút Kim Loại",
      cost = 100,
      damageText = "Hút giáp sắt",
      rateText = "10s / lần",
      cooldownText = "15.0s",
      hpText = "300 HP",
      description = "Hút thùng sắt của Buckethead và luôn là mục tiêu ưu tiên số 1 bị Zombot Dark Dragon nhắm cầu lửa.",
      accentColor = IceCyan
    ),
    PlantCatalogItem(
      id = "galio",
      shortName = "Galio",
      fullName = "Vệ Thần Galio",
      group = "Cận Chiến & Khống Chế",
      cost = 200,
      damageText = "50 / Sóng 500 / Chết 1500",
      rateText = "0.5s / đấm · 5s sóng",
      cooldownText = "20.0s",
      hpText = "250 HP",
      description = "Đánh cận chiến 2 ô. Tích 5s bắn sóng năng lượng 500 DMG. Khi chết ngưng đọng thời gian 1s, hút 5 zombie và nổ 1500 DMG.",
      accentColor = AmberGold
    ),
    PlantCatalogItem(
      id = "jhinplant",
      shortName = "Jhinplant",
      fullName = "Jhinplant (Hoa Súng Tử Vong)",
      group = "Xạ Thủ Nhịp 4",
      cost = 250,
      damageText = "44 · Viên IV: 440 · Sen: 444",
      rateText = "2.2s/viên (4 viên) · Nạp 4s",
      cooldownText = "4.0s",
      hpText = "440 HP",
      description = "Hoa thược dược tím thẫm đeo mặt nạ cùng ống ngắm la-de đỏ. Bắn 4 phát nhịp 2.2s (44 DMG), viên thứ 4 gây x10 sát thương (440 DMG) rồi nạp đạn 4s. Khi viên thứ 4 hạ gục Zombie (không tính Bia Mộ/vật cản) sẽ đặt Bẫy Hoa Sen, phát nổ 444 DMG AoE 2×2 ô khi Zombie bước vào.",
      accentColor = Color(0xFFBA68C8)
    ),
    PlantCatalogItem(
      id = "blover",
      shortName = "Cỏ Ba Lá",
      fullName = "Cỏ Ba Lá (Blover)",
      group = "Thổi Bay Tức Thời",
      cost = 50,
      damageText = "Thổi bay mục tiêu trên không",
      rateText = "Tức thì (dùng 1 lần)",
      cooldownText = "10.0s",
      hpText = "300 HP",
      description = "Kích hoạt ngay lập tức khi đặt xuống để thổi bay toàn bộ zombie bay nhỏ hoặc đang lơ lửng (Imp bị ném, Pole Vaulting đang nhảy sào...). Không thể thổi bay zombie bay lớn như Anivia.",
      accentColor = ToxicLime
    ),
    PlantCatalogItem(
      id = "spikeweed",
      shortName = "Cỏ Gai",
      fullName = "Cỏ Gai (Spikeweed)",
      group = "Bẫy Sát Đất",
      cost = 50,
      damageText = "20 DMG / 0.5s",
      rateText = "0.5s/lần khi dẫm lên",
      cooldownText = "5.0s",
      hpText = "300 HP",
      description = "Trải gai sát mặt đất gây 20 sát thương mỗi 0.5s cho zombie đi bộ qua (không trúng zombie đang bay). Không bị zombie thường ăn, nhưng vẫn bị khối băng đè nát và bị Gargantuar / Zomboss đập phá.",
      accentColor = AmberGold
    ),
    PlantCatalogItem(
      id = "lux",
      shortName = "Lux",
      fullName = "Lux (Tiểu Thư Ánh Sáng)",
      group = "Tia Sáng Xuyên Hàng",
      cost = 300,
      damageText = "45/s · Ulti 600 + Choáng 2s",
      rateText = "1.0s / tia · Đủ 10 hạ/hỗ trợ",
      cooldownText = "5.0s",
      hpText = "300 HP",
      description = "Bắn tia sáng xuyên thấu 1 hàng gây 45 DMG/s lên mọi zombie và vật cản. Khi hạ hoặc hỗ trợ tiêu diệt đủ 10 zombie sẽ bắn Luồng Sáng Hủy Diệt gây 600 DMG toàn hàng (nếu zombie không chết sẽ bị choáng 2s) rồi reset 0/10.",
      accentColor = AmberGold
    ),
    PlantCatalogItem(
      id = "syndra",
      shortName = "Syndra",
      fullName = "Phù Thủy Syndra",
      group = "Pháp Sư Bóng Tối",
      cost = 250,
      damageText = "15/0.5s · Cầu 100 · Cường Hóa 600",
      rateText = "0.5s / đòn · 3s / 1 Quả Cầu",
      cooldownText = "12.0s",
      hpText = "200 HP",
      description = "Hoa dạ lan hương / lưu ly biến dị mang sắc tối với dáng đứng cao ráo, thanh thoát. Đánh thường 15 DMG / 0.5s. Mỗi 3s tích tụ năng lượng tạo 1 quả cầu quanh bản thân: nếu có zombie sẽ ném cầu gây 100 sát thương (nếu hạ gục zombie sẽ hồi lại 1 cầu); không có zombie sẽ tích tụ tối đa 3 stack, khi đủ 3 stack phóng Cầu Cường Hóa sốc 600 sát thương vào 1 mục tiêu có ATK cao nhất trên hàng.",
      accentColor = Color(0xFFE040FB)
    ),
    PlantCatalogItem(
      id = "kata",
      shortName = "Kata",
      fullName = "Kata Blade Rose",
      group = "Sát Thủ Lưỡi Kiếm",
      cost = 100,
      damageText = "30/s (Nảy 3) · Bão Dao 30/0.25s",
      rateText = "1.0s / dao · Xoay 3s (hồi đầy HP khi hạ)",
      cooldownText = "9.0s",
      hpText = "450 HP",
      description = "Hoa hồng lưỡi kiếm tầm đánh 2 ô, ném dao cầu vồng từ trên xuống gây 30 DMG nảy tối đa 3 mục tiêu trong phạm vi 3×2 (gồm hàng trên/dưới; chỉ đánh 1 lần nếu chỉ có 1 mục tiêu). Sau 3s tấn công zombie sẽ xoay Bão Dao 3×3 trong 3s gây 30 DMG mỗi 0.25s; lập tức hồi đầy máu nếu hạ gục zombie khi đang xoay rồi đánh thường đủ 3s cho lần xoay tiếp theo.",
      accentColor = Color(0xFFFF1744)
    ),
    PlantCatalogItem(
      id = "aurora",
      shortName = "Aurora",
      fullName = "Aurora (Hoa Chuông Linh Giới)",
      group = "Cầu Vồng & Pháp Trận",
      cost = 250,
      damageText = "40/2s (Xuyên 4) · Pháp Trận 200",
      rateText = "2.0s / thỏ · 20s / Pháp Trận",
      cooldownText = "15.0s",
      hpText = "300 HP",
      description = "Hoa chuông linh giới bắn linh hồn thỏ theo kiểu cầu vồng gây 40 DMG mỗi 2s xuyên thấu 4 mục tiêu và đẩy lùi zombie đầu tiên chạm phải 1 ô (không đẩy lùi Mini-Boss/Boss). Mỗi 20s triệu hồi Pháp Trận toàn sân tại zombie gần nhà nhất (khi có nhiều Aurora trên sân, chỉ 1 Aurora trồng sớm nhất kích hoạt kỹ năng), gây 200 DMG lên toàn bộ zombie phạm vi 2 ô và đẩy tất cả zombie (kể cả Mini-Boss, trừ Zomboss) văng ngược về rìa phải ngoài cùng.",
      accentColor = IceCyan
    ),
    PlantCatalogItem(
      id = "ahri",
      shortName = "Ahri",
      fullName = "Ahri (Hồ Ly Chín Đuôi)",
      group = "Boomerang & Mê Hoặc",
      cost = 200,
      damageText = "Đi 25 · Về 50 Chuẩn (Xuyên Khiên/Giáp)",
      rateText = "1.75s / lần · 15s / Mê hoặc 4s",
      cooldownText = "10.0s",
      hpText = "200 HP",
      description = "Tấn công mỗi 1.75s phạm vi 5 ô đường thẳng như boomerang: lượt đi gây 25 DMG, khi đi hết phạm vi quả cầu trắng bay về gây 50 Sát Thương Chuẩn (xuyên khiên & giáp). Skill mỗi 15s thôi miên tạm thời 4s zombie gần nhất cùng hàng (giữ nguyên toàn bộ HP, giáp và trạng thái) quay lại đánh zombie địch; hết 4s trở lại bình thường.",
      accentColor = Color(0xFFF48FB1)
    ),
    PlantCatalogItem(
      id = "irelia",
      shortName = "Kiếm Vũ Ire",
      fullName = "Kiếm Vũ Ire (Irelia)",
      group = "Sát Thủ Kết Liễu",
      cost = 200,
      damageText = "35 / 0.8s · Kết Liễu <250 HP (<10%)",
      rateText = "0.8s (+10%/stack, max 3) · Skill 3×3 (2s)",
      cooldownText = "10.0s",
      hpText = "400 HP",
      description = "Tầm đánh 2 ô gây 35 DMG mỗi 0.8s. Skill phạm vi 3×3 (hồi chiêu 2s): khi có zombie dưới 250 HP (với zombie có HP cơ bản dưới 250 thì tính dưới 10%) và không có Bất Tử, lập tức di chuyển tới ô đó kết liễu mục tiêu và tăng vĩnh viễn +10% tốc độ đánh (tối đa 3 lần).",
      accentColor = Color(0xFF00B0FF)
    ),
    PlantCatalogItem(
      id = "karma",
      shortName = "Karma",
      fullName = "Karma (Khai Sáng)",
      group = "Hỗ Trợ Tạo Khiên",
      cost = 75,
      damageText = "0 DMG · Buff +200 Khiên",
      rateText = "5.0s / lần (Lần 4 cường hóa 3×3)",
      cooldownText = "9.0s",
      hpText = "150 HP",
      description = "0 sát thương. Mỗi 5s buff +200 Khiên cho cây phòng thủ trước mặt 1 ô. Sau 3 lần buff thường, lần thứ 4 sẽ cường hóa Kinh Lược Hồn buff +200 Khiên cho toàn bộ cây trong phạm vi 3×3.",
      accentColor = Color(0xFF1DE9B6)
    ),
    PlantCatalogItem(
      id = "squash",
      shortName = "Bí Đè",
      fullName = "Bí Đè (Squash)",
      group = "Dậm Nát Tức Thời",
      cost = 50,
      damageText = "1800 DMG (Dùng 1 lần)",
      rateText = "Nhảy đè 1.5 ô",
      cooldownText = "25.0s",
      hpText = "300 HP",
      description = "Phát hiện zombie tới gần trong phạm vi 1.5 ô trước/sau rồi nhảy vồ lên dậm nát gây 1800 sát thương diện hẹp và biến mất.",
      accentColor = ToxicLime
    )
  )

  val plantById: Map<String, PlantCatalogItem> = plants.associateBy { it.id }

  val zombies: List<ZombieCatalogItem> = listOf(
    ZombieCatalogItem("basic", "Zombie Cơ Bản", "🧟", "190 HP", "6.0s / ô", "50 DMG (100 DPS)", "Kẻ thù tiêu chuẩn không giáp. Dễ bị tiêu diệt bởi Peashooter."),
    ZombieCatalogItem("imp", "Quỷ Lùn Imp", "🦹", "100 HP", "2.5s / ô", "20 DMG", "Nhỏ con nhưng chạy rất nhanh, thường bị Gargantuar ném vào sâu phòng tuyến."),
    ZombieCatalogItem("conehead", "Zombie Nón Giao Thông", "🪖", "560 HP (370 Giáp)", "6.0s / ô", "50 DMG", "Đội nón bảo hộ tăng gần gấp 3 lần sức chịu đựng."),
    ZombieCatalogItem("buckethead", "Zombie Thùng Sắt", "🪣", "1290 HP (1100 Giáp)", "6.0s / ô", "50 DMG", "Bọc thùng thép siêu dày! Khắc chế tốt bằng Nấm Nam Châm, Đậu Độc hoặc Cherry Bomb."),
    ZombieCatalogItem("pole_vaulting", "Zombie Cầm Sào", "🏃", "500 HP", "3.0s / ô", "50 DMG", "Chạy nhanh và phóng sào nhảy qua cây đầu tiên trên hàng!"),
    ZombieCatalogItem("tombstone", "Bia Mộ Cổ (Vật Cản)", "🪦", "500 HP", "Bất động", "0 DMG", "Chắn đứng mọi đạn bắn thẳng. Dùng Bắp Cải hoặc Dưa Hấu ném cầu vồng vượt qua."),
    ZombieCatalogItem("turquoise_skull", "Đầu Lâu Ngọc (Laser)", "💀", "250 HP", "5.4s / ô", "Laser 4000 DMG", "Tích tụ năng lượng trong 5s rồi bắn tia laser thiêu rụi cây trước mặt."),
    ZombieCatalogItem("jurassic_bully", "Kẻ Bắt Nạt Tiền Sử", "🦣", "1100 HP", "6.25s / ô", "100 DPS", "Thể hình hộ pháp miễn nhiễm hoàn toàn hiệu ứng đẩy lùi."),
    ZombieCatalogItem("troglobite", "Troglobite (Đẩy Băng)", "🧊", "470 HP", "5.4s / ô", "100 DMG", "Miễn nhiễm làm chậm và đẩy khối băng chứa Yeti Imp nghiền nát cây."),
    ZombieCatalogItem("yeti_imp", "Yeti Imp", "❄️", "190 HP", "3.0s / ô", "100 DMG", "Xuất hiện khi khối băng vỡ, chạy nhanh và miễn nhiễm làm chậm."),
    ZombieCatalogItem("lang_khach", "Lãng Khách Zombie", "🌪️", "600 HP", "4.8s / ô", "60/0.5s · Lướt 100 · Lốc 1800", "Lướt xuyên cây cách 3 ô; sau khi lướt phải đánh thường (60 DMG/0.5s) ăn được 1 cây mới lướt tiếp. Bất tử 3s khi dưới 50% HP và phóng lốc xoáy sau 2 lần lướt."),
    ZombieCatalogItem("shen", "Shen Mắt Hoàng Hôn", "🥷", "1800 HP (Hardened)", "6.0s / ô (Basic)", "60/s (114/1.9s) · Diệt thủ 3 nhát", "Mặc giáp ninja tím, sau lưng luôn đeo Kiếm Linh Hồn. Skill 1: Khi đồng minh >500 HP (trừ Gargantuar, Zomboss) còn ≤50% máu, buff 350 giáp Kiếm Hồn cho đồng minh gần nhất (hồi chiêu 7s, độc vẫn xuyên giáp). Skill 2: Cắn 3 nhát hạ mọi cây phòng thủ bất kể máu."),
    ZombieCatalogItem("anivia", "Anivia Phượng Hoàng Băng", "🦅", "660 HP · Trứng 770 · D2 1100", "8.0s / ô (Bay Lớn)", "40/s (D1) · 40/0.35s (D2) · Tầm 3 ô", "Zombie bay lớn: né hoàn toàn Cỏ Gai & Mìn Khoai Tây dưới đất, kháng thổi bay (Blover) & không thể bị Chomper nuốt, miễn nhiễm hoàn toàn làm chậm & đóng băng hệ băng. Khi chết biến thành Trứng Băng Giá 770 HP; nếu sống sót sau 5s sẽ hồi sinh tiến hóa Dạng 2 (1100 HP, bắn cột băng mỗi 0.35s) và khi hạ/hỗ trợ hạ cây sẽ đóng băng thành Khối Băng (như mộ) có HP bằng 1/2 cây gốc."),
    ZombieCatalogItem("balloon", "Zombie Bóng Bay", "🎈", "190 HP", "4.5s / ô (Bay Nhỏ)", "50 DMG / 0.5s", "Zombie bay nhỏ bay lơ lửng trên không, né hoàn toàn Cỏ Gai & Mìn Khoai Tây dưới đất. Khắc chế tức thì bằng Cỏ Ba Lá (Blover)."),
    ZombieCatalogItem("jetpack", "Zombie Jetpack", "🚀", "350 HP", "4.8s / ô → x1.5 nửa sân", "50 DMG / 0.5s", "Zombie bay nhỏ trang bị động cơ phản lực. Khi tiến đến gần nửa sân (cột ≤ 5) sẽ kích hoạt tăng ×1.5 tốc độ bay lao thẳng về nhà. Bị Cỏ Ba Lá (Blover) thổi bay."),
    ZombieCatalogItem("thresh", "Thresh Zombie", "⛓️", "490 HP", "6.0s / ô", "Xích 100 DMG / 1.5s (Tầm 3 ô)", "Cai ngục u ám cầm xích sắt. Ném xích trói plant phía trước trong tầm 3 ô (gây choáng nếu là plant tấn công), mỗi 1.5s kéo cây về phía Thresh 1 ô và gây 100 sát thương tới khi cây chết/bị kéo ra hết sân hoặc Thresh chết. Không bị Nam Châm hút; hạ xong cây lập tức ném xích kéo tiếp nếu còn cây trong tầm."),
    ZombieCatalogItem("quan_chua", "Quận Chúa", "👑", "600 HP", "7.0s / ô", "150 DMG / 1.0s (Tầm 1 ô)", "Pháp sư quý tộc hắc ám: tích lũy linh hồn khi zombie cùng hàng chết. Đủ ≥3 linh hồn sẽ đứng im niệm phép 3s rồi gọi số Imp bằng linh hồn thu được; đạt 5+ zombie chết gọi thêm 1 Zombie Nón Giao Thông; Gargantuar cùng hàng chết gọi thêm 1 Zombie Thùng Sắt."),
    ZombieCatalogItem("dragon_hatchling", "Rồng Mới Nở", "🐣", "200 HP", "4.5s / ô (Bay Nhỏ)", "Khạc Lửa 100 DMG / 0.85s", "Long tộc sơ sinh bay nhẹ: né bẫy mặt đất (Cỏ Gai, Mìn Khoai Tây) và bị Cỏ Ba Lá (Blover) thổi bay. Phun lửa tầm gần gây 100 sát thương mỗi 0.85s."),
    ZombieCatalogItem("dragon_adult", "Rồng Trưởng Thành", "🐉", "500 HP", "3.8s / ô (Bay Lớn)", "Khạc Lửa 150 DMG / 1.0s", "Long tộc trưởng thành sải cánh trên không (Bay Lớn): né bẫy mặt đất, kháng thổi bay Blover và phun lửa đốt cây 150 sát thương mỗi giây."),
    ZombieCatalogItem("dragon_dark", "Rồng Hắc Ám", "🖤", "300 HP + Giáp Hấp Thụ", "4.5s / ô (Bay Lớn)", "150/s · Đòn đầu ×2 (300)", "Khi xuất hiện luôn kéo theo 1–2 rồng cấp thấp và nuốt 1 rồng thường cùng hàng để biến máu thành Giáp Hắc Ám (không bị Nam Châm hút). Đòn đánh đầu tiên lên mỗi cây gây ×2 sát thương (300 DMG)."),
    ZombieCatalogItem("dragon_chemtech", "Rồng Hóa Kỹ", "🧪", "1000 HP", "6.0s / ô (Đi Bộ)", "169 DMG / 1.0s", "Mỗi khi mất 200 HP ném bình thuốc ngẫu nhiên vào ô trống 3×3 (tối đa 5 bình; nếu bị sốc sát thương chết ngay sẽ ném bù đủ phần còn lại). Bình thuốc chặn trồng cây và buff 1 hiệu ứng (Tím: ×2 tốc chạy | Xanh lá: +300 HP hóa lớn | Đỏ: ×2 tốc đánh) cho đồng minh khác đi vào."),
    ZombieCatalogItem("dragon_wind", "Rồng Gió", "🌪️", "400 HP", "1.0s / ô (Bay Nhẹ)", "50 DMG / 1.0s", "Bay nhẹ cực nhanh (1s/ô), né bẫy mặt đất và bị Cỏ Ba Lá (Blover) thổi bay. Khi ra sân thổi luồng gió tăng ×2 tốc độ chạy trong 3s cho toàn bộ zombie/rồng cùng hàng."),
    ZombieCatalogItem("dragon_water", "Rồng Nước", "💧", "100 → 3855 HP (10 Mạng)", "6.0s / ô (Đi Bộ)", "20 → 777 DMG / 1.0s", "Xuất trận ở giữa màn (Wave 3) với 10 bản thể. Mạng 1 có 100 HP và 20 ATK/s; mỗi lần bị hạ sẽ hồi sinh từ ô đầu ở một hàng khác, cộng thêm +1/2 HP và ATK của bản vừa chết (lặp lại tới mạng thứ 10)."),
    ZombieCatalogItem("gargantuar", "BOSS Khổng Lồ Gargantuar", "👹", "3000 HP", "8.5s / ô", "Đập 1-hit diệt cây", "Đập chày hủy diệt mọi cây phòng thủ và ném Imp vào sâu hậu phương khi mất nửa máu.", isBoss = true),
    ZombieCatalogItem("imp_dragon", "Imp Dragon Zombie", "🦎", "190 HP", "2.8s / ô", "20 DMG", "Ấp nở từ cầu lửa của Zombot Dark Dragon, miễn nhiễm sát thương lửa."),
    ZombieCatalogItem("zombot_dark_dragon", "TRÙM ZOMBOT DARK DRAGON", "🐲", "27.000 HP", "Cố định (2 Hàng)", "Khạc Lửa Hủy Diệt", "Trùm Rồng Cơ Giới Dark Ages: Gầm triệu hồi quân, nhổ cầu lửa thiêu đất 10s, khạc lửa 2 hàng (dùng Plant Food để ngắt đòn). Miễn nhiễm choáng (choáng chuyển thành làm chậm và delay hành động 1.5s).", isBoss = true),
    ZombieCatalogItem("ancient_dragon_boss", "BOSS RỒNG NGÀN TUỔI", "🐉", "10.000 HP + Khiên Gargantuar", "Di chuyển 2 Hàng (Zomboss)", "Sét 3 Cây · Sợ 2s · Diệt <15% HP · Mưa Hồi Máu", "Trùm Cổ Long Cấp 12: Chiếm 2 hàng như Zomboss, liên tục thả rồng & zombie. Mỗi 20s giáng sét hủy diệt ngẫu nhiên 3 cây ATK cao nhất; mất 1000 HP đầu gọi 5 Gargantuar (mỗi Gargantuar chết tạo +500 khiên chắn mọi sát thương cộng dồn); mỗi 1500 máu thật bị mất gầm gây hoảng sợ choáng toàn cây 2s; tự hủy diệt mọi cây dưới 15% HP; mỗi 16s gọi mưa hồi 20% máu cho toàn rồng đồng minh; còn ≤100 HP thả x2 toàn bộ quân & Rồng Nước Mạng 10!", isBoss = true),
    ZombieCatalogItem("sand_soldier", "Lính Cát Sa Mạc", "⏳", "240 HP", "Trồi tại cây (trừ 2 ô cuối)", "200 DMG · Đánh xong biến mất", "Lính cát do Boss Azir triệu hồi trồi lên từ mặt đất dưới chân cây, ưu tiên hàng có nhiều cây nhất (không trồi vào 2 ô cuối). Gây 200 sát thương cho 1 cây rồi tan biến thành cát."),
    ZombieCatalogItem("sand_coffin", "Quan Tài Sa Mạc", "⚰️", "800 HP", "Đứng im như Bia Mộ", "Vỡ thả 1 Zombie Cơ Bản", "Lính Cát được Azir Phase 2 cường hóa thành Quan Tài 800 HP đứng im chắn đạn như Bia Mộ; khi bị phá hủy sẽ thả ra 1 Zombie Cơ Bản."),
    ZombieCatalogItem("renekton_croc", "Thần Cá Sấu", "🐊", "2.700 HP", "6.0s / ô · Lướt 2 cây đầu", "100/s · Lướt 1000 · Hóa Lớn 250 · Quét 3×3 (1 lần)", "Mini-Boss của Azir: Lướt qua 2 cây đầu tiên gặp phải gây 1000 DMG. Đến giữa sân hóa khổng lồ tăng ATK thường lên 250 và dùng duy nhất 1 lần tụ lực 3s quét đao 3×3 gây 400 DMG, hồi 100 HP mỗi cây trúng chiêu rồi lướt tiếp 1 ô.", isBoss = true),
    ZombieCatalogItem("nasus_hound", "Thần Khuyển", "🐺", "3.000 HP", "6.0s / ô (Đánh gần)", "100/s · Lão Hóa 2×2 · Hóa Lớn diệt cây +350 HP", "Mini-Boss của Azir: Tầm 2 ô phóng Lão Hóa 2×2 trong 5s làm chậm 50% tốc đánh cây và đốt 10 DMG/0.5s (hồi 10s). Khi xuống dưới 60% HP hóa lớn (ngưng dùng Lão Hóa), đánh 2s/lần hủy diệt ngay cây và hồi 350 HP.", isBoss = true),
    ZombieCatalogItem("azir_desert_emperor", "BOSS AZIR HOÀNG ĐẾ SA MẠC", "🦅", "20.000 HP", "Di chuyển 2 Hàng (Zomboss)", "Lính Cát · Bão Cát 3 Hàng · Quan Tài · Song Thần", "Hoàng Đế Sa Mạc mang đầu đại bàng vàng uy nghi! GĐ 1: Thả quân & gọi Lính Cát (200 DMG) ưu tiên trồi dưới cây ở hàng có nhiều cây nhất (trừ 2 ô cuối). GĐ 2 (≤15.000 HP): Gọi Bão Cát hủy diệt toàn cây & zombie 3 hàng, cường hóa Lính Cát thành Quan Tài 800 HP và sau 20s triệu hồi 1 đợt zombie mang bão cát bé dưới chân tăng ×2 tốc chạy. GĐ 3 (≤7.000 HP): Triệu hồi Mini-Boss Thần Cá Sấu & Thần Khuyển!", isBoss = true),
    ZombieCatalogItem("nosus_thrall", "Binh Sĩ Nosus", "🪓", "210 HP", "4.5s / ô", "45 DMG / 0.5s", "Bộ binh tiên phong của đế chế Nosus mang rìu thép thẫm máu. Tốc độ áp sát nhanh hơn Zombie thường để gây áp lực từ đầu trận."),
    ZombieCatalogItem("nosus_assassin", "Sát Thủ Huyết Đao Nosus", "🗡️", "340 HP", "4.0s / ô → ×1.6 Cuồng Huyết", "65 DMG / 0.5s", "Sát thủ song đao hắc huyết. Ngay lần đầu trúng sát thương không chí tử sẽ kích hoạt Cuồng Huyết (×1.6 tốc độ di chuyển trong 3s) lao thẳng vào tuyến phòng thủ!"),
    ZombieCatalogItem("nosus_shieldbearer", "Vệ Binh Khiên Sắt Nosus", "🛡️", "1050 HP (300 + 750 Khiên Sắt)", "6.2s / ô · Kháng 40% đẩy", "65 DMG / 0.5s", "Vệ binh bọc đại khiên sắt Nosus 750 HP, kháng 40% đẩy lùi. Có thể dùng Nấm Nam Châm (Magnet-shroom) để hút bay khiên sắt!"),
    ZombieCatalogItem("nosus_hemomancer", "Huyết Pháp Sư Nosus", "🩸", "760 HP", "6.5s / ô · Tầm 2.5 ô", "Cầu Máu 80 DMG / 1.4s · Huyết Tế", "Pháp sư huyết thuật tầm xa: bắn cầu máu tầm 2.5 ô gây 80 DMG mỗi 1.4s. Mỗi 6.5s niệm Huyết Tế hồi +120 HP và tăng +25% tốc độ cho bản thân cùng đồng minh phạm vi 3×2 trong 2.5s."),
    ZombieCatalogItem("nosus_warlord", "Darius (Đại Tướng Nosus)", "🪓", "3.200 HP (Mini-Boss)", "6.0s / ô · Miễn Làm Chậm / Thôi Miên / Đẩy", "240 DMG/1.75s · Hành Quyết <20% · Xoay 3×3 · One-Hit", "Đại Tướng Darius miễn nhiễm Làm Chậm, Thôi Miên và Đẩy Lùi! Đòn bổ rìu 240 DMG/1.75s tự động Hành Quyết cây <20% HP. Từ ≤50% HP mỗi 5s tung Máy Chém Xoay 3×3 hồi 150–200–300 HP (máu càng ít hồi càng nhiều). Dưới 100 HP kích hoạt Bất Tử 4s (tốc đánh tăng lên 1s/đòn), ×2 tốc chạy và đòn đánh thường One-Hit cây tới khi chết!", isBoss = true),
    ZombieCatalogItem("ionia_zed", "Zed (Chúa Tể Bóng Tối)", "🥷", "250 HP", "1.5s / ô", "50 DMG/s · Dấu Ấn Tử Thần 300 DMG", "Sát thủ bóng đêm siêu tốc Ionia! Khi tụt vào máu tử, Zed kích hoạt miễn nhiễm sát thương và lao thẳng tới cây gần nhất cùng hàng; khi đáp xuống hết miễn nhiễm và gắn Dấu Ấn Tử Thần phát nổ sau 5s gây 300 DMG lên cây đó."),
    ZombieCatalogItem("ionia_yone", "Yone (Song Kiếm Linh Giới)", "⚔️", "500 HP (+200 Linh Hồn)", "5.0s / ô (Linh Hồn: 3.2s / ô)", "70 DMG/0.5s & 12% MaxHP · E Xuất Hồn · R Đoạt Mệnh", "Song kiếm đấu sĩ Ionia luân phiên đánh thường 70 DMG và cường hóa 12% Máu tối đa mỗi 0.5s. Đến cột 6 dùng Xuất Hồn (E) để lại Thể Xác (350 HP, miễn khống chế) và hóa Linh Hồn (+200 HP) lao 4.5s rồi giật về. Mỗi 8s kể từ khi tấn công, tụ 1.2s tung Đoạt Mệnh (R) lướt 2 ô hất tung & choáng 2s, gây 120 DMG/cây."),
    ZombieCatalogItem("ionia_sett", "Sett (Đại Ca Đấu Trường)", "🥊", "3.000 HP (Mini-Boss)", "6.0s / ô", "2 Đòn 300 DMG/2s · W Gan Lì 550 · R Ném Cây", "Mini-Boss Đấu Trường Ionia (Ahri không thể thôi miên)! Mỗi 2s đấm liên hoàn 2 đòn × 300 DMG. Tích 100% sát thương thành Gan Lì (tối đa 800 hoặc mỗi mất 700 HP) tạo giáp ảo 500 HP (3s) & đấm Cuồng Thú Quyền (W) 3 ô trước mặt (±2 hàng): tâm 550 DMG, rìa 200 DMG. Gặp cây phòng thủ dùng R nhấc ném lùi 2 ô (đè nát ≤300 HP) & gây 250 DMG 3×3 (hồi 15s).", isBoss = true),
    ZombieCatalogItem("drowned_sailor", "Thủy Thủ Đắm Tàu", "⚓", "270 HP", "5.0s / ô (Trung bình)", "50 DMG / 0.5s", "Lính tiên phong Bến Cảng Tử Thần xuất hiện số lượng lớn gây áp lực đều lên cả 5 hàng."),
    ZombieCatalogItem("anchor_bearer", "Kẻ Vác Neo", "🪨", "1.350 HP", "7.5s / ô (Chậm)", "75 DMG/0.7s · Đòn 3 Đẩy Lùi 1 Ô", "Thợ lặn biển sâu siêu trâu! Sau mỗi 3 đòn cắn sẽ vung mỏ neo đẩy lùi cây chắn về sau 1 ô nếu ô sau còn trống."),
    ZombieCatalogItem("swimming_ghost", "Ma Bơi Lội", "🌊", "420 HP", "3.0s / ô (Nhanh · Lặn Cột 9→5)", "60 DMG / 0.5s", "Lặn ngầm dưới nước đen từ Cột 9 (né mọi đạn khi đang lặn) và trồi lên bất ngờ ngay tại Cột 5, bỏ qua hàng phòng thủ Cột 6."),
    ZombieCatalogItem("wanted_captain", "Thuyền Trưởng Truy Nã", "💀", "950 HP", "3.2s / ô (Nhanh · Chia Phần)", "80 DMG / 0.5s", "Mang Đầu Lâu Đỏ và luôn chọn đi vào hàng có tổng sát thương thấp nhất! Tiêu diệt giúp nhận ngay 1 Thẻ Hạt Giống (ưu tiên hồi cây dùng 1 lần) và +1 giới hạn cây trên sân (tối đa 16)."),
    ZombieCatalogItem("zombot_pyke", "TRÙM ZOMBOT ĐỒ TỂ (PYKE)", "🪝", "15.000 HP (3 Giai Đoạn)", "Di chuyển Vùng Nước Đen (Cột 7–9)", "Lao Móc (Q) · Lướt Sóng (E) · Dấu Chữ X (R · Máu Xám)", "Trùm Map 20 Bến Cảng Tử Thần! Chuyển 40% sát thương nhận vào thành Máu Xám (tối đa 800 HP, khóa trần theo Phase 15k/10k/5k). Dấu Chữ X (R) có hồi chiêu riêng 16s/14s/12s, cảnh báo 2.2s (nhát 1) & 1.8s (nhát 2–3): chém trúng nhát 1 hồi toàn bộ Máu Xám; né hụt làm mất sạch Máu Xám, kẹt lao 4s & chịu ×1.5 sát thương! Q/E luân phiên 8s→6.5s→5s; P2 ngập Cột 6, P3 sương mù cột 5–6 (-20% tầm cột 1–2).", isBoss = true)
  )

  val zombieById: Map<String, ZombieCatalogItem> = zombies.associateBy { it.id }

  val levels: List<LevelInfo> = listOf(
    LevelInfo(
      level = 1,
      title = "Sân Cỏ Ma Ám",
      subtitle = "Basic Zombie & Quỷ Lùn Imp",
      description = "Làm quen với chiến trường nghĩa địa ban đêm cùng 5 đợt tấn công cơ bản.",
      zombieIds = listOf("basic", "imp"),
      tacticalTip = "Trồng 1-2 hàng Hướng Dương ở phía sau để đảm bảo Sun, dùng Peashooter tiêu diệt Zombie từ xa."
    ),
    LevelInfo(
      level = 2,
      title = "Bia Mộ & Nón Sắt",
      subtitle = "Conehead, Pole Vault & Bia Mộ",
      description = "Bia Mộ cản đạn thẳng xuất hiện trên sân cùng Zombie Cầm Sào vượt rào.",
      zombieIds = listOf("basic", "conehead", "pole_vaulting", "tombstone"),
      tacticalTip = "Bia Mộ chặn đạn thẳng! Mang theo Cabbage-pult hoặc Melon-pult để bắn cầu vồng và đặt Wall-nut chắn nhảy sào."
    ),
    LevelInfo(
      level = 3,
      title = "Binh Đoàn Thùng Sắt, Bay & Thresh",
      subtitle = "Buckethead, Đầu Lâu, Bóng Bay, Jetpack & Thresh",
      description = "Zombie Thùng Sắt, Đầu Lâu Laser cùng Bóng Bay, Jetpack tăng tốc và Thresh ném xích kéo cây tuyến sau.",
      zombieIds = listOf("basic", "conehead", "buckethead", "turquoise_skull", "balloon", "jetpack", "thresh", "tombstone"),
      tacticalTip = "Mang theo Blover thổi bay Bóng Bay/Jetpack, dồn sát thương hạ Thresh trước khi hắn kéo mất chủ lực và dùng Magnet-shroom hút thùng sắt!"
    ),
    LevelInfo(
      level = 4,
      title = "Kỷ Băng Hà & Quận Chúa",
      subtitle = "Troglobite, Lãng Khách, Anivia & Quận Chúa",
      description = "Troglobite đẩy tảng băng, Lãng Khách lướt kiếm, Phượng Hoàng Băng Anivia bay lượn và Quận Chúa thu hồn gọi quân.",
      zombieIds = listOf("basic", "conehead", "buckethead", "balloon", "jetpack", "thresh", "lang_khach", "jurassic_bully", "troglobite", "yeti_imp", "anivia", "quan_chua", "tombstone"),
      tacticalTip = "Anivia miễn nhiễm đậu băng còn Quận Chúa sẽ gọi thêm quân nếu có ≥3 zombie cùng hàng chết! Dùng Lux, Repeater, Melon-pult và Blover để kiểm soát cả hàng."
    ),
    LevelInfo(
      level = 5,
      title = "Đại Chiến Gargantuar",
      subtitle = "BOSS Khổng Lồ 3000 HP",
      description = "Hội tụ binh đoàn tinh nhuệ cùng Quận Chúa và Trùm Gargantuar đập nát hàng phòng thủ.",
      zombieIds = listOf("gargantuar", "imp", "buckethead", "pole_vaulting", "balloon", "jetpack", "thresh", "quan_chua", "lang_khach", "shen", "anivia", "turquoise_skull", "jurassic_bully", "troglobite", "tombstone"),
      tacticalTip = "Ưu tiên hạ Quận Chúa trước khi Gargantuar ngã xuống để tránh cô ta niệm phép gọi thêm Thùng Sắt và bầy Imp!",
      isBoss = true
    ),
    LevelInfo(
      level = 6,
      title = "Zombot Dark Dragon",
      subtitle = "BOSS Rồng 27.000 HP · Băng Chuyền",
      description = "Chế độ Băng Chuyền miễn phí Sun! Ngắt hơi thở lửa của Rồng bằng lá Plant Food.",
      zombieIds = listOf("zombot_dark_dragon", "imp_dragon", "gargantuar", "balloon", "jetpack", "thresh", "quan_chua", "lang_khach", "shen", "anivia", "buckethead", "tombstone"),
      tacticalTip = "Chế độ Băng Chuyền: Kéo thả cây trực tiếp từ băng chuyền bên trái. Khi Rồng chuẩn bị khạc lửa, dùng Plant Food lên cây bất kỳ để ngắt đòn!",
      isBoss = true,
      isConveyor = true
    ),
    LevelInfo(
      level = 7,
      title = "Bầu Trời Hỗn Loạn",
      subtitle = "Bóng Bay, Jetpack, Anivia & Thresh Áp Sát",
      description = "Không quân Bóng Bay, Jetpack tăng tốc và Phượng Hoàng Anivia phối hợp cùng Thresh ném xích phá vỡ tuyến giữa.",
      zombieIds = listOf("imp", "basic", "conehead", "buckethead", "balloon", "jetpack", "thresh", "turquoise_skull", "lang_khach", "jurassic_bully", "shen", "quan_chua", "anivia", "gargantuar", "tombstone"),
      tacticalTip = "Mang Blover để thổi bay Bóng Bay/Jetpack ngay lập tức và ưu tiên tiêu diệt Thresh trước khi hắn kéo mất chủ lực!"
    ),
    LevelInfo(
      level = 8,
      title = "Kỷ Băng Hà & Kiếm Hồn",
      subtitle = "Troglobite, Shen, Lãng Khách & Quận Chúa",
      description = "Binh đoàn Băng Giá đẩy tảng băng kết hợp Lãng Khách lướt kiếm, Shen buff giáp và Quận Chúa thu hồn gọi quân.",
      zombieIds = listOf("imp", "conehead", "buckethead", "balloon", "jetpack", "thresh", "turquoise_skull", "troglobite", "yeti_imp", "lang_khach", "jurassic_bully", "shen", "anivia", "quan_chua", "gargantuar", "tombstone"),
      tacticalTip = "Dùng Lux bắn xuyên hàng phá Khối Băng & Bia Mộ nhanh, tránh để ≥3 zombie chết cạnh Quận Chúa cùng hàng!"
    ),
    LevelInfo(
      level = 9,
      title = "Binh Đoàn Tinh Nhuệ",
      subtitle = "Liên Hoàn Thresh, Quận Chúa & Song Hùng Gargantuar",
      description = "Toàn bộ binh chủng tinh nhuệ tràn lên với nhịp độ dồn dập cùng cặp Gargantuar hộ tống Quận Chúa.",
      zombieIds = listOf("imp", "conehead", "buckethead", "pole_vaulting", "balloon", "jetpack", "thresh", "turquoise_skull", "troglobite", "lang_khach", "jurassic_bully", "shen", "anivia", "quan_chua", "gargantuar", "tombstone"),
      tacticalTip = "Kết hợp Snow Pea + Jhinplant giữ chân hàng ngũ và dùng Cherry Bomb/Plant Food dọn gọn trước khi Quận Chúa tích đủ 5 linh hồn."
    ),
    LevelInfo(
      level = 10,
      title = "Đêm Tận Thế Hắc Ám",
      subtitle = "Thử Thách Cực Đại 5 Đợt · Không Zomboss",
      description = "Đỉnh cao chiến thuật khu vườn với mật độ quân dày đặc, Thresh, Quận Chúa, Anivia, Shen và bộ ba Gargantuar.",
      zombieIds = listOf("imp", "conehead", "buckethead", "pole_vaulting", "balloon", "jetpack", "thresh", "turquoise_skull", "troglobite", "lang_khach", "jurassic_bully", "shen", "anivia", "quan_chua", "gargantuar", "tombstone"),
      tacticalTip = "Cấp độ khó nhất! Xây 2 hàng Sunflower đôi lấy Sun, giữ Blover + Cherry Bomb + Plant Food cho Đợt 4 và Đợt 5 tổng lực."
    ),
    LevelInfo(
      level = 11,
      title = "Vương Quốc Long Tộc",
      subtitle = "SPECIAL · Plants vs Dragons (Chỉ có Rồng)",
      description = "Map đặc biệt hoàn toàn không có zombie cũ hay bia mộ — đối đầu 6 loài Rồng Long Tộc với Rồng Gió tăng tốc, Rồng Nước 10 mạng, Rồng Hắc Ám và Rồng Hóa Kỹ 3×3!",
      zombieIds = listOf("dragon_hatchling", "dragon_adult", "dragon_wind", "dragon_water", "dragon_dark", "dragon_chemtech"),
      tacticalTip = "Mang Blover thổi sạch Rồng Mới Nở & Rồng Gió, dồn sát thương hạ 10 bản thể Rồng Nước từ giữa trận và dùng Snow Pea làm chậm Rồng Hóa Kỹ!",
      isSpecial = true
    ),
    LevelInfo(
      level = 12,
      title = "Boss Rồng Ngàn Tuổi",
      subtitle = "TRÙM CỔ LONG 10.000 HP · TRỒNG 0 SUN (VẪN HỒI CHIÊU)",
      description = "Hạ Boss Rồng Ngàn Tuổi và tiêu diệt toàn bộ zombie/rồng trên sân! Trồng mọi cây miễn phí 0 Sun nhưng vẫn phải chờ hồi chiêu thẻ bài.",
      zombieIds = listOf("ancient_dragon_boss", "gargantuar", "dragon_hatchling", "dragon_adult", "dragon_dark", "dragon_chemtech", "dragon_wind", "dragon_water", "quan_chua", "shen", "anivia", "thresh"),
      tacticalTip = "Trồng cây 0 Sun (chỉ chờ hồi chiêu)! Ưu tiên hạ Gargantuar thật nhanh hoặc dùng Đậu Độc trước khi cộng dồn khiên +500; giữ Plant Food và Cherry Bomb cho pha cuối Boss ≤100 HP!",
      isBoss = true,
      isSpecial = true
    ),
    LevelInfo(
      level = 13,
      title = "Sa Mạc Hoàng Đế Azir",
      subtitle = "BOSS AZIR 20.000 HP · TRỒNG 0 SUN · +10s CHUẨN BỊ",
      description = "Chiến trường sa mạc Shurima! Trồng cây miễn phí 0 Sun (vẫn chờ hồi chiêu) và có thêm 10s chuẩn bị (18s) trước khi Azir cùng quân đoàn xuất trận!",
      zombieIds = listOf("azir_desert_emperor", "renekton_croc", "nasus_hound", "sand_soldier", "sand_coffin", "basic", "conehead", "buckethead", "turquoise_skull", "jurassic_bully"),
      tacticalTip = "Trồng cây 0 Sun & có 18s chuẩn bị đầu trận! Chừa 2 cột cuối đặt chủ lực vì Lính Cát không trồi vào đó; dùng Bắp Cải/Dưa Hấu/Lux xuyên Quan Tài 800 HP và Cherry Bomb cho Phase 3!",
      isBoss = true,
      isSpecial = true
    ),
    LevelInfo(
      level = 14,
      title = "Tiền Đồn Thiết Huyết Nosus",
      subtitle = "Chiến Trường Nosus · Màn 1/3",
      description = "Đặt chân vào chiến hào thép thẫm máu của đế chế Nosus. Đẩy lùi Binh Sĩ Nosus, Sát Thủ Cuồng Huyết và Vệ Binh Khiên Sắt 750 HP!",
      zombieIds = listOf("nosus_thrall", "nosus_assassin", "nosus_shieldbearer"),
      tacticalTip = "Mang Magnet-shroom để hút bay Khiên Sắt 750 HP của Vệ Binh Nosus và dùng Snow Pea hãm tốc Sát Thủ Huyết Đao khi hắn kích hoạt Cuồng Huyết!"
    ),
    LevelInfo(
      level = 15,
      title = "Huyết Tế Pháo Đài Nosus",
      subtitle = "Chiến Trường Nosus · Màn 2/3",
      description = "Huyết Pháp Sư Nosus nhập trận bắn cầu máu tầm 2.5 ô và liên tục niệm Huyết Tế hồi máu, tăng tốc cho toàn quân xung quanh!",
      zombieIds = listOf("nosus_thrall", "nosus_assassin", "nosus_shieldbearer", "nosus_hemomancer"),
      tacticalTip = "Dùng Lux, Melon-pult hoặc Syndra sốc sát thương kết liễu Huyết Pháp Sư từ xa trước khi hắn niệm Huyết Tế hồi máu và buff tốc cho hàng Khiên Sắt!"
    ),
    LevelInfo(
      level = 16,
      title = "Đại Tướng Darius Nosus",
      subtitle = "Chiến Trường Nosus · Màn 3/3 (BOSS TƯỚNG)",
      description = "Trận quyết chiến tại trung tâm pháo đài Nosus! Toàn bộ 5 binh chủng tinh nhuệ tràn lên cùng song Đại Tướng Darius 3200 HP miễn khống chế.",
      zombieIds = listOf("nosus_thrall", "nosus_assassin", "nosus_shieldbearer", "nosus_hemomancer", "nosus_warlord"),
      tacticalTip = "Darius miễn Làm Chậm, Thôi Miên & Đẩy Lùi! Thay cây dưới 20% HP kịp thời để tránh Hành Quyết và dồn sát thương hạ nhanh khi hắn <100 HP (Bất Tử 4s · 1s/đòn + One-Hit)!",
      isBoss = true
    ),
    LevelInfo(
      level = 17,
      title = "Đền Hoa Anh Đào Ionia",
      subtitle = "Vùng Đất Ionia · Màn 1/3",
      description = "Bước vào đình viện hoa anh đào cổ kính của Ionia. Cẩn thận trước tốc độ chớp nhoáng 1.5s/ô và Dấu Ấn Tử Thần 300 DMG của Zed!",
      zombieIds = listOf("ionia_zed", "nosus_thrall", "nosus_assassin", "lang_khach"),
      tacticalTip = "Zed chạy cực nhanh (1.5s/ô) và khi vào máu tử sẽ miễn nhiễm lao tới gắn Dấu Ấn Tử Thần 300 DMG nổ sau 5s — đặt cây chắn phía trước hoặc dùng Karma buff khiên!"
    ),
    LevelInfo(
      level = 18,
      title = "Song Kiếm Linh Giới Ionia",
      subtitle = "Vùng Đất Ionia · Màn 2/3",
      description = "Yone nhập trận với song kiếm luân phiên 70 DMG & 12% MaxHP, Xuất Hồn (E) ở cột 6 và Đoạt Mệnh (R) lướt 2 ô hất tung toàn hàng!",
      zombieIds = listOf("ionia_zed", "ionia_yone", "nosus_thrall", "shen"),
      tacticalTip = "Phá hủy Thể Xác (350 HP) của Yone để kéo giật hắn về sớm trước 4.5s, đồng thời đề phòng vệt đỏ tụ lực 1.2s của chiêu Đoạt Mệnh (R)!"
    ),
    LevelInfo(
      level = 19,
      title = "Đấu Trường Đại Ca Sett",
      subtitle = "Vùng Đất Ionia · Màn 3/3 (MINI-BOSS)",
      description = "Quyết đấu tại đấu trường Ionia trước bộ ba Zed, Yone và Đại Ca Sett 3000 HP miễn thôi miên với Cuồng Thú Quyền (W) & Hủy Diệt Đấu Trường (R)!",
      zombieIds = listOf("ionia_zed", "ionia_yone", "ionia_sett"),
      tacticalTip = "Ahri không thể thôi miên Sett! Khi thanh Gan Lì (800) đầy, Sett tạo giáp 500 HP & đấm sóng 550 DMG; không xếp cây máu mỏng ngay sau Wall-nut/Galio để tránh bị Sett R ném đè nát!",
      isBoss = true
    ),
    LevelInfo(
      level = 20,
      title = "Bến Cảng Tử Thần",
      subtitle = "MÀN ĐẤU TRÙM · ZOMBOT ĐỒ TỂ 15.000 HP · KHÔNG SUN",
      description = "Chiến đấu trên sàn gỗ Cột 1–6 đối đầu Zombot Đồ Tể tuần tra vùng nước đen Cột 7–9! Không Sun, không Máy Cắt Cỏ: chọn 6 cây (cấm cây Sun), dàn tối đa 12→16 cây, dùng Xẻng thu hồi (1.2s CD, giữ nguyên HP) để né chiêu Q/E/R và săn Zombie Truy Nã!",
      zombieIds = listOf("zombot_pyke", "drowned_sailor", "anchor_bearer", "swimming_ghost", "wanted_captain"),
      tacticalTip = "Boss tích 40% sát thương thành Máu Xám (tối đa 800). Dùng Xẻng 1.2s thu hồi cây khỏi Dấu Chữ X (cảnh báo 2.2s/1.8s) để xóa sạch Máu Xám & khiến Boss kẹt 4s (chịu ×1.5 sát thương)! Săn Thuyền Trưởng Truy Nã mỗi 20s để hồi thẻ dùng 1 lần và tăng giới hạn cây!",
      isBoss = true,
      isSpecial = true
    )
  )
}

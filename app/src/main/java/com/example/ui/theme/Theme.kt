package com.example.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.ReadOnlyComposable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

@Immutable
data class PvZColorPalette(
  val obsidianBg: Color = ObsidianBg,
  val abyssNightBg: Color = AbyssNightBg,
  val midnightPlum: Color = MidnightPlum,
  val gothicPlumTop: Color = GothicPlumTop,
  val backdropScrim: Color = BackdropScrim,
  val plumSurface: Color = PlumSurface,
  val plumSurfaceElevated: Color = PlumSurfaceElevated,
  val plumSurfaceCard: Color = PlumSurfaceCard,
  val gothicTrayTop: Color = GothicTrayTop,
  val gothicTrayBottom: Color = GothicTrayBottom,
  val gothicTrayBorder: Color = GothicTrayBorder,
  val gothicTrayHighlight: Color = GothicTrayHighlight,
  val gothicModalTop: Color = GothicModalTop,
  val gothicModalBottom: Color = GothicModalBottom,
  val seedCardTop: Color = SeedCardTop,
  val seedCardBottom: Color = SeedCardBottom,
  val seedCardBorder: Color = SeedCardBorder,
  val almanacDeepTop: Color = AlmanacDeepTop,
  val almanacDeepBottom: Color = AlmanacDeepBottom,
  val almanacHeaderBg: Color = AlmanacHeaderBg,
  val almanacViolet: Color = AlmanacViolet,
  val almanacVioletDark: Color = AlmanacVioletDark,
  val almanacVioletBorder: Color = AlmanacVioletBorder,
  val almanacSelectedPlantBg: Color = AlmanacSelectedPlantBg,
  val almanacSelectedZombieBg: Color = AlmanacSelectedZombieBg,
  val crimsonSoul: Color = CrimsonSoul,
  val crimsonNeon: Color = CrimsonNeon,
  val crimsonBloodTop: Color = CrimsonBloodTop,
  val crimsonDark: Color = CrimsonDark,
  val crimsonDeep: Color = CrimsonDeep,
  val crimsonSoft: Color = CrimsonSoft,
  val coralAlert: Color = CoralAlert,
  val bossEmber: Color = BossEmber,
  val bossCardTop: Color = BossCardTop,
  val bossCardBottom: Color = BossCardBottom,
  val toxicLime: Color = ToxicLime,
  val toxicLimeBright: Color = ToxicLimeBright,
  val toxicForest: Color = ToxicForest,
  val amberGold: Color = AmberGold,
  val amberBright: Color = AmberBright,
  val amberWarmTop: Color = AmberWarmTop,
  val amberDeep: Color = AmberDeep,
  val rusticWoodTop: Color = RusticWoodTop,
  val rusticWoodBottom: Color = RusticWoodBottom,
  val rusticWoodBorder: Color = RusticWoodBorder,
  val iceCyan: Color = IceCyan,
  val tacticalTipBg: Color = TacticalIndigoBg,
  val tacticalTipBorder: Color = TacticalIndigoBorder,
  val tacticalTipText: Color = TacticalIndigoText,
  val steelSlateTop: Color = SteelSlateTop,
  val steelSlateBottom: Color = SteelSlateBottom,
  val steelSlateBorder: Color = SteelSlateBorder,
  val textPrimary: Color = TextPrimary,
  val textSecondary: Color = TextSecondary,
  val borderMauve: Color = BorderMauve,
  val borderSubtle: Color = BorderSubtle,
  val borderHighlightMauve: Color = BorderHighlightMauve,
  val desertSandTop: Color = DesertSandTop,
  val desertCardTop: Color = DesertCardTop,
  val desertCardBottom: Color = DesertCardBottom
) {
  val worldMapBackdropBrush: Brush
    get() = Brush.verticalGradient(listOf(midnightPlum, obsidianBg))

  val seedSelectionBackdropBrush: Brush
    get() = Brush.verticalGradient(listOf(gothicPlumTop, obsidianBg))

  val dragonSelectionBackdropBrush: Brush
    get() = Brush.verticalGradient(listOf(bossCardTop, obsidianBg))

  val desertSelectionBackdropBrush: Brush
    get() = Brush.verticalGradient(listOf(desertSandTop, obsidianBg))

  val gothicCardBrush: Brush
    get() = Brush.verticalGradient(listOf(plumSurfaceCard, plumSurfaceElevated))

  val gothicModalBrush: Brush
    get() = Brush.verticalGradient(listOf(gothicModalTop, gothicModalBottom))

  val bossCardBrush: Brush
    get() = Brush.verticalGradient(listOf(bossCardTop, bossCardBottom))

  val desertCardBrush: Brush
    get() = Brush.verticalGradient(listOf(desertCardTop, desertCardBottom))

  val rusticWoodBrush: Brush
    get() = Brush.verticalGradient(listOf(rusticWoodTop, rusticWoodBottom))
}

val PvZShapes = Shapes(
  extraSmall = RoundedCornerShape(4.dp),
  small = RoundedCornerShape(8.dp),
  medium = RoundedCornerShape(12.dp),
  large = RoundedCornerShape(14.dp),
  extraLarge = RoundedCornerShape(16.dp)
)

private val PvzDarkColorScheme = darkColorScheme(
  primary = CrimsonSoul,
  onPrimary = TextPrimary,
  primaryContainer = CrimsonDark,
  onPrimaryContainer = TextPrimary,
  secondary = ToxicLime,
  onSecondary = ObsidianBg,
  secondaryContainer = ToxicForest,
  onSecondaryContainer = TextPrimary,
  tertiary = AmberGold,
  onTertiary = ObsidianBg,
  tertiaryContainer = AmberDeep,
  onTertiaryContainer = TextPrimary,
  background = ObsidianBg,
  onBackground = TextPrimary,
  surface = PlumSurface,
  onSurface = TextPrimary,
  surfaceVariant = PlumSurfaceElevated,
  onSurfaceVariant = TextSecondary,
  outline = BorderMauve,
  outlineVariant = BorderSubtle,
  error = CrimsonSoft,
  onError = ObsidianBg
)

private val LocalPvZColors = staticCompositionLocalOf { PvZColorPalette() }
private val LocalPvZGothicTypography = staticCompositionLocalOf { PvZGothicTypography() }

object PvZTheme {
  val colors: PvZColorPalette
    @Composable
    @ReadOnlyComposable
    get() = LocalPvZColors.current

  val typography: Typography
    @Composable
    @ReadOnlyComposable
    get() = MaterialTheme.typography

  val gothicTypography: PvZGothicTypography
    @Composable
    @ReadOnlyComposable
    get() = LocalPvZGothicTypography.current

  val shapes: Shapes
    @Composable
    @ReadOnlyComposable
    get() = MaterialTheme.shapes
}

@Composable
fun PvZTheme(
  colors: PvZColorPalette = PvZColorPalette(),
  gothicTypography: PvZGothicTypography = PvZGothicTypography(),
  content: @Composable () -> Unit
) {
  CompositionLocalProvider(
    LocalPvZColors provides colors,
    LocalPvZGothicTypography provides gothicTypography
  ) {
    MaterialTheme(
      colorScheme = PvzDarkColorScheme,
      typography = Typography,
      shapes = PvZShapes,
      content = content
    )
  }
}

@Composable
fun MyApplicationTheme(
  content: @Composable () -> Unit,
) {
  PvZTheme(content = content)
}

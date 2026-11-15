package com.example.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.runtime.Immutable
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.example.R

val DisplayFontFamily = FontFamily(
  Font(R.font.be_vietnam_pro, FontWeight.SemiBold),
  Font(R.font.be_vietnam_pro, FontWeight.Bold),
  Font(R.font.be_vietnam_pro, FontWeight.ExtraBold)
)

val BodyFontFamily = FontFamily(
  Font(R.font.plus_jakarta_sans, FontWeight.Normal),
  Font(R.font.plus_jakarta_sans, FontWeight.Medium),
  Font(R.font.plus_jakarta_sans, FontWeight.SemiBold),
  Font(R.font.plus_jakarta_sans, FontWeight.Bold)
)

private val GothicTitleShadow = Shadow(
  color = Color.Black.copy(alpha = 0.72f),
  offset = Offset(0f, 3f),
  blurRadius = 6f
)

// Mirrors style.css scale, high-weight Gothic headers, tight tracking & crisp Vietnamese readability
val Typography = Typography(
  displayLarge = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 36.sp,
    lineHeight = 42.sp,
    letterSpacing = 0.8.sp,
    shadow = GothicTitleShadow
  ),
  displayMedium = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 30.sp,
    lineHeight = 36.sp,
    letterSpacing = 0.6.sp,
    shadow = GothicTitleShadow
  ),
  displaySmall = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 26.sp,
    lineHeight = 32.sp,
    letterSpacing = 0.6.sp,
    shadow = GothicTitleShadow
  ),
  headlineLarge = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 24.sp,
    lineHeight = 30.sp,
    letterSpacing = 0.8.sp,
    shadow = GothicTitleShadow
  ),
  headlineMedium = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 22.sp,
    lineHeight = 28.sp,
    letterSpacing = 0.6.sp,
    shadow = GothicTitleShadow
  ),
  headlineSmall = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 20.sp,
    lineHeight = 26.sp,
    letterSpacing = 0.4.sp
  ),
  titleLarge = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 18.sp,
    lineHeight = 24.sp,
    letterSpacing = 0.4.sp
  ),
  titleMedium = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 15.sp,
    lineHeight = 20.sp,
    letterSpacing = 0.3.sp
  ),
  titleSmall = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.SemiBold,
    fontSize = 13.sp,
    lineHeight = 18.sp,
    letterSpacing = 0.2.sp
  ),
  bodyLarge = TextStyle(
    fontFamily = BodyFontFamily,
    fontWeight = FontWeight.Normal,
    fontSize = 14.sp,
    lineHeight = 21.sp
  ),
  bodyMedium = TextStyle(
    fontFamily = BodyFontFamily,
    fontWeight = FontWeight.Normal,
    fontSize = 13.sp,
    lineHeight = 19.sp
  ),
  bodySmall = TextStyle(
    fontFamily = BodyFontFamily,
    fontWeight = FontWeight.Normal,
    fontSize = 11.sp,
    lineHeight = 16.sp
  ),
  labelLarge = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 13.sp,
    lineHeight = 16.sp,
    letterSpacing = 0.5.sp
  ),
  labelMedium = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 11.sp,
    lineHeight = 14.sp,
    letterSpacing = 0.4.sp
  ),
  labelSmall = TextStyle(
    fontFamily = BodyFontFamily,
    fontWeight = FontWeight.Bold,
    fontSize = 10.sp,
    lineHeight = 12.sp,
    letterSpacing = 0.3.sp
  )
)

@Immutable
data class PvZGothicTypography(
  val dialogTitle: TextStyle = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 22.sp,
    lineHeight = 28.sp,
    letterSpacing = 0.9.sp,
    shadow = GothicTitleShadow
  ),
  val hudCounter: TextStyle = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 13.sp,
    lineHeight = 14.sp,
    letterSpacing = 0.5.sp,
    fontFeatureSettings = "tnum"
  ),
  val hudBadge: TextStyle = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 11.sp,
    lineHeight = 13.sp,
    letterSpacing = 0.5.sp
  ),
  val cardCost: TextStyle = TextStyle(
    fontFamily = BodyFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 10.sp,
    lineHeight = 11.sp,
    fontFeatureSettings = "tnum"
  ),
  val almanacTitle: TextStyle = TextStyle(
    fontFamily = DisplayFontFamily,
    fontWeight = FontWeight.ExtraBold,
    fontSize = 16.sp,
    lineHeight = 20.sp,
    letterSpacing = 0.5.sp
  )
)

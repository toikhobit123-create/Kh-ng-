package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.MenuBook
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.Star
import androidx.compose.material.icons.filled.Whatshot
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.model.CampaignProgress
import com.example.model.LevelInfo
import com.example.model.PvzCatalog
import com.example.ui.components.HudIconChip
import com.example.ui.theme.AmberGold
import com.example.ui.theme.CrimsonDark
import com.example.ui.theme.CrimsonSoul
import com.example.ui.theme.PlumSurface
import com.example.ui.theme.PlumSurfaceCard
import com.example.ui.theme.PlumSurfaceElevated
import com.example.ui.theme.PvZTheme
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.theme.ToxicLime

@Composable
fun WorldMapScreen(
  progress: CampaignProgress,
  respectCutoutInsets: Boolean,
  onSelectLevel: (Int) -> Unit,
  onResetProgress: () -> Unit,
  onOpenAlmanac: () -> Unit,
  onOpenSettings: () -> Unit,
  onBack: () -> Unit
) {
  var showResetDialog by remember { mutableStateOf(false) }
  val nextLevel = remember(progress.completedLevels) {
    (1..16).firstOrNull { !progress.completedLevels.contains(it) } ?: 16
  }

  val insetsModifier = if (respectCutoutInsets) {
    Modifier.windowInsetsPadding(WindowInsets.safeDrawing)
  } else {
    Modifier
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(PvZTheme.colors.worldMapBackdropBrush)
      .then(insetsModifier)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 16.dp, vertical = 10.dp),
      verticalArrangement = Arrangement.spacedBy(10.dp)
    ) {
      // Top Navigation Bar
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(10.dp)
        ) {
          HudIconChip(
            onClick = onBack,
            icon = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "Quay lại menu chính",
            label = "Menu",
            modifier = Modifier.testTag("world_map_back_btn")
          )
          Column {
            Text(
              text = "BẢN ĐỒ CHIẾN DỊCH (16 CẤP)",
              style = MaterialTheme.typography.headlineSmall,
              color = ToxicLime
            )
            Text(
              text = "Chọn cấp độ để lập đội hình 7 cây và phòng thủ",
              style = MaterialTheme.typography.bodySmall,
              color = TextSecondary
            )
          }
        }

        Row(
          horizontalArrangement = Arrangement.spacedBy(8.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Surface(
            color = PlumSurfaceElevated,
            shape = RoundedCornerShape(10.dp),
            border = BorderStroke(1.dp, AmberGold.copy(alpha = 0.7f))
          ) {
            Row(
              modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(4.dp)
            ) {
              Icon(
                imageVector = Icons.Filled.Star,
                contentDescription = null,
                tint = AmberGold,
                modifier = Modifier.size(15.dp)
              )
              Text(
                text = "${progress.completedLevels.size}/16",
                style = MaterialTheme.typography.labelLarge,
                color = AmberGold
              )
            }
          }
          HudIconChip(
            onClick = { onSelectLevel(nextLevel) },
            icon = Icons.Filled.PlayArrow,
            contentDescription = "Chơi tiếp cấp $nextLevel",
            label = "Cấp $nextLevel",
            tint = ToxicLime,
            borderColor = ToxicLime,
            modifier = Modifier.testTag("world_map_quick_play_btn")
          )
          HudIconChip(
            onClick = onOpenAlmanac,
            icon = Icons.Filled.MenuBook,
            contentDescription = "Từ điển",
            label = "Từ Điển",
            modifier = Modifier.testTag("world_map_almanac_btn")
          )
          HudIconChip(
            onClick = onOpenSettings,
            icon = Icons.Filled.Settings,
            contentDescription = "Cài đặt",
            label = "Cài Đặt",
            modifier = Modifier.testTag("world_map_settings_btn")
          )
          HudIconChip(
            onClick = { showResetDialog = true },
            icon = Icons.Filled.RestartAlt,
            contentDescription = "Đặt lại tiến trình",
            containerColor = CrimsonDark.copy(alpha = 0.8f),
            borderColor = CrimsonSoul,
            modifier = Modifier.testTag("world_map_reset_btn")
          )
        }
      }

      // 2x3 Landscape Grid of 6 Levels
      LazyVerticalGrid(
        columns = GridCells.Fixed(3),
        modifier = Modifier.weight(1f),
        contentPadding = PaddingValues(vertical = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp)
      ) {
        items(PvzCatalog.levels, key = { it.level }) { level ->
          val isCompleted = progress.completedLevels.contains(level.level)
          LevelCardItem(
            levelInfo = level,
            isCompleted = isCompleted,
            onClick = { onSelectLevel(level.level) }
          )
        }
      }
    }
  }

  if (showResetDialog) {
    AlertDialog(
      onDismissRequest = { showResetDialog = false },
      containerColor = PlumSurface,
      titleContentColor = AmberGold,
      textContentColor = TextPrimary,
      title = { Text("Đặt lại tiến trình?") },
      text = {
        Text("Lịch sử hoàn thành sao các màn chơi sẽ được xóa về trạng thái ban đầu (các màn vẫn mở để bạn chơi tự do).")
      },
      confirmButton = {
        TextButton(
          onClick = {
            showResetDialog = false
            onResetProgress()
          },
          colors = ButtonDefaults.textButtonColors(contentColor = CrimsonSoul)
        ) {
          Text("Đặt Lại")
        }
      },
      dismissButton = {
        TextButton(onClick = { showResetDialog = false }) {
          Text("Hủy", color = TextSecondary)
        }
      }
    )
  }
}

@Composable
private fun LevelCardItem(
  levelInfo: LevelInfo,
  isCompleted: Boolean,
  onClick: () -> Unit
) {
  val isNosus = levelInfo.level in 14..16
  val borderColor = when {
    levelInfo.isSpecial -> AmberGold
    levelInfo.isBoss -> CrimsonSoul
    isNosus -> PvZTheme.colors.nosusBorderCrimson
    isCompleted -> AmberGold
    else -> ToxicLime.copy(alpha = 0.7f)
  }
  val bgBrush = when {
    isNosus -> PvZTheme.colors.nosusCardBrush
    levelInfo.level == 13 -> PvZTheme.colors.desertCardBrush
    levelInfo.isBoss || levelInfo.isSpecial -> PvZTheme.colors.bossCardBrush
    else -> PvZTheme.colors.gothicCardBrush
  }

  Surface(
    modifier = Modifier
      .fillMaxWidth()
      .minimumInteractiveComponentSize()
      .clip(RoundedCornerShape(14.dp))
      .clickable(onClick = onClick)
      .testTag("level_card_${levelInfo.level}"),
    shape = RoundedCornerShape(14.dp),
    color = PlumSurfaceCard,
    border = BorderStroke(1.6.dp, borderColor),
    shadowElevation = 6.dp
  ) {
    Column(
      modifier = Modifier
        .background(bgBrush)
        .padding(10.dp),
      verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Surface(
          color = if (levelInfo.isBoss || levelInfo.isSpecial || isNosus) CrimsonDark else PlumSurface,
          shape = RoundedCornerShape(6.dp),
          border = BorderStroke(1.dp, borderColor.copy(alpha = 0.6f))
        ) {
          Row(
            modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp)
          ) {
            if (levelInfo.isBoss || levelInfo.isSpecial || isNosus) {
              Icon(
                imageVector = Icons.Filled.Whatshot,
                contentDescription = null,
                tint = if (isNosus) PvZTheme.colors.crimsonSoft else AmberGold,
                modifier = Modifier.size(13.dp)
              )
            }
            Text(
              text = when {
                isNosus -> "NOSUS · CẤP ${levelInfo.level}"
                levelInfo.isBoss && levelInfo.isSpecial -> "BOSS SPECIAL · CẤP ${levelInfo.level}"
                levelInfo.isSpecial -> "SPECIAL · CẤP ${levelInfo.level}"
                else -> "CẤP ${levelInfo.level}"
              },
              style = MaterialTheme.typography.labelSmall,
              color = when {
                isNosus -> PvZTheme.colors.crimsonSoft
                levelInfo.isBoss || levelInfo.isSpecial -> AmberGold
                else -> ToxicLime
              }
            )
          }
        }

        if (isCompleted) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp)
          ) {
            Icon(
              imageVector = Icons.Filled.Star,
              contentDescription = "Đã qua màn",
              tint = AmberGold,
              modifier = Modifier.size(15.dp)
            )
            Text(
              text = "HOÀN THÀNH",
              style = MaterialTheme.typography.labelSmall,
              color = AmberGold
            )
          }
        } else {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(3.dp)
          ) {
            Icon(
              imageVector = Icons.Filled.CheckCircle,
              contentDescription = "Đã mở",
              tint = if (isNosus) PvZTheme.colors.crimsonSoft else if (levelInfo.isSpecial) AmberGold else ToxicLime,
              modifier = Modifier.size(14.dp)
            )
            Text(
              text = when {
                levelInfo.isConveyor -> "BĂNG CHUYỀN"
                levelInfo.level == 16 -> "DARIUS NOSUS"
                levelInfo.level == 15 -> "MÀN 2/3 · NOSUS"
                levelInfo.level == 14 -> "MÀN 1/3 · NOSUS"
                levelInfo.level == 13 -> "SA MẠC AZIR"
                levelInfo.isBoss && levelInfo.isSpecial -> "LONG VƯƠNG"
                levelInfo.isSpecial -> "LONG TỘC"
                else -> "SẴN SÀNG"
              },
              style = MaterialTheme.typography.labelSmall,
              color = if (isNosus) PvZTheme.colors.crimsonSoft else if (levelInfo.isSpecial) AmberGold else ToxicLime
            )
          }
        }
      }

      Text(
        text = levelInfo.title,
        style = MaterialTheme.typography.titleMedium,
        color = TextPrimary,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
      )

      Text(
        text = levelInfo.subtitle,
        style = MaterialTheme.typography.bodySmall,
        fontWeight = FontWeight.SemiBold,
        color = if (levelInfo.isBoss || levelInfo.isSpecial || isNosus) PvZTheme.colors.bossEmber else AmberGold,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis
      )

      Text(
        text = levelInfo.description,
        style = MaterialTheme.typography.bodySmall,
        color = TextSecondary,
        maxLines = 2,
        overflow = TextOverflow.Ellipsis
      )

      Spacer(Modifier.weight(1f, fill = false))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.End,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Icon(
          imageVector = Icons.Filled.PlayArrow,
          contentDescription = null,
          tint = borderColor,
          modifier = Modifier.size(16.dp)
        )
        Spacer(Modifier.width(4.dp))
        Text(
          text = if (levelInfo.isConveyor) "Vào trận ngay" else "Chọn đội hình",
          style = MaterialTheme.typography.labelSmall,
          color = borderColor
        )
      }
    }
  }
}

package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.AutoFixHigh
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.minimumInteractiveComponentSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.model.PlantCatalogItem
import com.example.model.PvzCatalog
import com.example.model.ZombieCatalogItem
import com.example.ui.components.GothicActionButton
import com.example.ui.components.HudIconChip
import com.example.ui.components.PlantIconView
import com.example.ui.theme.AmberDeep
import com.example.ui.theme.AmberGold
import com.example.ui.theme.BorderMauve
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.CrimsonDark
import com.example.ui.theme.CrimsonSoul
import com.example.ui.theme.IceCyan
import com.example.ui.theme.ObsidianBg
import com.example.ui.theme.PlumSurface
import com.example.ui.theme.PlumSurfaceCard
import com.example.ui.theme.PlumSurfaceElevated
import com.example.ui.theme.PvZTheme
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.theme.ToxicForest
import com.example.ui.theme.ToxicLime

@Composable
fun SandboxSelectionScreen(
  selectedPlants: List<String>,
  selectedZombies: List<String>,
  plantIcons: Map<String, ImageBitmap>,
  respectCutoutInsets: Boolean,
  onTogglePlant: (String) -> Unit,
  onRemovePlant: (String) -> Unit,
  onToggleZombie: (String) -> Unit,
  onRemoveZombie: (String) -> Unit,
  onAutoPickLoadout: () -> Unit,
  onClearPlants: () -> Unit,
  onClearZombies: () -> Unit,
  onStartSandbox: () -> Unit,
  onBackToMenu: () -> Unit
) {
  var activeTab by remember { mutableIntStateOf(0) } // 0 = Plants, 1 = Zombies
  var previewPlantId by remember { mutableStateOf(selectedPlants.firstOrNull() ?: "peashooter") }
  var previewZombieId by remember { mutableStateOf(selectedZombies.firstOrNull() ?: "dragon_wind") }

  val previewPlant = PvzCatalog.plantById[previewPlantId] ?: PvzCatalog.plants.first()
  val previewZombie = PvzCatalog.zombieById[previewZombieId] ?: PvzCatalog.zombies.first()

  val insetsModifier = if (respectCutoutInsets) {
    Modifier.windowInsetsPadding(WindowInsets.safeDrawing)
  } else {
    Modifier
  }

  Box(
    modifier = Modifier
      .fillMaxSize()
      .background(PvZTheme.colors.seedSelectionBackdropBrush)
      .then(insetsModifier)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 12.dp, vertical = 8.dp),
      verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
      // Top Header
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(10.dp),
          modifier = Modifier.weight(1f)
        ) {
          HudIconChip(
            onClick = onBackToMenu,
            icon = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "Quay lại Menu Chính",
            label = "Menu",
            modifier = Modifier.testTag("sandbox_back_to_menu_btn")
          )
          Column {
            Row(
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
              Icon(
                imageVector = Icons.Filled.Build,
                contentDescription = null,
                tint = AmberGold,
                modifier = Modifier.size(18.dp)
              )
              Text(
                text = "CHUẨN BỊ SANDBOX · 8 CÂY & 8 ZOMBIE",
                style = MaterialTheme.typography.titleMedium,
                color = AmberGold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis
              )
            }
            Text(
              text = "Chọn tối đa 8 Cây và 8 Zombie trước khi vào sân để tránh quá tải giao diện",
              style = MaterialTheme.typography.bodySmall,
              color = TextSecondary,
              maxLines = 1,
              overflow = TextOverflow.Ellipsis
            )
          }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
          Surface(
            modifier = Modifier
              .clip(RoundedCornerShape(10.dp))
              .clickable { activeTab = 0 },
            color = if (activeTab == 0) ToxicForest.copy(alpha = 0.7f) else PlumSurfaceElevated,
            shape = RoundedCornerShape(10.dp),
            border = BorderStroke(
              1.2.dp,
              if (selectedPlants.size == 8) ToxicLime else AmberGold
            )
          ) {
            Text(
              text = "🌿 Cây: ${selectedPlants.size}/8",
              style = MaterialTheme.typography.labelMedium,
              color = if (selectedPlants.size == 8) ToxicLime else AmberGold,
              modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
            )
          }

          Surface(
            modifier = Modifier
              .clip(RoundedCornerShape(10.dp))
              .clickable { activeTab = 1 },
            color = if (activeTab == 1) CrimsonDark.copy(alpha = 0.75f) else PlumSurfaceElevated,
            shape = RoundedCornerShape(10.dp),
            border = BorderStroke(
              1.2.dp,
              if (selectedZombies.size == 8) CrimsonSoul else AmberGold
            )
          ) {
            Text(
              text = "🧟 Zombie: ${selectedZombies.size}/8",
              style = MaterialTheme.typography.labelMedium,
              color = if (selectedZombies.size == 8) CrimsonSoul else AmberGold,
              modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp)
            )
          }
        }
      }

      // Main 2-Pane Landscape Setup
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .weight(1f),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        // Left/Center Pool Selector
        Column(
          modifier = Modifier
            .weight(1f)
            .fillMaxHeight(),
          verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
          // Segmented Tab Row + Quick Tools
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            val tabs = listOf(
              "🌿 Chọn Cây (${selectedPlants.size}/8)",
              "🧟 Chọn Zombie (${selectedZombies.size}/8)"
            )
            tabs.forEachIndexed { idx, label ->
              val selected = activeTab == idx
              Surface(
                modifier = Modifier
                  .weight(1f)
                  .minimumInteractiveComponentSize()
                  .clip(RoundedCornerShape(9.dp))
                  .clickable { activeTab = idx }
                  .testTag("sandbox_setup_tab_$idx"),
                color = if (selected) {
                  if (idx == 0) ToxicForest else CrimsonDark
                } else {
                  PlumSurfaceElevated
                },
                border = BorderStroke(
                  1.4.dp,
                  if (selected) (if (idx == 0) ToxicLime else CrimsonSoul) else BorderSubtle
                ),
                shape = RoundedCornerShape(9.dp)
              ) {
                Box(
                  modifier = Modifier.padding(vertical = 8.dp, horizontal = 8.dp),
                  contentAlignment = Alignment.Center
                ) {
                  Text(
                    text = label,
                    style = MaterialTheme.typography.labelLarge,
                    color = if (selected) TextPrimary else TextSecondary,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                  )
                }
              }
            }

            HudIconChip(
              onClick = onAutoPickLoadout,
              icon = Icons.Filled.AutoFixHigh,
              contentDescription = "Tự động chọn 8 cây & 8 zombie",
              label = "Mặc Định 8+8",
              tint = ToxicLime,
              modifier = Modifier.testTag("sandbox_auto_pick_btn")
            )
            HudIconChip(
              onClick = { if (activeTab == 0) onClearPlants() else onClearZombies() },
              icon = Icons.Filled.DeleteSweep,
              contentDescription = "Xóa danh sách hiện tại",
              label = "Xóa",
              tint = CrimsonSoul,
              modifier = Modifier.testTag("sandbox_clear_current_btn")
            )
          }

          if (activeTab == 0) {
            SandboxPlantShowcaseStrip(
              plant = previewPlant,
              inDeck = selectedPlants.contains(previewPlant.id),
              plantIcons = plantIcons,
              onToggle = { onTogglePlant(previewPlant.id) }
            )

            Surface(
              modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
              shape = RoundedCornerShape(12.dp),
              color = PlumSurface.copy(alpha = 0.85f),
              border = BorderStroke(1.2.dp, BorderSubtle)
            ) {
              LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 72.dp),
                contentPadding = PaddingValues(6.dp),
                horizontalArrangement = Arrangement.spacedBy(6.dp),
                verticalArrangement = Arrangement.spacedBy(6.dp)
              ) {
                items(PvzCatalog.plants, key = { it.id }) { plant ->
                  val chosen = selectedPlants.contains(plant.id)
                  val isPreview = previewPlantId == plant.id
                  val border = when {
                    isPreview -> IceCyan
                    chosen -> ToxicLime
                    else -> BorderSubtle
                  }
                  Box(
                    modifier = Modifier
                      .minimumInteractiveComponentSize()
                      .defaultMinSize(minHeight = 60.dp)
                      .clip(RoundedCornerShape(8.dp))
                      .background(if (chosen) ToxicForest.copy(alpha = 0.35f) else PlumSurfaceElevated)
                      .border(if (isPreview || chosen) 1.6.dp else 1.dp, border, RoundedCornerShape(8.dp))
                      .clickable {
                        previewPlantId = plant.id
                        onTogglePlant(plant.id)
                      }
                      .padding(4.dp)
                      .testTag("sb_pick_plant_${plant.id}")
                  ) {
                    Column(
                      modifier = Modifier.fillMaxWidth(),
                      horizontalAlignment = Alignment.CenterHorizontally,
                      verticalArrangement = Arrangement.spacedBy(2.dp)
                    ) {
                      PlantIconView(plantId = plant.id, plantIcons = plantIcons, size = 30.dp)
                      Text(
                        text = plant.shortName,
                        style = MaterialTheme.typography.labelSmall,
                        color = TextPrimary,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                      )
                      Text(
                        text = "${plant.cost} ☀",
                        style = MaterialTheme.typography.labelSmall,
                        color = AmberGold
                      )
                    }
                    if (chosen) {
                      Box(
                        modifier = Modifier
                          .align(Alignment.TopEnd)
                          .size(16.dp)
                          .clip(CircleShape)
                          .background(ToxicLime),
                        contentAlignment = Alignment.Center
                      ) {
                        Icon(
                          imageVector = Icons.Filled.Check,
                          contentDescription = "Đã chọn",
                          tint = ObsidianBg,
                          modifier = Modifier.size(11.dp)
                        )
                      }
                    }
                  }
                }
              }
            }
          } else {
            SandboxZombieShowcaseStrip(
              zombie = previewZombie,
              selected = selectedZombies.contains(previewZombie.id),
              onToggle = { onToggleZombie(previewZombie.id) }
            )

            Surface(
              modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
              shape = RoundedCornerShape(12.dp),
              color = PlumSurface.copy(alpha = 0.85f),
              border = BorderStroke(1.2.dp, BorderSubtle)
            ) {
              LazyVerticalGrid(
                columns = GridCells.Adaptive(minSize = 136.dp),
                contentPadding = PaddingValues(8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp)
              ) {
                items(PvzCatalog.zombies, key = { it.id }) { zombie ->
                  val chosen = selectedZombies.contains(zombie.id)
                  val isPreview = previewZombieId == zombie.id
                  val border = when {
                    isPreview -> IceCyan
                    chosen -> CrimsonSoul
                    else -> BorderSubtle
                  }
                  Box(
                    modifier = Modifier
                      .minimumInteractiveComponentSize()
                      .defaultMinSize(minHeight = 64.dp)
                      .clip(RoundedCornerShape(10.dp))
                      .background(
                        when {
                          chosen -> CrimsonDark.copy(alpha = 0.45f)
                          zombie.isBoss -> CrimsonDark.copy(alpha = 0.22f)
                          else -> PlumSurfaceElevated
                        }
                      )
                      .border(if (isPreview || chosen) 1.6.dp else 1.dp, border, RoundedCornerShape(10.dp))
                      .clickable {
                        previewZombieId = zombie.id
                        onToggleZombie(zombie.id)
                      }
                      .padding(horizontal = 10.dp, vertical = 8.dp)
                      .testTag("sb_pick_zombie_${zombie.id}")
                  ) {
                    Row(
                      modifier = Modifier.fillMaxWidth(),
                      verticalAlignment = Alignment.CenterVertically,
                      horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                      Text(text = zombie.avatarEmoji, style = MaterialTheme.typography.titleLarge)
                      Column(modifier = Modifier.weight(1f)) {
                        Text(
                          text = zombie.name,
                          style = MaterialTheme.typography.labelMedium,
                          color = TextPrimary,
                          maxLines = 2,
                          overflow = TextOverflow.Ellipsis
                        )
                        Text(
                          text = zombie.hpText,
                          style = MaterialTheme.typography.labelSmall,
                          color = AmberGold,
                          maxLines = 1,
                          overflow = TextOverflow.Ellipsis
                        )
                      }
                    }
                    if (chosen) {
                      Box(
                        modifier = Modifier
                          .align(Alignment.TopEnd)
                          .size(16.dp)
                          .clip(CircleShape)
                          .background(CrimsonSoul),
                        contentAlignment = Alignment.Center
                      ) {
                        Icon(
                          imageVector = Icons.Filled.Check,
                          contentDescription = "Đã chọn",
                          tint = TextPrimary,
                          modifier = Modifier.size(11.dp)
                        )
                      }
                    }
                  }
                }
              }
            }
          }
        }

        // Right Pane: Selected 8 Plants + 8 Zombies Summary & Launch CTA
        Column(
          modifier = Modifier
            .width(248.dp)
            .fillMaxHeight(),
          verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
          Surface(
            modifier = Modifier
              .fillMaxWidth()
              .weight(1f),
            shape = RoundedCornerShape(12.dp),
            color = PlumSurface.copy(alpha = 0.92f),
            border = BorderStroke(1.2.dp, BorderSubtle)
          ) {
            LazyColumn(
              modifier = Modifier
                .fillMaxSize()
                .padding(8.dp),
              verticalArrangement = Arrangement.spacedBy(5.dp)
            ) {
              item {
                Text(
                  text = "🌿 CÂY ĐÃ CHỌN (${selectedPlants.size}/8)",
                  style = MaterialTheme.typography.labelMedium,
                  color = ToxicLime
                )
              }
              if (selectedPlants.isEmpty()) {
                item {
                  Text(
                    text = "Chưa chọn (sẽ dùng 8 cây mặc định)",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                  )
                }
              } else {
                items(selectedPlants, key = { "sel_p_$it" }) { plantId ->
                  val plant = PvzCatalog.plantById[plantId]
                  if (plant != null) {
                    Surface(
                      modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(7.dp))
                        .clickable {
                          previewPlantId = plant.id
                          onRemovePlant(plant.id)
                        },
                      shape = RoundedCornerShape(7.dp),
                      color = ToxicForest.copy(alpha = 0.28f),
                      border = BorderStroke(1.dp, ToxicLime.copy(alpha = 0.55f))
                    ) {
                      Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                      ) {
                        PlantIconView(plantId = plant.id, plantIcons = plantIcons, size = 22.dp)
                        Text(
                          text = plant.shortName,
                          style = MaterialTheme.typography.labelSmall,
                          color = TextPrimary,
                          modifier = Modifier.weight(1f),
                          maxLines = 1,
                          overflow = TextOverflow.Ellipsis
                        )
                        Icon(
                          imageVector = Icons.Filled.Close,
                          contentDescription = "Gỡ ${plant.shortName}",
                          tint = CrimsonSoul,
                          modifier = Modifier.size(14.dp)
                        )
                      }
                    }
                  }
                }
              }

              item {
                Spacer(Modifier.height(4.dp))
                Text(
                  text = "🧟 ZOMBIE ĐÃ CHỌN (${selectedZombies.size}/8)",
                  style = MaterialTheme.typography.labelMedium,
                  color = CrimsonSoul
                )
              }
              if (selectedZombies.isEmpty()) {
                item {
                  Text(
                    text = "Chưa chọn (sẽ dùng 8 zombie mặc định)",
                    style = MaterialTheme.typography.bodySmall,
                    color = TextSecondary
                  )
                }
              } else {
                items(selectedZombies, key = { "sel_z_$it" }) { zId ->
                  val zombie = PvzCatalog.zombieById[zId]
                  if (zombie != null) {
                    Surface(
                      modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(7.dp))
                        .clickable {
                          previewZombieId = zombie.id
                          onRemoveZombie(zombie.id)
                        },
                      shape = RoundedCornerShape(7.dp),
                      color = CrimsonDark.copy(alpha = 0.35f),
                      border = BorderStroke(1.dp, CrimsonSoul.copy(alpha = 0.6f))
                    ) {
                      Row(
                        modifier = Modifier.padding(horizontal = 6.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                      ) {
                        Text(text = zombie.avatarEmoji, style = MaterialTheme.typography.labelMedium)
                        Text(
                          text = zombie.name,
                          style = MaterialTheme.typography.labelSmall,
                          color = TextPrimary,
                          modifier = Modifier.weight(1f),
                          maxLines = 1,
                          overflow = TextOverflow.Ellipsis
                        )
                        Icon(
                          imageVector = Icons.Filled.Close,
                          contentDescription = "Gỡ ${zombie.name}",
                          tint = CrimsonSoul,
                          modifier = Modifier.size(14.dp)
                        )
                      }
                    }
                  }
                }
              }
            }
          }

          GothicActionButton(
            onClick = onStartSandbox,
            modifier = Modifier
              .fillMaxWidth()
              .testTag("btn_enter_sandbox"),
            containerColor = AmberDeep,
            borderColor = AmberGold
          ) {
            Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(20.dp))
            Spacer(Modifier.width(6.dp))
            Text(
              text = if (selectedPlants.isEmpty() || selectedZombies.isEmpty()) {
                "VÀO SANDBOX (MẶC ĐỊNH)"
              } else {
                "VÀO SANDBOX (${selectedPlants.size}C · ${selectedZombies.size}Z)"
              },
              style = MaterialTheme.typography.labelLarge
            )
          }
        }
      }
    }
  }
}

@Composable
private fun SandboxPlantShowcaseStrip(
  plant: PlantCatalogItem,
  inDeck: Boolean,
  plantIcons: Map<String, ImageBitmap>,
  onToggle: () -> Unit
) {
  Surface(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    color = PlumSurfaceCard,
    border = BorderStroke(1.2.dp, BorderMauve)
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
      Box(
        modifier = Modifier
          .size(42.dp)
          .clip(RoundedCornerShape(10.dp))
          .background(ObsidianBg)
          .border(1.dp, plant.accentColor.copy(alpha = 0.7f), RoundedCornerShape(10.dp)),
        contentAlignment = Alignment.Center
      ) {
        PlantIconView(plantId = plant.id, plantIcons = plantIcons, size = 34.dp)
      }

      Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(6.dp)) {
          Text(
            text = plant.fullName,
            style = MaterialTheme.typography.titleSmall,
            color = TextPrimary,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
          )
          Surface(color = AmberDeep, shape = RoundedCornerShape(6.dp)) {
            Row(
              modifier = Modifier.padding(horizontal = 6.dp, vertical = 1.dp),
              verticalAlignment = Alignment.CenterVertically
            ) {
              Icon(Icons.Filled.WbSunny, contentDescription = null, tint = AmberGold, modifier = Modifier.size(11.dp))
              Spacer(Modifier.width(2.dp))
              Text("${plant.cost}", style = MaterialTheme.typography.labelSmall, color = TextPrimary)
            }
          }
        }
        Text(
          text = plant.description,
          style = MaterialTheme.typography.bodySmall,
          color = TextSecondary,
          maxLines = 2,
          overflow = TextOverflow.Ellipsis
        )
      }

      Surface(
        modifier = Modifier
          .minimumInteractiveComponentSize()
          .clip(RoundedCornerShape(8.dp))
          .clickable(onClick = onToggle),
        color = if (inDeck) CrimsonDark else ToxicForest,
        border = BorderStroke(1.dp, if (inDeck) CrimsonSoul else ToxicLime),
        shape = RoundedCornerShape(8.dp)
      ) {
        Row(
          modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
          Icon(
            imageVector = if (inDeck) Icons.Filled.Close else Icons.Filled.Add,
            contentDescription = null,
            tint = TextPrimary,
            modifier = Modifier.size(16.dp)
          )
          Text(
            text = if (inDeck) "Bỏ" else "Chọn",
            style = MaterialTheme.typography.labelLarge,
            color = TextPrimary
          )
        }
      }
    }
  }
}

@Composable
private fun SandboxZombieShowcaseStrip(
  zombie: ZombieCatalogItem,
  selected: Boolean,
  onToggle: () -> Unit
) {
  Surface(
    modifier = Modifier.fillMaxWidth(),
    shape = RoundedCornerShape(12.dp),
    color = PlumSurfaceCard,
    border = BorderStroke(1.2.dp, if (zombie.isBoss) CrimsonSoul else BorderMauve)
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.spacedBy(10.dp)
    ) {
      Box(
        modifier = Modifier
          .size(42.dp)
          .clip(RoundedCornerShape(10.dp))
          .background(ObsidianBg)
          .border(1.dp, CrimsonSoul.copy(alpha = 0.6f), RoundedCornerShape(10.dp)),
        contentAlignment = Alignment.Center
      ) {
        Text(text = zombie.avatarEmoji, style = MaterialTheme.typography.titleLarge)
      }

      Column(modifier = Modifier.weight(1f), verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
          text = "${zombie.name} · ${zombie.hpText}",
          style = MaterialTheme.typography.titleSmall,
          color = TextPrimary,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
        Text(
          text = zombie.description,
          style = MaterialTheme.typography.bodySmall,
          color = TextSecondary,
          maxLines = 2,
          overflow = TextOverflow.Ellipsis
        )
      }

      Surface(
        modifier = Modifier
          .minimumInteractiveComponentSize()
          .clip(RoundedCornerShape(8.dp))
          .clickable(onClick = onToggle),
        color = if (selected) CrimsonDark else ToxicForest,
        border = BorderStroke(1.dp, if (selected) CrimsonSoul else ToxicLime),
        shape = RoundedCornerShape(8.dp)
      ) {
        Row(
          modifier = Modifier.padding(horizontal = 10.dp, vertical = 8.dp),
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(4.dp)
        ) {
          Icon(
            imageVector = if (selected) Icons.Filled.Close else Icons.Filled.Add,
            contentDescription = null,
            tint = TextPrimary,
            modifier = Modifier.size(16.dp)
          )
          Text(
            text = if (selected) "Bỏ" else "Chọn",
            style = MaterialTheme.typography.labelLarge,
            color = TextPrimary
          )
        }
      }
    }
  }
}

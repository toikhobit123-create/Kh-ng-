package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Build
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.DeleteSweep
import androidx.compose.material.icons.filled.Edit
import androidx.compose.material.icons.filled.RestartAlt
import androidx.compose.material.icons.filled.Speed
import androidx.compose.material.icons.filled.WbSunny
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.model.CampaignProgress
import com.example.model.HudSnapshot
import com.example.model.PvzCatalog
import com.example.ui.components.GothicActionButton
import com.example.ui.components.HudIconChip
import com.example.ui.theme.AmberDeep
import com.example.ui.theme.AmberGold
import com.example.ui.theme.BorderMauve
import com.example.ui.theme.BorderSubtle
import com.example.ui.theme.CrimsonDark
import com.example.ui.theme.CrimsonSoul
import com.example.ui.theme.ObsidianBg
import com.example.ui.theme.PlumSurface
import com.example.ui.theme.PlumSurfaceCard
import com.example.ui.theme.PlumSurfaceElevated
import com.example.ui.theme.TextPrimary
import com.example.ui.theme.TextSecondary
import com.example.ui.theme.ToxicForest
import com.example.ui.theme.ToxicLime

@Composable
fun SandboxDrawer(
  visible: Boolean,
  hud: HudSnapshot,
  respectCutoutInsets: Boolean,
  onAddSun: (Int) -> Unit,
  onSetSun: (Int) -> Unit,
  onToggleNoCooldown: () -> Unit,
  onToggleSpeed: () -> Unit,
  onSpawnZombie: (String, Int) -> Unit,
  onToggleZombie: (String) -> Unit,
  onRemoveZombie: (String) -> Unit,
  onResetDefaultZombies: () -> Unit,
  onClearZombies: () -> Unit,
  onClearAll: () -> Unit,
  onResetMatch: () -> Unit,
  onClose: () -> Unit,
  modifier: Modifier = Modifier
) {
  var activeTab by remember { mutableIntStateOf(1) }
  var selectedRow by remember { mutableIntStateOf(-1) }
  var isPickingZombies by remember { mutableStateOf(false) }

  val insetsModifier = if (respectCutoutInsets) {
    Modifier.windowInsetsPadding(WindowInsets.safeDrawing)
  } else {
    Modifier
  }

  val targetDrawerWidth by animateDpAsState(
    targetValue = if (activeTab == 1) 400.dp else 320.dp,
    label = "sandboxDrawerWidth"
  )

  AnimatedVisibility(
    visible = visible,
    enter = slideInHorizontally(initialOffsetX = { it }),
    exit = slideOutHorizontally(targetOffsetX = { it }),
    modifier = modifier
  ) {
    BoxWithConstraints {
      val safeMaxWidth = (maxWidth * 0.58f).coerceAtLeast(300.dp)
      val drawerWidth = targetDrawerWidth.coerceAtMost(safeMaxWidth)

      Surface(
        modifier = Modifier
          .then(insetsModifier)
          .padding(top = 48.dp, end = 8.dp, bottom = 8.dp)
          .width(drawerWidth)
          .fillMaxHeight()
          .clickable(
            interactionSource = remember { MutableInteractionSource() },
            indication = null,
            onClick = {}
          ),
        shape = RoundedCornerShape(14.dp),
        color = PlumSurface.copy(alpha = 0.96f),
        border = BorderStroke(1.5.dp, AmberGold.copy(alpha = 0.75f)),
        shadowElevation = 14.dp
      ) {
        Column(
          modifier = Modifier
            .fillMaxHeight()
            .padding(10.dp),
          verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          // Drawer Header
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Row(
              verticalAlignment = Alignment.CenterVertically,
              horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
              Icon(Icons.Filled.Build, contentDescription = null, tint = AmberGold, modifier = Modifier.size(18.dp))
              Text("SANDBOX STUDIO", style = MaterialTheme.typography.titleSmall, color = AmberGold)
            }
            HudIconChip(
              onClick = onClose,
              icon = Icons.Filled.Close,
              contentDescription = "Đóng Sandbox",
              modifier = Modifier.testTag("sandbox_close_btn")
            )
          }

        // 3 Compact Tabs
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
          val tabs = listOf("Sun & CD", "Triệu Hồi", "Tiện Ích")
          tabs.forEachIndexed { index, title ->
            val selected = activeTab == index
            Surface(
              modifier = Modifier
                .weight(1f)
                .minimumInteractiveComponentSize()
                .clip(RoundedCornerShape(8.dp))
                .clickable { activeTab = index }
                .testTag("sandbox_tab_$index"),
              color = if (selected) AmberDeep else PlumSurfaceElevated,
              border = BorderStroke(1.dp, if (selected) AmberGold else BorderSubtle),
              shape = RoundedCornerShape(8.dp)
            ) {
              Box(
                modifier = Modifier.padding(vertical = 8.dp),
                contentAlignment = Alignment.Center
              ) {
                Text(
                  text = title,
                  style = MaterialTheme.typography.labelSmall,
                  color = if (selected) TextPrimary else TextSecondary,
                  maxLines = 1,
                  overflow = TextOverflow.Ellipsis
                )
              }
            }
          }
        }

        when (activeTab) {
          0 -> {
            // Sun, Cooldown & Speed
            Column(
              modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
              verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
              Text("Chỉnh Mặt Trời (Hiện tại: ${hud.sun})", style = MaterialTheme.typography.labelMedium, color = AmberGold)
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp)
              ) {
                SandboxQuickButton(
                  label = "+100 ☀",
                  onClick = { onAddSun(100) },
                  modifier = Modifier.weight(1f).testTag("sandbox_add_100")
                )
                SandboxQuickButton(
                  label = "+1000 ☀",
                  onClick = { onAddSun(1000) },
                  modifier = Modifier.weight(1f).testTag("sandbox_add_1000")
                )
                SandboxQuickButton(
                  label = "9999 ☀",
                  onClick = { onSetSun(9999) },
                  accent = AmberGold,
                  modifier = Modifier.weight(1f).testTag("sandbox_set_9999")
                )
              }

              Surface(
                shape = RoundedCornerShape(10.dp),
                color = PlumSurfaceCard,
                border = BorderStroke(1.dp, BorderSubtle)
              ) {
                Row(
                  modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 6.dp),
                  horizontalArrangement = Arrangement.SpaceBetween,
                  verticalAlignment = Alignment.CenterVertically
                ) {
                  Column(modifier = Modifier.weight(1f)) {
                    Text("Hồi chiêu 0s", style = MaterialTheme.typography.labelLarge, color = ToxicLime)
                    Text("Trồng cây liên tục không cần chờ", style = MaterialTheme.typography.bodySmall, color = TextSecondary)
                  }
                  Switch(
                    checked = hud.sandboxNoCooldown,
                    onCheckedChange = { onToggleNoCooldown() },
                    modifier = Modifier.testTag("sandbox_no_cd_switch"),
                    colors = SwitchDefaults.colors(
                      checkedThumbColor = ObsidianBg,
                      checkedTrackColor = ToxicLime
                    )
                  )
                }
              }

              GothicActionButton(
                onClick = onToggleSpeed,
                modifier = Modifier.fillMaxWidth().testTag("sandbox_speed_btn"),
                containerColor = PlumSurfaceElevated,
                borderColor = BorderMauve
              ) {
                Icon(Icons.Filled.Speed, contentDescription = null, tint = AmberGold)
                Spacer(Modifier.width(6.dp))
                Text("Đổi Tốc Độ (Hiện tại: ${hud.gameSpeed}X)")
              }
            }
          }

          1 -> {
            // Spawn Zombies Tab — Unified scrollable grid so summon & picker cards are always spacious and easy to tap
            val allowedZombieIds = hud.sandboxZombies.take(8)
            val drawerZombies = allowedZombieIds.mapNotNull { PvzCatalog.zombieById[it] }
            val shortcutByZombie = remember {
              mapOf(
                "basic" to "Z",
                "conehead" to "C",
                "buckethead" to "B",
                "pole_vaulting" to "P",
                "gargantuar" to "G",
                "tombstone" to "T",
                "jurassic_bully" to "J",
                "lang_khach" to "L",
                "shen" to "H",
                "anivia" to "A",
                "balloon" to "O",
                "jetpack" to "K",
                "thresh" to "E",
                "quan_chua" to "Q",
                "dragon_wind" to "W",
                "dragon_water" to "N",
                "azir_desert_emperor" to "AZ",
                "renekton_croc" to "CS",
                "nasus_hound" to "TK",
                "sand_soldier" to "LC",
                "sand_coffin" to "QT",
                "nosus_thrall" to "NT",
                "nosus_assassin" to "NA",
                "nosus_shieldbearer" to "NS",
                "nosus_hemomancer" to "NH",
                "nosus_warlord" to "DR",
                "ionia_zed" to "ZD",
                "ionia_yone" to "YN",
                "ionia_sett" to "ST",
                "drowned_sailor" to "DS",
                "anchor_bearer" to "AB",
                "swimming_ghost" to "SG",
                "wanted_captain" to "WC",
                "zombot_pyke" to "PK"
              )
            }

            LazyVerticalGrid(
              columns = GridCells.Fixed(2),
              modifier = Modifier
                .fillMaxWidth()
                .weight(1f),
              contentPadding = PaddingValues(bottom = 6.dp),
              horizontalArrangement = Arrangement.spacedBy(8.dp),
              verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
              // 1. Chọn hàng xuất hiện (Full-width header item)
              item(span = { GridItemSpan(2) }, key = "row_selector_header") {
                Column(verticalArrangement = Arrangement.spacedBy(4.dp)) {
                  Text(
                    text = "Chọn hàng xuất hiện:",
                    style = MaterialTheme.typography.labelSmall,
                    color = TextSecondary
                  )
                  Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(5.dp)
                  ) {
                    val rows = listOf(-1 to "Ngẫu", 0 to "H1", 1 to "H2", 2 to "H3", 3 to "H4", 4 to "H5")
                    rows.forEach { (rowIdx, label) ->
                      val active = selectedRow == rowIdx
                      Surface(
                        modifier = Modifier
                          .weight(1f)
                          .defaultMinSize(minHeight = 40.dp)
                          .clip(RoundedCornerShape(7.dp))
                          .clickable { selectedRow = rowIdx },
                        color = if (active) CrimsonDark else PlumSurfaceElevated,
                        border = BorderStroke(1.2.dp, if (active) CrimsonSoul else BorderSubtle),
                        shape = RoundedCornerShape(7.dp)
                      ) {
                        Box(contentAlignment = Alignment.Center, modifier = Modifier.padding(vertical = 8.dp)) {
                          Text(
                            text = label,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = if (active) FontWeight.Bold else FontWeight.Medium,
                            color = if (active) TextPrimary else TextSecondary
                          )
                        }
                      }
                    }
                  }
                }
              }

              // 2. Thanh quản lý Bộ Zombie (8/8)
              item(span = { GridItemSpan(2) }, key = "zombie_loadout_header") {
                Surface(
                  modifier = Modifier.fillMaxWidth(),
                  shape = RoundedCornerShape(10.dp),
                  color = PlumSurfaceElevated,
                  border = BorderStroke(1.2.dp, if (isPickingZombies) AmberGold else BorderSubtle)
                ) {
                  Column(
                    modifier = Modifier
                      .fillMaxWidth()
                      .padding(horizontal = 10.dp, vertical = 8.dp),
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                  ) {
                    Row(
                      modifier = Modifier.fillMaxWidth(),
                      horizontalArrangement = Arrangement.SpaceBetween,
                      verticalAlignment = Alignment.CenterVertically
                    ) {
                      Text(
                        text = if (isPickingZombies) {
                          "Đang chọn Bộ Zombie (${allowedZombieIds.size}/8)"
                        } else {
                          "Bộ Zombie triệu hồi (${allowedZombieIds.size}/8)"
                        },
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.Bold,
                        color = AmberGold
                      )
                      Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                        Surface(
                          modifier = Modifier
                            .defaultMinSize(minHeight = 36.dp)
                            .clip(RoundedCornerShape(7.dp))
                            .clickable { onResetDefaultZombies() }
                            .testTag("sandbox_reset_zombies_btn"),
                          color = PlumSurfaceCard,
                          border = BorderStroke(1.dp, BorderMauve),
                          shape = RoundedCornerShape(7.dp)
                        ) {
                          Box(
                            modifier = Modifier.padding(horizontal = 9.dp, vertical = 6.dp),
                            contentAlignment = Alignment.Center
                          ) {
                            Text(
                              text = "Mặc định",
                              style = MaterialTheme.typography.labelSmall,
                              color = TextSecondary
                            )
                          }
                        }

                        Surface(
                          modifier = Modifier
                            .defaultMinSize(minHeight = 36.dp)
                            .clip(RoundedCornerShape(7.dp))
                            .clickable { isPickingZombies = !isPickingZombies }
                            .testTag("sandbox_toggle_zombie_bar_btn"),
                          color = if (isPickingZombies) ToxicForest else CrimsonDark,
                          border = BorderStroke(1.2.dp, if (isPickingZombies) ToxicLime else CrimsonSoul),
                          shape = RoundedCornerShape(7.dp)
                        ) {
                          Row(
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(4.dp)
                          ) {
                            Icon(
                              imageVector = if (isPickingZombies) Icons.Filled.Check else Icons.Filled.Edit,
                              contentDescription = if (isPickingZombies) "Xong chọn Zombie" else "Đổi 8 Zombie",
                              tint = TextPrimary,
                              modifier = Modifier.size(14.dp)
                            )
                            Text(
                              text = if (isPickingZombies) "Xong" else "Chọn 8 Z",
                              style = MaterialTheme.typography.labelSmall,
                              fontWeight = FontWeight.Bold,
                              color = TextPrimary
                            )
                          }
                        }
                      }
                    }

                    if (drawerZombies.isEmpty()) {
                      Text(
                        text = "Chưa chọn Zombie — bấm \"Chọn 8 Z\" để thêm",
                        style = MaterialTheme.typography.bodySmall,
                        color = TextSecondary,
                        modifier = Modifier.padding(vertical = 2.dp)
                      )
                    } else {
                      LazyRow(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(6.dp)
                      ) {
                        items(drawerZombies, key = { "bar_${it.id}" }) { zombie ->
                          Surface(
                            modifier = Modifier
                              .defaultMinSize(minHeight = 32.dp)
                              .clip(RoundedCornerShape(16.dp))
                              .clickable { onRemoveZombie(zombie.id) }
                              .testTag("sandbox_bar_zombie_${zombie.id}"),
                            color = CrimsonDark.copy(alpha = 0.55f),
                            border = BorderStroke(1.dp, CrimsonSoul.copy(alpha = 0.85f)),
                            shape = RoundedCornerShape(16.dp)
                          ) {
                            Row(
                              modifier = Modifier.padding(horizontal = 9.dp, vertical = 5.dp),
                              verticalAlignment = Alignment.CenterVertically,
                              horizontalArrangement = Arrangement.spacedBy(4.dp)
                            ) {
                              Text(zombie.avatarEmoji, fontSize = 14.sp)
                              Text(
                                text = zombie.name,
                                style = MaterialTheme.typography.labelSmall,
                                color = TextPrimary,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                              )
                              Icon(
                                imageVector = Icons.Filled.Close,
                                contentDescription = "Bỏ ${zombie.name}",
                                tint = TextSecondary,
                                modifier = Modifier.size(13.dp)
                              )
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }

              // 3. Danh sách chọn 8 Zombie HOẶC các thẻ Triệu hồi lớn, dễ bấm
              if (isPickingZombies) {
                items(PvzCatalog.zombies, key = { "pick_${it.id}" }) { zombie ->
                  val chosen = allowedZombieIds.contains(zombie.id)
                  Box(
                    modifier = Modifier
                      .fillMaxWidth()
                      .minimumInteractiveComponentSize()
                      .defaultMinSize(minHeight = 64.dp)
                      .clip(RoundedCornerShape(10.dp))
                      .background(
                        when {
                          chosen -> ToxicForest.copy(alpha = 0.48f)
                          zombie.isBoss -> CrimsonDark.copy(alpha = 0.28f)
                          else -> PlumSurfaceCard
                        }
                      )
                      .border(
                        width = if (chosen) 1.6.dp else 1.dp,
                        color = if (chosen) ToxicLime else BorderSubtle,
                        shape = RoundedCornerShape(10.dp)
                      )
                      .clickable { onToggleZombie(zombie.id) }
                      .padding(horizontal = 10.dp, vertical = 8.dp)
                      .testTag("sandbox_pick_zombie_${zombie.id}")
                  ) {
                    Row(
                      modifier = Modifier.fillMaxWidth(),
                      verticalAlignment = Alignment.CenterVertically,
                      horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                      Text(zombie.avatarEmoji, fontSize = 22.sp)
                      Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(2.dp)
                      ) {
                        Text(
                          text = zombie.name,
                          style = MaterialTheme.typography.labelMedium,
                          fontWeight = FontWeight.SemiBold,
                          color = TextPrimary,
                          maxLines = 2,
                          overflow = TextOverflow.Ellipsis
                        )
                        Text(
                          text = if (zombie.isBoss) "BOSS · ${zombie.hpText}" else zombie.hpText,
                          style = MaterialTheme.typography.labelSmall,
                          color = if (zombie.isBoss) CrimsonSoul else AmberGold,
                          maxLines = 1,
                          overflow = TextOverflow.Ellipsis
                        )
                      }
                    }
                    if (chosen) {
                      Box(
                        modifier = Modifier
                          .align(Alignment.TopEnd)
                          .size(18.dp)
                          .clip(CircleShape)
                          .background(ToxicLime),
                        contentAlignment = Alignment.Center
                      ) {
                        Icon(
                          imageVector = Icons.Filled.Check,
                          contentDescription = "Đã chọn",
                          tint = ObsidianBg,
                          modifier = Modifier.size(12.dp)
                        )
                      }
                    }
                  }
                }
              } else if (drawerZombies.isEmpty()) {
                item(span = { GridItemSpan(2) }, key = "empty_zombie_cta") {
                  Box(
                    modifier = Modifier
                      .fillMaxWidth()
                      .padding(vertical = 24.dp),
                    contentAlignment = Alignment.Center
                  ) {
                    GothicActionButton(
                      onClick = { isPickingZombies = true },
                      modifier = Modifier.testTag("sandbox_empty_pick_zombies_btn"),
                      containerColor = CrimsonDark,
                      borderColor = CrimsonSoul
                    ) {
                      Icon(Icons.Filled.Edit, contentDescription = null, modifier = Modifier.size(18.dp))
                      Spacer(Modifier.width(6.dp))
                      Text("Chọn Zombie (Tối đa 8)")
                    }
                  }
                }
              } else {
                items(drawerZombies, key = { it.id }) { zombie ->
                  val hotkey = shortcutByZombie[zombie.id]
                  Surface(
                    modifier = Modifier
                      .fillMaxWidth()
                      .minimumInteractiveComponentSize()
                      .defaultMinSize(minHeight = 68.dp)
                      .clip(RoundedCornerShape(10.dp))
                      .clickable { onSpawnZombie(zombie.id, selectedRow) }
                      .testTag("sandbox_spawn_${zombie.id}"),
                    color = if (zombie.isBoss) CrimsonDark.copy(alpha = 0.58f) else PlumSurfaceCard,
                    border = BorderStroke(1.3.dp, if (zombie.isBoss) CrimsonSoul else BorderMauve.copy(alpha = 0.7f)),
                    shape = RoundedCornerShape(10.dp)
                  ) {
                    Row(
                      modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 10.dp, vertical = 9.dp),
                      verticalAlignment = Alignment.CenterVertically,
                      horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                      Text(zombie.avatarEmoji, fontSize = 24.sp)
                      Column(
                        modifier = Modifier.weight(1f),
                        verticalArrangement = Arrangement.spacedBy(2.dp)
                      ) {
                        Text(
                          text = zombie.name,
                          style = MaterialTheme.typography.labelMedium,
                          fontWeight = FontWeight.Bold,
                          color = TextPrimary,
                          maxLines = 2,
                          overflow = TextOverflow.Ellipsis
                        )
                        Row(
                          verticalAlignment = Alignment.CenterVertically,
                          horizontalArrangement = Arrangement.spacedBy(4.dp)
                        ) {
                          Text(
                            text = if (zombie.isBoss) "BOSS" else "Thả ngay",
                            style = MaterialTheme.typography.labelSmall,
                            color = if (zombie.isBoss) AmberGold else ToxicLime,
                            maxLines = 1
                          )
                          if (hotkey != null) {
                            Surface(
                              color = ObsidianBg.copy(alpha = 0.75f),
                              shape = RoundedCornerShape(4.dp),
                              border = BorderStroke(0.8.dp, BorderMauve)
                            ) {
                              Text(
                                text = hotkey,
                                style = MaterialTheme.typography.labelSmall,
                                color = AmberGold,
                                modifier = Modifier.padding(horizontal = 4.dp, vertical = 1.dp)
                              )
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }

          else -> {
            // Board Cleanup & Reset Utilities
            Column(
              modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
              verticalArrangement = Arrangement.spacedBy(8.dp)
            ) {
              GothicActionButton(
                onClick = onClearZombies,
                modifier = Modifier.fillMaxWidth().testTag("sandbox_clear_zombies_btn"),
                containerColor = CrimsonDark,
                borderColor = CrimsonSoul
              ) {
                Icon(Icons.Filled.DeleteSweep, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Xóa Tất Cả Zombie")
              }

              GothicActionButton(
                onClick = onClearAll,
                modifier = Modifier.fillMaxWidth().testTag("sandbox_clear_all_btn"),
                containerColor = PlumSurfaceElevated,
                borderColor = CrimsonSoul
              ) {
                Icon(Icons.Filled.DeleteSweep, contentDescription = null, tint = CrimsonSoul)
                Spacer(Modifier.width(6.dp))
                Text("Dọn Sạch Sân (Cây + Zombie)")
              }

              GothicActionButton(
                onClick = onResetMatch,
                modifier = Modifier.fillMaxWidth().testTag("sandbox_reset_btn"),
                containerColor = PlumSurfaceElevated,
                borderColor = AmberGold
              ) {
                Icon(Icons.Filled.RestartAlt, contentDescription = null, tint = AmberGold)
                Spacer(Modifier.width(6.dp))
                Text("Chơi Lại Sandbox")
              }
            }
          }
        }
      }
      }
    }
  }
}

@Composable
private fun SandboxQuickButton(
  label: String,
  onClick: () -> Unit,
  modifier: Modifier = Modifier,
  accent: Color = ToxicLime
) {
  Surface(
    modifier = modifier
      .minimumInteractiveComponentSize()
      .height(44.dp)
      .clip(RoundedCornerShape(8.dp))
      .clickable(onClick = onClick),
    color = ToxicForest.copy(alpha = 0.4f),
    border = BorderStroke(1.dp, accent),
    shape = RoundedCornerShape(8.dp)
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 6.dp),
      verticalAlignment = Alignment.CenterVertically,
      horizontalArrangement = Arrangement.Center
    ) {
      Icon(Icons.Filled.WbSunny, contentDescription = null, tint = AmberGold, modifier = Modifier.size(14.dp))
      Spacer(Modifier.width(3.dp))
      Text(
        text = label,
        style = MaterialTheme.typography.labelSmall,
        color = TextPrimary,
        textAlign = TextAlign.Center,
        maxLines = 1
      )
    }
  }
}

/**
 * PVZ Tower Defense 2D - Game Engine
 * Quản lý vòng đời game, Main Menu, World Map (5 Level), Sandbox Mode,
 * Hệ thống Chọn Cây (Choose Your Seeds), Khay Hạt Giống Dọc (Vertical Seed Tray),
 * Kinh tế Sun, Lưới 9x5, X2 Tốc độ, Hệ thống Wave và Combat đọc từ PLANT_CONFIG / ZOMBIE_CONFIG
 */

const PLANT_SHOWCASE_DATA = {
  sunflower: {
    id: 'sunflower',
    name: 'Hướng Dương (Sunflower)',
    group: 'Kinh Tế',
    cost: 50,
    dmg: '0 (Không bắn)',
    rate: '25 Sun / 24s',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Cung cấp 25 Mặt Trời (Sun) mỗi 24 giây. Nền tảng kinh tế tối quan trọng để xây dựng phòng tuyến.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><circle cx="22" cy="19" r="13" fill="#15081c" stroke="#4a154b" stroke-width="1.5"/><circle cx="22" cy="19" r="10" fill="#2d0d36"/><path d="M22 6 L22 13 M22 25 L22 32 M9 19 L16 19 M28 19 L35 19" stroke="#ff1744" stroke-width="1.5" stroke-linecap="round"/><ellipse cx="22" cy="19" rx="6" ry="5" fill="#000" stroke="#b71c1c" stroke-width="1.2"/><circle cx="22" cy="19" r="3" fill="#ff1744"/><circle cx="21" cy="18" r="0.8" fill="#fff"/><path d="M22 32 Q23 38 22 42" stroke="#122318" stroke-width="3" fill="none"/></svg>`
  },
  peashooter: {
    id: 'peashooter',
    name: 'Đậu Quỷ (Peashooter)',
    group: 'Bắn Thẳng',
    cost: 100,
    dmg: '20 DMG',
    rate: '1.425s / phát (~14 DPS)',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Bắn hạt đậu cơ bản gây 20 sát thương mỗi 1.425s. Chiến binh tuyến đầu tiêu chuẩn bảo vệ nghĩa địa.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><ellipse cx="19" cy="18" rx="10" ry="9" fill="#1b4d24" stroke="#0a2612" stroke-width="1.2"/><ellipse cx="31" cy="18" rx="5" ry="6" fill="#2d733b"/><ellipse cx="32" cy="18" rx="3" ry="4" fill="#091f0e"/><polygon points="30,14 32,16 34,14" fill="#fffde7"/><polygon points="30,22 32,20 34,22" fill="#fffde7"/><circle cx="17" cy="14" r="2.5" fill="#ffd600"/><ellipse cx="17" cy="14" rx="0.8" ry="2" fill="#000"/><path d="M18 27 Q19 36 21 41" stroke="#0e2916" stroke-width="3" fill="none"/></svg>`
  },
  snow_pea: {
    id: 'snow_pea',
    name: 'Đậu Băng (Snow Pea)',
    group: 'Làm Chậm',
    cost: 175,
    dmg: '20 DMG + Băng',
    rate: '1.425s / phát',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Bắn hạt đậu băng giá gây 20 sát thương và làm chậm 50% tốc độ di chuyển và cắn của Zombie trong 10s.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><ellipse cx="19" cy="18" rx="10" ry="9" fill="#006064" stroke="#00e5ff" stroke-width="1.2"/><ellipse cx="31" cy="18" rx="5" ry="6" fill="#00bcd4"/><ellipse cx="32" cy="18" rx="3" ry="4" fill="#00251a"/><polygon points="12,10 9,6 15,9" fill="#80deea"/><polygon points="10,16 5,14 11,18" fill="#80deea"/><polygon points="13,24 8,26 15,22" fill="#80deea"/><circle cx="17" cy="14" r="2.5" fill="#e0f7fa"/><circle cx="17" cy="14" r="1.2" fill="#00838f"/><path d="M18 27 Q19 36 21 41" stroke="#004d40" stroke-width="3" fill="none"/></svg>`
  },
  repeater: {
    id: 'repeater',
    name: 'Đậu Nòng Đôi (Repeater)',
    group: 'Bắn Thẳng x2',
    cost: 200,
    dmg: '40 DMG (2x20)',
    rate: '1.425s (~28 DPS)',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Bắn liên thanh 2 hạt đậu mỗi lượt gây 40 sát thương, tăng gấp đôi hỏa lực đối đầu với Zombie bọc giáp.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><path d="M12 12 Q8 6 12 4 Q16 6 14 12" fill="#4caf50" stroke="#1b5e20" stroke-width="1"/><path d="M8 15 Q4 11 8 8 Q12 10 10 15" fill="#4caf50" stroke="#1b5e20" stroke-width="1"/><ellipse cx="20" cy="20" rx="11" ry="10" fill="#2e7d32" stroke="#1b5e20" stroke-width="1.2"/><ellipse cx="33" cy="20" rx="6" ry="7" fill="#43a047"/><ellipse cx="34" cy="20" rx="3.5" ry="4.5" fill="#0d280d"/><circle cx="18" cy="16" r="3" fill="#ffeb3b"/><circle cx="18" cy="16" r="1.5" fill="#000"/><path d="M19 29 Q20 37 22 41" stroke="#1b5e20" stroke-width="3" fill="none"/></svg>`
  },
  wall_nut: {
    id: 'wall_nut',
    name: 'Hạt Dẻ (Wall-nut)',
    group: 'Phòng Thủ',
    cost: 50,
    dmg: '0 (Khiên chắn)',
    rate: 'Bất động',
    cooldown: '20.0s',
    hp: '4000 HP',
    desc: 'Lớp vỏ siêu dày chịu đựng tới 4000 sát thương, cản bước zombie để các cây phía sau xả sát thương.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><ellipse cx="22" cy="22" rx="12" ry="15" fill="#5d4037" stroke="#3e2723" stroke-width="1.5"/><ellipse cx="20" cy="20" rx="10" ry="13" fill="#795548"/><circle cx="17" cy="16" r="2.8" fill="#fff"/><circle cx="17" cy="16" r="1.3" fill="#000"/><circle cx="26" cy="16" r="2.8" fill="#fff"/><circle cx="26" cy="16" r="1.3" fill="#000"/><path d="M18 27 Q22 29 25 27" stroke="#3e2723" stroke-width="1.8" fill="none"/></svg>`
  },
  cabbage_pult: {
    id: 'cabbage_pult',
    name: 'Bắp Cải (Cabbage-pult)',
    group: 'Cầu Vồng',
    cost: 100,
    dmg: '40 DMG',
    rate: '2.925s (~14 DPS)',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Bắn bắp cải theo đường cầu vồng, vượt qua mọi Bia Mộ (Tombstone) và vật cản để đánh trúng Zombie.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><ellipse cx="20" cy="26" rx="10" ry="8" fill="#388e3c" stroke="#1b5e20" stroke-width="1.2"/><line x1="20" y1="26" x2="28" y2="12" stroke="#8d6e63" stroke-width="3" stroke-linecap="round"/><circle cx="29" cy="11" r="6" fill="#81c784" stroke="#2e7d32" stroke-width="1.2"/><circle cx="29" cy="11" r="3" fill="#c8e6c9"/><circle cx="18" cy="24" r="2" fill="#fff"/><circle cx="18" cy="24" r="1" fill="#000"/></svg>`
  },
  melon_pult: {
    id: 'melon_pult',
    name: 'Dưa Hấu (Melon-pult)',
    group: 'Cầu Vồng AoE',
    cost: 300,
    dmg: '100 (+30 Lan AoE)',
    rate: '2.925s (~34 DPS)',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Bắn dưa hấu hạng nặng cầu vồng qua Bia Mộ. Gây 100 sát thương trực tiếp và 30 sát thương lan AoE 3x3 ô.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><ellipse cx="19" cy="27" rx="11" ry="8" fill="#1b5e20" stroke="#0d280d" stroke-width="1.2"/><line x1="19" y1="27" x2="28" y2="12" stroke="#795548" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="29" cy="11" rx="8" ry="6" fill="#2e7d32" stroke="#1b5e20" stroke-width="1.2"/><line x1="25" y1="8" x2="27" y2="14" stroke="#81c784" stroke-width="1.2"/><line x1="29" y1="7" x2="30" y2="15" stroke="#81c784" stroke-width="1.2"/><line x1="33" y1="8" x2="32" y2="14" stroke="#81c784" stroke-width="1.2"/></svg>`
  },
  chomper: {
    id: 'chomper',
    name: 'Hoa Ăn Thịt (Chomper)',
    group: 'Nuốt Chửng',
    cost: 150,
    dmg: '2400 DMG (Nuốt)',
    rate: 'Tiêu hóa 20s',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Há miệng nuốt trọn 1 Zombie trong phạm vi ô của bản thân và 1 ô trước mặt (ví dụ đặt sau Hạt Dẻ vẫn ăn được zombie phía trước). Không thể nuốt zombie lớn (Kẻ Bắt Nạt, Gargantuar, Zomboss, Lãng Khách, Troglobite); cắn liên tục 200 DMG/s.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><path d="M16 38 Q18 28 20 22" stroke="#4a148c" stroke-width="3" fill="none"/><path d="M16 16 C16 8 32 8 32 16 L32 20 C32 28 16 28 16 20 Z" fill="#6a1b9a" stroke="#4a148c" stroke-width="1.2"/><ellipse cx="25" cy="18" rx="5" ry="4" fill="#12005e"/><polygon points="20,13 22,17 24,13" fill="#fff"/><polygon points="26,13 28,17 30,13" fill="#fff"/><polygon points="20,23 22,19 24,23" fill="#fff"/><polygon points="26,23 28,19 30,23" fill="#fff"/><circle cx="19" cy="11" r="1.8" fill="#ffd600"/></svg>`
  },
  cherry_bomb: {
    id: 'cherry_bomb',
    name: 'Bom Anh Đào (Cherry Bomb)',
    group: 'Nổ Tức Thời',
    cost: 150,
    dmg: '1800 DMG (3x3)',
    rate: 'Phát nổ sau 1.2s',
    cooldown: '35.0s',
    hp: '300 HP',
    desc: 'Phát nổ hủy diệt phạm vi 3x3 ô với 1800 sát thương, xóa sổ ngay lập tức toàn bộ đàn zombie dày đặc.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><path d="M15 24 Q22 10 22 6 Q22 10 29 24" stroke="#2e7d32" stroke-width="2.5" fill="none"/><circle cx="15" cy="27" r="8" fill="#c62828" stroke="#8e0000" stroke-width="1.2"/><circle cx="13" cy="24" r="1.5" fill="#fff"/><circle cx="17" cy="24" r="1.5" fill="#fff"/><polygon points="12,28 15,30 18,28" fill="#000"/><circle cx="29" cy="27" r="8" fill="#c62828" stroke="#8e0000" stroke-width="1.2"/><circle cx="27" cy="24" r="1.5" fill="#fff"/><circle cx="31" cy="24" r="1.5" fill="#fff"/><polygon points="26,28 29,30 32,28" fill="#000"/><polygon points="22,2 25,6 21,7 23,10 19,6" fill="#ffeb3b"/></svg>`
  },
  bonk_choy: {
    id: 'bonk_choy',
    name: 'Đấm Bốc (Bonk Choy)',
    group: 'Cận Chiến',
    cost: 150,
    dmg: '20 DMG mỗi 0.5s',
    rate: '0.5s / đấm',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Võ sĩ cận chiến tung đòn đấm 20 sát thương mỗi 0.5s. Phạm vi tấn công 2 ô trước mặt và 2 ô đằng sau lưng.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><path d="M16 38 Q22 28 22 20 Q22 28 28 38 Z" fill="#43a047" stroke="#1b5e20" stroke-width="1.2"/><ellipse cx="22" cy="15" rx="9" ry="8" fill="#66bb6a" stroke="#2e7d32" stroke-width="1.5"/><circle cx="17" cy="12" r="2.5" fill="#a5d6a7"/><circle cx="22" cy="10" r="2.8" fill="#a5d6a7"/><circle cx="27" cy="12" r="2.5" fill="#a5d6a7"/><circle cx="19" cy="17" r="1.8" fill="#000"/><circle cx="25" cy="17" r="1.8" fill="#000"/><circle cx="18" cy="16" r="0.6" fill="#fff"/><circle cx="24" cy="16" r="0.6" fill="#fff"/></svg>`
  },
  snapdragon: {
    id: 'snapdragon',
    name: 'Rồng Lửa (Snapdragon)',
    group: 'Phun Lửa 3 Hàng',
    cost: 200,
    dmg: '30 DMG (3 hàng)',
    rate: '1.0s / lần',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Phun luồng lửa ma quái hình nón bao phủ 3 hàng liền kề, thiêu rụi nhiều mục tiêu cùng lúc.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><path d="M18 38 Q18 26 24 18" stroke="#2e7d32" stroke-width="3.5" fill="none"/><path d="M22 14 L34 16 L28 22 L20 22 Z" fill="#e65100" stroke="#bf360c" stroke-width="1.2"/><polygon points="34,16 39,14 36,19" fill="#ffeb3b"/><circle cx="24" cy="16" r="2" fill="#fff"/><circle cx="24" cy="16" r="1" fill="#000"/><polygon points="21,14 17,9 23,12" fill="#ff9800"/></svg>`
  },
  lightning_reed: {
    id: 'lightning_reed',
    name: 'Sậy Sét (Lightning Reed)',
    group: 'Giật Sét Dây Chuyền',
    cost: 125,
    dmg: '10 DMG x tối đa 3 mục tiêu',
    rate: '1.0s / tia',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Chỉ giật tia lôi điện xuyên qua tối đa 3 mục tiêu. Khoảng cách từ mục tiêu chính tới mục tiêu lan không quá 3 ô.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><path d="M22 41 Q18 26 22 15" stroke="#004d40" stroke-width="3" fill="none"/><ellipse cx="22" cy="14" rx="7.5" ry="7" fill="#00251a" stroke="#00e5ff" stroke-width="1.5"/><circle cx="22" cy="14" r="3.5" fill="#18ffff"/><polygon points="22,1 26,9 21,9 25,16 17,9 21,9" fill="#00e5ff" stroke="#fff" stroke-width="0.8"/></svg>`
  },
  stunion: {
    id: 'stunion',
    name: 'Hành Choáng (Stunion)',
    group: 'Khí Choáng Tức Thời',
    cost: 25,
    dmg: 'Choáng 5 Giây',
    rate: 'Tác dụng tức thời',
    cooldown: '15.0s',
    hp: '300 HP',
    desc: 'Thổi luồng khí hôi thối cực nồng làm tê liệt mọi zombie ở ô đang trồng và 2 ô trước mặt suốt 5 giây.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><ellipse cx="22" cy="24" rx="10" ry="11" fill="#2d1338" stroke="#6a1b9a" stroke-width="1.5"/><ellipse cx="22" cy="24" rx="7" ry="8" fill="#4a148c"/><path d="M22 11 Q17 3 13 6 Q20 11 22 11 Q24 3 29 6 Q24 11 22 11" fill="#76ff03"/><ellipse cx="18" cy="22" rx="1.8" ry="2.2" fill="#ea80fc"/><ellipse cx="26" cy="22" rx="1.8" ry="2.2" fill="#ea80fc"/><ellipse cx="22" cy="28" rx="3" ry="3.5" fill="#000"/></svg>`
  },
  infi_nut: {
    id: 'infi_nut',
    name: 'Hạt Dẻ Hologram (Infi-nut)',
    group: 'Khiên Hồi Phục',
    cost: 75,
    dmg: '0 (Tự hồi máu)',
    rate: 'Bất động',
    cooldown: '15.0s',
    hp: '2000 HP (Hồi phục)',
    desc: 'Chiếu lá chắn toàn ảnh 2000 HP. Khi không bị cắn sẽ tự tái tạo lại hoàn toàn từ đĩa phát laser.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><rect x="14" y="32" width="16" height="5" rx="2" fill="#1b2326" stroke="#455a64" stroke-width="1.2"/><polygon points="22,7 31,18 22,29 13,18" fill="rgba(0, 229, 255, 0.4)" stroke="#00e5ff" stroke-width="1.8"/><circle cx="22" cy="18" r="3" fill="#fff"/></svg>`
  },
  sun_shroom: {
    id: 'sun_shroom',
    name: 'Nấm Mặt Trời (Sun Shroom)',
    group: 'Kinh Tế Tiến Hóa',
    cost: 25,
    dmg: '0 (Kinh tế)',
    rate: '25 → 50 → 75 Sun',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Cây kinh tế giá rẻ 25 Sun. Lớn dần qua 3 giai đoạn để nhả tới 75 Mặt Trời mỗi đợt.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><rect x="19" y="24" width="6" height="11" rx="3" fill="#1f1426" stroke="#6a1b9a" stroke-width="1"/><path d="M10 25 Q22 8 34 25 Z" fill="#4a148c" stroke="#aa00ff" stroke-width="1.5"/><circle cx="16" cy="18" r="2.2" fill="#76ff03"/><circle cx="28" cy="18" r="2.2" fill="#76ff03"/><circle cx="22" cy="13" r="1.8" fill="#00e5ff"/></svg>`
  },
  goo_peashooter: {
    id: 'goo_peashooter',
    name: 'Đậu Độc (Goo Pea)',
    group: 'Độc Xuyên Giáp',
    cost: 125,
    dmg: '30 DMG Xuyên Giáp + 15 Độc/s',
    rate: '1.4s / phát',
    cooldown: '7.5s',
    hp: '300 HP',
    desc: 'Bắn hạt đậu độc 30 sát thương đánh thẳng vào máu xuyên giáp nón/xô, độc 15 sát thương/giây dồn tối đa 3 lần. Không làm chậm.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><ellipse cx="19" cy="18" rx="10" ry="9" fill="#311b92" stroke="#12005e" stroke-width="1.2"/><ellipse cx="30" cy="18" rx="4.5" ry="6" fill="#6a1b9a"/><path d="M31 19 Q34 27 30 29 Q27 27 29 19 Z" fill="#d500f9"/><circle cx="17" cy="14" r="2" fill="#00e5ff"/><path d="M18 27 Q19 36 21 41" stroke="#311b92" stroke-width="3" fill="none"/></svg>`
  },
  potato_mine: {
    id: 'potato_mine',
    name: 'Mìn Khoai Tây (Potato Mine)',
    group: 'Cạm Bẫy Nổ',
    cost: 50,
    dmg: '2700 DMG (Nổ 3x3 ô)',
    rate: 'Kích nổ khi dẫm',
    cooldown: '25.0s',
    hp: '300 HP',
    desc: 'Cần 5 giây nhô lên mặt đất. Nếu bị zombie ăn trước khi nhô lên sẽ bị mất! Khi đã kích hoạt, dẫm phải sẽ nổ tung 2700 sát thương lan 3x3 ô: SPUDOW! 💥',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><ellipse cx="22" cy="27" rx="14" ry="11" fill="#795548" stroke="#3e2723" stroke-width="1.5"/><ellipse cx="22" cy="26" rx="12" ry="9" fill="#a1887f"/><ellipse cx="17" cy="25" rx="2.5" ry="3.5" fill="#fff"/><circle cx="17" cy="25" r="1.3" fill="#000"/><ellipse cx="27" cy="25" rx="2.5" ry="3.5" fill="#fff"/><circle cx="27" cy="25" r="1.3" fill="#000"/><line x1="22" y1="17" x2="22" y2="9" stroke="#3e2723" stroke-width="2.5"/><circle cx="22" cy="7" r="3.5" fill="#ff1744" stroke="#d50000" stroke-width="1"/></svg>`
  },
  hypno_shroom: {
    id: 'hypno_shroom',
    name: 'Nấm Thôi Miên (Hypno-shroom)',
    group: 'Thôi Miên Đơn Mục Tiêu',
    cost: 100,
    dmg: 'Thôi miên kẻ địch',
    rate: 'Tác dụng khi bị ăn',
    cooldown: '20.0s',
    hp: '50 HP',
    desc: 'Khi zombie cắn phải nấm thôi miên, chúng sẽ quay lưng lại và chiến đấu hết mình cho bạn, bảo vệ các cây và tấn công lại chính đồng bọn zombie!',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><rect x="19" y="24" width="6" height="12" rx="2" fill="#e1bee7" stroke="#4a148c" stroke-width="1.2"/><path d="M10 24 C10 11 34 11 34 24 Z" fill="#aa00ff" stroke="#4a148c" stroke-width="1.5"/><circle cx="16" cy="18" r="2.2" fill="#00e5ff"/><circle cx="28" cy="18" r="2.2" fill="#00e5ff"/><circle cx="22" cy="14" r="2.2" fill="#ffeb3b"/><circle cx="19" cy="28" r="1.5" fill="#d500f9"/><circle cx="25" cy="28" r="1.5" fill="#d500f9"/></svg>`
  },
  magnet_shroom: {
    id: 'magnet_shroom',
    name: 'Nấm Nam Châm (Magnet-shroom)',
    group: 'Hút Kim Loại',
    cost: 100,
    dmg: 'Hút giáp sắt',
    rate: '10s / lần',
    cooldown: '15.0s',
    hp: '300 HP',
    desc: 'Hút nón sắt, thùng sắt của zombie. Đặc biệt, Zombot Dark Dragon luôn ưu tiên nhắm cầu lửa vào Nấm Nam Châm trên sân!',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><rect x="18" y="26" width="8" height="12" rx="2" fill="#78909c" stroke="#37474f" stroke-width="1.2"/><path d="M14 26 C14 12 30 12 30 26 L26 26 C26 16 18 16 18 26 Z" fill="#b0bec5" stroke="#37474f" stroke-width="1.5"/><rect x="12" y="24" width="6" height="4" fill="#e53935"/><rect x="26" y="24" width="6" height="4" fill="#1e88e5"/><circle cx="19" cy="30" r="1.5" fill="#000"/><circle cx="25" cy="30" r="1.5" fill="#000"/></svg>`
  },
  galio: {
    id: 'galio',
    name: 'Galio',
    group: 'Cận Chiến & Khống Chế',
    cost: 200,
    dmg: '50 (0.5s) · Sóng 500 (5s) · Chết 1500',
    rate: '0.5s / đấm · 5s đánh / sóng',
    cooldown: '20.0s',
    hp: '250 HP',
    desc: 'Đánh cơ bản 50 DMG/0.5s trong 2 ô tính từ bản thân. Skill 1: tích đủ 5s khi tấn công zombie sẽ bắn sóng năng lượng gây 500 DMG lên zombie đầu tiên dính chiêu. Skill 2: khi chết dừng thời gian 1s, hút 5 zombie gần nhà nhất về ô Galio và gây 1500 DMG.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><polygon points="8,18 15,12 16,24" fill="#ffd54f" stroke="#8d6e63" stroke-width="1"/><polygon points="36,18 29,12 28,24" fill="#ffd54f" stroke="#8d6e63" stroke-width="1"/><rect x="14" y="12" width="16" height="22" rx="5" fill="#eceff1" stroke="#b0bec5" stroke-width="1.4"/><circle cx="22" cy="22" r="4" fill="#00e5ff"/></svg>`
  },
  jhinplant: {
    id: 'jhinplant',
    name: 'Jhinplant (Hoa Súng Tử Vong)',
    group: 'Xạ Thủ Nhịp 4',
    cost: 250,
    dmg: '44 (2.2s) · Viên IV: 440 · Sen: 444 AoE 2×2',
    rate: '4 viên (2.2s/viên) · Nạp 4s',
    cooldown: '4.0s',
    hp: '440 HP',
    desc: 'Bắn lần lượt 4 viên đạn mỗi 2.2s gây 44 DMG, viên thứ 4 gây x10 sát thương (440 DMG) rồi nạp đạn 4s. Khi viên thứ 4 hạ gục Zombie (không tính Bia Mộ/vật cản) sẽ đặt Bẫy Hoa Sen tại ô đó, phát nổ 444 DMG AoE 2×2 ô khi Zombie bước vào.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><polygon points="22,6 30,15 37,22 29,29 22,37 15,29 7,22 14,15" fill="#6a1b9a" stroke="#ce93d8" stroke-width="1.4"/><ellipse cx="22" cy="22" rx="7" ry="9" fill="#f3e5f5" stroke="#311b92" stroke-width="1.2"/><circle cx="25" cy="20" r="2" fill="#ff1744"/><line x1="22" y1="11" x2="39" y2="11" stroke="#ff1744" stroke-width="2"/></svg>`
  },
  blover: {
    id: 'blover',
    name: 'Cỏ Ba Lá (Blover)',
    group: 'Thổi Bay Tức Thời',
    cost: 50,
    dmg: 'Thổi bay toàn bộ mục tiêu bay',
    rate: 'Tức thì (dùng 1 lần)',
    cooldown: '10.0s',
    hp: '300 HP',
    desc: 'Thổi bay ngay lập tức mọi zombie đang bay hoặc ở trạng thái lơ lửng (như Imp bị ném trên không, Pole Vaulting đang nhảy sào...), rồi biến mất sau 1 lần dùng.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><line x1="22" y1="22" x2="22" y2="39" stroke="#2e7d32" stroke-width="3.5" stroke-linecap="round"/><ellipse cx="22" cy="12" rx="6" ry="8" fill="#00e676" stroke="#1b5e20" stroke-width="1.3"/><ellipse cx="13" cy="22" rx="8" ry="6" fill="#00e676" stroke="#1b5e20" stroke-width="1.3"/><ellipse cx="31" cy="22" rx="8" ry="6" fill="#00e676" stroke="#1b5e20" stroke-width="1.3"/><circle cx="22" cy="20" r="4" fill="#b9f6ca"/></svg>`
  },
  spikeweed: {
    id: 'spikeweed',
    name: 'Cỏ Gai (Spikeweed)',
    group: 'Bẫy Sát Đất',
    cost: 50,
    dmg: '20 DMG / 0.5s',
    rate: 'Liên tục 0.5s/lần khi dẫm',
    cooldown: '5.0s',
    hp: '300 HP',
    desc: 'Nằm sát mặt đất gây 20 sát thương mỗi 0.5s cho zombie đi qua. Không bị zombie thường ăn, nhưng vẫn bị khối băng đè nát và bị Gargantuar / Zomboss đập phá.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><ellipse cx="22" cy="34" rx="16" ry="5" fill="#1b5e20"/><polygon points="10,34 14,16 18,34" fill="#455a64" stroke="#263238" stroke-width="1.2"/><polygon points="18,34 22,12 26,34" fill="#455a64" stroke="#263238" stroke-width="1.2"/><polygon points="26,34 30,16 34,34" fill="#455a64" stroke="#263238" stroke-width="1.2"/></svg>`
  },
  lux: {
    id: 'lux',
    name: 'Lux (Tiểu Thư Ánh Sáng)',
    group: 'Tia Sáng Xuyên Hàng',
    cost: 300,
    dmg: '45 DMG/s · Ulti 600 + Choáng 2s',
    rate: '1.0s / tia · Đủ 10 hạ/hỗ trợ',
    cooldown: '5.0s',
    hp: '300 HP',
    desc: 'Bắn tia sáng xuyên thấu toàn bộ 1 hàng gây 45 DMG/s lên mọi zombie và vật cản. Khi hạ hoặc hỗ trợ tiêu diệt đủ 10 zombie sẽ bắn Luồng Sáng Hủy Diệt gây 600 DMG cả hàng (không chết bị choáng 2s) rồi reset 0/10.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><circle cx="22" cy="22" r="14" fill="#fff59d" stroke="#f9a825" stroke-width="1.6"/><polygon points="22,6 26,18 38,22 26,26 22,38 18,26 6,22 18,18" fill="#ffd54f" stroke="#ff8f00" stroke-width="1.2"/><circle cx="22" cy="22" r="5" fill="#ffffff"/></svg>`
  },
  syndra: {
    id: 'syndra',
    name: 'Phù Thủy Syndra',
    group: 'Pháp Sư Bóng Tối',
    cost: 250,
    dmg: '15/0.5s · Cầu 100 · Cường Hóa 600',
    rate: '0.5s / đòn · 3s / 1 Quả Cầu',
    cooldown: '12.0s',
    hp: '200 HP',
    desc: 'Hoa dạ lan hương / lưu ly biến dị sắc tối dáng cao thanh thoát. Đánh thường 15 DMG / 0.5s. Mỗi 3s tích tụ 1 quả cầu: có zombie sẽ ném cầu 100 DMG (nếu hạ gục zombie sẽ hồi lại 1 cầu); không có zombie sẽ tích tối đa 3 stack, đủ 3 stack phóng Cầu Cường Hóa sốc 600 DMG vào 1 mục tiêu có ATK cao nhất trên hàng.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><circle cx="22" cy="20" r="10" fill="#4a148c" stroke="#e040fb" stroke-width="1.5"/><circle cx="10" cy="14" r="4.5" fill="#d500f9" stroke="#f3e5f5" stroke-width="1"/><circle cx="34" cy="14" r="4.5" fill="#d500f9" stroke="#f3e5f5" stroke-width="1"/><circle cx="22" cy="34" r="4.5" fill="#d500f9" stroke="#f3e5f5" stroke-width="1"/></svg>`
  },
  kata: {
    id: 'kata',
    name: 'Kata Blade Rose',
    group: 'Sát Thủ Lưỡi Kiếm',
    cost: 100,
    dmg: '30/s (Nảy 3) · Bão Dao 30/0.25s',
    rate: '1.0s / dao · Xoay 3s (hồi đầy HP khi hạ)',
    cooldown: '9.0s',
    hp: '450 HP',
    desc: 'Hoa hồng lưỡi kiếm tầm đánh 2 ô: ném dao cầu vồng từ trên xuống gây 30 DMG nảy tối đa 3 mục tiêu trong phạm vi 3×2 (gồm hàng trên/dưới; chỉ đánh 1 lần nếu chỉ có 1 zombie). Sau 3s tấn công zombie sẽ xoay Bão Dao 3×3 trong 3s gây 30 DMG mỗi 0.25s; lập tức hồi đầy máu nếu hạ gục zombie khi đang xoay rồi đánh thường đủ 3s cho lần xoay tiếp.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><circle cx="22" cy="22" r="11" fill="#b71c1c" stroke="#ff5252" stroke-width="1.6"/><polygon points="22,4 26,18 40,22 26,26 22,40 18,26 4,22 18,18" fill="#eceff1" stroke="#d50000" stroke-width="1.2"/></svg>`
  },
  aurora: {
    id: 'aurora',
    name: 'Aurora (Hoa Chuông Linh Giới)',
    group: 'Cầu Vồng & Pháp Trận',
    cost: 250,
    dmg: '40/2s (Xuyên 4) · Pháp Trận 200',
    rate: '2.0s / thỏ · 20s / Pháp Trận',
    cooldown: '15.0s',
    hp: '300 HP',
    desc: 'Bắn linh hồn thỏ theo quỹ đạo cầu vồng gây 40 DMG mỗi 2s xuyên thấu 4 mục tiêu và đẩy lùi zombie đầu tiên 1 ô (không đẩy lùi Mini-Boss/Boss). Mỗi 20s triệu hồi Pháp Trận toàn sân tại zombie gần nhà nhất (khi có nhiều Aurora trên sân, chỉ 1 Aurora trồng sớm nhất kích hoạt kỹ năng), gây 200 DMG phạm vi 2 ô và đẩy tất cả zombie (kể cả Mini-Boss, trừ Zomboss) văng về rìa phải ngoài cùng.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><ellipse cx="16" cy="12" rx="4" ry="9" fill="#e0f7fa" stroke="#f48fb1" stroke-width="1.2"/><ellipse cx="28" cy="12" rx="4" ry="9" fill="#e0f7fa" stroke="#f48fb1" stroke-width="1.2"/><circle cx="22" cy="26" r="11" fill="#80deea" stroke="#f06292" stroke-width="1.5"/></svg>`
  },
  ahri: {
    id: 'ahri',
    name: 'Ahri (Hồ Ly Chín Đuôi)',
    group: 'Boomerang & Mê Hoặc',
    cost: 200,
    dmg: 'Đi 25 · Về 50 Chuẩn (Xuyên Khiên/Giáp)',
    rate: '1.75s / lần · Tầm 5 ô · Mê hoặc 4s / 15s',
    cooldown: '10.0s',
    hp: '200 HP',
    desc: 'Tấn công mỗi 1.75s theo đường thẳng tầm 5 ô như boomerang: lượt đi gây 25 DMG, khi hết tầm quả cầu trắng bay về gây 50 Sát Thương Chuẩn (xuyên khiên & giáp). Mỗi 15s thôi miên tạm thời 4s zombie gần nhất cùng hàng (giữ nguyên HP, giáp và mọi trạng thái; không thôi miên Boss / Mini-Boss) quay lại đánh zom địch, hết 4s trở lại bình thường.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><polygon points="10,16 14,6 20,14" fill="#fce4ec" stroke="#e91e63" stroke-width="1.2"/><polygon points="34,16 30,6 24,14" fill="#fce4ec" stroke="#e91e63" stroke-width="1.2"/><circle cx="22" cy="24" r="10" fill="#f48fb1" stroke="#c2185b" stroke-width="1.4"/><circle cx="34" cy="26" r="5" fill="#ffffff" stroke="#80deea" stroke-width="1.4"/></svg>`
  },
  irelia: {
    id: 'irelia',
    name: 'Kiếm Vũ Ire',
    group: 'Sát Thủ Kết Liễu',
    cost: 200,
    dmg: '35 / 0.8s · Kết Liễu <250 HP (<10%)',
    rate: '0.8s (+10%/stack, max 3) · Skill 3×3 (2s)',
    cooldown: '10.0s',
    hp: '400 HP',
    desc: 'Tầm đánh 2 ô gây 35 DMG mỗi 0.8s. Kỹ năng phạm vi 3×3 (hồi chiêu 2s): khi có zombie dưới 250 HP (với zombie có HP cơ bản dưới 250 thì tính dưới 10% HP) và không có Bất Tử, lập tức di chuyển tới ô đó kết liễu mục tiêu và tăng vĩnh viễn +10% tốc độ đánh (tối đa 3 lần).',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><polygon points="22,4 27,18 22,36 17,18" fill="#80d8ff" stroke="#00838f" stroke-width="1.4"/><polygon points="10,12 15,22 10,32 7,22" fill="#ffd54f" stroke="#ef6c00" stroke-width="1.1"/><polygon points="34,12 37,22 34,32 29,22" fill="#ffd54f" stroke="#ef6c00" stroke-width="1.1"/><circle cx="22" cy="22" r="6" fill="#00b0ff" stroke="#ffd54f" stroke-width="1.3"/></svg>`
  },
  karma: {
    id: 'karma',
    name: 'Karma (Khai Sáng)',
    group: 'Hỗ Trợ Tạo Khiên',
    cost: 75,
    dmg: '0 DMG · Buff +200 Khiên',
    rate: '5.0s / lần (Lần 4 cường hóa 3×3)',
    cooldown: '9.0s',
    hp: '150 HP',
    desc: '0 sát thương. Mỗi 5s buff +200 Khiên cho cây phòng thủ đứng ngay trước mặt 1 ô. Sau 3 lần buff thường, lần thứ 4 sẽ cường hóa Kinh Lược Hồn buff +200 Khiên cho toàn bộ cây trong phạm vi 3×3!',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><circle cx="22" cy="22" r="16" fill="none" stroke="#1de9b6" stroke-width="2.2"/><circle cx="22" cy="22" r="9" fill="#00bfa5" stroke="#ffd54f" stroke-width="1.5"/><polygon points="22,15 25,20 22,25 19,20" fill="#ffd54f"/></svg>`
  },
  squash: {
    id: 'squash',
    name: 'Bí Đè (Squash)',
    group: 'Đè Nát Tức Thời',
    cost: 50,
    dmg: '1800 DMG (Tức Thời)',
    rate: 'Kích hoạt khi Zombie tới gần 1.35 ô',
    cooldown: '20.0s',
    hp: '300 HP',
    desc: 'Cây dùng 1 lần. Khi Zombie áp sát phạm vi 1.35 ô sẽ nhảy bật lên không trung rồi giáng mạnh nghiền nát mục tiêu với 1800 sát thương! Tại Màn 20 Bến Cảng Tử Thần, cây dùng 1 lần biến mất sau khi nổ và chỉ nhận lại qua Truy Nã.',
    svg: `<svg viewBox="0 0 44 44" width="100%" height="100%"><path d="M12 34 Q10 14 22 10 Q34 14 32 34 Q22 38 12 34 Z" fill="#558b2f" stroke="#2e5714" stroke-width="1.5"/><path d="M22 10 Q24 5 27 6" stroke="#33691e" stroke-width="2.5" fill="none"/><polygon points="14,19 20,21 15,24" fill="#fff"/><circle cx="17" cy="22" r="1.4" fill="#000"/><polygon points="30,19 24,21 29,24" fill="#fff"/><circle cx="27" cy="22" r="1.4" fill="#000"/></svg>`
  }
};

const ZOMBIE_PREVIEW_INFO = {
  basic: {
    name: 'Zombie Cơ Bản',
    avatar: '🧟',
    hpText: 'HP: 200 · Tốc độ: 5.0s/ô',
    desc: 'Kẻ thù tiêu chuẩn không giáp. Dễ dàng bị tiêu diệt bởi 10 phát đậu.'
  },
  conehead: {
    name: 'Zombie Nón Giao Thông',
    avatar: '🪖',
    hpText: 'HP: 560 (370 Giáp Nón + 190 Máu)',
    desc: 'Đội nón giao thông chịu đòn cực tốt, tăng gấp 2.8 lần máu cơ bản!'
  },
  buckethead: {
    name: 'Zombie Thùng Sắt (Buckethead)',
    avatar: '🪣',
    hpText: 'HP: 1290 (1100 Giáp Thép + 190 Máu)',
    desc: 'Bọc thép siêu kiên cố! Cần Repeater hoặc Bom Cherry để phá hủy.'
  },
  pole_vaulting: {
    name: 'Zombie Cầm Sào (Pole Vaulting)',
    avatar: '🏃',
    hpText: 'HP: 500 · Tốc độ nhảy nhanh 2.5s/ô',
    desc: 'Cầm sào phóng qua cây đầu tiên trên hàng! Dùng Wall-nut làm mồi nhử.'
  },
  tombstone: {
    name: 'Bia Mộ Cổ (Tombstone)',
    avatar: '🪦',
    hpText: 'HP: 500 (Vật cản chặn đạn thẳng)',
    desc: 'Chắn đứng mọi hạt đậu bắn thẳng! Nên mang Bắp Cải / Dưa Hấu ném cầu vồng.'
  },
  gargantuar: {
    name: 'BOSS KHỔNG LỒ GARGANTUAR',
    avatar: '👹',
    hpText: 'HP: 3000 · Kháng đẩy lùi 100%',
    desc: 'Đập 1 chày tiêu diệt ngay bất kỳ cây nào! Khi còn nửa máu sẽ ném Imp vào sâu phòng tuyến!',
    boss: true
  },
  imp: {
    name: 'Quỷ Lùn Imp',
    avatar: '🦹',
    hpText: 'HP: 100 · Tốc độ chạy 2.5s/ô',
    desc: 'Bị Gargantuar ném vào sâu phòng tuyến, chạy nhanh và cắn phá cây hậu phương.'
  },
  turquoise_skull: {
    name: 'Zombie Đầu Lâu Ngọc (Turquoise Skull)',
    avatar: '💀',
    hpText: 'HP: 900 · Sát thương Laser: 4000',
    desc: 'Tích tụ sức mạnh hắc ám từ đầu lâu ngọc trong 5s rồi bắn tia laser hủy diệt thiêu rụi cây phòng thủ!'
  },
  jurassic_bully: {
    name: 'Kẻ Bắt Nạt Tiền Sử (Jurassic Bully)',
    avatar: '🦣',
    hpText: 'HP: 2400 · Miễn nhiễm đẩy lùi',
    desc: 'Thể hình hộ pháp có thể chịu đựng được mọi đòn tấn công.'
  },
  zombot_dark_dragon: {
    name: 'TRÙM ZOMBOT DARK DRAGON',
    avatar: '🐲',
    hpText: 'HP: 27.000 · Hitbox 2 Hàng',
    desc: 'Trùm Rồng Cơ Giới Dark Ages: Gầm triệu hồi lính trồi từ mặt đất, Nhổ cầu lửa ấp nở Imp Dragon & thiêu đất 10s, Khạc lửa càn quét 2 hàng (dùng Plant Food để ngắt đòn). Miễn nhiễm choáng (choáng chuyển thành làm chậm và delay hành động 1.5s)!',
    boss: true
  },
  imp_dragon: {
    name: 'Imp Dragon Zombie',
    avatar: '🦎',
    hpText: 'HP: 190 · Tốc độ 2.8s/ô · Kháng Lửa',
    desc: 'Ấp nở từ cầu lửa của rồng. Miễn nhiễm với sát thương lửa và chạy rất nhanh.'
  },
  lang_khach: {
    name: 'Lãng Khách Zombie (Yasuo)',
    avatar: '🌪️',
    hpText: 'HP: 600 · Tốc độ Trung Bình · 60 DMG / 0.5s',
    desc: 'Đội nón lá rách, tóc bạc che mắt, cầm kiếm xương và có lá phong xoay dưới chân. Skill 1: Cách cây 3 ô lướt xuyên qua gây 100 DMG; sau khi lướt không thể lướt tiếp cho tới khi đánh thường ăn được 1 cây (60 DMG / 0.5s). Skill 2: Dưới 50% HP bất tử 3s. Skill 3: Lướt 2 lần bắn lốc xoáy 1800 DMG lên 2 ô trước mặt!'
  },
  shen: {
    name: 'Shen Mắt Hoàng Hôn',
    avatar: '🥷',
    hpText: 'HP: 1800 (Hardened) · Tốc độ Basic · 60 DMG/s (114 DMG / 1.9s)',
    desc: 'Mặc giáp ninja tím đặc trưng, sau lưng luôn đeo thanh Kiếm Linh Hồn. Skill 1: Khi đồng minh >500 HP (trừ Gargantuar, Zomboss) xuống ≤50% HP, triệu hồi Kiếm Hồn buff 350 Giáp cho đồng minh gần nhất (hồi chiêu 7s; độc xuyên qua giáp). Skill 2: Hạ gục mọi cây phòng thủ trong đúng 3 lần cắn.'
  },
  anivia: {
    name: 'Anivia Phượng Hoàng Băng',
    avatar: '🦅',
    hpText: '660 HP · Trứng 770 · Dạng 2: 1100 HP',
    desc: 'Zombie bay lớn miễn nhiễm làm chậm & đóng băng từ hệ băng, né hoàn toàn Cỏ Gai & Mìn Khoai Tây dưới đất, không thể bị Blover thổi bay hay Chomper nuốt. Bắn cột băng sắc nhọn tầm 3 ô (40/s, Dạng 2: 40/0.35s). Chết biến thành Trứng Băng Giá 770 HP, hồi sinh Dạng 2 sau 5s và đóng băng cây bị hạ thành Khối Băng HP = 1/2 cây gốc.'
  },
  balloon: {
    name: 'Zombie Bóng Bay',
    avatar: '🎈',
    hpText: 'HP: 190 · Tốc độ: 4.5s/ô (Bay Nhỏ)',
    desc: 'Zombie bay nhỏ bay lơ lửng trên không, né hoàn toàn Cỏ Gai & Mìn Khoai Tây dưới đất. Dễ dàng bị thổi bay bởi Cỏ Ba Lá (Blover).'
  },
  jetpack: {
    name: 'Zombie Jetpack',
    avatar: '🚀',
    hpText: 'HP: 350 · 4.8s/ô (×1.5 nửa sân)',
    desc: 'Zombie bay nhỏ đeo động cơ phản lực. Khi tiến gần nửa sân (cột ≤ 5) sẽ kích hoạt tăng ×1.5 tốc độ lao về nhà. Bị thổi bay bởi Cỏ Ba Lá (Blover).'
  },
  thresh: {
    name: 'Thresh Zombie',
    avatar: '⛓️',
    hpText: 'HP: 490 · Tầm ném xích 3 ô · 100 DMG / 1.5s',
    desc: 'Cai ngục xanh lá u ám cầm xích sắt. Ném xích trói cây phía trước (gây choáng nếu là cây tấn công), mỗi 1.5s kéo cây về phía Thresh 1 ô và gây 100 DMG (kéo ra hết sân sẽ diệt luôn cây). Không bị Nam Châm hút; hạ xong cây lập tức ném xích tiếp.'
  },
  quan_chua: {
    name: 'Quận Chúa',
    avatar: '👑',
    hpText: 'HP: 600 · Tốc độ: 7.0s/ô · 150 DMG / 1.0s (Tầm 1 ô)',
    desc: 'Pháp sư quý tộc hắc ám tích lũy linh hồn khi zombie cùng hàng chết. Đủ ≥3 linh hồn sẽ đứng im niệm phép 3s rồi triệu hồi Imp bằng số linh hồn thu được; đạt 5+ zombie chết gọi thêm 1 Nón Giao Thông; Gargantuar cùng hàng chết gọi thêm 1 Thùng Sắt.'
  },
  dragon_hatchling: {
    name: 'Rồng Mới Nở',
    avatar: '🐣',
    hpText: 'HP: 200 · 4.5s/ô (Bay Nhỏ) · Khạc Lửa 100/0.85s',
    desc: 'Rồng nhỏ bay nhẹ trên không, né Cỏ Gai & Mìn Khoai Tây dưới đất và bị Blover thổi bay. Phun lửa tầm gần 100 DMG mỗi 0.85s.'
  },
  dragon_adult: {
    name: 'Rồng Trưởng Thành',
    avatar: '🐉',
    hpText: 'HP: 500 · 3.8s/ô (Bay Lớn) · Khạc Lửa 150/1.0s',
    desc: 'Rồng trưởng thành sải cánh trên không (Bay Lớn), kháng thổi bay Blover, né bẫy mặt đất và khạc lửa đốt cây 150 DMG/s.'
  },
  dragon_dark: {
    name: 'Rồng Hắc Ám',
    avatar: '🖤',
    hpText: 'HP: 300 + Giáp Hấp Thụ · 4.5s/ô · Đòn đầu ×2 (300 DMG)',
    desc: 'Xuất hiện kèm 1–2 rồng cấp thấp; khi ra sân nuốt 1 rồng thường cùng hàng biến máu thành Giáp Hắc Ám (không bị Nam Châm hút). Đòn đánh đầu tiên lên mỗi cây gây ×2 sát thương (300 DMG).'
  },
  dragon_chemtech: {
    name: 'Rồng Hóa Kỹ',
    avatar: '🧪',
    hpText: 'HP: 1000 · 6.0s/ô (Đi Bộ) · 169 DMG/1.0s',
    desc: 'Mỗi khi mất 200 HP ném bình thuốc ngẫu nhiên vào ô trống 3×3 (tối đa 5 bình; nếu sốc sát thương chết sẽ ném nốt số bình còn lại). Bình thuốc chặn trồng cây và buff 1 hiệu ứng (Tím ×2 tốc chạy | Xanh lá +300 HP hóa lớn | Đỏ ×2 tốc đánh) cho đồng minh khác.'
  },
  dragon_wind: {
    name: 'Rồng Gió',
    avatar: '🌪️',
    hpText: 'HP: 400 · 1.0s/ô (Bay Nhẹ) · 50 DMG/1.0s',
    desc: 'Rồng bay nhẹ cực nhanh (1s/ô), né bẫy mặt đất và bị Blover thổi bay. Khi ra sân lập tức thổi gió tăng ×2 tốc độ chạy trong 3s cho tất cả zombie/rồng cùng hàng!'
  },
  dragon_water: {
    name: 'Rồng Nước',
    avatar: '💧',
    hpText: 'HP: 100 → 3855 (10 Bản Thể) · 6.0s/ô · 20 → 777 DMG/1.0s',
    desc: 'Xuất trận ở giữa màn (Wave 3) với 10 bản thể. Mạng 1 có 100 HP, 20 ATK/s, 6s/ô; mỗi khi chết hồi sinh ở ô đầu một hàng khác và cộng thêm +1/2 HP và ATK của bản vừa chết (tới mạng thứ 10).'
  },
  ancient_dragon_boss: {
    name: 'BOSS Rồng Ngàn Tuổi',
    avatar: '🐲',
    hpText: 'HP: 10.000 · Cố Định (2 Hàng) · 7 Tuyệt Kỹ',
    desc: 'Di chuyển thả Rồng & Zombie. Skill 1: Sét hủy diệt 3 cây ATK cao nhất (20s). Skill 2: Mất 1000 HP đầu gọi 5 Gargantuar 5 hàng. Skill 3: Gargantuar chết +500 Khiên mọi sát thương (cộng dồn). Skill 4: Mỗi 1500 máu thực gầm choáng 2s cây tấn công. Skill 5: Hủy diệt cây <15% HP. Skill 6: Mưa hồi 20% máu rồng (16s). Skill 7: Còn ≤100 HP thả tất cả Zombie & Rồng ×2 (Rồng Nước mạng 10).'
  },
  azir_desert_emperor: {
    name: 'BOSS Azir Hoàng Đế Sa Mạc',
    avatar: '🦅',
    hpText: 'HP: 20.000 · Cố Định (2 Hàng) · 3 Phase',
    desc: 'Hoàng Đế Shurima đầu đại bàng vàng. Phase 1: Triệu hồi quân & Lính Cát ưu tiên trồi dậy ở hàng có nhiều cây nhất (tránh 2 ô cuối). Phase 2 (15.000 HP): Bão Cát hủy diệt toàn bộ cây & zombie 3 hàng, sau 20s gọi 1 Wave Zombie có bão cát dưới chân ×2 tốc độ chạy, đồng thời cường hóa Lính Cát thành Quan Tài 800 HP. Phase 3 (7.000 HP): Triệu hồi song thần Cá Sấu & Thần Khuyển!'
  },
  sand_soldier: {
    name: 'Lính Cát Sa Mạc',
    avatar: '⏳',
    hpText: 'HP: 240 · 4.5s/ô · 200 DMG (1 Đòn Biến Mất)',
    desc: 'Chiến binh cát trỗi dậy trực tiếp từ mặt đất dưới chân cây (tránh 2 ô cuối). Tấn công được 1 cây gây 200 sát thương rồi lập tức tan biến vào cát!'
  },
  sand_coffin: {
    name: 'Quan Tài Sa Mạc',
    avatar: '⚰️',
    hpText: 'HP: 800 · Vật Cản Đứng Im Như Bia Mộ',
    desc: 'Lính Cát được Azir cường hóa thành Quan Tài 800 HP chắn đứng đạn thẳng. Khi quan tài bị phá vỡ sẽ triệu hồi 1 Basic Zombie!'
  },
  renekton_croc: {
    name: 'Thần Cá Sấu (Mini-Boss)',
    avatar: '🐊',
    hpText: 'HP: 2700 · 6.0s/ô · 100/s → 250 DMG Khổng Lồ',
    desc: 'Skill 1: Lướt qua 2 cây đầu tiên gặp phải gây 1000 DMG. Đến giữa sân hóa Khổng Lồ tăng đánh thường lên 250 DMG; Skill 2 (chỉ dùng 1 lần): tụ lực 3s quét đao phạm vi 3×3 gây 400 DMG, hồi 100 HP mỗi cây trúng chiêu rồi lướt tiếp 1 ô!'
  },
  nasus_hound: {
    name: 'Thần Khuyển (Mini-Boss)',
    avatar: '🐺',
    hpText: 'HP: 3000 · 6.0s/ô · 100/s → Hủy Diệt Cây',
    desc: 'Skill 1 Lão Hóa (tầm 2 ô, hồi 10s): Gây vùng 2×2 làm chậm 50% tốc đánh trong 5s và đốt 10 DMG/0.5s. Khi xuống dưới 60% HP hóa lớn (ngừng Lão Hóa), tốc đánh 2s/lần nhưng mỗi đòn hủy diệt ngay 1 cây và hồi +350 HP!'
  },
  nosus_thrall: {
    name: 'Binh Sĩ Nosus',
    avatar: '🪓',
    hpText: 'HP: 210 · 4.5s/ô · 45 DMG / 0.5s',
    desc: 'Bộ binh tiên phong của đế chế Nosus mang rìu thép thẫm máu. Tốc độ áp sát nhanh hơn Zombie thường để gây áp lực từ đầu trận.'
  },
  nosus_assassin: {
    name: 'Sát Thủ Huyết Đao Nosus',
    avatar: '🗡️',
    hpText: 'HP: 340 · 4.0s/ô → ×1.6 Cuồng Huyết · 65 DMG / 0.5s',
    desc: 'Sát thủ song đao hắc huyết. Ngay lần đầu trúng sát thương không chí tử sẽ kích hoạt Cuồng Huyết (×1.6 tốc độ di chuyển trong 3s) lao thẳng vào tuyến phòng thủ!'
  },
  nosus_shieldbearer: {
    name: 'Vệ Binh Khiên Sắt Nosus',
    avatar: '🛡️',
    hpText: 'HP: 1050 (300 + 750 Khiên Sắt) · 6.2s/ô · 65 DMG / 0.5s',
    desc: 'Vệ binh bọc đại khiên sắt Nosus 750 HP, kháng 40% đẩy lùi. Có thể dùng Nấm Nam Châm (Magnet-shroom) để hút bay khiên sắt!'
  },
  nosus_hemomancer: {
    name: 'Huyết Pháp Sư Nosus',
    avatar: '🩸',
    hpText: 'HP: 760 · 6.5s/ô · Cầu Máu 80 DMG (2.5 ô) · Huyết Tế',
    desc: 'Pháp sư huyết thuật tầm xa: bắn cầu máu tầm 2.5 ô gây 80 DMG mỗi 1.4s. Mỗi 6.5s niệm Huyết Tế hồi +120 HP và tăng +25% tốc độ cho bản thân cùng đồng minh phạm vi 3×2 trong 2.5s.'
  },
  nosus_warlord: {
    name: 'Darius (Đại Tướng Nosus)',
    avatar: '🪓',
    hpText: 'HP: 3200 (Mini-Boss) · 6.0s/ô · Miễn Làm Chậm/Thôi Miên/Đẩy',
    desc: 'Đại Tướng Darius miễn nhiễm Làm Chậm, Thôi Miên và Đẩy Lùi! Đòn bổ rìu 240 DMG/1.75s tự động Hành Quyết cây <20% HP. Từ ≤50% HP mỗi 5s tung Máy Chém Xoay 3×3 hồi 150–200–300 HP (máu càng ít hồi càng nhiều). Dưới 100 HP kích hoạt Bất Tử 4s (tốc đánh tăng lên 1s/đòn), ×2 tốc chạy và đòn đánh thường One-Hit cây tới khi chết!'
  },
  ionia_zed: {
    name: 'Zed (Chúa Tể Bóng Tối)',
    avatar: '🥷',
    hpText: 'HP: 250 · 1.5s/ô · 50 DMG/s · Dấu Ấn Tử Thần 300 DMG',
    desc: 'Sát thủ bóng tối tốc độ cực cao (1.5s/ô)! Khi vào máu tử, Zed miễn nhiễm sát thương và lao thẳng vào cây gần nhất cùng hàng, hết miễn nhiễm sẽ gắn Dấu Ấn Tử Thần — phát nổ sau 5s gây 300 DMG cho cây đó!'
  },
  ionia_yone: {
    name: 'Yone (Song Kiếm Đấu Sĩ)',
    avatar: '⚔️',
    hpText: 'HP: 500 · 5.0s/ô (Linh Hồn 3.2s/ô) · 70 DMG / 12% HP',
    desc: 'Tấn công mỗi 0.5s luân phiên đòn thường 70 DMG và đòn cường hóa 12% HP. Tới cột 6 kích hoạt Xuất Hồn (E) để lại Thể Xác miễn nhiễm CC và hóa Linh Hồn (+200 HP) lao nhanh 4.5s rồi giật về. Mỗi 8s kể từ khi tấn công tụ lực 1.2s tung Đoạt Mệnh (R) lướt 2 ô hất tung & choáng 2s (120 DMG/cây)!'
  },
  ionia_sett: {
    name: 'Sett (Mini-Boss Đấu Trường)',
    avatar: '🥊',
    hpText: 'HP: 3000 (Mini-Boss) · 6.0s/ô · Liên Hoàn 2×300 DMG',
    desc: 'Mini-Boss Vùng Đất Ionia (Miễn Thôi Miên)! Mỗi 2s đấm liên tiếp 2 đòn × 300 DMG. Tích 100% sát thương thành Gan Lì (max 800 hoặc mất mỗi 700 HP) kích hoạt Cuồng Thú Quyền (W): tạo giáp ảo 500 HP (3s) & đấm sóng 3 ô trước (giữa 550 / rìa 200 DMG). Gặp cây phòng thủ sẽ nhấc ném lùi 2 ô (đè nát nếu ≤300 HP) và nổ 250 DMG lan 3×3 (15s)!'
  },
  drowned_sailor: {
    name: 'Thủy Thủ Đắm Tàu',
    avatar: '⚓',
    hpText: 'HP: 270 · Tốc độ: 5.0s/ô (Trung bình)',
    desc: 'Lính tiên phong đông đảo của Bến Cảng Tử Thần, gây áp lực liên tục lên cả 5 hàng sàn gỗ.'
  },
  anchor_bearer: {
    name: 'Kẻ Vác Neo',
    avatar: '⚓',
    hpText: 'HP: 1350 · Tốc độ: 7.5s/ô (Chậm) · 75 DMG/0.7s',
    desc: 'Sau mỗi 3 đòn cắn, vung mỏ neo khổng lồ đẩy lùi cây chắn về sau 1 ô (nếu ô sau còn trống)!'
  },
  swimming_ghost: {
    name: 'Ma Bơi Lội',
    avatar: '🌊',
    hpText: 'HP: 420 · Lặn dưới nước cột 9 → Trồi lên cột 5',
    desc: 'Lặn tàng hình dưới mặt nước đen từ cột 9, miễn nhiễm mọi đạn và bất ngờ trồi lên tại cột 5, bỏ qua tuyến phòng thủ cột 6!'
  },
  wanted_captain: {
    name: 'Thuyền Trưởng Truy Nã',
    avatar: '💀',
    hpText: 'HP: 950 · Đầu Lâu Đỏ · Chia Phần (Your Cut)',
    desc: 'Luôn chọn đi vào hàng có tổng sát thương (DPS) thấp nhất! Khi bị tiêu diệt sẽ kích hoạt Chia Phần: nhận 1 Thẻ Hạt Giống ngẫu nhiên và tăng +1 giới hạn cây trên sân (tối đa 16).'
  },
  zombot_pyke: {
    name: 'BOSS Zombot Đồ Tể Pyke',
    avatar: '🏴‍☠️',
    hpText: 'HP: 15.000 · Máu Xám (40%, tối đa 800) · Cột 7–9',
    desc: 'Trùm Bến Cảng Tử Thần! Tích 40% sát thương nhận vào thành Máu Xám (tối đa 800 HP) và chỉ hồi khi chém trúng nhát đầu của Dấu Chữ X (R, khóa trần máu theo Phase). R tách hồi chiêu 16s/14s/12s, cảnh báo 2.2s (nhát 1) và 1.8s (nhát 2–3); chém hụt sẽ xóa sạch Máu Xám, kẹt 4s & chịu 150% sát thương!',
    boss: true
  }
};

class Game {
  constructor() {
    this.initPlantKeys();

    this.canvas = document.getElementById('gameCanvas');
    this.renderer = new GameRenderer(this.canvas);
    this.inputHandler = new InputHandler(this.canvas, this);

    this.sunTargetPos = { x: 50, y: 30 };

    this.currentLevel = 1;
    this.pendingLevel = 1;
    this.unlockedLevel = 20; // Mở khóa tất cả các map (1-20)
    this.completedLevels = [];
    this.isSandbox = false;
    this.sandboxNoCooldown = false;
    this.isMenuActive = true;
    this.isBloodharborMode = false;
    this.isSetupPhase = false;
    this.maxPlantsOnBoard = 12;
    this.bloodharborPhase = 1;
    this.floodedCols = [];
    this.fogCols = [];
    this.rootedTiles = [];
    this.recalledPlantHpMap = {};
    this.exhaustedSingleUse = new Set();
    this.yourCutTimer = 20.0;

    // Đội hình 7 cây đã chọn vào trận (Mặc định 7 cây chuẩn PvZ cân bằng)
    this.selectedDeck = ['sunflower', 'peashooter', 'snow_pea', 'wall_nut', 'cabbage_pult', 'repeater', 'cherry_bomb'];
    // Bộ Sandbox mặc định 8 cây & 8 zombie để tránh quá tải
    this.sandboxPlantDeck = ['sunflower', 'peashooter', 'snow_pea', 'wall_nut', 'repeater', 'cherry_bomb', 'blover', 'jhinplant'];
    this.sandboxZombieDeck = ['basic', 'conehead', 'buckethead', 'gargantuar', 'dragon_hatchling', 'dragon_dark', 'dragon_wind', 'dragon_water'];
    this.currentShowcasePlantKey = 'peashooter';

    // Chế độ chơi: 'normal' hoặc 'conveyor'
    this.gameMode = 'normal';
    this.conveyorSystem = (typeof ConveyorBelt !== 'undefined') ? new ConveyorBelt(CONFIG.conveyor) : null;

    this.floatingTexts = [];
    this.audio = typeof AudioSystem !== 'undefined' ? new AudioSystem() : null;

    // Tải tiến trình người chơi (màn đã mở khóa, màn đã hoàn thành, bộ cây đã chọn) từ localStorage
    this.loadProgress();

    this.initDOM();
    this.reset();
    this.lastTimestamp = 0;
    this.animationFrameId = null;

    // Mở màn hình Main Menu ban đầu & render 1 khung hình nền
    this.showMainMenu();
    this.start();
  }

  initPlantKeys() {
    this.plantKeys = [
      'sunflower',
      'peashooter',
      'snow_pea',
      'repeater',
      'wall_nut',
      'potato_mine',
      'hypno_shroom',
      'cabbage_pult',
      'melon_pult',
      'bonk_choy',
      'snapdragon',
      'chomper',
      'cherry_bomb',
      'lightning_reed',
      'stunion',
      'infi_nut',
      'sun_shroom',
      'goo_peashooter',
      'magnet_shroom',
      'galio',
      'jhinplant',
      'blover',
      'spikeweed',
      'lux',
      'syndra',
      'kata',
      'aurora',
      'ahri',
      'irelia',
      'karma',
      'squash'
    ];
  }

  initDOM() {
    this.sunCountEl = document.getElementById('sun-count');
    this.shovelBtn = document.getElementById('shovel-btn');
    this.restartBtn = document.getElementById('restart-btn');
    this.speedBtnEl = document.getElementById('speed-btn');
    this.speedLabelEl = document.getElementById('speed-label');
    this.progressBarEl = document.getElementById('wave-progress-bar');
    this.zombieHeadBadgeEl = document.getElementById('zombie-head-badge');
    this.levelBadgeEl = document.getElementById('level-badge');

    // Các phần tử HUD Wave Meter & Boss HP Task Bar
    this.waveMeterEl = document.getElementById('wave-meter');
    this.flagIconEl = document.getElementById('wave-flag-icon');
    this.bossHpLabelEl = document.getElementById('boss-hp-label');
    this.seedBankEl = document.getElementById('seed-bank');
    this.sunBankEl = document.getElementById('sun-bank');
    this.hudLeftEl = document.getElementById('hud-left');
    this.bhControlsEl = document.getElementById('bloodharbor-controls');
    this.bhPlantCapEl = document.getElementById('bh-plant-cap-badge');
    this.bhCutBadgeEl = document.getElementById('bh-cut-badge');
    this.bhBlowHornBtn = document.getElementById('bh-blow-horn-btn');
    if (this.bhBlowHornBtn) {
      this.bhBlowHornBtn.addEventListener('click', () => this.blowBloodharborHorn());
    }
    this.defaultFlagSvg = this.flagIconEl ? this.flagIconEl.innerHTML : '';
    this.defaultZombieHeadSvg = this.zombieHeadBadgeEl ? this.zombieHeadBadgeEl.innerHTML : '';

    // Modals
    this.dialogOverlay = document.getElementById('dialog-overlay');
    this.dialogTitle = document.getElementById('dialog-title');
    this.dialogMessage = document.getElementById('dialog-message');
    this.dialogRestartBtn = document.getElementById('dialog-restart-btn');
    this.dialogNextBtn = document.getElementById('dialog-next-btn');
    this.dialogMapBtn = document.getElementById('dialog-map-btn');

    this.pauseOverlay = document.getElementById('pause-overlay');
    this.pauseBtn = document.getElementById('pause-btn');
    this.pauseIcon = document.getElementById('pause-icon');

    // Nút Tạm Dừng / Tiếp Tục
    if (this.pauseBtn) {
      this.pauseBtn.addEventListener('click', () => this.togglePause());
    }
    const pauseResumeBtn = document.getElementById('pause-resume-btn');
    if (pauseResumeBtn) {
      pauseResumeBtn.addEventListener('click', () => this.togglePause());
    }
    const pauseRestartBtn = document.getElementById('pause-restart-btn');
    if (pauseRestartBtn) {
      pauseRestartBtn.addEventListener('click', () => {
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
        this.setPaused(false);
        this.reset();
      });
    }
    const pauseMapBtn = document.getElementById('pause-map-btn');
    if (pauseMapBtn) {
      pauseMapBtn.addEventListener('click', () => {
        if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
        this.setPaused(false);
        this.showWorldMap();
      });
    }

    // Nút điều chỉnh tốc độ gameplay (1X / 2X)
    if (this.speedBtnEl) {
      this.speedBtnEl.addEventListener('click', () => this.toggleSpeed());
    }

    // Nút Bật / Tắt Âm Thanh
    this.audioBtn = document.getElementById('audio-btn');
    this.audioIcon = document.getElementById('audio-icon');
    if (this.audioBtn) {
      this.updateAudioButtonUI();
      this.audioBtn.addEventListener('click', () => this.toggleAudio());
    }

    // Khởi tạo hệ thống Từ Điển Cây & Zombie (Almanac)
    this.initAlmanac();

    // Đồng bộ hóa toàn bộ icon cây từ GameRenderer (khay dọc, chọn cây, showcase, almanac)
    this.syncUnifiedPlantIcons();

    // Đăng ký toàn bộ thẻ cây trong khay dọc
    this.cardElements = {};
    this.cooldownElements = {};

    this.plantKeys.forEach(key => {
      const domKey = key.replace(/_/g, '-');
      const cardEl = document.getElementById(`card-${domKey}`);
      const cooldownEl = document.getElementById(`cooldown-${domKey}`);
      if (cardEl) {
        this.cardElements[key] = cardEl;
        cardEl.addEventListener('click', () => this.selectCard(key));
      }
      if (cooldownEl) {
        this.cooldownElements[key] = cooldownEl;
      }
    });

    // Nút xẻng
    if (this.shovelBtn) {
      this.shovelBtn.addEventListener('click', () => {
        this.clearSelection();
        this.setShovel(!this.isShovelActive);
      });
    }

    // Nút Plant Food (PvZ 2 Lá Xanh Siêu Kỹ Năng)
    this.plantFoodBtn = document.getElementById('plant-food-btn');
    this.plantFoodCountEl = document.getElementById('plant-food-count');
    if (this.plantFoodBtn) {
      this.plantFoodBtn.addEventListener('click', () => {
        this.togglePlantFood();
      });
    }

    // Nút chơi lại
    if (this.restartBtn) {
      this.restartBtn.addEventListener('click', () => this.reset());
    }

    if (this.dialogRestartBtn) {
      this.dialogRestartBtn.addEventListener('click', () => {
        this.dialogOverlay.classList.add('hidden');
        this.reset();
      });
    }

    if (this.dialogNextBtn) {
      this.dialogNextBtn.addEventListener('click', () => {
        this.dialogOverlay.classList.add('hidden');
        if (this.currentLevel < 20) {
          this.openSeedSelection(this.currentLevel + 1);
        } else {
          this.showWorldMap();
        }
      });
    }

    if (this.dialogMapBtn) {
      this.dialogMapBtn.addEventListener('click', () => {
        this.dialogOverlay.classList.add('hidden');
        this.showWorldMap();
      });
    }

    const btnMapFromHUD = document.getElementById('map-btn');
    if (btnMapFromHUD) {
      btnMapFromHUD.addEventListener('click', () => this.showWorldMap());
    }

    const stabilizeTime = () => {
      this.lastTimestamp = performance.now();
    };
    document.addEventListener('visibilitychange', stabilizeTime);
    window.addEventListener('blur', stabilizeTime);
    window.addEventListener('focus', stabilizeTime);
  }

  // ==========================================================================
  // HỆ THỐNG CHỌN CÂY VÀO TRẬN (CHOOSE YOUR SEEDS - JETPACK COMPOSE NATIVE)
  // ==========================================================================
  openSeedSelection(levelNumber) {
    this.pendingLevel = levelNumber;
    this.isPaused = true;
    this.isMenuActive = true;
    if (this.audio) this.audio.playBGM('menu');
    if (this.dialogOverlay) this.dialogOverlay.classList.add('hidden');
    if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
  }

  togglePlantInDeck(plantKey) {
    if (this.pendingLevel === 20 && (plantKey === 'sunflower' || plantKey === 'sun_shroom')) {
      return;
    }
    const maxDeckSize = this.pendingLevel === 20 ? 6 : 7;
    const idx = this.selectedDeck.indexOf(plantKey);
    if (idx !== -1) {
      this.selectedDeck.splice(idx, 1);
    } else {
      while (this.selectedDeck.length >= maxDeckSize) {
        this.selectedDeck.pop();
      }
      this.selectedDeck.push(plantKey);
    }
  }

  removePlantFromDeck(plantKey) {
    const idx = this.selectedDeck.indexOf(plantKey);
    if (idx !== -1) {
      this.selectedDeck.splice(idx, 1);
    }
  }

  autoPickDeck() {
    if (this.pendingLevel === 20) {
      this.selectedDeck = ['peashooter', 'snow_pea', 'wall_nut', 'repeater', 'squash', 'cherry_bomb'];
    } else {
      this.selectedDeck = ['sunflower', 'peashooter', 'snow_pea', 'wall_nut', 'cabbage_pult', 'repeater', 'cherry_bomb'];
    }
  }

  clearDeck() {
    this.selectedDeck = [];
  }

  startBattleWithDeck() {
    if (this.selectedDeck.length === 0) {
      this.autoPickDeck();
    }

    try {
      localStorage.setItem('pvz_selected_deck', JSON.stringify(this.selectedDeck));
    } catch (e) {
      console.warn('Lỗi lưu selectedDeck:', e);
    }

    this.startLevel(this.pendingLevel || 1);
  }

  // ==========================================================================
  // HỆ THỐNG LƯU TRỮ VÀ KHÔI PHỤC TIẾN TRÌNH (LOCALSTORAGE PERSISTENCE)
  // ==========================================================================
  loadProgress() {
    try {
      // 1. Cấp độ cao nhất đã mở khóa (Mở khóa toàn bộ 20/20 map theo yêu cầu)
      const savedLevel = localStorage.getItem('pvz_unlocked_level');
      const parsedLevel = parseInt(savedLevel, 10);
      if (!isNaN(parsedLevel) && parsedLevel >= 1 && parsedLevel <= 20) {
        this.unlockedLevel = Math.max(parsedLevel, 20);
      } else {
        this.unlockedLevel = 20;
      }

      // 2. Danh sách các màn đã vượt qua (chiến thắng)
      const savedCompleted = localStorage.getItem('pvz_completed_levels');
      if (savedCompleted) {
        try {
          const list = JSON.parse(savedCompleted);
          if (Array.isArray(list)) {
            this.completedLevels = list.map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n >= 1 && n <= 20);
          } else {
            this.completedLevels = [];
          }
        } catch {
          this.completedLevels = [];
        }
      } else {
        this.completedLevels = [];
        for (let lv = 1; lv < this.unlockedLevel; lv++) {
          this.completedLevels.push(lv);
        }
      }

      // 3. Bộ bài 6-7 cây yêu thích đã chọn
      const savedDeck = localStorage.getItem('pvz_selected_deck');
      if (savedDeck) {
        try {
          const deck = JSON.parse(savedDeck);
          if (Array.isArray(deck) && (deck.length === 6 || deck.length === 7) && deck.every(k => this.plantKeys.includes(k))) {
            this.selectedDeck = deck;
          }
        } catch {}
      }

      console.log(`[PvZ Progress] Đã tải tiến trình: Đã mở Cấp ${this.unlockedLevel}, Đã vượt qua: [${this.completedLevels.join(', ')}]`);
    } catch (err) {
      console.warn('Lỗi đọc localStorage:', err);
      this.unlockedLevel = 20;
      this.completedLevels = [];
    }
  }

  saveProgress() {
    try {
      localStorage.setItem('pvz_unlocked_level', this.unlockedLevel.toString());
      localStorage.setItem('pvz_completed_levels', JSON.stringify(this.completedLevels || []));
      if (this.selectedDeck && (this.selectedDeck.length === 6 || this.selectedDeck.length === 7)) {
        localStorage.setItem('pvz_selected_deck', JSON.stringify(this.selectedDeck));
      }
      console.log(`[PvZ Progress] Đã lưu tiến trình thành công vào localStorage: Cấp ${this.unlockedLevel}`);
    } catch (err) {
      console.warn('Lỗi ghi localStorage:', err);
    }
  }

  resetProgress() {
    try {
      this.unlockedLevel = 20;
      this.completedLevels = [];
      localStorage.setItem('pvz_unlocked_level', '20');
      localStorage.setItem('pvz_completed_levels', JSON.stringify([]));
    } catch (err) {
      console.warn('Lỗi reset tiến trình:', err);
    }
  }

  renderInGameSeedBank() {
    // Ẩn/Hiện thẻ cây trong khay hạt giống dọc theo đội hình đã chọn (8 cây trong Sandbox, 7 cây trong Chiến dịch)
    const allowedSandboxPlants = (Array.isArray(this.sandboxPlantDeck) && this.sandboxPlantDeck.length > 0)
      ? this.sandboxPlantDeck
      : this.plantKeys.slice(0, 8);
    this.plantKeys.forEach(key => {
      const cardEl = this.cardElements[key];
      if (cardEl) {
        if (this.isSandbox) {
          cardEl.style.display = allowedSandboxPlants.includes(key) ? 'flex' : 'none';
        } else {
          const isChosen = this.selectedDeck.includes(key);
          cardEl.style.display = isChosen ? 'flex' : 'none';
        }
      }
    });
  }

  setSandboxZombieDeck(list) {
    if (!Array.isArray(list)) return;
    const hasConfig = typeof ZOMBIE_CONFIG !== 'undefined';
    const valid = list
      .filter((id, idx, arr) => typeof id === 'string' && (!hasConfig || !!ZOMBIE_CONFIG[id]) && arr.indexOf(id) === idx)
      .slice(0, 8);
    this.sandboxZombieDeck = valid;
    this.renderSandboxZombiePool();
    if (typeof this.updateHUD === 'function') {
      this.updateHUD();
    }
  }

  toggleSandboxZombie(zombieId) {
    if (!zombieId || (typeof ZOMBIE_CONFIG !== 'undefined' && !ZOMBIE_CONFIG[zombieId])) return;
    const current = Array.isArray(this.sandboxZombieDeck) ? [...this.sandboxZombieDeck] : [];
    const idx = current.indexOf(zombieId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      if (current.length >= 8) {
        current.pop();
      }
      current.push(zombieId);
    }
    this.setSandboxZombieDeck(current);
  }

  resetDefaultSandboxZombies() {
    this.setSandboxZombieDeck([
      'basic', 'conehead', 'buckethead', 'gargantuar',
      'dragon_hatchling', 'dragon_dark', 'dragon_wind', 'dragon_water'
    ]);
  }

  renderSandboxZombiePool() {
    if (typeof document === 'undefined') return;
    const allowedZombies = Array.isArray(this.sandboxZombieDeck)
      ? this.sandboxZombieDeck.slice(0, 8)
      : ['basic', 'conehead', 'buckethead', 'gargantuar', 'dragon_hatchling', 'dragon_dark', 'dragon_wind', 'dragon_water'];

    const btnToType = {
      'sb-spawn-basic': 'basic',
      'sb-spawn-conehead': 'conehead',
      'sb-spawn-buckethead': 'buckethead',
      'sb-spawn-pole-vaulting': 'pole_vaulting',
      'sb-spawn-gargantuar': 'gargantuar',
      'sb-spawn-imp': 'imp',
      'sb-spawn-tombstone': 'tombstone',
      'sb-spawn-bully': 'jurassic_bully',
      'sb-spawn-skull': 'turquoise_skull',
      'sb-spawn-dragon': 'zombot_dark_dragon',
      'sb-spawn-imp-dragon': 'imp_dragon',
      'sb-spawn-troglobite': 'troglobite',
      'sb-spawn-yeti-imp': 'yeti_imp',
      'sb-spawn-lang-khach': 'lang_khach',
      'sb-spawn-shen': 'shen',
      'sb-spawn-anivia': 'anivia',
      'sb-spawn-balloon': 'balloon',
      'sb-spawn-jetpack': 'jetpack',
      'sb-spawn-thresh': 'thresh',
      'sb-spawn-quan-chua': 'quan_chua',
      'sb-spawn-dragon-hatchling': 'dragon_hatchling',
      'sb-spawn-dragon-adult': 'dragon_adult',
      'sb-spawn-dragon-dark': 'dragon_dark',
      'sb-spawn-dragon-chemtech': 'dragon_chemtech',
      'sb-spawn-dragon-wind': 'dragon_wind',
      'sb-spawn-dragon-water': 'dragon_water',
      'sb-spawn-ancient-dragon': 'ancient_dragon_boss',
      'sb-spawn-azir': 'azir_desert_emperor',
      'sb-spawn-renekton': 'renekton_croc',
      'sb-spawn-nasus': 'nasus_hound',
      'sb-spawn-nosus-thrall': 'nosus_thrall',
      'sb-spawn-nosus-assassin': 'nosus_assassin',
      'sb-spawn-nosus-shieldbearer': 'nosus_shieldbearer',
      'sb-spawn-nosus-hemomancer': 'nosus_hemomancer',
      'sb-spawn-nosus-warlord': 'nosus_warlord',
      'sb-spawn-ionia-zed': 'ionia_zed',
      'sb-spawn-ionia-yone': 'ionia_yone',
      'sb-spawn-ionia-sett': 'ionia_sett',
      'sb-spawn-drowned-sailor': 'drowned_sailor',
      'sb-spawn-anchor-bearer': 'anchor_bearer',
      'sb-spawn-swimming-ghost': 'swimming_ghost',
      'sb-spawn-wanted-captain': 'wanted_captain',
      'sb-spawn-zombot-pyke': 'zombot_pyke'
    };

    for (const [btnId, zType] of Object.entries(btnToType)) {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.style.display = allowedZombies.includes(zType) ? '' : 'none';
      }
    }

    const countLabel = document.getElementById('sb-zombie-count-label');
    if (countLabel) {
      countLabel.textContent = `📋 BỘ ZOMBIE (${allowedZombies.length}/8):`;
    }

    const barEl = document.getElementById('sb-selected-zombie-bar');
    if (barEl) {
      barEl.innerHTML = '';
      if (allowedZombies.length === 0) {
        const hint = document.createElement('span');
        hint.className = 'sb-zombie-empty-hint';
        hint.textContent = 'Chưa chọn Zombie — bấm "✏️ Chọn 8 Z" để thêm!';
        barEl.appendChild(hint);
      } else {
        allowedZombies.forEach(zId => {
          const info = ZOMBIE_PREVIEW_INFO[zId] || {};
          const cfg = (typeof ZOMBIE_CONFIG !== 'undefined' && ZOMBIE_CONFIG[zId]) ? ZOMBIE_CONFIG[zId] : {};
          const chip = document.createElement('button');
          chip.type = 'button';
          chip.className = 'sb-zombie-chip';
          chip.dataset.zombieId = zId;
          chip.title = `Bỏ ${info.name || cfg.name || zId} khỏi danh sách Sandbox`;
          chip.textContent = `${info.avatar || '🧟'} ${info.name || cfg.name || zId} `;
          const rm = document.createElement('span');
          rm.className = 'sb-zombie-chip-remove';
          rm.textContent = '×';
          chip.appendChild(rm);
          chip.addEventListener('click', () => this.toggleSandboxZombie(zId));
          barEl.appendChild(chip);
        });
      }
    }

    const pickerGrid = document.getElementById('sb-zombie-picker-grid');
    if (pickerGrid) {
      pickerGrid.innerHTML = '';
      Object.entries(ZOMBIE_PREVIEW_INFO).forEach(([zId, info]) => {
        const isSelected = allowedZombies.includes(zId);
        const item = document.createElement('button');
        item.type = 'button';
        item.className = `sb-picker-item${isSelected ? ' active' : ''}`;
        item.dataset.zombieId = zId;
        item.title = info.hpText ? `${info.name} · ${info.hpText}` : info.name;

        const nameSpan = document.createElement('span');
        nameSpan.textContent = `${info.avatar || '🧟'} ${info.name}`;
        const markSpan = document.createElement('span');
        markSpan.textContent = isSelected ? '✓' : '+';
        item.appendChild(nameSpan);
        item.appendChild(markSpan);

        item.addEventListener('click', () => this.toggleSandboxZombie(zId));
        pickerGrid.appendChild(item);
      });
    }
  }

  showMainMenu() {
    this.isPaused = true;
    this.isMenuActive = true;
    if (typeof document !== 'undefined' && document.body && document.body.classList) {
      document.body.classList.remove('dragon-realm', 'desert-realm', 'nosus-realm', 'ionia-realm', 'bloodharbor-realm');
    }
    if (this.audio) this.audio.playBGM('menu');
  }

  showWorldMap() {
    this.isPaused = true;
    this.isMenuActive = true;
    if (typeof document !== 'undefined' && document.body && document.body.classList) {
      document.body.classList.remove('dragon-realm', 'desert-realm', 'nosus-realm', 'ionia-realm', 'bloodharbor-realm');
    }
    if (this.audio) this.audio.playBGM('menu');
  }

  startLevel(levelNumber) {
    this.currentLevel = levelNumber;
    this.isSandbox = false;
    this.sandboxNoCooldown = false;
    this.isMenuActive = false;
    if (levelNumber === 20) {
      const bannedSun = new Set(['sunflower', 'sun_shroom']);
      const fallbackPool = ['peashooter', 'snow_pea', 'wall_nut', 'repeater', 'squash', 'cherry_bomb'];
      const cleaned = (Array.isArray(this.selectedDeck) ? this.selectedDeck : [])
        .filter(id => this.plantKeys.includes(id) && !bannedSun.has(id));
      for (const defId of fallbackPool) {
        if (cleaned.length >= 6) break;
        if (!cleaned.includes(defId)) cleaned.push(defId);
      }
      this.selectedDeck = cleaned.slice(0, 6);
    }
    if (this.audio) {
      this.audio.playBGM(levelNumber >= 5 ? 'boss' : 'battle');
    }
    const sbPanel = document.getElementById('sandbox-panel');
    if (sbPanel) sbPanel.classList.add('hidden');

    this.updateSandboxCooldownBtnUI();
    this.reset();
    if (!this.animationFrameId) {
      this.start();
    }
  }

  startSandbox(selectedPlants = null, selectedZombies = null) {
    this.isSandbox = true;
    this.sandboxNoCooldown = false;
    this.isMenuActive = false;
    this.currentLevel = 0; // Chế độ Thử Nghiệm riêng biệt, hoàn toàn không thuộc bất kỳ Map 1-11 nào
    if (Array.isArray(selectedPlants) && selectedPlants.length > 0) {
      const validPlants = selectedPlants.filter(id => this.plantKeys.includes(id)).slice(0, 8);
      if (validPlants.length > 0) this.sandboxPlantDeck = validPlants;
    }
    if (Array.isArray(selectedZombies) && selectedZombies.length > 0 && typeof ZOMBIE_CONFIG !== 'undefined') {
      const validZombies = selectedZombies.filter(id => !!ZOMBIE_CONFIG[id]).slice(0, 8);
      if (validZombies.length > 0) this.sandboxZombieDeck = validZombies;
    }
    if (this.audio) this.audio.playBGM('battle');

    const sbPanel = document.getElementById('sandbox-panel');
    if (sbPanel) sbPanel.classList.remove('hidden');

    this.updateSandboxCooldownBtnUI();
    this.reset();
    this.renderSandboxZombiePool();
    if (!this.animationFrameId) {
      this.start();
    }
  }

  toggleAudio() {
    if (!this.audio) return;
    const isMuted = this.audio.toggleMute();
    this.updateAudioButtonUI();
    if (!isMuted) {
      this.audio.playClick();
    }
  }

  updateAudioButtonUI() {
    if (!this.audio) return;
    const isMuted = this.audio.isMuted;
    if (this.audioIcon) {
      this.audioIcon.textContent = isMuted ? '🔇' : '🔊';
    }
    if (this.audioBtn) {
      this.audioBtn.classList.toggle('muted', isMuted);
      this.audioBtn.title = isMuted ? 'Bật âm thanh (Unmute Audio)' : 'Tắt âm thanh (Mute Audio)';
    }
  }

  setSpeed(speed) {
    this.gameSpeed = speed === 1 ? 1 : 2;
    CONFIG.GAME_SPEED = this.gameSpeed;

    if (this.speedLabelEl && this.speedBtnEl) {
      this.speedLabelEl.textContent = `${this.gameSpeed}X`;
      this.speedBtnEl.classList.toggle('speed-2x', this.gameSpeed === 2);
      this.speedBtnEl.classList.toggle('speed-1x', this.gameSpeed === 1);
    }
  }

  toggleSpeed() {
    this.setSpeed(this.gameSpeed === 2 ? 1 : 2);
  }

  setPaused(paused) {
    this.isPaused = paused;
    this.lastTimestamp = performance.now();
  }

  togglePause() {
    this.setPaused(!this.isPaused);
    if (this.audio) {
      this.audio.playClick();
      if (this.isPaused) {
        this.audio.pauseBGM();
      } else {
        this.audio.resumeBGM();
      }
    }
    if (this.pauseIcon) {
      this.pauseIcon.textContent = this.isPaused ? '▶️' : '⏸️';
    }
    if (this.pauseBtn) {
      this.pauseBtn.title = this.isPaused ? 'Tiếp tục (Resume)' : 'Tạm dừng (Pause)';
      this.pauseBtn.classList.toggle('active-paused', this.isPaused);
    }
    if (this.pauseOverlay) {
      if (this.isPaused) {
        this.pauseOverlay.classList.remove('hidden');
      } else {
        this.pauseOverlay.classList.add('hidden');
      }
    }
  }

  initSeedTabs() {
    // Không còn dùng thanh tab ngang vì đã chuyển sang khay dọc PvZ 2 và màn Chọn Cây chuyên nghiệp
  }

  reset() {
    const lvlCfg = (typeof LEVEL_CONFIG !== 'undefined') ? LEVEL_CONFIG[this.currentLevel] : null;
    const isBloodharbor = !this.isSandbox && ((lvlCfg && lvlCfg.theme === 'bloodharbor') || this.currentLevel === 20);

    // Sun ban đầu 50 (Sandbox: 9999; Màn 20 Bloodharbor: 0 và loại bỏ Sun hoàn toàn)
    this.sun = this.isSandbox ? CONFIG.SANDBOX_SUN : (isBloodharbor ? 0 : CONFIG.INITIAL_SUN);
    this.plantFood = 3;

    this.plants = [];
    this.zombies = [];
    this.projectiles = [];
    this.suns = [];
    this.particles = [];
    this.barriers = [];
    this.lightningArcs = [];
    this.gasClouds = [];
    this.flyingImps = [];
    this.laserBeams = [];
    this.floatingTexts = [];
    this.attackEffects = []; // Hiệu ứng phạm vi & chiêu thức tấn công tầm gần
    this.settUltAnimations = []; // Hoạt ảnh kỹ năng R của Sett (nhấc bổng, bay parabol & giáng đất)
    this.screenShake = 0;
    this.screenShakeX = 0;
    this.screenShakeY = 0;
    this.screenShakeDecay = 36;
    this.scorchedTiles = []; // Các ô bị thiêu rụi không thể trồng cây trong 10s
    this.lotusTraps = [];    // Bẫy Hoa Sen của Jhinplant (chặn trồng cây, nổ 444 DMG AoE 2x2)
    this.chemPotions = [];   // Bình thuốc Hóa Kỹ của Rồng Hóa Kỹ (chặn trồng cây, không thể phá)
    this.fireballs = [];     // Cầu lửa của Zombot Dark Dragon
    this.aniviaIceSpikes = []; // Cột băng sắc nhọn do Anivia bắn ra
    this.witherZones = [];     // Vùng Lão Hóa 2x2 của Thần Khuyển
    this.pendingSandstormWaves = []; // Hẹn giờ wave bão cát 20s của Azir Phase 2
    this._managesDesertTimers = true;
    this.timeStopTimer = 0;  // Bộ đếm dừng thời gian (Skill 2 Galio)

    // Trạng thái Bến Cảng Tử Thần (Map 20)
    this.isBloodharborMode = isBloodharbor;
    this.isSetupPhase = isBloodharbor;
    this.maxPlantsOnBoard = isBloodharbor ? ((lvlCfg && lvlCfg.setupMaxPlants) || 12) : 999;
    this.bloodharborPhase = 1;
    this.floodedCols = [];
    this.fogCols = [];
    this.rootedTiles = [];
    this.recalledPlantHpMap = {};
    this.exhaustedSingleUse = new Set();
    this.yourCutTimer = 20.0;

    // Tốc độ mặc định khi bắt đầu luôn là ×2
    this.setSpeed(2);
    this.isPaused = false;
    if (this.pauseOverlay) this.pauseOverlay.classList.add('hidden');
    if (this.pauseIcon) this.pauseIcon.textContent = '⏸️';
    if (this.pauseBtn) this.pauseBtn.classList.remove('active-paused');

    // Khởi tạo 5 máy cắt cỏ cho 5 hàng ở mép trái (Map 20 loại bỏ hoàn toàn Lawn Mower)
    this.lawnmowers = [];
    if (!isBloodharbor && !(lvlCfg && lvlCfg.noLawnmowers)) {
      for (let r = 0; r < CONFIG.ROWS; r++) {
        this.lawnmowers.push(new Lawnmower(r));
      }
    }

    this.selectedPlantType = null;
    this.isShovelActive = false;

    // Hồi chiêu tất cả các cây = 0
    this.cooldowns = {};
    this._lastCdDeg = {};
    this._lastCdActive = {};
    if (this._readyTimers) {
      for (const t of Object.values(this._readyTimers)) {
        if (t) clearTimeout(t);
      }
    }
    this._readyTimers = {};
    for (const key of this.plantKeys) {
      this.cooldowns[key] = 0;
      const cdEl = this.cooldownElements ? this.cooldownElements[key] : null;
      if (cdEl) {
        cdEl.classList.remove('active', 'sweeping');
        cdEl.style.setProperty('--cd-deg', '360deg');
      }
      const cardEl = this.cardElements ? this.cardElements[key] : null;
      if (cardEl) {
        cardEl.classList.remove('cooldown-ready', 'exhausted-single-use');
      }
    }

    this.naturalSunTimer = 3.0;
    this.waveManager = new WaveManager(this.currentLevel);

    this.isGameOver = false;
    this.isVictory = false;
    this.gameTime = 0;
    this.gameDeltaTime = 0;
    this.realDeltaTime = 0;

    // Thiết lập chế độ chơi & theme sân đấu
    if (typeof document !== 'undefined' && document.body && document.body.classList) {
      const isDesertRealm = !this.isSandbox && !!(lvlCfg && lvlCfg.theme === 'desert');
      const isNosusRealm = !this.isSandbox && ((lvlCfg && lvlCfg.theme === 'nosus') || (this.currentLevel >= 14 && this.currentLevel <= 16));
      const isIoniaRealm = !this.isSandbox && ((lvlCfg && lvlCfg.theme === 'ionia') || (this.currentLevel >= 17 && this.currentLevel <= 19));
      const isBloodharborRealm = !this.isSandbox && isBloodharbor;
      const isDragonRealm = !this.isSandbox && !isDesertRealm && !isNosusRealm && !isIoniaRealm && !isBloodharborRealm && (this.currentLevel === 11 || !!(lvlCfg && lvlCfg.isSpecial));
      document.body.classList.toggle('desert-realm', isDesertRealm);
      document.body.classList.toggle('nosus-realm', isNosusRealm);
      document.body.classList.toggle('ionia-realm', isIoniaRealm);
      document.body.classList.toggle('bloodharbor-realm', isBloodharborRealm);
      document.body.classList.toggle('dragon-realm', isDragonRealm);
    }
    this.gameMode = (!this.isSandbox && !isBloodharbor && (this.currentLevel === 6 || (lvlCfg && (lvlCfg.isConveyor || lvlCfg.gameMode === 'conveyor')))) ? 'conveyor' : 'normal';

    if (this.gameMode === 'conveyor') {
      if (this.conveyorSystem) {
        this.conveyorSystem.init();
      }
      if (this.hudLeftEl) this.hudLeftEl.style.display = 'none';
    } else {
      if (this.hudLeftEl) this.hudLeftEl.style.display = 'flex';
      if (this.seedBankEl) this.seedBankEl.style.display = 'flex';
      if (this.sunBankEl) this.sunBankEl.style.display = isBloodharbor ? 'none' : 'flex';
    }

    // Ẩn/hiển thị thanh tiến trình Wave: trong Sandbox không có Wave nên ẩn đi
    const waveMeter = document.getElementById('wave-meter');
    if (waveMeter) {
      waveMeter.style.display = this.isSandbox ? 'none' : 'flex';
    }

    // Sinh vật cản Bia Mộ (Tombstone) nếu Level >= 2 (Không sinh trong Sandbox)
    this.spawnInitialLevelTombstones();

    this.clearSelection();
    if (this.dialogOverlay) this.dialogOverlay.classList.add('hidden');

    if (this.levelBadgeEl) {
      if (this.isSandbox) {
        this.levelBadgeEl.textContent = '🛠️ SANDBOX';
        this.levelBadgeEl.classList.add('sandbox-mode-badge');
      } else {
        const lvlNames = {
          1: 'CẤP 1 · SÂN CỎ MA ÁM',
          2: 'CẤP 2 · BIA MỘ & NÓN SẮT',
          3: 'CẤP 3 · BINH ĐOÀN THÙNG SẮT',
          4: 'CẤP 4 · VŨ ĐIỆU NHẢY SÀO',
          5: 'CẤP 5 · TRÙM GARGANTUAR',
          6: 'CẤP 6 · ZOMBOT DARK DRAGON',
          11: 'CẤP 11 · VƯƠNG QUỐC LONG TỘC',
          12: 'CẤP 12 · BOSS RỒNG NGÀN TUỔI',
          13: 'CẤP 13 · HOÀNG ĐẾ SA MẠC AZIR',
          14: 'CẤP 14 · TIỀN ĐỒN NOSUS',
          15: 'CẤP 15 · PHÁO ĐÀI HUYẾT TẾ',
          16: 'CẤP 16 · ĐẠI TƯỚNG DARIUS NOSUS',
          17: 'CẤP 17 · ĐỀN HOA ANH ĐÀO IONIA',
          18: 'CẤP 18 · SONG KIẾM LINH GIỚI',
          19: 'CẤP 19 · ĐẤU TRƯỜNG ĐẠI CA SETT',
          20: 'CẤP 20 · BẾN CẢNG TỬ THẦN (BOSS)'
        };
        this.levelBadgeEl.textContent = lvlNames[this.currentLevel] || `CẤP ${this.currentLevel}`;
        this.levelBadgeEl.classList.remove('sandbox-mode-badge');
      }
    }

    this.renderInGameSeedBank();
    this.updateHUD();
  }

  // Sinh các Bia Mộ (Tombstone) trên sân ở Level 2-5 (Sandbox hoàn toàn không có)
  spawnInitialLevelTombstones() {
    if (this.isSandbox) return;
    const lvlCfg = LEVEL_CONFIG[this.currentLevel];
    if (!lvlCfg || !lvlCfg.hasTombstones) return;

    const count = lvlCfg.tombstoneCount || 4;
    let spawned = 0;
    let attempts = 0;

    while (spawned < count && attempts < 40) {
      attempts++;
      const row = Math.floor(Math.random() * CONFIG.ROWS);
      const col = 5 + Math.floor(Math.random() * 4); // Cột 5 - 8

      // Không đặt trùng
      const occupied = this.zombies.some(z => z.isObstacle && z.row === row && Math.abs(z.x - (CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2)) < 30);
      if (!occupied) {
        const tomb = new Zombie('tombstone', row);
        tomb.x = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
        this.zombies.push(tomb);
        spawned++;
      }
    }
  }

  start() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.lastTimestamp = performance.now();

    const loop = (timestamp) => {
      const rawDeltaTime = Math.min(0.05, (timestamp - this.lastTimestamp) / 1000);
      this.lastTimestamp = timestamp;

      // X2 TỐC ĐỘ: Nút bật/tắt x2. Trong game loop dùng scaledDt = Math.min(dt * timeScale, 0.1) chống xuyên vật thể
      const isGameplayRunning = !this.isGameOver && !this.isVictory && !this.isPaused;
      const timeScale = this.gameSpeed;
      const dt = rawDeltaTime;
      const scaledDt = Math.min(dt * timeScale, 0.1);

      // Giữ đúng dòng công thức thống nhất để tương thích toàn bộ hệ thống kiểm thử tự động
      const gameDeltaTime = isGameplayRunning ? (rawDeltaTime * this.gameSpeed) : 0;
      this.realDeltaTime = rawDeltaTime;
      this.gameDeltaTime = isGameplayRunning ? scaledDt : 0;
      this.gameTime += this.gameDeltaTime;

      if (this.gameDeltaTime > 0) {
        this.update(this.gameDeltaTime);
      }

      this.renderer.render(this, this.inputHandler);

      // Tối ưu hóa hiệu năng: Dừng vòng lặp Canvas khi đang ở màn hình Menu Jetpack Compose
      if (this.isMenuActive) {
        this.animationFrameId = null;
        return;
      }

      // Điều tiết cập nhật HUD (16-20 lần/giây thay vì 60 lần/giây)
      this.hudTimer = (this.hudTimer || 0) + rawDeltaTime;
      if (this.hudTimer >= 0.05) {
        this.hudTimer = 0;
        this.updateHUD();
      }

      this.animationFrameId = requestAnimationFrame(loop);
    };

    this.animationFrameId = requestAnimationFrame(loop);
  }

  update(dt) {
    // 0. Bộ đếm Dừng Thời Gian (Galio Skill 2)
    if (this.timeStopTimer > 0) {
      this.timeStopTimer = Math.max(0, this.timeStopTimer - dt);
    }
    const isTimeStopped = this.timeStopTimer > 0;

    // 1. Cooldown
    const zeroCooldownActive = this.isSandbox && this.sandboxNoCooldown;
    for (const key in this.cooldowns) {
      if (zeroCooldownActive) {
        this.cooldowns[key] = 0;
      } else if (this.cooldowns[key] > 0) {
        this.cooldowns[key] = Math.max(0, this.cooldowns[key] - dt);
      }
    }

    // 1.5. Cập nhật Băng chuyền (Conveyor Belt)
    if (this.gameMode === 'conveyor' && this.conveyorSystem) {
      this.conveyorSystem.update(dt);
    }

    // 2. Rơi Sun tự nhiên (chỉ khi không ở chế độ conveyor, không ở Bến Cảng Tử Thần và không dừng thời gian)
    if (this.gameMode !== 'conveyor' && !this.isBloodharborMode && !isTimeStopped) {
      this.naturalSunTimer += dt;
      if (this.naturalSunTimer >= CONFIG.NATURAL_SUN_INTERVAL) {
        this.naturalSunTimer = 0;
        this.spawnNaturalSun();
      }
    }

    // 2.5. Cập nhật Bến Cảng Tử Thần (ô bị trói E & bộ đếm Thuyền Trưởng Truy Nã)
    if (!isTimeStopped) {
      this.updateBloodharbor(dt);
    }

    // 3. Cập nhật cây
    for (const plant of this.plants) {
      plant.update(dt, this);
    }

    // 4. Cập nhật zombie (tạm đóng băng toàn bộ khi đang Dừng Thời Gian 1s)
    if (!isTimeStopped) {
      for (const zombie of this.zombies) {
        zombie.update(dt, this);
      }
      // 4.5. Imp đang bay
      for (const fImp of this.flyingImps) {
        fImp.update(dt, this);
      }
      // 4.6. Cập nhật Bẫy Hoa Sen của Jhinplant
      this.updateLotusTraps(dt);
      // 4.65. Cập nhật Bình Thuốc Hóa Kỹ của Rồng Hóa Kỹ
      this.updateChemPotions(dt);
      // 4.7. Cập nhật cột băng của Anivia
      this.updateAniviaIceSpikes(dt);
      // 4.8. Cập nhật vùng Lão Hóa 2x2 của Thần Khuyển & hẹn giờ Wave Bão Cát 20s của Azir
      this.updateWitherZones(dt);
      this.updatePendingSandstormWaves(dt);
      // 4.9. Cập nhật chuỗi hoạt ảnh kỹ năng R của Sett (nhấc bổng -> bay vòng cung -> giáng đất)
      this.updateSettUltAnimations(dt);
    } else {
      // Zombie đã chết vẫn hoàn tất hoạt ảnh tan biến trong lúc dừng thời gian
      for (const zombie of this.zombies) {
        if (!zombie.alive) {
          zombie.deathTimer += dt;
        }
      }
    }

    // 5. Cập nhật đạn
    for (const proj of this.projectiles) {
      proj.update(dt, this);
    }

    // 6. Xử lý va chạm đạn thẳng với zombie & tombstone
    CollisionSystem.handleProjectileZombieCollisions(this.projectiles, this.zombies, this);

    // 7. Cập nhật Sun (tự động nhặt sau 0.5s)
    for (const sun of this.suns) {
      sun.update(dt, this.sunTargetPos, this);
    }

    // 8. Máy cắt cỏ
    for (const mower of this.lawnmowers) {
      mower.update(dt, this);
    }

    // 9. Hiệu ứng hạt
    for (const p of this.particles) {
      p.update(dt);
    }

    // 10. Hàng rào toàn ảnh
    for (const b of this.barriers) {
      b.update(dt);
    }

    // 11. Sét Sậy
    for (const arc of this.lightningArcs) {
      arc.timer -= dt;
    }

    // 12. Khí Stunion
    for (const cloud of this.gasClouds) {
      cloud.timer += dt;
    }

    // 12.2. Tia Laser của Turquoise Skull Zombie
    if (this.laserBeams && this.laserBeams.length > 0) {
      for (const beam of this.laserBeams) {
        beam.timer -= dt;
      }
    }

    // 12.5. Hiệu ứng tấn công phạm vi tầm gần
    if (this.attackEffects && this.attackEffects.length > 0) {
      for (const eff of this.attackEffects) {
        eff.timer += dt;
      }
      this.attackEffects = this.attackEffects.filter(eff => eff.timer < eff.duration);
    }

    // 12.6. Rung lắc màn hình khi đòn nặng (Sett R slam...)
    this.updateScreenShake(dt);

    // Kích hoạt Skill 2 của Galio nếu vừa chết trong lượt cập nhật này
    this.processGalioDeathSkills();

    // 13.2. Cập nhật các ô bị thiêu rụi (Scorched Tiles trong 10s)
    if (this.scorchedTiles && this.scorchedTiles.length > 0) {
      for (const t of this.scorchedTiles) {
        t.timer -= dt;
      }
      this.scorchedTiles = this.scorchedTiles.filter(t => t.timer > 0);
    }

    // 13.3. Cập nhật Cầu Lửa của Zombot Dark Dragon (tạm dừng khi Time Stop)
    if (!isTimeStopped && this.fireballs && this.fireballs.length > 0) {
      for (const fb of this.fireballs) {
        fb.progress += dt / fb.duration;
        if (fb.progress >= 1.0) {
          fb.alive = false;
          // Thiêu hủy cây tại ô trúng đòn
          const hitPlant = this.plants.find(p => p.alive && p.row === fb.targetRow && p.col === fb.targetCol);
          if (hitPlant) {
            hitPlant.takeDamage(99999, true);
            this.spawnParticles(hitPlant.x, hitPlant.y, '#ff3d00', 14);
          }
          // Thiêu rụi ô 10 giây (không thể trồng cây)
          this.scorchTile(fb.targetRow, fb.targetCol, 10.0);
          // Ấp nở Imp Dragon Zombie tại vị trí đó
          const imp = new Zombie('imp_dragon', fb.targetRow);
          imp.x = fb.targetX;
          this.zombies.push(imp);
          // Hiệu ứng nổ cầu lửa & khói lửa
          this.spawnExplosion(fb.targetX, fb.targetY);
          this.spawnParticles(fb.targetX, fb.targetY, '#ff6d00', 16);
        }
      }
      this.fireballs = this.fireballs.filter(fb => fb.alive);
      this.processGalioDeathSkills();
    }

    // 13.4. Đóng băng thành Khối Băng (HP = 1/2 cây gốc) nếu Anivia Dạng 2 tiêu diệt hoặc hỗ trợ tiêu diệt cây
    this.processAniviaFrozenPlants();

    // 13.4b. Cộng điểm hạ/hỗ trợ cho Lux khi zombie bị Lux gây sát thương vừa bị tiêu diệt
    this.processLuxKillAssists();

    // 13.4c. Quận Chúa thu linh hồn zombie cùng hàng vừa chết
    this.processQuanChuaSoulHarvest();

    // 13. Dọn dẹp thực thể chết (chạy sau fireball & Anivia frozen block để mọi cây chết được xử lý đủ)
    this.plants = this.plants.filter(p => p.alive);
    this.zombies = this.zombies.filter(z => z.alive || z.deathTimer < 1.2);
    this.projectiles = this.projectiles.filter(p => p.alive);
    this.suns = this.suns.filter(s => s.alive);
    this.particles = this.particles.filter(p => p.alive);
    this.barriers = this.barriers.filter(b => b.alive);
    this.lightningArcs = this.lightningArcs.filter(a => a.timer > 0);
    this.gasClouds = this.gasClouds.filter(c => c.timer < c.maxDuration);
    this.flyingImps = this.flyingImps.filter(f => f.alive);
    this.laserBeams = this.laserBeams.filter(l => l.timer > 0);
    if (this.lotusTraps) {
      this.lotusTraps = this.lotusTraps.filter(t => t.alive);
    }
    if (this.chemPotions) {
      this.chemPotions = this.chemPotions.filter(p => p.alive);
    }

    // 13.5. Cập nhật và dọn dẹp chữ nổi (Floating texts như SPUDOW!)
    if (this.floatingTexts) {
      for (const ft of this.floatingTexts) {
        ft.update(dt);
      }
      this.floatingTexts = this.floatingTexts.filter(ft => ft.alive);
    }

    // 14. Quản lý đợt tấn công Wave (tạm dừng khi Time Stop)
    if (this.waveManager && !isTimeStopped) {
      this.waveManager.update(dt, this);
    }
  }

  processGalioDeathSkills() {
    for (const plant of this.plants) {
      if (!plant.alive && plant.type === 'galio' && !plant.shoveled && !plant.deathSkillTriggered) {
        if (typeof plant.triggerGalioDeathSkill === 'function') {
          plant.triggerGalioDeathSkill(this);
        }
      }
    }
  }

  processAniviaFrozenPlants() {
    if (!this.plants || this.plants.length === 0) return;
    for (const plant of this.plants) {
      if (!plant.alive && !plant.shoveled && !plant.isRecharging && !plant.frozenBlockSpawned && (plant.aniviaAssistTimer || 0) > 0) {
        plant.frozenBlockSpawned = true;
        this.spawnAniviaIceBlock(plant);
      }
    }
  }

  processLuxKillAssists() {
    if (!this.zombies || this.zombies.length === 0) return;
    for (const z of this.zombies) {
      if (!z.alive && !z.luxDeathProcessed && !z.isObstacle && !z.isHypnotized && z.luxAttackers && z.luxAttackers.size > 0) {
        z.luxDeathProcessed = true;
        for (const luxPlant of z.luxAttackers) {
          if (luxPlant && luxPlant.alive && luxPlant.type === 'lux' && typeof luxPlant.onLuxKillOrAssist === 'function') {
            luxPlant.onLuxKillOrAssist(this);
          }
        }
        z.luxAttackers.clear();
      }
    }
  }

  processQuanChuaSoulHarvest() {
    if (!this.zombies || this.zombies.length === 0) return;
    const deadList = [];
    for (const z of this.zombies) {
      if (!z.alive && !z.quanChuaDeathProcessed) {
        z.quanChuaDeathProcessed = true;
        if (!z.isObstacle && !z.isHypnotized && !z.isBlownAway && !z.isSummonedByQuanChua) {
          deadList.push(z);
        }
      }
    }
    if (deadList.length === 0) return;

    const queens = this.zombies.filter(q => q.alive && q.type === 'quan_chua' && !q.isHypnotized);
    if (queens.length === 0) return;

    for (const deadZ of deadList) {
      for (const q of queens) {
        if (q.row === deadZ.row && typeof q.onSameRowZombieDeath === 'function') {
          q.onSameRowZombieDeath(deadZ, this);
        }
      }
    }
  }

  spawnAniviaIceBlock(plant) {
    if (!plant) return;
    const occupiedByObstacle = this.zombies.some(z => z.alive && z.isObstacle && z.row === plant.row && Math.abs(z.x - plant.x) < 30);
    if (occupiedByObstacle) return;

    const block = new Zombie('anivia_ice_block', plant.row);
    const blockHp = Math.max(1, Math.round((plant.maxHp || 300) / 2));
    block.x = plant.x;
    block.y = plant.y;
    block.hp = blockHp;
    block.maxHp = blockHp;
    block.baseHp = blockHp;
    this.zombies.push(block);

    this.spawnParticles(plant.x, plant.y, '#80deea', 16);
    this.spawnParticles(plant.x, plant.y, '#ffffff', 10);
    if (this.spawnFloatingText) {
      this.spawnFloatingText(plant.x, plant.y - 26, `ĐÓNG BĂNG (${blockHp} HP)! 🧊`, '#80deea', 15);
    }
  }

  spawnAniviaIceSpike(anivia, target) {
    if (!this.aniviaIceSpikes) this.aniviaIceSpikes = [];
    const startX = anivia.x - 16;
    const startY = anivia.y - 28;
    const targetX = target.x;
    const targetY = (target.y !== undefined ? target.y - 6 : anivia.y - 6);
    this.aniviaIceSpikes.push({
      id: generateId(),
      row: anivia.row,
      x: startX,
      y: startY,
      startX,
      startY,
      targetX,
      targetY,
      target,
      damage: anivia.damage || 40,
      isPhase2: anivia.aniviaPhase === 'phase2',
      speed: 440,
      alive: true
    });
    this.spawnParticles(startX, startY, '#80deea', 4);
    if (this.audio && this.audio.playShoot) {
      this.audio.playShoot('ice_pea');
    }
  }

  updateAniviaIceSpikes(dt) {
    if (!this.aniviaIceSpikes || this.aniviaIceSpikes.length === 0) return;
    for (const spike of this.aniviaIceSpikes) {
      if (!spike.alive) continue;
      if (spike.target && spike.target.alive) {
        spike.targetX = spike.target.x;
        spike.targetY = spike.target.y !== undefined ? spike.target.y - 6 : spike.targetY;
      }
      const dx = spike.targetX - spike.x;
      const dy = spike.targetY - spike.y;
      const dist = Math.hypot(dx, dy);
      const step = (spike.speed || 440) * dt;

      if (dist <= step + 4) {
        spike.x = spike.targetX;
        spike.y = spike.targetY;
        spike.alive = false;

        if (spike.target && spike.target.alive && !spike.target.isRecharging) {
          if (spike.isPhase2 && spike.target.col !== undefined && spike.target.maxHp !== undefined) {
            spike.target.aniviaAssistTimer = 4.0;
          }
          spike.target.takeDamage(spike.damage || 40, false);
          this.spawnParticles(spike.x, spike.y, '#80deea', 6);
          this.spawnParticles(spike.x, spike.y, '#ffffff', 3);
        } else {
          this.spawnParticles(spike.x, spike.y, '#b2ebf2', 4);
        }
      } else {
        spike.x += (dx / dist) * step;
        spike.y += (dy / dist) * step;
      }
    }
    this.aniviaIceSpikes = this.aniviaIceSpikes.filter(s => s.alive);
  }

  scorchTile(row, col, duration = 10.0) {
    if (!this.scorchedTiles) this.scorchedTiles = [];
    const existing = this.scorchedTiles.find(t => t.row === row && t.col === col);
    if (existing) {
      existing.timer = Math.max(existing.timer, duration);
      existing.maxTimer = Math.max(existing.maxTimer, duration);
    } else {
      this.scorchedTiles.push({ row, col, timer: duration, maxTimer: duration });
    }
  }

  spawnLotusTrap(row, x, y) {
    if (!this.lotusTraps) this.lotusTraps = [];
    const safeRow = Math.max(0, Math.min(CONFIG.ROWS - 1, row));
    const col = Math.max(0, Math.min(CONFIG.COLS - 1, Math.floor((x - CONFIG.GRID_OFFSET_X) / CONFIG.CELL_WIDTH)));
    const trapX = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
    const trapY = CONFIG.GRID_OFFSET_Y + safeRow * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
    const dmg = (typeof PLANT_CONFIG !== 'undefined' && PLANT_CONFIG.jhinplant && PLANT_CONFIG.jhinplant.lotusTrapDamage) || 444;

    const existing = this.lotusTraps.find(t => t.alive && t.row === safeRow && t.col === col);
    if (existing) {
      existing.animTime = 0;
      existing.damage = dmg;
    } else {
      this.lotusTraps.push({
        id: generateId(),
        row: safeRow,
        col: col,
        x: trapX,
        y: trapY,
        animTime: 0,
        damage: dmg,
        alive: true
      });
    }
    this.spawnParticles(trapX, trapY, '#ce93d8', 10);
    this.spawnFloatingText(trapX, trapY - 22, 'BẪY HOA SEN! 🪷', '#e040fb', 15);
  }

  updateLotusTraps(dt) {
    if (!this.lotusTraps || this.lotusTraps.length === 0) return;

    for (const trap of this.lotusTraps) {
      if (!trap.alive) continue;
      trap.animTime += dt;

      const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH;
      const triggerZ = this.zombies.find(z => {
        if (!z.alive || z.isHypnotized || z.isObstacle || z.x > lawnRight) return false;
        if (z.isFlying || z.isAirborne || z.isFloating || z.isVaulting) return false;
        const isBossHitbox = (typeof isTwoRowBoss === 'function' && isTwoRowBoss(z)) && (trap.row === z.bossRow || trap.row === z.bossRow + 1);
        const rowMatch = z.row === trap.row || isBossHitbox;
        return rowMatch && Math.abs(z.x - trap.x) <= CONFIG.CELL_WIDTH * 0.48;
      });

      if (triggerZ) {
        trap.alive = false;

        // Vùng nổ chính xác 2x2 ô (4 ô liền kề)
        const minCol = (triggerZ.x >= trap.x && trap.col < CONFIG.COLS - 1) ? trap.col : Math.max(0, trap.col - 1);
        const maxCol = Math.min(CONFIG.COLS - 1, minCol + 1);
        const minRow = (trap.row < CONFIG.ROWS - 1) ? trap.row : Math.max(0, trap.row - 1);
        const maxRow = Math.min(CONFIG.ROWS - 1, minRow + 1);

        const startX = CONFIG.GRID_OFFSET_X + minCol * CONFIG.CELL_WIDTH;
        const endX = CONFIG.GRID_OFFSET_X + (maxCol + 1) * CONFIG.CELL_WIDTH;
        const centerX = (startX + endX) / 2;
        const centerY = CONFIG.GRID_OFFSET_Y + ((minRow + maxRow + 1) / 2) * CONFIG.CELL_HEIGHT;

        const dmg = trap.damage || 444;
        for (const z of this.zombies) {
          if (!z.alive || z.isHypnotized || z.isObstacle || z.x > lawnRight) continue;
          if (z.isFlying || z.isAirborne || z.isFloating || z.isVaulting) continue;
          const isBoss = typeof isTwoRowBoss === 'function' && isTwoRowBoss(z);
          const rowOverlap = isBoss
            ? ((z.bossRow >= minRow && z.bossRow <= maxRow) || (z.bossRow + 1 >= minRow && z.bossRow + 1 <= maxRow))
            : (z.row >= minRow && z.row <= maxRow);
          const colPad = isBoss ? 48 : 24;
          if (rowOverlap && z.x >= startX - colPad && z.x <= endX + colPad) {
            z.takeDamage(dmg);
            this.spawnParticles(z.x, z.y - 10, '#ff1744', 6);
          }
        }

        if (this.audio && this.audio.playExplosion) {
          this.audio.playExplosion('lotus');
        }
        this.spawnParticles(centerX, centerY, '#e040fb', 20);
        this.spawnParticles(centerX, centerY, '#ff1744', 18);
        this.spawnFloatingText(centerX, centerY - 22, `HOA SEN NỞ! -${dmg} 🪷`, '#e040fb', 19);
        this.spawnAttackEffect({
          kind: 'lotus_2x2',
          x: centerX,
          y: centerY,
          row: minRow,
          minRow: minRow,
          maxRow: maxRow,
          startX: startX,
          endX: endX,
          duration: 0.65
        });
      }
    }
  }

  scheduleSandstormWave(delaySec = 20.0) {
    if (!Array.isArray(this.pendingSandstormWaves)) {
      this.pendingSandstormWaves = [];
    }
    this.pendingSandstormWaves.push({ timer: delaySec });
  }

  updatePendingSandstormWaves(dt) {
    if (!Array.isArray(this.pendingSandstormWaves) || this.pendingSandstormWaves.length === 0) return;
    for (let i = this.pendingSandstormWaves.length - 1; i >= 0; i--) {
      const pending = this.pendingSandstormWaves[i];
      pending.timer -= dt;
      if (pending.timer <= 0) {
        this.pendingSandstormWaves.splice(i, 1);
        const helper = new Zombie('azir_desert_emperor', 1, this);
        helper.spawnAzirSandstormWave(this);
      }
    }
  }

  updateWitherZones(dt) {
    if (!Array.isArray(this.witherZones) || this.witherZones.length === 0) return;
    for (let i = this.witherZones.length - 1; i >= 0; i--) {
      const zone = this.witherZones[i];
      zone.remaining -= dt;
      zone.burnTimer = (zone.burnTimer || 0) + dt;

      if (Array.isArray(this.plants)) {
        for (const p of this.plants) {
          if (!p.alive || p.isRecharging) continue;
          if (p.row >= zone.minRow && p.row <= zone.maxRow && p.x >= zone.startX && p.x <= zone.endX) {
            if (zone.remaining > 0) {
              p.witherTimer = Math.max(p.witherTimer || 0, Math.min(zone.duration || 5.0, zone.remaining));
            }
          }
        }
      }

      const interval = zone.burnInterval || 0.5;
      while (zone.burnTimer >= interval) {
        zone.burnTimer -= interval;
        if (Array.isArray(this.plants)) {
          for (const p of this.plants) {
            if (!p.alive || p.isRecharging) continue;
            if (p.row >= zone.minRow && p.row <= zone.maxRow && p.x >= zone.startX && p.x <= zone.endX) {
              p.takeDamage(zone.burnDamage || 10, false);
              this.spawnParticles(p.x, p.y - 6, '#ab47bc', 2);
            }
          }
        }
      }

      if (zone.remaining <= 0) {
        this.witherZones.splice(i, 1);
      }
    }
  }

  spawnChemPotionsAround(chemDragon, count = 1) {
    if (!this.chemPotions) this.chemPotions = [];
    const totalToDrop = Math.max(0, count | 0);
    if (totalToDrop <= 0) return;

    const centerRow = Math.max(0, Math.min(CONFIG.ROWS - 1, chemDragon.row));
    const rawCol = Math.floor((chemDragon.x - CONFIG.GRID_OFFSET_X) / CONFIG.CELL_WIDTH);
    const centerCol = Math.max(0, Math.min(CONFIG.COLS - 1, rawCol));

    const isCellEligible = (r, c) => {
      const hasPlant = this.plants.some(p => p.alive && !p.isRecharging && p.row === r && p.col === c);
      if (hasPlant) return false;
      const hasPotion = this.chemPotions.some(p => p.alive && p.row === r && p.col === c);
      if (hasPotion) return false;
      const hasLotus = this.lotusTraps && this.lotusTraps.some(t => t.alive && t.row === r && t.col === c);
      if (hasLotus) return false;
      const cellCenterX = CONFIG.GRID_OFFSET_X + c * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
      const hasObstacle = this.zombies.some(z => z.alive && z.isObstacle && z.row === r && Math.abs(z.x - cellCenterX) < 30);
      if (hasObstacle) return false;
      return true;
    };

    const in3x3 = [];
    for (let r = Math.max(0, centerRow - 1); r <= Math.min(CONFIG.ROWS - 1, centerRow + 1); r++) {
      for (let c = Math.max(0, centerCol - 1); c <= Math.min(CONFIG.COLS - 1, centerCol + 1); c++) {
        if (isCellEligible(r, c)) {
          in3x3.push({ r, c });
        }
      }
    }
    // Xáo trộn ngẫu nhiên các ô trống trong vùng 3x3
    for (let i = in3x3.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = in3x3[i];
      in3x3[i] = in3x3[j];
      in3x3[j] = tmp;
    }

    const chosen = in3x3.slice(0, totalToDrop);
    // Nếu vùng 3x3 không đủ ô trống (do có plant che mất), tìm ô trống gần nhất trên sân (tuyệt đối không đè lên plant)
    if (chosen.length < totalToDrop) {
      const fallback = [];
      for (let r = 0; r < CONFIG.ROWS; r++) {
        for (let c = 0; c < CONFIG.COLS; c++) {
          if (chosen.some(item => item.r === r && item.c === c)) continue;
          if (isCellEligible(r, c)) {
            const dist = Math.abs(r - centerRow) + Math.abs(c - centerCol);
            fallback.push({ r, c, dist });
          }
        }
      }
      fallback.sort((a, b) => a.dist - b.dist || (Math.random() - 0.5));
      for (const item of fallback) {
        if (chosen.length >= totalToDrop) break;
        chosen.push({ r: item.r, c: item.c });
      }
    }

    const potionKinds = ['speed', 'giant_hp', 'atk_speed'];
    const fromX = chemDragon.x;
    const fromY = chemDragon.y - 16;

    for (const cell of chosen) {
      const kind = potionKinds[Math.floor(Math.random() * potionKinds.length)];
      const toX = CONFIG.GRID_OFFSET_X + cell.c * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
      const toY = CONFIG.GRID_OFFSET_Y + cell.r * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2 + 6;
      this.chemPotions.push({
        kind,
        row: cell.r,
        col: cell.c,
        x: toX,
        y: toY,
        fromX,
        fromY,
        flightTimer: 0,
        flightDuration: 0.34,
        landed: false,
        animTime: Math.random() * 4,
        alive: true
      });
    }

    if (chosen.length > 0) {
      this.spawnParticles(fromX, fromY, '#76ff03', 10);
      if (this.spawnFloatingText) {
        this.spawnFloatingText(
          fromX,
          fromY - 24,
          chosen.length > 1 ? `NÉM ${chosen.length} BÌNH THUỐC! 🧪` : 'NÉM BÌNH HÓA KỸ! 🧪',
          '#76ff03',
          15
        );
      }
    }
  }

  updateChemPotions(dt) {
    if (!this.chemPotions || this.chemPotions.length === 0) return;

    const lawnRight = CONFIG.GRID_OFFSET_X + CONFIG.COLS * CONFIG.CELL_WIDTH + 18;
    for (const potion of this.chemPotions) {
      if (!potion.alive) continue;
      potion.animTime = (potion.animTime || 0) + dt;
      if (!potion.landed) {
        potion.flightTimer += dt;
        if (potion.flightTimer >= potion.flightDuration) {
          potion.landed = true;
          const color = potion.kind === 'speed' ? '#ab47bc' : (potion.kind === 'giant_hp' ? '#66bb6a' : '#ef5350');
          this.spawnParticles(potion.x, potion.y, color, 8);
        }
        continue;
      }

      const consumer = this.zombies.find(z => {
        if (!z.alive || z.isObstacle || z.isHypnotized) return false;
        if (z.type === 'dragon_chemtech' || z.potionBuffType) return false;
        if (z.row !== potion.row || z.x > lawnRight) return false;
        return Math.abs(z.x - potion.x) <= CONFIG.CELL_WIDTH * 0.45;
      });

      if (consumer && consumer.applyChemPotionBuff(potion.kind, this)) {
        potion.alive = false;
      }
    }
  }

  spawnFireball(fromX, fromY, targetX, targetY, targetRow, targetCol) {
    if (!this.fireballs) this.fireballs = [];
    // Tuyệt đối không để cầu lửa và Imp Dragon rơi vào 4 ô gần nhà (cột 0, 1, 2, 3)
    const safeCol = Math.max(4, Math.min(CONFIG.COLS - 2, targetCol));
    const safeX = (safeCol !== targetCol)
      ? (CONFIG.GRID_OFFSET_X + safeCol * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2)
      : targetX;
    this.fireballs.push({
      startX: fromX,
      startY: fromY,
      targetX: safeX,
      targetY: targetY,
      targetRow: targetRow,
      targetCol: safeCol,
      progress: 0,
      duration: 1.1,
      arcHeight: 140,
      alive: true
    });
  }

  togglePlantFood() {
    if (this.plantFood <= 0) {
      if (this.spawnFloatingText) {
        this.spawnFloatingText(CONFIG.GRID_OFFSET_X + 120, CONFIG.GRID_OFFSET_Y + 120, 'HẾT PLANT FOOD! 🍃', '#ff1744', 18);
      }
      return;
    }
    this.setPlantFood(!this.isPlantFoodActive);
  }

  setPlantFood(active) {
    this.isPlantFoodActive = active;
    if (active) {
      this.clearSelection();
      if (this.audio) this.audio.playClick();
      if (this.spawnFloatingText) {
        this.spawnFloatingText(CONFIG.GRID_OFFSET_X + 120, CONFIG.GRID_OFFSET_Y + 80, 'CHẠM CÂY ĐỂ DÙNG PLANT FOOD! ⚡', '#76ff03', 17);
      }
    }
    if (this.plantFoodBtn) {
      this.plantFoodBtn.classList.toggle('selected', active);
    }
  }

  spawnFloatingText(x, y, text, color = '#ffd600', fontSize = 24) {
    if (typeof FloatingText !== 'undefined') {
      this.floatingTexts.push(new FloatingText(x, y, text, color, fontSize));
    }
  }

  spawnNaturalSun() {
    const col = Math.floor(Math.random() * CONFIG.COLS);
    const x = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
    const targetY = CONFIG.GRID_OFFSET_Y + Math.random() * (CONFIG.ROWS * CONFIG.CELL_HEIGHT - 40);
    this.suns.push(new Sun(x, -20, targetY, true, CONFIG.SUN_VALUE));
  }

  spawnSun(x, y, targetY, isNatural = false, amount = 25) {
    this.suns.push(new Sun(x, y, targetY, isNatural, amount));
  }

  addSun(amount) {
    this.sun += amount;
    if (this.audio) {
      this.audio.playSun();
    }
    this.updateHUD();
  }

  isFreePlantSunLevel() {
    if (this.isSandbox) return false;
    if (this.currentLevel === 12 || this.currentLevel === 13 || this.currentLevel === 20) return true;
    const lvlCfg = (typeof LEVEL_CONFIG !== 'undefined') ? LEVEL_CONFIG[this.currentLevel] : null;
    return !!(lvlCfg && lvlCfg.freeSunCost);
  }

  blowBloodharborHorn() {
    if (!this.isBloodharborMode || !this.isSetupPhase) return false;
    this.isSetupPhase = false;
    const hasPyke = this.zombies.some(z => z.alive && z.type === 'zombot_pyke');
    if (!hasPyke) {
      this.spawnZombie('zombot_pyke', 2);
    }
    this.yourCutTimer = (typeof LEVEL_CONFIG !== 'undefined' && LEVEL_CONFIG[20] && LEVEL_CONFIG[20].yourCutInterval) || 20.0;
    if (this.audio) {
      if (typeof this.audio.playWaveHorn === 'function') this.audio.playWaveHorn();
      if (typeof this.audio.playBGM === 'function') this.audio.playBGM('boss');
    }
    this.triggerScreenShake(9, 0.28);
    if (this.spawnFloatingText) {
      this.spawnFloatingText(
        CONFIG.GRID_OFFSET_X + CONFIG.CELL_WIDTH * 4.5,
        CONFIG.GRID_OFFSET_Y + 90,
        '🚢 CÒI TÀU VANG LÊN! ZOMBOT ĐỒ TỂ XUẤT TRẬN!',
        '#00e5ff',
        20
      );
    }
    this.updateHUD();
    return true;
  }

  updateBloodharbor(dt) {
    if (Array.isArray(this.rootedTiles) && this.rootedTiles.length > 0) {
      for (const tile of this.rootedTiles) {
        tile.timer -= dt;
      }
      this.rootedTiles = this.rootedTiles.filter(t => t.timer > 0);
    }

    if (!this.isBloodharborMode || this.isSetupPhase || this.isVictory || this.isGameOver) return;

    this.yourCutTimer -= dt;
    if (this.yourCutTimer <= 0) {
      this.yourCutTimer = (typeof LEVEL_CONFIG !== 'undefined' && LEVEL_CONFIG[20] && LEVEL_CONFIG[20].yourCutInterval) || 20.0;
      const targetRow = this.pickLowestDpsRow();
      this.spawnZombie('wanted_captain', targetRow);
      if (this.spawnFloatingText) {
        const ry = CONFIG.GRID_OFFSET_Y + targetRow * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
        this.spawnFloatingText(
          CONFIG.GRID_OFFSET_X + CONFIG.CELL_WIDTH * 7.2,
          ry - 24,
          '💀 THUYỀN TRƯỞNG TRUY NÃ XUẤT HIỆN!',
          '#ff1744',
          17
        );
      }
    }
  }

  addRootedTiles(row, cols, duration = 4.0) {
    if (!Array.isArray(this.rootedTiles)) this.rootedTiles = [];
    for (const col of (cols || [])) {
      const existing = this.rootedTiles.find(t => t.row === row && t.col === col);
      if (existing) {
        existing.timer = Math.max(existing.timer, duration);
        existing.maxDuration = Math.max(existing.maxDuration || duration, duration);
      } else {
        this.rootedTiles.push({ row, col, timer: duration, maxDuration: duration });
      }
    }
  }

  isTileRooted(row, col) {
    if (!Array.isArray(this.rootedTiles) || this.rootedTiles.length === 0) return false;
    return this.rootedTiles.some(t => t.row === row && t.col === col && t.timer > 0);
  }

  getEffectiveRangeFactor(plant) {
    if (this.isBloodharborMode && this.bloodharborPhase >= 3 && plant && plant.col <= 1) {
      return 0.8;
    }
    return 1.0;
  }

  markSingleUseExhausted(plantType) {
    if (!this.isBloodharborMode || !plantType) return;
    if (!(this.exhaustedSingleUse instanceof Set)) {
      this.exhaustedSingleUse = new Set();
    }
    this.exhaustedSingleUse.add(plantType);
    if (this.selectedPlantType === plantType) {
      this.clearSelection();
    }
    this.updateHUD();
  }

  computeRowDps(row) {
    const dpsMap = {
      sunflower: 0, sun_shroom: 0, wall_nut: 2, infi_nut: 2,
      potato_mine: 4, cherry_bomb: 10, stunion: 2, blover: 2, hypno_shroom: 4, squash: 12,
      peashooter: 14, snow_pea: 14, cabbage_pult: 14, magnet_shroom: 5,
      lightning_reed: 20, goo_peashooter: 25, repeater: 28, snapdragon: 30,
      melon_pult: 34, aurora: 35, bonk_choy: 40, spikeweed: 40,
      ahri: 42, irelia: 44, jhinplant: 45, lux: 45, chomper: 50,
      kata: 50, syndra: 60, galio: 100, karma: 6
    };
    let total = 0;
    for (const p of (this.plants || [])) {
      if (!p.alive || p.row !== row) continue;
      total += (dpsMap[p.type] !== undefined ? dpsMap[p.type] : 15);
    }
    return total;
  }

  pickLowestDpsRow() {
    let minDps = Infinity;
    let bestRows = [];
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const dps = this.computeRowDps(r);
      if (dps < minDps) {
        minDps = dps;
        bestRows = [r];
      } else if (dps === minDps) {
        bestRows.push(r);
      }
    }
    return bestRows.length > 0 ? bestRows[Math.floor(Math.random() * bestRows.length)] : 2;
  }

  grantYourCutReward(captainZombie) {
    if (!this.isBloodharborMode) return;
    const deck = (Array.isArray(this.selectedDeck) && this.selectedDeck.length > 0)
      ? this.selectedDeck
      : this.plantKeys.slice(0, 6);

    const exhaustedInDeck = deck.filter(id => this.exhaustedSingleUse && this.exhaustedSingleUse.has(id));
    let restoredId = null;
    if (exhaustedInDeck.length > 0) {
      restoredId = exhaustedInDeck[Math.floor(Math.random() * exhaustedInDeck.length)];
      this.exhaustedSingleUse.delete(restoredId);
      this.cooldowns[restoredId] = 0;
    } else {
      const coolingInDeck = deck.filter(id => (this.cooldowns[id] || 0) > 0);
      const pool = coolingInDeck.length > 0 ? coolingInDeck : deck;
      restoredId = pool[Math.floor(Math.random() * pool.length)];
      if (restoredId) this.cooldowns[restoredId] = 0;
    }

    this.maxPlantsOnBoard = Math.min(16, (this.maxPlantsOnBoard || 12) + 1);

    const rx = captainZombie ? captainZombie.x : (CONFIG.GRID_OFFSET_X + CONFIG.CELL_WIDTH * 4);
    const ry = captainZombie ? captainZombie.y : (CONFIG.GRID_OFFSET_Y + CONFIG.CELL_HEIGHT * 2);
    this.spawnParticles(rx, ry - 12, '#ffd54f', 14);
    this.spawnParticles(rx, ry - 12, '#00e5ff', 10);
    if (this.spawnAttackEffect) {
      this.spawnAttackEffect({
        kind: 'your_cut_reward',
        x: rx,
        y: ry,
        row: captainZombie ? captainZombie.row : 2,
        duration: 0.75
      });
    }
    const plantLabel = (restoredId && PLANT_CONFIG[restoredId]) ? PLANT_CONFIG[restoredId].name : 'Thẻ Cây';
    if (this.spawnFloatingText) {
      this.spawnFloatingText(
        rx,
        ry - 32,
        `💰 CHIA PHẦN! +${plantLabel} & Giới hạn ${this.maxPlantsOnBoard}/16`,
        '#ffd54f',
        17
      );
    }
    this.updateHUD();
  }

  enterBloodharborPhase(phase, boss) {
    if (!this.isBloodharborMode && this.currentLevel !== 20) return;
    this.bloodharborPhase = phase;
    if (phase === 2) {
      if (!Array.isArray(this.floodedCols)) this.floodedCols = [];
      if (!this.floodedCols.includes(5)) this.floodedCols.push(5);

      // Thu hồi toàn bộ cây trên cột 6 (index 5) về tay và bảo toàn HP
      let recalledCount = 0;
      for (const p of (this.plants || [])) {
        if (!p.alive) continue;
        const onCol6 = p.col === 5 || (p.pendingReturn && p.pendingReturn.col === 5);
        if (onCol6) {
          p.pendingReturn = null;
          p.shoveled = true;
          p.alive = false;
          if (!this.recalledPlantHpMap[p.type]) this.recalledPlantHpMap[p.type] = [];
          this.recalledPlantHpMap[p.type].push(Math.max(1, Math.round(p.hp)));
          this.cooldowns[p.type] = 0;
          recalledCount++;
          this.spawnParticles(p.x, p.y, '#00e5ff', 10);
        }
      }
      this.triggerScreenShake(9, 0.32);
      if (this.spawnFloatingText) {
        const msg = recalledCount > 0
          ? `🌊 PHASE 2: THỦY TRIỀU DÂNG CỘT 6! Đã thu hồi ${recalledCount} cây về tay!`
          : '🌊 PHASE 2: THỦY TRIỀU DÂNG! CỘT 6 NGẬP NƯỚC!';
        this.spawnFloatingText(CONFIG.GRID_OFFSET_X + CONFIG.CELL_WIDTH * 4.5, CONFIG.GRID_OFFSET_Y + 75, msg, '#00e5ff', 18);
      }
    } else if (phase === 3) {
      this.fogCols = [4, 5];
      this.triggerScreenShake(11, 0.38);
      if (this.spawnFloatingText) {
        this.spawnFloatingText(
          CONFIG.GRID_OFFSET_X + CONFIG.CELL_WIDTH * 4.5,
          CONFIG.GRID_OFFSET_Y + 75,
          '🌫️ PHASE 3: HUYẾT CẢNG CUỒNG NỘ! CỘT 1–2 GIẢM 20% TẦM BẮN!',
          '#ff1744',
          18
        );
      }
    }
    this.updateHUD();
  }

  onBloodharborBossDefeated(boss) {
    if (this.isSandbox || this.isVictory) return;
    for (const z of (this.zombies || [])) {
      if (z === boss) continue;
      z.skipEggRebirth = true;
      z.skipChemDrop = true;
      z.skipWaterRevive = true;
      z.alive = false;
      z.deathTimer = 1.0;
    }
    this.onLevelVictory();
  }

  selectCard(plantType) {
    const proto = PLANT_CONFIG[plantType];
    if (!proto) return;
    if (this.isBloodharborMode && this.exhaustedSingleUse && this.exhaustedSingleUse.has(plantType)) {
      if (this.spawnFloatingText) {
        this.spawnFloatingText(CONFIG.GRID_OFFSET_X + 140, CONFIG.GRID_OFFSET_Y + 80, '💀 HẾT THẺ 1 LẦN! HẠ TRUY NÃ ĐỂ NHẬN LẠI!', '#ff5252', 16);
      }
      return;
    }
    if (!this.isFreePlantSunLevel() && this.sun < proto.cost) return;
    if ((this.cooldowns[plantType] || 0) > 0) return;

    if (this.audio) {
      this.audio.playClick();
    }

    if (this.selectedPlantType === plantType) {
      this.clearSelection();
      return;
    }

    this.clearSelection();
    this.selectedPlantType = plantType;
    const cardEl = this.cardElements[plantType];
    if (cardEl) cardEl.classList.add('selected');
  }

  clearSelection() {
    this.selectedPlantType = null;
    for (const key in this.cardElements) {
      this.cardElements[key].classList.remove('selected');
    }
    this.setShovel(false);
    this.setPlantFood(false);
  }

  setShovel(active) {
    this.isShovelActive = active;
    if (this.audio && active) {
      this.audio.playClick();
    }
    if (this.shovelBtn) {
      this.shovelBtn.classList.toggle('active', active);
    }
  }

  isCellOccupied(row, col) {
    // 0a. Bến Cảng Tử Thần (Map 20): Cột 7–9 (index 6–8) là vùng nước đen, Cột 6 bị ngập từ Phase 2
    if (this.isBloodharborMode) {
      if (col >= 6) {
        if (this.spawnFloatingText) {
          const cx = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
          const cy = CONFIG.GRID_OFFSET_Y + row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
          this.spawnFloatingText(cx, cy, 'VÙNG NƯỚC ĐEN! 🌊', '#00e5ff', 15);
        }
        return true;
      }
      if (Array.isArray(this.floodedCols) && this.floodedCols.includes(col)) {
        if (this.spawnFloatingText) {
          const cx = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
          const cy = CONFIG.GRID_OFFSET_Y + row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
          this.spawnFloatingText(cx, cy, 'CỘT 6 ĐÃ NGẬP NƯỚC! 🌊', '#26c6da', 15);
        }
        return true;
      }
    }

    // 0b. Kiểm tra ô có đang bị thiêu rụi bởi cầu lửa / hơi thở lửa của rồng không (không thể trồng trong 10s)
    if (this.scorchedTiles && this.scorchedTiles.some(t => t.row === row && t.col === col && t.timer > 0)) {
      if (this.spawnFloatingText) {
        const cx = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
        const cy = CONFIG.GRID_OFFSET_Y + row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
        this.spawnFloatingText(cx, cy, 'Ô ĐANG CHÁY! 🔥', '#ff3d00', 16);
      }
      return true;
    }

    const hasPlant = this.plants.some(
      p => p.alive && (
        (p.row === row && p.col === col) ||
        (p.pendingReturn && p.pendingReturn.row === row && p.pendingReturn.col === col)
      )
    );
    if (hasPlant) return true;

    // Kiểm tra có Bẫy Hoa Sen của Jhinplant đang nằm trên ô này không (không thể đặt cây lên)
    if (this.lotusTraps && this.lotusTraps.some(t => t.alive && t.row === row && t.col === col)) {
      if (this.spawnFloatingText) {
        const cx = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
        const cy = CONFIG.GRID_OFFSET_Y + row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
        this.spawnFloatingText(cx, cy, 'Ô CÓ HOA SEN! 🪷', '#e040fb', 15);
      }
      return true;
    }

    // Kiểm tra có Bình Thuốc Hóa Kỹ đang nằm trên ô này không (không thể phá, không thể trồng cây lên)
    if (this.chemPotions && this.chemPotions.some(p => p.alive && p.row === row && p.col === col)) {
      if (this.spawnFloatingText) {
        const cx = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
        const cy = CONFIG.GRID_OFFSET_Y + row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
        this.spawnFloatingText(cx, cy, 'Ô CÓ BÌNH THUỐC! 🧪', '#76ff03', 15);
      }
      return true;
    }

    // Kiểm tra có Bia Mộ (Tombstone) chiếm ô này không
    const cellCenterX = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
    const hasTombstone = this.zombies.some(z => z.alive && z.isObstacle && z.row === row && Math.abs(z.x - cellCenterX) < 30);
    return hasTombstone;
  }

  tryPlant(plantType, row, col, isFree = false) {
    if (this.isCellOccupied(row, col)) return false;

    const proto = PLANT_CONFIG[plantType];
    if (!proto) return false;

    if (this.isBloodharborMode) {
      if (proto.isSunProducer || plantType === 'sunflower' || plantType === 'sun_shroom') {
        return false;
      }
      if (this.exhaustedSingleUse && this.exhaustedSingleUse.has(plantType)) {
        if (this.spawnFloatingText) {
          const cx = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
          const cy = CONFIG.GRID_OFFSET_Y + row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
          this.spawnFloatingText(cx, cy, 'CẦN TRUY NÃ ĐỂ NHẬN LẠI! 💀', '#ff5252', 15);
        }
        return false;
      }
      const aliveCount = this.plants.filter(p => p.alive).length;
      const cap = this.maxPlantsOnBoard || 12;
      if (aliveCount >= cap) {
        if (this.spawnFloatingText) {
          const cx = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
          const cy = CONFIG.GRID_OFFSET_Y + row * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
          this.spawnFloatingText(cx, cy, `ĐẠT GIỚI HẠN ${cap} CÂY! ⚓`, '#ffd54f', 16);
        }
        return false;
      }
    }

    // Trong chế độ Conveyor hoặc khi isFree = true, trồng cây hoàn toàn miễn phí, không tốn Sun và không tính cooldown
    if (!isFree && this.gameMode !== 'conveyor') {
      const isFreeSun = this.isFreePlantSunLevel();
      if (!isFreeSun && this.sun < proto.cost) return false;
      if ((this.cooldowns[plantType] || 0) > 0) return false;

      if (!isFreeSun) {
        this.sun -= proto.cost;
      }
      if (this.isBloodharborMode && this.isSetupPhase) {
        this.cooldowns[plantType] = 0;
      } else {
        this.cooldowns[plantType] = (this.isSandbox && this.sandboxNoCooldown) ? 0 : proto.cooldown;
      }
    }

    const plant = new Plant(plantType, row, col);
    if (this.isBloodharborMode && this.recalledPlantHpMap && Array.isArray(this.recalledPlantHpMap[plantType]) && this.recalledPlantHpMap[plantType].length > 0) {
      const preservedHp = this.recalledPlantHpMap[plantType].shift();
      if (typeof preservedHp === 'number' && preservedHp > 0) {
        plant.hp = Math.min(plant.maxHp, preservedHp);
      }
    }
    this.plants.push(plant);

    if (this.audio) {
      this.audio.playPlant(plantType);
    }

    this.spawnParticles(plant.x, plant.y, '#76ff03', 6);
    this.updateHUD();
    return true;
  }

  removePlantAt(row, col) {
    const idx = this.plants.findIndex(p => p.alive && p.row === row && p.col === col);
    if (idx !== -1) {
      const p = this.plants[idx];
      p.shoveled = true;
      p.alive = false;
      if (this.isBloodharborMode) {
        if (!this.recalledPlantHpMap) this.recalledPlantHpMap = {};
        if (!Array.isArray(this.recalledPlantHpMap[p.type])) {
          this.recalledPlantHpMap[p.type] = [];
        }
        const savedHp = Math.max(1, Math.round(p.hp));
        this.recalledPlantHpMap[p.type].push(savedHp);
        const recallCd = (typeof LEVEL_CONFIG !== 'undefined' && LEVEL_CONFIG[20] && LEVEL_CONFIG[20].shovelRecallCooldown) || 1.2;
        this.cooldowns[p.type] = this.isSetupPhase ? 0 : recallCd;
        if (this.spawnFloatingText) {
          this.spawnFloatingText(p.x, p.y - 20, `THU HỒI (${savedHp} HP) ⛏️`, '#26c6da', 15);
        }
      }
      if (this.audio) {
        this.audio.playShovel();
      }
      this.spawnParticles(p.x, p.y, '#8d6e63', 6);
      this.updateHUD();
    }
  }

  spawnZombie(type, row) {
    // Xác thực nghiêm ngặt loại zombie hợp lệ từ ZOMBIE_CONFIG (ngăn chặn các khóa như biteDamage, biteInterval, biteDps)
    const proto = (typeof ZOMBIE_CONFIG !== 'undefined') ? ZOMBIE_CONFIG[type] : null;
    if (!proto || typeof proto !== 'object' || !proto.id || !proto.hp) {
      console.error(`[spawnZombie] Loại zombie không hợp lệ: '${type}'! Hủy lệnh spawn.`);
      return null;
    }

    if (type === 'tombstone') {
      const z = new Zombie('tombstone', row, this);
      const col = 5 + Math.floor(Math.random() * 4);
      z.x = CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH + CONFIG.CELL_WIDTH / 2;
      this.zombies.push(z);
      return z;
    }
    const z = new Zombie(type, row, this);
    this.zombies.push(z);

    // Rồng Hắc Ám khi xuất hiện luôn đi kèm 1–2 rồng cấp thấp (Mới Nở hoặc Trưởng Thành) cùng hàng
    if (type === 'dragon_dark') {
      const escortCount = Math.random() < 0.5 ? 1 : 2;
      for (let i = 0; i < escortCount; i++) {
        const escortType = Math.random() < 0.5 ? 'dragon_hatchling' : 'dragon_adult';
        const escort = new Zombie(escortType, row, this);
        escort.x = z.x - 22 - i * 26;
        this.zombies.push(escort);
      }
    }
    return z;
  }

  spawnProjectile(type, row, x, y, damage, speed = 6.5) {
    const proj = new Projectile(type, row, x, y, damage, speed);
    this.projectiles.push(proj);
    return proj;
  }

  spawnLobbedProjectile(type, row, startX, startY, targetX, targetY, damage, splashDamage, splashRadiusCells, arcHeight) {
    const proj = new Projectile(type, row, startX, startY, damage, 6.0);
    proj.isLobbed = true;
    proj.targetX = targetX;
    proj.targetY = targetY;
    proj.startX = startX;
    proj.startY = startY;
    proj.splashDamage = splashDamage;
    proj.splashRadiusCells = splashRadiusCells;
    proj.arcHeight = arcHeight;
    this.projectiles.push(proj);
    return proj;
  }

  spawnExplosion(x, y) {
    this.spawnParticles(x, y, '#ff9100', 1, {
      shape: 'ring',
      vx: 0,
      vy: 0,
      radius: 10,
      maxRadius: 68,
      gravity: 0,
      decay: 2.7
    });
    for (let i = 0; i < 8; i++) {
      const ang = (i * Math.PI * 2) / 8 + (Math.random() - 0.5) * 0.35;
      const spd = 110 + Math.random() * 90;
      this.spawnParticles(x, y, i % 2 === 0 ? '#ff3d00' : '#ffd54f', 1, {
        shape: 'spark',
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 20,
        radius: 3.4,
        gravity: 90,
        decay: 2.6
      });
    }
    this.spawnParticles(x, y, '#fff59d', 5, {
      shape: 'circle',
      radius: 2.8,
      gravity: 60,
      decay: 3.0
    });
  }

  spawnFlyingImp(row, startX, startY, targetX, targetY) {
    this.flyingImps.push(new FlyingImp(row, startX, startY, targetX, targetY));
  }

  spawnLandedImp(row, x, y) {
    const imp = new Zombie('imp', row);
    imp.x = x;
    this.zombies.push(imp);
    this.spawnParticles(x, y, '#7e57c2', 8);
  }

  spawnHolographicBarrier(col) {
    this.barriers.push(new HolographicBarrier(col));
    for (let r = 0; r < CONFIG.ROWS; r++) {
      const y = CONFIG.GRID_OFFSET_Y + r * CONFIG.CELL_HEIGHT + CONFIG.CELL_HEIGHT / 2;
      this.spawnParticles(CONFIG.GRID_OFFSET_X + col * CONFIG.CELL_WIDTH, y, '#00e5ff', 4);
    }
  }

  spawnParticles(x, y, color, count = 4, opts = null) {
    const realCount = Math.min(Math.max(1, count), 10);
    const maxParticles = 72;
    const overflow = this.particles.length + realCount - maxParticles;
    if (overflow > 0) {
      this.particles.splice(0, overflow);
    }
    for (let i = 0; i < realCount; i++) {
      const particleOpts = opts || (i % 3 === 0 ? { shape: 'spark' } : null);
      this.particles.push(new Particle(x, y, color, particleOpts));
    }
  }

  spawnLightningArc(fromX, fromY, toX, toY) {
    const offsets = [
      (Math.random() - 0.5) * 18,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 16
    ];
    this.lightningArcs.push({ fromX, fromY, toX, toY, offsets, timer: 0.18, maxTimer: 0.18 });
  }

  spawnGasCloud(x, y) {
    this.gasClouds.push({ x, y, timer: 0, maxDuration: 1.2 });
  }

  triggerScreenShake(intensity = 10, duration = 0.28) {
    this.screenShake = Math.max(this.screenShake || 0, intensity);
    this.screenShakeDecay = intensity / Math.max(0.08, duration);
  }

  updateScreenShake(dt) {
    if ((this.screenShake || 0) > 0.05) {
      this.screenShake = Math.max(0, this.screenShake - (this.screenShakeDecay || 36) * dt);
      this.screenShakeX = (Math.random() - 0.5) * 2 * this.screenShake;
      this.screenShakeY = (Math.random() - 0.5) * 2 * this.screenShake;
    } else {
      this.screenShake = 0;
      this.screenShakeX = 0;
      this.screenShakeY = 0;
    }
  }

  spawnAttackEffect(effect) {
    if (!this.attackEffects) this.attackEffects = [];
    if (this.attackEffects.length > 40) {
      this.attackEffects.shift();
    }
    const baseEffect = {
      timer: 0,
      duration: 0.4,
      ...effect
    };
    if (baseEffect.kind === 'sett_r_throw') {
      baseEffect.duration = Math.max(0.62, baseEffect.duration || 0.62);
      this.startSettUltAnimation(baseEffect);
    } else if (baseEffect.kind === 'sett_r_slam') {
      // Trì hoãn vụ nổ chạm đất trùng khít khoảnh khắc Sett giáng xuống ở t = 0.36s
      baseEffect.timer = -0.36;
      baseEffect.duration = Math.max(0.56, baseEffect.duration || 0.56);
    }
    this.attackEffects.push(baseEffect);
  }

  startSettUltAnimation(effect) {
    if (!this.settUltAnimations) this.settUltAnimations = [];
    const targetY = effect.endY ?? effect.y ?? 0;
    const row = Math.max(0, Math.min(CONFIG.ROWS - 1, Math.floor((targetY - CONFIG.GRID_OFFSET_Y) / CONFIG.CELL_HEIGHT)));
    const grabX = effect.startX ?? effect.x ?? 0;
    const landX = effect.endX ?? effect.x ?? 0;

    // Tìm Sett đang tung chiêu R cùng hàng (hoặc gần điểm nhấc nhất)
    let caster = null;
    let bestDist = Infinity;
    for (const z of (this.zombies || [])) {
      if (!z.alive || z.type !== 'ionia_sett') continue;
      if (z.row === row || Math.abs(z.y - targetY) < CONFIG.CELL_HEIGHT * 0.7) {
        const d = Math.abs(z.x - grabX);
        if (d < bestDist || ((z.rSlamAnimTimer || 0) > 0.4 && d < 180)) {
          bestDist = d;
          caster = z;
        }
      }
    }

    // Tìm cây phòng thủ vừa được chuyển về ô đích để giữ chuyển động bay mượt thay vì dịch chuyển tức thì
    let thrownPlant = null;
    let bestPlantDist = 36;
    for (const p of (this.plants || [])) {
      if (!p.alive || p.row !== row) continue;
      const d = Math.abs(p.x - landX);
      if (d <= bestPlantDist && (!effect.plantType || p.type === effect.plantType || !thrownPlant)) {
        bestPlantDist = d;
        thrownPlant = p;
      }
    }

    const totalDuration = 0.72;
    const slamTime = 0.36;
    const settHomeX = caster ? caster.x : (grabX + 42);

    if (caster) {
      caster.rSlamAnimTimer = Math.max(caster.rSlamAnimTimer || 0, totalDuration);
      caster.rAnimActive = true;
      caster.rAnimPhase = 'windup';
      caster.rAnimProgress = 0;
      caster.rJumpOffsetX = 0;
      caster.rJumpOffsetY = 0;
      caster.rBodyAngle = 0;
      caster.rGrabPlantType = effect.plantType || (thrownPlant ? thrownPlant.type : 'wall_nut');
    }

    if (thrownPlant) {
      thrownPlant.settThrowOffsetX = grabX - thrownPlant.x;
      thrownPlant.settThrowLiftY = 0;
      thrownPlant.settThrowAngle = 0;
      thrownPlant.settThrowScaleX = 1;
      thrownPlant.settThrowScaleY = 1;
    }

    this.settUltAnimations.push({
      zombie: caster,
      plant: thrownPlant,
      settHomeX,
      grabX,
      landX,
      y: targetY,
      elapsed: 0,
      duration: totalDuration,
      slamTime,
      slamTriggered: false
    });
  }

  updateSettUltAnimations(dt) {
    if (!this.settUltAnimations || this.settUltAnimations.length === 0) return;
    const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

    for (const anim of this.settUltAnimations) {
      anim.elapsed += dt;
      const tNorm = Math.min(1, anim.elapsed / anim.duration);
      const z = anim.zombie;
      const p = anim.plant;
      const slamDestSettX = anim.landX + 18;

      if (anim.elapsed < anim.slamTime) {
        const u = anim.elapsed / anim.slamTime;
        if (u < 0.18) {
          // Pha 1a: Gồng mình lao tới ôm cây phòng thủ
          const w = u / 0.18;
          if (z && z.alive) {
            const currX = anim.settHomeX + (anim.grabX + 20 - anim.settHomeX) * w;
            z.rAnimActive = true;
            z.rAnimPhase = 'windup';
            z.rAnimProgress = tNorm;
            z.rJumpOffsetX = currX - z.x;
            z.rJumpOffsetY = 6 * Math.sin(w * Math.PI);
            z.rBodyAngle = -0.22 * w;
          }
          if (p && p.alive) {
            p.settThrowOffsetX = anim.grabX - p.x;
            p.settThrowLiftY = 14 * w;
            p.settThrowAngle = -0.15 * w;
            p.settThrowScaleX = 1 + 0.08 * w;
            p.settThrowScaleY = 1 - 0.08 * w;
          }
        } else {
          // Pha 1b: Nhấc bổng bay vòng cung cao & lộn người giáng xuống
          const arcU = (u - 0.18) / 0.82;
          const eased = easeInOut(arcU);
          const startSettX = anim.grabX + 20;
          const currSettX = startSettX + (slamDestSettX - startSettX) * eased;
          const arcHeight = Math.sin(arcU * Math.PI) * 92 + (1 - arcU) * 14;

          if (z && z.alive) {
            z.rAnimActive = true;
            z.rAnimPhase = 'leap';
            z.rAnimProgress = tNorm;
            z.rJumpOffsetX = currSettX - z.x;
            z.rJumpOffsetY = -arcHeight;
            z.rBodyAngle = -0.22 - arcU * Math.PI * 1.12;
          }
          if (p && p.alive) {
            const currPlantX = anim.grabX + (anim.landX - anim.grabX) * eased;
            p.settThrowOffsetX = currPlantX - p.x;
            p.settThrowLiftY = 14 + Math.sin(arcU * Math.PI) * 86;
            p.settThrowAngle = -0.15 - arcU * Math.PI * 1.35;
            p.settThrowScaleX = 1;
            p.settThrowScaleY = 1;
          }
          if (Math.random() < 0.45 && this.spawnParticles) {
            this.spawnParticles(currSettX, anim.y - arcHeight, Math.random() < 0.5 ? '#ffd54f' : '#ff6d00', 1);
          }
        }
      } else {
        // Khoảnh khắc chạm đất: rung lắc màn hình & bung bụi/tia lửa đấu trường
        if (!anim.slamTriggered) {
          anim.slamTriggered = true;
          this.triggerScreenShake(11, 0.28);
          if (this.spawnParticles) {
            this.spawnParticles(anim.landX, anim.y + 8, '#ffd54f', 16);
            this.spawnParticles(anim.landX, anim.y + 8, '#ff3d00', 12);
          }
        }

        const v = Math.min(1, (anim.elapsed - anim.slamTime) / Math.max(0.05, anim.duration - anim.slamTime));
        if (v < 0.26) {
          // Pha 2a: Giữ tư thế nện găng cực mạnh xuống mặt sân
          const hold = v / 0.26;
          if (z && z.alive) {
            z.rAnimActive = true;
            z.rAnimPhase = 'slam';
            z.rAnimProgress = tNorm;
            z.rJumpOffsetX = slamDestSettX - z.x;
            z.rJumpOffsetY = 6 * (1 - hold);
            z.rBodyAngle = -0.35 * (1 - hold * 0.4);
          }
          if (p && p.alive) {
            p.settThrowOffsetX = 0;
            p.settThrowLiftY = 0;
            p.settThrowAngle = 0;
            const sq = Math.sin(hold * Math.PI);
            p.settThrowScaleX = 1 + 0.26 * sq;
            p.settThrowScaleY = 1 - 0.24 * sq;
          }
        } else {
          // Pha 2b: Bật nhảy gọn về vị trí chiến đấu
          const ret = (v - 0.26) / 0.74;
          const retEase = easeInOut(ret);
          if (z && z.alive) {
            z.rAnimActive = true;
            z.rAnimPhase = 'recover';
            z.rAnimProgress = tNorm;
            z.rJumpOffsetX = (slamDestSettX - z.x) * (1 - retEase);
            z.rJumpOffsetY = -Math.sin(ret * Math.PI) * 32;
            z.rBodyAngle = -0.21 * (1 - retEase);
          }
          if (p && p.alive) {
            p.settThrowOffsetX = 0;
            p.settThrowLiftY = 0;
            p.settThrowAngle = 0;
            p.settThrowScaleX = 1;
            p.settThrowScaleY = 1;
          }
        }
      }

      if (anim.elapsed >= anim.duration) {
        if (z) {
          z.rAnimActive = false;
          z.rAnimPhase = null;
          z.rAnimProgress = 0;
          z.rJumpOffsetX = 0;
          z.rJumpOffsetY = 0;
          z.rBodyAngle = 0;
        }
        if (p) {
          p.settThrowOffsetX = 0;
          p.settThrowLiftY = 0;
          p.settThrowAngle = 0;
          p.settThrowScaleX = 1;
          p.settThrowScaleY = 1;
        }
      }
    }

    this.settUltAnimations = this.settUltAnimations.filter(anim => anim.elapsed < anim.duration);
  }

  spawnLaserBeam(fromX, fromY, toX, toY, row) {
    this.laserBeams.push({ fromX, fromY, toX, toY, row, timer: 0.35, maxTimer: 0.35 });
  }

  clearAllZombies() {
    for (const z of this.zombies) {
      z.skipEggRebirth = true;
      z.skipChemDrop = true;
      z.skipWaterRevive = true;
      z.luxDeathProcessed = true;
      z.quanChuaDeathProcessed = true;
      z.rAnimActive = false;
      z.rJumpOffsetX = 0;
      z.rJumpOffsetY = 0;
      z.rBodyAngle = 0;
      if (z.luxAttackers) z.luxAttackers.clear();
      if (z.type === 'thresh' && typeof z.releaseThreshHook === 'function') {
        z.releaseThreshHook();
      }
      z.alive = false;
      z.deathTimer = 1.0;
    }
    for (const p of (this.plants || [])) {
      p.settThrowOffsetX = 0;
      p.settThrowLiftY = 0;
      p.settThrowAngle = 0;
      p.settThrowScaleX = 1;
      p.settThrowScaleY = 1;
    }
    this.settUltAnimations = [];
    this.screenShake = 0;
    this.screenShakeX = 0;
    this.screenShakeY = 0;
    this.flyingImps = [];
    this.aniviaIceSpikes = [];
    this.updateHUD();
  }

  resetCooldowns() {
    for (const key in this.cooldowns) {
      this.cooldowns[key] = 0;
    }
    this.updateHUD();
  }

  toggleSandboxNoCooldown() {
    this.sandboxNoCooldown = !this.sandboxNoCooldown;
    if (this.sandboxNoCooldown) {
      for (const key in this.cooldowns) {
        this.cooldowns[key] = 0;
      }
    }
    this.updateSandboxCooldownBtnUI();
    this.updateHUD();
    return this.sandboxNoCooldown;
  }

  updateSandboxCooldownBtnUI() {
    if (typeof document === 'undefined') return;
    const btn = document.getElementById('sb-reset-cooldowns');
    if (!btn) return;
    const isActive = !!(this.isSandbox && this.sandboxNoCooldown);
    btn.classList.toggle('sb-btn-active', isActive);
    btn.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    btn.textContent = isActive ? '⏱️ Hồi Chiêu 0s: BẬT' : '⏱️ Hồi Chiêu 0s: TẮT';
  }

  triggerGameOver() {
    if (this.isSandbox) return;
    this.onGameOver();
  }

  onGameOver() {
    if (this.isSandbox) return; // Sandbox cho phép thử nghiệm liên tục không gián đoạn
    if (this.isGameOver) return;
    this.isGameOver = true;

    if (this.audio) {
      this.audio.stopBGM();
      this.audio.playLose();
    }

    if (this.dialogTitle) {
      this.dialogTitle.textContent = 'THE ZOMBIES ATE YOUR BRAINS!';
      this.dialogTitle.className = 'lose';
    }
    if (this.dialogMessage) {
      this.dialogMessage.textContent = `Lũ Zombie đã tràn qua hàng phòng ngự ở Level ${this.currentLevel}!`;
    }
    if (this.dialogNextBtn) {
      this.dialogNextBtn.classList.add('hidden');
    }
    if (this.dialogOverlay) this.dialogOverlay.classList.remove('hidden');
  }

  onLevelVictory() {
    if (this.isSandbox) return; // Sandbox không hiện popup chiến thắng
    if (this.isVictory) return;
    this.isVictory = true;

    if (this.audio) {
      this.audio.stopBGM();
      this.audio.playWin();
    }

    // Ghi nhận màn hiện tại đã hoàn thành
    if (!this.completedLevels) this.completedLevels = [];
    if (!this.completedLevels.includes(this.currentLevel)) {
      this.completedLevels.push(this.currentLevel);
    }

    // Mở khóa màn tiếp theo (tối đa cấp 20)
    if (this.currentLevel < 20) {
      this.unlockedLevel = Math.max(this.unlockedLevel, this.currentLevel + 1);
    }

    // Lưu tiến trình bền vững vào localStorage
    this.saveProgress();

    if (this.dialogTitle) {
      if (this.currentLevel === 20) {
        this.dialogTitle.textContent = 'VICTORY! HẠ GỤC ZOMBOT ĐỒ TỂ BẾN CẢNG TỬ THẦN!';
      } else if (this.currentLevel === 19) {
        this.dialogTitle.textContent = 'VICTORY! CHINH PHỤC VÙNG ĐẤT IONIA!';
      } else if (this.currentLevel === 18) {
        this.dialogTitle.textContent = 'VICTORY! PHÁ VỠ SONG KIẾM LINH GIỚI IONIA!';
      } else if (this.currentLevel === 17) {
        this.dialogTitle.textContent = 'VICTORY! BẢO VỆ ĐỀN HOA ANH ĐÀO IONIA!';
      } else if (this.currentLevel === 16) {
        this.dialogTitle.textContent = 'VICTORY! CHINH PHỤC CHIẾN TRƯỜNG NOSUS!';
      } else if (this.currentLevel === 15) {
        this.dialogTitle.textContent = 'VICTORY! PHÁ TAN PHÁO ĐÀI HUYẾT TẾ NOSUS!';
      } else if (this.currentLevel === 14) {
        this.dialogTitle.textContent = 'VICTORY! HẠ GỤC TIỀN ĐỒN THIẾT HUYẾT NOSUS!';
      } else if (this.currentLevel === 13) {
        this.dialogTitle.textContent = 'VICTORY! ĐÁNH BẠI HOÀNG ĐẾ SA MẠC AZIR!';
      } else if (this.currentLevel === 12) {
        this.dialogTitle.textContent = 'VICTORY! ĐÁNH BẠI BOSS RỒNG NGÀN TUỔI!';
      } else if (this.currentLevel === 11) {
        this.dialogTitle.textContent = 'VICTORY! CHINH PHỤC VƯƠNG QUỐC LONG TỘC!';
      } else if (this.currentLevel === 10) {
        this.dialogTitle.textContent = 'VICTORY! CHINH PHỤC TOÀN BỘ 10 MÀN CHIẾN DỊCH!';
      } else if (this.currentLevel === 6) {
        this.dialogTitle.textContent = 'VICTORY! TIÊU DIỆT ZOMBOT DARK DRAGON!';
      } else if (this.currentLevel === 5) {
        this.dialogTitle.textContent = 'VICTORY! TIÊU DIỆT BOSS GARGANTUAR!';
      } else {
        this.dialogTitle.textContent = `VICTORY! VƯỢT QUA LEVEL ${this.currentLevel}!`;
      }
      this.dialogTitle.className = 'win';
    }
    if (this.dialogMessage) {
      if (this.currentLevel === 20) {
        this.dialogMessage.textContent = 'CHÚA TỂ BẾN CẢNG TỬ THẦN! Bạn đã đọc vị hoàn hảo Q/E/R của Zombot Đồ Tể Pyke (15.000 HP), đảo đội hình bằng Xẻng và săn Thuyền Trưởng Truy Nã để chiến thắng Màn 20!';
      } else if (this.currentLevel === 19) {
        this.dialogMessage.textContent = 'ĐỆ NHẤT TÔNG SƯ IONIA! Bạn đã đánh bại song Mini-Boss Sett, hóa giải Dấu Ấn Zed & Xuất Hồn Yone! Màn Trùm Cấp 20: Bến Cảng Tử Thần đã sẵn sàng!';
      } else if (this.currentLevel === 18) {
        this.dialogMessage.textContent = 'TUYỆT ĐỈNH PHÒNG THỦ! Bạn đã ngăn cản Yone Xuất Hồn - Đoạt Mệnh và hạ gục Sett mở đường tới trận cuối Cấp 19!';
      } else if (this.currentLevel === 17) {
        this.dialogMessage.textContent = 'XUẤT SẮC! Bạn đã đẩy lùi sát thủ Zed và Song Kiếm Yone tại Đền Hoa Anh Đào! Tiến lên Cấp 18!';
      } else if (this.currentLevel === 16) {
        this.dialogMessage.textContent = 'BÁ CHỦ CHIẾN TRƯỜNG! Bạn đã hạ gục song Đại Tướng Darius và mở cánh cổng bước sang Vùng Đất Ionia (Cấp 17–19)!';
      } else if (this.currentLevel === 15) {
        this.dialogMessage.textContent = 'XUẤT SẮC! Bạn đã ngăn chặn Huyết Tế của Huyết Pháp Sư Nosus! Cấp 16: Đại Tướng Darius Nosus đang chờ ở trận cuối!';
      } else if (this.currentLevel === 14) {
        this.dialogMessage.textContent = 'CHIẾN THẮNG MỞ MÀN! Bạn đã vượt qua Binh Sĩ, Sát Thủ và Vệ Binh Khiên Sắt Nosus! Tiến lên Cấp 15 đối đầu Huyết Pháp Sư!';
      } else if (this.currentLevel === 13) {
        this.dialogMessage.textContent = 'CHỦ NHÂN ĐĨA MẶT TRỜI! Bạn đã hạ gục Hoàng Đế Sa Mạc Azir 20.000 HP! Thế giới mới Chiến Trường Nosus (Cấp 14–16) đang chờ đón!';
      } else if (this.currentLevel === 12) {
        this.dialogMessage.textContent = 'ĐẠI TÔNG SƯ LONG TỘC! Bạn đã hạ gục Boss Rồng Ngàn Tuổi 10.000 HP! Hãy tiến vào Sa Mạc Shurima ở Cấp 13 đối đầu Hoàng Đế Azir!';
      } else if (this.currentLevel === 11) {
        this.dialogMessage.textContent = 'CHÍ TÔN LONG VƯƠNG! Bạn đã vượt qua Map Special Vương Quốc Long Tộc! Cấp 12: Boss Rồng Ngàn Tuổi đang chờ đón!';
      } else if (this.currentLevel === 10) {
        this.dialogMessage.textContent = 'HUYỀN THOẠI BÁ KHÍ! Bạn đã vượt qua Đêm Tận Thế Hắc Ám ở Cấp 10! Hãy thử sức ngay với Map Special Vương Quốc Long Tộc!';
      } else if (this.currentLevel === 6) {
        this.dialogMessage.textContent = 'CHIẾN CÔNG VĨ ĐẠI! Bạn đã đánh bại Zombot Dark Dragon 27.000 HP! Các màn thử thách Cấp 7–20 đã sẵn sàng!';
      } else if (this.currentLevel === 5) {
        this.dialogMessage.textContent = 'Xuất sắc! Bạn đã đánh bại BOSS Gargantuar! Hãy chuẩn bị tiến vào CẤP 6 đối đầu Zombot Dark Dragon!';
      } else {
        this.dialogMessage.textContent = `Chúc mừng! Level ${this.currentLevel + 1} đã được mở khóa trên Bản Đồ Thế Giới!`;
      }
    }
    if (this.dialogNextBtn) {
      this.dialogNextBtn.classList.remove('hidden');
      this.dialogNextBtn.textContent = this.currentLevel < 20 ? `Chơi Level ${this.currentLevel + 1} →` : 'Xem Bản Đồ 🗺️';
    }
    if (this.dialogOverlay) this.dialogOverlay.classList.remove('hidden');
  }

  // Phương thức tương thích ngược
  onWaveVictory() {
    this.onLevelVictory();
  }

  updateHUD() {
    // 1. Cập nhật Số lượng Mặt trời (Chỉ ghi đè DOM khi giá trị thay đổi)
    const currentSun = Math.floor(this.sun || 0);
    if (this._lastSun !== currentSun) {
      this._lastSun = currentSun;
      if (this.sunCountEl) this.sunCountEl.textContent = currentSun;
    }

    // 2. Cập nhật Plant Food
    const currentPF = this.plantFood !== undefined ? this.plantFood : 3;
    if (this._lastPF !== currentPF) {
      this._lastPF = currentPF;
      if (this.plantFoodCountEl) this.plantFoodCountEl.textContent = currentPF;
      if (this.plantFoodBtn) this.plantFoodBtn.classList.toggle('disabled', currentPF <= 0);
    }
    const isPFActive = !!this.isPlantFoodActive;
    if (this._lastPFActive !== isPFActive) {
      this._lastPFActive = isPFActive;
      if (this.plantFoodBtn) this.plantFoodBtn.classList.toggle('selected', isPFActive);
    }

    // 3. Cập nhật Cooldown & Thẻ Cây (Radial Wipe)
    if (!this._lastCdDeg) this._lastCdDeg = {};
    if (!this._lastCdActive) this._lastCdActive = {};
    if (!this._readyTimers) this._readyTimers = {};
    if (!this._lastCardDisabled) this._lastCardDisabled = {};
    const isFreeSun = this.isFreePlantSunLevel();
    for (const key of this.plantKeys) {
      const proto = PLANT_CONFIG[key];
      const cardEl = this.cardElements[key];
      const cdEl = this.cooldownElements[key];
      if (proto && cardEl) {
        const cdRemaining = this.cooldowns[key] || 0;
        const cdRatio = proto.cooldown > 0 ? Math.max(0, Math.min(1, cdRemaining / proto.cooldown)) : 0;
        const isCooling = cdRemaining > 0.001 && cdRatio > 0.001;
        const revealedDeg = isCooling ? Number(((1 - cdRatio) * 360).toFixed(1)) : 360;
        if (cdEl) {
          const prevActive = !!this._lastCdActive[key];
          const prevDeg = this._lastCdDeg[key] !== undefined ? this._lastCdDeg[key] : 360;
          if (isCooling) {
            if (!prevActive || revealedDeg < prevDeg) {
              cdEl.classList.remove('sweeping');
              cdEl.classList.add('active');
              cdEl.style.setProperty('--cd-deg', `${revealedDeg}deg`);
              if (this._readyTimers[key]) {
                clearTimeout(this._readyTimers[key]);
                this._readyTimers[key] = null;
              }
              cardEl.classList.remove('cooldown-ready');
            } else if (prevDeg !== revealedDeg) {
              cdEl.classList.add('sweeping', 'active');
              cdEl.style.setProperty('--cd-deg', `${revealedDeg}deg`);
            }
          } else if (prevActive) {
            cdEl.classList.add('sweeping');
            cdEl.style.setProperty('--cd-deg', '360deg');
            cdEl.classList.remove('active');
            if (isFreeSun || this.sun >= proto.cost) {
              cardEl.classList.remove('cooldown-ready');
              cardEl.classList.add('cooldown-ready');
              if (this._readyTimers[key]) clearTimeout(this._readyTimers[key]);
              this._readyTimers[key] = setTimeout(() => {
                cardEl.classList.remove('cooldown-ready');
                this._readyTimers[key] = null;
              }, 450);
            }
          }
          this._lastCdActive[key] = isCooling;
          this._lastCdDeg[key] = revealedDeg;
        }
        const isExhausted = this.isBloodharborMode && this.exhaustedSingleUse && this.exhaustedSingleUse.has(key);
        cardEl.classList.toggle('exhausted-single-use', !!isExhausted);
        const canAfford = !isExhausted && (isFreeSun || this.sun >= proto.cost) && (cdRemaining <= 0);
        const isDisabled = !canAfford;
        if (this._lastCardDisabled[key] !== isDisabled) {
          this._lastCardDisabled[key] = isDisabled;
          cardEl.classList.toggle('disabled', isDisabled);
        }
      }
    }

    // 3.5. Cập nhật HUD Bến Cảng Tử Thần (Map 20)
    if (this.bhControlsEl) {
      this.bhControlsEl.classList.toggle('hidden', !this.isBloodharborMode);
    }
    if (this.isBloodharborMode) {
      const aliveCount = this.plants ? this.plants.filter(p => p.alive).length : 0;
      const cap = this.maxPlantsOnBoard || 12;
      if (this.bhPlantCapEl) {
        this.bhPlantCapEl.textContent = `🌱 ${aliveCount}/${cap}`;
      }
      if (this.bhCutBadgeEl) {
        this.bhCutBadgeEl.textContent = this.isSetupPhase
          ? `⚓ DÀN TRẬN`
          : `💀 ${Math.max(0, Math.ceil(this.yourCutTimer || 0))}s`;
      }
      if (this.bhBlowHornBtn) {
        this.bhBlowHornBtn.classList.toggle('hidden', !this.isSetupPhase);
      }
    }

    // 4. Thanh tiến trình / Thanh máu Boss
    const isBossLevel = (this.currentLevel === 6 || this.currentLevel === 12 || this.currentLevel === 13 || this.currentLevel === 20);
    const activeBossType = this.currentLevel === 20
      ? 'zombot_pyke'
      : (this.currentLevel === 13
          ? 'azir_desert_emperor'
          : (this.currentLevel === 12 ? 'ancient_dragon_boss' : 'zombot_dark_dragon'));
    if (this._lastHudMode !== isBossLevel || this._lastBossLevelType !== activeBossType) {
      this._lastHudMode = isBossLevel;
      this._lastBossLevelType = activeBossType;
      if (isBossLevel) {
        if (this.waveMeterEl) {
          this.waveMeterEl.classList.add('boss-hp-bar-mode');
          this.waveMeterEl.title = this.currentLevel === 20
            ? 'Thanh Máu Boss Zombot Đồ Tể Pyke'
            : (this.currentLevel === 13
                ? 'Thanh Máu Boss Azir Hoàng Đế Sa Mạc'
                : (this.currentLevel === 12 ? 'Thanh Máu Boss Rồng Ngàn Tuổi' : 'Thanh Máu Trùm Zombot Dark Dragon'));
        }
        if (this.flagIconEl) {
          this.flagIconEl.innerHTML = activeBossType === 'zombot_pyke'
            ? '<span class="boss-flag-dragon">🏴‍☠️</span>'
            : (activeBossType === 'azir_desert_emperor'
                ? '<span class="boss-flag-dragon">🦅</span>'
                : '<span class="boss-flag-dragon">🐲</span>');
        }
        if (this.zombieHeadBadgeEl) {
          this.zombieHeadBadgeEl.innerHTML = activeBossType === 'zombot_pyke'
            ? '<span style="font-size: 15px; line-height: 1;">⚓</span>'
            : (activeBossType === 'azir_desert_emperor'
                ? '<span style="font-size: 15px; line-height: 1;">☀️</span>'
                : '<span style="font-size: 15px; line-height: 1;">🔥</span>');
        }
      } else {
        if (this.waveMeterEl) {
          this.waveMeterEl.classList.remove('boss-hp-bar-mode');
          this.waveMeterEl.title = 'Tiến độ đợt tấn công của Zombie';
        }
        if (this.flagIconEl && this.defaultFlagSvg) {
          this.flagIconEl.innerHTML = this.defaultFlagSvg;
        }
        if (this.zombieHeadBadgeEl && this.defaultZombieHeadSvg) {
          this.zombieHeadBadgeEl.innerHTML = this.defaultZombieHeadSvg;
        }
      }
    }

    if (isBossLevel) {
      const boss = this.zombies.find(z => z.alive && z.type === activeBossType);
      const defaultMaxHp = activeBossType === 'zombot_pyke'
        ? 15000
        : (activeBossType === 'azir_desert_emperor' ? 20000 : (activeBossType === 'ancient_dragon_boss' ? 10000 : 27000));
      const maxHp = boss ? boss.maxHp : (CONFIG.ZOMBIES && CONFIG.ZOMBIES[activeBossType] ? CONFIG.ZOMBIES[activeBossType].hp : defaultMaxHp);
      const hasBossSpawnedYet = activeBossType === 'zombot_pyke'
        ? !this.isSetupPhase
        : (!this.waveManager || this.waveManager.state !== 'initial_delay');
      const currentHp = boss ? Math.max(0, boss.hp) : ((this.isVictory || hasBossSpawnedYet) ? 0 : maxHp);
      const ratio = Math.max(0, Math.min(1.0, currentHp / maxHp));
      const percentStr = `${(ratio * 100).toFixed(1)}%`;

      if (this.progressBarEl && this._lastProgressBarWidth !== percentStr) {
        this._lastProgressBarWidth = percentStr;
        this.progressBarEl.style.width = percentStr;
      }
      const rightStr = `${((1 - ratio) * 100).toFixed(1)}%`;
      if (this.zombieHeadBadgeEl && this._lastBadgeRight !== rightStr) {
        this._lastBadgeRight = rightStr;
        this.zombieHeadBadgeEl.style.right = rightStr;
      }
      if (this.bossHpLabelEl) {
        const bossTitle = activeBossType === 'zombot_pyke'
          ? 'ZOMBOT ĐỒ TỂ'
          : (activeBossType === 'azir_desert_emperor'
              ? 'HOÀNG ĐẾ AZIR'
              : (activeBossType === 'ancient_dragon_boss' ? 'RỒNG NGÀN TUỔI' : 'RỒNG'));
        const bossIcon = activeBossType === 'zombot_pyke' ? '🏴‍☠️' : (activeBossType === 'azir_desert_emperor' ? '☀️' : '🐲');
        const shieldTxt = (boss && boss.bossAllShieldHp > 0) ? ` (+${Math.ceil(boss.bossAllShieldHp).toLocaleString()} 🛡️)` : '';
        const greyTxt = (boss && boss.type === 'zombot_pyke' && boss.pykeGreyHealth > 0)
          ? ` (+${Math.round(boss.pykeGreyHealth)} Xám)`
          : '';
        const statusTxt = (boss && boss.type === 'zombot_pyke' && boss.pykeStuckTimer > 0)
          ? (boss.pykeVulnerableTimer > 0 ? ' [KẸT ×1.5 DMG!]' : ' [KẸT!]')
          : '';
        const text = (currentHp <= 0 || this.isVictory)
          ? `${bossIcon} ${bossTitle} ĐÃ BỊ HẠ GỤC! (0 / ${maxHp.toLocaleString()} HP)`
          : `${bossIcon} ${bossTitle}: ${Math.ceil(currentHp).toLocaleString()} / ${maxHp.toLocaleString()} HP${greyTxt}${shieldTxt}${statusTxt}`;
        if (this._lastBossHpText !== text) {
          this._lastBossHpText = text;
          this.bossHpLabelEl.textContent = text;
        }
      }
    } else {
      if (this.progressBarEl && this.waveManager) {
        const progress = this.waveManager.getProgress();
        const percentStr = `${(progress * 100).toFixed(1)}%`;
        if (this._lastProgressBarWidth !== percentStr) {
          this._lastProgressBarWidth = percentStr;
          this.progressBarEl.style.width = percentStr;
        }
        if (this.zombieHeadBadgeEl && this._lastBadgeRight !== percentStr) {
          this._lastBadgeRight = percentStr;
          this.zombieHeadBadgeEl.style.right = percentStr;
        }
      }
    }
  }

  syncUnifiedPlantIcons() {
    if (typeof GameRenderer === 'undefined' || typeof GameRenderer.getPlantIconDataURL !== 'function') return;

    this.plantKeys.forEach(key => {
      const dataUrl = GameRenderer.getPlantIconDataURL(key, 88);
      if (!dataUrl) return;

      const pData = PLANT_SHOWCASE_DATA[key];
      const safeName = pData ? pData.name.replace(/"/g, '&quot;') : key;
      const imgHtml = `<img class="plant-icon-img" src="${dataUrl}" alt="${safeName}" draggable="false" />`;

      if (pData) {
        pData.svg = imgHtml;
      }

      const domKey = key.replace(/_/g, '-');
      const cardEl = document.getElementById(`card-${domKey}`);
      if (cardEl) {
        const iconSlot = cardEl.querySelector('.card-icon');
        if (iconSlot) {
          iconSlot.innerHTML = imgHtml;
        }
      }
    });
  }

  // ==========================================================
  // HỆ THỐNG TỪ ĐIỂN CÂY & ZOMBIE (SUBURBAN ALMANAC)
  // ==========================================================
  initAlmanac() {
    this.almanacOverlay = document.getElementById('almanac-overlay');
    this.almanacBtn = document.getElementById('almanac-btn');
    this.almanacCloseBtn = document.getElementById('almanac-close-btn');
    this.almanacCloseFooterBtn = document.getElementById('almanac-close-footer-btn');
    this.almanacTabPlants = document.getElementById('almanac-tab-plants');
    this.almanacTabZombies = document.getElementById('almanac-tab-zombies');
    this.almanacGridEl = document.getElementById('almanac-grid');

    this.almanacVisualEl = document.getElementById('almanac-visual');
    this.almanacNameEl = document.getElementById('almanac-name');
    this.almanacSubtitleEl = document.getElementById('almanac-subtitle');
    this.almanacStatsEl = document.getElementById('almanac-stats');
    this.almanacDescEl = document.getElementById('almanac-desc');

    this.almanacCurrentTab = 'plants';

    if (this.almanacBtn) {
      this.almanacBtn.addEventListener('click', () => this.openAlmanac());
    }
    if (this.almanacCloseBtn) {
      this.almanacCloseBtn.addEventListener('click', () => this.closeAlmanac());
    }
    if (this.almanacCloseFooterBtn) {
      this.almanacCloseFooterBtn.addEventListener('click', () => this.closeAlmanac());
    }
    if (this.almanacTabPlants) {
      this.almanacTabPlants.addEventListener('click', () => this.switchAlmanacTab('plants'));
    }
    if (this.almanacTabZombies) {
      this.almanacTabZombies.addEventListener('click', () => this.switchAlmanacTab('zombies'));
    }
  }

  openAlmanac() {
    if (this.audio) this.audio.playClick();
    if (this.almanacOverlay) {
      this.almanacOverlay.classList.remove('hidden');
      this.switchAlmanacTab(this.almanacCurrentTab || 'plants');
    }
  }

  closeAlmanac() {
    if (this.audio) this.audio.playClick();
    if (this.almanacOverlay) {
      this.almanacOverlay.classList.add('hidden');
    }
  }

  switchAlmanacTab(tab) {
    if (this.audio) this.audio.playClick();
    this.almanacCurrentTab = tab;

    if (this.almanacTabPlants) {
      this.almanacTabPlants.classList.toggle('active', tab === 'plants');
    }
    if (this.almanacTabZombies) {
      this.almanacTabZombies.classList.toggle('active', tab === 'zombies');
    }

    if (tab === 'plants') {
      this.renderAlmanacPlants();
    } else {
      this.renderAlmanacZombies();
    }
  }

  renderAlmanacPlants() {
    if (!this.almanacGridEl) return;
    this.almanacGridEl.innerHTML = '';

    const plantKeys = Object.keys(PLANT_SHOWCASE_DATA);
    plantKeys.forEach((key, index) => {
      const p = PLANT_SHOWCASE_DATA[key];
      const card = document.createElement('div');
      card.className = 'almanac-item-card';
      card.id = `almanac-plant-${key}`;
      card.innerHTML = `
        <div class="almanac-card-icon">${p.svg}</div>
        <div class="almanac-card-name">${p.name.split(' (')[0]}</div>
        <div class="almanac-card-cost">${p.cost} ☀️</div>
      `;
      card.addEventListener('click', () => this.showAlmanacPlant(key));
      this.almanacGridEl.appendChild(card);

      if (index === 0) {
        this.showAlmanacPlant(key);
      }
    });
  }

  showAlmanacPlant(key) {
    const p = PLANT_SHOWCASE_DATA[key];
    if (!p) return;

    if (this.almanacGridEl) {
      const cards = this.almanacGridEl.querySelectorAll('.almanac-item-card');
      cards.forEach(c => c.classList.remove('selected'));
      const selectedEl = document.getElementById(`almanac-plant-${key}`);
      if (selectedEl) selectedEl.classList.add('selected');
    }

    if (this.almanacVisualEl) this.almanacVisualEl.innerHTML = p.svg;
    if (this.almanacNameEl) this.almanacNameEl.textContent = p.name;
    if (this.almanacSubtitleEl) this.almanacSubtitleEl.textContent = `Nhóm: ${p.group}`;

    if (this.almanacStatsEl) {
      this.almanacStatsEl.innerHTML = `
        <div class="almanac-stat-chip"><span class="stat-label">CHI PHÍ SUN:</span><span class="stat-val">${p.cost} ☀️</span></div>
        <div class="almanac-stat-chip"><span class="stat-label">SẠC LẠI:</span><span class="stat-val">${p.cooldown}</span></div>
        <div class="almanac-stat-chip"><span class="stat-label">SỰ BỀN BỈ (HP):</span><span class="stat-val">${p.hp}</span></div>
        <div class="almanac-stat-chip"><span class="stat-label">SÁT THƯƠNG:</span><span class="stat-val">${p.dmg}</span></div>
        <div class="almanac-stat-chip" style="grid-column: span 2;"><span class="stat-label">TỐC ĐỘ BẮN / ĐÁNH:</span><span class="stat-val">${p.rate}</span></div>
      `;
    }

    if (this.almanacDescEl) {
      this.almanacDescEl.textContent = p.desc;
    }
  }

  renderAlmanacZombies() {
    if (!this.almanacGridEl) return;
    this.almanacGridEl.innerHTML = '';

    const zombieKeys = Object.keys(ZOMBIE_PREVIEW_INFO);
    zombieKeys.forEach((key, index) => {
      const z = ZOMBIE_PREVIEW_INFO[key];
      const card = document.createElement('div');
      card.className = 'almanac-item-card';
      card.id = `almanac-zombie-${key}`;
      card.innerHTML = `
        <div class="almanac-card-icon">${z.avatar}</div>
        <div class="almanac-card-name">${z.name.split(' (')[0]}</div>
        <div class="almanac-card-cost" style="color:#ef5350;">${z.boss ? 'BOSS' : 'XÁC SỐNG'}</div>
      `;
      card.addEventListener('click', () => this.showAlmanacZombie(key));
      this.almanacGridEl.appendChild(card);

      if (index === 0) {
        this.showAlmanacZombie(key);
      }
    });
  }

  showAlmanacZombie(key) {
    const z = ZOMBIE_PREVIEW_INFO[key];
    if (!z) return;

    if (this.almanacGridEl) {
      const cards = this.almanacGridEl.querySelectorAll('.almanac-item-card');
      cards.forEach(c => c.classList.remove('selected'));
      const selectedEl = document.getElementById(`almanac-zombie-${key}`);
      if (selectedEl) selectedEl.classList.add('selected');
    }

    if (this.almanacVisualEl) this.almanacVisualEl.innerHTML = `<span style="font-size: 38px;">${z.avatar}</span>`;
    if (this.almanacNameEl) this.almanacNameEl.textContent = z.name;
    if (this.almanacSubtitleEl) this.almanacSubtitleEl.textContent = z.boss ? 'Trùm Cuối Hắc Ám' : 'Quân Đoàn Xác Sống';

    const proto = ZOMBIE_CONFIG[key] || {};
    const speedText = proto.speedPerCell ? `${proto.speedPerCell}s / ô` : '5.0s / ô';

    const dmgLabel = key === 'gargantuar'
      ? '99999 (1-hit diệt cây)'
      : key === 'azir_desert_emperor'
        ? 'Lính Cát 200 · Bão Cát 3 Hàng · Song Thần'
        : key === 'renekton_croc'
          ? '100/s · Lướt 1000 · Khổng Lồ 250 / Quét 400'
          : key === 'nasus_hound'
            ? '100/s · Lão Hóa · <60% HP Hủy Diệt Cây'
            : key === 'sand_soldier'
              ? '200 DMG (Tấn công 1 cây rồi biến mất)'
              : key === 'sand_coffin'
                ? '0 DMG (Vật cản 800 HP)'
                : key === 'nosus_hemomancer'
                  ? '80 DMG / 1.4s (Tầm 2.5 ô) · Huyết Tế +120 HP'
                  : key === 'nosus_warlord'
                    ? '240 / 1.75s · Hành Quyết <20% · Xoay 3×3 · One-Hit (<100 HP)'
                    : key === 'ionia_zed'
                      ? '50 DMG/s · Máu Tử Lao Bóng Gắn Dấu Ấn (5s nổ 300 DMG)'
                      : key === 'ionia_yone'
                        ? '70 DMG / 0.5s · Luân Phiên 12% HP · E Xuất Hồn · R Lướt 3 Ô (120 DMG)'
                        : key === 'ionia_sett'
                          ? '2×300 DMG / 2s · W Giáp 500 + Sóng 550/200 · R Ném Lùi 2 Ô + 250 Lan 3×3'
                          : key === 'drowned_sailor'
                            ? '50 DMG / 0.5s (100 DPS)'
                            : key === 'anchor_bearer'
                              ? '75 DMG / 0.7s · Đòn 3 đẩy lùi cây 1 ô'
                              : key === 'swimming_ghost'
                                ? '50 DMG / 0.5s · Lặn cột 9 → Trồi cột 5'
                                : key === 'wanted_captain'
                                  ? '65 DMG / 0.5s · Đi hàng DPS thấp nhất'
                                  : key === 'zombot_pyke'
                                    ? 'Q Kéo +2 ô · E Trói 4s · R 1800 DMG (Máu Xám 40%/800 · Kẹt 4s ×1.5)'
                                    : (proto.damage ? `${proto.damage} DMG / ${proto.attackInterval || 1.0}s` : '50 DMG (100 DPS)');
    if (this.almanacStatsEl) {
      this.almanacStatsEl.innerHTML = `
        <div class="almanac-stat-chip" style="grid-column: span 2;"><span class="stat-label">SỨC CHỊU ĐỰNG & GIÁP:</span><span class="stat-val">${z.hpText}</span></div>
        <div class="almanac-stat-chip"><span class="stat-label">TỐC ĐỘ DI CHUYỂN:</span><span class="stat-val">${speedText}</span></div>
        <div class="almanac-stat-chip"><span class="stat-label">SÁT THƯƠNG:</span><span class="stat-val">${dmgLabel}</span></div>
      `;
    }

    if (this.almanacDescEl) {
      this.almanacDescEl.textContent = z.desc;
    }
  }
}

function initPvzGame() {
  if (!window.pvzGame) {
    try {
      window.pvzGame = new Game();
      console.log('PvZ Dark Horror Game Engine initialized successfully.');
    } catch (err) {
      console.error('PvZ Game initialization error:', err);
    }
  }
}

if (document.readyState === 'loading') {
  window.addEventListener('DOMContentLoaded', initPvzGame);
} else {
  initPvzGame();
}

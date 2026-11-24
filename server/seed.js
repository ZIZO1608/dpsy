// Starting catalog: real listings and prices seen on dpsy.com (Nov 2026).
// Replaced/extended later through Admin → Import. Price 0 = "call for price".
// [id, name, category, series, price, oldPrice, imageFile, attrs]
const L = (sz, extra) => Object.assign({ size: sz }, extra || {});
const rows = [
  // Laptops
  [1672, 'ASUS ROG STRIX G16 G614FM-WS94', 'lap', 'Gaming', 1640, 1783, '850828561.png', L(16, { cpu: 'AMD Ryzen 9 9955HX', gpu: 'RTX 5060 8GB', ram: '16GB DDR5', storage: '1TB SSD', refresh: 165, res: 'FHD+ 1920×1200' })],
  [1563, 'ASUS ROG STRIX G615JPR-S5137', 'lap', 'Gaming', 2550, 0, '669984808.png', L(16)],
  [1562, 'ASUS ROG STRIX G16 G614FR-S5232', 'lap', 'Gaming', 2600, 0, '423167954.png', L(16)],
  [1658, 'ASUS ROG STRIX G16 G615LP-RV079', 'lap', 'Gaming', 2370, 0, '799515449.png', L(16)],
  [1616, 'ASUS ROG STRIX G16 G615LM-RV082', 'lap', 'Gaming', 1785, 0, '240857074.png', L(16)],
  [1617, 'ASUS ROG STRIX G16 G615LM-RV172', 'lap', 'Gaming', 2425, 0, '796952759.png', L(16)],
  [1619, 'ASUS ROG STRIX G16 G615LP-S5115', 'lap', 'Gaming', 2485, 0, '176557094.png', L(16)],
  [1589, 'ASUS ROG STRIX G16 G615JMR-AS74', 'lap', 'Gaming', 1715, 0, '238451268.png', L(16)],
  [1569, 'ASUS ROG STRIX G615JMR-S5054', 'lap', 'Gaming', 2075, 0, '622669214.png', L(16)],
  [1576, 'ASUS ROG STRIX G18 (2025) G815LW-S9192', 'lap', 'Gaming', 3070, 0, '412866932.png', L(18)],
  [1574, 'ASUS ROG Zephyrus G16 (2025) GU605CR-QR233W', 'lap', 'Gaming', 3225, 0, '612847565.png', L(16, { panel: 'OLED' })],
  [1671, 'ASUS TUF Gaming A18 FA808UM-IS74', 'lap', 'Gaming', 1510, 0, '257521554.png', L(18)],
  [1677, 'ASUS TUF Gaming A15 FA506NCG-HN339US', 'lap', 'Gaming', 860, 0, '239918701.jpg', L(15.6)],
  [1568, 'ASUS TUF Gaming A15 FA506NCG-HN185', 'lap', 'Gaming', 930, 0, '854598328.jpg', L(15.6)],
  [1676, 'ASUS TUF 16 FX610JH-TU123', 'lap', 'Gaming', 1405, 0, '214490667.png', L(16)],
  [1615, 'ASUS TUF Gaming A16 FA608UHI-R7165W', 'lap', 'Gaming', 1280, 0, '205251810.png', L(16)],
  [1673, 'ASUS VivoBook 15 F1504MA-WB51', 'lap', 'VivoBook', 530, 0, '915759356.png', L(15.6)],
  [1614, 'ASUS VivoBook 15 X1502VA-BQ903W', 'lap', 'VivoBook', 570, 0, '727806387.png', L(15.6)],
  [1608, 'ASUS VivoBook GO 15 E1504FA-BQ2876', 'lap', 'VivoBook', 460, 0, '124151791.png', L(15.6)],
  [1609, 'ASUS VivoBook GO 15 E1504FA-BQ085W', 'lap', 'VivoBook', 510, 0, '919570786.png', L(15.6)],
  [1585, 'ASUS VivoBook 16 F1605VA-WS96', 'lap', 'VivoBook', 915, 0, '460139916.png', L(16)],
  [1463, 'ASUS VivoBook 15 X1504VA-BQ4173', 'lap', 'VivoBook', 615, 683, '421995039.png', L(15.6)],
  [1451, 'ASUS VivoBook 16 F1605VA-WS74', 'lap', 'VivoBook', 700, 737, '683694331.png', L(16)],
  [1131, 'ASUS VivoBook 15 X1504VA-NJ2920', 'lap', 'VivoBook', 555, 0, '825290168.jpg', L(15.6)],
  [1512, 'ASUS Vivobook 16 Flip TP3607SH-RJ021', 'lap', 'VivoBook Flip', 1320, 0, '980904692.jpg', L(16, { panel: 'Touch, 2-in-1' })],
  [1278, 'ASUS Vivobook 14 Flip TP3407SA-SG161W', 'lap', 'VivoBook Flip', 1060, 0, '380706614.png', L(14, { panel: 'Touch, 2-in-1' })],
  [1279, 'ASUS Vivobook 14 Flip TP3407SA-SG148W', 'lap', 'VivoBook Flip', 940, 0, '286887954.png', L(14, { panel: 'Touch, 2-in-1' })],
  [1360, 'ASUS ZenBook 14 OLED UX3405CA-SU889W', 'lap', 'ZenBook', 1430, 0, '380000213.jpg', L(14, { panel: 'OLED' })],
  [1578, 'ASUS VivoBook S16 S3607AA-SH015W', 'lap', 'Vivobook OLED', 1160, 1221, '477411845.png', L(16)],
  [1447, 'ASUS Vivobook S15 S5507QA-MA007W', 'lap', 'Vivobook OLED', 795, 0, '624649792.png', L(15.6)],
  [1448, 'ASUS Vivobook S15 D5506WA-MA055WS', 'lap', 'Vivobook OLED', 1300, 0, '852123920.png', L(15.6)],
  [1449, 'ASUS VivoBook S 14 K5406SA-PP075W', 'lap', 'Vivobook OLED', 998, 0, '509486993.png', L(14)],
  [1583, 'ASUS ExpertBook B3 B3402FVA-I516512B7D', 'lap', 'ExpertBook', 770, 0, '742839279.png', L(14)],
  [1499, 'ASUS ExpertBook B1 B1503CVA-S77757', 'lap', 'ExpertBook', 675, 0, '817266098.png', L(15.6)],
  // Graphics cards
  [1336, 'ASUS PRIME-RTX5060TI-O8G', 'gpu', 'PRIME', 630, 900, '171946596.png', { chip: 'NVIDIA', model: 'RTX 5060 Ti', vram: 8 }],
  [1295, 'ASUS DUAL-RTX5060TI-O8G', 'gpu', 'DUAL', 600, 0, '561753775.png', { chip: 'NVIDIA', model: 'RTX 5060 Ti', vram: 8 }],
  [1266, 'ASUS DUAL-RTX5060TI-O16G', 'gpu', 'DUAL', 900, 1286, '223850763.png', { chip: 'NVIDIA', model: 'RTX 5060 Ti', vram: 16 }],
  [1283, 'ASUS DUAL-RTX5060-O8G', 'gpu', 'DUAL', 580, 773, '527524353.png', { chip: 'NVIDIA', model: 'RTX 5060', vram: 8 }],
  [1655, 'ASUS DUAL-RTX5060-O8G-A', 'gpu', 'DUAL', 590, 0, '676901512.png', { chip: 'NVIDIA', model: 'RTX 5060', vram: 8 }],
  [1337, 'ASUS PRIME-RTX5060-O8G', 'gpu', 'PRIME', 595, 0, '790132169.png', { chip: 'NVIDIA', model: 'RTX 5060', vram: 8 }],
  [1332, 'ASUS DUAL-RTX5070-O12G', 'gpu', 'DUAL', 1100, 0, '130188661.png', { chip: 'NVIDIA', model: 'RTX 5070', vram: 12 }],
  [1202, 'ASUS PRIME-RTX5070-O12G', 'gpu', 'PRIME', 1220, 0, '842144472.png', { chip: 'NVIDIA', model: 'RTX 5070', vram: 12 }],
  [1335, 'ASUS PRIME-RTX5070TI-O16G', 'gpu', 'PRIME', 1625, 0, '820555828.png', { chip: 'NVIDIA', model: 'RTX 5070 Ti', vram: 16 }],
  [1134, 'ASUS TUF-RTX5090-O32G-GAMING', 'gpu', 'TUF', 9170, 0, '636029793.png', { chip: 'NVIDIA', model: 'RTX 5090', vram: 32 }],
  [1300, 'ASUS ROG-ASTRAL-RTX5090-O32G-GAMING', 'gpu', 'ROG', 9925, 0, '484053869.png', { chip: 'NVIDIA', model: 'RTX 5090', vram: 32 }],
  [934, 'ASUS DUAL-RTX3050-O6G', 'gpu', 'DUAL', 355, 0, '957009916.jpg', { chip: 'NVIDIA', model: 'RTX 3050', vram: 6 }],
  [860, 'ASUS DUAL-RTX3060-O12G-V2', 'gpu', 'DUAL', 490, 0, '844840846.jpg', { chip: 'NVIDIA', model: 'RTX 3060', vram: 12 }],
  [1595, 'ASUS PRIME Radeon RX 9070 XT 16GB', 'gpu', 'PRIME', 1220, 0, '678531011.png', { chip: 'AMD', model: 'RX 9070 XT', vram: 16 }],
  [1591, 'ASUS Dual Radeon RX 9060 XT 16GB', 'gpu', 'DUAL', 610, 642, '307629945.png', { chip: 'AMD', model: 'RX 9060 XT', vram: 16 }],
  // Monitors
  [1686, 'ASUS VA27UQSB', 'mon', 'Office', 370, 0, '485585670.png', { size: 27, res: '4K' }],
  [1685, 'ASUS ProArt PA329CRV', 'mon', 'ProArt', 770, 0, '968441712.png', { size: 32, res: '4K' }],
  [1684, 'ASUS ProArt PA279CV', 'mon', 'ProArt', 560, 0, '392113576.png', { size: 27, res: '4K' }],
  [1675, 'ASUS ProArt PA278CFRV', 'mon', 'ProArt', 410, 0, '107842759.png', { size: 27, res: 'QHD' }],
  [1683, 'ASUS ROG STRIX XG27ACMES', 'mon', 'Gaming', 345, 0, '548709484.png', { size: 27, res: 'QHD' }],
  [1681, 'ASUS TUF Gaming VG27AQML1A-W', 'mon', 'Gaming', 420, 0, '740230136.png', { size: 27, res: 'QHD' }],
  [1680, 'ASUS TUF Gaming VG279QM5A-J', 'mon', 'Gaming', 215, 0, '379587344.png', { size: 27, res: 'FHD' }],
  [1678, 'ASUS VA27DQSB', 'mon', 'Office', 210, 0, '132220035.png', { size: 27, res: 'FHD' }],
  // Motherboards
  [1660, 'ASUS TUF GAMING B850M-PLUS II', 'mb', 'TUF', 203, 0, '752302382.png', { socket: 'AM5', mem: 'DDR5' }],
  [1567, 'ASUS PRIME B850M-K', 'mb', 'PRIME', 125, 0, '858448732.png', { socket: 'AM5', mem: 'DDR5' }],
  [1596, 'ASUS PRIME B850M-F', 'mb', 'PRIME', 135, 0, '155191531.png', { socket: 'AM5', mem: 'DDR5' }],
  [1582, 'ASUS PRIME X870-P', 'mb', 'PRIME', 229, 241, '646178288.png', { socket: 'AM5', mem: 'DDR5' }],
  [1592, 'ASUS PRIME A620AM-K', 'mb', 'PRIME', 94, 0, '489012800.png', { socket: 'AM5', mem: 'DDR5' }],
  [1549, 'ASUS ProArt B650-CREATOR', 'mb', 'ProArt', 312, 0, '557942840.png', { socket: 'AM5', mem: 'DDR5' }],
  [1659, 'ASUS PRIME B550M-A/CSM', 'mb', 'PRIME', 114, 0, '267229168.png', { socket: 'AM4', mem: 'DDR4' }],
  [1653, 'ASUS TUF GAMING B860M-PLUS', 'mb', 'TUF', 213, 0, '191397615.png', { socket: 'LGA1851', mem: 'DDR5' }],
  [1606, 'ASUS PRIME B860-PLUS WIFI', 'mb', 'PRIME', 161, 0, '676795983.png', { socket: 'LGA1851', mem: 'DDR5' }],
  [1593, 'ASUS PRIME B860M-K', 'mb', 'PRIME', 120, 0, '204457593.png', { socket: 'LGA1851', mem: 'DDR5' }],
  [1605, 'ASUS PRIME Z890M-PLUS WIFI', 'mb', 'PRIME', 208, 245, '474548598.png', { socket: 'LGA1851', mem: 'DDR5' }],
  [1594, 'ASUS PRIME H810M-A WIFI', 'mb', 'PRIME', 114, 0, '699593938.png', { socket: 'LGA1851', mem: 'DDR5' }],
  [1581, 'ASUS PRIME H810M-K', 'mb', 'PRIME', 101, 0, '923887978.png', { socket: 'LGA1851', mem: 'DDR5' }],
  [1572, 'ASUS PRIME Z790-P', 'mb', 'PRIME', 192, 202, '637504783.png', { socket: 'LGA1700', mem: 'DDR5' }],
  [1598, 'ASUS PRIME H610M-K D4 ARGB', 'mb', 'PRIME', 75, 79, '327072671.png', { socket: 'LGA1700', mem: 'DDR4' }],
  // CPUs
  [830, 'Intel Core i5 12400F Tray', 'cpu', 'Intel', 126, 140, '564621281.jpg', { socket: 'LGA1700', cores: 6 }],
  [831, 'Intel Core i3 12100F Tray', 'cpu', 'Intel', 100, 133, '831108643.jpg', { socket: 'LGA1700', cores: 4 }],
  // Memory
  [1069, 'Lexar ARES 32GB Kit (16GBx2) DDR5 6800 MHz CL34', 'ram', 'Lexar', 0, 0, '227516578.jpg', { mem: 'DDR5', capacity: 32 }],
  [1687, 'Lexar Thor 2nd Gen 8GB DDR5 6000MHz CL38', 'ram', 'Lexar', 0, 0, '121458168.png', { mem: 'DDR5', capacity: 8 }],
  // Accessories
  [1674, 'ROG Harpe Ace Aim Lab Edition', 'acc', 'ROG', 110, 0, '775391870.png', { type: 'Wireless gaming mouse' }],
];
const SPECS_1672 = {
  Processor: 'AMD Ryzen 9 9955HX · 2.5–5.4GHz · 16C/32T · 80MB cache', Graphics: 'NVIDIA GeForce RTX 5060 8GB GDDR7',
  Memory: '16GB DDR5 5600MHz', Storage: '1TB M.2 NVMe PCIe 4.0', Screen: '16.0" FHD+ 1920×1200', Refresh: '165Hz',
  Camera: '2.0MP', Audio: 'Dolby Atmos · Hi-Res · AI noise-cancel', Wireless: 'Wi-Fi 6E · Bluetooth 5.2',
  Ports: '2× USB4 Type-C (DP, G-SYNC) · 2× USB-A 10Gbps · HDMI 2.1 · RJ45 · 3.5mm', Keyboard: 'RGB 4-zone chiclet', Battery: '90Wh 4-cell', Adapter: '280W'
};
const GALLERY_1672 = ['850828561.png', '436850061.png', '348379409.png', '587426387.png', '273480410.png', '743996957.png'];
module.exports = rows.map(([id, name, cat, series, price, old, img, attrs]) => ({
  id, name, cat, series, price, old_price: old, image: img, attrs,
  specs: id === 1672 ? SPECS_1672 : {}, gallery: id === 1672 ? GALLERY_1672 : [img],
  stock: price ? (id === 1595 ? 'out' : 'in') : 'call'
}));

// Command definitions for Phomemo D30 and M-Series
// Based on analysis of polskafan_d30 and knightro63_phomemo

export const CONSTANTS = {
  PACKET_SIZE: 128,
  D30_MAX_WIDTH: 384, // 48mm * 8 dots
};

// The "sniffed" initialization sequence for D30 (from polskafan)
export const D30_INIT_SEQUENCE = [
  "1f1138",
  "1f11121f1113",
  "1f1109",
  "1f1111",
  "1f1119",
  "1f1107",
  "1f110a1f110202",
];

// Header for M-Series (M110/M120/M220)
// ESC @, ESC a <justification>, etc.
export const M_SERIES_INIT = {
  RESET: [0x1b, 0x40], // ESC @
  ENABLE_TRANSPARENT: [0x1f, 0x11, 0x02, 0x04],
};

export const COMMANDS = {
  RESET: [0x1b, 0x40],
  PRINT_IMAGE: [0x1d, 0x76, 0x30, 0x00], // GS v 0 0
  FEED_AND_CUT: [0x1b, 0x64, 0x02],
  END_SESSION_D30: [0x1b, 0x64, 0x00],
};

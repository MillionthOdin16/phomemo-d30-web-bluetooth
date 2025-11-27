import { CONSTANTS, D30_INIT_SEQUENCE, COMMANDS } from './commands';

/**
 * Driver class for Phomemo Printers.
 * Primarily targets D30 but structure allows expansion.
 */
export class PhomemoDriver {
  constructor() {
    this.device = null;
    this.server = null;
    this.service = null;
    this.characteristic = null;
    this.isConnected = false;
    this.printerType = 'D30'; // Default
  }

  /**
   * Request a Bluetooth device and connect to it.
   */
  async connect() {
    if (!navigator.bluetooth) {
      throw new Error('Web Bluetooth is not supported in this browser.');
    }

    try {
      this.device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["0000ff00-0000-1000-8000-00805f9b34fb"],
      });

      this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));

      this.server = await this.device.gatt.connect();
      this.service = await this.server.getPrimaryService("0000ff00-0000-1000-8000-00805f9b34fb");
      this.characteristic = await this.service.getCharacteristic("0000ff02-0000-1000-8000-00805f9b34fb");

      this.isConnected = true;
      console.log(`Connected to ${this.device.name}`);
      return this.device.name;
    } catch (error) {
      console.error('Connection failed', error);
      this.isConnected = false;
      throw error;
    }
  }

  onDisconnected() {
    console.log('Device disconnected');
    this.isConnected = false;
    // Dispatch event or callback could go here
  }

  async disconnect() {
    if (this.device && this.device.gatt.connected) {
      this.device.gatt.disconnect();
    }
  }

  /**
   * Send the specific D30 init sequence.
   */
  async sendD30Init() {
    if (!this.isConnected) throw new Error("Not connected");

    console.log("Sending D30 Init Sequence...");
    for (const hexStr of D30_INIT_SEQUENCE) {
      const data = this.hexStringToUint8Array(hexStr);
      await this.write(data);
    }
  }

  /**
   * Convert hex string to Uint8Array
   */
  hexStringToUint8Array(hexString) {
    if (hexString.length % 2 !== 0) {
      throw new Error("Invalid hex string");
    }
    const arrayBuffer = new Uint8Array(hexString.length / 2);
    for (let i = 0; i < hexString.length; i += 2) {
      const byteValue = parseInt(hexString.substr(i, 2), 16);
      arrayBuffer[i / 2] = byteValue;
    }
    return arrayBuffer;
  }

  /**
   * Write data to the characteristic.
   */
  async write(data) {
    if (!this.characteristic) throw new Error("No characteristic available");
    // Some browsers/devices need chunks, but let's try direct first or use the packet size logic
    // Phomemo D30 prefers 128 byte chunks

    for (let i = 0; i < data.length; i += CONSTANTS.PACKET_SIZE) {
        const chunk = data.slice(i, i + CONSTANTS.PACKET_SIZE);
        await this.characteristic.writeValueWithResponse(chunk);
    }
  }

  /**
   * Print an image (Uint8Array of bytes packed for 1-bit monochrome).
   * @param {Uint8Array} pixelData - The packed pixel data
   * @param {number} width - Width in pixels (should be multiple of 8)
   */
  async printImage(pixelData, width) {
    if (!this.isConnected) throw new Error("Not connected");

    // 1. Send Init
    await this.sendD30Init();

    // 2. Prepare Header
    // 1D 76 30 00 xL xH yL yH
    // xL = width / 8
    const widthBytes = width / 8;
    const height = pixelData.length / widthBytes;

    // Header for image data:
    // 1B 40 (Reset)
    // 1D 76 30 00 (GS v 0)
    // w%256, w/256 (width in bytes)
    // h%256, h/256 (height in lines)

    // Note: polskafan uses a slightly different "header" for image:
    // '1f1124001b401d7630000c004001' which contains the GS v 0 command
    // broken down:
    // 1f 11 24 00
    // 1b 40 (reset)
    // 1d 76 30 00 (GS v 0 0)
    // 0c 00 (width 12 bytes? 12*8 = 96 dots? No D30 is wider)
    // 40 01 (height 320?)

    // Let's construct the standard GS v 0 header dynamically
    const header = new Uint8Array([
        0x1b, 0x40, // ESC @
        0x1d, 0x76, 0x30, 0x00, // GS v 0 0
        widthBytes % 256, Math.floor(widthBytes / 256), // xL, xH
        height % 256, Math.floor(height / 256) // yL, yH
    ]);

    await this.write(header);

    // 3. Send Image Data
    await this.write(pixelData);

    // 4. End / Feed
    await this.write(new Uint8Array(COMMANDS.END_SESSION_D30));
  }
}

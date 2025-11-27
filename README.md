# Phomemo Web Bluetooth - Advanced Label Printer Interface

A comprehensive web interface for Phomemo Bluetooth label printers. Print text, barcodes, images, and QR codes directly from your browser using Web Bluetooth.

## Demo

[A live demo is available here.](https://odensc.github.io/phomemo-d30-web-bluetooth/) Please use a Web Bluetooth-compatible browser (e.g. Chromium-based).

## Supported Printers

This interface supports multiple Phomemo printer models:

| Model | Type | Max Width | Features |
|-------|------|-----------|----------|
| D30 | Label | 96px (12mm) | Basic printing |
| D35 | Label | 96px (15mm) | Basic printing |
| P12 Pro | Label | 96px (12mm) | Basic printing |
| M02/M02S | Receipt | 384px (48mm) | Justification, density |
| M110 | Label | 344px (43mm) | Speed, density, label types |
| M120 | Label | 344px (43mm) | Speed, density, label types |
| M220 | Label | 576px (72mm) | Speed, density, label types |
| T02 | Receipt | 384px (48mm) | Notifications |
| Q30 | Label | 96px (12mm) | Basic printing |

## Features

### Content Types
- **Text Labels**: Custom fonts, sizes, alignment, bold/italic styles, multi-line support
- **Barcodes**: CODE128, CODE39, EAN-13, EAN-8, UPC, ITF-14, MSI, Pharmacode
- **Images**: Upload any image with automatic dithering for thermal printing
- **QR Codes**: Generate QR codes with adjustable error correction levels

### Dithering Algorithms
For optimal image quality on thermal printers, multiple dithering algorithms are available:
- **Floyd-Steinberg** (default) - Classic error-diffusion dithering
- **Atkinson** - Lighter dithering, excellent for text and line art
- **Ordered Bayer** - Pattern-based, creates a crosshatch effect
- **Jarvis-Judice-Ninke** - High quality, smoother gradients
- **Stucki** - Sharp, detailed results
- **Sierra-2** - Good balance of speed and quality
- **Burkes** - Similar to Floyd-Steinberg with different weights
- **Random** - Noise-based dithering
- **Simple Threshold** - Basic black/white conversion

### Printer Settings (M-Series)
- **Print Density**: 8 levels from Lowest to Darkest
- **Print Speed**: 5 levels from Slowest to Fastest
- **Label Type**: Gaps, Continuous, or Marks

### Additional Features
- **Canvas Drawing Tools**: Draw custom labels with pen, shapes, undo/redo
- **Template System**: Save, load, export/import label templates
- **Print History**: Track recent prints with success/failure status
- **Printer Status Monitoring**: Real-time battery, paper, and cover status
- **Keyboard Shortcuts**: Ctrl+P (print), Ctrl+S (save), Ctrl+Z/Y (undo/redo)
- Persistent Bluetooth connection
- Multiple copies with spacing control
- Label size presets (Standard, Long, Square, Fruit)
- Custom label dimensions
- Image inversion
- Download preview as PNG
- Real-time preview
- Progress indicator during printing
- Dark mode support
- LocalStorage for settings persistence

## Usage

1. Open the web interface in a Web Bluetooth-compatible browser
2. Click "Connect Printer" and select your Phomemo device
3. Choose content type (Text, Barcode, Image, QR Code, or Draw)
4. Configure settings as needed
5. Click "Print Label"

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| Ctrl+P | Print current label |
| Ctrl+S | Save as template |
| Ctrl+Z | Undo (Draw mode) |
| Ctrl+Y | Redo (Draw mode) |

## Technical Details

### Communication Protocol
This project implements the ESC/POS protocol used by Phomemo printers, based on reverse-engineering efforts from multiple open-source projects:

- Image data is sent as raster bit images using the `GS v 0` command
- Images are rotated 90° for vertical printing (D-type printers)
- Data is sent in 128-byte packets for reliability
- The 0x0A byte (line feed) is escaped to prevent protocol conflicts

### Browser Requirements
- Chrome 56+ (Windows, macOS, Linux, Android)
- Edge 79+
- Opera 43+
- Chrome for Android 56+

Note: Web Bluetooth is not supported in Firefox or Safari.

## Credits

This project builds upon excellent open-source work from the community:

- [Knightro63/phomemo](https://github.com/Knightro63/phomemo) - Multi-printer support and Flutter implementation
- [vivier/phomemo-tools](https://github.com/vivier/phomemo-tools) - Protocol documentation and CUPS drivers
- [theacodes/phomemo_m02s](https://github.com/theacodes/phomemo_m02s) - M02S protocol and status queries
- [polskafan/phomemo_d30](https://github.com/polskafan/phomemo_d30) - D30 protocol and image generation
- [crabdancing/phomemo-d30](https://github.com/crabdancing/phomemo-d30) - Rust implementation
- [SaschaLucius/node-phomemo-printer](https://github.com/SaschaLucius/node-phomemo-printer) - Dithering algorithms
- [yaddran/thermal-print](https://github.com/yaddran/thermal-print) - Q30 web interface
- [jeffrafter/phomemo](https://github.com/jeffrafter/phomemo) - T02 Swift implementation
- [RobinNaumann/easy_thermal_print](https://github.com/RobinNaumann/easy_thermal_print) - Flutter printing
- [PMCSilva/phomemo_PM-241-BT](https://github.com/PMCSilva/phomemo_PM-241-BT) - PM-241-BT Python scripts
- [WebBluetoothCG/demos](https://github.com/WebBluetoothCG/demos) - Web Bluetooth examples

## License

This project is licensed under the GNU General Public License v3.0 - see the LICENSE file for details.

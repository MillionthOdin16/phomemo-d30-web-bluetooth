# Phomemo D30 Web Bluetooth

Proof of concept and demo of printing to a [Phomemo D30](https://www.amazon.com/dp/B08HV3MPFD) Bluetooth label maker via the browser using Web Bluetooth.

## Demo

[A demo is available here.](https://odensc.github.io/phomemo-d30-web-bluetooth/) Please use a Web Bluetooth-compatible browser (e.g. Chromium-based).

## Features

- **Text Labels**: Print custom text with adjustable font size
- **Barcodes**: Generate and print CODE128 barcodes
- **Images**: Print images from your device
- **QR Codes**: Generate and print QR codes
- **Filament Labels**: Create labels for 3D printer filament spools with brand, material, color, and temperature settings

## Filament Labels

The Filament Label feature allows you to quickly create and print labels for your 3D printer filament spools. You can:

1. **Manual Entry**: Fill in the filament details (brand, material, color, temperatures) manually
2. **Bookmarklet**: Use the provided bookmarklet to extract filament data from [3dfilamentprofiles.com](https://3dfilamentprofiles.com) and auto-fill the form

### Using the Bookmarklet

1. Navigate to the Filament Label tab in the app
2. Drag the "📋 Print Filament Label" bookmarklet to your bookmarks bar
3. Visit a filament page on [3dfilamentprofiles.com](https://3dfilamentprofiles.com)
4. Click the bookmarklet - it will extract the filament information and open the label printer with the form pre-filled
5. Choose your preferred label template (Compact, Detailed, or Minimal)
6. Click "Connect & print" to print the label

### URL Parameters

You can also pass filament data directly via URL parameters:

```
https://odensc.github.io/phomemo-d30-web-bluetooth/?filament={"brand":"Hatchbox","material":"PLA","color":"Black","nozzleTemp":"200-220","bedTemp":"60"}
```

## Credits

Inspiration for the data structure / image conversion was taken from some other great open-source projects. Thanks to:

- https://github.com/WebBluetoothCG/demos
- https://github.com/Knightro63/phomemo

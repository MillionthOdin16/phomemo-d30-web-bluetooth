// Factory for creating new layers
export const LayerFactory = {
    createText: () => ({
        id: Date.now().toString(),
        type: 'text',
        content: 'Double Click to Edit',
        x: 10,
        y: 10,
        fontSize: 30,
        fontFamily: 'Arial',
        align: 'left',
        rotation: 0,
        width: 200, // Bound width
    }),

    createImage: (dataUrl) => ({
        id: Date.now().toString(),
        type: 'image',
        src: dataUrl,
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        threshold: 128
    }),

    createBarcode: (data = '123456', format = 'qr') => ({
        id: Date.now().toString(),
        type: 'barcode',
        format, // 'qr' or 'code128'
        content: data,
        x: 10,
        y: 10,
        width: format === 'qr' ? 80 : 150,
        height: 80,
        rotation: 0
    })
};

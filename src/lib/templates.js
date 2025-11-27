import { LayerFactory } from './layers/factory';

export const TEMPLATES = [
    {
        id: 'address',
        name: 'Address Label',
        canvasSize: { width: 320, height: 120 },
        layers: [
            { ...LayerFactory.createText(), id: 't1', content: 'John Doe', x: 20, y: 20, fontSize: 30, width: 200 },
            { ...LayerFactory.createText(), id: 't2', content: '123 Tech Street', x: 20, y: 60, fontSize: 24, width: 250 },
            { ...LayerFactory.createText(), id: 't3', content: 'Silicon Valley, CA', x: 20, y: 90, fontSize: 24, width: 250 },
        ]
    },
    {
        id: 'cable',
        name: 'Cable Tag (Flag)',
        canvasSize: { width: 384, height: 96 },
        layers: [
            { ...LayerFactory.createText(), id: 'c1', content: 'CAT6 - A01', x: 50, y: 35, fontSize: 40, width: 200 },
            { ...LayerFactory.createBarcode('A01', 'qr'), id: 'c2', x: 280, y: 8, width: 80, height: 80 },
        ]
    },
    {
        id: 'price',
        name: 'Price Tag',
        canvasSize: { width: 200, height: 150 },
        layers: [
            { ...LayerFactory.createText(), id: 'p1', content: 'Special Offer', x: 40, y: 20, fontSize: 20 },
            { ...LayerFactory.createText(), id: 'p2', content: '$99.99', x: 20, y: 60, fontSize: 60, width: 180 },
            { ...LayerFactory.createBarcode('9999', 'code128'), id: 'p3', x: 30, y: 110, width: 140, height: 30 },
        ]
    }
];

// Mirrors the seeded catalog, plus the current out-of-stock lamp and an inactive
// product, so availability rules can be tested without touching the database.
export const CATALOG = [
  { id: 1, name: 'Wireless Mouse', description: 'Quiet wireless mouse with adjustable sensitivity and USB receiver.', category: 'Accessories', price: 650, stock: 10, active: true },
  { id: 2, name: 'Compact Mechanical Keyboard', description: 'Hot-swappable compact keyboard with tactile switches.', category: 'Accessories', price: 1850, stock: 7, active: true },
  { id: 3, name: 'USB-C Study Lamp', description: 'Adjustable desk lamp with three brightness levels.', category: 'Study', price: 900, stock: 0, active: true },
  { id: 4, name: '1080p Webcam', description: 'Full HD webcam with privacy cover and built-in microphone.', category: 'Video', price: 1450, stock: 4, active: true },
  { id: 5, name: 'Laptop Stand', description: 'Foldable aluminum stand for laptops up to 16 inches.', category: 'Study', price: 1200, stock: 7, active: true },
  { id: 6, name: 'USB Headset', description: 'Over-ear headset with noise-reducing boom microphone.', category: 'Audio', price: 1350, stock: 6, active: true },
  { id: 7, name: 'Gaming Keyboard', description: 'Retired RGB gaming keyboard.', category: 'Accessories', price: 1500, stock: 5, active: false }
];

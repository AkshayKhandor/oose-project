const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const path = require('path');
const fs   = require('fs');

// Where we snapshot orders between restarts
const SNAPSHOT_PATH = path.join(__dirname, '../../../.mongodb-data/orders-snapshot.json');

let mongod = null;

const connectDB = async () => {
  try {
    let mongoUri = process.env.MONGO_URI;

    if (mongoUri.includes('127.0.0.1') || mongoUri.includes('localhost')) {
      if (!mongod) {
        mongod = await MongoMemoryServer.create();
        console.log('Using In-Memory MongoDB Server');
      }
      mongoUri = mongod.getUri();
    }

    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected');

    await seedAdmin();
    await seedMenu();
    await restoreOrders();   // reload saved orders on every boot
  } catch (error) {
    console.error(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

// ── Graceful shutdown: snapshot orders to disk ───────────────────────────────
process.on('SIGINT',  () => shutdownAndSave());
process.on('SIGTERM', () => shutdownAndSave());

const shutdownAndSave = async () => {
  try {
    await snapshotOrders();
    await mongoose.disconnect();
    if (mongod) await mongod.stop();
    console.log('\n💾 Orders saved to .mongodb-data/orders-snapshot.json');
  } catch (_) {}
  process.exit(0);
};

const seedAdmin = async () => {
  // Must be required AFTER mongoose.connect
  const User = require('../models/User');

  const existing = await User.findOne({ email: 'admin@resto.com' });
  if (!existing) {
    // Let the User model's pre-save hook handle the hashing — DO NOT hash manually here
    await User.create({
      name: 'Admin User',
      email: 'admin@resto.com',
      password: 'password123',
      role: 'admin',
    });
    console.log('✅ Admin seeded: admin@resto.com / password123');
  } else {
    console.log('ℹ️  Admin user already exists');
  }
};

const seedMenu = async () => {
  const MenuItem = require('../models/MenuItem');
  const count = await MenuItem.countDocuments();
  if (count > 0) return; // already seeded

  const items = [
    // ── Soups ─────────────────────────────────────────────────────────
    {
      name: 'Foo Hot & Sour',
      description: 'Classic Pan-Asian hot & sour broth with silken tofu and broccoli — bold, tangy and deeply warming.',
      price: 320,
      category: 'Soups',
      image: '/images/foo-hot-sour-soup.png',
    },
    {
      name: 'Rich Sweet Corn',
      description: 'Velvety sweet corn soup with edamame and asparagus in a light, golden broth.',
      price: 280,
      category: 'Soups',
      image: '/images/foo-sweet-corn-soup.png',
    },
    {
      name: 'Miso Soup',
      description: 'Delicate kombu dashi broth with silken tofu and wakame seaweed. A Japanese staple.',
      price: 220,
      category: 'Soups',
      image: '/images/foo-miso-soup.png',
    },
    // ── Salads ────────────────────────────────────────────────────────
    {
      name: "'Super Foo' Salad",
      description: 'Kale, avocado, edamame, quinoa, chia seeds and goji berries tossed in yuzu miso dressing.',
      price: 490,
      category: 'Salads',
      image: '/images/foo-super-foo-salad.png',
    },
    {
      name: 'Som Tum',
      description: 'Raw green papaya salad with beans, cherry tomatoes and a tangy, spicy som tum dressing.',
      price: 390,
      category: 'Salads',
      image: '/images/foo-som-tum.png',
    },
    // ── Sushi & More ──────────────────────────────────────────────────
    {
      name: 'Foo Yam Bean Uramaki',
      description: 'Stunning blue rice rolls with yam bean tempura and creamy avocado, finished with spicy crisps.',
      price: 680,
      category: 'Sushi & More',
      image: '/images/foo-uramaki.png',
    },
    {
      name: 'Spicy Habanero Blue Rice Maki',
      description: 'Blue rice, spicy tofu, avocado, bell peppers, pickled cucumber, habanero cheese and chilli caviar.',
      price: 720,
      category: 'Sushi & More',
      image: '/images/foo-habanero-maki.png',
    },
    {
      name: 'Truffle Togarashi Black Rice Maki',
      description: 'Black rice with asparagus, avocado, cucumber and Philadelphia cheese. Earthy and indulgent.',
      price: 750,
      category: 'Sushi & More',
      image: '/images/foo-truffle-black-maki.png',
    },
    {
      name: 'Nikkei Avocado Uramaki',
      description: 'Avocado and cucumber rolls finished with aji amarillo sauce and shaved parmesan.',
      price: 650,
      category: 'Sushi & More',
      image: '/images/foo-nikkei-avocado.png',
    },
    // ── Dim Sum ───────────────────────────────────────────────────────
    {
      name: 'Lotus Root Dumpling',
      description: 'Delicate steamed parcels of lotus root, water chestnut and snow peas with house chilli sauce.',
      price: 480,
      category: 'Dim Sum',
      image: '/images/foo-dimsum.png',
    },
    {
      name: 'Spicy Tofu Dumpling',
      description: 'Steamed dumplings filled with silken tofu, Thai basil, chilli and vegetarian oyster sauce.',
      price: 450,
      category: 'Dim Sum',
      image: '/images/foo-tofu-dumpling.png',
    },
    {
      name: 'Cottage Cheese Dumpling',
      description: 'Soft cottage cheese and spinach filling in a thin steamed wrapper with chilli. Indian-Asian fusion.',
      price: 460,
      category: 'Dim Sum',
      image: '/images/foo-cottage-cheese-dumpling.png',
    },
    {
      name: 'Farm Vegetable Gyoza',
      description: 'Pan-seared Japanese gyoza stuffed with bok choy, beans and cauliflower. Crispy, juicy base.',
      price: 440,
      category: 'Dim Sum',
      image: '/images/foo-gyoza.png',
    },
    {
      name: 'Supreme Veg Bao',
      description: 'Soft steamed bao buns filled with zucchini, French beans, Thai chilli and Singapore sauce.',
      price: 420,
      category: 'Dim Sum',
      image: '/images/foo-supreme-veg-bao.png',
    },
    // ── Small Plates ──────────────────────────────────────────────────
    {
      name: 'Foo Crispy Wonton, Truffle Edamame',
      description: 'Shatteringly crisp wontons filled with truffle edamame, drizzled with dark soy and chilli oil.',
      price: 520,
      category: 'Small Plates',
      image: '/images/foo-wonton.png',
    },
    {
      name: 'Crispy Spicy Thai Lotus Root',
      description: 'Thinly sliced lotus root deep-fried to a perfect crisp with house Thai spice seasoning.',
      price: 380,
      category: 'Small Plates',
      image: '/images/foo-lotus-root-crispy.png',
    },
    {
      name: 'Rich Vegetables Spring Roll, Thai Dip',
      description: 'Golden crispy spring rolls packed with fresh vegetables, served with a tangy Thai dipping sauce.',
      price: 360,
      category: 'Small Plates',
      image: '/images/foo-spring-roll.png',
    },
    {
      name: 'Edamame with Pod, Maldon Sea Salt',
      description: 'Simply steamed edamame pods finished with flaky Maldon sea salt. Light and addictive.',
      price: 280,
      category: 'Small Plates',
      image: '/images/foo-edamame.png',
    },
    // ── Big Plates ────────────────────────────────────────────────────
    {
      name: 'Foo Yellow Curry',
      description: 'Aromatic Thai yellow coconut curry with crunchy water chestnuts, broccoli and forest mushrooms.',
      price: 680,
      category: 'Big Plates',
      image: '/images/foo-yellow-curry.png',
    },
    {
      name: 'Silken Tofu, Zucchini, Chilli Black Bean',
      description: 'Silken tofu and zucchini wok-tossed in a bold fermented chilli black bean sauce.',
      price: 620,
      category: 'Big Plates',
      image: '/images/foo-silken-tofu.png',
    },
    {
      name: 'Mapo Cottage Cheese',
      description: 'Foo\'s veg twist on Mapo Tofu — soft cottage cheese in a fiery, numbing Sichuan chilli sauce.',
      price: 640,
      category: 'Big Plates',
      image: '/images/foo-mapo-cottage.png',
    },
    {
      name: 'Assorted Mushrooms, Vegetarian Oyster Sauce',
      description: 'Seasonal mushroom medley wok-tossed in rich vegetarian oyster sauce with garlic and ginger.',
      price: 590,
      category: 'Big Plates',
      image: '/images/foo-mushrooms.png',
    },
    // ── Rice & Noodles ────────────────────────────────────────────────
    {
      name: 'Foo Blue Butter Japanese Fried Rice',
      description: 'Signature blue butterfly-pea rice wok-fried with butter, seasonal vegetables and soy.',
      price: 520,
      category: 'Rice & Noodles',
      image: '/images/foo-blue-butter-rice.png',
    },
    {
      name: 'Foo Hakka Noodles',
      description: 'Thin noodles wok-tossed with julienned vegetables, bean sprouts and Foo\'s signature sauce.',
      price: 460,
      category: 'Rice & Noodles',
      image: '/images/foo-hakka-noodles.png',
    },
    {
      name: 'Smokey Singapore Style Charcoal Noodles',
      description: 'Charcoal-tinted flat noodles with a smoky, spicy Singapore-style sauce and fresh vegetables.',
      price: 520,
      category: 'Rice & Noodles',
      image: '/images/foo-charcoal-noodles.png',
    },
    // ── Desserts ──────────────────────────────────────────────────────
    {
      name: 'Mount Foo-Ji',
      description: 'Foo\'s legendary signature — a theatrical chocolate volcano dessert platter serving 3-4 guests.',
      price: 980,
      category: 'Desserts',
      image: '/images/foo-mount-fuji.png',
    },
    {
      name: 'Textures of Chocolate, Smoked Maldon Salt Ice Cream',
      description: 'Dark chocolate in multiple forms — mousse, soil, tuile — paired with smoky salted ice cream.',
      price: 520,
      category: 'Desserts',
      image: '/images/foo-choc-textures.png',
    },
    {
      name: 'Mango Pudding',
      description: 'Silky smooth Cantonese-style mango pudding with fresh mango coulis. Light and tropical.',
      price: 380,
      category: 'Desserts',
      image: '/images/foo-mango-pudding.png',
    },
    // ── Mocktails ─────────────────────────────────────────────────────
    {
      name: 'Thai Lemonade',
      description: 'Refreshing Thai-inspired fizz with basil, kaffir lime leaf, vanilla and a hint of sweetness.',
      price: 320,
      category: 'Mocktails',
      image: '/images/foo-thai-lemonade.png',
    },
    {
      name: 'Sparkling Yuzu Mojito',
      description: 'Yuzu juice, fresh mint, lime, honey and orange wheel topped with fizz. Bright and citrusy.',
      price: 350,
      category: 'Mocktails',
      image: '/images/foo-yuzu-mojito.png',
    },
    {
      name: 'Guava Togarashi Fizz',
      description: 'Guava and lychee with coconut, kaffir lime leaf and a spicy togarashi kick. Unique and bold.',
      price: 360,
      category: 'Mocktails',
      image: '/images/foo-guava-fizz.png',
    },
    {
      name: 'Fantasy Island',
      description: 'Dreamy tropical blend of lychee, lime and orgeat syrup. Sweet, floral and effortlessly refreshing.',
      price: 320,
      category: 'Mocktails',
      image: '/images/foo-fantasy-island.png',
    },
    {
      name: 'Pineapple Ginger Mojito',
      description: 'Pineapple with in-house ginger syrup and honey — tropical meets warming spice.',
      price: 340,
      category: 'Mocktails',
      image: '/images/foo-pineapple-ginger.png',
    },
  ];

  await MenuItem.insertMany(items);
  console.log(`✅ Menu seeded: ${items.length} veg items added`);
};

module.exports = connectDB;

// ── Snapshot: save all orders to JSON on shutdown ───────────────────────────
const snapshotOrders = async () => {
  try {
    const Order = require('../models/Order');
    const orders = await Order.find({}).lean();
    if (orders.length === 0) return;
    fs.mkdirSync(path.dirname(SNAPSHOT_PATH), { recursive: true });
    fs.writeFileSync(SNAPSHOT_PATH, JSON.stringify(orders, null, 2));
    console.log(`  📦 Snapshotted ${orders.length} orders to disk`);
  } catch (e) {
    console.warn('  ⚠️  Could not snapshot orders:', e.message);
  }
};

// ── Restore: reload orders from JSON snapshot on boot ───────────────────────
const restoreOrders = async () => {
  try {
    if (!fs.existsSync(SNAPSHOT_PATH)) return;
    const Order = require('../models/Order');
    const existing = await Order.countDocuments();
    if (existing > 0) return; // already restored (shouldn't happen, but safety check)

    const raw    = fs.readFileSync(SNAPSHOT_PATH, 'utf8');
    const orders = JSON.parse(raw);
    if (!orders.length) return;

    // Re-insert preserving original _id, dates, etc.
    await Order.insertMany(orders, { ordered: false });
    console.log(`✅ Restored ${orders.length} orders from snapshot`);
  } catch (e) {
    console.warn('  ⚠️  Could not restore orders:', e.message);
  }
};

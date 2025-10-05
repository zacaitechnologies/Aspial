const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function equipmentMain() {
  console.log('Starting to seed equipment...');

  // Define the equipment to be created
  const equipment = [
    // Audio Interfaces
    {
      name: 'Focusrite Scarlett 18i20',
      type: 'Audio Interface',
      brand: 'Focusrite',
      model: 'Scarlett 18i20',
      serialNumber: 'FS-18i20-001',
      condition: 'Excellent',
      isAvailable: true
    },
    {
      name: 'Universal Audio Apollo Twin',
      type: 'Audio Interface',
      brand: 'Universal Audio',
      model: 'Apollo Twin X',
      serialNumber: 'UA-ATX-002',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'RME Babyface Pro FS',
      type: 'Audio Interface',
      brand: 'RME',
      model: 'Babyface Pro FS',
      serialNumber: 'RME-BPFS-003',
      condition: 'Excellent',
      isAvailable: true
    },

    // Microphones
    {
      name: 'Neumann U87 Ai',
      type: 'Microphone',
      brand: 'Neumann',
      model: 'U87 Ai',
      serialNumber: 'NU-U87-001',
      condition: 'Excellent',
      isAvailable: true
    },
    {
      name: 'Shure SM7B',
      type: 'Microphone',
      brand: 'Shure',
      model: 'SM7B',
      serialNumber: 'SH-SM7B-002',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'AKG C414',
      type: 'Microphone',
      brand: 'AKG',
      model: 'C414 XLS',
      serialNumber: 'AKG-C414-003',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Audio-Technica AT2020',
      type: 'Microphone',
      brand: 'Audio-Technica',
      model: 'AT2020',
      serialNumber: 'AT-AT2020-004',
      condition: 'Good',
      isAvailable: true
    },

    // Studio Monitors
    {
      name: 'Yamaha HS8',
      type: 'Studio Monitor',
      brand: 'Yamaha',
      model: 'HS8',
      serialNumber: 'YH-HS8-001',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Genelec 8040A',
      type: 'Studio Monitor',
      brand: 'Genelec',
      model: '8040A',
      serialNumber: 'GN-8040A-002',
      condition: 'Excellent',
      isAvailable: true
    },
    {
      name: 'KRK Rokit 5 G4',
      type: 'Studio Monitor',
      brand: 'KRK',
      model: 'Rokit 5 G4',
      serialNumber: 'KR-R5G4-003',
      condition: 'Good',
      isAvailable: true
    },

    // Headphones
    {
      name: 'Sennheiser HD 650',
      type: 'Headphones',
      brand: 'Sennheiser',
      model: 'HD 650',
      serialNumber: 'SH-HD650-001',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Audio-Technica ATH-M50x',
      type: 'Headphones',
      brand: 'Audio-Technica',
      model: 'ATH-M50x',
      serialNumber: 'AT-ATHM50X-002',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Beyerdynamic DT 770 Pro',
      type: 'Headphones',
      brand: 'Beyerdynamic',
      model: 'DT 770 Pro',
      serialNumber: 'BD-DT770-003',
      condition: 'Good',
      isAvailable: true
    },

    // MIDI Controllers
    {
      name: 'Akai MPK249',
      type: 'MIDI Controller',
      brand: 'Akai',
      model: 'MPK249',
      serialNumber: 'AK-MPK249-001',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Novation Launchkey 61',
      type: 'MIDI Controller',
      brand: 'Novation',
      model: 'Launchkey 61',
      serialNumber: 'NV-LK61-002',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Arturia KeyLab 49',
      type: 'MIDI Controller',
      brand: 'Arturia',
      model: 'KeyLab 49',
      serialNumber: 'AR-KL49-003',
      condition: 'Good',
      isAvailable: true
    },

    // Synthesizers
    {
      name: 'Moog Sub 37',
      type: 'Synthesizer',
      brand: 'Moog',
      model: 'Sub 37',
      serialNumber: 'MG-SUB37-001',
      condition: 'Excellent',
      isAvailable: true
    },
    {
      name: 'Korg Minilogue XD',
      type: 'Synthesizer',
      brand: 'Korg',
      model: 'Minilogue XD',
      serialNumber: 'KG-MLX-002',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Roland Juno-106',
      type: 'Synthesizer',
      brand: 'Roland',
      model: 'Juno-106',
      serialNumber: 'RL-J106-003',
      condition: 'Fair',
      isAvailable: true
    },

    // Drum Machines
    {
      name: 'Roland TR-8S',
      type: 'Drum Machine',
      brand: 'Roland',
      model: 'TR-8S',
      serialNumber: 'RL-TR8S-001',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Elektron Digitakt',
      type: 'Drum Machine',
      brand: 'Elektron',
      model: 'Digitakt',
      serialNumber: 'EK-DT-002',
      condition: 'Good',
      isAvailable: true
    },

    // Effects Processors
    {
      name: 'Eventide H9 Max',
      type: 'Effects Processor',
      brand: 'Eventide',
      model: 'H9 Max',
      serialNumber: 'EV-H9M-001',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Strymon BigSky',
      type: 'Effects Processor',
      brand: 'Strymon',
      model: 'BigSky',
      serialNumber: 'ST-BS-002',
      condition: 'Good',
      isAvailable: true
    },

    // Cables and Accessories
    {
      name: 'XLR Cable Set (10 pack)',
      type: 'Cables',
      brand: 'Mogami',
      model: 'Gold Studio',
      serialNumber: 'MG-XLR10-001',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Pop Filter',
      type: 'Accessory',
      brand: 'Stedman',
      model: 'Proscreen XL',
      serialNumber: 'ST-PSXL-001',
      condition: 'Good',
      isAvailable: true
    },
    {
      name: 'Mic Stand (Heavy Duty)',
      type: 'Accessory',
      brand: 'K&M',
      model: '210/2',
      serialNumber: 'KM-210-001',
      condition: 'Good',
      isAvailable: true
    }
  ];

  // Optional: Clear existing equipment
  await prisma.equipment.deleteMany({});
  console.log('Cleared existing equipment');

  for (const item of equipment) {
    try {
      await prisma.equipment.create({
        data: {
          name: item.name,
          type: item.type,
          brand: item.brand,
          model: item.model,
          serialNumber: item.serialNumber,
          condition: item.condition,
          isAvailable: item.isAvailable,
        },
      });
      console.log(`Created equipment: "${item.name}" (${item.brand} ${item.model}) - ${item.condition}`);
    } catch (error: any) {
      console.error(`Error creating equipment "${item.name}": ${error.message}`);
    }
  }

  const count = await prisma.equipment.count();
  console.log(`✅ Seeded ${count} equipment items successfully`);
}

equipmentMain()
  .catch((e) => {
    console.error('Error seeding equipment:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

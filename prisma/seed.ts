import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const rooms = [
  {
    id: "room-001",
    name: "Salle Innovation",
    description:
      "Salle moderne et lumineuse, idéale pour les brainstormings et réunions créatives. Équipée des dernières technologies pour faciliter la collaboration.",
    capacity: 10,
    pricePerHour: 50,
    equipments: ["projector", "whiteboard", "wifi", "video-conference", "air-conditioning"],
    imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
    images: [
      "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800",
      "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800",
    ],
  },
  {
    id: "room-002",
    name: "Salle Executive",
    description:
      "Salle de réunion premium avec une vue panoramique. Parfaite pour les réunions de direction et les présentations importantes.",
    capacity: 8,
    pricePerHour: 75,
    equipments: [
      "projector",
      "smart-tv",
      "wifi",
      "video-conference",
      "coffee-machine",
      "air-conditioning",
    ],
    imageUrl: "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800",
    images: [
      "https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800",
      "https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=800",
    ],
  },
  {
    id: "room-003",
    name: "Salle Créativité",
    description:
      "Espace coloré et inspirant pour les sessions de design thinking et les ateliers créatifs. Tables modulables et matériel de création disponible.",
    capacity: 12,
    pricePerHour: 45,
    equipments: ["whiteboard", "wifi", "projector", "post-its", "markers"],
    imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800",
    images: ["https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800"],
  },
  {
    id: "room-004",
    name: "Salle Focus",
    description:
      "Petite salle intimiste pour les réunions confidentielles ou les entretiens. Insonorisation optimale pour une concentration maximale.",
    capacity: 4,
    pricePerHour: 30,
    equipments: ["wifi", "smart-tv", "air-conditioning"],
    imageUrl: "https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800",
    images: ["https://images.unsplash.com/photo-1497366412874-3415097a27e7?w=800"],
  },
  {
    id: "room-005",
    name: "Salle Formation",
    description:
      "Grande salle équipée pour les formations et workshops. Disposition en classe possible avec tableau interactif.",
    capacity: 20,
    pricePerHour: 80,
    equipments: [
      "projector",
      "interactive-board",
      "wifi",
      "microphone",
      "air-conditioning",
      "video-conference",
    ],
    imageUrl: "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800",
    images: [
      "https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800",
      "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=800",
    ],
  },
  {
    id: "room-006",
    name: "Salle Zen",
    description:
      "Espace calme et apaisant, idéal pour les sessions de coaching ou les réunions nécessitant de la sérénité. Décoration épurée et plantes vertes.",
    capacity: 6,
    pricePerHour: 40,
    equipments: ["wifi", "whiteboard", "air-conditioning"],
    imageUrl: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800",
    images: ["https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800"],
  },
];

async function main() {
  console.log("🌱 Starting seed...");

  // Nettoyer les données existantes
  await prisma.booking.deleteMany();
  await prisma.room.deleteMany();
  console.log("🗑️  Cleared existing data");

  // Créer les salles
  for (const room of rooms) {
    await prisma.room.create({
      data: room,
    });
    console.log(`✅ Created room: ${room.name}`);
  }

  console.log("");
  console.log("🎉 Seed completed successfully!");
  console.log(`📚 Created ${rooms.length} rooms`);
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

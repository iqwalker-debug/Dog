const DOGS = [
  {
    id: 1,
    name: "Biscuit",
    breed: "Golden Retriever",
    age: 4,
    owner: "Margaret Holloway",
    photo: "https://placedog.net/400/300?id=1",
    description:
      "Biscuit is a gentle and cheerful soul who loves long walks and naptime equally. His fund covers annual vet bills and monthly grooming.",
    fund: {
      balance: 3250.00,
      currency: "GBP",
      transactions: [
        { id: 1, date: "2026-01-05", type: "deposit",    amount: 500.00,  note: "Monthly top-up" },
        { id: 2, date: "2026-01-18", type: "withdrawal", amount: 85.00,   note: "Grooming appointment" },
        { id: 3, date: "2026-02-01", type: "deposit",    amount: 500.00,  note: "Monthly top-up" },
        { id: 4, date: "2026-02-10", type: "withdrawal", amount: 210.00,  note: "Annual vaccination" },
      ],
    },
  },
  {
    id: 2,
    name: "Luna",
    breed: "Border Collie",
    age: 2,
    owner: "James Okafor",
    photo: "https://placedog.net/400/300?id=2",
    description:
      "Luna has boundless energy and an even bigger heart. Her fund primarily supports agility training classes and specialist nutrition.",
    fund: {
      balance: 1820.50,
      currency: "GBP",
      transactions: [
        { id: 1, date: "2025-12-01", type: "deposit",    amount: 750.00,  note: "Initial contribution" },
        { id: 2, date: "2026-01-07", type: "withdrawal", amount: 320.00,  note: "Agility training block" },
        { id: 3, date: "2026-01-15", type: "withdrawal", amount: 109.50,  note: "Specialist kibble" },
        { id: 4, date: "2026-02-03", type: "deposit",    amount: 500.00,  note: "Monthly top-up" },
      ],
    },
  },
  {
    id: 3,
    name: "Mango",
    breed: "Dachshund",
    age: 7,
    owner: "Priya Nair",
    photo: "https://placedog.net/400/300?id=3",
    description:
      "Mango is a dignified elder statesman of the sofa. His fund covers ongoing physiotherapy for his back and premium supplements.",
    fund: {
      balance: 5640.00,
      currency: "GBP",
      transactions: [
        { id: 1, date: "2025-11-01", type: "deposit",    amount: 2000.00, note: "Trust establishment" },
        { id: 2, date: "2025-12-04", type: "withdrawal", amount: 380.00,  note: "Physio (4 sessions)" },
        { id: 3, date: "2026-01-04", type: "withdrawal", amount: 380.00,  note: "Physio (4 sessions)" },
        { id: 4, date: "2026-01-04", type: "withdrawal", amount: 75.00,   note: "Joint supplements" },
        { id: 5, date: "2026-02-01", type: "deposit",    amount: 1000.00, note: "Quarterly contribution" },
        { id: 6, date: "2026-02-04", type: "withdrawal", amount: 380.00,  note: "Physio (4 sessions)" },
        { id: 7, date: "2026-02-04", type: "withdrawal", amount: 75.00,   note: "Joint supplements" },
      ],
    },
  },
  {
    id: 4,
    name: "Storm",
    breed: "Siberian Husky",
    age: 3,
    owner: "Elena Vasquez",
    photo: "https://placedog.net/400/300?id=4",
    description:
      "Storm is a dramatic and vocal husky who treats every walk as an expedition. Her fund covers hiking gear, daycare, and twice-yearly dental checks.",
    fund: {
      balance: 920.75,
      currency: "GBP",
      transactions: [
        { id: 1, date: "2026-01-10", type: "deposit",    amount: 400.00,  note: "Monthly top-up" },
        { id: 2, date: "2026-01-22", type: "withdrawal", amount: 185.25,  note: "Dental clean" },
        { id: 3, date: "2026-02-05", type: "deposit",    amount: 400.00,  note: "Monthly top-up" },
        { id: 4, date: "2026-02-14", type: "withdrawal", amount: 249.00,  note: "Doggy daycare (Feb)" },
      ],
    },
  },
  {
    id: 5,
    name: "Pepper",
    breed: "Jack Russell Terrier",
    age: 5,
    owner: "Tom Whitfield",
    photo: "https://placedog.net/400/300?id=5",
    description:
      "Pepper is small in stature but enormous in attitude. His fund covers insurance top-ups and the occasional emergency vet dash.",
    fund: {
      balance: 2100.00,
      currency: "GBP",
      transactions: [
        { id: 1, date: "2025-10-01", type: "deposit",    amount: 1500.00, note: "Annual allocation" },
        { id: 2, date: "2025-11-30", type: "withdrawal", amount: 450.00,  note: "Emergency vet — swallowed a sock" },
        { id: 3, date: "2026-02-01", type: "deposit",    amount: 1500.00, note: "Annual allocation" },
        { id: 4, date: "2026-02-12", type: "withdrawal", amount: 450.00,  note: "Insurance excess" },
      ],
    },
  },
];

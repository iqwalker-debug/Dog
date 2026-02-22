/* ── Services ─────────────────────────────────────────────── */
const SERVICES = [
  {
    id: "solo-walk",
    icon: "🦮",
    name: "Solo Walk",
    price: 25,
    unit: "per 30 min",
    description:
      "One-on-one time with your pup. GPS tracked, with a photo update sent after every walk.",
  },
  {
    id: "group-walk",
    icon: "🐕‍🦺",
    name: "Group Walk",
    price: 18,
    unit: "per 45 min",
    description:
      "Socialise with a small pack of up to 4 dogs. Great for confident, friendly dogs.",
  },
  {
    id: "drop-in",
    icon: "🏠",
    name: "Drop-In Visit",
    price: 20,
    unit: "per visit",
    description:
      "A 20-minute check-in for feeding, playtime, potty break, and a cuddle.",
  },
  {
    id: "daycare",
    icon: "☀️",
    name: "Doggy Daycare",
    price: 45,
    unit: "full day",
    description:
      "A full day of supervised play, enrichment, and rest at our home daycare in Austin.",
  },
  {
    id: "overnight",
    icon: "🌙",
    name: "Overnight Stay",
    price: 65,
    unit: "per night",
    description:
      "Your dog sleeps over with us. Perfect for trips — includes walks, meals, and bedtime cuddles.",
  },
  {
    id: "training-walk",
    icon: "🎓",
    name: "Training Walk",
    price: 40,
    unit: "per 45 min",
    description:
      "Leash manners and basic commands reinforced during every step of the walk.",
  },
];

/* ── Promo codes ──────────────────────────────────────────── */
const PROMOS = [
  {
    code: "FIRSTDOG",
    discount: 20,
    type: "percent",
    description: "20% off your very first booking — welcome to the pack!",
    label: "First Visit Offer",
  },
  {
    code: "AUSTIN10",
    discount: 10,
    type: "flat",
    description: "$10 off any booking. Valid for Austin residents.",
    label: "Austin Local Perk",
  },
  {
    code: "PACKWALK",
    discount: 15,
    type: "percent",
    description: "15% off group walk bookings when you refer a friend.",
    label: "Referral Reward",
  },
];

/* ── Gallery ──────────────────────────────────────────────── */
const GALLERY = [
  { src: "https://placedog.net/300/300?id=10", alt: "Happy pup on a trail" },
  { src: "https://placedog.net/300/300?id=11", alt: "Golden retriever mid-run" },
  { src: "https://placedog.net/300/300?id=12", alt: "Husky in Barton Springs" },
  { src: "https://placedog.net/300/300?id=13", alt: "Dachshund on the porch" },
  { src: "https://placedog.net/300/300?id=14", alt: "Border collie at Zilker" },
  { src: "https://placedog.net/300/300?id=15", alt: "Poodle mix in a garden" },
  { src: "https://placedog.net/300/300?id=16", alt: "Corgi group walk" },
  { src: "https://placedog.net/300/300?id=17", alt: "Lab puppy drop-in" },
  { src: "https://placedog.net/300/300?id=18", alt: "Beagle overnight stay" },
];

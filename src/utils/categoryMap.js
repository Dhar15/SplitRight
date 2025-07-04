export const CATEGORY_MAP = {
  pizza: 'food',
  burger: 'food',
  sandwich: 'food',
  fries: 'food',
  noodles: 'food',
  pasta: 'food',
  biryani: 'food',
  curry: 'food',
  dosa: 'food',
  rice: 'food',
  roti: 'food',
  thali: 'food',
  wrap: 'food',
  paneer: 'food',
  samosa: 'food',
  paratha: 'food',
  salad: 'food',
  soup: 'food',
  sub: 'food',
  kachori: 'food',
  chowmein: 'food',
  chips: 'food',
  chocolate: 'food',
  icecream: 'food',
  dessert: 'food',
  brownie: 'food',
  muffin: 'food',
  cake: 'food',
  cookie: 'food',
  gulab: 'food',
  rasgulla: 'food',
  halwa: 'food',
  laddu: 'food',
  coke: 'drinks',
  pepsi: 'drinks',
  soda: 'drinks',
  water: 'drinks',
  juice: 'drinks',
  lassi: 'drinks',
  coffee: 'drinks',
  tea: 'drinks',
  mojito: 'drinks',
  beer: 'drinks',
  whiskey: 'drinks',
  rum: 'drinks',
  wine: 'drinks',
  vodka: 'drinks',
  mocktail: 'drinks',
  milkshake: 'drinks',
  atta: 'groceries',
  dal: 'groceries',
  sugar: 'groceries',
  salt: 'groceries',
  oil: 'groceries',
  milk: 'groceries',
  egg: 'groceries',
  bread: 'groceries',
  butter: 'groceries',
  ghee: 'groceries',
  veggies: 'groceries',
  onion: 'groceries',
  tomato: 'groceries',
  garlic: 'groceries',
  ginger: 'groceries',
  uber: 'travel',
  ola: 'travel',
  flight: 'travel',
  train: 'travel',
  cab: 'travel',
  bus: 'travel',
  hotel: 'travel',
  airbnb: 'travel',
  movie: 'entertainment',
  popcorn: 'entertainment',
  netflix: 'entertainment',
  prime: 'entertainment',
  concert: 'entertainment',
  game: 'entertainment',
  bowling: 'entertainment',
  tip: 'service',
  service: 'service',
  delivery: 'service',
  gst: 'service',
  packing: 'service',
};

export const getCategoryFromName = (name = '') => {
  const lowerName = name.toLowerCase();
  const words = lowerName.split(/\s|-/);
  for (const word of words) {
    if (CATEGORY_MAP[word]) return CATEGORY_MAP[word];
  }
  return 'others';
};

export const CATEGORY_COLORS = {
  food: '#4CAF50',
  drinks: '#2196F3',
  groceries: '#FF9800',
  snacks: '#FF5722',
  dessert: '#E91E63',
  health: '#00BCD4',
  personal: '#9C27B0',
  travel: '#3F51B5',
  utilities: '#795548',
  entertainment: '#673AB7',
  service: '#009688',
  others: '#9E9E9E',
};
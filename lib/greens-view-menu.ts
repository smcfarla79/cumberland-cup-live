/** Green's View Grill — menu from printed card + info from thecourseatsewanee.com/grill */

export const GRILL_PAGE_URL = "https://thecourseatsewanee.com/grill/";

export const GRILL_INFO = {
  name: "Green's View Grill",
  tagline: "Dining with a View in Sewanee’s Rolling Hills",
  phone: "931-598-1907",
  phoneHref: "tel:9315981907",
  address: "444 Greens View Rd, Sewanee, TN 37375",
  blurb: [
    "Set against Sewanee’s rolling hills and just steps from the first tee — a relaxed, come-as-you-are spot for a well-earned bite. Simple, honest fare, done right.",
    "Double A Farm locally sourced burgers, classic hot dogs, and fresh wraps — whether you’re making the turn or settling in after your round. A full bar is ready when you are.",
  ],
  hours: [
    { days: "Tue – Thu", detail: "Lunch 11 AM – 4 PM" },
    { days: "Fri – Sun", detail: "8 AM – 6 PM" },
    { days: "Monday", detail: "Closed" },
  ],
} as const;

export type MenuItem = {
  name: string;
  price: number | string;
  description?: string;
  extras?: string;
  vegetarian?: boolean;
};

export type MenuSection = {
  id: string;
  title: string;
  /** Section-level price when all items share one (e.g. snacks). */
  priceNote?: string;
  items: MenuItem[];
  highlighted?: boolean;
};

export const GRILL_MENU: MenuSection[] = [
  {
    id: "cocktails",
    title: "Cocktails",
    priceNote: "14",
    items: [
      {
        name: "Transfusion",
        price: 14,
        description: "Vodka, ginger ale, Concord grape juice, lime juice",
      },
      {
        name: "Bloody Mary",
        price: 14,
        description: "Vodka, bloody mary mix",
      },
      {
        name: "Domain Angel",
        price: 14,
        description: "Tequila, lime juice, agave, cranberry",
      },
      {
        name: "Sewanee Sunshine",
        price: 14,
        description: "Vodka, amaretto, orange juice, soda water",
      },
      {
        name: "Caddyshack Margarita",
        price: 14,
        description: "Tequila, lime juice, orange liqueur",
      },
      {
        name: "French 75",
        price: 14,
        description: "Gin, lemon, lime, syrup, topped with champagne",
      },
      {
        name: "Shakerag Mule",
        price: 14,
        description: "Whiskey, ginger beer, lime",
      },
      {
        name: "Rum Punch",
        price: 14,
        description: "Rum, orange juice, pineapple",
      },
      {
        name: "Sewanee Tee Time",
        price: 14,
        description: "Jack Daniels, unsweet tea, lemon",
      },
      {
        name: "Iced Espresso Martini",
        price: 14,
        description: "Kahlúa, Baileys, iced coffee, whipped cream",
      },
    ],
  },
  {
    id: "breakfast",
    title: "Breakfast",
    items: [
      {
        name: "Breakfast Croissant",
        price: 8,
        description: "Choice of sausage or bacon, scrambled eggs, American",
      },
      {
        name: "Breakfast Burrito",
        price: 8,
        description: "Impossible burger or sausage, scrambled eggs, cheddar",
      },
    ],
  },
  {
    id: "handhelds",
    title: "Handhelds",
    items: [
      {
        name: "Bratwurst / Hot Dog",
        price: 7,
        description: "All-beef frank or bratwurst, choice of caramelized onions",
        extras: "Add beer cheese +2",
      },
      {
        name: "AA Farm “Miss Dessie” Burger",
        price: 12,
        description:
          "6oz local farm beef, brioche bun, lettuce, tomatoes, onions, pickles, choice of American, Swiss, pepper jack, or cheddar",
        extras: "Add bacon +1 · egg +1 · beer cheese +2",
      },
      {
        name: "AA Farm Smash Burger",
        price: 10,
        description:
          "4oz local farm beef patty, brioche bun, lettuce, tomatoes, onions, pickles, choice of American, Swiss, pepper jack, or cheddar",
        extras: "Make it a double +4 · add beer cheese +2",
      },
      {
        name: "Impossible Burger",
        price: 12,
        vegetarian: true,
        description:
          "4oz Impossible Burger patty, brioche bun, lettuce, tomatoes, onions, pickles, choice of American, Swiss, pepper jack, or cheddar",
      },
      {
        name: "Chicken Caesar Wrap",
        price: 10,
        description:
          "Chicken, romaine, parmesan, creamy Caesar, spinach & herb tortilla",
      },
      {
        name: "Chicken Wings",
        price: 6,
        description:
          "Six wings — sweet chili, buffalo, BBQ, blue cheese, or ranch",
      },
      {
        name: "Veggie Wrap",
        price: 8,
        vegetarian: true,
        description:
          "Red peppers, mushrooms, lettuce, tomato, ranch, spinach & herb tortilla",
      },
      {
        name: "Egg Salad Sandwich",
        price: 7,
        vegetarian: true,
        description: "Homemade egg salad on brioche Texas toast",
      },
      {
        name: "Sewanee Club Sandwich",
        price: 8,
        description:
          "Triple-decker turkey, ham, bacon, lettuce, tomato, mayo, rye",
      },
      {
        name: "Chicken Tender Basket",
        price: 12,
        description:
          "Tenders with honey mustard, ranch, blue cheese, or BBQ · sweet potato or regular fries",
      },
      {
        name: "Basket of Fries",
        price: 6,
        extras: "Add beer cheese +4",
      },
    ],
  },
  {
    id: "salad",
    title: "Salad",
    items: [
      {
        name: "Caesar Salad",
        price: 10,
        description: "Romaine, parmesan, creamy Caesar dressing",
        extras: "Add chicken +$3",
      },
      {
        name: "Shakerag Spring Salad",
        price: 12,
        vegetarian: true,
        description:
          "Mixed greens, feta, walnut, strawberry, poppy seed dressing",
        extras: "Add chicken +$3",
      },
    ],
  },
  {
    id: "sides",
    title: "Sides",
    items: [
      { name: "French Fries", price: 3 },
      { name: "Sweet Potato Fries", price: 4 },
      {
        name: "Pretzel Bites",
        price: 4,
        extras: "Add beer cheese +2",
      },
    ],
  },
  {
    id: "snacks",
    title: "Snacks",
    priceNote: "2",
    items: [
      {
        name: "Candy bars, nuts, chips",
        price: 2,
      },
    ],
  },
  {
    id: "desserts",
    title: "Desserts",
    priceNote: "8",
    items: [
      {
        name: "Milk Shakes",
        price: 8,
        description: "Chocolate, vanilla, or strawberry",
      },
      {
        name: "Funnel Cake Fries",
        price: 8,
        description: "With chocolate or caramel dipping sauce",
      },
    ],
  },
];

export const GRILL_DISCLAIMER =
  "Consuming raw or undercooked meats, poultry, seafood, shellfish, or eggs may increase your risk of foodborne illness, especially if you have certain medical conditions.";

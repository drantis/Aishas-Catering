// The whole menu lives in this file. Edit a dish here and both the site and the
// order API pick it up.
var AISHA_MENU = {
  // Contact details shown in the footer and in checkout messages.
  // Leave a field empty and it stays hidden on the site.
  business: {
    phone: "",
    email: "",
    area: "",
  },
  categories: ["Mains", "Starters"],
  items: [
    {
      id: "jollof-rice",
      name: "Jollof Rice",
      category: "Mains",
      blurb:
        "Long-grain rice simmered in a rich tomato and pepper base until every grain is seasoned through.",
      serves: "Serves 10–12",
      price: 48,
      image: "images/jollof.jpg",
    },
    {
      id: "pepper-chicken",
      name: "Pepper Chicken",
      category: "Mains",
      blurb: "Chicken finished in a bold, spicy pepper sauce. A natural partner for jollof.",
      serves: "Serves 8–10",
      price: 58,
      image: "images/pepper-chicken.jpg",
    },
    {
      id: "tortilla-kebab",
      name: "Tortilla Kebab Skewer",
      category: "Mains",
      blurb: "Seasoned kebab skewers, grilled and served with soft tortillas. Easy to share.",
      serves: "Serves 8–10",
      price: 54,
      image: "images/kebab.jpg",
    },
    {
      id: "jamaican-oxtail",
      name: "Jamaican Oxtail",
      category: "Mains",
      blurb: "Oxtail braised low and slow until tender, served in its own rich gravy.",
      serves: "Serves 6–8",
      price: 78,
      image: "images/oxtail.jpg",
    },
    {
      id: "akara-yaji",
      name: "Akara & Yaji",
      category: "Starters",
      blurb:
        "Crisp black-eyed pea fritters with yaji, a Nigerian pepper spice traditionally made with peanut.",
      serves: "Serves 8–10",
      price: 32,
      image: "images/akara.jpg",
    },
  ],
};

// Lets the order API read the same menu the site shows.
if (typeof module !== "undefined") module.exports = AISHA_MENU;

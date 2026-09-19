export const oceanBlue = "#1265a0";

// Fixed positions keep the quiet star field stable through map interactions.
export const mapStars = Array.from({ length: 100 }, (_, i) => ({
  x: ((i * 613 + 37) % 997),
  y: ((i * 277 + 59) % 541),
  radius: i % 9 === 0 ? 1.3 : 0.7,
  opacity: 0.3 + (i % 5) * 0.13,
}));

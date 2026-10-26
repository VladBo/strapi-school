export function renderH5PPlayer({ player, contentId, user, language = "uk" }) {
  if (!player || typeof player.render !== "function") {
    throw new TypeError("An initialized H5P player is required");
  }
  if (!user) {
    throw new TypeError("An acting H5P user is required");
  }
  return player.render(contentId, user, language);
}

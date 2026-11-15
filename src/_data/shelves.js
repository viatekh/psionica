// The shop's shelves, in display order. `match` is tested against the Section / Category
// of each row in the stock list. `note` is the line shown beside the shelf heading: edit freely.
export default [
  { name: "Esoteric and myth", match: /^esoteric|^myth|^goddess/i, note: "Magick, Discordia, goddesses and the perennial stuff." },
  { name: "Psychedelics", match: /^psychedelic/i, note: "Chemistry, history and the far side of the doors." },
  { name: "Earth mysteries", match: /^earth mysteries/i, note: "Stones, domes, leys and sacred geometry." },
  { name: "Art and visionary", match: /^art/i, note: "Visionary, fantastic and outsider art." },
  { name: "Rave and sound", match: /rave|electronic|^velocity|^masala|^sound/i, note: "Free parties, sound systems and the people who carried the rigs." },
  { name: "Cyberculture and fiction", match: /cyber|sci-fi|^fiction/i, note: "Cyberpunk, uploads and other futures." },
  { name: "Magazines and tapes", match: /^magazine|^vhs|video/i, note: "Zines, journals and video from the scene itself." },
];

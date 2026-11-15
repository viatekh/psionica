// The shop's shelves, in display order. `match` is tested against the Section / Category
// of each row in the stock list.
export default [
  { name: "Esoteric and myth", match: /^esoteric|^myth|^goddess/i },
  { name: "Psychedelics", match: /^psychedelic/i },
  { name: "Earth mysteries", match: /^earth mysteries/i },
  { name: "Art and visionary", match: /^art/i },
  { name: "Rave and sound", match: /rave|electronic|^velocity|^masala|^sound/i },
  { name: "Cyberculture and fiction", match: /cyber|sci-fi|^fiction/i },
  { name: "Magazines and tapes", match: /^magazine|^vhs|video/i },
];

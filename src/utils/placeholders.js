const build = (w, h, label, fontSize) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#EDE0D3"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${fontSize}" fill="#A89888" text-anchor="middle" dominant-baseline="middle">${label}</text></svg>`
  )}`;

export const FALLBACK_IMAGE_400 = build(400, 300, 'ZENIA', 28);
export const FALLBACK_IMAGE_100 = build(100, 100, 'Z', 34);
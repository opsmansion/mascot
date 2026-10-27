// The files each mascot ships with, grouped by platform. scripts/generate-icons.mjs writes every file
// listed here to public/icons/<slug>/, and the mascot page lists the same files as downloads.
// Each file says how it is made: a PNG of an iconSvg layout, an SVG, an ICO, or a text file.

const png = (path, size, layout, label, opaque = false, grayscale = false) => ({ path, size, label, make: { type: "png", layout, opaque, grayscale } });

const adaptiveXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@mipmap/ic_launcher_background"/>
    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>
    <monochrome android:drawable="@mipmap/ic_launcher_monochrome"/>
</adaptive-icon>
`;

const xcodeContents = `${JSON.stringify(
  {
    images: [
      { filename: "icon-1024.png", idiom: "universal", platform: "ios", size: "1024x1024" },
      { appearances: [{ appearance: "luminosity", value: "dark" }], filename: "icon-1024-dark.png", idiom: "universal", platform: "ios", size: "1024x1024" },
      { appearances: [{ appearance: "luminosity", value: "tinted" }], filename: "icon-1024-tinted.png", idiom: "universal", platform: "ios", size: "1024x1024" },
    ],
    info: { author: "xcode", version: 1 },
  },
  null,
  2,
)}
`;

const iosLegacy = [
  [180, "iPhone app, 60pt @3x"],
  [167, "iPad Pro app, 83.5pt @2x"],
  [152, "iPad app, 76pt @2x"],
  [120, "iPhone app @2x, Spotlight @3x"],
  [87, "Settings, 29pt @3x"],
  [80, "Spotlight, 40pt @2x"],
  [76, "iPad app, 76pt @1x"],
  [60, "Notification, 20pt @3x"],
  [58, "Settings, 29pt @2x"],
  [40, "Notification @2x, Spotlight @1x"],
  [29, "Settings, 29pt @1x"],
  [20, "Notification, 20pt @1x"],
];

// Android densities: [folder, legacy launcher size, adaptive layer size (108dp)].
const densities = [
  ["mdpi", 48, 108],
  ["hdpi", 72, 162],
  ["xhdpi", 96, 216],
  ["xxhdpi", 144, 324],
  ["xxxhdpi", 192, 432],
];

// macOS .iconset names: [point size, scale].
const macSizes = [16, 32, 128, 256, 512].flatMap((pt) => [
  [pt, 1],
  [pt, 2],
]);

/**
 * @param {{ slug: string, name: string, page?: string }} mascot  `page` is the site path the credit line links to.
 * @typedef {{ path: string, label: string, size?: number, make: { type: string, [key: string]: any } }} IconFile
 * @returns {{ platform: string, note: string, files: IconFile[] }[]}
 */
export function iconSets({ slug, name, page = `/${slug}` }) {
  const webManifest = `${JSON.stringify(
    {
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    null,
    2,
  )}
`;

  return [
    {
      platform: "Source",
      note: "The original vector artwork, edge to edge. Scale it to any size.",
      files: [
        { path: `${slug}.svg`, size: 1024, label: "Vector source, square", make: { type: "svg", layout: "full" } },
        png(`${slug}-1024.png`, 1024, "full", "PNG, square, 1024 px", true),
        { path: "LICENSE.txt", label: "Licence and credit line", make: { type: "text", content: licence(name, page) } },
      ],
    },
    {
      platform: "iOS and iPadOS",
      note: "Xcode 14 and later need only the single 1024 px icon: drop AppIcon.appiconset into Assets.xcassets. It also holds the iOS 18 dark and tinted versions. The other sizes are for older projects. All are square with no transparency, because iOS rounds the corners itself.",
      files: [
        png("ios/AppIcon.appiconset/icon-1024.png", 1024, "full", "App Store and Xcode, single size", true),
        png("ios/AppIcon.appiconset/icon-1024-dark.png", 1024, "dark", "iOS 18 dark mode", true),
        png("ios/AppIcon.appiconset/icon-1024-tinted.png", 1024, "dark", "iOS 18 tinted mode", true, true),
        { path: "ios/AppIcon.appiconset/Contents.json", label: "Xcode asset catalogue entry", make: { type: "text", content: xcodeContents } },
        ...iosLegacy.map(([size, label]) => png(`ios/legacy/icon-${size}.png`, size, "full", label, true)),
      ],
    },
    {
      platform: "Android",
      note: "Copy the res folder into app/src/main/. Android 8 and later build the icon from a foreground and background layer, and Android 13 and later use the monochrome layer for themed icons. Older versions use ic_launcher.png. The Play Store listing needs the 512 px icon.",
      files: [
        png("android/play-store-512.png", 512, "full", "Google Play listing", true),
        { path: "android/res/mipmap-anydpi-v26/ic_launcher.xml", label: "Adaptive icon definition", make: { type: "text", content: adaptiveXml } },
        { path: "android/res/mipmap-anydpi-v26/ic_launcher_round.xml", label: "Adaptive round icon definition", make: { type: "text", content: adaptiveXml } },
        ...densities.flatMap(([density, legacy, layer]) => [
          png(`android/res/mipmap-${density}/ic_launcher.png`, legacy, "rounded", `Launcher, ${density}`),
          png(`android/res/mipmap-${density}/ic_launcher_round.png`, legacy, "circle", `Round launcher, ${density}`),
          png(`android/res/mipmap-${density}/ic_launcher_foreground.png`, layer, "foreground", `Adaptive foreground, ${density}`),
          png(`android/res/mipmap-${density}/ic_launcher_background.png`, layer, "background", `Adaptive background, ${density}`, true),
          png(`android/res/mipmap-${density}/ic_launcher_monochrome.png`, layer, "monochrome", `Themed icon layer, ${density}`),
        ]),
      ],
    },
    {
      platform: "macOS",
      note: "Drawn on Apple's macOS grid, with margins and a shadow. Turn the folder into an .icns file with: iconutil -c icns AppIcon.iconset",
      files: macSizes.map(([pt, scale]) =>
        png(`macos/AppIcon.iconset/icon_${pt}x${pt}${scale === 2 ? "@2x" : ""}.png`, pt * scale, "macos", `${pt}pt @${scale}x`),
      ),
    },
    {
      platform: "Web",
      note: "Favicons, the iPhone home-screen icon, and PWA icons. manifest-icons.json holds the matching icons entry for a web app manifest.",
      files: [
        { path: "web/favicon.ico", label: "Favicon, 16, 32 and 48 px", make: { type: "ico", sizes: [16, 32, 48] } },
        { path: "web/icon.svg", label: "Vector favicon", make: { type: "svg", layout: "rounded" } },
        png("web/apple-touch-icon.png", 180, "full", "iPhone home screen", true),
        png("web/icon-192.png", 192, "rounded", "PWA icon"),
        png("web/icon-512.png", 512, "rounded", "PWA icon"),
        png("web/icon-maskable-512.png", 512, "full", "PWA maskable icon", true),
        { path: "web/manifest-icons.json", label: "Manifest icons entry", make: { type: "text", content: webManifest } },
      ],
    },
  ];
}

export const zipName = (slug) => `${slug}-app-icons.zip`;

export const LICENCE_NAME = "CC BY 4.0";
export const LICENCE_URL = "https://creativecommons.org/licenses/by/4.0/";

// The line people paste wherever they credit the icon.
export const creditLine = (name, page) => `App icon: "${name}" by Opesi Mansion (mascots.opesimansion.com${page}), ${LICENCE_NAME}`;

function licence(name, page) {
  return `${name} by Opesi Mansion
https://mascots.opesimansion.com${page}

Licensed under Creative Commons Attribution 4.0 International (${LICENCE_NAME}):
${LICENCE_URL}

You may use, change, and share this icon for free, including in commercial apps and products,
as long as you credit Opesi Mansion. A credit line like this is enough:

  ${creditLine(name, page)}

Put it where people can find it, such as your app's About or credits screen, your app store
description, or your website. If you change the icon, say so, for example "adapted from".
`;
}

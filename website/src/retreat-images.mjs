// Converts the photographs downloaded from anamayretreat.com into web-sized WebP files
// (assets/img/retreat) and writes src/retreat.json, the photo sets used by {{gallery:key}} and {{strip:key}}.
// usage (from the website folder): node src/retreat-images.mjs <folder with the downloaded originals>
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';

const src = process.argv[2];
const OUT = 'assets/img/retreat';
// [original file, caption] per set; captions describe what each photograph shows
const SETS = {
  stay: [
    ['retreat-01.jpeg', 'The terrace, looking out to the Himalaya'], ['retreat-02.jpeg', 'Sunrise above the clouds'],
    ['retreat-05.jpg', 'Yoga on the terrace'], ['retreat-03.jpg', 'Guests and the ashram family at a meal'],
    ['retreat-04.jpg', 'The guest house in the forest'], ['retreat-09.jpeg', 'A quiet hour on the terrace'],
    ['retreat-06.jpeg', 'Morning practice at sunrise'], ['retreat-11.jpeg', 'Carved wood in the guest house'],
    ['retreat-12.jpg', 'A puja with Ashutosh ji and the students'], ['retreat-13.jpg', 'The buildings and gardens'],
    ['retreat-10.jpeg', 'Resting on the veranda'], ['retreat-08.jpeg', 'Yoga mats on the roof terrace'],
    ['retreat-07.jpeg', 'The staircase of the guest house'], ['retreat-15.jpg', 'A sattvic meal'],
  ],
  rooms: [
    ['rooms-26.jpg', 'A room with a wide window onto the valley'], ['rooms-06.jpg', 'Double room'],
    ['rooms-13.jpg', 'The view from a room'], ['rooms-08.jpg', 'Sitting corner in a suite'],
    ['rooms-11.jpg', 'Suite with a view of the hills'], ['rooms-28.jpg', 'A loft room under the roof'],
    ['rooms-14.jpg', 'Room with a door to the balcony'], ['rooms-21.jpg', 'Kitchen corner and sitting area of a larger suite'],
    ['rooms-15.jpg', 'Room with twin beds'], ['rooms-24.jpg', 'Writing desk by the window'],
    ['rooms-16.jpg', 'Sitting room opening onto the balcony'], ['rooms-20.jpg', 'Suite with sitting area'],
    ['rooms-31.jpg', 'Room in the morning light'], ['rooms-33.jpg', 'Sofa in a larger suite'],
    ['rooms-35.jpg', 'Kitchen corner of a larger suite'], ['rooms-09.jpg', 'Armchairs by the window'],
  ],
  care: [
    ['rejuvenation-01.jpg', 'An Ayurvedic head treatment'], ['rejuvenation-02.jpg', 'A treatment with our technicians'],
    ['rejuvenation-03.jpg', 'Our therapists in a rejuvenation room'], ['rejuvenation-04.png', 'A rejuvenation room'],
    ['rejuvenation-05.png', 'The second rejuvenation room'],
  ],
  food: [['faq-01.jpeg', 'A sattvic lunch from the ashram kitchen'], ['retreat-15.jpg', 'Rice, dal, vegetables and roti']],
};

fs.mkdirSync(OUT, { recursive: true });
const json = {};
for (const [set, list] of Object.entries(SETS)) {
  json[set] = [];
  for (const [i, [file, caption]] of list.entries()) {
    const name = `${set}-${String(i + 1).padStart(2, '0')}`;
    const img = sharp(path.join(src, file)).rotate();
    const { width, height } = await img.metadata();
    await img.clone().resize({ width: Math.min(width, 1600), withoutEnlargement: true }).webp({ quality: 78 }).toFile(`${OUT}/${name}.webp`);
    const thumb = await img.clone().resize({ width: Math.min(width, 720), withoutEnlargement: true }).webp({ quality: 72 }).toFile(`${OUT}/${name}-sm.webp`);
    json[set].push({ full: `${OUT}/${name}.webp`, thumb: `${OUT}/${name}-sm.webp`, caption, w: thumb.width, h: thumb.height });
  }
}
fs.writeFileSync('src/retreat.json', JSON.stringify(json, null, 1));
console.log(Object.entries(json).map(([k, v]) => `${k}: ${v.length}`).join(', '));

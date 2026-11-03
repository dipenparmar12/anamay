// Resizes the chosen photos from the offline mirror into web-ready WebP files under assets/img.
// usage (from the website folder): node src/images.mjs
// Needs the "sharp" package: npm install sharp
import fs from 'fs'; import path from 'path'; import sharp from 'sharp';

const SRC = path.resolve('../offline-site/wp-content/uploads');
const OUT = path.resolve('assets/img');

// name: [source path under uploads, max width]
const photos = {
  'hero-moon': ['2022/03/Full_Moon-copy-edit.jpg', 2400],
  'himalaya-peaks': ['2022/03/IMG_0205-scaled.jpeg', 2400],
  'valley-clouds': ['2022/04/IMG_3772.jpg', 1800],
  'ashram-forest': ['2022/05/IMG_2705-scaled.jpg', 2000],
  'guesthouse': ['2022/05/GH-Clinik-frm-NE-scaled.jpg', 1800],
  'room-view': ['2022/05/ground-floor-w-sitting-and-view.jpg', 1400],
  'students-hillside': ['2022/03/DSC02399-copy-scaled.jpg', 2000],
  'students-group': ['2022/03/DSC02443-copy-scaled.jpg', 1600],
  'students-garden': ['2022/03/DSC02612-copy-scaled.jpg', 1600],
  'students-yellow': ['2022/03/DSC02654-copy-scaled.jpg', 1600],
  'students-orange': ['2022/03/DSC00407.jpg', 1600],
  'veda-recitation': ['2019/03/P10206821.jpg', 1200],
  'yagya': ['2019/03/DSCI0266-1024x768-1.jpg', 1200],
  'yagya-fire': ['2022/05/circa-2004.1.jpg', 1600],
  'akshaya-tritiya': ['2022/05/akshyatritya.jpg', 1400],
  'jyotish': ['2022/03/DSC01712-1024x684-1.jpg', 1200],
  'yoga-mountain': ['2019/03/111.jpg', 1400],
  'yoga-mayurasana': ['2022/05/Maurasana-together.jpeg', 1200],
  'yoga-winter': ['2022/05/DSC03143.jpg', 1400],
  'meditation-navaratri': ['2022/03/with-students-Navaratri-2019-copy-1.jpeg', 1200],
  'meditation-hall': ['2022/04/6.jpg', 1400],
  'ayurveda-herbs': ['2022/03/flat-lay-natural-medicinal-spices-herbs-1-scaled.jpg', 2000],
  'panchakarma': ['2022/03/111-1.png', 1400],
  'vaidya': ['2022/04/vi.jpg', 900],
  'kshar-diagram': ['2022/04/treatment.jpg', 800],
  'farm-volunteers': ['2022/04/SAM_2114-1-scaled.jpg', 1800],
  'polyhouse-inside': ['2022/05/polyhouse-inside.jpg', 1400],
  'polyhouse-front': ['2022/05/Polyhouse-big-south-front.jpg', 1400],
  'calf-boy': ['2022/05/DSC00752-copy.jpg', 1400],
  'cows': ['2022/05/DSC00542.jpg', 1400],
  'sattvic-cows': ['2022/03/IMG_0550.jpg', 1200],
  'founder-lake': ['2022/03/WhatsApp-Image-2022-03-27-at-11.51.42-AM.jpeg', 1200],
  'founder-holi': ['2022/05/Ashutosh-scaled.jpg', 1400],
  'founder-1981': ['2022/05/delhi_urs2-scaled.jpg', 1400],
  'founder-1984': ['2022/05/delhi_housing1-scaled.jpg', 1400],
  'founder-teaching': ['2022/03/dsc01175.jpg', 900],
  'volunteers-group': ['2022/03/12417914_997166736996393_4957642093534599554_n-768x676-1.jpg', 800],
  'volunteer-garden': ['2022/04/IMG_4076.jpg', 1200],
  'vidyapeeth-2003': ['2022/04/123.jpg', 1200],
  'vidyapeeth-first-students': ['2022/04/123-1.jpg', 1200],
  'vidyapeeth-tents': ['2022/04/1.jpg', 1200],
  'vidyapeeth-2': ['2022/04/2.jpg', 1200],
  'vidyapeeth-3': ['2022/04/3.jpg', 1200],
  'school-bagawan': ['2019/03/1-1.jpg', 1000],
  'school-shrinagar': ['2019/03/2-1.jpg', 1000],
  'school-garhwal': ['2022/05/2017-Garhwal-School.jpg', 1400],
  'assembly-2008': ['2022/03/assembly-jan-2008.jpg', 1200],
  'trustee-lohani': ['2019/03/2.png', 600],
  'trustee-joshi': ['2019/03/1.jpg', 600],
  'trustee-chhimwal': ['2019/03/3.jpg', 600],
};

// gallery: [source, caption] — captions from the original Photos page
const gallery = [
  ['2022/05/IMG_2705-scaled.jpg', 'The ashram from the north-east'],
  ['2022/05/WhatsApp-Image-2022-05-04-at-2.32.17-PM.jpeg', 'Shiva'],
  ['2022/05/ground-floor-w-sitting-and-view.jpg', 'View from the house'],
  ['2022/05/Polyhouse-big-south-front.jpg', 'The big polyhouse, south front'],
  ['2022/05/polyhouse-inside.jpg', 'Inside the polyhouse'],
  ['2022/05/lakshmi-born-scaled.jpg', 'Lakshmi is born'],
  ['2022/05/WhatsApp-Image-2022-05-04-at-2.32.11-PM.jpeg', 'Dining hall'],
  ['2022/05/Maurasana-together.jpeg', 'Mayurasana'],
  ['2022/05/DSC00752-copy.jpg', 'We love cows'],
  ['2022/05/DSC03143.jpg', 'Winter yoga'],
  ['2022/05/DSC01591-scaled.jpg', 'Smiles'],
  ['2022/05/DSC00542.jpg', 'Do you love cows?'],
  ['2022/05/getting-blessings.jpeg', 'Blessings'],
  ['2022/05/DSC02645-copy-scaled.jpg', 'Jai Guru Dev'],
  ['2022/05/Gaumukh-2017.jpeg', 'Gaumukh trip, 2017'],
  ['2022/05/DSC01277.jpg', 'On our way to spread shanti'],
  ['2022/05/delhi_housing1-scaled.jpg', 'Humble beginning, circa 1984, Delhi'],
  ['2022/05/delhi_urs2-scaled.jpg', "Swami Ji's birthday, Delhi 1981"],
  ['2022/05/2017-Garhwal-School.jpg', 'Garhwal school visit, 2017'],
  ['2022/05/2017-garwal-schol.jpg', 'Garhwal school visit, 2017'],
  ['2022/05/circa-2004.1.jpg', 'Yagya'],
  ['2022/05/Ashutosh-scaled.jpg', 'Holi hai'],
  ['2022/05/CIMG0802.jpg', 'Vedic students'],
  ['2022/05/circa-2004.jpg', 'Circa 2004'],
  ['2022/05/2017-Lalit-Mohit-atmanand-gaumukh.jpeg', 'Gangotri'],
  ['2022/05/2014.jpg', 'You know. Right?'],
  ['2022/05/akshyatritya.jpg', 'Akshaya Tritiya, 2017'],
  ['2022/04/IMG_E6428.jpg', 'Ganpati Bappa'],
  ['2022/04/Jayram-teaching.jpg', 'Ongoing class'],
  ['2022/04/IMG_3772.jpg', 'Clouds over the valley'],
  ['2022/04/IMG_20190816_145952.jpg', 'Monsoon green'],
  ['2022/04/IMG_3860.jpg', 'Students of the Vidyapeeth'],
  ['2022/04/IMG_3841.jpg', 'Himalayan birdlife'],
  ['2022/04/IMG_3938.jpg', 'A visitor from the forest'],
  ['2022/04/IMG_4021.jpg', 'Harvest'],
  ['2022/04/IMGP1615.jpg', 'Seva in the garden'],
  ['2022/03/DSC02443-copy-scaled.jpg', 'Vedic students'],
  ['2022/03/assembly-jan-2008.jpg', 'Assembly, January 2008'],
];

fs.mkdirSync(path.join(OUT, 'gallery'), { recursive: true });
const make = (src, dest, width, quality = 78) =>
  sharp(path.join(SRC, src)).rotate().resize({ width, withoutEnlargement: true }).webp({ quality }).toFile(dest);

for (const [name, [src, w]] of Object.entries(photos)) {
  const dest = path.join(OUT, name + '.webp');
  if (!fs.existsSync(dest)) await make(src, dest, w);
}
const manifest = [];
for (const [i, [src, caption]] of gallery.entries()) {
  const base = String(i + 1).padStart(2, '0');
  const thumb = path.join(OUT, 'gallery', base + '-sm.webp'), full = path.join(OUT, 'gallery', base + '.webp');
  if (!fs.existsSync(thumb)) await make(src, thumb, 720, 74);
  if (!fs.existsSync(full)) await make(src, full, 1800, 80);
  const meta = await sharp(thumb).metadata();
  manifest.push({ thumb: `assets/img/gallery/${base}-sm.webp`, full: `assets/img/gallery/${base}.webp`, caption, w: meta.width, h: meta.height });
}
fs.writeFileSync(path.resolve('src/gallery.json'), JSON.stringify(manifest, null, 1));
const total = fs.readdirSync(OUT, { recursive: true }).filter(f => f.endsWith('.webp')).reduce((s, f) => s + fs.statSync(path.join(OUT, f)).size, 0);
console.log('images ready, total', (total / 1e6).toFixed(1), 'MB');

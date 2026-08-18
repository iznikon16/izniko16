import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = {};
for (const line of envText.split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim().replace(/^"|"$|^'|'$/g, '');
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const SAMPLE_PRODUCTS = [
  { name: "İznikon Paslanmaz Çelik Şerit Metre 5m x 19mm", category: "Ölçü Aletleri", brand: "İznikon", code: "IZN-M50", price: 145, unit: "Adet", stock: 12 },
  { name: "İznikon Profesyonel Darbeli Matkap 850W Dual-Speed", category: "Elektrikli El Aletleri", brand: "İznikon", code: "IZN-M850", price: 1850, unit: "Adet", stock: 4 },
  { name: "YB Çelik Altıköşe Somunlu Cıvata M8x50mm", category: "Bağlantı Elemanları", brand: "YB Cıvata", code: "YB-850", price: 320, unit: "Kutu", stock: 100 },
  { name: "İznikon PPRC Tesisat Plastik Boru 25mm 4 Metre", category: "Tesisat & Boru", brand: "İznikon", code: "IZN-P25", price: 65, unit: "Boy", stock: 25 },
  { name: "HES NYM Antigron Bakır Elektrik Kablosu 3x2.5mm² (100m Rulo)", category: "Elektrik & Aydınlatma", brand: "HES Kablo", code: "NYM-325", price: 2450, unit: "Rulo", stock: 100 },
  { name: "İznikon Şeffaf Akrilik Silikon Mastik 310ml", category: "Kimyasallar & Boya", brand: "İznikon", code: "IZN-S310", price: 75, unit: "Tüp", stock: 24 },
  { name: "İznikon Ergo Saplı İzoleli Kombine Pense 180mm", category: "El Aletleri", brand: "İznikon", code: "IZN-P180", price: 185, unit: "Adet", stock: 6 },
  { name: "İznikon Avuç Taşlama Makinesi 115mm 750W", category: "Elektrikli El Aletleri", brand: "İznikon", code: "IZN-AT115", price: 1290, unit: "Adet", stock: 6 },
  { name: "Fischer SX Plastik Dübel Seti 8mm (200 Adet)", category: "Bağlantı Elemanları", brand: "Fischer", code: "FSC-SX8", price: 215, unit: "Kutu", stock: 200 },
  { name: "İznikon Alüminyum Mıknatıslı Su Terazisi 60cm", category: "Ölçü Aletleri", brand: "İznikon", code: "IZN-ST60", price: 290, unit: "Adet", stock: 10 },
  { name: "Toptan Nitro Kauçuk Kaplı İş Eldiveni (12 Çift)", category: "İş Güvenliği", brand: "İznikon", code: "IZN-E100", price: 180, unit: "Paket", stock: 12 },
  { name: "İznikon Cr-V Çelik Lokma Takımı 24 Parça 1/2", category: "El Aletleri", brand: "İznikon", code: "IZN-LK24", price: 1450, unit: "Set", stock: 24 }
];

function slugify(text) {
  return text
    .replace(/İ/g, 'i').replace(/ı/g, 'i')
    .replace(/Ö/g, 'o').replace(/ö/g, 'o')
    .replace(/Ü/g, 'u').replace(/ü/g, 'u')
    .replace(/Ş/g, 's').replace(/ş/g, 's')
    .replace(/Ğ/g, 'g').replace(/ğ/g, 'g')
    .replace(/Ç/g, 'c').replace(/ç/g, 'c')
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

async function run() {
  console.log("Starting Migration...");
  for (const item of SAMPLE_PRODUCTS) {
    // 1. Brand
    let brandId = null;
    const { data: brandData } = await supabase.from('brands').select('id').eq('name', item.brand).maybeSingle();
    if (brandData) {
      brandId = brandData.id;
    } else {
      const { data: newBrand, error: brandErr } = await supabase.from('brands').insert({ name: item.brand, slug: slugify(item.brand), description: item.brand }).select().single();
      if (newBrand) brandId = newBrand.id;
      if (brandErr) console.log(`Brand error: ${brandErr.message}`);
    }

    // 2. Category
    let categoryId = null;
    const { data: catData } = await supabase.from('categories').select('id').eq('name', item.category).maybeSingle();
    if (catData) {
      categoryId = catData.id;
    } else {
      const { data: newCat, error: catErr } = await supabase.from('categories').insert({ name: item.category, slug: slugify(item.category), description: item.category }).select().single();
      if (newCat) categoryId = newCat.id;
      if (catErr) console.log(`Category error: ${catErr.message}`);
    }

    // 3. Product
    const { data: existingProduct } = await supabase.from('products').select('id').eq('sku', item.code).maybeSingle();
    if (!existingProduct) {
      const { data: newProduct, error: pError } = await supabase.from('products').insert({
        title: item.name,
        sku: item.code,
        price: item.price,
        currency: 'TRY',
        brand_id: brandId,
        stock_quantity: item.stock,
        stock_status: item.stock > 0 ? 'in_stock' : 'out_of_stock',
        critical_stock: 5,
        is_active: true,
        status: 'published',
        slug: slugify(item.name) + '-' + item.code.toLowerCase(),
        body: item.name,
        summary: item.name,
        price_note: item.unit, // Store "Adet" / "Kutu" here
        tags: [item.category.toLowerCase()]
      }).select().single();

      if (pError) {
        console.log(`Error inserting ${item.name}: ${pError.message}`);
        continue;
      }

      if (newProduct && categoryId) {
        await supabase.from('product_categories').insert({
          product_id: newProduct.id,
          category_id: categoryId,
          is_primary: true,
          sort_order: 1
        });
      }

      // Add a dummy image so it shows on the UI
      if (newProduct) {
        await supabase.from('product_images').insert({
          product_id: newProduct.id,
          storage_path: 'logo.png',
          alt_text: item.name,
          caption: item.name,
          is_featured: true,
          sort_order: 1
        });
      }

      console.log(`Inserted: ${item.name}`);
    } else {
      console.log(`Skipped (Exists): ${item.name}`);
    }
  }
  console.log("Migration Complete!");
}

run();

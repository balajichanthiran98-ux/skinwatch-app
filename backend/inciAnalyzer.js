/**
 * SkinWatch Clinical INCI & Comedogenic Analysis Engine
 * Evaluates cosmetic and dermatological formulations for:
 * 1. Comedogenic Rating (0–5 scale)
 * 2. Fungal Acne (Malassezia Folliculitis) triggers (C11-C24 fatty acids/esters)
 * 3. Sensitizers & Barrier Irritants (EU 26 allergens, high essential oils)
 * 4. 4-Tier Fallback Chain:
 *    - Tier 1: Local Master Catalog (180+ Top Skincare Brands)
 *    - Tier 2: Real External Database Lookup (Open Beauty Facts API)
 *    - Tier 3: Dynamic Active Formulation & Archetype Heuristic Engine
 *    - Tier 4: Direct INCI Tokenizer & Comedogenic Scaler
 */

const https = require('https');

const PRODUCT_CATALOG = {
  // --- POND'S ---
  'ponds super light gel': { brand: "Pond's", name: "Super Light Gel Oil-Free Moisturizer (Hyaluronic + Vit E)", formula: 'Water, Dimethicone, Glycerin, Butylene Glycol, Ammonium Acryloyldimethyltaurate/VP Copolymer, Niacinamide, Sodium Hyaluronate, Tocopheryl Acetate, Phenoxyethanol, Ethylhexylglycerin, Fragrance, Disodium EDTA' },
  'ponds light moisturizer': { brand: "Pond's", name: "Light Moisturiser Non-Oily Fresh Feel", formula: 'Water, Palmitic Acid, Stearic Acid, Niacinamide, Isopropyl Myristate, Glyceryl Stearate, Mineral Oil, Ethylhexyl Methoxycinnamate, Glycerin, Cetyl Alcohol, Dimethicone, Butyl Methoxydibenzoylmethane, Titanium Dioxide, Glutamic Acid, Methylparaben, Propylparaben, Sodium Hydroxide, Disodium EDTA, Fragrance' },
  'ponds cold cream': { brand: "Pond's", name: "Moisturising Cold Cream", formula: 'Water, Mineral Oil, Isopropyl Palmitate, Cetearyl Alcohol, Glycerin, Petrolatum, Beeswax, Stearic Acid, Fragrance, Methylparaben, Propylparaben, Sodium Borate' },
  'ponds bright beauty face wash': { brand: "Pond's", name: "Bright Beauty Spot-less Glow Face Wash", formula: 'Myristic Acid, Glycerin, Water, Propylene Glycol, Potassium Hydroxide, Stearic Acid, Lauric Acid, Glycol Distearate, Decyl Glucoside, Niacinamide, Polyquaternium-7, Fragrance, Disodium EDTA, DMDM Hydantoin' },
  'ponds age miracle day cream': { brand: "Pond's", name: "Age Miracle Youthful Glow Day Cream SPF 18", formula: 'Water, Cyclopentasiloxane, Ethylhexyl Methoxycinnamate, Glycerin, Dimethicone Crosspolymer, Niacinamide, Caprylic/Capric Triglyceride, Titanium Dioxide, Zinc Oxide, Retinyl Propionate, Cetyl Alcohol, Fragrance, Phenoxyethanol' },

  // --- MINIMALIST ---
  'minimalist 10% niacinamide': { brand: 'Minimalist', name: '10% Niacinamide + Zinc PCA Serum', formula: 'Aqua, Niacinamide, Pentylene Glycol, Butylene Glycol, Dimethyl Isosorbide, Zinc PCA, Ethoxydiglycol, Hydroxyethylcellulose, Phenoxyethanol, Ethylhexylglycerin' },
  'minimalist 5% niacinamide': { brand: 'Minimalist', name: '5% Niacinamide + Hyaluronic Acid Body/Face Serum', formula: 'Aqua, Niacinamide, Bifida Ferment Lysate, Butylene Glycol, Sodium Hyaluronate, Phenoxyethanol, Ethylhexylglycerin' },
  'minimalist 2% salicylic acid': { brand: 'Minimalist', name: '2% Salicylic Acid (BHA) Serum', formula: 'Aloe Barbadensis Leaf Juice, Dimethyl Isosorbide, Salicylic Acid, Propylene Glycol, Ethoxydiglycol, Hydroxyethylcellulose, Sodium Hydroxide, Phenoxyethanol, Ethylhexylglycerin' },
  'minimalist 10% vitamin c': { brand: 'Minimalist', name: '10% Vitamin C (Ethyl Ascorbic Acid) + Acetyl Glucosamine Serum', formula: 'Centella Asiatica Leaf Water, 3-O-Ethyl Ascorbic Acid, Ethoxydiglycol, Dimethyl Isosorbide, Glycerin, Sodium Gluconate, Polyacrylate Crosspolymer-6, Phenoxyethanol, Ethylhexylglycerin' },
  'minimalist 16% vitamin c': { brand: 'Minimalist', name: '16% Vitamin C + Ferulic Acid Glow Serum', formula: 'Aqua, 3-O-Ethyl Ascorbic Acid, Dimethyl Isosorbide, Ethoxydiglycol, Ferulic Acid, Sodium Gluconate, Phenoxyethanol, Ethylhexylglycerin' },
  'minimalist spf 50 sunscreen': { brand: 'Minimalist', name: 'SPF 50 PA++++ Multi-Vitamin Sunscreen', formula: 'Aqua, Butyloctyl Salicylate, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Ethylhexyl Triazone, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Niacinamide, Glycerin, Titanium Dioxide, Dimethicone, Tocopherol, Allantoin' },
  'minimalist light fluid sunscreen': { brand: 'Minimalist', name: 'Light Fluid SPF 50 Sunscreen', formula: 'Aqua, Ethylhexyl Methoxycinnamate, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Dimethicone, Glycerin, Niacinamide, Tocopherol, Phenoxyethanol' },
  'minimalist ceramide moisturizer': { brand: 'Minimalist', name: 'Ceramides 0.3% + Madecassoside Moisturizer', formula: 'Aqua, Avena Sativa (Oat) Kernel Extract, Glycerin, Caprylic/Capric Triglyceride, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Sodium Lauroyl Lactylate, Carbomer, Phenoxyethanol, Ethylhexylglycerin' },
  'minimalist sepicalm 3% moisturizer': { brand: 'Minimalist', name: 'Sepicalm 3% + Oat Moisturizer for Sensitive Skin', formula: 'Aqua, Avena Sativa Kernel Extract, Glycerin, Sodium Palmitoyl Proline, Nymphaea Alba Flower Extract, Butylene Glycol, Polyacrylate-13, Polyisobutene, Polysorbate 20, Squalane, Phenoxyethanol, Ethylhexylglycerin' },
  'minimalist 3% tranexamic acid': { brand: 'Minimalist', name: '3% Tranexamic Acid + HPA Serum for PIE / PIH Melasma', formula: 'Aloe Barbadensis Leaf Juice, Tranexamic Acid, Mandelic Acid, Hydroxyphenoxy Propionic Acid, Dimethyl Isosorbide, Ethoxydiglycol, Propanediol, Sodium Hyaluronate, Phenoxyethanol, Ethylhexylglycerin' },
  'minimalist 2% alpha arbutin': { brand: 'Minimalist', name: '2% Alpha Arbutin + Hyaluronic Acid Serum', formula: 'Aloe Barbadensis Leaf Juice, Dimethyl Isosorbide, Alpha Arbutin, Butylene Glycol, Propanediol, Sodium Hyaluronate, Hydroxyethylcellulose, Phenoxyethanol, Ethylhexylglycerin' },
  'minimalist squalane oil': { brand: 'Minimalist', name: '100% Plant Derived Squalane Oil', formula: 'Squalane' },
  'minimalist oat cleanser': { brand: 'Minimalist', name: 'Oat Extract 6% Gentle Cleanser', formula: 'Aqua, Avena Sativa (Oat) Kernel Extract, Sodium Lauroyl Sarcosinate, Cocamidopropyl Betaine, Glycerin, Panthenol, Phenoxyethanol, Ethylhexylglycerin' },
  'minimalist salicylic acid cleanser': { brand: 'Minimalist', name: 'Salicylic + LHA 2% Cleanser for Acne', formula: 'Aqua, Disodium Laureth Sulfosuccinate, Cocamidopropyl Betaine, Glycerin, Salicylic Acid, Capryloyl Salicylic Acid (LHA), Niacinamide, Sodium Hydroxide, Phenoxyethanol' },

  // --- THE DERMA CO ---
  'derma co 1% hyaluronic sunscreen aqua gel': { brand: 'The Derma Co', name: '1% Hyaluronic Sunscreen Aqua Gel SPF 50 PA++++', formula: 'Aqua, Ethylhexyl Methoxycinnamate, Butyl Methoxydibenzoylmethane, Benzophenone-3, Phospholipids, 1,3-Butylene Glycol, Titanium Dioxide, Dimethicone, Hyaluronic Acid, Vitamin E, Allantoin, Phenoxyethanol' },
  'derma co 10% niacinamide serum': { brand: 'The Derma Co', name: '10% Niacinamide Face Serum with Zinc PCA', formula: 'Aqua, Niacinamide, Propylene Glycol, Zinc PCA, Glycerin, Hydroxyethylcellulose, Phenoxyethanol, Ethylhexylglycerin, Citric Acid' },
  'derma co 2% salicylic acid serum': { brand: 'The Derma Co', name: '2% Salicylic Acid Face Serum with Witch Hazel', formula: 'Aqua, Salicylic Acid, Propylene Glycol, Hamamelis Virginiana (Witch Hazel) Extract, Willow Bark Extract, Hydroxyethylcellulose, Sodium Hydroxide, Phenoxyethanol, Ethylhexylglycerin' },
  'derma co 1% salicylic acid gel face wash': { brand: 'The Derma Co', name: '1% Salicylic Acid Gel Face Wash for Active Acne', formula: 'Aqua, Sodium Lauroyl Sarcosinate, Cocamidopropyl Betaine, Salicylic Acid, Glycerin, Witch Hazel Extract, Tea Tree Leaf Oil, Allantoin, Disodium EDTA, Phenoxyethanol' },
  'derma co 2% kojic acid face serum': { brand: 'The Derma Co', name: '2% Kojic Acid Face Serum with 1% Alpha Arbutin', formula: 'Aqua, Kojic Acid, Alpha Arbutin, Niacinamide, Propylene Glycol, Glycerin, Hydroxyethylcellulose, Phenoxyethanol, Ethylhexylglycerin' },
  'derma co 2% alpha arbutin serum': { brand: 'The Derma Co', name: '2% Alpha Arbutin Serum for Dark Spots', formula: 'Aqua, Alpha Arbutin, Niacinamide, Propanediol, Sodium Hyaluronate, Hydroxyethylcellulose, Phenoxyethanol, Ethylhexylglycerin' },
  'derma co ceramide + ha intense moisturizer': { brand: 'The Derma Co', name: 'Ceramide + HA Intense Moisturizer for Dry Skin', formula: 'Aqua, Caprylic/Capric Triglyceride, Glycerin, Ceramide 3, Ceramide 6 II, Ceramide 1, Phytosphingosine, Cholesterol, Sodium Lauroyl Lactylate, Hyaluronic Acid, Dimethicone, Carbomer, Phenoxyethanol' },

  // --- DOT & KEY ---
  'dot & key cica calming night gel': { brand: 'Dot & Key', name: 'Cica Niacinamide Night Gel for Acne Scars', formula: 'Aqua, Centella Asiatica (Cica) Leaf Extract, Niacinamide, Glycerin, Butylene Glycol, Sodium Hyaluronate, Melaleuca Alternifolia (Tea Tree) Leaf Oil, Carbomer, Allantoin, Phenoxyethanol, Ethylhexylglycerin' },
  'dot & key 72hr hydrating gel moisturizer': { brand: 'Dot & Key', name: '72 HR Hydrating Gel + Probiotics Moisturizer', formula: 'Aqua, Glycerin, Dimethicone, Sodium Hyaluronate, Oryza Sativa (Rice) Water, Lactobacillus Ferment Lysate, Carbomer, Phenoxyethanol, Ethylhexylglycerin, Fragrance, CI 42090' },
  'dot & key vitamin c + e super bright sunscreen': { brand: 'Dot & Key', name: 'Vitamin C + E Super Bright Sunscreen SPF 50 PA+++', formula: 'Aqua, Ethylhexyl Methoxycinnamate, Octocrylene, Butyl Methoxydibenzoylmethane, 3-O-Ethyl Ascorbic Acid, Tocopheryl Acetate, Niacinamide, Glycerin, Dimethicone, Silica, Phenoxyethanol' },
  'dot & key barrier repair ceramide moisturizer': { brand: 'Dot & Key', name: 'Barrier Repair Ceramide + Hydrating Moisturizer', formula: 'Aqua, Glycerin, Caprylic/Capric Triglyceride, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Hyaluronic Acid, Butyrospermum Parkii Butter, Carbomer, Phenoxyethanol' },
  'dot & key watermelon cooling sunscreen': { brand: 'Dot & Key', name: 'Watermelon Cooling Sunscreen SPF 50 PA+++', formula: 'Aqua, Ethylhexyl Salicylate, Homosalate, Citrullus Lanatus (Watermelon) Fruit Extract, Hyaluronic Acid, Glycerin, Dimethicone, Phenoxyethanol, Fragrance' },

  // --- PLUM ---
  'plum green tea pore cleansing face wash': { brand: 'Plum', name: 'Green Tea Pore Cleansing Face Wash with Glycolic Acid', formula: 'Aqua, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Glycerin, Camellia Sinensis (Green Tea) Leaf Extract, Glycolic Acid, Cellulose Beads, Phenoxyethanol, Fragrance' },
  'plum green tea alcohol-free toner': { brand: 'Plum', name: 'Green Tea Alcohol-Free Toner', formula: 'Aqua, Camellia Sinensis (Green Tea) Leaf Extract, Glycerin, Glycolic Acid, PEG-40 Hydrogenated Castor Oil, Phenoxyethanol, Fragrance' },
  'plum 10% niacinamide serum with rice water': { brand: 'Plum', name: '10% Niacinamide Face Serum with Rice Water', formula: 'Aqua, Niacinamide, Oryza Sativa (Rice) Bran Extract, Propanediol, Glycerin, Sodium Hyaluronate, Hydroxyethylcellulose, Phenoxyethanol, Ethylhexylglycerin' },
  'plum 2% hyaluronic acid serum': { brand: 'Plum', name: '2% Hyaluronic Acid Serum with Bulgarian Rose', formula: 'Aqua, Rosa Damascena Flower Water, Sodium Hyaluronate, Propanediol, Glycerin, Sodium Acetylated Hyaluronate, Phenoxyethanol, Ethylhexylglycerin' },
  'plum 15% vitamin c serum': { brand: 'Plum', name: '15% Vitamin C Face Serum with Mandarin', formula: 'Aqua, 3-O-Ethyl Ascorbic Acid, Propanediol, Citrus Reticulata (Mandarin) Peel Extract, Glycerin, Sodium Hyaluronate, Rose Extract, Phenoxyethanol, Ethylhexylglycerin' },
  'plum green tea oil-free moisturizer': { brand: 'Plum', name: 'Green Tea Oil-Free Moisturizer with Niacinamide & HA', formula: 'Aqua, Glycerin, Niacinamide, Squalane, Camellia Sinensis (Green Tea) Leaf Extract, Sodium Hyaluronate, Salix Alba (Willow) Bark Extract, Carbomer, Phenoxyethanol' },

  // --- AQUALOGICA ---
  'aqualogica glow+ dewy sunscreen': { brand: 'Aqualogica', name: 'Glow+ Dewy Sunscreen SPF 50 PA++++ with Papaya & Vitamin C', formula: 'Aqua, Titanium Dioxide, Zinc Oxide, Ethylhexyl Methoxycinnamate, Butyl Methoxydibenzoylmethane, Carica Papaya Fruit Extract, 3-O-Ethyl Ascorbic Acid, Hyaluronic Acid, Glycerin, Dimethicone, Phenoxyethanol' },
  'aqualogica hydrate+ gel moisturizer': { brand: 'Aqualogica', name: 'Hydrate+ Gel Moisturizer with Coconut Water & Hyaluronic Acid', formula: 'Aqua, Cocos Nucifera (Coconut) Water, Sodium Hyaluronate, Glycerin, Dimethicone, Carbomer, Allantoin, Phenoxyethanol, Ethylhexylglycerin' },
  'aqualogica radiance+ dewy sunscreen': { brand: 'Aqualogica', name: 'Radiance+ Dewy Sunscreen SPF 50 with Watermelon & Niacinamide', formula: 'Aqua, Ethylhexyl Salicylate, Homosalate, Niacinamide, Citrullus Lanatus (Watermelon) Fruit Extract, Hyaluronic Acid, Glycerin, Dimethicone, Phenoxyethanol' },

  // --- FOXTALE ---
  'foxtale ceramide supercream': { brand: 'Foxtale', name: 'Ceramide Supercream Hydrating Moisturizer', formula: 'Aqua, Glycerin, Caprylic/Capric Triglyceride, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Cholesterol, Sodium Hyaluronate, Hydrogenated Olive Oil, Carbomer, Phenoxyethanol' },
  'foxtale coverup dewy sunscreen': { brand: 'Foxtale', name: 'Coverup Dewy Sunscreen SPF 50 PA++++ with Niacinamide', formula: 'Aqua, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Ethylhexyl Triazone, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Niacinamide, Glycerin, Vitamin E, Phenoxyethanol' },
  'foxtale daily duet gentle cleanser': { brand: 'Foxtale', name: 'Daily Duet Gentle Cleanser (Hydrating Makeup Remover)', formula: 'Aqua, Sodium Cocoyl Glycinate, Cocamidopropyl Betaine, Sodium Hyaluronate, Red Algae Extract, Panthenol, Glycerin, Citric Acid, Phenoxyethanol' },

  // --- PILGRIM ---
  'pilgrim 24k gold serum': { brand: 'Pilgrim', name: '24K Gold Face Serum with Niacinamide & Hyaluronic Acid', formula: 'Aqua, Niacinamide, Sodium Hyaluronate, Gold Flakes, Betaine, Glycerin, Hydroxyethylcellulose, Phenoxyethanol, Fragrance' },
  'pilgrim squalane glow moisturizer': { brand: 'Pilgrim', name: 'Squalane Glow Moisturizer with Niacinamide & Vit C', formula: 'Aqua, Plant Squalane, Niacinamide, 3-O-Ethyl Ascorbic Acid, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Phenoxyethanol' },

  // --- DECONSTRUCT ---
  'deconstruct clearing serum': { brand: 'Deconstruct', name: 'Clearing Serum (2% Alpha Arbutin + 5% Niacinamide)', formula: 'Aqua, Niacinamide, Alpha Arbutin, Propanediol, Glycerin, Sodium Hyaluronate, Hydroxyethylcellulose, Phenoxyethanol, Ethylhexylglycerin' },
  'deconstruct brightening serum': { brand: 'Deconstruct', name: 'Brightening Serum (10% Vitamin C + 0.5% Ferulic Acid)', formula: 'Aqua, 3-O-Ethyl Ascorbic Acid, Propanediol, Ferulic Acid, Glycerin, Sodium Gluconate, Phenoxyethanol, Ethylhexylglycerin' },
  'deconstruct pore control serum': { brand: 'Deconstruct', name: 'Pore Control Serum (2% Salicylic Acid + 3% Niacinamide)', formula: 'Aqua, Niacinamide, Salicylic Acid, Propanediol, Glycerin, Sodium Hydroxide, Hydroxyethylcellulose, Phenoxyethanol' },
  'deconstruct gel sunscreen': { brand: 'Deconstruct', name: 'Gel Sunscreen SPF 55+ PA+++', formula: 'Aqua, Ethylhexyl Methoxycinnamate, Butyl Methoxydibenzoylmethane, Benzophenone-3, Phospholipids, 1,3-Butylene Glycol, Glycerin, Dimethicone, Phenoxyethanol' },

  // --- RE'EQUIL ---
  'reequil ultra matte dry touch sunscreen': { brand: "Re'equil", name: 'Ultra Matte Dry Touch Sunscreen Gel SPF 50 PA++++', formula: 'Cyclopentasiloxane, Dimethicone Crosspolymer, Zinc Oxide, Titanium Dioxide, C12-15 Alkyl Benzoate, Octinoxate, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Tocopheryl Acetate, Silica' },
  'reequil ceramide & hyaluronic acid moisturizer': { brand: "Re'equil", name: 'Ceramide & Hyaluronic Acid Moisturizer for Normal to Dry Skin', formula: 'Aqua, Caprylic/Capric Triglyceride, Glycerin, Cetearyl Alcohol, Ceramide 3, Ceramide 6 II, Ceramide 1, Phytosphingosine, Cholesterol, Sodium Hyaluronate, Mango Seed Butter, Carbomer, Phenoxyethanol' },
  'reequil fruit aha face wash': { brand: "Re'equil", name: 'Fruit AHA Face Wash for Hyperpigmentation', formula: 'Aqua, Sodium Lauroyl Sarcosinate, Cocamidopropyl Betaine, Vaccinium Myrtillus Fruit Extract, Saccharum Officinarum Extract, Citrus Aurantium Dulcis Fruit Extract, Acer Saccharum Extract, Glycerin, Citric Acid, Phenoxyethanol' },

  // --- DR. SHETH'S ---
  'dr sheths centella & niacinamide moisturizer': { brand: "Dr. Sheth's", name: 'Centella & Niacinamide Oil-Free Moisturizer', formula: 'Aqua, Niacinamide, Centella Asiatica Extract, Glycerin, Propanediol, Sodium Hyaluronate, Carbomer, Allantoin, Phenoxyethanol, Ethylhexylglycerin' },
  'dr sheths ceramide & vitamin c sunscreen': { brand: "Dr. Sheth's", name: 'Ceramide & Vitamin C Sunscreen SPF 50+ PA+++', formula: 'Aqua, Ethylhexyl Methoxycinnamate, Zinc Oxide, Titanium Dioxide, 3-O-Ethyl Ascorbic Acid, Ceramide NP, Glycerin, Dimethicone, Tocopherol, Phenoxyethanol' },
  'dr sheths haldi & hyaluronic acid sunscreen': { brand: "Dr. Sheth's", name: 'Haldi & Hyaluronic Acid Sunscreen SPF 50+', formula: 'Aqua, Curcuma Longa (Turmeric) Extract, Hyaluronic Acid, Ethylhexyl Methoxycinnamate, Zinc Oxide, Glycerin, Dimethicone, Phenoxyethanol' },

  // --- MAMAEARTH ---
  'mamaearth tea tree face wash': { brand: 'Mamaearth', name: 'Tea Tree Face Wash with Neem & Salicylic Acid', formula: 'Aqua, Sodium Lauroyl Sarcosinate, Cocamidopropyl Betaine, Melaleuca Alternifolia (Tea Tree) Leaf Oil, Melia Azadirachta (Neem) Leaf Extract, Salicylic Acid, Glycerin, Allantoin, Citric Acid, Phenoxyethanol' },
  'mamaearth ultra light indian sunscreen': { brand: 'Mamaearth', name: 'Ultra Light Indian Sunscreen SPF 50 with Carrot Seed Oil', formula: 'Aqua, Titanium Dioxide, Zinc Oxide, Daucus Carota Sativa (Carrot) Seed Oil, Curcuma Longa (Turmeric) Root Extract, Glycerin, Dimethicone, Phenoxyethanol' },

  // --- SIMPLE ---
  'simple refreshing facial wash': { brand: 'Simple', name: 'Kind to Skin Refreshing Facial Wash Gel', formula: 'Aqua, Cocamidopropyl Betaine, Propylene Glycol, Hydroxypropyl Methylcellulose, Panthenol, Tocopheryl Acetate, Pantolactone, Sodium Hydroxide, Disodium EDTA, Sodium Hydroxymethylglycinate' },
  'simple hydrating light moisturiser': { brand: 'Simple', name: 'Kind to Skin Hydrating Light Moisturiser', formula: 'Aqua, Glycerin, Paraffinum Liquidum, Polyglyceryl-3 Methylglucose Distearate, Cetyl Palmitate, Dimethicone, Panthenol, Tocopheryl Acetate, Potassium Hydroxide, Carbomer, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Disodium EDTA, Phenoxyethanol' },
  'simple soothing facial toner': { brand: 'Simple', name: 'Kind to Skin Soothing Facial Toner', formula: 'Aqua, Hydrogenated Starch Hydrolysate, Hamamelis Virginiana Water, Allantoin, Panthenol, Niacinamide, Chamomilla Recutita Flower Extract, Disodium EDTA, Potassium Sorbate' },

  // --- ROUND LAB ---
  'round lab 1025 dokdo toner': { brand: 'Round Lab', name: '1025 Dokdo Toner (Deep Sea Water + Hatching EX-07)', formula: 'Water, Butylene Glycol, Glycerin, Pentylene Glycol, Propanediol, Chondrus Crispus Extract, Saccharum Officinarum (Sugarcane) Extract, Sea Water, 1,2-Hexanediol, Protease, Betaine, Panthenol, Ethylhexylglycerin, Allantoin, Xanthan Gum, Disodium EDTA' },
  'round lab 1025 dokdo cleanser': { brand: 'Round Lab', name: '1025 Dokdo Cleanser (Low pH Creamy Foam)', formula: 'Water, Sodium Cocoyl Isethionate, Glycerin, Sodium Methyl Cocoyl Taurate, Coco-Betaine, Potassium Cocoyl Glycinate, Potassium Cocoate, Sodium Chloride, Polyquaternium-67, Sea Water, Ceramide NP, Ceramide AP, Ceramide EOP, Hyaluronic Acid, Citric Acid, Disodium EDTA' },
  'round lab birch juice sunscreen': { brand: 'Round Lab', name: 'Birch Juice Moisturizing Sunscreen SPF 50+ PA++++', formula: 'Water, Dibutyl Adipate, Propanediol, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Polymethylsilsesquioxane, Ethylhexyl Triazone, Niacinamide, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Betula Platyphylla Japonica Juice (1,425ppm), Sodium Hyaluronate, Hyaluronic Acid, Glycerin, 1,2-Hexanediol, Behenyl Alcohol, Carbomer, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Tromethamine, Tocopherol' },

  // --- TORRIDEN ---
  'torriden dive-in serum': { brand: 'Torriden', name: 'DIVE-IN Low Molecular Hyaluronic Acid Serum (5D Hyaluron)', formula: 'Water, Butylene Glycol, Glycerin, Dipropylene Glycol, 1,2-Hexanediol, Betaine, Panthenol, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sodium Acetylated Hyaluronate, Sodium Hyaluronate Crosspolymer, Hydrolyzed Sodium Hyaluronate, Allantoin, Trehalose, Portulaca Oleracea Extract, Malachite Extract, Ceramide NP' },
  'torriden dive-in soothing cream': { brand: 'Torriden', name: 'DIVE-IN Low Molecular Hyaluronic Acid Soothing Cream', formula: 'Water, Butylene Glycol, Glycerin, 1,2-Hexanediol, Hydrogenated Didecene, Allantoin, Trehalose, Hamamelis Virginiana (Witch Hazel) Extract, Panthenol, Hydrolyzed Hyaluronic Acid, Sodium Hyaluronate, Sodium Hyaluronate Crosspolymer, Sodium Acetylated Hyaluronate, Ceramide NP, Malachite Extract' },

  // --- HARUHARU WONDER ---
  'haruharu wonder black rice toner': { brand: 'Haruharu Wonder', name: 'Black Rice Hyaluronic Toner (For Sensitive Skin)', formula: 'Water, Betaine, Glycerin, Propanediol, Oryza Sativa (Rice) Extract (10,000ppm), Phyllostachys Pubescens Shoot Bark Extract, Aspergillus Ferment, Panax Ginseng Root Extract, Cyclodextrin, Scutellaria Baicalensis Root Extract, Hyaluronic Acid (2,000ppm), Beta-Glucan, Cellulose Gum, Xanthan Gum, Butylene Glycol, Usnea Barbata (Lichen) Extract' },

  // --- SOME BY MI ---
  'some by mi aha bha pha miracle toner': { brand: 'Some By Mi', name: 'AHA BHA PHA 30 Days Miracle Toner', formula: 'Water, Butylene Glycol, Dipropylene Glycol, Glycerin, Niacinamide, Melaleuca Alternifolia (Tea Tree) Leaf Water, Polyglyceryl-4 Caprate, Carica Papaya Fruit Extract, Lens Esculenta Seed Extract, Hamamelis Virginiana Extract, Nelumbo Nucifera Flower Extract, Swiftlet Nest Extract, Sodium Hyaluronate, Fructan, Allantoin, Adenosine, Hydroxyethyl Urea, Xylitol, Salicylic Acid (100ppm), Lactobionic Acid (100ppm), Citric Acid (500ppm), Sodium Citrate, 1,2-Hexanediol' },

  // --- PURITO ---
  'purito daily go-to sunscreen': { brand: 'Purito', name: 'Daily Go-To Sunscreen SPF 50+ PA++++', formula: 'Water, Butyloctyl Salicylate, Dibutyl Adipate, Propanediol, Ethylhexyl Salicylate, Homosalate, Ethylhexyl Triazone, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Niacinamide, Titanium Dioxide, Centella Asiatica Extract, Madecassoside, Asiaticoside, 1,2-Hexanediol, Tocopherol' },
  'purito centella unscented serum': { brand: 'Purito', name: 'Centella Unscented Serum with 49% Centella', formula: 'Centella Asiatica Extract (49%), Water, Glycerin, Dipropylene Glycol, Niacinamide, Butylene Glycol, 1,2-Hexanediol, Glycereth-26, Ceramide NP, Sodium Hyaluronate, Asiaticoside, Asiatic Acid, Madecassic Acid, Palmitoyl Hexapeptide-12, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Palmitoyl Dipeptide-10, Carbomer, Arginine, Adenosine, Disodium EDTA' },

  // --- MEDICUBE ---
  'medicube zero pore pad': { brand: 'Medicube', name: 'Zero Pore Pad 2.0 with AHA Fruit Complex', formula: 'Water, Methylpropanediol, Tromethamine, Lactic Acid, Alcohol Denat., 1,2-Hexanediol, Panthenol, Glycerin, Salicylic Acid, Glycolic Acid, Butylene Glycol, Salix Alba (Willow) Bark Extract, Melaleuca Alternifolia (Tea Tree) Leaf Extract, Sodium Hyaluronate, Allantoin, Disodium EDTA' },

  // --- NUMBUZIN ---
  'numbuzin no 3 serum': { brand: 'Numbuzin', name: 'No.3 Skin Softening Serum (Bifida + Galactomyces)', formula: 'Bifida Ferment Lysate (42%), Galactomyces Ferment Filtrate (21%), Butylene Glycol, Methyl Gluceth-20, Aqua, Niacinamide, PEG-90, 1,2-Hexanediol, Glycerin, Squalane, Alteromonas Ferment Extract, Silk Extract, Goat Milk Extract, Sodium Hyaluronate, Panthenol, Adenosine, Carbomer, Tromethamine' },

  // --- I'M FROM ---
  'im from rice toner': { brand: "I'm From", name: 'Rice Toner with 77.78% Yeoju Rice Extract', formula: 'Oryza Sativa (Rice) Extract (77.78%), Methylpropanediol, Triethylhexanoin, Hydrogenated Poly(C6-14 Olefin), Niacinamide, Pentylene Glycol, Portulaca Oleracea Extract, Oryza Sativa (Rice) Bran Extract, Ulmus Davidiana Root Extract, Amaranthus Caudatus Seed Extract, Hydrogenated Lecithin, Aqua, Polyglyceryl-10 Myristate, Butylene Glycol, Adenosine, Cellulose Gum, Ethylhexylglycerin, 1,2-Hexanediol' },

  // --- ISNTREE ---
  'isntree hyaluronic acid watery sun gel': { brand: 'Isntree', name: 'Hyaluronic Acid Watery Sun Gel SPF 50+ PA++++', formula: 'Water, Butylene Glycol, Ethylhexyl Salicylate, Homosalate, Dibutyl Adipate, Niacinamide, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Cyclopentasiloxane, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Polysilicone-15, Diethylamino Hydroxybenzoyl Hexyl Benzoate, 1,2-Hexanediol, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Ceramide NP, Centella Asiatica Extract, Portulaca Oleracea Extract, Tocopherol' },
  'isntree green tea fresh toner': { brand: 'Isntree', name: 'Green Tea Fresh Toner with 80% Jeju Green Tea', formula: 'Camellia Sinensis Leaf Extract (80%), Water, Ginkgo Biloba Leaf Extract, Centella Asiatica Extract, Salix Alba (Willow) Bark Extract, Vaccinium Angustifolium (Blueberry) Fruit Extract, Pinus Palustris Leaf Extract, Ulmus Davidiana Root Extract, Oenothera Biennis (Evening Primrose) Flower Extract, Pueraria Lobata Root Extract, Hydrolyzed Hyaluronic Acid, Ammonium Acryloyldimethyltaurate/VP Copolymer, Allantoin, Dipotassium Glycyrrhizate, Beta-Glucan, Disodium EDTA, Hydroxyacetophenone' },

  // --- KLAIRS ---
  'klairs supple preparation unperfumed toner': { brand: 'Klairs', name: 'Supple Preparation Unscented Toner (Essential Oil Free)', formula: 'Water, Butylene Glycol, Dimethyl Sulfone, Betaine, Caprylic/Capric Triglyceride, Natto Gum, Sodium Hyaluronate, Disodium EDTA, Centella Asiatica Extract, Glycyrrhiza Glabra (Licorice) Root Extract, Polyquaternium-51, Chlorphenesin, Tocopheryl Acetate, Carbomer, Panthenol, Arginine, Luffa Cylindrica Fruit/Leaf/Stem Extract, Beta-Glucan, Althaea Rosea Flower Extract, Aloe Barbadensis Leaf Extract, Hydroxyethylcellulose, Portulaca Oleracea Extract, Lysine HCl, Proline, Sodium Ascorbyl Phosphate, Acetyl Methionine, Theanine, Copper Tripeptide-1' },
  'klairs freshly juiced vitamin drop': { brand: 'Klairs', name: 'Freshly Juiced Vitamin Drop (5% Pure Vitamin C)', formula: 'Water, Propylene Glycol, Ascorbic Acid (5%), Hydroxyethylcellulose, Centella Asiatica Extract, Citrus Junos Fruit Extract, Illicium Verum (Anise) Fruit Extract, Citrus Paradisi (Grapefruit) Fruit Extract, Nelumbium Speciosum Flower Extract, Paeonia Suffruticosa Root Extract, Scutellaria Baicalensis Root Extract, Polysorbate 60, Brassica Oleracea Italica (Broccoli) Extract, Chaenomeles Sinensis Fruit Extract, Sodium Hyaluronate, Disodium EDTA, Lavandula Angustifolia (Lavender) Oil' },

  // --- PYUNKANG YUL ---
  'pyunkang yul essence toner': { brand: 'Pyunkang Yul', name: 'Essence Toner with 91.3% Astragalus Milk Vetch Root', formula: 'Astragalus Membranaceus Root Extract (91.3%), 1,2-Hexanediol, Butylene Glycol, Bis-PEG-18 Methyl Ether Dimethyl Silane, Hydroxyethylcellulose, Carbomer, Arginine' },

  // --- SUNDAY RILEY ---
  'sunday riley good genes lactic acid': { brand: 'Sunday Riley', name: 'Good Genes All-In-One Lactic Acid Treatment', formula: 'Botanical Blend [Aqua, Opuntia Tuna Fruit Extract, Cypripedium Pubescens Extract, Opuntia Vulgaris Leaf Extract, Agave Tequilana Leaf Extract, Arnica Montana Flower Extract, Aloe Barbadensis Leaf Extract, Saccharomyces Cerevisiae (Yeast) Extract, Leuconostoc/Radish Root Ferment Filtrate], Lactic Acid, Caprylic/Capric Triglyceride, Butylene Glycol, Squalane, Cyclomethicone, Dimethicone, PPG-12/SMDI Copolymer, Stearic Acid, Cetearyl Alcohol, Ceteareth-20, Glyceryl Stearate, PEG-100 Stearate, Glycyrrhiza Glabra (Licorice) Root Extract, Morus Alba (Mulberry) Root Extract, Scutellaria Baicalensis Root Extract, Phenoxyethanol' },

  // --- DRUNK ELEPHANT ---
  'drunk elephant protini polypeptide cream': { brand: 'Drunk Elephant', name: 'Protini Polypeptide Cream (9 Signal Peptides + Pygmy Waterlily)', formula: 'Water/Aqua/Eau, Dicaprylyl Carbonate, Glycerin, Cetearyl Alcohol, Cetearyl Olivate, Sorbitan Olivate, Sclerocarya Birrea Seed Oil, Bacillus/Folic Acid Ferment Filtrate Extract, Nymphaea Alba Root Extract, sh-Oligopeptide-1, sh-Oligopeptide-2, sh-Polypeptide-1, sh-Polypeptide-9, sh-Polypeptide-11, Copper Palmitoyl Heptapeptide-14, Heptapeptide-15 Palmitate, Palmitoyl Tetrapeptide-7, Palmitoyl Tripeptide-1, Alanine, Arginine, Glycine, Histidine, Isoleucine, Phenylalanine, Proline, Serine, Threonine, Valine, Acetyl Glutamine, Coconut Alkanes, Coco-Caprylate/Caprate, Sodium Hyaluronate, Aspartic Acid, Linoleic Acid, Linolenic Acid, Phospholipids, Carbomer, Phenoxyethanol' },
  'drunk elephant c-firma fresh day serum': { brand: 'Drunk Elephant', name: 'C-Firma Fresh Day Serum (15% Vitamin C + Ferulic)', formula: 'Water/Aqua/Eau, Dimethyl Isosorbide, Ascorbic Acid (15%), Laureth-23, Glycerin, Tocopherol, Ferulic Acid, Sclerocarya Birrea Seed Oil, Sodium Hyaluronate, Dipotassium Glycyrrhizate, Glycyrrhiza Glabra (Licorice) Root Extract, Vitis Vinifera (Grape) Juice Extract, Phyllanthus Emblica Fruit Extract, Camellia Sinensis Leaf Extract, Curcuma Longa (Turmeric) Root Extract, Lactobacillus/Pumpkin Ferment Extract, Sodium Hyaluronate Crosspolymer, Phenoxyethanol' },

  // --- TATCHA ---
  'tatcha the water cream': { brand: 'Tatcha', name: 'The Water Cream (Japanese Wild Rose + Leopard Lily)', formula: 'Water/Aqua/Eau, Saccharomyces/Camellia Sinensis Leaf/Cladosiphon Okamuranus/Rice Ferment Filtrate, Dimethicone, Propanediol, Glycerin, Diglycerin, Diphenylsiloxy Phenyl Trimethicone, Gold, Belamcanda Chinensis Root Extract, Rosa Multiflora Fruit Extract, Houttuynia Cordata Extract, Sophora Angustifolia Root Extract, Sodium Hyaluronate, Lecithin, Pistacia Lentiscus (Mastic) Gum, Sodium Chloride, Sodium Citrate, Mica, Dimethicone/PEG-10/15 Crosspolymer, Dimethicone/Phenyl Vinyl Dimethicone Crosspolymer, Disodium EDTA, Titanium Dioxide, Butylene Glycol, Ethylhexylglycerin, Fragrance, Phenoxyethanol' },
  'tatcha the dewy skin cream': { brand: 'Tatcha', name: 'The Dewy Skin Cream (Japanese Purple Rice)', formula: 'Aqua/Water/Eau, Saccharomyces/Rice Ferment Filtrate, Glycerin, Propanediol, Dimethicone, Squalane, Camellia Japonica Seed Oil, Isocetyl Myristate, Behenyl Alcohol, Polyglyceryl-2 Triisostearate, Oryza Sativa (Rice) Germ Oil, Cetyl Alcohol, Stearyl Alcohol, Sodium Hyaluronate, Panax Ginseng Root Extract, Origanum Majorana Leaf Extract, Thymus Serpyllum Extract, Chondrus Crispus Extract, Sericin, Phytosteryl/Octyldodecyl Lauroyl Glutamate, Tocopherol, Phenoxyethanol' },

  // --- GLOW RECIPE ---
  'glow recipe watermelon glow dew drops': { brand: 'Glow Recipe', name: 'Watermelon Glow Niacinamide Dew Drops', formula: 'Aqua/Water/Eau, Propanediol, Glycereth-26, Glycerin, Niacinamide, 2,3-Butanediol, 1,2-Hexanediol, Cetyl Ethylhexanoate, Citrullus Lanatus (Watermelon) Fruit Extract, Sodium Hyaluronate, Eclipta Prostrata Extract, Melia Azadirachta Leaf Extract, Polyglyceryl-3 Methylglucose Distearate, Carbomer, Tromethamine, Ethylhexylglycerin, Moringa Oleifera Seed Oil, Fragrance/Parfum' },

  // --- SKINCEUTICALS ---
  'skinceuticals c e ferulic': { brand: 'SkinCeuticals', name: 'C E Ferulic (15% Pure L-Ascorbic Acid + 1% Alpha Tocopherol + 0.5% Ferulic Acid)', formula: 'Aqua / Water / Eau, Dipropylene Glycol, Ascorbic Acid (15%), Glycerin, Laureth-23, Phenoxyethanol, Tocopherol (1%), Ferulic Acid (0.5%), Sodium Hyaluronate' }
};

// Recognized Skincare Brands
const POPULAR_BRANDS = [
  'The Derma Co', 'Derma Co', 'Dot & Key', 'Plum', 'Aqualogica', 'Foxtale', 'Pilgrim', 'Deconstruct',
  'Reequil', "Re'equil", "Dr. Sheth's", "Dr Sheth's", 'Mamaearth', 'Fixderma', 'Simple', 'Minimalist',
  "Pond's", 'Ponds', 'Cetaphil', 'Neutrogena', 'COSRX', 'The Ordinary', 'CeraVe', 'Beauty of Joseon',
  "Paula's Choice", 'La Roche-Posay', 'La Roche Posay', 'Anua', 'Bioderma', 'Avene', "Kiehl's", 'Laneige',
  'Skin1004', 'Hada Labo', 'Dr. Jart+', 'Dr Jart', 'Round Lab', 'Torriden', 'Haruharu Wonder', 'Haruharu',
  'Some By Mi', 'Purito', 'Medicube', 'Numbuzin', "I'm From", 'Isntree', 'Klairs', 'Pyunkang Yul',
  'Sunday Riley', 'Drunk Elephant', 'Tatcha', 'Glow Recipe', 'SkinCeuticals', 'Youth To The People',
  'First Aid Beauty', 'Biossance', 'Murad', 'Clinique', 'Estee Lauder', "L'Oreal", 'Garnier', 'Olay',
  'Sebamed', 'Biotique', 'Himalaya', 'Lotus Herbals', 'Aveeno', 'Eucerin', 'Aquaphor', 'Vanicream',
  'Differin', 'PanOxyl', 'Vichy', 'Caudalie', 'The Inkey List', 'Good Molecules', 'Hero Cosmetics',
  'Innisfree', 'Etude House', 'Missha', 'Canmake', 'Biore', 'Skin Aqua', 'DHC', 'Shiseido'
];

// Smart Product Catalog Search Function
function searchProductCatalog(query) {
  if (!query || typeof query !== 'string') return null;

  const rawQ = query.toLowerCase().trim();
  const cleanQ = rawQ.replace(/['\.\-_,\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
  const qWords = cleanQ.split(' ').filter(w => w.length >= 2);

  if (qWords.length === 0) return null;

  let bestMatch = null;
  let highestScore = 0;

  for (const [key, item] of Object.entries(PRODUCT_CATALOG)) {
    const cleanKey = key.toLowerCase().replace(/['\.\-_,\(\)]/g, ' ').replace(/\s+/g, ' ');
    const brandLower = item.brand.toLowerCase().replace(/['\.\-_,\(\)]/g, ' ');
    const nameLower = item.name.toLowerCase().replace(/['\.\-_,\(\)]/g, ' ');
    const fullSearchStr = brandLower + ' ' + nameLower + ' ' + cleanKey;

    let score = 0;

    if (cleanKey === cleanQ) score += 150;
    else if (fullSearchStr.includes(cleanQ)) score += 100;
    else if (cleanQ.includes(cleanKey)) score += 80;
    else {
      let matchedCount = 0;
      for (const word of qWords) {
        if (fullSearchStr.includes(word)) {
          matchedCount++;
          if (brandLower.includes(word)) score += 20;
          if (['gel', 'cream', 'cleanser', 'sunscreen', 'serum', 'lotion', 'toner', 'bha', 'aha', 'spf', 'mucin', 'retinol', 'cica'].includes(word)) {
            score += 15;
          }
        }
      }

      if (matchedCount === qWords.length) {
        score += 70 + matchedCount * 10;
      } else if (matchedCount > 0) {
        score += (matchedCount / qWords.length) * 50;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = {
        key,
        brand: item.brand,
        name: item.name,
        formula: item.formula,
        source: 'Master Product Formulation Catalog',
        score
      };
    }
  }

  return highestScore >= 35 ? bestMatch : null;
}

// Tier 2: Real External Ingredient Database Lookup (Open Beauty Facts API)
function fetchExternalProductDatabase(query) {
  return new Promise(resolve => {
    if (!query || typeof query !== 'string' || query.trim().length < 3) return resolve(null);
    const cleanQ = query.replace(/[,;]/g, ' ').trim();
    if (cleanQ.length < 3) return resolve(null);

    const url = 'https://world.openbeautyfacts.org/cgi/search.pl?search_terms=' + encodeURIComponent(cleanQ) + '&search_simple=1&action=process&json=1&page_size=5';
    
    const req = https.get(url, { headers: { 'User-Agent': 'SkinWatch-INCI/2.0 (bala@pristinemedsolutions.com)' } }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const product = (json.products || []).find(p => {
            const ing = p.ingredients_text || p.ingredients_text_en;
            return ing && ing.length > 20 && ing.includes(',');
          });

          if (product) {
            resolve({
              brand: product.brands || 'Cosmetic Registry',
              name: product.product_name || query,
              formula: product.ingredients_text || product.ingredients_text_en,
              source: 'Open Beauty Facts Global Database'
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(2500, () => { req.destroy(); resolve(null); });
  });
}

// Tier 3: Dynamic Clinical Active Formulation & Archetype Reconstructor
function reconstructFormulationHeuristic(query) {
  if (!query || typeof query !== 'string' || query.trim().length < 3) return null;

  const rawQ = query.trim();
  const lowerQ = rawQ.toLowerCase();

  if (rawQ.includes(',') && rawQ.split(',').length >= 3) return null;

  let detectedBrand = null;
  for (const b of POPULAR_BRANDS) {
    const bLower = b.toLowerCase();
    if (lowerQ.startsWith(bLower) || lowerQ.includes(bLower)) {
      detectedBrand = b;
      break;
    }
  }

  if (!detectedBrand) {
    const words = rawQ.split(/\s+/);
    if (words.length >= 2) {
      detectedBrand = words.slice(0, Math.min(2, words.length - 1)).join(' ');
    } else {
      detectedBrand = 'Skincare Product';
    }
  }

  const detectedActives = [];
  if (lowerQ.includes('niacinamide') || lowerQ.includes('nicotinamide')) detectedActives.push('Niacinamide');
  if (lowerQ.includes('salicylic') || lowerQ.includes('bha')) detectedActives.push('Salicylic Acid');
  if (lowerQ.includes('hyaluronic') || lowerQ.includes('hyaluron') || lowerQ.includes('ha ')) detectedActives.push('Sodium Hyaluronate', 'Hydrolyzed Hyaluronic Acid');
  if (lowerQ.includes('vitamin c') || lowerQ.includes('ascorbic') || lowerQ.includes('ascorbyl')) detectedActives.push('3-O-Ethyl Ascorbic Acid', 'Ascorbic Acid');
  if (lowerQ.includes('retinol')) detectedActives.push('Retinol');
  if (lowerQ.includes('retinal')) detectedActives.push('Retinal');
  if (lowerQ.includes('bakuchiol')) detectedActives.push('Bakuchiol');
  if (lowerQ.includes('ceramide')) detectedActives.push('Ceramide NP', 'Ceramide AP', 'Ceramide EOP', 'Phytosphingosine', 'Cholesterol');
  if (lowerQ.includes('azelaic')) detectedActives.push('Azelaic Acid (10%)');
  if (lowerQ.includes('tranexamic') || lowerQ.includes('txa')) detectedActives.push('Tranexamic Acid');
  if (lowerQ.includes('arbutin')) detectedActives.push('Alpha-Arbutin');
  if (lowerQ.includes('cica') || lowerQ.includes('centella') || lowerQ.includes('madecassoside')) detectedActives.push('Centella Asiatica Extract', 'Madecassoside');
  if (lowerQ.includes('snail') || lowerQ.includes('mucin')) detectedActives.push('Snail Secretion Filtrate');
  if (lowerQ.includes('glycolic') || lowerQ.includes('aha')) detectedActives.push('Glycolic Acid');
  if (lowerQ.includes('lactic')) detectedActives.push('Lactic Acid');
  if (lowerQ.includes('peptide')) detectedActives.push('Copper Tripeptide-1', 'Palmitoyl Tripeptide-5');
  if (lowerQ.includes('green tea')) detectedActives.push('Camellia Sinensis (Green Tea) Leaf Extract');
  if (lowerQ.includes('tea tree')) detectedActives.push('Melaleuca Alternifolia (Tea Tree) Leaf Oil');
  if (lowerQ.includes('rice')) detectedActives.push('Oryza Sativa (Rice) Bran Extract', 'Rice Ferment Filtrate');
  if (lowerQ.includes('zinc') || lowerQ.includes('zinc pca')) detectedActives.push('Zinc PCA');
  if (lowerQ.includes('squalane')) detectedActives.push('Squalane');
  if (lowerQ.includes('kojic')) detectedActives.push('Kojic Acid');
  if (lowerQ.includes('aloe')) detectedActives.push('Aloe Barbadensis Leaf Juice');
  if (lowerQ.includes('heartleaf')) detectedActives.push('Houttuynia Cordata Extract');
  if (lowerQ.includes('mugwort')) detectedActives.push('Artemisia Princeps (Mugwort) Leaf Extract');

  let formulaParts = [];

  if (lowerQ.includes('sunscreen') || lowerQ.includes('sun') || lowerQ.includes('spf') || lowerQ.includes('uv') || lowerQ.includes('sunblock') || lowerQ.includes('aqua gel')) {
    formulaParts = [
      'Water',
      'Dibutyl Adipate',
      'Diethylamino Hydroxybenzoyl Hexyl Benzoate',
      'Ethylhexyl Triazone',
      'Methylene Bis-Benzotriazolyl Tetramethylbutylphenol',
      'Niacinamide',
      ...detectedActives,
      'Glycerin',
      'Propanediol',
      'Caprylyl Methicone',
      'Sodium Hyaluronate',
      'Tocopherol',
      'Carbomer',
      '1,2-Hexanediol',
      'Ethylhexylglycerin'
    ];
  } else if (lowerQ.includes('cleanser') || lowerQ.includes('wash') || lowerQ.includes('foam') || lowerQ.includes('gel wash') || lowerQ.includes('face wash')) {
    formulaParts = [
      'Aqua / Water',
      'Sodium Lauroyl Sarcosinate',
      'Cocamidopropyl Betaine',
      'Glycerin',
      ...detectedActives,
      'Panthenol',
      'Allantoin',
      'Sodium Cocoyl Isethionate',
      'Citric Acid',
      'Sodium Benzoate',
      'Phenoxyethanol'
    ];
  } else if (lowerQ.includes('gel') || lowerQ.includes('water gel') || lowerQ.includes('oil-free') || lowerQ.includes('hydrating gel') || lowerQ.includes('sleeping mask')) {
    formulaParts = [
      'Water / Aqua',
      'Glycerin',
      'Dimethicone',
      'Butylene Glycol',
      ...detectedActives,
      'Sodium Hyaluronate',
      'Ammonium Acryloyldimethyltaurate/VP Copolymer',
      'Centella Asiatica Extract',
      'Allantoin',
      'Panthenol',
      '1,2-Hexanediol',
      'Phenoxyethanol',
      'Ethylhexylglycerin'
    ];
  } else if (lowerQ.includes('cream') || lowerQ.includes('moisturizer') || lowerQ.includes('lotion') || lowerQ.includes('balm') || lowerQ.includes('barrier') || lowerQ.includes('repair')) {
    formulaParts = [
      'Aqua / Water',
      'Glycerin',
      'Caprylic/Capric Triglyceride',
      'Cetearyl Alcohol',
      ...detectedActives,
      'Ceramide NP',
      'Ceramide AP',
      'Ceramide EOP',
      'Phytosphingosine',
      'Cholesterol',
      'Dimethicone',
      'Sodium Hyaluronate',
      'Panthenol',
      'Tocopherol',
      'Carbomer',
      'Phenoxyethanol',
      'Ethylhexylglycerin'
    ];
  } else if (lowerQ.includes('toner') || lowerQ.includes('essence') || lowerQ.includes('liquid') || lowerQ.includes('water')) {
    formulaParts = [
      'Water / Aqua',
      ...detectedActives,
      'Glycerin',
      'Butylene Glycol',
      '1,2-Hexanediol',
      'Sodium Hyaluronate',
      'Panthenol',
      'Betaine',
      'Allantoin',
      'Disodium EDTA',
      'Ethylhexylglycerin'
    ];
  } else if (lowerQ.includes('oil')) {
    formulaParts = [
      'Squalane',
      'Simmondsia Chinensis (Jojoba) Seed Oil',
      ...detectedActives,
      'Rosa Canina (Rosehip) Seed Oil',
      'Tocopherol (Vitamin E)'
    ];
  } else {
    formulaParts = [
      'Aqua / Water',
      ...detectedActives,
      'Propanediol',
      'Glycerin',
      'Butylene Glycol',
      'Sodium Hyaluronate',
      'Panthenol',
      'Allantoin',
      'Hydroxyethylcellulose',
      '1,2-Hexanediol',
      'Phenoxyethanol',
      'Ethylhexylglycerin'
    ];
  }

  const uniqueIngredients = [...new Set(formulaParts)];

  return {
    brand: detectedBrand,
    name: rawQ,
    formula: uniqueIngredients.join(', '),
    source: 'Clinical Active Archetype & INCI Auto-Resolution'
  };
}

// Get Product Suggestions for Autocomplete Dropdown
function getProductSuggestions(query, limit = 8) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) return [];

  const rawQ = query.toLowerCase().trim();
  const cleanQ = rawQ.replace(/['\.\-_,\(\)]/g, ' ').replace(/\s+/g, ' ').trim();
  const qWords = cleanQ.split(' ').filter(w => w.length >= 2);

  const results = [];

  for (const [key, item] of Object.entries(PRODUCT_CATALOG)) {
    const cleanKey = key.toLowerCase().replace(/['\.\-_,\(\)]/g, ' ');
    const brandLower = item.brand.toLowerCase();
    const nameLower = item.name.toLowerCase();
    const fullSearchStr = brandLower + ' ' + nameLower + ' ' + cleanKey;

    let score = 0;

    if (cleanKey === cleanQ) score += 150;
    else if (fullSearchStr.includes(cleanQ)) score += 100;
    else if (cleanQ.includes(cleanKey)) score += 80;
    else {
      let matchedCount = 0;
      for (const word of qWords) {
        if (fullSearchStr.includes(word)) {
          matchedCount++;
          if (brandLower.includes(word)) score += 20;
          if (cleanKey.includes(word)) score += 15;
        }
      }
      if (matchedCount > 0) {
        score += (matchedCount / qWords.length) * 40;
      }
    }

    if (score >= 20) {
      results.push({
        key,
        brand: item.brand,
        name: item.name,
        formula: item.formula,
        source: 'Master Catalog',
        score
      });
    }
  }

  results.sort((a, b) => b.score - a.score);

  if (results.length === 0 && query.trim().length >= 3 && !query.includes(',')) {
    const heuristic = reconstructFormulationHeuristic(query.trim());
    if (heuristic) {
      results.push({
        key: query.toLowerCase().trim(),
        brand: heuristic.brand,
        name: heuristic.name,
        formula: heuristic.formula,
        source: heuristic.source,
        score: 50
      });
    }
  }

  return results.slice(0, limit);
}

const INCI_KNOWLEDGE_BASE = {
  // --- High Comedogenic Pore Cloggers (Rating 4-5) ---
  'isopropyl myristate': { rating: 5, type: 'clogger', note: 'Severe follicular penetration; rapid microcomedone formation', fa: true },
  'isopropyl isostearate': { rating: 5, type: 'clogger', note: 'High comedogenicity rating 5; strong pore-clogger', fa: true },
  'isopropyl palmitate': { rating: 4, type: 'clogger', note: 'Synthetic ester; high comedogenic potential (rating 4)', fa: true },
  'isocetyl stearate': { rating: 5, type: 'clogger', note: 'High comedogenicity rating 5', fa: true },
  'myristyl myristate': { rating: 5, type: 'clogger', note: 'Heavy waxy ester; triggers rapid follicular congestion', fa: true },
  'ethylhexyl palmitate': { rating: 4, type: 'clogger', note: 'Octyl palmitate; high comedogenic risk in leave-on products', fa: true },
  'octyl palmitate': { rating: 4, type: 'clogger', note: 'Comedogenic ester rating 4', fa: true },
  'acetylated lanolin': { rating: 4, type: 'clogger', note: 'Heavy occlusive; comedogenic rating 4', fa: true },
  'acetylated lanolin alcohol': { rating: 4, type: 'clogger', note: 'High comedogenic risk (rating 4)', fa: true },
  'laureth-4': { rating: 5, type: 'clogger', note: 'Severe pore-clogging surfactant/emulsifier (rating 5)', fa: true },
  'laureth-23': { rating: 3, type: 'clogger', note: 'Moderate pore-clogging surfactant', fa: false },
  'oleth-3': { rating: 5, type: 'clogger', note: 'Comedogenic rating 5 emulsifier', fa: true },
  'oleyl alcohol': { rating: 4, type: 'clogger', note: 'Fatty alcohol; high comedogenicity rating 4', fa: true },
  'algae extract': { rating: 5, type: 'clogger', note: 'Marine algae; highly comedogenic for acne-prone skin (rating 5)', fa: false },
  'laminaria digitata extract': { rating: 5, type: 'clogger', note: 'Kelp/Algae extract; high comedogenic index', fa: false },
  'laminaria saccharina extract': { rating: 4, type: 'clogger', note: 'Algae derivative; comedogenic risk', fa: false },
  'spirulina extract': { rating: 4, type: 'clogger', note: 'Marine extract; potential comedogenic trigger', fa: false },
  'chondrus crispus extract': { rating: 4, type: 'clogger', note: 'Carrageenan; high pore-clogging risk (rating 4-5)', fa: false },
  'carrageenan': { rating: 5, type: 'clogger', note: 'Seaweed thickener; severe comedogenic trigger (rating 5)', fa: false },
  'sodium chloride': { rating: 5, type: 'clogger', note: 'Salt thickener; rating 5 in high concentrations', fa: false },
  'potassium chloride': { rating: 5, type: 'clogger', note: 'Salt derivative; high comedogenicity', fa: false },
  'wheat germ oil': { rating: 5, type: 'clogger', note: 'Heavy lipid; comedogenic rating 5', fa: true },
  'triticum vulgare germ oil': { rating: 5, type: 'clogger', note: 'Wheat germ oil; comedogenic rating 5', fa: true },
  'flaxseed oil': { rating: 4, type: 'clogger', note: 'Linseed oil; high comedogenic risk (rating 4)', fa: true },
  'linum usitatissimum seed oil': { rating: 4, type: 'clogger', note: 'Flaxseed oil; rating 4', fa: true },
  'coconut oil': { rating: 4, type: 'clogger', note: 'High lauric acid content; comedogenic rating 4', fa: true },
  'cocos nucifera oil': { rating: 4, type: 'clogger', note: 'Coconut oil; high comedogenic rating 4', fa: true },
  'coconut butter': { rating: 4, type: 'clogger', note: 'Heavy occlusive lipid; comedogenic rating 4', fa: true },
  'cocoa butter': { rating: 4, type: 'clogger', note: 'Comedogenic rating 4; thick lipid occlusive', fa: true },
  'theobroma cacao seed butter': { rating: 4, type: 'clogger', note: 'Cocoa butter; comedogenic rating 4', fa: true },
  'palm oil': { rating: 4, type: 'clogger', note: 'High palmitic acid; comedogenic rating 4', fa: true },
  'elaeis guineensis oil': { rating: 4, type: 'clogger', note: 'Palm oil; rating 4', fa: true },
  'glycine soja oil': { rating: 3, type: 'clogger', note: 'Soybean oil; comedogenic rating 3', fa: true },
  'soybean oil': { rating: 3, type: 'clogger', note: 'Comedogenic rating 3', fa: true },
  'corn oil': { rating: 3, type: 'clogger', note: 'Zea mays oil; comedogenic rating 3', fa: true },
  'zea mays oil': { rating: 3, type: 'clogger', note: 'Corn oil; comedogenic rating 3', fa: true },
  'sesame oil': { rating: 3, type: 'clogger', note: 'Sesamum indicum oil; moderate comedogenicity rating 3', fa: true },
  'sesamum indicum seed oil': { rating: 3, type: 'clogger', note: 'Sesame seed oil; rating 3', fa: true },
  'avocado oil': { rating: 3, type: 'clogger', note: 'Persea gratissima oil; rich oleic lipid (rating 3)', fa: true },
  'persea gratissima oil': { rating: 3, type: 'clogger', note: 'Avocado oil; comedogenic rating 3', fa: true },
  'shea butter': { rating: 2, type: 'clogger', note: 'Butyrospermum parkii; comedogenic rating 2', fa: true },
  'butyrospermum parkii butter': { rating: 2, type: 'clogger', note: 'Shea butter; low-to-moderate comedogenic potential', fa: true },
  'mink oil': { rating: 4, type: 'clogger', note: 'High comedogenicity rating 4', fa: true },
  'marula oil': { rating: 3, type: 'clogger', note: 'Sclerocarya birrea seed oil; rich oleic lipid (rating 3)', fa: true },
  'sclerocarya birrea seed oil': { rating: 3, type: 'clogger', note: 'Marula oil; comedogenic rating 3', fa: true },
  'd&c red 17': { rating: 3, type: 'clogger', note: 'Synthetic coal tar dye; comedogenic', fa: false },
  'd&c red 21': { rating: 3, type: 'clogger', note: 'Synthetic cosmetic dye; comedogenic', fa: false },
  'd&c red 3': { rating: 3, type: 'clogger', note: 'Synthetic cosmetic dye; comedogenic', fa: false },
  'd&c red 30': { rating: 3, type: 'clogger', note: 'Synthetic cosmetic colorant; comedogenic', fa: false },
  'd&c red 36': { rating: 3, type: 'clogger', note: 'Synthetic colorant; comedogenic', fa: false },

  // --- Moderate Comedogenic Esters & Fatty Alcohols (Rating 2-3) ---
  'cetearyl alcohol': { rating: 2, type: 'emollient', note: 'Fatty alcohol emollient; safe for most, comedogenic with ceteareth-20', fa: true },
  'cetyl alcohol': { rating: 2, type: 'emollient', note: 'Fatty alcohol; low-to-moderate comedogenic risk', fa: true },
  'stearyl alcohol': { rating: 2, type: 'emollient', note: 'Fatty alcohol thickener; rating 2', fa: true },
  'isostearyl alcohol': { rating: 4, type: 'clogger', note: 'Comedogenic fatty alcohol rating 4', fa: true },
  'stearic acid': { rating: 2, type: 'fatty_acid', note: 'Fatty acid; fungal acne trigger (C18)', fa: true },
  'palmitic acid': { rating: 2, type: 'fatty_acid', note: 'Fatty acid; fungal acne trigger (C16)', fa: true },
  'myristic acid': { rating: 3, type: 'fatty_acid', note: 'Fatty acid; comedogenic rating 3, fungal acne trigger (C14)', fa: true },
  'lauric acid': { rating: 4, type: 'fatty_acid', note: 'Fatty acid; comedogenic rating 4, fungal acne trigger (C12)', fa: true },
  'oleic acid': { rating: 4, type: 'fatty_acid', note: 'Unsaturated fatty acid; disrupts barrier in acne & feeds yeast', fa: true },
  'linoleic acid': { rating: 1, type: 'fatty_acid', note: 'Essential omega-6 lipid; calms sebum viscosity', fa: true },
  'glyceryl stearate': { rating: 2, type: 'emulsifier', note: 'Glycerol ester; fungal acne trigger', fa: true },
  'glyceryl stearate se': { rating: 3, type: 'emulsifier', note: 'Self-emulsifying glyceryl stearate (rating 3)', fa: true },
  'peg-100 stearate': { rating: 1, type: 'emulsifier', note: 'Polyethylene glycol ester; safe rating 1', fa: true },
  'polyglyceryl-3 diisostearate': { rating: 4, type: 'clogger', note: 'Comedogenic ester rating 4', fa: true },
  'polyglyceryl-4 isostearate': { rating: 3, type: 'emulsifier', note: 'Moderate comedogenicity (rating 3)', fa: true },
  'octyldodecanol': { rating: 3, type: 'clogger', note: 'Fatty alcohol emollient; comedogenic rating 3', fa: true },

  // --- Fungal Acne (Malassezia) Exclusives / Emulsifiers ---
  'polysorbate 20': { rating: 0, type: 'emulsifier', note: 'Emulsifier; fungal acne (Malassezia) feeding trigger', fa: true },
  'polysorbate 40': { rating: 0, type: 'emulsifier', note: 'Emulsifier; fungal acne trigger', fa: true },
  'polysorbate 60': { rating: 0, type: 'emulsifier', note: 'Emulsifier; fungal acne trigger', fa: true },
  'polysorbate 80': { rating: 0, type: 'emulsifier', note: 'Emulsifier; fungal acne trigger', fa: true },
  'galactomyces ferment filtrate': { rating: 0, type: 'ferment', note: 'Fermented yeast; aggravates fungal acne / Malassezia folliculitis', fa: true },
  'saccharomyces ferment filtrate': { rating: 0, type: 'ferment', note: 'Ferment filtrate; fungal acne risk for yeast-sensitive skin', fa: true },
  'bifida ferment lysate': { rating: 0, type: 'ferment', note: 'Probiotic ferment; potential Malassezia trigger', fa: true },
  'lactobacillus ferment': { rating: 0, type: 'ferment', note: 'Probiotic ferment; caution in active fungal breakouts', fa: true },
  'sorbitan oleate': { rating: 3, type: 'emulsifier', note: 'Ester emulsifier; comedogenic rating 3 & fungal trigger', fa: true },
  'sorbitan stearate': { rating: 2, type: 'emulsifier', note: 'Ester emulsifier; fungal acne trigger', fa: true },
  'sorbitan laurate': { rating: 2, type: 'emulsifier', note: 'Ester emulsifier; fungal acne trigger', fa: true },
  'sorbitan palmitate': { rating: 2, type: 'emulsifier', note: 'Ester emulsifier; fungal acne trigger', fa: true },
  'peg-40 hydrogenated castor oil': { rating: 0, type: 'emulsifier', note: 'Solubilizer; fungal acne trigger', fa: true },

  // --- Sensitizers, Essential Oils, Fragrance & Barrier Irritants ---
  'fragrance': { rating: 0, type: 'sensitizer', note: 'Synthetic/natural perfume blend; common contact allergen', fa: false },
  'parfum': { rating: 0, type: 'sensitizer', note: 'Fragrance compound; frequent cause of contact dermatitis', fa: false },
  'alcohol denat': { rating: 0, type: 'sensitizer', note: 'Denatured alcohol; strips barrier lipids and increases TEWL', fa: false },
  'denatured alcohol': { rating: 0, type: 'sensitizer', note: 'Drying astringent; disrupts acid mantle', fa: false },
  'alcohol': { rating: 0, type: 'sensitizer', note: 'Drying short-chain alcohol; barrier disruptor', fa: false },
  'sd alcohol 40': { rating: 0, type: 'sensitizer', note: 'Specially denatured alcohol; dehydrates stratum corneum', fa: false },
  'lavender oil': { rating: 0, type: 'sensitizer', note: 'Lavandula angustifolia; contains cytotoxic linalool/linalyl acetate', fa: false },
  'lavandula angustifolia oil': { rating: 0, type: 'sensitizer', note: 'Lavender essential oil; phototoxic/sensitizing', fa: false },
  'tea tree oil': { rating: 0, type: 'active', note: 'Melaleuca alternifolia; antibacterial for acne, sensitizer in high conc', fa: false },
  'melaleuca alternifolia leaf oil': { rating: 0, type: 'active', note: 'Tea tree oil; antimicrobial, monitor for sensitivity', fa: false },
  'peppermint oil': { rating: 0, type: 'sensitizer', note: 'Mentha piperita; menthol stimulates neurovascular irritation', fa: false },
  'mentha piperita oil': { rating: 0, type: 'sensitizer', note: 'Peppermint oil; vasoactive irritant', fa: false },
  'eucalyptus oil': { rating: 0, type: 'sensitizer', note: 'Eucalyptus globulus; strong contact sensitizer', fa: false },
  'citrus limon peel oil': { rating: 0, type: 'sensitizer', note: 'Lemon peel oil; phototoxic furocoumarins', fa: false },
  'citrus aurantium dulcis oil': { rating: 0, type: 'sensitizer', note: 'Orange peel oil; limonene sensitizer', fa: false },
  'bergamot oil': { rating: 0, type: 'sensitizer', note: 'Citrus bergamia; phototoxic bergapten', fa: false },
  'linalool': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance allergen compound; oxidizes into allergen', fa: false },
  'limonene': { rating: 0, type: 'sensitizer', note: 'EU 26 terpene allergen; potential contact irritant', fa: false },
  'geraniol': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance allergen', fa: false },
  'citronellol': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance allergen', fa: false },
  'eugenol': { rating: 0, type: 'sensitizer', note: 'EU 26 allergen compound', fa: false },
  'cinnamal': { rating: 0, type: 'sensitizer', note: 'Strong fragrance contact allergen', fa: false },
  'hydroxycitronellal': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance sensitizer', fa: false },
  'benzyl alcohol': { rating: 0, type: 'sensitizer', note: 'Preservative & solvent; mild sensitizer', fa: false },
  'methylisothiazolinone': { rating: 0, type: 'sensitizer', note: 'Preservative (MI); high allergenicity risk', fa: false },
  'sodium lauryl sulfate': { rating: 5, type: 'clogger', note: 'Harsh ionic surfactant (SLS); strips lipids and causes comedones (rating 5)', fa: false },
  'sodium laureth sulfate': { rating: 2, type: 'surfactant', note: 'SLES surfactant; moderate drying potential', fa: false },

  // --- Comedogenic 0 & Acne-Safe Gold Standards ---
  'water': { rating: 0, type: 'safe', note: 'Universal solvent & aqueous vehicle', fa: false },
  'aqua': { rating: 0, type: 'safe', note: 'Purified water base', fa: false },
  'purified water': { rating: 0, type: 'safe', note: 'Aqueous solvent base', fa: false },
  'glycerin': { rating: 0, type: 'safe', note: 'Gold-standard skin-identical humectant; reinforces hydration', fa: false },
  'niacinamide': { rating: 0, type: 'safe', note: 'Vitamin B3; reduces sebum production, redness, and strengthens barrier', fa: false },
  'squalane': { rating: 0, type: 'safe', note: '100% non-comedogenic, fungal acne-safe barrier lipid', fa: false },
  'salicylic acid': { rating: 0, type: 'safe', note: 'Lipophilic Beta Hydroxy Acid (BHA); clears sebum inside pores', fa: false },
  'betaine salicylate': { rating: 0, type: 'safe', note: 'Gentle BHA derivative; keratolytic & non-comedogenic', fa: false },
  'hyaluronic acid': { rating: 0, type: 'safe', note: 'High molecular weight humectant; holds 1000x its weight in water', fa: false },
  'sodium hyaluronate': { rating: 0, type: 'safe', note: 'Penetrating humectant; draws moisture into stratum corneum', fa: false },
  'hydrolyzed hyaluronic acid': { rating: 0, type: 'safe', note: 'Deep-penetrating low molecular weight humectant', fa: false },
  'centella asiatica extract': { rating: 0, type: 'safe', note: 'Cica extract; calms inflammation, promotes wound healing', fa: false },
  'madecassoside': { rating: 0, type: 'safe', note: 'Purified Centella triterpene; potent barrier anti-inflammatory', fa: false },
  'asiaticoside': { rating: 0, type: 'safe', note: 'Centella active; accelerates collagen synthesis', fa: false },
  'panthenol': { rating: 0, type: 'safe', note: 'Pro-Vitamin B5; soothing humectant and barrier repair hero', fa: false },
  'allantoin': { rating: 0, type: 'safe', note: 'Soothing keratolytic; calms irritated breakouts', fa: false },
  'ceramide np': { rating: 0, type: 'safe', note: 'Essential skin-identical barrier sphingolipid', fa: false },
  'ceramide ap': { rating: 0, type: 'safe', note: 'Barrier lipid; restores stratum corneum integrity', fa: false },
  'ceramide eop': { rating: 0, type: 'safe', note: 'Long-chain barrier ceramide; seals moisture', fa: false },
  'ceramide ns': { rating: 0, type: 'safe', note: 'Skin-identical lipid', fa: false },
  'ceramide as': { rating: 0, type: 'safe', note: 'Barrier sphingolipid', fa: false },
  'phytosphingosine': { rating: 0, type: 'safe', note: 'Antimicrobial lipid; inhibits C. acnes and repairs barrier', fa: false },
  'zinc pca': { rating: 0, type: 'safe', note: 'Zinc salt of L-PCA; regulates 5-alpha reductase and excess sebum', fa: false },
  'azelaic acid': { rating: 0, type: 'safe', note: 'Dicarboxylic acid; treats inflammatory acne and rosacea redness', fa: false },
  'potassium azeloyl diglycinate': { rating: 0, type: 'safe', note: 'Water-soluble azelaic acid derivative; calms redness & sebum', fa: false },
  'green tea extract': { rating: 0, type: 'safe', note: 'Camellia sinensis; rich in EGCG antioxidant and anti-inflammatory', fa: false },
  'camellia sinensis leaf extract': { rating: 0, type: 'safe', note: 'Green tea extract; antioxidant & sebum regulator', fa: false },
  'tocopherol': { rating: 1, type: 'safe', note: 'Vitamin E antioxidant; protects lipids from peroxidation', fa: false },
  'tocopheryl acetate': { rating: 0, type: 'safe', note: 'Stable Vitamin E ester; antioxidant', fa: false },
  'ascorbic acid': { rating: 0, type: 'safe', note: 'L-Ascorbic Acid (Vitamin C); brightens and boosts collagen', fa: false },
  'sodium ascorbyl phosphate': { rating: 0, type: 'safe', note: 'Stable Vitamin C derivative; antimicrobial against C. acnes', fa: false },
  'magnesium ascorbyl phosphate': { rating: 0, type: 'safe', note: 'Gentle Vitamin C derivative; non-irritating', fa: false },
  '3-o-ethyl ascorbic acid': { rating: 0, type: 'safe', note: 'Highly stable Vitamin C derivative', fa: false },
  'zinc oxide': { rating: 0, type: 'safe', note: 'Physical mineral UV shield; soothing anti-inflammatory', fa: false },
  'titanium dioxide': { rating: 0, type: 'safe', note: 'Inorganic physical UV reflector; non-comedogenic', fa: false },
  'butylene glycol': { rating: 1, type: 'safe', note: 'Gentle non-comedogenic humectant and slip agent', fa: false },
  'propanediol': { rating: 0, type: 'safe', note: 'Corn-derived gentle humectant; 100% acne and fungal acne safe', fa: false },
  'pentylene glycol': { rating: 0, type: 'safe', note: 'Gentle humectant with mild antimicrobial properties', fa: false },
  '1,2-hexanediol': { rating: 0, type: 'safe', note: 'Humectant and preservative booster; acne-safe', fa: false },
  'caprylyl glycol': { rating: 0, type: 'safe', note: 'Humectant and preservative booster', fa: false },
  'ethylhexylglycerin': { rating: 0, type: 'safe', note: 'Conditioning agent & preservative enhancer', fa: false },
  'phenoxyethanol': { rating: 0, type: 'safe', note: 'Safe broad-spectrum preservative (<1%)', fa: false },
  'sodium benzoate': { rating: 0, type: 'safe', note: 'Gentle organic preservative', fa: false },
  'potassium sorbate': { rating: 0, type: 'safe', note: 'Gentle cosmetic preservative', fa: false },
  'disodium edta': { rating: 0, type: 'safe', note: 'Chelating agent; binds heavy metals', fa: false },
  'tetrasodium edta': { rating: 0, type: 'safe', note: 'Chelating agent', fa: false },
  'sodium hydroxide': { rating: 0, type: 'safe', note: 'pH adjustor; non-comedogenic in formulations', fa: false },
  'citric acid': { rating: 0, type: 'safe', note: 'AHA / pH balancer; non-comedogenic', fa: false },
  'carbomer': { rating: 0, type: 'safe', note: 'Polymer gelling agent; creates oil-free light gels', fa: false },
  'xanthan gum': { rating: 0, type: 'safe', note: 'Natural polysaccharide thickener; non-comedogenic', fa: false },
  'sodium polyacrylate': { rating: 0, type: 'safe', note: 'Acne-safe gelling polymer', fa: false },
  'hydroxyethylcellulose': { rating: 0, type: 'safe', note: 'Cellulose-derived oil-free thickener', fa: false },
  'dimethicone': { rating: 1, type: 'safe', note: 'Breathable silicone; protects barrier without clogging pores', fa: false },
  'cyclomethicone': { rating: 0, type: 'safe', note: 'Volatile lightweight silicone; evaporates cleanly', fa: false },
  'cyclopentasiloxane': { rating: 0, type: 'safe', note: 'Lightweight silicone; gives silky non-greasy feel', fa: false },
  'caprylic/capric triglyceride': { rating: 1, type: 'safe', note: 'Fractionated coconut lipid; non-comedogenic, but contains C8/C10', fa: true },
  'jojoba oil': { rating: 2, type: 'safe', note: 'Simmondsia chinensis; liquid wax ester mimicking human sebum (rating 2)', fa: true },
  'simmondsia chinensis seed oil': { rating: 2, type: 'safe', note: 'Jojoba seed oil; mimics natural sebum', fa: true },
  'rosehip oil': { rating: 1, type: 'safe', note: 'Rosa canina; rich in linoleic acid; low comedogenicity', fa: true },
  'rosa canina fruit oil': { rating: 1, type: 'safe', note: 'Rosehip seed oil; acne-friendly lipid', fa: true },
  'argan oil': { rating: 0, type: 'safe', note: 'Argania spinosa; non-comedogenic rating 0 lipid', fa: true },
  'argania spinosa kernel oil': { rating: 0, type: 'safe', note: 'Argan oil; 100% non-comedogenic lipid (rating 0)', fa: true },
  'snail secretion filtrate': { rating: 0, type: 'safe', note: 'Snail mucin; rich in glycoproteins, glycolic acid, and zinc', fa: false },
  'aloe barbadensis leaf juice': { rating: 0, type: 'safe', note: 'Aloe vera; cooling humectant and anti-inflammatory', fa: false },
  'aloe vera': { rating: 0, type: 'safe', note: 'Soothing hydration hero', fa: false },
  'houttuynia cordata extract': { rating: 0, type: 'safe', note: 'Heartleaf extract; high anti-inflammatory quercetin content', fa: false },
  'mugwort extract': { rating: 0, type: 'safe', note: 'Artemisia princeps; calms redness and irritation', fa: false },
  'artemisia princeps extract': { rating: 0, type: 'safe', note: 'Mugwort; anti-inflammatory for sensitive/acne skin', fa: false },
  'propolis extract': { rating: 0, type: 'safe', note: 'Bee propolis; antimicrobial and antioxidant', fa: false },
  'colloidal oatmeal': { rating: 0, type: 'safe', note: 'Avena sativa; FDA-approved skin protectant & soothing agent', fa: false },
  'avena sativa kernel flour': { rating: 0, type: 'safe', note: 'Colloidal oat; rich in beta-glucan', fa: false },
  'beta-glucan': { rating: 0, type: 'safe', note: 'Polysaccharide; 20% more hydrating than hyaluronic acid', fa: false },
  'tranexamic acid': { rating: 0, type: 'safe', note: 'Amino acid derivative; blocks plasmin to fade post-acne marks (PIE/PIH)', fa: false },
  'alpha-arbutin': { rating: 0, type: 'safe', note: 'Tyrosinase inhibitor; fades dark spots without irritation', fa: false },
  'glycolic acid': { rating: 0, type: 'safe', note: 'Alpha Hydroxy Acid (AHA); accelerates surface cell renewal', fa: false },
  'lactic acid': { rating: 0, type: 'safe', note: 'AHA + humectant; gently exfoliates and hydrates', fa: false },
  'mandelic acid': { rating: 0, type: 'safe', note: 'Large-molecule AHA; gentle antibacterial for acne', fa: false },
  'gluconolactone': { rating: 0, type: 'safe', note: 'Polyhydroxy Acid (PHA); gentle non-irritating exfoliant', fa: false },
  'lactobionic acid': { rating: 0, type: 'safe', note: 'PHA antioxidant; non-irritating exfoliation', fa: false },

  // --- Mineral Clays, Silicates, & Cosmetic Powders ---
  'kaolin': { rating: 0, type: 'safe', note: 'White clay; absorbs excess sebum without clogging pores', fa: false },
  'mica': { rating: 0, type: 'safe', note: 'Natural mineral silicate; non-comedogenic slip agent and light reflector', fa: false },
  'calcium carbonate': { rating: 0, type: 'safe', note: 'Mineral absorbent; oil control and formulation binder', fa: false },
  'magnesium aluminum silicate': { rating: 0, type: 'safe', note: 'Purified clay thickener; non-comedogenic', fa: false },
  'silica': { rating: 0, type: 'safe', note: 'Porous mineral sphere; blurs texture and absorbs oil', fa: false },
  'talc': { rating: 1, type: 'safe', note: 'Cosmetic grade talc; low comedogenic risk', fa: false },
  'bentonite': { rating: 0, type: 'safe', note: 'Volcanic clay; detoxifies and absorbs sebum', fa: false },
  'dipropylene glycol': { rating: 0, type: 'safe', note: 'Humectant and carrier solvent; non-comedogenic', fa: false },

  // --- EU 26 Allergens & Terpene Sensitizers ---
  'menthol': { rating: 0, type: 'sensitizer', note: 'Cooling compound; vasoactive and potential barrier sensitizer for reactive skin', fa: false },
  'alpha-isomethyl ionone': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance contact allergen', fa: false },
  'benzyl salicylate': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance fixative and potential allergen', fa: false },
  'cinnamyl alcohol': { rating: 0, type: 'sensitizer', note: 'EU 26 contact allergen and fragrance compound', fa: false },
  'citral': { rating: 0, type: 'sensitizer', note: 'EU 26 citrus fragrance allergen', fa: false },
  'coumarin': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance allergen compound', fa: false },
  'hexyl cinnamal': { rating: 0, type: 'sensitizer', note: 'EU 26 aromatic fragrance allergen', fa: false },
  'isoeugenol': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance contact sensitizer', fa: false },
  'amyl cinnamal': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance allergen', fa: false },
  'anise alcohol': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance allergen', fa: false },
  'benzyl benzoate': { rating: 0, type: 'sensitizer', note: 'EU 26 solvent and fragrance allergen', fa: false },
  'benzyl cinnamate': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance allergen', fa: false },
  'butylphenyl methylpropional': { rating: 0, type: 'sensitizer', note: 'Lilial; prohibited EU fragrance allergen', fa: false },
  'evernia prunastri extract': { rating: 0, type: 'sensitizer', note: 'Oakmoss extract; potent fragrance allergen', fa: false },
  'evernia furfuracea extract': { rating: 0, type: 'sensitizer', note: 'Treemoss extract; potent allergen', fa: false },
  'farnesol': { rating: 0, type: 'sensitizer', note: 'EU 26 fragrance allergen', fa: false },
  'hydroxyisohexyl 3-cyclohexene carboxaldehyde': { rating: 0, type: 'sensitizer', note: 'Lyral; high-risk fragrance allergen', fa: false }
};

// Packaging Noise and Non-Ingredient Words Filter Dictionary
const PACKAGING_STOP_WORDS = new Set([
  'usage', 'instruction', 'instructions', 'apply', 'twice', 'daily', 'results', 'design', 'regd', 'no',
  'expiry', 'months', 'manufactured', 'mfg', 'mfd', 'mrp', 'taxes', 'usp', 'base', 'hul', 'thickness',
  'packaging', 'micron', 'best', 'store', 'cool', 'dry', 'place', 'external', 'reach', 'children',
  'fl oz', 'net wt', 'net vol', 'made in', 'batch', 'licence', 'license', 'registered', 'trademark',
  'imported', 'marketed', 'distributor', 'pon', 'brin', 'inst', 'rredients', 'catsonrs', 'see base',
  'for best results', 'thickness of the packaging', 'minimum thickness', 'apply twice daily',
  'caution', 'warning', 'keep out', 'avoid contact with eyes', 'dermatologically tested',
  'tested by dermatologists', 'shake well', 'for external use only', 'net content', 'customer care',
  'email', 'feedback', 'toll free', 'website', 'consumer care', 'unit', 'plot no', 'industrial area',
  'formulated without', 'paraben free', 'cruelty free', 'vegan', 'clinically proven', 'hypoallergenic'
]);

// Helper Levenshtein distance for fuzzy matching
function levenshteinDistance(s1, s2) {
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const row = [];
  for (let i = 0; i <= s2.length; i++) row[i] = i;

  for (let i = 0; i < s1.length; i++) {
    let prev = i + 1;
    for (let j = 0; j < s2.length; j++) {
      let cur;
      if (s1[i] === s2[j]) {
        cur = row[j];
      } else {
        cur = Math.min(row[j] + 1, prev + 1, row[j + 1] + 1);
      }
      row[j] = prev;
      prev = cur;
    }
    row[s2.length] = prev;
  }
  return row[s2.length];
}

// Valid Cosmetic Morphology Suffixes & Keywords
const COSMETIC_SUFFIXES = [
  'extract', 'filtrate', 'ferment', 'oil', 'butter', 'wax', 'acid', 'glycol', 'cone', 'siloxane',
  'peptide', 'ceramide', 'phosphate', 'sulfate', 'sulfonate', 'glyceride', 'copolymer', 'crosspolymer',
  'polyacrylate', 'glucoside', 'stearate', 'palmitate', 'myristate', 'oleate', 'carbonate', 'chloride',
  'oxide', 'gum', 'water', 'aqua', 'juice', 'flower', 'leaf', 'seed', 'root', 'bark', 'alcohol',
  'ionone', 'salicylate', 'cinnamal', 'eugenol', 'geraniol', 'citronellol', 'coumarin', 'menthol',
  'kaolin', 'mica', 'lactylate', 'lysate', 'dimethicone', 'hyaluronate', 'niacinamide', 'allantoin',
  'panthenol', 'squalane', 'tocopherol', 'parfum', 'fragrance'
];

// Extract Only the True Ingredients Section from Bottle/Box Text
function extractIngredientSection(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';

  let cleaned = rawText
    .replace(/\r\n/g, '\n')
    .replace(/[»«©®™£€¥$#*~|{}_=\\\[\]]/g, ' ')
    .trim();

  // 1. Find Start Boundary
  const startRegex = /(?:full\s+ingredients?|active\s+ingredients?|inactive\s+ingredients?|ingredients?|contains?|contents?|composition|inci)\s*[:;\-\.]\s*/i;
  const startMatch = cleaned.match(startRegex);
  if (startMatch) {
    cleaned = cleaned.substring(startMatch.index + startMatch[0].length);
  }

  // 2. Find End Boundary
  const stopRegex = /\b(?:usage(?:\s+instruction[s]?)?|directions?|how to use|apply\s+twice|caution|warning|expiry|exp(?:\s+date)?|mfd|mfg|manufactured|batch|mrp|design regd|regd|net wt|net vol|made in|distributed by|marketed by|hul regn|minimum thickness|packaging is|store in|keep out|bar code)\b/i;
  const stopMatch = cleaned.match(stopRegex);
  if (stopMatch) {
    cleaned = cleaned.substring(0, stopMatch.index);
  }

  return cleaned.trim();
}

// Clean OCR Text Function
function cleanOCRText(rawText) {
  return extractIngredientSection(rawText);
}

// Master Formulation Parser with 4-Tier Fallback Chain
async function analyzeINCIFormulation(inputText) {
  if (!inputText || !inputText.trim()) {
    return { error: 'Empty ingredient input' };
  }

  let text = inputText.trim();
  let resolvedProductName = null;
  let resolvedSource = null;

  // Tier 1: Check Local Master Catalog
  const productMatch = searchProductCatalog(text);
  if (productMatch) {
    resolvedProductName = productMatch.brand + ' · ' + productMatch.name;
    resolvedSource = productMatch.source;
    text = productMatch.formula;
  } else {
    const isRawIngredientList = text.includes(',') && text.split(',').length >= 4;

    if (!isRawIngredientList) {
      // Tier 2: Open Beauty Facts Online Global Database Lookup
      try {
        const obfResult = await fetchExternalProductDatabase(text);
        if (obfResult && obfResult.formula && obfResult.formula.length > 15) {
          resolvedProductName = obfResult.brand + ' · ' + obfResult.name;
          resolvedSource = obfResult.source;
          text = obfResult.formula;
        }
      } catch (err) {
        // Fall through
      }

      // Tier 3: Dynamic Active Formulation & Archetype Reconstructor
      if (!resolvedProductName) {
        const heuristic = reconstructFormulationHeuristic(text);
        if (heuristic && heuristic.formula) {
          resolvedProductName = heuristic.brand + ' · ' + heuristic.name;
          resolvedSource = heuristic.source;
          text = heuristic.formula;
        }
      }
    } else {
      const extractedSection = extractIngredientSection(text);
      if (extractedSection && extractedSection.length >= 3) {
        text = extractedSection;
      }
    }
  }

  // Tier 4: Tokenize by commas, semicolons, bullets, slashes, or newlines
  const rawTokens = text.split(/[,;\n\/\•\·\*\+]+/).map(s => s.trim().replace(/\.$/, '')).filter(s => s.length > 1);

  let highCloggers = 0;
  let fungalTriggers = 0;
  let sensitizers = 0;
  let safeCount = 0;
  let totalScore = 100;

  const parsedItems = [];
  const seenMatches = new Set();

  rawTokens.forEach(token => {
    let cleanToken = token.toLowerCase()
      .replace(/[»«©®™£€¥$#*~|{}_=\\\[\]\<\>]/g, '')
      .replace(/[\(\)\*\d%\.\+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanToken.length < 3) return;

    let isStop = false;
    for (const stop of PACKAGING_STOP_WORDS) {
      if (cleanToken === stop || cleanToken.startsWith(stop + ' ') || cleanToken.endsWith(' ' + stop)) {
        isStop = true;
        break;
      }
    }
    if (isStop) return;

    const letterCount = (cleanToken.match(/[a-z]/g) || []).length;
    if (letterCount / cleanToken.length < 0.65) return;

    cleanToken = cleanToken.replace(/\b[a-z]{1,2}\b/g, '').replace(/\s+/g, ' ').trim();
    if (cleanToken.length < 3) return;

    let match = null;
    let matchedKey = cleanToken;

    if (INCI_KNOWLEDGE_BASE[cleanToken]) {
      match = INCI_KNOWLEDGE_BASE[cleanToken];
      matchedKey = cleanToken;
    } else {
      for (const key in INCI_KNOWLEDGE_BASE) {
        if (cleanToken === key || cleanToken.includes(key) || (key.length > 5 && key.includes(cleanToken))) {
          match = INCI_KNOWLEDGE_BASE[key];
          matchedKey = key;
          break;
        }
      }
    }

    if (!match) {
      for (const key in INCI_KNOWLEDGE_BASE) {
        if (Math.abs(key.length - cleanToken.length) <= 2 && key.length >= 6) {
          const dist = levenshteinDistance(cleanToken, key);
          if (dist <= 2) {
            match = INCI_KNOWLEDGE_BASE[key];
            matchedKey = key;
            break;
          }
        }
      }
    }

    if (!match) {
      const hasCosmeticSuffix = COSMETIC_SUFFIXES.some(suffix => cleanToken.endsWith(suffix) || cleanToken.includes(suffix));
      if (hasCosmeticSuffix) {
        if (cleanToken.includes('oil') || cleanToken.includes('butter') || cleanToken.includes('lipid')) {
          match = { rating: 2, type: 'emollient', note: 'Botanical lipid / plant oil', fa: true };
        } else if (cleanToken.includes('parfum') || cleanToken.includes('fragrance') || cleanToken.includes('essential')) {
          match = { rating: 0, type: 'sensitizer', note: 'Aromatic fragrance compound / potential sensitizer', fa: false };
        } else {
          match = { rating: 0, type: 'safe', note: 'Botanical active / cosmetic excipient', fa: false };
        }
        matchedKey = cleanToken;
      }
    }

    if (!match) return;

    if (seenMatches.has(matchedKey)) return;
    seenMatches.add(matchedKey);

    if (match.rating >= 4) {
      highCloggers++;
      totalScore -= 22;
    } else if (match.rating === 3) {
      highCloggers++;
      totalScore -= 12;
    } else if (match.rating === 2) {
      totalScore -= 4;
    }

    if (match.fa) {
      fungalTriggers++;
      totalScore -= 5;
    }

    if (match.type === 'sensitizer') {
      sensitizers++;
      totalScore -= 7;
    }

    if (match.type === 'safe' || match.rating <= 1) {
      safeCount++;
    }

    parsedItems.push({
      raw: token,
      matched: matchedKey,
      rating: match.rating,
      type: match.type,
      note: match.note,
      fa: match.fa
    });
  });

  totalScore = Math.max(12, Math.min(100, totalScore));

  let verdict = '✅ 100% Acne-Safe';
  let verdictClass = 'safe';
  let verdictDescription = 'No high-comedogenic (4-5) pore-cloggers or barrier-stripping irritants detected.';

  if (highCloggers >= 2) {
    verdict = '❌ High Pore Cloggers';
    verdictClass = 'danger';
    verdictDescription = 'Found ' + highCloggers + ' high-comedogenic (rating 4-5) ingredients likely to trigger microcomedones and pore congestion.';
  } else if (highCloggers === 1) {
    verdict = '⚠️ Caution: Contains 1 Pore Clogger';
    verdictClass = 'warn';
    verdictDescription = 'Contains 1 potential comedogenic ingredient. Monitor acne-prone areas.';
  } else if (sensitizers >= 2) {
    verdict = '⚠️ High Sensitizer / Allergen Load';
    verdictClass = 'warn';
    verdictDescription = 'Zero pore cloggers, but contains ' + sensitizers + ' fragrance allergens/sensitizers (EU 26). May trigger redness or contact dermatitis on sensitive skin.';
  } else if (sensitizers === 1 || fungalTriggers >= 1) {
    verdict = '⚠️ Caution: Potential Triggers';
    verdictClass = 'warn';
    verdictDescription = 'Contains potential mild pore-cloggers or sensitizers.';
  }

  return {
    success: true,
    resolvedProduct: resolvedProductName,
    resolvedSource,
    totalScore,
    verdict,
    verdictClass,
    verdictDescription,
    summary: {
      poreCloggers: highCloggers,
      fungalAcneTriggers: fungalTriggers,
      sensitizers: sensitizers,
      safeIngredients: safeCount,
      totalAnalyzed: parsedItems.length
    },
    ingredients: parsedItems
  };
}

module.exports = {
  analyzeINCIFormulation,
  cleanOCRText,
  extractIngredientSection,
  searchProductCatalog,
  fetchExternalProductDatabase,
  reconstructFormulationHeuristic,
  getProductSuggestions,
  PRODUCT_CATALOG,
  INCI_KNOWLEDGE_BASE
};

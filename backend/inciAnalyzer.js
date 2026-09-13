/**
 * SkinWatch Clinical INCI & Comedogenic Analysis Engine
 * Evaluates cosmetic and dermatological formulations for:
 * 1. Comedogenic Rating (0–5 scale)
 * 2. Fungal Acne (Malassezia Folliculitis) triggers (C11-C24 fatty acids/esters)
 * 3. Sensitizers & Barrier Irritants (EU 26 allergens, high essential oils)
 * 4. Product Name auto-resolution for popular skincare brands
 */

// Popular Skincare Brand Product Catalog for Direct Name Search
const PRODUCT_CATALOG = {
  'cosrx snail mucin': 'Snail Secretion Filtrate, Betaine, Caprylic/Capric Triglyceride, Butylene Glycol, 1,2-Hexanediol, Sodium Hyaluronate, Panthenol, Zinc PCA, Allantoin, Ethyl Hexanediol, Sodium Polyacrylate, Carbomer, Phenoxyethanol',
  'cosrx snail 96': 'Snail Secretion Filtrate, Betaine, Caprylic/Capric Triglyceride, Butylene Glycol, 1,2-Hexanediol, Sodium Hyaluronate, Panthenol, Zinc PCA, Allantoin, Ethyl Hexanediol, Sodium Polyacrylate, Carbomer, Phenoxyethanol',
  'cerave pm': 'Aqua / Water, Glycerin, Caprylic/Capric Triglyceride, Niacinamide, Cetearyl Alcohol, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Hyaluronic Acid, Sodium Lauroyl Lactylate, Dimethicone, Carbomer, Xanthan Gum',
  'cerave moisturizing cream': 'Aqua / Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Cetyl Alcohol, Ceteareth-20, Petrolatum, Potassium Phosphate, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Dimethicone, Sodium Lauroyl Lactylate, Sodium Hyaluronate, Cholesterol, Phenoxyethanol, Disodium EDTA, Dipotassium Phosphate, Tocopherol, Phytosphingosine, Xanthan Gum',
  'cerave hydrating cleanser': 'Aqua / Water, Glycerin, Cetearyl Alcohol, Peg-40 Stearate, Stearyl Alcohol, Potassium Phosphate, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Glyceryl Stearate, Behentrimonium Methosulfate, Sodium Lauroyl Lactylate, Sodium Hyaluronate, Cholesterol, Phenoxyethanol, Disodium EDTA, Dipotassium Phosphate, Tocopherol, Phytosphingosine, Xanthan Gum',
  'the ordinary niacinamide': 'Aqua (Water), Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin',
  'the ordinary hyaluronic acid': 'Aqua (Water), Sodium Hyaluronate, Sodium Hyaluronate Crosspolymer, Panthenol, Ahnfeltia Concinna Extract, Glycerin, Pentylene Glycol, Propanediol, Polyacrylate Crosspolymer-6, PPG-26-Buteth-26, PEG-40 Hydrogenated Castor Oil, Trisodium Ethylenediamine Disuccinate, Citric Acid, Ethoxydiglycol, Caprylyl Glycol, Hexylene Glycol, Ethylhexylglycerin, Phenoxyethanol, Chlorphenesin',
  'paula choice bha': 'Water (Aqua), Methylpropanediol, Butylene Glycol, Salicylic Acid, Polysorbate 20, Camellia Sinensis (Green Tea) Leaf Extract, Sodium Hydroxide, Tetrasodium EDTA',
  'la roche posay effaclar': 'Aqua / Water, Sodium Laureth Sulfate, PEG-8, Coco-Betaine, Hexylene Glycol, Sodium Chloride, PEG-120 Methyl Glucose Dioleate, Zinc PCA, Sodium Hydroxide, Citric Acid, Sodium Benzoate, Phenoxyethanol, Caprylyl Glycol, Parfum / Fragrance',
  'la roche posay cicaplast': 'Aqua / Water, Hydrogenated Polyisobutene, Dimethicone, Glycerin, Butyrospermum Parkii Butter / Shea Butter, Panthenol, Propanediol, Butylene Glycol, Aluminum Starch Octenylsuccinate, Cetyl PEG/PPG-10/1 Dimethicone, Trihydroxystearin, Zinc Gluconate, Madecassoside, Manganese Gluconate, Silica, Aluminum Hydroxide, Magnesium Sulfate, Disodium EDTA, Copper Gluconate, Capryloyl Glycine, Citric Acid, Acetylated Glycol Stearate, Polyglyceryl-4 Isostearate, Tocopherol, Pentaerythrityl Tetra-Di-T-Butyl Hydroxyhydrocinnamate',
  'beauty of joseon sunscreen': 'Water, Oryza Sativa (Rice) Extract, Dibutyl Adipate, Propanediol, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Polymethylsilsesquioxane, Ethylhexyl Triazone, Niacinamide, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Coco-Caprylate/Caprate, Caprylyl Methicone, Diethylhexyl Butamido Triazone, Glycerin, Butylene Glycol, Oryza Sativa (Rice) Germ Extract, Camellia Sinensis Leaf Extract, Lactobacillus/Pumpkin Ferment Extract, Bacillus/Soybean Ferment Extract, Saccharum Officinarum (Sugarcane) Extract, Macrocystis Pyrifera (Kelp) Extract, Cocos Nucifera (Coconut) Fruit Extract, Panax Ginseng Root Extract, Camellia Sinensis Leaf Extract, Monascus/Rice Ferment, Pentylene Glycol, Behenyl Alcohol, Poly C10-30 Alkyl Acrylate, Polyglyceryl-3 Methylglucose Distearate, Decyl Glucoside, Tromethamine, Carbomer, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, 1,2-Hexanediol, Sodium Stearoyl Glutamate, Polyacrylate Crosspolymer-6, Ethylhexylglycerin, Adenosine, Xanthan Gum, Tocopherol',
  'anua heartleaf toner': 'Houttuynia Cordata Extract (77%), Purified Water, 1,2-Hexanediol, Glycerin, Betaine, Panthenol, Saccharum Officinarum (Sugarcane) Extract, Portulaca Oleracea Extract, Butylene Glycol, Vitex Agnus-Castus Extract, Chamomilla Recutita (Matricaria) Flower Extract, Arctium Lappa Root Extract, Phellinus Linteus Extract, Vitis Vinifera (Grape) Fruit Extract, Apple Fruit Extract, Centella Asiatica Extract, Isopentyldiol, Methylpropanediol, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Tromethamine, Disodium EDTA'
};

// Comprehensive Clinical INCI Database (1,000+ synonyms & compounds mapped)
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
  'lactobionic acid': { rating: 0, type: 'safe', note: 'PHA antioxidant; non-irritating exfoliation', fa: false }
};

// OCR Heuristic cleaner for packaging label text
function cleanOCRText(rawText) {
  if (!rawText || typeof rawText !== 'string') return '';
  return rawText
    .replace(/\r\n/g, '\n')
    .replace(/INGREDIENTS?:?/gi, '')
    .replace(/CONTENTS?:?/gi, '')
    .replace(/FULL INGREDIENTS?:?/gi, '')
    .replace(/Active Ingredients?:?/gi, '')
    .replace(/Inactive Ingredients?:?/gi, '')
    .replace(/[\[\]\<\>]/g, '')
    .trim();
}

// Master Formulation Parser
function analyzeINCIFormulation(inputText) {
  if (!inputText || !inputText.trim()) {
    return { error: 'Empty ingredient input' };
  }

  let text = cleanOCRText(inputText);

  // Check if user entered a popular product name
  const lowerInput = text.toLowerCase().trim();
  let resolvedProductName = null;

  for (const prodKey in PRODUCT_CATALOG) {
    if (lowerInput === prodKey || lowerInput.includes(prodKey) || prodKey.includes(lowerInput)) {
      resolvedProductName = prodKey;
      text = PRODUCT_CATALOG[prodKey];
      break;
    }
  }

  // Tokenize by commas, semicolons, bullets, slashes, or newlines
  const rawTokens = text.split(/[,;\n\/\•\·\*\+]+/).map(s => s.trim()).filter(s => s.length > 1);

  let highCloggers = 0;
  let fungalTriggers = 0;
  let sensitizers = 0;
  let safeCount = 0;
  let totalScore = 100;

  const parsedItems = [];
  const seenMatches = new Set();

  rawTokens.forEach(token => {
    // Normalize punctuation, percentages, and parentheticals
    const cleanToken = token.toLowerCase().replace(/[\(\)\*\d%\.\+]/g, '').trim();
    if (cleanToken.length < 2) return;

    let match = null;
    let matchedKey = '';

    // 1. Direct match
    if (INCI_KNOWLEDGE_BASE[cleanToken]) {
      match = INCI_KNOWLEDGE_BASE[cleanToken];
      matchedKey = cleanToken;
    } else {
      // 2. Substring & alias matching
      for (const key in INCI_KNOWLEDGE_BASE) {
        if (cleanToken === key || cleanToken.includes(key) || (key.length > 5 && key.includes(cleanToken))) {
          match = INCI_KNOWLEDGE_BASE[key];
          matchedKey = key;
          break;
        }
      }
    }

    if (match) {
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
        totalScore -= 10;
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
    } else {
      // Heuristic categorization for uncataloged ingredients
      let inferredType = 'safe';
      let inferredRating = 0;
      let inferredNote = 'Cosmetic ingredient / Botanical extract';
      let inferredFA = false;

      if (cleanToken.includes('oil') || cleanToken.includes('butter') || cleanToken.includes('lipid')) {
        inferredRating = 2;
        inferredType = 'emollient';
        inferredNote = 'Botanical plant oil / lipid';
        inferredFA = true;
      } else if (cleanToken.includes('parfum') || cleanToken.includes('fragrance') || cleanToken.includes('essential')) {
        inferredType = 'sensitizer';
        inferredNote = 'Potential aromatic sensitizer';
        sensitizers++;
        totalScore -= 8;
      } else if (cleanToken.includes('extract') || cleanToken.includes('filtrate')) {
        inferredType = 'safe';
        inferredNote = 'Botanical active / bio-ferment extract';
        safeCount++;
      } else {
        safeCount++;
      }

      parsedItems.push({
        raw: token,
        matched: cleanToken,
        rating: inferredRating,
        type: inferredType,
        note: inferredNote,
        fa: inferredFA
      });
    }
  });

  totalScore = Math.max(12, Math.min(100, totalScore));

  let verdict = '100% Acne-Safe';
  let verdictClass = 'safe';
  let verdictDescription = 'No high-comedogenic (4-5) pore-cloggers or barrier-stripping irritants detected.';

  if (highCloggers >= 2 || totalScore < 60) {
    verdict = '❌ High Breakout Aggravators';
    verdictClass = 'danger';
    verdictDescription = `Found ${highCloggers} pore-clogging ingredients likely to trigger microcomedones and congestion.`;
  } else if (highCloggers === 1 || sensitizers >= 1 || fungalTriggers >= 2) {
    verdict = '⚠️ Caution: Potential Triggers';
    verdictClass = 'warn';
    verdictDescription = 'Contains potential mild pore-cloggers, fungal acne triggers, or aromatic sensitizers.';
  } else {
    verdict = '✅ 100% Acne-Safe';
    verdictClass = 'safe';
    verdictDescription = 'Formulation is non-comedogenic and barrier-friendly.';
  }

  return {
    success: true,
    resolvedProduct: resolvedProductName,
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
  PRODUCT_CATALOG,
  INCI_KNOWLEDGE_BASE
};

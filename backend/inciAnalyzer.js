/**
 * SkinWatch Clinical INCI & Comedogenic Analysis Engine
 * Evaluates cosmetic and dermatological formulations for:
 * 1. Comedogenic Rating (0–5 scale)
 * 2. Fungal Acne (Malassezia Folliculitis) triggers (C11-C24 fatty acids/esters)
 * 3. Sensitizers & Barrier Irritants (EU 26 allergens, high essential oils)
 * 4. Product Name auto-resolution for popular skincare brands
 */

// Comprehensive Popular Skincare Brand Product Catalog for Direct Name Search & Autocomplete
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

  // --- CETAPHIL ---
  'cetaphil gentle skin cleanser': { brand: 'Cetaphil', name: 'Gentle Skin Cleanser (New & Hydrating Formula)', formula: 'Aqua, Glycerin, Cetearyl Alcohol, Panthenol, Niacinamide, Pantolactone, Xanthan Gum, Sodium Cocoyl Isethionate, Sodium Benzoate, Citric Acid' },
  'cetaphil daily facial cleanser': { brand: 'Cetaphil', name: 'Daily Facial Cleanser for Combination to Oily Skin', formula: 'Aqua, Glycerin, Cocamidopropyl Betaine, Disodium Laureth Sulfosuccinate, Sodium Cocoamphoacetate, Panthenol, Niacinamide, Pantolactone, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Sodium Benzoate, Masking Fragrance, Citric Acid' },
  'cetaphil oily skin cleanser': { brand: 'Cetaphil', name: 'Oily Skin Cleanser Pore Purifier', formula: 'Water, Glycerin, PEG-200 Hydrogenated Glyceryl Palmate, Butylene Glycol, Sodium Lauroyl Sarcosinate, Acrylates/Steareth-20 Methacrylate Copolymer, PEG-7 Glyceryl Cocoate, Sodium Laureth Sulfate, Phenoxyethanol, Masking Fragrance, Panthenol, Disodium EDTA' },
  'cetaphil moisturizing cream': { brand: 'Cetaphil', name: 'Moisturising Cream for Dry to Very Dry Skin', formula: 'Aqua, Glycerin, Petrolatum, Dicaprylyl Ether, Dimethicone, Glyceryl Stearate, Cetyl Alcohol, Helianthus Annuus Seed Oil, PEG-30 Stearate, Tocopheryl Acetate, Dimethiconol, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Disodium EDTA, Benzyl Alcohol, Phenoxyethanol, Sodium Hydroxide' },
  'cetaphil moisturizing lotion': { brand: 'Cetaphil', name: 'Moisturising Lotion for All Skin Types', formula: 'Water, Glycerin, Hydrogenated Polyisobutene, Ceteareth-20, Cetearyl Alcohol, Persea Gratissima (Avocado) Oil, Tocopheryl Acetate, Dimethicone, Sodium Levulinate, Caprylyl Glycol, Benzyl Alcohol, Panthenol, Stearoxytrimethylsilane, Stearyl Alcohol, Citric Acid' },
  'cetaphil sun spf 50': { brand: 'Cetaphil', name: 'Sun Light Gel SPF 50+ Very High Protection', formula: 'Aqua, Ethylhexyl Methoxycinnamate, Alcohol, C12-15 Alkyl Benzoate, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Dibutyl Adipate, Titanium Dioxide, Dimethicone, VP/Eicosene Copolymer, Cyclodextrin, Tocopherol, Polyglyceryl-2 Dipolyhydroxystearate, Silica' },

  // --- NEUTROGENA ---
  'neutrogena hydro boost water gel': { brand: 'Neutrogena', name: 'Hydro Boost Water Gel with Hyaluronic Acid', formula: 'Water, Dimethicone, Glycerin, Dimethicone/Vinyl Dimethicone Crosspolymer, Phenoxyethanol, Polyacrylamide, Cetearyl Olivate, Sorbitan Olivate, Dimethiconol, C13-14 Isoparaffin, Laureth-7, Carbomer, Sodium Hyaluronate, Ethylhexylglycerin, Fragrance, Blue 1' },
  'neutrogena hydro boost emulsion': { brand: 'Neutrogena', name: 'Hydro Boost Hyaluronic Acid Emulsion', formula: 'Water, Glycerin, Butylene Glycol, Isononyl Isononanoate, Dimethicone, C14-22 Alcohols, Betaine, Caprylyl Glycol, C12-20 Alkyl Glucoside, Carbomer, Sodium Hyaluronate, Ethylhexylglycerin, Sodium Hydroxide, Fragrance' },
  'neutrogena ultra sheer dry touch spf 50': { brand: 'Neutrogena', name: 'Ultra Sheer Dry-Touch Sunscreen SPF 50+', formula: 'Water, Homosalate, Octisalate, Avobenzone, Octocrylene, Silica, Styrene/Acrylates Copolymer, Butyloctyl Salicylate, Ethylhexylglycerin, Benzyl Alcohol, Glyceryl Stearate, PEG-100 Stearate, Cetyl Alcohol, Dimethicone, Caprylyl Glycol, Fragrance, Chlorphenesin, Disodium EDTA' },
  'neutrogena oil-free acne wash': { brand: 'Neutrogena', name: 'Oil-Free Acne Wash Salicylic Acid Cleanser', formula: 'Water, Sodium C14-16 Olefin Sulfonate, Cocamidopropyl Betaine, Salicylic Acid (2%), Sodium Chloride, PEG-80 Sorbitan Laurate, C12-15 Alkyl Lactate, Benzalkonium Chloride, Disodium EDTA, Fragrance, Yellow 5, Red 40' },
  'neutrogena deep clean facial cleanser': { brand: 'Neutrogena', name: 'Deep Clean Gentle Foaming Facial Cleanser', formula: 'Water, Glycerin, Myristic Acid, Stearic Acid, Potassium Hydroxide, Lauric Acid, Palmitic Acid, PEG-8, Glyceryl Stearate, Polysorbate 60, Salicylic Acid, Fragrance, Disodium EDTA' },

  // --- COSRX ---
  'cosrx snail mucin': { brand: 'COSRX', name: 'Advanced Snail 96 Mucin Power Essence', formula: 'Snail Secretion Filtrate, Betaine, Caprylic/Capric Triglyceride, Butylene Glycol, 1,2-Hexanediol, Sodium Hyaluronate, Panthenol, Zinc PCA, Allantoin, Ethyl Hexanediol, Sodium Polyacrylate, Carbomer, Phenoxyethanol' },
  'cosrx snail 96': { brand: 'COSRX', name: 'Advanced Snail 96 Mucin Power Essence', formula: 'Snail Secretion Filtrate, Betaine, Caprylic/Capric Triglyceride, Butylene Glycol, 1,2-Hexanediol, Sodium Hyaluronate, Panthenol, Zinc PCA, Allantoin, Ethyl Hexanediol, Sodium Polyacrylate, Carbomer, Phenoxyethanol' },
  'cosrx snail 92 cream': { brand: 'COSRX', name: 'Advanced Snail 92 All in One Cream', formula: 'Snail Secretion Filtrate, Betaine, Caprylic/Capric Triglyceride, Cetearyl Olivate, Sorbitan Olivate, Cetearyl Alcohol, Carbomer, Arginine, Dimethicone, Sodium Polyacrylate, Phenoxyethanol, Sodium Hyaluronate, Stearic Acid, Allantoin, Panthenol, Ethyl Hexanediol, 1,2-Hexanediol' },
  'cosrx bha blackhead power liquid': { brand: 'COSRX', name: 'BHA Blackhead Power Liquid (4% Betaine Salicylate)', formula: 'Salix Alba (Willow) Bark Water, Butylene Glycol, Betaine Salicylate (4%), Niacinamide, 1,2-Hexanediol, Arginine, Panthenol, Sodium Hyaluronate, Xanthan Gum, Ethyl Hexanediol' },
  'cosrx aha 7 whitehead power liquid': { brand: 'COSRX', name: 'AHA 7 Whitehead Power Liquid (7% Glycolic Acid)', formula: 'Pyrus Malus (Apple) Fruit Water, Butylene Glycol, Glycolic Acid (7%), Niacinamide, Sodium Hydroxide, 1,2-Hexanediol, Panthenol, Sodium Hyaluronate, Xanthan Gum, Ethyl Hexanediol' },
  'cosrx aha bha toner': { brand: 'COSRX', name: 'AHA/BHA Clarifying Treatment Toner', formula: 'Water, Salix Alba (Willow) Bark Water, Pyrus Malus (Apple) Fruit Water, Butylene Glycol, 1,2-Hexanediol, Allantoin, Panthenol, Betaine Salicylate, Glycolic Acid' },
  'cosrx low ph cleanser': { brand: 'COSRX', name: 'Low pH Good Morning Gel Cleanser', formula: 'Water, Cocamidopropyl Betaine, Sodium Lauroyl Methyl Isethionate, Polysorbate 20, Styrax Japonicus Branch/Fruit/Leaf Extract, Butylene Glycol, Saccharomyces Ferment, Cryptomeria Japonica Leaf Extract, Nelumbo Nucifera Leaf Extract, Melaleuca Alternifolia (Tea Tree) Leaf Oil, Allantoin, Caprylyl Glycol, Ethylhexylglycerin, Betaine Salicylate, Citric Acid, Disodium EDTA' },
  'cosrx salicylic acid cleanser': { brand: 'COSRX', name: 'Salicylic Acid Daily Gentle Cleanser', formula: 'Water, Glycerin, Myristic Acid, Stearic Acid, Potassium Hydroxide, Lauric Acid, Butylene Glycol, Glycol Distearate, Polysorbate 80, Salicylic Acid, Melaleuca Alternifolia (Tea Tree) Leaf Oil, Sodium Methyl Cocoyl Taurate, Disodium EDTA' },
  'cosrx birch sap lotion': { brand: 'COSRX', name: 'Oil-Free Ultra-Moisturizing Lotion with Birch Sap', formula: 'Betula Platyphylla Japonica Juice (70%), Butylene Glycol, Glycerin, Dimethicone, Betaine, Cetearyl Alcohol, 1,2-Hexanediol, Cetearyl Olivate, Sorbitan Olivate, Sodium Lactate, Ethylhexylglycerin, Sodium Hyaluronate, Allantoin, Panthenol, Xanthan Gum, Melaleuca Alternifolia (Tea Tree) Leaf Oil' },
  'cosrx aloe soothing sun cream': { brand: 'COSRX', name: 'Aloe Soothing Sun Cream SPF 50+ PA+++', formula: 'Water, Ethylhexyl Methoxycinnamate, Glycerin, Propylene Glycol, Cyclopentasiloxane, Phenylbenzimidazole Sulfonic Acid, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Dicaprylyl Carbonate, Isoamyl p-Methoxycinnamate, Potassium Cetyl Phosphate, Alcohol, Dimethicone, Glyceryl Stearate, Butylene Glycol, Titanium Dioxide, C14-22 Alcohols, Cetearyl Alcohol, PEG-100 Stearate, Triethanolamine, Silica, Aloe Arborescens Leaf Extract, Dipotassium Glycyrrhizate, Tocopheryl Acetate, Fragrance' },

  // --- THE ORDINARY ---
  'the ordinary niacinamide': { brand: 'The Ordinary', name: 'Niacinamide 10% + Zinc 1%', formula: 'Aqua (Water), Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin' },
  'the ordinary hyaluronic acid': { brand: 'The Ordinary', name: 'Hyaluronic Acid 2% + B5', formula: 'Aqua (Water), Sodium Hyaluronate, Sodium Hyaluronate Crosspolymer, Panthenol, Ahnfeltia Concinna Extract, Glycerin, Pentylene Glycol, Propanediol, Polyacrylate Crosspolymer-6, PPG-26-Buteth-26, PEG-40 Hydrogenated Castor Oil, Trisodium Ethylenediamine Disuccinate, Citric Acid, Ethoxydiglycol, Caprylyl Glycol, Hexylene Glycol, Ethylhexylglycerin, Phenoxyethanol, Chlorphenesin' },
  'the ordinary peeling solution': { brand: 'The Ordinary', name: 'AHA 30% + BHA 2% Peeling Solution', formula: 'Glycolic Acid, Aqua (Water), Aloe Barbadensis Leaf Water, Sodium Hydroxide, Daucus Carota Sativa Extract, Propanediol, Cocamidopropyl Dimethylamine, Salicylic Acid, Potassium Citrate, Lactic Acid, Tartaric Acid, Citric Acid, Panthenol, Sodium Hyaluronate Crosspolymer, Tasmannia Lanceolata Fruit Extract, Glycerin, Pentylene Glycol, Xanthan Gum, Polysorbate 20, Phenoxyethanol' },
  'the ordinary squalane cleanser': { brand: 'The Ordinary', name: 'Squalane Cleanser Hydrating Facial Wash', formula: 'Squalane, Aqua (Water), Coco-Caprylate/Caprate, Glycerin, Sucrose Stearate, Ethyl Macadamiate, Caprylic/Capric Triglyceride, Hydrogenated Starch Hydrolysate, Sucrose Laurate, Polyacrylate Crosspolymer-6, Isoceteth-20, Sodium Polyacrylate, Tocopherol, Malic Acid, Ethylhexylglycerin, Chlorphenesin' },
  'the ordinary natural moisturizing factors': { brand: 'The Ordinary', name: 'Natural Moisturizing Factors + HA (NMF)', formula: 'Aqua (Water), Caprylic/Capric Triglyceride, Cetyl Alcohol, Propanediol, Stearyl Alcohol, Glycerin, Sodium Hyaluronate, Arginine, Aspartic Acid, Glycine, Alanine, Serine, Valine, Isoleucine, Proline, Threonine, Histidine, Phenylalanine, Glucose, Maltose, Fructose, Trehalose, Sodium PCA, Urea, Allantoin, Linoleic Acid, Oleic Acid, Palmitic Acid, Stearic Acid, Lecithin, Tocopherol, Carbomer, Phenoxyethanol' },
  'the ordinary caffeine solution': { brand: 'The Ordinary', name: 'Caffeine Solution 5% + EGCG Under Eye Serum', formula: 'Aqua (Water), Caffeine, Maltodextrin, Glycerin, Propanediol, Epigallocatechin Gallatyl Glucoside, Gallyl Glucoside, Hyaluronic Acid, Oxidized Glutathione, Melanin, Glycine Soja Seed Extract, Urea, Pentylene Glycol, Hydroxyethylcellulose, Polyacrylate Crosspolymer-6, Xanthan Gum, Lactic Acid, Benzyl Alcohol, Phenoxyethanol' },
  'the ordinary glycolic acid toner': { brand: 'The Ordinary', name: 'Glycolic Acid 7% Exfoliating Toner', formula: 'Aqua (Water), Glycolic Acid, Rosa Damascena Flower Water, Centaurea Cyanus Flower Water, Aloe Barbadensis Leaf Water, Propanediol, Glycerin, Triethanolamine, Aminomethyl Propanol, Panax Ginseng Root Extract, Tasmannia Lanceolata Fruit Extract, Aspartic Acid, Alanine, Glycine, Serine, Valine, Isoleucine, Proline, Threonine, Histidine, Phenylalanine, Glutamic Acid, Arginine, PCA, Sodium PCA, Sodium Lactate, Fructose, Glucose, Sucrose, Urea, Hexyl Nicotinate, Dextrin, Citric Acid, Polysorbate 20, Gellan Gum, Trisodium Ethylenediamine Disuccinate, Sodium Chloride, Hexylene Glycol, Potassium Sorbate, Sodium Benzoate, 1,2-Hexanediol, Caprylyl Glycol' },
  'the ordinary alpha arbutin': { brand: 'The Ordinary', name: 'Alpha Arbutin 2% + HA Serum', formula: 'Aqua (Water), Alpha-Arbutin, Polyacrylate Crosspolymer-6, Hydrolyzed Sodium Hyaluronate, Propanediol, PPG-26-Buteth-26, PEG-40 Hydrogenated Castor Oil, Lactic Acid, Sodium Hydroxide, Hydroxyethylcellulose, Trisodium Ethylenediamine Disuccinate, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin' },
  'the ordinary salicylic acid 2%': { brand: 'The Ordinary', name: 'Salicylic Acid 2% Solution', formula: 'Aqua (Water), Hamamelis Virginiana Leaf Water, Cocamidopropyl Dimethylamine, Salicylic Acid, Dimethyl Isosorbide, Trisodium Ethylenediamine Disuccinate, Citric Acid, Polysorbate 20, Hydroxyethylcellulose, Ethoxydiglycol, Potassium Sorbate, Sodium Benzoate, 1,2-Hexanediol, Caprylyl Glycol' },

  // --- CERAVE ---
  'cerave pm': { brand: 'CeraVe', name: 'PM Facial Moisturizing Lotion (Oil-Free)', formula: 'Aqua / Water, Glycerin, Caprylic/Capric Triglyceride, Niacinamide, Cetearyl Alcohol, Ceramide NP, Ceramide AP, Ceramide EOP, Phytosphingosine, Hyaluronic Acid, Sodium Lauroyl Lactylate, Dimethicone, Carbomer, Xanthan Gum, Cholesterol, Phenoxyethanol, Disodium EDTA' },
  'cerave moisturizing cream': { brand: 'CeraVe', name: 'Moisturizing Cream with 3 Essential Ceramides', formula: 'Aqua / Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Cetyl Alcohol, Ceteareth-20, Petrolatum, Potassium Phosphate, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Dimethicone, Sodium Lauroyl Lactylate, Sodium Hyaluronate, Cholesterol, Phenoxyethanol, Disodium EDTA, Dipotassium Phosphate, Tocopherol, Phytosphingosine, Xanthan Gum' },
  'cerave hydrating cleanser': { brand: 'CeraVe', name: 'Hydrating Facial Cleanser for Normal to Dry Skin', formula: 'Aqua / Water, Glycerin, Cetearyl Alcohol, Peg-40 Stearate, Stearyl Alcohol, Potassium Phosphate, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Glyceryl Stearate, Behentrimonium Methosulfate, Sodium Lauroyl Lactylate, Sodium Hyaluronate, Cholesterol, Phenoxyethanol, Disodium EDTA, Dipotassium Phosphate, Tocopherol, Phytosphingosine, Xanthan Gum' },
  'cerave sa cleanser': { brand: 'CeraVe', name: 'SA Smoothing Cleanser with Salicylic Acid', formula: 'Aqua / Water, Sodium Lauroyl Sarcosinate, Cocamidopropyl Hydroxysultaine, Glycerin, Niacinamide, Gluconolactone, Sodium Methyl Cocoyl Taurate, PEG-150 Pentaerythrityl Tetrastearate, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Calcium Gluconate, Salicylic Acid, Sodium Benzoate, Sodium Lauroyl Lactylate, Cholesterol, Phenoxyethanol, Disodium EDTA, Tetrasodium EDTA, Hydrolyzed Hyaluronic Acid, Phytosphingosine, Xanthan Gum, Ethylhexylglycerin' },
  'cerave foaming cleanser': { brand: 'CeraVe', name: 'Foaming Facial Cleanser for Normal to Oily Skin', formula: 'Aqua / Water, Cocamidopropyl Hydroxysultaine, Glycerin, Sodium Lauroyl Sarcosinate, Propanediol, PEG-150 Pentaerythrityl Tetrastearate, Niacinamide, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Triethyl Citrate, Sodium Chloride, Sodium Hydroxide, Sodium Hyaluronate, Sodium Lauroyl Lactylate, Cholesterol, Phenoxyethanol, Citric Acid, Disodium EDTA, Phytosphingosine, Xanthan Gum' },
  'cerave resurfacing retinol': { brand: 'CeraVe', name: 'Resurfacing Retinol Serum for Post-Acne Marks', formula: 'Aqua / Water, Propanediol, Dimethicone, Cetearyl Ethylhexanoate, Niacinamide, Ammonium Polyacryloyldimethyl Taurate, Dipotassium Glycyrrhizate, Hydrogenated Lecithin, Potassium Phosphate, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Cetearyl Alcohol, Behentrimonium Methosulfate, Dimethiconol, Lecithin, Sodium Citrate, Retinol, Sodium Hyaluronate, Sodium Lauroyl Lactylate, Cholesterol, Phenoxyethanol, Alcohol, Tocopherol, Citric Acid, Disodium EDTA, Phytosphingosine, Xanthan Gum, Ethylhexylglycerin' },

  // --- BEAUTY OF JOSEON ---
  'beauty of joseon sunscreen': { brand: 'Beauty of Joseon', name: 'Relief Sun: Rice + Probiotics SPF50+ PA++++', formula: 'Water, Oryza Sativa (Rice) Extract (30%), Dibutyl Adipate, Propanediol, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Polymethylsilsesquioxane, Ethylhexyl Triazone, Niacinamide, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Coco-Caprylate/Caprate, Caprylyl Methicone, Diethylhexyl Butamido Triazone, Glycerin, Butylene Glycol, Oryza Sativa Germ Extract, Camellia Sinensis Leaf Extract, Lactobacillus/Pumpkin Ferment Extract, Bacillus/Soybean Ferment Extract, Saccharum Officinarum Extract, Macrocystis Pyrifera Extract, Cocos Nucifera Fruit Extract, Panax Ginseng Root Extract, Monascus/Rice Ferment, Pentylene Glycol, Behenyl Alcohol, Poly C10-30 Alkyl Acrylate, Decyl Glucoside, Tromethamine, Carbomer, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, 1,2-Hexanediol, Sodium Stearoyl Glutamate, Polyacrylate Crosspolymer-6, Ethylhexylglycerin, Adenosine, Xanthan Gum, Tocopherol' },
  'beauty of joseon glow serum': { brand: 'Beauty of Joseon', name: 'Glow Serum: Propolis + Niacinamide', formula: 'Propolis Extract (60%), Dipropylene Glycol, Glycerin, Butylene Glycol, Water, Niacinamide (2%), 1,2-Hexanediol, Melia Azadirachta Flower Extract, Melia Azadirachta Leaf Extract, Sodium Hyaluronate, Curcuma Longa (Turmeric) Root Extract, Ocimum Sanctum Leaf Extract, Theobroma Cacao (Cocoa) Seed Extract, Melaleuca Alternifolia (Tea Tree) Extract, Centella Asiatica Extract, Corallina Officinalis Extract, Lotus Corniculatus Seed Extract, Calophyllum Inophyllum Seed Oil, Betaine Salicylate (0.5%), Sodium Polyacryloyldimethyl Taurate, Tromethamine, Carbomer, Disodium EDTA' },
  'beauty of joseon dynasty cream': { brand: 'Beauty of Joseon', name: 'Dynasty Cream Royal Moisture Barrier', formula: 'Water, Oryza Sativa (Rice) Bran Water, Glycerin, Panax Ginseng Root Water, Hydrogenated Polydecene, 1,2-Hexanediol, Niacinamide, Squalane, Butylene Glycol, Propanediol, Dicaprylyl Carbonate, Cetearyl Olivate, Sorbitan Olivate, Ammonium Acryloyldimethyltaurate/VP Copolymer, Xanthan Gum, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Tromethamine, Adenosine, Disodium EDTA, Sodium Hyaluronate, Ceramide NP, Tocopherol' },
  'beauty of joseon revive eye serum': { brand: 'Beauty of Joseon', name: 'Revive Eye Serum: Ginseng + Retinal', formula: 'Water, Panax Ginseng Root Extract, Glycerin, Dipropylene Glycol, Caprylic/Capric Triglyceride, 1,2-Hexanediol, Pentaerythrityl Tetraethylhexanoate, Niacinamide, Butylene Glycol Dicaprylate/Dicaprate, Cetearyl Alcohol, Sorbitan Olivate, Cetearyl Olivate, Butylene Glycol, Hydrogenated Lecithin, Tromethamine, Carbomer, Glyceryl Stearate, Macadamia Ternifolia Seed Oil, Retinal, Theobroma Cacao Seed Extract, Sodium Hyaluronate, Cholesterol, Ceramide NP, Tocopherol, Disodium EDTA' },
  'beauty of joseon ginseng water': { brand: 'Beauty of Joseon', name: 'Ginseng Essence Water', formula: 'Panax Ginseng Root Water (80%), Butylene Glycol, Glycerin, Propanediol, Niacinamide (2%), 1,2-Hexanediol, Water, Hydroxyacetophenone, Glyceryl Glucoside, Xantham Gum, Panthenol, Dipotassium Glycyrrhizate, Allantoin, Panax Ginseng Callus Culture Extract, Dextrin, Theobroma Cacao Seed Extract, Disodium EDTA, Glucose, Panax Ginseng Berry Extract, Ethylhexylglycerin, Sodium Hyaluronate' },

  // --- PAULA'S CHOICE ---
  'paula choice bha': { brand: "Paula's Choice", name: 'Skin Perfecting 2% BHA Liquid Exfoliant', formula: 'Water (Aqua), Methylpropanediol, Butylene Glycol, Salicylic Acid (2%), Polysorbate 20, Camellia Sinensis (Green Tea) Leaf Extract, Sodium Hydroxide, Tetrasodium EDTA' },
  'paula choice azelaic acid': { brand: "Paula's Choice", name: '10% Azelaic Acid Booster for Redness & Blemishes', formula: 'Water (Aqua), Azelaic Acid (10%), C12-15 Alkyl Benzoate, Caprylic/Capric Triglyceride, Methyl Glucose Sesquistearate, Glycerin, Cetearyl Alcohol, Glyceryl Stearate, Dimethicone, Salicylic Acid (0.5%), Adenosine, Glycyrrhiza Glabra (Licorice) Root Extract, Allantoin, Boerhavia Diffusa Root Extract, Cyclopentasiloxane, Isohexadecane, Cyclohexasiloxane, Butylene Glycol, Xanthan Gum, Sclerotium Gum, Propanediol, Phenoxyethanol' },
  'paula choice c15 super booster': { brand: "Paula's Choice", name: 'C15 Super Booster 15% Vitamin C + Ferulic Acid', formula: 'Water (Aqua), Ascorbic Acid (15%), Butylene Glycol, Ethoxydiglycol, Glycerin, PPG-26-Buteth-26, PEG-40 Hydrogenated Castor Oil, Pentylene Glycol, Tocopherol, Sodium Hyaluronate, Hexanoyl Dipeptide-3 Norleucine Acetate, Lecithin, Ferulic Acid, Panthenol, Bisabolol, Oryza Sativa Bran Extract, Propyl Gallate, Sodium Gluconate, Sodium Hydroxide, Phenoxyethanol, Ethylhexylglycerin' },

  // --- LA ROCHE-POSAY ---
  'la roche posay cicaplast': { brand: 'La Roche-Posay', name: 'Cicaplast Baume B5+ Soothing Multi-Purpose Cream', formula: 'Aqua / Water, Hydrogenated Polyisobutene, Dimethicone, Glycerin, Butyrospermum Parkii Butter / Shea Butter, Panthenol, Propanediol, Butylene Glycol, Aluminum Starch Octenylsuccinate, Cetyl PEG/PPG-10/1 Dimethicone, Trihydroxystearin, Zinc Gluconate, Madecassoside, Manganese Gluconate, Silica, Aluminum Hydroxide, Magnesium Sulfate, Disodium EDTA, Copper Gluconate, Capryloyl Glycine, Citric Acid, Acetylated Glycol Stearate, Polyglyceryl-4 Isostearate, Tocopherol' },
  'la roche posay effaclar gel': { brand: 'La Roche-Posay', name: 'Effaclar Purifying Foaming Gel Cleanser', formula: 'Aqua / Water, Sodium Laureth Sulfate, PEG-8, Coco-Betaine, Hexylene Glycol, Sodium Chloride, PEG-120 Methyl Glucose Dioleate, Zinc PCA, Sodium Hydroxide, Citric Acid, Sodium Benzoate, Phenoxyethanol, Caprylyl Glycol, Parfum / Fragrance' },
  'la roche posay anthelios spf 50': { brand: 'La Roche-Posay', name: 'Anthelios UVMune 400 Invisible Fluid SPF50+', formula: 'Aqua / Water, Alcohol Denat, Triethyl Citrate, Diisopropyl Sebacate, Silica, Ethylhexyl Salicylate, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Ethylhexyl Triazone, Butyl Methoxydibenzoylmethane, Glycerin, Propanediol, C12-22 Alkyl Acrylate/Hydroxyethylacrylate Copolymer, Methoxypropylamino Cyclohexenylidene Ethoxyethylcyanoacetate, Drometrizole Trisiloxane, Tocopherol, Caprylic/Capric Triglyceride, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Caprylyl Glycol, Hydroxyethylcellulose, Triethanolamine, Trisodium Ethylenediamine Disuccinate' },

  // --- ANUA ---
  'anua heartleaf toner': { brand: 'Anua', name: 'Heartleaf 77% Soothing Toner', formula: 'Houttuynia Cordata Extract (77%), Purified Water, 1,2-Hexanediol, Glycerin, Betaine, Panthenol, Saccharum Officinarum (Sugarcane) Extract, Portulaca Oleracea Extract, Butylene Glycol, Vitex Agnus-Castus Extract, Chamomilla Recutita (Matricaria) Flower Extract, Arctium Lappa Root Extract, Phellinus Linteus Extract, Vitis Vinifera (Grape) Fruit Extract, Apple Fruit Extract, Centella Asiatica Extract, Isopentyldiol, Methylpropanediol, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Tromethamine, Disodium EDTA' },
  'anua cleansing oil': { brand: 'Anua', name: 'Heartleaf Pore Control Cleansing Oil', formula: 'Ethylhexyl Palmitate, Sorbeth-30 Tetraoleate, Sorbitan Sesquioleate, Caprylic/Capric Triglyceride, Butyl Avocadate, Fragrance, Helianthus Annuus (Sunflower) Seed Oil, Macadamia Ternifolia Seed Oil, Olea Europaea (Olive) Fruit Oil, Simmondsia Chinensis (Jojoba) Seed Oil, Vitis Vinifera (Grape) Seed Oil, Caprylyl Glycol, Ethylhexylglycerin, Curcuma Longa (Turmeric) Root Extract, Melia Azadirachta Flower Extract, Tocopherol, Melia Azadirachta Leaf Extract, Houttuynia Cordata Extract, Corallina Officinalis Extract, Melia Azadirachta Bark Extract, Ocimum Sanctum Leaf Extract' },
  'anua niacinamide 10 serum': { brand: 'Anua', name: 'Niacinamide 10% + TXA 4% Dark Spot Correcting Serum', formula: 'Water, Glycerin, Niacinamide (10%), Tranexamic Acid (4%), Butylene Glycol, Diethoxyethyl Succinate, 1,2-Hexanediol, Arbutin, Sodium Hyaluronate, Alpha-Arbutin, Coccinia Indica Fruit Extract, Eclipta Prostrata Extract, Macadamia Integrifolia Seed Oil, Olea Europaea Fruit Oil, Simmondsia Chinensis Seed Oil, Vitis Vinifera Seed Oil, Theobroma Cacao Extract, Glutathione, Ceramide NP, Panthenol, Disodium EDTA' },

  // --- BIODERMA ---
  'bioderma sensibio micellar water': { brand: 'Bioderma', name: 'Sensibio H2O Micellar Water Make-Up Remover', formula: 'Aqua/Water/Eau, PEG-6 Caprylic/Capric Glycerides, Fructooligosaccharides, Mannitol, Xylitol, Rhamnose, Cucumis Sativus (Cucumber) Fruit Extract, Propylene Glycol, Cetrimonium Bromide, Disodium EDTA' },
  'bioderma sebium gel cleanser': { brand: 'Bioderma', name: 'Sebium Gel Moussant Purifying Cleansing Gel', formula: 'Aqua/Water/Eau, Sodium Cocoamphoacetate, Sodium Laureth Sulfate, Methylpropanediol, Disodium EDTA, Mannitol, Xylitol, Rhamnose, Fructooligosaccharides, Zinc Sulfate, Copper Sulfate, Ginkgo Biloba Leaf Extract, PEG-90 Glyceryl Isostearate, Lactic Acid, Laureth-2, Potassium Sorbate, Sodium Chloride, Propylene Glycol, Sodium Hydroxide, Fragrance' },
  'bioderma atoderm intensive baume': { brand: 'Bioderma', name: 'Atoderm Intensive Baume Ultra-Soothing Balm', formula: 'Aqua/Water/Eau, Glycerin, Mineral Oil (Paraffinum Liquidum), Helianthus Annuus (Sunflower) Seed Oil, Behenyl Alcohol, Sucrose Stearate, Canola Oil, Hydroxyethyl Acrylate/Sodium Acryloyldimethyl Taurate Copolymer, Niacinamide, Zinc PCA, Mannitol, Xylitol, Rhamnose, Ceramide NP, Phytosphingosine, Ethylhexylglycerin, Disodium EDTA' },

  // --- AVENE ---
  'avene cicalfate cream': { brand: 'Avene', name: 'Cicalfate+ Restorative Protective Cream', formula: 'Avene Thermal Spring Water, Caprylic/Capric Triglyceride, Mineral Oil, Glycerin, Hydrogenated Vegetable Oil, Zinc Oxide, Propylene Glycol, Polyglyceryl-2 Sesquiisostearate, PEG-22/Dodecyl Glycol Copolymer, Aluminum Stearate, Aquaphilus Dolomiae Ferment Filtrate, Arginine, Beeswax, Copper Sulfate, Magnesium Stearate, Magnesium Sulfate, Microcrystalline Wax, Tromethamine, Zinc Sulfate' },
  'avene thermal spring water': { brand: 'Avene', name: 'Thermal Spring Water Soothing Spray', formula: 'Avene Thermal Spring Water, Nitrogen' },

  // --- KIEHL'S ---
  'kiehls ultra facial cream': { brand: "Kiehl's", name: 'Ultra Facial Cream 24-Hour Daily Hydration', formula: 'Aqua / Water, Glycerin, Cyclohexasiloxane, Squalane, Bis-PEG-18 Methyl Ether Dimethyl Silane, Sucrose Stearate, Stearyl Alcohol, PEG-8 Stearate, Myristyl Myristate, Pentaerythrityl Tetraethylhexanoate, Prunus Armeniaca Kernel Oil, Phenoxyethanol, Persea Gratissima Oil, Cetyl Alcohol, Glyceryl Stearate, Oryza Sativa Bran Oil, Olea Europaea Fruit Oil, Chlorphenesin, Stearic Acid, Palmitic Acid, Disodium EDTA, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Carbomer, Prunus Amygdalus Dulcis Oil, Pseudoalteromonas Ferment Extract, Sodium Hydroxide, Tocopherol' },
  'kiehls midnight recovery concentrate': { brand: "Kiehl's", name: 'Midnight Recovery Concentrate Botanical Oil', formula: 'Caprylic/Capric Triglyceride, Dicaprylyl Carbonate, Squalane, Rosa Canina Fruit Oil, Oenothera Biennis Oil, Simmondsia Chinensis Seed Oil, Coriandrum Sativum Seed Oil, Tocopherol, Lavandula Angustifolia Oil, Pelargonium Graveolens Flower Oil, Linalool, Rosmarinus Officinalis Leaf Oil, Citronellol, Geraniol, Lavandula Hybrida Oil, Cucumis Sativus Fruit Extract, Curcuma Longa Root Extract, Limonene, Citral' },

  // --- LANEIGE ---
  'laneige lip sleeping mask': { brand: 'Laneige', name: 'Lip Sleeping Mask Intense Moisture (Berry)', formula: 'Diisostearyl Malate, Hydrogenated Polyisobutene, Phytosteryl/Isostearyl/Cetyl/Stearyl/Behenyl Dimer Dilinoleate, Hydrogenated Poly(C6-14 Olefin), Polybutene, Microcrystalline Wax, Butyrospermum Parkii (Shea) Butter, Synthetic Wax, Euphorbia Cerifera (Candelilla) Wax, Sucrose Tetrastearate Triacetate, Butylene/Ethylene/Styrene Copolymer, Ethylene/Propylene/Styrene Copolymer, Mica, Astrocaryum Murumuru Seed Butter, Titanium Dioxide, Dimethicone, Fragrance, Polyglyceryl-2 Diisostearate, Dehydroacetic Acid, Methicone, Copernicia Cerifera Wax, Yellow 6 Lake, Red 6, Water, Potassium Alginate, Glycerin, Propanediol, BHT, Alcohol, Phenoxyethanol, Sodium Hyaluronate, Beta-Glucan, Ascorbyl Glucoside' },
  'laneige water bank cream': { brand: 'Laneige', name: 'Water Bank Blue Hyaluronic Cream', formula: 'Water / Aqua / Eau, Butylene Glycol, Glycerin, Squalane, Sucrose Polystearate, Pentaerythrityl Tetraethylhexanoate, Methyl Trimethicone, Dicaprylyl Ether, Betaine, Cetearyl Alcohol, 1,2-Hexanediol, Dimethicone, Niacinamide, Hydrolyzed Hyaluronic Acid, Lactobacillus Ferment Lysate, Ceramide NP, Tocopherol' },

  // --- SKIN1004 ---
  'skin1004 centella ampoule': { brand: 'Skin1004', name: 'Madagascar Centella Ampoule (100% Cica)', formula: 'Centella Asiatica Extract (100%), Water, Glycerin, Butylene Glycol, 1,2-Hexanediol, Ethylhexylglycerin' },
  'skin1004 centella sunscreen': { brand: 'Skin1004', name: 'Madagascar Centella Hyalu-Cica Water-Fit Sun Serum SPF50+', formula: 'Water, Dibutyl Adipate, Propanediol, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Polymethylsilsesquioxane, Ethylhexyl Triazone, Methylene Bis-Benzotriazolyl Tetramethylbutylphenol, Niacinamide, Coco-Caprylate/Caprate, Caprylyl Methicone, Diethylhexyl Butamido Triazone, Glycerin, 1,2-Hexanediol, Butylene Glycol, Centella Asiatica Extract, Sodium Hyaluronate, Behenyl Alcohol, Decyl Glucoside, Tromethamine, Carbomer, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Sodium Stearoyl Glutamate, Polyacrylate Crosspolymer-6, Ethylhexylglycerin, Adenosine, Xanthan Gum, Tocopherol' },

  // --- HADA LABO ---
  'hada labo gokujyun lotion': { brand: 'Hada Labo', name: 'Gokujyun Premium Hyaluronic Acid Lotion', formula: 'Water, Butylene Glycol, Hydroxyethyl Urea, Pentylene Glycol, PPG-10 Methyl Glucose Ether, Dipropylene Glycol, Diglycerin, Sodium Hyaluronate, Hydrolyzed Hyaluronic Acid, Sodium Acetylated Hyaluronate, Hydroxypropyltrimonium Hyaluronate, Sodium Hyaluronate Crosspolymer, Lactococcus/Hyaluronic Acid Ferment Filtrate, Hydrolyzed Sodium Hyaluronate, Disodium Succinate, Succinic Acid, Carbomer, Phenoxyethanol' },

  // --- DR. JART+ ---
  'dr jart cicapair cream': { brand: 'Dr. Jart+', name: 'Cicapair Tiger Grass Color Correcting Treatment SPF 30', formula: 'Centella Asiatica Leaf Water, Isononyl Isononanoate, Titanium Dioxide, Cyclopentasiloxane, Butylene Glycol, Dimethicone, Phenyl Trimethicone, Zinc Oxide, Methyl Methacrylate Crosspolymer, Niacinamide, PEG-10 Dimethicone, Madecassoside, Asiaticoside, Centella Asiatica Extract, Sodium Chloride, Disteardimonium Hectorite, Aluminum Hydroxide, Stearic Acid, Chlorphenesin, Phenoxyethanol, Ethylhexylglycerin, Adenosine, Lavandula Angustifolia Oil, Citrus Grandis Peel Oil, Rosmarinus Officinalis Leaf Oil, Houttuynia Cordata Extract' },
  'dr jart ceramidin cream': { brand: 'Dr. Jart+', name: 'Ceramidin Skin Barrier Moisturizing Cream (5 Ceramides)', formula: 'Aqua, Glycerin, Dipropylene Glycol, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Hydrogenated Poly(C6-14 Olefin), Hydrogenated Polydecene, Methyl Trimethicone, 1,2-Hexanediol, Bifida Ferment Lysate, Vegetable Oil, Butyrospermum Parkii Butter, Glyceryl Stearate SE, Ceramide NP, Ceramide AP, Ceramide AS, Ceramide NS, Ceramide EOP, Squalane, Sodium Hyaluronate, Pelargonium Graveolens Flower Oil, Salvia Officinalis Oil, Pogostemon Cablin Oil, Citrus Aurantium Bergamia Fruit Oil' }
};

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
    const fullSearchStr = `${brandLower} ${nameLower} ${cleanKey}`;

    let score = 0;

    // 1. Exact Key match
    if (cleanKey === cleanQ) score += 150;
    else if (fullSearchStr.includes(cleanQ)) score += 100;
    else if (cleanQ.includes(cleanKey)) score += 80;
    else {
      // 2. Multi-word intersection
      let matchedCount = 0;
      for (const word of qWords) {
        if (fullSearchStr.includes(word)) {
          matchedCount++;
          // Extra boost for brand match
          if (brandLower.includes(word)) score += 20;
          // Extra boost for product type (gel, cream, cleanser, sunscreen, bha, niacinamide)
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
        score
      };
    }
  }

  return highestScore >= 35 ? bestMatch : null;
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
    const fullSearchStr = `${brandLower} ${nameLower} ${cleanKey}`;

    let matches = true;
    let score = 0;

    if (fullSearchStr.includes(cleanQ)) {
      score += 100;
    } else {
      for (const word of qWords) {
        if (!fullSearchStr.includes(word)) {
          matches = false;
          break;
        }
        score += 20;
      }
    }

    if (matches || score > 40) {
      results.push({
        key,
        brand: item.brand,
        name: item.name,
        formula: item.formula,
        score
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

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

// Levenshtein Distance for OCR typo tolerance
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1)
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Packaging Stop Words & Noise Dictionary
const PACKAGING_STOP_WORDS = new Set([
  'usage', 'instruction', 'instructions', 'apply', 'twice', 'daily', 'results', 'design', 'regd', 'no',
  'expiry', 'months', 'manufactured', 'mfg', 'mfd', 'mrp', 'taxes', 'usp', 'base', 'hul', 'thickness',
  'packaging', 'micron', 'best', 'store', 'cool', 'dry', 'place', 'external', 'reach', 'children',
  'fl oz', 'net wt', 'net vol', 'made in', 'batch', 'licence', 'license', 'registered', 'trademark',
  'imported', 'marketed', 'distributor', 'pon', 'brin', 'inst', 'rredients', 'catsonrs', 'see base',
  'for best results', 'thickness of the packaging', 'minimum thickness', 'apply twice daily',
  'caution', 'warning', 'keep out', 'avoid contact with eyes', 'dermatologically tested'
]);

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

  // 1. Find Start Boundary (e.g. "INGREDIENTS:", "CONTENTS:", "INCI:")
  const startRegex = /(?:full\s+ingredients?|active\s+ingredients?|inactive\s+ingredients?|ingredients?|contains?|contents?|composition|inci)\s*[:;\-\.]\s*/i;
  const startMatch = cleaned.match(startRegex);
  if (startMatch) {
    cleaned = cleaned.substring(startMatch.index + startMatch[0].length);
  }

  // 2. Find End Boundary (e.g. "USAGE INSTRUCTIONS:", "EXPIRY:", "MRP:", "CAUTION:", etc.)
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

// Master Formulation Parser
function analyzeINCIFormulation(inputText) {
  if (!inputText || !inputText.trim()) {
    return { error: 'Empty ingredient input' };
  }

  let text = inputText.trim();
  let resolvedProductName = null;
  let resolvedBrand = null;

  // 1. Check if user entered a product name or brand query first
  const productMatch = searchProductCatalog(text);
  if (productMatch) {
    resolvedProductName = `${productMatch.brand} · ${productMatch.name}`;
    resolvedBrand = productMatch.brand;
    text = productMatch.formula;
  } else {
    // Extract purely the ingredient section if it is packaging OCR text
    const extractedSection = extractIngredientSection(text);
    if (extractedSection && extractedSection.length >= 3) {
      text = extractedSection;
    }
  }

  // 2. Tokenize by commas, semicolons, bullets, slashes, or newlines
  const rawTokens = text.split(/[,;\n\/\•\·\*\+]+/).map(s => s.trim().replace(/\.$/, '')).filter(s => s.length > 1);

  let highCloggers = 0;
  let fungalTriggers = 0;
  let sensitizers = 0;
  let safeCount = 0;
  let totalScore = 100;

  const parsedItems = [];
  const seenMatches = new Set();

  rawTokens.forEach(token => {
    // Normalize punctuation, percentages, and parentheticals
    let cleanToken = token.toLowerCase()
      .replace(/[»«©®™£€¥$#*~|{}_=\\\[\]\<\>]/g, '')
      .replace(/[\(\)\*\d%\.\+]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (cleanToken.length < 3) return;

    // Check if token is packaging noise / stop word
    let isStop = false;
    for (const stop of PACKAGING_STOP_WORDS) {
      if (cleanToken === stop || cleanToken.startsWith(stop + ' ') || cleanToken.endsWith(' ' + stop)) {
        isStop = true;
        break;
      }
    }
    if (isStop) return;

    // Letter ratio check (must be at least 65% alphabetic)
    const letterCount = (cleanToken.match(/[a-z]/g) || []).length;
    if (letterCount / cleanToken.length < 0.65) return;

    // Strip trailing OCR noise syllables (e.g. " ro", " b", " j")
    cleanToken = cleanToken.replace(/\b[a-z]{1,2}\b/g, '').replace(/\s+/g, ' ').trim();
    if (cleanToken.length < 3) return;

    let match = null;
    let matchedKey = cleanToken;

    // 1. Direct match in Knowledge Base
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

    // 3. Fuzzy Levenshtein Distance Matching (tolerates 1-2 character OCR reading errors)
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

    // 4. Cosmetic morphology validation (e.g. unknown botanical extract)
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

    // CRITICAL: If no cosmetic match is found, THIS IS NOISE / NON-INGREDIENT. DISCARD IT!
    if (!match) {
      return;
    }

    // Prevent duplicate entries in same scan
    if (seenMatches.has(matchedKey)) {
      return;
    }
    seenMatches.add(matchedKey);

    // Apply clinical weighting
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
    verdictDescription = `Found ${highCloggers} high-comedogenic (rating 4-5) ingredients likely to trigger microcomedones and pore congestion.`;
  } else if (highCloggers === 1) {
    verdict = '⚠️ Caution: Contains 1 Pore Clogger';
    verdictClass = 'warn';
    verdictDescription = 'Contains 1 potential comedogenic ingredient. Monitor acne-prone areas.';
  } else if (sensitizers >= 2) {
    verdict = '⚠️ High Sensitizer / Allergen Load';
    verdictClass = 'warn';
    verdictDescription = `Zero pore cloggers, but contains ${sensitizers} fragrance allergens/sensitizers (EU 26). May trigger redness or contact dermatitis on sensitive skin.`;
  } else if (sensitizers === 1 || fungalTriggers >= 1) {
    verdict = '⚠️ Caution: Potential Triggers';
    verdictClass = 'warn';
    verdictDescription = `Contains ${sensitizers > 0 ? sensitizers + ' fragrance sensitizer' : ''}${sensitizers > 0 && fungalTriggers > 0 ? ' and ' : ''}${fungalTriggers > 0 ? fungalTriggers + ' fungal acne lipid trigger(s)' : ''}.`;
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
  extractIngredientSection,
  searchProductCatalog,
  getProductSuggestions,
  PRODUCT_CATALOG,
  INCI_KNOWLEDGE_BASE
};

export type Locale = 'en' | 'fr';

export type TaxonomyAxis = {
  id: string;
  name: { en: string; fr: string };
  slug: string;
  type: 'hierarchy' | 'facets';
  children?: TaxonomyNode[];
};

export type TaxonomyNode = {
  slug: string;
  name: { en: string; fr: string };
  children?: TaxonomyNode[];
};

export type GoldenSeedSchema = {
  schema_version: string;
  created_at: string;
  locale_support: Locale[];
  golden_seed: {
    meta: {
      id: string;
      name: { en: string; fr: string };
      description: { en: string; fr: string };
    };
    axes: TaxonomyAxis[];
    mapping_guidance: { en: string; fr: string };
  };
};

// LUCCCA Golden Seed taxonomy (bilingual)
export const LUCCCA_TAXONOMY: GoldenSeedSchema['golden_seed'] = {
  meta: {
    id: 'luccca-recipe-taxonomy',
    name: { en: 'LUCCCA Recipe Taxonomy', fr: 'Taxonomie des Recettes LUCCCA' },
    description: {
      en: 'Professional culinary and pastry taxonomy aligned to classical brigade and modern global operations.',
      fr: 'Taxonomie professionnelle de cuisine et de pâtisserie, alignée sur la brigade classique et les opérations modernes.',
    },
  },
  axes: [
    {
      id: 'course',
      name: { en: 'Course', fr: 'Service / Plat' },
      slug: 'course',
      type: 'hierarchy',
      children: [
        {
          slug: 'amuse-appetizers',
          name: { en: 'Amuse & Appetizers', fr: 'Amuse-bouche & Entrées' },
          children: [
            { slug: 'amuse-bouche', name: { en: 'Amuse-bouche', fr: 'Amuse-bouche' } },
            { slug: 'canapes', name: { en: 'Canapés', fr: 'Canapés' } },
            { slug: 'cold-appetizers', name: { en: 'Cold Appetizers', fr: 'Entrées froides' } },
            { slug: 'hot-appetizers', name: { en: 'Hot Appetizers', fr: 'Entrées chaudes' } },
          ],
        },
        {
          slug: 'soups',
          name: { en: 'Soups', fr: 'Potages / Soupes' },
          children: [
            { slug: 'consomme-clear', name: { en: 'Consommé & Clear', fr: 'Consommé & Clairs' } },
            { slug: 'bisques', name: { en: 'Bisques', fr: 'Bisques' } },
            { slug: 'purees-veloutes', name: { en: 'Purées & Veloutés', fr: 'Purées & Veloutés' } },
            { slug: 'chowders', name: { en: 'Chowders', fr: 'Chaudes crémées (Chowders)' } },
            { slug: 'regional-soups', name: { en: 'Regional Soups', fr: 'Soupes régionales' } },
          ],
        },
        {
          slug: 'salads',
          name: { en: 'Salads', fr: 'Salades' },
          children: [
            { slug: 'composed-salads', name: { en: 'Composed', fr: 'Composées' } },
            { slug: 'tossed-salads', name: { en: 'Tossed', fr: 'Mélangées' } },
            { slug: 'grain-legume-salads', name: { en: 'Grain & Legume', fr: 'Céréales & Légumineuses' } },
            { slug: 'protein-salads', name: { en: 'Protein Salads', fr: 'Salades protéinées' } },
          ],
        },
        {
          slug: 'eggs-cheese',
          name: { en: 'Egg & Cheese', fr: 'Œufs & Fromages' },
          children: [
            { slug: 'omelets-frittatas', name: { en: 'Omelets & Frittatas', fr: 'Omelettes & Frittatas' } },
            { slug: 'quiches-savory-tarts', name: { en: 'Quiches & Savory Tarts', fr: 'Quiches & Tartes salées' } },
            { slug: 'souffles-savory', name: { en: 'Savory Soufflés', fr: 'Soufflés salés' } },
            { slug: 'savory-custards-flans', name: { en: 'Savory Custards & Flans', fr: 'Crèmes & Flans salés' } },
          ],
        },
        {
          slug: 'fish-shellfish',
          name: { en: 'Fish & Shellfish', fr: 'Poissons & Fruits de mer' },
          children: [
            { slug: 'finfish', name: { en: 'Finfish', fr: 'Poissons' } },
            { slug: 'shellfish', name: { en: 'Shellfish', fr: 'Crustacés & Mollusques' } },
            { slug: 'caviar-roe', name: { en: 'Caviar & Roe', fr: 'Caviar & Œufs de poisson' } },
            { slug: 'regional-seafood', name: { en: 'Regional Seafood Classics', fr: "Classiques régionaux de la mer" } },
          ],
        },
        {
          slug: 'meat-poultry-game',
          name: { en: 'Meat, Poultry & Game', fr: 'Viandes, Volaille & Gibier' },
          children: [
            { slug: 'beef', name: { en: 'Beef', fr: 'Bœuf' } },
            { slug: 'veal', name: { en: 'Veal', fr: 'Veau' } },
            { slug: 'lamb', name: { en: 'Lamb', fr: 'Agneau' } },
            { slug: 'pork', name: { en: 'Pork', fr: 'Porc' } },
            { slug: 'poultry', name: { en: 'Poultry', fr: 'Volaille' } },
            { slug: 'game-meats', name: { en: 'Game', fr: 'Gibier' } },
          ],
        },
        {
          slug: 'vegetable-grain-legume-entrees',
          name: { en: 'Vegetable, Grain & Legume Entrées', fr: 'Plats de Légumes, Céréales & Légumineuses' },
        },
        {
          slug: 'pasta-dumplings-starches',
          name: { en: 'Pasta, Dumplings & Starches', fr: 'Pâtes, Raviolis & Féculents' },
          children: [
            { slug: 'fresh-pasta', name: { en: 'Fresh Pasta', fr: 'Pâtes fraîches' } },
            { slug: 'dry-pasta', name: { en: 'Dried Pasta', fr: 'Pâtes sèches' } },
            { slug: 'dumplings-gnocchi', name: { en: 'Dumplings & Gnocchi', fr: 'Raviolis & Gnocchis' } },
            { slug: 'potato-root', name: { en: 'Potato & Root', fr: 'Pommes de terre & Racines' } },
          ],
        },
        { slug: 'sauces-condiments', name: { en: 'Sauces & Condiments', fr: 'Sauces & Condiments' } },
        { slug: 'breads-savory-baking', name: { en: 'Breads & Savory Baking', fr: 'Pains & Boulangerie salée' } },
        {
          slug: 'banquet-buffet',
          name: { en: 'Banquet & Buffet', fr: 'Banquet & Buffet' },
          children: [
            { slug: 'carving-station', name: { en: 'Carving Station', fr: 'Atelier de découpe' } },
            { slug: 'composed-platters', name: { en: 'Composed Platters', fr: 'Plateaux composés' } },
            { slug: 'action-stations', name: { en: 'Action Stations', fr: 'Stations animées' } },
          ],
        },
        {
          slug: 'desserts',
          name: { en: 'Desserts', fr: 'Desserts' },
          children: [
            { slug: 'petits-fours', name: { en: 'Petits Fours', fr: 'Petits fours' } },
            { slug: 'plated-desserts', name: { en: 'Plated Desserts', fr: "Desserts à l’assiette" } },
            { slug: 'buffet-desserts', name: { en: 'Buffet Desserts', fr: 'Desserts de buffet' } },
          ],
        },
        { slug: 'cheese-fruit', name: { en: 'Cheese & Fruit', fr: 'Fromages & Fruits' } },
      ],
    },
    {
      id: 'pastry',
      name: { en: 'Pastry', fr: 'Pâtisserie' },
      slug: 'pastry',
      type: 'hierarchy',
      children: [
        {
          slug: 'viennoiserie-breads',
          name: { en: 'Viennoiserie & Breads', fr: 'Viennoiseries & Pains' },
          children: [
            { slug: 'laminated-doughs', name: { en: 'Laminated Doughs', fr: 'Pâtes feuilletées levées' } },
            { slug: 'brioche-enriched', name: { en: 'Brioche & Enriched', fr: 'Brioches & Pâtes riches' } },
            { slug: 'bagels-pretzels', name: { en: 'Bagels & Pretzels', fr: 'Bagels & Bretzels' } },
          ],
        },
        {
          slug: 'cakes',
          name: { en: 'Cakes', fr: 'Gâteaux' },
          children: [
            { slug: 'sponge-based', name: { en: 'Sponge-based', fr: 'Bases génoises' } },
            { slug: 'butter-based', name: { en: 'Butter-based', fr: 'Bases beurrées' } },
            { slug: 'specialty-signature', name: { en: 'Specialty & Signature', fr: 'Spécialités & Signatures' } },
            { slug: 'cheesecakes', name: { en: 'Cheesecakes', fr: 'Gâteaux au fromage' } },
            { slug: 'petits-gateaux', name: { en: 'Petits Gâteaux', fr: 'Petits gâteaux' } },
          ],
        },
        {
          slug: 'tarts-pies-flans',
          name: { en: 'Tarts, Pies & Flans', fr: 'Tartes, Pies & Flans' },
          children: [
            { slug: 'fruit-tarts', name: { en: 'Fruit Tarts', fr: 'Tartes aux fruits' } },
            { slug: 'custard-tarts', name: { en: 'Custard-based', fr: 'Crèmes & Flans' } },
            { slug: 'pies-galettes', name: { en: 'Pies & Galettes', fr: 'Pies & Galettes' } },
          ],
        },
        {
          slug: 'petits-fours-choux-puff',
          name: { en: 'Petits Fours, Choux & Puff', fr: 'Petits Fours, Pâte à choux & Feuilletage' },
          children: [
            { slug: 'choux', name: { en: 'Choux Pastry', fr: 'Pâte à choux' } },
            { slug: 'puff-pastry', name: { en: 'Puff Pastry', fr: 'Pâte feuilletée' } },
            { slug: 'danish', name: { en: 'Danish', fr: 'Danoises' } },
            { slug: 'petits-fours-secs', name: { en: 'Petits Fours Secs', fr: 'Petits fours secs' } },
            { slug: 'petits-fours-glaces', name: { en: 'Petits Fours Glacés', fr: 'Petits fours glacés' } },
          ],
        },
        {
          slug: 'cookies-biscuits',
          name: { en: 'Cookies & Biscuits', fr: 'Biscuits & Cookies' },
          children: [
            { slug: 'drop-cookies', name: { en: 'Drop Cookies', fr: 'Cookies (à la cuillère)' } },
            { slug: 'rolled-cut', name: { en: 'Rolled / Cut', fr: 'Étales / Découpés' } },
            { slug: 'shortbread-sables', name: { en: 'Shortbreads & Sablés', fr: 'Shortbreads & Sablés' } },
            { slug: 'biscotti', name: { en: 'Biscotti', fr: 'Biscotti' } },
            { slug: 'macarons', name: { en: 'Macarons', fr: 'Macarons' } },
          ],
        },
        {
          slug: 'chocolate-confections',
          name: { en: 'Chocolate & Confections', fr: 'Chocolat & Confiseries' },
          children: [
            { slug: 'truffles-pralines', name: { en: 'Truffles & Pralines', fr: 'Truffes & Pralinés' } },
            { slug: 'bonbons-bars', name: { en: 'Bonbons & Bars', fr: 'Bonbons & Tablettes' } },
            { slug: 'caramels-brittles', name: { en: 'Caramels & Brittles', fr: 'Caramels & Croquants' } },
            { slug: 'nougat-marshmallow-patefruit', name: { en: 'Nougat, Marshmallow, Pâte de fruit', fr: 'Nougat, Guimauve, Pâte de fruit' } },
          ],
        },
        {
          slug: 'frozen-chilled',
          name: { en: 'Frozen & Chilled Desserts', fr: 'Desserts glacés & froids' },
          children: [
            { slug: 'ice-cream-gelato', name: { en: 'Ice Cream & Gelato', fr: 'Crèmes glacées & Gelati' } },
            { slug: 'sorbet-sherbet', name: { en: 'Sorbets & Sherbets', fr: 'Sorbets & Sherbets' } },
            { slug: 'parfait-semifreddo', name: { en: 'Parfaits & Semifreddo', fr: 'Parfaits & Semifreddo' } },
            { slug: 'granita-ices', name: { en: 'Granita & Ices', fr: 'Granités & Glaces pilées' } },
          ],
        },
        {
          slug: 'custards-mousses-creams',
          name: { en: 'Custards, Mousses & Creams', fr: 'Crèmes, Mousses & Entremets' },
          children: [
            { slug: 'creme-brulee-pots-creme', name: { en: 'Crème brûlée & Pots de crème', fr: 'Crème brûlée & Pots de crème' } },
            { slug: 'panna-cotta', name: { en: 'Panna Cotta', fr: 'Panna cotta' } },
            { slug: 'bavarois-diplomat', name: { en: 'Bavarian & Diplomat Cream', fr: 'Bavaroise & Crème diplomate' } },
            { slug: 'pastry-cream-curds', name: { en: 'Pastry Creams & Curds', fr: 'Crèmes pâtissières & Curd' } },
          ],
        },
        {
          slug: 'artistic-sugar-chocolate',
          name: { en: 'Artistic Sugar & Chocolate', fr: 'Arts du sucre & Chocolat artistique' },
          children: [
            { slug: 'pulled-blown-sugar', name: { en: 'Pulled & Blown Sugar', fr: 'Sucre tiré & soufflé' } },
            { slug: 'pastillage-isomalt', name: { en: 'Pastillage & Isomalt', fr: 'Pastillage & Isomalt' } },
            { slug: 'nougatine-croquembouche', name: { en: 'Nougatine & Croquembouche', fr: 'Nougatine & Croquembouche' } },
            { slug: 'showpieces', name: { en: 'Showpieces', fr: 'Pièces artistiques' } },
          ],
        },
        {
          slug: 'wedding-specialty-cakes',
          name: { en: 'Wedding & Specialty Cakes', fr: 'Gâteaux de mariage & Spéciaux' },
          children: [
            { slug: 'multi-tier', name: { en: 'Multi-tier', fr: 'À étages' } },
            { slug: 'fondant', name: { en: 'Fondant-covered', fr: 'Couvert de fondant' } },
            { slug: 'sculpted-3d', name: { en: 'Sculpted / 3D', fr: 'Sculptés / 3D' } },
            { slug: 'modern-entremets', name: { en: 'Modern Entremets', fr: 'Entremets modernes' } },
          ],
        },
      ],
    },
    {
      id: 'technique',
      name: { en: 'Technique', fr: 'Technique' },
      slug: 'technique',
      type: 'hierarchy',
      children: [
        {
          slug: 'dry-heat',
          name: { en: 'Dry-Heat', fr: 'Cuisson à sec' },
          children: [
            { slug: 'roasting', name: { en: 'Roasting', fr: 'Rôtir' } },
            { slug: 'baking', name: { en: 'Baking', fr: 'Cuire au four' } },
            { slug: 'grilling', name: { en: 'Grilling', fr: 'Griller' } },
            { slug: 'broiling', name: { en: 'Broiling', fr: 'Griller en salamandre' } },
            { slug: 'sauteing', name: { en: 'Sautéing', fr: 'Sauter' } },
            { slug: 'pan-searing', name: { en: 'Pan-searing', fr: 'Saisir à la poêle' } },
            { slug: 'frying', name: { en: 'Deep/Shallow Frying', fr: 'Friture' } },
          ],
        },
        {
          slug: 'moist-heat',
          name: { en: 'Moist-Heat', fr: 'Cuisson humide' },
          children: [
            { slug: 'poaching', name: { en: 'Poaching', fr: 'Pocher' } },
            { slug: 'simmering', name: { en: 'Simmering', fr: 'Mijoter' } },
            { slug: 'boiling', name: { en: 'Boiling', fr: 'Bouillir' } },
            { slug: 'steaming', name: { en: 'Steaming', fr: 'Cuisson vapeur' } },
          ],
        },
        {
          slug: 'combo-heat',
          name: { en: 'Combination', fr: 'Cuisson combinée' },
          children: [
            { slug: 'braising', name: { en: 'Braising', fr: 'Braiser' } },
            { slug: 'stewing', name: { en: 'Stewing', fr: 'Ragoûts' } },
            { slug: 'pressure-cooking', name: { en: 'Pressure Cooking', fr: 'Autocuiseur' } },
          ],
        },
        {
          slug: 'modernist',
          name: { en: 'Modernist / Contemporary', fr: 'Moderniste / Contemporain' },
          children: [
            { slug: 'sous-vide', name: { en: 'Sous-vide', fr: 'Sous-vide' } },
            { slug: 'spherification', name: { en: 'Spherification', fr: 'Sphérification' } },
            { slug: 'gels-hydrocolloids', name: { en: 'Gels & Hydrocolloids', fr: 'Gels & Hydrocolloïdes' } },
            { slug: 'foams-emulsions', name: { en: 'Foams & Emulsions', fr: 'Emulsions & Mousses' } },
            { slug: 'smoking-vapor', name: { en: 'Smoking & Vapor', fr: 'Fumage & Vapeur aromatique' } },
          ],
        },
        {
          slug: 'pastry-techniques',
          name: { en: 'Pastry Techniques', fr: 'Techniques de pâtisserie' },
          children: [
            { slug: 'creaming-method', name: { en: 'Creaming Method', fr: 'Méthode de crémage' } },
            { slug: 'genoise-method', name: { en: 'Génoise Method', fr: 'Méthode génoise' } },
            { slug: 'choux-method', name: { en: 'Choux Method', fr: 'Méthode pâte à choux' } },
            { slug: 'lamination', name: { en: 'Lamination', fr: 'Tourage' } },
            { slug: 'meringues', name: { en: 'Meringues (French/Swiss/Italian)', fr: 'Meringues (Française/Suisse/Italienne)' } },
            { slug: 'tempering-chocolate', name: { en: 'Tempering Chocolate', fr: 'Tablage du chocolat' } },
          ],
        },
      ],
    },
    {
      id: 'sauces',
      name: { en: 'Sauces', fr: 'Sauces' },
      slug: 'sauces',
      type: 'hierarchy',
      children: [
        {
          slug: 'mother-sauces',
          name: { en: 'Mother Sauces', fr: 'Sauces mères' },
          children: [
            { slug: 'bechamel', name: { en: 'Béchamel', fr: 'Béchamel' } },
            { slug: 'veloute', name: { en: 'Velouté', fr: 'Velouté' } },
            { slug: 'espagnole', name: { en: 'Espagnole', fr: 'Espagnole' } },
            { slug: 'tomato', name: { en: 'Tomato', fr: 'Tomate' } },
            { slug: 'hollandaise', name: { en: 'Hollandaise', fr: 'Hollandaise' } },
          ],
        },
        {
          slug: 'derivatives-classic',
          name: { en: 'Classical Derivatives', fr: 'Dérivées classiques' },
          children: [
            { slug: 'mornay', name: { en: 'Mornay', fr: 'Mornay' } },
            { slug: 'supreme', name: { en: 'Suprême', fr: 'Suprême' } },
            { slug: 'bordelaise', name: { en: 'Bordelaise', fr: 'Bordelaise' } },
            { slug: 'bearnaise', name: { en: 'Béarnaise', fr: 'Béarnaise' } },
            { slug: 'americaine', name: { en: 'Américaine', fr: 'Américaine' } },
          ],
        },
        {
          slug: 'modern-condiments',
          name: { en: 'Modern & Global Condiments', fr: 'Condiments modernes & mondiaux' },
          children: [
            { slug: 'salsa', name: { en: 'Salsas', fr: 'Salsas' } },
            { slug: 'chutney', name: { en: 'Chutneys', fr: 'Chutneys' } },
            { slug: 'relish-pickles', name: { en: 'Relishes & Pickles', fr: 'Relish & Pickles' } },
            { slug: 'fermented', name: { en: 'Fermented (Kimchi, Doenjang…)', fr: 'Fermentés (Kimchi, Doenjang…)' } },
            { slug: 'spice-pastes', name: { en: 'Spice Pastes (Harissa, Curry…)', fr: 'Pâtes d’épices (Harissa, Curry…)' } },
          ],
        },
      ],
    },
    {
      id: 'diets-allergens',
      name: { en: 'Diets & Allergens', fr: 'Régimes & Allergènes' },
      slug: 'diets-allergens',
      type: 'facets',
      children: [
        {
          slug: 'diets',
          name: { en: 'Diets', fr: 'Régimes' },
          children: [
            { slug: 'vegetarian', name: { en: 'Vegetarian', fr: 'Végétarien' } },
            { slug: 'vegan', name: { en: 'Vegan', fr: 'Vegan' } },
            { slug: 'pescatarian', name: { en: 'Pescatarian', fr: 'Pescetarien' } },
            { slug: 'keto', name: { en: 'Keto', fr: 'Kéto' } },
            { slug: 'low-sodium', name: { en: 'Low Sodium', fr: 'Pauvre en sodium' } },
            { slug: 'low-sugar', name: { en: 'Low Sugar', fr: 'Faible en sucre' } },
            { slug: 'high-protein', name: { en: 'High Protein', fr: 'Riche en protéines' } },
            { slug: 'kosher', name: { en: 'Kosher', fr: 'Casher' } },
            { slug: 'halal', name: { en: 'Halal', fr: 'Halal' } },
          ],
        },
        {
          slug: 'allergens',
          name: { en: 'Allergens', fr: 'Allergènes' },
          children: [
            { slug: 'gluten', name: { en: 'Gluten', fr: 'Gluten' } },
            { slug: 'dairy', name: { en: 'Dairy', fr: 'Lait/Lactose' } },
            { slug: 'eggs', name: { en: 'Eggs', fr: 'Œufs' } },
            { slug: 'soy', name: { en: 'Soy', fr: 'Soja' } },
            { slug: 'peanuts', name: { en: 'Peanuts', fr: 'Arachides' } },
            { slug: 'tree-nuts', name: { en: 'Tree Nuts', fr: 'Fruits à coque' } },
            { slug: 'fish', name: { en: 'Fish', fr: 'Poisson' } },
            { slug: 'shellfish', name: { en: 'Shellfish', fr: 'Crustacés & Mollusques' } },
            { slug: 'sesame', name: { en: 'Sesame', fr: 'Sésame' } },
            { slug: 'mustard', name: { en: 'Mustard', fr: 'Moutarde' } },
            { slug: 'sulphites', name: { en: 'Sulphites', fr: 'Sulfites' } },
          ],
        },
      ],
    },
    {
      id: 'cuisines',
      name: { en: 'Cuisines', fr: 'Cuisines' },
      slug: 'cuisines',
      type: 'hierarchy',
      children: [
        {
          slug: 'european',
          name: { en: 'European', fr: 'Européenne' },
          children: [
            { slug: 'french', name: { en: 'French', fr: 'Française' } },
            { slug: 'italian', name: { en: 'Italian', fr: 'Italienne' } },
            { slug: 'spanish', name: { en: 'Spanish', fr: 'Espagnole' } },
            { slug: 'nordic', name: { en: 'Nordic', fr: 'Nordique' } },
            { slug: 'british-irish', name: { en: 'British & Irish', fr: 'Britannique & Irlandaise' } },
            { slug: 'eastern-europe', name: { en: 'Eastern Europe', fr: 'Europe de l’Est' } },
          ],
        },
        {
          slug: 'asian',
          name: { en: 'Asian', fr: 'Asiatique' },
          children: [
            { slug: 'japanese', name: { en: 'Japanese', fr: 'Japonaise' } },
            { slug: 'chinese', name: { en: 'Chinese', fr: 'Chinoise' } },
            { slug: 'thai', name: { en: 'Thai', fr: 'Thaïlandaise' } },
            { slug: 'korean', name: { en: 'Korean', fr: 'Coréenne' } },
            { slug: 'indian', name: { en: 'Indian', fr: 'Indienne' } },
            { slug: 'southeast-asian', name: { en: 'Southeast Asian', fr: 'Asie du Sud-Est' } },
          ],
        },
        {
          slug: 'middle-east-africa',
          name: { en: 'Middle Eastern & African', fr: 'Moyen-Orient & Afrique' },
          children: [
            { slug: 'levantine', name: { en: 'Levantine', fr: 'Levantine' } },
            { slug: 'maghrebi', name: { en: 'Maghrebi', fr: 'Maghrébine' } },
            { slug: 'persian', name: { en: 'Persian', fr: 'Persane' } },
            { slug: 'east-african', name: { en: 'East African', fr: 'Afrique de l’Est' } },
            { slug: 'west-african', name: { en: 'West African', fr: 'Afrique de l’Ouest' } },
          ],
        },
        {
          slug: 'americas',
          name: { en: 'Americas', fr: 'Amériques' },
          children: [
            { slug: 'american-classic', name: { en: 'American Classic', fr: 'Américaine classique' } },
            { slug: 'creole-cajun', name: { en: 'Creole & Cajun', fr: 'Créole & Cajun' } },
            { slug: 'mexican', name: { en: 'Mexican', fr: 'Mexicaine' } },
            { slug: 'latin', name: { en: 'Latin American', fr: 'Amérique latine' } },
            { slug: 'peruvian-nikkei', name: { en: 'Peruvian & Nikkei', fr: 'Péruvienne & Nikkei' } },
          ],
        },
        {
          slug: 'oceania',
          name: { en: 'Oceania', fr: 'Océanie' },
          children: [
            { slug: 'australian', name: { en: 'Australian', fr: 'Australienne' } },
            { slug: 'polynesian', name: { en: 'Polynesian', fr: 'Polynésienne' } },
          ],
        },
      ],
    },
    {
      id: 'meal-period',
      name: { en: 'Meal Period', fr: 'Moment du repas' },
      slug: 'meal-period',
      type: 'facets',
      children: [
        { slug: 'breakfast', name: { en: 'Breakfast', fr: 'Petit-déjeuner' } },
        { slug: 'brunch', name: { en: 'Brunch', fr: 'Brunch' } },
        { slug: 'lunch', name: { en: 'Lunch', fr: 'Déjeuner' } },
        { slug: 'dinner', name: { en: 'Dinner', fr: 'Dîner' } },
        { slug: 'late-night', name: { en: 'Late Night', fr: 'Tard le soir' } },
      ],
    },
    {
      id: 'service-style',
      name: { en: 'Service Style', fr: 'Style de service' },
      slug: 'service-style',
      type: 'facets',
      children: [
        { slug: 'plated', name: { en: 'Plated', fr: 'À l’assiette' } },
        { slug: 'family-style', name: { en: 'Family Style', fr: 'Familial' } },
        { slug: 'buffet', name: { en: 'Buffet', fr: 'Buffet' } },
        { slug: 'tasting-menu', name: { en: 'Tasting Menu', fr: 'Menu dégustation' } },
        { slug: 'action-station', name: { en: 'Action Station', fr: 'Station animée' } },
        { slug: 'room-service', name: { en: 'Room Service', fr: 'Service en chambre' } },
      ],
    },
    {
      id: 'components',
      name: { en: 'Recipe Components', fr: 'Composants de recette' },
      slug: 'components',
      type: 'hierarchy',
      children: [
        { slug: 'stocks-broths', name: { en: 'Stocks & Broths', fr: 'Fonds & Bouillons' } },
        { slug: 'jus-glaces', name: { en: 'Jus & Glaces', fr: 'Jus & Glaces' } },
        { slug: 'garnishes', name: { en: 'Garnishes', fr: 'Garnitures' } },
        { slug: 'spice-blends', name: { en: 'Spice Blends & Rubs', fr: 'Mélanges d’épices & Rubs' } },
        { slug: 'pastry-bases', name: { en: 'Pastry Bases (Doughs/Batters)', fr: 'Bases pâtissières (Pâtes/Appareils)' } },
        { slug: 'fillings-creams', name: { en: 'Fillings & Creams', fr: 'Garnitures & Crèmes' } },
        { slug: 'glazes-icings', name: { en: 'Glazes & Icings', fr: 'Glaçages & Glaces' } },
        { slug: 'decorations', name: { en: 'Decorations', fr: 'Décors' } },
      ],
    },
    {
      id: 'equipment',
      name: { en: 'Equipment', fr: 'Équipement' },
      slug: 'equipment',
      type: 'facets',
      children: [
        { slug: 'range-oven', name: { en: 'Range/Oven', fr: 'Piano/Four' } },
        { slug: 'combi-oven', name: { en: 'Combi Oven', fr: 'Four mixte' } },
        { slug: 'plancha-grill', name: { en: 'Plancha/Grill', fr: 'Plancha/Gril' } },
        { slug: 'fryer', name: { en: 'Fryer', fr: 'Friteuse' } },
        { slug: 'circulator', name: { en: 'Immersion Circulator', fr: 'Thermoplongeur' } },
        { slug: 'sheeter', name: { en: 'Dough Sheeter', fr: 'Laminoir' } },
        { slug: 'mixer', name: { en: 'Mixer', fr: 'Batteur/Mélangeur' } },
        { slug: 'ice-cream-machine', name: { en: 'Ice Cream Machine', fr: 'Turbine à glace' } },
        { slug: 'smoker', name: { en: 'Smoker', fr: 'Fumoir' } },
      ],
    },
    {
      id: 'difficulty',
      name: { en: 'Difficulty', fr: 'Difficulté' },
      slug: 'difficulty',
      type: 'facets',
      children: [
        { slug: 'basic', name: { en: 'Basic', fr: 'Basique' } },
        { slug: 'intermediate', name: { en: 'Intermediate', fr: 'Intermédiaire' } },
        { slug: 'advanced', name: { en: 'Advanced', fr: 'Avancé' } },
        { slug: 'showpiece', name: { en: 'Showpiece / Competition', fr: 'Pièce artistique / Compétition' } },
      ],
    },
  ],
  mapping_guidance: {
    en: 'Assign each recipe to 1+ nodes in Course and Pastry (if relevant), 1–3 Techniques, exactly one Cuisine, 0–N Diets/Allergens, optional Meal Period, Service Style, Components, Equipment, and Difficulty.',
    fr: 'Attribuez chaque recette à 1+ nœuds dans Service/Plat et Pâtisserie (si pertinent), 1–3 Techniques, exactement une Cuisine, 0–N Régimes/Allergènes, période de repas optionnelle, style de service, composants, équipement et difficulté.',
  },
};

export type TaxonomySelection = {
  course: string[];
  pastry: string[];
  technique: string[];
  cuisine?: string;
  diets: string[];
  allergens: string[];
  mealPeriod?: string;
  serviceStyle?: string;
  components: string[];
  equipment: string[];
  difficulty?: string;
};

export const defaultSelection: TaxonomySelection = {
  course: [],
  pastry: [],
  technique: [],
  cuisine: undefined,
  diets: [],
  allergens: [],
  mealPeriod: undefined,
  serviceStyle: undefined,
  components: [],
  equipment: [],
  difficulty: undefined,
};

export function flattenFromNode(node: TaxonomyNode | undefined): { slug: string; label: string }[] {
  if (!node) return [];
  const out: { slug: string; label: string }[] = [];
  const walk = (n: TaxonomyNode) => {
    out.push({ slug: n.slug, label: `${n.name.en} / ${n.name.fr}` });
    (n.children || []).forEach(walk);
  };
  (node.children || []).forEach(walk);
  return out;
}

export function flatten(axisSlug: string): { slug: string; label: string }[] {
  const axis = LUCCCA_TAXONOMY.axes.find((a) => a.slug === axisSlug);
  if (!axis) return [];
  return flattenFromNode({ slug: axis.slug, name: axis.name, children: axis.children });
}

function findNodeBySlug(slug: string): TaxonomyNode | undefined {
  for (const axis of LUCCCA_TAXONOMY.axes) {
    const stack: TaxonomyNode[] = [...(axis.children || [])];
    while (stack.length) {
      const n = stack.pop()!;
      if (n.slug === slug) return n;
      if (n.children) stack.push(...n.children);
    }
  }
  return undefined;
}

export function axisOptions(slug: string): { slug: string; label: string }[] {
  const axis = LUCCCA_TAXONOMY.axes.find((a) => a.slug === slug);
  if (axis) return flatten(slug);
  const node = findNodeBySlug(slug);
  return flattenFromNode(node);
}

export function labelFor(slug: string): string {
  for (const axis of LUCCCA_TAXONOMY.axes) {
    const stack = [...(axis.children || [])];
    while (stack.length) {
      const n = stack.pop()!;
      if (n.slug === slug) return `${n.name.en} / ${n.name.fr}`;
      if (n.children) stack.push(...n.children);
    }
  }
  return slug;
}

// ── Allergen & Diet short-code labels for RecipeCard / Menu Studio ──

export type AllergenTagDef = {
  slug: string;
  code: string;      // short abbreviation shown on badges, e.g. "(D)"
  label: string;     // human-readable, e.g. "Dairy"
  color: string;     // tailwind-safe hex for badge bg
  textColor: string; // tailwind-safe hex for badge text
};

export const ALLERGEN_TAG_MAP: Record<string, AllergenTagDef> = {
  // Allergens
  dairy:     { slug: 'dairy',     code: 'D',  label: 'Dairy',     color: '#dbeafe', textColor: '#1e40af' },
  gluten:    { slug: 'gluten',    code: 'G',  label: 'Gluten',    color: '#fef3c7', textColor: '#92400e' },
  eggs:      { slug: 'eggs',      code: 'E',  label: 'Eggs',      color: '#fef9c3', textColor: '#854d0e' },
  soy:       { slug: 'soy',       code: 'S',  label: 'Soy',       color: '#d1fae5', textColor: '#065f46' },
  peanuts:   { slug: 'peanuts',   code: 'P',  label: 'Peanuts',   color: '#fee2e2', textColor: '#991b1b' },
  'tree-nuts': { slug: 'tree-nuts', code: 'TN', label: 'Tree Nuts', color: '#fce7f3', textColor: '#9d174d' },
  fish:      { slug: 'fish',      code: 'F',  label: 'Fish',      color: '#cffafe', textColor: '#155e75' },
  shellfish: { slug: 'shellfish', code: 'SF', label: 'Shellfish', color: '#e0e7ff', textColor: '#3730a3' },
  sesame:    { slug: 'sesame',    code: 'Se', label: 'Sesame',    color: '#f3e8ff', textColor: '#6b21a8' },
  mustard:   { slug: 'mustard',   code: 'Mu', label: 'Mustard',   color: '#fef3c7', textColor: '#78350f' },
  sulphites: { slug: 'sulphites', code: 'Su', label: 'Sulphites', color: '#f1f5f9', textColor: '#334155' },
  // Diets
  vegetarian:   { slug: 'vegetarian',   code: 'V',  label: 'Vegetarian',   color: '#dcfce7', textColor: '#166534' },
  vegan:        { slug: 'vegan',        code: 'Ve', label: 'Vegan',        color: '#d1fae5', textColor: '#064e3b' },
  pescatarian:  { slug: 'pescatarian',  code: 'Pe', label: 'Pescatarian',  color: '#cffafe', textColor: '#164e63' },
  keto:         { slug: 'keto',         code: 'K',  label: 'Keto',         color: '#fce7f3', textColor: '#831843' },
  'low-sodium': { slug: 'low-sodium',   code: 'LS', label: 'Low Sodium',   color: '#f0fdf4', textColor: '#14532d' },
  'low-sugar':  { slug: 'low-sugar',    code: 'LS', label: 'Low Sugar',    color: '#fefce8', textColor: '#713f12' },
  'high-protein': { slug: 'high-protein', code: 'HP', label: 'High Protein', color: '#fef2f2', textColor: '#7f1d1d' },
  kosher:       { slug: 'kosher',       code: 'Ko', label: 'Kosher',       color: '#eff6ff', textColor: '#1e3a5f' },
  halal:        { slug: 'halal',        code: 'Ha', label: 'Halal',        color: '#f0fdf4', textColor: '#15803d' },
};

// Legacy name-based lookup (RecipeInputPage saves names like "Dairy", "Gluten")
const LEGACY_NAME_TO_SLUG: Record<string, string> = {
  'dairy': 'dairy', 'gluten': 'gluten', 'eggs': 'eggs', 'soy': 'soy',
  'peanuts': 'peanuts', 'nuts': 'tree-nuts', 'tree nuts': 'tree-nuts',
  'fish': 'fish', 'shellfish': 'shellfish', 'sesame': 'sesame',
  'mustard': 'mustard', 'sulphites': 'sulphites', 'onion/allium': 'mustard',
  'garlic': 'mustard',
};

/** Resolve a mixed array of slugs and legacy names into AllergenTagDef[] */
export function resolveAllergenTags(raw: string[]): AllergenTagDef[] {
  const seen = new Set<string>();
  const result: AllergenTagDef[] = [];
  for (const item of raw) {
    const slug = LEGACY_NAME_TO_SLUG[item.toLowerCase()] ?? item.toLowerCase();
    if (seen.has(slug)) continue;
    seen.add(slug);
    const def = ALLERGEN_TAG_MAP[slug];
    if (def) result.push(def);
  }
  return result;
}

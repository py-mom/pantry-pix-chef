import { pipeline, env } from "@huggingface/transformers";

// Open-source, in-browser food detection using CLIP zero-shot classification.
// We constrain predictions to pantry/grocery items to avoid nonsense labels
// (e.g., "Komodo dragon"). Falls back to a lightweight ImageNet classifier.

env.allowLocalModels = false;
env.useBrowserCache = true;

let zslPromise: Promise<any> | null = null;
let imagenetPromise: Promise<any> | null = null;

// Extended vocabulary for specific products, brands, and detailed descriptions
const CANDIDATE_LABELS = [
  // Specific jams and spreads
  "strawberry jam","grape jam","raspberry jam","blueberry jam","apricot jam","peach jam","orange marmalade","peanut butter","almond butter","nutella",
  // Honey varieties and brands
  "honey","honey bottle","honey jar","honey bear","honey bear bottle","clover honey","raw honey","organic honey","manuka honey","raw manuka honey",
  "lavender honey","wildflower honey","pure honey","raw unfiltered honey","local honey",
  "good & gather honey","kirkland honey","kirkland organic honey","golden blossom honey","nature nate's honey","gefen honey",
  // Branded products (common brands)
  "jif peanut butter","skippy peanut butter","welch's grape jelly","smuckers jam","kraft peanut butter","skippy natural","adams peanut butter",
  // Produce with varieties
  "red apple","green apple","gala apple","fuji apple","granny smith apple","banana","organic banana","yellow banana","ripe banana",
  "orange","navel orange","blood orange","valencia orange","mandarin orange","clementine","tangerine",
  "lemon","lime","key lime","persian lime","grapefruit","pink grapefruit",
  "grapes","red grapes","green grapes","purple grapes","seedless grapes","concord grapes",
  "strawberry","fresh strawberry","organic strawberry","blueberry","fresh blueberry","raspberry","blackberry",
  "tomato","roma tomato","cherry tomato","grape tomato","beefsteak tomato","heirloom tomato",
  "potato","russet potato","red potato","yukon potato","sweet potato","purple potato",
  "carrot","baby carrot","organic carrot","onion","yellow onion","white onion","red onion","sweet onion","vidalia onion",
  "garlic","garlic cloves","cucumber","english cucumber","persian cucumber","pickle cucumber",
  "broccoli","organic broccoli","cauliflower","lettuce","romaine lettuce","iceberg lettuce","butter lettuce","arugula",
  "spinach","baby spinach","organic spinach","kale","organic kale","cabbage","red cabbage","napa cabbage",
  "bell pepper","red bell pepper","yellow bell pepper","green bell pepper","orange bell pepper",
  // Bakery & grains with brands
  // Bread varieties and brands
  "bread","bread loaf","sliced bread","white bread","wheat bread","whole grain bread","whole wheat bread","sourdough bread","rye bread","pumpernickel bread",
  "brioche","brioche bread","french bread","baguette","french baguette","italian bread","artisan bread","bakery bread",
  "wonder bread","pepperidge farm bread","dave's killer bread","dave's killer bread 21 grains","ezekiel bread",
  "nature's own bread","nature's own whole wheat","nature's own brioche","alfaro's artesano","artesano bread","artesano brioche",
  "boudin sourdough","san francisco sourdough","oroweat bread","arnold bread","sara lee bread",
  "bagel","bagels","bagel bag","plain bagel","everything bagel","sesame bagel","cinnamon raisin bagel","onion bagel","poppy seed bagel","blueberry bagel","asiago bagel",
  "thomas bagel","thomas' bagels","thomas plain bagel","sara lee bagels","sara lee blueberry bagels","dave's killer bread bagels","dave's killer bread cinnamon raisin bagels",
  "mini bagels","whole wheat bagel","multigrain bagel","egg bagel",
  "tortilla","flour tortilla","corn tortilla","whole wheat tortilla","mission tortilla","old el paso tortilla",
  "pita","pita bread","naan","flatbread",
  "rice","white rice","brown rice","jasmine rice","basmati rice","wild rice","uncle ben's rice","minute rice",
  // Pasta varieties
  "pasta","spaghetti","penne","penne pasta","macaroni","linguine","fettuccine","angel hair pasta","rigatoni","rotini","farfalle","bow tie pasta","lasagna noodles","orzo","ziti","shells pasta","elbow macaroni",
  "barilla pasta","barilla spaghetti","barilla penne","kraft mac and cheese","ronzoni pasta","de cecco pasta",
  "noodles","egg noodles","ramen noodles","rice noodles","instant noodles","udon noodles","soba noodles","lo mein noodles",
  "oats","rolled oats","steel cut oats","instant oats","quaker oats","oatmeal","quaker oatmeal","quaker instant oatmeal","quaker oatmeal cereal",
  // Cereal varieties and brands
  "cereal","cereal box","breakfast cereal",
  // Quaker
  "quaker oats","quaker quick oats","quaker 1 minute oats","quaker old fashioned oats","quaker instant oatmeal",
  // Cheerios (General Mills)
  "cheerios","cheerios cereal","original cheerios","honey nut cheerios","frosted cheerios","apple cinnamon cheerios","multigrain cheerios",
  // Kellogg's cereals
  "corn flakes","kellogg's corn flakes","frosted flakes","kellogg's frosted flakes",
  "froot loops","fruit loops","kellogg's froot loops",
  "frosted mini wheats","kellogg's frosted mini wheats","mini wheats","frosted mini wheats original",
  "raisin bran","kellogg's raisin bran","special k","kellogg's special k",
  "rice krispies","kellogg's rice krispies",
  // General Mills cereals
  "lucky charms","lucky charms cereal","lucky charms marshmallows",
  "cinnamon toast crunch","cocoa puffs","trix cereal","golden grahams","wheaties","total cereal","reese's puffs",
  // Post cereals
  "honey bunches of oats","honey bunches of oats with almonds","honey bunches of oats with honey roasted",
  "cocoa pebbles","fruity pebbles","grape nuts","post grape nuts","raisin bran post",
  "shredded wheat","post shredded wheat","great grains",
  // Other cereals
  "chex cereal","life cereal","cap'n crunch","captain crunch","quaker life cereal",
  "granola","granola cereal","muesli","oatmeal cereal","hot cereal","cold cereal",
  "kellogg's cereal","general mills cereal","post cereal","quaker cereal",
  "flour","all purpose flour","bread flour","whole wheat flour","king arthur flour",
  // Beverages - Soda and drinks
  "soda","cola","coca cola","coke","pepsi","sprite","7up","7 up","seven up","mountain dew","dr pepper","fanta","root beer",
  "ginger ale","club soda","tonic water","sparkling water","seltzer","la croix",
  "soda can","soda bottle","2 liter soda","diet soda","diet coke","diet pepsi","zero sugar soda",
  "juice","orange juice","apple juice","grape juice","cranberry juice","tomato juice","lemonade",
  "iced tea","sweet tea","green tea","energy drink","red bull","monster energy","gatorade","powerade",
  "water bottle","bottled water","spring water","mineral water","voss water","fiji water","evian water","dasani water","aquafina water","smart water",
  // Jello and desserts
  "jello","jell-o","gelatin","gelatin dessert","pudding","pudding cup","instant pudding","jello cups","fruit jello","jello mix",
  "cool whip","whipped cream","whipped topping",
  // Dairy & eggs with brands
  // Milk varieties and brands
  "milk","milk gallon","milk jug","milk carton","whole milk","2% milk","1% milk","skim milk","fat free milk","reduced fat milk",
  "organic milk","lactose free milk","vitamin d milk","ultra filtered milk","raw milk","homogenized milk",
  "almond milk","soy milk","oat milk","coconut milk","cashew milk","rice milk","flax milk","plant milk","non dairy milk",
  // Target - Good & Gather milk
  "good & gather milk","good & gather whole milk","good & gather 2% milk","good & gather organic milk","good & gather almond milk","good & gather oat milk",
  // Costco - Kirkland milk
  "kirkland milk","kirkland organic milk","kirkland whole milk","kirkland 2% milk","kirkland almond milk","kirkland oat milk",
  // Safeway - Lucerne, O Organics, Signature Select
  "lucerne milk","lucerne whole milk","lucerne 2% milk","lucerne skim milk","lucerne lactose free milk",
  "o organics milk","o organics whole milk","o organics 2% milk","signature select milk",
  // Whole Foods - 365
  "365 milk","365 organic milk","365 whole milk","365 2% milk","365 almond milk","365 oat milk",
  // National milk brands
  "horizon organic milk","horizon milk","fairlife milk","fairlife ultra filtered","lactaid milk","lactaid whole milk",
  "silk almond milk","silk soy milk","silk oat milk","oatly","oatly oat milk","califia farms","califia almond milk",
  "organic valley milk","organic valley whole milk","clover milk","alta dena milk","borden milk",
  // Yogurt varieties and brands
  "yogurt","yogurt cup","yogurt container","greek yogurt","regular yogurt","vanilla yogurt","strawberry yogurt","plain yogurt",
  "blueberry yogurt","peach yogurt","mixed berry yogurt","honey yogurt","coconut yogurt","non dairy yogurt",
  "low fat yogurt","nonfat yogurt","whole milk yogurt","probiotic yogurt","drinkable yogurt","yogurt drink",
  // Target - Good & Gather yogurt
  "good & gather yogurt","good & gather greek yogurt","good & gather vanilla yogurt",
  // Costco - Kirkland yogurt
  "kirkland yogurt","kirkland greek yogurt","kirkland organic yogurt",
  // Safeway yogurt
  "lucerne yogurt","o organics yogurt","signature select yogurt",
  // Whole Foods - 365 yogurt
  "365 yogurt","365 greek yogurt","365 organic yogurt",
  // National yogurt brands
  "chobani","chobani yogurt","chobani greek yogurt","chobani flip","chobani vanilla","chobani strawberry",
  "dannon yogurt","dannon greek yogurt","dannon activia","activia yogurt","oikos yogurt","oikos greek yogurt",
  "yoplait","yoplait yogurt","yoplait greek","yoplait go-gurt","go-gurt",
  "fage","fage greek yogurt","fage total","siggi's","siggi's yogurt","siggi's icelandic","stonyfield","stonyfield yogurt","stonyfield organic",
  "noosa","noosa yogurt","two good yogurt","ratio yogurt","skyr","icelandic provisions",
  // Cheese varieties and brands
  "cheese","cheese block","cheese package","cheese slices","shredded cheese","sliced cheese","cheese wedge",
  "cheddar cheese","sharp cheddar","mild cheddar","white cheddar","aged cheddar","extra sharp cheddar",
  "mozzarella cheese","fresh mozzarella","mozzarella ball","burrata","part skim mozzarella",
  "swiss cheese","american cheese","provolone cheese","parmesan cheese","parmigiano reggiano","pecorino romano",
  "monterey jack","pepper jack","colby jack","colby cheese","gouda cheese","brie cheese","camembert",
  "feta cheese","goat cheese","blue cheese","gorgonzola","ricotta cheese","mascarpone","queso fresco","cotija cheese",
  "string cheese","cheese sticks","babybel","mini babybel","laughing cow","cheese spread",
  "cream cheese","cream cheese block","cream cheese spread","whipped cream cheese",
  // Target - Good & Gather cheese
  "good & gather cheese","good & gather cheddar","good & gather shredded cheese","good & gather cream cheese","good & gather string cheese",
  // Costco - Kirkland cheese
  "kirkland cheese","kirkland cheddar","kirkland shredded cheese","kirkland parmesan","kirkland cream cheese","kirkland string cheese",
  // Safeway cheese
  "lucerne cheese","lucerne cheddar","lucerne shredded cheese","lucerne cream cheese",
  "o organics cheese","signature select cheese",
  // Whole Foods - 365 cheese
  "365 cheese","365 cheddar","365 shredded cheese","365 cream cheese","365 organic cheese",
  // National cheese brands
  "kraft cheese","kraft singles","kraft american cheese","kraft shredded cheese","velveeta","velveeta cheese",
  "tillamook","tillamook cheese","tillamook cheddar","tillamook shredded",
  "sargento","sargento cheese","sargento slices","sargento shredded",
  "philadelphia cream cheese","philadelphia","philly cream cheese",
  "cabot cheese","cabot cheddar","cracker barrel cheese","cracker barrel cheddar",
  "belgioioso","belgioioso mozzarella","belgioioso parmesan","president brie","boursin cheese",
  // Butter varieties and brands
  "butter","butter stick","butter block","butter tub","salted butter","unsalted butter","sweet cream butter",
  "organic butter","grass fed butter","european butter","cultured butter","whipped butter",
  // Target - Good & Gather butter
  "good & gather butter","good & gather salted butter","good & gather unsalted butter",
  // Costco - Kirkland butter
  "kirkland butter","kirkland salted butter","kirkland unsalted butter","kirkland organic butter",
  // Safeway butter
  "lucerne butter","o organics butter","signature select butter",
  // Whole Foods - 365 butter
  "365 butter","365 organic butter","365 salted butter","365 unsalted butter",
  // National butter brands
  "land o lakes","land o lakes butter","land o lakes salted","land o lakes unsalted",
  "kerrygold","kerrygold butter","kerrygold irish butter","kerrygold salted","kerrygold unsalted",
  "challenge butter","tillamook butter","organic valley butter","plugra butter","president butter",
  // Cream varieties and brands
  "cream","heavy cream","heavy whipping cream","whipping cream","light cream","half and half","coffee creamer",
  "sour cream","sour cream container","light sour cream","nonfat sour cream",
  "cottage cheese","cottage cheese container","small curd cottage cheese","large curd cottage cheese",
  // Target - Good & Gather cream
  "good & gather cream","good & gather heavy cream","good & gather half and half","good & gather sour cream","good & gather cottage cheese",
  // Costco - Kirkland cream
  "kirkland cream","kirkland heavy cream","kirkland half and half","kirkland sour cream","kirkland cottage cheese",
  // Safeway cream
  "lucerne cream","lucerne heavy cream","lucerne sour cream","lucerne cottage cheese",
  "o organics cream","o organics sour cream","signature select cream",
  // Whole Foods - 365 cream
  "365 cream","365 heavy cream","365 half and half","365 sour cream","365 cottage cheese",
  // National cream brands
  "daisy sour cream","daisy cottage cheese","breakstone's","breakstone's sour cream","breakstone's cottage cheese",
  "knudsen","knudsen sour cream","knudsen cottage cheese","organic valley cream",
  // Eggs varieties and brands
  "eggs","egg carton","egg pack","large eggs","extra large eggs","jumbo eggs","medium eggs",
  "organic eggs","free range eggs","cage free eggs","pasture raised eggs","brown eggs","white eggs",
  "omega 3 eggs","vegetarian fed eggs","farm fresh eggs",
  // Target - Good & Gather eggs
  "good & gather eggs","good & gather large eggs","good & gather organic eggs","good & gather cage free eggs",
  // Costco - Kirkland eggs
  "kirkland eggs","kirkland organic eggs","kirkland cage free eggs","kirkland large eggs",
  // Safeway eggs
  "lucerne eggs","o organics eggs","signature select eggs",
  // Whole Foods - 365 eggs
  "365 eggs","365 organic eggs","365 cage free eggs","365 large eggs",
  // National egg brands
  "eggland's best","eggland's best eggs","vital farms","vital farms eggs","pete and gerry's","pete and gerry's eggs",
  "happy egg","happy egg co","nellie's free range","nellie's eggs","organic valley eggs","cal maine eggs",
  // Snacks and pantry items
  "chips","potato chips","tortilla chips","doritos","lays chips","pringles","cheetos",
  "crackers","saltine crackers","graham crackers","ritz crackers","cheese crackers",
  "cookies","oreos","chocolate chip cookies","sandwich cookies",
  "popcorn","microwave popcorn","kettle corn",
  "pretzels","nuts","mixed nuts","peanuts","almonds","cashews","walnuts",
  // Canned goods
  "canned soup","soup can","chicken soup","tomato soup","campbell's soup",
  "canned beans","black beans","kidney beans","pinto beans","chickpeas","garbanzo beans",
  "canned vegetables","canned corn","canned peas","canned green beans",
  "canned fruit","fruit cocktail","peaches in syrup","pineapple chunks",
  "canned tuna","canned salmon","sardines",
  "tomato sauce","pasta sauce","marinara sauce","spaghetti sauce","prego sauce","ragu sauce",
  "salsa","picante sauce","taco sauce","enchilada sauce",
  // Condiments
  "ketchup","mustard","mayonnaise","ranch dressing","salad dressing","bbq sauce","hot sauce","sriracha","soy sauce","worcestershire sauce",
  // Frozen foods
  "ice cream","frozen pizza","frozen vegetables","frozen fruit","frozen waffles","frozen dinner","tv dinner",
  // Household items
  "paper towels","kitchen towels","paper towel roll","bounty paper towels","viva paper towels",
  "toilet paper","toilet tissue","charmin toilet paper","scott toilet paper",
  "napkins","paper napkins","tissues","kleenex tissues","facial tissues",
  "trash bags","garbage bags","glad trash bags","hefty trash bags",
  "aluminum foil","plastic wrap","saran wrap","ziploc bags","storage bags","sandwich bags",
  "dish soap","dishwashing liquid","dawn dish soap","palmolive dish soap",
  "laundry detergent","tide detergent","all detergent","fabric softener",
  "cleaning spray","all purpose cleaner","clorox wipes","lysol wipes","disinfectant wipes",
  "sponge","kitchen sponge","scrub brush",
  "candles","scented candles","batteries","light bulbs"
] as const;

const LABEL_MAP: Record<string, string> = {
  // Keep specific product names and brands as-is
  "strawberry jam": "strawberry jam",
  "grape jam": "grape jam", 
  "raspberry jam": "raspberry jam",
  "blueberry jam": "blueberry jam",
  "welch's grape jelly": "Welch's grape jelly",
  "smuckers jam": "Smucker's jam",
  "jif peanut butter": "Jif peanut butter",
  "skippy peanut butter": "Skippy peanut butter",
  "kraft peanut butter": "Kraft peanut butter",
  // Bread brands
  "bread": "bread",
  "bread loaf": "bread",
  "sliced bread": "bread",
  "brioche": "brioche bread",
  "brioche bread": "brioche bread",
  "french bread": "French bread",
  "baguette": "baguette",
  "french baguette": "French baguette",
  "italian bread": "Italian bread",
  "artisan bread": "artisan bread",
  "bakery bread": "bakery bread",
  "wonder bread": "Wonder Bread",
  "pepperidge farm bread": "Pepperidge Farm bread",
  "dave's killer bread": "Dave's Killer Bread",
  "dave's killer bread 21 grains": "Dave's Killer Bread 21 Grains",
  "nature's own bread": "Nature's Own bread",
  "nature's own whole wheat": "Nature's Own Whole Wheat",
  "nature's own brioche": "Nature's Own Brioche",
  "alfaro's artesano": "Alfaro's Artesano",
  "artesano bread": "Artesano bread",
  "artesano brioche": "Artesano Brioche",
  "boudin sourdough": "Boudin Sourdough",
  "san francisco sourdough": "San Francisco Sourdough",
  "oroweat bread": "Oroweat bread",
  "arnold bread": "Arnold bread",
  "sara lee bread": "Sara Lee bread",
  "uncle ben's rice": "Uncle Ben's rice",
  "minute rice": "Minute Rice",
  "barilla pasta": "Barilla pasta",
  "barilla spaghetti": "Barilla spaghetti",
  "barilla penne": "Barilla penne",
  "ronzoni pasta": "Ronzoni pasta",
  "de cecco pasta": "De Cecco pasta",
  "kraft mac and cheese": "Kraft Mac & Cheese",
  // Cereal brands - Quaker
  "quaker oats": "Quaker Oats",
  "quaker oatmeal": "Quaker Oatmeal",
  "quaker oatmeal cereal": "Quaker Oatmeal",
  "quaker quick oats": "Quaker Quick Oats",
  "quaker 1 minute oats": "Quaker Quick Oats",
  "quaker old fashioned oats": "Quaker Old Fashioned Oats",
  "quaker instant oatmeal": "Quaker Instant Oatmeal",
  // Honey brands
  "honey": "honey",
  "honey bottle": "honey",
  "honey jar": "honey",
  "honey bear": "honey",
  "honey bear bottle": "honey",
  "clover honey": "clover honey",
  "raw honey": "raw honey",
  "organic honey": "organic honey",
  "manuka honey": "Manuka honey",
  "raw manuka honey": "Manuka honey",
  "lavender honey": "lavender honey",
  "wildflower honey": "wildflower honey",
  "pure honey": "honey",
  "raw unfiltered honey": "raw honey",
  "local honey": "honey",
  "good & gather honey": "Good & Gather honey",
  "kirkland honey": "Kirkland honey",
  "kirkland organic honey": "Kirkland Organic honey",
  "golden blossom honey": "Golden Blossom honey",
  "nature nate's honey": "Nature Nate's honey",
  "gefen honey": "Gefen honey",
  // Cereal brands - Cheerios
  "cheerios": "Cheerios",
  "cheerios cereal": "Cheerios",
  "original cheerios": "Cheerios",
  "honey nut cheerios": "Honey Nut Cheerios",
  "frosted cheerios": "Frosted Cheerios",
  "apple cinnamon cheerios": "Apple Cinnamon Cheerios",
  "multigrain cheerios": "Multigrain Cheerios",
  // Cereal brands - Kellogg's
  "frosted flakes": "Frosted Flakes",
  "kellogg's frosted flakes": "Kellogg's Frosted Flakes",
  "corn flakes": "Corn Flakes",
  "kellogg's corn flakes": "Kellogg's Corn Flakes",
  "froot loops": "Froot Loops",
  "fruit loops": "Froot Loops",
  "kellogg's froot loops": "Kellogg's Froot Loops",
  "frosted mini wheats": "Frosted Mini Wheats",
  "kellogg's frosted mini wheats": "Kellogg's Frosted Mini Wheats",
  "mini wheats": "Frosted Mini Wheats",
  "frosted mini wheats original": "Frosted Mini Wheats",
  "raisin bran": "Raisin Bran",
  "kellogg's raisin bran": "Kellogg's Raisin Bran",
  "special k": "Special K",
  "kellogg's special k": "Kellogg's Special K",
  "rice krispies": "Rice Krispies",
  "kellogg's rice krispies": "Kellogg's Rice Krispies",
  // Cereal brands - General Mills
  "lucky charms": "Lucky Charms",
  "lucky charms cereal": "Lucky Charms",
  "lucky charms marshmallows": "Lucky Charms",
  "cinnamon toast crunch": "Cinnamon Toast Crunch",
  "cocoa puffs": "Cocoa Puffs",
  "trix cereal": "Trix",
  "golden grahams": "Golden Grahams",
  "wheaties": "Wheaties",
  "total cereal": "Total",
  "reese's puffs": "Reese's Puffs",
  // Cereal brands - Post
  "honey bunches of oats": "Honey Bunches of Oats",
  "honey bunches of oats with almonds": "Honey Bunches of Oats with Almonds",
  "honey bunches of oats with honey roasted": "Honey Bunches of Oats",
  "cocoa pebbles": "Cocoa Pebbles",
  "fruity pebbles": "Fruity Pebbles",
  "grape nuts": "Grape Nuts",
  "post grape nuts": "Post Grape Nuts",
  "raisin bran post": "Post Raisin Bran",
  "shredded wheat": "Shredded Wheat",
  "post shredded wheat": "Post Shredded Wheat",
  "great grains": "Great Grains",
  // Other cereals
  "chex cereal": "Chex",
  "life cereal": "Life Cereal",
  "cap'n crunch": "Cap'n Crunch",
  "captain crunch": "Cap'n Crunch",
  "quaker life cereal": "Quaker Life Cereal",
  "kellogg's cereal": "Kellogg's cereal",
  "general mills cereal": "General Mills cereal",
  "post cereal": "Post cereal",
  "quaker cereal": "Quaker cereal",
  "oatmeal cereal": "oatmeal",
  "granola cereal": "granola",
  // Soda brands
  "coca cola": "Coca-Cola",
  "coke": "Coca-Cola",
  "diet coke": "Diet Coke",
  "pepsi": "Pepsi",
  "diet pepsi": "Diet Pepsi",
  "sprite": "Sprite",
  "7up": "7UP",
  "7 up": "7UP",
  "seven up": "7UP",
  "mountain dew": "Mountain Dew",
  "dr pepper": "Dr Pepper",
  "fanta": "Fanta",
  "root beer": "root beer",
  "ginger ale": "ginger ale",
  "la croix": "LaCroix",
  "red bull": "Red Bull",
  "monster energy": "Monster Energy",
  "gatorade": "Gatorade",
  "powerade": "Powerade",
  // Water brands
  "voss water": "Voss water",
  "fiji water": "Fiji water",
  "evian water": "Evian water",
  "dasani water": "Dasani water",
  "aquafina water": "Aquafina water",
  "smart water": "Smartwater",
  // Jello
  "jello": "Jello",
  "jell-o": "Jell-O",
  "gelatin dessert": "Jello",
  "jello cups": "Jello cups",
  "jello mix": "Jello mix",
  "cool whip": "Cool Whip",
  // Bagels
  "bagel": "bagels",
  "bagels": "bagels",
  "bagel bag": "bagels",
  "thomas bagel": "Thomas' Bagels",
  "thomas' bagels": "Thomas' Bagels",
  "thomas plain bagel": "Thomas' Plain Bagels",
  "sara lee bagels": "Sara Lee Bagels",
  "sara lee blueberry bagels": "Sara Lee Blueberry Bagels",
  "dave's killer bread bagels": "Dave's Killer Bread Bagels",
  "dave's killer bread cinnamon raisin bagels": "Dave's Killer Bread Cinnamon Raisin Bagels",
  "everything bagel": "everything bagel",
  "plain bagel": "plain bagel",
  "sesame bagel": "sesame bagel",
  "cinnamon raisin bagel": "cinnamon raisin bagel",
  "blueberry bagel": "blueberry bagel",
  "mini bagels": "mini bagels",
  "whole wheat bagel": "whole wheat bagel",
  "multigrain bagel": "multigrain bagel",
  "egg bagel": "egg bagel",
  // Pasta
  "penne pasta": "penne",
  "bow tie pasta": "farfalle",
  "angel hair pasta": "angel hair",
  "shells pasta": "pasta shells",
  "elbow macaroni": "elbow macaroni",
  // Soup brands
  "campbell's soup": "Campbell's soup",
  // Sauce brands
  "prego sauce": "Prego sauce",
  "ragu sauce": "Ragú sauce",
  // DAIRY LABEL MAPPINGS
  // Milk - generic
  "milk": "milk",
  "milk gallon": "milk",
  "milk jug": "milk",
  "milk carton": "milk",
  "whole milk": "whole milk",
  "2% milk": "2% milk",
  "1% milk": "1% milk",
  "skim milk": "skim milk",
  "fat free milk": "skim milk",
  "reduced fat milk": "2% milk",
  "organic milk": "organic milk",
  "lactose free milk": "lactose free milk",
  "vitamin d milk": "whole milk",
  "ultra filtered milk": "ultra filtered milk",
  "almond milk": "almond milk",
  "soy milk": "soy milk",
  "oat milk": "oat milk",
  "coconut milk": "coconut milk",
  "cashew milk": "cashew milk",
  "plant milk": "plant milk",
  "non dairy milk": "non-dairy milk",
  // Target - Good & Gather milk
  "good & gather milk": "Good & Gather milk",
  "good & gather whole milk": "Good & Gather whole milk",
  "good & gather 2% milk": "Good & Gather 2% milk",
  "good & gather organic milk": "Good & Gather organic milk",
  "good & gather almond milk": "Good & Gather almond milk",
  "good & gather oat milk": "Good & Gather oat milk",
  // Costco - Kirkland milk
  "kirkland milk": "Kirkland milk",
  "kirkland organic milk": "Kirkland Organic milk",
  "kirkland whole milk": "Kirkland whole milk",
  "kirkland 2% milk": "Kirkland 2% milk",
  "kirkland almond milk": "Kirkland almond milk",
  "kirkland oat milk": "Kirkland oat milk",
  // Safeway - Lucerne, O Organics
  "lucerne milk": "Lucerne milk",
  "lucerne whole milk": "Lucerne whole milk",
  "lucerne 2% milk": "Lucerne 2% milk",
  "lucerne skim milk": "Lucerne skim milk",
  "lucerne lactose free milk": "Lucerne Lactose Free milk",
  "o organics milk": "O Organics milk",
  "o organics whole milk": "O Organics whole milk",
  "o organics 2% milk": "O Organics 2% milk",
  "signature select milk": "Signature Select milk",
  // Whole Foods - 365
  "365 milk": "365 milk",
  "365 organic milk": "365 Organic milk",
  "365 whole milk": "365 whole milk",
  "365 2% milk": "365 2% milk",
  "365 almond milk": "365 almond milk",
  "365 oat milk": "365 oat milk",
  // National milk brands
  "horizon organic milk": "Horizon Organic milk",
  "horizon milk": "Horizon Organic milk",
  "fairlife milk": "Fairlife milk",
  "fairlife ultra filtered": "Fairlife Ultra Filtered milk",
  "lactaid milk": "Lactaid milk",
  "lactaid whole milk": "Lactaid whole milk",
  "silk almond milk": "Silk Almond Milk",
  "silk soy milk": "Silk Soy Milk",
  "silk oat milk": "Silk Oat Milk",
  "oatly": "Oatly",
  "oatly oat milk": "Oatly Oat Milk",
  "califia farms": "Califia Farms",
  "califia almond milk": "Califia Farms Almond Milk",
  "organic valley milk": "Organic Valley milk",
  "organic valley whole milk": "Organic Valley whole milk",
  "clover milk": "Clover milk",
  "alta dena milk": "Alta Dena milk",
  "borden milk": "Borden milk",
  // Yogurt - generic
  "yogurt": "yogurt",
  "yogurt cup": "yogurt",
  "yogurt container": "yogurt",
  "greek yogurt": "Greek yogurt",
  "regular yogurt": "yogurt",
  "vanilla yogurt": "vanilla yogurt",
  "strawberry yogurt": "strawberry yogurt",
  "plain yogurt": "plain yogurt",
  "blueberry yogurt": "blueberry yogurt",
  "peach yogurt": "peach yogurt",
  "mixed berry yogurt": "mixed berry yogurt",
  "honey yogurt": "honey yogurt",
  "coconut yogurt": "coconut yogurt",
  "non dairy yogurt": "non-dairy yogurt",
  "low fat yogurt": "low fat yogurt",
  "nonfat yogurt": "nonfat yogurt",
  "whole milk yogurt": "whole milk yogurt",
  "probiotic yogurt": "probiotic yogurt",
  "drinkable yogurt": "drinkable yogurt",
  "yogurt drink": "yogurt drink",
  // Target - Good & Gather yogurt
  "good & gather yogurt": "Good & Gather yogurt",
  "good & gather greek yogurt": "Good & Gather Greek yogurt",
  "good & gather vanilla yogurt": "Good & Gather vanilla yogurt",
  // Costco - Kirkland yogurt
  "kirkland yogurt": "Kirkland yogurt",
  "kirkland greek yogurt": "Kirkland Greek yogurt",
  "kirkland organic yogurt": "Kirkland Organic yogurt",
  // Safeway yogurt
  "lucerne yogurt": "Lucerne yogurt",
  "o organics yogurt": "O Organics yogurt",
  "signature select yogurt": "Signature Select yogurt",
  // Whole Foods - 365 yogurt
  "365 yogurt": "365 yogurt",
  "365 greek yogurt": "365 Greek yogurt",
  "365 organic yogurt": "365 Organic yogurt",
  // National yogurt brands
  "chobani": "Chobani",
  "chobani yogurt": "Chobani yogurt",
  "chobani greek yogurt": "Chobani Greek yogurt",
  "chobani flip": "Chobani Flip",
  "chobani vanilla": "Chobani vanilla",
  "chobani strawberry": "Chobani strawberry",
  "dannon yogurt": "Dannon yogurt",
  "dannon greek yogurt": "Dannon Greek yogurt",
  "dannon activia": "Activia yogurt",
  "activia yogurt": "Activia yogurt",
  "oikos yogurt": "Oikos yogurt",
  "oikos greek yogurt": "Oikos Greek yogurt",
  "yoplait": "Yoplait",
  "yoplait yogurt": "Yoplait yogurt",
  "yoplait greek": "Yoplait Greek yogurt",
  "yoplait go-gurt": "Go-GURT",
  "go-gurt": "Go-GURT",
  "fage": "Fage",
  "fage greek yogurt": "Fage Greek yogurt",
  "fage total": "Fage Total",
  "siggi's": "Siggi's",
  "siggi's yogurt": "Siggi's yogurt",
  "siggi's icelandic": "Siggi's Icelandic yogurt",
  "stonyfield": "Stonyfield",
  "stonyfield yogurt": "Stonyfield yogurt",
  "stonyfield organic": "Stonyfield Organic yogurt",
  "noosa": "Noosa",
  "noosa yogurt": "Noosa yogurt",
  "two good yogurt": "Two Good yogurt",
  "ratio yogurt": "Ratio yogurt",
  "skyr": "skyr",
  "icelandic provisions": "Icelandic Provisions",
  // Cheese - generic
  "cheese": "cheese",
  "cheese block": "cheese",
  "cheese package": "cheese",
  "cheese slices": "sliced cheese",
  "shredded cheese": "shredded cheese",
  "sliced cheese": "sliced cheese",
  "cheese wedge": "cheese wedge",
  "cheddar cheese": "cheddar cheese",
  "sharp cheddar": "sharp cheddar",
  "mild cheddar": "mild cheddar",
  "white cheddar": "white cheddar",
  "aged cheddar": "aged cheddar",
  "extra sharp cheddar": "extra sharp cheddar",
  "mozzarella cheese": "mozzarella",
  "fresh mozzarella": "fresh mozzarella",
  "mozzarella ball": "fresh mozzarella",
  "burrata": "burrata",
  "part skim mozzarella": "mozzarella",
  "swiss cheese": "Swiss cheese",
  "american cheese": "American cheese",
  "provolone cheese": "provolone",
  "parmesan cheese": "Parmesan",
  "parmigiano reggiano": "Parmigiano Reggiano",
  "pecorino romano": "Pecorino Romano",
  "monterey jack": "Monterey Jack",
  "pepper jack": "Pepper Jack",
  "colby jack": "Colby Jack",
  "colby cheese": "Colby cheese",
  "gouda cheese": "Gouda",
  "brie cheese": "Brie",
  "camembert": "Camembert",
  "feta cheese": "feta",
  "goat cheese": "goat cheese",
  "blue cheese": "blue cheese",
  "gorgonzola": "Gorgonzola",
  "ricotta cheese": "ricotta",
  "mascarpone": "mascarpone",
  "queso fresco": "Queso Fresco",
  "cotija cheese": "Cotija",
  "string cheese": "string cheese",
  "cheese sticks": "string cheese",
  "babybel": "Babybel",
  "mini babybel": "Mini Babybel",
  "laughing cow": "Laughing Cow",
  "cheese spread": "cheese spread",
  "cream cheese": "cream cheese",
  "cream cheese block": "cream cheese",
  "cream cheese spread": "cream cheese spread",
  "whipped cream cheese": "whipped cream cheese",
  // Target - Good & Gather cheese
  "good & gather cheese": "Good & Gather cheese",
  "good & gather cheddar": "Good & Gather cheddar",
  "good & gather shredded cheese": "Good & Gather shredded cheese",
  "good & gather cream cheese": "Good & Gather cream cheese",
  "good & gather string cheese": "Good & Gather string cheese",
  // Costco - Kirkland cheese
  "kirkland cheese": "Kirkland cheese",
  "kirkland cheddar": "Kirkland cheddar",
  "kirkland shredded cheese": "Kirkland shredded cheese",
  "kirkland parmesan": "Kirkland Parmesan",
  "kirkland cream cheese": "Kirkland cream cheese",
  "kirkland string cheese": "Kirkland string cheese",
  // Safeway cheese
  "lucerne cheese": "Lucerne cheese",
  "lucerne cheddar": "Lucerne cheddar",
  "lucerne shredded cheese": "Lucerne shredded cheese",
  "lucerne cream cheese": "Lucerne cream cheese",
  "o organics cheese": "O Organics cheese",
  "signature select cheese": "Signature Select cheese",
  // Whole Foods - 365 cheese
  "365 cheese": "365 cheese",
  "365 cheddar": "365 cheddar",
  "365 shredded cheese": "365 shredded cheese",
  "365 cream cheese": "365 cream cheese",
  "365 organic cheese": "365 Organic cheese",
  // National cheese brands
  "kraft cheese": "Kraft cheese",
  "kraft singles": "Kraft Singles",
  "kraft american cheese": "Kraft American cheese",
  "kraft shredded cheese": "Kraft shredded cheese",
  "velveeta": "Velveeta",
  "velveeta cheese": "Velveeta",
  "tillamook": "Tillamook",
  "tillamook cheese": "Tillamook cheese",
  "tillamook cheddar": "Tillamook cheddar",
  "tillamook shredded": "Tillamook shredded cheese",
  "sargento": "Sargento",
  "sargento cheese": "Sargento cheese",
  "sargento slices": "Sargento sliced cheese",
  "sargento shredded": "Sargento shredded cheese",
  "philadelphia cream cheese": "Philadelphia cream cheese",
  "philadelphia": "Philadelphia cream cheese",
  "philly cream cheese": "Philadelphia cream cheese",
  "cabot cheese": "Cabot cheese",
  "cabot cheddar": "Cabot cheddar",
  "cracker barrel cheese": "Cracker Barrel cheese",
  "cracker barrel cheddar": "Cracker Barrel cheddar",
  "belgioioso": "BelGioioso",
  "belgioioso mozzarella": "BelGioioso mozzarella",
  "belgioioso parmesan": "BelGioioso Parmesan",
  "president brie": "Président Brie",
  "boursin cheese": "Boursin",
  // Butter - generic
  "butter": "butter",
  "butter stick": "butter",
  "butter block": "butter",
  "butter tub": "butter",
  "salted butter": "salted butter",
  "unsalted butter": "unsalted butter",
  "sweet cream butter": "sweet cream butter",
  "organic butter": "organic butter",
  "grass fed butter": "grass-fed butter",
  "european butter": "European-style butter",
  "cultured butter": "cultured butter",
  "whipped butter": "whipped butter",
  // Target - Good & Gather butter
  "good & gather butter": "Good & Gather butter",
  "good & gather salted butter": "Good & Gather salted butter",
  "good & gather unsalted butter": "Good & Gather unsalted butter",
  // Costco - Kirkland butter
  "kirkland butter": "Kirkland butter",
  "kirkland salted butter": "Kirkland salted butter",
  "kirkland unsalted butter": "Kirkland unsalted butter",
  "kirkland organic butter": "Kirkland Organic butter",
  // Safeway butter
  "lucerne butter": "Lucerne butter",
  "o organics butter": "O Organics butter",
  "signature select butter": "Signature Select butter",
  // Whole Foods - 365 butter
  "365 butter": "365 butter",
  "365 organic butter": "365 Organic butter",
  "365 salted butter": "365 salted butter",
  "365 unsalted butter": "365 unsalted butter",
  // National butter brands
  "land o lakes": "Land O'Lakes",
  "land o lakes butter": "Land O'Lakes butter",
  "land o lakes salted": "Land O'Lakes salted butter",
  "land o lakes unsalted": "Land O'Lakes unsalted butter",
  "kerrygold": "Kerrygold",
  "kerrygold butter": "Kerrygold butter",
  "kerrygold irish butter": "Kerrygold Irish Butter",
  "kerrygold salted": "Kerrygold salted butter",
  "kerrygold unsalted": "Kerrygold unsalted butter",
  "challenge butter": "Challenge butter",
  "tillamook butter": "Tillamook butter",
  "organic valley butter": "Organic Valley butter",
  "plugra butter": "Plugrà butter",
  "president butter": "Président butter",
  // Cream - generic
  "cream": "cream",
  "heavy cream": "heavy cream",
  "heavy whipping cream": "heavy whipping cream",
  "whipping cream": "whipping cream",
  "light cream": "light cream",
  "half and half": "half and half",
  "coffee creamer": "coffee creamer",
  "sour cream": "sour cream",
  "sour cream container": "sour cream",
  "light sour cream": "light sour cream",
  "nonfat sour cream": "nonfat sour cream",
  "cottage cheese": "cottage cheese",
  "cottage cheese container": "cottage cheese",
  "small curd cottage cheese": "small curd cottage cheese",
  "large curd cottage cheese": "large curd cottage cheese",
  // Target - Good & Gather cream
  "good & gather cream": "Good & Gather cream",
  "good & gather heavy cream": "Good & Gather heavy cream",
  "good & gather half and half": "Good & Gather half and half",
  "good & gather sour cream": "Good & Gather sour cream",
  "good & gather cottage cheese": "Good & Gather cottage cheese",
  // Costco - Kirkland cream
  "kirkland cream": "Kirkland cream",
  "kirkland heavy cream": "Kirkland heavy cream",
  "kirkland half and half": "Kirkland half and half",
  "kirkland sour cream": "Kirkland sour cream",
  "kirkland cottage cheese": "Kirkland cottage cheese",
  // Safeway cream
  "lucerne cream": "Lucerne cream",
  "lucerne heavy cream": "Lucerne heavy cream",
  "lucerne sour cream": "Lucerne sour cream",
  "lucerne cottage cheese": "Lucerne cottage cheese",
  "o organics cream": "O Organics cream",
  "o organics sour cream": "O Organics sour cream",
  "signature select cream": "Signature Select cream",
  // Whole Foods - 365 cream
  "365 cream": "365 cream",
  "365 heavy cream": "365 heavy cream",
  "365 half and half": "365 half and half",
  "365 sour cream": "365 sour cream",
  "365 cottage cheese": "365 cottage cheese",
  // National cream brands
  "daisy sour cream": "Daisy sour cream",
  "daisy cottage cheese": "Daisy cottage cheese",
  "breakstone's": "Breakstone's",
  "breakstone's sour cream": "Breakstone's sour cream",
  "breakstone's cottage cheese": "Breakstone's cottage cheese",
  "knudsen": "Knudsen",
  "knudsen sour cream": "Knudsen sour cream",
  "knudsen cottage cheese": "Knudsen cottage cheese",
  "organic valley cream": "Organic Valley cream",
  // Eggs - generic
  "eggs": "eggs",
  "egg carton": "eggs",
  "egg pack": "eggs",
  "large eggs": "large eggs",
  "extra large eggs": "extra large eggs",
  "jumbo eggs": "jumbo eggs",
  "medium eggs": "medium eggs",
  "organic eggs": "organic eggs",
  "free range eggs": "free range eggs",
  "cage free eggs": "cage free eggs",
  "pasture raised eggs": "pasture raised eggs",
  "brown eggs": "brown eggs",
  "white eggs": "eggs",
  "omega 3 eggs": "omega-3 eggs",
  "vegetarian fed eggs": "vegetarian fed eggs",
  "farm fresh eggs": "farm fresh eggs",
  // Target - Good & Gather eggs
  "good & gather eggs": "Good & Gather eggs",
  "good & gather large eggs": "Good & Gather large eggs",
  "good & gather organic eggs": "Good & Gather organic eggs",
  "good & gather cage free eggs": "Good & Gather cage free eggs",
  // Costco - Kirkland eggs
  "kirkland eggs": "Kirkland eggs",
  "kirkland organic eggs": "Kirkland Organic eggs",
  "kirkland cage free eggs": "Kirkland cage free eggs",
  "kirkland large eggs": "Kirkland large eggs",
  // Safeway eggs
  "lucerne eggs": "Lucerne eggs",
  "o organics eggs": "O Organics eggs",
  "signature select eggs": "Signature Select eggs",
  // Whole Foods - 365 eggs
  "365 eggs": "365 eggs",
  "365 organic eggs": "365 Organic eggs",
  "365 cage free eggs": "365 cage free eggs",
  "365 large eggs": "365 large eggs",
  // National egg brands
  "eggland's best": "Eggland's Best",
  "eggland's best eggs": "Eggland's Best eggs",
  "vital farms": "Vital Farms",
  "vital farms eggs": "Vital Farms eggs",
  "pete and gerry's": "Pete and Gerry's",
  "pete and gerry's eggs": "Pete and Gerry's eggs",
  "happy egg": "Happy Egg",
  "happy egg co": "Happy Egg Co.",
  "nellie's free range": "Nellie's Free Range",
  "nellie's eggs": "Nellie's eggs",
  "organic valley eggs": "Organic Valley eggs",
  "cal maine eggs": "Cal-Maine eggs",
  // Household items
  "paper towels": "paper towels",
  "kitchen towels": "paper towels",
  "paper towel roll": "paper towels",
  "bounty paper towels": "Bounty paper towels",
  "viva paper towels": "Viva paper towels",
  "toilet paper": "toilet paper",
  "toilet tissue": "toilet paper",
  "charmin toilet paper": "Charmin toilet paper",
  "scott toilet paper": "Scott toilet paper",
  "kleenex tissues": "Kleenex tissues",
  "facial tissues": "tissues",
  "glad trash bags": "Glad trash bags",
  "hefty trash bags": "Hefty trash bags",
  "saran wrap": "plastic wrap",
  "ziploc bags": "Ziploc bags",
  "dawn dish soap": "Dawn dish soap",
  "palmolive dish soap": "Palmolive dish soap",
  "tide detergent": "Tide detergent",
  "all detergent": "All detergent",
  "clorox wipes": "Clorox wipes",
  "lysol wipes": "Lysol wipes",
  // Generic fallbacks for common variations
  "jam": "jam",
  "jelly": "jelly",
  "preserves": "preserves",
  "spread": "spread",
  "soda can": "soda",
  "soda bottle": "soda",
  "2 liter soda": "soda",
  "diet soda": "diet soda",
  "zero sugar soda": "zero sugar soda"
};

// Extract base product word to deduplicate similar items (e.g., "strawberry jam" -> "jam")
function getBaseProductWord(label: string): string {
  const words = label.toLowerCase().split(' ');
  // Common product category words that indicate the same product type
  const categoryWords = [
    'jam', 'jelly', 'butter', 'milk', 'yogurt', 'cheese', 'bread', 'rice', 'pasta', 
    'cereal', 'eggs', 'apple', 'banana', 'orange', 'tomato', 'potato', 'onion', 
    'carrot', 'pepper', 'soda', 'cola', 'juice', 'bagel', 'jello', 'gelatin',
    'soup', 'beans', 'chips', 'crackers', 'cookies', 'noodles', 'sauce',
    'water', 'honey', 'oatmeal', 'towels', 'tissues', 'detergent', 'soap', 'wipes'
  ];
  
  for (const word of words) {
    if (categoryWords.includes(word)) {
      return word;
    }
  }
  // If no category word found, use the full label
  return label.toLowerCase();
}

function normalize(label: string): string {
  const s = label.toLowerCase().trim();
  // Return mapped value if exists, otherwise return original casing preserved for brands
  const mapped = LABEL_MAP[s];
  if (mapped) return mapped;
  
  // For unrecognized items, preserve some capitalization for brand-like terms
  if (s.includes("'s") || s.includes("&")) {
    return s.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  }
  
  return s;
}

// Check if WebGPU is available
async function isWebGPUAvailable(): Promise<boolean> {
  try {
    // @ts-ignore - WebGPU types may not be available
    if (typeof navigator === 'undefined' || !navigator.gpu) return false;
    // @ts-ignore
    const adapter = await navigator.gpu.requestAdapter();
    return adapter !== null;
  } catch {
    return false;
  }
}

async function getZeroShot() {
  if (!zslPromise) {
    zslPromise = (async () => {
      const useWebGPU = await isWebGPUAvailable();
      try {
        return await pipeline(
          "zero-shot-image-classification",
          "Xenova/clip-vit-base-patch16",
          useWebGPU ? { device: "webgpu" } : {}
        );
      } catch (err) {
        console.warn("WebGPU pipeline failed, using CPU fallback:", err);
        return await pipeline(
          "zero-shot-image-classification",
          "Xenova/clip-vit-base-patch16"
        );
      }
    })();
  }
  return zslPromise;
}

async function getImagenet() {
  if (!imagenetPromise) {
    imagenetPromise = (async () => {
      const useWebGPU = await isWebGPUAvailable();
      try {
        return await pipeline(
          "image-classification",
          "onnx-community/mobilenetv4_conv_small.e2400_r224_in1k",
          useWebGPU ? { device: "webgpu" } : {}
        );
      } catch (err) {
        console.warn("WebGPU ImageNet failed, using CPU fallback:", err);
        return await pipeline(
          "image-classification",
          "onnx-community/mobilenetv4_conv_small.e2400_r224_in1k"
        );
      }
    })();
  }
  return imagenetPromise;
}

// Core labels for classification (smaller set for better performance)
const CORE_LABELS = [
  // Dairy essentials
  "milk", "yogurt", "cheese", "butter", "eggs", "cream", "sour cream", "cottage cheese",
  // Produce
  "apple", "banana", "orange", "lemon", "grapes", "strawberry", "blueberry", "tomato", "potato", "carrot", "onion", "garlic", "cucumber", "broccoli", "lettuce", "spinach", "bell pepper",
  // Bakery
  "bread", "bagel", "tortilla", "baguette",
  // Grains
  "rice", "pasta", "cereal", "oatmeal",
  // Spreads
  "jam", "jelly", "peanut butter", "honey",
  // Beverages
  "soda", "juice", "water bottle",
  // Canned goods
  "soup", "beans", "canned vegetables", "canned fruit", "tomato sauce",
  // Snacks
  "chips", "crackers", "cookies", "pretzels", "nuts",
  // Household
  "paper towels", "toilet paper", "dish soap", "detergent",
  // Other
  "jello", "ice cream"
] as const;

export async function detectFoodItemsFromDataUrl(dataUrl: string): Promise<string[]> {
  // Validate input
  if (!dataUrl || typeof dataUrl !== 'string') {
    console.error('Invalid image data provided');
    return [];
  }

  // 1) Try zero-shot with smaller core labels for performance
  try {
    console.log('Loading zero-shot classifier...');
    const zsl = await getZeroShot();
    console.log('Running classification...');
    
    const outputs = await zsl(dataUrl, CORE_LABELS as unknown as string[], {
      hypothesis_template: "a photo of {}",
    });

    // outputs is an array of {label, score}, already filtered to our labels
    const allResults = (Array.isArray(outputs) ? outputs : [])
      .filter((r: any) => typeof r?.label === "string" && typeof r?.score === "number")
      .sort((a: any, b: any) => b.score - a.score);

    console.log('Classification results:', allResults.slice(0, 5));

    // Take top result and any significantly different items
    // Avoid duplicate variations of the same product
    const seen = new Set<string>();
    const filtered: string[] = [];
    
    for (const r of allResults) {
      if (r.score < 0.05) continue;
      
      const label = normalize(r.label);
      const baseWord = getBaseProductWord(label);
      
      // Skip if we already have an item with the same base product
      if (seen.has(baseWord)) continue;
      
      seen.add(baseWord);
      filtered.push(label);
      
      // Limit to top 5 distinct products
      if (filtered.length >= 5) break;
    }

    // If no results above threshold, take just the top result
    if (filtered.length === 0 && allResults.length > 0) {
      filtered.push(normalize(allResults[0].label));
    }

    if (filtered.length) return filtered;
  } catch (err) {
    console.warn("Zero-shot classification failed, falling back to ImageNet:", err);
  }

  // 2) Fallback: generic classifier + food-word filter
  try {
    const clf = await getImagenet();
    const result = await clf(dataUrl, { topk: 10 });
    const foodNouns = new Set([
      "apple","banana","orange","lemon","lime","grapes","pear","peach","plum","strawberry","blueberry","raspberry",
      "tomato","potato","carrot","onion","garlic","cucumber","broccoli","cauliflower","lettuce","spinach","kale","cabbage","pepper",
      "bread","bagel","tortilla","pita","rice","pasta","spaghetti","penne","macaroni","linguine","fettuccine","rigatoni","rotini","noodles","oats","oatmeal","cereal","flour",
      "milk","yogurt","cheese","butter","cream","eggs",
      "beans","chickpeas","lentils","tomato sauce","canned tomatoes","tuna","salmon","sardines","corn","peas","broth",
      "chicken","beef","pork","ham","bacon","sausage","tofu",
      "olive oil","oil","salt","pepper","sugar","honey","vinegar","soy sauce","ketchup","mustard","mayonnaise","peanut butter","jam",
      "chocolate","coffee","tea","nuts","almonds","peanuts","walnuts","cashews","chips","crackers","cookies","pretzels",
      "soda","cola","juice","water","gatorade","energy drink",
      "jello","gelatin","pudding",
      "soup","salsa","sauce",
      "ice cream","frozen pizza",
      // Household items
      "towel","towels","paper towels","tissue","tissues","toilet paper","napkins",
      "soap","detergent","sponge","foil","wrap","bags",
      "candle","candles","batteries","bulb","bulbs",
    ]);

    const labels = (Array.isArray(result) ? result : [])
      .filter((r: any) => typeof r?.label === "string" && typeof r?.score === "number")
      .filter((r: any) => r.score >= 0.15)
      .map((r: any) => r.label.toLowerCase())
      .map((s: string) => s.split(",")[0]) // take first synonym
      .map((s: string) => s.replace(/\(.*?\)/g, "").replace(/_/g, " ").trim())
      .map((s: string) => {
        for (const noun of foodNouns) {
          if (new RegExp(`\\b${noun}\\b`).test(s)) return noun;
        }
        return "";
      })
      .filter(Boolean)
      .map(normalize);

    const uniq = Array.from(new Set(labels));
    return uniq.slice(0, 10);
  } catch (e) {
    console.error("Fallback ImageNet classification failed:", e);
    return [];
  }
}

const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'assets', 'data', 'data.json');
const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

const updates = {
  "20th Century Cocktail": {
    description: "Classic gin cocktail with Lillet, crème de cacao, and lemon, named for a famed train.",
    instructions: "Shake gin, Lillet Blanc, crème de cacao, and lemon juice with ice. Strain into a chilled cocktail glass and garnish with a lemon twist."
  },
  "7 & 7": {
    description: "Simple highball of Seagram's 7 Crown whiskey mixed with 7-Up.",
    instructions: "Fill a highball glass with ice. Pour in whiskey and top with lemon-lime soda. Gently stir."
  },
  "ABC": {
    description: "The abbreviation stands for Amaretto, Baileys, and Cognac.",
    instructions: "Layer amaretto, Irish cream, and cognac in a shot glass. Serve immediately."
  },
  "AMF": {
    description: "Potent blue long drink combining vodka, rum, gin, tequila, and citrus soda.",
    instructions: "Fill a glass with ice. Add vodka, rum, gin, tequila, blue curaçao, and sweet & sour mix. Top with lemon-lime soda and stir."
  },
  "Acapulco": {
    description: "Light rum cocktail with lime and orange flavors named after the Mexican resort city.",
    instructions: "Shake light rum, lime juice, triple sec, and sugar with ice. Strain into a chilled glass and garnish with mint."
  },
  "Adonis": {
    description: "Low-alcohol sherry and vermouth aperitif from the 1880s.",
    instructions: "Stir sherry, sweet vermouth, and orange bitters with ice. Strain into a chilled coupe and garnish with an orange twist."
  },
  "Adriatique": {
    description: "Herbal sipper pairing Amaro Montenegro and dry vermouth.",
    instructions: "Stir amaro and vermouth with ice. Strain into a chilled cocktail glass and garnish with an orange twist."
  },
  "Agavoni": {
    description: "Negroni variation that swaps gin for tequila.",
    instructions: "Stir tequila, Campari, and sweet vermouth with ice. Strain into a rocks glass over fresh ice and garnish with an orange peel."
  },
  "Alabama Slammer (long)": {
    description: "Fruity southern highball mixing gin, amaretto, sloe gin, and orange juice.",
    instructions: "Shake southern comfort or sloe gin, amaretto, and orange juice with ice. Strain into a highball glass over fresh ice and top with more juice."
  },
  "Alabama Slammer (shot)": {
    description: "Shot version of the sweet and fruity Alabama Slammer.",
    instructions: "Shake sloe gin, amaretto, and southern comfort with ice. Strain into a shot glass and serve."
  },
  "Alexander": {
    description: "Creamy gin cocktail flavored with crème de cacao, a precursor to the Brandy Alexander.",
    instructions: "Shake gin, crème de cacao, and cream with ice. Strain into a chilled cocktail glass and garnish with nutmeg."
  },
  "Alexander the Great": {
    description: "Decadent chocolate and cream cocktail using vodka instead of gin.",
    instructions: "Shake vodka, crème de cacao, and cream with ice. Strain into a cocktail glass and garnish with grated chocolate."
  },
  "Alexander's Big Brother": {
    description: "Rich variation on the Alexander with brandy and chocolate liqueur.",
    instructions: "Shake brandy, dark crème de cacao, and cream with ice. Strain into a chilled glass and garnish with nutmeg."
  },
  "Alexander's Sister": {
    description: "Minty cousin to the Alexander using crème de menthe.",
    instructions: "Shake gin, crème de menthe, and cream with ice. Strain into a chilled glass and dust with grated chocolate."
  },
  "Alien Brain Hemorrhage": {
    description: "Layered novelty shot resembling a gory alien brain.",
    instructions: "Layer peach schnapps, Irish cream, and blue curaçao in a shot glass. Finish with a few drops of grenadine."
  },
  "Almond Old Fashioned": {
    description: "Nutty twist on the classic Old Fashioned featuring amaretto.",
    instructions: "Stir bourbon, amaretto, and bitters with ice. Strain over fresh ice in a rocks glass and garnish with an orange peel."
  },
  "Amaretto Sour": {
    description: "Sweet and tangy cocktail of amaretto balanced with citrus.",
    instructions: "Shake amaretto, lemon juice, and simple syrup with ice. Strain over ice in a rocks glass and garnish with a cherry and orange slice."
  },
  "Amaro Paloma": {
    description: "Bitter-sweet highball blending amaro with grapefruit soda.",
    instructions: "Fill a highball glass with ice. Add tequila, amaro, and lime juice. Top with grapefruit soda and stir."
  },
  "Ambassador": {
    description: "Whiskey-forward cocktail accented with curaçao and bitters.",
    instructions: "Stir rye whiskey, Curaçao, and bitters with ice. Strain into a chilled cocktail glass and garnish with a lemon twist."
  },
  "Anaconda": {
    description: "Tropical mix of rum, banana liqueur, and citrus.",
    instructions: "Shake rum, banana liqueur, lime juice, and simple syrup with ice. Strain into a chilled glass and garnish with a banana slice."
  },
  "Angel's Kiss": {
    description: "Layered dessert shot of crème de cacao, cream, and brandy.",
    instructions: "Layer dark crème de cacao, cream, and brandy in a cordial glass, keeping layers distinct."
  },
  "Angel's Tit": {
    description: "Sweet layered liqueur and cream cordial.",
    instructions: "Layer maraschino liqueur and cream in a small glass. Top with a cherry."
  },
  "Apple Cart": {
    description: "Apple-flavored spin on the Sidecar with Calvados.",
    instructions: "Shake calvados, orange liqueur, and lemon juice with ice. Strain into a sugared-rim cocktail glass."
  },
  "Apple Sunrise": {
    description: "Tequila Sunrise-style drink featuring apple juice.",
    instructions: "Build tequila and apple juice over ice in a tall glass. Slowly pour grenadine to create a sunrise effect and garnish with an apple slice."
  },
  "Appletini": {
    description: "Vibrant green vodka martini flavored with apple.",
    instructions: "Shake vodka and sour apple schnapps with ice. Strain into a martini glass and garnish with an apple slice."
  },
  "Asian Hooker": {
    description: "Tropical shooter combining coconut rum and melon liqueur.",
    instructions: "Shake equal parts coconut rum and melon liqueur with ice. Strain into a shot glass."
  },
  "B&B": {
    description: "Classic duo of brandy and Bénédictine served over ice.",
    instructions: "Pour equal parts brandy and Bénédictine over ice in a snifter and stir gently."
  },
  "B-52": {
    description: "Famous layered shot of Kahlúa, Baileys, and Grand Marnier.",
    instructions: "Layer coffee liqueur, Irish cream, and orange liqueur in a shot glass, in that order."
  },
  "B-55": {
    description: "Variation on the B-52 replacing Grand Marnier with absinthe.",
    instructions: "Layer Kahlúa, Irish cream, and absinthe in a shot glass."
  },
  "BMW": {
    description: "Equal parts Baileys, Malibu, and whisky in a shot.",
    instructions: "Shake Baileys, coconut rum, and Scotch with ice. Strain into a shot glass."
  },
  "Baby Guinness": {
    description: "Shot resembling a tiny pint of stout made from coffee liqueur and Irish cream.",
    instructions: "Pour coffee liqueur into a shot glass then gently float Irish cream on top to create a head."
  },
  "Bacardi Cocktail": {
    description: "Pre-Prohibition mix of Bacardi rum, lime, and grenadine.",
    instructions: "Shake white rum, lime juice, and grenadine with ice. Strain into a chilled cocktail glass."
  },
  "Bad Word": {
    description: "Spirit-forward blend of bourbon, Campari, Fernet, and lemon.",
    instructions: "Shake bourbon, Campari, Fernet Branca, and lemon juice with ice. Strain into a coupe and garnish with a lemon twist."
  },
  "Bahama Mama": {
    description: "Tropical tiki drink mixing rums with coconut and fruit juices.",
    instructions: "Shake dark rum, coconut rum, coffee liqueur, pineapple juice, and lemon juice with ice. Pour into a glass over crushed ice and garnish with fruit."
  },
  "Bamboo Classic": {
    description: "Sherry and vermouth aperitif seasoned with bitters.",
    instructions: "Stir dry sherry, dry vermouth, and bitters with ice. Strain into a chilled coupe and garnish with a lemon twist."
  },
  "Bamboo Modern": {
    description: "Contemporary sweeter take on the Bamboo cocktail.",
    instructions: "Stir sherry, sweet vermouth, and bitters with ice. Strain into a coupe and garnish with orange zest."
  },
  "Banana Calling": {
    description: "Fruity mix of banana liqueur and citrus.",
    instructions: "Shake vodka, banana liqueur, orange juice, and lemon juice with ice. Strain into a chilled glass."
  },
  "Banana Colada": {
    description: "Piña Colada variation featuring banana.",
    instructions: "Blend rum, banana, pineapple juice, coconut cream, and ice until smooth. Pour into a glass and garnish with banana."
  },
  "Banana Daiquiri": {
    description: "Frozen tropical daiquiri flavored with banana.",
    instructions: "Blend rum, banana, lime juice, and sugar with crushed ice. Pour into a chilled glass and garnish with banana."
  },
  "Banana Fantasy": {
    description: "Creamy banana cocktail often served frozen.",
    instructions: "Blend banana liqueur, cream, and ice until smooth. Pour into a glass and garnish with whipped cream."
  },
  "Banana Flash": {
    description: "Sweet shooter combining banana liqueur and coffee liqueur.",
    instructions: "Shake banana liqueur and coffee liqueur with ice. Strain into a shot glass."
  },
  "Banshee": {
    description: "Creamy banana and cacao cocktail.",
    instructions: "Shake banana liqueur, crème de cacao, and cream with ice. Strain into a cocktail glass."
  },
  "Barbara": {
    description: "Vodka and coffee liqueur shot topped with cream.",
    instructions: "Shake vodka and coffee liqueur with ice. Strain into a shot glass and float cream on top."
  },
  "Barracuda": {
    description: "Tiki-style sparkling cocktail with rum and pineapple.",
    instructions: "Shake gold rum, Galliano, pineapple juice, and lime with ice. Strain into a flute and top with prosecco."
  },
  "Basil Julep": {
    description: "Herbal twist on the Mint Julep using basil leaves.",
    instructions: "Muddle basil with sugar and a splash of water in a julep cup. Fill with crushed ice, add bourbon, and stir. Garnish with more basil."
  },
  "Bay Breeze": {
    description: "Refreshing highball of vodka, cranberry, and pineapple juices.",
    instructions: "Fill a highball glass with ice. Add vodka and top with cranberry and pineapple juices. Stir gently."
  },
  "Beach Blonde": {
    description: "Light tropical blend of rum, banana, and citrus.",
    instructions: "Shake light rum, banana liqueur, pineapple juice, and orange juice with ice. Strain into an ice-filled glass."
  },
  "Bentley": {
    description: "Smooth apple and calvados cocktail from the 1920s.",
    instructions: "Stir applejack and Dubonnet with ice. Strain into a cocktail glass and garnish with a lemon twist."
  },
  "Bijou": {
    description: "Classic mix of gin, sweet vermouth, and green Chartreuse.",
    instructions: "Stir gin, sweet vermouth, and green Chartreuse with ice. Strain into a chilled coupe and garnish with a lemon twist."
  },
  "Bird of Paradise": {
    description: "Tiki cocktail featuring rum and tropical juices.",
    instructions: "Shake rum, lime juice, apricot brandy, and pineapple juice with ice. Strain into a chilled glass and garnish with fruit."
  },
  "Blood and Sand": {
    description: "Scotch-based classic named after a 1922 film.",
    instructions: "Shake Scotch, sweet vermouth, cherry brandy, and orange juice with ice. Strain into a cocktail glass and garnish with an orange twist."
  },
  "Blow Job": {
    description: "Popular party shot of coffee liqueur, Irish cream, and whipped cream.",
    instructions: "Layer coffee liqueur and Irish cream in a shot glass and top with whipped cream."
  },
  "Blue Hawaii": {
    description: "Vibrant blue tropical cocktail created in Honolulu.",
    instructions: "Shake light rum, vodka, blue curaçao, pineapple juice, and sweet & sour with ice. Pour into a hurricane glass and garnish with pineapple."
  },
  "Blue Kamikaze": {
    description: "Electric-blue version of the classic vodka lime shooter.",
    instructions: "Shake vodka, blue curaçao, and lime juice with ice. Strain into a shot glass."
  },
  "Blue Lagoon": {
    description: "Citrusy highball with vodka, blue curaçao, and lemonade.",
    instructions: "Build vodka and blue curaçao over ice in a highball glass and top with lemonade. Stir."
  },
  "Blue Ocean": {
    description: "Refreshing blue cocktail with coconut rum and pineapple.",
    instructions: "Shake coconut rum, blue curaçao, and pineapple juice with ice. Strain into a chilled glass over ice."
  },
  "Blueberry Tea": {
    description: "Hot drink of tea, amaretto, and orange liqueur that tastes like blueberries.",
    instructions: "Pour amaretto and orange liqueur into a mug. Add hot orange pekoe tea and garnish with a lemon wheel."
  },
  "Bobby Burns": {
    description: "Scotch and sweet vermouth cocktail with a hint of Bénédictine.",
    instructions: "Stir Scotch, sweet vermouth, and Bénédictine with ice. Strain into a coupe and garnish with lemon twist."
  },
  "Bolo Cocktail": {
    description: "Gin and cherry brandy drink from the early 20th century.",
    instructions: "Shake gin, cherry brandy, and orange juice with ice. Strain into a chilled cocktail glass."
  },
  "Brandy Eggnog": {
    description: "Holiday favorite blending brandy with rich eggnog.",
    instructions: "Shake brandy, milk, egg, sugar, and nutmeg with ice. Strain into a glass and top with grated nutmeg."
  },
  "Brave Bull": {
    description: "Two-ingredient mix of tequila and coffee liqueur.",
    instructions: "Pour tequila and coffee liqueur over ice in an old-fashioned glass and stir."
  },
  "Breakfast Martini": {
    description: "Modern gin sour featuring orange marmalade.",
    instructions: "Shake gin, orange liqueur, lemon juice, and a spoon of marmalade with ice. Strain into a cocktail glass and garnish with toast or peel."
  },
  "Bumbo": {
    description: "Spiced pirate-era drink of rum, sugar, water, and nutmeg.",
    instructions: "Stir rum, water, sugar, and a pinch of nutmeg until dissolved. Serve over ice with grated nutmeg."
  },
  "Caipirissima": {
    description: "Daiquiri-like cocktail using rum instead of cachaça.",
    instructions: "Muddle lime wedges with sugar in a glass. Add rum and crushed ice, then stir."
  },
  "Caipiroska": {
    description: "Vodka-based cousin of the Caipirinha.",
    instructions: "Muddle lime and sugar in a rocks glass. Add vodka and crushed ice and stir."
  },
  "Caipirão": {
    description: "Caipirinha variation using Licor Beirão.",
    instructions: "Muddle lime with sugar in a glass. Add Licor Beirão and crushed ice, then stir."
  },
  "Car crash": {
    description: "Powerful shooter combining sambuca and tequila.",
    instructions: "Layer tequila over sambuca in a shot glass and ignite briefly before serving (optional)."
  },
  "Caribou Lou": {
    description: "Party punch of rum, pineapple juice, and 151-proof rum popularized by Tech N9ne.",
    instructions: "Stir coconut rum, 151-proof rum, and pineapple juice with ice in a highball glass."
  },
  "Champs Elysees": {
    description: "Elegant brandy sour accented with Chartreuse.",
    instructions: "Shake cognac, lemon juice, green Chartreuse, simple syrup, and bitters with ice. Strain into a cocktail glass and garnish with lemon."
  },
  "Charlie Chaplin": {
    description: "Silent-era cocktail with sloe gin, apricot brandy, and lime.",
    instructions: "Shake sloe gin, apricot brandy, and lime juice with ice. Strain into a cocktail glass."
  },
  "Cherry Alexander": {
    description: "Fruity Alexander variation with cherry brandy.",
    instructions: "Shake cherry brandy, crème de cacao, and cream with ice. Strain into a chilled glass and garnish with nutmeg."
  },
  "Cherry Hooker": {
    description: "Cherry-flavored shooter with Irish cream.",
    instructions: "Layer cherry brandy and Irish cream in a shot glass."
  },
  "Chilcano de Pisco": {
    description: "Peruvian pisco highball with ginger ale and lime.",
    instructions: "Fill a glass with ice. Add pisco, lime juice, and ginger ale. Stir and garnish with bitters."
  },
  "Chocolate Espresso Martini": {
    description: "Rich martini combining chocolate liqueur and espresso.",
    instructions: "Shake vodka, coffee liqueur, chocolate liqueur, and espresso with ice. Strain into a cocktail glass and garnish with coffee beans."
  },
  "Christmas Velvet Alexander": {
    description: "Holiday-spiced take on the classic Alexander.",
    instructions: "Shake brandy, crème de cacao, cream, and a pinch of nutmeg with ice. Strain into a cocktail glass and garnish with grated nutmeg."
  },
  "Contessa": {
    description: "Bitter-sweet aperitif similar to a lighter Negroni.",
    instructions: "Stir gin, Aperol, and dry vermouth with ice. Strain into a rocks glass over ice and garnish with orange."
  },
  "Copenhagen 1939": {
    description: "Historical cocktail of aquavit and cherry brandy.",
    instructions: "Stir aquavit, cherry brandy, and sweet vermouth with ice. Strain into a chilled glass."
  },
  "Corpse Reviver": {
    description: "Catch-all name for morning-after restorative cocktails.",
    instructions: "Shake equal parts gin, lemon juice, triple sec, and Lillet with a dash of absinthe. Strain into a chilled glass."
  },
  "Creamsicle": {
    description: "Sweet orange and cream cocktail reminiscent of the frozen treat.",
    instructions: "Shake vanilla vodka, orange juice, and cream with ice. Strain into a glass and garnish with an orange wheel."
  },
  "Creme Anglaise": {
    description: "Dessert-like cocktail inspired by custard sauce.",
    instructions: "Shake vanilla vodka, white crème de cacao, and cream with ice. Strain into a cocktail glass."
  },
  "Culto A La Vida": {
    description: "Rum-based cocktail honoring Cuban club culture.",
    instructions: "Shake rum, dry vermouth, and grapefruit juice with ice. Strain into a chilled glass."
  },
  "Dan Sabo's Whiskey Sour": {
    description: "Balanced whiskey sour variation by bartender Dan Sabo.",
    instructions: "Shake bourbon, lemon juice, simple syrup, and egg white with ice. Strain over fresh ice and garnish with bitters."
  },
  "Dandy": {
    description: "Classic cognac cocktail with vermouth and bitters.",
    instructions: "Stir cognac, sweet vermouth, orange curaçao, and bitters with ice. Strain into a cocktail glass and garnish with lemon."
  },
  "Death In The Afternoon": {
    description: "Absinthe and champagne cocktail attributed to Hemingway.",
    instructions: "Pour absinthe into a champagne flute and slowly top with chilled champagne until cloudy."
  },
  "Delta Sunset": {
    description: "Fruity vodka drink with layers of orange and blackberry.",
    instructions: "Shake vodka, triple sec, orange juice, and blackberry liqueur with ice. Strain into a glass over ice."
  },
  "Derby IBA": {
    description: "IBA official cocktail featuring bourbon and mint.",
    instructions: "Shake bourbon, sweet vermouth, orange curaçao, and lime juice with ice. Strain into a cocktail glass and garnish with mint."
  },
  "Derby Popular": {
    description: "Simpler version of the Derby using bourbon and peach bitters.",
    instructions: "Stir bourbon, peach bitters, and sweet vermouth with ice. Strain into a cocktail glass and garnish with mint."
  },
  "Devil's Margarita": {
    description: "Tequila sour topped with a float of red wine.",
    instructions: "Shake tequila, lime juice, and simple syrup with ice. Strain into a coupe and gently float red wine on top."
  },
  "Dirty Banana": {
    description: "Blended cocktail of rum, banana, and coffee flavors.",
    instructions: "Blend rum, banana liqueur, coffee liqueur, banana, milk, and ice until smooth. Pour into a glass and garnish with banana."
  },
  "Dirty Girl Scout": {
    description: "Mint-chocolate shooter reminiscent of the cookie.",
    instructions: "Shake vodka, coffee liqueur, crème de menthe, and cream with ice. Strain into a shot glass."
  },
  "Dirty Shyrly": {
    description: "Adult twist on the Shirley Temple with vodka.",
    instructions: "Build vodka and lemon-lime soda over ice in a glass. Add grenadine and garnish with cherries."
  },
  "Doralto": {
    description: "Tequila-based drink with Drambuie and honey notes.",
    instructions: "Shake tequila, Drambuie, lime juice, and honey syrup with ice. Strain into a glass over ice."
  },
  "Drunk Melon": {
    description: "Sweet blend of melon liqueur and vodka served as a shooter.",
    instructions: "Shake melon liqueur and vodka with ice. Strain into a shot glass."
  },
  "Dubonnet": {
    description: "Aperitif of Dubonnet and gin enjoyed by Queen Elizabeth II.",
    instructions: "Pour Dubonnet and gin over ice in a rocks glass. Stir and garnish with lemon."
  },
  "Dubonnet-Cassis": {
    description: "Dubonnet mixed with crème de cassis for a berry twist.",
    instructions: "Stir Dubonnet and crème de cassis with ice. Strain into a chilled glass and garnish with lemon peel."
  },
  "Eastside": {
    description: "Cucumber and mint take on the Southside cocktail.",
    instructions: "Muddle cucumber and mint with lime juice and syrup. Add gin and ice, shake, then strain into a coupe."
  },
  "Eggnog": {
    description: "Traditional creamy holiday drink of eggs, milk, and spirits.",
    instructions: "Shake egg, milk, sugar, and rum or brandy with ice. Strain into a glass and grate nutmeg on top."
  },
  "El Presidente": {
    description: "Cuban rum cocktail with vermouth and orange curaçao.",
    instructions: "Stir rum, dry vermouth, orange curaçao, and grenadine with ice. Strain into a cocktail glass and garnish with orange peel."
  },
  "Emerson": {
    description: "Gin and vermouth cocktail named after writer Ralph Waldo Emerson.",
    instructions: "Stir gin, dry vermouth, and orange bitters with ice. Strain into a chilled glass."
  },
  "End of the Road": {
    description: "Strong layered shot combining coffee liqueur, herbal liqueur, and bourbon.",
    instructions: "Layer coffee liqueur, herbal liqueur, and bourbon in a shot glass."
  },
  "First Word": {
    description: "Modern riff on the Last Word swapping gin for bourbon.",
    instructions: "Shake bourbon, green Chartreuse, maraschino liqueur, and lime juice with ice. Strain into a coupe."
  },
  "Genever Fruit Cup": {
    description: "Dutch-style fruit cup featuring genever and fresh fruit.",
    instructions: "Combine genever with fruit, citrus juice, and soda in a pitcher with ice. Stir and serve."
  },
  "Gin & Tonic": {
    description: "Classic highball marrying gin with bitter quinine tonic water.",
    instructions: "Fill a highball glass with ice. Pour gin, top with tonic water, and garnish with a lime wedge."
  },
  "Hazelnut Alexander": {
    description: "Dessert cocktail using Frangelico in an Alexander template.",
    instructions: "Shake hazelnut liqueur, crème de cacao, and cream with ice. Strain into a cocktail glass and garnish with nutmeg."
  },
  "Hiroshima": {
    description: "Layered shooter known for its dramatic curdling effect.",
    instructions: "Layer sambuca, Irish cream, and absinthe in a shot glass. Drop in grenadine to finish."
  },
  "Irish Alexander": {
    description: "St. Patrick's Day twist with Irish whiskey and cream.",
    instructions: "Shake Irish whiskey, crème de menthe, and cream with ice. Strain into a chilled glass."
  },
  "Kir Royal": {
    description: "Elegant sparkling cocktail of cassis and champagne.",
    instructions: "Pour crème de cassis into a flute and gently top with chilled champagne."
  },
  "Light Word": {
    description: "Lighter citrus variation of the Last Word.",
    instructions: "Shake gin, lime juice, elderflower liqueur, and green Chartreuse with ice. Strain into a coupe."
  },
  "Love & Murder": {
    description: "Dark fruit-forward cocktail with rum and red wine.",
    instructions: "Shake dark rum, red wine, cherry liqueur, and lime juice with ice. Strain into a glass over ice."
  },
  "Mind Eraser": {
    description: "Layered drink of vodka, coffee liqueur, and soda meant to be sipped through a straw.",
    instructions: "Layer coffee liqueur, vodka, and club soda over ice in a rocks glass. Drink through a straw."
  },
  "Rossini": {
    description: "Strawberry twist on the Bellini using prosecco.",
    instructions: "Pour strawberry purée into a flute and top with chilled prosecco. Stir gently."
  },
  "Rum & Cola": {
    description: "Simple highball of rum mixed with cola.",
    instructions: "Fill a glass with ice. Add rum and top with cola. Garnish with lime if desired."
  },
  "Tintoretto": {
    description: "Prosecco cocktail with pomegranate juice named after the painter.",
    instructions: "Combine pomegranate juice and prosecco in a flute and stir gently."
  },
  "Tom Collins": {
    description: "Classic gin sour lengthened with sparkling water.",
    instructions: "Shake gin, lemon juice, and simple syrup with ice. Strain into a tall glass over ice and top with soda water. Garnish with lemon and cherry."
  },
  "White Russian": {
    description: "Creamy coffee-flavored cocktail of vodka, Kahlúa, and cream.",
    instructions: "Pour vodka and coffee liqueur over ice in an old-fashioned glass. Float cream on top and stir gently."
  }
};

for (const cocktail of data.cocktails) {
  const update = updates[cocktail.name];
  if (update) {
    if (!cocktail.description || cocktail.description.trim() === '') {
      cocktail.description = update.description;
    }
    if (!cocktail.instructions || cocktail.instructions.trim() === '') {
      cocktail.instructions = update.instructions;
    }
  }
}

fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
console.log('Updated cocktail descriptions and instructions where missing.');

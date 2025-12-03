// =======================
// GLOBAL CONFIGURATION
// =======================
const w = window.innerWidth;
const h = window.innerHeight;

// Shelter ground Y (adjust as needed to match your ground line)

// =======================
// GAME STATE
// =======================
const gameState = {
  // Level system
  level: 1,
  baseBuildCosts: { fire: 3, bucket: 5, shelter: 7 },
  buildCosts: { fire: 3, bucket: 5, shelter: 7 },
  // Scene reference
  scene: null,

  // Player state
  player: null,
  health: 100,
  maxHealth: 100,
  playerTemp: 70,
  isMelting: false,
  gameOver: false,
  currentVelocityX: 0,

  // Survival needs
  hunger: 50,
  maxHunger: 100,
  thirst: 50,
  maxThirst: 100,
  lastHungerThirstTick: 0, // Track last time hunger/thirst were reduced

  // Movement state
  isClimbing: false,
  isJumping: false,
  isCrouching: false,
  isLanding: false,
  jumpCutApplied: false,
  spaceHeld: false,
  hasLeftGround: false,
  jumpStartVelocityX: 0,
  jumpChargeStartTime: 0, // Track when space bar held for charged jumps
  coyoteTime: 0,
  jumpBufferTime: 0,

  // Resources
  sticksCollected: 5,
  waterCollected: 0,
  score: 0,

  // Environment
  fires: [],
  nearFire: false,
  fireContactTime: 0,
  temperature: 65,
  gameTime: 7 * 60, // Start at 7:00 AM (in minutes)
  gameDay: 0, // Track current day number
  dayStart: 7 * 60, // Track when current day started (7:00 AM)

  // Tree climbing
  treeTrunk: null,
  branches: null,
  maxBranches: 3,
  branchRegenerationDelay: 10, // seconds
  lastBranchGrowTime: 0, // Track when last branch grew
  branchGrowCooldown: 10, // seconds between branch growths

  // Saw sound state
  spacePressed: false,
  sawSoundPlaying: false,
  spaceDownTime: 0,

  // Fire building
  buildingFire: false,

  // Build system
  buildMode: null, // 'fire' or 'bucket' when placing
  placementItem: null, // The sprite being placed
  placementArrowLeft: null,
  placementArrowRight: null,

  // Build menu
  buildMenuOpen: false,
  buildMenuSelection: 0, // Index of currently selected buildable item
  buildableItems: [], // Array of items player can currently afford
  buildCostText: null, // Text showing cost of selected item

  // Shelters
  shelters: [],
  // Shelter platforms (for physics)
  shelterPlatforms: null,
  snapped: false,

  // Water collection
  buckets: [],
  raindrops: null,
  isRaining: false,
  stormActive: false,
  stormStrength: 0, // 0 to 1
  nextStormTime: 0,
  stormEndTime: 0,
  rainMinutesToday: 0, // Track total rain per day
  lastDayChecked: 0,
  stormSchedule: [], // Array of {start, end} for today's storms
  stormIndex: 0, // Which storm is next

  // Info text system
  infoText: null,
  infoTextCheck: null,
  infoTextX: null,
  infoTextTimer: null,
  lastBranchPickupTime: 0,
  branchesPickedInWindow: 0,
  lastTempWarningTime: 0,

  //Bush
  bush: {
    width: 64,
  }
};

// =======================
// HELPER FUNCTIONS
// =======================
// Global counter for +1 rotation alternation
let plusOneCounter = 0;

function showPlusOne(scene, x, y, count = 1) {
  // Spawn 'count' number of +1 images with slight random offset
  for (let i = 0; i < count; i++) {
    const offsetX = Phaser.Math.Between(-20, 20);
    const offsetY = Phaser.Math.Between(-15, 15);
    
    const plusOneImg = scene.add.image(x + offsetX, y - 60 + offsetY, 'plusOne');
    plusOneImg.setScale(0.8);
    plusOneImg.setDepth(1000);
    plusOneImg.setAlpha(1);
    
    // Alternate between normal and 90 degrees left rotation using global counter
    let targetX;
    if (plusOneCounter % 2 === 1) {
      plusOneImg.angle = -70.5; // Rotated
      targetX = plusOneImg.x - 60; // Move left
    } else {
      targetX = plusOneImg.x + 60; // Move right
      plusOneImg.angle = -22.5;
    }
    plusOneCounter++;
    
    // Animate: stay visible for 400ms, then float up and fade out, move diagonally
    scene.tweens.add({
      targets: plusOneImg,
      x: targetX,
      y: plusOneImg.y - 50,
      alpha: { from: 1, to: 0, delay: 800 },
      duration: 1000,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        plusOneImg.destroy();
      }
    });
  }
}

// High Score Management Functions
function loadHighScores() {
  const saved = localStorage.getItem('survivalHighScores');
  return saved ? JSON.parse(saved) : [];
}

function saveHighScores(scores) {
  localStorage.setItem('survivalHighScores', JSON.stringify(scores));
}

function isHighScore(score) {
  const scores = loadHighScores();
  return scores.length < 10 || score > scores[9].score;
}

function addHighScore(name, score) {
  const scores = loadHighScores();
  scores.push({ name, score });
  scores.sort((a, b) => b.score - a.score);
  // Don't limit to 10 - keep all scores
  saveHighScores(scores);
  return scores.findIndex(s => s.name === name && s.score === score) + 1; // Return rank
}

function showInfoText(message, duration = 2000) {
  if (gameState.infoText) {
    // Clear existing timer if any
    if (gameState.infoTextTimer) {
      gameState.infoTextTimer.remove();
    }

    // Hide build menu colored text if visible
    if (gameState.infoTextCheck) gameState.infoTextCheck.setVisible(false);
    if (gameState.infoTextX) gameState.infoTextX.setVisible(false);

    // Show the message
    gameState.infoText.setText(message);
    gameState.infoText.setVisible(true);

    // Set timer to hide after duration
    if (duration < 999999) {
      gameState.infoTextTimer = gameState.scene.time.delayedCall(duration, () => {
        gameState.infoText.setVisible(false);
      });
    }
  }
}

function showBuildMenuText(itemName, cost) {
  if (gameState.infoText && gameState.infoTextCheck && gameState.infoTextX) {
    // Clear existing timer
    if (gameState.infoTextTimer) {
      gameState.infoTextTimer.remove();
    }

    // Set main text
    gameState.infoText.setText(`${gameState.buildableItems.length>1?"← ":""}Build a ${itemName}${gameState.buildableItems.length>1?" →":""}`);
    gameState.infoText.setVisible(true);

    // Show colored check and x with keyboard hints
    gameState.infoTextCheck.setVisible(true);
    gameState.infoTextX.setVisible(true);

    // Show cost below build menu
    if (gameState.buildCostText) {
      gameState.buildCostText.setText(`[Wood: ${cost}]`);
      gameState.buildCostText.setVisible(true);
    }
  }
}

function hideBuildMenuText() {
  if (gameState.infoText) gameState.infoText.setVisible(false);
  if (gameState.infoTextCheck) gameState.infoTextCheck.setVisible(false);
  if (gameState.infoTextX) gameState.infoTextX.setVisible(false);
  if (gameState.buildCostText) gameState.buildCostText.setVisible(false);
}

// =======================
// START MENU SCENE
// =======================
class StartMenuScene extends Phaser.Scene {
  constructor() {
    super('StartMenu');
  }

  preload() {
    this.load.image('introBackground', 'assets/survival_intro.jpg');
    this.load.audio('titleFire', 'assets/audio/fire.mp3');
  }

  create() {
    // Start fire audio looping
    this.titleFireSound = this.sound.add('titleFire', { loop: true, volume: 0.5 });
    this.titleFireSound.play();
    // Add background
    const bg = this.add.image(w / 2, h, 'introBackground');
    bg.setOrigin(0.5, 1); // Anchor from bottom center
    const scaleX = w / 1200;
    const scaleY = h / 800;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);

    
    // Start button
    const startButton = this.add.text(w / 2, h / 2+140, 'START', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#00000088',
      padding: { x: 40, y: 20 }
    });
    startButton.setOrigin(0.5);
    startButton.setInteractive({ useHandCursor: true });
    startButton.on('pointerover', () => {
      startButton.setColor('#ffff00');
    });
    startButton.on('pointerout', () => {
      startButton.setColor('#ffffff');
    });
    startButton.on('pointerdown', () => {
      this.titleFireSound.stop();
      this.scene.start('Game');
    });

    // How To Play button
    const howToButton = this.add.text(w /2, h / 2 + 100+130, 'HOW TO PLAY', {
      fontSize: '24px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      backgroundColor: '#00000088',
      padding: { x: 20, y: 10 }
    });
    howToButton.setOrigin(0.5);
    howToButton.setInteractive({ useHandCursor: true });
    howToButton.on('pointerover', () => {
      howToButton.setColor('#ffff00');
    });
    howToButton.on('pointerout', () => {
      howToButton.setColor('#ffffff');
    });
    howToButton.on('pointerdown', () => {
      this.titleFireSound.stop();
      this.scene.start('HowToPlay');
    });
  }
}

// =======================
// HOW TO PLAY SCENE
// =======================
class HowToPlayScene extends Phaser.Scene {
  constructor() {
    super('HowToPlay');
  }

  preload() {
    this.load.image('introBackground', 'assets/survival_intro.jpg');
  }

  create() {
    // Add background
    const bg = this.add.image(w / 2, h, 'introBackground');
    bg.setOrigin(0.5, 1); // Anchor from bottom center
    const scaleX = w / 1200;
    const scaleY = h / 800;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale);

    // Add semi-transparent overlay
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7);

    // Title
    const title = this.add.text(w / 2, 60, 'HOW TO PLAY', {
      fontSize: '48px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4
    });
    title.setOrigin(0.5);

    // Instructions
    const instructions = [
      'GOAL: Survive as long as possible',
      '',
      'GROUND:',
      'Left/Right - Move',
      'Up - Pick Berries',
      'Down - Drink from Bucket',
      'Spacebar - Hold to charge/Release to Jump',
      '',
      'CLIMBING:',
      'Up/Down - Climb',
      'Spacebar - Use Chainsaw',
      '',
      'BUILDING:',
      'B - Build Menu',
      'Left/Right - Cycle Options/Choose Placement',
      'Up - Cycle Shelter Types',
      '',
      'SURVIVAL:',
      '\u2022 Manage hunger, thirst, and temperature',
      '\u2022 Build fires to stay warm at night',
      '\u2022 Collect rainwater with buckets',
      '\u2022 Pick berries from bushes for food',
      '\u2022 Build shelters for protection',
      '',
      'Press ESC to return to Main Menu',
      'Press any other key to start playing...'
    ];

    const instructionText = this.add.text(w / 2, 120, instructions.join('\n'), {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'left',
      lineSpacing: 6
    });
    instructionText.setOrigin(0.5, 0);

    // Listen for ESC to return to main menu
    this.input.keyboard.on('keydown-ESC', () => {
      this.scene.start('StartMenu');
    });

    // Listen for any other key press to start game
    this.input.keyboard.once('keydown', (event) => {
      if (event.key !== 'Escape') {
        this.scene.start('Game');
      }
    });
  }
}

// =======================
// MAIN GAME SCENE
// =======================
class GameScene extends Phaser.Scene {
  constructor() {
    super('Game');
  }

  preload() {
  // Bush sound effect
  this.load.audio('bush', 'assets/audio/bush.mp3');
  // Berry bush and berry assets
  this.load.spritesheet('berry_bush', 'assets/berry_bush_sprite.png', {
    frameWidth: 64,
    frameHeight: 64
  });
  this.load.image('berry', 'assets/berry.png');
  this.load.spritesheet('bush_fire', 'assets/bush_fire.png', {
    frameWidth: 64,
    frameHeight: 64
  });
  // Environment sprites
  this.load.image('tree', 'assets/tree_level_1.png');
  this.load.image('horizon', 'assets/horizon.png');
  this.load.spritesheet('branch', 'assets/branch_sprite.png', {
    frameWidth: 50,
    frameHeight: 24
  });
  this.load.image('raindrop', 'assets/raindrop.png');
  this.load.image('plusOne', 'assets/plusOne.png');

  // Player sprites
  this.load.spritesheet('spritesheet', 'assets/Sprite_Sheet.png', {
    frameWidth: 64,
    frameHeight: 64
  });
  this.load.image('fire_player', 'assets/fire_player.png');
  this.load.image('dead_player', 'assets/dead.png');
  // Fire sprites
  this.load.spritesheet('fire_spritesheet', 'assets/fire_sprite_sheet.png', {
    frameWidth: 64,
    frameHeight: 64
  });

  // Bucket sprites
  this.load.spritesheet('bucket_spritesheet', 'assets/bucket_sprite_sheet.png', {
    frameWidth: 64,
    frameHeight: 64
  });

  // Ground sprites
  this.load.spritesheet('grass_spritesheet', 'assets/grass_sprite_sheet.png', {
    frameWidth: 256,
    frameHeight: 64
  });

  // Tool sprites
  this.load.spritesheet('saw_sprite_sheet', 'assets/saw_sprite_sheet.png', {
    frameWidth: 64,
    frameHeight: 64
  });

  // Shelter sprite
  this.load.spritesheet('shelter', 'assets/shelter_sprite.png', {
    frameWidth: 128,
    frameHeight: 128,
    endFrame: 7 // Only load frames 0-7 (8 frames total)
  });

  // Placeholder images (unused in current build)
  this.load.image('platform', 'https://content.codecademy.com/courses/learn-phaser/physics/platform.png');
  this.load.image('bug2', 'https://content.codecademy.com/courses/learn-phaser/physics/bug_2.png');
  this.load.image('bug3', 'https://content.codecademy.com/courses/learn-phaser/physics/bug_3.png');
  this.load.image('codey', 'https://content.codecademy.com/courses/learn-phaser/physics/codey.png');

  // Audio
  this.load.audio('sawAttack', 'assets/Attack_Note.mp3');
  this.load.audio('sawSustain', 'assets/Sustain_Note.mp3');
  this.load.audio('sawRelease', 'assets/Release_Note.mp3');
  this.load.audio('sawFullNote', 'assets/Survival_Note.mp3');
  this.load.audio('backgroundMusic', 'assets/Survival_Music.mp3');

  // Sound effects
  this.load.audio('chainsaw', 'assets/audio/chainsaw.mp3');
  this.load.audio('climbing', 'assets/audio/climbing.mp3');
  this.load.audio('gulp', 'assets/audio/gulp.mp3');
  this.load.audio('jump', 'assets/audio/jump.mp3');
  this.load.audio('menuSelection', 'assets/audio/menu_selection.mp3');
  this.load.audio('placement', 'assets/audio/placement.mp3');
  this.load.audio('waterDrop', 'assets/audio/water_drop.mp3');
  this.load.audio('startFire', 'assets/audio/start_fire.mp3');
  this.load.audio('fire', 'assets/audio/fire.mp3');
  this.load.audio('fire_out', 'assets/audio/fire_out.mp3');
  this.load.audio('crouch', 'assets/audio/crouch.mp3');
  this.load.audio('pickUpItem', 'assets/audio/pick_up_item.mp3');
  // New audio
  this.load.audio('footsteps', 'assets/audio/footsteps.mp3');
  this.load.audio('rain', 'assets/audio/rain.mp3');
  this.load.audio('death_scream', 'assets/audio/death_scream.mp3');
  this.load.audio('end_music', 'assets/audio/end_music.mp3');
}

// =======================
// CREATE SCENE
// =======================
  create() {
  // Reset game state when scene restarts
  gameState.health = 100;
  gameState.maxHealth = 100;
  gameState.hunger = 50;
  gameState.thirst = 50;
  gameState.gameOver = false;
  gameState.gameOverUI = null;
  gameState.nameSubmitted = false;
  gameState.sticksCollected = 5;
  gameState.waterCollected = 0;
  gameState.score = 0;
  gameState.gameTime = 7 * 60;
  gameState.gameDay = 0;
  gameState.dayStart = 7 * 60;
  gameState.buildCosts = { fire: 3, bucket: 5, shelter: 7 };
  gameState.fires = [];
  gameState.shelters = [];
  gameState.buckets = [];
  gameState.branches = null;
  gameState.nearFire = false;
  gameState.fireContactTime = 0;
  gameState.lastFireBurnTime = Date.now();
  gameState.buildMode = null;
  gameState.buildMenuOpen = false;
  gameState.isRaining = false;
  gameState.stormActive = false;
  gameState.stormStrength = 0;
  gameState.lastHungerThirstTick = Date.now();
  gameState.lastMeltingThirstTick = Date.now();

  // Calculate starting temperature at 6:00 AM (between 48°F at 1am and 65°F at 7am)
  // Using the same interpolation: 6am is 5/6 of the way from 1am to 7am
  const frac = 5 / 6; // 6am is 5 hours into the 6-hour span from 1am to 7am
  const mu2 = (1 - Math.cos(frac * Math.PI)) / 2;
  const startTemp = 48 * (1 - mu2) + 65 * mu2; // ~61°F
  gameState.playerTemp = startTemp;

  // Bush sound
  gameState.bushSound = this.sound.add('bush');
  // -----------------
  // BERRY BUSHES
  // -----------------
  // Group for berry bushes
  gameState.berryBushes = this.physics.add.staticGroup();
  // Group for berries
  gameState.berries = this.physics.add.group();

  // Helper to check overlap with shelters, fires, buckets, and trunk
  function isValidBerryBushPosition(x, y) {
    // Expose for regrowth logic in update()
    this.isValidBerryBushPosition = isValidBerryBushPosition;

    // Prevent spawning if more than 10% of this bush would overlap with another bush
    if (gameState.berryBushes) {
      for (const otherBush of gameState.berryBushes.getChildren()) {
        // Skip inactive bushes
        if (!otherBush.active) continue;
        const bushRect = new Phaser.Geom.Rectangle(x - 32, y - 32, 64, 64);

        const otherRect = new Phaser.Geom.Rectangle(otherBush.x - 32, otherBush.y - 32, 64, 64);
        if (Phaser.Geom.Intersects.RectangleToRectangle(bushRect, otherRect)) {
          // Calculate intersection area
          const ix = Math.max(bushRect.x, otherRect.x);
          const iy = Math.max(bushRect.y, otherRect.y);
          const iw = Math.min(bushRect.right, otherRect.right) - ix;
          const ih = Math.min(bushRect.bottom, otherRect.bottom) - iy;
          if (iw > 0 && ih > 0) {
            const intersectionArea = iw * ih;
            const bushArea = 64 * 64;
            if (intersectionArea / bushArea > 0.10) return false;
          }
        }
      }
    }

    // Check overlap with shelters
    for (const shelter of gameState.shelters) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(x - 32, y - 32, 64, 64),
        shelter.getBounds()
      )) return false;
    }
    // Check overlap with fires
    for (const fire of gameState.fires) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(x - 32, y - 32, 64, 64),
        fire.getBounds()
      )) return false;
    }
    // Check overlap with buckets
    for (const bucket of gameState.buckets) {
      if (Phaser.Geom.Intersects.RectangleToRectangle(
        new Phaser.Geom.Rectangle(x - 32, y - 32, 64, 64),
        bucket.getBounds()
      )) return false;
    }
    // Prevent spawning under the tree trunk (bush width must be fully outside trunk width)
    if (gameState.treeTrunk) {
      const trunkLeft = gameState.treeTrunk.x - gameState.treeTrunk.width / 2;
      const trunkRight = gameState.treeTrunk.x + gameState.treeTrunk.width / 2;
      const bushLeft = x - 32;
      const bushRight = x + 32;
      // Bush must be fully to the left or right of trunk
      if (!(bushRight < trunkLeft || bushLeft > trunkRight)) return false;
    }
    return true;
  }

  // Helper to spawn a berry bush at a valid random position
  function spawnBerryBush() {
    let tries = 0;
    let x, y;
    do {
      x = Phaser.Math.Between(100, w - 100);
      y = h - Phaser.Math.Between(95, 88) + 20; // Place on ground, moved down 20px
      tries++;
    } while (!isValidBerryBushPosition.call(gameState.scene, x, y) && tries < 20);
    if (tries >= 20) return null;
    const bush = gameState.berryBushes.create(x, y, 'berry_bush', 0).setScale(1);
    
    // Set depth based on y position (fire is at depth 212)
    // Bush y range is h - 95 to h - 88, which is roughly 505 to 512
    // Lower half (y < 508.5) gets depth < 212, upper half gets depth > 212
    const midY = h - 91.5; // Midpoint of the bush y range
    const bushDepth = y < midY ? 211 : 213; // Below midpoint = 211 (behind fire), above = 213 (in front)
    bush.setDepth(bushDepth);
    
    bush.refreshBody(); // Refresh static body after positioning
    bush.setData('berries', 10);
    bush.setData('regrowing', false);
    bush.setData('frameTimer', 0);
    bush.setData('frame', 0);
    bush.setInteractive();
    return bush;
  }

  // Only spawn bushes after trunk is created
  this.time.delayedCall(0, () => {
    for (let i = 0; i < 6; i++) {
      spawnBerryBush();
    }
  });
  // Weather pattern: storms only 10% of the time
  // Schedule first storm
  const dayMinutes = 24 * 60;
  const stormDurationMin = 240; // min storm duration in minutes (10 real seconds at 24 min/sec speed)
  const stormDurationMax = 480; // max storm duration in minutes (20 real seconds)
  // Rain increases 20% per day
  const scheduleStormsForDay = (dayStart) => {
    const dayNumber = Math.floor(dayStart / (24 * 60));
    const dayLength = 24 * 60; // 24 hours * 60 minutes
    
    // Base storm time is 40% of day
    const baseStormPercent = 0.40;
    const mildnessFactor = ((Math.ceil(Math.random()*1+.5) <= 1 ? -1 : 1)); // Mildness factor to reduce storm variability
    const stormVariance =  mildnessFactor * Math.random()*0.20;
    const stormPercentThisDay = baseStormPercent + stormVariance;
    
    // Calculate total storm time for this day
    let totalStormTime = stormPercentThisDay * dayLength;
    
    console.log(`Day ${dayNumber}: Storm percent ${(stormPercentThisDay * 100).toFixed(1)}%, Total storm time: ${totalStormTime.toFixed(1)} minutes`);
    
    // Determine number of storms (1-4)
    const numStormsFloat = (Math.random() * 4);
    const numStorms = Math.max(1, Math.ceil(numStormsFloat));
    
    console.log(`Number of storms: ${numStorms}`);
    
    // Calculate storm lengths
    const stormLengths = [];
    let remainingTime = totalStormTime;
    
    for (let i = numStorms; i > 1 ; i--) {
      if(remainingTime > 0){
      let stormLength = Math.random() * (remainingTime/i>stormDurationMin?remainingTime/i:stormDurationMin);
      stormLength = (stormLength > remainingTime ? remainingTime / 3 : stormLength);
      stormLengths.push(stormLength);
      remainingTime -= stormLength;
      console.log(`Storm ${i + 1} length: ${stormLength.toFixed(1)} minutes`);
    }
    else remainingTime =100;
    }
    
    // Last storm gets remaining time (if > 0)
    if (remainingTime > 0) {
      stormLengths.push(remainingTime);
      console.log(`Storm ${numStorms} length: ${remainingTime.toFixed(1)} minutes`);
    }
    
    // Shuffle storm order randomly
    for (let i = stormLengths.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [stormLengths[i], stormLengths[j]] = [stormLengths[j], stormLengths[i]];
    }
    console.log(`Storm Lengths: ${stormLengths.map(l => l.toFixed(1)).join(', ')}`);
    
    // Assign random start times for each storm throughout the day
    const storms = stormLengths.map(length => {
      const startTime = Math.random() * dayLength;
      if(length + startTime > dayLength) length = dayLength - startTime; // Adjust length if it exceeds day end
      return {
        start: startTime,
        end: startTime + length,
        length: length
      };
    });
    console.log(`Storm Times: ${storms.map(s => `(${s.start.toFixed(1)} - ${s.end.toFixed(1)})`).join(', ')}`);
    // Sort by start time for easier processing
    storms.sort((a, b) => a.start - b.start);
    
    console.log('Storm schedule:', storms.map((s, i) => 
      `Storm ${i + 1}: ${s.start.toFixed(1)} - ${s.end.toFixed(1)} (${s.length.toFixed(1)} min)\n`
    ).join(', '));
    
    return storms;
  };
  gameState.scheduleStormsForDay = scheduleStormsForDay;
  // Initialize first day's storm schedule
  gameState.stormSchedule = scheduleStormsForDay(0);
  gameState.lastDayChecked = 0;
  // Footsteps and rain audio
  gameState.footstepsSound = this.sound.add('footsteps', { loop: true, volume: 2 });
  gameState.rainSound = this.sound.add('rain', { loop: true, volume: 0.2 });
  // Force integer pixel rendering for pixel art
  this.cameras.main.roundPixels = true;
  // Track current shelter preview frame
  gameState.shelterPreviewFrame = 0;
  // Shelter has exactly 8 frames (0-7)
  gameState.shelterFrameCount = 8;
  
  const centerX = this.cameras.main.width / 2;
  const centerY = this.cameras.main.height / 2;

  gameState.scene = this;

  // -----------------
  // AUDIO SETUP
  // -----------------
  gameState.backgroundMusic = this.sound.add('backgroundMusic', {
    loop: true,
    volume: 0.5
  });
  gameState.backgroundMusic.play();

  // Saw sound objects (old system - keeping for compatibility)
  gameState.sawAttack = this.sound.add('chainsaw', { volume: 0.6 }); // Use chainsaw.mp3
  gameState.sawSustain = this.sound.add('sawSustain');
  gameState.sawSustainLoop = this.sound.add('sawSustain', { loop: true });
  gameState.sawRelease = this.sound.add('sawRelease');
  gameState.sawFullNote = this.sound.add('sawFullNote');

  // New sound effects
  gameState.climbingSound = this.sound.add('climbing', { loop: true, volume: 0.5 });
  gameState.gulpSound = this.sound.add('gulp', { volume: 0.7 });
  gameState.jumpSound = this.sound.add('jump', { volume: 0.6 });
  gameState.menuSelectionSound = this.sound.add('menuSelection', { volume: 0.5 });
  gameState.waterDropSound = this.sound.add('waterDrop', { volume: 0.6 });
  gameState.placementSound = this.sound.add('placement', { volume: 0.7 });
  gameState.startFireSound = this.sound.add('startFire', { volume: 0.7 });
  gameState.fireSound = this.sound.add('fire', { loop: true, volume: 0.5 });
  gameState.fireOutSound = this.sound.add('fire_out', { volume: 0.7 });
  gameState.crouchSound = this.sound.add('crouch', { volume: 0.6 });
  gameState.pickUpItemSound = this.sound.add('pickUpItem', { volume: 1.5 });

  // Fire sound chain - play looping fire sound after start fire completes
  gameState.startFireSound.on('complete', () => {
    // Only start fire loop if there's at least one active fire
    if (gameState.fires && gameState.fires.length > 0) {
      gameState.fireSound.play();
    }
  });

  // Saw sound event listeners
  gameState.sawAttack.on('complete', () => {
    if (gameState.cursors.space.isDown && gameState.isClimbing) {
      gameState.sawSustainLoop.play();
    }
  });

  gameState.sawSustain.on('complete', () => {
    gameState.sawRelease.play();
  });

  // -----------------
  // BACKGROUND & ENVIRONMENT
  // -----------------
  // Horizon gradient (rendered behind tree)
  gameState.horizon = this.add.graphics();
  gameState.horizon.setDepth(-1);

  // Sun and Moon
  gameState.sun = this.add.circle(0, 0, 30, 0xFFFF00).setDepth(-0.5);
  gameState.moon = this.add.circle(0, 0, 25, 0xEEEEEE).setDepth(-0.5);
  gameState.moon.setVisible(false);

  // -----------------
  // TREE & BRANCHES
  // -----------------
  // Main tree sprite
  const treeImage = this.add.image(
    centerX,
    this.cameras.main.height - (128 * 2) - 47, // Move up by 7px total
    'tree'
  ).setScale(4).setDepth(210);

  // Invisible climbable trunk zone
  gameState.treeTrunk = this.add.zone(
    centerX + 5,
    this.cameras.main.height - (128 * 2) + 10, // Move up by 7px total
    70,
    300
  );
  this.physics.world.enable(gameState.treeTrunk);
  gameState.treeTrunk.body.setAllowGravity(false);
  gameState.treeTrunk.body.moves = false;

  // Visual shade under the tree (oblong ellipse) to indicate safe zone
  // Position it around the base of the trunk; depth is below player but above ground
  const shadeX = gameState.treeTrunk.x + 5;
  const shadeY = gameState.treeTrunk.y + gameState.treeTrunk.height / 2 + 30;
  const shadeW = 420; // width of ellipse
  const shadeH = 80;  // height of ellipse (oblong)
  gameState.treeShade = this.add.graphics();
  gameState.treeShade.fillStyle(0x000000, 0.35);
  gameState.treeShade.fillEllipse(shadeX, shadeY, shadeW, shadeH);
  gameState.treeShade.setDepth(205);

  // Create branches on tree
  gameState.branches = this.physics.add.group();
  const branchCount = 3;
  gameState.maxBranches = branchCount;
  const minSpacing = 50;
  const branchMargin = 20; // Keep branches below trunk top
  const availableHeight = gameState.treeTrunk.height * (2 / 3);
  const spacing = Math.max(minSpacing, availableHeight / (branchCount + 1));
  const startY = gameState.treeTrunk.y - (gameState.treeTrunk.height / 2) + branchMargin;

  for (let i = 0; i < branchCount; i++) {
    const yPosition = startY + spacing * (i + 1) - 7; // Move each branch up by 7px total
    const newBranch = gameState.branches.create(
      gameState.treeTrunk.x,
      yPosition,
      'branch',
      0 // Start with frame 0 (full branch)
    ).setScale(1.5).setDepth(300);

    newBranch.body.setAllowGravity(false);
    newBranch.body.setImmovable(true);

    // Set branch health (3 = full health)
    newBranch.setData('health', 3);

    // Randomly place branch on left or right side
    if (Math.random() > 0.5) {
      newBranch.setFlipX(true);
      newBranch.x += gameState.treeTrunk.width;
    } else {
      newBranch.x -= gameState.treeTrunk.width;
    }

    // Mark as attached to tree
    newBranch.setData('onTree', true);
  }

  // -----------------
  // GROUND & GRASS
  // -----------------
  // Grass sprites

  const grasses = this.physics.add.staticGroup();
  const grassPositions = [0, 1, 2, 3, 4, 5, 6, 7];



  grassPositions.forEach(t => {
    const grassBottom = grasses.create(
      Math.round(256 * t),
      Math.round(this.cameras.main.height - (36 * 2) - 62),
      'grass_spritesheet'
    ).setScale(1).setDepth(0).setFlipX(true).refreshBody();
    // Crop 1px from the bottom to hide edge artifact
    grassBottom.setCrop(0, 0, 256, 61);
  });

  // Ground platform (visual)
  const platformGraphics = this.add.graphics();
  platformGraphics.fillStyle(0x6B4423, 1);
  platformGraphics.fillRect(0, this.cameras.main.height - 60, this.cameras.main.width, 60);
  platformGraphics.setDepth(100);
  platformGraphics.setVisible(false); // Hide platform graphics for debugging

  // Ground platform (physics, invisible)
  gameState.platforms = this.physics.add.staticGroup();
  const platform = gameState.platforms.create(
    centerX,
    this.cameras.main.height - 15,
    'platform'
  ).setDepth(100);
  const scaleX = this.cameras.main.width / platform.width;
  platform.setScale(scaleX, 0.6).refreshBody();
  platform.setAlpha(0);

  // Shelter platforms (for physics, true collision)
  gameState.shelterPlatforms = this.physics.add.staticGroup();

  // -----------------
  // PLAYER SETUP
  // -----------------
  gameState.player = this.physics.add.sprite(
    centerX * 0.75,
    this.cameras.main.height - 92,
    'spritesheet',
    0
  ).setScale(1).setDepth(220);

  // Adjust physics body to match sprite
  gameState.player.body.setSize(44, 52);
  gameState.player.body.setOffset(9, 8);
  gameState.player.setCollideWorldBounds(true);

  // Player uses world gravity (we disable it only during climbing)
  gameState.player.body.setAllowGravity(true);

  // -----------------
  // ANIMATIONS
  // -----------------
  this.anims.create({
    key: 'grassMove',
    frames: this.anims.generateFrameNumbers('grass_spritesheet', {
      start: 0,
      end: 1
    }),
    frameRate: 2,
    repeat: -1
  });
  this.anims.play('grassMove', grasses.getChildren());

  this.anims.create({
    key: 'sawSpin',
    frames: this.anims.generateFrameNumbers('saw_sprite_sheet', {
      start: 0,
      end: 2
    }),
    frameRate: 6,
    repeat: -1
  });

  this.anims.create({
    key: 'fireBurn',
    frames: this.anims.generateFrameNumbers('fire_spritesheet', {
      start: 0,
      end: 3
    }),
    frameRate: 8,
    repeat: -1
  });

  this.anims.create({
    key: 'fireIconAnim',
    frames: this.anims.generateFrameNumbers('fire_spritesheet', {
      start: 0,
      end: 3
    }),
    frameRate: 8,
    repeat: -1
  });

  // -----------------
  // UI ELEMENTS
  // -----------------
  // Level title (top center)
  gameState.levelText = this.add.text(centerX, 20, 'Level 1', {
    fontSize: '24px',
    fill: '#000000',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0);

  // Resource counters (left side, vertically centered)
  const inventoryX = 20; // Left margin
  const inventoryStartY = h * 0.5 - 30; // Vertically centered

  // UI vertical stack positions
  let uiStackY = inventoryStartY - 200;
  // Branch icon and count
  gameState.stickIcon = this.add.image(inventoryX + 12, uiStackY, 'branch')
    .setScale(1).setOrigin(0.5, 0);
  gameState.stickText = this.add.text(inventoryX + 12, uiStackY + 36, `${gameState.sticksCollected}`, {
    fontSize: '20px',
    fill: '#000000',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0);

  // Water drop (thirst) icon and value
  uiStackY += 70;
  gameState.waterIcon = this.add.image(inventoryX + 12, uiStackY, 'raindrop')
    .setScale(0.6).setOrigin(0.5, 0);
  gameState.waterText = this.add.text(inventoryX + 12, uiStackY + 36, `${gameState.thirst}`, {
    fontSize: '20px',
    fill: '#00aa00',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2
  }).setOrigin(0.5, 0);

  // Berry (hunger) icon and value, below water drop
  uiStackY += 70;
  gameState.berryIcon = this.add.image(inventoryX + 12, uiStackY, 'berry')
    .setScale(0.6).setOrigin(0.5, 0);
  gameState.berryText = this.add.text(inventoryX + 12, uiStackY + 36, `${gameState.hunger}`, {
    fontSize: '20px',
    fill: '#00aa00',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 2
  }).setOrigin(0.5, 0);

  // Health bar (below level text at top center)
  const healthBarX = centerX - 75; // Center the 150px wide bar
  const healthBarY = 50; // Just below level text
  const healthBarWidth = 150;
  const healthBarHeight = 20;

  gameState.healthBarBg = this.add.graphics();
  gameState.healthBarBg.fillStyle(0x8B0000, 1);
  gameState.healthBarBg.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

  gameState.healthBar = this.add.graphics();
  gameState.healthBar.fillStyle(0x90ee90, 1);
  gameState.healthBar.fillRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

  gameState.healthBarBorder = this.add.graphics();
  gameState.healthBarBorder.lineStyle(2, 0x000000, 1);
  gameState.healthBarBorder.strokeRect(healthBarX, healthBarY, healthBarWidth, healthBarHeight);

  gameState.healthText = this.add.text(
    healthBarX + healthBarWidth / 2,
    healthBarY + healthBarHeight / 2,
    '100/100',
    { fontSize: '14px', fill: '#000000', fontStyle: 'bold' }
  ).setOrigin(0.5);

  // Quit button (top right corner)
  gameState.quitButton = this.add.text(w - 45, h/2 -170, 'Quit', {
    fontSize: '24px',
    fill: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3,
    padding: { x: 15, y: 8 }
  }).setOrigin(0.5).setDepth(10000).setInteractive({ useHandCursor: true });
  
  gameState.quitButton.on('pointerover', () => {
    gameState.quitButton.setColor('#ff0000');
  });
  
  gameState.quitButton.on('pointerout', () => {
    gameState.quitButton.setColor('#ffffff');
  });
  
  gameState.quitButton.on('pointerdown', () => {
    // Trigger game over by depleting health
    // The game over screen will be shown in the update loop
    gameState.health = 0;
  });

  // Player temperature status (below health bar at top center)
  const tempStatusX = this.cameras.main.width - 130;
  const tempStatusY = 76; // Below health bar

  gameState.playerTempBg = this.add.graphics();
  gameState.playerTempBg.fillStyle(0x000000, 0.7);
  const tempBoxX = tempStatusX - 2;
  const tempBoxY = tempStatusY - 2;
  const tempBoxW = 120;
  const tempBoxH = 22;
  gameState.playerTempBg.fillRect(tempBoxX, tempBoxY, tempBoxW, tempBoxH);
  // Center the temperature text inside the background box
  gameState.playerTempText = this.add.text(tempBoxX + tempBoxW / 2, tempBoxY + tempBoxH / 2, 'Comfortable', {
    fontSize: '16px',
    fill: '#00aa00',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0.5);

  // Temperature status message (below player temp status)
  gameState.tempStatusMessage = this.add.text(centerX, tempStatusY + 25, '', {
    fontSize: '18px',
    fill: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5, 0).setVisible(false);

  // Time and temperature displays (top right)
  gameState.timeText = this.add.text(w * 0.975, h * 0.025, '6:00 AM', {
    fontSize: '20px',
    fill: '#000000',
    fontStyle: 'bold'
  }).setOrigin(1, 0);

  gameState.tempText = this.add.text(w * 0.975, h * 0.025 + 28, '65°F', {
    fontSize: '18px',
    fill: '#000000'
  }).setOrigin(1, 0);

  // Music controls (centered vertically on right wall)
  const musicControlsX = w * 0.975;
  const musicControlsY = this.cameras.main.height / 2 - 90;

  // Play/Pause button
  gameState.musicPlayPauseButton = this.add.text(musicControlsX, musicControlsY - 30, '⏸', {
    fontSize: '28px',
    fill: '#000000',
    fontStyle: 'bold'
  }).setOrigin(1, 0.5).setInteractive().setDepth(200);

  gameState.musicPlayPauseButton.on('pointerdown', () => {
    if (gameState.backgroundMusic.isPlaying) {
      gameState.backgroundMusic.pause();
      gameState.musicPlayPauseButton.setText('▶');
    } else {
      gameState.backgroundMusic.resume();
      gameState.musicPlayPauseButton.setText('⏸');
    }
  });

  // Volume button
  gameState.volumeButton = this.add.text(musicControlsX+5, musicControlsY + 30, '🔊', {
    fontSize: '28px',
    fill: '#000000',
    fontStyle: 'bold'
  }).setOrigin(1, 0.5).setInteractive().setDepth(200);

  // Volume levels: 0.5 (default), 0.25, 0, 0.75, 1.0
  gameState.volumeLevels = [0.5, 0.25, 0, 0.75, 1.0];
  gameState.currentVolumeIndex = 0;

  gameState.volumeButton.on('pointerdown', () => {
    gameState.currentVolumeIndex = (gameState.currentVolumeIndex + 1) % gameState.volumeLevels.length;
    const newVolume = gameState.volumeLevels[gameState.currentVolumeIndex];
    gameState.backgroundMusic.setVolume(newVolume);

    // Update button icon based on volume
    if (newVolume === 0) {
      gameState.volumeButton.setText('🔇');
    } else if (newVolume <= 0.25) {
      gameState.volumeButton.setText('🔉');
    } else {
      gameState.volumeButton.setText('🔊');
    }
  });

  // Build UI (top left corner)
  const buildUIX = 20; // Left margin
  const buildUIY = 20; // Top margin

  gameState.buildLabel = this.add.text(buildUIX, buildUIY, 'Build Menu (b)', {
    fontSize: '18px',
    fill: '#000000',
    fontStyle: 'bold'
  }).setOrigin(0, 0).setDepth(200);

  // Fire icon (clickable, costs 3 branches)
  gameState.buildFireIcon = this.add.sprite(buildUIX + 10, buildUIY + 40, 'fire_spritesheet', 0)
    .setScale(0.4).setOrigin(0.5, 0.5).setInteractive().setDepth(200);
  gameState.buildFireIcon.anims.play('fireIconAnim', true);

  // Fire icon hover effects
  gameState.buildFireIcon.on('pointerover', () => {
    gameState.buildFireIcon.setScale(0.6); // 1.5x the original 0.4 scale
  });
  gameState.buildFireIcon.on('pointerout', () => {
    gameState.buildFireIcon.setScale(0.4); // Back to original scale
  });

  // Bucket icon (clickable, costs 5 branches)
  gameState.buildBucketIcon = this.add.sprite(buildUIX + 50, buildUIY + 42, 'bucket_spritesheet', 0)
    .setScale(0.4).setOrigin(0.5, 0.5).setInteractive().setDepth(200);

  // Bucket icon hover effects
  gameState.buildBucketIcon.on('pointerover', () => {
    gameState.buildBucketIcon.setScale(0.6); // 1.5x the original 0.4 scale
  });
  gameState.buildBucketIcon.on('pointerout', () => {
    gameState.buildBucketIcon.setScale(0.4); // Back to original scale
  });

  // Shelter icon (clickable, costs 7 branches)
  gameState.buildShelterIcon = this.add.sprite(buildUIX + 90, buildUIY + 42, 'shelter', 0)
    .setScale(0.2).setOrigin(0.5, 0.5).setInteractive().setDepth(200);

  // Shelter icon hover effects
  gameState.buildShelterIcon.on('pointerover', () => {
    gameState.buildShelterIcon.setScale(0.3); // 1.5x the original 0.2 scale
  });
  gameState.buildShelterIcon.on('pointerout', () => {
    gameState.buildShelterIcon.setScale(0.2); // Back to original scale
  });

  // Build cost text (shown below build menu when item selected)
  gameState.buildCostText = this.add.text(buildUIX + 45, buildUIY + 75, '', {
    fontSize: '16px',
    fill: '#000000',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0).setDepth(200).setVisible(false);

  // Info text at same position as Temperature Stabilized (centerX, tempStatusY + 25)
  // tempStatusY is already defined above as 76
  const infoTextY = 100 + 50;

  gameState.infoText = this.add.text(centerX, infoTextY, '', {
    fontSize: '20px',
    fill: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5, 0.5).setDepth(300).setVisible(false);


  
  // Colored check and x for build menu (positioned below infoText)
  gameState.infoTextCheck = this.add.text(centerX - 150 -10, infoTextY -15, '   ✓\n(Enter) ', {
    fontSize: '20px',
    fill: '#00ff00',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5, 0.5).setDepth(300).setVisible(false);
  

  gameState.infoTextX = this.add.text(centerX + 170 + 17, infoTextY -15, '     ✗\n(Backspace)', {
    fontSize: '20px',
    fill: '#ff0000',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5, 0.5).setDepth(300).setVisible(false);

  // Placement confirmation buttons (hidden by default, shown during placement)
  const placementUIY = this.cameras.main.height - 45;

  gameState.checkButton = this.add.text(centerX, placementUIY, '✓', {
    fontSize: '30px',
    fill: '#00ff00',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0.5).setInteractive().setDepth(1000).setVisible(false);

  gameState.xButton = this.add.text(centerX + 40, placementUIY, '✗', {
    fontSize: '30px',
    fill: '#ff0000',
    fontStyle: 'bold'
  }).setOrigin(0.5, 0.5).setInteractive().setDepth(1000).setVisible(false);

  // Register button event listeners ONCE here (not in icon handlers)
  gameState.checkButton.on('pointerdown', () => {
    if (gameState.buildMode === 'fire' && gameState.sticksCollected >= 3) {
      // Deduct branches
      gameState.sticksCollected -= gameState.buildCosts.fire;
      gameState.stickText.setText(`${gameState.sticksCollected}`);

      // Create actual fire at placement position
      const fire = this.add.sprite(
        gameState.placementItem.x,
        gameState.placementItem.y,
        'fire_spritesheet'
      ).setScale(1).setDepth(212);

      this.physics.world.enable(fire);
      fire.body.setAllowGravity(false);
      fire.body.setImmovable(true);
      fire.body.setSize(40, 40);
      fire.anims.play('fireBurn', true);
      
      // Store creation time and original Y for shrinking effect
      fire.setData('createdAt', Date.now());
      fire.setData('originalY', fire.y);
      fire.setData('lifetime', 60000); // 60 seconds lifetime
      
      gameState.fires.push(fire);

      // Play start fire sound (will chain to looping fire sound on complete)
      gameState.startFireSound.play();

      // Show build notification      // Clean up placement UI
      gameState.placementItem.destroy();
      gameState.placementArrowLeft.destroy();
      gameState.placementArrowRight.destroy();
      if (gameState.placementArrowUp) gameState.placementArrowUp.destroy();
      gameState.buildMode = null;
      gameState.checkButton.setVisible(false);
      gameState.xButton.setVisible(false);
    } else if (gameState.buildMode === 'bucket' && gameState.sticksCollected >= 5) {
      // Deduct branches
      gameState.sticksCollected -= gameState.buildCosts.bucket;
      gameState.stickText.setText(`${gameState.sticksCollected}`);

      // Create actual bucket at placement position
      const bucket = this.add.sprite(
        gameState.placementItem.x,
        gameState.placementItem.y,
        'bucket_spritesheet',
        0
      ).setScale(1).setDepth(220);

      this.physics.world.enable(bucket);
      bucket.body.setAllowGravity(false);
      bucket.body.setImmovable(true);
      bucket.body.setSize(40, 40);
      bucket.setDepth(250); // Ensure depth is set after physics enabled

      // Add fill percentage data and text display
      bucket.setData('fillPercent', 0);
      const fillText = this.add.text(
        bucket.x,
        bucket.y,
        '0%',
        { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
      ).setOrigin(0.5).setDepth(10001).setVisible(true);
      bucket.setData('fillText', fillText);

      // Store bucket for rain collection
      gameState.buckets.push(bucket);

      gameState.placementSound.play(); // Play placement sound

      // Show build notification
      showInfoText('You built a Bucket', 2000);

      // Clean up placement UI
      gameState.placementItem.destroy();
      gameState.placementArrowLeft.destroy();
      gameState.placementArrowRight.destroy();
      if (gameState.placementArrowUp) gameState.placementArrowUp.destroy();
      gameState.buildMode = null;
      gameState.checkButton.setVisible(false);
      gameState.xButton.setVisible(false);
    } else if (gameState.buildMode === 'shelter' && gameState.sticksCollected >= 7) {
      // Deduct branches
      gameState.sticksCollected -= gameState.buildCosts.shelter;
      gameState.stickText.setText(`${gameState.sticksCollected}`);

      // Create actual shelter at placement position
      const shelter = this.add.sprite(
        gameState.placementItem.x,
        gameState.placementItem.y,
        'shelter', 0
      ).setScale(1).setDepth(210);

      this.physics.world.enable(shelter);
      shelter.body.setAllowGravity(false);
      shelter.body.setImmovable(true);
      shelter.body.setSize(128, 128, false);
      shelter.body.setOffset(0, 0);
      shelter.body.isCircle = false;
      
      // Create shade visual under the shelter (rectangle like tree shade)
      // Shelter sprite Y is at center, so we need to position shade below it
      const shelterShadeX = shelter.x - 64; // Top-left X (shelter is 128 wide, so center - 64)
      const shelterShadeY = shelter.y - 30; // ABOVE shelter center to be visible on ground
      const shelterShadeW = 128; // width of rect
      const shelterShadeH = 60;  // height of rect
      const shelterShade = this.add.graphics();
      shelterShade.fillStyle(0x000000, 0.4); // Dark semi-transparent
      shelterShade.fillRect(shelterShadeX, shelterShadeY, shelterShadeW, shelterShadeH);
      shelterShade.setDepth(205); // Below shelter
      
      // Store both shelter and its shade
      shelter.setData('shade', shelterShade);
      gameState.shelters.push(shelter);

      gameState.placementSound.play(); // Play placement sound

      // Show build notification
      showInfoText('You built a Shelter', 2000);

      // Clean up placement UI
      gameState.placementItem.destroy();
      if (gameState.previewShade) gameState.previewShade.destroy();
      gameState.placementArrowLeft.destroy();
      gameState.placementArrowRight.destroy();
      if (gameState.placementArrowUp) gameState.placementArrowUp.destroy();
      gameState.buildMode = null;
      gameState.checkButton.setVisible(false);
      gameState.xButton.setVisible(false);
    }
  });

  gameState.xButton.on('pointerdown', () => {
    if (gameState.buildMode) {
      // Clean up placement UI without deducting branches
      gameState.placementItem.destroy();
      if (gameState.previewShade) gameState.previewShade.destroy();
      gameState.placementArrowLeft.destroy();
      gameState.placementArrowRight.destroy();
      if (gameState.placementArrowUp) gameState.placementArrowUp.destroy();
      gameState.buildMode = null;
      gameState.checkButton.setVisible(false);
      gameState.xButton.setVisible(false);
    }
  });

  // Score text (bottom center, currently hidden)
  gameState.scoreText = this.add.text(
    centerX - 40,
    this.cameras.main.height * .09,
    'Score: 0',
    { fontSize: '15px', fill: '#000000' }
  );

  // -----------------
  // INPUT SETUP
  // -----------------
  gameState.cursors = this.input.keyboard.createCursorKeys();

  // Add WASD keys as alternatives
  gameState.wKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
  gameState.aKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
  gameState.sKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
  gameState.dKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

  // Add Enter and Backspace key support for building
  gameState.enterKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
  gameState.backspaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.BACKSPACE);
  gameState.bKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.B);

  // Enable rain (for testing - can be tied to weather system later)
  gameState.isRaining = true;

  // -----------------
  // PHYSICS COLLIDERS
  // -----------------
  // Player collides with ground
  this.physics.add.collider(gameState.player, gameState.platforms);
  // Player collides with shelter platforms (true physics)
  this.physics.add.collider(gameState.player, gameState.shelterPlatforms);

  // Branches fall and land on ground
  this.physics.add.collider(gameState.branches, gameState.platforms, (branch) => {
    if (!branch.getData('rotated') && !branch.getData('soundPlayed')) {
      // Mark sound as played immediately to prevent multiple plays
      branch.setData('soundPlayed', true);

      // Play placement sound when branch hits ground
      gameState.placementSound.play();

      // Rotate branch to stand upright when it hits ground
      const targetAngle = branch.flipX ? -90 : 90;
      branch.setAngle(targetAngle);
      branch.setScale(1.5);
      branch.y -= 16;

      branch.body.setAllowGravity(false);
      branch.body.setVelocity(0, 0);
      branch.setData('rotated', true);
      branch.setData('collectable', true);

      // Pulsing animation to indicate it's collectible
      this.tweens.add({
        targets: branch,
        scaleX: 1.7,
        scaleY: 1.7,
        yoyo: true,
        repeat: -1,
        duration: 400
      });
    }
  });

  // Player collects branches
  this.physics.add.overlap(gameState.player, gameState.branches, (player, branch) => {
    if (!gameState.isClimbing && !gameState.buildMode && !gameState.buildMenuOpen && branch && branch.active && branch.getData('collectable')) {
      branch.destroy();
      // Branches are worth the current level
      gameState.sticksCollected += gameState.level;
      gameState.stickText.setText(`${gameState.sticksCollected}`);
      gameState.pickUpItemSound.play();
      
      // Show +1 animations above player (one for each branch picked up)
      showPlusOne(gameState.scene, gameState.player.x, gameState.player.y, gameState.level);

      // Track branch pickups with time window
      const currentTime = this.time.now;
      if (currentTime - gameState.lastBranchPickupTime > 5000) {
        // More than 5 seconds since last pickup, reset counter
        gameState.branchesPickedInWindow = gameState.level;
        showInfoText(`Picked up ${gameState.level} Branch${gameState.level > 1 ? 'es' : ''}`, 2000);
      } else {
        // Within 5 second window, increment counter
        gameState.branchesPickedInWindow += gameState.level;
        showInfoText(`Picked up ${gameState.branchesPickedInWindow} Branches`, 2000);
      }
      gameState.lastBranchPickupTime = currentTime;
    }
  });

  // -----------------
  // UI BUTTON HANDLERS
  // -----------------
  // Fire icon click - start fire placement
  gameState.buildFireIcon.on('pointerdown', () => {
    if (gameState.sticksCollected >= 3 && !gameState.buildMode) {
      gameState.buildMode = 'fire';

      // Create placement preview
      gameState.placementItem = this.add.sprite(
        centerX,
        this.cameras.main.height - 75,
        'fire_spritesheet'
      ).setScale(1).setDepth(210).setAlpha(0.7);
      gameState.placementItem.anims.play('fireBurn', true);

      // Create arrows
      gameState.placementArrowLeft = this.add.text(
        centerX - 50,
        this.cameras.main.height - 75,
        '←',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      gameState.placementArrowRight = this.add.text(
        centerX + 50,
        this.cameras.main.height - 75,
        '→',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      // Show confirmation buttons just above fire (centered)
      const fireY = this.cameras.main.height - 75;
      gameState.checkButton.x = centerX - 20; // Offset left to center the pair
      gameState.checkButton.y = fireY - 50; // 50 pixels above fire
      gameState.xButton.x = centerX + 20; // Offset right to center the pair
      gameState.xButton.y = fireY - 50;
      gameState.checkButton.setVisible(true);
      gameState.xButton.setVisible(true);
    }
  });

  // Bucket icon click - start bucket placement
  gameState.buildBucketIcon.on('pointerdown', () => {
    if (gameState.sticksCollected >= 5 && !gameState.buildMode) {
      gameState.buildMode = 'bucket';

      // Bucket placement at bottom of screen (height - half bucket height)
      const bucketY = this.cameras.main.height - 36; // 40px bucket height / 2 = 20, moved down 16px

      // Create placement preview
      gameState.placementItem = this.add.sprite(
        centerX,
        bucketY,
        'bucket_spritesheet',
        0
      ).setScale(1).setDepth(220).setAlpha(0.7);

      // Create arrows
      gameState.placementArrowLeft = this.add.text(
        centerX - 50,
        bucketY,
        '←',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      gameState.placementArrowRight = this.add.text(
        centerX + 50,
        bucketY,
        '→',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      // Show confirmation buttons just above bucket (centered)
      gameState.checkButton.x = centerX - 20; // Offset left to center the pair
      gameState.checkButton.y = bucketY - 50; // 50 pixels above bucket
      gameState.xButton.x = centerX + 20; // Offset right to center the pair
      gameState.xButton.y = bucketY - 50;
      gameState.checkButton.setVisible(true);
      gameState.xButton.setVisible(true);
    }
  });


  // Shelter icon click - start shelter placement
  gameState.buildShelterIcon.on('pointerdown', () => {
    if (gameState.sticksCollected >= 7 && !gameState.buildMode) {
      gameState.buildMode = 'shelter';
      gameState.shelterPreviewFrame = 0;
      showInfoText('Shelter frames: ' + gameState.shelterFrameCount, 3000);
      // Create placement preview (shelter is 128x128, so position it higher to be flush with platform)
      const shelterY = this.cameras.main.height - (64 + 60); // Half height of shelter (64) + platform offset (60)
      gameState.ghostPreviewX = centerX;
      gameState.ghostPreviewY = shelterY;
      gameState.placementItem = this.add.sprite(
        gameState.ghostPreviewX,
        gameState.ghostPreviewY,
        'shelter', gameState.shelterPreviewFrame
      ).setScale(1).setDepth(210).setAlpha(0.7);

      // Create preview shade (trapezoid)
      gameState.previewShade = this.add.graphics();
      gameState.previewShade.setDepth(209);
      gameState.previewShade.setAlpha(0.7);

      // Create arrows at shelter position
      gameState.placementArrowLeft = this.add.text(
        centerX - 75,
        shelterY,
        '←',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      gameState.placementArrowRight = this.add.text(
        centerX + 75,
        shelterY,
        '→',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      gameState.placementArrowUp = this.add.text(
        centerX,
        shelterY - 70,
        '↑',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      // Show confirmation buttons above shelter (centered)
      gameState.checkButton.x = centerX - 20; // Offset left to center the pair
      gameState.checkButton.y = shelterY - 100; // Above up arrow
      gameState.xButton.x = centerX + 20; // Offset right to center the pair
      gameState.xButton.y = shelterY - 100;
      gameState.checkButton.setVisible(true);
      gameState.xButton.setVisible(true);
    }
  });

  // -----------------
  // RAINDROP SETUP
  // -----------------
  gameState.raindrops = this.physics.add.group();

  // Rain generation - spawn raindrops periodically
  this.time.addEvent({
    delay: 100, // Check more frequently for smooth intensity
    callback: () => {
      if (gameState.stormActive) {
        // Rain intensity and speed based on stormStrength (0-1)
        // Reduce spawn count and lower Y velocity so rain falls more slowly visually.
        const drops = Math.round(Phaser.Math.Linear(1, 4, gameState.stormStrength));
        for (let i = 0; i < drops; i++) {
          const xCoord = Math.random() * this.cameras.main.width;
          // Random depth between 150-250 so some raindrops go below tree (205) and some above
          const randomDepth = 150 + Math.random() * 100;
          const raindrop = gameState.raindrops.create(xCoord, -10, 'raindrop').setScale(0.5).setDepth(randomDepth);
          // Slower fall: 40px/s at light rain -> 120px/s at heavy rain
          raindrop.body.setVelocityY(Phaser.Math.Linear(40, 120, gameState.stormStrength));
        }
      }
    },
    loop: true
  });

  // Raindrop collides with ground - destroy
  this.physics.add.collider(gameState.raindrops, gameState.platforms, function (raindrop) {
    raindrop.destroy();
  });

  // Also destroy raindrops when they go below the screen
  const screenHeight = this.cameras.main.height;
  this.time.addEvent({
    delay: 100,
    callback: () => {
      gameState.raindrops.getChildren().forEach(raindrop => {
        if (raindrop.y > screenHeight) {
          raindrop.destroy();
        }
      });
    },
    loop: true
  });
}

// =======================
// UPDATE LOOP
// =======================
  update(time, delta) {
  // Always enable gravity for player unless climbing
  if (!gameState.isClimbing && gameState.player.body.allowGravity === false) {
    gameState.player.body.setAllowGravity(true);
  }
  // --- GROUND/SHELTER CHECKS (must be at very top of update loop) ---
  // No manual shelter collision logic needed; handled by physics collider
  let onGroundOrShelter = gameState.player.body.onFloor();
  
  // Allow cycling shelter preview frame with up arrow (must be early to consume JustDown)
  if (gameState.buildMode === 'shelter' && gameState.placementItem) {
    if (Phaser.Input.Keyboard.JustDown(gameState.cursors.up) || Phaser.Input.Keyboard.JustDown(gameState.wKey)) {
      gameState.shelterPreviewFrame = (gameState.shelterPreviewFrame + 1) % gameState.shelterFrameCount;
      gameState.placementItem.setFrame(gameState.shelterPreviewFrame);
    }
  }
  
  // --- HUNGER & THIRST DEPLETION ---
  // Use real time (not frame time) for consistent depletion
  if (!gameState.lastHungerThirstTick) gameState.lastHungerThirstTick = Date.now();
  if (!gameState.lastMeltingThirstTick) gameState.lastMeltingThirstTick = Date.now();
  const now = Date.now();

  // Main hunger/thirst tick (every 1000ms)
  if (now - gameState.lastHungerThirstTick >= 1000) {
    // Reduce hunger by 1 every second
    if (gameState.hunger > 0) gameState.hunger = Math.max(0, gameState.hunger - 1);

    // Reduce thirst by 1 every second (normal depletion)p
    if (gameState.thirst > 0) {
      gameState.thirst = Math.max(0, gameState.thirst - 1);

    }

    // Health damage from starvation (hunger = 0)
    if (gameState.hunger === 0) {
      gameState.health = Math.max(0, gameState.health - 1);
    }

    // Health damage from dehydration (thirst = 0)
    if (gameState.thirst === 0) {
      gameState.health = Math.max(0, gameState.health - 1);
    }

    if (now - gameState.lastHungerThirstTick >= 500) {
      if (gameState.isMelting == true) {
        gameState.thirst = Math.max(0, gameState.thirst - 1);
      }

    }

    gameState.lastHungerThirstTick += 1000;

  }




  // --- HUNGER & THIRST UI COLOR ---
  // Determine day/night for UI coloring (night: 7pm-7am)
  const hourOfDayUI = ((gameState.gameTime || 0) % (24 * 60)) / 60;
  // Night when before 6:00 or at/after 18:00
  const isNightUI = (hourOfDayUI < 7) || (hourOfDayUI >= 19);
  const uiTextColor = isNightUI ? '#ffffff' : '#000000';

  // Thirst (water drop) - color thresholds:
  // 0-5: red, 6-10: orange, 11-20: yellow, >20: green
  let thirstColor = '#00aa00';
  if (gameState.thirst <= 5) thirstColor = '#ff0000';
  else if (gameState.thirst <= 10) thirstColor = '#ff8800';
  else if (gameState.thirst <= 20) thirstColor = '#ffff00';
  gameState.waterText.setText(`${gameState.thirst}`);
  gameState.waterText.setColor(thirstColor);

  // Hunger (berry) - same thresholds
  let hungerColor = '#00aa00';
  if (gameState.hunger <= 5) hungerColor = '#ff0000';
  else if (gameState.hunger <= 10) hungerColor = '#ff8800';
  else if (gameState.hunger <= 20) hungerColor = '#ffff00';
  gameState.berryText.setText(`${gameState.hunger}`);
  gameState.berryText.setColor(hungerColor);

  // Make all UI text that is normally black switch to white at night
  if (gameState.levelText && gameState.levelText.setColor) gameState.levelText.setColor(uiTextColor);
  if (gameState.stickText && gameState.stickText.setColor) gameState.stickText.setColor(uiTextColor);
  if (gameState.buildLabel && gameState.buildLabel.setColor) gameState.buildLabel.setColor(uiTextColor);
  if (gameState.buildCostText && gameState.buildCostText.setColor) gameState.buildCostText.setColor(uiTextColor);
  if (gameState.timeText && gameState.timeText.setColor) gameState.timeText.setColor(uiTextColor);
  if (gameState.tempText && gameState.tempText.setColor) gameState.tempText.setColor(uiTextColor);
  if (gameState.musicPlayPauseButton && gameState.musicPlayPauseButton.setColor) gameState.musicPlayPauseButton.setColor(uiTextColor);
  if (gameState.volumeButton && gameState.volumeButton.setColor) gameState.volumeButton.setColor(uiTextColor);
  if (gameState.scoreText && gameState.scoreText.setColor) gameState.scoreText.setColor(uiTextColor);

  // --- BRANCH GRADUAL HEALING ---
  // Per-branch gradual healing: +1 health per second while on tree and not being cut
  if (gameState.branches) {
    gameState.branches.getChildren().forEach(branch => {
      if (!branch || !branch.active) return;

      const health = branch.getData('health') || 0;
      const onTree = !!branch.getData('onTree');
      const beingCut = !!branch.getData('beingCut');
      const existingTimer = branch.getData('healTimer');

      // Only schedule healing for partially damaged branches that are attached,
      // not being cut, and not currently growing (newly regenerated branches).
      if (onTree && !beingCut && health > 0 && health < 3 && !branch.getData('growing')) {
        if (!existingTimer) {
          // Schedule a tick after 1s to add +1 health
          const healTick = () => {
            // Guard: branch may have been destroyed or fallen
            if (!branch || !branch.active) return;

            // If player started cutting this branch, cancel healing
            if (branch.getData('beingCut')) {
              branch.setData('healTimer', null);
              return;
            }

            let h = branch.getData('health') || 0;
            h = Math.min(3, h + 1);
            branch.setData('health', h);

            // Update frame to reflect healed state
            const frameIndex = (h === 3) ? 0 : (h === 2) ? 1 : 2;
            branch.setFrame(frameIndex);

            // Clear this timer record
            branch.setData('healTimer', null);

            // If still not full, schedule another tick
            if (h > 0 && h < 3) {
              const t = gameState.scene.time.delayedCall(1000, healTick);
              branch.setData('healTimer', t);
            }
          };

          const t = gameState.scene.time.delayedCall(1000, healTick);
          branch.setData('healTimer', t);
        }
      } else {
        // Not eligible for healing: ensure no stray timer remains
        if (existingTimer) {
          try { existingTimer.remove(); } catch (e) { }
          branch.setData('healTimer', null);
        }
      }
    });
  }

  // Clamp all berries to ground after animation so they never fall off the map
  // Adjust so berry bottom sits on ground (berry is 32px tall, scaled 0.6)
  let berryGroundY = h - 94 - ((32 * 0.6) / 2);
  if (gameState.platforms && gameState.platforms.getChildren().length > 0) {
    berryGroundY = gameState.platforms.getChildren()[0].y - 26 - (32 * 0.6) / 2;
  }
  gameState.berries.getChildren().forEach(berry => {
    if (berry.y > berryGroundY) {
      berry.y = berryGroundY;
      berry.body && (berry.body.velocity.y = 0);
    }
  });
  // --- BERRY BUSHES ---
  // Calculate deltaTime for berry bush logic
  let berryDeltaTime = 0.016; // fallback default
  if (gameState.lastBerryUpdateTime) {
    berryDeltaTime = (Date.now() - gameState.lastBerryUpdateTime) / 1000;
  }
  gameState.lastBerryUpdateTime = Date.now();

  // Animate berry bushes (cycle through 3 frames)
  gameState.berryBushes.getChildren().forEach(bush => {
    if (!bush.getData('regrowing') && !bush.getData('onFire')) {
      // Check for spontaneous combustion when temp >= 95
      if (gameState.temperature >= 95) {
        // 10% chance to catch fire (check once per second to avoid spam)
        const lastFireCheck = bush.getData('lastFireCheck') || 0;
        const currentTime = Date.now();
        if (currentTime - lastFireCheck >= 1000) {
          bush.setData('lastFireCheck', currentTime);
          if (Math.random() < 0.01) { // 1% chance
            // Bush catches fire!
            bush.setData('onFire', true);
            bush.setData('fireFrame', 0);
            bush.setData('fireFrameTimer', 0);
            bush.setTexture('bush_fire', 0);

            // Bush burns and disappears after 1000ms
            gameState.scene.time.delayedCall(5000, () => {
              bush.setVisible(false);
              bush.setData('regrowing', true);
              bush.setData('onFire', false);

              // Regrow in new location after 10 seconds
              gameState.scene.time.delayedCall(10000, () => {
                bush.setData('regrowing', false);
                bush.setData('berries', 10);
                let tries = 0, x, y;
                do {
                  x = Phaser.Math.Between(100, w - 100);
                  y = h - 93;
                  tries++;
                } while (!gameState.scene.isValidBerryBushPosition || !gameState.scene.isValidBerryBushPosition(x, y) && tries < 20);
                bush.x = x;
                bush.y = y;
                bush.setTexture('berry_bush', 0);
                bush.setVisible(true);
              });
            });
          }
        }
      }
    }

    // Animate fire if bush is on fire
    if (bush.getData('onFire')) {
      let fireFrame = bush.getData('fireFrame') || 0;
      let fireTimer = bush.getData('fireFrameTimer') || 0;
      fireTimer += 16.67; // Approximate ms per frame at 60fps
      if (fireTimer >= 100) { // Change frame every 100ms
        fireFrame = (fireFrame + 1) % 3; // Cycle through 3 frames (0, 1, 2)
        bush.setFrame(fireFrame);
        fireTimer = 0;
      }
      bush.setData('fireFrame', fireFrame);
      bush.setData('fireFrameTimer', fireTimer);
    }

    // Normal animation cycle (only if not on fire and not regrowing)
    if (!bush.getData('onFire') && !bush.getData('regrowing')) {
      let frame = bush.getData('frame') || 0;
      let timer = bush.getData('frameTimer') || 0;
      timer += berryDeltaTime;
      if (timer > 0.3) { // Change frame every 0.3s
        frame = (frame + 1) % 3;
        bush.setFrame(frame);
        timer = 0;
      }
      bush.setData('frame', frame);
      bush.setData('frameTimer', timer);
    }
  });

  // Berry picking interaction: use up arrow when overlapping
  if ((Phaser.Input.Keyboard.JustDown(gameState.cursors.up) || Phaser.Input.Keyboard.JustDown(gameState.wKey)) && !gameState.buildMode && !gameState.buildMenuOpen) {
    gameState.berryBushes.getChildren().forEach(bush => {
      if (!bush.getData('regrowing') && bush.getData('berries') > 0) {
        const dist = Phaser.Math.Distance.Between(
          gameState.player.x, gameState.player.y, bush.x, bush.y
        );
        if (dist < 60) { // tighter overlap for picking
          // Change player sprite to fire_player momentarily
          gameState.pickingBerry = true; // Flag to prevent fire system from resetting texture
          gameState.player.setTexture('fire_player');
          gameState.player.y -= gameState.player.y + 32 - (bush.y + bush.height / 2) - 4; // Adjust Y to align with bush

          gameState.player.setVelocityY(-100); // Start moving up immediately
          gameState.player.setVelocityX(-gameState.currentVelocityX); // Stop horizontal movement
          gameState.scene.time.delayedCall(300, () => {

            // Restore original spritesheet texture after 300ms
            gameState.player.setTexture('spritesheet', 0);
            gameState.pickingBerry = false; // Clear flag
            if (gameState.player.body) gameState.player.body.setAllowGravity(true); // Start moving up immediately
          });

          // Play bush sound when picking from bush
          if (gameState.bushSound) {
            if (gameState.bushSound.isPlaying) gameState.bushSound.stop();
            const bushDuration = gameState.bushSound.duration || 1.0;
            gameState.bushSound.play({ seek: 0 });
            gameState.scene.time.delayedCall((bushDuration * 0.5) * 1000, () => {
              if (gameState.bushSound.isPlaying) gameState.bushSound.stop();
            });
          }
          // Animate berry jumping out
          const berry = gameState.berries.create(bush.x, bush.y - 32, 'berry').setScale(0.6).setDepth(220);
          const direction = Math.random() < 0.5 ? -1 : 1;
          const jumpX = berry.x + direction * Phaser.Math.Between(40, 60);
          const jumpY = berry.y - Phaser.Math.Between(40, 60);
          gameState.scene.tweens.add({
            targets: berry,
            x: jumpX,
            y: jumpY,
            duration: 400,
            ease: 'Cubic.easeOut',
            yoyo: false,
            onComplete: () => {
              // After jump, fall straight down to ground
              // Clamp berry fall to visible ground (use platform Y or camera height)
              let groundY = h - 94;

              if (gameState.platforms && gameState.platforms.getChildren().length > 0) {
                // Use platform Y if available
                groundY = gameState.platforms.getChildren()[0].y - 24;
              }
              // Adjust so berry bottom sits on ground
              let berryFallY = groundY - (32 * 0.6) / 2;
              gameState.scene.tweens.add({
                targets: berry,
                y: berryFallY,
                duration: 300,
                ease: 'Cubic.easeIn',
                onComplete: () => {
                  berry.y = berryFallY; // Clamp to ground
                  berry.setDepth(220); // Always above tree
                  berry.setData('canPickup', true);
                }
              });
            }
          });
          // Decrement bush berry count
          bush.setData('berries', bush.getData('berries') - 1);

          // Store original Y position if not already stored
          if (!bush.getData('originalY')) {
            bush.setData('originalY', bush.y);
          }

          // Shrink bush and adjust Y to keep bottom anchored
          const berryCount = bush.getData('berries');
          const scaleValue = 0.7 + (berryCount / 10) * 0.3; // 10 berries = 1.0 scale, 0 berries = 0.7 scale
          bush.setScale(scaleValue);

          // Adjust Y position: as bush shrinks, move it down to keep bottom aligned
          // Bush is 64px tall, so when scale = 0.7, it's 44.8px tall (difference of 19.2px)
          // We need to move it down by half the height difference
          const originalHeight = 64;
          const newHeight = originalHeight * scaleValue;
          const heightDifference = originalHeight - newHeight;
          bush.y = bush.getData('originalY') + (heightDifference / 2);

          // If bush is empty, start regrowth
          if (bush.getData('berries') <= 0) {
            bush.setVisible(false);
            bush.setData('regrowing', true);
            gameState.scene.time.delayedCall(10000, () => {
              // Regrow bush in new valid spot
              bush.setData('regrowing', false);
              bush.setData('berries', 10);
              bush.setScale(1.0); // Reset to full size
              let tries = 0, x, y;
              do {
                x = Phaser.Math.Between(50, w - 50);
                y = h - 85;
                tries++;
              } while (!gameState.scene.isValidBerryBushPosition || !gameState.scene.isValidBerryBushPosition(x, y) && tries < 20);
              bush.x = x;
              bush.y = y;
              bush.setData('originalY', y); // Store new original Y position
              bush.setVisible(true);

            });
          }
        }
      }
    });
  }

  // Berry pickup logic
  gameState.berries.getChildren().forEach(berry => {
    if (berry.getData('canPickup')) {
      const dist = Phaser.Math.Distance.Between(
        gameState.player.x, gameState.player.y, berry.x, berry.y
      );
      if (dist < 40) {
        berry.destroy();
        // Play pick up item sound when picking up from ground
        if (gameState.pickUpItemSound) {
          if (gameState.pickUpItemSound.isPlaying) gameState.pickUpItemSound.stop();
          gameState.pickUpItemSound.play();
        }
        // Add to inventory (increase hunger by 1)
        gameState.hunger = Math.min(gameState.hunger + 1, gameState.maxHunger);
        showInfoText('You picked a berry! (+1 hunger)', 1200);
        
        // Show +1 animation above player
        showPlusOne(gameState.scene, gameState.player.x, gameState.player.y, 1);
      }
    }
  });
  // --- WEATHER SYSTEM ---
  // --- WEATHER SYSTEM: Precompute daily storms ---
  // Use `gameDay` (set at rollover) when available, otherwise fall back
  // to computed day from gameTime for the very first tick.
  const day = (typeof gameState.gameDay === 'number') ? gameState.gameDay : Math.floor(gameState.gameTime / (24 * 60));
  if (gameState.lastDayChecked !== day) {
    gameState.rainMinutesToday = 0;
    gameState.lastDayChecked = day;
    const dayStart = 0 + day * 24 * 60;
    gameState.stormSchedule = gameState.scheduleStormsForDay(dayStart);

    // Only reset storm index if no storm is currently active
    // This allows storms to continue across day boundaries
    if (!gameState.stormActive) {
      gameState.stormIndex = 0;
    }
  }

  // Check if we should start or end a storm based on the schedule
  // Use time within current day for storm comparison
  const timeInDay = (gameState.gameTime - gameState.dayStart) % (24 * 60);
  let nextStorm = gameState.stormSchedule[gameState.stormIndex];
  
  // If storm is active, don't interrupt it when day changes
  if (gameState.stormActive) {
    // Storm continues until it naturally ends
    const stormTotal = gameState.stormEndTime - gameState.nextStormTime;
    let elapsedInStorm = timeInDay - gameState.nextStormTime;
    
    // Handle wrap-around for storms that cross midnight (e.g., start at 1400, end at 100)
    if (elapsedInStorm < 0) {
      elapsedInStorm += 24 * 60; // Add full day to handle negative wrap
    }
    
    // Check if storm should end
    if (elapsedInStorm >= stormTotal) {
      gameState.stormActive = false;
      gameState.isRaining = false;
      gameState.stormStrength = 0;
      let rainThisStorm = gameState.stormEndTime - gameState.nextStormTime;
      if (rainThisStorm > 0) gameState.rainMinutesToday += rainThisStorm;
      gameState.stormIndex++;
    }
  } else if (nextStorm) {
    // Check if we should start this storm (handle wrap-around)
    let shouldStart = false;
    
    if (nextStorm.end > nextStorm.start) {
      // Normal case: storm doesn't cross midnight
      shouldStart = timeInDay >= nextStorm.start && timeInDay < nextStorm.end;
    } else {
      // Storm crosses midnight (e.g., starts at 1400, ends at 100)
      shouldStart = timeInDay >= nextStorm.start || timeInDay < nextStorm.end;
    }
    
    if (shouldStart) {
      // Start new storm
      gameState.stormActive = true;
      gameState.stormStrength = Math.random();
      gameState.nextStormTime = nextStorm.start;
      gameState.stormEndTime = nextStorm.end;
    } else if (timeInDay >= nextStorm.end && nextStorm.end > nextStorm.start) {
      // Move to next scheduled storm (only if storm doesn't wrap)
      gameState.stormIndex++;
    }
  }
  // (rest of weather logic unchanged)
  if (gameState.stormActive) {
    let stormTotal = gameState.stormEndTime - gameState.nextStormTime;
    
    // Handle wrap-around for storm duration calculation
    if (stormTotal < 0) {
      stormTotal += 24 * 60; // Add full day
    }
    
    let elapsedInStorm = timeInDay - gameState.nextStormTime;
    if (elapsedInStorm < 0) {
      elapsedInStorm += 24 * 60; // Handle wrap
    }
    
    const timeLeft = stormTotal - elapsedInStorm;
    
    // Peter out over the last 3 real seconds (72 in-game minutes at 24 min/sec speed)
    const peterOutDuration = 72; // 3 seconds * 24 minutes/second = 72 minutes
    let petersOut = false;
    if (timeLeft <= peterOutDuration && timeLeft >= 0) {
      petersOut = true;
    }
    // Storm is active: smoothly vary strength
    const t = elapsedInStorm / stormTotal;
    let base = 0.5 + 0.5 * Math.sin(t * Math.PI * 2 + Math.random() * 0.5);
    // Add a little random walk
    gameState.stormStrength += Phaser.Math.FloatBetween(-0.02, 0.02);
    // If petering out, force stormStrength to decrease smoothly to 0
    if (petersOut) {
      const fade = Phaser.Math.Clamp(timeLeft / peterOutDuration, 0, 1);
      base *= fade;
      gameState.stormStrength = Phaser.Math.Clamp((gameState.stormStrength + base) / 2, 0, fade);
    } else {
      gameState.stormStrength = Phaser.Math.Clamp((gameState.stormStrength + base) / 2, 0, 1);
    }
    // Keep raining as long as there's any storm strength (including fade-out)
    gameState.isRaining = gameState.stormStrength > 0;
  }
  // --- FOOTSTEPS AUDIO ---
  let movingOnGround = false;
  if (
    gameState.player &&
    gameState.player.body &&
    gameState.player.body.onFloor() &&
    !gameState.isClimbing &&
    !gameState.isCrouching &&
    !gameState.buildMenuOpen &&
    !gameState.buildMode &&
    (gameState.cursors.left.isDown || gameState.aKey.isDown || gameState.cursors.right.isDown || gameState.dKey.isDown)
  ) {
    // Only play if actually moving horizontally
    if (Math.abs(gameState.player.body.velocity.x) > 5) {
      movingOnGround = true;
    }
  }
  if (movingOnGround) {
    if (gameState.footstepsSound && !gameState.footstepsSound.isPlaying) {
      gameState.footstepsSound.play({ seek: 0 }); // Always start from beginning
    }
  } else {
    if (gameState.footstepsSound && gameState.footstepsSound.isPlaying) {
      gameState.footstepsSound.stop();
    }
  }

  // --- RAIN AUDIO ---
  // Keep rain sound playing as long as there's any rain (stormStrength > 0)
  if (gameState.isRaining && gameState.stormStrength > 0) {
    if (gameState.rainSound && !gameState.rainSound.isPlaying) {
      gameState.rainSound.play();
    }
  } else {
    if (gameState.rainSound && gameState.rainSound.isPlaying) {
      gameState.rainSound.stop();
    }
  }
  // --- Shelter preview: cycle sprite frame with up arrow ---
  if (gameState.buildMode === 'shelter' && gameState.placementItem) {
    // (moved to after stacking logic)
    // (do nothing here)
  }
  // -----------------
  // TIME & ENVIRONMENT SYSTEM
  // -----------------
  // Calculate delta time for frame-rate independent updates using Date.now()
  const currentTime = Date.now();
  if (!gameState.lastTimeUpdate) gameState.lastTimeUpdate = currentTime;
  const deltaTime = (currentTime - gameState.lastTimeUpdate) / 1000;
  gameState.lastTimeUpdate = currentTime;

  // -----------------
  // BUILD SYSTEM - ICON OPACITY
  // -----------------
  // Update build icon opacity based on affordability
  gameState.buildFireIcon.setAlpha(gameState.sticksCollected >= gameState.buildCosts.fire ? 1 : 0.5);
  gameState.buildBucketIcon.setAlpha(gameState.sticksCollected >= gameState.buildCosts.bucket ? 1 : 0.5);
  gameState.buildShelterIcon.setAlpha(gameState.sticksCollected >= gameState.buildCosts.shelter ? 1 : 0.5);

  // -----------------
  // BUILD MENU SYSTEM
  // -----------------
  // B key toggles build menu
  if (Phaser.Input.Keyboard.JustDown(gameState.bKey) && !gameState.buildMode) {
    gameState.buildMenuOpen = !gameState.buildMenuOpen;

    if (gameState.buildMenuOpen) {
      // Stop player movement when opening build menu
      if (gameState.player.body) {
        gameState.player.body.setVelocityX(0);
      }
      
      // Build list of affordable items
      gameState.buildableItems = [];
      if (gameState.sticksCollected >= gameState.buildCosts.fire) {
        gameState.buildableItems.push({ type: 'fire', icon: gameState.buildFireIcon, cost: gameState.buildCosts.fire });
      }
      if (gameState.sticksCollected >= gameState.buildCosts.bucket) {
        gameState.buildableItems.push({ type: 'bucket', icon: gameState.buildBucketIcon, cost: gameState.buildCosts.bucket });
      }
      if (gameState.sticksCollected >= gameState.buildCosts.shelter) {
        gameState.buildableItems.push({ type: 'shelter', icon: gameState.buildShelterIcon, cost: gameState.buildCosts.shelter });
      }

      // If no buildable items, flash red and show message
      if (gameState.buildableItems.length === 0) {
        gameState.buildFireIcon.setTint(0xff0000);
        gameState.buildBucketIcon.setTint(0xff0000);
        gameState.buildShelterIcon.setTint(0xff0000);

        // Show "Nothing to build" message
        showInfoText('Nothing to build', 2000);

        // Remove tint after 1 second
        gameState.scene.time.delayedCall(1000, () => {
          gameState.buildFireIcon.clearTint();
          gameState.buildBucketIcon.clearTint();
          gameState.buildShelterIcon.clearTint();
        });

        gameState.buildMenuOpen = false;
      } else {
        // Select first item if any available
        gameState.buildMenuSelection = 0;

        // Highlight first item (different scales for different icon sizes)
        if (gameState.buildableItems[0].type === 'shelter') {
          gameState.buildableItems[0].icon.setScale(0.3); // 128x128 image
        } else {
          gameState.buildableItems[0].icon.setScale(0.6); // 64x64 images
        }

        // Show build instruction with colored check/x and cost
        const itemName = gameState.buildableItems[0].type === 'fire' ? 'Fire' :
          gameState.buildableItems[0].type === 'bucket' ? 'Bucket' : 'Shelter';
        showBuildMenuText(itemName, gameState.buildableItems[0].cost);

        // Reset jump states to prevent interference
        gameState.spaceHeld = false;
        gameState.isCrouching = false;
        gameState.jumpBufferTime = 0;
      }
    } else {
      // Close menu - reset all icons and hide instruction
      gameState.buildFireIcon.setScale(0.4);
      gameState.buildBucketIcon.setScale(0.4);
      gameState.buildShelterIcon.setScale(0.2);
      hideBuildMenuText();
    }
  }

  // Build menu navigation
  if (gameState.buildMenuOpen && gameState.buildableItems.length > 0 && !gameState.buildMode) {
    // Left/Right arrow keys to cycle through items
    if (Phaser.Input.Keyboard.JustDown(gameState.cursors.left) || Phaser.Input.Keyboard.JustDown(gameState.aKey)) {
      gameState.menuSelectionSound.play(); // Play menu selection sound
      // Reset current selection scale
      if (gameState.buildableItems[gameState.buildMenuSelection].type === 'shelter') {
        gameState.buildableItems[gameState.buildMenuSelection].icon.setScale(0.2);
      } else {
        gameState.buildableItems[gameState.buildMenuSelection].icon.setScale(0.4);
      }

      // Move selection left (wrap around)
      gameState.buildMenuSelection--;
      if (gameState.buildMenuSelection < 0) {
        gameState.buildMenuSelection = gameState.buildableItems.length - 1;
      }

      // Highlight new selection
      if (gameState.buildableItems[gameState.buildMenuSelection].type === 'shelter') {
        gameState.buildableItems[gameState.buildMenuSelection].icon.setScale(0.3);
      } else {
        gameState.buildableItems[gameState.buildMenuSelection].icon.setScale(0.6);
      }

      // Update instruction text with colored check/x
      const itemName = gameState.buildableItems[gameState.buildMenuSelection].type === 'fire' ? 'Fire' :
        gameState.buildableItems[gameState.buildMenuSelection].type === 'bucket' ? 'Bucket' : 'Shelter';
      showBuildMenuText(itemName, gameState.buildableItems[gameState.buildMenuSelection].cost);
    }

    if (Phaser.Input.Keyboard.JustDown(gameState.cursors.right) || Phaser.Input.Keyboard.JustDown(gameState.dKey)) {
      gameState.menuSelectionSound.play(); // Play menu selection sound
      // Reset current selection scale
      if (gameState.buildableItems[gameState.buildMenuSelection].type === 'shelter') {
        gameState.buildableItems[gameState.buildMenuSelection].icon.setScale(0.2);
      } else {
        gameState.buildableItems[gameState.buildMenuSelection].icon.setScale(0.4);
      }

      // Move selection right (wrap around)
      gameState.buildMenuSelection++;
      if (gameState.buildMenuSelection >= gameState.buildableItems.length) {
        gameState.buildMenuSelection = 0;
      }

      // Highlight new selection
      if (gameState.buildableItems[gameState.buildMenuSelection].type === 'shelter') {
        gameState.buildableItems[gameState.buildMenuSelection].icon.setScale(0.3);
      } else {
        gameState.buildableItems[gameState.buildMenuSelection].icon.setScale(0.6);
      }

      // Update instruction text with colored check/x
      const itemName = gameState.buildableItems[gameState.buildMenuSelection].type === 'fire' ? 'Fire' :
        gameState.buildableItems[gameState.buildMenuSelection].type === 'bucket' ? 'Bucket' : 'Shelter';
      showBuildMenuText(itemName, gameState.buildableItems[gameState.buildMenuSelection].cost);
    }

    // Backspace key to cancel build menu
    if (Phaser.Input.Keyboard.JustDown(gameState.backspaceKey)) {
      // Close build menu
      gameState.buildMenuOpen = false;
      gameState.buildFireIcon.setScale(0.4);
      gameState.buildBucketIcon.setScale(0.4);
      gameState.buildShelterIcon.setScale(0.2);
      hideBuildMenuText();
    }

    // Enter key to build selected item
    if (Phaser.Input.Keyboard.JustDown(gameState.enterKey)) {
      const selectedItem = gameState.buildableItems[gameState.buildMenuSelection];

      // Trigger the click event on the selected icon
      if (selectedItem.type === 'fire') {
        gameState.buildFireIcon.emit('pointerdown');
      } else if (selectedItem.type === 'bucket') {
        gameState.buildBucketIcon.emit('pointerdown');
      } else if (selectedItem.type === 'shelter') {
        gameState.buildShelterIcon.emit('pointerdown');
      }

      // Close build menu and hide instruction
      gameState.buildMenuOpen = false;
      gameState.buildFireIcon.setScale(0.4);
      gameState.buildBucketIcon.setScale(0.4);
      gameState.buildShelterIcon.setScale(0.2);
      hideBuildMenuText();
    }
  }

  // -----------------
  // PLACEMENT MODE - MOVE ITEM WITH ARROWS
  // -----------------
  if (gameState.buildMode && gameState.placementItem) {
    const moveSpeed = 200 * deltaTime;
    if ((gameState.cursors.left.isDown || gameState.aKey.isDown) && !gameState.buildMenuOpen) {
      gameState.placementArrowLeft.x -= moveSpeed;
      gameState.placementArrowRight.x -= moveSpeed;
      gameState.checkButton.x -= moveSpeed;
      gameState.xButton.x -= moveSpeed;
      gameState.placementItem.x -= moveSpeed;
      gameState.ghostPreviewX -= moveSpeed;

    }
    if ((gameState.cursors.right.isDown || gameState.dKey.isDown) && !gameState.buildMenuOpen) {
      gameState.placementArrowLeft.x += moveSpeed;
      gameState.placementArrowRight.x += moveSpeed;
      gameState.checkButton.x += moveSpeed;
      gameState.xButton.x += moveSpeed;
      gameState.placementItem.x += moveSpeed;
      gameState.ghostPreviewX += moveSpeed;
    }


    // Prevent movement off screen edges
    let minX = 64;
    let maxX = this.cameras.main.width - 64;
    if (gameState.buildMode === 'bucket' || gameState.buildMode === 'fire') {
      // Allow bucket or fire to be placed so its edge is flush with screen edge (fire is 40px wide)
      minX = 20; // Half object width
      maxX = this.cameras.main.width - 20;
    } else if (gameState.buildMode === 'shelter') {
      // Shelter is 128px wide, so prevent it from going off screen
      minX = 64; // Half shelter width
      maxX = this.cameras.main.width - 64;
    }
    if (gameState.placementItem.x < minX) {
      gameState.placementItem.x = minX;
      gameState.ghostPreviewX = minX; // Also constrain ghost position
      gameState.placementArrowLeft.x = minX - 75;
      gameState.placementArrowRight.x = minX + 75;
      if (gameState.placementArrowUp) gameState.placementArrowUp.x = minX;
      gameState.checkButton.x = minX - 20; // Centered pair offset
      gameState.xButton.x = minX + 20;
      gameState.checkButton.y = gameState.placementItem.y - 100;
      gameState.xButton.y = gameState.placementItem.y - 100;
    }
    if (gameState.placementItem.x > maxX) {
      gameState.placementItem.x = maxX;
      gameState.ghostPreviewX = maxX; // Also constrain ghost position
      gameState.placementArrowLeft.x = maxX - 75;
      gameState.placementArrowRight.x = maxX + 75;
      if (gameState.placementArrowUp) gameState.placementArrowUp.x = maxX;
      gameState.checkButton.x = maxX - 20; // Centered pair offset
      gameState.xButton.x = maxX + 20;
      gameState.checkButton.y = gameState.placementItem.y - 100;
      gameState.xButton.y = gameState.placementItem.y - 100;
    }

    // --- Shelter preview stacking & snapping logic ---
    if (gameState.buildMode === 'shelter') {
      const shelterWidth = 128, shelterHeight = 128;

      // Always use ghostPreview as the authoritative preview position
      // placementItem will be updated to match ghostPreview unless we snap
      let shouldSnap = false;
      let snapX = null;
      let snapY = null;
      const snapThresholdX = shelterWidth*.75; // snap only when ghost X is within one shelter width
      const snapThresholdY = 12; // small vertical tolerance for stacking

      for (let i = 0; i < gameState.shelters.length; i++) {
        const existing = gameState.shelters[i];
        const dx = Math.abs(existing.x - gameState.ghostPreviewX);
        const targetY = existing.y - shelterHeight + 24; // Add 24px to sit lower and be flush

        // Snap when ghost X is within horizontal snap threshold of an existing shelter.
        // We intentionally do NOT require the ghostPreviewY to already match targetY so
        // the preview will vertically align (stack) as you pass over an existing shelter.
        if (dx < snapThresholdX) {
          shouldSnap = true;
          snapX = existing.x;
          snapY = targetY;
          break;
        }
      }

      if (shouldSnap) {
        // Snap preview to the stacked position
        gameState.placementItem.x = snapX;
        gameState.placementItem.y = snapY - 12; // Offset to match actual placement
        gameState.placementArrowLeft.x = snapX - 75;
        gameState.placementArrowRight.x = snapX + 75;
        gameState.placementArrowLeft.y = snapY - 12;
        gameState.placementArrowRight.y = snapY - 12;
        if (gameState.placementArrowUp) {
          gameState.placementArrowUp.x = snapX;
          gameState.placementArrowUp.y = snapY - 12 - 70; // 70px above shelter
        }
        gameState.checkButton.x = snapX - 20;
        gameState.checkButton.y = snapY - 12 - 100;
        gameState.xButton.x = snapX + 20;
        gameState.xButton.y = snapY - 12 - 100;
        gameState.snapped = true;
        // Do NOT overwrite ghostPreviewX/Y — keep ghost as what player is controlling.
        // The preview sprite is snapped visually, but the ghost coordinates remain authoritative
        // so snapping is temporary while the ghost X/Y stay within the snap range.
        // Visual indicator for snapping
        if (gameState.placementItem.setTint) {
          gameState.placementItem.setTint(0x88ff88);
        }
        gameState.placementItem.setDepth(220);
        
        // Draw extended shade for stacked shelter
        if (gameState.previewShade) {
          gameState.previewShade.clear();
          gameState.previewShade.fillStyle(0x000000, 0.5);
          // For stacked shelter: top of trapezoid matches bottom of ground shelter's trapezoid
          const groundBottomWidth = 150; // Bottom width of ground shelter's shade
          const stackedBottomWidth = 180; // Even wider at bottom for stacked shade
          const shadeHeight = 70; // Additional height below ground shelter's shade
          const centerX = gameState.placementItem.x;
          const topY = gameState.placementItem.y + 18 + 128; // Start where ground shelter's shade ends
          
          gameState.previewShade.beginPath();
          gameState.previewShade.moveTo(centerX - groundBottomWidth/2, topY+shadeHeight); // Top-left (ground's bottom-left)
          gameState.previewShade.lineTo(centerX - stackedBottomWidth/2+3, topY+shadeHeight*2-40); // Bottom-left (wider)
          gameState.previewShade.lineTo(centerX + stackedBottomWidth/2-3, topY+shadeHeight*2-40); // Bottom-right (ground's bottom-right
          gameState.previewShade.lineTo(centerX + groundBottomWidth/2, topY+shadeHeight); // Top-right (wider))
          gameState.previewShade.closePath();
          gameState.previewShade.fillPath();
        }
        // Debug log for snap
        //console.log('SNAP PREVIEW at', snapX, snapY, 'ghostX', gameState.ghostPreviewX);
      } else {
        // Not snapping: ensure preview exactly follows ghostPreview
        gameState.placementItem.x = gameState.ghostPreviewX;
        gameState.placementItem.y = gameState.ghostPreviewY - 12; // Offset to match actual placement
        gameState.placementArrowLeft.x = gameState.ghostPreviewX - 75;
        gameState.placementArrowRight.x = gameState.ghostPreviewX + 75;
        gameState.placementArrowLeft.y = gameState.ghostPreviewY - 12;
        gameState.placementArrowRight.y = gameState.ghostPreviewY - 12;
        if (gameState.placementArrowUp) {
          gameState.placementArrowUp.x = gameState.ghostPreviewX;
          gameState.placementArrowUp.y = gameState.ghostPreviewY - 12 - 70; // 70px above shelter
        }
        gameState.checkButton.x = gameState.ghostPreviewX - 20;
        gameState.checkButton.y = gameState.ghostPreviewY - 12 - 100;
        gameState.xButton.x = gameState.ghostPreviewX + 20;
        gameState.xButton.y = gameState.ghostPreviewY - 12 - 100;
        gameState.snapped = false;
        // Clear any snap tint
        if (gameState.placementItem.clearTint) {
          gameState.placementItem.clearTint();
        }
        gameState.placementItem.setDepth(210);
        
        // Draw normal shade for non-stacked shelter
        if (gameState.previewShade) {
          gameState.previewShade.clear();
          gameState.previewShade.fillStyle(0x000000, 0.5);
          const topWidth = 100;
          const bottomWidth = 150;
          const shadeHeight = 70; // Normal height
          const centerX = gameState.placementItem.x;
          const topY = gameState.placementItem.y + 30;
          
          gameState.previewShade.beginPath();
          gameState.previewShade.moveTo(centerX - topWidth/2, topY);
          gameState.previewShade.lineTo(centerX + topWidth/2, topY);
          gameState.previewShade.lineTo(centerX + bottomWidth/2, topY + shadeHeight);
          gameState.previewShade.lineTo(centerX - bottomWidth/2, topY + shadeHeight);
          gameState.previewShade.closePath();
          gameState.previewShade.fillPath();
        }
      }
    }

    // Enter key - confirm placement (same as check button)
    if (Phaser.Input.Keyboard.JustDown(gameState.enterKey)) {
      if (gameState.buildMode === 'fire' && gameState.sticksCollected >= 3) {
        // Deduct branches
        gameState.sticksCollected -= gameState.buildCosts.fire;
        gameState.stickText.setText(`${gameState.sticksCollected}`);

        // Create actual fire at placement position
        const fire = gameState.scene.add.sprite(
          gameState.placementItem.x,
          gameState.placementItem.y,
          'fire_spritesheet'
        ).setScale(1).setDepth(212);

        gameState.scene.physics.world.enable(fire);
        fire.body.setAllowGravity(false);
        fire.body.setImmovable(true);
        fire.body.setSize(40, 40);
        fire.anims.play('fireBurn', true);
        
        // Store creation time and original Y for shrinking effect
        fire.setData('createdAt', Date.now());
        fire.setData('originalY', fire.y);
        fire.setData('lifetime', 60000); // 60 seconds lifetime
        
        gameState.fires.push(fire);

        // Play start fire sound (will chain to looping fire sound on complete)
        gameState.startFireSound.play();

        // Show build notification
        showInfoText('You built a Fire', 2000);

        // Clean up placement UI
        gameState.placementItem.destroy();
        gameState.placementArrowLeft.destroy();
        gameState.placementArrowRight.destroy();
        gameState.buildMode = null;
        gameState.checkButton.setVisible(false);
        gameState.xButton.setVisible(false);
      } else if (gameState.buildMode === 'bucket' && gameState.sticksCollected >= 5) {
        // Check if bucket would overlap with any shelter
        const bucketX = gameState.placementItem.x;
        const bucketY = gameState.placementItem.y;
        let overlappingShelter = false;

        for (const shelter of gameState.shelters) {
          if (shelter && shelter.active) {
            // Check if bucket X position is within shelter width (only check horizontal overlap)
            if (Math.abs(bucketX - shelter.x) < 64) {
              overlappingShelter = true;
              break;
            }
          }
        }

        if (overlappingShelter) {
          // Too close to shelter - show error message and don't place
          showInfoText('Too close to shelter!', 2000);
          // Don't deduct sticks, just exit without placing
        } else {
          // Valid placement - proceed with building
          // Deduct branches
          gameState.sticksCollected -= gameState.buildCosts.bucket;
          gameState.stickText.setText(`${gameState.sticksCollected}`);

          // Create actual bucket at placement position
          const bucket = gameState.scene.add.sprite(
          gameState.placementItem.x,
          gameState.placementItem.y,
          'bucket_spritesheet',
          0
        ).setScale(1).setDepth(250);

        gameState.scene.physics.world.enable(bucket);
        bucket.body.setAllowGravity(false);
        bucket.body.setImmovable(true);
        bucket.body.setSize(40, 40);

        // Add fill percentage data and text display
        bucket.setData('fillPercent', 0
        );
        const fillText = gameState.scene.add.text(
          bucket.x,
          bucket.y,
          '0%',
          { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
        ).setOrigin(0.5).setDepth(1000);
        bucket.setData('fillText', fillText);

        // Store bucket for rain collection
        gameState.buckets.push(bucket);

        gameState.scene.sound.play('placement'); // Play placement sound

        // Show build notification
        showInfoText('You built a Bucket', 2000);

        // Clean up placement UI
        gameState.placementItem.destroy();
        gameState.placementArrowLeft.destroy();
        gameState.placementArrowRight.destroy();
        gameState.buildMode = null;
        gameState.checkButton.setVisible(false);
        gameState.xButton.setVisible(false);
        }
      } else if (gameState.buildMode === 'shelter' && gameState.sticksCollected >= 7) {
        // Determine final placement coordinates.
        // If preview is currently snapped (temporary visual snap), place at the snapped preview coords.
        // Otherwise place at the authoritative ghost preview position the player controls.
        let finalX, finalY;
        if (gameState.snapped && gameState.placementItem) {
          finalX = gameState.placementItem.x;
          finalY = gameState.placementItem.y + 12; // Add back 12 since preview already has -12 offset
        } else {
          finalX = gameState.ghostPreviewX;
          finalY = gameState.ghostPreviewY;
        }
        
        // Check if shelter is too close to tree trunk (within 80% of shelter width on either side)
        const shelterWidth = 128;
        const minDistanceFromTree = shelterWidth * 1.3; // 102.4 pixels
        const distanceFromTree = Math.abs(finalX - gameState.treeTrunk.x);
        
        if (distanceFromTree < minDistanceFromTree) {
          // Too close to tree - show error message and don't place
          showInfoText('Too close to tree!', 2000);
          // Don't deduct sticks, just exit
        } else {
          // Valid placement - proceed with building
          // Deduct branches
          gameState.sticksCollected -= gameState.buildCosts.shelter;
          gameState.stickText.setText(`${gameState.sticksCollected}`);
        const shelterFrame = gameState.shelterPreviewFrame || 0;
        const shelter = gameState.scene.add.sprite(
          finalX,
          finalY - 12,  // Move up 12px
          'shelter', shelterFrame
        ).setScale(1).setDepth(210)

        gameState.scene.physics.world.enable(shelter);
        shelter.body.setAllowGravity(false);
        shelter.body.setImmovable(true);
        shelter.body.setSize(128, 128, false);
        shelter.body.setOffset(0, 0);
        shelter.body.isCircle = false;

        // Create shade visual under the shelter (trapezoid - wider at bottom)
        // If this is a stacked shelter, shade starts where ground shelter's shade ends
        const shelterShade = gameState.scene.add.graphics();
        shelterShade.fillStyle(0x000000, 0.5); // Darker for visibility
        
        // Check if this shelter is stacked on another (snapped means it was stacked)
        const isStacked = gameState.snapped;
        
        if (isStacked) {
          // Stacked shelter: shade starts at bottom of ground shelter's shade
          const groundBottomWidth = 150; // Bottom width of ground shelter's shade
          const stackedBottomWidth = 180; // Even wider at bottom for stacked shade
          const shadeHeight = 70; // Additional height below ground shelter's shade
          const centerX = shelter.x;
          const topY = shelter.y + 18 + 128; // Start where ground shelter's shade ends
          
          shelterShade.beginPath();
          shelterShade.moveTo(centerX - groundBottomWidth/2, topY+shadeHeight); // Top-left (ground's bottom-left)
          shelterShade.lineTo(centerX - stackedBottomWidth/2+3, topY+shadeHeight*2-40); // Bottom-left (wider)
          shelterShade.lineTo(centerX + stackedBottomWidth/2-3, topY+shadeHeight*2-40); // Bottom-right (wider)
          shelterShade.lineTo(centerX + groundBottomWidth/2, topY+shadeHeight); // Top-right (ground's bottom-right)
          shelterShade.closePath();
          shelterShade.fillPath();
        } else {
          // Ground shelter: normal trapezoid shade
          const topWidth = 100;
          const bottomWidth = 150;
          const shadeHeight = 70;
          const centerX = shelter.x;
          const topY = shelter.y + 30;
          
          shelterShade.beginPath();
          shelterShade.moveTo(centerX - topWidth/2, topY);           // Top-left
          shelterShade.lineTo(centerX + topWidth/2, topY);           // Top-right
          shelterShade.lineTo(centerX + bottomWidth/2, topY + shadeHeight); // Bottom-right
          shelterShade.lineTo(centerX - bottomWidth/2, topY + shadeHeight); // Bottom-left
          shelterShade.closePath();
          shelterShade.fillPath();
        }
        
        shelterShade.setDepth(209); // Just below shelter at 210
        
        // Store shade with shelter
        shelter.setData('shade', shelterShade);

        // If for some reason the code reaches here and placement wasn't done at the snapped preview,
        // keep the shelter where the preview indicated (finalX/finalY). We do NOT force stacking
        // during confirmation — stacking only occurs while previewing (temporary snap).


        // Store shelter
        gameState.shelters.push(shelter);

        // Add collision platforms based on shelter frame
        if (gameState.shelterPlatforms) {
          const shelterFrame = gameState.shelterPreviewFrame || 0;
          
          // Helper function to create platforms/walls
          const createTop = () => {
            const topPlatform = gameState.shelterPlatforms.create(
              shelter.x,
              shelter.y - 64 + 19,
              'platform'
            );
            topPlatform.displayWidth = 128;
            topPlatform.displayHeight = 19;
            topPlatform.setAlpha(0);
            topPlatform.setDepth(9999);
            topPlatform.refreshBody();
          };
          
          const createLeft = () => {
            const leftWall = gameState.shelterPlatforms.create(
              shelter.x - 64 + 19,
              shelter.y,
              'platform'
            );
            leftWall.displayWidth = 19;
            leftWall.displayHeight = 128;
            leftWall.setAlpha(0);
            leftWall.setDepth(9999);
            leftWall.refreshBody();
          };
          
          const createRight = () => {
            const rightWall = gameState.shelterPlatforms.create(
              shelter.x + 64 - 19,
              shelter.y,
              'platform'
            );
            rightWall.displayWidth = 19;
            rightWall.displayHeight = 128;
            rightWall.setAlpha(0);
            rightWall.setDepth(9999);
            rightWall.refreshBody();
          };
          
          // Create platforms based on frame
          switch(shelterFrame) {
            case 0: // Top, Left, Right
              createTop();
              createLeft();
              createRight();
              break;
            case 1: // Left, Top
              createLeft();
              createTop();
              break;
            case 2: // Top, Right
              createTop();
              createRight();
              break;
            case 3: // Only Top
              break;
            case 4: // Left, Right
              createLeft();
              createRight();
              break;
            case 5: // No platforms
              break;
            case 6: // Only Left
              createLeft();
              break;
            case 7: // Only Right
              createRight();
              break;
            default:
              // Default to top platform only for any additional frames
              createTop();
              break;
          }
        }

        gameState.scene.sound.play('placement'); // Play placement sound

        // Show build notification
        showInfoText('You built a Shelter', 2000);

        // Clean up placement UI
        gameState.placementItem.destroy();
        if (gameState.previewShade) gameState.previewShade.destroy();
        gameState.placementArrowLeft.destroy();
        gameState.placementArrowRight.destroy();
        if (gameState.placementArrowUp) gameState.placementArrowUp.destroy();
        gameState.buildMode = null;
        gameState.checkButton.setVisible(false);
        gameState.xButton.setVisible(false);
        } // Close the else block for valid placement
      }
    }

    // Backspace key - cancel placement (same as x button)
    if (Phaser.Input.Keyboard.JustDown(gameState.backspaceKey) && gameState.buildMode) {
      // Clean up placement UI without deducting branches
      gameState.placementItem.destroy();
      if (gameState.previewShade) gameState.previewShade.destroy();
      gameState.placementArrowLeft.destroy();
      gameState.placementArrowRight.destroy();
      if (gameState.placementArrowUp) gameState.placementArrowUp.destroy();
      gameState.buildMode = null;
      gameState.checkButton.setVisible(false);
      gameState.xButton.setVisible(false);
    }
  }

  // -----------------
  // RAIN & BUCKET WATER COLLECTION
  // -----------------
  // Check raindrop collisions (optimized - only during storms)
  if (gameState.isRaining) {
    const raindrops = gameState.raindrops.getChildren();
    
    for (let i = raindrops.length - 1; i >= 0; i--) {
      const raindrop = raindrops[i];
      if (!raindrop || !raindrop.active) continue;
      
      let raindropDestroyed = false;
      
      // Check player collision first (quick bounds check)
      if (!raindropDestroyed && Math.abs(raindrop.x - gameState.player.x) < 40 && Math.abs(raindrop.y - gameState.player.y) < 40) {
        const distanceToPlayer = Phaser.Math.Distance.Between(raindrop.x, raindrop.y, gameState.player.x, gameState.player.y);

        if (distanceToPlayer < 30) {
          raindrop.destroy();
          raindropDestroyed = true;

          // Calculate new temperature
          let newTemp;
          if (gameState.playerTemp >= 95) newTemp = 94;
          else if (gameState.playerTemp <= 55) newTemp = 56;
          else newTemp = gameState.temperature;

          // Re-apply shade and fire modifiers
          const tempPlayerBounds = gameState.player.getBounds();
          const tempTrunkBounds = gameState.treeTrunk.getBounds();
          const underTree = Phaser.Geom.Intersects.RectangleToRectangle(tempPlayerBounds, tempTrunkBounds);
          
          let underShelter = false;
          if (gameState.shelters && gameState.shelters.length > 0) {
            for (const shelter of gameState.shelters) {
              if (shelter.active && Phaser.Geom.Intersects.RectangleToRectangle(tempPlayerBounds, shelter.getBounds())) {
                underShelter = true;
                break;
              }
            }
          }

          if (underTree || underShelter) newTemp -= 5;
          if (gameState.nearFire && closestFireDistance < playerBodyLength * 2) {
            const distanceInWidths = closestFireDistance / playerBodyLength;
            if (distanceInWidths > 1 && distanceInWidths <= 2) newTemp += 7;
          }

          gameState.playerTemp = newTemp;
          gameState.thirst = Math.min(gameState.thirst + 1, gameState.maxThirst);
          gameState.waterText.setText(`${gameState.thirst}`);
          gameState.gulpSound.play();
          
          showPlusOne(gameState.scene, gameState.player.x, gameState.player.y, 1);

          gameState.tempStatusMessage.setText('Temperature Stabilized');
          gameState.tempStatusMessage.setVisible(!gameState.buildMode && !gameState.buildMenuOpen);
          gameState.scene.time.delayedCall(2000, () => {
            gameState.tempStatusMessage.setVisible(false);
          });
        }
      }

      // Check shelter collision
      if (!raindropDestroyed) {
        for (let j = 0; j < gameState.shelters.length; j++) {
          const shelter = gameState.shelters[j];
          if (shelter && shelter.active && Math.abs(raindrop.x - shelter.x) < 80 && Math.abs(raindrop.y - shelter.y) < 80) {
            const dist = Phaser.Math.Distance.Between(raindrop.x, raindrop.y, shelter.x, shelter.y);
            if (dist < 40) {
              raindrop.destroy();
              raindropDestroyed = true;
              break;
            }
          }
        }
      }

      // Check fire collision
      if (!raindropDestroyed) {
        for (let k = 0; k < gameState.fires.length; k++) {
          const fire = gameState.fires[k];
          if (fire && fire.active && Math.abs(raindrop.x - fire.x) < 40 && Math.abs(raindrop.y - fire.y) < 40) {
            const dist = Phaser.Math.Distance.Between(raindrop.x, raindrop.y, fire.x, fire.y);
            if (dist < 30) {
              raindrop.destroy();
              fire.destroy();

              if (gameState.fireOutSound) gameState.fireOutSound.play();

              const fireIndex = gameState.fires.indexOf(fire);
              if (fireIndex > -1) gameState.fires.splice(fireIndex, 1);

              if (gameState.fires.length === 0) gameState.fireSound.stop();
              
              raindropDestroyed = true;
              break;
            }
          }
        }
      }
      
      // Check bucket collision
      if (!raindropDestroyed && gameState.buckets.length > 0) {
        for (let m = 0; m < gameState.buckets.length; m++) {
          const bucket = gameState.buckets[m];
          if (bucket && bucket.active && Math.abs(raindrop.x - bucket.x) < 40 && Math.abs(raindrop.y - bucket.y) < 40) {
            const dist = Phaser.Math.Distance.Between(raindrop.x, raindrop.y, bucket.x, bucket.y);
            if (dist < 30) {
              raindrop.destroy();
              gameState.waterDropSound.play();

              let fillPercent = bucket.getData('fillPercent');
              fillPercent = Math.min(fillPercent + 10, 100);
              bucket.setData('fillPercent', fillPercent);
              
              if (fillPercent >= 100) bucket.setFrame(4);
              else if (fillPercent >= 75) bucket.setFrame(3);
              else if (fillPercent >= 50) bucket.setFrame(2);
              else if (fillPercent >= 25) bucket.setFrame(1);
              else bucket.setFrame(0);

              const fillText = bucket.getData('fillText');
              if (fillText) {
                fillText.setText(`${fillPercent}%`);
                fillText.setVisible(true);
                fillText.setDepth(10001);
              }
              
              raindropDestroyed = true;
              break;
            }
          }
        }
      }
    }
  }
  
  // Update bucket fill text positions even when not raining
  gameState.buckets.forEach(bucket => {
    if (bucket && bucket.active) {
      const fillText = bucket.getData('fillText');
      if (fillText) fillText.setPosition(bucket.x, bucket.y);
    }
  });

  // Update game time (24 in-game minutes per real second)
  // This makes a full 24h day pass in 60 seconds (1 minute) of real time
  // — 30s for daytime (12h) and 30s for nighttime (12h).
  gameState.gameTime += deltaTime * 24; // 24 minutes per real second
  // Advance day only when a full 24 hours has passed since `dayStart`.
  // This ensures days start at 7:00 and last a full 24 hours.
  const minutesPerDay = 24 * 60;
  const elapsedSinceDayStart = gameState.gameTime - (gameState.dayStart || gameState.gameTime);
  if (elapsedSinceDayStart >= minutesPerDay) {
    // How many full days have passed since dayStart (usually 1)
    const fullDays = Math.floor(elapsedSinceDayStart / minutesPerDay);

    // Advance the recorded dayStart by the number of full days
    gameState.dayStart = (gameState.dayStart || gameState.gameTime) + fullDays * minutesPerDay;

    // Advance gameDay and level once per full day passed
    gameState.gameDay = (gameState.gameDay || 0) + fullDays;
    gameState.level = (gameState.level || 1) + fullDays;

    // Double build costs every other level (on odd levels > 1)
    if (gameState.level > 1 && gameState.level % 2 === 1) {
      gameState.buildCosts.fire *= 2;
      gameState.buildCosts.bucket *= 2;
      gameState.buildCosts.shelter *= 2;
    }

    showInfoText(`Level Up! Level ${gameState.level}`);
    gameState.levelText.setText(`Level: ${gameState.level}`);
  }

  // Increment score every frame (but not when game over)
  if (!gameState.gameOver) {
    gameState.score += 1;
    gameState.scoreText.setText(`Score: ${gameState.score}`);
    
  }

  // Display time in 12-hour format
  const hours = Math.floor((gameState.gameTime % (24 * 60)) / 60);
  const minutes = Math.floor(gameState.gameTime % 60);
  const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
  const ampm = hours < 12 ? 'AM' : 'PM';
  gameState.timeText.setText(`${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`);

  // Calculate ambient temperature from keypoints with smooth cosine interpolation.
  // Requirements:
  // - Coldest time at 1:00 (choose a reasonable min, previously ~48°F)
  // - Sunrise at 7:00 -> 65°F
  // - Hottest time at 13:00 (peak, choose previous max ~100°F)
  // - Sunset at 19:00 -> 75°F
  const hourOfDay = (gameState.gameTime % (24 * 60)) / 60;

  // Define keypoints (hours) and target temps. We include 25 (1am next day)
  // so interpolation across midnight works naturally.
  const Tmin = 48; // coldest at 1:00
  const Tmax = 100; // hottest at 13:00
  const keypoints = [
    { h: 1, temp: Tmin },
    { h: 7, temp: 65 },
    { h: 13, temp: Tmax },
    { h: 19, temp: 75 },
    { h: 25, temp: Tmin } // mirror of 1:00 next day
  ];

  // Map hour into [1,25) domain so values before 1:00 wrap to 25-based span
  let hh = hourOfDay;
  if (hh < 1) hh += 24;

  // Find segment
  let segA = keypoints[0];
  let segB = keypoints[1];
  for (let i = 0; i < keypoints.length - 1; i++) {
    if (hh >= keypoints[i].h && hh < keypoints[i + 1].h) {
      segA = keypoints[i];
      segB = keypoints[i + 1];
      break;
    }
  }

  const span = segB.h - segA.h;
  const frac = span > 0 ? (hh - segA.h) / span : 0;
  // Cosine easing for smooth start/stop
  const mu2 = (1 - Math.cos(frac * Math.PI)) / 2;
  gameState.temperature = segA.temp * (1 - mu2) + segB.temp * mu2;
  gameState.tempText.setText(`${Math.round(gameState.temperature)}°F`);

  // -----------------
  // FIRE WARMING SYSTEM
  // -----------------
  // Check distance to all active fires
  gameState.nearFire = false;
  let closestFireDistance = Infinity;
  let touchingFire = false;
  const playerBodyLength = 64;

  gameState.fires.forEach(fire => {
    if (fire && fire.active) {
      // Shrink fire over time (like bushes shrink when picked)
      const createdAt = fire.getData('createdAt');
      const lifetime = fire.getData('lifetime') || 60000;
      const elapsed = Date.now() - createdAt;
      const lifePercent = 1 - Math.min(elapsed / lifetime, 1); // 1.0 at start, 0.0 at end
      
      // Scale from 1.0 to 0.7 (same as bushes)
      const scaleValue = 0.7 + (lifePercent * 0.3);
      fire.setScale(scaleValue);
      
      // Adjust Y position to keep bottom anchored (same as bushes)
      const originalHeight = 64;
      const newHeight = originalHeight * scaleValue;
      const heightDifference = originalHeight - newHeight;
      fire.y = fire.getData('originalY') + (heightDifference / 2);
      
      // Destroy fire when lifetime expires
      if (elapsed >= lifetime) {
        fire.destroy();
        const fireIndex = gameState.fires.indexOf(fire);
        if (fireIndex > -1) {
          gameState.fires.splice(fireIndex, 1);
        }
        return;
      }
      
      const distance = Phaser.Math.Distance.Between(
        gameState.player.x,
        gameState.player.y,
        fire.x,
        fire.y
      );

      if (distance < closestFireDistance) {
        closestFireDistance = distance;
      }

      // Check if touching fire (< 30px)
      if (distance < 30) {
        touchingFire = true;
        if (!gameState.isClimbing && !gameState.isJumping && !gameState.isLanding) {
          gameState.player.setTexture('fire_player');
        }
      }

      // Check if within warming range (< 128px)
      if (distance < playerBodyLength * 2) {
        gameState.nearFire = true;
      }
    }
  });

  // Reset player sprite when not near fire
  if (!touchingFire && !gameState.isClimbing && !gameState.isJumping && !gameState.isLanding &&
    !gameState.isCrouching && !gameState.pickingBerry && gameState.player.texture.key === 'fire_player') {
    gameState.player.setTexture('spritesheet', 0);
  }

  // -----------------
  // PLAYER TEMPERATURE CALCULATION
  // -----------------
  // Start with outdoor temperature as base
  let targetTemp = gameState.temperature;

  // Check if player is under tree shade
  const tempPlayerBounds = gameState.player.getBounds();
  const tempTrunkBounds = gameState.treeTrunk.getBounds();
  const underTree = Phaser.Geom.Intersects.RectangleToRectangle(tempPlayerBounds, tempTrunkBounds);

  // Check if player is under any shelter
  let underShelter = false;
  if (gameState.shelters && gameState.shelters.length > 0) {
    for (const shelter of gameState.shelters) {
      if (shelter.active && Phaser.Geom.Intersects.RectangleToRectangle(tempPlayerBounds, shelter.getBounds())) {
        underShelter = true;
        break;
      }
    }
  }

  // Apply shade effect: -5 degrees (from tree or shelter)
  if (underTree || underShelter) {
    targetTemp -= 5;
  }

  // Initialize fire burn timer if not exists
  if (!gameState.lastFireBurnTime) {
    gameState.lastFireBurnTime = Date.now();
  }

  // Check if player is touching fire (within player width = 64px)
  let touchingFireBurn = false;
  if (touchingFire && closestFireDistance < playerBodyLength) {
    touchingFireBurn = true;
    const now = Date.now();
    // Add +5°F every 1000ms when touching fire
    if (now - gameState.lastFireBurnTime >= 1000) {
      gameState.playerTemp = Math.min(gameState.playerTemp + 5, 100);
      gameState.lastFireBurnTime = now;
    }
    // Use current accumulated temperature as the target
    targetTemp = gameState.playerTemp;
  } else {
    // Reset burn timer when not touching fire
    gameState.lastFireBurnTime = Date.now();

    // Check if player is near fire (more than 1 width away but no more than 2 widths away)
    let nearFireBonus = 0;
    if (gameState.nearFire && closestFireDistance < playerBodyLength * 2) {
      const distanceInWidths = closestFireDistance / playerBodyLength;
      // If between 1 and 2 widths away: +7 degrees
      if (distanceInWidths > 1 && distanceInWidths <= 2) {
        nearFireBonus = 7;
      }
    }

    // Apply fire effect: +7 degrees (can stack with shade)
    targetTemp += nearFireBonus;

    // Adjust player temperature toward target instantly when not burning
    gameState.playerTemp = targetTemp;
  }

  // Clamp temperature to survivable range
  if (gameState.playerTemp < 50) gameState.playerTemp = 50;
  if (gameState.playerTemp > 120) gameState.playerTemp = 120;

  // -----------------
  // HEALTH DAMAGE FROM TEMPERATURE
  // -----------------
  if (gameState.playerTemp < 55) {
    // Freezing damage
    gameState.health -= deltaTime * 1;
  } else if (gameState.playerTemp > 95) {
    // Heat damage (scales with temperature) + extra 1 damage per second when melting
    const degreesOver95 = gameState.playerTemp - 95;
    gameState.health -= deltaTime * (degreesOver95 + 1);
  }

  // Clamp health
  if (gameState.health <= 0) {
    gameState.health = 0;

    
      

    // Show Game Over screen
    if (!gameState.gameOver) {
      gameState.gameOver = true;

      // Stop background music
      if (gameState.backgroundMusic && gameState.backgroundMusic.isPlaying) {
        gameState.backgroundMusic.stop();
      }

      // If climbing, exit climbing state and let player fall
      if (gameState.isClimbing) {
        gameState.isClimbing = false;
        if (gameState.player.body) {
          gameState.player.body.setAllowGravity(true);
        }
      }

      // Set death texture and stop animations
      gameState.player.setTexture('dead_player');
      if (gameState.player.anims) {
        gameState.player.anims.stop();
      }

      // Play death scream
      const deathScream = this.sound.add('death_scream');
      deathScream.play();
      
      // Wait for death scream to finish, then show game over UI
      deathScream.once('complete', () => {
        // Start end music
        gameState.endMusic = this.sound.add('end_music', { loop: true, volume: 0.5 });
        gameState.endMusic.play();

        // Pause game physics after falling
        this.physics.pause();

        // Hide all gameplay UI elements
        if (gameState.levelText) gameState.levelText.setVisible(false);
      if (gameState.timeText) gameState.timeText.setVisible(false);
      if (gameState.tempText) gameState.tempText.setVisible(false);
      if (gameState.dayText) gameState.dayText.setVisible(false);
      if (gameState.stickIcon) gameState.stickIcon.setVisible(false);
      if (gameState.stickText) gameState.stickText.setVisible(false);
      if (gameState.waterIcon) gameState.waterIcon.setVisible(false);
      if (gameState.waterText) gameState.waterText.setVisible(false);
      if (gameState.berryIcon) gameState.berryIcon.setVisible(false);
      if (gameState.berryText) gameState.berryText.setVisible(false);
      if (gameState.healthBarBg) gameState.healthBarBg.setVisible(false);
      if (gameState.healthBar) gameState.healthBar.setVisible(false);
      if (gameState.healthBarBorder) gameState.healthBarBorder.setVisible(false);
      if (gameState.healthText) gameState.healthText.setVisible(false);
      if (gameState.playerTempBg) gameState.playerTempBg.setVisible(false);
      if (gameState.playerTempText) gameState.playerTempText.setVisible(false);
      if (gameState.tempStatusMessage) gameState.tempStatusMessage.setVisible(false);
      if (gameState.infoText) gameState.infoText.setVisible(false);
      if (gameState.infoTextCheck) gameState.infoTextCheck.setVisible(false);
      if (gameState.infoTextX) gameState.infoTextX.setVisible(false);
      if (gameState.bButton) gameState.bButton.setVisible(false);
      if (gameState.buildMenuText) gameState.buildMenuText.setVisible(false);
      if (gameState.scoreText) gameState.scoreText.setVisible(false);
      if (gameState.quitButton) gameState.quitButton.setVisible(false);
      if (gameState.musicPlayPauseButton) gameState.musicPlayPauseButton.setVisible(false);
      if (gameState.volumeButton) gameState.volumeButton.setVisible(false);
      if (gameState.checkButton) gameState.checkButton.setVisible(false);
      if (gameState.xButton) gameState.xButton.setVisible(false);
      if (gameState.placementItem) gameState.placementItem.setVisible(false);
      if (gameState.placementArrowLeft) gameState.placementArrowLeft.setVisible(false);
      if (gameState.placementArrowRight) gameState.placementArrowRight.setVisible(false);
      if (gameState.placementArrowUp) gameState.placementArrowUp.setVisible(false);
      if (gameState.buildFireIcon) gameState.buildFireIcon.setVisible(false);
      if (gameState.buildBucketIcon) gameState.buildBucketIcon.setVisible(false);
      if (gameState.buildShelterIcon) gameState.buildShelterIcon.setVisible(false);
      if (gameState.buildLabel) gameState.buildLabel.setVisible(false);

      // Hide bucket fill percentage texts
      if (gameState.buckets) {
        gameState.buckets.forEach(bucket => {
          const fillText = bucket.getData('fillText');
          if (fillText) fillText.setVisible(false);
        });
      }

      // Check if this score would make it into the visible top 10 or bottom 10
      const allScores = loadHighScores();
      
      // Check if score makes top 10
      const isNewHighScore = allScores.length < 10 || gameState.score > allScores[9].score;
      
      // Check if score makes bottom 10 (only if there are more than 10 scores)
      let isNewLowScore = false;
      if (allScores.length >= 10) {
        // Check if it would be in the bottom 10
        const bottomTenThreshold = allScores[allScores.length - 10].score;
        isNewLowScore = gameState.score < bottomTenThreshold || allScores.length < 20;
      }

      // Create dark overlay
      const overlay = this.add.rectangle(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2,
        this.cameras.main.width,
        this.cameras.main.height,
        0x000000,
        0.7
      ).setDepth(10000);
      
      //Score Text
      gameState.finalScoreText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 - 185,
        `${gameState.score} Points`,
        { fontSize: '64px', fill: '#000000', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 6 }
      ).setOrigin(0.5).setDepth(10001);

      // Calculate player rank for display (add temporary entry to get rank)
      const tempScores = [...allScores, { name: 'temp', score: gameState.score }];
      tempScores.sort((a, b) => b.score - a.score);
      const playerRank = tempScores.findIndex(s => s.name === 'temp' && s.score === gameState.score) + 1;
      const totalPlayers = tempScores.length;

      // Show rank text above score
      const rankText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 - 320,
        `${playerRank} / ${totalPlayers}`,
        { fontSize: '32px', fill: '#FF6B6B', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }
      ).setOrigin(0.5).setDepth(10001);

      // Score indicator based on high/low score status
      let highScoreText = null;
      if (isNewHighScore && isNewLowScore) {
        highScoreText = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 - 275,
          '🏆 NEW HIGH AND LOW SCORE! 🏆',
          { fontSize: '32px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(10001);
      } else if (isNewHighScore) {
        highScoreText = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 - 275,
          '🏆 NEW HIGH SCORE! 🏆',
          { fontSize: '32px', fill: '#FFD700', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(10001);
      } else if (isNewLowScore) {
        highScoreText = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 - 275,
          '💀 NEW LOW SCORE! 💀',
          { fontSize: '32px', fill: '#FF6B6B', fontStyle: 'bold', stroke: '#000000', strokeThickness: 4 }
        ).setOrigin(0.5).setDepth(10001);
      }

      // Display high scores list (left side) - top 10 from the main list
      const highScores = loadHighScores();
      const leftColumnX = this.cameras.main.width / 6;
      const highScoreStartY = (this.cameras.main.height / 2 - 275);
      let highScoreListY = highScoreStartY;
      const highScoreListTexts = [];
      
      const titleText = this.add.text(
        leftColumnX,
        highScoreListY,
        'HIGH SCORES',
        { fontSize: '24px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
      ).setOrigin(0.5).setDepth(10001);
      highScoreListTexts.push(titleText);
      
      highScoreListY += 35;
      
      // Create list with placeholder if player makes high score
      const displayList = [...highScores];
      if (isNewHighScore) {
        displayList.push({ name: 'Your Name', score: gameState.score, isPlaceholder: true });
        displayList.sort((a, b) => b.score - a.score);
      }
      
      // Show top 10 (highest to lowest)
      displayList.slice(0, 10).forEach((entry, index) => {
        const scoreEntry = this.add.text(
          leftColumnX,
          highScoreListY + (index * 25),
          `${index + 1}. ${entry.name.substring(0, 15)} - ${entry.score}`,
          { 
            fontSize: '18px', 
            fill: entry.isPlaceholder ? '#FFD700' : '#ffffff', 
            fontStyle: 'bold', 
            stroke: '#000000', 
            strokeThickness: 2 
          }
        ).setOrigin(0.5).setDepth(10001);
        highScoreListTexts.push(scoreEntry);
        
        // Store reference to placeholder for updates
        if (entry.isPlaceholder) {
          gameState.highScorePlaceholder = scoreEntry;
          gameState.highScorePlaceholderRank = index + 1;
        }
      });

      // Display low scores list (right side) - bottom 10 from the same list (reversed)
      const rightColumnX = this.cameras.main.width - (this.cameras.main.width / 6);
      const lowScoreStartY = (this.cameras.main.height / 2 - 275);
      let lowScoreListY = lowScoreStartY;
      const lowScoreListTexts = [];
      
      const lowTitleText = this.add.text(
        rightColumnX,
        lowScoreListY,
        'LOW SCORES',
        { fontSize: '24px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
      ).setOrigin(0.5).setDepth(10001);
      lowScoreListTexts.push(lowTitleText);
      
      lowScoreListY += 35;
      
      // Create list with placeholder if player makes low score
      const displayListForLow = [...highScores];
      if (isNewLowScore) {
        displayListForLow.push({ name: 'Your Name', score: gameState.score, isPlaceholder: true });
        displayListForLow.sort((a, b) => b.score - a.score);
      }
      
      // Get bottom 10 entries (or all if less than 10), reversed to show lowest first
      const bottomScores = displayListForLow.slice(-10).reverse();
        
      bottomScores.forEach((entry, index) => {
        const actualRank = displayListForLow.length - index; // Count from the bottom
        const scoreEntry = this.add.text(
          rightColumnX,
          lowScoreListY + (index * 25),
          `${actualRank}. ${entry.name.substring(0, 15)} - ${entry.score}`,
          { 
            fontSize: '18px', 
            fill: entry.isPlaceholder ? '#FF6B6B' : '#ffffff', 
            fontStyle: 'bold', 
            stroke: '#000000', 
            strokeThickness: 2 
          }
        ).setOrigin(0.5).setDepth(10001);
        lowScoreListTexts.push(scoreEntry);
        
        // Store reference to placeholder for updates
        if (entry.isPlaceholder) {
          gameState.lowScorePlaceholder = scoreEntry;
          gameState.lowScorePlaceholderRank = actualRank;
        }
      });

      // Game Over text
      const gameOverText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 ,
        'GAME OVER',
        {
          fontSize: '64px',
          fill: '#ffffffff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 6
        }
      ).setOrigin(0.5).setDepth(10001);

      // Name input setup if high score
      let nameInputBox = null;
      let nameInputText = null;
      let submitButton = null;
      let submitButtonBg = null;
      let submitButtonText = null;
      let playerName = '';

      // Always show name input - everyone can submit their score
      // Name prompt
      const namePrompt = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 + 190,
          'Enter your name:',
          { fontSize: '24px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
        ).setOrigin(0.5).setDepth(10001);

        // Input box background
        nameInputBox = this.add.rectangle(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 + 230,
          300,
          40,
          0xffffff
        ).setDepth(10001);

        // Input text display
        nameInputText = this.add.text(
          this.cameras.main.width / 2,
          this.cameras.main.height / 2 + 230,
          '_',
          { fontSize: '28px', fill: '#000000', fontStyle: 'bold' }
        ).setOrigin(0.5).setDepth(10002);

        // Submit button
        submitButtonBg = this.add.rectangle(
          this.cameras.main.width / 2 - 80,
          this.cameras.main.height / 2 + 280,
          150,
          45,
          0x00aa00
        ).setDepth(10001).setInteractive({ useHandCursor: true });

        submitButtonText = this.add.text(
          this.cameras.main.width / 2 - 80,
          this.cameras.main.height / 2 + 280,
          'Submit',
          { fontSize: '24px', fill: '#ffffff', fontStyle: 'bold' }
        ).setOrigin(0.5).setDepth(10002);

        // Skip button
        const skipButtonBg = this.add.rectangle(
          this.cameras.main.width / 2 + 80,
          this.cameras.main.height / 2 + 280,
          150,
          45,
          0x808080
        ).setDepth(10001).setInteractive({ useHandCursor: true });

        const skipButtonText = this.add.text(
          this.cameras.main.width / 2 + 80,
          this.cameras.main.height / 2 + 280,
          'Skip',
          { fontSize: '24px', fill: '#ffffff', fontStyle: 'bold' }
        ).setOrigin(0.5).setDepth(10002);

        // Skip button hover effects
        skipButtonBg.on('pointerover', () => {
          skipButtonBg.setFillStyle(0xa0a0a0);
        });

        skipButtonBg.on('pointerout', () => {
          skipButtonBg.setFillStyle(0x808080);
        });

        // Skip button click - just show Try Again button without submitting
        skipButtonBg.on('pointerdown', () => {
          if (!gameState.nameSubmitted) {
            gameState.nameSubmitted = true;
            
            // Remove placeholders from lists
            if (gameState.highScorePlaceholder) {
              gameState.highScorePlaceholder.destroy();
              gameState.highScorePlaceholder = null;
            }
            if (gameState.lowScorePlaceholder) {
              gameState.lowScorePlaceholder.destroy();
              gameState.lowScorePlaceholder = null;
            }
            
            // Hide name input elements
            namePrompt.destroy();
            nameInputBox.destroy();
            nameInputText.destroy();
            submitButtonBg.destroy();
            submitButtonText.destroy();
            skipButtonBg.destroy();
            skipButtonText.destroy();
            
            // Show Try Again button without updating high scores
            showTryAgainButton();
          }
        });

        // Keyboard input handler
        this.input.keyboard.on('keydown', function(event) {
          if (!gameState.gameOver || gameState.nameSubmitted) return;
          
          if (event.key === 'Backspace' && playerName.length > 0) {
            playerName = playerName.slice(0, -1);
            nameInputText.setText(playerName || '_');
          } else if (event.key === 'Enter' && playerName.length > 0) {
            submitScore();
          } else if (event.key.length === 1 && playerName.length < 15) {
            playerName += event.key;
            nameInputText.setText(playerName);
          }
          
          // Update placeholders in real-time
          const displayName = playerName || 'Your Name';
          if (gameState.highScorePlaceholder) {
            gameState.highScorePlaceholder.setText(
              `${gameState.highScorePlaceholderRank}. ${displayName.substring(0, 15)} - ${gameState.score}`
            );
          }
          if (gameState.lowScorePlaceholder) {
            gameState.lowScorePlaceholder.setText(
              `${gameState.lowScorePlaceholderRank}. ${displayName.substring(0, 15)} - ${gameState.score}`
            );
          }
        });

        const submitScore = () => {
          if (playerName.length > 0 && !gameState.nameSubmitted) {
            gameState.nameSubmitted = true;
            
            // Add to the main scores list
            addHighScore(playerName, gameState.score);
            
            // Hide name input elements
            namePrompt.destroy();
            nameInputBox.destroy();
            nameInputText.destroy();
            submitButtonBg.destroy();
            submitButtonText.destroy();
            skipButtonBg.destroy();
            skipButtonText.destroy();
            
            // Update high scores display (top 10)
            const updatedScores = loadHighScores();
            highScoreListTexts.forEach(t => t.destroy());
            
            const leftColumnX = this.cameras.main.width / 6;
            const highScoreStartY = (this.cameras.main.height / 2 - 275);
            let listY = highScoreStartY;
            const titleText = this.add.text(
              leftColumnX,
              listY,
              'HIGH SCORES',
              { fontSize: '24px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
            ).setOrigin(0.5).setDepth(10001);
            
            listY += 35;
            
            // Show top 10 scores
            updatedScores.slice(0, 10).forEach((entry, index) => {
              const scoreEntry = this.add.text(
                leftColumnX,
                listY + (index * 25),
                `${index + 1}. ${entry.name.substring(0, 15)} - ${entry.score}`,
                { 
                  fontSize: '18px', 
                  fill: (entry.score === gameState.score && entry.name === playerName) ? '#FFD700' : '#ffffff', 
                  fontStyle: 'bold', 
                  stroke: '#000000', 
                  strokeThickness: 2 
                }
              ).setOrigin(0.5).setDepth(10001);
              
              gameState.gameOverUI.highScoreListTexts.push(scoreEntry);
            });
            
            gameState.gameOverUI.highScoreListTexts.push(titleText);
            
            // Update low scores display (bottom 10 from same list, reversed)
            lowScoreListTexts.forEach(t => t.destroy());
            
            const rightColumnX = this.cameras.main.width - (this.cameras.main.width / 6);
            const lowScoreStartY = (this.cameras.main.height / 2 - 275);
            let lowListY = lowScoreStartY;
            const lowTitleText = this.add.text(
              rightColumnX,
              lowListY,
              'LOW SCORES',
              { fontSize: '24px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
            ).setOrigin(0.5).setDepth(10001);
            
            lowListY += 35;
            
            // Get bottom 10 entries (or all if less than 10), reversed to show lowest first
            const bottomScores = updatedScores.slice(-10).reverse();
            
            bottomScores.forEach((entry, index) => {
              const actualRank = updatedScores.length - index; // Count from the bottom
              const scoreEntry = this.add.text(
                rightColumnX,
                lowListY + (index * 25),
                `${actualRank}. ${entry.name.substring(0, 15)} - ${entry.score}`,
                { 
                  fontSize: '18px', 
                  fill: (entry.score === gameState.score && entry.name === playerName) ? '#FF6B6B' : '#ffffff', 
                  fontStyle: 'bold', 
                  stroke: '#000000', 
                  strokeThickness: 2 
                }
              ).setOrigin(0.5).setDepth(10001);
              
              gameState.gameOverUI.lowScoreListTexts.push(scoreEntry);
            });
            
            gameState.gameOverUI.lowScoreListTexts.push(lowTitleText);
            
            // Show Try Again button
            showTryAgainButton();
          }
        };

        submitButtonBg.on('pointerdown', submitScore);
        
        gameState.gameOverUI = {
          overlay,
          finalScoreText: gameState.finalScoreText,
          highScoreText,
          gameOverText,
          namePrompt,
          nameInputBox,
          nameInputText,
          submitButtonBg,
          submitButtonText,
          highScoreListTexts,
          lowScoreListTexts
        };

      const showTryAgainButton = () => {
        const buttonWidth = 200;
        const buttonHeight = 60;
        const buttonX = this.cameras.main.width / 2;
        const buttonY = this.cameras.main.height / 2 + 260;

        const buttonBg = this.add.rectangle(
          buttonX,
          buttonY,
          buttonWidth,
          buttonHeight,
          0x808080
        ).setDepth(10001).setInteractive();

        // Button stroke
        const buttonStroke = this.add.graphics();
        buttonStroke.lineStyle(4, 0x000000, 1);
        buttonStroke.strokeRect(
          buttonX - buttonWidth / 2,
          buttonY - buttonHeight / 2,
          buttonWidth,
          buttonHeight
        );
        buttonStroke.setDepth(10002);

        // Try Again text
        const buttonText = this.add.text(
          buttonX,
          buttonY,
          'Try Again',
          {
            fontSize: '32px',
            fill: '#000000',
            fontStyle: 'bold'
          }
        ).setOrigin(0.5).setDepth(10003);

        // Add button to gameOverUI
        gameState.gameOverUI.buttonBg = buttonBg;
        gameState.gameOverUI.buttonStroke = buttonStroke;
        gameState.gameOverUI.buttonText = buttonText;

        // Button hover effects
        buttonBg.on('pointerover', () => {
          buttonBg.setFillStyle(0xa0a0a0);
        });

        buttonBg.on('pointerout', () => {
          buttonBg.setFillStyle(0x808080);
        });

        // Button click - restart game
        buttonBg.on('pointerdown', () => {
          // Stop all sounds before restarting
          this.sound.stopAll();
          this.scene.restart();
        });

        // Main Menu button (below Try Again)
        const menuButtonY = buttonY + 80;
        const menuButtonBg = this.add.rectangle(
          buttonX,
          menuButtonY,
          buttonWidth,
          buttonHeight,
          0x404040
        ).setDepth(10001).setInteractive({ useHandCursor: true });

        const menuButtonStroke = this.add.graphics();
        menuButtonStroke.lineStyle(4, 0x000000, 1);
        menuButtonStroke.strokeRect(
          buttonX - buttonWidth / 2,
          menuButtonY - buttonHeight / 2,
          buttonWidth,
          buttonHeight
        );
        menuButtonStroke.setDepth(10002);

        const menuButtonText = this.add.text(
          buttonX,
          menuButtonY,
          'Main Menu',
          {
            fontSize: '24px',
            fill: '#ffffff',
            fontStyle: 'bold'
          }
        ).setOrigin(0.5).setDepth(10003);

        // Menu button hover effects
        menuButtonBg.on('pointerover', () => {
          menuButtonBg.setFillStyle(0x606060);
        });

        menuButtonBg.on('pointerout', () => {
          menuButtonBg.setFillStyle(0x404040);
        });

        // Menu button click - go to main menu
        menuButtonBg.on('pointerdown', () => {
          this.sound.stopAll();
          this.scene.start('StartMenu');
        });

        // Add menu button to gameOverUI
        gameState.gameOverUI.menuButtonBg = menuButtonBg;
        gameState.gameOverUI.menuButtonStroke = menuButtonStroke;
        gameState.gameOverUI.menuButtonText = menuButtonText;
      };

      // Store references for cleanup (will be updated if showTryAgainButton is called)
      if (!isNewHighScore) {
        // Already shown, nothing more to track
      }
});
    }
    
  }
  if (gameState.health > gameState.maxHealth) gameState.health = gameState.maxHealth;

  // Update player temperature status text
  let tempStatus, tempColor;
  if (gameState.playerTemp >= 95) {
    tempStatus = 'Melting';
    tempColor = '#ff0000';
    gameState.isMelting = true;
  } else if (gameState.playerTemp <= 55) {
    tempStatus = 'Freezing';
    tempColor = '#0044ff';
    gameState.isMelting = false;
  } else {
    tempStatus = 'Comfortable';
    tempColor = '#00aa00';
    gameState.isMelting = false;
  }
  gameState.playerTempText.setText(tempStatus);
  gameState.playerTempText.setColor(tempColor);

  // Update health bar visuals
  const centerX = this.cameras.main.width / 2;
  const healthBarX = centerX - 75; // Centered position
  const healthBarY = 50; // Below level text
  const healthBarWidth = 150;
  const healthBarHeight = 20;
  const healthPercent = gameState.health / gameState.maxHealth;

  // Clear and redraw health bar
  gameState.healthBar.clear();

  // Color gradient based on health (pastel green -> yellow -> red)
  let healthColor;
  if (healthPercent > 0.6) {
    healthColor = 0x90ee90; // Pastel green
  } else if (healthPercent > 0.3) {
    healthColor = 0xffff00; // Yellow
  } else {
    healthColor = 0xff0000; // Red
  }

  gameState.healthBar.fillStyle(healthColor, 1);
  gameState.healthBar.fillRect(healthBarX, healthBarY, healthBarWidth * healthPercent, healthBarHeight);

  // Update health text
  gameState.healthText.setText(`${Math.round(gameState.health)}/${gameState.maxHealth}`);

  // Sky color transitions based on time
  let skyColor;
  if (hourOfDay >= 6 && hourOfDay < 7) { // 6-7 AM: Sunrise (dark blue to orange)
    const t = (hourOfDay - 6);
    skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x1a1a3e), // Dark blue
      Phaser.Display.Color.ValueToColor(0xff8c42), // Orange
      1, t
    );
  } else if (hourOfDay >= 7 && hourOfDay < 9) { // 7-9 AM: Morning (orange to blue)
    const t = (hourOfDay - 7) / 2;
    skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xff8c42), // Orange
      Phaser.Display.Color.ValueToColor(0x87ceeb), // Sky blue
      1, t
    );
  } else if (hourOfDay >= 9 && hourOfDay < 18) { // 9 AM - 6 PM: Day (blue)
    skyColor = Phaser.Display.Color.ValueToColor(0x87ceeb);
  } else if (hourOfDay >= 18 && hourOfDay < 19) { // 6-7 PM: Sunset (blue to red to purple)
    const t = (hourOfDay - 18);
    // Blend through sunset colors in one hour
    if (t < 0.5) {
      // First half: blue to red
      skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0x87ceeb), // Sky blue
        Phaser.Display.Color.ValueToColor(0xff6b6b), // Red
        1, t * 2
      );
    } else {
      // Second half: red to purple
      skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.ValueToColor(0xff6b6b), // Red
        Phaser.Display.Color.ValueToColor(0x9b59b6), // Purple
        1, (t - 0.5) * 2
      );
    }
  } else if (hourOfDay >= 19 && hourOfDay < 21) { // 7-9 PM: Twilight (purple to dark purple)
    const t = (hourOfDay - 19) / 2;
    skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x9b59b6), // Purple
      Phaser.Display.Color.ValueToColor(0x2c1a4d), // Dark purple
      1, t
    );
  } else if (hourOfDay >= 21 || hourOfDay < 5) { // 9 PM - 5 AM: Night (dark purple)
    skyColor = Phaser.Display.Color.ValueToColor(0x2c1a4d);
  } else if (hourOfDay >= 5 && hourOfDay < 6) { // 5-6 AM: Pre-dawn (dark purple to dark blue)
    const t = (hourOfDay - 5);
    skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x2c1a4d), // Dark purple
      Phaser.Display.Color.ValueToColor(0x1a1a3e), // Dark blue
      1, t
    );
  }

  // Get screen dimensions
  const screenWidth = this.cameras.main.width;
  const screenHeight = this.cameras.main.height;

  if (skyColor) {
    this.cameras.main.setBackgroundColor(Phaser.Display.Color.GetColor(skyColor.r, skyColor.g, skyColor.b));

    // Draw horizon gradient - distant land behind tree
    gameState.horizon.clear();
    const horizonHeight = 300; // Height of distant land
    const grassY = screenHeight - (36 * 2) - 35; // Where grass starts
    const horizonY = grassY - horizonHeight + 1; // Start horizon 1px higher to avoid visible line

    // Create gradient from sky color to ground color (gives depth)
    for (let i = 0; i < horizonHeight; i++) {
      const progress = i / horizonHeight;
      // Blend from sky color to earth/grass tones
      const earthColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        skyColor,
        Phaser.Display.Color.ValueToColor(0x5a6b3a), // Olive/grass earth tone
        horizonHeight, i
      );
      const color = Phaser.Display.Color.GetColor(earthColor.r, earthColor.g, earthColor.b);
      gameState.horizon.fillStyle(color, 1);
      gameState.horizon.fillRect(0, horizonY + i, screenWidth, 1);
    }
  }

  // Sun and Moon positioning (arc across sky)

  if (hourOfDay >= 7 && hourOfDay < 19) { // Daytime: show sun
    gameState.sun.setVisible(true);
    gameState.moon.setVisible(false);

    // Sun moves from left to right over 12 hours (6 AM to 6 PM)
    const sunProgress = (hourOfDay - 7) / 12; // 0 to 1
    const sunX = screenWidth * sunProgress;
    const sunY = screenHeight * 0.2 - Math.sin(sunProgress * Math.PI) * screenHeight * 0.15; // Arc motion
    gameState.sun.setPosition(sunX, sunY);
  } else { // Nighttime: show moon
    gameState.sun.setVisible(false);
    gameState.moon.setVisible(true);

    // Moon moves from left to right over 12 hours (6 PM to 6 AM)
    let moonProgress;
    if (hourOfDay >= 19) {
      moonProgress = (hourOfDay - 19) / 12;
    } else {
      moonProgress = (hourOfDay + 5) / 12;
    }
    const moonX = screenWidth * moonProgress;
    const moonY = screenHeight * 0.2 - Math.sin(moonProgress * Math.PI) * screenHeight * 0.15; // Arc motion
    gameState.moon.setPosition(moonX, moonY);
  }

  // Check if player is overlapping with tree trunk using bounds
  const playerBounds = gameState.player.getBounds();
  const trunkBounds = gameState.treeTrunk.getBounds();
  const onTree = Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, trunkBounds);

  // Calculate overlap percentage (based on player width)
  let overlapPercent = 0;
  if (onTree) {
    const overlapLeft = Math.max(playerBounds.x, trunkBounds.x);
    const overlapRight = Math.min(playerBounds.right, trunkBounds.right);
    const overlapWidth = overlapRight - overlapLeft;
    overlapPercent = overlapWidth / playerBounds.width;
  }

  // Start climbing when at least 50% overlapping and pressing up
  if (overlapPercent >= 0.75 && (gameState.cursors.up.isDown || gameState.wKey.isDown) && !gameState.isClimbing && !gameState.buildMode && !gameState.pickingBerry) {
    gameState.isClimbing = true;
    // Snap player to center of tree trunk
    gameState.player.x = gameState.treeTrunk.x;
    gameState.player.setVelocityX(0); // Stop horizontal movement
    gameState.player.setVelocityY(0); // Reset any existing velocity (e.g., from berry picking)
    // Disable gravity on the player's body while climbing to prevent drift
    if (gameState.player.body) gameState.player.body.setAllowGravity(false);
    gameState.player.setVelocityY(-200); // Start moving up immediately
    gameState.player.anims.play('sawSpin', true); // Start saw animation
    gameState.player.setFlipX(false); // Reset to face forward/left
  }

  // Stop climbing when touching ground
  if (gameState.isClimbing && gameState.player.body.onFloor()) {
    gameState.isClimbing = false;
    gameState.player.anims.stop(); // Stop saw animation
    gameState.player.setTexture('spritesheet', 0); // Reset to default spritesheet and frame
    if (gameState.player.body) gameState.player.body.setAllowGravity(true); // Restore normal gravity
    // Stop saw audio if still playing
    if (gameState.sawAttack && gameState.sawAttack.isPlaying) gameState.sawAttack.stop();
    if (gameState.sawSustainLoop && gameState.sawSustainLoop.isPlaying) gameState.sawSustainLoop.stop();
    if (gameState.climbingSound && gameState.climbingSound.isPlaying) gameState.climbingSound.stop();
    gameState.sawSoundPlaying = false;
  }

  // If player leaves the tree while climbing, stop climbing and audio
  if (gameState.isClimbing && !onTree) {
    gameState.isClimbing = false;
    gameState.player.anims.stop();
    gameState.player.setTexture('spritesheet', 0);
    if (gameState.player.body) gameState.player.body.setAllowGravity(true);
    if (gameState.sawAttack && gameState.sawAttack.isPlaying) gameState.sawAttack.stop();
    if (gameState.sawSustainLoop && gameState.sawSustainLoop.isPlaying) gameState.sawSustainLoop.stop();
    if (gameState.climbingSound && gameState.climbingSound.isPlaying) gameState.climbingSound.stop();
    gameState.sawSoundPlaying = false;
  }

  // Bucket drinking mechanic - drink from bucket when down is pressed near it
  if ((gameState.cursors.down.isDown || gameState.sKey.isDown) && onGroundOrShelter && !gameState.isClimbing && !gameState.buildMode && !gameState.buildMenuOpen) {
    if (!gameState.isDrinkingFromBucket) {
      // Check if player is near any bucket with water
      gameState.buckets.forEach(bucket => {
        const distance = Phaser.Math.Distance.Between(
          gameState.player.x,
          gameState.player.y,
          bucket.x,
          bucket.y
        );
        const fillPercent = bucket.getData('fillPercent') || '0%';
        if (distance < 80) { // Within range of bucket
          
          if (fillPercent > 0) {
            gameState.isDrinkingFromBucket = true;
            
            // Add water to thirst inventory
            gameState.thirst = Math.min(gameState.thirst + fillPercent, gameState.maxThirst);
            gameState.waterText.setText(`${gameState.thirst}`);
            
            // Show +1 animations above player (one per water unit)
            showPlusOne(gameState.scene, gameState.player.x, gameState.player.y, fillPercent);
            
            // Empty the bucket
            bucket.setData('fillPercent', 0);
            bucket.setFrame(0); // Reset to empty sprite
            
            // Update percentage text
            const fillText = bucket.getData('fillText');
            if (fillText) {
              fillText.setText('0%');
            }
            
            // Play gulp sound
            if (gameState.gulpSound) {
              gameState.gulpSound.play();
            }
            
            // Reset flag after a delay
            this.time.delayedCall(500, () => {
              gameState.isDrinkingFromBucket = false;
            });
          }
        }
      });
    }
  }

  // Jump mechanics (only when not climbing, not in build mode, and not in build menu)
  if (!gameState.isClimbing && !gameState.buildMode && !gameState.buildMenuOpen) {
    // Up key - drink water (when on ground or shelter and have water)
    if ((gameState.cursors.up.isDown || gameState.wKey.isDown) && onGroundOrShelter && gameState.waterCollected > 0) {
      // Check if not already drinking (prevent spam)
      if (!gameState.isDrinking) {
        gameState.isDrinking = true;
        gameState.waterCollected--;
        gameState.waterText.setText(`${gameState.waterCollected}`);

        // Calculate new temperature when drinking water
        let newTemp;
        if (gameState.playerTemp >= 95) {
          newTemp = 94;
        } else if (gameState.playerTemp <= 55) {
          newTemp = 56;
        } else {
          newTemp = 75;
        }

        // Re-apply shade and fire modifiers on top of the new base temp
        const tempPlayerBounds = gameState.player.getBounds();
        const tempTrunkBounds = gameState.treeTrunk.getBounds();
        const underTree = Phaser.Geom.Intersects.RectangleToRectangle(tempPlayerBounds, tempTrunkBounds);
        
        // Check if player is under any shelter
        let underShelter = false;
        if (gameState.shelters && gameState.shelters.length > 0) {
          for (const shelter of gameState.shelters) {
            if (shelter.active && Phaser.Geom.Intersects.RectangleToRectangle(tempPlayerBounds, shelter.getBounds())) {
              underShelter = true;
              break;
            }
          }
        }

        if (underTree || underShelter) {
          newTemp -= 5; // Shade effect
        }

        if (gameState.nearFire && closestFireDistance < playerBodyLength * 2) {
          const distanceInWidths = closestFireDistance / playerBodyLength;
          if (distanceInWidths > 1 && distanceInWidths <= 2) {
            newTemp += 7; // Fire effect
          }
        }

        gameState.playerTemp = newTemp;

        gameState.gulpSound.play(); // Play gulp sound when drinking

        // Show temperature stabilized message below temp status
        gameState.tempStatusMessage.setText('Temperature Stabilized');
        gameState.tempStatusMessage.setVisible(!gameState.buildMode && !gameState.buildMenuOpen);
        gameState.scene.time.delayedCall(2000, () => {
          gameState.tempStatusMessage.setVisible(false);
        });

        // Reset drinking flag after short delay
        gameState.scene.time.delayedCall(500, () => {
          gameState.isDrinking = false;
        });
      }
    }

    // Holding space bar - crouch (frame 1) and charge jump
    if (gameState.cursors.space.isDown && onGroundOrShelter && !gameState.spaceHeld && !gameState.isJumping) {
      gameState.spaceHeld = true;
      gameState.isCrouching = true;
      gameState.player.setTexture('spritesheet', 1);
      gameState.jumpChargeStartTime = Date.now(); // Track when charging started

      // Play crouch sound once when starting crouch
      gameState.crouchSound.play();
    }

    // Reset spaceHeld when space released
    if (!gameState.cursors.space.isDown && gameState.spaceHeld) {
      // Stop crouch sound when releasing space
      if (gameState.crouchSound.isPlaying) {
        gameState.crouchSound.stop();
      }
    }

    // Released space bar - initiate jump (with coyote time and jump buffer)
    const canJump = onGroundOrShelter || gameState.coyoteTime > 0;

    if (!gameState.cursors.space.isDown && gameState.spaceHeld && canJump) {
      gameState.spaceHeld = false;
      gameState.isCrouching = false;
      gameState.isJumping = true;
      gameState.hasLeftGround = false;
      gameState.jumpCutApplied = false;
      gameState.jumpStartVelocityX = gameState.player.body.velocity.x;

      // Charged jump logic (as before shelter physics refactor)
      const holdDuration = Date.now() - gameState.jumpChargeStartTime;
      const minJumpVelocity = -200; // Quick tap
      const maxJumpVelocity = -1000; // Max charge
      const maxChargeTime = 300; // 600ms to reach max charge
      const chargeRatio = Math.min(holdDuration / maxChargeTime, 1);
      const jumpVelocity = minJumpVelocity + (maxJumpVelocity - minJumpVelocity) * chargeRatio;
      gameState.player.setVelocityY(jumpVelocity);
      gameState.jumpSound.play();
      gameState.coyoteTime = 0;
      gameState.jumpBufferTime = 0;
    }

    // Jump buffering - store jump input (only when space pressed in air)
    if (gameState.cursors.space.isDown && !onGroundOrShelter && !gameState.isJumping) {
      gameState.jumpBufferTime = 0.15; // 150ms buffer window
    }

    // Execute buffered jump when landing
    if (gameState.jumpBufferTime > 0 && onGroundOrShelter && !gameState.isJumping && !gameState.spaceHeld) {
      gameState.isJumping = true;
      gameState.hasLeftGround = false;
      gameState.jumpCutApplied = false;
      gameState.jumpStartVelocityX = gameState.player.body.velocity.x;
      gameState.player.setVelocityY(-600);
      gameState.jumpBufferTime = 0;
    }

    // Jump animation sequence - runs every frame during jump
    if (gameState.isJumping) {
      if (!onGroundOrShelter) {
        // Player is in air
        gameState.hasLeftGround = true;
        const velocityY = gameState.player.body.velocity.y;

        // Variable jump height - cut jump short if space released early (only once)
        if (velocityY < 0 && !gameState.cursors.space.isDown && !gameState.jumpCutApplied) {
          gameState.player.setVelocityY(velocityY * 0.5); // Cut upward momentum
          gameState.jumpCutApplied = true;
        }

        // Frame 2: Going up (negative velocity)
        if (velocityY < 0) {
          gameState.player.setTexture('spritesheet', 2);
        }
        // Frame 3: Falling down (positive velocity)
        else {
          gameState.player.setTexture('spritesheet', 3);
        }
      } else if (gameState.hasLeftGround && onGroundOrShelter) {
        // Just landed - only trigger if we were in the air (hasLeftGround) AND now touching ground
        gameState.player.setTexture('spritesheet', 4);
        gameState.isJumping = false;
        gameState.isLanding = true;
        gameState.hasLeftGround = false;

        // Landing animation sequence
        gameState.scene.time.delayedCall(200, () => {
          if (!gameState.isClimbing && !gameState.isCrouching && !gameState.isJumping && gameState.isLanding) {
            gameState.player.setTexture('spritesheet', 4);
          }
        });

        gameState.scene.time.delayedCall(350, () => {
          gameState.isLanding = false;
          if (!gameState.isClimbing && !gameState.isCrouching && !gameState.isJumping) {
            gameState.player.setTexture('spritesheet', 0);
          }
        });
      }
    }

    // Update coyote time (grace period after leaving platform or standing on shelter)
    // (onGroundOrShelter already declared and set at top of update loop)
    if (onGroundOrShelter) {
      gameState.coyoteTime = 0.15; // 150ms grace period
    } else if (gameState.coyoteTime > 0) {
      gameState.coyoteTime -= deltaTime;
      if (gameState.coyoteTime < 0) gameState.coyoteTime = 0;
    }

    // Update jump buffer timer
    if (gameState.jumpBufferTime > 0) {
      gameState.jumpBufferTime -= deltaTime;
      if (gameState.jumpBufferTime < 0) gameState.jumpBufferTime = 0;
    }
  }

  // Climbing mechanics
  if (gameState.isClimbing) {
    gameState.player.setVelocityX(0); // Lock horizontal movement while climbing

    // Calculate max climb height (top of tree trunk zone)
    const maxClimbHeight = gameState.treeTrunk.y - (gameState.treeTrunk.height / 2 - 29);
    const atMaxHeight = gameState.player.y <= maxClimbHeight;

    // Calculate bottom third of tree (where player must stay centered)
    const treeBottom = gameState.treeTrunk.y + (gameState.treeTrunk.height / 2);
    const bottomThirdHeight = treeBottom - (gameState.treeTrunk.height / 4);
    const inBottomThird = gameState.player.y >= bottomThirdHeight;

    // Only allow side positioning in top 2/3 of tree when NOT in build menu or build mode
    if (!inBottomThird && !gameState.buildMenuOpen && !gameState.buildMode) {
      // Flip saw sprite and position based on direction while climbing
      if (gameState.cursors.left.isDown || gameState.aKey.isDown) {
        gameState.player.setFlipX(false); // Facing left
        gameState.player.x = gameState.treeTrunk.x - 20; // Offset to left side of trunk
      } else if (gameState.cursors.right.isDown || gameState.dKey.isDown) {
        gameState.player.setFlipX(true); // Facing right
        gameState.player.x = gameState.treeTrunk.x + 20; // Offset to right side of trunk
      }
    } else {
      // In bottom third OR in build menu/mode - force center position
      gameState.player.x = gameState.treeTrunk.x;
    }

    // Branch cutting logic with spacebar
    if (gameState.cursors.space.isDown && !gameState.spacePressed) {
      gameState.spacePressed = true;
      gameState.spaceDownTime = Date.now();

      // Start saw attack sound immediately
      if (!gameState.sawSoundPlaying) {
        gameState.sawAttack.play();
        gameState.sawSoundPlaying = true;

        // Set minimum chainsaw sound duration (2 seconds)
        gameState.chainsawMinDuration = 250;
        gameState.chainsawStartTime = Date.now();
      }
    }

    // Branch cutting logic - runs every frame while space is held
    if (gameState.cursors.space.isDown) {
      const activeBranches = gameState.branches.getChildren().filter(b => b.active && b.body.immovable);

      if (activeBranches.length > 0) {
        // Determine which side player is facing
        const isFacingLeft = !gameState.player.flipX;

        // Find closest branch on the side player is facing
        let closestBranch = null;
        let closestDistance = Infinity;

        activeBranches.forEach(branch => {
          const branchIsLeft = branch.x < gameState.player.x;
          const branchIsRight = branch.x > gameState.player.x;

          // Only consider branches on the side player is facing
          if ((isFacingLeft && branchIsLeft) || (!isFacingLeft && branchIsRight)) {
            const distance = Math.abs(branch.y - gameState.player.y);
            if (distance < closestDistance) {
              closestDistance = distance;
              closestBranch = branch;
            }
          }
        });

        // Cut the branch if close enough
        if (closestBranch && closestDistance < 50) {
          const isGrowing = closestBranch.getData('growing');

          // Cannot cut branches that are still growing
          if (!isGrowing) {
            // Track cutting progress
            if (!closestBranch.getData('beingCut')) {
              closestBranch.setData('beingCut', true);
              closestBranch.setData('lastDamageTime', Date.now() - 1000); // Set to 1 second ago so first hit registers immediately

              // Cancel any existing healing timer
              const healTimer = closestBranch.getData('healTimer');
              if (healTimer) {
                healTimer.remove();
                closestBranch.setData('healTimer', null);
              }
            }

            // Check how long since last damage
            const currentTime = Date.now();
            const lastDamageTime = closestBranch.getData('lastDamageTime');
            const timeSinceLastDamage = (currentTime - lastDamageTime) / 1000; // in seconds
            const holdInterval = 0.35; // Time between damage ticks (seconds)
            let branchHealth = closestBranch.getData('health');
            if (branchHealth === undefined || branchHealth === null) {
              branchHealth = 3;
              closestBranch.setData('health', 3);
            }

            // Reduce health every holdInterval seconds while holding space
            if (timeSinceLastDamage >= holdInterval && branchHealth > 0) {
              branchHealth = branchHealth - 1;
              closestBranch.setData('health', branchHealth);
              closestBranch.setData('lastDamageTime', currentTime); // Reset timer for next damage tick
            }

            // Update frame based on current health
            if (branchHealth === 3) {
              closestBranch.setFrame(0); // Full health
            } else if (branchHealth === 2) {
              closestBranch.setFrame(1); // First damage
            } else if (branchHealth === 1) {
              closestBranch.setFrame(2); // Second damage
            }

            // Check if branch should fall
            if (branchHealth === 0) {
              // Branch fully cut - make it fall
              closestBranch.setFrame(0); // Reset to full branch frame when it falls
              closestBranch.body.setAllowGravity(true);
              closestBranch.body.setImmovable(false);
              closestBranch.body.setVelocityX(0); // No horizontal movement, just drop
              closestBranch.body.setVelocityY(50); // Give initial downward velocity for immediate fall
              closestBranch.setData('onTree', false); // Mark as cut from tree
              closestBranch.setData('beingCut', false); // Reset cutting flag

              // Schedule regeneration after 10 seconds (individual timer per branch)
              gameState.scene.time.delayedCall(gameState.branchRegenerationDelay * 1000, () => {
                // Attempt to grow a branch
                const attemptGrow = () => {
                  // Count current branches still on tree
                  const branchesOnTree = gameState.branches.getChildren().filter(b =>
                    b.active && b.getData('onTree')
                  ).length;

                  // Only regenerate if below max branches (no global cooldown)
                  if (branchesOnTree < gameState.maxBranches) {
                    const availableHeight = gameState.treeTrunk.height * (2 / 3);
                    const minSpacing = 50;
                    const branchMargin = 20; // Keep branches below trunk top
                    const startY = gameState.treeTrunk.y - (gameState.treeTrunk.height / 2) + branchMargin;

                    // Get positions of existing branches on tree
                    const existingBranches = gameState.branches.getChildren().filter(b =>
                      b.active && b.getData('onTree')
                    );

                    // Try to find a valid position (with proper spacing)
                    let validPosition = false;
                    let randomHeight;
                    let attempts = 0;
                    const maxAttempts = 20;

                    while (!validPosition && attempts < maxAttempts) {
                      randomHeight = startY + Math.random() * availableHeight;
                      validPosition = true;

                      // Check spacing from all existing branches
                      for (const branch of existingBranches) {
                        if (Math.abs(branch.y - randomHeight) < minSpacing) {
                          validPosition = false;
                          break;
                        }
                      }

                      attempts++;
                    }

                    // If random sampling fails, use the midpoint as a fallback
                    if (!validPosition) {
                      randomHeight = startY + availableHeight * 0.5;
                      validPosition = true;
                    }

                    // Only create branch if valid position found
                    if (validPosition) {
                      // Create a brand-new growing branch. It starts partially-grown
                      // and will grow to full health over time. While growing is true
                      // the branch cannot be cut.
                      const newBranch = gameState.branches.create(
                        gameState.treeTrunk.x,
                        randomHeight,
                        'branch',
                        2 // Start with frame 2 (smallest/youngest)
                      ).setScale(1.5).setDepth(300);

                      newBranch.body.setAllowGravity(false);
                      newBranch.body.setImmovable(true);

                      // Start partially grown: health=1 (frame 2). Mark as growing so it
                      // cannot be cut until fully grown.
                      newBranch.setData('health', 1);
                      newBranch.setData('growing', true);
                      newBranch.setData('onTree', true);

                      // Randomly place on left or right
                      if (Math.random() > 0.5) {
                        newBranch.setFlipX(true);
                        newBranch.x += gameState.treeTrunk.width;
                      } else {
                        newBranch.x -= gameState.treeTrunk.width;
                      }

                      // Growth routine: increase health by 1 every second until full
                      const growStep = () => {
                        if (!newBranch || !newBranch.active) return;
                        // If branch fell or was flagged not on tree, stop growing
                        if (!newBranch.getData('onTree')) {
                          newBranch.setData('growing', false);
                          newBranch.setData('growTimer', null);
                          return;
                        }
                        let h = newBranch.getData('health') || 0;
                        h = Math.min(3, h + 1);
                        newBranch.setData('health', h);
                        // Update frame for visual growth
                        if (h === 3) newBranch.setFrame(0);
                        else if (h === 2) newBranch.setFrame(1);
                        else if (h === 1) newBranch.setFrame(2);

                        if (h < 3) {
                          const t = gameState.scene.time.delayedCall(1000, growStep);
                          newBranch.setData('growTimer', t);
                        } else {
                          // Fully grown: allow cutting
                          newBranch.setData('growing', false);
                          newBranch.setData('growTimer', null);
                        }
                      };

                      // Start first growth tick after 1s
                      const t0 = gameState.scene.time.delayedCall(1000, growStep);
                      newBranch.setData('growTimer', t0);
                    }
                  } else if (branchesOnTree < gameState.maxBranches) {
                    // Cooldown not passed yet, try again in 1 second
                    gameState.scene.time.delayedCall(1000, attemptGrow);
                  }
                };

                attemptGrow();
              });
            }
          }
        }
      }
    }

    // Reset spacebar flag when released
    if (!gameState.cursors.space.isDown) {
      if (gameState.spacePressed) {
        // Check if minimum chainsaw duration has passed
        const chainsawDuration = Date.now() - (gameState.chainsawStartTime || 0);

        if (chainsawDuration >= (gameState.chainsawMinDuration || 0)) {
          // Minimum duration met, can stop sound immediately
          gameState.sawAttack.stop();
          gameState.sawSustainLoop.stop();
          gameState.sawSoundPlaying = false;
        } else {
          // Keep sound playing until minimum duration is met
          const remainingTime = (gameState.chainsawMinDuration || 0) - chainsawDuration;
          gameState.scene.time.delayedCall(remainingTime, () => {
            gameState.sawAttack.stop();
            gameState.sawSustainLoop.stop();
            gameState.sawSoundPlaying = false;
          });
        }
      }

      // When the player releases space, mark branches as not being cut.
      // The gradual heal routine will handle scheduling healing.
      gameState.branches.getChildren().forEach(branch => {
        branch.setData('beingCut', false);
      });

      gameState.spacePressed = false;
    }

    // Pause climbing movement when in build mode or build menu
    if (gameState.buildMode || gameState.buildMenuOpen) {
      gameState.player.setVelocityY(0);
      // Stop climbing sound when paused
      if (gameState.climbingSound.isPlaying) {
        gameState.climbingSound.stop();
      }
    } else if ((gameState.cursors.up.isDown || gameState.wKey.isDown) && !atMaxHeight) {
      gameState.player.setVelocityY(-200);
      // Play climbing sound if not already playing
      if (!gameState.climbingSound.isPlaying) {
        gameState.climbingSound.play();
      }
    } else if (gameState.cursors.down.isDown || gameState.sKey.isDown) {
      gameState.player.setVelocityY(200);
      // Play climbing sound if not already playing
      if (!gameState.climbingSound.isPlaying) {
        gameState.climbingSound.play();
      }
    } else {
      gameState.player.setVelocityY(0);
      // Stop climbing sound when not moving
      if (gameState.climbingSound.isPlaying) {
        gameState.climbingSound.stop();
      }
    }

    // Stop player at max height
    if (atMaxHeight && gameState.player.body.velocity.y < 0) {
      gameState.player.setVelocityY(0);
      gameState.player.y = maxClimbHeight;
    }
  }
  // Note: Removed manual gravity application here - Phaser's built-in gravity handles falling

  // Horizontal movement (allow when not climbing OR when on floor)
  // During jump: allow air control but at reduced speed
  if (!gameState.isClimbing && !gameState.buildMode && !gameState.buildMenuOpen) {
    if (gameState.isJumping && !gameState.player.body.onFloor()) {
      // Air control during jump - can only adjust in same direction or slow down
      gameState.currentVelocityX = gameState.player.body.velocity.x;

      if (gameState.cursors.left.isDown || gameState.aKey.isDown) {
        if (gameState.currentVelocityX < 0) {
          // Moving left, can speed up
          const targetVelocity = -250;
          if (gameState.currentVelocityX > targetVelocity) {
            gameState.player.setVelocityX(Math.max(gameState.currentVelocityX - 25, targetVelocity));
          }
        } else if (gameState.currentVelocityX > 0) {
          // Moving right, can slow down and reverse
          gameState.player.setVelocityX(Math.max(gameState.currentVelocityX - 25, -250));
        } else {
          // Standing still (velocity is 0), can start moving left
          gameState.player.setVelocityX(Math.max(gameState.currentVelocityX - 50, -250));
        }
        gameState.player.setFlipX(true);
      } else if (gameState.cursors.right.isDown || gameState.dKey.isDown) {
        if (gameState.currentVelocityX > 0) {
          // Moving right, can speed up
          const targetVelocity = 250;
          if (gameState.currentVelocityX < targetVelocity) {
            gameState.player.setVelocityX(Math.min(gameState.currentVelocityX + 25, targetVelocity));
          }
        } else if (gameState.currentVelocityX < 0) {
          // Moving left, can slow down and reverse
          gameState.player.setVelocityX(Math.min(gameState.currentVelocityX + 25, 250));
        } else {
          // Standing still (velocity is 0), can start moving right
          gameState.player.setVelocityX(Math.min(gameState.currentVelocityX + 50, 250));
        }
        gameState.player.setFlipX(false);
      }
      // Else preserve the velocity from jump start
    } else if (!gameState.player.body.onFloor()) {
      // Falling (not jumping, not on floor) - allow full air control
      gameState.currentVelocityX = gameState.player.body.velocity.x;
      const airAcceleration = 35;
      const maxSpeed = 250;

      if (gameState.cursors.left.isDown || gameState.aKey.isDown) {
        const newVelocity = Math.max(gameState.currentVelocityX - airAcceleration, -maxSpeed);
        gameState.player.setVelocityX(newVelocity);
        gameState.player.setFlipX(true);
      } else if (gameState.cursors.right.isDown || gameState.dKey.isDown) {
        const newVelocity = Math.min(gameState.currentVelocityX + airAcceleration, maxSpeed);
        gameState.player.setVelocityX(newVelocity);
        gameState.player.setFlipX(false);
      }
    } else if (gameState.player.body.onFloor()) {
      // Full control on ground with acceleration/deceleration
      gameState.currentVelocityX = gameState.player.body.velocity.x;
      const acceleration = 800; // Speed up quickly for responsive controls
      const deceleration = 600; // Slow down quickly for tight control
      const maxSpeed = 200;

      if ((gameState.cursors.left.isDown || gameState.aKey.isDown) && (gameState.cursors.right.isDown || gameState.dKey.isDown)) {
        // Both keys pressed - move at half speed in the direction of the first key pressed
        // Compare arrow key times, or default to Infinity if not pressed
        const leftArrowTime = gameState.cursors.left.isDown ? gameState.cursors.left.timeDown : Infinity;
        const rightArrowTime = gameState.cursors.right.isDown ? gameState.cursors.right.timeDown : Infinity;
        const aKeyTime = gameState.aKey.isDown ? gameState.aKey.timeDown : Infinity;
        const dKeyTime = gameState.dKey.isDown ? gameState.dKey.timeDown : Infinity;
        
        const leftTime = Math.min(leftArrowTime, aKeyTime);
        const rightTime = Math.min(rightArrowTime, dKeyTime);
        
        if (leftTime < rightTime) {
          gameState.player.setVelocityX(-100);
          gameState.player.setFlipX(true);
        } else {
          gameState.player.setVelocityX(100);
          gameState.player.setFlipX(false);
        }
      } else if (gameState.cursors.left.isDown || gameState.aKey.isDown) {
        // Accelerate left
        const newVelocity = Math.max(gameState.currentVelocityX - acceleration, -maxSpeed);
        gameState.player.setVelocityX(newVelocity);
        gameState.player.setFlipX(true);
      } else if (gameState.cursors.right.isDown || gameState.dKey.isDown) {
        // Accelerate right
        const newVelocity = Math.min(gameState.currentVelocityX + acceleration, maxSpeed);
        gameState.player.setVelocityX(newVelocity);
        gameState.player.setFlipX(false);
      } else {
        // Decelerate to stop
        if (Math.abs(gameState.currentVelocityX) > deceleration) {
          gameState.player.setVelocityX(gameState.currentVelocityX - Math.sign(gameState.currentVelocityX) * deceleration);
        } else {
          gameState.player.setVelocityX(0);
        }
      }
    }
  }
}
}

const config = {
  type: Phaser.AUTO,
  width: w,
  height: h,
  backgroundColor: "b9eaff",
  fps: {
    target: 60,
    forceSetTimeOut: false,
    smoothStep: true,
    min: 10,  // Minimum FPS (maximum deltaTime of 100ms)
    deltaHistory: 10  // Smooth delta over fewer frames for faster stabilization
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 600 },
      enableBody: true,
      debug: false
    }
  },
  scene: [
    StartMenuScene,
    HowToPlayScene,
    GameScene
  ],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: w,
    height: h
  }
};

const game = new Phaser.Game(config);

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
  sticksCollected: 20,
  waterCollected: 0,
  score: 0,

  // Environment
  fires: [],
  nearFire: false,
  fireContactTime: 0,
  temperature: 65,
  gameTime: 6 * 60, // Start at 6:00 AM (in minutes)
  gameDay: 0, // Track current day number
  dayStart: 6 * 60, // Track when current day started (6:00 AM)

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
    gameState.infoText.setText(`Build a ${itemName} `);
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
// PRELOAD ASSETS
// =======================
function preload() {
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

  // Player sprites
  this.load.spritesheet('spritesheet', 'assets/Sprite_Sheet.png', {
    frameWidth: 64,
    frameHeight: 64
  });
  this.load.image('fire_player', 'assets/fire_player.png');

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
}

// =======================
// CREATE SCENE
// =======================
function create() {
  // Reset game state when scene restarts
  gameState.health = 100;
  gameState.maxHealth = 100;
  gameState.hunger = 50;
  gameState.thirst = 50;
  gameState.gameOver = false;
  gameState.gameOverUI = null;
  gameState.sticksCollected = 20;
  gameState.waterCollected = 0;
  gameState.score = 0;
  gameState.gameTime = 6 * 60;
  gameState.gameDay = 0;
  gameState.dayStart = 6 * 60;
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
    const bush = gameState.berryBushes.create(x, y, 'berry_bush', 0).setDepth(215).setScale(1);
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
  const maxRainPerDay = 288; // 4.8 hours (20% of 24h, previously 10%)
  // Precompute all storms for the day
  const scheduleStormsForDay = (dayStart) => {
    let totalRain = 0;
    let storms = [];
    // Start scheduling from current time or beginning of day, whichever is later
    let currentGameTime = gameState.gameTime || (6 * 60); // Default to 6am if not set
    let time = Math.max(dayStart, currentGameTime) + Phaser.Math.Between(10, 60);
    let dayEnd = dayStart + 24 * 60;

    console.log('Scheduling storms for day starting at', dayStart, 'minutes, current time:', currentGameTime);
    console.log('Storm duration min/max:', stormDurationMin, stormDurationMax);
    console.log('Max rain per day:', maxRainPerDay);

    while (totalRain < maxRainPerDay && time < dayEnd) {
      let remainingRain = maxRainPerDay - totalRain;
      // If not enough rain budget left for minimum storm, skip it
      if (remainingRain < stormDurationMin) {
        console.log('Not enough rain budget left:', remainingRain, '< min', stormDurationMin);
        break;
      }

      let maxStorm = Math.min(stormDurationMax, remainingRain);
      let stormLength = Phaser.Math.Between(stormDurationMin, maxStorm);

      // Make sure storm doesn't go past end of day
      if (time + stormLength > dayEnd) {
        console.log('Storm would exceed day boundary, skipping');
        break;
      }

      console.log('Creating storm:', 'start=', time, 'end=', time + stormLength, 'length=', stormLength);
      storms.push({ start: time, end: time + stormLength });
      totalRain += stormLength;
      time += stormLength + Phaser.Math.Between(30, 120); // Gaps between storms
    }
    console.log('Total storms created:', storms.length, 'Total rain minutes:', totalRain);
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
  console.log('Shelter frame count set to:', gameState.shelterFrameCount);
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
  const musicControlsY = this.cameras.main.height / 2;

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
  gameState.volumeButton = this.add.text(musicControlsX, musicControlsY + 30, '🔊', {
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

  // Info text at bottom center (in platform, same level as check/x buttons)
  const placementUIY = this.cameras.main.height - 45;

  gameState.infoText = this.add.text(centerX, placementUIY + 5, '', {
    fontSize: '20px',
    fill: '#ffffff',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5, 0.5).setDepth(300).setVisible(false);

  // Colored check and x for build menu (positioned below infoText)
  gameState.infoTextCheck = this.add.text(centerX - 160, placementUIY + 20, '✓ (Enter) ', {
    fontSize: '20px',
    fill: '#00ff00',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5, 0.5).setDepth(300).setVisible(false);

  gameState.infoTextX = this.add.text(centerX + 180, placementUIY + 20, '✗ (Backspace)', {
    fontSize: '20px',
    fill: '#ff0000',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5, 0.5).setDepth(300).setVisible(false);

  // Placement confirmation buttons (hidden by default, shown during placement)

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
    console.log('CHECK BUTTON CLICKED! buildMode:', gameState.buildMode, 'sticks:', gameState.sticksCollected);
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
      ).setOrigin(0.5).setDepth(250);
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
      console.log('Shelter build block entered');
      console.log('Passed resource check, about to create shelter sprite');
      // Deduct branches
      gameState.sticksCollected -= gameState.buildCosts.shelter;
      gameState.stickText.setText(`${gameState.sticksCollected}`);

      // Create actual shelter at placement position
      const shelter = this.add.sprite(
        gameState.placementItem.x,
        gameState.placementItem.y,
        'shelter', 0
      ).setScale(1).setDepth(210);
      
      console.log('CHECKPOINT 1: Shelter sprite created');

      this.physics.world.enable(shelter);
      console.log('CHECKPOINT 2: Physics enabled');
      shelter.body.setAllowGravity(false);
      shelter.body.setImmovable(true);
      shelter.body.setSize(128, 128, false);
      shelter.body.setOffset(0, 0);
      shelter.body.isCircle = false;
      console.log('CHECKPOINT 3: Body configured');
      console.log('Shelter body size:', shelter.body.width, shelter.body.height);
      console.log('CHECKPOINT 4: About to log shelter position');
      console.log('Shelter sprite position:', shelter.x, shelter.y);
      console.log('CHECKPOINT 5: Logged shelter position');
      
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
      console.log('Shelter shade placed at X:', shelterShadeX, 'Y:', shelterShadeY, 'Width:', shelterShadeW, 'Height:', shelterShadeH, 'Depth:', 205);
      console.log('Shade was placed');
      
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
    if (!gameState.isClimbing && branch.getData('collectable')) {
      branch.destroy();
      // Branches are worth the current level
      gameState.sticksCollected += gameState.level;
      gameState.stickText.setText(`${gameState.sticksCollected}`);
      gameState.pickUpItemSound.play();

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
      console.log('Shelter frame count:', gameState.shelterFrameCount);
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
function update(time, delta) {
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
      console.log('Cycled to frame:', gameState.shelterPreviewFrame, '(of', gameState.shelterFrameCount, 'total)');
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
        console.log("isMelting");
      }

    }

    gameState.lastHungerThirstTick += 1000;

  }




  // --- HUNGER & THIRST UI COLOR ---
  // Determine day/night for UI coloring (night: 6pm-6am)
  const hourOfDayUI = ((gameState.gameTime || 0) % (24 * 60)) / 60;
  // Night when before 6:00 or at/after 18:00
  const isNightUI = (hourOfDayUI < 6) || (hourOfDayUI >= 18);
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
  if ((Phaser.Input.Keyboard.JustDown(gameState.cursors.up) || Phaser.Input.Keyboard.JustDown(gameState.wKey)) && !gameState.buildMode) {
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
    const dayStart = day * 24 * 60;
    gameState.stormSchedule = gameState.scheduleStormsForDay(dayStart);

    gameState.stormIndex = 0;
  }
  // Check if we should start or end a storm based on the schedule
  let nextStorm = gameState.stormSchedule[gameState.stormIndex];
  if (nextStorm && gameState.gameTime >= nextStorm.start && gameState.gameTime < nextStorm.end) {
    if (!gameState.stormActive) {
      gameState.stormActive = true;
      gameState.stormStrength = Math.random();
      gameState.nextStormTime = nextStorm.start;
      gameState.stormEndTime = nextStorm.end;
    }
  } else if (nextStorm && gameState.gameTime >= nextStorm.end) {
    if (gameState.stormActive) {
      gameState.stormActive = false;
      gameState.isRaining = false;
      gameState.stormStrength = 0;
      let rainThisStorm = gameState.stormEndTime - gameState.nextStormTime;
      if (rainThisStorm > 0) gameState.rainMinutesToday += rainThisStorm;
    }
    gameState.stormIndex++;
  }
  // (rest of weather logic unchanged)
  if (gameState.stormActive) {
    const stormTotal = gameState.stormEndTime - gameState.nextStormTime;
    const timeLeft = gameState.stormEndTime - gameState.gameTime;
    // Peter out over the last 3 real seconds (72 in-game minutes at 24 min/sec speed)
    const peterOutDuration = 72; // 3 seconds * 24 minutes/second = 72 minutes
    let petersOut = false;
    if (timeLeft <= peterOutDuration) {
      petersOut = true;
    }
    // Storm is active: smoothly vary strength
    const t = (gameState.gameTime - gameState.nextStormTime) / stormTotal;
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
        bucket.setData('fillPercent', 0);
        const fillText = gameState.scene.add.text(
          bucket.x,
          bucket.y,
          '0%',
          { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
        ).setOrigin(0.5).setDepth(210);
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

        console.log('Shelter body size:', shelter.body.width, shelter.body.height);
        console.log('Shelter sprite position:', shelter.x, shelter.y);

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
        console.log('Shelter trapezoid shade placed at center:', shelter.x, 'Stacked:', isStacked);
        
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
              shelter.y - 64 + 12,
              'platform'
            );
            topPlatform.displayWidth = 128;
            topPlatform.displayHeight = 24;
            topPlatform.setAlpha(0);
            topPlatform.setDepth(9999);
            topPlatform.refreshBody();
          };
          
          const createLeft = () => {
            const leftWall = gameState.shelterPlatforms.create(
              shelter.x - 64 + 12,
              shelter.y,
              'platform'
            );
            leftWall.displayWidth = 24;
            leftWall.displayHeight = 128;
            leftWall.setAlpha(0);
            leftWall.setDepth(9999);
            leftWall.refreshBody();
          };
          
          const createRight = () => {
            const rightWall = gameState.shelterPlatforms.create(
              shelter.x + 64 - 12,
              shelter.y,
              'platform'
            );
            rightWall.displayWidth = 24;
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
              console.log('Shelter frame 0 - top, left, right walls');
              break;
            case 1: // Left, Top
              createLeft();
              createTop();
              console.log('Shelter frame 1 - left, top walls');
              break;
            case 2: // Top, Right
              createTop();
              createRight();
              console.log('Shelter frame 2 - top, right walls');
              break;
            case 3: // Only Top
              createTop();
              console.log('Shelter frame 3 - top only');
              break;
            case 4: // Left, Right
              createLeft();
              createRight();
              console.log('Shelter frame 4 - left, right walls');
              break;
            case 5: // No platforms
              console.log('Shelter frame 5 - no collision');
              break;
            case 6: // Only Left
              createLeft();
              console.log('Shelter frame 6 - left wall only');
              break;
            case 7: // Only Right
              createRight();
              console.log('Shelter frame 7 - right wall only');
              break;
            default:
              // Default to top platform only for any additional frames
              createTop();
              console.log('Shelter frame', shelterFrame, '- default top platform');
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
  // Check raindrop collisions with player (resets temperature)
  gameState.raindrops.getChildren().forEach(raindrop => {
    if (raindrop && raindrop.active) {
      const distanceToPlayer = Phaser.Math.Distance.Between(
        raindrop.x,
        raindrop.y,
        gameState.player.x,
        gameState.player.y
      );

      if (distanceToPlayer < 30) { // Collision with player
        raindrop.destroy();

        // Calculate new temperature when drinking water
        // Apply base temperature change
        let newTemp;
        if (gameState.playerTemp >= 95) {
          newTemp = 94;
        } else if (gameState.playerTemp <= 55) {
          newTemp = 56;
        } else {
          newTemp = gameState.temperature;
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

        // Add 1 to thirst when rain hits player
        gameState.thirst = Math.min(gameState.thirst + 1, gameState.maxThirst);
        gameState.waterText.setText(`${gameState.thirst}`);
        gameState.gulpSound.play(); // Play gulp sound when rain hits player

        // Show temperature stabilized message below temp status
        gameState.tempStatusMessage.setText('Temperature Stabilized');
        gameState.tempStatusMessage.setVisible(true);
        gameState.scene.time.delayedCall(2000, () => {
          gameState.tempStatusMessage.setVisible(false);
        });
      }

      // Check raindrop collision with shelters (destroys rain)
      let raindropDestroyed = false;
      gameState.shelters.forEach(shelter => {
        if (shelter && shelter.active && !raindropDestroyed) {
          const distanceToShelter = Phaser.Math.Distance.Between(
            raindrop.x,
            raindrop.y,
            shelter.x,
            shelter.y
          );

          if (distanceToShelter < 40) { // Collision with shelter
            raindrop.destroy();
            if (gameState.raindrops && gameState.raindrops.contains(raindrop)) {
              gameState.raindrops.remove(raindrop, true, true);
            }
            // If you have a trail/particle effect, stop or destroy it here
            raindropDestroyed = true;
          }
        }
      });

      // Check raindrop collision with fires (puts them out) - only if not already destroyed by shelter
      if (!raindropDestroyed) {
        gameState.fires.forEach(fire => {
          if (fire && fire.active) {
            const distanceToFire = Phaser.Math.Distance.Between(
              raindrop.x,
              raindrop.y,
              fire.x,
              fire.y
            );

            if (distanceToFire < 30) { // Collision with fire
              raindrop.destroy();
              fire.destroy();

              // Play fire out sound if it exists
              if (gameState.fireOutSound) {
                gameState.fireOutSound.play();
              }

              // Remove fire from array
              const fireIndex = gameState.fires.indexOf(fire);
              if (fireIndex > -1) {
                gameState.fires.splice(fireIndex, 1);
              }

              // Stop fire sound if no fires remain
              if (gameState.fires.length === 0) {
                gameState.fireSound.stop();
              }
            }
          }
        });
      }
    }
  });

  // Check raindrop collisions with buckets
  gameState.buckets.forEach(bucket => {
    if (bucket && bucket.active) {
      gameState.raindrops.getChildren().forEach(raindrop => {
        if (raindrop && raindrop.active) {
          // Check if raindrop is within bucket bounds
          const distance = Phaser.Math.Distance.Between(
            raindrop.x,
            raindrop.y,
            bucket.x,
            bucket.y
          );

          if (distance < 30) { // Collision threshold
            raindrop.destroy();
            gameState.waterDropSound.play(); // Play water drop sound when rain hits bucket

            // Add 10 directly to thirst inventory when rain hits bucket
            gameState.thirst = Math.min(gameState.thirst + 10, gameState.maxThirst);
            gameState.waterText.setText(`${gameState.thirst}`);

            // Increase fill percentage for visual feedback
            let fillPercent = bucket.getData('fillPercent') || 0;
            fillPercent = Math.min(fillPercent + 10, 100); // Add 10%, max 100%
            bucket.setData('fillPercent', fillPercent);

            // Update bucket sprite based on fill level (frames 0-4)
            if (fillPercent >= 100) {
              bucket.setFrame(4); // Full bucket (frame 4)
              fillPercent = 0; // Reset for next fill
              bucket.setData('fillPercent', 0);
              bucket.setFrame(0); // Reset to empty (frame 0)
            } else if (fillPercent >= 75) {
              bucket.setFrame(3); // 75% full
            } else if (fillPercent >= 50) {
              bucket.setFrame(2); // 50% full
            } else if (fillPercent >= 25) {
              bucket.setFrame(1); // 25% full
            } else {
              bucket.setFrame(0); // Empty
            }

            // Update percentage text
            const fillText = bucket.getData('fillText');
            if (fillText) {
              fillText.setText(`${fillPercent}%`);
            }
          }
        }
      });
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

      // Pause game physics
      this.physics.pause();

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
        this.cameras.main.height / 2 - 200,
        `${gameState.score} Points`,
        { fontSize: '64px', fill: '#000000', fontStyle: 'bold', stroke: '#ffffff', strokeThickness: 6 }
      ).setOrigin(0.5).setDepth(10001);

      // Game Over text
      const gameOverText = this.add.text(
        this.cameras.main.width / 2,
        this.cameras.main.height / 2 - 50,
        'GAME OVER',
        {
          fontSize: '64px',
          fill: '#ff0000',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 6
        }
      ).setOrigin(0.5).setDepth(10001);

      // Try Again button background
      const buttonWidth = 200;
      const buttonHeight = 60;
      const buttonX = this.cameras.main.width / 2;
      const buttonY = this.cameras.main.height / 2 + 50;

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

      // Store references for cleanup
      gameState.gameOverUI = {
        overlay,
        finalScoreText: gameState.finalScoreText,
        gameOverText,
        buttonBg,
        buttonStroke,
        buttonText
      };

      // Button click handler
      buttonBg.on('pointerdown', () => {
        // Destroy all game over UI elements
        if (gameState.gameOverUI) {
          gameState.gameOverUI.overlay.destroy();
          gameState.gameOverUI.finalScoreText.destroy();
          gameState.gameOverUI.gameOverText.destroy();
          gameState.gameOverUI.buttonBg.destroy();
          gameState.gameOverUI.buttonStroke.destroy();
          gameState.gameOverUI.buttonText.destroy();
          gameState.gameOverUI = null;
        }

        // Reset gameOver flag before restarting
        gameState.gameOver = false;

        // Resume physics before restarting
        this.physics.resume();

        // Restart the scene (this resets all game state)
        this.scene.restart();
      });

      // Button hover effect
      buttonBg.on('pointerover', () => {
        buttonBg.setFillStyle(0x999999);
      });

      buttonBg.on('pointerout', () => {
        buttonBg.setFillStyle(0x808080);
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
  if (hourOfDay >= 5 && hourOfDay < 6) { // 5-6 AM: Sunrise (orange gradient)
    const t = (hourOfDay - 5);
    skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x1a1a3e), // Dark blue
      Phaser.Display.Color.ValueToColor(0xff8c42), // Orange
      1, t
    );
  } else if (hourOfDay >= 6 && hourOfDay < 8) { // 6-8 AM: Morning (orange to blue)
    const t = (hourOfDay - 6) / 2;
    skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xff8c42), // Orange
      Phaser.Display.Color.ValueToColor(0x87ceeb), // Sky blue
      1, t
    );
  } else if (hourOfDay >= 8 && hourOfDay < 17) { // 8 AM - 5 PM: Day (blue)
    skyColor = Phaser.Display.Color.ValueToColor(0x87ceeb);
  } else if (hourOfDay >= 17 && hourOfDay < 18) { // 5-6 PM: Sunset (blue to red)
    const t = (hourOfDay - 17);
    skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x87ceeb), // Sky blue
      Phaser.Display.Color.ValueToColor(0xff6b6b), // Red
      1, t
    );
  } else if (hourOfDay >= 18 && hourOfDay < 19) { // 6-7 PM: Dusk (red to purple)
    const t = (hourOfDay - 18);
    skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0xff6b6b), // Red
      Phaser.Display.Color.ValueToColor(0x9b59b6), // Purple
      1, t
    );
  } else if (hourOfDay >= 19 && hourOfDay < 21) { // 7-9 PM: Twilight (purple to dark purple)
    const t = (hourOfDay - 19) / 2;
    skyColor = Phaser.Display.Color.Interpolate.ColorWithColor(
      Phaser.Display.Color.ValueToColor(0x9b59b6), // Purple
      Phaser.Display.Color.ValueToColor(0x2c1a4d), // Dark purple
      1, t
    );
  } else if (hourOfDay >= 21 || hourOfDay < 4) { // 9 PM - 4 AM: Night (dark purple)
    skyColor = Phaser.Display.Color.ValueToColor(0x2c1a4d);
  } else if (hourOfDay >= 4 && hourOfDay < 5) { // 4-5 AM: Pre-dawn (dark purple to dark blue)
    const t = (hourOfDay - 4);
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

  if (hourOfDay >= 6 && hourOfDay < 18) { // Daytime: show sun
    gameState.sun.setVisible(true);
    gameState.moon.setVisible(false);

    // Sun moves from left to right over 12 hours (6 AM to 6 PM)
    const sunProgress = (hourOfDay - 6) / 12; // 0 to 1
    const sunX = screenWidth * sunProgress;
    const sunY = screenHeight * 0.2 - Math.sin(sunProgress * Math.PI) * screenHeight * 0.15; // Arc motion
    gameState.sun.setPosition(sunX, sunY);
  } else { // Nighttime: show moon
    gameState.sun.setVisible(false);
    gameState.moon.setVisible(true);

    // Moon moves from left to right over 12 hours (6 PM to 6 AM)
    let moonProgress;
    if (hourOfDay >= 18) {
      moonProgress = (hourOfDay - 18) / 12;
    } else {
      moonProgress = (hourOfDay + 6) / 12;
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
  if (overlapPercent >= 0.75 && (gameState.cursors.up.isDown || gameState.wKey.isDown) && !gameState.isClimbing && !gameState.buildMode) {
    gameState.isClimbing = true;
    // Snap player to center of tree trunk
    gameState.player.x = gameState.treeTrunk.x;
    gameState.player.setVelocityX(0); // Stop horizontal movement
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
        gameState.tempStatusMessage.setVisible(true);
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
    const bottomThirdHeight = treeBottom - (gameState.treeTrunk.height / 3);
    const inBottomThird = gameState.player.y >= bottomThirdHeight;

    // Only allow side positioning in top 2/3 of tree
    if (!inBottomThird) {
      // Flip saw sprite and position based on direction while climbing
      if (gameState.cursors.left.isDown || gameState.aKey.isDown) {
        gameState.player.setFlipX(false); // Facing left
        gameState.player.x = gameState.treeTrunk.x - 20; // Offset to left side of trunk
      } else if (gameState.cursors.right.isDown || gameState.dKey.isDown) {
        gameState.player.setFlipX(true); // Facing right
        gameState.player.x = gameState.treeTrunk.x + 20; // Offset to right side of trunk
      }
    } else {
      // In bottom third - force center position
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

              // Schedule regeneration after 10 seconds
              gameState.scene.time.delayedCall(gameState.branchRegenerationDelay * 1000, () => {
                // Attempt to grow a branch
                const attemptGrow = () => {
                  // Count current branches still on tree
                  const branchesOnTree = gameState.branches.getChildren().filter(b =>
                    b.active && b.getData('onTree')
                  ).length;

                  // Check if enough time has passed since last branch grew
                  const currentTime = Date.now() / 1000;
                  const timeSinceLastGrow = currentTime - gameState.lastBranchGrowTime;

                  // Only regenerate if below max branches AND cooldown has passed
                  if (branchesOnTree < gameState.maxBranches && timeSinceLastGrow >= gameState.branchGrowCooldown) {
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

                      gameState.lastBranchGrowTime = currentTime;

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

    if ((gameState.cursors.up.isDown || gameState.wKey.isDown) && !atMaxHeight) {
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
      //debug: true
    }
  },
  scene: {
    preload,
    create,
    update
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: w,
    height: h
  }
};

const game = new Phaser.Game(config);

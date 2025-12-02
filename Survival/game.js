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
  lastTimeUpdate: 0,

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
  lastTempWarningTime: 0
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
    frameHeight: 128
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
                            // Prevent spawning if more than 25% of this bush would overlap with another bush
                            if (gameState.berryBushes) {
                              for (const otherBush of gameState.berryBushes.getChildren()) {
                                // Skip self (shouldn't happen on spawn, but safe)
                                if (!otherBush.active) continue;
                                const bushRect = new Phaser.Geom.Rectangle(x-32, y-32, 64, 64);
                                const otherRect = new Phaser.Geom.Rectangle(otherBush.x-32, otherBush.y-32, 64, 64);
                                if (Phaser.Geom.Intersects.RectangleToRectangle(bushRect, otherRect)) {
                                  // Calculate intersection area
                                  const ix = Math.max(bushRect.x, otherRect.x);
                                  const iy = Math.max(bushRect.y, otherRect.y);
                                  const iw = Math.min(bushRect.right, otherRect.right) - ix;
                                  const ih = Math.min(bushRect.bottom, otherRect.bottom) - iy;
                                  if (iw > 0 && ih > 0) {
                                    const intersectionArea = iw * ih;
                                    const bushArea = 64 * 64;
                                    if (intersectionArea / bushArea > 0.25) return false;
                                  }
                                }
                              }
                            }
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
              // Check overlap with shelters
              for (const shelter of gameState.shelters) {
                if (Phaser.Geom.Intersects.RectangleToRectangle(
                  new Phaser.Geom.Rectangle(x-32, y-32, 64, 64),
                  shelter.getBounds()
                )) return false;
              }
              // Check overlap with fires
              for (const fire of gameState.fires) {
                if (Phaser.Geom.Intersects.RectangleToRectangle(
                  new Phaser.Geom.Rectangle(x-32, y-32, 64, 64),
                  fire.getBounds()
                )) return false;
              }
              // Check overlap with buckets
              for (const bucket of gameState.buckets) {
                if (Phaser.Geom.Intersects.RectangleToRectangle(
                  new Phaser.Geom.Rectangle(x-32, y-32, 64, 64),
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
                y = h - 96; // Place on ground, adjust as needed
                tries++;
              } while (!isValidBerryBushPosition.call(gameState.scene, x, y) && tries < 20);
              if (tries >= 20) return null;
              const bush = gameState.berryBushes.create(x, y, 'berry_bush', 0).setDepth(220).setScale(1);
              bush.setData('berries', 10);
              bush.setData('regrowing', false);
              bush.setData('frameTimer', 0);
              bush.setData('frame', 0);
              bush.setInteractive();
              return bush;
            }

            // Only spawn bushes after trunk is created
            this.time.delayedCall(0, () => {
              for (let i = 0; i < 2; i++) {
                spawnBerryBush();
              }
            });
          // Weather pattern: storms only 10% of the time
          // Schedule first storm
          const dayMinutes = 24 * 60;
          const stormDurationMin = 20; // min storm duration in minutes
          const stormDurationMax = 60; // max storm duration in minutes
          const maxRainPerDay = 144; // 2.4 hours (10% of 24h)
          // Precompute all storms for the day
          const scheduleStormsForDay = (dayStart) => {
            let totalRain = 0;
            let storms = [];
            let time = dayStart + Phaser.Math.Between(10, 60); // Don't start at midnight
            while (totalRain < maxRainPerDay) {
              let maxStorm = Math.min(stormDurationMax, maxRainPerDay - totalRain);
              let stormLength = Phaser.Math.Between(stormDurationMin, maxStorm);
              if (totalRain + stormLength > maxRainPerDay) stormLength = maxRainPerDay - totalRain;
              storms.push({ start: time, end: time + stormLength });
              totalRain += stormLength;
              time += stormLength + Phaser.Math.Between(30, 120); // Gaps between storms
              if (time > dayStart + 24 * 60) break;
            }
            return storms;
          };
          gameState.scheduleStormsForDay = scheduleStormsForDay;
        // Footsteps and rain audio
        gameState.footstepsSound = this.sound.add('footsteps', { loop: true, volume: 2 });
        gameState.rainSound = this.sound.add('rain', { loop: true, volume: 0.2 });
      // Force integer pixel rendering for pixel art
      this.cameras.main.roundPixels = true;
    // Track current shelter preview frame
    gameState.shelterPreviewFrame = 0;
    // Get number of frames in shelter spritesheet (assume 4 if not known)
    gameState.shelterFrameCount = this.textures.get('shelter').frameTotal || 4;
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
    this.cameras.main.height - 40,
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
    this.cameras.main.height - 94,
    'spritesheet',
    0
  ).setScale(1).setDepth(300);

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
  const tempStatusX = centerX - 60;
  const tempStatusY = 76; // Below health bar

  gameState.playerTempBg = this.add.graphics();
  gameState.playerTempBg.fillStyle(0x000000, 0.7);
  gameState.playerTempBg.fillRect(tempStatusX - 2, tempStatusY - 2, 120, 22);
  gameState.playerTempText = this.add.text(tempStatusX, tempStatusY, 'Comfortable', {
    fontSize: '16px',
    fill: '#00aa00',
    fontStyle: 'bold'
  }).setOrigin(0, 0);

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
  gameState.infoTextCheck = this.add.text(centerX - 100, placementUIY + 30, '✓ (Enter) ', {
    fontSize: '20px',
    fill: '#00ff00',
    fontStyle: 'bold',
    stroke: '#000000',
    strokeThickness: 3
  }).setOrigin(0.5, 0.5).setDepth(300).setVisible(false);

  gameState.infoTextX = this.add.text(centerX + 100, placementUIY + 30, '✗ (Backspace)', {
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
    if (gameState.buildMode === 'fire' && gameState.sticksCollected >= 3) {
      // Deduct branches
      gameState.sticksCollected -= gameState.buildCosts.fire;
      gameState.stickText.setText(`${gameState.sticksCollected}`);

      // Create actual fire at placement position
      const fire = this.add.sprite(
        gameState.placementItem.x,
        gameState.placementItem.y,
        'fire_spritesheet'
      ).setScale(1).setDepth(210);

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
      ).setScale(1).setDepth(210);

      this.physics.world.enable(bucket);
      bucket.body.setAllowGravity(false);
      bucket.body.setImmovable(true);
      bucket.body.setSize(40, 40);

      // Add fill percentage data and text display
      bucket.setData('fillPercent', 0);
      const fillText = this.add.text(
        bucket.x,
        bucket.y - 40,
        '0%',
        { fontSize: '16px', fill: '#ffffff', fontStyle: 'bold', stroke: '#000000', strokeThickness: 3 }
      ).setOrigin(0.5).setDepth(210);
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

      this.physics.world.enable(shelter);
      shelter.body.setAllowGravity(false);
      shelter.body.setImmovable(true);
      shelter.body.setSize(128, 128, false);
      shelter.body.setOffset(0, 0);
      shelter.body.isCircle = false;
      console.log('Shelter body size:', shelter.body.width, shelter.body.height);
      // Store shelter
      gameState.shelters.push(shelter);

      gameState.placementSound.play(); // Play placement sound

      // Show build notification
      showInfoText('You built a Shelter', 2000);

      // Clean up placement UI
      gameState.placementItem.destroy();
      gameState.placementArrowLeft.destroy();
      gameState.placementArrowRight.destroy();
      gameState.buildMode = null;
      gameState.checkButton.setVisible(false);
      gameState.xButton.setVisible(false);
    }
  });

  gameState.xButton.on('pointerdown', () => {
    if (gameState.buildMode) {
      // Clean up placement UI without deducting branches
      gameState.placementItem.destroy();
      gameState.placementArrowLeft.destroy();
      gameState.placementArrowRight.destroy();
      gameState.buildMode = null;
      gameState.checkButton.setVisible(false);
      gameState.xButton.setVisible(false);
    }
  });

  // Score text (bottom center, currently hidden)
  gameState.scoreText = this.add.text(
    centerX - 30,
    this.cameras.main.height - 15,
    'Score: 0',
    { fontSize: '15px', fill: '#000000' }
  );

  // -----------------
  // INPUT SETUP
  // -----------------
  gameState.cursors = this.input.keyboard.createCursorKeys();

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
        this.cameras.main.height - 85,
        'fire_spritesheet'
      ).setScale(1).setDepth(210).setAlpha(0.7);
      gameState.placementItem.anims.play('fireBurn', true);

      // Create arrows
      gameState.placementArrowLeft = this.add.text(
        centerX - 50,
        this.cameras.main.height - 85,
        '←',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      gameState.placementArrowRight = this.add.text(
        centerX + 50,
        this.cameras.main.height - 85,
        '→',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      // Show confirmation buttons just above fire (centered)
      const fireY = this.cameras.main.height - 85;
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

      // Create placement preview
      gameState.placementItem = this.add.sprite(
        centerX,
        this.cameras.main.height - 85,
        'bucket_spritesheet',
        0
      ).setScale(1).setDepth(210).setAlpha(0.7);

      // Create arrows
      gameState.placementArrowLeft = this.add.text(
        centerX - 50,
        this.cameras.main.height - 85,
        '←',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      gameState.placementArrowRight = this.add.text(
        centerX + 50,
        this.cameras.main.height - 85,
        '→',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      // Show confirmation buttons just above bucket (centered)
      const bucketY = this.cameras.main.height - 85;
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

      // Create arrows at shelter position
      gameState.placementArrowLeft = this.add.text(
        centerX - 50,
        shelterY,
        '←',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      gameState.placementArrowRight = this.add.text(
        centerX + 50,
        shelterY,
        '→',
        { fontSize: '40px', fill: '#ffffff', fontStyle: 'bold' }
      ).setOrigin(0.5, 0.5).setDepth(210);

      // Show confirmation buttons above shelter (centered)
      gameState.checkButton.x = centerX - 20; // Offset left to center the pair
      gameState.checkButton.y = shelterY - 80; // 80 pixels above shelter center
      gameState.xButton.x = centerX + 20; // Offset right to center the pair
      gameState.xButton.y = shelterY - 80;
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
        const drops = Math.round(Phaser.Math.Linear(2, 10, gameState.stormStrength));
        for (let i = 0; i < drops; i++) {
          const xCoord = Math.random() * this.cameras.main.width;
          const randomDepth = 100 + Math.random() * 100;
          const raindrop = gameState.raindrops.create(xCoord, -10, 'raindrop').setScale(0.5).setDepth(randomDepth);
          raindrop.body.setVelocityY(Phaser.Math.Linear(120, 350, gameState.stormStrength));
        }
      }
    },
    loop: true
  });

  // Raindrop collides with ground - destroy
  this.physics.add.collider(gameState.raindrops, gameState.platforms, function (raindrop) {
    raindrop.destroy();
  });
}

// =======================
// UPDATE LOOP
// =======================
function update() {
    // Always enable gravity for player unless climbing
    if (!gameState.isClimbing && gameState.player.body.allowGravity === false) {
      gameState.player.body.setAllowGravity(true);
    }
  // --- GROUND/SHELTER CHECKS (must be at very top of update loop) ---
  // No manual shelter collision logic needed; handled by physics collider
  let onGroundOrShelter = gameState.player.body.onFloor();
  // --- HUNGER & THIRST DEPLETION ---
  // Use real time (not frame time) for consistent depletion
  if (!gameState.lastHungerThirstTick) gameState.lastHungerThirstTick = Date.now();
  const now = Date.now();
  if (now - gameState.lastHungerThirstTick >= 5000) {
    if (gameState.hunger > 0) gameState.hunger = Math.max(0, gameState.hunger - 1);
    if (gameState.thirst > 0) gameState.thirst = Math.max(0, gameState.thirst - 1);
    gameState.lastHungerThirstTick += 5000;
  }
              // --- HUNGER & THIRST UI COLOR ---
              // Thirst (water drop)
              let thirstColor = '#00aa00';
              if (gameState.thirst === 0) thirstColor = '#ff0000';
              else if (gameState.thirst <= 5) thirstColor = '#ffff00';
              gameState.waterText.setText(`${gameState.thirst}`);
              gameState.waterText.setColor(thirstColor);

              // Hunger (berry)
              let hungerColor = '#00aa00';
              if (gameState.hunger === 0) hungerColor = '#ff0000';
              else if (gameState.hunger <= 5) hungerColor = '#ffff00';
              gameState.berryText.setText(`${gameState.hunger}`);
              gameState.berryText.setColor(hungerColor);
            // Clamp all berries to ground after animation so they never fall off the map
            // Adjust so berry bottom sits on ground (berry is 32px tall, scaled 0.6)
            let berryGroundY = h - 94 - (32 * 0.6) / 2;
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
            if (!bush.getData('regrowing')) {
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
          if (Phaser.Input.Keyboard.JustDown(gameState.cursors.up) && !gameState.buildMode) {
            gameState.berryBushes.getChildren().forEach(bush => {
              if (!bush.getData('regrowing') && bush.getData('berries') > 0) {
                const dist = Phaser.Math.Distance.Between(
                  gameState.player.x, gameState.player.y, bush.x, bush.y
                );
                if (dist < 60) { // tighter overlap for picking
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
                  // If bush is empty, start regrowth
                  if (bush.getData('berries') <= 0) {
                    bush.setVisible(false);
                    bush.setData('regrowing', true);
                    gameState.scene.time.delayedCall(10000, () => {
                      // Regrow bush in new valid spot
                      bush.setData('regrowing', false);
                      bush.setData('berries', 10);
                      let tries = 0, x, y;
                      do {
                        x = Phaser.Math.Between(100, w - 100);
                        y = h - 96;
                        tries++;
                      } while (!gameState.scene.isValidBerryBushPosition || !gameState.scene.isValidBerryBushPosition(x, y) && tries < 20);
                      bush.x = x;
                      bush.y = y;
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
                // Add to inventory (increase hunger for now)
                gameState.hunger = Math.min(gameState.hunger + 10, gameState.maxHunger);
                showInfoText('You picked a berry! (+10 hunger)', 1200);
              }
            }
          });
        // --- WEATHER SYSTEM ---
        // --- WEATHER SYSTEM: Precompute daily storms ---
        const day = Math.floor(gameState.gameTime / (24 * 60));
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
          // If storm is in its last 10% (or last 10 minutes if short), start petering out
          const peterOutDuration = Math.max(10, stormTotal * 0.1); // at least 10 minutes
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
          gameState.isRaining = gameState.stormStrength > 0.1;
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
        (gameState.cursors.left.isDown || gameState.cursors.right.isDown)
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
      if (gameState.isRaining && gameState.stormStrength > 0.1) {
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
  // Calculate delta time for frame-rate independent updates
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
    if (Phaser.Input.Keyboard.JustDown(gameState.cursors.left)) {
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

    if (Phaser.Input.Keyboard.JustDown(gameState.cursors.right)) {
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
    const moveSpeed =         200 * deltaTime;
    if (gameState.cursors.left.isDown && !gameState.buildMenuOpen) {
      gameState.placementArrowLeft.x -= moveSpeed;
      gameState.placementArrowRight.x -= moveSpeed;
      gameState.checkButton.x -= moveSpeed;
      gameState.xButton.x -= moveSpeed;
      gameState.placementItem.x -= moveSpeed;
      gameState.ghostPreviewX -= moveSpeed;

      console.log("-------MOVEMENT VALUES:-------");
      console.log("GhostX: " + gameState.ghostPreviewX);
      console.log("GhostY: " + gameState.ghostPreviewY);
      console.log("placementItem.x: " + gameState.placementItem.x);
      console.log("placementItem.y: " + gameState.placementItem.y);
    }
    if (gameState.cursors.right.isDown && !gameState.buildMenuOpen) {
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
    }
    if (gameState.placementItem.x < minX) {
      gameState.placementItem.x = minX;
      gameState.placementArrowLeft.x = minX - 50;
      gameState.placementArrowRight.x = minX + 50;
      gameState.checkButton.x = minX - 20; // Centered pair offset
      gameState.xButton.x = minX + 20;
    }
    if (gameState.placementItem.x > maxX) {
      gameState.placementItem.x = maxX;
      gameState.placementArrowLeft.x = maxX - 50;
      gameState.placementArrowRight.x = maxX + 50;
      gameState.checkButton.x = maxX - 20; // Centered pair offset
      gameState.xButton.x = maxX + 20;
    }

    // --- Shelter preview stacking & snapping logic ---
    if (gameState.buildMode === 'shelter') {
      const shelterWidth = 128, shelterHeight = 128;

      // Always use ghostPreview as the authoritative preview position
      // placementItem will be updated to match ghostPreview unless we snap
      let shouldSnap = false;
      let snapX = null;
      let snapY = null;
      const snapThresholdX = shelterWidth; // snap only when ghost X is within one shelter width
      const snapThresholdY = 12; // small vertical tolerance for stacking

      for (let i = 0; i < gameState.shelters.length; i++) {
        const existing = gameState.shelters[i];
        const dx = Math.abs(existing.x - gameState.ghostPreviewX);
        const targetY = existing.y - shelterHeight;

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
        gameState.placementItem.y = snapY;
        gameState.placementArrowLeft.x = snapX - 50;
        gameState.placementArrowRight.x = snapX + 50;
        gameState.placementArrowLeft.y = snapY;
        gameState.placementArrowRight.y = snapY;
        gameState.checkButton.x = snapX - 20;
        gameState.checkButton.y = snapY - 80;
        gameState.xButton.x = snapX + 20;
        gameState.xButton.y = snapY - 80;
        gameState.snapped = true;
        // Do NOT overwrite ghostPreviewX/Y — keep ghost as what player is controlling.
        // The preview sprite is snapped visually, but the ghost coordinates remain authoritative
        // so snapping is temporary while the ghost X/Y stay within the snap range.
        // Visual indicator for snapping
        if (gameState.placementItem.setTint) {
          gameState.placementItem.setTint(0x88ff88);
        }
        gameState.placementItem.setDepth(220);
        // Debug log for snap
        //console.log('SNAP PREVIEW at', snapX, snapY, 'ghostX', gameState.ghostPreviewX);
      } else {
        // Not snapping: ensure preview exactly follows ghostPreview
        gameState.placementItem.x = gameState.ghostPreviewX;
        gameState.placementItem.y = gameState.ghostPreviewY;
        gameState.placementArrowLeft.x = gameState.ghostPreviewX - 50;
        gameState.placementArrowRight.x = gameState.ghostPreviewX + 50;
        gameState.placementArrowLeft.y = gameState.ghostPreviewY;
        gameState.placementArrowRight.y = gameState.ghostPreviewY;
        gameState.checkButton.x = gameState.ghostPreviewX - 20;
        gameState.checkButton.y = gameState.ghostPreviewY - 80;
        gameState.xButton.x = gameState.ghostPreviewX + 20;
        gameState.xButton.y = gameState.ghostPreviewY - 80;
        gameState.snapped = false;
        // Clear any snap tint
        if (gameState.placementItem.clearTint) {
          gameState.placementItem.clearTint();
        }
        gameState.placementItem.setDepth(210);
      }
    }
    // Allow cycling shelter preview frame with up arrow after all position logic
    if (gameState.buildMode === 'shelter' && gameState.placementItem) {
      if (Phaser.Input.Keyboard.JustDown(gameState.cursors.up)) {
        gameState.shelterPreviewFrame = (gameState.shelterPreviewFrame + 1) % gameState.shelterFrameCount;
        gameState.placementItem.setFrame(gameState.shelterPreviewFrame);
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
        ).setScale(1).setDepth(215);

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
        ).setScale(1).setDepth(210);

        gameState.scene.physics.world.enable(bucket);
        bucket.body.setAllowGravity(false);
        bucket.body.setImmovable(true);
        bucket.body.setSize(40, 40);

        // Add fill percentage data and text display
        bucket.setData('fillPercent', 0);
        const fillText = gameState.scene.add.text(
          bucket.x,
          bucket.y - 40,
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
        // Deduct branches
        gameState.sticksCollected -= gameState.buildCosts.shelter;
        gameState.stickText.setText(`${gameState.sticksCollected}`);

        // Determine final placement coordinates.
        // If preview is currently snapped (temporary visual snap), place at the snapped preview coords.
        // Otherwise place at the authoritative ghost preview position the player controls.
        let finalX, finalY;
        if (gameState.snapped && gameState.placementItem) {
          finalX = gameState.placementItem.x;
          finalY = gameState.placementItem.y;
        } else {
          finalX = gameState.ghostPreviewX;
          finalY = gameState.ghostPreviewY;
        }
        const shelterFrame = gameState.shelterPreviewFrame || 0;
        const shelter = gameState.scene.add.sprite(
          finalX,
          finalY,
          'shelter', shelterFrame
        ).setScale(1).setDepth(210)

        gameState.scene.physics.world.enable(shelter);
        shelter.body.setAllowGravity(false);
        shelter.body.setImmovable(true);
        shelter.body.setSize(128, 128, false);
        shelter.body.setOffset(0, 0);
        shelter.body.isCircle = false;

        console.log('Shelter body size:', shelter.body.width, shelter.body.height);

        // If for some reason the code reaches here and placement wasn't done at the snapped preview,
        // keep the shelter where the preview indicated (finalX/finalY). We do NOT force stacking
        // during confirmation — stacking only occurs while previewing (temporary snap).


        // Store shelter
        gameState.shelters.push(shelter);

        // Add a static physics platform at the top of the shelter for true collision
        if (gameState.shelterPlatforms) {
          const platform = gameState.shelterPlatforms.create(
            shelter.x,
            shelter.y - 64 + 12, // Slightly lower to match sprite edge
            'platform'
          );
          platform.displayWidth = 128;
          platform.displayHeight = 24; // Thicker for reliable collision
          platform.setAlpha(0); // Invisible platform
          platform.setDepth(9999); // Bring to front
          platform.refreshBody();
          console.log('Shelter platform created at', platform.x, platform.y, 'display size', platform.displayWidth, platform.displayHeight);
        }

        gameState.scene.sound.play('placement'); // Play placement sound

        // Show build notification
        showInfoText('You built a Shelter', 2000);

        // Clean up placement UI
        gameState.placementItem.destroy();
        gameState.placementArrowLeft.destroy();
        gameState.placementArrowRight.destroy();
        gameState.buildMode = null;
        gameState.checkButton.setVisible(false);
        gameState.xButton.setVisible(false);
      }
    }

    // Backspace key - cancel placement (same as x button)
    if (Phaser.Input.Keyboard.JustDown(gameState.backspaceKey) && gameState.buildMode) {
      // Clean up placement UI without deducting branches
      gameState.placementItem.destroy();
      gameState.placementArrowLeft.destroy();
      gameState.placementArrowRight.destroy();
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
        // Reset player temperature to 74 degrees (comfortable)
        gameState.playerTemp = 74;
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

            // Increase fill percentage
            let fillPercent = bucket.getData('fillPercent') || 0;
            fillPercent = Math.min(fillPercent + 10, 100); // Add 10%, max 100%
            bucket.setData('fillPercent', fillPercent);

            // Update bucket sprite based on fill level (frames 0-4)
            if (fillPercent >= 100) {
              bucket.setFrame(4); // Full bucket (frame 4)
              gameState.waterCollected++;
              gameState.waterText.setText(`${gameState.waterCollected}`);
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

  // Update game time (2 minutes per real second = 12 minute full day)
  gameState.gameTime += deltaTime * 4; // 4 minutes per real second = 6 minute full day
  if (gameState.gameTime >= 24 * 60) {
    gameState.gameTime -= 24 * 60;
    // Level up at the end of each day
    gameState.level++;
    // Double build costs every other level (on odd levels > 1)
    if (gameState.level > 1 && gameState.level % 2 === 1) {
      gameState.buildCosts.fire *= 2;
      gameState.buildCosts.bucket *= 2;
      gameState.buildCosts.shelter *= 2;
    }
    showInfoText(`Level Up! Level ${gameState.level}`);
  }

  // Display time in 12-hour format
  const hours = Math.floor(gameState.gameTime / 60);
  const minutes = Math.floor(gameState.gameTime % 60);
  const displayHours = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
  const ampm = hours < 12 ? 'AM' : 'PM';
  gameState.timeText.setText(`${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`);

  // Calculate ambient temperature (sine wave: 48°F at 2 AM, 100°F at 2 PM)
  const hourOfDay = gameState.gameTime / 60;
  const tempPhase = ((hourOfDay - 14) / 24) * Math.PI * 2;
  gameState.temperature = 74 + 26 * Math.cos(tempPhase);
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
        if (!gameState.isClimbing && !gameState.isJumping) {
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
  if (!touchingFire && !gameState.isClimbing && !gameState.isJumping &&
    !gameState.isCrouching && gameState.player.texture.key === 'fire_player') {
    gameState.player.setTexture('spritesheet', 0);
  }

  // Calculate target temperature based on fire proximity
    // Check if player is under any shelter
    let underShelter = false;
    if (gameState.shelters && gameState.shelters.length > 0) {
      const playerBounds = gameState.player.getBounds();
      for (const shelter of gameState.shelters) {
        if (shelter.active && Phaser.Geom.Intersects.RectangleToRectangle(playerBounds, shelter.getBounds())) {
          underShelter = true;
          break;
        }
      }
    }
  let targetTemp = gameState.temperature;

  // Check if player is under tree (tree shade provides cooling)
  // Bounds will be calculated later for climbing, so we reuse that check
  const tempPlayerBounds = gameState.player.getBounds();
  const tempTrunkBounds = gameState.treeTrunk.getBounds();
  const underTree = Phaser.Geom.Intersects.RectangleToRectangle(tempPlayerBounds, tempTrunkBounds);

  // Apply tree shade cooling if under tree
  if (underTree) {
    targetTemp -= 5; // 5 degrees cooler in shade
  }

  if (gameState.nearFire && closestFireDistance < playerBodyLength * 2) {
    if (touchingFire) {
      // Touching fire: dangerous, accumulating heat
      if (!gameState.fireContactTime) gameState.fireContactTime = 0;
      gameState.fireContactTime += deltaTime;
      const fireBonus = 15 + gameState.fireContactTime;
      targetTemp = gameState.temperature + fireBonus;

      // Show warning message periodically (every 3 seconds)
      const currentTime = gameState.scene.time.now;
      if (currentTime - gameState.lastTempWarningTime > 3000) {
        let tempStatus = 'Comfortable';
        if (gameState.playerTemp < 60) tempStatus = 'Freezing';
        else if (gameState.playerTemp < 70) tempStatus = 'Cold';
        else if (gameState.playerTemp > 90) tempStatus = 'Hot';
        else if (gameState.playerTemp > 100) tempStatus = 'Overheating';

        showInfoText(`You are ${tempStatus}`, 2000);
        gameState.lastTempWarningTime = currentTime;
      }
    } else if (closestFireDistance < playerBodyLength) {
      // Within 1 body length: safe warming (+15°F)
      targetTemp = gameState.temperature + 15;
    } else {
      // Between 1-2 body lengths: gradient warming
      const distanceRatio = (closestFireDistance - playerBodyLength) / playerBodyLength;
      const fireBonus = 15 * (1 - distanceRatio);
      targetTemp = gameState.temperature + fireBonus;
    }
  } else {
    gameState.fireContactTime = 0;
  }

  // -----------------
  // PLAYER TEMPERATURE REGULATION
  // -----------------
  // Adjust player temperature toward target
  if (underShelter) {
    // Move 15 degrees per second toward 75
    const toward = 75;
    const diff = toward - gameState.playerTemp;
    if (Math.abs(diff) > 0.5) {
      // Move up to 15 degrees per second toward 75
      const change = Math.sign(diff) * Math.min(Math.abs(diff), 15 * deltaTime);
      gameState.playerTemp += change;
    }
  } else if (gameState.nearFire) {
    const tempDifference = targetTemp - gameState.playerTemp;
    if (Math.abs(tempDifference) > 0.5) {
      gameState.playerTemp += Math.sign(tempDifference) * deltaTime * 3;
    }
  } else if (underTree) {
    // Under tree shade - gradually adjust to cooler target temp
    const tempDifference = targetTemp - gameState.playerTemp;
    if (Math.abs(tempDifference) > 0.5) {
      gameState.playerTemp += Math.sign(tempDifference) * deltaTime * 1;
    }
  } else {
    // Gradually return to ambient temperature
    if (gameState.playerTemp > gameState.temperature) {
      gameState.playerTemp -= deltaTime * 1;
      if (gameState.playerTemp < gameState.temperature) {
        gameState.playerTemp = gameState.temperature;
      }
    } else if (gameState.playerTemp < gameState.temperature) {
      gameState.playerTemp += deltaTime * 1;
      if (gameState.playerTemp > gameState.temperature) {
        gameState.playerTemp = gameState.temperature;
      }
    }
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
    // Heat damage (scales with temperature)
    const degreesOver95 = gameState.playerTemp - 95;
    gameState.health -= deltaTime * degreesOver95;
  }

  // Clamp health
  if (gameState.health < 0) gameState.health = 0;
  if (gameState.health > gameState.maxHealth) gameState.health = gameState.maxHealth;

  // Update player temperature status text
  let tempStatus, tempColor;
  if (gameState.playerTemp >= 95) {
    tempStatus = 'Melting';
    tempColor = '#ff0000';
  } else if (gameState.playerTemp >= 90) {
    tempStatus = 'Dehydrated';
    tempColor = '#ff4400';
  } else if (gameState.playerTemp >= 85) {
    tempStatus = 'Sweaty';
    tempColor = '#ff8800';
  } else if (gameState.playerTemp >= 80) {
    tempStatus = 'Warm';
    tempColor = '#ffaa00';
  } else if (gameState.playerTemp >= 70) {
    tempStatus = 'Comfortable';
    tempColor = '#00aa00';
  } else if (gameState.playerTemp >= 65) {
    tempStatus = 'Cool';
    tempColor = '#66ccff';
  } else if (gameState.playerTemp >= 60) {
    tempStatus = 'Nippy';
    tempColor = '#4488ff';
  } else if (gameState.playerTemp >= 55) {
    tempStatus = 'Chilly';
    tempColor = '#2266ff';
  } else {
    tempStatus = 'Freezing';
    tempColor = '#0044ff';
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
  if (overlapPercent >= 0.75 && gameState.cursors.up.isDown && !gameState.isClimbing && !gameState.buildMode) {
    gameState.isClimbing = true;
    // Snap player to center of tree trunk
    gameState.player.x = gameState.treeTrunk.x;
    gameState.player.setVelocityX(0); // Stop horizontal movement
    gameState.player.setGravityY(-300); // Disable gravity (cancel out world gravity of 300)
    gameState.player.setVelocityY(-200); // Start moving up immediately
    gameState.player.anims.play('sawSpin', true); // Start saw animation
    gameState.player.setFlipX(false); // Reset to face forward/left
  }

  // Stop climbing when touching ground
  if (gameState.isClimbing && gameState.player.body.onFloor()) {
    gameState.isClimbing = false;
    gameState.player.anims.stop(); // Stop saw animation
    gameState.player.setTexture('spritesheet', 0); // Reset to default spritesheet and frame
    gameState.player.setGravityY(0); // Restore normal gravity (world gravity applies)
    // Stop saw audio if still playing
    if (gameState.sawAttack && gameState.sawAttack.isPlaying) gameState.sawAttack.stop();
    if (gameState.sawSustainLoop && gameState.sawSustainLoop.isPlaying) gameState.sawSustainLoop.stop();
    gameState.sawSoundPlaying = false;
  }

  // Jump mechanics (only when not climbing, not in build mode, and not in build menu)
  if (!gameState.isClimbing && !gameState.buildMode && !gameState.buildMenuOpen) {
    // Up key - drink water (when on ground or shelter and have water)
    if (gameState.cursors.up.isDown && onGroundOrShelter && gameState.waterCollected > 0) {
      // Check if not already drinking (prevent spam)
      if (!gameState.isDrinking) {
        gameState.isDrinking = true;
        gameState.waterCollected--;
        gameState.waterText.setText(`${gameState.waterCollected}`);
        // Reset player temperature to 74 degrees (comfortable)
        gameState.playerTemp = 74;
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

      // Play crouch sound when starting crouch
      if (!gameState.crouchSound.isPlaying) {
        gameState.crouchSound.play();
      }
    }

    // Continue playing crouch sound while holding space in crouch
    if (gameState.cursors.space.isDown && gameState.isCrouching) {
      // Keep playing crouch sound if not already playing
      if (!gameState.crouchSound.isPlaying) {
        gameState.crouchSound.play();
      }
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
      gameState.jumpStartVelocityX = gameState.player.body.velocity.x;

      // Charged jump logic (as before shelter physics refactor)
      const holdDuration = Date.now() - gameState.jumpChargeStartTime;
      const minJumpVelocity = -100; // Quick tap (even lower jump)
      const maxJumpVelocity = -400; // Max charge (even lower jump)
      const maxChargeTime = 600; // 600ms to reach max charge
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
      gameState.jumpStartVelocityX = gameState.player.body.velocity.x;
      gameState.player.setVelocityY(-300);
      gameState.jumpBufferTime = 0;
    }

    // Jump animation sequence - runs every frame during jump
    if (gameState.isJumping) {
      if (!onGroundOrShelter) {
        // Player is in air
        gameState.hasLeftGround = true;
        const velocityY = gameState.player.body.velocity.y;

        // Variable jump height - cut jump short if space released early
        if (velocityY < 0 && !gameState.cursors.space.isDown) {
          gameState.player.setVelocityY(velocityY * 0.5); // Cut upward momentum
        }

        // Apply manual gravity when in air
        if (velocityY >= 0) {
          // Falling - stronger gravity for snappier feel
          gameState.player.setVelocityY(velocityY + 20); // Falling gravity per frame
        } else {
          // Rising - lighter gravity
          gameState.player.setVelocityY(velocityY + 12); // Rising gravity per frame
        }

        // Frame 2: Going up (negative velocity)
        if (velocityY < 0) {
          gameState.player.setTexture('spritesheet', 2);
        }
        // Frame 3: Falling down (positive velocity)
        else {
          gameState.player.setTexture('spritesheet', 3);
        }
      } else if (gameState.hasLeftGround || onGroundOrShelter) {
        // Just landed
        gameState.player.setTexture('spritesheet', 0);
        gameState.isJumping = false;
        gameState.hasLeftGround = false;

        // Landing animation sequence
        gameState.scene.time.delayedCall(200, () => {
          if (!gameState.isClimbing && !gameState.isCrouching && !gameState.isJumping) {
            gameState.player.setTexture('spritesheet', 5);
          }
        });

        gameState.scene.time.delayedCall(350, () => {
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
      if (gameState.cursors.left.isDown) {
        gameState.player.setFlipX(false); // Facing left
        gameState.player.x = gameState.treeTrunk.x - 20; // Offset to left side of trunk
      } else if (gameState.cursors.right.isDown) {
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
          let branchHealth = closestBranch.getData('health');
          if (branchHealth === undefined || branchHealth === null) {
            branchHealth = 3;
            closestBranch.setData('health', 3);
          }

          // Reduce health every 1 second while holding space
          if (timeSinceLastDamage >= 1 && branchHealth > 0) {
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

                  // Only create branch if valid position found
                  if (validPosition) {
                    const newBranch = gameState.branches.create(
                      gameState.treeTrunk.x,
                      randomHeight,
                      'branch',
                      0 // Start with frame 0 (full branch)
                    ).setScale(1.5).setDepth(210);

                    newBranch.body.setAllowGravity(false);
                    newBranch.body.setImmovable(true);

                    // Set branch health (3 = full health)
                    newBranch.setData('health', 3);

                    // Randomly place on left or right
                    if (Math.random() > 0.5) {
                      newBranch.setFlipX(true);
                      newBranch.x += gameState.treeTrunk.width;
                    } else {
                      newBranch.x -= gameState.treeTrunk.width;
                    }

                    newBranch.setData('onTree', true);
                    gameState.lastBranchGrowTime = currentTime; // Update last grow time
                  }
                } else if (branchesOnTree < gameState.maxBranches) {
                  // Cooldown not passed yet, try again in 1 second
                  gameState.scene.time.delayedCall(1000, attemptGrow);
                }
              };

              attemptGrow();
            });
          }
        } else {
          // Player not holding space - reset beingCut flag and start healing
          gameState.branches.getChildren().forEach(branch => {
            if (branch.getData('beingCut')) {
              branch.setData('beingCut', false);
              // Keep current damage frame visible
              const currentHealth = branch.getData('health') || 3;

              // Set frame based on current health
              if (currentHealth === 3) {
                branch.setFrame(0);
              } else if (currentHealth === 2) {
                branch.setFrame(1);
              } else if (currentHealth === 1) {
                branch.setFrame(2);
              }

              // Start healing process (recursive until full health)
              const healBranch = () => {
                // Only heal if space is not being held AND branch is not being cut AND on tree
                if (!gameState.cursors.space.isDown && !branch.getData('beingCut') && branch.getData('onTree')) {
                  const branchHealth = branch.getData('health') || 3;
                  if (branchHealth < 3) {
                    const newHealth = branchHealth + 1;
                    branch.setData('health', newHealth);
                    // Update frame to match healed health
                    if (newHealth === 3) {
                      branch.setFrame(0);
                    } else if (newHealth === 2) {
                      branch.setFrame(1);
                    }
                    // Continue healing if not at full health
                    if (newHealth < 3) {
                      const timer = gameState.scene.time.delayedCall(2000, healBranch);
                      branch.setData('healTimer', timer);
                    } else {
                      branch.setData('healTimer', null);
                    }
                  }
                } else {
                  // Healing was interrupted, clear timer
                  branch.setData('healTimer', null);
                }
              };

              // Start healing after 2 seconds, store timer
              if (currentHealth < 3) {
                const timer = gameState.scene.time.delayedCall(2000, healBranch);
                branch.setData('healTimer', timer);
              }
            }
          });
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
      gameState.spacePressed = false;
    }

    if (gameState.cursors.up.isDown && !atMaxHeight) {
      gameState.player.setVelocityY(-200);
      // Play climbing sound if not already playing
      if (!gameState.climbingSound.isPlaying) {
        gameState.climbingSound.play();
      }
    } else if (gameState.cursors.down.isDown) {
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
      const currentVelocityX = gameState.player.body.velocity.x;

      if (gameState.cursors.left.isDown) {
        if (currentVelocityX < 0) {
          // Moving left, can speed up slightly
          const targetVelocity = Math.max(gameState.jumpStartVelocityX, -200);
          if (currentVelocityX > targetVelocity) {
            gameState.player.setVelocityX(Math.max(currentVelocityX - 20, targetVelocity));
          }
        } else if (currentVelocityX > 0) {
          // Moving right, can only slow down (not reverse)
          gameState.player.setVelocityX(Math.max(currentVelocityX - 5, 0));
        } else {
          // Standing still (velocity is 0), can start moving left
          gameState.player.setVelocityX(Math.max(currentVelocityX - 50, -200));
        }
        gameState.player.setFlipX(true);
      } else if (gameState.cursors.right.isDown) {
        if (currentVelocityX > 0) {
          // Moving right, can speed up slightly
          const targetVelocity = Math.min(gameState.jumpStartVelocityX, 200);
          if (currentVelocityX < targetVelocity) {
            gameState.player.setVelocityX(Math.min(currentVelocityX + 20, targetVelocity));
          }
        } else if (currentVelocityX < 0) {
          // Moving left, can only slow down (not reverse)
          gameState.player.setVelocityX(Math.min(currentVelocityX + 5, 0));
        } else {
          // Standing still (velocity is 0), can start moving right
          gameState.player.setVelocityX(Math.min(currentVelocityX + 50, 200));
        }
        gameState.player.setFlipX(false);
      }
      // Else preserve the velocity from jump start
    } else if (!gameState.player.body.onFloor()) {
      // Falling (not jumping, not on floor) - allow full air control
      const currentVelocityX = gameState.player.body.velocity.x;
      const airAcceleration = 30;
      const maxSpeed = 200;

      if (gameState.cursors.left.isDown) {
        const newVelocity = Math.max(currentVelocityX - airAcceleration, -maxSpeed);
        gameState.player.setVelocityX(newVelocity);
        gameState.player.setFlipX(true);
      } else if (gameState.cursors.right.isDown) {
        const newVelocity = Math.min(currentVelocityX + airAcceleration, maxSpeed);
        gameState.player.setVelocityX(newVelocity);
        gameState.player.setFlipX(false);
      }
    } else if (gameState.player.body.onFloor()) {
      // Full control on ground with acceleration/deceleration
      const currentVelocityX = gameState.player.body.velocity.x;
      const acceleration = 50; // Speed up gradually (increased from 30)
      const deceleration = 40; // Slow down gradually (increased from 20)
      const maxSpeed = 200;

      if (gameState.cursors.left.isDown && gameState.cursors.right.isDown) {
        // Both keys pressed - move at half speed in the direction of the first key pressed
        if (gameState.cursors.left.timeDown < gameState.cursors.right.timeDown) {
          gameState.player.setVelocityX(-100);
          gameState.player.setFlipX(true);
        } else {
          gameState.player.setVelocityX(100);
          gameState.player.setFlipX(false);
        }
      } else if (gameState.cursors.left.isDown) {
        // Accelerate left
        const newVelocity = Math.max(currentVelocityX - acceleration, -maxSpeed);
        gameState.player.setVelocityX(newVelocity);
        gameState.player.setFlipX(true);
      } else if (gameState.cursors.right.isDown) {
        // Accelerate right
        const newVelocity = Math.min(currentVelocityX + acceleration, maxSpeed);
        gameState.player.setVelocityX(newVelocity);
        gameState.player.setFlipX(false);
      } else {
        // Decelerate to stop
        if (Math.abs(currentVelocityX) > deceleration) {
          gameState.player.setVelocityX(currentVelocityX - Math.sign(currentVelocityX) * deceleration);
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

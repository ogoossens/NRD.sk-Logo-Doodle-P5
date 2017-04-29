/*
 NRD.sk Logo Game
 Created by Oliver Goossens
 oliver.goossens [] gmail.com
 GNU LGPL 2.1 License
 Version 1.0 | April 29th, 2017

 Basic idea is to offer a doodle (#googleDoodle) for the visitors of the NRD.sk domain, so go there and check it out :-)

 This is a open source, non profit, learning project I made from logo of NRD.sk which I am a great fan of.

 Should you have anything to share or any questions - find this project on GitHub.

 Github:
 https://github.com/ogoossens/NRD.sk-Logo-Doodle-P5

 Notes:
 - Its made responsive and can fit into any sized DIV :-)
 - Ive tried to make it "time dependent" instead of "frame dependent" so that *almost* every FPS has same game experience
 - Ive tried to avoid globals as I could but this bad habit is hard to fight
 - IIFE implementation came out more complicated (I just lack the skill yet) so I skipped that :) advices are welcomed

 Used libraries:
 p5js.org -  Great work guys you make JS really fun!
 Font used:
 Arcade Font Classic by Jakob Fischer
 */

/*
 ######################
 ### SPOILER ALERT  ###
 ######################

 GAME OBJECTIVE:
 - In the first gaming phase, the player has to defend the logo blocks and destroy the space invaders
 - Letting them being destroyed before the "space invaders" are destroyed results in a lost game
 - After the space invaders are destroyed, a *invulnerable* boss appears
 - Since the boss is *invulnerable* the player needs to destroy the logo block himself to gain extra powers
 - Its a game of speed of who is getting the last LOGO block
 - is it the boss, its THE END
 - is it the player - ge gets super strong...
 - ... and can destroy the boss and the pacman ghost with ease
 - doing so results in a win condition

 ######################
 ###  END OF ALERT  ###
 ######################
 */


/*
######################
###  < SETTINGS>   ###
######################
*/
// Local setting: enable when running witout an webserver
// (domain permission issues beacsue of the font)
var local = false;

// Enable or disable the game easily
// May be changed manually or via web call
var gameEnabled = true;

// Keyboard controls
// Defaults
// Great source for key codes: http://keycode.info/
var moveLeftKeyCode = 39;
var moveRightKeyCode = 37;
var shootKeyCode = 32;
/*
 ######################
 ###  </SETTINGS>   ###
 ######################
 */

/*
 Game Stages
 The game is divided into multiple stages which control the games status.
 Game stages:
 0. NRD.sk logo with game start overlay
 1. Actual game
 2. Game END (won or lost)
 */
var gameStage = 0;

// Canvas/Display variables and helpers
var pixelSize;
var canvasDiv;
var widthPixels = 136;
var heightPixels = 56;

// Custom Timers
var moveTimeInvaders;
var moveTimeGhost;
var gameStarted;
var startScreenTime;
var endScreenTime;

// Elements on screen
var player;
var logoPixels = [];
var spaceInvaders = [];
var shots = [];
var globalDir;
var tempDir;
var pixelFont;
var invaderBoss;
var ghost;

// Define my colors for later
var colors = [];

// Game hints
var hints = [
    "Three lives but not with the ghost",
    "The logo",
    "Defend or destroy",
    "Time is of the essence",
    "Change of tactics needed"
];
var hint;

/*
 Preloading any bigger data happens here
 Content loading from remote location (even local disc when running locally)
 has to be disabled becasue of cross domain restrictions
 Mostly reserver for sound, images and font preloading
 */
function preload() {
    // Load Font
    if (!local) {
        pixelFont = loadFont("./res/arcadefont.ttf");
    }
}

// This function (by p5) runs only once at the very beginning
function setup() {
    frameRate(60);

    // For size calculation of parent DIV
    canvasDiv = document.getElementById('nrd-sketch-holder');

    // Create canvas
    // Calculate and set canvas dimenstions
    var calculated = calculateCanvasValues();
    var canvas = createCanvas(calculated[0], calculated[1]);

    // Place the canvas into this DIV
    canvas.parent('nrd-sketch-holder');

    // Push the initial data
    pushInitialData();

    // Reset any timers
    moveTimeInvaders = new customTimer(160);
    moveTimeGhost = new customTimer(60);

    // We dont need any strokes from p5
    noStroke();

    // All fonts will be the same
    if (!local) {
        textFont(pixelFont);
    }

    // Fill the color data
    colors = [
        color(44, 184, 1),
        color(255, 198, 0),
        color(232, 0, 0),
        color(255, 204, 0),
        color(160, 25, 203),
        color(212, 165, 2)
    ];

    // Later we will use the SIN function - I like degrees more
    angleMode(DEGREES);
}

// This method (by p5) is looped all the time
// This main method controls the entire functionality
// From simulation, drawing to initialization and game stages control
function draw() {
    background(255);

    // This is what runs just when the actual game is running
    if (gameStage == 1) {
        // Update All Ubjects
        // If the game started
        player.updateStatus();

        // Space Invaders
        // Move
        if (moveTimeInvaders.go()) {
            tempDir = globalDir;
            for (var i = 0; i < spaceInvaders.length; i++) {
                spaceInvaders[i].move(tempDir);
            }
            if (invaderBoss) {
                invaderBoss.move(globalDir);
            }
        }
        // Shots
        // Update their position
        for (var i = 0; i < shots.length; i++) {
            shots[i].updateStatus();
        }
        // Splice if gone or collided
        // Collision also applies damage to the objects
        for (var i = shots.length - 1; i >= 0; i--) {
            if (shots[i].outOfBoundary() || shots[i].collided()) {
                shots.splice(i, 1);
            }
        }

        // Update the ghost
        ghost.move();
    }

    // DRAW and ALL TIME FUNCTIONS
    // Draw Player
    player.draw();

    if (invaderBoss) {
        invaderBoss.draw();
    }
    // Draw space invaders
    for (var i = 0; i < spaceInvaders.length; i++) {
        spaceInvaders[i].draw();
    }

    // Draw the remaining shots
    for (var i = 0; i < shots.length; i++) {
        shots[i].draw();
    }

    // Draw the remaining logo parts
    for (var i = 0; i < logoPixels.length; i++) {
        logoPixels[i].draw();
    }

    ghost.draw();
    drawLogoExtras();

    // Check if all invaders are dead and there is no boss yet, if so, spawn boss
    if (spaceInvaders.length == 0 && (invaderBoss == null || invaderBoss == undefined)) {
        invaderBoss = new boss();
    }

    // Menu functions
    if (gameStage == 0 && gameEnabled) {
        drawStartScreen();
    }

    // Menu functions
    if (gameStage == 2) {
        drawEndScreen();
    }

}
// Player ship element - object constructor
function playerShip() {
    this.position = createVector(40, heightPixels);
    this.thenTime = millis();
    this.life = 3;

    // For calculating its shots origin
    this.getMidOfShip = function () {
        return createVector(this.position.x + 2, this.position.y - 5);
    };

    // Function to calculate the movement
    this.move = function (dir) {
        // Times temp
        var nowTime = floor(millis());
        var timePassed = nowTime - this.thenTime;
        if (timePassed > 70) {
            this.position.x = this.position.x + dir * 4;
            this.thenTime = nowTime;
        }
    };

    this.updateStatus = function () {
        // move if needed
        checkKeyboard();

        // check for borders and teleport
        if (this.position.x > widthPixels - 2) {
            this.position.x = 0;
        }
        if (this.position.x < 0) {
            this.position.x = widthPixels - 4;
        }
    };

    this.hit = function () {
        this.life--;
        if (this.isDead()) {
            endGame();
        }
    };

    this.isDead = function () {
        if (this.life < 1) {
            return true;
        } else {
            return false;
        }
    };

    this.draw = function () {

        // Different player ship "skins" depending on the HP
        switch (this.life) {
            case 3:
                fill(colors[0]);
                rect(this.position.x * pixelSize, this.position.y * pixelSize - pixelSize * 2, pixelSize * 5 + 1, pixelSize + 1);
                rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize - pixelSize * 4, pixelSize * 1 + 1, pixelSize + 1);
                rect(this.position.x * pixelSize + pixelSize, this.position.y * pixelSize - pixelSize * 3, pixelSize * 3 + 1, pixelSize + 1);
                rect(this.position.x * pixelSize, this.position.y * pixelSize - pixelSize, pixelSize * 5 + 1, pixelSize + 1);
                break;

            case 2:
                fill(colors[0]);
                rect(this.position.x * pixelSize + pixelSize, this.position.y * pixelSize - pixelSize * 3, pixelSize + 1, pixelSize + 1);

                fill(colors[1]);
                rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize - pixelSize * 3, pixelSize * 2 + 1, pixelSize + 1);

                fill(colors[0]);
                rect(this.position.x * pixelSize, this.position.y * pixelSize - pixelSize * 2, pixelSize * 5 + 1, pixelSize + 1);
                rect(this.position.x * pixelSize, this.position.y * pixelSize - pixelSize, pixelSize * 5 + 1, pixelSize + 1);

                break;

            case 1:
                fill(colors[1]);
                rect(this.position.x * pixelSize + pixelSize, this.position.y * pixelSize - pixelSize * 3, pixelSize + 1, pixelSize + 1);

                fill(colors[2]);
                rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize - pixelSize * 3, pixelSize + 1, pixelSize + 1);

                fill(colors[1]);
                rect(this.position.x * pixelSize + pixelSize, this.position.y * pixelSize - pixelSize * 2, pixelSize * 4 + 1, pixelSize + 1);

                fill(colors[0]);
                rect(this.position.x * pixelSize, this.position.y * pixelSize - pixelSize * 2, pixelSize + 1, pixelSize + 1);
                rect(this.position.x * pixelSize, this.position.y * pixelSize - pixelSize, pixelSize * 5 + 1, pixelSize + 1);

                break;
        }
    }
}

// *has no prototypes since just only one object

// Element BOSS - object constructor
function boss() {
    this.position = createVector(widthPixels / 2, -10);
    this.dir = 1;
    this.vulnerable = false;
    this.initialized = false;
    this.dead = false;

    this.shoot = function () {
        if (!this.vulnerable) {
            shots.push(new shot(createVector(this.position.x, this.position.y + 3), 1));
            shots.push(new shot(createVector(this.position.x + 11, this.position.y + 3), 1));
        } else {
            if (random(3) > 2) {
                shots.push(new shot(createVector(this.position.x, this.position.y + 3), 1));
            }
            if (random(3) > 1) {
                shots.push(new shot(createVector(this.position.x + 11, this.position.y + 3), 1));
            }
        }
    };

    this.move = function () {

        if (this.initialized && !this.dead) {

            // check for borders reverse if needed
            if (this.position.x + globalDir * 4 > widthPixels - 10) {
                globalDir = -1;
            }
            if (this.position.x + globalDir * 4 < 0) {
                globalDir = 1;
            }

            this.position.x = this.position.x + globalDir * 4;

            // Shoot - everytime it moves
            this.shoot();
        } else {
            this.position.y = this.position.y + 1;
            if (this.position.y == 0) {
                this.initialized = true;
            }
        }
    };

    this.hit = function () {
        if (this.vulnerable) {
            this.dead = true;
            ghost.vulnerable = true;
        }
    };

    this.draw = function () {
        if (!this.dead) {
            if (!this.vulnerable) {
                fill(colors[2]);
            } else {
                fill(colors[4]);
            }
            rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize, pixelSize * 7 + 1, pixelSize + 1);
            rect(this.position.x * pixelSize + pixelSize, this.position.y * pixelSize + pixelSize, pixelSize * 2 + 1, pixelSize + 1);
            rect(this.position.x * pixelSize + pixelSize * 4, this.position.y * pixelSize + pixelSize, pixelSize * 3 + 1, pixelSize + 1);
            rect(this.position.x * pixelSize + pixelSize * 8, this.position.y * pixelSize + pixelSize, pixelSize * 2 + 1, pixelSize + 1);
            rect(this.position.x * pixelSize, this.position.y * pixelSize + pixelSize * 2, pixelSize * 11 + 1, pixelSize + 1);
            rect(this.position.x * pixelSize, this.position.y * pixelSize + pixelSize * 3, pixelSize + 1, pixelSize + 1);
            rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize + pixelSize * 3, pixelSize * 7 + 1, pixelSize + 1);
            rect(this.position.x * pixelSize + pixelSize * 10, this.position.y * pixelSize + pixelSize * 3, pixelSize + 1, pixelSize + 1);
            rect(this.position.x * pixelSize, this.position.y * pixelSize + pixelSize * 4, pixelSize + 1, pixelSize + 1);
            rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize + pixelSize * 4, pixelSize + 1, pixelSize + 1);
            rect(this.position.x * pixelSize + pixelSize * 8, this.position.y * pixelSize + pixelSize * 4, pixelSize + 1, pixelSize + 1);
            rect(this.position.x * pixelSize + pixelSize * 10, this.position.y * pixelSize + pixelSize * 4, pixelSize + 1, pixelSize + 1);
            rect(this.position.x * pixelSize + pixelSize * 3, this.position.y * pixelSize + pixelSize * 5, pixelSize * 2 + 1, pixelSize + 1);
            rect(this.position.x * pixelSize + pixelSize * 6, this.position.y * pixelSize + pixelSize * 5, pixelSize * 2 + 1, pixelSize + 1);
        }
    }
}

// Ghost element - object constructor
function pacmanGhost() {
    this.position = createVector(128, heightPixels - 5);
    this.dir = 1;
    this.vulnerable = false;

    this.draw = function () {
        if (!this.vulnerable) {
            fill(colors[2]);
        } else {
            fill(colors[4]);
        }

        rect(this.position.x * pixelSize + pixelSize, this.position.y * pixelSize, pixelSize * 3 + 1, pixelSize * 1 + 1);
        rect(this.position.x * pixelSize, this.position.y * pixelSize + pixelSize * 1, pixelSize * 1, pixelSize * 1 + 1);
        rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize + pixelSize * 1 + 1, pixelSize * 1, pixelSize * 1 + 1);
        rect(this.position.x * pixelSize + pixelSize * 4, this.position.y * pixelSize + pixelSize * 1 + 1, pixelSize * 1, pixelSize * 1 + 1);
        rect(this.position.x * pixelSize, this.position.y * pixelSize + pixelSize * 2, pixelSize * 5, pixelSize * 1 + 1);
        rect(this.position.x * pixelSize, this.position.y * pixelSize + pixelSize * 3, pixelSize * 5, pixelSize * 1 + 1);
        rect(this.position.x * pixelSize, this.position.y * pixelSize + pixelSize * 4, pixelSize * 1 + 1, pixelSize * 1 + 1);
        rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize + pixelSize * 4 + 1, pixelSize * 1, pixelSize * 1 + 1);
        rect(this.position.x * pixelSize + pixelSize * 4, this.position.y * pixelSize + pixelSize * 4 + 1, pixelSize * 1, pixelSize * 1 + 1);
    };

    // Checks if collided with player
    this.checkCollisionWithPlayer = function () {
        if (this.position.x >= player.position.x && this.position.x <= player.position.x + 5 || this.position.x + 5 >= player.position.x && this.position.x <= player.position.x + 5) {
            endGame();
        }
    };

    this.move = function () {
        if (moveTimeGhost.go()) {
            // Reverse the direction if vulnerable
            if (this.vulnerable) {
                this.dir = -2;
            }

            // Follow the player
            if (this.position.x - player.position.x > 0) {
                this.position.x = constrain(this.position.x - this.dir, 0, widthPixels - 5);
            } else {
                this.position.x = constrain(this.position.x + this.dir, 0, widthPixels - 5);
            }
        }
        this.checkCollisionWithPlayer();
    }
}

// Shot element - object constructor
// From - is vector position of the origin
// Dir is the direction of the shot
function shot(from, dir) {
    this.position = from;
    this.thenTime = millis();
    this.dir = dir;
}

// And its prototypes
shot.prototype.updateStatus = function () {
    var nowTime = floor(millis());
    var timePassed = nowTime - this.thenTime;
    if (timePassed > 60) {
        this.position.y = this.position.y + this.dir * 4;
        this.thenTime = nowTime;
    }
};
shot.prototype.outOfBoundary = function () {
    if (this.position.y < 0 || this.position.y > widthPixels) {
        return true
    } else {
        return false;
    }
};
shot.prototype.collided = function () {
    // Colisions with logo
    for (var i = logoPixels.length - 1; i >= 0; i--) {
        if (pointInRect(this.position.x * pixelSize, this.position.y * pixelSize, logoPixels[i].position.x * pixelSize, logoPixels[i].position.y * pixelSize, pixelSize * 4, pixelSize * 4)) {
            logoPixels[i].hit();

            // If pixel is at 0 HP, splice it
            if (logoPixels[i].dead()) {
                logoPixels.splice(i, 1);

                // If there are no more pixels left check who killed the last one
                if (logoPixels.length == 0) {

                    // If the bosses shot killed it - end the game
                    // Or if the logo got destroyed before the space invaders got killed
                    if (this.dir == 1 || spaceInvaders.length > 0) {
                        endGame();
                    } else {
                        // If the player killed it - make boss vulnerable
                        invaderBoss.vulnerable = true;
                    }
                }
            }
            return true;
        }
    }

    // Colisions with a space invader
    for (var i = spaceInvaders.length - 1; i >= 0; i--) {
        if (pointInRect(this.position.x * pixelSize, this.position.y * pixelSize, spaceInvaders[i].position.x * pixelSize, spaceInvaders[i].position.y * pixelSize, pixelSize * 5, pixelSize * 4)) {
            spaceInvaders[i].hit();
            if (spaceInvaders[i].isDead()) {
                spaceInvaders.splice(i, 1);
            }
            return true;
        }
    }

    // Collision with player ship
    if (pointInRect(this.position.x * pixelSize, this.position.y * pixelSize, player.position.x * pixelSize, player.position.y * pixelSize - pixelSize * 2, pixelSize * 5, pixelSize * 2)) {
        player.hit();
        return true;
    }

    // Colisions with boss
    if (invaderBoss && this.dir == -1) {
        if (pointInRect(this.position.x * pixelSize, this.position.y * pixelSize, invaderBoss.position.x * pixelSize, invaderBoss.position.y * pixelSize, pixelSize * 12, pixelSize * 6)) {
            invaderBoss.hit();
            return true;
        }
    }

    return false;
};
shot.prototype.draw = function () {

    if (this.dir > 0) {
        fill(colors[2]);
    } else {
        fill(colors[0]);
    }
    rect(this.position.x * pixelSize, this.position.y * pixelSize, pixelSize, pixelSize * 2);
};

// Space Invader element - object constructor
function spaceInvader(stopAt) {
    this.position = createVector(40, 0);
    this.shotTime = millis();
    this.dead = false;
    this.stopAt = stopAt;
    this.initialized = false;
    this.shootingSpeed = random(300) + 123;
}

// And its prototypes
spaceInvader.prototype.getMidOfShip = function () {
    return createVector(this.position.x + 2, this.position.y + 7);
};
spaceInvader.prototype.isInitialized = function () {
    return this.initialized;
};
spaceInvader.prototype.move = function () {

    // check for borders reverse if needed
    if (this.position.x + globalDir > widthPixels - 10) {
        globalDir = -1;
    }
    if (this.position.x + globalDir < 0 + 5) {
        globalDir = 1;
    }

    // move only if not initialized or ALL initialized
    if (!this.initialized || allInvadersInitialized()) {

        this.position.x = this.position.x + tempDir * 4;

    }

    if (!this.isInitialized() && this.position.x == this.stopAt) {
        this.initialized = true;
    }

};
spaceInvader.prototype.isDead = function () {
    return this.dead;
};
spaceInvader.prototype.hit = function () {
    // todo voulnarable
    this.dead = true;
};
spaceInvader.prototype.draw = function () {

    // Shooting
    // Random or everytime facing player
    if (allInvadersInitialized()) {
        var nowTime = floor(millis());
        var timePassed = nowTime - this.shotTime;
        if (timePassed > this.shootingSpeed) {
            if (random(5) > 3 || this.position.x == player.position.x) {
                shots.push(new shot(this.getMidOfShip(), 1));
                this.shotTime = nowTime;
            } else {
                this.shotTime = nowTime;
            }
        }
    }

    //At the beginning draw just the first invader and others when at their start position
    if (this.isInitialized() || this.stopAt == 120) {
        fill(colors[2]);
        rect(this.position.x * pixelSize, this.position.y * pixelSize, pixelSize * 5 + 1, pixelSize + 1);
        rect(this.position.x * pixelSize, this.position.y * pixelSize + pixelSize * 1, pixelSize + 1, pixelSize + 1);
        rect(this.position.x * pixelSize, this.position.y * pixelSize + pixelSize * 2, pixelSize * 5 + 1, pixelSize + 1);
        rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize + pixelSize * 1, pixelSize + 1, pixelSize + 1);
        rect(this.position.x * pixelSize + pixelSize * 4, this.position.y * pixelSize + pixelSize * 1, pixelSize + 1, pixelSize + 1);
        rect(this.position.x * pixelSize + pixelSize * 3, this.position.y * pixelSize + pixelSize * 3, pixelSize + 1, pixelSize + 1);
        rect(this.position.x * pixelSize + pixelSize * 1, this.position.y * pixelSize + pixelSize * 3, pixelSize + 1, pixelSize + 1);
        rect(this.position.x * pixelSize + pixelSize * 4, this.position.y * pixelSize + pixelSize * 4, pixelSize + 1, pixelSize + 1);
        rect(this.position.x * pixelSize, this.position.y * pixelSize + pixelSize * 4, pixelSize + 1, pixelSize + 1);
    }
};

// Logo PIXEL element - object constructor
function logoPixel(x, y, special) {
    this.position = createVector(x, y);
    // Default are 2 hit needed (..except)
    this.life = 2;
    // Random "gray" (damaged) color
    this.halfColor = random(60);
    // Case if special for the draw function
    this.special = special || 0;
}

// And its prototypes
logoPixel.prototype.hit = function () {
    // 2 in 10 will be a direct kill
    if (random(10) > 8) {
        this.life = 0;
    } else {
        this.life--;
    }
};
logoPixel.prototype.dead = function () {
    if (this.life < 1) {
        return true;
    } else {
        return false;
    }
};
logoPixel.prototype.draw = function () {
    if (this.life == 2) {
        fill(0);
    }
    else {
        fill(70 + this.halfColor);
    }
    rect(this.position.x * pixelSize, this.position.y * pixelSize, pixelSize * 4 + 1, pixelSize * 4 + 1);
    if (this.special > 0) {

        // Change color according to the damage done
        if (this.life == 2) {
            fill(colors[2]);
        } else {
            fill(255, 70, 70);
        }

        // Special cases
        if (this.special == 1) {
            rect(this.position.x * pixelSize, this.position.y * pixelSize, pixelSize * 4 + 1, pixelSize * 2 + 1);
            rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize + pixelSize * 2, pixelSize * 2 + 1, pixelSize * 2 + 1);
        } else {
            rect(this.position.x * pixelSize + pixelSize * 2, this.position.y * pixelSize - 1, pixelSize * 2 + 1, pixelSize * 2 + 2);
        }

    }
};

// This method checks if all Space Invaders are on their positions
function allInvadersInitialized() {
    for (var i = 0; i < spaceInvaders.length; i++) {
        if (!spaceInvaders[i].isInitialized()) {
            return false;
        }
    }
    return true;
}

// Resized window. function that is ran everytime a size changes
function windowResized() {
    var calculated = calculateCanvasValues();
    resizeCanvas(calculated[0], calculated[1]);
}

// This method looks at the parent DIV and calculates new canvas size to fit
function calculateCanvasValues() {

    // (widthPixels/heightPixels) is the proportion value of the sides
    // Read the DIV current (new) size and adjust them to fit proportionally
    var tempWidth = canvasDiv.offsetWidth;
    var tempHeight = canvasDiv.offsetHeight;

    if (tempHeight * (widthPixels / heightPixels) > tempWidth) {
        tempHeight = tempWidth / (widthPixels / heightPixels);
    } else {
        tempWidth = tempHeight * (widthPixels / heightPixels);
    }

    // Calculate the one "logo" pixel size in pixels
    pixelSize = tempWidth / widthPixels;

    // Return the calculated values for new sizes
    return [tempWidth, tempHeight];
}

// Keyboard input
function checkKeyboard() {
    if (keyIsDown(moveLeftKeyCode) && !keyIsDown(moveRightKeyCode)) {
        player.move(1);
    }
    if (keyIsDown(moveRightKeyCode) && !keyIsDown(moveLeftKeyCode)) {
        player.move(-1);
    }
    return false;
}

// Keyboard input
function keyPressed() {
    // 32 key code is space
    if (keyCode === shootKeyCode && gameEnabled) {
        if (gameStage == 1) {
            shots.push(new shot(player.getMidOfShip(), -1));
        } else {
            if (gameStage == 2) {
                if(endScreenTime.sinceCreated() > 1000) {
                    resetGame();
                }
            } else {
                gameStage++;
                if (gameStage == 1) {
                    // Reset Timers and data
                    gameStarted = new customTimer();
                }
            }
        }
    }
    return false;
}

function endGame() {
    endScreenTime = new customTimer();
    hint = hints[floor(random(4))];
    gameStarted.stopTime();
    gameStage = 2;
}

function resetGame() {
    pushInitialData();
    gameStage = 0;
}

function drawStartScreen() {
    var animationDelay = 300;

    if (startScreenTime.overDelay()) {
        var currentValue = floor((startScreenTime.sinceCreated())) - startScreenTime.getDelay();

        fill(255, 255, 255, constrain(map(currentValue, 0, animationDelay, 0, 100), 0, 100));
        rect(0, 0, width, height);
        fill(255, 255, 255, 220);
        rect(constrain(map(currentValue, 0, animationDelay, -width, 0), -width, 0), (height / 20 * 7.5), width, height / 20 * 5);
        fill(50, 50, 50, 240);
        rect(constrain(map(currentValue, 0, animationDelay, width, 0), 0, width), (height / 20 * 8), width, height / 20 * 4);
        textSize(height / 20 * 2);
        textAlign(CENTER);
        fill(255, 255, 255, constrain(map(currentValue / 3 % 255, 0, animationDelay, 150, 255), 150, 255));
        text("PRESS SPACE TO PLAY", 0, (height / 20 * 9), width, height / 20 * 4);
    }
}

function drawEndScreen() {
    var animationDelay = 1500;

    var currentValue = endScreenTime.sinceCreated();
    fill(255, 255, 255, constrain(map(currentValue, 0, animationDelay, 0, 255), 0, 255));
    rect(0, 0, width, height);

    var tempText1 = "";
    var tempText2 = "";
    // Check if win or loose
    if (ghost.vulnerable) {
        // You won
        tempText1 = "YOU WON";
        tempText2 = "Your time  " + (floor(gameStarted.stoppedTime() / 1000)) + "  sec"

    } else {
        // You lost
        tempText1 = "GAME OVER";
        tempText2 = hint;
    }

    // TEXT
    textSize(height / 4);
    textAlign(CENTER);
    fill(0, 0, 0, constrain(map(currentValue - animationDelay, 0, animationDelay, 0, 255), 0, 255));
    text(tempText1, 0, height / 3, width, height);

    textSize(height / 9);
    fill(0, 0, 0, constrain(map(currentValue - animationDelay - animationDelay / 3, 0, animationDelay, 0, 255), 0, 255));
    text(tempText2, 0, height / 5 * 3, width, height);

    textSize(height / 12);
    textAlign(RIGHT);

    if (currentValue > animationDelay * 3.5) {
        fill(0, 0, 0, map(sin((currentValue / 8) % 360), -1, 1, 0, 255));
        text("space", 0, height / 5 * 4, width, height);
    }

}

/*
 This method is a way for me to easily track timers and manage delays
 */
function customTimer(delayMS) {
    this.delayMS = delayMS;
    this.lastCheck = millis();
    this.created = this.lastCheck;
    this.stopped;

    this.go = function () {
        var current = millis();
        if ((current - this.lastCheck) > this.delayMS) {
            this.lastCheck = millis();
            return true;
        } else {
            return false;
        }
    };

    this.overDelay = function () {
        return this.sinceCreated() > this.getDelay();
    };

    this.wasCreated = function () {
        return this.created;
    };

    this.sinceCreated = function () {
        return (millis() - this.wasCreated());
    };

    this.getDelay = function () {
        return this.delayMS;
    };
    this.stopTime = function () {
        this.stopped = millis();
    };
    this.stoppedTime = function () {
        return this.stopped - this.created;
    }
}

// Draw the extras and let them fade after game start
function drawLogoExtras() {

    if (gameStage == 0) {
        fill(colors[0]);
        rect(43.5 * pixelSize, 42 * pixelSize, pixelSize, pixelSize * 2);

        fill(colors[2]);
        rect(43.5 * pixelSize, 11 * pixelSize, pixelSize, pixelSize * 2);

        fill(colors[5]);
        rect(91.5 * pixelSize, 33 * pixelSize, pixelSize, pixelSize);
        rect(91.5 * pixelSize, 37 * pixelSize, pixelSize, pixelSize);
        rect(91.5 * pixelSize, 41 * pixelSize, pixelSize, pixelSize);
        rect(91.5 * pixelSize, 45 * pixelSize, pixelSize, pixelSize);
        rect(91.5 * pixelSize, 49 * pixelSize, pixelSize, pixelSize);
        rect(91.5 * pixelSize, 53 * pixelSize, pixelSize, pixelSize);
        rect(95.5 * pixelSize, 53 * pixelSize, pixelSize, pixelSize);
        rect(99.5 * pixelSize, 53 * pixelSize, pixelSize, pixelSize);
        rect(103.5 * pixelSize, 53 * pixelSize, pixelSize, pixelSize);

        fill(colors[0]);
        rect(88 * pixelSize, 0, pixelSize * 6, pixelSize * 2);
        rect(90 * pixelSize, 2 * pixelSize, pixelSize * 2, pixelSize * 2);

        fill(colors[1]);
        rect(109.5 * pixelSize, 51 * pixelSize, pixelSize * 3, pixelSize);
        rect(108.5 * pixelSize, 52 * pixelSize, pixelSize * 5, pixelSize);
        rect(110.5 * pixelSize, 53 * pixelSize, pixelSize * 3, pixelSize);
        rect(108.5 * pixelSize, 54 * pixelSize, pixelSize * 5, pixelSize);
        rect(109.5 * pixelSize, 55 * pixelSize, pixelSize * 3, pixelSize);
    }
}

// Push new / Reset old data
function pushInitialData() {

    startScreenTime = new customTimer(3000);

    player = new playerShip();
    ghost = new pacmanGhost();
    invaderBoss = null;
    shots = [];
    globalDir = 1;

    spaceInvaders = [];
    for (var i = 0; i < 7; i++) {
        spaceInvaders.push(new spaceInvader((4 + i) * 12));
    }

    logoPixels = [];
    // Stored pixel positions of the logo
    logoPixelPosition = [[0, 8], [0, 12], [0, 16], [0, 20], [0, 24], [0, 28], [0, 32], [0, 36], [0, 40], [0, 44], [4, 8], [4, 12], [4, 16], [4, 20], [4, 24], [4, 28], [4, 32], [4, 36], [4, 40], [4, 44], [8, 8], [8, 12], [8, 16], [8, 20], [8, 24], [8, 28], [8, 32], [8, 36], [8, 40], [8, 44], [12, 8], [12, 12], [12, 16], [12, 20], [12, 24], [12, 28], [12, 32], [12, 36], [12, 40], [12, 44], [16, 8], [16, 12], [20, 8], [20, 12], [24, 8], [24, 12], [24, 16], [24, 20], [24, 24], [24, 28], [24, 32], [24, 36], [24, 40], [24, 44], [28, 8], [28, 12], [28, 16], [28, 20], [28, 24], [28, 28], [28, 32], [28, 36], [28, 40], [28, 44], [32, 8], [32, 12], [32, 16], [32, 20], [32, 24], [32, 28], [32, 32], [32, 36], [32, 40], [32, 44], [36, 12], [36, 16], [36, 20], [36, 24], [36, 28], [36, 32], [36, 36], [36, 40], [36, 44], [48, 8], [48, 12], [48, 16], [48, 20], [48, 24], [48, 28], [48, 32], [48, 36], [48, 40], [48, 44], [52, 8], [52, 12], [52, 16], [52, 20], [52, 24], [52, 28], [52, 32], [52, 36], [52, 40], [52, 44], [56, 8], [56, 12], [56, 16], [56, 20], [56, 24], [56, 28], [56, 32], [56, 36], [56, 40], [56, 44], [60, 8], [60, 12], [60, 16], [60, 20], [60, 24], [60, 28], [60, 32], [60, 36], [60, 40], [60, 44], [64, 8], [64, 12], [64, 24], [64, 28], [68, 8], [68, 12], [68, 24], [68, 28], [72, 8], [72, 12], [72, 16], [72, 20], [72, 24], [72, 28], [72, 32], [72, 36], [72, 40], [72, 44], [76, 8], [76, 12], [76, 16], [76, 20], [76, 24], [76, 28], [76, 32], [76, 36], [76, 40], [76, 44], [80, 8], [80, 12], [80, 16], [80, 20], [80, 24], [80, 28], [80, 32], [80, 36], [80, 40], [80, 44], [84, 20], [84, 32], [84, 36], [84, 40], [84, 44], [96, 8], [96, 12], [96, 16], [96, 20], [96, 24], [96, 28], [96, 32], [96, 36], [96, 40], [96, 44], [100, 8], [100, 12], [100, 16], [100, 20], [100, 24], [100, 28], [100, 32], [100, 36], [100, 40], [100, 44], [104, 8], [104, 12], [104, 16], [104, 20], [104, 24], [104, 28], [104, 32], [104, 36], [104, 40], [104, 44], [108, 8], [108, 12], [108, 16], [108, 20], [108, 24], [108, 28], [108, 32], [108, 36], [108, 40], [108, 44], [112, 8], [112, 12], [112, 40], [112, 44], [116, 8], [116, 12], [116, 40], [116, 44], [120, 8], [120, 12], [120, 16], [120, 20], [120, 24], [120, 28], [120, 32], [120, 36], [120, 40], [120, 44], [124, 8], [124, 12], [124, 16], [124, 20], [124, 24], [124, 28], [124, 32], [124, 36], [124, 40], [124, 44], [128, 8], [128, 12], [128, 16], [128, 20], [128, 24], [128, 28], [128, 32], [128, 36], [128, 40], [128, 44], [132, 12], [132, 16], [132, 20], [132, 24], [132, 28], [132, 32], [132, 36], [132, 40]];

    for (var i = 0; i < 252; i++) {
        logoPixels.push(new logoPixel(logoPixelPosition[i][0], logoPixelPosition[i][1]));
    }

    // Extra ones (red parts, special 1 and special 2)
    logoPixels.push(new logoPixel(84, 12, 1));
    logoPixels.push(new logoPixel(84, 16, 2));
}

// This is the method to easily disable the game and see just the logo
function toggleGameEnabled() {
    gameEnabled = !gameEnabled;
}

// Method to check if a point is inside a rectangle
// Ty http://benmoren.com for inspiration
function pointInRect(pX, pY, rX, rY, rW, rH) {
    return (pX >= rX && pX <= rX + rW && pY >= rY && pY <= rY + rH);
}

// Logging just for easier access
function logg(text) {
    console.log(text);
}

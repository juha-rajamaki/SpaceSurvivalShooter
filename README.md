# Space Survival Shooter

A 3D space survival shooter game built with Three.js featuring realistic particle effects and progressive difficulty.

## Play the Game

Simply open `index.html` in your web browser to play!

## Features

- **3D Graphics**: Built with Three.js for smooth 3D rendering
- **Realistic Particles**: Dynamic particle effects for explosions, engine exhaust, and weapon fire
- **Progressive Difficulty**: Start with immediate action and face increasingly challenging waves
- **Multiple Enemy Types**:
  - Asteroids that break into smaller pieces
  - Aggressive enemy ships with AI
  - Proximity-triggered space mines
  - Gravitational black holes
- **Power-up System**:
  - Shield boost (blue) - Temporary invincibility
  - Weapon upgrade (red) - Triple shot
  - Speed boost (yellow) - Enhanced movement
  - Score multiplier (green) - Double points
- **Fast-paced Combat**: Quick fire rate and responsive controls

## Controls

- **Arrow Keys/WASD** - Move your space shuttle
- **Space** - Fire lasers
- **Shift** - Boost (when power-up active)
- **P** - Pause game

## Gameplay

Survive as long as possible through increasingly difficult waves of enemies. Each wave introduces more threats:
- **Waves 1-3**: Asteroids and enemy ships
- **Wave 4+**: Space mines added
- **Wave 7+**: Black holes appear

Destroy enemies to score points and collect power-ups to enhance your abilities!

## Technologies

- Three.js for 3D rendering
- Custom particle system with shaders
- Physics-based movement system
- Vanilla JavaScript (no framework dependencies)

## Files

- `index.html` - Main game page
- `game.js` - Core game logic
- `entities.js` - Player, enemies, and game objects
- `particles.js` - Particle effects system
- `physics.js` - Physics engine
- `powerups.js` - Power-up system
- `style.css` - UI styling

## Development

The game runs entirely in the browser with no build process required. Simply edit the JavaScript files and refresh to see changes.

## Credits

Created with assistance from Claude Code
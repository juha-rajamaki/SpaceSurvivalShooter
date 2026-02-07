class TouchControls {
    constructor(gameInput) {
        this.input = gameInput;
        this.enabled = false;
        this.joystickId = null;
        this.joystickOrigin = { x: 0, y: 0 };
        this.deadzone = 15;
        this.maxRadius = 60;
        this.buttonTouchIds = { fire: [], shield: [], missile: [] };

        this.createDOM();
        this.bindEvents();
    }

    createDOM() {
        // Main container
        this.container = document.createElement('div');
        this.container.id = 'touch-controls';

        // Joystick zone (left 40%)
        this.joystickZone = document.createElement('div');
        this.joystickZone.className = 'joystick-zone';

        this.joystickBase = document.createElement('div');
        this.joystickBase.className = 'joystick-base';

        this.joystickKnob = document.createElement('div');
        this.joystickKnob.className = 'joystick-knob';

        this.container.appendChild(this.joystickZone);
        this.container.appendChild(this.joystickBase);
        this.container.appendChild(this.joystickKnob);

        // Action buttons (right side)
        this.actionZone = document.createElement('div');
        this.actionZone.className = 'action-buttons';

        this.fireBtn = this.createButton('FIRE', 'touch-fire');
        this.shieldBtn = this.createButton('SHD', 'touch-shield');
        this.missileBtn = this.createButton('MSL', 'touch-missile');

        this.actionZone.appendChild(this.missileBtn);
        this.actionZone.appendChild(this.shieldBtn);
        this.actionZone.appendChild(this.fireBtn);

        this.container.appendChild(this.actionZone);

        document.getElementById('game-container').appendChild(this.container);
    }

    createButton(label, className) {
        const btn = document.createElement('div');
        btn.className = 'touch-btn ' + className;
        btn.textContent = label;
        return btn;
    }

    bindEvents() {
        // Joystick events
        this.joystickZone.addEventListener('touchstart', (e) => this.onJoystickStart(e), { passive: false });
        this.joystickZone.addEventListener('touchmove', (e) => this.onJoystickMove(e), { passive: false });
        this.joystickZone.addEventListener('touchend', (e) => this.onJoystickEnd(e), { passive: false });
        this.joystickZone.addEventListener('touchcancel', (e) => this.onJoystickEnd(e), { passive: false });

        // Action button events
        this.setupButtonTouch(this.fireBtn, 'fire');
        this.setupButtonTouch(this.shieldBtn, 'shield');
        this.setupButtonTouch(this.missileBtn, 'missile');
    }

    onJoystickStart(e) {
        e.preventDefault();
        if (this.joystickId !== null) return;

        const touch = e.changedTouches[0];
        this.joystickId = touch.identifier;
        this.joystickOrigin = { x: touch.clientX, y: touch.clientY };

        // Position base where thumb touches
        this.joystickBase.style.left = (touch.clientX - 60) + 'px';
        this.joystickBase.style.top = (touch.clientY - 60) + 'px';
        this.joystickBase.style.display = 'block';
        this.joystickKnob.style.display = 'block';
        this.updateKnob(0, 0);
    }

    onJoystickMove(e) {
        e.preventDefault();
        for (const touch of e.changedTouches) {
            if (touch.identifier !== this.joystickId) continue;

            let dx = touch.clientX - this.joystickOrigin.x;
            let dy = touch.clientY - this.joystickOrigin.y;

            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > this.maxRadius) {
                dx = (dx / dist) * this.maxRadius;
                dy = (dy / dist) * this.maxRadius;
            }

            this.updateKnob(dx, dy);

            this.input.left = dx < -this.deadzone;
            this.input.right = dx > this.deadzone;
            this.input.up = dy < -this.deadzone;
            this.input.down = dy > this.deadzone;
        }
    }

    onJoystickEnd(e) {
        for (const touch of e.changedTouches) {
            if (touch.identifier !== this.joystickId) continue;
            this.joystickId = null;
            this.joystickBase.style.display = 'none';
            this.joystickKnob.style.display = 'none';
            this.input.left = false;
            this.input.right = false;
            this.input.up = false;
            this.input.down = false;
        }
    }

    updateKnob(dx, dy) {
        const baseRect = this.joystickBase.getBoundingClientRect();
        const centerX = baseRect.left + baseRect.width / 2;
        const centerY = baseRect.top + baseRect.height / 2;
        this.joystickKnob.style.left = (centerX + dx) + 'px';
        this.joystickKnob.style.top = (centerY + dy) + 'px';
    }

    setupButtonTouch(btn, inputKey) {
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = e.changedTouches[0].identifier;
            if (!this.buttonTouchIds[inputKey].includes(id)) {
                this.buttonTouchIds[inputKey].push(id);
            }
            this.input[inputKey] = true;
            btn.classList.add('active');
        }, { passive: false });

        btn.addEventListener('touchend', (e) => {
            for (const t of e.changedTouches) {
                const idx = this.buttonTouchIds[inputKey].indexOf(t.identifier);
                if (idx !== -1) {
                    this.buttonTouchIds[inputKey].splice(idx, 1);
                }
            }
            if (this.buttonTouchIds[inputKey].length === 0) {
                this.input[inputKey] = false;
                btn.classList.remove('active');
            }
        }, { passive: false });

        btn.addEventListener('touchcancel', (e) => {
            for (const t of e.changedTouches) {
                const idx = this.buttonTouchIds[inputKey].indexOf(t.identifier);
                if (idx !== -1) {
                    this.buttonTouchIds[inputKey].splice(idx, 1);
                }
            }
            if (this.buttonTouchIds[inputKey].length === 0) {
                this.input[inputKey] = false;
                btn.classList.remove('active');
            }
        }, { passive: false });
    }

    show() {
        this.container.style.display = 'block';
        this.enabled = true;
    }

    hide() {
        this.container.style.display = 'none';
        this.enabled = false;
        this.input.left = false;
        this.input.right = false;
        this.input.up = false;
        this.input.down = false;
        this.input.fire = false;
        this.input.shield = false;
        this.input.missile = false;
        this.joystickId = null;
        this.joystickBase.style.display = 'none';
        this.joystickKnob.style.display = 'none';
        Object.keys(this.buttonTouchIds).forEach(k => this.buttonTouchIds[k] = []);
        this.fireBtn.classList.remove('active');
        this.shieldBtn.classList.remove('active');
        this.missileBtn.classList.remove('active');
    }
}

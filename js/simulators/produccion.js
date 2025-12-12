// Production Line Simulator with Three.js

// Scene Setup
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a2e);
// Add some fog for depth
scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
camera.position.set(15, 12, 12);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.shadowMap.enabled = true;
container.appendChild(renderer.domElement);

// Controls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;

// Lights
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 5);
dirLight.castShadow = true;
scene.add(dirLight);

// --- Game Assets ---

// Textures (Procedural/Colors)
const beltMaterial = new THREE.MeshPhongMaterial({ color: 0x333333 });
const metalMaterial = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8, roughness: 0.2 });
const sensorMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 }); // Default green
const beamMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0.3 });

// Conveyor Belt 1 (Main) - Moving along X axis
const createConveyor = (x, y, z, length, width) => {
    const geometry = new THREE.BoxGeometry(length, 0.5, width);
    const mesh = new THREE.Mesh(geometry, beltMaterial);
    mesh.position.set(x, y, z);
    mesh.receiveShadow = true;
    scene.add(mesh);
    
    // Add legs
    const legGeo = new THREE.CylinderGeometry(0.1, 0.1, 3);
    const legMat = metalMaterial;
    
    [
        {lx: -length/2 + 0.5, lz: -width/2 + 0.2},
        {lx: length/2 - 0.5, lz: -width/2 + 0.2},
        {lx: -length/2 + 0.5, lz: width/2 - 0.2},
        {lx: length/2 - 0.5, lz: width/2 - 0.2}
    ].forEach(pos => {
        const leg = new THREE.Mesh(legGeo, legMat);
        leg.position.set(x + pos.lx, y - 1.75, z + pos.lz);
        scene.add(leg);
    });

    return mesh;
};

const mainBelt = createConveyor(0, 0, 0, 20, 3);

// Conveyor Belt 2 (Sorted) - Perpendicular, triggers on Z axis
// Placed at the piston location
const sortBelt = createConveyor(0, 0, 5, 3, 8); // Perpendicular roughly
// Fix sort belt orientation/position visually if needed
sortBelt.rotation.y = Math.PI / 2;
sortBelt.position.set(0, 0, 5.5); // Shifted over

// Sensor
const sensor = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshLambertMaterial({color: 0x333333}));
sensor.position.set(-4, 2, -2);
scene.add(sensor);

// Laser Beam
const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 5);
const beam = new THREE.Mesh(beamGeo, beamMaterial);
beam.rotation.x = Math.PI / 2;
beam.position.set(-4, 1, 0.5); // Across the belt
scene.add(beam);

// Piston (Actuator)
const cylinderBase = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 2), metalMaterial);
cylinderBase.rotation.z = Math.PI / 2;
cylinderBase.position.set(0, 1, -2.5); // Behind the belt at x=0
scene.add(cylinderBase);

const pistonHead = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2), new THREE.MeshStandardMaterial({color: 0xcccccc}));
pistonHead.rotation.z = Math.PI / 2;
pistonHead.position.set(0, 1, -2); // Inside cylinder
scene.add(pistonHead);

// State
let isRunning = false;
let boxes = [];
let targetColor = null; // Color to sort
let speed = 0.1;

// Helper to create box
function spawnBox() {
    const colors = [0xff0000, 0x00ff00, 0x0000ff]; // Red, Green, Blue
    const color = colors[Math.floor(Math.random() * colors.length)];
    
    const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const material = new THREE.MeshStandardMaterial({ color: color });
    const box = new THREE.Mesh(geometry, material);
    
    box.position.set(-10, 1.25, 0); // Start of belt
    box.castShadow = true;
    box.receiveShadow = true;
    
    // Custom properties
    box.userData = {
        color: color,
        sorted: false,
        sorting: false, // In process of being pushed
        sortProgress: 0,
        taggedForSort: false
    };
    
    scene.add(box);
    boxes.push(box);
}

// Stats
let totalCount = 0;
let sortedCount = 0;

// Logic Loop
function animate() {
    requestAnimationFrame(animate);
    
    const delta = 0.016; // Approx 60fps
    
    if (isRunning) {
        // Spawn boxes periodically
        if (Math.random() < 0.01) { // 1% chance per frame
            // Check if last box is far enough
            const lastBox = boxes[boxes.length-1];
            if (!lastBox || lastBox.position.x > -7) {
                 spawnBox();
                 totalCount++;
                 document.getElementById('total-count').innerText = totalCount;
            }
        }

        // Update Boxes
        boxes.forEach((box, index) => {
            if (box.userData.sorted) {
                // Moving on sort belt (Z axis +)
                box.position.z += speed;
                if (box.position.z > 10) {
                    scene.remove(box);
                    boxes.splice(index, 1);
                }
            } else if (box.userData.sorting) {
                // Moving physically by piston (Z axis)
                box.position.z += 0.2; // Push speed
                box.userData.sortProgress += 0.2;
                if (box.userData.sortProgress >= 3) {
                    box.userData.sorting = false;
                    box.userData.sorted = true;
                    // Reset piston visual would ideally be here or decoupled
                }
            } else {
                // Moving on main belt (X axis)
                box.position.x += speed;

                // Sensor Logic (at x = -4)
                if (Math.abs(box.position.x - (-4)) < 0.5) {
                   // Visual feedback on sensor?
                }

                // Trigger Zone (at x = 0)
                if (Math.abs(box.position.x - 0) < 0.1 && !box.userData.taggedForSort) {
                    // Check logic
                    if (targetColor !== null && box.userData.color === parseInt(targetColor)) {
                        box.userData.taggedForSort = true;
                        activatePiston(box);
                    }
                }

                // End of line
                if (box.position.x > 10) {
                    scene.remove(box);
                    boxes.splice(index, 1);
                }
            }
        });
    }

    // Piston Animation
    if (pistonAnimState.extending) {
        pistonHead.position.z += 0.2;
        if (pistonHead.position.z >= 1.5) {
            pistonAnimState.extending = false;
            pistonAnimState.retracting = true;
        }
    } else if (pistonAnimState.retracting) {
        pistonHead.position.z -= 0.1;
        if (pistonHead.position.z <= -2) {
            pistonHead.position.z = -2;
            pistonAnimState.retracting = false;
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

const pistonAnimState = {
    extending: false,
    retracting: false
};

function activatePiston(box) {
    pistonAnimState.extending = true;
    // Sync box movement
    box.userData.sorting = true;
    sortedCount++;
    document.getElementById('sorted-count').innerText = sortedCount;
}

// UI functions
function toggleSimulation() {
    isRunning = !isRunning;
    const btn = document.getElementById('start-btn');
    if (isRunning) {
        btn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
        btn.style.background = '#ff4444';
    } else {
        btn.innerHTML = '<i class="fas fa-play"></i> Continuar';
        btn.style.background = '';
    }
}

function setSensorRule(colorName, btn) {
    // Reset buttons
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    // Set logic
    targetColor = btn.dataset.color;
    
    // Update display
    const logicSpan = document.getElementById('logic-color');
    logicSpan.innerText = colorName.toUpperCase();
    logicSpan.style.color = btn.style.background;
    
    // Update sensor light color
    beam.material.color.setHex(parseInt(targetColor));
}

// Speed control
document.getElementById('speed-control').addEventListener('input', (e) => {
    speed = parseFloat(e.target.value) / 20; // Scale 1-5 to 0.05-0.25
});

// Init
speed = 2/20;
animate();

// Resize handler
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
});

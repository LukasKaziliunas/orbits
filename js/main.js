class Sphere {
    constructor(r, x, y, z, mass, texture, id) {
        this.prevTime2 = performance.now();
        const geometry = new THREE.SphereGeometry(r, 32, 32);
        let material;
        if (texture.color) {
            material = new THREE.MeshPhongMaterial({ color: texture.color });
        }
        else if (texture.map) {
            if (id == "sun")
                material = new THREE.MeshBasicMaterial({ map: texture.map });
            else
                material = new THREE.MeshPhongMaterial({ map: texture.map });
        }
        else {
            material = new THREE.MeshPhongMaterial({ color: 0xffffff });
        }
        if (id) {
            this.id = id;
        }
        const sphereMesh = new THREE.Mesh(geometry, material);
        sphereMesh.position.x = x;
        sphereMesh.position.y = y;
        sphereMesh.position.z = z;
        this.mesh = sphereMesh;
        this.mass = mass;
        this.r = r;
        this.gravityVelocityVector = new THREE.Vector3(0, 0, 0);
        this.velocityVector = new THREE.Vector3(0, 0, 0);
        this.inertiaVelocity = 0;
    }
    update(objects) {
        let timeNow = performance.now();
        let delta = (timeNow - this.prevTime2) / 1000; //kiek sekundziu praejo nuo paskutinio matavimo
        if (delta >= 1 / params.timeMultiplier) {
            this.removeArrows();
            let t = delta * params.timeMultiplier;
            this.setOrbitalVelocity(objects[0]);
            let gvec = this.calculate_g(objects, t);
            this.calculateOrbitalVel(gvec);
            this.calculateVelocity();
            if (!this.collision(objects)) {
                this.mesh.position.x += this.velocityVector.x / 1000000000 * t;
                this.mesh.position.y += this.velocityVector.y / 1000000000 * t;
                this.mesh.position.z += this.velocityVector.z / 1000000000 * t;
            }
            this.prevTime2 = performance.now();
        }
    }
    // padavus kito objecto posicijos vektoriu grazina atstuma iki jo.
    distance(otherSphere) {
        let d = this.mesh.position.distanceTo(otherSphere.getPosition());
        return d;
    }
    // padavus kito objecto pozicijos vektorių, grąžina normalizuotą krypties vektoriu kuris rodo i ta kita objekta nuo šito.
    directionVectorToOther(otherSphere) {
        let tempVec = new THREE.Vector3();
        tempVec.copy(otherSphere.getPosition());
        let dirVec = tempVec.sub(this.mesh.position).normalize();
        return dirVec;
    }
    // padavus kito objecto pozicijos vektoriu, grąžina normalizuotą krypties vektoriu kuris rodo nuo to kito objekti i šitą.
    directionVectorToThis(otherSphere) {
        let thisTempVec = new THREE.Vector3();
        thisTempVec.copy(this.mesh.position);
        let dirVec = thisTempVec.sub(otherSphere.getPosition()).normalize();
        return dirVec;
    }
    getPosition() {
        return this.mesh.position;
    }
    //gravitational accelaration g (towards center of attraction)
    calculate_g(objects, delta) {
        let gSum = new THREE.Vector3();
        let sumedVelocityFromAccelaration = new THREE.Vector3();
        //summ all gs
        for (let i = 0; i < objects.length; i++) {
            if (objects[i] != this) {
                let distance = this.distance(objects[i]) * 1000000000; // convert units to meters
                let g = G * objects[i].mass / Math.pow(distance, 2);
                let accelarationVector = this.directionVectorToOther(objects[i]); //normal vector to the object
                accelarationVector.multiplyScalar(g);
                gSum.add(accelarationVector);
            }
        }
        if (params.showArrows) {
            this.gravityArrow = new THREE.ArrowHelper(gSum.clone().normalize(), this.mesh.position, gSum.length() + this.r + 50, 0x00ff00);
            scene.add(this.gravityArrow);
        }
        sumedVelocityFromAccelaration = gSum.clone();
        sumedVelocityFromAccelaration.multiplyScalar(delta); // sec
        let newGravVel = new THREE.Vector3();
        newGravVel = newGravVel.addVectors(this.gravityVelocityVector.clone(), sumedVelocityFromAccelaration);
        if (params.showArrows) {
            this.gVelArrow = new THREE.ArrowHelper(newGravVel.clone().normalize(), this.mesh.position, newGravVel.length() / 100 + this.r * 2, 0x00ffff);
            scene.add(this.gVelArrow);
        }
        let test = this.directionVectorToOther(objects[0]);
        test.multiplyScalar(100);
        newGravVel.divideScalar(1);
        this.gravityVelocityVector = newGravVel;
        return gSum;
    }
    setOrbitalVelocity(object) {
        if (object == this) {
            this.inertiaVelocity = 0;
        }
        else {
            let mass = object.mass;
            let r = this.distance(object);
            this.inertiaVelocity = Math.sqrt(G * mass / (r * 100000000));
        }
    }
    calculateOrbitalVel(gVec) {
        var axis = new THREE.Vector3(0, -1, 0);
        var angle = 90 * (Math.PI / 180);
        let inertiaVector = gVec.clone().normalize();
        inertiaVector.applyAxisAngle(axis, angle);
        this.inertiaVelocityVector = inertiaVector.multiplyScalar(this.inertiaVelocity);
        if (params.showArrows) {
            this.inertiaArrow = new THREE.ArrowHelper(this.inertiaVelocityVector.clone().normalize(), this.mesh.position, this.inertiaVelocityVector.length() / 1000 + this.r * 2, 0x0000ff);
            scene.add(this.inertiaArrow);
        }
    }
    // adds gravitational and orbital velocities to get the actual velocity of an object
    calculateVelocity() {
        this.velocityVector.addVectors(this.gravityVelocityVector, this.inertiaVelocityVector);
        if (params.showArrows) {
            this.velocityArrow = new THREE.ArrowHelper(this.velocityVector.clone().normalize(), this.mesh.position, this.velocityVector.length() / 1000 + this.r * 2, 0xff0000);
            scene.add(this.velocityArrow);
        }
    }
    collision(objects) {
        if (params.allowCollisions) {
            let colides = false;
            for (let i = 0; i < objects.length; i++) {
                if (objects[i] != this) {
                    if (this.distance(objects[i]) <= this.r + objects[i].r)
                        colides = true;
                }
            }
            if (colides) {
                this.velocityVector = new THREE.Vector3(0, 0, 0);
            }
            return colides;
        }
        else {
            return false;
        }
    }
    removeArrows() {
        scene.remove(this.velocityArrow);
        scene.remove(this.inertiaArrow);
        scene.remove(this.gVelArrow);
        scene.remove(this.gravityArrow);
    }
}
//********************************************************** */
//1 unit = 1000 000 km
const G = 0.0000000000667; //gravitacine konstanta
var cameraSpeed = 1;
let camera, scene, renderer;
let controls;
var grid = new THREE.GridHelper(10000, 100, 0xffffff, 0xffffff);
let sun, mercury, venus, moon, earth, mars, jupiter, saturn, uranus, neptune, pluto;
let objects = [];
const params = {
    showGrid: false,
    showArrows: false,
    increaseSize: false,
    allowCollisions: true,
    timeMultiplier: 1,
};
init();
animate();
function init() {
    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 20000);
    camera.position.z = 0;
    camera.position.y = 100;
    camera.position.x = 0;
    scene = new THREE.Scene();
    createPlanets(1);
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth - 10, window.innerHeight - 18);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    document.body.appendChild(renderer.domElement);
    // @ts-ignore
    //controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls = new THREE.PointerLockControls(camera, renderer.domElement);
    scene.add(controls.getObject());
    window.addEventListener('resize', onWindowResize, false);
    const light = new THREE.PointLight(0xffffff, 2, 10000);
    light.position.set(0, 0, 0);
    light.castShadow = true;
    scene.add(light);
    const Ambientlight = new THREE.AmbientLight(0x404040, 1); // soft white light
    scene.add(Ambientlight);
    scene.background = new THREE.TextureLoader().load("images/stars.jpg");
    addGui();
    camera.lookAt(new THREE.Vector3(0, 0, 0));
}
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}
function animate() {
    requestAnimationFrame(animate);
    objects.forEach(object => {
        object.update(objects);
    });
    renderer.render(scene, camera);
    console.log("speed " + cameraSpeed);
}
function roundPrecised(number, precision) {
    var power = Math.pow(10, precision);
    return Math.round(number * power) / power;
}
window.addEventListener('keydown', function (event) {
    const key = event.key;
    onKeyDown(key);
});
function onKeyDown(key) {
    switch (key) {
        case "ArrowUp":
            moveCamera(1);
            break;
        case "ArrowDown":
            moveCamera(2);
            break;
        case "ArrowRight":
            moveCamera(3);
            break;
        case "ArrowLeft":
            moveCamera(4);
            break;
        case "w":
            moveCamera(1);
            break;
        case "s":
            moveCamera(2);
            break;
        case "d":
            moveCamera(3);
            break;
        case "a":
            moveCamera(4);
            break;
    }
}
function toggleGrid() {
    if (params.showGrid) {
        scene.add(grid);
    }
    else {
        scene.remove(grid);
    }
}
function toggleSize() {
    if (params.increaseSize) {
        removePlanets();
        createPlanets(300);
    }
    else {
        removePlanets();
        createPlanets(1);
    }
}
function removePlanets() {
    objects.forEach(object => {
        scene.remove(object.mesh);
        object.removeArrows();
    });
    objects = [];
}
function createPlanets(sizeMulti) {
    // atstumai 1 unit = 1000 000 km
    //sun
    const sunTexture = new THREE.TextureLoader().load('images/sun.jpg');
    sun = new Sphere(0.696342 * clamp(sizeMulti, 1, 12), 0, 1, 0, 2e30, { map: sunTexture }, "sun");
    objects.push(sun);
    scene.add(sun.mesh);
    //mercury
    const mercuryTexture = new THREE.TextureLoader().load('images/mercury.jpg');
    mercury = new Sphere(0.0025 * sizeMulti, 58, 1, 0, 330e21, { map: mercuryTexture }, "mercury");
    objects.push(mercury);
    scene.add(mercury.mesh);
    //venus
    const venusTexture = new THREE.TextureLoader().load('images/venera.jpg');
    venus = new Sphere(0.00605 * sizeMulti, 108, 1, 0, 4.8e23, { map: venusTexture }, "venus");
    objects.push(venus);
    scene.add(venus.mesh);
    //earth
    const earthTexture = new THREE.TextureLoader().load('images/earth.png');
    earth = new Sphere(0.0065 * sizeMulti, 153, 1, 0, 5972e21, { map: earthTexture }, "earth");
    objects.push(earth);
    scene.add(earth.mesh);
    //mars
    const marsTexture = new THREE.TextureLoader().load('images/mars.jpg');
    mars = new Sphere(0.0034025 * sizeMulti, 227, 1, 0, 641e21, { map: marsTexture }, "mars");
    objects.push(mars);
    scene.add(mars.mesh);
    //jupiter
    const jupiterTexture = new THREE.TextureLoader().load('images/jupiter.jpg');
    jupiter = new Sphere(0.071492 * sizeMulti, 778, 1, 0, 1.898e27, { map: jupiterTexture }, "jupiter");
    objects.push(jupiter);
    scene.add(jupiter.mesh);
    //saturn
    const saturnTexture = new THREE.TextureLoader().load('images/saturn.jpg');
    saturn = new Sphere(0.060268 * sizeMulti, 1426, 1, 0, 568e24, { map: saturnTexture }, "saturn");
    objects.push(saturn);
    scene.add(saturn.mesh);
    //uranus
    const uranusTexture = new THREE.TextureLoader().load('images/uranus.jpg');
    uranus = new Sphere(0.025559 * sizeMulti, 2870, 1, 0, 86e24, { map: uranusTexture }, "uranus");
    objects.push(uranus);
    scene.add(uranus.mesh);
    //neptune
    const neptuneTexture = new THREE.TextureLoader().load('images/neptune.jpg');
    neptune = new Sphere(0.024764 * sizeMulti, 4498, 1, 0, 102e24, { map: neptuneTexture }, "neptune");
    objects.push(neptune);
    scene.add(neptune.mesh);
    //pluto
    const plutoTexture = new THREE.TextureLoader().load('images/pluto.png');
    pluto = new Sphere(0.001151 * sizeMulti, 5900, 1, 0, 1.3e22, { map: plutoTexture }, "pluto");
    objects.push(pluto);
    scene.add(pluto.mesh);
}
//moon
/* let moonInertiaDir = new THREE.Vector3(0,1,0);
 const moonTexure = new THREE.TextureLoader().load( 'moon.png' );
 moon = new Sphere(20, -2000,-100,1800, 5000, moonInertiaDir, 0, {map : moonTexure}, "moon")
 objects.push(moon);
 scene.add(moon.mesh);*/
function clamp(number, min, max) {
    if (number >= max)
        return max;
    else if (number <= min)
        return min;
    else
        return number;
}
function addGui() {
    // @ts-ignore
    const gui = new dat.GUI();
    gui.add(params, 'showGrid').name('Grid (G) ').onChange(function (value) {
        toggleGrid();
    });
    gui.add(params, 'showArrows').name('Vectors (A)').onChange(function (value) {
        if (!value) {
            objects.forEach(object => {
                object.removeArrows();
            });
        }
    });
    gui.add(params, 'increaseSize').name('Increase sizes (R) ').onChange(function (value) {
        toggleSize();
    });
    gui.add(params, 'allowCollisions').name('Collisions ').onChange(function (value) { });
    gui.add(params, 'timeMultiplier', 1, 150000, 1).name('Time speed').onChange(function (value) {
    });
}
renderer.domElement.addEventListener('mousedown', function () {
    controls.lock();
});
renderer.domElement.addEventListener('mouseup', function () {
    controls.unlock();
});
renderer.domElement.addEventListener('wheel', function (event) {
    if (event.deltaY < 0) {
        cameraSpeed += 0.01;
        cameraSpeed = clamp(cameraSpeed, 0, 100);
    }
    else if (event.deltaY > 0) {
        cameraSpeed -= 0.01;
        cameraSpeed = clamp(cameraSpeed, 0, 100);
    }
});
function moveCamera(direction) {
    let cameraDirectionVector = cameraDirection(); //normal vector where camera is pointing
    switch (direction) {
        case 1: //up
            camera.position.x += cameraDirectionVector.x * cameraSpeed;
            camera.position.y += cameraDirectionVector.y * cameraSpeed;
            camera.position.z += cameraDirectionVector.z * cameraSpeed;
            break;
        case 2: //down
            camera.position.x += cameraDirectionVector.x * cameraSpeed * -1;
            camera.position.y += cameraDirectionVector.y * cameraSpeed * -1;
            camera.position.z += cameraDirectionVector.z * cameraSpeed * -1;
            break;
        case 3: //right
            let rightVector = turnVectorRight(cameraDirectionVector);
            camera.position.x += rightVector.x * cameraSpeed;
            camera.position.y += rightVector.y * cameraSpeed;
            camera.position.z += rightVector.z * cameraSpeed;
            break;
        case 4: //left
            let lefttVector = turnVectorLeft(cameraDirectionVector);
            camera.position.x += lefttVector.x * cameraSpeed;
            camera.position.y += lefttVector.y * cameraSpeed;
            camera.position.z += lefttVector.z * cameraSpeed;
            break;
    }
}
function cameraDirection() {
    var pLocal = new THREE.Vector3(0, 0, -1);
    var pWorld = pLocal.applyMatrix4(camera.matrixWorld);
    var dir = pWorld.sub(camera.position).normalize();
    //console.log(dir);
    return dir;
}
//vector - normal vector to turn
function turnVectorRight(vector) {
    var axis = new THREE.Vector3(0, -1, 0);
    var angle = 90 * (Math.PI / 180);
    let newVec = vector.clone();
    newVec.applyAxisAngle(axis, angle);
    return newVec;
}
function turnVectorLeft(vector) {
    var axis = new THREE.Vector3(0, 1, 0);
    var angle = 90 * (Math.PI / 180);
    let newVec = vector.clone();
    newVec.applyAxisAngle(axis, angle);
    return newVec;
}

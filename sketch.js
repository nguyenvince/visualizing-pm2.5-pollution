// Main sketch
let rate = 2;
let minSize = 1;
let maxSize = 5;
let fr = 10; //frameRate
let particle_count = 0; //num particle for main canvas
let factor = 10; //reduce number of displayed particle by a factor of

//main canvas
var main_canvas_p5;
var main_canvas = function(p) {
    p.setup = function() {
        p.canvas = p.createCanvas(p.windowWidth, p.windowHeight);
        p.frameRate(fr);
        p.noStroke();
        p.noLoop();
    };

    p.drawMainCanvas = function() {
        var particle_cycle = p.floor(current_number_concentration * air_per_sec / fr);
        for (let i = 0; i < particle_cycle / factor; i++) {
            p.fill(p.random(100, 255));
            p.ellipse(p.random(0, p.width), p.random(0, p.height), p.random(minSize, maxSize));
        }
        particle_count += particle_cycle;
        $("#particle-count").html(formatNumber(particle_count));
    };

    p.windowResized = function() {
        p.resizeCanvas(p.windowWidth, p.windowHeight);
    };

};

//comparision sketches
let outdoor_p5, protection_p5;
let comparison_sketch_particle; //reduced number of particles (mapped from mass_concentration) to draw on the sketches
let std = 5; //standard deviation proportion

var outdoor = function(p) {
    p.setup = function() {
        let w = $("#outdoor-wrapper").width();
        let h = 0.75 * w;
        p.canvas = p.createCanvas(w, h);
        p.noStroke();
        p.drawParticle(comparison_sketch_particle);
        p.noLoop();
    };

    p.drawParticle = function(rate) {
        for (let i = 0; i < rate; i++) {
            p.fill(p.random(100, 255));
            p.ellipse(p.randomGaussian(p.width / 2, p.width / std), p.randomGaussian(p.height / 2, p.height / std), p.random(minSize, maxSize));
        }
    };

    p.windowResized = function() {
        w = $("#protection-wrapper").width();
        h = 0.75 * w;
        p.resizeCanvas(w, h);
        p.drawParticle(comparison_sketch_particle);
    };
};
// var outdoor_p5 = new p5(outdoor, 'outdoor');

//protection canvas

let protection_index;
let protection_rate = [0.5, 0.3, 0.5, 0.95, 0.9995]; //indoor,cloth,surgical,n95,hepa
let protection_range = ['20%-70%', '10%-60%', '30%-80%', '95%', '99.95%']; //indoor,cloth,surgical,n95,hepa
var protection = function(p) {
    p.setup = function() {
        console.log($("#protection-wrapper").width());
        let w = $("#protection-wrapper").width();
        let h = 0.75 * w;
        p.canvas = p.createCanvas(w, h);
        p.noStroke();
        p.drawParticle((1 - protection_rate[0]) * comparison_sketch_particle);
        p.noLoop();
    };

    p.drawParticle = function(rate) {
        for (let i = 0; i < rate; i++) {
            p.fill(p.random(100, 255));
            p.ellipse(p.randomGaussian(p.width / 2, p.width / std), p.randomGaussian(p.height / 2, p.height / std), p.random(minSize, maxSize));
        }
    };


    p.windowResized = function() {
        w = $("#protection-wrapper").width();
        h = 0.75 * w;
        p.resizeCanvas(w, h);
        protection_p5.drawParticle((1 - protection_rate[protection_index]) * comparison_sketch_particle);
    };
};
// var protection_p5 = new p5(protection, 'protection');





//detect change in protection dropdown and redraw canvas
function changeProtection(val) {
    if (protection_p5) {
        protection_index = val;
        protection_p5.clear();
        protection_p5.drawParticle((1 - protection_rate[protection_index]) * comparison_sketch_particle);
        //update fields
        $("#protection-guideline").html(compareWHO(current_mass_concentration * (1 - protection_rate[protection_index])));
        $("#protection-reduction").html(protection_range[protection_index]);
    }
}

//init outdoor and protection canvas
function initCanvas() {
    //map rate from concentration 
    comparison_sketch_particle = current_mass_concentration * 100;
    //init canvases
    main_canvas_p5 = new p5(main_canvas, 'main-canvas');
    outdoor_p5 = new p5(outdoor, 'outdoor');
    protection_p5 = new p5(protection, 'protection');

    //particle counter function using setInterval
    let particle_counter = setInterval(function() {
        if (main_canvas_p5) {
            if (current_number_concentration) {
                main_canvas_p5.drawMainCanvas();
            }
        }
    }, 1 / fr * 1000); // 1 / fr * 1000 to get millisecond
}
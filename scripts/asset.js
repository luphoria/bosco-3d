// Assets
// Handles loading of models and textures from external files

class Texture {
    constructor(filename) {
        //Initialize the texture with a placeholder
        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA,
            gl.UNSIGNED_BYTE,
            new Uint8Array([0, 0, 255, 255]));

        //Asynchronously load the real texture
        var image = new Image();
        image.src = filename;
        var me = this;
        image.addEventListener('load', function() {
            gl.bindTexture(gl.TEXTURE_2D, me.texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
                image);
            //set texture parameters
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            //generate mipmap
            gl.generateMipmap(gl.TEXTURE_2D);
            confirm_asset_loaded();
        });
    }
}

class Model {
    constructor(obj_filename) {
        this.program_holder = program_holder_texture;

        //fetch the object file
        var me = this;
        fetch(obj_filename)
        .then(response => response.text())
        .then((obj_string) => {
            var obj_file = loadOBJFromString(obj_string);

            var positions = obj_file.vertices;
            var texcoords = obj_file.tex_vertices;
            me.load_data(positions, texcoords);
            me.loaded = true;
            confirm_asset_loaded();
        });

        //"base" transformation matrix:
        //the models' .obj files as-is need to be rotated and scaled
        //(note: the scale and rotation here are unique to the models
        //designed for Bosco-3D; different model production workflows
        //may require different base-transforms)
        this.base_transform = m4.identity();
        this.base_transform = m4.scale(this.base_transform,
            0.2, 0.2, 0.2);
        this.base_transform = m4.rotate_y(this.base_transform,
            Math.PI * 3 / 2);
    }

    load_data(positions, texcoords) {
        this.vao = setup_textured_object(this.program_holder,
            positions, texcoords);
        this.num_vertices = positions.length / 3;
    }

    render(model_matrix) {
        //apply model's base transformation matrix
        model_matrix = m4.multiply(model_matrix,
            this.base_transform);

        gl.useProgram(this.program_holder.program);
        gl.bindVertexArray(this.vao);
        var uModelMatrixLoc = this.program_holder.locations.uModelMatrixLoc;
        gl.uniformMatrix4fv(uModelMatrixLoc, false, model_matrix);
        gl.drawArrays(gl.TRIANGLES, 0, this.num_vertices);
    }
}

class Model_ColorOnly {
    constructor(obj_filename) {
        this.program_holder = program_holder_color;

        //fetch the object file
        var me = this;
        fetch(obj_filename)
        .then(response => response.text())
        .then((obj_string) => {
            var obj_file = loadOBJFromString(obj_string, true);

            var positions = obj_file.vertices;
            var colors = [];
            for (var i = 0; i < positions.length / 3; i++) {
                colors.push(1, 1, 0.5);
            }
            me.load_data(positions, colors);
        });

        //"base" transformation matrix
        this.base_transform = m4.identity();
    }

    load_data(positions, colors) {
        this.vao = setup_color_object(positions, colors);
        this.num_vertices = positions.length / 3;
    }

}

// Audio assets: loading and playing
var audio_context;
window.addEventListener('load', init_audio, false);

function init_audio() {
    try {
        window.AudioContext = window.AudioContext || window.webkitAudioContext;
        audio_context = new AudioContext();
        for (const sound_name in sounds) {
            sounds[sound_name].load();
        }
    } catch(e) {
        console.error("Error: Web Audio API not supported.");
    }
}

class Sound {
    constructor(path) {
        this.loaded = false;
        this.path = path;
    }

    load() {
        var me = this;
        fetch(this.path)
        .then(response => response.arrayBuffer())
        .then((data) => {
            audio_context.decodeAudioData(data,
                buffer => {
                    this.audio_buffer = buffer;
                    me.loaded = true;
                    confirm_asset_loaded();
                }, error => {
                    console.error(error);
                }
            );
        })
    }

    play() {
        if (!this.loaded) {
            console.error('Error: Attempting to play unloaded sound');
        } else {
            var source = audio_context.createBufferSource();
            source.buffer = this.audio_buffer;
            source.connect(audio_context.destination);
            source.start(0);
        }
    }
}

// Load texture assets
var textures = {
    player:         new Texture("models/player_tex.png"),
    enemy_i:        new Texture("models/enemy_i_tex.png"),
    enemy_p:        new Texture("models/enemy_p_tex.png"),
    enemy_e:        new Texture("models/enemy_e_tex.png"),
    enemy_spy:      new Texture("models/enemy_spy_tex.png"),
    enemy_p_alt:    new Texture("models/enemy_p_alt_tex.png"),
    base_core_side: new Texture("models/base_core_side_tex.png"),
    base_ball:      new Texture("models/base_ball_tex.png"),
    base_ball_d:    new Texture("models/base_ball_destroyed_tex.png"),
    base_crystal:   new Texture("models/base_crystal_tex.png"),
    cosmo_mine:     new Texture("models/cosmo_mine_tex.png"),
    asteroid:       new Texture("models/asteroid_tex.png"),
}

// Load model assets
var models = {
    player:         new Model("models/player.obj"),
    enemy_i:        new Model("models/enemy_i.obj"),
    enemy_p:        new Model("models/enemy_p.obj"),
    enemy_e:        new Model("models/enemy_e.obj"),
    enemy_spy:      new Model("models/enemy_spy.obj"),
    base_core_side: new Model("models/base_core_side.obj"),
    base_ball:      new Model("models/base_ball.obj"),
    base_ball_d_c:  new Model("models/base_ball_destroyed_corner.obj"),
    base_ball_d_s:  new Model("models/base_ball_destroyed_side.obj"),
    base_arm:       new Model("models/base_arm.obj"),
    base_crystal:   new Model("models/base_crystal.obj"),
    cosmo_mine:     new Model("models/cosmo_mine.obj"),
    asteroid1:      new Model("models/asteroid1.obj"),
}

// Load sound assets
var sounds = {
    player_shoot:       new Sound('audio/shoot.wav'),
    base_cannon_hit:    new Sound('audio/cannon-hit.wav'),
    blast_off:          new Sound('audio/blast-off.wav'),
    e_type_hit:         new Sound('audio/e-type-hit.wav'),
    p_type_hit:         new Sound('audio/p-type-hit.wav'),
    i_type_spy_hit:     new Sound('audio/i-type-spy-hit.wav'),
    mine_hit:           new Sound('audio/boom.wav'),
    asteroid_hit:       new Sound('audio/asteroid-hit.wav'),
};


extends Node2D

const WORLD_SIZE := Vector2(2800, 1600)
const SPEED := 300.0
const INTERACT_RANGE := 115.0

const ASSETS := {
    "abram": "res://assets/abram.svg",
    "sarai": "res://assets/sarai.svg",
    "lot": "res://assets/lot.svg",
    "sheep": "res://assets/sheep.svg",
    "camel": "res://assets/camel.svg",
    "tent": "res://assets/tent.svg",
    "palm": "res://assets/palm.svg",
    "bundle": "res://assets/bundle.svg",
    "gate": "res://assets/gate.svg",
    "marker": "res://assets/marker.svg"
}

var player: Sprite2D
var sarai: Sprite2D
var lot: Sprite2D
var supplies: Array[Sprite2D] = []
var sheep: Array[Sprite2D] = []
var followers: Array[Sprite2D] = []
var checkpoints: Array[Sprite2D] = []
var objective_index := 0
var supplies_collected := 0
var sheep_collected := 0
var checkpoint_index := 0
var move_state := {"up": false, "down": false, "left": false, "right": false}
var objective_label: Label
var prompt_label: Label
var progress_label: Label
var dialog_panel: ColorRect
var dialog_label: Label
var completed := false
var last_player_positions: Array[Vector2] = []

var objectives := [
    "Speak with Sarai and prepare to leave Haran.",
    "Find Lot and bring him with the caravan.",
    "Gather 3 supply bundles for the journey.",
    "Gather the 3 sheep into the caravan.",
    "Lead the caravan out through Haran's eastern gate.",
    "Follow the marked road through the wilderness to Canaan."
]

func _ready() -> void:
    _build_world_props()
    _build_characters()
    _build_ui()
    _show_story("GENESIS 12:1 — KJV\n\nNow the LORD had said unto Abram, Get thee out of thy country, and from thy kindred, and from thy father's house, unto a land that I will shew thee.\n\nMISSION: Prepare the caravan and obey God's command to go.")
    _update_objective()

func _process(delta: float) -> void:
    if completed:
        return
    var dir := Vector2.ZERO
    if move_state["up"] or Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP): dir.y -= 1.0
    if move_state["down"] or Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN): dir.y += 1.0
    if move_state["left"] or Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT): dir.x -= 1.0
    if move_state["right"] or Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT): dir.x += 1.0
    if dir.length() > 0.0:
        dir = dir.normalized()
        player.position += dir * SPEED * delta
        player.position.x = clamp(player.position.x, 110.0, WORLD_SIZE.x - 110.0)
        player.position.y = clamp(player.position.y, 110.0, WORLD_SIZE.y - 110.0)
        player.rotation = sin(Time.get_ticks_msec() * 0.015) * 0.015
        if dir.x != 0.0:
            player.flip_h = dir.x < 0.0
    else:
        player.rotation = lerp(player.rotation, 0.0, 0.2)

    last_player_positions.push_front(player.position)
    if last_player_positions.size() > 220:
        last_player_positions.pop_back()
    _move_followers(delta)
    _check_progress_zones()
    _update_prompt()

func _unhandled_input(event: InputEvent) -> void:
    if event is InputEventKey and event.pressed and not event.echo:
        if event.keycode == KEY_E or event.keycode == KEY_SPACE:
            _interact()

func _build_world_props() -> void:
    for p in [Vector2(260,360), Vector2(680,360), Vector2(260,900), Vector2(690,900), Vector2(330,1110)]:
        _spawn("tent", p, 0.72)
    for p in [Vector2(150,330), Vector2(820,330), Vector2(150,1160), Vector2(820,1140), Vector2(2350,430), Vector2(2590,1030), Vector2(2380,1190)]:
        _spawn("palm", p, 0.7)
    _spawn("gate", Vector2(900,760), 0.88)
    _spawn("camel", Vector2(710,710), 0.72)

    for p in [Vector2(1110,650), Vector2(1380,820), Vector2(1620,700), Vector2(1980,820), Vector2(2220,720), Vector2(2490,720)]:
        var m := _spawn("marker", p, 0.48)
        m.modulate = Color(1,1,1,0.92)
        checkpoints.append(m)

func _build_characters() -> void:
    player = _spawn("abram", Vector2(480,710), 0.82)
    player.z_index = 20
    var camera := Camera2D.new()
    camera.position_smoothing_enabled = true
    camera.position_smoothing_speed = 7.0
    camera.limit_left = 0
    camera.limit_top = 0
    camera.limit_right = int(WORLD_SIZE.x)
    camera.limit_bottom = int(WORLD_SIZE.y)
    player.add_child(camera)
    camera.make_current()

    sarai = _spawn("sarai", Vector2(330,690), 0.77)
    lot = _spawn("lot", Vector2(720,1035), 0.77)

    for p in [Vector2(260,520), Vector2(545,390), Vector2(760,520)]:
        supplies.append(_spawn("bundle", p, 0.58))
    for p in [Vector2(220,1110), Vector2(520,1090), Vector2(760,1120)]:
        sheep.append(_spawn("sheep", p, 0.62))

func _build_ui() -> void:
    var ui := CanvasLayer.new()
    add_child(ui)

    var top := ColorRect.new()
    top.color = Color(0.055, 0.045, 0.032, 0.90)
    top.set_anchors_preset(Control.PRESET_TOP_WIDE)
    top.offset_bottom = 116
    ui.add_child(top)

    var title_label := Label.new()
    title_label.text = "AB001 • GET THEE OUT OF THY COUNTRY"
    title_label.position = Vector2(22, 10)
    title_label.add_theme_font_size_override("font_size", 25)
    title_label.add_theme_color_override("font_color", Color("#f5d474"))
    top.add_child(title_label)

    objective_label = Label.new()
    objective_label.position = Vector2(22, 48)
    objective_label.size = Vector2(920, 58)
    objective_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    objective_label.add_theme_font_size_override("font_size", 20)
    top.add_child(objective_label)

    progress_label = Label.new()
    progress_label.anchor_left = 1.0
    progress_label.anchor_right = 1.0
    progress_label.offset_left = -290
    progress_label.offset_right = -18
    progress_label.offset_top = 20
    progress_label.offset_bottom = 96
    progress_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
    progress_label.add_theme_font_size_override("font_size", 18)
    progress_label.add_theme_color_override("font_color", Color("#eee2c2"))
    top.add_child(progress_label)

    prompt_label = Label.new()
    prompt_label.anchor_left = 0.5
    prompt_label.anchor_right = 0.5
    prompt_label.anchor_top = 1.0
    prompt_label.anchor_bottom = 1.0
    prompt_label.offset_left = -280
    prompt_label.offset_right = 280
    prompt_label.offset_top = -116
    prompt_label.offset_bottom = -74
    prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    prompt_label.add_theme_font_size_override("font_size", 20)
    prompt_label.add_theme_color_override("font_color", Color("#fff0ae"))
    ui.add_child(prompt_label)

    _make_move_button(ui, "▲", Vector2(0,-1), Vector2(100,-210))
    _make_move_button(ui, "▼", Vector2(0,1), Vector2(100,-70))
    _make_move_button(ui, "◀", Vector2(-1,0), Vector2(30,-140))
    _make_move_button(ui, "▶", Vector2(1,0), Vector2(170,-140))

    var action := Button.new()
    action.text = "ACTION"
    action.anchor_left = 1.0
    action.anchor_right = 1.0
    action.anchor_top = 1.0
    action.anchor_bottom = 1.0
    action.offset_left = -172
    action.offset_right = -28
    action.offset_top = -174
    action.offset_bottom = -46
    action.add_theme_font_size_override("font_size", 22)
    action.pressed.connect(_interact)
    ui.add_child(action)

    dialog_panel = ColorRect.new()
    dialog_panel.color = Color(0.04, 0.03, 0.02, 0.96)
    dialog_panel.anchor_left = 0.5
    dialog_panel.anchor_right = 0.5
    dialog_panel.anchor_top = 0.5
    dialog_panel.anchor_bottom = 0.5
    dialog_panel.offset_left = -390
    dialog_panel.offset_right = 390
    dialog_panel.offset_top = -200
    dialog_panel.offset_bottom = 200
    ui.add_child(dialog_panel)

    dialog_label = Label.new()
    dialog_label.position = Vector2(32, 28)
    dialog_label.size = Vector2(716, 270)
    dialog_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    dialog_label.add_theme_font_size_override("font_size", 23)
    dialog_label.add_theme_color_override("font_color", Color("#f8ebc8"))
    dialog_panel.add_child(dialog_label)

    var close := Button.new()
    close.text = "BEGIN MISSION"
    close.position = Vector2(270, 318)
    close.size = Vector2(240, 58)
    close.add_theme_font_size_override("font_size", 20)
    close.pressed.connect(func(): dialog_panel.visible = false)
    dialog_panel.add_child(close)

func _make_move_button(ui: CanvasLayer, text: String, direction: Vector2, anchor_offset: Vector2) -> void:
    var b := Button.new()
    b.text = text
    b.anchor_left = 0.0
    b.anchor_right = 0.0
    b.anchor_top = 1.0
    b.anchor_bottom = 1.0
    b.offset_left = anchor_offset.x
    b.offset_right = anchor_offset.x + 68
    b.offset_top = anchor_offset.y
    b.offset_bottom = anchor_offset.y + 68
    b.add_theme_font_size_override("font_size", 28)
    b.button_down.connect(_set_move.bind(direction, true))
    b.button_up.connect(_set_move.bind(direction, false))
    ui.add_child(b)

func _set_move(direction: Vector2, pressed: bool) -> void:
    if direction.y < 0: move_state["up"] = pressed
    if direction.y > 0: move_state["down"] = pressed
    if direction.x < 0: move_state["left"] = pressed
    if direction.x > 0: move_state["right"] = pressed

func _spawn(kind: String, pos: Vector2, scale_value: float) -> Sprite2D:
    var s := Sprite2D.new()
    s.texture = load(ASSETS[kind])
    s.position = pos
    s.scale = Vector2.ONE * scale_value
    s.z_index = 10
    $World.add_child(s)
    return s

func _move_followers(delta: float) -> void:
    for i in range(followers.size()):
        var f := followers[i]
        var history_index := min(20 + i * 23, last_player_positions.size() - 1)
        if history_index >= 0:
            var target := last_player_positions[history_index]
            f.position = f.position.lerp(target, min(1.0, delta * 5.0))
            if abs(target.x - f.position.x) > 3.0:
                f.flip_h = target.x < f.position.x

func _interact() -> void:
    if dialog_panel.visible:
        dialog_panel.visible = false
        return
    match objective_index:
        0:
            if player.position.distance_to(sarai.position) <= INTERACT_RANGE:
                _recruit(sarai)
                objective_index = 1
                _flash("Sarai joins Abram for the journey.")
        1:
            if player.position.distance_to(lot.position) <= INTERACT_RANGE:
                _recruit(lot)
                objective_index = 2
                _flash("Lot joins the caravan.")
        2:
            for item in supplies:
                if item.visible and player.position.distance_to(item.position) <= INTERACT_RANGE:
                    item.visible = false
                    supplies_collected += 1
                    _flash("Supply bundle gathered — %d/3" % supplies_collected)
                    if supplies_collected >= 3:
                        objective_index = 3
                    break
        3:
            for animal in sheep:
                if animal.visible and not followers.has(animal) and player.position.distance_to(animal.position) <= INTERACT_RANGE:
                    sheep_collected += 1
                    followers.append(animal)
                    _flash("Sheep gathered — %d/3" % sheep_collected)
                    if sheep_collected >= 3:
                        objective_index = 4
                    break
    _update_objective()

func _recruit(person: Sprite2D) -> void:
    if not followers.has(person):
        followers.append(person)

func _check_progress_zones() -> void:
    if objective_index == 4 and player.position.x > 970.0 and player.position.y > 600.0 and player.position.y < 930.0:
        objective_index = 5
        checkpoint_index = 0
        _flash("The caravan has left Haran. Follow the golden markers.")
        _update_objective()
    if objective_index == 5 and checkpoint_index < checkpoints.size():
        var marker := checkpoints[checkpoint_index]
        if player.position.distance_to(marker.position) < 100.0:
            marker.modulate = Color("#66e0a3")
            checkpoint_index += 1
            _flash("Journey checkpoint %d/%d" % [checkpoint_index, checkpoints.size()])
            _update_objective()
            if checkpoint_index >= checkpoints.size():
                _complete_mission()

func _update_prompt() -> void:
    var t := ""
    match objective_index:
        0:
            if player.position.distance_to(sarai.position) <= INTERACT_RANGE: t = "ACTION • Speak with Sarai"
        1:
            if player.position.distance_to(lot.position) <= INTERACT_RANGE: t = "ACTION • Speak with Lot"
        2:
            for item in supplies:
                if item.visible and player.position.distance_to(item.position) <= INTERACT_RANGE: t = "ACTION • Gather supplies"
        3:
            for animal in sheep:
                if not followers.has(animal) and player.position.distance_to(animal.position) <= INTERACT_RANGE: t = "ACTION • Gather sheep"
        4:
            t = "Lead the caravan through the open gate →"
        5:
            t = "Follow the golden road markers →"
    prompt_label.text = t

func _update_objective() -> void:
    objective_label.text = "OBJECTIVE: " + objectives[objective_index]
    var extra := ""
    if objective_index == 2: extra = "Supplies %d/3" % supplies_collected
    elif objective_index == 3: extra = "Flock %d/3" % sheep_collected
    elif objective_index == 5: extra = "Journey %d/%d" % [checkpoint_index, checkpoints.size()]
    else: extra = "Mission Step %d/6" % (objective_index + 1)
    progress_label.text = "GENESIS 12:1–5 • KJV\n" + extra

func _flash(message: String) -> void:
    prompt_label.text = message

func _show_story(text: String) -> void:
    dialog_label.text = text
    dialog_panel.visible = true

func _complete_mission() -> void:
    completed = true
    objective_label.text = "MISSION COMPLETE — ABRAM OBEYED AND WENT FORTH"
    progress_label.text = "AB001 COMPLETE\nGenesis 12:4–5"
    _show_story("MISSION COMPLETE\n\nGENESIS 12:4–5 — KJV\n\nSo Abram departed, as the LORD had spoken unto him; and Lot went with him: and Abram was seventy and five years old when he departed out of Haran.\n\nAnd Abram took Sarai his wife, and Lot his brother's son, and all their substance that they had gathered, and the souls that they had gotten in Haran; and they went forth to go into the land of Canaan; and into the land of Canaan they came.")
    var close := dialog_panel.get_child(dialog_panel.get_child_count() - 1) as Button
    close.text = "PLAY AGAIN"
    for c in close.pressed.get_connections():
        close.pressed.disconnect(c.callable)
    close.pressed.connect(func(): get_tree().reload_current_scene())

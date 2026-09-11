extends Node3D

const ASSETS = ["beast", "shell", "wings", "cannon", "robot", "crystal", "island", "tree", "shrine"]
var models: Dictionary = {}
var player: CharacterBody3D
var beast: Node3D
var camera: Camera3D
var enemies: Array[Node3D] = []
var crystals: Array[Node3D] = []
var shots: Array[Dictionary] = []
var waves: Array[Dictionary] = []
var pads: Array[MeshInstance3D] = []
var direction := Vector3.ZERO
var swipe_start := Vector2.ZERO
var stage := 0
var running := false
var hp := 5
var collected := 0
var defeated := 0
var elapsed := 0.0
var cooldown := 0.0
var dash_time := 0.0
var dash_cool := 0.0
var invulnerable := 0.0
var spawn_time := 0.0
var boss_time := 0.0
var hud_time := 0.0
var boss: Node3D
var boss_hp := 16
var browser_callback: JavaScriptObject
var glow_material: StandardMaterial3D
var pending_recall := false
var clock := 0.0

func _ready() -> void:
	for id in ASSETS:
		models[id] = load("res://assets/" + id + ".glb")
	var world := WorldEnvironment.new()
	var environment := Environment.new()
	environment.background_mode = Environment.BG_COLOR
	environment.background_color = Color("172440")
	environment.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	environment.ambient_light_color = Color("aacbe3")
	environment.ambient_light_energy = 0.65
	world.environment = environment
	add_child(world)
	var light := DirectionalLight3D.new()
	light.rotation_degrees = Vector3(-48, -25, 0)
	light.light_color = Color("ffe4ae")
	light.light_energy = 1.5
	light.shadow_enabled = true
	add_child(light)
	var island := model("island", Vector3(0,-0.3,0))
	island.scale = Vector3(2,1,2)
	var ground := StaticBody3D.new()
	var col := CollisionShape3D.new()
	var shape := CylinderShape3D.new()
	shape.radius = 19.6
	shape.height = 0.6
	col.shape = shape
	col.position.y = -0.3
	ground.add_child(col)
	add_child(ground)
	for i in range(16):
		var a := float(i)*TAU/16.0
		var tree := model("tree", Vector3(cos(a)*17.7,0,sin(a)*17.7))
		tree.scale *= 1.0 + float(i%3)*0.22
	for i in range(5):
		var a := float(i)*TAU/5.0
		var pad := MeshInstance3D.new()
		var mesh := CylinderMesh.new()
		mesh.top_radius = 1.7
		mesh.bottom_radius = 1.7
		mesh.height = 0.08
		pad.mesh = mesh
		pad.position = Vector3(cos(a)*9,0.08,sin(a)*9)
		var mat := StandardMaterial3D.new()
		mat.albedo_color = Color("2c5670")
		pad.material_override = mat
		add_child(pad)
		pads.append(pad)
	player = CharacterBody3D.new()
	player.position = Vector3(0,0.3,5)
	var pc := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = 0.48
	capsule.height = 1.7
	pc.shape = capsule
	pc.position.y = 0.9
	player.add_child(pc)
	add_child(player)
	beast = models["beast"].instantiate()
	player.add_child(beast)
	camera = Camera3D.new()
	camera.position = Vector3(0,22,20)
	camera.projection = Camera3D.PROJECTION_PERSPECTIVE
	camera.fov = 55
	add_child(camera)
	camera.look_at(Vector3(0,0,0))
	camera.current = true
	if OS.has_feature("web"):
		browser_callback = JavaScriptBridge.create_callback(receive)
		JavaScriptBridge.get_interface("window").addEventListener("message", browser_callback)
		send({"type":"ready"})
	else:
		begin_stage(0)

func model(id: String, pos: Vector3) -> Node3D:
	var node: Node3D = models[id].instantiate()
	add_child(node)
	node.position = pos
	return node

func send(data: Dictionary) -> void:
	if OS.has_feature("web"):
		JavaScriptBridge.eval("window.parent.postMessage(" + JSON.stringify(data) + ", window.location.origin)")

func receive(args: Array) -> void:
	var event = args[0]
	var data = JSON.parse_string(str(event.data))
	if typeof(data) != TYPE_DICTIONARY:
		return
	match str(data.get("type", "")):
		"start": begin_stage(0)
		"move": direction = Vector3(float(data.get("x",0)),0,float(data.get("z",0))).limit_length(1.0)
		"jump": jump()
		"dash": dash()
		"attack": attack()
		"pause": running = false
		"resume":
			if not pending_recall and hp > 0: running = true
		"retry": begin_stage(stage)
		"study_restart": begin_stage(mini(stage,2))
		"recall_pass":
			if pending_recall:
				if stage < 3: begin_stage(stage+1)
				else:
					pending_recall = false
					send({"type":"complete"})

func begin_stage(number: int) -> void:
	stage = number
	for e in enemies: e.queue_free()
	for c in crystals: c.queue_free()
	for s in shots: s.node.queue_free()
	for w in waves: w.node.queue_free()
	enemies.clear(); crystals.clear(); shots.clear(); waves.clear()
	if is_instance_valid(boss): boss.queue_free()
	boss = null
	for child in beast.get_children():
		if child.has_meta("upgrade"): child.queue_free()
	for i in range(stage):
		var part: Node3D = models[["shell","wings","cannon"][i]].instantiate()
		part.set_meta("upgrade",true)
		beast.add_child(part)
	hp = 5
	collected = 0
	defeated = 0
	elapsed = 0
	cooldown = 0
	dash_cool = 0
	direction = Vector3.ZERO
	player.position = Vector3(0,0.5,5)
	player.velocity = Vector3.ZERO
	pending_recall = false
	running = true
	spawn_time = 2.0
	boss_time = 2.0
	boss_hp = 16
	for i in range(8): spawn_crystal()
	for i in range(2+stage): spawn_enemy()
	if stage == 3:
		boss = model("robot",Vector3(0,0,-9))
		boss.scale = Vector3.ONE*3.0
	send({"type":"stage", "stage":stage})

func spawn_crystal() -> void:
	var angle := randf()*TAU
	var radius := randf_range(4,15)
	var c := model("crystal",Vector3(cos(angle)*radius,0.3,sin(angle)*radius))
	crystals.append(c)

func spawn_enemy() -> void:
	var angle := randf()*TAU
	var e := model("robot",Vector3(cos(angle)*16,0,sin(angle)*16))
	e.set_meta("life",2 if stage > 1 else 1)
	enemies.append(e)

func jump() -> void:
	if running and player.is_on_floor():
		player.velocity.y = 10.5 if stage >= 1 else 8.5

func dash() -> void:
	if running and dash_cool <= 0:
		if direction.length() < 0.1: direction = Vector3(sin(beast.rotation.y),0,cos(beast.rotation.y))
		dash_time = 0.26
		dash_cool = 1.8
		invulnerable = 0.4

func attack() -> void:
	if not running or cooldown > 0: return
	cooldown = 0.4 if stage >= 3 else 0.6
	var target: Node3D = null
	var distance := 50.0
	for e in enemies:
		var d := player.position.distance_to(e.position)
		if d < distance:
			distance = d
			target = e
	if is_instance_valid(boss) and player.position.distance_to(boss.position) < distance:
		target = boss
		distance = player.position.distance_to(boss.position)
	if stage >= 2 and target != null:
		projectile(player.position+Vector3.UP, (target.position+Vector3.UP-player.position).normalized(), false)
	else:
		for e in enemies.duplicate():
			if player.position.distance_to(e.position) < 3.4: hit_enemy(e)
		burst_ring(player.position, Color("89ffd0"), false)

func hit_enemy(e: Node3D) -> void:
	if not is_instance_valid(e): return
	var life := int(e.get_meta("life",1))-1
	e.set_meta("life",life)
	if life <= 0:
		var crystal := model("crystal",e.position+Vector3.UP*0.3)
		crystals.append(crystal)
		enemies.erase(e)
		e.queue_free()
		defeated += 1

func projectile(pos: Vector3, heading: Vector3, hostile: bool) -> void:
	var node := MeshInstance3D.new()
	var sphere := SphereMesh.new()
	sphere.radius = 0.23
	sphere.height = 0.46
	node.mesh = sphere
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color("ff718d") if hostile else Color("9affbf")
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	node.material_override = mat
	add_child(node)
	node.position = pos
	shots.append({"node":node,"heading":heading,"hostile":hostile,"life":3.0})

func burst_ring(pos: Vector3, color: Color, hostile: bool) -> void:
	var node := MeshInstance3D.new()
	var mesh := TorusMesh.new()
	mesh.inner_radius = 0.86
	mesh.outer_radius = 1.0
	mesh.rings = 32
	mesh.ring_segments = 6
	node.mesh = mesh
	var mat := StandardMaterial3D.new()
	mat.albedo_color = color
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	node.material_override = mat
	add_child(node)
	node.position = Vector3(pos.x,0.25,pos.z)
	waves.append({"node":node,"radius":1.0,"hostile":hostile,"life":3.0 if hostile else 0.3})

func hurt() -> void:
	if invulnerable > 0 or not running: return
	hp -= 1
	invulnerable = 1.8 if stage > 0 else 1.3
	send({"type":"hurt"})
	if hp <= 0:
		running = false
		send({"type":"down","stage":stage})

func _input(event: InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed: swipe_start = event.position
		else:
			var delta: Vector2 = event.position-swipe_start
			if delta.length() < 20: direction = Vector3.ZERO
			else: direction = Vector3(delta.x,0,delta.y).normalized()
	if event is InputEventScreenDrag:
		var delta: Vector2 = event.position-swipe_start
		if delta.length() > 25: direction = Vector3(delta.x,0,delta.y).normalized()
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		if event.pressed: swipe_start = event.position
		else:
			var delta: Vector2 = event.position-swipe_start
			if delta.length() < 20: direction = Vector3.ZERO
			else: direction = Vector3(delta.x,0,delta.y).normalized()
	if event is InputEventKey and event.pressed:
		if event.keycode == KEY_SPACE: jump()
		if event.keycode == KEY_SHIFT: dash()
		if event.keycode == KEY_E: attack()

func _physics_process(dt: float) -> void:
	clock += dt
	var aspect := get_viewport().get_visible_rect().size.x / maxf(get_viewport().get_visible_rect().size.y,1)
	var cam_offset := Vector3(0,21,17) if aspect > 1 else Vector3(0,25,21)
	camera.position = camera.position.lerp(player.position+cam_offset,dt*3)
	camera.look_at(player.position+Vector3(0,0,-2))
	if not running:
		beast.rotation.y += dt*0.25 if not pending_recall else 0
		return
	elapsed += dt
	cooldown -= dt
	dash_time -= dt
	dash_cool -= dt
	invulnerable -= dt
	var keys := Vector3(float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT))-float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)),0,float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN))-float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP)))
	if keys.length() > 0: direction = keys.normalized()
	var speed := 22.0 if dash_time > 0 else 7.0
	player.velocity.x = direction.x*speed
	player.velocity.z = direction.z*speed
	if not player.is_on_floor(): player.velocity.y -= (16.0 if stage >= 2 and player.velocity.y < 0 else 26.0)*dt
	player.move_and_slide()
	if direction.length() > 0.1: beast.rotation.y = lerp_angle(beast.rotation.y, atan2(direction.x,direction.z),dt*12)
	beast.position.y = sin(clock*14)*0.06 if direction.length() > 0.1 and player.is_on_floor() else 0
	beast.visible = invulnerable <= 0 or int(clock*12)%2 == 0
	if player.position.y < -5:
		player.position = Vector3(0,1,5)
		player.velocity = Vector3.ZERO
		direction = Vector3.ZERO
		hurt()
	for c in crystals.duplicate():
		c.rotation.y += dt*2
		if player.position.distance_to(c.position) < 1.5:
			crystals.erase(c);c.queue_free();collected += 1
			send({"type":"collect"})
	for e in enemies.duplicate():
		var heading: Vector3 = (player.position-e.position)
		heading.y = 0
		e.position += heading.normalized()*dt*(2.0+stage*0.4)
		e.rotation.y = atan2(heading.x,heading.z)
		if player.position.distance_to(e.position) < 1.3:
			if dash_time > 0: hit_enemy(e)
			else: hurt()
	spawn_time -= dt
	if spawn_time <= 0:
		spawn_time = 5.0 if stage < 2 else 3.5
		if enemies.size() < 5+stage: spawn_enemy()
		if crystals.size() < 6: spawn_crystal()
	for pad in pads:
		var hot := stage > 0 and fmod(elapsed+float(pads.find(pad))*1.7,6.0) < 1.6
		pad.material_override.albedo_color = Color("ff677d") if hot else Color("2c5670")
		if hot and player.position.y < 0.65 and Vector2(player.position.x-pad.position.x,player.position.z-pad.position.z).length() < 1.7: hurt()
	if is_instance_valid(boss):
		boss.rotation.y = atan2(player.position.x-boss.position.x,player.position.z-boss.position.z)
		boss_time -= dt
		if boss_time < 0:
			boss_time = 3.5 if boss_hp > 8 else 2.5
			burst_ring(boss.position,Color("ff668c"),true)
			for i in range(8):
				var a := float(i)*TAU/8+elapsed
				projectile(boss.position+Vector3.UP,Vector3(cos(a),0,sin(a)),true)
	for shot in shots.duplicate():
		shot.life -= dt
		shot.node.position += shot.heading*dt*(8.0 if shot.hostile else 20.0)
		if shot.hostile:
			if shot.node.position.distance_to(player.position+Vector3.UP*0.7) < 0.85:
				hurt();shot.life = 0
		else:
			for e in enemies.duplicate():
				if shot.node.position.distance_to(e.position+Vector3.UP) < 1:
					hit_enemy(e);shot.life = 0;break
			if is_instance_valid(boss) and shot.node.position.distance_to(boss.position+Vector3.UP*1.5) < 2.8:
				boss_hp -= 1;shot.life = 0
				if boss_hp <= 0: boss.queue_free();boss = null
		if shot.life <= 0: shots.erase(shot);shot.node.queue_free()
	for wave in waves.duplicate():
		wave.life -= dt
		wave.radius += dt*(6.0 if wave.hostile else 10.0)
		wave.node.scale = Vector3(wave.radius,0.5,wave.radius)
		var dist := Vector2(player.position.x-wave.node.position.x,player.position.z-wave.node.position.z).length()
		if wave.hostile and absf(dist-wave.radius) < 0.7 and player.position.y < 1.1: hurt()
		if wave.life <= 0: waves.erase(wave);wave.node.queue_free()
	var reached := collected >= 6 if stage == 0 else collected >= 8 and defeated >= 3 if stage == 1 else elapsed >= 35 and collected >= 8 if stage == 2 else boss_hp <= 0 and elapsed >= 45
	if reached and hp > 0:
		running = false
		pending_recall = true
		direction = Vector3.ZERO
		send({"type":"recall","stage":stage})
	hud_time -= dt
	if hud_time < 0:
		hud_time = 0.15
		send({"type":"hud","hp":hp,"crystals":collected,"kills":defeated,"seconds":int(elapsed),"boss":boss_hp,"dash":maxf(0,dash_cool)})

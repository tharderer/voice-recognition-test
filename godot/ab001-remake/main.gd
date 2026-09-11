extends Node3D

const MODEL_NAMES = ["abram","sarai","lot","worker","sheep","donkey","wolf","house","market","gate","well","rock","palm","supplies","wood","bridge","camp"]
const CHAPTER_NAMES = ["HARAN", "THE OPEN ROAD", "THE RIVER CROSSING", "THE ROCKFALL PASS", "CANAAN"]
var models: Dictionary = {}
var world: Node3D
var player: CharacterBody3D
var figure: Node3D
var camera: Camera3D
var env: Environment
var sun: DirectionalLight3D
var things: Array[Dictionary] = []
var followers: Array[Node3D] = []
var wolves: Array[Dictionary] = []
var rocks: Array[Dictionary] = []
var trail: Array[Vector3] = []
var labels: Array[Node3D] = []
var feet: Array[Node3D] = []
var callback: JavaScriptObject
var chapter := 0
var difficulty := "trailblazer"
var running := false
var pending := false
var direction := Vector3.ZERO
var motion_time := 0.0
var touch_start := Vector2.ZERO
var zoom := 1.0
var stamina := 100.0
var water := 100.0
var condition := 100.0
var sprint_time := 0.0
var staff_cool := 0.0
var staff_anim := 0.0
var call_time := 0.0
var call_cool := 0.0
var protection := 0.0
var elapsed := 0.0
var chapter_time := 0.0
var clock := 0.0
var hud_clock := 0.0
var rock_clock := 2.0
var warning_clock := 0.0
var pickups := {"sarai":false,"lot":false,"worker":false,"supplies":0,"sheep":0,"donkey":false,"water":false,"lost":false,"wood":0,"bridge":false}
var marker: MeshInstance3D
var next_goal: Dictionary = {}
var nearest: Dictionary = {}
var bridge_node: Node3D

func _ready() -> void:
	for id in MODEL_NAMES: models[id] = load("res://assets/"+id+".glb")
	var we := WorldEnvironment.new()
	env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color("88adb7")
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color("b7cdd9")
	env.ambient_light_energy = 0.62
	we.environment = env
	add_child(we)
	sun = DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-50,-28,0)
	sun.light_color = Color("ffe6bd")
	sun.light_energy = 1.6
	sun.shadow_enabled = true
	add_child(sun)
	world = Node3D.new();add_child(world)
	player = CharacterBody3D.new()
	var collision := CollisionShape3D.new()
	var shape := CapsuleShape3D.new();shape.radius=0.32;shape.height=1.8
	collision.shape=shape;collision.position.y=0.95;player.add_child(collision);add_child(player)
	figure = models.abram.instantiate();player.add_child(figure)
	for n in figure.find_children("Foot*","Node3D",true,false): feet.append(n)
	camera = Camera3D.new();camera.fov=46;add_child(camera);camera.current=true
	marker = MeshInstance3D.new()
	var ring := TorusMesh.new();ring.inner_radius=0.74;ring.outer_radius=0.86;ring.rings=24;ring.ring_segments=5
	marker.mesh=ring;marker.material_override=material(Color("ffe59c"),true);add_child(marker)
	build_chapter(0)
	running=false
	if OS.has_feature("web"):
		callback=JavaScriptBridge.create_callback(receive)
		JavaScriptBridge.get_interface("window").addEventListener("message",callback)
		send({"type":"ready"})
	else: running=true

func material(color: Color, unshaded: bool=false) -> StandardMaterial3D:
	var m:=StandardMaterial3D.new();m.albedo_color=color;m.roughness=0.95
	if unshaded:m.shading_mode=BaseMaterial3D.SHADING_MODE_UNSHADED
	return m

func model(id: String, pos: Vector3, size: Vector3=Vector3.ONE) -> Node3D:
	var n:Node3D=models[id].instantiate();world.add_child(n);n.position=pos;n.scale=size;return n

func block(pos: Vector3, size: Vector3, color: Color, solid: bool=false) -> MeshInstance3D:
	var m:=MeshInstance3D.new();var b:=BoxMesh.new();b.size=size;m.mesh=b;m.position=pos;m.material_override=material(color);world.add_child(m)
	if solid:
		var body:=StaticBody3D.new();var col:=CollisionShape3D.new();var s:=BoxShape3D.new();s.size=size;col.shape=s;body.add_child(col);m.add_child(body)
	return m

func obstacle(id: String,pos:Vector3,size:Vector3,radius:float) -> Node3D:
	var n:=model(id,pos,size);var body:=StaticBody3D.new();var c:=CollisionShape3D.new();var s:=CylinderShape3D.new();s.radius=radius;s.height=2
	c.shape=s;c.position.y=1;body.add_child(c);world.add_child(body);body.position=pos;return n

func label(text:String,node:Node3D,height:float=2.5) -> void:
	var l:=Label3D.new();l.text=text;l.position.y=height;l.font_size=36;l.pixel_size=0.007;l.billboard=BaseMaterial3D.BILLBOARD_ENABLED;l.no_depth_test=false;l.outline_size=8;l.modulate=Color("fff2d2");node.add_child(l);labels.append(l)

func thing(id:String,kind:String,model_id:String,pos:Vector3,title:String) -> Dictionary:
	var n:=model(model_id,pos);label(title,n,2.5 if kind=="person" else 1.6)
	var item={"id":id,"kind":kind,"model":model_id,"node":n,"done":false,"title":title}
	things.append(item);return item

func road(points:Array[Vector3],width:float) -> void:
	for i in range(points.size()-1):
		var a:=points[i];var b:=points[i+1];var piece:=block((a+b)*0.5+Vector3(0,0.012,0),Vector3(width,0.02,a.distance_to(b)+1),Color("c4a26a"))
		piece.rotation.y=atan2(b.x-a.x,b.z-a.z)

func add_follower(id:String,pos:Vector3) -> void:
	var f:=model(id,pos);f.set_meta("model",id);followers.append(f)

func build_chapter(number:int) -> void:
	running=false;pending=false;chapter=number
	for child in world.get_children():world.remove_child(child);child.queue_free()
	things.clear();followers.clear();wolves.clear();rocks.clear();trail.clear();labels.clear()
	next_goal={};nearest={};bridge_node=null
	pickups={"sarai":false,"lot":false,"worker":false,"supplies":0,"sheep":0,"donkey":false,"water":false,"lost":false,"wood":0,"bridge":false}
	player.position=Vector3(0,0.15,25);player.velocity=Vector3.ZERO;direction=Vector3.ZERO;motion_time=0;sprint_time=0
	chapter_time=0;rock_clock=2.0;protection=2;stamina=100;condition=maxf(condition,65);water=maxf(water,65)
	block(Vector3(0,-0.3,0),Vector3(50,0.6,76),Color("b89864") if chapter<3 else Color("ad956e"),true)
	for side in [-1,1]:block(Vector3(side*24.5,1,0),Vector3(1,2,76),Color("a48a62"),true)
	block(Vector3(0,1,37),Vector3(50,2,1),Color("a48a62"),true)
	block(Vector3(0,1,-37),Vector3(50,2,1),Color("a48a62"),true)
	env.background_color=Color("95b4b6");sun.light_color=Color("ffe1a5");sun.light_energy=1.45
	if chapter==0: build_haran()
	elif chapter==1: build_road()
	elif chapter==2: build_river()
	elif chapter==3: build_pass()
	else: build_canaan()
	if chapter>0:
		var party := ["sarai","lot","worker","donkey","sheep","sheep"]
		if chapter!=1:party.append("sheep")
		for id in party:add_follower(id,player.position+Vector3(0,0,followers.size()*1.1+1.2))
	reset_trail()
	camera.position=player.position+Vector3(0,14,13)*zoom
	camera.look_at(player.position+Vector3(0,0,-2))
	update_goal()
	running=chapter<4
	send({"type":"chapter","chapter":chapter,"water":water,"condition":condition})

func build_haran() -> void:
	road([Vector3(0,0,31),Vector3(0,0,-29)],5.5)
	road([Vector3(-17,0,5),Vector3(17,0,5)],4)
	road([Vector3(-17,0,-13),Vector3(17,0,-13)],4)
	for p in [Vector3(-11,0,16),Vector3(12,0,17),Vector3(-12,0,-6),Vector3(12,0,-5),Vector3(-13,0,-22),Vector3(13,0,-24)]:
		var house:=model("house",p)
		block(p+Vector3(0,1.3,0),Vector3(4.3,2.6,3.8),Color("b99b67"),true).visible=false
		if p.x<0:house.rotation.y=0.2
	model("market",Vector3(12,0,5))
	for x in [-21,21]:
		for z in [-28,-12,15,29]:model("palm",Vector3(x,0,z))
	thing("sarai","person","sarai",Vector3(-7,0,12),"SARAI")
	thing("lot","person","lot",Vector3(7,0,-5),"LOT")
	thing("worker","person","worker",Vector3(-7,0,-17),"HOUSEHOLD")
	thing("supply1","supplies","supplies",Vector3(9,0,4),"TRAVEL GOODS")
	thing("supply2","supplies","supplies",Vector3(-8,0,-9),"TENT & FOOD")
	thing("donkey","animal","donkey",Vector3(11,0,-16),"PACK DONKEY")
	for i in range(3):thing("sheep"+str(i),"animal","sheep",Vector3(-12+i*2,0,24),"SHEEP")
	thing("exit","exit","gate",Vector3(0,0,-30),"LEAVE HARAN")

func scenery(seed_number:int) -> void:
	var rng:=RandomNumberGenerator.new();rng.seed=seed_number
	for i in range(30):
		var side:float=-1 if i%2==0 else 1
		var p:=Vector3(side*rng.randf_range(17,23),0,rng.randf_range(-34,32))
		var rock:=model("rock",p,Vector3.ONE*rng.randf_range(1.0,3.3));rock.rotation.y=rng.randf()*TAU
	for p in [Vector3(-15,0,18),Vector3(17,0,-23),Vector3(-16,0,-12)]:model("palm",p)

func build_road() -> void:
	scenery(81)
	road([Vector3(0,0,32),Vector3(-7,0,8),Vector3(-8,0,-13),Vector3(0,0,-31)],5)
	road([Vector3(0,0,18),Vector3(9,0,2),Vector3(0,0,-23)],3.7)
	for p in [Vector3(0,0,4),Vector3(0,0,-4),Vector3(1,0,-11)]:obstacle("rock",p,Vector3(2.2,2,2.5),2)
	thing("well","water","well",Vector3(-10,0,-14),"OASIS WELL")
	thing("lost","lost","sheep",Vector3(13,0,1),"WANDERING LAMB")
	thing("stash","bonus","supplies",Vector3(15,0,18),"EXTRA SUPPLIES")
	thing("exit","exit","camp",Vector3(0,0,-31),"MAKE CAMP")
	spawn_wolf(Vector3(10,0,-11));spawn_wolf(Vector3(-13,0,5))
	if difficulty=="hard":spawn_wolf(Vector3(13,0,9))

func build_river() -> void:
	scenery(35)
	env.background_color=Color("526c83");sun.light_color=Color("b4c9e6");sun.light_energy=1.1
	road([Vector3(0,0,32),Vector3(0,0,-32)],5)
	var water_mesh:=block(Vector3(0,0.09,-9),Vector3(49,0.1,10),Color("247485"))
	var shader:=Shader.new();shader.code="shader_type spatial; render_mode unshaded; void fragment(){ float ripple=sin(UV.x*80.0+TIME*3.0+sin(UV.y*30.0))*0.035; ALBEDO=vec3(0.08+ripple,0.36+ripple,0.43+ripple); }"
	var shader_mat:=ShaderMaterial.new();shader_mat.shader=shader;water_mesh.material_override=shader_mat
	for x in [-22,-15,13,21]:model("rock",Vector3(x,0,-7),Vector3(1.3,0.7,1.7))
	thing("wood0","wood","wood",Vector3(-12,0,15),"DRIFTWOOD")
	thing("wood1","wood","wood",Vector3(11,0,7),"DRIFTWOOD")
	thing("wood2","wood","wood",Vector3(-10,0,-1),"DRIFTWOOD")
	thing("bridge","build","wood",Vector3(0,0,-2),"REPAIR CROSSING")
	thing("well","water","well",Vector3(8,0,-22),"FRESH WATER")
	thing("exit","exit","camp",Vector3(0,0,-31),"GATHER ON FAR BANK")
	spawn_wolf(Vector3(14,0,17));spawn_wolf(Vector3(-16,0,4))

func build_pass() -> void:
	scenery(59)
	road([Vector3(0,0,32),Vector3(-6,0,13),Vector3(6,0,-9),Vector3(0,0,-32)],6)
	for side in [-1,1]:
		block(Vector3(side*13,2,0),Vector3(4,4,72),Color("877552"),true).visible=false
		for z in range(-30,34,6):
			model("rock",Vector3(side*15,0,z),Vector3(3,4,3.3))
	thing("well","water","supplies",Vector3(-10,0,19),"WATER CACHE")
	thing("exit","exit","gate",Vector3(0,0,-31),"CANAAN AHEAD")
	sun.light_color=Color("ffe7b8")

func build_canaan() -> void:
	block(Vector3(0,0.01,0),Vector3(49,0.03,75),Color("68815b"))
	road([Vector3(0,0,32),Vector3(0,0,-32)],5)
	for side in [-1,1]:
		for z in range(-30,35,10):model("palm",Vector3(side*12,0,z),Vector3.ONE*1.2)
	model("camp",Vector3(-5,0,18));model("well",Vector3(7,0,7))
	model("house",Vector3(-13,0,-18));model("house",Vector3(14,0,-26))
	env.background_color=Color("abc5b1");sun.light_color=Color("fff0c9")

func spawn_wolf(pos:Vector3) -> void:
	var n:=model("wolf",pos);wolves.append({"node":n,"fear":0.0,"timer":0.0})

func reset_trail() -> void:
	trail.clear()
	for i in range(140):trail.append(player.position+Vector3(0,0,float(i)*0.12))

func send(data:Dictionary) -> void:
	if OS.has_feature("web"):JavaScriptBridge.eval("window.parent.postMessage("+JSON.stringify(data)+", window.location.origin)")

func receive(args:Array) -> void:
	var event=args[0]
	if str(event.origin)!=str(JavaScriptBridge.get_interface("window").location.origin):return
	var d=JSON.parse_string(str(event.data))
	if typeof(d)!=TYPE_DICTIONARY:return
	match str(d.get("type","")):
		"start":
			difficulty=str(d.get("difficulty","trailblazer"));condition=100;water=100;elapsed=0
			build_chapter(clampi(int(d.get("chapter",0)),0,3))
		"interact":interact()
		"staff":staff()
		"call":call_caravan()
		"sprint":
			if running and stamina>=20:sprint_time=2.0
		"pause":running=false;motion_time=0;sprint_time=0
		"resume":
			if not pending and condition>0 and chapter<4:running=true
		"retry":condition=100;water=100;build_chapter(chapter)
		"next":
			if pending and chapter<4:build_chapter(chapter+1)
		"zoom":zoom=clampf(zoom+float(d.get("delta",0)),0.75,1.45)

func current_goal() -> Dictionary:
	if chapter==0:
		for id in ["sarai","lot","worker"]:
			if not pickups[id]:return find_thing(id)
		if pickups.supplies<2:
			for t in things:
				if t.kind=="supplies" and not t.done:return t
		if not pickups.donkey:return find_thing("donkey")
		if pickups.sheep<3:
			for t in things:
				if t.kind=="animal" and t.model=="sheep" and not t.done:return t
	elif chapter==1:
		if not pickups.lost:return find_thing("lost")
		if not pickups.water:return find_thing("well")
	elif chapter==2:
		if pickups.wood<3:
			for t in things:
				if t.kind=="wood" and not t.done:return t
		if not pickups.bridge:return find_thing("bridge")
		if not pickups.water:return find_thing("well")
	return find_thing("exit")

func find_thing(id:String) -> Dictionary:
	for t in things:
		if t.id==id:return t
	return {}

func all_ready() -> bool:
	if chapter==0:return pickups.sarai and pickups.lot and pickups.worker and pickups.supplies==2 and pickups.donkey and pickups.sheep==3
	if chapter==1:return pickups.water and pickups.lost
	if chapter==2:return pickups.bridge and pickups.water
	return chapter==3

func update_goal() -> void:
	next_goal=current_goal();nearest={}
	var closest:=3.0
	for t in things:
		if t.done:continue
		var dist:float=player.position.distance_to(t.node.position)
		if dist<closest:closest=dist;nearest=t
	if not next_goal.is_empty():
		marker.visible=true;marker.position=next_goal.node.position+Vector3(0,0.14,0)
	else:marker.visible=false

func interact() -> void:
	if not running:return
	motion_time=0;update_goal()
	if nearest.is_empty():send({"type":"toast","text":"Walk closer to the marked person or object."});return
	interact_with(nearest)

func interact_with(t:Dictionary) -> void:
	if not running or t.done:return
	var kind:String=t.kind
	if kind=="exit":
		if not all_ready():send({"type":"toast","text":"There is still work to finish. Follow the gold marker."});return
		for f in followers:
			if f.position.distance_to(player.position)>15:
				send({"type":"toast","text":"Your caravan is behind you. CALL and let everyone catch up."});return
		pending=true;running=false;motion_time=0
		send({"type":"chapter_done","chapter":chapter,"condition":condition,"water":water});return
	if kind=="person":pickups[t.id]=true;add_follower(t.model,t.node.position)
	elif kind=="supplies":pickups.supplies+=1
	elif kind=="animal":
		if t.model=="donkey":pickups.donkey=true
		else:pickups.sheep+=1
		add_follower(t.model,t.node.position)
	elif kind=="water":water=100;pickups.water=true
	elif kind=="lost":pickups.lost=true;add_follower("sheep",t.node.position)
	elif kind=="wood":pickups.wood+=1
	elif kind=="build":
		if pickups.wood<3:send({"type":"toast","text":"Find all three driftwood bundles to repair the crossing."});return
		pickups.bridge=true;bridge_node=model("bridge",Vector3(0,0.18,-9),Vector3(1,1,1.2))
	elif kind=="bonus":water=minf(100,water+25);condition=minf(100,condition+15)
	t.done=true
	if kind!="water":t.node.visible=false
	send({"type":"collected","text":t.title+" — ready."})
	update_goal()

func staff() -> void:
	if not running or staff_cool>0:return
	staff_cool=0.9;staff_anim=0.35
	var count:=0
	for w in wolves:
		if w.node.position.distance_to(player.position)<4.8:w.fear=5.5;count+=1
	send({"type":"staff","scared":count})

func call_caravan() -> void:
	if not running or call_cool>0:return
	call_cool=5;call_time=4
	send({"type":"toast","text":"Calling the caravan — everyone is catching up."})

func harm(amount:float,text:String) -> void:
	if protection>0 or not running:return
	condition=maxf(0,condition-amount);protection=1.4
	send({"type":"hurt","text":text})
	if condition<=0:running=false;send({"type":"down","chapter":chapter})

func finish_gesture(delta:Vector2) -> void:
	if not running:return
	if delta.length()<22:motion_time=0;interact();return
	direction=Vector3(delta.x,0,delta.y).normalized();motion_time=clampf(delta.length()/160.0,0.45,1.55)

func _unhandled_input(event:InputEvent) -> void:
	if event is InputEventScreenTouch:
		if event.pressed:touch_start=event.position
		else:finish_gesture(event.position-touch_start)
	elif event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
		if event.pressed:touch_start=event.position
		else:finish_gesture(event.position-touch_start)
	elif event is InputEventKey and event.pressed:
		if event.keycode==KEY_E:interact()
		elif event.keycode==KEY_SPACE:staff()
		elif event.keycode==KEY_Q:call_caravan()
		elif event.keycode==KEY_SHIFT and stamina>=20:sprint_time=2

func create_rock() -> void:
	var lanes:Array[float]=[-7.0,0.0,7.0]
	var x:float=lanes[randi()%3]
	if randf()<0.7:x=clampf(player.position.x,-9,9)
	var z:float=maxf(-33,player.position.z-18)
	var warning:=block(Vector3(x,0.07,z+12),Vector3(2.4,0.05,23),Color("c06543"))
	var n:=model("rock",Vector3(x,3,z),Vector3.ONE*0.7);n.visible=false
	rocks.append({"node":n,"warn":warning,"delay":1.35,"life":6.0})

func _physics_process(dt:float) -> void:
	clock+=dt
	var aspect:float=get_viewport().get_visible_rect().size.x/maxf(1,get_viewport().get_visible_rect().size.y)
	var offset:=Vector3(0,12.6,12.8)*zoom*(1.12 if aspect<1 else 1.0)
	camera.position=camera.position.lerp(player.position+offset,minf(1,dt*5));camera.look_at(player.position+Vector3(0,0.5,-1.7))
	marker.rotation.y+=dt*0.5
	if not running:return
	elapsed+=dt;chapter_time+=dt;hud_clock-=dt;staff_cool-=dt;staff_anim-=dt;call_time-=dt;call_cool-=dt;protection-=dt;warning_clock-=dt
	var keys:=Vector3(float(Input.is_key_pressed(KEY_D) or Input.is_key_pressed(KEY_RIGHT))-float(Input.is_key_pressed(KEY_A) or Input.is_key_pressed(KEY_LEFT)),0,float(Input.is_key_pressed(KEY_S) or Input.is_key_pressed(KEY_DOWN))-float(Input.is_key_pressed(KEY_W) or Input.is_key_pressed(KEY_UP)))
	var moving:=motion_time>0 or keys.length()>0
	if keys.length()>0:direction=keys.normalized()
	motion_time=maxf(0,motion_time-dt);sprint_time=maxf(0,sprint_time-dt)
	var sprinting:=sprint_time>0 and stamina>1 and moving
	stamina=clampf(stamina+dt*(-31 if sprinting else 19),0,100)
	var speed:float=9.0 if sprinting else 5.2
	player.velocity.x=direction.x*speed if moving else 0
	player.velocity.z=direction.z*speed if moving else 0
	if not player.is_on_floor():player.velocity.y-=24*dt
	player.move_and_slide()
	if moving:
		figure.rotation.y=lerp_angle(figure.rotation.y,atan2(direction.x,direction.z),dt*14)
		figure.position.y=sin(clock*(17 if sprinting else 12))*0.035
		for i in range(feet.size()):feet[i].position.z=sin(clock*12+float(i)*PI)*0.10
	else:figure.position.y=0
	figure.rotation.z=sin(staff_anim*18)*0.12 if staff_anim>0 else 0
	if trail.is_empty() or player.position.distance_to(trail[0])>0.13:
		trail.push_front(player.position)
		if trail.size()>650:trail.resize(650)
	for i in range(followers.size()):
		var f:=followers[i];var idx:=mini(trail.size()-1,9+i*8);var target:Vector3=trail[idx]
		var delta:=target-f.position;delta.y=0
		if delta.length()>0.10:
			f.position+=delta.normalized()*minf(delta.length(),dt*(8 if call_time>0 else 6.0))
			f.rotation.y=lerp_angle(f.rotation.y,atan2(delta.x,delta.z),dt*8)
			f.position.y=absf(sin(clock*10+i))*0.035
	if chapter>0 and chapter<4:
		water=maxf(0,water-dt*(0.72 if difficulty=="hard" else 0.24 if difficulty=="explorer" else 0.42))
		if water<=0:condition=maxf(0,condition-dt*2.2)
		if condition<=0:running=false;send({"type":"down","chapter":chapter});return
	for t in things:
		if chapter==0 and t.kind=="animal" and t.model=="sheep" and not t.done:
			var flee:Vector3=t.node.position-player.position;flee.y=0
			if flee.length()<2.2 and flee.length()>0.5:
				t.node.position+=flee.normalized()*dt*1.2;t.node.position.x=clampf(t.node.position.x,-19,-4);t.node.position.z=clampf(t.node.position.z,18,30)
	if chapter==2 and player.position.z< -4 and player.position.z> -14 and (not pickups.bridge or absf(player.position.x)>2.0):
		harm(14,"The current swept you back. Repair the crossing and stay on its planks.")
		player.position=Vector3(0,0.2,0);motion_time=0;reset_trail()
		for i in range(followers.size()):followers[i].position=Vector3(0,0,2+i*1.0)
	for w in wolves:
		w.fear=maxf(0,w.fear-dt);w.timer=maxf(0,w.timer-dt)
		var target:Vector3=player.position
		if not followers.is_empty():target=followers[followers.size()-1].position
		var delta:Vector3=(w.node.position-player.position) if w.fear>0 else (target-w.node.position);delta.y=0
		var ws:float=5 if w.fear>0 else 2.8 if difficulty=="hard" else 1.8 if difficulty=="explorer" else 2.3
		w.node.position+=delta.normalized()*dt*ws
		w.node.position.x=clampf(w.node.position.x,-21,21)
		w.node.position.z=clampf(w.node.position.z,1 if chapter==2 else -32,31)
		w.node.rotation.y=lerp_angle(w.node.rotation.y,atan2(delta.x,delta.z),dt*8)
		if w.fear<=0 and w.timer<=0 and w.node.position.distance_to(target)<1.2:
			w.timer=1.6;harm(9 if difficulty=="hard" else 4 if difficulty=="explorer" else 6,"A wolf reached the caravan. Use your STAFF nearby to drive it away.")
	if chapter==3:
		rock_clock-=dt
		if rock_clock<=0:rock_clock=2.8 if difficulty=="hard" else 5.2 if difficulty=="explorer" else 3.6;create_rock()
		for r in rocks.duplicate():
			r.delay-=dt
			if r.delay>0:continue
			r.warn.visible=false;r.node.visible=true;r.life-=dt;r.node.position.z+=dt*12;r.node.position.y=maxf(0.4,r.node.position.y-dt*8);r.node.rotate_x(dt*7)
			var hit:bool=player.position.distance_to(r.node.position)<1.3
			for f in followers:
				if f.position.distance_to(r.node.position)<1.2:hit=true
			if hit:harm(13,"Rockfall! Watch the coral warning strips; run to clear the lane.");r.life=0
			if r.life<=0 or r.node.position.z>36:r.node.queue_free();r.warn.queue_free();rocks.erase(r)
	if hud_clock<=0:
		hud_clock=0.12;update_goal()
		var destination:Vector3=next_goal.node.position if not next_goal.is_empty() else player.position
		var delta:=destination-player.position
		var angle:=atan2(delta.x,-delta.z)
		send({"type":"hud","chapter":chapter,"goal":next_goal.get("title","CANAAN"),"distance":int(delta.length()),"angle":angle,"near":nearest.get("title","INTERACT"),"water":int(water),"condition":int(condition),"stamina":int(stamina),"staff":maxf(0,staff_cool),"call":maxf(0,call_cool),"people":followers.size(),"elapsed":int(elapsed)})

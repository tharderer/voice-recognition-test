extends SceneTree

var failures := 0
func check(value:bool,message:String) -> void:
	if not value:failures+=1;push_error("FAIL: "+message)

func _initialize() -> void:
	run.call_deferred()

func run() -> void:
	var game=load("res://main.tscn").instantiate()
	root.add_child(game)
	await process_frame
	game.set_physics_process(false)
	check(game.models.size()==17,"all Blender assets loaded")
	for id in game.MODEL_NAMES:
		check(game.models[id] is PackedScene,"valid Blender scene "+id)
	game.build_chapter(0)
	game.interact_with(game.find_thing("exit"))
	check(not game.pending,"Haran exit rejects incomplete household")
	for id in ["sarai","lot","worker","supply1","supply2","donkey","sheep0","sheep1"]:
		game.interact_with(game.find_thing(id))
	check(not game.all_ready(),"last sheep required")
	game.interact_with(game.find_thing("sheep2"))
	check(game.all_ready() and game.followers.size()==7,"whole household assembled")
	game.interact_with(game.find_thing("sheep2"))
	check(game.followers.size()==7,"animals cannot be collected twice")
	game.player.position=Vector3(0,0,-30)
	game.interact_with(game.find_thing("exit"))
	check(not game.pending,"cannot leave the caravan behind")
	for f in game.followers:f.position=game.player.position
	game.interact_with(game.find_thing("exit"))
	check(game.pending and not game.running,"Haran completes only with caravan")
	game.build_chapter(1)
	check(game.followers.size()==6,"one lamb missing on road")
	game.interact_with(game.find_thing("well"))
	check(not game.all_ready(),"road requires rescued lamb as well as water")
	game.interact_with(game.find_thing("lost"))
	check(game.all_ready() and game.followers.size()==7,"rescued lamb restores caravan")
	game.wolves[0].node.position=game.player.position+Vector3(1,0,0)
	game.staff_cool=0;game.staff()
	check(game.wolves[0].fear>0,"staff drives nearby wolf away")
	game.protection=0;game.harm(110,"test")
	check(game.condition==0 and not game.running,"exhaustion stops gameplay")
	game.condition=100;game.water=100;game.build_chapter(2)
	game.interact_with(game.find_thing("bridge"))
	check(not game.pickups.bridge,"crossing requires all wood")
	game.player.position=Vector3(0,0,-8);game.protection=0
	game._physics_process(0.016)
	check(game.player.position.z>=0 and game.condition<100,"unrepaired river pushes caravan back")
	for id in ["wood0","wood1","wood2"]:game.interact_with(game.find_thing(id))
	game.interact_with(game.find_thing("bridge"))
	check(game.pickups.bridge and is_instance_valid(game.bridge_node),"three wood bundles build Blender crossing")
	check(not game.all_ready(),"far bank water still required")
	game.player.position=Vector3(0,0,-8);game._physics_process(0.016)
	check(game.player.position.z< -4,"repaired crossing is traversable")
	game.interact_with(game.find_thing("well"))
	check(game.all_ready(),"river stage objectives complete")
	game.build_chapter(3);game.create_rock()
	check(game.rocks.size()==1 and not game.rocks[0].node.visible,"rocks provide a warning before rolling")
	game.rocks[0].delay=0;game._physics_process(0.016)
	check(game.rocks[0].node.visible,"rock activates after warning")
	game.running=false;var before=game.water;game._physics_process(10)
	check(game.water==before,"pause stops water drain and hazards")
	game.build_chapter(4)
	check(not game.running and game.followers.size()==7,"Canaan completes journey with entire caravan")
	game.queue_free()
	await process_frame
	if failures==0:print("PASS: Blender models, four chapters, caravan gates, wolf defense, river, rockfall, pause, and completion")
	quit(0 if failures==0 else 1)

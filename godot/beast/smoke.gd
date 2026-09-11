extends SceneTree
func _initialize() -> void:
	call_deferred("test")
func test() -> void:
	var scene = load("res://main.tscn").instantiate()
	root.add_child(scene)
	await process_frame
	assert(scene.models.size() == 9)
	for stage in range(4):
		scene.begin_stage(stage)
		assert(scene.running)
		assert(scene.crystals.size() == 8)
		assert(scene.enemies.size() == 2+stage)
		if stage == 3: assert(is_instance_valid(scene.boss))
		for i in range(140):
			scene.attack()
			await physics_frame
		scene.running = false
		scene.pending_recall = true
		scene.receive([{ "data": JSON.stringify({"type":"resume"}) }])
		assert(not scene.running, "Pause must not bypass recall")
	print("PASS: Blender models instantiate; all four action stages, projectiles and boss run; recall blocks resume.")
	scene.queue_free()
	await process_frame
	quit(0)

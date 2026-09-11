extends Node2D

const SOURCE := 1254.0
const ATLAS_SIZE := 640.0
const S := ATLAS_SIZE / SOURCE
const SWIPE_MIN := 26.0
const TAP_MAX := 18.0
const INTERACT_DISTANCE := 135.0
const PLAYER_SPEED := 560.0

const R := {
    "abramFront": Rect2(5,5,165,230), "abramRight1": Rect2(170,5,160,235),
    "abramRight2": Rect2(320,5,150,235), "abramRight3": Rect2(460,5,155,235),
    "abramRight4": Rect2(605,5,145,235), "abramBack": Rect2(895,5,170,240),
    "sarai": Rect2(10,245,85,175), "lot": Rect2(360,245,85,175),
    "servant": Rect2(680,245,80,175), "girl": Rect2(918,245,82,175),
    "sheep": Rect2(15,425,120,185), "camel": Rect2(372,418,98,207),
    "grain": Rect2(470,620,120,135), "pack": Rect2(610,635,135,125),
    "roll": Rect2(10,620,180,135), "wall": Rect2(335,1115,145,130),
    "gate": Rect2(835,930,410,185), "palm": Rect2(690,915,165,225),
    "well": Rect2(530,925,170,185), "tent": Rect2(10,920,320,190),
    "altar": Rect2(335,930,195,180), "rock": Rect2(705,790,150,130),
    "thorn": Rect2(560,790,145,130), "cart": Rect2(845,790,180,130),
    "guard": Rect2(10,750,80,170), "campfire": Rect2(780,1120,140,125)
}

var atlas: Texture2D
var scene_layer: Node2D
var thing_layer: Node2D
var follower_layer: Node2D
var player: Node2D
var player_sprite: Sprite2D
var camera: Camera2D
var ui: CanvasLayer
var objective_label: Label
var progress_label: Label
var toast_label: Label
var rotate_label: Label
var complete_panel: ColorRect

var world_size := Vector2(2800,1700)
var phase := "haran"
var things: Array = []
var walls: Array[Rect2] = []
var followers: Array = []
var trail: Array[Vector2] = []
var touch_start := Vector2.ZERO
var touch_active := false
var mouse_start := Vector2.ZERO
var mouse_active := false
var motion := Vector2.ZERO
var motion_time := 0.0
var moving := false
var facing := "down"
var anim_time := 0.0
var toast_time := 0.0
var mission_complete := false
var prep := {"sarai":false,"lot":false,"household":0,"supplies":0,"animals":0,"ready":false}
var journey := {"water":false,"sheep":false}

func _ready() -> void:
    atlas = load("res://art/atlas.png")
    scene_layer = Node2D.new(); add_child(scene_layer)
    thing_layer = Node2D.new(); add_child(thing_layer)
    follower_layer = Node2D.new(); add_child(follower_layer)
    _build_player()
    _build_ui()
    _build_haran()

func _atlas_texture(name:String) -> AtlasTexture:
    var t := AtlasTexture.new()
    t.atlas = atlas
    var r:Rect2 = R[name]
    t.region = Rect2(r.position * S, r.size * S)
    t.filter_clip = true
    return t

func _sprite(name:String, pos:Vector2, width:float, parent:Node2D, flip:=false) -> Sprite2D:
    var s := Sprite2D.new()
    s.texture = _atlas_texture(name)
    s.position = pos
    var natural_w := R[name].size.x * S
    var sc := width / natural_w
    s.scale = Vector2(-sc if flip else sc, sc)
    parent.add_child(s)
    s.z_index = int(pos.y)
    return s

func _build_player() -> void:
    player = Node2D.new(); add_child(player)
    player_sprite = Sprite2D.new()
    player_sprite.texture = _atlas_texture("abramFront")
    var sc := 102.0 / (R["abramFront"].size.x * S)
    player_sprite.scale = Vector2(sc,sc)
    player_sprite.position.y = -38
    player.add_child(player_sprite)
    player.z_index = 1000
    camera = Camera2D.new()
    camera.zoom = Vector2(1.08,1.08)
    camera.position = Vector2(0,-70)
    camera.position_smoothing_enabled = true
    camera.position_smoothing_speed = 7.5
    player.add_child(camera)

func _clear_layer(layer:Node2D) -> void:
    for c in layer.get_children(): c.queue_free()

func _add_scene(name:String, x:float, y:float, width:float, z_offset:=0, flip:=false) -> void:
    var s := _sprite(name,Vector2(x,y),width,scene_layer,flip)
    s.z_index = int(y) + z_offset

func _add_thing(type:String,id:String,img:String,x:float,y:float,width:float,label:String,kind:="") -> void:
    var s := _sprite(img,Vector2(x,y),width,thing_layer)
    things.append({"type":type,"id":id,"img":img,"node":s,"label":label,"kind":kind if kind!="" else img,"done":false})

func _add_wall(x:float,y:float,w:float,h:float) -> void:
    walls.append(Rect2(x,y,w,h))

func _build_haran() -> void:
    phase = "haran"; mission_complete = false
    world_size = Vector2(2800,1700)
    _clear_layer(scene_layer); _clear_layer(thing_layer); _clear_layer(follower_layer)
    things.clear(); walls.clear(); followers.clear(); trail.clear()
    prep = {"sarai":false,"lot":false,"household":0,"supplies":0,"animals":0,"ready":false}
    journey = {"water":false,"sheep":false}
    player.position = Vector2(420,1030); facing="down"; motion_time=0
    for x in range(80,2700,135):
        _add_scene("wall",x,105,125); _add_scene("wall",x,1600,125)
    for y in range(210,1570,120):
        _add_scene("wall",85,y,115); _add_scene("wall",2700,y,115)
    _add_scene("gate",2560,865,410,2); _add_wall(2500,700,270,180)
    var tents = [[500,390,300],[1050,360,290],[1580,430,300],[2050,350,290],[620,920,320],[1260,870,300],[1830,970,310]]
    for t in tents:
        _add_scene("tent",t[0],t[1],t[2],1); _add_wall(t[0]-t[2]*.35,t[1]-t[2]*.22,t[2]*.7,t[2]*.28)
    for p in [Vector2(300,300),Vector2(2350,320),Vector2(350,1460),Vector2(2350,1450),Vector2(1500,1450),Vector2(900,1430)]: _add_scene("palm",p.x,p.y,180)
    for p in [Vector2(820,650),Vector2(1500,650),Vector2(2150,670),Vector2(1040,1190),Vector2(1780,1220)]: _add_scene("rock",p.x,p.y,125)
    _add_scene("well",1120,1290,180,1); _add_scene("altar",1650,1330,190,1); _add_scene("cart",1900,650,210,1); _add_scene("guard",2420,910,95,3)
    _add_thing("recruit","sarai","sarai",700,610,92,"Sarai","sarai")
    _add_thing("recruit","lot","lot",1470,1160,92,"Lot","lot")
    _add_thing("house","h1","servant",470,1180,86,"Household worker","servant")
    _add_thing("house","h2","girl",1680,620,82,"Household worker","girl")
    _add_thing("house","h3","servant",2140,1080,86,"Household elder","servant")
    _add_thing("supply","s1","grain",900,1110,110,"Grain and goods","grain")
    _add_thing("supply","s2","roll",1520,830,120,"Tent rolls","roll")
    _add_thing("supply","s3","pack",2190,520,110,"Household possessions","pack")
    _add_thing("animal","a1","sheep",690,1430,88,"Sheep","sheep")
    _add_thing("animal","a2","sheep",920,1480,88,"Sheep","sheep")
    _add_thing("animal","a3","sheep",1250,1490,88,"Lamb","sheep")
    _add_thing("animal","a4","camel",1900,1430,105,"Pack camel","camel")
    _add_thing("animal","a5","camel",2210,1390,105,"Pack camel","camel")
    _add_thing("gate","gate","gate",2560,865,400,"Gate of Haran","gate")
    _apply_camera_limits(); _update_hud(); queue_redraw()

func _build_journey() -> void:
    phase = "journey"; world_size = Vector2(3600,1800)
    _clear_layer(scene_layer); _clear_layer(thing_layer); things.clear(); walls.clear(); trail.clear()
    player.position = Vector2(240,920); facing="right"; motion_time=0
    for p in [Vector2(350,470),Vector2(760,1380),Vector2(1100,480),Vector2(1500,1320),Vector2(1820,500),Vector2(2400,1320),Vector2(2850,470),Vector2(3180,1360)]: _add_scene("palm",p.x,p.y,175)
    for p in [Vector2(650,650),Vector2(930,1180),Vector2(1700,720),Vector2(2150,1050),Vector2(2500,690),Vector2(2770,1120)]: _add_scene("rock",p.x,p.y,145)
    for p in [Vector2(850,520),Vector2(2000,1360),Vector2(2600,470)]: _add_scene("thorn",p.x,p.y,120)
    _add_scene("well",1320,880,185,1); _add_scene("campfire",1780,1040,120,1); _add_scene("tent",1810,900,270,1); _add_scene("altar",3000,930,180,1); _add_scene("gate",3380,880,390,2)
    _add_thing("water","water","well",1320,880,175,"Water the caravan","well")
    _add_thing("lost","lost","sheep",2070,540,92,"Wandering sheep","sheep")
    _add_thing("canaan","canaan","gate",3380,880,380,"Canaan","gate")
    for i in range(followers.size()):
        var f = followers[i]
        f.node.position = Vector2(160-i*36,970+(i%2)*34)
    _apply_camera_limits(); _toast("The caravan has left Haran. Lead everyone toward Canaan.",2.8); _update_hud(); queue_redraw()

func _apply_camera_limits() -> void:
    camera.limit_left=0; camera.limit_top=0; camera.limit_right=int(world_size.x); camera.limit_bottom=int(world_size.y)

func _add_follower(kind:String) -> void:
    var widths={"sarai":72.0,"lot":72.0,"servant":68.0,"girl":66.0,"sheep":72.0,"camel":88.0,"grain":68.0,"roll":72.0,"pack":66.0}
    var p := player.position - Vector2(55+followers.size()*10, -25)
    var s := _sprite(kind,p,widths.get(kind,68.0),follower_layer)
    followers.append({"kind":kind,"node":s})

func _prep_pct() -> int:
    var d=0
    d += 1 if prep.sarai else 0; d += 1 if prep.lot else 0
    d += prep.household + prep.supplies + prep.animals
    return roundi(float(d)/13.0*100.0)

func _current_objective() -> String:
    if phase=="haran":
        if not prep.sarai: return "Find Sarai in Haran"
        if not prep.lot: return "Find Lot and bring him to the caravan"
        if prep.household<3: return "Gather the household  (%d/3)" % prep.household
        if prep.supplies<3: return "Collect the possessions  (%d/3)" % prep.supplies
        if prep.animals<5: return "Round up the animals  (%d/5)" % prep.animals
        return "Caravan ready — go to the gate of Haran"
    if phase=="journey":
        if not journey.water: return "Lead the caravan to the well and water the animals"
        if not journey.sheep: return "A sheep wandered away — find it"
        return "Keep the caravan together and reach Canaan"
    return "Mission complete"

func _update_hud() -> void:
    objective_label.text = "OBJECTIVE: " + _current_objective()
    if phase=="haran": progress_label.text = "CARAVAN  %d%%" % _prep_pct()
    elif phase=="journey": progress_label.text = "JOURNEY  %d%%" % clampi(roundi((player.position.x-240.0)/(3380.0-240.0)*100.0),0,100)
    else: progress_label.text = "AB001 COMPLETE"

func _build_ui() -> void:
    ui=CanvasLayer.new(); add_child(ui)
    var top=ColorRect.new(); top.color=Color(0.035,0.028,0.023,.88); top.set_anchors_and_offsets_preset(Control.PRESET_TOP_WIDE); top.custom_minimum_size.y=98; top.mouse_filter=Control.MOUSE_FILTER_IGNORE; ui.add_child(top)
    var title=Label.new(); title.text="AB001  •  GET THEE OUT OF THY COUNTRY"; title.position=Vector2(24,10); title.add_theme_font_size_override("font_size",22); title.add_theme_color_override("font_color",Color("#f4d58e")); top.add_child(title)
    objective_label=Label.new(); objective_label.position=Vector2(24,47); objective_label.add_theme_font_size_override("font_size",23); objective_label.add_theme_color_override("font_color",Color.WHITE); top.add_child(objective_label)
    progress_label=Label.new(); progress_label.position=Vector2(1000,20); progress_label.size=Vector2(250,55); progress_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_RIGHT; progress_label.add_theme_font_size_override("font_size",22); progress_label.add_theme_color_override("font_color",Color("#f4d58e")); top.add_child(progress_label)
    var bottom=ColorRect.new(); bottom.color=Color(0.03,0.025,0.02,.78); bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE); bottom.offset_top=-60; bottom.mouse_filter=Control.MOUSE_FILTER_IGNORE; ui.add_child(bottom)
    var hint=Label.new(); hint.text="SWIPE to move  •  TAP when you are close to a person or object"; hint.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); hint.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; hint.vertical_alignment=VERTICAL_ALIGNMENT_CENTER; hint.add_theme_font_size_override("font_size",19); hint.add_theme_color_override("font_color",Color("#fff1d0")); bottom.add_child(hint)
    toast_label=Label.new(); toast_label.position=Vector2(340,122); toast_label.size=Vector2(600,64); toast_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; toast_label.vertical_alignment=VERTICAL_ALIGNMENT_CENTER; toast_label.add_theme_font_size_override("font_size",24); toast_label.add_theme_color_override("font_color",Color.WHITE); toast_label.modulate.a=0; toast_label.mouse_filter=Control.MOUSE_FILTER_IGNORE; ui.add_child(toast_label)
    rotate_label=Label.new(); rotate_label.text="ROTATE PHONE SIDEWAYS"; rotate_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); rotate_label.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; rotate_label.vertical_alignment=VERTICAL_ALIGNMENT_CENTER; rotate_label.add_theme_font_size_override("font_size",38); rotate_label.add_theme_color_override("font_color",Color.WHITE); rotate_label.visible=false; rotate_label.mouse_filter=Control.MOUSE_FILTER_IGNORE; ui.add_child(rotate_label)
    complete_panel=ColorRect.new(); complete_panel.color=Color(0.025,0.02,0.017,.95); complete_panel.position=Vector2(290,150); complete_panel.size=Vector2(700,420); complete_panel.visible=false; complete_panel.mouse_filter=Control.MOUSE_FILTER_IGNORE; ui.add_child(complete_panel)
    var ct=Label.new(); ct.text="MISSION COMPLETE"; ct.position=Vector2(40,38); ct.size=Vector2(620,58); ct.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; ct.add_theme_font_size_override("font_size",42); ct.add_theme_color_override("font_color",Color("#f4d58e")); complete_panel.add_child(ct)
    var v=Label.new(); v.text="“So Abram departed, as the LORD had spoken unto him...”\n\nGenesis 12:4 KJV"; v.position=Vector2(65,125); v.size=Vector2(570,130); v.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; v.vertical_alignment=VERTICAL_ALIGNMENT_CENTER; v.autowrap_mode=TextServer.AUTOWRAP_WORD_SMART; v.add_theme_font_size_override("font_size",26); v.add_theme_color_override("font_color",Color("#fff7e8")); complete_panel.add_child(v)
    var again=Label.new(); again.text="Tap anywhere to play again"; again.position=Vector2(80,320); again.size=Vector2(540,50); again.horizontal_alignment=HORIZONTAL_ALIGNMENT_CENTER; again.add_theme_font_size_override("font_size",21); again.add_theme_color_override("font_color",Color("#d8ccb6")); complete_panel.add_child(again)

func _process(delta:float) -> void:
    rotate_label.visible = get_viewport_rect().size.y > get_viewport_rect().size.x
    if toast_time>0:
        toast_time-=delta; toast_label.modulate.a=min(1.0,toast_time*2.5)
    else: toast_label.modulate.a=0
    if mission_complete: return
    if motion_time>0:
        motion_time-=delta; moving=true; anim_time+=delta
        var proposed=player.position + motion*PLAYER_SPEED*delta
        proposed.x=clamp(proposed.x,45.0,world_size.x-45.0); proposed.y=clamp(proposed.y,130.0,world_size.y-45.0)
        if not _blocked(proposed): player.position=proposed
        else: motion_time=0; _toast("Blocked — swipe around it",1.2)
        trail.push_front(player.position)
        if trail.size()>520: trail.resize(520)
    else: moving=false
    _animate_player()
    _update_followers(delta)
    player.z_index=int(player.position.y)+8
    if phase=="journey": _update_hud()

func _animate_player() -> void:
    var name="abramFront"; var flip=false
    if facing=="up": name="abramBack"
    elif facing=="right" or facing=="left":
        var frame=0 if not moving else int(anim_time*9.0)%4
        name=["abramRight1","abramRight2","abramRight3","abramRight4"][frame]
        flip=facing=="left"
    player_sprite.texture=_atlas_texture(name)
    var sc=102.0/(R[name].size.x*S)
    player_sprite.scale=Vector2(-sc if flip else sc,sc)

func _update_followers(delta:float) -> void:
    for i in range(followers.size()):
        var f=followers[i]; var n:Sprite2D=f.node
        if trail.is_empty(): continue
        var idx=min(trail.size()-1,22+i*13); var target:Vector2=trail[idx]
        n.position=n.position.lerp(target,min(1.0,delta*5.0)); n.z_index=int(n.position.y)

func _blocked(p:Vector2) -> bool:
    for r in walls:
        if r.grow(28).has_point(p): return true
    return false

func _unhandled_input(event:InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed:
            touch_start=event.position; touch_active=true
        elif touch_active:
            var d=event.position-touch_start; touch_active=false
            _finish_gesture(d)
    elif event is InputEventMouseButton and event.button_index==MOUSE_BUTTON_LEFT:
        if event.pressed: mouse_start=event.position; mouse_active=true
        elif mouse_active:
            var d=event.position-mouse_start; mouse_active=false; _finish_gesture(d)

func _finish_gesture(d:Vector2) -> void:
    if mission_complete:
        if d.length()<=TAP_MAX: _build_haran(); complete_panel.visible=false
        return
    if d.length()<=TAP_MAX: _interact_nearby(); return
    if d.length()<SWIPE_MIN: return
    var dir=d.normalized()
    if abs(dir.x)>abs(dir.y)*1.55: dir=Vector2(sign(dir.x),0)
    elif abs(dir.y)>abs(dir.x)*1.55: dir=Vector2(0,sign(dir.y))
    motion=dir.normalized(); motion_time=clamp(0.24+d.length()/800.0,0.28,0.72)
    if abs(motion.x)>abs(motion.y): facing="right" if motion.x>0 else "left"
    else: facing="down" if motion.y>0 else "up"

func _near_thing():
    var best=null; var bd=INTERACT_DISTANCE
    for o in things:
        if o.done or not is_instance_valid(o.node) or not o.node.visible: continue
        var d=player.position.distance_to(o.node.position)
        if d<bd: bd=d; best=o
    return best

func _interact_nearby() -> void:
    var o=_near_thing()
    if o==null: _toast("Move closer to something you can interact with",1.2); return
    if o.type=="recruit":
        o.done=true; o.node.visible=false
        if o.id=="sarai": prep.sarai=true
        else: prep.lot=true
        _add_follower(o.kind); _toast(o.label+" joined Abram.")
    elif o.type=="house":
        if not prep.sarai or not prep.lot: _toast("Find Sarai and Lot first",1.5); return
        o.done=true; o.node.visible=false; prep.household+=1; _add_follower(o.kind); _toast("Household gathered — %d/3" % prep.household)
    elif o.type=="supply":
        if prep.household<3: _toast("Gather the household first",1.5); return
        o.done=true; o.node.visible=false; prep.supplies+=1; _add_follower(o.kind); _toast("Possessions loaded — %d/3" % prep.supplies)
    elif o.type=="animal":
        if prep.supplies<3: _toast("Collect the possessions first",1.5); return
        o.done=true; o.node.visible=false; prep.animals+=1; _add_follower(o.kind); _toast(o.label+" rounded up — %d/5" % prep.animals)
    elif o.type=="gate":
        if not prep.ready: _toast("The caravan is not ready yet",1.8); return
        _build_journey(); return
    elif o.type=="water":
        o.done=true; journey.water=true; _toast("The caravan is watered and ready to continue.",2.0)
    elif o.type=="lost":
        if not journey.water: _toast("Water the caravan first",1.5); return
        o.done=true; o.node.visible=false; journey.sheep=true; _add_follower("sheep"); _toast("Wandering sheep recovered. Continue toward Canaan.",2.2)
    elif o.type=="canaan":
        if not journey.water or not journey.sheep: _toast("There is still unfinished work on the road",1.8); return
        _finish_mission(); return
    prep.ready=prep.sarai and prep.lot and prep.household>=3 and prep.supplies>=3 and prep.animals>=5
    if prep.ready and phase=="haran": _toast("Caravan ready! Lead everyone to the gate of Haran.",2.5)
    _update_hud()

func _finish_mission() -> void:
    phase="complete"; mission_complete=true; motion_time=0; complete_panel.visible=true; _update_hud()

func _toast(text:String,seconds:=1.8) -> void:
    toast_label.text=text; toast_label.modulate.a=1; toast_time=seconds

func _draw() -> void:
    if phase=="haran":
        draw_rect(Rect2(Vector2.ZERO,world_size),Color("#c99755"))
        draw_rect(Rect2(150,650,2470,420),Color("#b98649"),true)
        for i in range(85):
            var x=float((i*197)%2700)+50.0; var y=float((i*83)%1500)+120.0
            draw_circle(Vector2(x,y),3.0+float(i%4),Color(0.35,0.22,0.12,0.18))
    elif phase=="journey" or phase=="complete":
        draw_rect(Rect2(Vector2.ZERO,world_size),Color("#d0aa67"))
        var road=PackedVector2Array([Vector2(0,780),Vector2(700,690),Vector2(1350,790),Vector2(2100,730),Vector2(2800,800),Vector2(3600,700),Vector2(3600,1110),Vector2(2800,1050),Vector2(2050,1100),Vector2(1300,1030),Vector2(650,1080),Vector2(0,1010)])
        draw_colored_polygon(road,Color("#e3c187"))
        draw_rect(Rect2(3000,0,600,1800),Color(0.30,0.43,0.25,0.20))
        for i in range(70):
            var x=80.0+i*49.0; var y=900.0+sin(float(i)*1.7)*95.0
            draw_circle(Vector2(x,y),4.0+float(i%3),Color(0.40,0.27,0.15,0.25))

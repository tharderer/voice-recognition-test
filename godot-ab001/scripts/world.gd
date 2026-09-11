extends Node2D

func _ready() -> void:
    queue_redraw()

func _draw() -> void:
    draw_rect(Rect2(0, 0, 2800, 1600), Color("#d8bc78"))
    draw_rect(Rect2(80, 250, 820, 1000), Color("#c99b55"))
    draw_rect(Rect2(110, 280, 760, 940), Color("#deb870"), false, 10.0)
    draw_rect(Rect2(2260, 120, 480, 1360), Color("#a9bf6b"))
    draw_circle(Vector2(2480, 710), 260, Color("#b7cc7a"))

    var road := PackedVector2Array([
        Vector2(540, 760), Vector2(910, 760), Vector2(1130, 650),
        Vector2(1380, 820), Vector2(1630, 700), Vector2(1870, 880),
        Vector2(2130, 720), Vector2(2440, 720)
    ])
    draw_polyline(road, Color("#f0d99f"), 150.0, true)
    draw_polyline(road, Color("#9f7a3b"), 5.0, true)

    draw_rect(Rect2(1740, 0, 150, 1600), Color("#5ea5b5"))
    draw_rect(Rect2(1732, 790, 166, 190), Color("#a8743d"))
    for y in range(805, 970, 28):
        draw_line(Vector2(1738, y), Vector2(1892, y), Color("#67492f"), 3.0)

    for y in [460, 760, 1060]:
        draw_line(Vector2(120, y), Vector2(850, y), Color("#ead39d"), 82.0)
    draw_line(Vector2(540, 300), Vector2(540, 1210), Color("#ead39d"), 82.0)

    draw_line(Vector2(80, 250), Vector2(900, 250), Color("#825b35"), 28.0)
    draw_line(Vector2(80, 250), Vector2(80, 1250), Color("#825b35"), 28.0)
    draw_line(Vector2(80, 1250), Vector2(900, 1250), Color("#825b35"), 28.0)
    draw_line(Vector2(900, 250), Vector2(900, 650), Color("#825b35"), 28.0)
    draw_line(Vector2(900, 870), Vector2(900, 1250), Color("#825b35"), 28.0)

    for p in [Vector2(1120,380), Vector2(1330,1110), Vector2(1510,390), Vector2(2070,1120), Vector2(2190,360)]:
        draw_circle(p, 82, Color("#9e6842"))
        draw_circle(p + Vector2(-20,-18), 58, Color("#bb8050"))
        draw_circle(p + Vector2(20,-32), 38, Color("#d09b65"))

    draw_circle(Vector2(2490, 720), 118, Color(1.0, 0.88, 0.36, 0.18))
    draw_circle(Vector2(2490, 720), 83, Color(1.0, 0.92, 0.55, 0.18))

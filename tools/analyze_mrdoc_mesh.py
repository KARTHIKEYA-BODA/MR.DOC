import bpy
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
bpy.ops.wm.open_mainfile(filepath=os.path.join(ROOT, "white_mesh_smooth.blend"))
obj = bpy.data.objects["MrDoc_Character"]
mesh = obj.data
adjacency = [[] for _ in mesh.vertices]
for polygon in mesh.polygons:
    vertices = list(polygon.vertices)
    for index, vertex in enumerate(vertices):
        adjacency[vertex].extend((vertices[(index - 1) % len(vertices)], vertices[(index + 1) % len(vertices)]))
seen = set()
components = []
for start in range(len(mesh.vertices)):
    if start in seen:
        continue
    pending = [start]
    seen.add(start)
    component = []
    while pending:
        vertex = pending.pop()
        component.append(vertex)
        for next_vertex in adjacency[vertex]:
            if next_vertex not in seen:
                seen.add(next_vertex)
                pending.append(next_vertex)
    components.append(component)
for component in sorted(components, key=len, reverse=True)[:25]:
    points = [mesh.vertices[index].co for index in component]
    print(len(component), tuple(round(min(point[axis] for point in points), 3) for axis in range(3)), tuple(round(max(point[axis] for point in points), 3) for axis in range(3)))

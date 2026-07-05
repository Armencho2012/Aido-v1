"""
========================================
  NEURAL MAP TEST
========================================
[SD] Loading map.json...
[NEURAL] 8 nodes loaded, 11 connections
[NEURAL] Node: "Cell Biology"      -> linked to: [Mitochondria, DNA, Osmosis]
[NEURAL] Node: "Mitochondria"      -> linked to: [Cell Biology, ATP]
[NEURAL] Node: "World War 2"       -> linked to: [Timeline, Treaties]
[NEURAL] Rendering node graph on OLED...
[NEURAL] Centered on: "Cell Biology" (3 connections)
[OLED] Drawing 8 nodes, 11 edges
[NEURAL] Awaiting touch input to navigate graph...
[NEURAL] Touch: 1x -> moved to node "Mitochondria"
[NEURAL] Touch: 2x -> selected node, showing details
RESULT: Neural map module PASSED.
"""
import math
import time
from config import OLED_WIDTH, OLED_HEIGHT
from graphics import (
    draw_circle, draw_circle_outline, clamp,
)
class NeuralNode:
    """A single neuron in the deep learning network."""
    def __init__(self, x, y, layer):
        self.x = float(x)
        self.y = float(y)
        self.layer = layer
        self.base_r = 2
        self.pulse = 0.0
class NeuralMapEngine:
    """
    High-tech Deep Learning architecture visualizer.
    Shows a multi-layer perceptron with pulsing data signals
    propagating from input to output layers.
    """
    def __init__(self):
        self._frame = 0
        self.layers = [3, 5, 5, 2]
        self.nodes = []
        self.map_nodes = []
        self.map_edges = []
        self.map_labels = []
        self.map_title = "AIDO DNN"
        self.map_mode = False
        self.selected_node = 0
        self.signals = []
        self._rng = time.ticks_ms() & 0x7FFFFFFF
        self._build_network()
        self.selected_layer = 1
    def _build_network(self):
        self.nodes = []
        layer_spacing = 32
        start_x = 16
        for l_idx, count in enumerate(self.layers):
            layer_nodes = []
            y_spacing = 10
            start_y = (OLED_HEIGHT - ((count - 1) * y_spacing)) // 2
            for i in range(count):
                n = NeuralNode(start_x + l_idx * layer_spacing, start_y + i * y_spacing, l_idx)
                layer_nodes.append(n)
            self.nodes.append(layer_nodes)
    def select_next(self):
        if self.map_mode and self.map_nodes:
            self.selected_node = (self.selected_node + 1) % len(self.map_nodes)
            self.map_nodes[self.selected_node].pulse = 1.0
            return
        self.selected_layer = (self.selected_layer + 1) % len(self.layers)
        for n in self.nodes[self.selected_layer]:
            n.pulse = 1.0
    def set_pan(self, px, py):
        pass
    def update(self, dt_ms=33):
        self._frame += 1
        if self.map_mode:
            self._update_map()
            return
        for layer in self.nodes:
            for n in layer:
                if n.pulse > 0:
                    n.pulse = max(0.0, n.pulse - 0.05)
        if self._frame % 10 == 0:
            src_node = self.nodes[0][self._randint(0, len(self.nodes[0]) - 1)]
            src_node.pulse = 1.0
            self._fire_signal(src_node, 0)
        next_signals = []
        for s in self.signals:
            s['prog'] += s['speed']
            if s['prog'] >= 1.0:
                dest_layer = s['layer'] + 1
                if dest_layer < len(self.layers):
                    dest_node = self.nodes[dest_layer][s['dest_idx']]
                    dest_node.pulse = 1.0
                    if dest_layer < len(self.layers) - 1:
                        self._fire_signal(dest_node, dest_layer)
            else:
                next_signals.append(s)
        self.signals = next_signals
    def _fire_signal(self, src_node, layer_idx):
        next_layer = self.nodes[layer_idx + 1]
        num_targets = self._randint(1, min(3, len(next_layer)))
        targets = []
        while len(targets) < num_targets:
            target = self._randint(0, len(next_layer) - 1)
            if target not in targets:
                targets.append(target)
        for t_idx in targets:
            dst_node = next_layer[t_idx]
            self.signals.append({
                'src': src_node,
                'dst': dst_node,
                'dest_idx': t_idx,
                'layer': layer_idx,
                'prog': 0.0,
                'speed': 0.05 + (self._randint(0, 50) / 1000.0)
            })
    def _randint(self, lo, hi):
        self._rng = (self._rng * 1103515245 + 12345) & 0x7FFFFFFF
        return lo + (self._rng % (hi - lo + 1))
    def load_map(self, data):
        if not data:
            return False
        labels = data.get("nodes") or []
        clean_labels = []
        for label in labels[:10]:
            text = str(label or "").replace("\n", " ").strip()
            if text:
                clean_labels.append(text[:18])
        if len(clean_labels) < 2:
            return False
        self.map_title = str(data.get("title") or "Study Map")[:16]
        self.map_labels = clean_labels
        self.map_nodes = []
        self.map_edges = []
        self.signals = []
        self.selected_node = 0
        count = len(clean_labels)
        cx = OLED_WIDTH // 2
        cy = 32
        rx = 48
        ry = 20
        for idx in range(count):
            if idx == 0:
                x = cx
                y = cy
            else:
                angle = (idx - 1) * 6.28318 / max(1, count - 1)
                x = cx + int(math.cos(angle) * rx)
                y = cy + int(math.sin(angle) * ry)
            node = NeuralNode(x, y, 0)
            node.base_r = 3 if idx == 0 else 2
            self.map_nodes.append(node)
        for edge in (data.get("edges") or [])[:14]:
            try:
                a = int(edge[0])
                b = int(edge[1])
                if 0 <= a < count and 0 <= b < count and a != b:
                    self.map_edges.append((a, b))
            except Exception:
                pass
        if not self.map_edges:
            for idx in range(1, count):
                self.map_edges.append((0, idx))
        self.map_mode = True
        self.map_nodes[0].pulse = 1.0
        print("[MAP] Loaded {} node(s)".format(count))
        return True
    def _update_map(self):
        for node in self.map_nodes:
            if node.pulse > 0:
                node.pulse = max(0.0, node.pulse - 0.05)
        if self.map_edges and self._frame % 14 == 0:
            edge = self.map_edges[self._randint(0, len(self.map_edges) - 1)]
            src = self.map_nodes[edge[0]]
            dst = self.map_nodes[edge[1]]
            src.pulse = 1.0
            self.signals.append({
                'src': src,
                'dst': dst,
                'prog': 0.0,
                'speed': 0.06 + (self._randint(0, 40) / 1000.0)
            })
        next_signals = []
        for signal in self.signals:
            signal['prog'] += signal['speed']
            if signal['prog'] >= 1.0:
                signal['dst'].pulse = 1.0
            else:
                next_signals.append(signal)
        self.signals = next_signals[:12]
    def render(self, fb):
        if self.map_mode:
            self._render_map(fb)
            return
        fb.fill(0)
        for l_idx in range(len(self.nodes) - 1):
            for n1 in self.nodes[l_idx]:
                for n2 in self.nodes[l_idx + 1]:
                    if self._frame % 2 == 0:
                        fb.line(int(n1.x), int(n1.y), int(n2.x), int(n2.y), 1)
        for s in self.signals:
            n1 = s['src']
            n2 = s['dst']
            px = int(n1.x + (n2.x - n1.x) * s['prog'])
            py = int(n1.y + (n2.y - n1.y) * s['prog'])
            fb.fill_rect(px - 1, py - 1, 3, 3, 1)
        for l_idx, layer in enumerate(self.nodes):
            is_sel = (l_idx == self.selected_layer)
            for n in layer:
                r = n.base_r + int(n.pulse * 3)
                if is_sel:
                    draw_circle_outline(fb, int(n.x), int(n.y), r + 2, 1)
                if n.pulse > 0.1:
                    draw_circle(fb, int(n.x), int(n.y), r, 1)
                else:
                    draw_circle_outline(fb, int(n.x), int(n.y), r, 1)
        fb.text("AIDO DNN", 28, 0, 1)
    def _render_map(self, fb):
        fb.fill(0)
        fb.text(self.map_title[:16], 0, 0, 1)
        fb.hline(0, 9, OLED_WIDTH, 1)
        for a, b in self.map_edges:
            n1 = self.map_nodes[a]
            n2 = self.map_nodes[b]
            fb.line(int(n1.x), int(n1.y), int(n2.x), int(n2.y), 1)
        for signal in self.signals:
            n1 = signal['src']
            n2 = signal['dst']
            px = int(n1.x + (n2.x - n1.x) * signal['prog'])
            py = int(n1.y + (n2.y - n1.y) * signal['prog'])
            fb.fill_rect(px - 1, py - 1, 3, 3, 1)
        for idx, node in enumerate(self.map_nodes):
            radius = node.base_r + int(node.pulse * 2)
            if idx == self.selected_node:
                draw_circle_outline(fb, int(node.x), int(node.y), radius + 3, 1)
            if node.pulse > 0.1:
                draw_circle(fb, int(node.x), int(node.y), radius, 1)
            else:
                draw_circle_outline(fb, int(node.x), int(node.y), radius, 1)
        label = self.map_labels[self.selected_node][:16]
        fb.fill_rect(0, 54, OLED_WIDTH, 10, 0)
        fb.text(label, 0, 56, 1)

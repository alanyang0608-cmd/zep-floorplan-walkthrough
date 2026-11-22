// Invoke on a test page with the same clearance and floor rules used by the walker.
function checkWalkthroughRooms({floors, canStand, canCross, step = 0.075}) {
  if (!Array.isArray(floors) || !floors.length || typeof canStand !== 'function') {
    throw new TypeError('请提供楼层数据及 canStand 通行函数')
  }
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('网格间距须为正数')
  if (canCross != null && typeof canCross !== 'function') throw new TypeError('canCross 须为函数')

  function checkFloor({id, bounds, start, rooms}) {
    if (!Array.isArray(bounds) || bounds.length !== 4 || !bounds.every(Number.isFinite) || !Array.isArray(rooms)) {
      throw new TypeError('每层须提供四个边界坐标和房间列表')
    }
    const [minX, minZ, maxX, maxZ] = bounds
    if (minX >= maxX || minZ >= maxZ) throw new RangeError('楼层边界须有正的宽度和进深')
    const cols = Math.floor((maxX - minX) / step + 1e-9) + 1
    const rows = Math.floor((maxZ - minZ) / step + 1e-9) + 1
    const seen = new Uint8Array(cols * rows)
    const queue = []
    const issues = []

    function inside(point) {
      return Array.isArray(point) && point.length === 2 && point.every(Number.isFinite)
        && point[0] >= minX && point[0] <= maxX && point[1] >= minZ && point[1] <= maxZ
    }

    // Sample each edge with the real collision function. This also checks the
    // short segment between an exact room anchor and its surrounding grid nodes.
    function openEdge(x1, z1, x2, z2) {
      const distance = Math.hypot(x2 - x1, z2 - z1)
      if (distance > 1e-9 && canCross && !canCross(id, x1, z1, x2, z2)) return false
      const n = Math.max(1, Math.ceil(distance / (step / 3)))
      for (let i = 1; i <= n; i++) {
        if (!canStand(id, x1 + (x2 - x1) * i / n, z1 + (z2 - z1) * i / n)) return false
      }
      return true
    }

    function anchors(point, leaving) {
      const [x, z] = point
      const gx = (x - minX) / step
      const gz = (z - minZ) / step
      const connected = []
      for (const i of new Set([Math.floor(gx), Math.ceil(gx)])) {
        for (const j of new Set([Math.floor(gz), Math.ceil(gz)])) {
          if (i < 0 || j < 0 || i >= cols || j >= rows) continue
          const nx = minX + i * step, nz = minZ + j * step
          if (!canStand(id, nx, nz)) continue
          if (leaving ? openEdge(x, z, nx, nz) : openEdge(nx, nz, x, z)) connected.push(j * cols + i)
        }
      }
      return connected
    }

    if (inside(start) && canStand(id, ...start)) {
      for (const index of anchors(start, true)) {
        seen[index] = 1
        queue.push(index)
      }
    }
    if (!queue.length) issues.push({name: '楼层起点', reason: '起点无法接入可走地面'})

    const neighbors = [[-1, 0], [1, 0], [0, -1], [0, 1]]
    for (let front = 0; front < queue.length; front++) {
      const index = queue[front], i = index % cols, j = Math.floor(index / cols)
      const x = minX + i * step, z = minZ + j * step
      for (const [di, dj] of neighbors) {
        const col = i + di, row = j + dj
        if (col < 0 || row < 0 || col >= cols || row >= rows) continue
        const next = row * cols + col
        if (seen[next] || !openEdge(x, z, minX + col * step, minZ + row * step)) continue
        seen[next] = 1
        queue.push(next)
      }
    }

    let reachable = 0
    for (const {name, at} of rooms) {
      if (!inside(at) || !canStand(id, ...at)) {
        issues.push({name, reason: '房间入口不能站立或超出测试边界'})
      } else if (!anchors(at, false).some(index => seen[index])) {
        issues.push({name, reason: '从楼层起点步行无法到达'})
      } else {
        reachable++
      }
    }
    return {id, rooms: rooms.length, reachable, issues}
  }

  const results = floors.map(checkFloor)
  return {ok: results.every(floor => !floor.issues.length), floors: results}
}
if (typeof module !== 'undefined' && module.exports) module.exports = {checkWalkthroughRooms}

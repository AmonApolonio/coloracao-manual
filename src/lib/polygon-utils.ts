/**
 * Simplify polygon points using Ramer-Douglas-Peucker algorithm
 * @param points Array of points [x1, y1, x2, y2, ...]
 * @param epsilon Tolerance for simplification (higher = more simplified)
 * @returns Simplified points array
 */
export function simplifyPolygon(points: number[], epsilon: number = 2): number[] {
  if (points.length < 6) return points; // Need at least 3 points (x, y for each)

  // Convert flat array to coordinate pairs
  const coords: Array<[number, number]> = [];
  for (let i = 0; i < points.length; i += 2) {
    coords.push([points[i], points[i + 1]]);
  }

  // Apply Ramer-Douglas-Peucker algorithm
  const simplified = rdp(coords, epsilon);

  // Convert back to flat array
  return simplified.flatMap(([x, y]) => [x, y]);
}

/**
 * Ramer-Douglas-Peucker algorithm for polygon simplification
 */
function rdp(points: Array<[number, number]>, epsilon: number): Array<[number, number]> {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIndex = 0;

  // Find point with maximum distance
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    // Recursively simplify
    const leftSegment = rdp(points.slice(0, maxIndex + 1), epsilon);
    const rightSegment = rdp(points.slice(maxIndex), epsilon);

    // Remove the last point of left segment (it's the first point of right segment)
    return [...leftSegment.slice(0, -1), ...rightSegment];
  } else {
    // Keep only endpoints
    return [points[0], points[points.length - 1]];
  }
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(point: [number, number], lineStart: [number, number], lineEnd: [number, number]): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const numerator = Math.abs((y2 - y1) * x - (x2 - x1) * y + x2 * y1 - y2 * x1);
  const denominator = Math.sqrt((y2 - y1) ** 2 + (x2 - x1) ** 2);

  return denominator === 0 ? Math.sqrt((x - x1) ** 2 + (y - y1) ** 2) : numerator / denominator;
}

/**
 * Calculate convex hull using Graham scan
 * Useful for creating bounding polygons
 */
export function convexHull(points: number[]): number[] {
  if (points.length < 6) return points;

  const coords: Array<[number, number]> = [];
  for (let i = 0; i < points.length; i += 2) {
    coords.push([points[i], points[i + 1]]);
  }

  // Find the bottom-most point (or left if tie)
  let minIdx = 0;
  for (let i = 1; i < coords.length; i++) {
    if (coords[i][1] < coords[minIdx][1] || (coords[i][1] === coords[minIdx][1] && coords[i][0] < coords[minIdx][0])) {
      minIdx = i;
    }
  }

  // Swap to start
  [coords[0], coords[minIdx]] = [coords[minIdx], coords[0]];
  const pivot = coords[0];

  // Sort by polar angle
  coords.slice(1).sort((a, b) => {
    const angleA = Math.atan2(a[1] - pivot[1], a[0] - pivot[0]);
    const angleB = Math.atan2(b[1] - pivot[1], b[0] - pivot[0]);
    return angleA - angleB;
  });

  const hull: Array<[number, number]> = [];
  for (const coord of coords) {
    while (hull.length > 1 && crossProduct(hull[hull.length - 2], hull[hull.length - 1], coord) <= 0) {
      hull.pop();
    }
    hull.push(coord);
  }

  return hull.flatMap(([x, y]) => [x, y]);
}

/**
 * Cross product of vectors OA and OB
 */
function crossProduct(o: [number, number], a: [number, number], b: [number, number]): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

/**
 * Calculate polygon area using shoelace formula
 */
export function polygonArea(points: number[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 2) {
    const x1 = points[i];
    const y1 = points[i + 1];
    const x2 = points[(i + 2) % points.length];
    const y2 = points[(i + 3) % points.length];
    area += x1 * y2 - x2 * y1;
  }
  return Math.abs(area / 2);
}

/**
 * Check if point is inside polygon using ray casting
 */
export function pointInPolygon(point: [number, number], polygon: number[]): boolean {
  const [x, y] = point;
  let isInside = false;

  for (let i = 0; i < polygon.length; i += 2) {
    const x1 = polygon[i];
    const y1 = polygon[i + 1];
    const x2 = polygon[(i + 2) % polygon.length];
    const y2 = polygon[(i + 3) % polygon.length];

    if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) {
      isInside = !isInside;
    }
  }

  return isInside;
}

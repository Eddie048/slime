type Vector = {
  x: number;
  y: number;
};

const vAdd = (vector1: Vector, vector2: Vector): Vector => {
  return { x: vector1.x + vector2.x, y: vector1.y + vector2.y };
};

const vAbs = (vector: Vector): number => {
  return Math.sqrt(Math.pow(vector.x, 2) + Math.pow(vector.y, 2));
};

const vMultiplyScalar = (vector: Vector, scalar: number): Vector => {
  return { x: vector.x * scalar, y: vector.y * scalar };
};

const vDot = (vector1: Vector, vector2: Vector): number => {
  return vector1.x * vector2.x + vector1.y * vector2.y;
};

const vAngleBetween = (vector1: Vector, vector2: Vector): number => {
  return Math.acos(vDot(vector1, vector2) / (vAbs(vector1) * vAbs(vector2)));
};

const vRotateByAngle = (vector: Vector, angle: number): Vector => {
  return {
    x: Math.cos(angle) * vector.x - Math.sin(angle) * vector.y,
    y: Math.sin(angle) * vector.x + Math.cos(angle) * vector.y,
  };
};

const vNormalize = (vector: Vector): Vector => {
  return vMultiplyScalar(vector, 1 / vAbs(vector));
};

const vCreate = (magnitude: number, angle: number): Vector => {
  return { x: Math.cos(angle) * magnitude, y: Math.sin(angle) * magnitude };
};

export {
  type Vector,
  vAdd,
  vAbs,
  vMultiplyScalar,
  vAngleBetween,
  vRotateByAngle,
  vNormalize,
  vCreate,
};

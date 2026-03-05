export const entityVertexShader = /* glsl */ `
  attribute float heading;

  uniform float uZoom;
  uniform float uShapeStartZoom;
  uniform float uShapeFullZoom;
  uniform float uBaseSize;
  uniform float uShapeSize;
  uniform float uOpacity;

  varying float vBlend;
  varying float vHeading;
  varying float vOpacity;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // blend: 0 = dot, 1 = shape
    float range = uShapeStartZoom - uShapeFullZoom;
    vBlend = clamp((uShapeStartZoom - uZoom) / range, 0.0, 1.0);

    gl_PointSize = mix(uBaseSize, uShapeSize, vBlend);

    vHeading = heading;
    vOpacity = uOpacity;
  }
`

export const entityFragmentShader = /* glsl */ `
  uniform sampler2D uSilhouette;
  uniform vec3 uColor;

  varying float vBlend;
  varying float vHeading;
  varying float vOpacity;

  void main() {
    // Dot: procedural circle
    vec2 center = gl_PointCoord - 0.5;
    float dist = length(center);
    float dotAlpha = 1.0 - smoothstep(0.3, 0.5, dist);

    // Shape: rotated texture sample
    float cosH = cos(vHeading);
    float sinH = sin(vHeading);
    vec2 uv = gl_PointCoord - 0.5;
    vec2 rotUv = vec2(
      uv.x * cosH - uv.y * sinH,
      uv.x * sinH + uv.y * cosH
    ) + 0.5;

    float shapeAlpha = 0.0;
    if (rotUv.x >= 0.0 && rotUv.x <= 1.0 && rotUv.y >= 0.0 && rotUv.y <= 1.0) {
      shapeAlpha = texture2D(uSilhouette, rotUv).a;
    }

    float alpha = mix(dotAlpha, shapeAlpha, vBlend) * vOpacity;
    if (alpha < 0.05) discard;

    gl_FragColor = vec4(uColor, alpha);
  }
`

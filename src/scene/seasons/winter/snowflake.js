export function winterSnowflake(index, time) {
  const speed = .022 + (index % 7) * .002;
  const phase = ((index + .5) * .61803398875 + time * speed) % 1;
  const angle = .12 + ((index * .754877666) % 1) * 1.32;
  const radius = 4.5 + ((index * .569840291) % 1) * 7.8;
  return {
    x: -.035392 + Math.cos(angle) * radius + .08 * Math.sin(time * .3 + index),
    y: 6.9 - phase * 8.1,
    z: .457284 - Math.sin(angle) * radius + .06 * Math.cos(time * .25 + index),
    size: (.035 + (index % 5) * .007) * Math.min(1, phase * 8, (1 - phase) * 8),
    tilt: Math.sin(time * .4 + index) * .5,
  };
}

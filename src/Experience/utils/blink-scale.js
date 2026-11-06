export function blinkScale(time) {
  const phase = time % 4.8;
  return phase < 4.55 ? 1 : Math.max(0.04, Math.abs(phase - 4.675) / 0.125);
}

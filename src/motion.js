export function motionPose(flipAge) {
  const flipping=flipAge>=0&&flipAge<.5;
  const p=flipping?flipAge/.5:0;
  const flip=flipping?-Math.PI*2*(p*p*(3-2*p)):0;
  return {flip,tuck:flipping?Math.sin(p*Math.PI):0};
}

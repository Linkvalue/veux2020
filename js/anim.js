var svgContainer = document.getElementById('handContainer');
var animItem = bodymovin.loadAnimation({
  wrapper: svgContainer,
  animType: 'svg',
  loop: true,
  path: './data/bee-fiying.json'
});
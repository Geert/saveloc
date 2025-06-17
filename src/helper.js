function add(a, b) {
  return a + b;
}

function multiply(a, b) {
  if (a === 0 || b === 0) return 0;
  return a * b;
}

module.exports = { add, multiply };

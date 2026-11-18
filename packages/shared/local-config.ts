export const loopbackHost = '127.0.0.1';

function readPort(name: string, fallback: number, minimum: number) {
  const port = Number(process.env[name] || fallback);
  if (!Number.isInteger(port) || port < minimum || port > 65535) {
    throw new Error(name + ' is invalid');
  }
  return port;
}

export const getApiPort = () => readPort('BLOOM_PORT', 4173, 0);
export const getDevPort = () => readPort('BLOOM_DEV_PORT', 5180, 1);
export const loopbackUrl = (port: number) => 'http://' + loopbackHost + ':' + port;

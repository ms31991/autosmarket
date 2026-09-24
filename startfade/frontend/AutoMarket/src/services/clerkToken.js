let getTokenFunction = null;

export function setClerkTokenFunction(fn) {
  getTokenFunction = fn;
}

export async function getClerkToken() {
  if (!getTokenFunction) {
    return null;
  }

  return await getTokenFunction();
}
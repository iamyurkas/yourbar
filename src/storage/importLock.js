let resolveImport;
let importPromise = Promise.resolve();

export function startImport() {
  if (!resolveImport) {
    importPromise = new Promise((res) => {
      resolveImport = res;
    });
  }
}

export function finishImport() {
  if (resolveImport) {
    resolveImport();
    resolveImport = null;
    importPromise = Promise.resolve();
  }
}

export function waitForImport() {
  return importPromise;
}

let resolveImport;
let importPromise = Promise.resolve();

let activeReads = 0;
let resolveNoReads;
let noReadsPromise = Promise.resolve();

function waitForNoReads() {
  return activeReads === 0
    ? Promise.resolve()
    : noReadsPromise;
}

export async function beforeRead() {
  activeReads += 1;
  await importPromise;
}

export function afterRead() {
  activeReads -= 1;
  if (activeReads === 0 && resolveNoReads) {
    resolveNoReads();
    resolveNoReads = null;
    noReadsPromise = Promise.resolve();
  }
}

export async function startImport() {
  if (!resolveImport) {
    importPromise = new Promise((res) => {
      resolveImport = res;
    });
  }
  if (activeReads > 0) {
    noReadsPromise = new Promise((res) => {
      resolveNoReads = res;
    });
    await waitForNoReads();
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
